// Where your data is kept (2.6): this phone only, or this phone + your Google account.
//
// Sign in with Google uses Google's own account chooser (the accounts already on the phone —
// no password) through the native GoogleAccount plugin. Everything is then kept in step with
// one file in that account's Google Drive, in the private app-data folder that only this app
// can read (scope drive.appdata — your own Drive files are never visible to it).
//
//   meta (localStorage 'mj_cloud') = {
//     mode: 'google' | 'phone' | 'skip',  chosen on first launch (AccountGate) or in Settings
//     account: { email, name, photo },
//     auto: true,                          save changes automatically
//     fileId, syncedTs, remoteTs, at       the last sync: local S._ts, the file's ts, when
//   }
//
// Sync rules: only this phone changed → upload; only the account changed → download; both →
// the newer wins. Whatever a download replaces is kept on the phone (restorePrevious()). Uploads are
// throttled (a walk saves steps every few seconds) and flushed when the app goes to the
// background.
import { MOBILE } from './mobile.js'
import { DEF } from '../store/useStore.js'

const META = 'mj_cloud'
const PREV = 'mj_cloud_prev'
const FILE = 'mahdi-jym-data.json'
const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
export const THROTTLE_MS = 90 * 1000

// ---- meta ---------------------------------------------------------------------------------

export function cloudMeta() {
  try { return JSON.parse(localStorage.getItem(META) || '{}') || {} } catch { return {} }
}
function setMeta(patch) {
  const m = { ...cloudMeta(), ...patch }
  try { localStorage.setItem(META, JSON.stringify(m)) } catch { /* storage full */ }
  listeners.forEach(f => { try { f(m) } catch { /* */ } })
  return m
}
const listeners = new Set()
export function onCloudChange(f) { listeners.add(f); return () => listeners.delete(f) }

/** The storage choice has been made (or skipped) — the first-launch question is answered. */
export const storageChosen = () => !!cloudMeta().mode
export const signedInGoogle = () => cloudMeta().mode === 'google' && !!(cloudMeta().account || {}).email
export function choosePhone(skip = false) { setMeta({ mode: skip ? 'skip' : 'phone' }) }
export function setAutoSave(v) { setMeta({ auto: !!v }) }
export const autoSaveOn = () => cloudMeta().auto !== false

// ---- the native plugin --------------------------------------------------------------------

// Capacitor plugin proxies answer EVERY property — `then` included — with a native call. So
// a proxy must never be the value of a promise: `await` would call proxy.then(resolve, …),
// which goes to Android as an unknown method and never resolves (2.6.0's "Connecting your
// account…" that hung forever). It stays inside { p } and is unwrapped only synchronously.
let pluginP = null
function holder() {
  if (!MOBILE) return null
  if (!pluginP) {
    pluginP = (async () => {
      try {
        const { Capacitor, registerPlugin } = await import('@capacitor/core')
        if (Capacitor.getPlatform() !== 'android' || !Capacitor.isPluginAvailable('GoogleAccount')) return null
        // Plugin proxies are thenables — keep it inside an object so `await` never unwraps it.
        return { p: registerPlugin('GoogleAccount') }
      } catch { return null }
    })()
  }
  return pluginP                         // resolves { p } | null — never the proxy itself
}

/** Google sign-in is offered on this device (the Android app with Google Play services). */
export async function googleAvailable() {
  const h = await holder()
  if (!h) return false
  try { const r = await withTimeout(h.p.isAvailable(), 8000); return !!(r && r.available) } catch { return false }
}

/** Rejects with { reason: 'network' } when `promise` takes longer than `ms`. */
function withTimeout(promise, ms, reason = 'network') {
  let tm
  return Promise.race([
    promise,
    new Promise((_, rej) => { tm = setTimeout(() => rej(Object.assign(new Error('timeout'), { reason })), ms) }),
  ]).finally(() => clearTimeout(tm))
}

/** An error from the plugin → a short reason key (see accountError() in the UI). */
export function reasonOf(e) {
  const code = String((e && (e.code || e.errorMessage)) || '')
  if (code === '12501' || code === '16') return 'cancelled'
  if (code === '10' || code === '12500') return 'setup'
  if (code === '7' || code === '8' || /network|connection/i.test(String(e && e.message))) return 'network'
  if (code === 'CONSENT') return 'consent'
  if (code === 'UNAVAILABLE') return 'unavailable'
  return 'failed'
}

/** The account chooser. Resolves with the account; throws { reason }. */
export async function signInGoogle() {
  const h = await holder()
  if (!h) throw Object.assign(new Error('unavailable'), { reason: 'unavailable' })
  let a
  try { a = await h.p.signIn() } catch (e) { throw Object.assign(new Error(e && e.message), { reason: reasonOf(e) }) }
  if (!a || !a.signedIn) throw Object.assign(new Error('cancelled'), { reason: 'cancelled' })
  const account = { email: a.email, name: a.name || a.givenName || a.email, photo: a.photo || null }
  const prev = cloudMeta()
  // Another account than before: forget what we knew about the old account's file.
  const same = prev.account && prev.account.email === account.email
  setMeta({ mode: 'google', account, auto: prev.auto !== false, ...(same ? {} : { fileId: null, syncedTs: 0, remoteTs: 0, at: 0 }) })
  return account
}

export async function signOutGoogle(revoke = false) {
  const h = await holder()
  try { if (h) await withTimeout(revoke ? h.p.disconnect() : h.p.signOut(), 10000) } catch { /* */ }
  setMeta({ mode: 'phone', account: null, fileId: null, syncedTs: 0, remoteTs: 0, at: 0 })
}

let token = null
async function getToken(stale) {
  const h = await holder()
  if (!h) throw Object.assign(new Error('unavailable'), { reason: 'unavailable' })
  try {
    // generous: the first time, Google may show its "allow Drive access" screen
    const r = await withTimeout(h.p.getToken(stale ? { stale } : {}), 120000)
    token = r && r.token
    if (!token) throw new Error('no token')
    return token
  } catch (e) { throw Object.assign(new Error(e && e.message), { reason: (e && e.reason) || reasonOf(e) }) }
}

// ---- Google Drive (app-data folder) -------------------------------------------------------

async function drive(url, opts = {}, retried = false) {
  const tok = token || await getToken()
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const tm = ctl && setTimeout(() => ctl.abort(), 30000)
  let res
  try {
    res = await fetch(url, { ...opts, signal: ctl ? ctl.signal : undefined, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + tok } })
  } catch (e) {
    throw Object.assign(new Error((e && e.message) || 'network'), { reason: 'network' })
  } finally { clearTimeout(tm) }
  if (res.status === 401 && !retried) { await getToken(tok); return drive(url, opts, true) }
  if (!res.ok) throw Object.assign(new Error('Drive ' + res.status), { reason: res.status >= 500 ? 'network' : 'failed', status: res.status })
  return res
}

/** The data file in the app folder: { id, ts } or null. */
export async function findFile() {
  const q = encodeURIComponent(`name='${FILE}' and trashed=false`)
  const res = await drive(`${DRIVE}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime,appProperties)&orderBy=modifiedTime desc&pageSize=5`)
  const j = await res.json()
  const f = (j.files || [])[0]
  if (!f) return null
  const ts = Number(f.appProperties && f.appProperties.ts) || Date.parse(f.modifiedTime) || 0
  return { id: f.id, ts }
}

export async function download(id) {
  const res = await drive(`${DRIVE}/files/${encodeURIComponent(id)}?alt=media`)
  const j = await res.json()
  if (!j || typeof j !== 'object' || !j.S || typeof j.S !== 'object') throw Object.assign(new Error('bad file'), { reason: 'failed' })
  return j
}

/** Create or replace the file with `S`. Returns { id, ts }. */
export async function upload(S, id) {
  const ts = Number(S._ts) || Date.now()
  const body = JSON.stringify({ app: 'MAHDI-JYM', v: 1, savedAt: new Date().toISOString(), version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '', S })
  const meta = { name: FILE, mimeType: 'application/json', appProperties: { ts: String(ts) } }
  if (!id) meta.parents = ['appDataFolder']
  const b = 'mj' + Math.random().toString(36).slice(2)
  const multipart = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`
  const url = id ? `${UPLOAD}/files/${encodeURIComponent(id)}?uploadType=multipart&fields=id` : `${UPLOAD}/files?uploadType=multipart&fields=id`
  const res = await drive(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: multipart })
  const j = await res.json()
  return { id: j.id || id, ts }
}

// ---- sync ---------------------------------------------------------------------------------

const hasData = S => !!S && !!(((S.workouts || []).length) || ((S.routines || []).length) || ((S.bodyweight || []).length) ||
  Object.keys(S.steps || {}).length || Object.keys(S.waterMl || {}).length)

/** What signing in found: 'uploaded' | 'restored' | 'choose' (both sides have data). */
export async function firstSync(store) {
  const remote = await findFile()
  const S = store.getState().S
  if (!remote) { await push(store, null); return 'uploaded' }
  if (!hasData(S)) { await pull(store, remote); return 'restored' }
  setMeta({ fileId: remote.id })
  return 'choose'
}

/** Resolve the first-sign-in choice: 'account' takes the account's copy, 'phone' uploads this one. */
export async function resolveChoice(store, which) {
  const remote = await findFile()
  if (which === 'account' && remote) { await pull(store, remote); return 'restored' }
  await push(store, remote && remote.id)
  return 'uploaded'
}

async function push(store, id) {
  const S = store.getState().S
  const r = await upload(S, id)
  setMeta({ fileId: r.id, syncedTs: Number(S._ts) || 0, remoteTs: r.ts, at: Date.now(), error: null })
}

async function pull(store, remote) {
  const file = await download(remote.id)
  const cur = store.getState().S
  try { localStorage.setItem(PREV, JSON.stringify({ at: Date.now(), S: cur })) } catch { /* too big */ }
  store.getState().replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), file.S), false)
  const S = store.getState().S
  setMeta({ fileId: remote.id, syncedTs: Number(S._ts) || 0, remoteTs: remote.ts, at: Date.now(), error: null })
}

let running = null
/** One sync round (see the rules at the top). Resolves 'idle' | 'uploaded' | 'restored' | 'off'. */
export function syncNow(store) {
  if (running) return running
  running = (async () => {
    if (!signedInGoogle()) return 'off'
    try {
      const m = cloudMeta()
      const S = store.getState().S
      const remote = await findFile()
      if (!remote) { await push(store, null); return 'uploaded' }
      const localChanged = (Number(S._ts) || 0) > (m.syncedTs || 0)
      const remoteChanged = remote.ts > (m.remoteTs || 0)
      if (remoteChanged && (!localChanged || remote.ts > (Number(S._ts) || 0))) { await pull(store, remote); return 'restored' }
      if (localChanged) { await push(store, remote.id); return 'uploaded' }
      setMeta({ at: Date.now(), error: null })
      return 'idle'
    } catch (e) {
      setMeta({ error: (e && e.reason) || 'failed' })
      throw e
    } finally { running = null }
  })()
  return running
}

/** The copy that a download replaced: { at, S } or null. */
export function previousCopy() {
  try { const p = JSON.parse(localStorage.getItem(PREV) || 'null'); return p && p.S ? p : null } catch { return null }
}
export function restorePrevious(store) {
  const p = previousCopy()
  if (!p) return false
  store.getState().replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), p.S), false)
  return true
}

/**
 * Keep the account in step while the app runs: a round on start and when the app comes back,
 * changes uploaded at most every THROTTLE_MS, and right away when the app is backgrounded.
 */
let started = false
export function startCloudSync(store) {
  if (started || !MOBILE) return () => {}
  started = true
  let tm = null
  let last = 0
  const quiet = () => { if (signedInGoogle() && autoSaveOn()) syncNow(store).catch(() => {}) }
  const schedule = () => {
    if (!signedInGoogle() || !autoSaveOn()) return
    if (tm) return
    const wait = Math.max(5000, THROTTLE_MS - (Date.now() - last))
    tm = setTimeout(() => { tm = null; last = Date.now(); quiet() }, wait)
  }
  const unsub = store.subscribe((st, prev) => { if (st.S !== prev.S && st.S._ts !== cloudMeta().syncedTs) schedule() })
  const onVis = () => {
    if (document.visibilityState === 'hidden') { clearTimeout(tm); tm = null; last = Date.now(); quiet() }
    else if (Date.now() - last > 60000) { last = Date.now(); quiet() }
  }
  document.addEventListener('visibilitychange', onVis)
  setTimeout(quiet, 2500)
  return () => { started = false; unsub(); clearTimeout(tm); document.removeEventListener('visibilitychange', onVis) }
}
