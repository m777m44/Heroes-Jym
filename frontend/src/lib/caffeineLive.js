// 16.0 — caffeine in your body, hour by hour. Every coffee, tea, cola and energy drink you logged —
// soft drinks by their label values, coffees and teas on the food shelves (caffeine.js), drink
// recipes from the coffee or tea in them — goes in when you had it and leaves the way caffeine does:
// absorbed in about 45 minutes, then halved about every 5 hours (a healthy adult: 3 to 7 hours).
// From that: how much is in you now, when it drops under 50 mg (easier to fall asleep), how much
// is left at your bedtime, today against your daily limit, the last 7 days and the days in a row
// without an energy drink. Pure — components/CaffeineNow.jsx draws it.
import { SODA_BY_ID, sodaNutrition, caffeineLimit } from './sodas.js'
import { DRINK_BY_ID, drinkCaffeine } from './drinks.js'
import { CAF_F } from './caffeine.js'

export const HALF_LIFE_H = 5          // EFSA / FDA: about 4–6 h in a healthy adult
export const ABSORB_PER_H = 5         // first-order absorption: the peak comes ~45 min after a drink
export const SLEEP_OK_MG = 50         // under this at bedtime is unlikely to keep you awake
export const SINGLE_DOSE_MG = 200     // EFSA: safe in one go for a healthy adult
export const STOP_BEFORE_BED_H = 8    // sleep studies: caffeine up to ~8 h before bed still costs sleep
const H = 3600e3
const DAY = 24 * H
const MEAL_AT = { b: 8 * 60, l: 13 * 60 + 30, s: 16 * 60 + 30, d: 20 * 60 }
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const pad = n => String(n).padStart(2, '0')
/** Local calendar day of a time → 'YYYY-MM-DD'. */
export const isoOf = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
const dayStart = iso => new Date(iso + 'T00:00:00').getTime()
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d.getTime()) }

/** Caffeine (mg) of one food-log entry, or 0. */
export function entryCaffeine(e) {
  if (!e) return 0
  const q = +e.q || 1
  if (e.sd && SODA_BY_ID[e.sd]) { const s = SODA_BY_ID[e.sd]; return sodaNutrition(s, e.ml || s.def.ml, q).caffeine }
  if (e.dr && DRINK_BY_ID[e.dr]) return Math.round(drinkCaffeine(DRINK_BY_ID[e.dr]) * q)
  if (e.f && CAF_F[e.f]) return Math.round(CAF_F[e.f] * q)
  return 0
}
/** An energy drink? (counted for the days-without streak) */
export const isEnergyEntry = e => !!(e && e.sd && SODA_BY_ID[e.sd] && SODA_BY_ID[e.sd].energy) || !!(e && e.f === 'energydrink')

/** When an entry was had: its time stamp when that falls on its own day, else its meal's usual time. */
export function entryTime(e, iso) {
  const start = dayStart(iso), t = +(e && e.t)
  if (t >= start && t < start + DAY) return t
  return start + (MEAL_AT[e && e.m] ?? MEAL_AT.s) * 60e3
}

/** The caffeine doses of today and the `days` days before, up to `now`: [{ t, mg, e, iso }], oldest first. */
export function caffeineDoses(S, now = Date.now(), days = 2) {
  const food = (S && S.food) || {}
  const today = isoOf(now)
  const out = []
  for (let i = days; i >= 0; i--) {
    const iso = addDays(today, -i)
    for (const e of food[iso] || []) {
      const mg = entryCaffeine(e)
      if (!(mg > 0)) continue
      const t = entryTime(e, iso)
      if (t <= now + 60e3) out.push({ t, mg, e, iso })
    }
  }
  return out.sort((a, b) => a.t - b.t)
}

/** mg of one dose still in the body `h` hours after it: absorbed, and not yet cleared. */
export function remaining(mg, h, halfLife = HALF_LIFE_H) {
  if (!(h > 0) || !(mg > 0)) return 0
  const ke = Math.LN2 / halfLife, ka = ABSORB_PER_H
  return Math.max(0, mg * ka / (ka - ke) * (Math.exp(-ke * h) - Math.exp(-ka * h)))
}
/** mg in the body at time `t` from all the doses. */
export const levelAt = (doses, t, halfLife = HALF_LIFE_H) => (doses || []).reduce((a, d) => a + remaining(d.mg, (t - d.t) / H, halfLife), 0)

/** [{ t, mg }] every `stepMin` minutes from `from` to `to`. */
export function curve(doses, from, to, stepMin = 10, halfLife = HALF_LIFE_H) {
  const out = []
  for (let t = from; t <= to + 1; t += stepMin * 60e3) out.push({ t, mg: levelAt(doses, t, halfLife) })
  return out
}

/** The first time from `now` (up to 2 days on) with less than `mg` in the body — `now` itself when already under. */
export function underAt(doses, now, mg = SLEEP_OK_MG, halfLife = HALF_LIFE_H) {
  // the level can still be rising for ~45 min after the last drink: start looking after its peak
  for (let t = now; t <= now + 2 * DAY; t += 5 * 60e3) {
    if (levelAt(doses, t, halfLife) < mg) {
      const rising = doses.some(d => d.t <= t && t - d.t < 0.75 * H) && levelAt(doses, t + 30 * 60e3, halfLife) >= mg
      if (!rising) return t
    }
  }
  return null
}

/** Your bedtime as 'HH:MM': My schedule's, else your day's (Ideal body), else 23:00. */
export function bedtimeOf(S) {
  for (const v of [S && S.planner && S.planner.sleep, S && S.day && S.day.sleep]) if (HHMM.test(v || '')) return v
  return '23:00'
}
/** Tonight's bedtime: the first one that is not more than 2 h past (so at 00:30 it is still last night's 23:00). */
export function nextBedtime(S, now = Date.now()) {
  const [h, m] = bedtimeOf(S).split(':').map(Number)
  for (let off = -1; off <= 1; off++) {
    const d = new Date(now); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0)
    if (d.getTime() >= now - 2 * H) return d.getTime()
  }
  return now
}

/**
 * Everything the card and the sheet show: the level now, the peak still to come, when it drops under
 * 50 mg, what is left at bedtime, today's total against the daily limit for your age, the doses.
 */
export function caffeineNow(S, { now = Date.now(), age = null, halfLife = HALF_LIFE_H } = {}) {
  const doses = caffeineDoses(S, now, 2)
  const today = isoOf(now)
  const todayDoses = doses.filter(d => d.iso === today)
  const total = todayDoses.reduce((a, d) => a + d.mg, 0)
  const limit = caffeineLimit(age)
  const level = levelAt(doses, now, halfLife)
  // the highest point still ahead in the next hour (a drink you just had is still going in)
  let peak = level, peakAt = now
  for (let t = now; t <= now + H; t += 5 * 60e3) { const l = levelAt(doses, t, halfLife); if (l > peak) { peak = l; peakAt = t } }
  const bed = nextBedtime(S, now)
  const atBed = levelAt(doses, bed, halfLife)
  const under = level < 1 && peak < 1 ? now : underAt(doses, now, SLEEP_OK_MG, halfLife)
  const last = todayDoses.length ? todayDoses[todayDoses.length - 1] : null
  return {
    doses, todayDoses, total: Math.round(total), limit, over: total > limit, share: limit ? total / limit : 0,
    level: Math.round(level), peak: Math.round(peak), peakAt, under, bed, atBed: Math.round(atBed),
    sleepOk: atBed < SLEEP_OK_MG, bigDose: todayDoses.some(d => d.mg > SINGLE_DOSE_MG), last,
    active: level >= 1 || total > 0,
  }
}

/** What one more drink of `mg` would do: today's total, the level at bedtime, over the limit or not. */
export function afterDrink(S, mg, { now = Date.now(), age = null, halfLife = HALF_LIFE_H } = {}) {
  const c = caffeineNow(S, { now, age, halfLife })
  const doses = [...c.doses, { t: now, mg }]
  const total = c.total + Math.round(mg)
  const atBed = Math.round(levelAt(doses, c.bed, halfLife))
  return { total, limit: c.limit, over: total > c.limit, atBed, bed: c.bed, sleepOk: atBed < SLEEP_OK_MG, wasOver: c.over }
}

/** The last 7 days (oldest first): caffeine mg, energy drinks, and the sugar of the soft drinks. */
export function caffeineWeek(S, now = Date.now()) {
  const food = (S && S.food) || {}
  const today = isoOf(now)
  const out = []
  for (let i = 6; i >= 0; i--) {
    const iso = addDays(today, -i)
    let mg = 0, energy = 0, sugar = 0
    for (const e of food[iso] || []) {
      mg += entryCaffeine(e)
      if (isEnergyEntry(e)) energy += +e.q || 1
      if (e && e.sd && SODA_BY_ID[e.sd]) { const s = SODA_BY_ID[e.sd]; sugar += sodaNutrition(s, e.ml || s.def.ml, e.q || 1).sugar }
    }
    out.push({ iso, mg: Math.round(mg), energy: Math.round(energy * 10) / 10, sugar: Math.round(sugar) })
  }
  return out
}

/**
 * Days in a row without an energy drink, up to today: 0 when there is one today; `null` when there
 * has never been one (nothing to count from). Looks back up to a year.
 */
export function energyFreeDays(S, now = Date.now()) {
  const food = (S && S.food) || {}
  const today = isoOf(now)
  const isos = Object.keys(food).filter(iso => iso <= today && (food[iso] || []).some(isEnergyEntry)).sort()
  if (!isos.length) return null
  const lastIso = isos[isos.length - 1]
  return Math.max(0, Math.round((dayStart(today) - dayStart(lastIso)) / DAY))
}
