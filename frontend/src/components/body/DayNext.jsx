// 7.1 — Home: what is next in "Your day" (meal, water, workout or walk) and the two after it.
// Tapping opens the full timeline on the Ideal body screen.
import { useStore } from '../../store/useStore.js'
import { t, U } from '../../lib/i18n.js'
import { fmtNum, todayISO } from '../../lib/format.js'
import { idealBodyOf } from '../../lib/idealBody.js'
import { daySchedule } from '../../lib/daySchedule.js'
import { mealName } from '../food/FoodSheets.jsx'
import { nav } from '../../lib/nav.js'
import Icon from '../Icon.jsx'

const KIND = { water: ['drop', 'var(--blue)'], meal: ['flame', 'var(--orange)'], workout: ['dumbbell', 'var(--acc)'], walk: ['figureWalk', 'var(--green)'] }
const what = it => it.kind === 'water' ? t('Drink {0} ml', fmtNum(it.ml)) : it.kind === 'meal' ? mealName(it.meal) + (it.kcal ? ' · ' + t('{0} kcal', fmtNum(it.kcal)) : '')
  : it.kind === 'workout' ? t(it.plan.title) : t('Evening walk')

export default function DayNext() {
  const S = useStore(s => s.S)
  let d = null
  try {
    const r = idealBodyOf(S)
    if (r && r.ideal && r.bmi != null) d = daySchedule(S, r, todayISO())
  } catch { d = null }
  if (!d) return null
  const up = d.items.filter(x => KIND[x.kind] && x.status !== 'done' && x.status !== 'late').slice(0, 3)
  if (!up.length) return null
  const [first, ...rest] = up
  return <button className="card dn" onClick={() => nav('/ideal')} style={{ '--c': KIND[first.kind][1] }}>
    <span className="dn-ring" style={{ '--p': d.pct + '%' }}><Icon name={KIND[first.kind][0]} /></span>
    <span className="dn-b">
      <span className="small muted">{t('Your day')} · {t('Next')} {first.time}</span>
      <b>{what(first)}</b>
      {rest.length > 0 && <span className="dn-rest">{rest.map(x => <span key={x.key} style={{ '--c': KIND[x.kind][1] }}><i />{x.time}</span>)}</span>}
    </span>
    <span className="dn-pct"><b>{d.done}/{d.total}</b><span className="small muted">{fmtNum(d.waterGoal)} {U('ml')}</span></span>
  </button>
}
