// 17.0 — the Rooba corner (ركن الروبة): Iraq's rooba (yogurt) in its kinds — buffalo, sheep's, low-fat,
// skyr, protein yogurt and kefir — rooba with date syrup and with bread, the dishes cooked in yogurt
// (labaniyeh, Kurdish doxawa, kubba labaniyeh, fried eggplant with rooba and garlic, spinach borani,
// chicken fatteh, shakriyeh, manti, raita, labneh balls, garlic rooba), frozen yogurt and a yogurt
// cake — each with its real photo (lib/photos/manifest.js). Mansaf and Iskender were in the app already;
// they join the corner with the other yogurt dishes it had.
//
// The dishes are built from their parts (lib/foods/builds17.js, merged into street.js BUILDS), so the meal builder opens on them
// with every ingredient in grams and their values are the sum of those parts. The plain yogurts carry
// per-serving values — typical figures (USDA FoodData Central for cow's yogurt; buffalo and sheep's
// milk yogurt from their usual composition) — the label of a packet wins.
//   about  one line about it (a t() key), shown in the photo viewer
//   rg     its place in Iraq when it clearly has one (lib/regions.js)
import { serving } from './rows.js'
import { builtValues } from './street.js'

const y = (id, name, v, unit, g, about, extra = null) => serving(id, 'dairy', name, v, unit, g, { about, ...extra })
/** A dish built from parts: name, shelf, serving — the values come from BUILDS. */
const b = (id, cat, name, unit, about, extra = null) => ({ id, cat, name, unit, ...builtValues(id), built: true, about, ...extra })

export const ROOBA_17 = [
  // ---- the rooba itself ---------------------------------------------------------------------------
  y('roobajamoos', 'Buffalo rooba (thick buffalo yogurt)', [210, 9, 10, 15, 10, 110, 0], 'bowl', 200,
    'Thick, creamy rooba of water-buffalo milk with a layer of cream on top — from the marshes of the south, sold in bowls and clay pots. Richer than cow’s.',
    { iraqi: true, rg: 'south' }),
  y('roobaghanam', 'Sheep’s milk rooba', [200, 11, 10, 13, 10, 90, 0], 'bowl', 200,
    'Rooba of sheep’s milk — firm, tangy and rich: the rooba of the villages and the north in spring.', { iraqi: true }),
  y('roobalowfat', 'Low-fat yogurt (1.5 %)', [126, 10.5, 14, 3.1, 14, 140, 0], 'cup', 200,
    'Yogurt of semi-skimmed milk: half the fat of full rooba, the same protein and calcium.', { fit: true }),
  y('skyr', 'Skyr (high-protein yogurt)', [95, 16.5, 6, 0.3, 6, 60, 0], 'cup', 150,
    'Iceland’s strained yogurt: about 11 g of protein in every 100 g and almost no fat — a gym favourite.', { fit: true }),
  y('proteinyogurt', 'Protein yogurt (20 g protein)', [124, 20, 8, 1, 8, 100, 0], 'cup', 200,
    'A high-protein yogurt cup: 20 g of protein for about 120 kcal — after training or as a light meal.', { fit: true }),
  y('kefirglass', 'Kefir (a glass)', [115, 8.5, 11, 4, 11, 100, 0], 'glass', 250,
    'Milk fermented with kefir grains: tangy, lightly fizzy and full of live cultures for the gut.'),
  b('roobadibis', 'dairy', 'Rooba with date syrup (dibis)', 'bowl',
    'A bowl of cold rooba with a ribbon of date syrup — an Iraqi breakfast, and a sweet with no sugar added.', { iraqi: true }),
  b('roobakhubz', 'dishes', 'Rooba with bread (khubz w rooba)', 'plate',
    'Bread torn into a bowl of cold rooba — the simple lunch of hot Iraqi summers, with a cucumber or a few dates.', { iraqi: true }),
  b('roobathoum', 'dairy', 'Garlic rooba (yogurt with garlic and mint)', 'bowl',
    'Rooba beaten with crushed garlic and dried mint — poured over dolma, kubba, fried vegetables and grills.', { iraqi: true }),
  // ---- cooked in yogurt ------------------------------------------------------------------------------
  b('labaniyeh', 'dishes', 'Labaniyeh (warm yogurt soup with rice)', 'bowl',
    'Yogurt cooked slowly with rice and an egg so it doesn’t split, finished with butter, garlic and dried mint — a warming soup of Iraq and the Levant.'),
  b('doxawa', 'dishes', 'Doxawa (Kurdish yogurt soup with chickpeas and herbs)', 'bowl',
    'Doxawa (دۆخەوا): yogurt simmered with rice, chickpeas and fresh herbs — a Kurdish soup, warm in winter and cool in summer.',
    { iraqi: true, rg: 'kurdistan' }),
  b('kubbalabaniyeh', 'dishes', 'Kubba in yogurt (kubba labaniyeh)', 'bowl',
    'Kubba simmered in a garlicky yogurt sauce with dried mint and a little rice.'),
  b('badinjanrooba', 'dishes', 'Fried eggplant with rooba and garlic', 'plate',
    'Slices of fried eggplant under cold rooba with crushed garlic — an Iraqi side dish next to rice and grills.', { iraqi: true }),
  b('spinachrooba', 'dishes', 'Spinach with rooba (borani)', 'bowl',
    'Spinach wilted with onion, cooled and folded into yogurt with garlic — borani, the Persian way, made in Iraq too.'),
  b('fattehdijaj', 'dishes', 'Chicken fatteh (bread, rice, chicken and yogurt)', 'plate',
    'Crisp bread, rice and chicken under warm garlic yogurt, topped with toasted almonds and butter.'),
  b('shakriyeh', 'dishes', 'Shakriyeh (lamb cooked in yogurt)', 'bowl',
    'Syria’s lamb stew cooked in yogurt with onions — eaten with rice or bread.'),
  b('manti', 'dishes', 'Manti (meat dumplings with yogurt and garlic)', 'plate',
    'Tiny meat dumplings under garlic yogurt and red pepper butter — from Turkey and Central Asia.'),
  b('raita', 'dairy', 'Raita (yogurt with cucumber and cumin)', 'bowl',
    'India’s cooling side for biryani and curries: yogurt with cucumber, onion, mint and roasted cumin.'),
  b('labnehballs', 'dairy', 'Labneh balls in olive oil', 'serving',
    'Labneh strained until firm, rolled into balls and kept under olive oil with zaatar — a breakfast of the Levant.'),
  // ---- sweet -------------------------------------------------------------------------------------------
  serving('frozenyogurt', 'sweets', 'Frozen yogurt (cup)', [210, 5, 36, 5, 33, 90, 0], 'cup', 150,
    { about: 'Soft-serve frozen yogurt: tangier and a little lighter than ice cream — the toppings make the difference.' }),
  serving('yogurtcake', 'cakes', 'Yogurt cake (keka bil laban)', [260, 5, 36, 11, 20, 180, 0.5], 'slice', 80,
    { about: 'A soft, moist home cake made with yogurt instead of milk — quick, light and kind to a beginner.' }),
]

/**
 * Everything of the Kitchen's Rooba corner (kind:id): the new foods above, the yogurt dishes and drinks
 * the app already had, the drinks and recipes of rooba, and the sparkling doogh.
 */
export const ROOBA_UIDS = new Set([
  ...ROOBA_17.map(f => 'F:' + f.id),
  'F:yogurt', 'F:greekyogurt', 'F:laban', 'F:labneh', 'F:jajik', 'F:shinena', 'F:smokedlaban', 'F:ayranashi', 'F:tarkhina', 'F:kashkfasulya',
  'F:dolmawhite', 'F:sulukebabi', 'F:imambayildi', 'F:shishbarak', 'F:kashkbademjan', 'F:parfait', 'F:yogurtfruit', 'F:fatteh', 'F:labnehsandwich',
  'F:mansaf', 'F:iskender',
  'R:roobahome', 'R:yogurtcucumber', 'R:honeyyogurt', 'R:datesyogurt', 'R:fatteh', 'R:parfait', 'R:labnehplate',
  'D:shineena', 'D:mastaw', 'D:mangolassi', 'D:lassi', 'D:roobadates', 'D:berrykefir', 'D:kefircucumber', 'D:kefiroat', 'D:greekberry', 'D:greekmango',
  'S:doogh',
])
/** The yogurt drinks among the foods (they go on the Kitchen's milk-drinks shelf). */
export const ROOBA_MILK = new Set(['kefirglass'])
