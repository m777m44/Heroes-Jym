// Interval timer (8.0) — Tabata, HIIT, EMOM, boxing rounds or your own.
//
// A configuration is a few numbers; `phases()` unrolls it into the exact list of phases the
// screen walks through (get ready → work → rest → … → cool down), so the clock, the ring, the
// "next up" line and the totals all read from one list and can never disagree. Time is always
// derived from a start timestamp (not counted by ticks), so a timer survives the screen being
// locked, the app being backgrounded or the tab being throttled — it is simply where it should be.

export const LIMITS = {
  work: [5, 3600], rest: [0, 3600], rounds: [1, 99], sets: [1, 20], setRest: [0, 1800], prep: [0, 60], cool: [0, 900],
}

/** The built-in timers. `name` is an i18n key (Tabata/HIIT/EMOM stay as they are everywhere). */
export const PRESETS = [
  { id: 'tabata', name: 'Tabata', work: 20, rest: 10, rounds: 8, sets: 1, setRest: 60, prep: 10, cool: 0, color: 'var(--red)', icon: 'flame' },
  { id: 'hiit', name: 'HIIT 40/20', work: 40, rest: 20, rounds: 10, sets: 1, setRest: 60, prep: 10, cool: 0, color: 'var(--orange)', icon: 'bolt' },
  { id: 'hiit30', name: 'HIIT 30/30', work: 30, rest: 30, rounds: 12, sets: 1, setRest: 60, prep: 10, cool: 0, color: 'var(--yellow)', icon: 'bolt' },
  { id: 'emom', name: 'EMOM 12', work: 60, rest: 0, rounds: 12, sets: 1, setRest: 0, prep: 10, cool: 0, color: 'var(--blue)', icon: 'clock' },
  { id: 'sprint', name: 'Sprints', work: 15, rest: 45, rounds: 8, sets: 1, setRest: 0, prep: 10, cool: 60, color: 'var(--green)', icon: 'figureWalk' },
  { id: 'boxing', name: 'Boxing rounds', work: 180, rest: 60, rounds: 6, sets: 1, setRest: 0, prep: 10, cool: 0, color: 'var(--purple)', icon: 'target' },
]

/** "0:20 / 0:10 × 8" — what a preset is, in numbers only (reads the same in every language). */
export const presetLine = p => clock(p.work) + (p.rest ? ' / ' + clock(p.rest) : '') + ' × ' + p.rounds

export const DEFAULT_CUSTOM = { id: 'custom', name: 'Custom', work: 45, rest: 15, rounds: 8, sets: 2, setRest: 60, prep: 10, cool: 0 }

const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)))

/** A configuration with every number inside its limits. */
export function clampCfg(cfg = {}) {
  const out = { ...DEFAULT_CUSTOM, ...cfg }
  for (const k in LIMITS) out[k] = clamp(out[k], LIMITS[k])
  return out
}

/**
 * The phases of one run: [{ kind, sec, round, set, rounds, sets }]. kind is
 * 'prep' | 'work' | 'rest' | 'setrest' | 'cool'. A rest of 0 (EMOM) is left out, and there is
 * no rest after the very last round, nor a set break after the last set.
 */
export function phases(cfgIn) {
  const c = clampCfg(cfgIn)
  const list = []
  const base = { rounds: c.rounds, sets: c.sets }
  if (c.prep > 0) list.push({ kind: 'prep', sec: c.prep, round: 0, set: 1, ...base })
  for (let s = 1; s <= c.sets; s++) {
    for (let r = 1; r <= c.rounds; r++) {
      list.push({ kind: 'work', sec: c.work, round: r, set: s, ...base })
      const lastRound = r === c.rounds
      if (!lastRound && c.rest > 0) list.push({ kind: 'rest', sec: c.rest, round: r, set: s, ...base })
    }
    if (s < c.sets && c.setRest > 0) list.push({ kind: 'setrest', sec: c.setRest, round: c.rounds, set: s, ...base })
  }
  if (c.cool > 0) list.push({ kind: 'cool', sec: c.cool, round: c.rounds, set: c.sets, ...base })
  return list
}

export const totalSec = list => list.reduce((a, p) => a + p.sec, 0)
export const workSec = list => list.filter(p => p.kind === 'work').reduce((a, p) => a + p.sec, 0)

/**
 * Where a run is after `elapsed` seconds: { i, phase, left (s, fractional), into, frac (0…1 of
 * the phase), overall (0…1), next (phase | null), done }.
 */
export function at(list, elapsed) {
  const total = totalSec(list)
  if (!list.length) return { i: -1, phase: null, left: 0, into: 0, frac: 1, overall: 1, next: null, done: true }
  if (elapsed >= total) {
    const last = list[list.length - 1]
    return { i: list.length - 1, phase: last, left: 0, into: last.sec, frac: 1, overall: 1, next: null, done: true }
  }
  let t = Math.max(0, elapsed)
  for (let i = 0; i < list.length; i++) {
    const p = list[i]
    if (t < p.sec) {
      return { i, phase: p, left: p.sec - t, into: t, frac: p.sec ? t / p.sec : 1, overall: total ? Math.max(0, elapsed) / total : 1, next: list[i + 1] || null, done: false }
    }
    t -= p.sec
  }
  return { i: list.length - 1, phase: list[list.length - 1], left: 0, into: 0, frac: 1, overall: 1, next: null, done: true }
}

/** Seconds of work actually done after `elapsed` seconds (a stopped run counts what it did). */
export function workDone(list, elapsed) {
  let t = Math.max(0, elapsed), done = 0
  for (const p of list) {
    if (t <= 0) break
    const d = Math.min(p.sec, t)
    if (p.kind === 'work') done += d
    t -= d
  }
  return done
}

/**
 * Calories for a run: MET ≈ 8 while working hard (HIIT, the compendium's "vigorous circuit"),
 * ≈ 3 during the rests. kcal = MET × kg × hours.
 */
export function kcalOf(list, elapsed, kg = 70) {
  const w = workDone(list, elapsed)
  const rest = Math.max(0, Math.min(elapsed, totalSec(list)) - w)
  return Math.round((8 * w + 3 * rest) / 3600 * (Number(kg) || 70))
}

/** "m:ss" (or "h:mm:ss") for a number of seconds. */
export function clock(sec) {
  const s = Math.max(0, Math.ceil(sec - 1e-9))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(r).padStart(2, '0')
}

/** A finished (or stopped) run for the log: { d, at, preset, name, sec, work, rounds, kcal, done }. */
export function logEntry({ cfg, list, elapsed, kg, day, now = Date.now() }) {
  const done = elapsed >= totalSec(list) - 0.5
  const st = at(list, elapsed)
  const rounds = done ? list.filter(p => p.kind === 'work').length : list.slice(0, st.i).filter(p => p.kind === 'work').length
  return {
    d: day, at: now, preset: cfg.id || 'custom', name: cfg.name || 'Custom',
    sec: Math.round(Math.min(elapsed, totalSec(list))), work: Math.round(workDone(list, elapsed)), rounds, kcal: kcalOf(list, elapsed, kg), done,
  }
}

/** Totals for the log: this week's count, minutes and calories, and the all-time count. */
export function weekTotals(log = [], weekStartISO) {
  const wk = (log || []).filter(e => e && e.d >= weekStartISO)
  return {
    runs: wk.length,
    min: Math.round(wk.reduce((a, e) => a + (e.sec || 0), 0) / 60),
    kcal: wk.reduce((a, e) => a + (e.kcal || 0), 0),
    all: (log || []).length,
  }
}
