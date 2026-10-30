// 13.0 — a theme switch takes 0.3 s instead of a hard cut. Where the browser has View
// Transitions (Android's WebView 111+, Chrome, Edge, Safari 18) it cross-fades a snapshot of
// the page — cheap, on the GPU. Elsewhere the colours of the main surfaces ease over, but only
// for the moment of the switch (html.theme-anim, index.css) — never a standing transition on
// every element, which would slow every scroll and tap. Reduced motion: an instant switch.
import { motionReduced } from './a11y.js'

let timer = null

/** Runs `apply` (the DOM change) with the switch animation. Returns how it was done. */
export function animateThemeSwitch(apply, { doc = typeof document !== 'undefined' ? document : null, reduce = motionReduced() } = {}) {
  if (!doc || reduce || (doc.visibilityState && doc.visibilityState !== 'visible')) { apply(); return 'instant' }
  if (typeof doc.startViewTransition === 'function') {
    try { doc.startViewTransition(apply); return 'view-transition' } catch { /* the class fallback below */ }
  }
  const de = doc.documentElement
  de.classList.add('theme-anim')
  apply()
  clearTimeout(timer)
  timer = setTimeout(() => de.classList.remove('theme-anim'), 360)
  return 'css'
}
