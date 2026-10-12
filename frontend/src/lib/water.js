// Daily water, in millilitres — S.waterMl = { 'YYYY-MM-DD': ml }, S.waterAt = { day: last change }.
//
// 2.4 counted 250 ml glasses in S.water / S.waterGoal; those are read transparently (× 250)
// until the day is next written, so nothing logged before is lost.
//
// What you drink from is a choice — a glass (كلاص), a cup (كوب), a can (علبة) or a bottle —
// and one tap adds one of it. The goal is in ml, with a recommendation from body weight.
//
// Reminders (S.waterRemind) fire every `every` minutes between `from` and `to`. On Android they
// are scheduled natively (WaterReminder.java), so they arrive with the app closed and carry
// today's live numbers; the slot and "what to do with it" rules below are mirrored there
// (WaterMath.java, unit-tested on both sides).
import { isoOf } from './format.js'

export const CONTAINERS = [
  { key: 'glass', ml: 200, icon: 'drop' },
  { key: 'cup', ml: 250, icon: 'drop' },
  { key: 'can', ml: 330, icon: 'drop' },
  { key: 'bottle', ml: 500, icon: 'drop' },
]
/** English names (t() keys) — singular and the "{0} …" count form. */
export const CONTAINER_NAME = { glass: 'Glass', cup: 'Cup', can: 'Can', bottle: 'Bottle' }
export const CONTAINER_COUNT = { glass: '{0} glasses', cup: '{0} cups', can: '{0} cans', bottle: '{0} bottles' }
export const containerOf = S => CONTAINERS.find(c => c.key === (S && S.waterUnit)) || CONTAINERS[1]

export const LEGACY_GLASS_ML = 250
export const GOALS_ML = [1500, 2000, 2500, 3000, 3500, 4000]
export const DEFAULT_GOAL_ML = 2000
export const MAX_ML_DAY = 8000
const KEEP = 400            // days of history kept

/** ~33 ml per kg of body weight, rounded to 250 ml, 1.5–4 l. */
export function recommendedMl(kg) {
  const w = Number(kg)
  if (!Number.isFinite(w) || w < 25 || w > 300) return DEFAULT_GOAL_ML
  return Math.max(1500, Math.min(4000, Math.round(w * 33 / 250) * 250))
}

export function waterGoalMlOf(S) {
  const g = Number(S && S.waterGoalMl)
  if (Number.isFinite(g) && g >= 500 && g <= 6000) return Math.round(g)
  const old = Number(S && S.waterGoal)                 // 2.4: glasses
  if ([6, 8, 10, 12].includes(old)) return old * LEGACY_GLASS_ML
  return DEFAULT_GOAL_ML
}

export function mlOn(S, iso) {
  const v = S && S.waterMl && S.waterMl[iso]
  if (v != null) return Math.max(0, Number(v) || 0)
  return Math.max(0, Number(S && S.water && S.water[iso]) || 0) * LEGACY_GLASS_ML
}
export const changedAt = (S, iso) => Number(S && S.waterAt && S.waterAt[iso]) || 0

/** Set a day's ml (clamped), dropping history older than KEEP days. Mutates s. */
export function setMl(s, iso, ml, at = Date.now()) {
  s.waterMl = { ...(s.waterMl || {}) }
  s.waterAt = { ...(s.waterAt || {}) }
  const v = Math.max(0, Math.min(MAX_ML_DAY, Math.round(Number(ml) || 0)))
  s.waterMl[iso] = v
  s.waterAt[iso] = at
  if (s.water && s.water[iso] != null) { s.water = { ...s.water }; delete s.water[iso] }
  const cut = new Date(iso + 'T12:00:00'); cut.setDate(cut.getDate() - KEEP)
  const cutIso = isoOf(cut)
  for (const k of Object.keys(s.waterMl)) if (k < cutIso) { delete s.waterMl[k]; delete s.waterAt[k] }
  if (s.water && Object.keys(s.water).some(k => k < cutIso)) {
    s.water = { ...s.water }
    for (const k of Object.keys(s.water)) if (k < cutIso) delete s.water[k]
  }
}
export const addMl = (s, iso, delta, at) => setMl(s, iso, mlOn(s, iso) + delta, at)

/** Merge days reported by the native store ({ iso: { ml, at } }): the later change wins. */
export function mergeNative(s, days) {
  let changed = false
  for (const [iso, d] of Object.entries(days || {})) {
    if (!/^\d{4}-\d\d-\d\d$/.test(iso) || !d) continue
    const at = Number(d.at) || 0
    if (at > changedAt(s, iso) && Math.round(Number(d.ml) || 0) !== mlOn(s, iso)) { setMl(s, iso, d.ml, at); changed = true }
  }
  return changed
}

/** How many of the chosen container `ml` is (rounded to a half). */
export const countIn = (ml, c) => Math.round((ml / c.ml) * 2) / 2

/** The last `n` days ending today: [{ iso, ml, dow }] oldest first. */
export function waterDays(S, today, n = 7) {
  const out = []
  const d = new Date(today + 'T12:00:00')
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d); x.setDate(d.getDate() - i)
    const iso = isoOf(x)
    out.push({ iso, ml: mlOn(S, iso), dow: x.getDay() })
  }
  return out
}

/** Days in a row (ending today, or yesterday while today isn't done yet) that met the goal. */
export function waterStreak(S, today) {
  const goal = waterGoalMlOf(S)
  const d = new Date(today + 'T12:00:00')
  if (mlOn(S, today) < goal) d.setDate(d.getDate() - 1)
  let n = 0
  while (n < 1000 && mlOn(S, isoOf(d)) >= goal) { n++; d.setDate(d.getDate() - 1) }
  return n
}

/** Average of the days with something logged in the last `n` days (0 when none). */
export function waterAverage(S, today, n = 7) {
  const ds = waterDays(S, today, n).filter(d => d.ml > 0)
  return ds.length ? Math.round(ds.reduce((a, d) => a + d.ml, 0) / ds.length) : 0
}

// ---- reminders ---------------------------------------------------------------------------

export const REMIND_EVERY = [60, 90, 120, 180]
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const minOf = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m }

export function waterRemindPrefs(S) {
  const r = (S && S.waterRemind) || {}
  let from = HHMM.test(r.from || '') ? r.from : '09:00'
  let to = HHMM.test(r.to || '') ? r.to : '22:00'
  if (minOf(to) <= minOf(from)) { from = '09:00'; to = '22:00' }
  // On by default (2.5): every 90 minutes, 09:00–22:00; switched off on the Water screen.
  return { on: r.on !== false, every: REMIND_EVERY.includes(r.every) ? r.every : 90, from, to, move: r.move !== false }
}

/** The reminder times on the day of `day` (local): from, from + every, … ≤ to. */
export function reminderSlots(p, day) {
  const out = []
  const base = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)
  for (let m = minOf(p.from); m <= minOf(p.to); m += p.every) out.push(new Date(base.getTime() + m * 60000))
  return out
}

/** The next reminder strictly after `now` (today's remaining slots, else tomorrow's first). */
export function nextReminder(p, now = new Date()) {
  if (!p.on) return null
  const next = reminderSlots(p, now).find(d => d.getTime() > now.getTime() + 30000)
  if (next) return next
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12)
  return reminderSlots(p, t)[0]
}

// ---- "drink, and move a little" ----------------------------------------------------------

/** Short moves that fit next to a glass of water — English t() keys, in rotation order. */
export const MOVES = [
  '10 bodyweight squats',
  '20 calf raises',
  'A 30-second plank',
  '10 push-ups (on your knees is fine)',
  '15 jumping jacks',
  'A 30-second wall sit',
  '10 lunges per leg',
  'Shoulder rolls and a neck stretch — 30 seconds',
  'March in place for 1 minute',
  'A 20-second chest-opener stretch',
  '10 glute bridges',
  '10 chair dips',
]

/**
 * What the reminder suggests, from the day so far:
 *  · sitting for an hour, or well behind the step pace for this time of day → a short walk
 *    ({ kind: 'walk', n: steps, min: minutes });
 *  · otherwise one of MOVES, rotating with the slot ({ kind: 'move', i }).
 * Mirrored in WaterMath.suggest (Java).
 */
export function suggestMove({ now = Date.now(), steps = 0, goal = 10000, lastStepAt = 0, from = '09:00', to = '22:00', slot = 0 } = {}) {
  const d = new Date(now)
  const mins = d.getHours() * 60 + d.getMinutes()
  const span = Math.max(60, minOf(to) - minOf(from))
  const frac = Math.max(0, Math.min(1, (mins - minOf(from)) / span))
  const behind = Math.round(goal * frac) - steps
  const sitting = lastStepAt > 0 && now - lastStepAt >= 60 * 60000
  if (steps < goal && (sitting || behind >= 1500)) {
    const n = Math.max(300, Math.min(1000, Math.round((behind > 0 ? behind : 500) / 100) * 100))
    return { kind: 'walk', n, min: Math.ceil(n / 100) }
  }
  return { kind: 'move', i: ((slot % MOVES.length) + MOVES.length) % MOVES.length }
}
