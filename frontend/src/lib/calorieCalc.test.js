import { describe, it, expect } from 'vitest'
import { calcCalorieGoal, bmrOf, activityFromSteps, goalProgress, KCAL_PER_KG, ACTIVITY, MAX_DIET_SHARE } from './calorieCalc.js'

const base = { currentKg: 90, targetKg: 85, days: 70, heightCm: 178, age: 30, sex: 'male', activity: 'moderate', dietShare: 0 }

describe('calorie calculator', () => {
  it('uses 7700 kcal per kg and Mifflin-St Jeor', () => {
    expect(KCAL_PER_KG).toBe(7700)
    expect(bmrOf({ kg: 90, cm: 178, age: 30, sex: 'male' })).toBe(900 + 1112.5 - 150 + 5)
    expect(bmrOf({ kg: 60, cm: 165, age: 25, sex: 'female' })).toBe(600 + 1031.25 - 125 - 161)
  })

  it('splits the daily deficit between exercise and food', () => {
    const r = calcCalorieGoal(base)
    expect(r.totalDeficit).toBe(38500)
    expect(r.dailyDeficit).toBe(550)
    expect(r.bmr).toBe(1868)
    expect(r.tdee).toBe(Math.round(1867.5 * ACTIVITY.moderate))
    expect(r.exerciseKcal).toBe(550)
    expect(r.eatKcal).toBe(r.tdee) // all from exercise: eat what you burn
    expect(r.weeklyKg).toBe(0.5)
    expect(r.realistic).toBe(true)
    const half = calcCalorieGoal({ ...base, dietShare: 40 })
    expect(half.dietDeficit).toBe(220)
    expect(half.exerciseKcal).toBe(330)
    expect(half.eatKcal).toBe(Math.round(1867.5 * 1.55 - 220))
  })

  it('caps the food share and computes a safe pace', () => {
    expect(calcCalorieGoal({ ...base, dietShare: 100 }).dietShare).toBe(MAX_DIET_SHARE)
    expect(calcCalorieGoal({ ...base, dietShare: -5 }).dietShare).toBe(0)
    expect(calcCalorieGoal(base).safeDays).toBe(Math.ceil(5 / 0.75 * 7))
  })

  it('warns about unrealistic goals', () => {
    const r = calcCalorieGoal({ ...base, targetKg: 80, days: 40 })
    expect(r.realistic).toBe(false)
    const keys = r.warnings.map(w => w.key)
    expect(keys.some(k => /from exercise is a lot/.test(k))).toBe(true)
    expect(keys.some(k => /more than half/.test(k))).toBe(true)
    expect(keys.some(k => /faster than the recommended/.test(k))).toBe(true)
    expect(calcCalorieGoal({ ...base, targetKg: 80, days: 10 }).warnings.some(w => /0\.5 kg a day/.test(w.key))).toBe(true)
    const diet = calcCalorieGoal({ ...base, sex: 'female', currentKg: 60, targetKg: 55, heightCm: 160, days: 25, dietShare: 70 })
    expect(diet.warnings.some(w => /Eating under/.test(w.key))).toBe(true)
  })

  it('rejects bad input with a translatable key', () => {
    const k = input => { try { calcCalorieGoal({ ...base, ...input }) } catch (e) { return e.key } return null }
    expect(k({ currentKg: 0 })).toMatch(/current and target/)
    expect(k({ heightCm: 50 })).toMatch(/height/)
    expect(k({ age: 8 })).toMatch(/age/)
    expect(k({ targetKg: 95 })).toMatch(/below your current/)
    expect(k({ days: 0 })).toMatch(/days above zero/)
  })

  it('guesses the activity level from steps', () => {
    expect(activityFromSteps(0)).toBe('light')
    expect(activityFromSteps(3000)).toBe('sedentary')
    expect(activityFromSteps(6000)).toBe('light')
    expect(activityFromSteps(8000)).toBe('moderate')
    expect(activityFromSteps(12000)).toBe('active')
  })

  it('tracks progress through a saved goal', () => {
    const g = { from: '2026-10-01', days: 10 }
    expect(goalProgress(g, '2026-10-01')).toMatchObject({ day: 1, left: 10, over: false })
    expect(goalProgress(g, '2026-10-10')).toMatchObject({ day: 10, left: 1, over: false })
    expect(goalProgress(g, '2026-10-12').over).toBe(true)
    expect(goalProgress(g, '2026-09-30').before).toBe(true)
    expect(goalProgress(null, '2026-10-01')).toBe(null)
  })
})
