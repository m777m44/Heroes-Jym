// Today's plan (2.9): every day one workout, a steps target and a water target that fit
// together, aimed at losing fat and building a fitter body. 3.0: the week follows your
// programme — fat loss (below), muscle gain (push / pull / legs / upper / lower in the gym,
// two recovery days) or keeping your weight (a mix) — chosen on the Ideal body screen.
//
//   · The week (Saturday → Friday) alternates hard and easy days: full body, a walking day,
//     legs & glutes, HIIT, upper body & core, a second walking day, and Friday for mobility.
//   · A routine from your own week plan always wins: the plan then just sizes steps & water
//     around it.
//   · The steps target grows with you: your last 7 days' average + 10 %, more on walking days,
//     less on HIIT and recovery days (5,000 – 18,000).
//   · The water target is the automatic water goal (body weight, steps and training).
//   · Level: how often you trained in the last 14 days (fewer sets when starting, more later).
//     With a BMI of 30 or more, jumps are swapped for joint-friendly moves.
//
// Pure functions: no store, no clock other than the arguments.
import { goalOf, stepsOn, caloriesFor, strideMeters } from './stepMetrics.js'
import { waterGoalMlOf, bodyKg, workoutMinutesOn, mlOn } from './water.js'
import { effectiveRoutine } from './history.js'
import { idealBodyOf } from './idealBody.js'
import { scaleStatus, energyOn, intensityFor, setDelta, scaleReasons } from './scaleWorkout.js'

// [id, sets, reps] — reps for holds are seconds (`hold`).
const HOLD = 'hold'
export const PLAN_DAYS = {
  full: {
    title: 'Full-body fat burn', icon: 'flame', color: 'orange', met: 6, rest: 30,
    ex: [['0514', 3, 12], ['0662', 3, 10], ['1460', 3, 12], ['0630', 3, 20], ['3013', 3, 15], ['0687', 3, 20]],
  },
  walk: {
    title: 'Walking day + core', icon: 'figureWalk', color: 'green', met: 4, rest: 25, steps: 1.25,
    ex: [['0003', 3, 20], ['0276', 3, 12], ['0459', 3, 20], ['0006', 3, 20]],
  },
  lower: {
    title: 'Legs & glutes', icon: 'legs', color: 'purple', met: 5.5, rest: 35,
    ex: [['2368', 3, 10], ['3769', 3, 12], ['3561', 3, 12], ['3470', 3, 10], ['1373', 3, 20], ['3361', 3, 16]],
  },
  hiit: {
    title: 'HIIT fat burner', icon: 'bolt', color: 'red', met: 8, rest: 20, steps: 0.9,
    ex: [['1160', 4, 10], ['3223', 4, 12], ['0630', 4, 20], ['0514', 4, 12], ['3360', 3, 10], ['3224', 4, 15]],
  },
  upper: {
    title: 'Upper body & core', icon: 'figureStrength', color: 'blue', met: 5, rest: 35,
    ex: [['0662', 4, 10], ['0659', 3, 15], ['1471', 3, 8], ['0464', 3, 12], ['0274', 3, 15], ['0001', 3, 12]],
  },
  walk2: {
    title: 'Long walk + core', icon: 'route', color: 'teal', met: 4, rest: 25, steps: 1.3,
    ex: [['1685', 3, 12], ['0687', 3, 20], ['0276', 3, 12], ['1373', 3, 20]],
  },
  // 3.0 — muscle-gain days (gym: barbell, dumbbells, cable, machines), heavier and slower
  push: {
    title: 'Push: chest, shoulders & triceps', icon: 'figureStrength', color: 'orange', met: 5, rest: 90, gym: true, steps: 0.9,
    ex: [['0025', 4, 8], ['0314', 3, 10], ['0405', 3, 10], ['0334', 3, 15], ['0201', 3, 12], ['0251', 3, 10]],
  },
  pull: {
    title: 'Pull: back & biceps', icon: 'arm', color: 'blue', met: 5, rest: 90, gym: true, steps: 0.9,
    ex: [['0032', 3, 5], ['0652', 4, 8], ['0027', 3, 10], ['0198', 3, 12], ['0378', 3, 15], ['0294', 3, 12]],
  },
  legs: {
    title: 'Legs: squat & hinge', icon: 'legs', color: 'purple', met: 6, rest: 120, gym: true, steps: 0.9,
    ex: [['0043', 4, 8], ['0085', 3, 10], ['0739', 3, 12], ['0586', 3, 12], ['0605', 4, 15], ['0472', 3, 12]],
  },
  gupper: {
    title: 'Upper body strength', icon: 'dumbbell', color: 'teal', met: 5, rest: 90, gym: true, steps: 0.9,
    ex: [['0289', 4, 10], ['0861', 4, 10], ['0426', 3, 10], ['0292', 3, 10], ['0313', 3, 12], ['0060', 3, 10]],
  },
  glower: {
    title: 'Lower body strength', icon: 'legs', color: 'pink', met: 5.5, rest: 90, gym: true, steps: 0.9,
    ex: [['1760', 4, 12], ['1459', 4, 10], ['0336', 3, 10], ['0585', 3, 15], ['1372', 3, 15], ['0274', 3, 20]],
  },
  recover: {
    title: 'Mobility & recovery', icon: 'stretch', color: 'mint', met: 2.5, rest: 15, steps: 0.85,
    ex: [['1511', 2, 30, HOLD], ['0613', 2, 30, HOLD], ['1377', 2, 30, HOLD], ['1405', 2, 30, HOLD], ['1471', 2, 6], ['3013', 2, 12]],
  },
}
/** getDay() → the day's kind (Saturday first). */
export const WEEK_KINDS = { 6: 'full', 0: 'walk', 1: 'lower', 2: 'hiit', 3: 'upper', 4: 'walk2', 5: 'recover' }
/** 3.0 — the week for each programme (S.bodyGoal; 'auto' follows the ideal-body screen). */
export const PROGRAM_WEEKS = {
  lose: WEEK_KINDS,
  muscle: { 6: 'push', 0: 'pull', 1: 'legs', 2: 'recover', 3: 'gupper', 4: 'glower', 5: 'recover' },
  keep: { 6: 'full', 0: 'walk', 1: 'gupper', 2: 'recover', 3: 'lower', 4: 'walk2', 5: 'glower' },
}
/** The programme the plan follows: the one chosen, else what your body needs (fat loss by default). */
export function programOf(S) {
  const g = S && S.bodyGoal
  if (g === 'lose' || g === 'muscle' || g === 'keep') return g
  const r = idealBodyOf(S || {})
  return r && r.program ? r.program : 'lose'
}
export const PLAN_TITLES = [...Object.values(PLAN_DAYS).map(d => d.title), 'Your routine']

// Joint-friendly swaps (BMI ≥ 30): jumps → controlled moves.
const LOW_IMPACT = { '0514': '1685', '1160': '1471', '3223': '3655', '3224': '1460', '3361': '3470', '3360': '0464' }

/** Fat-loss tips — one a day, by day of the year (English t() keys). */
export const TIPS = [
  'Eat protein with every meal: it keeps you full and protects your muscles.',
  'Drink a glass of water before each meal.',
  'Swap sugary drinks for water or unsweetened tea.',
  'Sleep 7–8 hours: short sleep makes you hungrier.',
  'A 10-minute walk after meals helps control blood sugar.',
  'Fill half your plate with vegetables.',
  'Eat slowly: it takes about 20 minutes to feel full.',
  'Aim for 0.5–1 kg a week: steady loss stays off.',
  'Take the stairs instead of the lift today.',
  'Consistency beats intensity: show up again tomorrow.',
]

/** 3.0 — muscle-gain tips (programme 'muscle'). */
export const MUSCLE_TIPS = [
  'Add a little weight or one more rep than last time: that is how muscle grows.',
  'Eat protein at every meal — about 2 g per kg of body weight a day.',
  'Rest 2–3 minutes between heavy sets so the next one is strong too.',
  'Sleep 7–9 hours: muscle is built while you recover.',
  'A small surplus is enough: about 250–300 kcal over what you burn.',
  'Control the way down: 2–3 seconds on every rep.',
  'Train each muscle about twice a week.',
  'Warm up with two light sets before your first heavy one.',
  'Gaining about 0.25 kg a week keeps it mostly muscle.',
  'Log every set — what gets measured gets better.',
]

const round500 = n => Math.round(n / 500) * 500
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const isoOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const dayAt = iso => new Date(iso + 'T12:00:00')

/** Workouts in the 14 days before `iso` → 'easy' | 'normal' | 'hard'. */
export function levelOf(S, iso) {
  const end = dayAt(iso).getTime()
  const n = new Set((S.workouts || []).filter(w => {
    const t = dayAt(w.d || '1970-01-01').getTime()
    return t < end && end - t <= 14 * 864e5
  }).map(w => w.d)).size
  return n >= 7 ? 'hard' : n >= 3 ? 'normal' : 'easy'
}

/** Average steps over the 7 days before `iso`, counting days with steps; null if < 3 such days. */
export function recentStepAverage(S, iso) {
  const d = dayAt(iso)
  const vals = []
  for (let i = 1; i <= 7; i++) {
    const v = stepsOn(S, isoOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - i, 12)))
    if (v > 0) vals.push(v)
  }
  return vals.length >= 3 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export function stepsTargetFor(S, iso, kind) {
  const avg = recentStepAverage(S, iso)
  const base = avg == null ? clamp(goalOf(S), 6000, 14000) : clamp(round500(avg * 1.1), 6000, 14000)
  const mult = (PLAN_DAYS[kind] && PLAN_DAYS[kind].steps) || 1
  return clamp(round500(base * mult), 5000, 18000)
}

export function bmiOf(S) {
  const kg = bodyKg(S)
  const h = Number(S && S.heightCm) / 100
  return kg && h > 1 ? kg / (h * h) : null
}

/** Seconds one set takes: ~3 s a rep, or the hold. */
const setSecs = e => (e.hold ? e.reps : e.reps * 3)

/** Today's plan. */
export function planFor(S, iso) {
  const wd = dayAt(iso).getDay()
  const own = effectiveRoutine(S, iso)
  const level = levelOf(S, iso)
  const bmi = bmiOf(S)
  const lowImpact = bmi != null && bmi >= 30
  // A day you marked as rest becomes the gentle mobility & recovery session.
  const rest = S && S.dayPlan && S.dayPlan[iso] === 'rest'
  const program = programOf(S)
  const kind = own && own.ex && own.ex.length ? 'routine' : rest ? 'recover' : (PROGRAM_WEEKS[program] || WEEK_KINDS)[wd]
  const spec = PLAN_DAYS[kind] || { title: 'Your routine', icon: 'dumbbell', color: 'acc', met: 5, rest: 60 }
  // 4.1 — linked to the scale: how far you are from your ideal / target weight and today's
  // energy size the sets (lib/scaleWorkout.js)
  const scale = scaleStatus(S, iso)
  const energy = energyOn(S, iso)
  const delta = setDelta({ kind, gym: !!spec.gym, urgency: scale && scale.urgency, energy, goal: scale && scale.goal })
  const exercises = kind === 'routine'
    ? own.ex.map(c => ({ id: c.id, sets: Math.max(1, c.sets || 3), reps: Math.max(1, c.reps || 10), hold: false }))
    : spec.ex.map(([id, sets, reps, hold]) => ({
      id: lowImpact && LOW_IMPACT[id] ? LOW_IMPACT[id] : id,
      sets: clamp(sets + (level === 'easy' ? -1 : level === 'hard' && kind !== 'recover' && !spec.gym ? 1 : 0) + delta, 2, 5),
      reps, hold: hold === HOLD,
    }))
  const work = exercises.reduce((a, e) => a + e.sets * (setSecs(e) + spec.rest), 0)
  const minutes = Math.max(10, Math.round(work / 60) + 5)         // + a 5-minute warm-up
  const kg = bodyKg(S) || 75
  const kcalWorkout = Math.round(spec.met * kg * minutes / 60)
  const stepsTarget = stepsTargetFor(S, iso, kind === 'routine' ? null : kind)
  const stride = strideMeters(S)
  const kcalSteps = Math.round(caloriesFor(stepsTarget, { strideM: stride, ...(bodyKg(S) ? { weight: bodyKg(S), unit: 'kg' } : {}) }))
  const doy = Math.floor((dayAt(iso) - new Date(dayAt(iso).getFullYear(), 0, 0)) / 864e5)
  return {
    iso, kind, program, gym: !!spec.gym, title: kind === 'routine' ? own.name : spec.title, icon: spec.icon, color: spec.color,
    routineId: kind === 'routine' ? own.id : null,
    exercises, minutes, kcalWorkout, stepsTarget, kcalSteps,
    kcalTotal: kcalWorkout + kcalSteps,
    fatGrams: Math.round((kcalWorkout + kcalSteps) / 7.7),     // ~7,700 kcal per kg of body fat
    waterMl: waterGoalMlOf(S, iso),
    level, lowImpact, tip: (program === 'muscle' ? MUSCLE_TIPS : TIPS)[doy % TIPS.length],
    scale, energy, intensity: intensityFor(kind, scale && scale.urgency, energy), reasons: scaleReasons(scale),
  }
}

/** A one-off routine for beginWorkout() (not saved in your routines). */
export function planRoutine(plan) {
  return {
    id: 'plan-' + plan.iso, name: plan.title, color: plan.color, plan: true,
    ex: plan.exercises.map(e => ({ id: e.id, sets: e.sets, reps: e.reps, weight: 0 })),
  }
}

/** How far along today is: each part 0..1, `score` the average (0..100). */
export function planProgress(S, plan, { now = Date.now(), pending = 0 } = {}) {
  const steps = stepsOn(S, plan.iso) + (pending || 0)            // + live steps not yet saved
  const water = mlOn(S, plan.iso)
  const trainedMin = workoutMinutesOn(S, plan.iso, now)
  const trained = (S.workouts || []).some(w => w.d === plan.iso)
  const p = {
    steps, water, trainedMin, trained,
    stepsPct: Math.min(1, steps / Math.max(1, plan.stepsTarget)),
    waterPct: Math.min(1, water / Math.max(1, plan.waterMl)),
    workoutPct: trained ? 1 : Math.min(1, trainedMin / Math.max(1, plan.minutes)),
  }
  p.score = Math.round((p.stepsPct + p.waterPct + p.workoutPct) / 3 * 100)
  p.done = p.stepsPct >= 1 && p.waterPct >= 1 && p.workoutPct >= 1
  return p
}

// ---- 2.10: the week at a glance and the streak ----------------------------------------------

/** The plans of the week (Saturday → Friday) that holds `iso`: [{ iso, dow, plan }]. */
export function weekPlan(S, iso) {
  const d = dayAt(iso)
  const back = (d.getDay() + 1) % 7                     // days since Saturday
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back + i, 12)
    const xi = isoOf(x)
    return { iso: xi, dow: x.getDay(), plan: planFor(S, xi) }
  })
}

/** A day counts as "on plan" when at least two of its three parts are done (score ≥ 67). */
export const ON_PLAN_SCORE = 67

/**
 * Days in a row on plan, ending today (when today already counts) or yesterday — up to `max`.
 * A streak isn't broken by today still being in progress.
 */
export function planStreak(S, iso, { pending = 0, max = 60 } = {}) {
  const d = dayAt(iso)
  const scoreOn = (xi, pend, now) => planProgress(S, planFor(S, xi), { now, pending: pend }).score
  let n = scoreOn(iso, pending, Date.now()) >= ON_PLAN_SCORE ? 1 : 0
  for (let i = 1; i <= max; i++) {
    const xi = isoOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - i, 12))
    if (scoreOn(xi, 0, dayAt(xi).getTime() + 12 * 3600e3 - 1) < ON_PLAN_SCORE) break
    n++
  }
  return n
}
