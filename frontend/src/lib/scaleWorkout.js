// 4.1 — today's workout, linked to the scale. Your latest weigh-in is compared with your ideal
// weight (lib/idealBody.js) and your target weight, and that decides how hard today should be:
//
//   goal      lose / gain / keep — from the ideal-body screen when your height is known (inside
//             the ideal band = keep), else ±2 kg around your target weight
//   urgency   how far you still are: > 15 kg high, > 5 kg medium, otherwise low (keep = low)
//   energy    how you feel today (S.energy[iso] = 'low' | 'high'; normal when unset)
//   intensity very low … high: the day's kind of training, one step up when there is a lot to
//             lose, one step down / up with your energy
//   sets      fat-loss days at home get +1 set per exercise when urgency is high; low energy −1,
//             high energy +1 (never on recovery days or your own routines; 2–5 sets)
//   reason    one sentence saying why — and a nudge to weigh in when the last one is over a
//             week old
//
// Pure: no store, no clock other than the arguments. Texts are English t() keys + arguments.
import { idealBodyOf } from './idealBody.js'

const KG_PER_LB = 0.45359237
export const ENERGY = ['low', 'normal', 'high']
export const INTENSITY = ['very_low', 'low', 'medium', 'high']
export const INTENSITY_LABEL = { very_low: 'Intensity: very light', low: 'Intensity: light', medium: 'Intensity: moderate', high: 'Intensity: hard' }
export const STALE_DAYS = 7

const r1 = x => Math.round(x * 10) / 10
const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const dayMs = iso => new Date(iso + 'T12:00:00').getTime()

/** The latest weigh-in on or before `iso`: { kg, d } or null. */
export function weighInOn(S, iso) {
  const kgOf = w => (S && S.unit === 'lb' ? w * KG_PER_LB : w)
  let best = null
  for (const e of (S && S.bodyweight) || []) {
    if (!e || !(e.w > 0) || !e.d || e.d > iso) continue
    if (!best || e.d >= best.d) best = e
  }
  return best ? { kg: r1(kgOf(best.w)), d: best.d } : null
}

/** How you stand against the scale on `iso` (null with no weigh-in yet). */
export function scaleStatus(S, iso) {
  const w = weighInOn(S, iso)
  if (!w) return null
  const r = idealBodyOf(S || {})
  const ideal = r && Number.isFinite(r.ideal) ? r.ideal : null
  const tw = Number(S && S.targetW)
  const target = tw > 0 ? r1(S.unit === 'lb' ? tw * KG_PER_LB : tw) : null
  const toIdeal = ideal != null ? r1(w.kg - ideal) : null          // + to lose, − to gain
  const toTarget = target != null ? r1(w.kg - target) : null
  let goal = null
  if (ideal != null && r.goal) goal = r.goal
  else if (toTarget != null) goal = toTarget > 2 ? 'lose' : toTarget < -2 ? 'gain' : 'keep'
  const gap = Math.max(toIdeal != null ? Math.abs(toIdeal) : 0, toTarget != null ? Math.abs(toTarget) : 0)
  const urgency = !goal ? null : goal === 'keep' ? 'low' : gap > 15 ? 'high' : gap > 5 ? 'medium' : 'low'
  const ago = Math.max(0, Math.round((dayMs(iso) - dayMs(w.d)) / 864e5))
  return { kg: w.kg, d: w.d, ago, stale: ago > STALE_DAYS, ideal, target, toIdeal, toTarget, gap: r1(gap), goal, urgency }
}

/** Today's energy: 'low' | 'normal' | 'high'. */
export const energyOn = (S, iso) => {
  const v = S && S.energy && S.energy[iso]
  return v === 'low' || v === 'high' ? v : 'normal'
}

/** Set (or clear, with 'normal') today's energy — keeps only the last 30 days. Mutates `s`. */
export function setEnergy(s, iso, v) {
  const e = { ...(s.energy || {}) }
  if (v === 'low' || v === 'high') e[iso] = v; else delete e[iso]
  const keys = Object.keys(e).sort()
  for (const k of keys.slice(0, Math.max(0, keys.length - 30))) delete e[k]
  s.energy = e
}

const BASE = { recover: 0, walk: 1, walk2: 1, full: 3, hiit: 3 }
/** 'very_low' … 'high' for a day of `kind`. */
export function intensityFor(kind, urgency, energy) {
  let x = BASE[kind] ?? 2
  if (urgency === 'high' && kind !== 'recover') x += 1
  if (energy === 'low') x -= 1
  if (energy === 'high' && kind !== 'recover') x += 1
  return INTENSITY[clamp(x, 0, 3)]
}

/** −1 / 0 / +1 sets per exercise. */
export function setDelta({ kind, gym, urgency, energy, goal }) {
  if (kind === 'recover' || kind === 'routine') return 0
  let d = 0
  if (urgency === 'high' && goal === 'lose' && !gym) d += 1
  if (energy === 'low') d -= 1
  if (energy === 'high') d += 1
  return clamp(d, -1, 1)
}

/** Why today looks like this: [{ key, args }] (one or two sentences). */
export function scaleReasons(st) {
  if (!st) return [{ key: 'Weigh yourself to get a workout matched to your scale.', args: [] }]
  const out = []
  const kg = v => Math.abs(v).toFixed(1)
  if (st.goal === 'lose') out.push(st.toIdeal != null && st.toIdeal > 0
    ? { key: 'You are {0} kg above your ideal weight — today is built to burn more calories.', args: [kg(st.toIdeal)] }
    : { key: 'You are {0} kg above your target weight — today is built to burn more calories.', args: [kg(st.toTarget)] })
  else if (st.goal === 'gain') out.push(st.toIdeal != null && st.toIdeal < 0
    ? { key: 'You are {0} kg below your ideal weight — today builds muscle the healthy way.', args: [kg(st.toIdeal)] }
    : { key: 'You are {0} kg below your target weight — today builds muscle the healthy way.', args: [kg(st.toTarget)] })
  else if (st.goal === 'keep') out.push({ key: 'You are in your healthy range — today keeps you fit and balanced.', args: [] })
  else out.push({ key: 'Add your height or a target weight so the plan knows where you’re heading.', args: [] })
  if (st.stale) out.push({ key: 'Your last weigh-in was {0} days ago — step on the scale for a sharper plan.', args: [String(st.ago)] })
  return out
}
