// 9.0 — the day plan: templates, calorie targets, the live state and date-specific reminders.
import { describe, it, expect } from 'vitest'
import {
  buildTemplate, newPlan, normPlan, fitBlocks, planPrefs, mealTargets, planTotals, liveState, isLive, planNotifications, itemInfo,
  startDay, stopDay, markBlock, upsertBlock, removeBlock, shiftFrom, toMin, TEMPLATES, KINDS,
  blocksOn, isWeekly, typeDays, daysLabel, copyDay, cleanDays, blockText, onDay, SCHOOL_DAYS, WEEKEND, PLAN_REMIND_MAX, REMIND_OPTS,
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
  it('builds every template without overlaps, on every weekday', () => {
    for (const t of TEMPLATES) {
      const b = buildTemplate(t.id, { wake: '07:00', sleep: '23:00' })
      expect(b.length, t.id).toBeGreaterThanOrEqual(4)
      for (let wd = 0; wd < 7; wd++) {
        const day = b.filter(x => onDay(x, wd))
        checkPlan(day)
        expect(day.some(x => x.k === 'meal'), t.id + ' ' + wd).toBe(true)
        expect(day.some(x => x.k === 'sleep'), t.id + ' ' + wd).toBe(true)
      }
    }
  })
  it('10.0: the school week — 7:30 to 12:40 Sunday to Thursday, then the afternoon, a calmer weekend', () => {
    const P = newPlan('school', {}, { seed: 3 })
    expect(isWeekly(P)).toBe(true)
    for (const wd of SCHOOL_DAYS) {
      const day = blocksOn(P, wd)
      const school = day.find(x => x.k === 'school')
      expect(school, String(wd)).toBeTruthy()
      expect(school.s).toBe(toMin('07:30'))
      expect(school.s + school.d).toBe(toMin('12:40'))
      expect(school.rm).toBe(10)
      const after = day.filter(x => x.s >= school.s + school.d).map(x => x.k)
      for (const k of ['meal', 'rest', 'study', 'work', 'drink', 'water']) expect(after, k).toContain(k)
      expect(day.find(x => x.k === 'meal' && x.meal === 'l').s).toBeGreaterThanOrEqual(toMin('12:40'))
    }
    for (const wd of WEEKEND) {
      const day = blocksOn(P, wd)
      expect(day.some(x => x.k === 'school')).toBe(false)
      expect(day.find(x => x.k === 'wake').s).toBe(toMin('08:30'))
    }
    // the snack after school carries a handful of almonds, counted
    const snack = blocksOn(P, 1).find(x => x.k === 'meal' && x.meal === 's')
    expect(itemInfo({}, snack.items[0])).toMatchObject({ kind: 'n', g: 25 })
    expect(itemInfo({}, snack.items[0]).kcal).toBeGreaterThan(130)
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
  const now = new Date(2026, 9, 23, 12, 0)            // a Friday
  it('follow the schedule every day while they are on — a week ahead, nearest first', () => {
    const P = newPlan('workout', {}, { seed: 1 })
    expect(planNotifications({}, P, now)).toEqual([])                     // reminders off
    P.remind = true
    const list = planNotifications({}, P, now)
    expect(list.length).toBeGreaterThan(20)
    expect(list.length).toBeLessThanOrEqual(PLAN_REMIND_MAX)
    expect(list.map(n => n.id)).toEqual(list.map((_, i) => i))
    for (let i = 0; i < list.length; i++) {
      expect(list[i].at.getTime()).toBeGreaterThan(now.getTime())
      if (i) expect(list[i].at.getTime()).toBeGreaterThanOrEqual(list[i - 1].at.getTime())
    }
    expect(new Set(list.map(n => n.day)).size).toBe(7)
    const drink = list.find(n => n.kind === 'drink')
    expect(drink.body).toMatch(/kcal planned/)
    expect(drink.lines.some(l => /kcal/.test(l))).toBe(true)
    // capped
    expect(planNotifications({}, P, now, undefined, undefined, { max: 5 })).toHaveLength(5)
  })
  it('ring early when asked, stay quiet when off, skip finished blocks and stopped days', () => {
    const P = normPlan({ remind: true, blocks: [
      { id: 's', k: 'school', s: toMin('07:30'), d: 310, w: SCHOOL_DAYS, rm: 10, nt: 'Maths exam — take the calculator' },
      { id: 'l', k: 'meal', s: toMin('13:00'), d: 40, meal: 'l', items: [{ t: 's', id: 'coke', pk: 'can', ml: 330, q: 1 }, { t: 'n', id: 'pistachio', g: 30, fm: 'roasted' }] },
      { id: 'q', k: 'study', s: toMin('15:00'), d: 60, rm: -1 },
    ] })
    const list = planNotifications({}, P, now)
    expect(list.some(n => n.block === 'q')).toBe(false)                  // reminder off
    const school = list.filter(n => n.block === 's')
    expect(school.map(n => new Date(n.at).getDay()).every(d => SCHOOL_DAYS.includes(d))).toBe(true)
    expect(school[0].at.getHours() * 60 + school[0].at.getMinutes()).toBe(toMin('07:20'))
    expect(school[0].lead).toBe(10)
    expect(school[0].title).toMatch(/^In 10 min/)
    expect(school[0].lines.join('\n')).toMatch(/Maths exam/)
    const lunch = list.find(n => n.block === 'l')
    expect(lunch.lines.join('\n')).toMatch(/Coca-Cola/)
    expect(lunch.lines.join('\n')).toMatch(/Pistachios/)
    // done today → no reminder for it today; a stopped day → none at all
    const sat = list.find(n => n.block === 'l').day
    P.days = { [sat]: { on: 1, done: { l: 1 }, skip: {} } }
    expect(planNotifications({}, P, now).some(n => n.block === 'l' && n.day === sat)).toBe(false)
    P.days = { [sat]: { on: 0, off: 1, done: {}, skip: {} } }
    expect(planNotifications({}, P, now).some(n => n.day === sat)).toBe(false)
  })
  it('say everything you wrote and chose', () => {
    const b = { id: 'x', k: 'drink', s: toMin('16:15'), d: 10, nt: 'With friends', items: [{ t: 's', id: 'mintlemon', pk: 'glass', ml: 300, q: 2 }] }
    const tx = blockText({}, b)
    expect(tx.title).toMatch(/16:15/)
    expect(tx.lines[0]).toMatch(/16:15 – 16:25/)
    expect(tx.lines.some(l => /With friends/.test(l))).toBe(true)
    expect(tx.lines.some(l => /Mint & lemon soda \(300 ml × 2\)/.test(l))).toBe(true)
    expect(tx.kcal).toBe(itemInfo({}, b.items[0]).kcal)
    expect(blockText({}, { id: 'y', k: 'school', s: toMin('07:30'), d: 310 }, 10).body).toMatch(/school starts at 07:30/)
  })
})

describe('10.0 — my schedule', () => {
  it('runs blocks on their weekdays and keeps your own overlaps', () => {
    expect(cleanDays([3, 1, 1, 9, 'x'])).toEqual([1, 3])
    expect(cleanDays([0, 1, 2, 3, 4, 5, 6])).toBeUndefined()
    const P = normPlan({ blocks: [
      { id: 'a', k: 'school', s: 450, d: 310, w: [0, 1, 2, 3, 4] },
      { id: 'b', k: 'water', s: 600, d: 5, ml: 250 },                         // inside school
      { id: 'c', k: 'free', s: 600, d: 120, w: [5, 6] },
    ] })
    expect(P.blocks.find(b => b.id === 'a').d).toBe(310)                      // not trimmed
    expect(blocksOn(P, 1).map(b => b.id)).toEqual(['a', 'b'])
    expect(blocksOn(P, 5).map(b => b.id)).toEqual(['b', 'c'])
    // the newest block is "now" when two overlap (a water break during school)
    const L = liveState(P, null, new Date(2026, 9, 19, 10, 2))               // a Monday
    expect(L.cur.b.id).toBe('b')
    expect(typeDays(P, 1)).toEqual([0, 1, 2, 3, 4])
    expect(typeDays(normPlan({ blocks: [{ id: 'z', k: 'study', s: 600, d: 60 }] }), 2)).toBeUndefined()
  })
  it('keeps last night\'s later sleep running this morning even when today has its own (review on PR #13)', () => {
    const P = newPlan('school', {}, { seed: 1 })
    // Saturday 07:30: Friday night's sleep (23:30, 9 h — Thursday and Friday nights only) runs until 08:30
    const L = liveState(P, null, new Date(2026, 9, 24, 7, 30))
    expect(L.cur.b.k).toBe('sleep')
    expect(L.cur.b.s).toBe(toMin('23:30'))
    expect(Math.round(L.cur.left)).toBe(60)
    expect(L.next.b.k).toBe('wake')
    expect(L.items.filter(x => x.carry)).toHaveLength(1)
    expect(L.total).toBe(liveState(P, null, new Date(2026, 9, 24, 12, 0)).total)   // not counted as a task
    // Thursday 06:20: Wednesday night's 22:30 sleep has 10 minutes left — not Thursday's own 23:30 one
    const T = liveState(P, null, new Date(2026, 9, 22, 6, 20))
    expect(T.cur.b.s).toBe(toMin('22:30'))
    expect(Math.round(T.cur.left)).toBe(10)
  })
  it('labels days and copies a day onto others', () => {
    const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    expect(daysLabel(undefined, names)).toBe('Every day')
    expect(daysLabel([0, 1, 2, 3, 4], names)).toBe('Su–Th')
    expect(daysLabel([5, 6], names)).toBe('Sa · Fr')                        // the week starts on Saturday
    const s = { planner: normPlan({ blocks: [
      { id: 'a', k: 'school', s: 450, d: 310, w: [0, 1, 2, 3, 4] }, { id: 'b', k: 'free', s: 600, d: 120, w: [5] }, { id: 'c', k: 'sleep', s: 1350, d: 480 },
    ] }) }
    copyDay(s, 0, [5])                                                       // Friday becomes a school day
    expect(blocksOn(s.planner, 5).map(b => b.id).sort()).toEqual(['a', 'c'])
    expect(blocksOn(s.planner, 0).map(b => b.id).sort()).toEqual(['a', 'c'])
  })
  it('cleans what you type into a block', () => {
    const s = { planner: newPlan('custom') }
    const id = upsertBlock(s, { k: 'other', s: 900, d: 30, n: 'Football with friends', nt: '  Bring water  ', rm: 15, w: [2, 2, 4], items: [{ t: 'n', id: 'cashew', g: 30 }, { t: 'zz', id: 'x' }] })
    const b = s.planner.blocks.find(x => x.id === id)
    expect(b).toMatchObject({ k: 'other', n: 'Football with friends', nt: 'Bring water', rm: 15, w: [2, 4] })
    expect(b.items).toHaveLength(1)
    expect(REMIND_OPTS).toContain(b.rm)
    const id2 = upsertBlock(s, { k: 'study', s: 900, d: 30, rm: 7 })        // not an option → at the start
    expect(s.planner.blocks.find(x => x.id === id2).rm).toBeUndefined()
  })
  it('counts soft drinks and nuts in the plan', () => {
    const soda = itemInfo({}, { t: 's', id: 'pepsi', pk: 'bottle', ml: 500, q: 1 })
    expect(soda).toMatchObject({ kind: 's', pk: 'bottle', size: 500 })
    expect(soda.kcal).toBe(220)
    expect(itemInfo({}, { t: 's', id: 'soda', pk: 'can', ml: 330 }).ml).toBeGreaterThan(250)   // plain soda water counts as water
    expect(itemInfo({}, { t: 's', id: 'cokezero', pk: 'can', ml: 330 }).ml).toBe(0)             // caffeine: not water
    const nut = itemInfo({}, { t: 'n', id: 'walnut', g: 30, fm: 'raw' })
    expect(nut.kcal).toBe(196)
    expect(itemInfo({}, { t: 's', id: 'nope' })).toBe(null)
  })
})
