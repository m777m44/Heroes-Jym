import { useEffect, useRef } from 'react'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// How far (px) or how fast (px/ms) a downward swipe has to go to dismiss a sheet.
export const SWIPE_CLOSE_PX = 110
export const SWIPE_CLOSE_SPEED = 0.55
export const SWIPE_MIN_PX = 28

/** Pure: does a swipe of `dy` px over `ms` milliseconds dismiss the sheet? */
export function swipeCloses(dy, ms) {
  if (!(dy > SWIPE_MIN_PX)) return false
  return dy > SWIPE_CLOSE_PX || dy / Math.max(1, ms) > SWIPE_CLOSE_SPEED
}

// One bottom sheet (or centered dialog).
//
// 2.11 — every bottom sheet can be dismissed three ways, all ending in the same slide-down:
//   · the ✕ button at the top right of the sheet
//   · a swipe down — the sheet follows the finger and the backdrop fades with it; a long pull
//     or a quick flick closes it, anything less springs back
//   · a tap outside it (and the phone's Back button, lib/backButton.js)
// A `locked` sheet (a flow that must be answered) has no ✕ and doesn't move.
function Sheet({ sheet, top }) {
  const closeSheet = useUI(s => s.closeSheet)
  const ref = useRef(null)
  const backRef = useRef(null)
  const drag = useRef({ startY: null, delta: 0, t0: 0 })
  const lockedRef = useRef(sheet.locked)
  lockedRef.current = sheet.locked

  const close = () => closeSheet(sheet.id)
  const dismiss = () => { if (!sheet.locked) close() }

  const setBack = v => { if (backRef.current) backRef.current.style.opacity = v }

  const onTouchStart = e => {
    const el = ref.current
    // a gesture that begins on a slider (or opted-out control) belongs to that control,
    // not to the sheet's swipe-to-dismiss — so it keeps working while you drag
    if (lockedRef.current || (e.target.closest && e.target.closest('input[type=range], [data-nodrag]'))) {
      drag.current = { startY: null, delta: 0, t0: 0 }
      return
    }
    // the handle bar always drags; the content only when it is scrolled to the top
    const onHead = !!(e.target.closest && e.target.closest('.sheet-head'))
    drag.current = { startY: onHead || el.scrollTop <= 0 ? e.touches[0].clientY : null, delta: 0, t0: performance.now() }
  }
  const onTouchMove = e => {
    const el = ref.current, d = drag.current
    if (d.startY === null) return
    d.delta = e.touches[0].clientY - d.startY
    if (d.delta > 0 && (el.scrollTop <= 0 || e.target.closest('.sheet-head'))) {
      e.preventDefault()
      el.style.transition = 'none'
      el.style.transform = `translateY(${d.delta}px)`
      setBack(Math.max(0.15, 1 - d.delta / (el.offsetHeight || 600)))
    } else if (d.delta <= 0) {
      d.delta = 0
      el.style.transform = ''
    }
  }
  const onTouchEnd = () => {
    const el = ref.current, d = drag.current
    if (d.startY === null) return
    const ms = performance.now() - d.t0
    el.style.transition = ''
    if (swipeCloses(d.delta, ms)) {
      // keep the sheet where the finger let go — the exit animation only has an end frame,
      // so it slides on from there instead of jumping back first
      close()
    } else {
      el.style.transform = ''
      setBack('')
    }
    d.startY = null
  }

  // non-passive touchmove so preventDefault works (bottom sheets only; centered dialogs have no ref)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  // Escape closes the top sheet on a keyboard (desktop browsers, tablets with a keyboard)
  useEffect(() => {
    if (!top || sheet.locked || sheet.closing) return
    const onKey = e => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [top, sheet.locked, sheet.closing])

  const out = sheet.closing ? ' out' : ''
  if (sheet.kind === 'center') {
    return (
      <div className={'mlayer' + out}>
        <div className={'mback' + out} onClick={dismiss} />
        <div className={'center' + out} role="dialog" aria-modal="true">{sheet.render(close)}</div>
      </div>
    )
  }
  return (
    <div className={'mlayer' + out}>
      <div className={'mback' + out} ref={backRef} onClick={dismiss} />
      <div className={'sheet' + out + (sheet.locked ? ' locked' : '')} ref={ref} role="dialog" aria-modal="true"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        <div className="sheet-head">
          <div className="grab" />
          {!sheet.locked && <button type="button" className="sheet-x" onClick={close} aria-label={t('Close')}>
            <Icon name="xmark" />
          </button>}
        </div>
        {sheet.render(close)}
      </div>
    </div>
  )
}

export default function Modals() {
  const sheets = useUI(s => s.sheets)

  // lock the page behind any open sheet (iOS-safe)
  useEffect(() => {
    if (!sheets.length) return
    const y = window.scrollY || 0
    const b = document.body.style
    b.position = 'fixed'; b.top = -y + 'px'; b.left = '0'; b.right = '0'; b.width = '100%'
    return () => {
      b.position = b.top = b.left = b.right = b.width = ''
      window.scrollTo(0, y)
    }
  }, [sheets.length > 0])

  if (!sheets.length) return null
  const live = sheets.filter(s => !s.closing)
  const topId = live.length ? live[live.length - 1].id : null
  return (
    <div id="modal-root" className={'open' + (live.length ? '' : ' leaving')}>
      {sheets.map(s => <Sheet key={s.id} sheet={s} top={s.id === topId} />)}
    </div>
  )
}
