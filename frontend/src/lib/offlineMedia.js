// Exercise images + animations for offline use.
//
// Android app (offline build): every file ships inside the APK — nothing to do.
// Web / installed PWA: saved on demand into the service worker's media cache
// (public/sw.js → 'mahdi-jym-media-v1'), which survives app updates. The service worker then
// answers every img/ and gif/ request from it, so the library works without internet.
import { EXDB, imgSrc, gifSrc, OFFLINE_MEDIA } from './exercises.js'
import { MOBILE } from './mobile.js'

export const MEDIA_CACHE = 'mahdi-jym-media-v1'
export const MEDIA_FILES = EXDB.length * 2
/** Rough size of all exercise media (~138 MB: 1,324 JPGs + 1,324 GIFs). */
export const MEDIA_MB = 138

/** 'bundled' (inside the app) | 'cache' (can be saved in the browser) | 'none'. */
export function offlineMode() {
  if (MOBILE) return OFFLINE_MEDIA ? 'bundled' : 'none'
  // same condition as the service worker registration in main.jsx: without it nothing would
  // serve the saved files
  return typeof caches !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    && typeof location !== 'undefined' && location.protocol === 'https:' ? 'cache' : 'none'
}

const urls = () => {
  const out = []
  for (const ex of EXDB) {
    if (ex.img) out.push(new URL(imgSrc(ex), location.href).href)
    if (ex.gif) out.push(new URL(gifSrc(ex), location.href).href)
  }
  return out
}

/** How many media files are saved → { saved, total }. */
export async function mediaStatus() {
  const total = MEDIA_FILES
  if (offlineMode() === 'bundled') return { saved: total, total }
  if (offlineMode() !== 'cache') return { saved: 0, total }
  try {
    const c = await caches.open(MEDIA_CACHE)
    const keys = await c.keys()
    return { saved: Math.min(total, keys.length), total }
  } catch { return { saved: 0, total } }
}

/**
 * Download every missing file (6 at a time). onProgress(done, total) after each file.
 * Resolves { saved, failed }; stops early when `signal.aborted`.
 */
export async function saveAllMedia({ onProgress = () => {}, signal } = {}) {
  if (offlineMode() !== 'cache') return { saved: 0, failed: 0 }
  const c = await caches.open(MEDIA_CACHE)
  const have = new Set((await c.keys()).map(r => r.url))
  const all = urls()
  const todo = all.filter(u => !have.has(u))
  let done = all.length - todo.length, failed = 0, i = 0
  onProgress(done, all.length)
  const worker = async () => {
    while (i < todo.length && !(signal && signal.aborted)) {
      const u = todo[i++]
      try {
        const res = await fetch(u, { cache: 'no-store' })
        if (res.ok) await c.put(u, res)
        else failed++
      } catch { failed++ }
      done++
      onProgress(done, all.length)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  return { saved: done - failed, failed }
}

/** Free the space again. */
export async function clearMedia() {
  try { await caches.delete(MEDIA_CACHE) } catch { /* */ }
}
