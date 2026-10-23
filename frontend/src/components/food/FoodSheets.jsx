// 5.0 — the food log's panels, shared by the Food screen and the Home card:
//   addFoodSheet     search the database (Arabic or English), recent, favourites, your foods, categories
//   amountSheet      how much, which meal — calories and macros update as you change it
//   entrySheet       change or delete something already logged
//   quickSheet       just a number of calories (and an optional name)
//   customFoodSheet  create / edit your own food
//   foodGoalSheet    the daily calorie goal: automatic or set by hand
import { useMemo, useState } from 'react'
import { burst, lastTap } from '../../lib/motion.js'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, U, dateLocale, getLang } from '../../lib/i18n.js'
import { nav } from '../../lib/nav.js'
import { FOOD_CATS } from '../../lib/foodDb.js'
import {
  MEALS, QTY_STEP, MAX_QTY, MIN_GOAL, MAX_GOAL, clampQty, foodName, foodOf, searchFoods, recentFoods, makeEntry, addEntry,
  editEntry, removeEntry, toggleFav, saveCustomFood, deleteCustomFood, servingText, foodGoalOf, dayTotals, mealAt,
} from '../../lib/food.js'
import { estimateFood, scaleFood, kcalFromMacros } from '../../lib/foodEstimate.js'
import { itemsTotals, saveBuiltMeal, searchIngredients, ING_BY_ID } from '../../lib/kitchen.js'
import Icon from '../Icon.jsx'
import { Button, Segmented } from '../ui.jsx'

const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const S = () => useStore.getState().S
const update = fn => useStore.getState().update(fn)
export const n0 = v => Math.round(v).toLocaleString(dateLocale())
const n1 = v => (Math.round(v * 10) / 10).toLocaleString(dateLocale())
const catOf = key => FOOD_CATS.find(c => c.key === key)
export const mealName = key => t((MEALS.find(m => m.key === key) || MEALS[3]).name)
const qtyText = q => (q === 1 ? '' : '× ' + n1(q) + ' · ')

/** The coloured bubble for a food (its category's icon), or a fork for your own / quick ones. */
export function FoodBubble({ food, size = 36 }) {
  const c = food && catOf(food.cat)
  return <span className="food-bub" style={{ '--tint': c ? c.color : 'var(--accent, var(--acc))', width: size, height: size }}>
    <Icon name={c ? c.icon : 'fork'} />
  </span>
}

/** A ring of eaten / goal (SVG). Over the goal it turns orange, 10 % over red. */
export function FoodRing({ eaten, goal, size = 132, stroke = 12, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const pct = goal > 0 ? eaten / goal : 0
  const color = pct > 1.1 ? 'var(--red)' : pct > 1 ? 'var(--orange)' : 'var(--green)'
  const dash = Math.min(1, pct) * c
  return <div className="food-ring" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="food-ring-arc" />
    </svg>
    <div className="food-ring-c">{children}</div>
  </div>
}

// ---- add ----------------------------------------------------------------------------------
function AddFood({ iso, meal: meal0, close }) {
  const St = useStore(s => s.S)
  const [q, setQ] = useState('')
  const recent = useMemo(() => recentFoods(St, iso, 12), [St, iso])
  const [tab, setTab] = useState(() => (recent.length ? 'recent' : null))
  const [meal, setMeal] = useState(meal0 || mealAt())
  const fav = new Set(St.foodFav || [])
  const list = q.trim() ? searchFoods(St, q, null) : tab === 'recent' ? recent : searchFoods(St, '', tab)
  const totals = dayTotals(St, iso)
  const tabs = [
    ...(recent.length ? [{ key: 'recent', name: 'Recent', icon: 'history' }] : []),
    { key: null, name: 'All', icon: 'list' },
    { key: 'fav', name: 'Favourites', icon: 'starFill' },
    ...((St.customFoods || []).length ? [{ key: 'mine', name: 'My foods', icon: 'fork' }] : []),
    ...FOOD_CATS,
  ]
  return <div className="food-add">
    <h3>{t('Add food')}</h3>
    <div className="food-add-meal">
      <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
      <div className="small muted">{t('{0}: {1} kcal so far', mealName(meal), n0(totals.byMeal[meal]))}</div>
    </div>
    <div className="food-search">
      <Icon name="magnifier" />
      <input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search foods — e.g. dolma, rice, chicken')}
        aria-label={t('Search foods')} enterKeyHint="search" />
      {q && <button className="iconbtn sm" aria-label={t('Clear')} onClick={() => setQ('')}><Icon name="xmark" /></button>}
    </div>
    {!q.trim() && <div className="chips food-tabs" role="tablist">
      {tabs.map(x => <button key={String(x.key)} role="tab" aria-selected={tab === x.key} className={'chip nocap' + (tab === x.key ? ' on' : '')} onClick={() => setTab(x.key)}>
        <Icon name={x.icon} />{t(x.name)}
      </button>)}
    </div>}
    <div className="list food-list">
      {list.map(f => <div key={f.id} className="item" role="button" tabIndex={0} onClick={() => amountSheet({ food: f, iso, meal })}
        onKeyDown={e => { if (e.key === 'Enter') amountSheet({ food: f, iso, meal }) }}>
        <FoodBubble food={f} />
        <div className="grow">
          <div className="tt">{foodName(St, f)}</div>
          <div className="ss">{servingText(f, U)}</div>
        </div>
        <b className="food-kcal">{n0(f.kcal)} <small>{U('kcal')}</small></b>
        <button className={'iconbtn sm food-star' + (fav.has(f.id) ? ' on' : '')} aria-pressed={fav.has(f.id)} aria-label={fav.has(f.id) ? t('Remove from favourites') : t('Add to favourites')}
          onClick={e => { e.stopPropagation(); update(s => { toggleFav(s, f.id) }) }}>
          <Icon name={fav.has(f.id) ? 'starFill' : 'star'} />
        </button>
      </div>)}
      {!list.length && <div className="empty small">
        <div className="ico"><Icon name="magnifier" /></div>
        {q.trim() ? t('Nothing found for “{0}”.', q.trim()) : tab === 'fav' ? t('No favourites yet — tap the star next to a food.') : t('Nothing here yet.')}
        {q.trim() && <><div style={{ height: 10 }} /><Button variant="primary" icon="sparkles" onClick={() => customFoodSheet(null, { iso, meal, name: q.trim() })}>{t('Add “{0}” — the app works out the calories', q.trim())}</Button></>}
      </div>}
    </div>
    <div className="food-add-more">
      <Button variant="tinted" icon="bolt" onClick={() => quickSheet({ iso, meal })}>{t('Quick calories')}</Button>
      <Button variant="tinted" icon="sparkles" onClick={() => customFoodSheet(null, { iso, meal, name: q.trim() })}>{t('Your own food')}</Button>
    </div>
    <button className="card food-kitchen-link" onClick={() => { close(); nav('/kitchen?m=' + meal) }}>
      <span className="startw-ico" style={{ background: 'var(--orange)' }}><Icon name="fork" /></span>
      <span className="grow"><b>{t('What can I cook?')}</b><span className="small muted">{t('Recipes from what you have at home')}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>
    <div style={{ height: 8 }} />
    <Button variant="primary" icon="check" onClick={close}>{t('Done')}</Button>
  </div>
}
export const addFoodSheet = ({ iso, meal } = {}) => ui().openSheet(close => <AddFood iso={iso} meal={meal} close={close} />)

// ---- amount -------------------------------------------------------------------------------
function Amount({ food, iso, meal: meal0, close, entry }) {
  const [q, setQ] = useState(entry ? entry.q : 1)
  const [meal, setMeal] = useState(entry ? entry.m : meal0 || mealAt())
  const base = entry || { kcal: food.kcal, p: food.p, c: food.c, fat: food.f }
  const k = Math.round(base.kcal * q)
  const step = d => setQ(v => clampQty(v + d))
  const save = () => {
    if (entry) {
      update(s => { editEntry(s, iso, entry.id, { q, m: meal }) })
      toast(t('Saved'))
    } else {
      burst(lastTap(), { count: 12, spread: 60, colors: ['#FF6482', '#FF375F', '#FFD60A', '#FF9F0A'] })
      update(s => { addEntry(s, iso, makeEntry(food, { q, m: meal })) })
      toast(t('Added {0} · {1} kcal', foodName(S(), food), n0(k)))
    }
    close()
  }
  const del = () => {
    let gone = null
    update(s => { gone = removeEntry(s, iso, entry.id) })
    close()
    toast(t('Removed {0}', foodName(S(), gone || entry)))
  }
  const name = entry ? foodName(S(), entry) : foodName(S(), food)
  const f = entry ? foodOf(S(), entry.f) : food
  return <div className="food-amount">
    <div className="row" style={{ gap: 12, marginBottom: 10 }}>
      <FoodBubble food={f} size={44} />
      <div className="grow"><h3 style={{ margin: 0 }}>{name}</h3><div className="small muted">{f ? servingText(f, U) : entry && entry.r ? t('Home recipe') : t('Quick calories')}</div></div>
    </div>
    <div className="food-qty">
      <button className="food-qty-b" aria-label={t('Less')} disabled={q <= QTY_STEP} onClick={() => step(-QTY_STEP)}><Icon name="minus" /></button>
      <div className="food-qty-v"><b>{n1(q)}</b><span>{q === 1 ? t('serving') : t('servings')}</span></div>
      <button className="food-qty-b" aria-label={t('More')} disabled={q >= MAX_QTY} onClick={() => step(QTY_STEP)}><Icon name="plus" /></button>
    </div>
    <div className="chips food-qpick">
      {[0.5, 1, 1.5, 2, 3].map(v => <button key={v} className={'chip nocap' + (q === v ? ' on' : '')} onClick={() => setQ(v)}>{'× ' + n1(v)}</button>)}
    </div>
    <div className="food-macros-mini">
      <div className="fm-k"><b>{n0(k)}</b><span>{U('kcal')}</span></div>
      <div style={{ '--tint': 'var(--red)' }}><b>{n1(base.p * q)}</b><span>{t('Protein')}</span></div>
      <div style={{ '--tint': 'var(--yellow)' }}><b>{n1(base.c * q)}</b><span>{t('Carbs')}</span></div>
      <div style={{ '--tint': 'var(--blue)' }}><b>{n1(base.fat * q)}</b><span>{t('Fat')}</span></div>
    </div>
    <div className="lbl2" style={{ margin: '12px 0 6px' }}>{t('Meal')}</div>
    <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
    <div style={{ height: 14 }} />
    <Button variant="primary" icon={entry ? 'check' : 'plus'} onClick={save}>{entry ? t('Save') : t('Add to {0}', mealName(meal))}</Button>
    {entry && <><div style={{ height: 8 }} /><Button variant="danger" icon="trash" onClick={del}>{t('Remove')}</Button></>}
  </div>
}
export const amountSheet = ({ food, iso, meal }) => ui().openSheet(close => <Amount food={food} iso={iso} meal={meal} close={close} />)
export const entrySheet = (iso, entry) => ui().openSheet(close => <Amount food={null} entry={entry} iso={iso} close={close} />)

// ---- quick calories -------------------------------------------------------------------------
function Quick({ iso, meal: meal0, close }) {
  const [kcal, setKcal] = useState('')
  const [name, setName] = useState('')
  const [meal, setMeal] = useState(meal0 || mealAt())
  const save = () => {
    const k = Math.round(Number(kcal))
    if (!(k > 0 && k <= 5000)) { toast(t('Enter the calories (1–5,000).')); return }
    update(s => { addEntry(s, iso, makeEntry({ n: name, kcal: k }, { m: meal })) })
    toast(t('Added {0} · {1} kcal', name.trim() || t('Quick calories'), n0(k)))
    close()
  }
  return <>
    <h3>{t('Quick calories')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('When you know the number — from a label or a menu.')}</div>
    <input className="input food-big-in" type="number" inputMode="numeric" min="1" max="5000" placeholder="0" value={kcal} onChange={e => setKcal(e.target.value)} aria-label={t('Calories')} />
    <div className="small muted" style={{ textAlign: 'center', margin: '4px 0 12px' }}>{U('kcal')}</div>
    <input className="input" maxLength={60} placeholder={t('Name (optional)')} value={name} onChange={e => setName(e.target.value)} />
    <div className="lbl2" style={{ margin: '12px 0 6px' }}>{t('Meal')}</div>
    <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
    <div style={{ height: 14 }} />
    <Button variant="primary" icon="plus" onClick={save}>{t('Add to {0}', mealName(meal))}</Button>
  </>
}
export const quickSheet = ({ iso, meal }) => ui().openSheet(close => <Quick iso={iso} meal={meal} close={close} />)

// ---- your own food ----------------------------------------------------------------------------
// 7.2: you name it and say how much — the app works out the calories. Three ways:
//   Smart        the closest food in the database (or the ingredients the name mentions), scaled
//                to your grams; pick another match if it guessed wrong
//   Ingredients  add what went into it, with grams — the totals add up exactly
//   Manual       type the numbers from a label; leave calories empty and the macros give them
const GRAM_CHIPS = [100, 150, 200, 250, 300, 500]
const CONF = { high: ['var(--green)', 'Close match'], medium: ['var(--orange)', 'Good estimate'], low: ['var(--red)', 'Rough estimate'] }

function EstimateCard({ est, St }) {
  if (!est) return <div className="cf-est empty"><Icon name="sparkles" /><span>{t('Type a name — the app works out the calories.')}</span></div>
  const [col, lbl] = CONF[est.confidence] || CONF.low
  const tot = Math.max(1, est.p * 4 + est.c * 4 + est.f * 9)
  const bar = (k, v, mul, cls) => <div className={'cf-mac ' + cls}><span>{t(k)}</span><i><b style={{ width: Math.round(v * mul / tot * 100) + '%' }} /></i><em>{n0(v)} {U('g')}</em></div>
  return <div className="cf-est" style={{ '--cc': col }}>
    <div className="cf-est-top">
      <div className="cf-est-k"><b key={est.kcal}>{n0(est.kcal)}</b><span>{U('kcal')}</span></div>
      <div className="cf-est-meta">
        <span className="cf-conf"><i />{t(lbl)}</span>
        <span className="small muted">{est.g > 0 ? t('for {0}', n0(est.g) + ' ' + U('g')) : t('1 serving')}</span>
      </div>
    </div>
    <div className="cf-src small">
      <Icon name={est.method === 'food' ? 'checkCircle' : est.method === 'ingredients' ? 'fork' : 'info'} />
      <span>{est.method === 'food' ? t('Based on: {0}', foodName(St, est.match))
        : est.method === 'ingredients' ? t('From ingredients: {0}', est.ings.map(x => t(x.name)).join(getLang() === 'ar' ? '، ' : ', '))
          : t('No close match — estimated from a typical dish. Add grams or pick a match for a better number.')}</span>
    </div>
    <div className="cf-macs">{bar('Protein', est.p, 4, 'p')}{bar('Carbs', est.c, 4, 'c')}{bar('Fat', est.f, 9, 'f')}</div>
  </div>
}

export function CustomFood({ existing, iso, meal, name: prefill, close }) {
  const St = useStore(s => s.S)
  const [n, setN] = useState(existing ? existing.n : prefill || '')
  const [mode, setMode] = useState(existing ? (Array.isArray(existing.items) ? 'ings' : existing.est ? 'auto' : 'manual') : 'auto')
  const [g, setG] = useState(existing && existing.g > 0 ? String(existing.g) : '')
  const [pick, setPick] = useState(null)            // { id, n } — another match you chose for this name
  const [v, setV] = useState(() => ({ kcal: existing ? existing.kcal : '', p: existing ? existing.p : '', c: existing ? existing.c : '', f: existing ? existing.f : '' }))
  const [items, setItems] = useState(() => (existing && Array.isArray(existing.items) ? existing.items.map(i => ({ ...i })) : []))
  const [iq, setIq] = useState('')
  const set = k => e => setV(o => ({ ...o, [k]: e.target.value }))
  const grams = +g > 0 ? +g : null
  const picked = pick && pick.n === n ? foodOf(St, pick.id) : null
  const est = useMemo(() => {
    if (mode !== 'auto') return null
    if (picked) return { ...scaleFood(picked, grams), method: 'food', confidence: 'high', match: picked, ings: [], alts: [] }
    return estimateFood(St, n, { grams, tr: t })
  }, [mode, St, n, grams, picked])
  const alts = est && est.method !== 'food' ? est.alts : est ? [est.match, ...est.alts].filter(Boolean) : []
  const ingTot = itemsTotals(items)
  const macroK = kcalFromMacros(v.p, v.c, v.f)
  const ingHits = iq.trim() ? searchIngredients(iq, t).filter(x => !items.some(i => i.id === x.id)).slice(0, 8) : []
  const save = () => {
    let food
    try {
      update(s => {
        if (mode === 'ings') food = saveBuiltMeal(s, { id: existing && existing.id, n, items, servings: 1 })
        else if (mode === 'auto') {
          if (!est) throw Object.assign(new Error('Give it a name'), { key: 'Give it a name' })
          food = saveCustomFood(s, { id: existing && existing.id, n, kcal: est.kcal, p: est.p, c: est.c, f: est.f, g: est.g, est: est.match ? est.match.id : est.method })
        } else food = saveCustomFood(s, { id: existing && existing.id, n, kcal: v.kcal === '' || v.kcal == null ? macroK : v.kcal, p: v.p, c: v.c, f: v.f, g: grams || 0 })
      })
    } catch (e) { toast(t(e.key || 'Something went wrong')); return }
    close()
    toast(existing ? t('Saved') : t('“{0}” created', food.n))
    if (!existing && iso) amountSheet({ food, iso, meal })
  }
  const del = () => { update(s => { deleteCustomFood(s, existing.id) }); close(); toast(t('Removed {0}', existing.n)) }
  const setIg = (id, val) => setItems(l => l.map(i => (i.id === id ? { ...i, g: Math.max(0, Math.min(2000, val)) } : i)))
  return <div className="cf">
    <h3>{existing ? t('Edit your food') : t('Your own food')}</h3>
    <div className="muted small" style={{ marginBottom: 10 }}>{t('Write what you ate and how much — the app works out the calories.')}</div>
    <input className="input cf-name" maxLength={60} placeholder={t('Food name — e.g. kubba with rice')} value={n} onChange={e => setN(e.target.value)} aria-label={t('Food name')} />
    <Segmented options={[{ value: 'auto', label: t('Smart') }, { value: 'ings', label: t('Ingredients') }, { value: 'manual', label: t('Manual') }]} value={mode} onChange={setMode} />
    {mode !== 'ings' && <div className="cf-grams">
      <label><span>{t('Amount')}</span>
        <span className="cf-g"><input className="input" type="number" inputMode="numeric" min="0" max="5000" value={g} onChange={e => setG(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} placeholder={t('1 serving')} /><em>{U('g')}</em></span>
      </label>
      <div className="cf-chips">
        <button className={'cf-chip' + (!grams ? ' on' : '')} onClick={() => setG('')}>{t('1 serving')}</button>
        {GRAM_CHIPS.map(x => <button key={x} className={'cf-chip' + (grams === x ? ' on' : '')} onClick={() => setG(String(x))}>{n0(x)} {U('g')}</button>)}
      </div>
    </div>}
    {mode === 'auto' && <>
      <EstimateCard est={est} St={St} />
      {alts.length > 1 && <>
        <div className="lbl2">{t('Not right? Pick the closest:')}</div>
        <div className="cf-alts">{alts.slice(0, 5).map(x => <button key={x.id} className={'cf-alt' + (est && est.match && est.match.id === x.id ? ' on' : '')} onClick={() => setPick({ id: x.id, n })}>
          <FoodBubble food={x} size={26} /><span>{foodName(St, x)}</span><em>{n0(scaleFood(x, grams).kcal)}</em>
        </button>)}</div>
      </>}
    </>}
    {mode === 'ings' && <div className="cf-ings">
      <div className="cf-est-k sm"><b key={ingTot.kcal}>{n0(ingTot.kcal)}</b><span>{U('kcal')}</span><small className="muted">{t('for {0}', n0(ingTot.g) + ' ' + U('g'))} · {t('Protein')} {n0(ingTot.p)} · {t('Carbs')} {n0(ingTot.c)} · {t('Fat')} {n0(ingTot.f)}</small></div>
      {items.length > 0 && <div className="list kit-items">{items.map(i => {
        const x = ING_BY_ID[i.id]
        if (!x) return null
        const step = x.unit === 'g' ? 25 : x.g
        return <div key={i.id} className="item kit-item">
          <div className="grow"><div className="tt">{t(x.name)}</div><div className="ss">{n0(x.kcal * i.g / 100)} {U('kcal')}</div></div>
          <div className="kit-svc">
            <button className="iconbtn sm" aria-label={t('Less')} onClick={() => setIg(i.id, i.g - step)}><Icon name="minus" /></button>
            <input className="kit-g" inputMode="numeric" value={i.g} onChange={e => setIg(i.id, +e.target.value.replace(/\D/g, '') || 0)} aria-label={t(x.name)} />
            <span className="small muted">{U('g')}</span>
            <button className="iconbtn sm" aria-label={t('More')} onClick={() => setIg(i.id, i.g + step)}><Icon name="plus" /></button>
          </div>
          <button className="iconbtn sm" aria-label={t('Remove')} onClick={() => setItems(l => l.filter(y => y.id !== i.id))}><Icon name="xmark" /></button>
        </div>
      })}</div>}
      <label className="food-search"><Icon name="magnifier" /><input className="input" type="search" value={iq} onChange={e => setIq(e.target.value)} placeholder={t('Search ingredients')} aria-label={t('Search ingredients')} /></label>
      {ingHits.length > 0 && <div className="cf-alts">{ingHits.map(x => <button key={x.id} className="cf-alt" onClick={() => { setItems(l => [...l, { id: x.id, g: x.unit === 'g' ? 100 : x.g }]); setIq('') }}>
        <Icon name="plus" /><span>{t(x.name)}</span><em>{n0(x.kcal)}/100 {U('g')}</em></button>)}</div>}
    </div>}
    {mode === 'manual' && <>
      <div className="food-form">
        <label><span>{t('Calories')}</span><input className="input" type="number" inputMode="numeric" min="1" max="5000" value={v.kcal} onChange={set('kcal')} placeholder={macroK > 0 ? String(macroK) : '0'} /></label>
        <label><span>{t('Protein')} ({U('g')})</span><input className="input" type="number" inputMode="decimal" min="0" value={v.p} onChange={set('p')} placeholder="0" /></label>
        <label><span>{t('Carbs')} ({U('g')})</span><input className="input" type="number" inputMode="decimal" min="0" value={v.c} onChange={set('c')} placeholder="0" /></label>
        <label><span>{t('Fat')} ({U('g')})</span><input className="input" type="number" inputMode="decimal" min="0" value={v.f} onChange={set('f')} placeholder="0" /></label>
      </div>
      {macroK > 0 && (v.kcal === '' || v.kcal == null) && <div className="small cf-hint"><Icon name="calculator" />{t('Calories from the macros: {0} kcal', n0(macroK))}</div>}
    </>}
    <div style={{ height: 14 }} />
    <Button variant="primary" icon="check" onClick={save}>{existing ? t('Save') : t('Create and add')}</Button>
    {existing && <><div style={{ height: 8 }} /><Button variant="danger" icon="trash" onClick={del}>{t('Delete food')}</Button></>}
  </div>
}
export const customFoodSheet = (existing, opts = {}) => ui().openSheet(close => <CustomFood existing={existing} {...opts} close={close} />)

// ---- the daily goal ---------------------------------------------------------------------------
export const GOAL_SOURCE = {
  manual: 'Set by you',
  calc: 'From your calorie goal',
  ideal: 'From your Ideal body numbers',
  default: 'A standard 2,000 — set your height, age and weight for yours',
}
function FoodGoal({ iso, close }) {
  const St = useStore(s => s.S)
  const auto = foodGoalOf({ ...St, foodGoal: 0 }, iso)
  const [v, setV] = useState(St.foodGoal >= MIN_GOAL ? St.foodGoal : auto.kcal)
  const save = () => {
    const k = Math.round(Number(v))
    if (!(k >= MIN_GOAL && k <= MAX_GOAL)) { toast(t('Choose between {0} and {1} kcal.', n0(MIN_GOAL), n0(MAX_GOAL))); return }
    update(s => { s.foodGoal = k })
    toast(t('Daily goal: {0} kcal', n0(k)))
    close()
  }
  return <>
    <h3>{t('Daily calorie goal')}</h3>
    <div className="card food-auto">
      <div className="small muted">{t('Automatic')}</div>
      <div className="row between"><b>{n0(auto.kcal)} {U('kcal')}</b><span className="small muted">{t(GOAL_SOURCE[auto.source])}</span></div>
      <div style={{ height: 8 }} />
      <Button variant={St.foodGoal >= MIN_GOAL ? 'tinted' : 'plain'} icon="sparkles" onClick={() => { update(s => { delete s.foodGoal }); toast(t('Automatic goal')); close() }}>
        {St.foodGoal >= MIN_GOAL ? t('Use automatic') : t('In use')}
      </Button>
    </div>
    <div className="lbl2" style={{ margin: '14px 0 6px' }}>{t('Or set your own')}</div>
    <div className="food-qty">
      <button className="food-qty-b" aria-label={t('Less')} onClick={() => setV(x => Math.max(MIN_GOAL, Math.round(Number(x) || 0) - 50))}><Icon name="minus" /></button>
      <div className="food-qty-v"><input className="input food-goal-in" type="number" inputMode="numeric" value={v} onChange={e => setV(e.target.value)} aria-label={t('Daily calorie goal')} /><span>{U('kcal')}</span></div>
      <button className="food-qty-b" aria-label={t('More')} onClick={() => setV(x => Math.min(MAX_GOAL, Math.round(Number(x) || 0) + 50))}><Icon name="plus" /></button>
    </div>
    <div style={{ height: 12 }} />
    <Button variant="primary" icon="check" onClick={save}>{t('Save')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="tinted" icon="calculator" onClick={() => { close(); nav('/calories') }}>{t('Work it out with the calorie calculator')}</Button>
  </>
}
export const foodGoalSheet = iso => ui().openSheet(close => <FoodGoal iso={iso} close={close} />)

export const qtyLabel = qtyText
