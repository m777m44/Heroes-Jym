import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DAYN, uid, exCount, weekOrder, weekStartOf } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, loadStarterPlan, planToolsSheet, setSixDayWeek } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'
import { coachAvailable } from '../lib/coach.js'
import { routineLabel, routineColor, colorVar, softVar, starterKind, hasSixDaySplit } from '../lib/routines.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const update = useStore(s => s.update)
  const coachOn = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE })
  const days = weekOrder(weekStartOf(S))
  const todayDow = new Date().getDay()
  const trainDays = days.filter(d => S.routines.some(x => x.id === S.week[d])).length
  // offered when the plan has starter routines but another week layout
  const offerSplit = S.routines.some(starterKind) && !hasSixDaySplit(S)

  const addRoutine = () => {
    const r = { id: uid(), name: 'New routine', emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  return <>
    <div className="hdr">
      <div><h1>{t('Plan')}</h1><div className="sub">{t('Your weekly routine')}</div></div>
      {coachOn && <button className="iconbtn" onClick={() => nav('/coach')} aria-label={t('Coach')} title={t('Coach')}><Icon name="sparkles" /></button>}
      <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
    </div>
    <div className="cols"><div>
      <h4 className="sec">{t('Week schedule')}</h4>
      <div className="list week-plan" style={{ display: 'flex', flexDirection: 'column' }}>
        {days.map(d => {
          const r = S.routines.find(x => x.id === S.week[d])
          const c = r ? routineColor(r) : null
          return <div key={d} className={'item wp-day' + (d === todayDow ? ' is-today' : '')} onClick={() => dayAssignSheet(d)}>
            <span className="wp-bar" style={{ background: c ? colorVar(c) : 'var(--surface-3)' }} />
            <div className="grow"><div className="tt">{t(DAYN[d])}{d === todayDow && <span className="wp-today">{t('Today')}</span>}</div></div>
            {r ? <span className="tag" style={{ background: softVar(c), color: colorVar(c) }}><Icon name={glyphOf(r.emoji)} />{routineLabel(r.name)}</span>
              : <span className="tag"><Icon name="moon" />{t('Rest')}</span>}
            <Icon name="chevronRight" className="chev" /></div>
        })}
      </div>
      <div className="wp-summary">
        <span><i style={{ background: 'var(--acc)' }} />{t(trainDays === 1 ? '{0} training day' : '{0} training days', trainDays)}</span>
        <span><i style={{ background: 'var(--surface-3)' }} />{t(7 - trainDays === 1 ? '{0} rest day' : '{0} rest days', 7 - trainDays)}</span>
      </div>
      {offerSplit && <Button size="sm" variant="tinted" icon="calendar" className="wp-split" onClick={setSixDayWeek}>{t('Use the 6-day split (Sat–Thu, Friday off)')}</Button>}
    </div><div>
      <div className="row between" style={{ marginTop: 22, marginBottom: 10 }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Routines')}</h4>
        <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
      </div>
      {S.routines.length ? <div className="list">{S.routines.map(r => <div key={r.id} className="item" onClick={() => nav('/plan/r/' + r.id)}>
        <span className="lrow-i" style={{ '--tint': colorVar(routineColor(r)) }}><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow"><div className="tt">{routineLabel(r.name)}</div><div className="ss">{exCount(r.ex.length)}</div></div>
        <Icon name="chevronRight" className="chev" /></div>)}</div> : <>
        <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Create one or load the starter plan.')}</div>
        <Button icon="sparkles" onClick={loadStarterPlan}>{t('Load starter plan (Push / Pull / Legs)')}</Button>
      </>}
    </div></div>
  </>
}
