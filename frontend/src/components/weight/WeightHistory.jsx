import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { fmtNum, fmtDate } from '../../lib/format.js'
import { t, U } from '../../lib/i18n.js'
import { deletePhoto } from '../../lib/photoStore.js'
import { confirmSheet, bwDeltaColor } from '../../sheets.jsx'
import { usePhotoUrl, photosChanged, photoProfile } from './usePhoto.js'
import { photoViewer } from './WeightPhotoUpload.jsx'
import Icon from '../Icon.jsx'
import { Button } from '../ui.jsx'

function Thumb({ iso }) {
  const url = usePhotoUrl(iso)
  if (!url) return <span className="wh-ph none"><Icon name="checkCircle" /></span>
  return <button className="wh-ph" onClick={() => photoViewer(iso, url)} aria-label={t('Weigh-in photo')}><img src={url} alt="" /></button>
}

const PAGE = 20

/** Every weigh-in, newest first, with the change from the one before and its photo. */
export default function WeightHistory({ S }) {
  const [n, setN] = useState(PAGE)
  const list = S.bodyweight
  const u = U(S.unit)          // label only
  if (!list.length) return null
  const rows = []
  for (let i = list.length - 1; i >= 0 && rows.length < n; i--) rows.push({ b: list[i], prev: list[i - 1] || null })
  const del = b => confirmSheet({
    title: t('Delete this weigh-in?'), message: fmtDate(b.d, true) + ' · ' + fmtNum(b.w) + ' ' + u,
    confirmText: t('Delete'), danger: true,
    onConfirm: () => {
      useStore.getState().update(s => { s.bodyweight = s.bodyweight.filter(x => x.d !== b.d) })
      deletePhoto(photoProfile(), b.d).then(photosChanged)
    },
  })
  return (
    <div className="card">
      <h2>{t('All weigh-ins')} <span className="dim small" style={{ fontWeight: 400 }}>· {list.length}</span></h2>
      <div className="wh">
        {rows.map(({ b, prev }) => {
          const d = prev ? Math.round((b.w - prev.w) * 10) / 10 : null
          return <div key={b.d} className="wh-r">
            {b.p ? <Thumb iso={b.d} /> : <span className="wh-ph none" />}
            <span className="wh-d">{fmtDate(b.d, true)}</span>
            <span className="wh-w">{fmtNum(b.w)} <span className="dim small">{u}</span></span>
            <span className="wh-x small" style={{ color: bwDeltaColor(d, b.w) }}>
              {d ? (d > 0 ? '+' : '−') + fmtNum(Math.abs(d)) : d === 0 ? '±0' : ''}
            </span>
            <button className="iconbtn wh-del" onClick={() => del(b)} aria-label={t('Delete')}><Icon name="trash" /></button>
          </div>
        })}
      </div>
      {list.length > n && <div style={{ marginTop: 10 }}><Button size="sm" onClick={() => setN(n + PAGE)}>{t('Show more')}</Button></div>}
    </div>
  )
}
