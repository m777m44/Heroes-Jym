// 5.0 — the food log: what you ate, by meal, against a daily calorie goal.
//
// State (all optional, kept in the normal app state, so backups and Drive carry it):
//   S.food[iso]     = [{ id, f (food id, or null for quick / custom), n (name when not in the
//                       database), kcal, p, c, fat (per serving), q (servings), m ('b'|'l'|'d'|'s'), t (ms) }]
//   S.customFoods   = [{ id: 'cf…', n, kcal, p, c, f, unit, g }]
//   S.foodFav       = [food ids]
//   S.foodGoal      = kcal a day set by hand (0 / missing = automatic)
//
// The day's goal: set by hand → the calorie calculator's "eat" number while that goal runs →
// the Ideal body screen's calories → 2,000.
import { t } from './i18n.js'
import { isoOf, uid } from './format.js'
import { idealBodyOf, macrosFor, goalPlanOf } from './idealBody.js'
import { bodyKg } from './water.js'
import { workoutKcalOn } from './workoutTimer.js'
import { FOODS, FOOD_BY_ID } from './foodDb.js'
import { RECIPE_BY_ID } from './kitchen.js'
import { DRINK_BY_ID } from './drinks.js'

export const MEALS = [
  { key: 'b', name: 'Breakfast', icon: 'sun', color: 'var(--orange)' },
  { key: 'l', name: 'Lunch', icon: 'flame', color: 'var(--red)' },
  { key: 'd', name: 'Dinner', icon: 'moon', color: 'var(--indigo)' },
  { key: 's', name: 'Snacks', icon: 'apple', color: 'var(--green)' },
]
export const MEAL_KEYS = MEALS.map(m => m.key)
export const DEFAULT_GOAL = 2000
export const MIN_GOAL = 800
export const MAX_GOAL = 6000
export const MAX_QTY = 20
export const QTY_STEP = 0.5
export const RECENT_DAYS = 21

/** The meal for a time of day: before 11 breakfast, before 15 lunch, before 18 a snack, before 22 dinner. */
export function mealAt(date = new Date()) {
  const h = date.getHours()
  return h < 11 ? 'b' : h < 15 ? 'l' : h < 18 ? 's' : h < 22 ? 'd' : 's'
}

const num = v => (Number.isFinite(+v) ? +v : 0)
const r0 = v => Math.round(v)
const r1 = v => Math.round(v * 10) / 10
export const clampQty = q => (num(q) > 0 ? Math.min(MAX_QTY, Math.max(QTY_STEP, Math.round(num(q) / QTY_STEP) * QTY_STEP)) : 1)

/** A food by id: the database, then your own foods. */
export function foodOf(S, id) {
  if (!id) return null
  return FOOD_BY_ID[id] || ((S && S.customFoods) || []).find(x => x.id === id) || null
}
/** The display name of a food or a log entry, in the current language. */
export function foodName(S, x) {
  if (!x) return ''
  if (x.f) { const f = foodOf(S, x.f); if (f) return f.custom || !FOOD_BY_ID[f.id] ? f.n : t(f.name) }
  if (x.r && RECIPE_BY_ID[x.r]) return t(RECIPE_BY_ID[x.r].name)
  if (x.dr && DRINK_BY_ID[x.dr]) return t(DRINK_BY_ID[x.dr].name)   // 9.0: a drink from the library
  if (x.name) return t(x.name)
  return x.n || t('Quick calories')
}

export const dayEntries = (S, iso) => (S && S.food && Array.isArray(S.food[iso]) ? S.food[iso] : [])
export const entryKcal = e => r0(num(e.kcal) * num(e.q || 1))

/** Totals for a day: kcal, protein / carbs / fat (g), per meal, and how many entries. */
export function dayTotals(S, iso) {
  const out = { kcal: 0, p: 0, c: 0, f: 0, count: 0, byMeal: { b: 0, l: 0, d: 0, s: 0 } }
  for (const e of dayEntries(S, iso)) {
    const q = num(e.q || 1)
    const k = num(e.kcal) * q
    out.kcal += k
    out.p += num(e.p) * q
    out.c += num(e.c) * q
    out.f += num(e.fat) * q
    out.count++
    const m = MEAL_KEYS.includes(e.m) ? e.m : 's'
    out.byMeal[m] += k
  }
  out.kcal = r0(out.kcal); out.p = r1(out.p); out.c = r1(out.c); out.f = r1(out.f)
  for (const m of MEAL_KEYS) out.byMeal[m] = r0(out.byMeal[m])
  return out
}

/** Whether the calorie calculator's goal covers `iso`. */
function calGoalOn(S, iso) {
  const g = S && S.calGoal
  if (!g || !(g.eatKcal > 0) || !g.from || !(g.days >= 1) || iso < g.from) return false
  const end = isoOf(new Date(new Date(g.from + 'T12:00:00').getTime() + (g.days - 1) * 864e5))
  return iso <= end
}

/** The day's goal: { kcal, source: 'manual' | 'calc' | 'ideal' | 'default', macros: { protein, carbs, fat } }. */
export function foodGoalOf(S, iso) {
  let ideal = null
  try { ideal = idealBodyOf(S) } catch { ideal = null }
  let kcal, source
  if (S && S.foodGoal >= MIN_GOAL) { kcal = r0(S.foodGoal); source = 'manual' }
  else if (calGoalOn(S, iso)) { kcal = r0(S.calGoal.eatKcal); source = 'calc' }
  else if (ideal && ideal.kcal > 0) {
    // 7.1: toward your own target weight when you set one (same pace as the Ideal body screen)
    let g = null
    try { g = S.targetW != null && (S.bodyGoal || 'auto') === 'auto' ? goalPlanOf(S) : null } catch { g = null }
    kcal = r0(g && g.kcal > 0 ? g.kcal : ideal.kcal); source = 'ideal'
  }
  else { kcal = DEFAULT_GOAL; source = 'default' }
  const program = source === 'calc' ? 'lose' : ideal && ideal.program ? ideal.program : 'keep'
  const ref = ideal && ideal.refKg ? ideal.refKg : bodyKg(S) || 70
  const m = macrosFor(kcal, program, ref) || { protein: r0(kcal * 0.2 / 4), carbs: r0(kcal * 0.5 / 4), fat: r0(kcal * 0.3 / 9) }
  return { kcal, source, macros: { protein: m.protein, carbs: m.carbs, fat: m.fat } }
}

/** A new log entry for a food (database or your own) — or a quick one { n, kcal }. */
export function makeEntry(food, { q = 1, m = 's', now = Date.now() } = {}) {
  const base = { id: 'fe' + uid(), q: clampQty(q), m: MEAL_KEYS.includes(m) ? m : 's', t: now }
  if (food && food.id && (FOOD_BY_ID[food.id] || food.custom)) {
    return { ...base, f: food.id, kcal: num(food.kcal), p: num(food.p), c: num(food.c), fat: num(food.f) }
  }
  return { ...base, f: null, n: String((food && food.n) || '').trim().slice(0, 60), kcal: Math.max(0, r0(num(food && food.kcal))), p: num(food && food.p), c: num(food && food.c), fat: num(food && food.f) }
}

/** Mutators — call inside update(s => …). */
export function addEntry(s, iso, entry) {
  s.food = s.food || {}
  s.food[iso] = [...(s.food[iso] || []), entry]
  return entry
}
export function editEntry(s, iso, id, patch) {
  const list = (s.food && s.food[iso]) || []
  const e = list.find(x => x.id === id)
  if (!e) return null
  if (patch.q != null) e.q = clampQty(patch.q)
  if (patch.m && MEAL_KEYS.includes(patch.m)) e.m = patch.m
  return e
}
export function removeEntry(s, iso, id) {
  if (!s.food || !s.food[iso]) return null
  const e = s.food[iso].find(x => x.id === id) || null
  s.food[iso] = s.food[iso].filter(x => x.id !== id)
  if (!s.food[iso].length) delete s.food[iso]
  return e
}
/** Copy a day (or one meal of it) onto another day; returns how many entries were copied. */
export function copyDay(s, fromIso, toIso, meal = null, now = Date.now()) {
  const src = ((s.food && s.food[fromIso]) || []).filter(e => !meal || e.m === meal)
  if (!src.length) return 0
  s.food = s.food || {}
  s.food[toIso] = [...(s.food[toIso] || []), ...src.map((e, i) => ({ ...e, id: 'fe' + uid() + i, t: now }))]
  return src.length
}
export function toggleFav(s, id) {
  const fav = new Set(s.foodFav || [])
  if (fav.has(id)) fav.delete(id); else fav.add(id)
  s.foodFav = [...fav]
  return fav.has(id)
}
export function saveCustomFood(s, { id, n, kcal, p = 0, c = 0, f = 0, g = 0, est = null }) {
  const name = String(n || '').trim().slice(0, 60)
  if (!name) throw Object.assign(new Error('Give it a name'), { key: 'Give it a name' })
  if (!(num(kcal) > 0 && num(kcal) <= 5000)) throw Object.assign(new Error('Enter the calories (1–5,000).'), { key: 'Enter the calories (1–5,000).' })
  s.customFoods = s.customFoods || []
  const food = { id: id || 'cf' + uid(), n: name, kcal: r0(num(kcal)), p: r1(num(p)), c: r1(num(c)), f: r1(num(f)), unit: 'serving', g: Math.max(0, Math.min(5000, r0(num(g)))), custom: true, cat: 'mine', ...(est ? { est } : {}) }
  const i = s.customFoods.findIndex(x => x.id === food.id)
  if (i >= 0) s.customFoods[i] = food; else s.customFoods.push(food)
  return food
}
export function deleteCustomFood(s, id) {
  s.customFoods = (s.customFoods || []).filter(x => x.id !== id)
  s.foodFav = (s.foodFav || []).filter(x => x !== id)
}

// ---- search --------------------------------------------------------------------------------
/** Lower case, no Arabic diacritics / tatweel, one alef / ya / ta marbuta form — so "كبة" finds "كُبّة". */
export function normalize(s) {
  return String(s || '').toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
}
/** Every food you can pick: your own first, then the database. */
export const allFoods = S => [...((S && S.customFoods) || []).map(x => ({ ...x, custom: true, cat: 'mine' })), ...FOODS]

/** Foods matching `q` (translated name, English name or id), best first; `cat` narrows it ('fav', 'mine', a category). */
export function searchFoods(S, q = '', cat = null) {
  const fav = new Set((S && S.foodFav) || [])
  let list = allFoods(S)
  if (cat === 'fav') list = list.filter(x => fav.has(x.id))
  else if (cat) list = list.filter(x => x.cat === cat)
  const nq = normalize(q)
  if (!nq) return list
  const words = nq.split(' ')
  const scored = []
  for (const x of list) {
    const local = normalize(x.custom ? x.n : t(x.name))
    const en = normalize(x.custom ? x.n : x.name)
    const hay = local + ' ' + en + ' ' + x.id
    if (!words.every(w => hay.includes(w))) continue
    const score = (local.startsWith(nq) || en.startsWith(nq) ? 0 : local.includes(' ' + nq) || en.includes(' ' + nq) ? 1 : 2) - (fav.has(x.id) ? 0.5 : 0)
    scored.push([score, x])
  }
  return scored.sort((a, b) => a[0] - b[0]).map(p => p[1])
}

/** Foods you logged lately (newest first, each once). */
export function recentFoods(S, today, n = 10) {
  const out = [], seen = new Set()
  const d = new Date(today + 'T12:00:00')
  for (let i = 0; i < RECENT_DAYS && out.length < n; i++) {
    const iso = isoOf(new Date(d.getTime() - i * 864e5))
    const list = [...dayEntries(S, iso)].sort((a, b) => (b.t || 0) - (a.t || 0))
    for (const e of list) {
      if (!e.f || seen.has(e.f)) continue
      const f = foodOf(S, e.f)
      if (!f) continue
      seen.add(e.f); out.push(f)
      if (out.length >= n) break
    }
  }
  return out
}

/** The last `days` days ending on `iso`: [{ iso, kcal, goal }]. */
export function foodWeek(S, iso, days = 7) {
  const end = new Date(iso + 'T12:00:00')
  return Array.from({ length: days }, (_, i) => {
    const d = isoOf(new Date(end.getTime() - (days - 1 - i) * 864e5))
    return { iso: d, kcal: dayTotals(S, d).kcal, goal: foodGoalOf(S, d).kcal }
  })
}

/** Days in a row (ending today, or yesterday when today is still empty) with something logged. */
export function foodStreak(S, iso) {
  let n = 0
  const d = new Date(iso + 'T12:00:00')
  for (let i = dayEntries(S, iso).length ? 0 : 1; i < 400; i++) {
    if (!dayEntries(S, isoOf(new Date(d.getTime() - i * 864e5))).length) break
    n++
  }
  return n
}

/**
 * A few honest pointers for the day: [{ key, args, tone: 'good' | 'warn' | 'info' }].
 * `hour` = the hour of day (protein is only judged from the evening on).
 */
export function foodInsights(totals, goal, { hour = 12, kg = 70, sweetKcal = 0 } = {}) {
  const out = []
  if (!totals || !totals.count) return out
  const left = goal.kcal - totals.kcal
  if (left < -goal.kcal * 0.1) {
    const over = -left
    const walkMin = Math.max(5, Math.round(over / (4.3 * 3.5 * kg / 200) / 5) * 5)
    out.push({ key: '{0} kcal over today’s goal — a brisk walk of about {1} min burns that.', args: [over, walkMin], tone: 'warn' })
  } else if (left >= 0) {
    out.push({ key: 'On track — {0} kcal left for today.', args: [left], tone: 'good' })
  } else {
    out.push({ key: 'Right at your goal — well balanced.', args: [], tone: 'good' })
  }
  if (hour >= 17 && goal.macros.protein > 0 && totals.p < goal.macros.protein * 0.6) {
    out.push({ key: 'Protein is low today ({0} of {1} g) — eggs, chicken, tuna or yogurt help.', args: [r0(totals.p), goal.macros.protein], tone: 'info' })
  }
  if (totals.kcal >= 600 && totals.f * 9 > totals.kcal * 0.4) {
    out.push({ key: 'Fat is over 40% of today’s calories — try grilled instead of fried.', args: [], tone: 'info' })
  }
  if (sweetKcal >= 250) {
    out.push({ key: 'Sweet drinks and sweets add up: {0} kcal today.', args: [r0(sweetKcal)], tone: 'info' })
  }
  return out
}

/** Calories from sweets and sugary drinks on a day (for the pointer above). */
export function sweetKcalOn(S, iso) {
  const SWEET = new Set(['soda', 'energydrink', 'teasugar', 'lemonmint', 'orangejuice', 'coffeemilk'])
  let k = 0
  for (const e of dayEntries(S, iso)) {
    const f = e.f && FOOD_BY_ID[e.f]
    if (f && (f.cat === 'sweets' || SWEET.has(f.id))) k += entryKcal(e)
  }
  return k
}

/** What the step-counter notification shows: { day, eaten, goal }. */
export function foodNative(S, iso) {
  const d = dayTotals(S, iso), g = foodGoalOf(S, iso)
  // 7.2: macros and their goals, and the workouts' kcal, for the notification's macro strip
  let wk = 0
  try { wk = workoutKcalOn({ ...S, active: null }, iso) } catch { wk = 0 }   // finished sessions only — steady between pushes
  return { day: iso, eaten: d.kcal, goal: g.kcal, p: r0(d.p), c: r0(d.c), f: r0(d.f), pg: r0(g.macros.protein), cg: r0(g.macros.carbs), fg: r0(g.macros.fat), wk }
}

/** "1 plate · 300 g" — a food's usual serving. */
export function servingText(f, U) {
  if (!f || f.custom || !f.unit) return t('1 serving')
  const SERV = { piece: '1 piece', plate: '1 plate', bowl: '1 bowl', cup: '1 cup', glass: '1 glass', slice: '1 slice', tbsp: '1 tablespoon', tsp: '1 teaspoon', handful: '1 handful', can: '1 can', serving: '1 serving', skewer: '1 skewer', scoop: '1 scoop' }
  const g = f.g > 0 ? ' · ' + f.g + ' ' + U(f.ml ? 'ml' : 'g') : ''
  return t(SERV[f.unit] || '1 serving') + g
}
