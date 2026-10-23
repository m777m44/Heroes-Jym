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
  // the Android Backup copy (files/mj-backup.json)
  saveBackup: vi.fn(async ({ data }) => { backupFile = data; return { savedAt: Date.now() } }),
  readBackup: vi.fn(async () => ({ data: backupFile, savedAt: 1234 })),
  clearBackup: vi.fn(async () => { backupFile = null }),
}
let backupFile = null
vi.mock('./mobile.js', () => ({ MOBILE: true }))
// Like Capacitor's real plugin proxy: EVERY property is a native call — `then` too, which
// never calls back. Awaiting the proxy itself therefore hangs (the 2.6.0 sign-in bug).
const capacitorProxy = impl => new Proxy({}, {
  get: (_, prop) => (prop in impl ? impl[prop] : () => new Promise(() => {})),
})
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android', isPluginAvailable: () => true },
  registerPlugin: name => capacitorProxy(name === 'DriveFile' ? {} : plug),
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
  if (url.includes('/about?')) return ok({ user: { displayName: 'Mahdi M.', photoLink: 'https://lh3/p.jpg', emailAddress: 'mahdi@gmail.com' } })
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

beforeEach(() => { mem.clear(); file = null; expired = false; backupFile = null })

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
    expect(plug.getToken).toHaveBeenLastCalledWith(expect.objectContaining({ stale: 'tok-1', ask: false, email: 'mahdi@gmail.com' }))
  })
  it('records the reason when a round fails, and does nothing signed out', async () => {
    await cloud.signInGoogle()
    await cloud.firstSync(fakeStore(data(1, 1)))
    fetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    await expect(cloud.syncNow(fakeStore(data(1, 1)))).rejects.toMatchObject({ reason: 'network' })
    expect(cloud.cloudMeta().error).toBe('network')
    await cloud.signOutGoogle()
    expect(await cloud.syncNow(fakeStore(data(1, 1)))).toBe('off')
    expect(cloud.cloudMeta()).toMatchObject({ mode: 'phone', account: null })
  })
})

describe('cloud — signing in works without any Google Cloud setup (2.8)', () => {
  const unregistered = () => plug.getToken.mockRejectedValue({ code: '10', message: 'UNREGISTERED_ON_API_CONSOLE' })
  const registered = () => plug.getToken.mockResolvedValue({ token: 'tok-1' })

  it('Drive not set up: still signed in, saved through Android Backup — no error', async () => {
    unregistered()
    await cloud.signInGoogle()
    const store = fakeStore(data(2, 100))
    expect(await cloud.firstSync(store)).toBe('backup')
    expect(cloud.signedInGoogle()).toBe(true)
    expect(cloud.cloudMeta()).toMatchObject({ backend: 'backup', driveWhy: 'setup', backupTs: 100 })
    const b = JSON.parse(backupFile)
    expect(b).toMatchObject({ app: 'MAHDI-JYM', v: 1, meta: { mode: 'google', account: { email: 'mahdi@gmail.com' } } })
    expect(b.S.workouts).toHaveLength(2)
    expect(cloud.lastSavedAt()).toBeGreaterThan(0)
    expect(file).toBe(null)                                  // nothing went to Drive
    registered()
  })
  it('backup rounds: only when something changed; Drive retried quietly after a few hours', async () => {
    unregistered()
    await cloud.signInGoogle()
    const store = fakeStore(data(1, 100))
    await cloud.firstSync(store)
    plug.getToken.mockClear(); plug.saveBackup.mockClear()
    expect(await cloud.syncNow(store)).toBe('idle')
    store.getState().S = data(3, 200)
    expect(await cloud.syncNow(store)).toBe('uploaded')
    expect(JSON.parse(backupFile).S.workouts).toHaveLength(3)
    expect(plug.getToken).not.toHaveBeenCalled()             // not yet: tried < 6 h ago
    // hours later, and meanwhile the app owner finished the Cloud setup
    registered()
    localStorage.setItem('mj_cloud', JSON.stringify({ ...cloud.cloudMeta(), driveAt: Date.now() - cloud.DRIVE_RETRY_MS - 1 }))
    expect(await cloud.syncNow(store)).toBe('uploaded')
    expect(cloud.cloudMeta().backend).toBe('drive')
    expect(file.body.S.workouts).toHaveLength(3)
    expect(plug.getToken).toHaveBeenCalledWith(expect.objectContaining({ ask: false }))   // never a screen in the background
    expect(cloud.cloudMeta().account).toMatchObject({ name: 'Mahdi M.', photo: 'https://lh3/p.jpg' })
  })
  it('Drive access declined: not asked again by itself; Settings → Use Google Drive asks', async () => {
    plug.getToken.mockRejectedValue({ code: 'CONSENT' })
    await cloud.signInGoogle()
    const store = fakeStore(data(1, 100))
    expect(await cloud.firstSync(store)).toBe('backup')
    expect(plug.getToken).toHaveBeenLastCalledWith(expect.objectContaining({ ask: true }))   // sign-in may show it
    localStorage.setItem('mj_cloud', JSON.stringify({ ...cloud.cloudMeta(), driveAt: 1 }))
    plug.getToken.mockClear()
    await cloud.syncNow(store)
    expect(plug.getToken).not.toHaveBeenCalled()
    registered()
    expect(await cloud.upgradeToDrive(store, true)).toBe('uploaded')
    expect(plug.getToken).toHaveBeenLastCalledWith(expect.objectContaining({ ask: true }))
    expect(cloud.onDrive()).toBe(true)
  })
  it('Drive stops working later (e.g. key changed): falls back to Android Backup', async () => {
    await cloud.signInGoogle()
    const store = fakeStore(data(1, 100))
    expect(await cloud.firstSync(store)).toBe('uploaded')
    expect(cloud.onDrive()).toBe(true)
    expired = true
    unregistered()
    store.getState().S = data(2, 200)
    expect(await cloud.syncNow(store)).toBe('uploaded')
    expect(cloud.cloudMeta()).toMatchObject({ backend: 'backup', driveWhy: 'setup' })
    expect(JSON.parse(backupFile).S.workouts).toHaveLength(2)
    registered()
  })
  it('installed again: the restored backup comes back by itself, signed in as before', async () => {
    backupFile = JSON.stringify({ app: 'MAHDI-JYM', v: 1, meta: { mode: 'google', account: { email: 'mahdi@gmail.com', name: 'Mahdi' }, auto: true }, S: data(5, 700) })
    const store = fakeStore({ _ts: 1, workouts: [] })
    expect(await cloud.restoreFromBackup(store)).toBe(true)
    expect(store.getState().S.workouts).toHaveLength(5)
    expect(cloud.storageChosen()).toBe(true)
    expect(cloud.signedInGoogle()).toBe(true)
    expect(cloud.cloudMeta()).toMatchObject({ backend: 'backup', driveAt: 0 })   // Drive is tried on the first round
  })
  it('never restores over existing data, or once the question was answered', async () => {
    backupFile = JSON.stringify({ app: 'MAHDI-JYM', v: 1, meta: {}, S: data(5, 700) })
    expect(await cloud.restoreFromBackup(fakeStore(data(1, 5)))).toBe(false)
    cloud.choosePhone()
    expect(await cloud.restoreFromBackup(fakeStore({ _ts: 1, workouts: [] }))).toBe(false)
    backupFile = '{broken'
    mem.clear()
    expect(await cloud.restoreFromBackup(fakeStore({ _ts: 1, workouts: [] }))).toBe(false)
  })
  it('signing out removes the backup copy and forgets the token', async () => {
    unregistered()
    await cloud.signInGoogle()
    await cloud.firstSync(fakeStore(data(1, 100)))
    expect(backupFile).not.toBe(null)
    await cloud.signOutGoogle()
    expect(backupFile).toBe(null)
    expect(cloud.cloudMeta()).toMatchObject({ mode: 'phone', backend: null })
    registered()
  })
})
