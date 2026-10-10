import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { compareLatest, totalChange, weeklyRate, etaToGoal } from '../lib/weightTracker.js'
import { bwSheet, goalSheet, bwDeltaColor } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import WeightComparison from '../components/weight/WeightComparison.jsx'
import WeightPhotoUpload from '../components/weight/WeightPhotoUpload.jsx'
import WeightHistory from '../components/weight/WeightHistory.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Section, Row, Segmented } from '../components/ui.jsx'
import CommitNumber from '../components/CommitNumber.jsx'

const RANGES = { 30: 30, 90: 90, 365: 365, all: Infinity }

// The body-weight page: current vs previous at a glance, the goal journey, the trend and what
// it projects, the scale photo that verifies a weigh-in, and every entry. Logging itself stays
// the one sheet the rest of the app uses (bwSheet), so a weigh-in before a workout and one
// made here are the same thing.
export default function BodyWeight() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const { update } = useStore()
  const [range, setRange] = useState('90')
  const u = S.unit
  const { current, previous, delta } = compareLatest(S.bodyweight)
  const total = totalChange(S.bodyweight)
  const rate = weeklyRate(S.bodyweight)
  const eta = S.targetW ? etaToGoal(S.bodyweight, S.targetW) : null
  const cut = RANGES[range]
  const now = Date.now()
  const points = S.bodyweight
    .map(b => ({ t: b.t || new Date(b.d + 'T12:00:00').getTime(), y: b.w, d: b.d }))
    .filter(p => cut === Infinity || now - p.t <= cut * 86400000)

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Body weight')}</h1></div>
      <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
    </div>

    {!current ? (
      <div className="card">
        <div className="muted small" style={{ marginBottom: 12 }}>{t("No entries yet — log your weight to start the curve. It's also asked before every workout.")}</div>
        <Button variant="primary" icon="scale" onClick={() => bwSheet()}>{t('Log body weight')}</Button>
      </div>
    ) : <>
      <div className="card whero">
        <div className="lbl2">{t('Current weight')}</div>
        <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
          <div className="big">{fmtNum(current.w)} <span className="muted" style={{ fontSize: '1rem' }}>{u}</span></div>
          {!!delta && <span className="row small" style={{ gap: 2, fontWeight: 500, color: bwDeltaColor(delta, current.w) }}>
            <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 12 }} />{fmtNum(Math.abs(delta))}
          </span>}
          {current.p && <span className="tag acc row" style={{ gap: 4 }}><Icon name="checkCircle" /> {t('Verified')}</span>}
        </div>
        <div className="small dim" style={{ marginTop: 2 }}>
          {fmtDate(current.d, true)}{previous ? ' · ' + t('previous {0} {1} on {2}', fmtNum(previous.w), u, fmtDate(previous.d)) : ''}
        </div>
        <div className="tiles" style={{ marginTop: 14, marginBottom: 0 }}>
          <div className="tile inset"><div className="l">{t('Since first weigh-in')}</div>
            <div className="v" style={{ fontSize: 20, color: total ? bwDeltaColor(total.delta, current.w) : undefined }}>{total ? (total.delta > 0 ? '+' : total.delta < 0 ? '−' : '±') + fmtNum(Math.abs(total.delta)) + ' ' + u : '—'}</div>
            {total && <div className="small dim">{t(total.days === 1 ? 'in {0} day' : 'in {0} days', total.days)}</div>}
          </div>
          <div className="tile inset"><div className="l">{t('Trend')}</div>
            <div className="v" style={{ fontSize: 20 }}>{rate === null ? '—' : (rate > 0 ? '+' : rate < 0 ? '−' : '±') + fmtNum(Math.abs(rate)) + ' ' + u}</div>
            <div className="small dim">{rate === null ? t('needs a few more weigh-ins') : t('per week (last 4 weeks)')}</div>
          </div>
        </div>
        {S.targetW && <div className="small row" style={{ marginTop: 10, gap: 6, color: 'var(--yellow)' }}>
          <Icon name="target" />
          <span>{eta === current.d ? t('Goal reached!') : eta ? t('At this pace you reach {0} {1} around {2}.', fmtNum(S.targetW), u, fmtDate(eta, true)) : t('Not heading toward your goal of {0} {1} yet.', fmtNum(S.targetW), u)}</span>
        </div>}
      </div>

      <WeightComparison S={S} />

      <div className="card">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{t('Chart')}</h2>
          <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--yellow)' } : undefined} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
        </div>
        <Segmented className="seg-inline" value={range} onChange={setRange}
          options={[{ value: '30', label: t('30 d') }, { value: '90', label: t('90 d') }, { value: '365', label: t('1 y') }, { value: 'all', label: t('All') }]} />
        <div className="chart" style={{ marginTop: 10 }}>
          {points.length ? <LineChart points={points} h={170} unit={u} goal={S.targetW} /> : <div className="muted small">{t('No weigh-ins in this period.')}</div>}
        </div>
      </div>

      <div className="card">
        <h2>{t('Verify the latest weigh-in')}</h2>
        <WeightPhotoUpload iso={current.d} flagged={!!current.p} />
      </div>
    </>}

    <Section title={t('For BMI')} footer={t('Height is only used for BMI and to estimate your walking stride.')}>
      <Row icon="ruler" iconTint="var(--teal)" title={t('Height')}>
        <CommitNumber className="rowfield" value={S.heightCm} placeholder="175"
          onCommit={v => update(s => { s.heightCm = v && v >= 100 && v <= 250 ? v : null })} aria-label={t('Height')} />
        <span className="muted small">cm</span>
      </Row>
    </Section>

    <WeightHistory S={S} />
  </div>
}
