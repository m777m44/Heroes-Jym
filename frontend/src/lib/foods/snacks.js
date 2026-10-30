// 13.0 — what the corner shop sells (سناكات المحلات): crisps, chocolate, biscuits, cakes, ice
// cream and café drinks, per packet or piece as printed on the label (UK / Gulf packs; sizes
// differ a little by country). Soft drinks, energy drinks and juices have their own screen
// (lib/sodas.js) and nuts their own (lib/nuts.js), so they are not repeated here.
import { serving } from './rows.js'

const sn = (id, name, v, unit, g, extra) => serving(id, 'snacks', name, v, unit, g, extra)
const ml = { ml: true }

// [kcal, protein, carbs, fat, sugars, sodium mg] per packet / piece
export const SNACKS = [
  // crisps & salty
  sn('lays', 'Lay’s classic', [214, 2.6, 21.2, 13.2, 0.3, 220], 'bag', 40),
  sn('layssaltvinegar', 'Lay’s salt & vinegar', [210, 2.5, 21.5, 12.8, 0.5, 330], 'bag', 40),
  sn('doritos', 'Doritos nacho cheese', [199, 2.8, 23.6, 10, 1.3, 270], 'bag', 40),
  sn('doritoschili', 'Doritos sweet chili', [197, 2.6, 24, 9.8, 2.4, 230], 'bag', 40),
  sn('pringles', 'Pringles original', [212, 1.5, 20, 14, 0.5, 210], 'serving', 40),
  sn('pringlessour', 'Pringles sour cream & onion', [208, 1.8, 20.5, 13.2, 1.2, 230], 'serving', 40),
  sn('cheetos', 'Cheetos crunchy', [228, 2.8, 21.6, 14.4, 1, 340], 'bag', 40),
  sn('cheeseballs', 'Cheese balls (puffs)', [160, 1.8, 17, 9.5, 1, 290], 'bag', 30),
  sn('takis', 'Takis fuego', [148, 2, 17, 8, 0.5, 420], 'bag', 28),
  sn('popcorncaramel', 'Caramel popcorn', [129, 1.1, 23.7, 3.3, 15, 100], 'bag', 30),
  sn('pretzels', 'Pretzels', [115, 3, 24, 0.8, 1, 380], 'bag', 30),
  sn('tuc', 'Tuc crackers (5)', [120, 1.9, 15.3, 5.6, 1.5, 260], 'serving', 25),
  sn('ritz', 'Ritz crackers (5)', [80, 1, 10, 4, 1, 135], 'serving', 16),
  sn('ricecakes', 'Rice cakes (2)', [70, 1.4, 14.6, 0.5, 0.2, 50], 'serving', 18),
  sn('bakerolz', 'Baked bread rolls snack (like Bake Rolz)', [204, 4.5, 28.4, 8.1, 2, 450], 'bag', 45),
  sn('nachoscheese', 'Nachos with cheese sauce', [448, 8, 50, 24, 3, 800], 'serving', 150),
  // chocolate & sweets
  sn('snickers', 'Snickers', [244, 4.5, 29.6, 11.8, 25.3, 120], 'bar', 50),
  sn('kitkat', 'KitKat (4 fingers)', [209, 2.6, 25.9, 10.6, 20.3, 20], 'bar', 41.5),
  sn('kitkat2', 'KitKat (2 fingers)', [104, 1.3, 12.9, 5.3, 10.2, 10], 'bar', 20.7),
  sn('twix', 'Twix (2 fingers)', [247, 2.3, 32.3, 12, 24.5, 75], 'bar', 50),
  sn('mars', 'Mars', [227, 2, 35.4, 8.5, 30.6, 75], 'bar', 51),
  sn('bounty', 'Bounty (2 bars)', [275, 2.1, 33.6, 14.6, 27.5, 55], 'bar', 57),
  sn('galaxy', 'Galaxy milk chocolate', [216, 2.7, 22.6, 12.5, 22.3, 40], 'bar', 40),
  sn('dairymilk', 'Cadbury Dairy Milk', [238, 3.3, 25.7, 13.5, 25.2, 45], 'bar', 45),
  sn('kinderbueno', 'Kinder Bueno (2 bars)', [244, 3.7, 21.3, 16, 17.7, 50], 'bar', 43),
  sn('kinderchoc', 'Kinder chocolate (1 bar)', [71, 1.1, 6.7, 4.4, 6.7, 15], 'bar', 12.5),
  sn('kindersurprise', 'Kinder Surprise (1 egg)', [110, 1.7, 10.5, 6.8, 10.4, 25], 'piece', 20),
  sn('ferrero', 'Ferrero Rocher (1 piece)', [74, 1, 5.6, 5.3, 4.9, 5], 'piece', 12.5),
  sn('nutella', 'Nutella (1 tablespoon)', [79, 0.9, 8.6, 4.6, 8.4, 6], 'tbsp', 15),
  sn('mmspeanut', 'M&M’s peanut', [229, 4.3, 26.6, 11.7, 23.9, 20], 'bag', 45),
  sn('mmschoc', 'M&M’s chocolate', [218, 2.1, 31.5, 9.3, 29.3, 30], 'bag', 45),
  sn('maltesers', 'Maltesers', [186, 2.8, 22.9, 9.3, 19.2, 60], 'bag', 37),
  sn('toblerone', 'Toblerone', [185, 1.9, 21.2, 10.3, 20.8, 20], 'bar', 35),
  sn('milka', 'Milka (4 squares)', [133, 1.6, 14.6, 7.5, 14.4, 25], 'serving', 25),
  sn('lion', 'Lion bar', [208, 2, 27.9, 9.8, 20.2, 60], 'bar', 42),
  sn('darkchoc', 'Dark chocolate 70% (2 squares)', [120, 1.6, 9, 8.6, 5.8, 4], 'serving', 20),
  sn('haribo', 'Gummy bears (Haribo)', [85, 1.7, 19.3, 0.1, 11.6, 3], 'bag', 25),
  sn('lollipop', 'Lollipop', [47, 0, 11.7, 0, 11, 2], 'piece', 12),
  sn('mentos', 'Mentos (1 roll)', [146, 0, 34.8, 0.8, 26, 5], 'serving', 38),
  sn('gum', 'Sugar-free chewing gum', [3, 0, 0.8, 0, 0, 0], 'piece', 1.4),
  // biscuits, cakes & pastries
  sn('oreo', 'Oreo (3 biscuits)', [165, 1.4, 24.5, 6.8, 14, 135], 'serving', 34),
  sn('lotusbiscuit', 'Lotus Biscoff (2 biscuits)', [75, 0.8, 11.3, 3, 5.9, 60], 'serving', 15.6),
  sn('digestive', 'Digestive biscuits (2)', [142, 2.1, 18.9, 6.4, 5, 160], 'serving', 30),
  sn('chocdigestive', 'Chocolate digestives (2)', [165, 2.2, 20.6, 8.2, 9.4, 140], 'serving', 33),
  sn('wafers', 'Cream wafers', [229, 3.4, 27, 11.9, 13, 30], 'bag', 45),
  sn('choccroissant', 'Packaged chocolate croissant (like 7Days)', [244, 3.6, 26.4, 13.8, 12, 160], 'piece', 55),
  sn('swissroll', 'Swiss roll (1 slice)', [111, 1.4, 16.5, 4.4, 11, 80], 'slice', 30),
  sn('cakebar', 'Packaged sponge cake (cream filled)', [170, 2, 22, 8.2, 14, 100], 'piece', 40),
  sn('donut', 'Glazed donut', [243, 2.9, 30.8, 12, 14, 200], 'piece', 60),
  sn('donutchoc', 'Chocolate-filled donut', [299, 3.8, 36, 15.5, 17, 220], 'piece', 75),
  sn('muffinchoc', 'Chocolate muffin', [398, 5.5, 50, 19.5, 30, 330], 'piece', 100),
  sn('cupcake', 'Cupcake with frosting', [268, 2.5, 39.2, 11.2, 28, 180], 'piece', 70),
  sn('brownie', 'Brownie', [271, 3.2, 33, 14, 22, 140], 'piece', 60),
  sn('cheesecake', 'Cheesecake (1 slice)', [325, 5.5, 25.5, 22.5, 22, 380], 'slice', 100),
  sn('cookie', 'Chocolate chip cookie (large)', [198, 2.2, 25.6, 9.6, 14, 140], 'piece', 40),
  // ice cream
  sn('icecreamvanilla', 'Vanilla ice cream (cup)', [137, 2.3, 15.6, 7.3, 14, 53], 'cup', 66),
  sn('magnum', 'Magnum classic', [240, 3.3, 23.3, 15, 21.5, 40], 'stick', 79),
  sn('magnumalmond', 'Magnum almond', [252, 4, 23, 16, 21, 40], 'stick', 79),
  sn('cornetto', 'Cornetto vanilla', [192, 2.6, 24, 9.5, 16, 45], 'piece', 75),
  sn('icelolly', 'Fruit ice lolly', [50, 0, 12.5, 0, 12, 5], 'stick', 60),
  sn('icecreamsandwich', 'Ice cream sandwich', [183, 3, 27, 7, 16, 90], 'piece', 70),
  // café drinks & milk
  sn('latte', 'Latte', [190, 10, 15, 10, 15, 140], 'cup', 350, ml),
  sn('icedlatte', 'Iced latte', [131, 7, 10.5, 6.8, 10.5, 100], 'cup', 350, ml),
  sn('spanishlatte', 'Spanish latte', [299, 10, 40, 11, 38, 160], 'cup', 350, ml),
  sn('caramelmacchiato', 'Caramel macchiato', [244, 10, 34, 7.5, 32, 150], 'cup', 350, ml),
  sn('mocha', 'Café mocha', [299, 12, 38, 11, 32, 150], 'cup', 350, ml),
  sn('frappuccino', 'Mocha frappuccino with whipped cream', [375, 5, 55, 15, 52, 230], 'cup', 470, ml),
  sn('karak', 'Karak tea', [138, 3.5, 22, 4, 20, 50], 'cup', 200, ml),
  sn('chocmilk', 'Chocolate milk', [149, 6.8, 22, 3.8, 20, 110], 'box', 200, ml),
  sn('strawberrymilk', 'Strawberry milk', [140, 6.4, 21, 3.4, 20, 100], 'box', 200, ml),
  sn('juicebox', 'Orange juice drink (box)', [100, 0.4, 24.5, 0, 22, 10], 'box', 200, ml),
  // bars
  sn('proteinbar', 'Protein bar', [221, 20, 19.5, 7, 3, 200], 'bar', 60),
  sn('granolabar', 'Granola bars (2)', [195, 4, 29, 7, 11, 160], 'serving', 42),
  sn('datebar', 'Date and nut bar', [170, 3, 26, 6, 22, 10], 'bar', 40),
]
