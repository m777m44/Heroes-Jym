// 17.0 — a new MAHDI-JYM release downloads INSIDE the app and installs over it: the native AppUpdate
// plugin (android/…/update/AppUpdatePlugin.java). Used for every release of the offline app, and for
// the online app's releases that need a new APK (a new native level). The download reports its bytes
// as they arrive, can be cancelled (and goes on later from where it stopped), and is checked against
// the size and SHA-256 GitHub publishes; then Android's own installer opens — with the same signature
// it installs as an update, and all the data stays.
//
// An APK from before 17.0 has no plugin: apkSupported() is false and the screens fall back to a link.
import { MOBILE } from './mobile.js'
import { APP_VERSION } from './updates.js'

const K_TARGET = 'mj_apk_target'

// Plugin proxies are thenables — keep them inside { p } (see lib/cloud.js).
let holderP = null
function holder() {
  if (!MOBILE) return Promise.resolve(null)
  if (!holderP) holderP = (async () => {
    try {
      const { Capacitor, registerPlugin } = await import('@capacitor/core')
      if (Capacitor.getPlatform() !== 'android' || !Capacitor.isPluginAvailable('AppUpdate')) return null
      return { p: registerPlugin('AppUpdate') }
    } catch { return null }
  })()
  return holderP
}
/** Can this app download and install its own APK (Android, an APK from 17.0 on)? */
export async function apkSupported() { return !!(await holder()) }

/** Error codes of the plugin → what the screens say. */
export const APK_ERRORS = ['CANCELLED', 'NETWORK', 'SIZE', 'CHECKSUM', 'SPACE', 'BAD_URL', 'BUSY', 'MISSING', 'INSTALL', 'UNAVAILABLE']
export const errCode = e => { const c = String((e && e.code) || ''); return /^HTTP_\d+$/.test(c) ? 'NETWORK' : APK_ERRORS.includes(c) ? c : 'NETWORK' }

/**
 * Download the release's APK: asset = { url, size, sha256 } (lib/updates.js → parseRelease).
 * onProgress({ done, total }) as bytes arrive; aborting `signal` cancels. Resolves { path, size, sha256 };
 * rejects with { code } (CANCELLED, NETWORK, SIZE, CHECKSUM, SPACE…).
 */
export async function downloadApk(asset, version, { onProgress = () => {}, signal = null } = {}) {
  const h = await holder()
  if (!h) throw Object.assign(new Error('no plugin'), { code: 'UNAVAILABLE' })
  const sub = await h.p.addListener('progress', e => onProgress({ done: +e.done || 0, total: +e.total > 0 ? +e.total : asset.size || 0 }))
  const stop = () => { h.p.cancel().catch(() => {}) }
  if (signal) signal.addEventListener('abort', stop, { once: true })
  try {
    return await h.p.download({ url: asset.url, version, size: asset.size || 0, sha256: asset.sha256 || null })
  } catch (e) {
    throw Object.assign(new Error(String((e && e.message) || e)), { code: signal && signal.aborted ? 'CANCELLED' : errCode(e) })
  } finally {
    if (signal) signal.removeEventListener('abort', stop)
    try { await sub.remove() } catch { /* */ }
  }
}

/** Is "Install unknown apps" allowed for this app? */
export async function canInstall() {
  const h = await holder()
  if (!h) return false
  try { return !!(await h.p.canInstall()).allowed } catch { return false }
}
/** Open that switch in the phone's settings. */
export async function openInstallSettings() {
  const h = await holder()
  if (h) await h.p.openInstallSettings().catch(() => {})
}
/** Open Android's installer with the downloaded APK (remembers the version, for the "Updated" note). */
export async function installApk(path, version) {
  const h = await holder()
  if (!h) throw Object.assign(new Error('no plugin'), { code: 'UNAVAILABLE' })
  try { localStorage.setItem(K_TARGET, JSON.stringify({ v: version, at: Date.now() })) } catch { /* private mode */ }
  try { await h.p.install({ path }) } catch (e) { throw Object.assign(new Error(String((e && e.message) || e)), { code: errCode(e) }) }
}
/** Remove downloaded APKs (all of them, or all but the file `keep`). */
export async function cleanupApks(keep = '') {
  const h = await holder()
  if (h) await h.p.cleanup({ keep }).catch(() => {})
}

/**
 * Once per start: did the APK update we started arrive? → the version (for "Updated to …"), or null.
 * A target that never arrived is forgotten after two days.
 */
export function takeApkUpdated(current = APP_VERSION, now = Date.now()) {
  let t = null
  try { t = JSON.parse(localStorage.getItem(K_TARGET) || 'null') } catch { /* */ }
  if (!t || !t.v) return null
  const arrived = String(t.v).replace(/^v/i, '') === String(current)
  if (arrived || now - (t.at || 0) > 2 * 86400e3) { try { localStorage.removeItem(K_TARGET) } catch { /* */ } }
  return arrived ? current : null
}
