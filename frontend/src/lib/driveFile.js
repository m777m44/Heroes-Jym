// 8.0 — "Google Drive, no setup": the native side (DriveFilePlugin.java) in promise form.
//
// One file, picked once in Android's own file picker — Google Drive, or any other place — that
// the app keeps the right to rewrite. Google Drive's app uploads every new version itself, so
// nothing has to be registered anywhere: no Google Cloud project, no SHA-1, no consent screen.
// lib/cloud.js decides WHEN to write; this file only talks to the plugin.
//
// Every call rejects with { reason } — 'cancelled' | 'unavailable' | 'notlinked' | 'revoked' |
// 'missing' | 'io' | 'timeout' — never with a bare plugin error.
import { MOBILE } from './mobile.js'

export const FILE_NAME = 'MAHDI-JYM-backup.json'

// Capacitor plugin proxies answer every property — `then` included — so the proxy is kept
// inside { p } and never becomes the value of a promise (see the same note in cloud.js).
let pluginP = null
function holder() {
  if (!MOBILE) return null
  if (!pluginP) {
    pluginP = (async () => {
      try {
        const { Capacitor, registerPlugin } = await import('@capacitor/core')
        if (Capacitor.getPlatform() !== 'android' || !Capacitor.isPluginAvailable('DriveFile')) return null
        return { p: registerPlugin('DriveFile') }
      } catch { return null }
    })()
  }
  return pluginP
}

const CODES = { CANCELLED: 'cancelled', NOT_LINKED: 'notlinked', REVOKED: 'revoked', MISSING: 'missing', IO: 'io', UNAVAILABLE: 'unavailable' }
/** A plugin error → a short reason. */
export const fileReason = e => (e && e.reason) || CODES[String((e && e.code) || '')] || 'io'

function fail(e) { return Object.assign(new Error((e && e.message) || 'drive file'), { reason: fileReason(e) }) }

function withTimeout(promise, ms) {
  let tm
  return Promise.race([
    promise,
    new Promise((_, rej) => { tm = setTimeout(() => rej(Object.assign(new Error('timeout'), { reason: 'timeout' })), ms) }),
  ]).finally(() => clearTimeout(tm))
}

async function call(method, args, ms) {
  const h = await holder()
  if (!h) throw Object.assign(new Error('unavailable'), { reason: 'unavailable' })
  try { return await (ms ? withTimeout(h.p[method](args || {}), ms) : h.p[method](args || {})) } catch (e) { throw fail(e) }
}

/** Is the file feature there (the Android app, 8.0 or newer)? */
export async function driveFileAvailable() {
  const h = await holder()
  if (!h) return false
  try { const r = await withTimeout(h.p.isAvailable(), 5000); return !!(r && r.available) } catch { return false }
}

/** Is the Google Drive app installed? null = can't tell. */
export async function driveAppInstalled() {
  try { const r = await call('driveApp', {}, 5000); return !!(r && r.installed) } catch { return null }
}

/** Opens the picker. 'create' makes a new file, 'open' links one that is already there. */
export const pickFile = (mode = 'create', name = FILE_NAME) => call('pick', { mode, name })   // no timeout: the user is choosing
export const fileInfo = () => call('info', {}, 15000)
export const writeFile = data => call('write', { data }, 60000)
export const readFile = () => call('read', {}, 60000)
export const unlinkFile = () => call('unlink', {}, 8000)

/** The Google Drive app on the Play Store (when it is missing). */
export const DRIVE_PLAY = 'https://play.google.com/store/apps/details?id=com.google.android.apps.docs'

/**
 * What a picked file holds: { S, savedAt } for MAHDI-JYM data — the live file, a dated version,
 * the Android Backup copy or a plain Export from Settings — { empty: true } for a new / blank
 * file, and { bad: true } for anything else (a file that must never be overwritten by mistake).
 */
export function parseDataFile(text) {
  const s = String(text == null ? '' : text).trim()
  if (!s) return { empty: true }
  let j
  try { j = JSON.parse(s) } catch { return { bad: true } }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return { bad: true }
  if (j.S && typeof j.S === 'object' && !Array.isArray(j.S)) return { S: j.S, savedAt: Date.parse(j.savedAt) || 0 }
  // Settings → Export writes the state itself
  if (Array.isArray(j.workouts) && Array.isArray(j.routines)) return { S: j, savedAt: Number(j._ts) || 0 }
  return { bad: true }
}
