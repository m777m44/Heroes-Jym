// 10.0 — /nuts: nuts & seeds. Pistachios, peanuts, almonds, walnuts, cashews and more, the seeds
// cracked at every Iraqi gathering, roasted chickpeas and kerzat. Choose raw, roasted or salted,
// weigh it with or without the shell, count it in handfuls, grams, pieces or spoons — calories,
// protein, good fats, fibre, what it is rich in and why it is good for you.
// 11.0 — dried fruits and dates (weighed with or without the stone) and the sweet ones join in;
// nuts and seeds show per handful, dried fruit and sweets per their usual portion.
//   nutSheet(id)            the nut: form, portion, numbers, log it
//   pickNutSheet(onPick)    choose nuts and a portion (the day plan)
// Data and maths: lib/nuts.js · art: components/NutArt.jsx.
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { MEALS, mealAt, addEntry, dayEntries, foodGoalOf } from '../lib/food.js'
import {
  NUT_CATS, NUT_CAT_BY_KEY, FORMS, UNITS, HANDFUL_G, MICRO, BENEFIT, NUT_CAUTION,
  nutOf, unitsFor, edibleGrams, amountFor, nutNutrition, nutEntry, searchNuts, nutDay, nutOfDay, NUTTY, usualGrams,
} from '../lib/nuts.js'
import { burst, lastTap } from '../lib/motion.js'
import NutArt from '../components/NutArt.jsx'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import Icon from '../components/Icon.jsx'
import { PhotoHero } from '../components/kitchen/PhotoHero.jsx'
import { photoKey } from '../lib/photos/index.js'
import { BackButton, Button, Segmented, SearchField, Switch } from '../components/ui.jsx'

const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
export const nutName = n => (n ? t(n.name) : '')
const STEP = { handful: 0.5, g: 5, piece: 1, tbsp: 0.5 }
const MAXA = { handful: 6, g: 300, piece: 60, tbsp: 8 }
const QUICK = { handful: [0.5, 1, 2], g: [10, 30, 50, 100], piece: [1, 5, 10, 20], tbsp: [1, 2, 3] }
const amountText = (a, u) => (u === 'g' ? n0(a) + ' ' + U('g')
  : u === 'handful' ? (a === 1 ? t('1 handful') : t('{0} handfuls', n1(a)))
    : u === 'piece' ? (a === 1 ? t('1 piece') : t('{0} pieces', n0(a)))
      : (a === 1 ? t('1 spoon') : t('{0} spoons', n1(a))))
/** "per handful" for nuts and seeds, the usual amount ("3 pieces") for dried fruit and sweets. */
const usualText = n => (NUTTY.has(n.cat) ? t('per handful') : amountText(n.unit.a, n.unit.u))
const usualKcal = (n, form) => nutNutrition(n, usualGrams(n), form).kcal

/** Portion state shared by the sheet and the picker. */
function usePortion(n) {
  const [u, setU] = useState(() => (n ? n.unit.u : 'handful'))
  const [a, setA] = useState(() => (n ? n.unit.a : 1))
  const [form, setForm] = useState(() => (n ? n.def : 'roasted'))
  const [shell, setShell] = useState(false)
  const g = edibleGrams(n, a, u, shell)
  const setUnit = x => {
    if (x === u) return
    // the same edible grams in the new unit — in the shell a handful holds less nut (review on PR #13)
    const raw = amountFor(n, edibleGrams(n, a, u, shell), x, shell)
    const conv = x === 'g' ? Math.max(5, Math.round(raw / 5) * 5) : x === 'piece' ? Math.max(1, Math.round(raw)) : Math.max(0.5, Math.round(raw * 2) / 2)
    setU(x); setA(Math.min(MAXA[x], conv))
  }
  return { u, a, setA, setUnit, form, setForm, shell, setShell, g }
}

function PortionPicker({ n, P }) {
  const units = unitsFor(n)
  return <>
    {n.forms.length > 1 && <div className="nt-forms" role="radiogroup" aria-label={t('How it is prepared')}>
      {n.forms.map(f => <button key={f} role="radio" aria-checked={P.form === f} className={'nt-form' + (P.form === f ? ' on' : '')} onClick={() => P.setForm(f)}>
        <NutArt nut={n} form={f} size={30} drawn /><span>{t(FORMS[f])}</span></button>)}
    </div>}
    <Segmented options={units.map(x => ({ value: x, label: t(UNITS[x]) }))} value={P.u} onChange={P.setUnit} />
    <div className="kit-sv nt-amt">
      <span>{t('Amount')}</span>
      <div className="kit-svc">
        <button className="iconbtn" aria-label={t('Less')} onClick={() => P.setA(v => Math.max(STEP[P.u], Math.round((v - STEP[P.u]) * 10) / 10))}><Icon name="minus" /></button>
        <b>{P.u === 'g' ? n0(P.a) : n1(P.a)}</b>
        <button className="iconbtn" aria-label={t('More')} onClick={() => P.setA(v => Math.min(MAXA[P.u], Math.round((v + STEP[P.u]) * 10) / 10))}><Icon name="plus" /></button>
      </div>
      <b className="kit-svk">{n0(P.g)} {U('g')}</b>
    </div>
    <div className="nt-quick scroll">
      {QUICK[P.u].map(v => <button key={v} className={'chip nocap' + (P.a === v ? ' on' : '')} onClick={() => P.setA(v)}>{amountText(v, P.u)}</button>)}
    </div>
    {n.shell && (P.u === 'g' || P.u === 'handful') && <label className="dk-wtoggle nt-shell"><NutArt nut={n} shell size={26} drawn />
      <span className="grow">{n.cat === 'dried' ? t('Weighed with the stone') : t('Weighed in the shell')}<small className="muted">{P.shell ? t('Edible part: {0} g', n0(P.g)) : n.cat === 'dried' ? t('About {0}% of the weight is the fruit itself', n0(n.ef * 100)) : t('About {0}% of the weight is the nut itself', n0(n.ef * 100))}</small></span>
      <Switch checked={P.shell} onChange={P.setShell} /></label>}
  </>
}

function Macro({ label, g, max, color }) {
  return <div className="nt-mac" style={{ '--c': color }}>
    <span>{label}</span><i><em style={{ width: Math.min(100, (g / Math.max(1, max)) * 100) + '%' }} /></i><b>{n1(g)} {U('g')}</b>
  </div>
}

// ---- the nut sheet ----------------------------------------------------------------------------------------
function NutView({ id, iso: iso0, meal: meal0, close }) {
  const St = useStore(s => s.S)
  const n = nutOf(id)
  const P = usePortion(n)
  const [meal, setMeal] = useState(() => meal0 || mealAt())
  if (!n) return <div className="empty">{t('Nothing found')}</div>
  const x = nutNutrition(n, P.g, P.form)
  const goal = foodGoalOf(St, todayISO()).kcal
  const cat = NUT_CAT_BY_KEY[n.cat]
  const eKcal = Math.max(1, x.p * 4 + x.f * 9 + x.c * 4)
  const cau = n.cau.filter(k => k !== 'salt' || P.form === 'salted' || P.form === 'boiled')
  const log = () => {
    const e = nutEntry(n, { g: P.g, form: P.form, meal })
    useStore.getState().update(s => { addEntry(s, iso0 || todayISO(), e) })
    burst(lastTap(), { count: 14, spread: 70, colors: [n.col, '#ffffff', '#FFD60A'] })
    close()
    toast(t('Added {0} · {1} kcal', nutName(n), n0(x.kcal)))
  }
  const ph = photoKey('N', n.id)
  return <div className="nt-view" style={{ '--c': n.col }}>
    <PhotoHero k={ph} alt={nutName(n)} />
    <div className={'nt-hero' + (ph ? ' with-ph' : '')}>
      <div className="nt-hero-bg" aria-hidden="true" />
      {!ph && <NutArt nut={n} form={P.form} shell={P.shell} pile size={124} live label={nutName(n)} />}
      <div className="nt-hero-t">
        <h2>{nutName(n)}</h2>
        <div className="sd-tags">
          <span className="sd-tag"><Icon name={cat.icon} />{t(cat.name)}</span>
          <span className="sd-tag"><Icon name="flame" />{n0(usualKcal(n, P.form))} {U('kcal')} · {usualText(n)}</span>
        </div>
        <div className="sd-hero-k"><b><AnimatedNumber value={x.kcal} /></b><span>{U('kcal')}</span></div>
        <div className="small">{amountText(P.a, P.u)} · {n0(P.g)} {U('g')}</div>
      </div>
    </div>

    <PortionPicker n={n} P={P} />

    <div className="nt-split" aria-hidden="true">
      <i style={{ '--c': 'var(--red)', flex: x.p * 4 / eKcal }} /><i style={{ '--c': 'var(--blue)', flex: x.f * 9 / eKcal }} /><i style={{ '--c': 'var(--yellow)', flex: x.c * 4 / eKcal }} />
    </div>
    <div className="nt-macs">
      <Macro label={t('Protein')} g={x.p} max={Math.max(x.p, x.f, x.c, 1)} color="var(--red)" />
      <Macro label={t('Fat')} g={x.f} max={Math.max(x.p, x.f, x.c, 1)} color="var(--blue)" />
      <Macro label={t('Carbs')} g={x.c} max={Math.max(x.p, x.f, x.c, 1)} color="var(--yellow)" />
      <Macro label={t('Fibre')} g={x.fib} max={Math.max(x.p, x.f, x.c, 1)} color="var(--green)" />
    </div>
    <div className="sd-mini">
      <span><Icon name="flame" />{t('{0}% of your day', n0(x.kcal / Math.max(1, goal) * 100))}</span>
      <span><Icon name="drop" />{t('Sodium')} <b>{n0(x.na)} {U('mg')}</b></span>
      <span><Icon name="sparkles" />{t('Sugar')} <b>{n1(x.sug)} {U('g')}</b></span>
    </div>

    <div className="sd-sec-t">{t('Rich in')}</div>
    <div className="nt-micro">{n.mi.map((k, i) => <span key={k} style={{ '--i': i }}>{t(MICRO[k])}</span>)}</div>
    <div className="sd-sec-t">{t('Why it’s good for you')}</div>
    <div className="nt-bens">{n.ben.map((k, i) => <div key={k} className="nt-ben" style={{ '--i': i }}><span><Icon name={BENEFIT[k].icon} /></span>{t(BENEFIT[k].text)}</div>)}</div>
    {cau.map(k => <div key={k} className="dk-caution"><Icon name="alert" /><span>{t(NUT_CAUTION[k])}</span></div>)}

    <div className="dk-log card">
      <div className="lbl2">{t('Add to today’s log')}</div>
      <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
      <Button variant="primary" icon="plus" onClick={log}>{t('Add {0} kcal', n0(x.kcal))}</Button>
    </div>
  </div>
}
/** The nut's sheet. opts: { iso, meal } to log to another day / meal. */
export const nutSheet = (id, opts = {}) => ui().openSheet(close => <NutView id={id} iso={opts.iso} meal={opts.meal} close={close} />)

// ---- choose nuts (day plan) -------------------------------------------------------------------------------
function PickPortion({ n, onPick, back, close }) {
  const P = usePortion(n)
  const x = nutNutrition(n, P.g, P.form)
  return <div className="dk-pick nt-pick2">
    <div className="sd-pick-h">
      <button className="iconbtn" aria-label={t('Back')} onClick={back}><Icon name="chevronLeft" /></button>
      <NutArt nut={n} form={P.form} shell={P.shell} size={46} live />
      <div className="grow"><h3>{nutName(n)}</h3><div className="small muted">{n0(x.kcal)} {U('kcal')} · {n1(x.p)} {U('g')} {t('Protein')}</div></div>
    </div>
    <PortionPicker n={n} P={P} />
    <Button variant="primary" icon="plus" onClick={() => { onPick({ n, fm: P.form, g: P.g }); close() }}>{t('Add')}</Button>
  </div>
}
function Pick({ onPick, close }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  if (sel) return <PickPortion n={sel} onPick={onPick} back={() => setSel(null)} close={close} />
  const list = searchNuts({ q, tr: t })
  return <div className="dk-pick">
    <h3>{t('Choose nuts or seeds')}</h3>
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search nuts and seeds')} />
    <div className="list dk-pick-l">
      {list.map(n => <button key={n.id} className="item dk-pick-i" onClick={() => setSel(n)}>
        <NutArt nut={n} shell={n.look} size={30} />
        <div className="grow"><div className="tt">{nutName(n)}</div><div className="ss">{n0(usualKcal(n))} {U('kcal')} · {usualText(n)}</div></div>
        <Icon name="chevronRight" className="chev" />
      </button>)}
    </div>
  </div>
}
export const pickNutSheet = onPick => ui().openSheet(close => <Pick onPick={onPick} close={close} />)

// ---- the screen --------------------------------------------------------------------------------------------
function NutCard({ n, i }) {
  const x = nutNutrition(n, usualGrams(n))
  return <button className="nt-card" style={{ '--c': n.col, '--i': Math.min(i, 14) }} onClick={() => nutSheet(n.id)}>
    <span className="nt-card-art"><NutArt nut={n} shell={n.look} size={50} /></span>
    <b className="nt-card-n">{nutName(n)}</b>
    <span className="sd-card-k"><b>{n0(x.kcal)}</b> {U('kcal')}</span>
    <span className="sd-card-m">{usualText(n)} · <Icon name="arm" />{n1(x.p)} {U('g')}</span>
  </button>
}

export default function Nuts() {
  const St = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(null)
  const [hp, setHp] = useState(false)
  const iso = todayISO()
  const list = useMemo(() => searchNuts({ q, cat: q ? null : cat, tr: t }).filter(n => !hp || (n.roasted || n.raw)[1] >= 18), [q, cat, hp])
  const day = useMemo(() => nutDay(dayEntries(St, iso)), [St, iso])
  const dod = nutOfDay(iso)
  const pct = Math.min(1, day.g / HANDFUL_G)
  const R = 26, C = 2 * Math.PI * R
  return <div className="narrow nt-page">
    <div className="hdr">
      <BackButton fallback="/kitchen/s/nuts" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Nuts & seeds')}</h1><div className="sub">{t('Nuts, seeds, dried fruits and dates — with their Iraqi names')}</div></div>
    </div>

    {!q && !cat && <div className="card nt-top" style={{ '--c': dod.col }}>
      <span className="sd-top-bg" aria-hidden="true" />
      <button className="nt-top-art" onClick={() => nutSheet(dod.id)} aria-label={nutName(dod)}><NutArt nut={dod} pile size={104} live /></button>
      <div className="nt-top-t">
        <span className="lbl2">{t('Nut of the day')}</span>
        <b className="nt-top-n">{nutName(dod)}</b>
        <span className="small">{t('{0} kcal per handful', n0(usualKcal(dod)))} · {t(BENEFIT[dod.ben[0]].text)}</span>
        <div className="nt-today">
          <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r={R} className="nt-ring-bg" /><circle cx="32" cy="32" r={R} className="nt-ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} /></svg>
          <div><b>{n0(day.g)} / {n0(HANDFUL_G)} {U('g')}</b><span className="small">{t('Today · {0} kcal', n0(day.kcal))}</span><span className="small muted">{t('A handful a day is a healthy portion.')}</span></div>
        </div>
      </div>
    </div>}

    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search nuts and seeds')} />
    <div className="dk-chips scroll" role="tablist">
      <button role="tab" aria-selected={!cat} className={'chip nocap' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>{t('All')}</button>
      {NUT_CATS.map(k => <button key={k.key} role="tab" aria-selected={cat === k.key} className={'chip nocap dk-chip' + (cat === k.key ? ' on' : '')} style={{ '--cc': k.color }} onClick={() => setCat(k.key)}><Icon name={k.icon} />{t(k.name)}</button>)}
      <button className={'chip nocap' + (hp ? ' on' : '')} aria-pressed={hp} onClick={() => setHp(v => !v)}><Icon name="arm" />{t('High protein')}</button>
    </div>
    <div className="nt-grid" key={(cat || 'all') + (hp ? 'p' : '')}>
      {list.map((n, i) => <NutCard key={n.id} n={n} i={i} />)}
    </div>
    {!list.length && <div className="empty small"><div className="ico"><Icon name="nut" /></div>{t('Nothing found')}</div>}
    <p className="small muted dk-foot">{t('Values per 100 g of the edible part, rounded. Roasting removes water, so roasted nuts have a few more calories per gram.')}</p>
  </div>
}

