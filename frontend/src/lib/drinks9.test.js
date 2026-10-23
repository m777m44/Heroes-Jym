// 9.0 — drinks & juices, recipe text templates, the Iraqi kitchen, sound packs and the review fixes.
import { describe, it, expect } from 'vitest'
import {
  DRINKS, DRINK_BY_ID, DING, DING_BY_ID, DRINK_CATS, gramsOf, unitsOf, drinkNutrition, optionalKcal, drinkFlags, drinkNotes, rowsTotals,
  saveMyDrink, deleteMyDrink, toggleDrinkFav, drinkOf, allDrinks, drinkEntry, noteDrink, recentDrinks, searchDrinks, searchDing, drinkOfDay, drinkFor,
} from './drinks.js'
import { TPL, stepText, amountText, qtyText, listOf } from './recipeText.js'
import { RECIPES, ING_BY_ID, recipeNutrition, TIP_TEXTS } from './kitchen.js'
import { PACKS, packOf, volOf, soundUrl } from './celebrate.js'
import { sleepRange, sleepCategory } from './health.js'
import { wallsOf, catOf, visibleCats } from './wallpapers.js'

const near = (v, want, tol) => expect(Math.abs(v - want)).toBeLessThanOrEqual(tol)

describe('drinks data', () => {
  it('is complete and consistent', () => {
    expect(DRINKS.length).toBeGreaterThanOrEqual(70)
    expect(new Set(DRINKS.map(d => d.id)).size).toBe(DRINKS.length)
    expect(new Set(DING.map(x => x.id)).size).toBe(DING.length)
    const cats = new Set(DRINK_CATS.map(c => c.key))
    for (const d of DRINKS) {
      expect(d.cats.length, d.id).toBeGreaterThan(0)
      for (const c of d.cats) expect(cats.has(c), d.id + ':' + c).toBe(true)
      for (const r of d.ing) expect(DING_BY_ID[r.id], d.id + ':' + r.id).toBeTruthy()
      for (const s of d.steps) {
        if (!Array.isArray(s)) continue
        expect(TPL[s[0]], d.id + ':' + s[0]).toBeTruthy()
        for (const a of s.slice(1)) if (Array.isArray(a)) for (const id of a) expect(d.ing.some(r => r.id === id), d.id + ' step uses ' + id).toBe(true)
      }
      expect(['h', 'c']).toContain(d.t)
    }
    for (const c of cats) expect(DRINKS.filter(d => d.cats.includes(c)).length, c).toBeGreaterThanOrEqual(6)
    expect(DRINKS.filter(d => d.cats.includes('iraqi')).length).toBeGreaterThanOrEqual(18)
  })
  it('works calories out of the ingredients', () => {
    near(drinkNutrition(DRINK_BY_ID.greendetox).kcal, 79, 3)
    near(drinkNutrition(DRINK_BY_ID.shineena).kcal, 92, 3)
    near(drinkNutrition(DRINK_BY_ID.datesmilk).kcal, 270, 6)
    near(drinkNutrition(DRINK_BY_ID.pbbanana).p, 37.6, 1)
    // steeped herbs give almost nothing; the optional sugar shows as "+N kcal"
    expect(drinkNutrition(DRINK_BY_ID.iraqitea).kcal).toBeLessThanOrEqual(3)
    near(optionalKcal(DRINK_BY_ID.iraqitea, 'sugar'), 31, 1)
    expect(drinkNutrition(DRINK_BY_ID.iraqitea, ['sugar']).kcal).toBeGreaterThan(30)
    // a jug for four is shared out
    expect(drinkNutrition(DRINK_BY_ID.cucumbermint).ml).toBe(250)
  })
  it('converts units by density and own measures', () => {
    expect(gramsOf(DING_BY_ID.honey, 1, 'tbsp')).toBe(21)
    near(gramsOf(DING_BY_ID.milk, 100, 'ml'), 103, 0.01)
    expect(gramsOf(DING_BY_ID.dates, 3, 'piece')).toBe(24)
    expect(gramsOf(DING_BY_ID.water, 1, 'cup')).toBe(240)
    expect(unitsOf(DING_BY_ID.milk)).toEqual(expect.arrayContaining(['ml', 'cup', 'tbsp', 'g']))
    expect(unitsOf(DING_BY_ID.banana)[0]).toBe('piece')
    expect(rowsTotals([{ id: 'nope', a: 1, u: 'g' }]).kcal).toBe(0)
  })
  it('reads flags and reasons off the ingredients', () => {
    expect(drinkFlags(DRINK_BY_ID.proteincoffee)).toEqual({ dairy: true, nuts: false, caffeine: true })
    expect(drinkFlags(DRINK_BY_ID.pbbanana).nuts).toBe(true)
    expect(drinkNotes(DRINK_BY_ID.greendetox).length).toBe(3)
  })
})

describe('your own drinks', () => {
  it('saves, edits, favourites and deletes', () => {
    const s = {}
    const id = saveMyDrink(s, { n: '  My shake ', t: 'h', sv: 2, col: 'bad', ing: [['milk', 250, 'ml'], ['nope', 1, 'g'], ['banana', 0, 'piece']] })
    expect(s.myDrinks[0]).toMatchObject({ id, n: 'My shake', t: 'h', sv: 2, col: '#7cc35a' })
    expect(s.myDrinks[0].ing).toEqual([['milk', 250, 'ml']])
    const d = drinkOf(s, id)
    expect(d.mine).toBe(true)
    near(drinkNutrition(d).kcal, 79, 1)                      // 257.5 g × 0.61 / 2 glasses
    saveMyDrink(s, { id, n: 'Renamed', ing: [['water', 300, 'ml']] })
    expect(s.myDrinks.length).toBe(1)
    expect(drinkOf(s, id).name).toBe('Renamed')
    toggleDrinkFav(s, id)
    expect(s.drinkFavs).toEqual([id])
    expect(searchDrinks(s, { cat: 'fav' }).map(x => x.id)).toEqual([id])
    deleteMyDrink(s, id)
    expect(s.myDrinks).toEqual([])
    expect(s.drinkFavs).toEqual([])
    expect(allDrinks(s).length).toBe(DRINKS.length)
  })
  it('logs a drink as a food entry and remembers it', () => {
    const e = drinkEntry(DRINK_BY_ID.zbeeb, { servings: 1.3, meal: 'x' })
    expect(e).toMatchObject({ dr: 'zbeeb', n: DRINK_BY_ID.zbeeb.name, q: 1.5, m: 's' })
    const s = {}
    noteDrink(s, '2026-10-01', 'zbeeb')
    noteDrink(s, '2026-10-02', 'shineena')
    expect(recentDrinks(s)).toEqual(['shineena', 'zbeeb'])
  })
  it('finds drinks and ingredients in both languages', () => {
    const tr = x => ({ 'Raisin sharbat (zbeeb)': 'شربت الزبيب', Raisins: 'زبيب' }[x] || x)
    expect(searchDrinks({}, { q: 'زبيب', tr }).map(d => d.id)).toContain('zbeeb')
    expect(searchDrinks({}, { q: 'ginger', cat: 'digest' }).every(d => d.cats.includes('digest'))).toBe(true)
    expect(searchDrinks({}, { temp: 'h' }).every(d => d.t === 'h')).toBe(true)
    expect(searchDrinks({}, { maxKcal: 100 }).every(d => drinkNutrition(d).kcal <= 100)).toBe(true)
    expect(searchDing('mint').map(x => x.id)).toContain('mint')
    expect(drinkOfDay('2026-10-23').id).toBe(drinkOfDay('2026-10-23').id)
    expect(drinkFor('pm', 0).w).toBe('pm')
  })
})

describe('recipe text', () => {
  const name = id => ({ a: 'Apples', b: 'Bananas', g: 'Greek yogurt' }[id] || id)
  it('fills templates', () => {
    expect(stepText(['blend', ['a', 'b']], name)).toMatch(/^Blend until smooth: apples and bananas\.$/)
    expect(stepText(['steep', 5, ['a']], name)).toBe('Pour hot water over and steep for 5 min: apples.')
    expect(stepText(['bakeAt', 200, 25], name)).toBe('Bake at 200 °C for 25 min until golden.')
    expect(stepText('Serve hot.', name)).toBe('Serve hot.')
    expect(stepText(['nope'], name)).toBe('nope')
    expect(listOf(['x'])).toBe('x')
  })
  it('writes amounts', () => {
    expect(amountText(0.5)).toBe('½')
    expect(amountText(1.25)).toBe('1¼')
    expect(amountText(2)).toBe('2')
    expect(qtyText(250, 'ml')).toBe('250 ml')
    expect(qtyText(0.125, 'tsp')).toBe('⅛ tsp')
  })
})

describe('Iraqi kitchen', () => {
  it('has the new dishes with steps, calories and tips', () => {
    const iq = RECIPES.filter(r => r.iq)
    expect(iq.length).toBeGreaterThanOrEqual(45)
    for (const id of ['masgouf', 'kubbamosul', 'timmanbagilla', 'qeema', 'lablabi', 'kleicha']) {
      const r = RECIPES.find(x => x.id === id)
      expect(r && r.iq, id).toBe(true)
      expect(recipeNutrition(r).kcal, id).toBeGreaterThan(50)
    }
    for (const r of RECIPES) {
      for (const s of r.steps) {
        expect(s, r.id).toBeTruthy()
        if (Array.isArray(s)) for (const a of s.slice(1)) if (Array.isArray(a)) for (const id of a) expect(r.ing.some(i => i.id === id), r.id + ':' + id).toBe(true)
      }
      for (const i of r.ing) expect(ING_BY_ID[i.id], r.id + ':' + i.id).toBeTruthy()
      if (r.tip) expect(TIP_TEXTS).toContain(r.tip)
    }
  })
})

describe('sound packs', () => {
  it('picks a pack and a file', () => {
    expect(PACKS.map(p => p.id)).toEqual(['champion', 'epic', 'neon', 'royal', 'arcade', 'zen', 'classic'])
    expect(packOf({})).toBe('champion')
    expect(packOf({ soundPack: 'zen' })).toBe('zen')
    expect(packOf({ soundPack: 'nope' })).toBe('champion')
    expect(volOf({ soundVol: 3 })).toBe(1)
    expect(volOf({})).toBe(0.9)
    expect(soundUrl('neon', 'hiit')).toMatch(/sounds\/neon\/workout\.mp3$/)
    expect(soundUrl('royal', 'body')).toMatch(/sounds\/royal\/goal\.mp3$/)
  })
})

describe('review fixes (PR #11)', () => {
  it('counts every log as data', async () => {
    // the store module wants a browser: give it the bits it touches
    const mem = new Map()
    globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }
    globalThis.document ??= { addEventListener: () => {}, removeEventListener: () => {}, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null }
    globalThis.window ??= globalThis
    const { hasData } = await import('../store/useStore.js')
    expect(hasData({})).toBe(false)
    expect(hasData({ food: { '2026-10-01': [{ kcal: 100 }] } })).toBe(true)
    expect(hasData({ fasting: { log: [{ start: 1, end: 2 }] } })).toBe(true)
    expect(hasData({ health: { '2026-10-01': { sleepH: 7 } } })).toBe(true)
    expect(hasData({ water: { '2026-10-01': 3 } })).toBe(true)
    expect(hasData({ myDrinks: [{ id: 'x' }] })).toBe(true)
    expect(hasData({ planner: { blocks: [{ id: 'b' }] } })).toBe(true)
    expect(hasData({ workouts: [], food: {}, fasting: { log: [] } })).toBe(false)
  })
  it('uses age-specific sleep ranges for children', () => {
    expect(sleepRange(2)).toEqual([11, 14])
    expect(sleepRange(4)).toEqual([10, 13])
    expect(sleepRange(9)).toEqual([9, 12])
    expect(sleepRange(15)).toEqual([8, 10])
    expect(sleepRange(40)).toEqual([7, 9])
    expect(sleepRange(70)).toEqual([7, 8])
    expect(sleepCategory(12, 2)).toBe('good')        // was 'long' with one 8–10 h range
    expect(sleepCategory(8, 4)).toBe('short')        // was 'good'
  })
})

describe('wallpapers 9.0', () => {
  it('has the seas', () => {
    const sea = wallsOf('sea')
    expect(sea.length).toBe(10)
    expect(sea[0].thumb).toMatch(/wallpapers\/t\/s01\.webp$/)
    expect(catOf('s03')).toBe('sea')
    expect(catOf('n03')).toBe('nature')
    expect(visibleCats().map(c => c.key)).toContain('sea')
  })
})
