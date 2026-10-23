import { describe, it, expect } from 'vitest'
import { platesFor, groupPlates, repsAtPct, pctTable, roundLoad } from './plates.js'

describe('plates', () => {
  it('loads 100 kg on a 20 kg bar as 25+15 per side', () => {
    const r = platesFor(100, 20)
    expect(r.side).toEqual([25, 15])
    expect(r.total).toBe(100)
    expect(r.rest).toBe(0)
  })
  it('handles small jumps and leftovers', () => {
    expect(platesFor(62.5, 20).side).toEqual([20, 1.25])
    expect(platesFor(61, 20).rest).toBe(1)
  })
  it('bar-only and lb', () => {
    expect(platesFor(15, 20)).toEqual({ side: [], total: 20, rest: 0 })
    expect(platesFor(225, 45, 'lb').side).toEqual([45, 45])
  })
  it('groups plates', () => {
    expect(groupPlates([20, 20, 5])).toEqual([{ p: 20, n: 2 }, { p: 5, n: 1 }])
  })
  it('percent table', () => {
    expect(repsAtPct(100)).toBe(1)
    expect(repsAtPct(75)).toBe(10)
    const tb = pctTable(100)
    expect(tb[0]).toEqual({ pct: 100, w: 100, reps: 1 })
    expect(tb.find(x => x.pct === 85).w).toBe(85)
    expect(roundLoad(83.4)).toBe(82.5)
    expect(pctTable(0)).toEqual([])
  })
})
