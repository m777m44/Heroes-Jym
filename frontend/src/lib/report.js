// 7.0 — Reports: one week (Saturday → Friday) or one calendar month, compared with the period
// before it. Everything is computed from what is already on the phone — workouts, steps,
// water, food and weigh-ins — and turned into numbers, daily series for the charts, a score
// and a few plain tips. Pure: no store, no DOM.
import { isoOf, startOfWeek } from './format.js'
import { workoutVolume, setsDone } from './history.js'
import { stepsOn, goalOf as stepGoalOf } from './stepMetrics.js'
import { mlOn, waterGoalMlOf } from './water.js'
import { dayTotals, foodGoalOf } from './food.js'
import { weeklyRate, etaToGoal } from './weightTracker.js'
import { bestSetOf } from './onerm.js'

const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }
const r1 = n => Math.round(n * 10) / 10
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

/** { from, to, days[] } for the week (Sat–Fri) or month containing `iso`, shifted by `offset` periods. */
export function periodOf(kind, iso, offset = 0) {
  if (kind === 'month') {
    const d = new Date(iso + 'T12:00:00')
    const first = new Date(d.getFullYear(), d.getMonth() + offset, 1, 12)
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12)
    const from = isoOf(first), to = isoOf(last)
    const days = []
    for (let x = from; x <= to; x = addDays(x, 1)) days.push(x)
    return { kind, from, to, days }
  }
  const from = addDays(isoOf(startOfWeek(iso + 'T12:00:00', 6)), offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  return { kind: 'week', from, to: days[6], days }
}

/** The raw numbers for one period. Days after `today` do not count toward averages. */
export function periodStats(S, p, today) {
  const lived = p.days.filter(d => d <= today)
  const n = Math.max(1, lived.length)
  const ws = (S.workouts || []).filter(w => w.d >= p.from && w.d <= p.to)
  const byEx = {}
  ws.forEach(w => w.entries.forEach(e => { let v = 0; e.sets.forEach(s => { if (s.done) v += (s.w || 0) * (s.r || 0) }); byEx[e.id] = (byEx[e.id] || 0) + v }))
  const topEx = Object.entries(byEx).sort((a, b) => b[1] - a[1])[0]
  const stepGoal = stepGoalOf(S)
  const steps = p.days.map(d => stepsOn(S, d))
  const water = p.days.map(d => mlOn(S, d))
  const waterGoals = p.days.map(d => waterGoalMlOf(S, d))
  const kcal = p.days.map(d => dayTotals(S, d).kcal)
  const kGoal = foodGoalOf(S, today).kcal
  const logged = lived.filter(d => kcal[p.days.indexOf(d)] > 0)
  const bw = (S.bodyweight || []).filter(b => b.d >= p.from && b.d <= p.to)
  return {
    days: p.days, lived: lived.length,
    workouts: ws.length,
    workoutDays: new Set(ws.map(w => w.d)).size,
    volume: Math.round(ws.reduce((a, w) => a + workoutVolume(w), 0)),
    sets: ws.reduce((a, w) => a + setsDone(w), 0),
    minutes: Math.round(ws.reduce((a, w) => a + (w.end && w.start ? Math.max(0, w.end - w.start) : 0), 0) / 60000),
    topEx: topEx && topEx[1] > 0 ? { id: topEx[0], vol: Math.round(topEx[1]) } : null,
    steps, stepGoal,
    stepsTotal: steps.reduce((a, b) => a + b, 0),
    stepsAvg: Math.round(avg(lived.map(d => stepsOn(S, d)))),
    stepDays: lived.filter(d => stepsOn(S, d) >= stepGoal).length,
    bestStepDay: steps.reduce((b, v, i) => (v > b.v ? { v, d: p.days[i] } : b), { v: 0, d: null }),
    water, waterGoals,
    waterAvg: Math.round(avg(lived.map(d => mlOn(S, d)))),
    waterDays: lived.filter(d => { const i = p.days.indexOf(d); return water[i] > 0 && water[i] >= waterGoals[i] }).length,
    kcal, kGoal,
    kcalAvg: Math.round(avg(logged.map(d => kcal[p.days.indexOf(d)]))),
    foodDays: logged.length,
    foodOnTarget: logged.filter(d => { const k = kcal[p.days.indexOf(d)]; return k <= kGoal * 1.05 && k >= kGoal * 0.6 }).length,
    weightFirst: bw.length ? bw[0].w : null,
    weightLast: bw.length ? bw[bw.length - 1].w : null,
    weightChange: bw.length > 1 ? r1(bw[bw.length - 1].w - bw[0].w) : null,
    n
  }
}

/** Records set in this period: estimated-1RM bests that beat everything before them. */
export function periodRecords(S, p) {
  const best = {}
  const out = []
  for (const w of S.workouts || []) {
    for (const e of w.entries) {
      const b = bestSetOf(e)
      if (!b) continue
      const prev = best[e.id]
      if (prev && b.est > prev && w.d >= p.from && w.d <= p.to) out.push({ id: e.id, est: b.est, prev, d: w.d })
      if (!prev || b.est > prev) best[e.id] = b.est
    }
  }
  return out
}

/** 0–100: a third each for moving (workouts + steps), drinking and eating on target. */
export function periodScore(st) {
  const n = Math.max(1, st.lived)
  const move = Math.min(1, (st.stepDays / n) * 0.6 + Math.min(1, st.workoutDays / Math.max(1, Math.round(n * 3 / 7))) * 0.4)
  const water = st.waterDays / n
  const food = st.foodDays ? (st.foodOnTarget / n) : 0
  return Math.round((move * 0.4 + water * 0.3 + food * 0.3) * 100)
}

const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null)

/**
 * Plain, specific tips — each { icon, tone, key, args } so the screen translates them.
 * At most four, most useful first.
 */
export function smartTips(S, cur, prev) {
  const tips = []
  const n = Math.max(1, cur.lived)
  if (cur.lived >= 3 && cur.stepsAvg < cur.stepGoal * 0.7) tips.push({ icon: 'figureWalk', tone: 'green', key: 'You average {0} steps a day — a 15-minute walk after a meal adds about 1,500.', args: [cur.stepsAvg] })
  else if (prev.stepsAvg > 0 && pct(cur.stepsAvg, prev.stepsAvg) >= 10) tips.push({ icon: 'figureWalk', tone: 'green', key: 'Steps up {0}% on last time — keep that rhythm.', args: [pct(cur.stepsAvg, prev.stepsAvg)] })
  if (cur.lived >= 2 && cur.waterDays / n < 0.5) tips.push({ icon: 'drop', tone: 'teal', key: 'You hit your water goal on {0} of {1} days. Keep a bottle in sight and drink one glass with every meal.', args: [cur.waterDays, cur.lived] })
  if (cur.foodDays >= 2 && cur.kcalAvg > cur.kGoal * 1.08) tips.push({ icon: 'flame', tone: 'orange', key: 'You eat about {0} kcal over your goal on average. Swap one sweet or fried item a day.', args: [cur.kcalAvg - cur.kGoal] })
  else if (cur.lived >= 3 && cur.foodDays === 0) tips.push({ icon: 'flame', tone: 'orange', key: 'Log what you eat for a few days — the calorie picture makes the weight goal much easier.', args: [] })
  if (cur.lived >= 4 && cur.workouts === 0) tips.push({ icon: 'dumbbell', tone: 'acc', key: 'No workout yet this period. Even a 20-minute home workout counts — start today’s plan.', args: [] })
  else if (prev.volume > 0 && pct(cur.volume, prev.volume) >= 10) tips.push({ icon: 'dumbbell', tone: 'acc', key: 'Training volume up {0}% — progressive overload is working.', args: [pct(cur.volume, prev.volume)] })
  const rate = weeklyRate(S.bodyweight || [])
  const tw = Number(S.targetW)
  const last = (S.bodyweight || [])[(S.bodyweight || []).length - 1]
  if (last && tw && rate != null) {
    const left = tw - last.w
    if (Math.sign(rate) === Math.sign(left) && Math.abs(rate) > 1) tips.push({ icon: 'scale', tone: 'yellow', key: 'You are changing {0} {1} a week — faster than the safe pace. Eat a little more protein and do not cut further.', args: [Math.abs(rate), S.unit || 'kg'] })
    else if (Math.abs(left) > 0.5 && Math.sign(rate) !== Math.sign(left) && Math.abs(rate) >= 0.1) tips.push({ icon: 'scale', tone: 'yellow', key: 'Your weight is moving away from your goal. Check the food log and add a daily walk.', args: [] })
  }
  if (!tips.length) tips.push({ icon: 'star', tone: 'yellow', key: 'A balanced period — keep the same habits and add a little more each week.', args: [] })
  return tips.slice(0, 4)
}

/** Weight forecast: { rate, eta, left } toward S.targetW, or null without enough weigh-ins. */
export function weightForecast(S) {
  const h = S.bodyweight || []
  const tw = Number(S.targetW)
  if (h.length < 2) return null
  const rate = weeklyRate(h)
  const last = h[h.length - 1]
  return { rate, eta: tw ? etaToGoal(h, tw) : null, left: tw ? r1(tw - last.w) : null, last: last.w, target: tw || null }
}

/** Everything the screen needs in one call. */
export function buildReport(S, kind, today, offset = 0) {
  const p = periodOf(kind, today, offset)
  const pp = periodOf(kind, p.from, -1)
  const cur = periodStats(S, p, today)
  const prev = periodStats(S, pp, today)
  return {
    period: p, cur, prev,
    score: periodScore(cur), prevScore: periodScore(prev),
    records: periodRecords(S, p),
    tips: smartTips(S, cur, prev),
    forecast: weightForecast(S),
    delta: {
      workouts: cur.workouts - prev.workouts,
      volume: pct(cur.volume, prev.volume),
      steps: pct(cur.stepsAvg, prev.stepsAvg),
      water: pct(cur.waterAvg, prev.waterAvg),
      kcal: pct(cur.kcalAvg, prev.kcalAvg)
    }
  }
}
