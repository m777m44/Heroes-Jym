// Walking achievements — badges earned from the step history (S.steps). Pure functions:
// computed on the fly, nothing extra is stored or synced.
import { stepStreak, goalOf } from './stepMetrics.js'

const DAY_TIERS = [5000, 10000, 20000, 30000]
const TOTAL_TIERS = [10000, 100000, 500000, 1000000]
const STREAK_TIERS = [3, 7, 30]

/** Steps over every recorded day, the best single day and how many days met the goal. */
export function stepTotals(S) {
  const days = (S && S.steps) || {}
  const goal = goalOf(S)
  let total = 0, best = 0, goalDays = 0
  for (const d of Object.values(days)) {
    const n = (d && d.n) || 0
    total += n
    if (n > best) best = n
    if (n >= goal) goalDays++
  }
  return { total, best, goalDays }
}

/**
 * Every badge with its progress: { id, kind: 'day' | 'total' | 'streak', need, have, done }.
 * Ordered by kind, then by difficulty.
 */
export function achievements(S, today) {
  const { total, best } = stepTotals(S)
  const streak = stepStreak(S, today)
  const out = []
  for (const need of DAY_TIERS) out.push({ id: 'day' + need, kind: 'day', need, have: best, done: best >= need })
  for (const need of TOTAL_TIERS) out.push({ id: 'total' + need, kind: 'total', need, have: total, done: total >= need })
  for (const need of STREAK_TIERS) out.push({ id: 'streak' + need, kind: 'streak', need, have: streak, done: streak >= need })
  return out
}
