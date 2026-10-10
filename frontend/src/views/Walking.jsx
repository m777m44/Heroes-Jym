import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { usePedometer, weightForCalories } from '../store/usePedometer.js'
import { todayISO, fmtDate } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import {
  goalOf, stepsOn, activeMsOn, strideMeters, distanceKm, caloriesFor, walkPrefs,
  weekSummary, stepStreak, bestDay, DEFAULT_STRIDE_CM,
} from '../lib/stepMetrics.js'
import { MOBILE } from '../lib/mobile.js'
import StepRing from '../components/pedometer/StepRing.jsx'
import StepChart from '../components/pedometer/StepChart.jsx'
import { stepGoalSheet } from '../components/pedometer/StepGoalSetter.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Switch, Button } from '../components/ui.jsx'
import CommitNumber from '../components/CommitNumber.jsx'

const fmtInt = n => Math.round(n).toLocaleString(dateLocale())
const fmtMin = ms => {
  const m = Math.floor(ms / 60000)
  return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'
}

function StatusLine({ status, source }) {
  const map = {
    tracking: [source === 'native' ? t('Counting with your phone’s step sensor.') : t('Counting with the motion sensor — keep MAHDI-JYM open and on screen.'), 'var(--acc)'],
    starting: [t('Starting…'), 'var(--label-2)'],
    paused: [t('Paused — tap Start to keep counting.'), 'var(--orange)'],
    denied: [t('Motion access was denied. Allow it in your system settings, then try again.'), 'var(--red)'],
    unsupported: [t('This device has no step sensor or accelerometer we can read.'), 'var(--red)'],
    error: [t('The step counter could not start. Try again.'), 'var(--red)'],
    idle: [MOBILE ? t('Uses your phone’s built-in step sensor — light on battery.') : t('Counts steps with your phone’s motion sensor while this page is open.'), 'var(--label-2)'],
  }
  const [txt, color] = map[status] || map.idle
  return <div className="small row walk-status" style={{ color }}>
    <span className={'walk-dot' + (status === 'tracking' ? ' live' : '')} style={{ background: color }} />
    <span>{txt}</span>
  </div>
}

export default function Walking() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const { update } = useStore()
  const status = usePedometer(s => s.status)
  const source = usePedometer(s => s.source)
  const pending = usePedometer(s => s.pending)
  const speed = usePedometer(s => s.speed)
  const { start, stop, prefsChanged } = usePedometer()

  const today = todayISO()
  const steps = stepsOn(S, today) + pending
  const goal = goalOf(S)
  const stride = strideMeters(S)
  const km = distanceKm(steps, stride)
  const kcal = caloriesFor(steps, { strideM: stride, ...weightForCalories(S) })
  const active = activeMsOn(S, today)
  const pct = Math.min(999, Math.floor(steps / goal * 100))
  const week = weekSummary(S, today)
  const streak = stepStreak(S, today)
  const best = bestDay(S)
  const prefs = walkPrefs(S)
  const tracking = status === 'tracking'
  const setPref = (k, v) => { update(s => { s.walk = { ...walkPrefs(s), [k]: v } }); prefsChanged(k) }

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Walking')}</h1></div>
    </div>

    <div className="card walk-hero">
      <StepRing value={steps} goal={goal} size={212}>
        <Icon name="figureWalk" className="walk-ic" />
        <div className="walk-num">{fmtInt(steps)}</div>
        <button className="walk-goal" onClick={stepGoalSheet}>{t('of {0}', fmtInt(goal))} <Icon name="pencil" /></button>
        <div className="walk-pct">{pct}%</div>
      </StepRing>
      <StatusLine status={status} source={source} />
      <div style={{ width: '100%' }}>
        {tracking
          ? <Button icon="pause" onClick={stop}>{t('Stop counting')}</Button>
          : <Button variant="primary" icon="play" disabled={status === 'starting'} onClick={() => start({ interactive: true })}>{status === 'paused' ? t('Resume counting') : t('Start counting')}</Button>}
      </div>
    </div>

    <div className="tiles">
      <div className="tile"><div className="l"><Icon name="speedometer" /> {t('Speed')}</div><div className="v">{tracking ? speed.toFixed(1) : '0.0'} <span className="u">km/h</span></div></div>
      <div className="tile"><div className="l"><Icon name="route" /> {t('Distance')}</div><div className="v">{km.toFixed(2)} <span className="u">km</span></div></div>
      <div className="tile"><div className="l"><Icon name="flame" /> {t('Calories')}</div><div className="v">{fmtInt(kcal)} <span className="u">kcal</span></div></div>
      <div className="tile"><div className="l"><Icon name="clock" /> {t('Active time')}</div><div className="v" style={{ fontSize: 22 }}>{fmtMin(active)}</div></div>
    </div>

    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{t('Last 7 days')}</h2>
        <span className="small row" style={{ gap: 5, color: streak ? 'var(--orange)' : 'var(--label-3)', fontWeight: 500 }}>
          <Icon name="flame" /> {t(streak === 1 ? '{0} day streak' : '{0} days streak', streak)}
        </span>
      </div>
      <StepChart days={week.days} goal={goal} today={today} />
      <div className="walk-week">
        <div><span className="l">{t('Total')}</span><b>{fmtInt(week.total)}</b></div>
        <div><span className="l">{t('Daily average')}</span><b>{fmtInt(week.avg)}</b></div>
        <div><span className="l">{t('Goal met')}</span><b>{week.hit} / 7</b></div>
      </div>
      {best && <div className="dim small" style={{ marginTop: 8 }}>{t('Best day: {0} steps on {1}', fmtInt(best.n), fmtDate(best.d, true))}</div>}
    </div>

    <Section title={t('Goal & counter')}
      footer={MOBILE
        ? t('Android keeps counting in its step sensor while the app sleeps; the steps arrive the next time MAHDI-JYM reads it. On iPhone, today’s total is filled in from the motion history.')
        : t('Browsers only deliver motion data while the page is open and on screen. For all-day counting, install the Android app.')}>
      <Row icon="target" iconTint="var(--yellow)" title={t('Daily step goal')} value={fmtInt(goal)} accessory="chevron" onClick={stepGoalSheet} />
      <Row icon="ruler" iconTint="var(--teal)" title={t('Stride length')} subtitle={prefs.strideCm ? null : t('Estimated: {0} cm', Math.round(stride * 100))}>
        <CommitNumber className="rowfield" value={prefs.strideCm} placeholder={String(Math.round(stride * 100) || DEFAULT_STRIDE_CM)}
          onCommit={v => update(s => { s.walk = { ...walkPrefs(s), strideCm: v && v >= 30 && v <= 150 ? v : null } })} aria-label={t('Stride length')} />
        <span className="muted small">cm</span>
      </Row>
      <Row icon="bell" iconTint="var(--red)" title={t('Step notification')} subtitle={t('Stays in your notifications while counting, updated as you walk.')}>
        <Switch checked={prefs.notify} onChange={v => setPref('notify', v)} />
      </Row>
      <Row icon="vibrate" iconTint="var(--purple)" title={t('Vibrate every 1,000 steps')}>
        <Switch checked={prefs.haptics} onChange={v => setPref('haptics', v)} />
      </Row>
      <Row icon="sparkles" iconTint="var(--pink)" title={t('Celebrations')} subtitle={t('A 5-second cheer at every 1,000 steps and at your goal.')}>
        <Switch checked={prefs.celebrate} onChange={v => setPref('celebrate', v)} />
      </Row>
      <Row icon="location" iconTint="var(--blue)" title={t('GPS speed')} subtitle={t('More accurate outdoors. Your location stays on this device.')}>
        <Switch checked={prefs.gps} onChange={v => setPref('gps', v)} />
      </Row>
    </Section>
  </div>
}
