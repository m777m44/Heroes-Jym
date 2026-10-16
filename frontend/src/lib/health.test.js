import { describe, it, expect } from 'vitest'
import { bpCategory, sugarCategory, sleepCategory, rhrCategory, toMgdl, fromMgdl, setDay, addReading, removeReading, dayLog, summary, series, logStreak, dosesOn, toggleDose, adherence, medReminders, cleanTimes, shiftIso } from './health.js'

describe('health — categories', () => {
  it('rates blood pressure (ACC/AHA 2017)', () => {
    expect(bpCategory(115, 75)).toBe('normal')
    expect(bpCategory(125, 75)).toBe('elevated')
    expect(bpCategory(125, 82)).toBe('stage1')
    expect(bpCategory(135, 70)).toBe('stage1')
    expect(bpCategory(145, 85)).toBe('stage2')
    expect(bpCategory(120, 95)).toBe('stage2')
    expect(bpCategory(185, 100)).toBe('crisis')
    expect(bpCategory(85, 55)).toBe('low')
    expect(bpCategory(null, 80)).toBeNull()
  })
  it('rates blood sugar by when it was taken (ADA)', () => {
    expect(sugarCategory(90, 'fasting')).toBe('normal')
    expect(sugarCategory(110, 'fasting')).toBe('pre')
    expect(sugarCategory(130, 'fasting')).toBe('high')
    expect(sugarCategory(130, 'after')).toBe('normal')
    expect(sugarCategory(160, 'after')).toBe('pre')
    expect(sugarCategory(210, 'random')).toBe('high')
    expect(sugarCategory(60, 'after')).toBe('low')
  })
  it('converts mmol/L', () => {
    expect(fromMgdl(toMgdl(5.5, 'mmol'), 'mmol')).toBe(5.5)
    expect(fromMgdl(99.1, 'mgdl')).toBe(99)
    expect(Math.round(toMgdl(7, 'mmol'))).toBe(126)
  })
  it('rates sleep and resting heart rate', () => {
    expect(sleepCategory(5)).toBe('short'); expect(sleepCategory(6.5)).toBe('bitShort')
    expect(sleepCategory(8)).toBe('good'); expect(sleepCategory(10)).toBe('long')
    expect(sleepCategory(8.5, 70)).toBe('long'); expect(sleepCategory(9.5, 16)).toBe('good')
    expect(rhrCategory(55)).toBe('low'); expect(rhrCategory(72)).toBe('normal'); expect(rhrCategory(110)).toBe('high')
  })
})

describe('health — the log', () => {
  const D = '2026-10-17'
  it('sets and clears day fields, keeps readings in order', () => {
    const s = {}
    setDay(s, D, { sleepH: 7.5, mood: 4 })
    addReading(s, D, 'bp', { t: 20, sys: 130, dia: 85 })
    addReading(s, D, 'bp', { t: 10, sys: 120, dia: 78 })
    expect(dayLog(s, D).bp.map(r => r.t)).toEqual([10, 20])
    removeReading(s, D, 'bp', 10); removeReading(s, D, 'bp', 20)
    expect(dayLog(s, D).bp).toBeUndefined()
    setDay(s, D, { sleepH: null, mood: null })
    expect(s.health[D]).toBeUndefined()
  })
  it('summarises the week and draws series', () => {
    const s = { health: {} }
    for (let i = 0; i < 7; i++) setDay(s, shiftIso(D, -i), { sleepH: 6 + (i % 3), mood: 3 + (i % 2), bp: [{ t: i, sys: 120 + i, dia: 80 }], sugar: [{ t: i, v: 95, ctx: 'fasting' }] })
    const sm = summary(s, D, 7)
    expect(sm.daysLogged).toBe(7)
    expect(sm.sleepH).toBeCloseTo(6.9, 1)
    expect(sm.bp).toMatchObject({ sys: 123, dia: 80, n: 7, cat: 'stage1' })
    expect(sm.sugarFasting).toBe(95)
    const pts = series(s, D, 7, l => l.sleepH)
    expect(pts.length).toBe(7); expect(pts[6].d).toBe(D)
    expect(logStreak(s, D)).toBe(7)
    expect(logStreak(s, shiftIso(D, 1))).toBe(7)        // today not logged yet: still counts to yesterday
  })
})

describe('health — medicines', () => {
  const D = '2026-10-17'
  const S = { meds: [
    { id: 'a', name: 'Vitamin D', kind: 'vit', times: ['09:00'], on: true },
    { id: 'b', name: 'Metformin', kind: 'med', dose: '500 mg', times: ['20:00', '08:00', '8:00', '08:00'], on: true },
    { id: 'c', name: 'Old', times: ['10:00'], on: false },
  ] }
  it('lists the doses of a day in time order and ticks them', () => {
    expect(cleanTimes(['20:00', '08:00', '8:00', '08:00'])).toEqual(['08:00', '20:00'])
    const s = { ...S }
    expect(dosesOn(s, D).map(x => x.key)).toEqual(['b@08:00', 'a@09:00', 'b@20:00'])
    toggleDose(s, D, 'a@09:00')
    expect(dosesOn(s, D).find(x => x.key === 'a@09:00').taken).toBe(true)
    expect(adherence(s, D, 1)).toBe(33)
    toggleDose(s, D, 'a@09:00')
    expect(s.medLog[D]).toBeUndefined()
  })
  it('makes one repeating reminder per dose time', () => {
    const r = medReminders(S)
    expect(r.map(x => x.time)).toEqual(['09:00', '08:00', '20:00'])
    expect(r[0]).toMatchObject({ id: 7400, hour: 9, minute: 0, kind: 'vit' })
    expect(medReminders({ meds: [{ ...S.meds[0], remind: false }] })).toEqual([])
  })
})
