// 4.0 — Settings → Security: lock the app with the phone's fingerprint / face / PIN.
import { useEffect, useState } from 'react'
import { lockPrefs, setLockPrefs, onLockChange, lockAvailable, authenticate, LOCK_AFTER } from '../lib/appLock.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { Section, Row, Switch, Segmented } from './ui.jsx'

const AFTER_LABEL = { 0: 'Right away', 60: '1 min', 300: '5 min', 900: '15 min' }

export default function SecuritySection() {
  const [p, setP] = useState(lockPrefs)
  const [av, setAv] = useState(null)
  useEffect(() => onLockChange(setP), [])
  useEffect(() => { lockAvailable().then(setAv).catch(() => setAv({ available: false })) }, [])
  const toggle = async on => {
    if (!on) { setLockPrefs({ on: false }); return }
    // prove it works before locking anything
    const r = await authenticate(t('Turn on the app lock'), t('Use your fingerprint, face or the phone’s PIN'))
    if (r.ok) { setLockPrefs({ on: true }); useUI.getState().toast(t('App lock is on')) }
  }
  const can = av && av.available
  return <Section title={t('Security')} footer={can
    ? t('Uses the phone’s own screen lock — the app never sees your fingerprint or PIN. The phone’s PIN always works, so you can’t be locked out.')
    : t('Set a screen lock (PIN, pattern or fingerprint) in the phone’s settings first.')}>
    <Row icon="fingerprint" iconTint="var(--indigo, var(--blue))" title={t('Lock with fingerprint or PIN')}
      subtitle={av && av.biometric ? t('Fingerprint or face, or the phone’s PIN') : t('The phone’s PIN, pattern or password')}>
      <Switch checked={p.on && !!can} disabled={!can} onChange={toggle} />
    </Row>
    {p.on && can && <div className="bk-keep">
      <span className="small muted">{t('Lock after the app was away for')}</span>
      <Segmented options={LOCK_AFTER.map(s => ({ value: s, label: t(AFTER_LABEL[s]) }))} value={p.after} onChange={after => setLockPrefs({ after })} />
    </div>}
  </Section>
}
