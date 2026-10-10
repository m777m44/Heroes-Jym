import { describe, it, expect } from 'vitest'
import { planReminders, reminderText, usualWorkoutTime, suggestedReminderTime, planSignature, reminderPrefs, ID_BASE, hhmm } from './dailyReminder.js'

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
