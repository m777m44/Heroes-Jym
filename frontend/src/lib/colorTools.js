// 4.0 — small colour helpers for the Theme Studio's toolbox: colour values in the three formats
// people copy (HEX / RGB / HSL), a plain-language name for a colour, and colour harmonies that
// turn the background hue into a matching accent hue.
import { normHex, hexToHsl } from './themes.js'

/** '#rrggbb' → [r, g, b] (0-255), else null. */
export function hexToRgb(hex) {
  const x = normHex(hex)
  if (!x) return null
  return [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16))
}
export const rgbText = hex => { const c = hexToRgb(hex); return c ? `rgb(${c.join(', ')})` : '' }
export const hslText = hex => { const c = hexToHsl(hex); return c ? `hsl(${c.h}, ${c.s}%, ${c.l}%)` : '' }

/** The colour's everyday name (a t() key): greys by lightness, the rest by hue. */
export function colourName(hex) {
  const c = hexToHsl(hex)
  if (!c) return ''
  if (c.s < 12) return c.l < 12 ? 'Black' : c.l > 90 ? 'White' : 'Grey'
  const h = c.h
  if (c.l < 30 && h >= 15 && h < 45) return 'Brown'
  if (h < 15 || h >= 345) return 'Red'
  if (h < 40) return 'Orange'
  if (h < 65) return 'Yellow'
  if (h < 160) return 'Green'
  if (h < 195) return 'Teal'
  if (h < 250) return 'Blue'
  if (h < 290) return 'Purple'
  return 'Pink'
}

/** Accent hue (multiple of 10, like the Studio's ring) that makes harmony `kind` with hue `h`. */
export const HARMONIES = [
  { id: 'complementary', name: 'Complementary', shift: 180 },
  { id: 'split', name: 'Split complementary', shift: 150 },
  { id: 'triadic', name: 'Triadic', shift: 120 },
  { id: 'analogous', name: 'Analogous', shift: 30 },
  { id: 'mono', name: 'Monochrome', shift: 0 },
]
export function harmonyAccent(h, kind) {
  const k = HARMONIES.find(x => x.id === kind)
  if (!k) return null
  return Math.round((((h + k.shift) % 360 + 360) % 360) / 10) * 10 % 360
}

/** Most-recent-first list of Studio numbers, without repeats, at most `max`. */
export function pushRecent(list, n, max = 12) {
  const num = Number(n)
  if (!Number.isInteger(num) || num < 1) return (list || []).slice(0, max)
  return [num, ...(list || []).filter(x => x !== num)].slice(0, max)
}
