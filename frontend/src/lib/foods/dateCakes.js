// 13.0 — date cake (كيكة التمر): 15 kinds, each as a small (50 g), medium (100 g) or large
// (150 g) piece. Values per 100 g — home and bakery recipes; the sugars are mostly the dates'.
import { per100 } from './rows.js'

/** Piece sizes: the serving is the small piece, medium and large are × 2 and × 3. */
export const CAKE_SIZES = [
  { key: 's', name: 'Small', g: 50, q: 1 },
  { key: 'm', name: 'Medium', g: 100, q: 2 },
  { key: 'l', name: 'Large', g: 150, q: 3 },
]

const cake = (id, name, v) => per100('datecake' + (id ? '-' + id : ''), 'cakes', name, v, 'piece', 50, { sizes: CAKE_SIZES })

// [kcal, protein, carbs, fat, sugars, sodium] per 100 g
export const DATE_CAKES = [
  cake('', 'Date cake', [340, 5, 52, 12, 34, 230]),
  cake('choc', 'Date cake with chocolate', [395, 6, 55, 17, 38, 250]),
  cake('cream', 'Date cake with cream', [425, 5, 54, 21, 36, 200]),
  cake('nuts', 'Date cake with nuts', [410, 8, 50, 20, 32, 210]),
  cake('coconut', 'Date cake with coconut', [385, 5, 51, 18, 35, 210]),
  cake('honey', 'Date cake with honey', [365, 5, 55, 14, 40, 220]),
  cake('cheese', 'Date cake with cheese', [418, 12, 48, 20, 30, 280]),
  cake('vegan', 'Vegan date cake', [315, 4, 52, 10, 33, 230]),
  cake('gf', 'Gluten-free date cake', [335, 5, 50, 13, 33, 220]),
  cake('oats', 'Date cake with oats', [345, 7, 54, 11, 28, 200]),
  cake('lotus', 'Date cake with Lotus', [440, 5, 58, 21, 40, 260]),
  cake('tahini', 'Date cake with tahini (rashi)', [390, 7, 48, 19, 30, 210]),
  cake('toffee', 'Date cake with toffee sauce', [400, 4, 58, 17, 45, 300]),
  cake('cardamom', 'Date cake with cardamom and saffron', [340, 5, 53, 12, 33, 220]),
  cake('banana', 'Date and banana cake', [310, 5, 50, 10, 30, 220]),
]
