// The Theme Studio's colour wheel: drag in the disc for the background colour (the angle is the
// hue, the distance from the centre the strength 1–10) and on the outer ring for the accent hue
// (snaps every 10°).
//
// 4.0 — smooth on mid-range phones:
//   - the wheel itself (ring + disc + grey centre) is painted ONCE per size × pixel ratio into a
//     cached canvas; a frame is then one drawImage plus the two knobs
//   - pointer moves only update a ref and ask for a frame (requestAnimationFrame), so a burst of
//     touch events costs one paint, and the parent hears at most one change per frame
//   - the live read-out under the wheel follows every frame; the rest of the Studio catches up
//   - keyboard: ← → background colour, ↑ ↓ strength, PageUp / PageDown (or [ ]) the accent
import { useEffect, useRef, useState } from 'react'
import { t } from '../lib/i18n.js'

const TAU = Math.PI * 2
const rad = deg => (deg - 90) * Math.PI / 180            // hue 0° at the top, clockwise
const RING = 20, GAP = 9
const geo = size => { const R = size / 2; return { R, D: R - RING - GAP } }

// ---- the static wheel, painted once per size × dpr ------------------------------------------
const cache = new Map()
function wheelLayer(size, dpr) {
  const key = size + 'x' + dpr
  if (cache.has(key)) return cache.get(key)
  if (typeof document === 'undefined') return null
  const cv = document.createElement('canvas')
  cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr)
  const c = cv.getContext && cv.getContext('2d')
  if (!c) return null
  const { R, D } = geo(size)
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  const wheel = (r0, r1, sat, light) => {
    if (c.createConicGradient) {
      const g = c.createConicGradient(-Math.PI / 2, R, R)
      for (let d = 0; d <= 360; d += 15) g.addColorStop(d / 360, `hsl(${d} ${sat}% ${light}%)`)
      c.fillStyle = g
      c.beginPath(); c.arc(R, R, r1, 0, TAU); if (r0) c.arc(R, R, r0, 0, TAU, true); c.fill('evenodd')
    } else {
      for (let d = 0; d < 360; d += 2) {
        c.fillStyle = `hsl(${d} ${sat}% ${light}%)`
        c.beginPath(); c.arc(R, R, r1, rad(d), rad(d + 2.5)); c.arc(R, R, r0, rad(d + 2.5), rad(d), true); c.fill()
      }
    }
  }
  wheel(R - RING, R, 88, 56)                               // accent ring
  wheel(0, D, 70, 50)                                      // background disc
  const fade = c.createRadialGradient(R, R, 0, R, R, D)    // the centre is grey (strength 1)
  fade.addColorStop(0, 'hsl(0 0% 50%)'); fade.addColorStop(1, 'hsl(0 0% 50% / 0)')
  c.fillStyle = fade; c.beginPath(); c.arc(R, R, D, 0, TAU); c.fill()
  if (cache.size > 6) cache.delete(cache.keys().next().value)
  cache.set(key, cv)
  return cv
}

const clampS = v => Math.max(1, Math.min(10, v))
const wrap = (v, m) => ((v % m) + m) % m

export default function ColorWheel({ h, s, a, onChange, size: want = 260 }) {
  const ref = useRef(null)
  const box = useRef(null)
  const zone = useRef(null)
  const cur = useRef({ h, s, a })
  const frame = useRef(0)
  const pending = useRef(null)
  const [size, setSize] = useState(want)
  const [live, setLive] = useState({ h, s, a })
  const { R, D } = geo(size)

  // fit the card: the wheel shrinks on narrow phones and never blurs (re-painted per size)
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => { const w = Math.floor(el.clientWidth); if (w > 0) setSize(Math.max(180, Math.min(want, w))) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [want])

  const paint = () => {
    frame.current = 0
    const cv = ref.current
    if (!cv || !cv.getContext) return
    const dpr = Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)
    const W = Math.round(size * dpr)
    if (cv.width !== W) { cv.width = W; cv.height = W }
    const c = cv.getContext('2d')
    if (!c) return
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, W, W)
    const layer = wheelLayer(size, dpr)
    if (layer) c.drawImage(layer, 0, 0)
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    const p = cur.current
    const knob = (x, y, fill, r) => {
      c.beginPath(); c.arc(x, y, r, 0, TAU)
      c.fillStyle = fill; c.fill()
      c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke()
      c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(x, y, r + 2, 0, TAU); c.stroke()
    }
    const sr = Math.max(0.08, p.s / 10) * D
    knob(R + Math.cos(rad(p.h)) * sr, R + Math.sin(rad(p.h)) * sr, `hsl(${p.h} ${p.s * 9}% 50%)`, zone.current === 'disc' ? 13 : 11)
    const ar = R - RING / 2
    knob(R + Math.cos(rad(p.a)) * ar, R + Math.sin(rad(p.a)) * ar, `hsl(${p.a} 88% 56%)`, zone.current === 'ring' ? 11 : 9)
  }
  const request = () => {
    if (frame.current || typeof requestAnimationFrame === 'undefined') { if (!frame.current) paint(); return }
    frame.current = requestAnimationFrame(() => {
      paint()
      setLive({ ...cur.current })
      if (pending.current) { const patch = pending.current; pending.current = null; onChange(patch) }
    })
  }

  // props → picture (when not dragging; a drag owns the knobs until it ends)
  useEffect(() => {
    if (!zone.current) { cur.current = { h, s, a }; setLive({ h, s, a }) }
    paint()
  }, [h, s, a, size]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (frame.current && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame.current) }, [])

  const push = patch => {
    cur.current = { ...cur.current, ...patch }
    pending.current = { ...(pending.current || {}), ...patch }
    request()
  }
  const read = e => {
    const b = ref.current.getBoundingClientRect()
    const x = (e.clientX - b.left) * (size / b.width) - R, y = (e.clientY - b.top) * (size / b.height) - R
    return { deg: Math.round((Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360), dist: Math.hypot(x, y) }
  }
  const apply = (e, z) => {
    const p = read(e)
    if (z === 'ring') { const na = Math.round(p.deg / 10) * 10 % 360; if (na !== cur.current.a) push({ a: na }) }
    else {
      const nh = p.deg % 360, ns = clampS(Math.round(p.dist / D * 10))
      if (nh !== cur.current.h || ns !== cur.current.s) push({ h: nh, s: ns })
    }
  }
  const down = e => {
    const p = read(e)
    if (p.dist > R + 4) return
    zone.current = p.dist > D + GAP / 2 ? 'ring' : 'disc'
    e.currentTarget.setPointerCapture?.(e.pointerId)
    e.preventDefault()
    apply(e, zone.current)
    request()
  }
  const move = e => {
    if (!zone.current) return
    // coalesced events (high-rate touch screens): the last one is where the finger is
    const list = e.nativeEvent && e.nativeEvent.getCoalescedEvents ? e.nativeEvent.getCoalescedEvents() : null
    apply(list && list.length ? list[list.length - 1] : e, zone.current)
  }
  const up = () => {
    if (!zone.current) return
    zone.current = null
    if (pending.current) { const patch = pending.current; pending.current = null; onChange(patch) }
    request()
  }
  const key = e => {
    const big = e.shiftKey ? 10 : 2
    const p = cur.current
    const k = e.key
    let patch = null
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      const dir = (k === 'ArrowRight') !== (typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ? 1 : -1
      patch = { h: wrap(p.h + dir * big, 360) }
    } else if (k === 'ArrowUp') patch = { s: clampS(p.s + 1) }
    else if (k === 'ArrowDown') patch = { s: clampS(p.s - 1) }
    else if (k === 'PageUp' || k === ']') patch = { a: wrap(p.a + 10, 360) }
    else if (k === 'PageDown' || k === '[') patch = { a: wrap(p.a - 10, 360) }
    if (!patch) return
    e.preventDefault()
    cur.current = { ...p, ...patch }
    onChange(patch)
    request()
  }

  return <>
    <div className="cwheel" ref={box}>
      <canvas ref={ref} style={{ width: size, height: size, touchAction: 'none' }} tabIndex={0} role="slider"
        aria-label={t('Colour wheel')} title={t('Keys: ← → colour, ↑ ↓ strength, [ ] accent')} aria-valuemin={0} aria-valuemax={359} aria-valuenow={live.h}
        aria-valuetext={t('Colour wheel: background {0}°, strength {1}/10, accent {2}°', live.h, live.s, live.a)}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onKeyDown={key} />
    </div>
    <div className="cwheel-k">
      <span><i style={{ background: `hsl(${live.h} ${live.s * 9}% 50%)` }} />{t('Inside: background')} · <b>{live.h}° · {live.s}/10</b></span>
      <span><i style={{ background: `hsl(${live.a} 88% 56%)` }} />{t('Ring: accent')} · <b>{live.a}°</b></span>
    </div>
  </>
}
