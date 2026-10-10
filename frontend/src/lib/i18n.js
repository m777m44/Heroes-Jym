// Tiny dependency-free i18n. English source strings are the keys; locale files in
// src/locales/ map them to translations and are lazy-loaded (Vite code-splits each
// import.meta.glob entry), so the initial bundle stays English-only.
// Exercise instructions come from separately generated packs in src/instr/ (one per
// language, from the upstream dataset) — also lazy-loaded on language switch.
import { useSyncExternalStore } from 'react'

// UI languages. de/pt have no instruction pack upstream — instructions fall back to English.
export const LANGS = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano',
  pt: 'Português', pl: 'Polski', tr: 'Türkçe', ru: 'Русский', zh: '中文',
  ko: '한국어', hi: 'हिन्दी', ar: 'العربية'
}
// Languages written right to left — the shell sets <html dir> from this.
export const RTL_LANGS = ['ar']
export const isRTL = l => RTL_LANGS.includes(l)
export const INSTR_LANGS = ['en', 'es', 'fr', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko']
const DATE_LOCALES = {
  en: 'en-GB', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT',
  pl: 'pl-PL', tr: 'tr-TR', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', hi: 'hi-IN',
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
const UNIT_AR = { kg: 'كغ', lb: 'رطل', km: 'كم', 'km/h': 'كم/س', kcal: 'سعرة', cm: 'سم', min: 'دقيقة', h: 'س', mn: 'د', s: 'ث' }
export const U = u => lang === 'ar' ? (UNIT_AR[u] || u) : (u === 'mn' ? 'm' : u)

// Translate a source string; {0},{1}… are replaced with args (also on the English fallback).
export function t(s, ...args) {
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}
// Instructions for an exercise in the current language (English steps as fallback).
export const instrFor = ex => (instr && instr[ex.id]) || ex.st || []
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
  } catch (e) { dict = {}; instr = null; names = null }
  notify()
}

// Re-renders the subscribing component (and its children) whenever the language changes.
export function useLang() {
  const snap = () => version
  return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn) }, snap, snap)
}
