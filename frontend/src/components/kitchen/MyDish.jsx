// 14.0 — one of your own dishes ("My cooking"): your photo, the calories and macros per serving
// worked out from the ingredients, the ingredients, your steps (with a timer on any step that
// says how long) and your note — log it, edit it, share the recipe or delete it.
import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { useUI } from '../../store/useUI.js'
import { t, U, dateLocale } from '../../lib/i18n.js'
import { todayISO } from '../../lib/format.js'
import { nav } from '../../lib/nav.js'
import { MEALS, mealAt, addEntry, makeEntry, deleteCustomFood } from '../../lib/food.js'
import { ING_BY_ID } from '../../lib/kitchen.js'
import { stepMinutes } from '../../lib/recipeText.js'
import { photoKey } from '../../lib/photos/index.js'
import { useDishPhoto, deleteDishPhoto } from '../../lib/dishPhotos.js'
import { shareText } from '../../lib/mobile.js'
import { burst, lastTap } from '../../lib/motion.js'
import { confirmSheet } from '../../sheets.jsx'
import { Photo } from '../FoodPhoto.jsx'
import Icon from '../Icon.jsx'
import { Button, Segmented } from '../ui.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
const toast = m => useUI.getState().toast(m)
const ingName = id => t((ING_BY_ID[id] || {}).name || id)
const mealName = k => t((MEALS.find(m => m.key === k) || MEALS[3]).name)

/** A dish as plain text, to share: name, servings, calories, ingredients, steps, note. */
export function dishText(f) {
  const lines = [f.n, t('{0} servings', n0(f.servings || 1)) + ' · ' + t('{0} kcal / serving', n0(f.kcal)) + (f.min ? ' · ' + t('{0} min', n0(f.min)) : ''), '', t('Ingredients') + ':']
  for (const i of f.items || []) lines.push('• ' + ingName(i.id) + ' — ' + n0(i.g) + ' ' + U('g'))
  if ((f.steps || []).length) { lines.push('', t('How to make it') + ':'); f.steps.forEach((s, i) => lines.push((i + 1).toLocaleString(dateLocale()) + '. ' + s)) }
  if (f.note) lines.push('', f.note)
  lines.push('', '— MAHDI-JYM')
  return lines.join('\n')
}

function MyDishView({ id, close }) {
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const f = (St.customFoods || []).find(x => x.id === id)
  const url = useDishPhoto(id, !!(f && f.ph))
  const [sv, setSv] = useState(1)
  const [meal, setMeal] = useState(() => (f && f.meal) || mealAt())
  if (!f) return <div className="empty">{t('This dish no longer exists.')}</div>
  const log = () => {
    burst(lastTap(), { count: 12, spread: 60, colors: ['#FF9F0A', '#FFD60A', '#30D158', '#FFFFFF'] })
    const e = makeEntry({ id: f.id, n: f.n, kcal: f.kcal, p: f.p, c: f.c, f: f.f, custom: true }, { q: sv, m: meal })
    update(s => { addEntry(s, todayISO(), e) })
    close()
    toast(t('Added {0} · {1} kcal', f.n, n0(f.kcal * sv)))
  }
  const del = () => confirmSheet({
    title: t('Delete this dish?'), message: f.n, confirmText: t('Delete'), danger: true,
    onConfirm: () => { update(s => { deleteCustomFood(s, f.id) }); deleteDishPhoto(f.id); close() },
  })
  const share = async () => { const r = await shareText(dishText(f), f.n); if (r === 'copied') toast(t('Copied')) }
  const e = Math.max(1, f.p * 4 + f.c * 4 + f.f * 9)
  return <div className="md">
    {url ? <div className="ph-hero md-own"><img src={url} alt="" /><span className="ph-hero-shade" aria-hidden="true" /></div>
      : <div className="md-noph"><Icon name="camera" /><span>{t('No photo yet — edit the dish to add one.')}</span></div>}
    <h3 dir="auto" className="md-n">{f.n}</h3>
    <div className="small muted">{t('{0} servings', n0(f.servings || 1))}{f.min ? ' · ' + t('{0} min', n0(f.min)) : ''}{f.meal ? ' · ' + mealName(f.meal) : ''}</div>
    <div className="md-k">
      <div className="md-kcal"><b>{n0(f.kcal)}</b><span>{t('kcal / serving')}</span></div>
      {[['Protein', f.p, 'var(--red)', 4], ['Carbs', f.c, 'var(--yellow)', 4], ['Fat', f.f, 'var(--blue)', 9]].map(([k, g, c, kc]) => (
        <div key={k} className="md-mac" style={{ '--c': c }}><span>{t(k)}</span><b>{n1(g)} {U('g')}</b><i><em style={{ width: Math.min(100, g * kc / e * 100) + '%' }} /></i></div>))}
    </div>
    <div className="lbl2">{t('Ingredients (the whole dish)')}</div>
    <div className="list md-ings">
      {(f.items || []).map(i => {
        const x = ING_BY_ID[i.id]
        return <div key={i.id} className="item">
          <Photo k={photoKey('I', i.id)} size="t" alt="" className="md-ing-ph" fallback={<span className="md-ing-ph kr-none"><Icon name="leafy" /></span>} />
          <div className="grow"><div className="tt">{ingName(i.id)}</div><div className="ss">{n0(i.g)} {U('g')}{x ? ' · ' + n0(x.kcal * i.g / 100) + ' ' + U('kcal') : ''}</div></div>
        </div>
      })}
    </div>
    {(f.steps || []).length > 0 && <>
      <div className="lbl2">{t('How to make it')}</div>
      <ol className="kit-steps">{f.steps.map((s, i) => {
        const m = stepMinutes(s)
        return <li key={i} style={{ '--i': i }} dir="auto">{s}
          {m > 0 && <button type="button" className="kit-step-timer" onClick={() => import('./CookTimer.jsx').then(c => c.startCookTimer(m * 60, f.n))}>
            <Icon name="timer" />{t('Start a {0} timer', t('{0} min', n0(m)))}</button>}
        </li>
      })}</ol>
    </>}
    {f.note && <div className="kit-tip"><Icon name="pencil" /><span dir="auto">{f.note}</span></div>}
    <div className="lbl2" style={{ marginTop: 14 }}>{t('Add to today’s log')}</div>
    <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
    <div className="kit-sv">
      <span>{t('Servings eaten')}</span>
      <div className="kit-svc">
        <button className="iconbtn" aria-label={t('Less')} onClick={() => setSv(v => Math.max(0.5, v - 0.5))}><Icon name="minus" /></button>
        <b>{n1(sv)}</b>
        <button className="iconbtn" aria-label={t('More')} onClick={() => setSv(v => Math.min(8, v + 0.5))}><Icon name="plus" /></button>
      </div>
      <b className="kit-svk">{n0(f.kcal * sv)} {U('kcal')}</b>
    </div>
    <Button variant="primary" icon="check" onClick={log}>{t('Add to {0}', mealName(meal))}</Button>
    <div className="md-acts">
      <Button variant="tinted" icon="pencil" onClick={() => { close(); nav('/kitchen/dish?id=' + encodeURIComponent(f.id)) }}>{t('Edit')}</Button>
      <Button variant="tinted" icon="upload" onClick={share}>{t('Share')}</Button>
      <Button variant="tinted" icon="trash" className="danger" onClick={del}>{t('Delete')}</Button>
    </div>
  </div>
}
export const myDishSheet = id => useUI.getState().openSheet(close => <MyDishView id={id} close={close} />)
