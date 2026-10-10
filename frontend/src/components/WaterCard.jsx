import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO, DAYS, fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { GLASS_ML, WATER_GOALS, waterGoalOf, glassesOn, setGlasses, waterDays, waterStreak } from '../lib/water.js'
import Icon from './Icon.jsx'
import { Segmented } from './ui.jsx'

// Home → Water: tap the drops to log glasses (250 ml), see the last seven days and the streak.
// Stored per day in S.water, on the device — no connection involved.
export default function WaterCard() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const iso = todayISO()
  const goal = waterGoalOf(S)
  const n = glassesOn(S, iso)
  const days = waterDays(S, iso, 7)
  const streak = waterStreak(S, iso)
  const done = n >= goal
  const set = v => update(s => setGlasses(s, iso, v), 'lazy')
  // tap a drop: fill up to it — tapping the last full one empties it again
  const tap = i => set(i + 1 === n ? i : i + 1)
  const max = Math.max(goal, ...days.map(d => d.n), 1)

  const goalSheet = () => useUI.getState().openSheet(close => <>
    <h3>{t('Daily water goal')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('One glass = {0} ml', GLASS_ML)}</div>
    <Segmented options={WATER_GOALS.map(g => ({ value: g, label: String(g) }))} value={goal}
      onChange={v => { update(s => { s.waterGoal = v }); close() }} />
  </>)

  return <div className={'card water-card' + (done ? ' done' : '')}>
    <div className="row between" style={{ marginBottom: 10 }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="lrow-i" style={{ '--tint': 'var(--blue)' }}><Icon name="drop" /></span>
        <h2 style={{ margin: 0 }}>{t('Water')}</h2>
      </div>
      <button className="water-goal" onClick={goalSheet}><Icon name="target" />{t('{0} glasses', goal)}</button>
    </div>
    <div className="row" style={{ gap: 8, alignItems: 'baseline', marginBottom: 10 }}>
      <div className="big">{fmtNum(n)}<span className="muted" style={{ fontSize: '1rem' }}> / {fmtNum(goal)}</span></div>
      <span className="small muted">{fmtNum(n * GLASS_ML)} {t('ml')}</span>
      {done && <span className="tag water-tag"><Icon name="checkCircle" />{t('Goal reached!')}</span>}
    </div>
    <div className="water-drops" role="group" aria-label={t('Water')}>
      {Array.from({ length: Math.max(goal, n) }, (_, i) => (
        <button key={i} className={'wd' + (i < n ? ' on' : '') + (i >= goal ? ' extra' : '')} onClick={() => tap(i)}
          aria-label={t('{0} glasses', i + 1)}><Icon name="drop" /></button>
      ))}
    </div>
    <div className="row between" style={{ marginTop: 12 }}>
      <div className="water-week" aria-hidden="true">
        {days.map(d => <div key={d.iso} className={'ww' + (d.iso === iso ? ' today' : '')}>
          <span className="ww-bar"><i style={{ height: Math.round(d.n / max * 100) + '%', background: d.n >= goal ? 'var(--blue)' : 'color-mix(in srgb,var(--blue) 45%,transparent)' }} /></span>
          <span className="ww-l">{t(DAYS[d.dow])}</span>
        </div>)}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="iconbtn" onClick={() => set(n - 1)} disabled={!n} aria-label={t('Remove a glass')}><Icon name="minus" /></button>
        <button className="iconbtn water-plus" onClick={() => set(n + 1)} aria-label={t('Add a glass')}><Icon name="plus" /></button>
      </div>
    </div>
    {streak > 1 && <div className="small muted" style={{ marginTop: 8 }}><Icon name="flame" style={{ color: 'var(--orange)' }} /> {t('{0} days in a row', streak)}</div>}
  </div>
}
