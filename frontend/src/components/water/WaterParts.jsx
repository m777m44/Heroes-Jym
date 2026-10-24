import { useId } from 'react'
import { create } from 'zustand'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { todayISO } from '../../lib/format.js'
import { t, dateLocale } from '../../lib/i18n.js'
import { walkPrefs } from '../../lib/stepMetrics.js'
import { celebrate, playCheer } from '../../lib/celebrate.js'
import { goalHaptic } from '../../lib/hapticFeedback.js'
import { CONTAINER_NAME, addMl, mlOn, waterGoalMlOf } from '../../lib/water.js'
import { burst, lastTap } from '../../lib/motion.js'

export const fmtMl = n => Math.round(n).toLocaleString(dateLocale())

// Container icons in the icon set's language (24×24, round strokes, currentColor), with the
// drink inside drawn as a soft fill so they read at a glance: glass (كلاص), cup (كوب),
// can (علبة), bottle (قنينة).
const SHAPES = {
  glass: { out: 'M6.5 4h11l-1.4 15.1a2 2 0 0 1-2 1.9H9.9a2 2 0 0 1-2-1.9z', fill: 'M7.6 10h8.8l-.9 9a1 1 0 0 1-1 .9H9.5a1 1 0 0 1-1-.9z' },
  cup: { out: 'M4.5 7.5h11v7.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z', extra: 'M15.5 9.5h1.6a2.4 2.4 0 0 1 0 4.8h-1.6M8 2.5c-.6.8-.6 1.7 0 2.5M11.5 2.5c-.6.8-.6 1.7 0 2.5', fill: 'M5.6 11h8.8v4a3.9 3.9 0 0 1-3.9 3.9h-1A3.9 3.9 0 0 1 5.6 15z' },
  can: { out: 'M7 5.5c0-.8.7-1.5 1.5-1.5h7c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5z', extra: 'M7 7.5h10M7 16.5h10M10.5 2.5h3', fill: 'M8 9h8v6.5H8z' },
  bottle: { out: 'M10 2.5h4v2.3l1.5 2.2c.3.5.5 1 .5 1.6V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8.6c0-.6.2-1.1.5-1.6L10 4.8z', extra: 'M8 11.5h8', fill: 'M9 13h6v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z' },
}

export function ContainerIcon({ kind, className = '' }) {
  const s = SHAPES[kind] || SHAPES.cup
  return (
    <svg className={'cicon ' + className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={s.fill} fill="currentColor" stroke="none" opacity=".28" />
      <path d={s.out} />
      {s.extra && <path d={s.extra} />}
    </svg>
  )
}

/**
 * A glass that fills to `pct` with a slowly moving wave surface. Over the goal the water turns
 * teal. Only the wave drifts sideways (linear, no bounce); the level eases to its new height.
 */
export function Vessel({ pct, size = 96, label }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const p = Math.max(0, Math.min(1, pct))
  const top = 10 + (1 - p) * 104            // water surface y inside the 0–120 box
  const over = pct >= 1
  return (
    <svg className={'vessel' + (over ? ' over' : '')} viewBox="0 0 100 124" width={size} height={size * 1.24} role="img" aria-label={label}>
      <defs>
        <clipPath id={'vc' + id}><path d="M14 8h72l-8.5 104a8 8 0 0 1-8 7.4H30.5a8 8 0 0 1-8-7.4z" /></clipPath>
        <linearGradient id={'vg' + id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={over ? 'var(--teal)' : '#64d2ff'} />
          <stop offset="1" stopColor={over ? 'color-mix(in srgb,var(--teal) 70%,var(--blue))' : 'var(--blue)'} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#vc${id})`}>
        <rect x="0" y="0" width="100" height="124" fill="var(--surface-2)" />
        <g className="vessel-level" style={{ transform: `translateY(${top}px)` }}>
          <path className="vessel-wave back" d="M-100 6 q12.5 -7 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V140 H-100z" fill={`url(#vg${id})`} opacity=".45" />
          <path className="vessel-wave" d="M-100 6 q12.5 -6 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V140 H-100z" fill={`url(#vg${id})`} />
        </g>
        {[30, 60, 90].map(y => <path key={y} d={`M72 ${y}h8`} stroke="var(--label-4)" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />)}
      </g>
      <path d="M14 8h72l-8.5 104a8 8 0 0 1-8 7.4H30.5a8 8 0 0 1-8-7.4z" fill="none" stroke="var(--label-3)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M24 18l6 86" stroke="#fff" strokeOpacity=".22" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/** Add (or with a negative amount, remove) water today; celebrates crossing the goal. */
export function logWater(delta) {
  const st = useStore.getState()
  const iso = todayISO()
  const before = mlOn(st.S, iso)
  const goal = waterGoalMlOf(st.S)
  st.update(s => addMl(s, iso, delta), 'lazy')
  const after = mlOn(useStore.getState().S, iso)
  if (delta > 0 && before < goal && after >= goal) {
    const S = useStore.getState().S
    if (walkPrefs(S).celebrate !== false) { celebrate(after, 'water'); playCheer(S.sound !== false, 'water') }
    if (walkPrefs(S).haptics !== false) goalHaptic()
  }
  return after
}

// The drinks logged in this session, newest last — what "Undo" takes back.
export const useWaterUndo = create(() => ({ stack: [] }))

/** One container: logs it, confirms with a toast, remembers it for Undo. */
export function drink(c) {
  logWater(c.ml)
  burst(lastTap(), { count: 12, spread: 60, colors: ['#64D2FF', '#0A84FF', '#5AC8FA', '#BFEFFF'] })
  const day = todayISO()
  useWaterUndo.setState(s => ({ stack: [...s.stack.filter(x => x.day === day), { ml: c.ml, day }].slice(-20) }))
  useUI.getState().toast('💧 +' + fmtMl(c.ml) + ' ' + t('ml') + ' · ' + t(CONTAINER_NAME[c.key]))
}

const MAX_ONE = 3000
/** 11.0: any amount (the custom sheet) — logged, confirmed and undoable like a container; negative takes some back. */
export function drinkMl(ml) {
  let v = Math.max(-MAX_ONE, Math.min(MAX_ONE, Math.round(+ml || 0)))
  if (v < 0) v = Math.max(v, -mlOn(useStore.getState().S, todayISO()))   // never take back more than is there (Undo stays exact)
  if (!v) return
  logWater(v)
  if (v > 0) burst(lastTap(), { count: 12, spread: 60, colors: ['#64D2FF', '#0A84FF', '#5AC8FA', '#BFEFFF'] })
  const day = todayISO()
  useWaterUndo.setState(s => ({ stack: [...s.stack.filter(x => x.day === day), { ml: v, day }].slice(-20) }))
  useUI.getState().toast('💧 ' + (v > 0 ? '+' : '−') + fmtMl(Math.abs(v)) + ' ' + t('ml'))
}

export function undoLast() {
  const { stack } = useWaterUndo.getState()
  const last = stack[stack.length - 1]
  if (!last) return
  useWaterUndo.setState({ stack: stack.slice(0, -1) })
  if (last.day === todayISO()) logWater(-last.ml)
}
