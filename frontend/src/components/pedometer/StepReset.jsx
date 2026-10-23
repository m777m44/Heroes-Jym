import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { usePedometer } from '../../store/usePedometer.js'
import { stepsOn, daysBack } from '../../lib/stepMetrics.js'
import { todayISO, fmtDate } from '../../lib/format.js'
import { t, dateLocale } from '../../lib/i18n.js'
import Icon from '../Icon.jsx'

const fmt = n => Math.round(n).toLocaleString(dateLocale())

// "Reset and start again": today back to zero (counting goes on from this moment), or clear
// an earlier day that holds a wrong number. Every reset takes two taps — the button turns
// into "Confirm" first — so nothing is lost by a stray touch.
function StepReset({ close }) {
  const S = useStore(s => s.S)
  const [armed, setArmed] = useState(null)
  const [busy, setBusy] = useState(false)
  const today = todayISO()
  const earlier = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => daysBack(today, i)).filter(d => stepsOn(S, d) > 0)

  const reset = async iso => {
    if (armed !== iso) { setArmed(iso); return }
    setBusy(true)
    try { await usePedometer.getState().resetDay(iso) } finally { setBusy(false) }
    setArmed(null)
    if (iso === today) { close(); useUI.getState().toast(t('Steps reset — counting again from 0.')) }
    else useUI.getState().toast(t('Day cleared.'))
  }

  return <div className="step-reset">
    <div className="pg-logo"><Icon name="reset" /></div>
    <h3>{t('Reset step counter')}</h3>
    <p className="muted small">{t('Today’s steps go back to 0 and counting starts again from now. This can’t be undone.')}</p>
    <div className="step-reset-today">
      <span>{t('Today')}</span>
      <b>{fmt(stepsOn(S, today) + usePedometer.getState().pending)}</b>
    </div>
    <button className={'btn ' + (armed === today ? 'danger' : 'primary')} disabled={busy} onClick={() => reset(today)}>
      <Icon name="reset" /> <span>{armed === today ? t('Confirm') : t('Reset today and start again')}</span>
    </button>

    {earlier.length > 0 && <>
      <h4 className="step-reset-h">{t('Fix an earlier day')}</h4>
      <p className="muted small">{t('Removes the steps recorded for this day. Use it if a day shows a wrong number.')}</p>
      <div className="step-reset-list">
        {earlier.map(d => <div key={d} className="step-reset-row">
          <span className="d">{fmtDate(d, true)}</span>
          <b>{fmt(stepsOn(S, d))}</b>
          <button className={'chip' + (armed === d ? ' danger' : '')} disabled={busy} onClick={() => reset(d)}
            aria-label={t('Delete')}>
            {armed === d ? t('Confirm') : <Icon name="trash" />}
          </button>
        </div>)}
      </div>
    </>}
    <button className="pg-later" onClick={close}>{t('Cancel')}</button>
  </div>
}

export function stepResetSheet() {
  useUI.getState().openSheet(close => <StepReset close={close} />, { kind: 'center' })
}
