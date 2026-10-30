// 14.0 — compare two things from the Kitchen side by side (a usual serving of each): calories,
// protein, carbs, fat, sugars, fibre and salt, each with its winner marked — the lighter, the
// more protein, the less sugar and salt.
//   compareSheet(a?, b?)   a and b are Kitchen items (lib/kitchenHub.js); missing ones are picked here
import { useMemo, useState } from 'react'
import { useUI } from '../../store/useUI.js'
import { t, U, dateLocale } from '../../lib/i18n.js'
import { kitchenItems, findItems } from '../../lib/kitchenHub.js'
import { Photo } from '../FoodPhoto.jsx'
import Icon from '../Icon.jsx'
import { SearchField } from '../ui.jsx'
import { ItemRow, itemName, KIND_ICON } from './ItemCard.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
// [label, field, unit, better: 'low' | 'high' | null, format]
export const ROWS = [
  ['Calories', 'kcal', 'kcal', 'low', n0],
  ['Protein', 'p', 'g', 'high', n1],
  ['Carbs', 'c', 'g', null, n1],
  ['Fat', 'f', 'g', 'low', n1],
  ['Sugars', 'sug', 'g', 'low', n1],
  ['Fibre', 'fib', 'g', 'high', n1],
  ['Sodium', 'na', 'mg', 'low', n0],
]
/** Which side wins a row: 'a', 'b' or null (a tie, unknown, or no better side). */
export function winner(a, b, field, better) {
  if (!better || !a || !b) return null
  const x = a[field], y = b[field]
  if (x == null || y == null || Math.abs(x - y) < (field === 'kcal' || field === 'na' ? 5 : 0.5)) return null
  return (better === 'low' ? x < y : x > y) ? 'a' : 'b'
}

function Side({ x, onChange }) {
  return <button type="button" className="cmp-side" onClick={onChange}>
    <span className="cmp-ph"><Photo k={x.ph} size="m" alt="" fallback={<span className="kc-none"><Icon name={KIND_ICON[x.kind] || 'fork'} /></span>} /></span>
    <b dir="auto">{itemName(x)}</b>
    <span className="small muted cmp-change"><Icon name="refresh" />{t('Change')}</span>
  </button>
}

function Compare({ a: a0, b: b0 }) {
  const [a, setA] = useState(a0 || null)
  const [b, setB] = useState(b0 || null)
  const [pick, setPick] = useState(() => (!a0 ? 'a' : !b0 ? 'b' : null))
  const [q, setQ] = useState('')
  const list = useMemo(() => findItems(kitchenItems(), { q, tr: t }).slice(0, 40), [q])
  if (pick) {
    return <div className="cmp">
      <h3>{pick === 'a' ? t('Pick the first one') : t('Pick the second one')}</h3>
      <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} type="search" autoFocus
        placeholder={t('Search the kitchen — dolma, tea, Indomie, kebab…')} aria-label={t('Search the kitchen')} />
      <div className="kr-list">{list.map(x => <ItemRow key={x.uid} x={x} onOpen={y => {
        if (pick === 'a') { setA(y); setPick(b ? null : 'b') } else { setB(y); setPick(a ? null : 'a') }
        setQ('')
      }} />)}</div>
    </div>
  }
  let score = { a: 0, b: 0 }
  for (const [, f, , better] of ROWS) { const w = winner(a, b, f, better); if (w) score[w]++ }
  return <div className="cmp">
    <h3>{t('Compare two foods')}</h3>
    <div className="cmp-head">
      <Side x={a} onChange={() => setPick('a')} />
      <span className="cmp-vs" aria-hidden="true">{t('vs')}</span>
      <Side x={b} onChange={() => setPick('b')} />
    </div>
    <div className="cmp-rows">
      {ROWS.map(([label, f, unit, better, fmt]) => {
        if (a[f] == null && b[f] == null) return null
        const w = winner(a, b, f, better)
        const max = Math.max(+a[f] || 0, +b[f] || 0, 1e-9)
        return <div key={f} className="cmp-row">
          <span className={'cmp-v' + (w === 'a' ? ' win' : '')}>{a[f] == null ? '—' : fmt(a[f])}<i style={{ width: ((+a[f] || 0) / max * 100) + '%' }} /></span>
          <span className="cmp-l">{t(label)}<small>{U(unit)}</small></span>
          <span className={'cmp-v b' + (w === 'b' ? ' win' : '')}>{b[f] == null ? '—' : fmt(b[f])}<i style={{ width: ((+b[f] || 0) / max * 100) + '%' }} /></span>
        </div>
      })}
    </div>
    <div className="cmp-sum">
      <Icon name="trophy" />
      <span>{score.a === score.b ? t('About even — it depends on what you need.')
        : t('{0} wins on {1} of the checks.', itemName(score.a > score.b ? a : b), n0(Math.max(score.a, score.b)))}</span>
    </div>
    <p className="small muted">{t('Per usual serving of each — the sizes differ, so look at the serving too.')}</p>
  </div>
}
export const compareSheet = (a = null, b = null) => useUI.getState().openSheet(() => <Compare a={a} b={b} />)
