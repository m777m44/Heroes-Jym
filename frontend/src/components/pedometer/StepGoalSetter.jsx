import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { usePedometer } from '../../store/usePedometer.js'
import { GOAL_SUGGESTIONS, clampGoal, goalOf, lastDays } from '../../lib/stepMetrics.js'
import { todayISO } from '../../lib/format.js'
import { t, dateLocale } from '../../lib/i18n.js'
import { NumberField, Button } from '../ui.jsx'

// Daily step goal: type any number, or tap a suggestion. The "your average" chip is the
// adaptive option — last week's average rounded up, a goal you are already close to.
function StepGoalSetter({ close }) {
  const st = useStore(s => s.S)
  const [v, setV] = useState(goalOf(st))
  const week = lastDays(st, todayISO(), 7).filter(d => d.n > 0)
  const avg = week.length ? Math.round(week.reduce((a, d) => a + d.n, 0) / week.length) : 0
  const adaptive = avg >= 1000 ? clampGoal(Math.ceil(avg * 1.1 / 500) * 500) : null
  const fmt = n => n.toLocaleString(dateLocale())
  const save = () => {
    const g = clampGoal(v)
    useStore.getState().update(s => { s.stepGoal = g })
    usePedometer.getState().prefsChanged('goal')
    close()
    useUI.getState().toast(t('Step goal: {0}', fmt(g)))
  }
  return <>
    <h3>{t('Daily step goal')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Shown on the ring, in the step notification and in your reminders. Change it anytime.')}</div>
    <div className="goalfield">
      <NumberField value={v} decimal={false} onChange={n => setV(n)} aria-label={t('Daily step goal')} />
      <span className="muted">{t('steps')}</span>
    </div>
    <div className="chips" style={{ flexWrap: 'wrap', justifyContent: 'center', margin: '12px 0 4px' }}>
      {GOAL_SUGGESTIONS.map(g => <button key={g} className={'chip' + (v === g ? ' on' : '')} onClick={() => setV(g)}>{fmt(g)}</button>)}
    </div>
    {adaptive && !GOAL_SUGGESTIONS.includes(adaptive) && (
      <div className="chips" style={{ justifyContent: 'center', marginBottom: 4 }}>
        <button className={'chip' + (v === adaptive ? ' on' : '')} onClick={() => setV(adaptive)}>{t('{0} — a step above your average', fmt(adaptive))}</button>
      </div>
    )}
    {avg > 0 && <div className="dim small" style={{ textAlign: 'center', margin: '6px 0 12px' }}>{t('Your average this week: {0}', fmt(avg))}</div>}
    <Button variant="primary" onClick={save}>{t('Save goal')}</Button>
  </>
}

export const stepGoalSheet = () => useUI.getState().openSheet(close => <StepGoalSetter close={close} />)
