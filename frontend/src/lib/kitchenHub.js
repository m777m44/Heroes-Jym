// 14.0 — the Kitchen (المطبخ): every food, dish, recipe, drink, soft drink and nut of the app in
// one place, sorted into sections — Food (my cooking · cooking · ready foods · fresh food & basics)
// and Drinks — each item with its real photo (lib/photos) and its nutrition per usual serving.
//
// An item: { uid 'F:dolma', kind, id, name, kcal, p, c, f, sug?, na?, fib?, ph (photo key) … }
//   kind  F food (lib/foodDb.js) · R recipe (lib/kitchen.js) · D drink recipe (lib/drinks.js) ·
//         S soft drink (lib/sodas.js) · N nut, seed or dried fruit (lib/nuts.js)
// Each opens its own sheet (the food card, the recipe, the drink, the soft drink, the nut) — the
// views know which; this file is plain data and stays testable.
//
// State (all optional): S.kitchenFav = [uids] (soft drinks, nuts, recipes — foods keep S.foodFav,
// drinks S.drinkFavs), S.kitchenSeen = [uids] (recently opened, newest first).
import { FOODS, MARKET_AISLES } from './foodDb.js'
import { STREET_IDS } from './foods/street.js'
import { DRINKS, drinkNutrition, DING_BY_ID } from './drinks.js'
import { SODAS, sodaNutrition } from './sodas.js'
import { NUTS, nutNutrition, usualGrams } from './nuts.js'
import { RECIPES, recipeNutrition } from './kitchen.js'
import { photoKey } from './photos/index.js'
import { normalize, hasWord } from './food.js'
import { isFit } from './foodDetails.js'

export { isFit }

// ---- which foods are drinks, and what kind ------------------------------------------------------
const HOT_F = new Set(['teasugar', 'tea', 'arabiccoffee', 'coffeemilk', 'cappuccino', 'hotchocolate', 'noomibasra', 'sahlab', 'karkade', 'greentea',
  'nescafe3in1', 'latte', 'mocha', 'caramelmacchiato', 'karak', 'espresso', 'americano', 'flatwhite'])
const MILK_F = new Set(['milk', 'lowfatmilk', 'laban', 'shinena', 'bananashake', 'datemilk', 'proteinshake', 'chocmilk', 'strawberrymilk', 'bananamilk',
  'milkshakechoc', 'milkshakevanilla', 'milkshakestraw', 'falooda', 'frappuccino', 'icedlatte', 'spanishlatte', 'frappe', 'bubbletea', 'avocadojuice'])
const SOFT_F = new Set(['soda', 'dietsoda'])
const ENERGY_F = new Set(['energydrink'])
/** A food that is drunk (the drinks shelf, and the milks, coffees and shakes on other shelves). */
export const isDrinkFood = f => !!f && (f.cat === 'drinks' || HOT_F.has(f.id) || MILK_F.has(f.id))

const BREAKFAST_F = new Set(['eggtomato', 'rashidibis', 'shakshuka', 'ijja', 'eggpotato', 'baqilla', 'geymarhoney', 'makhlama', 'iraqibreakfast', 'eggsamoon',
  'eggkhubz', 'eggdates', 'eggbasturma', 'kahi', 'kahisyrup', 'egg', 'friedegg', 'omelette', 'scrambled', 'eggwhites', 'cheeseomelette', 'oats', 'cornflakes',
  'granola', 'pancakes', 'croissant', 'labneh', 'geymar', 'zaatar', 'cheesemanakish', 'kaak', 'foul', 'frenchtoast', 'avocadotoast', 'proteinpancakes',
  'parfait', 'overnightoats', 'smoothiebowl', 'acaibowl', 'eggmuffins', 'simit', 'halawakhubz', 'laffatgeymar', 'cheesesandwich', 'labnehsandwich',
  'jibinzaitoon', 'dibisgeymar', 'khubzdihin', 'boorak', 'sambusacheese', 'cheesetriangles', 'creamcheesecubes'])
const DATES = new Set(['F:dates', 'F:barhi', 'F:zahdi', 'F:khastawi', 'F:medjool', 'F:datesstuffed', 'F:chocdates', 'F:datepaste', 'F:halawattamur',
  'F:eggdates', 'N:zahdi', 'N:khastawi', 'N:barhi', 'N:medjool', 'N:sukkari', 'N:ajwa', 'N:sayer', 'N:halawi', 'N:khadrawi', 'N:deglet', 'N:datepaste',
  'N:datestuffed', 'N:chocdates', 'N:datescoconut', 'N:datenutballs'])

// the nuts and seeds on the food database's legumes shelf
const NUT_F = new Set(['almonds', 'walnuts', 'pistachios', 'seeds', 'peanutbutter', 'tahini', 'cashews', 'mixednuts', 'hazelnuts', 'pumpkinseeds', 'watermelonseeds', 'peanuts'])


// ---- the items ----------------------------------------------------------------------------------
function milkyDrink(d) { return (d.ing || []).some(r => !r.opt && (r.id === 'whey' || (DING_BY_ID[r.id] && DING_BY_ID[r.id].cat === 'dairy'))) }

function build() {
  const out = []
  for (const f of FOODS) {
    out.push({
      uid: 'F:' + f.id, kind: 'F', id: f.id, name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, sug: f.sug, na: f.na, fib: f.fib,
      cat: f.cat, mk: f.mk || '', iq: !!f.iraqi, fit: isFit(f), drink: isDrinkFood(f), unit: f.unit, g: f.g, ml: !!f.ml, ph: photoKey('F', f.id),
      ...(f.built || f.indomie ? { bt: true } : null),   // 14.0: opens in a builder (the meal builder or the Indomie one)
    })
  }
  for (const r of RECIPES) {
    const n = recipeNutrition(r)
    out.push({ uid: 'R:' + r.id, kind: 'R', id: r.id, name: r.name, kcal: n.kcal, p: n.p, c: n.c, f: n.f, meals: r.meals, min: r.min, iq: r.iq, fit: r.fit || isFit({ ...n, cat: 'dishes' }), ph: photoKey('R', r.id) })
  }
  for (const d of DRINKS) {
    const n = drinkNutrition(d)
    out.push({ uid: 'D:' + d.id, kind: 'D', id: d.id, name: d.name, kcal: n.kcal, p: n.p, c: n.c, f: n.f, sug: n.s, hot: d.t === 'h', milky: milkyDrink(d), cats: d.cats, min: d.min, iq: d.cats.includes('iraqi'), ph: photoKey('D', d.id) })
  }
  for (const s of SODAS) {
    const n = sodaNutrition(s, s.def.ml)
    out.push({ uid: 'S:' + s.id, kind: 'S', id: s.id, name: s.name, kcal: n.kcal, p: n.p, c: n.c, f: n.f, sug: n.sugar, na: n.sodium, caf: n.caffeine, ml: s.def.ml, cat: s.cat, zero: s.zero, ph: photoKey('S', s.id) })
  }
  for (const nt of NUTS) {
    const g = usualGrams(nt)
    const n = nutNutrition(nt, g, nt.def)
    out.push({ uid: 'N:' + nt.id, kind: 'N', id: nt.id, name: nt.name, kcal: n.kcal, p: n.p, c: n.c, f: n.f, sug: n.sug, fib: n.fib, na: n.na, g, cat: nt.cat, ph: photoKey('N', nt.id) })
  }
  return out
}
let ALL = null, BY_UID = null
/** Every item of the kitchen (built on first use). */
export function kitchenItems() {
  if (!ALL) { ALL = build(); BY_UID = new Map(ALL.map(x => [x.uid, x])) }
  return ALL
}
export const itemOf = uid => (kitchenItems(), BY_UID.get(uid) || null)

// ---- the sections -------------------------------------------------------------------------------
const F = (x, ...cats) => x.kind === 'F' && !x.drink && cats.includes(x.cat)
/**
 * group food | drinks; part (the heading it sits under): cook · ready · fresh · drinks.
 * ph: the photo of its card. test(item): what belongs in it.
 */
export const SECTIONS = [
  { key: 'recipes', group: 'food', part: 'cook', name: 'Recipes, step by step', icon: 'book', color: 'var(--orange)', ph: 'dolma', test: x => x.kind === 'R' },
  { key: 'iraqi', group: 'food', part: 'cook', name: 'Iraqi kitchen', icon: 'palm', color: 'var(--green)', ph: 'masgouf', test: x => x.iq && (x.kind === 'R' || (x.kind === 'F' && !x.drink)) },
  { key: 'dishes', group: 'food', part: 'cook', name: 'Home cooking', icon: 'fork', color: 'var(--orange)', ph: 'maqluba', test: x => F(x, 'dishes') },
  { key: 'breakfast', group: 'food', part: 'cook', name: 'Breakfast', icon: 'egg', color: 'var(--yellow)', ph: 'shakshuka', test: x => (x.kind === 'R' && x.meals.includes('b')) || (x.kind === 'F' && BREAKFAST_F.has(x.id)) },
  { key: 'fit', group: 'food', part: 'cook', name: 'Gym & healthy meals', icon: 'dumbbell', color: 'var(--green)', ph: 'chickenveg', test: x => (x.kind === 'R' || (x.kind === 'F' && !x.drink)) && x.fit },
  // 14.0: street food — burgers, shawarma, falafel, kebab and tikka sandwiches, Iraqi laffat, pizza and
  // manakish, grills and street snacks; most of it opens in the meal builder (lib/foods/street.js)
  { key: 'street', group: 'food', part: 'ready', name: 'Street food', icon: 'bolt', color: 'var(--purple)', ph: 'shawarma', test: x => F(x, 'fast') || (x.kind === 'F' && !x.drink && STREET_IDS.has(x.id)) },
  { key: 'noodles', group: 'food', part: 'ready', name: 'Indomie & noodles', icon: 'noodles', color: 'var(--yellow)', ph: 'shinramyun', test: x => F(x, 'noodles') },
  { key: 'ready', group: 'food', part: 'ready', name: 'From the shops', icon: 'basket', color: 'var(--teal)', ph: 'chips', test: x => x.kind === 'F' && !x.drink && !!x.mk },
  { key: 'canned', group: 'food', part: 'ready', name: 'Canned food', icon: 'can', color: 'var(--teal)', ph: 'tuna', test: x => F(x, 'canned') },
  { key: 'cakes', group: 'food', part: 'ready', name: 'Cakes & pastries', icon: 'cake', color: 'var(--brown, #a2845e)', ph: 'cake', test: x => F(x, 'cakes') },
  { key: 'snacks', group: 'food', part: 'ready', name: 'Chocolate, biscuits & chips', icon: 'chips', color: 'var(--pink)', ph: 'snickers', test: x => F(x, 'snacks') },
  { key: 'sweets', group: 'food', part: 'ready', name: 'Sweets & desserts', icon: 'candy', color: 'var(--indigo)', ph: 'baklava', test: x => F(x, 'sweets') },
  { key: 'fruit', group: 'food', part: 'fresh', name: 'Fruit', icon: 'apple', color: 'var(--pink)', ph: 'strawberries', test: x => F(x, 'fruit') && !DATES.has(x.uid) },
  { key: 'dates', group: 'food', part: 'fresh', name: 'Dates', icon: 'palm', color: 'var(--brown, #a2845e)', ph: 'medjool', test: x => DATES.has(x.uid) },
  { key: 'veg', group: 'food', part: 'fresh', name: 'Vegetables & salads', icon: 'leafy', color: 'var(--green)', ph: 'salad', test: x => F(x, 'veg') },
  { key: 'meat', group: 'food', part: 'fresh', name: 'Meat, chicken & fish', icon: 'fish', color: 'var(--red)', ph: 'kebab', test: x => F(x, 'meat') },
  { key: 'dairy', group: 'food', part: 'fresh', name: 'Eggs & dairy', icon: 'milk', color: 'var(--teal)', ph: 'cheddar', test: x => F(x, 'dairy') },
  { key: 'grains', group: 'food', part: 'fresh', name: 'Bread, rice & grains', icon: 'bread', color: 'var(--yellow)', ph: 'croissant', test: x => F(x, 'grains') },
  { key: 'legumes', group: 'food', part: 'fresh', name: 'Beans & lentils', icon: 'seed', color: 'var(--brown, #a2845e)', ph: 'lentils', test: x => F(x, 'legumes') && !NUT_F.has(x.id) },
  { key: 'nuts', group: 'food', part: 'fresh', name: 'Nuts, seeds & dried fruit', icon: 'nut', color: 'var(--brown, #a2845e)', ph: 'mixednuts', test: x => (x.kind === 'N' && !DATES.has(x.uid)) || (x.kind === 'F' && NUT_F.has(x.id)) },
  { key: 'hot', group: 'drinks', part: 'drinks', name: 'Hot drinks', icon: 'coffee', color: 'var(--orange)', ph: 'iraqitea', test: x => (x.kind === 'D' && x.hot) || (x.kind === 'F' && HOT_F.has(x.id)) },
  { key: 'cold', group: 'drinks', part: 'drinks', name: 'Juices & coolers', icon: 'blender', color: 'var(--pink)', ph: 'orangejuice', test: x => (x.kind === 'D' && !x.hot && !x.milky) || (x.kind === 'F' && x.drink && !HOT_F.has(x.id) && !MILK_F.has(x.id) && !SOFT_F.has(x.id) && !ENERGY_F.has(x.id)) },
  { key: 'milkdrinks', group: 'drinks', part: 'drinks', name: 'Milk drinks & shakes', icon: 'milk', color: 'var(--teal)', ph: 'bananashake', test: x => (x.kind === 'D' && !x.hot && x.milky) || (x.kind === 'F' && MILK_F.has(x.id)) },
  { key: 'soft', group: 'drinks', part: 'drinks', name: 'Soft drinks & iced tea', icon: 'bubbles', color: 'var(--red)', ph: 'pepsi', test: x => (x.kind === 'S' && !['energy', 'sport'].includes(x.cat)) || (x.kind === 'F' && SOFT_F.has(x.id)) },
  { key: 'energy', group: 'drinks', part: 'drinks', name: 'Energy & sports drinks', icon: 'bolt', color: 'var(--yellow)', ph: 'monster', test: x => (x.kind === 'S' && ['energy', 'sport'].includes(x.cat)) || (x.kind === 'F' && ENERGY_F.has(x.id)) },
  { key: 'iraqidrinks', group: 'drinks', part: 'drinks', name: 'Iraqi drinks', icon: 'palm', color: 'var(--green)', ph: 'arabiccoffee', test: x => x.kind === 'D' && x.iq },
]
export const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map(s => [s.key, s]))
/**
 * 14.0 — the six big doors at the top of the Food tab: street food, making Indomie, canned food &
 * the shops, drinks (the Drinks tab), sweets and Iraqi food. `n` counts what is behind each one.
 */
export const FEATURED = [
  { key: 'street', name: 'Street food', icon: 'bolt', color: 'var(--orange)', ph: 'shawarma', to: '/kitchen/s/street', secs: ['street'] },
  { key: 'indomie', name: 'Make your Indomie', icon: 'noodles', color: 'var(--red)', ph: 'migoreng', to: '/kitchen/s/noodles', secs: ['noodles'] },
  { key: 'shops', name: 'Canned food & shops', icon: 'can', color: 'var(--green)', ph: 'tuna', to: '/kitchen/s/ready', secs: ['ready', 'canned'] },
  { key: 'drinks', name: 'Drinks', icon: 'coffee', color: 'var(--blue)', ph: 'orangejuice', tab: 'drinks', secs: ['hot', 'cold', 'milkdrinks', 'soft', 'energy'] },
  { key: 'sweets', name: 'Sweets', icon: 'cake', color: 'var(--pink)', ph: 'baklava', to: '/kitchen/s/sweets', secs: ['sweets', 'cakes'] },
  { key: 'iraqi', name: 'Iraqi food', icon: 'palm', color: 'var(--purple)', ph: 'masgouf', to: '/kitchen/s/iraqi', secs: ['iraqi'] },
]
/** How many different items are behind a featured door. */
export function featuredCount(f) {
  if (f.key === 'indomie') return kitchenItems().filter(x => x.kind === 'F' && x.id.startsWith('indo-')).length
  const tests = f.secs.map(k => SECTION_BY_KEY[k].test)
  let n = 0
  for (const x of kitchenItems()) if (tests.some(t => t(x))) n++
  return n
}

/** The headings of the Food tab, in order. */
export const FOOD_PARTS = [
  { key: 'cook', name: 'Cooking', icon: 'flame' },
  { key: 'ready', name: 'Ready foods', icon: 'basket' },
  { key: 'fresh', name: 'Fresh food & basics', icon: 'leafy' },
]

/** The items of a section (the market aisle when `aisle` is given). */
export function sectionItems(key, aisle = null) {
  const s = SECTION_BY_KEY[key]
  if (!s) return []
  const list = kitchenItems().filter(s.test)
  return aisle ? list.filter(x => x.mk === aisle) : list
}
let counts = null
/** How many items each section has. */
export function sectionCounts() {
  if (!counts) counts = Object.fromEntries(SECTIONS.map(s => [s.key, kitchenItems().filter(s.test).length]))
  return counts
}
export { MARKET_AISLES }

// ---- filters & sorting --------------------------------------------------------------------------
/** Filter chips: what each one keeps. */
export const FILTERS = [
  { key: 'iraqi', name: 'Iraqi', icon: 'palm', test: x => !!x.iq },
  { key: 'protein', name: 'High protein', icon: 'dumbbell', test: x => x.p >= 20 || (x.kcal > 0 && x.p * 4 / x.kcal >= 0.3) },
  { key: 'light', name: 'Low calorie', icon: 'leafy', test: x => x.kcal <= 250 },
  { key: 'quick', name: 'Quick', icon: 'timer', test: x => x.min != null && x.min <= 20 },
  { key: 'nosugar', name: 'Low sugar', icon: 'candy', test: x => x.sug != null && x.sug <= 5 },
  { key: 'photo', name: 'With photo', icon: 'image', test: x => !!x.ph },
]
export const SORTS = [
  { key: 'usual', name: 'Usual' },
  { key: 'kcal', name: 'Fewest kcal' },
  { key: 'protein', name: 'Most protein' },
  { key: 'az', name: 'A–Z' },
]
/** Filters (keys) that would leave anything in `list` — the chips worth showing. */
export const usefulFilters = list => FILTERS.filter(fl => { let n = 0; for (const x of list) if (fl.test(x)) n++; return n > 0 && n < list.length })

/**
 * Search (translated name, English name, id — Arabic spellings are normalised and synonyms
 * count), filter and sort a list of items. `tr` translates a name (t() in the app).
 */
export function findItems(list, { q = '', filters = [], sort = 'usual', tr = x => x } = {}) {
  let out = list
  for (const k of filters) { const fl = FILTERS.find(x => x.key === k); if (fl) out = out.filter(fl.test) }
  const nq = normalize(q)
  if (nq) {
    const words = nq.split(' ')
    const hits = []
    for (const x of out) {
      const local = normalize(tr(x.name)), en = normalize(x.name)
      const hay = local + ' ' + en + ' ' + x.id
      if (!words.every(w => hasWord(hay, w))) continue
      hits.push([local.startsWith(nq) || en.startsWith(nq) ? 0 : local.includes(' ' + nq) || en.includes(' ' + nq) ? 1 : 2, x])
    }
    out = hits.sort((a, b) => a[0] - b[0]).map(h => h[1])
  }
  if (sort === 'kcal') out = [...out].sort((a, b) => a.kcal - b.kcal)
  else if (sort === 'protein') out = [...out].sort((a, b) => b.p - a.p)
  else if (sort === 'az') {
    const coll = new Intl.Collator(undefined, { sensitivity: 'base' })
    out = [...out].sort((a, b) => coll.compare(tr(a.name), tr(b.name)))
  }
  return out
}

// ---- the dish of the day, favourites, recently opened ----------------------------------------
/** A dish (with a photo) for the day — the same all day, a new one tomorrow. */
const DISHES = () => kitchenItems().filter(x => x.ph && !x.fit && ((x.kind === 'R' && /[ld]/.test(x.meals)) || (x.kind === 'F' && !x.drink && (x.cat === 'dishes' || (x.iq && ['grains', 'meat', 'fast', 'sweets'].includes(x.cat))))))
export function dishOfDay(iso) {
  const list = DISHES()
  let h = 0
  for (const ch of String(iso)) h = (h * 33 + ch.charCodeAt(0)) >>> 0
  return list[h % list.length]
}
/** A few dishes for the hero's slideshow — the dish of the day first. */
export function heroDishes(iso, n = 5) {
  const list = DISHES()
  const first = dishOfDay(iso)
  const out = [first]
  let h = 7
  for (const ch of String(iso)) h = (h * 131 + ch.charCodeAt(0)) >>> 0
  for (let i = 1; out.length < n && i < list.length * 2; i++) {
    const x = list[(h + i * 37) % list.length]
    if (!out.some(y => y.ph === x.ph)) out.push(x)
  }
  return out
}

export function isFav(S, x) {
  if (!x) return false
  if (x.kind === 'F') return ((S && S.foodFav) || []).includes(x.id)
  if (x.kind === 'D') return ((S && S.drinkFavs) || []).includes(x.id)
  return ((S && S.kitchenFav) || []).includes(x.uid)
}
/** Toggle a favourite (inside update(s => …)); returns whether it is one now. */
export function toggleItemFav(s, x) {
  const flip = (arr, v) => (arr.includes(v) ? arr.filter(y => y !== v) : [...arr, v])
  if (x.kind === 'F') { s.foodFav = flip(s.foodFav || [], x.id); return s.foodFav.includes(x.id) }
  if (x.kind === 'D') { s.drinkFavs = flip(s.drinkFavs || [], x.id); return s.drinkFavs.includes(x.id) }
  s.kitchenFav = flip(s.kitchenFav || [], x.uid)
  return s.kitchenFav.includes(x.uid)
}
/** Every favourite item, foods and drinks. */
export function favItems(S) {
  return kitchenItems().filter(x => isFav(S, x))
}

export const SEEN_MAX = 24
/** Remember an opened item (inside update(s => …)). */
export function noteSeen(s, uid) {
  s.kitchenSeen = [uid, ...(s.kitchenSeen || []).filter(u => u !== uid)].slice(0, SEEN_MAX)
}
/** What you ate lately (from the food log) and opened lately, newest first, as items. */
export function recentItems(S, n = 12) {
  const out = [], seen = new Set()
  const push = uid => { if (seen.has(uid)) return; const x = itemOf(uid); if (x) { seen.add(uid); out.push(x) } }
  const food = (S && S.food) || {}
  const isos = Object.keys(food).sort().reverse().slice(0, 21)
  for (const iso of isos) {
    for (const e of [...(food[iso] || [])].sort((a, b) => (b.t || 0) - (a.t || 0))) {
      if (!e) continue
      if (e.f) push('F:' + e.f); else if (e.r) push('R:' + e.r); else if (e.dr) push('D:' + e.dr); else if (e.sd) push('S:' + e.sd); else if (e.nut) push('N:' + e.nut)
      if (out.length >= n) return out
    }
  }
  for (const uid of (S && S.kitchenSeen) || []) { push(uid); if (out.length >= n) break }
  return out
}

// ---- details (lib/foodDetails.js — small, for the screens that don't load the whole kitchen) ----
export { kJ, densityOf, proteinPer100kcal, burnMinutes, allergensOf, ALLERGEN_NAMES, tagsOf } from './foodDetails.js'
