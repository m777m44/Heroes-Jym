// Tiny dependency-free i18n. English source strings are the keys; the Arabic locale file in
// src/locales/ maps them to translations and is lazy-loaded (Vite code-splits each
// import.meta.glob entry), so the initial bundle stays English-only.
// 12.0: the app speaks two languages — Arabic and English. The eleven other UI languages and
// their exercise-instruction packs were removed (smaller app, every string checked by hand).
import { useSyncExternalStore } from 'react'

// UI languages. Arabic has a hand-written, sentence-keyed instruction pack that covers part of
// the library (see instr/ar.js); the rest of the exercises keep their English steps.
export const LANGS = { ar: 'العربية', en: 'English' }
// Languages written right to left — the shell sets <html dir> from this.
export const RTL_LANGS = ['ar']
/** The phone's / browser's language when it is Arabic or English, else English. */
export function deviceLang() {
  try {
    for (const l of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language])) {
      const k = String(l || '').toLowerCase().split('-')[0]
      if (LANGS[k]) return k
    }
  } catch { /* no navigator (SSR, tests) */ }
  return 'en'
}
/** The language to show: S.lang, or the phone's when it is 'auto' (2.10 default) / unknown
 *  (a language removed in 12.0 — German, French… — falls back to the phone's, then English). */
export const langOf = S => (S && S.lang && S.lang !== 'auto' && LANGS[S.lang] ? S.lang : deviceLang())
export const isRTL = l => RTL_LANGS.includes(l)
export const INSTR_LANGS = ['en', 'ar']
const DATE_LOCALES = {
  en: 'en-GB',
  ar: 'ar-u-nu-latn'   // Arabic text, Western digits — the number fields take 0-9, so both read alike
}

const localePacks = import.meta.glob('../locales/*.js')
const instrPacks = import.meta.glob('../instr/*.js')
// Translated exercise names (src/exnames/<lang>.js, by id) — only Arabic so far.
const namePacks = import.meta.glob('../exnames/*.js')

let lang = 'en'
let dict = {}
let instr = null            // { exId: [steps] } for the current language, null = English
let names = null            // { exId: name } for the current language, null = English names
let version = 0
const subs = new Set()
const notify = () => { version++; subs.forEach(f => f()) }

export const getLang = () => lang
export const dateLocale = () => DATE_LOCALES[lang] || 'en-GB'

// Unit labels. English abbreviations everywhere except Arabic, which has its own (كغ، كم…).
// 'mn' is the minutes part of "1h 5m" (written 'm' outside Arabic, so it can't clash with metres).
const UNIT_AR = { kg: 'كغ', lb: 'رطل', km: 'كم', 'km/h': 'كم/س', kcal: 'سعرة', cm: 'سم', min: 'دقيقة', h: 'س', mn: 'د', s: 'ث', ml: 'مل', g: 'غ', GMT: 'غرينتش', L: 'لتر', mg: 'ملغ' }
export const U = u => lang === 'ar' ? (UNIT_AR[u] || u) : (u === 'mn' ? 'm' : u)

// Translate a source string; {0},{1}… are replaced with args (also on the English fallback).
export function t(s, ...args) {
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}
// Instructions for an exercise in the current language (English steps as fallback).
// A sentence-keyed pack ({ sentences: { en: translation } }) translates an exercise only when
// every one of its steps is in it — never a half-English list.
function packSteps(ex) {
  if (!instr || !ex) return null
  if (!instr.sentences) return instr[ex.id] || null
  const st = ex.st || [], m = instr.sentences
  return st.length && st.every(s => m[s]) ? st.map(s => m[s]) : null
}
export const instrFor = ex => packSteps(ex) || (ex && ex.st) || []
// True when the steps shown for this exercise are in the current language.
export const instrTranslated = ex => lang === 'en' || !!packSteps(ex)
// Exercise name in the current language (the dataset name when there's no translation,
// e.g. custom exercises). In Arabic the English name is shown under it: exNameEn() gives that
// second line, or '' when the name isn't translated (English UI shows English only).
export const exName = ex => (ex && ((names && names[ex.id]) || ex.n)) || ''
export const exNameEn = ex => (ex && names && names[ex.id] && ex.n) || ''
// What search matches against: both names, so «سكوات» and "squat" both find it.
export const exSearch = ex => (ex ? ((names && names[ex.id]) ? names[ex.id] + ' ' + ex.n : ex.n || '') : '')

export async function setLang(l) {
  if (!LANGS[l]) l = 'en'
  if (l === lang && version > 0) return
  lang = l
  try {
    dict = l === 'en' ? {} : (await localePacks['../locales/' + l + '.js']()).default
    instr = l === 'en' || !INSTR_LANGS.includes(l) ? null : (await instrPacks['../instr/' + l + '.js']()).default
    const np = namePacks['../exnames/' + l + '.js']
    names = np ? (await np()).default : null
  } catch { dict = {}; instr = null; names = null }
  notify()
}

// Re-renders the subscribing component (and its children) whenever the language changes.
export function useLang() {
  const snap = () => version
  return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn) }, snap, snap)
}
