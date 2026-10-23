// 7.2 — the workout timer: the start countdown, the live clock and the calories a session
// burns. Pure functions (no store) so the numbers are unit-tested.
//
// Calories use the MET method from the Compendium of Physical Activities, with YOUR weight:
//   kcal = MET × 3.5 × kg ÷ 200 × minutes
// Resistance training is MET 5.0 (code 02054 — "moderate effort"); a session with cardio in
// it is weighted toward the cardio MET for the share of exercises that are cardio.
import { bodyKg } from './water.js'

/** 3 · 2 · 1 · GO — each step's length in ms. */
export const COUNTDOWN = [3, 2, 1, 0]
export const COUNT_STEP_MS = 850

export const MET_LIFT = 5.0
export const MET_CARDIO = 7.0
const MAX_MS = 4 * 3600 * 1000            // a forgotten session stops counting after 4 h

/** "4:07", "12:30", "1:02:09". Negative or bad input reads 0:00. */
export function fmtClock(ms) {
  const s = Math.max(0, Math.floor((Number(ms) || 0) / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const pad = n => String(n).padStart(2, '0')
  return h > 0 ? h + ':' + pad(m) + ':' + pad(sec) : m + ':' + pad(sec)
}

/** Milliseconds a session (active or finished) has run, capped at 4 h. */
export function sessionMs(w, now = Date.now()) {
  if (!w || !(w.start > 0)) return 0
  const end = w.end > 0 ? w.end : now
  return Math.min(MAX_MS, Math.max(0, end - w.start))
}

/** The MET for a session: the lifting MET, nudged toward cardio by the share of cardio entries. */
export function sessionMet(w, isCardio = () => false) {
  const list = (w && w.entries) || []
  if (!list.length) return MET_LIFT
  const share = list.filter(e => isCardio(e)).length / list.length
  return Math.round((MET_LIFT + (MET_CARDIO - MET_LIFT) * share) * 10) / 10
}

/** kcal burned by a session for a body of `kg` (70 kg when unknown). */
export function sessionKcal(w, kg, { now = Date.now(), isCardio } = {}) {
  const min = sessionMs(w, now) / 60000
  const body = kg > 0 ? kg : 70
  return Math.round(sessionMet(w, isCardio) * 3.5 * body / 200 * min)
}

/** Same, with the weight read from the body-weight log. */
export const sessionKcalFor = (S, w, opts) => sessionKcal(w, bodyKg(S), opts)

/** Every workout finished on `iso` plus the one running now: total kcal. */
export function workoutKcalOn(S, iso, now = Date.now(), isCardio) {
  let k = 0
  for (const w of (S && S.workouts) || []) if (w.d === iso) k += sessionKcalFor(S, w, { now, isCardio })
  const A = S && S.active
  if (A && A.d === iso) k += sessionKcalFor(S, A, { now, isCardio })
  return k
}

/** Sets done / total of a session, and the 0–1 share. */
export function setsProgress(A) {
  let done = 0, total = 0
  for (const e of (A && A.entries) || []) for (const s of e.sets || []) { total++; if (s.done) done++ }
  return { done, total, pct: total ? done / total : 0 }
}
