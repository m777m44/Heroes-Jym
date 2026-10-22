// 5.0 — the food log's panels, shared by the Food screen and the Home card:
//   addFoodSheet     search the database (Arabic or English), recent, favourites, your foods, categories
//   amountSheet      how much, which meal — calories and macros update as you change it
//   entrySheet       change or delete something already logged
//   quickSheet       just a number of calories (and an optional name)
//   customFoodSheet  create / edit your own food
//   foodGoalSheet    the daily calorie goal: automatic or set by hand
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, U, dateLocale } from '../../lib/i18n.js'
import { nav } from '../../lib/nav.js'
import { FOOD_CATS } from '../../lib/foodDb.js'
import {
  MEALS, QTY_STEP, MAX_QTY, MIN_GOAL, MAX_GOAL, clampQty, foodName, foodOf, searchFoods, recentFoods, makeEntry, addEntry,
  editEntry, removeEntry, toggleFav, saveCustomFood, deleteCustomFood, servingText, foodGoalOf, dayTotals, mealAt,
} from '../../lib/food.js'
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
      </div>}
    </div>
    <div className="food-add-more">
      <Button variant="tinted" icon="bolt" onClick={() => quickSheet({ iso, meal })}>{t('Quick calories')}</Button>
      <Button variant="tinted" icon="plus" onClick={() => customFoodSheet(null, { iso, meal, name: q.trim() })}>{t('Create a food')}</Button>
    </div>
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
      <div className="grow"><h3 style={{ margin: 0 }}>{name}</h3><div className="small muted">{f ? servingText(f, U) : t('Quick calories')}</div></div>
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

// ---- your own food --------------------------------------------------------------------------
function CustomFood({ existing, iso, meal, name: prefill, close }) {
  const [n, setN] = useState(existing ? existing.n : prefill || '')
  const [v, setV] = useState(() => ({ kcal: existing ? existing.kcal : '', p: existing ? existing.p : '', c: existing ? existing.c : '', f: existing ? existing.f : '' }))
  const set = k => e => setV(o => ({ ...o, [k]: e.target.value }))
  const save = () => {
    let food
    try { update(s => { food = saveCustomFood(s, { id: existing && existing.id, n, kcal: v.kcal, p: v.p, c: v.c, f: v.f }) }) } catch (e) { toast(t(e.key || 'Something went wrong')); return }
    close()
    toast(existing ? t('Saved') : t('“{0}” created', food.n))
    if (!existing && iso) amountSheet({ food, iso, meal })
  }
  const del = () => { update(s => { deleteCustomFood(s, existing.id) }); close(); toast(t('Removed {0}', existing.n)) }
  return <>
    <h3>{existing ? t('Edit your food') : t('Create a food')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Per serving — it shows up in search and under My foods.')}</div>
    <input className="input" maxLength={60} placeholder={t('Food name')} value={n} onChange={e => setN(e.target.value)} />
    <div className="food-form">
      <label><span>{t('Calories')}</span><input className="input" type="number" inputMode="numeric" min="1" max="5000" value={v.kcal} onChange={set('kcal')} placeholder="0" /></label>
      <label><span>{t('Protein')} ({U('g')})</span><input className="input" type="number" inputMode="decimal" min="0" value={v.p} onChange={set('p')} placeholder="0" /></label>
      <label><span>{t('Carbs')} ({U('g')})</span><input className="input" type="number" inputMode="decimal" min="0" value={v.c} onChange={set('c')} placeholder="0" /></label>
      <label><span>{t('Fat')} ({U('g')})</span><input className="input" type="number" inputMode="decimal" min="0" value={v.f} onChange={set('f')} placeholder="0" /></label>
    </div>
    <div style={{ height: 14 }} />
    <Button variant="primary" icon="check" onClick={save}>{existing ? t('Save') : t('Create and add')}</Button>
    {existing && <><div style={{ height: 8 }} /><Button variant="danger" icon="trash" onClick={del}>{t('Delete food')}</Button></>}
  </>
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
