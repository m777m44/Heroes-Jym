// 10.0 — /notifications: every reminder of the app in one place. Which ones are on (water,
// workouts, your schedule, your day, medicines, the burn plan), when the next one comes, and one
// timeline of everything still to ring today — each row opens the screen where it is set up.
// On the phone: the system's notification settings (now grouped by kind) and a test notification.
import { useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { waterRemindPrefs, reminderSlots, bodyKg } from '../lib/water.js'
import { reminderPrefs, planReminders } from '../lib/dailyReminder.js'
import { normPlan, planNotifications, blocksOn, KINDS } from '../lib/dayPlan.js'
import { dayPrefs, dayReminderItems } from '../lib/daySchedule.js'
import { idealBodyOf } from '../lib/idealBody.js'
import { medReminders } from '../lib/health.js'
import { burnReminders } from '../lib/burnPlan.js'
import { MEALS } from '../lib/food.js'
import { MOBILE } from '../lib/mobile.js'
import { nav } from '../lib/nav.js'
import Icon from '../components/Icon.jsx'
import { BackButton, Section, Row } from '../components/ui.jsx'

const ui = () => useUI.getState()
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const hm = d => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
const clockMin = m => hm(new Date(2000, 0, 1, Math.floor((((m % 1440) + 1440) % 1440) / 60), ((m % 60) + 60) % 60))
const safe = (f, d) => { try { return f() } catch { return d } }

async function openSystem() {
  try { const { call } = await import('../lib/stepService.js'); await call('openNotificationSettings', {}) } catch { /* web */ }
}
async function testNotification() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') { ui().toast(t('Notifications are off for MAHDI-JYM in the phone settings.')); return }
    await LocalNotifications.schedule({ notifications: [{ id: 7698, title: 'MAHDI-JYM', body: t('Notifications work — you will be reminded on time.'), schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true }, extra: { route: '/notifications' } }] })
    ui().toast(t('A test notification comes in 3 seconds'))
  } catch { ui().toast(t('Notifications are off for MAHDI-JYM in the phone settings.')) }
}

/** Everything still to ring today, from every feature, in time order. */
function upcoming(S, now) {
  const out = []
  const iso = todayISO()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const plan = normPlan(S.planner)
  for (const n of safe(() => planNotifications(S, plan, now, t, clockMin, { days: 1, max: 40 }), [])) out.push({ at: n.at, icon: (KINDS[n.kind] || KINDS.other).icon, color: n.color, title: n.title, sub: t('My schedule'), to: '/dayplan' })
  const w = safe(() => waterRemindPrefs(S), { on: false })
  if (w.on) for (const at of safe(() => reminderSlots(w, now), [])) if (at > now) out.push({ at, icon: 'drop', color: '#64d2ff', title: t('Time for water'), sub: t('Water reminders'), to: '/water' })
  for (const r of safe(() => planReminders(S, now, 1), [])) if (r.at > now && r.at < end) out.push({ at: r.at, icon: r.kind === 'walk' ? 'figureWalk' : 'dumbbell', color: '#ff375f', title: r.kind === 'walk' ? t('Walking reminder') : r.routine || t('Workout reminder'), sub: t('Workout reminders'), to: '/settings' })
  for (const m of safe(() => medReminders(S), [])) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), m.hour, m.minute)
    if (at > now) out.push({ at, icon: 'pill', color: '#ff9f0a', title: m.name, sub: t('Medicine reminders'), to: '/health' })
  }
  const r = safe(() => idealBodyOf(S), null)
  for (const x of safe(() => dayReminderItems(S, r, iso), [])) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), x.hour, x.minute)
    if (at <= now) continue
    const it = x.item || {}
    const title = it.kind === 'meal' ? t((MEALS.find(m => m.key === it.meal) || MEALS[3]).name) : it.kind === 'workout' ? t('Workout') : t('Walk')
    out.push({ at, icon: it.kind === 'meal' ? 'fork' : it.kind === 'workout' ? 'dumbbell' : 'figureWalk', color: '#30d158', title, sub: t('Your day'), to: '/ideal' })
  }
  return out.sort((a, b) => a.at - b.at)
}

export default function Notifications() {
  const S = useStore(s => s.S)
  const now = new Date()
  const plan = normPlan(S.planner)
  const water = safe(() => waterRemindPrefs(S), { on: false })
  const work = safe(() => reminderPrefs(S), { on: false })
  const meds = safe(() => medReminders(S), [])
  const burn = safe(() => burnReminders(S, bodyKg(S)), [])
  const day = safe(() => dayPrefs(S), { remind: false })
  const nextPlan = safe(() => planNotifications(S, plan, now, t, clockMin, { days: 7, max: 1 })[0], null)
  const list = useMemo(() => upcoming(S, now), [S]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = [
    { on: !!(plan && plan.remind), icon: 'calendar', tint: 'var(--indigo)', title: t('My schedule'), sub: plan ? (plan.remind ? (nextPlan ? t('Next: {0}', nextPlan.title) : t('{0} blocks today', n0(blocksOn(plan, now.getDay()).length))) : t('Off — switch it on in your schedule')) : t('Plan school, meals, drinks and work first'), to: '/dayplan' },
    { on: !!water.on, icon: 'drop', tint: 'var(--blue)', title: t('Water reminders'), sub: water.on ? t('Every {0} min · {1} – {2}', n0(water.every), water.from, water.to) : t('Off'), to: '/water' },
    { on: !!work.on, icon: 'dumbbell', tint: 'var(--red)', title: t('Workout reminders'), sub: work.on ? t('Workout days at {0}', work.time || '') : t('Off'), to: '/settings' },
    { on: !!day.remind, icon: 'sun', tint: 'var(--green)', title: t('Your day'), sub: day.remind ? t('Meals, workout and walk at their times') : t('Off'), to: '/ideal' },
    { on: meds.length > 0, icon: 'pill', tint: 'var(--orange)', title: t('Medicine reminders'), sub: meds.length ? t('{0} reminders a day', n0(meds.length)) : t('Off'), to: '/health' },
    { on: burn.length > 0, icon: 'flame', tint: 'var(--pink)', title: t('Burn plan'), sub: burn.length ? t('{0} reminders planned', n0(burn.length)) : t('Off'), to: '/burn' },
  ]
  const onCount = rows.filter(r => r.on).length
  return <div className="narrow nf-page">
    <div className="hdr">
      <BackButton fallback="/settings" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Notifications')}</h1><div className="sub">{t('Every reminder of the app in one place')}</div></div>
    </div>

    <div className="card nf-hero">
      <span className="sd-top-bg" aria-hidden="true" />
      <span className="nf-bell" aria-hidden="true"><Icon name="bellBadge" /></span>
      <div className="grow">
        <b className="nf-hero-n">{t('{0} of {1} on', n0(onCount), n0(rows.length))}</b>
        <span className="small">{list.length ? t('{0} more today · next at {1}', n0(list.length), hm(list[0].at)) : t('Nothing more today')}</span>
      </div>
    </div>

    <Section title={t('Reminders')}>
      {rows.map(r => <Row key={r.to + r.title} icon={r.icon} iconTint={r.tint} title={r.title} subtitle={r.sub} accessory="chevron" onClick={() => nav(r.to)}
        value={<span className={'nf-st' + (r.on ? ' on' : '')}>{r.on ? t('On') : t('Off')}</span>} />)}
      <Row icon="figureWalk" iconTint="var(--acc)" title={t('Steps & celebrations')} subtitle={t('Step counter, daily goal, notification, celebrations')} accessory="chevron" onClick={() => nav('/walk')} />
    </Section>

    <div className="dk-sec-t">{t('Still to come today')}</div>
    {list.length ? <div className="nf-tl">
      {list.slice(0, 12).map((x, i) => <button key={i} className="nf-it" style={{ '--c': x.color, '--i': Math.min(i, 12) }} onClick={() => nav(x.to)}>
        <span className="nf-it-t">{hm(x.at)}</span>
        <span className="nf-it-ic"><Icon name={x.icon} /></span>
        <span className="grow"><b dir="auto">{x.title}</b><span className="small muted">{x.sub}</span></span>
      </button>)}
      {list.length > 12 && <div className="small muted nf-more">{t('And {0} more', n0(list.length - 12))}</div>}
    </div> : <div className="empty small"><div className="ico"><Icon name="bellSlash" /></div>{t('Nothing more today')}</div>}

    {MOBILE && <Section title={t('Phone')} footer={t('In the phone settings the notifications are grouped: steps & activity, water, schedule & meals, workouts, health.')}>
      <Row icon="gear" iconTint="var(--grey)" title={t('Notification settings')} subtitle={t('Sounds, banners and lock screen for each kind')} accessory="chevron" onClick={openSystem} />
      <Row icon="bell" iconTint="var(--green)" title={t('Send a test notification')} accessory="chevron" onClick={testNotification} />
    </Section>}
    {!MOBILE && <p className="small muted dk-foot">{t('Reminders ring in the phone app.')}</p>}
    <div style={{ height: 8 }} />
  </div>
}
