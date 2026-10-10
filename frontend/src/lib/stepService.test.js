import { describe, it, expect } from 'vitest'
import { serviceConfig, serviceStrings, hasStepService } from './stepService.js'
import { IRAQ_TZ } from './liveClock.js'

describe('stepService config', () => {
  it('builds the native config from the profile', () => {
    const c = serviceConfig({ stepGoal: 8000, walk: { haptics: false, voice: true }, heightCm: 180 }, 82)
    expect(c.goal).toBe(8000)
    expect(c.strideM).toBeCloseTo(0.747, 2)
    expect(c.weightKg).toBe(82)
    expect(c.vibrate).toBe(false)
    expect(c.alerts).toBe(true)
    expect(c.sound).toBe(true)
    expect(c.voice).toBe(true)
    expect(c.clockZone).toBe(IRAQ_TZ)
    expect(typeof c.lang).toBe('string')
  })

  it('falls back to 70 kg and respects the sound switches', () => {
    expect(serviceConfig({}, null).weightKg).toBe(70)
    expect(serviceConfig({ sound: false }, 60).sound).toBe(false)
    expect(serviceConfig({ walk: { alertSound: false } }, 60).sound).toBe(false)
  })

  it('ships every string the notification needs, with native placeholders', () => {
    const st = serviceStrings({})
    for (const k of ['channelLive', 'channelAlert', 'todayTitle', 'live', 'paused', 'pause', 'resume', 'open', 'dayLeft', 'goalTitle', 'milestoneTitle'])
      expect(st[k], k).toBeTruthy()
    expect(st.milestoneTitle).toContain('{steps}')
    expect(st.milestoneBody.every(x => x.includes('{left}'))).toBe(true)
    expect(st.goalBody.every(x => x.includes('{steps}'))).toBe(true)
    expect(st.zoneLabel).toBeTruthy()
    expect(serviceStrings({ clockZone: 'device' }).zoneLabel).toBe('')
  })

  it('reports no service outside the Android app', async () => {
    expect(await hasStepService()).toBe(false)
  })
})
