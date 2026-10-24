// 10.0 — /sodas: soft drinks. Colas, lemon-lime, fruit sodas, soda and sparkling water, 0.0 % malt
// drinks, energy drinks and homemade sodas, each drawn in its pack. Pick the pack (can, plastic
// bottle, glass bottle, glass, restaurant cup) and the size: calories, sugar in teaspoons against
// the WHO daily limit, caffeine, the walk that burns it and what the sugar-free twin saves.
//   sodaSheet(id, { pk, ml })   the drink: packs, sizes, numbers, log it
//   pickSodaSheet(onPick)       choose a soft drink and its size (the day plan)
// The data and maths live in lib/sodas.js; the art in components/SodaArt.jsx.
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { MEALS, mealAt, addEntry, dayEntries } from '../lib/food.js'
import { bodyKg } from '../lib/water.js'
import {
  SODAS, SODA_CATS, SODA_CAT_BY_KEY, PACKS, CUP_LABEL, SHARE_ML, SODA_NOTE, SUGAR_MAX_G, SUGAR_IDEAL_G, CAFFEINE_MAX_MG,
  sodaOf, packFor, sodaNutrition, sodaEntry, searchSodas, sodaDay, recentSodas, swapSaving, walkMinutes, countsAsWater,
} from '../lib/sodas.js'
import { logWater } from '../components/water/WaterParts.jsx'
import { burst, lastTap } from '../lib/motion.js'
import SodaArt from '../components/SodaArt.jsx'
import AnimatedNumber from '../components/AnimatedNumber.jsx'
import Icon from '../components/Icon.jsx'
import { BackButton, Button, Segmented, SearchField, Switch } from '../components/ui.jsx'

const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const n1 = v => (Math.round((+v || 0) * 10) / 10).toLocaleString(dateLocale())
/** "330 ml", "1.5 L", or "Medium size" for a restaurant cup. */
export const sizeText = (ml, pk) => (pk === 'cup' && CUP_LABEL[ml] ? t(CUP_LABEL[ml]) : ml >= 1000 ? (ml / 1000).toLocaleString(dateLocale()) + ' ' + U('L') : n0(ml) + ' ' + U('ml'))
export const packText = (pk, ml) => t(PACKS[pk].name) + ' · ' + sizeText(ml, pk)
export const sodaName = s => (s ? t(s.name) : '')

function Cubes({ tsp }) {
  const n = Math.round(tsp)
  const show = Math.min(n, 24)
  return <div className="sd-cubes" aria-hidden="true">
    {Array.from({ length: show }, (_, i) => <i key={i} style={{ '--i': i }} />)}
    {n > show && <span className="sd-cubes-more">+{n0(n - show)}</span>}
  </div>
}

function Bar({ value, max, ideal, color, label }) {
  const pct = Math.min(100, (value / max) * 100)
  return <div className="sd-bar" style={{ '--c': color }}>
    <div className="sd-bar-t"><span>{label}</span><b>{n0((value / max) * 100)}%</b></div>
    <div className="sd-bar-r"><i style={{ width: pct + '%' }} />{ideal ? <em style={{ insetInlineStart: (ideal / max) * 100 + '%' }} /> : null}</div>
  </div>
}

// ---- the drink sheet -------------------------------------------------------------------------------------
function SodaView({ id, pk: pk0, ml: ml0, iso: iso0, meal: meal0, close }) {
  const St = useStore(s => s.S)
  const s = sodaOf(id)
  const first = packFor(s, pk0, ml0)
  const [pk, setPk] = useState(first.pk)
  const [ml, setMl] = useState(first.ml)
  const [count, setCount] = useState(1)
  const [meal, setMeal] = useState(() => meal0 || mealAt())
  const [water, setWater] = useState(() => countsAsWater(s))
  if (!s) return <div className="empty">{t('Nothing found')}</div>
  const cat = SODA_CAT_BY_KEY[s.cat]
  const n = sodaNutrition(s, ml, count)
  const kg = bodyKg(St) || 70
  const walk = walkMinutes(n.kcal, kg)
  const swap = swapSaving(s, ml, count)
  const choosePack = p => { const x = packFor(s, p, p === s.def.pk ? s.def.ml : null); setPk(x.pk); setMl(x.ml) }
  const notes = [s.energy && 'e', s.zero && 'z', s.quinine && 'q', s.dairy && 'd'].filter(Boolean)
  const log = () => {
    const iso = iso0 || todayISO()
    const e = sodaEntry(s, { pk, ml, count, meal })
    useStore.getState().update(st => { addEntry(st, iso, e) })
    const wml = water && iso === todayISO() ? Math.round(n.ml * 0.9) : 0
    if (wml >= 50) logWater(wml)
    burst(lastTap(), { count: 16, spread: 80, colors: [s.br, s.br2, s.col, '#ffffff'] })
    close()
    toast(wml >= 50 ? t('Added {0} · {1} kcal · +{2} ml water', sodaName(s), n0(n.kcal), n0(wml)) : t('Added {0} · {1} kcal', sodaName(s), n0(n.kcal)))
  }
  return <div className="sd-view" style={{ '--b': s.br, '--b2': s.br2, '--c': s.col }}>
    <div className="sd-hero">
      <div className="sd-hero-bg" aria-hidden="true" />
      <div className="sd-hero-art"><SodaArt soda={s} pk={pk} ml={ml} size={112} live label={sodaName(s)} /></div>
      <div className="sd-hero-t">
        <h2>{sodaName(s)}</h2>
        <div className="sd-tags">
          <span className="sd-tag"><Icon name={cat.icon} />{t(cat.name)}</span>
          {s.zero && <span className="sd-tag good"><Icon name="check" />{t('Sugar-free')}</span>}
          {s.cf100 > 0 && <span className="sd-tag warn"><Icon name="bolt" />{t('Caffeine')}</span>}
        </div>
        <div className="sd-hero-k"><b><AnimatedNumber value={n.kcal} /></b><span>{U('kcal')}</span></div>
        <div className="small sd-hero-s">{packText(pk, ml)}{count !== 1 ? ' × ' + n1(count) : ''}</div>
      </div>
    </div>

    <div className="sd-sec-t">{t('Pack')}</div>
    <div className="sd-packs" role="radiogroup" aria-label={t('Pack')}>
      {s.packs.map(p => <button key={p} role="radio" aria-checked={pk === p} className={'sd-pack' + (pk === p ? ' on' : '')} onClick={() => choosePack(p)}>
        <SodaArt soda={s} pk={p} ml={p === pk ? ml : packFor(s, p, p === s.def.pk ? s.def.ml : null).ml} size={30} />
        <span>{t(PACKS[p].name)}</span>
      </button>)}
    </div>
    <div className="sd-sec-t">{t('Size')}</div>
    <div className="sd-sizes scroll">
      {PACKS[pk].sizes.map(v => <button key={v} className={'chip nocap' + (ml === v ? ' on' : '')} aria-pressed={ml === v} onClick={() => setMl(v)}>
        {pk === 'cup' ? <>{t(CUP_LABEL[v])}<small className="sd-ml">{n0(v)} {U('ml')}</small></> : sizeText(v, pk)}
      </button>)}
    </div>
    <div className="kit-sv sd-count">
      <span>{t('How many')}</span>
      <div className="kit-svc">
        <button className="iconbtn" aria-label={t('Less')} onClick={() => setCount(v => Math.max(0.5, v - 0.5))}><Icon name="minus" /></button>
        <b>{n1(count)}</b>
        <button className="iconbtn" aria-label={t('More')} onClick={() => setCount(v => Math.min(10, v + 0.5))}><Icon name="plus" /></button>
      </div>
      <b className="kit-svk">{n0(n.ml)} {U('ml')}</b>
    </div>
    {ml >= SHARE_ML && s.packs.includes('glass') && <button className="sd-share" onClick={() => { setPk('glass'); setMl(250); setCount(1) }}>
      <Icon name="cup" /><span className="grow">{t('A big bottle is usually shared — log one glass instead.')}</span><b>{t('A glass')}</b>
    </button>}

    <div className="sd-stats">
      <div className="sd-stat" style={{ '--c': 'var(--pink)' }}>
        <span className="lbl2">{t('Sugar')}</span>
        <b>{n1(n.sugar)} <small>{U('g')}</small></b>
        <span className="small">{n.sugar > 0 ? t('{0} teaspoons', n1(n.tsp)) : t('No sugar')}</span>
      </div>
      <div className="sd-stat" style={{ '--c': 'var(--orange)' }}>
        <span className="lbl2">{t('Caffeine')}</span>
        <b>{n0(n.caffeine)} <small>{U('mg')}</small></b>
        <span className="small">{n.caffeine > 0 ? t('{0}% of a day', n0(n.caffeine / CAFFEINE_MAX_MG * 100)) : t('None')}</span>
      </div>
      <div className="sd-stat" style={{ '--c': 'var(--green)' }}>
        <span className="lbl2">{t('To burn it')}</span>
        <b>{n0(walk)} <small>{U('min')}</small></b>
        <span className="small">{t('of brisk walking')}</span>
      </div>
    </div>
    {n.tsp >= 0.5 && <Cubes tsp={n.tsp} />}
    <Bar value={n.sugar} max={SUGAR_MAX_G} ideal={SUGAR_IDEAL_G} color="var(--pink)" label={t('Of the daily sugar limit (WHO)')} />
    {n.caffeine > 0 && <Bar value={n.caffeine} max={CAFFEINE_MAX_MG} color="var(--orange)" label={t('Of the caffeine limit for a day')} />}
    <div className="sd-mini">
      <span><Icon name="drop" />{t('Sodium')} <b>{n0(n.sodium)} {U('mg')}</b></span>
      <span><Icon name="fork" />{t('Carbs')} <b>{n1(n.c)} {U('g')}</b></span>
      {n.p > 0 && <span><Icon name="arm" />{t('Protein')} <b>{n1(n.p)} {U('g')}</b></span>}
    </div>

    {swap && <button className="card sd-swap" style={{ '--b': swap.to.br, '--b2': swap.to.br2 }} onClick={() => { close(); setTimeout(() => sodaSheet(swap.to.id, { pk, ml }), 90) }}>
      <SodaArt soda={swap.to} pk={packFor(swap.to, pk, ml).pk} ml={packFor(swap.to, pk, ml).ml} size={36} />
      <span className="grow"><b>{t('Switch to {0}', sodaName(swap.to))}</b>
        <span className="small">{t('Save {0} kcal and {1} teaspoons of sugar', n0(swap.kcal), n1(swap.tsp))}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>}

    <div className="sd-notes">
      <div className="sd-noteline"><Icon name="info" /><span>{t(cat.desc)}</span></div>
      {notes.map(k => <div key={k} className={'sd-noteline' + (k === 'e' ? ' warn' : '')}><Icon name={k === 'e' ? 'alert' : 'sparkles'} /><span>{t(SODA_NOTE[k])}</span></div>)}
    </div>

    <div className="dk-log card">
      <div className="lbl2">{t('Add to today’s log')}</div>
      <Segmented options={MEALS.map(m => ({ value: m.key, label: t(m.name) }))} value={meal} onChange={setMeal} />
      <label className="dk-wtoggle"><Icon name="drop" /><span className="grow">{t('Count {0} ml towards water', n0(n.ml * 0.9))}</span><Switch checked={water} onChange={setWater} /></label>
      <Button variant="primary" icon="plus" onClick={log}>{t('Add {0} kcal', n0(n.kcal))}</Button>
    </div>
    <p className="small muted sd-foot">{t('Values are typical per 100 ml — recipes differ from country to country, so check the label. Brand names belong to their owners.')}</p>
  </div>
}
/** The drink's sheet. opts: { pk, ml } to start on a pack, { iso, meal } to log to another day / meal. */
export const sodaSheet = (id, opts = {}) => ui().openSheet(close => <SodaView id={id} pk={opts.pk} ml={opts.ml} iso={opts.iso} meal={opts.meal} close={close} />)

// ---- choose a soft drink (day plan) -----------------------------------------------------------------------
function Pick({ onPick, close }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(null)
  const [sel, setSel] = useState(null)
  const [pk, setPk] = useState('can')
  const [ml, setMl] = useState(330)
  const [count, setCount] = useState(1)
  if (sel) {
    const s = sel, n = sodaNutrition(s, ml, count)
    return <div className="dk-pick sd-pick2" style={{ '--b': s.br }}>
      <div className="sd-pick-h">
        <button className="iconbtn" aria-label={t('Back')} onClick={() => setSel(null)}><Icon name="chevronLeft" /></button>
        <SodaArt soda={s} pk={pk} ml={ml} size={46} live />
        <div className="grow"><h3>{sodaName(s)}</h3><div className="small muted">{n0(n.kcal)} {U('kcal')} · {t('{0} teaspoons', n1(n.tsp))}</div></div>
      </div>
      <div className="sd-packs">
        {s.packs.map(p => <button key={p} className={'sd-pack' + (pk === p ? ' on' : '')} onClick={() => { const x = packFor(s, p, null); setPk(x.pk); setMl(x.ml) }}>
          <SodaArt soda={s} pk={p} size={26} /><span>{t(PACKS[p].name)}</span></button>)}
      </div>
      <div className="sd-sizes scroll">
        {PACKS[pk].sizes.map(v => <button key={v} className={'chip nocap' + (ml === v ? ' on' : '')} onClick={() => setMl(v)}>{sizeText(v, pk)}</button>)}
      </div>
      <div className="kit-sv sd-count">
        <span>{t('How many')}</span>
        <div className="kit-svc">
          <button className="iconbtn" aria-label={t('Less')} onClick={() => setCount(v => Math.max(0.5, v - 0.5))}><Icon name="minus" /></button>
          <b>{n1(count)}</b>
          <button className="iconbtn" aria-label={t('More')} onClick={() => setCount(v => Math.min(10, v + 0.5))}><Icon name="plus" /></button>
        </div>
      </div>
      <Button variant="primary" icon="plus" onClick={() => { onPick({ s, pk, ml, q: count }); close() }}>{t('Add')}</Button>
    </div>
  }
  const list = searchSodas({ q, cat: q ? null : cat, tr: t })
  return <div className="dk-pick">
    <h3>{t('Choose a soft drink')}</h3>
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search soft drinks')} />
    {!q && <div className="dk-chips scroll">
      <button className={'chip nocap' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>{t('All')}</button>
      {SODA_CATS.map(c => <button key={c.key} className={'chip nocap' + (cat === c.key ? ' on' : '')} onClick={() => setCat(c.key)}><Icon name={c.icon} />{t(c.name)}</button>)}
    </div>}
    <div className="list dk-pick-l">
      {list.map(s => <button key={s.id} className="item dk-pick-i" onClick={() => { setSel(s); setPk(s.def.pk); setMl(s.def.ml); setCount(1) }}>
        <SodaArt soda={s} size={26} />
        <div className="grow"><div className="tt">{sodaName(s)}</div><div className="ss">{n0(sodaNutrition(s, s.def.ml).kcal)} {U('kcal')} · {packText(s.def.pk, s.def.ml)}</div></div>
        <Icon name="chevronRight" className="chev" />
      </button>)}
    </div>
  </div>
}
export const pickSodaSheet = onPick => ui().openSheet(close => <Pick onPick={onPick} close={close} />)

// ---- the screen ----------------------------------------------------------------------------------------------
function SodaCard({ s, i }) {
  const n = sodaNutrition(s, s.def.ml)
  return <button className="sd-card" style={{ '--c': s.col, '--b': s.br, '--i': Math.min(i, 14) }} onClick={() => sodaSheet(s.id)}>
    <span className="sd-card-art"><SodaArt soda={s} size={46} /></span>
    <b className="sd-card-n">{sodaName(s)}</b>
    <span className="sd-card-k"><b>{n0(n.kcal)}</b> {U('kcal')}</span>
    <span className="sd-card-m">{sizeText(s.def.ml, s.def.pk)}{n.tsp >= 0.5 ? <> · <Icon name="square" />{n1(n.tsp)}</> : null}</span>
    {s.zero && <span className="sd-card-z">{t('Sugar-free')}</span>}
    {s.cf100 > 0 && <span className="sd-card-c" title={t('Caffeine')}><Icon name="bolt" /></span>}
  </button>
}

export default function Sodas() {
  const St = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(null)
  const [zero, setZero] = useState(false)
  const [noCaf, setNoCaf] = useState(false)
  const iso = todayISO()
  const list = useMemo(() => searchSodas({ q, cat: q ? null : cat, zero, noCaf, tr: t }), [q, cat, zero, noCaf])
  const day = useMemo(() => sodaDay(dayEntries(St, iso)), [St, iso])
  const recent = recentSodas(St, 21, 8)
  const c = cat && SODA_CAT_BY_KEY[cat]
  const hero = SODAS[(new Date().getDate() * 7) % SODAS.length]
  return <div className="narrow sd-page">
    <div className="hdr">
      <BackButton fallback="/drinks" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Soft drinks')}</h1><div className="sub">{t('Calories, sugar and caffeine in every can and bottle')}</div></div>
    </div>

    {!q && !cat && <div className="card sd-top" style={{ '--b': hero.br, '--b2': hero.br2, '--c': hero.col }}>
      <span className="sd-top-bg" aria-hidden="true" />
      <button className="sd-top-art" onClick={() => sodaSheet(hero.id)} aria-label={sodaName(hero)}>
        <SodaArt soda={hero} pk="glass" ml={300} size={54} live />
        <SodaArt soda={hero} pk="can" ml={330} size={62} live />
        <SodaArt soda={hero} pk="bottle" ml={500} size={54} live />
      </button>
      <div className="sd-top-t">
        <span className="lbl2">{t('Today')}</span>
        <div className="sd-top-n">
          <div><b>{n1(day.count)}</b><span>{t('Soft drinks')}</span></div>
          <div><b>{n0(day.kcal)}</b><span>{U('kcal')}</span></div>
          <div><b>{n1(day.sugar / 4)}</b><span>{t('Teaspoons of sugar')}</span></div>
        </div>
        <Bar value={day.sugar} max={SUGAR_MAX_G} ideal={SUGAR_IDEAL_G} color="var(--pink)" label={t('Of the daily sugar limit (WHO)')} />
      </div>
    </div>}

    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} placeholder={t('Search soft drinks')} />
    <div className="dk-chips scroll" role="tablist">
      <button role="tab" aria-selected={!cat} className={'chip nocap' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>{t('All')}</button>
      {SODA_CATS.map(k => <button key={k.key} role="tab" aria-selected={cat === k.key} className={'chip nocap dk-chip' + (cat === k.key ? ' on' : '')}
        style={{ '--cc': k.color }} onClick={() => setCat(k.key)}><Icon name={k.icon} />{t(k.name)}</button>)}
    </div>
    <div className="dk-filters">
      <button className={'chip nocap' + (zero ? ' on' : '')} aria-pressed={zero} onClick={() => setZero(v => !v)}><Icon name="leafy" />{t('Sugar-free')}</button>
      <button className={'chip nocap' + (noCaf ? ' on' : '')} aria-pressed={noCaf} onClick={() => setNoCaf(v => !v)}><Icon name="moon" />{t('No caffeine')}</button>
    </div>
    {c && <div className="dk-cat-h" style={{ '--cc': c.color }}><span className="dk-cat-ic"><Icon name={c.icon} /></span><div><b>{t(c.name)}</b><div className="small muted">{t(c.desc)}</div></div></div>}

    {!q && !cat && recent.length > 0 && <>
      <div className="dk-sec-t">{t('Recently')}</div>
      <div className="dk-recent scroll">
        {recent.map(r => { const s = sodaOf(r.id); return <button key={r.id} className="dk-rc sd-rc" onClick={() => sodaSheet(r.id, { pk: r.pk, ml: r.ml })}>
          <SodaArt soda={s} pk={r.pk} ml={r.ml} size={30} /><span>{sodaName(s)}</span></button> })}
      </div>
    </>}

    <div className="sd-grid" key={(cat || 'all') + (zero ? 'z' : '') + (noCaf ? 'n' : '')}>
      {list.map((s, i) => <SodaCard key={s.id} s={s} i={i} />)}
    </div>
    {!list.length && <div className="empty small"><div className="ico"><Icon name="can" /></div>{t('Nothing found')}</div>}
    <p className="small muted dk-foot">{t('Values are typical per 100 ml — recipes differ from country to country, so check the label. Brand names belong to their owners.')}</p>
  </div>
}
