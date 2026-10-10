#!/usr/bin/env node
// Offline Android app: copies every exercise image (JPG) and animation (GIF) into dist/img and
// dist/gif, so `cap sync` packs them into the APK and the library works with no internet.
//
//   MEDIA_DIR=/path/with/images-and-videos node scripts/bundle-media.mjs
//
// MEDIA_DIR holds the hasaneyldrm/exercises-dataset layout (images/*.jpg, videos/*.gif) — CI
// downloads it at the pinned commit. ../media/{img,gif} (scripts/fetch-media.sh) works too.
// Fails when any exercise in the bundled database has no file: a half-offline app is a bug.
import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const dist = join(root, 'dist')
const { EXDB } = await import(join(root, 'src/lib/exercises-data.js'))

function pick(base, ...names) {
  for (const n of names) { const p = join(base, n); if (existsSync(p)) return p }
  return null
}
const media = resolve(process.env.MEDIA_DIR || join(root, '..', 'media'))
const imgDir = pick(media, 'images', 'img')
const gifDir = pick(media, 'videos', 'gif')
if (!imgDir || !gifDir) {
  console.error(`✗ No media in ${media} (expected images/ + videos/, or img/ + gif/).`)
  process.exit(1)
}
if (!existsSync(dist)) { console.error('✗ dist/ is missing — run the vite build first.'); process.exit(1) }

const out = { img: join(dist, 'img'), gif: join(dist, 'gif') }
mkdirSync(out.img, { recursive: true })
mkdirSync(out.gif, { recursive: true })

const missing = []
let bytes = 0, files = 0
for (const ex of EXDB) {
  for (const [kind, from, name] of [['img', imgDir, ex.img], ['gif', gifDir, ex.gif]]) {
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
const counted = readdirSync(out.img).length + readdirSync(out.gif).length
console.log(`✓ ${files} media files (${(bytes / 1e6).toFixed(1)} MB) bundled into dist/ for offline use — ${counted} on disk.`)
