// Walking numbers derived from a step count — distance, calories, speed, milestones, streaks.
//
// Everything here is a pure function of the state, so the walking screen, the Home card,
// the notification text and the tests all read the same numbers.
//
// State shape (lives in the synced profile state S, like body weight):
//   S.stepGoal  — daily target, default 10 000
//   S.steps     — { 'YYYY-MM-DD': { n: steps, ms: active walking time } }
//   S.walk      — preferences, see WALK_DEFAULTS
//   S.steps[d].h — optional steps per hour [24], kept for the last KEEP_HOURLY_DAYS days
//   S.heightCm  — optional; gives a better stride estimate (and BMI on the weight page)
import { isoOf } from './format.js'

export const DEFAULT_GOAL = 10000
export const GOAL_SUGGESTIONS = [5000, 7500, 10000, 12500, 15000, 20000]
export const GOAL_MIN = 500
export const GOAL_MAX = 100000
export const MILESTONE = 1000
export const DEFAULT_STRIDE_CM = 75
export const KEEP_DAYS = 730            // step history older than two years is pruned

export const WALK_DEFAULTS = {
  strideCm: null,     // null = estimate from height, else DEFAULT_STRIDE_CM
  notify: true,       // persistent "steps today" notification while counting
  haptics: true,      // vibrate every MILESTONE steps
  celebrate: true,    // the 5-second celebration on milestones and the goal
  gps: false,         // GPS speed (more accurate outdoors) — off: location is opt-in
  voice: false,       // spoken encouragement every 1,000 steps and at the goal (Android app)
  alertSound: true,   // milestone alerts make a sound (also needs the app's Sounds switch)
}
export const walkPrefs = S => ({ ...WALK_DEFAULTS, ...(S && S.walk) })

/** A goal typed by hand: a whole number of steps, rounded to 100, within sane bounds. */
export function clampGoal(n) {
  const x = Number(n)
  if (!Number.isFinite(x) || x <= 0) return DEFAULT_GOAL
  return Math.max(GOAL_MIN, Math.min(GOAL_MAX, Math.round(x / 100) * 100))
}
export const goalOf = S => (S && Number.isFinite(S.stepGoal) && S.stepGoal > 0 ? S.stepGoal : DEFAULT_GOAL)

/** Stride length in metres: set by hand, else ~41.5 % of height, else 75 cm. */
export function strideMeters(S) {
  const p = walkPrefs(S)
  if (Number.isFinite(p.strideCm) && p.strideCm >= 30 && p.strideCm <= 150) return p.strideCm / 100
  if (S && Number.isFinite(S.heightCm) && S.heightCm >= 100 && S.heightCm <= 250) return Math.round(S.heightCm * 0.415) / 100
  return DEFAULT_STRIDE_CM / 100
}

export const distanceKm = (steps, strideM) => Math.max(0, steps || 0) * (strideM || DEFAULT_STRIDE_CM / 100) / 1000

/**
 * Estimated kcal for a walk. Walking costs roughly 0.53 kcal per kg of body weight per km
 * (ACSM walking equation at an everyday 4–5 km/h). Without a logged weight a 70 kg walker is
 * assumed, which lands on the familiar "~0.04 kcal a step" rule of thumb.
 */
export function caloriesFor(steps, { strideM, weight, unit = 'kg' } = {}) {
  const kg = Number.isFinite(weight) && weight > 0 ? (unit === 'lb' ? weight * 0.45359237 : weight) : 70
  return Math.round(distanceKm(steps, strideM) * kg * 0.53)
}

/**
 * Speed from recent step timing. `samples` are { t: ms, steps: cumulative } in time order.
 * Uses the last `windowMs` of samples; reads 0 once no step has arrived for `idleMs`.
 */
export function speedKmh(samples, now, strideM, { windowMs = 10000, idleMs = 4000 } = {}) {
  if (!samples || samples.length < 2) return 0
  const last = samples[samples.length - 1]
  if (now - last.t > idleMs) return 0
  const from = samples.find(s => s.t >= last.t - windowMs) || samples[0]
  const dt = (last.t - from.t) / 1000
  if (dt < 1.5) return 0
  const v = (last.steps - from.steps) * strideM / dt * 3.6
  return Math.max(0, Math.min(25, Math.round(v * 10) / 10))
}

/** iOS reports pace in seconds per metre; 0 or missing means "not moving". */
export const paceToKmh = pace => (Number.isFinite(pace) && pace > 0 ? Math.min(25, Math.round(36 / pace) / 10) : 0)

/** The highest multiple of `every` passed going from `prev` to `next` steps, or 0. */
export function crossedMilestone(prev, next, every = MILESTONE) {
  if (!(next > prev) || every <= 0) return 0
  const m = Math.floor(next / every) * every
  return m > prev && m > 0 ? m : 0
}
export const reachedGoal = (prev, next, goal) => prev < goal && next >= goal

export const stepsOn = (S, iso) => (S && S.steps && S.steps[iso] && S.steps[iso].n) || 0
export const activeMsOn = (S, iso) => (S && S.steps && S.steps[iso] && S.steps[iso].ms) || 0

const daysBack = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - n); return isoOf(d) }

/** The last `days` days ending on `today`, oldest first: [{ d, n, ms }]. */
export function lastDays(S, today, days = 7) {
  const out = []
  for (let i = days - 1; i >= 0; i--) { const d = daysBack(today, i); out.push({ d, n: stepsOn(S, d), ms: activeMsOn(S, d) }) }
  return out
}

/**
 * Consecutive days the goal was met, ending today — or ending yesterday while today is
 * still in progress, so the streak doesn't read 0 every morning.
 */
export function stepStreak(S, today) {
  const goal = goalOf(S)
  let i = stepsOn(S, today) >= goal ? 0 : 1
  let n = 0
  while (n < 3660 && stepsOn(S, daysBack(today, i)) >= goal) { n++; i++ }
  return n
}

export function weekSummary(S, today) {
  const days = lastDays(S, today, 7)
  const total = days.reduce((a, d) => a + d.n, 0)
  const counted = days.filter(d => d.n > 0).length
  return { days, total, avg: counted ? Math.round(total / counted) : 0, hit: days.filter(d => d.n >= goalOf(S)).length }
}

export function bestDay(S) {
  let best = null
  for (const [d, v] of Object.entries((S && S.steps) || {})) if (v && v.n > 0 && (!best || v.n > best.n)) best = { d, n: v.n }
  return best
}

/**
 * Add steps (and active time) to a day, in place on a state draft. With `hour` (0–23) the steps
 * are also filed in that hour's bucket (S.steps[iso].h), which the "today by hour" chart reads.
 */
export function addSteps(s, iso, n, ms = 0, hour = null) {
  if (!(n > 0) && !(ms > 0)) return
  if (!s.steps || typeof s.steps !== 'object') s.steps = {}
  const day = s.steps[iso] || (s.steps[iso] = { n: 0, ms: 0 })
  day.n = Math.round((day.n || 0) + Math.max(0, n || 0))
  day.ms = Math.round((day.ms || 0) + Math.max(0, ms || 0))
  if (Number.isInteger(hour) && hour >= 0 && hour < 24 && n > 0) {
    const h = Array.isArray(day.h) && day.h.length === 24 ? day.h : (day.h = new Array(24).fill(0))
    h[hour] = Math.round((h[hour] || 0) + n)
  }
}

export const hourlyOn = (S, iso) => {
  const h = S && S.steps && S.steps[iso] && S.steps[iso].h
  return Array.isArray(h) && h.length === 24 ? h : new Array(24).fill(0)
}

/**
 * Merge a whole day as reported by the native step counter ({ n, ms, h[24] }) — raising the
 * count, the active time and each hour, never lowering anything already recorded (the day may
 * also hold steps counted elsewhere, e.g. imported or from the browser). Returns the steps added.
 */
export function mergeDay(s, iso, rep) {
  if (!rep || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 0
  if (!s.steps || typeof s.steps !== 'object') s.steps = {}
  const n = Math.max(0, Math.round(Number(rep.n ?? rep.steps) || 0))
  const ms = Math.max(0, Math.round(Number(rep.ms ?? rep.activeMs) || 0))
  const before = stepsOn(s, iso)
  if (n > before) addSteps(s, iso, n - before)
  if (ms > activeMsOn(s, iso)) {
    if (!s.steps) s.steps = {}
    const day = s.steps[iso] || (s.steps[iso] = { n: 0, ms: 0 })
    day.ms = ms
  }
  const hr = rep.h || rep.hourly
  if (Array.isArray(hr) && hr.length === 24 && hr.some(v => v > 0)) {
    const day = s.steps[iso] || (s.steps[iso] = { n: 0, ms: 0 })
    const h = Array.isArray(day.h) && day.h.length === 24 ? day.h : (day.h = new Array(24).fill(0))
    for (let i = 0; i < 24; i++) { const v = Math.round(Number(hr[i]) || 0); if (v > h[i]) h[i] = v }
  }
  return Math.max(0, stepsOn(s, iso) - before)
}

/**
 * Raise a day to at least `n` steps — for a sensor that reports the whole day's total
 * (iOS Core Motion history) rather than a delta. Never lowers what is already there.
 */
export function raiseSteps(s, iso, n) {
  if (!(n > stepsOn(s, iso))) return 0
  const add = Math.round(n - stepsOn(s, iso))
  addSteps(s, iso, add)
  return add
}

export const KEEP_HOURLY_DAYS = 14   // hourly buckets are only kept for the last two weeks

export function pruneSteps(s, today, keep = KEEP_DAYS) {
  if (!s.steps) return
  const cut = daysBack(today, keep)
  const cutH = daysBack(today, KEEP_HOURLY_DAYS)
  for (const d of Object.keys(s.steps)) {
    if (d < cut) delete s.steps[d]
    else if (d < cutH && s.steps[d] && s.steps[d].h) delete s.steps[d].h
  }
}
