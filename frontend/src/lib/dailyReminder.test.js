import { describe, it, expect } from 'vitest'
import { planReminders, reminderText, usualWorkoutTime, suggestedReminderTime, planSignature, reminderPrefs, ID_BASE, hhmm, timeFor, routineSummary } from './dailyReminder.js'
import { EXIDX } from './exercises.js'

// Saturday 10 Oct 2026, 07:00 local. getDay(): Sat = 6, Sun = 0, Mon = 1.
const NOW = new Date(2026, 9, 10, 7, 0)
const base = (over = {}) => ({
  reminder: { on: true, time: '08:00', tz: 'UTC' },
  routines: [{ id: 'a', name: 'Push' }, { id: 'b', name: 'Legs' }],
  week: { 6: 'a', 1: 'b' },        // Saturdays push, Mondays legs
  dayPlan: {}, workouts: [], steps: {}, stepGoal: 8000,
  ...over,
})

describe('planReminders', () => {
  it('plans nothing while the reminder is off', () => {
    expect(planReminders(base({ reminder: { on: false } }), NOW)).toEqual([])
  })

  it('plans a reminder and a follow-up on each workout day', () => {
    const p = planReminders(base(), NOW, 7)
    expect(p.map(x => [x.iso, x.kind])).toEqual([
      ['2026-10-10', 'workout'], ['2026-10-10', 'nudge'],
      ['2026-10-12', 'workout'], ['2026-10-12', 'nudge'],
    ])
    expect(p[0].at.getHours()).toBe(8)
    expect(p[1].at.getHours()).toBe(9)
    expect(p[0].routine).toBe('Push')
    expect(p[0].id).toBe(ID_BASE)
    expect(new Set(p.map(x => x.id)).size).toBe(p.length)
  })

  it('skips a day that already has a workout logged', () => {
    const p = planReminders(base({ workouts: [{ d: '2026-10-10' }] }), NOW, 7)
    expect(p.every(x => x.iso !== '2026-10-10')).toBe(true)
  })

  it('follows day overrides — a moved workout and a day made rest', () => {
    const p = planReminders(base({ dayPlan: { '2026-10-10': 'rest', '2026-10-11': 'b' } }), NOW, 3)
    expect(p.map(x => [x.iso, x.kind, x.routine])).toEqual([
      ['2026-10-11', 'workout', 'Legs'], ['2026-10-11', 'nudge', 'Legs'],
      ['2026-10-12', 'workout', 'Legs'], ['2026-10-12', 'nudge', 'Legs'],
    ])
  })

  it('leaves out reminders whose time has passed today', () => {
    const p = planReminders(base(), new Date(2026, 9, 10, 8, 30), 1)
    expect(p.map(x => x.kind)).toEqual(['nudge'])
    expect(planReminders(base(), new Date(2026, 9, 10, 9, 30), 1)).toEqual([])
  })

  it('can turn the follow-up off', () => {
    const p = planReminders(base({ reminder: { on: true, time: '08:00', nudge: false } }), NOW, 7)
    expect(p.map(x => x.kind)).toEqual(['workout', 'workout'])
  })

  it('reminds to walk on rest days when asked, unless the goal is already met', () => {
    const S = base({ reminder: { on: true, time: '08:00', walk: true, nudge: false } })
    const p = planReminders(S, NOW, 3)
    expect(p.map(x => [x.iso, x.kind])).toEqual([['2026-10-10', 'workout'], ['2026-10-11', 'walk'], ['2026-10-12', 'workout']])
    const met = planReminders({ ...S, dayPlan: { '2026-10-10': 'rest' }, steps: { '2026-10-10': { n: 9000 } } }, NOW, 1)
    expect(met).toEqual([])
  })

  it('tolerates a malformed time', () => {
    expect(reminderPrefs({ reminder: { on: true, time: 'soon' } }).time).toBe('08:00')
  })
})

describe('reminderText', () => {
  it('combines the workout with the step goal in one notification', () => {
    const tx = reminderText({ kind: 'workout', routine: 'Push' }, base())
    expect(tx.title).toBe('Push today')
    expect(tx.body).toContain('8,000')
  })
  it('words the nudge and the walk', () => {
    expect(reminderText({ kind: 'nudge', routine: 'Legs' }, base()).title).toBe('Still time for Legs')
    expect(reminderText({ kind: 'walk' }, base()).body).toContain('8,000')
  })
})

describe('smart time', () => {
  const at = (h, m) => ({ start: new Date(2026, 8, 1, h, m).getTime() })
  it('finds the median start time, to 15 minutes', () => {
    expect(usualWorkoutTime([at(18, 5), at(18, 40), at(17, 50)])).toBe(18 * 60 + 5 - 5)
    expect(hhmm(usualWorkoutTime([at(7, 0), at(7, 20), at(19, 0), at(7, 10)]))).toBe('07:15')
  })
  it('needs a habit first', () => {
    expect(usualWorkoutTime([at(18, 0), at(18, 0)])).toBe(null)
    expect(suggestedReminderTime([])).toBe(null)
  })
  it('suggests reminding half an hour before', () => {
    expect(suggestedReminderTime([at(18, 0), at(18, 0), at(18, 15)])).toEqual({ usual: '18:00', remind: '17:30' })
    expect(hhmm(-15)).toBe('23:45')
  })
})

describe('planSignature', () => {
  it('ignores step counts but notices the things that change the plan', () => {
    const S = base()
    const sig = planSignature(S, NOW)
    expect(planSignature({ ...S, steps: { '2026-10-10': { n: 1234 } } }, NOW)).toBe(sig)
    expect(planSignature({ ...S, workouts: [{ d: '2026-10-10' }] }, NOW)).not.toBe(sig)
    expect(planSignature({ ...S, reminder: { ...S.reminder, time: '09:00' } }, NOW)).not.toBe(sig)
  })
})

describe('workout reminders at each day’s own time (2.6)', () => {
  it('keeps a valid time per weekday and falls back to the shared one', () => {
    const p = reminderPrefs({ reminder: { on: true, time: '07:30', days: { 6: '18:15', 1: 'bad', 9: '10:00' } } })
    expect(p.days).toEqual({ 6: '18:15' })
    expect(timeFor(p, 6)).toBe('18:15')
    expect(timeFor(p, 1)).toBe('07:30')
  })
  it('plans each workout day at its time', () => {
    const p = planReminders(base({ reminder: { on: true, time: '08:00', days: { 6: '18:15' } } }), NOW, 7)
    const sat = p.find(x => x.iso === '2026-10-10' && x.kind === 'workout')
    const mon = p.find(x => x.iso === '2026-10-12' && x.kind === 'workout')
    expect([sat.at.getHours(), sat.at.getMinutes()]).toEqual([18, 15])
    expect(mon.at.getHours()).toBe(8)
    expect(sat.rid).toBe('a')
  })
  it('summarises a routine: exercises, sets and about how long', () => {
    const ids = Object.keys(EXIDX).slice(0, 5)
    const r = { id: 'a', name: 'Push', ex: ids.map((id, i) => ({ id, sets: i === 0 ? 4 : undefined })) }
    const s = routineSummary(r, 90)
    expect(s).toMatchObject({ n: 5, sets: 16, more: 2 })
    expect(s.names).toHaveLength(3)
    expect(s.min).toBe(35)                        // 16 sets × (40 s + 90 s rest) ≈ 34.7 → 35
    expect(routineSummary(null)).toMatchObject({ n: 0, sets: 0, min: 10 })
  })
  it('names the routine, its exercises and the time in the reminder', () => {
    const ids = Object.keys(EXIDX).slice(0, 2)
    const S = base({ routines: [{ id: 'a', name: 'Push', ex: ids.map(id => ({ id, sets: 3 })) }], restSec: 60 })
    const [item] = planReminders(S, NOW, 1)
    const tx = reminderText(item, S)
    expect(tx.title).toBe('🏋️ Push today')
    expect(tx.body).toMatch(/^2 exercises · about 10 min — [^,]+, .+\. Plus 8,000 steps to walk\.$/)
  })
  it('re-plans when the routine or a day’s time changes', () => {
    const a = planSignature(base(), NOW)
    expect(planSignature(base({ reminder: { on: true, time: '08:00', days: { 6: '19:00' } } }), NOW)).not.toBe(a)
    expect(planSignature(base({ routines: [{ id: 'a', name: 'Push', ex: [{ id: 'x' }] }, { id: 'b', name: 'Legs' }] }), NOW)).not.toBe(a)
  })
})
