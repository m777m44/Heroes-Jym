// 7.0 — lift tools: what to load on the bar, and what a percentage of your max weighs.
// Pure functions; the sheet lives in components/workout/LiftTools.jsx.

export const PLATES = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5]
}
export const BARS = { kg: [20, 15, 10, 0], lb: [45, 35, 15, 0] }
// Competition colours (kg) — lb plates borrow the nearest kg colour.
export const PLATE_COLOR = { 25: '#FF453A', 20: '#0A84FF', 15: '#FFD60A', 10: '#30D158', 5: '#F2F2F7', 2.5: '#FF375F', 1.25: '#8E8E93', 45: '#0A84FF', 35: '#FFD60A' }

/**
 * Greedy per-side breakdown (exact for standard plate sets).
 * → { side: [plates…], total: weight actually loaded, rest: what could not be loaded }
 */
export function platesFor(target, bar = 20, unit = 'kg', avail = PLATES[unit] || PLATES.kg) {
  const tgt = Number(target)
  if (!isFinite(tgt) || tgt <= bar) return { side: [], total: Math.max(0, bar), rest: 0 }
  let left = Math.round(((tgt - bar) / 2) * 1000) / 1000
  const side = []
  for (const p of [...avail].sort((a, b) => b - a)) {
    while (left + 1e-9 >= p) { side.push(p); left = Math.round((left - p) * 1000) / 1000 }
  }
  const total = Math.round((bar + 2 * side.reduce((a, b) => a + b, 0)) * 100) / 100
  return { side, total, rest: Math.round((tgt - total) * 100) / 100 }
}

/** Collapse [20,20,5] → [{p:20,n:2},{p:5,n:1}] for a short text line. */
export function groupPlates(side) {
  const out = []
  side.forEach(p => { const g = out.find(x => x.p === p); g ? g.n++ : out.push({ p, n: 1 }) })
  return out
}

// Rough reps you can do at a %1RM (inverse Epley, capped) — a guide, not a promise.
export const PCTS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]
export function repsAtPct(pct) {
  if (pct >= 100) return 1
  return Math.max(1, Math.round(30 * (100 / pct - 1)))
}
/** Rounds to what can actually be loaded (2.5 kg / 5 lb steps by default). */
export function roundLoad(w, unit = 'kg') {
  const step = unit === 'lb' ? 5 : 2.5
  return Math.round(w / step) * step
}
export function pctTable(oneRm, unit = 'kg') {
  if (!(oneRm > 0)) return []
  return PCTS.map(p => ({ pct: p, w: roundLoad(oneRm * p / 100, unit), reps: repsAtPct(p) }))
}
