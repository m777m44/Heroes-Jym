import { describe, it, expect } from 'vitest'
import {
  planFor, planProgress, planRoutine, levelOf, recentStepAverage, stepsTargetFor, PLAN_DAYS, WEEK_KINDS, PLAN_TITLES, TIPS,
} from './dailyPlan.js'
import { waterSchedule } from './water.js'
import { weekPlan, planStreak } from './dailyPlan.js'
import { BUILTIN_NAMES } from './routines.js'
import { EXIDX } from './exercises.js'
import { waterGoalMlOf } from './water.js'

const base = (extra = {}) => ({
  unit: 'kg', stepGoal: 8000, steps: {}, walk: {}, workouts: [], bodyweight: [], routines: [], week: {}, dayPlan: {},
  waterMl: {}, water: {}, ...extra,
})
// 2026-10-10 is a Saturday, 2026-10-13 a Tuesday, 2026-10-16 a Friday.
const SAT = '2026-10-10', TUE = '2026-10-13', FRI = '2026-10-16'

describe('daily plan', () => {
  it('runs the week Saturday → Friday with a hard/easy rhythm', () => {
    expect(WEEK_KINDS[6]).toBe('full')
    expect(WEEK_KINDS[2]).toBe('hiit')
    expect(WEEK_KINDS[5]).toBe('recover')
    expect(new Set(Object.values(WEEK_KINDS)).size).toBe(7)
    expect(planFor(base(), SAT).kind).toBe('full')
    expect(planFor(base(), TUE).kind).toBe('hiit')
    expect(planFor(base(), FRI).kind).toBe('recover')
  })

  it('only uses exercises that exist, and every title translates as a routine name', () => {
    for (const d of Object.values(PLAN_DAYS)) for (const [id] of d.ex) expect(EXIDX[id], id).toBeTruthy()
    for (const title of PLAN_TITLES.filter(x => x !== 'Your routine')) expect(BUILTIN_NAMES).toContain(title)
    for (const kind of Object.values(WEEK_KINDS)) expect(PLAN_DAYS[kind]).toBeTruthy()
  })

  it('a routine from your own week plan wins over the template', () => {
    const r = { id: 'r1', name: 'Push Day', color: 'blue', ex: [{ id: '0662', sets: 4, reps: 8, weight: 0 }] }
    const p = planFor(base({ routines: [r], week: { 2: 'r1' } }), TUE)
    expect(p.kind).toBe('routine')
    expect(p.routineId).toBe('r1')
    expect(p.title).toBe('Push Day')
    expect(p.exercises).toEqual([{ id: '0662', sets: 4, reps: 8, hold: false }])
    // a day marked as rest becomes mobility & recovery
    expect(planFor(base({ routines: [r], week: { 2: 'r1' }, dayPlan: { [TUE]: 'rest' } }), TUE).kind).toBe('recover')
  })

  it('scales sets with how often you trained lately', () => {
    expect(levelOf(base(), TUE)).toBe('easy')
    const w = n => Array.from({ length: n }, (_, i) => ({ d: `2026-10-0${9 - i}`, start: 0, end: 0 }))   // 9, 8, 7 … October
    expect(levelOf(base({ workouts: w(4) }), TUE)).toBe('normal')
    expect(levelOf(base({ workouts: w(8) }), TUE)).toBe('hard')
    const easy = planFor(base(), SAT).exercises[0].sets
    const hard = planFor(base({ workouts: w(8) }), SAT).exercises[0].sets
    expect(hard).toBe(easy + 2)
  })

  it('swaps jumps for joint-friendly moves with a high BMI', () => {
    const S = base({ heightCm: 170, bodyweight: [{ d: SAT, w: 105 }] })   // BMI ≈ 36
    const p = planFor(S, TUE)
    expect(p.lowImpact).toBe(true)
    const ids = p.exercises.map(e => e.id)
    expect(ids).not.toContain('1160')   // burpee
    expect(ids).not.toContain('0514')   // jump squat
    for (const id of ids) expect(EXIDX[id], id).toBeTruthy()
    expect(new Set(ids).size).toBe(ids.length)                       // no move twice
    expect(planFor(base({ heightCm: 180, bodyweight: [{ d: SAT, w: 75 }] }), TUE).lowImpact).toBe(false)
  })

  it('sets the steps target from your recent average, more on walking days', () => {
    const steps = {}
    for (let d = 3; d <= 9; d++) steps[`2026-10-0${d}`] = { n: 8000 }
    const S = base({ steps })
    expect(recentStepAverage(S, SAT)).toBe(8000)
    expect(stepsTargetFor(S, SAT, 'full')).toBe(9000)              // 8,000 × 1.1 → 8,800 → 9,000
    expect(stepsTargetFor(S, SAT, 'walk')).toBe(11500)             // 9,000 × 1.25 = 11,250 → 11,500
    expect(stepsTargetFor(S, SAT, 'recover')).toBeLessThan(9000)
    // too little history → the step goal (clamped to a sensible range)
    expect(stepsTargetFor(base({ stepGoal: 3000 }), SAT, 'full')).toBe(6000)
    expect(stepsTargetFor(base({ stepGoal: 30000 }), SAT, 'full')).toBe(14000)
  })

  it('estimates minutes, calories and water', () => {
    const S = base({ bodyweight: [{ d: SAT, w: 90 }] })
    const p = planFor(S, TUE)
    expect(p.minutes).toBeGreaterThanOrEqual(10)
    expect(p.kcalWorkout).toBe(Math.round(8 * 90 * p.minutes / 60))
    expect(p.kcalTotal).toBe(p.kcalWorkout + p.kcalSteps)
    expect(p.fatGrams).toBe(Math.round(p.kcalTotal / 7.7))
    expect(p.waterMl).toBe(waterGoalMlOf(S, TUE))
    expect(TIPS).toContain(p.tip)
  })

  it('turns the plan into a one-off routine for the workout screen', () => {
    const p = planFor(base(), SAT)
    const r = planRoutine(p)
    expect(r.name).toBe('Full-body fat burn')
    expect(r.ex.length).toBe(p.exercises.length)
    expect(r.ex[0]).toMatchObject({ id: p.exercises[0].id, sets: p.exercises[0].sets, reps: p.exercises[0].reps, weight: 0 })
  })

  it('measures progress and says when the whole day is done', () => {
    const S0 = base()
    const p = planFor(S0, SAT)
    const none = planProgress(S0, p)
    expect(none.score).toBe(0)
    expect(none.done).toBe(false)
    const S1 = base({
      steps: { [SAT]: { n: p.stepsTarget } }, waterMl: { [SAT]: 6000 },
      workouts: [{ d: SAT, start: 0, end: 30 * 60000 }],
    })
    const p1 = planFor(S1, SAT)
    const all = planProgress(S1, p1)
    expect(all.done).toBe(true)
    expect(all.score).toBe(100)
    // live steps not saved yet count too
    const half = planProgress(base({ steps: { [SAT]: { n: 100 } } }), p, { pending: p.stepsTarget })
    expect(half.stepsPct).toBe(1)
  })
})

describe('water schedule', () => {
  const p = { on: true, every: 180, from: '09:00', to: '21:00', move: true, vibrate: true }
  const at = (h, m = 0) => new Date(2026, 9, 13, h, m)

  it('spreads the goal over the reminder times', () => {
    const s = waterSchedule(p, 2500, 0, at(7))
    expect(s.slots.map(x => x.at.getHours())).toEqual([9, 12, 15, 18, 21])
    expect(s.slots.map(x => x.target)).toEqual([500, 1000, 1500, 2000, 2500])
    expect(s.slots.map(x => x.state)).toEqual(['next', 'later', 'later', 'later', 'later'])
    expect(s.behind).toBe(0)
  })

  it('marks passed slots done or late and tells how far behind you are', () => {
    const s = waterSchedule(p, 2500, 700, at(13))
    expect(s.slots.map(x => x.state)).toEqual(['done', 'late', 'next', 'later', 'later'])
    expect(s.due).toBe(1000)
    expect(s.behind).toBe(300)
    expect(waterSchedule(p, 2500, 1600, at(13)).slots[2].state).toBe('done')   // ahead of the pace
    expect(waterSchedule(p, 2500, 1600, at(13)).behind).toBe(0)
  })

  it('is empty without a goal', () => {
    expect(waterSchedule(p, 0, 0, at(10)).slots).toEqual([])
  })
})

describe('2.10 week plan and streak', () => {
  it('lists Saturday → Friday of the week, every day different', () => {
    const w = weekPlan({ dayPlan: {}, week: {}, routines: [] }, '2026-10-13')                 // a Tuesday
    expect(w.map(d => d.iso)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'])
    expect(w.map(d => d.dow)).toEqual([6, 0, 1, 2, 3, 4, 5])
    expect(new Set(w.map(d => d.plan.kind)).size).toBe(7)
  })
  it('counts days in a row with two of three parts done', () => {
    const S = { stepGoal: 8000, steps: {}, water: {}, workouts: [], dayPlan: {}, week: {}, routines: [] }
    for (const d of ['2026-10-11', '2026-10-12']) {
      S.steps[d] = { n: 20000, ms: 0 }
      S.workouts.push({ d, start: Date.parse(d + 'T08:00:00'), end: Date.parse(d + 'T09:30:00') })
    }
    expect(planStreak(S, '2026-10-13')).toBe(2)          // today not done yet: doesn't break it
    S.steps['2026-10-13'] = { n: 20000, ms: 0 }
    S.workouts.push({ d: '2026-10-13', start: Date.parse('2026-10-13T08:00:00'), end: Date.parse('2026-10-13T09:30:00') })
    expect(planStreak(S, '2026-10-13')).toBe(3)
    expect(planStreak({ dayPlan: {}, week: {}, routines: [] }, '2026-10-13')).toBe(0)
  })
})

describe('dailyPlan 3.0 — programmes', async () => {
  const { PROGRAM_WEEKS, programOf } = await import('./dailyPlan.js')
  it('every programme day exists and the week has two easy days', () => {
    for (const [prog, wk] of Object.entries(PROGRAM_WEEKS)) {
      expect(Object.keys(wk).length, prog).toBe(7)
      for (const k of Object.values(wk)) expect(PLAN_DAYS[k], prog + ':' + k).toBeTruthy()
    }
    expect(Object.values(PROGRAM_WEEKS.muscle).filter(k => k === 'recover').length).toBe(2)
  })
  it('follows the chosen programme, else the ideal body, else fat loss', () => {
    expect(programOf({})).toBe('lose')
    expect(programOf({ bodyGoal: 'muscle' })).toBe('muscle')
    const thin = { heightCm: 180, sex: 'male', birthYear: new Date().getFullYear() - 30, unit: 'kg', bodyweight: [{ d: '2026-10-01', w: 55 }] }
    expect(programOf(thin)).toBe('muscle')
    expect(programOf({ ...thin, bodyweight: [{ d: '2026-10-01', w: 74 }] })).toBe('keep')
    expect(programOf({ ...thin, bodyweight: [{ d: '2026-10-01', w: 100 }] })).toBe('lose')
  })
  it('a muscle-gain Saturday is a gym push day without extra sets', () => {
    const p = planFor(base({ bodyGoal: 'muscle' }), '2026-10-17')
    expect(p.kind).toBe('push')
    expect(p.gym).toBe(true)
    expect(p.program).toBe('muscle')
    expect(p.exercises[0].id).toBe('0025')
  })
})
