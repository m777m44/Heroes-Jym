import { describe, it, expect } from 'vitest'
import { periodOf, periodStats, periodScore, periodRecords, smartTips, buildReport, weightForecast } from './report.js'

const S = {
  unit: 'kg', stepGoal: 8000, targetW: 75,
  steps: { '2026-10-17': { n: 9000 }, '2026-10-18': { n: 4000 }, '2026-10-19': { n: 12000 } },
  water: {},
  food: { '2026-10-18': [{ id: 'a', n: 'x', kcal: 2600, q: 1 }] },
  bodyweight: [{ d: '2026-09-20', w: 82 }, { d: '2026-10-01', w: 81 }, { d: '2026-10-17', w: 80 }, { d: '2026-10-20', w: 79.6 }],
  workouts: [
    { id: 1, d: '2026-10-08', start: 0, end: 1, entries: [{ id: 'bench', sets: [{ w: 60, r: 5, done: true }] }] },
    { id: 2, d: '2026-10-18', start: 1000, end: 3601000, entries: [{ id: 'bench', sets: [{ w: 65, r: 5, done: true }, { w: 65, r: 5, done: true }] }] }
  ]
}

describe('report', () => {
  it('weeks run Saturday → Friday; months are calendar months', () => {
    const w = periodOf('week', '2026-10-21')
    expect(w.from).toBe('2026-10-17')
    expect(w.to).toBe('2026-10-23')
    expect(periodOf('week', '2026-10-21', -1).from).toBe('2026-10-10')
    const m = periodOf('month', '2026-10-21')
    expect([m.from, m.to, m.days.length]).toEqual(['2026-10-01', '2026-10-31', 31])
    expect(periodOf('month', '2026-01-15', -1).from).toBe('2025-12-01')
  })
  it('counts workouts, steps, food and weight', () => {
    const st = periodStats(S, periodOf('week', '2026-10-21'), '2026-10-21')
    expect(st.lived).toBe(5)
    expect(st.workouts).toBe(1)
    expect(st.volume).toBe(650)
    expect(st.minutes).toBe(60)
    expect(st.stepsTotal).toBe(25000)
    expect(st.stepDays).toBe(2)
    expect(st.stepsAvg).toBe(5000)
    expect(st.foodDays).toBe(1)
    expect(st.weightChange).toBe(-0.4)
    const sc = periodScore(st)
    expect(sc).toBeGreaterThanOrEqual(0)
    expect(sc).toBeLessThanOrEqual(100)
  })
  it('finds records against everything before', () => {
    const r = periodRecords(S, periodOf('week', '2026-10-21'))
    expect(r).toHaveLength(1)
    expect(r[0].id).toBe('bench')
    expect(r[0].est).toBeGreaterThan(r[0].prev)
  })
  it('tips and forecast', () => {
    const R = buildReport(S, 'week', '2026-10-21')
    expect(R.tips.length).toBeGreaterThan(0)
    expect(R.tips.length).toBeLessThanOrEqual(4)
    R.tips.forEach(tp => expect(typeof tp.key).toBe('string'))
    const fc = weightForecast(S)
    expect(fc.rate).toBeLessThan(0)
    expect(fc.eta > '2026-10-20').toBe(true)
    expect(smartTips({ bodyweight: [] }, { lived: 0, stepGoal: 1, waterDays: 0, foodDays: 0 }, {})[0].icon).toBe('star')
  })
})
