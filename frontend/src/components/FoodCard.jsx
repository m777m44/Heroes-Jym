// 5.0 — Home → Food: today's calorie ring (left / over), the four meals at a glance and one
// tap to add to the meal of the hour. Everything else is on /food.
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import { t, U } from '../lib/i18n.js'
import { nav } from '../lib/nav.js'
import { MEALS, dayTotals, foodGoalOf, mealAt } from '../lib/food.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { FoodRing, addFoodSheet, mealName, n0 } from './food/FoodSheets.jsx'

export default function FoodCard() {
  const S = useStore(s => s.S)
  const iso = todayISO()
  const totals = dayTotals(S, iso)
  const goal = foodGoalOf(S, iso)
  const left = goal.kcal - totals.kcal
  const next = mealAt()
  return <div className="card food-card">
    <div className="row between" style={{ marginBottom: 10 }}>
      <button className="h2link" onClick={() => nav('/food')}>
        <span className="lrow-i" style={{ '--tint': 'var(--pink)' }}><Icon name="fork" /></span>
        <h2 style={{ margin: 0 }}>{t('Food')}</h2><Icon name="chevronRight" />
      </button>
      <span className="small muted">{t('Goal {0} kcal', n0(goal.kcal))}</span>
    </div>
    <div className="food-card-b">
      <FoodRing eaten={totals.kcal} goal={goal.kcal} size={92} stroke={9}>
        <b>{n0(Math.abs(left))}</b><span>{left >= 0 ? t('kcal left') : t('kcal over')}</span>
      </FoodRing>
      <div className="food-card-m">
        {MEALS.map(m => <button key={m.key} className="food-card-r" onClick={() => addFoodSheet({ iso, meal: m.key })} aria-label={t('Add to {0}', t(m.name))}>
          <Icon name={m.icon} style={{ color: m.color }} /><span className="grow">{t(m.name)}</span>
          <b>{totals.byMeal[m.key] ? n0(totals.byMeal[m.key]) : '—'}</b>
        </button>)}
        <div className="small muted food-card-eaten">{t('Eaten {0} of {1} {2}', n0(totals.kcal), n0(goal.kcal), U('kcal'))}</div>
      </div>
    </div>
    <div style={{ height: 10 }} />
    <div className="food-card-acts">
      <Button variant="tinted" icon="plus" onClick={() => addFoodSheet({ iso, meal: next })}>{t('Add to {0}', mealName(next))}</Button>
      <Button variant="tinted" icon="fork" onClick={() => nav('/kitchen?m=' + next)}>{t('What can I cook?')}</Button>
    </div>
  </div>
}
