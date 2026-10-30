// 9.0 — /dayplan: plan your day and live it. Pick a template (workout day, study day, student
// athlete, rest day, Ramadan or from scratch), adjust any block — study, work, workout, rest,
// meals, drinks, water, a walk, free time, sleep — and press Start: the screen shows what is
// happening now with a countdown, what comes next, and logs the meals and drinks you planned
// with their exact calories.
// 10.0 — "My schedule": a week strip (Saturday first) shows and edits each weekday; blocks run on
// the days you choose (school Sunday–Thursday), with an end time, your notes, their own reminder
// and food, drinks, soft drinks and nuts. Copy a day onto others. The school week template.
// On the phone each reminder shows everything you wrote and chose, with Done ✓ and In 10 min.
// 11.0 — the timeline is grouped into morning, afternoon, evening and night (with their calories),
// blocks can carry foods from the database (eggs, bread, rice and stew…) and their own icon, the
// day shows its protein, carbs and fat, and a school week made before 11.0 is offered the new one.
// The logic is in lib/dayPlan.js, logging in lib/planLog.js, reminders in lib/planReminders.js.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { todayISO, DAYS, DAYN, weekOrder, weekStartOf } from '../lib/format.js'
import { MEALS, foodGoalOf, dayTotals, searchFoods, servingText } from '../lib/food.js'
import {
  KINDS, KIND_KEYS, TEMPLATES, REMIND_OPTS, DAY_ALL, SCHOOL_DAYS, WEEKEND, NOTE_MAX, toHHMM, toMin, newPlan, normPlan, liveState, dayRec, isLive,
  planTotals, mealTargets, itemInfo, blockKcal, blockMl, startDay, stopDay, markBlock, upsertBlock, removeBlock, extendNow, planPrefs,
  blocksOn, dayBlocks, typeDays, daysLabel, copyDay, hasItems, cleanDays, BLOCK_ICONS, partOf, oldSchoolPlan, noteText, SCHOOL_TV, dayOrder,
} from '../lib/dayPlan.js'
import { WeekKinds, weekGlanceSheet, shareSchedule } from './WeekGlance.jsx'
import { FOODS, FOOD_CATS } from '../lib/foodDb.js'
import { RECIPES, recipeNutrition } from '../lib/kitchen.js'
import { drinkOf } from '../lib/drinks.js'
import { SODA_BY_ID } from '../lib/sodas.js'
import { NUT_BY_ID } from '../lib/nuts.js'
import { MOBILE } from '../lib/mobile.js'
import { nav } from '../lib/nav.js'
import { useVisibleInterval } from '../lib/battery.js'
import { syncPlanReminders } from '../lib/planReminders.js'
import { completeBlock } from '../lib/planLog.js'
import { burst, lastTap } from '../lib/motion.js'
import { celebrate, playCheer } from '../lib/celebrate.js'
import { pickDrinkSheet } from './Drinks.jsx'
import { pickSodaSheet, sizeText } from './Sodas.jsx'
import { pickNutSheet } from './Nuts.jsx'
import { confirmSheet } from '../sheets.jsx'
import DrinkGlass from '../components/DrinkGlass.jsx'
import SodaArt from '../components/SodaArt.jsx'
import NutArt from '../components/NutArt.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Switch, Button, BackButton, Segmented, SearchField, TextField } from '../components/ui.jsx'

const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const clock = m => { const d = new Date(2000, 0, 1, Math.floor(((m % 1440) + 1440) % 1440 / 60), ((m % 60) + 60) % 60); return d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) }
const durText = m => (m >= 60 ? (Math.floor(m / 60) + ' ' + U('h') + (m % 60 ? ' ' + (m % 60) + ' ' + U('mn') : '')) : t('{0} min', n0(m)))
const kindName = b => (b.n ? t(b.n) : b.k === 'meal' ? t((MEALS.find(m => m.key === b.meal) || MEALS[1]).name) : t((KINDS[b.k] || KINDS.other).name))
const itemName = x => (x.own ? x.name : t(x.name))
/** 11.0: the name with how many ("Boiled egg ×2") — nuts are in grams, shown elsewhere. */
const itemLabel = x => itemName(x) + (x.kind !== 'n' && x.q > 1 ? ' ×' + n0(x.q) : '')
const iconOf = b => b.ic || (KINDS[b.k] || KINDS.other).icon
const FOOD_ICON = { dishes: 'fork', grains: 'sparkles', meat: 'flame', dairy: 'drop', veg: 'leafy', fruit: 'apple', legumes: 'nut', fast: 'bolt', sweets: 'star', drinks: 'cup' }
const shortDays = () => DAYS.map(d => t(d))
const sameDays = (w, set) => Array.isArray(w) && w.length === set.length && set.every(d => w.includes(d))
const dayLabel = w => (sameDays(w, WEEKEND) ? t('Weekend') : daysLabel(w, shortDays(), t, weekStartOf()))
/** The timeline marks a block's days only when they are unusual (not every day, school days or the weekend). */
const oddDays = w => Array.isArray(w) && w.length > 0 && !sameDays(w, SCHOOL_DAYS) && !sameDays(w, WEEKEND)
const remindText = rm => (rm === -1 ? t('Off') : !rm ? t('At the start') : t('{0} min before', n0(rm)))

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

// 11.0 — a food from the database (eggs, bread, rice, stews, fruit…), per serving
function FoodPick({ onPick, close }) {
  const St = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('dishes')
  const list = q.trim() ? searchFoods(St, q).filter(f => !f.custom).slice(0, 80) : FOODS.filter(f => f.cat === cat)
  return <div className="dk-pick">
    <h3>{t('Choose a food')}</h3>
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search foods')} />
    {!q.trim() && <div className="dk-chips scroll">{FOOD_CATS.map(c => <button key={c.key} className={'chip nocap' + (cat === c.key ? ' on' : '')} aria-pressed={cat === c.key} onClick={() => setCat(c.key)}><Icon name={c.icon} />{t(c.name)}</button>)}</div>}
    <div className="list dk-pick-l">
      {list.map(f => <button key={f.id} className="item dk-pick-i" onClick={() => { onPick(f); close() }}>
        <span className="dp-ki" style={{ '--c': KINDS.meal.color }}><Icon name={FOOD_ICON[f.cat] || 'fork'} /></span>
        <div className="grow"><div className="tt">{t(f.name)}</div><div className="ss">{n0(f.kcal)} {U('kcal')} · {servingText(f, U)}</div></div>
        <Icon name="plus" />
      </button>)}
      {!list.length && <div className="empty small">{t('Nothing found')}</div>}
    </div>
  </div>
}
export const foodPickSheet = onPick => ui().openSheet(close => <FoodPick onPick={onPick} close={close} />)

function ItemArt({ St, it, size = 26 }) {
  if (it.t === 'd') return <DrinkGlass drink={drinkOf(St, it.id)} size={size} />
  if (it.t === 's' && SODA_BY_ID[it.id]) return <SodaArt soda={SODA_BY_ID[it.id]} pk={it.pk} ml={it.ml} size={size} />
  if (it.t === 'n' && NUT_BY_ID[it.id]) return <NutArt nut={NUT_BY_ID[it.id]} form={it.fm} size={size + 4} />
  const f = it.t === 'f' ? itemInfo(St, it) : null
  return <span className="dp-ki" style={{ '--c': KINDS.meal.color }}><Icon name={f ? FOOD_ICON[f.cat] || 'fork' : 'fork'} /></span>
}
const itemSub = x => (x.kind === 's' ? sizeText(x.size, x.pk) + ' · ' : x.kind === 'n' ? n0(x.g) + ' ' + U('g') + ' · ' : '') + n0(x.kcal) + ' ' + U('kcal')

// ---- weekday chips ---------------------------------------------------------------------------------
function DayChips({ value, onChange }) {
  const order = weekOrder(weekStartOf())
  const sel = cleanDays(value) || DAY_ALL
  const toggle = d => {
    const x = sel.includes(d) ? sel.filter(y => y !== d) : [...sel, d]
    if (x.length) onChange(cleanDays(x))
  }
  const same = arr => sel.length === arr.length && arr.every(d => sel.includes(d))
  return <div className="sc-days">
    <div className="sc-days-row" role="group" aria-label={t('Days')}>
      {order.map(d => <button key={d} className={'sc-day' + (sel.includes(d) ? ' on' : '')} aria-pressed={sel.includes(d)} title={t(DAYN[d])} onClick={() => toggle(d)}>{t(DAYS[d])}</button>)}
    </div>
    <div className="sc-days-q">
      <button className={'chip nocap' + (same(DAY_ALL) ? ' on' : '')} onClick={() => onChange(undefined)}>{t('Every day')}</button>
      <button className={'chip nocap' + (same(SCHOOL_DAYS) ? ' on' : '')} onClick={() => onChange([...SCHOOL_DAYS])}><Icon name="school" />{t('School days')}</button>
      <button className={'chip nocap' + (same(WEEKEND) ? ' on' : '')} onClick={() => onChange([...WEEKEND])}>{t('Weekend')}</button>
    </div>
  </div>
}

// ---- block editor ---------------------------------------------------------------------------------
const DURS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 310]
function BlockEdit({ block: b0, close, target }) {
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const isNew = !b0.id
  const [b, setB] = useState(() => ({ k: 'study', s: 9 * 60, d: 30, items: [], meal: 'l', ...b0 }))
  const set = patch => setB(x => ({ ...x, ...patch }))
  const items = (b.items || []).map((it, i) => ({ it, i, x: itemInfo(St, it) })).filter(z => z.x)
  const kcal = items.reduce((a, z) => a + z.x.kcal, 0)
  const save = () => {
    update(s => { s.planner = normPlan(s.planner) || newPlan('custom'); upsertBlock(s, b) })
    close()
    toast(isNew ? t('Added to your schedule') : t('Saved'))
  }
  const del = () => confirmSheet({ title: t('Delete this block?'), message: kindName(b) + ' · ' + clock(b.s), confirmText: t('Delete'), danger: true,
    onConfirm: () => { update(s => { removeBlock(s, b.id) }); close() } })
  const add = it => setB(x => ({ ...x, items: [...(x.items || []), it].slice(0, 8) }))
  const addRecipe = () => recipePickSheet(b.meal || 'l', target, r => add({ t: 'r', id: r.id, q: 1 }))
  const addDrink = () => pickDrinkSheet(d => add({ t: 'd', id: d.id, q: 1 }))
  const addSoda = () => pickSodaSheet(({ s, pk, ml, q }) => add({ t: 's', id: s.id, pk, ml, q }))
  const addNut = () => pickNutSheet(({ n, fm, g }) => add({ t: 'n', id: n.id, fm, g, q: 1 }))
  const addFood = () => foodPickSheet(f => add({ t: 'f', id: f.id, q: 1 }))
  const setQ = (i, q) => setB(x => ({ ...x, items: x.items.map((it, k) => (k === i ? { ...it, q: Math.min(8, Math.max(0.5, q)) } : it)) }))
  const rmItem = i => setB(x => ({ ...x, items: x.items.filter((_, k) => k !== i) }))
  const K = KINDS[b.k] || KINDS.other
  const end = (b.s + b.d) % 1440
  const setEnd = v => { const e = toMin(v); const d = (e - b.s + 1440) % 1440; set({ d: Math.max(5, d || 5) }) }
  const rm = b.rm === undefined ? 0 : b.rm
  return <div className="dp-edit" style={{ '--c': K.color }}>
    <h3>{isNew ? t('Add a block') : t('Edit block')}</h3>
    <div className="dp-kinds" role="radiogroup" aria-label={t('Kind')}>
      {KIND_KEYS.map(k => <button key={k} role="radio" aria-checked={b.k === k} className={'dp-kind' + (b.k === k ? ' on' : '')} style={{ '--c': KINDS[k].color }}
        onClick={() => set({ k, ic: k === b.k ? b.ic : undefined, items: hasItems(k) ? (b.items || []) : [], d: k === 'sleep' ? 480 : k === 'school' && b.d < 120 ? 310 : b.k === 'sleep' ? 30 : b.d })}>
        <Icon name={KINDS[k].icon} /><span>{t(KINDS[k].name)}</span>
      </button>)}
    </div>
    <TextField value={b.n ? t(b.n) : ''} onChange={e => set({ n: e.target.value.slice(0, 40) })} placeholder={t('Title (optional)')} dir="auto" />
    <div className="dp-icons scroll" role="radiogroup" aria-label={t('Icon')}>
      <button role="radio" aria-checked={!b.ic} className={'dp-icon' + (!b.ic ? ' on' : '')} onClick={() => set({ ic: undefined })} title={t('Auto')}><Icon name={K.icon} /></button>
      {BLOCK_ICONS.filter(x => x !== K.icon).map(x => <button key={x} role="radio" aria-checked={b.ic === x} className={'dp-icon' + (b.ic === x ? ' on' : '')} onClick={() => set({ ic: x })}><Icon name={x} /></button>)}
    </div>
    <div className="dp-time">
      <label><span className="lbl2">{t('Starts')}</span><input className="input" type="time" value={toHHMM(b.s)} onChange={e => e.target.value && set({ s: toMin(e.target.value) })} /></label>
      <label><span className="lbl2">{t('Ends')}</span><input className="input" type="time" value={toHHMM(end)} onChange={e => e.target.value && setEnd(e.target.value)} /></label>
      <label className="dp-lasts"><span className="lbl2">{t('Lasts')}</span><b className="dp-dur">{durText(b.d)}</b></label>
    </div>
    <div className="dp-durs scroll">
      {(b.k === 'sleep' ? [360, 420, 480, 540, 600] : DURS).map(m => <button key={m} className={'chip nocap' + (b.d === m ? ' on' : '')} onClick={() => set({ d: m })}>{durText(m)}</button>)}
    </div>

    <div className="sc-sec"><Icon name="calendar" /><span className="lbl2 grow">{t('Repeat on')}</span><span className="small muted">{dayLabel(b.w)}</span></div>
    <DayChips value={b.w} onChange={w => set({ w })} />

    <div className="sc-sec"><Icon name="bell" /><span className="lbl2 grow">{t('Reminder')}</span><span className="small muted">{remindText(rm)}</span></div>
    <div className="dp-durs scroll sc-rm">
      {REMIND_OPTS.map(v => <button key={v} className={'chip nocap' + (rm === v ? ' on' : '')} aria-pressed={rm === v} onClick={() => set({ rm: v })}>
        {v === -1 ? <><Icon name="bellSlash" />{t('Off')}</> : v === 0 ? t('At the start') : t('{0} min before', n0(v))}</button>)}
    </div>
    {!MOBILE && <div className="small muted sc-note">{t('Reminders ring in the phone app.')}</div>}

    <label className="sc-notes">
      <span className="lbl2">{t('Notes')}</span>
      <textarea className="input" rows={2} dir="auto" maxLength={NOTE_MAX} value={noteText(b.nt, t)} placeholder={b.k === 'school' ? t('e.g. Maths exam — take the calculator') : t('Anything you want to remember — it shows in the reminder')}
        onChange={e => set({ nt: e.target.value.slice(0, NOTE_MAX) })} />
    </label>

    {b.k === 'meal' && <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={b.meal || 'l'} onChange={v => set({ meal: v })} />}
    {b.k === 'water' && <div className="kit-sv">
      <span>{t('Water')}</span>
      <div className="kit-svc">
        <button className="iconbtn" aria-label={t('Less')} onClick={() => set({ ml: Math.max(100, (b.ml || 250) - 50) })}><Icon name="minus" /></button>
        <b>{n0(b.ml || 250)} {U('ml')}</b>
        <button className="iconbtn" aria-label={t('More')} onClick={() => set({ ml: Math.min(1000, (b.ml || 250) + 50) })}><Icon name="plus" /></button>
      </div>
    </div>}
    {b.k === 'walk' && <div className="kit-sv">
      <span>{t('Water on the way')}</span>
      <div className="kit-svc">
        <button className="iconbtn" aria-label={t('Less')} disabled={!b.ml} onClick={() => set({ ml: (b.ml || 0) <= 100 ? 0 : b.ml - 50 })}><Icon name="minus" /></button>
        <b>{b.ml ? n0(b.ml) + ' ' + U('ml') : t('None')}</b>
        <button className="iconbtn" aria-label={t('More')} onClick={() => set({ ml: Math.min(1000, b.ml ? b.ml + 50 : 250) })}><Icon name="plus" /></button>
      </div>
    </div>}
    {hasItems(b.k) && <>
      <div className="dp-items-h"><span className="lbl2 grow">{b.k === 'meal' ? t('What you will eat') : b.k === 'drink' ? t('What you will drink') : t('Food & drinks (optional)')}</span>
        <b className={'dp-kc' + (target && kcal > target * 1.1 ? ' over' : '')}>{n0(kcal)}{target ? ' / ' + n0(target) : ''} {U('kcal')}</b></div>
      <div className="dp-items">
        {items.map(({ it, i, x }) => <div key={i} className="dp-item">
          <ItemArt St={St} it={it} />
          <div className="grow"><div className="tt" dir="auto">{itemName(x)}</div><div className="ss">{itemSub(x)}</div></div>
          {it.t !== 'n' && <div className="stp dp-q">
            <button onClick={() => setQ(i, (it.q || 1) - 0.5)} aria-label={t('Less')}><Icon name="minus" /></button>
            <span className="val">{(it.q || 1).toLocaleString(dateLocale())}</span>
            <button onClick={() => setQ(i, (it.q || 1) + 0.5)} aria-label={t('More')}><Icon name="plus" /></button>
          </div>}
          <button className="iconbtn" aria-label={t('Remove')} onClick={() => rmItem(i)}><Icon name="xmark" /></button>
        </div>)}
        {!items.length && <div className="small muted dp-empty-i">{b.k === 'meal' ? t('Plan the dishes and the calories are counted exactly.') : b.k === 'drink' ? t('Pick a drink — its calories and water are counted.') : t('Add a snack or a drink to this block if you like — it is counted and shows in the reminder.')}</div>}
      </div>
      <div className="dp-add-row">
        {(b.k === 'meal' || b.k === 'school' || b.k === 'work' || b.k === 'other') && <Button variant="tinted" size="sm" icon="fork" onClick={addRecipe}>{t('Add a dish')}</Button>}
        {b.k !== 'drink' && <Button variant="tinted" size="sm" icon="apple" onClick={addFood}>{t('Add a food')}</Button>}
        <Button variant="tinted" size="sm" icon="cup" onClick={addDrink}>{t('Add a drink')}</Button>
        <Button variant="tinted" size="sm" icon="can" onClick={addSoda}>{t('Soft drink')}</Button>
        <Button variant="tinted" size="sm" icon="nut" onClick={addNut}>{t('Nuts')}</Button>
      </div>
    </>}
    <div className="dp-edit-save">
      {!isNew && <Button variant="plain" icon="trash" className="danger" onClick={del}>{t('Delete')}</Button>}
      <Button variant="primary" icon="check" onClick={save}>{t('Save')}</Button>
    </div>
  </div>
}
export const blockSheet = (block, target = 0) => ui().openSheet(close => <BlockEdit block={block} target={target} close={close} />)

// ---- copy a day ------------------------------------------------------------------------------------
function CopyDay({ from, close }) {
  const update = useStore(s => s.update)
  const order = weekOrder(weekStartOf())
  const [to, setTo] = useState([])
  const toggle = d => setTo(x => (x.includes(d) ? x.filter(y => y !== d) : [...x, d]))
  return <div className="dp-edit">
    <h3>{t('Copy {0} to…', t(DAYN[from]))}</h3>
    <p className="small muted">{t('The days you pick get exactly the same blocks as {0}.', t(DAYN[from]))}</p>
    <div className="sc-days-row big">
      {order.filter(d => d !== from).map(d => <button key={d} className={'sc-day' + (to.includes(d) ? ' on' : '')} aria-pressed={to.includes(d)} onClick={() => toggle(d)}>{t(DAYN[d])}</button>)}
    </div>
    <div className="dp-edit-save">
      <Button variant="primary" icon="check" disabled={!to.length} onClick={() => { update(s => { s.planner = normPlan(s.planner); copyDay(s, from, to) }); close(); toast(t('Copied to {0} days', n0(to.length))) }}>{t('Copy')}</Button>
    </div>
  </div>
}
const copyDaySheet = from => ui().openSheet(close => <CopyDay from={from} close={close} />)

// ---- the screen ------------------------------------------------------------------------------------
function Onboard({ St }) {
  const update = useStore(s => s.update)
  const p = planPrefs(St.planner || (St.day ? { wake: St.day.wake, sleep: St.day.sleep } : {}))
  const [wake, setWake] = useState(p.wake)
  const [sleep, setSleep] = useState(p.sleep)
  const make = tpl => {
    const F = St.fasting || {}
    // 10.0: on the phone a new schedule reminds at each block from the start (permission asked once)
    update(s => { s.planner = newPlan(tpl, s.planner || {}, { prefs: { wake, sleep }, suhoor: F.suhoor, iftar: F.iftar, seed: new Date().getDate() }); if (MOBILE) s.planner.remind = true })
    if (MOBILE) { setTimeout(() => syncPlanReminders(useStore.getState().S, true), 60); toast(t('Your schedule is ready — reminders are on.')) }
  }
  return <>
    <div className="card dp-intro">
      <span className="dp-intro-art" aria-hidden="true">{['sun', 'school', 'dumbbell', 'fork', 'moon'].map((k, i) => <span key={k} style={{ '--i': i, '--c': Object.values(KINDS)[i * 2].color }}><Icon name={k} /></span>)}</span>
      <h2>{t('Plan your day')}</h2>
      <p className="small muted">{t('School, study, work, workout, rest, meals and drinks — each at its time, with reminders that show everything you planned.')}</p>
      <div className="dp-time">
        <label><span className="lbl2">{t('I wake up')}</span><input className="input" type="time" value={wake} onChange={e => e.target.value && setWake(e.target.value)} /></label>
        <label><span className="lbl2">{t('I sleep')}</span><input className="input" type="time" value={sleep} onChange={e => e.target.value && setSleep(e.target.value)} /></label>
      </div>
    </div>
    <div className="dp-tpls">
      {TEMPLATES.map((x, i) => <button key={x.id} className={'card dp-tpl' + (x.id === 'school' ? ' feat' : '')} style={{ '--i': i }} onClick={() => make(x.id)}>
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

function LiveCard({ St, live, iso, targets }) {
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
        <span className="dp-live-ic"><Icon name={next ? iconOf(next.b) : 'checkCircle'} /></span>
        <div className="grow">
          <div className="lbl2">{next ? t('Up next') : t('Nothing scheduled now')}</div>
          {next && <><b className="dp-live-t">{kindName(next.b)}</b><div className="small">{t('In {0} · at {1}', durText(Math.max(1, Math.round(next.inMin))), clock(next.b.s))}</div></>}
          {next && next.b.nt && <div className="small dp-live-note" dir="auto"><Icon name="pencil" />{noteText(next.b.nt, t)}</div>}
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
    const P2 = normPlan(useStore.getState().S.planner)
    const after = liveState(P2, dayRec(P2, iso))
    if (after.total && after.done >= after.total) { const S2 = useStore.getState().S; celebrate(100, 'plan'); playCheer(S2.sound !== false, 'plan') }
  }
  const go = { workout: ['/start', 'Start workout', 'play'], rest: ['/breathe', 'Breathe', 'wind'], walk: ['/walk', 'Walking', 'figureWalk'] }[b.k]
  return <div className="card dp-live" style={{ '--c': K.color }}>
    <span className="dp-live-bg" aria-hidden="true" />
    <div className="dp-live-top">
      <Ring pct={cur.pct} color={K.color}>
        <Icon name={iconOf(b)} />
        <b>{left >= 60 ? durText(left) : n0(left)}</b>
        {left < 60 && <span>{U('mn')}</span>}
      </Ring>
      <div className="grow">
        <div className="lbl2">{t('Now')}</div>
        <b className="dp-live-t">{kindName(b)}</b>
        <div className="small">{clock(b.s)} – {clock(b.s + b.d)}</div>
        {b.nt && <div className="small dp-live-note" dir="auto"><Icon name="pencil" />{noteText(b.nt, t)}</div>}
        {its.length > 0 && <div className="small dp-live-items">{its.map(itemLabel).join(' · ')} · {n0(its.reduce((a, x) => a + x.kcal, 0))} {U('kcal')}</div>}
        {b.k === 'water' && <div className="small">{t('Drink {0} ml of water.', n0(b.ml || 250))}</div>}
        {b.k === 'walk' && b.ml > 0 && <div className="small">{t('Take {0} ml of water and drink as you walk.', n0(b.ml))}</div>}
        {b.k === 'meal' && !its.length && targets[b.id] > 0 && <div className="small">{t('About {0} kcal for this meal', n0(targets[b.id]))}</div>}
      </div>
    </div>
    <div className="dp-live-act">
      <Button variant="primary" icon="check" onClick={done}>{its.length || b.k === 'water' || (b.k === 'walk' && b.ml > 0) ? t('Log & done') : t('Done')}</Button>
      {go && <Button variant="tinted" icon={go[2]} onClick={() => nav(go[0])}>{t(go[1])}</Button>}
      <button className="iconbtn" aria-label={t('10 more minutes')} title={t('10 more minutes')} onClick={() => {
        // today only: this block and the rest of today move, the schedule stays (review on PR #13)
        update(s => { extendNow(s, cur, 10) })
        toast(t('10 more minutes') + ' · ' + t('Today only'))
      }}><b className="dp-plus10">+10</b></button>
      <button className="iconbtn" aria-label={t('Skip')} onClick={() => update(s => { markBlock(s, iso, b.id, 'skip') })}><Icon name="chevronRight" /></button>
    </div>
    {next && <div className="dp-next"><span className="lbl2">{t('Next')}</span><Icon name={iconOf(next.b)} style={{ color: KINDS[next.b.k].color }} /><b>{kindName(next.b)}</b><span className="small muted">{clock(next.b.s)}</span></div>}
    <Progress live={live} />
  </div>
}

function Progress({ live }) {
  return <div className="dp-prog">
    <div className="dp-prog-bar"><i style={{ width: Math.round(live.pct * 100) + '%' }} /></div>
    <span className="small">{t('{0} of {1} done', n0(live.done), n0(live.total))}</span>
  </div>
}

function WeekStrip({ plan, wd, today, onPick }) {
  const order = weekOrder(weekStartOf())
  return <div className="sc-week" role="tablist" aria-label={t('Days')}>
    {order.map(d => {
      const list = dayOrder(blocksOn(plan, d))
      const school = list.some(b => b.k === 'school')
      return <button key={d} role="tab" aria-selected={wd === d} className={'sc-wd' + (wd === d ? ' on' : '') + (d === today ? ' today' : '')} onClick={() => onPick(d)}>
        <span className="sc-wd-n">{t(DAYS[d])}</span>
        <span className="sc-wd-ic">{school ? <Icon name="school" /> : <i>{n0(list.length)}</i>}</span>
        <span className="sc-wd-dots" aria-hidden="true">{list.slice(0, 5).map(b => <i key={b.id} style={{ background: (KINDS[b.k] || KINDS.other).color }} />)}</span>
      </button>
    })}
  </div>
}

export default function DayPlan() {
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const now = useNow()
  const iso = todayISO()
  const today = now.getDay()
  const [wd, setWd] = useState(today)
  const plan = normPlan(St.planner)
  const goal = foodGoalOf(St, iso).kcal
  const isToday = wd === today
  const live = plan && isToday && isLive(plan, iso) ? liveState(plan, dayRec(plan, iso), now) : null
  // today with today's own changes (+10), the other days as planned
  // 13.1: in the order you live it — a midnight bedtime closes the day (dayOrder)
  const blocks = useMemo(() => (plan ? dayOrder(isToday ? dayBlocks(plan, iso) : blocksOn(plan, wd)) : []), [plan, wd, isToday, iso])
  const targets = useMemo(() => (plan ? mealTargets(St, blocks, goal) : {}), [St, plan, blocks, goal])
  const tot = useMemo(() => (plan ? planTotals(St, blocks, goal) : null), [St, plan, blocks, goal])
  const eaten = dayTotals(St, iso).kcal
  useEffect(() => { syncPlanReminders(useStore.getState().S) }, [St.planner, St.lang]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan) {
    return <div className="narrow dp-page">
      <div className="hdr"><BackButton fallback="/tools" /><div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('My schedule')}</h1><div className="sub">{t('School, meals, drinks, work — everything on time')}</div></div></div>
      <Onboard St={St} />
    </div>
  }
  const sync = () => setTimeout(() => syncPlanReminders(useStore.getState().S, true), 50)
  const start = () => {
    update(s => { s.planner = normPlan(s.planner); startDay(s, iso) })
    toast(t('Your day has started — you’ve got this!'))
    sync()
  }
  const stop = () => confirmSheet({ title: t('Stop today’s plan?'), message: t('Your blocks stay; reminders for today are cancelled.'), confirmText: t('Stop'),
    onConfirm: () => { update(s => { stopDay(s, iso) }); sync() } })
  const reset = () => confirmSheet({ title: t('Choose another template?'), message: t('Your current blocks will be replaced.'), confirmText: t('Continue'),
    onConfirm: () => update(s => { s.planner = null }) })
  const statusOf = id => (live ? (live.items.find(x => x.b.id === id) || {}).st : null)
  const studyMin = (tot.min.study || 0) + (tot.min.work || 0) + (tot.min.school || 0)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const addBlock = s => blockSheet({ s, w: typeDays(plan, wd) })
  const stopped = !!(dayRec(plan, iso) || {}).off
  const upgrade = () => confirmSheet({ title: t('Use your school & work week?'), message: t('Water at 7:00, breakfast, school 7:30–12:40, lunch and rest, work 1:40–6:15 with a break, dinner, a walk with water, study until 11:45 and sleep at 12:00 — Friday and Saturday with the afternoon for study. Your current blocks are replaced and a reminder rings at every step.'), confirmText: t('Update'),
    onConfirm: () => {
      update(s => { s.planner = newPlan('school', normPlan(s.planner) || {}, { seed: new Date().getDate() }); if (MOBILE) s.planner.remind = true })
      sync(); toast(t('Your school & work week is ready'))
    } })
  const keepOld = () => update(s => { s.planner = normPlan(s.planner); s.planner.tv = SCHOOL_TV })
  // the timeline in parts of the day, each with its calories
  const parts = []
  for (const b of blocks) {
    const pt = partOf(b.s)
    const last = parts[parts.length - 1]
    if (!last || last.p.key !== pt.key) parts.push({ p: pt, list: [b], kcal: blockKcal(St, b) })
    else { last.list.push(b); last.kcal += blockKcal(St, b) }
  }

  return <div className="narrow dp-page">
    <div className="hdr">
      <BackButton fallback="/tools" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('My schedule')}</h1>
        <div className="sub">{isToday ? now.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' }) : t(DAYN[wd])}</div></div>
      <button className="iconbtn" aria-label={t('Week at a glance')} title={t('Week at a glance')} onClick={() => weekGlanceSheet(0)}><Icon name="list" /></button>
      <button className="iconbtn" aria-label={t('Add a block')} onClick={() => addBlock(isToday ? Math.min(1435, Math.ceil(nowMin / 15) * 15) : 12 * 60)}><Icon name="plus" /></button>
    </div>

    {oldSchoolPlan(plan) && <div className="card sc-upd">
      <span className="sc-upd-ic"><Icon name="sparkles" /></span>
      <div className="grow"><b>{t('Your school & work week')}</b><div className="small">{t('Water 7:00 · school 7:30–12:40 · work 1:40–6:15 · walk 7–8 · study 8–11:45 · sleep 12:00 — a reminder at every step.')}</div></div>
      <div className="sc-upd-act"><Button size="sm" variant="primary" onClick={upgrade}>{t('Update')}</Button><Button size="sm" variant="plain" onClick={keepOld}>{t('Keep mine')}</Button></div>
    </div>}

    <WeekStrip plan={plan} wd={wd} today={today} onPick={setWd} />
    <WeekKinds plan={plan} onOpen={weekGlanceSheet} />

    {isToday ? (live ? <LiveCard St={St} live={live} iso={iso} targets={targets} />
      : <div className="card dp-start">
        <span className="dp-live-bg" aria-hidden="true" />
        <div className="grow">
          <b className="dp-live-t">{t(TEMPLATES.find(x => x.id === plan.tpl)?.name || 'My schedule')}</b>
          <div className="small">{t('{0} blocks today', n0(blocks.length))}{plan.remind && MOBILE && !stopped ? ' · ' + t('Reminders on') : ''}</div>
          {plan.tpl === 'school' && WEEKEND.includes(wd) && <div className="small dp-we-hint">{t('Your weekend — tap any block to make it yours.')}</div>}
        </div>
        <Button variant="primary" icon="play" onClick={start}>{t('Start my day')}</Button>
      </div>)
      : <div className="card dp-start sc-other">
        <span className="dp-live-bg" aria-hidden="true" />
        <div className="grow">
          <b className="dp-live-t">{t(DAYN[wd])}</b>
          <div className="small">{t('{0} blocks', n0(blocks.length))}{blocks.some(b => b.k === 'school') ? ' · ' + t('School day') : ''}</div>
          {plan.tpl === 'school' && WEEKEND.includes(wd) && <div className="small dp-we-hint">{t('Your weekend — tap any block to make it yours.')}</div>}
        </div>
        <Button variant="tinted" icon="copy" onClick={() => copyDaySheet(wd)}>{t('Copy')}</Button>
      </div>}

    <div className="dp-stats">
      <div className="dp-stat" style={{ '--c': 'var(--orange)' }}>
        <Icon name="flame" /><b>{n0(tot.kcal)}</b><span>{t('of {0} kcal planned', n0(goal))}</span>
        <i className="dp-stat-bar"><em style={{ width: Math.min(100, tot.kcal / Math.max(1, goal) * 100) + '%' }} /></i>
      </div>
      <div className="dp-stat" style={{ '--c': 'var(--blue)' }}><Icon name="drop" /><b>{n0(tot.ml)}</b><span>{U('ml')} · {t('Water')}</span></div>
      <div className="dp-stat" style={{ '--c': '#5e5ce6' }}><Icon name="book" /><b>{durText(studyMin)}</b><span>{t('School, study & work')}</span></div>
      <div className="dp-stat" style={{ '--c': '#ff375f' }}><Icon name="dumbbell" /><b>{durText((tot.min.workout || 0) + (tot.min.walk || 0))}</b><span>{t('Moving')}</span></div>
    </div>
    {(tot.p > 0 || tot.c > 0 || tot.f > 0) && <div className="dp-macros">
      <span style={{ '--c': '#ff375f' }}><i />{t('Protein')} <b>{n0(tot.p)} {U('g')}</b></span>
      <span style={{ '--c': '#ffd60a' }}><i />{t('Carbs')} <b>{n0(tot.c)} {U('g')}</b></span>
      <span style={{ '--c': '#64d2ff' }}><i />{t('Fat')} <b>{n0(tot.f)} {U('g')}</b></span>
    </div>}
    {live && <div className="small muted dp-eaten">{t('Eaten so far: {0} of {1} kcal', n0(eaten), n0(goal))}</div>}

    <div className="dp-tl" key={wd}>
      {parts.map(({ p, list, kcal }, pi) => <div key={p.key + pi} className="dp-part" role="list" aria-label={t(p.name)}>
        <div className="dp-part-h" role="presentation"><Icon name={p.icon} /><b>{t(p.name)}</b><span className="small muted">{t('{0} blocks', n0(list.length))}{kcal > 0 ? ' · ' + n0(kcal) + ' ' + U('kcal') : ''}</span></div>
      {list.map(b => {
        const i = blocks.indexOf(b)
        const K = KINDS[b.k] || KINDS.other, st = statusOf(b.id)
        const kc = blockKcal(St, b), ml = blockMl(St, b)
        const its = (b.items || []).map(it => itemInfo(St, it)).filter(Boolean)
        const rm = b.rm === undefined ? 0 : b.rm
        return <div key={b.id} role="listitem" className={'dp-b' + (st ? ' ' + st : '')} style={{ '--c': K.color, '--i': Math.min(i, 14) }}>
          <span className="dp-b-time">{clock(b.s)}</span>
          <span className="dp-b-rail"><i /></span>
          <button className="dp-b-card" onClick={() => blockSheet(plan.blocks.find(x => x.id === b.id) || b, targets[b.id] || 0)}>
            <span className="dp-b-ic"><Icon name={st === 'done' ? 'check' : iconOf(b)} /></span>
            <span className="grow">
              <b>{kindName(b)}</b>
              <span className="small muted">{b.k === 'sleep' || b.k === 'wake' ? durText(b.d) : clock(b.s) + ' – ' + clock(b.s + b.d)}
                {kc > 0 && <> · {n0(kc)} {U('kcal')}</>}
                {b.k === 'meal' && !kc && targets[b.id] > 0 && <> · ≈{n0(targets[b.id])} {U('kcal')}</>}
                {ml > 0 && <> · {n0(ml)} {U('ml')}</>}
              </span>
              {b.nt && <span className="dp-b-note" dir="auto"><Icon name="pencil" />{noteText(b.nt, t)}</span>}
              {its.length > 0 && <span className="dp-b-items" dir="auto">{its.map(itemLabel).join(' · ')}</span>}
              <span className="sc-b-meta">
                {b.mv && <span className="sc-pill moved"><Icon name="clock" />{t('Today only')}</span>}
                {oddDays(b.w) && <span className="sc-pill"><Icon name="calendar" />{dayLabel(b.w)}</span>}
                {MOBILE && plan.remind && <span className={'sc-pill' + (rm < 0 ? ' off' : '')}><Icon name={rm < 0 ? 'bellSlash' : 'bell'} />{rm > 0 ? '−' + n0(rm) + ' ' + U('mn') : rm < 0 ? t('Off') : clock(b.s)}</span>}
              </span>
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
      </div>)}
      {!blocks.length && <div className="empty small"><div className="ico"><Icon name="calendar" /></div>{t('Nothing planned on this day yet.')}</div>}
    </div>
    <Button variant="tinted" icon="plus" onClick={() => addBlock(12 * 60)}>{t('Add a block')}</Button>

    <Section title={t('Reminders')} footer={MOBILE ? t('Each reminder shows the time, your notes and the food and drinks you chose — with Done ✓ and In 10 min.') : t('Reminders ring in the phone app.')}>
      {MOBILE && <Row icon="bell" iconTint="var(--red)" title={t('Remind me at each block')} subtitle={stopped ? t('Paused for today') : t('Every day, as your schedule says')}>
        <Switch checked={plan.remind} onChange={v => { update(s => { s.planner = normPlan(s.planner); s.planner.remind = v }); sync() }} />
      </Row>}
      <Row icon="bellBadge" iconTint="var(--orange)" title={t('All notifications')} subtitle={t('Water, workouts, schedule, medicines — in one place')} accessory="chevron" onClick={() => nav('/notifications')} />
    </Section>
    <Section title={t('Settings')}>
      <Row icon="sun" iconTint="var(--yellow)" title={t('I wake up')}><input className="input fs-tin" type="time" value={plan.wake} onChange={e => e.target.value && update(s => { s.planner.wake = e.target.value })} /></Row>
      <Row icon="moon" iconTint="var(--indigo)" title={t('I sleep')}><input className="input fs-tin" type="time" value={plan.sleep} onChange={e => e.target.value && update(s => { s.planner.sleep = e.target.value })} /></Row>
      <Row icon="calendar" iconTint="var(--green)" title={t('Run it every day')} subtitle={t('The live view starts by itself each morning')}>
        <Switch checked={plan.auto} onChange={v => { update(s => { s.planner = normPlan(s.planner); s.planner.auto = v }); sync() }} />
      </Row>
      <Row icon="list" iconTint="var(--blue)" title={t('Week at a glance')} subtitle={t('Every day of your week, its times and reminders')} accessory="chevron" onClick={() => weekGlanceSheet(0)} />
      <Row icon="upload" iconTint="var(--green)" title={t('Share my schedule')} subtitle={t('As text — WhatsApp, notes or print')} accessory="chevron" onClick={() => shareSchedule()} />
      <Row icon="copy" iconTint="var(--teal)" title={t('Copy {0} to other days', t(DAYN[wd]))} accessory="chevron" onClick={() => copyDaySheet(wd)} />
      {live && <Row icon="stop" iconTint="var(--orange)" title={t('Stop today’s plan')} accessory="chevron" onClick={stop} />}
      <Row icon="layers" iconTint="var(--purple)" title={t('Choose another template')} accessory="chevron" onClick={reset} />
    </Section>
    <p className="small muted dp-foot">{t('Meal targets share what is left of your daily goal after the drinks and snacks you planned.')}</p>
  </div>
}
