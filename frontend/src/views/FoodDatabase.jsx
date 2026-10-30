// 13.0 — /foods: the food database. Every food of the app — Iraqi dishes, Indomie in 41 ways,
// date cakes in three sizes, canned food, corner-shop snacks and the rest — with its calories,
// protein, carbs and fat, and the sodium and sugars where the label has them. Search in Arabic
// or English, shelves (categories) plus an "Iraqi" shelf, sort by calories or protein; the list
// draws in pages as you scroll (components/LazyList.jsx).
// 13.1 — "Shops & markets": everything sold packaged in Iraqi shops (cakes, canned mahshi, Indomie
// and other noodles, halqoum, alij, chocolate, biscuits, chips, dairy cups, bread, frozen food, ice
// cream, juices and jars), browsed by aisle.
//   foodCardSheet(food)   the food: per serving and per 100 g, sizes, salt and sugar, log it
//   indomieSheet(cfg)     the Indomie builder: pack, how it is made, the sachets, what goes in
// Data: lib/foodDb.js + lib/foods/ (the Indomie maths: lib/foods/indomie.js).
import { memo, useDeferredValue, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { FOODS, FOOD_CATS, IRAQI_COUNT, MARKET_COUNT, MARKET_AISLES } from '../lib/foodDb.js'
import { MEALS, mealAt, normalize, makeEntry, addEntry, toggleFav, servingText, foodName, hasWord } from '../lib/food.js'
import {
  PACKS, PACK_BY_ID, PREPS, ADDONS, ADDON_KCAL, INDOMIE_FOODS, normIndomie, indomieNutrition, indomieLabel, indomieKey,
} from '../lib/foods/indomie.js'
import { burst, lastTap } from '../lib/motion.js'
import { useIncremental, LazyMore } from '../components/LazyList.jsx'
import { FoodBubble } from '../components/food/FoodSheets.jsx'
import Icon from '../components/Icon.jsx'
import { BackButton, Button, Segmented, SearchField, Switch } from '../components/ui.jsx'

const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const S = () => useStore.getState().S
const update = fn => useStore.getState().update(fn)
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
const catOf = key => FOOD_CATS.find(c => c.key === key)
const AISLE_AT = Object.fromEntries(MARKET_AISLES.map((a, i) => [a.key, i]))
const mealName = key => t((MEALS.find(m => m.key === key) || MEALS[3]).name)
/** WHO: under 2,000 mg of sodium a day; a serving with 800 mg or more is a salty one. */
export const SODIUM_DAY = 2000
export const SALTY_MG = 800
/** Free sugars: about 25 g a day is the healthy aim. */
export const SUGAR_DAY = 25
const PREP_LABEL = { raw: 'Uncooked', boiled: 'Boiled', soup: 'Soup', fried: 'Fried', creamy: 'With cream' }
const SORTS = [
  { value: 'usual', label: 'Usual' },
  { value: 'kcal', label: 'Fewest kcal' },
  { value: 'protein', label: 'Most protein' },
]

/** Per 100 g (or ml): the label's numbers, or worked out from the serving. */
export function per100Of(f) {
  if (f.per100) return f.per100
  if (!(f.g > 0)) return null
  const k = 100 / f.g
  return { kcal: Math.round(f.kcal * k), p: f.p * k, c: f.c * k, f: f.f * k, sug: f.sug != null ? f.sug * k : null, na: f.na != null ? f.na * k : null }
}

/** Foods matching the search (translated name, English name or id), on a shelf (an aisle of the market), sorted. */
export function findFoods({ q = '', cat = null, sort = 'usual', aisle = null } = {}) {
  let list = cat === 'iraqi' ? FOODS.filter(f => f.iraqi) : cat === 'market' ? FOODS.filter(f => f.mk && (!aisle || f.mk === aisle))
    : cat ? FOODS.filter(f => f.cat === cat) : FOODS
  const nq = normalize(q)
  if (nq) {
    const words = nq.split(' ')
    const hits = []
    for (const f of list) {
      const local = normalize(t(f.name)), en = normalize(f.name)
      const hay = local + ' ' + en + ' ' + f.id
      if (!words.every(w => hasWord(hay, w))) continue
      hits.push([local.startsWith(nq) || en.startsWith(nq) ? 0 : 1, f])
    }
    list = hits.sort((a, b) => a[0] - b[0]).map(h => h[1])
  }
  // the market shelf by aisle, as a shop shows it — cakes, cans, noodles, sweets… (a stable sort)
  if (cat === 'market' && !aisle && !nq && sort === 'usual') list = [...list].sort((a, b) => AISLE_AT[a.mk] - AISLE_AT[b.mk])
  if (sort === 'kcal') list = [...list].sort((a, b) => a.kcal - b.kcal)
  else if (sort === 'protein') list = [...list].sort((a, b) => b.p - a.p)
  return list
}

/** The little tags under a food's name: how it is made, Iraqi, salty. */
function Tags({ f }) {
  return <>
    {f.prep && <span className="fdb-tag">{t(PREP_LABEL[f.prep])}</span>}
    {f.iraqi && <span className="fdb-tag iq">{t('Iraqi')}</span>}
    {f.na >= SALTY_MG && <span className="fdb-tag salt">{t('Salty')}</span>}
  </>
}

/** A row opens its card — an Indomie opens the builder. (One function for every row, so memo holds.) */
const openFood = f => (f.indomie ? indomieSheet({ cfg: f.indomie }) : foodCardSheet(f))

const FoodRow = memo(function FoodRow({ f, fav, onOpen }) {
  return <button type="button" className="fdb-row" onClick={() => onOpen(f)}>
    <FoodBubble food={f} size={40} />
    <span className="grow fdb-row-t">
      <b className="tt">{t(f.name)}{fav && <Icon name="starFill" className="fdb-fav" />}</b>
      <span className="ss">{servingText(f, U)}</span>
      <span className="fdb-macros" aria-label={t('Protein {0} g · carbs {1} g · fat {2} g', n1(f.p), n1(f.c), n1(f.f))}>
        <i style={{ '--c': 'var(--red)' }}>{n1(f.p)}</i><i style={{ '--c': 'var(--yellow)' }}>{n1(f.c)}</i><i style={{ '--c': 'var(--blue)' }}>{n1(f.f)}</i>
        <Tags f={f} />
      </span>
    </span>
    <b className="fdb-kcal">{n0(f.kcal)}<small>{U('kcal')}</small></b>
  </button>
})

export default function FoodDatabase() {
  const St = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [cat, setCat0] = useState(null)
  const [aisle, setAisle] = useState(null)
  const setCat = k => { setCat0(k); setAisle(null) }
  const [sort, setSort] = useState('usual')
  const dq = useDeferredValue(q)
  const list = useMemo(() => findFoods({ q: dq, cat: dq.trim() ? null : cat, sort, aisle }), [dq, cat, sort, aisle])
  const inc = useIncremental(list.length, 40, dq + '|' + cat + '|' + aisle + '|' + sort)
  const fav = useMemo(() => new Set(St.foodFav || []), [St.foodFav])
  const shelves = useMemo(() => [
    { key: null, name: 'All', icon: 'list', color: 'var(--acc)', n: FOODS.length },
    { key: 'market', name: 'Shops & markets', icon: 'basket', color: 'var(--teal)', n: MARKET_COUNT },
    { key: 'iraqi', name: 'Iraqi', icon: 'palm', color: 'var(--green)', n: IRAQI_COUNT },
    ...FOOD_CATS.map(c => ({ ...c, n: FOODS.filter(f => f.cat === c.key).length })),
  ], [])
  return <div className="narrow fdb-page">
    <div className="hdr">
      <BackButton fallback="/food" />
      <div style={{ flex: 1, marginInlineStart: 10 }}>
        <h1>{t('Food database')}</h1>
        <div className="sub">{t('{0} foods — calories for the way each one is made', n0(FOODS.length))}</div>
      </div>
    </div>

    {!q && !cat && <div className="fdb-hero">
      <button type="button" className="card fdb-indo" onClick={() => indomieSheet({})}>
        <span className="sd-top-bg" aria-hidden="true" />
        <span className="fdb-indo-ic" aria-hidden="true"><Icon name="noodles" /></span>
        <span className="grow">
          <b>{t('Build your Indomie')}</b>
          <span className="small">{t('Boiled, fried, as a soup or with cream — add egg, cheese or tuna and see the calories change')}</span>
          <span className="fdb-indo-n">{t('{0} ready-made ways', n0(INDOMIE_FOODS.length))}</span>
        </span>
        <Icon name="chevronRight" className="chev" />
      </button>
      <button type="button" className="card fdb-mkt" onClick={() => setCat('market')}>
        <span className="sd-top-bg" aria-hidden="true" />
        <span className="fdb-mkt-ic" aria-hidden="true"><Icon name="basket" /></span>
        <span className="grow">
          <b>{t('Shops & markets')}</b>
          <span className="small">{t('Everything packaged from Iraqi shops — cakes, canned mahshi, Indomie, halqoum, alij and much more')}</span>
          <span className="fdb-mkt-aisles" aria-hidden="true">{MARKET_AISLES.slice(0, 8).map(a => <i key={a.key} style={{ '--cc': a.color }}><Icon name={a.icon} /></i>)}</span>
          <span className="fdb-indo-n">{t('{0} foods in {1} aisles', n0(MARKET_COUNT), n0(MARKET_AISLES.length))}</span>
        </span>
        <Icon name="chevronRight" className="chev" />
      </button>
      <div className="fdb-shelves">
        {shelves.slice(1).filter(s => ['iraqi', 'noodles', 'cakes', 'canned', 'snacks'].includes(s.key)).map(s => (
          <button key={s.key} type="button" className="fdb-shelf" style={{ '--cc': s.color }} onClick={() => setCat(s.key)}>
            <span className="fdb-shelf-ic"><Icon name={s.icon} /></span>
            <b>{t(s.name)}</b>
            <small>{t('{0} foods', n0(s.n))}</small>
          </button>))}
      </div>
    </div>}

    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} type="search" enterKeyHint="search"
      placeholder={t('Search — Indomie, halqoum, mahshi, cake, tuna, dolma…')} aria-label={t('Search foods')} />
    {!q.trim() && <div className="dk-chips scroll" role="tablist" aria-label={t('Shelves')}>
      {shelves.map(s => <button key={String(s.key)} role="tab" aria-selected={cat === s.key} className={'chip nocap dk-chip' + (cat === s.key ? ' on' : '')}
        style={s.color ? { '--cc': s.color } : undefined} onClick={() => setCat(s.key)}>
        <Icon name={s.icon} />{t(s.name)}<span className="fdb-chip-n">{n0(s.n)}</span>
      </button>)}
    </div>}
    {cat === 'market' && !q.trim() && <div className="dk-chips scroll fdb-aisles" role="tablist" aria-label={t('Aisles')}>
      <button role="tab" aria-selected={!aisle} className={'chip nocap dk-chip' + (!aisle ? ' on' : '')} style={{ '--cc': 'var(--teal)' }} onClick={() => setAisle(null)}>
        {t('All aisles')}<span className="fdb-chip-n">{n0(MARKET_COUNT)}</span>
      </button>
      {MARKET_AISLES.map(a => <button key={a.key} role="tab" aria-selected={aisle === a.key} className={'chip nocap dk-chip' + (aisle === a.key ? ' on' : '')}
        style={{ '--cc': a.color }} onClick={() => setAisle(a.key)}>
        <Icon name={a.icon} />{t(a.name)}<span className="fdb-chip-n">{n0(a.n)}</span>
      </button>)}
    </div>}
    <div className="fdb-bar">
      <span className="small muted" aria-live="polite">{t('{0} foods', n0(list.length))}</span>
      <Segmented options={SORTS.map(s => ({ value: s.value, label: t(s.label) }))} value={sort} onChange={setSort} />
    </div>

    <div className="fdb-list">
      {list.slice(0, inc.n).map(f => <FoodRow key={f.id} f={f} fav={fav.has(f.id)} onOpen={openFood} />)}
    </div>
    <LazyMore inc={inc} left={n0(Math.min(40, list.length - inc.n))} />
    {!list.length && <div className="empty small"><div className="ico"><Icon name="magnifier" /></div>{t('Nothing found for “{0}”.', q.trim())}</div>}
    <p className="small muted dk-foot">{t('Values per serving as eaten, from food labels and USDA averages; homemade food varies. Sodium: under 2,000 mg a day is the healthy limit.')}</p>
  </div>
}

// ---- the food card --------------------------------------------------------------------------
function Nutrients({ v, q = 1 }) {
  const kcal = v.kcal * q
  const share = g => (kcal > 0 ? Math.round(g / kcal * 100) : 0)
  return <div className="fdb-nut">
    <div className="fdb-nut-k"><b>{n0(kcal)}</b><span>{U('kcal')}</span></div>
    <div className="fdb-nut-m">
      {[['Protein', v.p * q, 'var(--red)', 4], ['Carbs', v.c * q, 'var(--yellow)', 4], ['Fat', v.f * q, 'var(--blue)', 9]].map(([k, g, c, e]) => (
        <div key={k} style={{ '--c': c }}>
          <span>{t(k)}</span><b>{n1(g)} {U('g')}</b>
          <i className="fdb-nut-bar"><em style={{ width: Math.min(100, share(g * e)) + '%' }} /></i>
          <small>{t('{0}% of the calories', n0(share(g * e)))}</small>
        </div>))}
    </div>
  </div>
}

function SaltSugar({ na, sug, q = 1 }) {
  if (na == null && sug == null) return null
  const sodium = (na || 0) * q, sugar = (sug || 0) * q
  return <div className="fdb-ss">
    {na != null && <div className={'fdb-ss-i' + (sodium >= SALTY_MG ? ' warn' : '')}>
      <Icon name="salt" /><span className="grow"><b>{t('Sodium')}</b><small>{t('{0}% of the daily limit', n0(sodium / SODIUM_DAY * 100))}</small></span>
      <b>{n0(sodium)} {U('mg')}</b>
    </div>}
    {sug != null && <div className={'fdb-ss-i' + (sugar >= SUGAR_DAY ? ' warn' : '')}>
      <Icon name="candy" /><span className="grow"><b>{t('Sugars')}</b><small>{t('A healthy day has under {0} g of added sugar', n0(SUGAR_DAY))}</small></span>
      <b>{n1(sugar)} {U('g')}</b>
    </div>}
  </div>
}

function FoodCard({ food, iso, meal: meal0, close }) {
  const St = useStore(s => s.S)
  const sizes = food.sizes || null
  const [q, setQ] = useState(1)
  const [meal, setMeal] = useState(meal0 || mealAt())
  const c = catOf(food.cat)
  const p100 = per100Of(food)
  const fav = (St.foodFav || []).includes(food.id)
  const add = () => {
    burst(lastTap(), { count: 12, spread: 60, colors: ['#FF6482', '#FF375F', '#FFD60A', '#FF9F0A'] })
    update(s => { addEntry(s, iso || todayISO(), makeEntry(food, { q, m: meal })) })
    toast(t('Added {0} · {1} kcal', foodName(S(), { f: food.id }), n0(food.kcal * q)))
    close()
  }
  return <div className="fdb-card">
    <div className="row" style={{ gap: 12, marginBottom: 12 }}>
      <FoodBubble food={food} size={48} />
      <div className="grow">
        <h3 style={{ margin: 0 }}>{t(food.name)}</h3>
        <div className="small muted">{c ? t(c.name) : ''} · {servingText(food, U)}</div>
        <div className="fdb-tags"><Tags f={food} /></div>
      </div>
      <button type="button" className={'iconbtn food-star' + (fav ? ' on' : '')} aria-pressed={fav} aria-label={fav ? t('Remove from favourites') : t('Add to favourites')}
        onClick={() => update(s => { toggleFav(s, food.id) })}><Icon name={fav ? 'starFill' : 'star'} /></button>
    </div>
    {sizes ? <div className="chips fdb-sizes" role="radiogroup" aria-label={t('Size')}>
      {sizes.map(z => <button key={z.key} type="button" role="radio" aria-checked={q === z.q} className={'chip nocap' + (q === z.q ? ' on' : '')} onClick={() => setQ(z.q)}>
        {t(z.name)}<small>{z.g ? ' · ' + n0(z.g) + ' ' + U('g') : ' · ' + n0(food.g * z.q) + ' ' + U(food.ml ? 'ml' : 'g')}</small>
      </button>)}
    </div> : <div className="chips food-qpick">
      {[0.5, 1, 1.5, 2, 3].map(v => <button key={v} type="button" className={'chip nocap' + (q === v ? ' on' : '')} onClick={() => setQ(v)}>{'× ' + n1(v)}</button>)}
    </div>}
    <Nutrients v={food} q={q} />
    <SaltSugar na={food.na} sug={food.sug} q={q} />
    {p100 && <div className="fdb-100">
      <div className="lbl2">{t(food.ml ? 'Per 100 ml' : 'Per 100 g')}</div>
      <div className="fdb-100-g">
        <span><b>{n0(p100.kcal)}</b>{U('kcal')}</span>
        <span><b>{n1(p100.p)}</b>{t('Protein')}</span>
        <span><b>{n1(p100.c)}</b>{t('Carbs')}</span>
        <span><b>{n1(p100.f)}</b>{t('Fat')}</span>
        {p100.na != null && <span><b>{n0(p100.na)}<small> {U('mg')}</small></b>{t('Sodium')}</span>}
      </div>
    </div>}
    <div className="lbl2" style={{ margin: '14px 0 6px' }}>{t('Meal')}</div>
    <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
    <div style={{ height: 14 }} />
    <Button variant="primary" icon="plus" onClick={add}>{t('Add to {0}', mealName(meal))}</Button>
  </div>
}
export const foodCardSheet = (food, { iso, meal } = {}) => ui().openSheet(close => <FoodCard food={food} iso={iso} meal={meal} close={close} />)

// ---- the Indomie builder --------------------------------------------------------------------
const PRESET_BY_KEY = Object.fromEntries(INDOMIE_FOODS.map(f => [indomieKey(f.indomie), f]))

function Stepper({ value, max, onChange, label }) {
  return <span className="fdb-step" role="group" aria-label={label}>
    <button type="button" className="iconbtn sm" aria-label={t('Less')} disabled={value <= 0} onClick={() => onChange(value - 1)}><Icon name="minus" /></button>
    <b aria-live="polite">{n0(value)}</b>
    <button type="button" className="iconbtn sm" aria-label={t('More')} disabled={value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" /></button>
  </span>
}

function IndomieBuilder({ cfg: cfg0, iso, meal: meal0, close }) {
  const [cfg, setCfg] = useState(() => normIndomie(cfg0 || {}))
  const [meal, setMeal] = useState(meal0 || mealAt())
  const set = patch => setCfg(c => normIndomie({ ...c, ...patch, add: { ...c.add, ...(patch.add || {}) } }))
  const pack = PACK_BY_ID[cfg.pack]
  const v = useMemo(() => indomieNutrition(cfg), [cfg])
  const preset = PRESET_BY_KEY[indomieKey(cfg)] || null
  const name = indomieLabel(cfg, t)
  const add = () => {
    burst(lastTap(), { count: 14, spread: 70, colors: ['#FFD60A', '#FF9F0A', '#FF453A', '#FFFFFF'] })
    // a ready-made variant is logged as that food (its name follows the language); any other mix keeps its recipe
    const entry = preset ? makeEntry(preset, { m: meal }) : { ...makeEntry({ n: name, kcal: v.kcal, p: v.p, c: v.c, f: v.f }, { m: meal }), ind: cfg }
    update(s => { addEntry(s, iso || todayISO(), entry) })
    toast(t('Added {0} · {1} kcal', name, n0(v.kcal)))
    close()
  }
  const preps = pack.cup ? PREPS.filter(p => p.id === 'raw' || p.id === 'soup') : PREPS
  return <div className="fdb-indo-b">
    <h3 style={{ marginTop: 0 }}>{t('Build your Indomie')}</h3>
    {/* the total stays in sight while you scroll through what goes in */}
    <div className="fdb-live" aria-hidden="true">
      <span className="fdb-live-ic"><Icon name="noodles" /></span>
      <b className="fdb-live-k">{n0(v.kcal)}<small> {U('kcal')}</small></b>
      <span className="fdb-live-m">
        <i style={{ '--c': 'var(--red)' }}>{n1(v.p)}</i><i style={{ '--c': 'var(--yellow)' }}>{n1(v.c)}</i><i style={{ '--c': 'var(--blue)' }}>{n1(v.f)}</i>
      </span>
      {preset && <span className="fdb-tag">{t('Ready-made')}</span>}
    </div>
    <div className="lbl2">{t('Pack')}</div>
    <div className="chips scroll fdb-packs">
      {PACKS.map(p => <button key={p.id} type="button" className={'chip nocap' + (cfg.pack === p.id ? ' on' : '')} aria-pressed={cfg.pack === p.id} onClick={() => set({ pack: p.id })}>
        {t(p.name)}<small>{' · ' + n0(p.g) + ' ' + U('g')}</small>
      </button>)}
    </div>
    <div className="lbl2">{t('How it is made')}</div>
    <div className="fdb-preps">
      {preps.map(p => <button key={p.id} type="button" className={'fdb-prep' + (cfg.prep === p.id ? ' on' : '')} aria-pressed={cfg.prep === p.id} onClick={() => set({ prep: p.id })}>
        <Icon name={p.icon} /><span>{t(p.label)}</span>
      </button>)}
    </div>
    <div className="lbl2">{t('Seasoning sachets')}</div>
    <Segmented options={[{ value: 0, label: t('None') }, { value: 0.5, label: t('Half') }, { value: 1, label: t('All of it') }]} value={cfg.season} onChange={x => set({ season: x })} />
    {pack.sauce && <label className="fdb-sauce">
      <span className="grow"><b>{t('The sauces')}</b><small>{t('Sweet soy sauce, chili sauce and fried onion')}</small></span>
      <Switch checked={cfg.sauce} onChange={x => set({ sauce: x })} />
    </label>}
    <div className="lbl2">{t('Add-ons')}</div>
    <div className="fdb-adds">
      {ADDONS.map(a => <div key={a.id} className={'fdb-add' + (cfg.add[a.id] ? ' on' : '')}>
        <span className="fdb-add-ic"><Icon name={a.icon} /></span>
        <span className="grow"><b>{t(a.label)}</b><small>{t('+{0} kcal each', n0(ADDON_KCAL[a.id]))}</small></span>
        <Stepper value={cfg.add[a.id] || 0} max={a.max} label={t(a.label)} onChange={n => set({ add: { [a.id]: n } })} />
      </div>)}
    </div>
    <div className="card fdb-total" aria-live="polite">
      <div className="fdb-total-n" dir="auto">{name}</div>
      <Nutrients v={v} />
      <SaltSugar na={v.na} sug={v.sug} />
    </div>
    <div className="lbl2" style={{ margin: '14px 0 6px' }}>{t('Meal')}</div>
    <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
    <div style={{ height: 14 }} />
    <Button variant="primary" icon="plus" onClick={add}>{t('Add to {0}', mealName(meal))}</Button>
  </div>
}
export const indomieSheet = ({ cfg, iso, meal } = {}) => ui().openSheet(close => <IndomieBuilder cfg={cfg} iso={iso} meal={meal} close={close} />)
