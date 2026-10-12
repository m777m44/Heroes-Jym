import { useEffect, useRef, useState } from 'react'
import { useCelebration, CELEBRATION_MS } from '../../lib/celebrate.js'
import { t, dateLocale } from '../../lib/i18n.js'
import Icon from '../Icon.jsx'

// The celebration (2.5 redesign) — full screen, the same scene as the native one Android shows
// over the lock screen when the app is closed (CelebrationActivity.java): a dark backdrop lit
// by the goal's colour, expanding rings, a glowing badge, the number counting up, and confetti
// falling with gravity, drift, spin and flutter on a <canvas> (one element, 60 fps, no DOM churn).
// Eases in — no bounce. Closes itself after CELEBRATION_MS or on a tap; prefers-reduced-motion
// gets the still scene without confetti.
const KINDS = {
  goal: { c1: '#ffd60a', c2: '#ff9f0a', icon: 'trophy' },
  milestone: { c1: '#30d158', c2: '#64d2ff', icon: 'medal' },
  water: { c1: '#0a84ff', c2: '#64d2ff', icon: 'drop' },
}
const PAPER = ['#ffd60a', '#ff375f', '#64d2ff', '#30d158', '#bf5af2', '#ff9f0a', '#ffffff']
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useConfetti(ref, seed) {
  useEffect(() => {
    const cv = ref.current
    if (!cv || reduced()) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let w = 0, h = 0
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    size()
    let s = seed || 1
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const N = Math.min(170, Math.round(w * h / 3200))
    const cx = w / 2, cy = h * 0.36, m = Math.min(w, h)
    const P = Array.from({ length: N }, (_, i) => {
      const burst = i < N * 0.55
      const a = rnd() * Math.PI * 2, v = (0.35 + rnd() * 0.9) * m
      return burst
        ? { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.35 * h }
        : { x: rnd() * w, y: -rnd() * h * 0.9 - 20, vx: (rnd() - 0.5) * 60, vy: 60 + rnd() * 90 }
    }).map(p => ({ ...p, r: rnd() * 360, vr: (rnd() - 0.5) * 720, z: 5 + rnd() * 7, ph: rnd() * 6.28, c: PAPER[Math.floor(rnd() * PAPER.length)], k: Math.floor(rnd() * 5) }))
    let raf = 0, last = performance.now()
    const t0 = last
    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const tt = (now - t0) / 1000
      ctx.clearRect(0, 0, w, h)
      let alive = 0
      for (const p of P) {
        if (p.y > h + 30) continue
        alive++
        p.vy += 520 * dt * (p.vy > 260 ? 0.1 : 1)
        p.vx *= 1 - 0.9 * dt
        p.x += (p.vx + Math.sin(tt * 3 + p.ph) * 28) * dt
        p.y += p.vy * dt
        p.r += p.vr * dt
        const fl = Math.abs(Math.cos(tt * 5 + p.ph))
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r * Math.PI / 180); ctx.fillStyle = p.c
        if (p.k === 0) { ctx.beginPath(); ctx.arc(0, 0, p.z * 0.45, 0, 6.283); ctx.fill() }
        else if (p.k === 1) ctx.fillRect(-p.z * 0.25, -p.z * 1.1 * fl, p.z * 0.5, p.z * 2.2 * fl)
        else ctx.fillRect(-p.z / 2, -p.z * 0.32 * fl - 1, p.z, p.z * 0.64 * fl + 2)
        ctx.restore()
      }
      if (alive) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', size)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [ref, seed])
}

function useCountUp(target, key) {
  const [v, setV] = useState(reduced() ? target : 0)
  useEffect(() => {
    if (reduced()) { setV(target); return }
    let raf = 0
    const t0 = performance.now() + 350
    const tick = now => {
      const p = Math.max(0, Math.min(1, (now - t0) / 1400))
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, key])
  return v
}

function Scene({ cur, onClose }) {
  const cvRef = useRef(null)
  const k = KINDS[cur.kind] || KINDS.milestone
  useConfetti(cvRef, cur.key % 100000)
  const v = useCountUp(cur.steps, cur.key)
  const fmt = n => n.toLocaleString(dateLocale())
  const water = cur.kind === 'water'
  const goal = cur.kind === 'goal'
  const kicker = water ? t('Water goal reached!') : goal ? t('Daily goal reached!') : t('Milestone')
  const unit = water ? t('ml') : t('steps')
  const sub = water ? t('{0} ml today — your body thanks you.', fmt(cur.steps))
    : goal ? t('{0} steps today — well done.', fmt(cur.steps)) : t('steps — keep it up!')
  return (
    <div className={'celebrate kind-' + (cur.kind || 'milestone')} onClick={onClose} role="status" aria-live="polite"
      style={{ '--c1': k.c1, '--c2': k.c2 }}>
      <canvas ref={cvRef} className="celebrate-confetti" aria-hidden="true" />
      <div className="celebrate-stage">
        <span className="celebrate-ring r1" aria-hidden="true" />
        <span className="celebrate-ring r2" aria-hidden="true" />
        <span className="celebrate-ring r3" aria-hidden="true" />
        <span className="celebrate-glow" aria-hidden="true" />
        <span className="celebrate-badge"><Icon name={k.icon} /></span>
      </div>
      <div className="celebrate-kicker">{kicker}</div>
      <div className="celebrate-num">{fmt(v)}</div>
      <div className="celebrate-unit">{unit}</div>
      <div className="celebrate-sub">{sub}</div>
      <button className="celebrate-btn" onClick={e => { e.stopPropagation(); onClose() }}>{t('Continue')}</button>
      <div className="celebrate-hint">{t('Tap anywhere to close')}</div>
      <div className="celebrate-timer" aria-hidden="true"><span style={{ animationDuration: CELEBRATION_MS + 'ms' }} /></div>
    </div>
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
  return <Scene key={cur.key} cur={cur} onClose={hide} />
}
