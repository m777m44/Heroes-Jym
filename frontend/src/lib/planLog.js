// Logging a block of the schedule: its planned dishes, foods, drinks, soft drinks and nuts go into that
// day's food log with their exact calories, the water into today's water log, and the block is
// marked done. Used by the schedule screen and by the "Done ✓" button on a reminder (applied when
// the app opens again — see planReminders.js).
import { useStore } from '../store/useStore.js'
import { todayISO } from './format.js'
import { addEntry, makeEntry } from './food.js'
import { FOOD_BY_ID } from './foodDb.js'
import { RECIPE_BY_ID, recipeEntry } from './kitchen.js'
import { drinkOf, drinkEntry, noteDrink, drinkNutrition } from './drinks.js'
import { SODA_BY_ID, sodaEntry, sodaNutrition, countsAsWater } from './sodas.js'
import { NUT_BY_ID, nutEntry } from './nuts.js'
import { markBlock, normPlan, dayRec } from './dayPlan.js'
import { logWater } from '../components/water/WaterParts.jsx'

/** Log block `b` for day `iso` and mark it done → { kcal, ml }. */
export function completeBlock(b, iso) {
  const st = useStore.getState()
  const S = st.S
  const meal = b.k === 'meal' ? (b.meal || 'l') : 's'
  let kcal = 0, ml = 0
  st.update(s => {
    for (const it of b.items || []) {
      if (it.t === 'r' && RECIPE_BY_ID[it.id]) { const e = recipeEntry(RECIPE_BY_ID[it.id], { servings: it.q || 1, meal }); addEntry(s, iso, e); kcal += e.kcal * e.q }
      if (it.t === 'd') {
        const d = drinkOf(S, it.id)
        if (d) { const e = drinkEntry(d, { servings: it.q || 1, meal }); addEntry(s, iso, e); noteDrink(s, iso, d.id); kcal += e.kcal * e.q; ml += drinkNutrition(d).ml * e.q }
      }
      if (it.t === 's' && SODA_BY_ID[it.id]) {
        const x = SODA_BY_ID[it.id]
        const e = sodaEntry(x, { pk: it.pk, ml: it.ml, count: it.q || 1, meal }); addEntry(s, iso, e); kcal += e.kcal * e.q
        if (countsAsWater(x)) ml += sodaNutrition(x, e.ml, e.q).ml * 0.9
      }
      if (it.t === 'n' && NUT_BY_ID[it.id]) { const e = nutEntry(NUT_BY_ID[it.id], { g: (it.g || 30) * (it.q || 1), form: it.fm, meal }); addEntry(s, iso, e); kcal += e.kcal }
      // 11.0: foods from the database (eggs, bread, rice and stew…) — per serving, like the food log
      if (it.t === 'f' && FOOD_BY_ID[it.id]) { const e = makeEntry(FOOD_BY_ID[it.id], { q: it.q || 1, m: meal }); addEntry(s, iso, e); kcal += e.kcal * e.q }
    }
    markBlock(s, iso, b.id, 'done')
  })
  if (b.k === 'water') ml += b.ml || 250
  else if (b.k === 'walk' && b.ml > 0) ml += b.ml      // 13.1: the bottle you took on the walk
  if (ml >= 50 && iso === todayISO()) logWater(Math.round(ml))
  return { kcal: Math.round(kcal), ml: Math.round(ml) }
}

/**
 * Apply what was pressed on the reminders while the app was closed: [{ d: ISO, b: blockId, a:
 * 'done' }] → { count, kcal }. A block already done that day is not logged twice.
 */
export function applyPlanActions(actions) {
  let count = 0, kcal = 0
  for (const x of actions || []) {
    if (!x || x.a !== 'done' || !x.d || !x.b) continue
    const plan = normPlan(useStore.getState().S.planner)
    if (!plan) break
    const b = plan.blocks.find(y => y.id === x.b)
    const r = dayRec(plan, x.d) || {}
    if (!b || (r.done || {})[b.id]) continue
    const res = completeBlock(b, x.d)
    count++; kcal += res.kcal
  }
  return { count, kcal }
}
