#!/usr/bin/env node
// 17.0 — the short "what's new" of a version, taken from CHANGELOG.md: the bold English summary under
// its "## vX.Y.Z" heading and the italic Arabic one after it. The in-app update shows it on the update
// card before you download (scripts/live-manifest.mjs puts it in live/online.json; the Android
// workflow puts it in the GitHub release as two HTML comments, read by lib/updates.js).
//
//   node scripts/release-notes.mjs [version]        → { "version", "en", "ar" } (JSON)
//   node scripts/release-notes.mjs 17.0.0 --md      → <!-- mj-notes-en: … --> and <!-- mj-notes-ar: … -->
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAX = 320
const clean = s => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|__|`|\*/g, '').replace(/-->/g, '→').replace(/\s+/g, ' ').trim()
const cut = s => (s.length > MAX ? s.slice(0, MAX - 1).replace(/\s+\S*$/, '') + '…' : s)

/**
 * CHANGELOG text + version → { version, en, ar } ('' when a part isn't there). Under the version's
 * heading: the bold block (**…**, one or more lines) is the English summary, the italic block (*…*) the
 * Arabic one — the two usually follow each other with no blank line.
 */
export function releaseNotes(md, version) {
  const v = String(version || '').replace(/^v/i, '')
  const lines = String(md || '').split(/\r?\n/)
  const start = lines.findIndex(l => new RegExp('^##\\s+v?' + v.replace(/\./g, '\\.') + '(\\s|$)').test(l))
  if (start < 0) return { version: v, en: '', ar: '' }
  const block = (from, open, close) => {
    const out = []
    for (let i = from; i < lines.length; i++) {
      const l = lines[i].trim()
      if (!l || /^#/.test(l)) break
      out.push(l)
      if ((i > from || l.length > open.length) && close(l)) return out.join(' ')
    }
    return out.join(' ')
  }
  let en = '', ar = ''
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim()
    if (/^#{2,}\s/.test(l)) break           // the summary is above the first section
    if (!en && l.startsWith('**')) en = block(i, '**', x => x.endsWith('**'))
    else if (!ar && /^\*[^*]/.test(l)) ar = block(i, '*', x => x.endsWith('*') && !x.endsWith('**'))
  }
  return { version: v, en: cut(clean(en)), ar: cut(clean(ar)) }
}

/** The two HTML comments a GitHub release carries (invisible on the page). */
export const notesComments = n => `<!-- mj-notes-en: ${n.en} -->\n<!-- mj-notes-ar: ${n.ar} -->`

const here = dirname(fileURLToPath(import.meta.url))
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))
  const args = process.argv.slice(2)
  const version = args.find(a => !a.startsWith('--')) || pkg.version
  const file = join(here, '..', '..', 'CHANGELOG.md')
  const n = releaseNotes(existsSync(file) ? readFileSync(file, 'utf8') : '', version)
  process.stdout.write(args.includes('--md') ? notesComments(n) + '\n' : JSON.stringify(n) + '\n')
}
