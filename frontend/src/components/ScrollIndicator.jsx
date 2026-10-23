// 9.0 — a slim scroll indicator in the theme's accent that glides along the edge while you
// scroll and fades away when you stop (phones only: there it replaces the system's grey bar).
// One passive listener, frame-throttled, transform-only — nothing runs while the page is still.
import { useEffect, useRef } from 'react'

export default function ScrollIndicator() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    let raf = 0, idle = 0
    const paint = () => {
      raf = 0
      const de = document.documentElement
      const h = de.scrollHeight, vh = window.innerHeight
      if (h <= vh + 8) { el.classList.remove('on'); return }
      const track = vh - 120
      const thumb = Math.max(36, track * vh / h)
      const y = 60 + (track - thumb) * Math.min(1, window.scrollY / (h - vh))
      el.style.height = thumb + 'px'
      el.style.transform = `translateY(${y}px)`
      el.classList.add('on')
      clearTimeout(idle)
      idle = setTimeout(() => el.classList.remove('on'), 900)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); clearTimeout(idle) }
  }, [])
  return <i id="scrollind" ref={ref} aria-hidden="true" />
}
