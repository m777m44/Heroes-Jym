#!/usr/bin/env node
// Guards the locales in src/locales/ (12.0: Arabic only — English is the source language and
// has no locale file).
//
//   node scripts/check-locales.mjs
//
// 1. Every locale carries the same key set (a key added to one locale only would fall back to
//    English silently, mid-sentence, in the others). With a single locale this is trivially true,
//    but it keeps working if a language is ever added again.
// 2. Every literal key the app passes to t() exists in the locales.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const files = readdirSync(localesDir).filter(f => f.endsWith('.js')).sort()

if (!files.length) {
  console.error(`No locale files found in ${localesDir}`)
  process.exit(1)
}

const locales = new Map()
for (const file of files) {
  const { default: dict } = await import(pathToFileURL(join(localesDir, file)).href)
  if (!dict || typeof dict !== 'object') {
    console.error(`${file}: no default-exported object`)
    process.exit(1)
  }
  locales.set(file.replace(/\.js$/, ''), new Set(Object.keys(dict)))
}

// How many locales carry each key — 1 means the key was added to a single file only,
// which is the usual shape of the bug and worth naming separately from plain gaps.
const seen = new Map()
for (const keys of locales.values()) for (const k of keys) seen.set(k, (seen.get(k) || 0) + 1)
const union = [...seen.keys()]

let failed = false
for (const [lang, keys] of locales) {
  const missing = union.filter(k => !keys.has(k))
  const orphans = locales.size > 1 ? union.filter(k => keys.has(k) && seen.get(k) === 1) : []
  if (missing.length || orphans.length) {
    failed = true
    console.error(`\n${lang}.js: ${keys.size}/${union.length} keys`)
    for (const k of missing) console.error(`  missing:   ${JSON.stringify(k)}`)
    for (const k of orphans) console.error(`  only here: ${JSON.stringify(k)}`)
  }
}

if (failed) {
  console.error('\nLocale key sets differ. Every locale must carry the same keys.')
  process.exit(1)
}

// Second invariant: every literal key the app passes to t() exists in the locales. A string
// wrapped in t() but never added to a locale renders in English for every language, silently.
// Covers t('…'), t("…") and the ternary form t(cond ? '…' : '…'); dynamic keys are skipped.
const srcDir = join(localesDir, '..')
const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f)
  if (statSync(p).isDirectory()) return f === 'locales' ? [] : walk(p)
  return /\.(jsx?|mjs)$/.test(f) && !/\.test\./.test(f) ? [p] : []
})
const unknown = new Map()
const call = /\bt\((?:[^'"`()]*?\?\s*)?(['"])((?:\\.|(?!\1).)*)\1(?:\s*:\s*(['"])((?:\\.|(?!\3).)*)\3)?/g
for (const file of walk(srcDir)) {
  for (const m of readFileSync(file, 'utf8').matchAll(call)) {
    for (const raw of [m[2], m[4]]) {
      if (!raw) continue
      const key = raw.replace(/\\(['"\\])/g, '$1')
      if (!seen.has(key) && !unknown.has(key)) unknown.set(key, file.slice(srcDir.length + 1))
    }
  }
}
if (unknown.size) {
  console.error(`\n${unknown.size} t() key(s) used in src/ but missing from every locale:`)
  for (const [k, f] of unknown) console.error(`  ${JSON.stringify(k)}  (${f})`)
  process.exit(1)
}

console.log(`${locales.size} locales, ${union.length} keys each — in sync, and every t() key in src/ is translated.`)
