// 9.0 — the day plan: your day as blocks of time — wake up, study, work, workout, rest, meals,
// drinks, water breaks, a walk, free time and sleep — from a template you can edit block by
// block. Start the day and it runs live: what is happening now, a countdown, what comes next,
// and the meals and drinks you planned are logged with their exact calories.
// Pure (no store, no DOM). Screen: views/DayPlan.jsx.
//
//   S.planner = {
//     v: 1, tpl, wake: 'HH:MM', sleep: 'HH:MM', remind: bool, auto: bool,
//     blocks: [{ id, k (kind), s (start, minutes after midnight), d (minutes), n? (own title),
//                meal? ('b'|'l'|'d'|'s'), items?: [{ t: 'r'|'d'|'f', id, q }], ml? (water) }],
//     days: { 'YYYY-MM-DD': { on (started at), done: { blockId: at }, skip: { blockId: at } } }
//   }
import { uid } from './format.js'
import { RECIPE_BY_ID, recipeNutrition } from './kitchen.js'
import { drinkOf, drinkNutrition, drinkFor } from './drinks.js'
import { FOOD_BY_ID } from './foodDb.js'

export const KINDS = {
  wake: { name: 'Wake up', icon: 'sun', color: '#ffd60a' },
  study: { name: 'Study', icon: 'book', color: '#5e5ce6' },
  work: { name: 'Work', icon: 'briefcase', color: '#0a84ff' },
  workout: { name: 'Workout', icon: 'dumbbell', color: '#ff375f' },
  rest: { name: 'Rest', icon: 'bed', color: '#40c8e0' },
  meal: { name: 'Meal', icon: 'fork', color: '#ff9f0a' },
  drink: { name: 'Drink', icon: 'cup', color: '#bf5af2' },
  water: { name: 'Water break', icon: 'drop', color: '#64d2ff' },
  walk: { name: 'Walk', icon: 'figureWalk', color: '#30d158' },
  free: { name: 'Free time', icon: 'sparkles', color: '#ff6482' },
  sleep: { name: 'Sleep', icon: 'moon', color: '#7d7aff' },
}
export const KIND_KEYS = Object.keys(KINDS)
export const MEAL_W = { b: 0.25, l: 0.35, d: 0.3, s: 0.1 }
export const PLAN_ID_BASE = 7700          // notification ids 7700–7799 (today 7700–7749, tomorrow 7750–7799)
const MAX_BLOCKS = 40

export const TEMPLATES = [
  { id: 'workout', name: 'Workout day', icon: 'dumbbell', desc: 'Study or work, a full workout and meals that fuel it.' },
  { id: 'study', name: 'Study day', icon: 'book', desc: 'Focused study blocks with short breaks, a quick workout.' },
  { id: 'student', name: 'Student athlete', icon: 'trophy', desc: 'Study in the morning, train in the afternoon.' },
  { id: 'rest', name: 'Rest day', icon: 'bed', desc: 'Light movement, good food and plenty of recovery.' },
  { id: 'ramadan', name: 'Ramadan', icon: 'moon', desc: 'Suhoor, iftar, a light workout after iftar.' },
  { id: 'custom', name: 'Start from scratch', icon: 'pencil', desc: 'Just your meals and sleep — add the rest.' },
]

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
export const toMin = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m }
export const toHHMM = m => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0') }
const num = v => (Number.isFinite(+v) ? +v : 0)
const h = s => toMin(s)

// [kind, start (on a 07:00–23:00 day), minutes, extra]
const T = {
  workout: [
    ['wake', '07:00', 15], ['water', '07:15', 5, { ml: 300 }], ['meal', '07:30', 30, { meal: 'b' }], ['study', '08:15', 120],
    ['rest', '10:15', 15], ['drink', '10:30', 10, { when: 'am' }], ['study', '10:45', 105], ['meal', '13:00', 45, { meal: 'l' }],
    ['rest', '13:45', 30], ['study', '14:30', 90], ['water', '16:00', 5, { ml: 300 }], ['drink', '17:00', 10, { when: 'pre' }],
    ['workout', '17:30', 60], ['drink', '18:30', 10, { when: 'post' }], ['meal', '19:30', 40, { meal: 'd' }], ['walk', '20:30', 20],
    ['free', '21:00', 60], ['drink', '22:15', 10, { when: 'pm' }], ['sleep', '23:00', 480],
  ],
  study: [
    ['wake', '07:00', 15], ['water', '07:15', 5, { ml: 300 }], ['meal', '07:30', 30, { meal: 'b' }], ['study', '08:00', 50], ['rest', '08:50', 10],
    ['study', '09:00', 50], ['drink', '09:50', 10, { when: 'am' }], ['study', '10:00', 50], ['rest', '10:50', 10], ['study', '11:00', 60],
    ['meal', '12:30', 45, { meal: 'l' }], ['rest', '13:15', 30], ['study', '14:00', 50], ['rest', '14:50', 10], ['study', '15:00', 50],
    ['water', '15:50', 5, { ml: 300 }], ['study', '16:00', 50], ['workout', '17:00', 30], ['walk', '17:30', 20], ['meal', '18:00', 15, { meal: 's' }],
    ['meal', '19:00', 40, { meal: 'd' }], ['study', '20:00', 60], ['free', '21:00', 60], ['drink', '22:15', 10, { when: 'pm' }], ['sleep', '23:00', 480],
  ],
  student: [
    ['wake', '07:00', 15], ['water', '07:15', 5, { ml: 300 }], ['meal', '07:30', 30, { meal: 'b' }], ['study', '08:00', 90], ['rest', '09:30', 15],
    ['study', '09:45', 90], ['drink', '11:15', 10, { when: 'am' }], ['study', '11:30', 60], ['meal', '12:30', 45, { meal: 'l' }], ['rest', '13:15', 30],
    ['study', '14:00', 90], ['meal', '15:30', 15, { meal: 's' }], ['drink', '16:30', 10, { when: 'pre' }], ['workout', '17:00', 75],
    ['drink', '18:15', 10, { when: 'post' }], ['meal', '19:30', 40, { meal: 'd' }], ['study', '20:30', 45], ['free', '21:30', 45],
    ['drink', '22:15', 10, { when: 'pm' }], ['sleep', '23:00', 480],
  ],
  rest: [
    ['wake', '07:00', 15], ['water', '07:15', 5, { ml: 300 }], ['meal', '07:45', 30, { meal: 'b' }], ['walk', '09:00', 30], ['free', '10:00', 120],
    ['drink', '12:00', 10, { when: 'after' }], ['meal', '13:00', 45, { meal: 'l' }], ['rest', '14:00', 60], ['water', '15:30', 5, { ml: 300 }],
    ['rest', '16:30', 20, { n: 'Stretching' }], ['free', '17:00', 90], ['meal', '19:00', 40, { meal: 'd' }], ['walk', '20:00', 30],
    ['free', '21:00', 60], ['drink', '22:15', 10, { when: 'pm' }], ['sleep', '23:00', 480],
  ],
  custom: [['wake', '07:00', 15], ['meal', '07:30', 30, { meal: 'b' }], ['meal', '13:00', 45, { meal: 'l' }], ['meal', '19:30', 40, { meal: 'd' }], ['sleep', '23:00', 480]],
}

/** Clean prefs: wake / sleep times (a day of at least 12 h, else 07:00–23:00). */
export function planPrefs(P) {
  const p = P || {}
  let wake = HHMM.test(p.wake || '') ? p.wake : '07:00'
  let sleep = HHMM.test(p.sleep || '') ? p.sleep : '23:00'
  const span = (toMin(sleep) - toMin(wake) + 1440) % 1440
  if (span < 12 * 60 || span > 20 * 60) { wake = '07:00'; sleep = '23:00' }
  return { wake, sleep }
}

const block = (k, s, d, x = {}) => {
  const b = { id: 'b' + uid(), k, s: ((Math.round(s) % 1440) + 1440) % 1440, d: Math.max(5, Math.round(d)) }
  if (x.n) b.n = x.n
  if (k === 'meal') { b.meal = x.meal || 'l'; b.items = x.items || [] }
  if (k === 'drink') b.items = x.items || []
  if (k === 'water') b.ml = x.ml || 250
  return b
}

/**
 * The blocks of a template for your wake / sleep times. Every start is moved from the
 * 07:00–23:00 reference day onto yours (scaled when your day is longer or shorter), durations
 * are kept but never run into the next block. Drinks get a suggestion that fits the moment.
 */
export function buildTemplate(tpl, prefs = {}, { suhoor = '04:30', iftar = '18:30', seed = 0 } = {}) {
  if (tpl === 'ramadan') return ramadan(HHMM.test(suhoor) ? suhoor : '04:30', HHMM.test(iftar) ? iftar : '18:30', seed)
  const rows = T[tpl] || T.custom
  const { wake, sleep } = planPrefs(prefs)
  const W = toMin(wake), A = (toMin(sleep) - W + 1440) % 1440
  const k = A / 960
  const out = rows.map(([kind, at, d, x], i) => {
    const s = kind === 'sleep' ? W + A : W + (h(at) - 420) * k
    const extra = { ...(x || {}) }
    if (kind === 'drink') { const dr = drinkFor(extra.when || 'any', seed + i); extra.items = [{ t: 'd', id: dr.id, q: 1 }] }
    return block(kind, s, kind === 'sleep' ? 1440 - A : d, extra)
  })
  return fitBlocks(out)
}

function ramadan(suhoor, iftar, seed) {
  const S = toMin(suhoor), I = toMin(iftar)
  const out = [
    block('meal', S - 50, 30, { meal: 'b', n: 'Suhoor' }),
    block('water', S - 15, 10, { ml: 500 }),
    block('sleep', S + 30, Math.max(60, (8 * 60 + 30) - ((S + 30) % 1440))),
    block('study', 9 * 60, 180),
    block('rest', 12 * 60 + 15, 30),
    block('study', 13 * 60, 120),
    block('rest', 15 * 60 + 30, 60),
    block('water', I, 5, { ml: 300 }),
    block('meal', I + 5, 40, { meal: 'l', n: 'Iftar' }),
    block('drink', I + 50, 10, { items: [{ t: 'd', id: seed % 2 ? 'tamarhindi' : 'qamaraldin', q: 1 }] }),
    block('walk', I + 75, 20),
    block('workout', I + 120, 45),
    block('drink', I + 170, 10, { items: [{ t: 'd', id: 'chocrecovery', q: 1 }] }),
    block('meal', I + 210, 25, { meal: 'd', n: 'Light dinner' }),
    block('sleep', Math.min(23 * 60 + 30, I + 270), 0),
  ]
  const last = out[out.length - 1]
  last.d = Math.max(60, ((S - 50) - last.s + 1440) % 1440)
  return fitBlocks(out)
}

/** Sort by start and trim a block that would run into the next one (sleep may cross midnight). */
export function fitBlocks(blocks) {
  const b = [...(blocks || [])].filter(x => x && KINDS[x.k]).slice(0, MAX_BLOCKS).map(x => ({ ...x, s: ((Math.round(num(x.s)) % 1440) + 1440) % 1440, d: Math.max(5, Math.round(num(x.d) || 5)) }))
  b.sort((x, y) => x.s - y.s)
  for (let i = 0; i < b.length - 1; i++) {
    if (b[i].k === 'sleep') continue
    const room = b[i + 1].s - b[i].s
    if (room > 0 && b[i].d > room) b[i].d = Math.max(5, room)
  }
  return b
}

/** A fresh plan from a template (keeps your reminder settings). */
export function newPlan(tpl, prev = {}, opts = {}) {
  const prefs = planPrefs({ wake: prev.wake, sleep: prev.sleep, ...opts.prefs })
  return { v: 1, tpl, ...prefs, remind: !!prev.remind, auto: !!prev.auto, blocks: buildTemplate(tpl, prefs, opts), days: prev.days || {} }
}

export function normPlan(P) {
  if (!P || typeof P !== 'object' || !Array.isArray(P.blocks)) return null
  const prefs = planPrefs(P)
  return { v: 1, tpl: P.tpl || 'custom', ...prefs, remind: !!P.remind, auto: !!P.auto, blocks: fitBlocks(P.blocks), days: P.days && typeof P.days === 'object' ? P.days : {} }
}

// ---- calories -------------------------------------------------------------------------------------
/** One planned item → { kcal, ml, name (t() key or own name), own }. */
export function itemInfo(S, it) {
  const q = Math.max(0.5, num(it && it.q) || 1)
  if (!it) return null
  if (it.t === 'r') { const r = RECIPE_BY_ID[it.id]; if (!r) return null; return { kcal: Math.round(recipeNutrition(r).kcal * q), ml: 0, name: r.name, own: false, q } }
  if (it.t === 'd') { const d = drinkOf(S, it.id); if (!d) return null; const n = drinkNutrition(d); return { kcal: Math.round(n.kcal * q), ml: Math.round(n.ml * q), name: d.name, own: !!d.mine, q, col: d.col } }
  if (it.t === 'f') { const f = FOOD_BY_ID[it.id]; if (!f) return null; return { kcal: Math.round(num(f.kcal) * (f.g || 100) / 100 * q), ml: 0, name: f.name, own: false, q } }
  return null
}
export const blockKcal = (S, b) => (b.items || []).reduce((a, it) => a + ((itemInfo(S, it) || {}).kcal || 0), 0)
export const blockMl = (S, b) => (b.k === 'water' ? num(b.ml) : 0) + (b.items || []).reduce((a, it) => a + ((itemInfo(S, it) || {}).ml || 0), 0)

/**
 * Calorie targets per meal: what is left of your goal after the planned drinks, shared between
 * the meals by the usual split (breakfast 25 %, lunch 35 %, dinner 30 %, snack 10 %).
 */
export function mealTargets(S, blocks, goal) {
  const meals = blocks.filter(b => b.k === 'meal')
  const drinks = blocks.filter(b => b.k === 'drink').reduce((a, b) => a + blockKcal(S, b), 0)
  const left = Math.max(0, goal - drinks)
  const w = meals.reduce((a, b) => a + (MEAL_W[b.meal] || 0.2), 0) || 1
  return Object.fromEntries(meals.map(b => [b.id, Math.round(left * (MEAL_W[b.meal] || 0.2) / w / 10) * 10]))
}

/** The day at a glance: planned calories (meals + drinks) vs the goal, water, minutes per kind. */
export function planTotals(S, blocks, goal) {
  const t = { kcal: 0, goal, ml: 0, min: Object.fromEntries(KIND_KEYS.map(k => [k, 0])), meals: 0, drinks: 0 }
  for (const b of blocks) {
    const k = blockKcal(S, b)
    t.kcal += k
    if (b.k === 'meal') t.meals += k
    if (b.k === 'drink') t.drinks += k
    t.ml += blockMl(S, b)
    t.min[b.k] += b.d
  }
  return t
}

// ---- live -------------------------------------------------------------------------------------------
const nowMinOf = d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
/** Where a block sits in the day relative to `now`: its start / end as minutes on today's clock. */
function span(b, nowMin) {
  let s = b.s, e = b.s + b.d
  if (e > 1440 && nowMin < e - 1440) { s -= 1440; e -= 1440 }      // a sleep that started yesterday
  return [s, e]
}
/**
 * The live state: each block with a status (done, skipped, now, next, later, missed), the block
 * running now, the next one, minutes left in the current one and how much of the day is done.
 */
export function liveState(plan, day, now = new Date()) {
  const m = nowMinOf(now)
  const rec = day || {}
  const done = rec.done || {}, skip = rec.skip || {}
  let cur = null, next = null
  const items = plan.blocks.map(b => {
    const [s, e] = span(b, m)
    let st = done[b.id] ? 'done' : skip[b.id] ? 'skipped' : m >= s && m < e ? 'now' : m < s ? 'later' : 'missed'
    if (st === 'now' && !cur) cur = { b, left: e - m, pct: (m - s) / Math.max(1, e - s) }
    return { b, s, e, st }
  })
  for (const x of items) if (x.st === 'later') { next = { b: x.b, inMin: x.s - m }; x.st = 'next'; break }
  const doable = items.filter(x => x.b.k !== 'sleep' && x.b.k !== 'free')
  const finished = doable.filter(x => x.st === 'done').length
  return { items, cur, next, done: finished, total: doable.length, pct: doable.length ? finished / doable.length : 0, nowMin: m }
}

export function dayRec(plan, iso) { return (plan && plan.days && plan.days[iso]) || null }
export const isLive = (plan, iso) => !!plan && (!!(plan.days && plan.days[iso] && plan.days[iso].on) || !!plan.auto)

// ---- mutators (inside update(s => …)) ------------------------------------------------------------
function rec(s, iso) {
  s.planner.days = s.planner.days || {}
  const d = s.planner.days[iso] || { on: 0, done: {}, skip: {} }
  d.done = d.done || {}; d.skip = d.skip || {}
  s.planner.days[iso] = d
  const keep = Object.keys(s.planner.days).sort().slice(-30)
  for (const k of Object.keys(s.planner.days)) if (!keep.includes(k)) delete s.planner.days[k]
  return d
}
export function startDay(s, iso, now = Date.now()) { const d = rec(s, iso); d.on = d.on || now }
export function stopDay(s, iso) { const d = rec(s, iso); d.on = 0; if (s.planner) s.planner.auto = false }
export function markBlock(s, iso, id, how = 'done', now = Date.now()) {
  const d = rec(s, iso)
  delete d.done[id]; delete d.skip[id]
  if (how === 'done') d.done[id] = now
  else if (how === 'skip') d.skip[id] = now
}
export function upsertBlock(s, b) {
  const P = s.planner
  const i = P.blocks.findIndex(x => x.id === b.id)
  const clean = block(b.k, b.s, b.d, { n: b.n, meal: b.meal, items: (b.items || []).slice(0, 8), ml: b.ml })
  clean.id = b.id || clean.id
  if (i >= 0) P.blocks[i] = clean; else if (P.blocks.length < MAX_BLOCKS) P.blocks.push(clean)
  P.blocks = fitBlocks(P.blocks)
  return clean.id
}
export function removeBlock(s, id) { s.planner.blocks = s.planner.blocks.filter(b => b.id !== id) }
/** Move every block from `fromId` on by `min` minutes (a late start, an extra 10 minutes…). */
export function shiftFrom(s, fromId, min) {
  const P = s.planner
  const i = P.blocks.findIndex(b => b.id === fromId)
  if (i < 0) return
  P.blocks = fitBlocks(P.blocks.map((b, k) => (k >= i && b.k !== 'sleep' ? { ...b, s: b.s + min } : b)))
}

// ---- reminders ------------------------------------------------------------------------------------
/**
 * Date-specific notifications for the blocks still ahead today and — with "every day" on —
 * tomorrow. Each one carries its own text for that date (so a reminder never shows a stale plan).
 * `tr(key, ...args)` translates; `fmtTime(min)` formats a clock time.
 */
export function planNotifications(S, plan, now = new Date(), tr = (k, ...a) => k.replace(/\{(\d)\}/g, (_, i) => a[i]), fmtTime = toHHMM) {
  if (!plan) return []
  const out = []
  const days = plan.auto ? [0, 1] : [0]
  const iso0 = isoOf(now)
  for (const off of days) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off)
    const iso = isoOf(base)
    if (off === 0 && !isLive(plan, iso0)) continue
    const rec0 = dayRec(plan, iso) || {}
    plan.blocks.forEach((b, i) => {
      if (b.k === 'sleep' && b.s < 6 * 60) return
      if ((rec0.done || {})[b.id] || (rec0.skip || {})[b.id]) return
      const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(b.s / 60), b.s % 60)
      if (at.getTime() <= now.getTime() + 30000) return
      const kind = KINDS[b.k]
      const title = (b.n ? tr(b.n) : tr(kind.name)) + ' · ' + fmtTime(b.s)
      let body
      if (b.k === 'meal' || b.k === 'drink') {
        const its = (b.items || []).map(it => itemInfo(S, it)).filter(Boolean)
        const kcal = its.reduce((a, x) => a + x.kcal, 0)
        body = its.length ? tr('{0} kcal planned: {1}', kcal, its.map(x => (x.own ? x.name : tr(x.name))).join(', ')) : tr('Time to eat — keep it to your plan.')
      } else if (b.k === 'water') body = tr('Drink {0} ml of water.', b.ml || 250)
      else if (b.k === 'workout') body = tr('Time to train — {0} min. Let’s go!', b.d)
      else if (b.k === 'study') body = tr('Focus for {0} min — put the phone face down.', b.d)
      else if (b.k === 'work') body = tr('Deep work for {0} min.', b.d)
      else if (b.k === 'rest') body = tr('Rest and recharge for {0} min.', b.d)
      else if (b.k === 'walk') body = tr('A {0}-minute walk — fresh air and steps.', b.d)
      else if (b.k === 'sleep') body = tr('Wind down — screens off, lights low.')
      else if (b.k === 'wake') body = tr('Good morning! Your plan for today is ready.')
      else body = tr('{0} min for yourself.', b.d)
      out.push({ id: PLAN_ID_BASE + off * 50 + Math.min(49, i), at, title, body, kind: b.k })
    })
  }
  return out
}
const isoOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
