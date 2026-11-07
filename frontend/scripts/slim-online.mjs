#!/usr/bin/env node
// Online (light) Android app: after the vite build, drop the pictures that this build takes from
// the GitHub repository instead (VITE_ASSET_BASE → lib/assets.js) — the full-size wallpapers,
// the ready-made profile pictures and (14.0) the kitchen's food photos. Wallpaper thumbnails
// (wallpapers/t/) and the sound packs stay: the pickers need the thumbnails offline, and Android
// plays the sounds from inside the app.
//
//   node scripts/slim-online.mjs        (run by `npm run build:mobile`)
import { existsSync, readdirSync, rmSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { bundleFiles, buildId, FILES_JSON } from './bundle-files.mjs'

// MJ_OUT_DIR: the build went somewhere else (scripts/build-site.sh — the bundle the online app downloads)
const dist = process.env.MJ_OUT_DIR ? resolve(process.env.MJ_OUT_DIR) : resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (!existsSync(dist)) { console.error('✗ dist/ is missing — run the vite build first.'); process.exit(1) }
const size = d => readdirSync(d).reduce((a, n) => { const p = join(d, n); const st = statSync(p); return a + (st.isDirectory() ? size(p) : st.size) }, 0)
const before = size(dist)
let removed = 0
const walls = join(dist, 'wallpapers')
if (existsSync(walls)) for (const n of readdirSync(walls)) if (n.endsWith('.webp')) { rmSync(join(walls, n)); removed++ }
const avatars = join(dist, 'avatars')
if (existsSync(avatars)) { removed += readdirSync(avatars).length; rmSync(avatars, { recursive: true }) }
// 14.0: the kitchen's real photos (food/m, food/t — about 25 MB) come from the repository too
const food = join(dist, 'food')
if (existsSync(food)) { for (const d of ['m', 't']) { const p = join(food, d); if (existsSync(p)) removed += readdirSync(p).length } rmSync(food, { recursive: true }) }
const mb = b => (b / 1048576).toFixed(1) + ' MB'
console.log(`✓ online build: ${removed} pictures left in the repository — dist/ ${mb(before)} → ${mb(size(dist))}`)

// 17.0: the bundle's own file list (mj-files.json) — its build id and every file's SHA-256. The app
// reads it to know which files an update really changes (lib/liveUpdate.js); `built` is the commit's
// time, so the APK and GitHub Pages, built from the same commit, agree on it.
const pkg = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'))
const files = bundleFiles(dist)
let built = ''
try { built = execFileSync('git', ['log', '-1', '--format=%cI'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { /* not a git checkout */ }
built = new Date(built || Date.now()).toISOString()
const list = { v: 1, version: pkg.version, native: pkg.mjNative || 1, build: buildId(files), built, files }
writeFileSync(join(dist, FILES_JSON), JSON.stringify(list))
console.log(`✓ ${FILES_JSON}: build ${list.build} of ${pkg.version}, ${files.length} files`)
