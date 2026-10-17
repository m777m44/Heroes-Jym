import { describe, it, expect } from 'vitest'
import { MODES, CATEGORIES, SESSION_NAMES, EQ_GROUPS, countOf, exercisesOf, pickExercises, sessionRoutine, sessionMinutes, suggestion, eqGroupOf, sectionCount } from './workoutCategories.js'
import { BUILTIN_NAMES } from './routines.js'

describe('4.0 workout sections', () => {
  it('has both sections with the requested categories', () => {
    expect(MODES).toEqual(['home', 'gym'])
    expect(CATEGORIES.home.map(c => c.id)).toEqual(expect.arrayContaining(['cardio', 'abs', 'upper', 'lower', 'full', 'hiit', 'flex', 'run']))
    expect(CATEGORIES.gym.map(c => c.id)).toEqual(expect.arrayContaining(['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core', 'full']))
  })
  it('every category has exercises and every session name is translated in history', () => {
    for (const m of MODES) for (const c of CATEGORIES[m]) expect(countOf(m, c.id), m + '/' + c.id).toBeGreaterThan(0)
    const names = new Set(BUILTIN_NAMES)
    for (const n of SESSION_NAMES) expect(names.has(n), n).toBe(true)
  })
  it('home has no equipment, the gym has nothing but', () => {
    expect(exercisesOf('home', 'full').every(e => eqGroupOf(e) === null)).toBe(true)
    expect(exercisesOf('gym', 'full').every(e => eqGroupOf(e) !== null)).toBe(true)
    expect(sectionCount('home') + sectionCount('gym')).toBeGreaterThan(1000)
  })
  it('the equipment filter narrows the gym list', () => {
    const all = countOf('gym', 'chest')
    const db = countOf('gym', 'chest', 'dumbbell')
    expect(db).toBeGreaterThan(0)
    expect(db).toBeLessThan(all)
    expect(exercisesOf('gym', 'chest', 'dumbbell').every(e => eqGroupOf(e) === 'dumbbell')).toBe(true)
    expect(EQ_GROUPS.length).toBeGreaterThanOrEqual(6)
  })
  it('a quick session is repeatable, varied and the right size', () => {
    const a = pickExercises('gym', 'legs', { count: 6, seed: 42 })
    const b = pickExercises('gym', 'legs', { count: 6, seed: 42 })
    const c = pickExercises('gym', 'legs', { count: 6, seed: 43 })
    expect(a.map(e => e.id)).toEqual(b.map(e => e.id))
    expect(a).toHaveLength(6)
    expect(new Set(a.map(e => e.id)).size).toBe(6)
    expect(a.map(e => e.id).join()).not.toBe(c.map(e => e.id).join())
  })
  it('builds a startable routine with a sensible length', () => {
    const r = sessionRoutine('home', 'hiit', pickExercises('home', 'hiit', { seed: 1 }))
    expect(SESSION_NAMES).toContain(r.name)
    expect(r.ex.every(x => x.mode === 'time' && x.sec > 0)).toBe(true)
    const m = sessionMinutes(r)
    expect(m).toBeGreaterThanOrEqual(5); expect(m).toBeLessThan(60)
    const g = sessionRoutine('gym', 'chest', pickExercises('gym', 'chest', { seed: 1 }))
    expect(g.ex.every(x => x.mode === 'time' || x.reps > 0)).toBe(true)
    expect(sessionRoutine('gym', null, [], { picked: true }).name).toBe('My picks at the gym')
  })
  it('suggests by goal', () => {
    expect(suggestion('muscle', 1).mode).toBe('gym')
    expect(suggestion('lose', 0).mode).toBe('home')
    for (let d = 0; d < 7; d++) for (const p of ['lose', 'muscle', 'keep']) {
      const s = suggestion(p, d); expect(CATEGORIES[s.mode].some(c => c.id === s.cat)).toBe(true)
    }
  })
})
