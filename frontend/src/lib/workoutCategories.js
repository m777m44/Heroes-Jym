// 4.0 — the two ways to start a workout: at home WITHOUT equipment, or at the gym WITH it.
//
// Every category is a filter over the exercise library (lib/exercises-data.js: 1,324 exercises,
// 325 of them body-weight), so the counts on screen are the real number of exercises you can
// pick from, and a "quick session" is built from those same exercises:
//   - staples first (push-up, squat, bench press, row…), then the rest by a simple score that
//     prefers plain names (no "v. 2", no "(male)"), with a seeded shuffle so the session changes
//     day to day — or when you tap shuffle — but stays the same while you look at it
//   - spread over the target muscles (at most 2 exercises per muscle while others are left)
//   - sets and reps by kind of training: HIIT / cardio intervals of 40 s, stretches held 30 s,
//     planks held 40 s, home strength 3 × 12, gym compound lifts 4 × 8, gym accessories 3 × 12
// Pure: no store, no React. Names are t() keys.
import { EXDB } from './exercises-data.js'

export const MODES = ['home', 'gym']
const isBW = e => e.eq === 'body weight'
const UPPER = new Set(['chest', 'upper arms', 'shoulders', 'back', 'lower arms', 'neck'])
const LEGS = new Set(['upper legs', 'lower legs'])
const HIIT_RE = /burpee|jump|\bhops?\b|climber|skater|high knee|\bjack\b|bear crawl|sprint|star jump|scissor/
const FLEX_RE = /\bstretch\b|\byoga\b|\bpose\b/
const RUN_RE = /\brun\b|short stride|high knee|walking lunge|walking high|ski step|back and forth step|monster walk|jog|sprint/
const HOLD_RE = /plank|\bhold\b|wall sit|hollow|l-sit|bridge hold/

export const CATEGORIES = {
  home: [
    { id: 'hiit', name: 'HIIT', session: 'Home HIIT', icon: 'flame', color: 'red', test: e => isBW(e) && HIIT_RE.test(e.n) },
    { id: 'cardio', name: 'Cardio', session: 'Home cardio', icon: 'heartPulse', color: 'pink', test: e => isBW(e) && (e.bp === 'cardio' || HIIT_RE.test(e.n)) },
    { id: 'abs', name: 'Abs & core', session: 'Home abs & core', icon: 'abs', color: 'orange', test: e => isBW(e) && e.bp === 'waist' },
    { id: 'upper', name: 'Upper body', session: 'Home upper body', icon: 'arm', color: 'blue', test: e => isBW(e) && UPPER.has(e.bp) },
    { id: 'lower', name: 'Lower body', session: 'Home lower body', icon: 'legs', color: 'green', test: e => isBW(e) && LEGS.has(e.bp) && !FLEX_RE.test(e.n) },
    { id: 'full', name: 'Full body', session: 'Home full body', icon: 'figureStrength', color: 'purple', test: e => isBW(e) && !FLEX_RE.test(e.n) },
    { id: 'run', name: 'Running & walking', session: 'Home running drills', icon: 'figureRun', color: 'yellow', test: e => isBW(e) && RUN_RE.test(e.n) },
    { id: 'flex', name: 'Stretching & yoga', session: 'Home stretching', icon: 'stretch', color: 'teal', test: e => isBW(e) && FLEX_RE.test(e.n) },
  ],
  gym: [
    { id: 'chest', name: 'Chest', session: 'Gym chest', icon: 'figureStrength', color: 'red', test: e => !isBW(e) && e.bp === 'chest' },
    { id: 'back', name: 'Back muscles', session: 'Gym back', icon: 'pullup', color: 'blue', test: e => !isBW(e) && e.bp === 'back' },
    { id: 'legs', name: 'Legs', session: 'Gym legs', icon: 'legs', color: 'green', test: e => !isBW(e) && LEGS.has(e.bp) },
    { id: 'shoulders', name: 'Shoulders', session: 'Gym shoulders', icon: 'arm', color: 'orange', test: e => !isBW(e) && e.bp === 'shoulders' },
    { id: 'biceps', name: 'Biceps', session: 'Gym biceps', icon: 'arm', color: 'purple', test: e => !isBW(e) && e.tg === 'biceps' },
    { id: 'triceps', name: 'Triceps', session: 'Gym triceps', icon: 'arm', color: 'pink', test: e => !isBW(e) && e.tg === 'triceps' },
    { id: 'core', name: 'Core', session: 'Gym core', icon: 'abs', color: 'yellow', test: e => !isBW(e) && e.bp === 'waist' },
    { id: 'full', name: 'Full body', session: 'Gym full body', icon: 'barbell', color: 'indigo', test: e => !isBW(e) && e.bp !== 'cardio' },
  ],
}
/** The session names saved on workouts — listed in BUILTIN_NAMES so history shows them translated. */
export const SESSION_NAMES = [...CATEGORIES.home, ...CATEGORIES.gym].map(c => c.session).concat(['My picks at home', 'My picks at the gym'])

/** Gym equipment, grouped the way people think of it. */
export const EQ_GROUPS = [
  { id: 'barbell', name: 'Barbell', icon: 'barbell', eq: ['barbell', 'olympic barbell', 'ez barbell', 'trap bar'] },
  { id: 'dumbbell', name: 'Dumbbells', icon: 'dumbbell', eq: ['dumbbell'] },
  { id: 'cable', name: 'Cable', icon: 'link', eq: ['cable'] },
  { id: 'machine', name: 'Machines', icon: 'machine', eq: ['leverage machine', 'smith machine', 'sled machine', 'assisted', 'stationary bike', 'elliptical machine', 'stepmill machine', 'skierg machine', 'upper body ergometer'] },
  { id: 'kettlebell', name: 'Kettlebell', icon: 'kettlebell', eq: ['kettlebell'] },
  { id: 'band', name: 'Bands', icon: 'stretch', eq: ['band', 'resistance band'] },
  { id: 'other', name: 'Balls & more', icon: 'circle', eq: ['medicine ball', 'stability ball', 'bosu ball', 'rope', 'weighted', 'roller', 'wheel roller', 'hammer', 'tire'] },
]
const EQ_OF = Object.fromEntries(EQ_GROUPS.flatMap(g => g.eq.map(x => [x, g.id])))
export const eqGroupOf = e => (isBW(e) ? null : EQ_OF[e.eq] || 'other')

// Exercises everyone knows — they lead a quick session when the category has them.
const STAPLES = {
  run: ['0685', '3656', '3636', '3655', '1460', '3671'],
  hiit: ['1160', '0630', '0514', '3224', '3361', '3636'],
  cardio: ['0630', '1160', '3224', '3223', '0685', '3361'],
  abs: ['0274', '0276', '0003', '0472', '0464'],
  upper: ['0662', '0499', '0814', '0283', '0652', '1326'],
  lower: ['1460', '0514', '3013', '1373', '3769', '1489'],
  full: ['0662', '1460', '1160', '0630', '0499', '3013', '0274'],
  flex: ['1604', '1511', '1585', '1271', '1424', '1363', '1494'],
  chest: ['0025', '0314', '0577', '0308', '0188'],
  back: ['0027', '0150', '0861', '0293', '1350', '0032'],
  legs: ['0043', '0739', '0085', '0585', '0586', '1760', '0770'],
  shoulders: ['0405', '0334', '0091', '0426'],
  biceps: ['0031', '0294', '0313', '0447'],
  triceps: ['0201', '0061', '0814'],
  core: ['0175', '0472'],
  gfull: ['0043', '0025', '0027', '0405', '0085', '0294', '0201'],
}
const BIG_EQ = new Set(['barbell', 'olympic barbell', 'trap bar', 'smith machine', 'sled machine'])
const BIG_TG = new Set(['pectorals', 'quads', 'glutes', 'lats', 'upper back', 'hamstrings', 'delts'])

export const categoryOf = (mode, cat) => (CATEGORIES[mode] || []).find(c => c.id === cat) || null

/** The exercises of a category (optionally one gym equipment group), library order. */
export function exercisesOf(mode, cat, eqGroup = null) {
  const c = categoryOf(mode, cat)
  if (!c) return []
  return EXDB.filter(e => c.test(e) && (!eqGroup || eqGroupOf(e) === eqGroup))
}
export const countOf = (mode, cat, eqGroup = null) => exercisesOf(mode, cat, eqGroup).length
/** All exercises of a section: 325 at home, the rest at the gym. */
export const sectionCount = mode => EXDB.filter(e => (mode === 'home' ? isBW(e) : !isBW(e))).length

// a small seeded random (mulberry32) — the same seed gives the same session
function rng(seed) {
  let a = (seed >>> 0) || 1
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const plainScore = e => (/\(|v\. ?\d|\bwith\b|\bon\b|\bversion\b/.test(e.n) ? 3 : 0) + e.n.split(' ').length * 0.35

/** The cfg (sets / reps or seconds) for one exercise in a session of `mode` / `cat`. */
export function prescribe(e, mode, cat) {
  if (cat === 'flex') return { id: e.id, mode: 'time', sets: 2, sec: 30, weight: 0 }
  if (cat === 'hiit' || cat === 'cardio') return { id: e.id, mode: 'time', sets: 3, sec: 40, weight: 0 }
  if (HOLD_RE.test(e.n)) return { id: e.id, mode: 'time', sets: 3, sec: 40, weight: 0 }
  if (mode === 'home') return { id: e.id, mode: 'reps', sets: 3, reps: cat === 'abs' ? 15 : 12, weight: 0 }
  const big = BIG_EQ.has(e.eq) && BIG_TG.has(e.tg)
  return { id: e.id, mode: 'reps', sets: big ? 4 : 3, reps: big ? 8 : 12, weight: 0 }
}

/**
 * Pick `count` exercises for a quick session. `seed` makes it repeatable (e.g. the date number
 * plus how many times shuffle was tapped). Returns the exercises (library objects).
 */
export function pickExercises(mode, cat, { count = 6, eqGroup = null, seed = 1 } = {}) {
  const pool = exercisesOf(mode, cat, eqGroup)
  if (!pool.length) return []
  const r = rng(seed)
  const byId = new Map(pool.map(e => [e.id, e]))
  const staples = (STAPLES[mode === 'gym' && cat === 'full' ? 'gfull' : cat] || []).map(id => byId.get(id)).filter(Boolean)
  // staples in a seeded order, then the rest by plainness with a seeded jitter
  const st = staples.map(e => [r(), e]).sort((x, y) => x[0] - y[0]).map(x => x[1])
  const rest = pool.filter(e => !staples.includes(e)).map(e => [plainScore(e) + r() * 2.5, e]).sort((x, y) => x[0] - y[0]).map(x => x[1])
  // a few staples (not all — some variety), then the rest
  const keep = Math.min(st.length, Math.max(2, Math.ceil(count * 0.6)))
  const ranked = [...st.slice(0, keep), ...rest, ...st.slice(keep)]
  const out = [], per = new Map()
  const muscles = new Set(pool.map(e => e.tg)).size
  const cap = muscles >= 3 ? 2 : count
  for (const pass of [cap, count]) {
    for (const e of ranked) {
      if (out.length >= count) break
      if (out.includes(e)) continue
      const k = per.get(e.tg) || 0
      if (k >= pass) continue
      out.push(e); per.set(e.tg, k + 1)
    }
  }
  return out
}

/** A one-off routine for beginWorkout() — from a category, or from the exercises you picked. */
export function sessionRoutine(mode, cat, exercises, { picked = false } = {}) {
  const c = categoryOf(mode, cat)
  const name = picked ? (mode === 'gym' ? 'My picks at the gym' : 'My picks at home') : (c ? c.session : 'Freestyle')
  return {
    id: 'quick-' + mode + '-' + (cat || 'pick'), name, color: c ? c.color : 'green', quick: true,
    ex: exercises.map(e => prescribe(e, mode, cat)),
  }
}

/** Rough minutes for a session: work + rest per set (90 s gym, 45 s home, 20 s intervals). */
export function sessionMinutes(routine) {
  let sec = 0
  for (const x of routine.ex) {
    const work = x.mode === 'time' ? x.sec : x.reps * 3.5
    const rest = x.mode === 'time' ? 20 : routine.id.startsWith('quick-gym') ? 90 : 45
    sec += x.sets * (work + rest)
  }
  return Math.max(5, Math.round(sec / 60))
}

/** What to suggest today, from your goal: lose → HIIT at home, muscle → a gym day, keep → full body. */
export function suggestion(program, day = new Date().getDay()) {
  if (program === 'muscle') {
    const rot = ['chest', 'back', 'legs', 'shoulders', 'chest', 'back', 'legs']
    return { mode: 'gym', cat: rot[day % 7] }
  }
  if (program === 'keep') return { mode: day % 2 ? 'home' : 'gym', cat: 'full' }
  return { mode: 'home', cat: day % 3 === 2 ? 'abs' : 'hiit' }
}
