// 17.0 — making rooba (yogurt) at home: warm milk, a spoon of rooba, a warm corner for the night, then
// the fridge. Two timers that keep going with the app closed — the warmth (5–12 hours) and the fridge
// (4 hours) — each with a notification on the phone when it is done (ids 8601 and 8602). Kept on this
// phone only (localStorage 'mj_rooba'), like a kitchen timer. Pure — the card is
// components/kitchen/RoobaMaker.jsx; the steps are the recipe "Homemade rooba" (lib/kitchen.js).
export const SET_HOURS = [5, 6, 7, 8, 10, 12]
export const DEFAULT_HOURS = 7
export const FRIDGE_HOURS = 4
/** Native notification ids: the rooba has set · it is cold and ready. */
export const ROOBA_NOTIF = { set: 8601, cold: 8602 }
const K = 'mj_rooba'
const H = 3600e3
/** A finished batch is forgotten a day after it was ready. */
export const FORGET_MS = 24 * H

export function roobaRead() {
  try { const v = JSON.parse(localStorage.getItem(K) || 'null'); return v && v.step && v.end ? v : null } catch { return null }
}
function write(v) {
  try { if (v) localStorage.setItem(K, JSON.stringify(v)); else localStorage.removeItem(K) } catch { /* private mode */ }
  return v
}

/**
 * Where a batch is: idle · setting (in the warmth) · set (time for the fridge) · chilling · ready —
 * with its start, end, the time left (ms) and how far along it is (0–1).
 */
export function roobaPhase(st = roobaRead(), now = Date.now()) {
  if (!st) return { phase: 'idle', left: 0, p: 0 }
  const total = Math.max(1, st.end - st.start)
  const left = Math.max(0, st.end - now)
  const p = Math.min(1, Math.max(0, (now - st.start) / total))
  if (st.step === 'set') return { phase: left > 0 ? 'setting' : 'set', start: st.start, end: st.end, left, p, hours: st.hours }
  if (left > 0) return { phase: 'chilling', start: st.start, end: st.end, left, p, hours: st.hours }
  return now - st.end > FORGET_MS ? { phase: 'idle', left: 0, p: 0 } : { phase: 'ready', start: st.start, end: st.end, left: 0, p: 1, hours: st.hours }
}
/** Put the milk somewhere warm: the first timer. */
export const roobaStart = (hours = DEFAULT_HOURS, now = Date.now()) =>
  write({ step: 'set', start: now, end: now + Math.max(1, Math.min(24, +hours || DEFAULT_HOURS)) * H, hours: +hours || DEFAULT_HOURS })
/** Into the fridge: the second timer. */
export const roobaChill = (now = Date.now()) => write({ step: 'cold', start: now, end: now + FRIDGE_HOURS * H, hours: FRIDGE_HOURS })
/** Stop or finish. */
export const roobaClear = () => write(null)

/** "3 h 05 min" / "42 min" — the time left, in numbers the reader formats. */
export function leftParts(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000))
  return { h: Math.floor(m / 60), m: m % 60 }
}
