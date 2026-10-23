import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t, dateLocale } from '../../lib/i18n.js'
import { modeOf } from '../../lib/history.js'
import { fmtClock, sessionMs, sessionKcalFor, setsProgress } from '../../lib/workoutTimer.js'
import { motionReduced } from '../../lib/a11y.js'
import Icon from '../Icon.jsx'

// 7.2 — the live workout clock: a big ticking time, a ring that fills with the sets you tick,
// and the calories the session has burned so far (MET × your weight × time). It owns its own
// one-second tick so the workout screen around it does not re-render every second.

export const isCardioEntry = e => modeOf({ ...((e && e.target) || {}), id: e && e.id }) === 'cardio'

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(iv) }, [ms])
  return now
}

export default function WorkoutClock({ A }) {
  const S = useStore(s => s.S)
  const now = useNow()
  const ms = sessionMs(A, now)
  const waiting = A.start > now                       // the start countdown is still running
  const kcal = sessionKcalFor(S, A, { now, isCardio: isCardioEntry })
  const { done, total, pct } = setsProgress(A)
  const R = 26, C = 2 * Math.PI * R
  const n = v => v.toLocaleString(dateLocale())
  return (
    <div className={'wclock' + (waiting ? ' wait' : '')} role="timer" aria-label={t('Workout time')}>
      <div className="wclock-ring" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={R} className="wclock-track" />
          <circle cx="32" cy="32" r={R} className="wclock-arc" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
        </svg>
        <span className="wclock-ring-v">{Math.round(pct * 100).toLocaleString(dateLocale())}<small>%</small></span>
      </div>
      <div className="wclock-main">
        <div className="wclock-live"><i />{waiting ? t('Get ready') : t('Live')}</div>
        <div className="wclock-t">{fmtClock(ms)}</div>
      </div>
      <div className="wclock-stats">
        <div className="wclock-st kc"><Icon name="flame" /><b>{n(kcal)}</b><span>{t('kcal')}</span></div>
        <div className="wclock-st st"><Icon name="checkCircle" /><b>{n(done)}/{n(total)}</b><span>{t('Sets')}</span></div>
      </div>
    </div>
  )
}

/** A number that counts up from 0 once (eased); respects Reduce motion. */
export function CountUp({ to, ms = 900, fmt = v => Math.round(v).toLocaleString(dateLocale()) }) {
  const [v, setV] = useState(() => (motionReduced() ? to : 0))
  const raf = useRef(0)
  useEffect(() => {
    if (motionReduced() || !(to > 0)) { setV(to || 0); return }
    const t0 = performance.now()
    const step = now => {
      const k = Math.min(1, (now - t0) / ms)
      setV(to * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [to, ms])
  return <>{fmt(v)}</>
}
