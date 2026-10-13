// Themes (2.10): 20 colour families × 6 variants = 120 themes, all generated from a hue, a
// saturation and an accent so every one of them stays readable and consistent.
//
//   S.theme        the chosen theme id, '<family>-<variant>' (old saves: 'dark' / 'light')
//   S.themeSystem  follow the phone's light / dark setting (default on): the chosen family is
//                  kept and the variant switches to its light or dark counterpart
//   S.accent       'theme' (the theme's own accent, default) or one of ACCENTS (format.js)
//
// The tokens are written as inline custom properties on <html>, which beat the stylesheet;
// `data-theme` still says dark / light so the mode-specific rules in index.css keep working.
// Classic Dark / Classic Light are exactly the original stylesheet values (no overrides).
import { ACCENTS } from './format.js'

/** name: a t() key; h/s: hue and saturation of the surfaces; acc / accL: accent on dark / light. */
export const FAMILIES = [
  { id: 'classic', name: 'Classic', h: 240, s: 0, acc: '#30d158', accL: '#34c759' },
  { id: 'midnight', name: 'Midnight', h: 225, s: 60, acc: '#0a84ff', accL: '#007aff' },
  { id: 'ocean', name: 'Ocean', h: 195, s: 70, acc: '#40c8e0', accL: '#0a95b5' },
  { id: 'forest', name: 'Forest', h: 140, s: 35, acc: '#34c759', accL: '#248a3d' },
  { id: 'sunset', name: 'Sunset', h: 18, s: 70, acc: '#ff9f0a', accL: '#e07800' },
  { id: 'rose', name: 'Rose', h: 340, s: 55, acc: '#ff375f', accL: '#e0244d' },
  { id: 'royal', name: 'Royal', h: 268, s: 55, acc: '#bf5af2', accL: '#9a3fd0' },
  { id: 'desert', name: 'Desert', h: 35, s: 45, acc: '#e0b36a', accL: '#b07a2a' },
  { id: 'coffee', name: 'Coffee', h: 25, s: 30, acc: '#c8915a', accL: '#8d5a2b' },
  { id: 'neon', name: 'Neon', h: 285, s: 70, acc: '#39ff14', accL: '#1a9e0a' },
  { id: 'arctic', name: 'Arctic', h: 200, s: 40, acc: '#8fd8ff', accL: '#2a8fc8' },
  { id: 'lava', name: 'Lava', h: 8, s: 70, acc: '#ff453a', accL: '#d70015' },
  { id: 'mint', name: 'Mint', h: 168, s: 50, acc: '#63e6e2', accL: '#0c9c96' },
  { id: 'gold', name: 'Gold', h: 45, s: 60, acc: '#ffd60a', accL: '#b58900' },
  { id: 'lavender', name: 'Lavender', h: 255, s: 45, acc: '#a99bff', accL: '#6e5ce6' },
  { id: 'emerald', name: 'Emerald', h: 155, s: 60, acc: '#2ee59d', accL: '#0e9f6e' },
  { id: 'graphite', name: 'Graphite', h: 220, s: 8, acc: '#d1d5db', accL: '#4b5563' },
  { id: 'sakura', name: 'Sakura', h: 330, s: 60, acc: '#ff8fc8', accL: '#d6417f' },
  { id: 'cyber', name: 'Cyber', h: 190, s: 80, acc: '#00f0ff', accL: '#0098a8' },
  { id: 'olive', name: 'Olive', h: 75, s: 35, acc: '#b5c84a', accL: '#6f7f1a' },
]

/** Lightness of bg / elevated / surface / surface-2 / surface-3, and how much of the hue's saturation. */
export const VARIANTS = [
  { id: 'dark', name: 'Dark', mode: 'dark', sat: 0.25, l: [4, 6, 11, 16, 22] },
  { id: 'amoled', name: 'Pure black', mode: 'dark', sat: 0.2, l: [0, 3, 8, 13, 19] },
  { id: 'deep', name: 'Deep', mode: 'dark', sat: 0.55, l: [7, 9, 13, 19, 25], glow: 0.22 },
  { id: 'dusk', name: 'Dusk', mode: 'dark', sat: 0.35, l: [12, 14, 18, 24, 30], glow: 0.16 },
  { id: 'light', name: 'Light', mode: 'light', sat: 0.3, l: [95, 97, 100, 92, 89] },
  { id: 'soft', name: 'Pastel', mode: 'light', sat: 0.6, l: [91, 94, 97, 88, 84], glow: 0.18 },
]
// The light / dark counterpart used when following the phone.
const OTHER = { dark: 'light', amoled: 'light', deep: 'soft', dusk: 'soft', light: 'dark', soft: 'deep' }

export const THEMES = FAMILIES.flatMap(f => VARIANTS.map(v => ({ id: f.id + '-' + v.id, family: f, variant: v, mode: v.mode })))
export const THEME_IDX = Object.fromEntries(THEMES.map(x => [x.id, x]))
export const DEFAULT_THEME = 'classic-dark'

/** Saved value → a known theme id ('dark' / 'light' from before 2.10 included). */
export function themeIdOf(v) {
  if (v === 'light') return 'classic-light'
  if (v === 'dark' || !THEME_IDX[v]) return DEFAULT_THEME
  return v
}

/** The theme actually shown: the chosen one, or its counterpart when following the phone. */
export function resolveTheme(S, systemDark) {
  const id = themeIdOf(S && S.theme)
  const th = THEME_IDX[id]
  const follow = !S || S.themeSystem !== false
  if (!follow || systemDark == null) return th
  const want = systemDark ? 'dark' : 'light'
  if (th.mode === want) return th
  return THEME_IDX[th.family.id + '-' + OTHER[th.variant.id]] || th
}

// ---- colour maths -------------------------------------------------------------------------
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s * 10) / 10}% ${Math.round(l * 10) / 10}%)`
function rgbOf(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
/** Mix `hex` towards black (amount < 0) or white (amount > 0). */
export function shade(hex, amount) {
  const t = amount < 0 ? 0 : 255, p = Math.abs(amount)
  return toHex(rgbOf(hex).map(v => v + (t - v) * p))
}
/** WCAG relative luminance 0..1. */
export function luminance(hex) {
  const c = rgbOf(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
/** Black or white text on a filled accent — whichever reads better. */
export const onColor = hex => (contrast(hex, '#000000') >= contrast(hex, '#ffffff') ? '#000000' : '#ffffff')

/** The CSS custom properties of a theme (null = the stylesheet's own values). */
export function themeTokens(th) {
  const f = th.family, v = th.variant
  const acc = v.mode === 'light' ? f.accL : f.acc
  const accent = { '--acc': acc, '--acc-2': shade(acc, v.mode === 'light' ? -0.22 : -0.3), '--on-acc': onColor(acc) }
  if (f.id === 'classic' && (v.id === 'dark' || v.id === 'light')) return { surfaces: null, accent, glow: null, bg: v.id === 'light' ? '#f2f2f7' : '#000000' }
  const s = f.s * v.sat
  const [b, e, s1, s2, s3] = v.l
  const surfaces = {
    '--bg': hsl(f.h, s, b), '--bg-el': hsl(f.h, s, e),
    '--surface': hsl(f.h, s * (v.mode === 'light' ? 0.6 : 0.9), s1),
    '--surface-2': hsl(f.h, s, s2), '--surface-3': hsl(f.h, s, s3),
  }
  if (v.mode === 'dark') {
    // text keeps the system greys, tinted a touch towards the hue
    surfaces['--label-2'] = `hsl(${f.h} ${Math.min(30, f.s * 0.3)}% 92% / .62)`
    surfaces['--label-3'] = `hsl(${f.h} ${Math.min(30, f.s * 0.3)}% 92% / .34)`
  }
  const glow = v.glow ? `radial-gradient(120% 70% at 85% -10%, color-mix(in srgb, ${acc} ${Math.round(v.glow * 100)}%, transparent), transparent 60%)` : null
  return { surfaces, accent, glow, bg: hslHex(f.h, s, b) }
}
// meta theme-color wants a plain colour
function hslHex(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255])
}

const KEYS = ['--bg', '--bg-el', '--surface', '--surface-2', '--surface-3', '--label-2', '--label-3', '--acc', '--acc-2', '--on-acc', '--bg-glow']

/** Paint the document with the theme (and the accent: 'theme' or a named ACCENTS key). */
export function applyTheme(th, accent = 'theme', doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return
  const de = doc.documentElement
  const tk = themeTokens(th)
  for (const k of KEYS) de.style.removeProperty(k)
  de.dataset.theme = th.mode
  de.dataset.themeId = th.id
  if (tk.surfaces) for (const [k, v] of Object.entries(tk.surfaces)) de.style.setProperty(k, v)
  if (accent && accent !== 'theme' && ACCENTS[accent]) {
    de.dataset.accent = accent                         // the stylesheet's accent rules
  } else {
    de.dataset.accent = 'theme'
    for (const [k, v] of Object.entries(tk.accent)) de.style.setProperty(k, v)
  }
  if (tk.glow) de.style.setProperty('--bg-glow', tk.glow)
  const meta = doc.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = tk.bg
}

/** A small preview of a theme for its card: { bg, surface, surface2, acc, label }. */
export function themePreview(th) {
  const tk = themeTokens(th)
  const s = tk.surfaces
  const light = th.mode === 'light'
  return {
    bg: s ? s['--bg'] : light ? '#f2f2f7' : '#000000',
    surface: s ? s['--surface'] : light ? '#ffffff' : '#1c1c1e',
    surface2: s ? s['--surface-2'] : light ? '#ececef' : '#2c2c2e',
    acc: tk.accent['--acc'], onAcc: tk.accent['--on-acc'],
    label: light ? '#000000' : '#ffffff', glow: tk.glow,
  }
}
