// 14.0 — /kitchen: the Kitchen (المطبخ). Everything about food, cooking and drinks in one place:
//   Food    my cooking (my own dishes with my photo), cooking (recipes step by step, the Iraqi
//           kitchen, home cooking, breakfast, gym meals), ready foods (from the shops, fast food,
//           Indomie, canned, cakes, chocolate & chips, sweets) and fresh food & basics
//   Drinks  hot, juices & coolers, milk drinks & shakes, soft drinks & iced tea, energy & sports,
//           Iraqi drinks — and the healthy drinks library
//   Tools   what can I cook, the pantry & shopping list, the meal builder, compare two foods, the
//           cooking timer, favourites, recently, photo credits
// Every food and drink has a real photo (lib/photos) that drifts slowly. A section opens at
// /kitchen/s/:key (KitchenSection.jsx), a new dish of your own at /kitchen/dish (DishEditor.jsx).
//
// 6.0 — the tools (?m=b|l|d|s or ?tab=cook|pantry|build open them, as the food log's links do):
//   What can I cook?  recipes for a meal from what you have at home, ready-to-cook first, with
//                     calories worked out from the ingredients and what fits today
//   My kitchen        tick the ingredients you have (or add the basics) + the shopping list
//   Build a meal      put a meal together from ingredients by weight, see its calories live,
//                     log it and/or save it as your own food
import { useEffect, useMemo, useState } from 'react'
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
import { BackButton, Button, Segmented, SearchField, Switch } from '../components/ui.jsx'
import { n0, mealName } from '../components/food/FoodSheets.jsx'
import { stepText, stepMinutes } from '../lib/recipeText.js'
import { DRINK_COUNT } from '../lib/drinks.js'
import { nav } from '../lib/nav.js'
import {
  kitchenItems, SECTIONS, FOOD_PARTS, sectionCounts, findItems, heroDishes, favItems, recentItems, isFav, FEATURED, featuredCount,
} from '../lib/kitchenHub.js'
import { photoKey, PHOTO_COUNT } from '../lib/photos/index.js'
import { Photo } from '../components/FoodPhoto.jsx'
import { PhotoHero } from '../components/kitchen/PhotoHero.jsx'
import { ItemRow, ItemChip, itemName } from '../components/kitchen/ItemCard.jsx'
import { openItem } from '../components/kitchen/openItem.js'
import { useIncremental, LazyMore } from '../components/LazyList.jsx'
import { myDishes, useDishPhoto } from '../lib/dishPhotos.js'
import { ingPickSheet } from '../components/kitchen/IngPick.jsx'

const toast = m => useUI.getState().toast(m)
const mealOf = k => MEALS.find(m => m.key === k) || MEALS[3]
const listOf = a => { try { return new Intl.ListFormat(dateLocale(), { style: 'short', type: 'unit' }).format(a) } catch { return a.join(', ') } }
const ingName = id => t((ING_BY_ID[id] || {}).name || id)

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
  const ph = photoKey('R', r.id)
  return <div className="kit-recipe">
    <PhotoHero k={ph} alt={t(r.name)} />
    <div className="row" style={{ gap: 12, marginBottom: 6 }}>
      {!ph && <span className="kit-bub" style={{ '--tint': mealOf(r.meals[0]).color }}><Icon name={mealOf(r.meals[0]).icon} /></span>}
      <div className="grow" style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: 0 }}>{t(r.name)}</h3>
        <div className="small muted"><Icon name="timer" style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> {t('{0} min', r.min)} · {r.meals.split('').map(mealName).join(' · ')}</div>
        {r.iq && <span className="iq-badge"><Icon name="palm" />{t('Iraqi kitchen')}</span>}
        {r.fit && <span className="iq-badge fit"><Icon name="dumbbell" />{t('Gym & healthy meals')}</span>}
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
    <ol className="kit-steps">{r.steps.map((s, i) => {
      const m = stepMinutes(s)
      return <li key={i} style={{ '--i': i }}>{stepText(s, ingName)}
        {m > 0 && <button type="button" className="kit-step-timer" onClick={() => import('../components/kitchen/CookTimer.jsx').then(c => c.startCookTimer(m * 60, t(r.name)))}>
          <Icon name="timer" />{t('Start a {0} timer', t('{0} min', n0(m)))}</button>}
      </li>
    })}</ol>
    {r.tip && <div className="kit-tip"><Icon name="lightbulb" /><span>{t(r.tip)}</span></div>}
    <button type="button" className="card kh-link mb-open" style={{ '--tint': 'var(--orange)' }}
      onClick={() => import('../components/kitchen/MealBuilder.jsx').then(m => m.mealBuilderSheet({ rid: r.id, opt, meal }))}>
      <span className="kh-link-ic" aria-hidden="true"><Icon name="sliders" /></span>
      <span className="grow"><b>{t('Build it your way')}</b><span className="small muted">{t('Change the amounts, take things out or add more — the calories follow')}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>
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

// ---- an ingredient picker (14.0: components/kitchen/IngPick.jsx, with photos) -----------------------
export { ingPickSheet }

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

/** 6.0 — the kitchen tools: what can I cook, my pantry & shopping list, build a meal. */
function KitchenTools() {
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
      <BackButton fallback="/kitchen" />
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


// ---- 14.0: the Kitchen ---------------------------------------------------------------------------
const nk = v => Math.round(+v || 0).toLocaleString(dateLocale())
const HUB_TABS = [
  { value: 'food', label: 'Food', icon: 'fork' },
  { value: 'drinks', label: 'Beverages', icon: 'coffee' },
  { value: 'tools', label: 'Tools', icon: 'wrench' },
]

/** The slideshow at the top: today's dishes, each photo drifting, a new one every few seconds. */
function Hero({ items }) {
  const [i, setI] = useState(0)
  const motion = useStore(s => s.S.photoMotion !== false)
  useEffect(() => {
    if (!motion || items.length < 2) return undefined
    const id = setInterval(() => { if (!document.hidden) setI(v => (v + 1) % items.length) }, 6500)
    return () => clearInterval(id)
  }, [items.length, motion])
  const x = items[i] || items[0]
  if (!x) return null
  return <button type="button" className="kh-hero" onClick={() => openItem(x)} aria-label={itemName(x)}>
    {items.map((it, j) => <span key={it.uid} className={'kh-slide' + (j === i ? ' on' : '')} aria-hidden={j !== i}>
      <Photo k={it.ph} size="m" live alt="" />
    </span>)}
    <span className="kh-hero-shade" aria-hidden="true" />
    <span className="kh-hero-t">
      <span className="kh-hero-k"><Icon name="sparkles" />{i === 0 ? t('Dish of the day') : t('Today in the kitchen')}</span>
      <b dir="auto">{itemName(x)}</b>
      <span className="kh-hero-n">{nk(x.kcal)} {U('kcal')} · {t('Protein {0} g', nk(x.p))}{x.min != null ? ' · ' + t('{0} min', nk(x.min)) : ''}</span>
    </span>
    {items.length > 1 && <span className="kh-dots" aria-hidden="true">{items.map((it, j) => <i key={it.uid} className={j === i ? 'on' : ''} />)}</span>}
  </button>
}

function SectionCard({ s, n }) {
  return <button type="button" className="ks" style={{ '--cc': s.color }} onClick={() => nav('/kitchen/s/' + s.key)}>
    <Photo k={s.ph} size="m" live alt="" fallback={<span className="ks-none" aria-hidden="true" />} />
    <span className="ks-shade" aria-hidden="true" />
    <span className="ks-ic" aria-hidden="true"><Icon name={s.icon} /></span>
    <span className="ks-t"><b>{t(s.name)}</b><small>{t('{0} items', nk(n))}</small></span>
  </button>
}

function SectionGrid({ list }) {
  const counts = sectionCounts()
  return <div className="ks-grid">{list.map(s => <SectionCard key={s.key} s={s} n={counts[s.key]} />)}</div>
}

function Strip({ title, icon, items, more }) {
  if (!items.length) return null
  return <div className="kh-strip">
    <div className="kh-h"><Icon name={icon} /><b>{title}</b>{more && <button type="button" className="linkbtn" onClick={() => nav(more)}>{t('See all')}</button>}</div>
    <div className="kh-chips scroll">{items.map(x => <ItemChip key={x.uid} x={x} onOpen={openItem} />)}</div>
  </div>
}

/** One of your own dishes on the "My cooking" card: your photo, or its first letter. */
function MineChip({ d }) {
  const url = useDishPhoto(d.id, d.hasPhoto)
  return <button type="button" className="kch km-chip" onClick={() => import('../components/kitchen/MyDish.jsx').then(m => m.myDishSheet(d.id))}>
    {url ? <img className="kch-ph kr-own" src={url} alt="" /> : <span className="kch-ph km-letter" aria-hidden="true">{(d.name || '?').trim().charAt(0)}</span>}
    <span className="kch-t" dir="auto">{d.name}</span>
    <span className="kch-k">{nk(d.kcal)} {U('kcal')}</span>
  </button>
}

function MineCard({ St }) {
  const dishes = myDishes(St)
  const n = dishes.length + ((St.customFoods || []).length - dishes.length) + (St.myDrinks || []).length
  return <div className="card km">
    <div className="km-h">
      <span className="km-ic" aria-hidden="true"><Icon name="pencil" /></span>
      <div className="grow"><b>{t('My cooking')}</b>
        <div className="small muted">{t('Your own dishes with your own photo — the calories work themselves out from the ingredients')}</div></div>
    </div>
    {dishes.length > 0 && <div className="kh-chips scroll">{dishes.slice(0, 10).map(d => <MineChip key={d.id} d={d} />)}</div>}
    <div className="km-b">
      <Button variant="primary" icon="plus" onClick={() => nav('/kitchen/dish')}>{t('New dish')}</Button>
      <Button variant="tinted" icon="list" onClick={() => nav('/kitchen/s/mine')}>{n ? t('All my cooking ({0})', nk(n)) : t('All my cooking')}</Button>
    </div>
  </div>
}

/** 14.0 — the six big doors: street food, make your Indomie, canned food & shops, drinks, sweets, Iraqi food. */
function Featured({ onTab }) {
  const counts = useMemo(() => Object.fromEntries(FEATURED.map(f => [f.key, featuredCount(f)])), [])
  return <div className="kf-grid">
    {FEATURED.map((f, i) => <button key={f.key} type="button" className="kf" style={{ '--cc': f.color, '--i': i }}
      onClick={() => (f.tab ? onTab(f.tab) : nav(f.to))}>
      <Photo k={f.ph} size="m" live alt="" fallback={<span className="ks-none" aria-hidden="true" />} />
      <span className="kf-shade" aria-hidden="true" />
      <span className="kf-ic" aria-hidden="true"><Icon name={f.icon} /></span>
      <span className="kf-t"><b>{t(f.name)}</b><small>{f.key === 'indomie' ? t('{0} ways', nk(counts[f.key])) : t('{0}+ items', nk(Math.floor(counts[f.key] / 5) * 5))}</small></span>
    </button>)}
  </div>
}

function FoodTab({ St, onTab }) {
  const fav = useMemo(() => favItems(St).filter(x => x.kind !== 'D' && x.kind !== 'S' && !x.drink).slice(0, 14), [St])
  const recent = useMemo(() => recentItems(St, 14).filter(x => x.kind !== 'D' && x.kind !== 'S' && !x.drink), [St])
  return <>
    <Featured onTab={onTab} />
    <MineCard St={St} />
    <Strip title={t('Recently')} icon="history" items={recent} more="/kitchen/s/recent" />
    <Strip title={t('Favourites')} icon="starFill" items={fav} more="/kitchen/s/fav" />
    {FOOD_PARTS.map(p => <div key={p.key} className="kh-part">
      <div className="kh-h"><Icon name={p.icon} /><b>{t(p.name)}</b></div>
      <SectionGrid list={SECTIONS.filter(s => s.group === 'food' && s.part === p.key)} />
    </div>)}
  </>
}

function LinkCard({ icon, tint, title, sub, to, onClick }) {
  return <button type="button" className="card kh-link" style={{ '--tint': tint }} onClick={onClick || (() => nav(to))}>
    <span className="kh-link-ic" aria-hidden="true"><Icon name={icon} /></span>
    <span className="grow"><b>{title}</b>{sub && <span className="small muted">{sub}</span>}</span>
    <Icon name="chevronRight" className="chev" />
  </button>
}

function DrinksTab({ St }) {
  const fav = useMemo(() => favItems(St).filter(x => x.kind === 'D' || x.kind === 'S' || x.drink).slice(0, 14), [St])
  const recent = useMemo(() => recentItems(St, 14).filter(x => x.kind === 'D' || x.kind === 'S' || x.drink), [St])
  const mine = (St.myDrinks || []).length
  return <>
    <Strip title={t('Recently')} icon="history" items={recent} more="/kitchen/s/recent" />
    <Strip title={t('Favourites')} icon="starFill" items={fav} more="/kitchen/s/fav" />
    <div className="kh-part">
      <div className="kh-h"><Icon name="coffee" /><b>{t('Drinks')}</b></div>
      <SectionGrid list={SECTIONS.filter(s => s.group === 'drinks')} />
    </div>
    <LinkCard icon="blender" tint="var(--green)" title={t('Healthy drinks library')} sub={t('{0} healthy recipes with calories — and your own', DRINK_COUNT)} to="/drinks" />
    <LinkCard icon="pencil" tint="var(--purple)" title={t('My drinks')} sub={mine ? t('{0} drinks of your own', nk(mine)) : t('Mix your own drink — the calories are worked out for you')} to="/drinks?c=mine" />
    <LinkCard icon="bottle" tint="var(--red)" title={t('Soft drinks guide')} sub={t('Sugar, caffeine and better swaps — compare any two')} to="/sodas" />
    <LinkCard icon="drop" tint="var(--blue)" title={t('Water')} sub={t('Your water today')} to="/water" />
  </>
}

function ToolsTab({ St }) {
  const update = useStore(s => s.update)
  const nPantry = (St.pantry || []).length, nShop = (St.shopping || []).filter(x => !x.done).length
  return <>
    <LinkCard icon="lightbulb" tint="var(--yellow)" title={t('What can I cook?')} sub={t('Recipes from what you have at home')} to="/kitchen?tab=cook" />
    <LinkCard icon="basket" tint="var(--green)" title={t('My pantry & shopping list')} sub={t('{0} ingredients at home · {1} to buy', nk(nPantry), nk(nShop))} to="/kitchen?tab=pantry" />
    <LinkCard icon="calculator" tint="var(--orange)" title={t('Build a meal')} sub={t('Weigh the ingredients and see the calories live')} to="/kitchen?tab=build" />
    <LinkCard icon="compare" tint="var(--indigo)" title={t('Compare two foods')} sub={t('Side by side: calories, protein, sugar and salt')}
      onClick={() => import('../components/kitchen/CompareSheet.jsx').then(m => m.compareSheet())} />
    <LinkCard icon="timer" tint="var(--red)" title={t('Cooking timer')} sub={t('Rice, eggs, tea — it rings when it is ready')}
      onClick={() => import('../components/kitchen/CookTimer.jsx').then(m => m.cookTimerSheet())} />
    <LinkCard icon="starFill" tint="var(--yellow)" title={t('Favourites')} sub={t('{0} foods and drinks', nk(favItems(St).length))} to="/kitchen/s/fav" />
    <LinkCard icon="book" tint="var(--teal)" title={t('Food log')} sub={t('What you ate today')} to="/food" />
    <LinkCard icon="magnifier" tint="var(--blue)" title={t('Food database')} sub={t('Every food on one list — search and sort')} to="/foods" />
    <LinkCard icon="nut" tint="var(--brown, #a2845e)" title={t('Nuts & seeds guide')} sub={t('A handful a day — in grams, pieces or spoons')} to="/nuts" />
    <div className="card kh-set">
      <div className="row" style={{ gap: 12 }}>
        <span className="kh-link-ic" style={{ '--tint': 'var(--pink)' }} aria-hidden="true"><Icon name="image" /></span>
        <span className="grow"><b>{t('Moving photos')}</b><span className="small muted">{t('The food photos drift slowly. Off: they stand still (saves battery).')}</span></span>
        <Switch checked={St.photoMotion !== false} onChange={v => update(s => { s.photoMotion = !!v })} label={t('Moving photos')} />
      </div>
    </div>
    <LinkCard icon="camera" tint="var(--blue)" title={t('Photo credits')} sub={t('{0} real photos from Wikimedia Commons — who took each one', nk(PHOTO_COUNT))} to="/kitchen/s/credits" />
  </>
}

function SearchResults({ q }) {
  const St = useStore(s => s.S)
  const list = useMemo(() => findItems(kitchenItems(), { q, tr: t }), [q])
  const inc = useIncremental(list.length, 30, q)
  return <div className="kh-results">
    <div className="small muted kh-count" aria-live="polite">{t('{0} found', nk(list.length))}</div>
    <div className="kr-list">{list.slice(0, inc.n).map(x => <ItemRow key={x.uid} x={x} fav={isFav(St, x)} onOpen={openItem} />)}</div>
    <LazyMore inc={inc} left={nk(Math.min(30, list.length - inc.n))} />
    {!list.length && <div className="empty small"><div className="ico"><Icon name="magnifier" /></div>{t('Nothing found for “{0}”.', q.trim())}</div>}
  </div>
}

function KitchenHub() {
  const St = useStore(s => s.S)
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem('mj-kitchen-tab') || 'food' } catch { return 'food' } })
  const [q, setQ] = useState('')
  const pick = v => { setTab(v); try { sessionStorage.setItem('mj-kitchen-tab', v) } catch { /* private mode */ } }
  const hero = useMemo(() => heroDishes(todayISO(), 5), [])
  const total = kitchenItems().length
  return <div className="narrow kh">
    <div className="hdr">
      <BackButton fallback="/food" />
      <div className="grow" style={{ marginInlineStart: 10 }}>
        <h1>{t('Kitchen')}</h1>
        <div className="sub">{t('All the food, cooking and drinks in one place — {0} with real photos', nk(total))}</div>
      </div>
    </div>
    {!q.trim() && <Hero items={hero} />}
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} type="search" enterKeyHint="search"
      placeholder={t('Search the kitchen — dolma, tea, Indomie, kebab…')} aria-label={t('Search the kitchen')} />
    {q.trim() ? <SearchResults q={q} /> : <>
      <Segmented className="kh-tabs" options={HUB_TABS.map(x => ({ value: x.value, label: t(x.label), icon: x.icon }))} value={tab} onChange={pick} />
      {tab === 'food' ? <FoodTab St={St} onTab={pick} /> : tab === 'drinks' ? <DrinksTab St={St} /> : <ToolsTab St={St} />}
    </>}
    <p className="small muted kh-foot">{t('Photos: Wikimedia Commons, under free licences — tap the camera on a photo to see who took it. Values per usual serving; homemade food varies.')}</p>
  </div>
}

export default function Kitchen() {
  const loc = useLocation()
  const q = new URLSearchParams(loc.search || '')
  return q.has('m') || q.has('tab') ? <KitchenTools /> : <KitchenHub />
}
