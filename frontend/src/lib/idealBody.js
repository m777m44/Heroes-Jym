// The ideal body (2.12): what a healthy, realistic weight is for YOUR height, age and sex, and
// what it takes to get there. Pure functions — every number on the "Ideal body" screen comes
// from here, in kilograms and centimetres (the screen converts for display).
//
//   S.heightCm   height (100–250)
//   S.birthYear  for the age (set from "Age" on the screen, so it ages by itself)
//   S.sex        'male' | 'female' (falls back to the body diagram's S.body)
//   S.waistCm    optional — waist-to-height ratio
//
// Sources: WHO adult BMI bands (18.5–24.9), the higher healthy band often used from 65
// (22–27), the age-banded "desirable BMI" table of the US National Research Council (1989),
// the Devine / Robinson / Miller / Hamwi ideal-weight formulas, Deurenberg (1991) for body fat
// from BMI, Gallagher et al. (2000) for healthy body-fat ranges, Mifflin–St Jeor (1990) for
// the resting metabolic rate, and Ashwell's 0.5 waist-to-height boundary.
//
// These are estimates for adults (18+): for children and teenagers BMI is read on growth
// charts by age, so the screen says so instead of giving an ideal weight.
import { toKg, weeklyRate } from './weightTracker.js'
import { stepsOn } from './stepMetrics.js'

export const MIN_AGE = 13, ADULT_AGE = 18, MAX_AGE = 100
const r1 = v => Math.round(v * 10) / 10
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export function ageOf(S, now = new Date()) {
  const y = Number(S && S.birthYear)
  if (!Number.isFinite(y) || y < 1900) return null
  const a = now.getFullYear() - y
  return a >= MIN_AGE && a <= MAX_AGE ? a : null
}
/** The birth year to store for an age typed in today. */
export const birthYearFor = (age, now = new Date()) => (Number.isFinite(age) && age >= MIN_AGE && age <= MAX_AGE ? now.getFullYear() - Math.round(age) : null)
export const sexOf = S => (S && (S.sex === 'female' || S.sex === 'male') ? S.sex : S && S.body === 'female' ? 'female' : 'male')
const okHeight = h => Number.isFinite(h) && h >= 100 && h <= 250

/** The healthy BMI band for an adult of this age (WHO; 22–27 from 65). */
export function healthyBmi(age) {
  if (!Number.isFinite(age) || age < ADULT_AGE) return null
  return age >= 65 ? [22, 27] : [18.5, 24.9]
}
/** NRC (1989) desirable BMI by age, met with the healthy band — the age-adjusted ideal band. */
const NRC = [[24, 19, 24], [34, 20, 25], [44, 21, 26], [54, 22, 27], [64, 23, 28], [200, 24, 29]]
export function idealBmiBand(age) {
  const h = healthyBmi(age)
  if (!h) return null
  const row = NRC.find(r => age <= r[0])
  const lo = Math.max(h[0], row[1]), hi = Math.min(h[1], row[2])
  return lo < hi ? [lo, hi] : h
}

/** The four classic ideal-weight formulas (kg) — they use height and sex. */
export function formulas(heightCm, sex) {
  if (!okHeight(heightCm)) return null
  const inch = heightCm / 2.54 - 60                     // inches over 5 ft (negative below)
  const m = sex !== 'female'
  return {
    devine: r1(m ? 50 + 2.3 * inch : 45.5 + 2.3 * inch),
    robinson: r1(m ? 52 + 1.9 * inch : 49 + 1.7 * inch),
    miller: r1(m ? 56.2 + 1.41 * inch : 53.1 + 1.36 * inch),
    hamwi: r1(m ? 48 + 2.7 * inch : 45.5 + 2.2 * inch),
  }
}

/**
 * Everything the screen shows. `weightKg` = the latest weigh-in in kg (or null).
 * Returns null until height is known; `adult: false` for under-18s (BMI only, no ideal).
 */
export function idealBody({ heightCm, age, sex = 'male', weightKg = null, waistCm = null, stepsAvg = null } = {}) {
  if (!okHeight(heightCm)) return null
  const m2 = (heightCm / 100) ** 2
  const bmi = Number.isFinite(weightKg) && weightKg > 0 ? r1(weightKg / m2) : null
  const out = { heightCm, age, sex, weightKg, bmi, bmiCat: bmiCat(bmi, age), adult: Number.isFinite(age) ? age >= ADULT_AGE : null }
  if (Number.isFinite(waistCm) && waistCm >= 40 && waistCm <= 200) {
    const whtr = Math.round(waistCm / heightCm * 100) / 100
    out.whtr = whtr
    out.whtrCat = whtr < 0.4 ? 'low' : whtr < 0.5 ? 'healthy' : whtr < 0.6 ? 'raised' : 'high'
  }
  if (!out.adult) return out

  const healthy = healthyBmi(age), band = idealBmiBand(age)
  out.healthyKg = [r1(healthy[0] * m2), r1(healthy[1] * m2)]
  out.idealKg = [r1(band[0] * m2), r1(band[1] * m2)]
  const f = formulas(heightCm, sex)
  out.formulas = f
  const fAvg = (f.devine + f.robinson + f.miller + f.hamwi) / 4
  // the one number: half the age-adjusted BMI band's middle, half the formulas (which know
  // sex), kept inside the age-adjusted band
  out.ideal = r1(clamp(((band[0] + band[1]) / 2 * m2 + fAvg) / 2, out.idealKg[0], out.idealKg[1]))

  if (bmi != null) {
    // Deurenberg 1991 — body fat from BMI, age and sex
    const bf = 1.2 * bmi + 0.23 * age - 10.8 * (sex === 'female' ? 0 : 1) - 5.4
    out.bodyFat = r1(clamp(bf, 3, 60))
    out.bodyFatRange = fatRange(age, sex)
    out.bodyFatCat = out.bodyFat < out.bodyFatRange[0] ? 'low' : out.bodyFat <= out.bodyFatRange[1] ? 'healthy' : out.bodyFat <= out.bodyFatRange[1] + 6 ? 'high' : 'veryHigh'
    // Mifflin–St Jeor resting energy, the day's energy from the walking level
    out.bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5))
    out.activity = activityOf(stepsAvg)
    out.tdee = Math.round(out.bmr * ACTIVITY[out.activity])
    out.toIdeal = r1(weightKg - out.ideal)               // + to lose, − to gain
    const floor = sex === 'female' ? 1200 : 1500
    out.goal = Math.abs(out.toIdeal) < 0.5 || (weightKg >= out.idealKg[0] && weightKg <= out.idealKg[1]) ? 'keep' : out.toIdeal > 0 ? 'lose' : 'gain'
    out.kcal = out.goal === 'lose' ? Math.max(floor, out.tdee - 500) : out.goal === 'gain' ? out.tdee + 300 : out.tdee
    out.weeklyKg = out.goal === 'keep' ? 0 : out.goal === 'lose' ? r1(Math.min(0.5, Math.max(0.25, (out.tdee - out.kcal) * 7 / 7700))) : 0.25
    out.weeks = out.goal === 'keep' ? 0 : Math.ceil(Math.abs(out.toIdeal) / out.weeklyKg)
    out.proteinG = Math.round((out.goal === 'gain' ? 1.6 : 1.4) * Math.max(out.ideal, Math.min(weightKg, out.idealKg[1])))
    out.waterMl = Math.round(weightKg * 33 / 50) * 50
  }
  return out
}

function bmiCat(v, age) {
  if (!Number.isFinite(v)) return null
  const h = healthyBmi(age) || [18.5, 24.9]
  return v < h[0] ? 'under' : v <= h[1] ? 'normal' : v < 30 ? 'over' : 'obese'
}
/** Gallagher et al. 2000 — healthy body fat % by age and sex. */
export function fatRange(age, sex) {
  const f = sex === 'female'
  if (age < 40) return f ? [21, 32] : [8, 19]
  if (age < 60) return f ? [23, 33] : [11, 21]
  return f ? [24, 35] : [13, 24]
}
export const ACTIVITY = { low: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }
export function activityOf(stepsAvg) {
  if (!Number.isFinite(stepsAvg)) return 'light'
  return stepsAvg < 5000 ? 'low' : stepsAvg < 7500 ? 'light' : stepsAvg < 10000 ? 'moderate' : 'high'
}

/** The last 7 days' average steps (days with no steps count as 0 once you've started walking). */
export function stepsAverage(S, now = new Date(), days = 7) {
  let sum = 0, any = false
  for (let i = 1; i <= days; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    const n = stepsOn(S, iso)
    if (n) any = true
    sum += n
  }
  return any ? Math.round(sum / days) : null
}

/**
 * The pace check: how fast weight is actually changing (kg / week over 4 weeks) against a
 * safe pace (0.25–1 % of body weight per week). → { rate, pct, verdict } or null.
 */
export function paceCheck(history, unit, goal) {
  const rate = weeklyRate(history)
  const last = history && history.length ? history[history.length - 1] : null
  if (rate == null || !last) return null
  const kg = toKg(rate, unit), w = toKg(last.w, unit)
  const pct = Math.round(kg / w * 1000) / 10
  let verdict
  if (goal === 'lose') verdict = pct <= -1.0 ? 'tooFast' : pct <= -0.2 ? 'good' : pct < 0.2 ? 'stalled' : 'wrongWay'
  else if (goal === 'gain') verdict = pct >= 1.0 ? 'tooFast' : pct >= 0.1 ? 'good' : pct > -0.2 ? 'stalled' : 'wrongWay'
  else verdict = Math.abs(pct) < 0.3 ? 'steady' : 'drifting'
  return { rate: kg, pct, verdict }
}

/** Where `v` sits on the BMI scale 15–40, as 0–100 % (for the gauge). */
export const bmiPos = v => clamp((v - 15) / 25 * 100, 0, 100)
