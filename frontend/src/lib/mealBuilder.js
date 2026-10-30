// 14.0 — the meal builder's logic (components/kitchen/MealBuilder.jsx): a dish as its ingredients by
// weight — a street food (lib/foods/street.js), a recipe (lib/kitchen.js) or anything you put
// together — the steps of each amount, what you changed against the usual recipe, and the food-log
// entry it becomes. Nothing here touches the store, so it stays testable.
//
//   base   { name (English, a t() key), fid (food id) | rid (recipe id), items: [{ id, g }] }
//   items  what is in it now — same shape; an amount of 0 means taken out
import { ING_BY_ID, ING_CATS, itemsTotals, RECIPE_BY_ID, recipeItems, recipeEntry } from './kitchen.js'
import { FOOD_BY_ID } from './foodDb.js'
import { makeEntry } from './food.js'
import { buildOf } from './foods/street.js'

const r1 = v => Math.round(v * 10) / 10
const PIECES = new Set(['piece', 'slice', 'clove'])

/**
 * How much one tap on − / + changes an ingredient: a whole piece when it is counted in pieces (a patty,
 * a falafel, a slice of cheese, a bun — not the 25 g of tomato in a sandwich), a spoon of sauce,
 * 0.5 g of salt, 5–25 g of the rest.
 */
export function stepOf(id, g = 0) {
  const x = ING_BY_ID[id]
  if (!x) return 10
  if (id === 'salt') return 0.5
  if (PIECES.has(x.unit) && x.g >= 8 && g >= x.g * 0.75) return x.g
  if (x.unit === 'tbsp' || x.unit === 'tsp') return x.cat === 'pantry' ? 5 : x.g
  return g < 50 ? 5 : g < 200 ? 10 : 25
}
/** Keeps an amount sensible: 0 … 1,500 g, to the step's precision. */
export const clampG = (id, g) => {
  const st = stepOf(id, g)
  const v = Math.max(0, Math.min(1500, +g || 0))
  return st < 1 ? Math.round(v * 2) / 2 : Math.round(v)
}
/** "2 ×" for things counted in pieces (patties, falafel, slices), or ''. */
export function piecesOf(id, g) {
  const x = ING_BY_ID[id]
  if (!x || !PIECES.has(x.unit) || !(x.g >= 8) || !(g >= x.g * 0.75)) return ''
  const n = g / x.g
  return Math.abs(n - Math.round(n)) < 0.01 ? String(Math.round(n)) : String(r1(n))
}
/** The ingredient's shelf (icon and colour for a row without a photo). */
export const catOf = id => ING_CATS.find(c => c.key === (ING_BY_ID[id] || {}).cat) || ING_CATS[0]

/** A dish to build: a food built from parts, or a recipe (its required ingredients plus the optional ones chosen). */
export function baseOf({ fid = null, rid = null, opt = null } = {}) {
  if (fid) {
    const f = FOOD_BY_ID[fid], items = buildOf(fid)
    if (!f || !items) return null
    return { name: f.name, fid, items, unit: f.unit }
  }
  if (rid) {
    const r = RECIPE_BY_ID[rid]
    if (!r) return null
    return { name: r.name, rid, items: recipeItems(r, null, opt || []).map(i => ({ id: i.id, g: i.g })), unit: 'serving' }
  }
  return null
}

/**
 * What changed against the usual recipe, in its order (then what was added):
 * '-' taken out · '+' added · '^' more of it (≥ 15 % more) · 'v' less of it (≥ 15 % less).
 */
export function diffBuild(base, items) {
  const now = new Map()
  for (const it of items || []) if (ING_BY_ID[it.id]) now.set(it.id, (now.get(it.id) || 0) + (+it.g || 0))
  const out = [], seen = new Set()
  for (const b of base || []) {
    if (seen.has(b.id)) continue
    seen.add(b.id)
    const g = now.get(b.id) || 0
    if (g <= 0) out.push(['-', b.id])
    else if (g >= b.g * 1.15 && g - b.g >= 1) out.push(['^', b.id])
    else if (g <= b.g * 0.85 && b.g - g >= 1) out.push(['v', b.id])
  }
  for (const [id, g] of now) if (!seen.has(id) && g > 0) out.push(['+', id])
  return out
}

/** The entry's details for the food log: the dish's English name and the changes by ingredient name. */
export const changesForLog = (base, changes) => ({ n: base.name, x: changes.map(([k, id]) => [k, ING_BY_ID[id].name]) })

/**
 * The food-log entry for what was built, `q` times. Unchanged, it is the food (or the recipe) itself —
 * its name follows the language; changed, it keeps its own values and the list of changes (`mb`),
 * which lib/food.js builtLabel turns into "Beef burger (without mayonnaise · + cheddar)".
 */
export function builtEntry(base, items, { q = 1, meal = 's', label = '', now = Date.now() } = {}) {
  const changes = diffBuild(base.items, items)
  const live = items.filter(i => ING_BY_ID[i.id] && i.g > 0)
  if (!changes.length && base.fid && FOOD_BY_ID[base.fid]) return makeEntry(FOOD_BY_ID[base.fid], { q, m: meal, now })
  if (!changes.length && base.rid && RECIPE_BY_ID[base.rid]) return { ...recipeEntry(RECIPE_BY_ID[base.rid], { servings: q, meal, withOptional: live.map(i => i.id), now }) }
  const tot = itemsTotals(live)
  const e = makeEntry({ n: label || base.name, kcal: tot.kcal, p: tot.p, c: tot.c, f: tot.f }, { q, m: meal, now })
  return { ...e, mb: changesForLog(base, changes) }
}

/** Totals of what is in it now, and the difference to the usual recipe. */
export function buildTotals(base, items) {
  const now = itemsTotals(items), was = itemsTotals(base.items)
  return { ...now, dk: now.kcal - was.kcal, dna: now.na - was.na }
}
