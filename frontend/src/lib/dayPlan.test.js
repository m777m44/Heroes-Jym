// 9.0 — the day plan: templates, calorie targets, the live state and date-specific reminders.
import { describe, it, expect } from 'vitest'
import {
  buildTemplate, newPlan, normPlan, fitBlocks, planPrefs, mealTargets, planTotals, liveState, isLive, planNotifications, itemInfo,
  startDay, stopDay, markBlock, upsertBlock, removeBlock, shiftFrom, toMin, TEMPLATES, KINDS, PLAN_ID_BASE,
} from './dayPlan.js'

const ends = b => b.s + b.d
function checkPlan(blocks) {
  for (let i = 0; i < blocks.length - 1; i++) {
    expect(blocks[i].s).toBeLessThanOrEqual(blocks[i + 1].s)
    if (blocks[i].k !== 'sleep') expect(ends(blocks[i])).toBeLessThanOrEqual(blocks[i + 1].s)
    expect(KINDS[blocks[i].k]).toBeTruthy()
  }
}

describe('templates', () => {
  it('builds every template without overlaps', () => {
    for (const t of TEMPLATES) {
      const b = buildTemplate(t.id, { wake: '07:00', sleep: '23:00' })
      expect(b.length, t.id).toBeGreaterThanOrEqual(4)
      checkPlan(b)
      expect(b.some(x => x.k === 'meal'), t.id).toBe(true)
      expect(b.some(x => x.k === 'sleep'), t.id).toBe(true)
    }
  })
  it('moves the day onto your own times', () => {
    const b = buildTemplate('workout', { wake: '05:30', sleep: '21:30' })
    expect(b[0]).toMatchObject({ k: 'wake', s: toMin('05:30') })
    const sleep = b.find(x => x.k === 'sleep')
    expect(sleep.s).toBe(toMin('21:30'))
    expect(sleep.d).toBe(480)
    checkPlan(b)
    // a longer day stretches the blocks between wake and sleep
    const long = buildTemplate('study', { wake: '06:00', sleep: '00:00' })
    checkPlan(long)
    expect(long.find(x => x.k === 'sleep').s).toBe(0)
  })
  it('falls back to 07:00–23:00 for an impossible day', () => {
    expect(planPrefs({ wake: '22:00', sleep: '23:00' })).toEqual({ wake: '07:00', sleep: '23:00' })
    expect(planPrefs({ wake: 'x' })).toEqual({ wake: '07:00', sleep: '23:00' })
  })
  it('builds Ramadan around suhoor and iftar', () => {
    const b = buildTemplate('ramadan', {}, { suhoor: '04:00', iftar: '18:40' })
    const suhoor = b.find(x => x.n === 'Suhoor'), iftar = b.find(x => x.n === 'Iftar')
    expect(suhoor.s).toBe(toMin('04:00') - 50)
    expect(iftar.s).toBe(toMin('18:40') + 5)
    expect(b.filter(x => x.k === 'sleep').length).toBe(2)
    expect(b.find(x => x.k === 'workout').s).toBeGreaterThan(iftar.s)
  })
  it('gives drink blocks a drink that suits the moment', () => {
    const b = buildTemplate('workout', {}, { seed: 1 })
    const drinks = b.filter(x => x.k === 'drink')
    expect(drinks.length).toBeGreaterThanOrEqual(3)
    for (const d of drinks) expect(itemInfo({}, d.items[0]).kcal).toBeGreaterThanOrEqual(0)
  })
})

describe('calories', () => {
  it('shares what the drinks leave between the meals', () => {
    const P = newPlan('workout', {}, { seed: 2 })
    const goal = 2200
    const t = mealTargets({}, P.blocks, goal)
    const drinks = planTotals({}, P.blocks, goal).drinks
    const sum = Object.values(t).reduce((a, b) => a + b, 0)
    expect(Math.abs(sum - (goal - drinks))).toBeLessThanOrEqual(30)
    const meals = P.blocks.filter(b => b.k === 'meal')
    const lunch = meals.find(b => b.meal === 'l'), breakfast = meals.find(b => b.meal === 'b')
    expect(t[lunch.id]).toBeGreaterThan(t[breakfast.id])
  })
  it('counts planned items exactly', () => {
    const blocks = fitBlocks([
      { id: 'm', k: 'meal', s: 780, d: 45, meal: 'l', items: [{ t: 'r', id: 'masgouf', q: 1 }, { t: 'd', id: 'shineena', q: 2 }] },
      { id: 'w', k: 'water', s: 900, d: 5, ml: 400 },
    ])
    const tot = planTotals({}, blocks, 2000)
    expect(tot.kcal).toBe(itemInfo({}, { t: 'r', id: 'masgouf', q: 1 }).kcal + itemInfo({}, { t: 'd', id: 'shineena', q: 2 }).kcal)
    expect(tot.ml).toBe(400 + itemInfo({}, { t: 'd', id: 'shineena', q: 2 }).ml)
    expect(itemInfo({}, { t: 'r', id: 'nope' })).toBe(null)
  })
})

describe('live', () => {
  const at = (h, m = 0) => new Date(2026, 9, 23, h, m)
  const P = normPlan({ blocks: [
    { id: 'a', k: 'wake', s: 420, d: 15 }, { id: 'b', k: 'study', s: 480, d: 120 }, { id: 'c', k: 'meal', s: 780, d: 45, meal: 'l', items: [] },
    { id: 'z', k: 'sleep', s: 1380, d: 480 },
  ] })
  it('knows what is now and next', () => {
    const L = liveState(P, null, at(9, 30))
    expect(L.cur.b.id).toBe('b')
    expect(Math.round(L.cur.left)).toBe(30)
    expect(L.next.b.id).toBe('c')
    expect(L.items.find(x => x.b.id === 'a').st).toBe('missed')
    const L2 = liveState(P, { done: { a: 1 }, skip: {} }, at(9, 30))
    expect(L2.done).toBe(1)
    expect(L2.items.find(x => x.b.id === 'a').st).toBe('done')
  })
  it('keeps a sleep that crossed midnight as now', () => {
    const L = liveState(P, null, at(1, 0))
    expect(L.cur.b.id).toBe('z')
    expect(L.next.b.id).toBe('a')
  })
  it('starts, marks, edits and shifts', () => {
    const s = { planner: newPlan('custom') }
    const iso = '2026-10-23'
    expect(isLive(s.planner, iso)).toBe(false)
    startDay(s, iso, 5)
    expect(isLive(s.planner, iso)).toBe(true)
    const id = s.planner.blocks[1].id
    markBlock(s, iso, id, 'done')
    expect(s.planner.days[iso].done[id]).toBeTruthy()
    markBlock(s, iso, id, 'skip')
    expect(s.planner.days[iso].done[id]).toBeUndefined()
    const nid = upsertBlock(s, { k: 'study', s: 600, d: 60 })
    expect(s.planner.blocks.some(b => b.id === nid)).toBe(true)
    const before = s.planner.blocks.find(b => b.id === nid).s
    shiftFrom(s, nid, 10)
    expect(s.planner.blocks.find(b => b.id === nid).s).toBe(before + 10)
    removeBlock(s, nid)
    expect(s.planner.blocks.some(b => b.id === nid)).toBe(false)
    stopDay(s, iso)
    expect(isLive(s.planner, iso)).toBe(false)
  })
})

describe('reminders', () => {
  it('are date-specific, only ahead, and tomorrow with "every day"', () => {
    const P = newPlan('workout', {}, { seed: 1 })
    const now = new Date(2026, 9, 23, 12, 0)
    expect(planNotifications({}, P, now)).toEqual([])                     // not started today
    P.days = { '2026-10-23': { on: 1, done: {}, skip: {} } }
    const today = planNotifications({}, P, now)
    expect(today.length).toBeGreaterThan(3)
    for (const n of today) {
      expect(n.at.getTime()).toBeGreaterThan(now.getTime())
      expect(n.at.getDate()).toBe(23)
      expect(n.id).toBeGreaterThanOrEqual(PLAN_ID_BASE)
      expect(n.id).toBeLessThan(PLAN_ID_BASE + 50)
    }
    const meal = today.find(n => n.kind === 'drink')
    expect(meal.body).toMatch(/kcal planned/)
    P.auto = true
    const both = planNotifications({}, P, now)
    expect(both.some(n => n.at.getDate() === 24 && n.id >= PLAN_ID_BASE + 50)).toBe(true)
    expect(new Set(both.map(n => n.id)).size).toBe(both.length)
  })
})
