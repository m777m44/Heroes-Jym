// Progress ring for today's steps. Pure SVG: one track, one arc drawn with stroke-dasharray,
// so it animates with a CSS transition and inherits the accent colour.
export default function StepRing({ value, goal, size = 200, stroke = 14, children, className = '' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = goal > 0 ? Math.min(1, value / goal) : 0
  const done = goal > 0 && value >= goal
  return (
    <div className={'stepring' + (done ? ' done' : '') + ' ' + className} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          className="arc" cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={done ? 'var(--yellow)' : 'var(--acc)'} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="stepring-in">{children}</div>
    </div>
  )
}
