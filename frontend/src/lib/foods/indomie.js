// 13.0 — Indomie: every variant is worked out from its parts — the noodle block, the sachets,
// the way it is cooked and what goes in — so its calories always match its protein, carbs and
// fat (4 / 4 / 9 kcal a gram), and the builder (views/FoodDatabase.jsx) can make any mix.
//
// Pack values follow the printed labels (UK / Gulf packs: chicken 70 g ≈ 315 kcal, Mi Goreng
// 80 g ≈ 380 kcal, ~3 g of salt a pack). What cooking does:
//   raw     the block eaten dry (crushed), as it is
//   boiled  boiled and drained — about 10 % of the block's fat and 40 % of its salt stay in the water
//   soup    cooked with its water and all of it eaten — nothing lost
//   fried   boiled, drained, then fried in a tablespoon of oil (13.5 g)
//   creamy  boiled, drained, finished with 50 g of cooking cream
//   cup     a cup pack with hot water (like soup)

/** A component: grams, protein, carbs, fat, sodium (mg), sugars. */
const part = (g, p, c, f, na = 0, sug = 0) => ({ g, p, c, f, na, sug })

const CHICKEN = {
  block: part(62, 6.0, 41.5, 9.5, 380, 1.5),
  powder: part(5.5, 0.8, 3.0, 0.3, 820, 1.5),
  oil: part(2.5, 0, 0, 2.5),
  sauce: null,
}
const GORENG = {
  block: part(67, 7.0, 44.5, 12.0, 330, 1.0),
  powder: part(4, 0.4, 2.0, 0.1, 600, 0.8),
  oil: part(4, 0, 0, 4.0),
  sauce: part(5, 0.2, 3.5, 0.4, 200, 3.0),   // sweet soy sauce, chilli sauce, fried onion
}
const scaled = (base, k, tweak = {}) => Object.fromEntries(Object.entries(base).map(([key, v]) => {
  if (!v) return [key, null]
  const o = Object.fromEntries(Object.entries(v).map(([n, x]) => [n, Math.round(x * k * 10) / 10]))
  return [key, { ...o, ...(tweak[key] || {}) }]
}))

/** The packs. `soup`: made as a soup by default; `cup`: a cup with hot water. */
export const PACKS = [
  { id: 'goreng', name: 'Indomie', full: 'Indomie Mi Goreng (fried noodles)', g: 80, ...GORENG },
  { id: 'chicken', name: 'Indomie chicken', full: 'Indomie chicken flavour', g: 70, soup: true, ...CHICKEN },
  { id: 'hot', name: 'Indomie hot & spicy', full: 'Indomie hot & spicy fried noodles', g: 80, ...scaled(GORENG, 1, { powder: { na: 640 }, sauce: { sug: 2.2, na: 260 } }) },
  { id: 'curry', name: 'Indomie curry', full: 'Indomie curry flavour', g: 75, soup: true, ...scaled(CHICKEN, 75 / 70, { powder: { na: 900 } }) },
  { id: 'veg', name: 'Indomie vegetable', full: 'Indomie vegetable flavour', g: 75, soup: true, ...scaled(CHICKEN, 75 / 70, { powder: { na: 880 } }) },
  { id: 'jumbo', name: 'Indomie Jumbo', full: 'Indomie Mi Goreng Jumbo', g: 127, ...scaled(GORENG, 127 / 80) },
  { id: 'cup', name: 'Indomie cup', full: 'Indomie cup noodles', g: 60, cup: true, ...scaled(CHICKEN, 60 / 70) },
]
export const PACK_BY_ID = Object.fromEntries(PACKS.map(p => [p.id, p]))

/** How it is made. */
export const PREPS = [
  { id: 'raw', name: 'uncooked', label: 'Uncooked (dry)', icon: 'sparkles' },
  { id: 'boiled', name: 'boiled', label: 'Boiled & drained', icon: 'drop' },
  { id: 'soup', name: 'soup', label: 'As a soup', icon: 'cup' },
  { id: 'fried', name: 'fried', label: 'Fried in oil', icon: 'flame' },
  { id: 'creamy', name: 'with cream', label: 'With cooking cream', icon: 'heart' },
]
export const PREP_BY_ID = Object.fromEntries(PREPS.map(p => [p.id, p]))
const FRY_OIL = part(13.5, 0, 0, 13.5)
const CREAM = part(50, 1.2, 1.7, 12.5, 20, 1.5)

/** What can go in — `max` of each; kcal are what one adds. */
export const ADDONS = [
  { id: 'egg', name: 'egg', label: 'Egg', icon: 'egg', max: 3, ...part(50, 6.3, 0.4, 4.8, 62, 0.2) },
  { id: 'friedegg', name: 'fried egg', label: 'Fried egg', icon: 'egg', max: 3, ...part(46, 6.3, 0.4, 6.8, 95, 0.2) },
  { id: 'cheese', name: 'cheese', label: 'Cheese slice', icon: 'square', max: 3, ...part(20, 3.6, 1.4, 6.6, 300, 1.0) },
  { id: 'mayo', name: 'mayonnaise', label: 'Mayonnaise (1 tbsp)', icon: 'drop', max: 3, ...part(14, 0.1, 0.4, 10, 90, 0.3) },
  { id: 'ketchup', name: 'ketchup', label: 'Ketchup (1 tbsp)', icon: 'drop', max: 3, ...part(17, 0.2, 4.5, 0, 150, 3.8) },
  { id: 'hot', name: 'hot sauce', label: 'Hot sauce (1 tbsp)', icon: 'flame', max: 3, ...part(15, 0.3, 3.0, 0.1, 330, 2.4) },
  { id: 'tuna', name: 'tuna', label: 'Tuna (80 g, drained)', icon: 'fish', max: 2, ...part(80, 20, 0, 4.5, 280) },
  { id: 'chicken', name: 'chicken', label: 'Chicken (100 g)', icon: 'dumbbell', max: 2, ...part(100, 31, 0, 4.5, 75) },
  { id: 'veg', name: 'vegetables', label: 'Vegetables (80 g)', icon: 'leafy', max: 2, ...part(80, 1.2, 6.0, 0.2, 20, 3.0) },
  { id: 'sausage', name: 'sausage', label: 'Sausage (1)', icon: 'flame', max: 3, ...part(45, 5.5, 2.5, 8.5, 450, 0.8) },
]
export const ADDON_BY_ID = Object.fromEntries(ADDONS.map(a => [a.id, a]))
export const ADDON_KCAL = Object.fromEntries(ADDONS.map(a => [a.id, Math.round(4 * a.p + 4 * a.c + 9 * a.f)]))

const r1 = v => Math.round(v * 10) / 10

/** Normalises a builder config: { pack, prep, season: 0 | 0.5 | 1, sauce: bool, add: { id: n } }. */
export function normIndomie(cfg = {}) {
  const pack = PACK_BY_ID[cfg.pack] || PACKS[0]
  let prep = PREP_BY_ID[cfg.prep] ? cfg.prep : pack.soup || pack.cup ? 'soup' : 'boiled'
  if (pack.cup && prep !== 'raw') prep = 'soup'      // a cup is made with hot water — or eaten dry
  const season = [0, 0.5, 1].includes(cfg.season) ? cfg.season : 1
  const sauce = !!pack.sauce && (cfg.sauce === undefined ? season > 0 : !!cfg.sauce)
  const add = {}
  for (const a of ADDONS) {
    const n = Math.round(Number((cfg.add || {})[a.id]) || 0)
    if (n > 0) add[a.id] = Math.min(a.max, n)
  }
  return { pack: pack.id, prep, season, sauce, add }
}

/** Calories, macros, sodium and sugars of a builder config — all from its parts. */
export function indomieNutrition(cfg) {
  const c = normIndomie(cfg)
  const pack = PACK_BY_ID[c.pack]
  const tot = { g: 0, p: 0, c: 0, f: 0, na: 0, sug: 0 }
  const put = (x, k = 1, fatK = 1, naK = 1) => {
    if (!x || !k) return
    tot.g += x.g * k; tot.p += x.p * k; tot.c += x.c * k; tot.f += x.f * k * fatK; tot.na += x.na * k * naK; tot.sug += x.sug * k
  }
  const drained = c.prep === 'boiled' || c.prep === 'fried' || c.prep === 'creamy'
  put(pack.block, 1, drained ? 0.9 : 1, drained ? 0.6 : 1)
  put(pack.powder, c.season)
  put(pack.oil, c.season)
  if (c.sauce) put(pack.sauce)
  if (c.prep === 'fried') put(FRY_OIL)
  if (c.prep === 'creamy') put(CREAM)
  for (const [id, n] of Object.entries(c.add)) put(ADDON_BY_ID[id], n)
  const p = r1(tot.p), cc = r1(tot.c), f = r1(tot.f)
  return { kcal: Math.round(4 * p + 4 * cc + 9 * f), p, c: cc, f, na: Math.round(tot.na), sug: r1(tot.sug), g: Math.round(tot.g) }
}

const fmt = (s, ...a) => String(s).replace(/\{(\d)\}/g, (_, i) => a[+i])

/**
 * "Indomie (boiled) + seasoning + egg + cheese" — built from parts, each one a t() key, so any
 * mix the builder makes reads well in Arabic too; `tr` is t (or nothing: the English source).
 */
export function indomieLabel(cfg, tr = fmt) {
  const c = normIndomie(cfg)
  const pack = PACK_BY_ID[c.pack]
  const prep = pack.cup && c.prep === 'soup' ? 'with hot water' : PREP_BY_ID[c.prep].name
  let s = tr(pack.name) + ' ' + tr('(' + prep + ')')
  if (c.season === 1) s += ' ' + tr('+ seasoning')
  else if (c.season === 0.5) s += ' ' + tr('+ half seasoning')
  if (c.sauce) s += ' ' + tr('+ sauce')
  for (const a of ADDONS) {
    const n = c.add[a.id]
    if (n) s += ' ' + (n === 1 ? tr('+ ' + a.name) : tr('+ {0} × ' + a.name, n))
  }
  return s
}
/** The English name (the database row's name). */
export const indomieName = cfg => indomieLabel(cfg)
/** One string per mix — finds the ready-made variant a builder mix matches. */
export function indomieKey(cfg) {
  const c = normIndomie(cfg)
  return [c.pack, c.prep, c.season, c.sauce ? 1 : 0, ADDONS.map(a => c.add[a.id] || 0).join('')].join('|')
}
/** Every t() key the names are made of (the Arabic pack must have them all). */
export function indomieParts() {
  const keys = new Set(PACKS.map(p => p.name))
  for (const p of PREPS) keys.add('(' + p.name + ')')
  keys.add('(with hot water)')
  for (const k of ['+ seasoning', '+ half seasoning', '+ sauce']) keys.add(k)
  for (const a of ADDONS) { keys.add('+ ' + a.name); keys.add('+ {0} × ' + a.name) }
  return [...keys]
}

// The ready-made variants that sit in the food database (each one opens in the builder too).
const P = (id, pack, prep, season, extra = {}) => ({ id: 'indo-' + id, cfg: normIndomie({ pack, prep, season, ...extra }) })
export const INDOMIE_PRESETS = [
  // uncooked — the dry block, crushed
  P('raw', 'goreng', 'raw', 0),
  P('raw-s', 'goreng', 'raw', 1, { sauce: false }),
  P('raw-ss', 'goreng', 'raw', 1, { sauce: true }),
  P('raw-mayo', 'goreng', 'raw', 1, { sauce: false, add: { mayo: 1 } }),
  P('raw-cheese', 'goreng', 'raw', 1, { sauce: false, add: { cheese: 1 } }),
  // boiled & drained
  P('boil', 'goreng', 'boiled', 0),
  P('boil-half', 'goreng', 'boiled', 0.5),
  P('boil-s', 'goreng', 'boiled', 1),
  P('boil-egg', 'goreng', 'boiled', 1, { add: { egg: 1 } }),
  P('boil-2egg', 'goreng', 'boiled', 1, { add: { egg: 2 } }),
  P('boil-cheese', 'goreng', 'boiled', 1, { add: { cheese: 1 } }),
  P('boil-egg-cheese', 'goreng', 'boiled', 1, { add: { egg: 1, cheese: 1 } }),
  P('boil-tuna', 'goreng', 'boiled', 1, { add: { tuna: 1 } }),
  P('boil-chicken', 'goreng', 'boiled', 1, { add: { chicken: 1 } }),
  P('boil-veg', 'goreng', 'boiled', 1, { add: { veg: 1 } }),
  P('boil-egg-veg', 'goreng', 'boiled', 1, { add: { egg: 1, veg: 1 } }),
  P('boil-mayo', 'goreng', 'boiled', 1, { add: { mayo: 1 } }),
  P('boil-ketchup', 'goreng', 'boiled', 1, { add: { ketchup: 1 } }),
  P('boil-hot', 'goreng', 'boiled', 1, { add: { hot: 1 } }),
  P('boil-mayo-ketchup', 'goreng', 'boiled', 1, { add: { mayo: 1, ketchup: 1 } }),
  P('boil-sausage', 'goreng', 'boiled', 1, { add: { sausage: 1 } }),
  // fried in oil
  P('fry', 'goreng', 'fried', 1),
  P('fry-egg', 'goreng', 'fried', 1, { add: { friedegg: 1 } }),
  P('fry-cheese', 'goreng', 'fried', 1, { add: { cheese: 1 } }),
  P('fry-egg-cheese', 'goreng', 'fried', 1, { add: { friedegg: 1, cheese: 1 } }),
  P('fry-chicken-veg', 'goreng', 'fried', 1, { add: { chicken: 1, veg: 1 } }),
  P('fry-sausage-egg', 'goreng', 'fried', 1, { add: { sausage: 1, friedegg: 1 } }),
  // with cooking cream
  P('cream', 'goreng', 'creamy', 1),
  P('cream-cheese', 'goreng', 'creamy', 1, { add: { cheese: 1 } }),
  P('cream-chicken', 'goreng', 'creamy', 1, { add: { chicken: 1 } }),
  // the chicken pack as a soup
  P('soup', 'chicken', 'soup', 1),
  P('soup-half', 'chicken', 'soup', 0.5),
  P('soup-egg', 'chicken', 'soup', 1, { add: { egg: 1 } }),
  P('soup-veg', 'chicken', 'soup', 1, { add: { veg: 1 } }),
  P('soup-chicken-veg', 'chicken', 'soup', 1, { add: { chicken: 1, veg: 1 } }),
  P('chicken-boil', 'chicken', 'boiled', 1),
  // the other packs
  P('curry', 'curry', 'soup', 1),
  P('vegpack', 'veg', 'soup', 1),
  P('hot', 'hot', 'boiled', 1),
  P('jumbo', 'jumbo', 'boiled', 1),
  P('cup', 'cup', 'soup', 1),
]

/** The presets as food-database rows (category 'noodles'). */
export const INDOMIE_FOODS = INDOMIE_PRESETS.map(({ id, cfg }) => {
  const n = indomieNutrition(cfg)
  return { id, cat: 'noodles', name: indomieName(cfg), kcal: n.kcal, p: n.p, c: n.c, f: n.f, unit: 'pack', g: n.g, na: n.na, sug: n.sug, prep: cfg.prep, indomie: cfg }
})
