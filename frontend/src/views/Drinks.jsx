// 9.0 — /drinks: drinks & juices. A library of healthy drinks (weight loss, digestion, energy,
// protein, immunity, sleep, hydration and Iraqi classics) with calories worked out from the
// ingredients, your own drinks built the same way, favourites and today's drinks.
//   drinkSheet(id)            the recipe: ingredients (scaled), steps, why it's good, log it
//   drinkBuilderSheet(m?)     make (or edit) your own drink — live calories as you add things
//   pickDrinkSheet(onPick)    choose a drink (used by the day plan)
// ?c=<category> opens on a category. The data and maths live in lib/drinks.js.
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { MEALS, mealAt, addEntry, dayEntries } from '../lib/food.js'
import {
  DRINK_CATS, DRINK_CAT_BY_KEY, DING_CATS, DING_BY_ID, WHEN, CAUTION, searchDrinks, drinkOf, drinkNutrition, drinkRows, optionalKcal,
  drinkFlags, drinkNotes, drinkEntry, noteDrink, recentDrinks, toggleDrinkFav, saveMyDrink, deleteMyDrink, myDrinkAsDrink,
  drinkOfDay, rowsTotals, unitsOf, gramsOf, searchDing,
} from '../lib/drinks.js'
import { stepText, qtyText } from '../lib/recipeText.js'
import { logWater } from '../components/water/WaterParts.jsx'
import { burst, lastTap } from '../lib/motion.js'
import DrinkGlass from '../components/DrinkGlass.jsx'
import SodaArt from '../components/SodaArt.jsx'
import NutArt from '../components/NutArt.jsx'
import { SODA_BY_ID } from '../lib/sodas.js'
import { NUT_BY_ID } from '../lib/nuts.js'
import { nav } from '../lib/nav.js'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import Icon from '../components/Icon.jsx'
import { PhotoHero } from '../components/kitchen/PhotoHero.jsx'
import { photoKey } from '../lib/photos/index.js'
import { BackButton, Button, Segmented, SearchField, Switch, TextField } from '../components/ui.jsx'
import { confirmSheet } from '../sheets.jsx'

const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
const ingName = id => t((DING_BY_ID[id] || {}).name || id)
const mealName = k => t((MEALS.find(m => m.key === k) || MEALS[3]).name)
const catName = k => (DRINK_CAT_BY_KEY[k] ? t(DRINK_CAT_BY_KEY[k].name) : k === 'mine' ? t('My drinks') : k)
// a light drink (milk, laban, lemonade) gets a deeper hero and a darker "ink" so white text reads
function shadeHex(hex, k) {
  const n = parseInt(String(hex || '#7cc35a').slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * (1 - k)))
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('')
}
const lum = hex => { const n = parseInt(String(hex || '#000000').slice(1), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 }
export function drinkVars(col) {
  const L = lum(col)
  if (L < 0.62) return { '--c': col, '--ci': col }
  const k = Math.min(0.62, 0.32 + (L - 0.62) * 0.9)
  return { '--c': col, '--ci': shadeHex(col, k), '--ha': shadeHex(col, k), '--hb': shadeHex(col, Math.min(0.8, k + 0.25)) }
}
const COLORS = ['#7cc35a', '#ffb627', '#ff5e6c', '#b0124a', '#f4d35e', '#8b5e3c', '#f3e6cf', '#5e5ce6', '#40c8e0', '#ff8c1a']

/** Log a drink: a food-log entry (exact calories) and, if wanted, the water it adds. */
export function logDrink(d, { servings = 1, meal = mealAt(), withOpt = [], water = true } = {}) {
  const st = useStore.getState()
  const iso = todayISO()
  const e = drinkEntry(d, { servings, meal, withOpt })
  st.update(s => { addEntry(s, iso, e); noteDrink(s, iso, d.id) })
  const ml = Math.round(drinkNutrition(d, withOpt).ml * e.q)
  if (water && ml >= 50) logWater(ml)
  return { kcal: Math.round(e.kcal * e.q), ml: water && ml >= 50 ? ml : 0 }
}

// ---- small pieces -----------------------------------------------------------------------------------
function Nutri({ n, big = true }) {
  return <div className={'dk-nutri' + (big ? ' big' : '')}>
    <div className="dk-kcal"><b><AnimatedNumber value={n.kcal} /></b><span>{U('kcal')}</span></div>
    <div className="dk-macros">
      <span style={{ '--c': 'var(--red)' }}><b>{n1(n.p)}</b>{t('Protein')}</span>
      <span style={{ '--c': 'var(--yellow)' }}><b>{n1(n.c)}</b>{t('Carbs')}</span>
      <span style={{ '--c': 'var(--blue)' }}><b>{n1(n.f)}</b>{t('Fat')}</span>
      <span style={{ '--c': 'var(--pink)' }}><b>{n1(n.s)}</b>{t('Sugar')}</span>
    </div>
  </div>
}

function DrinkCard({ d, fav, onFav, i }) {
  const n = drinkNutrition(d)
  return <div className="dk-card" style={{ '--c': d.col, '--i': Math.min(i, 12) }}>
    <button className="dk-card-b" onClick={() => drinkSheet(d.id)}>
      <span className="dk-card-glass"><DrinkGlass drink={d} size={46} /></span>
      <b dir="auto">{d.mine ? d.name : t(d.name)}</b>
      <span className="dk-card-k"><b>{n0(n.kcal)}</b> {U('kcal')}</span>
      <span className="dk-card-m">
        <Icon name={d.t === 'h' ? 'flame' : 'drop'} />{d.t === 'h' ? t('Hot') : t('Cold')}
        {d.cats.includes('iraqi') && <><span className="dot-sep" /><Icon name="palm" /></>}
      </span>
    </button>
    <button className={'dk-fav' + (fav ? ' on' : '')} aria-pressed={fav} aria-label={fav ? t('Remove from favourites') : t('Add to favourites')} onClick={onFav}>
      <Icon name={fav ? 'starFill' : 'star'} />
    </button>
  </div>
}

// ---- the recipe sheet ------------------------------------------------------------------------------
function DrinkView({ id, close }) {
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const d = drinkOf(St, id)
  const [opt, setOpt] = useState([])
  const [batch, setBatch] = useState(() => (d ? d.sv : 1))
  const [cups, setCups] = useState(1)
  const [meal, setMeal] = useState(() => mealAt())
  const [water, setWater] = useState(true)
  if (!d) return <div className="empty">{t('This drink no longer exists.')}</div>
  const n = drinkNutrition(d, opt)
  const scale = batch / d.sv
  const fav = (St.drinkFavs || []).includes(d.id)
  const flags = drinkFlags(d, opt)
  const notes = drinkNotes(d)
  const nameOf = d.mine ? d.name : t(d.name)
  const cat = d.cats.map(k => DRINK_CAT_BY_KEY[k]).filter(Boolean)
  const log = () => {
    const r = logDrink(d, { servings: cups, meal, withOpt: opt, water })
    burst(lastTap(), { count: 14, spread: 70, colors: [d.col, '#ffffff', '#64D2FF', '#FFD60A'] })
    close()
    toast(r.ml ? t('Added {0} · {1} kcal · +{2} ml water', nameOf, n0(r.kcal), n0(r.ml)) : t('Added {0} · {1} kcal', nameOf, n0(r.kcal)))
  }
  const remix = () => { close(); setTimeout(() => drinkBuilderSheet(null, { from: d }), 80) }
  const del = () => confirmSheet({
    title: t('Delete this drink?'), message: nameOf, confirmText: t('Delete'), danger: true,
    onConfirm: () => { update(s => { deleteMyDrink(s, d.id) }); close() },
  })
  const ph = d.mine ? null : photoKey('D', d.id)
  return <div className="dk-view" style={drinkVars(d.col)}>
    <PhotoHero k={ph} alt={nameOf} />
    <div className={'dk-hero' + (ph ? ' with-ph' : '')}>
      <div className="dk-hero-bg" aria-hidden="true" />
      {!ph && <DrinkGlass drink={d} size={110} live label={nameOf} />}
      <div className="dk-hero-t">
        <h2 dir="auto">{nameOf}</h2>
        {d.story && <p className="dk-story">{t(d.story)}</p>}
        <div className="dk-tags">
          {cat.map(c => <span key={c.key} className="dk-tag" style={{ '--tc': c.color }}><Icon name={c.icon} />{t(c.name)}</span>)}
          <span className="dk-tag"><Icon name="timer" />{t('{0} min', n0(d.min))}</span>
        </div>
      </div>
      <button className={'dk-fav big' + (fav ? ' on' : '')} aria-pressed={fav} aria-label={fav ? t('Remove from favourites') : t('Add to favourites')}
        onClick={() => update(s => { toggleDrinkFav(s, d.id) })}><Icon name={fav ? 'starFill' : 'star'} /></button>
    </div>

    <div className="dk-sec-t">{t('Per glass')}</div>
    <Nutri n={n} />
    {n.ml > 0 && <div className="dk-water"><Icon name="drop" />{t('Adds about {0} ml of water', n0(n.ml))}</div>}

    <div className="dk-sec-t row">
      <span className="grow">{t('Ingredients')}</span>
      {d.sv > 1 || batch !== 1 ? <span className="small muted">{t('Makes {0} glasses', n0(batch))}</span> : null}
      <div className="stp dk-batch">
        <button onClick={() => setBatch(b => Math.max(1, b - 1))} aria-label={t('Fewer')}><Icon name="minus" /></button>
        <span className="val">{n0(batch)}</span>
        <button onClick={() => setBatch(b => Math.min(12, b + 1))} aria-label={t('More')}><Icon name="plus" /></button>
      </div>
    </div>
    <div className="dk-ings">
      {d.ing.map((r, i) => {
        const on = !r.opt || opt.includes(r.id)
        const x = DING_BY_ID[r.id]
        const kc = Math.round(x.kcal * gramsOf(x, r.a, r.u) / 100 * r.x * scale)
        return <div key={r.id + i} className={'dk-ing' + (on ? '' : ' off')} style={{ '--i': i }}
          role={r.opt ? 'button' : undefined} tabIndex={r.opt ? 0 : undefined}
          onClick={r.opt ? () => setOpt(o => (o.includes(r.id) ? o.filter(k => k !== r.id) : [...o, r.id])) : undefined}>
          <span className={'dk-ing-dot' + (r.opt ? ' opt' : '')}>{r.opt ? <Icon name={on ? 'check' : 'plus'} /> : null}</span>
          <span className="grow"><span className="tt">{ingName(r.id)}</span>
            {r.opt && <span className="dk-opt">{on ? t('optional') : t('+{0} kcal', n0(optionalKcal(d, r.id)))}</span>}
            {r.x < 0.5 && <span className="dk-opt">{t('steeped')}</span>}
          </span>
          <span className="dk-qty">{qtyText(r.a * scale, r.u)}</span>
          <span className="dk-ing-k">{kc > 0 ? n0(kc) : '0'}</span>
        </div>
      })}
    </div>

    {d.steps.length > 0 && <>
      <div className="dk-sec-t">{t('How to make it')}</div>
      <ol className="dk-steps">{d.steps.map((s, i) => <li key={i} style={{ '--i': i }}>{stepText(s, ingName)}</li>)}</ol>
    </>}
    {d.mine && d.note && <p className="dk-note" dir="auto">{d.note}</p>}

    {notes.length > 0 && <>
      <div className="dk-sec-t">{t('Why it’s good for you')}</div>
      <div className="dk-notes">{notes.map((x, i) => <div key={i} className="dk-noteline" style={{ '--i': i }}><Icon name="sparkles" /><span>{t(x)}</span></div>)}</div>
    </>}
    <div className="dk-facts">
      <span><Icon name="clock" />{t(WHEN[d.w] || WHEN.any)}</span>
      {flags.caffeine && <span className="warn"><Icon name="bolt" />{t('Caffeine')}</span>}
      {flags.dairy && <span><Icon name="drop" />{t('Contains milk')}</span>}
      {flags.nuts && <span className="warn"><Icon name="alert" />{t('Contains nuts')}</span>}
    </div>
    {d.caut.map(k => <div key={k} className="dk-caution"><Icon name="alert" /><span>{t(CAUTION[k])}</span></div>)}

    <div className="dk-log card">
      <div className="lbl2">{t('Add to today’s log')}</div>
      <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
      <div className="kit-sv">
        <span>{t('Glasses')}</span>
        <div className="kit-svc">
          <button className="iconbtn" aria-label={t('Less')} onClick={() => setCups(v => Math.max(0.5, v - 0.5))}><Icon name="minus" /></button>
          <b>{n1(cups)}</b>
          <button className="iconbtn" aria-label={t('More')} onClick={() => setCups(v => Math.min(8, v + 0.5))}><Icon name="plus" /></button>
        </div>
        <b className="kit-svk">{n0(n.kcal * cups)} {U('kcal')}</b>
      </div>
      {n.ml >= 50 && <label className="dk-wtoggle"><Icon name="drop" /><span className="grow">{t('Count {0} ml towards water', n0(n.ml * cups))}</span><Switch checked={water} onChange={setWater} /></label>}
      <Button variant="primary" icon="check" onClick={log}>{t('Add to {0}', mealName(meal))}</Button>
    </div>
    <div className="dk-actions">
      {d.mine
        ? <><Button variant="tinted" icon="pencil" onClick={() => { close(); setTimeout(() => drinkBuilderSheet(St.myDrinks.find(m => m.id === d.id)), 80) }}>{t('Edit')}</Button>
          <Button variant="plain" icon="trash" className="danger" onClick={del}>{t('Delete')}</Button></>
        : <Button variant="tinted" icon="blender" onClick={remix}>{t('Make my own version')}</Button>}
    </div>
  </div>
}
export const drinkSheet = id => ui().openSheet(close => <DrinkView id={id} close={close} />)

// ---- the builder -----------------------------------------------------------------------------------
function IngPicker({ onPick, close }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(null)
  const list = searchDing(q, t, q ? null : cat)
  return <div className="dk-pick">
    <h3>{t('Add an ingredient')}</h3>
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search ingredients')} autoFocus />
    {!q && <div className="dk-chips scroll">
      <button className={'chip nocap' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>{t('All')}</button>
      {DING_CATS.map(c => <button key={c.key} className={'chip nocap' + (cat === c.key ? ' on' : '')} onClick={() => setCat(c.key)}><Icon name={c.icon} />{t(c.name)}</button>)}
    </div>}
    <div className="list dk-pick-l">
      {list.map(x => <button key={x.id} className="item dk-pick-i" onClick={() => { onPick(x); close() }}>
        <div className="grow"><div className="tt">{t(x.name)}</div><div className="ss">{n0(x.kcal)} {U('kcal')} / 100 {U(x.d >= 0.9 && x.cat !== 'fruit' ? 'ml' : 'g')}</div></div>
        <Icon name="plus" />
      </button>)}
      {!list.length && <div className="empty small">{t('Nothing found')}</div>}
    </div>
  </div>
}
const ingPickerSheet = onPick => ui().openSheet(close => <IngPicker onPick={onPick} close={close} />)

const defaultAmount = x => {
  const u = x.def
  if (u === 'ml') return [x.id === 'water' || x.id === 'sparkling' ? 250 : 200, 'ml']
  if (u === 'g') return [x.cat === 'fruit' || x.cat === 'veg' ? 100 : 30, 'g']
  return [1, u]
}

function Builder({ existing, from, close }) {
  const update = useStore(s => s.update)
  const seed = existing ? myDrinkAsDrink(existing) : from ? { ...from, ing: from.ing.filter(r => !r.opt) } : null
  const [name, setName] = useState(existing ? existing.n : from ? t('My {0}', t(from.name)) : '')
  const [temp, setTemp] = useState(seed ? seed.t : 'c')
  const [col, setCol] = useState(seed ? seed.col : COLORS[0])
  const [sv, setSv] = useState(seed ? seed.sv : 1)
  const [rows, setRows] = useState(() => (seed ? seed.ing.map(r => ({ id: r.id, a: r.a, u: r.u, x: r.x })) : []))
  const [note, setNote] = useState(existing ? existing.note || '' : '')
  const tot = rowsTotals(rows)
  const per = { kcal: tot.kcal / sv, p: tot.p / sv, c: tot.c / sv, f: tot.f / sv, s: tot.s / sv, ml: tot.water / sv }
  const preview = { g: temp === 'h' ? 'mug' : 'tall', col, t: temp, ing: rows.map(r => ({ id: r.id })) }
  const level = Math.min(0.92, 0.18 + Math.min(1, per.ml / 330) * 0.74)
  const setRow = (i, patch) => setRows(rs => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const add = x => { const [a, u] = defaultAmount(x); setRows(rs => [...rs, { id: x.id, a, u, x: 1 }]) }
  const ok = name.trim().length > 0 && rows.length > 0
  const save = andLog => {
    if (!ok) { toast(name.trim() ? t('Add at least one ingredient') : t('Give your drink a name')); return }
    let id = null
    update(s => { id = saveMyDrink(s, { id: existing && existing.id, n: name, col, t: temp, sv, ing: rows.map(r => [r.id, r.a, r.u, r.x]), note }) })
    close()
    if (andLog) {
      const d = drinkOf(useStore.getState().S, id)
      const r = logDrink(d, { servings: 1 })
      toast(t('Saved and added · {0} kcal', n0(r.kcal)))
    } else toast(t('Saved to My drinks'))
  }
  return <div className="dk-build" style={{ '--c': col }}>
    <h3>{existing ? t('Edit drink') : t('Create your drink')}</h3>
    <div className="dk-build-live card">
      <DrinkGlass drink={preview} size={74} level={level} live drawn />
      <div className="grow">
        <div className="lbl2">{t('Per glass')}</div>
        <div className="dk-build-k"><b><AnimatedNumber value={per.kcal} /></b> {U('kcal')}</div>
        <div className="small muted">{t('P {0} · C {1} · F {2} · sugar {3} g', n1(per.p), n1(per.c), n1(per.f), n1(per.s))}</div>
        {per.ml > 0 && <div className="small muted"><Icon name="drop" style={{ width: 12, height: 12, verticalAlign: '-1px' }} /> {t('Adds about {0} ml of water', n0(per.ml))}</div>}
      </div>
    </div>
    <TextField value={name} onChange={e => setName(e.target.value)} placeholder={t('Name, e.g. My morning smoothie')} maxLength={60} dir="auto" />
    <div className="dk-build-row">
      <Segmented options={[{ value: 'c', label: t('Cold') }, { value: 'h', label: t('Hot') }]} value={temp} onChange={setTemp} />
      <div className="stp dk-batch" aria-label={t('Glasses it makes')}>
        <button onClick={() => setSv(v => Math.max(1, v - 1))} aria-label={t('Fewer')}><Icon name="minus" /></button>
        <span className="val">{t('{0} glasses', n0(sv))}</span>
        <button onClick={() => setSv(v => Math.min(20, v + 1))} aria-label={t('More')}><Icon name="plus" /></button>
      </div>
    </div>
    <div className="dk-colors" role="radiogroup" aria-label={t('Colour')}>
      {COLORS.map(c => <button key={c} role="radio" aria-checked={col === c} className={'dk-color' + (col === c ? ' on' : '')} style={{ '--sw': c }} onClick={() => setCol(c)} aria-label={c} />)}
    </div>
    <div className="dk-sec-t">{t('Ingredients')}</div>
    <div className="dk-brows">
      {rows.map((r, i) => {
        const x = DING_BY_ID[r.id]
        const kc = x ? Math.round(x.kcal * gramsOf(x, r.a, r.u) / 100 * (r.x == null ? 1 : r.x)) : 0
        return <div key={i} className="dk-brow" style={{ '--i': i }}>
          <div className="grow"><div className="tt">{ingName(r.id)}</div><div className="ss">{n0(kc)} {U('kcal')}{r.x != null && r.x < 0.5 ? ' · ' + t('steeped') : ''}</div></div>
          <input className="input dk-amt" type="number" inputMode="decimal" min="0" step="any" value={r.a}
            aria-label={t('Amount')} onChange={e => setRow(i, { a: Math.max(0, +e.target.value || 0) })} />
          <select className="input dk-unit" value={r.u} aria-label={t('Unit')} onChange={e => setRow(i, { u: e.target.value })}>
            {unitsOf(x).map(u => <option key={u} value={u}>{u === 'g' || u === 'ml' ? U(u) : qtyText(1, u).replace(/^1\s*/, '')}</option>)}
          </select>
          <button className="iconbtn" aria-label={t('Remove')} onClick={() => setRows(rs => rs.filter((_, k) => k !== i))}><Icon name="xmark" /></button>
        </div>
      })}
      {!rows.length && <div className="empty small">{t('Add what goes in — the calories add up as you go.')}</div>}
    </div>
    <Button variant="tinted" icon="plus" onClick={() => ingPickerSheet(add)}>{t('Add an ingredient')}</Button>
    <textarea className="input dk-note-in" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={t('How you make it (optional)')} maxLength={300} dir="auto" />
    <div className="dk-build-save">
      <Button variant="tinted" onClick={() => save(false)}>{t('Save')}</Button>
      <Button variant="primary" icon="check" onClick={() => save(true)}>{t('Save and add to today')}</Button>
    </div>
  </div>
}
export const drinkBuilderSheet = (existing = null, { from = null } = {}) => ui().openSheet(close => <Builder existing={existing} from={from} close={close} />)

// ---- choose a drink (day plan) -------------------------------------------------------------------------
function Pick({ onPick, close, cat: cat0 }) {
  const St = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(cat0 || null)
  const list = searchDrinks(St, { q, cat: q ? null : cat, tr: t })
  return <div className="dk-pick">
    <h3>{t('Choose a drink')}</h3>
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search drinks')} />
    {!q && <div className="dk-chips scroll">
      <button className={'chip nocap' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>{t('All')}</button>
      {(St.myDrinks || []).length > 0 && <button className={'chip nocap' + (cat === 'mine' ? ' on' : '')} onClick={() => setCat('mine')}>{t('My drinks')}</button>}
      {DRINK_CATS.map(c => <button key={c.key} className={'chip nocap' + (cat === c.key ? ' on' : '')} onClick={() => setCat(c.key)}><Icon name={c.icon} />{t(c.name)}</button>)}
    </div>}
    <div className="list dk-pick-l">
      {list.map(d => <button key={d.id} className="item dk-pick-i" onClick={() => { onPick(d); close() }}>
        <DrinkGlass drink={d} size={30} />
        <div className="grow"><div className="tt" dir="auto">{d.mine ? d.name : t(d.name)}</div><div className="ss">{n0(drinkNutrition(d).kcal)} {U('kcal')}</div></div>
        <Icon name="chevronRight" className="chev" />
      </button>)}
    </div>
  </div>
}
export const pickDrinkSheet = (onPick, cat = null) => ui().openSheet(close => <Pick onPick={onPick} close={close} cat={cat} />)

// ---- the screen --------------------------------------------------------------------------------------
export default function Drinks() {
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const loc = useLocation()
  const initial = new URLSearchParams(loc.search).get('c')
  const [cat, setCat] = useState(initial && (DRINK_CAT_BY_KEY[initial] || initial === 'mine' || initial === 'fav') ? initial : null)
  const [q, setQ] = useState('')
  const [temp, setTemp] = useState(null)
  const [light, setLight] = useState(false)
  const iso = todayISO()
  const favs = new Set(St.drinkFavs || [])
  const list = useMemo(() => searchDrinks(St, { q, cat: q ? null : cat, temp, maxKcal: light ? 100 : null, tr: t }), [St, q, cat, temp, light])
  const today = useMemo(() => dayEntries(St, iso).filter(e => e.dr), [St, iso])
  const todayKcal = today.reduce((a, e) => a + Math.round((+e.kcal || 0) * (+e.q || 1)), 0)
  const recent = recentDrinks(St, 8).map(id => drinkOf(St, id)).filter(Boolean)
  const dod = drinkOfDay(iso)
  const dn = drinkNutrition(dod)
  const c = cat && DRINK_CAT_BY_KEY[cat]
  const mine = St.myDrinks || []

  return <div className="narrow dk-page">
    <div className="hdr">
      <BackButton fallback="/kitchen" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Drinks & juices')}</h1><div className="sub">{t('Healthy recipes with calories')}</div></div>
      <button className="iconbtn" aria-label={t('Create your drink')} onClick={() => drinkBuilderSheet()}><Icon name="plus" /></button>
    </div>

    {!q && !cat && <button className="card dk-dod" style={{ '--c': dod.col }} onClick={() => drinkSheet(dod.id)}>
      <span className="dk-dod-bg" aria-hidden="true" />
      <span className="dk-dod-glass"><DrinkGlass drink={dod} size={84} live /></span>
      <span className="dk-dod-t">
        <span className="lbl2">{t('Drink of the day')}</span>
        <b dir="auto">{t(dod.name)}</b>
        <span className="small">{n0(dn.kcal)} {U('kcal')} · {t(DRINK_CAT_BY_KEY[dod.cats[0]].name)}</span>
        {dod.story && <span className="small dk-dod-s">{t(dod.story)}</span>}
      </span>
    </button>}

    {!q && !cat && <div className="dk-today">
      <div><b>{n0(today.length)}</b><span>{t('Drinks today')}</span></div>
      <div><b>{n0(todayKcal)}</b><span>{t('kcal from drinks')}</span></div>
      <div><b>{n0(mine.length)}</b><span>{t('My drinks')}</span></div>
    </div>}

    {!q && !cat && <div className="dk-promos">
      <button className="sd-promo" style={{ '--c1': '#e41e2b', '--c2': '#0b4ea2' }} onClick={() => nav('/sodas')}>
        <span className="sd-promo-art" aria-hidden="true"><SodaArt soda={SODA_BY_ID.coke} pk="can" ml={330} size={30} /><SodaArt soda={SODA_BY_ID['7up']} pk="glassb" ml={250} size={26} /></span>
        <span className="grow"><b>{t('Soft drinks')}</b><small>{t('Cans, bottles and glasses')}</small></span>
      </button>
      <button className="sd-promo" style={{ '--c1': '#b9783f', '--c2': '#93c572' }} onClick={() => nav('/nuts')}>
        <span className="sd-promo-art" aria-hidden="true"><NutArt nut={NUT_BY_ID.pistachio} shell size={34} /><NutArt nut={NUT_BY_ID.almond} size={28} /></span>
        <span className="grow"><b>{t('Nuts & seeds')}</b><small>{t('Pistachios, kerzat and more')}</small></span>
      </button>
    </div>}

    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search drinks or ingredients')} />
    <div className="dk-chips scroll" role="tablist">
      <button role="tab" aria-selected={!cat} className={'chip nocap' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>{t('All')}</button>
      {favs.size > 0 && <button role="tab" aria-selected={cat === 'fav'} className={'chip nocap' + (cat === 'fav' ? ' on' : '')} onClick={() => setCat('fav')}><Icon name="starFill" />{t('Favourites')}</button>}
      <button role="tab" aria-selected={cat === 'mine'} className={'chip nocap' + (cat === 'mine' ? ' on' : '')} onClick={() => setCat('mine')}><Icon name="blender" />{t('My drinks')}</button>
      {DRINK_CATS.map(k => <button key={k.key} role="tab" aria-selected={cat === k.key} className={'chip nocap dk-chip' + (cat === k.key ? ' on' : '')}
        style={{ '--cc': k.color }} onClick={() => setCat(k.key)}><Icon name={k.icon} />{t(k.name)}</button>)}
    </div>
    <div className="dk-filters">
      <button className={'chip nocap' + (temp === 'c' ? ' on' : '')} aria-pressed={temp === 'c'} onClick={() => setTemp(v => (v === 'c' ? null : 'c'))}><Icon name="drop" />{t('Cold')}</button>
      <button className={'chip nocap' + (temp === 'h' ? ' on' : '')} aria-pressed={temp === 'h'} onClick={() => setTemp(v => (v === 'h' ? null : 'h'))}><Icon name="flame" />{t('Hot')}</button>
      <button className={'chip nocap' + (light ? ' on' : '')} aria-pressed={light} onClick={() => setLight(v => !v)}><Icon name="leafy" />{t('Under 100 kcal')}</button>
    </div>

    {c && <div className="dk-cat-h" style={{ '--cc': c.color }}><span className="dk-cat-ic"><Icon name={c.icon} /></span><div><b>{t(c.name)}</b><div className="small muted">{t(c.desc)}</div></div></div>}

    {cat === 'mine' && <button className="card dk-new" onClick={() => drinkBuilderSheet()}>
      <span className="dk-new-ic"><Icon name="blender" /></span>
      <span className="grow"><b>{t('Create your drink')}</b><span className="small muted">{t('Pick the ingredients — the calories are worked out for you.')}</span></span>
      <Icon name="plus" />
    </button>}

    {!q && !cat && recent.length > 0 && <>
      <div className="dk-sec-t">{t('Recently')}</div>
      <div className="dk-recent scroll">
        {recent.map(d => <button key={d.id} className="dk-rc" style={{ '--c': d.col }} onClick={() => drinkSheet(d.id)}>
          <DrinkGlass drink={d} size={34} /><span dir="auto">{d.mine ? d.name : t(d.name)}</span>
        </button>)}
      </div>
    </>}

    <div className="dk-grid" key={(cat || 'all') + (temp || '') + (light ? 'l' : '')}>
      {list.map((d, i) => <DrinkCard key={d.id} d={d} i={i} fav={favs.has(d.id)} onFav={() => update(s => { toggleDrinkFav(s, d.id) })} />)}
    </div>
    {!list.length && <div className="empty small"><div className="ico"><Icon name="cup" /></div>{cat === 'mine' ? t('No drinks of your own yet.') : t('Nothing found')}</div>}
    <p className="small muted dk-foot">{t('Calories are worked out from the ingredients. Steeped herbs and fruit add only a little — that is counted too.')}</p>
  </div>
}
