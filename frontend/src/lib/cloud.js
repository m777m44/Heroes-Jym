// Where your data is kept: this phone only, or this phone + your Google account.
//
// Signing in (2.8) uses Android's own account chooser — the Google accounts already on the
// phone, no password — so it works on every install. Saving then goes one of two ways
// (meta.backend):
//
//   'drive'   one file in the account's Google Drive, in the private app-data folder only
//             this app can read (drive.appdata). Needs the app's signing key registered in a
//             Google Cloud project (docs/GOOGLE_SIGN_IN.md). Synced within seconds.
//   'backup'  Android Backup: a copy on the phone (files/mj-backup.json) that Android's backup
//             service saves to the phone's Google account and restores when the app is
//             installed again / on a new phone. Needs no setup at all. Used while Drive isn't
//             available; Drive is retried quietly every few hours and takes over by itself.
//
// While signed in, the backup copy is written in both cases, as a second safety net.
//
//   meta (localStorage 'mj_cloud') = {
//     mode: 'google' | 'phone' | 'skip',  chosen on first launch (AccountGate) or in Settings
//     account: { email, name, photo },
//     auto: true,                          save changes automatically
//     backend: 'drive' | 'backup',
//     fileId, syncedTs, remoteTs, at       the last Drive sync: local S._ts, the file's ts, when
//     backupTs, backupAt                   the last backup copy: local S._ts, when
//     driveWhy, driveAt                    why Drive last failed ('setup' | 'consent' | …), when
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
export const DRIVE_RETRY_MS = 6 * 3600 * 1000

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
/** Saving to Google Drive (true) or through Android Backup (false). */
export const onDrive = () => cloudMeta().backend === 'drive'
/** When the account copy was last saved, whichever way. */
export const lastSavedAt = (m = cloudMeta()) => (m.backend === 'drive' ? m.at : Math.max(m.backupAt || 0, m.at || 0)) || 0
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
  if (code === 'SIGNED_OUT') return 'signedout'
  return 'failed'
}

/** The account chooser. Resolves with the account; throws { reason }. */
export async function signInGoogle() {
  const h = await holder()
  if (!h) throw Object.assign(new Error('unavailable'), { reason: 'unavailable' })
  let a
  try { a = await h.p.signIn() } catch (e) { throw Object.assign(new Error(e && e.message), { reason: reasonOf(e) }) }
  if (!a || !a.signedIn) throw Object.assign(new Error('cancelled'), { reason: 'cancelled' })
  token = null                           // a token belongs to the account it was issued for
  const account = { email: a.email, name: a.name || a.givenName || a.email, photo: a.photo || null }
  const prev = cloudMeta()
  // Another account than before: forget what we knew about the old account's file.
  const same = prev.account && prev.account.email === account.email
  setMeta({ mode: 'google', account, auto: prev.auto !== false, ...(same ? {} : { backend: null, fileId: null, syncedTs: 0, remoteTs: 0, at: 0, backupTs: 0, backupAt: 0, driveWhy: null, driveAt: 0 }) })
  return account
}

export async function signOutGoogle(revoke = false) {
  const h = await holder()
  token = null
  try { if (h) await withTimeout(revoke ? h.p.disconnect() : h.p.signOut(), 10000) } catch { /* */ }
  // No longer saved to the account: the Android Backup copy goes too (a Drive copy stays).
  try { if (h) await withTimeout(h.p.clearBackup(), 10000) } catch { /* */ }
  setMeta({ mode: 'phone', account: null, backend: null, fileId: null, syncedTs: 0, remoteTs: 0, at: 0, backupTs: 0, backupAt: 0, driveWhy: null, driveAt: 0 })
}

let token = null
let interactive = false          // may Google show its "allow Drive access" screen right now?
async function getToken(stale) {
  const h = await holder()
  if (!h) throw Object.assign(new Error('unavailable'), { reason: 'unavailable' })
  try {
    const opts = { ask: interactive, email: (cloudMeta().account || {}).email || undefined }
    if (stale) opts.stale = stale
    // generous when it may ask: the consent screen waits for the user
    const r = await withTimeout(h.p.getToken(opts), interactive ? 120000 : 20000)
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

const hasData = S => !!S && !!(((S.workouts || []).length) || ((S.routines || []).length) || ((S.bodyweight || []).length) ||
  Object.keys(S.steps || {}).length || Object.keys(S.waterMl || {}).length)

// ---- Android Backup copy --------------------------------------------------------------------

function backupBody(S) {
  const m = cloudMeta()
  return JSON.stringify({
    app: 'MAHDI-JYM', v: 1, savedAt: new Date().toISOString(),
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '',
    meta: { mode: m.mode, account: m.account || null, auto: m.auto !== false },
    S,
  })
}

/** Write the backup copy (Android saves it to the Google account in the background). */
export async function saveBackup(store) {
  const h = await holder()
  if (!h) throw Object.assign(new Error('unavailable'), { reason: 'unavailable' })
  const S = store.getState().S
  try { await withTimeout(h.p.saveBackup({ data: backupBody(S) }), 15000, 'failed') }
  catch (e) { throw Object.assign(new Error(e && e.message), { reason: (e && e.reason) || 'failed' }) }
  setMeta({ backupTs: Number(S._ts) || 0, backupAt: Date.now() })
}
const backupIfChanged = async store => {
  if ((Number(store.getState().S._ts) || 0) !== (cloudMeta().backupTs || 0) || !cloudMeta().backupAt) await saveBackup(store)
}

/** The backup copy on this phone — e.g. just restored by Android on a new phone — or null. */
export async function readBackup() {
  const h = await holder()
  if (!h) return null
  try {
    const r = await withTimeout(h.p.readBackup(), 8000)
    const j = r && r.data ? JSON.parse(r.data) : null
    return j && j.S && typeof j.S === 'object' ? { ...j, savedAt: Number(r.savedAt) || 0 } : null
  } catch { return null }
}

/**
 * First launch after installing (again): Android put the backup copy back — take it, signed in
 * as before, so nothing has to be chosen. Only into an empty app. Resolves true when restored.
 */
export async function restoreFromBackup(store) {
  if (!MOBILE || storageChosen() || hasData(store.getState().S)) return false
  const b = await readBackup()
  if (!b || !hasData(b.S)) return false
  store.getState().replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), b.S), false)
  const S = store.getState().S
  const m = b.meta || {}
  const google = !!(m.account && m.account.email)
  setMeta({ mode: google ? 'google' : 'phone', account: google ? m.account : null, auto: m.auto !== false,
    backend: 'backup', backupTs: Number(S._ts) || 0, backupAt: b.savedAt || Date.now(), driveAt: 0, driveWhy: null, restoredAt: Date.now() })
  return true
}

// ---- sync ---------------------------------------------------------------------------------

/** Drive didn't work (yet): remember why, keep saving through Android Backup. */
function toBackup(e) {
  setMeta({ backend: 'backup', driveWhy: (e && e.reason) || 'failed', driveAt: Date.now() })
}

/** What signing in found: 'uploaded' | 'restored' | 'choose' (both sides have data) | 'backup'. */
export async function firstSync(store) {
  let remote
  interactive = true
  try { remote = await findFile() }
  catch (e) {
    if (e && e.reason === 'cancelled') throw e
    toBackup(e)
    await saveBackup(store)
    return 'backup'
  } finally { interactive = false }
  setMeta({ backend: 'drive', driveWhy: null, driveAt: Date.now() })
  fetchProfile().catch(() => {})
  const S = store.getState().S
  let r
  if (!remote) { await push(store, null); r = 'uploaded' }
  else if (!hasData(S)) { await pull(store, remote); r = 'restored' }
  else { setMeta({ fileId: remote.id }); return 'choose' }
  backupIfChanged(store).catch(() => {})
  return r
}

/** Resolve the first-sign-in choice: 'account' takes the account's copy, 'phone' uploads this one. */
export async function resolveChoice(store, which) {
  const remote = await findFile()
  let r = 'uploaded'
  if (which === 'account' && remote) { await pull(store, remote); r = 'restored' }
  else await push(store, remote && remote.id)
  backupIfChanged(store).catch(() => {})
  return r
}

/** Name and photo from Google Drive (best effort; the account chooser only gives the email). */
async function fetchProfile() {
  const res = await drive(`${DRIVE}/about?fields=user(displayName,photoLink,emailAddress)`)
  const u = ((await res.json()) || {}).user || {}
  const a = cloudMeta().account
  if (!a || (u.emailAddress && u.emailAddress !== a.email)) return
  setMeta({ account: { ...a, name: u.displayName || a.name, photo: u.photoLink || a.photo || null } })
}

/**
 * Switch from Android Backup to Drive once Drive works. `ask` lets Google show its consent
 * screen (Settings → Use Google Drive); in the background it never does. If both sides hold
 * data the newer one wins — the replaced copy can be put back (restorePrevious()).
 */
export async function upgradeToDrive(store, ask = false) {
  let remote
  interactive = ask
  try { remote = await findFile() }
  catch (e) { if (!e || e.reason !== 'cancelled') toBackup(e); throw e }
  finally { interactive = false }
  setMeta({ backend: 'drive', driveWhy: null, driveAt: Date.now(), syncedTs: 0, remoteTs: 0 })
  fetchProfile().catch(() => {})
  const S = store.getState().S
  let r
  if (!remote) { await push(store, null); r = 'uploaded' }
  else if (!hasData(S) || remote.ts > (Number(S._ts) || 0)) { await pull(store, remote); r = 'restored' }
  else { await push(store, remote.id); r = 'uploaded' }
  backupIfChanged(store).catch(() => {})
  return r
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

async function driveRound(store) {
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
}

async function backupRound(store) {
  const before = cloudMeta().backupTs || 0
  await backupIfChanged(store)
  setMeta({ error: null })
  return (Number(store.getState().S._ts) || 0) !== before ? 'uploaded' : 'idle'
}

let running = null
/** One sync round (see the rules at the top). Resolves 'idle' | 'uploaded' | 'restored' | 'off'. */
export function syncNow(store) {
  if (running) return running
  if (!signedInGoogle()) return Promise.resolve('off')   // (outside: a stuck `running` would block every later round)
  running = (async () => {
    try {
      const m = cloudMeta()
      if (m.backend !== 'drive') {
        // Drive now and then (never pops a screen; a declined consent waits for Settings).
        if (m.driveWhy !== 'consent' && Date.now() - (m.driveAt || 0) > DRIVE_RETRY_MS) {
          try { return await upgradeToDrive(store, false) } catch { /* still Android Backup */ }
        }
        return await backupRound(store)
      }
      try {
        const r = await driveRound(store)
        backupIfChanged(store).catch(() => {})
        return r
      } catch (e) {
        const why = e && e.reason
        if (why === 'setup' || why === 'consent' || why === 'signedout') { toBackup(e); return await backupRound(store) }
        throw e
      }
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
  const savedTs = () => (onDrive() ? cloudMeta().syncedTs : cloudMeta().backupTs)
  const unsub = store.subscribe((st, prev) => { if (st.S !== prev.S && st.S._ts !== savedTs()) schedule() })
  const onVis = () => {
    if (document.visibilityState === 'hidden') { clearTimeout(tm); tm = null; last = Date.now(); quiet() }
    else if (Date.now() - last > 60000) { last = Date.now(); quiet() }
  }
  document.addEventListener('visibilitychange', onVis)
  setTimeout(quiet, 2500)
  return () => { started = false; unsub(); clearTimeout(tm); document.removeEventListener('visibilitychange', onVis) }
}
