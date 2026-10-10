import { DAYS } from '../../lib/format.js'
import { t, dateLocale } from '../../lib/i18n.js'

// Bars for the last days' steps, with the goal as a dashed line. Days that met the goal are
// drawn in the accent, the rest in a neutral fill; today is outlined.
export default function StepChart({ days, goal, today, h = 120 }) {
  const max = Math.max(goal || 0, ...days.map(d => d.n), 1) * 1.08
  const W = 340, top = 6, bottom = 20, ih = h - top - bottom
  const bw = W / days.length
  const y = v => top + ih - (v / max) * ih
  return (
    <div className="chart stepchart">
      <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={t('Steps, last {0} days', days.length)}>
        {days.map((d, i) => {
          const x = i * bw + bw * 0.2, w = bw * 0.6
          const bh = Math.max(d.n > 0 ? 3 : 0, (d.n / max) * ih)
          const hit = goal && d.n >= goal
          const isToday = d.d === today
          const dt = new Date(d.d + 'T12:00:00')
          return <g key={d.d}>
            <rect x={x} y={top + ih - bh} width={w} height={bh} rx={Math.min(5, w / 2)}
              fill={hit ? 'var(--acc)' : 'var(--surface-3)'} stroke={isToday ? 'var(--label-2)' : 'none'} strokeWidth={isToday ? 1.2 : 0}>
              <title>{dt.toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' })}: {d.n.toLocaleString(dateLocale())}</title>
            </rect>
            <text x={x + w / 2} y={h - 5} textAnchor="middle" fontSize="10.5" fill={isToday ? 'var(--label)' : 'var(--label-3)'}>{t(DAYS[dt.getDay()])}</text>
          </g>
        })}
        {goal > 0 && <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--yellow)" strokeWidth="1" strokeDasharray="4 4" opacity=".8" />}
      </svg>
    </div>
  )
}
