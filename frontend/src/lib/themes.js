// Themes: 94 colour families in 12 categories × 7 variants = 658 curated themes (2.12; 2.10 had
// 120), plus the Theme Studio's 2,721,600 numbered ones — all generated from a hue, a
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

/** The theme categories (2.12) — the tabs of the Themes screen. `mode` forces a light / dark filter. */
export const CATEGORIES = [
  { id: 'golden', name: 'Golden', icon: 'trophy' },
  { id: 'royal', name: 'Royal', icon: 'crown' },
  { id: 'premium', name: 'Premium', icon: 'medal' },
  { id: 'dark', name: 'Dark', icon: 'moon', mode: 'dark' },
  { id: 'light', name: 'Light', icon: 'sun', mode: 'light' },
  { id: 'nature', name: 'Nature', icon: 'leafy' },
  { id: 'ocean', name: 'Ocean & sky', icon: 'drop' },
  { id: 'neon', name: 'Neon', icon: 'bolt' },
  { id: 'warm', name: 'Warm', icon: 'flame' },
  { id: 'pastel', name: 'Pastel', icon: 'heart' },
  { id: 'classic', name: 'Classic', icon: 'circle' },
  { id: 'sport', name: 'Sport', icon: 'dumbbell' },
]

/**
 * name: a t() key; cat: its category; h/s: hue and saturation of the surfaces;
 * acc / accL: the accent on dark / on light. The first 20 are the 2.10 families (ids kept, so
 * saved themes stay valid); 2.12 added 74 more.
 */
export const FAMILIES = [
  { id: 'classic', name: 'Classic', cat: 'classic', h: 240, s: 0, acc: '#30d158', accL: '#34c759' },
  { id: 'midnight', name: 'Midnight', cat: 'dark', h: 225, s: 60, acc: '#0a84ff', accL: '#007aff' },
  { id: 'ocean', name: 'Ocean', cat: 'ocean', h: 195, s: 70, acc: '#40c8e0', accL: '#0a95b5' },
  { id: 'forest', name: 'Forest', cat: 'nature', h: 140, s: 35, acc: '#34c759', accL: '#248a3d' },
  { id: 'sunset', name: 'Sunset', cat: 'warm', h: 18, s: 70, acc: '#ff9f0a', accL: '#e07800' },
  { id: 'rose', name: 'Rose', cat: 'pastel', h: 340, s: 55, acc: '#ff375f', accL: '#e0244d' },
  { id: 'royal', name: 'Royal', cat: 'royal', h: 268, s: 55, acc: '#bf5af2', accL: '#9a3fd0' },
  { id: 'desert', name: 'Desert', cat: 'warm', h: 35, s: 45, acc: '#e0b36a', accL: '#b07a2a' },
  { id: 'coffee', name: 'Coffee', cat: 'warm', h: 25, s: 30, acc: '#c8915a', accL: '#8d5a2b' },
  { id: 'neon', name: 'Neon', cat: 'neon', h: 285, s: 70, acc: '#39ff14', accL: '#1a9e0a' },
  { id: 'arctic', name: 'Arctic', cat: 'ocean', h: 200, s: 40, acc: '#8fd8ff', accL: '#2a8fc8' },
  { id: 'lava', name: 'Lava', cat: 'warm', h: 8, s: 70, acc: '#ff453a', accL: '#d70015' },
  { id: 'mint', name: 'Mint', cat: 'pastel', h: 168, s: 50, acc: '#63e6e2', accL: '#0c9c96' },
  { id: 'gold', name: 'Gold', cat: 'golden', h: 45, s: 60, acc: '#ffd60a', accL: '#b58900' },
  { id: 'lavender', name: 'Lavender', cat: 'pastel', h: 255, s: 45, acc: '#a99bff', accL: '#6e5ce6' },
  { id: 'emerald', name: 'Emerald', cat: 'nature', h: 155, s: 60, acc: '#2ee59d', accL: '#0e9f6e' },
  { id: 'graphite', name: 'Graphite', cat: 'classic', h: 220, s: 8, acc: '#d1d5db', accL: '#4b5563' },
  { id: 'sakura', name: 'Sakura', cat: 'pastel', h: 330, s: 60, acc: '#ff8fc8', accL: '#d6417f' },
  { id: 'cyber', name: 'Cyber', cat: 'neon', h: 190, s: 80, acc: '#00f0ff', accL: '#0098a8' },
  { id: 'olive', name: 'Olive', cat: 'nature', h: 75, s: 35, acc: '#b5c84a', accL: '#6f7f1a' },
  // ---- 2.12 ----
  // golden
  { id: 'champagne', name: 'Champagne', cat: 'golden', h: 42, s: 35, acc: '#f1d592', accL: '#9a7424' },
  { id: 'bronze', name: 'Bronze', cat: 'golden', h: 28, s: 45, acc: '#d9924a', accL: '#94551a' },
  { id: 'amber', name: 'Amber', cat: 'golden', h: 38, s: 75, acc: '#ffbf00', accL: '#a87400' },
  { id: 'honey', name: 'Honey', cat: 'golden', h: 40, s: 65, acc: '#f5b841', accL: '#a26e0a' },
  { id: 'rosegold', name: 'Rose gold', cat: 'golden', h: 12, s: 40, acc: '#eaa89a', accL: '#a8574b' },
  { id: 'copper', name: 'Copper', cat: 'golden', h: 20, s: 55, acc: '#e8854a', accL: '#a04c18' },
  { id: 'saffron', name: 'Saffron', cat: 'golden', h: 33, s: 80, acc: '#ff9f40', accL: '#b05d00' },
  { id: 'blackgold', name: 'Black gold', cat: 'golden', h: 45, s: 6, acc: '#d4af37', accL: '#8f6f0c' },
  // royal
  { id: 'imperial', name: 'Imperial', cat: 'royal', h: 275, s: 65, acc: '#b86bff', accL: '#7b2cbf' },
  { id: 'velvet', name: 'Velvet', cat: 'royal', h: 330, s: 50, acc: '#ff5c95', accL: '#a8124a' },
  { id: 'sapphire', name: 'Sapphire', cat: 'royal', h: 220, s: 70, acc: '#4d94ff', accL: '#1d5fd1' },
  { id: 'ruby', name: 'Ruby', cat: 'royal', h: 350, s: 65, acc: '#ff3d6e', accL: '#c2103f' },
  { id: 'amethyst', name: 'Amethyst', cat: 'royal', h: 280, s: 45, acc: '#c98bff', accL: '#8135c2' },
  { id: 'burgundy', name: 'Burgundy', cat: 'royal', h: 345, s: 45, acc: '#e8658a', accL: '#8e1b3a' },
  { id: 'majesty', name: 'Majesty', cat: 'royal', h: 255, s: 55, acc: '#ffd166', accL: '#8a6400' },
  // premium
  { id: 'diamond', name: 'Diamond', cat: 'premium', h: 195, s: 15, acc: '#b9f2ff', accL: '#1f7f9e' },
  { id: 'platinum', name: 'Platinum', cat: 'premium', h: 220, s: 5, acc: '#e5e4e2', accL: '#4f5866' },
  { id: 'obsidian', name: 'Obsidian', cat: 'premium', h: 260, s: 12, acc: '#a497ff', accL: '#5a48d6' },
  { id: 'onyx', name: 'Onyx', cat: 'premium', h: 0, s: 0, acc: '#f5f5f7', accL: '#1c1c1e' },
  { id: 'pearl', name: 'Pearl', cat: 'premium', h: 30, s: 12, acc: '#f0e6d8', accL: '#7a6550' },
  { id: 'titanium', name: 'Titanium', cat: 'premium', h: 210, s: 10, acc: '#9fb3c8', accL: '#4a5f73' },
  { id: 'carbon', name: 'Carbon', cat: 'premium', h: 0, s: 0, acc: '#ff453a', accL: '#d70015' },
  { id: 'marble', name: 'Marble', cat: 'premium', h: 40, s: 6, acc: '#d4bf98', accL: '#75613e' },
  { id: 'silver', name: 'Silver', cat: 'premium', h: 210, s: 4, acc: '#c7cdd6', accL: '#555f6c' },
  // dark
  { id: 'eclipse', name: 'Eclipse', cat: 'dark', h: 245, s: 30, acc: '#8d93ff', accL: '#4b52d6' },
  { id: 'shadow', name: 'Shadow', cat: 'dark', h: 230, s: 10, acc: '#64d2ff', accL: '#0a7ea4' },
  { id: 'abyss', name: 'Abyss', cat: 'dark', h: 205, s: 55, acc: '#1fc3e8', accL: '#0072ad' },
  { id: 'galaxy', name: 'Galaxy', cat: 'dark', h: 265, s: 50, acc: '#e0aaff', accL: '#8a3ffc' },
  { id: 'ink', name: 'Ink', cat: 'dark', h: 220, s: 25, acc: '#a0c4ff', accL: '#3366cc' },
  // light
  { id: 'paper', name: 'Paper', cat: 'light', h: 40, s: 20, acc: '#4d9bff', accL: '#1f6feb' },
  { id: 'cloud', name: 'Cloud', cat: 'light', h: 210, s: 30, acc: '#5ac8fa', accL: '#0a78b8' },
  { id: 'cream', name: 'Cream', cat: 'light', h: 45, s: 45, acc: '#ffb340', accL: '#b05d00' },
  { id: 'ivory', name: 'Ivory', cat: 'light', h: 50, s: 30, acc: '#cfae82', accL: '#7a5c34' },
  { id: 'snow', name: 'Snow', cat: 'light', h: 200, s: 15, acc: '#64d2ff', accL: '#0066dd' },
  { id: 'linen', name: 'Linen', cat: 'light', h: 30, s: 25, acc: '#d6a06e', accL: '#8f5a2a' },
  { id: 'porcelain', name: 'Porcelain', cat: 'light', h: 220, s: 25, acc: '#8b8aff', accL: '#4b49c9' },
  // nature
  { id: 'moss', name: 'Moss', cat: 'nature', h: 95, s: 30, acc: '#a8d84a', accL: '#55760f' },
  { id: 'jungle', name: 'Jungle', cat: 'nature', h: 130, s: 50, acc: '#1fd66b', accL: '#00803a' },
  { id: 'autumn', name: 'Autumn', cat: 'nature', h: 28, s: 55, acc: '#f07a40', accL: '#a8431a' },
  { id: 'earth', name: 'Earth', cat: 'nature', h: 30, s: 25, acc: '#c99a72', accL: '#7b5233' },
  { id: 'bamboo', name: 'Bamboo', cat: 'nature', h: 80, s: 40, acc: '#b2dc7c', accL: '#557f1a' },
  { id: 'meadow', name: 'Meadow', cat: 'nature', h: 110, s: 40, acc: '#8be060', accL: '#3a8a1a' },
  // ocean & sky
  { id: 'lagoon', name: 'Lagoon', cat: 'ocean', h: 178, s: 60, acc: '#35d0c1', accL: '#0b8478' },
  { id: 'sky', name: 'Sky', cat: 'ocean', h: 205, s: 60, acc: '#5ccbfa', accL: '#0277bd' },
  { id: 'deepsea', name: 'Deep sea', cat: 'ocean', h: 215, s: 65, acc: '#1ab2f0', accL: '#00699a' },
  { id: 'glacier', name: 'Glacier', cat: 'ocean', h: 190, s: 30, acc: '#a8e6ef', accL: '#1f7f8f' },
  { id: 'cobalt', name: 'Cobalt', cat: 'ocean', h: 225, s: 75, acc: '#5c82ff', accL: '#2647b3' },
  { id: 'reef', name: 'Reef', cat: 'ocean', h: 185, s: 55, acc: '#ff8a5c', accL: '#c2461a' },
  // neon
  { id: 'synthwave', name: 'Synthwave', cat: 'neon', h: 300, s: 70, acc: '#ff3bdc', accL: '#b0008a' },
  { id: 'laser', name: 'Laser', cat: 'neon', h: 0, s: 60, acc: '#ff2d55', accL: '#c4001d' },
  { id: 'electric', name: 'Electric', cat: 'neon', h: 220, s: 80, acc: '#3d8bff', accL: '#0d47c9' },
  { id: 'toxic', name: 'Toxic', cat: 'neon', h: 90, s: 70, acc: '#b2ff59', accL: '#4a8a00' },
  { id: 'matrix', name: 'Matrix', cat: 'neon', h: 130, s: 60, acc: '#00ff41', accL: '#007a1e' },
  { id: 'vapor', name: 'Vapor', cat: 'neon', h: 270, s: 60, acc: '#00e5ff', accL: '#00829a' },
  { id: 'plasma', name: 'Plasma', cat: 'neon', h: 320, s: 75, acc: '#ff2bb0', accL: '#b00070' },
  // warm
  { id: 'coral', name: 'Coral', cat: 'warm', h: 10, s: 60, acc: '#ff7f50', accL: '#c2461a' },
  { id: 'peach', name: 'Peach', cat: 'warm', h: 25, s: 70, acc: '#ffb38a', accL: '#b5531f' },
  { id: 'ember', name: 'Ember', cat: 'warm', h: 15, s: 65, acc: '#ff6a3d', accL: '#bf360c' },
  { id: 'terracotta', name: 'Terracotta', cat: 'warm', h: 15, s: 45, acc: '#ea8470', accL: '#9e4330' },
  { id: 'cinnamon', name: 'Cinnamon', cat: 'warm', h: 22, s: 45, acc: '#de8a4a', accL: '#94450f' },
  // pastel
  { id: 'babyblue', name: 'Baby blue', cat: 'pastel', h: 205, s: 70, acc: '#8fd3f4', accL: '#2a7fb0' },
  { id: 'lilac', name: 'Lilac', cat: 'pastel', h: 285, s: 45, acc: '#d9a8ff', accL: '#8e3fcc' },
  { id: 'cotton', name: 'Cotton candy', cat: 'pastel', h: 320, s: 60, acc: '#ffb7e3', accL: '#b83a82' },
  { id: 'vanilla', name: 'Vanilla', cat: 'pastel', h: 48, s: 60, acc: '#f3e5ab', accL: '#8a7414' },
  { id: 'apricot', name: 'Apricot', cat: 'pastel', h: 28, s: 65, acc: '#ffc49b', accL: '#b05f22' },
  // classic
  { id: 'mono', name: 'Mono', cat: 'classic', h: 0, s: 0, acc: '#ffffff', accL: '#000000' },
  { id: 'slate', name: 'Slate', cat: 'classic', h: 215, s: 18, acc: '#a3b1c6', accL: '#475569' },
  { id: 'steel', name: 'Steel', cat: 'classic', h: 205, s: 14, acc: '#8db3d6', accL: '#3d6b94' },
  { id: 'charcoal', name: 'Charcoal', cat: 'classic', h: 20, s: 5, acc: '#ff9f0a', accL: '#b35f00' },
  // sport
  { id: 'energy', name: 'Energy', cat: 'sport', h: 85, s: 30, acc: '#c6ff00', accL: '#5f7d00' },
  { id: 'turbo', name: 'Turbo', cat: 'sport', h: 0, s: 40, acc: '#ff5a1f', accL: '#c42c00' },
  { id: 'power', name: 'Power', cat: 'sport', h: 220, s: 45, acc: '#ff9a1f', accL: '#b35a00' },
  { id: 'victory', name: 'Victory', cat: 'sport', h: 45, s: 20, acc: '#ffc61a', accL: '#946e00' },
  { id: 'stadium', name: 'Stadium', cat: 'sport', h: 140, s: 35, acc: '#8aff3d', accL: '#2e7d00' },
]

/** Lightness of bg / elevated / surface / surface-2 / surface-3, and how much of the hue's saturation. */
export const VARIANTS = [
  { id: 'dark', name: 'Dark', mode: 'dark', sat: 0.25, l: [4, 6, 11, 16, 22] },
  { id: 'amoled', name: 'Pure black', mode: 'dark', sat: 0.2, l: [0, 3, 8, 13, 19] },
  { id: 'deep', name: 'Deep', mode: 'dark', sat: 0.55, l: [7, 9, 13, 19, 25], glow: 0.22 },
  { id: 'dusk', name: 'Dusk', mode: 'dark', sat: 0.35, l: [12, 14, 18, 24, 30], glow: 0.16 },
  { id: 'light', name: 'Light', mode: 'light', sat: 0.3, l: [95, 97, 100, 92, 89] },
  { id: 'tint', name: 'Tinted', mode: 'light', sat: 0.45, l: [93, 96, 99, 89, 86], glow: 0.12 },
  { id: 'soft', name: 'Pastel', mode: 'light', sat: 0.6, l: [91, 94, 97, 88, 84], glow: 0.18 },
]
const VAR_IDX = Object.fromEntries(VARIANTS.map(v => [v.id, v]))
// The light / dark counterpart used when following the phone.
const OTHER = { dark: 'light', amoled: 'light', deep: 'soft', dusk: 'tint', light: 'dark', tint: 'dusk', soft: 'deep' }

export const THEMES = FAMILIES.flatMap(f => VARIANTS.map(v => ({ id: f.id + '-' + v.id, family: f, variant: v, mode: v.mode })))
export const THEME_IDX = Object.fromEntries(THEMES.map(x => [x.id, x]))
export const DEFAULT_THEME = 'classic-dark'

// ---- 2.12: the Theme Studio — 2,721,600 generated themes ------------------------------------
// Every combination of background hue (360) × colour strength (10) × style (7 variants) ×
// accent hue (36, every 10°) × glow (3) is its own theme, numbered 1 … STUDIO_COUNT, saved as
// 'g-<number>'. The accent's lightness is solved per background so it always reads (≥ 3:1).
export const STUDIO = { hues: 360, strengths: 10, accents: 36, glows: 3 }
export const STUDIO_COUNT = STUDIO.hues * STUDIO.strengths * VARIANTS.length * STUDIO.accents * STUDIO.glows
const GLOWS = [0, 0.14, 0.26]

/** { h 0-359, s 1-10, v variant id, a 0-350 (step 10), g 0-2 } → its number 1 … STUDIO_COUNT. */
export function studioNumber({ h, s, v, a, g }) {
  const vi = Math.max(0, VARIANTS.findIndex(x => x.id === v))
  let n = ((((h % 360) + 360) % 360) * STUDIO.strengths + (Math.min(10, Math.max(1, s)) - 1)) * VARIANTS.length + vi
  n = (n * STUDIO.accents + (Math.round((((a % 360) + 360) % 360) / 10) % 36)) * STUDIO.glows + Math.min(2, Math.max(0, g))
  return n + 1
}
/** The inverse of studioNumber (null when out of range). */
export function studioParams(n) {
  n = Math.floor(Number(n))
  if (!(n >= 1 && n <= STUDIO_COUNT)) return null
  let r = n - 1
  const g = r % STUDIO.glows; r = Math.floor(r / STUDIO.glows)
  const a = (r % STUDIO.accents) * 10; r = Math.floor(r / STUDIO.accents)
  const vi = r % VARIANTS.length; r = Math.floor(r / VARIANTS.length)
  const s = (r % STUDIO.strengths) + 1; r = Math.floor(r / STUDIO.strengths)
  return { h: r, s, v: VARIANTS[vi].id, a, g }
}
const genCache = new Map()
/** A Studio theme from its number, built like the curated ones. */
export function studioTheme(n) {
  const p = studioParams(n)
  if (!p) return null
  if (genCache.has(n)) return genCache.get(n)
  const v = VAR_IDX[p.v]
  const fam = { id: 'studio', name: 'Studio', cat: 'studio', h: p.h, s: p.s * 10 }
  const bg = hslHex(fam.h, fam.s * v.sat, v.l[0])
  const acc = readableAccent(p.a, bg, v.mode)
  fam.acc = acc; fam.accL = acc
  const th = { id: 'g-' + n, family: fam, variant: v, mode: v.mode, glow: GLOWS[p.g], studio: { ...p, n } }
  if (genCache.size > 400) genCache.clear()
  genCache.set(n, th)
  return th
}
/** An accent of hue `h` whose lightness is moved until it reads on `bg` (≥ 3:1). */
function readableAccent(h, bg, mode) {
  const dark = mode === 'dark'
  for (let l = dark ? 60 : 44; dark ? l <= 92 : l >= 14; l += dark ? 3 : -3) {
    const c = hslHex(h, 88, l)
    if (contrast(c, bg) >= 3) return c
  }
  return dark ? '#ffffff' : '#000000'
}
/** A random Studio number (for 🎲). */
export const randomStudio = (rnd = Math.random) => 1 + Math.floor(rnd() * STUDIO_COUNT)

/** Any theme id → its theme (curated or Studio), else null. */
export function themeOf(id) {
  if (THEME_IDX[id]) return THEME_IDX[id]
  const m = /^g-(\d{1,7})$/.exec(id || '')
  return m ? studioTheme(Number(m[1])) : null
}

/** Saved value → a known theme id ('dark' / 'light' from before 2.10 included). */
export function themeIdOf(v) {
  if (v === 'light') return 'classic-light'
  if (v === 'dark' || !themeOf(v)) return DEFAULT_THEME
  return v
}

/** The theme actually shown: the chosen one, or its counterpart when following the phone. */
export function resolveTheme(S, systemDark) {
  const id = themeIdOf(S && S.theme)
  const th = themeOf(id)
  const follow = !S || S.themeSystem !== false
  if (!follow || systemDark == null) return th
  const want = systemDark ? 'dark' : 'light'
  if (th.mode === want) return th
  if (th.studio) return studioTheme(studioNumber({ ...th.studio, v: OTHER[th.variant.id] })) || th
  return THEME_IDX[th.family.id + '-' + OTHER[th.variant.id]] || th
}

/** Families of a category (2.12). */
export const familiesOf = cat => FAMILIES.filter(f => f.cat === cat)

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
  const g = th.glow != null ? th.glow : v.glow
  const glow = g ? `radial-gradient(120% 70% at 85% -10%, color-mix(in srgb, ${acc} ${Math.round(g * 100)}%, transparent), transparent 60%)` : null
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
