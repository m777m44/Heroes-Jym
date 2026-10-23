// Guided breathing (8.0): box breathing, 4-7-8, coherent breathing and a quick recovery breath.
//
// A pattern is a list of [step, seconds]; everything on screen — the orb's size, the word in
// the middle, the countdown, the haptic tick at each change — is a pure function of the time
// since the start, so the animation stays exact whatever the frame rate.

export const PATTERNS = [
  { id: 'box', name: 'Box breathing', desc: 'Calm and focus — 4 counts in, hold, out, hold', steps: [['in', 4], ['hold', 4], ['out', 4], ['hold', 4]], color: 'var(--blue)' },
  { id: 'relax', name: '4-7-8 relax', desc: 'Slows you down before sleep', steps: [['in', 4], ['hold', 7], ['out', 8]], color: 'var(--indigo)' },
  { id: 'coherent', name: 'Coherent breathing', desc: 'About 5.5 breaths a minute — balance and calm', steps: [['in', 5.5], ['out', 5.5]], color: 'var(--teal)' },
  { id: 'recover', name: 'After a hard set', desc: 'Longer out-breaths bring the heart rate down', steps: [['in', 3], ['out', 6]], color: 'var(--green)' },
]

export const patternById = id => PATTERNS.find(p => p.id === id) || PATTERNS[0]

/** The words shown for each step (i18n keys). */
export const STEP_WORD = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' }

export const cycleSec = p => p.steps.reduce((a, [, s]) => a + s, 0)
export const breathsPerMin = p => Math.round((60 / cycleSec(p)) * 10) / 10

/** Where a session is after `t` seconds: { i, step, sec, left, frac, cycle }. */
export function phaseAt(p, t) {
  const c = cycleSec(p)
  const tt = Math.max(0, t)
  const cycle = Math.floor(tt / c)
  let x = tt - cycle * c
  for (let i = 0; i < p.steps.length; i++) {
    const [step, sec] = p.steps[i]
    if (x < sec || i === p.steps.length - 1) {
      return { i, step, sec, left: Math.max(0, sec - x), frac: sec ? Math.min(1, x / sec) : 1, cycle }
    }
    x -= sec
  }
  return { i: 0, step: p.steps[0][0], sec: p.steps[0][1], left: p.steps[0][1], frac: 0, cycle }
}

const ease = x => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2   // smooth in-out

export const MIN_SCALE = 0.56
/**
 * The orb's size (MIN_SCALE…1): grows while breathing in, stays full on a hold after
 * breathing in, shrinks while breathing out, stays small on a hold after breathing out.
 */
export function scaleAt(p, t) {
  const ph = phaseAt(p, t)
  const span = 1 - MIN_SCALE
  if (ph.step === 'in') return MIN_SCALE + span * ease(ph.frac)
  if (ph.step === 'out') return 1 - span * ease(ph.frac)
  // a hold keeps whatever the step before it ended on
  const prev = p.steps[(ph.i - 1 + p.steps.length) % p.steps.length][0]
  return prev === 'in' ? 1 : MIN_SCALE
}

/** Session lengths offered (minutes) and the number of full cycles that fit. */
export const DURATIONS = [1, 2, 3, 5, 10]
export const cyclesFor = (p, min) => Math.max(1, Math.round((min * 60) / cycleSec(p)))
