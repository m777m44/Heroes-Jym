// 12.0 — Settings → "App & updates": which MAHDI-JYM this is (offline / online / web app), a check
// for a newer release with direct download links, both Android versions and the web app.
import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { APP_VERSION, VARIANT, APK_OFFLINE, APK_ONLINE, apkUrl, RELEASES, WEB_APP, cmpVersion, checkLatest, lastCheck, openLink, mb } from '../lib/updates.js'
import { Section, Row, Button } from './ui.jsx'
import Icon from './Icon.jsx'
import { LiveRows } from './LiveUpdate.jsx'
import { liveSupported, liveCheck, useLive } from '../lib/liveUpdate.js'

export const VARIANT_INFO = {
  offline: { icon: 'cube', title: 'Offline version', sub: 'Everything is inside the app — it works with no internet.' },
  online: { icon: 'wifi', title: 'Online version (light)', sub: 'A small download that updates itself — exercise pictures, wallpapers, profile pictures and food photos load from GitHub when you open them.' },
  web: { icon: 'globe', title: 'Web app', sub: 'Runs in your browser — your data stays in this browser.' },
  demo: { icon: 'sparkles', title: 'Live demo', sub: 'Example data, stored only in this browser.' },
  server: { icon: 'cloud', title: 'Self-hosted', sub: 'Your own MAHDI-JYM server.' },
}

export default function AppUpdates() {
  const [st, setSt] = useState(() => { const l = lastCheck(); return l && l.version ? { state: 'done', rel: l } : { state: 'idle' } })
  const info = VARIANT_INFO[VARIANT] || VARIANT_INFO.server
  const inApp = liveSupported()   // 14.0: the online Android app updates itself
  const liveState = useLive(s => s.state)
  const check = async () => {
    if (st.state === 'busy') return
    setSt({ state: 'busy', rel: st.rel })
    if (inApp) liveCheck()
    try { setSt({ state: 'done', rel: await checkLatest() }) } catch { setSt({ state: 'error', rel: st.rel }) }
  }
  const rel = st.rel
  // in the online app a newer release usually comes inside the app — the APKs only when it can't
  const newer = !!(rel && rel.version && cmpVersion(rel.version, APP_VERSION) > 0) && !(inApp && ['ready', 'downloading', 'applying', 'latest'].includes(liveState))
  const sizeOf = a => (a && a.size ? t('{0} MB', mb(a.size)) : null)
  const status = st.state === 'busy' ? t('Checking…')
    : st.state === 'error' ? t('Couldn’t reach GitHub — are you online?')
    : rel ? (newer ? t('Version {0} is out', rel.version) : t('You have the newest version ({0})', APP_VERSION))
    : t('Asks GitHub for the newest release')
  const here = v => (VARIANT === v ? ' · ' + t('installed') : '')
  return <Section title={t('App & updates')} footer={t('Two separate apps with the same features: install one or both — side by side, each with its own name, icon and data. To move your data, use Data → Export backup in one and Import backup in the other.')}>
    <Row icon={info.icon} iconTint="var(--acc)" title={'MAHDI-JYM ' + APP_VERSION + ' · ' + t(info.title)} subtitle={t(info.sub)} />
    {inApp ? <LiveRows /> : <Row icon="refresh" iconTint="var(--blue)" title={t('Check for updates')} subtitle={status} accessory="chevron" onClick={check} className={'upd-row' + (st.state === 'busy' ? ' busy' : '')} />}
    {newer && <div className="upd-new" role="status">
      <span className="upd-new-ic"><Icon name="sparkle" /></span>
      <div className="grow">
        <b>{t('MAHDI-JYM {0} is ready', rel.version)}</b>
        <p className="small muted">{inApp ? t('This version needs the new app — download it and install it over this one; your data stays.') : t('Download it and install it over this one — your data stays.')}</p>
        <div className="upd-new-btns">
          {rel.online && <Button size="sm" variant={VARIANT === 'online' ? 'primary' : 'tinted'} icon="download" onClick={() => openLink(rel.online.url)}>{t('Online (light)')}{rel.online.size ? ' · ' + mb(rel.online.size) : ''}</Button>}
          {rel.offline && <Button size="sm" variant={VARIANT === 'online' ? 'tinted' : 'primary'} icon="download" onClick={() => openLink(rel.offline.url)}>{t('Offline (everything inside)')}{rel.offline.size ? ' · ' + mb(rel.offline.size) : ''}</Button>}
          <Button size="sm" variant="plain" onClick={() => openLink(rel.url)}>{t('What’s new')}</Button>
        </div>
      </div>
    </div>}
    <Row icon="wifi" iconTint="var(--teal)" title={t('Online version (light)') + here('online')} subtitle={[t('Small download; pictures from GitHub'), sizeOf(rel && rel.online)].filter(Boolean).join(' · ')} accessory="chevron" onClick={() => openLink(apkUrl(APK_ONLINE))} />
    <Row icon="cube" iconTint="var(--indigo)" title={t('Offline version') + here('offline')} subtitle={[t('Everything inside — no internet needed'), sizeOf(rel && rel.offline)].filter(Boolean).join(' · ')} accessory="chevron" onClick={() => openLink(apkUrl(APK_OFFLINE))} />
    <Row icon="globe" iconTint="var(--green)" title={t('Web app') + here('web')} subtitle={t('In any browser — on a computer too')} accessory="chevron" onClick={() => openLink(WEB_APP)} />
    <Row icon="list" iconTint="var(--grey)" title={t('All releases')} accessory="chevron" onClick={() => openLink(RELEASES)} />
  </Section>
}
