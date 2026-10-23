import { describe, it, expect, beforeEach } from 'vitest'
const mem = new Map()
globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }
const B = await import('./backups.js')

const S = (n, ts = n) => ({ _ts: ts, workouts: Array.from({ length: n }, (_, i) => ({ d: '2026-10-0' + (1 + (i % 9)) })), bodyweight: [{ d: '2026-10-01', w: 80 }] })
const DAY = 86400000
const T0 = new Date(2026, 9, 1, 12).getTime()

describe('4.0 backups on this phone', () => {
  beforeEach(() => { localStorage.removeItem('mj_snaps'); B.setSnapshotStore(B.memoryStore()) })

  it('saves, lists, reads and deletes a version', async () => {
    const e = await B.takeSnapshot(S(3), 'manual', T0)
    expect(e).toMatchObject({ kind: 'manual', workouts: 3, weights: 1 })
    expect(B.snapshotIndex().map(x => x.id)).toEqual([e.id])
    const j = await B.readSnapshot(e.id)
    expect(j.S.workouts).toHaveLength(3)
    expect(j.app).toBe('MAHDI-JYM')
    await B.deleteSnapshot(e.id)
    expect(B.snapshotIndex()).toEqual([])
    expect(await B.readSnapshot(e.id)).toBe(null)
  })
  it('one automatic version a day, only when something changed', async () => {
    expect(await B.autoSnapshot(S(1), { now: T0 })).toBeTruthy()
    expect(await B.autoSnapshot(S(2), { now: T0 + 3600000 })).toBe(null)   // same day
    expect(await B.autoSnapshot(S(1), { now: T0 + DAY })).toBe(null)       // nothing changed
    expect(await B.autoSnapshot(S(2), { now: T0 + DAY })).toBeTruthy()
    expect(await B.autoSnapshot(S(3), { now: T0 + 2 * DAY, enabled: false })).toBe(null)
    expect(await B.autoSnapshot({ _ts: 9 }, { now: T0 + 3 * DAY })).toBe(null)   // empty: nothing to keep
  })
  it('9.0.0: keeps versions of a profile that only logs food, drinks, fasting or breathing', async () => {
    expect(await B.autoSnapshot({ _ts: 5, food: { '2026-10-01': [{ n: 'Tea', kcal: 2 }] } }, { now: T0 })).toBeTruthy()
    expect(B.hasAnyData({ _ts: 1 })).toBe(false)
    expect(B.hasAnyData({ food: { '2026-10-01': [{ n: 'Tea', kcal: 2 }] } })).toBe(true)
    expect(B.hasAnyData({ drinkLog: { '2026-10-01': { lemon: 1 } } })).toBe(true)
    expect(B.hasAnyData({ fasting: { log: [{ s: 1, e: 2 }] } })).toBe(true)
    expect(B.hasAnyData({ breathe: { log: [{ at: 1 }] } })).toBe(true)
    expect(B.hasAnyData({ intervals: [{ id: 'x' }] })).toBe(true)
  })
  it('keeps the newest N automatic versions and leaves your own alone', async () => {
    await B.takeSnapshot(S(1), 'manual', T0 - DAY)
    for (let i = 0; i < 10; i++) await B.autoSnapshot(S(i + 1), { now: T0 + i * DAY, keep: 7 })
    const idx = B.snapshotIndex()
    expect(idx.filter(x => x.kind === 'auto')).toHaveLength(7)
    expect(idx.filter(x => x.kind === 'manual')).toHaveLength(1)
    expect(idx.filter(x => x.kind === 'auto')[0].workouts).toBe(10)   // newest first
    expect(await B.pruneSnapshots(3)).toBe(4)
    expect(B.snapshotIndex().filter(x => x.kind === 'auto')).toHaveLength(3)
  })
  it('rebuilds the list from the files', async () => {
    const a = await B.takeSnapshot(S(2), 'restore', T0)
    localStorage.removeItem('mj_snaps')
    const list = await B.refreshIndex()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: a.id, kind: 'restore', workouts: 2, at: T0 })
    expect(B.KEEP_OPTS).toContain(B.DEFAULT_KEEP)
  })
})
