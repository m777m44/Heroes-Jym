// The app's IndexedDB database ('mahdi-jym'): weigh-in photos (photoStore.js) and, in browsers,
// the backup versions (backups.js). 12.0: one opener for both — before, each opened version 1
// with only its own store, so whichever ran second in a browser found its store missing.
// Version 2 adds whatever store an older database lacks. 14.0: version 3 adds 'dishPhotos' — the
// photos of your own dishes in the Kitchen (lib/dishPhotos.js). The demo build uses its own database
// (dbName), apart from the web app's on the same origin.
import { dbName } from './demo.js'

export const STORES = ['snapshots', 'weightPhotos', 'dishPhotos']
let dbp = null
export function appDB() {
  if (dbp) return dbp
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return }
    const req = indexedDB.open(dbName('mahdi-jym'), 3)
    req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  dbp.catch(() => { dbp = null })
  return dbp
}
