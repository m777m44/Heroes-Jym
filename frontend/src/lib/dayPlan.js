// 9.0 — the day plan: your day as blocks of time — wake up, study, work, workout, rest, meals,
// drinks, water breaks, a walk, free time and sleep — from a template you can edit block by
// block. Start the day and it runs live: what is happening now, a countdown, what comes next,
// and the meals and drinks you planned are logged with their exact calories.
// 10.0 — "My schedule": every block can run on chosen weekdays (school Sunday–Thursday, a
// different weekend), has an end time, your own notes, its own reminder (at the start or 5–60 min
// before) and can carry food, drinks, soft drinks and nuts. A school week template (7:30–12:40,
// then lunch, rest, homework, work, drinks and dinner) and school / prayer / other blocks.
// Reminders follow the schedule every day (a week ahead) and show everything you wrote and chose.
// 11.0 — the school week rebuilt on your own times: up at 7:00, water 7:15, breakfast (eggs and
// bread) 7:20, get ready 7:25, school 7:30–12:40 with nothing inside it, home 12:40, water 12:50,
// lunch 13:00 (a different Iraqi dish each day), a drink after it, then a nap, homework, a snack,
// phone & games, review, a workout or football, family time, dinner with water, the school bag
// and a light snack before bed at 22:00. Friday and Saturday: sleep in until 9:00, an Iraqi
// breakfast, study, games, family, football and rest. Meals carry real foods, so every block shows
// its calories; blocks can have their own icon (b.ic) and notes in your language.
// Pure (no store, no DOM). Screen: views/DayPlan.jsx.
//
//   S.planner = {
//     v: 1, tpl, wake: 'HH:MM', sleep: 'HH:MM', remind: bool, auto: bool,
//     blocks: [{ id, k (kind), s (start, minutes after midnight), d (minutes), n? (own title),
//                w? ([0–6] weekdays, getDay numbers; missing = every day), nt? (notes), rm? (reminder:
//                -1 off, 0 at the start, N minutes before), meal? ('b'|'l'|'d'|'s'),
//                items?: [{ t: 'r'|'d'|'f'|'s'|'n', id, q, ml?, pk?, g?, fm? }], ml? (water), ic? (icon) }],
//     tv?: the template's version (the school week is 2 since 11.0),
//     days: { 'YYYY-MM-DD': { on (started at), off? (stopped: no reminders), done: { blockId: at }, skip: { blockId: at },
//                             mv?: { blockId: [start, minutes] } (that day only — +10 in the live view) } }
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
const MAX_BLOCKS = 80
const ITEMS_MAX = 8
/** 11.0 — icons a block can show instead of its kind's (the editor's icon row). */
export const BLOCK_ICONS = ['house', 'shirt', 'backpack', 'gamepad', 'ball', 'tv', 'people', 'phone', 'book', 'pencil', 'lightbulb', 'school',
  'moon', 'bed', 'sun', 'cup', 'fork', 'apple', 'drop', 'figureWalk', 'figureRun', 'bike', 'swim', 'dumbbell', 'heart', 'smile', 'music',
  'camera', 'palm', 'prayer', 'briefcase', 'star', 'sparkles', 'leafy']
/** The version of the school week template — older school plans are offered the new one. */
export const SCHOOL_TV = 2

export const TEMPLATES = [
  { id: 'school', name: 'School week', icon: 'school', desc: 'Up at 7:00, school Sunday to Thursday 7:30–12:40 — then lunch, a nap, homework, games, review, sport, dinner and a light snack before bed at 22:00. Friday and Saturday: study, family, football and rest.' },
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
const isoOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const dayAfter = (iso, n) => { const [y, m, d] = String(iso).split('-').map(Number); return isoOf(new Date(y, m - 1, d + n)) }
const weekdayOfIso = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d).getDay() }

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

// 11.0 — the school week, at fixed times (your own): school 07:30–12:40 Sunday to Thursday with
// nothing inside it; the afternoon for lunch, a nap, homework, games, review and sport; every
// evening family time, dinner with water and some free time; the nights before school end with the
// bag, a light snack and bed at 22:00, Thursday and Friday nights run later (sleep in until 9:00).
// Friday and Saturday: an Iraqi breakfast, study, games, helping at home, football and rest.
// Meals carry real foods (lib/foodDb.js), drinks real drinks, snacks real nuts — all counted.
const SD = SCHOOL_DAYS, WE = WEEKEND, FRI = [5], SAT = [6]
const SCHOOL_NIGHTS = [0, 1, 2, 3, 6]     // the nights before a school day
const LATE_NIGHTS = [4, 5]                // Thursday and Friday nights
const NOT_FRI = [0, 1, 2, 3, 4, 6]
const F = (id, q = 1) => ({ t: 'f', id, q }), DR = id => ({ t: 'd', id, q: 1 }), NUT = (id, g, fm) => ({ t: 'n', id, g, fm, q: 1 })
const SCHOOL = [
  // Sunday–Thursday: up, water, breakfast (eggs and bread), get ready — then school
  ['wake', '07:00', 15, { w: SD }],
  ['water', '07:15', 5, { ml: 250, w: SD }],
  ['meal', '07:20', 5, { meal: 'b', w: SD, items: [F('egg', 2), F('khubz')] }],
  ['other', '07:25', 5, { n: 'Get ready for school', nt: 'Clothes, school bag and a water bottle', ic: 'shirt', w: SD }],
  ['school', '07:30', 310, { w: SD }],
  ['other', '12:40', 10, { n: 'Back home', ic: 'house', rm: -1, w: SD }],
  ['water', '12:50', 5, { ml: 300, w: SD }],
  // a different Iraqi lunch every school day
  ['meal', '13:00', 40, { meal: 'l', w: [0], items: [F('rice'), F('fasolia'), F('salad')] }],
  ['meal', '13:00', 40, { meal: 'l', w: [1], items: [F('chickenrice'), F('salad')] }],
  ['meal', '13:00', 40, { meal: 'l', w: [2], items: [F('rice'), F('bamia'), F('salad')] }],
  ['meal', '13:00', 40, { meal: 'l', w: [3], items: [F('dolma'), F('laban')] }],
  ['meal', '13:00', 40, { meal: 'l', w: [4], items: [F('biryani'), F('salad')] }],
  ['drink', '13:40', 10, { w: SD, items: [DR('noomibasra')] }],
  ['rest', '13:50', 40, { n: 'Nap', w: SD }],
  ['study', '14:30', 90, { n: 'Homework', nt: 'The hardest subject first — phone in another room', w: SD }],
  ['meal', '16:00', 15, { meal: 's', w: SD, items: [NUT('almond', 25, 'raw'), F('apple')] }],
  ['water', '16:15', 5, { ml: 300, w: SD }],
  ['free', '16:20', 70, { n: 'Phone & games', ic: 'gamepad', rm: -1, w: SD }],
  ['study', '17:30', 45, { n: 'Review', nt: 'Go over today’s lessons and get ready for tomorrow', w: SD }],
  ['drink', '18:15', 10, { w: SD, items: [DR('limonnana')] }],
  ['workout', '18:30', 50, { w: [0, 2, 4] }],
  ['walk', '18:30', 50, { n: 'Walk or football', ic: 'ball', w: [1, 3] }],
  ['water', '19:20', 5, { ml: 400, w: SD }],
  // Friday and Saturday: sleep in, an Iraqi breakfast with tea, study, games, family, sport, rest
  ['wake', '09:00', 15, { w: WE }],
  ['water', '09:15', 5, { ml: 300, w: WE }],
  ['meal', '09:30', 40, { meal: 'b', w: FRI, items: [F('kahi'), F('teasugar')] }],
  ['meal', '09:30', 40, { meal: 'b', w: SAT, items: [F('eggtomato'), F('samoon'), F('teasugar')] }],
  ['study', '10:15', 90, { n: 'Review', nt: 'Go over the week’s lessons', w: FRI }],
  ['study', '10:15', 90, { n: 'Homework', nt: 'Get ready for Sunday', w: SAT }],
  ['free', '11:45', 60, { n: 'Phone & games', ic: 'gamepad', rm: -1, w: WE }],
  ['water', '12:45', 5, { ml: 300, w: WE }],
  ['free', '12:50', 40, { n: 'Help at home', ic: 'house', rm: -1, w: WE }],
  ['meal', '13:30', 45, { meal: 'l', w: FRI, items: [F('dolma'), F('laban'), F('salad')] }],
  ['meal', '13:30', 45, { meal: 'l', w: SAT, items: [F('masgouf'), F('rice'), F('salad')] }],
  ['drink', '14:15', 10, { w: WE, items: [DR('iraqitea')] }],
  ['rest', '14:30', 60, { n: 'Nap', w: WE }],
  ['meal', '15:30', 15, { meal: 's', w: WE, items: [NUT('kerzat', 30, 'roasted'), F('watermelon')] }],
  ['water', '15:45', 5, { ml: 300, w: WE }],
  ['workout', '16:00', 90, { n: 'Football with friends', nt: 'Take a bottle of water with you', ic: 'ball', w: FRI }],
  ['water', '17:30', 5, { ml: 400, w: FRI }],
  ['free', '17:35', 145, { n: 'Visit relatives', ic: 'people', rm: -1, w: FRI }],
  ['workout', '16:00', 60, { w: SAT }],
  ['water', '17:00', 5, { ml: 400, w: SAT }],
  ['study', '17:05', 55, { n: 'Review', w: SAT }],
  ['free', '18:00', 90, { n: 'Phone & games', ic: 'gamepad', rm: -1, w: SAT }],
  // every evening: family time, dinner with water, a little free time
  ['free', '19:30', 30, { n: 'Family time', ic: 'people', rm: -1, w: NOT_FRI }],
  ['meal', '20:00', 30, { meal: 'd', items: [F('whitecheese', 2), F('khubz'), F('cucumber'), F('tomato'), F('olives')] }],
  ['water', '20:30', 5, { ml: 250 }],
  ['free', '20:35', 45, { rm: -1 }],
  // the nights before school (Sunday–Wednesday and Saturday): the bag, a light snack, bed at 22:00
  ['other', '21:20', 10, { n: 'Get your bag ready', nt: 'Tomorrow’s books, your clothes and a water bottle', ic: 'backpack', w: SCHOOL_NIGHTS }],
  ['meal', '21:30', 15, { meal: 's', n: 'Light snack before bed', w: SCHOOL_NIGHTS, items: [DR('cardamommilk'), F('dates')] }],
  ['other', '21:45', 15, { n: 'Get ready for bed', nt: 'Brush your teeth, phone away, lights low', ic: 'moon', w: SCHOOL_NIGHTS }],
  ['sleep', '22:00', 540, { w: SCHOOL_NIGHTS }],
  // Thursday and Friday nights: later, then sleep in until 9:00
  ['free', '21:20', 100, { n: 'Phone & games', ic: 'gamepad', rm: -1, w: LATE_NIGHTS }],
  ['meal', '23:00', 15, { meal: 's', n: 'Light snack before bed', w: LATE_NIGHTS, items: [DR('cardamommilk'), F('dates')] }],
  ['other', '23:15', 15, { n: 'Get ready for bed', nt: 'Brush your teeth, phone away, lights low', ic: 'moon', w: LATE_NIGHTS }],
  ['sleep', '23:30', 570, { w: LATE_NIGHTS }],
]
/** The English notes and names the templates use (t() keys — the locale tests check them). */
export const TEMPLATE_TEXTS = [...new Set(SCHOOL.flatMap(([, , , x]) => [x.n, x.nt]).filter(Boolean))]
const TEMPLATE_NOTES = new Set(SCHOOL.map(([, , , x]) => x.nt).filter(Boolean))
/** A block's notes for showing: a template's note in your language, your own words as they are. */
export const noteText = (nt, tr = s => s) => (!nt ? '' : TEMPLATE_NOTES.has(nt) ? tr(nt) : String(nt))

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
  if (x.ic && BLOCK_ICONS.includes(x.ic)) b.ic = x.ic
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
    if (kind === 'drink' && !(extra.items && extra.items.length)) { const dr = drinkFor(extra.when || 'any', seed + i); extra.items = [{ t: 'd', id: dr.id, q: 1 }] }
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
  const prefs = tpl === 'school' ? { wake: '07:00', sleep: '22:00' } : planPrefs({ wake: prev.wake, sleep: prev.sleep, ...opts.prefs })
  const P = { v: 1, tpl, ...prefs, remind: !!prev.remind, auto: !!prev.auto, blocks: buildTemplate(tpl, prefs, opts), days: prev.days || {} }
  if (tpl === 'school') P.tv = SCHOOL_TV
  return P
}

export function normPlan(P) {
  if (!P || typeof P !== 'object' || !Array.isArray(P.blocks)) return null
  const prefs = planPrefs(P)
  const out = { v: 1, tpl: P.tpl || 'custom', ...prefs, remind: !!P.remind, auto: !!P.auto, blocks: fitBlocks(P.blocks), days: P.days && typeof P.days === 'object' ? P.days : {} }
  if (Number.isFinite(+P.tv) && +P.tv > 0) out.tv = +P.tv
  return out
}
/** 11.0 — a school week made before the new template (it is offered, never forced). */
export const oldSchoolPlan = P => !!P && P.tpl === 'school' && !(+P.tv >= SCHOOL_TV)

// ---- weekdays ---------------------------------------------------------------------------------------
/** The blocks that run on a weekday (0 = Sunday … 6 = Saturday). */
export const blocksOn = (plan, wd) => (plan ? plan.blocks.filter(b => onDay(b, wd)) : [])
/** A day's own changes (+10 in the live view): { blockId: [start, minutes] }, cleaned. */
function movesOf(rec) {
  const out = {}
  const mv = rec && rec.mv
  if (!mv || typeof mv !== 'object') return out
  for (const [id, v] of Object.entries(mv)) {
    if (!Array.isArray(v) || !Number.isFinite(+v[0]) || !Number.isFinite(+v[1])) continue
    out[id] = [Math.min(1439, Math.max(0, Math.round(+v[0]))), Math.min(1440, Math.max(5, Math.round(+v[1])))]
  }
  return out
}
const withMoves = (blocks, mv) => (Object.keys(mv).length
  ? blocks.map(b => (mv[b.id] ? { ...b, s: mv[b.id][0], d: mv[b.id][1], mv: 1 } : b)).sort((a, b) => a.s - b.s)
  : blocks)
/**
 * The blocks of one date: its weekday's blocks with that day's own changes (a block you gave 10
 * more minutes, and the ones after it, run later that day only — marked `mv`).
 */
export const dayBlocks = (plan, iso) => (plan ? withMoves(blocksOn(plan, weekdayOfIso(iso)), movesOf(dayRec(plan, iso))) : [])
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
const mac = (n, q = 1) => ({ p: Math.round(num(n.p) * q * 10) / 10, c: Math.round(num(n.c) * q * 10) / 10, f: Math.round(num(n.f) * q * 10) / 10 })
/** One planned item → { kcal, ml, p, c, f (grams), name (t() key or own name), own, q, sub?, kind }. */
export function itemInfo(S, it) {
  if (!it) return null
  const q = Math.max(0.5, num(it.q) || 1)
  if (it.t === 'r') { const r = RECIPE_BY_ID[it.id]; if (!r) return null; const n = recipeNutrition(r); return { kcal: Math.round(n.kcal * q), ml: 0, ...mac(n, q), name: r.name, own: false, q, kind: 'r' } }
  if (it.t === 'd') { const d = drinkOf(S, it.id); if (!d) return null; const n = drinkNutrition(d); return { kcal: Math.round(n.kcal * q), ml: Math.round(n.ml * q), ...mac(n, q), name: d.name, own: !!d.mine, q, col: d.col, kind: 'd' } }
  // 11.0: a food from the database — its calories are per serving (an egg, a piece of bread, a plate)
  if (it.t === 'f') { const f = FOOD_BY_ID[it.id]; if (!f) return null; return { kcal: Math.round(num(f.kcal) * q), ml: 0, ...mac(f, q), name: f.name, own: false, q, unit: f.unit, cat: f.cat, kind: 'f' } }
  if (it.t === 's') {
    const s = SODA_BY_ID[it.id]; if (!s) return null
    const p = packFor(s, it.pk, it.ml), n = sodaNutrition(s, p.ml, q)
    return { kcal: n.kcal, ml: s.k100 < 5 && !s.cf100 ? Math.round(n.ml * 0.9) : 0, ...mac(n), name: s.name, own: false, q, pk: p.pk, size: p.ml, sugar: n.sugar, col: s.col, kind: 's' }
  }
  if (it.t === 'n') {
    const x = NUT_BY_ID[it.id]; if (!x) return null
    const g = Math.max(1, num(it.g) || 30) * q, n = nutNutrition(x, g, it.fm)
    return { kcal: n.kcal, ml: 0, ...mac(n), name: x.name, own: false, q: 1, g: Math.round(g), col: x.col, kind: 'n' }
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
  const t = { kcal: 0, goal, ml: 0, p: 0, c: 0, f: 0, min: Object.fromEntries(KIND_KEYS.map(k => [k, 0])), meals: 0, drinks: 0 }
  for (const b of blocks) {
    const k = blockKcal(S, b)
    for (const it of b.items || []) { const x = itemInfo(S, it); if (x) { t.p += x.p || 0; t.c += x.c || 0; t.f += x.f || 0 } }
    t.kcal += k
    if (b.k === 'meal') t.meals += k
    else t.drinks += k
    t.ml += blockMl(S, b)
    t.min[b.k] = (t.min[b.k] || 0) + b.d
  }
  t.p = Math.round(t.p); t.c = Math.round(t.c); t.f = Math.round(t.f)
  return t
}

/** 11.0 — the parts of the day the timeline is grouped in, by start time. */
export const DAY_PARTS = [
  { key: 'morning', name: 'Morning', icon: 'sun', from: 4 * 60 },
  { key: 'afternoon', name: 'Afternoon', icon: 'sparkles', from: 12 * 60 },
  { key: 'evening', name: 'Evening', icon: 'people', from: 17 * 60 },
  { key: 'night', name: 'Night', icon: 'moon', from: 21 * 60 },
]
export const partOf = m => { const x = ((m % 1440) + 1440) % 1440; return x < 4 * 60 ? DAY_PARTS[3] : [...DAY_PARTS].reverse().find(p => x >= p.from) }

// ---- live -------------------------------------------------------------------------------------------
const nowMinOf = d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
/**
 * The live state of today's blocks: each with a status (done, skipped, now, next, later, missed),
 * the block running now (the most recent one when two overlap — a water break inside school),
 * the next one, minutes left in the current one and how much of the day is done. Start / end are
 * minutes on today's clock; a block that crosses midnight is still running from yesterday only if
 * it ran yesterday too (then s < 0). Each day's own changes (+10) count.
 */
export function liveState(plan, day, now = new Date()) {
  const m = nowMinOf(now)
  const rec = day || {}
  const done = rec.done || {}, skip = rec.skip || {}
  let cur = null, next = null
  const wd = now.getDay(), yd = (wd + 6) % 7
  const yIso = isoOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const last = withMoves(blocksOn(plan, yd), movesOf(dayRec(plan, yIso)))
  const lastById = Object.fromEntries(last.map(b => [b.id, b]))
  const items = withMoves(blocksOn(plan, wd), movesOf(rec)).map(b => {
    let s = b.s, e = b.s + b.d
    const y = lastById[b.id]
    if (y && y.s + y.d > 1440 && m < y.s + y.d - 1440) { s = y.s - 1440; e = y.s + y.d - 1440 }   // a sleep that started yesterday
    const st = done[b.id] ? 'done' : skip[b.id] ? 'skipped' : m >= s && m < e ? 'now' : m < s ? 'later' : 'missed'
    if (st === 'now' && (!cur || s > cur.s || (s === cur.s && e - s < cur.e - cur.s))) cur = { b, left: e - m, pct: (m - s) / Math.max(1, e - s), s, e }
    return { b, s, e, st }
  })
  // 10.0 (review on PR #13): last night's block that runs on into this morning but isn't on today's
  // plan (Friday night's later sleep on a Saturday) — it is what's happening now until it ends
  for (const b of last) {
    if (onDay(b, wd) || b.s + b.d <= 1440) continue
    const s = b.s - 1440, e = b.s + b.d - 1440
    if (m >= e) continue
    items.unshift({ b, s, e, st: 'now', carry: true })
    if (!cur) cur = { b, left: e - m, pct: (m - s) / Math.max(1, e - s), s, e }
  }
  const later = items.filter(x => x.st === 'later').sort((a, b) => a.s - b.s)[0]
  if (later) { next = { b: later.b, inMin: later.s - m }; later.st = 'next' }
  const doable = items.filter(x => !x.carry && x.b.k !== 'sleep' && x.b.k !== 'free')
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
/**
 * Stop today: the live view closes and today's remaining reminders are silenced. "Run it every
 * day" stays as it is — tomorrow starts by itself again (review on PR #13).
 */
export function stopDay(s, iso, now = Date.now()) { const d = rec(s, iso); d.on = 0; d.off = now }
export function markBlock(s, iso, id, how = 'done', now = Date.now()) {
  const d = rec(s, iso)
  delete d.done[id]; delete d.skip[id]
  if (how === 'done') d.done[id] = now
  else if (how === 'skip') d.skip[id] = now
}
export function upsertBlock(s, b) {
  const P = s.planner
  const i = P.blocks.findIndex(x => x.id === b.id)
  const clean = block(b.k, b.s, b.d, { n: b.n, w: b.w, nt: b.nt, rm: b.rm, meal: b.meal, items: (b.items || []).slice(0, ITEMS_MAX), ml: b.ml, ic: b.ic })
  clean.id = b.id || clean.id
  // a new time replaces what was changed for one day only (+10)
  if (i >= 0 && (P.blocks[i].s !== clean.s || P.blocks[i].d !== clean.d)) for (const d of Object.values(P.days || {})) if (d && d.mv) delete d.mv[clean.id]
  if (i >= 0) P.blocks[i] = clean; else if (P.blocks.length < MAX_BLOCKS) P.blocks.push(clean)
  P.blocks = fitBlocks(P.blocks)
  return clean.id
}
export function removeBlock(s, id) { s.planner.blocks = s.planner.blocks.filter(b => b.id !== id) }
/** Blocks at fixed times — a delay before them ends there (+10). */
export const FIXED_KINDS = new Set(['school', 'prayer', 'sleep'])
/**
 * "+10" in the live view: the block running now (`cur` from liveState: { b, s, e } on today's
 * clock) gets `min` more minutes and the blocks after it today start `min` later — up to the next
 * block at a fixed time (school, prayer, sleep), which keeps its time. Today only: the schedule
 * and the other days stay as they are, even when the block runs on several weekdays (review on
 * PR #13). A block that started yesterday (a sleep) is lengthened on yesterday's date.
 */
export function extendNow(s, cur, min = 10, now = new Date()) {
  const P = s.planner
  if (!P || !cur || !cur.b || !P.blocks.some(b => b.id === cur.b.id)) return
  const iso = isoOf(now)
  const own = cur.s < 0 ? isoOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) : iso
  const o = rec(s, own)
  o.mv = { ...movesOf(o), [cur.b.id]: [cur.s < 0 ? cur.s + 1440 : cur.s, cur.e - cur.s + min] }
  const d = rec(s, iso)
  const mv = movesOf(d)
  const after = withMoves(blocksOn(P, now.getDay()), mv).filter(b => b.id !== cur.b.id && b.s >= cur.e).sort((a, b) => a.s - b.s)
  for (const b of after) {
    if (FIXED_KINDS.has(b.k)) break
    mv[b.id] = [Math.min(1439, b.s + min), b.d]
  }
  d.mv = mv
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
  const nt = noteText(b.nt, tr)
  if (nt) lines.push('📝 ' + nt)
  for (const x of its) {
    const sub = x.kind === 's' ? ' (' + (x.size >= 1000 ? tr('{0} L', x.size / 1000) : tr('{0} ml', x.size)) + (x.q !== 1 ? ' × ' + x.q : '') + ')' : x.kind === 'n' ? ' (' + tr('{0} g', x.g) + ')' : x.q !== 1 ? ' × ' + x.q : ''
    lines.push((x.kind === 'r' || x.kind === 'f' ? '🍽️ ' : x.kind === 'n' ? '🥜 ' : '🥤 ') + (x.own ? x.name : tr(x.name)) + sub + ' — ' + tr('{0} kcal', x.kcal))
  }
  if (its.length > 1 || (its.length && ml)) lines.push('🔥 ' + tr('{0} kcal', kcal) + (ml ? ' · 💧 ' + tr('{0} ml', ml) : ''))
  else if (!its.length && b.k === 'water') lines.push('💧 ' + tr('{0} ml', b.ml || 250))
  lines.push(msg)
  return { title, body: nt ? nt.split('\n')[0] : msg, lines, kcal, ml }
}

/**
 * The reminders of the week ahead: every block on its weekdays, at its start or N minutes
 * before (its own setting), skipping blocks you finished or skipped and days you stopped; a
 * block moved on one day (+10) rings at its new time that day (`moved`).
 * Nearest first, at most PLAN_REMIND_MAX. Each carries the text for its date, so a reminder never
 * shows a stale plan. `tr(key, ...args)` translates; `fmtTime(min)` formats a clock time.
 * → [{ id (0…), at, title, body, lines, kind, color, day (ISO), block (id), lead, moved }]
 */
export function planNotifications(S, plan, now = new Date(), tr = defTr, fmtTime = toHHMM, { days = PLAN_REMIND_DAYS, max = PLAN_REMIND_MAX } = {}) {
  if (!plan || !plan.remind) return []
  const out = []
  for (let off = 0; off < days; off++) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off)
    const iso = isoOf(base)
    const r = dayRec(plan, iso) || {}
    if (r.off) continue
    for (const b of withMoves(blocksOn(plan, base.getDay()), movesOf(r))) {
      if (b.k === 'sleep' && b.s < 6 * 60) continue
      const lead = b.rm === undefined ? 0 : b.rm
      if (lead < 0) continue
      if ((r.done || {})[b.id] || (r.skip || {})[b.id]) continue
      const at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(b.s / 60), b.s % 60 - lead)
      if (at.getTime() <= now.getTime() + 30000) continue
      const txt = blockText(S, b, lead, tr, fmtTime)
      out.push({ at, title: txt.title, body: txt.body, lines: txt.lines, kind: b.k, color: (KINDS[b.k] || KINDS.other).color, day: iso, block: b.id, lead, moved: !!b.mv })
    }
  }
  out.sort((a, b) => a.at - b.at)
  return out.slice(0, max).map((x, i) => ({ id: i, ...x }))
}

/**
 * The schedule's reminders for the phone's own alarms (Android, steps/PlanReminder.java): one per
 * block — its weekdays (empty = every day), start, lead and text (the same every day), and the
 * days it must stay quiet (done or skipped, or a day you stopped). The phone works out each next
 * time itself and re-arms after every ring, so the whole schedule keeps reminding with the app
 * closed, however many blocks it has (review on PR #13).
 * A block moved on one day (+10) stays quiet at its usual time that day and gets one more entry
 * for that day only (`once`, which the phone keeps to — that date and no other, even after a
 * reboot weeks later; the same day a week later is quiet too, for older builds).
 * → [{ id, block, w, start, lead, title, body, lines, kind, color, skip: ['YYYY-MM-DD'], once? }]
 */
export function planAlarms(S, plan, now = new Date(), tr = defTr, fmtTime = toHHMM) {
  if (!plan || !plan.remind) return []
  const today = isoOf(now)
  const quiet = { all: [] }, done = {}, moved = []
  for (const [iso, r] of Object.entries(plan.days || {})) {
    if (iso < today || !r) continue
    if (r.off) quiet.all.push(iso)
    for (const id of [...Object.keys(r.done || {}), ...Object.keys(r.skip || {})]) { (quiet[id] = quiet[id] || []).push(iso); (done[id] = done[id] || []).push(iso) }
    for (const [id, v] of Object.entries(movesOf(r))) { (quiet[id] = quiet[id] || []).push(iso); if (!r.off) moved.push([iso, id, v]) }
  }
  const out = []
  const add = (b, w, skip, once) => {
    if (b.k === 'sleep' && b.s < 6 * 60) return
    const lead = b.rm === undefined ? 0 : b.rm
    if (lead < 0) return
    const txt = blockText(S, b, lead, tr, fmtTime)
    const x = {
      id: out.length, block: b.id, w, start: b.s, lead,
      title: txt.title, body: txt.body, lines: txt.lines, kind: b.k, color: (KINDS[b.k] || KINDS.other).color,
      skip: [...new Set(skip)].sort(),
    }
    if (once) x.once = once
    out.push(x)
  }
  for (const b of plan.blocks) add(b, Array.isArray(b.w) ? b.w : [], [...quiet.all, ...(quiet[b.id] || [])])
  moved.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[2][0] - b[2][0]))
  for (const [iso, id, [s, d]] of moved.slice(0, MAX_BLOCKS)) {
    const b = plan.blocks.find(x => x.id === id), wd = weekdayOfIso(iso)
    if (!b || !onDay(b, wd) || (done[id] || []).includes(iso)) continue
    add({ ...b, s, d }, [wd], [dayAfter(iso, 7)], iso)
  }
  return out
}
