// 9.0 — the day plan: your day as blocks of time — wake up, study, work, workout, rest, meals,
// drinks, water breaks, a walk, free time and sleep — from a template you can edit block by
// block. Start the day and it runs live: what is happening now, a countdown, what comes next,
// and the meals and drinks you planned are logged with their exact calories.
// 10.0 — "My schedule": every block can run on chosen weekdays (school Sunday–Thursday, a
// different weekend), has an end time, your own notes, its own reminder (at the start or 5–60 min
// before) and can carry food, drinks, soft drinks and nuts. A school week template (7:30–12:40,
// then lunch, rest, homework, work, drinks and dinner) and school / prayer / other blocks.
// Reminders follow the schedule every day (a week ahead) and show everything you wrote and chose.
// Pure (no store, no DOM). Screen: views/DayPlan.jsx.
//
//   S.planner = {
//     v: 1, tpl, wake: 'HH:MM', sleep: 'HH:MM', remind: bool, auto: bool,
//     blocks: [{ id, k (kind), s (start, minutes after midnight), d (minutes), n? (own title),
//                w? ([0–6] weekdays, getDay numbers; missing = every day), nt? (notes), rm? (reminder:
//                -1 off, 0 at the start, N minutes before), meal? ('b'|'l'|'d'|'s'),
//                items?: [{ t: 'r'|'d'|'f'|'s'|'n', id, q, ml?, pk?, g?, fm? }], ml? (water) }],
//     days: { 'YYYY-MM-DD': { on (started at), off? (stopped: no reminders), done: { blockId: at }, skip: { blockId: at } } }
//   }
import { uid } from './format.js'
import { RECIPE_BY_ID, recipeNutrition } from './kitchen.js'
import { drinkOf, drinkNutrition, drinkFor } from './drinks.js'
import { FOOD_BY_ID } from './foodDb.js'
import { SODA_BY_ID, sodaNutrition, packFor } from './sodas.js'
import { NUT_BY_ID, nutNutrition } from './nuts.js'

export const KINDS = {
  wake: { name: 'Wake up', icon: 'sun', color: '#ffd60a' },
  school: { name: 'School', icon: 'school', color: '#c08552' },
  study: { name: 'Study', icon: 'book', color: '#5e5ce6' },
  work: { name: 'Work', icon: 'briefcase', color: '#0a84ff' },
  workout: { name: 'Workout', icon: 'dumbbell', color: '#ff375f' },
  rest: { name: 'Rest', icon: 'bed', color: '#40c8e0' },
  meal: { name: 'Meal', icon: 'fork', color: '#ff9f0a' },
  drink: { name: 'Drink', icon: 'cup', color: '#bf5af2' },
  water: { name: 'Water break', icon: 'drop', color: '#64d2ff' },
  walk: { name: 'Walk', icon: 'figureWalk', color: '#30d158' },
  prayer: { name: 'Prayer', icon: 'prayer', color: '#1fa98c' },
  free: { name: 'Free time', icon: 'sparkles', color: '#ff6482' },
  other: { name: 'Other', icon: 'star', color: '#8e8e93' },
  sleep: { name: 'Sleep', icon: 'moon', color: '#7d7aff' },
}
export const KIND_KEYS = Object.keys(KINDS)
export const MEAL_W = { b: 0.25, l: 0.35, d: 0.3, s: 0.1 }
export const PLAN_ID_BASE = 7700          // phone fallback (LocalNotifications): 7700–7759
export const PLAN_NATIVE_BASE = 8200      // the native PlanReminder: notification ids 8200–8399
export const PLAN_REMIND_DAYS = 7         // reminders are armed a week ahead …
export const PLAN_REMIND_MAX = 150        // … but never more than this many at once (alarm budget)
export const REMIND_OPTS = [-1, 0, 5, 10, 15, 30, 60]
export const DAY_ALL = [0, 1, 2, 3, 4, 5, 6]
export const SCHOOL_DAYS = [0, 1, 2, 3, 4] // Sunday–Thursday
export const WEEKEND = [5, 6]              // Friday and Saturday
export const NOTE_MAX = 300
const MAX_BLOCKS = 60
const ITEMS_MAX = 8

export const TEMPLATES = [
  { id: 'school', name: 'School week', icon: 'school', desc: 'School Sunday to Thursday, 7:30 to 12:40 — then lunch, rest, homework, work, drinks and dinner. Friday and Saturday have their own plan.' },
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

// 10.0 — the school week, at fixed times: school 07:30–12:40 Sunday to Thursday, the afternoon for
// lunch, rest, homework, work, drinks and a workout; Friday and Saturday slower. Thursday and Friday
// nights run later, Saturday night is early again for school on Sunday.
const SD = SCHOOL_DAYS, WE = WEEKEND
const SCHOOL = [
  ['wake', '06:30', 15, { w: SD }], ['water', '06:45', 5, { ml: 300, w: SD }], ['meal', '06:50', 25, { meal: 'b', w: SD }],
  ['school', '07:30', 310, { w: SD, rm: 10 }],
  ['meal', '13:00', 40, { meal: 'l', w: SD }], ['rest', '13:45', 45, { w: SD }], ['study', '14:30', 90, { n: 'Homework', w: SD }],
  ['meal', '16:00', 15, { meal: 's', w: SD, items: [{ t: 'n', id: 'almond', fm: 'raw', g: 25, q: 1 }] }], ['drink', '16:15', 10, { when: 'after', w: SD }],
  ['work', '16:30', 120, { w: SD }], ['water', '18:30', 5, { ml: 300, w: SD }], ['workout', '18:45', 60, { w: SD }],
  ['drink', '19:50', 10, { when: 'post', w: SD }], ['meal', '20:15', 40, { meal: 'd', w: SD }], ['free', '21:00', 60, { w: SD }],
  ['drink', '22:05', 10, { when: 'pm', w: [0, 1, 2, 3] }], ['sleep', '22:30', 480, { w: [0, 1, 2, 3, 6] }], ['sleep', '23:30', 540, { w: [4, 5] }],
  ['wake', '08:30', 15, { w: WE }], ['water', '08:45', 5, { ml: 300, w: WE }], ['meal', '09:00', 30, { meal: 'b', w: WE }],
  ['walk', '10:00', 30, { w: WE }], ['free', '10:45', 120, { w: WE }], ['meal', '13:30', 45, { meal: 'l', w: WE }],
  ['rest', '14:30', 60, { w: WE }], ['drink', '16:00', 10, { when: 'after', w: WE }], ['study', '16:30', 60, { n: 'Homework', w: WE }],
  ['workout', '17:45', 60, { w: WE }], ['water', '18:50', 5, { ml: 300, w: WE }], ['meal', '19:30', 40, { meal: 'd', w: WE }],
  ['free', '20:30', 90, { w: [5] }], ['free', '20:30', 75, { w: [6] }], ['drink', '21:50', 10, { when: 'pm', w: [6] }],
]

/** Clean prefs: wake / sleep times (a day of at least 12 h, else 07:00–23:00). */
export function planPrefs(P) {
  const p = P || {}
  let wake = HHMM.test(p.wake || '') ? p.wake : '07:00'
  let sleep = HHMM.test(p.sleep || '') ? p.sleep : '23:00'
  const span = (toMin(sleep) - toMin(wake) + 1440) % 1440
  if (span < 12 * 60 || span > 20 * 60) { wake = '07:00'; sleep = '23:00' }
  return { wake, sleep }
}

/** Clean weekdays: sorted unique 0–6; every day (or nothing valid) → undefined. */
export function cleanDays(w) {
  if (!Array.isArray(w)) return undefined
  const x = [...new Set(w.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
  return x.length && x.length < 7 ? x : undefined
}
const cleanItem = it => {
  if (!it || !['r', 'd', 'f', 's', 'n'].includes(it.t) || !it.id) return null
  const o = { t: it.t, id: String(it.id), q: Math.min(20, Math.max(0.5, num(it.q) || 1)) }
  if (it.t === 's') { const p = packFor(SODA_BY_ID[it.id], it.pk, it.ml); o.pk = p.pk; o.ml = p.ml }
  if (it.t === 'n') { o.g = Math.min(500, Math.max(1, Math.round(num(it.g) || 30))); if (it.fm) o.fm = String(it.fm) }
  return o
}
export const hasItems = k => k !== 'sleep' && k !== 'wake' && k !== 'water'

const block = (k, s, d, x = {}) => {
  const b = { id: 'b' + uid(), k, s: ((Math.round(num(s)) % 1440) + 1440) % 1440, d: Math.min(1440, Math.max(5, Math.round(num(d) || 5))) }
  if (x.n) b.n = String(x.n).slice(0, 60)
  const w = cleanDays(x.w)
  if (w) b.w = w
  if (x.nt && String(x.nt).trim()) b.nt = String(x.nt).trim().slice(0, NOTE_MAX)
  if (x.rm !== undefined && x.rm !== null && REMIND_OPTS.includes(+x.rm) && +x.rm !== 0) b.rm = +x.rm
  if (k === 'meal') b.meal = ['b', 'l', 'd', 's'].includes(x.meal) ? x.meal : 'l'
  if (k === 'meal' || k === 'drink') b.items = []
  if (hasItems(k) && Array.isArray(x.items) && x.items.length) b.items = x.items.map(cleanItem).filter(Boolean).slice(0, ITEMS_MAX)
  if (k === 'water') b.ml = Math.min(2000, Math.max(50, Math.round(num(x.ml) || 250)))
  return b
}

/**
 * The blocks of a template for your wake / sleep times. Every start is moved from the
 * 07:00–23:00 reference day onto yours (scaled when your day is longer or shorter), durations
 * are kept but never run into the next block. Drinks get a suggestion that fits the moment.
 * The school week keeps its fixed times.
 */
export function buildTemplate(tpl, prefs = {}, { suhoor = '04:30', iftar = '18:30', seed = 0 } = {}) {
  if (tpl === 'ramadan') return ramadan(HHMM.test(suhoor) ? suhoor : '04:30', HHMM.test(iftar) ? iftar : '18:30', seed)
  const drinkX = (kind, x, i) => {
    const extra = { ...(x || {}) }
    if (kind === 'drink') { const dr = drinkFor(extra.when || 'any', seed + i); extra.items = [{ t: 'd', id: dr.id, q: 1 }] }
    return extra
  }
  if (tpl === 'school') return trimOverlap(SCHOOL.map(([kind, at, d, x], i) => block(kind, h(at), d, drinkX(kind, x, i))))
  const rows = T[tpl] || T.custom
  const { wake, sleep } = planPrefs(prefs)
  const W = toMin(wake), A = (toMin(sleep) - W + 1440) % 1440
  const k = A / 960
  const out = rows.map(([kind, at, d, x], i) => {
    const s = kind === 'sleep' ? W + A : W + (h(at) - 420) * k
    return block(kind, s, kind === 'sleep' ? 1440 - A : d, drinkX(kind, x, i))
  })
  return trimOverlap(out)
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
  return trimOverlap(out)
}

export const onDay = (b, wd) => !Array.isArray(b.w) || !b.w.length || b.w.includes(wd)
const shareDay = (a, b) => DAY_ALL.some(d => onDay(a, d) && onDay(b, d))

/** Sort by start and clean every block. Your own blocks keep their times — overlaps are allowed. */
export function fitBlocks(blocks) {
  const b = [...(blocks || [])].filter(x => x && KINDS[x.k]).slice(0, MAX_BLOCKS).map(x => {
    const c = { ...x, s: ((Math.round(num(x.s)) % 1440) + 1440) % 1440, d: Math.min(1440, Math.max(5, Math.round(num(x.d) || 5))) }
    const w = cleanDays(x.w)
    if (w) c.w = w; else delete c.w
    return c
  })
  b.sort((x, y) => x.s - y.s)
  return b
}
/** Templates only: trim a block that would run into the next one on the same days (sleep may cross midnight). */
export function trimOverlap(blocks) {
  const b = fitBlocks(blocks)
  for (let i = 0; i < b.length; i++) {
    if (b[i].k === 'sleep') continue
    const nx = b.slice(i + 1).find(x => shareDay(b[i], x))
    if (!nx) continue
    const room = nx.s - b[i].s
    if (room > 0 && b[i].d > room) b[i].d = Math.max(5, room)
  }
  return b
}

/** A fresh plan from a template (keeps your reminder settings). */
export function newPlan(tpl, prev = {}, opts = {}) {
  const prefs = tpl === 'school' ? { wake: '06:30', sleep: '22:30' } : planPrefs({ wake: prev.wake, sleep: prev.sleep, ...opts.prefs })
  return { v: 1, tpl, ...prefs, remind: !!prev.remind, auto: !!prev.auto, blocks: buildTemplate(tpl, prefs, opts), days: prev.days || {} }
}

export function normPlan(P) {
  if (!P || typeof P !== 'object' || !Array.isArray(P.blocks)) return null
  const prefs = planPrefs(P)
  return { v: 1, tpl: P.tpl || 'custom', ...prefs, remind: !!P.remind, auto: !!P.auto, blocks: fitBlocks(P.blocks), days: P.days && typeof P.days === 'object' ? P.days : {} }
}

// ---- weekdays ---------------------------------------------------------------------------------------
/** The blocks that run on a weekday (0 = Sunday … 6 = Saturday). */
export const blocksOn = (plan, wd) => (plan ? plan.blocks.filter(b => onDay(b, wd)) : [])
/** Whether any block runs on chosen weekdays only (the week strip shows then). */
export const isWeekly = plan => !!plan && plan.blocks.some(b => Array.isArray(b.w) && b.w.length)
/**
 * The days a new block should start on when you add it while looking at `wd`: the days every
 * weekday-specific block of that day shares (Sunday–Thursday on a school day), else every day.
 */
export function typeDays(plan, wd) {
  const own = blocksOn(plan, wd).filter(b => Array.isArray(b.w) && b.w.length)
  if (!own.length) return undefined
  const x = own.reduce((acc, b) => acc.filter(d => b.w.includes(d)), DAY_ALL)
  return x.length && x.length < 7 ? x : [wd]
}
/** "Sun–Thu", "Fri, Sat", "Every day" — `names[d]` are short day names (0 = Sunday). */
export function daysLabel(w, names, tr = s => s, weekStart = 6) {
  const x = cleanDays(w)
  if (!x) return tr('Every day')
  const order = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7)
  const pos = x.map(d => order.indexOf(d)).sort((a, b) => a - b)
  const run = pos.length > 2 && pos[pos.length - 1] - pos[0] === pos.length - 1
  if (run) return names[order[pos[0]]] + '–' + names[order[pos[pos.length - 1]]]
  return pos.map(p => names[order[p]]).join(' · ')
}

// ---- calories -------------------------------------------------------------------------------------
/** One planned item → { kcal, ml, name (t() key or own name), own, q, sub?, kind }. */
export function itemInfo(S, it) {
  if (!it) return null
  const q = Math.max(0.5, num(it.q) || 1)
  if (it.t === 'r') { const r = RECIPE_BY_ID[it.id]; if (!r) return null; return { kcal: Math.round(recipeNutrition(r).kcal * q), ml: 0, name: r.name, own: false, q, kind: 'r' } }
  if (it.t === 'd') { const d = drinkOf(S, it.id); if (!d) return null; const n = drinkNutrition(d); return { kcal: Math.round(n.kcal * q), ml: Math.round(n.ml * q), name: d.name, own: !!d.mine, q, col: d.col, kind: 'd' } }
  if (it.t === 'f') { const f = FOOD_BY_ID[it.id]; if (!f) return null; return { kcal: Math.round(num(f.kcal) * (f.g || 100) / 100 * q), ml: 0, name: f.name, own: false, q, kind: 'f' } }
  if (it.t === 's') {
    const s = SODA_BY_ID[it.id]; if (!s) return null
    const p = packFor(s, it.pk, it.ml), n = sodaNutrition(s, p.ml, q)
    return { kcal: n.kcal, ml: s.k100 < 5 && !s.cf100 ? Math.round(n.ml * 0.9) : 0, name: s.name, own: false, q, pk: p.pk, size: p.ml, sugar: n.sugar, col: s.col, kind: 's' }
  }
  if (it.t === 'n') {
    const x = NUT_BY_ID[it.id]; if (!x) return null
    const g = Math.max(1, num(it.g) || 30) * q, n = nutNutrition(x, g, it.fm)
    return { kcal: n.kcal, ml: 0, name: x.name, own: false, q: 1, g: Math.round(g), col: x.col, kind: 'n' }
  }
  return null
}
export const blockKcal = (S, b) => (b.items || []).reduce((a, it) => a + ((itemInfo(S, it) || {}).kcal || 0), 0)
export const blockMl = (S, b) => (b.k === 'water' ? num(b.ml) : 0) + (b.items || []).reduce((a, it) => a + ((itemInfo(S, it) || {}).ml || 0), 0)

/**
 * Calorie targets per meal: what is left of your goal after the planned drinks and snacks in
 * other blocks, shared between the meals by the usual split (breakfast 25 %, lunch 35 %, dinner
 * 30 %, snack 10 %).
 */
export function mealTargets(S, blocks, goal) {
  const meals = blocks.filter(b => b.k === 'meal')
  const other = blocks.filter(b => b.k !== 'meal').reduce((a, b) => a + blockKcal(S, b), 0)
  const left = Math.max(0, goal - other)
  const w = meals.reduce((a, b) => a + (MEAL_W[b.meal] || 0.2), 0) || 1
  return Object.fromEntries(meals.map(b => [b.id, Math.round(left * (MEAL_W[b.meal] || 0.2) / w / 10) * 10]))
}

/** The day at a glance: planned calories (meals + drinks + snacks) vs the goal, water, minutes per kind. */
export function planTotals(S, blocks, goal) {
  const t = { kcal: 0, goal, ml: 0, min: Object.fromEntries(KIND_KEYS.map(k => [k, 0])), meals: 0, drinks: 0 }
  for (const b of blocks) {
    const k = blockKcal(S, b)
    t.kcal += k
    if (b.k === 'meal') t.meals += k
    else t.drinks += k
    t.ml += blockMl(S, b)
    t.min[b.k] = (t.min[b.k] || 0) + b.d
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
 * The live state of today's blocks: each with a status (done, skipped, now, next, later, missed),
 * the block running now (the most recent one when two overlap — a water break inside school),
 * the next one, minutes left in the current one and how much of the day is done.
 */
export function liveState(plan, day, now = new Date()) {
  const m = nowMinOf(now)
  const rec = day || {}
  const done = rec.done || {}, skip = rec.skip || {}
  let cur = null, next = null
  const items = blocksOn(plan, now.getDay()).map(b => {
    const [s, e] = span(b, m)
    const st = done[b.id] ? 'done' : skip[b.id] ? 'skipped' : m >= s && m < e ? 'now' : m < s ? 'later' : 'missed'
    if (st === 'now' && (!cur || s > cur.s || (s === cur.s && e - s < cur.e - cur.s))) cur = { b, left: e - m, pct: (m - s) / Math.max(1, e - s), s, e }
    return { b, s, e, st }
  })
  const later = items.filter(x => x.st === 'later').sort((a, b) => a.s - b.s)[0]
  if (later) { next = { b: later.b, inMin: later.s - m }; later.st = 'next' }
  const doable = items.filter(x => x.b.k !== 'sleep' && x.b.k !== 'free')
  const finished = doable.filter(x => x.st === 'done').length
  return { items, cur, next, done: finished, total: doable.length, pct: doable.length ? finished / doable.length : 0, nowMin: m }
}

export function dayRec(plan, iso) { return (plan && plan.days && plan.days[iso]) || null }
export const isLive = (plan, iso) => !!plan && !(plan.days && plan.days[iso] && plan.days[iso].off) && (!!(plan.days && plan.days[iso] && plan.days[iso].on) || !!plan.auto)

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
export function startDay(s, iso, now = Date.now()) { const d = rec(s, iso); d.on = d.on || now; delete d.off }
/** Stop today: the live view closes and today's remaining reminders are silenced. */
export function stopDay(s, iso, now = Date.now()) { const d = rec(s, iso); d.on = 0; d.off = now; if (s.planner) s.planner.auto = false }
export function markBlock(s, iso, id, how = 'done', now = Date.now()) {
  const d = rec(s, iso)
  delete d.done[id]; delete d.skip[id]
  if (how === 'done') d.done[id] = now
  else if (how === 'skip') d.skip[id] = now
}
export function upsertBlock(s, b) {
  const P = s.planner
  const i = P.blocks.findIndex(x => x.id === b.id)
  const clean = block(b.k, b.s, b.d, { n: b.n, w: b.w, nt: b.nt, rm: b.rm, meal: b.meal, items: (b.items || []).slice(0, ITEMS_MAX), ml: b.ml })
  clean.id = b.id || clean.id
  if (i >= 0) P.blocks[i] = clean; else if (P.blocks.length < MAX_BLOCKS) P.blocks.push(clean)
  P.blocks = fitBlocks(P.blocks)
  return clean.id
}
export function removeBlock(s, id) { s.planner.blocks = s.planner.blocks.filter(b => b.id !== id) }
/** Move every block of that day from `fromId` on by `min` minutes (a late start, an extra 10 minutes…). */
export function shiftFrom(s, fromId, min, wd = null) {
  const P = s.planner
  const from = P.blocks.find(b => b.id === fromId)
  if (!from) return
  P.blocks = fitBlocks(P.blocks.map(b => (b.id === fromId || (b.k !== 'sleep' && b.s > from.s && (wd === null || onDay(b, wd)) && shareDay(b, from)) ? { ...b, s: b.s + min } : b)))
}
/** Make the days in `to` run exactly the blocks of weekday `from`. */
export function copyDay(s, from, to) {
  const P = s.planner
  const targets = (to || []).filter(d => d !== from && d >= 0 && d <= 6)
  if (!targets.length) return
  const out = []
  for (const b of P.blocks) {
    let w = Array.isArray(b.w) && b.w.length ? [...b.w] : [...DAY_ALL]
    if (w.includes(from)) w = [...new Set([...w, ...targets])]
    else w = w.filter(d => !targets.includes(d))
    if (!w.length) continue
    const c = { ...b }
    const cw = cleanDays(w)
    if (cw) c.w = cw; else delete c.w
    out.push(c)
  }
  P.blocks = fitBlocks(out)
}

// ---- reminders ------------------------------------------------------------------------------------
const isoOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const defTr = (k, ...a) => String(k).replace(/\{(\d)\}/g, (_, i) => a[i])

/** What a block's reminder says: { title, body, lines } — everything you wrote and chose. */
export function blockText(S, b, lead = 0, tr = defTr, fmtTime = toHHMM) {
  const kind = KINDS[b.k] || KINDS.other
  const name = b.n ? tr(b.n) : tr(kind.name)
  const range = b.k === 'sleep' || b.k === 'wake' ? fmtTime(b.s) : fmtTime(b.s) + ' – ' + fmtTime(b.s + b.d)
  const its = (b.items || []).map(it => itemInfo(S, it)).filter(Boolean)
  const kcal = its.reduce((a, x) => a + x.kcal, 0)
  const ml = blockMl(S, b)
  let msg
  if (b.k === 'meal' || b.k === 'drink') msg = its.length ? tr('{0} kcal planned: {1}', kcal, its.map(x => (x.own ? x.name : tr(x.name))).join(', ')) : tr('Time to eat — keep it to your plan.')
  else if (b.k === 'water') msg = tr('Drink {0} ml of water.', b.ml || 250)
  else if (b.k === 'workout') msg = tr('Time to train — {0} min. Let’s go!', b.d)
  else if (b.k === 'study') msg = tr('Focus for {0} min — put the phone face down.', b.d)
  else if (b.k === 'work') msg = tr('Deep work for {0} min.', b.d)
  else if (b.k === 'rest') msg = tr('Rest and recharge for {0} min.', b.d)
  else if (b.k === 'walk') msg = tr('A {0}-minute walk — fresh air and steps.', b.d)
  else if (b.k === 'sleep') msg = tr('Wind down — screens off, lights low.')
  else if (b.k === 'wake') msg = tr('Good morning! Your plan for today is ready.')
  else if (b.k === 'school') msg = tr('Have a great day at school! Back at {0}.', fmtTime(b.s + b.d))
  else if (b.k === 'prayer') msg = tr('Time to pray — take a calm moment.')
  else if (b.k === 'other') msg = tr('It’s time — {0} min.', b.d)
  else msg = tr('{0} min for yourself.', b.d)
  if (lead > 0) msg = b.k === 'school' ? tr('Get your bag ready — school starts at {0}.', fmtTime(b.s)) : tr('Starts at {0} — get ready.', fmtTime(b.s))
  const title = lead > 0 ? tr('In {0} min: {1}', lead, name) : name + ' · ' + range
  const lines = ['⏰ ' + range + (b.k === 'sleep' || b.k === 'wake' ? '' : ' (' + tr('{0} min', b.d) + ')')]
  if (b.nt) lines.push('📝 ' + b.nt)
  for (const x of its) {
    const sub = x.kind === 's' ? ' (' + (x.size >= 1000 ? tr('{0} L', x.size / 1000) : tr('{0} ml', x.size)) + (x.q !== 1 ? ' × ' + x.q : '') + ')' : x.kind === 'n' ? ' (' + tr('{0} g', x.g) + ')' : x.q !== 1 ? ' × ' + x.q : ''
    lines.push((x.kind === 'r' || x.kind === 'f' ? '🍽️ ' : x.kind === 'n' ? '🥜 ' : '🥤 ') + (x.own ? x.name : tr(x.name)) + sub + ' — ' + tr('{0} kcal', x.kcal))
  }
  if (its.length > 1 || (its.length && ml)) lines.push('🔥 ' + tr('{0} kcal', kcal) + (ml ? ' · 💧 ' + tr('{0} ml', ml) : ''))
  else if (!its.length && b.k === 'water') lines.push('💧 ' + tr('{0} ml', b.ml || 250))
  lines.push(msg)
  return { title, body: b.nt ? b.nt.split('\n')[0] : msg, lines, kcal, ml }
}

/**
 * The reminders of the week ahead: every block on its weekdays, at its start or N minutes
 * before (its own setting), skipping blocks you finished or skipped and days you stopped.
 * Nearest first, at most PLAN_REMIND_MAX. Each carries the text for its date, so a reminder never
 * shows a stale plan. `tr(key, ...args)` translates; `fmtTime(min)` formats a clock time.
 * → [{ id (0…), at, title, body, lines, kind, color, day (ISO), block (id), lead }]
 */
export function planNotifications(S, plan, now = new Date(), tr = defTr, fmtTime = toHHMM, { days = PLAN_REMIND_DAYS, max = PLAN_REMIND_MAX } = {}) {
  if (!plan || !plan.remind) return []
  const out = []
  for (let off = 0; off < days; off++) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off)
    const iso = isoOf(base)
    const r = dayRec(plan, iso) || {}
    if (r.off) continue
    for (const b of blocksOn(plan, base.getDay())) {
      if (b.k === 'sleep' && b.s < 6 * 60) continue
      const lead = b.rm === undefined ? 0 : b.rm
      if (lead < 0) continue
      if ((r.done || {})[b.id] || (r.skip || {})[b.id]) continue
      const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(b.s / 60), b.s % 60 - lead)
      if (at.getTime() <= now.getTime() + 30000) continue
      const txt = blockText(S, b, lead, tr, fmtTime)
      out.push({ at, title: txt.title, body: txt.body, lines: txt.lines, kind: b.k, color: (KINDS[b.k] || KINDS.other).color, day: iso, block: b.id, lead })
    }
  }
  out.sort((a, b) => a.at - b.at)
  return out.slice(0, max).map((x, i) => ({ id: i, ...x }))
}
