// Today's plan (2.9) — the day's workout, steps target and water target in one card, with a
// day score, a fat-loss estimate and a tip. Everything is computed by lib/dailyPlan.js.
//
// When workout, steps and water are all done, the full-screen celebration plays once a day.
//
// 4.1: linked to the scale — the strip under the title shows your weight against your ideal
// weight, why today looks like it does, how hard it is, how you feel today (which resizes the
// sets), and a one-tap reminder at your usual training time (lib/scaleWorkout.js).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { usePedometer } from '../store/usePedometer.js'
import { planFor, planProgress, planRoutine, weekPlan, planStreak } from '../lib/dailyPlan.js'
import { todayISO, DAYN } from '../lib/format.js'
import { useUI } from '../store/useUI.js'
import { t, exName, dateLocale, U } from '../lib/i18n.js'
import { EXIDX } from '../lib/exercises.js'
import { routineLabel, colorVar } from '../lib/routines.js'
import { bodyKg } from '../lib/water.js'
import { walkPrefs } from '../lib/stepMetrics.js'
import { celebrate, playCheer } from '../lib/celebrate.js'
import { startFlow, exerciseDetailSheet, bwSheet } from '../sheets.jsx'
import { setEnergy, INTENSITY_LABEL } from '../lib/scaleWorkout.js'
import { reminderPrefs, suggestedReminderTime } from '../lib/dailyReminder.js'
import { fromKg } from '../lib/weightTracker.js'
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

const INT_COLOR = { very_low: 'var(--teal)', low: 'var(--green)', medium: 'var(--orange)', high: 'var(--red)' }
const GOAL_TXT = { lose: 'Lose weight', gain: 'Gain weight', keep: 'Keep your weight' }
const URG_TXT = { high: 'Big gap', medium: 'Medium gap', low: 'Small gap' }
const DEFAULT_START = '18:00'

/** 4.1 — the scale strip: weight → ideal, the reason, intensity, energy and the reminder. */
function ScaleStrip({ S, plan, iso }) {
  const update = useStore(s => s.update)
  const st = plan.scale
  const w = v => (Math.round(fromKg(v, S.unit) * 10) / 10).toLocaleString(dateLocale()) + ' ' + U(S.unit === 'lb' ? 'lb' : 'kg')
  const ref = st ? (st.ideal != null ? st.ideal : st.target) : null
  const start = (suggestedReminderTime(S.workouts) || {}).usual || DEFAULT_START
  const r = reminderPrefs(S)
  const set = r.on && r.home && r.time === start && !Object.keys(r.days).length
  const remind = () => {
    update(s => { s.reminder = { ...(s.reminder || {}), on: true, v2: true, home: true, time: start, days: {} } })
    useUI.getState().toast(t('Every day at {0} — reminders are planned two weeks ahead.', start))
  }
  return <div className="plan-scale">
    {st ? <div className="plan-scale-top">
      <Icon name="scale" />
      <b>{w(st.kg)}</b>
      {ref != null && <><Icon name="chevronRight" /><span className="muted">{w(ref)}</span></>}
      {st.goal && <span className={'plan-badge g-' + st.goal}>{t(GOAL_TXT[st.goal])}</span>}
      {st.goal && st.goal !== 'keep' && <span className={'plan-badge u-' + st.urgency}>{t(URG_TXT[st.urgency])}</span>}
    </div> : null}
    {plan.reasons.map((x, i) => <div key={i} className={'plan-scale-why' + (i ? ' soft' : '')}>{t(x.key, ...x.args)}</div>)}
    {(!st || st.stale) && <button className="plan-scale-weigh" onClick={() => bwSheet()}><Icon name="plus" />{t('Weigh in now')}</button>}
    {plan.kind !== 'routine' && <div className="plan-scale-row">
      <span className="plan-int" style={{ '--int': INT_COLOR[plan.intensity] }}><Icon name="speedometer" />{t(INTENSITY_LABEL[plan.intensity])}</span>
    </div>}
    <div className="plan-energy" role="radiogroup" aria-label={t('How do you feel today?')}>
      <span className="small muted">{t('How do you feel today?')}</span>
      {[['low', '😴', 'Tired'], ['normal', '🙂', 'Normal'], ['high', '⚡', 'Full of energy']].map(([v, e, l]) =>
        <button key={v} role="radio" aria-checked={plan.energy === v} className={'plan-chip' + (plan.energy === v ? ' on' : '')}
          onClick={() => update(s => setEnergy(s, iso, v))}><span aria-hidden="true">{e}</span>{t(l)}</button>)}
    </div>
    <button className={'plan-remind' + (set ? ' on' : '')} onClick={set ? undefined : remind} disabled={set}>
      <Icon name={set ? 'checkCircle' : 'bell'} />
      <span>{set ? t('Reminder set for {0} every day', start) : t('Remind me at {0}', start)}</span>
    </button>
  </div>
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

  const streak = useMemo(() => planStreak(S, iso, { pending }), [S, iso, p.score >= 67])   // eslint-disable-line react-hooks/exhaustive-deps
  const kg = bodyKg(S)
  const toGoal = S.targetW && kg ? Math.round(Math.abs(kg - (S.unit === 'lb' ? S.targetW * 0.45359237 : S.targetW)) * 10) / 10 : null
  const start = () => {
    if (S.active) return nav('/workout')
    if (plan.routineId) startFlow(plan.routineId)
    else startFlow(null, planRoutine(plan))
  }
  // 4.2: the button opens the choice — without / with equipment, today's plan on top, the
  // calorie burn plan — instead of starting straight away (the reminder's Start still does)
  const choose = () => (S.active ? nav('/workout') : nav('/start'))
  // 2.10: "Start" on the home-workout reminder opens /home?start=plan — begin right away.
  const loc = useLocation()
  useEffect(() => {
    if (!/[?&]start=plan\b/.test(loc.search || '')) return
    nav('/home', { replace: true })
    if (!p.trained) start()
  }, [loc.search])                                   // eslint-disable-line react-hooks/exhaustive-deps
  const levelTxt = { easy: t('Beginner'), normal: t('Intermediate'), hard: t('Advanced') }[plan.level]

  return <div className={'card plan-card' + (p.done ? ' done' : '')} style={{ '--tint': colorVar(plan.color) }}>
    <div className="plan-head">
      <span className="plan-ic"><Icon name={plan.icon} /></span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="lbl2">{t("Today's plan")}</div>
        <div className="plan-title">{routineLabel(plan.title)}</div>
      </div>
      <button className="plan-week-btn" onClick={() => weekPlanSheet(iso)} aria-label={t('This week’s plan')}>
        <Icon name="calendar" />
      </button>
      <div className="plan-score" title={t('Day score')}>
        <b>{p.score}</b><span>%</span>
      </div>
    </div>

    <ScaleStrip S={S} plan={plan} iso={iso} />

    <div className="plan-goals">
      <Goal pct={p.workoutPct} color="var(--tint)" icon="dumbbell" onClick={choose}
        value={p.trained ? t('Done') : t('{0} min', plan.minutes)} label={t('Workout')} />
      <Goal pct={p.stepsPct} color="var(--green)" icon="figureWalk" onClick={() => nav('/walk')}
        value={n0(p.steps) + ' / ' + n0(plan.stepsTarget)} label={t('Steps')} />
      <Goal pct={p.waterPct} color="var(--blue)" icon="drop" onClick={() => nav('/water')}
        value={n0(p.water) + ' / ' + n0(plan.waterMl)} label={t('Water (ml)')} />
    </div>

    {streak >= 2 && <div className="plan-streak"><Icon name="flame" />
      <span>{t('{0} days in a row on plan — keep the chain going!', n0(streak))}</span></div>}

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

    <button className={'plan-start' + (p.trained && !S.active ? ' done' : '')} onClick={choose}>
      <Icon name={S.active ? 'timer' : p.trained ? 'checkCircle' : 'play'} />
      <span className="plan-start-l">
        <span>{S.active ? t('Resume workout') : p.trained ? t('Workout done — train again?') : t("Start today's workout")}</span>
        {!S.active && !p.trained && <small>{t('{0} min', plan.minutes)} · {t('≈ {0} kcal', n0(plan.kcalTotal))}</small>}
      </span>
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

/* ---- 2.10: the week at a glance (Saturday → Friday) ---- */
function WeekPlan({ iso, close }) {
  const S = useStore(st => st.S)
  const days = useMemo(() => weekPlan(S, iso), [S, iso])
  const [open, setOpen] = useState(iso)
  const trained = new Set((S.workouts || []).map(w => w.d))
  const total = days.reduce((a, d) => a + d.plan.kcalTotal, 0)
  return <>
    <h3>{t('This week’s plan')}</h3>
    <p className="small muted" style={{ marginTop: -4 }}>{t('Every day a different workout, steps and water — ≈ {0} kcal this week.', n0(total))}</p>
    <div className="wk-list">
      {days.map(({ iso: d, dow, plan }) => {
        const past = d < iso, today = d === iso, done = trained.has(d)
        const isOpen = open === d
        return <div key={d} className={'wk-day' + (today ? ' today' : '') + (past ? ' past' : '') + (done ? ' done' : '')} style={{ '--tint': colorVar(plan.color) }}>
          <button className="wk-row" onClick={() => setOpen(isOpen ? null : d)} aria-expanded={isOpen}>
            <span className="wk-ic"><Icon name={done ? 'check' : plan.icon} /></span>
            <span className="wk-m">
              <span className="wk-d">{t(DAYN[dow])}{today && <span className="wp-today">{t('Today')}</span>}</span>
              <span className="wk-t">{routineLabel(plan.title)}</span>
              <span className="wk-s">{t('{0} min', n0(plan.minutes))} · {t('{0} steps', n0(plan.stepsTarget))} · {n0(plan.waterMl)} {t('ml')}</span>
            </span>
            <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} className="wk-c" />
          </button>
          {isOpen && <ol className="plan-ex wk-ex">
            {plan.exercises.map((e, i) => {
              const ex = EXIDX[e.id]
              return <li key={e.id + i} onClick={() => ex && exerciseDetailSheet(ex)}>
                <span className="plan-ex-n">{(i + 1).toLocaleString(dateLocale())}</span>
                <span className="plan-ex-name capitalize">{ex ? exName(ex) : e.id}</span>
                <span className="plan-ex-r">{e.hold ? t('{0} × {1} s', e.sets, e.reps) : t('{0} × {1}', e.sets, e.reps)}</span>
              </li>
            })}
          </ol>}
        </div>
      })}
    </div>
    <button className="btn" style={{ width: '100%', marginTop: 14 }} onClick={close}>{t('Close')}</button>
  </>
}
export const weekPlanSheet = iso => useUI.getState().openSheet(close => <WeekPlan iso={iso} close={close} />)
