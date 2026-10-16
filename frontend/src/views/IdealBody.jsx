// "Ideal body" (2.12): a healthy weight for YOUR height, age and sex, how far away it is, and
// what it takes — calories, protein, water, a realistic date — plus a check on the pace you are
// actually losing (or gaining) at. All the maths is in lib/idealBody.js.
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U } from '../lib/i18n.js'
import { fmtNum, fmtDate, todayISO } from '../lib/format.js'
import { fromKg, toKg } from '../lib/weightTracker.js'
import { idealBody, ageOf, sexOf, birthYearFor, stepsAverage, paceCheck, bmiPos, ADULT_AGE, MIN_AGE, MAX_AGE } from '../lib/idealBody.js'
import Icon from '../components/Icon.jsx'
import CommitNumber from '../components/CommitNumber.jsx'
import { Section, Row, Segmented, Button, BackButton } from '../components/ui.jsx'
import { bwSheet } from '../sheets.jsx'

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

export default function IdealBody() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const unit = S.unit
  const u = U(unit)
  const w = v => fmtNum(Math.round(fromKg(v, unit) * 10) / 10)
  const last = S.bodyweight.length ? S.bodyweight[S.bodyweight.length - 1] : null
  const age = ageOf(S)
  const sex = sexOf(S)
  const r = idealBody({ heightCm: S.heightCm, age, sex, weightKg: last ? toKg(last.w, unit) : null, waistCm: S.waistCm, stepsAvg: stepsAverage(S) })
  const pace = r && r.goal ? paceCheck(S.bodyweight, unit, r.goal) : null
  const goalNow = r && r.ideal ? Math.round(fromKg(r.ideal, unit) * 10) / 10 : null
  const isGoal = goalNow != null && S.targetW != null && Math.abs(S.targetW - goalNow) < 0.05
  const setGoal = () => {
    update(s => { s.targetW = goalNow; s.targetFrom = last ? last.w : null })
    useUI.getState().toast(t('Goal set to {0} {1}', fmtNum(goalNow), u))
  }
  const eta = r && r.weeks ? (() => { const d = new Date(); d.setDate(d.getDate() + r.weeks * 7); return d.toISOString().slice(0, 10) })() : null

  return <div className="narrow ideal">
    <div className="hdr">
      <BackButton fallback="/weight" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Ideal body')}</h1><div className="sub">{t('By your height, age and sex')}</div></div>
    </div>

    {/* ---- the answer ---- */}
    {r && r.adult && r.ideal ? <div className="card ideal-hero">
      <div className="lbl2">{t('Your ideal weight')}</div>
      <div className="ideal-big">{w(r.ideal)}<span>{u}</span></div>
      <div className="small muted">{t('Ideal range for your age: {0}–{1} {2}', w(r.idealKg[0]), w(r.idealKg[1]), u)}</div>
      <div className="small dim">{t('Healthy range for your height: {0}–{1} {2}', w(r.healthyKg[0]), w(r.healthyKg[1]), u)}</div>
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
    </div> : <div className="card ideal-hero">
      <div className="ideal-empty-i"><Icon name="person" /></div>
      <div className="ideal-empty-t">{!S.heightCm || !age ? t('Add your height and age below to see your ideal weight.')
        : t('Ideal-weight formulas are for adults ({0}+). For children and teens, BMI is read on growth charts by age — ask a doctor.', ADULT_AGE)}</div>
      {r && r.bmi != null && <div className="small muted" style={{ marginTop: 8 }}>{t('BMI {0}', fmtNum(r.bmi))}</div>}
    </div>}

    {/* ---- you ---- */}
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

    {/* ---- your numbers ---- */}
    {r && r.bmi != null && <>
      <h4 className="sec">{t('Your numbers')}</h4>
      <div className="ideal-tiles">
        <Tile icon="scale" tint={BMI_COL[r.bmiCat]} label={t('BMI')} value={fmtNum(r.bmi)} sub={t(BMI_CAT[r.bmiCat])} />
        {r.bodyFat != null && <Tile icon="person" tint={FAT_COL[r.bodyFatCat]} label={t('Body fat (estimate)')} value={fmtNum(r.bodyFat) + '%'}
          sub={t(FAT_CAT[r.bodyFatCat]) + ' · ' + r.bodyFatRange[0] + '–' + r.bodyFatRange[1] + '%'} />}
        {r.bmr != null && <Tile icon="heartPulse" tint="var(--red)" label={t('Resting burn')} value={fmtNum(r.bmr)} unit={t('kcal / day')} sub={t('what your body uses at rest')} />}
        {r.tdee != null && <Tile icon="flame" tint="var(--orange)" label={t('Daily energy')} value={fmtNum(r.tdee)} unit={t('kcal / day')} sub={t(ACT[r.activity])} />}
        {r.kcal != null && <Tile icon="target" tint="var(--green)" label={r.goal === 'lose' ? t('Eat to lose') : r.goal === 'gain' ? t('Eat to gain') : t('Eat to keep')}
          value={fmtNum(r.kcal)} unit={t('kcal / day')} sub={r.goal === 'keep' ? t('your weight stays put') : t('about {0} {1} a week', w(r.weeklyKg), u)} />}
        {r.proteinG != null && <Tile icon="dumbbell" tint="var(--indigo)" label={t('Protein')} value={fmtNum(r.proteinG)} unit={t('g / day')} sub={t('keeps muscle while you train')} />}
        {r.waterMl != null && <Tile icon="drop" tint="var(--blue)" label={t('Water')} value={fmtNum(r.waterMl)} unit={U('ml')} sub={t('a day, before workouts')} />}
        {r.whtr != null ? <Tile icon="ruler" tint={WHTR_COL[r.whtrCat]} label={t('Waist ÷ height')} value={fmtNum(r.whtr)} sub={t(WHTR_CAT[r.whtrCat]) + ' · ' + t('keep it under 0.5')} />
          : <Tile icon="ruler" tint="var(--label-3)" label={t('Waist ÷ height')} value="—" sub={t('add your waist above')} />}
      </div>
    </>}

    {/* ---- the road there ---- */}
    {r && r.weeks > 0 && <div className="card ideal-road">
      <h2><Icon name="flag" /> {t('Your road to {0} {1}', w(r.ideal), u)}</h2>
      <div className="ideal-road-row">
        <div><b>{r.weeks}</b><span>{t(r.weeks === 1 ? 'week' : 'weeks')}</span></div>
        <div><b>{w(r.weeklyKg)}</b><span>{t('{0} a week', u)}</span></div>
        <div><b>{fmtDate(eta, true)}</b><span>{t('around')}</span></div>
      </div>
      <div className="small dim">{t('At a safe pace of {0} {1} a week with {2} kcal a day and your usual walking.', w(r.weeklyKg), u, fmtNum(r.kcal))}</div>
    </div>}
    {pace && <div className="card ideal-pace" style={{ '--c': PACE[pace.verdict][1] }}>
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span className="ideal-pace-i"><Icon name="chartLine" /></span>
        <div className="grow">
          <div className="ideal-pace-t">{t('Your pace: {0} {1} a week ({2}% of your weight)', (pace.rate > 0 ? '+' : pace.rate < 0 ? '−' : '±') + w(Math.abs(pace.rate)), u, fmtNum(Math.abs(pace.pct)))}</div>
          <div className="small muted">{t(PACE[pace.verdict][0])}</div>
        </div>
      </div>
    </div>}

    {/* ---- how it is worked out ---- */}
    {r && r.adult && r.formulas && <Section title={t('How it is worked out')} footer={t('Your ideal weight blends the age-adjusted BMI range with the four classic formulas (which know your sex) and stays inside the range for your age.')}>
      {[['Devine', r.formulas.devine], ['Robinson', r.formulas.robinson], ['Miller', r.formulas.miller], ['Hamwi', r.formulas.hamwi]].map(([n, v]) =>
        <div key={n} className="lrow ideal-f"><span className="grow">{t('{0} formula', n)}</span><b>{w(v)} {u}</b></div>)}
      <div className="lrow ideal-f"><span className="grow">{t('BMI range for age {0}', age)}</span><b>{w(r.idealKg[0])}–{w(r.idealKg[1])} {u}</b></div>
    </Section>}

    <div className="small dim ideal-note"><Icon name="info" /> {t('Estimates for healthy adults, not medical advice. Pregnancy, athletes with a lot of muscle and some illnesses need a doctor’s view.')}</div>
    <div className="small dim" style={{ textAlign: 'center', marginBottom: 20 }}>{t('Last weigh-in: {0}', last ? fmtDate(last.d, true) : '—')}{last && last.d !== todayISO() ? ' · ' : ''}
      {last && last.d !== todayISO() && <button className="h2link" onClick={() => bwSheet()}>{t('Weigh in today')}</button>}</div>
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
