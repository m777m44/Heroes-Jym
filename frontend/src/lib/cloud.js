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
// 8.0 adds a third way that needs no setup and no sign-in at all — "Google Drive, no setup":
//
//   'file'    ONE file the user picks once in Android's own file picker, normally in their
//             Google Drive (any other place works too). The app keeps the right to rewrite it
//             and Google Drive's app uploads each new version — so the data is visibly in the
//             user's own Drive within moments, without any Google Cloud project. Restoring on a
//             new phone = picking that file. See lib/driveFile.js and DriveFilePlugin.java.
//
//     meta.file  = { name, drive, place, at }   the linked file (null = none)
//     meta.fileTs, fileAt                     S._ts of what is in the file, and when it was written
//     meta.fileMod                            the file's last-modified time after our write: a
//                                             newer one means another phone wrote it
//     meta.fileErr                            'revoked' | 'missing' | 'io' | null
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
import { DEF, hasData as storeHasData } from '../store/useStore.js'
import * as df from './driveFile.js'

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
export const lastSavedAt = (m = cloudMeta()) => Math.max((m.backend === 'drive' ? m.at : Math.max(m.backupAt || 0, m.at || 0)) || 0, (m.file && m.fileAt) || 0)
/** 8.0: a file is linked (Google Drive, no setup) — and whether writing to it still works. */
export const fileLinked = (m = cloudMeta()) => !!(m.file && m.file.at)
export const fileBroken = (m = cloudMeta()) => m.fileErr === 'revoked' || m.fileErr === 'missing'
/** Something saves this phone's data off the phone: the Google account, a linked file, or both. */
export const savingAnywhere = (m = cloudMeta()) => (m.mode === 'google' && !!(m.account || {}).email) || (fileLinked(m) && !fileBroken(m))
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

export async function signOutGoogle(revoke = false, { dropDriveFile = false } = {}) {
  const h = await holder()
  token = null
  try { if (h) await withTimeout(revoke ? h.p.disconnect() : h.p.signOut(), 10000) } catch { /* */ }
  // No longer saved to the account: the Android Backup copy goes too (a Drive copy stays).
  try { if (h) await withTimeout(h.p.clearBackup(), 10000) } catch { /* */ }
  // 8.0: a file in Google Drive is part of "the account" for most people — Settings asks to
  // stop that too (the file itself stays in Drive). A file elsewhere (the phone) is kept.
  if (dropDriveFile && fileLinked() && cloudMeta().file.drive) await unlinkDriveFile()
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
  } catch (e) {
    // 4.1: keep Google's own code and words too — Settings → Backups → Google check shows them
    throw Object.assign(new Error(e && e.message), { reason: (e && e.reason) || reasonOf(e), code: String((e && e.code) || ''), raw: String((e && (e.raw || e.message)) || '') })
  }
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
  if (!res.ok) {
    // 4.1: a 403 that says the Drive API isn't switched on in the Cloud project is a setup step,
    // not a failure — say so (Settings → Backups → Google check)
    let body = ''
    try { body = await res.text() } catch { /* no body */ }
    const off = res.status === 403 && /accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(body)
    let msg = ''
    try { msg = ((JSON.parse(body) || {}).error || {}).message || '' } catch { /* not JSON */ }
    throw Object.assign(new Error('Drive ' + res.status), {
      reason: off ? 'setup' : res.status >= 500 ? 'network' : 'failed', status: res.status,
      code: off ? 'API_DISABLED' : 'HTTP_' + res.status, raw: msg.slice(0, 300),
    })
  }
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

// 9.0: the same complete check as the store's (food, fasting, health, water… all count)
const hasData = S => storeHasData(S)

// ---- Android Backup copy --------------------------------------------------------------------

function backupBody(S) {
  const m = cloudMeta()
  return JSON.stringify({
    app: 'MAHDI-JYM', v: 1, savedAt: new Date().toISOString(),
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '',
    meta: { mode: m.mode, account: m.account || null, auto: m.auto !== false, file: m.file ? { name: m.file.name, drive: !!m.file.drive } : null },
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
    backend: 'backup', backupTs: Number(S._ts) || 0, backupAt: b.savedAt || Date.now(), driveAt: 0, driveWhy: null, restoredAt: Date.now(),
    // 8.0: the Drive file that was linked before — a reinstall loses the permission, so Settings
    // offers to pick it again
    fileHint: m.file && m.file.name ? m.file : null })
  return true
}

// ---- sync ---------------------------------------------------------------------------------

/** Drive didn't work (yet): remember why, keep saving through Android Backup. */
function toBackup(e) {
  setMeta({ backend: 'backup', driveWhy: (e && e.reason) || 'failed', driveAt: Date.now(),
    driveCode: (e && e.code) || '', driveMsg: String((e && (e.raw || e.message)) || '').slice(0, 300) })
}

/**
 * 4.1 — what Google needs to match, read from the INSTALLED app: package name, the SHA-1 of the
 * certificate this APK was signed with, Google Play services, the chosen account. Null outside
 * the Android app (or on an APK older than 4.1).
 */
export async function googleDiagnostics() {
  const h = await holder()
  if (!h) return null
  try {
    const r = await h.p.diagnostics()
    return r ? { package: r.package || '', sha1: r.sha1 || '', play: Number(r.play), playOk: !!r.playOk, email: r.email || null } : null
  } catch { return null }
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
  setMeta({ backend: 'drive', driveWhy: null, driveCode: '', driveMsg: '', driveAt: Date.now() })
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
  setMeta({ backend: 'drive', driveWhy: null, driveCode: '', driveMsg: '', driveAt: Date.now(), syncedTs: 0, remoteTs: 0 })
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

/** Replace this phone's data with a copy from elsewhere — what it replaces stays restorable. */
function replaceFrom(store, S) {
  const cur = store.getState().S
  try { localStorage.setItem(PREV, JSON.stringify({ at: Date.now(), S: cur })) } catch { /* too big */ }
  store.getState().replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), S), false)
}

async function pull(store, remote) {
  const file = await download(remote.id)
  replaceFrom(store, file.S)
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

/** One round for the Google account: Drive when it works, else Android Backup. */
async function googleRound(store) {
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
    dailyDriveVersion(store).catch(() => {})
    return r
  } catch (e) {
    const why = e && e.reason
    if (why === 'setup' || why === 'consent' || why === 'signedout') { toBackup(e); return await backupRound(store) }
    throw e
  }
}

let running = null
/**
 * One sync round (see the rules at the top) — the linked file first (if another phone wrote it,
 * that is taken before anything goes up), then the Google account.
 * Resolves 'idle' | 'uploaded' | 'restored' | 'off'.
 */
export function syncNow(store) {
  if (running) return running
  const google = signedInGoogle()
  const file = fileLinked() && !fileBroken() && !cloudMeta().fileChoose
  if (!google && !file) return Promise.resolve('off')   // (outside: a stuck `running` would block every later round)
  running = (async () => {
    let out = 'idle', gErr = null, fErr = null
    const merge = r => { if (r === 'restored' || (r === 'uploaded' && out !== 'restored')) out = r }
    try {
      if (file) { try { merge(await fileRound(store)) } catch (e) { fErr = e } }
      if (google) {
        try { merge(await googleRound(store)) } catch (e) { gErr = e; setMeta({ error: (e && e.reason) || 'failed' }) }
      }
      if (gErr) throw gErr
      if (fErr && !google) throw fErr
      return out
    } finally { running = null }
  })()
  return running
}

// ---- 8.0: Google Drive with no setup — one file you pick once ------------------------------

function fileBody(S) {
  const m = cloudMeta()
  return JSON.stringify({
    app: 'MAHDI-JYM', v: 1, kind: 'live', savedAt: new Date().toISOString(),
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '',
    meta: { account: m.account ? { email: m.account.email, name: m.account.name } : null },
    S,
  }, null, 0)
}

async function writeLinked(store) {
  const S = store.getState().S
  try {
    const r = await df.writeFile(fileBody(S))
    setMeta({ fileTs: Number(S._ts) || 0, fileAt: Date.now(), fileMod: Number(r && r.modified) || 0, fileErr: null })
  } catch (e) {
    const why = (e && e.reason) || 'io'
    setMeta({ fileErr: why === 'revoked' || why === 'missing' ? why : 'io' })
    throw e
  }
}

/** The data in the linked file → parseDataFile() result (throws { reason } when unreadable). */
async function readLinked() {
  const r = await df.readFile()
  return { ...df.parseDataFile(r && r.data), modified: Number(r && r.modified) || 0 }
}

/** Take the file's data: this phone's copy is kept for "Undo the last restore". */
function applyFile(store, got) {
  replaceFrom(store, got.S)
  setMeta({ fileTs: Number(store.getState().S._ts) || 0, fileAt: Date.now(), fileMod: got.modified || cloudMeta().fileMod || 0, fileErr: null, restoredAt: Date.now() })
}

/**
 * Link a file — normally in Google Drive — and keep saving to it. `mode`:
 *   'create'  a new file (the picker suggests MAHDI-JYM-backup.json) → 'uploaded'
 *   'open'    a file that already has data, e.g. on a new phone → 'restored', 'choose' (this
 *             phone has data too: call resolveFileChoice) or 'uploaded' (the file was empty)
 * Throws { reason: 'cancelled' } when the picker is closed, { reason: 'notours' } for a file
 * that isn't MAHDI-JYM data (it is left untouched and not linked).
 */
export async function linkDriveFile(store, mode = 'create') {
  const info = await df.pickFile(mode)
  setMeta({
    file: { name: (info && info.name) || df.FILE_NAME, drive: !!(info && info.drive), place: (info && info.place) || 'other', at: Date.now() },
    fileTs: 0, fileAt: 0, fileMod: 0, fileErr: null, fileChoose: false,
  })
  // linked and working: the first-launch question counts as answered (signed in stays signed in)
  const done = r => { const m = cloudMeta(); setMeta({ mode: m.mode === 'google' ? 'google' : 'phone', fileHint: null }); return r }
  if (mode === 'open') {
    let got
    try { got = await readLinked() } catch (e) { await unlinkDriveFile(); throw e }
    if (got.bad) { await unlinkDriveFile(); throw Object.assign(new Error('not MAHDI-JYM data'), { reason: 'notours' }) }
    if (got.S && hasData(got.S)) {
      if (!hasData(store.getState().S)) {
        applyFile(store, got)
        // 9.0 (review on PR #11): a file we may read but not write is a restore, not a place to
        // save to — it is not kept linked, so nothing pretends to back up into it
        if (info && info.canWrite === false) { await unlinkDriveFile(); return done('readonly') }
        return done('restored')
      }
      // nothing is written until the choice is made — not even by a background round
      setMeta({ fileChoose: true })
      return done('choose')
    }
  }
  try { await writeLinked(store) } catch (e) { if (mode === 'create') await unlinkDriveFile(); throw e }
  return done('uploaded')
}

/** Both the file and this phone have data: 'file' takes the file's copy, 'phone' writes this one. */
export async function resolveFileChoice(store, which) {
  setMeta({ fileChoose: false })
  if (which === 'file') {
    const got = await readLinked()
    if (got.S && hasData(got.S)) { applyFile(store, got); return 'restored' }
  }
  await writeLinked(store)
  return 'uploaded'
}

/** Stop saving to the file (the file itself stays where it is). */
export async function unlinkDriveFile() {
  try { await df.unlinkFile() } catch { /* already gone */ }
  setMeta({ file: null, fileTs: 0, fileAt: 0, fileMod: 0, fileErr: null, fileChoose: false })
}

/**
 * One round for the linked file. Another phone wrote it since (its last-modified moved past
 * ours and its data is newer than what we last wrote) → take it, unless this phone has newer
 * changes of its own; otherwise write when something changed here.
 */
async function fileRound(store) {
  const m = cloudMeta()
  const localTs = Number(store.getState().S._ts) || 0
  let info = null
  try { info = await df.fileInfo() } catch { info = null }
  if (info && info.linked === false) { setMeta({ file: null }); return 'idle' }        // app data was cleared
  // (a file that is gone or no longer allowed is only believed when WRITING fails — some
  // providers answer a metadata query with nothing even though the file is fine)
  const mod = Number(info && info.modified) || 0
  if (mod && m.fileMod && mod > m.fileMod + 2000) {
    const got = await readLinked().catch(() => null)
    const remoteTs = got && got.S ? Number(got.S._ts) || 0 : 0
    if (got && got.S && remoteTs > (m.fileTs || 0)) {
      const localChanged = localTs > (m.fileTs || 0)
      if (!localChanged || remoteTs > localTs) { applyFile(store, { ...got, modified: mod }); return 'restored' }
    }
    setMeta({ fileMod: mod })
  }
  if (localTs !== (m.fileTs || 0) || !m.fileAt) { await writeLinked(store); return 'uploaded' }
  return 'idle'
}

// ---- 4.0: dated versions in Drive ------------------------------------------------------------
// Besides the one live file, once a day a dated copy (mahdi-jym-version-YYYY-MM-DD-….json) goes to
// the same private app-data folder; the newest S.backupKeep (default 7) are kept. Listed, restored
// and deleted from Settings → Backups. Drive only — Android Backup keeps a single copy.
export const VPREFIX = 'mahdi-jym-version-'
const dayOf = ms => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }

/** Dated versions in Drive, newest first: [{ id, at, kind, size, ts, workouts }]. */
export async function listDriveVersions() {
  const q = encodeURIComponent(`name contains '${VPREFIX}' and trashed=false`)
  const res = await drive(`${DRIVE}/files?spaces=appDataFolder&q=${q}&fields=files(id,name,size,modifiedTime,appProperties)&orderBy=modifiedTime desc&pageSize=50`)
  const j = await res.json()
  return (j.files || []).map(f => {
    const p = f.appProperties || {}
    return { id: f.id, at: Number(p.at) || Date.parse(f.modifiedTime) || 0, kind: p.kind || 'auto', size: Number(f.size) || 0, ts: Number(p.ts) || 0, workouts: Number(p.workouts) || 0, source: 'drive' }
  })
}

/** Save a dated version of `S` to Drive. */
export async function uploadDriveVersion(S, kind = 'auto', now = Date.now()) {
  const body = JSON.stringify({ app: 'MAHDI-JYM', v: 1, kind: 'snapshot', type: kind, savedAt: new Date(now).toISOString(), version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '', S })
  const meta = { name: VPREFIX + dayOf(now) + '-' + now.toString(36) + '.json', mimeType: 'application/json', parents: ['appDataFolder'],
    appProperties: { at: String(now), kind, ts: String(Number(S._ts) || 0), workouts: String((S.workouts || []).length) } }
  const b = 'mj' + Math.random().toString(36).slice(2)
  const multipart = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`
  const res = await drive(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: multipart })
  const j = await res.json()
  return { id: j.id, at: now, kind, source: 'drive' }
}
export async function deleteDriveVersion(id) { await drive(`${DRIVE}/files/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
export const readDriveVersion = id => download(id)

/** The once-a-day Drive version (after a successful Drive round). */
async function dailyDriveVersion(store) {
  const S = store.getState().S
  if (S.autoBackup === false || !onDrive()) return
  const day = dayOf(Date.now())
  if (cloudMeta().verDay === day) return
  await uploadDriveVersion(S, 'auto')
  setMeta({ verDay: day })
  const keep = Number(S.backupKeep) || 7
  const autos = (await listDriveVersions()).filter(v => v.kind === 'auto')
  for (const v of autos.slice(keep)) await deleteDriveVersion(v.id).catch(() => {})
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
  const on = () => savingAnywhere() && autoSaveOn()
  const quiet = () => { if (on()) syncNow(store).catch(() => {}) }
  const schedule = () => {
    if (!on()) return
    if (tm) return
    const wait = Math.max(5000, THROTTLE_MS - (Date.now() - last))
    tm = setTimeout(() => { tm = null; last = Date.now(); quiet() }, wait)
  }
  const unsub = store.subscribe((st, prev) => { if (st.S !== prev.S) schedule() })
  const onVis = () => {
    if (document.visibilityState === 'hidden') { clearTimeout(tm); tm = null; last = Date.now(); quiet() }
    else if (Date.now() - last > 60000) { last = Date.now(); quiet() }
  }
  document.addEventListener('visibilitychange', onVis)
  // 4.0: offline changes go up as soon as the phone is back online
  const onOnline = () => { last = Date.now(); quiet() }
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('online', onOnline)
  setTimeout(quiet, 2500)
  return () => {
    started = false; unsub(); clearTimeout(tm); document.removeEventListener('visibilitychange', onVis)
    if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('online', onOnline)
  }
}
