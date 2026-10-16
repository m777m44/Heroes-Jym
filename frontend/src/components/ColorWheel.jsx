// The Theme Studio's colour wheel (3.0): drag in the disc for the background colour (the angle
// is the hue, the distance from the centre the strength 1–10) and on the outer ring for the
// accent hue (snaps every 10°). Drawn on a <canvas>; keyboard users keep the sliders below it.
import { useEffect, useRef } from 'react'
import { t } from '../lib/i18n.js'

const TAU = Math.PI * 2
const rad = deg => (deg - 90) * Math.PI / 180            // hue 0° at the top, clockwise

export default function ColorWheel({ h, s, a, onChange, size = 250 }) {
  const ref = useRef(null)
  const zone = useRef(null)
  const R = size / 2, RING = 20, GAP = 9, D = R - RING - GAP

  useEffect(() => {
    const cv = ref.current
    if (!cv || !cv.getContext) return
    const dpr = Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)
    cv.width = size * dpr; cv.height = size * dpr
    const c = cv.getContext('2d')
    if (!c) return
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.clearRect(0, 0, size, size)
    const wheel = (r0, r1, sat, light) => {
      if (c.createConicGradient) {
        const g = c.createConicGradient(-Math.PI / 2, R, R)
        for (let d = 0; d <= 360; d += 30) g.addColorStop(d / 360, `hsl(${d} ${sat}% ${light}%)`)
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
    const knob = (x, y, fill, big) => {
      c.beginPath(); c.arc(x, y, big ? 11 : 9, 0, TAU)
      c.fillStyle = fill; c.fill()
      c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke()
      c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(x, y, (big ? 11 : 9) + 2, 0, TAU); c.stroke()
    }
    const sr = Math.max(0.08, s / 10) * D
    knob(R + Math.cos(rad(h)) * sr, R + Math.sin(rad(h)) * sr, `hsl(${h} ${s * 9}% 50%)`, true)
    const ar = R - RING / 2
    knob(R + Math.cos(rad(a)) * ar, R + Math.sin(rad(a)) * ar, `hsl(${a} 88% 56%)`, false)
  }, [h, s, a, size, R, D])

  const read = e => {
    const b = ref.current.getBoundingClientRect()
    const x = (e.clientX - b.left) * (size / b.width) - R, y = (e.clientY - b.top) * (size / b.height) - R
    return { deg: Math.round((Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360), dist: Math.hypot(x, y) }
  }
  const apply = (e, z) => {
    const p = read(e)
    if (z === 'ring') onChange({ a: Math.round(p.deg / 10) * 10 % 360 })
    else onChange({ h: p.deg % 360, s: Math.max(1, Math.min(10, Math.round(p.dist / D * 10))) })
  }
  const down = e => {
    const p = read(e)
    if (p.dist > R + 4) return
    zone.current = p.dist > D + GAP / 2 ? 'ring' : 'disc'
    e.currentTarget.setPointerCapture?.(e.pointerId)
    apply(e, zone.current)
  }
  const move = e => { if (zone.current) apply(e, zone.current) }
  const up = () => { zone.current = null }

  return <>
    <div className="cwheel">
      <canvas ref={ref} style={{ width: size, height: size }} role="img"
        aria-label={t('Colour wheel: background {0}°, strength {1}/10, accent {2}°', h, s, a)}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
    </div>
    <div className="cwheel-k">
      <span><i style={{ background: `hsl(${h} ${s * 9}% 50%)` }} />{t('Inside: background')}</span>
      <span><i style={{ background: `hsl(${a} 88% 56%)` }} />{t('Ring: accent')}</span>
    </div>
  </>
}
