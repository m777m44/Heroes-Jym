// 6.0 — /kitchen: my kitchen. Three tabs:
//   What can I cook?  recipes for a meal from what you have at home, ready-to-cook first, with
//                     calories worked out from the ingredients and what fits today
//   My kitchen        tick the ingredients you have (or add the basics) + the shopping list
//   Build a meal      put a meal together from ingredients by weight, see its calories live,
//                     log it and/or save it as your own food
// ?m=b|l|d|s opens on a meal, ?tab=pantry|build on a tab.
import { useMemo, useState } from 'react'
import { burst, lastTap } from '../lib/motion.js'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { MEALS, mealAt, dayTotals, foodGoalOf, addEntry, makeEntry } from '../lib/food.js'
import {
  ING_CATS, INGREDIENTS, ING_BY_ID, RECIPE_BY_ID, suggestRecipes, recipeMatch, recipeNutrition, recipeEntry, togglePantry, addBasics,
  clearPantry, addToShopping, toggleShopping, clearShoppingDone, removeShopping, itemsTotals, saveBuiltMeal, searchIngredients,
} from '../lib/kitchen.js'
import Icon from '../components/Icon.jsx'
import { BackButton, Button, Segmented } from '../components/ui.jsx'
import { n0, mealName } from '../components/food/FoodSheets.jsx'
import { stepText } from '../lib/recipeText.js'
import { DRINK_COUNT } from '../lib/drinks.js'
import { nav } from '../lib/nav.js'

const toast = m => useUI.getState().toast(m)
const mealOf = k => MEALS.find(m => m.key === k) || MEALS[3]
const listOf = a => { try { return new Intl.ListFormat(dateLocale(), { style: 'short', type: 'unit' }).format(a) } catch { return a.join(', ') } }
const ingName = id => t((ING_BY_ID[id] || {}).name || id)
const UNIT = {
  piece: () => t('1 piece'), can: () => t('1 can'), cup: () => t('1 cup'), slice: () => t('1 slice'), tbsp: () => t('1 tbsp'),
  tsp: () => t('1 tsp'), handful: () => t('1 handful'), clove: () => t('1 clove'),
}
const unitText = x => (x.unit === 'g' || !UNIT[x.unit] ? '100 ' + U('g') : UNIT[x.unit]() + ' ≈ ' + x.g + ' ' + U('g'))

function MacroTiles({ n, per }) {
  return <div className="kit-macros">
    <div className="kit-mt" style={{ '--tint': 'var(--orange)' }}><b>{n0(n.kcal)}</b><span>{per || U('kcal')}</span></div>
    <div className="kit-mt" style={{ '--tint': 'var(--red)' }}><b>{n0(n.p)}</b><span>{t('Protein')}</span></div>
    <div className="kit-mt" style={{ '--tint': 'var(--yellow)' }}><b>{n0(n.c)}</b><span>{t('Carbs')}</span></div>
    <div className="kit-mt" style={{ '--tint': 'var(--blue)' }}><b>{n0(n.f)}</b><span>{t('Fat')}</span></div>
  </div>
}

// ---- the recipe sheet --------------------------------------------------------------------------
function RecipeView({ id, meal: meal0, close }) {
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const r = RECIPE_BY_ID[id]
  const pantry = St.pantry || []
  const [opt, setOpt] = useState(() => r.ing.filter(i => i.opt && pantry.includes(i.id)).map(i => i.id))
  const [sv, setSv] = useState(1)
  const [meal, setMeal] = useState(meal0 && r.meals.includes(meal0) ? meal0 : r.meals[0])
  const n = recipeNutrition(r, pantry, opt)
  const match = recipeMatch(r, pantry)
  const log = () => {
    const e = recipeEntry(r, { servings: sv, meal, pantry, withOptional: opt })
    burst(lastTap(), { count: 12, spread: 60, colors: ['#FF6482', '#FF375F', '#FFD60A', '#FF9F0A'] })
    update(s => { addEntry(s, todayISO(), e) })
    close()
    toast(t('Added {0} · {1} kcal', t(r.name), n0(e.kcal * e.q)))
  }
  const shop = () => {
    let k = 0
    update(s => { k = addToShopping(s, match.missing) })
    toast(k ? t('{0} added to the shopping list', k) : t('Already on the shopping list'))
  }
  return <div className="kit-recipe">
    <div className="row" style={{ gap: 12, marginBottom: 6 }}>
      <span className="kit-bub" style={{ '--tint': mealOf(r.meals[0]).color }}><Icon name={mealOf(r.meals[0]).icon} /></span>
      <div className="grow" style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: 0 }}>{t(r.name)}</h3>
        <div className="small muted"><Icon name="timer" style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> {t('{0} min', r.min)} · {r.meals.split('').map(mealName).join(' · ')}</div>
        {r.iq && <span className="iq-badge"><Icon name="palm" />{t('Iraqi kitchen')}</span>}
      </div>
    </div>
    <div className={'kit-status ' + (match.ready ? 'ok' : 'miss')}>
      <Icon name={match.ready ? 'checkCircle' : 'alert'} />
      {match.ready ? t('You have everything — ready to cook') : t('Missing: {0}', listOf(match.missing.map(ingName)))}
    </div>
    <MacroTiles n={n} per={t('kcal / serving')} />
    <div className="lbl2">{t('Ingredients (1 serving)')}</div>
    <div className="list kit-ings">
      {r.ing.map(i => {
        const have = pantry.includes(i.id)
        const on = !i.opt || opt.includes(i.id)
        return <div key={i.id} className={'item kit-ing' + (on ? '' : ' off')} role="button" tabIndex={0}
          onClick={() => (i.opt ? setOpt(o => (o.includes(i.id) ? o.filter(x => x !== i.id) : [...o, i.id])) : update(s => { togglePantry(s, i.id) }))}>
          <span className={'kit-tick' + (have ? ' on' : '')}><Icon name={have ? 'check' : 'plus'} /></span>
          <div className="grow"><div className="tt">{ingName(i.id)}{i.opt && <span className="kit-opt"> · {t('optional')}</span>}</div>
            <div className="ss">{i.g} {U('g')} · {n0(ING_BY_ID[i.id].kcal * i.g / 100)} {U('kcal')}</div></div>
        </div>
      })}
    </div>
    <div className="small muted kit-hint">{t('Tap an ingredient to mark it as in your kitchen; optional ones switch on and off.')}</div>
    <div className="lbl2">{t('How to make it')}</div>
    <ol className="kit-steps">{r.steps.map((s, i) => <li key={i} style={{ '--i': i }}>{stepText(s, ingName)}</li>)}</ol>
    {r.tip && <div className="kit-tip"><Icon name="lightbulb" /><span>{t(r.tip)}</span></div>}
    {!match.ready && <Button variant="tinted" icon="list" onClick={shop}>{t('Add missing to the shopping list')}</Button>}
    <div className="lbl2" style={{ marginTop: 14 }}>{t('Add to today’s log')}</div>
    <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
    <div className="kit-sv">
      <span>{t('Servings eaten')}</span>
      <div className="kit-svc">
        <button className="iconbtn" aria-label={t('Less')} onClick={() => setSv(v => Math.max(0.5, v - 0.5))}><Icon name="minus" /></button>
        <b>{sv}</b>
        <button className="iconbtn" aria-label={t('More')} onClick={() => setSv(v => Math.min(8, v + 0.5))}><Icon name="plus" /></button>
      </div>
      <b className="kit-svk">{n0(n.kcal * sv)} {U('kcal')}</b>
    </div>
    <Button variant="primary" icon="check" onClick={log}>{t('Add to {0}', mealName(meal))}</Button>
  </div>
}
export const recipeSheet = (id, meal) => useUI.getState().openSheet(close => <RecipeView id={id} meal={meal} close={close} />)

// ---- an ingredient picker (for the builder) -----------------------------------------------------
function IngPick({ onPick, close }) {
  const [q, setQ] = useState('')
  const list = searchIngredients(q, t)
  return <div>
    <h3>{t('Add an ingredient')}</h3>
    <label className="food-search"><Icon name="magnifier" /><input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search ingredients')} aria-label={t('Search ingredients')} /></label>
    <div className="list kit-picklist">
      {list.map(x => <div key={x.id} className="item" role="button" tabIndex={0} onClick={() => { onPick(x.id); close() }}>
        <span className="kit-bub sm" style={{ '--tint': (ING_CATS.find(c => c.key === x.cat) || ING_CATS[0]).color }}><Icon name={(ING_CATS.find(c => c.key === x.cat) || ING_CATS[0]).icon} /></span>
        <div className="grow"><div className="tt">{t(x.name)}</div><div className="ss">{unitText(x)} · {n0(x.kcal)} {U('kcal')} / 100 {U('g')}</div></div>
      </div>)}
    </div>
  </div>
}

export const ingPickSheet = onPick => useUI.getState().openSheet(close => <IngPick onPick={onPick} close={close} />)

// ---- the tabs ----------------------------------------------------------------------------------
function Recipes({ St, meal, setMeal }) {
  const [ready, setReady] = useState(false)
  const [iq, setIq] = useState(false)
  const iso = todayISO()
  const left = foodGoalOf(St, iso).kcal - dayTotals(St, iso).kcal
  const pantry = St.pantry || []
  const list = suggestRecipes(pantry, meal, { left, readyOnly: ready }).filter(x => !iq || x.r.iq)
  const nReady = suggestRecipes(pantry, meal, { readyOnly: true }).length
  const update = useStore(s => s.update)
  return <>
    <button className="card dk-promo" onClick={() => nav('/drinks')}>
      <span className="dk-promo-ic"><Icon name="cup" /></span>
      <span className="grow"><b>{t('Drinks & juices')}</b><span className="small muted">{t('{0} healthy recipes with calories — and your own', DRINK_COUNT)}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>
    <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
    {!pantry.length && <div className="card kit-empty">
      <Icon name="lightbulb" />
      <div className="grow"><b>{t('Tell the app what you have')}</b><div className="small muted">{t('Tick the ingredients in your kitchen and the recipes you can cook come first.')}</div></div>
      <Button variant="tinted" size="sm" onClick={() => { update(s => { addBasics(s) }) }}>{t('Add the basics')}</Button>
    </div>}
    <div className="kit-bar">
      <span className="small muted">{t('{0} ready to cook · {1} kcal left today', nReady, n0(Math.max(0, left)))}</span>
      <span className="kit-bar-chips">
        <button className={'chip nocap' + (iq ? ' on' : '')} aria-pressed={iq} onClick={() => setIq(v => !v)}><Icon name="palm" />{t('Iraqi')}</button>
        <button className={'chip nocap' + (ready ? ' on' : '')} aria-pressed={ready} onClick={() => setReady(v => !v)}><Icon name="checkCircle" />{t('Ready only')}</button>
      </span>
    </div>
    <div className="kit-grid">
      {list.map(({ r, match, n, fits }) => <button key={r.id} className={'card kit-card' + (match.ready ? ' ready' : '')} onClick={() => recipeSheet(r.id, meal)}>
        <span className="kit-bub" style={{ '--tint': mealOf(meal).color }}><Icon name={mealOf(meal).icon} /></span>
        <span className="kit-card-b">
          <b>{t(r.name)}{r.iq && <Icon name="palm" className="iq-mark" aria-label={t('Iraqi kitchen')} />}</b>
          <span className="small muted">{n0(n.kcal)} {U('kcal')} · {t('{0} min', r.min)}{fits === false ? ' · ' + t('over today’s goal') : ''}</span>
          <span className={'kit-badge ' + (match.ready ? 'ok' : match.missing.length <= 2 ? 'near' : 'far')}>
            {match.ready ? t('Ready to cook') : match.missing.length <= 2 ? t('Missing: {0}', listOf(match.missing.map(ingName))) : t('Missing {0} ingredients', match.missing.length)}
          </span>
        </span>
        <Icon name="chevronRight" className="chev" />
      </button>)}
      {!list.length && <div className="empty small"><div className="ico"><Icon name="fork" /></div>{t('Nothing ready yet — add more ingredients, or switch off “Ready only”.')}</div>}
    </div>
  </>
}

function Pantry({ St }) {
  const update = useStore(s => s.update)
  const [q, setQ] = useState('')
  const pantry = new Set(St.pantry || [])
  const shopping = St.shopping || []
  const list = searchIngredients(q, t)
  return <>
    <div className="kit-bar">
      <span className="small muted">{t('{0} ingredients in your kitchen', pantry.size)}</span>
      <span className="row" style={{ gap: 6 }}>
        <button className="chip nocap" onClick={() => { let k = 0; update(s => { k = addBasics(s) }); toast(t('{0} added', k)) }}><Icon name="sparkles" />{t('Add the basics')}</button>
        {pantry.size > 0 && <button className="chip nocap" onClick={() => update(s => { clearPantry(s) })}><Icon name="trash" />{t('Clear')}</button>}
      </span>
    </div>
    <label className="food-search"><Icon name="magnifier" /><input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search ingredients')} aria-label={t('Search ingredients')} /></label>
    {ING_CATS.map(c => {
      const items = list.filter(x => x.cat === c.key)
      if (!items.length) return null
      return <div key={c.key} className="card kit-cat">
        <div className="kit-cat-h"><span className="lrow-i" style={{ '--tint': c.color }}><Icon name={c.icon} /></span><b>{t(c.name)}</b>
          <span className="small muted">{items.filter(x => pantry.has(x.id)).length} / {items.length}</span></div>
        <div className="kit-chips">
          {items.map(x => <button key={x.id} className={'kit-chip' + (pantry.has(x.id) ? ' on' : '')} aria-pressed={pantry.has(x.id)} onClick={() => update(s => { togglePantry(s, x.id) })}>
            {pantry.has(x.id) && <Icon name="check" />}{t(x.name)}
          </button>)}
        </div>
      </div>
    })}
    <div className="card kit-shop">
      <div className="kit-cat-h"><span className="lrow-i" style={{ '--tint': 'var(--indigo)' }}><Icon name="list" /></span><b>{t('Shopping list')}</b>
        {shopping.some(x => x.done) && <button className="chip nocap" onClick={() => update(s => { clearShoppingDone(s) })}>{t('Clear bought')}</button>}</div>
      {shopping.length ? <div className="list">
        {shopping.map(x => <div key={x.id} className={'item kit-shop-i' + (x.done ? ' done' : '')}>
          <button className={'kit-tick' + (x.done ? ' on' : '')} aria-label={t('Bought')} onClick={() => update(s => { toggleShopping(s, x.id) })}><Icon name={x.done ? 'check' : 'plus'} /></button>
          <div className="grow"><div className="tt">{ingName(x.id)}</div></div>
          <button className="iconbtn sm" aria-label={t('Remove')} onClick={() => update(s => { removeShopping(s, x.id) })}><Icon name="xmark" /></button>
        </div>)}
      </div> : <div className="small muted">{t('Missing ingredients from a recipe land here. Tick one when you buy it and it goes into your kitchen.')}</div>}
    </div>
  </>
}

function Builder({ St, meal, setMeal }) {
  const update = useStore(s => s.update)
  const [name, setName] = useState('')
  const [items, setItems] = useState([])
  const [sv, setSv] = useState(1)
  const [err, setErr] = useState('')
  const tot = itemsTotals(items)
  const per = { kcal: tot.kcal / sv, p: tot.p / sv, c: tot.c / sv, f: tot.f / sv }
  const add = id => setItems(list => (list.some(i => i.id === id) ? list : [...list, { id, g: ING_BY_ID[id].unit === 'g' ? 100 : ING_BY_ID[id].g }]))
  const setG = (id, g) => setItems(list => list.map(i => (i.id === id ? { ...i, g: Math.max(0, Math.min(2000, Math.round(g))) } : i)))
  const pick = () => ingPickSheet(add)
  const saved = (St.customFoods || []).filter(x => Array.isArray(x.items))
  const pantry = INGREDIENTS.filter(x => (St.pantry || []).includes(x.id) && !items.some(i => i.id === x.id))
  const doLog = () => {
    if (!items.length) { setErr(t('Add at least one ingredient.')); return }
    const e = makeEntry({ n: name.trim() || t('My meal'), kcal: per.kcal, p: per.p, c: per.c, f: per.f }, { q: 1, m: meal })
    update(s => { addEntry(s, todayISO(), e) })
    toast(t('Added {0} · {1} kcal', e.n, n0(e.kcal)))
    setErr('')
  }
  const doSave = () => {
    try {
      let food = null
      update(s => { food = saveBuiltMeal(s, { n: name, items, servings: sv, meal }) })
      toast(t('Saved “{0}” to My foods', food.n)); setErr('')
    } catch (e) { setErr(t(e.key || e.message)) }
  }
  const load = f => { setName(f.n); setItems(f.items.map(i => ({ ...i }))); setSv(f.servings || 1); if (f.meal) setMeal(f.meal) }
  return <>
    <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
    <div className="card kit-build">
      <input className="input kit-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={t('Meal name — e.g. My breakfast')} aria-label={t('Meal name')} />
      <MacroTiles n={per} per={sv > 1 ? t('kcal / serving') : U('kcal')} />
      {items.length > 0 && <div className="list kit-items">
        {items.map(i => {
          const x = ING_BY_ID[i.id], step = x.unit === 'g' ? 25 : x.g
          return <div key={i.id} className="item kit-item">
            <div className="grow"><div className="tt">{t(x.name)}</div><div className="ss">{n0(x.kcal * i.g / 100)} {U('kcal')}</div></div>
            <div className="kit-svc">
              <button className="iconbtn sm" aria-label={t('Less')} onClick={() => setG(i.id, i.g - step)}><Icon name="minus" /></button>
              <input className="kit-g" inputMode="numeric" value={i.g} onChange={e => setG(i.id, +e.target.value.replace(/\D/g, '') || 0)} aria-label={t(x.name)} />
              <span className="small muted">{U('g')}</span>
              <button className="iconbtn sm" aria-label={t('More')} onClick={() => setG(i.id, i.g + step)}><Icon name="plus" /></button>
            </div>
            <button className="iconbtn sm" aria-label={t('Remove')} onClick={() => setItems(l => l.filter(y => y.id !== i.id))}><Icon name="xmark" /></button>
          </div>
        })}
      </div>}
      <Button variant="tinted" icon="plus" onClick={pick}>{t('Add an ingredient')}</Button>
      {pantry.length > 0 && <>
        <div className="lbl2" style={{ marginTop: 10 }}>{t('From your kitchen')}</div>
        <div className="kit-chips">{pantry.slice(0, 16).map(x => <button key={x.id} className="kit-chip" onClick={() => add(x.id)}><Icon name="plus" />{t(x.name)}</button>)}</div>
      </>}
      <div className="kit-sv">
        <span>{t('Makes servings')}</span>
        <div className="kit-svc">
          <button className="iconbtn" aria-label={t('Less')} onClick={() => setSv(v => Math.max(1, v - 1))}><Icon name="minus" /></button>
          <b>{sv}</b>
          <button className="iconbtn" aria-label={t('More')} onClick={() => setSv(v => Math.min(12, v + 1))}><Icon name="plus" /></button>
        </div>
        <span className="small muted">{t('Total {0} kcal', n0(tot.kcal))}</span>
      </div>
      {err && <div className="calc-err small">{err}</div>}
      <div className="food-add-more">
        <Button variant="primary" icon="check" onClick={doLog}>{t('Add to {0}', mealName(meal))}</Button>
        <Button variant="tinted" icon="starFill" onClick={doSave}>{t('Save as my meal')}</Button>
      </div>
    </div>
    {saved.length > 0 && <div className="card">
      <div className="lbl2">{t('My saved meals')}</div>
      <div className="list">{saved.map(f => <div key={f.id} className="item" role="button" tabIndex={0} onClick={() => load(f)}>
        <span className="kit-bub sm" style={{ '--tint': mealOf(f.meal || 's').color }}><Icon name={mealOf(f.meal || 's').icon} /></span>
        <div className="grow"><div className="tt">{f.n}</div><div className="ss">{t('{0} kcal / serving', n0(f.kcal))} · {t('{0} ingredients', f.items.length)}</div></div>
        <Icon name="pencil" />
      </div>)}</div>
    </div>}
  </>
}

export default function Kitchen() {
  const St = useStore(s => s.S)
  const loc = useLocation()
  const q = new URLSearchParams(loc.search || '')
  const [tab, setTab] = useState(() => (['pantry', 'build'].includes(q.get('tab')) ? q.get('tab') : 'cook'))
  const [meal, setMeal] = useState(() => (['b', 'l', 'd', 's'].includes(q.get('m')) ? q.get('m') : mealAt()))
  const nPantry = (St.pantry || []).length
  const tabs = useMemo(() => [
    { value: 'cook', label: t('Recipes') },
    { value: 'pantry', label: t('My kitchen') },
    { value: 'build', label: t('Build a meal') },
  ], [])
  return <div className="kitchen">
    <div className="hdr">
      <BackButton fallback="/food" />
      <div><h1>{t('My kitchen')}</h1><div className="sub">{t('Cook from what you have — calories worked out for you')}</div></div>
    </div>
    <div className="card kit-hero">
      <span className="kit-hero-i"><Icon name="fork" /></span>
      <div className="grow"><b>{t('What can I cook?')}</b>
        <div className="small muted">{nPantry ? t('{0} ingredients at home · {1} recipes ready', nPantry, suggestRecipes(St.pantry, null, { readyOnly: true }).length) : t('Pick what you have at home to get recipes you can make now.')}</div></div>
    </div>
    <Segmented className="kit-tabs" options={tabs} value={tab} onChange={setTab} />
    {tab === 'cook' ? <Recipes St={St} meal={meal} setMeal={setMeal} />
      : tab === 'pantry' ? <Pantry St={St} />
        : <Builder St={St} meal={meal} setMeal={setMeal} />}
    <div className="small muted food-foot">{t('Calories come from typical values per 100 g of each ingredient — brands and recipes vary.')}</div>
  </div>
}

