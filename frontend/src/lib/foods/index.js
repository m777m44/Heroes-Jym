// 13.0 — the food database's new shelves: instant noodles (Indomie, worked out from its parts),
// date cakes in three sizes, canned & processed foods, corner-shop snacks and more Iraqi dishes.
// lib/foodDb.js merges them with the 5.0–11.0 foods; views/FoodDatabase.jsx browses them all.
import { INDOMIE_FOODS } from './indomie.js'
import { DATE_CAKES } from './dateCakes.js'
import { CANNED } from './canned.js'
import { SNACKS } from './snacks.js'
import { IRAQI_MORE, IRAQI_IDS } from './iraqi.js'

export const NEW_CATS = [
  { key: 'noodles', name: 'Instant noodles', icon: 'noodles', color: 'var(--yellow)' },
  { key: 'cakes', name: 'Date cakes', icon: 'cake', color: 'var(--brown, #a2845e)' },
  { key: 'canned', name: 'Canned & processed', icon: 'can', color: 'var(--teal)' },
  { key: 'snacks', name: 'Shop snacks', icon: 'candy', color: 'var(--pink)' },
]

/** Older foods that move to a new shelf (their ids stay, so logs and favourites keep working). */
export const MOVED = { tunawater: 'canned', tunaoil: 'canned', sardines: 'canned' }

export const MORE_FOODS = [...INDOMIE_FOODS, ...DATE_CAKES, ...CANNED, ...SNACKS, ...IRAQI_MORE]

export { IRAQI_IDS }
