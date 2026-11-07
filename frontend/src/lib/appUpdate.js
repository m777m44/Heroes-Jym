// 17.0 — the in-app update (التحديث الداخلي): one flow for both Android apps, from the bottom of the
// screen (components/UpdateDock.jsx) — "Update" and "Cancel", then the download with its real progress.
//
//   live   the online app: a newer build on GitHub Pages — a new version, or the same version with
//          changes (lib/liveUpdate.js). Only the changed files download, each checked (SHA-256); the
//          app restarts into it in a second. No APK, nothing to install, the data stays.
//   apk    a new release that needs a new APK — every release of the offline app, and the online
//          app's when its native part changes (lib/apkUpdate.js): the APK downloads INSIDE the app,
//          is checked (size + SHA-256 from GitHub), and Android's installer opens over it.
//   link   an APK from before 17.0 (no native updater): the download opens in the browser.
//   demo   the web app and demo (Settings → "See how updating works"): the same screens with a
//          simulated download — nothing is downloaded.
//
// Phases: idle · checking · latest · available · downloading · verifying · installing · permission
// (Android needs "Install unknown apps" once) · ready (downloaded, the installer can open again) · error.
// Progress is counted in bytes as they arrive — `done / total` is the share of the work, `bytes /
// bytesTotal` what came over the network, with its speed and the time left.
//
// The app looks by itself when it starts and when it comes back (at most every 30 minutes; GitHub
// releases at most every 3 hours) — Settings can turn that off. "Cancel" on an offer hides it for 12
// hours; during a download it stops it (what was downloaded stays for next time).
import { create } from 'zustand'
import { MOBILE } from './mobile.js'
import { VARIANT, APP_VERSION, OWN_NOTES, checkLatest, autoCheck, cmpVersion, openLink } from './updates.js'
import { liveSupported, liveCheck, liveUpdateNow, liveCancel, useLive, sameVersion, takeUpdated } from './liveUpdate.js'
import { apkSupported, downloadApk, canInstall, installApk, openInstallSettings, cleanupApks, takeApkUpdated } from './apkUpdate.js'

export const SNOOZE_MS = 12 * 3600e3
export const RELEASE_MAX_AGE = 3 * 3600e3
export const HISTORY_MAX = 12
const K_AUTO = 'mj_upd_auto', K_SNOOZE = 'mj_upd_snooze', K_HISTORY = 'mj_upd_history', K_SEEN = 'mj_upd_seen'

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } },
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

const IDLE = { kind: null, version: '', same: false, size: 0, full: 0, notes: null, asset: null, url: '', build: null,
  done: 0, total: 0, bytes: 0, bytesTotal: 0, speed: 0, eta: null, error: '', stopped: false }
export const useUpdate = create(() => ({ phase: 'idle', dock: false, checkedAt: 0, ...IDLE }))
const get = () => useUpdate.getState()
const set = patch => useUpdate.setState(patch)

/** Phases in which the update is under way (nothing else may start). */
export const BUSY = ['downloading', 'verifying', 'installing']
export const isBusy = (phase = get().phase) => BUSY.includes(phase)
/** Does this build have the in-app update (the Android apps)? */
export const updatesHere = () => MOBILE

// ---- settings, snooze, history ---------------------------------------------------------------------
/** Look for updates by itself (on unless turned off in Settings). */
export const autoOn = () => ls.get(K_AUTO) !== false
export const setAutoOn = on => ls.set(K_AUTO, !!on)
/** An offer's identity, for "Cancel" (snooze) — a new build or version is offered again at once. */
export const offerId = o => (o ? (o.kind || '') + ':' + o.version + (o.build ? '+' + o.build : '') : '')
export function snoozed(o, now = Date.now(), s = ls.get(K_SNOOZE)) { return !!s && s.id === offerId(o) && now < (s.until || 0) }
function snooze(o, now = Date.now()) { ls.set(K_SNOOZE, { id: offerId(o), until: now + SNOOZE_MS }) }

/** The versions this phone got: newest first, [{ v, at, how: 'live' | 'apk' | 'install', same }]. */
export const updateHistory = () => { const h = ls.get(K_HISTORY); return Array.isArray(h) ? h : [] }
export function addHistory(e, list = updateHistory()) {
  const next = [{ ...e, at: e.at || Date.now() }, ...list.filter(x => !(x.v === e.v && x.how === e.how && !e.same))].slice(0, HISTORY_MAX)
  ls.set(K_HISTORY, next)
  return next
}

// ---- speed and time left ---------------------------------------------------------------------------
/**
 * A download meter: push(bytes, ms) → bytes per second, smoothed (a new sample every quarter second,
 * weighted 30 %) so the number reads calmly but follows the network.
 */
export function meter() {
  let lastT = null, last = 0, speed = 0
  return {
    push(bytes, now) {
      if (lastT === null) { lastT = now; last = bytes; return speed }
      const dt = (now - lastT) / 1000
      if (dt >= 0.25) {
        const inst = Math.max(0, (bytes - last) / dt)
        speed = speed ? speed * 0.7 + inst * 0.3 : inst
        lastT = now; last = bytes
      }
      return speed
    },
    get speed() { return speed },
  }
}
/** Seconds left at this speed (null while it isn't known). */
export const etaOf = (done, total, speed) => (speed > 512 && total > 0 ? Math.max(0, Math.ceil((total - done) / speed)) : null)

// ---- checking --------------------------------------------------------------------------------------
async function releaseOffer(variant, { auto }) {
  const rel = auto ? await autoCheck({ maxAge: RELEASE_MAX_AGE }) : await checkLatest()
  if (!rel || !rel.version || cmpVersion(rel.version, APP_VERSION) <= 0) return null
  const asset = variant === 'online' ? rel.online : rel.offline
  if (!asset || !asset.url) return null
  return { kind: (await apkSupported()) ? 'apk' : 'link', version: rel.version, same: false, size: asset.size || 0, full: asset.size || 0, notes: rel.notes || null, asset, url: rel.url || '', build: null }
}

/**
 * Look for an update (auto: 'start' | 'resume' — by itself, quietly; false — the user asked).
 * Resolves 'available' | 'latest' | null (nothing to say: offline, turned off, or looked just now).
 */
export async function updateCheck({ auto = false } = {}) {
  if (!updatesHere() || isBusy()) return null
  if (auto && !autoOn()) return null
  const was = get().phase
  if (!auto) set({ phase: 'checking', error: '' })
  try {
    let offer = null
    if (liveSupported()) {
      await liveCheck({ auto })
      const { state, m, plan } = useLive.getState()
      if (state === 'ready') offer = { kind: 'live', version: m.version, same: sameVersion(m), size: plan ? plan.net : m.size, full: m.size, notes: m.notes, asset: null, url: '', build: m.build }
      else if (state === 'needs-apk' || state === 'failed') offer = await releaseOffer('online', { auto })
      else if (state !== 'latest') {
        if (auto) return null
        throw new Error('offline')
      }
    } else {
      offer = await releaseOffer(VARIANT, { auto })
    }
    if (!offer) {
      if (auto && was === 'available') return null    // a quiet look that found nothing new keeps the offer
      set({ phase: 'latest', checkedAt: Date.now(), dock: false, ...IDLE })
      return 'latest'
    }
    set({ phase: 'available', checkedAt: Date.now(), ...IDLE, ...offer, dock: !auto || !snoozed(offer) })
    return 'available'
  } catch {
    if (auto) { if (was === 'checking') set({ phase: 'idle' }); return null }
    set({ phase: 'error', error: 'offline', dock: false })
    return null
  }
}

// ---- updating ---------------------------------------------------------------------------------------
let apkCtl = null, apkPath = null, demoStop = null

/** Progress from a download → the state, about ten times a second. */
function progressSink(kind) {
  const m = meter()
  let shown = 0
  return p => {
    const now = Date.now()
    const bytes = kind === 'live' ? p.netDone : p.done
    const bytesTotal = kind === 'live' ? p.net : p.total
    const speed = m.push(bytes, now)
    if (now - shown < 90 && p.done < p.total) return
    shown = now
    set({ done: p.done, total: p.total, bytes, bytesTotal, speed, eta: etaOf(bytes, bytesTotal, speed) })
  }
}

/** "Update": start the download of what is offered. */
export async function updateStart() {
  const s = get()
  if (!['available', 'error', 'ready', 'permission'].includes(s.phase) || !s.kind) return
  if (s.phase === 'ready' || s.phase === 'permission') return updateInstall()
  set({ dock: true, error: '', stopped: false })
  if (s.kind === 'link') { openLink(s.asset ? s.asset.url : s.url); return }
  if (s.kind === 'live') return startLive()
  if (s.kind === 'apk') return startApk()
  if (s.kind === 'demo') return startDemo()
}

async function startLive() {
  set({ phase: 'downloading', done: 0, total: 1, bytes: 0, bytesTotal: get().size, speed: 0, eta: null })
  const r = await liveUpdateNow({
    onProgress: progressSink('live'),
    beforeApply: async () => {
      set({ phase: 'verifying', done: 1, total: 1, eta: 0 })
      await sleep(700)
      set({ phase: 'installing' })
      await sleep(900)
    },
  })
  if (r === 'cancelled') set({ phase: 'available', stopped: true, speed: 0, eta: null })
  else if (r === 'error') set({ phase: 'error', error: 'network', speed: 0, eta: null })
}

async function startApk() {
  const s = get()
  apkCtl = new AbortController()
  set({ phase: 'downloading', done: 0, total: s.size || 1, bytes: 0, bytesTotal: s.size, speed: 0, eta: null })
  try {
    const res = await downloadApk(s.asset, s.version, { signal: apkCtl.signal, onProgress: progressSink('apk') })
    apkPath = res.path
    set({ phase: 'verifying', done: 1, total: 1, eta: 0 })
    await sleep(700)
    await updateInstall()
  } catch (e) {
    if (e && e.code === 'CANCELLED') set({ phase: 'available', stopped: true, speed: 0, eta: null })
    else set({ phase: 'error', error: String((e && e.code) || 'NETWORK').toLowerCase(), speed: 0, eta: null })
  } finally { apkCtl = null }
}

/** Open Android's installer with the downloaded APK (after asking for the permission once). */
export async function updateInstall() {
  const s = get()
  if (s.kind === 'demo') return
  if (!apkPath) { set({ phase: 'available' }); return }
  if (!(await canInstall())) { set({ phase: 'permission', dock: true }); return }
  set({ phase: 'installing', dock: true })
  try {
    await installApk(apkPath, s.version)
    await sleep(1200)
    set({ phase: 'ready' })      // the installer is open; if it is closed without installing, "Install" opens it again
  } catch {
    set({ phase: 'error', error: 'install' })
  }
}
/** "Open settings" for the install permission. */
export async function updateAllow() { await openInstallSettings() }

/** "Cancel": stop the download — or, on an offer, hide it for 12 hours. */
export function updateCancel() {
  const s = get()
  if (s.phase === 'downloading') {
    if (s.kind === 'live') liveCancel()
    else if (s.kind === 'apk' && apkCtl) apkCtl.abort()
    else if (s.kind === 'demo' && demoStop) demoStop()
    return 'stopping'
  }
  if (isBusy(s.phase)) return null
  if (s.kind && s.kind !== 'demo') snooze(s)
  set({ dock: false, stopped: false })
  if (s.kind === 'demo') set({ phase: 'idle', ...IDLE })
  return 'hidden'
}
/** Show the dock again (Settings → "Update now"). */
export const updateShow = () => { if (get().kind) set({ dock: true }) }

// ---- the demo (web app and demo: nothing is downloaded) -------------------------------------------------
/** Offer a pretend update, to see how it works. */
export function updateDemo({ notes = OWN_NOTES } = {}) {
  if (isBusy()) return
  const [a, b, c] = APP_VERSION.split('.').map(n => parseInt(n, 10) || 0)
  set({ phase: 'available', ...IDLE, kind: 'demo', version: [a, b, c + 1].join('.'), size: 7.4 * 1048576, full: 9.8 * 1048576, notes, dock: true, checkedAt: Date.now() })
}
async function startDemo() {
  const total = get().size
  let done = 0, stopped = false
  demoStop = () => { stopped = true }
  const sink = progressSink('apk')
  set({ phase: 'downloading', done: 0, total, bytes: 0, bytesTotal: total, speed: 0, eta: null })
  const t0 = Date.now()
  while (done < total) {
    await sleep(80)
    if (stopped) { demoStop = null; set({ phase: 'available', stopped: true, speed: 0, eta: null }); return }
    const tt = (Date.now() - t0) / 1000
    const bps = 1.5e6 + Math.sin(tt * 1.7) * 0.45e6 + Math.sin(tt * 4.1) * 0.2e6   // a believable network
    done = Math.min(total, done + bps * 0.08)
    sink({ done, total })
  }
  demoStop = null
  set({ phase: 'verifying', done: 1, total: 1, eta: 0 })
  await sleep(700)
  set({ phase: 'installing' })
  await sleep(1100)
  set({ phase: 'done' })
}

// ---- when the app starts ---------------------------------------------------------------------------------
let booted = false
/**
 * Once, when the app is ready: note what arrived ("Updated to …" — via `toast(version, how)`), tidy
 * downloaded APKs, and look for updates soon after the start and whenever the app comes back.
 */
export function updateBoot({ toast = () => {}, delay = 6000 } = {}) {
  if (booted || !updatesHere()) return () => {}
  booted = true
  const live = liveSupported() ? takeUpdated() : null
  const apk = takeApkUpdated()
  const seen = ls.get(K_SEEN)
  if (live) { addHistory({ v: live.v, how: 'live', same: !!live.same }); toast(live.v, live.same ? 'same' : 'live') }
  else if (apk) { addHistory({ v: apk, how: 'apk' }); toast(apk, 'apk') }
  else if (seen && seen !== APP_VERSION && cmpVersion(APP_VERSION, seen) > 0) addHistory({ v: APP_VERSION, how: 'install' })
  ls.set(K_SEEN, APP_VERSION)
  cleanupApks().catch(() => {})
  const tm = setTimeout(() => { updateCheck({ auto: 'start' }) }, delay)
  const onVis = () => {
    if (document.visibilityState !== 'visible') return
    const s = get()
    if (s.phase === 'permission') { canInstall().then(ok => { if (ok) updateInstall() }); return }
    if (!isBusy(s.phase)) updateCheck({ auto: 'resume' })
  }
  document.addEventListener('visibilitychange', onVis)
  return () => { clearTimeout(tm); document.removeEventListener('visibilitychange', onVis); booted = false }
}
