// 14.0 — street food and the meal builder: every dish built from parts starts exactly at its values,
// the builder's steps, what it says changed, the entry it logs (and its name in Arabic), the
// Kitchen's six big doors, and the Indomie builder's oil sachet and pack info.
import { describe, it, expect, afterAll } from 'vitest'
import ar from '../locales/ar.js'
import { FOOD_BY_ID, FOODS } from './foodDb.js'
import { INGREDIENTS, ING_BY_ID, itemsTotals, RECIPE_BY_ID, RECIPES } from './kitchen.js'
import { BUILDS, STREET_NEW, STREET_IDS, buildOf, builtValues, parseBuild, buildIngredients } from './foods/street.js'
import { stepOf, clampG, piecesOf, diffBuild, builtEntry, buildTotals, baseOf, changesForLog } from './mealBuilder.js'
import { builtLabel, foodName } from './food.js'
import { sectionItems, sectionCounts, FEATURED, featuredCount, SECTION_BY_KEY } from './kitchenHub.js'
import { normIndomie, indomieNutrition, indomieKey, indomieLabel, packParts, PACK_BY_ID, PREP_MIN, PREP_HOW, PREPS, INDOMIE_PRESETS } from './foods/indomie.js'
import { setLang, t } from './i18n.js'

afterAll(() => setLang('en'))

describe('14.0 — street food, built from parts', () => {
  it('every build uses ingredients that exist, with sensible amounts', () => {
    expect(buildIngredients()).toEqual([])
    for (const [id, s] of Object.entries(BUILDS)) {
      const items = parseBuild(s)
      expect(items.length, id).toBeGreaterThan(0)
      for (const it of items) expect(it.g > 0 && it.g <= 400, id + ' ' + it.id).toBe(true)
      expect(new Set(items.map(x => x.id)).size, id + ': an ingredient twice').toBe(items.length)
    }
    expect(Object.keys(BUILDS).length).toBeGreaterThanOrEqual(60)
  })
  it('a built food in the database has exactly the values of its parts', () => {
    for (const id of Object.keys(BUILDS)) {
      const f = FOOD_BY_ID[id]
      expect(f, id).toBeTruthy()
      expect(f.built, id).toBe(true)
      const v = builtValues(id)
      expect([f.kcal, f.p, f.c, f.f, f.na, f.g], id).toEqual([v.kcal, v.p, v.c, v.f, v.na, v.g])
      expect(f.per100, id).toBeUndefined()
    }
    // a classic burger: bun, patty, salad, pickles, ketchup, mayonnaise, salt
    expect(FOOD_BY_ID.burger.kcal).toBeGreaterThan(450)
    expect(FOOD_BY_ID.burger.kcal).toBeLessThan(620)
    expect(FOOD_BY_ID.burger.na).toBeGreaterThan(800)
  })
  it('adds 18 street foods, all on the street-food shelf, with real names', () => {
    expect(STREET_NEW.length).toBe(18)
    for (const f of STREET_NEW) {
      expect(FOOD_BY_ID[f.id], f.id).toBeTruthy()
      expect(f.cat).toBe('fast')
      expect(ar[f.name], f.name).toBeTruthy()
      expect(f.kcal).toBeGreaterThan(100)
    }
    expect(FOOD_BY_ID.laffatkibda.iraqi).toBe(true)
  })
  it('the street-food section holds 45+ dishes: burgers, shawarma, falafel, grills, manakish, Iraqi laffat', () => {
    const list = sectionItems('street')
    expect(list.length).toBeGreaterThanOrEqual(45)
    const ids = new Set(list.map(x => x.id))
    for (const id of ['burger', 'cheeseburger', 'doubleburger', 'zinger', 'shawarmachicken', 'shawarmameat', 'falafelsandwich', 'hotdog', 'pizza',
      'friedchicken', 'kebabsandwich', 'fries', 'onionrings', 'tacos', 'fishburger', 'kubbasandwich', 'tikka', 'lambchops', 'zaatar', 'lahmbajeen',
      'sushi', 'ramen', 'dimsum', 'nuggets', 'chickenstrips', 'veggieburger', 'laffatkibda', 'chickpeas']) expect(ids.has(id), id).toBe(true)
    for (const id of STREET_IDS) expect(FOOD_BY_ID[id], id).toBeTruthy()
    expect(SECTION_BY_KEY.fast).toBeUndefined()
  })
  it('six big doors: street food, Indomie, canned & shops, drinks, sweets, Iraqi', () => {
    expect(FEATURED.map(f => f.key)).toEqual(['street', 'indomie', 'shops', 'drinks', 'sweets', 'iraqi'])
    const n = Object.fromEntries(FEATURED.map(f => [f.key, featuredCount(f)]))
    expect(n.street).toBeGreaterThanOrEqual(45)
    expect(n.indomie).toBeGreaterThanOrEqual(30)
    expect(n.shops).toBeGreaterThanOrEqual(60)
    expect(n.drinks).toBeGreaterThanOrEqual(80)
    expect(n.sweets).toBeGreaterThanOrEqual(35)
    expect(n.iraqi).toBeGreaterThanOrEqual(25)
    for (const f of FEATURED) { expect(ar[f.name], f.name).toBeTruthy(); expect(f.to || f.tab).toBeTruthy() }
    expect(sectionCounts().street).toBe(sectionItems('street').length)
  })
})

describe('14.0 — ingredients with sodium', () => {
  it('every ingredient has its sodium; salt is 388 mg a gram', () => {
    for (const i of INGREDIENTS) expect(typeof i.na === 'number' && i.na >= 0, i.id).toBe(true)
    expect(ING_BY_ID.salt.na).toBe(38758)
    expect(itemsTotals([{ id: 'salt', g: 1 }]).na).toBe(388)
    expect(itemsTotals([{ id: 'salt', g: 1 }]).kcal).toBe(0)
    const t1 = itemsTotals([{ id: 'burgerbun', g: 60 }, { id: 'beefpatty', g: 100 }])
    expect(t1).toMatchObject({ kcal: 421, g: 160 })
    expect(t1.na).toBe(Math.round(490 * 0.6 + 330))
  })
  it('the new ingredients are named in Arabic, and their calories match their macros', () => {
    for (const i of INGREDIENTS) expect(ar[i.name], i.name).toBeTruthy()
    for (const id of ['beefpatty', 'shawarmachicken', 'falafel', 'toum', 'burgerbun', 'saj', 'fries', 'pickles', 'cheeseslice', 'pepperoni']) {
      const x = ING_BY_ID[id]
      expect(Math.abs(4 * x.p + 4 * x.c + 9 * x.f - x.kcal) / x.kcal, id).toBeLessThan(0.08)
    }
  })
})

describe('14.0 — the meal builder', () => {
  it('steps: a whole patty or falafel, a spoon of sauce, half a gram of salt, 5–25 g of the rest', () => {
    expect(stepOf('beefpatty', 100)).toBe(100)
    expect(stepOf('falafel', 68)).toBe(17)
    expect(stepOf('mayo', 10)).toBe(5)
    expect(stepOf('salt', 0.5)).toBe(0.5)
    expect(stepOf('shawarmachicken', 110)).toBe(10)
    expect(stepOf('tomato', 25)).toBe(5)
    expect(stepOf('rice', 250)).toBe(25)
    expect(clampG('salt', 0.74)).toBe(0.5)
    expect(clampG('tomato', -5)).toBe(0)
    expect(clampG('tomato', 99999)).toBe(1500)
    expect(piecesOf('falafel', 68)).toBe('4')
    expect(piecesOf('beefpatty', 200)).toBe('2')
    expect(piecesOf('tomato', 25)).toBe('')
  })
  it('opens a street food or a recipe with what goes into it', () => {
    const b = baseOf({ fid: 'burger' })
    expect(b.name).toBe('Beef burger')
    expect(b.items.map(x => x.id)).toEqual(['burgerbun', 'beefpatty', 'lettuce', 'tomato', 'onion', 'pickles', 'ketchup', 'mayo', 'salt'])
    expect(buildOf('burger')).not.toBe(buildOf('burger'))   // a fresh copy every time
    const r = baseOf({ rid: 'dolma' })
    expect(r.items.length).toBeGreaterThan(3)
    expect(baseOf({ fid: 'dolma' })).toBeNull()   // not built from parts — it has its card
    expect(baseOf({ fid: 'nope' })).toBeNull()
  })
  it('says what changed: taken out, added, more, less', () => {
    const base = buildOf('burger')
    const items = base.map(x => (x.id === 'mayo' ? { ...x, g: 0 } : x.id === 'onion' ? { ...x, g: 30 } : x.id === 'ketchup' ? { ...x, g: 5 } : x))
    items.push({ id: 'cheddar', g: 25 })
    expect(diffBuild(base, items)).toEqual([['^', 'onion'], ['v', 'ketchup'], ['-', 'mayo'], ['+', 'cheddar']])
    expect(diffBuild(base, base)).toEqual([])
    expect(diffBuild(base, base.map(x => (x.id === 'onion' ? { ...x, g: 16 } : x)))).toEqual([])   // a gram or two isn't a change
  })
  it('logs the food itself when unchanged, and its own values with the changes when not', () => {
    const base = baseOf({ fid: 'burger' })
    const same = builtEntry(base, base.items, { q: 2, meal: 'l', now: 1 })
    expect(same).toMatchObject({ f: 'burger', q: 2, m: 'l', kcal: FOOD_BY_ID.burger.kcal })
    const items = base.items.filter(x => x.id !== 'mayo').concat([{ id: 'cheddar', g: 25 }])
    const e = builtEntry(base, items, { meal: 'd', now: 1 })
    const v = itemsTotals(items)
    expect(e).toMatchObject({ f: null, kcal: v.kcal, p: v.p, c: v.c, fat: v.f, m: 'd' })
    expect(e.mb).toEqual({ n: 'Beef burger', x: [['-', 'Mayonnaise'], ['+', 'Cheddar cheese']] })
    expect(foodName({}, e)).toBe('Beef burger (without Mayonnaise · + Cheddar cheese)')
    const tot = buildTotals(base, items)
    expect(tot.dk).toBe(v.kcal - FOOD_BY_ID.burger.kcal)
    const rb = baseOf({ rid: 'dolma' })
    expect(builtEntry(rb, rb.items, { now: 1 })).toMatchObject({ r: 'dolma' })
  })
  it('names a changed dish in Arabic, with at most three changes spelled out', async () => {
    await setLang('ar')
    const mb = changesForLog({ name: 'Beef burger' }, [['-', 'mayo'], ['+', 'cheeseslice'], ['^', 'onion'], ['v', 'ketchup'], ['-', 'salt']])
    const s = builtLabel(mb, t)
    expect(s.startsWith(t('Beef burger'))).toBe(true)
    expect(s).toContain('بدون ' + t('Mayonnaise'))
    expect(s).toContain(t('+{0} more changes', 2))
    expect(/[A-Za-z]{2}/.test(s)).toBe(false)
    await setLang('en')
  })
  it('every recipe and every built dish opens in the builder', () => {
    for (const r of RECIPES) expect(baseOf({ rid: r.id }), r.id).toBeTruthy()
    for (const id of Object.keys(BUILDS)) expect(baseOf({ fid: id }).items.length, id).toBeGreaterThan(0)
    expect(FOODS.filter(f => f.built).length).toBe(Object.keys(BUILDS).length)
    expect(RECIPE_BY_ID.dolma).toBeTruthy()
  })
})

describe('14.0 — making Indomie', () => {
  it('the oil sachet can stay out; the 41 ready-made ways keep their keys', () => {
    const on = indomieNutrition({ pack: 'goreng', prep: 'boiled', season: 1 })
    const off = indomieNutrition({ pack: 'goreng', prep: 'boiled', season: 1, oil: false })
    expect(on.kcal - off.kcal).toBe(36)
    expect(normIndomie({ pack: 'goreng', season: 1 })).not.toHaveProperty('oil')
    expect(normIndomie({ pack: 'goreng', season: 0, oil: false })).not.toHaveProperty('oil')   // no seasoning: nothing to leave out
    expect(indomieKey({ pack: 'goreng', prep: 'boiled', season: 1, oil: false })).toMatch(/\|nooil$/)
    for (const p of INDOMIE_PRESETS) expect(indomieKey(p.cfg)).not.toMatch(/nooil/)
    expect(indomieLabel({ pack: 'goreng', prep: 'fried', season: 1, oil: false })).toContain('(no oil sachet)')
  })
  it('knows what is in a pack, how long each way takes and how to do it', () => {
    const parts = packParts(PACK_BY_ID.goreng)
    expect(parts.map(p => p.key)).toEqual(['block', 'powder', 'oil', 'sauce'])
    expect(parts.reduce((a, p) => a + p.kcal, 0)).toBeGreaterThan(350)
    expect(packParts(PACK_BY_ID.chicken).map(p => p.key)).toEqual(['block', 'powder', 'oil'])
    for (const p of PREPS) { expect(PREP_MIN[p.id], p.id).toBeGreaterThanOrEqual(0); expect(ar[PREP_HOW[p.id]], p.id).toBeTruthy() }
    for (const p of parts) expect(ar[p.name], p.name).toBeTruthy()
  })
})
