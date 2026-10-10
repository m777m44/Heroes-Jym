import { useEffect, useRef, useState } from 'react'
import { dateLocale } from '../lib/i18n.js'

// A whole number that counts up (or down) to its new value instead of jumping — used for the
// step count, so each batch of steps visibly rolls in. Small changes (a step or two) snap
// straight there; prefers-reduced-motion skips the tween entirely.
const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function AnimatedNumber({ value, duration = 650, className, format }) {
  const v = Math.round(Number(value) || 0)
  const [shown, setShown] = useState(v)
  const from = useRef(v)
  const raf = useRef(0)
  useEffect(() => {
    const start = from.current
    if (start === v) return
    if (Math.abs(v - start) <= 2 || reduced() || typeof requestAnimationFrame === 'undefined') {
      from.current = v; setShown(v); return
    }
    const t0 = performance.now()
    cancelAnimationFrame(raf.current)
    const step = now => {
      const k = Math.min(1, (now - t0) / duration)
      const e = 1 - Math.pow(1 - k, 3)            // ease-out cubic
      const cur = Math.round(start + (v - start) * e)
      from.current = cur
      setShown(cur)
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [v, duration])
  return <span className={className}>{format ? format(shown) : shown.toLocaleString(dateLocale())}</span>
}
