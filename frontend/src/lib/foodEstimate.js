// 7.2 — "the app works out the calories": you type what you ate (any words, Arabic or
// English) and how much, and this finds the closest food in the database — or the
// ingredients it is made of — and scales its calories and macros to your amount. Offline,
// no AI, no network: plain word matching with Arabic normalisation (أ/إ/آ → ا, ة → ه, ى → ي,
// no diacritics), the "ال / بال / وال" prefixes dropped, and singular/plural tolerance.
//
//   estimateFood(S, 'كبة موصلية', { grams: 200, tr: t })
//   → { kcal, p, c, f, g, method: 'food' | 'ingredients' | 'guess', confidence: 'high' | 'medium' | 'low',
//       match, ings, alts }
import { allFoods, normalize } from './food.js'
import { INGREDIENTS } from './kitchen.js'

const r0 = v => Math.round(v)
const r1 = v => Math.round(v * 10) / 10

/** Calories from macros (Atwater): 4 per g of protein and carbs, 9 per g of fat. */
export const kcalFromMacros = (p = 0, c = 0, f = 0) => r0(4 * (+p || 0) + 4 * (+c || 0) + 9 * (+f || 0))

const STOP = new Set(['مع', 'و', 'في', 'من', 'على', 'بدون', 'او', 'صحن', 'كوب', 'قطعه', 'حبه', 'نص', 'ربع', 'شويه', 'اكله',
  'with', 'and', 'of', 'the', 'a', 'an', 'in', 'on', 'or', 'without', 'plate', 'bowl', 'cup', 'piece', 'some', 'my', 'half'])
const PREFIX = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال']

/** The words of a name, normalised, with the Arabic article dropped and filler words removed. */
export function words(s) {
  return normalize(s).split(/[\s,.\-/+&·،()]+/)
    .map(w => { for (const p of PREFIX) if (w.startsWith(p) && w.length - p.length >= 2) return w.slice(p.length); return w })
    .filter(w => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w))
}

// two words match when equal, or one starts with the other (≥3 letters, at most 2 extra) —
// so "كبه" finds "كبة", "رمان" finds "رمانة", "apple" finds "apples"
function same(a, b) {
  if (a === b) return true
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  return s.length >= 3 && l.startsWith(s) && l.length - s.length <= 2
}
// and a leading و / ب (and, with) is tried off too — "وتمر" → "تمر"
const forms = w => (/^[وب][\u0621-\u064A]{3,}$/.test(w) ? [w, w.slice(1)] : [w])
const hit = (q, H) => forms(q).some(x => H.some(h => same(x, h)))

/** How well `query` words describe an item with words `H`: 0…1. */
export function scoreWords(Q, H) {
  if (!Q.length || !H.length) return 0
  const mq = Q.filter(q => hit(q, H)).length
  if (!mq) return 0
  const mh = H.filter(h => Q.some(q => forms(q).some(x => same(x, h)))).length
  return (mq / Q.length) * 0.7 + (mh / H.length) * 0.3
}

// the item's words in your language and in English — scored separately, the better one counts
const itemWords = (x, tr) => (x.custom ? [words(x.n)] : [words(tr(x.name)), words(x.name)])
const bestScore = (Q, x, tr) => Math.max(...itemWords(x, tr).map(H => scoreWords(Q, H)))

/** Foods ranked for a typed name: [{ food, score }], best first (score ≥ 0.34). */
export function rankFoods(S, name, tr = v => v, limit = 6) {
  const Q = words(name)
  if (!Q.length) return []
  const out = []
  for (const x of allFoods(S)) {
    let s = bestScore(Q, x, tr)
    if (s <= 0) continue
    if (x.custom) s += 0.15                 // your own food comes first
    if (s >= 0.34) out.push({ food: x, score: Math.min(1, s) })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** A food's numbers for `grams` (its usual serving when grams is empty or the food has no weight). */
export function scaleFood(x, grams) {
  const g = +grams > 0 ? +grams : 0
  const k = g && x.g > 0 ? g / x.g : 1
  return { kcal: r0(x.kcal * k), p: r1(x.p * k), c: r1(x.c * k), f: r1(x.f * k), g: g && x.g > 0 ? r0(g) : (x.g || 0) }
}

// rough energy density (kcal per 100 g) when nothing matches, by a hint in the name
const GUESS = [
  [/(حلو|كيك|كعك|بسكت|شوكولا|sweet|cake|cookie|chocolate|dessert)/, 400],
  [/(مقلي|مقليه|فرايز|fried|fries|crispy)/, 290],
  [/(سلطه|salad|خضار|veg)/, 70],
  [/(شوربه|soup|مرقه|stew)/, 75],
  [/(عصير|juice|شربت|drink)/, 50],
  [/(لحم|meat|كباب|kebab|دجاج|chicken|سمك|fish)/, 210],
]
export const DEFAULT_DENSITY = 150

/**
 * The calories of a food you name. `grams` is how much you ate (empty → one usual serving).
 * Picks the best database match; else adds up the kitchen ingredients the name mentions; else
 * guesses from an energy density. `alts` are other close foods to choose from.
 */
export function estimateFood(S, name, { grams = null, tr = v => v } = {}) {
  const ranked = rankFoods(S, name, tr)
  const best = ranked[0]
  const g = +grams > 0 ? +grams : null
  if (best && best.score >= 0.5) {
    const v = scaleFood(best.food, g)
    return { ...v, method: 'food', confidence: best.score >= 0.85 ? 'high' : 'medium', match: best.food, ings: [], alts: ranked.slice(1, 5).map(x => x.food) }
  }
  // ingredients the name mentions ("رز ودجاج وطماطة") — each counts equally toward the weight
  const Q = words(name)
  const ings = Q.length ? INGREDIENTS.filter(x => itemWords(x, tr).some(H => Q.some(q => hit(q, H)))) : []
  if (ings.length) {
    const w = g || Math.min(400, 120 * ings.length)
    const share = w / ings.length / 100
    const sum = k => ings.reduce((n, x) => n + x[k] * share, 0)
    return { kcal: r0(sum('kcal')), p: r1(sum('p')), c: r1(sum('c')), f: r1(sum('f')), g: r0(w), method: 'ingredients', confidence: 'medium', match: null, ings, alts: ranked.map(x => x.food).slice(0, 4) }
  }
  if (!Q.length) return null
  const n = normalize(name)
  const d = (GUESS.find(([re]) => re.test(n)) || [null, DEFAULT_DENSITY])[1]
  const w = g || 200
  const kcal = r0(d * w / 100)
  // a balanced split for the guess: 20 % protein, 50 % carbs, 30 % fat
  return { kcal, p: r1(kcal * 0.2 / 4), c: r1(kcal * 0.5 / 4), f: r1(kcal * 0.3 / 9), g: w, method: 'guess', confidence: 'low', match: null, ings: [], alts: ranked.map(x => x.food).slice(0, 4) }
}
