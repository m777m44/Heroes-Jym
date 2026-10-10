import { describe, it, expect } from 'vitest'
import { achievements, stepTotals } from './achievements.js'
import { goalOf, daysBack } from './stepMetrics.js'

const TODAY = '2026-10-10'

describe('stepTotals', () => {
  it('handles an empty history', () => {
    expect(stepTotals({})).toEqual({ total: 0, best: 0, goalDays: 0 })
    expect(stepTotals(null)).toEqual({ total: 0, best: 0, goalDays: 0 })
  })
  it('adds every day, finds the best and counts goal days', () => {
    const goal = goalOf({})
    const S = { steps: { '2026-10-08': { n: goal }, '2026-10-09': { n: 3000 }, [TODAY]: { n: goal + 2500 } } }
    expect(stepTotals(S)).toEqual({ total: goal * 2 + 5500, best: goal + 2500, goalDays: 2 })
  })
})

describe('achievements', () => {
  it('lists every badge, none earned on a fresh install', () => {
    const list = achievements({}, TODAY)
    expect(list.length).toBe(11)
    expect(list.every(a => !a.done)).toBe(true)
    expect(new Set(list.map(a => a.id)).size).toBe(list.length)
  })

  it('unlocks day, total and streak tiers from the history', () => {
    const goal = goalOf({})
    const steps = {}
    // 7 goal days in a row ending today, one of them a 21,000-step day
    for (let i = 0; i < 7; i++) steps[daysBack(TODAY, i)] = { n: Math.max(goal, 15000) }
    steps[daysBack(TODAY, 3)] = { n: 21000 }
    const got = Object.fromEntries(achievements({ steps }, TODAY).map(a => [a.id, a.done]))
    expect(got.day5000 && got.day10000 && got.day20000).toBe(true)
    expect(got.day30000).toBe(false)
    expect(got.total10000 && got.total100000).toBe(true)
    expect(got.total500000).toBe(false)
    expect(got.streak3 && got.streak7).toBe(true)
    expect(got.streak30).toBe(false)
  })

  it('reports progress towards a badge', () => {
    const a = achievements({ steps: { [TODAY]: { n: 4200 } } }, TODAY).find(x => x.id === 'day5000')
    expect(a).toMatchObject({ kind: 'day', need: 5000, have: 4200, done: false })
  })
})
