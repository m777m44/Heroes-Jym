// The live step counter — runtime state for one device, bridging a step source
// (lib/pedometer.js) into the synced profile state.
//
// Steps are buffered here (`pending`) and written into S.steps every few seconds with
// updateQuiet(), so a walk doesn't rewrite the whole state on every footfall; what the screen
// shows is S.steps[today] + pending, so the number still moves with each step. On each batch it
// checks for 1 000-step milestones and the daily goal (haptics + the 5-second celebration, or a
// notification when the app isn't on screen) and refreshes the ongoing notification.
//
// Whether the counter is switched on is remembered per device (localStorage), not in the
// synced profile: walking with your phone must not make your laptop try to count steps.
import { create } from 'zustand'
import { useStore } from './useStore.js'
import { todayISO } from '../lib/format.js'
import { startSource, watchGpsSpeed, preferredSource } from '../lib/pedometer.js'
import {
  addSteps, raiseSteps, pruneSteps, stepsOn, goalOf, strideMeters, walkPrefs, distanceKm,
  speedKmh, paceToKmh, crossedMilestone, reachedGoal,
} from '../lib/stepMetrics.js'
import { lastBW } from '../lib/history.js'
import { milestoneHaptic, goalHaptic } from '../lib/hapticFeedback.js'
import { celebrate, playCheer } from '../lib/celebrate.js'
import { ensurePermission, showOngoing, clearOngoing, notifyMilestone } from '../lib/stepNotification.js'

const TRACK_KEY = 'mj_walk_tracking'
const FLUSH_MS = 5000
const ACTIVE_GAP = 5000      // steps closer than this count as continuous walking time

const S = () => useStore.getState().S

let src = null
let flushTm = null, tickTm = null, gpsStop = null
let samples = []             // [{ t, steps }] — cumulative session steps, last ~15 s
let cum = 0
let pendingMs = 0
let lastStepT = 0
let gps = null, pace = null  // { v: km/h, t }
let lastNote = { t: 0, steps: -1 }
let prunedOn = null

const today = () => todayISO()
const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'

export const usePedometer = create((set, get) => {
  const total = () => stepsOn(S(), today()) + get().pending

  const currentSpeed = now => {
    if (gps && now - gps.t < 6000 && walkPrefs(S()).gps) return gps.v
    if (pace && now - pace.t < 6000) return pace.v
    return speedKmh(samples, now, strideMeters(S()))
  }

  const note = (steps, force = false) => {
    if (!walkPrefs(S()).notify || get().status !== 'tracking') return
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
    if (prefs.haptics) (kind === 'goal' ? goalHaptic() : milestoneHaptic())
    if (visible()) {
      if (prefs.celebrate) { celebrate(at, kind); playCheer(st.sound, kind) }
    } else if (prefs.notify) notifyMilestone(at, kind)
    note(next, true)
  }

  const flush = () => {
    const n = get().pending, ms = pendingMs
    if (!n && !ms) return
    const iso = today()
    useStore.getState().updateQuiet(s => {
      addSteps(s, iso, n, ms)
      if (prunedOn !== iso) { pruneSteps(s, iso); prunedOn = iso }
    })
    pendingMs = 0
    set({ pending: 0 })
  }

  const onSteps = (n, info = {}) => {
    const now = Date.now()
    if (lastStepT && now - lastStepT < ACTIVE_GAP) pendingMs += now - lastStepT
    lastStepT = now
    cum += n
    samples.push({ t: now, steps: cum })
    while (samples.length > 2 && samples[0].t < now - 15000) samples.shift()
    if (Number.isFinite(info.pace) && info.pace > 0) pace = { v: paceToKmh(info.pace), t: now }
    const prev = total()
    set(s => ({ pending: s.pending + n, sessionSteps: s.sessionSteps + n, speed: currentSpeed(now) }))
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

  const onHidden = () => { if (document.visibilityState === 'hidden') flush() }

  const startGps = () => {
    if (gpsStop || !walkPrefs(S()).gps) return
    gpsStop = watchGpsSpeed(v => { gps = { v, t: Date.now() } })
  }
  const stopGps = () => { if (gpsStop) gpsStop(); gpsStop = null; gps = null }

  return {
    status: 'idle',      // idle | starting | tracking | paused | denied | unsupported | error
    source: null,        // 'native' | 'motion'
    pending: 0,
    speed: 0,
    sessionSteps: 0,
    sessionStart: null,

    total,
    flush,

    /** interactive: started from a tap — allowed to show permission prompts. */
    async start({ interactive = true } = {}) {
      if (src || get().status === 'starting') return get().status === 'tracking'
      // iOS Safari only grants motion access from a tap; resuming on load has to wait for one.
      if (!interactive && preferredSource() === 'motion' && typeof window !== 'undefined' &&
          window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission === 'function') {
        set({ status: 'paused' })
        return false
      }
      set({ status: 'starting' })
      try {
        src = await startSource({ onSteps, onTotal })
      } catch (e) {
        src = null
        const status = e && (e.code === 'denied' || e.code === 'unsupported') ? e.code : 'error'
        if (interactive || status === 'unsupported') localStorage.removeItem(TRACK_KEY)
        set({ status })
        return false
      }
      samples = []; cum = 0; pendingMs = 0; lastStepT = 0; pace = null; lastNote = { t: 0, steps: -1 }
      set({ status: 'tracking', source: src.kind, sessionSteps: 0, sessionStart: Date.now(), speed: 0 })
      localStorage.setItem(TRACK_KEY, '1')
      flushTm = setInterval(flush, FLUSH_MS)
      tickTm = setInterval(() => {
        const sp = currentSpeed(Date.now())
        if (sp !== get().speed) set({ speed: sp })
        note(total())
      }, 1000)
      document.addEventListener('visibilitychange', onHidden)
      startGps()
      if (walkPrefs(S()).notify) {
        const ok = interactive ? await ensurePermission() : true
        if (ok) note(total(), true)
      }
      return true
    },

    async stop() {
      flush()
      const s = src
      src = null
      clearInterval(flushTm); clearInterval(tickTm); flushTm = tickTm = null
      document.removeEventListener('visibilitychange', onHidden)
      stopGps()
      localStorage.removeItem(TRACK_KEY)
      set({ status: 'idle', source: null, speed: 0 })
      if (s) await s.stop()
      clearOngoing()
    },

    /** On app start: switch the counter back on if it was on when the app was last closed. */
    resume() {
      if (localStorage.getItem(TRACK_KEY) === '1' && !src) get().start({ interactive: false })
    },

    /** Apply a changed walking preference to a running counter. */
    async prefsChanged(key) {
      if (get().status !== 'tracking') return
      const p = walkPrefs(S())
      if (key === 'gps') { if (p.gps) startGps(); else stopGps() }
      if (key === 'notify') {
        if (p.notify) { if (await ensurePermission()) note(total(), true) }
        else clearOngoing()
      }
      if (key === 'goal') note(total(), true)
    },
  }
})

// Estimated kcal use the latest logged body weight, so the number gets better as you log.
export const weightForCalories = st => { const b = lastBW(st); return b ? { weight: b.w, unit: st.unit } : {} }
