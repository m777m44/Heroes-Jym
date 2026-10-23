// 4.0 — versions of your data you can go back to, kept ON THE PHONE (no account, no internet).
//
// Once a day (the first time the app runs or goes to the background on a new day, and only if
// something changed since the last one) a full copy of everything is saved as a version. You
// can also save one by hand, and every restore first saves what it replaces ("before restore"),
// so a restore can always be undone.
//
//   where   Android / iPhone app: files in the app's private folder (snapshots/<id>.json)
//           browser: IndexedDB ('mahdi-jym' → 'snapshots'); tests: memory
//   index   localStorage 'mj_snaps' = [{ id, at, kind, size, ts, workouts, weights, days, last }]
//           (to list versions without reading every file; repaired from the files on open)
//   keep    automatic: the newest S.backupKeep (3 / 7 / 14, default 7); by hand and
//           before-restore: the newest MANUAL_KEEP each
//
// No store import (lib rule): callers pass S in and do replaceState themselves.
import { MOBILE } from './mobile.js'
import { hasData } from './hasData.js'

const INDEX = 'mj_snaps'
const DIR = 'snapshots'
export const KEEP_OPTS = [3, 7, 14]
export const DEFAULT_KEEP = 7
export const MANUAL_KEEP = 5
export const KINDS = ['auto', 'manual', 'restore']

// ---- where the files go ---------------------------------------------------------------------
export function memoryStore() {
  const m = new Map()
  return {
    name: 'memory',
    async write(id, text) { m.set(id, text) },
    async read(id) { return m.has(id) ? m.get(id) : null },
    async remove(id) { m.delete(id) },
    async list() { return [...m.keys()] },
  }
}
const fsStore = {
  name: 'phone',
  async write(id, text) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({ path: `${DIR}/${id}.json`, directory: Directory.Data, data: text, encoding: Encoding.UTF8, recursive: true })
  },
  async read(id) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    try { const r = await Filesystem.readFile({ path: `${DIR}/${id}.json`, directory: Directory.Data, encoding: Encoding.UTF8 }); return typeof r.data === 'string' ? r.data : null } catch { return null }
  },
  async remove(id) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    try { await Filesystem.deleteFile({ path: `${DIR}/${id}.json`, directory: Directory.Data }) } catch { /* already gone */ }
  },
  async list() {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    try {
      const r = await Filesystem.readdir({ path: DIR, directory: Directory.Data })
      return (r.files || []).map(f => (typeof f === 'string' ? f : f.name)).filter(n => /\.json$/.test(n)).map(n => n.replace(/\.json$/, ''))
    } catch { return [] }
  },
}
function idbStore() {
  let dbp = null
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const rq = indexedDB.open('mahdi-jym', 1)
    rq.onupgradeneeded = () => rq.result.createObjectStore('snapshots')
    rq.onsuccess = () => res(rq.result)
    rq.onerror = () => rej(rq.error)
  }))
  const tx = async (mode, fn) => {
    const d = await db()
    return new Promise((res, rej) => {
      const st = d.transaction('snapshots', mode).objectStore('snapshots')
      const rq = fn(st)
      rq.onsuccess = () => res(rq.result)
      rq.onerror = () => rej(rq.error)
    })
  }
  return {
    name: 'browser',
    write: (id, text) => tx('readwrite', st => st.put(text, id)),
    read: async id => { const v = await tx('readonly', st => st.get(id)); return v == null ? null : v },
    remove: id => tx('readwrite', st => st.delete(id)),
    list: async () => (await tx('readonly', st => st.getAllKeys())).map(String),
  }
}
let adapter = null
/** Tests (or a future storage) swap where versions are kept. */
export function setSnapshotStore(a) { adapter = a }
function files() {
  if (!adapter) adapter = MOBILE ? fsStore : (typeof indexedDB !== 'undefined' ? idbStore() : memoryStore())
  return adapter
}

// ---- the index ------------------------------------------------------------------------------
export function snapshotIndex() {
  try { const l = JSON.parse(localStorage.getItem(INDEX) || '[]'); return Array.isArray(l) ? l.filter(x => x && x.id).sort((a, b) => b.at - a.at) : [] } catch { return [] }
}
function setIndex(list) {
  try { localStorage.setItem(INDEX, JSON.stringify(list.slice(0, 60))) } catch { /* storage full: files still exist */ }
  listeners.forEach(f => { try { f() } catch { /* */ } })
}
const listeners = new Set()
export function onSnapshotsChange(f) { listeners.add(f); return () => listeners.delete(f) }

const localDay = ms => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
// 9.0.0 (review on PR #11): the same test as the store's — a profile with only food, fasting,
// drinks, intervals or breathing logged gets its daily versions too
export const hasAnyData = S => hasData(S)

/** What a copy holds, for the list: counts and the last workout day. */
export function summarize(S) {
  const w = S.workouts || []
  return {
    ts: Number(S._ts) || 0,
    workouts: w.length,
    weights: (S.bodyweight || []).length,
    days: Object.keys(S.health || {}).length,
    last: w.length ? w[w.length - 1].d : null,
  }
}

// ---- versions -------------------------------------------------------------------------------
let seq = 0
/** Save a version now. kind: 'auto' | 'manual' | 'restore'. Resolves with its index entry. */
export async function takeSnapshot(S, kind = 'manual', now = Date.now()) {
  const id = 'v' + now.toString(36) + (seq++ % 36).toString(36)
  const body = JSON.stringify({
    app: 'MAHDI-JYM', kind: 'snapshot', v: 1, type: kind, savedAt: new Date(now).toISOString(),
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '', S,
  })
  await files().write(id, body)
  const entry = { id, at: now, kind: KINDS.includes(kind) ? kind : 'manual', size: body.length, ...summarize(S) }
  setIndex([entry, ...snapshotIndex().filter(x => x.id !== id)])
  return entry
}

/** The saved copy: { S, savedAt, version, … } or null (missing / not ours). */
export async function readSnapshot(id) {
  const txt = await files().read(id)
  if (!txt) return null
  try { const j = JSON.parse(txt); return j && j.S && typeof j.S === 'object' ? j : null } catch { return null }
}

export async function deleteSnapshot(id) {
  await files().remove(id)
  setIndex(snapshotIndex().filter(x => x.id !== id))
}

/** Keep the newest `keep` automatic versions and MANUAL_KEEP of each other kind. */
export async function pruneSnapshots(keep = DEFAULT_KEEP) {
  const list = snapshotIndex()
  const count = {}
  const drop = []
  for (const x of list) {
    count[x.kind] = (count[x.kind] || 0) + 1
    if (count[x.kind] > (x.kind === 'auto' ? keep : MANUAL_KEEP)) drop.push(x.id)
  }
  for (const id of drop) await files().remove(id)
  if (drop.length) setIndex(list.filter(x => !drop.includes(x.id)))
  return drop.length
}

/**
 * The daily automatic version: once per calendar day, only when there is data and something
 * changed since the newest automatic one. Resolves with the new entry or null.
 */
export async function autoSnapshot(S, { keep = DEFAULT_KEEP, enabled = true, now = Date.now() } = {}) {
  if (!enabled || !hasAnyData(S)) return null
  const autos = snapshotIndex().filter(x => x.kind === 'auto')
  const last = autos[0]
  if (last && localDay(last.at) === localDay(now)) return null
  if (last && last.ts && last.ts === (Number(S._ts) || 0)) return null
  const e = await takeSnapshot(S, 'auto', now)
  await pruneSnapshots(keep)
  return e
}

/** Make the index match the files (a file without an entry is read once to describe it). */
export async function refreshIndex() {
  let ids
  try { ids = await files().list() } catch { return snapshotIndex() }
  const have = new Set(ids)
  const list = snapshotIndex().filter(x => have.has(x.id))
  const known = new Set(list.map(x => x.id))
  for (const id of ids) {
    if (known.has(id)) continue
    const j = await readSnapshot(id)
    if (!j) continue
    const at = Date.parse(j.savedAt) || 0
    list.push({ id, at, kind: KINDS.includes(j.type) ? j.type : 'manual', size: JSON.stringify(j).length, ...summarize(j.S) })
  }
  list.sort((a, b) => b.at - a.at)
  setIndex(list)
  return list
}

/** While the app runs: the daily version a few seconds after start and when it goes to the background. */
let started = false
export function startAutoSnapshots(getS, prefs) {
  if (started || typeof document === 'undefined') return () => {}
  started = true
  const run = () => { const p = prefs(); autoSnapshot(getS(), { keep: p.keep, enabled: p.enabled }).catch(() => {}) }
  const tm = setTimeout(run, 6000)
  const onVis = () => { if (document.visibilityState === 'hidden') run() }
  document.addEventListener('visibilitychange', onVis)
  return () => { started = false; clearTimeout(tm); document.removeEventListener('visibilitychange', onVis) }
}
