// Health log (3.0): a private daily log, kept on the phone and in your own backups only.
// It records sleep, mood, energy and stress, blood pressure, blood sugar, resting heart rate,
// and medicines / vitamins with reminders.
//
//   S.health = { 'YYYY-MM-DD': { sleepH, sleepQ, mood, energy, stress, rhr,
//                                bp: [{ t, sys, dia, pulse }], sugar: [{ t, v, ctx }] } }
//                sugar v is always stored in mg/dL; S.sugarUnit only changes the display
//   S.meds    = [{ id, name, kind: 'med' | 'vit', dose, times: ['08:00', …], on }]
//   S.medLog  = { 'YYYY-MM-DD': { '<id>@<time>': true } }
//
// The categories follow:
// - Blood pressure: ACC/AHA 2017.
// - Blood sugar: ADA (fasting, and 2 h after a meal).
// - Sleep: the AASM/SRS adult recommendation (7–9 h).
// - Resting heart rate: AHA (60–100 bpm).
// They are for orientation only — the screen says so. Pure functions: no store, no clock
// other than the arguments.

export const MGDL_PER_MMOL = 18.016
export const toMgdl = (v, unit) => (unit === 'mmol' ? v * MGDL_PER_MMOL : v)
export const fromMgdl = (v, unit) => (unit === 'mmol' ? Math.round(v / MGDL_PER_MMOL * 10) / 10 : Math.round(v))
const fin = v => typeof v === 'number' && Number.isFinite(v)
const isoOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
export const shiftIso = (iso, days) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days); return isoOf(d) }

/** Valid input ranges (what the screen accepts). */
export const RANGES = { sleepH: [0, 16], sys: [60, 260], dia: [30, 160], pulse: [25, 230], rhr: [25, 150], sugarMgdl: [20, 600] }
export const inRange = (v, [a, b]) => fin(v) && v >= a && v <= b

/** ACC/AHA 2017: 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis' (and 'low' below 90/60). */
export function bpCategory(sys, dia) {
  if (!fin(sys) || !fin(dia)) return null
  if (sys > 180 || dia > 120) return 'crisis'
  if (sys >= 140 || dia >= 90) return 'stage2'
  if (sys >= 130 || dia >= 80) return 'stage1'
  if (sys >= 120) return 'elevated'
  if (sys < 90 || dia < 60) return 'low'
  return 'normal'
}
/** ADA, by when it was measured: 'low' | 'normal' | 'pre' | 'high'. */
export function sugarCategory(mgdl, ctx = 'fasting') {
  if (!fin(mgdl)) return null
  if (mgdl < 70) return 'low'
  if (ctx === 'fasting') return mgdl < 100 ? 'normal' : mgdl < 126 ? 'pre' : 'high'
  if (ctx === 'after') return mgdl < 140 ? 'normal' : mgdl < 200 ? 'pre' : 'high'
  return mgdl < 200 ? 'normal' : 'high'                // random
}
/** Hours of sleep for an adult: 'short' (< 6) | 'bitShort' (6–7) | 'good' (7–9) | 'long' (> 9). */
export function sleepCategory(h, age = 30) {
  if (!fin(h)) return null
  const [lo, hi] = age != null && age < 18 ? [8, 10] : age >= 65 ? [7, 8] : [7, 9]
  return h < lo - 1 ? 'short' : h < lo ? 'bitShort' : h <= hi ? 'good' : 'long'
}
/** Resting heart rate: 'low' (< 60, fine if you are fit) | 'normal' | 'high' (> 100). */
export const rhrCategory = bpm => (!fin(bpm) ? null : bpm < 60 ? 'low' : bpm <= 100 ? 'normal' : 'high')

/** The log of a day (never null). */
export const dayLog = (S, iso) => (S && S.health && S.health[iso]) || {}

/** Mutating helper for update(): set fields of a day, dropping empties. */
export function setDay(s, iso, patch) {
  s.health = s.health || {}
  const d = { ...(s.health[iso] || {}), ...patch }
  for (const k of Object.keys(d)) if (d[k] == null || (Array.isArray(d[k]) && !d[k].length)) delete d[k]
  if (Object.keys(d).length) s.health[iso] = d
  else delete s.health[iso]
}
/** Add a reading ('bp' | 'sugar') to a day, kept in time order. */
export function addReading(s, iso, key, reading) {
  const list = [...(dayLog(s, iso)[key] || []), reading].sort((a, b) => (a.t || 0) - (b.t || 0))
  setDay(s, iso, { [key]: list })
}
export function removeReading(s, iso, key, t) {
  setDay(s, iso, { [key]: (dayLog(s, iso)[key] || []).filter(r => r.t !== t) })
}

/** The days in [iso − days + 1, iso]. */
const lastDays = (iso, days) => Array.from({ length: days }, (_, i) => shiftIso(iso, -i))
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const r1 = v => (v == null ? null : Math.round(v * 10) / 10)

/** Averages over the last `days` days (only days with a value count). */
export function summary(S, iso, days = 7) {
  const logs = lastDays(iso, days).map(d => dayLog(S, d))
  const vals = k => logs.map(l => l[k]).filter(fin)
  const bps = logs.flatMap(l => l.bp || [])
  const fasting = logs.flatMap(l => (l.sugar || []).filter(x => x.ctx === 'fasting')).map(x => x.v)
  const sugars = logs.flatMap(l => l.sugar || []).map(x => x.v)
  const sys = avg(bps.map(b => b.sys)), dia = avg(bps.map(b => b.dia))
  return {
    sleepH: r1(avg(vals('sleepH'))), sleepQ: r1(avg(vals('sleepQ'))),
    mood: r1(avg(vals('mood'))), energy: r1(avg(vals('energy'))), stress: r1(avg(vals('stress'))),
    rhr: avg(vals('rhr')) == null ? null : Math.round(avg(vals('rhr'))),
    bp: sys == null ? null : { sys: Math.round(sys), dia: Math.round(dia), n: bps.length, cat: bpCategory(Math.round(sys), Math.round(dia)) },
    sugarFasting: fasting.length ? Math.round(avg(fasting)) : null,
    sugar: sugars.length ? Math.round(avg(sugars)) : null,
    daysLogged: logs.filter(l => Object.keys(l).length).length,
  }
}

/** One value per day for a chart: [{ t, y }] of `pick(dayLog)` (null days skipped). */
export function series(S, iso, days, pick) {
  return lastDays(iso, days).reverse().map(d => {
    const y = pick(dayLog(S, d))
    return fin(y) ? { t: new Date(d + 'T12:00:00').getTime(), d, y } : null
  }).filter(Boolean)
}
/** Days in a row with anything logged, ending today or yesterday. */
export function logStreak(S, iso) {
  let n = 0, d = Object.keys(dayLog(S, iso)).length ? iso : shiftIso(iso, -1)
  while (Object.keys(dayLog(S, d)).length && n < 3650) { n++; d = shiftIso(d, -1) }
  return n
}

// ---- medicines & vitamins -----------------------------------------------------------------

export const MED_MAX = 20
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
export const cleanTimes = times => [...new Set((times || []).filter(x => TIME_RE.test(x)))].sort()
export const newMedId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

/** Doses due on a day: [{ med, time, key, taken }], in time order. */
export function dosesOn(S, iso) {
  const log = (S && S.medLog && S.medLog[iso]) || {}
  return (S.meds || []).filter(m => m.on !== false)
    .flatMap(m => cleanTimes(m.times).map(time => ({ med: m, time, key: m.id + '@' + time, taken: !!log[m.id + '@' + time] })))
    .sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name))
}
/** Mutating helper: tick / untick a dose. */
export function toggleDose(s, iso, key) {
  s.medLog = s.medLog || {}
  const day = { ...(s.medLog[iso] || {}) }
  if (day[key]) delete day[key]; else day[key] = true
  if (Object.keys(day).length) s.medLog[iso] = day
  else delete s.medLog[iso]
}
/** % of doses taken over the last `days` days (null when nothing was due). */
export function adherence(S, iso, days = 7) {
  let due = 0, taken = 0
  for (const d of lastDays(iso, days)) for (const x of dosesOn(S, d)) { due++; if (x.taken) taken++ }
  return due ? Math.round(taken / due * 100) : null
}
/** Native notification ids for medicine reminders: 7400 + n (one per med × time, max 60). */
export const MED_ID_BASE = 7400
export function medReminders(S) {
  const out = []
  for (const m of (S.meds || []).filter(x => x.on !== false && x.remind !== false)) {
    for (const time of cleanTimes(m.times)) {
      if (out.length >= 60) break
      const [h, mi] = time.split(':').map(Number)
      out.push({ id: MED_ID_BASE + out.length, medId: m.id, name: m.name, dose: m.dose || '', kind: m.kind || 'med', hour: h, minute: mi, time })
    }
  }
  return out
}
