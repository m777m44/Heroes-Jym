import { describe, it, expect } from 'vitest'
import { StepDetector, CONFIRM } from './stepDetection.js'

const G = 9.81
const HZ = 60

// A walk: vertical acceleration oscillating at the step frequency, plus a little sideways
// sway, sampled at HZ. `amp` in m/s² — 2–4 is a phone in a pocket.
function walk(det, { seconds, freq = 1.8, amp = 3, t0 = 0, noise = 0, seed = 1 }) {
  let n = 0, r = seed
  const rnd = () => { r = (r * 16807) % 2147483647; return (r / 2147483647 - 0.5) * 2 }
  for (let i = 0; i < seconds * HZ; i++) {
    const t = t0 + i * 1000 / HZ
    const ph = 2 * Math.PI * freq * t / 1000
    n += det.push(0.6 * Math.sin(ph / 2) + noise * rnd(), noise * rnd(), G + amp * Math.sin(ph) + noise * rnd(), t)
  }
  return n
}
function still(det, { seconds, t0 = 0, noise = 0.15, seed = 7 }) {
  let n = 0, r = seed
  const rnd = () => { r = (r * 16807) % 2147483647; return (r / 2147483647 - 0.5) * 2 }
  for (let i = 0; i < seconds * HZ; i++) {
    const t = t0 + i * 1000 / HZ
    n += det.push(noise * rnd(), noise * rnd(), G + noise * rnd(), t)
  }
  return n
}

describe('StepDetector', () => {
  it('counts a steady walk to within a step or two', () => {
    const det = new StepDetector()
    const n = walk(det, { seconds: 20, freq: 1.8 })   // 36 steps
    expect(n).toBeGreaterThanOrEqual(34)
    expect(n).toBeLessThanOrEqual(37)
    expect(det.total).toBe(n)
  })

  it('follows a brisk and a slow pace', () => {
    expect(walk(new StepDetector(), { seconds: 30, freq: 2.4, amp: 4 })).toBeGreaterThanOrEqual(69)  // 72
    expect(walk(new StepDetector(), { seconds: 30, freq: 1.2, amp: 2.2 })).toBeGreaterThanOrEqual(33) // 36
  })

  it('still counts through sensor noise', () => {
    const n = walk(new StepDetector(), { seconds: 20, freq: 2, noise: 0.4 })   // 40
    expect(n).toBeGreaterThanOrEqual(37)
    expect(n).toBeLessThanOrEqual(41)
  })

  it('counts nothing for a phone lying still', () => {
    expect(still(new StepDetector(), { seconds: 30 })).toBe(0)
  })

  it('ignores a short shake — fewer peaks than it takes to confirm a walk', () => {
    const det = new StepDetector()
    const n = still(det, { seconds: 2 }) + walk(det, { seconds: (CONFIRM - 1) / 2, freq: 2, t0: 2000 }) + still(det, { seconds: 5, t0: 3500 })
    expect(n).toBe(0)
  })

  it('credits the buffered steps once a walk confirms, so the first steps are not lost', () => {
    const det = new StepDetector()
    const counts = []
    for (let i = 0; i < 3 * HZ; i++) {
      const t = i * 1000 / HZ
      counts.push(det.push(0, 0, G + 3 * Math.sin(2 * Math.PI * 2 * t / 1000), t))
    }
    expect(Math.max(...counts)).toBe(CONFIRM)
  })

  it('re-confirms after a pause, without counting the pause', () => {
    const det = new StepDetector()
    const a = walk(det, { seconds: 10, freq: 2 })
    const pause = still(det, { seconds: 5, t0: 10000 })
    const b = walk(det, { seconds: 10, freq: 2, t0: 15000 })
    expect(pause).toBe(0)
    expect(a + b).toBeGreaterThanOrEqual(37)
    expect(a + b).toBeLessThanOrEqual(41)
  })

  it('shrugs off garbage samples', () => {
    const det = new StepDetector()
    expect(det.push(NaN, 0, G, 0)).toBe(0)
    expect(det.push(0, null, G, 10)).toBe(0)
    expect(walk(det, { seconds: 10, freq: 2 })).toBeGreaterThanOrEqual(18)
  })
})
