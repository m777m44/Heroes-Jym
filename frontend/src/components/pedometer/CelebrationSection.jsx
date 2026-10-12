import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { t } from '../../lib/i18n.js'
import { MOBILE } from '../../lib/mobile.js'
import { goalOf } from '../../lib/stepMetrics.js'
import { celebrate, playCheer } from '../../lib/celebrate.js'
import { celebrationStatus, openCelebrationSetting, previewNativeCelebration } from '../../lib/waterSync.js'
import { Section, Row, Switch } from '../ui.jsx'

const Status = ({ ok }) => <span className={ok ? 'perm-ok' : 'perm-no'}>{ok ? t('Allowed') : t('Not allowed')}</span>

// Walking → Celebrations (2.5): the in-app cheer, the full-screen one Android shows with the
// app closed (step goal + water goal, optionally every 1,000 steps), what the system allows
// for it, and a preview of both the screen and the notification.
export default function CelebrationSection({ prefs, setPref }) {
  const S = useStore(s => s.S)
  const [st, setSt] = useState(null)     // { fullScreen, overlay, sdk } — Android only
  useEffect(() => {
    if (!MOBILE) return
    let live = true
    const load = () => celebrationStatus().then(r => { if (live) setSt(r || null) })
    load()
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { live = false; document.removeEventListener('visibilitychange', onVis) }
  }, [])

  const preview = async (mode = 'screen') => {
    const g = goalOf(S)
    if (await previewNativeCelebration(S, 'goal', g, mode)) return
    celebrate(g, 'goal')
    playCheer(S.sound !== false, 'goal')
  }

  return <Section title={t('Celebrations')}
    footer={st ? t('When a goal is reached with the app closed, Android shows the celebration over the lock screen. To see it on top of other apps too, allow “Display over other apps”.') : null}>
    <Row icon="sparkles" iconTint="var(--pink)" title={t('Celebrations')} subtitle={t('Full screen, with confetti and a fanfare, at every 1,000 steps and at your goal.')}>
      <Switch checked={prefs.celebrate} onChange={v => setPref('celebrate', v)} />
    </Row>
    {MOBILE && prefs.celebrate && <>
      <Row icon="expand" iconTint="var(--yellow)" title={t('Full screen with the app closed')} subtitle={t('At your step goal and your water goal — with a picture notification.')}>
        <Switch checked={prefs.fullCelebrate !== false} onChange={v => setPref('fullCelebrate', v)} />
      </Row>
      <Row icon="medal" iconTint="var(--acc)" title={t('Also every 1,000 steps')}>
        <Switch checked={!!prefs.fullMilestones} onChange={v => setPref('fullMilestones', v)} />
      </Row>
      {st && <>
        <Row icon="lock" iconTint="var(--orange)" title={t('Full-screen notifications')} value={<Status ok={st.fullScreen} />}
          accessory={st.fullScreen ? 'none' : 'chevron'} onClick={st.fullScreen ? undefined : () => openCelebrationSetting('fullscreen')} />
        <Row icon="widget" iconTint="var(--teal)" title={t('Display over other apps')} subtitle={t('Optional')} value={<Status ok={st.overlay} />}
          accessory="chevron" onClick={() => openCelebrationSetting('overlay')} />
      </>}
    </>}
    <Row icon="play" iconTint="var(--blue)" title={t('Preview celebration')} accessory="chevron" onClick={() => preview('screen')} />
    {st && <Row icon="bell" iconTint="var(--purple)" title={t('Preview the notification')} accessory="chevron" onClick={() => preview('notification')} />}
  </Section>
}
