// 7.1 — the Ideal body flow: three numbers (age → height → weight), then your ideal weight
// counts up by itself, then the goal you want (the ideal or your own, at the pace you pick),
// then the day laid out with times (DaySchedule.jsx).
import { useEffect, useState } from 'react'
import { useUI } from '../../store/useUI.js'
import { t, U, dateLocale } from '../../lib/i18n.js'
import { fmtNum, todayISO } from '../../lib/format.js'
import { fromKg, toKg } from '../../lib/weightTracker.js'
import { birthYearFor, goalPlan, MIN_AGE, MAX_AGE, MIN_HEIGHT, MAX_HEIGHT } from '../../lib/idealBody.js'
import { motionReduced } from '../../lib/a11y.js'
import { burst } from '../../lib/motion.js'
import Icon from '../Icon.jsx'
import CommitNumber from '../CommitNumber.jsx'
import { Segmented, Button } from '../ui.jsx'

const focusLater = id => setTimeout(() => { const el = typeof document !== 'undefined' && document.getElementById(id); if (el) el.focus() }, 80)
const W_LIM = { kg: [10, 300], lb: [22, 660] }
const dShort = iso => new Date(iso + 'T12:00:00').toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })

/** Counts up to `target` (with one decimal) when it first appears or changes. */
export function useCountUp(target, dur = 1100) {
  const [v, setV] = useState(target)
  useEffect(() => {
    if (target == null || motionReduced() || typeof requestAnimationFrame === 'undefined') { setV(target); return }
    let raf = 0
    const from = target * 0.6
    const t0 = performance.now()
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur)
      setV(Math.round((from + (target - from) * (1 - Math.pow(1 - p, 3))) * 10) / 10)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, dur])
  return v
}

/** Saves today's weigh-in (replacing one already made today). */
export function saveWeightToday(update, v) {
  const iso = todayISO()
  update(s => {
    const ex = s.bodyweight.find(b => b.d === iso)
    if (ex) { ex.w = v; ex.t = Date.now() } else s.bodyweight.push({ d: iso, w: v, t: Date.now() })
    s.bodyweight.sort((a, b) => (a.d < b.d ? -1 : 1))
  })
}

/* ---------------------------------------------------------------- 1 · 2 · 3 */
export function AboutYou({ S, update, age, sex, last, editing, setEditing }) {
  const unit = S.unit
  const u = U(unit)
  const ok = [age != null, !!S.heightCm, !!last]
  const cur = ok.indexOf(false)
  const done = ok.filter(Boolean).length
  const [bad, setBad] = useState(null)
  if (cur === -1 && !editing) {
    return <div className="card ib-me">
      <span className="ib-me-i" style={{ '--c': sex === 'female' ? 'var(--pink)' : 'var(--blue)' }}><Icon name="person" /></span>
      <div className="ib-me-chips">
        <span><b>{fmtNum(age)}</b> {t('years')}</span>
        <span><b>{fmtNum(S.heightCm)}</b> {U('cm')}</span>
        <span><b>{fmtNum(last.w)}</b> {u}</span>
      </div>
      <button className="ib-me-edit" onClick={() => setEditing(true)} aria-label={t('Edit')}><Icon name="pencil" /></button>
    </div>
  }
  const step = (i, id, icon, tint, title, hint, field) => <div className={'ib-step' + (ok[i] ? ' ok' : '') + (i === cur ? ' on' : '')} style={{ '--c': tint }}>
    <span className="ib-step-n">{ok[i] ? <Icon name="check" /> : i + 1}</span>
    <label className="ib-step-b" htmlFor={id}>
      <span className="ib-step-t"><Icon name={icon} /> {title}</span>
      {hint && <span className="ib-step-h">{hint}</span>}
    </label>
    <span className="ib-step-f">{field}</span>
  </div>
  const wLim = W_LIM[unit] || W_LIM.kg
  return <div className="card ib-setup">
    <div className="ib-setup-h">
      <div className="grow">
        <h2>{t('Tell us about you')}</h2>
        <div className="small muted">{t('Three numbers — your ideal weight appears by itself.')}</div>
      </div>
      <div className="ib-ring" style={{ '--p': (done / 3 * 100) + '%' }}><span>{done}/3</span></div>
    </div>
    <div className="ib-sex">
      <Segmented value={sex} onChange={v => update(s => { s.sex = v })}
        options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]} />
    </div>
    <div className="ib-steps">
      {step(0, 'ib-age', 'calendar', 'var(--orange)', t('Age'), bad === 'age' ? t('Enter an age from {0} to {1}.', MIN_AGE, MAX_AGE) : t('in years'),
        <><CommitNumber id="ib-age" className="rowfield ib-num" value={age} placeholder="30" autoFocus={cur === 0}
          onCommit={v => {
            const y = birthYearFor(v)
            if (v != null && y == null) { setBad('age'); return }
            setBad(null); update(s => { s.birthYear = y }); if (y && !S.heightCm) focusLater('ib-h')
          }} aria-label={t('Age')} /><span className="muted small">{t('years')}</span></>)}
      {step(1, 'ib-h', 'ruler', 'var(--teal)', t('Height'), bad === 'h' ? t('Enter a height from {0} to {1} cm.', MIN_HEIGHT, MAX_HEIGHT) : t('without shoes'),
        <><CommitNumber id="ib-h" className="rowfield ib-num" value={S.heightCm} placeholder="170"
          onCommit={v => {
            if (v != null && !(v >= MIN_HEIGHT && v <= MAX_HEIGHT)) { setBad('h'); return }
            setBad(null); update(s => { s.heightCm = v }); if (v && !last) focusLater('ib-w')
          }} aria-label={t('Height')} /><span className="muted small">{U('cm')}</span></>)}
      {step(2, 'ib-w', 'scale', 'var(--purple)', t('Weight'), bad === 'w' ? t('Enter a weight from {0} to {1} {2}.', wLim[0], wLim[1], u) : t('your weight today'),
        <><CommitNumber id="ib-w" className="rowfield ib-num" value={last ? last.w : null} placeholder={unit === 'lb' ? '160' : '70'} decimal
          onCommit={v => {
            if (v == null) return
            if (!(v >= wLim[0] && v <= wLim[1])) { setBad('w'); return }
            setBad(null); saveWeightToday(update, Math.round(v * 10) / 10)
            if (editing) setEditing(false)
          }} aria-label={t('Weight')} /><span className="muted small">{u}</span></>)}
    </div>
    <div className="ib-bar"><i style={{ width: (done / 3 * 100) + '%' }} /></div>
    {cur === -1 && <div className="ib-setup-a"><Button variant="primary" icon="checkCircle" onClick={() => setEditing(false)}>{t('Done')}</Button></div>}
  </div>
}

/** Before the three numbers are in: a soft preview of what is coming. */
export function RevealSoon({ done }) {
  const parts = [['scale', 'Your ideal weight'], ['target', 'Your goal'], ['calendar', 'Your day: workouts, meals and water with times']]
  return <div className="card ib-soon">
    {parts.map(([icon, label], i) => <div key={label} className={'ib-soon-r' + (i < done ? ' lit' : '')} style={{ animationDelay: i * 120 + 'ms' }}>
      <span className="ib-soon-i"><Icon name={icon} /></span><span className="grow">{t(label)}</span><span className="ib-soon-s" />
    </div>)}
  </div>
}

/* ---------------------------------------------------------------- the goal */
export function GoalCard({ S, update, r, u, w, unit, last }) {
  const target = S.targetW != null ? toKg(S.targetW, unit) : null
  const custom = target != null && Math.abs(target - r.ideal) >= 0.05
  const [own, setOwn] = useState(custom)
  const g = goalPlan(r, target)
  if (!g) return null
  const setTarget = kg => {
    const disp = Math.round(fromKg(kg, unit) * 10) / 10
    update(s => {
      s.targetW = disp; s.targetFrom = last ? last.w : null
      const p = goalPlan(r, kg)
      s.bodyPlan = p && p.weeks > 0 ? { start: todayISO(), fromKg: r.weightKg, toKg: p.toKg, weeklyKg: p.rate } : null
    })
    useUI.getState().toast(t('Goal set to {0} {1}', fmtNum(disp), U(unit)))
  }
  const pick = v => {
    setOwn(v === 'own')
    if (v === 'ideal' && custom) setTarget(r.ideal)
  }
  const lo = Math.min(r.weightKg, g.toKg, r.ideal), hi = Math.max(r.weightKg, g.toKg, r.ideal)
  const pad = Math.max(1, (hi - lo) * 0.12)
  const pos = v => ((v - lo + pad) / (hi - lo + 2 * pad)) * 100
  const dirTxt = g.dir === 'keep' ? t('Keep your weight') : g.dir === 'lose' ? t('Lose {0} {1}', w(Math.abs(g.diffKg)), u) : t('Gain {0} {1}', w(Math.abs(g.diffKg)), u)
  const wl = W_LIM[unit] || W_LIM.kg
  return <div className="card ib-goal">
    <div className="row between"><h2 style={{ margin: 0 }}><Icon name="target" /> {t('Your goal')}</h2><span className={'ib-dir ' + g.dir}>{dirTxt}</span></div>
    <div className="ib-goal-pick">
      <Segmented value={own ? 'own' : 'ideal'} onChange={pick}
        options={[{ value: 'ideal', label: t('Ideal weight') }, { value: 'own', label: t('My own') }]} />
    </div>
    {own && <div className="ib-own">
      <span>{t('Target weight')}</span>
      <CommitNumber className="rowfield ib-num" decimal value={S.targetW} placeholder={w(r.ideal)}
        onCommit={v => { if (v != null && v >= wl[0] && v <= wl[1]) setTarget(toKg(v, unit)) }} aria-label={t('Target weight')} />
      <span className="muted small">{u}</span>
    </div>}
    <div className="ib-track" aria-hidden="true">
      <span className="ib-track-fill" style={{ insetInlineStart: Math.min(pos(r.weightKg), pos(g.toKg)) + '%', width: Math.abs(pos(g.toKg) - pos(r.weightKg)) + '%' }} />
      <span className="ib-pin now" style={{ insetInlineStart: pos(r.weightKg) + '%' }}><b>{w(r.weightKg)}</b><i>{t('Now')}</i></span>
      {!g.ideal && <span className="ib-pin ideal" style={{ insetInlineStart: pos(r.ideal) + '%' }}><b>{w(r.ideal)}</b><i>{t('Ideal')}</i></span>}
      <span className="ib-pin goal" style={{ insetInlineStart: pos(g.toKg) + '%' }}><b>{w(g.toKg)}</b><i>{t('Goal')}</i></span>
    </div>
    {!r.child && g.dir !== 'keep' && <div className="ib-pace">
      <span className="small muted">{t('Pace')}</span>
      <Segmented value={S.bodyPace || 'normal'} onChange={v => update(s => { s.bodyPace = v; if (s.bodyPlan) s.bodyPlan = null })}
        options={[{ value: 'slow', label: t('Gentle') }, { value: 'normal', label: t('Normal') }, { value: 'fast', label: t('Faster') }]} />
    </div>}
    <div className="ib-goal-row">
      <div><b>{g.weeks || '—'}</b><span>{t(g.weeks === 1 ? 'week' : 'weeks')}</span></div>
      <div><b>{g.rate ? w(g.rate) : '0'}</b><span>{t('{0} a week', u)}</span></div>
      <div><b>{g.etaIso ? dShort(g.etaIso) : '—'}</b><span>{t('finish')}</span></div>
      <div><b>{fmtNum(g.kcal)}</b><span>{t('kcal / day')}</span></div>
    </div>
    {!g.ideal && (g.toKg < r.healthyKg[0] - 0.05 || g.toKg > r.healthyKg[1] + 0.05) && <div className="ib-warn">
      <Icon name="info" /><span className="grow">{t('This target is outside the healthy range for your height ({0}–{1} {2}).', w(r.healthyKg[0]), w(r.healthyKg[1]), u)}</span>
      <button className="h2link" onClick={() => { setOwn(false); setTarget(r.ideal) }}>{t('Use the ideal')}</button>
    </div>}
    {g.grow && <div className="ib-note"><Icon name="sparkles" /> {t('Growing children are not put on a diet: keep the weight steady, move every day and the height catches up.')}</div>}
    {g.capped && <div className="ib-note"><Icon name="info" /> {t('Calories stop at a safe minimum of {0} kcal a day, so this pace is a little slower.', fmtNum(r.floor))}</div>}
    {g.dir !== 'keep' && !S.bodyPlan && <div className="ib-goal-a">
      <Button variant="primary" icon="flag" onClick={e => { setTarget(g.toKg); burst(e.currentTarget, { count: 16 }) }}>{t('Start the plan')}</Button>
    </div>}
  </div>
}
