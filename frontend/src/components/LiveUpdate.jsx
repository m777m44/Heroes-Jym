// 14.0 — updating the online app inside the app (lib/liveUpdate.js):
//   LiveBanner    a card above the tab bar when a newer version is ready: "Update now" downloads it
//                 (with its progress) and the app restarts into it — no new APK, your data stays
//   LiveRows      Settings → App & updates: the check, the update, which version runs, and
//                 "Go back to the built-in version"
import { useState } from 'react'
import { t, dateLocale } from '../lib/i18n.js'
import { useLive, liveUpdateNow, liveCheck, resetLive, apkInfo } from '../lib/liveUpdate.js'
import { APP_VERSION } from '../lib/updates.js'
import Icon from './Icon.jsx'
import { Button, Row } from './ui.jsx'

const mb = n => (Math.max(0.1, Math.round((+n || 0) / 104857.6) / 10)).toLocaleString(dateLocale())

function Progress({ done, total }) {
  const p = total > 0 ? Math.min(1, done / total) : 0
  return <div className="lu-prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
    <i style={{ width: (p * 100).toFixed(1) + '%' }} />
  </div>
}

/** The card that offers a ready update (and shows it downloading). */
export function LiveBanner() {
  const { state, m, done, total } = useLive()
  const [later, setLater] = useState(false)
  const show = m && (state === 'downloading' || state === 'applying' || (!later && (state === 'ready' || (state === 'error' && total > 0))))
  if (!show) return null
  const busy = state === 'downloading' || state === 'applying'
  return <div className="lu-banner" role="status" aria-live="polite">
    <span className="lu-ic" aria-hidden="true"><Icon name={busy ? 'download' : 'rocket'} /></span>
    <div className="grow">
      <b>{state === 'applying' ? t('Starting MAHDI-JYM {0}…', m.version) : busy ? t('Downloading MAHDI-JYM {0}…', m.version) : t('MAHDI-JYM {0} is ready', m.version)}</b>
      {busy ? <><Progress done={done} total={total} /><small>{t('{0} of {1} MB — your data stays', mb(done), mb(total))}</small></>
        : state === 'error' ? <small className="lu-err">{t('The update stopped — check the connection and try again.')}</small>
          : <small>{t('Update inside the app — {0} MB, no reinstall. Your data stays.', mb(m.size))}</small>}
    </div>
    {!busy && <div className="lu-btns">
      <Button size="sm" variant="primary" onClick={() => { useLive.setState({ state: 'ready' }); liveUpdateNow() }}>{state === 'error' ? t('Try again') : t('Update now')}</Button>
      <Button size="sm" variant="plain" onClick={() => setLater(true)}>{t('Later')}</Button>
    </div>}
  </div>
}

/** Settings → App & updates, in the online app: check, update inside the app, go back to the built-in version. */
export function LiveRows() {
  const { state, m, done, total, live } = useLive()
  const apk = apkInfo()
  const status = state === 'checking' ? t('Checking…')
    : state === 'latest' ? t('You have the newest version ({0})', APP_VERSION)
      : state === 'ready' ? t('Version {0} is ready — {1} MB, no reinstall', m.version, mb(m.size))
        : state === 'needs-apk' ? t('Version {0} needs the new app — download it below', m.version)
          : state === 'failed' ? t('Version {0} could not start here — download the new app below', m.version)
            : state === 'downloading' ? t('Downloading… {0} of {1} MB', mb(done), mb(total))
              : state === 'applying' ? t('Starting the new version…')
                : state === 'error' ? t('Couldn’t reach GitHub — are you online?')
                  : t('The online app updates itself — no new APK needed')
  const reset = () => import('../sheets.jsx').then(m => m.confirmSheet({
    title: t('Go back to the built-in version?'),
    message: t('The app restarts with version {0}, the one that came with the APK. Your data stays.', apk.version),
    confirmText: t('Go back'), onConfirm: () => resetLive(),
  }))
  return <>
    <Row icon="rocket" iconTint="var(--green)" title={t('Update inside the app')} subtitle={status} accessory={state === 'ready' ? null : 'chevron'}
      className={'upd-row' + (state === 'checking' ? ' busy' : '')} onClick={state === 'ready' || state === 'downloading' || state === 'applying' ? undefined : () => liveCheck()} />
    {state === 'downloading' && <div className="lu-inline"><Progress done={done} total={total} /></div>}
    {state === 'ready' && <div className="lu-inline">
      <Button variant="primary" icon="download" onClick={liveUpdateNow}>{t('Update now')} · {t('{0} MB', mb(m.size))}</Button>
    </div>}
    {live && <Row icon="reset" iconTint="var(--grey)" title={t('Go back to the built-in version')}
      subtitle={t('Running {0}, updated inside the app — the APK has {1}', APP_VERSION, apk.version)} accessory="chevron" onClick={reset} />}
  </>
}
