import { describe, it, expect } from 'vitest'
import {
  clampGoal, goalOf, strideMeters, distanceKm, caloriesFor, speedKmh, paceToKmh,
  crossedMilestone, reachedGoal, lastDays, stepStreak, weekSummary, bestDay,
  addSteps, raiseSteps, pruneSteps, walkPrefs, DEFAULT_GOAL,
} from './stepMetrics.js'

describe('goal', () => {
  it('rounds and bounds a typed goal', () => {
    expect(clampGoal(8234)).toBe(8200)
    expect(clampGoal('12550')).toBe(12600)
    expect(clampGoal(10)).toBe(500)
    expect(clampGoal(10 ** 7)).toBe(100000)
    expect(clampGoal('abc')).toBe(DEFAULT_GOAL)
  })
  it('falls back to the default for profiles that never set one', () => {
    expect(goalOf({})).toBe(10000)
    expect(goalOf({ stepGoal: 7500 })).toBe(7500)
    expect(goalOf({ stepGoal: -3 })).toBe(10000)
  })
})

describe('stride, distance and calories', () => {
  it('prefers a hand-set stride, then height, then 75 cm', () => {
    expect(strideMeters({ walk: { strideCm: 80 }, heightCm: 190 })).toBe(0.8)
    expect(strideMeters({ heightCm: 180 })).toBe(0.75)
    expect(strideMeters({ heightCm: 160 })).toBe(0.66)
    expect(strideMeters({})).toBe(0.75)
    expect(strideMeters({ walk: { strideCm: 5 } })).toBe(0.75)   // nonsense ignored
  })
  it('turns steps into km', () => {
    expect(distanceKm(10000, 0.75)).toBeCloseTo(7.5)
    expect(distanceKm(-5, 0.75)).toBe(0)
  })
  it('estimates kcal from body weight, converting pounds', () => {
    expect(caloriesFor(10000, { strideM: 0.75, weight: 80 })).toBe(318)
    expect(caloriesFor(10000, { strideM: 0.75, weight: 176.4, unit: 'lb' })).toBe(318)
    // no weight → 70 kg → ~0.028 kcal/step at 75 cm
    expect(caloriesFor(10000, { strideM: 0.75 })).toBe(278)
  })
})

describe('speed', () => {
  const series = (n, every, start = 0) => Array.from({ length: n }, (_, i) => ({ t: start + i * every, steps: i }))
  it('reads walking speed from step timing', () => {
    // 2 steps/s × 0.75 m = 1.5 m/s = 5.4 km/h
    const s = series(40, 500)
    expect(speedKmh(s, s[s.length - 1].t, 0.75)).toBe(5.4)
  })
  it('drops to zero once the steps stop', () => {
    const s = series(40, 500)
    expect(speedKmh(s, s[s.length - 1].t + 5000, 0.75)).toBe(0)
  })
  it('needs a little history before it says anything', () => {
    expect(speedKmh([{ t: 0, steps: 0 }], 0, 0.75)).toBe(0)
    expect(speedKmh(series(3, 500), 1000, 0.75)).toBe(0)
  })
  it('converts iOS pace (s/m) to km/h', () => {
    expect(paceToKmh(0.72)).toBe(5)
    expect(paceToKmh(0)).toBe(0)
    expect(paceToKmh(undefined)).toBe(0)
  })
})

describe('milestones', () => {
  it('fires once per thousand crossed, reporting the highest', () => {
    expect(crossedMilestone(990, 1003)).toBe(1000)
    expect(crossedMilestone(1000, 1500)).toBe(0)
    expect(crossedMilestone(1999, 3200)).toBe(3000)
    expect(crossedMilestone(0, 999)).toBe(0)
    expect(crossedMilestone(500, 400)).toBe(0)
  })
  it('notices the goal exactly once', () => {
    expect(reachedGoal(9990, 10002, 10000)).toBe(true)
    expect(reachedGoal(10002, 10100, 10000)).toBe(false)
  })
})

describe('history', () => {
  const S = {
    stepGoal: 8000,
    steps: {
      '2026-10-04': { n: 9000 }, '2026-10-05': { n: 3000 }, '2026-10-06': { n: 8000 },
      '2026-10-07': { n: 8500 }, '2026-10-08': { n: 12000 }, '2026-10-09': { n: 8001 },
      '2026-10-10': { n: 2000, ms: 60000 },
    },
  }
  it('lists the last days oldest first, with gaps as zero', () => {
    const d = lastDays(S, '2026-10-10', 3)
    expect(d.map(x => x.d)).toEqual(['2026-10-08', '2026-10-09', '2026-10-10'])
    expect(lastDays({}, '2026-10-10', 2).map(x => x.n)).toEqual([0, 0])
  })
  it('counts the streak up to yesterday while today is still going', () => {
    expect(stepStreak(S, '2026-10-10')).toBe(4)
    expect(stepStreak({ ...S, steps: { ...S.steps, '2026-10-10': { n: 8000 } } }, '2026-10-10')).toBe(5)
    expect(stepStreak({}, '2026-10-10')).toBe(0)
  })
  it('summarises the week', () => {
    const w = weekSummary(S, '2026-10-10')
    expect(w.total).toBe(50501)
    expect(w.hit).toBe(5)
    expect(w.avg).toBe(7214)
    expect(bestDay(S)).toEqual({ d: '2026-10-08', n: 12000 })
  })
})

describe('writing steps', () => {
  it('adds steps and active time to a day', () => {
    const s = {}
    addSteps(s, '2026-10-10', 120, 60000)
    addSteps(s, '2026-10-10', 30.4)
    expect(s.steps['2026-10-10']).toEqual({ n: 150, ms: 60000 })
    addSteps(s, '2026-10-10', 0)
    expect(s.steps['2026-10-10'].n).toBe(150)
  })
  it('raises a day to a reported total but never lowers it', () => {
    const s = { steps: { '2026-10-10': { n: 500, ms: 0 } } }
    expect(raiseSteps(s, '2026-10-10', 800)).toBe(300)
    expect(raiseSteps(s, '2026-10-10', 700)).toBe(0)
    expect(s.steps['2026-10-10'].n).toBe(800)
  })
  it('prunes very old days', () => {
    const s = { steps: { '2020-01-01': { n: 1 }, '2026-10-09': { n: 2 } } }
    pruneSteps(s, '2026-10-10')
    expect(Object.keys(s.steps)).toEqual(['2026-10-09'])
  })
  it('fills preference defaults', () => {
    expect(walkPrefs({ walk: { haptics: false } })).toMatchObject({ haptics: false, notify: true, celebrate: true, gps: false })
  })
})
