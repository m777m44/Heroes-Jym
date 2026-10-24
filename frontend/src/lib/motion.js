// 7.0 — how the app feels under your finger.
//   installTouchFeedback(getS)  one delegated listener: a ripple from where you touched (buttons,
//                               rows, tiles) and — only if you switch it on (S.tapHaptics === true,
//                               11.0: off by default, it buzzed on every swipe and tap) — a light
//                               haptic tick on native builds. Reduce motion turns the ripple off.
//   burst(target, opts)         a small burst of coloured particles from an element or a point —
//                               for wins: a glass of water, a finished set, a new record.
// Nothing here throws: no DOM, no plugin, reduced motion → it quietly does nothing.
import { MOBILE } from './mobile.js'
import { motionReduced } from './a11y.js'

const TAPPABLE = '.btn, .iconbtn, .chip, .seg > button, .seg > *, .lrow.tap, .item[role=button], .kit-card, .kit-chip, .wall-tile, .look-opt, .theme-card, .theme-tab, .food-card-r, .startw, .wmode, [data-tap]'
const RIPPLE = '.btn, .lrow.tap, .item[role=button], .kit-card, .look-opt, .food-kitchen-link, .wmode, [data-ripple]'

let hap = null
let lastTick = 0
async function tick() {
  const now = Date.now()
  if (now - lastTick < 70) return
  lastTick = now
  if (MOBILE) {
    try {
      if (!hap) hap = await import('@capacitor/haptics')
      await hap.Haptics.impact({ style: hap.ImpactStyle.Light })
      return
    } catch { hap = null }
  }
  try { navigator.vibrate && navigator.vibrate(8) } catch { /* not supported */ }
}

export function ripple(el, x, y) {
  if (!el || motionReduced() || typeof document === 'undefined') return
  const r = el.getBoundingClientRect()
  if (!r.width || !r.height) return
  const size = Math.max(r.width, r.height) * 2
  const s = document.createElement('span')
  s.className = 'rpl'
  s.style.width = s.style.height = size + 'px'
  s.style.left = (x - r.left - size / 2) + 'px'
  s.style.top = (y - r.top - size / 2) + 'px'
  const pos = getComputedStyle(el).position
  if (pos === 'static') el.style.position = 'relative'
  el.classList.add('rpl-host')
  el.appendChild(s)
  setTimeout(() => s.remove(), 650)
}

let lastXY = null
/** Where the last touch landed (for bursts from the thing you just pressed). */
export const lastTap = () => lastXY

let installed = false
/** Call once at start-up. getS returns the current state (for the settings). */
export function installTouchFeedback(getS) {
  if (installed || typeof document === 'undefined') return () => {}
  installed = true
  const onDown = e => {
    if (e.button > 0) return
    lastXY = { x: e.clientX, y: e.clientY }
    const tgt = e.target && e.target.closest ? e.target.closest(TAPPABLE) : null
    if (!tgt || tgt.disabled || tgt.getAttribute('aria-disabled') === 'true') return
    const S = (getS && getS()) || {}
    if (S.tapHaptics === true) tick()
    const rp = e.target.closest(RIPPLE)
    if (rp && !rp.disabled) ripple(rp, e.clientX, e.clientY)
  }
  document.addEventListener('pointerdown', onDown, { passive: true })
  return () => { document.removeEventListener('pointerdown', onDown); installed = false }
}

const COLORS = ['var(--acc)', 'var(--yellow)', 'var(--pink)', 'var(--teal)', 'var(--orange)', 'var(--green)']
/** A burst of particles from an element (or {x, y}). */
export function burst(target, { count = 14, colors = COLORS, spread = 70 } = {}) {
  if (typeof document === 'undefined' || motionReduced()) return
  let x, y
  if (target && target.getBoundingClientRect) { const r = target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2 }
  else if (target && Number.isFinite(target.x)) { x = target.x; y = target.y }
  else { x = window.innerWidth / 2; y = window.innerHeight / 2 }
  const box = document.createElement('div')
  box.className = 'burst'
  box.style.left = x + 'px'
  box.style.top = y + 'px'
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i')
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const d = spread * (0.55 + Math.random() * 0.6)
    p.style.setProperty('--dx', Math.cos(a) * d + 'px')
    p.style.setProperty('--dy', Math.sin(a) * d - 18 + 'px')
    p.style.setProperty('--rot', Math.round(Math.random() * 360) + 'deg')
    p.style.background = colors[i % colors.length]
    if (i % 3 === 0) p.className = 'sq'
    box.appendChild(p)
  }
  document.body.appendChild(box)
  setTimeout(() => box.remove(), 900)
}
