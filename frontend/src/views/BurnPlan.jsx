// 4.2 — the burn plan.
//   /burn/:mode     pick exercises (8 at home, 8 at the gym) for today's calorie target
//   /burn/review    the plan: minutes and calories per exercise, start time, a reminder for each
//                   exercise at its time (Start · In 10 min · Skip), Start now
// Minutes are sized by lib/burnPlan.js from MET values and your weight; the session runs on the
// usual workout screen, so history, PRs and the rest timer all work.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { fromKg } from '../lib/weightTracker.js'
import { todayISO } from '../lib/format.js'
import { bodyKg } from '../lib/water.js'
import { EXIDX } from '../lib/exercises.js'
import { goalProgress } from '../lib/calorieCalc.js'
import {
  ACTIVITIES, kcalPerMin, buildBurnPlan, burnRoutine, burnTarget, savedBurnPlan, burnPrefs, burnReminders, GAPS, LONG_SESSION,
} from '../lib/burnPlan.js'
import { MOBILE, syncReminder } from '../lib/mobile.js'
import { startFlow, exerciseDetailSheet } from '../sheets.jsx'
import { rxText } from './StartWorkout.jsx'
import { Thumb } from '../components/Media.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Switch, Segmented, Button, BackButton, Stepper } from '../components/ui.jsx'

const n0 = v => Math.round(v).toLocaleString(dateLocale())
const n1 = v => (Math.round(v * 10) / 10).toLocaleString(dateLocale())
const MODE_TITLE = { home: 'Without equipment', gym: 'With equipment' }
const hm = d => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
const toast = m => useUI.getState().toast(m)

function ActIcon({ a }) {
  const ex = a.id ? EXIDX[a.id] : null
  return ex ? <Thumb ex={ex} /> : <span className="burn-ico"><Icon name={a.icon} /></span>
}

/* -------------------------------------------------------------- /burn/:mode */
export function BurnSelect() {
  const { mode: m = 'home' } = useParams()
  const mode = ACTIVITIES[m] ? m : 'home'
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const nav = useNavigate()
  const iso = todayISO()
  const kg = bodyKg(S) || 70
  const saved = S.burnPlan && S.burnPlan.mode === mode ? S.burnPlan.keys || [] : []
  const [keys, setKeys] = useState(saved)
  const [target, setTarget] = useState(() => burnTarget(S, iso))
  const prog = goalProgress(S.calGoal, iso)
  const fromGoal = S.calGoal && prog && !prog.over && !prog.before && S.calGoal.exerciseKcal === target
  const preview = useMemo(() => { try { return keys.length ? buildBurnPlan({ mode, keys, target, kg }) : null } catch { return null } }, [mode, keys, target, kg])
  const toggle = k => setKeys(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]))
  const build = () => {
    if (!keys.length) return toast(t('Pick at least one exercise.'))
    const order = ACTIVITIES[mode].map(a => a.key).filter(k => keys.includes(k))
    update(s => { s.burnPlan = { ...(s.burnPlan || {}), mode, keys: order, target: Math.round(target) } })
    nav('/burn/review')
  }

  return <div className={'startw burn' + (keys.length ? ' has-bar' : '')}>
    <div className="hdr">
      <BackButton fallback={'/start/' + mode} />
      <div><h1>{t('Burn plan')}</h1><div className="sub">{t(MODE_TITLE[mode])} · {t('pick your exercises')}</div></div>
    </div>

    <div className="card burn-target">
      <div className="grow">
        <div className="lbl2">{t('Today’s target')}</div>
        <div className="burn-target-v"><Icon name="flame" /><b>{n0(target)}</b> <span>{t('kcal')}</span></div>
        <div className="small muted">{fromGoal ? t('From your calorie goal — day {0} of {1}', prog.day, prog.days)
          : <button className="h2link" onClick={() => nav('/calories')}>{t('Work out your target with the calculator')} <Icon name="chevronRight" /></button>}</div>
      </div>
      <Stepper value={target} step={50} decimal={false} onChange={v => setTarget(Math.max(50, Math.min(3000, Math.round(v) || 50)))} />
    </div>

    <h2 className="startw-h"><Icon name="checkCircle" />{t('Choose exercises')}<span className="small muted startw-hint">{t('≈ kcal a minute for {0} {1}', n1(fromKg(kg, S.unit)), U(S.unit === 'lb' ? 'lb' : 'kg'))}</span></h2>
    <div className="burn-grid">
      {ACTIVITIES[mode].map(a => { const on = keys.includes(a.key); return <button key={a.key} className={'burn-card' + (on ? ' on' : '')} aria-pressed={on} onClick={() => toggle(a.key)}>
        <ActIcon a={a} />
        <span className="burn-name">{t(a.name)}</span>
        <span className="burn-kpm"><Icon name="flame" />{n1(kcalPerMin(a.met, kg))}</span>
        {on && <span className="burn-check"><Icon name="check" /></span>}
      </button> })}
    </div>

    {keys.length > 0 && <div className="startw-bar">
      <Button size="sm" onClick={() => setKeys([])}>{t('Clear')}</Button>
      <Button variant="primary" icon="sparkles" onClick={build}>
        {preview ? t('Build the plan · {0} min', preview.minutes) : t('Build the plan')}
      </Button>
    </div>}
  </div>
}

/* ------------------------------------------------------------ /burn/review */
export function BurnReview() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const nav = useNavigate()
  const loc = useLocation()
  const kg = bodyKg(S) || 70
  const plan = useMemo(() => savedBurnPlan(S, kg), [S, kg])
  const p = burnPrefs(S)
  const next = useMemo(() => (plan ? burnReminders(S, kg)[0] || null : null), [S, kg, plan])

  // a reminder's "Start" opens /burn/review?start=all|<index> — begin right away
  useEffect(() => {
    const m = /[?&]start=(all|\d+)\b/.exec(loc.search || '')
    if (!m || !plan) return
    nav('/burn/review', { replace: true })
    if (S.active) return void nav('/workout')
    if (m[1] === 'all') return void startAll()
    const i = Number(m[1]); const x = plan.items[i]
    if (!x) return
    if (x.walk) nav('/walk'); else startFlow(null, burnRoutine(plan, i))
  }, [loc.search])                                   // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan) return <div className="startw burn">
    <div className="hdr"><BackButton fallback="/start" /><div><h1>{t('Burn plan')}</h1></div></div>
    <div className="empty"><div className="ico"><Icon name="flame" /></div>{t('No burn plan yet — pick a section and choose your exercises.')}</div>
    <div className="calc-next">
      <button className="card calc-mode" onClick={() => nav('/burn/home')}><Icon name="house" /><b>{t('Without equipment')}</b></button>
      <button className="card calc-mode" onClick={() => nav('/burn/gym')}><Icon name="barbell" /><b>{t('With equipment')}</b></button>
    </div>
  </div>

  const routine = burnRoutine(plan)
  const walkOnly = !routine.ex.length
  function startAll() {
    if (S.active) return nav('/workout')
    if (walkOnly) return nav('/walk')
    startFlow(null, burnRoutine(plan))
  }
  const setPref = async patch => {
    update(s => { s.burnPlan = { ...(s.burnPlan || {}), ...patch } })
    if (!MOBILE) return
    const ok = await syncReminder(useStore.getState().S, true)
    if (!ok && (patch.remind || p.remind)) toast(t('Allow notifications for MAHDI-JYM in the phone’s settings to get reminders.'))
    else if (patch.remind) toast(t('Reminders are set'))
  }
  const [hh, mm] = p.start.split(':').map(Number)
  const timeOf = i => { const d = new Date(); d.setHours(hh, mm + i * p.gap, 0, 0); return hm(d) }
  const gapLabel = g => (g === 0 ? t('All at once') : g < 60 ? t('{0} min', g) : t('{0} h', g / 60))

  return <div className="startw burn">
    <div className="hdr">
      <BackButton fallback={'/burn/' + plan.mode} />
      <div><h1>{t('Today’s burn plan')}</h1><div className="sub">{t(MODE_TITLE[plan.mode])}</div></div>
    </div>

    <div className="card burn-sum">
      <div className="burn-sum-i"><Icon name="flame" /><b>{n0(plan.kcal)}</b><span>{t('kcal')}</span></div>
      <div className="burn-sum-i"><Icon name="timer" /><b>{plan.minutes}</b><span>{t('min')}</span></div>
      <div className="burn-sum-i"><Icon name="list" /><b>{plan.items.length}</b><span>{t('exercises')}</span></div>
    </div>
    {plan.long && <div className="card calc-warn"><Icon name="info" /><span>{t('That is over {0} minutes. Spread it over the day with the reminders below, or take part of it from food in the calculator.', LONG_SESSION)}</span></div>}

    <div className="list burn-list">
      {plan.items.map((x, i) => <div key={x.key} className="item">
        <span onClick={() => x.id && EXIDX[x.id] && exerciseDetailSheet(EXIDX[x.id])}><ActIcon a={x} /></span>
        <div className="grow">
          <div className="tt">{t(x.name)}</div>
          <div className="ss">{t('{0} min · ≈ {1} kcal', x.min, n0(x.kcal))}{x.rx ? ' · ' + (x.rx.mode === 'time' ? t('{0} rounds of 45 s', x.rx.sets) : rxText(x.rx)) : ' · ' + t('with the step counter')}</div>
        </div>
        {p.remind && p.gap > 0 && <span className="burn-time">{timeOf(i)}</span>}
        <button className="iconbtn sm" aria-label={t('Start')} onClick={() => (x.walk ? nav('/walk') : startFlow(null, burnRoutine(plan, i)))}><Icon name="play" /></button>
      </div>)}
    </div>

    <Button variant="primary" icon="play" onClick={startAll}>{S.active ? t('Resume workout') : t('Start now')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="tinted" icon="list" onClick={() => nav('/burn/' + plan.mode)}>{t('Change exercises')}</Button>

    <Section title={t('Reminders')} footer={MOBILE ? (p.gap ? t('Each exercise gets its own reminder at its time — with Start, In 10 min and Skip.') : t('One reminder for the whole session — with Start, In 10 min and Skip.'))
      : t('Reminders work in the phone app.')}>
      <Row icon="bell" iconTint="var(--orange)" title={t('Remind me')} subtitle={p.remind && next ? t('Next: {0}', next.at.toLocaleString(dateLocale(), { weekday: 'short', hour: '2-digit', minute: '2-digit' })) : null}>
        <Switch checked={p.remind} onChange={v => setPref({ remind: v, from: todayISO() })} />
      </Row>
      {p.remind && <>
        <Row icon="clock" iconTint="var(--blue)" title={t('Start at')}>
          <input type="time" className="timef" value={p.start} aria-label={t('Start at')} onChange={e => e.target.value && setPref({ start: e.target.value })} />
        </Row>
        <div className="burn-opts">
          <span className="small muted">{t('Time between exercises')}</span>
          <Segmented options={GAPS.map(g => ({ value: g, label: gapLabel(g) }))} value={p.gap} onChange={g => setPref({ gap: g })} />
          <Segmented options={[{ value: true, label: t('Every day') }, { value: false, label: t('Today only') }]} value={p.daily} onChange={v => setPref({ daily: v, from: todayISO() })} />
        </div>
      </>}
    </Section>
  </div>
}
