// The step counter's start must always end — never a permanent "Starting…" — and starts that
// overlap (launch-time reattach + a tap in the first-launch dialog) must share one attempt.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mem = new Map()
globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }
globalThis.window ??= globalThis
const noop = () => {}
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }

const startSource = vi.fn()
vi.mock('../lib/pedometer.js', () => ({
  startSource: (...a) => startSource(...a),
  watchGpsSpeed: () => () => {},
  preferredSource: () => 'native',
}))

const { usePedometer, maxStepsIn } = await import('./usePedometer.js')
const { useStore } = await import('./useStore.js')
const { todayISO } = await import('../lib/format.js')

const fakeSource = () => ({ kind: 'native', stop: vi.fn() })

beforeEach(async () => {
  startSource.mockReset()
  await usePedometer.getState().stop()
})
afterEach(() => { vi.useRealTimers() })

describe('usePedometer.start', () => {
  it('starts and reports tracking', async () => {
    startSource.mockResolvedValue(fakeSource())
    expect(await usePedometer.getState().start({ interactive: true })).toBe(true)
    expect(usePedometer.getState().status).toBe('tracking')
  })

  it('never stays "starting": a hung start ends in an error the button can retry', async () => {
    vi.useFakeTimers()
    startSource.mockReturnValue(new Promise(() => {}))
    const p = usePedometer.getState().start({ interactive: false })
    expect(usePedometer.getState().status).toBe('starting')
    await vi.advanceTimersByTimeAsync(31000)
    expect(await p).toBe(false)
    expect(usePedometer.getState().status).toBe('error')
    // and a new tap really starts again
    vi.useRealTimers()
    startSource.mockResolvedValue(fakeSource())
    expect(await usePedometer.getState().start({ interactive: true })).toBe(true)
    expect(usePedometer.getState().status).toBe('tracking')
  })

  it('adopts a start that finishes after the time limit', async () => {
    vi.useFakeTimers()
    let finish
    startSource.mockReturnValue(new Promise(r => { finish = r }))
    const p = usePedometer.getState().start({ interactive: false })
    await vi.advanceTimersByTimeAsync(31000)
    expect(await p).toBe(false)
    finish(fakeSource())
    await vi.advanceTimersByTimeAsync(10)
    expect(usePedometer.getState().status).toBe('tracking')
  })

  it('overlapping starts share one attempt', async () => {
    let finish
    startSource.mockReturnValue(new Promise(r => { finish = r }))
    const a = usePedometer.getState().start({ interactive: true })
    const b = usePedometer.getState().start({ interactive: true })
    finish(fakeSource())
    expect(await a).toBe(true)
    expect(await b).toBe(true)
    expect(startSource).toHaveBeenCalledTimes(1)
  })

  it('a tap after a failed launch-time start gets its own try (with permission prompts)', async () => {
    let fail
    startSource.mockReturnValueOnce(new Promise((_, rej) => { fail = rej }))
    const launch = usePedometer.getState().start({ interactive: false })
    startSource.mockResolvedValueOnce(fakeSource())
    const tap = usePedometer.getState().start({ interactive: true })
    fail(Object.assign(new Error('denied'), { code: 'denied' }))
    expect(await launch).toBe(false)
    expect(await tap).toBe(true)
    expect(startSource).toHaveBeenCalledTimes(2)
    expect(startSource.mock.calls[1][0].interactive).toBe(true)
    expect(usePedometer.getState().status).toBe('tracking')
  })

  it('maps denied / unsupported errors to their status', async () => {
    startSource.mockRejectedValue(Object.assign(new Error('x'), { code: 'denied' }))
    expect(await usePedometer.getState().start({ interactive: true })).toBe(false)
    expect(usePedometer.getState().status).toBe('denied')
  })
})

// A source that hands its callbacks to the test, so it can play the sensor.
const startWithHooks = async () => {
  let hooks
  startSource.mockImplementation(async opts => { hooks = opts; return fakeSource() })
  expect(await usePedometer.getState().start({ interactive: true })).toBe(true)
  return hooks
}
const live = () => useStore.getState().S.steps?.[todayISO()]?.n || 0
const shown = () => live() + usePedometer.getState().pending

describe('step plausibility (no sudden jumps)', () => {
  it('caps a batch at what a person can walk in the time', () => {
    expect(maxStepsIn(0)).toBe(40)
    expect(maxStepsIn(1000)).toBe(44)
    expect(maxStepsIn(60000)).toBe(280)
  })

  it('ignores a sensor glitch of thousands of steps — 70 stays 70, not 24,303', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-10-10T09:00:00'))
    const { onSteps } = await startWithHooks()
    const before = shown()
    for (let i = 0; i < 7; i++) { vi.setSystemTime(Date.now() + 5000); onSteps(10) }
    expect(shown() - before).toBe(70)
    vi.setSystemTime(Date.now() + 1000)
    onSteps(24233)                                        // the reboot-baseline glitch
    expect(shown() - before).toBe(70)
    vi.setSystemTime(Date.now() + 2000)
    onSteps(3)                                            // and counting goes on normally
    expect(shown() - before).toBe(73)
    onSteps(0); onSteps(-5); onSteps(NaN)                 // nonsense is dropped
    expect(shown() - before).toBe(73)
  })
})

describe('reset the step counter', () => {
  it('resetDay() puts today back to 0 and keeps counting from there', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-10-10T10:00:00'))
    const { onSteps } = await startWithHooks()
    vi.setSystemTime(Date.now() + 10000); onSteps(30)
    expect(shown()).toBeGreaterThan(0)
    expect(await usePedometer.getState().resetDay()).toBe(true)
    expect(shown()).toBe(0)
    expect(usePedometer.getState().sessionSteps).toBe(0)
    expect(usePedometer.getState().status).toBe('tracking')
    vi.setSystemTime(Date.now() + 3000); onSteps(5)
    expect(shown()).toBe(5)
  })

  it('resetDay(day) clears an earlier day only', async () => {
    useStore.getState().update(s => { s.steps = { ...(s.steps || {}), '2026-10-01': { n: 24303 }, '2026-10-02': { n: 6000 } } })
    await usePedometer.getState().resetDay('2026-10-01')
    const steps = useStore.getState().S.steps
    expect(steps['2026-10-01']).toBeUndefined()
    expect(steps['2026-10-02'].n).toBe(6000)
  })

  it('newWalk() restarts the walk counter, not the day', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-10-10T11:00:00'))
    const { onSteps } = await startWithHooks()
    vi.setSystemTime(Date.now() + 10000); onSteps(20)
    const day = shown()
    usePedometer.getState().newWalk()
    expect(usePedometer.getState().sessionSteps).toBe(0)
    expect(shown()).toBe(day)
  })
})
