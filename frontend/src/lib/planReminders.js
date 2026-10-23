// 9.0 — day-plan reminders on the phone: one date-specific notification per block still ahead
// today (and tomorrow with "Run it every day"), in the theme's accent colour. Each carries its
// own text for its date, so a reminder never shows yesterday's plan. Ids 7700–7799, channel mj_plan.
import { MOBILE } from './mobile.js'
import { t, dateLocale } from './i18n.js'
import { normPlan, planNotifications, PLAN_ID_BASE } from './dayPlan.js'
import { themeAccent } from './themes.js'

const clock = m => new Date(2000, 0, 1, Math.floor(m / 60), m % 60).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
let lastSig = ''
export async function syncPlanReminders(S, force = false) {
  if (!MOBILE || !S) return
  try {
    const plan = normPlan(S.planner)
    const list = plan && plan.remind ? planNotifications(S, plan, new Date(), t, clock) : []
    const color = themeAccent()
    const sig = JSON.stringify([list.map(n => [n.id, +n.at, n.title, n.body]), S.lang, color])
    if (!force && sig === lastSig) return
    lastSig = sig
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: Array.from({ length: 100 }, (_, i) => ({ id: PLAN_ID_BASE + i })) }).catch(() => {})
    if (!list.length) return
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && force) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return
    await LocalNotifications.createChannel({ id: 'mj_plan', name: t('Day plan'), description: t('Each block of your day plan as it starts'), importance: 4, visibility: 1, vibration: true }).catch(() => {})
    await LocalNotifications.schedule({
      notifications: list.map(n => ({ id: n.id, channelId: 'mj_plan', title: n.title, body: n.body, iconColor: color, schedule: { at: n.at, allowWhileIdle: true }, extra: { route: '/dayplan' } })),
    })
  } catch { /* plugin unavailable */ }
}
