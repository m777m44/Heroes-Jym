/* Daily reminder rules for Web Push — the server half of frontend/src/lib/dailyReminder.js.
 *
 * Checked every few seconds for every subscribed profile (see server.js). For one profile and
 * "now" in that profile's own timezone, decides which reminder (if any) is due:
 *
 *   workout  — a routine is planned today, nothing logged yet, at the chosen time. The body
 *              carries today's step count against the goal: one combined notification.
 *   nudge    — the same day, still nothing logged an hour later (S.reminder.nudge, default on)
 *   walk     — a rest day, today's step goal not met yet (S.reminder.walk, default off)
 *
 * Each kind fires at most once a day, tracked by a per-user date flag. A reminder is due for
 * WINDOW minutes after its time rather than on the exact minute, so a server restart or a
 * slow tick around the target minute doesn't swallow the day's reminder.
 *
 * Pure: no I/O, no clock — server.js passes "now" in and persists the flag it gets back.
 */

export const WINDOW = 10;          // minutes a reminder stays due after its time
export const NUDGE_AFTER = 60;     // minutes after the main reminder
export const DEFAULT_GOAL = 10000;

const toMin = hhmm => {
  const m = /^(\d\d):(\d\d)$/.exec(hhmm || '');
  return m ? +m[1] * 60 + +m[2] : null;
};
const inWindow = (now, target) => target !== null && now >= target && now < target + WINDOW;

// Duplicated (not imported) from frontend/src/lib/history.js — tiny pure helper, not worth
// sharing across the two runtimes. Kept identical to the copy server.js used before.
export function effectiveRoutineId(S, iso) {
  const ov = S.dayPlan?.[iso];
  if (ov === 'rest') return null;
  if (ov && S.routines?.some(r => r.id === ov)) return ov;
  const wd = new Date(iso + 'T12:00:00').getDay();
  return S.week?.[wd] || null;
}

const goalOf = S => (Number.isFinite(S.stepGoal) && S.stepGoal > 0 ? S.stepGoal : DEFAULT_GOAL);
const stepsOn = (S, iso) => S.steps?.[iso]?.n || 0;
const fmt = n => Math.round(n).toLocaleString('en-US');

/**
 * @param S     the profile's state
 * @param now   { date: 'YYYY-MM-DD', hhmm: 'HH:MM' } in the profile's timezone
 * @param flags { lastReminder, lastNudge, lastWalk } — dates each kind last fired
 * @returns     { kind, flag, payload: { title, body, tag } } or null
 */
export function dueReminder(S, now, flags = {}) {
  const r = S?.reminder;
  if (!r?.on || !now) return null;
  const at = toMin(r.time);
  const cur = toMin(now.hhmm);
  if (at === null || cur === null) return null;
  if ((S.workouts || []).some(w => w.d === now.date)) return null;   // already trained today

  const goal = goalOf(S);
  const steps = stepsOn(S, now.date);
  const stepLine = steps > 0
    ? `${fmt(steps)} / ${fmt(goal)} steps so far.`
    : `Step goal: ${fmt(goal)}.`;

  const rid = effectiveRoutineId(S, now.date);
  const routine = rid ? (S.routines || []).find(x => x.id === rid) : null;

  if (routine) {
    if (flags.lastReminder !== now.date && inWindow(cur, at)) {
      return {
        kind: 'workout', flag: 'lastReminder',
        payload: { title: `${routine.emoji || '🏋️'} ${routine.name} today`, body: `It's on your plan — let's go 💪 ${stepLine}`, tag: 'day-reminder', url: './#/' },
      };
    }
    if (r.nudge !== false && flags.lastReminder === now.date && flags.lastNudge !== now.date && inWindow(cur, at + NUDGE_AFTER)) {
      return {
        kind: 'nudge', flag: 'lastNudge',
        payload: { title: `⏰ Still time for ${routine.name}`, body: `You haven't logged today's workout yet — even a short session counts. ${stepLine}`, tag: 'day-reminder', url: './#/' },
      };
    }
    return null;
  }

  if (r.walk && steps < goal && flags.lastWalk !== now.date && inWindow(cur, at)) {
    return {
      kind: 'walk', flag: 'lastWalk',
      payload: { title: '🚶 Rest day — time for a walk?', body: stepLine, tag: 'walk-reminder', url: './#/walk' },
    };
  }
  return null;
}
