// Tools (8.0) — one place for everything that helps around the training: the new interval
// timer, guided breathing, fasting, muscle recovery and heart-rate zones, next to the trackers
// that already existed (water, food, steps, body, health, reports). Live tiles show their state
// (a running fast, today's readiness) so the hub is useful at a glance.
// 10.0: soft drinks and nuts & seeds tiles, "My schedule", and the rest grouped by kind.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { normFasting, fastStatus, hmText } from '../lib/fasting.js'
import { recoveryOf, overallReadiness } from '../lib/recovery.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, BackButton } from '../components/ui.jsx'
import { zonesSheet } from '../components/HrZonesSheet.jsx'


export default function Tools() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [now] = useState(() => Date.now())
  const fast = fastStatus(normFasting(S.fasting).active, now)
  const ready = useMemo(() => overallReadiness(recoveryOf(S.workouts, now)), [S.workouts, now])
  const hiitWeek = (Array.isArray(S.intervals) ? S.intervals : []).filter(e => e.at > now - 7 * 864e5).length

  const plan = S.planner && Array.isArray(S.planner.blocks) ? S.planner : null
  const blocksToday = plan ? plan.blocks.filter(b => !Array.isArray(b.w) || !b.w.length || b.w.includes(new Date(now).getDay())).length : 0
  const featured = [
    { to: '/dayplan', icon: 'calendar', title: 'My schedule', sub: plan ? t('{0} blocks today', blocksToday) : t('School, meals, drinks, work'), c1: '#5e5ce6', c2: '#ff375f' },
    // 14.0: the Kitchen holds every food, dish, recipe and drink (the food database, drinks, soft drinks and nuts too)
    { to: '/kitchen', icon: 'fork', title: 'Kitchen', sub: t('Food, cooking and drinks — with real photos'), c1: '#ffb300', c2: '#ff5e3a' },
    { to: '/timer', icon: 'timer', title: 'Interval timer', sub: hiitWeek ? t('{0} this week', hiitWeek) : t('Tabata, HIIT, EMOM'), c1: '#ff375f', c2: '#ff9f0a' },
    { to: '/breathe', icon: 'wind', title: 'Breathe', sub: t('Box, 4-7-8, coherent'), c1: '#30b0c7', c2: '#5e5ce6' },
    { to: '/fasting', icon: 'moon', title: 'Fasting tracker', sub: fast ? (fast.done ? t('Goal reached!') : hmText(fast.elapsedMs)) : t('16:8, Ramadan, custom'), c1: '#ff9f0a', c2: '#bf5af2', live: !!fast },
    { to: '/recovery', icon: 'heartPulse', title: 'Recovery', sub: t('{0}% ready', ready), c1: '#30d158', c2: '#0a84ff' },
  ]
  // 10.0: the rest, grouped
  const groups = [
    { title: 'Food & drinks', rows: [
      { icon: 'fork', tint: 'var(--orange)', title: 'Foods', sub: 'Your food log — and the Kitchen', to: '/food' },
      { icon: 'leafy', tint: 'var(--green)', title: 'Kitchen', sub: 'Food, cooking and drinks — with real photos', to: '/kitchen' },
      { icon: 'drop', tint: 'var(--blue)', title: 'Water', sub: 'Daily goal and reminders', to: '/water' },
    ] },
    { title: 'Activity', rows: [
      { icon: 'figureWalk', tint: 'var(--acc)', title: 'Walking & steps', sub: 'Step counter and daily goal', to: '/walk' },
      { icon: 'flame', tint: 'var(--red)', title: 'Burn calories', sub: 'A plan of exercises with reminders', to: '/calories' },
      { icon: 'heart', tint: 'var(--red)', title: 'Heart-rate zones', sub: 'Five training zones from your age', on: zonesSheet },
    ] },
    { title: 'Body & health', rows: [
      { icon: 'scale', tint: 'var(--teal)', title: 'Body weight', sub: 'Trend, goal and photos', to: '/weight' },
      { icon: 'person', tint: 'var(--green)', title: 'Ideal body', sub: 'Ideal weight and your plan', to: '/ideal' },
      { icon: 'heartPulse', tint: 'var(--pink)', title: 'Health log', sub: 'Sleep, mood, blood pressure, sugar, medicines', to: '/health' },
    ] },
    { title: 'Reports & reminders', rows: [
      { icon: 'chartLine', tint: 'var(--indigo)', title: 'Reports', sub: 'Weekly and monthly summaries', to: '/reports' },
      { icon: 'bellBadge', tint: 'var(--orange)', title: 'Notifications', sub: 'Every reminder of the app in one place', to: '/notifications' },
    ] },
  ]

  return <div className="narrow tl-page">
    <div className="hdr">
      <BackButton fallback="/home" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Tools')}</h1><div className="sub">{t('Everything that helps you train')}</div></div>
    </div>
    <div className="tl-grid">
      {featured.map((f, i) => <button key={f.to} className={'tl-tile' + (f.live ? ' live' : '')} style={{ '--c1': f.c1, '--c2': f.c2, '--i': i }} onClick={() => nav(f.to)}>
        <span className="tl-glow" aria-hidden="true" />
        <span className="tl-ic"><Icon name={f.icon} /></span>
        <b>{t(f.title)}</b>
        <small>{f.live && <span className="tl-live" aria-hidden="true" />}{f.sub}</small>
      </button>)}
    </div>
    {groups.map(g => <Section key={g.title} title={t(g.title)}>
      {g.rows.map(m => <Row key={m.title} icon={m.icon} iconTint={m.tint} title={t(m.title)} subtitle={t(m.sub)} accessory="chevron" onClick={m.on || (() => nav(m.to))} />)}
    </Section>)}
  </div>
}
