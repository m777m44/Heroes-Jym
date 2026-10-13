import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { nav } from '../lib/nav.js'
import { MOBILE } from '../lib/mobile.js'
import {
  CONTAINERS, CONTAINER_NAME, CONTAINER_COUNT, GOALS_ML, REMIND_EVERY, containerOf, waterGoalParts, mlOn, waterDays,
  waterStreak, waterAverage, countIn, recommendedMl, waterRemindPrefs, nextReminder, MOVES, waterPanelOn, fixedGoalMlOf,
  ML_PER_1000_STEPS, ML_PER_WORKOUT_MIN, STEP_FREE, waterSchedule,
} from '../lib/water.js'
import { useNow } from '../lib/liveClock.js'
import { bodyKg, testWaterReminder } from '../lib/waterSync.js'
import { goalOf, stepsOn } from '../lib/stepMetrics.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, SelectRow, Switch, Button } from '../components/ui.jsx'
import { ContainerIcon, Vessel, drink, undoLast, useWaterUndo, fmtMl } from '../components/water/WaterParts.jsx'

const everyLabel = m => m % 60 === 0 ? t('Every {0} h', m / 60) : t('Every {0} min', m)

// Water & reminders (2.5): the glass for today, what you drink from, the goal (with a
// recommendation from your body weight), the reminders — hours, interval, a short exercise
// with each — and the last two weeks.
export default function Water() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const canUndo = useWaterUndo(s => s.stack.length > 0)
  const [busy, setBusy] = useState(false)
  const iso = todayISO()
  const parts = waterGoalParts(S, iso)
  const goal = parts.total
  const ml = mlOn(S, iso)
  const unit = containerOf(S)
  const rp = waterRemindPrefs(S)
  const days = waterDays(S, iso, 14)
  const max = Math.max(goal, ...days.map(d => d.ml), 1)
  const kg = bodyKg(S)
  const rec = recommendedMl(kg)
  const next = rp.on ? nextReminder(rp, new Date()) : null
  const time = d => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
  const setRemind = patch => update(s => { s.waterRemind = { ...waterRemindPrefs(s), ...patch } })
  const best = Math.max(0, ...days.map(d => d.ml))
  const now = useNow(60000)
  const plan = waterSchedule(rp, goal, ml, now)
  const schedRef = useRef(null)
  const nextKey = (plan.slots.find(x => x.state === 'next') || {}).target
  // Keep the upcoming slot in view (centred) — works the same in left-to-right and Arabic.
  useEffect(() => {
    const c = schedRef.current, el = c && c.querySelector('.wsched-i.next')
    if (!c || !el || !c.scrollBy) return
    const cr = c.getBoundingClientRect(), er = el.getBoundingClientRect()
    c.scrollBy({ left: er.left - cr.left - (cr.width - er.width) / 2 })
  }, [nextKey])
  const hhmm = v => { const [h, m] = v.split(':').map(Number); return time(new Date(2000, 0, 1, h, m)) }

  const enableReminders = async v => {
    setRemind({ on: v })
    if (v && !MOBILE && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission() } catch { /* toast fallback */ }
    }
  }
  const test = async () => {
    setBusy(true)
    const r = await testWaterReminder(useStore.getState().S)
    setBusy(false)
    if (typeof r === 'string' && r.startsWith('toast:')) useUI.getState().toast(r.slice(6))
    else if (r === 'denied') useUI.getState().toast(t('Notifications are blocked for this app in the system settings.'))
  }

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" className="icn-dir" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Water')}</h1></div>
      <Button size="sm" icon="reset" onClick={undoLast} disabled={!canUndo}>{t('Undo')}</Button>
    </div>

    <div className="card whydro">
      <Vessel pct={ml / goal} size={120} label={t('{0} of {1} ml', fmtMl(ml), fmtMl(goal))} />
      <div className="big">{fmtMl(ml)}<span className="muted" style={{ fontSize: '1rem' }}> / {fmtMl(goal)} {t('ml')}</span></div>
      <div className="small muted">
        {t(CONTAINER_COUNT[unit.key], countIn(ml, unit).toLocaleString(dateLocale()))} · {Math.min(999, Math.round(ml / goal * 100))}%
        {next && ml < goal ? <> · <Icon name="bell" /> {t('Next reminder {0}', time(next))}</> : null}
      </div>
      <div className="water-chips" style={{ width: '100%' }}>
        {CONTAINERS.map(c => (
          <button key={c.key} className={'wchip' + (c.key === unit.key ? ' sel' : '')} onClick={() => drink(c)}>
            <ContainerIcon kind={c.key} />
            <span className="wchip-n">{t(CONTAINER_NAME[c.key])}</span>
            <span className="wchip-ml">+{fmtMl(c.ml)}</span>
          </button>
        ))}
      </div>
    </div>

    <Section title={t('I usually drink from')} footer={t('The reminder’s “Drank it” button and the “+” on the step notification add one of these.')}>
      <div className="wcont" style={{ padding: 12 }}>
        {CONTAINERS.map(c => (
          <button key={c.key} className={c.key === unit.key ? 'sel' : ''} aria-pressed={c.key === unit.key}
            onClick={() => update(s => { s.waterUnit = c.key })}>
            <ContainerIcon kind={c.key} />
            <b>{t(CONTAINER_NAME[c.key])}</b>
            <small>{fmtMl(c.ml)} {t('ml')}</small>
          </button>
        ))}
      </div>
    </Section>

    <Section title={t('Daily goal')} footer={parts.auto
      ? t('{0} ml per 1,000 steps after the first {1}, and {2} ml per minute of training. Updates through the day — also in the notification.', ML_PER_1000_STEPS, fmtMl(STEP_FREE), ML_PER_WORKOUT_MIN)
      : kg
      ? t('About 33 ml per kg of body weight — {0} ml for {1} kg. More on hot days and training days.', fmtMl(rec), Math.round(kg))
      : t('Log your body weight for a personal recommendation (about 33 ml per kg).')}>
      <Row icon="sparkles" iconTint="var(--teal)" title={t('Automatic goal')} subtitle={t('From your body weight, today’s steps and workouts')}>
        <Switch checked={parts.auto} onChange={v => update(s => { s.waterAuto = v; if (!v && !s.waterGoalMl) s.waterGoalMl = goal })} />
      </Row>
      {parts.auto ? <GoalBreakdown parts={parts} kg={kg} unit={unit} /> : <>
      <SelectRow icon="target" iconTint="var(--blue)" title={t('Daily water goal')} sheetTitle={t('Daily water goal')}
        value={fixedGoalMlOf(S)}
        options={[...new Set([...GOALS_ML, goal, rec])].sort((a, b) => a - b).map(g => ({ value: g, label: `${fmtMl(g)} ${t('ml')}` + (g === rec && kg ? ' · ' + t('Recommended') : '') }))}
        onChange={v => update(s => { s.waterGoalMl = v })} />
      {kg && fixedGoalMlOf(S) !== rec && <Row icon="sparkles" iconTint="var(--teal)" title={t('Use the recommendation')} value={`${fmtMl(rec)} ${t('ml')}`}
        accessory="chevron" onClick={() => update(s => { s.waterGoalMl = rec })} />}
      </>}
    </Section>

    {MOBILE && <Section title={t('Water in the notifications')}
      footer={t('Tap a glass, cup, can or bottle in the notification to add it, Undo to take the last one back, Edit to open this screen — all with the app closed.')}>
      <Row icon="bell" iconTint="var(--blue)" title={t('Water panel in the notifications')} subtitle={t('In one bar with the step counter — tidy and always at hand')}>
        <Switch checked={waterPanelOn(S)} onChange={v => update(s => { s.waterPanel = v })} />
      </Row>
      <NotifPreview S={S} ml={ml} goal={goal} unit={unit} />
    </Section>}

    {rp.on && plan.slots.length > 0 && <Section title={t("Today's schedule")}
      footer={t('How much you should have drunk by each reminder to reach {0} ml by {1}.', fmtMl(goal), hhmm(rp.to))}>
      <div className="wsched-head">
        {ml >= goal ? <span className="wsched-st ok"><Icon name="checkCircle" />{t('Goal reached')}</span>
          : plan.behind > 0 ? <span className="wsched-st late"><Icon name="timer" />{t('{0} ml behind', fmtMl(plan.behind))}</span>
          : <span className="wsched-st ok"><Icon name="check" />{t('On track')}</span>}
        {plan.behind > 0 && ml < goal && <button className="wsched-catch" onClick={() => drink(unit)}>
          <ContainerIcon kind={unit.key} />+{fmtMl(unit.ml)}</button>}
      </div>
      <div className="wsched" role="list" ref={schedRef}>
        {plan.slots.map(sl => <div key={sl.at.getTime()} role="listitem" className={'wsched-i ' + sl.state}>
          <span className="wsched-t">{time(sl.at)}</span>
          <span className="wsched-d"><Icon name={sl.state === 'done' ? 'check' : 'drop'} /></span>
          <span className="wsched-ml">{fmtMl(sl.target)}</span>
        </div>)}
      </div>
    </Section>}

    <Section title={t('Reminders')}
      footer={MOBILE
        ? t('Arrive with the app closed, with today’s water and steps and a short exercise. Skipped once the goal is reached.')
        : t('In the browser, reminders appear while MAHDI-JYM is open. Install the Android app for reminders with the app closed.')}>
      <Row icon="bell" iconTint="var(--blue)" title={t('Remind me to drink')} subtitle={next ? t('Next reminder {0}', time(next)) : null}>
        <Switch checked={rp.on} onChange={enableReminders} />
      </Row>
      {rp.on && <>
        <SelectRow icon="timer" iconTint="var(--purple)" title={t('How often')} sheetTitle={t('How often')} value={rp.every}
          options={REMIND_EVERY.map(m => ({ value: m, label: everyLabel(m) }))} onChange={v => setRemind({ every: v })} />
        <Row icon="sun" iconTint="var(--yellow)" title={t('From')}>
          <input type="time" className="timefield" value={rp.from} onChange={e => e.target.value && setRemind({ from: e.target.value })} aria-label={t('From')} />
        </Row>
        <Row icon="moon" iconTint="var(--indigo, var(--purple))" title={t('Until')}>
          <input type="time" className="timefield" value={rp.to} onChange={e => e.target.value && setRemind({ to: e.target.value })} aria-label={t('Until')} />
        </Row>
        <Row icon="figureStrength" iconTint="var(--orange)" title={t('Suggest an exercise')}
          subtitle={t('A short walk after sitting still or when behind on steps, else a quick move like “{0}”.', t(MOVES[0]))}>
          <Switch checked={rp.move} onChange={v => setRemind({ move: v })} />
        </Row>
        {MOBILE && <Row icon="vibrate" iconTint="var(--pink)" title={t('Vibrate')}
          subtitle={t('A gentle “drip, drip, drop” buzz with each reminder — also when the sound is off.')}>
          <Switch checked={rp.vibrate} onChange={v => setRemind({ vibrate: v })} />
        </Row>}
        <Row icon="play" iconTint="var(--teal)" title={t('Send a test reminder')} accessory="chevron" onClick={busy ? undefined : test} />
      </>}
    </Section>

    <Section title={t('Last 14 days')}>
      <div style={{ padding: '12px 14px 14px' }}>
        <div className="wbars" aria-hidden="true">
          {days.map(d => <div key={d.iso} className={'b' + (d.iso === iso ? ' today' : '')}>
            <i style={{ height: Math.max(3, Math.round(d.ml / max * 100)) + '%', background: d.ml >= waterGoalParts(S, d.iso).total ? 'linear-gradient(180deg,#64d2ff,var(--blue))' : 'color-mix(in srgb,var(--blue) 40%,transparent)' }} />
            <span>{new Date(d.iso + 'T12:00:00').getDate().toLocaleString(dateLocale())}</span>
          </div>)}
        </div>
        <div className="wstats">
          <div><b>{fmtMl(waterAverage(S, iso, 7))}</b><span>{t('7-day average')} ({t('ml')})</span></div>
          <div><b>{waterStreak(S, iso).toLocaleString(dateLocale())}</b><span>{t('Day streak')}</span></div>
          <div><b>{fmtMl(best)}</b><span>{t('Best day')} ({t('ml')})</span></div>
        </div>
      </div>
    </Section>

    <Section title={t('Settings')}>
      <Row icon="drop" iconTint="var(--blue)" title={t('Water tracker')} subtitle={t('The Water card on Home')}>
        <Switch checked={S.waterOn !== false} onChange={v => update(s => { s.waterOn = v })} />
      </Row>
      <Row icon="sparkles" iconTint="var(--pink)" title={t('Celebrations')} subtitle={t('Full screen, also with the app closed')} accessory="chevron" onClick={() => nav('/walk')} />
    </Section>
  </div>
}

// The automatic goal, explained: a bar in three colours (body weight · walking · training)
// that grows as the day goes on, and one line for each part.
function GoalBreakdown({ parts, kg, unit }) {
  const total = Math.max(1, parts.total)
  const seg = [
    { k: 'base', v: parts.base, c: 'var(--blue)', icon: 'scale', label: t('Base'), sub: kg ? t('{0} kg × 33 ml', Math.round(kg).toLocaleString(dateLocale())) : t('No weigh-in yet — standard 2,000 ml') },
    { k: 'walk', v: parts.stepMl, c: 'var(--green)', icon: 'figureWalk', label: t('Walking'), sub: t('{0} steps today', parts.steps.toLocaleString(dateLocale())) },
    { k: 'train', v: parts.workoutMl, c: 'var(--orange)', icon: 'figureStrength', label: t('Training'), sub: t('{0} min today', parts.workoutMin.toLocaleString(dateLocale())) },
  ]
  return <div className="wgoal">
    <div className="wgoal-bar" aria-hidden="true">
      {seg.map(x => <i key={x.k} style={{ flexGrow: x.v / total, background: x.c }} />)}
    </div>
    {seg.map(x => (
      <div key={x.k} className="wgoal-row">
        <span className="wgoal-ic" style={{ '--tint': x.c }}><Icon name={x.icon} /></span>
        <div className="wgoal-t"><b>{x.label}</b><span>{x.sub}</span></div>
        <b className="wgoal-v">{x.k === 'base' ? '' : '+'}{fmtMl(x.v)} {t('ml')}</b>
      </div>
    ))}
    <div className="wgoal-row total">
      <span className="wgoal-ic" style={{ '--tint': 'var(--teal)' }}><Icon name="drop" /></span>
      <div className="wgoal-t"><b>{t('Today’s goal')}</b><span>{t(CONTAINER_COUNT[unit.key], countIn(parts.total, unit).toLocaleString(dateLocale()))}</span></div>
      <b className="wgoal-v">{fmtMl(parts.total)} {t('ml')}</b>
    </div>
  </div>
}

// What the notification looks like — the same panel as WaterReminder.java draws, so the
// buttons are recognisable when they show up in the shade.
// A faithful little copy of THE notification (2.7.0): steps and water in one bar.
function NotifPreview({ S, ml, goal, unit }) {
  const iso = todayISO()
  const steps = stepsOn(S, iso)
  const sg = goalOf(S)
  const wp = Math.min(999, Math.round(ml / Math.max(1, goal) * 100))
  const sp = Math.min(999, Math.round(steps / Math.max(1, sg) * 100))
  const n = v => Number(v).toLocaleString(dateLocale())
  const date = new Date().toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
  return <div className="wnotif" aria-hidden="true">
    <div className="wnotif-top"><b>{date}</b><span className="wnotif-live">{t('Live')}</span><span className="wnotif-pause"><Icon name="pause" /></span></div>
    <div className="wnotif-cards">
      <div className="wnotif-card steps">
        <div className="wnotif-ct"><Icon name="figureWalk" /><span>{t('Steps')}</span><b>{sp}%</b></div>
        <div className="wnotif-big"><b>{n(steps)}</b><small>/ {n(sg)}</small></div>
        <div className="wnotif-bar"><i style={{ width: Math.min(100, sp) + '%' }} /></div>
      </div>
      <div className="wnotif-card water">
        <div className="wnotif-ct"><Icon name="drop" /><span>{t('Water')}</span><b>{wp}%</b></div>
        <div className="wnotif-big"><b>{fmtMl(ml)}</b><small>/ {fmtMl(goal)} {t('ml')}</small></div>
        <div className="wnotif-bar"><i style={{ width: Math.min(100, wp) + '%' }} /></div>
      </div>
    </div>
    <div className="wnotif-chips">
      {CONTAINERS.map(c => <span key={c.key} className={c.key === unit.key ? 'sel' : ''}><ContainerIcon kind={c.key} /><span><b>{t(CONTAINER_NAME[c.key])}</b><small>+{fmtMl(c.ml)}</small></span></span>)}
      <span className="sq"><Icon name="reset" /></span>
      <span className="sq"><Icon name="pencil" /></span>
    </div>
  </div>
}
