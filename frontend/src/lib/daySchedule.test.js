import { describe, it, expect } from 'vitest'
import { daySchedule, dayPrefs, mealIdeas, toMin, toHHMM, dayReminderItems, MEAL_SPLIT, DAY_ID_BASE, dayReminderId, dayReminderIds, DAY_REMIND_DAYS, DAY_REMIND_PER_DAY } from './daySchedule.js'
import { idealBody } from './idealBody.js'

const base = () => ({ unit: 'kg', bodyweight: [{ d: '2026-10-20', w: 80 }], heightCm: 175, birthYear: 1996, workouts: [], water: {}, food: {}, steps: {}, routines: [], dayPlan: {}, week: {}, walk: {}, stepGoal: 8000, waterMl: {} })
const r = idealBody({ heightCm: 175, age: 30, weightKg: 80, sex: 'male' })

describe('daySchedule', () => {
  it('reads the wake and sleep times, with safe defaults', () => {
    expect(dayPrefs({})).toMatchObject({ wake: '07:00', sleep: '23:00', workout: 'auto', remind: false })
    expect(dayPrefs({ day: { wake: '06:00', sleep: '22:30', remind: true } })).toMatchObject({ wake: '06:00', sleep: '22:30', remind: true })
    expect(dayPrefs({ day: { wake: '22:00', sleep: '06:00' } })).toMatchObject({ wake: '07:00', sleep: '23:00' })
    expect(toHHMM(toMin('07:45') + 30)).toBe('08:15')
  })
  it('lays the day out in time order, between waking and sleep', () => {
    const d = daySchedule(base(), r, '2026-10-23', new Date(2026, 9, 23, 6, 0))
    const at = d.items.map(x => x.at)
    expect(at).toEqual([...at].sort((a, b) => a - b))
    expect(d.items[0].kind).toBe('wake')
    expect(d.items[d.items.length - 1].kind).toBe('sleep')
    expect(d.items.filter(x => x.kind === 'meal').map(x => x.meal).sort()).toEqual(['b', 'd', 'l', 's'])
    expect(d.items.some(x => x.kind === 'workout')).toBe(true)
  })
  it('splits the calories over the meals and the water up to the goal', () => {
    const d = daySchedule(base(), r, '2026-10-23', new Date(2026, 9, 23, 6, 0))
    const meals = d.items.filter(x => x.kind === 'meal')
    const sum = meals.reduce((a, x) => a + x.kcal, 0)
    expect(Math.abs(sum - r.kcal)).toBeLessThanOrEqual(20)
    expect(Object.values(MEAL_SPLIT).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
    const water = d.items.filter(x => x.kind === 'water')
    expect(water.reduce((a, x) => a + x.ml, 0)).toBe(d.waterGoal)
    expect(water[water.length - 1].upto).toBe(d.waterGoal)
    for (const m of meals) for (const i of m.ideas) expect(Math.abs(i.kcal - m.kcal) / m.kcal).toBeLessThan(0.35)
  })
  it('marks what is done, late and next', () => {
    const S = base()
    S.waterMl = { '2026-10-23': 400 }
    S.food = { '2026-10-23': [{ id: 'x', m: 'b', kcal: 400, q: 1 }] }
    const d = daySchedule(S, r, '2026-10-23', new Date(2026, 9, 23, 12, 0))
    expect(d.items.find(x => x.key === 'meal-b').status).toBe('done')
    expect(d.items.filter(x => x.status === 'next')).toHaveLength(1)
    expect(d.done).toBeGreaterThan(0)
  })
  it('works for a child, with the child water amount', () => {
    const kid = idealBody({ heightCm: 130, age: 8, weightKg: 28, sex: 'female' })
    const d = daySchedule({ ...base(), bodyweight: [{ d: '2026-10-20', w: 28 }] }, kid, '2026-10-23')
    expect(d.waterGoal).toBe(kid.waterMl)
  })
  it('suggests dishes near a calorie target and asks for reminders only when on', () => {
    const ideas = mealIdeas('b', 450, 3)
    expect(ideas.length).toBeGreaterThan(0)
    expect(new Set(ideas.map(x => x.id)).size).toBe(ideas.length)
    expect(dayReminderItems(base(), r, '2026-10-23')).toEqual([])
    const on = dayReminderItems({ ...base(), day: { remind: true } }, r, '2026-10-23')
    expect(on.length).toBe(6)
    expect(on[0].id).toBe(DAY_ID_BASE)
    expect(on.every(x => x.id < DAY_ID_BASE + 30)).toBe(true)
  })
  it('9.0.0: a week of reminder ids that never meet the other notifications', () => {
    const ids = dayReminderIds()
    expect(ids).toHaveLength(DAY_REMIND_DAYS * DAY_REMIND_PER_DAY)
    expect(new Set(ids).size).toBe(ids.length)
    expect(dayReminderId(0, 0)).toBe(7500)
    expect(dayReminderId(1, 14)).toBe(7529)
    expect(dayReminderId(2, 0)).toBe(8100)
    expect(dayReminderId(6, 14)).toBe(8174)
    const taken = [[1000, 1099], [1100, 1199], [3000, 3099], [7001, 7399], [7400, 7459], [7600, 7699], [7700, 7799], [8000, 8059]]
    expect(ids.some(id => taken.some(([a, b]) => id >= a && id <= b))).toBe(false)
  })
})
