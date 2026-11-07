import { useEffect, useRef, useState } from 'react'
import { imgSrc, gifSrc, videoSrc, onMediaError, EXV_BASE, MEDIA_CREDIT } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { t, exName } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// Big autoplaying animation; tap toggles to the still frame. `compact` shrinks it (superset cards).
// Custom exercises have no media — the animation stays blank by design (issue #11).
// `minimizable` (workout view) adds a persistent minimize/expand control so the animation stops
// eating the screen; the chosen size is saved to settings and carries across exercises and
// future workouts (issue #12).
// 16.0 — in the offline APK the animation is a small MP4 video (lib/exercises.js videoSrc): a tap
// pauses it on the current frame. Should the video fail, the GIF takes over (from the CDN), and
// without internet the still picture. The media's owner is named in the corner (© Gym visual).
export default function Media({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const [vidFail, setVidFail] = useState(false)
  const [gifFail, setGifFail] = useState(false)
  const vref = useRef(null)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)
  const vsrc = vidFail ? null : videoSrc(ex)
  useEffect(() => {
    const v = vref.current
    if (!v) return
    if (playing) { try { const p = v.play(); if (p && p.catch) p.catch(() => {}) } catch { /* not ready */ } } else v.pause()
  }, [playing, vsrc])
  if (!ex.gif) return null
  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => { e.stopPropagation(); update(s => { s.gifSize = mini ? 'full' : 'mini' }) }
  const still = !playing || gifFail
  return (
    <div className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '')} id={id} onClick={() => setPlaying(p => !p)}>
      {vsrc
        ? <video ref={vref} src={vsrc} poster={imgSrc(ex)} autoPlay loop muted playsInline preload="auto" disablePictureInPicture
          aria-label={exName(ex)} onError={() => setVidFail(true)} />
        : <img decoding="async" loading="lazy" src={still ? imgSrc(ex) : gifSrc(ex)} alt={exName(ex)}
          onError={e => { if (EXV_BASE && !still) setGifFail(true); else onMediaError(e, ex, still ? 'img' : 'gif') }} />}
      <span className="excredit" aria-hidden="true">{MEDIA_CREDIT}</span>
      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
        </button>
      )}
      {!mini && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

export function Thumb({ ex }) {
  if (!ex.img) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>
  return <img className="thumb" loading="lazy" decoding="async" src={imgSrc(ex)} alt="" onError={e => onMediaError(e, ex, 'img')} />
}
