// 11.0 — "From Zakho to Fao": all your steps as a walk across Iraq, on a small map — the road from
// the north to the Gulf, the cities you have passed, where you are now and the next stop.
// And the last five weeks of steps as a calendar, each day shaded by how close it came to the goal.
// Maths: lib/journey.js.
import { useMemo } from 'react'
import { t, dateLocale, U } from '../../lib/i18n.js'
import { isoOf } from '../../lib/format.js'
import { IRAQ_ROUTE, ROUTE_KM, journeyFor, mapXY, pointAt } from '../../lib/journey.js'
import { stepsOn, goalOf } from '../../lib/stepMetrics.js'
import Icon from '../Icon.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())

export default function JourneyCard({ S }) {
  const j = useMemo(() => journeyFor(S), [S])
  const pts = IRAQ_ROUTE.map(mapXY)
  const here = pointAt(j.at)
  // the road walked so far on this trip: the stops passed, then where you are
  const walked = [...pts.slice(0, j.passed), here]
  const line = p => p.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ')
  return <div className="card jr" aria-label={t('From Zakho to Fao')}>
    <div className="jr-h">
      <span className="jr-ic"><Icon name="route" /></span>
      <div className="grow"><h2>{t('From Zakho to Fao')}</h2><div className="small muted">{t('Every step you’ve counted, walked across Iraq')}</div></div>
      {j.lap > 1 && <span className="jr-lap">{t('Lap {0}', n0(j.lap))}</span>}
    </div>
    <div className="jr-body">
      <svg className="jr-map" viewBox="-6 -6 112 152" aria-hidden="true">
        <path d={line(pts)} className="jr-road" />
        <path d={line(walked)} className="jr-done" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 0 || i === pts.length - 1 ? 3.4 : 2.4} className={'jr-stop' + (i < j.passed ? ' on' : '')} />)}
        <circle cx={here[0]} cy={here[1]} r="7" className="jr-pulse" />
        <circle cx={here[0]} cy={here[1]} r="4.2" className="jr-me" />
      </svg>
      <div className="jr-t">
        <div className="jr-km"><b>{n1(j.at)}</b><span>{U('km')}</span></div>
        <div className="small muted">{t('of {0} km', n0(ROUTE_KM))} · {t('{0} steps in all', n0(j.steps))}</div>
        <div className="jr-bar"><i style={{ width: Math.min(100, j.pct * 100) + '%' }} /></div>
        <div className="small">{t('{0}% of the way', n0(j.pct * 100))}</div>
        {j.next
          ? <div className="jr-next"><Icon name="location" /><span>{t('Next stop: {0}', t(j.next.name))}<small className="muted">{t('in {0} km', n1(j.toGo))}</small></span></div>
          : <div className="jr-next"><Icon name="trophy" /><span>{t('You reached Fao!')}</span></div>}
      </div>
    </div>
    <div className="jr-stops scroll">
      {IRAQ_ROUTE.map((s, i) => <span key={s.name} className={'jr-chip' + (i < j.passed ? ' on' : i === j.passed ? ' next' : '')}>
        {i < j.passed && <Icon name="check" />}{t(s.name)}<small>{n0(s.at)}</small>
      </span>)}
    </div>
  </div>
}

/** The last five weeks of steps, a square per day (today last), shaded by the goal. */
export function StepMonth({ S, today }) {
  const goal = goalOf(S)
  const days = []
  const d0 = new Date(today + 'T12:00:00')
  for (let i = 34; i >= 0; i--) { const d = new Date(d0); d.setDate(d0.getDate() - i); const iso = isoOf(d); days.push({ iso, n: stepsOn(S, iso), day: d.getDate() }) }
  const lvl = n => (!n ? 0 : n >= goal ? 4 : n >= goal * 0.75 ? 3 : n >= goal * 0.4 ? 2 : 1)
  const hit = days.filter(x => x.n >= goal).length
  const total = days.reduce((a, x) => a + x.n, 0)
  return <div className="card">
    <div className="row between" style={{ marginBottom: 8 }}>
      <h2 style={{ margin: 0 }}>{t('Last 5 weeks')}</h2>
      <span className="small muted">{t('Goal met')} {n0(hit)} / {n0(days.length)}</span>
    </div>
    <div className="jr-month" role="img" aria-label={t('Last 5 weeks')}>
      {days.map(x => <span key={x.iso} className={'jr-d l' + lvl(x.n) + (x.iso === today ? ' today' : '')} title={x.iso + ' · ' + n0(x.n)}><small>{n0(x.day)}</small></span>)}
    </div>
    <div className="jr-month-f small muted"><span>{t('Total')} <b>{n0(total)}</b></span><span className="jr-legend">{[0, 1, 2, 3, 4].map(l => <i key={l} className={'jr-d l' + l} />)}</span></div>
  </div>
}
