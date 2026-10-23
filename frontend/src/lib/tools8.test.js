import { describe, it, expect } from 'vitest'
import { phases, totalSec, workSec, at, workDone, kcalOf, clock, clampCfg, logEntry, weekTotals, PRESETS } from './intervals.js'
import { PATTERNS, patternById, phaseAt, scaleAt, cycleSec, breathsPerMin, cyclesFor, MIN_SCALE } from './breathe.js'
import { goalHours, startFast, fastStatus, endFast, fastStats, lastDays, stageAt, nextStage, nextAt, hmText, normFasting, planById } from './fasting.js'
import { recoveryOf, recoveryLevels, overallReadiness, splitReady, bestRoutine, needHours, workoutTime } from './recovery.js'
import { maxHR, zonesFor, zoneOf, ageOf } from './hrZones.js'
import { loadOfRoutine } from './muscles.js'
import { EXDB as EX } from './exercises.js'

describe('interval timer', () => {
  it('unrolls Tabata: get ready, 8 × (20 s work, 10 s rest) with no rest after the last round', () => {
    const tabata = PRESETS.find(p => p.id === 'tabata')
    const list = phases(tabata)
    expect(list[0]).toMatchObject({ kind: 'prep', sec: 10 })
    expect(list.filter(p => p.kind === 'work')).toHaveLength(8)
    expect(list.filter(p => p.kind === 'rest')).toHaveLength(7)
    expect(list[list.length - 1]).toMatchObject({ kind: 'work', round: 8 })
    expect(totalSec(list)).toBe(10 + 8 * 20 + 7 * 10)
    expect(workSec(list)).toBe(160)
  })
  it('EMOM has no rest phases; sets get a break between them but not after the last', () => {
    expect(phases({ work: 60, rest: 0, rounds: 5, sets: 1, prep: 0 }).every(p => p.kind === 'work')).toBe(true)
    const two = phases({ work: 30, rest: 10, rounds: 3, sets: 2, setRest: 60, prep: 0, cool: 30 })
    expect(two.map(p => p.kind)).toEqual(['work', 'rest', 'work', 'rest', 'work', 'setrest', 'work', 'rest', 'work', 'rest', 'work', 'cool'])
    expect(two.find(p => p.kind === 'setrest')).toMatchObject({ set: 1 })
  })
  it('keeps every number inside its limits', () => {
    expect(clampCfg({ work: 1, rounds: 500, rest: -5 })).toMatchObject({ work: 5, rounds: 99, rest: 0 })
  })
  it('knows where a run is at any moment — from elapsed time, not ticks', () => {
    const list = phases({ work: 20, rest: 10, rounds: 2, sets: 1, prep: 5 })
    expect(at(list, 0)).toMatchObject({ i: 0, done: false, left: 5 })
    expect(at(list, 7)).toMatchObject({ i: 1, into: 2, left: 18 })
    expect(at(list, 7).phase.kind).toBe('work')
    expect(at(list, 7).next.kind).toBe('rest')
    expect(at(list, 26).phase.kind).toBe('rest')
    expect(at(list, 55)).toMatchObject({ done: true, overall: 1 })
    expect(at([], 3).done).toBe(true)
  })
  it('counts the work actually done and its calories', () => {
    const list = phases({ work: 20, rest: 10, rounds: 2, sets: 1, prep: 5 })
    expect(workDone(list, 15)).toBe(10)
    expect(workDone(list, 999)).toBe(40)
    expect(kcalOf(list, 999, 80)).toBe(Math.round((8 * 40 + 3 * 15) / 3600 * 80))
  })
  it('formats the clock', () => {
    expect(clock(0)).toBe('0:00')
    expect(clock(9.2)).toBe('0:10')
    expect(clock(65)).toBe('1:05')
    expect(clock(3725)).toBe('1:02:05')
  })
  it('logs a finished or stopped run and totals the week', () => {
    const cfg = PRESETS[0]
    const list = phases(cfg)
    const full = logEntry({ cfg, list, elapsed: totalSec(list), kg: 70, day: '2026-10-20', now: 1 })
    expect(full).toMatchObject({ preset: 'tabata', done: true, rounds: 8, work: 160 })
    const part = logEntry({ cfg, list, elapsed: 75, kg: 70, day: '2026-10-21', now: 2 })
    expect(part.done).toBe(false)
    expect(part.rounds).toBe(2)
    expect(weekTotals([full, part, { d: '2026-10-01', sec: 600, kcal: 50 }], '2026-10-19')).toEqual({ runs: 2, min: Math.round((full.sec + part.sec) / 60), kcal: full.kcal + part.kcal, all: 3 })
  })
})

describe('guided breathing', () => {
  const box = patternById('box')
  it('walks the steps of a pattern', () => {
    expect(cycleSec(box)).toBe(16)
    expect(phaseAt(box, 0)).toMatchObject({ step: 'in', i: 0, cycle: 0 })
    expect(phaseAt(box, 5)).toMatchObject({ step: 'hold', i: 1, left: 3 })
    expect(phaseAt(box, 9).step).toBe('out')
    expect(phaseAt(box, 17)).toMatchObject({ step: 'in', cycle: 1 })
    expect(patternById('nope')).toBe(PATTERNS[0])
  })
  it('the orb grows on the in-breath, stays full on the hold and shrinks on the out-breath', () => {
    expect(scaleAt(box, 0)).toBeCloseTo(MIN_SCALE)
    expect(scaleAt(box, 2)).toBeGreaterThan(MIN_SCALE)
    expect(scaleAt(box, 6)).toBe(1)
    expect(scaleAt(box, 10)).toBeLessThan(1)
    expect(scaleAt(box, 14)).toBe(MIN_SCALE)
    const r = patternById('relax')
    expect(scaleAt(r, 5)).toBe(1)                  // 4-7-8: the hold comes after breathing in
  })
  it('breaths per minute and cycles per session', () => {
    expect(breathsPerMin(patternById('coherent'))).toBeCloseTo(5.5, 1)
    expect(cyclesFor(box, 2)).toBe(Math.round(120 / 16))
  })
})

describe('fasting', () => {
  const T = new Date(2026, 9, 20, 20, 0, 0).getTime()     // 20:00 local
  it('plans set the goal; custom and Ramadan compute it', () => {
    expect(goalHours({ plan: '16' }, T)).toBe(16)
    expect(goalHours({ plan: 'omad' }, T)).toBe(23)
    expect(goalHours({ plan: 'custom', custom: 30 }, T)).toBe(30)
    expect(goalHours({ plan: 'custom', custom: 900 }, T)).toBe(72)
    const suhoor = new Date(2026, 9, 21, 4, 30).getTime()
    expect(goalHours({ plan: 'ramadan', iftar: '18:00' }, suhoor)).toBe(13.5)
    expect(planById('x').id).toBe('16')
  })
  it('the next clock time is today or tomorrow', () => {
    expect(new Date(nextAt('21:15', T)).getHours()).toBe(21)
    expect(new Date(nextAt('06:00', T)).getDate()).toBe(21)
    expect(nextAt('bad', T)).toBe(null)
  })
  it('tracks a running fast through its stages', () => {
    const f = startFast({ plan: '16' }, T)
    expect(f).toEqual({ start: T, goalH: 16, plan: '16' })
    const s = fastStatus(f, T + 13 * 3600000)
    expect(s.stage.id).toBe('burning')
    expect(s.next.id).toBe('ketosis')
    expect(s.pct).toBeCloseTo(13 / 16)
    expect(s.done).toBe(false)
    expect(fastStatus(f, T + 17 * 3600000).done).toBe(true)
    expect(fastStatus(null)).toBe(null)
    expect(stageAt(30).id).toBe('autophagy')
    expect(nextStage(30)).toBe(null)
  })
  it('ending a fast logs whether it reached the goal; stats and the streak', () => {
    const day = 24 * 3600000
    const log = [
      endFast({ start: T - 2 * day, goalH: 16, plan: '16' }, T - 2 * day + 16 * 3600000),
      endFast({ start: T - day, goalH: 16, plan: '16' }, T - day + 17 * 3600000),
      endFast({ start: T - 5 * day, goalH: 18, plan: '18' }, T - 5 * day + 10 * 3600000),
    ]
    expect(log.map(e => e.hit)).toEqual([true, true, false])
    const st = fastStats(log, T + 22 * 3600000)
    expect(st).toMatchObject({ count: 3, hit: 2, longestH: 17, totalH: 43 })
    expect(st.streak).toBeGreaterThanOrEqual(1)
    const days = lastDays(log, 7, T + 22 * 3600000)
    expect(days).toHaveLength(7)
    expect(days.filter(d => d.hit).length).toBe(2)
  })
  it('formats and cleans data', () => {
    expect(hmText(14 * 3600000 + 5 * 60000)).toBe('14h 05m')
    expect(normFasting(null)).toMatchObject({ plan: '16', active: null, log: [], iftar: '18:00', remind: true })
    expect(normFasting({ plan: 'ramadan', iftar: '19:05', active: { start: 5, goalH: 'x' } })).toMatchObject({ plan: 'ramadan', iftar: '19:05', active: { start: 5, goalH: 16 } })
  })
})

describe('muscle recovery', () => {
  const bench = EX.find(e => /bench press/i.test(e.n) && e.tg === 'pectorals') || EX.find(e => e.tg === 'pectorals')
  const squat = EX.find(e => e.tg === 'quads')
  const sets = n => Array.from({ length: n }, () => ({ done: true, r: 8, w: 60 }))
  const NOW = Date.UTC(2026, 9, 23, 12)
  const H = 3600000
  it('a muscle trained hard just now needs a couple of days; untrained ones are ready', () => {
    const rec = recoveryOf([{ end: NOW - 2 * H, entries: [{ id: bench.id, sets: sets(5) }] }], NOW)
    expect(rec.chest.pct).toBeLessThan(15)                     // just trained
    expect(rec.chest.readyAt).toBeGreaterThan(NOW + 40 * H)
    const nextDay = recoveryOf([{ end: NOW - 26 * H, entries: [{ id: bench.id, sets: sets(5) }] }], NOW)
    expect(nextDay.chest.pct).toBeGreaterThan(40)
    expect(nextDay.chest.pct).toBeLessThan(60)
    expect(rec.calves.pct).toBe(100)
    const later = recoveryOf([{ end: NOW - 72 * H, entries: [{ id: bench.id, sets: sets(5) }] }], NOW)
    expect(later.chest.pct).toBe(100)
  })
  it('more sets mean longer recovery; workouts add up', () => {
    expect(needHours('chest', 10)).toBeGreaterThan(needHours('chest', 3))
    const one = recoveryOf([{ end: NOW - 20 * H, entries: [{ id: squat.id, sets: sets(4) }] }], NOW)
    const two = recoveryOf([{ end: NOW - 20 * H, entries: [{ id: squat.id, sets: sets(4) }] }, { end: NOW - 2 * H, entries: [{ id: squat.id, sets: sets(4) }] }], NOW)
    expect(two.quadriceps.pct).toBeLessThan(one.quadriceps.pct)
  })
  it('turns readiness into map shades, a total, and today’s best routine', () => {
    const rec = recoveryOf([{ end: NOW - 1 * H, entries: [{ id: bench.id, sets: sets(6) }] }], NOW)
    const lv = recoveryLevels(rec)
    expect(lv.chest).toBeGreaterThan(0)
    expect(lv.quadriceps).toBe(0)
    expect(overallReadiness(rec)).toBeLessThan(100)
    expect(overallReadiness(recoveryOf([], NOW))).toBe(100)
    const { recovering } = splitReady(rec)
    expect(recovering[0]).toBe('chest')
    const push = { id: 'p', name: 'Push', ex: [{ id: bench.id, sets: 4 }] }
    const legs = { id: 'l', name: 'Legs', ex: [{ id: squat.id, sets: 4 }] }
    expect(bestRoutine([push, legs], rec, loadOfRoutine).routine.id).toBe('l')
    expect(bestRoutine([], rec, loadOfRoutine)).toBe(null)
  })
  it('a workout without timestamps counts from noon on its day', () => {
    expect(workoutTime({ d: '2026-10-20' })).toBe(new Date('2026-10-20T12:00:00').getTime())
    expect(workoutTime({ start: 5, end: 9 })).toBe(9)
    expect(workoutTime(null)).toBe(0)
  })
})

describe('heart-rate zones', () => {
  it('max heart rate from age (Tanaka)', () => {
    expect(maxHR(30)).toBe(187)
    expect(maxHR(50)).toBe(173)
  })
  it('five zones; with a resting pulse they use the heart-rate reserve', () => {
    const plain = zonesFor(30)
    expect(plain).toHaveLength(5)
    expect(plain[0].from).toBe(Math.round(0.5 * 187))
    expect(plain[4].to).toBe(187)
    const k = zonesFor(30, 60)
    expect(k[0].karvonen).toBe(true)
    expect(k[0].from).toBe(Math.round(60 + 0.5 * 127))
    expect(zoneOf(150, k).z).toBe(3)
    expect(zoneOf(40, k)).toBe(null)
  })
  it('age from a birth date', () => {
    expect(ageOf('1996-10-24', new Date(2026, 9, 23))).toBe(29)
    expect(ageOf('1996-10-23', new Date(2026, 9, 23))).toBe(30)
    expect(ageOf(41)).toBe(41)
    expect(ageOf('')).toBe(null)
  })
})

import { fold, score, search, PLACES } from './quickSearch.js'
describe('quick search', () => {
  it('folds case, accents and Arabic diacritics / letter variants', () => {
    expect(fold('Crème BRÛLÉE')).toBe('creme brulee')
    expect(fold('الصِّيَامُ')).toBe('الصيام')
    expect(fold('إفطار')).toBe(fold('افطار'))
    expect(fold('مدرسة')).toBe(fold('مدرسه'))
    expect(fold('  a   b ')).toBe('a b')
  })
  it('ranks exact > starts with > word start > contains, and needs every word', () => {
    expect(score('water', 'Water')).toBe(100)
    expect(score('wat', 'Water')).toBe(80)
    expect(score('rate', 'Heart rate')).toBe(60)
    expect(score('ate', 'Water')).toBe(40)
    expect(score('water zzz', 'Water')).toBe(0)
    expect(score('', 'Water')).toBe(0)
  })
  it('finds screens by keyword, routines and exercises', () => {
    expect(search('tabata')[0]).toMatchObject({ kind: 'place', to: '/timer' })
    expect(search('ramadan')[0].to).toBe('/fasting')
    expect(search('google drive').some(r => r.to === '/backups')).toBe(true)
    const routines = [{ id: 'r1', name: 'Push day' }]
    const exercises = [{ id: 'e1', n: 'barbell bench press', tg: 'pectorals', bp: 'chest', eq: 'barbell' }]
    const res = search('push', { routines, exercises })
    expect(res.find(r => r.kind === 'routine')).toMatchObject({ id: 'r1', to: '/plan/r/r1' })
    expect(search('bench', { exercises })[0]).toMatchObject({ kind: 'exercise', id: 'e1' })
    // translated titles are searched too
    expect(search('مؤقت', { tr: k => (k === 'Interval timer' ? 'مؤقّت الفترات' : k) })[0].to).toBe('/timer')
    expect(search('   ')).toEqual([])
    expect(PLACES.every(p => p[1].startsWith('/') || p[1].startsWith('#'))).toBe(true)
  })
})
