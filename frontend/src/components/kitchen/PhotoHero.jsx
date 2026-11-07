// 14.0 — the big moving photo at the top of a food, drink or recipe sheet, with who took it.
//   <PhotoHero k="dolma" alt="Dolma">…an overlay…</PhotoHero>
//   <PhotoCredit k="dolma" />   "Photo: Abdulsalam Al Dabbagh · CC BY-SA 4.0" — tap for the
//                               details and the Wikimedia Commons page
// Photos under CC BY / BY-SA must name their author and licence: every one does, here and in
// Kitchen → Tools → Photo credits.
import { useEffect, useState } from 'react'
import { useUI } from '../../store/useUI.js'
import { t } from '../../lib/i18n.js'
import { loadCredits, commonsUrl, isOffFile, isOpfFile, fileLabel } from '../../lib/photos/index.js'
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
  const off = isOffFile(file)   // 16.0: a product's own photo from Open Food Facts
  const opf = isOpfFile(file)   // … or from its sister, Open Products Facts
  return <div className="ph-credit-sheet">
    <h3>{t('About this photo')}</h3>
    <div className="ph-credit-pic"><Photo k={k} size="m" alt="" /></div>
    <div className="list">
      <div className="item"><span className="lrow-i" style={{ '--tint': 'var(--blue)' }}><Icon name="camera" /></span>
        <div className="grow"><div className="ss">{t('Photographer')}</div><div className="tt" dir="auto">{author}</div></div></div>
      <div className="item"><span className="lrow-i" style={{ '--tint': 'var(--green)' }}><Icon name="shield" /></span>
        <div className="grow"><div className="ss">{t('Licence')}</div><div className="tt" dir="ltr">{lic}</div></div></div>
      <div className="item"><span className="lrow-i" style={{ '--tint': 'var(--orange)' }}><Icon name="image" /></span>
        <div className="grow"><div className="ss">{opf ? t('Photo on Open Products Facts') : off ? t('Photo on Open Food Facts') : t('File on Wikimedia Commons')}</div><div className="tt ph-credit-file" dir="auto">{fileLabel(file)}</div></div></div>
    </div>
    <p className="small muted">{opf
      ? t('A real photograph of the product itself from Open Products Facts, the sister of Open Food Facts for other products, shared under a free licence. It was resized for the app.')
      : off
      ? t('A real photograph of the product itself from Open Food Facts, the free food database, shared under a free licence. It was resized for the app.')
      : t('A real photograph from Wikimedia Commons, shared under a free licence. It was cropped and resized for the app.')}</p>
    <Button variant="tinted" icon="globe" onClick={() => openLink(commonsUrl(file))}>{opf ? t('Open on Open Products Facts') : off ? t('Open on Open Food Facts') : t('Open on Wikimedia Commons')}</Button>
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

/**
 * The sheet's big photo: it drifts slowly, fades in, and names its photographer. 15.0: with `uid`
 * (the item, 'F:dolma') a tap opens it in the photo viewer — big, with everything about it.
 */
export function PhotoHero({ k, alt = '', children, className = '', uid = null, opts = null }) {
  if (!k) return null
  const open = uid ? () => import('./Spotlight.jsx').then(m => m.spotlight(uid, { ...opts, fromSheet: true })) : null
  return <div className={'ph-hero ' + className + (open ? ' tap' : '')}>
    <Photo k={k} size="m" live alt={alt} fallback={<span className="ph-hero-none" aria-hidden="true"><Icon name="fork" /></span>} />
    <span className="ph-hero-shade" aria-hidden="true" />
    {open && <button type="button" className="ph-hero-tap" onClick={open} aria-label={t('Photo and details: {0}', alt)}>
      <span className="ph-hero-zoom" aria-hidden="true"><Icon name="expand" />{t('Photo & details')}</span>
    </button>}
    {children}
    <PhotoCredit k={k} />
  </div>
}
