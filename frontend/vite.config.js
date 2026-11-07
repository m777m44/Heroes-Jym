import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { releaseNotes } from './scripts/release-notes.mjs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
// 17.0: this version's short what's new (CHANGELOG.md), for the update screens
const changelog = new URL('../CHANGELOG.md', import.meta.url)
const notes = releaseNotes(existsSync(changelog) ? readFileSync(changelog, 'utf8') : '', pkg.version)

const backend = process.env.API_TARGET || 'http://127.0.0.1:3000'
const media = process.env.MEDIA_TARGET || 'http://127.0.0.1:8888'

// Offline web app: after the build, write the list of every built file (and a version derived
// from their contents) into dist/sw.js. The service worker precaches them at install, so every
// screen opens without a connection — not only the ones visited before. Exercise media
// (img/, gif/) are left out: they are saved on demand (Settings → Offline). Wallpapers too: each
// is cached the first time it is shown.
function precacheSW() {
  let outDir = 'dist'
  return {
    name: 'mj-precache-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir },
    closeBundle() {
      const swPath = join(outDir, 'sw.js')
      if (!existsSync(swPath)) return
      const files = []
      const walk = d => {
        for (const n of readdirSync(d)) {
          const p = join(d, n)
          const rel = relative(outDir, p).split(sep).join('/')
          if (statSync(p).isDirectory()) { if (rel !== 'img' && rel !== 'gif' && rel !== 'mp4' && rel !== 'wallpapers' && rel !== 'sounds' && rel !== 'food') walk(p) }   // 14.0: the kitchen's photos load when shown
          else if (rel !== 'sw.js' && !rel.endsWith('.map')) files.push(rel)
        }
      }
      walk(outDir)
      files.sort()
      const h = createHash('sha256')
      for (const f of files) h.update(f).update(readFileSync(join(outDir, f)))
      const version = pkg.version + '-' + h.digest('hex').slice(0, 10)
      // 12.0: media bases that point at a CDN (the Pages builds) are cached by the worker too
      const cdnMedia = [process.env.VITE_IMG_BASE, process.env.VITE_GIF_BASE].filter(u => /^https:\/\//.test(u || ''))
      const sw = readFileSync(swPath, 'utf8')
        .replace(/const VERSION = '[^']*'/, `const VERSION = '${version}'`)
        .replace(/const PRECACHE = \[[^\]]*\]/, `const PRECACHE = ${JSON.stringify(['./', ...files])}`)
        .replace(/const MEDIA_PREFIXES = \[[^\]]*\]/, `const MEDIA_PREFIXES = ${JSON.stringify(cdnMedia)}`)
      writeFileSync(swPath, sw)
    },
  }
}

// 16.0 — a build that takes its pictures from a CDN (the online app, the web app, the demo) opens the
// connection to it while the app starts, so the first photos and exercise pictures show sooner.
// Plain preconnect (no crossorigin): <img> requests are not CORS, and must reuse this connection.
function cdnPreconnect() {
  const origins = [...new Set([process.env.VITE_ASSET_BASE, process.env.VITE_IMG_BASE, process.env.VITE_GIF_BASE]
    .filter(u => /^https:\/\//.test(u || '')).map(u => new URL(u).origin))]
  return {
    name: 'mj-cdn-preconnect',
    apply: 'build',
    transformIndexHtml() {
      return origins.flatMap(href => [
        { tag: 'link', attrs: { rel: 'preconnect', href }, injectTo: 'head-prepend' },
        { tag: 'link', attrs: { rel: 'dns-prefetch', href }, injectTo: 'head-prepend' },
      ])
    },
  }
}

export default defineConfig({
  plugins: [react(), precacheSW(), cdnPreconnect()],
  // 14.0: __NATIVE_LEVEL__ — what the Android shell offers (plugins, the app's own native code); a web
  // bundle the online app downloads (lib/liveUpdate.js) needs an APK with at least this level
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __NATIVE_LEVEL__: JSON.stringify(pkg.mjNative || 1), __MJ_NOTES__: JSON.stringify({ en: notes.en, ar: notes.ar }) },
  base: './',
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/img': { target: media, changeOrigin: true },
      '/gif': { target: media, changeOrigin: true }
    }
  },
  // MJ_OUT_DIR: build somewhere else (scripts/build-site.sh puts the online app's bundle into the site)
  build: { chunkSizeWarningLimit: 1500, ...(process.env.MJ_OUT_DIR ? { outDir: process.env.MJ_OUT_DIR, emptyOutDir: true } : null) }
})
