// 10.0 — nuts & seeds: pistachios, peanuts, almonds, walnuts, cashews, hazelnuts, pine nuts and
// more, the seeds people crack in Iraq (sunflower, watermelon, pumpkin) and kerzat — the mixed
// nuts and seeds of every gathering. Raw, roasted or salted; weighed with or without the shell;
// counted in grams, handfuls, pieces or spoons. Values per 100 g of the edible part (USDA-style,
// rounded). Pure (no store, no DOM). Screen: views/Nuts.jsx, art: components/NutArt.jsx.
// 11.0 — many more, with their Iraqi names: melon seeds, lemon pistachios, acorns, royal and seed
// kerzat, popcorn (shamiya), roasted corn, lupini (termis), crunchy peanuts; dried fruits and dates
// (raisins, kishmish, zahdi, khastawi, barhi and medjool dates, figs, apricots, qamar al-din,
// mulberries, prunes, banana chips) and the sweet ones (mlabbas, chocolate nuts, sugared chickpeas,
// simsimiya, jowziya, stuffed dates). Dates are weighed with or without the stone; a handful of
// popcorn or lupini weighs what it really weighs (`hf`).
//
// A log entry: { id: 'fe…', f: null, nut: id, fm: form, g: edible grams, n, kcal, p, c, fat, q: 1, m, t }.
// The day plan keeps { t: 'n', id, fm, g, q }.
import { uid } from './format.js'

export const NUT_CATS = [
  { key: 'nut', name: 'Nuts', icon: 'nut', color: '#b9783f' },
  { key: 'seed', name: 'Seeds', icon: 'seed', color: '#7c8a3c' },
  { key: 'snack', name: 'Roasted snacks', icon: 'sparkles', color: '#e0a03a' },
  { key: 'dried', name: 'Dried fruits & dates', icon: 'apple', color: '#a0522d' },
  { key: 'sweet', name: 'Sweet & coated', icon: 'star', color: '#d15b8f' },
]
/** Categories counted in "a handful of nuts a day" (dried fruit and sweets are not nuts). */
export const NUTTY = new Set(['nut', 'seed', 'snack'])
export const NUT_CAT_BY_KEY = Object.fromEntries(NUT_CATS.map(c => [c.key, c]))

export const FORMS = { raw: 'Raw', roasted: 'Roasted', salted: 'Roasted & salted', boiled: 'Boiled & salted', dried: 'Dried', sweet: 'Sweetened' }
const SALTY = new Set(['salted', 'boiled'])
const TOASTED = new Set(['roasted', 'salted'])
export const UNITS = { g: 'Grams', handful: 'Handfuls', piece: 'Pieces', tbsp: 'Spoons' }
export const HANDFUL_G = 30            // a handful a day — the usual healthy portion
export const SALT_NA = 450             // mg sodium added per 100 g when salted

export const MICRO = {
  vitE: 'Vitamin E', mg: 'Magnesium', k: 'Potassium', b6: 'Vitamin B6', fe: 'Iron', zn: 'Zinc', se: 'Selenium',
  o3: 'Omega-3', ca: 'Calcium', cu: 'Copper (Cu)', mn: 'Manganese', fol: 'Folate', fib: 'Fibre', vitC: 'Vitamin C', b1: 'Thiamin (B1)', b3: 'Niacin (B3)',
  vitA: 'Vitamin A', vitK: 'Vitamin K',
}
export const BENEFIT = {
  heart: { icon: 'heart', text: 'Good fats for a healthy heart.' },
  protein: { icon: 'arm', text: 'Plant protein that keeps you full.' },
  brain: { icon: 'lightbulb', text: 'Omega-3 fats for the brain.' },
  eyes: { icon: 'eye', text: 'Lutein for healthy eyes.' },
  bones: { icon: 'shield', text: 'Calcium and magnesium for strong bones.' },
  skin: { icon: 'sparkles', text: 'Vitamin E protects your skin.' },
  energy: { icon: 'bolt', text: 'Steady energy that lasts.' },
  gut: { icon: 'leafy', text: 'Fibre for good digestion.' },
  sleep: { icon: 'moon', text: 'Magnesium helps you relax and sleep better.' },
  immune: { icon: 'shield', text: 'Zinc for your immune system.' },
  thyroid: { icon: 'gauge', text: 'Selenium for your thyroid.' },
  iron: { icon: 'drop', text: 'Iron for energy and focus.' },
  sugar: { icon: 'chartLine', text: 'Gentle on blood sugar.' },
  light: { icon: 'leafy', text: 'Much less fat than other nuts.' },
  quick: { icon: 'bolt', text: 'Quick natural energy — good before training.' },
}
export const NUT_CAUTION = {
  allergy: 'Nut allergy? Avoid it and check labels.',
  peanut: 'Peanut allergy can be serious — avoid it if you are allergic.',
  sesame: 'Sesame is a common allergen.',
  salt: 'Salted: a lot of sodium — choose unsalted if you watch your blood pressure.',
  kcal: 'Rich in calories — a handful a day is enough.',
  selenium: 'Very rich in selenium — one or two nuts a day is enough.',
  kids: 'Whole nuts are a choking risk for children under five.',
  soak: 'Drink plenty of water with it, or soak it first.',
  sat: 'High in saturated fat — enjoy it in small amounts.',
  sugar: 'A lot of sugar — a few pieces are enough.',
}

// [id, cat, name, raw [kcal, protein, fat, carbs, fibre, sugar], roasted [...] | null, piece g | 0, spoon g | 0,
//  edible share in the shell (1 = sold shelled; for dates: without the stone), forms, default [unit, amount], micro, benefits,
//  cautions, colour, handful g (default 30)]
const ROWS = [
  ['pistachio', 'nut', 'Pistachios', [560, 20.2, 45.3, 27.2, 10.6, 7.7], [572, 21, 46, 28, 10, 7.7], 0.6, 0, 0.53, 'raw roasted salted', ['handful', 1], ['b6', 'k', 'fib'], ['protein', 'eyes', 'heart'], ['allergy', 'kcal'], '#93c572'],
  ['peanut', 'nut', 'Peanuts', [567, 25.8, 49.2, 16.1, 8.5, 4.7], [585, 24.4, 49.7, 21.3, 8, 4.9], 0.9, 0, 0.7, 'raw roasted salted', ['handful', 1], ['b3', 'fol', 'mg'], ['protein', 'heart', 'energy'], ['peanut', 'kcal'], '#d9a35b'],
  ['almond', 'nut', 'Almonds', [579, 21.2, 49.9, 21.6, 12.5, 4.4], [598, 21, 52.5, 21, 11, 4.9], 1.2, 0, 0.4, 'raw roasted salted', ['handful', 1], ['vitE', 'mg', 'ca'], ['skin', 'heart', 'bones'], ['allergy', 'kcal'], '#c68a54'],
  ['walnut', 'nut', 'Walnuts', [654, 15.2, 65.2, 13.7, 6.7, 2.6], [660, 15, 66, 13.5, 6.5, 2.6], 4, 0, 0.45, 'raw roasted', ['handful', 1], ['o3', 'cu', 'mn'], ['brain', 'heart'], ['allergy', 'kcal'], '#b98b5e'],
  ['cashew', 'nut', 'Cashews', [553, 18.2, 43.9, 30.2, 3.3, 5.9], [574, 15.3, 46.4, 32.7, 3, 5], 1.6, 0, 1, 'raw roasted salted', ['handful', 1], ['cu', 'zn', 'mg'], ['immune', 'energy', 'bones'], ['allergy', 'kcal'], '#f0d9a8'],
  ['hazelnut', 'nut', 'Hazelnuts', [628, 15, 60.8, 16.7, 9.7, 4.3], [646, 15, 62.4, 17.6, 9.4, 4.9], 1.4, 0, 0.45, 'raw roasted', ['handful', 1], ['vitE', 'mn', 'cu'], ['heart', 'skin'], ['allergy', 'kcal'], '#a8683a'],
  ['pine', 'nut', 'Pine nuts', [673, 13.7, 68.4, 13.1, 3.7, 3.6], [690, 14, 70, 13, 3.7, 3.6], 0, 9, 1, 'raw roasted', ['tbsp', 2], ['mn', 'mg', 'zn'], ['heart', 'energy'], ['allergy', 'kcal'], '#f1deb0'],
  ['macadamia', 'nut', 'Macadamia nuts', [718, 7.9, 75.8, 13.8, 8.6, 4.6], [718, 7.8, 76.1, 13.4, 8, 4.1], 2.6, 0, 1, 'raw roasted salted', ['piece', 8], ['mn', 'b1'], ['heart'], ['allergy', 'kcal'], '#f3e2bd'],
  ['brazil', 'nut', 'Brazil nuts', [659, 14.3, 67.1, 11.7, 7.5, 2.3], null, 5, 0, 1, 'raw', ['piece', 2], ['se', 'mg'], ['thyroid', 'heart'], ['selenium', 'allergy'], '#8a5a3b'],
  ['pecan', 'nut', 'Pecans', [691, 9.2, 72, 13.9, 9.6, 4], [710, 9.5, 74.3, 13.6, 9.4, 4], 1.5, 0, 0.5, 'raw roasted', ['handful', 1], ['mn', 'cu', 'zn'], ['heart', 'sugar'], ['allergy', 'kcal'], '#8c4f2b'],
  ['chestnut', 'nut', 'Roasted chestnuts', null, [245, 3.2, 2.2, 53, 5.1, 10.6], 8.4, 0, 0.82, 'roasted', ['piece', 6], ['vitC', 'k', 'mn'], ['light', 'energy', 'gut'], [], '#7b3f22'],
  ['sunflower', 'seed', 'Sunflower seeds', [584, 20.8, 51.5, 20, 8.6, 2.6], [582, 19.3, 49.8, 24.1, 11.1, 2.7], 0, 9, 0.55, 'raw roasted salted', ['handful', 1], ['vitE', 'se', 'b1'], ['skin', 'heart'], ['kcal'], '#5b5b5b'],
  ['watermelon', 'seed', 'Watermelon seeds', [557, 28.3, 47.4, 15.3, 4, 1], [560, 28, 47.5, 15.5, 4, 1], 0, 9, 0.55, 'roasted salted', ['handful', 1], ['mg', 'fe', 'zn'], ['protein', 'bones'], ['kcal'], '#3d3229'],
  ['pumpkin', 'seed', 'Pumpkin seeds', [559, 30.2, 49, 10.7, 6, 1.4], [574, 29.8, 49, 14.7, 6.5, 1.3], 0, 9, 0.75, 'raw roasted salted', ['handful', 1], ['mg', 'zn', 'fe'], ['immune', 'sleep', 'protein'], ['kcal'], '#e8e0c4'],
  ['sesame', 'seed', 'Sesame seeds', [573, 17.7, 49.7, 23.4, 11.8, 0.3], [565, 17, 48, 26, 14, 0.5], 0, 9, 1, 'raw roasted', ['tbsp', 1], ['ca', 'fe', 'mg'], ['bones', 'iron'], ['sesame'], '#ecd9a7'],
  ['chia', 'seed', 'Chia seeds', [486, 16.5, 30.7, 42.1, 34.4, 0], null, 0, 12, 1, 'raw', ['tbsp', 1], ['o3', 'fib', 'ca'], ['gut', 'brain'], ['soak'], '#6f6a66'],
  ['flax', 'seed', 'Flax seeds', [534, 18.3, 42.2, 28.9, 27.3, 1.6], null, 0, 10, 1, 'raw', ['tbsp', 1], ['o3', 'fib', 'mg'], ['gut', 'heart', 'brain'], ['soak'], '#9a6a3a'],
  ['chickpea', 'snack', 'Roasted chickpeas', null, [380, 20.5, 6.5, 58, 17, 10], 0.35, 0, 1, 'roasted salted', ['handful', 1], ['fe', 'fol', 'mg'], ['protein', 'gut', 'energy'], [], '#e3b25f'],
  ['kerzat', 'snack', 'Kerzat (mixed nuts & seeds)', null, [594, 17.3, 51.5, 25.4, 7, 4.5], 1.2, 0, 0.75, 'roasted salted', ['handful', 1], ['vitE', 'mg'], ['heart', 'energy'], ['allergy', 'kcal'], '#c98b4b'],
  ['coconut', 'snack', 'Dried coconut', [660, 6.9, 64.5, 23.7, 16.3, 7.4], null, 0, 6, 1, 'raw', ['tbsp', 2], ['mn', 'cu', 'fib'], ['energy', 'gut'], ['sat', 'kcal'], '#f5efe2'],
  // 11.0 — more of what is cracked and nibbled in Iraq
  ['melon', 'seed', 'Melon seeds', [557, 28.3, 47.4, 15.3, 4, 1], null, 0, 9, 0.55, 'roasted salted', ['handful', 1], ['mg', 'zn', 'fe'], ['protein', 'bones'], ['kcal'], '#efe6c9'],
  ['pistachiolemon', 'nut', 'Lemon-salted pistachios', null, [572, 21, 46, 28, 10, 7.7], 0.6, 0, 0.53, 'salted', ['handful', 1], ['b6', 'k', 'fib'], ['protein', 'eyes', 'heart'], ['allergy', 'kcal'], '#a8c96a'],
  ['acorn', 'nut', 'Acorns (balloot)', [387, 6.2, 23.9, 40.8, 4, 0], null, 3.5, 0, 0.7, 'roasted', ['piece', 8], ['mn', 'k', 'b6'], ['energy', 'gut'], ['allergy'], '#9a6334'],
  ['kerzatroyal', 'snack', 'Royal kerzat (cashews, pistachios, almonds, hazelnuts)', null, [600, 19, 52, 23, 7, 5], 1.4, 0, 0.85, 'roasted salted', ['handful', 1], ['vitE', 'mg', 'cu'], ['heart', 'protein', 'energy'], ['allergy', 'kcal'], '#c7924f'],
  ['kerzatseeds', 'snack', 'Seed kerzat (sunflower, melon & pumpkin)', null, [570, 25, 48, 17, 7, 1.5], 0, 9, 0.6, 'roasted salted', ['handful', 1], ['mg', 'zn', 'vitE'], ['protein', 'immune'], ['kcal'], '#8e8b7a'],
  ['popcorn', 'snack', 'Popcorn (shamiya)', null, [500, 9, 28, 57, 10, 0.5], 0, 0, 1, 'roasted salted', ['handful', 3], ['fib', 'mg', 'b1'], ['gut', 'light'], [], '#fff1cf', 10],
  ['corn', 'snack', 'Roasted corn kernels', null, [446, 8.3, 14.5, 71.5, 7, 1.5], 0.4, 0, 1, 'roasted salted', ['handful', 1], ['mg', 'b1', 'fib'], ['energy', 'gut'], [], '#f2b33d'],
  ['lupin', 'snack', 'Lupini beans (termis)', [119, 15.6, 2.9, 9.9, 2.8, 0.5], null, 0.5, 0, 0.8, 'boiled', ['handful', 2], ['mg', 'fe', 'zn'], ['protein', 'light', 'gut'], [], '#f4d35e', 40],
  ['crunchy', 'snack', 'Crunchy coated peanuts', null, [500, 15, 27, 52, 4, 10], 1.3, 0, 1, 'roasted', ['handful', 1], ['b3', 'mg'], ['energy'], ['peanut', 'kcal'], '#d98e3f'],
  // dried fruits and dates — a natural sweet
  ['raisins', 'dried', 'Raisins (zbeeb)', [299, 3.1, 0.5, 79.2, 3.7, 59.2], null, 0.5, 10, 1, 'dried', ['tbsp', 2], ['k', 'fe', 'cu'], ['quick', 'iron'], ['sugar'], '#4a2a3a'],
  ['kishmish', 'dried', 'Golden raisins (kishmish)', [302, 3.4, 0.5, 79.5, 4, 59.2], null, 0.5, 10, 1, 'dried', ['tbsp', 2], ['k', 'fe', 'cu'], ['quick', 'iron'], ['sugar'], '#d9a441'],
  ['zahdi', 'dried', 'Zahdi dates', [282, 2.5, 0.4, 75, 8, 63.4], null, 7, 0, 0.9, 'dried', ['piece', 3], ['k', 'mg', 'fib'], ['quick', 'gut'], ['sugar'], '#b5772f'],
  ['khastawi', 'dried', 'Khastawi dates', [300, 2.2, 0.4, 78, 7, 66], null, 8, 0, 0.9, 'dried', ['piece', 3], ['k', 'mg', 'fib'], ['quick', 'gut'], ['sugar'], '#8a4b1f'],
  ['barhi', 'dried', 'Barhi dates', [275, 2.2, 0.3, 73, 6.5, 62], null, 9, 0, 0.9, 'dried', ['piece', 3], ['k', 'mg', 'fib'], ['quick', 'gut'], ['sugar'], '#c88a2b'],
  ['medjool', 'dried', 'Medjool dates', [277, 1.8, 0.2, 75, 6.7, 66.5], null, 24, 0, 0.9, 'dried', ['piece', 2], ['k', 'mg', 'cu'], ['quick', 'gut'], ['sugar'], '#5a2e1a'],
  ['figs', 'dried', 'Dried figs', [249, 3.3, 0.9, 63.9, 9.8, 47.9], null, 8.4, 0, 1, 'dried', ['piece', 3], ['ca', 'k', 'fib'], ['bones', 'gut'], ['sugar'], '#8a6a48'],
  ['apricots', 'dried', 'Dried apricots (mishmish)', [241, 3.4, 0.5, 62.6, 7.3, 53.4], null, 7, 0, 1, 'dried', ['piece', 5], ['vitA', 'k', 'fe'], ['eyes', 'gut', 'iron'], ['sugar'], '#f29f3d'],
  ['qamaraldin', 'dried', 'Apricot leather (qamar al-din)', [320, 2.5, 0.5, 79, 3, 70], null, 20, 0, 1, 'dried', ['piece', 1], ['vitA', 'k'], ['quick', 'eyes'], ['sugar'], '#f08a24'],
  ['mulberries', 'dried', 'Dried mulberries (toot)', [345, 9.5, 2.5, 72, 12, 56], null, 0.6, 8, 1, 'dried', ['tbsp', 3], ['fe', 'vitC', 'fib'], ['iron', 'immune', 'gut'], ['sugar'], '#d8c7a2'],
  ['prunes', 'dried', 'Prunes (dried anjas)', [240, 2.2, 0.4, 63.9, 7.1, 38.1], null, 9.5, 0, 1, 'dried', ['piece', 4], ['vitK', 'k', 'fib'], ['gut', 'bones'], ['sugar'], '#3a1f2b'],
  ['bananachips', 'dried', 'Banana chips', [519, 2.3, 33.6, 58.4, 7.7, 35.3], null, 2, 0, 1, 'dried', ['handful', 1], ['k', 'mg'], ['energy'], ['sat', 'kcal'], '#f0d27a'],
  // the sweet ones — for gatherings and Eid
  ['mlabbas', 'sweet', 'Sugared almonds (mlabbas)', [460, 8.5, 18, 69, 3.5, 62], null, 4, 0, 1, 'sweet', ['piece', 5], ['vitE', 'mg'], ['energy'], ['sugar', 'allergy', 'kids'], '#f6eaf2'],
  ['chickpeacandy', 'sweet', 'Sugar-coated chickpeas', [400, 8, 3, 86, 6, 66], null, 1.2, 0, 1, 'sweet', ['handful', 0.5], ['fe', 'fol'], ['energy'], ['sugar'], '#f9dfe9'],
  ['chocnuts', 'sweet', 'Chocolate-coated nuts', [540, 10, 36, 47, 4, 40], null, 3, 0, 1, 'sweet', ['piece', 8], ['mg', 'fe'], ['energy'], ['sugar', 'allergy', 'kcal'], '#5a3825'],
  ['simsimiya', 'sweet', 'Sesame bar (simsimiya)', [520, 12, 30, 52, 6, 40], null, 30, 0, 1, 'sweet', ['piece', 1], ['ca', 'fe', 'mg'], ['bones', 'energy'], ['sesame', 'sugar'], '#e2b55e'],
  ['jowziya', 'sweet', 'Walnut brittle (jowziya)', [560, 9, 38, 50, 3, 42], null, 25, 0, 1, 'sweet', ['piece', 1], ['o3', 'cu'], ['brain', 'energy'], ['sugar', 'allergy'], '#b07a3f'],
  ['datestuffed', 'sweet', 'Dates stuffed with almonds', [330, 4.5, 9, 62, 7, 52], null, 12, 0, 1, 'sweet', ['piece', 3], ['k', 'mg', 'fib'], ['quick', 'gut'], ['sugar', 'allergy'], '#6b3a1f'],
]

const roastOf = raw => raw && [Math.round(raw[0] * 1.03), raw[1], Math.round(raw[2] * 1.03 * 10) / 10, raw[3], raw[4], raw[5]]
export const NUTS = ROWS.map(([id, cat, name, raw, roasted, pw, sp, ef, forms, unit, mi, ben, cau, col, hf]) => {
  const F = forms.split(' ')
  return {
    id, cat, name, raw, roasted: roasted || (F.some(f => TOASTED.has(f)) ? roastOf(raw) : raw), pw, sp, ef, forms: F, def: F.includes('roasted') ? 'roasted' : F[0],
    unit: { u: unit[0], a: unit[1] }, mi, ben, col, hf: hf || HANDFUL_G,
    cau: [...new Set([...cau, ...(F.some(f => SALTY.has(f)) ? ['salt'] : []), ...(cat === 'nut' && pw >= 1 ? ['kids'] : [])])],
    shell: ef > 0 && ef < 1,
    look: ['pistachio', 'pistachiolemon', 'peanut', 'sunflower', 'watermelon', 'pumpkin', 'melon'].includes(id),   // drawn in the shell in lists
  }
})
export const NUT_BY_ID = Object.fromEntries(NUTS.map(n => [n.id, n]))
export const nutOf = id => NUT_BY_ID[id] || null

/** The units a nut can be counted in. */
export function unitsFor(n) {
  const u = ['handful', 'g']
  if (n && n.pw > 0) u.push('piece')
  if (n && n.sp > 0) u.push('tbsp')
  return u
}

/** Edible grams for an amount: grams and handfuls lose the shell when weighed in it. */
export function edibleGrams(n, amount, unit = 'g', inShell = false) {
  if (!n) return 0
  const a = Math.max(0, +amount || 0)
  const shell = inShell && n.shell ? n.ef : 1
  if (unit === 'handful') return a * (n.hf || HANDFUL_G) * shell
  if (unit === 'piece') return a * (n.pw || 1)
  if (unit === 'tbsp') return a * (n.sp || 9)
  return a * shell
}

/**
 * The other way round: how much in `unit` gives `g` edible grams — weighed in the shell, a gram
 * or a handful holds less nut (review on PR #13). Not rounded.
 */
export function amountFor(n, g, unit = 'g', inShell = false) {
  if (!n) return 0
  const x = Math.max(0, +g || 0)
  const shell = inShell && n.shell ? n.ef : 1
  if (unit === 'handful') return x / ((n.hf || HANDFUL_G) * shell)
  if (unit === 'piece') return x / (n.pw || 1)
  if (unit === 'tbsp') return x / (n.sp || 9)
  return x / shell
}

const r1 = v => Math.round(v * 10) / 10
/** Nutrition for `g` edible grams in a form: kcal, protein, fat, carbs, fibre, sugar, sodium. */
export function nutNutrition(n, g = HANDFUL_G, form = null) {
  if (!n) return { g: 0, kcal: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0, na: 0 }
  const fm = n.forms.includes(form) ? form : n.def
  const base = TOASTED.has(fm) ? (n.roasted || n.raw) : (n.raw || n.roasted)
  const k = Math.max(0, +g || 0) / 100
  return {
    g: Math.round(Math.max(0, +g || 0)),
    kcal: Math.round(base[0] * k), p: r1(base[1] * k), f: r1(base[2] * k), c: r1(base[3] * k), fib: r1(base[4] * k), sug: r1(base[5] * k),
    na: Math.round((SALTY.has(fm) ? SALT_NA : 5) * k),
  }
}

/** A food-log entry for a portion (kcal and macros for the whole portion; q = 1). */
export function nutEntry(n, { g = HANDFUL_G, form = null, meal = 's', now = Date.now() } = {}) {
  const fm = n.forms.includes(form) ? form : n.def
  const x = nutNutrition(n, g, fm)
  return { id: 'fe' + uid(), f: null, nut: n.id, fm, g: x.g, n: n.name, kcal: x.kcal, p: x.p, c: x.c, fat: x.f, q: 1, m: ['b', 'l', 'd', 's'].includes(meal) ? meal : 's', t: now }
}

const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim()
/** Filter by text (app language and English) and category; `lean` = under 600 kcal per 100 g. */
export function searchNuts({ q = '', cat = null, lean = false, tr = s => s } = {}) {
  const Q = fold(q)
  return NUTS.filter(n => (!cat || n.cat === cat) && (!lean || (n.roasted || n.raw)[0] < 600)
    && (!Q || fold(tr(n.name) + ' ' + n.name).includes(Q)))
}

/** Today's nuts from the food log: grams (nuts, seeds and roasted snacks — the daily handful) and kcal (all of it). */
export function nutDay(entries) {
  const out = { g: 0, kcal: 0, count: 0 }
  for (const e of entries || []) {
    if (!e || !e.nut || !NUT_BY_ID[e.nut]) continue
    if (NUTTY.has(NUT_BY_ID[e.nut].cat)) out.g += (+e.g || 0) * (+e.q || 1)
    out.kcal += Math.round((+e.kcal || 0) * (+e.q || 1)); out.count++
  }
  out.g = Math.round(out.g)
  return out
}

/** The nut of the day (changes daily, same for everyone) — a real nut or seed, not a sweet. */
export function nutOfDay(iso) {
  const n = String(iso || '').split('-').reduce((a, x) => a * 31 + (+x || 0), 7)
  const pool = NUTS.filter(x => NUTTY.has(x.cat))
  return pool[Math.abs(n) % pool.length]
}
/** The usual portion in grams: a handful of nuts and seeds, the default amount of dried fruit and sweets. */
export const usualGrams = n => (!n ? 0 : NUTTY.has(n.cat) ? n.hf : edibleGrams(n, n.unit.a, n.unit.u))
