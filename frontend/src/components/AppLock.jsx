// 4.0 — the lock screen: covers the app on start and after it was away longer than the chosen
// time, until the fingerprint / face / PIN prompt succeeds. See lib/appLock.js.
import { useEffect, useRef, useState } from 'react'
import { lockPrefs, onLockChange, shouldLock, authenticate, setLockPrefs, GONE, CANCELLED } from '../lib/appLock.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

export default function AppLock() {
  const [locked, setLocked] = useState(() => lockPrefs().on)
  const [msg, setMsg] = useState('')
  const hiddenAt = useRef(null)
  const authing = useRef(false)
  const quietUntil = useRef(0)            // the PIN screen is its own activity: ignore our own away-and-back

  const unlock = async () => {
    if (authing.current) return
    authing.current = true
    setMsg('')
    const r = await authenticate(t('Unlock MAHDI-JYM'), t('Use your fingerprint, face or the phone’s PIN'))
    authing.current = false
    quietUntil.current = Date.now() + 2000
    if (r.ok) { setLocked(false); return }
    if (GONE.has(r.code) || r.code === 'UNAVAILABLE') {
      // the phone has no screen lock any more — don't shut the owner out of their own data
      setLockPrefs({ on: false }); setLocked(false)
      useUI.getState().toast(t('The phone has no screen lock any more, so the app lock was turned off.'))
      return
    }
    setMsg(CANCELLED.has(r.code) ? '' : t('Not recognised — try again.'))
  }

  useEffect(() => { if (locked) { const id = setTimeout(unlock, 350); return () => clearTimeout(id) } }, [locked])
  useEffect(() => onLockChange(p => { if (!p.on) setLocked(false) }), [])
  useEffect(() => {
    const onVis = () => {
      if (authing.current || Date.now() < quietUntil.current) return
      if (document.visibilityState === 'hidden') { hiddenAt.current = Date.now(); return }
      if (hiddenAt.current != null && shouldLock(lockPrefs(), hiddenAt.current)) setLocked(true)
      hiddenAt.current = null
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  if (!locked) return null
  return <div className="applock" role="dialog" aria-modal="true" aria-label={t('MAHDI-JYM is locked')}>
    <div className="applock-c">
      <span className="applock-ico"><Icon name="lock" /></span>
      <h2>{t('MAHDI-JYM is locked')}</h2>
      <p className="muted">{t('Your workouts and health log stay private.')}</p>
      <button className="btn primary applock-b" onClick={unlock}><Icon name="fingerprint" /> {t('Unlock')}</button>
      {msg && <p className="small" style={{ color: 'var(--orange)' }}>{msg}</p>}
    </div>
  </div>
}
