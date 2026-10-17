// The milestone celebration: a short synthesized fanfare + crowd cheer, and the trigger the
// 5-second overlay (components/pedometer/CelebrationOverlay.jsx) listens to.
//
// The sound is generated with the Web Audio API rather than shipped as an mp3: nothing to
// download, works offline, and it follows the app's Sounds switch like every other beep.
// A browser only plays audio for a page that is open, so when a milestone lands while the app
// is in the background the pedometer posts a notification instead (stepNotification.js).
import { create } from 'zustand'
import { audioContext } from './sound.js'

export const CELEBRATION_MS = 6000

export const useCelebration = create(set => ({
  current: null,   // { steps (the number shown — ml for water), kind: 'milestone' | 'goal' | 'water', key }
  show: (steps, kind = 'milestone') => set({ current: { steps, kind, key: Date.now() } }),
  hide: () => set({ current: null }),
}))

export const celebrate = (steps, kind) => useCelebration.getState().show(steps, kind)

// ---- 2.10: the fanfare -----------------------------------------------------------------------
// A short orchestral "ta-da" built from scratch: a brassy pickup and chord (detuned saws through
// a filter that opens like a horn), timpani-style kick, a snare roll into a cymbal crash, a
// chime sparkle on top and applause underneath — all through a small generated reverb. Water
// gets a lighter, bubbly version; today's plan the biggest one.

let verb = null
function reverb(ctx) {
  if (verb && verb.context === ctx) return verb
  const len = Math.floor(ctx.sampleRate * 1.8)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
  }
  verb = ctx.createConvolver()
  verb.buffer = ir
  return verb
}

// one shared 3-second noise buffer, read from random offsets
let noise = null
const NOISE_SEC = 3
function noiseBuf(ctx) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise
  noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SEC), ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noise
}

/** A brass-like note: two detuned saws, a filter that opens on the attack, a little vibrato. */
function brass(ctx, out, f, at, len, vol = 0.12) {
  const g = ctx.createGain(), lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'; lp.Q.value = 1.2
  lp.frequency.setValueAtTime(f * 1.5, at)
  lp.frequency.exponentialRampToValueAtTime(f * 6, at + 0.06)
  lp.frequency.exponentialRampToValueAtTime(f * 3, at + Math.min(len, 0.5))
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.03)
  g.gain.setValueAtTime(vol, at + len * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  lp.connect(g); g.connect(out)
  for (const det of [-7, 7]) {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det
    if (len > 0.5) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain()
      lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(f * 0.006, at + 0.4)
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(at); lfo.stop(at + len + 0.05)
    }
    o.connect(lp); o.start(at); o.stop(at + len + 0.05)
  }
}

function bell(ctx, out, f, at, len = 1.2, vol = 0.09, type = 'sine') {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.value = f
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  o.connect(g); g.connect(out); o.start(at); o.stop(at + len + 0.05)
}

function kick(ctx, out, at, vol = 0.5) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.frequency.setValueAtTime(140, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.25)
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.4)
  o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.45)
}

function hiss(ctx, out, at, len, { type = 'highpass', f = 6000, q = 0.7, vol = 0.1, attack = 0.004, from = null } = {}) {
  const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx)
  fl.type = type; fl.frequency.value = f; fl.Q.value = q
  g.gain.setValueAtTime(from == null ? 0.0001 : from, at)
  g.gain.exponentialRampToValueAtTime(vol, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + len)
  const dur = Math.min(NOISE_SEC - 0.01, len + 0.05)
  src.connect(fl); fl.connect(g); g.connect(out); src.start(at, Math.random() * (NOISE_SEC - dur), dur)
}

/** Applause: many short claps at random times, swelling then fading, over a soft crowd. */
function applause(ctx, out, at, len, vol = 0.07) {
  for (let i = 0; i < len * 38; i++) {
    const x = Math.random()
    const env = Math.sin(Math.PI * Math.min(1, x * 1.15))
    hiss(ctx, out, at + x * len, 0.05 + Math.random() * 0.04, { type: 'bandpass', f: 900 + Math.random() * 1500, q: 1.4, vol: vol * (0.4 + env) })
  }
  hiss(ctx, out, at, len, { type: 'bandpass', f: 1300, q: 0.5, vol: vol * 0.9, attack: len * 0.3 })
}

/** The celebration sound. `kind`: 'goal' | 'milestone' | 'water' | 'plan'. */
export function playCheer(enabled, kind = 'milestone') {
  if (!enabled) return
  try {
    const ctx = audioContext()
    const t0 = ctx.currentTime + 0.03
    const master = ctx.createGain()
    master.gain.value = 0.8
    const comp = ctx.createDynamicsCompressor()            // big chords without clipping
    comp.threshold.value = -14; comp.ratio.value = 4
    master.connect(comp); comp.connect(ctx.destination)
    const wet = ctx.createGain()
    wet.gain.value = 0.22
    try { const v = reverb(ctx); wet.connect(v); v.connect(master) } catch { /* no convolver */ }
    const bus = ctx.createGain()
    bus.connect(master); bus.connect(wet)

    if (kind === 'water') {
      // bubbles rising into a soft chime chord
      ;[0, 0.09, 0.17, 0.24].forEach((d, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), at = t0 + d
        o.type = 'sine'
        o.frequency.setValueAtTime(300 + i * 90, at)
        o.frequency.exponentialRampToValueAtTime(900 + i * 160, at + 0.09)
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.18, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14)
        o.connect(g); g.connect(bus); o.start(at); o.stop(at + 0.16)
      })
      ;[587.33, 739.99, 880, 1174.66].forEach((f, i) => bell(ctx, bus, f, t0 + 0.36 + i * 0.07, 1.6, 0.08))
      ;[1760, 2349.3, 2793.8].forEach((f, i) => bell(ctx, bus, f, t0 + 0.75 + i * 0.06, 0.8, 0.035, 'triangle'))
      return
    }

    const big = kind === 'goal' || kind === 'plan'
    // pickup: G – G – G – C (ta-ta-ta-taaa), then the chord
    const pick = big ? [[392, 0], [392, 0.12], [392, 0.24], [523.25, 0.36]] : [[392, 0], [523.25, 0.12]]
    pick.forEach(([f, d]) => brass(ctx, bus, f, t0 + d, 0.16, 0.1))
    const hit = t0 + (big ? 0.5 : 0.26)
    const chord = kind === 'plan' ? [261.63, 392, 523.25, 659.25, 783.99, 1046.5] : big ? [261.63, 392, 523.25, 659.25, 783.99] : [392, 523.25, 659.25, 783.99]
    const len = big ? 1.7 : 1.1
    chord.forEach(f => brass(ctx, bus, f, hit, len, big ? 0.075 : 0.07))
    // drums: a snare roll into the chord, a kick on it, a crash ringing out
    if (big) for (let i = 0; i < 9; i++) hiss(ctx, bus, t0 + 0.05 + i * 0.05, 0.06, { type: 'bandpass', f: 2800, q: 0.8, vol: 0.03 + i * 0.012 })
    kick(ctx, bus, hit, big ? 0.55 : 0.4)
    if (big) kick(ctx, bus, hit + 0.75, 0.3)
    hiss(ctx, bus, hit, big ? 2.2 : 1.2, { f: 5500, vol: big ? 0.12 : 0.07, attack: 0.003 })
    // sparkle on top
    const sp = big ? [1567.98, 2093, 2637, 3136, 4186] : [2093, 2637, 3136]
    sp.forEach((f, i) => bell(ctx, bus, f, hit + 0.18 + i * 0.07, 0.9, 0.035, 'triangle'))
    // the crowd
    applause(ctx, bus, hit + 0.15, big ? 2.4 : 1.5, big ? 0.075 : 0.055)
  } catch (e) { /* no audio on this device — the overlay still shows */ }
}
