// 9.0 — the day plan: templates, calorie targets, the live state and date-specific reminders.
import { describe, it, expect } from 'vitest'
import {
  buildTemplate, newPlan, normPlan, fitBlocks, planPrefs, mealTargets, planTotals, liveState, isLive, planNotifications, itemInfo, dayRec,
  startDay, stopDay, markBlock, upsertBlock, removeBlock, extendNow, dayBlocks, toMin, TEMPLATES, KINDS,
  blocksOn, isWeekly, typeDays, daysLabel, copyDay, cleanDays, blockText, onDay, SCHOOL_DAYS, WEEKEND, PLAN_REMIND_MAX, REMIND_OPTS, planAlarms,
  blockKcal, SCHOOL_TV, oldSchoolPlan, TEMPLATE_TEXTS, noteText, partOf, BLOCK_ICONS, dayOrder, toHHMM, DAY_ALL, blockMl,
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
  it('13.1: your school & work week at your own times — school 7:30–12:40 with nothing inside, work, study, sleep at 12:00', () => {
    const P = newPlan('school', {}, { seed: 3 })
    expect(isWeekly(P)).toBe(true)
    expect([P.wake, P.sleep, P.tv]).toEqual(['07:00', '00:00', SCHOOL_TV])
    expect(SCHOOL_TV).toBe(3)
    expect(oldSchoolPlan(P)).toBe(false)
    expect(oldSchoolPlan({ ...P, tv: 2 })).toBe(true)                        // an 11.0 school week is offered the new one
    expect(oldSchoolPlan({ ...P, tv: undefined })).toBe(true)
    expect(oldSchoolPlan(normPlan(P))).toBe(false)                          // the version survives cleaning
    const row = b => [toHHMM(b.s), toHHMM(b.s + b.d), b.k, b.n || b.meal]
    // Sunday–Thursday, exactly as asked
    const SUN_THU = [
      ['07:00', '07:10', 'water', 'Drink water'],
      ['07:10', '07:20', 'meal', 'b'],
      ['07:20', '07:30', 'other', 'Get dressed'],
      ['07:30', '12:40', 'school', 'Go to school'],
      ['12:40', '13:00', 'other', 'Back home from school'],
      ['13:00', '13:40', 'meal', 'Lunch & rest'],
      ['13:40', '15:10', 'work', 'Go to work'],
      ['15:10', '16:44', 'rest', 'Take a break'],
      ['16:44', '18:15', 'work', 'Back to work'],
      ['18:15', '18:20', 'other', 'Finish all your work'],
      ['18:20', '18:30', 'water', 'Drink water'],
      ['18:30', '19:00', 'meal', 'd'],
      ['19:00', '20:00', 'walk', 'Walk with water'],
      ['20:00', '22:00', 'study', 'Study'],
      ['22:00', '22:30', 'water', 'Water & a break'],
      ['22:30', '23:45', 'study', 'Back to studying'],
      ['23:45', '00:00', 'meal', 'Light snack'],
      ['00:00', '07:00', 'sleep', 'Lock up & sleep'],
    ]
    for (const wd of SCHOOL_DAYS) {
      const day = dayOrder(blocksOn(P, wd))
      expect(day.map(row), String(wd)).toEqual(SUN_THU)
      const school = day.find(x => x.k === 'school')
      expect(day.filter(x => x !== school && x.s > school.s && x.s < school.s + school.d)).toEqual([])   // nothing inside school
      expect(day.filter(b => b.rm === -1)).toEqual([])                      // a reminder at every step
      expect(day.find(b => b.k === 'meal' && b.meal === 'l').nt).toBe('Eat slowly, then rest until 1:40')
      checkPlan(blocksOn(P, wd))
    }
    // Friday & Saturday: the same times without school or work — the afternoon for study, with water and a walk
    for (const wd of WEEKEND) {
      const day = dayOrder(blocksOn(P, wd))
      expect(day.some(x => x.k === 'school' || x.k === 'work')).toBe(false)
      const noon = day.filter(x => x.s >= toMin('13:40') && x.s < toMin('18:15'))
      expect(noon.map(x => x.k)).toEqual(['study', 'water', 'study', 'walk', 'study'])
      expect([noon[0].s, noon.at(-1).s + noon.at(-1).d]).toEqual([toMin('13:40'), toMin('18:15')])
      expect(noon.find(x => x.k === 'walk').ml).toBeGreaterThan(0)
      for (const at of ['07:00', '07:10', '13:00', '18:20', '18:30', '19:00', '20:00', '22:00', '22:30', '23:45', '00:00']) expect(day.some(x => x.s === toMin(at)), wd + ' ' + at).toBe(true)
      expect(day.filter(x => x.k === 'free').length).toBe(2)               // a morning you shape yourself — quiet
      expect(day.filter(x => x.k === 'free').every(x => x.rm === -1)).toBe(true)
      checkPlan(blocksOn(P, wd))
    }
    // a walk carries its water; the day's water adds up
    const walk = blocksOn(P, 1).find(x => x.n === 'Walk with water')
    expect([walk.ml, blockMl({}, walk)]).toEqual([500, 500])
    expect(planTotals({}, blocksOn(P, 1), 2400).ml).toBe(300 + 300 + 500 + 300)
    // a different Iraqi lunch and dinner every day; eggs and bread on school mornings
    for (const meal of ['l', 'd']) expect(new Set(DAY_ALL.map(wd => blocksOn(P, wd).find(x => x.k === 'meal' && x.meal === meal).items.map(i => i.id).join())).size, meal).toBe(7)
    const bf = blocksOn(P, 1).find(x => x.k === 'meal' && x.meal === 'b')
    expect(bf.items).toEqual([{ t: 'f', id: 'egg', q: 2 }, { t: 'f', id: 'khubz', q: 1 }])
    expect(blockKcal({}, bf)).toBe(78 * 2 + 165)
    expect(itemInfo({}, bf.items[0])).toMatchObject({ kind: 'f', kcal: 156, p: 12.6 })
    // the late snack: nuts, fruit or chips — counted
    const snacks = DAY_ALL.map(wd => blocksOn(P, wd).find(x => x.n === 'Light snack'))
    expect(new Set(snacks.map(x => x.items[0].t + x.items[0].id))).toEqual(new Set(['nkerzat', 'fapple', 'fchips']))
    expect(itemInfo({}, snacks[0].items[0])).toMatchObject({ kind: 'n', g: 30 })
    for (const x of snacks) expect(blockKcal({}, x)).toBeGreaterThan(100)
    for (const wd of DAY_ALL) for (const m of blocksOn(P, wd).filter(x => x.k === 'meal')) expect(blockKcal({}, m), m.meal + wd).toBeGreaterThan(150)
    // the day adds up: calories, protein, carbs, fat and the hours of school, work and study
    const tot = planTotals({}, blocksOn(P, 0), 2400)
    expect(tot.kcal).toBeGreaterThan(1500)
    expect(tot.p).toBeGreaterThan(40)
    expect(tot.c).toBeGreaterThan(150)
    expect(tot.min).toMatchObject({ school: 310, work: 181, study: 195, walk: 60 })
    // names and notes are translation keys; a template note shows in your language, your own words as they are
    expect(TEMPLATE_TEXTS).toContain('Lock up & sleep')
    expect(TEMPLATE_TEXTS).toContain('Get ready for school')               // an 11.0 week you keep still reads in your language
    expect(noteText('Clothes, school bag and a water bottle', s => 'AR:' + s)).toBe('AR:Clothes, school bag and a water bottle')
    expect(noteText('Tomorrow’s books, your clothes and a water bottle', s => 'AR:' + s)).toBe('AR:Tomorrow’s books, your clothes and a water bottle')
    expect(noteText('{0} my own note', s => 'AR:' + s)).toBe('{0} my own note')
    expect(P.blocks.every(b => !b.ic || BLOCK_ICONS.includes(b.ic))).toBe(true)
  })
  it('11.0: groups the day into morning, afternoon, evening and night', () => {
    expect([toMin('07:00'), toMin('12:40'), toMin('18:30'), toMin('22:00'), toMin('01:30')].map(m => partOf(m).key)).toEqual(['morning', 'afternoon', 'evening', 'night', 'night'])
  })
  it('11.0: a block keeps its own icon through an edit, and only a known one', () => {
    const s = { planner: newPlan('custom') }
    const id = upsertBlock(s, { k: 'free', s: 600, d: 60, n: 'Phone & games', ic: 'gamepad' })
    expect(s.planner.blocks.find(b => b.id === id).ic).toBe('gamepad')
    upsertBlock(s, { ...s.planner.blocks.find(b => b.id === id), nt: 'x' })
    expect(s.planner.blocks.find(b => b.id === id).ic).toBe('gamepad')
    const bad = upsertBlock(s, { k: 'free', s: 700, d: 30, ic: '<script>' })
    expect(s.planner.blocks.find(b => b.id === bad).ic).toBeUndefined()
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
    removeBlock(s, nid)
    expect(s.planner.blocks.some(b => b.id === nid)).toBe(false)
    stopDay(s, iso)
    expect(isLive(s.planner, iso)).toBe(false)
    // stopping today keeps "Run it every day": tomorrow starts by itself (review on PR #13)
    s.planner.auto = true
    stopDay(s, iso)
    expect(s.planner.auto).toBe(true)
    expect(isLive(s.planner, iso)).toBe(false)
    expect(isLive(s.planner, '2026-10-24')).toBe(true)
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
  it('give the phone one alarm per block — weekdays, start, lead, text and the days to stay quiet', () => {
    const P = newPlan('school', {}, { seed: 1 })
    expect(planAlarms({}, P, now)).toEqual([])                              // reminders off
    P.remind = true
    const sch = P.blocks.find(b => b.k === 'school')
    P.days = { '2026-10-25': { on: 1, done: { [sch.id]: 1 }, skip: {} }, '2026-10-26': { on: 0, off: 1, done: {}, skip: {} }, '2026-10-01': { off: 1 } }
    const list = planAlarms({}, P, now)
    // every block but the quiet ones — and the midnight bedtime rings too (13.1)
    expect(list.length).toBe(P.blocks.filter(b => !(b.k === 'sleep' && b.s >= 60 && b.s < 360) && b.rm !== -1).length)
    expect(list.some(n => n.kind === 'sleep' && n.start === 0)).toBe(true)
    expect(list.map(n => n.id)).toEqual(list.map((_, i) => i))
    const a = list.find(n => n.block === sch.id)
    expect(a).toMatchObject({ w: [0, 1, 2, 3, 4], start: toMin('07:30'), lead: 0, kind: 'school' })
    expect(a.title).toMatch(/07:30/)
    expect(a.skip).toEqual(['2026-10-25', '2026-10-26'])                  // done that day, and a stopped day (not the past one)
    const other = list.find(n => n.block !== sch.id)
    expect(other.skip).toEqual(['2026-10-26'])
    // many blocks — no cap: every block gets its alarm
    const big = normPlan({ remind: true, blocks: Array.from({ length: 50 }, (_, i) => ({ id: 'x' + i, k: 'study', s: 360 + i * 15, d: 10 })) })
    expect(planAlarms({}, big, now)).toHaveLength(50)
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
  // the 11.0 school week's nights: bed at 22:00 before a school day, 23:30 on Thursday and Friday nights
  const twoBedtimes = () => normPlan({ tpl: 'custom', blocks: [
    { id: 'w1', k: 'wake', s: toMin('07:00'), d: 15, w: SCHOOL_DAYS },
    { id: 'w2', k: 'wake', s: toMin('09:00'), d: 15, w: WEEKEND },
    { id: 'bf', k: 'meal', s: toMin('07:20'), d: 5, meal: 'b', w: SCHOOL_DAYS },
    { id: 'sc', k: 'school', s: toMin('07:30'), d: 310, w: SCHOOL_DAYS },
    { id: 'lu', k: 'meal', s: toMin('13:00'), d: 40, meal: 'l' },
    { id: 'hw', k: 'study', s: toMin('14:30'), d: 90, n: 'Homework', w: SCHOOL_DAYS },
    { id: 'sn', k: 'meal', s: toMin('16:00'), d: 15, meal: 's', w: SCHOOL_DAYS },
    { id: 'rv', k: 'study', s: toMin('17:30'), d: 45, n: 'Review', w: SCHOOL_DAYS },
    { id: 's1', k: 'sleep', s: toMin('22:00'), d: 540, w: [0, 1, 2, 3, 6] },
    { id: 's2', k: 'sleep', s: toMin('23:30'), d: 570, w: [4, 5] },
  ] })
  it('keeps last night\'s later sleep running this morning even when today has its own (review on PR #13)', () => {
    const P = twoBedtimes()
    // Saturday 07:30: Friday night's sleep (23:30, 9½ h — Thursday and Friday nights only) runs until 09:00
    const L = liveState(P, null, new Date(2026, 9, 24, 7, 30))
    expect(L.cur.b.k).toBe('sleep')
    expect(L.cur.b.s).toBe(toMin('23:30'))
    expect(Math.round(L.cur.left)).toBe(90)
    expect(L.next.b.k).toBe('wake')
    expect(L.items.filter(x => x.carry)).toHaveLength(1)
    expect(L.total).toBe(liveState(P, null, new Date(2026, 9, 24, 12, 0)).total)   // not counted as a task
    // Thursday 06:20: Wednesday night's 22:00 sleep has 40 minutes left — not Thursday's own 23:30 one
    const T = liveState(P, null, new Date(2026, 9, 22, 6, 20))
    expect(T.cur.b.s).toBe(toMin('22:00'))
    expect(Math.round(T.cur.left)).toBe(40)
  })
  it('gives the block now 10 more minutes and moves the rest of today — today only (review on PR #13)', () => {
    const s = { planner: { ...twoBedtimes(), remind: true } }
    const P0 = JSON.parse(JSON.stringify(s.planner.blocks))
    const mon = new Date(2026, 9, 19, 15, 0), iso = '2026-10-19'               // Monday 15:00, homework 14:30–16:00
    const L = liveState(s.planner, dayRec(s.planner, iso), mon)
    expect(L.cur.b.n).toBe('Homework')
    extendNow(s, L.cur, 10, mon)
    expect(s.planner.blocks).toEqual(P0)                                        // the schedule itself is untouched
    const today = dayBlocks(s.planner, iso)
    const hw = today.find(b => b.n === 'Homework'), snack = today.find(b => b.k === 'meal' && b.meal === 's')
    expect([hw.s, hw.d, hw.mv]).toEqual([toMin('14:30'), 100, 1])
    expect(snack.s).toBe(toMin('16:10'))
    expect(today.find(b => b.k === 'sleep').s).toBe(toMin('22:00'))           // bedtime stays
    expect(today.find(b => b.k === 'school').mv).toBeUndefined()               // before it: untouched
    // Tuesday (the same Sunday–Thursday blocks) and next Monday are as planned
    expect(dayBlocks(s.planner, '2026-10-20').find(b => b.n === 'Homework')).toMatchObject({ s: toMin('14:30'), d: 90 })
    expect(dayBlocks(s.planner, '2026-10-26').find(b => b.k === 'meal' && b.meal === 's').s).toBe(toMin('16:00'))
    expect(Math.round(liveState(s.planner, dayRec(s.planner, iso), mon).cur.left)).toBe(70)
    // pressed again: 10 more
    extendNow(s, liveState(s.planner, dayRec(s.planner, iso), mon).cur, 10, mon)
    expect(dayBlocks(s.planner, iso).find(b => b.k === 'meal' && b.meal === 's').s).toBe(toMin('16:20'))
    // the reminders follow: today's snack at 16:20, Tuesday's at 16:00
    const list = planNotifications({}, s.planner, mon, undefined, undefined, { days: 2 })
    const sn = list.filter(n => n.block === snack.id)
    expect(sn.map(n => [n.day, n.at.getHours() * 60 + n.at.getMinutes(), n.moved])).toEqual([[iso, toMin('16:20'), true], ['2026-10-20', toMin('16:00'), false]])
    expect(sn[0].title).toMatch(/16:20/)
    // the phone: the usual alarm stays quiet today, one more rings once today at the new time
    const al = planAlarms({}, s.planner, mon).filter(n => n.block === snack.id)
    expect(al).toHaveLength(2)
    expect(al[0]).toMatchObject({ start: toMin('16:00'), w: [0, 1, 2, 3, 4], skip: [iso] })
    expect(al[1]).toMatchObject({ start: toMin('16:20'), w: [1], skip: ['2026-10-26'], once: iso })
    // done → no extra alarm; a stopped day → none either
    markBlock(s, iso, snack.id, 'done')
    expect(planAlarms({}, s.planner, mon).filter(n => n.block === snack.id)).toHaveLength(1)
    // editing the notes keeps today's change, a new time replaces it
    const rv = today.find(b => b.n === 'Review')
    upsertBlock(s, { ...s.planner.blocks.find(b => b.id === rv.id), nt: 'Maths' })
    expect(dayBlocks(s.planner, iso).find(b => b.id === rv.id).s).toBe(toMin('17:50'))
    upsertBlock(s, { ...s.planner.blocks.find(b => b.id === rv.id), s: toMin('18:00') })
    expect(dayBlocks(s.planner, iso).find(b => b.id === rv.id)).toMatchObject({ s: toMin('18:00'), d: 45 })
    expect(dayBlocks(s.planner, iso).find(b => b.id === rv.id).mv).toBeUndefined()
  })
  it('lengthens a sleep that started yesterday on yesterday\'s date and moves this morning', () => {
    const s = { planner: twoBedtimes() }
    const thu = new Date(2026, 9, 22, 6, 55)                                  // Thursday 06:55: Wednesday night's sleep ends 07:00
    const L = liveState(s.planner, null, thu)
    expect(L.cur.b.k).toBe('sleep')
    extendNow(s, L.cur, 10, thu)
    expect(s.planner.days['2026-10-21'].mv[L.cur.b.id]).toEqual([toMin('22:00'), 550])
    const L2 = liveState(s.planner, dayRec(s.planner, '2026-10-22'), thu)
    expect(L2.cur.b.k).toBe('sleep')
    expect(Math.round(L2.cur.left)).toBe(15)
    expect(L2.next.b.k).toBe('wake')
    expect(L2.next.b.s).toBe(toMin('07:10'))
    const thuBlocks = dayBlocks(s.planner, '2026-10-22')
    expect(thuBlocks.find(b => b.k === 'meal' && b.meal === 'b').s).toBe(toMin('07:30'))
    // school keeps its time (the delay ends there), and so does all that comes after it and tonight's sleep
    expect(thuBlocks.find(b => b.k === 'school')).toMatchObject({ s: toMin('07:30'), d: 310 })
    expect(thuBlocks.find(b => b.k === 'meal' && b.meal === 'l').s).toBe(toMin('13:00'))
    expect(thuBlocks.find(b => b.k === 'sleep').d).toBe(570)
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
