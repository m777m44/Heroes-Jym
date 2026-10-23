import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { useStore } from '../../store/useStore.js'
import { t, dateLocale } from '../../lib/i18n.js'
import { beep } from '../../lib/sound.js'
import { tickHaptic } from '../../lib/hapticFeedback.js'
import { COUNTDOWN, COUNT_STEP_MS } from '../../lib/workoutTimer.js'

// 7.2 — every workout starts with a full-screen 3 · 2 · 1 · GO. Each number lands with a soft
// tick (sound + a light tap), GO with a brighter tone and one firm knock, and the workout clock
// starts exactly on GO. A tap anywhere skips it.

export const useCountdown = create(set => ({
  run: null,             // { key, label, onGo }
  start: (label, onGo) => set({ run: { key: Date.now(), label, onGo } }),
  stop: () => set({ run: null }),
}))

/** Show the countdown; `onGo` runs on GO (or when it is skipped). */
export const startCountdown = (label, onGo) => useCountdown.getState().start(label, onGo)

/** How long the whole countdown lasts — the clock is pre-dated by this much so it reads 0:00 on GO. */
export const COUNTDOWN_MS = COUNTDOWN.length * COUNT_STEP_MS

function Run({ run, stop }) {
  const [i, setI] = useState(0)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    try { run.onGo && run.onGo() } catch { /* the workout still runs */ }
    stop()
  }
  useEffect(() => {
    const sound = !!useStore.getState().S.sound
    const n = COUNTDOWN[i]
    if (n > 0) { beep(sound, 740, 0.11); tickHaptic(false) } else { beep(sound, 1175, 0.12); beep(sound, 1480, 0.3, 0.1); tickHaptic(true) }
    const tm = setTimeout(() => (i + 1 < COUNTDOWN.length ? setI(i + 1) : finish()), COUNT_STEP_MS)
    return () => clearTimeout(tm)
  }, [i])
  const n = COUNTDOWN[i]
  const go = n === 0
  return (
    <div className={'cdown' + (go ? ' go' : '')} onClick={finish} role="timer" aria-live="assertive">
      <div className="cdown-kicker">{go ? t('Workout started') : t('Get ready')}</div>
      {run.label && <div className="cdown-label">{run.label}</div>}
      <div className="cdown-stage">
        <svg viewBox="0 0 120 120" className="cdown-ring" aria-hidden="true">
          <circle cx="60" cy="60" r="54" className="cdown-track" />
          <circle key={i} cx="60" cy="60" r="54" className="cdown-arc" style={{ animationDuration: COUNT_STEP_MS + 'ms' }} />
        </svg>
        <span key={'n' + i} className="cdown-num">{go ? t('GO!') : n.toLocaleString(dateLocale())}</span>
      </div>
      <div className="cdown-dots" aria-hidden="true">{COUNTDOWN.map((_, k) => <i key={k} className={k <= i ? 'on' : ''} />)}</div>
      <div className="cdown-hint">{t('Tap to skip')}</div>
    </div>
  )
}

export default function StartCountdown() {
  const run = useCountdown(s => s.run)
  const stop = useCountdown(s => s.stop)
  if (!run) return null
  return <Run key={run.key} run={run} stop={stop} />
}
