import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, hasData } from '../store/useStore.js'
import { effectiveRoutine, effectiveRoutineId, streakWeeks, lastBW } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, isoOf, weekId, weekStartOf, startOfWeek, DAYS } from '../lib/format.js'
import { t, dateLocale, U } from '../lib/i18n.js'
import { bwSheet, goalSheet, dayOverrideSheet, calendarSheet, startFlow, loadStarterPlan, bwDeltaColor } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import { normPlan, isLive, liveState, dayRec, noteText, KINDS as PLAN_KINDS } from '../lib/dayPlan.js'
import { useVisibleInterval } from '../lib/battery.js'
import { Button } from '../components/ui.jsx'
import { glyphOf } from '../lib/glyphs.js'
import WaterCard from '../components/WaterCard.jsx'
import FoodCard from '../components/FoodCard.jsx'
import { routineLabel, routineColor, colorVar } from '../lib/routines.js'
import { coachAvailable, hasConsent } from '../lib/coach.js'
import { useCoachStatus } from '../lib/coach-api.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import { usePedometer } from '../store/usePedometer.js'
import { goalOf, stepsOn, strideMeters, distanceKm } from '../lib/stepMetrics.js'
import StepRing from '../components/pedometer/StepRing.jsx'
import LiveClock from '../components/LiveClock.jsx'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import TodayPlan from '../components/TodayPlan.jsx'
import { planFor, planRoutine } from '../lib/dailyPlan.js'
import IdealChip from '../components/IdealChip.jsx'
import HealthCard from '../components/HealthCard.jsx'
import DayNext from '../components/body/DayNext.jsx'
// 8.0
import { ProfileAvatar, profileSheet, profileOf } from '../components/ProfileSheet.jsx'
import { quickSearchSheet } from '../components/QuickSearch.jsx'
import { whatsNewSheet, WHATS_NEW } from '../components/WhatsNew.jsx'
import { zonesSheet } from '../components/HrZonesSheet.jsx'
import { normFasting, fastStatus, hmText } from '../lib/fasting.js'
import { cloudMeta } from '../lib/cloud.js'

// 13.0: the bell — how many reminders are still to ring today (counted in the background, once a
// minute while the screen is on); a tap opens the notification panel (components/NotifPanel.jsx).
function NotifBell({ nav }) {
  const [n, setN] = useState(0)
  const count = () => import('../lib/upcoming.js').then(m => setN(m.upcoming(useStore.getState().S).length)).catch(() => {})
  useEffect(() => {
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 900))
    idle(count)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useVisibleInterval(count, 60000)
  const open = () => import('../components/NotifPanel.jsx').then(m => m.notifPanelSheet(nav))
  return <button className="iconbtn hb-bell" onClick={open} aria-label={n ? t('Notifications: {0} more today', n) : t('Notifications')}>
    <Icon name="bell" />{n > 0 && <b className="hb-badge" aria-hidden="true">{n > 9 ? '9+' : n.toLocaleString(dateLocale())}</b>}
  </button>
}

// 8.0: one row of shortcuts to the tools — a running fast shows its time live.
function QuickTools({ nav }) {
  const S = useStore(s => s.S)
  const fast = fastStatus(normFasting(S.fasting).active)
  const items = [
    ['/dayplan', 'calendar', t('My schedule'), '#5e5ce6'],
    ['/drinks', 'cup', t('Drinks'), '#30d158'],
    ['/foods', 'noodles', t('Food database'), '#ff9f0a'],
    ['/sodas', 'can', t('Soft drinks'), '#e41e2b'],
    ['/nuts', 'nut', t('Nuts & seeds'), '#c68a54'],
    ['/timer', 'timer', t('Timer'), '#ff375f'],
    ['/breathe', 'wind', t('Breathe'), '#30b0c7'],
    ['/fasting', 'moon', fast ? hmText(fast.elapsedMs) : t('Fasting tracker'), '#bf5af2', !!fast],
    ['/recovery', 'heartPulse', t('Recovery'), '#30d158'],
    ['/tools', 'widget', t('All tools'), 'var(--acc)'],
  ]
  return <div className="qt-strip" role="list">
    {items.map(([to, icon, label, c, live], i) => <button key={to} role="listitem" className={'qt' + (live ? ' live' : '')} style={{ '--c': c, '--i': i }} onClick={() => nav(to)}>
      <span className="qt-ic"><Icon name={icon} /></span><span className="qt-l" dir="auto">{label}</span>
    </button>)}
  </div>
}

// 9.0: the day plan while it runs — what is on now, what comes next.
// 10.0: long blocks (school) count down in hours and minutes, and your note shows.
const leftText = m => (m >= 60 ? t('{0} h {1} min', Math.floor(m / 60), m % 60) : t('{0} min', m))
function DayPlanCard({ nav }) {
  const S = useStore(s => s.S)
  const [now, setNow] = useState(() => new Date())
  useVisibleInterval(() => setNow(new Date()), 30000)
  const plan = normPlan(S.planner)
  const iso = todayISO()
  if (!plan || !isLive(plan, iso)) return null
  const live = liveState(plan, dayRec(plan, iso), now)
  const b = live.cur ? live.cur.b : live.next ? live.next.b : null
  if (!b) return null
  const K = PLAN_KINDS[b.k]
  const left = live.cur ? Math.max(0, Math.round(live.cur.left)) : Math.max(1, Math.round(live.next.inMin))
  return <div className="card tappable dp-home" style={{ '--c': K.color }} onClick={() => nav('/dayplan')}>
    <span className="dp-home-ic"><Icon name={b.ic || K.icon} /></span>
    <div className="grow">
      <div className="lbl2">{live.cur ? t('Now') : t('Up next')} · {t('{0} of {1} done', live.done, live.total)}</div>
      <b>{b.n ? t(b.n) : t(K.name)}</b>
      <div className="small muted">{live.cur ? t('{0} left', leftText(left)) : t('In {0}', leftText(left))}</div>
      {b.nt && <div className="small dp-home-note" dir="auto"><Icon name="pencil" />{noteText(b.nt, t)}</div>}
    </div>
    <div className="dp-home-bar"><i style={{ width: Math.round(live.pct * 100) + '%' }} /></div>
    <Icon name="chevronRight" className="chev" />
  </div>
}

// 8.0: a fast in progress, on Home — ring, time, stage.
function FastingCard({ nav }) {
  const S = useStore(s => s.S)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(id) }, [])
  const st = fastStatus(normFasting(S.fasting).active)
  if (!st) return null
  const R = 15.9, C = 2 * Math.PI * R
  return <div className={'card tappable fs-card' + (st.done ? ' done' : '')} onClick={() => nav('/fasting')}>
    <svg className="fs-mini" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r={R} className="fs-ring-bg" />
      <circle cx="18" cy="18" r={R} className="fs-ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - st.pct)} />
    </svg>
    <div className="grow" style={{ minWidth: 0 }}>
      <div className="lbl2">{st.done ? t('Goal reached!') : t('Fasting for')}</div>
      <div className="ttl">{hmText(st.elapsedMs)}</div>
      <div className="small muted">{t(st.stage.name)} · {st.done ? t('Time to break your fast') : t('{0} to go', hmText(st.leftMs))}</div>
    </div>
    <Icon name="chevronRight" className="chev" />
  </div>
}

const greetingFor = (h = new Date().getHours()) =>
  h < 5 ? t('Good evening') : h < 12 ? t('Good morning') : h < 18 ? t('Good afternoon') : t('Good evening')

// Today's steps at a glance, with the live clock; the whole card opens the walking screen.
function StepsCard({ nav }) {
  const S = useStore(s => s.S)
  const pending = usePedometer(s => s.pending)
  const status = usePedometer(s => s.status)
  const speed = usePedometer(s => s.speed)
  const moving = usePedometer(s => s.moving)
  const steps = stepsOn(S, todayISO()) + pending
  const goal = goalOf(S)
  const km = distanceKm(steps, strideMeters(S))
  const tracking = status === 'tracking'
  const pct = Math.min(100, goal ? steps / goal * 100 : 0)
  return <div className={'card tappable steps-card' + (steps >= goal ? ' done' : '')} onClick={() => nav('/walk')}>
    <LiveClock compact />
    <div className="steps-main">
      <StepRing value={steps} goal={goal} size={78} stroke={8} ticks={false} live={tracking && moving}><Icon name="figureWalk" /></StepRing>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="lbl2 row" style={{ gap: 6 }}>{t('Steps today')}{tracking && <span className="walk-dot live" />}{status === 'paused' && <span className="small" style={{ color: 'var(--orange)' }}>{t('Paused')}</span>}</div>
        <div className="steps-n"><AnimatedNumber value={steps} /> <span className="muted">/ {goal.toLocaleString(dateLocale())}</span></div>
        <div className="steps-bar" aria-hidden="true"><i style={{ width: pct.toFixed(1) + '%' }} /></div>
        <div className="small muted">{tracking ? t('{0} km/h', speed.toFixed(1)) + ' · ' : ''}{km.toFixed(2)} {U('km')}{!tracking && !steps ? ' · ' + t('tap to start counting') : ''}</div>
      </div>
      <Icon name="chevronRight" className="chev" />
    </div>
  </div>
}

// A job in flight or a proposal waiting is the only reason the Coach interrupts Home. When it
// has nothing to say it renders nothing at all — and it only polls while Home is on screen.
function CoachCard({ nav }) {
  const S = useStore(s => s.S)
  const { job, pending } = useCoachStatus(hasConsent(S))
  if (!hasConsent(S) || (!job && !pending)) return null
  const ready = !!pending
  return <div className="card" style={ready ? { borderColor: 'var(--acc)' } : null}>
    <div className="today-row" onClick={() => nav(ready ? '/coach/proposal' : '/coach')}>
      <div className="row" style={{ gap: 9, minWidth: 0 }}>
        <span className="lrow-i" style={{ background: ready ? 'var(--acc)' : 'var(--orange)' }}><Icon name="sparkles" /></span>
        <div style={{ minWidth: 0 }}>
          <div className="lbl2">{t('Coach')}</div>
          <div className="ttl">{ready
            ? (pending.kind === 'create'
              ? t('Your plan is ready')
              : t(pending.changes?.length === 1 ? '{0} suggestion for you' : '{0} suggestions for you', pending.changes?.length || 0))
            : t('Reading your training…')}</div>
        </div>
      </div>
      {ready ? <span className="tag acc">{t('Review')}</span> : <Icon name="chevronRight" className="chev" />}
    </div>
  </div>
}

// Home = what to do now + a quick glance. Deep charts & history live in Stats.
export default function Home() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const [weekOffset, setWeekOffset] = useState(0)
  const coachOn = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE })
  // 8.0: "What's new" once after updating; a fresh install just starts on the current version
  const update = useStore(s => s.update)
  useEffect(() => {
    if (S.seenWhatsNew === WHATS_NEW) return
    if (hasData(S)) { const tm = setTimeout(whatsNewSheet, 900); return () => clearTimeout(tm) }
    update(s => { s.seenWhatsNew = WHATS_NEW })
  }, [])                                                      // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date()
  const routine = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null

  const ws = weekStartOf(S)
  const monday = startOfWeek(today, ws); monday.setDate(monday.getDate() + weekOffset * 7)   // first day of the shown week
  const doneDays = new Set(S.workouts.map(w => w.d))
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const iso = isoOf(d)
    const eff = effectiveRoutineId(S, iso), ovr = S.dayPlan[iso] !== undefined, done = doneDays.has(iso)
    const dot = done ? ' done' : ovr && eff ? ' ovr' : eff ? ' plan' : ''
    strip.push(<div key={i} className={'wday' + (iso === todayISO() ? ' today' : '')} onClick={() => dayOverrideSheet(iso)}>
      <div className="lbl">{t(DAYS[d.getDay()])}</div><div className="num">{d.getDate()}</div><div className={'dot' + dot} /></div>)
  }
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const wkLabel = weekOffset === 0 ? t('This week') : `${monday.getDate()} ${monday.toLocaleDateString(dateLocale(), { month: 'short' })} – ${sunday.getDate()} ${sunday.toLocaleDateString(dateLocale(), { month: 'short' })}`

  const wThisWeek = S.workouts.filter(w => weekId(w.d, ws) === weekId(todayISO(), ws)).length
  const plannedPerWeek = Object.keys(S.week).filter(k => S.week[k]).length
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d }))

  // today's session shown right under the week strip
  // 2.9: with no routine today, the row offers today's plan instead of a bare "Rest day".
  const todayPlan = !routine && S.planOn !== false ? planFor(S, todayISO()) : null
  const onToday = () => {
    if (S.active) nav('/workout')
    else if (routine) startFlow(routine.id)
    else if (todayPlan) startFlow(null, planRoutine(todayPlan))
    else dayOverrideSheet(todayISO())
  }

  const name = profileOf(S).name || (user && user.name) || ''
  const photo = MOBILE ? (cloudMeta().account || {}).photo : user && user.google && user.google.picture
  const searchExtra = { zones: zonesSheet, whatsnew: whatsNewSheet, profile: profileSheet }

  return <div className="narrow">
    <div className="hdr home-hdr">
      <ProfileAvatar S={S} photo={photo} size={42} onClick={profileSheet} label={t('Profile')} />
      <div className="grow" style={{ minWidth: 0 }}>
        {/* 8.0: a small line (greeting · date) over a big name */}
        <div className="home-kick">{name ? greetingFor() + ' · ' : ''}{today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h1 dir="auto">{name || 'MAHDI-JYM'}</h1>
      </div>
      <button className="iconbtn" onClick={() => quickSearchSheet(nav, searchExtra)} aria-label={t('Search')}><Icon name="magnifier" /></button>
      <NotifBell nav={nav} />
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}><Icon name="gear" /></button>
    </div>

    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setWeekOffset(w => w - 1)} aria-label={t('Previous week')}><Icon name="chevronLeft" /></button>
        <div className="small muted" style={{ fontWeight: 500 }}>{wkLabel}</div>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setWeekOffset(w => w + 1)} aria-label={t('Next week')}><Icon name="chevronRight" /></button>
      </div>
      <div className="week">{strip}</div>
      <div className="today-row" onClick={onToday}>
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span className="lrow-i" style={{ background: S.active ? 'var(--orange)' : routine ? colorVar(routineColor(routine)) : todayPlan ? colorVar(todayPlan.color) : 'var(--surface-3)' }}>
            <Icon name={S.active ? 'timer' : routine ? glyphOf(routine.emoji) : todayPlan ? todayPlan.icon : 'moon'} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="lbl2">{t('Today')}</div>
            <div className="ttl">{S.active ? t('{0} — in progress', routineLabel(S.active.name)) : routine ? routineLabel(routine.name) : todayPlan ? routineLabel(todayPlan.title) : t('Rest day')}{todayOvr && routine ? ' · ' + t('rescheduled') : ''}</div>
          </div>
        </div>
        {S.active ? <span className="tag" style={{ color: 'var(--orange)', background: 'color-mix(in srgb,var(--orange) 16%,transparent)' }}>{t('Resume')}</span>
          : routine || todayPlan ? <span className="tag acc">{t('Start')}</span>
          : <Icon name="plus" className="chev" />}
      </div>
    </div>

    <QuickTools nav={nav} />
    <DayPlanCard nav={nav} />
    <FastingCard nav={nav} />

    {S.planOn !== false && <TodayPlan />}
    {S.planOn !== false && <DayNext />}

    {coachOn && <CoachCard nav={nav} />}

    {!S.routines.length && !S.active && (
      <div className="card">
        <div className="row" style={{ gap: 10, marginBottom: 6 }}>
          <span className="lrow-i"><Icon name="sparkles" /></span>
          <div className="big" style={{ fontSize: 22 }}>{t('Welcome!')}</div>
        </div>
        <div className="muted small" style={{ marginBottom: 12 }}>{t('Set up your weekly routine to get going — or load a ready-made Push / Pull / Legs plan.')}</div>
        {coachOn && <>
          <Button variant="primary" icon="sparkles" onClick={() => nav(hasConsent(S) ? '/coach/intake' : '/coach')}>{t('Let the Coach build it')}</Button>
          <div style={{ height: 8 }} />
        </>}
        <Button variant={coachOn ? 'plain' : 'primary'} icon="sparkles" onClick={loadStarterPlan}>{t('Load starter plan (PPL)')}</Button>
        <div style={{ height: 8 }} /><Button onClick={() => nav('/plan')}>{t('Build my own plan')}</Button>
      </div>
    )}

    <StepsCard nav={nav} />

    {S.waterOn !== false && <WaterCard />}

    {S.foodOn !== false && <FoodCard />}

    <div className="card">
      <div className="row between" style={{ marginBottom: 6 }}>
        <button className="h2link" onClick={() => nav('/weight')}><h2 style={{ margin: 0 }}>{t('Body weight')}</h2><Icon name="chevronRight" /></button>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--yellow)' } : undefined} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
          <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
        </div>
      </div>
      {bw ? <>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <div className="big">{fmtNum(bw.w)} <span className="muted" style={{ fontSize: '1rem' }}>{U(S.unit)}</span></div>
          {/* only when it actually moved — an unchanged weight used to read as "− 0" */}
          {!!delta && (
            <span className="small row" style={{ gap: 2, fontWeight: 500, color: bwDeltaColor(delta, bw.w) }}>
              <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 12 }} />
              {fmtNum(Math.abs(delta))}
            </span>
          )}
          <span className="dim small" style={{ marginLeft: 'auto' }}>{fmtDate(bw.d, true)}</span>
        </div>
        {S.targetW && (
          <div className="small row" style={{ color: 'var(--yellow)', marginTop: 4, gap: 5 }}>
            <Icon name="target" style={{ fontSize: 13 }} />
            <span>{t('Goal')} {fmtNum(S.targetW)} {U(S.unit)} · {Math.abs(S.targetW - bw.w) < 0.05 ? t('reached!') : t(S.targetW > bw.w ? '{0} to gain' : '{0} to lose', fmtNum(Math.abs(S.targetW - bw.w)) + ' ' + U(S.unit))}</span>
          </div>
        )}
        <div className="chart" style={{ marginTop: 8 }}><LineChart points={bwPoints} h={130} unit={S.unit} goal={S.targetW} /></div>
      </> : <div className="muted small">{t("No entries yet — log your weight to start the curve. It's also asked before every workout.")}</div>}
      <IdealChip onOpen={() => nav('/ideal')} />
    </div>

    <HealthCard />

    <div className="card tappable" style={{ cursor: 'pointer' }} onClick={() => calendarSheet()}>
      <div className="row between">
        <div>
          <div className="row" style={{ gap: 7, fontSize: 22, fontWeight: 600, letterSpacing: '-.021em' }}>
            <Icon name="flame" style={{ color: 'var(--orange)' }} />
            {t('{0} week streak', streakWeeks(S))}
          </div>
          <div className="muted small" style={{ marginTop: 2 }}>{wThisWeek}{plannedPerWeek ? ' / ' + plannedPerWeek : ''} {t('this week')} · {t(S.workouts.length === 1 ? '{0} workout total' : '{0} workouts total', S.workouts.length)}</div>
        </div>
        <Icon name="calendar" className="chev" style={{ fontSize: 20 }} />
      </div>
    </div>
  </div>
}
