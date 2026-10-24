// Adds Arabic translations to src/locales/ar.js from a JSON file: { "English key": "Arabic" }.
// (Older files used [ar, de, es, …] arrays — the first entry is the Arabic one, so they still work.)
// Keys the locale already has are left alone. Usage: node scripts/apply-locales.mjs scripts/i18n/12.0a.json
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const ph = s => (s.match(/\{\d\}/g) || []).sort().join()
const arOf = v => (Array.isArray(v) ? v[0] : v)
let bad = 0
for (const [k, v] of Object.entries(data)) {
  const ar = arOf(v)
  if (typeof ar !== 'string' || !ar.trim()) { console.error('no Arabic:', k); bad++; continue }
  if (ph(ar) !== ph(k)) { console.error('placeholders differ:', k, '→', ar); bad++ }
  // the Arabic UI guard (views/arabic-ui.test.jsx) fails on two Latin letters in a row
  if (/[A-Za-z]{2}/.test(ar.replace(/\{\d\}/g, '').replace(/MAHDI-JYM/g, ''))) { console.error('Latin letters in the Arabic text:', k, '→', ar); bad++ }
}
if (bad) process.exit(1)
const file = join(root, 'src/locales/ar.js')
const mod = (await import(file + '?t=' + Date.now())).default
let src = readFileSync(file, 'utf8')
const add = Object.entries(data).filter(([k]) => !(k in mod)).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(arOf(v))},\n`).join('')
if (add) {
  const end = src.lastIndexOf('}')
  src = src.slice(0, end).replace(/,?\s*$/, ',\n') + add + src.slice(end)
  writeFileSync(file, src)
}
console.log('ar +', add ? add.split('\n').length - 1 : 0)
