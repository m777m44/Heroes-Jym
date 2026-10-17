// 4.0 — lock the app with the phone's own screen lock (fingerprint / face, or its PIN) — the
// native AppLock plugin (android/…/lock/AppLockPlugin.java). This phone only: the setting lives
// in localStorage ('mj_lock'), never in your synced data, so restoring a backup on another phone
// can't lock you out there.
import { MOBILE } from './mobile.js'

const KEY = 'mj_lock'
export const LOCK_AFTER = [0, 60, 300, 900]           // seconds in the background before it locks
export const DEFAULT_AFTER = 60
// BiometricPrompt errors meaning "there is nothing to unlock with any more" (the screen lock was
// removed): the lock turns itself off instead of shutting you out.
export const GONE = new Set(['11', '12', '14', '15'])
export const CANCELLED = new Set(['5', '10', '13'])

export function lockPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}') || {}
    return { on: !!p.on, after: LOCK_AFTER.includes(p.after) ? p.after : DEFAULT_AFTER }
  } catch { return { on: false, after: DEFAULT_AFTER } }
}
const listeners = new Set()
export function onLockChange(f) { listeners.add(f); return () => listeners.delete(f) }
export function setLockPrefs(patch) {
  const p = { ...lockPrefs(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* private mode */ }
  listeners.forEach(f => { try { f(p) } catch { /* */ } })
  return p
}

/** Lock now? On start when it's on; after the app was away for at least `after` seconds. */
export function shouldLock(prefs, hiddenAt, now = Date.now()) {
  if (!prefs || !prefs.on) return false
  if (hiddenAt == null) return true
  return now - hiddenAt >= prefs.after * 1000
}

// Plugin proxies are thenables — keep them inside { p } (see lib/cloud.js).
let holderP = null
function holder() {
  if (!MOBILE) return Promise.resolve(null)
  if (!holderP) holderP = (async () => {
    try {
      const { Capacitor, registerPlugin } = await import('@capacitor/core')
      if (Capacitor.getPlatform() !== 'android' || !Capacitor.isPluginAvailable('AppLock')) return null
      return { p: registerPlugin('AppLock') }
    } catch { return null }
  })()
  return holderP
}

/** { available, biometric } — available = the phone has a screen lock this app can use. */
export async function lockAvailable() {
  const h = await holder()
  if (!h) return { available: false, biometric: false }
  try { const r = await h.p.available(); return { available: !!(r && r.available), biometric: !!(r && r.biometric) } }
  catch { return { available: false, biometric: false } }
}

/** Ask for the fingerprint / PIN. Resolves { ok } or { ok: false, code }. */
export async function authenticate(title, subtitle) {
  const h = await holder()
  if (!h) return { ok: false, code: 'UNAVAILABLE' }
  try { await h.p.authenticate({ title, subtitle }); return { ok: true } }
  catch (e) { return { ok: false, code: String((e && e.code) || '') } }
}
