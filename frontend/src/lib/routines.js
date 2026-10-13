// Routine names and colours.
//
// Built-in routine names (the starter plan, "New routine", "Freestyle"…) are stored in English
// and shown in the current language — so a plan loaded in English reads «يوم الدفع» once the
// app is switched to Arabic, and back. Names the user typed are shown exactly as typed.
//
// Every routine has a colour from the system palette (r.color). Routines saved before 2.4 have
// none: they get a stable one derived from their id, so the colours never jump around.
import { t } from './i18n.js'
import { uid } from './format.js'

export const BUILTIN_NAMES = ['Push Day', 'Pull Day', 'Leg Day', 'Freestyle', 'New routine', 'Shared routine',
  // Today's plan (lib/dailyPlan.js) — saved on the workout, so history shows them translated.
  'Full-body fat burn', 'Walking day + core', 'Legs & glutes', 'HIIT fat burner', 'Upper body & core', 'Long walk + core', 'Mobility & recovery']
export const routineLabel = name => (name && BUILTIN_NAMES.includes(name) ? t(name) : name || '')

export const ROUTINE_COLORS = ['green', 'blue', 'orange', 'purple', 'pink', 'red', 'teal', 'yellow', 'indigo', 'mint']
export function routineColor(r) {
  if (!r) return 'grey'
  if (ROUTINE_COLORS.includes(r.color)) return r.color
  let h = 0
  for (const ch of String(r.id || r.name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return ROUTINE_COLORS[h % ROUTINE_COLORS.length]
}
/** CSS for a routine's colour: the solid colour and a soft tint for backgrounds. */
export const colorVar = c => `var(--${c})`
export const softVar = c => `color-mix(in srgb, var(--${c}) 18%, transparent)`

/**
 * The six-day Push / Pull / Legs split, Saturday to Thursday with Friday off:
 * Sat Push · Sun Pull · Mon Legs · Tue Push · Wed Pull · Thu Legs · Fri rest.
 * Keys are getDay() numbers.
 */
export const SIX_DAY_SPLIT = { 6: 'push', 0: 'pull', 1: 'legs', 2: 'push', 3: 'pull', 4: 'legs', 5: null }

const KIND_OF = { 'Push Day': 'push', 'Pull Day': 'pull', 'Leg Day': 'legs' }
/** 'push' | 'pull' | 'legs' for a starter routine (by its stored English name), else null. */
export const starterKind = r => (r && KIND_OF[r.name]) || null

/**
 * Put the six-day split on the week. Uses the plan's own Push / Pull / Leg Day routines and
 * adds any that are missing (`make` returns fresh [push, pull, legs]). Mutates `s`.
 */
export function applySixDaySplit(s, make) {
  const have = {}
  for (const r of s.routines || []) { const k = starterKind(r); if (k && !have[k]) have[k] = r }
  const fresh = make()
  ;['push', 'pull', 'legs'].forEach((k, i) => {
    if (!have[k]) { const r = { ...fresh[i], id: fresh[i].id || uid() }; s.routines.push(r); have[k] = r }
  })
  s.week = s.week || {}
  for (const [d, k] of Object.entries(SIX_DAY_SPLIT)) {
    if (k) s.week[d] = have[k].id
    else delete s.week[d]
  }
}
/** true when the week already follows the six-day split. */
export function hasSixDaySplit(S) {
  const byId = Object.fromEntries((S.routines || []).map(r => [r.id, r]))
  return Object.entries(SIX_DAY_SPLIT).every(([d, k]) => (k ? starterKind(byId[S.week?.[d]]) === k : !S.week?.[d]))
}
