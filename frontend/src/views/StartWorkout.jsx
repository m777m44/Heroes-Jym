// 4.0 — "Start" opens a choice: train at home WITHOUT equipment, or at the gym WITH it.
//   /start                 today's routine / plan, the two sections, a suggestion, recent sessions
//   /start/:mode           the categories of a section (home: + walk & run; gym: + equipment)
//   /start/:mode/:cat      a quick session (4 / 6 / 8 exercises, shuffle) or pick your own
// The sessions are one-off routines (lib/workoutCategories.js) started through the usual flow —
// the weight check-in, then the workout screen — so history, PRs and the rest timer all work.
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { planFor, planRoutine, programOf } from '../lib/dailyPlan.js'
import { todayISO, fmtNum } from '../lib/format.js'
import { routineLabel, softVar, colorVar } from '../lib/routines.js'
import {
  CATEGORIES, EQ_GROUPS, categoryOf, exercisesOf, countOf, sectionCount,
  pickExercises, sessionRoutine, sessionMinutes, suggestion, prescribe,
} from '../lib/workoutCategories.js'
import { t, exName } from '../lib/i18n.js'
import { startFlow, exerciseDetailSheet } from '../sheets.jsx'
import { Thumb } from '../components/Media.jsx'
import ExName from '../components/ExName.jsx'
import Icon from '../components/Icon.jsx'
import { Button, BackButton, Segmented, Check } from '../components/ui.jsx'
import { burnTarget, savedBurnPlan } from '../lib/burnPlan.js'
import { goalProgress } from '../lib/calorieCalc.js'
import { bodyKg } from '../lib/water.js'

/** 4.2 — today's calorie burn: the target (from the calculator), the calculator, the burn plan. */
function BurnCard({ S, nav, mode = null }) {
  const iso = todayISO()
  const target = burnTarget(S, iso)
  const prog = goalProgress(S.calGoal, iso)
  const live = prog && !prog.over && !prog.before
  const saved = savedBurnPlan(S, bodyKg(S) || 70)
  if (mode) return <button className="card startw-today burn-entry" onClick={() => nav('/burn/' + mode)}>
    <span className="startw-ico" style={{ background: 'var(--orange)' }}><Icon name="flame" /></span>
    <span className="grow"><b>{t('Burn plan: {0} kcal', fmtNum(target))}</b><span className="small muted">{t('Pick exercises — the minutes are worked out for you')}</span></span>
    <Icon name="chevronRight" className="chev" />
  </button>
  return <div className="card burn-today">
    <div className="row between">
      <div className="grow">
        <div className="lbl2">{t('Today’s calorie burn')}</div>
        <div className="burn-target-v"><Icon name="flame" /><b>{fmtNum(target)}</b> <span>{t('kcal')}</span></div>
        <div className="small muted">{live ? t('From your calorie goal — day {0} of {1}', prog.day, prog.days) : t('Set a goal with the calorie calculator')}</div>
      </div>
    </div>
    <div className="burn-today-b">
      <Button size="sm" variant="tinted" icon="calculator" onClick={() => nav('/calories')}>{t('Calorie calculator')}</Button>
      <Button size="sm" variant="primary" icon="flame" onClick={() => nav(saved ? '/burn/review' : '/burn/home')}>{saved ? t('My burn plan') : t('Burn plan')}</Button>
    </div>
  </div>
}

const MODE_INFO = {
  home: { title: 'Without equipment', sub: 'At home — no equipment needed', icon: 'house', tags: ['HIIT', 'Cardio', 'Abs & core', 'Stretching & yoga', 'Walk & run'] },
  gym: { title: 'With equipment', sub: 'At the gym — barbells, dumbbells and machines', icon: 'barbell', tags: ['Chest', 'Back muscles', 'Legs', 'Dumbbells', 'Machines'] },
}
const MAX_RECENT = 5
const daySeed = () => Math.floor(Date.now() / 864e5)
export const rxText = x => (x.mode === 'time' ? t('{0} × {1} s', x.sets, x.sec) : t('{0} × {1}', x.sets, x.reps))

/** Start a one-off session and remember it under "Recent". */
function go(routine, meta) {
  useStore.getState().update(s => {
    const key = meta.key
    s.recentSessions = [{ key, mode: meta.mode, cat: meta.cat || null, name: routine.name, color: routine.color, ex: routine.ex, at: Date.now() },
      ...(s.recentSessions || []).filter(x => x.key !== key)].slice(0, MAX_RECENT)
  })
  startFlow(null, routine)
}

/* ------------------------------------------------------------------ /start */
export default function StartWorkout() {
  const S = useStore(s => s.S)
  const nav = useNavigate()
  const iso = todayISO()
  const routine = effectiveRoutine(S, iso)
  const plan = useMemo(() => (S.planOn !== false ? planFor(S, iso) : null), [S, iso])
  const sug = suggestion(programOf(S))
  const sugCat = categoryOf(sug.mode, sug.cat)
  const sugEx = useMemo(() => pickExercises(sug.mode, sug.cat, { count: 6, seed: daySeed() }), [sug.mode, sug.cat])
  const sugRoutine = sessionRoutine(sug.mode, sug.cat, sugEx)
  const recent = (S.recentSessions || []).filter(x => x && Array.isArray(x.ex) && x.ex.length)

  return <div className="startw">
    <div className="hdr">
      <BackButton fallback="/home" />
      <div><h1>{t('Start your workout')}</h1><div className="sub">{t('Pick how you train today')}</div></div>
    </div>

    {S.active && <button className="card startw-today" onClick={() => nav('/workout')}>
      <span className="startw-ico" style={{ background: 'var(--acc)' }}><Icon name="play" /></span>
      <span className="grow"><b>{t('Resume')}</b><span className="small muted">{routineLabel(S.active.name)}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>}
    {!S.active && routine && routine.ex.length > 0 && <button className="card startw-today" onClick={() => startFlow(routine.id)}>
      <span className="startw-ico" style={{ background: 'var(--acc)' }}><Icon name="calendar" /></span>
      <span className="grow"><span className="small muted">{t('Today in your plan')}</span><b>{routineLabel(routine.name)}</b><span className="small muted">{t('{0} exercises', routine.ex.length)}</span></span>
      <span className="btn primary sm">{t('Start')}</span>
    </button>}
    {!S.active && !(routine && routine.ex.length) && plan && plan.exercises && plan.exercises.length > 0 && <button className="card startw-today" onClick={() => (plan.routineId ? startFlow(plan.routineId) : startFlow(null, planRoutine(plan)))}>
      <span className="startw-ico" style={{ background: colorVar(plan.color || 'green') }}><Icon name="target" /></span>
      <span className="grow"><span className="small muted">{t("Today's plan")}</span><b>{routineLabel(plan.title)}</b><span className="small muted">{t('{0} min', plan.minutes)} · {t('{0} exercises', plan.exercises.length)}</span></span>
      <span className="btn primary sm">{t('Start')}</span>
    </button>}

    <div className="wmodes">
      {['home', 'gym'].map(m => { const I = MODE_INFO[m]; return <button key={m} className={'wmode wmode-' + m} onClick={() => nav('/start/' + m)}>
        <span className="wmode-ico"><Icon name={I.icon} /></span>
        <span className="wmode-t">{t(I.title)}</span>
        <span className="wmode-s">{t(I.sub)}</span>
        <span className="wmode-tags">{I.tags.map(x => <i key={x}>{t(x)}</i>)}</span>
        <span className="wmode-n">{t('{0} exercises', fmtNum(sectionCount(m)))} <Icon name="chevronRight" /></span>
      </button> })}
    </div>

    <BurnCard S={S} nav={nav} />

    {sugCat && sugEx.length > 0 && <>
      <h2 className="startw-h"><Icon name="sparkles" />{t('Suggested for you today')}</h2>
      <div className="card startw-sug">
        <span className="startw-ico" style={{ background: colorVar(sugCat.color) }}><Icon name={sugCat.icon} /></span>
        <div className="grow">
          <b>{t(sugCat.session)}</b>
          <div className="small muted">{t('{0} exercises', sugEx.length)} · {t('about {0} min', sessionMinutes(sugRoutine))}</div>
          <div className="small dim startw-names">{sugEx.slice(0, 3).map(exName).join(' · ')}…</div>
        </div>
        <Button size="sm" variant="primary" onClick={() => go(sugRoutine, { key: sug.mode + ':' + sug.cat, mode: sug.mode, cat: sug.cat })}>{t('Start')}</Button>
      </div>
    </>}

    {recent.length > 0 && <>
      <h2 className="startw-h"><Icon name="history" />{t('Recent sessions')}</h2>
      <div className="list">
        {recent.map(x => <div key={x.key} className="item">
          <span className="startw-ico sm" style={{ background: colorVar(x.color || 'green') }}><Icon name={x.mode === 'gym' ? 'barbell' : 'house'} /></span>
          <div className="grow"><div className="tt">{routineLabel(x.name)}</div><div className="ss">{t('{0} exercises', x.ex.length)} · {t(x.mode === 'gym' ? 'With equipment' : 'Without equipment')}</div></div>
          <Button size="sm" variant="tinted" icon="reset" onClick={() => go({ id: 'quick-again', name: x.name, color: x.color, ex: x.ex }, x)}>{t('Again')}</Button>
        </div>)}
      </div>
    </>}

    <div className="startw-more">
      <Button variant="tinted" icon="list" onClick={() => nav('/plan')}>{t('My routines')}</Button>
      <Button variant="tinted" icon="plus" onClick={() => startFlow(null)}>{t('Empty workout')}</Button>
    </div>
  </div>
}

/* ------------------------------------------------------------ /start/:mode */
export function WorkoutSection() {
  const S = useStore(s => s.S)
  const { mode = 'home' } = useParams()
  const nav = useNavigate()
  const [eq, setEq] = useState('')
  const M = MODE_INFO[mode] ? mode : 'home'
  const I = MODE_INFO[M]
  const cats = CATEGORIES[M]
  const groups = M === 'gym' ? EQ_GROUPS.filter(g => countOf('gym', 'full', g.id) > 0) : []
  return <div className="startw">
    <div className="hdr">
      <BackButton fallback="/start" />
      <div><h1>{t(I.title)}</h1><div className="sub">{t(I.sub)}</div></div>
    </div>
    <BurnCard S={S} nav={nav} mode={M} />
    {M === 'home' && <button className="card startw-today" onClick={() => nav('/walk')}>
      <span className="startw-ico" style={{ background: 'var(--green)' }}><Icon name="figureRun" /></span>
      <span className="grow"><b>{t('Walk & run')}</b><span className="small muted">{t('Outside or on the spot — the step counter counts')}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>}
    {groups.length > 0 && <div className="chips startw-eq" role="group" aria-label={t('Equipment')}>
      <button className={'chip nocap' + (!eq ? ' on' : '')} aria-pressed={!eq} onClick={() => setEq('')}>{t('Any equipment')}</button>
      {groups.map(g => <button key={g.id} className={'chip nocap' + (eq === g.id ? ' on' : '')} aria-pressed={eq === g.id} onClick={() => setEq(g.id)}><Icon name={g.icon} />{t(g.name)}</button>)}
    </div>}
    <div className="wcats">
      {cats.map(c => { const n = countOf(M, c.id, eq || null); return <button key={c.id} className="wcat" disabled={!n} onClick={() => nav('/start/' + M + '/' + c.id + (eq ? '?eq=' + eq : ''))}>
        <span className="wcat-ico" style={{ background: softVar(c.color), color: colorVar(c.color) }}><Icon name={c.icon} /></span>
        <span className="wcat-t">{t(c.name)}</span>
        <span className="wcat-n">{t('{0} exercises', fmtNum(n))}</span>
      </button> })}
    </div>
  </div>
}

/* -------------------------------------------------------- /start/:mode/:cat */
const COUNT_OPTS = [4, 6, 8]
export function WorkoutCategory() {
  const { mode = 'home', cat = '' } = useParams()
  const nav = useNavigate()
  const [qs, setQs] = useSearchParams()
  const eq = qs.get('eq') || ''
  const c = categoryOf(mode, cat)
  const [count, setCount] = useState(6)
  const [shuffle, setShuffle] = useState(0)
  const [picked, setPicked] = useState([])
  const [shown, setShown] = useState(30)
  const all = useMemo(() => (c ? exercisesOf(mode, cat, eq || null) : []), [mode, cat, eq, c])
  const quick = useMemo(() => (c ? pickExercises(mode, cat, { count, eqGroup: eq || null, seed: daySeed() * 7 + shuffle }) : []), [mode, cat, eq, count, shuffle, c])
  if (!c) return <div className="startw"><div className="hdr"><BackButton fallback="/start" /><div><h1>{t('Start your workout')}</h1></div></div>
    <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div></div>
  const routine = sessionRoutine(mode, cat, quick)
  const groups = mode === 'gym' ? EQ_GROUPS.filter(g => countOf('gym', cat, g.id) > 0) : []
  const setEq = id => { setQs(id ? { eq: id } : {}, { replace: true }); setPicked([]); setShown(30) }
  const toggle = id => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : p.length >= 15 ? p : [...p, id]))
  const pickedEx = picked.map(id => all.find(e => e.id === id)).filter(Boolean)

  return <div className={'startw' + (pickedEx.length ? ' has-bar' : '')}>
    <div className="hdr">
      <BackButton fallback={'/start/' + mode} />
      <div><h1>{t(c.name)}</h1><div className="sub">{t(MODE_INFO[mode].title)} · {t('{0} exercises', fmtNum(all.length))}</div></div>
    </div>
    {groups.length > 1 && <div className="chips startw-eq" role="group" aria-label={t('Equipment')}>
      <button className={'chip nocap' + (!eq ? ' on' : '')} aria-pressed={!eq} onClick={() => setEq('')}>{t('Any equipment')}</button>
      {groups.map(g => <button key={g.id} className={'chip nocap' + (eq === g.id ? ' on' : '')} aria-pressed={eq === g.id} onClick={() => setEq(g.id)}><Icon name={g.icon} />{t(g.name)}</button>)}
    </div>}

    <div className="card startw-quick" style={{ '--qc': colorVar(c.color) }}>
      <div className="row between">
        <div><div className="lbl2">{t('Quick session')}</div><b className="startw-qt">{t(c.session)}</b>
          <div className="small muted">{t('about {0} min', sessionMinutes(routine))}</div></div>
        <button className="iconbtn" onClick={() => setShuffle(x => x + 1)} aria-label={t('Shuffle')}><Icon name="shuffle" /></button>
      </div>
      <Segmented options={COUNT_OPTS.map(n => ({ value: n, label: t('{0} exercises', n) }))} value={count} onChange={setCount} />
      <ol className="startw-ql">
        {quick.map((e, i) => <li key={e.id} onClick={() => exerciseDetailSheet(e)}>
          <Thumb ex={e} />
          <span className="grow"><span className="tt capitalize"><ExName ex={e} /></span><span className="ss">{rxText(routine.ex[i])}</span></span>
          <Icon name="info" className="chev" />
        </li>)}
      </ol>
      <Button variant="primary" icon="play" disabled={!quick.length} onClick={() => go(routine, { key: mode + ':' + cat, mode, cat })}>{t('Start this session')}</Button>
    </div>

    {cat === 'run' && <button className="card startw-today" onClick={() => nav('/walk')}>
      <span className="startw-ico sm" style={{ background: 'var(--green)' }}><Icon name="figureWalk" /></span>
      <span className="grow"><b>{t('Go for a walk or a run')}</b><span className="small muted">{t('The step counter keeps time, steps and distance — even with the screen off.')}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>}

    <h2 className="startw-h"><Icon name="checkCircle" />{t('Or pick your own')}<span className="small muted startw-hint">{t('up to {0}', 15)}</span></h2>
    <div className="list">
      {all.slice(0, shown).map(e => { const on = picked.includes(e.id); const rx = prescribe(e, mode, cat); return <div key={e.id} className={'item' + (on ? ' sel' : '')} onClick={() => toggle(e.id)}>
        <Check checked={on} onChange={() => toggle(e.id)} />
        <Thumb ex={e} />
        <div className="grow"><div className="tt capitalize"><ExName ex={e} /></div><div className="ss capitalize">{t(e.tg || e.bp)}{mode === 'gym' ? ' · ' + t(e.eq) : ''} · {rxText(rx)}</div></div>
        <button className="iconbtn sm" onClick={ev => { ev.stopPropagation(); exerciseDetailSheet(e) }} aria-label={t('How to do it')}><Icon name="info" /></button>
      </div> })}
    </div>
    {all.length > shown && <><div style={{ height: 10 }} /><Button onClick={() => setShown(s => s + 30)}>{t('Show more')}</Button></>}

    {pickedEx.length > 0 && <div className="startw-bar">
      <Button size="sm" onClick={() => setPicked([])}>{t('Clear')}</Button>
      <Button variant="primary" icon="play" onClick={() => go(sessionRoutine(mode, cat, pickedEx, { picked: true }), { key: mode + ':pick:' + pickedEx.map(e => e.id).join(','), mode, cat })}>
        {t('Start with {0} exercises', pickedEx.length)}
      </Button>
    </div>}
  </div>
}

