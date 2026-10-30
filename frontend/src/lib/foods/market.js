// 13.1 — what Iraqi shops and markets sell in packets, cans and jars (المحلات والأسواق): more
// noodles (Samyang Buldak, Maggi, Nissin, Koka, Shin Ramyun), packaged cakes and croissants, canned
// mahshi (stuffed eggplant, peppers, zucchini, cabbage and vine leaves), halqoum (Turkish delight)
// in four flavours, alij (chewing gum) and candies, halva, nougat and mlabbas, chocolate (Dubai
// chocolate too), biscuits, chips, cheese triangles and dairy cups, packaged bread, frozen food,
// ice cream (mouta) and boxed juices. Values per packet / piece as printed on typical labels (Gulf,
// Turkish and Iraqi packs; brands differ a little) or per 100 g for cans (USDA FoodData Central
// averages where there is no label).
//
// MARKET_TYPES are the aisles of the "Shops & markets" shelf (views/FoodDatabase.jsx); every food
// on that shelf carries `mk` (its aisle) — these new ones and the packaged foods the app already had.
import { serving, per100 } from './rows.js'

/** The aisles of the market shelf, in the order a shop shows them. */
export const MARKET_TYPES = [
  { key: 'cakes', name: 'Cakes & croissants', icon: 'cake', color: 'var(--brown, #a2845e)' },
  { key: 'canned', name: 'Canned & mahshi', icon: 'can', color: 'var(--teal)' },
  { key: 'noodles', name: 'Noodles & Indomie', icon: 'noodles', color: 'var(--yellow)' },
  { key: 'sweets', name: 'Halqoum & sweets', icon: 'candy', color: 'var(--pink)' },
  { key: 'gum', name: 'Gum & candies', icon: 'sparkle', color: 'var(--purple)' },
  { key: 'chocolate', name: 'Chocolate', icon: 'chocolate', color: 'var(--brown, #a2845e)' },
  { key: 'biscuits', name: 'Biscuits & bars', icon: 'cookie', color: 'var(--orange)' },
  { key: 'chips', name: 'Chips & crisps', icon: 'chips', color: 'var(--red)' },
  { key: 'dairy', name: 'Cheese & dairy', icon: 'milk', color: 'var(--blue)' },
  { key: 'bakery', name: 'Bread & bakery', icon: 'bread', color: 'var(--yellow)' },
  { key: 'frozen', name: 'Frozen', icon: 'snowflake', color: 'var(--cyan, #64d2ff)' },
  { key: 'icecream', name: 'Ice cream', icon: 'icecream', color: 'var(--pink)' },
  { key: 'drinks', name: 'Juices & milk drinks', icon: 'bottle', color: 'var(--green)' },
  { key: 'jars', name: 'Jams, honey & spreads', icon: 'jar', color: 'var(--orange)' },
]

const CAN = n => [{ key: 'half', name: 'Half a can', q: 1 }, { key: 'can', name: 'Whole can', q: n }]
const ml = { ml: true }
// [kcal, protein, carbs, fat, sugars, sodium mg] per packet / piece (s) or per 100 g (h)
const s = (mk, cat) => (id, name, v, unit, g, extra = {}) => serving(id, cat, name, v, unit, g, { mk, ...extra })
const h = (mk, cat) => (id, name, v, unit, g, extra = {}) => per100(id, cat, name, v, unit, g, { mk, ...extra })

const noodle = s('noodles', 'noodles')
const cake = s('cakes', 'cakes')
const can = h('canned', 'canned')
const sweet = h('sweets', 'sweets')
const gum = s('gum', 'snacks')
const choc = s('chocolate', 'snacks')
const biscuit = s('biscuits', 'snacks')
const chip = s('chips', 'snacks')
const dairy = s('dairy', 'dairy')
const bread = s('bakery', 'grains')
const frozen = s('frozen', 'fast')
const ice = s('icecream', 'snacks')
const drink = s('drinks', 'drinks')
const jar = h('jars', 'sweets')

export const MARKET = [
  // noodles — the other packs on the shelf next to Indomie
  noodle('buldak', 'Samyang Buldak hot chicken ramen', [530, 13, 85, 16, 7, 1280], 'pack', 140, { prep: 'boiled' }),
  noodle('buldak2x', 'Samyang Buldak 2× spicy', [530, 12, 84, 17, 6, 1520], 'pack', 140, { prep: 'boiled' }),
  noodle('buldakcarbo', 'Samyang Buldak carbonara', [550, 12, 80, 20, 9, 1100], 'pack', 130, { prep: 'creamy' }),
  noodle('buldakcheese', 'Samyang Buldak cheese', [545, 13, 83, 18, 7, 1300], 'pack', 140, { prep: 'boiled' }),
  noodle('buldakcup', 'Samyang Buldak cup (small)', [325, 7, 50, 11, 4, 870], 'cup', 70, { prep: 'boiled' }),
  noodle('maggi', 'Maggi noodles, chicken', [330, 7, 45, 13.5, 1.5, 950], 'pack', 77, { prep: 'soup' }),
  noodle('cupnoodles', 'Nissin Cup Noodles', [290, 6, 38, 13, 2, 1000], 'cup', 64, { prep: 'soup' }),
  noodle('koka', 'Koka noodles, chicken', [380, 8, 54, 14.5, 2, 1200], 'pack', 85, { prep: 'soup' }),
  noodle('shinramyun', 'Shin Ramyun (spicy)', [500, 10, 79, 16, 4, 1790], 'pack', 120, { prep: 'soup' }),
  // packaged cakes & croissants
  cake('cakechoc', 'Packaged chocolate cake', [210, 2.5, 26, 10.5, 15, 110], 'piece', 50),
  cake('cakemarble', 'Marble cake slice (packaged)', [200, 3, 25, 10, 14, 150], 'slice', 50),
  cake('cakeorange', 'Orange cake (packaged)', [190, 2.5, 26, 8.5, 15, 140], 'piece', 50),
  cake('cakebanana', 'Banana cake (packaged)', [185, 2.5, 26, 8, 14, 150], 'piece', 50),
  cake('cakepistachio', 'Pistachio cake (packaged)', [215, 3.5, 24, 11.5, 15, 120], 'piece', 50),
  cake('cakecoconut', 'Coconut cake (packaged)', [205, 2.5, 25, 10.5, 16, 110], 'piece', 50),
  cake('cakecaramel', 'Caramel-filled cake (packaged)', [200, 2, 27, 9.5, 17, 120], 'piece', 48),
  cake('cakestrawroll', 'Strawberry roll cake (packaged)', [175, 2, 25, 7.5, 16, 80], 'slice', 45),
  cake('minicupcakes', 'Mini cupcakes (packaged, 2)', [250, 3, 33, 12, 20, 160], 'serving', 60),
  cake('muffinvanilla', 'Vanilla muffin (packaged)', [270, 3.5, 34, 13.5, 19, 230], 'piece', 65),
  cake('madeleines', 'Madeleines (2)', [225, 3, 26, 12, 14, 120], 'serving', 50),
  cake('croissantcheese', 'Packaged croissant with cheese', [240, 6, 26, 12.5, 5, 330], 'piece', 60),
  cake('croissantjam', 'Packaged croissant with strawberry jam', [215, 4, 28, 9.5, 11, 210], 'piece', 55),
  cake('minicroissants', 'Mini croissants (packaged, 2)', [175, 3, 19, 9.5, 4, 170], 'serving', 40),
  cake('cakerusk', 'Cake rusks (4)', [165, 4, 28, 4, 8, 150], 'serving', 40),
  // canned mahshi, ready meals, soups and jars
  can('mahshieggplant', 'Stuffed eggplant (canned mahshi)', [120, 2.5, 13, 6.5, 3, 420], 'serving', 200, { sizes: CAN(2) }),
  can('mahshipepper', 'Stuffed peppers (canned mahshi)', [110, 2.5, 14, 5, 3, 400], 'serving', 200, { sizes: CAN(2) }),
  can('mahshizucchini', 'Stuffed zucchini (canned mahshi)', [95, 3, 11, 4.5, 3, 380], 'serving', 200, { sizes: CAN(2) }),
  can('mahshicabbage', 'Stuffed cabbage rolls (canned)', [105, 3.5, 13, 4.3, 2, 400], 'serving', 200, { sizes: CAN(2) }),
  can('dolmameatcan', 'Stuffed vine leaves with meat (canned)', [150, 5, 15, 8, 1.5, 450], 'serving', 200, { sizes: CAN(2) }),
  can('spaghettican', 'Spaghetti in tomato sauce (canned)', [70, 2, 13, 1, 4, 330], 'serving', 200, { sizes: CAN(2) }),
  can('raviolican', 'Ravioli in tomato sauce (canned)', [85, 3, 13, 2.3, 3, 380], 'serving', 200, { sizes: CAN(2) }),
  can('beansmeatcan', 'White beans with meat (canned)', [105, 6, 11, 4, 2, 420], 'serving', 200, { sizes: CAN(2) }),
  can('meatballscan', 'Meatballs in tomato sauce (canned)', [150, 9, 6, 10, 2, 480], 'serving', 200, { sizes: CAN(2) }),
  can('chilican', 'Chili con carne (canned)', [110, 7, 10, 4.5, 2, 450], 'serving', 200, { sizes: CAN(2) }),
  can('foultahinican', 'Foul with tahini (canned)', [130, 7, 13, 5.5, 1, 420], 'serving', 200, { sizes: CAN(2) }),
  can('foulchilican', 'Foul with olive oil & chili (canned)', [120, 6.5, 13, 4.6, 0.8, 400], 'serving', 200, { sizes: CAN(2) }),
  can('tunalemoncan', 'Tuna with lemon & pepper (can)', [190, 25, 1, 9.5, 0.5, 420], 'can', 120),
  can('lentilsoupcan', 'Lentil soup (canned)', [55, 3.5, 8, 1, 1, 350], 'bowl', 250),
  can('tomatosoupcan', 'Tomato soup (canned)', [40, 1, 8, 0.5, 5, 330], 'bowl', 250),
  can('olivesstuffed', 'Green olives stuffed with pepper', [145, 1, 4, 14, 0, 1500], 'serving', 30),
  can('turnipsjar', 'Pickled turnips (jar)', [20, 0.6, 4, 0.1, 3, 1000], 'serving', 60),
  can('mangocan', 'Mango slices in syrup (canned)', [80, 0.4, 20, 0.1, 18, 10], 'serving', 120),
  // halqoum (Turkish delight), halva and sweets
  sweet('rahatpistachio', 'Halqoum with pistachio (Turkish delight)', [390, 3, 80, 6, 60, 15], 'piece', 20),
  sweet('rahatwalnut', 'Halqoum with walnut', [400, 3, 78, 8, 58, 15], 'piece', 20),
  sweet('rahatcoconut', 'Halqoum with coconut', [380, 1, 82, 5, 64, 20], 'piece', 20),
  sweet('rahatcream', 'Halqoum with cream (qashta)', [385, 2, 80, 6.5, 62, 30], 'piece', 20),
  sweet('halawapistachio', 'Tahini halva with pistachio', [530, 13, 49, 31.5, 44, 170], 'serving', 30),
  sweet('halawacocoa', 'Tahini halva with cocoa', [535, 12, 50, 32, 44, 180], 'serving', 30),
  sweet('fistuqiya', 'Peanut brittle (fistuqiya)', [490, 12, 56, 24, 45, 120], 'piece', 30),
  sweet('nougat', 'Nougat with nuts', [420, 6, 70, 13, 60, 40], 'piece', 30),
  sweet('mlabbas', 'Sugared almonds (mlabbas)', [460, 9, 70, 16, 65, 10], 'serving', 30),
  sweet('toffee', 'Toffee candies (4)', [430, 2, 75, 14, 60, 200], 'serving', 25),
  sweet('hardcandy', 'Hard candies (3)', [390, 0, 97, 0, 70, 30], 'serving', 15),
  sweet('marshmallow', 'Marshmallows (5)', [330, 2, 80, 0, 58, 80], 'serving', 30),
  sweet('jellycup', 'Jelly cup', [80, 0.5, 19, 0, 17, 40], 'cup', 100),
  sweet('cottoncandy', 'Cotton candy (ghazl al-banat)', [390, 0, 98, 0, 98, 0], 'bag', 30),
  sweet('chocdates', 'Chocolate-covered dates (3)', [465, 5, 70, 18, 60, 30], 'serving', 30),
  // alij (chewing gum) and small candies
  gum('gumsugar', 'Chewing gum with sugar — alij (2 pieces)', [22, 0, 5.5, 0, 4, 0], 'serving', 6),
  gum('bubblegum', 'Bubble gum (1 piece)', [18, 0, 4.5, 0, 3.5, 0], 'piece', 5),
  gum('mastic', 'Mastic gum (Arabic alij)', [3, 0, 0.7, 0, 0, 0], 'piece', 2),
  gum('gumballs', 'Gum balls (2)', [30, 0, 7.5, 0, 7, 0], 'serving', 8),
  gum('mints', 'Breath mints (5)', [10, 0, 2.4, 0, 2.3, 0], 'serving', 2.5),
  gum('fruitchews', 'Fruit chews (4)', [80, 0, 17, 1.5, 12, 10], 'serving', 20),
  gum('sourcandy', 'Sour candy strips', [95, 0.8, 22, 0.3, 16, 20], 'serving', 25),
  // chocolate
  choc('chochazel', 'Milk chocolate with hazelnuts (bar)', [220, 3.5, 22, 13.5, 20, 25], 'bar', 40),
  choc('chocwhite', 'White chocolate bar', [220, 2.5, 24, 13, 23.5, 40], 'bar', 40),
  choc('chocsticks', 'Chocolate biscuit sticks (like Mikado)', [125, 2, 17, 5.5, 8.5, 60], 'serving', 25),
  choc('dubaichoc', 'Dubai chocolate (pistachio & kunafa)', [270, 5, 25, 17, 18, 60], 'bar', 50),
  choc('chocwafer', 'Chocolate wafer bar', [150, 1.8, 18, 8, 10, 40], 'bar', 28),
  // biscuits
  biscuit('teabiscuits', 'Tea biscuits (4)', [140, 2, 22, 5, 7, 110], 'serving', 30),
  biscuit('creambiscuitvan', 'Vanilla cream biscuits (3)', [175, 2, 25, 7.5, 12, 90], 'serving', 36),
  biscuit('creambiscuitcocoa', 'Cocoa cream biscuits (like Prince, 4)', [190, 2.5, 28, 7.5, 14, 120], 'serving', 40),
  biscuit('coconutbiscuits', 'Coconut biscuits (4)', [150, 2, 19, 7.5, 7, 90], 'serving', 30),
  biscuit('petitbeurre', 'Petit beurre biscuits (4)', [145, 2.5, 24, 4.3, 7, 130], 'serving', 33),
  biscuit('figbars', 'Fig bars (2)', [110, 1, 22, 2, 12, 100], 'serving', 30),
  biscuit('jambiscuits', 'Jam-filled biscuits (2)', [135, 1.5, 21, 5, 9, 80], 'serving', 30),
  biscuit('maamoulpistachio', 'Maamoul with pistachio (packaged)', [155, 2.5, 19, 7.5, 9, 40], 'piece', 35),
  // chips
  chip('ruffles', 'Ruffles (ridged chips)', [160, 2, 15, 10, 0.5, 160], 'bag', 28),
  chip('chipscheese', 'Cheese-flavoured chips (bag)', [215, 2.6, 21, 13.5, 1, 320], 'bag', 40),
  chip('chipssmall', 'Potato chips (small bag)', [105, 1.3, 11, 6.3, 0.2, 120], 'bag', 20),
  chip('cornketchup', 'Corn puffs, ketchup flavour', [130, 1.5, 16, 6.5, 2, 220], 'bag', 25),
  chip('popcornsalted', 'Salted popcorn (bag)', [150, 2.5, 17, 8, 0.3, 230], 'bag', 30),
  chip('shrimpchips', 'Prawn crackers (shrimp chips)', [155, 1, 19, 8.5, 1, 260], 'bag', 30),
  // cheese and dairy cups
  dairy('cheesetriangles', 'Cheese triangles (2)', [80, 3.4, 2, 6.5, 1.5, 340], 'serving', 34),
  dairy('creamcheesecubes', 'Cream cheese cubes (like Kiri, 2)', [100, 2.5, 1.5, 9.3, 1.5, 230], 'serving', 36),
  dairy('cheeseslices', 'Processed cheese slices (2)', [120, 6, 2.5, 9.5, 1.5, 560], 'serving', 40),
  dairy('kashkaval', 'Kashkaval cheese', [110, 7, 0.5, 9, 0.5, 280], 'slice', 30),
  dairy('yogurtfruit', 'Fruit yogurt cup', [110, 4, 17, 3, 15, 60], 'cup', 120),
  dairy('cremecaramel', 'Crème caramel cup', [125, 3, 21, 3, 18, 70], 'cup', 100),
  dairy('chocpudding', 'Chocolate pudding cup', [130, 3, 21, 3.8, 16, 90], 'cup', 100),
  dairy('ricepuddingcup', 'Rice pudding cup (packaged)', [120, 3.2, 20, 3, 13, 55], 'cup', 100),
  dairy('milkpowder', 'Milk powder (2 tbsp)', [125, 6.5, 9.5, 6.8, 9.5, 95], 'serving', 25),
  // packaged bread
  bread('burgerbun', 'Burger bun (packaged)', [165, 5.5, 30, 2.5, 4, 280], 'piece', 60),
  bread('hotdogbun', 'Hot dog bun (packaged)', [140, 4.5, 26, 2, 3.5, 250], 'piece', 50),
  bread('toastbrown', 'Brown toast bread (2 slices)', [125, 5, 21, 2, 2.5, 230], 'serving', 50),
  bread('grissini', 'Breadsticks (grissini, 4)', [85, 2.5, 14, 2, 0.5, 150], 'serving', 20),
  bread('kaaksmall', 'Small sesame kaak rings (4)', [130, 3.5, 20, 4, 3, 160], 'serving', 30),
  // frozen
  frozen('frozenkubba', 'Frozen kubba (burghul), fried', [160, 6, 15, 8.5, 1, 290], 'piece', 60),
  frozen('springrolls', 'Vegetable spring rolls (frozen, 3)', [150, 3, 18, 7.5, 2, 300], 'serving', 60),
  frozen('chickenstrips', 'Breaded chicken strips (oven-baked)', [230, 15, 15, 12.5, 0.5, 520], 'serving', 100),
  frozen('frozenpizza', 'Frozen pizza (half)', [380, 15, 45, 15.5, 5, 780], 'serving', 150),
  frozen('ovenfries', 'Oven fries (frozen)', [160, 2.5, 25, 5.5, 0.4, 300], 'serving', 100),
  frozen('hotdogs', 'Chicken hot dogs (2)', [220, 9, 4, 19, 1, 800], 'serving', 80),
  frozen('burgerpatty', 'Frozen beef burger patty (grilled)', [200, 14, 3, 15, 0.5, 380], 'piece', 80),
  // ice cream (mouta)
  ice('icestick', 'Ice cream stick with chocolate coat', [170, 2, 17, 10.5, 15, 40], 'piece', 60),
  ice('icecup', 'Ice cream cup (vanilla & chocolate)', [140, 2.5, 17, 7, 15, 50], 'cup', 75),
  ice('dondurma', 'Mastic ice cream (dondurma)', [160, 3, 22, 6.8, 20, 60], 'cup', 100),
  // boxed juices and milk drinks
  drink('mangonectar', 'Mango nectar (box)', [125, 0.3, 30.5, 0.1, 28, 15], 'box', 250, ml),
  drink('guavanectar', 'Guava nectar (box)', [130, 0.3, 32, 0.1, 28, 15], 'box', 250, ml),
  drink('bananamilk', 'Banana milk (box)', [140, 6, 22, 3.2, 21, 100], 'box', 200, ml),
  // jars
  jar('datepaste', 'Date paste', [285, 2, 70, 0.4, 63, 5], 'serving', 30),
]

/**
 * The packaged foods the app already had, by aisle (their ids stay; they only get `mk`). The
 * noodles, date cakes and canned food shelves come whole.
 */
export const MARKET_OLD = {
  chips: ['lays', 'layssaltvinegar', 'doritos', 'doritoschili', 'pringles', 'pringlessour', 'cheetos', 'cheeseballs', 'takis', 'popcorncaramel',
    'pretzels', 'bakerolz', 'chips'],
  biscuits: ['tuc', 'ritz', 'ricecakes', 'oreo', 'lotusbiscuit', 'digestive', 'chocdigestive', 'wafers', 'biscuits', 'maamoul', 'cookie',
    'proteinbar', 'granolabar', 'datebar'],
  chocolate: ['snickers', 'kitkat', 'kitkat2', 'twix', 'mars', 'bounty', 'galaxy', 'dairymilk', 'kinderbueno', 'kinderchoc', 'kindersurprise',
    'ferrero', 'mmspeanut', 'mmschoc', 'maltesers', 'toblerone', 'milka', 'lion', 'darkchoc', 'chocolate'],
  gum: ['haribo', 'lollipop', 'mentos', 'gum'],
  cakes: ['choccroissant', 'swissroll', 'cakebar', 'donut', 'donutchoc', 'muffinchoc', 'cupcake', 'brownie', 'cheesecake'],
  icecream: ['icecreamvanilla', 'magnum', 'magnumalmond', 'cornetto', 'icelolly', 'icecreamsandwich'],
  drinks: ['chocmilk', 'strawberrymilk', 'juicebox', 'nescafe3in1', 'applejuice', 'laban'],
  sweets: ['rahat', 'simsimiya', 'halawa', 'halawatshaar', 'mannsama'],
  jars: ['nutella', 'jam', 'honey', 'dibis', 'peanutbutter', 'tahini'],
  dairy: ['labneh', 'creamcheese', 'cheddar', 'halloumi', 'akkawi', 'mozzarella', 'geymar'],
  bakery: ['toast', 'wholebread', 'croissant', 'kaak', 'samoon', 'khubz', 'cornflakes', 'oats', 'granola'],
  frozen: ['nuggets', 'sausage'],
}
/** Whole shelves that are packaged food → their aisle. */
export const MARKET_CATS = { noodles: 'noodles', cakes: 'cakes', canned: 'canned' }
