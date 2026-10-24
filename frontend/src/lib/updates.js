// 12.0 — which MAHDI-JYM this is, where the other versions are, and whether a newer one is out.
//
//   offline  Android, everything inside (MAHDI-JYM.apk)
//   online   Android, light — media from GitHub (MAHDI-JYM-online.apk)
//   web      the web app on GitHub Pages (VITE_WEBAPP)
//   demo     the demo on GitHub Pages (VITE_DEMO)
//   server   a self-hosted instance
// The newest release comes from the public GitHub API (no account; 60 requests an hour per
// address — the app asks at most once a day by itself, and when you tap "Check for updates").
import { MOBILE } from './mobile.js'
import { OFFLINE_MEDIA } from './exercises.js'
import { DEMO, WEBAPP, REPO } from './demo.js'

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'
export const RELEASES = REPO + '/releases'
export const LATEST = RELEASES + '/latest'
export const APK_OFFLINE = 'MAHDI-JYM.apk'
export const APK_ONLINE = 'MAHDI-JYM-online.apk'
/** Always the newest release's file. */
export const apkUrl = name => LATEST + '/download/' + name
export const SITE = 'https://m777m44.github.io/Heroes-Jym/'
export const WEB_APP = SITE + 'app/'
export const VARIANT = MOBILE ? (OFFLINE_MEDIA ? 'offline' : 'online') : WEBAPP ? 'web' : DEMO ? 'demo' : 'server'

/** Compare two versions ('12.0.0', 'v12.1'): -1, 0 or 1. */
export function cmpVersion(a, b) {
  const pa = String(a || '').trim().replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  const pb = String(b || '').trim().replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1 }
  return 0
}

const API = 'https://api.github.com/repos/m777m44/Heroes-Jym/releases/latest'
const KEY = 'mj_update'
const DAY = 20 * 3600e3

/** A GitHub "latest release" response → what the app shows. */
export function parseRelease(d, current = APP_VERSION, now = Date.now()) {
  const version = String((d && d.tag_name) || '').trim().replace(/^v/i, '')
  const asset = n => { const a = ((d && d.assets) || []).find(x => x && x.name === n); return a ? { url: a.browser_download_url, size: a.size || 0 } : null }
  return {
    version, url: (d && d.html_url) || LATEST, at: (d && d.published_at) || null,
    offline: asset(APK_OFFLINE), online: asset(APK_ONLINE),
    newer: !!version && cmpVersion(version, current) > 0, checked: now,
  }
}

/** Ask GitHub for the newest release (throws when offline / rate-limited). */
export async function checkLatest({ fetchImpl = typeof fetch === 'function' ? fetch : null, now = Date.now(), current = APP_VERSION } = {}) {
  if (!fetchImpl) throw new Error('offline')
  const r = await fetchImpl(API, { headers: { Accept: 'application/vnd.github+json' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const out = parseRelease(await r.json(), current, now)
  try { localStorage.setItem(KEY, JSON.stringify(out)) } catch { /* private mode */ }
  return out
}
export function lastCheck() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? v : null } catch { return null }
}
/**
 * At most once a day, quietly: the newer release, or null (up to date, offline, already asked
 * today). An answer from earlier today is reused.
 */
export async function autoCheck({ fetchImpl, now = Date.now(), current = APP_VERSION } = {}) {
  const last = lastCheck()
  if (last && now - (last.checked || 0) < DAY) return last.version && cmpVersion(last.version, current) > 0 ? last : null
  try { const r = await checkLatest({ fetchImpl, now, current }); return r.newer ? r : null } catch { return null }
}

/** Open a link outside the app (the system browser on Android — downloads land there too). */
export function openLink(url) {
  try { window.open(url, '_blank', 'noopener') } catch { /* no browser */ }
}
export const mb = bytes => (bytes ? (bytes / 1048576).toFixed(bytes >= 104857600 ? 0 : 1) : '')
