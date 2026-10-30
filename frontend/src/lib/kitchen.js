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
  // 9.0 — for the Iraqi kitchen
  ['turnip', 'veg', 'Turnips', 28, 0.9, 6.4, 0.1, 'piece', 120],
  ['chard', 'veg', 'Swiss chard', 19, 1.8, 3.7, 0.2, 'handful', 40],
  ['dill', 'veg', 'Dill', 43, 3.5, 7, 1.1, 'handful', 15],
  ['cauliflower', 'veg', 'Cauliflower', 25, 1.9, 5, 0.3, 'cup', 100],
  ['herbs', 'veg', 'Mixed herbs (leek, coriander, fenugreek leaves)', 30, 2.5, 5, 0.6, 'handful', 30],
  ['celery', 'veg', 'Celery', 16, 0.7, 3, 0.2, 'piece', 40],
  ['mint', 'veg', 'Fresh mint', 44, 3.3, 8.4, 0.7, 'handful', 10],
  ['vineleaves', 'veg', 'Vine leaves', 70, 4.3, 11.7, 2, 'piece', 4],
  ['kidneybeans', 'legumes', 'Kidney beans (cooked)', 127, 8.7, 22.8, 0.5, 'cup', 177],
  ['wheat', 'grains', 'Whole wheat grains (jareesh)', 340, 13, 72, 2.5, 'cup', 190],
  ['semolina', 'grains', 'Semolina', 360, 12.7, 72.8, 1.1, 'tbsp', 12],
  ['wholewheatflour', 'grains', 'Whole wheat flour', 340, 13.2, 72, 2.5, 'tbsp', 8],
  ['tamarind', 'pantry', 'Tamarind', 239, 2.8, 62.5, 0.6, 'tbsp', 18],
  ['datepaste', 'pantry', 'Date paste', 300, 2, 75, 0.4, 'tbsp', 20],
  ['cumin', 'pantry', 'Cumin', 375, 17.8, 44.2, 22.3, 'tsp', 2],
  ['turmeric', 'pantry', 'Turmeric', 312, 9.7, 67, 3.3, 'tsp', 3],
  ['cinnamon', 'pantry', 'Cinnamon', 247, 4, 81, 1.2, 'tsp', 2.6],
  ['cardamom', 'pantry', 'Cardamom', 311, 10.8, 68.5, 6.7, 'tsp', 2],
  ['baharat', 'pantry', 'Iraqi spice mix (bahar)', 300, 10, 60, 8, 'tsp', 2.5],
  ['driedlime', 'pantry', 'Dried lime (noomi Basra)', 250, 4, 60, 1, 'piece', 6],
  ['sesame', 'fruit', 'Sesame seeds', 573, 17.7, 23.4, 49.7, 'tbsp', 9],
  // 14.0 — for the new recipes: gym meals, Arab, Indian and Western dishes (USDA, as bought)
  ['broccoli', 'veg', 'Broccoli', 34, 2.8, 6.6, 0.4, 'cup', 91],
  ['sweetpotato', 'veg', 'Sweet potato', 86, 1.6, 20, 0.1, 'piece', 130],
  ['corn', 'veg', 'Sweet corn', 86, 3.3, 16.7, 1.4, 'cup', 150],
  ['molokhia', 'veg', 'Molokhia leaves', 34, 4.7, 5.8, 0.3, 'cup', 100],
  ['ginger', 'veg', 'Fresh ginger', 80, 1.8, 18, 0.8, 'tsp', 3],
  ['avocado', 'fruit', 'Avocado', 160, 2, 8.5, 14.7, 'piece', 140],
  ['berries', 'fruit', 'Berries', 45, 0.8, 11, 0.4, 'cup', 145],
  ['chia', 'fruit', 'Chia seeds', 486, 16.5, 42, 30.7, 'tbsp', 12],
  ['salmon', 'protein', 'Salmon', 208, 20.4, 0, 13.4, 'piece', 150],
  ['whey', 'protein', 'Whey protein powder', 380, 78, 8, 5, 'g', 30],
  ['greekyogurt', 'dairy', 'Greek yogurt', 59, 10.2, 3.6, 0.4, 'cup', 170],
  ['mozzarella', 'dairy', 'Mozzarella', 300, 22, 2.2, 22.4, 'slice', 28],
  ['cream', 'dairy', 'Cooking cream', 340, 2.8, 2.7, 36, 'tbsp', 15],
  ['quinoa', 'grains', 'Quinoa', 368, 14.1, 64.2, 6.1, 'cup', 170],
  ['tortilla', 'grains', 'Flour tortilla', 310, 8.2, 51, 7.7, 'piece', 60],
  ['wholebread', 'grains', 'Whole-wheat bread', 247, 13, 41, 3.4, 'slice', 35],
  ['granola', 'grains', 'Granola', 471, 10, 64, 20, 'handful', 30],
  ['soysauce', 'pantry', 'Soy sauce', 53, 8.1, 4.9, 0.6, 'tbsp', 16],
  ['mayo', 'pantry', 'Mayonnaise', 680, 1, 0.6, 75, 'tbsp', 14],
  // 14.0 — the meal builder's street food: what goes into a burger, a shawarma, a falafel or a
  // kebab sandwich, a pizza, a hot dog… (cooked as served — USDA and restaurant averages)
  ['beefpatty', 'protein', 'Beef burger patty', 254, 25.8, 0, 16.6, 'piece', 100],
  ['chickenpatty', 'protein', 'Crispy chicken fillet', 260, 17, 14, 15, 'piece', 110],
  ['veggiepatty', 'legumes', 'Veggie burger patty', 180, 12, 15, 8, 'piece', 85],
  ['shawarmameat', 'protein', 'Meat shawarma', 230, 24, 2, 14, 'g', 100],
  ['shawarmachicken', 'protein', 'Chicken shawarma', 185, 25, 2, 8.5, 'g', 100],
  ['grilledchicken', 'protein', 'Grilled chicken', 165, 31, 0, 3.6, 'g', 100],
  ['chickentikka', 'protein', 'Chicken tikka', 165, 26, 2, 6, 'g', 100],
  ['meattikka', 'protein', 'Lamb tikka', 230, 25, 1, 14, 'g', 100],
  ['kebab', 'protein', 'Grilled kebab', 265, 18, 3, 20, 'piece', 90],
  ['liver', 'protein', 'Liver (meelaq), cooked', 175, 26, 4, 6, 'g', 100],
  ['friedchicken', 'protein', 'Fried chicken', 270, 22, 9, 16.5, 'piece', 120],
  ['fishfillet', 'protein', 'Breaded fish fillet', 230, 14, 17, 12, 'piece', 100],
  ['sausage', 'protein', 'Sausage (hot dog)', 260, 11, 3, 23, 'piece', 45],
  ['pepperoni', 'protein', 'Pepperoni', 494, 23, 1.2, 44, 'slice', 2],
  ['kubba', 'protein', 'Fried kubba (bulgur and meat)', 260, 11, 25, 13, 'piece', 60],
  ['aroog', 'protein', 'Aroog (fried meat and vegetable patties)', 250, 12, 15, 16, 'piece', 50],
  ['falafel', 'legumes', 'Falafel', 333, 13.3, 31.8, 17.8, 'piece', 17],
  ['halloumi', 'dairy', 'Halloumi', 321, 21, 2, 25, 'slice', 30],
  ['cheeseslice', 'dairy', 'Processed cheese slice', 320, 17, 7, 25, 'slice', 20],
  ['pickles', 'veg', 'Pickles (torshi)', 13, 0.5, 2.3, 0.2, 'handful', 30],
  ['fries', 'veg', 'French fries', 312, 3.4, 41, 15, 'handful', 40],
  ['onionrings', 'veg', 'Onion rings', 330, 4.5, 36, 19, 'piece', 12],
  ['chili', 'veg', 'Green chilli', 40, 2, 9, 0.2, 'piece', 15],
  ['mushroom', 'veg', 'Mushrooms', 22, 3.1, 3.3, 0.3, 'cup', 70],
  ['burgerbun', 'grains', 'Burger bun', 279, 9.5, 50, 4.3, 'piece', 60],
  ['hotdogbun', 'grains', 'Hot dog bun', 280, 9.5, 50, 4.5, 'piece', 45],
  ['saj', 'grains', 'Saj bread (thin)', 275, 9, 56, 1.5, 'piece', 70],
  ['toastbread', 'grains', 'Toast bread', 265, 9, 49, 3.2, 'slice', 28],
  ['pizzadough', 'grains', 'Pizza base', 266, 9, 50, 3.3, 'g', 100],
  ['tacoshell', 'grains', 'Taco shell', 470, 7, 62, 22, 'piece', 13],
  ['breadcrumbs', 'grains', 'Breadcrumbs', 395, 13, 72, 5.3, 'tbsp', 7],
  ['sushirice', 'grains', 'Sushi rice (cooked)', 150, 2.6, 33, 0.3, 'cup', 150],
  ['ramennoodles', 'grains', 'Ramen noodles (cooked)', 138, 4.5, 25, 2, 'cup', 180],
  ['wrapper', 'grains', 'Dumpling wrappers', 290, 9, 58, 1.9, 'piece', 8],
  ['ketchup', 'pantry', 'Ketchup', 101, 1, 27, 0.1, 'tbsp', 17],
  ['mustard', 'pantry', 'Mustard', 60, 3.7, 5.8, 3.3, 'tsp', 5],
  ['toum', 'pantry', 'Garlic sauce (toum)', 450, 2, 6, 47, 'tbsp', 15],
  ['hotsauce', 'pantry', 'Hot sauce', 90, 1.5, 19, 0.9, 'tsp', 6],
  ['bbqsauce', 'pantry', 'Barbecue sauce', 172, 0.8, 41, 0.6, 'tbsp', 17],
  ['tahinisauce', 'pantry', 'Tahini sauce (tarator)', 300, 8.5, 10.5, 27, 'tbsp', 15],
  ['pizzasauce', 'pantry', 'Pizza sauce', 54, 2, 9, 1.4, 'tbsp', 15],
  ['amba', 'pantry', 'Amba (mango pickle sauce)', 175, 1.5, 30, 6, 'tbsp', 15],
  ['zaatar', 'pantry', 'Za’atar mix', 360, 11, 40, 18, 'tbsp', 8],
  ['salt', 'pantry', 'Salt', 0, 0, 0, 0, 'tsp', 6],
]
// 14.0 — sodium (mg per 100 g as bought or served), so the meal builder can show the salt of
// what you build. Plain ingredients from USDA; breads, sauces and street-food parts as sold.
const NA = {
  egg: 142, chicken: 82, chickenbreast: 74, meat: 72, minced: 75, fish: 60, tuna: 247, milk: 44, yogurt: 46, whitecheese: 1116,
  cheddar: 621, geymar: 30, butter: 11, labneh: 400, tomato: 5, onion: 4, potato: 6, cucumber: 2, eggplant: 2, zucchini: 8, okra: 7,
  pepper: 4, carrot: 69, garlic: 17, lettuce: 28, parsley: 56, greenbeans: 6, peas: 5, spinach: 79, lemon: 2, bread: 500, samoon: 500,
  rice: 5, bulgur: 17, pasta: 6, vermicelli: 6, oats: 2, flour: 2, lentils: 6, chickpeas: 7, fava: 5, whitebeans: 6, oil: 0, oliveoil: 2,
  tahini: 115, dibis: 10, honey: 4, sugar: 1, tomatopaste: 59, dates: 2, banana: 1, apple: 1, raisins: 11, walnuts: 2, almonds: 1,
  olives: 1556, turnip: 67, chard: 213, dill: 61, cauliflower: 30, herbs: 40, celery: 80, mint: 31, vineleaves: 9, kidneybeans: 2, wheat: 2,
  semolina: 1, wholewheatflour: 2, tamarind: 28, datepaste: 2, cumin: 168, turmeric: 38, cinnamon: 10, cardamom: 18, baharat: 30, driedlime: 10,
  sesame: 11, broccoli: 33, sweetpotato: 55, corn: 15, molokhia: 43, ginger: 13, avocado: 7, berries: 1, chia: 16, salmon: 59, whey: 200,
  greekyogurt: 36, mozzarella: 627, cream: 38, quinoa: 5, tortilla: 600, wholebread: 450, granola: 25, soysauce: 5500, mayo: 635,
  beefpatty: 330, chickenpatty: 600, veggiepatty: 450, shawarmameat: 520, shawarmachicken: 480, grilledchicken: 300, chickentikka: 400,
  meattikka: 300, kebab: 380, liver: 90, friedchicken: 600, fishfillet: 450, sausage: 1000, pepperoni: 1760, kubba: 400, aroog: 450,
  falafel: 294, halloumi: 1100, cheeseslice: 1300, pickles: 1200, fries: 210, onionrings: 430, chili: 7, mushroom: 5, burgerbun: 490,
  hotdogbun: 480, saj: 450, toastbread: 490, pizzadough: 500, tacoshell: 400, breadcrumbs: 730, sushirice: 300, ramennoodles: 100,
  wrapper: 560, ketchup: 907, mustard: 1100, toum: 500, hotsauce: 1800, bbqsauce: 1000, tahinisauce: 300, pizzasauce: 450, amba: 1500,
  zaatar: 1500, salt: 38758,
}
export const INGREDIENTS = ING_ROWS.map(([id, cat, name, kcal, p, c, f, unit, g]) => ({ id, cat, name, kcal, p, c, f, unit, g, na: NA[id] || 0 }))
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
  // 14.0
  balls: 'Mix the minced meat with the spices and shape it into small balls.',
  brownBalls: 'Brown the meatballs in the oil, then take them out.',
  dbSauce: 'Add the tomatoes, tomato paste and a cup of water, put the meatballs back and simmer for 20 minutes.',
  bulgurBroth: 'Add two cups of the chicken broth to the bulgur and cook covered for 15 minutes.',
  bulgurChicken: 'Serve the bulgur with the chicken on top.',
  boxUp: 'Divide into boxes — they keep in the fridge for up to 3 days.',
  grillVeg: 'Roast or grill the vegetables with the olive oil until soft.',
  cookQuinoa: 'Rinse the quinoa and cook it in twice its volume of water for 15 minutes.',
  dressing: 'Dress with the olive oil and lemon just before serving.',
  panFry: 'Cook in a non-stick pan for 2–3 minutes a side.',
  layerJar: 'Layer the yogurt and the fruit in a glass or jar.',
  overnight: 'Cover and leave in the fridge overnight.',
  wrapRoll: 'Fill the tortilla and roll it up tightly.',
  stirFryHigh: 'Stir-fry over high heat for 5–6 minutes, stirring all the time.',
  muffinTin: 'Pour into a muffin tin.',
  friedRiceEgg: 'Scramble the egg in the oil, then add the cooked rice and the vegetables.',
  fryOnionsCrispy: 'Fry the onion slowly until dark and crispy.',
  koshariLayer: 'Layer the rice, lentils and pasta, then top with the tomato sauce, chickpeas and crispy onion.',
  crispBread: 'Toast or fry the bread pieces until crisp.',
  fattehLayer: 'Put the crisp bread in a bowl, add the warm chickpeas, pour over the yogurt sauce and top with the nuts.',
  molokhiaGarlic: 'Fry the garlic until golden and stir it into the molokhia at the end.',
  roastPeppers: 'Roast the peppers until the skin blackens, then peel them.',
  butterSauce: 'Simmer the tomato with the butter, cream and spices, then add the chicken.',
  dalTemper: 'Fry the cumin and garlic in the oil and pour it over the dal.',
  toastAvocado: 'Toast the bread, mash the avocado on top and add the lemon and a pinch of salt.',
  soakBread: 'Dip the bread in the egg and milk on both sides.',
  bowlBuild: 'Arrange everything in a bowl.',
}
export const STEP_TEXTS = Object.values(ST)

// [id, name, meals, minutes, ingredients [[id, grams per serving, optional]], steps]
// 9.0: a step can also be a template from lib/recipeText.js ([key, ...args]); x = { iq, tip }
// 14.0: x.fit marks a gym & healthy meal
const R = (id, name, meals, min, ing, steps, x = {}) => ({
  id, name, meals, min, ing: ing.map(([i, g, opt]) => ({ id: i, g, opt: !!opt })),
  steps: steps.map(k => (Array.isArray(k) ? k : ST[k])), iq: !!x.iq || IQ_OLD.has(id), tip: x.tip ? TIP[x.tip] : null, fit: !!x.fit,
})
// the 6.0 recipes that are Iraqi home cooking
const IQ_OLD = new Set(['eggtomato', 'rashidibis', 'ijja', 'makhlama', 'baqilla', 'geymarhoney', 'ricebeans', 'riceokra', 'biryani', 'potatostew',
  'greenbeanstew', 'peastew', 'tepsi', 'dolma', 'maqluba', 'tashreeb', 'kebab', 'fishrice', 'bulgurtomato', 'lentilsoup', 'dateswalnuts', 'datesyogurt'])
// 9.0 — a healthy tip shown on some recipes
const TIP = {
  bake: 'Bake instead of frying to save about 100 kcal a serving.',
  lean: 'Choose a lean cut and trim the fat to keep it lighter.',
  fish: 'Grilled fish is high in protein and rich in omega-3.',
  fibre: 'Rich in fibre and plant protein — it keeps you full for hours.',
  light: 'A light, filling dish — great when you are losing weight.',
  treat: 'An occasional treat — two pieces make one serving.',
  sugar: 'Skip the sugar on top or use a little date syrup instead.',
  veg: 'Load up on the vegetables and go easy on the rice.',
  protein: 'High in protein and light on fat — a good meal after training.',
  prep: 'Cook once, eat for three days: make a few boxes at the weekend.',
}
export const TIP_TEXTS = Object.values(TIP)
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
  // 9.0 — more Iraqi home cooking, each with steps and calories per serving
  R('masgouf', 'Masgouf (grilled carp)', 'ld', 60, [['fish', 250], ['onion', 50], ['tomato', 100], ['lemon', 15], ['turmeric', 1], ['tamarind', 10, 1], ['oliveoil', 5], ['bread', 60, 1]],
    [['masgouf'], ['grillFor', 30], ['serveWith', ['onion', 'tomato', 'lemon', 'bread']]], { iq: true, tip: 'fish' }),
  R('kubbamosul', 'Kubba Mosul (bulgur and meat discs)', 'l', 120, [['bulgur', 50], ['minced', 80], ['onion', 30], ['baharat', 1], ['oil', 5], ['almonds', 8, 1], ['raisins', 8, 1]],
    [['soakFor', 30, ['bulgur']], ['knead', ['bulgur', 'minced']], ['saute', 10, ['minced', 'onion', 'baharat', 'almonds', 'raisins']], ['kubbaMosul'], ['boilGently', 15]], { iq: true, tip: 'lean' }),
  R('kubbahalab', 'Kubbat Halab (rice kubba, baked)', 'ld', 75, [['rice', 60], ['potato', 50], ['turmeric', 1], ['minced', 60], ['onion', 30], ['parsley', 5], ['oil', 8], ['almonds', 5, 1], ['raisins', 5, 1]],
    [['boilFor', 20, ['rice', 'potato', 'turmeric']], ['knead', ['rice', 'potato']], ['saute', 10, ['minced', 'onion', 'parsley', 'almonds', 'raisins']], ['shapeStuff'], ['bakeAt', 200, 25]], { iq: true, tip: 'bake' }),
  R('kubbahamudh', 'Kubba hamudh (sour turnip soup)', 'ld', 90, [['rice', 30], ['semolina', 20], ['minced', 50], ['onion', 20], ['turnip', 120], ['chard', 40], ['tomatopaste', 15], ['garlic', 3], ['lemon', 25], ['oil', 5], ['mint', 2, 1]],
    [['boilFor', 15, ['rice']], ['knead', ['rice', 'semolina']], ['saute', 10, ['minced', 'onion']], ['shapeStuff'], ['simmer', 20, ['turnip', 'chard', 'tomatopaste', 'garlic']], ['addKubba'], ['season', ['lemon', 'mint']]], { iq: true, tip: 'light' }),
  R('kubbaburghul', 'Bulgur kubba (baked)', 'ld', 60, [['bulgur', 45], ['minced', 70], ['onion', 30], ['parsley', 5], ['baharat', 1], ['oil', 8], ['walnuts', 8, 1]],
    [['soakFor', 30, ['bulgur']], ['knead', ['bulgur', 'minced']], ['saute', 10, ['minced', 'onion', 'parsley', 'walnuts']], ['shapeStuff'], ['bakeAt', 200, 25]], { iq: true, tip: 'bake' }),
  R('kubbabatata', 'Potato kubba (potato chop)', 'ld', 50, [['potato', 200], ['minced', 60], ['onion', 30], ['parsley', 5], ['baharat', 1], ['oil', 10], ['egg', 25, 1]],
    [['boilFor', 20, ['potato']], ['mash', ['potato']], ['saute', 10, ['minced', 'onion', 'parsley', 'baharat']], ['shapeStuff'], ['fryShallow']], { iq: true, tip: 'bake' }),
  R('timmanbagilla', 'Dill rice with fava beans (timman bagilla)', 'l', 60, [['rice', 80], ['fava', 80], ['dill', 15], ['oil', 10], ['chicken', 150, 1]],
    ['soak', ['saute', 3, ['fava', 'dill']], ['riceCover', 25], 'chicken'], { iq: true }),
  R('timmanjazar', 'Carrot rice (timman jazar)', 'l', 60, [['rice', 80], ['carrot', 80], ['chicken', 150], ['onion', 30], ['raisins', 10], ['oil', 10], ['baharat', 1], ['almonds', 10, 1]],
    ['soak', ['saute', 8, ['onion', 'carrot']], 'chicken', ['riceCover', 25], ['top', ['raisins', 'almonds']]], { iq: true }),
  R('quzi', 'Quzi (lamb with spiced rice)', 'l', 150, [['meat', 150], ['rice', 80], ['onion', 30], ['baharat', 2], ['peas', 30], ['raisins', 10], ['oil', 10], ['almonds', 10, 1]],
    [['simmer', 90, ['meat', 'onion', 'baharat']], 'soak', ['riceCover', 25], ['top', ['peas', 'raisins', 'almonds']]], { iq: true, tip: 'lean' }),
  R('mutabbaq', 'Mutabbaq simach (fish with rice, Basra)', 'l', 60, [['fish', 200], ['rice', 80], ['onion', 40], ['raisins', 10], ['turmeric', 1], ['baharat', 1], ['oil', 10], ['lemon', 10]],
    ['fish', ['saute', 10, ['onion', 'raisins', 'baharat']], 'soak', ['riceCover', 25], ['layer', ['rice', 'fish', 'onion']], 'flip'], { iq: true, tip: 'fish' }),
  R('qarnabeet', 'Cauliflower stew (margat qarnabeet)', 'l', 50, [['cauliflower', 200], ['meat', 60], ['tomatopaste', 20], ['onion', 30], ['garlic', 3], ['oil', 10], ['rice', 80]],
    ['soak', 'cookRice', 'brownMeat', ['simmer', 25, ['cauliflower', 'tomatopaste', 'garlic']], 'overRice'], { iq: true, tip: 'veg' }),
  R('shijar', 'Zucchini stew (margat shijar)', 'l', 45, [['zucchini', 200], ['meat', 60], ['tomato', 100], ['onion', 30], ['garlic', 3], ['oil', 10], ['rice', 80]],
    ['soak', 'cookRice', 'brownMeat', ['simmer', 20, ['zucchini', 'tomato', 'garlic']], 'overRice'], { iq: true, tip: 'veg' }),
  R('qormahsabzi', 'Herb stew with beans (qormah sabzi)', 'l', 90, [['herbs', 60], ['kidneybeans', 80], ['meat', 80], ['driedlime', 6], ['onion', 30], ['turmeric', 1], ['oil', 10], ['rice', 80]],
    [['saute', 15, ['herbs']], 'brownMeat', ['simmer', 60, ['kidneybeans', 'driedlime', 'turmeric']], 'soak', 'cookRice', 'overRice'], { iq: true, tip: 'fibre' }),
  R('qeema', 'Qeema (chickpea and meat stew)', 'l', 120, [['minced', 80], ['chickpeas', 100], ['tomatopaste', 20], ['driedlime', 6], ['onion', 30], ['baharat', 1], ['oil', 10], ['rice', 80]],
    [['simmer', 60, ['chickpeas', 'minced', 'onion', 'driedlime']], ['qeemaMash'], 'soak', 'cookRice', 'overRice'], { iq: true, tip: 'lean' }),
  R('harissa', 'Harissa (wheat and chicken porridge)', 'bl', 180, [['wheat', 60], ['chickenbreast', 100], ['butter', 5, 1], ['cinnamon', 1, 1], ['sugar', 4, 1]],
    [['soakNight', ['wheat']], ['simmer', 150, ['wheat', 'chickenbreast']], ['harissaBeat'], ['top', ['butter', 'cinnamon', 'sugar']]], { iq: true, tip: 'sugar' }),
  R('lablabi', 'Lablabi (chickpeas with lemon and cumin)', 'sd', 10, [['chickpeas', 200], ['lemon', 15], ['cumin', 1], ['oliveoil', 5, 1]],
    [['simmer', 10, ['chickpeas']], ['season', ['lemon', 'cumin', 'oliveoil']], ['serveBowl']], { iq: true, tip: 'fibre' }),
  R('shalgham', 'Shalgham (turnips with date syrup)', 's', 40, [['turnip', 250], ['dibis', 20, 1]],
    [['boilFor', 30, ['turnip']], ['serveWith', ['dibis']]], { iq: true, tip: 'light' }),
  R('shorbakhudra', 'Vegetable soup (shorbat khudra)', 'ld', 40, [['carrot', 60], ['potato', 80], ['zucchini', 80], ['tomato', 80], ['onion', 30], ['celery', 30], ['oil', 5], ['vermicelli', 10, 1], ['lemon', 10, 1]],
    [['chop', ['carrot', 'potato', 'zucchini', 'onion', 'celery']], ['saute', 5, ['onion']], ['simmer', 25, ['carrot', 'potato', 'zucchini', 'tomato', 'celery', 'vermicelli']], ['season', ['lemon']]], { iq: true, tip: 'light' }),
  R('tikkalamb', 'Lamb tikka', 'ld', 40, [['meat', 150], ['yogurt', 30], ['onion', 30], ['lemon', 10], ['baharat', 1], ['oliveoil', 5], ['tomato', 80], ['bread', 60, 1]],
    [['marinate', 60, ['meat', 'yogurt', 'onion', 'lemon', 'baharat']], ['skewer', ['meat', 'tomato']], ['grillFor', 12], ['serveWith', ['bread', 'onion']]], { iq: true, tip: 'lean' }),
  R('tikkachicken', 'Chicken tikka', 'ld', 35, [['chickenbreast', 180], ['yogurt', 40], ['garlic', 3], ['lemon', 10], ['baharat', 1], ['oliveoil', 5], ['pepper', 60, 1], ['bread', 60, 1]],
    [['marinate', 60, ['chickenbreast', 'yogurt', 'garlic', 'lemon', 'baharat']], ['skewer', ['chickenbreast', 'pepper']], ['grillFor', 12], ['serveWith', ['bread']]], { iq: true }),
  R('salatairaqi', 'Iraqi salad', 'lds', 10, [['tomato', 120], ['cucumber', 120], ['onion', 30], ['parsley', 10], ['lemon', 15], ['oliveoil', 5], ['lettuce', 30, 1]],
    [['chop', ['tomato', 'cucumber', 'onion', 'parsley', 'lettuce']], ['season', ['lemon', 'oliveoil']], 'mix'], { iq: true, tip: 'light' }),
  R('yaprakh', 'Vine-leaf dolma (yaprakh)', 'l', 100, [['vineleaves', 40], ['rice', 60], ['minced', 40], ['onion', 40], ['tomato', 60], ['tomatopaste', 10], ['lemon', 15], ['oil', 10], ['garlic', 3, 1]],
    ['stuffing', ['rollLeaves'], 'dolmaPot', 'flip'], { iq: true }),
  R('dijajmahshi', 'Stuffed roast chicken (dijaj mahshi)', 'l', 120, [['chicken', 200], ['rice', 50], ['minced', 30], ['almonds', 10], ['raisins', 10], ['baharat', 1], ['oil', 5]],
    ['soak', ['saute', 10, ['minced', 'rice', 'almonds', 'raisins', 'baharat']], ['stuffChicken'], ['bakeAt', 190, 90]], { iq: true }),
  R('shifta', 'Shifta (baked meat patties with potatoes)', 'ld', 60, [['minced', 120], ['onion', 30], ['parsley', 10], ['baharat', 1], ['potato', 150], ['tomato', 100], ['tomatopaste', 10], ['oil', 5]],
    [['knead', ['minced', 'onion', 'parsley', 'baharat']], ['patties'], ['layer', ['potato', 'tomato', 'tomatopaste']], ['bakeAt', 200, 40]], { iq: true, tip: 'bake' }),
  R('sambusa', 'Baked meat sambusa', 'ds', 45, [['flour', 40], ['minced', 50], ['onion', 30], ['parsley', 5], ['baharat', 1], ['oil', 8]],
    [['knead', ['flour', 'oil']], ['saute', 10, ['minced', 'onion', 'parsley', 'baharat']], ['foldTriangles'], ['bakeAt', 200, 20]], { iq: true, tip: 'bake' }),
  R('burghulhummus', 'Bulgur with chickpeas (burghul bil-hummus)', 'ld', 30, [['bulgur', 70], ['chickpeas', 60], ['onion', 30], ['tomatopaste', 10], ['oil', 10]],
    ['fryOnion', ['stirIn', ['tomatopaste', 'chickpeas']], 'bulgur'], { iq: true, tip: 'fibre' }),
  R('kleicha', 'Date kleicha (lighter)', 's', 60, [['wholewheatflour', 30], ['datepaste', 25], ['butter', 8], ['milk', 10], ['cardamom', 0.5], ['sesame', 2, 1]],
    [['knead', ['wholewheatflour', 'butter', 'milk', 'cardamom']], ['kleicha'], ['top', ['sesame']], ['bakeAt', 180, 20]], { iq: true, tip: 'treat' }),
  R('fishtamarind', 'Fish in tamarind sauce', 'ld', 40, [['fish', 200], ['tamarind', 15], ['onion', 40], ['tomato', 80], ['garlic', 3], ['turmeric', 1], ['oil', 10], ['rice', 80, 1]],
    ['fish', ['saute', 8, ['onion', 'garlic', 'turmeric']], ['simmer', 15, ['tomato', 'tamarind']], ['serveWith', ['rice']]], { iq: true, tip: 'fish' }),
  // ---- 14.0: more Iraqi and Arab cooking, the gym kitchen, Indian and Western favourites ----
  R('dawoodbasha', 'Dawood Basha (meatballs in tomato sauce)', 'ld', 50, [['minced', 130], ['onion', 40], ['tomato', 150], ['tomatopaste', 15], ['garlic', 3], ['oil', 10], ['baharat', 2], ['rice', 70, 1]],
    ['balls', 'brownBalls', ['saute', 5, ['onion', 'garlic']], 'dbSauce', ['serveWith', ['rice']]], { iq: true }),
  R('burghuldijaj', 'Bulgur with chicken (burghul w dijaj)', 'ld', 45, [['chicken', 150], ['bulgur', 70], ['onion', 40], ['tomatopaste', 10], ['oil', 8], ['baharat', 2]],
    [['boilFor', 30, ['chicken', 'onion', 'baharat']], ['saute', 3, ['bulgur', 'tomatopaste']], 'bulgurBroth', 'bulgurChicken'], { iq: true, tip: 'fibre' }),
  R('molokhiachicken', 'Molokhia with chicken and rice', 'l', 60, [['chicken', 150], ['molokhia', 150], ['onion', 30], ['garlic', 5], ['oil', 8], ['rice', 70]],
    [['boilFor', 40, ['chicken', 'onion']], ['simmer', 10, ['molokhia']], 'molokhiaGarlic', 'cookRice', ['serveWith', ['rice', 'chicken']]]),
  R('koshari', 'Koshari', 'l', 50, [['lentils', 30], ['rice', 40], ['pasta', 30], ['chickpeas', 40], ['onion', 60], ['tomato', 60], ['tomatopaste', 15], ['garlic', 3], ['cumin', 1], ['oil', 15]],
    [['boilFor', 20, ['lentils']], 'cookRice', 'pasta', 'fryOnionsCrispy', ['simmer', 10, ['tomato', 'tomatopaste', 'garlic', 'cumin']], 'koshariLayer'], { tip: 'fibre' }),
  R('fatteh', 'Hummus fatteh', 'bld', 20, [['bread', 60], ['chickpeas', 120], ['yogurt', 120], ['tahini', 15], ['garlic', 3], ['lemon', 10], ['almonds', 10, 1]],
    ['crispBread', ['mix', ['yogurt', 'tahini', 'garlic', 'lemon']], 'fattehLayer']),
  R('muhammara', 'Muhammara (red pepper and walnut dip)', 'sd', 15, [['pepper', 60], ['walnuts', 15], ['bread', 8], ['oliveoil', 5], ['dibis', 3], ['cumin', 0.5], ['lemon', 5]],
    ['roastPeppers', ['blend', ['pepper', 'walnuts', 'bread', 'oliveoil', 'dibis', 'cumin', 'lemon']], ['top', ['oliveoil']]]),
  R('greeksalad', 'Greek salad', 'ld', 10, [['tomato', 120], ['cucumber', 100], ['pepper', 40], ['onion', 30], ['olives', 20], ['whitecheese', 40], ['oliveoil', 10]],
    [['chop', ['tomato', 'cucumber', 'pepper', 'onion']], ['top', ['whitecheese', 'olives']], 'dressing'], { tip: 'light' }),
  R('butterchicken', 'Butter chicken', 'ld', 40, [['chickenbreast', 150], ['yogurt', 50], ['tomato', 100], ['tomatopaste', 20], ['butter', 10], ['cream', 30], ['garlic', 3], ['ginger', 3], ['baharat', 2], ['rice', 70, 1]],
    [['marinate', 30, ['chickenbreast', 'yogurt', 'baharat']], ['grillFor', 10], 'butterSauce', ['serveWith', ['rice']]]),
  R('dal', 'Dal (lentil curry)', 'ld', 30, [['lentils', 60], ['onion', 40], ['tomato', 60], ['garlic', 3], ['turmeric', 1], ['cumin', 1], ['oil', 8], ['rice', 70, 1]],
    ['rinse', ['simmer', 20, ['lentils', 'onion', 'tomato', 'turmeric']], 'dalTemper', ['serveWith', ['rice']]], { tip: 'fibre' }),
  R('friedrice', 'Egg fried rice', 'ld', 25, [['rice', 70], ['egg', 50], ['peas', 40], ['carrot', 30], ['onion', 20], ['soysauce', 10], ['oil', 10]],
    ['cookRice', 'friedRiceEgg', 'stirFryHigh', ['stirIn', ['soysauce']]]),
  R('minestrone', 'Minestrone (vegetable and bean soup)', 'ld', 40, [['carrot', 40], ['celery', 30], ['onion', 30], ['zucchini', 50], ['tomato', 100], ['whitebeans', 60], ['pasta', 20], ['garlic', 3], ['oliveoil', 7]],
    [['chop', ['carrot', 'celery', 'onion', 'zucchini']], ['saute', 5, ['onion', 'carrot', 'celery', 'garlic']], ['simmer', 20, ['tomato', 'zucchini', 'whitebeans']], ['stirIn', ['pasta']], ['serveHot']], { tip: 'light' }),
  R('mashedpotato', 'Mashed potatoes', 'ld', 25, [['potato', 200], ['milk', 40], ['butter', 10]],
    [['boilFor', 20, ['potato']], ['mash', ['potato', 'milk', 'butter']]]),
  R('avocadotoast', 'Avocado toast', 'bs', 5, [['wholebread', 70], ['avocado', 70], ['lemon', 5], ['egg', 50, 1]],
    ['toastAvocado', ['top', ['egg']]]),
  R('frenchtoast', 'French toast (2 slices)', 'b', 15, [['wholebread', 70], ['egg', 50], ['milk', 60], ['butter', 7], ['cinnamon', 1], ['honey', 10, 1]],
    [['whisk', ['egg', 'milk', 'cinnamon']], 'soakBread', 'panFry', ['top', ['honey']]], { tip: 'sugar' }),
  // the gym kitchen
  R('mealprep', 'Chicken, rice and broccoli (meal prep)', 'ld', 30, [['chickenbreast', 150], ['rice', 70], ['broccoli', 100], ['oil', 5], ['garlic', 3], ['lemon', 10, 1]],
    [['marinate', 10, ['chickenbreast', 'garlic', 'lemon']], 'cookRice', ['grillFor', 12], ['boilFor', 4, ['broccoli']], 'boxUp'], { fit: true, tip: 'prep' }),
  R('chickenveg', 'Grilled chicken with vegetables', 'ld', 25, [['chickenbreast', 180], ['pepper', 60], ['zucchini', 80], ['onion', 30], ['oliveoil', 7], ['lemon', 10], ['garlic', 3]],
    [['marinate', 10, ['chickenbreast', 'lemon', 'garlic']], ['chop', ['pepper', 'zucchini', 'onion']], ['grillFor', 12], 'grillVeg'], { fit: true, tip: 'protein' }),
  R('salmonquinoa', 'Salmon with quinoa and greens', 'ld', 25, [['salmon', 150], ['quinoa', 50], ['spinach', 40], ['lemon', 10], ['oliveoil', 5]],
    ['cookQuinoa', 'fish', ['serveWith', ['quinoa', 'spinach', 'lemon']]], { fit: true, tip: 'fish' }),
  R('quinoasalad', 'Quinoa salad', 'ld', 20, [['quinoa', 50], ['cucumber', 60], ['tomato', 60], ['parsley', 15], ['lemon', 15], ['oliveoil', 8], ['chickpeas', 50, 1]],
    ['cookQuinoa', ['chop', ['cucumber', 'tomato', 'parsley']], ['mix', ['quinoa', 'cucumber', 'tomato', 'parsley', 'chickpeas']], 'dressing'], { fit: true, tip: 'fibre' }),
  R('proteinpancakes', 'Protein pancakes (oats, eggs, banana)', 'b', 15, [['oats', 40], ['egg', 100], ['banana', 60], ['milk', 50], ['whey', 15, 1]],
    [['blend', ['oats', 'egg', 'banana', 'milk', 'whey']], 'panFry'], { fit: true, tip: 'protein' }),
  R('parfait', 'Greek yogurt parfait with berries', 'bs', 5, [['greekyogurt', 170], ['berries', 70], ['granola', 30], ['honey', 7, 1]],
    ['layerJar', ['top', ['granola', 'honey']]], { fit: true, tip: 'protein' }),
  R('overnightoats', 'Overnight oats', 'b', 5, [['oats', 50], ['milk', 150], ['yogurt', 50], ['chia', 10], ['banana', 60], ['honey', 7, 1]],
    [['mix', ['oats', 'milk', 'yogurt', 'chia']], 'overnight', ['top', ['banana', 'honey']]], { fit: true, tip: 'fibre' }),
  R('tunawrap', 'Tuna wrap', 'ld', 10, [['tortilla', 60], ['tuna', 100], ['greekyogurt', 30], ['lettuce', 30], ['tomato', 50], ['lemon', 5]],
    [['mix', ['tuna', 'greekyogurt', 'lemon']], 'wrapRoll'], { fit: true, tip: 'protein' }),
  R('stirfry', 'Chicken stir-fry with vegetables', 'ld', 20, [['chickenbreast', 150], ['pepper', 60], ['carrot', 40], ['broccoli', 60], ['soysauce', 15], ['garlic', 3], ['ginger', 3], ['oil', 10], ['rice', 60, 1]],
    [['slice', ['chickenbreast', 'pepper', 'carrot']], 'stirFryHigh', ['stirIn', ['soysauce']], ['serveWith', ['rice']]], { fit: true, tip: 'protein' }),
  R('lentilsalad', 'Lentil salad', 'ld', 30, [['lentils', 60], ['cucumber', 60], ['tomato', 60], ['onion', 20], ['parsley', 15], ['lemon', 15], ['oliveoil', 8]],
    [['boilFor', 15, ['lentils']], ['chop', ['cucumber', 'tomato', 'onion', 'parsley']], ['mix', ['lentils', 'cucumber', 'tomato', 'onion', 'parsley']], 'dressing'], { fit: true, tip: 'fibre' }),
  R('chickpeasalad', 'Chickpea salad', 'ld', 10, [['chickpeas', 150], ['cucumber', 60], ['tomato', 60], ['onion', 20], ['parsley', 15], ['lemon', 15], ['oliveoil', 8]],
    [['chop', ['cucumber', 'tomato', 'onion', 'parsley']], ['mix', ['chickpeas', 'cucumber', 'tomato', 'onion', 'parsley']], 'dressing'], { fit: true, tip: 'fibre' }),
  R('eggmuffins', 'Egg muffins with vegetables (3)', 'bs', 30, [['egg', 150], ['spinach', 30], ['pepper', 30], ['onion', 20], ['cheddar', 10, 1]],
    [['chop', ['spinach', 'pepper', 'onion']], ['whisk', ['egg']], 'muffinTin', ['bakeAt', 180, 20]], { fit: true, tip: 'protein' }),
  R('tunapasta', 'Tuna pasta salad', 'ld', 20, [['pasta', 70], ['tuna', 80], ['corn', 40], ['cucumber', 40], ['greekyogurt', 30], ['lemon', 10]],
    ['pasta', ['mix', ['pasta', 'tuna', 'corn', 'cucumber', 'greekyogurt', 'lemon']], ['chill', 20]], { fit: true, tip: 'protein' }),
  R('pokebowl', 'Salmon poke bowl', 'ld', 25, [['rice', 70], ['salmon', 100], ['avocado', 40], ['cucumber', 50], ['soysauce', 10], ['sesame', 3], ['carrot', 30, 1]],
    ['cookRice', ['slice', ['salmon', 'avocado', 'cucumber', 'carrot']], 'bowlBuild', ['top', ['sesame', 'soysauce']]], { fit: true, tip: 'fish' }),
  R('burritobowl', 'Chicken burrito bowl', 'ld', 30, [['rice', 60], ['chickenbreast', 120], ['kidneybeans', 80], ['corn', 40], ['tomato', 50], ['lettuce', 30], ['lemon', 5], ['cheddar', 15, 1]],
    ['cookRice', ['grillFor', 12], ['slice', ['chickenbreast', 'tomato', 'lettuce']], 'bowlBuild'], { fit: true, tip: 'protein' }),
  R('smoothiebowl', 'Smoothie bowl', 'bs', 5, [['banana', 120], ['berries', 100], ['yogurt', 100], ['granola', 20], ['chia', 5, 1]],
    [['blend', ['banana', 'berries', 'yogurt']], ['top', ['granola', 'chia']]], { fit: true }),
]
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]))

const num = v => (Number.isFinite(+v) ? +v : 0)
const r0 = v => Math.round(v)
const r1 = v => Math.round(v * 10) / 10

/** Nutrition of ingredient amounts [{ id, g }]: { kcal, p, c, f, g, na (sodium mg) }. Unknown ids are skipped. */
export function itemsTotals(items) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, g: 0, na: 0 }
  for (const it of items || []) {
    const x = ING_BY_ID[it.id]
    const g = num(it.g)
    if (!x || g <= 0) continue
    t.kcal += x.kcal * g / 100; t.p += x.p * g / 100; t.c += x.c * g / 100; t.f += x.f * g / 100; t.g += g; t.na += (x.na || 0) * g / 100
  }
  return { kcal: r0(t.kcal), p: r1(t.p), c: r1(t.c), f: r1(t.f), g: r0(t.g), na: r0(t.na) }
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
 * 14.0 — "My cooking": a dish can also keep its steps (sentences), its minutes, a note and `ph`
 * (it has a photo on this device, lib/dishPhotos.js); left out, an edited dish keeps its own.
 */
export function saveBuiltMeal(s, { id, n, items, servings = 1, meal = null, steps, min, note, ph }) {
  const name = String(n || '').trim().slice(0, 60)
  if (!name) throw Object.assign(new Error('Give it a name'), { key: 'Give it a name' })
  const list = (items || []).filter(i => ING_BY_ID[i.id] && num(i.g) > 0).map(i => ({ id: i.id, g: r0(num(i.g)) }))
  if (!list.length) throw Object.assign(new Error('Add at least one ingredient.'), { key: 'Add at least one ingredient.' })
  const sv = Math.min(12, Math.max(1, r0(num(servings)) || 1))
  const tot = itemsTotals(list)
  const prev = id ? (s.customFoods || []).find(x => x.id === id) : null
  const more = {}
  const st = steps !== undefined ? steps : prev && prev.steps
  const cleanSteps = Array.isArray(st) ? st.map(x => String(x || '').trim().slice(0, 300)).filter(Boolean).slice(0, 30) : []
  if (cleanSteps.length) more.steps = cleanSteps
  const mm = num(min !== undefined ? min : prev && prev.min)
  if (mm > 0) more.min = Math.min(600, r0(mm))
  const nt = String((note !== undefined ? note : prev && prev.note) || '').trim().slice(0, 500)
  if (nt) more.note = nt
  if (ph !== undefined ? ph : prev && prev.ph) more.ph = true
  const food = { id: id || 'cf' + uid(), n: name, kcal: r0(tot.kcal / sv), p: r1(tot.p / sv), c: r1(tot.c / sv), f: r1(tot.f / sv), unit: 'serving', g: r0(tot.g / sv), custom: true, cat: 'mine', items: list, servings: sv, ...(meal ? { meal } : {}), ...more }
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
