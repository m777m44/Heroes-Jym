import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueReminder, effectiveRoutineId, WINDOW } from '../reminders.js';

// 2026-10-10 is a Saturday (getDay() 6).
const S = (over = {}) => ({
  reminder: { on: true, time: '18:00', tz: 'UTC' },
  routines: [{ id: 'a', name: 'Push', emoji: '💪' }],
  week: { 6: 'a' }, dayPlan: {}, workouts: [], steps: {}, stepGoal: 8000,
  ...over,
});
const at = hhmm => ({ date: '2026-10-10', hhmm });

test('fires the workout reminder at its time, with the step goal in the body', () => {
  const r = dueReminder(S(), at('18:00'));
  assert.equal(r.kind, 'workout');
  assert.equal(r.flag, 'lastReminder');
  assert.equal(r.payload.title, '💪 Push today');
  assert.match(r.payload.body, /Step goal: 8,000/);
});

test('reports steps walked so far when there are some', () => {
  const r = dueReminder(S({ steps: { '2026-10-10': { n: 3250 } } }), at('18:00'));
  assert.match(r.payload.body, /3,250 \/ 8,000 steps so far/);
});

test('stays due for a window, not just the exact minute — but only once a day', () => {
  assert.equal(dueReminder(S(), at('18:07')).kind, 'workout');
  assert.equal(dueReminder(S(), at(`18:${String(WINDOW).padStart(2, '0')}`)), null);
  assert.equal(dueReminder(S(), at('17:59')), null);
  assert.equal(dueReminder(S(), at('18:03'), { lastReminder: '2026-10-10' }), null);
});

test('stays quiet once today is trained, when off, or on a rest day', () => {
  assert.equal(dueReminder(S({ workouts: [{ d: '2026-10-10' }] }), at('18:00')), null);
  assert.equal(dueReminder(S({ reminder: { on: false, time: '18:00' } }), at('18:00')), null);
  assert.equal(dueReminder(S({ dayPlan: { '2026-10-10': 'rest' } }), at('18:00')), null);
});

test('nudges an hour later if the first reminder went unanswered', () => {
  const flags = { lastReminder: '2026-10-10' };
  const r = dueReminder(S(), at('19:00'), flags);
  assert.equal(r.kind, 'nudge');
  assert.equal(r.flag, 'lastNudge');
  assert.match(r.payload.title, /Still time for Push/);
  // not without the first reminder, not twice, not when turned off
  assert.equal(dueReminder(S(), at('19:00')), null);
  assert.equal(dueReminder(S(), at('19:02'), { ...flags, lastNudge: '2026-10-10' }), null);
  assert.equal(dueReminder(S({ reminder: { on: true, time: '18:00', nudge: false } }), at('19:00'), flags), null);
});

test('reminds to walk on a rest day until the step goal is met', () => {
  const rest = S({ dayPlan: { '2026-10-10': 'rest' }, reminder: { on: true, time: '18:00', walk: true } });
  const r = dueReminder(rest, at('18:00'));
  assert.equal(r.kind, 'walk');
  assert.equal(r.flag, 'lastWalk');
  assert.equal(dueReminder({ ...rest, steps: { '2026-10-10': { n: 8000 } } }, at('18:00')), null);
  assert.equal(dueReminder(rest, at('18:00'), { lastWalk: '2026-10-10' }), null);
});

test('day overrides decide what is planned', () => {
  assert.equal(effectiveRoutineId(S({ dayPlan: { '2026-10-11': 'a' } }), '2026-10-11'), 'a');
  assert.equal(effectiveRoutineId(S(), '2026-10-11'), null);
  assert.equal(effectiveRoutineId(S({ dayPlan: { '2026-10-10': 'gone' } }), '2026-10-10'), 'a');
});

test('ignores malformed input instead of throwing', () => {
  assert.equal(dueReminder(null, at('18:00')), null);
  assert.equal(dueReminder(S({ reminder: { on: true, time: 'evening' } }), at('18:00')), null);
  assert.equal(dueReminder(S(), null), null);
});
