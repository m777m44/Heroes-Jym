// 7.0 — Reports: your week or month at a glance, compared with the one before.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t, U, exName, dateLocale } from '../lib/i18n.js'
import { fmtNum, fmtDate, todayISO } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { buildReport } from '../lib/report.js'
import { BackButton, Segmented } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import AnimatedNumber from '../components/AnimatedNumber.jsx'

const n0 = v => Math.round(v || 0).toLocaleString(dateLocale())
const dayLabel = (iso, kind) => {
  const d = new Date(iso + 'T12:00:00')
  return kind === 'month' ? String(d.getDate()) : d.toLocaleDateString(dateLocale(), { weekday: 'narrow' })
}

function Delta({ v, invert = false, suffix = '%' }) {
  if (v == null || !isFinite(v) || v === 0) return <span className="rp-delta flat">—</span>
  const good = invert ? v < 0 : v > 0
  return <span className={'rp-delta ' + (good ? 'up' : 'down')}><Icon name={v > 0 ? 'arrowUp' : 'arrowDown'} />{Math.abs(v)}{suffix}</span>
}

function ScoreRing({ score, prev }) {
  const r = 46, c = 2 * Math.PI * r
  const col = score >= 75 ? 'var(--green)' : score >= 45 ? 'var(--yellow)' : 'var(--orange)'
  return <div className="rp-score">
    <svg viewBox="0 0 108 108" aria-hidden="true">
      <circle cx="54" cy="54" r={r} className="rp-score-bg" />
      <circle cx="54" cy="54" r={r} className="rp-score-fg" style={{ stroke: col, strokeDasharray: c, strokeDashoffset: c * (1 - score / 100) }} />
    </svg>
    <div className="rp-score-n"><AnimatedNumber value={score} /><small>/100</small></div>
    <div className="rp-score-l">{t('Score')} <Delta v={score - prev} suffix="" /></div>
  </div>
}

/** Tap a bar to read its value. Goal line when one applies. */
function Bars({ days, values, goals, color, kind, fmt, unit }) {
  const [sel, setSel] = useState(null)
  const max = Math.max(1, ...values, ...(goals || []).filter(Boolean))
  const today = todayISO()
  const goal = goals && goals.length ? Math.max(...goals) : null
  const i = sel == null ? null : sel
  return <div className="rp-chart">
    <div className="rp-tip">{i != null ? <><b>{fmt(values[i])}</b> {unit} · {fmtDate(days[i], true)}</> : <span className="muted">{t('Tap a bar')}</span>}</div>
    <div className={'rp-bars' + (kind === 'month' ? ' month' : '')}>
      {goal ? <div className="rp-goal" style={{ bottom: (goal / max) * 100 + '%' }} /> : null}
      {values.map((v, k) => {
        const hit = goals && goals[k] && v >= goals[k]
        return <button key={days[k]} className={'rp-bar' + (k === i ? ' sel' : '') + (days[k] > today ? ' future' : '') + (hit ? ' hit' : '')}
          onClick={() => setSel(k === i ? null : k)} aria-label={fmtDate(days[k]) + ': ' + fmt(v)}>
          <i style={{ height: Math.max(v > 0 ? 3 : 0, (v / max) * 100) + '%', background: color, animationDelay: (k * (kind === 'month' ? 12 : 40)) + 'ms' }} />
          <span>{kind === 'month' && (k % 5 !== 0 && k !== days.length - 1) ? '' : dayLabel(days[k], kind)}</span>
        </button>
      })}
    </div>
  </div>
}

function Stat({ icon, tone, label, value, sub, delta, invert }) {
  return <div className="rp-stat">
    <span className="rp-ic" style={{ color: `var(--${tone})`, background: `color-mix(in srgb, var(--${tone}) 16%, transparent)` }}><Icon name={icon} /></span>
    <div className="rp-sv">{value}</div>
    <div className="rp-sl">{label}</div>
    <div className="rp-ss">{sub}{delta !== undefined && <Delta v={delta} invert={invert} />}</div>
  </div>
}

export default function Reports() {
  const S = useStore(s => s.S)
  const nav = useNavigate()
  const [kind, setKind] = useState('week')
  const [off, setOff] = useState(0)
  const today = todayISO()
  const R = useMemo(() => buildReport(S, kind, today, off), [S, kind, today, off])
  const { cur, prev, period: p } = R
  const u = U(S.unit || 'kg')
  const [metric, setMetric] = useState('steps')
  const range = kind === 'month'
    ? new Date(p.from + 'T12:00:00').toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' })
    : fmtDate(p.from) + ' – ' + fmtDate(p.to)
  const chart = {
    steps: { values: cur.steps, goals: cur.days.map(() => cur.stepGoal), color: 'linear-gradient(180deg,#B8F56E,#30D158)', fmt: n0, unit: t('steps') },
    water: { values: cur.water, goals: cur.waterGoals, color: 'linear-gradient(180deg,#64D2FF,#0A84FF)', fmt: n0, unit: t('ml') },
    food: { values: cur.kcal, goals: null, color: 'linear-gradient(180deg,#FF6482,#FF375F)', fmt: n0, unit: t('kcal') }
  }[metric]
  const fc = R.forecast
  return <div className="narrow reports">
    <div className="hdr">
      <BackButton fallback="/stats" />
      <div><h1>{t('Reports')}</h1><div className="sub">{t('Your progress, measured')}</div></div>
    </div>

    <Segmented value={kind} onChange={v => { setKind(v); setOff(0) }} options={[{ value: 'week', label: t('Week') }, { value: 'month', label: t('Month') }]} />
    <div className="rp-nav">
      <button className="iconbtn" aria-label={t('Previous')} onClick={() => setOff(off - 1)}><Icon name="chevronLeft" className="icn-dir" /></button>
      <div className="rp-range"><Icon name="calendar" />{range}{off === 0 && <span className="tag acc">{kind === 'week' ? t('This week') : t('This month')}</span>}</div>
      <button className="iconbtn" aria-label={t('Next')} disabled={off >= 0} onClick={() => setOff(Math.min(0, off + 1))}><Icon name="chevronRight" className="icn-dir" /></button>
    </div>

    <div className="card rp-hero">
      <ScoreRing score={R.score} prev={R.prevScore} />
      <div className="rp-hero-txt">
        <b>{R.score >= 75 ? t('Excellent period!') : R.score >= 45 ? t('Good — room to grow') : t('Let’s build momentum')}</b>
        <div className="small muted">{t('{0} workouts · {1} goal-step days · {2} water-goal days', cur.workouts, cur.stepDays, cur.waterDays)}</div>
        {R.records.length > 0 && <div className="rp-rec"><Icon name="trophy" />{t('{0} new records', R.records.length)}</div>}
      </div>
    </div>

    <div className="rp-grid">
      <Stat icon="dumbbell" tone="acc" label={t('Workouts')} value={<AnimatedNumber value={cur.workouts} />} sub={t('{0} min', n0(cur.minutes)) + ' '} delta={cur.workouts - prev.workouts ? Math.round(((cur.workouts - prev.workouts) / Math.max(1, prev.workouts)) * 100) : 0} />
      <Stat icon="barbell" tone="purple" label={t('Volume')} value={<><AnimatedNumber value={cur.volume} /> <small>{u}</small></>} sub={t('{0} sets', cur.sets) + ' '} delta={R.delta.volume} />
      <Stat icon="figureWalk" tone="green" label={t('Steps a day')} value={<AnimatedNumber value={cur.stepsAvg} />} sub={t('{0} total', n0(cur.stepsTotal)) + ' '} delta={R.delta.steps} />
      <Stat icon="drop" tone="teal" label={t('Water a day')} value={<><AnimatedNumber value={cur.waterAvg} /> <small>{t('ml')}</small></>} sub={t('{0}/{1} days', cur.waterDays, cur.lived) + ' '} delta={R.delta.water} />
      <Stat icon="flame" tone="pink" label={t('Calories a day')} value={cur.foodDays ? <><AnimatedNumber value={cur.kcalAvg} /> <small>{t('kcal')}</small></> : '—'} sub={t('Goal {0}', n0(cur.kGoal)) + ' '} delta={R.delta.kcal} invert />
      <Stat icon="scale" tone="yellow" label={t('Weight change')} value={cur.weightChange == null ? '—' : <>{cur.weightChange > 0 ? '+' : ''}{fmtNum(cur.weightChange)} <small>{u}</small></>} sub={cur.weightLast != null ? t('Now {0} {1}', fmtNum(cur.weightLast), u) : t('No weigh-ins')} />
    </div>

    <div className="card">
      <Segmented value={metric} onChange={setMetric} options={[{ value: 'steps', label: t('Steps') }, { value: 'water', label: t('Water') }, { value: 'food', label: t('Food') }]} />
      <Bars key={metric + p.from} days={cur.days} values={chart.values} goals={chart.goals} color={chart.color} kind={kind} fmt={chart.fmt} unit={chart.unit} />
      {metric === 'steps' && cur.bestStepDay.d && <div className="small muted">{t('Best day: {0} steps on {1}', n0(cur.bestStepDay.v), fmtDate(cur.bestStepDay.d, true))}</div>}
    </div>

    {fc && <div className="card rp-fc tappable" onClick={() => nav('/weight')}>
      <div className="row" style={{ gap: 10 }}>
        <span className="rp-ic" style={{ color: 'var(--yellow)', background: 'color-mix(in srgb, var(--yellow) 16%, transparent)' }}><Icon name="target" /></span>
        <div className="grow">
          <b>{t('Weight forecast')}</b>
          <div className="small">
            {fc.rate == null ? t('Weigh in a few more times to see your trend.')
              : t('Trend: {0} {1} a week', (fc.rate > 0 ? '+' : '') + fmtNum(fc.rate), u)}
          </div>
          {fc.target ? <div className="small" style={{ color: 'var(--yellow)', marginTop: 2 }}>
            {fc.eta ? (fc.eta <= today ? t('Goal reached!') : t('You reach {0} {1} around {2}', fmtNum(fc.target), u, fmtDate(fc.eta, true)))
              : t('Not heading toward your goal of {0} {1} yet.', fmtNum(fc.target), u)}
          </div> : <div className="small muted">{t('Set a goal weight to see when you will reach it.')}</div>}
        </div>
        <Icon name="chevronRight" className="icn-dir" />
      </div>
      {fc.target && fc.last ? <div className="rp-fc-bar"><i style={{ width: Math.max(4, Math.min(100, 100 - Math.abs(fc.left) / Math.max(Math.abs(fc.left), Math.abs(((S.bodyweight || [])[0] || {}).w - fc.target) || 1) * 100)) + '%' }} /></div> : null}
    </div>}

    {R.records.length > 0 && <div className="card">
      <h3 className="row" style={{ gap: 8, marginTop: 0 }}><Icon name="trophy" style={{ color: 'var(--yellow)' }} />{t('Records')}</h3>
      {R.records.slice(-6).reverse().map((r, k) => <div key={k} className="rp-row">
        <span className="capitalize grow">{exName(exOr(r.id))}</span>
        <b>{fmtNum(r.est)} {u}</b><span className="small muted">{t('was {0}', fmtNum(r.prev))}</span>
      </div>)}
    </div>}

    {cur.topEx && <div className="card rp-row">
      <Icon name="star" style={{ color: 'var(--yellow)' }} />
      <span className="grow">{t('Top exercise')}: <b className="capitalize">{exName(exOr(cur.topEx.id))}</b></span>
      <span className="small muted">{n0(cur.topEx.vol)} {u}</span>
    </div>}

    <h2 className="row" style={{ gap: 8 }}><Icon name="sparkles" style={{ color: 'var(--acc)' }} />{t('Smart tips')}</h2>
    {R.tips.map((tip, k) => <div key={k} className="card rp-tipc">
      <span className="rp-ic" style={{ color: `var(--${tip.tone})`, background: `color-mix(in srgb, var(--${tip.tone}) 16%, transparent)` }}><Icon name={tip.icon} /></span>
      <div className="grow">{t(tip.key, ...tip.args.map(a => (typeof a === 'number' ? fmtNum(a) : a === 'kg' || a === 'lb' ? U(a) : a)))}</div>
    </div>)}
  </div>
}
