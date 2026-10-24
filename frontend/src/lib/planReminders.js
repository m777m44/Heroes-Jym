// 9.0 — day-plan reminders on the phone, in the theme's accent colour, each carrying its own text
// for its date (so a reminder never shows yesterday's plan).
// 10.0 — "My schedule": every block on its weekdays, at its start or the minutes before that you
// chose. On Android the phone arms them itself (PlanReminder.java, one self-rescheduling alarm per
// block from lib/dayPlan.js planAlarms): the expanded notification shows the time, your notes and the food and
// drinks with their calories, in the block's colour, with "Done ✓" and "In 10 min" that work with
// the app closed — what you pressed is applied when the app opens (pullPlanActions). Elsewhere
// (iOS) LocalNotifications (ids 7700–7759, channel mj_plan) without buttons: each one repeats
// weekly on its weekday, so they keep coming while the app stays closed (review on PR #13).
// Also: the notification channels are put into named groups (organizeChannels).
import { MOBILE } from './mobile.js'
import { t, dateLocale } from './i18n.js'
import { normPlan, planNotifications, planAlarms, PLAN_ID_BASE } from './dayPlan.js'
import { themeAccent } from './themes.js'

const FALLBACK_MAX = 60
const clock = m => new Date(2000, 0, 1, Math.floor((((m % 1440) + 1440) % 1440) / 60), ((m % 60) + 60) % 60).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
let lastSig = ''

async function native() {
  try {
    const { hasStepService, call } = await import('./stepService.js')
    return (await hasStepService()) ? call : null
  } catch { return null }
}

export async function syncPlanReminders(S, force = false) {
  if (!MOBILE || !S) return
  let sig = ''
  try {
    const plan = normPlan(S.planner)
    const color = themeAccent()
    const call = await native()
    // Android: one self-rescheduling alarm per block (planAlarms); elsewhere the weekly fallback
    const alarms = call && plan && plan.remind ? planAlarms(S, plan, new Date(), t, clock) : []
    const list = !call && plan && plan.remind ? weeklyFallback(plan, S) : []
    sig = JSON.stringify([!!call, alarms.map(n => [n.block, n.w, n.start, n.lead, n.title, n.body, n.lines.join('|'), n.skip]),
      list.map(n => [n.block, n.at.getDay(), n.at.getHours(), n.at.getMinutes(), n.title, n.lines.join('|')]), S.lang, color])
    if (!force && sig === lastSig) return
    lastSig = sig
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    // whatever the 9.0 build (or the fallback) left behind
    await LocalNotifications.cancel({ notifications: Array.from({ length: 100 }, (_, i) => ({ id: PLAN_ID_BASE + i })) }).catch(() => {})
    if (call) {
      if (alarms.length) {
        let perm = await LocalNotifications.checkPermissions()
        if (perm.display !== 'granted' && force) perm = await LocalNotifications.requestPermissions()
        // not allowed (yet): nothing is armed, and the next sync tries again (review on PR #13)
        if (perm.display !== 'granted') { lastSig = ''; await call('schedulePlanReminders', { items: [], strings: {} }); return }
      }
      const r = await call('schedulePlanReminders', {
        items: alarms.map(n => ({
          id: n.id, block: n.block, w: n.w, start: n.start, lead: n.lead, skip: n.skip, title: n.title, body: n.body, big: n.lines.join('\n'),
          color: n.color, route: '/dayplan', ttl: 2 * 3600000, ...(n.once ? { once: n.once } : {}),
        })),
        strings: { channel: t('My schedule'), channelDesc: t('Each block of your schedule, with everything you planned'), done: t('Done ✓'), later: t('In {0} min', 10), sub: t('My schedule') },
      })
      if (r && typeof r.scheduled === 'number') organizeChannels()
      else lastSig = ''
      return
    }
    if (!list.length) return
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && force) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') { lastSig = ''; return }
    await LocalNotifications.createChannel({ id: 'mj_plan', name: t('My schedule'), description: t('Each block of your schedule, with everything you planned'), importance: 4, visibility: 1, vibration: true }).catch(() => {})
    await LocalNotifications.schedule({
      notifications: list.map((n, i) => ({
        id: PLAN_ID_BASE + i, channelId: 'mj_plan', title: n.title, body: n.body, largeBody: n.lines.join('\n'), summaryText: t('My schedule'),
        iconColor: n.color || color, schedule: { on: { weekday: n.at.getDay() + 1, hour: n.at.getHours(), minute: n.at.getMinutes() }, allowWhileIdle: true }, extra: { route: '/dayplan' },
      })),
    })
  } catch { if (lastSig === sig) lastSig = '' /* plugin unavailable — try again next time */ }
}

/** Done ✓ pressed on reminders while the app was closed → logged now. Returns { count, kcal }. */
export async function pullPlanActions() {
  if (!MOBILE) return { count: 0, kcal: 0 }
  try {
    const call = await native()
    if (!call) return { count: 0, kcal: 0 }
    const r = await call('takePlanActions', {})
    const actions = (r && Array.isArray(r.actions)) ? r.actions : []
    if (!actions.length) return { count: 0, kcal: 0 }
    const { applyPlanActions } = await import('./planLog.js')
    return applyPlanActions(actions)
  } catch { return { count: 0, kcal: 0 } }
}

/**
 * Without the native service: one weekly-repeating reminder per block and weekday (the next eight
 * days, so today's ones that already rang come back next week), the soonest FALLBACK_MAX. A block
 * moved for one day (+10) keeps its usual weekly time here — a repeating reminder can't move once.
 */
export function weeklyFallback(plan, S, now = new Date()) {
  const seen = new Set(), out = []
  for (const n of planNotifications(S, plan, now, t, clock, { days: 8, max: 400 })) {
    if (n.moved) continue
    const k = n.block + '|' + n.at.getDay() + '|' + n.lead
    if (seen.has(k)) continue
    seen.add(k)
    out.push(n)
    if (out.length >= FALLBACK_MAX) break
  }
  return out
}

let organized = ''
/** The phone's notification settings in named groups, in the app's language (once per language). */
export async function organizeChannels(force = false) {
  if (!MOBILE) return
  const groups = {
    g_activity: t('Steps & activity'), g_water: t('Water'), g_plan: t('Schedule & meals'), g_train: t('Workouts'), g_health: t('Health & medicines'),
  }
  const sig = JSON.stringify(groups)
  if (!force && sig === organized) return
  try {
    const call = await native()
    if (!call) return
    await call('organizeChannels', { groups })
    organized = sig
  } catch { /* older build */ }
}
