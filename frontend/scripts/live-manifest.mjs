#!/usr/bin/env node
// 14.0 — the manifest of the online Android app's web bundle, which the app downloads to update
// itself (src/lib/liveUpdate.js): its version, the native level it needs (package.json → mjNative)
// and every file with its size and SHA-256.
// 17.0 — and its build id and time (from the bundle's mj-files.json, scripts/slim-online.mjs), so a
// change on the site reaches the app even when the version number stays the same; and the version's
// short "what's new" in English and Arabic from CHANGELOG.md (scripts/release-notes.mjs), shown on the
// update card before you download.
//
//   node scripts/live-manifest.mjs <bundle dir> <out json> <base>
//   e.g. node scripts/live-manifest.mjs _site/live/17.0.0-<build> _site/live/online.json 17.0.0-<build>/
// Run by scripts/build-site.sh for GitHub Pages. Source maps are left out — the app never asks for them.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundleFiles, buildId, FILES_JSON } from './bundle-files.mjs'
import { releaseNotes } from './release-notes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const [dir, out, base] = process.argv.slice(2)
if (!dir || !out || !existsSync(join(dir, 'index.html'))) { console.error('usage: live-manifest.mjs <bundle dir with index.html> <out json> <base>'); process.exit(1) }
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))
let files
try { files = bundleFiles(dir) } catch (e) { console.error('✗', e.message); process.exit(1) }
// mj-files.json is a file of the bundle too: the app downloads it with the rest
if (existsSync(join(dir, FILES_JSON))) {
  const { createHash } = await import('node:crypto')
  const buf = readFileSync(join(dir, FILES_JSON))
  files.push([FILES_JSON, buf.length, createHash('sha256').update(buf).digest('hex')])
  files.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
}
let own = null
try { own = JSON.parse(readFileSync(join(dir, FILES_JSON), 'utf8')) } catch { /* an older bundle */ }
const build = (own && own.build) || buildId(files.filter(f => f[0] !== FILES_JSON))
const built = (own && own.built) || new Date().toISOString()
const changelog = join(here, '..', '..', 'CHANGELOG.md')
const n = releaseNotes(existsSync(changelog) ? readFileSync(changelog, 'utf8') : '', pkg.version)
const size = files.reduce((a, f) => a + f[1], 0)
const m = { v: 1, version: pkg.version, native: pkg.mjNative || 1, build, built, base: base || pkg.version + '/', size, notes: { en: n.en, ar: n.ar }, files }
writeFileSync(out, JSON.stringify(m))
console.log(`✓ live bundle ${pkg.version} build ${build} (native ${m.native}): ${files.length} files, ${(size / 1048576).toFixed(1)} MB → ${out}`)
