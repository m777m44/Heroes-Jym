// 5.0 — /food: the food log. A day at a time (‹ ›), the calorie ring against the goal, protein /
// carbs / fat, a few honest pointers, the four meals with what you ate, and the week.
// ?d=YYYY-MM-DD opens a given day.
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { todayISO, isoOf, fmtDate } from '../lib/format.js'
import { nav } from '../lib/nav.js'
import { bodyKg } from '../lib/water.js'
import {
  MEALS, dayEntries, dayTotals, foodGoalOf, foodName, foodOf, entryKcal, foodWeek, foodStreak, foodInsights, sweetKcalOn, copyDay, servingText,
} from '../lib/food.js'
import Icon from '../components/Icon.jsx'
import { BackButton, Button, Section, Row, Switch } from '../components/ui.jsx'
import SodaArt from '../components/SodaArt.jsx'
import NutArt from '../components/NutArt.jsx'
import DrinkGlass from '../components/DrinkGlass.jsx'
import { SODA_BY_ID, PACKS } from '../lib/sodas.js'
import { NUT_BY_ID, FORMS } from '../lib/nuts.js'
import { drinkOf } from '../lib/drinks.js'
import {
  FoodRing, FoodBubble, addFoodSheet, entrySheet, foodGoalSheet, customFoodSheet, GOAL_SOURCE, n0, qtyLabel,
} from '../components/food/FoodSheets.jsx'

const shift = (iso, d) => isoOf(new Date(new Date(iso + 'T12:00:00').getTime() + d * 864e5))
const MACROS = [
  { k: 'p', goal: 'protein', name: 'Protein', color: 'var(--red)' },
  { k: 'c', goal: 'carbs', name: 'Carbs', color: 'var(--yellow)' },
  { k: 'f', goal: 'fat', name: 'Fat', color: 'var(--blue)' },
]

export default function Food() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const loc = useLocation()
  const today = todayISO()
  const [iso, setIso] = useState(() => {
    const m = /[?&]d=(\d{4}-\d\d-\d\d)/.exec(loc.search || '')
    return m && m[1] <= today ? m[1] : today
  })
  const totals = dayTotals(S, iso)
  const goal = foodGoalOf(S, iso)
  const left = goal.kcal - totals.kcal
  const entries = dayEntries(S, iso)
  const prev = shift(iso, -1)
  const prevCount = dayEntries(S, prev).length
  const week = foodWeek(S, iso, 7)
  const wmax = Math.max(...week.map(d => Math.max(d.kcal, d.goal)), 1)
  const streak = foodStreak(S, today)
  const tips = foodInsights(totals, goal, { hour: iso === today ? new Date().getHours() : 23, kg: bodyKg(S) || 70, sweetKcal: sweetKcalOn(S, iso) })
  const dayLabel = iso === today ? t('Today') : iso === shift(today, -1) ? t('Yesterday') : fmtDate(iso, true)
  const wd = d => new Date(d + 'T12:00:00').toLocaleDateString(dateLocale(), { weekday: 'narrow' })
  const mine = S.customFoods || []

  return <div className="food">
    <div className="hdr">
      <BackButton fallback="/home" />
      <div><h1>{t('Food log')}</h1><div className="sub">{t('What you eat, against your daily goal')}</div></div>
    </div>

    <div className="food-day" role="group" aria-label={t('Day')}>
      <button className="iconbtn" aria-label={t('Previous day')} onClick={() => setIso(prev)}><Icon name="chevronLeft" /></button>
      <button className="food-day-l" onClick={() => setIso(today)} disabled={iso === today}>
        <b>{dayLabel}</b>
        {streak >= 2 && <span className="food-streak"><Icon name="flame" />{t('{0}-day streak', streak)}</span>}
      </button>
      <button className="iconbtn" aria-label={t('Next day')} disabled={iso >= today} onClick={() => setIso(shift(iso, 1))}><Icon name="chevronRight" /></button>
    </div>

    <div className="card food-sum">
      <FoodRing eaten={totals.kcal} goal={goal.kcal}>
        <b>{n0(Math.abs(left))}</b>
        <span>{left >= 0 ? t('kcal left') : t('kcal over')}</span>
      </FoodRing>
      <div className="food-sum-n">
        <button className="food-sum-r food-goal-b" onClick={() => foodGoalSheet(iso)}>
          <span><Icon name="target" />{t('Goal')}</span><b>{n0(goal.kcal)}</b>
        </button>
        <div className="food-sum-r"><span><Icon name="fork" />{t('Eaten')}</span><b>{n0(totals.kcal)}</b></div>
        <div className="food-sum-r"><span><Icon name={left >= 0 ? 'checkCircle' : 'alert'} />{left >= 0 ? t('Left') : t('Over')}</span><b className={left >= 0 ? 'ok' : 'over'}>{n0(Math.abs(left))}</b></div>
        <div className="small muted food-src">{t(GOAL_SOURCE[goal.source])}</div>
      </div>
    </div>

    <div className="card food-macros">
      {MACROS.map(m => {
        const v = totals[m.k], g = goal.macros[m.goal] || 1
        return <div key={m.k} className="food-mac" style={{ '--tint': m.color }}>
          <div className="row between small"><b>{t(m.name)}</b><span className="muted">{n0(v)} / {n0(g)} {U('g')}</span></div>
          <div className="food-bar"><i style={{ width: Math.min(100, v / g * 100) + '%' }} /></div>
        </div>
      })}
    </div>

    {tips.map((x, i) => <div key={i} className={'card food-tip ' + x.tone}>
      <Icon name={x.tone === 'good' ? 'checkCircle' : x.tone === 'warn' ? 'alert' : 'lightbulb'} />
      <span>{t(x.key, ...x.args.map(a => (typeof a === 'number' ? n0(a) : a)))}</span>
    </div>)}

    {!entries.length && prevCount > 0 && <button className="card food-copy" onClick={() => {
      let n = 0
      update(s => { n = copyDay(s, prev, iso) })
      useUI.getState().toast(t('Copied {0} items from the day before', n))
    }}>
      <Icon name="copy" /><span className="grow"><b>{t('Same as the day before?')}</b><span className="small muted">{t('Copy {0} items in one tap', prevCount)}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>}

    {MEALS.map(m => {
      const list = entries.filter(e => (e.m || 's') === m.key)
      return <div key={m.key} className="card food-meal">
        <div className="food-meal-h">
          <span className="lrow-i" style={{ '--tint': m.color }}><Icon name={m.icon} /></span>
          <div className="grow"><b>{t(m.name)}</b>{list.length > 0 && <span className="small muted"> · {t('{0} kcal', n0(totals.byMeal[m.key]))}</span>}</div>
          <button className="food-add-b" aria-label={t('Add to {0}', t(m.name))} onClick={() => addFoodSheet({ iso, meal: m.key })}><Icon name="plus" /></button>
        </div>
        {list.length > 0 ? <div className="list food-items">
          {list.map(e => {
            const f = foodOf(S, e.f)
            // 10.0: soft drinks, nuts & seeds and drinks show their own picture and what they were
            const sd = e.sd && SODA_BY_ID[e.sd], nt = e.nut && NUT_BY_ID[e.nut], dr = !sd && !nt && e.dr ? drinkOf(S, e.dr) : null
            const sub = f ? servingText(f, U) : sd ? t(PACKS[e.pk] ? PACKS[e.pk].name : 'Soft drinks') : nt ? t(FORMS[e.fm] || 'Nuts') : dr ? t('Drinks') : e.r ? t('Home recipe') : t('Quick calories')
            return <div key={e.id} className="item" role="button" tabIndex={0} onClick={() => entrySheet(iso, e)} onKeyDown={ev => { if (ev.key === 'Enter') entrySheet(iso, e) }}>
              {sd ? <span className="food-x-art"><SodaArt soda={sd} pk={e.pk} ml={e.ml} size={24} /></span>
                : nt ? <span className="food-x-art"><NutArt nut={nt} form={e.fm} size={32} /></span>
                  : dr ? <span className="food-x-art"><DrinkGlass drink={dr} size={28} /></span>
                    : <FoodBubble food={f} size={32} />}
              <div className="grow"><div className="tt">{foodName(S, e)}</div><div className="ss">{qtyLabel(e.q)}{sub}</div></div>
              <b className="food-kcal">{n0(entryKcal(e))}</b>
            </div>
          })}
        </div> : <button className="food-empty" onClick={() => addFoodSheet({ iso, meal: m.key })}>{t('Nothing yet — tap to add')}</button>}
      </div>
    })}

    <button className="card food-kitchen-link" onClick={() => nav('/kitchen')}>
      <span className="startw-ico" style={{ background: 'var(--orange)' }}><Icon name="fork" /></span>
      <span className="grow"><b>{t('My kitchen')}</b><span className="small muted">{t('Recipes from what you have at home, a meal builder and a shopping list')}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>

    <div className="card food-week">
      <div className="row between" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>{t('This week')}</h2>
        <span className="small muted">{t('Average {0} kcal', n0(avgOf(week)))}</span>
      </div>
      <div className="food-wk" aria-hidden="true">
        {week.map(d => <button key={d.iso} className={'fw' + (d.iso === iso ? ' on' : '')} onClick={() => setIso(d.iso)} tabIndex={-1}>
          <span className="fw-bar">
            <i style={{ height: Math.round(d.kcal / wmax * 100) + '%', background: !d.kcal ? 'transparent' : d.kcal > d.goal * 1.1 ? 'var(--orange)' : 'var(--green)' }} />
            <em style={{ bottom: Math.round(d.goal / wmax * 100) + '%' }} />
          </span>
          <span className="fw-l">{wd(d.iso)}</span>
        </button>)}
      </div>
    </div>

    {mine.length > 0 && <div className="card">
      <h2 style={{ margin: '0 0 8px' }}>{t('My foods')}</h2>
      <div className="list">
        {mine.map(f => <div key={f.id} className="item" role="button" tabIndex={0} onClick={() => customFoodSheet(f)} onKeyDown={ev => { if (ev.key === 'Enter') customFoodSheet(f) }}>
          <FoodBubble food={null} size={32} />
          <div className="grow"><div className="tt">{f.n}</div><div className="ss">{t('{0} kcal', n0(f.kcal))} · {t('Protein')} {n0(f.p)} {U('g')}</div></div>
          <Icon name="pencil" className="chev" />
        </div>)}
      </div>
    </div>}

    <div className="row" style={{ gap: 8 }}>
      <Button variant="tinted" icon="calculator" onClick={() => nav('/calories')}>{t('Calorie calculator')}</Button>
      <Button variant="tinted" icon="flame" onClick={() => nav(S.burnPlan ? '/burn/review' : '/burn/home')}>{t('Burn plan')}</Button>
    </div>
    <Section title={t('Settings')}>
      <Row icon="house" iconTint="var(--pink)" title={t('Show on Home')}>
        <Switch checked={S.foodOn !== false} onChange={v => update(s => { s.foodOn = v })} />
      </Row>
    </Section>
    <div className="small muted food-foot">{t('Calories are typical averages for a usual serving — home recipes vary. Change the amount, or create your own food for exact numbers.')}</div>
  </div>
}

const avgOf = week => { const d = week.filter(x => x.kcal > 0); return d.length ? d.reduce((s, x) => s + x.kcal, 0) / d.length : 0 }
