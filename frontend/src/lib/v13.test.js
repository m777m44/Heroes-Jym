// 13.0 — the food database (Indomie by preparation, date cakes, canned food, shop snacks, more
// Iraqi dishes), every new name in Arabic, notifications in the theme's colour, the theme switch
// animation, and the pieces the new screens are built from.
import { describe, it, expect, beforeAll } from 'vitest'
import ar from '../locales/ar.js'
import { FOODS, FOOD_BY_ID, FOOD_CATS, IRAQI_COUNT } from './foodDb.js'
import { MORE_FOODS, NEW_CATS, MOVED } from './foods/index.js'
import {
  PACKS, PREPS, ADDONS, ADDON_KCAL, INDOMIE_FOODS, INDOMIE_PRESETS, normIndomie, indomieNutrition, indomieLabel, indomieKey, indomieParts,
} from './foods/indomie.js'
import { DATE_CAKES, CAKE_SIZES } from './foods/dateCakes.js'
import { CANNED } from './foods/canned.js'
import { SNACKS } from './foods/snacks.js'
import { IRAQI_MORE } from './foods/iraqi.js'
import { foodName, servingText, makeEntry } from './food.js'
import { notifColor, CLASSIC_NOTIF, THEMES, themeTokens, themeOf } from './themes.js'
import { ACCENTS } from './format.js'
import { animateThemeSwitch } from './themeSwitch.js'
import { setLang, t, U } from './i18n.js'

const macroKcal = f => 4 * f.p + 4 * f.c + 9 * f.f

describe('13.0 food database', () => {
  it('has 160+ new foods, 500+ in all, every id unique', () => {
    expect(MORE_FOODS.length).toBeGreaterThanOrEqual(160)
    expect(FOODS.length).toBeGreaterThanOrEqual(500)
    expect(new Set(FOODS.map(f => f.id)).size).toBe(FOODS.length)
  })

  it('fills the shelves the spec asks for', () => {
    expect(INDOMIE_FOODS.length).toBeGreaterThanOrEqual(30)
    expect(DATE_CAKES.length).toBeGreaterThanOrEqual(15)
    expect(CANNED.length).toBeGreaterThanOrEqual(40)
    expect(SNACKS.length).toBeGreaterThanOrEqual(60)
    expect(IRAQI_MORE.length).toBeGreaterThanOrEqual(15)
    expect(IRAQI_COUNT).toBeGreaterThanOrEqual(100)
    for (const c of NEW_CATS) {
      expect(FOOD_CATS.some(x => x.key === c.key), c.key).toBe(true)
      expect(FOODS.filter(f => f.cat === c.key).length, c.key).toBeGreaterThan(10)
    }
    for (const [id, cat] of Object.entries(MOVED)) expect(FOOD_BY_ID[id].cat).toBe(cat)
  })

  it('every new food: a known shelf, sane values, calories that match its macros', () => {
    const cats = new Set(FOOD_CATS.map(c => c.key))
    for (const f of MORE_FOODS) {
      expect(cats.has(f.cat), f.id).toBe(true)
      expect(f.g > 0, f.id).toBe(true)
      for (const k of ['kcal', 'p', 'c', 'f']) expect(f[k] >= 0 && Number.isFinite(f[k]), f.id + ' ' + k).toBe(true)
      if (f.kcal >= 20) expect(Math.abs(macroKcal(f) - f.kcal) / f.kcal, f.id).toBeLessThan(0.12)
      if (f.na != null) expect(f.na >= 0 && f.na < 6000, f.id).toBe(true)
      if (f.sug != null) expect(f.sug <= f.c + 0.5, f.id).toBe(true)
    }
  })

  it('names the well-known products and dishes', () => {
    const names = FOODS.map(f => f.name).join('|')
    for (const n of ['Snickers', 'KitKat', 'Twix', 'Oreo', 'Pringles', 'Doritos', 'Lay’s', 'Magnum', 'Latte', 'Corned beef', 'Luncheon', 'Sardines', 'Foul medames', 'Masgouf', 'Dolma', 'Kleicha', 'Zalabia', 'Geymar']) {
      expect(names.toLowerCase().includes(n.toLowerCase()), n).toBe(true)
    }
  })

  it('a can is millilitres only for drinks; café drinks are millilitres', () => {
    expect(FOOD_BY_ID.tunawater.ml).toBe(false)
    expect(FOOD_BY_ID.cornedbeef.ml).toBeFalsy()
    expect(FOOD_BY_ID.soda.ml).toBe(true)
    expect(FOOD_BY_ID.latte.ml).toBe(true)
  })
})

describe('13.0 Indomie', () => {
  it('works out every value from its parts (kcal = 4p + 4c + 9f)', () => {
    for (const f of INDOMIE_FOODS) expect(Math.abs(macroKcal(f) - f.kcal), f.id).toBeLessThanOrEqual(2)
  })

  it('orders the ways of making it like the label: dry < boiled < fried, cream on top', () => {
    const k = id => FOOD_BY_ID['indo-' + id].kcal
    expect(k('raw')).toBeLessThan(k('raw-ss'))
    expect(k('boil')).toBeLessThan(k('boil-half'))
    expect(k('boil-half')).toBeLessThan(k('boil-s'))
    expect(k('boil-s')).toBeLessThan(k('fry'))
    expect(k('fry')).toBeLessThan(k('fry-egg-cheese'))
    expect(k('cream')).toBeGreaterThan(k('boil-s'))
    // the plain pack is in the range of its label (~380 kcal with everything, ~350 boiled)
    expect(k('raw-ss')).toBeGreaterThan(340)
    expect(k('raw-ss')).toBeLessThan(420)
    expect(k('boil-s')).toBeGreaterThan(330)
    expect(k('boil-s')).toBeLessThan(400)
    expect(k('fry')).toBeGreaterThan(450)
    expect(k('jumbo')).toBeGreaterThan(k('boil-s') * 1.4)
  })

  it('adds what the spec lists for each add-on (±10 kcal)', () => {
    const want = { egg: 70, cheese: 80, mayo: 90, ketchup: 20, hot: 15, tuna: 120, chicken: 165, veg: 30 }
    for (const [id, kcal] of Object.entries(want)) expect(Math.abs(ADDON_KCAL[id] - kcal), id).toBeLessThanOrEqual(10)
    const base = indomieNutrition({ pack: 'goreng', prep: 'boiled', season: 1 })
    const egg2 = indomieNutrition({ pack: 'goreng', prep: 'boiled', season: 1, add: { egg: 2 } })
    expect(Math.abs(egg2.kcal - base.kcal - 2 * ADDON_KCAL.egg)).toBeLessThanOrEqual(2)
  })

  it('drained noodles lose salt; less seasoning, less salt', () => {
    const soup = indomieNutrition({ pack: 'chicken', prep: 'soup', season: 1 })
    const boiled = indomieNutrition({ pack: 'chicken', prep: 'boiled', season: 1 })
    expect(boiled.na).toBeLessThan(soup.na)
    const half = indomieNutrition({ pack: 'chicken', prep: 'soup', season: 0.5 })
    expect(half.na).toBeLessThan(soup.na)
    expect(FOOD_BY_ID['indo-raw-ss'].na).toBeGreaterThan(900)
  })

  it('normalises any config: unknown packs, a cup is soup or dry, add-ons capped', () => {
    expect(normIndomie({}).pack).toBe(PACKS[0].id)
    expect(normIndomie({ pack: 'nope' }).pack).toBe(PACKS[0].id)
    expect(normIndomie({ pack: 'cup', prep: 'fried' }).prep).toBe('soup')
    expect(normIndomie({ pack: 'cup', prep: 'raw' }).prep).toBe('raw')
    expect(normIndomie({ pack: 'chicken', sauce: true }).sauce).toBe(false)   // only Mi Goreng-type packs have sauces
    const capped = normIndomie({ add: { egg: 99, tuna: -2, junk: 3 } })
    expect(capped.add).toEqual({ egg: ADDONS.find(a => a.id === 'egg').max })
    expect(PREPS.map(p => p.id)).toEqual(['raw', 'boiled', 'soup', 'fried', 'creamy'])
  })

  it('every ready-made way is its own mix, and the builder finds it again', () => {
    const keys = INDOMIE_PRESETS.map(p => indomieKey(p.cfg))
    expect(new Set(keys).size).toBe(keys.length)
    const f = FOOD_BY_ID['indo-boil-egg']
    expect(indomieKey({ pack: 'goreng', prep: 'boiled', season: 1, sauce: true, add: { egg: 1 } })).toBe(indomieKey(f.indomie))
  })

  it('names a mix from parts; the English name is the database name', () => {
    for (const f of INDOMIE_FOODS) expect(indomieLabel(f.indomie)).toBe(f.name)
    expect(indomieLabel({ pack: 'goreng', prep: 'boiled', season: 1, add: { egg: 2 } })).toBe('Indomie (boiled) + seasoning + sauce + 2 × egg')
  })
})

describe('13.0 date cakes and sizes', () => {
  it('three sizes: 50, 100 and 150 g', () => {
    expect(CAKE_SIZES.map(z => z.g)).toEqual([50, 100, 150])
    for (const f of DATE_CAKES) {
      expect(f.sizes, f.id).toBe(CAKE_SIZES)
      expect(f.g).toBe(50)
      for (const z of f.sizes) expect(z.q * f.g).toBe(z.g)
      expect(Math.abs(f.per100.kcal - f.kcal * 2), f.id).toBeLessThanOrEqual(1)   // a 50 g piece is half of 100 g
    }
    const kinds = DATE_CAKES.map(f => f.name).join('|')
    for (const k of ['chocolate', 'cream', 'nuts', 'coconut', 'honey', 'cheese', 'Vegan', 'Gluten-free', 'oats', 'Lotus']) expect(kinds.includes(k), k).toBe(true)
  })

  it('a size logs the right number of servings', () => {
    const f = FOOD_BY_ID['datecake-choc']
    const big = f.sizes.find(z => z.g === 150)
    const e = makeEntry(f, { q: big.q, m: 's' })
    expect(e.q).toBe(3)
    expect(e.kcal * e.q).toBe(f.kcal * 3)
  })
})

describe('13.0 Arabic', () => {
  beforeAll(async () => { await setLang('ar') })

  it('every new food, shelf, unit, size and Indomie part has Arabic', () => {
    const missing = []
    const need = k => { if (k && !(k in ar)) missing.push(k) }
    for (const f of FOODS) need(f.name)
    for (const c of FOOD_CATS) need(c.name)
    for (const f of FOODS) for (const z of f.sizes || []) need(z.name)
    for (const k of indomieParts()) need(k)
    for (const p of PACKS) need(p.full)
    for (const p of PREPS) need(p.label)
    for (const a of ADDONS) need(a.label)
    for (const k of ['Uncooked', 'Boiled', 'Soup', 'Fried', 'With cream', 'Usual', 'Fewest kcal', 'Most protein']) need(k)
    expect(missing).toEqual([])
  })

  it('servings read in Arabic, and any builder mix gets an Arabic name', () => {
    for (const f of MORE_FOODS) expect(/[A-Za-z]{2}/.test(servingText(f, U)), f.id).toBe(false)
    const cfg = { pack: 'jumbo', prep: 'creamy', season: 0.5, sauce: true, add: { egg: 2, cheese: 1, tuna: 1, sausage: 3 } }
    const name = foodName({}, { f: null, n: indomieLabel(cfg), ind: cfg })
    expect(name).toContain('إندومي')
    expect(/[A-Za-z]{2}/.test(name)).toBe(false)
    expect(name).toBe(indomieLabel(cfg, t))
  })
})

describe('13.0 notifications in the theme colour', () => {
  it('follows the theme, a chosen accent wins, and "off" is the classic green', () => {
    const ocean = themeOf('ocean-dark')
    expect(notifColor({ theme: 'ocean-dark', themeSystem: false })).toBe(themeTokens(ocean).accent['--acc'])
    expect(notifColor({ theme: 'ocean-dark', themeSystem: false, accent: 'pink' })).toBe(ACCENTS.pink)
    expect(notifColor({ theme: 'ocean-dark', notifTheme: false })).toBe(CLASSIC_NOTIF)
    // following the phone: the light twin's accent in light mode
    expect(notifColor({ theme: 'sunset-dark' }, false)).toBe(themeTokens(themeOf('sunset-light')).accent['--acc'])
  })

  it('gives every one of the 1,400+ themes a valid #rrggbb colour', () => {
    expect(THEMES.length).toBeGreaterThan(50)
    const seen = new Set()
    for (const th of THEMES) {
      const c = notifColor({ theme: th.id, themeSystem: false })
      expect(c, th.id).toMatch(/^#[0-9a-f]{6}$/)
      seen.add(c)
    }
    expect(seen.size).toBeGreaterThan(50)
    expect(notifColor({ theme: 'g-123456', themeSystem: false })).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('13.0 theme switch animation', () => {
  const fakeDoc = (extra = {}) => {
    const cls = new Set()
    return { visibilityState: 'visible', documentElement: { classList: { add: c => cls.add(c), remove: c => cls.delete(c) } }, cls, ...extra }
  }
  it('uses View Transitions where the browser has them', () => {
    let ran = 0, vt = 0
    const doc = fakeDoc({ startViewTransition: fn => { vt++; fn() } })
    expect(animateThemeSwitch(() => ran++, { doc, reduce: false })).toBe('view-transition')
    expect([ran, vt]).toEqual([1, 1])
  })
  it('falls back to a short CSS transition, and is instant under reduced motion', () => {
    let ran = 0
    const doc = fakeDoc()
    expect(animateThemeSwitch(() => ran++, { doc, reduce: false })).toBe('css')
    expect(doc.cls.has('theme-anim')).toBe(true)
    expect(animateThemeSwitch(() => ran++, { doc: fakeDoc({ startViewTransition: () => { throw new Error('no') } }), reduce: true })).toBe('instant')
    expect(ran).toBe(2)
  })
})
