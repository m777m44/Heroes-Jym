import { useId } from 'react'

// Progress ring for today's steps. Pure SVG: a track, a gradient arc drawn with
// stroke-dasharray (so it animates with a CSS transition), a soft glow, a tick for every
// 1,000 steps of the goal and a bright dot riding the end of the arc. `live` adds a breathing
// pulse while steps are coming in. Turns gold once the goal is reached.
export default function StepRing({ value, goal, size = 200, stroke = 14, children, className = '', live = false, ticks = true }) {
  const uid = useId().replace(/:/g, '')
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = goal > 0 ? Math.min(1, value / goal) : 0
  const done = goal > 0 && value >= goal
  const cx = size / 2
  const ang = p * 2 * Math.PI - Math.PI / 2
  const dot = { x: cx + r * Math.cos(ang), y: cx + r * Math.sin(ang) }
  const nTicks = ticks && goal > 0 ? Math.min(40, Math.floor(goal / 1000)) : 0
  const tickEls = []
  for (let i = 1; i < nTicks; i++) {
    const a = (i * 1000 / goal) * 2 * Math.PI - Math.PI / 2
    const r1 = r - stroke / 2 - 3, r2 = r - stroke / 2 - (i % 5 === 0 ? 9 : 6)
    tickEls.push(<line key={i} x1={cx + r1 * Math.cos(a)} y1={cx + r1 * Math.sin(a)} x2={cx + r2 * Math.cos(a)} y2={cx + r2 * Math.sin(a)}
      stroke={i * 1000 <= value ? 'var(--acc)' : 'var(--surface-3)'} strokeWidth={i % 5 === 0 ? 2 : 1.3} strokeLinecap="round" />)
  }
  const g1 = done ? '#ffd60a' : 'var(--acc)'
  const g2 = done ? '#ff9f0a' : '#a4f06b'
  return (
    <div className={'stepring' + (done ? ' done' : '') + (live ? ' live' : '') + ' ' + className} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={'sg' + uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={g1} />
            <stop offset="100%" stopColor={g2} />
          </linearGradient>
          {size >= 120 && <filter id={'sf' + uid} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={stroke * 0.45} />
          </filter>}
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        {tickEls}
        {size >= 120 && p > 0 && <circle className="arc glow" cx={cx} cy={cx} r={r} fill="none" stroke={`url(#sg${uid})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${cx} ${cx})`} filter={`url(#sf${uid})`} opacity=".45" />}
        <circle
          className="arc" cx={cx} cy={cx} r={r} fill="none"
          stroke={`url(#sg${uid})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        {size >= 120 && p > 0.01 && p < 1 && <circle className="ring-dot" cx={dot.x} cy={dot.y} r={stroke * 0.32} fill="#fff" />}
      </svg>
      <div className="stepring-in">{children}</div>
    </div>
  )
}
