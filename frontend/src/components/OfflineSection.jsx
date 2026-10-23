import { useEffect, useRef, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { t, dateLocale } from '../lib/i18n.js'
import { offlineMode, mediaStatus, saveAllMedia, clearMedia, MEDIA_MB } from '../lib/offlineMedia.js'
import { Section, Row, Button } from './ui.jsx'

const fmt = n => Math.round(n).toLocaleString(dateLocale())

// Settings → Offline: the step counter never needs a connection; the exercise media are
// inside the Android app, and can be saved into the browser for the web app.
export default function OfflineSection() {
  const mode = offlineMode()
  const [st, setSt] = useState({ saved: 0, total: 0 })
  const [pct, setPct] = useState(null)              // null = idle, 0–100 = saving
  const abort = useRef(null)

  useEffect(() => {
    let live = true
    mediaStatus().then(s => { if (live) setSt(s) })
    return () => { live = false; if (abort.current) abort.current.abort() }
  }, [])

  const save = async () => {
    const ctl = new AbortController()
    abort.current = ctl
    setPct(0)
    const r = await saveAllMedia({ signal: ctl.signal, onProgress: (d, n) => { setPct(Math.floor(d / n * 100)); setSt({ saved: d, total: n }) } })
    abort.current = null
    setPct(null)
    setSt(await mediaStatus())
    useUI.getState().toast(r.failed ? t('Some files could not be saved. Try again when you are online.') : t('Saved for offline use'))
  }
  const free = async () => { await clearMedia(); setSt(await mediaStatus()) }

  const complete = st.total > 0 && st.saved >= st.total
  return <Section title={t('Offline')}
    footer={mode === 'cache' ? t('The app works without internet. Save the exercise images and animations (about {0} MB) to use the library offline too.', MEDIA_MB) : null}>
    <Row icon="figureWalk" iconTint="var(--green)" title={t('Step counter')} subtitle={t('Counts on your phone — no internet needed.')} />
    {mode === 'bundled' && <Row icon="checkCircle" iconTint="var(--green)" title={t('Exercise animations')}
      subtitle={t('Stored on this device — works without internet.')} value={fmt(st.total)} />}
    {mode === 'cache' && <>
      <Row icon="download" iconTint="var(--blue)" title={t('Exercise animations')}
        subtitle={pct !== null ? t('Saving… {0}%', pct) : complete ? t('Saved for offline use') : t('{0} of {1} saved', fmt(st.saved), fmt(st.total))}>
        {!complete && <Button size="sm" variant="tinted" icon="download" disabled={pct !== null} onClick={save}>{t('Save for offline use')}</Button>}
      </Row>
      {pct !== null && <div className="offline-bar"><i style={{ width: pct + '%' }} /></div>}
      {st.saved > 0 && pct === null && <Row icon="trash" iconTint="var(--red)" title={t('Free up space')} danger onClick={free} />}
    </>}
  </Section>
}
