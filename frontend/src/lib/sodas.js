// 10.0 — soft drinks: colas, lemon-lime, fruit sodas, soda and sparkling water, 0.0 % malt drinks,
// energy drinks and homemade sodas — each in the packs it is sold in (a can, a plastic bottle, a
// glass bottle, a glass, a restaurant cup) and every common size. Values are per 100 ml and typical:
// recipes differ from country to country, so the label on the can wins. Brand names belong to their
// owners; the packs are drawn generic (components/SodaArt.jsx), never with a logo.
// Pure (no store, no DOM). Screen: views/Sodas.jsx.
//
// A log entry: { id: 'fe…', f: null, sd: sodaId, pk: pack, ml: size, n, kcal, p, c, fat, q, m, t }
// (per pack; q = how many). The day plan keeps { t: 's', id, pk, ml, q }.
import { uid } from './format.js'

/** Packs and their sizes (ml). `cup` sizes read as small / medium / large. */
export const PACKS = {
  can: { name: 'Soda can', icon: 'can', sizes: [150, 250, 330, 355, 473, 500] },
  bottle: { name: 'Plastic bottle', icon: 'bottle', sizes: [250, 300, 390, 500, 1000, 1250, 1500, 2000, 2250] },
  glassb: { name: 'Glass bottle', icon: 'bottle', sizes: [200, 250, 275, 330] },
  glass: { name: 'Glass', icon: 'cup', sizes: [200, 250, 300, 400, 500] },
  cup: { name: 'Restaurant cup', icon: 'cup', sizes: [350, 500, 700] },
}
export const PACK_KEYS = Object.keys(PACKS)
export const CUP_LABEL = { 350: 'Small size', 500: 'Medium size', 700: 'Large size' }
/** A whole big bottle is rarely one drink — over this size the sheet suggests pouring a glass. */
export const SHARE_ML = 1000

export const SODA_CATS = [
  { key: 'cola', name: 'Colas', icon: 'can', color: '#b5562b', desc: 'Regular colas are high in sugar and have some caffeine. The zero versions have no calories.' },
  { key: 'clear', name: 'Lemon & lime', icon: 'leafy', color: '#34c759', desc: 'No caffeine, but just as sweet as cola — the diet versions have no sugar.' },
  { key: 'fruit', name: 'Fruit sodas', icon: 'apple', color: '#ff9500', desc: 'Coloured and sweet, usually with no real fruit. Sparkling water with fresh juice is a lighter choice.' },
  { key: 'mixer', name: 'Soda & sparkling water', icon: 'bubbles', color: '#40c8e0', desc: 'Soda and sparkling water have no calories. Tonic water and ginger ale are sweetened.' },
  { key: 'malt', name: 'Malt drinks 0.0%', icon: 'bottle', color: '#c8962e', desc: 'Malt drinks have no alcohol. The flavoured ones are as sweet as soft drinks; the classic is lighter.' },
  { key: 'energy', name: 'Energy drinks', icon: 'bolt', color: '#ff375f', desc: 'Lots of caffeine and sugar. Not for children, pregnancy or anyone sensitive to caffeine — one can a day at most.' },
  { key: 'home', name: 'Homemade sodas', icon: 'blender', color: '#30d158', desc: 'Made at home with soda water, fresh lemon and mint — you decide how sweet. Values assume a little sugar.' },
]
export const SODA_CAT_BY_KEY = Object.fromEntries(SODA_CATS.map(c => [c.key, c]))

// Which packs each kind comes in, and the pack + size a new log starts on.
const CAT_PACKS = {
  cola: ['can', 'bottle', 'glassb', 'glass', 'cup'],
  clear: ['can', 'bottle', 'glassb', 'glass', 'cup'],
  fruit: ['can', 'bottle', 'glassb', 'glass', 'cup'],
  mixer: ['can', 'glassb', 'bottle', 'glass'],
  malt: ['can', 'glassb', 'bottle', 'glass'],
  energy: ['can', 'glass'],
  home: ['glass', 'cup'],
}
const CAT_DEF = { cola: ['can', 330], clear: ['can', 330], fruit: ['can', 330], mixer: ['can', 250], malt: ['can', 330], energy: ['can', 250], home: ['glass', 300] }

// [id, cat, name, kcal, sugar g, caffeine mg, sodium mg (all per 100 ml), drink colour, brand colour, second colour, flags, default pack/size?]
// flags: z = no sugar (sweeteners) · e = energy drink · q = quinine · d = dairy · m = mint · l = lemon · i = ice
const ROWS = [
  ['coke', 'cola', 'Coca-Cola', 42, 10.6, 9.7, 10, '#3a1a0e', '#e41e2b', '#ffffff', ''],
  ['cokezero', 'cola', 'Coca-Cola Zero', 0.3, 0, 9.6, 10, '#3a1a0e', '#1c1c1e', '#e41e2b', 'z'],
  ['cokediet', 'cola', 'Diet Coke', 0.4, 0, 12.9, 10, '#3a1a0e', '#c9ccd3', '#e41e2b', 'z'],
  ['pepsi', 'cola', 'Pepsi', 44, 11, 10.7, 10, '#3b1c10', '#0b4ea2', '#e32934', ''],
  ['pepsidiet', 'cola', 'Diet Pepsi', 0.4, 0, 9.9, 10, '#3b1c10', '#a9c4e8', '#0b4ea2', 'z'],
  ['pepsimax', 'cola', 'Pepsi Max', 0.4, 0, 13, 10, '#3b1c10', '#101828', '#2d7ff9', 'z'],
  ['kinza', 'cola', 'Kinza Cola', 46, 11.5, 9, 12, '#3b1c10', '#b5121b', '#111111', ''],
  ['7up', 'clear', '7Up', 42, 10.5, 0, 10, '#eefbe6', '#00a651', '#e4002b', 'l'],
  ['7upfree', 'clear', '7Up Free', 0.4, 0, 0, 10, '#eefbe6', '#e9f7ef', '#00a651', 'zl'],
  ['sprite', 'clear', 'Sprite', 40, 10, 0, 9, '#effbe9', '#008b47', '#ffd200', 'l'],
  ['spritezero', 'clear', 'Sprite Zero', 0.3, 0, 0, 9, '#effbe9', '#2c2c2e', '#00b259', 'zl'],
  ['mdew', 'clear', 'Mountain Dew', 49, 12.2, 15, 18, '#d8e84a', '#1f7a1f', '#c8f03c', ''],
  ['kinzalemon', 'clear', 'Kinza Lemon', 46, 11.5, 0, 12, '#f4f9c8', '#ffd200', '#1c8a3a', 'l'],
  ['mirinda', 'fruit', 'Mirinda Orange', 48, 12, 0, 12, '#ff8a1c', '#ff6f00', '#1e5bc6', ''],
  ['mirindastraw', 'fruit', 'Mirinda Strawberry', 47, 11.8, 0, 12, '#ff4d6d', '#e4002b', '#ffd6de', ''],
  ['mirindaapple', 'fruit', 'Mirinda Green Apple', 47, 11.8, 0, 12, '#9be15d', '#3fa535', '#e8ffd2', ''],
  ['mirindacitrus', 'fruit', 'Mirinda Citrus', 46, 11.5, 0, 12, '#ffd84d', '#ffb000', '#2a7d2e', 'l'],
  ['fanta', 'fruit', 'Fanta Orange', 46, 11.5, 0, 10, '#ff9a1f', '#ff8200', '#1d4fa3', ''],
  ['fantastraw', 'fruit', 'Fanta Strawberry', 46, 11.5, 0, 10, '#ff5c8a', '#e31c79', '#ffe0ec', ''],
  ['shani', 'fruit', 'Shani', 50, 12.5, 0, 12, '#8e1f5e', '#5b1a8c', '#ff3e8a', ''],
  ['vimto', 'fruit', 'Vimto Sparkling', 44, 11, 0, 10, '#7b1e3a', '#7a0f3f', '#ffcc00', ''],
  ['soda', 'mixer', 'Soda water', 0, 0, 0, 21, '#eaf6ff', '#00a3e0', '#ffffff', 'z'],
  ['sparkling', 'mixer', 'Sparkling water', 0, 0, 0, 10, '#eaf6ff', '#4fc3f7', '#1b6fa8', 'z'],
  ['tonic', 'mixer', 'Tonic water', 35, 8.8, 0, 12, '#f2fbff', '#f2c400', '#1c1c1e', 'q'],
  ['gingerale', 'mixer', 'Ginger ale', 37, 9.2, 0, 13, '#e8c37a', '#0e7a3a', '#f3e2b3', ''],
  ['bitterlemon', 'mixer', 'Bitter lemon', 41, 10, 0, 12, '#f5ef9a', '#f5d90a', '#24753a', 'ql'],
  ['barbican', 'malt', 'Barbican Classic', 26, 5, 0, 8, '#c8962e', '#b8860b', '#3a2a0a', ''],
  ['barbicanpom', 'malt', 'Barbican Pomegranate', 42, 10, 0, 8, '#b3263f', '#9e1238', '#f4c542', ''],
  ['barbicanapple', 'malt', 'Barbican Apple', 42, 10, 0, 8, '#d9c25a', '#3f9a40', '#f4c542', ''],
  ['barbicanlemon', 'malt', 'Barbican Lemon', 40, 9.6, 0, 8, '#e6d36a', '#e8c21c', '#2e7d32', 'l'],
  ['barbicanstraw', 'malt', 'Barbican Strawberry', 42, 10, 0, 8, '#d6455b', '#d81b47', '#f4c542', ''],
  ['barbicanpine', 'malt', 'Barbican Pineapple', 42, 10, 0, 8, '#e9b949', '#f0a500', '#2e7d32', ''],
  ['moussy', 'malt', 'Moussy Classic', 22, 4.5, 0, 8, '#c79a3b', '#1b5e20', '#d4af37', ''],
  ['fayrouz', 'malt', 'Fayrouz Pineapple', 44, 10.5, 0, 9, '#f1c75b', '#00897b', '#ffd54f', ''],
  ['redbull', 'energy', 'Red Bull', 46, 11, 32, 40, '#f2c94c', '#1e3a8a', '#d6dbe4', 'e'],
  ['redbullsf', 'energy', 'Red Bull Sugarfree', 3, 0, 32, 40, '#f4dc84', '#7fb8e6', '#e8edf4', 'ze'],
  ['powerhorse', 'energy', 'Power Horse', 46, 11, 32, 40, '#f2c94c', '#c62828', '#e9e9ee', 'e'],
  ['monster', 'energy', 'Monster Energy', 47, 11, 32, 37, '#cfe36b', '#141414', '#7ed321', 'e', ['can', 500]],
  ['monsterultra', 'energy', 'Monster Ultra', 2, 0, 30, 37, '#f1f4f6', '#e8eaec', '#9aa3ab', 'ze', ['can', 500]],
  ['sting', 'energy', 'Sting', 50, 12.5, 29, 30, '#ffb300', '#d7263d', '#ffcf33', 'e'],
  ['mintlemon', 'home', 'Mint & lemon soda', 18, 4.5, 0, 8, '#d4f5a3', '#30d158', '#ffe14d', 'mli'],
  ['mojito', 'home', 'Virgin mojito', 35, 8.5, 0, 8, '#c8f08f', '#2fbf71', '#d6ff7a', 'mli'],
  ['mojitoblue', 'home', 'Blue mojito', 45, 11, 0, 8, '#36c5f0', '#1f8fe0', '#bff1ff', 'mli'],
  ['mojitostraw', 'home', 'Strawberry mojito', 44, 10.8, 0, 8, '#ff6b81', '#ff3b5c', '#ffd1d9', 'mi'],
  ['rosesoda', 'home', 'Rose soda', 30, 7.5, 0, 6, '#ff9eb5', '#ff6f91', '#ffe3ea', 'i'],
  ['pomspritz', 'home', 'Pomegranate spritz', 32, 7.5, 0, 6, '#c2185b', '#ad1457', '#ffcdd2', 'i'],
  ['lemonfizz', 'home', 'Lemonade fizz', 30, 7.5, 0, 6, '#fff176', '#f9c80e', '#fffde7', 'li'],
  ['doogh', 'home', 'Sparkling doogh', 30, 3, 0, 180, '#f6f4ec', '#4caf50', '#ffffff', 'dm', ['glass', 300]],
]

// The sugar-free choice that tastes closest — the sheet shows what switching saves.
export const SODA_SWAP = {
  coke: 'cokezero', kinza: 'cokezero', pepsi: 'pepsimax', '7up': '7upfree', sprite: 'spritezero', kinzalemon: '7upfree', mdew: 'spritezero',
  redbull: 'redbullsf', powerhorse: 'redbullsf', monster: 'monsterultra', sting: 'redbullsf',
  mirinda: 'sparkling', mirindastraw: 'sparkling', mirindaapple: 'sparkling', mirindacitrus: 'sparkling', fanta: 'sparkling', fantastraw: 'sparkling',
  shani: 'sparkling', vimto: 'sparkling', tonic: 'soda', gingerale: 'soda', bitterlemon: 'soda', mojito: 'mintlemon', mojitoblue: 'mintlemon',
  mojitostraw: 'mintlemon', lemonfizz: 'mintlemon',
}

export const SODA_NOTE = {
  e: 'High in caffeine — not for children, pregnancy or anyone sensitive to caffeine. Never mix it with alcohol, and not during hard exercise in the heat.',
  z: 'No sugar: sweetened with sweeteners, so almost no calories.',
  q: 'Contains quinine, which gives the bitter taste.',
  d: 'A yoghurt drink with bubbles — a little protein and salt, very little sugar.',
}

const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k))
export const SODAS = ROWS.map(([id, cat, name, k, s, cf, na, col, br, br2, fl, def]) => {
  const flags = fl || ''
  const d = def || CAT_DEF[cat]
  return {
    id, cat, name, k100: k, s100: s, cf100: cf, na100: na, col, br, br2,
    zero: flags.includes('z'), energy: flags.includes('e'), quinine: flags.includes('q'), dairy: flags.includes('d'),
    mint: flags.includes('m'), lemon: flags.includes('l'), ice: flags.includes('i'),
    packs: CAT_PACKS[cat], def: { pk: d[0], ml: d[1] },
    p100: flags.includes('d') ? 1.6 : 0, f100: flags.includes('d') ? 1.2 : 0,
  }
})
export const SODA_BY_ID = Object.fromEntries(SODAS.map(s => [s.id, s]))
export const sodaOf = id => SODA_BY_ID[id] || null

// ---- maths ----------------------------------------------------------------------------------------
export const TSP_G = 4                 // one teaspoon of sugar
export const SUGAR_MAX_G = 50          // WHO: free sugars under 10 % of energy (2,000 kcal)
export const SUGAR_IDEAL_G = 25        // … and ideally under 5 %
export const CAFFEINE_MAX_MG = 400     // a healthy adult, the whole day
const r1 = v => Math.round(v * 10) / 10

const DEF_SIZE = { can: 330, bottle: 500, glassb: 250, glass: 250, cup: 500 }
/** A valid pack + size for a soda (falls back to its default). */
export function packFor(s, pk, ml) {
  if (!s) return { pk: 'can', ml: 330 }
  const P = s.packs.includes(pk) ? pk : s.def.pk
  const sizes = PACKS[P].sizes
  if (sizes.includes(+ml)) return { pk: P, ml: +ml }
  if (P === s.def.pk && sizes.includes(s.def.ml)) return { pk: P, ml: s.def.ml }
  return { pk: P, ml: DEF_SIZE[P] }
}

/** Nutrition for `count` packs of `ml`: kcal, sugar (g + teaspoons), caffeine, sodium, protein, fat. */
export function sodaNutrition(s, ml = 330, count = 1) {
  if (!s) return { ml: 0, kcal: 0, sugar: 0, tsp: 0, caffeine: 0, sodium: 0, p: 0, c: 0, f: 0 }
  const v = Math.max(0, +ml || 0) * Math.max(0, +count || 0)
  const k = v / 100
  const sugar = r1(s.s100 * k)
  return {
    ml: Math.round(v),
    kcal: Math.round(s.k100 * k),
    sugar,
    tsp: r1(sugar / TSP_G),
    caffeine: Math.round(s.cf100 * k),
    sodium: Math.round(s.na100 * k),
    p: r1(s.p100 * k),
    c: r1(s.zero ? 0 : Math.max(sugar, s.k100 * k / 4.1 - (s.p100 + s.f100 * 2.2) * k)),
    f: r1(s.f100 * k),
  }
}

/** Minutes of brisk walking (≈3.5 MET) that burn `kcal` for a body of `kg`. */
export const walkMinutes = (kcal, kg = 70) => Math.max(0, Math.round(kcal / ((3.5 * 3.5 * Math.max(30, kg || 70)) / 200)))

/** Share of the daily sugar limit (0–1+) and of the daily caffeine limit. */
export const sugarShare = g => g / SUGAR_MAX_G
export const caffeineShare = mg => mg / CAFFEINE_MAX_MG

/** What switching to the sugar-free twin saves (null when there is none or it is not lighter). */
export function swapSaving(s, ml, count = 1) {
  const z = s && SODA_BY_ID[SODA_SWAP[s.id]]
  if (!z) return null
  const a = sodaNutrition(s, ml, count), b = sodaNutrition(z, ml, count)
  const kcal = a.kcal - b.kcal
  if (kcal < 5) return null
  return { to: z, kcal, sugar: r1(a.sugar - b.sugar), tsp: r1((a.sugar - b.sugar) / TSP_G) }
}

/** How the pack is drawn for a size: [width, height] on a 100 × 120 canvas (SodaArt). */
const DIMS = {
  can: { 150: [30, 56], 250: [34, 66], 330: [34, 80], 355: [34, 84], 473: [36, 98], 500: [36, 102] },
  slim: { 150: [24, 60], 250: [26, 84], 330: [27, 96], 355: [28, 100], 473: [32, 104], 500: [34, 106] },
  bottle: { 250: [24, 60], 300: [25, 66], 390: [27, 74], 500: [29, 82], 1000: [34, 96], 1250: [36, 100], 1500: [38, 104], 2000: [42, 108], 2250: [44, 110] },
  glassb: { 200: [22, 76], 250: [24, 84], 275: [24, 90], 330: [26, 96] },
  glass: { 200: [36, 58], 250: [38, 64], 300: [40, 70], 400: [44, 78], 500: [48, 86] },
  cup: { 350: [42, 68], 500: [48, 82], 700: [54, 96] },
}
export function packDims(pk, ml, slim = false) {
  const T = DIMS[pk === 'can' && slim ? 'slim' : pk] || DIMS.can
  if (T[ml]) return T[ml]
  const keys = Object.keys(T).map(Number).sort((a, b) => a - b)
  const lo = [...keys].reverse().find(x => x <= ml) || keys[0], hi = keys.find(x => x >= ml) || keys[keys.length - 1]
  if (lo === hi) return T[lo]
  const k = (ml - lo) / (hi - lo)
  return [lerp(T[lo][0], T[hi][0], k), lerp(T[lo][1], T[hi][1], k)]
}

// ---- search & log ---------------------------------------------------------------------------------
const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim()

/** Filter: q (in the app's language and English), cat, zero (sugar-free only), noCaf (no caffeine). */
export function searchSodas({ q = '', cat = null, zero = false, noCaf = false, tr = s => s } = {}) {
  const Q = fold(q)
  return SODAS.filter(s => (!cat || s.cat === cat) && (!zero || s.k100 < 5) && (!noCaf || !s.cf100)
    && (!Q || fold(tr(s.name) + ' ' + s.name + ' ' + tr(SODA_CAT_BY_KEY[s.cat].name)).includes(Q)))
}

/** A food-log entry for `count` packs (kcal / macros per pack, like every other entry). */
export function sodaEntry(s, { pk, ml, count = 1, meal = 's', now = Date.now() } = {}) {
  const p = packFor(s, pk, ml)
  const n = sodaNutrition(s, p.ml, 1)
  return { id: 'fe' + uid(), f: null, sd: s.id, pk: p.pk, ml: p.ml, n: s.name, kcal: n.kcal, p: n.p, c: n.c, fat: n.f,
    q: Math.min(20, Math.max(0.5, Math.round((+count || 1) * 2) / 2)), m: ['b', 'l', 'd', 's'].includes(meal) ? meal : 's', t: now }
}

/** Today's soft drinks from the food log: count, kcal, sugar, caffeine. */
export function sodaDay(entries) {
  const out = { count: 0, kcal: 0, sugar: 0, caffeine: 0, ml: 0 }
  for (const e of entries || []) {
    const s = e && e.sd && SODA_BY_ID[e.sd]
    if (!s) continue
    const n = sodaNutrition(s, e.ml || s.def.ml, e.q || 1)
    out.count += +e.q || 1; out.kcal += n.kcal; out.sugar += n.sugar; out.caffeine += n.caffeine; out.ml += n.ml
  }
  out.sugar = r1(out.sugar)
  return out
}

/** The soft drinks you logged lately, newest first: [{ id, pk, ml }] (unique by drink). */
export function recentSodas(S, days = 21, max = 8) {
  const food = (S && S.food) || {}
  const isos = Object.keys(food).sort().reverse().slice(0, days)
  const out = [], seen = new Set()
  for (const iso of isos) {
    const list = [...(food[iso] || [])].sort((a, b) => (b.t || 0) - (a.t || 0))
    for (const e of list) if (e && e.sd && SODA_BY_ID[e.sd] && !seen.has(e.sd)) { seen.add(e.sd); out.push({ id: e.sd, pk: e.pk, ml: e.ml }) }
    if (out.length >= max) break
  }
  return out.slice(0, max)
}

/** Whether a drink is better counted as water: the plain waters and zero drinks without caffeine. */
export const countsAsWater = s => !!s && s.k100 < 5 && !s.cf100
