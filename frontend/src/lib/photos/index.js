// 14.0 — the real photo of anything in the kitchen: a food, dish, drink, soft drink, nut or
// recipe (the list: ./manifest.js; the files: public/food/m|t/<key>.webp, fetched from Wikimedia
// Commons by scripts/food-photos/fetch.mjs). Every build ships them next to the app, except the
// online (light) Android app, which takes them from this repository through the CDN like the
// wallpapers (lib/assets.js).
//
//   photoKey('F', 'dolma')   → 'dolma' (or null: no photo — show the icon instead)
//   photoUrl('dolma', 'm')   → the big 640 × 480 picture; 't' → the 200 × 200 one for lists
//   loadCredits()            → { key: [file, author, licence] } — who took each photo (lazy:
//                              only the photo sheets and the credits list need it)
import { PHOTO_ROWS } from './manifest.js'
import { cleanAuthor } from './url.js'
export { photoUrl, driftOf, cleanAuthor } from './url.js'

const BY_ITEM = new Map()
const KEYS = new Set()
for (const [key, , items] of PHOTO_ROWS) {
  KEYS.add(key)
  for (const it of items.split(' ')) if (it) BY_ITEM.set(it, key)
}
/** How many different photos the kitchen has. */
export const PHOTO_COUNT = KEYS.size

/** The photo of an item: kind F food · D drink · S soft drink · N nut · R recipe · I/J ingredient. */
export const photoKey = (kind, id) => BY_ITEM.get(kind + ':' + id) || null
export const isPhotoKey = key => KEYS.has(key)
/** The items that show a photo. */
export const itemsOfPhoto = key => (PHOTO_ROWS.find(r => r[0] === key) || ['', '', ''])[2].split(' ').filter(Boolean)
let credits = null
/** Who took each photo: { key: [file, author, licence] }. */
export function loadCredits() {
  if (!credits) {
    credits = import('./credits.json').then(m => {
      const raw = m.default || m
      const out = {}
      for (const [k, v] of Object.entries(raw)) { const c = Array.isArray(v) ? v : [v.f, v.a, v.l]; out[k] = [c[0], cleanAuthor(c[1]), c[2]] }
      return out
    }).catch(() => { credits = null; return {} })
  }
  return credits
}
/** The Wikimedia Commons page of a photo's file. */
export const commonsUrl = file => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(String(file || '').replace(/ /g, '_'))
