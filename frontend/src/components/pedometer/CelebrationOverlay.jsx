import { useEffect, useMemo } from 'react'
import { useCelebration, CELEBRATION_MS } from '../../lib/celebrate.js'
import { t, dateLocale } from '../../lib/i18n.js'

// The 5-second milestone celebration: a figure throwing its arms up and bouncing, a burst of
// confetti in the palette colours, and the count. Transform/opacity-only CSS keyframes, so it
// runs on the compositor at 60 fps; prefers-reduced-motion freezes it to a still card (the
// app-wide rule in index.css). Tap anywhere to dismiss early.
const COLORS = ['var(--acc)', 'var(--yellow)', 'var(--orange)', 'var(--pink)', 'var(--blue)', 'var(--purple)', 'var(--teal)']

function Confetti({ seed }) {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2 + (seed % 7) * 0.1
    const d = 90 + ((i * 53 + seed) % 110)
    return {
      '--dx': Math.round(Math.cos(a) * d) + 'px',
      '--dy': Math.round(Math.sin(a) * d - 40) + 'px',
      '--rot': ((i * 97) % 360) + 'deg',
      '--delay': ((i % 6) * 0.05).toFixed(2) + 's',
      background: COLORS[i % COLORS.length],
      borderRadius: i % 3 === 0 ? '50%' : '2px',
    }
  }), [seed])
  return <div className="confetti" aria-hidden="true">{bits.map((s, i) => <i key={i} style={s} />)}</div>
}

// Stroke figure in the icon set's visual language (round caps, single weight), on a 120×160
// grid. The arms are separate groups rotating about the shoulders.
function Figure() {
  return (
    <svg className="cheer-fig" viewBox="0 0 120 160" aria-hidden="true">
      <g className="cheer-body" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="60" cy="26" r="13" />
        <path d="M60 44v50" />
        <path className="cheer-leg-l" d="M60 94 44 140" />
        <path className="cheer-leg-r" d="M60 94l16 46" />
        <g className="cheer-arm-l"><path d="M60 54 30 78" /></g>
        <g className="cheer-arm-r"><path d="M60 54l30 24" /></g>
      </g>
    </svg>
  )
}

export default function CelebrationOverlay() {
  const cur = useCelebration(s => s.current)
  const hide = useCelebration(s => s.hide)
  useEffect(() => {
    if (!cur) return
    const tm = setTimeout(hide, CELEBRATION_MS)
    return () => clearTimeout(tm)
  }, [cur, hide])
  if (!cur) return null
  const goal = cur.kind === 'goal'
  const n = cur.steps.toLocaleString(dateLocale())
  return (
    <div className={'celebrate' + (goal ? ' goal' : '')} key={cur.key} onClick={hide} role="status" aria-live="polite">
      <div className="celebrate-card">
        <div className="celebrate-stage">
          <span className="celebrate-ring" aria-hidden="true" />
          <Confetti seed={cur.key % 1000} />
          <Figure />
        </div>
        <div className="celebrate-kicker">{goal ? t('Daily goal reached!') : t('Milestone')}</div>
        <div className="celebrate-num">{n}</div>
        <div className="celebrate-sub">{goal ? t('{0} steps today — well done.', n) : t('steps — keep it up!')}</div>
        <div className="celebrate-timer" aria-hidden="true"><span style={{ animationDuration: CELEBRATION_MS + 'ms' }} /></div>
      </div>
    </div>
  )
}
