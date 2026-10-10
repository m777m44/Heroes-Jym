import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { usePedometer } from '../store/usePedometer.js'
import { t, useLang, LANGS } from '../lib/i18n.js'
import {
  consentGiven, saveConsent, platform, deviceInfo, requestRuntime, requestBattery, openAutostart, ok,
} from '../lib/permissions.js'
import Icon from './Icon.jsx'
import { Button, Segmented } from './ui.jsx'

const APK = 'https://github.com/m777m44/Heroes-Jym/releases/latest/download/MAHDI-JYM.apk'
const SNOOZE = 'mj_consent_snooze'

// A centred dialog on first launch: what the app needs and why, the user's responsibility,
// one "Agree" — then every permission is asked in turn and the background counter switched on.
export default function PermissionGate() {
  useLang()
  const S = useStore(s => s.S)
  const { update } = useStore()
  const [open, setOpen] = useState(() => !consentGiven() && !sessionStorage.getItem(SNOOZE))
  const [plat, setPlat] = useState('web')
  const [phase, setPhase] = useState('ask')          // ask | run | autostart | done
  const [st, setSt] = useState({})                   // step → 'wait' | 'ok' | 'fail' | 'skip'
  const [dev, setDev] = useState({ autostart: false })
  const cancelled = useRef(false)

  useEffect(() => { platform().then(setPlat) }, [])
  useEffect(() => () => { cancelled.current = true }, [])
  if (!open) return null

  const android = plat === 'android'
  const mark = (k, v) => setSt(s => ({ ...s, [k]: v }))
  const setLang = l => update(s => { s.lang = l })
  // Arabic / English, plus the phone's own language when it's another one (each in its own script).
  const cur = S.lang || 'en'
  const langOpts = [...new Set(['ar', 'en', cur])].map(l => ({ value: l, label: LANGS[l] || l }))

  const agree = async () => {
    setPhase('run')
    saveConsent()
    // 1. system prompts
    mark('perm', 'wait')
    const r = await requestRuntime(plat)
    mark('perm', ok(r.activity) || r.activity === 'unsupported' ? 'ok' : 'fail')
    mark('notif', ok(r.notifications) ? 'ok' : r.notifications === 'unsupported' ? 'skip' : 'fail')
    // 2. switch the counter on
    mark('count', 'wait')
    let started = false
    if (ok(r.activity) || (!android && r.activity !== 'denied')) {
      try { started = await usePedometer.getState().start({ interactive: true }) } catch { started = false }
    }
    mark('count', started ? 'ok' : 'fail')
    if (!android) { setPhase('done'); return }
    // 3. battery exemption → keeps running without stopping
    mark('battery', 'wait')
    const b = await requestBattery({ isCancelled: () => cancelled.current })
    mark('battery', b ? 'ok' : 'fail')
    mark('boot', started ? 'ok' : 'fail')
    // 4. the maker's own autostart switch
    const d = await deviceInfo()
    setDev(d)
    setPhase(d.autostart ? 'autostart' : 'done')
  }

  const close = () => setOpen(false)
  const later = () => { sessionStorage.setItem(SNOOZE, '1'); close() }

  const Item = ({ k, icon, tint, title, sub }) => {
    const v = st[k]
    return <div className="pg-item">
      <span className="pg-ic" style={{ '--tint': tint }}><Icon name={icon} /></span>
      <div className="pg-t"><b>{title}</b>{sub && <span>{sub}</span>}</div>
      {v && <span className={'pg-st ' + v}>{v === 'wait' ? <span className="pg-spin" /> : v === 'ok' ? '✓' : v === 'skip' ? '–' : '!'}</span>}
    </div>
  }

  const items = <div className="pg-list">
    <Item k="perm" icon="figureWalk" tint="var(--green)" title={t('Physical activity')} sub={t('Counts every step you take.')} />
    <Item k="notif" icon="bell" tint="var(--red)" title={t('Notifications')} sub={t('Live step counter on the lock screen, alerts every 1,000 steps.')} />
    {android && <Item k="battery" icon="battery" tint="var(--yellow)" title={t('Run in the background')} sub={t('Keeps counting with the app closed and the screen off — no stopping.')} />}
    {android && <Item k="boot" icon="bolt" tint="var(--orange)" title={t('Start after restart')} sub={t('Switches itself back on when the phone is turned off and on again.')} />}
    <Item k="count" icon="target" tint="var(--blue)" title={t('Step counter on')} sub={android ? t('Starts counting right away.') : t('Counts while this page is open.')} />
  </div>

  return <div className="pg-back" role="dialog" aria-modal="true" aria-labelledby="pg-title">
    <div className="pg-card">
      {phase === 'ask' && <>
        <Segmented className="pg-lang" options={langOpts} value={cur} onChange={setLang} />
        <div className="pg-logo"><Icon name="dumbbell" /></div>
        <h2 id="pg-title">{t('Welcome to MAHDI-JYM')}</h2>
        <p className="pg-lead">{android
          ? t('To count your steps all day — in the background, with the screen locked and after a restart — MAHDI-JYM needs a few permissions.')
          : t('To count your steps and notify you, MAHDI-JYM needs a few permissions.')}</p>
        {items}
        <div className="pg-legal">
          <Icon name="info" />
          <span>{t('By tapping Agree you use MAHDI-JYM at your own responsibility. It is not a medical device: steps, distance, calories and speed are estimates. Check with a doctor before starting a training program. Your data stays on your device.')}</span>
        </div>
        <Button variant="primary" className="pg-go" onClick={agree}>{t('Agree & allow')}</Button>
        <button className="pg-later" onClick={later}>{t('Not now')}</button>
      </>}

      {phase === 'run' && <>
        <h2 id="pg-title">{t('Setting up…')}</h2>
        <p className="pg-lead">{t('Answer “Allow” on each screen that appears.')}</p>
        {items}
      </>}

      {phase === 'autostart' && <>
        <h2 id="pg-title">{t('One more step')}</h2>
        {items}
        <p className="pg-lead">{t('{0} phones also stop apps in the background unless you allow them. Turn on Autostart (or “No restrictions”) for MAHDI-JYM.', dev.manufacturer || 'Android')}</p>
        <Button variant="primary" className="pg-go" icon="gear" onClick={async () => { await openAutostart(); setPhase('done') }}>{t('Open settings')}</Button>
        <button className="pg-later" onClick={() => setPhase('done')}>{t('Skip')}</button>
      </>}

      {phase === 'done' && <>
        <div className="pg-logo ok"><Icon name="check" /></div>
        <h2 id="pg-title">{t('All set')}</h2>
        {items}
        <p className="pg-lead">{android
          ? t('MAHDI-JYM now counts your steps in the background, also with the screen off and after a restart. You can change this any time under Walking.')
          : t('Browsers can only count while the page is open. For counting in the background, with the screen off and after a restart, install the Android app.')}</p>
        {!android && <a className="btn pg-apk" href={APK} target="_blank" rel="noopener"><Icon name="download" /><span>{t('Download the Android app')}</span></a>}
        <Button variant="primary" className="pg-go" onClick={close}>{t('Start')}</Button>
      </>}
    </div>
  </div>
}
