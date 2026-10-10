// Weigh-in photos — a picture of the scale next to a logged weight, kept in IndexedDB.
//
// Privacy-first by design: photos never leave the device. They aren't part of the synced
// profile state, the server never sees them, and JSON backups don't include them. What does
// sync is a one-letter flag on the weigh-in (`p: true`), so every device can show that the
// entry was verified with a photo — the photo itself stays where it was taken.
//
// Photos are downscaled to ≤1280 px JPEG before storing: a modern phone photo is 3–8 MB,
// this keeps it to ~150–300 KB while a scale display stays perfectly readable.
//
// Keyed by profile + date, so two profiles signing in on one device never see each other's.

const DB = 'mahdi-jym'
const STORE = 'weightPhotos'
const MAX_SIDE = 1280

let dbp = null
function db() {
  if (dbp) return dbp
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return }
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  dbp.catch(() => { dbp = null })
  return dbp
}
async function tx(mode, fn) {
  const d = await db()
  return new Promise((resolve, reject) => {
    const tr = d.transaction(STORE, mode)
    const st = tr.objectStore(STORE)
    const req = fn(st)
    tr.oncomplete = () => resolve(req && req.result)
    tr.onerror = () => reject(tr.error)
    tr.onabort = () => reject(tr.error)
  })
}

export const photoKey = (profile, iso) => (profile || 'local') + ':' + iso

export const savePhoto = (profile, iso, blob) => tx('readwrite', st => st.put(blob, photoKey(profile, iso)))
export const getPhoto = (profile, iso) => tx('readonly', st => st.get(photoKey(profile, iso))).catch(() => null)
export const deletePhoto = (profile, iso) => tx('readwrite', st => st.delete(photoKey(profile, iso))).catch(() => {})

/** Dates (YYYY-MM-DD) that have a photo on this device for this profile. */
export async function photoDates(profile) {
  try {
    const keys = await tx('readonly', st => st.getAllKeys())
    const pre = (profile || 'local') + ':'
    return new Set((keys || []).filter(k => typeof k === 'string' && k.startsWith(pre)).map(k => k.slice(pre.length)))
  } catch { return new Set() }
}

/** Target size for a w×h image so its longer side is at most `max`. */
export function fitWithin(w, h, max = MAX_SIDE) {
  if (!(w > 0 && h > 0)) return { w: 0, h: 0 }
  const k = Math.min(1, max / Math.max(w, h))
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

/** Downscale a picked/captured image file to a JPEG Blob. Falls back to the original file. */
export async function shrinkImage(file) {
  try {
    const bmp = await createImageBitmap(file)
    const { w, h } = fitWithin(bmp.width, bmp.height)
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    c.getContext('2d').drawImage(bmp, 0, 0, w, h)
    bmp.close && bmp.close()
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82))
    return blob || file
  } catch { return file }
}
