// 15.0 — what the photo viewer (components/kitchen/Spotlight.jsx) says about a food or drink:
// its amount, the nutrition table per serving and per 100 g (or ml), the split of its energy
// between protein, carbs and fat, its share of a day, the facts worth knowing (a few short lines,
// most important first) and a lighter choice of the same kind. Plain functions on a Kitchen item
// ({ uid, kind, name, kcal, p, c, f, sug?, na?, fib?, caf?, g?, ml?, cat, rg?, … }) — testable.
import { kJ, burnMinutes, proteinPer100kcal } from './foodDetails.js'

const r0 = v => Math.round(+v || 0)
const r1 = v => Math.round((+v || 0) * 10) / 10

/** Daily references: sodium (WHO), sugar (WHO: free sugars), caffeine (EFSA, adults), fibre. */
export const DAY = { na: 2000, sug: 50, caf: 400, fib: 30 }

/** How much one serving is: { v, u: 'g' | 'ml' } — or null (a recipe or a drink by the glass). */
export function amountOf(x) {
  if (!x) return null
  if (x.kind === 'S') return x.ml > 0 ? { v: x.ml, u: 'ml' } : null
  if (x.g > 0) return { v: x.g, u: x.ml ? 'ml' : 'g' }
  return null
}

/** The values per 100 g (or 100 ml), or null when the serving's weight isn't known. */
export function per100(x) {
  const a = amountOf(x)
  if (!a) return null
  const k = 100 / a.v
  const out = { u: a.u, kcal: r0(x.kcal * k), p: r1(x.p * k), c: r1(x.c * k), f: r1(x.f * k) }
  for (const key of ['sug', 'fib']) if (x[key] != null) out[key] = r1(x[key] * k)
  for (const key of ['na', 'caf']) if (x[key] != null) out[key] = r0(x[key] * k)
  return out
}

/** Where the energy comes from, in % (protein 4, carbs 4, fat 9 kcal a gram) — adds up to 100. */
export function macroSplit(x) {
  const pk = (+x.p || 0) * 4, ck = (+x.c || 0) * 4, fk = (+x.f || 0) * 9
  const tot = pk + ck + fk
  if (!tot) return { p: 0, c: 0, f: 0 }
  const p = Math.round(pk / tot * 100), c = Math.round(ck / tot * 100)
  return { p, c, f: Math.max(0, 100 - p - c) }
}

/** The rows of the nutrition table: [key, label, per serving, per 100, unit, sub-row?]. */
export function nutritionRows(x) {
  const h = per100(x)
  const rows = [
    ['kcal', 'Calories', r0(x.kcal), h && h.kcal, 'kcal'],
    ['kj', 'Kilojoules', kJ(x.kcal), h && kJ(h.kcal), 'kJ', true],
    ['p', 'Protein', r1(x.p), h && h.p, 'g'],
    ['c', 'Carbs', r1(x.c), h && h.c, 'g'],
  ]
  if (x.sug != null) rows.push(['sug', 'of which sugars', r1(x.sug), h && h.sug, 'g', true])
  if (x.fib != null) rows.push(['fib', 'Fibre', r1(x.fib), h && h.fib, 'g'])
  rows.push(['f', 'Fat', r1(x.f), h && h.f, 'g'])
  if (x.na != null) {
    rows.push(['na', 'Sodium', r0(x.na), h && h.na, 'mg'])
    rows.push(['salt', 'Salt', r1(x.na * 2.5 / 1000), h && r1(h.na * 2.5 / 1000), 'g', true])
  }
  if (x.caf > 0) rows.push(['caf', 'Caffeine', r0(x.caf), h && h.caf, 'mg'])
  return rows
}

/** The share of a day: calories of your goal, and sugar, salt, caffeine and fibre of their daily mark. */
export function dayShares(x, goalKcal = 2000) {
  const out = [{ key: 'kcal', name: 'Of your daily calories', v: r0(x.kcal), max: goalKcal > 0 ? goalKcal : 2000, u: 'kcal' }]
  if (x.sug > 0) out.push({ key: 'sug', name: 'Of the daily sugar limit', v: r1(x.sug), max: DAY.sug, u: 'g' })
  if (x.na > 0) out.push({ key: 'na', name: 'Of the daily sodium limit', v: r0(x.na), max: DAY.na, u: 'mg' })
  if (x.caf > 0) out.push({ key: 'caf', name: 'Of the daily caffeine limit', v: r0(x.caf), max: DAY.caf, u: 'mg' })
  if (x.fib > 0) out.push({ key: 'fib', name: 'Of the fibre you need a day', v: r1(x.fib), max: DAY.fib, u: 'g', good: true })
  return out.map(s => ({ ...s, pct: Math.round(s.v / s.max * 100) }))
}

const FRIED = /\b(fried|fries|crispy|breaded|zinger|nuggets|chips)\b/i
const FISHY = /\b(fish|masgouf|shabbout|salmon|tuna|sardines?|shrimp|prawns?|sbour|shad|zubaidi|pomfret|biyah|mullet|carp|tilapia|gattan|bunni|barbel|masmouta|mukashat|saloona|mutabbaq)\b/i

/**
 * The facts worth knowing, most important first: { key, icon, tint, text (a t() key), args }.
 * `kg` (body weight) sets the walk that burns it.
 */
export function factsOf(x, { kg = 70 } = {}) {
  if (!x) return []
  const out = []
  const add = (key, icon, tint, text, ...args) => out.push({ key, icon, tint, text, args })
  if (x.cat === 'energy') add('energy', 'bolt', 'var(--orange)', 'High in caffeine — not for children, pregnancy or anyone sensitive to caffeine. Never mix it with alcohol, and not during hard exercise in the heat.')
  if (x.caf >= 1) add('caf', 'bolt', 'var(--orange)', 'Caffeine: {0} mg — about {1} of a cup of coffee', r0(x.caf), r1(x.caf / 95))
  if (x.na >= 1500) add('salt', 'salt', 'var(--red)', 'Very salty: {0}% of the most sodium you should have in a day', r0(x.na / DAY.na * 100))
  else if (x.na >= 800) add('salt', 'salt', 'var(--orange)', 'Salty: {0}% of the daily sodium limit — drink water with it', r0(x.na / DAY.na * 100))
  if (x.sug >= 25) add('sugar', 'candy', 'var(--pink)', 'Very sweet: {0} g of sugar — about {1} teaspoons', r0(x.sug), r1(x.sug / 4))
  if (x.p >= 20) add('protein', 'dumbbell', 'var(--red)', 'Rich in protein: {0} g — good for your muscles', r0(x.p))
  if (x.kcal > 0 && proteinPer100kcal(x) >= 7) add('lean', 'flame', 'var(--green)', 'Lean: {0} g of protein for every 100 kcal', proteinPer100kcal(x))
  if (x.fib >= 6) add('fibre', 'leafy', 'var(--green)', 'High in fibre: {0} g — it keeps you full for longer', r1(x.fib))
  if (FISHY.test(x.name) && x.kind !== 'S') add('fish', 'fish', 'var(--teal)', 'Fish is good for the heart and the brain — try to eat it twice a week')
  if (FRIED.test(x.name)) add('fried', 'flame', 'var(--orange)', 'Fried — grilled or baked saves a lot of oil')
  if (x.kcal >= 800) add('big', 'scale', 'var(--orange)', 'A big meal: {0}% of a 2,000 kcal day', r0(x.kcal / 20))
  else if (x.kcal > 0 && x.kcal <= 150 && x.kind !== 'S') add('light', 'leafy', 'var(--green)', 'Light: under 150 kcal')
  if (x.kcal > 0) {
    const b = burnMinutes(x.kcal, kg)
    add('burn', 'figureWalk', 'var(--teal)', 'To burn it off: {0} min walking · {1} min running', b.walk, b.run)
  }
  return out
}

const STOP = new Set(['with', 'and', 'the', 'from', 'plate', 'sandwich', 'fried', 'grilled', 'baked', 'boiled', 'style', 'iraqi', 'big', 'small',
  'cup', 'can', 'bowl', 'piece', 'home', 'made', 'homemade', 'fresh', 'sauce', 'served', 'over', 'little', 'skewer', 'skewers', 'stew', 'zero', 'sugar',
  'free', 'diet', 'light', 'energy', 'drink', 'drinks', 'juice', 'classic', 'original', 'whole', 'half', 'large', 'medium', 'serving', 'pack'])
const wordsOf = n => String(n || '').toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 4 && !STOP.has(w))

/**
 * A lighter choice of the same kind (a drink for a drink, a food for a food) that shares a word of
 * its name and has at least a fifth fewer calories — grilled for fried, the sugar-free can, the
 * plain one for the loaded one. { item, save } or null.
 */
export function lighterChoice(x, items) {
  if (!x || !(x.kcal >= 80) || !items) return null
  const w = new Set(wordsOf(x.name))
  if (!w.size) return null
  const drink = x.kind === 'S' || x.kind === 'D' || !!x.drink
  let best = null, bestScore = 0
  for (const y of items) {
    if (y.uid === x.uid || !(y.kcal > 0) || y.kcal > x.kcal * 0.8 || y.mine) continue
    if ((y.kind === 'S' || y.kind === 'D' || !!y.drink) !== drink) continue
    if (x.kind === 'S' && y.kind !== 'S') continue
    if (x.kind === 'F' && y.kind === 'F' && x.cat && y.cat !== x.cat) continue   // a sandwich for a sandwich, a grill for a grill
    if (x.kind === 'F' && y.kind === 'R') continue
    let shared = 0
    for (const word of wordsOf(y.name)) if (w.has(word)) shared++
    if (!shared) continue
    const score = shared * 10 + (1 - y.kcal / x.kcal) * 4 + (y.ph ? 1 : 0)
    if (score > bestScore) { best = y; bestScore = score }
  }
  return best ? { item: best, save: r0(x.kcal - best.kcal) } : null
}

/** A short text to send someone: the name, the serving, calories and macros, the place. */
export function shareLines(x, { name, serving, place, tr = s => s, unit = s => s } = {}) {
  const lines = [name + (place ? ' — ' + place : '')]
  if (serving) lines.push(serving)
  lines.push(r0(x.kcal) + ' ' + unit('kcal') + ' · ' + tr('Protein') + ' ' + r1(x.p) + ' ' + unit('g') + ' · ' + tr('Carbs') + ' ' + r1(x.c) + ' ' + unit('g') + ' · ' + tr('Fat') + ' ' + r1(x.f) + ' ' + unit('g'))
  lines.push('MAHDI-JYM')
  return lines.join('\n')
}
