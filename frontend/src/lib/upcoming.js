// 13.0 — everything still to ring today, from every feature, in time order (moved out of
// views/Notifications.jsx so the notification panel on Home can use it too).
import { t, dateLocale } from './i18n.js'
import { todayISO } from './format.js'
import { waterRemindPrefs, reminderSlots, bodyKg } from './water.js'
import { planReminders } from './dailyReminder.js'
import { normPlan, planNotifications, KINDS } from './dayPlan.js'
import { dayReminderItems } from './daySchedule.js'
import { idealBodyOf } from './idealBody.js'
import { medReminders } from './health.js'
import { burnReminders, burnReminderText } from './burnPlan.js'
import { normFasting } from './fasting.js'
import { MEALS } from './food.js'

const hm = d => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
const clockMin = m => hm(new Date(2000, 0, 1, Math.floor((((m % 1440) + 1440) % 1440) / 60), ((m % 60) + 60) % 60))
const safe = (f, d) => { try { return f() } catch { return d } }

/** The running fast and its "done" notification (Fasting.jsx), when that is still to come (review on PR #13). */
export function fastAlarm(S, now) {
  const f = normFasting(S.fasting)
  const end = f.active ? new Date(f.active.start + f.active.goalH * 3600000) : null
  return { f, end, at: end && f.remind && end > now ? end : null, ramadan: !!f.active && f.active.plan === 'ramadan' }
}
export const fastTitle = x => (x.ramadan ? t('Time for iftar') : t('Fast complete!'))

/** Everything still to ring today, from every feature, in time order. */
export function upcoming(S, now = new Date()) {
  const out = []
  const iso = todayISO()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const plan = normPlan(S.planner)
  for (const n of safe(() => planNotifications(S, plan, now, t, clockMin, { days: 1, max: 40 }), [])) out.push({ at: n.at, icon: (KINDS[n.kind] || KINDS.other).icon, color: n.color, title: n.title, sub: t('My schedule'), to: '/dayplan' })
  const w = safe(() => waterRemindPrefs(S), { on: false })
  if (w.on) for (const at of safe(() => reminderSlots(w, now), [])) if (at > now) out.push({ at, icon: 'drop', color: '#64d2ff', title: t('Time for water'), sub: t('Water reminders'), to: '/water' })
  for (const r of safe(() => planReminders(S, now, 1), [])) if (r.at > now && r.at < end) out.push({ at: r.at, icon: r.kind === 'walk' ? 'figureWalk' : 'dumbbell', color: '#ff375f', title: r.kind === 'walk' ? t('Walking reminder') : r.routine || t('Workout reminder'), sub: t('Workout reminders'), to: '/settings' })
  const fast = safe(() => fastAlarm(S, now), null)
  if (fast && fast.at && fast.at < end) out.push({ at: fast.at, icon: 'moon', color: '#bf5af2', title: fastTitle(fast), sub: t('Fasting tracker'), to: '/fasting' })
  for (const m of safe(() => medReminders(S), [])) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), m.hour, m.minute)
    if (at > now) out.push({ at, icon: 'pill', color: '#ff9f0a', title: m.name, sub: t('Medicine reminders'), to: '/health' })
  }
  // the burn plan's exercises (review on PR #13)
  for (const b of safe(() => burnReminders(S, bodyKg(S), now), [])) {
    if (b.at <= now || b.at >= end) continue
    out.push({ at: b.at, icon: 'flame', color: '#ff375f', title: safe(() => burnReminderText(b).title.replace(/^🔥\s*/, ''), t('Burn plan')), sub: t('Burn plan'), to: '/burn/review' })
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
