// Body-weight analysis for the weight page — verification, comparison, trend, goal and BMI.
//
// The weigh-ins themselves stay exactly where openGym always kept them (S.bodyweight:
// [{ d: 'YYYY-MM-DD', w, t, p? }] sorted by date, in the profile's unit). `p: true` marks an
// entry that has a photo of the scale on the device it was logged on — the "verified" badge.
// Photos are never synced (see photoStore.js); only that flag is.
//
// Pure functions only, so the numbers on screen are the numbers under test.

const KG_PER_LB = 0.45359237
export const toKg = (w, unit) => (unit === 'lb' ? w * KG_PER_LB : w)
export const fromKg = (kg, unit) => (unit === 'lb' ? kg / KG_PER_LB : kg)
const r1 = x => Math.round(x * 10) / 10
const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000)

/** Plausible human body weight, in kg. Outside it the number is almost certainly a typo. */
export const SANE_KG = [20, 350]

/** The weigh-in logged before `iso` (not on it), or null. */
export function previousEntry(history, iso) {
  let prev = null
  for (const b of history || []) { if (b.d < iso) prev = b; else break }
  return prev
}

/**
 * Check a weigh-in before it is saved. Real weight moves slowly — a couple of kilos a day is
 * already water and food — so a bigger jump is far more likely a typo, the wrong unit or
 * someone else on the scale. Returns null when it looks fine, else what looks off:
 *   { kind: 'range' }                                   outside SANE_KG
 *   { kind: 'jump', delta, days, prev }                 more change than `days` allow
 * The caller asks for confirmation; nothing is ever refused.
 */
export function validateWeighIn(history, w, iso, unit = 'kg') {
  const kg = toKg(w, unit)
  if (!Number.isFinite(kg) || kg < SANE_KG[0] || kg > SANE_KG[1]) return { kind: 'range' }
  const prev = previousEntry(history, iso)
  if (!prev) return null
  const days = Math.max(1, dayDiff(prev.d, iso))
  const deltaKg = kg - toKg(prev.w, unit)
  // 2 kg (or 3 %) for one day, growing with the gap but capped — a month apart may differ a lot
  const allowed = Math.max(Math.min(12, 2 + 0.35 * (days - 1)), 0.03 * toKg(prev.w, unit))
  if (Math.abs(deltaKg) <= allowed) return null
  return { kind: 'jump', delta: r1(w - prev.w), days, prev }
}

/** Current vs previous weigh-in: { current, previous, delta } (delta null with < 2 entries). */
export function compareLatest(history) {
  const h = history || []
  const current = h.length ? h[h.length - 1] : null
  const previous = h.length > 1 ? h[h.length - 2] : null
  return { current, previous, delta: current && previous ? r1(current.w - previous.w) : null }
}

/** Change since the first weigh-in. */
export function totalChange(history) {
  const h = history || []
  return h.length > 1 ? { from: h[0], delta: r1(h[h.length - 1].w - h[0].w), days: dayDiff(h[0].d, h[h.length - 1].d) } : null
}

/**
 * How far along the way from `start` to `target` the `current` weight is, 0…1. Works for
 * cutting and for gaining; moving the wrong way reads 0, overshooting reads 1.
 */
export function goalProgress(start, current, target) {
  if (![start, current, target].every(Number.isFinite)) return null
  const span = target - start
  if (Math.abs(span) < 0.05) return Math.abs(current - target) < 0.05 ? 1 : 0
  return Math.max(0, Math.min(1, (current - start) / span))
}

/** Where a goal journey started: the weight when the goal was set, else the first weigh-in. */
export function goalStart(S) {
  if (S && Number.isFinite(S.targetFrom)) return S.targetFrom
  const h = (S && S.bodyweight) || []
  return h.length ? h[0].w : null
}

/**
 * Trend in unit/week — the least-squares slope over the weigh-ins in the last `days` days
 * (ending at the latest entry). A slope is steadier than "this week vs last week", which
 * swings with every glass of water. Null without enough data to mean anything.
 */
export function weeklyRate(history, days = 28) {
  const h = history || []
  if (h.length < 2) return null
  const end = h[h.length - 1].d
  const pts = h.filter(b => dayDiff(b.d, end) <= days).map(b => [-dayDiff(b.d, end), b.w])
  if (pts.length < 2 || pts[pts.length - 1][0] - pts[0][0] < 3) return null
  const n = pts.length
  const mx = pts.reduce((a, p) => a + p[0], 0) / n
  const my = pts.reduce((a, p) => a + p[1], 0) / n
  let num = 0, den = 0
  for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) ** 2 }
  return den ? Math.round(num / den * 7 * 100) / 100 : null
}

/**
 * Date the goal is reached at the current trend, as an ISO day — or null when the trend
 * points away from it, is too flat to say (|rate| < 0.05/week) or is over two years out.
 */
export function etaToGoal(history, target) {
  const h = history || []
  if (!h.length || !Number.isFinite(target)) return null
  const rate = weeklyRate(h)
  const last = h[h.length - 1]
  const left = target - last.w
  if (Math.abs(left) < 0.05) return last.d
  if (!rate || Math.abs(rate) < 0.05 || Math.sign(rate) !== Math.sign(left)) return null
  const days = Math.ceil(left / rate * 7)
  if (days > 730) return null
  const d = new Date(last.d + 'T12:00:00'); d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 7-day trailing average per weigh-in — smooths the daily noise for the comparison view. */
export function movingAverage(history, days = 7) {
  const h = history || []
  return h.map(b => {
    const win = h.filter(x => x.d <= b.d && dayDiff(x.d, b.d) < days)
    return { d: b.d, w: r1(win.reduce((a, x) => a + x.w, 0) / win.length) }
  })
}

export function bmi(w, unit, heightCm) {
  if (!Number.isFinite(w) || !Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) return null
  const m = heightCm / 100
  return r1(toKg(w, unit) / (m * m))
}
export function bmiCategory(v) {
  if (!Number.isFinite(v)) return null
  return v < 18.5 ? 'under' : v < 25 ? 'normal' : v < 30 ? 'over' : 'obese'
}
