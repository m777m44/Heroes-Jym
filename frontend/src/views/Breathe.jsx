// Guided breathing (8.0) — an orb that grows as you breathe in and shrinks as you breathe out,
// with the step in words, a soft tick at every change and an optional voice. The size is a pure
// function of the time since the start (lib/breathe.js), drawn with requestAnimationFrame, so it
// stays smooth and exact. With Reduce motion on, the orb holds still and only the words change.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { PATTERNS, patternById, phaseAt, scaleAt, cycleSec, breathsPerMin, DURATIONS, STEP_WORD } from '../lib/breathe.js'
import { tickHaptic } from '../lib/hapticFeedback.js'
import { speak } from '../lib/voice.js'
import { beep } from '../lib/sound.js'
import { useWakeLock } from '../lib/wakelock.js'
import { motionReduced } from '../lib/a11y.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, Segmented, Button, BackButton, Switch } from '../components/ui.jsx'

function Session({ p, minutes, voice, onEnd }) {
  const S = useStore(s => s.S)
  const orb = useRef(null)
  const [t0] = useState(() => performance.now())
  const [ph, setPh] = useState(() => phaseAt(p, 0))
  const [left, setLeft] = useState(minutes * 60)
  const last = useRef(-1)
  const reduced = motionReduced()
  useWakeLock(true)

  useEffect(() => {
    let raf = 0
    const total = minutes * 60
    const frame = now => {
      const sec = (now - t0) / 1000
      if (sec >= total) { onEnd(total); return }
      const cur = phaseAt(p, sec)
      if (orb.current && !reduced) orb.current.style.transform = `scale(${scaleAt(p, sec).toFixed(4)})`
      const key = cur.cycle * 10 + cur.i
      if (key !== last.current) {
        last.current = key
        setPh(cur)
        tickHaptic(cur.step === 'in')
        if (voice) speak(t(STEP_WORD[cur.step]))
        else beep(S.sound !== false, cur.step === 'in' ? 528 : cur.step === 'out' ? 396 : 440, 0.16)
      }
      setLeft(Math.ceil(total - sec))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])                                                       // eslint-disable-line react-hooks/exhaustive-deps

  const sec = Math.ceil(ph.left)
  return <div className={'br-run step-' + ph.step} style={{ '--c': p.color, '--dur': ph.sec + 's' }}>
    <div className="br-stage">
      <span className="br-halo" aria-hidden="true" />
      <div ref={orb} className="br-orb" style={reduced ? { transform: 'scale(.8)' } : null}>
        <span className="br-core" />
      </div>
      <div className="br-word" key={ph.cycle + ':' + ph.i} aria-live="polite">{t(STEP_WORD[ph.step])}</div>
    </div>
    <div className="br-count" dir="ltr">{sec > 0 ? sec : ''}</div>
    <div className="br-left">{t('{0} left', Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'))}</div>
    <Button className="br-stop" icon="stop" onClick={() => onEnd((performance.now() - t0) / 1000)}>{t('Finish')}</Button>
  </div>
}

export default function Breathe() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const B = S.breathe || {}
  const [pid, setPid] = useState(B.pattern || 'box')
  const [minutes, setMinutes] = useState(B.min || 3)
  const [voice, setVoice] = useState(B.voice === true)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(null)
  const p = patternById(pid)
  const log = Array.isArray(B.log) ? B.log : []
  const totalMin = Math.round(log.reduce((a, e) => a + (e.sec || 0), 0) / 60)
  const todayMin = Math.round(log.filter(e => e.d === todayISO()).reduce((a, e) => a + (e.sec || 0), 0) / 60)

  const start = () => {
    update(s => { s.breathe = { ...(s.breathe || {}), pattern: pid, min: minutes, voice } })
    setDone(null)
    setRunning(true)
  }
  const end = sec => {
    setRunning(false)
    const e = { d: todayISO(), at: Date.now(), p: pid, sec: Math.round(sec) }
    if (e.sec >= 15) update(s => { s.breathe = { ...(s.breathe || {}), log: [...(Array.isArray(s.breathe && s.breathe.log) ? s.breathe.log : []), e].slice(-300) } })
    setDone(e)
  }

  if (running) return <div className="narrow br-page"><Session p={p} minutes={minutes} voice={voice} onEnd={end} /></div>

  return <div className="narrow br-page">
    <div className="hdr">
      <BackButton fallback="/tools" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Breathe')}</h1><div className="sub">{t('A calm minute for body and mind')}</div></div>
    </div>

    {done && <div className="card br-done">
      <span className="br-done-ic"><Icon name="wind" /></span>
      <div><b>{t('Well done')}</b><div className="small muted">{t('{0} min of calm breathing', Math.max(1, Math.round(done.sec / 60)))}</div></div>
    </div>}

    <div className="br-pats">
      {PATTERNS.map((x, i) => <button key={x.id} className={'br-pat' + (x.id === pid ? ' on' : '')} style={{ '--c': x.color, '--i': i }} onClick={() => setPid(x.id)}>
        <span className="br-pat-orb" aria-hidden="true" />
        <b>{t(x.name)}</b>
        <small>{t(x.desc)}</small>
        <span className="br-pat-meta" dir="ltr">{x.steps.map(s => s[1]).join(' · ')}</span>
      </button>)}
    </div>

    <Section title={t('Length')} footer={t('{0} breaths a minute · one breath takes {1} s', breathsPerMin(p), cycleSec(p))}>
      <div className="br-len">
        <Segmented options={DURATIONS.map(m => ({ value: m, label: t('{0} min', m) }))} value={minutes} onChange={setMinutes} />
      </div>
    </Section>
    <Section>
      <Row icon="speaker" iconTint="var(--purple)" title={t('Voice guide')} subtitle={t('Says “breathe in”, “hold”, “breathe out”')}>
        <Switch checked={voice} onChange={setVoice} />
      </Row>
    </Section>

    <Button variant="primary" icon="play" className="it-go" onClick={start}>{t('Start')}</Button>

    {log.length > 0 && <Section title={t('Your practice')}>
      <Row icon="wind" iconTint="var(--teal)" title={t('Today')} value={t('{0} min', todayMin)} />
      <Row icon="history" iconTint="var(--indigo)" title={t('All time')} value={t('{0} min', totalMin)} subtitle={t('{0} sessions', log.length)} />
    </Section>}
  </div>
}
