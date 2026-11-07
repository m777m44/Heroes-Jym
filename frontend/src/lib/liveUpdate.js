// 14.0 — the online Android app updates itself, inside the app, without installing a new APK.
//
// GitHub Pages carries the online app's web bundle of the newest build of main:
//   https://m777m44.github.io/Heroes-Jym/live/online.json   its version, build id, the native level it
//                                                            needs and every file with its size and SHA-256
//   https://m777m44.github.io/Heroes-Jym/live/<version>-<build>/…   the files (scripts/build-site.sh)
// When a newer one is there and this APK can run it — its native level (the Capacitor plugins and the
// app's own Android code, `mjNative` in package.json) is at least the one the bundle was built with:
//   1. only the files that changed are downloaded — the bundle's own list (mj-files.json, made by
//      scripts/slim-online.mjs) says which the running version already has, and those are copied from
//      it — each one checked against its SHA-256 and written to files/live/<version>-<build>/
//   2. Capacitor's WebView is pointed at that folder (WebView.setServerBasePath) and reloads. The
//      origin stays https://localhost, so all your data stays exactly where it was
//   3. the switch becomes permanent (persistServerBasePath) only once the new version has started and
//      run for a few seconds (liveBoot, below). One that can't start is gone at the next app start —
//      the previous version comes back and that update isn't offered again
// Installing a new APK goes back to the APK's own version (Capacitor's "new binary" check), and
// Settings → App & updates → "Go back to the built-in version" does it by hand.
//
// 17.0 — every build counts, not only a new version number: a change on the site (same version, a newer
// build) is offered too. The download is exact and can be cancelled: bytes are counted as they arrive
// (so the percentage is real), each file is tried three times, a cancelled or broken download goes on
// from the files it already has, and only the changed files cost data. The screens use lib/appUpdate.js.
//
// Only in the online Android app (VARIANT 'online'); everywhere else liveSupported() is false.
import { create } from 'zustand'
import { MOBILE } from './mobile.js'
import { VARIANT, APP_VERSION, SITE, cmpVersion } from './updates.js'

export const LIVE_URL = SITE + 'live/online.json'
/** The native level this bundle was built with (package.json → mjNative). */
export const NATIVE_LEVEL = typeof __NATIVE_LEVEL__ !== 'undefined' ? __NATIVE_LEVEL__ : 1
const K_APK = 'mj_apk', K_PENDING = 'mj_live_pending', K_BAD = 'mj_live_bad', K_RESET = 'mj_live_reset', K_LAST = 'mj_live_check', K_DONE = 'mj_live_done', K_STARTED = 'mj_live_started'
const DIR = 'live'
/** 17.0: by itself the app looks again at most this often when it comes back to the screen. */
export const RECHECK_MS = 30 * 60e3

const isAndroid = () => { try { return !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android') } catch { return false } }
/** Updating inside the app: only the online Android app. */
export const liveSupported = () => MOBILE && VARIANT === 'online' && isAndroid()

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k) } catch { /* private mode */ } },
}

/**
 * The live update's state: idle | checking | latest | ready | needs-apk | failed | downloading | applying | error.
 * `plan` (17.0) — what a download of `m` costs: { net, copy, files, changed } bytes / counts.
 */
export const useLive = create(() => ({ state: 'idle', m: null, done: 0, total: 0, error: '', live: false, apk: null, plan: null, here: null }))
const put = patch => useLive.setState(patch)

// ---- the manifest ----------------------------------------------------------------------------------
/**
 * Checks and tidies live/online.json → { version, build, built, native, base, files: [{ p, s, h }], size,
 * notes }; throws when it is broken.
 */
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
  const build = /^[0-9a-f]{6,40}$/.test(String(j.build || '')) ? String(j.build) : null
  const built = j.built && !Number.isNaN(Date.parse(j.built)) ? new Date(j.built).toISOString() : null
  const notes = j.notes && typeof j.notes === 'object' ? { en: String(j.notes.en || '').slice(0, 400), ar: String(j.notes.ar || '').slice(0, 400) } : null
  const base = new URL(String(j.base || version + '/'), url).href
  return { version, build, built, native, base, files, size: files.reduce((a, f) => a + f.s, 0), notes }
}
/** A bundle's identity: '17.0.0+3f2a0b9c8d7e' (or just the version for bundles without a build id). */
export const liveId = m => (m ? m.version + (m.build ? '+' + m.build : '') : '')
/** Its folder in the app's storage: files/live/17.0.0-3f2a0b9c8d7e/ */
export const folderOf = m => m.version + (m.build ? '-' + m.build : '')

/**
 * What to do with a manifest: 'latest' (nothing newer) | 'needs-apk' | 'failed' (it couldn't start
 * before) | 'ready'. A newer version, or (17.0) the same version built later from other files.
 */
export function liveDecision(m, { current = APP_VERSION, build = (useLive.getState().here || {}).build || null, built = (useLive.getState().here || {}).built || null, apkNative = apkInfo().native, bad = ls.get(K_BAD) } = {}) {
  if (!m) return 'latest'
  const c = cmpVersion(m.version, current)
  const newerBuild = c === 0 && !!m.build && !!build && m.build !== build && (!built || !m.built || m.built > built)
  if (c < 0 || (c === 0 && !newerBuild)) return 'latest'
  if (m.native > apkNative) return 'needs-apk'
  if (bad && (bad === liveId(m) || bad === m.version)) return 'failed'
  return 'ready'
}
/** True when the offer is the same version built again (a fix or a change on the site). */
export const sameVersion = (m, current = APP_VERSION) => !!m && cmpVersion(m.version, current) === 0
/** The installed APK: its own version and native level (saved whenever its built-in version runs). */
export const apkInfo = () => { const a = ls.get(K_APK); return a && a.native ? a : { native: NATIVE_LEVEL, version: APP_VERSION } }

/** Ask GitHub Pages for the newest bundle (throws when offline). */
export async function checkLive({ fetchImpl = typeof fetch === 'function' ? fetch : null, now = Date.now() } = {}) {
  if (!fetchImpl) throw new Error('offline')
  const r = await fetchImpl(LIVE_URL + '?t=' + Math.floor(now / 60000), { cache: 'no-store' })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const m = parseLive(await r.json())
  ls.set(K_LAST, { at: now, version: m.version, build: m.build })
  return m
}
export const lastLiveCheck = () => ls.get(K_LAST)

// ---- the running bundle ------------------------------------------------------------------------------
let LOCAL = null
/**
 * 17.0 — the running bundle's own list (mj-files.json): { build, built, map: path → sha256 } — or
 * { build: null, map: null } for a bundle without one (then files are compared by downloading them).
 */
export async function localBundle({ fetchImpl = typeof fetch === 'function' ? fetch : null, origin = typeof location !== 'undefined' ? location.origin : '', fresh = false } = {}) {
  if (LOCAL && !fresh) return LOCAL
  let out = { build: null, built: null, version: APP_VERSION, map: null }
  try {
    const r = await fetchImpl(new URL('mj-files.json', origin + '/').href, { cache: 'no-store' })
    if (r.ok) {
      const j = await r.json()
      if (j && Array.isArray(j.files)) out = { build: j.build || null, built: j.built || null, version: j.version || APP_VERSION, map: new Map(j.files.map(f => [String(f[0]), String(f[2]).toLowerCase()])) }
    }
  } catch { /* an older bundle, or the web */ }
  LOCAL = out
  return out
}
/**
 * What downloading `m` costs from here: the bytes that come over the network (`net`, the changed
 * files) and the ones copied from the running version (`copy`). Without the running bundle's list
 * everything counts as network (the most it can be).
 */
export function planOf(m, local) {
  let net = 0, copy = 0, changed = 0
  for (const f of m.files) {
    if (local && local.map && local.map.get(f.p) === f.h) copy += f.s
    else { net += f.s; changed++ }
  }
  return { net, copy, files: m.files.length, changed }
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
const abortError = () => { const e = new Error('cancelled'); e.name = 'AbortError'; return e }
export const isAbort = e => !!e && (e.name === 'AbortError' || e.message === 'cancelled')

/**
 * A response's body, counting bytes as they arrive (onBytes(n) for every chunk) — the progress bar
 * moves with the network, not file by file.
 */
export async function readBody(r, onBytes = () => {}, signal = null) {
  if (!r.body || typeof r.body.getReader !== 'function') {
    const b = await r.arrayBuffer()
    onBytes(b.byteLength)
    return b
  }
  const reader = r.body.getReader()
  const parts = []
  let n = 0
  for (;;) {
    if (signal && signal.aborted) { try { reader.cancel() } catch { /* */ } throw abortError() }
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    n += value.byteLength
    onBytes(value.byteLength)
  }
  const out = new Uint8Array(n)
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.byteLength }
  return out.buffer
}

/** Weight of a byte copied from the running version against one from the network (it's that much quicker). */
export const COPY_WEIGHT = 0.12
// files of a bundle already written by an earlier try in this session: a retry goes on from them
let RESUME = { id: '', done: new Set() }

/**
 * Fetch a bundle into files/live/<version>-<build>/ (six files at a time), each checked against its
 * SHA-256. Files the running version has (its mj-files.json, or the same name and SHA-256) are copied
 * from it. onProgress({ done, total, net, netDone, files, filesDone }) — `done / total` is the share of
 * the work (network bytes, plus copied ones at COPY_WEIGHT). Resolves the folder's absolute path.
 */
export async function downloadLive(m, { onProgress = () => {}, signal = null, fetchImpl = fetch, local = null, workers = 6, tries = 3, wait = ms => new Promise(r => setTimeout(r, ms)), io = null } = {}) {
  const { Filesystem, Directory } = io || await fs()
  const dir = DIR + '/' + folderOf(m)
  const id = liveId(m)
  if (RESUME.id !== id) {
    await Filesystem.rmdir({ path: dir, directory: Directory.Data, recursive: true }).catch(() => {})
    RESUME = { id, done: new Set() }
  }
  const kept = RESUME.done
  const todo = m.files.filter(f => !kept.has(f.p))
  const has = f => !!(local && local.map && local.map.get(f.p) === f.h)
  let net = 0, copy = 0
  for (const f of todo) { if (has(f)) copy += f.s; else net += f.s }
  let total = Math.max(1, net + copy * COPY_WEIGHT)
  let netDone = 0, copyDone = 0, filesDone = m.files.length - todo.length
  const report = () => onProgress({ done: Math.min(total, netDone + copyDone * COPY_WEIGHT), total, net, netDone: Math.min(net, netDone), files: m.files.length, filesDone })
  report()
  const fromNet = async f => {
    let got = 0
    for (let a = 1; ; a++) {
      if (signal && signal.aborted) throw abortError()
      try {
        const r = await fetchImpl(m.base + f.p, { cache: 'no-store', signal })
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + f.p)
        const b = await readBody(r, n => { got += n; netDone += n; report() }, signal)
        if (b.byteLength !== f.s || (await sha256(b)) !== f.h) throw new Error('checksum ' + f.p)
        return b
      } catch (e) {
        netDone -= got; got = 0; report()          // that try's bytes don't count
        if (isAbort(e) || (signal && signal.aborted)) throw abortError()
        if (a >= tries) throw e
        await wait(500 * a)
      }
    }
  }
  const fromHere = async f => {
    try {
      const r = await fetchImpl(new URL(f.p, location.origin + '/').href, { cache: 'no-store' })
      if (r.ok) {
        const b = await r.arrayBuffer()
        // the running bundle's list vouches for its own files; without it each one is checked
        if (b.byteLength === f.s && (has(f) || (await sha256(b)) === f.h)) return b
      }
    } catch { /* not there */ }
    return null
  }
  const one = async f => {
    const mine = has(f)
    let buf = mine || !(local && local.map) ? await fromHere(f) : null
    if (buf) {
      if (mine) copyDone += f.s
      else netDone += f.s                         // counted as a download, but the running version had it
      report()
    } else {
      if (mine) {                                 // the copy wasn't there after all: it comes over the network
        copy -= f.s; net += f.s
        total = Math.max(1, net + copy * COPY_WEIGHT)
      }
      buf = await fromNet(f)
    }
    if (signal && signal.aborted) throw abortError()
    await Filesystem.writeFile({ path: dir + '/' + f.p, data: toBase64(buf), directory: Directory.Data, recursive: true })
    kept.add(f.p)
    filesDone++
    report()
  }
  let i = 0
  const worker = async () => { while (i < todo.length) { if (signal && signal.aborted) throw abortError(); await one(todo[i++]) } }
  await Promise.all(Array.from({ length: Math.max(1, workers) }, worker))
  await Filesystem.writeFile({ path: dir + '/.mj-live.json', data: JSON.stringify({ version: m.version, build: m.build, files: m.files.length, at: Date.now() }), directory: Directory.Data, encoding: 'utf8' })
  const { uri } = await Filesystem.getUri({ path: dir, directory: Directory.Data })
  RESUME = { id: '', done: new Set() }
  return decodeURIComponent(uri.replace(/^file:\/\//, ''))
}

/** Switch to a downloaded bundle: the WebView reloads into it (made permanent by liveBoot once it runs). */
export async function applyLive(m, path) {
  const { WebView } = await import('@capacitor/core')
  ls.set(K_PENDING, { version: m.version, build: m.build, id: liveId(m), same: sameVersion(m), path, at: Date.now() })
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

/** The folder a server base path points at: …/files/live/17.0.0-3f2a… → '17.0.0-3f2a…' */
export const folderOfBase = base => { const m = String(base || '').match(/\/live\/([^/]+)\/?$/); return m ? m[1] : null }
/** Remove downloaded versions other than `keep` (a folder name, or null for all). */
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
  const here = await localBundle()
  const hereId = APP_VERSION + (here.build ? '+' + here.build : '')
  const pending = ls.get(K_PENDING)
  if (!live) {
    ls.set(K_APK, { native: NATIVE_LEVEL, version: APP_VERSION, build: here.build })   // the APK's own version is running
    if (ls.get(K_RESET)) { await WebView.persistServerBasePath().catch(() => {}); ls.del(K_RESET) }
  }
  put({ live, apk: apkInfo(), here: { build: here.build, built: here.built, id: hereId } })
  const pid = pending ? pending.id || pending.version : ''
  const started = !!pending && live && (pending.id ? pending.id === hereId : pending.version === APP_VERSION)
  if (started) {
    // just switched to this version: it started — keep it once it has run a few seconds
    ls.set(K_STARTED, pid)
    await new Promise(r => setTimeout(r, settleMs))
    await WebView.persistServerBasePath().catch(() => {})
    ls.del(K_PENDING)
    ls.set(K_DONE, { v: APP_VERSION, same: !!pending.same, at: Date.now() })
    cleanup(folderOfBase(base))
    return { live, version: APP_VERSION }
  }
  if (pending && pid !== hereId && (pending.id || cmpVersion(pending.version, APP_VERSION) > 0)) {
    if (ls.get(K_STARTED) === pid && (pending.tries || 0) < 2 && await exists(pending.path)) {
      // it started before but the app was closed too soon: switch again
      ls.set(K_PENDING, { ...pending, tries: (pending.tries || 0) + 1 })
      await WebView.setServerBasePath({ path: pending.path })
      return { live, version: APP_VERSION, switching: true }
    }
    ls.set(K_BAD, pid)   // it never started
  }
  ls.del(K_PENDING)
  cleanup(live ? folderOfBase(base) : null)
  return { live, version: APP_VERSION }
}
async function exists(path) {
  try {
    const { Filesystem } = await fs()
    await Filesystem.stat({ path: 'file://' + path + '/index.html' })
    return true
  } catch { return false }
}
/** The update just switched to, once (for an "Updated to …" toast): { v, same } or null. */
export function takeUpdated() {
  const v = ls.get(K_DONE)
  if (!v) return null
  ls.del(K_DONE)
  return typeof v === 'string' ? { v, same: false } : v
}

// ---- the flow the screens use ------------------------------------------------------------------------
/**
 * Check now — or by itself (`auto`): when the app starts, and when it comes back after RECHECK_MS.
 * Sets the state and works out the download (`plan`). Resolves the decision, or null.
 */
export async function liveCheck({ auto = false, now = Date.now() } = {}) {
  if (!liveSupported()) return null
  const last = ls.get(K_LAST)
  if (auto === 'resume' && last && now - (last.at || 0) < RECHECK_MS) return null
  const was = useLive.getState().state
  if (['downloading', 'applying'].includes(was)) return was
  put({ state: 'checking', error: '' })
  try {
    const [m, here] = await Promise.all([checkLive({ now }), localBundle()])
    const d = liveDecision(m, { build: here.build, built: here.built })
    put({ state: d, m, plan: d === 'ready' ? planOf(m, here) : null })
    return d
  } catch (e) {
    put({ state: auto ? (was === 'ready' ? 'ready' : 'idle') : 'error', error: String((e && e.message) || e) })
    return null
  }
}
let ctl = null
/**
 * Download and switch to the version found by liveCheck. onProgress gets the download's progress
 * (see downloadLive); `beforeApply` runs between the download and the restart (the screen's "done"
 * moment). Resolves 'applied' | 'cancelled' | 'error'.
 */
export async function liveUpdateNow({ onProgress = () => {}, beforeApply = null } = {}) {
  const { m, state } = useLive.getState()
  if (ctl || !m || !['ready', 'error'].includes(state)) return 'error'
  ctl = new AbortController()
  put({ state: 'downloading', done: 0, total: m.size, error: '' })
  let shown = 0
  try {
    const local = await localBundle()
    const path = await downloadLive(m, {
      signal: ctl.signal, local,
      onProgress: p => {
        // every chunk of six downloads reports — the screen needs about ten a second
        const t = Date.now()
        if (t - shown < 90 && p.done < p.total) return
        shown = t
        put({ done: p.done, total: p.total })
        onProgress(p)
      },
    })
    if (beforeApply) await beforeApply()
    await applyLive(m, path)
    return 'applied'
  } catch (e) {
    if (isAbort(e)) { put({ state: 'ready', error: '' }); return 'cancelled' }
    put({ state: 'error', error: String((e && e.message) || e) })
    return 'error'
  } finally { ctl = null }
}
/** Stop a download that is running (the files it already has stay for the next try). */
export function liveCancel() {
  if (ctl) { ctl.abort(); return true }
  return false
}
