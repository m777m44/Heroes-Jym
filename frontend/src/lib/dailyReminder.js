// Daily reminder planning — one source of truth for "what should remind you, and when".
//
// openGym's native reminder was a weekly repeating notification per planned weekday, so it
// also fired on days you had already trained or had moved the workout away from. This plans
// concrete calendar dates instead (the next PLAN_DAYS days), honouring day overrides, and
// re-plans after every relevant state change — log today's workout and today's reminder and
// its follow-up simply aren't in the next plan any more.
//
// What a day can get (S.reminder = { on, time, tz, nudge, walk }):
//   · workout day, not trained yet  → a reminder at `time`, mentioning the step goal too —
//                                     one combined notification rather than two
//   · …still not trained an hour on → a follow-up nudge (`nudge`, default on)
//   · rest day, step reminder on    → a walking reminder at `time` (`walk`, default off),
//                                     skipped when today's goal is already met
//
// The self-hosted server applies the same rules to Web Push (api/reminders.js); the mobile
// build feeds this plan to native local notifications (lib/mobile.js).
import { effectiveRoutineId } from './history.js'
import { isoOf } from './format.js'
import { goalOf, stepsOn } from './stepMetrics.js'
import { t, dateLocale } from './i18n.js'

export const PLAN_DAYS = 14
export const NUDGE_AFTER_MIN = 60
export const ID_BASE = 1000                 // native notification ids: ID_BASE … ID_BASE + 2·PLAN_DAYS
export const LEGACY_IDS = [100, 101, 102, 103, 104, 105, 106]   // the old weekday schedule

export const reminderPrefs = S => {
  const r = (S && S.reminder) || {}
  return { on: !!r.on, time: /^\d\d:\d\d$/.test(r.time || '') ? r.time : '08:00', nudge: r.nudge !== false, walk: !!r.walk }
}

/** Every reminder still to come in the next `days` days, in time order. */
export function planReminders(S, now = new Date(), days = PLAN_DAYS) {
  const r = reminderPrefs(S)
  if (!r.on) return []
  const [hh, mm] = r.time.split(':').map(Number)
  const trained = new Set((S.workouts || []).map(w => w.d))
  const out = []
  for (let i = 0; i < days; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hh, mm, 0, 0)
    const iso = isoOf(day)
    if (trained.has(iso)) continue
    const rid = effectiveRoutineId(S, iso)
    const routine = rid ? (S.routines || []).find(x => x.id === rid) : null
    if (routine) {
      out.push({ id: ID_BASE + i * 2, kind: 'workout', iso, at: day, routine: routine.name })
      if (r.nudge) out.push({ id: ID_BASE + i * 2 + 1, kind: 'nudge', iso, at: new Date(day.getTime() + NUDGE_AFTER_MIN * 60000), routine: routine.name })
    } else if (r.walk) {
      if (i === 0 && stepsOn(S, iso) >= goalOf(S)) continue
      out.push({ id: ID_BASE + i * 2, kind: 'walk', iso, at: day })
    }
  }
  return out.filter(x => x.at > now)
}

/** Title and body for a planned reminder, in the current language. */
export function reminderText(item, S) {
  const goal = goalOf(S).toLocaleString(dateLocale())
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
    reminderPrefs(S), S.week, S.dayPlan, (S.routines || []).map(r => [r.id, r.name]),
    (S.workouts || []).slice(-3).map(w => w.d), goalOf(S), isoOf(now),
    // a rest-day walk reminder disappears once today's goal is met
    reminderPrefs(S).walk && stepsOn(S, isoOf(now)) >= goalOf(S),
  ])
}
