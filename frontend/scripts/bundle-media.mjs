#!/usr/bin/env node
// Offline Android app: copies every exercise image (JPG) and animation into dist/, so `cap sync`
// packs them into the APK and the library works with no internet.
//
//   MEDIA_DIR=/path/with/images-and-videos node scripts/bundle-media.mjs
//
// MEDIA_DIR holds the hasaneyldrm/exercises-dataset layout (images/*.jpg, videos/*.gif) — CI
// downloads it at the pinned commit. ../media/{img,gif} (scripts/fetch-media.sh) works too.
// 16.0 — MEDIA_MP4=1: the animations go in as the small MP4 videos scripts/convert-media.mjs made
// (MEDIA_DIR/mp4/*.mp4 → dist/mp4/) instead of the GIFs (dist/gif/) — about 115 MB less APK. The
// web build must match: VITE_EXV_BASE=mp4/ (npm run build:mobile:offline sets both).
// Fails when any exercise in the bundled database has no file: a half-offline app is a bug.
import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const dist = join(root, 'dist')
const { EXDB } = await import(join(root, 'src/lib/exercises-data.js'))
const MP4 = process.env.MEDIA_MP4 === '1'
const mp4Name = gif => String(gif).replace(/\.gif$/i, '') + '.mp4'

function pick(base, ...names) {
  for (const n of names) { const p = join(base, n); if (existsSync(p)) return p }
  return null
}
const media = resolve(process.env.MEDIA_DIR || join(root, '..', 'media'))
const imgDir = pick(media, 'images', 'img')
const animDir = MP4 ? pick(media, 'mp4') : pick(media, 'videos', 'gif')
if (!imgDir || !animDir) {
  console.error(`✗ No media in ${media} (expected images/ + ${MP4 ? 'mp4/ — run scripts/convert-media.mjs first' : 'videos/, or img/ + gif/'}).`)
  process.exit(1)
}
if (!existsSync(dist)) { console.error('✗ dist/ is missing — run the vite build first.'); process.exit(1) }

const animKind = MP4 ? 'mp4' : 'gif'
const out = { img: join(dist, 'img'), [animKind]: join(dist, animKind) }
mkdirSync(out.img, { recursive: true })
mkdirSync(out[animKind], { recursive: true })

const missing = []
let bytes = 0, files = 0
for (const ex of EXDB) {
  for (const [kind, from, name] of [['img', imgDir, ex.img], [animKind, animDir, ex.gif && (MP4 ? mp4Name(ex.gif) : ex.gif)]]) {
    if (!name) continue
    const src = join(from, name)
    if (!existsSync(src)) { missing.push(`${kind}/${name}`); continue }
    copyFileSync(src, join(out[kind], name))
    bytes += statSync(src).size
    files++
  }
}
if (missing.length) {
  console.error(`✗ ${missing.length} media file(s) missing, e.g. ${missing.slice(0, 5).join(', ')}`)
  process.exit(1)
}
const counted = readdirSync(out.img).length + readdirSync(out[animKind]).length
console.log(`✓ ${files} media files (${(bytes / 1e6).toFixed(1)} MB${MP4 ? ', animations as MP4' : ''}) bundled into dist/ for offline use — ${counted} on disk.`)
