#!/usr/bin/env node
// Self-host MAHDI-JYM without Docker: one Node process tree, no extra dependencies.
//
//   cd frontend && npm ci && npm run build && cd ..   # once (and after every update)
//   cd api && npm ci --omit=dev && cd ..              # once
//   node scripts/local-host.mjs                       # → http://localhost:8080
//
// It does what the two Docker containers do: starts api/server.js on an internal port and
// serves frontend/dist like web/nginx.conf (SPA fallback, /api proxy, cache headers).
// Exercise media is served from media/img + media/gif when present (scripts/fetch-media.sh
// downloads them, ~140 MB); otherwise those requests are redirected to the pinned dataset on
// jsDelivr, so a fresh checkout works immediately.
//
// Environment (same meaning as in .env / docker-compose):
//   WEB_PORT   public port                         (default 8080)
//   HOST       bind address                        (default 0.0.0.0 — reachable on your LAN)
//   ORIGIN     public URL incl. scheme             (default http://localhost:$WEB_PORT)
//   RP_ID      passkey domain = ORIGIN's hostname  (derived from ORIGIN)
//   DATA_DIR   users, passkeys, per-user state     (default ./data — BACK THIS UP)
//   API_PORT   internal API port                   (default 3000)
//
// Passkeys need a secure context: http://localhost or HTTPS. To use it from your phone,
// put it behind HTTPS (Caddy, a Cloudflare tunnel, Tailscale serve…) and set ORIGIN to that URL.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WEB_PORT = +(process.env.WEB_PORT || 8080)
const HOST = process.env.HOST || '0.0.0.0'
const API_PORT = +(process.env.API_PORT || 3000)
const ORIGIN = (process.env.ORIGIN || `http://localhost:${WEB_PORT}`).replace(/\/+$/, '')
const RP_ID = process.env.RP_ID || new URL(ORIGIN).hostname
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data')
const DIST = path.join(ROOT, 'frontend', 'dist')
const MEDIA = path.join(ROOT, 'media')
const DATASET = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd'

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('frontend/dist is missing — build it first:  cd frontend && npm ci && npm run build')
  process.exit(1)
}
if (!fs.existsSync(path.join(ROOT, 'api', 'node_modules'))) {
  console.error('api dependencies are missing — install them first:  cd api && npm ci --omit=dev')
  process.exit(1)
}
fs.mkdirSync(DATA_DIR, { recursive: true })

// ---- API child process ------------------------------------------------------------------
const api = spawn(process.execPath, ['server.js'], {
  cwd: path.join(ROOT, 'api'),
  stdio: 'inherit',
  env: { ...process.env, PORT: String(API_PORT), DATA_DIR, RP_ID, ORIGIN, RP_NAME: process.env.RP_NAME || 'MAHDI-JYM' }
})
api.on('exit', code => { console.error(`API exited (${code}) — stopping`); process.exit(code || 1) })
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { api.kill(sig); process.exit(0) })

// ---- static + proxy ---------------------------------------------------------------------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8'
}

function sendFile (res, file, method) {
  const ext = path.extname(file).toLowerCase()
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }
  headers['Cache-Control'] = /\.(js|css|json|html|webmanifest)$/.test(ext) && !file.includes(`${path.sep}assets${path.sep}`)
    ? 'no-cache, must-revalidate'
    : 'public, max-age=2592000, immutable'
  fs.stat(file, (err, st) => {
    if (err) { res.writeHead(404); return res.end('Not found') }
    headers['Content-Length'] = st.size
    res.writeHead(200, headers)
    if (method === 'HEAD') return res.end()
    fs.createReadStream(file).pipe(res)
  })
}

// Resolve a URL path inside a base dir; null if it would escape it.
function inside (base, urlPath) {
  const p = path.normalize(path.join(base, decodeURIComponent(urlPath)))
  return p.startsWith(base + path.sep) || p === base ? p : null
}

function proxyApi (req, res) {
  const up = http.request({
    host: '127.0.0.1', port: API_PORT, method: req.method, path: req.url,
    headers: { ...req.headers, 'x-forwarded-for': req.socket.remoteAddress || '', 'x-forwarded-proto': new URL(ORIGIN).protocol.slice(0, -1) }
  }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res) })
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('API not reachable') })
  req.pipe(up)
}

const server = http.createServer((req, res) => {
  let url
  try { url = new URL(req.url, 'http://x') } catch { res.writeHead(400); return res.end() }
  const p = url.pathname

  if (p.startsWith('/api/')) return proxyApi(req, res)

  // exercise media: local copy if downloaded, else the pinned CDN dataset
  const m = p.match(/^\/(img|gif)\/(.+)$/)
  if (m) {
    const local = inside(path.join(MEDIA, m[1]), m[2])
    if (!local || m[2].includes('..')) { res.writeHead(400); return res.end() }
    if (fs.existsSync(local)) return sendFile(res, local, req.method)
    res.writeHead(302, { Location: `${DATASET}/${m[1] === 'img' ? 'images' : 'videos'}/${m[2]}` })
    return res.end()
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end() }
  const file = inside(DIST, p === '/' ? 'index.html' : p)
  if (file && fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(res, file, req.method)
  if (path.extname(p)) { res.writeHead(404); return res.end('Not found') }
  sendFile(res, path.join(DIST, 'index.html'), req.method) // SPA fallback
})

server.listen(WEB_PORT, HOST, () => {
  console.log(`\nMAHDI-JYM is running → ${ORIGIN}`)
  console.log(`  listening on ${HOST}:${WEB_PORT} · API on :${API_PORT} · data in ${DATA_DIR}`)
  console.log(`  media: ${fs.existsSync(path.join(MEDIA, 'img')) ? 'local ./media' : 'jsDelivr CDN (run scripts/fetch-media.sh for an offline copy)'}\n`)
})
