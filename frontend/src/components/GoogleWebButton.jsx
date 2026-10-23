// 8.0 — Google's official "Sign in with Google" button for the web app (self-hosted instance
// with GOOGLE_CLIENT_ID). While Google's script loads a placeholder of the same size holds the
// space; if it can't load (blocked, offline) a plain note says so instead of an empty gap.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { hasData } from '../store/useStore.js'
import { renderGoogleButton, googleLogin, googleLink } from '../lib/googleWeb.js'
import { t, getLang } from '../lib/i18n.js'
import { GoogleG } from './AccountGate.jsx'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

const ui = () => useUI.getState()

export function GoogleWebButton({ clientId, onCredential, text = 'continue_with' }) {
  const ref = useRef(null)
  const cb = useRef(onCredential)
  cb.current = onCredential                      // the latest handler, without redrawing the button
  const [st, setSt] = useState('loading')      // loading | ready | failed
  const theme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'outline' : 'filled_black'
  useEffect(() => {
    let alive = true
    renderGoogleButton(ref.current, { clientId, onCredential: c => cb.current && cb.current(c), theme, text, locale: getLang() })
      .then(() => { if (alive) setSt('ready') })
      .catch(() => { if (alive) setSt('failed') })
    return () => { alive = false }
  }, [clientId, theme, text])
  return <div className={'gw-wrap ' + st}>
    <div ref={ref} className="gw-btn" />
    {st === 'loading' && <div className="gw-ph" aria-hidden="true"><GoogleG size={18} /><span /></div>}
    {st === 'failed' && <div className="gw-fail small muted"><Icon name="info" /> {t('Google sign-in couldn’t load — check the connection or an ad blocker.')}</div>}
  </div>
}

/** The invite code a new profile needs on an invite-only instance. */
function InviteSheet({ close, onCode }) {
  const [code, setCode] = useState('')
  return <>
    <h3>{t('Invite code')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('This app is invite-only — enter the code you were given.')}</div>
    <input className="input" autoFocus placeholder={t('Invite code')} maxLength={40} value={code}
      onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={() => { if (code.trim()) { close(); onCode(code.trim()) } }}>{t('Continue')}</Button>
  </>
}

/**
 * Sign in (or create a profile) with a Google ID token. Data already in this browser moves into
 * a NEW profile, like the passkey sign-up does; an existing profile's data is pulled down.
 */
export async function signInWithGoogleToken(credential, code) {
  const { setUser, pushState, pullState } = useStore.getState()
  try {
    const r = await googleLogin(credential, code)
    setUser(r.user)
    if (r.created && hasData(useStore.getState().S)) { await pushState(); ui().toast(t('Profile created — data from this device moved into it')) }
    else { await pullState(); ui().toast(r.created ? t('Welcome, {0}', r.user.name) : t('Welcome back, {0}', r.user.name)) }
    return r.user
  } catch (e) {
    if (e && e.status === 403 && e.data && e.data.invite) {
      ui().openSheet(close => <InviteSheet close={close} onCode={c => signInWithGoogleToken(credential, c)} />)
      return null
    }
    ui().toast((e && e.message) || t('Google sign-in didn’t work. Try again, or keep your data on this phone.'))
    return null
  }
}

/** Settings → link the signed-in profile to a Google account (a sheet with Google's button). */
export function linkGoogleSheet(clientId) {
  ui().openSheet(close => <LinkSheet close={close} clientId={clientId} />)
}
function LinkSheet({ close, clientId }) {
  const onCredential = async credential => {
    try {
      const r = await googleLink(credential)
      useStore.getState().setUser(r.user)
      close()
      ui().toast(t('Google account linked'))
    } catch (e) { ui().toast((e && e.message) || t('Google sign-in didn’t work. Try again, or keep your data on this phone.')) }
  }
  return <div className="gw-sheet">
    <div className="gw-sheet-ic"><GoogleG size={30} /></div>
    <h3>{t('Link your Google account')}</h3>
    <p className="muted small">{t('Then you can sign in to this profile with Google on any device — your passkeys keep working too.')}</p>
    <GoogleWebButton clientId={clientId} onCredential={onCredential} text="continue_with" />
  </div>
}
