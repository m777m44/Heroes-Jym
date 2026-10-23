// 9.0 — /dayplan: plan your day and live it. Pick a template (workout day, study day, student
// athlete, rest day, Ramadan or from scratch), adjust any block — study, work, workout, rest,
// meals, drinks, water, a walk, free time, sleep — and press Start: the screen shows what is
// happening now with a countdown, what comes next, and logs the meals and drinks you planned
// with their exact calories. On the phone a notification (in your theme colour) opens each
// block. The logic is in lib/dayPlan.js.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { MEALS, addEntry, foodGoalOf, dayTotals } from '../lib/food.js'
import {
  KINDS, KIND_KEYS, TEMPLATES, toHHMM, toMin, newPlan, normPlan, liveState, dayRec, isLive, planTotals, mealTargets,
  itemInfo, blockKcal, blockMl, startDay, stopDay, markBlock, upsertBlock, removeBlock, shiftFrom, planPrefs,
} from '../lib/dayPlan.js'
import { RECIPES, RECIPE_BY_ID, recipeNutrition, recipeEntry } from '../lib/kitchen.js'
import { drinkOf, drinkEntry, noteDrink, drinkNutrition } from '../lib/drinks.js'
import { MOBILE } from '../lib/mobile.js'
import { nav } from '../lib/nav.js'
import { useVisibleInterval } from '../lib/battery.js'
import { syncPlanReminders } from '../lib/planReminders.js'
import { logWater } from '../components/water/WaterParts.jsx'
import { burst, lastTap } from '../lib/motion.js'
import { celebrate, playCheer } from '../lib/celebrate.js'
import { pickDrinkSheet } from './Drinks.jsx'
import { confirmSheet } from '../sheets.jsx'
import DrinkGlass from '../components/DrinkGlass.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Switch, Button, BackButton, Segmented, SearchField, TextField } from '../components/ui.jsx'

const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const clock = m => { const d = new Date(2000, 0, 1, Math.floor(((m % 1440) + 1440) % 1440 / 60), ((m % 60) + 60) % 60); return d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) }
const durText = m => (m >= 60 ? (Math.floor(m / 60) + ' ' + U('h') + (m % 60 ? ' ' + (m % 60) + ' ' + U('mn') : '')) : t('{0} min', n0(m)))
const kindName = b => (b.n ? t(b.n) : b.k === 'meal' ? t((MEALS.find(m => m.key === b.meal) || MEALS[1]).name) : t(KINDS[b.k].name))
const itemName = x => (x.own ? x.name : t(x.name))

export { syncPlanReminders }

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useVisibleInterval(() => setNow(new Date()), 20000)
  return now
}

// ---- pickers --------------------------------------------------------------------------------------
function RecipePick({ meal, target, onPick, close }) {
  const [q, setQ] = useState('')
  const [iq, setIq] = useState(false)
  const Q = q.trim().toLocaleLowerCase()
  const list = RECIPES
    .filter(r => (Q ? (r.name + ' ' + t(r.name)).toLocaleLowerCase().includes(Q) : r.meals.includes(meal)) && (!iq || r.iq))
    .map(r => ({ r, k: recipeNutrition(r).kcal }))
    .sort((a, b) => (target ? Math.abs(a.k - target) - Math.abs(b.k - target) : a.k - b.k))
  return <div className="dk-pick">
    <h3>{t('Choose a dish')}</h3>
    {target > 0 && <div className="small muted" style={{ marginBottom: 8 }}>{t('Closest to {0} kcal first', n0(target))}</div>}
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search dishes')} />
    <div className="dk-chips"><button className={'chip nocap' + (iq ? ' on' : '')} aria-pressed={iq} onClick={() => setIq(v => !v)}><Icon name="palm" />{t('Iraqi')}</button></div>
    <div className="list dk-pick-l">
      {list.map(({ r, k }) => <button key={r.id} className="item dk-pick-i" onClick={() => { onPick(r); close() }}>
        <span className="dp-ki" style={{ '--c': KINDS.meal.color }}><Icon name="fork" /></span>
        <div className="grow"><div className="tt">{t(r.name)}{r.iq && <Icon name="palm" className="iq-mark" />}</div><div className="ss">{n0(k)} {U('kcal')} · {t('{0} min', r.min)}</div></div>
        <Icon name="plus" />
      </button>)}
    </div>
  </div>
}
const recipePickSheet = (meal, target, onPick) => ui().openSheet(close => <RecipePick meal={meal} target={target} onPick={onPick} close={close} />)

// ---- block editor ---------------------------------------------------------------------------------
const DURS = [5, 10, 15, 20, 30, 45, 60, 90, 120]
function BlockEdit({ block: b0, close, target }) {
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const isNew = !b0.id
  const [b, setB] = useState(() => ({ k: 'study', s: 9 * 60, d: 30, items: [], ml: 250, meal: 'l', ...b0 }))
  const set = patch => setB(x => ({ ...x, ...patch }))
  const items = (b.items || []).map(it => ({ it, x: itemInfo(St, it) })).filter(z => z.x)
  const kcal = items.reduce((a, z) => a + z.x.kcal, 0)
  const save = () => {
    update(s => { s.planner = normPlan(s.planner) || newPlan('custom'); upsertBlock(s, b) })
    close()
  }
  const del = () => { update(s => { removeBlock(s, b.id) }); close() }
  const addRecipe = () => recipePickSheet(b.meal || 'l', target, r => setB(x => ({ ...x, items: [...(x.items || []), { t: 'r', id: r.id, q: 1 }] })))
  const addDrink = () => pickDrinkSheet(d => setB(x => ({ ...x, items: [...(x.items || []), { t: 'd', id: d.id, q: 1 }] })))
  const setQ = (i, q) => setB(x => ({ ...x, items: x.items.map((it, k) => (k === i ? { ...it, q: Math.min(8, Math.max(0.5, q)) } : it)) }))
  const rm = i => setB(x => ({ ...x, items: x.items.filter((_, k) => k !== i) }))
  const K = KINDS[b.k]
  return <div className="dp-edit" style={{ '--c': K.color }}>
    <h3>{isNew ? t('Add a block') : t('Edit block')}</h3>
    <div className="dp-kinds" role="radiogroup" aria-label={t('Kind')}>
      {KIND_KEYS.map(k => <button key={k} role="radio" aria-checked={b.k === k} className={'dp-kind' + (b.k === k ? ' on' : '')} style={{ '--c': KINDS[k].color }}
        onClick={() => set({ k, items: k === 'meal' || k === 'drink' ? (b.k === k ? b.items : []) : [], d: k === 'sleep' ? 480 : b.k === 'sleep' ? 30 : b.d })}>
        <Icon name={KINDS[k].icon} /><span>{t(KINDS[k].name)}</span>
      </button>)}
    </div>
    <TextField value={b.n ? t(b.n) : ''} onChange={e => set({ n: e.target.value.slice(0, 40) })} placeholder={t('Title (optional)')} dir="auto" />
    <div className="dp-time">
      <label><span className="lbl2">{t('Starts')}</span><input className="input" type="time" value={toHHMM(b.s)} onChange={e => e.target.value && set({ s: toMin(e.target.value) })} /></label>
      <label><span className="lbl2">{t('Lasts')}</span><b className="dp-dur">{durText(b.d)}</b></label>
    </div>
    <div className="dp-durs scroll">
      {(b.k === 'sleep' ? [360, 420, 480, 540, 600] : DURS).map(m => <button key={m} className={'chip nocap' + (b.d === m ? ' on' : '')} onClick={() => set({ d: m })}>{durText(m)}</button>)}
    </div>
    {b.k === 'meal' && <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={b.meal || 'l'} onChange={v => set({ meal: v })} />}
    {b.k === 'water' && <div className="kit-sv">
      <span>{t('Water')}</span>
      <div className="kit-svc">
        <button className="iconbtn" aria-label={t('Less')} onClick={() => set({ ml: Math.max(100, (b.ml || 250) - 50) })}><Icon name="minus" /></button>
        <b>{n0(b.ml || 250)} {U('ml')}</b>
        <button className="iconbtn" aria-label={t('More')} onClick={() => set({ ml: Math.min(1000, (b.ml || 250) + 50) })}><Icon name="plus" /></button>
      </div>
    </div>}
    {(b.k === 'meal' || b.k === 'drink') && <>
      <div className="dp-items-h"><span className="lbl2 grow">{b.k === 'meal' ? t('What you will eat') : t('What you will drink')}</span>
        <b className={'dp-kc' + (target && kcal > target * 1.1 ? ' over' : '')}>{n0(kcal)}{target ? ' / ' + n0(target) : ''} {U('kcal')}</b></div>
      <div className="dp-items">
        {items.map(({ it, x }, i) => <div key={i} className="dp-item">
          {it.t === 'd' ? <DrinkGlass drink={drinkOf(St, it.id)} size={26} /> : <span className="dp-ki" style={{ '--c': KINDS.meal.color }}><Icon name="fork" /></span>}
          <div className="grow"><div className="tt" dir="auto">{itemName(x)}</div><div className="ss">{n0(x.kcal)} {U('kcal')}</div></div>
          <div className="stp dp-q">
            <button onClick={() => setQ(i, (it.q || 1) - 0.5)} aria-label={t('Less')}><Icon name="minus" /></button>
            <span className="val">{(it.q || 1).toLocaleString(dateLocale())}</span>
            <button onClick={() => setQ(i, (it.q || 1) + 0.5)} aria-label={t('More')}><Icon name="plus" /></button>
          </div>
          <button className="iconbtn" aria-label={t('Remove')} onClick={() => rm(i)}><Icon name="xmark" /></button>
        </div>)}
        {!items.length && <div className="small muted dp-empty-i">{b.k === 'meal' ? t('Plan the dishes and the calories are counted exactly.') : t('Pick a drink — its calories and water are counted.')}</div>}
      </div>
      <div className="dp-add-row">
        {b.k === 'meal' && <Button variant="tinted" size="sm" icon="fork" onClick={addRecipe}>{t('Add a dish')}</Button>}
        <Button variant="tinted" size="sm" icon="cup" onClick={addDrink}>{t('Add a drink')}</Button>
      </div>
    </>}
    <div className="dp-edit-save">
      {!isNew && <Button variant="plain" icon="trash" className="danger" onClick={del}>{t('Delete')}</Button>}
      <Button variant="primary" icon="check" onClick={save}>{t('Save')}</Button>
    </div>
  </div>
}
export const blockSheet = (block, target = 0) => ui().openSheet(close => <BlockEdit block={block} target={target} close={close} />)

// ---- logging a block ------------------------------------------------------------------------------
function completeBlock(b, iso) {
  const st = useStore.getState()
  const S = st.S
  let kcal = 0, ml = 0
  st.update(s => {
    for (const it of b.items || []) {
      if (it.t === 'r' && RECIPE_BY_ID[it.id]) { const e = recipeEntry(RECIPE_BY_ID[it.id], { servings: it.q || 1, meal: b.meal || 's' }); addEntry(s, iso, e); kcal += e.kcal * e.q }
      if (it.t === 'd') {
        const d = drinkOf(S, it.id)
        if (d) { const e = drinkEntry(d, { servings: it.q || 1, meal: b.meal || 's' }); addEntry(s, iso, e); noteDrink(s, iso, d.id); kcal += e.kcal * e.q; ml += drinkNutrition(d).ml * e.q }
      }
    }
    markBlock(s, iso, b.id, 'done')
  })
  if (b.k === 'water') ml += b.ml || 250
  if (ml >= 50) logWater(Math.round(ml))
  return { kcal: Math.round(kcal), ml: Math.round(ml) }
}

// ---- the screen ------------------------------------------------------------------------------------
function Onboard({ St }) {
  const update = useStore(s => s.update)
  const p = planPrefs(St.planner || (St.day ? { wake: St.day.wake, sleep: St.day.sleep } : {}))
  const [wake, setWake] = useState(p.wake)
  const [sleep, setSleep] = useState(p.sleep)
  const make = tpl => {
    const F = St.fasting || {}
    update(s => { s.planner = newPlan(tpl, s.planner || {}, { prefs: { wake, sleep }, suhoor: F.suhoor, iftar: F.iftar, seed: new Date().getDate() }) })
  }
  return <>
    <div className="card dp-intro">
      <span className="dp-intro-art" aria-hidden="true">{['sun', 'book', 'dumbbell', 'fork', 'moon'].map((k, i) => <span key={k} style={{ '--i': i, '--c': Object.values(KINDS)[i * 2].color }}><Icon name={k} /></span>)}</span>
      <h2>{t('Plan your day')}</h2>
      <p className="small muted">{t('Study, work, workout, rest, meals and drinks — each at its time, with the calories counted exactly.')}</p>
      <div className="dp-time">
        <label><span className="lbl2">{t('I wake up')}</span><input className="input" type="time" value={wake} onChange={e => e.target.value && setWake(e.target.value)} /></label>
        <label><span className="lbl2">{t('I sleep')}</span><input className="input" type="time" value={sleep} onChange={e => e.target.value && setSleep(e.target.value)} /></label>
      </div>
    </div>
    <div className="dp-tpls">
      {TEMPLATES.map((x, i) => <button key={x.id} className="card dp-tpl" style={{ '--i': i }} onClick={() => make(x.id)}>
        <span className="dp-tpl-ic"><Icon name={x.icon} /></span>
        <b>{t(x.name)}</b>
        <span className="small muted">{t(x.desc)}</span>
      </button>)}
    </div>
  </>
}

function Ring({ pct, color, children, size = 132 }) {
  const R = 54, C = 2 * Math.PI * R
  return <div className="dp-ring" style={{ width: size, height: size, '--c': color }}>
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={R} className="dp-ring-bg" />
      <circle cx="60" cy="60" r={R} className="dp-ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, Math.min(1, pct)))} />
    </svg>
    <div className="dp-ring-in">{children}</div>
  </div>
}

function LiveCard({ St, plan, live, iso, targets }) {
  const update = useStore(s => s.update)
  const cur = live.cur && live.items.find(x => x.b.id === live.cur.b.id && x.st === 'now') ? live.cur : null
  const next = live.next
  const allDone = live.total > 0 && live.done >= live.total
  if (allDone) {
    return <div className="card dp-live done">
      <span className="dp-live-bg" aria-hidden="true" />
      <Icon name="trophy" className="dp-done-ic" />
      <h2>{t('Day complete!')}</h2>
      <p className="small">{t('You finished every block of your plan. Proud of you!')}</p>
    </div>
  }
  if (!cur) {
    return <div className="card dp-live idle" style={{ '--c': next ? KINDS[next.b.k].color : 'var(--acc)' }}>
      <span className="dp-live-bg" aria-hidden="true" />
      <div className="dp-live-row">
        <span className="dp-live-ic"><Icon name={next ? KINDS[next.b.k].icon : 'checkCircle'} /></span>
        <div className="grow">
          <div className="lbl2">{next ? t('Up next') : t('Nothing scheduled now')}</div>
          {next && <><b className="dp-live-t">{kindName(next.b)}</b><div className="small">{t('In {0} · at {1}', durText(Math.max(1, Math.round(next.inMin))), clock(next.b.s))}</div></>}
        </div>
      </div>
      <Progress live={live} />
    </div>
  }
  const b = cur.b, K = KINDS[b.k]
  const left = Math.max(0, Math.round(cur.left))
  const its = (b.items || []).map(it => itemInfo(St, it)).filter(Boolean)
  const done = () => {
    const r = completeBlock(b, iso)
    burst(lastTap(), { count: 14, spread: 70, colors: [K.color, '#ffffff', '#FFD60A'] })
    toast(r.kcal ? t('Logged {0} kcal', n0(r.kcal)) + (r.ml ? ' · +' + n0(r.ml) + ' ' + U('ml') : '') : r.ml ? '+' + n0(r.ml) + ' ' + U('ml') : t('Done — well done!'))
    const after = liveState(normPlan(useStore.getState().S.planner), dayRec(normPlan(useStore.getState().S.planner), iso))
    if (after.total && after.done >= after.total) { const S2 = useStore.getState().S; celebrate(100, 'plan'); playCheer(S2.sound !== false, 'plan') }
  }
  const go = { workout: ['/start', 'Start workout', 'play'], rest: ['/breathe', 'Breathe', 'wind'], walk: ['/walk', 'Walking', 'figureWalk'] }[b.k]
  return <div className="card dp-live" style={{ '--c': K.color }}>
    <span className="dp-live-bg" aria-hidden="true" />
    <div className="dp-live-top">
      <Ring pct={cur.pct} color={K.color}>
        <Icon name={K.icon} />
        <b>{left >= 60 ? durText(left) : n0(left)}</b>
        {left < 60 && <span>{U('mn')}</span>}
      </Ring>
      <div className="grow">
        <div className="lbl2">{t('Now')}</div>
        <b className="dp-live-t">{kindName(b)}</b>
        <div className="small">{clock(b.s)} – {clock(b.s + b.d)}</div>
        {its.length > 0 && <div className="small dp-live-items">{its.map(itemName).join(' · ')} · {n0(its.reduce((a, x) => a + x.kcal, 0))} {U('kcal')}</div>}
        {b.k === 'water' && <div className="small">{t('Drink {0} ml of water.', n0(b.ml || 250))}</div>}
        {b.k === 'meal' && !its.length && targets[b.id] > 0 && <div className="small">{t('About {0} kcal for this meal', n0(targets[b.id]))}</div>}
      </div>
    </div>
    <div className="dp-live-act">
      <Button variant="primary" icon="check" onClick={done}>{its.length || b.k === 'water' ? t('Log & done') : t('Done')}</Button>
      {go && <Button variant="tinted" icon={go[2]} onClick={() => nav(go[0])}>{t(go[1])}</Button>}
      <button className="iconbtn" aria-label={t('10 more minutes')} title={t('10 more minutes')} onClick={() => update(s => { shiftFrom(s, b.id, 10); const P = s.planner; const x = P.blocks.find(y => y.id === b.id); if (x) { x.s -= 10; x.d += 10 } })}><b className="dp-plus10">+10</b></button>
      <button className="iconbtn" aria-label={t('Skip')} onClick={() => update(s => { markBlock(s, iso, b.id, 'skip') })}><Icon name="chevronRight" /></button>
    </div>
    {next && <div className="dp-next"><span className="lbl2">{t('Next')}</span><Icon name={KINDS[next.b.k].icon} style={{ color: KINDS[next.b.k].color }} /><b>{kindName(next.b)}</b><span className="small muted">{clock(next.b.s)}</span></div>}
    <Progress live={live} />
  </div>
}

function Progress({ live }) {
  return <div className="dp-prog">
    <div className="dp-prog-bar"><i style={{ width: Math.round(live.pct * 100) + '%' }} /></div>
    <span className="small">{t('{0} of {1} done', n0(live.done), n0(live.total))}</span>
  </div>
}

export default function DayPlan() {
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const now = useNow()
  const iso = todayISO()
  const plan = normPlan(St.planner)
  const goal = foodGoalOf(St, iso).kcal
  const live = plan && isLive(plan, iso) ? liveState(plan, dayRec(plan, iso), now) : null
  const targets = useMemo(() => (plan ? mealTargets(St, plan.blocks, goal) : {}), [St, plan, goal])
  const tot = useMemo(() => (plan ? planTotals(St, plan.blocks, goal) : null), [St, plan, goal])
  const eaten = dayTotals(St, iso).kcal
  useEffect(() => { syncPlanReminders(St) }, [St])

  if (!plan) {
    return <div className="narrow dp-page">
      <div className="hdr"><BackButton fallback="/tools" /><div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Day plan')}</h1><div className="sub">{t('Workout, study, rest and meals — on time')}</div></div></div>
      <Onboard St={St} />
    </div>
  }
  const start = () => {
    update(s => { s.planner = normPlan(s.planner); startDay(s, iso) })
    toast(t('Your day has started — you’ve got this!'))
    setTimeout(() => syncPlanReminders(useStore.getState().S, true), 50)
  }
  const stop = () => confirmSheet({ title: t('Stop today’s plan?'), message: t('Your blocks stay; reminders for today are cancelled.'), confirmText: t('Stop'),
    onConfirm: () => { update(s => { stopDay(s, iso) }); setTimeout(() => syncPlanReminders(useStore.getState().S, true), 50) } })
  const reset = () => confirmSheet({ title: t('Choose another template?'), message: t('Your current blocks will be replaced.'), confirmText: t('Continue'),
    onConfirm: () => update(s => { s.planner = null }) })
  const statusOf = id => (live ? (live.items.find(x => x.b.id === id) || {}).st : null)
  const studyMin = (tot.min.study || 0) + (tot.min.work || 0)

  return <div className="narrow dp-page">
    <div className="hdr">
      <BackButton fallback="/tools" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Day plan')}</h1><div className="sub">{now.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <button className="iconbtn" aria-label={t('Add a block')} onClick={() => blockSheet({ s: Math.min(1435, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15) })}><Icon name="plus" /></button>
    </div>

    {live ? <LiveCard St={St} plan={plan} live={live} iso={iso} targets={targets} />
      : <div className="card dp-start">
        <span className="dp-live-bg" aria-hidden="true" />
        <div className="grow">
          <b className="dp-live-t">{t(TEMPLATES.find(x => x.id === plan.tpl)?.name || 'Day plan')}</b>
          <div className="small">{t('{0} blocks · {1} – {2}', n0(plan.blocks.length), clock(toMin(plan.wake)), clock(toMin(plan.sleep)))}</div>
        </div>
        <Button variant="primary" icon="play" onClick={start}>{t('Start my day')}</Button>
      </div>}

    <div className="dp-stats">
      <div className="dp-stat" style={{ '--c': 'var(--orange)' }}>
        <Icon name="flame" /><b>{n0(tot.kcal)}</b><span>{t('of {0} kcal planned', n0(goal))}</span>
        <i className="dp-stat-bar"><em style={{ width: Math.min(100, tot.kcal / Math.max(1, goal) * 100) + '%' }} /></i>
      </div>
      <div className="dp-stat" style={{ '--c': 'var(--blue)' }}><Icon name="drop" /><b>{n0(tot.ml)}</b><span>{U('ml')} · {t('Water')}</span></div>
      <div className="dp-stat" style={{ '--c': '#5e5ce6' }}><Icon name="book" /><b>{durText(studyMin)}</b><span>{t('Study & work')}</span></div>
      <div className="dp-stat" style={{ '--c': '#ff375f' }}><Icon name="dumbbell" /><b>{durText(tot.min.workout + tot.min.walk)}</b><span>{t('Moving')}</span></div>
    </div>
    {live && <div className="small muted dp-eaten">{t('Eaten so far: {0} of {1} kcal', n0(eaten), n0(goal))}</div>}

    <div className="dp-tl" role="list">
      {plan.blocks.map((b, i) => {
        const K = KINDS[b.k], st = statusOf(b.id)
        const kc = blockKcal(St, b), ml = blockMl(St, b)
        const its = (b.items || []).map(it => itemInfo(St, it)).filter(Boolean)
        return <div key={b.id} role="listitem" className={'dp-b' + (st ? ' ' + st : '')} style={{ '--c': K.color, '--i': Math.min(i, 14) }}>
          <span className="dp-b-time">{clock(b.s)}</span>
          <span className="dp-b-rail"><i /></span>
          <button className="dp-b-card" onClick={() => blockSheet(b, targets[b.id] || 0)}>
            <span className="dp-b-ic"><Icon name={st === 'done' ? 'check' : K.icon} /></span>
            <span className="grow">
              <b>{kindName(b)}</b>
              <span className="small muted">{durText(b.d)}
                {kc > 0 && <> · {n0(kc)} {U('kcal')}</>}
                {b.k === 'meal' && !kc && targets[b.id] > 0 && <> · ≈{n0(targets[b.id])} {U('kcal')}</>}
                {ml > 0 && <> · {n0(ml)} {U('ml')}</>}
              </span>
              {its.length > 0 && <span className="dp-b-items" dir="auto">{its.map(itemName).join(' · ')}</span>}
            </span>
            {st === 'now' && <span className="dp-now-pill">{t('Now')}</span>}
            {st === 'skipped' && <span className="dp-skip-pill">{t('Skipped')}</span>}
          </button>
          {live && (st === 'now' || st === 'missed' || st === 'next') && b.k !== 'sleep' && <button className="dp-b-tick" aria-label={t('Done')} onClick={() => {
            const r = completeBlock(b, iso)
            toast(r.kcal ? t('Logged {0} kcal', n0(r.kcal)) : t('Done — well done!'))
          }}><Icon name="check" /></button>}
        </div>
      })}
    </div>
    <Button variant="tinted" icon="plus" onClick={() => blockSheet({ s: 12 * 60 })}>{t('Add a block')}</Button>

    <Section title={t('Settings')}>
      <Row icon="sun" iconTint="var(--yellow)" title={t('I wake up')}><input className="input fs-tin" type="time" value={plan.wake} onChange={e => e.target.value && update(s => { s.planner.wake = e.target.value })} /></Row>
      <Row icon="moon" iconTint="var(--indigo)" title={t('I sleep')}><input className="input fs-tin" type="time" value={plan.sleep} onChange={e => e.target.value && update(s => { s.planner.sleep = e.target.value })} /></Row>
      {MOBILE && <Row icon="bell" iconTint="var(--red)" title={t('Remind me at each block')} subtitle={t('In your theme colour')}>
        <Switch checked={plan.remind} onChange={v => { update(s => { s.planner = normPlan(s.planner); s.planner.remind = v }); setTimeout(() => syncPlanReminders(useStore.getState().S, true), 50) }} />
      </Row>}
      <Row icon="calendar" iconTint="var(--green)" title={t('Run it every day')} subtitle={t('The plan starts by itself each morning')}>
        <Switch checked={plan.auto} onChange={v => { update(s => { s.planner = normPlan(s.planner); s.planner.auto = v }); setTimeout(() => syncPlanReminders(useStore.getState().S, true), 50) }} />
      </Row>
      {live && !plan.auto && <Row icon="stop" iconTint="var(--orange)" title={t('Stop today’s plan')} accessory="chevron" onClick={stop} />}
      <Row icon="layers" iconTint="var(--purple)" title={t('Choose another template')} accessory="chevron" onClick={reset} />
    </Section>
    <p className="small muted dp-foot">{t('Meal targets share what is left of your daily goal after the drinks you planned.')}</p>
  </div>
}
