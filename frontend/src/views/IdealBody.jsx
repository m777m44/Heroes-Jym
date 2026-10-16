// "Ideal body" (2.12, rebuilt in 3.0): a healthy weight for YOUR height, age, sex and frame,
// what your body is made of, a plan with a programme, calories, macros and a week-by-week road,
// and a dashboard comparing now, before, your ideal and your goal. The maths is in
// lib/idealBody.js.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { fmtNum, fmtDate, todayISO } from '../lib/format.js'
import { fromKg, goalStart } from '../lib/weightTracker.js'
import { idealBody, bodyInputs, birthYearFor, paceCheck, adaptKcal, weightRoad, bmiPos, FORMULA_ORDER, ADULT_AGE, MIN_AGE, MAX_AGE } from '../lib/idealBody.js'
import { weekPlan } from '../lib/dailyPlan.js'
import { DAYS } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import CommitNumber from '../components/CommitNumber.jsx'
import LineChart from '../components/LineChart.jsx'
import { Section, Row, Segmented, Button, BackButton } from '../components/ui.jsx'
import { bwSheet } from '../sheets.jsx'
import { nav } from '../lib/nav.js'

const BMI_CAT = { under: 'Underweight', normal: 'Healthy weight', over: 'Overweight', obese: 'Obesity' }
const BMI_COL = { under: 'var(--blue)', normal: 'var(--green)', over: 'var(--orange)', obese: 'var(--red)' }
const FAT_CAT = { low: 'Below the healthy range', healthy: 'In the healthy range', high: 'Above the healthy range', veryHigh: 'Well above the healthy range' }
const FAT_COL = { low: 'var(--blue)', healthy: 'var(--green)', high: 'var(--orange)', veryHigh: 'var(--red)' }
const WHTR_CAT = { low: 'Very slim', healthy: 'Healthy', raised: 'Raised risk', high: 'High risk' }
const WHTR_COL = { low: 'var(--blue)', healthy: 'var(--green)', raised: 'var(--orange)', high: 'var(--red)' }
const ACT = { low: 'Little walking (under 5,000 steps)', light: 'Light (5,000–7,500 steps)', moderate: 'Moderate (7,500–10,000 steps)', high: 'Active (10,000+ steps)' }
const PACE = {
  tooFast: ['Faster than is safe — eat a little more so you lose fat, not muscle.', 'var(--orange)'],
  good: ['A healthy pace — keep going.', 'var(--green)'],
  stalled: ['Stalled for now — a few hundred more steps a day or a small cut in snacks gets it moving.', 'var(--yellow)'],
  wrongWay: ['Heading away from your ideal weight lately.', 'var(--red)'],
  steady: ['Steady — you are holding your weight.', 'var(--green)'],
  drifting: ['Your weight is drifting — keep an eye on it.', 'var(--yellow)'],
}
const FORMULA_NAME = { devine: 'Devine', robinson: 'Robinson', miller: 'Miller', hamwi: 'Hamwi', broca: 'Broca', lorentz: 'Lorentz', bmi22: 'BMI 22', fat: 'Body fat' }
const FRAME_NAME = { small: 'Small frame', medium: 'Medium frame', large: 'Large frame' }
const PROGRAM = {
  lose: ['Lose fat', 'flame', 'A 500 kcal daily deficit, high protein, and a week of home workouts, HIIT and walking.'],
  muscle: ['Build muscle', 'dumbbell', 'A small surplus, 2 g protein per kg, and a push / pull / legs week in the gym.'],
  keep: ['Keep my weight', 'checkCircle', 'Eat what you burn, and mix strength, walking and recovery.'],
}
const TABS = ['overview', 'body', 'plan', 'compare']

export default function IdealBody() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [tab, setTab] = useState(() => (typeof location !== 'undefined' && TABS.find(x => location.hash.includes('tab=' + x))) || 'overview')
  const unit = S.unit
  const u = U(unit)
  const w = v => fmtNum(Math.round(fromKg(v, unit) * 10) / 10)
  const last = S.bodyweight.length ? S.bodyweight[S.bodyweight.length - 1] : null
  const inp = bodyInputs(S)
  const age = inp.age
  const sex = inp.sex
  const r = idealBody(inp)
  const pace = r && r.goal ? paceCheck(S.bodyweight, unit, r.goal) : null
  const goalNow = r && r.ideal ? Math.round(fromKg(r.ideal, unit) * 10) / 10 : null
  const isGoal = goalNow != null && S.targetW != null && Math.abs(S.targetW - goalNow) < 0.05
  // "Make it my goal" also starts the plan: the road is measured from today's weight
  const setGoal = () => {
    update(s => {
      s.targetW = goalNow; s.targetFrom = last ? last.w : null
      s.bodyPlan = r.weeks > 0 ? { start: todayISO(), fromKg: r.weightKg, toKg: r.ideal, weeklyKg: r.weeklyKg } : null
    })
    useUI.getState().toast(t('Goal set to {0} {1}', fmtNum(goalNow), u))
  }
  const ctx = { S, update, r, u, w, unit, last, age, sex, pace, isGoal, goalNow, setGoal }

  return <div className="narrow ideal">
    <div className="hdr">
      <BackButton fallback="/weight" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Ideal body')}</h1><div className="sub">{t('By your height, age and sex')}</div></div>
    </div>

    <Hero {...ctx} />

    {r && r.adult && <Segmented className="ideal-tabs" value={tab} onChange={setTab}
      options={[{ value: 'overview', label: t('Overview') }, { value: 'body', label: t('Body') }, { value: 'plan', label: t('Plan') }, { value: 'compare', label: t('Compare') }]} />}

    {(!r || !r.adult || tab === 'overview') && <Overview {...ctx} />}
    {r && r.adult && tab === 'body' && <BodyTab {...ctx} />}
    {r && r.adult && tab === 'plan' && <PlanTab {...ctx} />}
    {r && r.adult && tab === 'compare' && <CompareTab {...ctx} />}

    <div className="small dim ideal-note"><Icon name="info" /> {t('Estimates for healthy adults, not medical advice. Pregnancy, athletes with a lot of muscle and some illnesses need a doctor’s view.')}</div>
    <div className="small dim" style={{ textAlign: 'center', marginBottom: 20 }}>{t('Last weigh-in: {0}', last ? fmtDate(last.d, true) : '—')}{last && last.d !== todayISO() ? ' · ' : ''}
      {last && last.d !== todayISO() && <button className="h2link" onClick={() => bwSheet()}>{t('Weigh in today')}</button>}</div>
  </div>
}

/* ---------------------------------------------------------------- the answer */
function Hero({ r, u, w, age, isGoal, goalNow, setGoal, S }) {
  if (!(r && r.adult && r.ideal)) return <div className="card ideal-hero">
    <div className="ideal-empty-i"><Icon name="person" /></div>
    <div className="ideal-empty-t">{!S.heightCm || !age ? t('Add your height and age below to see your ideal weight.')
      : t('Ideal-weight formulas are for adults ({0}+). For children and teens, BMI is read on growth charts by age — ask a doctor.', ADULT_AGE)}</div>
    {r && r.bmi != null && <div className="small muted" style={{ marginTop: 8 }}>{t('BMI {0}', fmtNum(r.bmi))}</div>}
  </div>
  return <div className="card ideal-hero">
    <div className="lbl2">{t('Your ideal weight')}</div>
    <div className="ideal-big">{w(r.ideal)}<span>{u}</span></div>
    <div className="small muted">{t('Ideal range for your age: {0}–{1} {2}', w(r.idealKg[0]), w(r.idealKg[1]), u)}</div>
    <div className="small dim">{t('Healthy range for your height: {0}–{1} {2}', w(r.healthyKg[0]), w(r.healthyKg[1]), u)}{r.frame !== 'medium' ? ' · ' + t(FRAME_NAME[r.frame]) : ''}</div>
    {r.bmi != null && <div className={'ideal-gap ' + r.goal}>
      <Icon name={r.goal === 'keep' ? 'checkCircle' : r.goal === 'lose' ? 'arrowDown' : 'arrowUp'} />
      <span>{r.goal === 'keep' ? t('You are in your ideal range — keep it up!')
        : r.goal === 'lose' ? t('{0} {1} to lose to reach it', w(Math.abs(r.toIdeal)), u)
          : t('{0} {1} to gain to reach it', w(Math.abs(r.toIdeal)), u)}</span>
    </div>}
    {r.bmi != null && <BmiGauge r={r} />}
    <div className="ideal-acts">
      {r.bmi == null
        ? <Button variant="primary" icon="scale" onClick={() => bwSheet()}>{t('Log your weight to compare')}</Button>
        : <Button variant={isGoal ? 'plain' : 'primary'} icon={isGoal ? 'checkCircle' : 'target'} disabled={isGoal} onClick={setGoal}>
          {isGoal ? t('This is your goal') : t('Make {0} {1} my goal', fmtNum(goalNow), u)}
        </Button>}
    </div>
  </div>
}

/* ---------------------------------------------------------------- overview */
function Overview({ S, update, r, u, w, age, sex, pace }) {
  const eta = r && r.weeks ? (() => { const d = new Date(); d.setDate(d.getDate() + r.weeks * 7); return d.toISOString().slice(0, 10) })() : null
  return <>
    <Section title={t('About you')} footer={t('Used only on this phone to work out your numbers.')}>
      <Row icon="person" iconTint="var(--indigo)" title={t('Sex')}>
        <Segmented className="seg-inline" value={sex} onChange={v => update(s => { s.sex = v })}
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]} />
      </Row>
      <Row icon="calendar" iconTint="var(--orange)" title={t('Age')}>
        <CommitNumber className="rowfield" value={age} placeholder="30"
          onCommit={v => update(s => { s.birthYear = birthYearFor(v) })} aria-label={t('Age')} />
        <span className="muted small">{t('years')}</span>
      </Row>
      <Row icon="ruler" iconTint="var(--teal)" title={t('Height')}>
        <CommitNumber className="rowfield" value={S.heightCm} placeholder="175"
          onCommit={v => update(s => { s.heightCm = v && v >= 100 && v <= 250 ? v : null })} aria-label={t('Height')} />
        <span className="muted small">{U('cm')}</span>
      </Row>
      <Row icon="target" iconTint="var(--pink)" title={t('Waist')} subtitle={t('Optional — at the navel')}>
        <CommitNumber className="rowfield" value={S.waistCm} placeholder="85"
          onCommit={v => update(s => { s.waistCm = v && v >= 40 && v <= 200 ? v : null })} aria-label={t('Waist')} />
        <span className="muted small">{U('cm')}</span>
      </Row>
    </Section>
    {age == null && S.birthYear != null && <div className="small" style={{ color: 'var(--orange)', margin: '-8px 4px 14px' }}>{t('Enter an age from {0} to {1}.', MIN_AGE, MAX_AGE)}</div>}

    {r && r.bmi != null && <>
      <h4 className="sec">{t('Your numbers')}</h4>
      <div className="ideal-tiles">
        <Tile icon="scale" tint={BMI_COL[r.bmiCat]} label={t('BMI')} value={fmtNum(r.bmi)} sub={t(BMI_CAT[r.bmiCat])} />
        {r.bodyFat != null && <Tile icon="person" tint={FAT_COL[r.bodyFatCat]} label={t('Body fat (estimate)')} value={fmtNum(r.bodyFat) + '%'}
          sub={t(FAT_CAT[r.bodyFatCat]) + ' · ' + r.bodyFatRange[0] + '–' + r.bodyFatRange[1] + '%'} />}
        {r.bmr != null && <Tile icon="heartPulse" tint="var(--red)" label={t('Resting burn')} value={fmtNum(r.bmr)} unit={t('kcal / day')} sub={t('what your body uses at rest')} />}
        {r.tdee != null && <Tile icon="flame" tint="var(--orange)" label={t('Daily energy')} value={fmtNum(r.tdee)} unit={t('kcal / day')} sub={t(ACT[r.activity])} />}
        {r.kcal != null && <Tile icon="target" tint="var(--green)" label={r.program === 'lose' ? t('Eat to lose') : r.program === 'muscle' ? t('Eat to gain') : t('Eat to keep')}
          value={fmtNum(r.kcal)} unit={t('kcal / day')} sub={r.program === 'keep' ? t('your weight stays put') : t('about {0} {1} a week', w(r.weeklyKg || 0.25), u)} />}
        {r.proteinG != null && <Tile icon="dumbbell" tint="var(--indigo)" label={t('Protein')} value={fmtNum(r.proteinG)} unit={t('g / day')} sub={t('keeps muscle while you train')} />}
        {r.waterMl != null && <Tile icon="drop" tint="var(--blue)" label={t('Water')} value={fmtNum(r.waterMl)} unit={U('ml')} sub={t('a day, before workouts')} />}
        {r.whtr != null ? <Tile icon="ruler" tint={WHTR_COL[r.whtrCat]} label={t('Waist ÷ height')} value={r.whtr.toLocaleString(dateLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sub={t(WHTR_CAT[r.whtrCat]) + ' · ' + t('keep it under 0.5', 0.5)} />
          : <Tile icon="ruler" tint="var(--label-3)" label={t('Waist ÷ height')} value="—" sub={t('add your waist above')} />}
      </div>
    </>}

    {r && r.weeks > 0 && <div className="card ideal-road">
      <h2><Icon name="flag" /> {t('Your road to {0} {1}', w(r.ideal), u)}</h2>
      <div className="ideal-road-row">
        <div><b>{r.weeks}</b><span>{t(r.weeks === 1 ? 'week' : 'weeks')}</span></div>
        <div><b>{w(r.weeklyKg)}</b><span>{t('{0} a week', u)}</span></div>
        <div><b>{fmtDate(eta, true)}</b><span>{t('around')}</span></div>
      </div>
      <div className="small dim">{t('At a safe pace of {0} {1} a week with {2} kcal a day and your usual walking.', w(r.weeklyKg), u, fmtNum(r.kcal))}</div>
    </div>}
    {pace && <PaceCard pace={pace} w={w} u={u} />}

    {r && r.adult && r.formulas && <FormulaList r={r} w={w} u={u} age={age} />}
  </>
}

function PaceCard({ pace, w, u }) {
  return <div className="card ideal-pace" style={{ '--c': PACE[pace.verdict][1] }}>
    <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
      <span className="ideal-pace-i"><Icon name="chartLine" /></span>
      <div className="grow">
        <div className="ideal-pace-t">{t('Your pace: {0} {1} a week ({2}% of your weight)', (pace.rate > 0 ? '+' : pace.rate < 0 ? '−' : '±') + w(Math.abs(pace.rate)), u, fmtNum(Math.abs(pace.pct)))}</div>
        <div className="small muted">{t(PACE[pace.verdict][0])}</div>
      </div>
    </div>
  </div>
}

/** The 8 methods, each drawn against the healthy range. */
function FormulaList({ r, w, u, age }) {
  const lo = r.healthyKg[0] - 8, hi = r.healthyKg[1] + 8
  const pos = v => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100))
  return <Section title={t('How it is worked out')} footer={t('Your ideal weight blends the age-adjusted BMI range with the classic formulas (which know your sex), adjusts ±5% for your frame and stays inside the healthy range.')}>
    {FORMULA_ORDER.filter(k => r.formulas[k] != null).map(k =>
      <div key={k} className="lrow ideal-f">
        <span className="ideal-f-n">{t('{0} formula', t(FORMULA_NAME[k]))}</span>
        <span className="ideal-f-bar" aria-hidden="true">
          <i className="ok" style={{ left: pos(r.healthyKg[0]) + '%', width: (pos(r.healthyKg[1]) - pos(r.healthyKg[0])) + '%' }} />
          <b style={{ left: pos(r.formulas[k]) + '%' }} />
        </span>
        <b className="ideal-f-v">{w(r.formulas[k])} {u}</b>
      </div>)}
    <div className="lrow ideal-f"><span className="grow">{t('BMI range for age {0}', age)}</span><b>{w(r.idealKg[0])}–{w(r.idealKg[1])} {u}</b></div>
  </Section>
}

/* ---------------------------------------------------------------- body */
function BodyTab({ S, update, r, u, w, sex }) {
  const c = r.comp
  const frameOpts = ['auto', 'small', 'medium', 'large'].map(v => ({ value: v, label: v === 'auto' ? t('Auto') : t(v === 'small' ? 'Small' : v === 'medium' ? 'Medium' : 'Large') }))
  const fatMid = (r.bodyFatRange[0] + r.bodyFatRange[1]) / 2
  const tape = (key, label, sub, lo, hi, ph, icon, tint) =>
    <Row icon={icon} iconTint={tint} title={label} subtitle={sub}>
      <CommitNumber className="rowfield" value={S[key]} placeholder={ph}
        onCommit={v => update(s => { s[key] = v && v >= lo && v <= hi ? v : null })} aria-label={label} />
      <span className="muted small">{U('cm')}</span>
    </Row>
  return <>
    {c ? <div className="card">
      <h2>{t('What your body is made of')}</h2>
      <div className="comp-bar" aria-hidden="true">
        <span className="fat" style={{ flex: c.fatKg }} />
        <span className="mus" style={{ flex: c.muscleKg }} />
        <span className="oth" style={{ flex: Math.max(0, c.leanKg - c.muscleKg) }} />
      </div>
      <div className="comp-key">
        <span><i className="fat" />{t('Fat')} {w(c.fatKg)} {u}</span>
        <span><i className="mus" />{t('Muscle')} {w(c.muscleKg)} {u}</span>
        <span><i className="oth" />{t('Bones, organs & water')} {w(Math.max(0, c.leanKg - c.muscleKg))} {u}</span>
      </div>
      <div className="ideal-tiles" style={{ marginTop: 12, marginBottom: 0 }}>
        <Tile icon="person" tint={FAT_COL[r.bodyFatCat]} label={t('Fat mass')} value={w(c.fatKg)} unit={u} sub={fmtNum(r.bodyFat) + '% · ' + t(FAT_CAT[r.bodyFatCat])} />
        <Tile icon="figureStrength" tint="var(--indigo)" label={t('Lean mass')} value={w(c.leanKg)} unit={u} sub={t('everything that is not fat')} />
        <Tile icon="dumbbell" tint="var(--purple)" label={t('Skeletal muscle')} value={w(c.muscleKg)} unit={u} sub={t('{0}% of your weight', c.musclePct)} />
        <Tile icon="drop" tint="var(--blue)" label={t('Body water')} value={fmtNum(c.waterL)} unit={t('L')} sub={t('{0}% of your weight', c.waterPct)} />
      </div>
      <div className="small dim" style={{ marginTop: 10 }}>{t('At your ideal weight with {0}% fat: about {1} {2} of fat and {3} {2} lean.', Math.round(fatMid), w(r.ideal * fatMid / 100), u, w(r.ideal * (1 - fatMid / 100)))}</div>
    </div> : <div className="card small muted">{t('Log your weight to see what your body is made of.')}</div>}

    <Section title={t('Body fat')} footer={r.bodyFatMethod === 'navy' ? t('Measured with the US-Navy tape method (waist, neck{0}) — usually closer than BMI alone.', sex === 'female' ? ', ' + t('hips') : '') : t('Add your neck{0} below for the more accurate US-Navy tape method.', sex === 'female' ? ' ' + t('and hips') : '')}>
      {r.bodyFatNavy != null && <div className="lrow"><span className="grow">{t('US-Navy tape method')}</span><b>{fmtNum(r.bodyFatNavy)}%</b></div>}
      {r.bodyFatBmi != null && <div className="lrow"><span className="grow">{t('From BMI and age (Deurenberg)')}</span><b>{fmtNum(r.bodyFatBmi)}%</b></div>}
      <div className="lrow"><span className="grow">{t('Healthy for your age and sex')}</span><b>{r.bodyFatRange[0]}–{r.bodyFatRange[1]}%</b></div>
    </Section>

    <Section title={t('Tape measurements')} footer={t('Measure in the morning, relaxed, tape snug but not tight.')}>
      {tape('waistCm', t('Waist'), t('Optional — at the navel'), 40, 200, '85', 'target', 'var(--pink)')}
      {tape('neckCm', t('Neck'), t('Below the Adam’s apple'), 20, 70, '38', 'person', 'var(--orange)')}
      {sex === 'female' && tape('hipCm', t('Hips'), t('At the widest point'), 50, 200, '98', 'person', 'var(--purple)')}
      {tape('wristCm', t('Wrist'), t('Just above the wrist bone — for your frame'), 10, 30, '17', 'ruler', 'var(--teal)')}
    </Section>

    <Section title={t('Frame size')} footer={r.frameAuto ? t('From your height and wrist: {0}.', t(FRAME_NAME[r.frameAuto])) : t('Add your wrist to find your frame, or pick it yourself.')}>
      <div className="lrow"><Segmented value={S.frame || 'auto'} onChange={v => update(s => { s.frame = v })} options={frameOpts} /></div>
    </Section>
  </>
}

/* ---------------------------------------------------------------- plan */
function PlanTab({ S, update, r, u, w, unit, last, pace, isGoal, setGoal }) {
  const adapted = adaptKcal(r, pace)
  const kcal = adapted ? adapted.kcal : r.kcal
  const m = r.macros && adapted && adapted.delta ? (() => { const x = r.macros; const carbs = Math.max(0, x.carbs + Math.round(adapted.delta / 4)); return { ...x, carbs } })() : r.macros
  const plan = S.bodyPlan
  const road = plan ? weightRoad({ fromKg: plan.fromKg, toKg: plan.toKg, weeklyKg: plan.weeklyKg, startIso: plan.start, history: S.bodyweight, unit }) : null
  const [all, setAll] = useState(false)
  const week = weekPlan(S, todayISO())
  const today = todayISO()
  return <>
    <Section title={t('Your programme')} footer={t(PROGRAM[r.program][2])}>
      <div className="lrow"><Segmented value={S.bodyGoal || 'auto'} onChange={v => update(s => { s.bodyGoal = v })}
        options={[{ value: 'auto', label: t('Auto') }, { value: 'lose', label: t('Lose') }, { value: 'muscle', label: t('Muscle') }, { value: 'keep', label: t('Keep') }]} /></div>
      <div className="lrow"><span className="lrow-i" style={{ '--tint': 'var(--acc)' }}><Icon name={PROGRAM[r.program][1]} /></span>
        <span className="grow"><b>{t(PROGRAM[r.program][0])}</b>{(S.bodyGoal || 'auto') === 'auto' && <span className="small muted"> · {t('chosen for you')}</span>}</span></div>
    </Section>

    {kcal != null && <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{t('Calories a day')}</h2><div className="macro-kcal">{fmtNum(kcal)}<span>{t('kcal')}</span></div></div>
      {adapted && adapted.delta !== 0 && <div className="small" style={{ color: 'var(--yellow)', marginTop: 4 }}>
        <Icon name="sparkles" /> {adapted.delta < 0 ? t('Adjusted −{0} kcal because your weight has stalled.', Math.abs(adapted.delta)) : r.program === 'muscle' && pace && pace.verdict === 'tooFast' ? t('Adjusted {0} kcal because you are gaining too fast.', adapted.delta) : t('Adjusted +{0} kcal because you are losing too fast.', adapted.delta)}</div>}
      {m && <div className="macros">
        {[['protein', t('Protein'), 'var(--indigo)'], ['carbs', t('Carbs'), 'var(--orange)'], ['fat', t('Fat'), 'var(--yellow)']].map(([k, label, c]) =>
          <div key={k} className="macro" style={{ '--c': c }}>
            <div className="macro-ring" style={{ '--p': (m.pct[k] || 0) + '%' }}><span>{m.pct[k]}%</span></div>
            <b>{fmtNum(m[k])} {t('g')}</b><span>{label}</span>
          </div>)}
      </div>}
      <div className="small dim">{t('Protein {0} g per kg · fat about a quarter of the calories · carbs the rest.', r.program === 'lose' ? '1.8' : r.program === 'muscle' ? '2' : '1.6')}</div>
    </div>}

    {/* the road, week by week */}
    {road && road.weeks.length > 0 ? <div className="card">
      <h2><Icon name="flag" /> {t('Your road to {0} {1}', w(plan.toKg), u)}</h2>
      <div className="mile-row">
        {road.milestones.map(x => <div key={x.pct} className={'mile' + (x.reached ? ' on' : '')}>
          <span className="mile-i"><Icon name={x.reached ? 'check' : x.pct === 100 ? 'trophy' : 'flag'} /></span>
          <b>{x.pct}%</b><span>{w(x.kg)} {u}</span><span className="dim">{fmtDate(x.iso, true)}</span>
        </div>)}
      </div>
      <div className="road-list">
        {(all ? road.weeks : road.weeks.slice(0, 8)).map(x => <div key={x.week} className={'road-w ' + x.status}>
          <span className="road-n">{t('Week {0}', x.week)}</span>
          <span className="dim small">{fmtDate(x.iso, true)}</span>
          <span className="grow" />
          <span className="small">{t('Target')} <b>{w(x.target)}</b></span>
          <span className="road-a">{x.actual != null ? w(x.actual) : x.status === 'missed' ? '—' : ''}</span>
          <span className="road-s" aria-hidden="true">{x.status === 'on' ? <Icon name="checkCircle" /> : x.status === 'behind' ? <Icon name="arrowUp" /> : null}</span>
        </div>)}
      </div>
      {road.weeks.length > 8 && <button className="h2link" onClick={() => setAll(!all)}>{all ? t('Show less') : t('Show all {0} weeks', road.weeks.length)}</button>}
    </div> : r.weeks > 0 && <div className="card ideal-start">
      <div><b>{t('Start a plan to {0} {1}', w(r.ideal), u)}</b><div className="small muted">{t('{0} weeks at {1} {2} a week, with milestones and a weekly check.', r.weeks, w(r.weeklyKg), u)}</div></div>
      <Button variant="primary" icon="flag" onClick={setGoal} disabled={!last}>{isGoal ? t('Restart from today') : t('Start')}</Button>
    </div>}

    {/* the training week */}
    <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{t('Your training week')}</h2><button className="h2link" onClick={() => nav('/home')}>{t('Today')} <Icon name="chevronRight" /></button></div>
      <div className="pw-list">
        {week.map(({ iso, dow, plan: p }) => <div key={iso} className={'pw-d' + (iso === today ? ' on' : '')}>
          <span className="pw-day">{t(DAYS[dow])}</span>
          <span className="pw-i" style={{ '--c': 'var(--' + (p.color === 'acc' ? 'acc' : p.color) + ')' }}><Icon name={p.icon} /></span>
          <span className="grow pw-t">{t(p.title)}</span>
          <span className="small muted">{t('{0} min', p.minutes)}{p.gym ? ' · ' + t('Gym') : ''}</span>
        </div>)}
      </div>
    </div>
  </>
}

/* ---------------------------------------------------------------- compare */
function CompareTab({ S, r, u, w, unit, last }) {
  const prev = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const cur = last ? last.w : null
  const ideal = Math.round(fromKg(r.ideal, unit) * 10) / 10
  const start = goalStart(S)
  const target = S.targetW
  const pts = S.bodyweight.slice(-90).map(b => ({ t: new Date(b.d + 'T12:00:00').getTime(), y: b.w, d: b.d }))
  const band = r.idealKg.map(v => Math.round(fromKg(v, unit) * 10) / 10)
  const d1 = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmtNum(Math.abs(Math.round(v * 10) / 10))
  // the bar runs from where you started to your goal (else to the ideal weight)
  const end = target != null ? target : ideal
  const from = start != null ? start : cur
  const span = from != null && end != null ? end - from : 0
  const pct = cur != null && span ? Math.max(0, Math.min(100, (cur - from) / span * 100)) : cur != null && from != null ? 100 : 0
  const at = v => (span ? Math.max(0, Math.min(100, (v - from) / span * 100)) : 100)
  if (cur == null) return <div className="card small muted">{t('Log your weight to compare.')}</div>
  return <>
    <div className="cmp-grid">
      <CmpCard title={t('Now')} value={fmtNum(cur)} unit={u} line={prev ? t('Before: {0}', fmtNum(prev.w)) : null}
        diff={prev ? d1(cur - prev.w) : null} tone={prev ? (Math.sign(cur - prev.w) === Math.sign(ideal - cur) ? 'good' : cur === prev.w ? '' : 'bad') : ''} />
      <CmpCard title={t('Ideal')} value={fmtNum(ideal)} unit={u} hl line={t('{0} away', fmtNum(Math.abs(Math.round((cur - ideal) * 10) / 10)) + ' ' + u)} />
      <CmpCard title={t('Your goal')} value={target != null ? fmtNum(target) : '—'} unit={target != null ? u : ''} line={target != null ? t('{0} away', fmtNum(Math.abs(Math.round((cur - target) * 10) / 10)) + ' ' + u) : t('not set')} />
      <CmpCard title={t('Body fat')} value={fmtNum(r.bodyFat) + '%'} line={t('Healthy: {0}', r.bodyFatRange[0] + '–' + r.bodyFatRange[1] + '%')} tone={r.bodyFatCat === 'healthy' ? 'good' : 'bad'} />
      <CmpCard title={t('Skeletal muscle')} value={w(r.comp.muscleKg)} unit={u} line={t('{0}% of your weight', r.comp.musclePct)} />
      <CmpCard title={t('BMI')} value={fmtNum(r.bmi)} line={t(BMI_CAT[r.bmiCat])} tone={r.bmiCat === 'normal' ? 'good' : 'bad'} />
    </div>

    {from != null && end != null && <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{t('Progress to your goal')}</h2><b className="cmp-pct">{Math.round(pct)}%</b></div>
      <div className="cmp-track">
        <span className="cmp-fill" style={{ width: pct + '%' }} />
        {target != null && Math.abs(ideal - target) > 0.05 && <span className="cmp-ideal" style={{ left: at(ideal) + '%' }} title={t('Ideal')} />}
      </div>
      <div className="cmp-lbl"><span>{t('Start')} {fmtNum(from)}</span><span>{t('Now')} {fmtNum(cur)}</span><span>{t('Goal')} {fmtNum(end)}</span></div>
    </div>}

    {pts.length > 1 && <div className="card">
      <h2>{t('Weight, ideal range and goal')}</h2>
      <div className="chart"><LineChart points={pts} h={170} unit={unit} goal={target} band={band} /></div>
      <div className="small dim row" style={{ gap: 6, marginTop: 6 }}><i className="lc-band-key" />{t('Shaded: your ideal range {0}–{1} {2}', fmtNum(band[0]), fmtNum(band[1]), u)}</div>
    </div>}
  </>
}

function CmpCard({ title, value, unit, line, diff, tone = '', hl }) {
  return <div className={'cmp-card' + (hl ? ' hl' : '')}>
    <div className="cmp-t">{title}</div>
    <div className="cmp-v">{value}{unit && <span>{unit}</span>}</div>
    {diff && <div className={'cmp-d ' + tone}>{diff}</div>}
    {line && <div className="cmp-l">{line}</div>}
  </div>
}

function Tile({ icon, tint, label, value, unit, sub }) {
  return <div className="ideal-tile" style={{ '--tint': tint }}>
    <div className="ideal-tile-h"><span className="ideal-tile-i"><Icon name={icon} /></span>{label}</div>
    <div className="ideal-tile-v">{value}{unit && <span>{unit}</span>}</div>
    {sub && <div className="ideal-tile-s">{sub}</div>}
  </div>
}

/** The BMI scale 15–40 with the four bands, your ideal band and a marker for you. */
function BmiGauge({ r }) {
  const m2 = (r.heightCm / 100) ** 2
  const lo = bmiPos(r.idealKg[0] / m2), hi = bmiPos(r.idealKg[1] / m2)
  const h = r.age >= 65 ? [22, 27] : [18.5, 24.9]
  return <div className="bmig" aria-label={t('BMI {0}', fmtNum(r.bmi))}>
    <div className="bmig-bar" style={{ '--a': bmiPos(h[0]) + '%', '--b': bmiPos(h[1]) + '%', '--c': bmiPos(30) + '%' }}>
      <span className="bmig-ideal" style={{ left: lo + '%', width: (hi - lo) + '%' }} />
      <span className="bmig-me" style={{ left: bmiPos(r.bmi) + '%' }}><b>{fmtNum(r.bmi)}</b></span>
    </div>
    <div className="bmig-l">{[15, h[0], h[1], 30, 40].map(v => <span key={v} style={{ left: bmiPos(v) + '%' }}>{fmtNum(v)}</span>)}</div>
  </div>
}
