// Daily water: glasses per day in S.water = { 'YYYY-MM-DD': n }, goal in S.waterGoal.
// Pure functions — the card writes through useStore.update.
import { isoOf } from './format.js'

export const GLASS_ML = 250
export const WATER_GOALS = [6, 8, 10, 12]
export const MAX_GLASSES = 30
const KEEP = 400            // days of history kept

export const waterGoalOf = S => { const g = Number(S && S.waterGoal); return WATER_GOALS.includes(g) ? g : 8 }
export const glassesOn = (S, iso) => Math.max(0, Number(S && S.water && S.water[iso]) || 0)

/** Set a day's glasses (clamped), dropping zeros and history older than KEEP days. Mutates s. */
export function setGlasses(s, iso, n) {
  s.water = { ...(s.water || {}) }
  const v = Math.max(0, Math.min(MAX_GLASSES, Math.round(Number(n) || 0)))
  if (v) s.water[iso] = v
  else delete s.water[iso]
  const cut = new Date(iso + 'T12:00:00'); cut.setDate(cut.getDate() - KEEP)
  const cutIso = isoOf(cut)
  for (const k of Object.keys(s.water)) if (k < cutIso) delete s.water[k]
}

/** The last `n` days ending today: [{ iso, n }] oldest first. */
export function waterDays(S, today, n = 7) {
  const out = []
  const d = new Date(today + 'T12:00:00')
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d); x.setDate(d.getDate() - i)
    const iso = isoOf(x)
    out.push({ iso, n: glassesOn(S, iso), dow: x.getDay() })
  }
  return out
}

/** Days in a row (ending today, or yesterday while today isn't done yet) that met the goal. */
export function waterStreak(S, today) {
  const goal = waterGoalOf(S)
  const d = new Date(today + 'T12:00:00')
  if (glassesOn(S, today) < goal) d.setDate(d.getDate() - 1)
  let n = 0
  while (n < 1000 && glassesOn(S, isoOf(d)) >= goal) { n++; d.setDate(d.getDate() - 1) }
  return n
}
