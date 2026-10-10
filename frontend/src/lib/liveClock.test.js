import { describe, it, expect } from 'vitest'
import {
  IRAQ_TZ, clockZoneOf, timeIn, hhmmss, dateLine, hijriLine, zoneOffsetLabel, msToMidnight, dayProgress,
  splitDuration, fmtDuration, stepsPerHourNeeded, motivationTier,
} from './liveClock.js'

describe('liveClock', () => {
  it('defaults the clock to Baghdad, device only when chosen', () => {
    expect(clockZoneOf({})).toBe(IRAQ_TZ)
    expect(clockZoneOf(null)).toBe(IRAQ_TZ)
    expect(clockZoneOf({ clockZone: 'iraq' })).toBe(IRAQ_TZ)
    expect(typeof clockZoneOf({ clockZone: 'device' })).toBe('string')
  })

  it('reads the wall time in Baghdad (UTC+3, no DST)', () => {
    const d = new Date(Date.UTC(2026, 9, 10, 21, 4, 7))   // 21:04:07 UTC
    expect(timeIn(d, IRAQ_TZ)).toEqual({ h: 0, m: 4, s: 7 }) // just past midnight in Baghdad
    expect(hhmmss(timeIn(d, IRAQ_TZ))).toBe('00:04:07')
    const summer = new Date(Date.UTC(2026, 6, 1, 12, 0, 0))
    expect(timeIn(summer, IRAQ_TZ).h).toBe(15)
    expect(timeIn(d, 'UTC')).toEqual({ h: 21, m: 4, s: 7 })
    expect(zoneOffsetLabel(d, IRAQ_TZ)).toBe('GMT+3')
  })

  it('formats the date lines in the requested locale and zone', () => {
    const d = new Date(Date.UTC(2026, 9, 10, 21, 30, 0))   // already Sunday 11 October in Baghdad
    expect(dateLine(d, IRAQ_TZ, 'en-GB')).toMatch(/Sunday.*11 October 2026/)
    expect(dateLine(d, 'UTC', 'en-GB')).toMatch(/Saturday.*10 October 2026/)
    const h = hijriLine(d, IRAQ_TZ, 'en')
    if (h) expect(h).toMatch(/AH|144[78]/)   // engines without the calendar return ''
  })

  it('counts down to local midnight and tracks the day', () => {
    const d = new Date(2026, 9, 10, 18, 30, 15)
    expect(msToMidnight(d)).toBe(((5 * 60 + 29) * 60 + 45) * 1000)
    expect(dayProgress(new Date(2026, 9, 10, 12, 0, 0))).toBeCloseTo(0.5, 2)
    expect(dayProgress(new Date(2026, 9, 10, 0, 0, 0))).toBe(0)
  })

  it('splits and formats durations', () => {
    expect(splitDuration(3723000)).toEqual({ h: 1, m: 2, s: 3 })
    expect(splitDuration(-5)).toEqual({ h: 0, m: 0, s: 0 })
    expect(splitDuration(26 * 3600000).h).toBe(26)
    expect(fmtDuration(129000)).toBe('02:09')
    expect(fmtDuration(129000, { alwaysHours: true })).toBe('0:02:09')
    expect(fmtDuration(3723000)).toBe('1:02:03')
  })

  it('works out the pace still needed', () => {
    expect(stepsPerHourNeeded(4000, 10000, 6 * 3600000)).toBe(1000)
    expect(stepsPerHourNeeded(10000, 10000, 3600000)).toBe(0)
    expect(stepsPerHourNeeded(12000, 10000, 3600000)).toBe(0)
    // under 15 minutes left: the whole remainder, not an absurd hourly rate
    expect(stepsPerHourNeeded(9000, 10000, 60000)).toBe(4000)
  })

  it('picks the motivation tier', () => {
    expect(motivationTier(0, 10000)).toBe(0)
    expect(motivationTier(1500, 10000)).toBe(1)
    expect(motivationTier(5000, 10000)).toBe(2)
    expect(motivationTier(7500, 10000)).toBe(3)
    expect(motivationTier(9500, 10000)).toBe(4)
    expect(motivationTier(10000, 10000)).toBe(5)
    expect(motivationTier(500, 0)).toBe(0)
  })
})
