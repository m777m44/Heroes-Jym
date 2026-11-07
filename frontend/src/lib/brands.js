// 16.0 — drinks by who makes them: Iraq's own drink makers and their drinks in the app, led by the
// one everyone asks about — Abu Janna (أبو جنة) of Mosul. Pure data and lookups; the screen is the
// soft drinks page (views/Sodas.jsx, /sodas?brand=abujanna).
//
// Only what is known: Abu Janna's 4U and Three Stars energy drinks and his soft drink (lemon & mint,
// mint — Open Food Facts 0729927750910 / 0729927750958); Dijla's portfolio from its own site; the
// rest from the makers' pages. The drinks keep the usual values of their kind where the label is not
// published — the soft drinks page says so.
import { SODA_BY_ID } from './sodas.js'

export const BRANDS = [
  {
    key: 'abujanna', name: 'Abu Janna', place: 'Mosul', color: '#f5b301', color2: '#0d1b4b', icon: 'star', featured: true,
    about: 'Abu Janna runs Mosul’s famous fish restaurant — masgouf, fried fish and mutabbaq — and makes drinks: the 4U energy drink, Three Stars, the energy drink that came after it, and his soft drink in lemon & mint and in mint.',
    sodas: ['fouru', 'threestars', 'abujannalm', 'abujannamint'],
    foods: ['masgouf', 'masgoufplate', 'friedfish', 'carpfried', 'mutabbaqsamak'],
    words: 'abu janna abo jana abu jana ابو جنه ابو جنة أبو جنة ابوجنه مسكوف ابو جنة 4u for you فور يو فوريو three stars 3 stars 3stars ثري ستارز ثري ستار 3 ستارز',
  },
  {
    key: 'dijla', name: 'Dijla', place: 'Baghdad', color: '#1565c0', color2: '#e53935', icon: 'can',
    about: 'A Baghdad drinks maker since 1998: RC Cola in Iraq and the Wild Lion energy drink, in cans, glass bottles and big plastic bottles.',
    sodas: ['rccola', 'wildlion'],
    words: 'dijla dijlah دجلة دجله rc cola wild lion',
  },
  {
    key: 'karwanchi', name: 'Karwanchi', place: 'Erbil', color: '#111111', color2: '#f6e05e', icon: 'bolt',
    about: 'An Erbil maker of soft drinks, water, juices and dairy — and of the K9 energy drinks.',
    sodas: ['k9', 'k9perf'],
    words: 'karwanchi كاروانجي كاروانچي k9 كي ناين',
  },
  {
    key: 'aspirash', name: 'ASPI RASH', place: 'Kurdistan', color: '#1565c0', color2: '#f4d35e', icon: 'bolt',
    about: 'The energy drink made in Kurdistan, in 330 ml cans — the classic and Bubble Gum.',
    sodas: ['aspirash', 'aspirashgum'],
    words: 'aspi rash aspirash اسبي رش اسبيرش',
  },
  {
    key: 'pepsiiraq', name: 'Pepsi in Iraq', place: 'Erbil and Baghdad', color: '#0b4ea2', color2: '#e32934', icon: 'can',
    about: 'Pepsi, 7Up, Mirinda and Mountain Dew are bottled in Iraq — by Al Hayat in Erbil and by the Baghdad Soft Drinks Company — the zero versions too.',
    sodas: ['pepsi', 'pepsizero', 'pepsidiet', '7up', '7upfree', 'mirinda', 'mirindastraw', 'mirindaapple', 'mirindacitrus', 'mdew', 'mdewdiet', 'shani', 'teem'],
    words: 'pepsi al hayat alhayat الحياة بيبسي سفن اب ميرندا ماونتن ديو شاني تيم بغداد للمشروبات الغازية',
  },
]

export const BRAND_BY_KEY = Object.fromEntries(BRANDS.map(b => [b.key, b]))
const BRAND_OF = new Map()
for (const b of BRANDS) for (const id of b.sodas) if (!BRAND_OF.has(id)) BRAND_OF.set(id, b.key)

/** The maker of a soft drink (a BRANDS entry) or null. */
export const brandOf = sodaId => BRAND_BY_KEY[BRAND_OF.get(sodaId)] || null
/** A maker's drinks that exist, in its order. */
export const brandSodas = key => ((BRAND_BY_KEY[key] && BRAND_BY_KEY[key].sodas) || []).map(id => SODA_BY_ID[id]).filter(Boolean)
/** Every drink made in Iraq, as a Set of soft drink ids. */
export const MADE_IN_IRAQ = new Set(BRANDS.flatMap(b => b.sodas))
/** The extra words a search should match a drink by: its maker's name and the ways people write it. */
export const brandWords = sodaId => { const b = brandOf(sodaId); return b ? b.name + ' ' + b.words : '' }
