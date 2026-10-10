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

const { usePedometer } = await import('./usePedometer.js')

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
