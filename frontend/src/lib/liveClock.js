// Time helpers for the live clock and the walking countdowns.
//
// The clock always follows the phone's own time zone (2.9 — there is no fixed city any more),
// the same calendar day the steps are filed under (todayISO); the countdown to "the end of the
// day" uses the device's local midnight, so it always matches when the step count resets.
//
// Pure functions of a Date (plus Intl), so they're unit-tested; useNow() is the one hook.
import { useEffect, useState } from 'react'

export function deviceZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}

/** The zone the clock shows: always the phone's (an old saved `clockZone` is ignored). */
export const clockZoneOf = () => deviceZone()

const pad = n => String(n).padStart(2, '0')

/** Hours, minutes, seconds of `date` in `zone` (24 h), as numbers. */
export function timeIn(date, zone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)
    const get = k => Number((parts.find(p => p.type === k) || {}).value || 0)
    return { h: get('hour') % 24, m: get('minute'), s: get('second') }
  } catch {
    return { h: date.getHours(), m: date.getMinutes(), s: date.getSeconds() }
  }
}

/** "14:05:09" */
export const hhmmss = ({ h, m, s }) => `${pad(h)}:${pad(m)}:${pad(s)}`

/** Weekday + Gregorian date in `zone`, in the UI locale. */
export function dateLine(date, zone, locale) {
  try { return date.toLocaleDateString(locale, { timeZone: zone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) } catch { return date.toDateString() }
}

/** Hijri (Umm al-Qura) date in `zone`, or '' where the engine lacks the calendar. */
export function hijriLine(date, zone, locale) {
  try {
    const f = new Intl.DateTimeFormat(locale, { timeZone: zone, calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' })
    if (!/islamic/.test(f.resolvedOptions().calendar || '')) return ''
    return f.format(date)
  } catch { return '' }
}

/** Short zone name for the label, e.g. "GMT+3". */
export function zoneOffsetLabel(date, zone) {
  try {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(date)
    return (p.find(x => x.type === 'timeZoneName') || {}).value || ''
  } catch { return '' }
}

/** Milliseconds until the next local midnight (when the step day rolls over). */
export function msToMidnight(now = new Date()) {
  const m = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return Math.max(0, m - now)
}

/** Fraction of the local day already gone, 0…1. */
export function dayProgress(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.min(1, Math.max(0, (now - start) / (end - start)))
}

/** { h, m, s } of a duration. Hours are not wrapped at 24. */
export function splitDuration(ms) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000))
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 }
}

/** "1:02:09" / "02:09" for walking time and countdowns. */
export function fmtDuration(ms, { alwaysHours = false } = {}) {
  const { h, m, s } = splitDuration(ms)
  return h || alwaysHours ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/**
 * Steps per hour still needed to reach the goal before midnight — 0 once it's reached.
 * Below 15 minutes left it reports the whole remainder (no absurd hourly rates).
 */
export function stepsPerHourNeeded(steps, goal, msLeft) {
  const left = Math.max(0, (goal || 0) - (steps || 0))
  if (!left) return 0
  const hours = Math.max(0.25, (msLeft || 0) / 3600000)
  return Math.ceil(left / hours)
}

/** Which of the five motivation tiers today's progress is in (5 = goal reached). */
export function motivationTier(steps, goal) {
  if (!(goal > 0)) return 0
  const p = steps / goal
  if (p >= 1) return 5
  if (p >= 0.9) return 4
  if (p >= 0.7) return 3
  if (p >= 0.4) return 2
  if (p >= 0.1) return 1
  return 0
}

/**
 * A Date that re-renders the caller every `ms` (1 s by default), aligned to the start of each
 * second so the seconds digit flips in step with the system clock. Pauses in background tabs
 * by itself (browsers throttle timers) and catches up instantly on return.
 */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let tm = null
    const tick = () => {
      setNow(new Date())
      const drift = ms === 1000 ? 1000 - (Date.now() % 1000) : ms
      tm = setTimeout(tick, drift + 5)
    }
    tm = setTimeout(tick, ms === 1000 ? 1000 - (Date.now() % 1000) + 5 : ms)
    const onVis = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') setNow(new Date()) }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis)
    return () => { clearTimeout(tm); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis) }
  }, [ms])
  return now
}
