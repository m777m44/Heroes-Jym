import { describe, it, expect, afterAll } from 'vitest'
import {
  CONTAINERS, containerOf, waterGoalMlOf, mlOn, setMl, addMl, mergeNative, countIn, waterDays, waterStreak,
  waterAverage, recommendedMl, waterRemindPrefs, reminderSlots, nextReminder, suggestMove, MOVES, MAX_ML_DAY,
  stepBonusMl, workoutBonusMl, autoGoalMl, workoutMinutesOn, waterGoalParts, waterPanelOn, MOVES_BY_KIND, movesForKind,
} from './water.js'
import { waterConfig, waterStrings, staticReminder, bodyKg, movesByDay, dayMoves } from './waterSync.js'
import { serviceStrings, serviceConfig } from './stepService.js'
import { setLang, t } from './i18n.js'

const today = '2026-10-11'

describe('water — ml, containers, goal', () => {
  it('offers glass, cup, can and bottle; cup by default', () => {
    expect(CONTAINERS.map(c => [c.key, c.ml])).toEqual([['glass', 200], ['cup', 250], ['can', 330], ['bottle', 500]])
    expect(containerOf({}).key).toBe('cup')
    expect(containerOf({ waterUnit: 'can' }).ml).toBe(330)
    expect(containerOf({ waterUnit: 'bucket' }).key).toBe('cup')
  })
  it('reads the 2.4 glass goal and counts as 250 ml each', () => {
    expect(waterGoalMlOf({})).toBe(2000)
    // with the automatic goal switched off (2.6), the fixed goal — 2.4 glasses read as 250 ml
    expect(waterGoalMlOf({ waterAuto: false, waterGoal: 10 })).toBe(2500)
    expect(waterGoalMlOf({ waterAuto: false, waterGoal: 10, waterGoalMl: 3000 })).toBe(3000)
    expect(waterGoalMlOf({ waterAuto: false, waterGoalMl: 99 })).toBe(2000)
    expect(mlOn({ water: { [today]: 3 } }, today)).toBe(750)
    expect(mlOn({ water: { [today]: 3 }, waterMl: { [today]: 400 } }, today)).toBe(400)
  })
  it('recommends ~33 ml per kg, rounded to 250 ml, 1.5–4 l', () => {
    expect(recommendedMl(75)).toBe(2500)
    expect(recommendedMl(40)).toBe(1500)
    expect(recommendedMl(150)).toBe(4000)
    expect(recommendedMl(null)).toBe(2000)
    expect(bodyKg({ unit: 'kg', bodyweight: [{ w: 80 }] })).toBe(80)
    expect(Math.round(bodyKg({ unit: 'lb', bodyweight: [{ w: 176 }] }))).toBe(80)
    expect(bodyKg({ bodyweight: [] })).toBeNull()
  })
  it('stores ml per day with a change time, clamped; replaces the legacy count', () => {
    const s = { water: { [today]: 2 } }
    addMl(s, today, 330, 111)
    expect(mlOn(s, today)).toBe(830)
    expect(s.waterAt[today]).toBe(111)
    expect(s.water[today]).toBeUndefined()
    addMl(s, today, -5000)
    expect(mlOn(s, today)).toBe(0)
    setMl(s, today, 1e9)
    expect(mlOn(s, today)).toBe(MAX_ML_DAY)
  })
  it('drops history older than 400 days', () => {
    const s = { waterMl: { '2020-01-01': 500, '2026-10-01': 750 }, water: { '2019-05-05': 4 } }
    setMl(s, today, 250)
    expect(s.waterMl['2020-01-01']).toBeUndefined()
    expect(s.waterMl['2026-10-01']).toBe(750)
    expect(s.water['2019-05-05']).toBeUndefined()
  })
  it('merges native days — the later change wins', () => {
    const s = { waterMl: { [today]: 500 }, waterAt: { [today]: 1000 } }
    expect(mergeNative(s, { [today]: { ml: 250, at: 900 } })).toBe(false)
    expect(mlOn(s, today)).toBe(500)
    expect(mergeNative(s, { [today]: { ml: 750, at: 2000 }, bogus: { ml: 1, at: 9 } })).toBe(true)
    expect(mlOn(s, today)).toBe(750)
    expect(s.waterAt[today]).toBe(2000)
    // 9.0.0: logged and taken back from the notification — same total, later change time
    expect(mergeNative(s, { [today]: { ml: 750, at: 3000 } })).toBe(true)
    expect(mlOn(s, today)).toBe(750)
    expect(s.waterAt[today]).toBe(3000)
    expect(mergeNative(s, { [today]: { ml: 750, at: 3000 } })).toBe(false)   // nothing newer
  })
  it('counts in the chosen container to the half', () => {
    expect(countIn(1000, { ml: 250 })).toBe(4)
    expect(countIn(1100, { ml: 330 })).toBe(3.5)
  })
  it('lists days, streak and average', () => {
    const S = { waterGoalMl: 2000, waterMl: { '2026-10-08': 2000, '2026-10-09': 2400, '2026-10-10': 2000, [today]: 500 } }
    const d = waterDays(S, today)
    expect(d).toHaveLength(7)
    expect(d[6]).toEqual({ iso: today, ml: 500, dow: 0 })
    expect(waterStreak(S, today)).toBe(3)
    expect(waterStreak({ ...S, waterMl: { ...S.waterMl, [today]: 2000 } }, today)).toBe(4)
    expect(waterAverage(S, today)).toBe(Math.round((2000 + 2400 + 2000 + 500) / 4))
  })
})

describe('water — reminders', () => {
  it('validates the reminder settings', () => {
    expect(waterRemindPrefs({})).toEqual({ on: true, every: 90, from: '09:00', to: '22:00', move: true, vibrate: true })
    expect(waterRemindPrefs({ waterRemind: { vibrate: false } }).vibrate).toBe(false)   // 2.9
    expect(waterRemindPrefs({ waterRemind: { on: false } }).on).toBe(false)
    expect(waterRemindPrefs({ waterRemind: { on: true, every: 7, from: '23:00', to: '08:00' } }))
      .toEqual({ on: true, every: 90, from: '09:00', to: '22:00', move: true, vibrate: true })
    expect(waterRemindPrefs({ waterRemind: { on: true, every: 60, from: '08:30', to: '20:00', move: false } }).every).toBe(60)
  })
  it('lays slots from `from` to `to` and finds the next one (same cases as WaterMathTest)', () => {
    const p = { on: true, every: 90, from: '09:00', to: '22:00' }
    const day = new Date(2026, 9, 12, 12)
    const slots = reminderSlots(p, day)
    expect(slots[0].getHours()).toBe(9)
    expect(slots[slots.length - 1].getHours()).toBe(21)
    const at = (h, m) => new Date(2026, 9, 12, h, m)
    expect(nextReminder(p, at(9, 10))).toEqual(at(10, 30))
    expect(nextReminder(p, at(7, 0))).toEqual(at(9, 0))
    expect(nextReminder(p, at(10, 30))).toEqual(at(12, 0))
    expect(nextReminder(p, at(21, 50))).toEqual(new Date(2026, 9, 13, 9, 0))
    expect(nextReminder({ ...p, on: false }, at(9, 10))).toBeNull()
  })
  it('suggests a walk after sitting still or when behind, else rotates moves', () => {
    const at = (h, m) => new Date(2026, 9, 12, h, m).getTime()
    const MIN = 60000
    expect(suggestMove({ now: at(15, 0), steps: 9000, goal: 10000, lastStepAt: at(15, 0) - 70 * MIN })).toEqual({ kind: 'walk', n: 500, min: 5 })
    expect(suggestMove({ now: at(18, 0), steps: 2000, goal: 10000, lastStepAt: at(18, 0) - 5 * MIN })).toEqual({ kind: 'walk', n: 1000, min: 10 })
    expect(suggestMove({ now: at(12, 0), steps: 4000, goal: 10000, lastStepAt: at(12, 0) - 5 * MIN, slot: 13 })).toEqual({ kind: 'move', i: 1 })
    expect(suggestMove({ now: at(12, 0), steps: 12000, goal: 10000, lastStepAt: at(12, 0) - 120 * MIN, slot: 2 })).toEqual({ kind: 'move', i: 2 })
    expect(MOVES).toHaveLength(12)
  })
})

describe('water — what the native side receives', () => {
  afterAll(() => setLang('en'))
  it('sends goal, container, reminders, moves and every placeholder', () => {
    const S = { waterAuto: false, waterUnit: 'can', waterGoalMl: 2500, waterRemind: { on: true, every: 120 }, walk: { celebrate: true } }
    const c = waterConfig(S)
    expect(c).toMatchObject({ on: true, goalMl: 2500, auto: false, unitMl: 330, unit: 'can', fullCelebrate: true, panel: true })
    expect(c.containers.map(x => [x.key, x.ml, x.name])).toEqual([['glass', 200, 'Glass'], ['cup', 250, 'Cup'], ['can', 330, 'Can'], ['bottle', 500, 'Bottle']])
    for (const k of ['panelTitle', 'panelLeft', 'panelDone', 'panelAuto', 'undo', 'edit', 'channelPanel']) expect(c.strings[k]).toBeTruthy()
    expect(c.strings.panelLeft).toContain('{left}')
    expect(c.strings.panelAuto).toMatch(/\{base\}.*\{walk\}.*\{train\}/)
    expect(c.remind).toMatchObject({ on: true, every: 120 })
    expect(c.moves).toHaveLength(MOVES.length)
    const s = c.strings
    expect(s.body).toContain('{ml}'); expect(s.body).toContain('{goal}')
    expect(s.walk).toContain('{n}'); expect(s.walk).toContain('{min}')
    expect(s.move).toContain('{move}')
    expect(s.added).toContain('{unit}')
    expect(s.title).toContain('330')
    expect(waterConfig({ walk: { celebrate: false } }).fullCelebrate).toBe(false)
  })
  it('speaks Arabic in Arabic — containers and units included', async () => {
    await setLang('ar')
    const s = waterStrings({ waterUnit: 'glass' })
    expect(s.title).toContain('كلاص')
    expect(s.liveAdd).toContain('كلاص')
    expect(t('Cup')).toBe('كوب')
    expect(t('Can')).toBe('علبة')
    expect(s.body).toContain('{ml}')
    expect(s.drink).toMatch(/[\u0600-\u06FF]/)
    expect(staticReminder({ waterUnit: 'cup', waterRemind: { on: true } }, new Date(2026, 9, 12, 12), 0).title).toContain('كوب')
    for (const m of MOVES) expect(t(m)).toMatch(/[\u0600-\u06FF]/)
    // the step notification's labels follow the language too (2.4 sent 'km' / 'kcal' as-is)
    const ss = serviceStrings({})
    expect([ss.km, ss.kcal, ss.kmh]).toEqual(['كم', 'سعرة', 'كم/س'])
    expect(ss.goalKicker).toMatch(/[\u0600-\u06FF]/)
    expect(serviceConfig({ walk: { fullMilestones: true } }).fullMilestones).toBe(true)
    expect(serviceConfig({}).fullCelebrate).toBe(true)
  })
})

describe('water — the automatic goal (2.6, mirrored in WaterMath.autoGoal)', () => {
  const day = '2026-10-12'
  const H = 3600000
  it('adds 70 ml per 1,000 steps after 3,000, in 50 ml steps, at most 1,200 ml', () => {
    expect(stepBonusMl(0)).toBe(0)
    expect(stepBonusMl(3000)).toBe(0)
    expect(stepBonusMl(3700)).toBe(0)
    expect(stepBonusMl(10000)).toBe(450)
    expect(stepBonusMl(60000)).toBe(1200)
  })
  it('adds 10 ml per training minute, at most 1,500 ml', () => {
    expect(workoutBonusMl(0)).toBe(0)
    expect(workoutBonusMl(30)).toBe(300)
    expect(workoutBonusMl(45)).toBe(450)
    expect(workoutBonusMl(999)).toBe(1500)
    expect(autoGoalMl(2000, 10000, 30)).toBe(2750)
    expect(autoGoalMl(5000, 60000, 999)).toBe(6000)
  })
  it('counts the day’s finished workouts and the running one, each capped at 4 h', () => {
    const t0 = new Date(2026, 9, 12, 8).getTime()
    const S = {
      workouts: [{ d: day, start: t0, end: t0 + 0.5 * H }, { d: day, start: t0, end: t0 + 9 * H }, { d: '2026-10-11', start: 0, end: H }],
      active: { d: day, start: t0 + 10 * H },
    }
    expect(workoutMinutesOn(S, day, t0 + 10.25 * H)).toBe(30 + 240 + 15)
    expect(workoutMinutesOn({}, day)).toBe(0)
  })
  it('explains the goal: body weight + walking + training', () => {
    const S = { unit: 'kg', bodyweight: [{ w: 80 }], steps: { [day]: { n: 10000 } }, workouts: [{ d: day, start: 0, end: 30 * 60000 }] }
    const p = waterGoalParts(S, day, 40 * 60000)
    expect(p).toMatchObject({ auto: true, base: 2750, steps: 10000, stepMl: 450, workoutMin: 30, workoutMl: 300, total: 3500 })
    expect(waterGoalMlOf(S, day)).toBe(3500)
    // switched off: the fixed goal, whatever the day held
    expect(waterGoalParts({ ...S, waterAuto: false, waterGoalMl: 2000 }, day)).toMatchObject({ auto: false, total: 2000, stepMl: 0 })
  })
  it('judges each day of a streak against that day’s own goal', () => {
    const S = { waterMl: { '2026-10-11': 2000, '2026-10-12': 2000 }, steps: { '2026-10-11': { n: 20000 } } }
    expect(waterStreak(S, '2026-10-12')).toBe(1)        // the 11th needed 3,150 ml
  })
  it('shows the water panel in the notifications unless switched off', () => {
    expect(waterPanelOn({})).toBe(true)
    expect(waterPanelOn({ waterPanel: false })).toBe(false)
    expect(waterPanelOn({ waterOn: false })).toBe(false)
  })
})

describe('2.10 — water moves that follow each day’s workout', () => {
  it('has its own set of moves for every plan day', () => {
    expect(Object.keys(MOVES_BY_KIND).sort()).toEqual(['full', 'hiit', 'lower', 'recover', 'upper', 'walk', 'walk2'])
    for (const l of Object.values(MOVES_BY_KIND)) expect(l.length).toBeGreaterThanOrEqual(5)
    expect(movesForKind('routine')).toBe(MOVES)
  })
  it('sends seven different lists, keyed by getDay()', () => {
    const by = movesByDay({ dayPlan: {}, week: {}, routines: [] }, new Date(2026, 9, 10, 9))
    expect(Object.keys(by).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6'])
    expect(new Set(Object.values(by).map(l => l.join('|'))).size).toBe(7)
    expect(by[5]).toEqual(MOVES_BY_KIND.recover.map(m => t(m)))      // Friday: recovery
    expect(by[2]).toEqual(MOVES_BY_KIND.hiit.map(m => t(m)))         // Tuesday: HIIT
    expect(waterConfig({}).movesByDay).toBeTruthy()
  })
  it('falls back to the general moves with the daily plan off, and on gym days', () => {
    expect(dayMoves({ planOn: false }, '2026-10-13')).toBe(MOVES)
    expect(dayMoves({ dayPlan: {}, routines: [{ id: 'a', name: 'Push', ex: [{ id: '0001', sets: 3, reps: 10 }] }], week: { 2: 'a' } }, '2026-10-13')).toBe(MOVES)
  })
  it('rotates through the given list', () => {
    const l = MOVES_BY_KIND.lower
    const g = suggestMove({ now: new Date(2026, 9, 12, 12).getTime(), steps: 9000, goal: 8000, slot: 7, moves: l })
    expect(g).toEqual({ kind: 'move', i: 7 % l.length })
  })
})
