// 7.0 — Lift tools sheet: plate calculator + 1RM / percentage table.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, U } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'
import { platesFor, groupPlates, BARS, PLATE_COLOR, pctTable } from '../../lib/plates.js'
import { estimate1RM, best1RM } from '../../lib/onerm.js'
import { Segmented, Stepper } from '../ui.jsx'
import Icon from '../Icon.jsx'

function BarView({ side, unit }) {
  const max = unit === 'lb' ? 45 : 25
  const plate = (p, i) => <span key={i} className="lt-plate" style={{ background: PLATE_COLOR[p] || '#8E8E93', height: 34 + 58 * (p / max) }} title={fmtNum(p)} />
  return <div className="lt-bar" aria-hidden="true">
    <div className="lt-side lt-l">{[...side].reverse().map(plate)}</div>
    <div className="lt-rod" />
    <div className="lt-side">{side.map(plate)}</div>
  </div>
}

function LiftTools({ close, w0, r0, exId, tab0 }) {
  const S = useStore(s => s.S)
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const best = exId ? best1RM(S, exId) : null
  const [tab, setTab] = useState(tab0 || 'plates')
  const [tw, setTw] = useState(w0 || (unit === 'lb' ? 135 : 60))
  const [bar, setBar] = useState(BARS[unit][0])
  const [w, setW] = useState(w0 || (best ? best.w : unit === 'lb' ? 135 : 60))
  const [r, setR] = useState(r0 || (best ? best.r : 5))
  const res = platesFor(tw, bar, unit)
  const est = estimate1RM(w, r)
  const rows = pctTable(est || 0, unit)
  return <div className="lt">
    <div className="row between" style={{ marginBottom: 12 }}>
      <h3 className="row" style={{ gap: 8, margin: 0 }}><Icon name="calculator" style={{ color: 'var(--acc)' }} />{t('Lift tools')}</h3>
      <button className="iconbtn" aria-label={t('Close')} onClick={close}><Icon name="xmark" /></button>
    </div>
    <Segmented value={tab} onChange={setTab} options={[{ value: 'plates', label: t('Plates') }, { value: 'pct', label: t('1RM & %') }]} />
    {tab === 'plates' ? <div style={{ marginTop: 14 }}>
      <Stepper label={t('Target weight')} value={tw} step={unit === 'lb' ? 5 : 2.5} onChange={setTw} unit={unit} />
      <div className="muted small" style={{ margin: '12px 0 6px' }}>{t('Bar')}</div>
      <Segmented value={bar} onChange={setBar} options={BARS[unit].map(b => ({ value: b, label: b ? fmtNum(b) + ' ' + U(unit) : t('None') }))} />
      <BarView side={res.side} unit={unit} />
      <div className="lt-sum">
        {res.side.length ? <div className="lt-line">{t('Each side:')} <b>{groupPlates(res.side).map(g => (g.n > 1 ? g.n + '× ' : '') + fmtNum(g.p)).join(' + ')}</b> {U(unit)}</div>
          : <div className="lt-line">{t('Just the bar')}</div>}
        <div className="muted small">{t('Loaded: {0} {1}', fmtNum(res.total), U(unit))}{res.rest > 0 ? ' · ' + t('{0} {1} can’t be loaded with standard plates', fmtNum(res.rest), U(unit)) : ''}</div>
      </div>
    </div> : <div style={{ marginTop: 14 }}>
      <div className="row" style={{ gap: 10 }}>
        <div className="grow1"><Stepper label={t('Weight')} value={w} step={unit === 'lb' ? 5 : 2.5} onChange={setW} unit={unit} /></div>
        <div className="grow1"><Stepper label={t('Reps')} value={r} step={1} decimal={false} onChange={setR} /></div>
      </div>
      <div className="lt-1rm">
        <div className="muted small">{t('Estimated 1RM')}</div>
        <div className="lt-big">{est ? fmtNum(est) : '—'} <small>{U(unit)}</small></div>
        {!est && <div className="muted small">{t('Enter a weight and 1–12 reps')}</div>}
        {best && <div className="muted small">{t('Your best: {0} {1}', fmtNum(best.est), U(unit))}</div>}
      </div>
      {rows.length > 0 && <div className="lt-table">
        <div className="lt-tr lt-th"><span>%</span><span>{t('Weight')}</span><span>{t('Reps')}</span></div>
        {rows.map(x => <button key={x.pct} className="lt-tr" onClick={() => { setTw(x.w); setTab('plates') }}>
          <span><i className="lt-pbar" style={{ width: x.pct + '%' }} />{x.pct}%</span><span>{fmtNum(x.w)} {U(unit)}</span><span>~{x.reps}</span>
        </button>)}
        <div className="muted small" style={{ marginTop: 6 }}>{t('Tap a row to see its plates.')}</div>
      </div>}
    </div>}
  </div>
}

export const liftToolsSheet = (opts = {}) => useUI.getState().openSheet(close => <LiftTools close={close} {...opts} />)
