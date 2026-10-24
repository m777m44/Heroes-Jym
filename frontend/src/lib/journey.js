// 11.0 — "From Zakho to Fao": every step you have counted, walked across Iraq — from Zakho in the
// far north, through Mosul, Erbil, Kirkuk, Baghdad, Babylon, Karbala, Najaf and Nasiriyah, to Basra
// and Fao on the Gulf (about 1,360 km by road). Then it starts again (lap 2…).
// Pure (no store, no DOM). Card: views/Walking.jsx (JourneyCard).
import { strideMeters, distanceKm } from './stepMetrics.js'

// [city (a t() key), km from the previous stop by road (rounded), longitude, latitude]
export const IRAQ_ROUTE = [
  ['Zakho', 0, 42.68, 37.14], ['Duhok', 60, 42.99, 36.87], ['Mosul', 75, 43.13, 36.34], ['Erbil', 85, 44.01, 36.19],
  ['Kirkuk', 95, 44.39, 35.47], ['Tikrit', 115, 43.68, 34.6], ['Samarra', 60, 43.87, 34.2], ['Baghdad', 125, 44.37, 33.31],
  ['Babylon', 85, 44.42, 32.54], ['Karbala', 45, 44.02, 32.62], ['Najaf', 80, 44.34, 32.0], ['Diwaniyah', 60, 44.93, 31.99],
  ['Samawah', 110, 45.29, 31.32], ['Nasiriyah', 100, 46.26, 31.06], ['Basra', 170, 47.78, 30.51], ['Fao', 95, 48.47, 29.98],
].map(([name, leg, lon, lat], i, all) => ({ i, name, leg, lon, lat, at: all.slice(0, i + 1).reduce((a, x) => a + x[1], 0) }))
export const ROUTE_KM = IRAQ_ROUTE[IRAQ_ROUTE.length - 1].at

/** Every step in the history (S.steps — two years are kept). */
export const totalSteps = S => Object.values((S && S.steps) || {}).reduce((a, v) => a + (Math.max(0, Number(v && typeof v === 'object' ? v.n : v)) || 0), 0)

/**
 * Where `km` walked puts you on the road: { km, lap (1 on the first trip), at (km on this trip),
 * pct (of this trip), last (the stop you passed), next (the stop ahead, null at Fao), toGo (km to it),
 * passed (stops reached on this trip) }.
 */
export function journeyOf(km) {
  const total = Math.max(0, +km || 0)
  const lap = Math.floor(total / ROUTE_KM) + 1
  const at = total - (lap - 1) * ROUTE_KM
  let last = IRAQ_ROUTE[0]
  for (const s of IRAQ_ROUTE) if (s.at <= at) last = s
  const next = IRAQ_ROUTE[last.i + 1] || null
  return { km: total, lap, at, pct: at / ROUTE_KM, last, next, toGo: next ? next.at - at : 0, passed: last.i + 1 }
}

/** The journey of a profile: total steps × stride. */
export function journeyFor(S) {
  const steps = totalSteps(S)
  return { steps, ...journeyOf(distanceKm(steps, strideMeters(S))) }
}

// a simple map: longitude / latitude → a 100 × 140 box (north up)
const X0 = 42.2, X1 = 48.9, Y0 = 37.5, Y1 = 29.6
export const mapXY = s => [Math.round((s.lon - X0) / (X1 - X0) * 1000) / 10, Math.round((Y0 - s.lat) / (Y0 - Y1) * 1400) / 10]
/** The point `at` km along the road, on the map. */
export function pointAt(at) {
  const a = Math.max(0, Math.min(ROUTE_KM, +at || 0))
  const j = journeyOf(a >= ROUTE_KM ? ROUTE_KM - 1e-9 : a)
  const p = mapXY(j.last)
  if (!j.next) return p
  const q = mapXY(j.next), k = (a - j.last.at) / Math.max(1, j.next.leg)
  return [Math.round((p[0] + (q[0] - p[0]) * k) * 10) / 10, Math.round((p[1] + (q[1] - p[1]) * k) * 10) / 10]
}
