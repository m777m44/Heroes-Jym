// 14.0 — /kitchen/dish: "My cooking" — make a dish of your own: your photo (camera or gallery),
// its name, the ingredients by weight (the calories and macros per serving work themselves out
// while you type), how many servings it makes, how long it takes, the steps and a note.
// /kitchen/dish?id=… edits one. Saved as your own food (S.customFoods, with `items`), so it is in
// the food log's search, in My foods and under Kitchen → My cooking; the photo stays on this
// device (lib/dishPhotos.js).
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { nav } from '../lib/nav.js'
import { MEALS } from '../lib/food.js'
import { ING_BY_ID, itemsTotals, saveBuiltMeal } from '../lib/kitchen.js'
import { photoKey } from '../lib/photos/index.js'
import { shrinkImage } from '../lib/photoStore.js'
import { useDishPhoto, saveDishPhoto, deleteDishPhoto } from '../lib/dishPhotos.js'
import { Photo } from '../components/FoodPhoto.jsx'
import Icon from '../components/Icon.jsx'
import { BackButton, Button, Segmented } from '../components/ui.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
const toast = m => useUI.getState().toast(m)

export default function DishEditor() {
  const loc = useLocation()
  const id0 = new URLSearchParams(loc.search || '').get('id')
  const St = useStore(s => s.S)
  const update = useStore(s => s.update)
  const old = id0 ? (St.customFoods || []).find(f => f.id === id0 && Array.isArray(f.items)) : null
  const [name, setName] = useState(() => (old ? old.n : ''))
  const [items, setItems] = useState(() => (old ? old.items.map(i => ({ ...i })) : []))
  const [sv, setSv] = useState(() => (old ? old.servings || 1 : 2))
  const [min, setMin] = useState(() => (old && old.min ? String(old.min) : ''))
  const [meal, setMeal] = useState(() => (old && old.meal) || 'l')
  const [steps, setSteps] = useState(() => (old && old.steps && old.steps.length ? [...old.steps] : ['']))
  const [note, setNote] = useState(() => (old ? old.note || '' : ''))
  const [photo, setPhoto] = useState(null)            // a new photo: { blob, url }
  const [dropPhoto, setDropPhoto] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const oldUrl = useDishPhoto(old && old.id, !!(old && old.ph) && !dropPhoto)
  const cam = useRef(null), gal = useRef(null)
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url) }, [photo])
  const tot = itemsTotals(items)
  const per = { kcal: tot.kcal / sv, p: tot.p / sv, c: tot.c / sv, f: tot.f / sv }
  const shown = photo ? photo.url : oldUrl

  const onFile = async e => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    const blob = await shrinkImage(file)
    setPhoto({ blob, url: URL.createObjectURL(blob) })
    setDropPhoto(false)
  }
  const add = id => setItems(list => (list.some(i => i.id === id) ? list : [...list, { id, g: ING_BY_ID[id].unit === 'g' ? 100 : ING_BY_ID[id].g }]))
  const setG = (id, g) => setItems(list => list.map(i => (i.id === id ? { ...i, g: Math.max(0, Math.min(5000, Math.round(g))) } : i)))
  const pick = () => import('./Kitchen.jsx').then(m => m.ingPickSheet(add))
  const setStep = (i, v) => setSteps(l => l.map((x, j) => (j === i ? v : x)))
  const moveStep = (i, d) => setSteps(l => { const a = [...l]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a })

  const save = async () => {
    if (busy) return
    setErr('')
    let food = null
    try {
      update(s => { food = saveBuiltMeal(s, { id: old ? old.id : undefined, n: name, items, servings: sv, meal, steps, min: +min || 0, note, ph: !!(photo || (old && old.ph && !dropPhoto)) }) })
    } catch (e) { setErr(t(e.key || e.message)); return }
    setBusy(true)
    try {
      if (photo) await saveDishPhoto(food.id, photo.blob)
      else if (dropPhoto && old) await deleteDishPhoto(old.id)
    } catch { toast(t('The photo could not be saved on this device.')) }
    setBusy(false)
    toast(t('Saved “{0}” to My cooking', food.n))
    nav('/kitchen/s/mine')
  }

  return <div className="narrow de">
    <div className="hdr">
      <BackButton fallback="/kitchen/s/mine" />
      <div className="grow" style={{ marginInlineStart: 10 }}><h1>{old ? t('Edit my dish') : t('New dish')}</h1>
        <div className="sub">{t('My cooking — the calories work themselves out from the ingredients')}</div></div>
    </div>

    <div className={'de-photo' + (shown ? ' has' : '')}>
      {shown ? <img src={shown} alt="" /> : <span className="de-photo-empty"><Icon name="camera" /><b>{t('Your photo of the dish')}</b><small>{t('Take one or choose one from the gallery')}</small></span>}
      <div className="de-photo-b">
        <button type="button" className="chip nocap" onClick={() => cam.current && cam.current.click()}><Icon name="camera" />{t('Take a photo')}</button>
        <button type="button" className="chip nocap" onClick={() => gal.current && gal.current.click()}><Icon name="image" />{t('From the gallery')}</button>
        {shown && <button type="button" className="chip nocap" onClick={() => { setPhoto(null); setDropPhoto(true) }}><Icon name="trash" />{t('Remove')}</button>}
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={onFile} />
    </div>

    <div className="card de-card">
      <input className="input de-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder={t('Name of the dish — e.g. My mother’s dolma')} aria-label={t('Name of the dish')} dir="auto" />
      <div className="lbl2">{t('Meal')}</div>
      <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
      <div className="de-row">
        <div className="kit-sv">
          <span>{t('Makes servings')}</span>
          <div className="kit-svc">
            <button className="iconbtn" aria-label={t('Less')} onClick={() => setSv(v => Math.max(1, v - 1))}><Icon name="minus" /></button>
            <b>{n0(sv)}</b>
            <button className="iconbtn" aria-label={t('More')} onClick={() => setSv(v => Math.min(12, v + 1))}><Icon name="plus" /></button>
          </div>
        </div>
        <label className="de-min"><Icon name="timer" /><input className="input" inputMode="numeric" value={min} onChange={e => setMin(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="30" aria-label={t('Minutes')} /><span>{U('min')}</span></label>
      </div>
    </div>

    <div className="card de-card de-live" aria-live="polite">
      <div className="de-kcal"><b>{n0(per.kcal)}</b><span>{t('kcal / serving')}</span></div>
      <div className="de-mac"><i style={{ '--c': 'var(--red)' }}>{t('Protein')} <b>{n1(per.p)} {U('g')}</b></i><i style={{ '--c': 'var(--yellow)' }}>{t('Carbs')} <b>{n1(per.c)} {U('g')}</b></i><i style={{ '--c': 'var(--blue)' }}>{t('Fat')} <b>{n1(per.f)} {U('g')}</b></i></div>
      <div className="small muted">{t('Total {0} kcal', n0(tot.kcal))} · {t('{0} ingredients', n0(items.length))}</div>
    </div>

    <div className="card de-card">
      <div className="lbl2">{t('Ingredients (the whole dish)')}</div>
      {items.length > 0 && <div className="list kit-items">
        {items.map(i => {
          const x = ING_BY_ID[i.id], step = x.unit === 'g' ? 25 : x.g
          return <div key={i.id} className="item kit-item">
            <Photo k={photoKey('I', i.id)} size="t" alt="" className="md-ing-ph" fallback={<span className="md-ing-ph kr-none"><Icon name="leafy" /></span>} />
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
    </div>

    <div className="card de-card">
      <div className="lbl2">{t('How to make it')}</div>
      <ol className="de-steps">
        {steps.map((s, i) => <li key={i}>
          <span className="de-step-n">{(i + 1).toLocaleString(dateLocale())}</span>
          <textarea className="input" rows={2} value={s} maxLength={300} onChange={e => setStep(i, e.target.value)} dir="auto"
            placeholder={i === 0 ? t('e.g. Fry the onion until golden — 5 minutes') : t('Next step')} aria-label={t('Step {0}', i + 1)} />
          <span className="de-step-b">
            <button className="iconbtn sm" aria-label={t('Up')} disabled={i === 0} onClick={() => moveStep(i, -1)}><Icon name="chevronUp" /></button>
            <button className="iconbtn sm" aria-label={t('Remove')} onClick={() => setSteps(l => (l.length > 1 ? l.filter((_, j) => j !== i) : ['']))}><Icon name="xmark" /></button>
          </span>
        </li>)}
      </ol>
      {steps.length < 30 && <Button variant="tinted" icon="plus" onClick={() => setSteps(l => [...l, ''])}>{t('Add a step')}</Button>}
      <div className="small muted de-hint">{t('A step that says how long (“10 minutes”) gets its own timer.')}</div>
    </div>

    <div className="card de-card">
      <div className="lbl2">{t('Note')}</div>
      <textarea className="input" rows={3} value={note} maxLength={500} onChange={e => setNote(e.target.value)} dir="auto" placeholder={t('A tip, where the recipe is from…')} aria-label={t('Note')} />
    </div>

    {err && <div className="calc-err small">{err}</div>}
    <div className="de-save">
      <Button variant="primary" icon="check" loading={busy} onClick={save}>{old ? t('Save changes') : t('Save to My cooking')}</Button>
    </div>
  </div>
}
