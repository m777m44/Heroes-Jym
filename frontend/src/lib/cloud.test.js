import { describe, it, expect, vi, beforeEach } from 'vitest'

// A fake phone: the GoogleAccount plugin and Google Drive's app-data folder, in memory.
const mem = new Map()
const noop = () => {}
globalThis.window ??= globalThis
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }

const plug = {
  isAvailable: vi.fn(async () => ({ available: true })),
  signIn: vi.fn(async () => ({ signedIn: true, email: 'mahdi@gmail.com', name: 'Mahdi', photo: null })),
  signOut: vi.fn(async () => ({})),
  disconnect: vi.fn(async () => ({})),
  getToken: vi.fn(async () => ({ token: 'tok-1' })),
}
vi.mock('./mobile.js', () => ({ MOBILE: true }))
// Like Capacitor's real plugin proxy: EVERY property is a native call — `then` too, which
// never calls back. Awaiting the proxy itself therefore hangs (the 2.6.0 sign-in bug).
const capacitorProxy = impl => new Proxy({}, {
  get: (_, prop) => (prop in impl ? impl[prop] : () => new Promise(() => {})),
})
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android', isPluginAvailable: () => true },
  registerPlugin: () => capacitorProxy(plug),
}))

let file = null        // { id, ts, body }
let expired = false
globalThis.fetch = vi.fn(async (url, opts = {}) => {
  const ok = j => ({ ok: true, status: 200, json: async () => j })
  if (expired && opts.headers.Authorization === 'Bearer tok-1') return { ok: false, status: 401, json: async () => ({}) }
  if (url.includes('/upload/')) {
    const parts = opts.body.split(/\r\n\r\n/)
    const meta = JSON.parse(parts[1].split('\r\n')[0])
    const body = JSON.parse(parts[2].split('\r\n')[0])
    file = { id: file ? file.id : 'f1', ts: Number(meta.appProperties.ts), body }
    return ok({ id: file.id })
  }
  if (url.includes('alt=media')) return ok(file.body)
  if (url.includes('/files?')) return ok({ files: file ? [{ id: file.id, modifiedTime: new Date(file.ts).toISOString(), appProperties: { ts: String(file.ts) } }] : [] })
  return { ok: false, status: 404, json: async () => ({}) }
})

const cloud = await import('./cloud.js')

function fakeStore(S) {
  const st = { S }
  st.replaceState = s => { st.S = { ...s, _ts: Date.now() } }
  return { getState: () => st, subscribe: () => () => {} }
}
const data = (n, ts) => ({ _ts: ts, workouts: Array.from({ length: n }, (_, i) => ({ d: '2026-10-0' + (i + 1) })) })

beforeEach(() => { mem.clear(); file = null; expired = false })

describe('cloud — where your data is kept', () => {
  it('asks once: phone, skip or Google', async () => {
    expect(cloud.storageChosen()).toBe(false)
    cloud.choosePhone(true)
    expect(cloud.cloudMeta().mode).toBe('skip')
    expect(cloud.storageChosen()).toBe(true)
    expect(cloud.signedInGoogle()).toBe(false)
    expect(await cloud.googleAvailable()).toBe(true)
  })
  it('turns plugin errors into reasons', () => {
    expect(cloud.reasonOf({ code: '12501' })).toBe('cancelled')
    expect(cloud.reasonOf({ code: '10' })).toBe('setup')
    expect(cloud.reasonOf({ code: '7' })).toBe('network')
    expect(cloud.reasonOf({ message: 'No network connection' })).toBe('network')
    expect(cloud.reasonOf({ code: 'CONSENT' })).toBe('consent')
    expect(cloud.reasonOf(null)).toBe('failed')
  })
  it('signs in with the chosen account, auto-save on', async () => {
    const a = await cloud.signInGoogle()
    expect(a).toEqual({ email: 'mahdi@gmail.com', name: 'Mahdi', photo: null })
    expect(cloud.signedInGoogle()).toBe(true)
    expect(cloud.autoSaveOn()).toBe(true)
  })
  it('cancelling the chooser changes nothing', async () => {
    plug.signIn.mockRejectedValueOnce({ code: '12501', message: 'cancelled' })
    await expect(cloud.signInGoogle()).rejects.toMatchObject({ reason: 'cancelled' })
    expect(cloud.storageChosen()).toBe(false)
  })
})

describe('cloud — the plugin proxy is never awaited (2.6.0 hang)', () => {
  it('answers availability and opens the chooser even though proxy.then never resolves', async () => {
    const quick = p => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('hung')), 1000))])
    expect(await quick(cloud.googleAvailable())).toBe(true)
    plug.signIn.mockClear()
    await quick(cloud.signInGoogle())
    expect(plug.signIn).toHaveBeenCalledTimes(1)
  })
})

describe('cloud — keeping the account in step', () => {
  it('first sign-in: uploads when the account is empty', async () => {
    await cloud.signInGoogle()
    const store = fakeStore(data(2, 100))
    expect(await cloud.firstSync(store)).toBe('uploaded')
    expect(file.body).toMatchObject({ app: 'MAHDI-JYM', v: 1, S: { workouts: [{}, {}] } })
    expect(file.ts).toBe(100)
  })
  it('first sign-in on a new phone: restores the account’s copy', async () => {
    file = { id: 'f9', ts: 500, body: { app: 'MAHDI-JYM', v: 1, S: data(3, 500) } }
    await cloud.signInGoogle()
    const store = fakeStore({ _ts: 1, workouts: [] })
    expect(await cloud.firstSync(store)).toBe('restored')
    expect(store.getState().S.workouts).toHaveLength(3)
    expect(cloud.previousCopy().S.workouts).toEqual([])
  })
  it('both sides hold data: lets you choose, then does what you chose', async () => {
    file = { id: 'f9', ts: 500, body: { app: 'MAHDI-JYM', v: 1, S: data(3, 500) } }
    await cloud.signInGoogle()
    const store = fakeStore(data(1, 900))
    expect(await cloud.firstSync(store)).toBe('choose')
    expect(await cloud.resolveChoice(store, 'phone')).toBe('uploaded')
    expect(file.body.S.workouts).toHaveLength(1)
    expect(await cloud.resolveChoice(store, 'account')).toBe('restored')
  })
  it('later rounds: upload local changes, download remote ones, newer wins', async () => {
    await cloud.signInGoogle()
    const store = fakeStore(data(1, 100))
    await cloud.firstSync(store)
    expect(await cloud.syncNow(store)).toBe('idle')
    store.getState().S = data(2, 200)                         // changed here
    expect(await cloud.syncNow(store)).toBe('uploaded')
    expect(file.body.S.workouts).toHaveLength(2)
    file = { ...file, ts: 300, body: { ...file.body, S: data(4, 300) } }   // changed on another phone
    expect(await cloud.syncNow(store)).toBe('restored')
    expect(store.getState().S.workouts).toHaveLength(4)
    expect(await cloud.syncNow(store)).toBe('idle')
    // the replaced copy can be brought back
    expect(cloud.restorePrevious(store)).toBe(true)
    expect(store.getState().S.workouts).toHaveLength(2)
  })
  it('refreshes an expired token once', async () => {
    await cloud.signInGoogle()
    const store = fakeStore(data(1, 100))
    await cloud.firstSync(store)
    expired = true
    plug.getToken.mockResolvedValueOnce({ token: 'tok-2' })
    store.getState().S = data(2, 200)
    expect(await cloud.syncNow(store)).toBe('uploaded')
    expect(plug.getToken).toHaveBeenLastCalledWith({ stale: 'tok-1' })
  })
  it('records the reason when a round fails, and does nothing signed out', async () => {
    await cloud.signInGoogle()
    fetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    await expect(cloud.syncNow(fakeStore(data(1, 1)))).rejects.toMatchObject({ reason: 'network' })
    expect(cloud.cloudMeta().error).toBe('network')
    await cloud.signOutGoogle()
    expect(await cloud.syncNow(fakeStore(data(1, 1)))).toBe('off')
    expect(cloud.cloudMeta()).toMatchObject({ mode: 'phone', account: null })
  })
})
