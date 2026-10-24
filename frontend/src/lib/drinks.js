// 9.0 — Drinks & juices: a library of healthy drinks (weight loss, digestion, energy, protein,
// immunity, sleep, hydration and Iraqi classics) whose calories are worked out from their
// ingredients, plus your own drinks built from the same ingredient table.
//
// Accuracy notes
//   · every ingredient has kcal / protein / carbs / fat / sugar per 100 g and a density, so any
//     amount in g, ml, tsp, tbsp, cup or pieces converts to grams the same way
//   · juices are separate ingredients (orange juice ≠ oranges: pressing leaves the pulp behind)
//   · steeped things (tea leaves, herbs, cinnamon sticks, ginger slices, infused fruit) only
//     give a fraction of their calories to the water — a recipe row can carry that share
//   · optional rows (sugar, honey…) are off by default and shown as "+N kcal"
//
// Names, steps and notes are English source strings translated with t(); steps are templates
// (lib/recipeText.js).
//
// State (all optional):
//   S.myDrinks   = [{ id, n (name), col, t ('h'|'c'), sv (serves), ing: [[id, amount, unit]], at }]
//   S.drinkFavs  = [drink ids]
//   S.drinkLog   = { 'YYYY-MM-DD': [{ id, at }] }  (recent drinks; the calories live in S.food)
import { uid } from './format.js'

// ---- ingredient table ------------------------------------------------------------------------
export const DING_CATS = [
  { key: 'liquid', name: 'Water & bases', icon: 'drop', color: 'var(--blue)' },
  { key: 'tea', name: 'Tea, coffee & herbs', icon: 'cup', color: 'var(--brown, #a2845e)' },
  { key: 'dairy', name: 'Milk & yogurt', icon: 'drop', color: 'var(--teal)' },
  { key: 'juice', name: 'Juices', icon: 'apple', color: 'var(--orange)' },
  { key: 'fruit', name: 'Fruit', icon: 'apple', color: 'var(--pink)' },
  { key: 'veg', name: 'Vegetables & greens', icon: 'leafy', color: 'var(--green)' },
  { key: 'spice', name: 'Spices', icon: 'sparkles', color: 'var(--yellow)' },
  { key: 'sweet', name: 'Sweeteners', icon: 'heart', color: 'var(--red)' },
  { key: 'nuts', name: 'Nuts & seeds', icon: 'circle', color: 'var(--brown, #a2845e)' },
  { key: 'grain', name: 'Oats, grains & powders', icon: 'sparkles', color: 'var(--indigo)' },
]

// [id, cat, name, kcal, protein, carbs, fat, sugar (per 100 g), density g/ml, default unit,
//  'unit:grams,…', water share of the weight, flags]   flags: m dairy · n nuts · c caffeine · P keep capitals
const ROWS = [
  ['water', 'liquid', 'Water', 0, 0, 0, 0, 0, 1, 'ml', 'cup:240', 1, ''],
  ['sparkling', 'liquid', 'Sparkling water', 0, 0, 0, 0, 0, 1, 'ml', 'cup:240', 1, ''],
  ['coconutwater', 'liquid', 'Coconut water', 19, 0.7, 3.7, 0.2, 2.6, 1.02, 'ml', 'cup:240', 0.95, ''],
  ['ice', 'liquid', 'Ice', 0, 0, 0, 0, 0, 0.92, 'g', 'cup:150,piece:25', 1, ''],
  ['rosewater', 'liquid', 'Rose water', 0, 0, 0, 0, 0, 1, 'tsp', 'tsp:5,tbsp:15', 1, ''],
  ['acv', 'liquid', 'Apple cider vinegar', 21, 0, 0.9, 0, 0.4, 1.01, 'tbsp', 'tbsp:15,tsp:5', 0.94, ''],
  ['coffee', 'tea', 'Coffee (brewed)', 1, 0.1, 0, 0, 0, 1, 'ml', 'cup:240', 1, 'c'],
  ['arabiccoffee', 'tea', 'Arabic coffee (brewed)', 2, 0.1, 0.3, 0, 0, 1, 'ml', 'cup:240', 1, 'cP'],
  ['instantcoffee', 'tea', 'Instant coffee', 353, 12.2, 75.4, 0.5, 0, 0.4, 'tsp', 'tsp:1.8', 0, 'c'],
  ['blacktea', 'tea', 'Black tea', 300, 20, 60, 2, 0, 0.4, 'tsp', 'tsp:2,bag:2', 0, 'c'],
  ['greentea', 'tea', 'Green tea', 300, 22, 60, 2, 0, 0.4, 'tsp', 'tsp:2,bag:2', 0, 'c'],
  ['chamomile', 'tea', 'Chamomile', 230, 5, 45, 2, 0, 0.3, 'bag', 'bag:1.5,tsp:1', 0, ''],
  ['hibiscus', 'tea', 'Hibiscus (karkade)', 240, 5, 50, 1, 0, 0.4, 'tbsp', 'tbsp:4,tsp:1.3', 0, ''],
  ['driedlime', 'tea', 'Dried lime (noomi Basra)', 250, 4, 60, 1, 4, 0.4, 'piece', 'piece:6', 0, ''],
  ['liquorice', 'tea', 'Liquorice root', 350, 5, 80, 1, 10, 0.5, 'tbsp', 'tbsp:7', 0, ''],
  ['milk', 'dairy', 'Milk', 61, 3.2, 4.8, 3.3, 5.1, 1.03, 'ml', 'cup:247', 0.88, 'm'],
  ['lowfatmilk', 'dairy', 'Low-fat milk', 42, 3.4, 5, 1, 5, 1.03, 'ml', 'cup:247', 0.89, 'm'],
  ['yogurt', 'dairy', 'Yogurt', 61, 3.5, 4.7, 3.3, 4.7, 1.04, 'g', 'cup:245,tbsp:15', 0.85, 'm'],
  ['greekyogurt', 'dairy', 'Greek yogurt', 73, 10, 3.9, 1.9, 3.6, 1.1, 'g', 'cup:245,tbsp:18', 0.8, 'mP'],
  ['kefir', 'dairy', 'Kefir', 41, 3.8, 4.5, 1, 4.6, 1.03, 'ml', 'cup:243', 0.88, 'm'],
  ['almondmilk', 'dairy', 'Almond milk', 15, 0.6, 0.6, 1.2, 0, 1.02, 'ml', 'cup:244', 0.97, 'n'],
  ['oatmilk', 'dairy', 'Oat milk', 48, 1, 6.7, 1.5, 3, 1.03, 'ml', 'cup:244', 0.9, ''],
  ['orangejuice', 'juice', 'Orange juice', 45, 0.7, 10.4, 0.2, 8.4, 1.04, 'ml', 'cup:248', 0.88, ''],
  ['lemonjuice', 'juice', 'Lemon juice', 22, 0.35, 6.9, 0.24, 2.5, 1.03, 'ml', 'tbsp:15,tsp:5', 0.92, ''],
  ['limejuice', 'juice', 'Lime juice', 25, 0.4, 8.4, 0.1, 1.7, 1.03, 'ml', 'tbsp:15,tsp:5', 0.9, ''],
  ['pomegranatejuice', 'juice', 'Pomegranate juice', 54, 0.15, 13.1, 0.3, 12.7, 1.05, 'ml', 'cup:249', 0.86, ''],
  ['applejuice', 'juice', 'Apple juice', 46, 0.1, 11.3, 0.1, 9.6, 1.04, 'ml', 'cup:248', 0.88, ''],
  ['carrotjuice', 'juice', 'Carrot juice', 40, 0.95, 9.3, 0.15, 3.9, 1.03, 'ml', 'cup:236', 0.89, ''],
  ['beetjuice', 'juice', 'Beet juice', 44, 1, 10, 0.1, 8, 1.04, 'ml', 'cup:240', 0.88, ''],
  ['grapefruitjuice', 'juice', 'Grapefruit juice', 39, 0.5, 9.2, 0.1, 7, 1.04, 'ml', 'cup:247', 0.9, ''],
  ['pineapplejuice', 'juice', 'Pineapple juice', 53, 0.4, 12.9, 0.1, 10, 1.05, 'ml', 'cup:250', 0.86, ''],
  ['cherryjuice', 'juice', 'Tart cherry juice', 50, 0.4, 12.3, 0.1, 11, 1.05, 'ml', 'cup:240', 0.86, ''],
  ['sugarcanejuice', 'juice', 'Sugarcane juice', 58, 0.2, 15, 0, 14, 1.06, 'ml', 'cup:240', 0.84, ''],
  ['tomatojuice', 'juice', 'Tomato juice', 17, 0.9, 3.5, 0.3, 2.6, 1.03, 'ml', 'cup:243', 0.94, ''],
  ['banana', 'fruit', 'Bananas', 89, 1.1, 23, 0.3, 12.2, 0.6, 'piece', 'piece:120,cup:150', 0.75, ''],
  ['apple', 'fruit', 'Apples', 52, 0.3, 14, 0.2, 10.4, 0.6, 'piece', 'piece:180,cup:125', 0.86, ''],
  ['dates', 'fruit', 'Dates', 282, 2.5, 75, 0.4, 63, 0.7, 'piece', 'piece:8', 0, ''],
  ['strawberries', 'fruit', 'Strawberries', 32, 0.7, 7.7, 0.3, 4.9, 0.6, 'g', 'cup:150,piece:12', 0.91, ''],
  ['berries', 'fruit', 'Mixed berries', 48, 0.8, 11.5, 0.4, 7, 0.6, 'g', 'cup:150', 0.85, ''],
  ['mango', 'fruit', 'Mango', 60, 0.8, 15, 0.4, 13.7, 0.65, 'g', 'cup:165,piece:200', 0.83, ''],
  ['pineapple', 'fruit', 'Pineapple', 50, 0.5, 13.1, 0.1, 9.9, 0.65, 'g', 'cup:165', 0.86, ''],
  ['watermelon', 'fruit', 'Watermelon', 30, 0.6, 7.6, 0.2, 6.2, 0.62, 'g', 'cup:152', 0.92, ''],
  ['melon', 'fruit', 'Melon', 34, 0.8, 8.2, 0.2, 7.9, 0.65, 'g', 'cup:160', 0.9, ''],
  ['orange', 'fruit', 'Oranges', 47, 0.9, 11.8, 0.1, 9.4, 0.6, 'piece', 'piece:130', 0.87, ''],
  ['kiwi', 'fruit', 'Kiwi', 61, 1.1, 14.7, 0.5, 9, 0.65, 'piece', 'piece:70', 0.83, ''],
  ['pomegranate', 'fruit', 'Pomegranate seeds', 83, 1.7, 18.7, 1.2, 13.7, 0.7, 'g', 'cup:174', 0.78, ''],
  ['pear', 'fruit', 'Pears', 57, 0.4, 15.2, 0.1, 9.8, 0.6, 'piece', 'piece:180', 0.84, ''],
  ['peach', 'fruit', 'Peaches', 39, 0.9, 9.5, 0.3, 8.4, 0.6, 'piece', 'piece:150', 0.89, ''],
  ['papaya', 'fruit', 'Papaya', 43, 0.5, 10.8, 0.3, 7.8, 0.6, 'g', 'cup:145', 0.88, ''],
  ['avocado', 'fruit', 'Avocado', 160, 2, 8.5, 14.7, 0.7, 0.65, 'piece', 'piece:150', 0.73, ''],
  ['mulberries', 'fruit', 'Mulberries', 43, 1.4, 9.8, 0.4, 8.1, 0.6, 'g', 'cup:140', 0.88, ''],
  ['grapes', 'fruit', 'Grapes', 69, 0.7, 18.1, 0.2, 15.5, 0.6, 'g', 'cup:150', 0.81, ''],
  ['cherries', 'fruit', 'Cherries', 63, 1.1, 16, 0.2, 12.8, 0.6, 'g', 'cup:140', 0.82, ''],
  ['lemon', 'fruit', 'Lemons', 29, 1.1, 9.3, 0.3, 2.5, 0.6, 'piece', 'piece:60,slice:8', 0.89, ''],
  ['lime', 'fruit', 'Limes', 30, 0.7, 10.5, 0.2, 1.7, 0.6, 'piece', 'piece:45,slice:6', 0.88, ''],
  ['qamaraldin', 'fruit', 'Qamar al-din (apricot sheet)', 319, 1.5, 80, 0.5, 70, 0.8, 'g', '', 0, 'P'],
  ['driedapricot', 'fruit', 'Dried apricots', 241, 3.4, 62.6, 0.5, 53.4, 0.7, 'piece', 'piece:8', 0, ''],
  ['raisins', 'fruit', 'Raisins', 299, 3, 79, 0.5, 59, 0.65, 'g', 'handful:30,tbsp:9', 0, ''],
  ['tamarind', 'fruit', 'Tamarind', 239, 2.8, 62.5, 0.6, 57.4, 1.2, 'g', 'tbsp:18', 0, ''],
  ['figs', 'fruit', 'Dried figs', 249, 3.3, 63.9, 0.9, 47.9, 0.7, 'piece', 'piece:8', 0, ''],
  ['cucumber', 'veg', 'Cucumbers', 15, 0.7, 3.6, 0.1, 1.7, 0.6, 'g', 'piece:120,slice:8', 0.95, ''],
  ['spinach', 'veg', 'Spinach', 23, 2.9, 3.6, 0.4, 0.4, 0.25, 'g', 'handful:30,cup:30', 0.91, ''],
  ['kale', 'veg', 'Kale', 35, 2.9, 4.4, 1.5, 1, 0.25, 'g', 'handful:20', 0.84, ''],
  ['carrot', 'veg', 'Carrots', 41, 0.9, 10, 0.2, 4.7, 0.6, 'piece', 'piece:60', 0.88, ''],
  ['beet', 'veg', 'Beetroot', 43, 1.6, 9.6, 0.2, 6.8, 0.6, 'piece', 'piece:130', 0.88, ''],
  ['celery', 'veg', 'Celery', 16, 0.7, 3, 0.2, 1.3, 0.5, 'piece', 'piece:40', 0.95, ''],
  ['tomato', 'veg', 'Tomatoes', 18, 0.9, 3.9, 0.2, 2.6, 0.6, 'piece', 'piece:120', 0.94, ''],
  ['parsley', 'veg', 'Parsley', 36, 3, 6.3, 0.8, 0.9, 0.2, 'g', 'handful:15', 0.88, ''],
  ['mint', 'veg', 'Fresh mint', 44, 3.3, 8.4, 0.7, 0, 0.2, 'g', 'handful:10', 0.86, ''],
  ['ginger', 'veg', 'Ginger', 80, 1.8, 17.8, 0.8, 1.7, 0.6, 'g', 'piece:10,tsp:2', 0.79, ''],
  ['cinnamon', 'spice', 'Cinnamon', 247, 4, 81, 1.2, 2.2, 0.5, 'tsp', 'tsp:2.6,stick:3,pinch:0.4', 0, ''],
  ['cardamom', 'spice', 'Cardamom', 311, 10.8, 68.5, 6.7, 0, 0.4, 'pod', 'pod:0.2,tsp:2', 0, ''],
  ['turmeric', 'spice', 'Turmeric', 312, 9.7, 67, 3.3, 3.2, 0.6, 'tsp', 'tsp:3,pinch:0.3', 0, ''],
  ['blackpepper', 'spice', 'Black pepper', 251, 10.4, 64, 3.3, 0.6, 0.5, 'pinch', 'pinch:0.3,tsp:2.3', 0, ''],
  ['cumin', 'spice', 'Cumin', 375, 17.8, 44.2, 22.3, 2.3, 0.4, 'tsp', 'tsp:2.1', 0, ''],
  ['fennel', 'spice', 'Fennel seeds', 345, 15.8, 52.3, 14.9, 0, 0.4, 'tsp', 'tsp:2', 0, ''],
  ['anise', 'spice', 'Anise seeds', 337, 17.6, 50, 15.9, 0, 0.4, 'tsp', 'tsp:2.1', 0, ''],
  ['fenugreek', 'spice', 'Fenugreek seeds', 323, 23, 58.4, 6.4, 0, 0.75, 'tsp', 'tsp:3.7', 0, ''],
  ['salt', 'spice', 'Salt', 0, 0, 0, 0, 0, 1.2, 'pinch', 'pinch:0.4,tsp:6', 0, ''],
  ['cocoa', 'spice', 'Cocoa powder', 228, 19.6, 57.9, 13.7, 1.8, 0.36, 'tbsp', 'tbsp:5.4,tsp:1.8', 0, ''],
  ['honey', 'sweet', 'Honey', 304, 0.3, 82, 0, 82, 1.42, 'tsp', 'tsp:7,tbsp:21', 0, ''],
  ['sugar', 'sweet', 'Sugar', 387, 0, 100, 0, 100, 0.85, 'tsp', 'tsp:4,tbsp:12.5', 0, ''],
  ['dibis', 'sweet', 'Date syrup (dibis)', 280, 1, 70, 0.1, 65, 1.35, 'tbsp', 'tbsp:20,tsp:7', 0, ''],
  ['walnuts', 'nuts', 'Walnuts', 654, 15, 14, 65, 2.6, 0.5, 'g', 'handful:30,tbsp:7', 0, 'n'],
  ['almonds', 'nuts', 'Almonds', 579, 21, 22, 50, 4.4, 0.6, 'g', 'handful:30,piece:1.2', 0, 'n'],
  ['pistachios', 'nuts', 'Pistachios', 560, 20, 27, 45, 7.7, 0.55, 'g', 'handful:30,tbsp:8', 0, 'n'],
  ['peanutbutter', 'nuts', 'Peanut butter', 588, 25, 20, 50, 9, 1.05, 'tbsp', 'tbsp:16,tsp:5', 0, 'n'],
  ['tahini', 'nuts', 'Tahini (rashi)', 595, 17, 21, 54, 0.5, 1, 'tbsp', 'tbsp:15', 0, ''],
  ['chia', 'nuts', 'Chia seeds', 486, 16.5, 42, 30.7, 0, 0.65, 'tbsp', 'tbsp:12,tsp:4', 0, ''],
  ['flax', 'nuts', 'Ground flaxseed', 534, 18.3, 28.9, 42.2, 1.6, 0.5, 'tbsp', 'tbsp:7', 0, ''],
  ['oats', 'grain', 'Oats', 389, 17, 66, 7, 1, 0.35, 'tbsp', 'tbsp:5,cup:80', 0, ''],
  ['barley', 'grain', 'Barley', 352, 9.9, 77.7, 1.2, 0.8, 0.85, 'tbsp', 'tbsp:12,cup:200', 0, ''],
  ['sahlab', 'grain', 'Sahlab powder', 360, 0.5, 88, 0.2, 20, 0.6, 'tbsp', 'tbsp:10', 0, ''],
  ['whey', 'grain', 'Whey protein', 400, 80, 10, 5, 5, 0.4, 'scoop', 'scoop:30', 0, 'm'],
  // 12.0
  ['matcha', 'tea', 'Matcha (green tea powder)', 324, 30, 39, 5, 0, 0.5, 'tsp', 'tsp:2', 0, 'c'],
  ['sage', 'tea', 'Sage (maramiya)', 315, 10.6, 60.7, 12.8, 1.7, 0.2, 'tsp', 'tsp:0.7,bag:1.5', 0, ''],
  ['thyme', 'tea', 'Thyme (zaatar)', 276, 9.1, 63.9, 7.4, 1.7, 0.3, 'tsp', 'tsp:1', 0, ''],
  ['cloves', 'spice', 'Cloves', 274, 6, 65.5, 13, 2.4, 0.5, 'piece', 'piece:0.1,tsp:2.1', 0, ''],
  ['saffron', 'spice', 'Saffron', 310, 11.4, 65.4, 5.9, 0, 0.3, 'pinch', 'pinch:0.05', 0, ''],
  ['vanilla', 'spice', 'Vanilla extract', 288, 0.1, 12.7, 0.1, 12.7, 0.88, 'tsp', 'tsp:4.2', 0, ''],
  ['soymilk', 'dairy', 'Soy milk', 38, 3, 2.5, 1.8, 1, 1.03, 'ml', 'cup:243', 0.9, ''],
  ['cranberryjuice', 'juice', 'Cranberry juice', 46, 0.4, 12.2, 0.1, 12.1, 1.04, 'ml', 'cup:253', 0.87, ''],
  ['blueberries', 'fruit', 'Blueberries', 57, 0.7, 14.5, 0.3, 10, 0.6, 'g', 'cup:148,handful:40', 0.84, ''],
  ['guava', 'fruit', 'Guava', 68, 2.6, 14.3, 1, 8.9, 0.6, 'piece', 'piece:55', 0.81, ''],
  ['apricotfresh', 'fruit', 'Fresh apricots', 48, 1.4, 11.1, 0.4, 9.2, 0.6, 'piece', 'piece:35', 0.86, ''],
  ['cashews', 'nuts', 'Cashews', 553, 18, 30, 44, 5.9, 0.55, 'g', 'handful:30', 0, 'n'],
]
const VOL = { tsp: 5, tbsp: 15, cup: 240 }
export const DING = ROWS.map(([id, cat, name, kcal, p, c, f, s, d, def, units, w, fl]) => ({
  id, cat, name, kcal, p, c, f, s, d, def, w, fl,
  u: Object.fromEntries(String(units).split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] })),
}))
export const DING_BY_ID = Object.fromEntries(DING.map(x => [x.id, x]))

/** The units an ingredient can be measured in, its default first. */
export function unitsOf(x) {
  if (!x) return ['g']
  const set = [x.def, ...Object.keys(x.u)]
  if (x.d >= 0.9) set.push('ml', 'tsp', 'tbsp', 'cup')   // liquids and dense pastes
  set.push('g')
  return [...new Set(set)]
}
/** Grams in `amount` `unit` of ingredient x (g, ml, tsp/tbsp/cup by density, or its own units). */
export function gramsOf(x, amount, unit) {
  const a = Math.max(0, +amount || 0)
  if (!x) return 0
  if (unit === 'g') return a
  if (x.u[unit]) return a * x.u[unit]
  if (unit === 'ml') return a * x.d
  if (VOL[unit]) return a * VOL[unit] * x.d
  return a * (x.u.piece || 100)
}

// ---- categories, notes, cautions ----------------------------------------------------------------
export const DRINK_CATS = [
  { key: 'loss', name: 'Weight loss', icon: 'flame', color: '#ff9f0a', desc: 'Low in calories, filling and refreshing.' },
  { key: 'digest', name: 'Digestion', icon: 'leafy', color: '#30d158', desc: 'Soothe the stomach and ease bloating.' },
  { key: 'iraqi', name: 'Iraqi classics', icon: 'palm', color: '#d4a017', desc: 'Traditional drinks from all over Iraq.' },
  { key: 'energy', name: 'Energy & pre-workout', icon: 'bolt', color: '#ffd60a', desc: 'Fuel before training or a long day.' },
  { key: 'protein', name: 'Protein & recovery', icon: 'dumbbell', color: '#ff375f', desc: 'Help your muscles recover after training.' },
  { key: 'immune', name: 'Immunity', icon: 'shield', color: '#40c8e0', desc: 'Vitamin C and antioxidants.' },
  { key: 'calm', name: 'Sleep & calm', icon: 'moon', color: '#5e5ce6', desc: 'Warm, soothing drinks for the evening.' },
  { key: 'hydrate', name: 'Hydration', icon: 'drop', color: '#0a84ff', desc: 'Flavoured water and coolers for hot days.' },
]
export const DRINK_CAT_BY_KEY = Object.fromEntries(DRINK_CATS.map(c => [c.key, c]))

export const WHEN = {
  am: 'In the morning', pre: 'Before a workout', post: 'After a workout', meal: 'Before or with a meal',
  after: 'After a meal', pm: 'In the evening', hot: 'On hot days', any: 'Any time',
}

// why an ingredient is good for you — one sentence each, shared by every drink that uses it
const NOTE = {
  ginger: 'Ginger eases nausea and helps digestion.',
  lemon: 'Lemon adds vitamin C and flavour for almost no calories.',
  mint: 'Mint soothes the stomach and freshens the breath.',
  cucumber: 'Cucumber is mostly water — hydrating and very low in calories.',
  spinach: 'Spinach brings iron, folate and fibre for very few calories.',
  greentea: 'Green tea has antioxidants and a gentle caffeine lift.',
  tea: 'Tea has antioxidants and a gentle caffeine lift.',
  cinnamon: 'Cinnamon is warming and may help steady blood sugar.',
  hibiscus: 'Hibiscus is rich in antioxidants and may help lower blood pressure.',
  probiotic: 'Yogurt and kefir bring probiotics for your gut, plus protein.',
  fennel: 'Fennel eases bloating and gas.',
  anise: 'Anise is a traditional remedy for bloating.',
  cumin: 'Cumin is traditionally used to ease indigestion.',
  fenugreek: 'Fenugreek has soluble fibre that may help digestion and blood sugar.',
  chamomile: 'Chamomile is calming — a classic before bed.',
  turmeric: 'Turmeric’s curcumin is best absorbed with a pinch of black pepper.',
  berries: 'Berries give antioxidants and fibre with little sugar.',
  banana: 'Banana gives quick energy and potassium for your muscles.',
  dates: 'Dates are natural sugar, fibre and potassium — fast fuel.',
  oats: 'Oats release their energy slowly and keep you full.',
  whey: 'Whey protein helps muscles recover and grow.',
  milk: 'Milk gives protein, calcium and fluid after training.',
  beet: 'Beetroot’s nitrates may improve endurance.',
  orange: 'Orange is full of vitamin C for your immune system.',
  carrot: 'Carrot’s beta-carotene is good for eyes and skin.',
  kiwi: 'Kiwi has more vitamin C than an orange.',
  pineapple: 'Pineapple has bromelain, an enzyme that helps digest protein.',
  papaya: 'Papaya has papain, an enzyme that aids digestion.',
  watermelon: 'Watermelon is over 90% water — perfect on hot days.',
  pomegranate: 'Pomegranate is rich in polyphenols that protect the heart.',
  tamarind: 'Tamarind is a traditional digestive and a mild laxative.',
  driedlime: 'Dried lime is tangy and traditionally used after heavy meals.',
  cardamom: 'Cardamom aids digestion and adds a lovely aroma.',
  chia: 'Chia seeds give fibre and omega-3 that keep you full longer.',
  acv: 'Vinegar may help you feel full and steady blood sugar.',
  coconutwater: 'Coconut water has natural electrolytes for rehydration.',
  cherry: 'Tart cherry may ease muscle soreness and help sleep.',
  cocoa: 'Cocoa gives flavanols and magnesium — chocolate taste without sugar.',
  peanutbutter: 'Peanut butter gives healthy fats and protein for steady energy.',
  almonds: 'Almonds bring magnesium and vitamin E.',
  walnuts: 'Walnuts have omega-3 fats for the heart and brain.',
  avocado: 'Avocado’s healthy fats keep you satisfied.',
  raisins: 'Raisins give iron and quick energy.',
  apricot: 'Apricot gives beta-carotene, potassium and fibre.',
  mulberries: 'Mulberries bring iron and vitamin C.',
  barley: 'Barley’s soluble fibre helps digestion and cholesterol.',
  celery: 'Celery is hydrating and very low in calories.',
  grapefruit: 'Grapefruit is low in calories and high in vitamin C.',
  liquorice: 'Liquorice root soothes the stomach and the throat.',
  salt: 'A pinch of salt replaces what you lose in sweat.',
  coffee: 'Coffee’s caffeine sharpens focus and helps your workout.',
  mango: 'Mango is rich in vitamins A and C.',
  strawberries: 'Strawberries give vitamin C and antioxidants with little sugar.',
  apple: 'Apple adds fibre and natural sweetness.',
  tomato: 'Tomato gives lycopene and potassium for very few calories.',
  sugarcane: 'Sugarcane juice is quick energy on a hot day.',
  figs: 'Figs bring fibre, calcium and natural sweetness.',
  // 12.0
  sage: 'Sage (maramiya) is a traditional remedy for an upset stomach.',
  thyme: 'Thyme is warming and traditionally soothes a cough.',
  cloves: 'Cloves are warming and rich in antioxidants.',
  saffron: 'Saffron is rich in antioxidants and may lift your mood.',
  soy: 'Soy milk has almost as much protein as cow’s milk — a good plant choice.',
  guava: 'Guava has even more vitamin C than kiwi.',
  cranberry: 'Cranberry is rich in antioxidants.',
  cashews: 'Cashews bring magnesium, iron and zinc.',
}
const NOTE_OF = {
  ginger: 'ginger', lemonjuice: 'lemon', lemon: 'lemon', limejuice: 'lemon', lime: 'lemon', mint: 'mint', cucumber: 'cucumber',
  spinach: 'spinach', kale: 'spinach', greentea: 'greentea', blacktea: 'tea', cinnamon: 'cinnamon', hibiscus: 'hibiscus',
  yogurt: 'probiotic', kefir: 'probiotic', greekyogurt: 'probiotic', fennel: 'fennel', anise: 'anise', cumin: 'cumin',
  fenugreek: 'fenugreek', chamomile: 'chamomile', turmeric: 'turmeric', berries: 'berries', banana: 'banana', dates: 'dates',
  oats: 'oats', whey: 'whey', milk: 'milk', lowfatmilk: 'milk', beet: 'beet', beetjuice: 'beet', orange: 'orange',
  orangejuice: 'orange', carrot: 'carrot', carrotjuice: 'carrot', kiwi: 'kiwi', pineapple: 'pineapple', pineapplejuice: 'pineapple',
  papaya: 'papaya', watermelon: 'watermelon', melon: 'watermelon', pomegranate: 'pomegranate', pomegranatejuice: 'pomegranate',
  tamarind: 'tamarind', driedlime: 'driedlime', cardamom: 'cardamom', chia: 'chia', flax: 'chia', acv: 'acv',
  coconutwater: 'coconutwater', cherryjuice: 'cherry', cherries: 'cherry', cocoa: 'cocoa', peanutbutter: 'peanutbutter',
  almonds: 'almonds', almondmilk: 'almonds', walnuts: 'walnuts', avocado: 'avocado', raisins: 'raisins', qamaraldin: 'apricot',
  driedapricot: 'apricot', mulberries: 'mulberries', barley: 'barley', celery: 'celery', grapefruitjuice: 'grapefruit',
  liquorice: 'liquorice', salt: 'salt', coffee: 'coffee', arabiccoffee: 'coffee', instantcoffee: 'coffee', mango: 'mango', strawberries: 'strawberries',
  apple: 'apple', applejuice: 'apple', tomato: 'tomato', tomatojuice: 'tomato', sugarcanejuice: 'sugarcane', figs: 'figs',
  // 12.0
  matcha: 'greentea', sage: 'sage', thyme: 'thyme', cloves: 'cloves', saffron: 'saffron', soymilk: 'soy', blueberries: 'berries',
  guava: 'guava', apricotfresh: 'apricot', cranberryjuice: 'cranberry', cashews: 'cashews',
}
export const NOTE_TEXTS = Object.values(NOTE)

export const CAUTION = {
  caffeine: 'Contains caffeine — better not late in the day.',
  bp: 'Liquorice raises blood pressure — skip it if yours is high or you are pregnant.',
  lowbp: 'Hibiscus can lower blood pressure — go easy if yours is low or you take blood-pressure pills.',
  sugar: 'High in natural sugar — keep to one glass, especially with diabetes.',
  meds: 'Grapefruit interacts with some medicines — check with your pharmacist.',
  acid: 'Always dilute vinegar and rinse your mouth afterwards to protect your teeth.',
  preg: 'Ask your doctor first if you are pregnant.',
}

// the Iraqi drinks' one-line story
const STORY = {
  shineena: 'The classic Iraqi companion to a hot lunch.',
  iraqitea: 'Strong, sweet and served in a small istikan — Iraq in a glass.',
  noomibasra: 'Tangy dried limes from Basra, loved after heavy meals.',
  datesmilk: 'Iraqi dates blended with milk — a traditional energy drink.',
  tamarhindi: 'A Ramadan favourite sold by street vendors across Iraq.',
  qamaraldin: 'Apricot sheets soaked and blended — the taste of Ramadan evenings.',
  zbeeb: 'A summer favourite in Mosul — cold and naturally sweet.',
  rumman: 'Pomegranates from Halabja and Diyala are famous across Iraq.',
  qasab: 'Freshly pressed at juice stands on hot summer days.',
  qahwa: 'Served to guests in small cups — a sign of welcome.',
  darseen: 'A warming winter drink, often topped with walnuts.',
  sahlab: 'A creamy winter treat sold hot on Baghdad’s streets.',
  sous: 'A dark, refreshing Ramadan drink poured from brass jugs.',
  rosesharbat: 'A fragrant welcome drink at weddings and feasts.',
  toot: 'Made from the mulberry trees that shade Iraqi gardens.',
  mastaw: 'A refreshing yogurt drink from the mountains of Kurdistan.',
  barleywater: 'A traditional home remedy, sipped cold through the day.',
  halba: 'A traditional warm drink for digestion.',
  anisetea: 'A soothing evening tea from grandmother’s kitchen.',
  limonnana: 'The most popular cooler in Iraqi cafés.',
  avocadodate: 'A favourite at Iraqi juice shops — thick and creamy.',
  // 11.0
  chaihaleeb: 'A milky morning tea — breakfast in many Iraqi homes.',
  chailemon: 'Tea with a squeeze of lemon — light after a heavy meal.',
  chainaana: 'Tea with fresh mint from the garden, after lunch.',
  kakao: 'Hot cocoa on cold Baghdad winter evenings.',
  haleebdibis: 'Warm milk sweetened with date syrup — a winter comfort.',
  qahwaturkiya: 'Small and strong, sipped slowly after a meal or with guests.',
  nescafe: 'The quick coffee of students and late-night studying.',
  sharbatlemon: 'Squeezed fresh at home on long, hot summer afternoons.',
  hamudhhilu: 'Sweet and sour — a Ramadan favourite poured cold at iftar.',
  purtaqal: 'Oranges from the orchards of Diyala, squeezed at the juice shop.',
  jazar: 'Freshly pressed carrots — sold in every Iraqi juice shop.',
  tuffah: 'Fresh apples blended at the juice shop.',
  inab: 'Made from the sweet grapes of Iraqi summers.',
  manga: 'Thick mango juice, a favourite at Basra’s juice stands.',
  mozhaleeb: 'The juice shop’s best seller — banana and cold milk.',
  farawlahaleeb: 'A pink favourite when strawberries are in season.',
  cocktail: 'Layers of fruit, milk and nuts — the famous Iraqi juice-shop cocktail.',
  // 12.0
  maramiya: 'A glass of sage tea after a heavy meal — a northern Iraqi habit.',
  darseenqrunful: 'The smell of Iraqi homes on cold winter nights.',
  haleebzafaran: 'Golden milk for Eid mornings and winter guests.',
  rummanleemon: 'Pomegranates from Diyala meet fresh lemon — a summer cooler.',
  raqqi: 'Ice-cold watermelon — the Iraqi summer in a glass.',
  mishmish: 'Made when the apricot trees of Iraqi gardens ripen in early summer.',
  jawafa: 'Pink, thick and fragrant — a juice-shop favourite.',
  fustuqmilk: 'Pistachios blended into cold milk, as in the sweet shops of Baghdad.',
  dibisrashimilk: 'Iraq’s favourite pair — date syrup and tahini — in a glass of milk.',
}
export const STORY_TEXTS = Object.values(STORY)

// ---- the drinks ---------------------------------------------------------------------------------
// D(id, name, cats, meta, ingredients, steps)
//   meta: t 'h' hot | 'c' cold · g glass (tall, mug, istikan, jug, finjan, shaker) · col liquid colour
//         min minutes · sv servings · w when (WHEN key) · caut [CAUTION keys]
//   ingredients: [id, amount, unit, optional?, share?]   share = part of the calories that ends up
//                in the drink (0.2 steeped / infused, 0.6 soaked and strained…)
const D = (id, name, cats, m, ing, steps) => ({
  id, name, cats, t: m.t || 'c', g: m.g || 'tall', col: m.col || '#7cc35a', min: m.min || 5, sv: m.sv || 1, w: m.w || 'any',
  caut: m.caut || [], story: STORY[id] || null,
  ing: ing.map(([i, a, u, o, x]) => ({ id: i, a, u, opt: o === 'o' || o === true, x: typeof o === 'number' ? o : (x == null ? 1 : x) })),
  steps,
})
const S = 0.2 // steeped / infused

export const DRINKS = [
  // weight loss
  D('greendetox', 'Green detox smoothie', ['loss', 'digest', 'immune'], { col: '#7cc35a', w: 'am' },
    [['spinach', 30, 'g'], ['cucumber', 120, 'g'], ['apple', 0.5, 'piece'], ['lemonjuice', 15, 'ml'], ['ginger', 5, 'g'], ['water', 150, 'ml'], ['ice', 75, 'g', 'o']],
    [['chop', ['cucumber', 'apple', 'ginger']], ['blend', ['spinach', 'cucumber', 'apple', 'lemonjuice', 'ginger', 'water']], ['blendIce'], ['serveCold']]),
  D('lemonginger', 'Warm lemon & ginger water', ['loss', 'digest'], { t: 'h', g: 'mug', col: '#f4d35e', min: 8, w: 'am' },
    [['water', 250, 'ml'], ['ginger', 10, 'g', S], ['lemonjuice', 15, 'ml'], ['honey', 1, 'tsp', 'o']],
    [['boil'], ['steep', 5, ['ginger']], ['stirIn', ['lemonjuice']], ['sweeten', ['honey']]]),
  D('cucumbermint', 'Cucumber, lemon & mint water', ['hydrate', 'loss'], { g: 'jug', col: '#cdeccf', sv: 4 },
    [['water', 1000, 'ml'], ['cucumber', 1, 'piece', S], ['lemon', 1, 'piece', S], ['mint', 10, 'g', S], ['ice', 1, 'cup', 'o']],
    [['slice', ['cucumber', 'lemon']], ['infuse', 2, ['cucumber', 'lemon', 'mint']], ['serveCold']]),
  D('greentealemon', 'Green tea with lemon', ['loss', 'energy'], { t: 'h', g: 'mug', col: '#c9d86b', w: 'am', caut: ['caffeine'] },
    [['water', 250, 'ml'], ['greentea', 1, 'bag', S], ['lemonjuice', 10, 'ml'], ['honey', 1, 'tsp', 'o']],
    [['steep', 3, ['greentea']], ['stirIn', ['lemonjuice']], ['sweeten', ['honey']]]),
  D('cinnamonhoney', 'Cinnamon & honey drink', ['loss', 'calm'], { t: 'h', g: 'mug', col: '#c8814a', min: 12, w: 'pm' },
    [['water', 250, 'ml'], ['cinnamon', 1, 'stick', S], ['honey', 1, 'tsp']],
    [['simmer', 10, ['cinnamon']], ['stirIn', ['honey']], ['serveWarm']]),
  D('acvtonic', 'Apple cider vinegar tonic', ['loss', 'digest'], { col: '#f0c987', min: 2, w: 'meal', caut: ['acid'] },
    [['water', 250, 'ml'], ['acv', 1, 'tbsp'], ['lemonjuice', 10, 'ml'], ['cinnamon', 1, 'pinch'], ['honey', 1, 'tsp', 'o']],
    [['mix', ['water', 'acv', 'lemonjuice', 'cinnamon']], ['sweeten', ['honey']], ['serveCold']]),
  D('watermelonmint', 'Watermelon & mint cooler', ['hydrate', 'loss'], { col: '#ff5e6c', w: 'hot' },
    [['watermelon', 300, 'g'], ['mint', 5, 'g'], ['limejuice', 10, 'ml'], ['ice', 75, 'g', 'o']],
    [['chop', ['watermelon']], ['blend', ['watermelon', 'mint', 'limejuice']], ['serveCold']]),
  D('grapefruitspritz', 'Grapefruit & mint spritzer', ['loss', 'immune'], { col: '#ff8c69', min: 3, w: 'am', caut: ['meds'] },
    [['grapefruitjuice', 150, 'ml'], ['sparkling', 150, 'ml'], ['mint', 3, 'g'], ['ice', 75, 'g', 'o']],
    [['mix', ['grapefruitjuice', 'mint']], ['sparkle'], ['serveCold']]),
  D('proteincoffee', 'Iced protein coffee', ['loss', 'protein', 'energy'], { col: '#8b5e3c', min: 3, w: 'am', caut: ['caffeine'] },
    [['coffee', 150, 'ml'], ['lowfatmilk', 100, 'ml'], ['whey', 0.5, 'scoop'], ['ice', 75, 'g']],
    [['shake', ['coffee', 'lowfatmilk', 'whey']], ['serveCold']]),
  D('berrykefir', 'Berry kefir smoothie', ['loss', 'digest', 'protein'], { col: '#a23b72', w: 'am' },
    [['kefir', 200, 'ml'], ['berries', 100, 'g'], ['chia', 0.5, 'tbsp'], ['honey', 1, 'tsp', 'o']],
    [['blend', ['kefir', 'berries', 'chia']], ['sweeten', ['honey']], ['serveCold']]),
  D('celeryapple', 'Celery, apple & lemon juice', ['loss', 'hydrate'], { col: '#b5d96b', min: 6, w: 'am' },
    [['celery', 2, 'piece', 0.85], ['apple', 1, 'piece', 0.85], ['lemonjuice', 15, 'ml'], ['ginger', 5, 'g'], ['water', 100, 'ml']],
    [['chop', ['celery', 'apple', 'ginger']], ['blend', ['celery', 'apple', 'lemonjuice', 'ginger', 'water']], ['strain'], ['serveCold']]),
  D('icedhibiscus', 'Iced hibiscus (karkade)', ['loss', 'immune'], { col: '#b0124a', min: 15, w: 'hot', caut: ['lowbp'] },
    [['water', 300, 'ml'], ['hibiscus', 1, 'tbsp', S], ['lemonjuice', 10, 'ml'], ['honey', 1, 'tsp', 'o'], ['ice', 75, 'g', 'o']],
    [['steep', 10, ['hibiscus']], ['strain'], ['chill', 30], ['sweeten', ['honey']], ['serveCold']]),
  D('spicytomato', 'Spicy tomato juice', ['loss', 'immune'], { col: '#d6402d', min: 3 },
    [['tomatojuice', 250, 'ml'], ['lemonjuice', 10, 'ml'], ['celery', 0.5, 'piece'], ['blackpepper', 1, 'pinch'], ['salt', 1, 'pinch']],
    [['blend', ['tomatojuice', 'celery', 'lemonjuice']], ['stirIn', ['blackpepper', 'salt']], ['serveCold']]),
  D('chialemonade', 'Chia lemonade', ['loss', 'hydrate', 'digest'], { col: '#f6e27f', min: 12 },
    [['water', 300, 'ml'], ['lemonjuice', 30, 'ml'], ['chia', 0.5, 'tbsp'], ['honey', 1, 'tsp'], ['mint', 3, 'g', 'o']],
    [['mix', ['water', 'lemonjuice', 'honey']], ['stirIn', ['chia']], ['rest', 10], ['serveCold']]),
  D('greenpineapple', 'Green pineapple smoothie', ['loss', 'digest'], { col: '#a8d45a', w: 'am' },
    [['spinach', 30, 'g'], ['pineapple', 120, 'g'], ['cucumber', 100, 'g'], ['limejuice', 10, 'ml'], ['water', 150, 'ml'], ['ice', 75, 'g', 'o']],
    [['chop', ['pineapple', 'cucumber']], ['blend', ['spinach', 'pineapple', 'cucumber', 'limejuice', 'water']], ['serveCold']]),
  D('peachtea', 'Iced peach & green tea', ['hydrate', 'loss'], { col: '#f7b267', min: 15, w: 'hot', caut: ['caffeine'] },
    [['water', 300, 'ml'], ['greentea', 1, 'bag', S], ['peach', 0.5, 'piece', 0.85], ['ice', 75, 'g']],
    [['steep', 3, ['greentea']], ['chill', 30], ['blend', ['peach']], ['strain'], ['serveCold']]),
  // digestion
  D('gingermint', 'Ginger & mint tea', ['digest'], { t: 'h', g: 'mug', col: '#b9d58c', min: 8, w: 'after' },
    [['water', 250, 'ml'], ['ginger', 10, 'g', S], ['mint', 10, 'g', S], ['honey', 1, 'tsp', 'o']],
    [['boil'], ['steep', 7, ['ginger', 'mint']], ['strain'], ['sweeten', ['honey']]]),
  D('fenneltea', 'Fennel seed tea', ['digest', 'calm'], { t: 'h', g: 'mug', col: '#e3d6a1', min: 10, w: 'after' },
    [['water', 250, 'ml'], ['fennel', 1, 'tsp', S], ['honey', 1, 'tsp', 'o']],
    [['crush', ['fennel']], ['steep', 8, ['fennel']], ['strain'], ['sweeten', ['honey']]]),
  D('anisetea', 'Anise tea (yansoon)', ['digest', 'calm', 'iraqi'], { t: 'h', g: 'istikan', col: '#e8c97a', min: 10, w: 'pm' },
    [['water', 250, 'ml'], ['anise', 1, 'tsp', S], ['honey', 1, 'tsp', 'o']],
    [['crush', ['anise']], ['simmer', 5, ['anise']], ['strain'], ['sweeten', ['honey']]]),
  D('cuminwater', 'Cumin water (kammoun)', ['digest', 'loss'], { t: 'h', g: 'mug', col: '#c9a45c', min: 8, w: 'after' },
    [['water', 250, 'ml'], ['cumin', 1, 'tsp', S], ['lemonjuice', 5, 'ml', 'o']],
    [['simmer', 5, ['cumin']], ['strain'], ['stirIn', ['lemonjuice']], ['serveWarm']]),
  D('papayasmoothie', 'Papaya & yogurt smoothie', ['digest'], { col: '#ffa94d', w: 'am' },
    [['papaya', 150, 'g'], ['yogurt', 100, 'g'], ['limejuice', 10, 'ml'], ['honey', 1, 'tsp', 'o']],
    [['chop', ['papaya']], ['blend', ['papaya', 'yogurt', 'limejuice']], ['sweeten', ['honey']], ['serveCold']]),
  D('pineappleginger', 'Pineapple & ginger juice', ['digest', 'immune'], { col: '#ffd23f', w: 'after' },
    [['pineapple', 200, 'g'], ['ginger', 5, 'g'], ['water', 100, 'ml'], ['mint', 3, 'g', 'o'], ['ice', 75, 'g', 'o']],
    [['chop', ['pineapple', 'ginger']], ['blend', ['pineapple', 'ginger', 'water', 'mint']], ['serveCold']]),
  D('limonnana', 'Lemon & mint (limon w nana)', ['iraqi', 'digest', 'hydrate'], { col: '#bfe38a', w: 'hot' },
    [['lemonjuice', 40, 'ml'], ['mint', 10, 'g'], ['water', 250, 'ml'], ['ice', 1, 'cup'], ['sugar', 2, 'tsp', 'o']],
    [['blend', ['lemonjuice', 'mint', 'water', 'ice']], ['strain'], ['sweeten', ['sugar']], ['serveCold']]),
  D('chamomilemint', 'Chamomile & mint tea', ['calm', 'digest'], { t: 'h', g: 'mug', col: '#f3dc8a', min: 6, w: 'pm' },
    [['water', 250, 'ml'], ['chamomile', 1, 'bag', S], ['mint', 5, 'g', S], ['honey', 1, 'tsp', 'o']],
    [['steep', 5, ['chamomile', 'mint']], ['sweeten', ['honey']], ['serveHot']]),
  D('barleywater', 'Barley water (maa al-sha’ir)', ['digest', 'hydrate', 'iraqi'], { g: 'jug', col: '#efe3c2', min: 40, sv: 4 },
    [['barley', 4, 'tbsp', 0.25], ['water', 1000, 'ml'], ['lemonjuice', 30, 'ml'], ['honey', 1, 'tbsp', 'o']],
    [['wash', ['barley']], ['simmer', 30, ['barley']], ['strain'], ['stirIn', ['lemonjuice']], ['sweeten', ['honey']], ['chill', 60]]),
  D('halba', 'Fenugreek drink (halba)', ['digest', 'iraqi'], { t: 'h', g: 'istikan', col: '#d9b56b', min: 15, w: 'am', caut: ['preg'] },
    [['water', 250, 'ml'], ['fenugreek', 1, 'tsp', S], ['honey', 1, 'tsp', 'o']],
    [['simmer', 10, ['fenugreek']], ['strain'], ['sweeten', ['honey']], ['serveHot']]),
  // Iraqi classics
  D('shineena', 'Shineena (laban drink)', ['iraqi', 'digest'], { col: '#f4f1e8', min: 3, w: 'meal' },
    [['yogurt', 150, 'g'], ['water', 100, 'ml'], ['salt', 1, 'pinch'], ['mint', 2, 'g', 'o'], ['ice', 75, 'g', 'o']],
    [['whisk', ['yogurt', 'water', 'salt']], ['garnish', ['mint']], ['serveCold']]),
  D('iraqitea', 'Iraqi tea with cardamom', ['iraqi', 'energy'], { t: 'h', g: 'istikan', col: '#a0461e', min: 12, caut: ['caffeine'] },
    [['water', 150, 'ml'], ['blacktea', 1, 'tsp', S], ['cardamom', 2, 'pod', S], ['sugar', 2, 'tsp', 'o']],
    [['boil'], ['simmer', 10, ['blacktea', 'cardamom']], ['sweeten', ['sugar']], ['istikan']]),
  D('noomibasra', 'Noomi Basra (dried lime tea)', ['iraqi', 'digest', 'immune'], { t: 'h', g: 'istikan', col: '#c58a2e', min: 15, w: 'after' },
    [['water', 250, 'ml'], ['driedlime', 1, 'piece', S], ['sugar', 1, 'tsp', 'o']],
    [['pierce'], ['simmer', 10, ['driedlime']], ['strain'], ['sweeten', ['sugar']], ['istikan']]),
  D('datesmilk', 'Milk with dates (haleeb bil-tamur)', ['iraqi', 'energy'], { col: '#c9a27e', w: 'pre' },
    [['milk', 250, 'ml'], ['dates', 5, 'piece'], ['cardamom', 1, 'pod'], ['ice', 75, 'g', 'o']],
    [['pit', ['dates']], ['blend', ['milk', 'dates', 'cardamom']], ['serveCold']]),
  D('tamarhindi', 'Tamarind drink (tamur hindi)', ['iraqi', 'digest'], { col: '#7b4a26', min: 10, w: 'hot' },
    [['tamarind', 30, 'g', 0.6], ['water', 300, 'ml'], ['sugar', 2, 'tsp', 'o'], ['ice', 75, 'g', 'o']],
    [['soak', 2, ['tamarind']], ['strain'], ['sweeten', ['sugar']], ['chill', 30], ['serveCold']]),
  D('qamaraldin', 'Qamar al-din (apricot drink)', ['iraqi', 'energy'], { col: '#f39c12', min: 15, w: 'pm' },
    [['qamaraldin', 40, 'g'], ['water', 250, 'ml'], ['rosewater', 1, 'tsp', 'o'], ['ice', 75, 'g', 'o']],
    [['chop', ['qamaraldin']], ['soak', 2, ['qamaraldin']], ['blend', ['qamaraldin', 'water', 'rosewater']], ['chill', 30], ['serveCold']]),
  D('zbeeb', 'Raisin sharbat (zbeeb)', ['iraqi', 'energy'], { col: '#6b3416', min: 10, w: 'hot' },
    [['raisins', 40, 'g', 0.85], ['water', 250, 'ml'], ['ice', 75, 'g', 'o']],
    [['wash', ['raisins']], ['soak', 8, ['raisins']], ['blend', ['raisins', 'water']], ['strain'], ['serveCold']]),
  D('rumman', 'Fresh pomegranate juice', ['iraqi', 'immune'], { col: '#b3123a', min: 10 },
    [['pomegranatejuice', 250, 'ml'], ['ice', 75, 'g', 'o']],
    [['pressPom'], ['serveCold']]),
  D('qasab', 'Sugarcane juice (asir qasab)', ['iraqi', 'energy'], { col: '#c5d86d', w: 'hot', caut: ['sugar'] },
    [['sugarcanejuice', 250, 'ml'], ['lemonjuice', 5, 'ml'], ['ice', 75, 'g', 'o']],
    [['pressCane'], ['stirIn', ['lemonjuice']], ['serveCold']]),
  D('qahwa', 'Arabic coffee (qahwa)', ['iraqi', 'energy'], { t: 'h', g: 'finjan', col: '#9c7a3c', min: 15, w: 'am', caut: ['caffeine'] },
    [['arabiccoffee', 60, 'ml'], ['cardamom', 2, 'pod', S]],
    [['brewCoffee', 10], ['finjan']]),
  D('darseen', 'Cinnamon tea with walnuts (darseen)', ['iraqi', 'calm'], { t: 'h', g: 'istikan', col: '#a8552e', min: 15, w: 'pm' },
    [['water', 250, 'ml'], ['cinnamon', 2, 'stick', S], ['sugar', 1, 'tsp', 'o'], ['walnuts', 10, 'g', 'o']],
    [['simmer', 10, ['cinnamon']], ['sweeten', ['sugar']], ['top', ['walnuts']], ['istikan']]),
  D('sahlab', 'Sahlab with cinnamon', ['iraqi', 'calm'], { t: 'h', g: 'mug', col: '#f3e6cf', min: 10, w: 'pm' },
    [['milk', 250, 'ml'], ['sahlab', 1, 'tbsp'], ['sugar', 2, 'tsp'], ['cinnamon', 1, 'pinch'], ['pistachios', 5, 'g', 'o']],
    [['whisk', ['milk', 'sahlab']], ['thicken'], ['stirIn', ['sugar']], ['top', ['cinnamon', 'pistachios']], ['serveHot']]),
  D('sous', 'Liquorice drink (sous)', ['iraqi', 'digest'], { col: '#4a2c1d', min: 10, w: 'hot', caut: ['bp'] },
    [['liquorice', 1, 'tbsp', S], ['water', 300, 'ml'], ['ice', 75, 'g', 'o']],
    [['soak', 8, ['liquorice']], ['strain'], ['serveCold']]),
  D('rosesharbat', 'Rose water sharbat', ['iraqi', 'hydrate'], { col: '#f7a1c4', min: 3, w: 'hot' },
    [['water', 250, 'ml'], ['rosewater', 2, 'tsp'], ['sugar', 3, 'tsp'], ['lemonjuice', 5, 'ml'], ['ice', 75, 'g']],
    [['mix', ['water', 'rosewater', 'sugar', 'lemonjuice']], ['serveCold']]),
  D('toot', 'Mulberry sharbat (toot)', ['iraqi', 'immune'], { col: '#5c1a3c', min: 6, w: 'hot' },
    [['mulberries', 120, 'g'], ['water', 150, 'ml'], ['lemonjuice', 5, 'ml'], ['honey', 1, 'tsp', 'o'], ['ice', 75, 'g', 'o']],
    [['wash', ['mulberries']], ['blend', ['mulberries', 'water', 'lemonjuice']], ['strain'], ['sweeten', ['honey']], ['serveCold']]),
  D('mastaw', 'Mastaw (Kurdish yogurt drink)', ['iraqi', 'digest', 'hydrate'], { col: '#eef3ea', min: 4, w: 'meal' },
    [['yogurt', 150, 'g'], ['sparkling', 150, 'ml'], ['mint', 2, 'g'], ['salt', 1, 'pinch'], ['cucumber', 50, 'g', 'o'], ['ice', 75, 'g', 'o']],
    [['whisk', ['yogurt', 'salt', 'mint']], ['grate', ['cucumber']], ['sparkle'], ['serveCold']]),
  D('avocadodate', 'Avocado & date shake', ['iraqi', 'energy', 'protein'], { col: '#9fc26b', w: 'post' },
    [['avocado', 0.5, 'piece'], ['milk', 250, 'ml'], ['dates', 3, 'piece'], ['honey', 1, 'tsp', 'o'], ['almonds', 5, 'piece', 'o']],
    [['pit', ['dates']], ['blend', ['avocado', 'milk', 'dates']], ['top', ['almonds']], ['serveCold']]),
  // 11.0 — more Iraqi drinks: teas and coffee, the juice shop and the winter ones
  D('chaihaleeb', 'Tea with milk (chai haleeb)', ['iraqi', 'energy'], { t: 'h', g: 'mug', col: '#c49a6c', min: 8, w: 'am', caut: ['caffeine'] },
    [['water', 100, 'ml'], ['blacktea', 1, 'tsp', S], ['cardamom', 1, 'pod', S], ['milk', 150, 'ml'], ['sugar', 2, 'tsp', 'o']],
    [['boil'], ['simmer', 5, ['blacktea', 'cardamom']], ['stirIn', ['milk']], ['sweeten', ['sugar']], ['serveHot']]),
  D('chailemon', 'Tea with lemon (chai bil-leemon)', ['iraqi', 'digest'], { t: 'h', g: 'istikan', col: '#c46a2a', min: 8, w: 'after', caut: ['caffeine'] },
    [['water', 150, 'ml'], ['blacktea', 1, 'tsp', S], ['lemonjuice', 10, 'ml'], ['sugar', 2, 'tsp', 'o']],
    [['boil'], ['simmer', 5, ['blacktea']], ['stirIn', ['lemonjuice']], ['sweeten', ['sugar']], ['istikan']]),
  D('chainaana', 'Mint tea (chai bil-nanaa)', ['iraqi', 'digest'], { t: 'h', g: 'istikan', col: '#b5651d', min: 8, w: 'after', caut: ['caffeine'] },
    [['water', 150, 'ml'], ['blacktea', 1, 'tsp', S], ['mint', 5, 'g', S], ['sugar', 2, 'tsp', 'o']],
    [['boil'], ['simmer', 5, ['blacktea']], ['steep', 3, ['mint']], ['sweeten', ['sugar']], ['istikan']]),
  D('kakao', 'Hot cocoa with milk (kakao)', ['iraqi', 'calm'], { t: 'h', g: 'mug', col: '#7b4a2e', min: 6, w: 'pm' },
    [['milk', 250, 'ml'], ['cocoa', 1, 'tbsp'], ['sugar', 2, 'tsp', 'o'], ['cinnamon', 1, 'pinch', 'o']],
    [['heatMilk'], ['whisk', ['cocoa', 'cinnamon']], ['sweeten', ['sugar']], ['serveHot']]),
  D('haleebdibis', 'Warm milk with date syrup (haleeb w dibis)', ['iraqi', 'calm', 'energy'], { t: 'h', g: 'mug', col: '#c8a27c', min: 5, w: 'pm' },
    [['milk', 250, 'ml'], ['dibis', 1, 'tbsp'], ['cinnamon', 1, 'pinch', 'o']],
    [['heatMilk'], ['stirIn', ['dibis', 'cinnamon']], ['serveWarm']]),
  D('qahwaturkiya', 'Turkish coffee (qahwa turkiya)', ['iraqi', 'energy'], { t: 'h', g: 'finjan', col: '#4a2c1d', min: 6, w: 'am', caut: ['caffeine'] },
    [['coffee', 70, 'ml'], ['cardamom', 1, 'pod', 'o', S], ['sugar', 1, 'tsp', 'o']],
    [['brewCoffee', 3], ['sweeten', ['sugar']], ['finjan']]),
  D('nescafe', 'Nescafé with milk', ['iraqi', 'energy'], { t: 'h', g: 'mug', col: '#a9805a', min: 3, w: 'am', caut: ['caffeine'] },
    [['instantcoffee', 2, 'tsp'], ['water', 150, 'ml'], ['milk', 100, 'ml'], ['sugar', 2, 'tsp', 'o']],
    [['boil'], ['mix', ['instantcoffee', 'water', 'milk']], ['sweeten', ['sugar']], ['serveHot']]),
  D('sharbatlemon', 'Fresh lemonade (sharbat leemon)', ['iraqi', 'hydrate'], { col: '#f7e27a', min: 5, w: 'hot' },
    [['water', 250, 'ml'], ['lemonjuice', 40, 'ml'], ['sugar', 3, 'tsp'], ['ice', 75, 'g', 'o']],
    [['mix', ['water', 'lemonjuice', 'sugar']], ['serveCold']]),
  D('hamudhhilu', 'Sweet & sour drink (hamudh hilu)', ['iraqi', 'hydrate', 'digest'], { col: '#d9a54a', min: 20, w: 'hot' },
    [['water', 300, 'ml'], ['driedlime', 2, 'piece', S], ['lemonjuice', 10, 'ml'], ['sugar', 3, 'tsp'], ['ice', 75, 'g', 'o']],
    [['pierce'], ['simmer', 10, ['driedlime']], ['strain'], ['stirIn', ['lemonjuice', 'sugar']], ['chill', 30], ['serveCold']]),
  D('purtaqal', 'Fresh orange juice (asir purtaqal)', ['iraqi', 'immune'], { col: '#ff9f1a', min: 5, w: 'am' },
    [['orangejuice', 250, 'ml'], ['ice', 75, 'g', 'o']],
    [['chill', 10], ['serveCold']]),
  D('jazar', 'Fresh carrot juice (asir jazar)', ['iraqi', 'immune'], { col: '#ff7f11', min: 5, w: 'am' },
    [['carrotjuice', 250, 'ml'], ['lemonjuice', 10, 'ml', 'o'], ['ice', 75, 'g', 'o']],
    [['mix', ['carrotjuice', 'lemonjuice']], ['serveCold']]),
  D('tuffah', 'Fresh apple juice (asir tuffah)', ['iraqi', 'energy'], { col: '#e8d27a', min: 6 },
    [['apple', 2, 'piece'], ['water', 100, 'ml'], ['lemonjuice', 5, 'ml', 'o'], ['ice', 75, 'g', 'o']],
    [['chop', ['apple']], ['blend', ['apple', 'water', 'lemonjuice']], ['strain'], ['serveCold']]),
  D('inab', 'Grape juice (asir inab)', ['iraqi', 'energy'], { col: '#6b2d5c', min: 6, caut: ['sugar'] },
    [['grapes', 250, 'g'], ['water', 100, 'ml'], ['ice', 75, 'g', 'o']],
    [['wash', ['grapes']], ['blend', ['grapes', 'water']], ['strain'], ['serveCold']]),
  D('manga', 'Mango juice (asir manga)', ['iraqi', 'energy'], { col: '#ffb627', min: 5 },
    [['mango', 200, 'g'], ['water', 150, 'ml'], ['sugar', 1, 'tsp', 'o'], ['ice', 75, 'g', 'o']],
    [['peel', ['mango']], ['blend', ['mango', 'water']], ['sweeten', ['sugar']], ['serveCold']]),
  D('mozhaleeb', 'Banana milk (moz bil-haleeb)', ['iraqi', 'energy', 'protein'], { col: '#f3e3b5', min: 4, w: 'post' },
    [['milk', 250, 'ml'], ['banana', 1, 'piece'], ['sugar', 1, 'tsp', 'o'], ['ice', 75, 'g', 'o']],
    [['blend', ['milk', 'banana']], ['sweeten', ['sugar']], ['serveCold']]),
  D('farawlahaleeb', 'Strawberry milk (farawla bil-haleeb)', ['iraqi', 'energy'], { col: '#f4a6b8', min: 4 },
    [['milk', 250, 'ml'], ['strawberries', 120, 'g'], ['sugar', 2, 'tsp', 'o'], ['ice', 75, 'g', 'o']],
    [['wash', ['strawberries']], ['blend', ['milk', 'strawberries']], ['sweeten', ['sugar']], ['serveCold']]),
  D('cocktail', 'Iraqi juice cocktail (kokteil)', ['iraqi', 'energy'], { col: '#f08a5d', min: 8, w: 'hot', caut: ['sugar'] },
    [['banana', 1, 'piece'], ['strawberries', 100, 'g'], ['mango', 100, 'g'], ['milk', 150, 'ml'], ['honey', 1, 'tbsp', 'o'], ['pistachios', 10, 'g', 'o']],
    [['blend', ['banana', 'strawberries', 'mango', 'milk']], ['top', ['pistachios', 'honey']], ['serveCold']]),
  D('gingermilk', 'Milk with ginger', ['calm', 'digest'], { t: 'h', g: 'mug', col: '#ead8b1', min: 8, w: 'pm' },
    [['milk', 250, 'ml'], ['ginger', 5, 'g', 0.5], ['honey', 1, 'tsp', 'o']],
    [['simmer', 5, ['milk', 'ginger']], ['strain'], ['sweeten', ['honey']], ['serveHot']]),
  // energy & pre-workout
  D('bananacoffee', 'Banana coffee shake', ['energy'], { col: '#b38b5d', w: 'pre', caut: ['caffeine'] },
    [['coffee', 120, 'ml'], ['lowfatmilk', 120, 'ml'], ['banana', 1, 'piece'], ['oats', 3, 'tbsp'], ['ice', 75, 'g']],
    [['blend', ['coffee', 'lowfatmilk', 'banana', 'oats']], ['blendIce'], ['serveCold']]),
  D('beetorange', 'Beet & orange pre-workout', ['energy', 'immune'], { col: '#a3214a', min: 3, w: 'pre' },
    [['beetjuice', 150, 'ml'], ['orangejuice', 100, 'ml'], ['ginger', 3, 'g'], ['ice', 75, 'g', 'o']],
    [['blend', ['beetjuice', 'orangejuice', 'ginger']], ['serveCold']]),
  D('datebanana', 'Date & banana power smoothie', ['energy'], { col: '#d9b98a', w: 'pre' },
    [['banana', 1, 'piece'], ['dates', 3, 'piece'], ['almondmilk', 250, 'ml'], ['oats', 4, 'tbsp'], ['cinnamon', 1, 'pinch']],
    [['pit', ['dates']], ['blend', ['banana', 'dates', 'almondmilk', 'oats', 'cinnamon']], ['serveCold']]),
  D('electrolyte', 'Homemade electrolyte drink', ['energy', 'hydrate'], { g: 'shaker', col: '#ffe08a', min: 2, w: 'post' },
    [['water', 400, 'ml'], ['orangejuice', 60, 'ml'], ['lemonjuice', 15, 'ml'], ['honey', 2, 'tsp'], ['salt', 0.125, 'tsp']],
    [['shake', ['water', 'orangejuice', 'lemonjuice', 'honey', 'salt']], ['serveCold']]),
  D('cocoaoat', 'Cocoa & oat energy shake', ['energy', 'protein'], { col: '#6d4430', w: 'pre' },
    [['oatmilk', 250, 'ml'], ['cocoa', 1, 'tbsp'], ['banana', 0.5, 'piece'], ['dates', 2, 'piece'], ['ice', 75, 'g', 'o']],
    [['pit', ['dates']], ['blend', ['oatmilk', 'cocoa', 'banana', 'dates']], ['serveCold']]),
  D('mangolassi', 'Light mango lassi', ['energy', 'digest'], { col: '#ffb627', w: 'post' },
    [['mango', 150, 'g'], ['yogurt', 150, 'g'], ['water', 50, 'ml'], ['cardamom', 1, 'pod'], ['honey', 1, 'tsp', 'o']],
    [['blend', ['mango', 'yogurt', 'water', 'cardamom']], ['sweeten', ['honey']], ['serveCold']]),
  D('strawberrybanana', 'Strawberry & banana smoothie', ['energy', 'immune'], { col: '#ff6b81', w: 'am' },
    [['strawberries', 150, 'g'], ['banana', 0.5, 'piece'], ['lowfatmilk', 200, 'ml'], ['honey', 1, 'tsp', 'o']],
    [['chop', ['strawberries', 'banana']], ['blend', ['strawberries', 'banana', 'lowfatmilk']], ['sweeten', ['honey']], ['serveCold']]),
  D('figmilk', 'Fig & walnut milk', ['energy', 'calm'], { col: '#b98b6a', w: 'pre' },
    [['milk', 250, 'ml'], ['figs', 3, 'piece'], ['walnuts', 10, 'g'], ['cinnamon', 1, 'pinch']],
    [['soak', 1, ['figs']], ['blend', ['milk', 'figs', 'walnuts', 'cinnamon']], ['serveCold']]),
  // protein & recovery
  D('pbbanana', 'Peanut butter banana protein shake', ['protein', 'energy'], { g: 'shaker', col: '#c89f6a', min: 4, w: 'post' },
    [['milk', 250, 'ml'], ['banana', 1, 'piece'], ['peanutbutter', 1, 'tbsp'], ['whey', 1, 'scoop'], ['ice', 75, 'g', 'o']],
    [['blend', ['milk', 'banana', 'peanutbutter', 'whey']], ['serveCold']]),
  D('chocrecovery', 'Chocolate recovery milk', ['protein'], { col: '#7a4b31', min: 3, w: 'post' },
    [['lowfatmilk', 300, 'ml'], ['cocoa', 1, 'tbsp'], ['dates', 2, 'piece'], ['cinnamon', 1, 'pinch']],
    [['pit', ['dates']], ['blend', ['lowfatmilk', 'cocoa', 'dates', 'cinnamon']], ['serveCold']]),
  D('greekberry', 'Greek yogurt berry shake', ['protein', 'loss'], { col: '#c04a7a', min: 4, w: 'post' },
    [['greekyogurt', 170, 'g'], ['berries', 100, 'g'], ['lowfatmilk', 100, 'ml'], ['honey', 1, 'tsp', 'o']],
    [['blend', ['greekyogurt', 'berries', 'lowfatmilk']], ['sweeten', ['honey']], ['serveCold']]),
  D('oatwhey', 'Oat, banana & whey shake', ['protein', 'energy'], { g: 'shaker', col: '#e2c290', min: 4, w: 'post' },
    [['milk', 200, 'ml'], ['oats', 6, 'tbsp'], ['banana', 0.5, 'piece'], ['whey', 1, 'scoop'], ['cinnamon', 1, 'pinch']],
    [['blend', ['milk', 'oats', 'banana', 'whey', 'cinnamon']], ['serveCold']]),
  D('tartcherry', 'Tart cherry recovery juice', ['protein', 'calm'], { col: '#9b1b30', min: 2, w: 'pm' },
    [['cherryjuice', 200, 'ml'], ['water', 100, 'ml'], ['ice', 75, 'g', 'o']],
    [['mix', ['cherryjuice', 'water']], ['serveCold']]),
  D('almonddatemilk', 'Almond & date milk', ['energy', 'calm'], { col: '#eadbc8', min: 10, w: 'pm' },
    [['almonds', 20, 'g', 0.6], ['dates', 2, 'piece'], ['water', 250, 'ml'], ['cinnamon', 1, 'pinch']],
    [['soak', 8, ['almonds']], ['blend', ['almonds', 'dates', 'water', 'cinnamon']], ['strain'], ['serveCold']]),
  // immunity
  D('goldenmilk', 'Golden milk (turmeric latte)', ['immune', 'calm'], { t: 'h', g: 'mug', col: '#f2b134', min: 8, w: 'pm' },
    [['milk', 250, 'ml'], ['turmeric', 1, 'tsp'], ['cinnamon', 0.5, 'tsp'], ['ginger', 2, 'g'], ['blackpepper', 1, 'pinch'], ['honey', 1, 'tsp', 'o']],
    [['heatMilk'], ['whisk', ['turmeric', 'cinnamon', 'ginger', 'blackpepper']], ['sweeten', ['honey']], ['serveHot']]),
  D('orangecarrot', 'Orange, carrot & ginger juice', ['immune', 'energy'], { col: '#ff8c1a', min: 4, w: 'am' },
    [['orangejuice', 150, 'ml'], ['carrotjuice', 100, 'ml'], ['ginger', 5, 'g'], ['ice', 75, 'g', 'o']],
    [['blend', ['orangejuice', 'carrotjuice', 'ginger']], ['serveCold']]),
  D('kiwispinach', 'Kiwi & spinach smoothie', ['immune', 'loss'], { col: '#8cc43c', w: 'am' },
    [['kiwi', 2, 'piece'], ['spinach', 30, 'g'], ['apple', 0.5, 'piece'], ['water', 150, 'ml'], ['lemonjuice', 10, 'ml']],
    [['peel', ['kiwi']], ['blend', ['kiwi', 'spinach', 'apple', 'water', 'lemonjuice']], ['serveCold']]),
  D('lemonhoneyhot', 'Hot lemon, honey & ginger', ['immune', 'calm'], { t: 'h', g: 'mug', col: '#f7c948', min: 8, w: 'pm' },
    [['water', 250, 'ml'], ['lemonjuice', 20, 'ml'], ['honey', 2, 'tsp'], ['ginger', 10, 'g', S]],
    [['steep', 5, ['ginger']], ['stirIn', ['lemonjuice', 'honey']], ['serveWarm']]),
  D('abcjuice', 'ABC juice (apple, beet, carrot)', ['immune', 'energy'], { col: '#c0392b', w: 'am' },
    [['applejuice', 100, 'ml'], ['beetjuice', 75, 'ml'], ['carrotjuice', 100, 'ml'], ['ginger', 3, 'g']],
    [['blend', ['applejuice', 'beetjuice', 'carrotjuice', 'ginger']], ['serveCold']]),
  // sleep & calm
  D('chamomilehoney', 'Chamomile with honey', ['calm'], { t: 'h', g: 'mug', col: '#f5d76e', min: 6, w: 'pm' },
    [['water', 250, 'ml'], ['chamomile', 1, 'bag', S], ['honey', 1, 'tsp', 'o']],
    [['steep', 5, ['chamomile']], ['sweeten', ['honey']], ['serveHot']]),
  D('cardamommilk', 'Warm milk with cardamom & honey', ['calm'], { t: 'h', g: 'mug', col: '#f1e4c8', min: 6, w: 'pm' },
    [['milk', 250, 'ml'], ['cardamom', 2, 'pod'], ['honey', 1, 'tsp']],
    [['crush', ['cardamom']], ['simmer', 3, ['milk', 'cardamom']], ['stirIn', ['honey']], ['serveWarm']]),
  D('bananaalmond', 'Banana & almond bedtime smoothie', ['calm'], { col: '#efe1b8', min: 4, w: 'pm' },
    [['almondmilk', 250, 'ml'], ['banana', 1, 'piece'], ['almonds', 10, 'g'], ['cinnamon', 1, 'pinch']],
    [['blend', ['almondmilk', 'banana', 'almonds', 'cinnamon']], ['serveCold']]),
  // hydration
  D('orangeberrywater', 'Orange & berry infused water', ['hydrate'], { g: 'jug', col: '#ffc9a9', sv: 4 },
    [['water', 1000, 'ml'], ['orange', 1, 'piece', S], ['berries', 75, 'g', S], ['mint', 5, 'g', S], ['ice', 1, 'cup', 'o']],
    [['slice', ['orange']], ['infuse', 2, ['orange', 'berries', 'mint']], ['serveCold']]),
  D('coconutlime', 'Coconut water with lime', ['hydrate', 'energy'], { col: '#e9f5db', min: 2, w: 'post' },
    [['coconutwater', 300, 'ml'], ['limejuice', 10, 'ml'], ['mint', 2, 'g', 'o'], ['ice', 75, 'g', 'o']],
    [['mix', ['coconutwater', 'limejuice', 'mint']], ['serveCold']]),
  D('pomspritz', 'Sparkling pomegranate spritzer', ['hydrate'], { col: '#e0457b', min: 2 },
    [['pomegranatejuice', 100, 'ml'], ['sparkling', 200, 'ml'], ['limejuice', 10, 'ml'], ['mint', 2, 'g', 'o'], ['ice', 75, 'g']],
    [['mix', ['pomegranatejuice', 'limejuice', 'mint']], ['sparkle'], ['serveCold']]),
  D('applecinnamonwater', 'Apple & cinnamon water', ['hydrate', 'loss'], { g: 'jug', col: '#f6d7b0', sv: 4 },
    [['water', 1000, 'ml'], ['apple', 1, 'piece', S], ['cinnamon', 1, 'stick', S], ['ice', 1, 'cup', 'o']],
    [['slice', ['apple']], ['infuse', 3, ['apple', 'cinnamon']], ['serveCold']]),
  D('melonmint', 'Melon & mint cooler', ['hydrate', 'loss'], { col: '#ffc285', w: 'hot' },
    [['melon', 250, 'g'], ['mint', 3, 'g'], ['limejuice', 10, 'ml'], ['water', 100, 'ml'], ['ice', 75, 'g', 'o']],
    [['chop', ['melon']], ['blend', ['melon', 'mint', 'limejuice', 'water']], ['serveCold']]),
  // ---- 12.0 — many more: weight loss, digestion, Iraqi classics, energy, protein, immunity, calm, hydration
  D('matchalatte', 'Iced matcha with almond milk', ['loss', 'energy'], { col: '#9cc97a', min: 3, w: 'am', caut: ['caffeine'] },
    [['matcha', 1, 'tsp'], ['water', 50, 'ml'], ['almondmilk', 200, 'ml'], ['ice', 75, 'g'], ['honey', 1, 'tsp', 'o']],
    [['whisk', ['matcha', 'water']], ['stirIn', ['almondmilk']], ['sweeten', ['honey']], ['serveCold']]),
  D('cucumberlime', 'Cucumber & lime cooler', ['loss', 'hydrate'], { col: '#c7e8b0', w: 'hot' },
    [['cucumber', 150, 'g'], ['limejuice', 15, 'ml'], ['mint', 5, 'g'], ['water', 150, 'ml'], ['ice', 75, 'g', 'o']],
    [['chop', ['cucumber']], ['blend', ['cucumber', 'limejuice', 'mint', 'water']], ['strain'], ['serveCold']]),
  D('grapefruitgreentea', 'Iced green tea with grapefruit', ['loss', 'immune'], { col: '#f2b28c', min: 15, w: 'am', caut: ['caffeine', 'meds'] },
    [['water', 200, 'ml'], ['greentea', 1, 'bag', S], ['grapefruitjuice', 100, 'ml'], ['ice', 75, 'g']],
    [['steep', 3, ['greentea']], ['chill', 30], ['stirIn', ['grapefruitjuice']], ['serveCold']]),
  D('spinachapple', 'Spinach, apple & ginger juice', ['loss', 'immune'], { col: '#8fc13f', w: 'am' },
    [['spinach', 30, 'g'], ['apple', 1, 'piece', 0.85], ['ginger', 5, 'g'], ['lemonjuice', 10, 'ml'], ['water', 150, 'ml']],
    [['chop', ['apple', 'ginger']], ['blend', ['spinach', 'apple', 'ginger', 'lemonjuice', 'water']], ['strain'], ['serveCold']]),
  D('cinnamonlemon', 'Cinnamon & lemon morning water', ['loss', 'digest'], { t: 'h', g: 'mug', col: '#e9c08b', min: 10, w: 'am' },
    [['water', 250, 'ml'], ['cinnamon', 1, 'stick', S], ['lemonjuice', 10, 'ml']],
    [['simmer', 8, ['cinnamon']], ['stirIn', ['lemonjuice']], ['serveWarm']]),
  D('strawberrymint', 'Strawberry & mint water', ['hydrate', 'loss'], { g: 'jug', col: '#ffc2cc', sv: 4 },
    [['water', 1000, 'ml'], ['strawberries', 150, 'g', S], ['mint', 10, 'g', S], ['ice', 1, 'cup', 'o']],
    [['slice', ['strawberries']], ['infuse', 2, ['strawberries', 'mint']], ['serveCold']]),
  D('kefircucumber', 'Kefir & cucumber cooler', ['loss', 'digest', 'protein'], { col: '#e8f2df', min: 3, w: 'meal' },
    [['kefir', 200, 'ml'], ['cucumber', 80, 'g'], ['mint', 3, 'g'], ['salt', 1, 'pinch'], ['ice', 75, 'g', 'o']],
    [['chop', ['cucumber']], ['blend', ['kefir', 'cucumber', 'mint', 'salt']], ['serveCold']]),
  D('tomatocucumber', 'Tomato, cucumber & celery juice', ['loss', 'hydrate'], { col: '#e2553b', min: 4, w: 'meal' },
    [['tomato', 2, 'piece'], ['cucumber', 80, 'g'], ['celery', 1, 'piece'], ['lemonjuice', 10, 'ml'], ['salt', 1, 'pinch'], ['blackpepper', 1, 'pinch']],
    [['chop', ['tomato', 'cucumber', 'celery']], ['blend', ['tomato', 'cucumber', 'celery', 'lemonjuice']], ['season', ['salt', 'blackpepper']], ['serveCold']]),
  D('zaatartea', 'Thyme tea (chai zaatar)', ['digest', 'immune', 'calm'], { t: 'h', g: 'mug', col: '#a8a05a', min: 6, w: 'pm' },
    [['water', 250, 'ml'], ['thyme', 1, 'tsp', S], ['honey', 1, 'tsp', 'o'], ['lemonjuice', 5, 'ml', 'o']],
    [['boil'], ['steep', 5, ['thyme']], ['strain'], ['sweeten', ['honey', 'lemonjuice']], ['serveHot']]),
  D('cloveginger', 'Clove & ginger tea', ['digest', 'immune'], { t: 'h', g: 'mug', col: '#c49a6c', min: 10, w: 'pm' },
    [['water', 250, 'ml'], ['cloves', 3, 'piece', S], ['ginger', 8, 'g', S], ['honey', 1, 'tsp', 'o']],
    [['simmer', 8, ['cloves', 'ginger']], ['strain'], ['sweeten', ['honey']], ['serveHot']]),
  D('papayalime', 'Papaya & lime juice', ['digest', 'immune'], { col: '#ffa65c', w: 'after' },
    [['papaya', 150, 'g'], ['limejuice', 10, 'ml'], ['water', 100, 'ml'], ['ice', 50, 'g', 'o']],
    [['peel', ['papaya']], ['blend', ['papaya', 'limejuice', 'water']], ['serveCold']]),
  D('kefiroat', 'Kefir, banana & oat smoothie', ['digest', 'energy'], { col: '#efe2c2', w: 'am' },
    [['kefir', 200, 'ml'], ['banana', 0.5, 'piece'], ['oats', 2, 'tbsp'], ['honey', 1, 'tsp', 'o']],
    [['blend', ['kefir', 'banana', 'oats']], ['sweeten', ['honey']], ['serveCold']]),
  D('pineapplemint', 'Pineapple & mint juice', ['digest', 'hydrate'], { col: '#f6d55c', w: 'after' },
    [['pineapple', 150, 'g'], ['mint', 4, 'g'], ['water', 100, 'ml'], ['ice', 50, 'g', 'o']],
    [['chop', ['pineapple']], ['blend', ['pineapple', 'mint', 'water']], ['serveCold']]),
  D('fennelanise', 'Fennel & anise tea', ['digest', 'calm'], { t: 'h', g: 'mug', col: '#d8c99b', min: 8, w: 'after' },
    [['water', 250, 'ml'], ['fennel', 1, 'tsp', S], ['anise', 0.5, 'tsp', S], ['honey', 1, 'tsp', 'o']],
    [['crush', ['fennel', 'anise']], ['steep', 7, ['fennel', 'anise']], ['strain'], ['sweeten', ['honey']]]),
  // Iraqi classics
  D('maramiya', 'Sage tea (chai maramiya)', ['iraqi', 'digest', 'calm'], { t: 'h', g: 'istikan', col: '#b9a16b', min: 6, w: 'after', caut: ['preg'] },
    [['water', 200, 'ml'], ['sage', 1, 'tsp', S], ['sugar', 1, 'tsp', 'o']],
    [['boil'], ['steep', 5, ['sage']], ['strain'], ['sweeten', ['sugar']], ['istikan']]),
  D('darseenqrunful', 'Cinnamon & clove tea (darseen w qrunful)', ['iraqi', 'calm', 'immune'], { t: 'h', g: 'istikan', col: '#b5652e', min: 12, w: 'pm' },
    [['water', 250, 'ml'], ['cinnamon', 1, 'stick', S], ['cloves', 3, 'piece', S], ['sugar', 1, 'tsp', 'o']],
    [['simmer', 10, ['cinnamon', 'cloves']], ['strain'], ['sweeten', ['sugar']], ['istikan']]),
  D('haleebzafaran', 'Saffron & cardamom milk', ['iraqi', 'calm'], { t: 'h', g: 'mug', col: '#f3c969', min: 8, w: 'pm' },
    [['milk', 250, 'ml'], ['saffron', 1, 'pinch'], ['cardamom', 2, 'pod'], ['honey', 1, 'tsp', 'o']],
    [['heatMilk'], ['stirIn', ['saffron', 'cardamom']], ['sweeten', ['honey']], ['serveWarm']]),
  D('rummanleemon', 'Pomegranate lemonade (rumman w leemon)', ['iraqi', 'immune', 'hydrate'], { col: '#d23a5f', min: 4, w: 'hot' },
    [['pomegranatejuice', 150, 'ml'], ['lemonjuice', 20, 'ml'], ['water', 100, 'ml'], ['mint', 3, 'g'], ['ice', 75, 'g', 'o']],
    [['mix', ['pomegranatejuice', 'lemonjuice', 'water']], ['garnish', ['mint']], ['serveCold']]),
  D('raqqi', 'Fresh watermelon juice (asir raqqi)', ['iraqi', 'hydrate'], { col: '#ff4d5e', min: 3, w: 'hot' },
    [['watermelon', 350, 'g'], ['ice', 75, 'g', 'o']],
    [['chop', ['watermelon']], ['blend', ['watermelon']], ['serveCold']]),
  D('mishmish', 'Fresh apricot juice (asir mishmish)', ['iraqi', 'immune'], { col: '#f7a541', min: 5 },
    [['apricotfresh', 5, 'piece'], ['water', 150, 'ml'], ['honey', 1, 'tsp', 'o'], ['ice', 50, 'g', 'o']],
    [['pit', ['apricotfresh']], ['blend', ['apricotfresh', 'water']], ['sweeten', ['honey']], ['serveCold']]),
  D('jawafa', 'Guava juice (asir jawafa)', ['iraqi', 'immune'], { col: '#f8a5a5', min: 5 },
    [['guava', 2, 'piece'], ['water', 200, 'ml'], ['sugar', 1, 'tsp', 'o'], ['ice', 50, 'g', 'o']],
    [['chop', ['guava']], ['blend', ['guava', 'water']], ['strain'], ['sweeten', ['sugar']], ['serveCold']]),
  D('fustuqmilk', 'Pistachio milk (haleeb fustuq)', ['iraqi', 'energy'], { col: '#cfe0a8', min: 4, w: 'pm' },
    [['milk', 250, 'ml'], ['pistachios', 20, 'g'], ['dates', 2, 'piece'], ['cardamom', 1, 'pod']],
    [['pit', ['dates']], ['blend', ['milk', 'pistachios', 'dates', 'cardamom']], ['serveCold']]),
  D('dibisrashimilk', 'Date syrup & tahini milk (dibis w rashi)', ['iraqi', 'energy', 'protein'], { col: '#a87c50', min: 3, w: 'am' },
    [['milk', 250, 'ml'], ['dibis', 1, 'tbsp'], ['tahini', 1, 'tbsp']],
    [['blend', ['milk', 'dibis', 'tahini']], ['serveCold']]),
  // energy & pre-workout
  D('matchabanana', 'Matcha banana smoothie', ['energy', 'loss'], { col: '#b7d48a', w: 'pre', caut: ['caffeine'] },
    [['matcha', 1, 'tsp'], ['banana', 1, 'piece'], ['almondmilk', 200, 'ml'], ['ice', 50, 'g', 'o']],
    [['blend', ['matcha', 'banana', 'almondmilk']], ['serveCold']]),
  D('coffeedate', 'Iced coffee with dates', ['energy'], { col: '#7b5135', w: 'pre', caut: ['caffeine'] },
    [['coffee', 150, 'ml'], ['milk', 100, 'ml'], ['dates', 3, 'piece'], ['ice', 75, 'g']],
    [['pit', ['dates']], ['blend', ['coffee', 'milk', 'dates']], ['serveCold']]),
  D('mangoorange', 'Mango & orange sunrise', ['energy', 'immune'], { col: '#ffa631', w: 'am' },
    [['mango', 150, 'g'], ['orangejuice', 150, 'ml'], ['ice', 50, 'g', 'o']],
    [['chop', ['mango']], ['blend', ['mango', 'orangejuice']], ['serveCold']]),
  D('oatdatemilk', 'Oat, date & cinnamon milk', ['energy', 'calm'], { col: '#dcc29a', w: 'am' },
    [['milk', 250, 'ml'], ['oats', 3, 'tbsp'], ['dates', 2, 'piece'], ['cinnamon', 1, 'pinch']],
    [['pit', ['dates']], ['blend', ['milk', 'oats', 'dates', 'cinnamon']], ['serveCold']]),
  D('beetberry', 'Beet & berry pre-workout', ['energy', 'immune'], { col: '#9c1f4b', min: 3, w: 'pre' },
    [['beetjuice', 150, 'ml'], ['berries', 100, 'g'], ['water', 50, 'ml'], ['ice', 50, 'g', 'o']],
    [['blend', ['beetjuice', 'berries', 'water']], ['serveCold']]),
  D('melonpre', 'Watermelon & lime pre-workout', ['energy', 'hydrate'], { col: '#ff6f7d', w: 'pre' },
    [['watermelon', 250, 'g'], ['limejuice', 10, 'ml'], ['salt', 1, 'pinch'], ['ice', 50, 'g', 'o']],
    [['chop', ['watermelon']], ['blend', ['watermelon', 'limejuice', 'salt']], ['serveCold']]),
  D('cashewdate', 'Cashew & date energy milk', ['energy', 'protein'], { col: '#e8d3b0', min: 5, w: 'pre' },
    [['milk', 250, 'ml'], ['cashews', 20, 'g'], ['dates', 2, 'piece'], ['cinnamon', 1, 'pinch']],
    [['soak', 2, ['cashews']], ['blend', ['milk', 'cashews', 'dates', 'cinnamon']], ['serveCold']]),
  // protein & recovery
  D('soyberry', 'Soy milk & berry protein shake', ['protein', 'loss'], { col: '#b56592', w: 'post' },
    [['soymilk', 250, 'ml'], ['berries', 100, 'g'], ['oats', 2, 'tbsp']],
    [['blend', ['soymilk', 'berries', 'oats']], ['serveCold']]),
  D('greekmango', 'Greek yogurt & mango shake', ['protein', 'energy'], { col: '#ffc05c', w: 'post' },
    [['greekyogurt', 150, 'g'], ['mango', 100, 'g'], ['milk', 100, 'ml'], ['honey', 1, 'tsp', 'o']],
    [['chop', ['mango']], ['blend', ['greekyogurt', 'mango', 'milk']], ['sweeten', ['honey']], ['serveCold']]),
  D('vanillawhey', 'Vanilla whey & banana shake', ['protein'], { g: 'shaker', col: '#f1e3c0', min: 3, w: 'post' },
    [['whey', 1, 'scoop'], ['milk', 250, 'ml'], ['banana', 1, 'piece'], ['vanilla', 0.5, 'tsp']],
    [['blend', ['whey', 'milk', 'banana', 'vanilla']], ['serveCold']]),
  D('pbcocoa', 'Peanut butter & cocoa protein milk', ['protein', 'energy'], { col: '#8a5a3b', min: 3, w: 'post' },
    [['milk', 250, 'ml'], ['peanutbutter', 1, 'tbsp'], ['cocoa', 1, 'tbsp'], ['whey', 0.5, 'scoop'], ['honey', 1, 'tsp', 'o']],
    [['blend', ['milk', 'peanutbutter', 'cocoa', 'whey']], ['sweeten', ['honey']], ['serveCold']]),
  D('strawberrywhey', 'Strawberry whey shake', ['protein'], { g: 'shaker', col: '#f48aa0', min: 3, w: 'post' },
    [['whey', 1, 'scoop'], ['strawberries', 120, 'g'], ['lowfatmilk', 250, 'ml']],
    [['blend', ['whey', 'strawberries', 'lowfatmilk']], ['serveCold']]),
  D('almondoatmilk', 'Almond, oat & honey milk', ['protein', 'calm'], { col: '#ecdcbf', min: 4, w: 'pm' },
    [['milk', 250, 'ml'], ['almonds', 15, 'g'], ['oats', 2, 'tbsp'], ['honey', 1, 'tsp']],
    [['blend', ['milk', 'almonds', 'oats', 'honey']], ['serveCold']]),
  D('chocbanana', 'Chocolate banana recovery shake', ['protein', 'energy'], { col: '#6f4630', min: 3, w: 'post' },
    [['milk', 300, 'ml'], ['banana', 1, 'piece'], ['cocoa', 1, 'tbsp'], ['greekyogurt', 50, 'g']],
    [['blend', ['milk', 'banana', 'cocoa', 'greekyogurt']], ['serveCold']]),
  // immunity
  D('guavaorange', 'Guava & orange juice', ['immune'], { col: '#ff9d76', min: 4, w: 'am' },
    [['guava', 1, 'piece'], ['orangejuice', 150, 'ml'], ['ice', 50, 'g', 'o']],
    [['chop', ['guava']], ['blend', ['guava', 'orangejuice']], ['strain'], ['serveCold']]),
  D('kiwiorange', 'Kiwi & orange juice', ['immune', 'energy'], { col: '#c8d65b', min: 4, w: 'am' },
    [['kiwi', 2, 'piece'], ['orangejuice', 150, 'ml'], ['ice', 50, 'g', 'o']],
    [['peel', ['kiwi']], ['blend', ['kiwi', 'orangejuice']], ['serveCold']]),
  D('turmericshot', 'Turmeric, ginger & lemon shot', ['immune', 'digest'], { g: 'istikan', col: '#f2a516', min: 4, w: 'am' },
    [['water', 60, 'ml'], ['turmeric', 0.5, 'tsp'], ['ginger', 10, 'g'], ['lemonjuice', 15, 'ml'], ['blackpepper', 1, 'pinch'], ['honey', 1, 'tsp', 'o']],
    [['grate', ['ginger']], ['mix', ['water', 'turmeric', 'ginger', 'lemonjuice', 'blackpepper']], ['sweeten', ['honey']]]),
  D('cranberryorange', 'Cranberry & orange spritzer', ['immune', 'hydrate'], { col: '#d4344f', min: 2 },
    [['cranberryjuice', 100, 'ml'], ['orangejuice', 100, 'ml'], ['sparkling', 100, 'ml'], ['ice', 75, 'g', 'o']],
    [['mix', ['cranberryjuice', 'orangejuice']], ['sparkle'], ['serveCold']]),
  D('blueberrybanana', 'Blueberry & banana smoothie', ['immune', 'energy'], { col: '#5b4b8a', w: 'am' },
    [['blueberries', 100, 'g'], ['banana', 0.5, 'piece'], ['yogurt', 100, 'g'], ['milk', 100, 'ml']],
    [['blend', ['blueberries', 'banana', 'yogurt', 'milk']], ['serveCold']]),
  D('carrotapple', 'Carrot & apple juice', ['immune', 'energy'], { col: '#ff9a3c', min: 3, w: 'am' },
    [['carrotjuice', 150, 'ml'], ['applejuice', 100, 'ml'], ['ginger', 3, 'g', 'o'], ['ice', 50, 'g', 'o']],
    [['mix', ['carrotjuice', 'applejuice']], ['grate', ['ginger']], ['serveCold']]),
  D('pomgreentea', 'Pomegranate green tea', ['immune', 'loss'], { col: '#c5506e', min: 12, w: 'am', caut: ['caffeine'] },
    [['water', 200, 'ml'], ['greentea', 1, 'bag', S], ['pomegranatejuice', 80, 'ml'], ['ice', 75, 'g', 'o']],
    [['steep', 3, ['greentea']], ['chill', 20], ['stirIn', ['pomegranatejuice']], ['serveCold']]),
  // sleep & calm
  D('vanillamilk', 'Warm vanilla milk', ['calm'], { t: 'h', g: 'mug', col: '#f5ebd6', min: 5, w: 'pm' },
    [['milk', 250, 'ml'], ['vanilla', 0.5, 'tsp'], ['honey', 1, 'tsp'], ['cinnamon', 1, 'pinch', 'o']],
    [['heatMilk'], ['stirIn', ['vanilla', 'honey']], ['garnish', ['cinnamon']], ['serveWarm']]),
  D('cherrychamomile', 'Cherry & chamomile sleep drink', ['calm'], { t: 'h', g: 'mug', col: '#b03050', min: 8, w: 'pm' },
    [['water', 150, 'ml'], ['chamomile', 1, 'bag', S], ['cherryjuice', 100, 'ml']],
    [['steep', 5, ['chamomile']], ['stirIn', ['cherryjuice']], ['serveWarm']]),
  D('warmalmond', 'Warm almond milk with cinnamon', ['calm'], { t: 'h', g: 'mug', col: '#efe3cf', min: 5, w: 'pm' },
    [['almondmilk', 250, 'ml'], ['cinnamon', 1, 'pinch'], ['honey', 1, 'tsp', 'o']],
    [['heatMilk'], ['stirIn', ['cinnamon']], ['sweeten', ['honey']], ['serveWarm']]),
  D('bananacinnamon', 'Banana & cinnamon warm milk', ['calm', 'energy'], { t: 'h', g: 'mug', col: '#efd9a7', min: 6, w: 'pm' },
    [['milk', 250, 'ml'], ['banana', 0.5, 'piece'], ['cinnamon', 1, 'pinch']],
    [['blend', ['milk', 'banana', 'cinnamon']], ['heatMilk'], ['serveWarm']]),
  D('anisemilk', 'Anise & honey milk', ['calm', 'digest'], { t: 'h', g: 'mug', col: '#f0e6d0', min: 8, w: 'pm' },
    [['milk', 250, 'ml'], ['anise', 0.5, 'tsp', S], ['honey', 1, 'tsp']],
    [['heatMilk'], ['steep', 5, ['anise']], ['strain'], ['stirIn', ['honey']], ['serveWarm']]),
  D('saffrontea', 'Saffron & cardamom tea', ['calm'], { t: 'h', g: 'istikan', col: '#f0b429', min: 6, w: 'pm' },
    [['water', 200, 'ml'], ['saffron', 1, 'pinch', S], ['cardamom', 2, 'pod', S], ['honey', 1, 'tsp', 'o']],
    [['boil'], ['steep', 5, ['saffron', 'cardamom']], ['sweeten', ['honey']], ['serveHot']]),
  D('oatmilkdate', 'Oat milk with dates & cardamom', ['calm', 'energy'], { col: '#e6d3ae', min: 4, w: 'pm' },
    [['oatmilk', 250, 'ml'], ['dates', 2, 'piece'], ['cardamom', 1, 'pod']],
    [['pit', ['dates']], ['blend', ['oatmilk', 'dates', 'cardamom']], ['serveCold']]),
  // hydration
  D('lemongingerwater', 'Lemon & ginger infused water', ['hydrate', 'digest'], { g: 'jug', col: '#f3eba4', sv: 4 },
    [['water', 1000, 'ml'], ['lemon', 1, 'piece', S], ['ginger', 15, 'g', S], ['ice', 1, 'cup', 'o']],
    [['slice', ['lemon', 'ginger']], ['infuse', 2, ['lemon', 'ginger']], ['serveCold']]),
  D('pineapplecoconut', 'Pineapple & coconut water cooler', ['hydrate', 'energy'], { col: '#f6e3a1', w: 'hot' },
    [['coconutwater', 200, 'ml'], ['pineapple', 100, 'g'], ['limejuice', 10, 'ml'], ['ice', 75, 'g', 'o']],
    [['chop', ['pineapple']], ['blend', ['coconutwater', 'pineapple', 'limejuice']], ['serveCold']]),
  D('kiwimintwater', 'Kiwi & mint infused water', ['hydrate'], { g: 'jug', col: '#d4eab0', sv: 4 },
    [['water', 1000, 'ml'], ['kiwi', 2, 'piece', S], ['mint', 10, 'g', S], ['ice', 1, 'cup', 'o']],
    [['peel', ['kiwi']], ['infuse', 2, ['kiwi', 'mint']], ['serveCold']]),
  D('peachmintwater', 'Peach & mint iced water', ['hydrate'], { g: 'jug', col: '#ffd8b8', sv: 4 },
    [['water', 1000, 'ml'], ['peach', 2, 'piece', S], ['mint', 10, 'g', S], ['ice', 1, 'cup', 'o']],
    [['slice', ['peach']], ['infuse', 3, ['peach', 'mint']], ['serveCold']]),
  D('melonlime', 'Melon & lime agua fresca', ['hydrate', 'loss'], { col: '#ffcf8a', w: 'hot' },
    [['melon', 250, 'g'], ['limejuice', 10, 'ml'], ['water', 150, 'ml'], ['ice', 75, 'g', 'o']],
    [['chop', ['melon']], ['blend', ['melon', 'limejuice', 'water']], ['strain'], ['serveCold']]),
  D('cucumbercoconut', 'Cucumber & coconut water', ['hydrate', 'loss'], { col: '#e3f2d4', w: 'post' },
    [['coconutwater', 200, 'ml'], ['cucumber', 100, 'g'], ['mint', 3, 'g'], ['ice', 75, 'g', 'o']],
    [['chop', ['cucumber']], ['blend', ['coconutwater', 'cucumber', 'mint']], ['serveCold']]),
  D('citruswater', 'Orange, lemon & lime water', ['hydrate', 'immune'], { g: 'jug', col: '#ffe0a3', sv: 4 },
    [['water', 1000, 'ml'], ['orange', 1, 'piece', S], ['lemon', 1, 'piece', S], ['lime', 1, 'piece', S], ['ice', 1, 'cup', 'o']],
    [['slice', ['orange', 'lemon', 'lime']], ['infuse', 2, ['orange', 'lemon', 'lime']], ['serveCold']]),
  D('rosecooler', 'Rose & lemon cooler', ['hydrate', 'calm'], { col: '#ffc9d6', min: 3, w: 'hot' },
    [['water', 250, 'ml'], ['rosewater', 1, 'tsp'], ['lemonjuice', 15, 'ml'], ['honey', 1, 'tsp'], ['ice', 75, 'g', 'o']],
    [['mix', ['water', 'rosewater', 'lemonjuice', 'honey']], ['serveCold']]),
]
export const DRINK_BY_ID = Object.fromEntries(DRINKS.map(d => [d.id, d]))
export const DRINK_NAMES = DRINKS.map(d => d.name)
export const DRINK_COUNT = DRINKS.length

// ---- nutrition ----------------------------------------------------------------------------------
const num = v => (Number.isFinite(+v) ? +v : 0)
const r0 = v => Math.round(v)
const r1 = v => Math.round(v * 10) / 10

/** Totals of ingredient rows [{ id, a, u, x? }] — the whole batch. */
export function rowsTotals(rows) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, s: 0, g: 0, water: 0 }
  for (const r of rows || []) {
    const x = DING_BY_ID[r.id]
    if (!x) continue
    const g = gramsOf(x, r.a, r.u)
    const share = r.x == null ? 1 : num(r.x)
    t.kcal += x.kcal * g / 100 * share; t.p += x.p * g / 100 * share; t.c += x.c * g / 100 * share
    t.f += x.f * g / 100 * share; t.s += x.s * g / 100 * share
    t.g += g; t.water += g * (x.w || 0) * (share >= 0.5 ? share : 0)
  }
  return t
}
const per = (t, sv) => {
  const n = Math.max(1, num(sv) || 1)
  return { kcal: r0(t.kcal / n), p: r1(t.p / n), c: r1(t.c / n), f: r1(t.f / n), s: r1(t.s / n), ml: r0(t.water / n), g: r0(t.g / n) }
}
/** Rows a drink uses: the required ones plus the optional ones you switched on. */
export const drinkRows = (d, withOpt = []) => (d.ing || []).filter(r => !r.opt || withOpt.includes(r.id))
/** Per-serving nutrition of a drink: { kcal, p, c, f, s (sugar), ml (water it adds), g }. */
export const drinkNutrition = (d, withOpt = []) => per(rowsTotals(drinkRows(d, withOpt)), d.sv)
/** Calories an optional row adds per serving (the "+21 kcal" next to honey). */
export function optionalKcal(d, id) {
  const r = (d.ing || []).find(x => x.id === id)
  return r ? r0(rowsTotals([{ ...r, opt: false }]).kcal / Math.max(1, d.sv || 1)) : 0
}
/** "dairy" / "nuts" / "caffeine" — read off the ingredients. */
export function drinkFlags(d, withOpt = []) {
  const fl = drinkRows(d, withOpt).map(r => (DING_BY_ID[r.id] || {}).fl || '').join('')
  return { dairy: fl.includes('m'), nuts: fl.includes('n'), caffeine: fl.includes('c') }
}
/** Up to `n` reasons a drink is good for you, from its ingredients (first ones first). */
export function drinkNotes(d, n = 3) {
  const out = []
  for (const r of d.ing || []) {
    const k = NOTE_OF[r.id]
    if (k && !out.includes(NOTE[k])) out.push(NOTE[k])
    if (out.length >= n) break
  }
  return out
}

// ---- your own drinks ----------------------------------------------------------------------------
/** A saved drink as a library-shaped object (so the same screens show it). */
export function myDrinkAsDrink(m) {
  return {
    id: m.id, name: m.n || '', cats: ['mine'], t: m.t === 'h' ? 'h' : 'c', g: m.t === 'h' ? 'mug' : 'tall', col: m.col || '#7cc35a',
    min: 5, sv: Math.max(1, Math.round(num(m.sv) || 1)), w: 'any', caut: [], story: null, mine: true,
    ing: (m.ing || []).filter(r => DING_BY_ID[r[0]]).map(([id, a, u, x]) => ({ id, a: num(a), u: u || 'g', opt: false, x: x == null ? 1 : num(x) })),
    steps: [], note: m.note || '',
  }
}
export const allDrinks = S => [...((S && S.myDrinks) || []).map(myDrinkAsDrink), ...DRINKS]
export function drinkOf(S, id) {
  if (DRINK_BY_ID[id]) return DRINK_BY_ID[id]
  const m = ((S && S.myDrinks) || []).find(x => x.id === id)
  return m ? myDrinkAsDrink(m) : null
}
export function saveMyDrink(s, { id, n, col, t: temp, sv, ing, note }) {
  s.myDrinks = Array.isArray(s.myDrinks) ? s.myDrinks : []
  const rec = {
    id: id || 'md' + uid(), n: String(n || '').trim().slice(0, 60), col: /^#[0-9a-f]{6}$/i.test(col || '') ? col : '#7cc35a',
    t: temp === 'h' ? 'h' : 'c', sv: Math.min(20, Math.max(1, Math.round(num(sv) || 1))),
    ing: (ing || []).filter(r => r && DING_BY_ID[r[0]] && num(r[1]) > 0).slice(0, 30).map(([i, a, u, x]) => (x != null && x !== 1 ? [i, r1(num(a)), u, num(x)] : [i, r1(num(a)), u])),
    note: String(note || '').slice(0, 300), at: Date.now(),
  }
  const i = s.myDrinks.findIndex(x => x.id === rec.id)
  if (i >= 0) s.myDrinks[i] = rec; else s.myDrinks.unshift(rec)
  return rec.id
}
export function deleteMyDrink(s, id) {
  s.myDrinks = (s.myDrinks || []).filter(x => x.id !== id)
  s.drinkFavs = (s.drinkFavs || []).filter(x => x !== id)
}
export function toggleDrinkFav(s, id) {
  const f = new Set(s.drinkFavs || [])
  if (f.has(id)) f.delete(id); else f.add(id)
  s.drinkFavs = [...f]
}

/** A food-log entry for `servings` of a drink. */
export function drinkEntry(d, { servings = 1, meal = 's', withOpt = [], now = Date.now() } = {}) {
  const n = drinkNutrition(d, withOpt)
  const q = Math.min(20, Math.max(0.5, Math.round(num(servings) * 2) / 2 || 1))
  return { id: 'fe' + uid(), f: null, dr: d.id, n: d.name, kcal: n.kcal, p: n.p, c: n.c, fat: n.f, q, m: ['b', 'l', 'd', 's'].includes(meal) ? meal : 's', t: now }
}
/** Remember a drink in the recent list (keeps 21 days). */
export function noteDrink(s, iso, id, now = Date.now()) {
  s.drinkLog = s.drinkLog && typeof s.drinkLog === 'object' ? s.drinkLog : {}
  const day = Array.isArray(s.drinkLog[iso]) ? s.drinkLog[iso] : []
  day.push({ id, at: now })
  s.drinkLog[iso] = day.slice(-30)
  const keep = Object.keys(s.drinkLog).sort().slice(-21)
  for (const k of Object.keys(s.drinkLog)) if (!keep.includes(k)) delete s.drinkLog[k]
}
/** Most recent distinct drinks. */
export function recentDrinks(S, n = 8) {
  const log = (S && S.drinkLog) || {}
  const out = []
  for (const k of Object.keys(log).sort().reverse()) {
    for (const e of [...(log[k] || [])].reverse()) if (e && !out.includes(e.id) && drinkOf(S, e.id)) out.push(e.id)
    if (out.length >= n) break
  }
  return out.slice(0, n)
}

// ---- finding drinks -----------------------------------------------------------------------------
const fold = s => String(s || '').toLocaleLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0300-\u036f]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
/**
 * Drinks matching a query and filters. `tr` translates names (search matches both languages).
 * cat: a DRINK_CATS key, 'fav' or 'mine'. temp: 'h' | 'c'. maxKcal: number.
 */
export function searchDrinks(S, { q = '', cat = null, temp = null, maxKcal = null, tr = x => x } = {}) {
  const favs = new Set((S && S.drinkFavs) || [])
  const Q = fold(q).trim()
  return allDrinks(S).filter(d => {
    if (cat === 'fav' && !favs.has(d.id)) return false
    if (cat === 'mine' && !d.mine) return false
    if (cat && cat !== 'fav' && cat !== 'mine' && !d.cats.includes(cat)) return false
    if (temp && d.t !== temp) return false
    if (maxKcal != null && drinkNutrition(d).kcal > maxKcal) return false
    if (!Q) return true
    const hay = fold(d.name + ' ' + tr(d.name) + ' ' + d.ing.map(r => { const x = DING_BY_ID[r.id]; return x ? x.name + ' ' + tr(x.name) : '' }).join(' '))
    return Q.split(/\s+/).every(w => hay.includes(w))
  })
}
/** Ingredients matching a query (both languages), for the drink builder. */
export function searchDing(q, tr = x => x, cat = null) {
  const Q = fold(q).trim()
  return DING.filter(x => (!cat || x.cat === cat) && (!Q || fold(x.name + ' ' + tr(x.name)).includes(Q)))
}
/** The same drink for everyone on a given day, rotating through the library. */
export function drinkOfDay(iso, cat = null) {
  const pool = cat ? DRINKS.filter(d => d.cats.includes(cat)) : DRINKS
  let h = 0
  for (const ch of String(iso)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return pool[h % pool.length]
}
/** A drink that suits a moment of the day: 'am' | 'pre' | 'post' | 'pm' | 'hot' | 'meal' | 'after'. */
export function drinkFor(when, seed = 0) {
  const pool = DRINKS.filter(d => d.w === when)
  return pool.length ? pool[Math.abs(seed) % pool.length] : DRINKS[0]
}
