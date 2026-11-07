// 14.0 — updating the online app inside the app (lib/liveUpdate.js). 17.0: the offer, the download and
// its progress moved to the dock at the bottom of the screen (UpdateDock.jsx, lib/appUpdate.js); what
// stays here is Settings → App & updates → "Go back to the built-in version".
import { t } from '../lib/i18n.js'
import { useLive, resetLive, apkInfo } from '../lib/liveUpdate.js'
import { APP_VERSION } from '../lib/updates.js'
import { Row } from './ui.jsx'

/** Settings → App & updates, in the online app: back to the version the APK came with. */
export function LiveBackRow() {
  const live = useLive(s => s.live)
  if (!live) return null
  const apk = apkInfo()
  const reset = () => import('../sheets.jsx').then(m => m.confirmSheet({
    title: t('Go back to the built-in version?'),
    message: t('The app restarts with version {0}, the one that came with the APK. Your data stays.', apk.version),
    confirmText: t('Go back'), onConfirm: () => resetLive(),
  }))
  return <Row icon="reset" iconTint="var(--grey)" title={t('Go back to the built-in version')}
    subtitle={t('Running {0}, updated inside the app — the APK has {1}', APP_VERSION, apk.version)} accessory="chevron" onClick={reset} />
}
