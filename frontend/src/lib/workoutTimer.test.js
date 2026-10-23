import { describe, it, expect } from 'vitest'
import { fmtClock, sessionMs, sessionMet, sessionKcal, sessionKcalFor, workoutKcalOn, setsProgress, MET_LIFT, COUNTDOWN } from './workoutTimer.js'

describe('workout timer', () => {
  it('formats the clock', () => {
    expect(fmtClock(0)).toBe('0:00')
    expect(fmtClock(-5000)).toBe('0:00')
    expect(fmtClock(65_000)).toBe('1:05')
    expect(fmtClock(3_729_000)).toBe('1:02:09')
    expect(fmtClock('x')).toBe('0:00')
  })
  it('counts down 3 2 1 GO', () => { expect(COUNTDOWN).toEqual([3, 2, 1, 0]) })
  it('measures a session, capped at 4 h and never negative', () => {
    expect(sessionMs({ start: 1000, end: 61_000 })).toBe(60_000)
    expect(sessionMs({ start: 10_000 }, 5_000)).toBe(0)            // countdown still running
    expect(sessionMs({ start: 0 })).toBe(0)
    expect(sessionMs({ start: 1, end: 1 + 9 * 3600e3 })).toBe(4 * 3600e3)
  })
  it('burns MET × 3.5 × kg / 200 per minute', () => {
    const w = { start: 0 + 1, end: 1 + 60 * 60000, entries: [{ id: 'a' }] }
    expect(sessionKcal(w, 80)).toBe(Math.round(MET_LIFT * 3.5 * 80 / 200 * 60))   // 420
    expect(sessionKcal(w, 0)).toBe(Math.round(MET_LIFT * 3.5 * 70 / 200 * 60))
    const cardio = { ...w, entries: [{ id: 'a' }, { id: 'b' }] }
    expect(sessionMet(cardio, e => e.id === 'b')).toBe(6)
    expect(sessionKcal(cardio, 80, { isCardio: e => e.id === 'b' })).toBeGreaterThan(sessionKcal(w, 80))
  })
  it('reads the weight from the log and sums a day', () => {
    const S = { unit: 'kg', bodyweight: [{ w: 100 }], workouts: [{ d: '2026-10-23', start: 1, end: 1 + 30 * 60000, entries: [] }], active: { d: '2026-10-23', start: 1, entries: [] } }
    expect(sessionKcalFor(S, S.workouts[0])).toBe(Math.round(5 * 3.5 * 100 / 200 * 30))
    expect(workoutKcalOn(S, '2026-10-23', 1 + 30 * 60000)).toBe(2 * 263)
    expect(workoutKcalOn(S, '2026-10-22')).toBe(0)
  })
  it('counts sets', () => {
    expect(setsProgress({ entries: [{ sets: [{ done: true }, {}] }, { sets: [{ done: true }] }] })).toEqual({ done: 2, total: 3, pct: 2 / 3 })
    expect(setsProgress(null)).toEqual({ done: 0, total: 0, pct: 0 })
  })
})
