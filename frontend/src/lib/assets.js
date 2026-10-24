// 12.0 — where the pictures that aren't code live: the wallpapers and the ready-made profile
// pictures (public/wallpapers/, public/avatars/).
//
// Every build ships them next to the app — except the online (light) Android app, which leaves
// the big ones out to stay small and takes them from this GitHub repository through the jsDelivr
// CDN instead, pinned to a commit so a URL's file can never change (VITE_ASSET_BASE, set by
// `npm run build:mobile`; scripts/slim-online.mjs removes the local copies). Wallpaper
// thumbnails stay inside the app, so the pickers still show something offline.
//
// cachedAsset() keeps a fetched file in Cache Storage (the WebView has no service worker), so the
// wallpaper you picked still shows the next time you open the app without internet.
const BASE = (import.meta.env && import.meta.env.VITE_ASSET_BASE) || ''
export const REMOTE_ASSETS = !!BASE
const local = () => (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/'
/** URL of a file from public/ that the online app keeps in the repository. */
export const assetUrl = path => (BASE || local()) + path
/** URL of a file that every build keeps inside the app (thumbnails, sounds…). */
export const localUrl = path => local() + path

export const ASSET_CACHE = 'mj-assets-v1'
const blobs = new Map()   // url → Promise<blob: URL | url>
/**
 * A URL to show `url` from: a blob: URL of a copy kept in Cache Storage (fetched once), or `url`
 * itself when that isn't possible — the browser then simply tries the network.
 */
export function cachedAsset(url) {
  if (!url) return Promise.resolve(url)
  if (blobs.has(url)) return blobs.get(url)
  const p = (async () => {
    if (typeof caches === 'undefined' || typeof fetch !== 'function' || typeof URL.createObjectURL !== 'function') return url
    try {
      const c = await caches.open(ASSET_CACHE)
      let res = await c.match(url)
      if (!res) {
        const r = await fetch(url, { mode: 'cors', credentials: 'omit' })
        if (!r.ok) return url
        await c.put(url, r.clone()).catch(() => {})
        res = r
      }
      return URL.createObjectURL(await res.blob())
    } catch { return url }
  })()
  blobs.set(url, p)
  p.then(v => { if (v === url) blobs.delete(url) })   // not kept: try again next time
  return p
}
