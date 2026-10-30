// 13.0 — more Iraqi dishes (the 7.2 and 11.0 lists already have dolma, masgouf, quzi, kubba,
// tashreeb, biryani, samoon, kleicha, zalabia, geymar and about a hundred more), and the tag that
// marks every Iraqi food so the food database can show them together.
import { serving } from './rows.js'

const iq = (id, cat, name, v, unit, g) => serving(id, cat, name, v, unit, g, { iraqi: true })

// [kcal, protein, carbs, fat, sugars, sodium mg] per serving
export const IRAQI_MORE = [
  iq('fesenjoon', 'dishes', 'Fesenjoon (chicken in walnut and pomegranate sauce)', [520, 28, 30, 32, 14, 600], 'plate', 300),
  iq('aroog', 'dishes', 'Aroog (fried meat and herb patty)', [140, 6, 9, 9, 0.5, 220], 'piece', 60),
  iq('masgoufplate', 'dishes', 'Masgouf plate with bread, amba and salad', [690, 42, 62, 30, 6, 1100], 'plate', 450),
  iq('dijajfirin', 'dishes', 'Chicken and potato tray (dijaj bil-firin)', [520, 38, 35, 25, 4, 800], 'plate', 400),
  iq('quzidijaj', 'dishes', 'Chicken quzi (rice with nuts and raisins)', [660, 35, 80, 22, 10, 900], 'plate', 400),
  iq('kubbasiniya', 'dishes', 'Tray kubba (kubbat siniya)', [325, 14, 33, 15, 1.5, 450], 'piece', 150),
  iq('dolmaribs', 'dishes', 'Dolma with lamb ribs', [580, 22, 55, 30, 6, 900], 'plate', 350),
  iq('laffataroog', 'fast', 'Aroog sandwich (laffat aroog)', [470, 18, 50, 22, 4, 750], 'piece', 200),
  iq('laffatbagilla', 'fast', 'Fava bean sandwich (laffat bagilla)', [420, 16, 62, 12, 3, 700], 'piece', 220),
  iq('laffatgeymar', 'fast', 'Geymar and honey sandwich (laffat geymar)', [398, 7, 52, 18, 22, 350], 'piece', 150),
  iq('borakmeat', 'grains', 'Meat boorak', [287, 10, 28, 15, 1.5, 450], 'piece', 100),
  iq('halawatjazar', 'sweets', 'Carrot halwa (halawat jazar)', [281, 3, 38, 13, 30, 60], 'serving', 100),
  iq('halawatsmeed', 'sweets', 'Semolina halwa (halawat smeed)', [368, 4, 52, 16, 30, 40], 'serving', 100),
  iq('shakarlama', 'sweets', 'Shakarlama (Iraqi sugar cookie)', [138, 1.8, 17, 7, 9, 30], 'piece', 30),
  iq('qatayef', 'sweets', 'Qatayef with walnuts', [203, 3.5, 27, 9, 14, 90], 'piece', 60),
]

/** The Iraqi foods already in the database (5.0–11.0), by id. */
export const IRAQI_IDS = new Set([
  // home dishes
  'rashidibis', 'ijja', 'baqilla', 'geymarhoney', 'dolma', 'kubba', 'quzi', 'biryani', 'tashreeb', 'bamia', 'fasolia', 'qeema',
  'masgouf', 'pacha', 'makhlama', 'potatostew', 'eggplantstew', 'kahi', 'kubbamosul', 'kubbahalab', 'qormasabzi', 'harissa', 'tbit',
  'timmansharia', 'timmanbagilla', 'margatbazalia', 'margatqara', 'margatkarafs', 'margatsbenagh', 'margatshalgham', 'kubbahamudh',
  'kubbashalgham', 'kubbaburghul', 'chap', 'tharid', 'tashreebbagilla', 'tashreebdijaj', 'mutabbaqsamak', 'mumbar', 'dolmalahana',
  'eggdates', 'kebabplate', 'tikkaplate', 'kubbasamak', 'burghulpilaf', 'timmanahmar', 'qeemanajaf', 'kubbaraisi', 'iraqibreakfast',
  'eggsamoon', 'timmanfasolia', 'timmanbamia', 'fasoliakhadra', 'sheikhmahshi', 'makarona',
  // bread & grains
  'samoon', 'tannour', 'kahisyrup', 'khubzruqaq', 'kaak', 'boorak', 'sambusa', 'sambusacheese',
  // meat & fish
  'kebabiraqi', 'tikka', 'kebab', 'shabbout', 'lambliver', 'shifta', 'lambchops', 'chickentikka',
  // dairy
  'geymar', 'laban', 'shinena', 'eggbasturma',
  // vegetables
  'turshi', 'jajik', 'shalgham', 'beetroot', 'herbsplate', 'arnoos', 'amba', 'friedcauliflower',
  // fruit
  'dates', 'barhi', 'zahdi', 'khastawi', 'sweetlime', 'jujube', 'mulberries', 'loquat',
  // legumes
  'chickpeas', 'baqillaboiled', 'mashbeans',
  // fast food & sandwiches
  'guss', 'kubbasandwich', 'eggsandwich', 'falafelamba', 'cheesesandwich', 'labnehsandwich', 'laffatchips', 'kebabsandwich', 'tikkasandwich',
  // sweets
  'kleicha', 'kleichawalnut', 'zalabia', 'mannsama', 'khubzdihin', 'halawattamur', 'halawatshaar', 'zarda', 'kaaktamur', 'dibisgeymar',
  'halawakhubz', 'shamiya', 'simsimiya', 'dibis',
  // drinks
  'noomibasra', 'sharbatzbib', 'tamarind', 'teasugar',
])
