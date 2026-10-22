// 7.1 — "Your day": the timed schedule (lib/daySchedule.js) as a timeline. Water you can drink
// with one tap, meals with a calorie target and dishes that fit it, today's workout to start and
// the evening walk. Wake / sleep times and the reminders are set right here.
import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, U } from '../../lib/i18n.js'
import { fmtNum, todayISO } from '../../lib/format.js'
import { daySchedule, dayPrefs, MEAL_SPLIT } from '../../lib/daySchedule.js'
import { planRoutine } from '../../lib/dailyPlan.js'
import { RECIPE_BY_ID } from '../../lib/kitchen.js'
import { logWater } from '../water/WaterParts.jsx'
import { addFoodSheet, mealName } from '../food/FoodSheets.jsx'
import { recipeSheet } from '../../views/Kitchen.jsx'
import { startFlow } from '../../sheets.jsx'
import { burst } from '../../lib/motion.js'
import { nav } from '../../lib/nav.js'
import { syncDayReminders } from '../../lib/mobile.js'
import Icon from '../Icon.jsx'
import { Switch } from '../ui.jsx'

const KIND = {
  wake: ['sparkles', 'var(--yellow)'], water: ['drop', 'var(--blue)'], meal: ['flame', 'var(--orange)'],
  workout: ['dumbbell', 'var(--acc)'], walk: ['figureWalk', 'var(--green)'], sleep: ['timer', 'var(--indigo)'],
}
const MEAL_COL = { b: 'var(--yellow)', l: 'var(--orange)', s: 'var(--pink)', d: 'var(--purple)' }
const MEAL_ICON = { b: '☀️', l: '🍲', s: '🍎', d: '🌙' }

function useMinute() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id) }, [])
  return now
}

const inMin = (at, now) => {
  const d = at - (now.getHours() * 60 + now.getMinutes())
  if (d <= 0) return null
  return d < 60 ? t('in {0} min', d) : t('in {0} h {1} min', Math.floor(d / 60), d % 60)
}

export default function DaySchedule({ r }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const now = useMinute()
  const iso = todayISO()
  const d = daySchedule(S, r, iso, now)
  const p = dayPrefs(S)
  const [all, setAll] = useState(false)
  const [setup, setSetup] = useState(false)
  const next = d.items.find(x => x.status === 'next')
  const setPref = (k, v) => update(s => { s.day = { ...(s.day || {}), [k]: v } })
  const nowMin = now.getHours() * 60 + now.getMinutes()
  // the rows around now: two done before the next one, the rest after
  const ni = next ? d.items.indexOf(next) : d.items.length
  const shown = all ? d.items : d.items.slice(Math.max(0, ni - 2), Math.max(ni - 2, 0) + 7)
  const meals = d.items.filter(x => x.kind === 'meal')
  const drink = (it, e) => {
    logWater(it.ml)
    burst(e.currentTarget, { count: 12, spread: 60, colors: ['#64D2FF', '#0A84FF', '#5AC8FA', '#BFEFFF'] })
    useUI.getState().toast('💧 +' + fmtNum(it.ml) + ' ' + U('ml'))
  }
  const remind = v => {
    setPref('remind', v)
    setTimeout(() => syncDayReminders(useStore.getState().S, true), 50)
    useUI.getState().toast(v ? t('Reminders on — meals, workout and walk at their times') : t('Reminders off'))
  }

  return <div className="card ds">
    <div className="ds-h">
      <div className="ds-ring" style={{ '--p': d.pct + '%' }}><span>{d.pct}%</span></div>
      <div className="grow">
        <h2 style={{ margin: 0 }}>{t('Your day')}</h2>
        <div className="small muted">{t('{0} of {1} done', d.done, d.total)} · {p.wake}–{p.sleep}</div>
      </div>
      <button className={'ds-gear' + (setup ? ' on' : '')} onClick={() => setSetup(!setup)} aria-label={t('Times')}><Icon name="gear" /></button>
    </div>

    {setup && <div className="ds-setup">
      <label><span>{t('Wake up')}</span><input type="time" value={p.wake} onChange={e => e.target.value && setPref('wake', e.target.value)} /></label>
      <label><span>{t('Sleep')}</span><input type="time" value={p.sleep} onChange={e => e.target.value && setPref('sleep', e.target.value)} /></label>
      <label><span>{t('Workout')}</span><input type="time" value={p.workout === 'auto' ? d.items.find(x => x.kind === 'workout').time : p.workout} onChange={e => setPref('workout', e.target.value || 'auto')} /></label>
      <div className="ds-setup-r"><span className="grow">{t('Remind me at these times')}</span><Switch checked={p.remind} onChange={remind} /></div>
    </div>}

    {next && <div className="ds-next" style={{ '--c': KIND[next.kind][1] }}>
      <span className="ds-next-i"><Icon name={KIND[next.kind][0]} /></span>
      <span className="grow"><span className="small muted">{t('Next')}</span><b>{label(next)}</b></span>
      <span className="ds-next-t"><b>{next.time}</b><span className="small muted">{inMin(next.at, now) || t('now')}</span></span>
    </div>}

    {/* the day's calories split over the meals, and the water */}
    {d.kcalDay > 0 && <div className="ds-split">
      <div className="ds-split-bar">{meals.map(m => <i key={m.meal} style={{ flex: MEAL_SPLIT[m.meal], background: MEAL_COL[m.meal] }} className={m.status === 'done' ? 'on' : ''} />)}</div>
      <div className="ds-split-k">
        {meals.map(m => <span key={m.meal}><i style={{ background: MEAL_COL[m.meal] }} />{mealName(m.meal)} {fmtNum(m.kcal)}</span>)}
        <span className="ds-split-t"><b>{fmtNum(d.kcalDay)}</b> {t('kcal')} · <b>{fmtNum(d.waterGoal)}</b> {U('ml')}</span>
      </div>
    </div>}

    <ol className="ds-tl">
      {shown.map((it, i) => {
        const [icon, c] = KIND[it.kind]
        return <li key={it.key} className={'ds-it ' + it.status + (it.at <= nowMin && (shown[i + 1] ? shown[i + 1].at > nowMin : true) ? ' now' : '')} style={{ '--c': c, animationDelay: Math.min(i, 8) * 45 + 'ms' }}>
          <span className="ds-time">{it.time}</span>
          <span className="ds-dot">{it.status === 'done' ? <Icon name="check" /> : it.kind === 'meal' ? <span className="ds-emoji">{MEAL_ICON[it.meal]}</span> : <Icon name={icon} />}</span>
          <div className="ds-body">
            <div className="ds-t">{label(it)}</div>
            <div className="ds-s">{sub(it)}</div>
            {it.kind === 'meal' && it.ideas.length > 0 && it.status !== 'done' && <div className="ds-ideas">
              {it.ideas.map(x => <button key={x.id} className="ds-idea" onClick={() => recipeSheet(x.id, it.meal)}>
                {t(RECIPE_BY_ID[x.id] ? RECIPE_BY_ID[x.id].name : x.name)}{x.sv !== 1 ? ' ×' + fmtNum(x.sv) : ''} <span>{fmtNum(x.kcal)}</span>
              </button>)}
            </div>}
          </div>
          {act(it, { drink, iso, plan: d.plan })}
        </li>
      })}
    </ol>
    {d.items.length > shown.length || all ? <button className="h2link ds-more" onClick={() => setAll(!all)}>{all ? t('Show less') : t('Whole day ({0})', d.items.length)}</button> : null}
  </div>
}

function label(it) {
  switch (it.kind) {
    case 'wake': return t('Wake up')
    case 'water': return t('Drink {0} ml', fmtNum(it.ml))
    case 'meal': return mealName(it.meal) + (it.kcal ? ' · ' + t('{0} kcal', fmtNum(it.kcal)) : '')
    case 'workout': return t(it.plan.title)
    case 'walk': return t('Evening walk')
    default: return t('Sleep')
  }
}
function sub(it) {
  switch (it.kind) {
    case 'wake': return t('Start with a glass of water and a stretch')
    case 'water': return t('{0} ml by now', fmtNum(it.upto))
    case 'meal': return it.meal === 's' ? t('Light — fruit, yogurt or nuts') : t('Protein first, then vegetables, then carbs')
    case 'workout': return t('{0} min', it.plan.minutes) + ' · ' + t('{0} exercises', it.plan.n) + ' · ' + t('about {0} kcal', fmtNum(it.plan.kcal))
    case 'walk': return t('{0} steps today', fmtNum(it.steps)) + ' · ' + t('{0} min', it.min)
    default: return t('7–9 hours of sleep help you recover and lose fat')
  }
}
function act(it, { drink, iso, plan }) {
  if (it.status === 'done' || it.kind === 'wake' || it.kind === 'sleep') return null
  const props = { className: 'ds-act', style: { '--c': KIND[it.kind][1] } }
  if (it.kind === 'water') return <button {...props} onClick={e => drink(it, e)} aria-label={label(it)}><Icon name="plus" /></button>
  if (it.kind === 'meal') return <button {...props} onClick={() => addFoodSheet({ iso, meal: it.meal })} aria-label={t('Log food')}><Icon name="plus" /></button>
  if (it.kind === 'workout') return <button {...props} onClick={() => startFlow(plan.routineId || null, plan.routineId ? undefined : planRoutine(plan))} aria-label={t('Start')}><Icon name="play" /></button>
  return <button {...props} onClick={() => nav('/walk')} aria-label={t('Walk')}><Icon name="chevronRight" /></button>
}
