// 4.0 — accessibility settings, applied to <html> (synced with your data):
//   S.textScale    0.9 / 1 / 1.15 / 1.3 — the whole interface, through CSS zoom (sizes are in px);
//                  --z lets the few viewport-height rules divide it back out
//   S.highContrast stronger secondary text, separators and outlines (html[data-contrast="more"])
//   S.reduceMotion no animations even if the phone doesn't ask (html[data-motion="reduce"]); the
//                  phone's own "remove animations" setting is always followed as well
export const TEXT_SIZES = [
  { value: 0.9, label: 'Small' },
  { value: 1, label: 'Normal' },
  { value: 1.15, label: 'Large' },
  { value: 1.3, label: 'Largest' },
]
export const textScaleOf = S => (TEXT_SIZES.some(x => x.value === Number(S && S.textScale)) ? Number(S.textScale) : 1)

export function applyA11y(S, de = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!de) return
  const z = textScaleOf(S)
  if (de.style) {
    if (z === 1) { de.style.zoom = ''; de.style.removeProperty?.('--z') }
    else { de.style.zoom = String(z); de.style.setProperty?.('--z', String(z)) }
  }
  if (de.dataset) {
    if (S && S.highContrast) de.dataset.contrast = 'more'; else delete de.dataset.contrast
    if (S && S.reduceMotion) de.dataset.motion = 'reduce'; else delete de.dataset.motion
  }
}

/** Reduced motion: the phone asks for it, or the setting is on. */
export function motionReduced() {
  if (typeof document !== 'undefined' && document.documentElement && document.documentElement.dataset && document.documentElement.dataset.motion === 'reduce') return true
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}
