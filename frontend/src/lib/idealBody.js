// The ideal body (2.12, extended in 3.0): what a healthy, realistic weight is for YOUR height,
// age, sex and frame, what your body is made of, and what it takes to get there. Pure
// functions: every number on the "Ideal body" screen comes from here, in kilograms and
// centimetres. The screen converts them for display.
//
//   S.heightCm   height (100–250)
//   S.birthYear  for the age (set from "Age" on the screen, so it ages by itself)
//   S.sex        'male' | 'female' (falls back to the body diagram's S.body)
//   S.waistCm    optional: waist-to-height, and with the neck the US-Navy body fat
//   S.neckCm     optional: US-Navy body fat
//   S.hipCm      optional: US-Navy body fat for women
//   S.wristCm    optional: frame size (small / medium / large)
//   S.frame      'auto' | 'small' | 'medium' | 'large'
//   S.bodyGoal   'auto' | 'lose' | 'muscle' | 'keep' (the programme: calories, macros, training)
//
// Sources:
// - BMI bands: WHO adult bands (18.5–24.9); the higher band often used from 65 (22–27); the
//   age-banded "desirable BMI" table of the US National Research Council (1989).
// - Ideal-weight formulas: Devine (1974), Robinson (1983), Miller (1983), Hamwi (1964),
//   Broca (1871), Lorentz (1929), BMI 22, and the body-fat method (lean mass ÷ (1 − a healthy
//   fat %)).
// - Frame size: Grant (1980), height ÷ wrist.
// - Body fat: Deurenberg (1991) from BMI; Hodgdon & Beckett (1984), the US-Navy tape method.
//   Healthy ranges: Gallagher et al. (2000).
// - Lean mass: Boer (1984). Skeletal muscle: Lee et al. (2000). Body water: Watson (1980).
// - Resting energy: Mifflin–St Jeor (1990). Waist-to-height: Ashwell's 0.5 boundary.
//
// 7.1 — every age from 2 to 100. Under 18 the healthy weight comes from BMI-for-age on the
// CDC (2000) growth charts: the 5th–85th percentile band for the height today, the 50th as the
// ideal. Resting energy for children uses Schofield (WHO 1985), water the IOM drinking amounts,
// body fat Deurenberg's child equation. Children never get a crash diet: under 13 a heavy
// child keeps the weight steady and grows into it; 13–17 at most −250 kcal and 0.25 kg a week.
import { toKg, weeklyRate } from './weightTracker.js'
import { stepsOn } from './stepMetrics.js'

export const MIN_AGE = 2, ADULT_AGE = 18, MAX_AGE = 100
const r1 = v => Math.round(v * 10) / 10
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const fin = v => typeof v === 'number' && Number.isFinite(v)
const DAY = 864e5

export function ageOf(S, now = new Date()) {
  const y = Number(S && S.birthYear)
  if (!Number.isFinite(y) || y < 1900) return null
  const a = now.getFullYear() - y
  return a >= MIN_AGE && a <= MAX_AGE ? a : null
}
/** The birth year to store for an age typed in today. */
export const birthYearFor = (age, now = new Date()) => (Number.isFinite(age) && age >= MIN_AGE && age <= MAX_AGE ? now.getFullYear() - Math.round(age) : null)
export const sexOf = S => (S && (S.sex === 'female' || S.sex === 'male') ? S.sex : S && S.body === 'female' ? 'female' : 'male')
export const MIN_HEIGHT = 70, MAX_HEIGHT = 250
const okHeight = h => fin(h) && h >= MIN_HEIGHT && h <= MAX_HEIGHT
/** A tape measurement in range, else null. */
export const okCm = (v, lo, hi) => (fin(v) && v >= lo && v <= hi ? v : null)

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

/** The classic ideal-weight formulas (kg): they use height and sex. */
export function formulas(heightCm, sex) {
  if (!okHeight(heightCm)) return null
  const inch = heightCm / 2.54 - 60                     // inches over 5 ft (negative below)
  const m = sex !== 'female'
  return {
    devine: r1(m ? 50 + 2.3 * inch : 45.5 + 2.3 * inch),
    robinson: r1(m ? 52 + 1.9 * inch : 49 + 1.7 * inch),
    miller: r1(m ? 56.2 + 1.41 * inch : 53.1 + 1.36 * inch),
    hamwi: r1(m ? 48 + 2.7 * inch : 45.5 + 2.2 * inch),
    broca: r1(m ? heightCm - 100 : heightCm - 105),
    lorentz: r1(heightCm - 100 - (heightCm - 150) / (m ? 4 : 2)),
    bmi22: r1(22 * (heightCm / 100) ** 2),
  }
}
/** The formulas the blended ideal weight averages (BMI 22 is already in the band's middle). */
const BLEND = ['devine', 'robinson', 'miller', 'hamwi', 'broca', 'lorentz']
export const FORMULA_ORDER = ['devine', 'robinson', 'miller', 'hamwi', 'broca', 'lorentz', 'bmi22', 'fat']

/** Grant (1980): height ÷ wrist → 'small' | 'medium' | 'large' (null without a wrist). */
export function frameOf(heightCm, wristCm, sex) {
  if (!okHeight(heightCm) || !okCm(wristCm, 10, 30)) return null
  const r = heightCm / wristCm
  return sex === 'female' ? (r > 11 ? 'small' : r >= 10.1 ? 'medium' : 'large') : (r > 10.4 ? 'small' : r >= 9.6 ? 'medium' : 'large')
}
export const FRAME_ADJ = { small: -0.05, medium: 0, large: 0.05 }

/** US-Navy (Hodgdon & Beckett) body fat % from the tape: null if a measurement is missing. */
export function navyBodyFat({ heightCm, waistCm, neckCm, hipCm, sex }) {
  if (!okHeight(heightCm) || !okCm(waistCm, 40, 200) || !okCm(neckCm, 20, 70)) return null
  let v
  if (sex === 'female') {
    if (!okCm(hipCm, 50, 200) || waistCm + hipCm - neckCm <= 0) return null
    v = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.22100 * Math.log10(heightCm)) - 450
  } else {
    if (waistCm - neckCm <= 0) return null
    v = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450
  }
  return fin(v) ? r1(clamp(v, 3, 60)) : null
}
/** Deurenberg (1991): body fat % from BMI, age and sex. */
export const bmiBodyFat = (bmi, age, sex) => r1(clamp(1.2 * bmi + 0.23 * age - 10.8 * (sex === 'female' ? 0 : 1) - 5.4, 3, 60))

/** Gallagher et al. 2000 — healthy body fat % by age and sex. */
export function fatRange(age, sex) {
  const f = sex === 'female'
  if (age < 40) return f ? [21, 32] : [8, 19]
  if (age < 60) return f ? [23, 33] : [11, 21]
  return f ? [24, 35] : [13, 24]
}

/** What the body is made of (kg / L), all estimates. */
export function composition({ weightKg, heightCm, age, sex, bodyFat }) {
  if (!fin(weightKg) || !okHeight(heightCm) || !fin(age)) return null
  const f = sex === 'female', h = heightCm, w = weightKg
  const fatKg = fin(bodyFat) ? r1(w * bodyFat / 100) : null
  const leanKg = fatKg != null ? r1(w - fatKg) : r1(f ? 0.252 * w + 0.473 * h - 48.3 : 0.407 * w + 0.267 * h - 19.2)   // Boer
  const muscleKg = r1(clamp(0.244 * w + 7.8 * (h / 100) + 6.6 * (f ? 0 : 1) - 0.098 * age - 3.3, 5, leanKg * 0.8))   // Lee 2000
  const waterL = r1(f ? -2.097 + 0.1069 * h + 0.2466 * w : 2.447 - 0.09156 * age + 0.1074 * h + 0.3362 * w)      // Watson
  return {
    fatKg, leanKg, muscleKg, waterL,
    musclePct: Math.round(muscleKg / w * 100),
    waterPct: Math.round(waterL / w * 100),           // 1 L of body water ≈ 1 kg
  }
}

export const ACTIVITY = { low: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }
export function activityOf(stepsAvg) {
  if (!Number.isFinite(stepsAvg)) return 'light'
  return stepsAvg < 5000 ? 'low' : stepsAvg < 7500 ? 'light' : stepsAvg < 10000 ? 'moderate' : 'high'
}
export const PROGRAMS = ['lose', 'muscle', 'keep']

/** Grams of protein, fat and carbs for a day's calories and a programme. */
export function macrosFor(kcal, program, refKg) {
  if (!fin(kcal) || !fin(refKg)) return null
  const perKg = program === 'lose' ? 1.8 : program === 'muscle' ? 2.0 : 1.6
  const protein = Math.round(perKg * refKg)
  const fat = Math.round(kcal * (program === 'muscle' ? 0.25 : 0.28) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  const total = protein * 4 + fat * 9 + carbs * 4 || 1
  return { protein, fat, carbs, pct: { protein: Math.round(protein * 400 / total), fat: Math.round(fat * 900 / total), carbs: Math.round(carbs * 400 / total) } }
}


// ---- 7.1: children and teenagers (2–17) ------------------------------------------------------
// CDC BMI-for-age, by whole year: [P5, P50, P85, P95]
const CDC = {
  male: { 2: [14.7, 16.6, 18.2, 19.3], 3: [14.4, 16.0, 17.4, 18.3], 4: [14.0, 15.6, 16.9, 17.8], 5: [13.8, 15.4, 16.8, 18.0], 6: [13.8, 15.4, 17.0, 18.4], 7: [13.8, 15.5, 17.4, 19.1], 8: [13.9, 15.8, 18.0, 20.0], 9: [14.1, 16.1, 18.6, 21.0], 10: [14.4, 16.6, 19.4, 22.0], 11: [14.8, 17.2, 20.2, 23.1], 12: [15.2, 17.8, 21.0, 24.2], 13: [15.7, 18.5, 21.8, 25.1], 14: [16.3, 19.2, 22.6, 26.0], 15: [16.9, 19.9, 23.4, 26.8], 16: [17.5, 20.5, 24.2, 27.5], 17: [18.0, 21.1, 24.9, 28.2], 18: [18.6, 21.7, 25.6, 28.9] },
  female: { 2: [14.4, 16.4, 18.0, 19.1], 3: [14.0, 15.7, 17.2, 18.3], 4: [13.7, 15.3, 16.8, 18.0], 5: [13.5, 15.2, 16.8, 18.3], 6: [13.4, 15.2, 17.1, 18.8], 7: [13.4, 15.4, 17.6, 19.7], 8: [13.6, 15.8, 18.3, 20.7], 9: [13.9, 16.3, 19.1, 21.8], 10: [14.2, 16.9, 19.9, 22.9], 11: [14.6, 17.5, 20.8, 24.0], 12: [15.1, 18.1, 21.7, 25.2], 13: [15.6, 18.7, 22.5, 26.2], 14: [16.1, 19.4, 23.3, 27.2], 15: [16.6, 19.9, 24.0, 28.1], 16: [17.0, 20.4, 24.7, 28.9], 17: [17.4, 20.8, 25.2, 29.6], 18: [17.8, 21.3, 25.6, 30.3] },
}
/** BMI-for-age percentiles for a child (age may be fractional): [P5, P50, P85, P95]. */
export function childBmiCurve(age, sex) {
  const t = CDC[sex === 'female' ? 'female' : 'male']
  const a = clamp(age, 2, 18), lo = Math.floor(a), hi = Math.min(18, lo + 1), f = a - lo
  return t[lo].map((v, i) => r1(v + (t[hi][i] - v) * f))
}
/** Roughly which percentile a BMI sits on (1–99), by straight lines between P5/P50/P85/P95. */
export function bmiPercentile(bmi, age, sex) {
  if (!fin(bmi) || !fin(age)) return null
  const [p5, p50, p85, p95] = childBmiCurve(age, sex)
  const seg = (v, a, b, pa, pb) => pa + (v - a) / (b - a) * (pb - pa)
  const p = bmi < p50 ? (bmi < p5 ? seg(bmi, p5 - (p50 - p5) / 2, p5, 1, 5) : seg(bmi, p5, p50, 5, 50))
    : bmi < p85 ? seg(bmi, p50, p85, 50, 85) : bmi < p95 ? seg(bmi, p85, p95, 85, 95) : seg(bmi, p95, p95 + (p95 - p85), 95, 99)
  return Math.round(clamp(p, 1, 99))
}
/** Schofield (WHO 1985) resting energy for under-18s, kcal/day. */
export function childBmr(weightKg, age, sex) {
  const f = sex === 'female'
  if (age < 3) return Math.round(f ? 58.317 * weightKg - 31.1 : 59.512 * weightKg - 30.4)
  if (age < 10) return Math.round(f ? 22.5 * weightKg + 499 : 22.7 * weightKg + 495)
  return Math.round(f ? 12.2 * weightKg + 746 : 17.5 * weightKg + 651)
}
/** Drinking water a day for a child (IOM total water, about 80 % of it as drinks). */
export function childWaterMl(age, sex) {
  if (age < 4) return 1000
  if (age < 9) return 1300
  if (age < 14) return sex === 'female' ? 1700 : 1900
  return sex === 'female' ? 1800 : 2500
}
/** A healthy body-fat range for a child. */
export const childFatRange = (age, sex) => (sex === 'female' ? (age < 10 ? [14, 24] : [16, 28]) : (age < 10 ? [12, 22] : [10, 21]))

function childBody(out, { heightCm, age, sex, weightKg, goalPref, stepsAvg }) {
  const m2 = (heightCm / 100) ** 2
  const [p5, p50, p85, p95] = childBmiCurve(age, sex)
  out.child = true
  out.curve = { p5, p50, p85, p95 }
  out.healthyKg = [r1(p5 * m2), r1(p85 * m2)]
  out.idealKg = [r1((p50 - (p50 - p5) * 0.4) * m2), r1((p50 + (p85 - p50) * 0.5) * m2)]
  out.ideal = r1(p50 * m2)
  out.formulas = null
  out.frame = 'medium'
  out.bodyFatRange = childFatRange(age, sex)
  if (out.bmi == null) return out
  out.bmiPct = bmiPercentile(out.bmi, age, sex)
  out.bmiCat = out.bmi < p5 ? 'under' : out.bmi <= p85 ? 'normal' : out.bmi < p95 ? 'over' : 'obese'
  out.bodyFatBmi = r1(clamp(1.51 * out.bmi - 0.70 * age - 3.6 * (sex === 'female' ? 0 : 1) + 1.4, 5, 50))
  out.bodyFatNavy = null
  out.bodyFat = out.bodyFatBmi
  out.bodyFatMethod = 'bmi'
  out.bodyFatCat = out.bodyFat < out.bodyFatRange[0] ? 'low' : out.bodyFat <= out.bodyFatRange[1] ? 'healthy' : out.bodyFat <= out.bodyFatRange[1] + 6 ? 'high' : 'veryHigh'
  out.comp = composition({ weightKg, heightCm, age: Math.max(age, 18), sex, bodyFat: out.bodyFat })
  out.bmr = childBmr(weightKg, age, sex)
  out.activity = activityOf(stepsAvg)
  out.tdee = Math.round(out.bmr * Math.max(ACTIVITY.light, ACTIVITY[out.activity] + 0.1))   // children move more
  out.toIdeal = r1(weightKg - out.ideal)
  out.floor = age < 9 ? 1100 : age < 13 ? 1400 : sex === 'female' ? 1500 : 1700
  const inBand = weightKg >= out.healthyKg[0] && weightKg <= out.healthyKg[1]
  out.goal = inBand || Math.abs(out.toIdeal) < 0.5 ? 'keep' : out.toIdeal > 0 ? 'lose' : 'gain'
  out.growInto = out.goal === 'lose' && age < 13                // no diets for children: grow into it
  const auto = out.goal === 'gain' ? 'muscle' : out.growInto ? 'keep' : out.goal
  out.program = PROGRAMS.includes(goalPref) && !(goalPref === 'lose' && age < 13) ? goalPref : auto
  out.kcal = out.program === 'lose' ? Math.max(out.floor, out.tdee - 250) : out.program === 'muscle' ? out.tdee + 250 : out.tdee
  out.weeklyKg = out.goal === 'keep' || out.growInto ? 0 : 0.25
  const heads = (out.goal === 'lose' && out.program === 'lose') || (out.goal === 'gain' && out.program === 'muscle')
  out.weeks = !out.weeklyKg || !heads ? 0 : Math.min(104, Math.ceil(Math.abs(out.toIdeal) / out.weeklyKg))
  out.refKg = Math.max(out.ideal, Math.min(weightKg, out.healthyKg[1]))
  const protein = Math.round((age < 13 ? 1.1 : 1.3) * out.refKg)
  const fat = Math.round(out.kcal * 0.3 / 9)
  const carbs = Math.max(0, Math.round((out.kcal - protein * 4 - fat * 9) / 4))
  const total = protein * 4 + fat * 9 + carbs * 4 || 1
  out.macros = { protein, fat, carbs, pct: { protein: Math.round(protein * 400 / total), fat: Math.round(fat * 900 / total), carbs: Math.round(carbs * 400 / total) } }
  out.proteinG = protein
  out.waterMl = childWaterMl(age, sex)
  return out
}

// 7.1 — how fast: the daily deficit / surplus and the weekly gain for each pace (adults)
export const PACES = {
  slow: { cut: 250, add: 200, gain: 0.15 },
  normal: { cut: 500, add: 300, gain: 0.25 },
  fast: { cut: 750, add: 450, gain: 0.35 },
}

/**
 * Everything the screen shows. `weightKg` = the latest weigh-in in kg (or null).
 * Returns null until height is known. Under 18 (`child: true`) the growth-chart method is used.
 */
export function idealBody({ heightCm, age, sex = 'male', weightKg = null, waistCm = null, neckCm = null, hipCm = null, wristCm = null, frame = 'auto', goal: goalPref = 'auto', stepsAvg = null, pace = 'normal' } = {}) {
  if (!okHeight(heightCm)) return null
  const P = PACES[pace] || PACES.normal
  const m2 = (heightCm / 100) ** 2
  const bmi = fin(weightKg) && weightKg > 0 ? r1(weightKg / m2) : null
  const out = { heightCm, age, sex, weightKg, bmi, bmiCat: bmiCat(bmi, age), adult: Number.isFinite(age) ? age >= ADULT_AGE : null }
  if (okCm(waistCm, 40, 200)) {
    const whtr = Math.round(waistCm / heightCm * 100) / 100
    out.whtr = whtr
    out.whtrCat = whtr < 0.4 ? 'low' : whtr < 0.5 ? 'healthy' : whtr < 0.6 ? 'raised' : 'high'
  }
  if (out.adult === false) return childBody(out, { heightCm, age, sex, weightKg, goalPref, stepsAvg })
  if (!out.adult) return out

  const healthy = healthyBmi(age), band = idealBmiBand(age)
  out.healthyKg = [r1(healthy[0] * m2), r1(healthy[1] * m2)]
  out.idealKg = [r1(band[0] * m2), r1(band[1] * m2)]
  const f = formulas(heightCm, sex)
  out.formulas = f
  out.frameAuto = frameOf(heightCm, wristCm, sex)
  out.frame = frame && frame !== 'auto' && FRAME_ADJ[frame] != null ? frame : out.frameAuto || 'medium'
  const fAvg = BLEND.reduce((a, k) => a + f[k], 0) / BLEND.length
  // the one number: half the age-adjusted BMI band's middle, half the formulas (which know
  // sex), nudged ±5 % for the frame, kept inside the band (a small / large frame may use the
  // rest of the healthy range on its side)
  const lim = out.frame === 'small' ? [out.healthyKg[0], out.idealKg[1]] : out.frame === 'large' ? [out.idealKg[0], out.healthyKg[1]] : out.idealKg
  out.ideal = r1(clamp(((band[0] + band[1]) / 2 * m2 + fAvg) / 2 * (1 + FRAME_ADJ[out.frame]), lim[0], lim[1]))
  out.bodyFatRange = fatRange(age, sex)

  if (bmi != null) {
    const navy = navyBodyFat({ heightCm, waistCm, neckCm, hipCm, sex })
    out.bodyFatBmi = bmiBodyFat(bmi, age, sex)
    out.bodyFatNavy = navy
    out.bodyFat = navy != null ? navy : out.bodyFatBmi
    out.bodyFatMethod = navy != null ? 'navy' : 'bmi'
    out.bodyFatCat = out.bodyFat < out.bodyFatRange[0] ? 'low' : out.bodyFat <= out.bodyFatRange[1] ? 'healthy' : out.bodyFat <= out.bodyFatRange[1] + 6 ? 'high' : 'veryHigh'
    out.comp = composition({ weightKg, heightCm, age, sex, bodyFat: out.bodyFat })
    // the 8th method: keep today's lean mass and reach the middle of the healthy fat range
    const fatMid = (out.bodyFatRange[0] + out.bodyFatRange[1]) / 2
    f.fat = r1(out.comp.leanKg / (1 - fatMid / 100))
    // Mifflin–St Jeor resting energy, the day's energy from the walking level
    out.bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5))
    out.activity = activityOf(stepsAvg)
    out.tdee = Math.round(out.bmr * ACTIVITY[out.activity])
    out.toIdeal = r1(weightKg - out.ideal)               // + to lose, − to gain
    out.floor = sex === 'female' ? 1200 : 1500
    out.goal = Math.abs(out.toIdeal) < 0.5 || (weightKg >= out.idealKg[0] && weightKg <= out.idealKg[1]) ? 'keep' : out.toIdeal > 0 ? 'lose' : 'gain'
    out.program = PROGRAMS.includes(goalPref) ? goalPref : out.goal === 'gain' ? 'muscle' : out.goal
    out.pace = PACES[pace] ? pace : 'normal'
    out.kcal = out.program === 'lose' ? Math.max(out.floor, out.tdee - P.cut) : out.program === 'muscle' ? out.tdee + (out.goal === 'gain' ? P.add : 250) : out.tdee
    out.weeklyKg = out.goal === 'keep' ? 0 : out.goal === 'lose' ? r1(Math.min(P.cut / 1000, Math.max(0.2, (out.tdee - Math.max(out.floor, out.tdee - P.cut)) * 7 / 7700))) : P.gain
    // weeks to the ideal weight only when the programme heads that way
    const heads = (out.goal === 'lose' && out.program === 'lose') || (out.goal === 'gain' && out.program === 'muscle')
    out.weeks = out.goal === 'keep' || !heads ? 0 : Math.ceil(Math.abs(out.toIdeal) / out.weeklyKg)
    out.refKg = Math.max(out.ideal, Math.min(weightKg, out.idealKg[1]))
    out.macros = macrosFor(out.kcal, out.program, out.refKg)
    out.proteinG = out.macros.protein
    out.waterMl = Math.round(weightKg * 33 / 50) * 50
  }
  return out
}

function bmiCat(v, age) {
  if (!Number.isFinite(v)) return null
  const h = healthyBmi(age) || [18.5, 24.9]
  return v < h[0] ? 'under' : v <= h[1] ? 'normal' : v < 30 ? 'over' : 'obese'
}

/** The inputs idealBody() takes, read from the app state. */
export function bodyInputs(S, now = new Date()) {
  const bw = S.bodyweight || []
  const last = bw.length ? bw[bw.length - 1] : null
  return {
    heightCm: S.heightCm, age: ageOf(S, now), sex: sexOf(S), weightKg: last ? toKg(last.w, S.unit) : null,
    waistCm: S.waistCm, neckCm: S.neckCm, hipCm: S.hipCm, wristCm: S.wristCm,
    frame: S.frame || 'auto', goal: S.bodyGoal || 'auto', stepsAvg: stepsAverage(S, now), pace: S.bodyPace || 'normal',
  }
}
/** idealBody() for the app state. */
export const idealBodyOf = (S, now = new Date()) => idealBody(bodyInputs(S, now))

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

/**
 * Calories that adapt to the pace you actually get: a stalled or wrong-way trend trims
 * 150 kcal (never below the floor), losing too fast adds 200 back. → { kcal, delta }.
 */
export function adaptKcal(r, pace) {
  if (!r || r.kcal == null) return null
  if (!pace) return { kcal: r.kcal, delta: 0 }
  let d = 0
  if (r.program === 'lose') d = pace.verdict === 'tooFast' ? 200 : pace.verdict === 'stalled' || pace.verdict === 'wrongWay' ? -150 : 0
  else if (r.program === 'muscle') d = pace.verdict === 'tooFast' ? -150 : pace.verdict === 'stalled' || pace.verdict === 'wrongWay' ? 150 : 0
  const kcal = Math.max(r.floor || 0, r.kcal + d)
  return { kcal, delta: kcal - r.kcal }
}

/**
 * The week-by-week road from `fromKg` (on `startIso`) to `toKg` at `weeklyKg`: targets, the
 * 25 / 50 / 75 / 100 % milestones and, from the weigh-ins (kg), where you actually were.
 * → { weeks: [{ week, iso, target, actual, status }], milestones: [{ pct, kg, iso, reached }] }
 */
export function weightRoad({ fromKg, toKg: goalKg, weeklyKg, startIso, history = [], unit = 'kg', today }) {
  if (![fromKg, goalKg, weeklyKg].every(fin) || weeklyKg <= 0 || !startIso) return null
  const dir = Math.sign(goalKg - fromKg)
  if (!dir) return { weeks: [], milestones: [], done: true }
  const n = Math.min(156, Math.ceil(Math.abs(goalKg - fromKg) / weeklyKg))
  const start = new Date(startIso + 'T12:00:00')
  const isoAt = k => { const d = new Date(start.getTime() + k * 7 * DAY); return d.toISOString().slice(0, 10) }
  const pts = (history || []).map(b => ({ d: b.d, kg: toKg(b.w, unit) })).filter(b => b.d >= startIso)
  const todayIso = today || new Date().toISOString().slice(0, 10)
  const weeks = []
  for (let k = 1; k <= n; k++) {
    const iso = isoAt(k), from = isoAt(k - 1)
    const target = r1(k === n ? goalKg : fromKg + dir * weeklyKg * k)
    const inWeek = pts.filter(p => p.d > from && p.d <= iso)
    const actual = inWeek.length ? r1(inWeek[inWeek.length - 1].kg) : null
    const status = actual == null ? (iso <= todayIso ? 'missed' : 'future') : (dir < 0 ? actual <= target + 0.2 : actual >= target - 0.2) ? 'on' : 'behind'
    weeks.push({ week: k, iso, target, actual, status })
  }
  const best = pts.length ? (dir < 0 ? Math.min(...pts.map(p => p.kg)) : Math.max(...pts.map(p => p.kg))) : fromKg
  const milestones = [25, 50, 75, 100].map(pct => {
    const kg = r1(fromKg + (goalKg - fromKg) * pct / 100)
    return { pct, kg, iso: isoAt(Math.ceil(n * pct / 100)), reached: dir < 0 ? best <= kg : best >= kg }
  })
  return { weeks, milestones, done: milestones[3].reached }
}

/** The plan milestone (25 / 50 / 75 / 100 %) a new weigh-in just reached, else null. */
export function milestoneCrossed(before, after) {
  const p = after && after.bodyPlan
  if (!p) return null
  const road = S => weightRoad({ fromKg: p.fromKg, toKg: p.toKg, weeklyKg: p.weeklyKg, startIso: p.start, history: S.bodyweight, unit: S.unit })
  const a = road(before), b = road(after)
  if (!a || !b || !a.milestones || !b.milestones.length) return null
  const hit = b.milestones.filter((m, i) => m.reached && !(a.milestones[i] && a.milestones[i].reached))
  return hit.length ? hit[hit.length - 1] : null
}

/** Where `v` sits on the BMI scale 15–40, as 0–100 % (for the gauge). */
export const bmiPos = v => clamp((v - 15) / 25 * 100, 0, 100)

/**
 * 7.1 — the plan to a target weight (the ideal one, or your own): which way, how far, how many
 * weeks, the finish date and the calories a day. Children: at most −250 kcal from 13, none
 * before (they grow into their weight), +250 to gain.
 */
export function goalPlan(r, targetKg, now = new Date()) {
  if (!r || !fin(r.weightKg) || !fin(r.tdee)) return null
  const to = fin(targetKg) && targetKg > 0 ? targetKg : r.ideal
  if (!fin(to)) return null
  const diff = r1(r.weightKg - to)                      // + to lose
  const P = PACES[r.pace] || PACES.normal
  const dir = Math.abs(diff) < 0.5 ? 'keep' : diff > 0 ? 'lose' : 'gain'
  let kcal = r.tdee, rate = 0, capped = false
  if (r.child) {
    if (dir === 'lose' && r.age >= 13) { kcal = Math.max(r.floor, r.tdee - 250); rate = 0.25 }
    else if (dir === 'gain') { kcal = r.tdee + 250; rate = 0.25 }
  } else if (dir === 'lose') {
    kcal = Math.max(r.floor, r.tdee - P.cut); capped = kcal > r.tdee - P.cut
    rate = r1(Math.max(0.1, (r.tdee - kcal) * 7 / 7700))
  } else if (dir === 'gain') { kcal = r.tdee + P.add; rate = P.gain }
  const weeks = rate > 0 ? Math.min(156, Math.ceil(Math.abs(diff) / rate)) : 0
  const eta = weeks ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + weeks * 7) : null
  const etaIso = eta ? eta.getFullYear() + '-' + String(eta.getMonth() + 1).padStart(2, '0') + '-' + String(eta.getDate()).padStart(2, '0') : null
  const grow = r.child && dir === 'lose' && r.age < 13
  return { toKg: r1(to), diffKg: diff, dir, rate, weeks, etaIso, kcal: Math.round(kcal), capped, grow, ideal: Math.abs(to - r.ideal) < 0.05 }
}

/** The goal plan for the app state (your target weight if you set one, else the ideal). */
export function goalPlanOf(S, now = new Date()) {
  const r = idealBodyOf(S, now)
  if (!r || !r.ideal) return null
  const t = Number(S && S.targetW)
  return goalPlan(r, Number.isFinite(t) && t > 0 ? toKg(t, S.unit) : null, now)
}
