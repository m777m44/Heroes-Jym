// Heart-rate zones (8.0) — from age (and a resting pulse if you know it).
//
// Max HR: Tanaka (208 − 0.7 × age), better than the old 220 − age for adults. With a resting
// pulse the zones use the Karvonen method (a percentage of the heart-rate *reserve*), which
// fits fitter people better; without one, a plain percentage of max.

export const ZONES = [
  { z: 1, lo: 0.5, hi: 0.6, name: 'Warm-up', desc: 'Very light — warm-up, cool-down, recovery days', color: 'var(--grey)' },
  { z: 2, lo: 0.6, hi: 0.7, name: 'Fat burn', desc: 'Light — long easy cardio, builds the base', color: 'var(--blue)' },
  { z: 3, lo: 0.7, hi: 0.8, name: 'Cardio', desc: 'Moderate — better stamina and heart health', color: 'var(--green)' },
  { z: 4, lo: 0.8, hi: 0.9, name: 'Threshold', desc: 'Hard — faster for longer, intervals', color: 'var(--orange)' },
  { z: 5, lo: 0.9, hi: 1.0, name: 'Maximum', desc: 'All-out — short sprints only', color: 'var(--red)' },
]

export const maxHR = age => Math.round(208 - 0.7 * Math.max(10, Math.min(100, Number(age) || 30)))

/** [{ ...zone, from, to }] in beats per minute. */
export function zonesFor(age, rest) {
  const mx = maxHR(age)
  const r = Number(rest)
  const karvonen = r >= 30 && r <= 120 && r < mx - 20
  const bpm = f => Math.round(karvonen ? r + f * (mx - r) : f * mx)
  return ZONES.map(z => ({ ...z, from: bpm(z.lo), to: bpm(z.hi), karvonen }))
}

/** Which zone a pulse is in (null under zone 1). */
export function zoneOf(bpm, zones) {
  const b = Number(bpm)
  if (!b) return null
  for (let i = zones.length - 1; i >= 0; i--) if (b >= zones[i].from) return zones[i]
  return null
}

/** Age in whole years from an ISO birth date (or a number already), else null. */
export function ageOf(v, now = new Date()) {
  if (typeof v === 'number') return v > 0 ? Math.round(v) : null
  const d = new Date(v)
  if (!v || isNaN(d)) return null
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a > 0 && a < 120 ? a : null
}
