// 14.0 — pick an ingredient (the meal builder, build a meal, a dish of my own): search in Arabic or
// English, the kitchen's shelves as chips, each ingredient with its real photo and its calories.
import { useMemo, useState } from 'react'
import { useUI } from '../../store/useUI.js'
import { t, U, dateLocale } from '../../lib/i18n.js'
import { ING_CATS, searchIngredients } from '../../lib/kitchen.js'
import { photoKey } from '../../lib/photos/index.js'
import { Photo } from '../FoodPhoto.jsx'
import Icon from '../Icon.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const UNIT = {
  piece: () => t('1 piece'), can: () => t('1 can'), cup: () => t('1 cup'), slice: () => t('1 slice'), tbsp: () => t('1 tbsp'),
  tsp: () => t('1 tsp'), handful: () => t('1 handful'), clove: () => t('1 clove'),
}
export const unitText = x => (x.unit === 'g' || !UNIT[x.unit] ? '100 ' + U('g') : UNIT[x.unit]() + ' ≈ ' + n0(x.g) + ' ' + U('g'))
const catOf = x => ING_CATS.find(c => c.key === x.cat) || ING_CATS[0]

/** A small round picture of an ingredient: its photo, or its shelf's icon. */
export function IngThumb({ id, cat, size = 'sm' }) {
  const c = ING_CATS.find(k => k.key === cat) || ING_CATS[0]
  const fb = <span className={'kit-bub ' + size} style={{ '--tint': c.color }} aria-hidden="true"><Icon name={c.icon} /></span>
  const k = photoKey('I', id)
  return k ? <Photo k={k} size="t" live alt="" className={'ing-ph ' + size} fallback={fb} /> : fb
}

function IngPick({ onPick, close, exclude = [] }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(null)
  const skip = useMemo(() => new Set(exclude), [exclude])
  const list = searchIngredients(q, t).filter(x => (!cat || x.cat === cat) && !skip.has(x.id))
  return <div>
    <h3>{t('Add an ingredient')}</h3>
    <label className="food-search"><Icon name="magnifier" /><input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search ingredients')} aria-label={t('Search ingredients')} /></label>
    <div className="chips scroll ing-cats" role="tablist" aria-label={t('Shelves')}>
      <button type="button" role="tab" aria-selected={!cat} className={'chip nocap' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>{t('All')}</button>
      {ING_CATS.map(c => <button key={c.key} type="button" role="tab" aria-selected={cat === c.key} className={'chip nocap' + (cat === c.key ? ' on' : '')} onClick={() => setCat(c.key)}>
        <Icon name={c.icon} />{t(c.name)}</button>)}
    </div>
    <div className="list kit-picklist">
      {list.map(x => <div key={x.id} className="item" role="button" tabIndex={0} onClick={() => { onPick(x.id); close() }}
        onKeyDown={e => { if (e.key === 'Enter') { onPick(x.id); close() } }}>
        <IngThumb id={x.id} cat={catOf(x).key} />
        <div className="grow"><div className="tt">{t(x.name)}</div><div className="ss">{unitText(x)} · {n0(x.kcal)} {U('kcal')} / 100 {U('g')}</div></div>
      </div>)}
      {!list.length && <div className="empty small"><div className="ico"><Icon name="magnifier" /></div>{t('Nothing found for “{0}”.', q.trim())}</div>}
    </div>
  </div>
}

export const ingPickSheet = (onPick, { exclude } = {}) => useUI.getState().openSheet(close => <IngPick onPick={onPick} exclude={exclude} close={close} />)
