import { useEffect, useState, useSyncExternalStore } from 'react'
import { getPhoto } from '../../lib/photoStore.js'
import { useStore } from '../../store/useStore.js'

// Bumped whenever a photo is saved or deleted, so every thumbnail re-reads IndexedDB.
let version = 0
const subs = new Set()
export const photosChanged = () => { version++; subs.forEach(f => f()) }
export const usePhotoVersion = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => version, () => 0)

/** The profile photos are filed under on this device (signed-in id, or "local"). */
export const usePhotoProfile = () => useStore(s => s.user?.id || 'local')
export const photoProfile = () => useStore.getState().user?.id || 'local'

/** Object URL of the photo for a weigh-in, or null. Revoked on change/unmount. */
export function usePhotoUrl(iso, enabled = true) {
  const profile = usePhotoProfile()
  const v = usePhotoVersion()
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!enabled || !iso) { setUrl(null); return }
    let live = true, u = null
    getPhoto(profile, iso).then(b => { if (live && b) { u = URL.createObjectURL(b); setUrl(u) } else if (live) setUrl(null) })
    return () => { live = false; if (u) URL.revokeObjectURL(u) }
  }, [profile, iso, v, enabled])
  return url
}
