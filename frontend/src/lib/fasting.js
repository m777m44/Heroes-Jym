// Fasting tracker (8.0) — intermittent fasting plans (12:12 … OMAD), a custom length, and
// Ramadan (fast from suhoor until iftar, at the times you set).
//
// State lives in S.fasting: { plan, custom, active: { start, goalH, plan } | null,
// log: [{ start, end, goalH, plan }], suhoor: 'HH:MM', iftar: 'HH:MM', remind }.
// Everything here is pure: the screen, the Home card and the reminder all read from it.
import { U } from './i18n.js'

export const PLANS = [
  { id: '12', fast: 12, name: '12:12', sub: 'Gentle start' },
  { id: '14', fast: 14, name: '14:10', sub: 'Easy daily rhythm' },
  { id: '16', fast: 16, name: '16:8', sub: 'The most popular' },
  { id: '18', fast: 18, name: '18:6', sub: 'Advanced' },
  { id: '20', fast: 20, name: '20:4', sub: 'Warrior' },
  { id: 'omad', fast: 23, name: '23:1', sub: 'One meal a day' },
  { id: 'ramadan', fast: 0, name: 'Ramadan', sub: 'From suhoor to iftar' },
  { id: 'custom', fast: 0, name: 'Custom', sub: 'Your own length' },
]
export const planById = id => PLANS.find(p => p.id === id) || PLANS[2]

/**
 * What the body goes through, roughly, by hours fasted. Approximate and different for everyone
 * — shown as a motivating guide, not medical fact. `name`/`desc` are i18n keys.
 */
export const STAGES = [
  { h: 0, id: 'fed', icon: 'fork', name: 'Digesting', desc: 'Blood sugar rises after your last meal, then insulin brings it back down.' },
  { h: 4, id: 'falling', icon: 'chart', name: 'Blood sugar settles', desc: 'Insulin falls and the body starts using its stored sugar (glycogen).' },
  { h: 12, id: 'burning', icon: 'flame', name: 'Fat burning', desc: 'Stored sugar runs low — the body turns to fat for more of its energy.' },
  { h: 16, id: 'ketosis', icon: 'bolt', name: 'Ketosis', desc: 'The liver makes ketones from fat — steady energy for brain and muscles.' },
  { h: 24, id: 'autophagy', icon: 'sparkles', name: 'Deep clean-up', desc: 'Cells step up recycling their old parts (autophagy).' },
]

export function stageAt(hours) {
  let s = STAGES[0]
  for (const st of STAGES) if (hours >= st.h) s = st
  return s
}
export const nextStage = hours => STAGES.find(st => st.h > hours) || null

const H = 3600000
const hm = s => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''))
  return m ? Math.min(23, +m[1]) * 60 + Math.min(59, +m[2]) : null
}

/** The next moment a 'HH:MM' clock time comes round after `from` (ms) — today or tomorrow. */
export function nextAt(clockHM, from = Date.now()) {
  const mins = hm(clockHM)
  if (mins == null) return null
  const d = new Date(from)
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
  if (d.getTime() <= from) d.setDate(d.getDate() + 1)
  return d.getTime()
}

/** How many hours a fast started at `start` aims for, under the chosen plan. */
export function goalHours(F = {}, start = Date.now()) {
  const plan = planById(F.plan)
  if (plan.id === 'custom') return Math.max(1, Math.min(72, Number(F.custom) || 16))
  if (plan.id === 'ramadan') {
    const end = nextAt(F.iftar || '18:00', start)
    return end ? Math.max(1, Math.round(((end - start) / H) * 100) / 100) : 14
  }
  return plan.fast
}

/** A new fast, starting now (or at `start`). */
export function startFast(F = {}, start = Date.now()) {
  return { start, goalH: goalHours(F, start), plan: planById(F.plan).id }
}

/** The running fast right now: { elapsedH, goalH, pct, leftMs, endsAt, stage, next, done }. */
export function fastStatus(active, now = Date.now()) {
  if (!active || !active.start) return null
  const elapsedMs = Math.max(0, now - active.start)
  const goalMs = (Number(active.goalH) || 16) * H
  const elapsedH = elapsedMs / H
  return {
    elapsedMs, elapsedH, goalH: Number(active.goalH) || 16, goalMs,
    pct: Math.min(1, elapsedMs / goalMs), leftMs: Math.max(0, goalMs - elapsedMs), endsAt: active.start + goalMs,
    stage: stageAt(elapsedH), next: nextStage(elapsedH), done: elapsedMs >= goalMs,
  }
}

/** End the running fast → the log entry ({ start, end, goalH, plan, hit }). */
export function endFast(active, end = Date.now()) {
  if (!active) return null
  const hours = (end - active.start) / H
  return { start: active.start, end, goalH: active.goalH, plan: active.plan, hit: hours >= (Number(active.goalH) || 16) - 0.01 }
}

const dayOf = ms => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }

/**
 * Totals over the log: { count, hit, totalH, longestH, avgH, streak } — the streak counts days
 * in a row (ending today or yesterday) on which a fast that reached its goal ended.
 */
export function fastStats(log = [], now = Date.now()) {
  const L = (log || []).filter(e => e && e.end > e.start)
  const hours = L.map(e => (e.end - e.start) / H)
  const hitDays = new Set(L.filter(e => e.hit).map(e => dayOf(e.end)))
  let streak = 0
  const d = new Date(now)
  if (!hitDays.has(dayOf(d.getTime()))) d.setDate(d.getDate() - 1)
  while (hitDays.has(dayOf(d.getTime()))) { streak++; d.setDate(d.getDate() - 1) }
  return {
    count: L.length,
    hit: L.filter(e => e.hit).length,
    totalH: Math.round(hours.reduce((a, b) => a + b, 0)),
    longestH: hours.length ? Math.round(Math.max(...hours) * 10) / 10 : 0,
    avgH: hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : 0,
    streak,
  }
}

/** The last `n` days for the week strip: [{ d, hours, hit }] oldest first. */
export function lastDays(log = [], n = 7, now = Date.now()) {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(now); day.setDate(day.getDate() - i)
    const key = dayOf(day.getTime())
    const ended = (log || []).filter(e => e && dayOf(e.end) === key)
    const hours = ended.reduce((a, e) => Math.max(a, (e.end - e.start) / H), 0)
    out.push({ d: key, hours: Math.round(hours * 10) / 10, hit: ended.some(e => e.hit) })
  }
  return out
}

/** "14h 05m" (Arabic "14س 05د" — the app's own unit labels, lib/i18n.js U) */
export function hmText(ms) {
  const m = Math.max(0, Math.floor(ms / 60000))
  return Math.floor(m / 60) + U('h') + ' ' + String(m % 60).padStart(2, '0') + U('mn')
}
/** "16h" */
export const hText = h => h + U('h')

/** Clean a stored fasting object (old/partial data, bad times). */
export function normFasting(F) {
  const f = F && typeof F === 'object' ? F : {}
  return {
    plan: planById(f.plan).id,
    custom: Math.max(1, Math.min(72, Number(f.custom) || 16)),
    active: f.active && Number(f.active.start) > 0 ? { start: Number(f.active.start), goalH: Number(f.active.goalH) || 16, plan: planById(f.active.plan).id } : null,
    log: Array.isArray(f.log) ? f.log.filter(e => e && e.end > e.start).slice(-400) : [],
    suhoor: hm(f.suhoor) != null ? f.suhoor : '04:30',
    iftar: hm(f.iftar) != null ? f.iftar : '18:00',
    remind: f.remind !== false,
  }
}
