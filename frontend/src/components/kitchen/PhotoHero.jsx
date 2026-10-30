// 14.0 — the big moving photo at the top of a food, drink or recipe sheet, with who took it.
//   <PhotoHero k="dolma" alt="Dolma">…an overlay…</PhotoHero>
//   <PhotoCredit k="dolma" />   "Photo: Abdulsalam Al Dabbagh · CC BY-SA 4.0" — tap for the
//                               details and the Wikimedia Commons page
// Photos under CC BY / BY-SA must name their author and licence: every one does, here and in
// Kitchen → Tools → Photo credits.
import { useEffect, useState } from 'react'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { loadCredits, commonsUrl } from '../../lib/photos/index.js'
import { openLink } from '../../lib/updates.js'
import { Photo } from '../FoodPhoto.jsx'
import Icon from '../Icon.jsx'
import { Button } from '../ui.jsx'

/** The credit of a photo once the list has loaded: [file, author, licence] or null. */
export function useCredit(k) {
  const [c, setC] = useState(null)
  useEffect(() => {
    let live = true
    if (k) loadCredits().then(all => { if (live) setC(all[k] || null) })
    else setC(null)
    return () => { live = false }
  }, [k])
  return c
}

function CreditSheet({ k, credit }) {
  const [file, author, lic] = credit
  return <div className="ph-credit-sheet">
    <h3>{t('About this photo')}</h3>
    <div className="ph-credit-pic"><Photo k={k} size="m" alt="" /></div>
    <div className="list">
      <div className="item"><span className="lrow-i" style={{ '--tint': 'var(--blue)' }}><Icon name="camera" /></span>
        <div className="grow"><div className="ss">{t('Photographer')}</div><div className="tt" dir="auto">{author}</div></div></div>
      <div className="item"><span className="lrow-i" style={{ '--tint': 'var(--green)' }}><Icon name="shield" /></span>
        <div className="grow"><div className="ss">{t('Licence')}</div><div className="tt" dir="ltr">{lic}</div></div></div>
      <div className="item"><span className="lrow-i" style={{ '--tint': 'var(--orange)' }}><Icon name="image" /></span>
        <div className="grow"><div className="ss">{t('File on Wikimedia Commons')}</div><div className="tt ph-credit-file" dir="auto">{file}</div></div></div>
    </div>
    <p className="small muted">{t('A real photograph from Wikimedia Commons, shared under a free licence. It was cropped and resized for the app.')}</p>
    <Button variant="tinted" icon="globe" onClick={() => openLink(commonsUrl(file))}>{t('Open on Wikimedia Commons')}</Button>
  </div>
}
export const creditSheet = (k, credit) => useUI.getState().openSheet(() => <CreditSheet k={k} credit={credit} />)

export function PhotoCredit({ k, className = '' }) {
  const c = useCredit(k)
  if (!c) return null
  return <button type="button" className={'ph-credit ' + className} onClick={e => { e.stopPropagation(); creditSheet(k, c) }}
    aria-label={t('Photo: {0} · {1}', c[1], c[2])}>
    <Icon name="camera" /><span dir="auto">{c[1]}</span><span className="ph-credit-l" dir="ltr">{c[2]}</span>
  </button>
}

/** The sheet's big photo: it drifts slowly, fades in, and names its photographer. */
export function PhotoHero({ k, alt = '', children, className = '' }) {
  if (!k) return null
  return <div className={'ph-hero ' + className}>
    <Photo k={k} size="m" live alt={alt} fallback={<span className="ph-hero-none" aria-hidden="true"><Icon name="fork" /></span>} />
    <span className="ph-hero-shade" aria-hidden="true" />
    {children}
    <PhotoCredit k={k} />
  </div>
}
