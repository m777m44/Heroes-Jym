// 14.0 — street food and the meal builder. Every sandwich, burger, wrap, pizza and plate here is
// worked out from what goes into it, by weight (lib/kitchen.js ingredients — USDA and restaurant
// averages, cooked as served): its calories, protein, carbs, fat and sodium are the sum of its
// parts, so the meal builder (components/kitchen/MealBuilder.jsx) starts exactly at the food's
// values and every change — no mayonnaise, extra cheese, a second patty — moves them honestly.
//
//   BUILDS        food id → its ingredients ('id grams, id grams, …')
//   STREET_NEW    the new street foods (burgers, hot dog, zinger, wraps, dim sum…), built from parts
//   STREET_IDS    everything of the Kitchen's "Street food" section that isn't on the fast-food shelf
//   buildOf(id)   a fresh copy of a food's ingredients, or null
//   builtValues   the values a built food gets: { kcal, p, c, f, na, g }
import { ING_BY_ID, itemsTotals } from '../kitchen.js'

export const BUILDS = {
  // ---- burgers --------------------------------------------------------------------------------
  burger: 'burgerbun 60, beefpatty 100, lettuce 15, tomato 25, onion 15, pickles 15, ketchup 15, mayo 10, salt 0.5',
  cheeseburger: 'burgerbun 60, beefpatty 100, cheeseslice 20, lettuce 15, tomato 25, onion 15, pickles 15, ketchup 15, mayo 10, salt 0.5',
  doubleburger: 'burgerbun 60, beefpatty 160, cheeseslice 40, lettuce 15, tomato 25, onion 15, pickles 15, ketchup 15, mayo 10, salt 1',
  chickenburger: 'burgerbun 60, chickenpatty 90, lettuce 15, tomato 20, mayo 8',
  zinger: 'burgerbun 60, chickenpatty 110, lettuce 15, mayo 12, hotsauce 6',
  fishburger: 'burgerbun 60, fishfillet 70, cheeseslice 10, lettuce 15, mayo 10, pickles 10, lemon 5',
  veggieburger: 'burgerbun 60, veggiepatty 85, lettuce 15, tomato 25, onion 15, ketchup 15, mayo 10',
  // ---- shawarma, kebab, tikka, falafel --------------------------------------------------------
  shawarmachicken: 'saj 70, shawarmachicken 110, toum 20, pickles 20, tomato 25, fries 20, parsley 3, salt 0.5',
  shawarmameat: 'saj 70, shawarmameat 110, toum 20, pickles 20, tomato 25, onion 15, fries 20, parsley 3, salt 0.5',
  shawarmaplate: 'shawarmachicken 150, fries 60, toum 20, pickles 20, tomato 40, cucumber 30, bread 40',
  shawarmaarabi: 'saj 100, shawarmachicken 150, fries 60, toum 30, pickles 30',
  guss: 'samoon 80, shawarmameat 100, tomato 25, onion 15, parsley 5, amba 15, pickles 15, toum 10',
  kebabsandwich: 'bread 70, kebab 100, onion 20, tomato 30, parsley 5, pickles 15',
  tikkasandwich: 'bread 70, meattikka 90, onion 20, tomato 30, parsley 5, pickles 15, amba 10',
  tawooksandwich: 'bread 70, chickentikka 100, toum 15, pickles 15, tomato 25, fries 20',
  laffatkibda: 'bread 70, liver 100, onion 20, tomato 25, parsley 5, amba 10, oil 5',
  arayes: 'bread 60, minced 80, onion 15, parsley 5, tomato 10, oil 5',
  falafelsandwich: 'bread 60, falafel 68, tahinisauce 15, tomato 30, cucumber 20, parsley 5, amba 10, pickles 15',
  falafelamba: 'bread 60, falafel 51, amba 20, tomato 25, parsley 5, pickles 15',
  falafelplate: 'falafel 102, tahinisauce 25, tomato 50, cucumber 50, lettuce 20, bread 50, pickles 20, parsley 5',
  // ---- Iraqi laffat (wraps) -------------------------------------------------------------------
  kubbasandwich: 'samoon 80, kubba 90, tomato 25, onion 15, pickles 15, amba 10, parsley 5',
  eggsandwich: 'bread 70, egg 100, potato 80, amba 15, tomato 25, parsley 5, onion 10, salt 0.5',
  cheesesandwich: 'bread 60, whitecheese 50, tomato 25, cucumber 25',
  labnehsandwich: 'bread 60, labneh 60, oliveoil 5, zaatar 3, cucumber 20, mint 2',
  laffatchips: 'bread 70, fries 100, ketchup 15, mayo 5, tomato 20, pickles 15, salt 0.5',
  laffataroog: 'bread 70, aroog 100, tomato 25, parsley 5, amba 15, pickles 15',
  laffatbagilla: 'bread 70, fava 150, oil 5, onion 10, salt 0.5',
  laffatgeymar: 'bread 70, geymar 30, honey 20',
  // ---- sandwiches & wraps ---------------------------------------------------------------------
  chickensandwich: 'samoon 80, grilledchicken 100, toum 15, lettuce 15, tomato 25, pickles 15',
  chickenwrap: 'tortilla 60, grilledchicken 80, lettuce 20, tomato 25, toum 15, pickles 15',
  tunasandwich: 'samoon 80, tuna 80, mayo 10, lettuce 10, tomato 25, onion 10, corn 20',
  halloumisandwich: 'bread 60, halloumi 60, tomato 30, cucumber 20, mint 2, oliveoil 3',
  hotdog: 'hotdogbun 45, sausage 45, ketchup 15, mustard 5, onion 15, oil 3',
  clubsandwich: 'toastbread 84, grilledchicken 70, cheeseslice 20, egg 50, lettuce 15, tomato 30, mayo 15',
  grilledcheese: 'toastbread 56, cheddar 40, butter 10',
  escalope: 'chickenbreast 120, breadcrumbs 20, egg 15, flour 5, oil 15',
  // ---- pizza & pastries -----------------------------------------------------------------------
  pizza: 'pizzadough 60, pizzasauce 15, mozzarella 30, olives 5, pepper 10',
  pepperonipizza: 'pizzadough 60, pizzasauce 15, mozzarella 30, pepperoni 12',
  zaatar: 'pizzadough 90, zaatar 12, oliveoil 8',
  cheesemanakish: 'pizzadough 90, whitecheese 50, oliveoil 3',
  lahmbajeen: 'pizzadough 70, minced 35, tomato 20, onion 15, pepper 10, tomatopaste 5, oil 3',
  sfiha: 'pizzadough 35, minced 20, tomato 10, onion 5, oil 2',
  fatayer: 'pizzadough 45, spinach 25, onion 5, lemon 3, oliveoil 4',
  sambusa: 'wrapper 20, minced 20, onion 5, oil 5',
  // ---- Mexican & Asian ------------------------------------------------------------------------
  tacos: 'tortilla 60, minced 60, cheddar 20, lettuce 20, tomato 30, pizzasauce 15',
  burrito: 'tortilla 90, grilledchicken 70, rice 25, kidneybeans 50, cheddar 15, tomato 30, lettuce 15, pizzasauce 15',
  quesadilla: 'tortilla 75, grilledchicken 55, cheddar 40, pepper 20, onion 15, oil 5',
  sushi: 'sushirice 170, salmon 40, cucumber 15, avocado 10, soysauce 10',
  ramen: 'ramennoodles 250, egg 50, grilledchicken 30, soysauce 15, corn 20, oil 5, onion 10',
  chowmein: 'ramennoodles 200, grilledchicken 50, carrot 30, pepper 30, onion 20, soysauce 15, oil 10',
  dimsum: 'wrapper 48, minced 60, onion 10, ginger 2, soysauce 10',
  // ---- fried, plates & street snacks ----------------------------------------------------------
  fries: 'fries 115, salt 0.5',
  onionrings: 'onionrings 96, ketchup 15',
  friedchicken: 'friedchicken 120',
  fishchips: 'fishfillet 180, fries 150, lemon 10, salt 1',
  chap: 'potato 60, minced 20, breadcrumbs 5, egg 5, oil 6',
  baqilla: 'fava 200, bread 60, egg 50, butter 15',
  chickpeas: 'chickpeas 160, lemon 10, cumin 1, salt 1',
  arnoos: 'corn 130, butter 3, salt 0.5',
  corncup: 'corn 150, butter 10, salt 0.5',
}

const r1 = v => Math.round(v * 10) / 10
/** 'bread 70, fava 150' → [{ id: 'bread', g: 70 }, { id: 'fava', g: 150 }] */
export function parseBuild(s) {
  return String(s || '').split(',').map(x => x.trim()).filter(Boolean).map(x => {
    const [id, g] = x.split(/\s+/)
    return { id, g: +g }
  })
}
const PARSED = Object.fromEntries(Object.entries(BUILDS).map(([id, s]) => [id, parseBuild(s)]))
/** A fresh copy of what goes into a food, or null when it isn't built from parts. */
export const buildOf = id => (PARSED[id] ? PARSED[id].map(x => ({ ...x })) : null)
export const hasBuild = id => !!PARSED[id]
/** The values of a built food (its ingredients added up). */
export function builtValues(id) {
  const items = PARSED[id]
  if (!items) return null
  const t = itemsTotals(items)
  return { kcal: t.kcal, p: t.p, c: t.c, f: t.f, na: t.na, g: Math.round(items.reduce((a, x) => a + x.g, 0)) }
}

// The new street foods — only their name, shelf and serving; the values come from BUILDS.
const NEW = [
  ['cheeseburger', 'Cheeseburger', 'piece'],
  ['doubleburger', 'Double cheeseburger', 'piece'],
  ['zinger', 'Zinger sandwich (spicy crispy chicken)', 'piece'],
  ['fishburger', 'Fish burger', 'piece'],
  ['veggieburger', 'Veggie burger', 'piece'],
  ['hotdog', 'Hot dog sandwich', 'piece'],
  ['shawarmaarabi', 'Shawarma arabi meal (cut, with fries)', 'plate'],
  ['tawooksandwich', 'Shish tawook sandwich', 'piece'],
  ['laffatkibda', 'Liver sandwich (laffat meelaq)', 'piece', { iraqi: true }],
  ['chickensandwich', 'Grilled chicken sandwich', 'piece'],
  ['chickenwrap', 'Grilled chicken wrap', 'piece'],
  ['tunasandwich', 'Tuna sandwich', 'piece'],
  ['halloumisandwich', 'Halloumi sandwich', 'piece'],
  ['escalope', 'Chicken escalope (breaded cutlet)', 'piece'],
  ['pepperonipizza', 'Pepperoni pizza (slice)', 'slice'],
  ['onionrings', 'Onion rings (8)', 'serving'],
  ['dimsum', 'Dim sum (6 steamed dumplings)', 'serving'],
  ['corncup', 'Corn cup (street corn)', 'cup'],
]
export const STREET_NEW = NEW.map(([id, name, unit, extra]) => ({ id, cat: 'fast', name, unit, ...builtValues(id), built: true, ...(extra || null) }))

/** Street food that sits on other shelves: manakish and pies, grills, Asian plates, Iraqi street snacks. */
export const STREET_IDS = new Set([
  'zaatar', 'cheesemanakish', 'lahmbajeen', 'sfiha', 'fatayer', 'sambusa', 'sambusacheese', 'boorak', 'borakmeat',
  'kebab', 'kebabiraqi', 'chickenkebab', 'adana', 'tikka', 'chickentikka', 'shishtawook', 'liver', 'lambliver', 'lambchops',
  'kebabplate', 'tikkaplate', 'sushi', 'ramen', 'chowmein', 'chap', 'arnoos', 'shalgham', 'chickpeas', 'kahi', 'baqilla', 'shamiya',
])

/** The street-food section's first cards, in this order (then the rest of the fast-food shelf, then the others). */
export const STREET_TOP = ['burger', 'cheeseburger', 'doubleburger', 'zinger', 'chickenburger', 'shawarmachicken', 'shawarmameat', 'shawarmaarabi',
  'falafelsandwich', 'kebabsandwich', 'tikkasandwich', 'tawooksandwich', 'guss', 'laffatkibda', 'kubbasandwich', 'hotdog', 'pizza', 'pepperonipizza',
  'friedchicken', 'fries', 'onionrings']

/** Every ingredient a build uses exists (checked by the tests). */
export const buildIngredients = () => [...new Set(Object.values(PARSED).flat().map(x => x.id))].filter(id => !ING_BY_ID[id])

