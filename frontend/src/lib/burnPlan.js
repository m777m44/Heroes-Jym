// 4.2 — the burn plan: pick exercises, and the minutes are sized so that together they burn the
// day's calorie target (from the calorie calculator, lib/calorieCalc.js).
//
// Calories use MET values (Compendium of Physical Activities) and YOUR weight:
//   kcal per minute = MET × 3.5 × kg ÷ 200
// so 30 minutes of running burns more for 90 kg than for 60 kg — no fixed "11 kcal a minute".
// Each activity is a real exercise from the library (GIF, how-to, history, PRs); brisk walking
// uses the step counter.
//
// Time → workout: at home, rounds of 45 s work + 15 s rest (1 minute a round); at the gym, sets
// of 10 reps (about 2 minutes a set with the rest).
//
// Reminders (lib/mobile.js syncReminder → WorkoutReminder.java): one per exercise at its own time
// (start + i × gap), or one for the whole session when gap is 0 — today only, or every day for
// the next 7 days. Buttons: Start (opens that exercise), In 10 min, Skip. Ids 1100 + day·10 + i,
// notification slots 7600 + day·10 + i.
import { t, dateLocale } from './i18n.js'
import { isoOf } from './format.js'

export const ACTIVITIES = {
  home: [
    { key: 'run', id: '0685', name: 'Running', icon: 'figureRun', met: 9.8 },
    { key: 'walk', id: null, name: 'Brisk walking', icon: 'figureWalk', met: 4.3, walk: true },
    { key: 'abs', id: '0274', name: 'Abs', icon: 'abs', met: 3.8 },
    { key: 'burpee', id: '1160', name: 'Burpees', icon: 'flame', met: 8 },
    { key: 'pushup', id: '0662', name: 'Push-ups', icon: 'arm', met: 8 },
    { key: 'squat', id: '1685', name: 'Squats', icon: 'legs', met: 5 },
    { key: 'yoga', id: '1494', name: 'Yoga', icon: 'stretch', met: 2.5 },
    { key: 'jacks', id: '3224', name: 'Jumping jacks', icon: 'sparkles', met: 7.7 },
  ],
  gym: [
    { key: 'bench', id: '0025', name: 'Bench press', icon: 'barbell', met: 5 },
    { key: 'deadlift', id: '0032', name: 'Deadlift', icon: 'barbell', met: 6 },
    { key: 'bsquat', id: '0043', name: 'Barbell squat', icon: 'legs', met: 6 },
    { key: 'legpress', id: '0739', name: 'Leg press', icon: 'machine', met: 5 },
    { key: 'row', id: '0027', name: 'Rows', icon: 'pullup', met: 5 },
    { key: 'shoulder', id: '0405', name: 'Shoulder press', icon: 'arm', met: 4.5 },
    { key: 'pulldown', id: '0150', name: 'Lat pulldown', icon: 'pullup', met: 4.5 },
    { key: 'biceps', id: '0294', name: 'Biceps curls', icon: 'arm', met: 3.5 },
  ],
}
export const BURN_NAMES = { home: 'Calorie burn at home', gym: 'Calorie burn at the gym' }
export const MIN_PER = 3
export const MAX_PER = 60
export const LONG_SESSION = 120
export const GAPS = [0, 30, 60, 120]
export const BURN_ID_BASE = 1100
export const BURN_NID_BASE = 7600
export const BURN_DAYS = 7
export const SNOOZE_MIN = 10
export const DEFAULT_BURN = 300
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export const activityOf = (mode, key) => (ACTIVITIES[mode] || []).find(a => a.key === key) || null
export const kcalPerMin = (met, kg) => met * 3.5 * kg / 200

/**
 * Size the minutes. Throws { key } when nothing is picked. Returns
 * { mode, target, kg, items: [{ ...activity, min, kcal, rx }], minutes, kcal, long }.
 */
export function buildBurnPlan({ mode, keys, target, kg }) {
  const pool = (keys || []).map(k => activityOf(mode, k)).filter(Boolean)
  if (!pool.length) throw Object.assign(new Error('Pick at least one exercise.'), { key: 'Pick at least one exercise.' })
  const w = kg > 0 ? kg : 70
  const goal = Math.max(50, Math.round(target) || DEFAULT_BURN)
  const kpm = pool.map(a => kcalPerMin(a.met, w))
  const avg = kpm.reduce((s, x) => s + x, 0) / pool.length
  const per = Math.min(MAX_PER, Math.max(MIN_PER, Math.round(goal / avg / pool.length)))
  const items = pool.map((a, i) => ({ ...a, min: per, kpm: kpm[i] }))
  // the last exercise takes up the difference, so the total lands on the target
  const last = items[items.length - 1]
  const rest = items.slice(0, -1).reduce((s, x) => s + x.min * x.kpm, 0)
  last.min = Math.min(MAX_PER, Math.max(MIN_PER, Math.round((goal - rest) / last.kpm)))
  for (const x of items) { x.kcal = Math.round(x.min * x.kpm); x.rx = rxOf(x, mode); delete x.kpm }
  const minutes = items.reduce((s, x) => s + x.min, 0)
  return { mode, target: goal, kg: Math.round(w * 10) / 10, items, minutes, kcal: items.reduce((s, x) => s + x.kcal, 0), long: minutes > LONG_SESSION }
}

/** The workout cfg for `min` minutes of an activity (null for walking — the step counter). */
export function rxOf(a, mode) {
  if (a.walk || !a.id) return null
  if (mode === 'gym') return { id: a.id, mode: 'reps', sets: Math.max(2, Math.round(a.min / 2)), reps: 10, weight: 0 }
  return { id: a.id, mode: 'time', sets: Math.max(1, a.min), sec: 45, weight: 0 }
}

/** A one-off routine for the workout screen: all exercises, or only item `only`. */
export function burnRoutine(plan, only = null) {
  const items = only === null ? plan.items : [plan.items[only]].filter(Boolean)
  return { id: 'quick-burn-' + plan.mode, name: BURN_NAMES[plan.mode] || BURN_NAMES.home, color: 'orange', quick: true,
    ex: items.map(x => x.rx).filter(Boolean) }
}

/** The day's burn target: the saved calculator goal while it runs, else the last plan's, else 300. */
export function burnTarget(S, iso) {
  const g = S && S.calGoal
  if (g && g.exerciseKcal > 0 && g.from && iso >= g.from) {
    const end = new Date(new Date(g.from + 'T12:00:00').getTime() + (g.days - 1) * 864e5)
    if (iso <= isoOf(end)) return g.exerciseKcal
  }
  const b = S && S.burnPlan
  return b && b.target > 0 ? b.target : DEFAULT_BURN
}

/** The saved plan, rebuilt for today's weight (null when there is none). */
export function savedBurnPlan(S, kg) {
  const b = S && S.burnPlan
  if (!b || !b.mode || !Array.isArray(b.keys) || !b.keys.length) return null
  try { return buildBurnPlan({ mode: b.mode, keys: b.keys, target: b.target, kg }) } catch { return null }
}

export const burnPrefs = S => {
  const b = (S && S.burnPlan) || {}
  return {
    remind: !!b.remind, start: HHMM.test(b.start || '') ? b.start : '18:00',
    gap: GAPS.includes(b.gap) ? b.gap : 30, daily: b.daily !== false, from: b.from || null,
  }
}

const doneOn = (S, iso) => (S.workouts || []).some(w => w.d === iso && /^Calorie burn/.test(w.name || ''))

/** The reminders still to come: [{ id, nid, at, iso, idx (null = the whole session), plan }]. */
export function burnReminders(S, kg, now = new Date()) {
  const p = burnPrefs(S)
  if (!p.remind) return []
  const plan = savedBurnPlan(S, kg)
  if (!plan) return []
  const [hh, mm] = p.start.split(':').map(Number)
  const out = []
  for (let d = 0; d < BURN_DAYS; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hh, mm, 0, 0)
    const iso = isoOf(day)
    if (!p.daily && p.from && iso !== p.from) continue
    if (p.from && iso < p.from) continue
    if (doneOn(S, iso)) continue
    if (p.gap === 0) out.push({ id: BURN_ID_BASE + d * 10, nid: BURN_NID_BASE + d * 10, at: day, iso, idx: null, plan })
    else plan.items.forEach((x, i) => out.push({ id: BURN_ID_BASE + d * 10 + i, nid: BURN_NID_BASE + d * 10 + i,
      at: new Date(day.getTime() + i * p.gap * 60000), iso, idx: i, plan }))
  }
  return out.filter(x => x.at > now)
}

const n0 = v => Math.round(v).toLocaleString(dateLocale())

/** Title / body / big text and where Start goes, in the current language. */
export function burnReminderText(r) {
  const { plan, idx } = r
  if (idx === null) {
    const names = plan.items.map(x => t(x.name)).join(' · ')
    return {
      title: '🔥 ' + t('Calorie burn: {0} exercises', plan.items.length),
      body: t('{0} min · ≈ {1} kcal — time to move!', plan.minutes, n0(plan.kcal)),
      big: t('{0} min · ≈ {1} kcal — time to move!', plan.minutes, n0(plan.kcal)) + '\n' + names,
      start: '/burn/review?start=all',
    }
  }
  const x = plan.items[idx]
  return {
    title: '🔥 ' + t(x.name),
    body: t('{0} min · ≈ {1} kcal — time to move!', x.min, n0(x.kcal)),
    big: t('{0} min · ≈ {1} kcal — time to move!', x.min, n0(x.kcal)) + '\n' + t('Exercise {0} of {1} in today’s burn plan', idx + 1, plan.items.length),
    start: x.walk ? '/walk' : '/burn/review?start=' + idx,
  }
}

/** Fingerprint for re-scheduling. */
export const burnSignature = (S, kg, now = new Date()) => JSON.stringify([S && S.burnPlan, kg, isoOf(now), (S && S.workouts || []).slice(-2).map(w => w.d + (w.name || ''))])
