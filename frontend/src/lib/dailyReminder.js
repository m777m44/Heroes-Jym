// Daily reminder planning — one source of truth for "what should remind you, and when".
//
// openGym's native reminder was a weekly repeating notification per planned weekday, so it
// also fired on days you had already trained or had moved the workout away from. This plans
// concrete calendar dates instead (the next PLAN_DAYS days), honouring day overrides, and
// re-plans after every relevant state change — log today's workout and today's reminder and
// its follow-up simply aren't in the next plan any more.
//
// What a day can get (S.reminder = { on, time, tz, nudge, walk, days, v2 }):
//   · workout day, not trained yet  → a reminder at `time`, mentioning the step goal too —
//                                     one combined notification rather than two
//   · …still not trained an hour on → a follow-up nudge (`nudge`, default on)
//   · no routine, daily plan on     → 2.10: the day's no-equipment HOME WORKOUT (`home`, default
//                                     on) — exercises, minutes, steps and water in one reminder,
//                                     shown on screen with a light vibration (Android, natively)
//   · rest day, step reminder on    → a walking reminder at `time` (`walk`, default off),
//                                     skipped when today's goal is already met
//
// The self-hosted server applies the same rules to Web Push (api/reminders.js); the mobile
// build feeds this plan to native local notifications (lib/mobile.js).
import { effectiveRoutineId } from './history.js'
import { routineLabel } from './routines.js'
import { isoOf } from './format.js'
import { goalOf, stepsOn } from './stepMetrics.js'
import { t, dateLocale, getLang, exName } from './i18n.js'
import { EXIDX } from './exercises.js'
import { planFor } from './dailyPlan.js'

// 2.6: on by default in the phone app (until switched off there — `v2` marks a choice made),
// and a time per weekday (`days` { getDay(): 'HH:MM' }) on top of the one time for all days.
const DEFAULT_ON = import.meta.env && import.meta.env.VITE_MOBILE === '1'
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export const PLAN_DAYS = 14
export const NUDGE_AFTER_MIN = 60
export const ID_BASE = 1000                 // native notification ids: ID_BASE … ID_BASE + 2·PLAN_DAYS
export const LEGACY_IDS = [100, 101, 102, 103, 104, 105, 106]   // the old weekday schedule

export const reminderPrefs = S => {
  const r = (S && S.reminder) || {}
  const days = {}
  for (const [k, v] of Object.entries(r.days || {})) if (/^[0-6]$/.test(k) && HHMM.test(v || '')) days[k] = v
  return {
    on: r.v2 || !DEFAULT_ON ? !!r.on : true,
    time: /^\d\d:\d\d$/.test(r.time || '') ? r.time : '08:00', nudge: r.nudge !== false, walk: !!r.walk, days,
    home: r.home !== false,
  }
}

/** The reminder time on weekday `dow` (getDay()): that day's own time, else the shared one. */
export const timeFor = (p, dow) => p.days[dow] || p.time

/** Exercises, sets and a time estimate of a routine: { n, sets, min, names }. */
export function routineSummary(routine, restSec = 90) {
  const ex = (routine && routine.ex) || []
  const sets = ex.reduce((a, e) => a + (Number(e.sets) || 3), 0)
  const min = Math.max(10, Math.round(sets * (40 + (Number(restSec) || 90)) / 60 / 5) * 5)
  const names = ex.slice(0, 3).map(e => (EXIDX[e.id] ? exName(EXIDX[e.id]) : '')).filter(Boolean)
  return { n: ex.length, sets, min, names, more: Math.max(0, ex.length - names.length) }
}

/** Every reminder still to come in the next `days` days, in time order. */
export function planReminders(S, now = new Date(), days = PLAN_DAYS) {
  const r = reminderPrefs(S)
  if (!r.on) return []
  const trained = new Set((S.workouts || []).map(w => w.d))
  const out = []
  for (let i = 0; i < days; i++) {
    const dow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12).getDay()
    const [hh, mm] = timeFor(r, dow).split(':').map(Number)
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hh, mm, 0, 0)
    const iso = isoOf(day)
    if (trained.has(iso)) continue
    const rid = effectiveRoutineId(S, iso)
    const routine = rid ? (S.routines || []).find(x => x.id === rid) : null
    if (routine) {
      out.push({ id: ID_BASE + i * 2, kind: 'workout', iso, at: day, routine: routineLabel(routine.name), rid: routine.id })
      if (r.nudge) out.push({ id: ID_BASE + i * 2 + 1, kind: 'nudge', iso, at: new Date(day.getTime() + NUDGE_AFTER_MIN * 60000), routine: routineLabel(routine.name), rid: routine.id })
    } else if (r.home && S.planOn !== false) {
      const plan = planFor(S, iso)
      const p = { title: plan.title, kind: plan.kind, n: plan.exercises.length, min: plan.minutes, steps: plan.stepsTarget,
        water: plan.waterMl, kcal: plan.kcalTotal, tip: plan.tip, ids: plan.exercises.map(e => e.id) }
      out.push({ id: ID_BASE + i * 2, kind: 'plan', iso, at: day, plan: p })
      if (r.nudge) out.push({ id: ID_BASE + i * 2 + 1, kind: 'plannudge', iso, at: new Date(day.getTime() + NUDGE_AFTER_MIN * 60000), plan: p })
    } else if (r.walk) {
      if (i === 0 && stepsOn(S, iso) >= goalOf(S)) continue
      out.push({ id: ID_BASE + i * 2, kind: 'walk', iso, at: day })
    }
  }
  return out.filter(x => x.at > now)
}

const listOf = names => {
  try { return new Intl.ListFormat(dateLocale(), { style: 'short', type: 'unit' }).format(names) } catch { return names.join(', ') }
}

/** Title and body for a planned reminder, in the current language (`big`: the expanded text). */
export function reminderText(item, S) {
  const goal = goalOf(S).toLocaleString(dateLocale())
  const n = v => Number(v || 0).toLocaleString(dateLocale())
  if ((item.kind === 'plan' || item.kind === 'plannudge') && item.plan) {
    const p = item.plan
    const names = (p.ids || []).slice(0, 3).map(id => (EXIDX[id] ? exName(EXIDX[id]) : '')).filter(Boolean)
    const more = Math.max(0, (p.ids || []).length - names.length)
    const list = names.length ? listOf(names) + (more ? ' ' + t('+{0} more', n(more)) : '') : ''
    const facts = '👟 ' + t('{0} steps', n(p.steps)) + ' · 💧 ' + n(p.water) + ' ' + t('ml') + ' · 🔥 ' + t('{0} kcal', n(p.kcal))
    if (item.kind === 'plannudge') {
      const body = t('Just {0} minutes at home — no equipment needed.', n(p.min))
      return { title: '⏰ ' + t('Still time for {0}', t(p.title)), body, big: body + (list ? '\n' + list : '') }
    }
    const body = t('{0} exercises · about {1} min', n(p.n), n(p.min)) + ' · ' + t('No equipment')
    return {
      title: (p.kind === 'recover' ? '🧘 ' : '🏠 ') + t('Home workout: {0}', t(p.title)),
      body: body + (list ? ' — ' + list : ''),
      big: body + (list ? '\n' + list : '') + '\n' + facts + (p.tip ? '\n💡 ' + t(p.tip) : ''),
    }
  }
  const routine = item.rid ? (S.routines || []).find(r => r.id === item.rid) : null
  const sum = routine ? routineSummary(routine, S.restSec) : null
  if (item.kind === 'workout' && sum && sum.n) {
    let list = sum.names.join(', ')
    try { list = new Intl.ListFormat(dateLocale(), { style: 'short', type: 'unit' }).format(sum.names) } catch { /* old engine */ }
    const names = list + (sum.more ? ' ' + t('+{0} more', sum.more.toLocaleString(dateLocale())) : '')
    return {
      title: '🏋️ ' + t('{0} today', item.routine),
      body: t('{0} exercises · about {1} min', sum.n.toLocaleString(dateLocale()), sum.min.toLocaleString(dateLocale())) +
        (names ? ' — ' + names : '') + '. ' + t('Plus {0} steps to walk.', goal),
    }
  }
  if (item.kind === 'workout') return {
    title: t('{0} today', item.routine),
    body: t('It’s on your plan — plus {0} steps to walk. Let’s go!', goal),
  }
  if (item.kind === 'nudge') return {
    title: t('Still time for {0}', item.routine),
    body: t('You haven’t logged today’s workout yet — even a short session counts.'),
  }
  return {
    title: t('Rest day — time for a walk?'),
    body: t('Your goal today is {0} steps.', goal),
  }
}

/**
 * "Smart" time suggestion: the median time you actually start workouts (last 10 that have
 * a start time), rounded to 15 minutes — and the suggested reminder half an hour before it.
 * Null with fewer than 3 timed workouts; one session isn't a habit.
 */
export function usualWorkoutTime(workouts) {
  const mins = (workouts || []).filter(w => Number.isFinite(w.start)).slice(-10)
    .map(w => { const d = new Date(w.start); return d.getHours() * 60 + d.getMinutes() })
    .sort((a, b) => a - b)
  if (mins.length < 3) return null
  const mid = mins.length % 2 ? mins[(mins.length - 1) / 2] : (mins[mins.length / 2 - 1] + mins[mins.length / 2]) / 2
  return Math.round(mid / 15) * 15
}
export const hhmm = m => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0') }
export function suggestedReminderTime(workouts) {
  const usual = usualWorkoutTime(workouts)
  return usual === null ? null : { usual: hhmm(usual), remind: hhmm(usual - 30) }
}

/**
 * A fingerprint of everything the plan depends on — the mobile build only reschedules native
 * notifications when it changes, not on every save (a walk saves steps every few seconds).
 */
export function planSignature(S, now = new Date()) {
  return JSON.stringify([
    reminderPrefs(S), S.week, S.dayPlan, S.planOn, (S.bodyweight || []).length, S.heightCm, (S.routines || []).map(r => [r.id, r.name, (r.ex || []).length]), S.restSec, getLang(),   // texts follow the language
    (S.workouts || []).slice(-3).map(w => w.d), goalOf(S), isoOf(now),
    // a rest-day walk reminder disappears once today's goal is met
    reminderPrefs(S).walk && stepsOn(S, isoOf(now)) >= goalOf(S),
  ])
}
