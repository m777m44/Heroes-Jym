// Accelerometer step detection — the web fallback for phones without a native step counter.
//
// The native builds read the OS step counter (Android TYPE_STEP_COUNTER, iOS Core Motion)
// through @capgo/capacitor-pedometer. A browser has no such sensor, only DeviceMotionEvent:
// raw acceleration, ~60 samples a second, gravity included. This turns that stream into steps.
//
// The pipeline, per sample:
//   1. magnitude |a| — orientation-free, so it works in a pocket, a hand or an armband
//   2. a slow low-pass (τ ≈ 1 s) tracks gravity; subtracting it leaves the walking signal
//   3. a fast low-pass (τ ≈ 60 ms) takes the jitter off that signal
//   4. peak detection with hysteresis: a peak counts once the signal has risen above the
//      upper threshold and fallen back below the lower one, at least MIN_GAP after the last
//   5. a regularity gate: peaks are only *candidates* until CONFIRM of them arrive at a
//      walking rhythm. Picking up the phone, a bump on the table or a single shake produces
//      a couple of peaks and is thrown away; a real walk confirms within ~2 s, and the
//      buffered candidates are then credited too, so no steps are lost at the start.
//
// Pure and synchronous — no DOM, no timers — so it is tested with synthetic signals.

export const MIN_GAP = 250      // ms — faster than 4 steps/s is not walking (or running)
export const MAX_GAP = 2000     // ms — a longer pause ends the walk; the next one re-confirms
export const CONFIRM = 4        // candidate peaks at a walking rhythm before counting starts

const TAU_GRAVITY = 1000        // ms
const TAU_SMOOTH = 60           // ms
const HI = 1.1                  // m/s² above gravity — arms a peak
const LO = 0.35                 // m/s² — re-arms after a peak

const lp = (prev, x, dt, tau) => prev + (x - prev) * (dt / (tau + dt))

export class StepDetector {
  constructor() { this.reset() }

  reset() {
    this.g = null           // gravity estimate
    this.s = 0              // smoothed walking signal
    this.lastT = null
    this.armed = true       // below LO since the last peak
    this.peak = -Infinity   // running max of the current peak
    this.peakT = 0
    this.lastStepT = null
    this.candidates = 0     // peaks in the current rhythm, not yet confirmed
    this.walking = false
    this.total = 0
  }

  /**
   * Feed one sample (acceleration incl. gravity, m/s²; timestamp ms).
   * Returns how many steps this sample added — usually 0 or 1, CONFIRM on the sample that
   * confirms a walk (the buffered candidates are credited at once).
   */
  push(x, y, z, t) {
    if (![x, y, z, t].every(Number.isFinite)) return 0
    const mag = Math.sqrt(x * x + y * y + z * z)
    if (this.g === null) { this.g = mag; this.lastT = t; return 0 }
    const dt = Math.max(1, Math.min(200, t - this.lastT))   // clamp gaps from tab switches
    this.lastT = t
    this.g = lp(this.g, mag, dt, TAU_GRAVITY)
    this.s = lp(this.s, mag - this.g, dt, TAU_SMOOTH)

    // Walk over: too long since the last step. Drop any half-built rhythm.
    if (this.lastStepT !== null && t - this.lastStepT > MAX_GAP) {
      this.walking = false
      this.candidates = 0
    }

    if (this.s > HI) {
      if (this.s > this.peak) { this.peak = this.s; this.peakT = t }
      return 0
    }
    if (this.peak > -Infinity && this.s < LO) {
      // the signal rose above HI and has now fallen back: one peak, at peakT
      const at = this.peakT
      this.peak = -Infinity
      return this._onPeak(at)
    }
    return 0
  }

  _onPeak(t) {
    const gap = this.lastStepT === null ? null : t - this.lastStepT
    if (gap !== null && gap < MIN_GAP) return 0     // bounce of the same footfall
    const inRhythm = gap !== null && gap <= MAX_GAP
    this.lastStepT = t
    if (this.walking) { this.total++; return 1 }
    this.candidates = inRhythm ? this.candidates + 1 : 1
    if (this.candidates >= CONFIRM) {
      this.walking = true
      const n = this.candidates
      this.candidates = 0
      this.total += n
      return n
    }
    return 0
  }
}
