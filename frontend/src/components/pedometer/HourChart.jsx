import { t, dateLocale } from '../../lib/i18n.js'

// Today's steps per hour: 24 slim bars, the current hour highlighted, the busiest hour
// labelled. Hours still to come are drawn as faint stubs so the day's shape reads at a glance.
export default function HourChart({ hours, now = new Date(), h = 96 }) {
  const cur = now.getHours()
  const max = Math.max(1, ...hours)
  const best = hours.indexOf(Math.max(...hours))
  const W = 336, top = 14, bottom = 16, ih = h - top - bottom
  const bw = W / 24
  return (
    <div className="chart hourchart">
      <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={t('Today by hour')}>
        {hours.map((n, i) => {
          const bh = n > 0 ? Math.max(3, (n / max) * ih) : (i > cur ? 2 : 3)
          const x = i * bw + bw * 0.18, w = bw * 0.64
          const fill = i === cur ? 'url(#hcg)' : n > 0 ? 'var(--acc)' : 'var(--surface-3)'
          return <g key={i}>
            <rect x={x} y={top + ih - bh} width={w} height={bh} rx={Math.min(3, w / 2)} fill={fill} opacity={i > cur ? 0.35 : n > 0 ? (i === cur ? 1 : 0.75) : 1}>
              <title>{`${String(i).padStart(2, '0')}:00 — ${n.toLocaleString(dateLocale())}`}</title>
            </rect>
            {i % 6 === 0 && <text x={x + w / 2} y={h - 3} textAnchor="middle" fontSize="9.5" fill="var(--label-3)">{String(i).padStart(2, '0')}</text>}
          </g>
        })}
        {hours[best] > 0 && <text x={best * bw + bw / 2} y={top + ih - Math.max(3, (hours[best] / max) * ih) - 3} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--label-2)">{hours[best].toLocaleString(dateLocale())}</text>}
        <defs>
          <linearGradient id="hcg" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="var(--acc)" /><stop offset="100%" stopColor="#a4f06b" /></linearGradient>
        </defs>
      </svg>
    </div>
  )
}
