// Regression tests for the Android bridge with a plugin object that behaves like Capacitor's:
// a Proxy that answers *every* property — `then` included — and never calls back for methods
// the native side doesn't have. Resolving a promise with such an object hangs forever; that
// was the 2.1/2.2 bug behind the "Starting…" status that never ended and the first-launch
// permission dialog that never closed.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./mobile.js', async importOriginal => ({ ...(await importOriginal()), MOBILE: true }))

const native = {}
const capacitorLikeProxy = new Proxy({}, {
  get(_, prop) {
    if (prop === '$$typeof') return undefined
    if (prop === 'toJSON') return () => ({})
    // Like Capacitor: a wrapper for any name; unknown methods reject without touching the
    // callbacks they were handed (so `proxy.then(resolve, reject)` never settles).
    return (...args) => (native[prop] ? native[prop](...args) : Promise.reject(new Error(`"StepService.${String(prop)}()" is not implemented`)))
  },
})

vi.mock('@capacitor/core', () => ({
  registerPlugin: () => capacitorLikeProxy,
  Capacitor: { getPlatform: () => 'android', isPluginAvailable: n => n === 'StepService' },
}))

const svc = await import('./stepService.js')

const GRANTED = { activityRecognition: 'granted', notifications: 'granted' }

beforeEach(() => {
  for (const k of Object.keys(native)) delete native[k]
  native.isAvailable = async () => ({ stepCounter: true, stepDetector: true })
  native.getPermissionStatus = async () => ({ activityRecognition: 'prompt', notifications: 'prompt' })
  native.requestPermissions = async () => GRANTED
  native.getState = async () => ({ running: true, steps: 42, day: '2026-10-10' })
  native.addListener = async () => ({ remove() {} })
})
afterEach(() => { vi.useRealTimers() })

describe('stepService bridge with a thenable Capacitor proxy', () => {
  it('finds the service instead of hanging on the proxy', async () => {
    await expect(svc.withTimeout(svc.hasStepService(), 500)).resolves.toBe(true)
  })

  it('calls plugin methods', async () => {
    await expect(svc.withTimeout(svc.call('getState'), 500)).resolves.toMatchObject({ steps: 42 })
    await expect(svc.withTimeout(svc.serviceAvailable(), 500)).resolves.toMatchObject({ stepCounter: true })
  })

  it('asks for missing permissions only when interactive', async () => {
    let asked = 0
    native.requestPermissions = async () => { asked++; return GRANTED }
    expect((await svc.servicePermissions(false)).activityRecognition).toBe('prompt')
    expect(asked).toBe(0)
    expect(await svc.servicePermissions(true)).toEqual(GRANTED)
    expect(asked).toBe(1)
  })

  it("'activity' mode doesn't ask again just for notifications", async () => {
    let asked = 0
    native.getPermissionStatus = async () => ({ activityRecognition: 'granted', notifications: 'denied' })
    native.requestPermissions = async () => { asked++; return GRANTED }
    expect((await svc.servicePermissions('activity')).activityRecognition).toBe('granted')
    expect(asked).toBe(0)
  })

  it('times out a native call that never answers', async () => {
    vi.useFakeTimers()
    native.getState = () => new Promise(() => {})
    native.start = () => new Promise(() => {})
    const quick = svc.call('getState')
    const start = svc.call('start', {}).catch(e => e)
    await vi.advanceTimersByTimeAsync(16000)
    await expect(quick).resolves.toBe(null)
    expect((await start).code).toBe('timeout')
  })

  it('reports denied permissions when the status call fails', async () => {
    native.getPermissionStatus = async () => { throw new Error('boom') }
    native.requestPermissions = async () => { throw new Error('boom') }
    expect((await svc.servicePermissions(true)).activityRecognition).toBe('denied')
  })

  it('subscribes to events and unsubscribes safely', async () => {
    let removed = false
    native.addListener = async () => ({ remove() { removed = true } })
    const off = await svc.onServiceEvent('steps', () => {})
    off()
    expect(removed).toBe(true)
  })
})
