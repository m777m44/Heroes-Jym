// 13.0 — the food database's new shelves: instant noodles (Indomie, worked out from its parts),
// date cakes in three sizes, canned & processed foods, corner-shop snacks and more Iraqi dishes.
// 13.1 — what Iraqi shops and markets sell (market.js): more noodles, packaged cakes, canned
// mahshi, halqoum, alij (gum), chocolate, biscuits, chips, dairy cups, bread, frozen food, ice cream
// and boxed juices; every packaged food gets its aisle (`mk`) for the "Shops & markets" shelf.
// lib/foodDb.js merges them with the 5.0–11.0 foods; views/FoodDatabase.jsx browses them all.
import { INDOMIE_FOODS } from './indomie.js'
import { DATE_CAKES } from './dateCakes.js'
import { CANNED } from './canned.js'
import { SNACKS } from './snacks.js'
import { IRAQI_MORE, IRAQI_IDS } from './iraqi.js'
import { MARKET, MARKET_OLD, MARKET_CATS, MARKET_TYPES } from './market.js'

export const NEW_CATS = [
  { key: 'noodles', name: 'Instant noodles', icon: 'noodles', color: 'var(--yellow)' },
  { key: 'cakes', name: 'Cakes', icon: 'cake', color: 'var(--brown, #a2845e)' },
  { key: 'canned', name: 'Canned & processed', icon: 'can', color: 'var(--teal)' },
  { key: 'snacks', name: 'Shop snacks', icon: 'candy', color: 'var(--pink)' },
]

/** Older foods that move to a new shelf (their ids stay, so logs and favourites keep working). */
export const MOVED = { tunawater: 'canned', tunaoil: 'canned', sardines: 'canned' }

export const MORE_FOODS = [...INDOMIE_FOODS, ...DATE_CAKES, ...CANNED, ...SNACKS, ...IRAQI_MORE, ...MARKET]

const OLD_AISLE = Object.fromEntries(Object.entries(MARKET_OLD).flatMap(([mk, ids]) => ids.map(id => [id, mk])))
/** 13.1 — a food's aisle on the "Shops & markets" shelf, or '' when it isn't sold packaged. */
export const marketOf = f => (f && (f.mk || OLD_AISLE[f.id] || MARKET_CATS[f.cat])) || ''

export { IRAQI_IDS, MARKET, MARKET_TYPES }
