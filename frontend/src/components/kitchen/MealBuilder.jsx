// 14.0 — the meal builder (مُركِّب الوجبة). A dish opens with what goes into it, by weight — the
// burger's bun, patty, onion, tomato, pickles, sauces and salt; the shawarma's bread, meat, garlic
// sauce and fries; a recipe's ingredients — and nothing is logged until you tap Add:
//   − / +    change any amount (a whole patty or falafel at a time, a spoon of sauce, 0.5 g of salt)
//   ✕        take it out (it waits under "Taken out" to come back)
//   Add an ingredient   anything from the kitchen's 180+ ingredients, each with its photo
//   Reset    back to the usual recipe
// The calories, protein, carbs, fat and sodium follow live, with the difference to the usual one.
// Logged unchanged it is the food itself; changed, it keeps its own values and says what changed
// ("Beef burger (without Mayonnaise · + Cheddar cheese)" — lib/food.js builtLabel).
//
//   mealBuilderSheet({ fid })                 a food built from parts (lib/foods/street.js)
//   mealBuilderSheet({ rid, opt })            a recipe (with the optional ingredients chosen)
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, U, dateLocale } from '../../lib/i18n.js'
import { todayISO } from '../../lib/format.js'
import { MEALS, mealAt, addEntry, foodName, builtLabel } from '../../lib/food.js'
import { ING_BY_ID, saveBuiltMeal } from '../../lib/kitchen.js'
import { FOOD_BY_ID } from '../../lib/foodDb.js'
import { baseOf, diffBuild, buildTotals, builtEntry, changesForLog, stepOf, clampG, piecesOf, catOf } from '../../lib/mealBuilder.js'
import { photoKey } from '../../lib/photos/index.js'
import { burst, lastTap } from '../../lib/motion.js'
import { PhotoHero } from './PhotoHero.jsx'
import { IngThumb, ingPickSheet } from './IngPick.jsx'
import Icon from '../Icon.jsx'
import { Button, Segmented } from '../ui.jsx'

const ui = () => useUI.getState()
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
const mealName = key => t((MEALS.find(m => m.key === key) || MEALS[3]).name)
const SODIUM_DAY = 2000
const QTYS = [0.5, 1, 1.5, 2, 3]

function Row({ it, onStep, onSet, onRemove }) {
  const x = ING_BY_ID[it.id]
  const st = stepOf(it.id, it.g)
  const pcs = piecesOf(it.id, it.g)
  return <div className="mb-row">
    <IngThumb id={it.id} cat={x.cat} />
    <div className="grow mb-row-t">
      <b dir="auto">{t(x.name)}</b>
      <small>{n0(x.kcal * it.g / 100)} {U('kcal')}{pcs ? ' · ' + t('{0} × {1}', pcs, t(x.unit === 'slice' ? 'slice' : 'piece')) : ''}</small>
    </div>
    <div className="mb-amt" role="group" aria-label={t(x.name)}>
      <button type="button" className="iconbtn sm" aria-label={t('Less')} disabled={it.g <= 0} onClick={() => onStep(-st)}><Icon name="minus" /></button>
      <label className="mb-g"><input inputMode="decimal" value={it.g} aria-label={t('{0} in grams', t(x.name))}
        onChange={e => onSet(+String(e.target.value).replace(/[^\d.]/g, '') || 0)} /><span>{U('g')}</span></label>
      <button type="button" className="iconbtn sm" aria-label={t('More')} onClick={() => onStep(st)}><Icon name="plus" /></button>
    </div>
    <button type="button" className="iconbtn sm mb-x" aria-label={t('Take out {0}', t(x.name))} onClick={onRemove}><Icon name="xmark" /></button>
  </div>
}

function Totals({ v, changed }) {
  const share = (g, e) => (v.kcal > 0 ? Math.min(100, Math.round(g * e / v.kcal * 100)) : 0)
  const salty = v.na >= 800
  return <div className="card mb-tot" aria-live="polite">
    <div className="mb-tot-k">
      <b>{n0(v.kcal)}</b><span>{U('kcal')}</span>
      {changed && v.dk !== 0 && <em className={v.dk < 0 ? 'down' : 'up'}>{(v.dk > 0 ? '+' : '−') + n0(Math.abs(v.dk))} {t('vs the usual')}</em>}
    </div>
    <div className="mb-tot-m">
      {[['Protein', v.p, 'var(--red)', 4], ['Carbs', v.c, 'var(--yellow)', 4], ['Fat', v.f, 'var(--blue)', 9]].map(([k, g, c, e]) => <div key={k} style={{ '--c': c }}>
        <span>{t(k)}</span><b>{n1(g)} {U('g')}</b><i className="fdb-nut-bar"><em style={{ width: share(g, e) + '%' }} /></i>
      </div>)}
    </div>
    <div className={'mb-na' + (salty ? ' warn' : '')}>
      <Icon name="salt" /><span className="grow"><b>{t('Sodium')}</b><small>{t('{0}% of the daily limit', n0(v.na / SODIUM_DAY * 100))}</small></span>
      <b>{n0(v.na)} {U('mg')}</b>
    </div>
  </div>
}

function MealBuilder({ base, iso, meal: meal0, close }) {
  const update = useStore(s => s.update)
  const [items, setItems] = useState(() => base.items.map(x => ({ ...x })))
  const [q, setQ] = useState(1)
  const [meal, setMeal] = useState(meal0 || mealAt())
  const live = items.filter(i => i.g > 0)
  const out = base.items.filter(b => !items.some(i => i.id === b.id && i.g > 0))
  const changes = useMemo(() => diffBuild(base.items, items), [base, items])
  const v = useMemo(() => buildTotals(base, items), [base, items])
  const changed = changes.length > 0
  const name = changed ? builtLabel(changesForLog(base, changes), t) : t(base.name)
  const ph = base.fid ? photoKey('F', base.fid) : base.rid ? photoKey('R', base.rid) : null

  const setG = (id, g) => setItems(l => l.map(i => (i.id === id ? { ...i, g: clampG(id, g) } : i)))
  const step = (id, d) => setItems(l => l.map(i => (i.id === id ? { ...i, g: clampG(id, i.g + d) } : i)))
  const remove = id => setItems(l => l.map(i => (i.id === id ? { ...i, g: 0 } : i)))
  const back = id => { const b = base.items.find(x => x.id === id); setItems(l => (l.some(i => i.id === id) ? l.map(i => (i.id === id ? { ...i, g: b.g } : i)) : [...l, { ...b }])) }
  const add = id => setItems(l => {
    if (l.some(i => i.id === id && i.g > 0)) return l
    const x = ING_BY_ID[id], g = clampG(id, x.unit === 'g' ? 50 : x.g)
    return l.some(i => i.id === id) ? l.map(i => (i.id === id ? { ...i, g } : i)) : [...l, { id, g }]
  })
  const reset = () => setItems(base.items.map(x => ({ ...x })))

  const log = () => {
    if (!live.length) { ui().toast(t('Add at least one ingredient.')); return }
    const e = builtEntry(base, items, { q, meal, label: name })
    burst(lastTap(), { count: 14, spread: 70, colors: ['#FF9F0A', '#FFD60A', '#30D158', '#FF453A'] })
    update(s => { addEntry(s, iso || todayISO(), e) })
    ui().toast(t('Added {0} · {1} kcal', foodName(useStore.getState().S, e), n0(e.kcal * e.q)))
    close()
  }
  const save = () => {
    try {
      let food = null
      update(s => { food = saveBuiltMeal(s, { n: name.slice(0, 60), items: live, servings: 1, meal }) })
      ui().toast(t('Saved “{0}” to My cooking', food.n))
    } catch (err) { ui().toast(t(err.key || err.message)) }
  }
  const details = () => {
    if (base.fid) import('../../views/FoodDatabase.jsx').then(m => m.foodCardSheet(FOOD_BY_ID[base.fid], { iso, meal, noBuild: true }))
    else if (base.rid) import('../../views/Kitchen.jsx').then(m => m.recipeSheet(base.rid, meal))
  }

  return <div className="mb">
    {ph ? <PhotoHero k={ph} alt={t(base.name)}>
      <span className="mb-hero-t"><Icon name="sliders" />{t('Meal builder')}</span>
    </PhotoHero> : <div className="mb-head-ic" aria-hidden="true"><Icon name="sliders" /></div>}
    <h3 className="mb-title" dir="auto">{t(base.name)}</h3>
    <p className="small muted mb-sub">{t('Choose what goes in and how much — the calories follow. Nothing is counted until you add it.')}</p>

    <div className="mb-live" aria-hidden="true">
      <span className="mb-live-ic"><Icon name="flame" /></span>
      <b className="mb-live-k">{n0(v.kcal * q)}<small> {U('kcal')}</small></b>
      <span className="mb-live-m"><i style={{ '--c': 'var(--red)' }}>{n1(v.p * q)}</i><i style={{ '--c': 'var(--yellow)' }}>{n1(v.c * q)}</i><i style={{ '--c': 'var(--blue)' }}>{n1(v.f * q)}</i></span>
      {changed ? <span className="fdb-tag mb-yours">{t('Your way')}</span> : <span className="fdb-tag">{t('The usual')}</span>}
    </div>

    <div className="mb-h"><b>{t('Your ingredients')}</b><span className="small muted">{t('{0} ingredients', n0(live.length))}</span>
      {changed && <button type="button" className="linkbtn" onClick={reset}><Icon name="reset" />{t('Reset')}</button>}</div>
    <div className="mb-list">
      {live.map(it => <Row key={it.id} it={it} onStep={d => step(it.id, d)} onSet={g => setG(it.id, g)} onRemove={() => remove(it.id)} />)}
      {!live.length && <div className="empty small"><div className="ico"><Icon name="fork" /></div>{t('Everything is taken out — add something back.')}</div>}
    </div>
    {out.length > 0 && <div className="mb-out">
      <span className="small muted">{t('Taken out')}</span>
      <div className="kit-chips">{out.map(b => <button key={b.id} type="button" className="kit-chip" onClick={() => back(b.id)}><Icon name="plus" />{t(ING_BY_ID[b.id].name)}</button>)}</div>
    </div>}
    <Button variant="tinted" icon="plus" onClick={() => ingPickSheet(add, { exclude: live.map(i => i.id) })}>{t('Add an ingredient')}</Button>

    <Totals v={v} changed={changed} />
    {changed && <div className="mb-changes small" dir="auto"><Icon name="pencil" /><span>{name}</span></div>}

    <div className="lbl2" style={{ margin: '14px 0 6px' }}>{t('How many')}</div>
    <div className="chips food-qpick">
      {QTYS.map(x => <button key={x} type="button" className={'chip nocap' + (q === x ? ' on' : '')} aria-pressed={q === x} onClick={() => setQ(x)}>{'× ' + n1(x)}</button>)}
    </div>
    <div className="lbl2" style={{ margin: '12px 0 6px' }}>{t('Meal')}</div>
    <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
    <div style={{ height: 14 }} />
    <Button variant="primary" icon="plus" onClick={log}>{t('Add to {0}', mealName(meal))} · {n0(v.kcal * q)} {U('kcal')}</Button>
    <div className="mb-more">
      <Button variant="plain" size="sm" icon="starFill" onClick={save}>{t('Save as my dish')}</Button>
      <Button variant="plain" size="sm" icon={base.rid ? 'book' : 'info'} onClick={details}>{base.rid ? t('See the recipe') : t('Food details')}</Button>
    </div>
    <p className="small muted mb-foot">{t('Values per ingredient as served — USDA and restaurant averages; brands and portions vary.')}</p>
  </div>
}

/** Open the meal builder for a food built from parts ({ fid }) or a recipe ({ rid, opt }). */
export function mealBuilderSheet({ fid = null, rid = null, opt = null, iso = null, meal = null } = {}) {
  const base = baseOf({ fid, rid, opt })
  if (!base) return null
  return ui().openSheet(close => <MealBuilder base={base} iso={iso} meal={meal} close={close} />)
}
