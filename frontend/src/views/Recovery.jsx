// Muscle recovery (8.0) — which muscles are ready for a hard session and which still recover,
// on the body map, from the sets of the last five days (lib/recovery.js), plus the routine of
// your plan that fits best today.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MUSCLE_NAME, loadOfRoutine } from '../lib/muscles.js'
import { recoveryOf, recoveryLevels, overallReadiness, splitReady, bestRoutine } from '../lib/recovery.js'
import { routineLabel } from '../lib/routines.js'
import { startFlow } from '../sheets.jsx'
import BodyMap from '../components/BodyMap.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Button, BackButton } from '../components/ui.jsx'

const inHours = ms => Math.max(1, Math.round((ms - Date.now()) / 3600000))

export default function Recovery() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [now] = useState(() => Date.now())
  const [sel, setSel] = useState(null)
  const rec = useMemo(() => recoveryOf(S.workouts, now), [S.workouts, now])
  const levels = recoveryLevels(rec)
  const overall = overallReadiness(rec)
  const { recovering, ready } = splitReady(rec)
  const best = bestRoutine(S.routines, rec, loadOfRoutine)
  const trainedRecently = ready.filter(m => rec[m].lastAt)
  const mood = overall >= 85 ? ['Ready to train hard', 'var(--green)', 'bolt'] : overall >= 60 ? ['Good to go — mind the tired muscles', 'var(--yellow)', 'figureStrength'] : ['Take it easier today', 'var(--orange)', 'bed']
  const R = 42, C = 2 * Math.PI * R
  const m = sel && rec[sel]

  return <div className="narrow rc-page">
    <div className="hdr">
      <BackButton fallback="/tools" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Recovery')}</h1><div className="sub">{t('Which muscles are ready again')}</div></div>
    </div>

    <div className="card rc-hero" style={{ '--c': mood[1] }}>
      <div className="rc-gauge">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="rc-g-bg" cx="50" cy="50" r={R} />
          <circle className="rc-g-fg" cx="50" cy="50" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - overall / 100)} />
        </svg>
        <div className="rc-g-in"><b>{overall}%</b><span>{t('ready')}</span></div>
      </div>
      <div className="grow">
        <div className="rc-mood"><Icon name={mood[2]} /> {t(mood[0])}</div>
        {best ? <>
          <div className="small muted" style={{ marginTop: 6 }}>{t('Best fit today')}</div>
          <div className="rc-best"><b>{routineLabel(best.routine.name)}</b><span className="tag acc">{best.score}%</span></div>
          <Button size="sm" variant="primary" icon="play" onClick={() => startFlow(best.routine.id)}>{t('Start')}</Button>
        </> : <div className="small muted" style={{ marginTop: 6 }}>{S.workouts.length ? t('Fully rested — any workout fits.') : t('Finish a workout and your recovery shows up here.')}</div>}
      </div>
    </div>

    <div className="card rc-map">
      <BodyMap levels={levels} body={S.body === 'female' ? 'female' : 'male'} className="recovery tappable" onMuscle={setSel} selected={sel} />
      <div className="rc-legend"><span className="rc-l l0" />{t('Ready')}<span className="rc-l l2" />{t('Recovering')}<span className="rc-l l4" />{t('Tired')}</div>
      {m && <div className="rc-sel">
        <b>{t(MUSCLE_NAME[sel])}</b>
        <span>{m.pct >= 95 ? t('Ready') : t('{0}% recovered · ready in about {1} h', m.pct, inHours(m.readyAt))}</span>
      </div>}
    </div>

    {recovering.length > 0 && <Section title={t('Still recovering')}>
      {recovering.map(k => <div key={k} className="lrow rc-row" onClick={() => setSel(k)}>
        <div className="grow">
          <div className="row between"><b>{t(MUSCLE_NAME[k])}</b><span className="small muted">{t('in about {0} h', inHours(rec[k].readyAt))}</span></div>
          <div className="rc-bar"><i style={{ width: rec[k].pct + '%', background: rec[k].pct < 40 ? 'var(--red)' : rec[k].pct < 75 ? 'var(--orange)' : 'var(--yellow)' }} /></div>
        </div>
      </div>)}
    </Section>}

    {trainedRecently.length > 0 && <Section title={t('Recovered')}>
      <div className="rc-chips">{trainedRecently.map(k => <span key={k} className="chip"><Icon name="checkCircle" /> {t(MUSCLE_NAME[k])}</span>)}</div>
    </Section>}

    <Section title={t('Recover faster')} footer={t('Estimated from typical recovery times and your sets — listen to your body too.')}>
      <Row icon="bed" iconTint="var(--indigo)" title={t('Sleep 7–9 hours')} subtitle={t('Most muscle repair happens during deep sleep')} accessory="chevron" onClick={() => nav('/health')} />
      <Row icon="fork" iconTint="var(--orange)" title={t('Protein with every meal')} subtitle={t('About 1.6 g per kg of body weight a day')} accessory="chevron" onClick={() => nav('/food')} />
      <Row icon="drop" iconTint="var(--blue)" title={t('Drink enough water')} accessory="chevron" onClick={() => nav('/water')} />
      <Row icon="wind" iconTint="var(--teal)" title={t('Breathe and stretch')} subtitle={t('Calms the nervous system after hard training')} accessory="chevron" onClick={() => nav('/breathe')} />
    </Section>
  </div>
}
