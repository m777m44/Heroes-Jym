import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t, useLang } from '../lib/i18n.js'
import { googleAvailable, signInGoogle, firstSync, resolveChoice, choosePhone } from '../lib/cloud.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

/** Google's "G" mark, as on Google's own sign-in buttons. */
export function GoogleG({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/** A sentence for a sign-in failure reason (lib/cloud.js reasonOf). */
export function accountError(reason) {
  if (reason === 'setup') return t('Google sign-in isn’t set up for this version of the app yet. Your data stays on this phone for now.')
  if (reason === 'network') return t('No connection to Google. Check the internet and try again.')
  if (reason === 'consent') return t('Google Drive access wasn’t allowed, so nothing can be saved to the account.')
  if (reason === 'unavailable') return t('Google Play services aren’t available on this phone.')
  return t('Google sign-in didn’t work. Try again, or keep your data on this phone.')
}

// First launch (mobile): where should your data live? Google (the accounts on this phone, no
// password) · this phone · skip. Shown once, before the permissions dialog.
export default function AccountGate({ onDone }) {
  useLang()
  const [g, setG] = useState(null)              // Google sign-in available here (null = checking)
  const [phase, setPhase] = useState('ask')     // ask | busy | choose | done
  const [err, setErr] = useState(null)
  const [account, setAccount] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => { googleAvailable().then(setG).catch(() => setG(false)) }, [])

  const google = async () => {
    setErr(null)
    setPhase('busy')
    try {
      const a = await signInGoogle()
      setAccount(a)
      const r = await firstSync(useStore).catch(e => { if (e && e.reason === 'setup') throw e; return 'later' })
      if (r === 'choose') { setPhase('choose'); return }
      setResult(r)
      setPhase('done')
    } catch (e) {
      setPhase('ask')
      if (e && e.reason === 'cancelled') return
      setErr(accountError(e && e.reason))
    }
  }
  const pick = async which => {
    setPhase('busy')
    try { setResult(await resolveChoice(useStore, which)) } catch { setResult('later') }
    setPhase('done')
  }
  const phone = skip => { choosePhone(skip); onDone && onDone() }

  return <div className="pg-back" role="dialog" aria-modal="true" aria-labelledby="ag-title">
    <div className="pg-card acc-card">
      {phase === 'ask' && <>
        <div className="acc-hero" aria-hidden="true">
          <span className="acc-orb"><Icon name="cloud" /></span>
          <span className="acc-orb sm"><Icon name="lock" /></span>
        </div>
        <h2 id="ag-title">{t('Keep your progress safe')}</h2>
        <p className="pg-lead">{t('Sign in with a Google account that’s already on this phone — no password — and every workout, step, glass of water and setting is saved to it. Or keep everything on this phone.')}</p>
        {err && <p className="pg-lead pg-warn">{err}</p>}
        <button className="acc-google" onClick={google} disabled={g === false}>
          <span className="acc-g"><GoogleG /></span>
          <span className="acc-gt"><b>{t('Continue with Google')}</b><small>{g === false ? t('Google Play services aren’t available on this phone.') : t('Choose one of the accounts on this phone')}</small></span>
        </button>
        <button className="acc-opt" onClick={() => phone(false)}>
          <span className="pg-ic" style={{ '--tint': 'var(--acc)' }}><Icon name="phone" /></span>
          <span className="pg-t"><b>{t('Save on this phone')}</b><span>{t('Nothing leaves the phone. Back up anytime from Settings.')}</span></span>
          <Icon name="chevronRight" className="icn-dir acc-chev" />
        </button>
        <button className="pg-later" onClick={() => phone(true)}>{t('Skip')}</button>
        <div className="acc-fine"><Icon name="shield" /> {t('Saved in a private app folder in your Google Drive that only MAHDI-JYM can see. Sign out anytime in Settings.')}</div>
      </>}
      {phase === 'busy' && <>
        <div className="acc-hero" aria-hidden="true"><span className="acc-orb spin"><GoogleG size={28} /></span></div>
        <h2 id="ag-title">{t('Connecting your account…')}</h2>
        <p className="pg-lead">{account ? account.email : t('Choose an account in the window that appears.')}</p>
      </>}
      {phase === 'choose' && <>
        <div className="acc-hero" aria-hidden="true"><span className="acc-orb"><Icon name="shuffle" /></span></div>
        <h2 id="ag-title">{t('Data found in your account')}</h2>
        <p className="pg-lead">{t('{0} already has MAHDI-JYM data, and this phone has some too. Which one do you want to keep?', account ? account.email : '')}</p>
        <Button variant="primary" className="pg-go" icon="download" onClick={() => pick('account')}>{t('Use the account’s data')}</Button>
        <div style={{ height: 8 }} />
        <Button className="pg-go" icon="upload" onClick={() => pick('phone')}>{t('Keep this phone’s data')}</Button>
        <p className="acc-fine" style={{ marginTop: 10 }}>{t('The copy you don’t pick is replaced.')}</p>
      </>}
      {phase === 'done' && <>
        <div className="acc-hero" aria-hidden="true">
          {account && account.photo
            ? <img className="acc-avatar lg" src={account.photo} alt="" referrerPolicy="no-referrer" />
            : <span className="acc-orb ok"><Icon name="check" /></span>}
        </div>
        <h2 id="ag-title">{t('Signed in')}</h2>
        <p className="pg-lead"><b>{account && account.name}</b><br />{account && account.email}</p>
        <p className="pg-lead">{result === 'restored' ? t('Your data was restored from the account.')
          : result === 'later' ? t('Signed in — the first save happens as soon as there’s a connection.')
          : t('Everything is saved to your account from now on, automatically.')}</p>
        <Button variant="primary" className="pg-go" onClick={() => onDone && onDone()}>{t('Continue')}</Button>
      </>}
    </div>
  </div>
}
