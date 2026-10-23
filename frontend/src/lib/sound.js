// WebAudio beeps + haptics (ported from the vanilla app). `enabled` gates sound.
let audioCtx = null
// One shared AudioContext for the whole app (beeps here, the celebration in celebrate.js).
export function audioContext() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  bindHide()
  return audioCtx
}

// 9.0 — battery: a running AudioContext keeps the phone's audio hardware awake (and its reverb
// working on silence) for as long as the app is open. Every sound now says how long it lasts;
// a few seconds after the last one ends the context is suspended, and it is suspended at once
// when the app goes to the background. The next sound resumes it.
const IDLE_MS = 4000
let suspendTm = null
let busyUntil = 0
export function keepAwakeFor(sec) {
  if (!audioCtx) return
  busyUntil = Math.max(busyUntil, audioCtx.currentTime + Math.max(0, sec || 0))
  clearTimeout(suspendTm)
  suspendTm = setTimeout(trySuspend, Math.max(0, busyUntil - audioCtx.currentTime) * 1000 + IDLE_MS)
}
function trySuspend() {
  suspendTm = null
  if (!audioCtx || audioCtx.state !== 'running') return
  if (audioCtx.currentTime < busyUntil - 0.05) { keepAwakeFor(0); return }
  audioCtx.suspend().catch(() => {})
}
let hideBound = false
function bindHide() {
  if (hideBound || typeof document === 'undefined') return
  hideBound = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && audioCtx && audioCtx.state === 'running') { clearTimeout(suspendTm); audioCtx.suspend().catch(() => {}) }
  })
}
/** True while a context exists and is running (for tests and the settings screen). */
export const audioRunning = () => !!audioCtx && audioCtx.state === 'running'
export function beep(enabled, freq, dur, when) {
  if (!enabled) return
  try {
    audioContext()
    const o = audioCtx.createOscillator(), g = audioCtx.createGain()
    o.connect(g); g.connect(audioCtx.destination)
    o.frequency.value = freq || 880; o.type = 'sine'
    const t0 = audioCtx.currentTime + (when || 0)
    g.gain.setValueAtTime(0.001, t0)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.18))
    o.start(t0); o.stop(t0 + (dur || 0.18) + 0.05)
    keepAwakeFor((when || 0) + (dur || 0.18) + 0.1)
  } catch { /* */ }
}
export function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p) } catch { /* */ } }
