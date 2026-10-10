import { describe, it, expect } from 'vitest'
import {
  previousEntry, validateWeighIn, compareLatest, totalChange, goalProgress, goalStart,
  weeklyRate, etaToGoal, movingAverage, bmi, bmiCategory, toKg,
} from './weightTracker.js'

const H = [
  { d: '2026-09-01', w: 90 },
  { d: '2026-09-08', w: 89.2 },
  { d: '2026-09-15', w: 88.6 },
  { d: '2026-09-22', w: 88.1 },
  { d: '2026-09-29', w: 87.3 },
]

describe('verification', () => {
  it('finds the weigh-in before a day', () => {
    expect(previousEntry(H, '2026-09-15').d).toBe('2026-09-08')
    expect(previousEntry(H, '2026-09-01')).toBe(null)
    expect(previousEntry(H, '2026-12-01').d).toBe('2026-09-29')
  })
  it('accepts normal day-to-day movement', () => {
    expect(validateWeighIn(H, 86.5, '2026-09-30')).toBe(null)
    expect(validateWeighIn([], 70, '2026-09-30')).toBe(null)
  })
  it('flags a jump too big for the time that passed', () => {
    const v = validateWeighIn(H, 92.5, '2026-09-30')
    expect(v).toMatchObject({ kind: 'jump', delta: 5.2, days: 1 })
    expect(v.prev.d).toBe('2026-09-29')
  })
  it('allows more change across a longer gap', () => {
    expect(validateWeighIn(H, 83, '2026-10-29')).toBe(null)      // −4.3 over 30 days
    expect(validateWeighIn(H, 83, '2026-09-30')).not.toBe(null)  // same in one day
  })
  it('flags typos outside a human range, in either unit', () => {
    expect(validateWeighIn(H, 8.7, '2026-09-30')).toEqual({ kind: 'range' })
    expect(validateWeighIn([], 900, '2026-09-30', 'lb')).toEqual({ kind: 'range' })
    expect(validateWeighIn([], 180, '2026-09-30', 'lb')).toBe(null)
    expect(toKg(100, 'lb')).toBeCloseTo(45.36, 2)
  })
})

describe('comparison', () => {
  it('compares the latest two weigh-ins', () => {
    expect(compareLatest(H)).toMatchObject({ delta: -0.8, current: { w: 87.3 }, previous: { w: 88.1 } })
    expect(compareLatest([{ d: '2026-09-01', w: 80 }]).delta).toBe(null)
    expect(compareLatest([]).current).toBe(null)
  })
  it('reports the change since the first entry', () => {
    expect(totalChange(H)).toMatchObject({ delta: -2.7, days: 28 })
    expect(totalChange([])).toBe(null)
  })
})

describe('goal', () => {
  it('measures progress for a cut and for a bulk', () => {
    expect(goalProgress(90, 87, 80)).toBeCloseTo(0.3)
    expect(goalProgress(60, 63, 70)).toBeCloseTo(0.3)
  })
  it('reads 0 the wrong way and 1 past the goal', () => {
    expect(goalProgress(90, 92, 80)).toBe(0)
    expect(goalProgress(90, 78, 80)).toBe(1)
    expect(goalProgress(80, 80, 80)).toBe(1)
    expect(goalProgress(null, 80, 80)).toBe(null)
  })
  it('starts the journey where the goal was set, else at the first weigh-in', () => {
    expect(goalStart({ targetFrom: 88, bodyweight: H })).toBe(88)
    expect(goalStart({ bodyweight: H })).toBe(90)
    expect(goalStart({ bodyweight: [] })).toBe(null)
  })
})

describe('trend', () => {
  it('fits a weekly rate over the last four weeks', () => {
    expect(weeklyRate(H)).toBeCloseTo(-0.66, 1)
  })
  it('needs at least a few days of data', () => {
    expect(weeklyRate([{ d: '2026-09-01', w: 80 }, { d: '2026-09-02', w: 79 }])).toBe(null)
    expect(weeklyRate([])).toBe(null)
  })
  it('projects when the goal is reached', () => {
    const eta = etaToGoal(H, 85)
    expect(eta > '2026-10-15' && eta < '2026-11-05').toBe(true)
  })
  it('gives no date when the trend points away from the goal', () => {
    expect(etaToGoal(H, 95)).toBe(null)
    expect(etaToGoal(H, 87.3)).toBe('2026-09-29')
  })
  it('smooths with a trailing average', () => {
    const daily = [{ d: '2026-09-01', w: 80 }, { d: '2026-09-02', w: 82 }, { d: '2026-09-03', w: 81 }]
    expect(movingAverage(daily).map(x => x.w)).toEqual([80, 81, 81])
  })
})

describe('BMI', () => {
  it('computes BMI in either unit', () => {
    expect(bmi(80, 'kg', 180)).toBe(24.7)
    expect(bmi(176.4, 'lb', 180)).toBe(24.7)
    expect(bmi(80, 'kg', null)).toBe(null)
  })
  it('names the WHO category', () => {
    expect([17, 22, 27, 33].map(bmiCategory)).toEqual(['under', 'normal', 'over', 'obese'])
  })
})
