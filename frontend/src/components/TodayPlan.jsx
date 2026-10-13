// Today's plan (2.9) — the day's workout, steps target and water target in one card, with a
// day score, a fat-loss estimate and a tip. Everything is computed by lib/dailyPlan.js.
//
// When workout, steps and water are all done, the full-screen celebration plays once a day.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { usePedometer } from '../store/usePedometer.js'
import { planFor, planProgress, planRoutine } from '../lib/dailyPlan.js'
import { todayISO } from '../lib/format.js'
import { t, exName, dateLocale } from '../lib/i18n.js'
import { EXIDX } from '../lib/exercises.js'
import { routineLabel, colorVar } from '../lib/routines.js'
import { bodyKg } from '../lib/water.js'
import { walkPrefs } from '../lib/stepMetrics.js'
import { celebrate, playCheer } from '../lib/celebrate.js'
import { startFlow, exerciseDetailSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'

const DONE_KEY = 'mj_plan_done'
const n0 = v => Math.round(v).toLocaleString(dateLocale())

function Ring({ pct, color, icon, done }) {
  const r = 21, c = 2 * Math.PI * r
  return <span className={'plan-ring' + (done ? ' done' : '')} style={{ '--ring': color }}>
    <svg viewBox="0 0 50 50" aria-hidden="true">
      <circle cx="25" cy="25" r={r} className="plan-ring-bg" />
      <circle cx="25" cy="25" r={r} className="plan-ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct))} />
    </svg>
    <Icon name={done ? 'check' : icon} />
  </span>
}

function Goal({ pct, color, icon, value, label, onClick }) {
  const done = pct >= 1
  return <button className={'plan-goal' + (done ? ' done' : '')} onClick={onClick}>
    <Ring pct={pct} color={color} icon={icon} done={done} />
    <span className="plan-goal-v">{value}</span>
    <span className="plan-goal-l">{label}</span>
  </button>
}

export default function TodayPlan() {
  const S = useStore(s => s.S)
  const pending = usePedometer(s => s.pending)
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const iso = todayISO()
  const plan = useMemo(() => planFor(S, iso), [S, iso])
  const p = planProgress(S, plan, { pending })

  // Celebrate the full day once (remembered per day, so reopening the app doesn't replay it).
  useEffect(() => {
    if (!p.done) return
    let seen = null
    try { seen = localStorage.getItem(DONE_KEY) } catch { /* private mode */ }
    if (seen === iso) return
    try { localStorage.setItem(DONE_KEY, iso) } catch { /* private mode */ }
    if (walkPrefs(S).celebrate !== false) { celebrate(100, 'plan'); playCheer(S.sound !== false, 'goal') }
  }, [p.done, iso])

  const kg = bodyKg(S)
  const toGoal = S.targetW && kg ? Math.round(Math.abs(kg - (S.unit === 'lb' ? S.targetW * 0.45359237 : S.targetW)) * 10) / 10 : null
  const start = () => {
    if (S.active) return nav('/workout')
    if (plan.routineId) startFlow(plan.routineId)
    else startFlow(null, planRoutine(plan))
  }
  const levelTxt = { easy: t('Beginner'), normal: t('Intermediate'), hard: t('Advanced') }[plan.level]

  return <div className={'card plan-card' + (p.done ? ' done' : '')} style={{ '--tint': colorVar(plan.color) }}>
    <div className="plan-head">
      <span className="plan-ic"><Icon name={plan.icon} /></span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="lbl2">{t("Today's plan")}</div>
        <div className="plan-title">{routineLabel(plan.title)}</div>
      </div>
      <div className="plan-score" title={t('Day score')}>
        <b>{p.score}</b><span>%</span>
      </div>
    </div>

    <div className="plan-goals">
      <Goal pct={p.workoutPct} color="var(--tint)" icon="dumbbell" onClick={start}
        value={p.trained ? t('Done') : t('{0} min', plan.minutes)} label={t('Workout')} />
      <Goal pct={p.stepsPct} color="var(--green)" icon="figureWalk" onClick={() => nav('/walk')}
        value={n0(p.steps) + ' / ' + n0(plan.stepsTarget)} label={t('Steps')} />
      <Goal pct={p.waterPct} color="var(--blue)" icon="drop" onClick={() => nav('/water')}
        value={n0(p.water) + ' / ' + n0(plan.waterMl)} label={t('Water (ml)')} />
    </div>

    <div className="plan-meta">
      <span><Icon name="timer" />{t('{0} min', plan.minutes)}</span>
      <span><Icon name="flame" />{t('≈ {0} kcal', n0(plan.kcalTotal))}</span>
      <span><Icon name="list" />{t(plan.exercises.length === 1 ? '{0} exercise' : '{0} exercises', plan.exercises.length)}</span>
      {plan.kind !== 'routine' && <span><Icon name="speedometer" />{levelTxt}</span>}
      {plan.lowImpact && <span className="soft"><Icon name="heart" />{t('Joint-friendly')}</span>}
    </div>

    <button className="plan-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
      <span>{open ? t('Hide exercises') : t('Show exercises')}</span>
      <Icon name={open ? 'chevronUp' : 'chevronDown'} />
    </button>
    {open && <ol className="plan-ex">
      {plan.exercises.map((e, i) => {
        const ex = EXIDX[e.id]
        return <li key={e.id + i} onClick={() => ex && exerciseDetailSheet(ex)}>
          <span className="plan-ex-n">{(i + 1).toLocaleString(dateLocale())}</span>
          <span className="plan-ex-name capitalize">{ex ? exName(ex) : e.id}</span>
          <span className="plan-ex-r">{e.hold ? t('{0} × {1} s', e.sets, e.reps) : t('{0} × {1}', e.sets, e.reps)}</span>
        </li>
      })}
    </ol>}

    <button className={'plan-start' + (p.trained && !S.active ? ' done' : '')} onClick={start}>
      <Icon name={S.active ? 'timer' : p.trained ? 'checkCircle' : 'play'} />
      <span>{S.active ? t('Resume workout') : p.trained ? t('Workout done — train again?') : t("Start today's workout")}</span>
    </button>

    <div className="plan-foot">
      <div className="plan-burn">
        <Icon name="flame" />
        <span>{t('Today burns ≈ {0} kcal ≈ {1} g of fat', n0(plan.kcalTotal), n0(plan.fatGrams))}</span>
      </div>
      {toGoal != null && toGoal > 0 && <div className="plan-burn goal">
        <Icon name="target" />
        <span>{t('{0} kg to your goal weight', toGoal.toLocaleString(dateLocale()))}</span>
      </div>}
      <div className="plan-tip"><Icon name="lightbulb" /><span>{t(plan.tip)}</span></div>
    </div>
  </div>
}
