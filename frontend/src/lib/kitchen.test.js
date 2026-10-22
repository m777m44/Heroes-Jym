import { describe, it, expect } from 'vitest'
import {
  ING_CATS, INGREDIENTS, ING_BY_ID, RECIPES, RECIPE_BY_ID, BASICS, itemsTotals, recipeMatch, suggestRecipes, recipeEntry,
  togglePantry, addBasics, clearPantry, addToShopping, toggleShopping, clearShoppingDone, removeShopping, saveBuiltMeal, searchIngredients,
} from './kitchen.js'
import { foodName } from './food.js'

describe('kitchen data', () => {
  it('has well-formed ingredients and recipes', () => {
    const cats = new Set(ING_CATS.map(c => c.key))
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(50)
    for (const x of INGREDIENTS) {
      expect(cats.has(x.cat)).toBe(true)
      expect(x.kcal).toBeGreaterThanOrEqual(0)
      expect(x.g).toBeGreaterThan(0)
    }
    expect(new Set(INGREDIENTS.map(x => x.id)).size).toBe(INGREDIENTS.length)
    expect(RECIPES.length).toBeGreaterThanOrEqual(40)
    expect(new Set(RECIPES.map(r => r.id)).size).toBe(RECIPES.length)
    for (const r of RECIPES) {
      expect(r.meals).toMatch(/^[blds]+$/)
      expect(r.steps.length).toBeGreaterThan(0)
      for (const i of r.ing) expect(ING_BY_ID[i.id], r.id + ':' + i.id).toBeTruthy()
    }
    for (const id of BASICS) expect(ING_BY_ID[id]).toBeTruthy()
  })
  it('has the Iraqi breakfasts the user asked for', () => {
    const names = RECIPES.map(r => r.name.toLowerCase()).join('|')
    expect(names).toMatch(/tomato/)
    expect(names).toMatch(/dibis|date syrup/)
  })
})

describe('matching and suggestions', () => {
  const r = RECIPES.find(x => x.meals.includes('b'))
  it('reports what is missing', () => {
    const m0 = recipeMatch(r, [])
    expect(m0.ready).toBe(false)
    const all = r.ing.filter(i => !i.opt).map(i => i.id)
    expect(recipeMatch(r, all)).toMatchObject({ ready: true, missing: [] })
  })
  it('puts ready recipes first and filters by meal', () => {
    const all = r.ing.filter(i => !i.opt).map(i => i.id)
    const list = suggestRecipes(all, 'b')
    expect(list.every(x => x.r.meals.includes('b'))).toBe(true)
    expect(list[0].match.ready).toBe(true)
    expect(suggestRecipes(all, 'b', { readyOnly: true }).every(x => x.match.ready)).toBe(true)
    expect(suggestRecipes(null, null).length).toBe(RECIPES.length)
  })
  it('sums nutrition and makes a loggable entry', () => {
    const t = itemsTotals([{ id: 'egg', g: 100 }])
    expect(t.kcal).toBeCloseTo(ING_BY_ID.egg.kcal, 0)
    const e = recipeEntry(r, { servings: 2, meal: 'b', now: 1 })
    expect(e).toMatchObject({ r: r.id, f: null, m: 'b', q: 2 })
    expect(e.kcal).toBeGreaterThan(0)
    expect(foodName({}, e)).toBe(RECIPE_BY_ID[r.id].name)
  })
})

describe('pantry and shopping', () => {
  it('toggles, adds the basics and clears', () => {
    const s = {}
    togglePantry(s, 'egg'); expect(s.pantry).toEqual(['egg'])
    togglePantry(s, 'egg'); expect(s.pantry).toEqual([])
    expect(addBasics(s)).toBe(BASICS.length)
    expect(addBasics(s)).toBe(0)
    clearPantry(s); expect(s.pantry).toEqual([])
  })
  it('a bought item moves into the kitchen', () => {
    const s = {}
    expect(addToShopping(s, ['egg', 'tomato'])).toBe(2)
    expect(addToShopping(s, ['egg'])).toBe(0)
    toggleShopping(s, 'egg')
    expect(s.pantry).toContain('egg')
    clearShoppingDone(s)
    expect(s.shopping.map(x => x.id)).toEqual(['tomato'])
    removeShopping(s, 'tomato'); expect(s.shopping).toEqual([])
  })
})

describe('built meals', () => {
  it('saves per serving and validates', () => {
    const s = {}
    expect(() => saveBuiltMeal(s, { n: '', items: [{ id: 'egg', g: 100 }] })).toThrow()
    expect(() => saveBuiltMeal(s, { n: 'x', items: [] })).toThrow()
    const f = saveBuiltMeal(s, { n: 'Mine', items: [{ id: 'egg', g: 200 }], servings: 2, meal: 'b' })
    expect(f.kcal).toBe(Math.round(ING_BY_ID.egg.kcal))
    expect(s.customFoods[0]).toMatchObject({ n: 'Mine', servings: 2, meal: 'b', custom: true })
    saveBuiltMeal(s, { id: f.id, n: 'Mine 2', items: [{ id: 'egg', g: 100 }] })
    expect(s.customFoods.length).toBe(1)
  })
  it('searches with Arabic normalisation', () => {
    expect(searchIngredients('').length).toBe(INGREDIENTS.length)
    expect(searchIngredients('egg').some(x => x.id === 'egg')).toBe(true)
    const tr = n => (n === ING_BY_ID.egg.name ? 'بَيْض' : n)
    expect(searchIngredients('بيض', tr).some(x => x.id === 'egg')).toBe(true)
  })
})
