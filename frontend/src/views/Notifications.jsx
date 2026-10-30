// 10.0 — /notifications: every reminder of the app in one place. Which ones are on (water,
// workouts, your schedule, your day, medicines, the burn plan, a fast), when the next one comes, and one
// timeline of everything still to ring today — each row opens the screen where it is set up.
// On the phone: the system's notification settings (now grouped by kind) and a test notification.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale } from '../lib/i18n.js'
import { waterRemindPrefs, bodyKg } from '../lib/water.js'
import { reminderPrefs } from '../lib/dailyReminder.js'
import { normPlan, planNotifications, blocksOn } from '../lib/dayPlan.js'
import { dayPrefs } from '../lib/daySchedule.js'
import { medReminders } from '../lib/health.js'
import { burnReminders } from '../lib/burnPlan.js'
import { MOBILE } from '../lib/mobile.js'
import { nav } from '../lib/nav.js'
import { upcoming, fastAlarm, fastTitle } from '../lib/upcoming.js'
import { notifColor, resolveTheme, themeOf } from '../lib/themes.js'
import Icon from '../components/Icon.jsx'
import { BackButton, Section, Row, Switch } from '../components/ui.jsx'

const ui = () => useUI.getState()
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const hm = d => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
const clockMin = m => hm(new Date(2000, 0, 1, Math.floor((((m % 1440) + 1440) % 1440) / 60), ((m % 60) + 60) % 60))
const safe = (f, d) => { try { return f() } catch { return d } }
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const whenText = (d, now) => (sameDay(d, now) ? hm(d) : d.toLocaleDateString(dateLocale(), { weekday: 'short' }) + ' ' + hm(d))

async function openSystem() {
  try { const { call } = await import('../lib/stepService.js'); await call('openNotificationSettings', {}) } catch { /* web */ }
}
async function testNotification() {
  try {
    const color = notifColor(useStore.getState().S)   // 13.0: in the theme's colour
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') { ui().toast(t('Notifications are off for MAHDI-JYM in the phone settings.')); return }
    await LocalNotifications.schedule({ notifications: [{ id: 7698, title: 'MAHDI-JYM', body: t('Notifications work — you will be reminded on time.'), iconColor: color, schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true }, extra: { route: '/notifications' } }] })
    ui().toast(t('A test notification comes in 3 seconds'))
  } catch { ui().toast(t('Notifications are off for MAHDI-JYM in the phone settings.')) }
}

/**
 * 13.0 — how a reminder looks in the notification shade with the current theme: the icon, the
 * app name and the accent wear the theme's colour (themes.js notifColor), and so does the
 * phone's light where it has one. Switch it off for the classic green.
 */
export function NotifPreview({ S, onToggle }) {
  const color = notifColor(S)
  const on = S.notifTheme !== false
  const th = resolveTheme(S, typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : null) || themeOf('classic-dark')
  return <div className="card nf-color" style={{ '--nc': color }}>
    <div className="nf-color-t">
      <span className="nf-color-dot" aria-hidden="true" />
      <span className="grow"><b>{t('Notification colour')}</b><span className="small muted">{on ? t('Follows the theme: {0}', t(th.family.name)) : t('The classic green')}</span></span>
      <Switch checked={on} onChange={onToggle} label={t('Notifications in the theme colours')} />
    </div>
    <div className="nf-shade" aria-hidden="true">
      <div className="nf-note">
        <span className="nf-note-ic"><Icon name="dumbbell" /></span>
        <span className="grow">
          <span className="nf-note-app">MAHDI-JYM · {t('now')}</span>
          <b dir="auto">{t('Time for your workout 💪')}</b>
          <span className="nf-note-b">{t('Push day · 45 min')}</span>
          <span className="nf-note-acts"><i>{t('Start')}</i><i>{t('In 30 min')}</i></span>
        </span>
      </div>
      <div className="nf-note sm">
        <span className="nf-note-ic"><Icon name="drop" /></span>
        <span className="grow"><span className="nf-note-app">MAHDI-JYM · {t('in 1 h')}</span><b dir="auto">{t('Time for water')}</b></span>
      </div>
    </div>
    <p className="small muted" style={{ margin: '10px 2px 0' }}>{t('Every theme colours the reminders by itself: the icon, the buttons and the phone light. Reminders already waiting take the new colour too.')}</p>
  </div>
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
  const fast = safe(() => fastAlarm(S, now), { f: { remind: false, active: null }, end: null, at: null, ramadan: false })
  const nextPlan = safe(() => planNotifications(S, plan, now, t, clockMin, { days: 7, max: 1 })[0], null)
  const list = useMemo(() => upcoming(S, now), [S]) // eslint-disable-line react-hooks/exhaustive-deps
  // the phone's notification settings open through the Android service (review on PR #13: hidden where it isn't)
  const [native, setNative] = useState(false)
  useEffect(() => {
    let on = true
    if (MOBILE) import('../lib/stepService.js').then(m => m.hasStepService()).then(v => { if (on) setNative(!!v) }).catch(() => {})
    return () => { on = false }
  }, [])
  const rows = [
    { on: !!(plan && plan.remind), icon: 'calendar', tint: 'var(--indigo)', title: t('My schedule'), sub: plan ? (plan.remind ? (nextPlan ? t('Next: {0}', nextPlan.title) : t('{0} blocks today', n0(blocksOn(plan, now.getDay()).length))) : t('Off — switch it on in your schedule')) : t('Plan school, meals, drinks and work first'), to: '/dayplan' },
    { on: !!water.on, icon: 'drop', tint: 'var(--blue)', title: t('Water reminders'), sub: water.on ? t('Every {0} min · {1} – {2}', n0(water.every), water.from, water.to) : t('Off'), to: '/water' },
    { on: !!work.on, icon: 'dumbbell', tint: 'var(--red)', title: t('Workout reminders'), sub: work.on ? t('Workout days at {0}', work.time || '') : t('Off'), to: '/settings' },
    { on: !!day.remind, icon: 'sun', tint: 'var(--green)', title: t('Your day'), sub: day.remind ? t('Meals, workout and walk at their times') : t('Off'), to: '/ideal' },
    { on: meds.length > 0, icon: 'pill', tint: 'var(--orange)', title: t('Medicine reminders'), sub: meds.length ? t('{0} reminders a day', n0(meds.length)) : t('Off'), to: '/health' },
    { on: burn.length > 0, icon: 'flame', tint: 'var(--pink)', title: t('Burn plan'), sub: burn.length ? t('{0} reminders planned', n0(burn.length)) : t('Off'), to: '/burn' },
    { on: !!fast.at, icon: 'moon', tint: 'var(--purple)', title: t('Fasting tracker'), to: '/fasting',
      sub: fast.at ? t('Next: {0}', fastTitle(fast) + ' · ' + whenText(fast.at, now)) : !fast.f.active ? t('Start fasting') : fast.f.remind ? t('Time to break your fast') : t('Off') },
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

    <NotifPreview S={S} onToggle={v => useStore.getState().update(s => { s.notifTheme = v })} />

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

    {MOBILE && <Section title={t('Phone')} footer={native ? t('In the phone settings the notifications are grouped: steps & activity, water, schedule & meals, workouts, health.') : undefined}>
      {native && <Row icon="gear" iconTint="var(--grey)" title={t('Notification settings')} subtitle={t('Sounds, banners and lock screen for each kind')} accessory="chevron" onClick={openSystem} />}
      <Row icon="bell" iconTint="var(--green)" title={t('Send a test notification')} accessory="chevron" onClick={testNotification} />
    </Section>}
    {!MOBILE && <p className="small muted dk-foot">{t('Reminders ring in the phone app.')}</p>}
    <div style={{ height: 8 }} />
  </div>
}
