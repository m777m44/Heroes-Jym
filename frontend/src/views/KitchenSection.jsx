// 14.0 — /kitchen/s/:key — a section of the Kitchen (lib/kitchenHub.js SECTIONS): its foods,
// dishes and drinks as photo cards that drift slowly while they are on screen. Search inside it,
// the useful filters (Iraqi, high protein, light, quick, low sugar), the shop aisles for "From the
// shops", sorting, and a link to the full guide where one exists (the Indomie builder, the soft
// drinks and the nuts guides, the drinks library, what can I cook).
// Also: fav (favourites), recent, all, mine ("My cooking": your dishes, foods and drinks) and
// credits (who took each photo).
// 15.0: cities — Iraq city by city (lib/regions.js), each place a big photo card; the Iraqi kitchen
// filters by place (?rg=mosul); "Fits my day" keeps what fits the calories left today; a tap on a
// photo opens the photo viewer.
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { nav } from '../lib/nav.js'
import {
  kitchenItems, itemOf, SECTION_BY_KEY, sectionItems, findItems, usefulFilters, SORTS, MARKET_AISLES, favItems, recentItems, isFav,
} from '../lib/kitchenHub.js'
import { loadCredits, itemsOfPhoto } from '../lib/photos/index.js'
import { myDishes, myFoods, useDishPhoto } from '../lib/dishPhotos.js'
import { DRINK_COUNT } from '../lib/drinks.js'
import { INDOMIE_FOODS } from '../lib/foods/indomie.js'
import { Photo } from '../components/FoodPhoto.jsx'
import { creditSheet } from '../components/kitchen/PhotoHero.jsx'
import { ItemCard, ItemRow, itemName } from '../components/kitchen/ItemCard.jsx'
import { openItem } from '../components/kitchen/openItem.js'
import { CookTimersBar } from '../components/kitchen/CookTimer.jsx'
import { useIncremental, LazyMore } from '../components/LazyList.jsx'
import { REGIONS, REGION_BY_KEY } from '../lib/regions.js'
import { todayISO } from '../lib/format.js'
import { foodGoalOf, dayTotals } from '../lib/food.js'
import { fishThisWeek } from '../lib/dayIntake.js'
import Icon from '../components/Icon.jsx'
import { BackButton, Segmented, SearchField } from '../components/ui.jsx'
import RoobaMaker from '../components/kitchen/RoobaMaker.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const SPECIAL = {
  fav: { key: 'fav', name: 'Favourites', icon: 'starFill', color: 'var(--yellow)', ph: null },
  recent: { key: 'recent', name: 'Recently', icon: 'history', color: 'var(--indigo)', ph: null },
  all: { key: 'all', name: 'Everything in the kitchen', icon: 'list', color: 'var(--acc)', ph: 'herbsplate' },
}
// a card at the top of some sections: the full guide or tool for it
const EXTRA = {
  noodles: { icon: 'noodles', tint: 'var(--yellow)', title: 'Build your Indomie', sub: 'Boiled, fried, as a soup or with cream — add egg, cheese or tuna and see the calories change',
    on: () => import('./FoodDatabase.jsx').then(m => m.indomieSheet({})), n: () => INDOMIE_FOODS.length },
  recipes: { icon: 'lightbulb', tint: 'var(--orange)', title: 'What can I cook?', sub: 'Recipes from what you have at home', to: '/kitchen?tab=cook' },
  soft: { icon: 'bottle', tint: 'var(--red)', title: 'Soft drinks guide', sub: 'Sugar, caffeine and better swaps — compare any two', to: '/sodas' },
  energy: { icon: 'bolt', tint: 'var(--yellow)', title: 'Soft drinks guide', sub: 'Sugar, caffeine and better swaps — compare any two', to: '/sodas' },
  nuts: { icon: 'nut', tint: 'var(--brown, #a2845e)', title: 'Nuts & seeds guide', sub: 'A handful a day — in grams, pieces or spoons', to: '/nuts' },
  hot: { icon: 'blender', tint: 'var(--green)', title: 'Healthy drinks library', sub: 'DRINKS', to: '/drinks' },
  cold: { icon: 'blender', tint: 'var(--green)', title: 'Healthy drinks library', sub: 'DRINKS', to: '/drinks' },
  milkdrinks: { icon: 'blender', tint: 'var(--green)', title: 'Healthy drinks library', sub: 'DRINKS', to: '/drinks' },
  iraqidrinks: { icon: 'palm', tint: 'var(--green)', title: 'Healthy drinks library', sub: 'DRINKS', to: '/drinks?c=iraqi' },
  ready: { icon: 'magnifier', tint: 'var(--teal)', title: 'Food database', sub: 'Every food on one list — search and sort', to: '/foods' },
  // 17.0: the Rooba corner and its drinks link to each other; strong drinks open the caffeine picture
  rooba: { icon: 'milk', tint: '#c9a96e', title: 'Laban & yogurt drinks', sub: 'Shineena, mastaw, smoked laban, lassi, kefir and doogh', to: '/kitchen/s/roobadrinks' },
  roobadrinks: { icon: 'milk', tint: '#c9a96e', title: 'Rooba corner', sub: 'Every rooba, the dishes cooked in it — and making it at home', to: '/kitchen/s/rooba' },
  strong: { icon: 'bolt', tint: '#ff375f', title: 'Caffeine in your body', sub: 'How much is in you now, and when it drops low enough for sleep',
    on: () => import('../components/CaffeineNow.jsx').then(m => m.caffeineSheet()) },
}

function Extra({ k }) {
  const e = EXTRA[k]
  if (!e) return null
  const sub = e.sub === 'DRINKS' ? t('{0} healthy recipes with calories — and your own', DRINK_COUNT) : t(e.sub)
  return <button type="button" className="card kh-link" style={{ '--tint': e.tint }} onClick={e.on || (() => nav(e.to))}>
    <span className="kh-link-ic" aria-hidden="true"><Icon name={e.icon} /></span>
    <span className="grow"><b>{t(e.title)}</b><span className="small muted">{sub}</span></span>
    <Icon name="chevronRight" className="chev" />
  </button>
}

function Header({ title, sub, back = '/kitchen' }) {
  return <div className="hdr">
    <BackButton fallback={back} />
    <div className="grow" style={{ marginInlineStart: 10 }}><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div>
  </div>
}

/** 15.0 — fish twice a week: how many servings in the last 7 days. */
function FishWeek({ St }) {
  const n = fishThisWeek(St, todayISO())
  const done = n >= 2
  return <div className={'card kx-fish' + (done ? ' done' : '')}>
    <span className="kx-fish-ic" aria-hidden="true"><Icon name="fish" /></span>
    <span className="grow"><b>{done ? t('Fish twice this week — well done') : t('Fish this week: {0} of 2', n0(n))}</b>
      <span className="small muted">{t('Doctors advise fish twice a week — for the heart, the brain and the eyes. Grilled is best.')}</span></span>
    <span className="kx-fish-dots" aria-hidden="true"><i className={n >= 1 ? 'on' : ''} /><i className={n >= 2 ? 'on' : ''} /></span>
  </div>
}

/** 15.0 — what is left of today's calories (0 when there is no goal). */
function kcalLeft(St) {
  const iso = todayISO()
  const goal = foodGoalOf(St, iso).kcal
  return goal > 0 ? Math.max(0, Math.round(goal - dayTotals(St, iso).kcal)) : 0
}

function Section({ k }) {
  const St = useStore(s => s.S)
  const sec = SECTION_BY_KEY[k] || SPECIAL[k]
  const loc = useLocation()
  const [q, setQ] = useState('')
  const [aisle, setAisle] = useState(null)
  const [rg, setRg] = useState(() => { const v = new URLSearchParams(loc.search || '').get('rg'); return REGION_BY_KEY[v] ? v : null })
  const [fits, setFits] = useState(false)
  const left = kcalLeft(St)
  const [filters, setFilters] = useState([])
  const [sort, setSort] = useState('usual')
  const favKey = k === 'fav' ? JSON.stringify([St.foodFav, St.drinkFavs, St.kitchenFav]) : ''
  const recentKey = k === 'recent' ? JSON.stringify(St.kitchenSeen || []) + Object.keys(St.food || {}).length : ''
  const base0 = useMemo(() => (!sec ? [] : k === 'fav' ? favItems(St) : k === 'recent' ? recentItems(St, 60) : k === 'all' ? kitchenItems() : sectionItems(k, aisle)),
    [k, aisle, favKey, recentKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const regions = useMemo(() => (k === 'iraqi' ? REGIONS.map(r => ({ ...r, n: base0.filter(x => x.rg === r.key).length })).filter(r => r.n > 0) : []), [k, base0])
  const base = useMemo(() => (rg ? base0.filter(x => x.rg === rg) : base0), [base0, rg])
  const dq = useDeferredValue(q)
  const list = useMemo(() => {
    const l = findItems(base, { q: dq, filters, sort, tr: t })
    return fits && left > 0 ? l.filter(x => x.kcal > 0 && x.kcal <= left) : l
  }, [base, dq, filters, sort, fits, left])
  const chips = useMemo(() => usefulFilters(base), [base])
  const inc = useIncremental(list.length, 24, [k, dq, filters.join(), sort, aisle, rg, fits].join('|'))
  if (!sec) return <div className="narrow kx"><Header title={t('Kitchen')} /><div className="empty">{t('Nothing found')}</div></div>
  const flip = key => setFilters(f => (f.includes(key) ? f.filter(x => x !== key) : [...f, key]))
  const aisles = k === 'ready' ? MARKET_AISLES : []
  return <div className="narrow kx">
    <Header title={rg ? t(REGION_BY_KEY[rg].name) : t(sec.name)} sub={rg ? t('{0} dishes and drinks from {1}', n0(base.length), t(REGION_BY_KEY[rg].name)) : t('{0} items', n0(base.length))} />
    {sec.ph && <div className="kx-banner" style={{ '--cc': rg ? REGION_BY_KEY[rg].color : sec.color }} aria-hidden="true">
      <Photo k={rg ? REGION_BY_KEY[rg].ph : sec.ph} size="m" live alt="" fallback={<span className="ks-none" />} />
      <span className="ks-shade" />
      <span className="kx-banner-ic"><Icon name={sec.icon} /></span>
    </div>}
    <Extra k={k} />
    {k === 'fish' && <FishWeek St={St} />}
    {k === 'rooba' && <RoobaMaker />}
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} type="search" enterKeyHint="search"
      placeholder={t('Search in {0}', t(sec.name))} aria-label={t('Search in {0}', t(sec.name))} />
    {aisles.length > 0 && <div className="dk-chips scroll" role="tablist" aria-label={t('Aisles')}>
      <button role="tab" aria-selected={!aisle} className={'chip nocap dk-chip' + (!aisle ? ' on' : '')} style={{ '--cc': 'var(--teal)' }} onClick={() => setAisle(null)}>{t('All aisles')}</button>
      {aisles.map(a => <button key={a.key} role="tab" aria-selected={aisle === a.key} className={'chip nocap dk-chip' + (aisle === a.key ? ' on' : '')}
        style={{ '--cc': a.color }} onClick={() => setAisle(a.key)}><Icon name={a.icon} />{t(a.name)}<span className="fdb-chip-n">{n0(a.n)}</span></button>)}
    </div>}
    {regions.length > 0 && <div className="dk-chips scroll kx-rg" role="tablist" aria-label={t('Iraq city by city')}>
      <button role="tab" aria-selected={!rg} className={'chip nocap dk-chip' + (!rg ? ' on' : '')} style={{ '--cc': 'var(--green)' }} onClick={() => setRg(null)}>
        <Icon name="palm" />{t('All of Iraq')}</button>
      {regions.map(r => <button key={r.key} role="tab" aria-selected={rg === r.key} className={'chip nocap dk-chip' + (rg === r.key ? ' on' : '')}
        style={{ '--cc': r.color }} onClick={() => setRg(v => (v === r.key ? null : r.key))}><Icon name="location" />{t(r.name)}<span className="fdb-chip-n">{n0(r.n)}</span></button>)}
    </div>}
    {rg && <p className="small muted kx-rg-about">{t(REGION_BY_KEY[rg].about)}</p>}
    {(chips.length > 0 || left > 0) && <div className="dk-chips scroll" aria-label={t('Filters')}>
      {left > 0 && <button className={'chip nocap dk-chip' + (fits ? ' on' : '')} style={{ '--cc': 'var(--orange)' }} aria-pressed={fits} onClick={() => setFits(v => !v)}>
        <Icon name="target" />{t('Fits my day · {0} kcal left', n0(left))}</button>}
      {chips.map(c => <button key={c.key} className={'chip nocap dk-chip' + (filters.includes(c.key) ? ' on' : '')} style={{ '--cc': 'var(--acc)' }}
        aria-pressed={filters.includes(c.key)} onClick={() => flip(c.key)}><Icon name={c.icon} />{t(c.name)}</button>)}
    </div>}
    <div className="fdb-bar">
      <span className="small muted" aria-live="polite">{t('{0} found', n0(list.length))}</span>
      <Segmented className="kx-sort" options={SORTS.map(s => ({ value: s.key, label: t(s.name) }))} value={sort} onChange={setSort} />
    </div>
    <div className="kc-grid">{list.slice(0, inc.n).map(x => <ItemCard key={x.uid} x={x} fav={isFav(St, x)} onOpen={openItem} />)}</div>
    <LazyMore inc={inc} left={n0(Math.min(24, list.length - inc.n))} />
    {!list.length && <div className="empty small"><div className="ico"><Icon name={k === 'fav' ? 'star' : 'magnifier'} /></div>
      {k === 'fav' && !q ? t('Tap the star on any food or drink to keep it here.') : k === 'recent' && !q ? t('What you eat and open shows up here.') : t('Nothing found for “{0}”.', q.trim())}</div>}
    <CookTimersBar />
  </div>
}

// ---- 15.0: Iraq city by city -----------------------------------------------------------------------
function Cities() {
  const counts = useMemo(() => {
    const c = {}
    for (const x of kitchenItems()) if (x.rg) c[x.rg] = (c[x.rg] || 0) + 1
    return c
  }, [])
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return <div className="narrow kx kcity">
    <Header title={t('Iraq city by city')} sub={t('{0} dishes and drinks from {1} places', n0(total), n0(REGIONS.length))} />
    <p className="small muted kcity-p">{t('Every corner of Iraq cooks its own way. Pick a place to see what it is famous for — with photos, calories and everything about each dish.')}</p>
    <div className="kcity-grid">{REGIONS.map((r, i) => <button key={r.key} type="button" className="kcity-c" style={{ '--cc': r.color, '--i': i }}
      onClick={() => nav('/kitchen/s/iraqi?rg=' + r.key)}>
      <Photo k={r.ph} size="m" live alt="" fallback={<span className="ks-none" aria-hidden="true" />} />
      <span className="kcity-shade" aria-hidden="true" />
      <span className="kcity-n"><Icon name="location" />{t('{0} items', n0(counts[r.key] || 0))}</span>
      <span className="kcity-t"><b>{t(r.name)}</b><small>{t(r.about)}</small></span>
    </button>)}</div>
  </div>
}

// ---- My cooking ----------------------------------------------------------------------------------
function MyDishCard({ d }) {
  const url = useDishPhoto(d.id, d.hasPhoto)
  return <ItemCard x={{ ...d, img: url }} live={false} onOpen={() => import('../components/kitchen/MyDish.jsx').then(m => m.myDishSheet(d.id))} />
}

function MyCooking() {
  const St = useStore(s => s.S)
  const dishes = myDishes(St), foods = myFoods(St), drinks = St.myDrinks || []
  const openFood = x => import('../components/food/FoodSheets.jsx').then(m => m.customFoodSheet((St.customFoods || []).find(f => f.id === x.id)))
  return <div className="narrow kx">
    <Header title={t('My cooking')} sub={t('{0} dishes · {1} foods · {2} drinks of your own', n0(dishes.length), n0(foods.length), n0(drinks.length))} />
    <button type="button" className="card km-new" onClick={() => nav('/kitchen/dish')}>
      <span className="km-new-ic" aria-hidden="true"><Icon name="plus" /></span>
      <span className="grow"><b>{t('New dish')}</b><span className="small muted">{t('Your photo, the ingredients by weight and the steps — the calories are worked out for you')}</span></span>
      <Icon name="chevronRight" className="chev" />
    </button>
    <div className="kh-h"><Icon name="fork" /><b>{t('My dishes')}</b></div>
    {dishes.length ? <div className="kc-grid">{dishes.map(d => <MyDishCard key={d.id} d={d} />)}</div>
      : <div className="card km-empty"><Icon name="camera" /><span className="small muted">{t('Cook something you love, take its photo and save it here — with its calories.')}</span></div>}
    {foods.length > 0 && <>
      <div className="kh-h"><Icon name="pencil" /><b>{t('My foods')}</b></div>
      <div className="kr-list">{foods.map(x => <ItemRow key={x.uid} x={x} sub={t('Your food')} onOpen={openFood} />)}</div>
    </>}
    <div className="kh-h"><Icon name="blender" /><b>{t('My drinks')}</b></div>
    {drinks.length ? <div className="kr-list">{drinks.map(d => <ItemRow key={d.id} x={{ uid: 'D:' + d.id, kind: 'D', id: d.id, name: d.n, mine: true, kcal: 0, p: 0, c: 0, f: 0, ph: null }}
      sub={t('Your drink')} onOpen={() => import('./Drinks.jsx').then(m => m.drinkSheet(d.id))} />)}</div>
      : <button type="button" className="card kh-link" style={{ '--tint': 'var(--purple)' }} onClick={() => import('./Drinks.jsx').then(m => m.drinkBuilderSheet())}>
        <span className="kh-link-ic" aria-hidden="true"><Icon name="plus" /></span>
        <span className="grow"><b>{t('Mix your own drink')}</b><span className="small muted">{t('The calories are worked out for you')}</span></span>
      </button>}
  </div>
}

// ---- photo credits -------------------------------------------------------------------------------
function photoTitle(key) {
  for (const uid of itemsOfPhoto(key)) { const x = itemOf(uid); if (x) return itemName(x) }
  return key
}
function Credits() {
  const [c, setC] = useState(null)
  const [q, setQ] = useState('')
  useEffect(() => { loadCredits().then(setC) }, [])
  const rows = useMemo(() => (c ? Object.entries(c).map(([k, v]) => ({ k, v, title: photoTitle(k) })) : []), [c])
  const nq = q.trim().toLowerCase()
  const list = nq ? rows.filter(r => (r.title + ' ' + r.v[1] + ' ' + r.v[2]).toLowerCase().includes(nq)) : rows
  const inc = useIncremental(list.length, 40, nq)
  return <div className="narrow kx">
    <Header title={t('Photo credits')} sub={t('{0} real photos from Wikimedia Commons and Open Food Facts', n0(rows.length))} />
    <p className="small muted kx-credits-p">{t('Every food and drink photo in the app is a real photograph from Wikimedia Commons, shared by its photographer under a free licence (Creative Commons or public domain). The photos were cropped and resized for the app; tap one for its file and licence.')}</p>
    <p className="small muted kx-credits-p">{t('A few drinks show the product itself, photographed by the people who add products to Open Food Facts, the free food database (CC BY-SA 3.0).')}</p>
    <SearchField value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} type="search" placeholder={t('Search photos or photographers')} aria-label={t('Search photos or photographers')} />
    <div className="kr-list">{list.slice(0, inc.n).map(r => <button key={r.k} type="button" className="kr" onClick={() => creditSheet(r.k, r.v)}>
      <Photo k={r.k} size="t" alt="" className="kr-ph" fallback={<span className="kr-ph kr-none"><Icon name="image" /></span>} />
      <span className="grow kr-t"><b className="tt" dir="auto">{r.title}</b><span className="ss" dir="auto">{r.v[1]}</span></span>
      <span className="kx-lic" dir="ltr">{r.v[2]}</span>
    </button>)}</div>
    <LazyMore inc={inc} left={n0(Math.min(40, list.length - inc.n))} />
  </div>
}

export default function KitchenSection() {
  const { key = 'all' } = useParams()
  if (key === 'mine') return <MyCooking />
  if (key === 'credits') return <Credits />
  if (key === 'cities') return <Cities />
  return <Section key={key} k={key} />
}
