import { describe, it, expect, afterAll } from 'vitest'
import { weekStartOf, weekOrder, startOfWeek, weekId, isoOf, ACCENTS } from './format.js'
import {
  routineLabel, routineColor, ROUTINE_COLORS, SIX_DAY_SPLIT, starterKind, applySixDaySplit, hasSixDaySplit
} from './routines.js'
import { starterRoutines } from './starter.js'
import { setLang, t, U, instrFor, instrTranslated } from './i18n.js'
import { EXDB } from './exercises-data.js'
import arPack from '../instr/ar.js'

describe('week order', () => {
  it('starts on Saturday unless Sunday or Monday was picked', () => {
    expect(weekStartOf({})).toBe(6)
    expect(weekStartOf(null)).toBe(6)
    expect(weekStartOf({ weekStart: 0 })).toBe(0)
    expect(weekStartOf({ weekStart: 1 })).toBe(1)
    expect(weekStartOf({ weekStart: 3 })).toBe(6)
  })
  it('lists Saturday → Friday', () => {
    expect(weekOrder(6)).toEqual([6, 0, 1, 2, 3, 4, 5])
    expect(weekOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(weekOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0])
  })
  it('finds the first day of the week', () => {
    // 2026-10-11 is a Sunday → the Saturday-first week began on Sat 10 Oct
    expect(isoOf(startOfWeek('2026-10-11T09:00:00', 6))).toBe('2026-10-10')
    expect(isoOf(startOfWeek('2026-10-10T23:00:00', 6))).toBe('2026-10-10')
    expect(isoOf(startOfWeek('2026-10-16T12:00:00', 6))).toBe('2026-10-10')   // Friday closes it
    expect(isoOf(startOfWeek('2026-10-17T12:00:00', 6))).toBe('2026-10-17')
    expect(weekId('2026-10-11', 0)).toBe('2026-10-11')
    expect(weekId('2026-10-11', 1)).toBe('2026-10-05')
  })
})

describe('routines', () => {
  it('colours every routine from the palette, stable for old ones', () => {
    expect(routineColor({ color: 'blue' })).toBe('blue')
    const old = { id: 'abc123', name: 'Old' }
    expect(ROUTINE_COLORS).toContain(routineColor(old))
    expect(routineColor(old)).toBe(routineColor({ ...old }))
    expect(routineColor(null)).toBe('grey')
  })
  it('the starter plan is Push orange, Pull blue, Legs purple', () => {
    const [push, pull, legs] = starterRoutines()
    expect([push.color, pull.color, legs.color]).toEqual(['orange', 'blue', 'purple'])
    expect([starterKind(push), starterKind(pull), starterKind(legs)]).toEqual(['push', 'pull', 'legs'])
  })
  it('six-day split: Saturday to Thursday, Friday off', () => {
    const s = { routines: [], week: { 5: 'x' } }
    applySixDaySplit(s, starterRoutines)
    expect(s.routines).toHaveLength(3)
    const kindOf = id => starterKind(s.routines.find(r => r.id === id))
    expect([6, 0, 1, 2, 3, 4].map(d => kindOf(s.week[d]))).toEqual(['push', 'pull', 'legs', 'push', 'pull', 'legs'])
    expect(s.week[5]).toBeUndefined()
    expect(hasSixDaySplit(s)).toBe(true)
    expect(SIX_DAY_SPLIT[5]).toBe(null)
    // reuses the plan's own routines instead of adding copies
    applySixDaySplit(s, starterRoutines)
    expect(s.routines).toHaveLength(3)
  })
  it('adds accents only from the system palette', () => {
    expect(Object.keys(ACCENTS)).toEqual(expect.arrayContaining(['lime', 'indigo', 'mint']))
  })
})

describe('Arabic', () => {
  afterAll(() => setLang('en'))
  it('shows built-in routine names in Arabic, typed names as typed', async () => {
    await setLang('ar')
    expect(routineLabel('Push Day')).toBe('يوم الدفع')
    expect(routineLabel('Pull Day')).toBe('يوم السحب')
    expect(routineLabel('Leg Day')).toBe('يوم الأرجل')
    expect(routineLabel('My arms')).toBe('My arms')
    expect(t('Saturday')).toBe('السبت')
    expect(U('ml')).toBe('مل')
    await setLang('en')
    expect(routineLabel('Push Day')).toBe('Push Day')
  })
  it('instructions come in Arabic only when every step is translated', async () => {
    await setLang('ar')
    const bench = EXDB.find(e => e.id === '0025')
    expect(instrTranslated(bench)).toBe(true)
    expect(instrFor(bench)[0]).toMatch(/[\u0600-\u06FF]/)
    expect(instrFor(bench)).toHaveLength(bench.st.length)
    const partial = EXDB.find(e => e.st && e.st.some(s => !arPack.sentences[s]))
    expect(instrTranslated(partial)).toBe(false)
    expect(instrFor(partial)).toEqual(partial.st)
  })
  it('the hand-written pack is clean: every key is a dataset step, every value Arabic', () => {
    const all = new Set(EXDB.flatMap(e => e.st || []))
    for (const [en, ar] of Object.entries(arPack.sentences)) {
      expect(all.has(en), en).toBe(true)
      expect(/[A-Za-z]{2,}/.test(ar), ar).toBe(false)
      expect((ar.match(/\d+/g) || []).sort(), en).toEqual((en.match(/\d+/g) || []).sort())
    }
  })
  it('the starter plan reads fully in Arabic', async () => {
    await setLang('ar')
    for (const r of starterRoutines()) for (const x of r.ex) expect(instrTranslated(EXDB.find(e => e.id === x.id)), x.id).toBe(true)
  })
})
