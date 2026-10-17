import { usePedometer } from '../../store/usePedometer.js'
import { distanceKm } from '../../lib/stepMetrics.js'
import { achievements } from '../../lib/achievements.js'
import { fmtDuration } from '../../lib/liveClock.js'
import { t, dateLocale, U } from '../../lib/i18n.js'
import Icon from '../Icon.jsx'

const fmt = n => Math.round(n).toLocaleString(dateLocale())
// 10K / 1M — or "10 ألف" / "1 مليون" in Arabic: the phone's own short notation.
const compact = n => { try { return new Intl.NumberFormat(dateLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n) } catch { return fmt(n) } }

/** Steps per minute from a speed in km/h and a stride in metres. */
export const cadenceOf = (kmh, strideM) => (kmh > 0 && strideM > 0 ? Math.round(kmh * 1000 / 60 / strideM) : 0)

// The current walk: its own counter beside the day's total — "New walk" starts it from zero
// without touching the day.
export function WalkSession({ now, stride, tracking, speed, moving }) {
  const steps = usePedometer(s => s.sessionSteps)
  const start = usePedometer(s => s.sessionStart)
  const ms = tracking && start ? Math.max(0, now.getTime() - start) : 0
  const mins = ms / 60000
  const avg = mins >= 0.5 ? Math.round(steps / mins) : 0
  const live = tracking && moving ? cadenceOf(speed, stride) : 0
  return <div className="card walk-session">
    <div className="row between" style={{ marginBottom: 8 }}>
      <h2 style={{ margin: 0 }}>{t('This walk')}</h2>
      <button className="chip" onClick={() => usePedometer.getState().newWalk()}><Icon name="reset" /> {t('New walk')}</button>
    </div>
    <div className="walk-week walk-session-grid">
      <div><span className="l">{t('steps')}</span><b>{fmt(steps)}</b></div>
      <div><span className="l">{t('Time')}</span><b className="mono" dir="ltr">{fmtDuration(ms, { alwaysHours: true })}</b></div>
      <div><span className="l">{t('Distance')}</span><b>{distanceKm(steps, stride).toFixed(2)} <span className="u">{U('km')}</span></b></div>
      <div><span className="l">{t('Cadence')}</span><b>{fmt(live || avg)} <span className="u">{t('steps/min')}</span></b></div>
    </div>
  </div>
}

const ICON = { day: 'figureWalk', total: 'route', streak: 'flame' }
const TINT = { day: 'var(--green)', total: 'var(--blue)', streak: 'var(--orange)' }
const label = a => a.kind === 'day' ? t('{0} steps in one day', fmt(a.need))
  : a.kind === 'total' ? t('{0} steps in total', fmt(a.need))
    : t(a.need === 1 ? '{0} day streak' : '{0} days streak', a.need)

// Badges from the step history: best day, lifetime steps, goal streaks.
export function Achievements({ S, today }) {
  const list = achievements(S, today)
  const won = list.filter(a => a.done).length
  return <div className="card">
    <div className="row between" style={{ marginBottom: 10 }}>
      <h2 style={{ margin: 0 }}>{t('Achievements')}</h2>
      <span className="small muted">{t('{0} of {1} unlocked', won, list.length)}</span>
    </div>
    <div className="badges">
      {list.map(a => <div key={a.id} className={'badge' + (a.done ? ' won' : '')} style={{ '--tint': TINT[a.kind] }} title={label(a)}>
        <span className="badge-ic"><Icon name={a.done ? ICON[a.kind] : 'lock'} /></span>
        <b>{a.kind === 'streak' ? a.need : compact(a.need)}</b>
        <span className="badge-l">{label(a)}</span>
        {!a.done && <span className="badge-bar"><i style={{ width: Math.min(100, Math.floor(a.have / a.need * 100)) + '%' }} /></span>}
      </div>)}
    </div>
  </div>
}
