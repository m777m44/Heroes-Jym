// 17.0 — the files of a built web bundle with their sizes and SHA-256, and the bundle's build id (a
// hash of all of them). The online app's bundle carries this list as mj-files.json
// (scripts/slim-online.mjs), so the app knows exactly which files an update changes: only those
// download, the rest are copied from the running version — and the progress bar counts real bytes.
// scripts/live-manifest.mjs makes GitHub Pages' live/online.json from the same list.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { createHash } from 'node:crypto'

export const FILES_JSON = 'mj-files.json'

/** [[path, size, sha256], …] of every file under `dir` (sorted; no source maps, not mj-files.json). */
export function bundleFiles(dir) {
  const files = []
  const walk = d => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) walk(p)
      else {
        const rel = relative(dir, p).split(sep).join('/')
        if (rel.endsWith('.map') || rel === FILES_JSON) continue
        if (!/^[\w.\-/]+$/.test(rel)) throw new Error('a file name the app would refuse: ' + rel)
        const buf = readFileSync(p)
        files.push([rel, buf.length, createHash('sha256').update(buf).digest('hex')])
      }
    }
  }
  walk(dir)
  return files
}

/** The build id: the first 12 hex characters of a SHA-256 over every path and hash. Same files, same id. */
export function buildId(files) {
  const h = createHash('sha256')
  for (const [p, , sha] of files) h.update(p + ':' + sha + '\n')
  return h.digest('hex').slice(0, 12)
}
