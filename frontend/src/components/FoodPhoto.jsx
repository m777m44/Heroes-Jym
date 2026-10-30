// 14.0 — a real food photo (lib/photos). A soft shimmer while it loads, then it fades in; the
// big ones drift slowly — a Ken Burns move on transform only, so it stays smooth on any phone —
// and only while they are on screen (an IntersectionObserver pauses the ones scrolled away).
// No photo, or it can't load (offline in the light app) → `fallback`, the old icon bubble.
//
//   <Photo k="dolma" size="m" live alt="Dolma" />     the big moving picture of a sheet or card
//   <Photo k="dolma" fallback={<Icon … />} />          a list thumbnail
//   usePhotos()   the photo list, loaded on first use — for screens in the main bundle (the food
//                 log's bubbles), so the list doesn't weigh on the app's start
import { memo, useEffect, useReducer, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { photoUrl, driftOf } from '../lib/photos/url.js'

const loaded = new Set()   // URLs already shown once: no shimmer or fade the next time
let io = null
const watch = new WeakMap()
function observe(el, fn) {
  if (typeof IntersectionObserver === 'undefined') { fn(true); return () => {} }
  if (!io) io = new IntersectionObserver(es => { for (const e of es) { const f = watch.get(e.target); if (f) f(e.isIntersecting) } }, { rootMargin: '60px' })
  watch.set(el, fn)
  io.observe(el)
  return () => { io.unobserve(el); watch.delete(el) }
}

export const Photo = memo(function Photo({ k, size = 't', alt = '', live = false, className = '', fallback = null, children }) {
  const motion = useStore(s => s.S.photoMotion !== false)
  const url = k ? photoUrl(k, size) : null
  const [st, setSt] = useState(() => (url && loaded.has(url) ? 'ok' : 'load'))
  const [vis, setVis] = useState(false)
  const ref = useRef(null)
  const moving = live && motion
  useEffect(() => { setSt(url && loaded.has(url) ? 'ok' : 'load') }, [url])
  useEffect(() => (moving && ref.current ? observe(ref.current, setVis) : undefined), [moving, st === 'err'])
  if (!url || st === 'err') return fallback
  const cls = 'ph ph-' + (size === 'm' ? 'm' : 't') + (st === 'ok' ? ' in' : '') + (moving ? ' live d' + driftOf(k) + (vis ? ' vis' : '') : '') + (className ? ' ' + className : '')
  return <span ref={ref} className={cls}>
    <img src={url} alt={alt} loading={size === 'm' ? 'eager' : 'lazy'} decoding="async" draggable="false"
      onLoad={() => { loaded.add(url); setSt('ok') }} onError={() => setSt('err')} />
    {children}
  </span>
})

let mod = null, pending = null
const subs = new Set()
/** The photo module (lib/photos), or null until it has loaded — then the component draws again. */
export function usePhotos() {
  const [, redraw] = useReducer(x => x + 1, 0)
  useEffect(() => {
    if (mod) return undefined
    subs.add(redraw)
    if (!pending) pending = import('../lib/photos/index.js').then(m => { mod = m; for (const f of subs) f() })
    return () => { subs.delete(redraw) }
  }, [])
  return mod
}
