// The live step counter — runtime state for one device, bridging a step source
// (lib/pedometer.js) into the synced profile state.
//
// Two ways steps arrive:
//
//  • service (Android app): the native foreground service counts all day, screen off or not,
//    and owns the live notification + widget. It sends whole-day snapshots; we mirror them into
//    S.steps (raise-only, see mergeDay) and celebrate on screen. Haptics, milestone alerts and
//    the voice are played natively, so nothing is doubled here.
//  • deltas (iOS app, browsers): a sensor reports new steps; they're buffered in `pending` and
//    written into S.steps every few seconds, and this store does the milestones, haptics and
//    the JS-side ongoing notification itself.
//
// Either way, what the screens show is S.steps[today] + pending, so the number moves with every
// step without rewriting the whole state on each footfall.
//
// Whether the counter is switched on is remembered per device (localStorage), not in the
// synced profile: walking with your phone must not make your laptop try to count steps.
import { create } from 'zustand'
import { useStore } from './useStore.js'
import { todayISO } from '../lib/format.js'
import { startSource, watchGpsSpeed, preferredSource } from '../lib/pedometer.js'
import {
  addSteps, raiseSteps, pruneSteps, stepsOn, activeMsOn, goalOf, strideMeters, walkPrefs, distanceKm,
  speedKmh, paceToKmh, crossedMilestone, reachedGoal, mergeDay,
} from '../lib/stepMetrics.js'
import { lastBW } from '../lib/history.js'
import { milestoneHaptic, goalHaptic } from '../lib/hapticFeedback.js'
import { celebrate, playCheer } from '../lib/celebrate.js'
import { ensurePermission, showOngoing, clearOngoing, notifyMilestone } from '../lib/stepNotification.js'
import { hasStepService, serviceConfig, call as serviceCall } from '../lib/stepService.js'

const TRACK_KEY = 'mj_walk_tracking'
const FLUSH_MS = 5000
const ACTIVE_GAP = 5000      // steps closer than this count as continuous walking time

const S = () => useStore.getState().S

let src = null
let flushTm = null, tickTm = null, gpsStop = null
let samples = []             // [{ t, steps }] — cumulative session steps, last ~15 s
let cum = 0
let pendingMs = 0
let pendingH = new Array(24).fill(0)
let lastStepT = 0
let gps = null, pace = null  // { v: km/h, t }
let lastNote = { t: 0, steps: -1 }
let prunedOn = null
let svc = null               // last snapshot from the native service
let svcSig = ''              // signature of the config last sent to the service
let historySynced = false

const today = () => todayISO()
const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'

// Estimated kcal use the latest logged body weight, so the number gets better as you log.
export const weightForCalories = st => { const b = lastBW(st); return b ? { weight: b.w, unit: st.unit } : {} }
const weightKg = st => { const w = weightForCalories(st); return w.weight ? (w.unit === 'lb' ? w.weight * 0.45359237 : w.weight) : null }
const configNow = () => serviceConfig(S(), weightKg(S()))

export const usePedometer = create((set, get) => {
  const total = () => stepsOn(S(), today()) + get().pending
  const serviceMode = () => !!(src && src.kind === 'service')

  const currentSpeed = now => {
    if (gps && now - gps.t < 6000 && walkPrefs(S()).gps) return gps.v
    if (serviceMode()) return svc && svc.moving ? Number(svc.speed) || 0 : 0
    if (pace && now - pace.t < 6000) return pace.v
    return speedKmh(samples, now, strideMeters(S()))
  }

  // JS-side ongoing notification — only for sources without the native service.
  const note = (steps, force = false) => {
    if (serviceMode() || !walkPrefs(S()).notify || get().status !== 'tracking') return
    const now = Date.now()
    const due = force || now - lastNote.t >= 30000 || (Math.abs(steps - lastNote.steps) >= 25 && now - lastNote.t >= 5000)
    if (!due) return
    lastNote = { t: now, steps }
    showOngoing({ steps, goal: goalOf(S()), speed: get().speed, km: distanceKm(steps, strideMeters(S())) })
  }

  // One celebration per batch at most: the goal beats a plain thousand.
  const milestones = (prev, next) => {
    const st = S(), prefs = walkPrefs(st), goal = goalOf(st)
    const kind = reachedGoal(prev, next, goal) ? 'goal' : crossedMilestone(prev, next) ? 'milestone' : null
    if (!kind) return
    const at = kind === 'goal' ? next : crossedMilestone(prev, next)
    if (visible()) {
      if (prefs.celebrate) { celebrate(at, kind); playCheer(st.sound, kind) }
      if (!serviceMode() && prefs.haptics) (kind === 'goal' ? goalHaptic() : milestoneHaptic())
    } else if (!serviceMode()) {
      if (prefs.haptics) (kind === 'goal' ? goalHaptic() : milestoneHaptic())
      if (prefs.notify) notifyMilestone(at, kind)
    }
    note(next, true)
  }

  const flush = () => {
    const n = get().pending, ms = pendingMs
    const h = pendingH
    const snap = serviceMode() ? svc : null
    if (!n && !ms && !snap) return
    const iso = today()
    useStore.getState().updateQuiet(s => {
      if (snap && snap.day === iso) {
        mergeDay(s, iso, snap)
      } else if (n || ms) {
        // spread the batch over the hours it was walked in (usually just this one)
        let left = n
        for (let i = 0; i < 24 && left > 0; i++) if (h[i] > 0) { const k = Math.min(left, h[i]); addSteps(s, iso, k, 0, i); left -= k }
        if (left > 0) addSteps(s, iso, left, 0, new Date().getHours())
        if (ms) addSteps(s, iso, 0, ms)
      }
      if (prunedOn !== iso) { pruneSteps(s, iso); prunedOn = iso }
    })
    pendingMs = 0
    pendingH = new Array(24).fill(0)
    set({ pending: serviceMode() && snap && snap.day === iso ? Math.max(0, snap.steps - stepsOn(S(), iso)) : 0 })
  }

  // ---- delta sources (iOS app, browsers) ----
  const onSteps = (n, info = {}) => {
    const now = Date.now()
    if (lastStepT && now - lastStepT < ACTIVE_GAP) pendingMs += now - lastStepT
    lastStepT = now
    cum += n
    samples.push({ t: now, steps: cum })
    while (samples.length > 2 && samples[0].t < now - 15000) samples.shift()
    if (Number.isFinite(info.pace) && info.pace > 0) pace = { v: paceToKmh(info.pace), t: now }
    pendingH[new Date(now).getHours()] += n
    const prev = total()
    set(s => ({ pending: s.pending + n, sessionSteps: s.sessionSteps + n, speed: currentSpeed(now), lastStepAt: now }))
    milestones(prev, prev + n)
    note(prev + n)
    if (get().pending >= 200) flush()
  }

  // iOS: the OS's total for today, which includes steps walked while the app was closed.
  const onTotal = n => {
    flush()
    const prev = total()
    let added = 0
    useStore.getState().updateQuiet(s => { added = raiseSteps(s, today(), n) })
    if (added > 0) { milestones(prev, prev + added); note(prev + added, true) }
  }

  // ---- the native service (Android app) ----
  const onState = st => {
    if (!st || typeof st.steps !== 'number') return
    const iso = today()
    const prevSnap = svc
    svc = st
    if (st.day !== iso) return
    const prev = total()
    const pending = Math.max(0, st.steps - stepsOn(S(), iso))
    const status = !st.running ? get().status : st.paused ? 'paused' : 'tracking'
    set(s => ({
      pending,
      speed: st.moving ? Number(st.speed) || 0 : 0,
      moving: !!st.moving,
      liveActiveMs: Math.max(Number(st.activeMs) || 0, activeMsOn(S(), iso)),
      lastStepAt: st.lastStepAt || s.lastStepAt,
      sessionSteps: prevSnap && prevSnap.day === iso ? s.sessionSteps + Math.max(0, st.steps - prevSnap.steps) : s.sessionSteps,
      status,
    }))
    const next = stepsOn(S(), iso) + pending
    if (next > prev && prevSnap) milestones(prev, next)
    if (pending >= 200) flush()
  }

  // Days walked while the app wasn't opened: the service keeps two months of them.
  const syncHistory = async () => {
    const r = await serviceCall('getHistory')
    const days = r && r.days
    if (!days || typeof days !== 'object') return
    useStore.getState().updateQuiet(s => { for (const [d, rep] of Object.entries(days)) mergeDay(s, d, rep) })
    historySynced = true
  }

  // Resend the settings when anything they depend on changed (goal, stride, weight, language…).
  const syncConfig = (force = false) => {
    if (!serviceMode()) return
    const cfg = configNow()
    const sig = JSON.stringify(cfg)
    if (!force && sig === svcSig) return
    svcSig = sig
    serviceCall('configure', { config: cfg })
  }

  const onHidden = () => { if (document.visibilityState === 'hidden') flush() }
  const onShown = () => { if (document.visibilityState === 'visible' && serviceMode()) { serviceCall('getState').then(st => st && onState(st)); syncHistory() } }

  const startGps = () => {
    if (gpsStop || !walkPrefs(S()).gps) return
    gpsStop = watchGpsSpeed(v => { gps = { v, t: Date.now() } })
  }
  const stopGps = () => { if (gpsStop) gpsStop(); gpsStop = null; gps = null }

  const startTimers = () => {
    clearInterval(flushTm); clearInterval(tickTm)
    flushTm = setInterval(() => { flush(); syncConfig() }, FLUSH_MS)
    tickTm = setInterval(() => {
      const sp = currentSpeed(Date.now())
      if (sp !== get().speed) set({ speed: sp })
      note(total())
    }, 1000)
    document.addEventListener('visibilitychange', onHidden)
    document.addEventListener('visibilitychange', onShown)
  }

  return {
    status: 'idle',      // idle | starting | tracking | paused | denied | unsupported | error
    source: null,        // 'service' | 'native' | 'motion'
    pending: 0,
    speed: 0,
    moving: false,
    liveActiveMs: 0,
    lastStepAt: 0,
    sessionSteps: 0,
    sessionStart: null,

    total,
    flush,

    /** interactive: started from a tap — allowed to show permission prompts. */
    async start({ interactive = true } = {}) {
      // Paused from the notification: resume the running service instead of restarting.
      if (serviceMode() && get().status === 'paused') {
        const st = await serviceCall('resume')
        if (st) onState(st)
        return true
      }
      if (src || get().status === 'starting') return get().status === 'tracking'
      // iOS Safari only grants motion access from a tap; resuming on load has to wait for one.
      if (!interactive && preferredSource() === 'motion' && typeof window !== 'undefined' &&
          window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission === 'function') {
        set({ status: 'paused' })
        return false
      }
      set({ status: 'starting' })
      try {
        src = await startSource({ onSteps, onTotal, onState, config: configNow, interactive })
      } catch (e) {
        src = null
        const status = e && (e.code === 'denied' || e.code === 'unsupported') ? e.code : 'error'
        if (interactive || status === 'unsupported') localStorage.removeItem(TRACK_KEY)
        set({ status })
        return false
      }
      samples = []; cum = 0; pendingMs = 0; pendingH = new Array(24).fill(0); lastStepT = 0; pace = null; lastNote = { t: 0, steps: -1 }
      set(s => ({
        status: s.status === 'paused' && src.kind === 'service' ? 'paused' : 'tracking',
        source: src.kind, sessionSteps: 0, sessionStart: Date.now(), speed: 0,
      }))
      localStorage.setItem(TRACK_KEY, '1')
      startTimers()
      startGps()
      if (src.kind === 'service') {
        svcSig = JSON.stringify(configNow())
        if (!historySynced) syncHistory()
        flush()
      } else if (walkPrefs(S()).notify) {
        const ok = interactive ? await ensurePermission() : true
        if (ok) note(total(), true)
      }
      return true
    },

    /** Pause without switching off (service: the notification stays, with a Resume button). */
    async pause() {
      if (serviceMode()) { const st = await serviceCall('pause'); if (st) onState(st); set({ status: 'paused' }); return }
      return get().stop()
    },

    async stop() {
      flush()
      const s = src
      src = null
      clearInterval(flushTm); clearInterval(tickTm); flushTm = tickTm = null
      document.removeEventListener('visibilitychange', onHidden)
      document.removeEventListener('visibilitychange', onShown)
      stopGps()
      localStorage.removeItem(TRACK_KEY)
      set({ status: 'idle', source: null, speed: 0, moving: false, pending: 0 })
      svc = null
      if (s) await s.stop()
      clearOngoing()
    },

    /**
     * On app start: reattach to the native service if it is counting (it may have been started
     * days ago, or after a reboot), else switch the counter back on if it was on when the app
     * was last closed.
     */
    async resume() {
      if (src) return
      if (await hasStepService()) {
        const st = await serviceCall('getState')
        if (st && st.running) { await get().start({ interactive: false }); return }
        await syncHistory()
      }
      if (localStorage.getItem(TRACK_KEY) === '1' && !src) get().start({ interactive: false })
    },

    /** Apply a changed walking preference to a running counter. */
    async prefsChanged(key) {
      if (get().status !== 'tracking' && get().status !== 'paused') return
      const p = walkPrefs(S())
      if (key === 'gps') { if (p.gps) startGps(); else stopGps() }
      if (serviceMode()) { syncConfig(true); return }
      if (key === 'notify') {
        if (p.notify) { if (await ensurePermission()) note(total(), true) }
        else clearOngoing()
      }
      if (key === 'goal') note(total(), true)
    },
  }
})
