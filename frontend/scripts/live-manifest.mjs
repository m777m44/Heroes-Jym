#!/usr/bin/env node
// 14.0 — the manifest of the online Android app's web bundle, which the app downloads to update
// itself (src/lib/liveUpdate.js): its version, the native level it needs (package.json → mjNative)
// and every file with its size and SHA-256.
//
//   node scripts/live-manifest.mjs <bundle dir> <out json> <base>
//   e.g. node scripts/live-manifest.mjs _site/live/14.0.0 _site/live/online.json 14.0.0/
// Run by scripts/build-site.sh for GitHub Pages. Source maps are left out — the app never asks for them.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const [dir, out, base] = process.argv.slice(2)
if (!dir || !out || !existsSync(join(dir, 'index.html'))) { console.error('usage: live-manifest.mjs <bundle dir with index.html> <out json> <base>'); process.exit(1) }
const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'))
const files = []
const walk = d => {
  for (const n of readdirSync(d).sort()) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) walk(p)
    else if (!n.endsWith('.map')) {
      const rel = relative(dir, p).split(sep).join('/')
      if (!/^[\w.\-/]+$/.test(rel)) { console.error('✗ a file name the app would refuse:', rel); process.exit(1) }
      const buf = readFileSync(p)
      files.push([rel, buf.length, createHash('sha256').update(buf).digest('hex')])
    }
  }
}
walk(dir)
const size = files.reduce((a, f) => a + f[1], 0)
const m = { v: 1, version: pkg.version, native: pkg.mjNative || 1, base: base || pkg.version + '/', built: new Date().toISOString(), size, files }
writeFileSync(out, JSON.stringify(m))
console.log(`✓ live bundle ${pkg.version} (native ${m.native}): ${files.length} files, ${(size / 1048576).toFixed(1)} MB → ${out}`)
