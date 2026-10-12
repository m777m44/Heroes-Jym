import { useStore } from '../store/useStore.js'
import { todayISO, DAYS } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { nav } from '../lib/nav.js'
import {
  CONTAINERS, CONTAINER_NAME, CONTAINER_COUNT, containerOf, waterGoalMlOf, mlOn, waterDays, waterStreak, countIn,
  waterRemindPrefs, nextReminder,
} from '../lib/water.js'
import Icon from './Icon.jsx'
import { ContainerIcon, Vessel, drink, undoLast, useWaterUndo, fmtMl } from './water/WaterParts.jsx'

// Home → Water (2.5): the glass fills as you drink; one tap per container — glass (كلاص),
// cup (كوب), can (علبة), bottle — with Undo; ml against the goal, the count in your usual
// container, the next reminder, the week and the streak. Details and settings on /water.
export default function WaterCard() {
  const S = useStore(s => s.S)
  const canUndo = useWaterUndo(s => s.stack.length > 0)
  const iso = todayISO()
  const goal = waterGoalMlOf(S)
  const ml = mlOn(S, iso)
  const unit = containerOf(S)
  const days = waterDays(S, iso, 7)
  const streak = waterStreak(S, iso)
  const done = ml >= goal
  const pct = ml / goal
  const max = Math.max(goal, ...days.map(d => d.ml), 1)
  const rp = waterRemindPrefs(S)
  const next = rp.on && !done ? nextReminder(rp, new Date()) : null
  const time = d => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })

  return <div className={'card water-card' + (done ? ' done' : '')}>
    <div className="row between" style={{ marginBottom: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="lrow-i" style={{ '--tint': 'var(--blue)' }}><Icon name="drop" /></span>
        <h2 style={{ margin: 0 }}>{t('Water')}</h2>
      </div>
      <button className="water-goal" onClick={() => nav('/water')}>
        <Icon name={rp.on ? 'bell' : 'target'} />{fmtMl(goal)} {t('ml')}<Icon name="chevronRight" className="icn-dir" />
      </button>
    </div>

    <div className="water-hero">
      <Vessel pct={pct} size={78} label={t('{0} of {1} ml', fmtMl(ml), fmtMl(goal))} />
      <div className="water-nums">
        <div className="big">{fmtMl(ml)}<span className="muted" style={{ fontSize: '1rem' }}> / {fmtMl(goal)} {t('ml')}</span></div>
        <div className="small muted">
          {t(CONTAINER_COUNT[unit.key], countIn(ml, unit).toLocaleString(dateLocale()))} · {Math.min(999, Math.round(pct * 100))}%
        </div>
        <div className="water-bar"><i style={{ width: Math.min(100, pct * 100) + '%' }} /></div>
        <div className="small" style={{ marginTop: 4 }}>
          {done ? <span className="water-ok"><Icon name="checkCircle" /> {t('Goal reached!')}</span>
            : next ? <span className="muted"><Icon name="bell" /> {t('Next reminder {0}', time(next))}</span>
              : <span className="muted">{t('{0} ml to go', fmtMl(goal - ml))}</span>}
        </div>
      </div>
    </div>

    <div className="water-chips" role="group" aria-label={t('Add a drink')}>
      {CONTAINERS.map(c => (
        <button key={c.key} className={'wchip' + (c.key === unit.key ? ' sel' : '')} onClick={() => drink(c)}
          aria-label={t('Add a {0}', t(CONTAINER_NAME[c.key])) + ` (${fmtMl(c.ml)} ${t('ml')})`}>
          <ContainerIcon kind={c.key} />
          <span className="wchip-n">{t(CONTAINER_NAME[c.key])}</span>
          <span className="wchip-ml">+{fmtMl(c.ml)}</span>
        </button>
      ))}
    </div>

    <div className="row between" style={{ marginTop: 12 }}>
      <div className="water-week" aria-hidden="true">
        {days.map(d => <div key={d.iso} className={'ww' + (d.iso === iso ? ' today' : '')}>
          <span className="ww-bar"><i style={{ height: Math.round(d.ml / max * 100) + '%', background: d.ml >= goal ? 'var(--blue)' : 'color-mix(in srgb,var(--blue) 45%,transparent)' }} /></span>
          <span className="ww-l">{t(DAYS[d.dow])}</span>
        </div>)}
      </div>
      <div className="row" style={{ gap: 8 }}>
        {streak > 1 && <span className="small muted"><Icon name="flame" style={{ color: 'var(--orange)' }} /> {t('{0} days in a row', streak)}</span>}
        <button className="iconbtn" onClick={undoLast} disabled={!canUndo} aria-label={t('Undo')}><Icon name="reset" /></button>
      </div>
    </div>
  </div>
}
