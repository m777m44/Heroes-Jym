// Adds translations to src/locales/*.js from a JSON file: { "English key": [ar, de, es, fr, it, pt, pl, tr, ru, zh, ko, hi] }.
// Keys a locale already has are left alone. Usage: node scripts/apply-locales.mjs scripts/i18n/7.0.json
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const ORDER = ['ar', 'de', 'es', 'fr', 'it', 'pt', 'pl', 'tr', 'ru', 'zh', 'ko', 'hi']
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const ph = s => (s.match(/\{\d\}/g) || []).sort().join()
let bad = 0
for (const [k, arr] of Object.entries(data)) {
  if (!Array.isArray(arr) || arr.length !== ORDER.length) { console.error('wrong length:', k); bad++; continue }
  arr.forEach((v, i) => { if (ph(v) !== ph(k)) { console.error(`placeholders differ [${ORDER[i]}]:`, k, '→', v); bad++ } })
}
if (bad) process.exit(1)
for (const [i, lang] of ORDER.entries()) {
  const file = join(root, 'src/locales', lang + '.js')
  const mod = (await import(file + '?t=' + Date.now())).default
  let src = readFileSync(file, 'utf8')
  const add = Object.entries(data).filter(([k]) => !(k in mod)).map(([k, arr]) => `  ${JSON.stringify(k)}: ${JSON.stringify(arr[i])},\n`).join('')
  if (!add) continue
  const end = src.lastIndexOf('}')
  src = src.slice(0, end).replace(/,?\s*$/, ',\n') + add + src.slice(end)
  writeFileSync(file, src)
  console.log(lang, '+', add.split('\n').length - 1)
}
