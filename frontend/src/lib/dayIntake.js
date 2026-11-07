// 15.0 — today's caffeine, sugar and salt from everything logged: soft drinks (their label values),
// coffees and teas on the food shelves (caffeine.js), drink recipes (from the coffee or tea in them)
// and every food's sugar and sodium. For the Kitchen's "Today" card on the Drinks tab.
import { FOOD_BY_ID } from './foodDb.js'
import { sodaDay } from './sodas.js'
import { DRINK_BY_ID, drinkCaffeine, drinkNutrition } from './drinks.js'
import { CAF_F } from './caffeine.js'
import { FISH_IDS, FISH_RECIPES } from './foods/iraq15.js'

const r1 = v => Math.round((+v || 0) * 10) / 10

/** { caf mg, sug g, na mg } of a day's entries. */
export function dayIntake(entries) {
  const sd = sodaDay(entries)
  const out = { caf: sd.caffeine, sug: sd.sugar, na: 0 }
  for (const e of entries || []) {
    if (!e || e.sd) continue
    const q = +e.q || 1
    if (e.f && FOOD_BY_ID[e.f]) {
      const f = FOOD_BY_ID[e.f]
      out.caf += (CAF_F[e.f] || 0) * q
      out.sug += (+f.sug || 0) * q
      out.na += (+f.na || 0) * q
    } else if (e.dr && DRINK_BY_ID[e.dr]) {
      const d = DRINK_BY_ID[e.dr]
      out.caf += drinkCaffeine(d) * q
      out.sug += (+drinkNutrition(d).s || 0) * q
    }
  }
  return { caf: Math.round(out.caf), sug: r1(out.sug), na: Math.round(out.na) }
}

/** 15.0 — servings of fish in the last 7 days (counting today), for "fish twice a week". */
export function fishThisWeek(S, todayIso) {
  const food = (S && S.food) || {}
  const end = new Date(todayIso + 'T12:00:00')
  let n = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(end.getTime() - i * 864e5)
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    for (const e of food[iso] || []) if ((e.f && FISH_IDS.has(e.f)) || (e.r && FISH_RECIPES.has(e.r))) n += +e.q || 1
  }
  return Math.round(n * 10) / 10
}
