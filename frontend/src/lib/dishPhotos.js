// 14.0 — "My cooking": your own dishes (saved from the Kitchen's dish editor or the meal builder —
// your foods with `items`, in S.customFoods) and the photo you took of each one.
//
// Like the weigh-in photos (photoStore.js) the pictures stay on the device: IndexedDB, keyed by
// profile + dish, downscaled to ≤1280 px JPEG. The dish only carries `ph: true`, so another
// device shows it without the picture (the dish's icon instead).
import { useEffect, useState } from 'react'
import { appDB } from './idb.js'
import { useStore } from '../store/useStore.js'

const STORE = 'dishPhotos'
const profile = () => { try { return useStore.getState().user?.id || 'local' } catch { return 'local' } }
const keyOf = id => profile() + ':' + id

async function tx(mode, fn) {
  const d = await appDB()
  return new Promise((resolve, reject) => {
    const tr = d.transaction(STORE, mode)
    const req = fn(tr.objectStore(STORE))
    tr.oncomplete = () => resolve(req && req.result)
    tr.onerror = () => reject(tr.error)
    tr.onabort = () => reject(tr.error)
  })
}
export const saveDishPhoto = (id, blob) => tx('readwrite', st => st.put(blob, keyOf(id))).then(() => { urls.delete(id) })
export const getDishPhoto = id => tx('readonly', st => st.get(keyOf(id))).catch(() => null)
export const deleteDishPhoto = id => tx('readwrite', st => st.delete(keyOf(id))).catch(() => {}).then(() => { urls.delete(id) })

const urls = new Map()   // dish id → Promise<object URL | null>
/** An object URL of a dish's photo (cached for the session), or null. */
export function dishPhotoUrl(id) {
  if (!urls.has(id)) {
    urls.set(id, getDishPhoto(id).then(b => (b && typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(b) : null)).catch(() => null))
  }
  return urls.get(id)
}
/** The photo of a dish (when it has one) as a URL for <img>, once it has loaded. */
export function useDishPhoto(id, has = true) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let live = true
    if (id && has) dishPhotoUrl(id).then(u => { if (live) setUrl(u) })
    else setUrl(null)
    return () => { live = false }
  }, [id, has])
  return url
}

/** Your own dishes as Kitchen items (kind 'M'): the foods you built from ingredients. */
export function myDishes(S) {
  return ((S && S.customFoods) || []).filter(f => Array.isArray(f.items) && f.items.length).map(f => ({
    uid: 'M:' + f.id, kind: 'M', id: f.id, name: f.n, mine: true, kcal: f.kcal, p: f.p, c: f.c, f: f.f,
    min: f.min != null ? f.min : null, sv: f.servings || 1, steps: f.steps || [], note: f.note || '', meal: f.meal || null,
    items: f.items, hasPhoto: !!f.ph, ph: null,
  }))
}
/** Your own foods without ingredients (a number of calories you typed) as items. */
export function myFoods(S) {
  return ((S && S.customFoods) || []).filter(f => !(Array.isArray(f.items) && f.items.length)).map(f => ({
    uid: 'C:' + f.id, kind: 'C', id: f.id, name: f.n, mine: true, kcal: f.kcal, p: f.p || 0, c: f.c || 0, f: f.f || 0, ph: null,
  }))
}
