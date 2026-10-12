import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale } from '../lib/i18n.js'
import {
  cloudMeta, onCloudChange, signedInGoogle, googleAvailable, signInGoogle, signOutGoogle, syncNow, firstSync,
  resolveChoice, setAutoSave, autoSaveOn, previousCopy, restorePrevious, upgradeToDrive, lastSavedAt,
} from '../lib/cloud.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { GoogleG, accountError } from './AccountGate.jsx'
import { Section, Row, Switch } from './ui.jsx'

/** "just now" · "5 min ago" · "14:32" · "12 Oct" */
export function agoLabel(at, now = Date.now()) {
  if (!at) return t('Never')
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 45) return t('just now')
  if (s < 3600) return t('{0} min ago', Math.round(s / 60).toLocaleString(dateLocale()))
  const d = new Date(at)
  if (new Date(now).toDateString() === d.toDateString()) return d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })
}

export function Avatar({ account }) {
  const [broken, setBroken] = useState(false)
  if (account && account.photo && !broken) {
    return <img className="acc-avatar" src={account.photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  }
  const ch = ((account && (account.name || account.email)) || '?').trim().charAt(0).toUpperCase()
  return <span className="acc-ini" aria-hidden="true">{ch}</span>
}

// Settings → Account on the phone: the Google account (saved automatically, sync now, switch,
// sign out) — or "on this phone" with a way to sign in.
export default function AccountSection() {
  const [meta, setMeta] = useState(cloudMeta)
  const [busy, setBusy] = useState(false)
  const [g, setG] = useState(null)
  const [, tick] = useState(0)
  const toast = useUI(s => s.toast)
  useEffect(() => onCloudChange(setMeta), [])
  useEffect(() => { googleAvailable().then(setG).catch(() => setG(false)) }, [])
  useEffect(() => { const id = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(id) }, [])
  const signed = signedInGoogle()
  const account = meta.account || {}

  const rid = useRef(0)                       // bumps on Cancel: a late answer is ignored
  const run = async (fn, okMsg) => {
    const my = ++rid.current
    setBusy(true)
    try {
      const r = await fn()
      if (my !== rid.current) return
      const msg = typeof okMsg === 'function' ? okMsg(r) : okMsg
      if (msg) toast(msg)
    }
    catch (e) { if (my === rid.current && (!e || e.reason !== 'cancelled')) toast(accountError(e && e.reason)) }
    if (my === rid.current) setBusy(false)
  }
  const cancel = () => { rid.current++; setBusy(false) }
  const resultMsg = r => r === 'restored' ? t('Your data was restored from the account.') : r === 'uploaded' ? t('Saved to your Google account') : t('Everything is up to date')

  const signIn = () => run(async () => {
    await signInGoogle()
    const r = await firstSync(useStore)
    if (r === 'choose') {
      // Both sides have data: ask, and finish in the background (busy ends now).
      const finish = which => resolveChoice(useStore, which).then(x => toast(resultMsg(x))).catch(e => toast(accountError(e && e.reason)))
      confirmSheet({
        title: t('Data found in your account'),
        message: t('{0} already has MAHDI-JYM data, and this phone has some too. Which one do you want to keep?', cloudMeta().account?.email || ''),
        confirmText: t('Use the account’s data'),
        cancelText: t('Keep this phone’s data'),
        onConfirm: () => finish('account'),
        onCancel: () => finish('phone'),
      })
    }
    return r
  }, r => r === 'choose' ? null : r === 'restored' ? t('Your data was restored from the account.') : t('Signed in'))

  const switchToDrive = () => run(() => upgradeToDrive(useStore, true), r => r === 'restored' ? t('Your data was restored from the account.') : t('Now saved to Google Drive'))

  const signOut = () => confirmSheet({
    title: t('Sign out of Google?'),
    message: meta.backend === 'drive' ? t('Your data stays on this phone and in your Google account. Changes are no longer saved to the account.')
      : t('Your data stays on this phone. Changes are no longer saved to your Google account.'),
    confirmText: t('Sign out'), danger: true,
    onConfirm: () => run(async () => { await syncNow(useStore).catch(() => {}); await signOutGoogle(false) }, t('Signed out')),
  })

  const prev = previousCopy()
  const status = busy ? <span className="acc-badge busy"><Icon name="reset" /> {t('Saving…')}</span>
    : meta.error ? <span className="acc-badge err"><Icon name="info" /> {t('Not saved yet')}</span>
    : <span className="acc-badge"><Icon name="cloudCheck" /> {t('Saved')}</span>

  if (!signed) return (
    <Section title={t('Your data')} footer={t('Sign in with a Google account that’s already on this phone — no password. Everything is then saved to that account automatically.')}>
      <Row icon="lock" iconTint="var(--acc)" title={t('All data stays on this phone')} subtitle={t('No account, no cloud — back it up anytime with Export below.')} />
      <div style={{ padding: '4px 14px 14px' }}>
        <button className="acc-google" onClick={busy ? undefined : signIn} disabled={g === false || busy}>
          <span className="acc-g"><GoogleG /></span>
          <span className="acc-gt"><b>{t('Sign in with Google')}</b><small>{g === false ? t('Google Play services aren’t available on this phone.') : busy ? t('Connecting your account…') : t('Choose one of the accounts on this phone')}</small></span>
          {busy && <span className="acc-spin" aria-hidden="true" />}
        </button>
        {busy && <button className="pg-later" onClick={cancel}>{t('Cancel')}</button>}
      </div>
    </Section>
  )

  return (
    <Section title={t('Google account')} footer={meta.backend === 'drive'
      ? t('Workouts, plan, steps, water, body weight and settings are saved to a private app folder in your Google Drive. Progress photos stay on this phone.')
      : t('Workouts, plan, steps, water, body weight and settings are saved through Android Backup to your Google account. Android uploads it in the background, usually within a few hours, and puts it back when you install MAHDI-JYM again or on a new phone. Progress photos stay on this phone.')}>
      <div className="acc-row">
        <Avatar account={account} />
        <div className="who"><b>{account.name || account.email}</b><span>{account.email}</span></div>
        {status}
      </div>
      <div className={'acc-where' + (meta.backend === 'drive' ? ' drive' : '')}>
        <Icon name={meta.backend === 'drive' ? 'cloudCheck' : 'shield'} />
        <span><b>{meta.backend === 'drive' ? t('Google Drive') : t('Android Backup')}</b>
          {meta.backend === 'drive' ? t('Private app folder · synced within seconds') : t('Through your Google account · no setup needed')}</span>
      </div>
      <Row icon="cloud" iconTint="var(--blue)" title={t('Save now')} subtitle={t('Last saved {0}', agoLabel(lastSavedAt(meta)))}
        accessory="chevron" onClick={busy ? undefined : () => run(() => syncNow(useStore), resultMsg)} />
      <Row icon="reset" iconTint="var(--teal)" title={t('Save automatically')} subtitle={t('Every change, a moment after you make it')}>
        <Switch checked={autoSaveOn()} onChange={v => { setAutoSave(v); if (v) syncNow(useStore).catch(() => {}) }} />
      </Row>
      {prev && <Row icon="shuffle" iconTint="var(--orange)" title={t('Undo the last restore')}
        subtitle={t('Puts back the data this phone had before {0}', agoLabel(prev.at))} accessory="chevron"
        onClick={() => confirmSheet({ title: t('Undo the last restore?'), message: t('This phone goes back to the data it had before the account’s copy replaced it.'), confirmText: t('Undo'),
          onConfirm: () => { if (restorePrevious(useStore)) toast(t('Previous data restored')) } })} />}
      {meta.backend !== 'drive' && <Row icon="cloud" iconTint="var(--indigo, var(--blue))" title={t('Use Google Drive')}
        subtitle={meta.driveWhy === 'setup' ? t('Needs the one-time Google Cloud setup — tried automatically every few hours') : t('Faster sync between phones')}
        accessory="chevron" onClick={busy ? undefined : switchToDrive} />}
      <Row icon="personCircle" iconTint="var(--purple)" title={t('Switch account')} accessory="chevron" onClick={busy ? undefined : signIn} />
      <Row icon="signOut" iconTint="var(--red)" title={t('Sign out')} danger onClick={signOut} />
    </Section>
  )
}
