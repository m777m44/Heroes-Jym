import { describe, it, expect } from 'vitest'
import { ageOf, birthYearFor, sexOf, healthyBmi, idealBmiBand, formulas, idealBody, fatRange, activityOf, stepsAverage, paceCheck, bmiPos } from './idealBody.js'

const NOW = new Date(2026, 9, 17)

describe('idealBody — age, sex, bands', () => {
  it('keeps the age from the birth year, inside 13–100', () => {
    expect(ageOf({ birthYear: 1996 }, NOW)).toBe(30)
    expect(ageOf({ birthYear: null }, NOW)).toBeNull()
    expect(ageOf({ birthYear: 2020 }, NOW)).toBeNull()
    expect(birthYearFor(30, NOW)).toBe(1996)
    expect(birthYearFor(5, NOW)).toBeNull()
    expect(birthYearFor(null, NOW)).toBeNull()
  })
  it('reads the sex, falling back to the body diagram', () => {
    expect(sexOf({ sex: 'female' })).toBe('female')
    expect(sexOf({ body: 'female' })).toBe('female')
    expect(sexOf({})).toBe('male')
  })
  it('uses the WHO band for adults and a higher band from 65', () => {
    expect(healthyBmi(30)).toEqual([18.5, 24.9])
    expect(healthyBmi(70)).toEqual([22, 27])
    expect(healthyBmi(16)).toBeNull()
  })
  it('narrows the band with age (NRC) without leaving the healthy range', () => {
    expect(idealBmiBand(22)).toEqual([19, 24])
    expect(idealBmiBand(30)).toEqual([20, 24.9])
    expect(idealBmiBand(50)).toEqual([22, 24.9])
    expect(idealBmiBand(70)).toEqual([24, 27])
    for (let a = 18; a <= 100; a++) {
      const [lo, hi] = idealBmiBand(a), h = healthyBmi(a)
      expect(lo).toBeGreaterThanOrEqual(h[0]); expect(hi).toBeLessThanOrEqual(h[1]); expect(lo).toBeLessThan(hi)
    }
  })
  it('gets the classic formulas right', () => {
    const m = formulas(180, 'male'), f = formulas(165, 'female')
    expect(m.devine).toBeCloseTo(75, 0)
    expect(m.robinson).toBeCloseTo(72.6, 0)
    expect(m.miller).toBeCloseTo(71.5, 0)
    expect(m.hamwi).toBeCloseTo(77.3, 0)
    expect(f.devine).toBeCloseTo(57, 0)
    expect(formulas(50, 'male')).toBeNull()
  })
})

describe('idealBody — the numbers', () => {
  it('needs a height, and gives no ideal weight to under-18s', () => {
    expect(idealBody({ heightCm: null, age: 30 })).toBeNull()
    const teen = idealBody({ heightCm: 170, age: 15, weightKg: 60 })
    expect(teen.adult).toBe(false)
    expect(teen.bmi).toBeCloseTo(20.8, 1)
    expect(teen.ideal).toBeUndefined()
  })
  it('puts the ideal weight inside the age band and the healthy range', () => {
    for (const sex of ['male', 'female']) for (const h of [150, 165, 180, 200]) for (const age of [18, 30, 45, 60, 75]) {
      const r = idealBody({ heightCm: h, age, sex })
      expect(r.ideal).toBeGreaterThanOrEqual(r.idealKg[0])
      expect(r.ideal).toBeLessThanOrEqual(r.idealKg[1])
      expect(r.idealKg[0]).toBeGreaterThanOrEqual(r.healthyKg[0])
      expect(r.idealKg[1]).toBeLessThanOrEqual(r.healthyKg[1])
    }
    const m = idealBody({ heightCm: 180, age: 30, sex: 'male' })
    expect(m.ideal).toBeGreaterThan(70); expect(m.ideal).toBeLessThan(77)
    expect(m.healthyKg).toEqual([59.9, 80.7])
  })
  it('works out a weight-loss plan safely', () => {
    const r = idealBody({ heightCm: 175, age: 35, sex: 'male', weightKg: 95, stepsAvg: 6000 })
    expect(r.bmi).toBeCloseTo(31, 0)
    expect(r.bmiCat).toBe('obese')
    expect(r.goal).toBe('lose')
    expect(r.toIdeal).toBeGreaterThan(20)
    expect(r.bmr).toBe(Math.round(10 * 95 + 6.25 * 175 - 5 * 35 + 5))
    expect(r.activity).toBe('light')
    expect(r.tdee).toBe(Math.round(r.bmr * 1.375))
    expect(r.kcal).toBe(r.tdee - 500)
    expect(r.weeklyKg).toBeGreaterThanOrEqual(0.25); expect(r.weeklyKg).toBeLessThanOrEqual(0.5)
    expect(r.weeks).toBe(Math.ceil(r.toIdeal / r.weeklyKg))
    expect(r.bodyFatCat === 'high' || r.bodyFatCat === 'veryHigh').toBe(true)
    expect(r.waterMl % 50).toBe(0)
  })
  it('never plans below a calorie floor', () => {
    const r = idealBody({ heightCm: 152, age: 70, sex: 'female', weightKg: 70, stepsAvg: 1000 })
    expect(r.goal).toBe('lose')
    expect(r.kcal).toBeGreaterThanOrEqual(1200)
  })
  it('says keep when you are already in range, and gain when under', () => {
    const k = idealBody({ heightCm: 180, age: 30, sex: 'male', weightKg: 74 })
    expect(k.goal).toBe('keep'); expect(k.weeks).toBe(0); expect(k.kcal).toBe(k.tdee)
    const g = idealBody({ heightCm: 180, age: 30, sex: 'male', weightKg: 56 })
    expect(g.goal).toBe('gain'); expect(g.bmiCat).toBe('under'); expect(g.kcal).toBe(g.tdee + 300)
  })
  it('rates the waist against the height', () => {
    expect(idealBody({ heightCm: 180, age: 30, waistCm: 85 }).whtrCat).toBe('healthy')
    expect(idealBody({ heightCm: 180, age: 30, waistCm: 100 }).whtrCat).toBe('raised')
    expect(idealBody({ heightCm: 180, age: 30, waistCm: 5 }).whtr).toBeUndefined()
  })
  it('has body-fat ranges and activity levels', () => {
    expect(fatRange(30, 'male')).toEqual([8, 19])
    expect(fatRange(65, 'female')).toEqual([24, 35])
    expect(activityOf(null)).toBe('light')
    expect(activityOf(12000)).toBe('high')
  })
})

describe('idealBody — monitoring', () => {
  it('averages the last week of steps', () => {
    const S = { steps: { '2026-10-16': { n: 7000 }, '2026-10-15': { n: 7000 } } }
    expect(stepsAverage(S, NOW)).toBe(2000)
    expect(stepsAverage({ steps: {} }, NOW)).toBeNull()
  })
  it('checks the pace against a safe 0.25–1 % a week', () => {
    const h = (perWeek) => [0, 7, 14, 21].map(d => ({ d: '2026-09-' + String(10 + d).padStart(2, '0'), w: 100 + perWeek * d / 7 }))
    expect(paceCheck(h(-0.6), 'kg', 'lose').verdict).toBe('good')
    expect(paceCheck(h(-1.5), 'kg', 'lose').verdict).toBe('tooFast')
    expect(paceCheck(h(0), 'kg', 'lose').verdict).toBe('stalled')
    expect(paceCheck(h(0.5), 'kg', 'lose').verdict).toBe('wrongWay')
    expect(paceCheck(h(0.1), 'kg', 'keep').verdict).toBe('steady')
    expect(paceCheck(h(-1.33), 'lb', 'lose').rate).toBeCloseTo(-0.6, 1)
    expect(paceCheck([{ d: '2026-10-01', w: 80 }], 'kg', 'lose')).toBeNull()
  })
  it('places a BMI on the 15–40 gauge', () => {
    expect(bmiPos(15)).toBe(0); expect(bmiPos(40)).toBe(100); expect(bmiPos(27.5)).toBe(50); expect(bmiPos(60)).toBe(100)
  })
})
