import { fmtNum, fmtDate } from '../../lib/format.js'
import { t, U } from '../../lib/i18n.js'
import { compareLatest, goalProgress, goalStart, bmi, bmiCategory } from '../../lib/weightTracker.js'
import { bwDeltaColor } from '../../sheets.jsx'
import Icon from '../Icon.jsx'

const BMI_LABEL = { under: 'Underweight', normal: 'Healthy range', over: 'Overweight', obese: 'Obesity' }
const BMI_TINT = { under: 'var(--blue)', normal: 'var(--acc)', over: 'var(--orange)', obese: 'var(--red)' }

/** Previous vs current vs goal, the progress bar between start and goal, and BMI. */
export default function WeightComparison({ S }) {
  const { current, previous, delta } = compareLatest(S.bodyweight)
  const u = U(S.unit)          // label only — the math uses S.unit
  if (!current) return null
  const target = S.targetW
  const start = goalStart(S)
  const prog = target ? goalProgress(start, current.w, target) : null
  const left = target ? target - current.w : null
  const reached = target && Math.abs(left) < 0.05
  const b = bmi(current.w, S.unit, S.heightCm)
  const cat = bmiCategory(b)
  return (
    <div className="card wcmp">
      <h2>{t('Comparison')}</h2>
      <div className="wcmp-row">
        <span className="l">{t('Previous weight')}</span>
        <span className="v">{previous ? <>{fmtNum(previous.w)} {u} <span className="dim small">· {fmtDate(previous.d)}</span></> : '—'}</span>
      </div>
      <div className="wcmp-row">
        <span className="l">{t('Current weight')}</span>
        <span className="v"><b>{fmtNum(current.w)} {u}</b> <span className="dim small">· {fmtDate(current.d)}</span></span>
      </div>
      {delta !== null && (
        <div className="wcmp-row">
          <span className="l">{t('Difference')}</span>
          <span className="v row" style={{ gap: 3, justifyContent: 'flex-end', color: bwDeltaColor(delta, current.w) }}>
            {delta ? <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 13 }} /> : null}
            {delta ? fmtNum(Math.abs(delta)) + ' ' + u : t('No change')}
          </span>
        </div>
      )}
      <div className="wcmp-row">
        <span className="l">{t('Goal')}</span>
        <span className="v" style={target ? { color: 'var(--yellow)' } : null}>{target ? fmtNum(target) + ' ' + u : '—'}</span>
      </div>
      {target && prog !== null && <>
        <div className="wprog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(prog * 100)}>
          <span style={{ width: Math.round(prog * 100) + '%' }} />
        </div>
        <div className="small row between" style={{ marginTop: 6 }}>
          <span className="dim">{t('Start')} {fmtNum(start)} {u}</span>
          <span style={{ color: reached ? 'var(--acc)' : 'var(--label-2)', fontWeight: 500 }}>
            {reached ? t('Goal reached!') : t(left > 0 ? '{0} to gain' : '{0} to lose', fmtNum(Math.abs(left)) + ' ' + u) + ' · ' + Math.round(prog * 100) + '%'}
          </span>
        </div>
      </>}
      {b !== null && (
        <div className="wcmp-row" style={{ marginTop: 10 }}>
          <span className="l">{t('BMI')}</span>
          <span className="v"><b>{fmtNum(b)}</b> <span className="small" style={{ color: BMI_TINT[cat] }}>· {t(BMI_LABEL[cat])}</span></span>
        </div>
      )}
    </div>
  )
}
