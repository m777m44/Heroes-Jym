#!/usr/bin/env node
// Online (light) Android app: after the vite build, drop the pictures that this build takes from
// the GitHub repository instead (VITE_ASSET_BASE → lib/assets.js) — the full-size wallpapers and
// the ready-made profile pictures. Wallpaper thumbnails (wallpapers/t/) and the sound packs stay:
// the pickers need the thumbnails offline, and Android plays the sounds from inside the app.
//
//   node scripts/slim-online.mjs        (run by `npm run build:mobile`)
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (!existsSync(dist)) { console.error('✗ dist/ is missing — run the vite build first.'); process.exit(1) }
const size = d => readdirSync(d).reduce((a, n) => { const p = join(d, n); const st = statSync(p); return a + (st.isDirectory() ? size(p) : st.size) }, 0)
const before = size(dist)
let removed = 0
const walls = join(dist, 'wallpapers')
if (existsSync(walls)) for (const n of readdirSync(walls)) if (n.endsWith('.webp')) { rmSync(join(walls, n)); removed++ }
const avatars = join(dist, 'avatars')
if (existsSync(avatars)) { removed += readdirSync(avatars).length; rmSync(avatars, { recursive: true }) }
const mb = b => (b / 1048576).toFixed(1) + ' MB'
console.log(`✓ online build: ${removed} pictures left in the repository — dist/ ${mb(before)} → ${mb(size(dist))}`)
