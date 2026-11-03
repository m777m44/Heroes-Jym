// 15.0 — the photo viewer (عرض الصورة). Tap the photo of any food or drink — on a card, a row, a
// chip, the big photo at the top of its sheet, the food lists — and it opens over everything: the
// photo big (pinch or double-tap to zoom, the corner button shows it whole on black), and under it
// all there is to know — what it is and where in Iraq it comes from, a line about it, the calories
// with the protein / carbs / fat split, the full nutrition table per serving and per 100 g, its
// share of your day, the facts worth knowing, what it is made of, a lighter choice, allergens and
// who took the photo. "Add to my day" opens it the usual way (the food card, the meal builder, the
// recipe…). Like the food lists it closes only with the ✕ at the top right.
//
//   spotlight('F:dolma')           open it for an item of the Kitchen (or pass the item itself)
//   spotlight(uid, { iso, meal })  "Add" logs to that day and meal
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI, SHEET_OUT_MS } from '../../store/useUI.js'
import { t, U, dateLocale } from '../../lib/i18n.js'
import { todayISO } from '../../lib/format.js'
import { nav } from '../../lib/nav.js'
import { foodGoalOf, servingText } from '../../lib/food.js'
import { FOOD_BY_ID } from '../../lib/foodDb.js'
import { itemOf, kitchenItems, isFav, toggleItemFav } from '../../lib/kitchenHub.js'
import { allergensOf, tagsOf } from '../../lib/foodDetails.js'
import { amountOf, macroSplit, nutritionRows, dayShares, factsOf, lighterChoice, shareLines } from '../../lib/spotlight.js'
import { REGION_BY_KEY } from '../../lib/regions.js'
import { buildOf } from '../../lib/foods/street.js'
import { ING_BY_ID, RECIPE_BY_ID } from '../../lib/kitchen.js'
import { DRINK_BY_ID, DING_BY_ID, gramsOf } from '../../lib/drinks.js'
import { bodyKg } from '../../lib/water.js'
import { shareText } from '../../lib/mobile.js'
import { Photo } from '../FoodPhoto.jsx'
import { PhotoCredit } from './PhotoHero.jsx'
import { itemName, kindText, KIND_ICON } from './ItemCard.jsx'
import { openItem } from './openItem.js'
import Icon from '../Icon.jsx'
import { Button } from '../ui.jsx'

const ui = () => useUI.getState()
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
const MACROS = [['p', 'Protein', 'var(--red)'], ['c', 'Carbs', 'var(--yellow)'], ['f', 'Fat', 'var(--blue)']]

/** What it is made of: [{ name, g, kcal }] — a built dish's parts, a recipe's ingredients, a drink's. */
function partsOf(x) {
  const ing = (id, g) => { const i = ING_BY_ID[id]; return i ? { id, name: i.name, g, kcal: i.kcal * g / 100 } : null }
  if (x.kind === 'F') { const b = buildOf(x.id); return b ? b.map(p => ing(p.id, p.g)).filter(Boolean) : [] }
  if (x.kind === 'R') { const r = RECIPE_BY_ID[x.id]; return r ? r.ing.filter(i => !i.opt).map(i => ing(i.id, i.g)).filter(Boolean) : [] }
  if (x.kind === 'D') {
    const d = DRINK_BY_ID[x.id]
    if (!d) return []
    return (d.ing || []).filter(r => !r.opt).map(r => {
      const di = DING_BY_ID[r.id]
      if (!di) return null
      const g = gramsOf(di, r.a, r.u) / Math.max(1, d.sv || 1)
      return { id: r.id, name: di.name, g, kcal: di.kcal * g / 100 * (r.x == null ? 1 : r.x) }
    }).filter(Boolean)
  }
  return []
}

/** The serving in words: "1 plate · 350 g", "330 ml", "Per serving". */
function servingOf(x) {
  if (x.kind === 'F' && FOOD_BY_ID[x.id]) return servingText(FOOD_BY_ID[x.id], U)
  const a = amountOf(x)
  if (a) return n0(a.v) + ' ' + U(a.u)
  return x.kind === 'R' ? t('Per serving') : x.kind === 'D' ? t('Per glass') : ''
}

/** The photo, big: double-tap or pinch to zoom (up to 4×), drag to look around while zoomed. */
function ZoomPhoto({ k, alt, whole }) {
  const box = useRef(null)
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 })
  const g = useRef({ pts: new Map(), d0: 0, s0: 1, last: 0, px: 0, py: 0, x0: 0, y0: 0 })
  useEffect(() => { setZ({ s: 1, x: 0, y: 0 }) }, [k, whole])
  const clamp = (s, x, y) => {
    const el = box.current
    const w = el ? el.clientWidth : 0, h = el ? el.clientHeight : 0
    const mx = (w * (s - 1)) / 2, my = (h * (s - 1)) / 2
    return { s, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) }
  }
  const down = e => {
    const st = g.current
    st.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (st.pts.size === 2) {
      const [a, b] = [...st.pts.values()]
      st.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1; st.s0 = z.s
    } else if (st.pts.size === 1) {
      const now = performance.now()
      if (now - st.last < 300) {                       // double tap: zoom in where you tapped, or back out
        const el = box.current, r = el.getBoundingClientRect()
        const cx = e.clientX - r.left - r.width / 2, cy = e.clientY - r.top - r.height / 2
        setZ(z.s > 1 ? { s: 1, x: 0, y: 0 } : clamp(2.5, -cx * 1.5, -cy * 1.5))
        st.last = 0
      } else st.last = now
      st.px = e.clientX; st.py = e.clientY; st.x0 = z.x; st.y0 = z.y
    }
  }
  const move = e => {
    const st = g.current
    if (!st.pts.has(e.pointerId)) return
    st.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (st.pts.size === 2) {
      const [a, b] = [...st.pts.values()]
      const s = Math.max(1, Math.min(4, st.s0 * (Math.hypot(a.x - b.x, a.y - b.y) / st.d0)))
      setZ(v => clamp(s, v.x, v.y))
    } else if (st.pts.size === 1 && z.s > 1) {
      setZ(v => clamp(v.s, st.x0 + e.clientX - st.px, st.y0 + e.clientY - st.py))
    }
  }
  const up = e => {
    const st = g.current
    st.pts.delete(e.pointerId)
    if (st.pts.size === 1) { const [p] = [...st.pts.values()]; st.px = p.x; st.py = p.y; st.x0 = z.x; st.y0 = z.y }
    if (!st.pts.size && z.s < 1.05) setZ({ s: 1, x: 0, y: 0 })
  }
  const zoomed = z.s > 1
  return <div ref={box} className={'spot-zoom' + (zoomed ? ' on' : '')} style={{ touchAction: zoomed ? 'none' : 'pan-y' }}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
    <div className="spot-zoom-in" style={{ transform: `translate3d(${z.x}px, ${z.y}px, 0) scale(${z.s})` }}>
      <Photo k={k} size="m" live={!zoomed && !whole} alt={alt} fallback={<span className="spot-none" aria-hidden="true"><Icon name="fork" /></span>} />
    </div>
  </div>
}

function Ring({ split, kcal }) {
  const R = 44, C = 2 * Math.PI * R
  let off = 0
  return <div className="spot-ring" role="img" aria-label={t('{0} kcal', n0(kcal))}>
    <svg viewBox="0 0 108 108" aria-hidden="true">
      <circle cx="54" cy="54" r={R} className="spot-ring-bg" />
      {MACROS.map(([key, , col]) => {
        const len = C * (split[key] / 100)
        const el = <circle key={key} cx="54" cy="54" r={R} stroke={col} strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-off} />
        off += len
        return el
      })}
    </svg>
    <span className="spot-ring-t"><b>{n0(kcal)}</b><small>{U('kcal')}</small></span>
  </div>
}

function Spot({ uid0, close, opts }) {
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [uid, setUid] = useState(uid0)
  const [whole, setWhole] = useState(false)
  const scroller = useRef(null)
  const x = itemOf(uid)
  const swap = useMemo(() => (x ? lighterChoice(x, kitchenItems()) : null), [uid]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; setWhole(false) }, [uid])
  if (!x) return <div className="spot"><div className="empty">{t('Nothing found')}</div></div>
  const name = itemName(x)
  const rg = REGION_BY_KEY[x.rg]
  const fav = isFav(St, x)
  const goal = foodGoalOf(St, todayISO()).kcal
  const split = macroSplit(x)
  const rows = nutritionRows(x)
  const per = amountOf(x)
  const shares = dayShares(x, goal)
  const facts = factsOf(x, { kg: bodyKg(St) || 70 })
  const parts = partsOf(x)
  const food = x.kind === 'F' ? FOOD_BY_ID[x.id] : null
  const al = food ? allergensOf(food) : []
  const tags = tagsOf(x).filter(tg => tg.key !== 'iraqi')
  const serving = servingOf(x)
  const back = !!(opts && opts.fromSheet) && uid === uid0   // opened from the item's own sheet: "Add" is right below
  const add = () => { close(); if (!back) setTimeout(() => openItem(x, opts || {}), SHEET_OUT_MS + 40) }
  const compare = () => import('./CompareSheet.jsx').then(m => m.compareSheet(x))
  const share = async () => {
    const text = shareLines(x, { name, serving, place: rg ? t(rg.name) : '', tr: t, unit: U })
    const r = await shareText(text, name)
    if (r === 'copied') ui().toast(t('Copied'))
  }
  const more = () => { close(); setTimeout(() => nav('/kitchen/s/iraqi?rg=' + rg.key), SHEET_OUT_MS) }
  return <div className={'spot' + (whole ? ' whole' : '')} ref={scroller}>
    <div className="spot-ph">
      <ZoomPhoto k={x.ph} alt={name} whole={whole} />
      <span className="spot-shade" aria-hidden="true" />
      <button type="button" className="spot-whole" onClick={() => setWhole(v => !v)} aria-pressed={whole}
        aria-label={whole ? t('Back to the details') : t('Show the whole photo')}><Icon name={whole ? 'minimize' : 'expand'} /></button>
      {x.ph && <PhotoCredit k={x.ph} className="spot-credit" />}
      {!whole && <span className="spot-hint" aria-hidden="true"><Icon name="magnifier" />{t('Double-tap or pinch to zoom')}</span>}
    </div>

    <div className="spot-body">
      <div className="spot-kind">
        <span><Icon name={KIND_ICON[x.kind] || 'fork'} />{kindText(x)}</span>
        {x.iq && <span className="spot-iq"><Icon name="palm" />{t('Iraqi')}</span>}
        {rg && <span className="spot-rg" style={{ '--rc': rg.color }}><Icon name="location" />{t(rg.name)}</span>}
      </div>
      <h2 className="spot-name" dir="auto">{name}</h2>
      {serving && <div className="spot-serv">{serving}</div>}
      {tags.length > 0 && <div className="spot-tags">{tags.map(tg => <span key={tg.key} className={'fdb-tag t-' + tg.key}><Icon name={tg.icon} />{t(tg.name)}</span>)}</div>}
      {x.about && <p className="spot-about" dir="auto">{t(x.about)}</p>}

      <div className="spot-energy">
        <Ring split={split} kcal={x.kcal} />
        <div className="spot-mac">
          {MACROS.map(([key, label, col]) => <div key={key} className="spot-mac-r" style={{ '--c': col }}>
            <span className="spot-mac-l"><i />{t(label)}</span>
            <b>{n1(x[key])} <small>{U('g')}</small></b>
            <span className="spot-mac-p">{n0(split[key])}%</span>
            <span className="spot-bar"><em style={{ width: Math.min(100, split[key]) + '%' }} /></span>
          </div>)}
        </div>
      </div>

      <h3 className="spot-h"><Icon name="list" />{t('Nutrition facts')}</h3>
      <table className="spot-nut">
        <thead><tr><th />{<th>{serving ? t('Per serving') : ''}</th>}{per && <th>{t(per.u === 'ml' ? 'Per 100 ml' : 'Per 100 g')}</th>}</tr></thead>
        <tbody>{rows.map(([key, label, v, h, u, sub]) => <tr key={key} className={sub ? 'sub' : ''}>
          <th scope="row">{t(label)}</th>
          <td>{u === 'g' && key !== 'salt' ? n1(v) : key === 'salt' ? n1(v) : n0(v)} <small>{U(u)}</small></td>
          {per && <td>{h == null ? '—' : <>{u === 'g' ? n1(h) : n0(h)} <small>{U(u)}</small></>}</td>}
        </tr>)}</tbody>
      </table>

      <h3 className="spot-h"><Icon name="target" />{t('Of your day')}</h3>
      <div className="spot-day">{shares.map(sh => <div key={sh.key} className={'spot-day-r' + (sh.good ? ' good' : sh.pct >= 50 ? ' warn' : '')}>
        <span className="spot-day-l">{t(sh.name)}</span>
        <b>{n0(sh.pct)}%</b>
        <span className="spot-bar"><em style={{ width: Math.min(100, sh.pct) + '%' }} /></span>
      </div>)}</div>

      {facts.length > 0 && <>
        <h3 className="spot-h"><Icon name="lightbulb" />{t('Good to know')}</h3>
        <ul className="spot-facts">{facts.map(fc => <li key={fc.key} style={{ '--c': fc.tint }}><span className="spot-fact-i"><Icon name={fc.icon} /></span>
          <span>{t(fc.text, ...fc.args.map(a => (typeof a === 'number' ? (Number.isInteger(a) ? n0(a) : n1(a)) : a)))}</span></li>)}</ul>
      </>}

      {parts.length > 0 && <>
        <h3 className="spot-h"><Icon name="basket" />{t('What’s in it')}</h3>
        <div className="spot-parts">{parts.map((p, i) => <div key={p.id + i} className="spot-part">
          <span className="grow" dir="auto">{t(p.name)}</span><span className="spot-part-g">{n0(p.g)} {U('g')}</span><b>{n0(p.kcal)} <small>{U('kcal')}</small></b>
        </div>)}</div>
      </>}

      {swap && <button type="button" className="spot-swap" onClick={() => setUid(swap.item.uid)}>
        <Photo k={swap.item.ph} size="t" alt="" className="spot-swap-ph" fallback={<span className="spot-swap-ph kr-none"><Icon name="leafy" /></span>} />
        <span className="grow"><small>{t('A lighter choice')}</small><b dir="auto">{itemName(swap.item)}</b>
          <span className="spot-save">{t('Saves {0} kcal', n0(swap.save))}</span></span>
        <Icon name="chevronRight" className="chev" />
      </button>}

      {al.length > 0 && <div className="fdb-al spot-al"><Icon name="alert" /><span>{t('May contain: {0}', al.map(a => t(a.name)).join('، '))}</span><small>{t('Check the label — recipes and brands differ.')}</small></div>}

      {rg && <button type="button" className="spot-more" style={{ '--rc': rg.color }} onClick={more}>
        <Icon name="location" /><span className="grow">{t('More from {0}', t(rg.name))}</span><Icon name="chevronRight" className="chev" />
      </button>}
      <p className="small muted spot-foot">{t('Values per usual serving; homemade food varies.')}</p>
    </div>

    <div className="spot-acts">
      <Button variant="primary" icon={back ? 'chevronDown' : x.bt ? 'sliders' : 'plus'} onClick={add}>{back ? t('Back to the card') : x.bt ? t('Build it your way') : t('Add to my day')}</Button>
      <button type="button" className={'iconbtn spot-ib' + (fav ? ' on' : '')} aria-pressed={fav} aria-label={fav ? t('Remove from favourites') : t('Add to favourites')}
        onClick={() => update(s => { toggleItemFav(s, x) })}><Icon name={fav ? 'starFill' : 'star'} /></button>
      <button type="button" className="iconbtn spot-ib" aria-label={t('Compare')} onClick={compare}><Icon name="compare" /></button>
      <button type="button" className="iconbtn spot-ib" aria-label={t('Share')} onClick={share}><Icon name="upload" /></button>
    </div>
  </div>
}

/** Open the photo viewer for a Kitchen item (its uid, or the item). */
export function spotlight(uidOrItem, opts = null) {
  const uid = typeof uidOrItem === 'string' ? uidOrItem : uidOrItem && uidOrItem.uid
  if (!uid || !itemOf(uid)) return null
  return ui().openSheet(close => <Spot uid0={uid} close={close} opts={opts} />, { kind: 'full', pinned: true })
}
