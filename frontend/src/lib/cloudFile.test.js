import { describe, it, expect, vi, beforeEach } from 'vitest'

// 8.0 — "Google Drive, no setup": one file picked in Android's file picker, rewritten by the app.
// A fake phone: the DriveFile plugin with one file in memory, and the GoogleAccount plugin.
const mem = new Map()
const noop = () => {}
globalThis.window ??= globalThis
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }

let disk = null          // { name, data, modified } — the file "in Google Drive"
let linked = false
let pickResult = null    // what the picker returns next (null = closed)
let writeError = null
const dfPlug = {
  isAvailable: vi.fn(async () => ({ available: true })),
  driveApp: vi.fn(async () => ({ installed: true })),
  pick: vi.fn(async ({ mode }) => {
    if (!pickResult) throw { code: 'CANCELLED', message: 'cancelled' }
    linked = true
    if (mode === 'create') disk = { name: pickResult.name, data: '', modified: 1000 }
    return { linked: true, name: pickResult.name, drive: pickResult.drive, place: pickResult.drive ? 'drive' : 'phone', modified: disk ? disk.modified : 0 }
  }),
  info: vi.fn(async () => (linked ? { linked: true, name: disk && disk.name, exists: !!disk, modified: disk ? disk.modified : 0, canWrite: true, canRead: true } : { linked: false })),
  write: vi.fn(async ({ data }) => {
    if (writeError) throw writeError
    disk = { ...(disk || { name: 'x.json' }), data, modified: (disk ? disk.modified : 0) + 10 }
    return { savedAt: Date.now(), bytes: data.length, modified: disk.modified }
  }),
  read: vi.fn(async () => ({ linked: true, data: disk ? disk.data : '', modified: disk ? disk.modified : 0 })),
  unlink: vi.fn(async () => { linked = false }),
}
const gPlug = {
  isAvailable: vi.fn(async () => ({ available: true })),
  signIn: vi.fn(async () => ({ signedIn: true, email: 'mahdi@gmail.com', name: 'mahdi' })),
  signOut: vi.fn(async () => ({})),
  getToken: vi.fn(async () => { throw { code: '10', message: 'UNREGISTERED_ON_API_CONSOLE' } }),
  saveBackup: vi.fn(async () => ({ savedAt: Date.now() })),
  readBackup: vi.fn(async () => ({ data: null })),
  clearBackup: vi.fn(async () => ({})),
}
vi.mock('./mobile.js', () => ({ MOBILE: true }))
const capacitorProxy = impl => new Proxy({}, { get: (_, prop) => (prop in impl ? impl[prop] : () => new Promise(() => {})) })
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android', isPluginAvailable: () => true },
  registerPlugin: name => capacitorProxy(name === 'DriveFile' ? dfPlug : gPlug),
}))

const cloud = await import('./cloud.js')
const { parseDataFile, fileReason, driveFileAvailable, driveAppInstalled, FILE_NAME } = await import('./driveFile.js')

function fakeStore(S) {
  const st = { S }
  st.replaceState = s => { st.S = { ...s, _ts: Date.now() } }
  return { getState: () => st, subscribe: () => () => {} }
}
const data = (n, ts) => ({ _ts: ts, workouts: Array.from({ length: n }, (_, i) => ({ d: '2026-10-0' + (i + 1) })), routines: [] })
const fileWith = (S, modified = 5000) => { disk = { name: FILE_NAME, data: JSON.stringify({ app: 'MAHDI-JYM', v: 1, kind: 'live', S }), modified } }
const onDisk = () => JSON.parse(disk.data)

beforeEach(() => {
  mem.clear(); disk = null; linked = false; writeError = null
  pickResult = { name: FILE_NAME, drive: true }
  Object.values(dfPlug).forEach(f => f.mockClear())
})

describe('driveFile — reading a picked file', () => {
  it('knows MAHDI-JYM data in every shape it is saved in', () => {
    expect(parseDataFile('')).toEqual({ empty: true })
    expect(parseDataFile('   \n')).toEqual({ empty: true })
    expect(parseDataFile('{oops')).toEqual({ bad: true })
    expect(parseDataFile('[1,2]')).toEqual({ bad: true })
    expect(parseDataFile('{"name":"a shopping list"}')).toEqual({ bad: true })
    // the live file / a dated version / the Android Backup copy
    expect(parseDataFile(JSON.stringify({ app: 'MAHDI-JYM', savedAt: '2026-10-01T10:00:00Z', S: { workouts: [] } }))).toMatchObject({ S: { workouts: [] }, savedAt: Date.parse('2026-10-01T10:00:00Z') })
    // Settings → Export (the state itself), with the trailing blanks a non-truncating write leaves
    expect(parseDataFile(JSON.stringify({ workouts: [{}], routines: [], _ts: 77 }) + '     ')).toMatchObject({ S: { workouts: [{}] }, savedAt: 77 })
  })
  it('turns plugin codes into reasons', () => {
    expect(fileReason({ code: 'CANCELLED' })).toBe('cancelled')
    expect(fileReason({ code: 'REVOKED' })).toBe('revoked')
    expect(fileReason({ code: 'MISSING' })).toBe('missing')
    expect(fileReason({ code: 'NOT_LINKED' })).toBe('notlinked')
    expect(fileReason({ code: 'WHATEVER' })).toBe('io')
    expect(fileReason({ reason: 'timeout' })).toBe('timeout')
  })
  it('is available on the Android app', async () => {
    expect(await driveFileAvailable()).toBe(true)
    expect(await driveAppInstalled()).toBe(true)
  })
})

describe('cloud — Google Drive with no setup (8.0)', () => {
  it('links a new file in Drive and saves this phone’s data into it — no sign-in needed', async () => {
    const store = fakeStore(data(2, 100))
    expect(await cloud.linkDriveFile(store, 'create')).toBe('uploaded')
    expect(dfPlug.pick).toHaveBeenCalledWith(expect.objectContaining({ mode: 'create', name: FILE_NAME }))
    expect(onDisk()).toMatchObject({ app: 'MAHDI-JYM', v: 1, kind: 'live', S: { workouts: [{}, {}] } })
    expect(cloud.cloudMeta()).toMatchObject({ mode: 'phone', file: { name: FILE_NAME, drive: true, place: 'drive' }, fileTs: 100, fileErr: null })
    expect(cloud.fileLinked()).toBe(true)
    expect(cloud.savingAnywhere()).toBe(true)
    expect(cloud.signedInGoogle()).toBe(false)
    expect(cloud.lastSavedAt()).toBeGreaterThan(0)
  })
  it('later rounds write only when something changed', async () => {
    const store = fakeStore(data(1, 100))
    await cloud.linkDriveFile(store, 'create')
    dfPlug.write.mockClear()
    expect(await cloud.syncNow(store)).toBe('idle')
    expect(dfPlug.write).not.toHaveBeenCalled()
    store.getState().S = data(3, 200)
    expect(await cloud.syncNow(store)).toBe('uploaded')
    expect(onDisk().S.workouts).toHaveLength(3)
    expect(cloud.cloudMeta().fileTs).toBe(200)
  })
  it('closing the picker links nothing', async () => {
    pickResult = null
    await expect(cloud.linkDriveFile(fakeStore(data(1, 1)), 'create')).rejects.toMatchObject({ reason: 'cancelled' })
    expect(cloud.fileLinked()).toBe(false)
    expect(await cloud.syncNow(fakeStore(data(1, 1)))).toBe('off')
  })
  it('a new phone: picking the file restores everything, and the old (empty) state stays restorable', async () => {
    fileWith(data(5, 900))
    const store = fakeStore({ _ts: 1, workouts: [], routines: [] })
    expect(await cloud.linkDriveFile(store, 'open')).toBe('restored')
    expect(store.getState().S.workouts).toHaveLength(5)
    expect(cloud.previousCopy().S.workouts).toEqual([])
    expect(dfPlug.write).not.toHaveBeenCalled()             // nothing was overwritten
    expect(await cloud.syncNow(store)).toBe('idle')           // and nothing needs to go up
  })
  it('both sides hold data: nothing is written until you choose', async () => {
    fileWith(data(5, 900))
    const store = fakeStore(data(1, 950))
    expect(await cloud.linkDriveFile(store, 'open')).toBe('choose')
    expect(await cloud.syncNow(store)).toBe('off')            // a background round must not decide
    expect(onDisk().S.workouts).toHaveLength(5)
    expect(await cloud.resolveFileChoice(store, 'phone')).toBe('uploaded')
    expect(onDisk().S.workouts).toHaveLength(1)
    fileWith(data(7, 990))
    expect(await cloud.resolveFileChoice(store, 'file')).toBe('restored')
    expect(store.getState().S.workouts).toHaveLength(7)
  })
  it('an empty file picked with “open” simply gets this phone’s data', async () => {
    disk = { name: 'empty.json', data: '', modified: 10 }
    const store = fakeStore(data(2, 100))
    expect(await cloud.linkDriveFile(store, 'open')).toBe('uploaded')
    expect(onDisk().S.workouts).toHaveLength(2)
  })
  it('a file that is not MAHDI-JYM data is never overwritten or linked', async () => {
    disk = { name: 'notes.json', data: '{"todo":["milk"]}', modified: 10 }
    await expect(cloud.linkDriveFile(fakeStore(data(2, 100)), 'open')).rejects.toMatchObject({ reason: 'notours' })
    expect(disk.data).toBe('{"todo":["milk"]}')
    expect(cloud.fileLinked()).toBe(false)
    expect(dfPlug.unlink).toHaveBeenCalled()
  })
  it('another phone wrote the file: its newer data comes in; this phone’s newer changes win', async () => {
    const store = fakeStore(data(1, 100))
    await cloud.linkDriveFile(store, 'create')
    // phone B saved 4 workouts later on
    fileWith(data(4, Date.now() + 1000), disk.modified + 60000)
    expect(await cloud.syncNow(store)).toBe('restored')
    expect(store.getState().S.workouts).toHaveLength(4)
    expect(await cloud.syncNow(store)).toBe('idle')
    // now both changed — this phone's change is newer, so it goes up
    fileWith(data(6, Date.now() - 5000), disk.modified + 60000)
    store.getState().S = data(9, Date.now() + 5000)
    expect(await cloud.syncNow(store)).toBe('uploaded')
    expect(onDisk().S.workouts).toHaveLength(9)
  })
  it('the permission is gone (e.g. reinstalled): stops trying and says so', async () => {
    const store = fakeStore(data(1, 100))
    await cloud.linkDriveFile(store, 'create')
    writeError = { code: 'REVOKED', message: 'denied' }
    store.getState().S = data(2, 200)
    await expect(cloud.syncNow(store)).rejects.toMatchObject({ reason: 'revoked' })
    expect(cloud.cloudMeta().fileErr).toBe('revoked')
    expect(cloud.fileBroken()).toBe(true)
    expect(cloud.savingAnywhere()).toBe(false)
    dfPlug.write.mockClear()
    expect(await cloud.syncNow(store)).toBe('off')
    expect(dfPlug.write).not.toHaveBeenCalled()
    // picking the file again fixes it
    writeError = null
    expect(await cloud.linkDriveFile(store, 'create')).toBe('uploaded')
    expect(cloud.cloudMeta().fileErr).toBe(null)
  })
  it('a passing write error (I/O) is retried on the next round', async () => {
    const store = fakeStore(data(1, 100))
    await cloud.linkDriveFile(store, 'create')
    writeError = { code: 'IO', message: 'busy' }
    store.getState().S = data(2, 200)
    await expect(cloud.syncNow(store)).rejects.toMatchObject({ reason: 'io' })
    expect(cloud.fileBroken()).toBe(false)
    writeError = null
    expect(await cloud.syncNow(store)).toBe('uploaded')
  })
  it('works next to the Google account: Android Backup and the Drive file are both saved', async () => {
    await cloud.signInGoogle()
    const store = fakeStore(data(2, 100))
    expect(await cloud.firstSync(store)).toBe('backup')         // the Drive API isn't set up
    expect(await cloud.linkDriveFile(store, 'create')).toBe('uploaded')
    expect(cloud.cloudMeta()).toMatchObject({ mode: 'google', backend: 'backup' })
    store.getState().S = data(3, 300)
    gPlug.saveBackup.mockClear()
    expect(await cloud.syncNow(store)).toBe('uploaded')
    expect(onDisk().S.workouts).toHaveLength(3)
    expect(gPlug.saveBackup).toHaveBeenCalled()
    // signing out of Google can stop the Drive file too (the file stays in Drive)
    await cloud.signOutGoogle(false, { dropDriveFile: true })
    expect(cloud.fileLinked()).toBe(false)
    expect(disk.data).toContain('MAHDI-JYM')
  })
  it('unlinking stops saving', async () => {
    const store = fakeStore(data(1, 100))
    await cloud.linkDriveFile(store, 'create')
    await cloud.unlinkDriveFile()
    expect(cloud.fileLinked()).toBe(false)
    expect(await cloud.syncNow(store)).toBe('off')
  })
})
