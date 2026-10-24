// 10.0 — the reminders' fallback without the native service (iOS): weekly-repeating, one per block and weekday.
import { describe, it, expect } from 'vitest'
import { weeklyFallback } from './planReminders.js'
import { newPlan, toMin, liveState, extendNow } from './dayPlan.js'

describe('schedule reminders without the native service', () => {
  it("repeat weekly — one per block, weekday and lead, the soonest 60, today's past ones too", () => {
    const P = { ...newPlan('school', {}, { seed: 2 }), remind: true }
    const now = new Date(2026, 9, 19, 23, 0)                            // Monday 23:00
    const list = weeklyFallback(P, {}, now)
    expect(list.length).toBe(60)
    const keys = list.map(n => n.block + '|' + n.at.getDay() + '|' + n.lead)
    expect(new Set(keys).size).toBe(keys.length)
    for (let i = 1; i < list.length; i++) expect(list[i].at.getTime()).toBeGreaterThanOrEqual(list[i - 1].at.getTime())
    // a small plan: every block of the week, including Monday's morning school reminder (next Monday)
    const small = { ...newPlan('custom'), remind: true, blocks: [{ id: 's', k: 'school', s: toMin('07:30'), d: 310, w: [0, 1, 2, 3, 4], rm: 10 }] }
    const w = weeklyFallback(small, {}, now)
    expect(w.map(n => n.at.getDay()).sort()).toEqual([0, 1, 2, 3, 4])
    expect(w.every(n => n.at.getHours() === 7 && n.at.getMinutes() === 20)).toBe(true)
  })
  it('ring once at the new time when a block was moved for one day (+10), and once next week at the usual one (review on PR #13)', () => {
    const s = { planner: { ...newPlan('custom'), remind: true, blocks: [
      { id: 'hw', k: 'study', n: 'Homework', s: toMin('14:30'), d: 90, w: [0, 1, 2, 3, 4] },
      { id: 'sn', k: 'meal', meal: 's', s: toMin('16:00'), d: 15, w: [0, 1, 2, 3, 4], items: [] },
    ] } }
    const mon = new Date(2026, 9, 19, 15, 0)                                  // Monday 15:00, homework until 16:00
    extendNow(s, liveState(s.planner, null, mon).cur, 10, mon)
    expect(s.planner.days['2026-10-19'].mv.sn).toEqual([toMin('16:10'), 15])
    const w = weeklyFallback(s.planner, {}, mon).filter(n => n.block === 'sn')
    const hm = n => n.at.getHours() * 60 + n.at.getMinutes()
    // Monday: once today at 16:10, once next Monday at 16:00 — no weekly one that would ring at 16:00 today
    expect(w.filter(n => n.once).map(n => [n.day, hm(n)])).toEqual([['2026-10-19', toMin('16:10')], ['2026-10-26', toMin('16:00')]])
    // the other school days repeat weekly as usual
    expect(w.filter(n => !n.once).map(n => n.at.getDay()).sort()).toEqual([0, 2, 3, 4])
    expect(w.filter(n => !n.once).every(n => hm(n) === toMin('16:00'))).toBe(true)
    // homework (lengthened, same start — today's reminder has rung) stays weekly
    expect(weeklyFallback(s.planner, {}, mon).filter(n => n.block === 'hw').every(n => !n.once)).toBe(true)
  })
})
