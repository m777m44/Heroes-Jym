// Interval timer (8.0) — Tabata, HIIT, EMOM, sprints, boxing rounds or your own.
//
// The run is a list of phases (lib/intervals.js) walked by elapsed time since the start, so it
// stays exact when the screen locks or the app is in the background. Each phase change beeps,
// buzzes and (with the voice switched on) says what comes next; the last three seconds of every
// phase count down. The screen stays on while it runs. Finished runs are logged (S.intervals).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { todayISO, weekStartOf, startOfWeek, isoOf } from '../lib/format.js'
import { PRESETS, DEFAULT_CUSTOM, LIMITS, phases, totalSec, workSec, at, clock, logEntry, weekTotals, clampCfg, presetLine } from '../lib/intervals.js'
import { beep, vibrate } from '../lib/sound.js'
import { speak } from '../lib/voice.js'
import { tickHaptic, workoutHaptic } from '../lib/hapticFeedback.js'
import { useWakeLock } from '../lib/wakelock.js'
import { celebrate } from '../lib/celebrate.js'
import { lastBW } from '../lib/history.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Button, BackButton } from '../components/ui.jsx'

const KIND = {
  prep: { label: 'Get ready', color: 'var(--yellow)' },
  work: { label: 'Work', color: 'var(--red)' },
  rest: { label: 'Rest', color: 'var(--green)' },
  setrest: { label: 'Set break', color: 'var(--blue)' },
  cool: { label: 'Cool down', color: 'var(--teal)' },
}
const ui = () => useUI.getState()

function Ring({ frac, color, children, size = 280 }) {
  const r = 46, c = 2 * Math.PI * r
  return <div className="it-ring" style={{ width: size, height: size, '--ring': color }}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle className="it-ring-bg" cx="50" cy="50" r={r} />
      <circle className="it-ring-fg" cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * frac} />
    </svg>
    <div className="it-ring-in">{children}</div>
  </div>
}

/** − value + with limits; the value reads as m:ss for seconds. */
export function NumStep({ value, step = 1, min = 0, max = 999, onChange, fmt = String }) {
  const go = d => onChange(Math.max(min, Math.min(max, (Number(value) || 0) + d)))
  return <div className="stp it-stp">
    <button onClick={() => go(-step)} disabled={value <= min} aria-label={t('Decrease')}><Icon name="minus" /></button>
    <span className="val" dir="ltr">{fmt(value)}</span>
    <button onClick={() => go(step)} disabled={value >= max} aria-label={t('Increase')}><Icon name="plus" /></button>
  </div>
}

function Setup({ cfg, setCfg, onStart, log }) {
  const S = useStore(s => s.S)
  const list = useMemo(() => phases(cfg), [cfg])
  const custom = cfg.id === 'custom'
  const wk = weekTotals(log, isoOf(startOfWeek(new Date(), weekStartOf(S))))
  const set = (k, v) => setCfg(c => clampCfg({ ...c, id: 'custom', name: 'Custom', [k]: v }))
  const fields = [
    ['work', 'Work', 5, 's'], ['rest', 'Rest', 5, 's'], ['rounds', 'Rounds', 1, ''], ['sets', 'Sets', 1, ''],
    ['setRest', 'Break between sets', 15, 's'], ['prep', 'Get ready', 5, 's'], ['cool', 'Cool down', 30, 's'],
  ]
  return <>
    <div className="it-presets" role="list">
      {PRESETS.map((p, i) => <button key={p.id} role="listitem" className={'it-preset' + (cfg.id === p.id ? ' on' : '')} style={{ '--c': p.color, '--i': i }}
        onClick={() => setCfg(clampCfg(p))}>
        <span className="it-preset-ic"><Icon name={p.icon} /></span>
        <b>{t(p.name)}</b><small dir="ltr">{presetLine(p)}</small>
      </button>)}
      <button role="listitem" className={'it-preset' + (custom ? ' on' : '')} style={{ '--c': 'var(--acc)', '--i': PRESETS.length }}
        onClick={() => setCfg(c => clampCfg({ ...DEFAULT_CUSTOM, ...(c.id === 'custom' ? c : {}) }))}>
        <span className="it-preset-ic"><Icon name="pencil" /></span>
        <b>{t('Custom')}</b><small>{t('Your own')}</small>
      </button>
    </div>

    <div className="card it-sum">
      <div><span className="lbl2">{t('Total')}</span><b dir="ltr">{clock(totalSec(list))}</b></div>
      <div><span className="lbl2">{t('Work')}</span><b dir="ltr">{clock(workSec(list))}</b></div>
      <div><span className="lbl2">{t('Rounds')}</span><b>{cfg.rounds * cfg.sets}</b></div>
    </div>

    <Section title={custom ? t('Your timer') : t('Adjust')} footer={t('Changing a number turns the timer into your own.')}>
      {fields.map(([k, label, step, unit]) => <Row key={k} title={t(label)}>
        <NumStep value={cfg[k]} step={step} min={LIMITS[k][0]} max={LIMITS[k][1]} onChange={v => set(k, v)} fmt={v => unit ? clock(v) : String(v)} />
      </Row>)}
    </Section>

    <Button variant="primary" icon="play" className="it-go" onClick={onStart}>{t('Start')}</Button>

    {log.length > 0 && <Section title={t('This week')}>
      <Row icon="timer" iconTint="var(--red)" title={t('{0} timers', wk.runs)} subtitle={t('{0} min · {1} kcal', wk.min, wk.kcal)} />
      {log.slice(-3).reverse().map((e, i) => <Row key={i} icon={e.done ? 'checkCircle' : 'stop'} iconTint={e.done ? 'var(--green)' : 'var(--grey)'}
        title={t(e.name)} subtitle={e.d + ' · ' + clock(e.sec) + ' · ' + t('{0} kcal', e.kcal)} />)}
    </Section>}
  </>
}

function Run({ cfg, onDone, onStop }) {
  const S = useStore(s => s.S)
  const list = useMemo(() => phases(cfg), [cfg])
  const [startAt] = useState(() => Date.now())
  const [paused, setPaused] = useState(null)        // ms when paused
  const [pausedTotal, setPausedTotal] = useState(0)
  const [skip, setSkip] = useState(0)               // seconds skipped ahead
  const [now, setNow] = useState(Date.now())
  const lastI = useRef(-1)
  const lastBeep = useRef(null)
  const half = useRef(false)
  useWakeLock(true)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [])
  const elapsed = ((paused || now) - startAt - pausedTotal) / 1000 + skip
  const st = at(list, elapsed)
  const k = st.phase ? KIND[st.phase.kind] : KIND.work

  // cues: a phase change, the last 3 seconds, halfway
  useEffect(() => {
    if (paused) return
    const sound = S.sound !== false, voice = S.voiceCount !== false
    if (st.done) { onDone(elapsed); return }
    if (st.i !== lastI.current) {
      const first = lastI.current === -1
      lastI.current = st.i
      const p = st.phase
      if (p.kind === 'work') { beep(sound, 1046, 0.32); tickHaptic(true) } else { beep(sound, 660, 0.28); tickHaptic(false) }
      if (voice) {
        const lastRound = p.kind === 'work' && p.round === p.rounds && p.set === p.sets
        speak(lastRound ? t('Last round!') : p.kind === 'work' ? t('Work') : p.kind === 'rest' ? t('Rest') : p.kind === 'setrest' ? t('Set break') : p.kind === 'cool' ? t('Cool down') : first ? t('Get ready') : t(KIND[p.kind].label))
      }
    }
    const sec = Math.ceil(st.left)
    if (sec <= 3 && sec >= 1 && lastBeep.current !== st.i + ':' + sec) {
      lastBeep.current = st.i + ':' + sec
      beep(sound, 880, 0.12)
      vibrate(25)
    }
    if (!half.current && st.overall >= 0.5 && totalSec(list) >= 120) {
      half.current = true
      if (voice) setTimeout(() => speak(t('Halfway — keep going!')), 900)
    }
  })

  const pause = () => { if (paused) { setPausedTotal(x => x + (Date.now() - paused)); setPaused(null) } else setPaused(Date.now()) }
  const skipPhase = () => setSkip(x => x + st.left + 0.01)
  const stop = () => confirmSheet({ title: t('Stop the timer?'), message: t('What you did so far is saved.'), confirmText: t('Stop'), danger: true, onConfirm: () => onStop(elapsed) })
  const p = st.phase || {}
  return <div className={'it-run kind-' + (p.kind || 'work') + (paused ? ' paused' : '')} style={{ '--k': k.color }}>
    <div className="it-top">
      <div className="it-name">{t(cfg.name)}</div>
      <div className="it-total" dir="ltr">{clock(Math.max(0, totalSec(list) - elapsed))}</div>
    </div>
    <div className="it-bar"><i style={{ width: (st.overall * 100).toFixed(2) + '%' }} /></div>
    <Ring frac={st.frac} color={k.color}>
      <div className="it-kind" key={st.i}>{t(k.label)}</div>
      <div className="it-left" dir="ltr">{clock(st.left)}</div>
      {p.kind !== 'prep' && <div className="it-round">{t('Round {0} of {1}', p.round, p.rounds)}{p.sets > 1 ? ' · ' + t('Set {0} of {1}', p.set, p.sets) : ''}</div>}
    </Ring>
    <div className="it-next">{st.next ? <>{t('Next')}: <b style={{ color: KIND[st.next.kind].color }}>{t(KIND[st.next.kind].label)}</b> <span dir="ltr">{clock(st.next.sec)}</span></> : t('Last one — finish strong!')}</div>
    <div className="it-ctrl">
      <button className="it-btn" onClick={stop} aria-label={t('Stop')}><Icon name="stop" /></button>
      <button className="it-btn big" onClick={pause} aria-label={paused ? t('Resume') : t('Pause')}><Icon name={paused ? 'play' : 'pause'} /></button>
      <button className="it-btn" onClick={skipPhase} aria-label={t('Skip')}><Icon name="chevronRight" /></button>
    </div>
    {paused && <div className="it-paused">{t('Paused')}</div>}
  </div>
}

export default function Timer() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [cfg, setCfg] = useState(() => clampCfg(S.timerLast || PRESETS[0]))
  const [mode, setMode] = useState('setup')        // setup | run | done
  const [result, setResult] = useState(null)
  const log = Array.isArray(S.intervals) ? S.intervals : []

  const finish = (elapsed, stopped = false) => {
    const list = phases(cfg)
    const kg = (lastBW(S) && lastBW(S).w) || 70
    const e = logEntry({ cfg, list, elapsed, kg: S.unit === 'lb' ? kg * 0.4536 : kg, day: todayISO() })
    if (e.sec >= 20) update(s => { s.intervals = [...(Array.isArray(s.intervals) ? s.intervals : []), e].slice(-300) })
    setResult(e)
    setMode('done')
    if (e.done && !stopped) { workoutHaptic(); celebrate(Math.max(1, Math.round(e.sec / 60)), 'hiit') }
  }
  const start = () => {
    update(s => { s.timerLast = cfg })
    setMode('run')
  }

  if (mode === 'run') return <div className="narrow it-page"><Run cfg={cfg} onDone={e => finish(e)} onStop={e => finish(e, true)} /></div>

  return <div className="narrow it-page">
    <div className="hdr">
      <BackButton fallback="/tools" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Interval timer')}</h1><div className="sub">{t('Tabata, HIIT, EMOM and your own')}</div></div>
    </div>
    {mode === 'done' && result && <div className="card it-done">
      <span className="it-done-ic" style={{ background: result.done ? 'var(--green)' : 'var(--grey)' }}><Icon name={result.done ? 'trophy' : 'stop'} /></span>
      <h2>{result.done ? t('Timer complete!') : t('Stopped')}</h2>
      <div className="it-sum">
        <div><span className="lbl2">{t('Time')}</span><b dir="ltr">{clock(result.sec)}</b></div>
        <div><span className="lbl2">{t('Work')}</span><b dir="ltr">{clock(result.work)}</b></div>
        <div><span className="lbl2">{t('Rounds')}</span><b>{result.rounds}</b></div>
        <div><span className="lbl2">{t('kcal')}</span><b>{result.kcal}</b></div>
      </div>
      <Button variant="primary" icon="reset" onClick={() => setMode('run')}>{t('Again')}</Button>
      <div style={{ height: 8 }} />
      <Button onClick={() => setMode('setup')}>{t('Done')}</Button>
    </div>}
    {mode === 'setup' && <Setup cfg={cfg} setCfg={setCfg} onStart={start} log={log} />}
  </div>
}
