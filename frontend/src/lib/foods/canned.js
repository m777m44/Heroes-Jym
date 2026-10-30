// 13.0 — canned and processed foods (معلبات): values per 100 g from typical labels and USDA
// FoodData Central averages (canned products are drained unless they are eaten with their
// sauce). Sodium matters most here, so every one carries it.
import { per100 } from './rows.js'

const can = (id, name, v, unit, g, extra) => per100(id, 'canned', name, v, unit, g, extra)
const CAN = n => [{ key: 'half', name: 'Half a can', q: 1 }, { key: 'can', name: 'Whole can', q: n }]

// [kcal, protein, carbs, fat, sugars, sodium] per 100 g
export const CANNED = [
  // meat & fish
  can('cornedbeef', 'Corned beef (canned)', [245, 27, 0, 15, 0, 900], 'serving', 85),
  can('cannedbeef', 'Canned beef in its juice', [215, 22, 2, 13, 0.5, 600], 'serving', 100),
  can('cannedchicken', 'Canned chicken breast', [180, 25, 0.5, 8.5, 0, 450], 'serving', 100),
  can('luncheonbeef', 'Beef luncheon meat', [270, 12, 6, 22, 1, 1000], 'slice', 30),
  can('luncheonchicken', 'Chicken luncheon meat', [205, 12, 7, 14, 1, 950], 'slice', 30),
  can('mortadella', 'Chicken mortadella', [205, 13, 4, 15, 1, 1000], 'slice', 30),
  can('mortadellaolive', 'Chicken mortadella with olives', [215, 12, 4, 16.5, 1, 1100], 'slice', 30),
  can('cannedsausage', 'Canned chicken sausages', [215, 11, 4, 17, 1, 900], 'piece', 40),
  can('tunachili', 'Tuna with chili in oil', [185, 25, 0.5, 9.5, 0, 420], 'can', 120),
  can('tunadrained', 'Tuna in oil, drained', [198, 29, 0, 8.2, 0, 354], 'can', 120),
  can('tunasaladcan', 'Tuna salad with vegetables (can)', [136, 9, 7, 8, 2.5, 450], 'can', 160),
  can('sardinestomato', 'Sardines in tomato sauce', [158, 16, 1.5, 9.5, 1, 400], 'can', 125),
  can('mackerel', 'Mackerel (canned)', [165, 21, 0, 9, 0, 380], 'can', 125),
  can('salmoncan', 'Pink salmon (canned)', [155, 24, 0, 6.5, 0, 400], 'serving', 100),
  // legumes & vegetables
  can('foulcan', 'Foul medames (canned)', [98, 6.5, 16.5, 0.6, 0.5, 380], 'serving', 200, { sizes: CAN(2) }),
  can('chickpeascan', 'Chickpeas (canned, drained)', [140, 7, 23, 2.5, 0.5, 240], 'cup', 160),
  can('hummuscan', 'Hummus with tahini (canned)', [170, 7.5, 14.5, 9, 0.5, 380], 'serving', 100),
  can('kidneycan', 'Red kidney beans (canned)', [115, 7.5, 20, 0.5, 0.5, 260], 'cup', 160),
  can('whitebeanscan', 'White beans (canned)', [108, 7, 19, 0.4, 0.5, 300], 'cup', 160),
  can('bakedbeans', 'Baked beans in tomato sauce', [90, 4.8, 17, 0.4, 6, 420], 'serving', 200, { sizes: CAN(2) }),
  can('lentilscan', 'Lentils (canned)', [95, 7, 15, 0.5, 0.5, 280], 'cup', 160),
  can('corncan', 'Sweet corn (canned)', [82, 2.5, 15.5, 1.2, 4.5, 210], 'cup', 150),
  can('peascan', 'Green peas (canned)', [65, 4.4, 11, 0.4, 3.5, 250], 'cup', 150),
  can('peascarrots', 'Peas and carrots (canned)', [45, 2.5, 8, 0.3, 3, 270], 'cup', 150),
  can('mixedvegcan', 'Mixed vegetables (canned)', [49, 2.6, 9, 0.3, 3, 240], 'cup', 150),
  can('mushroomscan', 'Mushrooms (canned)', [25, 1.9, 3.5, 0.3, 1, 425], 'cup', 150),
  can('tomatoescan', 'Chopped tomatoes (canned)', [29, 1.2, 5.5, 0.2, 3.5, 180], 'cup', 200),
  can('tomatopaste', 'Tomato paste', [82, 4.3, 15, 0.5, 12, 60], 'tbsp', 16),
  can('bamiacan', 'Okra in tomato sauce (canned)', [57, 1.5, 6, 3, 2.5, 400], 'cup', 200),
  can('molokhiacan', 'Molokhia (canned)', [47, 2, 3, 3, 0.5, 350], 'cup', 200),
  can('olivesgreen', 'Green olives (jar)', [150, 1, 3.8, 15.3, 0, 1550], 'handful', 30),
  can('olivesblack', 'Black olives (can)', [120, 0.8, 6, 10.9, 0, 735], 'handful', 30),
  can('picklesjar', 'Pickled cucumbers (jar)', [13, 0.5, 2.4, 0.2, 1.2, 1200], 'serving', 60),
  can('dolmacan', 'Stuffed vine leaves (canned)', [165, 3, 20, 8, 1.5, 480], 'serving', 100),
  can('makdous', 'Makdous (stuffed eggplant in oil)', [210, 3, 6, 20, 2, 900], 'piece', 40),
  // fruit
  can('peachessyrup', 'Peaches in syrup (canned)', [74, 0.5, 18, 0.1, 17, 6], 'cup', 150),
  can('pineapplecan', 'Pineapple in juice (canned)', [60, 0.4, 15, 0.1, 14, 1], 'cup', 150),
  can('fruitcocktail', 'Fruit cocktail in syrup (canned)', [73, 0.4, 18, 0.1, 17, 6], 'cup', 150),
  // milk, cream & spreads
  can('condensedmilk', 'Sweetened condensed milk', [325, 7.9, 54.4, 8.7, 54, 127], 'tbsp', 20),
  can('evaporatedmilk', 'Evaporated milk', [134, 6.8, 10, 7.6, 10, 106], 'tbsp', 30),
  can('creamcan', 'Canned cream (qishta)', [230, 2.5, 3.5, 23, 3.5, 40], 'tbsp', 30),
  can('coconutmilk', 'Coconut milk (canned)', [200, 2, 2.8, 21, 2, 13], 'tbsp', 30),
  can('cheesespread', 'Processed cheese spread (jar)', [265, 9, 6, 22, 5, 900], 'tbsp', 20),
  // soups
  can('mushroomsoup', 'Cream of mushroom soup (canned)', [55, 1.4, 5, 3.5, 1, 380], 'bowl', 250),
  can('chickensoupcan', 'Chicken noodle soup (canned)', [36, 2.4, 4.5, 1, 0.5, 340], 'bowl', 250),
]
