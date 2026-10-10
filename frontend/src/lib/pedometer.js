// Step sources — where steps come from on each platform, behind one small interface.
//
//   service Android app (2.1+): the in-app native StepService — a foreground service that
//           counts all day with the screen off, and draws its own live lock-screen
//           notification and widget. Reports whole-day snapshots (lib/stepService.js).
//   native  iOS app (and Android builds without the service): @capgo/capacitor-pedometer. Android reads TYPE_STEP_COUNTER (a
//           hardware counter that keeps counting while the app sleeps — the steps are picked
//           up as one delta the next time a reading arrives); iOS reads Core Motion, and can
//           also report the day's total from the motion coprocessor's history, which backfills
//           anything walked while the app was closed.
//   motion  any browser with an accelerometer: DeviceMotionEvent + lib/stepDetection.js.
//           Only counts while the page is open and on screen — browsers stop sensor events for
//           background tabs. iOS Safari asks for motion permission on a tap first.
//
// A source is created with callbacks and returns { stop }:
//   onSteps(n, info)  n new steps; info.pace (s/m, iOS) when the OS knows it
//   onTotal(n)        (iOS) the OS's step total for today — raise today's count to it
//
// Like the rest of the Capacitor code, the plugin is only imported in the mobile build.
import { MOBILE } from './mobile.js'
import { StepDetector } from './stepDetection.js'
import { hasStepService, serviceAvailable, servicePermissions, call, onServiceEvent, withTimeout } from './stepService.js'

export class PedometerError extends Error {
  constructor(code, msg) { super(msg || code); this.code = code }   // 'unsupported' | 'denied'
}

export const preferredSource = () => (MOBILE ? 'native' : 'motion')

async function nativeSource({ onSteps, onTotal }) {
  const { CapacitorPedometer } = await import('@capgo/capacitor-pedometer')
  // Bounded: a native call that never answers must not leave the counter "Starting…".
  const avail = await withTimeout(CapacitorPedometer.isAvailable(), 8000).catch(() => ({}))
  if (!avail || !avail.stepCounting) throw new PedometerError('unsupported')
  let perm = await withTimeout(CapacitorPedometer.checkPermissions(), 8000).catch(() => ({}))
  if (perm.activityRecognition !== 'granted') perm = await withTimeout(CapacitorPedometer.requestPermissions(), 120000).catch(() => ({}))
  if (!perm || perm.activityRecognition !== 'granted') throw new PedometerError('denied')

  // numberOfSteps is cumulative since startMeasurementUpdates — emit the difference.
  let last = 0
  const handle = await CapacitorPedometer.addListener('measurement', m => {
    const n = Number(m && m.numberOfSteps)
    if (!Number.isFinite(n)) return
    if (n < last) { last = n; return }        // counter restarted under us — rebase quietly
    const d = n - last
    last = n
    if (d > 0) onSteps(d, { pace: m.currentPace })
  })
  try { await withTimeout(CapacitorPedometer.startMeasurementUpdates(), 8000) } catch (e) {
    try { await handle.remove() } catch { /* */ }
    throw new PedometerError('error', e && e.message)
  }

  // iOS keeps a week of step history: today's total covers time the app wasn't running.
  let platform = 'web'
  try { platform = (await import('@capacitor/core')).Capacitor.getPlatform() } catch { /* */ }
  const backfill = async () => {
    if (platform !== 'ios' || !onTotal) return
    const start = new Date(); start.setHours(0, 0, 0, 0)
    try { const r = await CapacitorPedometer.getMeasurement({ start: start.getTime(), end: Date.now() }); if (r && r.numberOfSteps > 0) onTotal(r.numberOfSteps) } catch { /* */ }
  }
  backfill()
  const onVis = () => { if (document.visibilityState === 'visible') backfill() }
  document.addEventListener('visibilitychange', onVis)

  return {
    kind: 'native',
    async stop() {
      document.removeEventListener('visibilitychange', onVis)
      try { await handle.remove() } catch { /* */ }
      try { await CapacitorPedometer.stopMeasurementUpdates() } catch { /* */ }
    },
  }
}

async function motionSource({ onSteps }) {
  if (typeof window === 'undefined' || typeof window.DeviceMotionEvent === 'undefined') throw new PedometerError('unsupported')
  // iOS 13+: must be requested from a tap; elsewhere the function doesn't exist.
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    let r = 'denied'
    try { r = await DeviceMotionEvent.requestPermission() } catch { /* not from a gesture */ }
    if (r !== 'granted') throw new PedometerError('denied')
  }
  const det = new StepDetector()
  let samples = 0
  const handler = e => {
    const a = e.accelerationIncludingGravity
    if (!a || a.x == null) return
    samples++
    const n = det.push(a.x, a.y, a.z, e.timeStamp || performance.now())
    if (n > 0) onSteps(n, {})
  }
  window.addEventListener('devicemotion', handler)
  // Desktop browsers expose DeviceMotionEvent but never fire it — give a real sensor a moment.
  await new Promise(r => setTimeout(r, 1500))
  if (!samples) { window.removeEventListener('devicemotion', handler); throw new PedometerError('unsupported') }
  // A background tab gets no events; a long gap must not look like one giant stride.
  const onVis = () => { if (document.visibilityState === 'visible') det.reset() }
  document.addEventListener('visibilitychange', onVis)
  return {
    kind: 'motion',
    stop() { window.removeEventListener('devicemotion', handler); document.removeEventListener('visibilitychange', onVis) },
  }
}

// Android: the native all-day service. onState(snapshot) gets every update while the app is
// open; config() supplies the settings and texts. stop() switches counting off for good,
// detach() only stops listening (the service keeps counting with the app closed).
async function serviceSource({ onState, config, interactive }) {
  const avail = await serviceAvailable()
  if (!avail.stepCounter && !avail.stepDetector) throw new PedometerError('unsupported')
  // From a tap, ask for what's missing; a launch-time reattach only looks.
  const perm = await servicePermissions(interactive ? 'activity' : false)
  if (perm.activityRecognition !== 'granted') throw new PedometerError('denied')
  const off = await onServiceEvent('steps', st => onState && onState(st))
  let st
  try { st = await call('start', { config: config(), attach: !interactive }) } catch (e) {
    // A slow phone may answer late although the service did start: look before giving up.
    const now = e && e.code === 'timeout' ? await call('getState') : null
    if (now && now.running) st = now
    else {
      off()
      throw new PedometerError(e && e.code === 'denied' ? 'denied' : 'error', e && e.message)
    }
  }
  if (st && onState) onState(st)
  return {
    kind: 'service',
    notifications: perm.notifications === 'granted',
    detach: off,
    async stop() { off(); await call('stop') },
  }
}

export async function startSource(callbacks) {
  if (preferredSource() === 'native' && await hasStepService()) {
    try { return await serviceSource(callbacks) } catch (e) {
      // Phones without a hardware step sensor: count with the accelerometer while the app is
      // open rather than giving up — better than "unsupported".
      if (e instanceof PedometerError && e.code === 'unsupported') return motionSource(callbacks)
      throw e
    }
  }
  return preferredSource() === 'native' ? nativeSource(callbacks) : motionSource(callbacks)
}

/**
 * Optional GPS speed — more accurate than step cadence outdoors. Opt-in (S.walk.gps); the
 * position is read on the device for its speed only, never stored and never sent anywhere.
 * Calls onSpeed(km/h) for fixes that carry a speed with decent accuracy. Returns stop().
 */
export function watchGpsSpeed(onSpeed) {
  if (!('geolocation' in navigator)) return () => {}
  const id = navigator.geolocation.watchPosition(
    p => { const v = p.coords.speed; if (Number.isFinite(v) && v >= 0 && (p.coords.accuracy || 99) <= 35) onSpeed(Math.round(v * 36) / 10) },
    () => {}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 })
  return () => navigator.geolocation.clearWatch(id)
}
