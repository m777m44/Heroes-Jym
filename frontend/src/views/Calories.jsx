// 4.2 — the calorie calculator (/calories): how many calories a day to burn — and to eat — to
// reach a target weight in a chosen number of days. Live as you type; "Save as my goal" makes
// the exercise part today's burn target on Start and in the burn plan (lib/calorieCalc.js).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { fromKg, toKg } from '../lib/weightTracker.js'
import { bodyKg } from '../lib/water.js'
import { idealBodyOf, ageOf, sexOf, birthYearFor, stepsAverage } from '../lib/idealBody.js'
import {
  calcCalorieGoal, activityFromSteps, goalProgress, ACTIVITY_LEVELS, ACTIVITY_LABEL, ACTIVITY_HINT, MAX_DIET_SHARE, SAFE_KG_PER_WEEK,
} from '../lib/calorieCalc.js'
import Icon from '../components/Icon.jsx'
import CommitNumber from '../components/CommitNumber.jsx'
import { Section, Row, Segmented, Button, BackButton, Slider } from '../components/ui.jsx'

const n0 = v => Math.round(v).toLocaleString(dateLocale())
const DAY_OPTS = [30, 60, 90]

export default function Calories() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const nav = useNavigate()
  const iso = todayISO()
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const inUnit = kg => (kg == null ? null : Math.round(fromKg(kg, unit) * 10) / 10)
  const g = S.calGoal || null
  const kgNow = bodyKg(S)
  const ideal = useMemo(() => { const r = idealBodyOf(S); return r && Number.isFinite(r.ideal) ? r.ideal : null }, [S])
  const [cur, setCur] = useState(() => inUnit(kgNow != null ? kgNow : g ? g.currentKg : 75))
  const [target, setTarget] = useState(() => inUnit(g ? g.targetKg : S.targetW > 0 ? toKg(S.targetW, unit) : ideal != null && kgNow != null && ideal < kgNow ? ideal : (kgNow || 75) - 5))
  const [days, setDays] = useState(() => (g ? g.days : 60))
  const [activity, setActivity] = useState(() => (g && g.activity) || activityFromSteps(stepsAverage(S)))
  const [share, setShare] = useState(() => (g ? g.dietShare : 0))
  const age = ageOf(S)
  const sex = sexOf(S)

  let res = null, err = null
  try {
    res = calcCalorieGoal({ currentKg: toKg(cur, unit), targetKg: toKg(target, unit), days, heightCm: S.heightCm, age, sex, activity, dietShare: share })
  } catch (e) { err = e.key || 'Something went wrong' }
  const prog = goalProgress(g, iso)

  const save = () => {
    if (!res) return
    update(s => {
      s.calGoal = { currentKg: res.currentKg, targetKg: res.targetKg, days: res.days, activity, dietShare: res.dietShare,
        exerciseKcal: res.exerciseKcal, eatKcal: res.eatKcal, dailyDeficit: res.dailyDeficit, from: iso }
      s.targetW = Math.round(fromKg(res.targetKg, unit) * 10) / 10
    })
    useUI.getState().toast(t('Saved — burn ≈ {0} kcal a day from exercise', n0(res.exerciseKcal)))
  }

  return <div className="calc">
    <div className="hdr">
      <BackButton fallback="/start" />
      <div><h1>{t('Calorie calculator')}</h1><div className="sub">{t('How many calories a day to reach your target')}</div></div>
    </div>

    {g && prog && <div className="card calc-goal">
      <span className="calc-goal-ico"><Icon name="flame" /></span>
      <div className="grow">
        <div className="lbl2">{t('Your goal')}</div>
        <b>{prog.over ? t('Finished — {0} days done', g.days) : t('Day {0} of {1}', prog.day, g.days)}</b>
        <div className="small muted">{t('Burn ≈ {0} kcal · eat ≈ {1} kcal a day', n0(g.exerciseKcal), n0(g.eatKcal))}</div>
      </div>
      <button className="iconbtn sm" aria-label={t('Clear goal')} onClick={() => update(s => { delete s.calGoal })}><Icon name="trash" /></button>
    </div>}
    {g && prog && !prog.over && <button className="card startw-today" onClick={() => nav('/food')}>
      <span className="startw-ico" style={{ background: 'var(--pink)' }}><Icon name="fork" /></span>
      <span className="grow"><b>{t('Food log')}</b><span className="small muted">{t('Log what you eat against ≈ {0} kcal a day', n0(g.eatKcal))}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>}

    <Section title={t('Your numbers')} footer={t('Height, age and sex are the same as on the Ideal body screen.')}>
      <Row icon="scale" iconTint="var(--blue)" title={t('Current weight')}>
        <CommitNumber className="rowfield" decimal value={cur} placeholder="75" onCommit={v => setCur(v)} aria-label={t('Current weight')} />
        <span className="muted small">{U(unit)}</span>
      </Row>
      <Row icon="target" iconTint="var(--green)" title={t('Target weight')} subtitle={ideal != null ? t('Your ideal weight: {0} {1}', inUnit(ideal), U(unit)) : null}>
        <CommitNumber className="rowfield" decimal value={target} placeholder="70" onCommit={v => setTarget(v)} aria-label={t('Target weight')} />
        <span className="muted small">{U(unit)}</span>
      </Row>
      <Row icon="calendar" iconTint="var(--orange)" title={t('In how many days')}>
        <CommitNumber className="rowfield" value={days} placeholder="60" onCommit={v => setDays(v && v > 0 ? Math.min(730, v) : 1)} aria-label={t('In how many days')} />
      </Row>
      <div className="calc-chips">
        {DAY_OPTS.map(d => <button key={d} className={'chip nocap' + (days === d ? ' on' : '')} onClick={() => setDays(d)}>{t('{0} days', d)}</button>)}
        {res && res.safeDays !== days && <button className="chip nocap calc-safe" onClick={() => setDays(res.safeDays)}><Icon name="heart" />{t('Healthy pace: {0} days', res.safeDays)}</button>}
      </div>
      <Row icon="ruler" iconTint="var(--teal)" title={t('Height')}>
        <CommitNumber className="rowfield" value={S.heightCm} placeholder="175"
          onCommit={v => update(s => { s.heightCm = v && v >= 100 && v <= 250 ? v : null })} aria-label={t('Height')} />
        <span className="muted small">{U('cm')}</span>
      </Row>
      <Row icon="calendar" iconTint="var(--pink)" title={t('Age')}>
        <CommitNumber className="rowfield" value={age} placeholder="30" onCommit={v => update(s => { s.birthYear = birthYearFor(v) })} aria-label={t('Age')} />
        <span className="muted small">{t('years')}</span>
      </Row>
      <Row icon="person" iconTint="var(--indigo)" title={t('Sex')}>
        <Segmented className="seg-inline" value={sex} onChange={v => update(s => { s.sex = v })}
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]} />
      </Row>
    </Section>

    <Section title={t('How active you are')} footer={t(ACTIVITY_HINT[activity])}>
      <div className="calc-act">
        {ACTIVITY_LEVELS.map(a => <button key={a} className={'chip nocap' + (activity === a ? ' on' : '')} aria-pressed={activity === a} onClick={() => setActivity(a)}>{t(ACTIVITY_LABEL[a])}</button>)}
      </div>
    </Section>

    <Section title={t('Food or exercise')} footer={t('How much of the daily deficit comes from eating less — the rest is burned by training.')}>
      <div className="calc-share">
        <div className="row between small"><span><Icon name="apple" />{t('{0}% from food', share)}</span><span>{t('{0}% from exercise', 100 - share)}<Icon name="flame" /></span></div>
        <Slider value={share} min={0} max={MAX_DIET_SHARE} step={10} onChange={setShare} />
      </div>
    </Section>

    {err && <div className="card calc-err"><Icon name="info" /><span>{t(err)}</span></div>}

    {res && <div className={'card calc-res' + (res.realistic ? ' ok' : ' warn')}>
      <div className="lbl2">{t('Your result')}</div>
      <div className="calc-big"><Icon name="flame" /><b>{n0(res.exerciseKcal)}</b><span>{t('kcal a day to burn from exercise')}</span></div>
      <div className="calc-stats">
        <Stat label={t('Daily deficit')} value={n0(res.dailyDeficit)} unit={t('kcal')} />
        <Stat label={t('Eat a day')} value={n0(res.eatKcal)} unit={t('kcal')} />
        <Stat label={t('Weekly loss')} value={res.weeklyKg.toLocaleString(dateLocale())} unit={U('kg')} />
        <Stat label={t('Your body uses')} value={n0(res.tdee)} unit={t('kcal')} sub={t('Resting: {0}', n0(res.bmr))} />
      </div>
      <div className="small muted calc-line">{t('{0} {1} to lose ≈ {2} kcal in total (7,700 kcal per kg of fat).', inUnit(res.loseKg), U(unit), n0(res.totalDeficit))}</div>
      {res.warnings.map((w, i) => <div key={i} className="calc-warn"><Icon name="info" /><span>{t(w.key, ...w.args)}</span></div>)}
      {res.realistic && <div className="calc-okline"><Icon name="checkCircle" /><span>{t('A healthy, realistic pace.')}</span></div>}
      {!res.realistic && res.safeDays > days && <div className="small muted">{t('At a steady {0} kg a week it takes about {1} days.', SAFE_KG_PER_WEEK.toLocaleString(dateLocale()), res.safeDays)}</div>}
      <Button variant="primary" icon="checkCircle" onClick={save}>{t('Save as my goal')}</Button>
    </div>}

    <h2 className="startw-h"><Icon name="flame" />{t('Burn it with a plan')}</h2>
    <div className="calc-next">
      <button className="card calc-mode" onClick={() => nav('/burn/home')}><Icon name="house" /><b>{t('Without equipment')}</b><span className="small muted">{t('Running, burpees, push-ups…')}</span></button>
      <button className="card calc-mode" onClick={() => nav('/burn/gym')}><Icon name="barbell" /><b>{t('With equipment')}</b><span className="small muted">{t('Bench press, deadlift, squat…')}</span></button>
    </div>
    <p className="small muted calc-foot">{t('Estimates for healthy adults. Pregnant, under 18, or with a health condition? Ask a doctor first.')}</p>
  </div>
}

function Stat({ label, value, unit, sub }) {
  return <div className="calc-stat"><span className="small muted">{label}</span><b>{value} <i>{unit}</i></b>{sub && <span className="small dim">{sub}</span>}</div>
}
