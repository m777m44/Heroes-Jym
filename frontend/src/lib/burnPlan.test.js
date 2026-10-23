import { describe, it, expect } from 'vitest'
import { ACTIVITIES, buildBurnPlan, burnRoutine, burnTarget, savedBurnPlan, burnPrefs, burnReminders, burnReminderText, burnSignature, kcalPerMin, BURN_ID_BASE, BURN_NID_BASE, MAX_PER, MIN_PER } from './burnPlan.js'
import { EXDB } from './exercises-data.js'
import { BUILTIN_NAMES } from './routines.js'

describe('burn plan', () => {
  it('has 8 home and 8 gym activities that exist in the exercise database', () => {
    expect(ACTIVITIES.home).toHaveLength(8)
    expect(ACTIVITIES.gym).toHaveLength(8)
    const ids = new Set(EXDB.map(e => e.id))
    for (const a of [...ACTIVITIES.home, ...ACTIVITIES.gym]) {
      if (a.walk) continue
      expect(ids.has(a.id), a.key).toBe(true)
      expect(a.met).toBeGreaterThan(0)
    }
  })

  it('sizes the minutes so the total lands near the target', () => {
    expect(kcalPerMin(8, 80)).toBeCloseTo(11.2)
    const p = buildBurnPlan({ mode: 'home', keys: ['run', 'burpee', 'squat'], target: 500, kg: 80 })
    expect(p.items).toHaveLength(3)
    expect(Math.abs(p.kcal - 500)).toBeLessThan(25)
    expect(p.minutes).toBe(p.items.reduce((s, x) => s + x.min, 0))
    for (const x of p.items) { expect(x.min).toBeGreaterThanOrEqual(MIN_PER); expect(x.min).toBeLessThanOrEqual(MAX_PER) }
    expect(p.long).toBe(false)
    const big = buildBurnPlan({ mode: 'gym', keys: ['biceps'], target: 5000, kg: 60 })
    expect(big.items[0].min).toBe(MAX_PER)
  })

  it('needs at least one exercise', () => {
    expect(() => buildBurnPlan({ mode: 'home', keys: [], target: 300, kg: 70 })).toThrow(/at least one/)
    expect(() => buildBurnPlan({ mode: 'home', keys: ['bench'], target: 300, kg: 70 })).toThrow()
  })

  it('turns the plan into a workout (walking stays with the step counter)', () => {
    const p = buildBurnPlan({ mode: 'home', keys: ['walk', 'pushup'], target: 300, kg: 70 })
    const r = burnRoutine(p)
    expect(r.ex).toHaveLength(1)
    expect(r.ex[0]).toMatchObject({ id: '0662', mode: 'time' })
    expect(BUILTIN_NAMES).toContain(r.name)
    expect(burnRoutine(p, 0).ex).toHaveLength(0)
    const g = buildBurnPlan({ mode: 'gym', keys: ['bench', 'row'], target: 300, kg: 70 })
    expect(burnRoutine(g, 1).ex[0]).toMatchObject({ id: '0027', mode: 'reps', reps: 10 })
  })

  it('takes the daily target from a running calculator goal', () => {
    const S = { calGoal: { exerciseKcal: 640, from: '2026-10-01', days: 30 }, burnPlan: { target: 400 } }
    expect(burnTarget(S, '2026-10-15')).toBe(640)
    expect(burnTarget(S, '2026-11-15')).toBe(400)
    expect(burnTarget({}, '2026-10-15')).toBe(300)
  })

  it('normalises the reminder settings', () => {
    expect(burnPrefs({})).toEqual({ remind: false, start: '18:00', gap: 30, daily: true, from: null })
    expect(burnPrefs({ burnPlan: { remind: true, start: '25:00', gap: 7 } })).toMatchObject({ start: '18:00', gap: 30 })
    expect(burnPrefs({ burnPlan: { start: '07:15', gap: 60, daily: false } })).toMatchObject({ start: '07:15', gap: 60, daily: false })
  })

  it('schedules each exercise at its own time for 7 days', () => {
    const now = new Date(2026, 9, 19, 9, 0)
    const S = { workouts: [], burnPlan: { mode: 'home', keys: ['run', 'squat', 'jacks'], target: 300, remind: true, start: '18:00', gap: 30 } }
    const rs = burnReminders(S, 75, now)
    expect(rs).toHaveLength(21)
    expect(rs[0]).toMatchObject({ id: BURN_ID_BASE, nid: BURN_NID_BASE, idx: 0 })
    expect(rs[0].at.getHours()).toBe(18)
    expect(rs[1].at.getMinutes()).toBe(30)
    expect(rs[2].at.getHours()).toBe(19)
    expect(rs[3].id).toBe(BURN_ID_BASE + 10)
    expect(new Set(rs.map(r => r.nid)).size).toBe(21)
    // past times today are dropped
    expect(burnReminders(S, 75, new Date(2026, 9, 19, 18, 45))).toHaveLength(19)
    // one alert for the whole session
    const one = burnReminders({ ...S, burnPlan: { ...S.burnPlan, gap: 0 } }, 75, now)
    expect(one).toHaveLength(7)
    expect(one[0].idx).toBe(null)
    // done today → starts tomorrow; off → nothing
    expect(burnReminders({ ...S, workouts: [{ d: '2026-10-19', name: 'Calorie burn at home' }] }, 75, now)).toHaveLength(18)
    expect(burnReminders({ ...S, burnPlan: { ...S.burnPlan, remind: false } }, 75, now)).toEqual([])
    // only once
    expect(burnReminders({ ...S, burnPlan: { ...S.burnPlan, daily: false, from: '2026-10-20' } }, 75, now)).toHaveLength(3)
  })

  it('writes the notification text and where Start goes', () => {
    const now = new Date(2026, 9, 19, 9, 0)
    const S = { burnPlan: { mode: 'home', keys: ['walk', 'burpee'], target: 300, remind: true, gap: 30 } }
    const [w, b] = burnReminders(S, 70, now)
    expect(burnReminderText(w).start).toBe('/walk')
    expect(burnReminderText(b).start).toBe('/burn/review?start=1')
    expect(burnReminderText(b).body).toMatch(/kcal/)
    const all = burnReminders({ burnPlan: { ...S.burnPlan, gap: 0 } }, 70, now)[0]
    expect(burnReminderText(all).start).toBe('/burn/review?start=all')
    expect(burnReminderText(all).big).toMatch(/Brisk walking · Burpees/)
  })

  it('rebuilds the saved plan and changes its signature when edited', () => {
    expect(savedBurnPlan({}, 70)).toBe(null)
    const S = { burnPlan: { mode: 'gym', keys: ['bench'], target: 200 } }
    expect(savedBurnPlan(S, 70).items[0].key).toBe('bench')
    const now = new Date(2026, 9, 19)
    expect(burnSignature(S, 70, now)).not.toBe(burnSignature({ burnPlan: { ...S.burnPlan, target: 300 } }, 70, now))
  })
})
