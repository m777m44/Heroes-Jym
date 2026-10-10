import { describe, it, expect } from 'vitest'
import { parsePlan, buildPlanBundle } from './plan-share.js'

// A custom exercise travels with the file, so these tests don't depend on the built-in dataset.
const custom = { id: 'c_bench', name: 'Bench', part: 'chest' }
const file = key => ({ [key]: 1, name: ' Push day ', week: { 1: 'r1' }, customEx: [custom],
  routines: [{ id: 'r1', name: 'Push', ex: [{ id: 'c_bench', sets: 3 }, { id: 'nope_123', sets: 3 }] }] })

describe('plan files', () => {
  it('exports under the MAHDI-JYM key', () => {
    const b = buildPlanBundle({ routines: [], week: {}, customEx: [] }, 'x')
    expect(b.mahdijym_plan).toBeTruthy()
    expect(b.opengym_plan).toBeUndefined()
  })
  it('imports MAHDI-JYM plan files', () => {
    const p = parsePlan(JSON.stringify(file('mahdijym_plan')))
    expect(p.name).toBe('Push day')
    expect(p.routineCount).toBe(1)
    expect(p.exerciseCount).toBe(1)   // the unknown id is dropped …
    expect(p.dropped).toBe(1)         // … and counted
    expect(p.scheduledDays).toBe(1)
  })
  it('still imports plan files shared from upstream openGym', () => {
    const p = parsePlan(file('opengym_plan'))
    expect(p.routineCount).toBe(1)
    expect(p.routines[0].ex[0].id).toBe('c_bench')
  })
  it('rejects anything else', () => {
    expect(() => parsePlan({ routines: [] })).toThrow()
    expect(() => parsePlan({ some_plan: 1, routines: [] })).toThrow()
  })
})
