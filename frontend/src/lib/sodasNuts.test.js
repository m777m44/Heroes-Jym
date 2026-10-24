// 10.0 — soft drinks and nuts & seeds: the data, the maths, logging and search.
import { describe, it, expect } from 'vitest'
import {
  SODAS, SODA_BY_ID, SODA_CATS, PACKS, SODA_SWAP, packFor, sodaNutrition, swapSaving, sodaEntry, sodaDay, searchSodas,
  recentSodas, countsAsWater, packDims, walkMinutes, TSP_G,
} from './sodas.js'
import { NUTS, NUT_BY_ID, NUT_CATS, FORMS, MICRO, BENEFIT, NUT_CAUTION, HANDFUL_G, unitsFor, edibleGrams, nutNutrition, nutEntry, nutDay, searchNuts, nutOfDay } from './nuts.js'
import { foodName, entryKcal } from './food.js'

describe('soft drinks — the data', () => {
  it('has many drinks, each complete and sold in real packs', () => {
    expect(SODAS.length).toBeGreaterThanOrEqual(45)
    expect(new Set(SODAS.map(s => s.id)).size).toBe(SODAS.length)
    expect(new Set(SODAS.map(s => s.name)).size).toBe(SODAS.length)
    const cats = new Set(SODA_CATS.map(c => c.key))
    for (const s of SODAS) {
      expect(cats.has(s.cat), s.id).toBe(true)
      expect(s.packs.length, s.id).toBeGreaterThan(0)
      expect(s.packs).toContain(s.def.pk)
      expect(PACKS[s.def.pk].sizes, s.id).toContain(s.def.ml)
      expect(s.k100, s.id).toBeGreaterThanOrEqual(0)
      expect(s.k100, s.id).toBeLessThan(60)
      expect(s.s100 * 4, s.id).toBeLessThanOrEqual(s.k100 + 1)          // sugar never exceeds the energy
      for (const c of [s.col, s.br, s.br2]) expect(c, s.id).toMatch(/^#[0-9a-f]{6}$/i)
      if (s.zero) expect(s.k100, s.id).toBeLessThan(5)
    }
    for (const c of SODA_CATS) expect(SODAS.some(s => s.cat === c.key), c.key).toBe(true)
    for (const [a, b] of Object.entries(SODA_SWAP)) { expect(SODA_BY_ID[a], a).toBeTruthy(); expect(SODA_BY_ID[b], b).toBeTruthy() }
    // the ones people ask for
    for (const id of ['coke', 'pepsi', '7up', 'sprite', 'mirinda', 'mintlemon', 'redbull', 'barbican']) expect(SODA_BY_ID[id], id).toBeTruthy()
  })
  it('works out a can of cola exactly', () => {
    const n = sodaNutrition(SODA_BY_ID.coke, 330)
    expect(n).toMatchObject({ ml: 330, kcal: 139, sugar: 35, caffeine: 32 })
    expect(n.tsp).toBe(Math.round(35 / TSP_G * 10) / 10)
    expect(sodaNutrition(SODA_BY_ID.coke, 330, 2).kcal).toBe(277)
    expect(sodaNutrition(SODA_BY_ID.cokezero, 330).kcal).toBe(1)
    expect(sodaNutrition(SODA_BY_ID.redbull, 250).caffeine).toBe(80)
    expect(sodaNutrition(null)).toMatchObject({ kcal: 0 })
  })
  it('falls back to a pack and size the drink is sold in', () => {
    expect(packFor(SODA_BY_ID.coke, 'bottle', 1500)).toEqual({ pk: 'bottle', ml: 1500 })
    expect(packFor(SODA_BY_ID.coke, 'bottle', 777)).toEqual({ pk: 'bottle', ml: 500 })
    expect(packFor(SODA_BY_ID.redbull, 'bottle', 500)).toEqual({ pk: 'can', ml: 500 })     // energy drinks: cans
    expect(packFor(SODA_BY_ID.redbull, 'bottle', 777)).toEqual({ pk: 'can', ml: 250 })
    expect(packFor(SODA_BY_ID.monster)).toEqual({ pk: 'can', ml: 500 })
  })
  it('shows what the sugar-free twin saves', () => {
    const x = swapSaving(SODA_BY_ID.coke, 330)
    expect(x.to.id).toBe('cokezero')
    expect(x.kcal).toBe(138)
    expect(x.tsp).toBeGreaterThan(8)
    expect(swapSaving(SODA_BY_ID.cokezero, 330)).toBe(null)
  })
  it('draws bigger packs bigger', () => {
    expect(packDims('bottle', 2250)[1]).toBeGreaterThan(packDims('bottle', 500)[1])
    expect(packDims('can', 150)[1]).toBeLessThan(packDims('can', 330)[1])
    expect(packDims('can', 330, true)[0]).toBeLessThan(packDims('can', 330)[0])           // slim cans
    const mid = packDims('bottle', 750)
    expect(mid[1]).toBeGreaterThan(packDims('bottle', 500)[1])
    expect(mid[1]).toBeLessThan(packDims('bottle', 1000)[1])
  })
  it('logs packs, adds up the day and remembers recent ones', () => {
    const e = sodaEntry(SODA_BY_ID.pepsi, { pk: 'bottle', ml: 500, count: 2, meal: 'l', now: 5 })
    expect(e).toMatchObject({ sd: 'pepsi', pk: 'bottle', ml: 500, kcal: 220, q: 2, m: 'l', t: 5 })
    expect(entryKcal(e)).toBe(440)
    expect(foodName({}, e)).toBe('Pepsi · 500 ml')
    const day = sodaDay([e, sodaEntry(SODA_BY_ID.redbull, { count: 1 }), { n: 'Rice', kcal: 200 }])
    expect(day.count).toBe(3)
    expect(day.kcal).toBe(440 + 115)
    expect(day.caffeine).toBe(sodaNutrition(SODA_BY_ID.pepsi, 1000).caffeine + 80)
    const S = { food: { '2026-10-22': [{ ...e, t: 1 }], '2026-10-23': [{ ...sodaEntry(SODA_BY_ID.coke, { pk: 'glass', ml: 300 }), t: 2 }] } }
    expect(recentSodas(S)).toEqual([{ id: 'coke', pk: 'glass', ml: 300 }, { id: 'pepsi', pk: 'bottle', ml: 500 }])
  })
  it('finds drinks in any language and filters', () => {
    expect(searchSodas({ q: 'cola' }).map(s => s.id)).toEqual(expect.arrayContaining(['coke', 'cokezero', 'kinza']))
    const ar = { 'Coca-Cola': 'كوكاكولا', 'Colas': 'كولا' }
    expect(searchSodas({ q: 'كوكا', tr: k => ar[k] || k }).map(s => s.id)).toContain('coke')
    expect(searchSodas({ cat: 'energy' }).every(s => s.energy)).toBe(true)
    expect(searchSodas({ zero: true }).every(s => s.k100 < 5)).toBe(true)
    expect(searchSodas({ noCaf: true }).some(s => s.cf100 > 0)).toBe(false)
    expect(countsAsWater(SODA_BY_ID.soda)).toBe(true)
    expect(countsAsWater(SODA_BY_ID.coke)).toBe(false)
    expect(walkMinutes(139, 70)).toBeGreaterThan(25)
  })
})

describe('nuts & seeds', () => {
  it('has the nuts and seeds of every gathering, complete', () => {
    expect(NUTS.length).toBeGreaterThanOrEqual(18)
    const cats = new Set(NUT_CATS.map(c => c.key))
    for (const n of NUTS) {
      expect(cats.has(n.cat), n.id).toBe(true)
      expect(n.forms).toContain(n.def)
      for (const f of n.forms) expect(FORMS[f], n.id + f).toBeTruthy()
      const base = n.roasted || n.raw
      expect(base[0], n.id).toBeGreaterThan(200)
      expect(Math.abs(base[1] * 4 + base[2] * 9 + (base[3] - base[4]) * 4 + base[4] * 2 - base[0]) / base[0], n.id).toBeLessThan(0.12)
      for (const k of n.mi) expect(MICRO[k], n.id + k).toBeTruthy()
      for (const k of n.ben) expect(BENEFIT[k], n.id + k).toBeTruthy()
      for (const k of n.cau) expect(NUT_CAUTION[k], n.id + k).toBeTruthy()
      expect(n.ef).toBeGreaterThan(0)
      expect(n.ef).toBeLessThanOrEqual(1)
    }
    for (const id of ['pistachio', 'peanut', 'almond', 'walnut', 'cashew', 'sunflower', 'watermelon', 'pumpkin', 'kerzat']) expect(NUT_BY_ID[id], id).toBeTruthy()
  })
  it('weighs a handful, in or out of the shell, and counts pieces and spoons', () => {
    const p = NUT_BY_ID.pistachio
    expect(edibleGrams(p, 1, 'handful')).toBe(HANDFUL_G)
    expect(edibleGrams(p, 100, 'g', true)).toBeCloseTo(53, 0)
    expect(edibleGrams(p, 100, 'g', false)).toBe(100)
    expect(edibleGrams(NUT_BY_ID.almond, 10, 'piece')).toBeCloseTo(12, 5)
    expect(edibleGrams(NUT_BY_ID.chia, 2, 'tbsp')).toBe(24)
    expect(unitsFor(NUT_BY_ID.chia)).toEqual(['handful', 'g', 'tbsp'])
    expect(unitsFor(NUT_BY_ID.almond)).toContain('piece')
  })
  it('works out calories by form — roasted a little more, salted with sodium', () => {
    const p = NUT_BY_ID.pistachio
    expect(nutNutrition(p, 30, 'raw').kcal).toBe(168)
    expect(nutNutrition(p, 30, 'roasted').kcal).toBe(172)
    expect(nutNutrition(p, 30, 'salted').na).toBeGreaterThan(100)
    expect(nutNutrition(p, 30, 'raw').na).toBeLessThan(5)
    expect(nutNutrition(NUT_BY_ID.chestnut, 100, 'raw').kcal).toBe(245)       // only sold roasted
    expect(nutNutrition(null).kcal).toBe(0)
  })
  it('logs a portion, adds up the day, searches and picks a nut of the day', () => {
    const e = nutEntry(NUT_BY_ID.almond, { g: 30, form: 'raw', meal: 's', now: 9 })
    expect(e).toMatchObject({ nut: 'almond', fm: 'raw', g: 30, kcal: 174, q: 1, m: 's' })
    expect(foodName({}, e)).toBe('Almonds · 30 g')
    expect(nutDay([e, nutEntry(NUT_BY_ID.walnut, { g: 15 })])).toMatchObject({ g: 45, count: 2 })
    expect(searchNuts({ q: 'seed' }).every(n => n.cat === 'seed' || /seed/i.test(n.name))).toBe(true)
    expect(searchNuts({ q: 'فستق', tr: k => (k === 'Pistachios' ? 'فستق حلبي' : k) }).map(n => n.id)).toEqual(['pistachio'])
    expect(searchNuts({ lean: true }).every(n => (n.roasted || n.raw)[0] < 600)).toBe(true)
    expect(nutOfDay('2026-10-24').id).toBe(nutOfDay('2026-10-24').id)
    expect(new Set(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map(d => nutOfDay(d).id)).size).toBeGreaterThan(1)
  })
})
