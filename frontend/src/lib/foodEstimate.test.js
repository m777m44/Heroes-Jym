import { describe, it, expect, afterAll } from 'vitest'
import { estimateFood, rankFoods, scaleFood, kcalFromMacros, words, scoreWords } from './foodEstimate.js'
import { FOOD_BY_ID, FOODS } from './foodDb.js'
import { setLang, t } from './i18n.js'

describe('food estimate (7.2)', () => {
  afterAll(() => setLang('en'))
  it('has the new Iraqi dishes and fruits', () => {
    for (const id of ['kubbahamudh', 'timmanbagilla', 'guss', 'pomegranatewhole', 'mulberries', 'quince', 'barhi', 'khubzdihin', 'noomibasra']) expect(FOOD_BY_ID[id]).toBeTruthy()
    expect(FOODS.length).toBeGreaterThanOrEqual(300)
    // every food's calories agree with its macros (4/4/9) within 25 %
    for (const f of FOODS.filter(x => x.kcal > 40)) {
      const k = 4 * f.p + 4 * f.c + 9 * f.f
      expect(Math.abs(k - f.kcal) / f.kcal, f.id).toBeLessThan(0.35)
    }
  })
  it('computes calories from macros', () => {
    expect(kcalFromMacros(10, 20, 5)).toBe(165)
    expect(kcalFromMacros()).toBe(0)
    expect(kcalFromMacros('3', null, 1)).toBe(21)
  })
  it('normalises words', () => {
    expect(words('الكُبّة مع التمن')).toEqual(['كبه', 'تمن'])
    expect(words('Rice with the chicken 2')).toEqual(['rice', 'chicken'])
    expect(scoreWords(['x'], [])).toBe(0)
  })
  it('scales a food to grams', () => {
    const rice = FOOD_BY_ID.rice
    expect(scaleFood(rice, 100)).toMatchObject({ kcal: Math.round(rice.kcal / 2), g: 100 })
    expect(scaleFood(rice, null)).toMatchObject({ kcal: rice.kcal, g: rice.g })
    expect(scaleFood({ kcal: 300, p: 1, c: 2, f: 3, g: 0 }, 50)).toMatchObject({ kcal: 300, g: 0 })   // no weight → one serving
  })
  it('finds English names', () => {
    const e = estimateFood({}, 'pomegranate juice', { grams: 500 })
    expect(e.method).toBe('food')
    expect(e.match.id).toBe('pomegranatejuice')
    expect(e.kcal).toBe(270)
    expect(rankFoods({}, 'kubba').length).toBeGreaterThan(2)
  })
  it('finds Arabic names, with or without the article and ة', async () => {
    await setLang('ar')
    const a = estimateFood({}, 'كبة حامض', { tr: t })
    expect(a.match.id).toBe('kubbahamudh')
    expect(a.confidence).toBe('high')
    const b = estimateFood({}, 'الرمانة كاملة', { grams: 141, tr: t })
    expect(b.match.id).toBe('pomegranatewhole')
    expect(b.kcal).toBe(117)
    const c = estimateFood({}, 'شاي نومي بصره', { tr: t })
    expect(c.match.id).toBe('noomibasra')
    await setLang('en')
  })
  it('prefers your own foods', () => {
    const S = { customFoods: [{ id: 'cf1', n: 'Mum’s dolma', kcal: 500, p: 10, c: 60, f: 20, g: 300 }] }
    const e = estimateFood(S, 'dolma', { grams: 150 })
    expect(e.match.id).toBe('cf1')
    expect(e.kcal).toBe(250)
  })
  it('adds up ingredients, then falls back to a guess', () => {
    const e = estimateFood({}, 'zzqx eggs tomato', { grams: 200 })
    expect(['ingredients', 'food']).toContain(e.method)
    expect(e.kcal).toBeGreaterThan(0)
    const g = estimateFood({}, 'qwerty chocolate-ish dessert thing', { grams: 100 })
    expect(g.kcal).toBeGreaterThan(0)
    const n = estimateFood({}, 'zzzz', { grams: 100 })
    expect(n).toMatchObject({ method: 'guess', confidence: 'low', kcal: 150, g: 100 })
    expect(estimateFood({}, '  ')).toBe(null)
  })
})

describe('ingredientsIn (7.2)', async () => {
  const { ingredientsIn } = await import('./foodEstimate.js')
  it('finds the kitchen ingredients a name mentions', async () => {
    const ids = ingredientsIn('rice with chicken and tomato').map(x => x.id)
    expect(ids.length).toBeGreaterThanOrEqual(2)
    expect(ids.some(i => /rice/.test(i))).toBe(true)
    expect(ids.some(i => /chicken/.test(i))).toBe(true)
    expect(ids.length).toBeLessThanOrEqual(3)            // one per word — no "chicken breast" twin
    expect(ingredientsIn('')).toEqual([])
    const { plateShare } = await import('./foodEstimate.js')
    expect(plateShare(3)).toBe(120)
    expect(plateShare(5)).toBe(80)
  })
})
