// Muscle recovery (8.0): how ready each muscle is for its next hard session, from the sets of
// the last few days.
//
// Each finished workout leaves fatigue on the muscles it trained (effective sets, as on every
// muscle map — lib/muscles.js). That fatigue wears off over the muscle's recovery time — about
// two days for most, longer for the big leg and back muscles, shorter for calves, forearms and
// abs — and longer again after a big session. Several workouts combine. The result is a
// percentage per muscle, a time when it's ready again, and the routine that fits best today.
// A guide from typical recovery times, not a measurement.

import { MUSCLES, loadOfWorkouts } from './muscles.js'

export const BASE_H = {
  trapezius: 36, deltoids: 42, chest: 48, 'upper-back': 48, serratus: 30,
  biceps: 36, triceps: 36, forearm: 24,
  abs: 24, obliques: 24, 'lower-back': 60,
  gluteal: 60, quadriceps: 60, hamstring: 60, adductors: 48, 'hip-flexors': 36,
  calves: 24, tibialis: 24,
}

const HOUR = 3600000
export const WINDOW_DAYS = 5

/** When a workout happened (ms): its end, else its start, else noon on its date. */
export function workoutTime(w) {
  if (!w) return 0
  if (Number(w.end) > 0) return Number(w.end)
  if (Number(w.start) > 0) return Number(w.start)
  const t = Date.parse((w.d || '') + 'T12:00:00')
  return Number.isFinite(t) ? t : 0
}

/** Hours a muscle needs after `sets` effective sets: 3 sets ≈ 0.9×, 6 ≈ 1.2×, 10+ ≈ 1.5×. */
export const needHours = (muscle, sets) => (BASE_H[muscle] || 48) * Math.max(0.7, Math.min(1.5, 0.6 + 0.1 * sets))

/**
 * { [muscle]: { pct 0…100, readyAt ms|0, lastAt ms|0, sets } } for every drawable muscle.
 * Untrained in the window → 100 %.
 */
export function recoveryOf(workouts = [], now = Date.now()) {
  const since = now - WINDOW_DAYS * 24 * HOUR
  const recent = (workouts || []).map(w => ({ w, at: workoutTime(w) })).filter(x => x.at > since && x.at <= now + 60000)
  const fresh = {}
  MUSCLES.forEach(m => { fresh[m] = { pct: 100, readyAt: 0, lastAt: 0, sets: 0 } })
  const rest = {}                         // product of (1 − fatigue) per muscle
  recent.forEach(({ w, at }) => {
    const load = loadOfWorkouts([w])
    for (const m in load) {
      if (!fresh[m] || !(load[m] > 0)) continue
      const need = needHours(m, load[m])
      const elapsed = (now - at) / HOUR
      const fatigue = Math.max(0, 1 - elapsed / need)
      rest[m] = (rest[m] ?? 1) * (1 - fatigue)
      fresh[m].lastAt = Math.max(fresh[m].lastAt, at)
      fresh[m].sets += load[m]
      if (fatigue > 0) fresh[m].readyAt = Math.max(fresh[m].readyAt, at + need * HOUR)
    }
  })
  for (const m in rest) fresh[m].pct = Math.round(rest[m] * 100)
  for (const m in fresh) fresh[m].sets = Math.round(fresh[m].sets * 10) / 10
  return fresh
}

/** Map shading: 0 = ready (no colour) … 4 = just trained. */
export function recoveryLevels(rec) {
  const lv = {}
  MUSCLES.forEach(m => {
    const p = rec[m] ? rec[m].pct : 100
    lv[m] = p >= 95 ? 0 : p >= 75 ? 1 : p >= 50 ? 2 : p >= 25 ? 3 : 4
  })
  return lv
}

/** Average readiness over the muscles trained in the window (100 when none were). */
export function overallReadiness(rec) {
  const trained = MUSCLES.filter(m => rec[m] && rec[m].lastAt)
  if (!trained.length) return 100
  return Math.round(trained.reduce((a, m) => a + rec[m].pct, 0) / trained.length)
}

/** Muscles still recovering (lowest first) and those ready that were trained recently. */
export function splitReady(rec) {
  const recovering = MUSCLES.filter(m => rec[m].pct < 95).sort((a, b) => rec[a].pct - rec[b].pct)
  const ready = MUSCLES.filter(m => rec[m].pct >= 95)
  return { recovering, ready }
}

/**
 * The routine that fits best today: the most of its planned work on rested muscles.
 * `loadOf(routine)` gives its planned load. → { routine, score } | null
 */
export function bestRoutine(routines = [], rec, loadOf) {
  let best = null
  for (const r of routines || []) {
    const load = loadOf(r)
    let total = 0, good = 0
    for (const m in load) {
      if (!rec[m]) continue
      total += load[m]
      good += load[m] * (rec[m].pct / 100)
    }
    if (!total) continue
    const score = good / total
    if (!best || score > best.raw) best = { routine: r, raw: score }
  }
  return best && { routine: best.routine, score: Math.round(best.raw * 100) }
}
