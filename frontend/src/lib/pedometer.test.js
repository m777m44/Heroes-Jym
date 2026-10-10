// The plugin path (Android without the native service, iPhone): cumulative counts → steps.
import { describe, it, expect } from 'vitest'

globalThis.window ??= globalThis
const mem = new Map()
globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }

const { stepDeltas } = await import('./pedometer.js')
const run = (xs) => { const f = stepDeltas(); return xs.map(f) }

describe('stepDeltas', () => {
  it('the first reading is only a baseline (a big carried-over total adds nothing)', () => {
    expect(run([24233, 24240, 24250])).toEqual([0, 7, 10])
    expect(run([12, 20])).toEqual([12, 8])                 // a small first batch counts
  })

  it('a stray low reading does not turn the next one into thousands of steps', () => {
    // 70 steps, the sensor blips to 0, then reports its real total again
    expect(run([24233, 24303, 0, 24310])).toEqual([0, 70, 0, 7])
  })

  it('a real restart (low twice) keeps counting from the new start', () => {
    expect(run([500, 520, 3, 10, 25])).toEqual([0, 20, 0, 7, 15])
  })

  it('ignores nonsense', () => {
    expect(run([100, NaN, -1, Infinity, 110])).toEqual([0, 0, 0, 0, 10])
  })
})
