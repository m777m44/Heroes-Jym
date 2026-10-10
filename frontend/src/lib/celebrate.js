// The milestone celebration: a short synthesized fanfare + crowd cheer, and the trigger the
// 5-second overlay (components/pedometer/CelebrationOverlay.jsx) listens to.
//
// The sound is generated with the Web Audio API rather than shipped as an mp3: nothing to
// download, works offline, and it follows the app's Sounds switch like every other beep.
// A browser only plays audio for a page that is open, so when a milestone lands while the app
// is in the background the pedometer posts a notification instead (stepNotification.js).
import { create } from 'zustand'
import { audioContext } from './sound.js'

export const CELEBRATION_MS = 5000

export const useCelebration = create(set => ({
  current: null,   // { steps, kind: 'milestone' | 'goal', key }
  show: (steps, kind = 'milestone') => set({ current: { steps, kind, key: Date.now() } }),
  hide: () => set({ current: null }),
}))

export const celebrate = (steps, kind) => useCelebration.getState().show(steps, kind)

/** Rising arpeggio (C–E–G–C, a full chord on the goal) over a filtered-noise "crowd". */
export function playCheer(enabled, kind = 'milestone') {
  if (!enabled) return
  try {
    const ctx = audioContext()
    const t0 = ctx.currentTime + 0.02
    const master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)

    const notes = kind === 'goal' ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.value = f
      const at = t0 + i * 0.11
      const len = i === notes.length - 1 ? 0.9 : 0.22
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(0.32, at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, at + len)
      o.connect(g); g.connect(master)
      o.start(at); o.stop(at + len + 0.05)
    })

    // crowd: band-passed noise swelling and fading under the last note
    const dur = 1.6
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 900))
    const src = ctx.createBufferSource()
    src.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.7
    const ng = ctx.createGain()
    const nAt = t0 + 0.3
    ng.gain.setValueAtTime(0.0001, nAt)
    ng.gain.exponentialRampToValueAtTime(0.16, nAt + 0.35)
    ng.gain.exponentialRampToValueAtTime(0.0001, nAt + dur - 0.1)
    src.connect(bp); bp.connect(ng); ng.connect(master)
    src.start(nAt); src.stop(nAt + dur)
  } catch (e) { /* no audio on this device — the overlay still shows */ }
}
