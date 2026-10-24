import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { usePedometer, weightForCalories } from '../store/usePedometer.js'
import { todayISO, fmtDate } from '../lib/format.js'
import { t, dateLocale, U } from '../lib/i18n.js'
import {
  goalOf, stepsOn, activeMsOn, strideMeters, distanceKm, caloriesFor, walkPrefs,
  weekSummary, stepStreak, bestDay, hourlyOn, DEFAULT_STRIDE_CM,
} from '../lib/stepMetrics.js'
import { useNow, msToMidnight, stepsPerHourNeeded, motivationTier, fmtDuration } from '../lib/liveClock.js'
import { MOBILE } from '../lib/mobile.js'
import { hasStepService, call as serviceCall } from '../lib/stepService.js'
import { openAppSettings } from '../lib/permissions.js'
import StepRing from '../components/pedometer/StepRing.jsx'
import StepChart from '../components/pedometer/StepChart.jsx'
import HourChart from '../components/pedometer/HourChart.jsx'
import { stepGoalSheet } from '../components/pedometer/StepGoalSetter.jsx'
import LiveClock from '../components/LiveClock.jsx'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Switch, Button, BackButton } from '../components/ui.jsx'
import CommitNumber from '../components/CommitNumber.jsx'
import CelebrationSection from '../components/pedometer/CelebrationSection.jsx'
import { stepResetSheet } from '../components/pedometer/StepReset.jsx'
import { WalkSession, Achievements } from '../components/pedometer/WalkExtras.jsx'
import JourneyCard, { StepMonth } from '../components/pedometer/JourneyCard.jsx'

const fmtInt = n => Math.round(n).toLocaleString(dateLocale())

const MOTTOS = [
  () => t('Every journey starts with one step.'),
  () => t('Good start — keep moving!'),
  () => t('Halfway there — you’ve got this.'),
  left => t('Almost there — {0} steps left!', fmtInt(left)),
  left => t('Just {0} more steps!', fmtInt(left)),
  () => t('Goal reached — every extra step is a bonus!'),
]

function StatusLine({ status, source }) {
  const map = {
    tracking: [source === 'service' ? t('Counting in the background — also with the screen locked.')
      : source === 'native' ? t('Counting with your phone’s step sensor.')
        : t('Counting with the motion sensor — keep MAHDI-JYM open and on screen.'), 'var(--acc)'],
    starting: [t('Starting…'), 'var(--label-2)'],
    paused: [t('Paused — your steps so far are kept.'), 'var(--orange)'],
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

// Android app only: what keeps the counter alive with the screen off.
function BackgroundSection() {
  const [svc, setSvc] = useState(false)
  const [battery, setBattery] = useState(null)
  const refresh = async () => {
    const ok = await hasStepService()
    setSvc(ok)
    if (ok) { const r = await serviceCall('getBatteryStatus'); setBattery(r ? !!r.ignoring : null) }
  }
  useEffect(() => {
    refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  if (!svc) return null
  return <Section title={t('Lock screen & background')}
    footer={t('The live step notification shows your steps, a seconds-ticking clock, walking time and the countdown to midnight on the lock screen. Some phones (Xiaomi, Huawei, Samsung…) also need MAHDI-JYM allowed to run in the background in their battery settings.')}>
    <Row icon="battery" iconTint="var(--green)" title={t('Keep counting in the background')}
      subtitle={battery ? t('Allowed — the phone won’t stop the counter.') : t('Exempt MAHDI-JYM from battery optimisation so the phone never stops the counter.')}
      value={battery ? '✓' : null} accessory={battery ? 'none' : 'chevron'}
      onClick={battery ? undefined : () => serviceCall('requestBatteryExemption')} />
    <Row icon="bell" iconTint="var(--red)" title={t('Notification settings')} subtitle={t('Show the step counter on the lock screen, with sound for milestones.')}
      accessory="chevron" onClick={() => serviceCall('openNotificationSettings')} />
    <Row icon="widget" iconTint="var(--indigo, var(--blue))" title={t('Home-screen widget')}
      subtitle={t('Long-press your home screen → Widgets → MAHDI-JYM to add the live step counter.')} />
  </Section>
}

export default function Walking() {
  const S = useStore(s => s.S)
  const { update } = useStore()
  const status = usePedometer(s => s.status)
  const source = usePedometer(s => s.source)
  const pending = usePedometer(s => s.pending)
  const speed = usePedometer(s => s.speed)
  const moving = usePedometer(s => s.moving)
  const liveActive = usePedometer(s => s.liveActiveMs)
  const lastStepAt = usePedometer(s => s.lastStepAt)
  const { start, stop, pause, prefsChanged } = usePedometer()
  const now = useNow(1000)

  const today = todayISO()
  const steps = stepsOn(S, today) + pending
  const goal = goalOf(S)
  const stride = strideMeters(S)
  const km = distanceKm(steps, stride)
  const kcal = caloriesFor(steps, { strideM: stride, ...weightForCalories(S) })
  const active = Math.max(activeMsOn(S, today), source === 'service' ? liveActive : 0)
  const pct = Math.min(999, Math.floor(steps / goal * 100))
  const week = weekSummary(S, today)
  const streak = stepStreak(S, today)
  const best = bestDay(S)
  const prefs = walkPrefs(S)
  const tracking = status === 'tracking'
  const paused = status === 'paused'
  const walkingNow = tracking && (moving || (lastStepAt && now - lastStepAt < 8000))
  const left = Math.max(0, goal - steps)
  const perHour = stepsPerHourNeeded(steps, goal, msToMidnight(now))
  const tier = motivationTier(steps, goal)
  const hours = hourlyOn(S, today).slice()
  if (pending > 0) hours[now.getHours()] += pending
  const setPref = (k, v) => { update(s => { s.walk = { ...walkPrefs(s), [k]: v } }); prefsChanged(k) }

  return <div className="narrow">
    <div className="hdr">
      <BackButton fallback="/home" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Walking')}</h1></div>
    </div>

    <LiveClock>
      {tracking && <span className="live-badge"><span className="walk-dot live" /> {walkingNow ? t('Walking') : t('Live')}</span>}
      {paused && <span className="live-badge paused">{t('Paused')}</span>}
    </LiveClock>

    <div className={'card walk-hero' + (walkingNow ? ' walking' : '')}>
      <StepRing value={steps} goal={goal} size={236} stroke={16} live={walkingNow}>
        <Icon name="figureWalk" className={'walk-ic' + (walkingNow ? ' stepping' : '')} />
        <AnimatedNumber className="walk-num" value={steps} />
        <button className="walk-goal" onClick={stepGoalSheet}>{t('of {0}', fmtInt(goal))} <Icon name="pencil" /></button>
        <div className="walk-pct">{pct}%</div>
      </StepRing>
      <div className={'walk-motto tier' + tier}>{MOTTOS[tier](left)}</div>
      {left > 0 && <div className="walk-need small">{t('To reach your goal: {0} steps per hour until midnight', fmtInt(perHour))}</div>}
      <StatusLine status={status} source={source} />
      {/* 2.10: the 2.8 layout back, refined — one wide start button; while counting, Pause and
          Stop side by side with the same size; "reset" as a quiet chip underneath. */}
      <div className={'walk-ctl' + (tracking ? ' on' : '')} role="group" aria-label={t('Step counter')}>
        {tracking
          ? <div className="walk-ctl-row">
            {source === 'service' && <button className="wbtn wbtn-soft" onClick={pause}>
              <span className="wbtn-ic"><Icon name="pause" /></span><span>{t('Pause')}</span>
            </button>}
            <button className="wbtn wbtn-stop" onClick={stop}>
              <span className="wbtn-ic"><Icon name={source === 'service' ? 'stop' : 'pause'} /></span><span>{t('Stop counting')}</span>
            </button>
          </div>
          : <div className="walk-ctl-row">
            <button className="wbtn wbtn-go" disabled={status === 'starting'} onClick={() => start({ interactive: true })}>
              <span className="wbtn-ic"><Icon name="play" /></span><span>{paused ? t('Resume counting') : t('Start counting')}</span>
            </button>
            {paused && <button className="wbtn wbtn-stop wbtn-sq" onClick={stop} aria-label={t('Stop counting')}>
              <span className="wbtn-ic"><Icon name="stop" /></span>
            </button>}
          </div>}
        <button className="walk-reset" onClick={stepResetSheet}><Icon name="reset" /> {t('Reset step counter')}</button>
      </div>
      {status === 'denied' && MOBILE && <div className="walk-btns"><Button icon="gear" onClick={() => openAppSettings()}>{t('Open settings')}</Button></div>}
    </div>

    <div className="tiles">
      <div className="tile"><div className="l"><Icon name="speedometer" /> {t('Speed')}</div><div className="v">{tracking ? speed.toFixed(1) : '0.0'} <span className="u">{U('km/h')}</span></div></div>
      <div className="tile"><div className="l"><Icon name="route" /> {t('Distance')}</div><div className="v">{km.toFixed(2)} <span className="u">{U('km')}</span></div></div>
      <div className="tile"><div className="l"><Icon name="flame" /> {t('Calories')}</div><div className="v"><AnimatedNumber value={kcal} /> <span className="u">{U('kcal')}</span></div></div>
      <div className="tile"><div className="l"><Icon name="clock" /> {t('Active time')}</div><div className="v mono" dir="ltr">{fmtDuration(active, { alwaysHours: true })}</div></div>
    </div>

    <WalkSession now={now} stride={stride} tracking={tracking} speed={speed} moving={walkingNow} />

    <div className="card">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>{t('Today by hour')}</h2>
        <span className="small muted">{fmtInt(steps)}</span>
      </div>
      <HourChart hours={hours} now={now} />
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

    {/* 11.0: all your steps as a walk across Iraq, and the last five weeks at a glance */}
    <JourneyCard S={S} />
    <StepMonth S={S} today={today} />

    <Achievements S={S} today={today} />

    <Section title={t('Goal & counter')}
      footer={source === 'service' || (MOBILE && status === 'idle')
        ? t('On Android the counter runs as a background service: it keeps counting with the app closed and the phone locked, and shows your steps live in the notification and on the lock screen.')
        : MOBILE
          ? t('Android keeps counting in its step sensor while the app sleeps; the steps arrive the next time MAHDI-JYM reads it. On iPhone, today’s total is filled in from the motion history.')
          : t('Browsers only deliver motion data while the page is open and on screen. For all-day counting, install the Android app.')}>
      <Row icon="target" iconTint="var(--yellow)" title={t('Daily step goal')} value={fmtInt(goal)} accessory="chevron" onClick={stepGoalSheet} />
      <Row icon="ruler" iconTint="var(--teal)" title={t('Stride length')} subtitle={prefs.strideCm ? null : t('Estimated: {0} cm', Math.round(stride * 100))}>
        <CommitNumber className="rowfield" value={prefs.strideCm} placeholder={String(Math.round(stride * 100) || DEFAULT_STRIDE_CM)}
          onCommit={v => { update(s => { s.walk = { ...walkPrefs(s), strideCm: v && v >= 30 && v <= 150 ? v : null } }); prefsChanged('stride') }} aria-label={t('Stride length')} />
        <span className="muted small">{U('cm')}</span>
      </Row>
      <Row icon="bell" iconTint="var(--red)" title={t('Step notification')} subtitle={t('Stays in your notifications while counting, updated as you walk.')}>
        <Switch checked={prefs.notify} onChange={v => setPref('notify', v)} />
      </Row>
      <Row icon="vibrate" iconTint="var(--purple)" title={t('Vibrate every 1,000 steps')}>
        <Switch checked={prefs.haptics} onChange={v => setPref('haptics', v)} />
      </Row>
      <Row icon="bell" iconTint="var(--orange)" title={t('Milestone sound')} subtitle={t('Plays a sound with every 1,000-step alert.')}>
        <Switch checked={prefs.alertSound} onChange={v => setPref('alertSound', v)} />
      </Row>
      {MOBILE && <Row icon="speaker" iconTint="var(--blue)" title={t('Voice coach')} subtitle={t('Speaks every 1,000 steps and when you reach your goal.')}>
        <Switch checked={prefs.voice} onChange={v => setPref('voice', v)} />
      </Row>}
      <Row icon="location" iconTint="var(--blue)" title={t('GPS speed')} subtitle={t('More accurate outdoors. Your location stays on this device.')}>
        <Switch checked={prefs.gps} onChange={v => setPref('gps', v)} />
      </Row>
    </Section>

    <CelebrationSection prefs={prefs} setPref={setPref} />

    {MOBILE && <BackgroundSection />}
  </div>
}
