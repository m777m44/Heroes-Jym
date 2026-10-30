import { describe, it, expect } from 'vitest'
import { FOODS, FOOD_BY_ID, FOOD_CATS } from './foodDb.js'
import {
  MEALS, mealAt, clampQty, foodOf, foodName, dayTotals, foodGoalOf, makeEntry, addEntry, editEntry, removeEntry,
  copyDay, toggleFav, saveCustomFood, deleteCustomFood, normalize, searchFoods, recentFoods, foodWeek, foodStreak,
  foodInsights, sweetKcalOn, foodNative, servingText, entryKcal, DEFAULT_GOAL,
} from './food.js'

const D = '2026-10-22'
const prev = '2026-10-21'

describe('food database', () => {
  it('has 100+ foods with unique ids in known categories', () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(100)
    expect(new Set(FOODS.map(f => f.id)).size).toBe(FOODS.length)
    const cats = new Set(FOOD_CATS.map(c => c.key))
    for (const f of FOODS) {
      expect(cats.has(f.cat), f.id).toBe(true)
      expect(FOOD_BY_ID[f.id]).toBe(f)
    }
    for (const c of FOOD_CATS) expect(FOODS.some(f => f.cat === c.key), c.key).toBe(true)
  })

  it('has calories that roughly agree with the macros', () => {
    for (const f of FOODS) {
      expect(f.kcal, f.id).toBeGreaterThanOrEqual(0)
      expect(f.kcal, f.id).toBeLessThan(2000)
      const fromMacros = f.p * 4 + f.c * 4 + f.f * 9
      if (f.kcal >= 60) expect(Math.abs(fromMacros - f.kcal) / f.kcal, f.id).toBeLessThan(0.35)
    }
  })

  it('marks drinks in glasses and cans as millilitres', () => {
    // 13.0: a can is millilitres only on the drinks shelf — canned tuna or beans are grams
    for (const f of FOODS) if (f.unit === 'glass' || (f.unit === 'can' && f.cat === 'drinks')) expect(f.ml, f.id).toBe(true)
    expect(FOOD_BY_ID.dolma.ml).toBe(false)
    expect(FOOD_BY_ID.tunawater.ml).toBe(false)
    expect(FOOD_BY_ID.foulcan.ml).toBe(false)
  })
})

describe('food log', () => {
  it('picks the meal from the time of day', () => {
    const at = h => mealAt(new Date(2026, 9, 22, h))
    expect([at(7), at(12), at(16), at(20), at(23)]).toEqual(['b', 'l', 's', 'd', 's'])
    expect([at(1), at(3), at(4)]).toEqual(['s', 's', 'b'])                    // 10.0: late night is a snack
    expect(MEALS.map(m => m.key)).toEqual(['b', 'l', 'd', 's'])
  })

  it('clamps servings to half steps between 0.5 and 20', () => {
    expect(clampQty(1.3)).toBe(1.5)
    expect(clampQty(0)).toBe(1)
    expect(clampQty(0.2)).toBe(0.5)
    expect(clampQty(99)).toBe(20)
    expect(clampQty('abc')).toBe(1)
  })

  it('adds, totals, edits and removes entries', () => {
    const s = {}
    const a = addEntry(s, D, makeEntry(FOOD_BY_ID.dolma, { q: 2, m: 'l' }))
    addEntry(s, D, makeEntry({ n: '  كيكة  ', kcal: 250.4 }, { m: 'x' }))
    expect(s.food[D]).toHaveLength(2)
    const quick = s.food[D][1]
    expect(quick).toMatchObject({ f: null, n: 'كيكة', kcal: 250, m: 's', q: 1 })
    let tot = dayTotals(s, D)
    expect(tot.kcal).toBe(400 * 2 + 250)
    expect(tot.byMeal).toEqual({ b: 0, l: 800, d: 0, s: 250 })
    expect(tot.p).toBe(24)
    expect(tot.count).toBe(2)
    expect(entryKcal(a)).toBe(800)

    editEntry(s, D, a.id, { q: 1, m: 'd' })
    tot = dayTotals(s, D)
    expect(tot.byMeal.d).toBe(400)
    expect(editEntry(s, D, 'nope', { q: 3 })).toBe(null)

    expect(removeEntry(s, D, a.id).id).toBe(a.id)
    removeEntry(s, D, quick.id)
    expect(s.food[D]).toBeUndefined()
    expect(dayTotals(s, D).kcal).toBe(0)
  })

  it('copies a day or one meal with fresh ids', () => {
    const s = {}
    addEntry(s, prev, makeEntry(FOOD_BY_ID.dolma, { m: 'l' }))
    addEntry(s, prev, makeEntry(FOOD_BY_ID.kubba, { m: 'b' }))
    expect(copyDay(s, prev, D, 'b')).toBe(1)
    expect(s.food[D][0].f).toBe('kubba')
    expect(s.food[D][0].id).not.toBe(s.food[prev][1].id)
    expect(copyDay(s, prev, D)).toBe(2)
    expect(s.food[D]).toHaveLength(3)
    expect(copyDay(s, '2020-01-01', D)).toBe(0)
  })

  it('keeps favourites and your own foods', () => {
    const s = {}
    expect(toggleFav(s, 'dolma')).toBe(true)
    expect(toggleFav(s, 'dolma')).toBe(false)
    expect(() => saveCustomFood(s, { n: ' ', kcal: 100 })).toThrow()
    try { saveCustomFood(s, { n: 'x', kcal: 0 }) } catch (e) { expect(e.key).toMatch(/calories/) }
    const mine = saveCustomFood(s, { n: 'سلطة أمي', kcal: 180.6, p: 5.55 })
    expect(mine).toMatchObject({ kcal: 181, p: 5.6, custom: true, cat: 'mine' })
    expect(foodOf(s, mine.id)).toBe(mine)
    expect(foodName(s, { f: mine.id })).toBe('سلطة أمي')
    saveCustomFood(s, { id: mine.id, n: 'سلطة', kcal: 150 })
    expect(s.customFoods).toHaveLength(1)
    toggleFav(s, mine.id)
    const e = makeEntry(foodOf(s, mine.id), { m: 'd' })
    expect(e.f).toBe(mine.id)
    deleteCustomFood(s, mine.id)
    expect(s.customFoods).toHaveLength(0)
    expect(s.foodFav).toHaveLength(0)
  })

  it('names entries', () => {
    expect(foodName({}, { f: 'dolma' })).toBe('Dolma')
    expect(foodName({}, { f: null, n: 'Cake' })).toBe('Cake')
    expect(foodName({}, { f: null, n: '' })).toBe('Quick calories')
    expect(foodName({}, null)).toBe('')
  })
})

describe('food search', () => {
  it('normalises Arabic spelling', () => {
    expect(normalize('كُبّة')).toBe(normalize('كبه'))
    expect(normalize('أرز')).toBe('ارز')
    expect(normalize('  Kubba  (Fried) ')).toBe('kubba fried')
  })

  it('finds foods by name, best match first, and filters', () => {
    const r = searchFoods({}, 'kubba')
    expect(r[0].id).toBe('kubba')
    expect(searchFoods({}, '').length).toBe(FOODS.length)
    expect(searchFoods({}, '', 'drinks').every(f => f.cat === 'drinks')).toBe(true)
    const s = { foodFav: ['dolma'], customFoods: [{ id: 'cf1', n: 'Kubba mum', kcal: 200 }] }
    expect(searchFoods(s, '', 'fav').map(f => f.id)).toEqual(['dolma'])
    expect(searchFoods(s, '', 'mine').map(f => f.id)).toEqual(['cf1'])
    expect(searchFoods(s, 'kubba').map(f => f.id)).toContain('cf1')
    expect(searchFoods({}, 'zzzzqq')).toEqual([])
  })

  it('lists recent foods newest first, once each', () => {
    const s = { food: {
      [D]: [{ id: 1, f: 'dolma', t: 5 }, { id: 2, f: 'kubba', t: 9 }, { id: 3, f: null, n: 'x', t: 10 }],
      [prev]: [{ id: 4, f: 'dolma', t: 1 }, { id: 5, f: 'biryani', t: 2 }],
    } }
    expect(recentFoods(s, D).map(f => f.id)).toEqual(['kubba', 'dolma', 'biryani'])
    expect(recentFoods(s, D, 1)).toHaveLength(1)
  })
})

describe('food goal & insights', () => {
  it('uses the manual goal, then the calculator, then the default', () => {
    expect(foodGoalOf({}, D).source).toMatch(/default|ideal/)
    expect(foodGoalOf({ foodGoal: 1800 }, D)).toMatchObject({ kcal: 1800, source: 'manual' })
    const calc = { calGoal: { eatKcal: 1650, from: prev, days: 30 } }
    expect(foodGoalOf(calc, D)).toMatchObject({ kcal: 1650, source: 'calc' })
    expect(foodGoalOf(calc, '2026-10-01').source).not.toBe('calc')
    expect(foodGoalOf(calc, '2026-12-30').source).not.toBe('calc')
    const g = foodGoalOf({}, D)
    expect(g.kcal).toBeGreaterThan(0)
    expect(g.macros.protein).toBeGreaterThan(0)
    if (g.source === 'default') expect(g.kcal).toBe(DEFAULT_GOAL)
  })

  it('gives a week, a streak and the notification numbers', () => {
    const s = { foodGoal: 2000, food: { [D]: [{ f: 'dolma', kcal: 400, q: 1 }], [prev]: [{ kcal: 100 }], '2026-10-19': [{ kcal: 1 }] } }
    const w = foodWeek(s, D)
    expect(w).toHaveLength(7)
    expect(w[6]).toEqual({ iso: D, kcal: 400, goal: 2000 })
    expect(w[5].kcal).toBe(100)
    expect(foodStreak(s, D)).toBe(2)
    expect(foodStreak(s, '2026-10-23')).toBe(2)
    expect(foodStreak({}, D)).toBe(0)
    expect(foodNative(s, D)).toMatchObject({ day: D, eaten: 400, goal: 2000, wk: 0 })
    expect(Object.keys(foodNative(s, D))).toEqual(expect.arrayContaining(['p', 'c', 'f', 'pg', 'cg', 'fg']))
  })

  it('points out going over, low protein, fat and sweets', () => {
    const goal = { kcal: 2000, macros: { protein: 120, carbs: 200, fat: 60 } }
    expect(foodInsights({ count: 0 }, goal)).toEqual([])
    const ok = foodInsights({ count: 2, kcal: 1500, p: 100, c: 150, f: 40 }, goal)
    expect(ok[0]).toMatchObject({ tone: 'good', args: [500] })
    const over = foodInsights({ count: 5, kcal: 2600, p: 30, c: 200, f: 140 }, goal, { hour: 20, kg: 80, sweetKcal: 300 })
    expect(over[0].tone).toBe('warn')
    expect(over[0].args[0]).toBe(600)
    expect(over[0].args[1] % 5).toBe(0)
    expect(over.map(x => x.key).join('|')).toMatch(/Protein.*Fat.*Sweet/)
    expect(foodInsights({ count: 1, kcal: 2100, p: 0, c: 0, f: 0 }, goal)[0].key).toMatch(/Right at your goal/)
  })

  it('counts sweet calories and serving text', () => {
    const sweet = FOODS.find(f => f.cat === 'sweets')
    const s = { food: { [D]: [{ f: sweet.id, kcal: sweet.kcal, q: 2 }, { f: 'dolma', kcal: 400 }] } }
    expect(sweetKcalOn(s, D)).toBe(Math.round(sweet.kcal * 2))
    // soft drinks from the soft-drinks screen: the sugary ones count, zero / soda water / doogh don't (review on PR #13)
    const sd = { food: { [D]: [{ sd: 'pepsi', ml: 500, kcal: 220, q: 1 }, { sd: 'cokezero', ml: 330, kcal: 1, q: 2 }, { sd: 'soda', ml: 330, kcal: 0, q: 1 }, { sd: 'doogh', ml: 300, kcal: 90, q: 1 }] } }
    expect(sweetKcalOn(sd, D)).toBe(220)
    const U = u => u
    expect(servingText(FOOD_BY_ID.dolma, U)).toBe('1 plate · 250 g')
    expect(servingText({ custom: true }, U)).toBe('1 serving')
    expect(servingText(null, U)).toBe('1 serving')
  })
})
