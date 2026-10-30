// 14.0 — open anything from the Kitchen in its own sheet: a food (or the Indomie builder, or the
// meal builder for a dish built from parts), a
// recipe, a drink recipe, a soft drink or a nut — each view loads only when it is first needed.
import { useStore } from '../../store/useStore.js'
import { FOOD_BY_ID } from '../../lib/foodDb.js'
import { noteSeen } from '../../lib/kitchenHub.js'

export function openItem(x, { meal = null, iso = null } = {}) {
  if (!x) return Promise.resolve()
  try { useStore.getState().update(s => { noteSeen(s, x.uid) }) } catch { /* the store isn't ready */ }
  const opts = { ...(meal ? { meal } : null), ...(iso ? { iso } : null) }
  switch (x.kind) {
    case 'F': return import('../../views/FoodDatabase.jsx').then(m => {
      const f = FOOD_BY_ID[x.id]
      if (!f) return
      m.openFoodSheet(f, opts)   // Indomie → its builder, street food → the meal builder, else the food card
    })
    case 'R': return import('../../views/Kitchen.jsx').then(m => m.recipeSheet(x.id, meal))
    case 'D': return import('../../views/Drinks.jsx').then(m => m.drinkSheet(x.id))
    case 'S': return import('../../views/Sodas.jsx').then(m => m.sodaSheet(x.id, opts))
    case 'N': return import('../../views/Nuts.jsx').then(m => m.nutSheet(x.id, opts))
    default: return Promise.resolve()
  }
}
