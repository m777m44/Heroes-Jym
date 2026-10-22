// 6.0 — my kitchen: the ingredients you have at home, recipes you can cook from them (for
// breakfast, lunch, dinner or a snack) with calories worked out from the ingredients, a meal
// builder, and a shopping list. Works offline; names and steps are English source strings,
// translated with t() like every other label.
//
// State (all optional):
//   S.pantry    = [ingredient ids you have]
//   S.shopping  = [{ id (ingredient id), done }]
//   Meals you build are saved as your own foods (S.customFoods, with `items`), so they show up in
//   the food log's search and under My foods.
import { uid } from './format.js'

export const ING_CATS = [
  { key: 'protein', name: 'Eggs, meat & fish', icon: 'flame', color: 'var(--red)' },
  { key: 'dairy', name: 'Dairy', icon: 'drop', color: 'var(--teal)' },
  { key: 'veg', name: 'Vegetables', icon: 'heart', color: 'var(--green)' },
  { key: 'grains', name: 'Bread, rice & grains', icon: 'sparkles', color: 'var(--yellow)' },
  { key: 'legumes', name: 'Beans & lentils', icon: 'leafy', color: 'var(--brown, #a2845e)' },
  { key: 'pantry', name: 'Oils, sweet & sauces', icon: 'cup', color: 'var(--orange)' },
  { key: 'fruit', name: 'Fruit & nuts', icon: 'apple', color: 'var(--pink)' },
]

// [id, category, name, kcal, protein, carbs, fat (per 100 g, as bought — rice, pasta, oats,
//  lentils and bulgur dry), unit, grams per unit]
const ING_ROWS = [
  ['egg', 'protein', 'Eggs', 143, 12.6, 0.7, 9.5, 'piece', 50],
  ['chicken', 'protein', 'Chicken', 190, 19, 0, 12, 'piece', 250],
  ['chickenbreast', 'protein', 'Chicken breast', 120, 22.5, 0, 2.6, 'piece', 200],
  ['meat', 'protein', 'Meat (lamb or beef)', 230, 18, 0, 17, 'g', 100],
  ['minced', 'protein', 'Minced meat', 254, 17, 0, 20, 'g', 100],
  ['fish', 'protein', 'Fish', 127, 18, 0, 5.6, 'piece', 300],
  ['tuna', 'protein', 'Canned tuna', 116, 26, 0, 1, 'can', 120],
  ['milk', 'dairy', 'Milk', 61, 3.2, 4.8, 3.3, 'cup', 240],
  ['yogurt', 'dairy', 'Yogurt', 61, 3.5, 4.7, 3.3, 'cup', 200],
  ['whitecheese', 'dairy', 'White cheese', 264, 14, 4, 21, 'slice', 30],
  ['cheddar', 'dairy', 'Cheddar cheese', 403, 25, 1.3, 33, 'slice', 25],
  ['geymar', 'dairy', 'Geymar (clotted cream)', 520, 2.5, 3, 55, 'tbsp', 20],
  ['butter', 'dairy', 'Butter', 717, 0.9, 0.1, 81, 'tbsp', 14],
  ['labneh', 'dairy', 'Labneh', 150, 7, 4, 11, 'tbsp', 30],
  ['tomato', 'veg', 'Tomatoes', 18, 0.9, 3.9, 0.2, 'piece', 120],
  ['onion', 'veg', 'Onions', 40, 1.1, 9.3, 0.1, 'piece', 110],
  ['potato', 'veg', 'Potatoes', 77, 2, 17, 0.1, 'piece', 170],
  ['cucumber', 'veg', 'Cucumbers', 15, 0.7, 3.6, 0.1, 'piece', 120],
  ['eggplant', 'veg', 'Eggplant', 25, 1, 6, 0.2, 'piece', 250],
  ['zucchini', 'veg', 'Zucchini', 17, 1.2, 3.1, 0.3, 'piece', 200],
  ['okra', 'veg', 'Okra', 33, 1.9, 7.5, 0.2, 'cup', 100],
  ['pepper', 'veg', 'Bell pepper', 26, 1, 6, 0.3, 'piece', 120],
  ['carrot', 'veg', 'Carrots', 41, 0.9, 10, 0.2, 'piece', 60],
  ['garlic', 'veg', 'Garlic', 149, 6.4, 33, 0.5, 'clove', 3],
  ['lettuce', 'veg', 'Lettuce', 15, 1.4, 2.9, 0.2, 'cup', 50],
  ['parsley', 'veg', 'Parsley', 36, 3, 6.3, 0.8, 'handful', 15],
  ['greenbeans', 'veg', 'Green beans', 31, 1.8, 7, 0.2, 'cup', 100],
  ['peas', 'veg', 'Peas', 81, 5.4, 14.5, 0.4, 'cup', 100],
  ['spinach', 'veg', 'Spinach', 23, 2.9, 3.6, 0.4, 'cup', 100],
  ['lemon', 'veg', 'Lemons', 29, 1.1, 9.3, 0.3, 'piece', 60],
  ['bread', 'grains', 'Arabic bread', 275, 9, 55, 1.2, 'piece', 60],
  ['samoon', 'grains', 'Samoon', 270, 9, 53, 2, 'piece', 90],
  ['rice', 'grains', 'Rice', 360, 6.6, 79, 0.6, 'cup', 185],
  ['bulgur', 'grains', 'Bulgur', 342, 12, 76, 1.3, 'cup', 140],
  ['pasta', 'grains', 'Pasta', 371, 13, 75, 1.5, 'cup', 100],
  ['vermicelli', 'grains', 'Vermicelli', 371, 13, 75, 1.5, 'handful', 30],
  ['oats', 'grains', 'Oats', 389, 17, 66, 7, 'cup', 80],
  ['flour', 'grains', 'Flour', 364, 10, 76, 1, 'tbsp', 10],
  ['lentils', 'legumes', 'Red lentils', 358, 24, 63, 2, 'cup', 190],
  ['chickpeas', 'legumes', 'Chickpeas (cooked)', 164, 8.9, 27, 2.6, 'cup', 160],
  ['fava', 'legumes', 'Fava beans (cooked)', 110, 7.6, 19.6, 0.4, 'cup', 170],
  ['whitebeans', 'legumes', 'White beans (cooked)', 140, 9.7, 25, 0.4, 'cup', 180],
  ['oil', 'pantry', 'Cooking oil', 884, 0, 0, 100, 'tbsp', 14],
  ['oliveoil', 'pantry', 'Olive oil', 884, 0, 0, 100, 'tbsp', 14],
  ['tahini', 'pantry', 'Tahini (rashi)', 595, 17, 21, 54, 'tbsp', 15],
  ['dibis', 'pantry', 'Date syrup (dibis)', 280, 1, 70, 0.1, 'tbsp', 20],
  ['honey', 'pantry', 'Honey', 304, 0.3, 82, 0, 'tbsp', 21],
  ['sugar', 'pantry', 'Sugar', 387, 0, 100, 0, 'tsp', 4],
  ['tomatopaste', 'pantry', 'Tomato paste', 82, 4.3, 19, 0.5, 'tbsp', 16],
  ['dates', 'fruit', 'Dates', 282, 2.5, 75, 0.4, 'piece', 8],
  ['banana', 'fruit', 'Bananas', 89, 1.1, 23, 0.3, 'piece', 120],
  ['apple', 'fruit', 'Apples', 52, 0.3, 14, 0.2, 'piece', 180],
  ['raisins', 'fruit', 'Raisins', 299, 3, 79, 0.5, 'handful', 30],
  ['walnuts', 'fruit', 'Walnuts', 654, 15, 14, 65, 'handful', 30],
  ['almonds', 'fruit', 'Almonds', 579, 21, 22, 50, 'handful', 30],
  ['olives', 'fruit', 'Olives', 115, 0.8, 6, 11, 'handful', 30],
]
export const INGREDIENTS = ING_ROWS.map(([id, cat, name, kcal, p, c, f, unit, g]) => ({ id, cat, name, kcal, p, c, f, unit, g }))
export const ING_BY_ID = Object.fromEntries(INGREDIENTS.map(x => [x.id, x]))

/** What "the basics" fills the kitchen with. */
export const BASICS = ['egg', 'tomato', 'onion', 'potato', 'bread', 'rice', 'oil', 'tomatopaste', 'garlic', 'lemon', 'cucumber', 'yogurt']

// Steps, shared between recipes so each sentence is translated once.
const ST = {
  chop: 'Chop the onion and tomatoes.',
  fryOnion: 'Fry the onion in the oil until golden.',
  addTomato: 'Add the tomatoes and cook for 5 minutes.',
  eggsIn: 'Crack in the eggs and stir gently until set.',
  serveBread: 'Serve hot with bread.',
  mixRashi: 'Mix the tahini with the date syrup in a small plate.',
  dip: 'Dip the bread and enjoy.',
  boilEggs: 'Boil the eggs for 8–10 minutes, then cool them in cold water.',
  peel: 'Peel and serve with the vegetables and bread.',
  beatIjja: 'Beat the eggs with the flour, parsley and onion.',
  fryIjja: 'Fry spoonfuls in a little oil, 2 minutes a side.',
  pepperPaste: 'Add the pepper and tomato paste and simmer for 8 minutes.',
  wells: 'Make small wells, crack an egg into each and cover until set.',
  brownMince: 'Brown the minced meat with the onion.',
  warmBeans: 'Warm the beans with a little water.',
  baqilla: 'Put them over torn bread, then top with the egg and the butter.',
  cream: 'Spread the cream on the bread and drizzle the honey.',
  slice: 'Slice the vegetables and serve with the cheese and bread.',
  oats: 'Cook the oats in the milk for 5 minutes, stirring.',
  topBanana: 'Top with the sliced banana and honey.',
  labneh: 'Spread the labneh and drizzle the olive oil.',
  mash: 'Mash the beans with lemon, garlic and olive oil.',
  fryPotato: 'Cut the potatoes into cubes and fry until golden.',
  addEggs: 'Add the eggs and stir until cooked.',
  rinse: 'Rinse the lentils.',
  simmerLentils: 'Simmer the lentils with the onion and carrot in water for 25 minutes.',
  blend: 'Blend smooth and add lemon.',
  soak: 'Wash the rice and soak it for 20 minutes.',
  cookRice: 'Cook the rice in salted water (1 : 1.5) on low heat for 20 minutes.',
  brownMeat: 'Brown the meat with the onion.',
  beans: 'Add the tomato paste, water and the beans; simmer for 30 minutes.',
  overRice: 'Serve the stew over the rice.',
  okra: 'Add the okra, garlic, tomato paste and water; simmer for 25 minutes.',
  chicken: 'Season the chicken and cook it until golden and done.',
  vermicelli: 'Fry the vermicelli until golden, then add the rice.',
  biryani: 'Mix in the peas, potatoes, raisins and spices.',
  fryVeg: 'Slice the eggplant and potatoes, then fry or bake them.',
  layer: 'Layer them in a tray with the meat and tomatoes.',
  bake: 'Bake at 200 °C for 40 minutes.',
  stuffing: 'Mix the rice, minced meat, onion, tomato and spices.',
  stuff: 'Hollow the vegetables and stuff them loosely.',
  dolmaPot: 'Pack them in a pot, add water, tomato paste and lemon, and cook on low for 1 hour.',
  maqluba: 'Layer the chicken, eggplant and rice in the pot, add water and cook for 30 minutes.',
  flip: 'Turn the pot over onto a large tray.',
  pasta: 'Boil the pasta until tender.',
  sauce: 'Mix the pasta with the sauce.',
  grillChicken: 'Grill the chicken and slice it.',
  toss: 'Toss the vegetables with olive oil and lemon and top with the chicken.',
  kebab: 'Mix the minced meat with onion and parsley and shape it on skewers.',
  grill: 'Grill for 8–10 minutes, turning.',
  fish: 'Season the fish with lemon and grill or bake it for 20 minutes.',
  stew: 'Add the vegetables, tomato and water; simmer for 25 minutes.',
  broth: 'Simmer the chicken with the onion in water for 40 minutes.',
  tashreeb: 'Put the bread in a deep plate and pour the broth and chicken over it.',
  tuna: 'Cut the vegetables, then add the tuna, olive oil and lemon.',
  toast: 'Toast the bread and break it into pieces.',
  fattoush: 'Mix the vegetables with the bread, olive oil and lemon.',
  hummus: 'Blend the chickpeas with the tahini, lemon and garlic until smooth.',
  topOil: 'Top with olive oil.',
  grind: 'Grind the chickpeas with onion, parsley and garlic.',
  balls: 'Shape small balls and fry until brown.',
  cucumber: 'Grate the cucumber into the yogurt with the garlic.',
  fill: 'Fill the bread and serve.',
  fruit: 'Cut the fruit into a bowl.',
  shake: 'Blend everything until smooth.',
  mix: 'Mix and serve.',
  bulgur: 'Add the bulgur and water and cook covered for 15 minutes.',
  spinach: 'Add the spinach and cook until it wilts.',
}
export const STEP_TEXTS = Object.values(ST)

// [id, name, meals, minutes, ingredients [[id, grams per serving, optional]], steps]
const R = (id, name, meals, min, ing, steps) => ({ id, name, meals, min, ing: ing.map(([i, g, opt]) => ({ id: i, g, opt: !!opt })), steps: steps.map(k => ST[k]) })
export const RECIPES = [
  R('eggtomato', 'Eggs with tomato', 'bd', 15, [['egg', 100], ['tomato', 150], ['onion', 40], ['oil', 10], ['bread', 60, 1]], ['chop', 'fryOnion', 'addTomato', 'eggsIn', 'serveBread']),
  R('rashidibis', 'Tahini with date syrup', 'bs', 3, [['tahini', 30], ['dibis', 40], ['bread', 60]], ['mixRashi', 'dip']),
  R('boiledeggs', 'Boiled eggs breakfast', 'b', 12, [['egg', 100], ['bread', 60], ['cucumber', 60, 1], ['tomato', 60, 1]], ['boilEggs', 'peel']),
  R('ijja', 'Herb omelette (ijja)', 'bd', 15, [['egg', 100], ['onion', 30], ['parsley', 15], ['flour', 10], ['oil', 10]], ['beatIjja', 'fryIjja', 'serveBread']),
  R('shakshuka', 'Shakshuka', 'bd', 20, [['egg', 100], ['tomato', 150], ['pepper', 60], ['onion', 40], ['oil', 10], ['tomatopaste', 10, 1]], ['chop', 'fryOnion', 'pepperPaste', 'wells', 'serveBread']),
  R('makhlama', 'Makhlama (eggs with meat)', 'bl', 20, [['egg', 100], ['minced', 60], ['onion', 40], ['tomato', 80], ['oil', 5]], ['chop', 'brownMince', 'addTomato', 'eggsIn', 'serveBread']),
  R('baqilla', 'Fava beans with egg (baqilla bil-dihin)', 'b', 15, [['fava', 170], ['bread', 60], ['egg', 50], ['butter', 10], ['lemon', 10, 1]], ['warmBeans', 'baqilla']),
  R('geymarhoney', 'Geymar with honey', 'b', 3, [['geymar', 40], ['honey', 20], ['samoon', 90]], ['cream']),
  R('cheeseplate', 'Cheese and vegetables', 'bd', 5, [['whitecheese', 50], ['bread', 60], ['cucumber', 80], ['tomato', 80], ['olives', 20, 1]], ['slice']),
  R('oatsbanana', 'Oats with milk and banana', 'bs', 8, [['oats', 50], ['milk', 200], ['banana', 120], ['honey', 10, 1]], ['oats', 'topBanana']),
  R('labnehplate', 'Labneh with olive oil', 'bd', 3, [['labneh', 60], ['oliveoil', 10], ['bread', 60], ['cucumber', 60, 1], ['olives', 20, 1]], ['labneh', 'dip']),
  R('foul', 'Foul with olive oil', 'b', 10, [['fava', 170], ['oliveoil', 10], ['lemon', 15], ['garlic', 3], ['bread', 60]], ['mash', 'serveBread']),
  R('eggpotato', 'Eggs with potato', 'bd', 20, [['egg', 100], ['potato', 170], ['oil', 15], ['onion', 30, 1]], ['fryPotato', 'addEggs', 'serveBread']),
  R('spinacheggs', 'Spinach with eggs', 'bd', 15, [['spinach', 150], ['egg', 100], ['onion', 30], ['oil', 10]], ['fryOnion', 'spinach', 'eggsIn']),
  R('lentilsoup', 'Red lentil soup', 'dl', 35, [['lentils', 60], ['onion', 40], ['carrot', 50], ['oil', 10], ['lemon', 10, 1]], ['rinse', 'fryOnion', 'simmerLentils', 'blend']),
  R('ricebeans', 'Rice with white bean stew', 'l', 60, [['rice', 80], ['whitebeans', 120], ['meat', 60], ['tomatopaste', 20], ['onion', 30], ['oil', 10]], ['soak', 'cookRice', 'brownMeat', 'beans', 'overRice']),
  R('riceokra', 'Rice with okra stew', 'l', 50, [['rice', 80], ['okra', 120], ['meat', 70], ['tomatopaste', 20], ['garlic', 6], ['oil', 10]], ['soak', 'cookRice', 'brownMeat', 'okra', 'overRice']),
  R('ricechicken', 'Chicken with rice', 'ld', 45, [['rice', 90], ['chicken', 200], ['onion', 30], ['oil', 10]], ['soak', 'chicken', 'cookRice']),
  R('biryani', 'Biryani', 'l', 60, [['rice', 90], ['chicken', 120], ['potato', 60], ['peas', 30], ['raisins', 10], ['vermicelli', 15], ['oil', 15], ['almonds', 10, 1]], ['soak', 'chicken', 'fryPotato', 'vermicelli', 'cookRice', 'biryani']),
  R('potatostew', 'Potato stew with rice', 'l', 50, [['potato', 170], ['meat', 70], ['tomatopaste', 20], ['onion', 30], ['oil', 10], ['rice', 80]], ['soak', 'cookRice', 'brownMeat', 'stew', 'overRice']),
  R('greenbeanstew', 'Green bean stew with rice', 'l', 50, [['greenbeans', 150], ['meat', 70], ['tomato', 100], ['onion', 30], ['oil', 10], ['rice', 80]], ['soak', 'cookRice', 'brownMeat', 'stew', 'overRice']),
  R('peastew', 'Pea and carrot stew with rice', 'l', 50, [['peas', 120], ['carrot', 50], ['meat', 70], ['tomatopaste', 20], ['oil', 10], ['rice', 80]], ['soak', 'cookRice', 'brownMeat', 'stew', 'overRice']),
  R('tepsi', 'Eggplant tepsi', 'ld', 70, [['eggplant', 200], ['minced', 80], ['potato', 100], ['tomato', 100], ['onion', 30], ['oil', 20]], ['fryVeg', 'brownMince', 'layer', 'bake']),
  R('dolma', 'Home dolma', 'l', 90, [['rice', 70], ['minced', 50], ['onion', 50], ['tomato', 80], ['zucchini', 100], ['eggplant', 80], ['oil', 15], ['tomatopaste', 15], ['lemon', 10]], ['stuffing', 'stuff', 'dolmaPot']),
  R('maqluba', 'Maqluba', 'l', 60, [['rice', 80], ['eggplant', 150], ['chicken', 120], ['oil', 20], ['potato', 80, 1]], ['soak', 'fryVeg', 'chicken', 'maqluba', 'flip']),
  R('tashreeb', 'Chicken tashreeb', 'ld', 50, [['chicken', 200], ['bread', 80], ['onion', 40], ['chickpeas', 40, 1]], ['broth', 'tashreeb']),
  R('pastameat', 'Pasta with meat sauce', 'ld', 30, [['pasta', 90], ['minced', 70], ['tomato', 100], ['tomatopaste', 15], ['onion', 30], ['oil', 10]], ['pasta', 'brownMince', 'addTomato', 'sauce']),
  R('kebab', 'Home kebab', 'ld', 25, [['minced', 150], ['onion', 30], ['parsley', 10], ['bread', 60], ['tomato', 80, 1]], ['kebab', 'grill', 'serveBread']),
  R('fishrice', 'Fish with rice', 'l', 40, [['fish', 200], ['rice', 80], ['lemon', 15], ['oil', 10]], ['soak', 'cookRice', 'fish']),
  R('bulgurtomato', 'Bulgur with tomato', 'ld', 30, [['bulgur', 70], ['tomato', 100], ['onion', 30], ['oil', 10], ['tomatopaste', 10]], ['fryOnion', 'addTomato', 'bulgur']),
  R('chickensalad', 'Grilled chicken salad', 'ld', 20, [['chickenbreast', 150], ['lettuce', 80], ['tomato', 80], ['cucumber', 80], ['oliveoil', 10], ['lemon', 10]], ['grillChicken', 'toss']),
  R('chickenwrap', 'Chicken wrap', 'ld', 20, [['bread', 80], ['chickenbreast', 120], ['tomato', 50], ['lettuce', 30], ['yogurt', 40]], ['grillChicken', 'fill']),
  R('tunasalad', 'Tuna salad', 'dl', 10, [['tuna', 100], ['lettuce', 60], ['tomato', 80], ['cucumber', 80], ['oliveoil', 10], ['lemon', 10], ['bread', 60, 1]], ['tuna']),
  R('fattoush', 'Fattoush', 'ds', 15, [['bread', 30], ['lettuce', 80], ['tomato', 80], ['cucumber', 80], ['parsley', 10], ['oliveoil', 10], ['lemon', 10]], ['toast', 'fattoush']),
  R('hummus', 'Hummus with tahini', 'ds', 10, [['chickpeas', 160], ['tahini', 20], ['lemon', 15], ['garlic', 3], ['oliveoil', 10], ['bread', 60]], ['hummus', 'topOil', 'dip']),
  R('falafel', 'Home falafel', 'd', 30, [['chickpeas', 120], ['onion', 30], ['parsley', 15], ['garlic', 3], ['oil', 20], ['bread', 60, 1]], ['grind', 'balls', 'fill']),
  R('yogurtcucumber', 'Yogurt with cucumber', 'ds', 5, [['yogurt', 200], ['cucumber', 120], ['garlic', 2]], ['cucumber']),
  R('cheesesandwich', 'Cheese sandwich', 'ds', 5, [['samoon', 90], ['cheddar', 40], ['tomato', 50, 1]], ['fill']),
  R('eggsandwich', 'Egg sandwich', 'ds', 12, [['samoon', 90], ['egg', 100], ['tomato', 50, 1]], ['boilEggs', 'fill']),
  R('fruitbowl', 'Fruit bowl', 's', 5, [['apple', 180], ['banana', 120], ['dates', 24, 1]], ['fruit']),
  R('dateswalnuts', 'Dates with walnuts', 's', 1, [['dates', 40], ['walnuts', 20]], ['mix']),
  R('honeyyogurt', 'Yogurt with honey and walnuts', 'sb', 2, [['yogurt', 200], ['honey', 15], ['walnuts', 15, 1]], ['mix']),
  R('bananashake', 'Banana milkshake', 'sb', 5, [['milk', 250], ['banana', 120], ['dates', 16, 1]], ['shake']),
  R('datesyogurt', 'Dates with yogurt', 's', 2, [['dates', 40], ['yogurt', 150]], ['mix']),
]
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]))

const num = v => (Number.isFinite(+v) ? +v : 0)
const r0 = v => Math.round(v)
const r1 = v => Math.round(v * 10) / 10

/** Nutrition of ingredient amounts [{ id, g }]: { kcal, p, c, f, g }. Unknown ids are skipped. */
export function itemsTotals(items) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, g: 0 }
  for (const it of items || []) {
    const x = ING_BY_ID[it.id]
    const g = num(it.g)
    if (!x || g <= 0) continue
    t.kcal += x.kcal * g / 100; t.p += x.p * g / 100; t.c += x.c * g / 100; t.f += x.f * g / 100; t.g += g
  }
  return { kcal: r0(t.kcal), p: r1(t.p), c: r1(t.c), f: r1(t.f), g: r0(t.g) }
}

/** The ingredients a recipe uses: required ones, plus the optional ones you have (or `withOptional`). */
export function recipeItems(r, pantry = null, withOptional = null) {
  const have = new Set(pantry || [])
  return r.ing.filter(i => !i.opt || (withOptional != null ? withOptional.includes(i.id) : have.has(i.id)))
}
/** Per-serving nutrition of a recipe. */
export const recipeNutrition = (r, pantry = null, withOptional = null) => itemsTotals(recipeItems(r, pantry, withOptional))

/** How a recipe matches your kitchen: { missing: [ids], have, need, ready }. */
export function recipeMatch(r, pantry) {
  const have = new Set(pantry || [])
  const req = r.ing.filter(i => !i.opt)
  const missing = req.filter(i => !have.has(i.id)).map(i => i.id)
  return { missing, have: req.length - missing.length, need: req.length, ready: missing.length === 0 }
}

/**
 * Recipes for a meal ('b' | 'l' | 'd' | 's', or null for all), best first: ready to cook, then the
 * fewest missing, then (when `left` kcal is given) those that fit what's left today.
 * Each: { r, match, n (nutrition), fits }.
 */
export function suggestRecipes(pantry, meal = null, { left = null, readyOnly = false } = {}) {
  const out = []
  for (const r of RECIPES) {
    if (meal && !r.meals.includes(meal)) continue
    const match = recipeMatch(r, pantry)
    if (readyOnly && !match.ready) continue
    const n = recipeNutrition(r, pantry)
    const fits = left == null ? null : n.kcal <= Math.max(0, left)
    out.push({ r, match, n, fits })
  }
  return out.sort((a, b) => (a.match.missing.length - b.match.missing.length) || ((b.fits ? 1 : 0) - (a.fits ? 1 : 0)) || (b.match.have - a.match.have) || (a.r.min - b.r.min))
}

/** A food-log entry for `servings` of a recipe (calories per serving × servings). */
export function recipeEntry(r, { servings = 1, meal = 's', pantry = null, withOptional = null, now = Date.now() } = {}) {
  const n = recipeNutrition(r, pantry, withOptional)
  const q = Math.min(20, Math.max(0.5, Math.round(num(servings) * 2) / 2 || 1))
  return { id: 'fe' + uid(), f: null, r: r.id, n: r.name, kcal: n.kcal, p: n.p, c: n.c, fat: n.f, q, m: ['b', 'l', 'd', 's'].includes(meal) ? meal : 's', t: now }
}

// ---- mutators (inside update(s => …)) ------------------------------------------------------
export function togglePantry(s, id) {
  const set = new Set(s.pantry || [])
  if (set.has(id)) set.delete(id); else if (ING_BY_ID[id]) set.add(id)
  s.pantry = [...set]
  return set.has(id)
}
export function addBasics(s) {
  const set = new Set(s.pantry || [])
  let n = 0
  for (const id of BASICS) if (!set.has(id)) { set.add(id); n++ }
  s.pantry = [...set]
  return n
}
export function clearPantry(s) { s.pantry = [] }

/** Put ingredients on the shopping list (skips ones already there); returns how many were added. */
export function addToShopping(s, ids) {
  s.shopping = s.shopping || []
  const on = new Set(s.shopping.map(x => x.id))
  let n = 0
  for (const id of ids) if (ING_BY_ID[id] && !on.has(id)) { s.shopping.push({ id, done: false }); on.add(id); n++ }
  return n
}
/** Tick an item: it goes into the kitchen; untick takes it off the kitchen again. */
export function toggleShopping(s, id) {
  const it = (s.shopping || []).find(x => x.id === id)
  if (!it) return
  it.done = !it.done
  const set = new Set(s.pantry || [])
  if (it.done) set.add(id); else set.delete(id)
  s.pantry = [...set]
}
export function clearShoppingDone(s) { s.shopping = (s.shopping || []).filter(x => !x.done) }
export function removeShopping(s, id) { s.shopping = (s.shopping || []).filter(x => x.id !== id) }

/**
 * Save a built meal as your own food (per serving), with its ingredients kept for editing.
 * Throws Error with .key when it has no name or no ingredients.
 */
export function saveBuiltMeal(s, { id, n, items, servings = 1, meal = null }) {
  const name = String(n || '').trim().slice(0, 60)
  if (!name) throw Object.assign(new Error('Give it a name'), { key: 'Give it a name' })
  const list = (items || []).filter(i => ING_BY_ID[i.id] && num(i.g) > 0).map(i => ({ id: i.id, g: r0(num(i.g)) }))
  if (!list.length) throw Object.assign(new Error('Add at least one ingredient.'), { key: 'Add at least one ingredient.' })
  const sv = Math.min(12, Math.max(1, r0(num(servings)) || 1))
  const tot = itemsTotals(list)
  const food = { id: id || 'cf' + uid(), n: name, kcal: r0(tot.kcal / sv), p: r1(tot.p / sv), c: r1(tot.c / sv), f: r1(tot.f / sv), unit: 'serving', g: r0(tot.g / sv), custom: true, cat: 'mine', items: list, servings: sv, ...(meal ? { meal } : {}) }
  s.customFoods = s.customFoods || []
  const i = s.customFoods.findIndex(x => x.id === food.id)
  if (i >= 0) s.customFoods[i] = food; else s.customFoods.push(food)
  return food
}

/** Ingredients matching a search (translated or English name), in category order. */
export function searchIngredients(q, tr = x => x) {
  const norm = v => String(v || '').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim()
  const nq = norm(q)
  if (!nq) return INGREDIENTS
  return INGREDIENTS.filter(x => norm(tr(x.name)).includes(nq) || norm(x.name).includes(nq) || x.id.includes(nq))
}
