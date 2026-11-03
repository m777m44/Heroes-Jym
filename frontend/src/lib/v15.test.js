// 15.0 — Iraq city by city (100 new dishes with their place and a line about them), Iraq's fish,
// moota & azbari, the energy drinks of Iraq's shops, the photo viewer's numbers (per 100 g, the
// energy split, the share of a day, good to know, a lighter choice), today's caffeine / sugar /
// salt, fish twice a week, the new themes and the new default — and all of it in Arabic.
import { describe, it, expect } from 'vitest'
import ar from '../locales/ar.js'
import { IRAQ_15, FISH_IDS, ICE_IDS } from './foods/iraq15.js'
import { FOODS, FOOD_BY_ID } from './foodDb.js'
import { SODAS, SODA_BY_ID, SODA_SWAP } from './sodas.js'
import { REGIONS, REGION_BY_KEY, RG_OF, regionOf } from './regions.js'
import { kitchenItems, itemOf, sectionItems, SECTION_BY_KEY, FEATURED, featuredCount, CAF_F } from './kitchenHub.js'
import { photoKey } from './photos/index.js'
import { PHOTO_ROWS } from './photos/manifest.js'
import { amountOf, per100, macroSplit, nutritionRows, dayShares, factsOf, lighterChoice, shareLines, DAY } from './spotlight.js'
import { dayIntake, fishThisWeek } from './dayIntake.js'
import { sodaEntry } from './sodas.js'
import { DRINK_BY_ID, drinkCaffeine } from './drinks.js'
import { CATEGORIES, FAMILIES, DEFAULT_THEME, themeOf, themeTokens, familiesOf } from './themes.js'
import { allergensOf } from './foodDetails.js'

const macroKcal = f => 4 * f.p + 4 * f.c + 9 * f.f
const latin = s => /[A-Za-z]{2}/.test(String(s || '').replace(/MAHDI-JYM/g, ''))

describe('15.0 — Iraq city by city', () => {
  it('adds 95+ Iraqi dishes, each with its line, sane values and calories that match its macros', () => {
    expect(IRAQ_15.length).toBeGreaterThanOrEqual(95)
    expect(new Set(FOODS.map(f => f.id)).size).toBe(FOODS.length)          // no id used twice
    for (const f of IRAQ_15) {
      expect(f.iraqi, f.id).toBe(true)
      expect(typeof f.about === 'string' && f.about.length > 20, f.id).toBe(true)
      expect(f.g > 0 && f.kcal > 0, f.id).toBe(true)
      if (f.kcal >= 20) expect(Math.abs(macroKcal(f) - f.kcal) / f.kcal, f.id).toBeLessThan(0.12)
      if (f.rg) expect(REGION_BY_KEY[f.rg], f.id).toBeTruthy()
      expect(FOOD_BY_ID[f.id], f.id).toBeTruthy()
    }
  })
  it('covers the places of Iraq — Tal Afar and Mosul most of all', () => {
    const n = k => kitchenItems().filter(x => x.rg === k).length
    expect(REGIONS.map(r => r.key)).toEqual(['baghdad', 'mosul', 'talafar', 'najaf', 'basra', 'kurdistan', 'kirkuk', 'anbar', 'south'])
    expect(n('talafar')).toBeGreaterThanOrEqual(15)
    expect(n('mosul')).toBeGreaterThanOrEqual(20)
    expect(n('basra')).toBeGreaterThanOrEqual(20)
    expect(n('kurdistan')).toBeGreaterThanOrEqual(11)
    for (const r of REGIONS) {
      expect(n(r.key), r.key).toBeGreaterThanOrEqual(2)
      expect(PHOTO_ROWS.some(row => row[0] === r.ph), r.key + ' photo').toBe(true)
    }
    for (const uid of Object.keys(RG_OF)) expect(itemOf(uid), uid).toBeTruthy()
    expect(regionOf(itemOf('F:kubbamosul'))).toBe('mosul')
    expect(regionOf({ id: 'zingil', rg: 'talafar' })).toBe('talafar')
    expect(regionOf({ id: 'nope' })).toBe('')
  })
  it('has what was asked for: liver with bulgur, moota and azbari, fish, pacha, guss and falafel', () => {
    for (const id of ['kibdaburghul', 'moota', 'azbari', 'masmouta', 'zubaidigrilled', 'bunnigrilled', 'gattangrilled', 'pachafull', 'kipayat',
      'lisanat', 'kawari', 'gusssamoon', 'gussplate', 'falafelsamoon', 'falafelbig', 'zingil', 'burdapilaf', 'dahinamabroosh', 'kebaberbil', 'dulaimiya']) {
      expect(FOOD_BY_ID[id], id).toBeTruthy()
    }
    expect(ar['Liver with bulgur']).toBe('كبد مع برغل')
    expect(ar['Azbari (raspberry water ice)']).toContain('ازبري')
    expect(ar['Iraqi moota (milk ice cream with cardamom and rose water)']).toContain('موطة')
  })
  it('guss and falafel in samoon and the fried fish sandwich are built from parts (the meal builder opens them)', () => {
    for (const id of ['gusssamoon', 'gussplate', 'falafelsamoon', 'falafelbig', 'fishsandwich']) {
      const f = FOOD_BY_ID[id]
      expect(f.built, id).toBe(true)
      expect(Math.abs(macroKcal(f) - f.kcal) / f.kcal, id).toBeLessThan(0.08)
      expect(itemOf('F:' + id).bt, id).toBe(true)
    }
  })
  it('new sections: fish & seafood and ice cream; two new doors: Iraq city by city and fish', () => {
    const fish = sectionItems('fish').map(x => x.uid)
    for (const u of ['F:masgouf', 'F:shabbout', 'F:zubaidigrilled', 'F:shrimpgrilled', 'F:masmouta', 'R:masgouf']) expect(fish, u).toContain(u)
    const ice = sectionItems('icecream').map(x => x.uid)
    for (const u of ['F:moota', 'F:azbari', 'F:azbarilemon', 'F:dondurma', 'F:icelolly']) expect(ice, u).toContain(u)
    for (const id of FISH_IDS) if (FOOD_BY_ID[id]) expect(fish, id).toContain('F:' + id)
    for (const id of ICE_IDS) if (FOOD_BY_ID[id]) expect(ice, id).toContain('F:' + id)
    expect(SECTION_BY_KEY.fish.group).toBe('food')
    const doors = Object.fromEntries(FEATURED.map(f => [f.key, f]))
    expect(doors.cities.to).toBe('/kitchen/s/cities')
    expect(featuredCount(doors.cities)).toBe(kitchenItems().filter(x => x.rg).length)
    expect(featuredCount(doors.fish)).toBeGreaterThanOrEqual(30)
    // the smoked laban of Erbil is a milk drink, not food
    expect(itemOf('F:smokedlaban').drink).toBe(true)
    expect(sectionItems('milkdrinks').map(x => x.uid)).toContain('F:smokedlaban')
  })
  it('every new dish and drink has its photo row', () => {
    for (const f of IRAQ_15) expect(photoKey('F', f.id), f.id).toBeTruthy()
    for (const id of ['aspirash', 'aspirashgum', 'k9', 'k9perf', 'fouru', 'tiger', 'redstrong', 'winner', 'lion', 'hell']) expect(photoKey('S', id), id).toBeTruthy()
  })
})

describe('15.0 — the energy drinks of Iraq', () => {
  it('ASPI RASH, K9, 4U, Tiger, Red Strong, Winner, Lion and Hell — with their caffeine, and a sugar-free swap', () => {
    for (const id of ['aspirash', 'aspirashgum', 'k9', 'k9perf', 'fouru', 'tiger', 'redstrong', 'winner', 'lion', 'hell']) {
      const s = SODA_BY_ID[id]
      expect(s, id).toBeTruthy()
      expect(s.cat).toBe('energy')
      expect(s.cf100).toBeGreaterThan(20)
      expect(SODA_SWAP[id]).toBe('redbullsf')
      expect(itemOf('S:' + id).caf).toBeGreaterThanOrEqual(80)
      expect(sectionItems('energy').map(x => x.uid)).toContain('S:' + id)
      expect(latin(ar[s.name]), s.name).toBe(false)
    }
    expect(SODA_BY_ID.aspirash.def.ml).toBe(330)
    expect(SODA_BY_ID.k9perf.def.ml).toBe(355)
    expect(ar['ASPI RASH']).toBe('اسبي رش')
    expect(SODAS.length).toBeGreaterThan(150)
  })
})

describe('15.0 — the photo viewer', () => {
  const zingil = itemOf('F:zingil'), can = itemOf('S:redbull'), shrimp = itemOf('F:shrimpfried'), mas = itemOf('F:masmouta')
  it('works out the amount, per 100 g and where the energy comes from', () => {
    expect(amountOf(zingil)).toEqual({ v: 200, u: 'g' })
    expect(amountOf(can)).toEqual({ v: 250, u: 'ml' })
    expect(amountOf(itemOf('R:masgouf'))).toBe(null)
    expect(per100(zingil).kcal).toBe(250)
    expect(per100(can).u).toBe('ml')
    for (const x of [zingil, can, shrimp, mas]) {
      const m = macroSplit(x)
      expect(m.p + m.c + m.f, x.uid).toBe(100)
    }
    expect(macroSplit({ p: 0, c: 0, f: 0 })).toEqual({ p: 0, c: 0, f: 0 })
  })
  it('a full nutrition table: calories, kJ, protein, carbs (sugars), fibre, fat, sodium (salt) and caffeine', () => {
    const keys = nutritionRows(can).map(r => r[0])
    expect(keys).toEqual(expect.arrayContaining(['kcal', 'kj', 'p', 'c', 'sug', 'f', 'na', 'salt', 'caf']))
    const salt = nutritionRows(mas).find(r => r[0] === 'salt')
    expect(salt[2]).toBeCloseTo(mas.na * 2.5 / 1000, 1)
    for (const r of nutritionRows(zingil)) expect(ar[r[1]], r[1]).toBeTruthy()
  })
  it('the share of a day and the facts worth knowing', () => {
    const sh = dayShares(can, 2000)
    expect(sh[0]).toMatchObject({ key: 'kcal', max: 2000 })
    expect(sh.find(s => s.key === 'caf').pct).toBe(Math.round(can.caf / DAY.caf * 100))
    const keys = x => factsOf(x).map(f => f.key)
    expect(keys(can)).toEqual(expect.arrayContaining(['energy', 'caf']))
    expect(keys(mas)).toEqual(expect.arrayContaining(['salt', 'fish', 'protein']))
    expect(keys(shrimp)).toContain('fried')
    expect(keys(itemOf('F:dulaimiya'))).toContain('big')
    for (const x of [can, mas, shrimp, zingil]) for (const f of factsOf(x)) expect(ar[f.text], f.text).toBeTruthy()
  })
  it('offers a lighter choice of the same kind', () => {
    const l = lighterChoice(shrimp, kitchenItems())
    expect(l.item.uid).toBe('F:shrimpgrilled')
    expect(l.save).toBe(shrimp.kcal - l.item.kcal)
    const z = lighterChoice(itemOf('F:zubaidifried'), kitchenItems())
    expect(z.item.uid).toBe('F:zubaidigrilled')
    const d = lighterChoice(can, kitchenItems())
    expect(d.item.kind).toBe('S')
    expect(lighterChoice(itemOf('F:shrimpgrilled'), kitchenItems()).item.uid).toBe('F:shrimp')   // plain cooked shrimp
    expect(lighterChoice(itemOf('F:daqqous'), kitchenItems())).toBe(null)                          // already light
  })
  it('a short text to share', () => {
    const txt = shareLines(zingil, { name: 'زنگل', serving: '1 plate', place: 'تلعفر' })
    expect(txt.split('\n')[0]).toBe('زنگل — تلعفر')
    expect(txt).toContain('500')
    expect(txt).toContain('MAHDI-JYM')
  })
  it('the allergens of the new dishes', () => {
    expect(allergensOf(FOOD_BY_ID.zubaidifried).map(a => a.key)).toContain('fish')
    expect(allergensOf(FOOD_BY_ID.lollik).map(a => a.key)).toContain('gluten')
    expect(allergensOf(FOOD_BY_ID.moota).map(a => a.key)).toContain('milk')
  })
})

describe('15.0 — today’s caffeine, sugar and salt; fish twice a week', () => {
  it('adds up soft drinks, coffee and tea on the food shelves, drink recipes and food', () => {
    const rb = SODA_BY_ID.redbull
    const entries = [
      sodaEntry(rb, { pk: 'can', ml: 250 }),
      { id: 'a', f: 'tea', q: 2, kcal: 0 },
      { id: 'b', f: 'masmouta', q: 1, kcal: 420 },
      { id: 'c', dr: 'iraqitea', q: 1, kcal: 40 },
    ]
    const d = dayIntake(entries)
    expect(d.caf).toBe(80 + CAF_F.tea * 2 + drinkCaffeine(DRINK_BY_ID.iraqitea))
    expect(d.na).toBe(FOOD_BY_ID.masmouta.na)
    expect(d.sug).toBeGreaterThan(27)
    expect(dayIntake([])).toEqual({ caf: 0, sug: 0, na: 0 })
    expect(drinkCaffeine(DRINK_BY_ID.iraqitea)).toBe(40)
  })
  it('counts the fish of the last seven days', () => {
    const S = { food: { '2026-11-03': [{ f: 'masgouf', q: 1 }], '2026-10-30': [{ f: 'shrimpgrilled', q: 1 }, { f: 'rice', q: 1 }], '2026-10-20': [{ f: 'masgouf', q: 1 }] } }
    expect(fishThisWeek(S, '2026-11-03')).toBe(2)
    expect(fishThisWeek({}, '2026-11-03')).toBe(0)
  })
})

describe('15.0 — the new look', () => {
  it('a new default theme — MAHDI Midnight — and ten 15.0 Elegant themes, all readable', () => {
    expect(DEFAULT_THEME).toBe('mahdi15-deep')
    expect(CATEGORIES[0].id).toBe('luxe')
    const luxe = familiesOf('luxe')
    expect(luxe.length).toBe(10)
    expect(luxe[0].id).toBe('mahdi15')
    expect(new Set(FAMILIES.map(f => f.id)).size).toBe(FAMILIES.length)
    const tk = themeTokens(themeOf('mahdi15-deep'))
    expect(tk.accent['--acc']).toBe('#34e0a1')
    expect(tk.glow).toBeTruthy()
    for (const f of luxe) expect(latin(ar[f.name]), f.name).toBe(false)
  })
})

describe('15.0 — in Arabic', () => {
  it('every new dish, its line, place, section, theme and fact has Arabic with no runs of Latin letters', () => {
    const keys = [
      ...IRAQ_15.flatMap(f => [f.name, f.about]), ...REGIONS.flatMap(r => [r.name, r.about]),
      SECTION_BY_KEY.fish.name, SECTION_BY_KEY.icecream.name, ...FEATURED.map(f => f.name), ...CATEGORIES.map(c => c.name),
      ...factsOf({ uid: 'F:x', kind: 'F', name: 'Fried fish', kcal: 900, p: 60, c: 30, f: 50, sug: 30, na: 1600, fib: 8, caf: 80, g: 300, cat: 'energy' }).map(f => f.text),
    ]
    for (const k of keys) {
      expect(ar[k], k).toBeTruthy()
      expect(latin(ar[k]), k + ' → ' + ar[k]).toBe(false)
    }
  })
})
