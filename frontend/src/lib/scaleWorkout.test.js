import { describe, it, expect } from 'vitest'
import { weighInOn, scaleStatus, energyOn, setEnergy, intensityFor, setDelta, scaleReasons } from './scaleWorkout.js'
import { planFor } from './dailyPlan.js'
import { explainDrive, sameSha1 } from './googleErrors.js'

const person = (w, over = {}) => ({
  unit: 'kg', heightCm: 175, birthYear: 1996, sex: 'male', bodyweight: [{ d: '2026-10-10', w }],
  stepGoal: 8000, steps: {}, walk: {}, workouts: [], routines: [], week: {}, dayPlan: {}, waterMl: {}, water: {}, ...over,
})

describe('4.1 scale status', () => {
  it('takes the latest weigh-in on or before the day, in kg', () => {
    const S = { unit: 'lb', bodyweight: [{ d: '2026-10-01', w: 220 }, { d: '2026-10-12', w: 200 }, { d: '2026-10-20', w: 190 }] }
    expect(weighInOn(S, '2026-10-15')).toEqual({ kg: 90.7, d: '2026-10-12' })
    expect(weighInOn(S, '2026-09-01')).toBe(null)
  })
  it('a big gap above the ideal weight is a high-urgency loss day', () => {
    const st = scaleStatus(person(110), '2026-10-17')
    expect(st.goal).toBe('lose')
    expect(st.urgency).toBe('high')
    expect(st.toIdeal).toBeGreaterThan(15)
    expect(st.ago).toBe(7)
    expect(st.stale).toBe(false)
  })
  it('medium and low urgency by the distance', () => {
    const ideal = scaleStatus(person(80), '2026-10-10').ideal
    expect(scaleStatus(person(ideal + 9), '2026-10-10').urgency).toBe('medium')
    expect(scaleStatus(person(ideal), '2026-10-10')).toMatchObject({ goal: 'keep', urgency: 'low' })
    expect(scaleStatus(person(ideal - 14), '2026-10-10').goal).toBe('gain')
  })
  it('without a height, the target weight decides (±2 kg)', () => {
    const S = { unit: 'kg', targetW: 70, bodyweight: [{ d: '2026-10-10', w: 77 }] }
    expect(scaleStatus(S, '2026-10-10')).toMatchObject({ goal: 'lose', urgency: 'medium', ideal: null, toTarget: 7 })
    expect(scaleStatus({ ...S, bodyweight: [{ d: '2026-10-10', w: 71 }] }, '2026-10-10').goal).toBe('keep')
  })
  it('an old weigh-in is stale and asks for a new one', () => {
    const st = scaleStatus(person(90), '2026-10-25')
    expect(st.stale).toBe(true)
    expect(scaleReasons(st).map(r => r.key)).toContain('Your last weigh-in was {0} days ago — step on the scale for a sharper plan.')
    expect(scaleReasons(null)[0].key).toMatch(/^Weigh yourself/)
  })
})

describe('4.1 energy, intensity and sets', () => {
  it('stores the day’s energy and keeps 30 days', () => {
    const s = {}
    for (let i = 1; i <= 35; i++) setEnergy(s, '2026-09-' + String(i).padStart(2, '0'), 'high')
    expect(Object.keys(s.energy)).toHaveLength(30)
    setEnergy(s, '2026-09-35', 'normal')
    expect(energyOn(s, '2026-09-35')).toBe('normal')
    expect(energyOn(s, '2026-09-20')).toBe('high')
  })
  it('intensity follows the kind of day, the urgency and the energy', () => {
    expect(intensityFor('walk', 'low', 'normal')).toBe('low')
    expect(intensityFor('lower', 'high', 'normal')).toBe('high')
    expect(intensityFor('hiit', 'low', 'low')).toBe('medium')
    expect(intensityFor('recover', 'high', 'high')).toBe('very_low')
  })
  it('sets: +1 for a big loss at home, −1 when tired, never on recovery or own routines', () => {
    expect(setDelta({ kind: 'lower', gym: false, urgency: 'high', energy: 'normal', goal: 'lose' })).toBe(1)
    expect(setDelta({ kind: 'lower', gym: false, urgency: 'high', energy: 'low', goal: 'lose' })).toBe(0)
    expect(setDelta({ kind: 'push', gym: true, urgency: 'high', energy: 'low', goal: 'lose' })).toBe(-1)
    expect(setDelta({ kind: 'recover', urgency: 'high', energy: 'high', goal: 'lose' })).toBe(0)
    expect(setDelta({ kind: 'routine', energy: 'high' })).toBe(0)
  })
  it('planFor carries the scale, the reason and the intensity — and tired days get fewer sets', () => {
    const iso = '2026-10-12'                                     // a Monday: lower body on the loss plan
    const S = person(110, { planOn: true })
    const p = planFor(S, iso)
    expect(p.scale.goal).toBe('lose')
    expect(p.reasons[0].key).toMatch(/above your ideal weight/)
    expect(['low', 'medium', 'high', 'very_low']).toContain(p.intensity)
    const tired = planFor({ ...S, energy: { [iso]: 'low' } }, iso)
    const sum = x => x.exercises.reduce((a, e) => a + e.sets, 0)
    expect(tired.energy).toBe('low')
    expect(sum(tired)).toBeLessThanOrEqual(sum(p))
  })
})

describe('4.1 Google answers, explained', () => {
  it('maps every code to a reason and a fix', () => {
    expect(explainDrive({ code: 'API_DISABLED', reason: 'setup' }).kind).toBe('setup')
    expect(explainDrive({ code: 'AUTH', msg: 'UNREGISTERED_ON_API_CONSOLE' }).kind).toBe('setup')
    expect(explainDrive({ code: '10' }).kind).toBe('setup')
    expect(explainDrive({ reason: 'consent' }).kind).toBe('consent')
    expect(explainDrive({ code: 'HTTP_403' }).kind).toBe('refused')
    expect(explainDrive({ code: '7' }).kind).toBe('network')
    expect(explainDrive({ code: 'HTTP_500' }).kind).toBe('other')
    expect(explainDrive({})).toBe(null)
  })
  it('compares SHA-1 fingerprints in any format', () => {
    expect(sameSha1('8f72139b43d829da2a00a32ab6a53c9020c41d76', '8F:72:13:9B:43:D8:29:DA:2A:00:A3:2A:B6:A5:3C:90:20:C4:1D:76')).toBe(true)
    expect(sameSha1('', '')).toBe(false)
    expect(sameSha1('AA:BB', 'AA:BC')).toBe(false)
  })
})
