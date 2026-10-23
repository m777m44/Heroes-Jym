// 4.2 — the calorie calculator: how many calories a day to burn (and eat) to reach a target
// weight in a chosen number of days.
//
//   1 kg of body fat ≈ 7,700 kcal
//   total deficit  = (current − target) × 7,700
//   daily deficit  = total deficit ÷ days
//   BMR            = Mifflin-St Jeor: 10·kg + 6.25·cm − 5·age + 5 (men) / − 161 (women)
//   TDEE           = BMR × activity (1.2 sedentary · 1.375 light · 1.55 moderate · 1.725 active)
//   the daily deficit is split between food (dietShare %) and exercise (the rest) — 0 % by
//   default: all of it from training, as asked; the warnings say when that is too much
//
// Warnings, so the numbers stay honest: exercise over 1,000 kcal a day, a deficit over half of
// TDEE, faster than 1 kg a week (or 0.5 kg a day), and eating below BMR / below 1,500 (men) or
// 1,200 (women) kcal. `safeDays` is how long the same loss takes at a steady 0.75 kg a week.
//
// Pure: no store. Errors and warnings are English t() keys (+ args).
export const KCAL_PER_KG = 7700
export const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }
export const ACTIVITY_LEVELS = Object.keys(ACTIVITY)
export const ACTIVITY_LABEL = { sedentary: 'Sedentary', light: 'Lightly active', moderate: 'Moderately active', active: 'Very active' }
export const ACTIVITY_HINT = {
  sedentary: 'Desk job, little walking (under 5,000 steps)',
  light: 'Some walking or light training (5,000–7,500 steps)',
  moderate: 'On your feet or training 3–5 days (7,500–10,000 steps)',
  active: 'Hard training or a physical job (over 10,000 steps)',
}
export const SAFE_KG_PER_WEEK = 0.75
export const MAX_DIET_SHARE = 70

/** The activity level that matches an average of `steps` a day. */
export const activityFromSteps = steps => (!(steps > 0) ? 'light' : steps < 5000 ? 'sedentary' : steps < 7500 ? 'light' : steps < 10000 ? 'moderate' : 'active')

export const bmrOf = ({ kg, cm, age, sex }) => 10 * kg + 6.25 * cm - 5 * age + (sex === 'female' ? -161 : 5)

/**
 * Throws { key, args } on bad input. Weights in kg, height in cm.
 * Returns the whole calculation (rounded) plus `warnings` [{ key, args }].
 */
export function calcCalorieGoal({ currentKg, targetKg, days, heightCm, age, sex = 'male', activity = 'moderate', dietShare = 0 }) {
  const err = key => { throw Object.assign(new Error(key), { key, args: [] }) }
  if (!(currentKg > 0) || !(targetKg > 0)) err('Enter your current and target weight.')
  if (!(heightCm >= 100 && heightCm <= 250) || !(age >= 13 && age <= 100)) err('Enter your height (100–250 cm) and age (13–100).')
  if (targetKg >= currentKg) err('The target weight has to be below your current weight — this calculator is for losing weight.')
  if (!(days >= 1)) err('Enter a number of days above zero.')
  const share = Math.min(MAX_DIET_SHARE, Math.max(0, Number(dietShare) || 0))
  const lose = currentKg - targetKg
  const totalDeficit = lose * KCAL_PER_KG
  const dailyDeficit = totalDeficit / days
  const bmr = bmrOf({ kg: currentKg, cm: heightCm, age, sex })
  const tdee = bmr * (ACTIVITY[activity] || ACTIVITY.moderate)
  const dietDeficit = dailyDeficit * share / 100
  const exerciseDeficit = dailyDeficit - dietDeficit
  const eat = tdee - dietDeficit
  const weekly = dailyDeficit * 7 / KCAL_PER_KG
  const floor = sex === 'female' ? 1200 : 1500
  const safeDays = Math.ceil(lose / SAFE_KG_PER_WEEK * 7)

  const warnings = []
  if (exerciseDeficit > 1000) warnings.push({ key: 'Burning {0} kcal a day from exercise is a lot. Give it more days, or take part of it from food.', args: [Math.round(exerciseDeficit)] })
  if (dailyDeficit > tdee * 0.5) warnings.push({ key: 'The daily deficit is more than half of what your body uses ({0} kcal) — that isn’t healthy. Choose more days.', args: [Math.round(tdee)] })
  if (lose / days > 0.5) warnings.push({ key: 'Losing more than 0.5 kg a day isn’t sustainable.', args: [] })
  else if (weekly > 1) warnings.push({ key: 'That is {0} kg a week — faster than the recommended 0.5–1 kg. Steady loss stays off.', args: [weekly.toFixed(1)] })
  if (eat < Math.max(bmr, floor)) warnings.push({ key: 'Eating under {0} kcal a day isn’t recommended without a doctor.', args: [Math.round(Math.max(bmr, floor))] })

  return {
    currentKg, targetKg, days, heightCm, age, sex, activity, dietShare: share,
    loseKg: Math.round(lose * 10) / 10,
    totalDeficit: Math.round(totalDeficit),
    dailyDeficit: Math.round(dailyDeficit),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    dietDeficit: Math.round(dietDeficit),
    exerciseKcal: Math.round(exerciseDeficit),
    eatKcal: Math.round(eat),
    weeklyKg: Math.round(weekly * 100) / 100,
    safeDays,
    warnings,
    realistic: warnings.length === 0,
  }
}

const dayMs = iso => new Date(iso + 'T12:00:00').getTime()
/** Where a saved goal stands on `iso`: day n of N, days left, finished? */
export function goalProgress(goal, iso) {
  if (!goal || !goal.from || !(goal.days >= 1)) return null
  const day = Math.floor((dayMs(iso) - dayMs(goal.from)) / 864e5) + 1
  return { day: Math.max(1, day), days: goal.days, left: Math.max(0, goal.days - day + 1), over: day > goal.days, before: day < 1 }
}
