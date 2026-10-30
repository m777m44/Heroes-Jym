// 14.0 — an item of the Kitchen (lib/kitchenHub.js) with its real photo:
//   ItemCard  a card of the section grids — the photo drifts slowly while it is on screen
//   ItemRow   a row (search results, lists) with a small photo — 14.0: it drifts too, gently
//   ItemChip  a small square for the "recently" and "favourites" strips (drifting as well)
import { memo } from 'react'
import { t, U, dateLocale } from '../../lib/i18n.js'
import { FOOD_CATS } from '../../lib/foodDb.js'
import { Photo } from '../FoodPhoto.jsx'
import Icon from '../Icon.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
export const KIND_ICON = { F: 'fork', R: 'book', D: 'blender', S: 'bottle', N: 'nut', M: 'pencil' }
const KIND_LABEL = { R: 'Recipe', D: 'Drink recipe', S: 'Soft drinks', N: 'Nuts & seeds', M: 'My cooking' }
/** The item's name in the current language (your own dishes keep the name you gave them). */
export const itemName = x => (x ? (x.mine ? x.name : t(x.name)) : '')
/** What kind of thing it is: the food's shelf, or Recipe, Drink recipe … */
export function kindText(x) {
  if (!x) return ''
  if (x.kind === 'F') { const c = FOOD_CATS.find(k => k.key === x.cat); return c ? t(c.name) : '' }
  return t(KIND_LABEL[x.kind] || '')
}

function Macros({ x }) {
  return <span className="kc-m" aria-label={t('Protein {0} g · carbs {1} g · fat {2} g', n1(x.p), n1(x.c), n1(x.f))}>
    <i style={{ '--c': 'var(--red)' }}>{n1(x.p)}</i><i style={{ '--c': 'var(--yellow)' }}>{n1(x.c)}</i><i style={{ '--c': 'var(--blue)' }}>{n1(x.f)}</i>
  </span>
}

const Fallback = ({ x, cls }) => <span className={cls} aria-hidden="true"><Icon name={KIND_ICON[x.kind] || 'fork'} /></span>

export const ItemCard = memo(function ItemCard({ x, fav = false, onOpen, live = true }) {
  return <button type="button" className="kc" onClick={() => onOpen(x)}>
    <span className="kc-ph">
      {x.img ? <img className="kc-own" src={x.img} alt="" loading="lazy" decoding="async" />
        : <Photo k={x.ph} size="m" live={live} alt="" fallback={<Fallback x={x} cls="kc-none" />} />}
      <span className="kc-kcal"><b>{n0(x.kcal)}</b>{U('kcal')}</span>
      {fav && <span className="kc-fav"><Icon name="starFill" /></span>}
      {x.min != null && <span className="kc-tag"><Icon name="timer" />{t('{0} min', n0(x.min))}</span>}
      {x.iq && <span className="kc-iq" aria-label={t('Iraqi')}><Icon name="palm" /></span>}
      {x.bt && <span className="kc-bt" aria-label={t('Build it your way')}><Icon name="sliders" /></span>}
    </span>
    <span className="kc-t">
      <b dir="auto">{itemName(x)}</b>
      <Macros x={x} />
    </span>
  </button>
})

export const ItemRow = memo(function ItemRow({ x, fav = false, onOpen, sub = null }) {
  return <button type="button" className="kr" onClick={() => onOpen(x)}>
    {x.img ? <img className="kr-ph kr-own" src={x.img} alt="" loading="lazy" decoding="async" />
      : <Photo k={x.ph} size="t" live alt="" className="kr-ph" fallback={<Fallback x={x} cls="kr-ph kr-none" />} />}
    <span className="grow kr-t">
      <b className="tt" dir="auto">{itemName(x)}{fav && <Icon name="starFill" className="kr-star" />}</b>
      <span className="ss">{sub != null ? sub : kindText(x)}</span>
    </span>
    <b className="kr-kcal">{n0(x.kcal)}<small>{U('kcal')}</small></b>
  </button>
})

export const ItemChip = memo(function ItemChip({ x, onOpen }) {
  return <button type="button" className="kch" onClick={() => onOpen(x)}>
    {x.img ? <img className="kch-ph kr-own" src={x.img} alt="" loading="lazy" decoding="async" />
      : <Photo k={x.ph} size="t" live alt="" className="kch-ph" fallback={<Fallback x={x} cls="kch-ph kr-none" />} />}
    <span className="kch-t" dir="auto">{itemName(x)}</span>
    <span className="kch-k">{n0(x.kcal)} {U('kcal')}</span>
  </button>
})
