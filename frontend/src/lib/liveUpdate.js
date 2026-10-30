// 14.0 — the online Android app updates itself, inside the app, without installing a new APK.
//
// GitHub Pages carries the online app's web bundle of the newest release:
//   https://m777m44.github.io/Heroes-Jym/live/online.json   its version, the native level it needs and
//                                                            every file with its size and SHA-256
//   https://m777m44.github.io/Heroes-Jym/live/<version>/…   the files (scripts/build-site.sh)
// The app asks at most once a day (and when you tap "Check for updates"). When a newer version is
// there and this APK can run it — its native level (the Capacitor plugins and the app's own Android
// code, `mjNative` in package.json) is at least the one the bundle was built with:
//   1. every file is fetched and checked against its SHA-256 — files the running version already has
//      (the same name and the same SHA-256: most of them, as Vite names files by their contents) are
//      copied from it instead — and written to the app's private storage, files/live/<version>/
//   2. Capacitor's WebView is pointed at that folder (WebView.setServerBasePath) and reloads. The
//      origin stays https://localhost, so all your data stays exactly where it was
//   3. the switch becomes permanent (persistServerBasePath) only once the new version has started and
//      run for a few seconds (liveBoot, below). One that can't start is gone at the next app start —
//      the previous version comes back and that update isn't offered again
// Installing a new APK goes back to the APK's own version (Capacitor's "new binary" check), and
// Settings → App & updates → "Go back to the built-in version" does it by hand.
//
// Only in the online Android app (VARIANT 'online'); everywhere else liveSupported() is false.
import { create } from 'zustand'
import { MOBILE } from './mobile.js'
import { VARIANT, APP_VERSION, SITE, cmpVersion } from './updates.js'

export const LIVE_URL = SITE + 'live/online.json'
/** The native level this bundle was built with (package.json → mjNative). */
export const NATIVE_LEVEL = typeof __NATIVE_LEVEL__ !== 'undefined' ? __NATIVE_LEVEL__ : 1
const K_APK = 'mj_apk', K_PENDING = 'mj_live_pending', K_BAD = 'mj_live_bad', K_RESET = 'mj_live_reset', K_LAST = 'mj_live_check', K_DONE = 'mj_live_done', K_STARTED = 'mj_live_started'
const DAY = 20 * 3600e3
const DIR = 'live'

const isAndroid = () => { try { return !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android') } catch { return false } }
/** Updating inside the app: only the online Android app. */
export const liveSupported = () => MOBILE && VARIANT === 'online' && isAndroid()

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k) } catch { /* private mode */ } },
}

/** The update screen's state: idle | checking | latest | ready | needs-apk | failed | downloading | applying | error. */
export const useLive = create(() => ({ state: 'idle', m: null, done: 0, total: 0, error: '', live: false, apk: null }))
const put = patch => useLive.setState(patch)

// ---- the manifest ----------------------------------------------------------------------------------
/** Checks and tidies live/online.json → { version, native, base, files: [{ p, s, h }], size }; throws when it is broken. */
export function parseLive(j, url = LIVE_URL) {
  if (!j || typeof j !== 'object' || j.v !== 1) throw new Error('not a live manifest')
  const version = String(j.version || '').replace(/^v/i, '')
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('bad version')
  const native = Math.max(1, Math.round(+j.native || 1))
  const files = (Array.isArray(j.files) ? j.files : []).map(f => ({ p: String(f[0] || ''), s: +f[1] || 0, h: String(f[2] || '').toLowerCase() }))
  if (!files.length || !files.some(f => f.p === 'index.html')) throw new Error('no index.html')
  for (const f of files) {
    if (!/^[\w.\-/]+$/.test(f.p) || f.p.includes('..') || f.p.startsWith('/')) throw new Error('bad path ' + f.p)
    if (!/^[0-9a-f]{64}$/.test(f.h)) throw new Error('bad hash ' + f.p)
  }
  const base = new URL(String(j.base || version + '/'), url).href
  return { version, native, base, files, size: files.reduce((a, f) => a + f.s, 0) }
}

/** What to do with a manifest: 'latest' (nothing newer) | 'needs-apk' | 'failed' (it couldn't start before) | 'ready'. */
export function liveDecision(m, { current = APP_VERSION, apkNative = apkInfo().native, bad = ls.get(K_BAD) } = {}) {
  if (!m || cmpVersion(m.version, current) <= 0) return 'latest'
  if (m.native > apkNative) return 'needs-apk'
  if (bad === m.version) return 'failed'
  return 'ready'
}
/** The installed APK: its own version and native level (saved whenever its built-in version runs). */
export const apkInfo = () => { const a = ls.get(K_APK); return a && a.native ? a : { native: NATIVE_LEVEL, version: APP_VERSION } }

/** Ask GitHub Pages for the newest bundle (throws when offline). */
export async function checkLive({ fetchImpl = typeof fetch === 'function' ? fetch : null, now = Date.now() } = {}) {
  if (!fetchImpl) throw new Error('offline')
  const r = await fetchImpl(LIVE_URL + '?t=' + Math.floor(now / 60000), { cache: 'no-store' })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const m = parseLive(await r.json())
  ls.set(K_LAST, { at: now, version: m.version })
  return m
}

// ---- downloading -----------------------------------------------------------------------------------
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
async function sha256(buf) { return hex(await crypto.subtle.digest('SHA-256', buf)) }
/** ArrayBuffer → base64, in slices (a big chunk would overflow String.fromCharCode). */
export function toBase64(buf) {
  const u = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000))
  return btoa(s)
}
async function fs() {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  return { Filesystem, Directory }
}

/**
 * Fetch every file of a bundle into files/live/<version>/ (4 at a time), checked against its SHA-256.
 * onProgress(doneBytes, totalBytes). Resolves the folder's absolute path.
 */
export async function downloadLive(m, { onProgress = () => {}, signal = null, fetchImpl = fetch } = {}) {
  const { Filesystem, Directory } = await fs()
  const dir = DIR + '/' + m.version
  await Filesystem.rmdir({ path: dir, directory: Directory.Data, recursive: true }).catch(() => {})
  let done = 0, i = 0
  const total = m.size
  const one = async f => {
    let buf = null
    // the running version may have it already (same name, same contents)
    try {
      const r = await fetchImpl(new URL(f.p, location.origin + '/').href, { cache: 'no-store' })
      if (r.ok) { const b = await r.arrayBuffer(); if (b.byteLength === f.s && (await sha256(b)) === f.h) buf = b }
    } catch { /* not there */ }
    if (!buf) {
      const r = await fetchImpl(m.base + f.p, { cache: 'no-store', signal })
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + f.p)
      const b = await r.arrayBuffer()
      if ((await sha256(b)) !== f.h) throw new Error('checksum ' + f.p)
      buf = b
    }
    await Filesystem.writeFile({ path: dir + '/' + f.p, data: toBase64(buf), directory: Directory.Data, recursive: true })
    done += f.s
    onProgress(done, total)
  }
  const worker = async () => { while (i < m.files.length) { if (signal && signal.aborted) throw new Error('cancelled'); await one(m.files[i++]) } }
  await Promise.all([worker(), worker(), worker(), worker()])
  await Filesystem.writeFile({ path: dir + '/.mj-live.json', data: JSON.stringify({ version: m.version, files: m.files.length, at: Date.now() }), directory: Directory.Data, encoding: 'utf8' })
  const { uri } = await Filesystem.getUri({ path: dir, directory: Directory.Data })
  return decodeURIComponent(uri.replace(/^file:\/\//, ''))
}

/** Switch to a downloaded bundle: the WebView reloads into it (made permanent by liveBoot once it runs). */
export async function applyLive(m, path) {
  const { WebView } = await import('@capacitor/core')
  ls.set(K_PENDING, { version: m.version, path, at: Date.now() })
  put({ state: 'applying' })
  await WebView.setServerBasePath({ path })
}

/** Back to the APK's own version (the next start of it makes that permanent). */
export async function resetLive() {
  const { WebView } = await import('@capacitor/core')
  ls.set(K_RESET, 1)
  ls.del(K_PENDING)
  await WebView.setServerAssetPath({ path: 'public' })
}

/** Remove downloaded versions other than `keep` (a version string, or null for all). */
async function cleanup(keep) {
  try {
    const { Filesystem, Directory } = await fs()
    const { files } = await Filesystem.readdir({ path: DIR, directory: Directory.Data })
    for (const f of files || []) {
      const name = typeof f === 'string' ? f : f.name
      if (name && name !== keep) await Filesystem.rmdir({ path: DIR + '/' + name, directory: Directory.Data, recursive: true }).catch(() => {})
    }
  } catch { /* no live folder yet */ }
}

/**
 * Every start of the online app. The APK's own version records its native level and tidies up; a
 * downloaded version that was just switched to becomes permanent once it has run `settleMs`. If the app
 * was closed before that, the version it falls back to switches once more (twice at most); one that
 * never started is marked so it isn't offered again. Resolves { live, version }.
 */
export async function liveBoot({ settleMs = 4000 } = {}) {
  if (!liveSupported()) return { live: false }
  const { WebView } = await import('@capacitor/core')
  let base = ''
  try { base = (await WebView.getServerBasePath()).path || '' } catch { /* old shell */ }
  const live = base.includes('/' + DIR + '/')
  const pending = ls.get(K_PENDING)
  if (!live) {
    ls.set(K_APK, { native: NATIVE_LEVEL, version: APP_VERSION })   // the APK's own version is running
    if (ls.get(K_RESET)) { await WebView.persistServerBasePath().catch(() => {}); ls.del(K_RESET) }
  }
  put({ live, apk: apkInfo() })
  if (pending && pending.version === APP_VERSION && live) {
    // just switched to this version: it started — keep it once it has run a few seconds
    ls.set(K_STARTED, APP_VERSION)
    await new Promise(r => setTimeout(r, settleMs))
    await WebView.persistServerBasePath().catch(() => {})
    ls.del(K_PENDING)
    ls.set(K_DONE, APP_VERSION)
    cleanup(APP_VERSION)
    return { live, version: APP_VERSION }
  }
  if (pending && cmpVersion(pending.version, APP_VERSION) > 0) {
    if (ls.get(K_STARTED) === pending.version && (pending.tries || 0) < 2 && await exists(pending.path)) {
      // it started before but the app was closed too soon: switch again
      ls.set(K_PENDING, { ...pending, tries: (pending.tries || 0) + 1 })
      await WebView.setServerBasePath({ path: pending.path })
      return { live, version: APP_VERSION, switching: true }
    }
    ls.set(K_BAD, pending.version)   // it never started
  }
  ls.del(K_PENDING)
  cleanup(live ? APP_VERSION : null)
  return { live, version: APP_VERSION }
}
async function exists(path) {
  try {
    const { Filesystem } = await fs()
    await Filesystem.stat({ path: 'file://' + path + '/index.html' })
    return true
  } catch { return false }
}
/** The version just switched to, once (for a "Updated to …" toast). */
export function takeUpdated() { const v = ls.get(K_DONE); if (v) ls.del(K_DONE); return v }

// ---- the flow the screens use ------------------------------------------------------------------------
/** Check now (or, with `auto`, at most once a day); sets the state. */
export async function liveCheck({ auto = false } = {}) {
  if (!liveSupported()) return null
  const last = ls.get(K_LAST)
  if (auto && last && Date.now() - (last.at || 0) < DAY && cmpVersion(last.version, APP_VERSION) <= 0) return null
  put({ state: 'checking', error: '' })
  try {
    const m = await checkLive()
    const d = liveDecision(m)
    put({ state: d, m })
    return d
  } catch (e) {
    put({ state: auto ? 'idle' : 'error', error: String((e && e.message) || e) })
    return null
  }
}
let busy = false
/** Download and switch to the version found by liveCheck. */
export async function liveUpdateNow() {
  const { m, state } = useLive.getState()
  if (busy || !m || state !== 'ready') return
  busy = true
  put({ state: 'downloading', done: 0, total: m.size, error: '' })
  try {
    const path = await downloadLive(m, { onProgress: (done, total) => put({ done, total }) })
    await applyLive(m, path)
  } catch (e) {
    put({ state: 'error', error: String((e && e.message) || e) })
  } finally { busy = false }
}
