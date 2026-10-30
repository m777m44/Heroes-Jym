import { useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { savePhoto, deletePhoto, shrinkImage } from '../../lib/photoStore.js'
import { fmtDate } from '../../lib/format.js'
import { t } from '../../lib/i18n.js'
import { usePhotoUrl, photosChanged, photoProfile } from './usePhoto.js'
import Icon from '../Icon.jsx'
import { Button } from '../ui.jsx'

/** Attach a photo to the weigh-in on `iso`, in place on the state — shared with the log sheet. */
export async function attachPhoto(iso, file) {
  const blob = await shrinkImage(file)
  await savePhoto(photoProfile(), iso, blob)
  useStore.getState().update(s => { const b = s.bodyweight.find(x => x.d === iso); if (b) b.p = true })
  photosChanged()
}
export async function removePhoto(iso) {
  await deletePhoto(photoProfile(), iso)
  useStore.getState().update(s => { const b = s.bodyweight.find(x => x.d === iso); if (b) delete b.p })
  photosChanged()
}

export function photoViewer(iso, url) {
  useUI.getState().openSheet(close => <>
    <h3>{t('Weigh-in photo')} · {fmtDate(iso, true)}</h3>
    <img src={url} alt={t('Weigh-in photo')} className="wphoto-full" />
    <div style={{ height: 12 }} />
    <Button variant="danger" icon="trash" onClick={() => { removePhoto(iso); close() }}>{t('Delete photo')}</Button>
  </>)
}

/**
 * The scale photo for one weigh-in: take/pick one, or view and replace the one there is.
 * A photo is what marks a weigh-in as verified. Stays on this device (see photoStore.js).
 */
export default function WeightPhotoUpload({ iso, flagged }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const url = usePhotoUrl(iso)
  const toast = useUI(s => s.toast)
  const pick = async e => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try { await attachPhoto(iso, f); toast(t('Photo saved — weigh-in verified')) }
    catch { toast(t('Could not save the photo')) }
    setBusy(false)
  }
  return (
    <div className="wphoto">
      {url
        ? <button className="wphoto-thumb" onClick={() => photoViewer(iso, url)} aria-label={t('Weigh-in photo')}><img src={url} alt="" loading="lazy" decoding="async" /></button>
        : <div className="wphoto-thumb empty"><Icon name="camera" /></div>}
      <div className="wphoto-m">
        <div className="wphoto-t">{url ? <><Icon name="checkCircle" style={{ color: 'var(--acc)' }} /> {t('Verified with a photo')}</> : t('Photo of the scale')}</div>
        <div className="small muted">{url
          ? t('Tap the photo to view or delete it.')
          : flagged ? t('Photographed on another device — photos stay where they were taken.') : t('Snap the scale display to verify this weigh-in. Stays on this device, never uploaded.')}</div>
        <div style={{ marginTop: 8 }}>
          <Button size="sm" icon="camera" disabled={busy} onClick={() => ref.current && ref.current.click()}>{url ? t('Replace photo') : t('Add photo')}</Button>
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
    </div>
  )
}
