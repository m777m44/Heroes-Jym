// 7.1 — "Your day": one timed schedule built from your ideal-body numbers. Meals with a calorie
// target and dishes that fit it, water through the day adding up to the daily goal, today's
// workout and an evening walk. Laid out between the time you wake up and the time you sleep.
// Pure (no store, no DOM). The screen is components/body/DaySchedule.jsx; reminders are
// scheduled by syncDayReminders() in lib/mobile.js.
//
//   S.day = { wake: 'HH:MM', sleep: 'HH:MM', workout: 'auto' | 'HH:MM', remind: bool }
import { planFor } from './dailyPlan.js'
import { RECIPES, recipeNutrition } from './kitchen.js'
import { mlOn, waterGoalMlOf } from './water.js'
import { dayEntries, foodGoalOf } from './food.js'
import { stepsOn } from './stepMetrics.js'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
export const toMin = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m }
export const toHHMM = m => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0') }
const r50 = v => Math.max(0, Math.round(v / 50) * 50)

export const MEAL_SPLIT = { b: 0.25, l: 0.35, s: 0.10, d: 0.30 }
export const DAY_ID_BASE = 7500          // native notification ids: today 7500–7514, tomorrow 7515–7529
// 9.0.0 (review on PR #11): a week ahead, so the reminders keep coming while the app stays
// closed — the five days after tomorrow use 8100–8174. Remade whenever the app opens.
export const DAY_ID_MORE = 8100
export const DAY_REMIND_DAYS = 7, DAY_REMIND_PER_DAY = 15
export const dayReminderId = (off, i) => (off < 2 ? DAY_ID_BASE + off * DAY_REMIND_PER_DAY + i : DAY_ID_MORE + (off - 2) * DAY_REMIND_PER_DAY + i)
export const dayReminderIds = () => Array.from({ length: DAY_REMIND_DAYS * DAY_REMIND_PER_DAY }, (_, n) => dayReminderId(Math.floor(n / DAY_REMIND_PER_DAY), n % DAY_REMIND_PER_DAY))

export function dayPrefs(S) {
  const d = (S && S.day) || {}
  let wake = HHMM.test(d.wake || '') ? d.wake : '07:00'
  let sleep = HHMM.test(d.sleep || '') ? d.sleep : '23:00'
  // a day shorter than 12 h or past midnight falls back to the defaults
  const span = (toMin(sleep) - toMin(wake) + 1440) % 1440
  if (span < 12 * 60 || toMin(sleep) <= toMin(wake)) { wake = '07:00'; sleep = '23:00' }
  return { wake, sleep, workout: HHMM.test(d.workout || '') ? d.workout : 'auto', remind: !!d.remind }
}

/** Dishes for a meal near a calorie target: [{ id, name, sv, kcal }], varied by the day. */
export function mealIdeas(meal, kcal, seed = 0, n = 3) {
  const list = RECIPES.filter(r => r.meals.includes(meal)).map(r => {
    const per = recipeNutrition(r).kcal || 1
    const sv = Math.min(2, Math.max(0.5, Math.round((kcal / per) * 2) / 2))
    return { id: r.id, name: r.name, sv, kcal: Math.round(per * sv), per, off: Math.abs(per * sv - kcal) / kcal }
  }).filter(x => x.off < 0.35).sort((a, b) => a.off - b.off)
  if (!list.length) return []
  const pool = list.slice(0, Math.max(n, Math.min(list.length, 8)))
  const out = []
  for (let i = 0; i < Math.min(n, pool.length); i++) out.push(pool[(seed + i * 3) % pool.length])
  return [...new Map(out.map(x => [x.id, x])).values()].map(({ off, ...x }) => x)
}

/**
 * The day as a list sorted by time. `r` = idealBody() result (for calories and water).
 * Each item: { key, at, kind: 'wake'|'water'|'meal'|'workout'|'walk'|'sleep', ml?, meal?, kcal?, ideas?, plan?, status }
 * status: 'done' | 'next' | 'late' | 'later'.
 */
export function daySchedule(S, r, iso, now = new Date()) {
  const p = dayPrefs(S)
  const wake = toMin(p.wake), sleep = toMin(p.sleep)
  const plan = planFor(S, iso)
  const kcalDay = foodGoalOf(S, iso).kcal    // the same goal as the food log
  const waterGoal = r && r.child && r.waterMl ? r.waterMl : waterGoalMlOf(S, iso) || (r && r.waterMl) || 2000
  const breakfast = wake + 45, lunch = wake + 6 * 60, dinner = sleep - 3 * 60
  const snack = Math.round((lunch + dinner) / 2) - 30
  const workout = p.workout !== 'auto' ? toMin(p.workout) : Math.min(dinner - 90, snack + 75)
  const doy = Math.floor((new Date(iso + 'T12:00:00') - new Date(new Date(iso + 'T12:00:00').getFullYear(), 0, 0)) / 864e5)
  const items = [{ key: 'wake', at: wake, kind: 'wake' }]
  const meal = (m, at) => {
    const kcal = kcalDay ? Math.round(kcalDay * MEAL_SPLIT[m] / 10) * 10 : null
    items.push({ key: 'meal-' + m, at, kind: 'meal', meal: m, kcal, ideas: kcal ? mealIdeas(m, kcal, doy) : [] })
  }
  meal('b', breakfast); meal('l', lunch); meal('s', snack); meal('d', dinner)
  items.push({ key: 'workout', at: workout, kind: 'workout', plan: { title: plan.title, icon: plan.icon, color: plan.color, minutes: plan.minutes, kcal: plan.kcalWorkout, n: plan.exercises.length, gym: plan.gym } })
  items.push({ key: 'walk', at: dinner + 40, kind: 'walk', steps: plan.stepsTarget, min: 20 })
  // water: on waking, mid-morning, with lunch, afternoon, before / after the workout, evening
  const wslots = [[wake, 1], [wake + 150, 1.2], [lunch + 90, 1.2], [workout - 30, 1], [workout + plan.minutes + 10, 1.4], [dinner - 60, 1], [sleep - 90, 0.7]]
    .filter(([at]) => at > wake - 1 && at < sleep).sort((a, b) => a[0] - b[0])
  const wsum = wslots.reduce((a, x) => a + x[1], 0)
  let given = 0
  wslots.forEach(([at, w], i) => {
    const ml = i === wslots.length - 1 ? Math.max(50, waterGoal - given) : r50(waterGoal * w / wsum)
    given += ml
    items.push({ key: 'water-' + i, at, kind: 'water', ml, upto: given })
  })
  items.push({ key: 'sleep', at: sleep, kind: 'sleep' })
  const RANK = { wake: 0, water: 1, meal: 2, workout: 3, walk: 4, sleep: 5 }
  items.sort((a, b) => a.at - b.at || RANK[a.kind] - RANK[b.kind])

  // status against what you have actually done today
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const drank = mlOn(S, iso)
  const food = dayEntries(S, iso)
  const trained = (S.workouts || []).some(w => w.d === iso)
  const steps = stepsOn(S, iso)
  let nextSet = false
  for (const it of items) {
    let done = false
    if (it.kind === 'water') done = drank >= it.upto
    else if (it.kind === 'meal') done = food.some(e => e.m === it.meal)
    else if (it.kind === 'workout') done = trained
    else if (it.kind === 'walk') done = steps >= it.steps
    else done = it.kind === 'wake' ? nowMin >= it.at : false
    it.status = done ? 'done' : it.at + 45 < nowMin ? 'late' : !nextSet ? 'next' : 'later'
    if (it.status === 'next') nextSet = true
    it.time = toHHMM(it.at)
  }
  const tasks = items.filter(x => x.kind !== 'wake' && x.kind !== 'sleep')
  return {
    prefs: p, items, plan, kcalDay, waterGoal,
    done: tasks.filter(x => x.status === 'done').length, total: tasks.length,
    pct: Math.round(tasks.filter(x => x.status === 'done').length / Math.max(1, tasks.length) * 100),
  }
}

/** The reminders the schedule asks for (meals, workout, walk) — daily, at their times. */
export function dayReminderItems(S, r, iso) {
  if (!dayPrefs(S).remind) return []
  const d = daySchedule(S, r, iso, new Date(iso + 'T00:00:00'))
  return d.items.filter(x => x.kind === 'meal' || x.kind === 'workout' || x.kind === 'walk')
    .map((x, i) => ({ id: DAY_ID_BASE + i, at: x.at, hour: Math.floor(x.at / 60), minute: x.at % 60, item: x }))
}
