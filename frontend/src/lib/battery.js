// 9.0 — battery care on the web side.
//   useVisibleInterval(fn, ms)   an interval that only runs while the app is on screen (and runs
//                                once straight away when it comes back) — for clocks and countdowns
//   visibleInterval(fn, ms)      the same without React; returns stop()
//   initBatterySaver(getS)       <html data-saver> when S.saver is 'on', or 'auto' (the default) and
//                                the battery is at 20 % or less and not charging. The stylesheet then
//                                stops looping decorations and heavy blur, and timers slow down.
//   saverOn()                    whether the saver is active right now
import { useEffect, useRef } from 'react'

const doc = () => (typeof document !== 'undefined' ? document : null)
export const appVisible = () => { const d = doc(); return !d || d.visibilityState !== 'hidden' }
export const saverOn = () => { const d = doc(); return !!(d && d.documentElement.dataset.saver) }

export function visibleInterval(fn, ms) {
  const d = doc()
  let id = null
  const run = () => { try { fn() } catch { /* a tick must never break the app */ } }
  const start = () => { if (id == null) id = setInterval(run, saverOn() ? ms * 2 : ms) }
  const stop = () => { if (id != null) { clearInterval(id); id = null } }
  const onVis = () => { if (appVisible()) { run(); start() } else stop() }
  if (appVisible()) start()
  if (d) d.addEventListener('visibilitychange', onVis)
  return () => { stop(); if (d) d.removeEventListener('visibilitychange', onVis) }
}

export function useVisibleInterval(fn, ms, enabled = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => (enabled ? visibleInterval(() => ref.current(), ms) : undefined), [ms, enabled])
}

// ---- the saver -----------------------------------------------------------------------------------
let battery = null
let low = false
let getS = null
function apply() {
  const d = doc()
  if (!d) return
  const mode = (getS && getS() && getS().saver) || 'auto'
  const on = mode === 'on' || (mode === 'auto' && low)
  if (on) d.documentElement.dataset.saver = mode === 'on' ? 'on' : 'auto'
  else delete d.documentElement.dataset.saver
}
function readBattery() {
  low = !!battery && !battery.charging && battery.level <= 0.2
  apply()
}
export async function initBatterySaver(get) {
  getS = get
  apply()
  try {
    if (typeof navigator === 'undefined' || !navigator.getBattery) return
    battery = await navigator.getBattery()
    readBattery()
    battery.addEventListener('levelchange', readBattery)
    battery.addEventListener('chargingchange', readBattery)
  } catch { /* no Battery API (Safari, Firefox) — 'auto' just stays off */ }
}
/** Re-read the setting (call after S.saver changes). */
export const refreshSaver = () => apply()
/** For the settings screen: { level 0–1 | null, charging, low }. */
export const batteryInfo = () => (battery ? { level: battery.level, charging: battery.charging, low } : { level: null, charging: false, low: false })
