// 14.0 — the Kitchen: every food and drink with a real photo (and who took it), the sections,
// search, favourites and recently, the details of a food, my own dishes with steps and a photo,
// the cooking timer's minutes, the new dishes, recipes and drinks — and all of it in Arabic.
import { describe, it, expect, beforeAll } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ar from '../locales/ar.js'
import { PHOTO_ROWS } from './photos/manifest.js'
import { photoKey, PHOTO_COUNT, itemsOfPhoto, cleanAuthor, photoUrl, driftOf, loadCredits } from './photos/index.js'
import { FOODS, FOOD_BY_ID, FOOD_CATS } from './foodDb.js'
import { KITCHEN_14 } from './foods/kitchen14.js'
import { DRINKS, DING } from './drinks.js'
import { SODAS } from './sodas.js'
import { NUTS } from './nuts.js'
import { RECIPES, RECIPE_BY_ID, INGREDIENTS, ING_BY_ID, recipeNutrition, saveBuiltMeal, STEP_TEXTS, TIP_TEXTS } from './kitchen.js'
import {
  kitchenItems, itemOf, SECTIONS, SECTION_BY_KEY, FOOD_PARTS, sectionItems, sectionCounts, findItems, FILTERS, SORTS, usefulFilters,
  dishOfDay, heroDishes, isFav, toggleItemFav, favItems, noteSeen, recentItems, SEEN_MAX, isDrinkFood,
} from './kitchenHub.js'
import { kJ, densityOf, proteinPer100kcal, burnMinutes, allergensOf, ALLERGEN_NAMES, tagsOf, isFit } from './foodDetails.js'
import { KITCHEN_FACES, KITCHEN_TOTAL } from './kitchenFaces.js'
import { stepMinutes, stepText, TPL } from './recipeText.js'
import { setLang, t } from './i18n.js'

const here = dirname(fileURLToPath(import.meta.url))
const pub = join(here, '..', '..', 'public', 'food')
const credits = JSON.parse(readFileSync(join(here, 'photos', 'credits.json'), 'utf8'))

describe('14.0 — real photos', () => {
  it('every food, recipe, drink, soft drink, nut and ingredient has a photo', () => {
    const items = [
      ...FOODS.map(f => 'F:' + f.id), ...RECIPES.map(r => 'R:' + r.id), ...DRINKS.map(d => 'D:' + d.id), ...SODAS.map(s => 'S:' + s.id),
      ...NUTS.map(n => 'N:' + n.id), ...INGREDIENTS.map(i => 'I:' + i.id), ...DING.map(i => 'J:' + i.id),
    ]
    const missing = items.filter(u => !photoKey(u[0], u.slice(2)))
    expect(missing).toEqual([])
    expect(items.length).toBeGreaterThan(1400)
  })
  it('the manifest is tidy: unique keys, each item once, only items that exist', () => {
    const keys = PHOTO_ROWS.map(r => r[0])
    expect(new Set(keys).size).toBe(keys.length)
    expect(PHOTO_COUNT).toBe(keys.length)
    const exists = new Set([
      ...FOODS.map(f => 'F:' + f.id), ...RECIPES.map(r => 'R:' + r.id), ...DRINKS.map(d => 'D:' + d.id), ...SODAS.map(s => 'S:' + s.id),
      ...NUTS.map(n => 'N:' + n.id), ...INGREDIENTS.map(i => 'I:' + i.id), ...DING.map(i => 'J:' + i.id),
    ])
    const seen = new Set()
    for (const [key, src, items] of PHOTO_ROWS) {
      expect(/^[a-z0-9]+$/.test(key), key).toBe(true)
      expect(src.split('|').every(x => /^(w|f|s):/.test(x)), key).toBe(true)
      for (const it of items.split(' ').filter(Boolean)) {
        expect(exists.has(it), key + ' → ' + it).toBe(true)
        expect(seen.has(it), 'twice: ' + it).toBe(false)
        seen.add(it)
      }
      expect(itemsOfPhoto(key).length).toBeGreaterThan(0)
    }
  })
  it('every photo is in the app: both sizes, and who took it under which free licence', () => {
    for (const [key] of PHOTO_ROWS) {
      expect(existsSync(join(pub, 'm', key + '.webp')), 'm/' + key).toBe(true)
      expect(existsSync(join(pub, 't', key + '.webp')), 't/' + key).toBe(true)
      const c = credits[key]
      expect(Array.isArray(c) && c.length === 3, key).toBe(true)
      expect(c[0].length > 3 && c[1].length > 1, key).toBe(true)
      expect(/^(CC BY(-SA)? [0-9.]+( [a-z]{2})?|CC0|Public domain|No restrictions)$/i.test(c[2]), key + ': ' + c[2]).toBe(true)
    }
    expect(Object.keys(credits).sort()).toEqual(PHOTO_ROWS.map(r => r[0]).sort())
  })
  it('photos are real photographs: no drawings, logos or GFDL-only files, and two photos never share a file unless named on purpose', () => {
    const files = Object.values(credits).map(c => c[0])
    for (const f of files) expect(/\.(jpe?g|png|webp|tiff?)$/i.test(f) && !/logo|\.svg$|illustration|drawing|clipart/i.test(f), f).toBe(true)
    const dup = files.filter((f, i) => files.indexOf(f) !== i)
    expect(dup).toEqual([])
  })
  it('loads the credits lazily, tidied', async () => {
    const c = await loadCredits()
    expect(c.dolma[0]).toMatch(/Dolma/)
    expect(Object.keys(c).length).toBe(PHOTO_COUNT)
  })
  it('names photographers without wiki clutter', () => {
    expect(cleanAuthor('w:en:User:Hakeem.gadi')).toBe('Hakeem.gadi')
    expect(cleanAuthor('Renee Comet (photographer)')).toBe('Renee Comet')
    expect(cleanAuthor('FiveRings ( talk )')).toBe('FiveRings')
    expect(cleanAuthor('No machine-readable author provided. Rainer Zenz assumed (based on copyright claims).')).toBe('Rainer Zenz')
    expect(cleanAuthor('Simon Eugster -- Simon 13:07, 2 July 2006 (UTC)')).toBe('Simon Eugster')
    expect(cleanAuthor('Unknown author Unknown author')).toBe('Unknown author')
    expect(cleanAuthor('myself (Bernard Leprêtre)')).toBe('Bernard Leprêtre')
    expect(cleanAuthor('')).toBe('Wikimedia Commons')
  })
  it('a photo has two sizes and its own slow drift', () => {
    expect(photoUrl('dolma', 'm')).toMatch(/food\/m\/dolma\.webp$/)
    expect(photoUrl('dolma')).toMatch(/food\/t\/dolma\.webp$/)
    const d = PHOTO_ROWS.map(r => driftOf(r[0]))
    expect(new Set(d)).toEqual(new Set([0, 1, 2, 3]))
    expect(driftOf('dolma')).toBe(driftOf('dolma'))
  })
  it('the Foods door shows photos that exist and counts the whole kitchen', () => {
    for (const k of KITCHEN_FACES) expect(credits[k], k).toBeTruthy()
    expect(KITCHEN_TOTAL).toBe(kitchenItems().length)
  })
})

describe('14.0 — the Kitchen hub', () => {
  it('holds every food, recipe, drink, soft drink and nut, each in at least one section', () => {
    const all = kitchenItems()
    expect(all.length).toBe(FOODS.length + RECIPES.length + DRINKS.length + SODAS.length + NUTS.length)
    const counts = sectionCounts()
    for (const s of SECTIONS) expect(counts[s.key], s.key).toBeGreaterThan(3)
    const inAny = new Set(SECTIONS.flatMap(s => all.filter(s.test).map(x => x.uid)))
    expect(all.filter(x => !inAny.has(x.uid)).map(x => x.uid)).toEqual([])
    expect(all.every(x => x.ph && credits[x.ph])).toBe(true)
  })
  it('has Food and Drinks, with my cooking, cooking, ready foods and fresh food', () => {
    expect(new Set(SECTIONS.map(s => s.group))).toEqual(new Set(['food', 'drinks']))
    expect(FOOD_PARTS.map(p => p.key)).toEqual(['cook', 'ready', 'fresh'])
    for (const s of SECTIONS) expect(credits[s.ph], s.key).toBeTruthy()
    expect(sectionItems('recipes').length).toBe(RECIPES.length)
    expect(sectionItems('iraqi').some(x => x.uid === 'F:masgouf')).toBe(true)
    expect(sectionItems('ready', 'chocolate').every(x => x.mk === 'chocolate')).toBe(true)
    expect(sectionItems('fit').some(x => x.uid === 'R:mealprep')).toBe(true)
  })
  it('keeps drinks out of the food sections and food out of the drink sections', () => {
    const foodSecs = SECTIONS.filter(s => s.group === 'food')
    for (const s of foodSecs) expect(sectionItems(s.key).filter(x => x.kind === 'S' || x.kind === 'D' || x.drink).map(x => x.uid), s.key).toEqual([])
    expect(isDrinkFood(FOOD_BY_ID.teasugar)).toBe(true)
    expect(isDrinkFood(FOOD_BY_ID.dolma)).toBe(false)
    expect(sectionItems('hot').some(x => x.uid === 'F:teasugar')).toBe(true)
    expect(sectionItems('energy').some(x => x.uid === 'S:redbull')).toBe(true)
    expect(sectionItems('milkdrinks').some(x => x.uid === 'F:milkshakechoc')).toBe(true)
  })
  it('finds in Arabic and English, filters and sorts', async () => {
    await setLang('ar')
    const ar1 = findItems(kitchenItems(), { q: 'دولمة', tr: t })
    expect(ar1[0].uid).toBe('F:dolma')
    await setLang('en')
    expect(findItems(kitchenItems(), { q: 'pepsi', tr: t }).some(x => x.uid === 'S:pepsi')).toBe(true)
    const light = findItems(sectionItems('dishes'), { filters: ['light'], sort: 'kcal' })
    expect(light.every(x => x.kcal <= 250)).toBe(true)
    for (let i = 1; i < light.length; i++) expect(light[i].kcal >= light[i - 1].kcal).toBe(true)
    const prot = findItems(sectionItems('meat'), { sort: 'protein' })
    expect(prot[0].p >= prot[prot.length - 1].p).toBe(true)
    expect(usefulFilters(sectionItems('recipes')).map(f => f.key)).toContain('quick')
    expect(SORTS.map(s => s.key)).toEqual(['usual', 'kcal', 'protein', 'az'])
  })
  it('a dish of the day with a photo, the same all day; a slideshow without repeats', () => {
    const a = dishOfDay('2026-10-30'), b = dishOfDay('2026-10-30'), c = dishOfDay('2026-10-31')
    expect(a.uid).toBe(b.uid)
    expect(a.ph).toBeTruthy()
    expect(a.uid === c.uid && dishOfDay('2026-11-01').uid === a.uid).toBe(false)
    const h = heroDishes('2026-10-30', 5)
    expect(h).toHaveLength(5)
    expect(h[0].uid).toBe(a.uid)
    expect(new Set(h.map(x => x.ph)).size).toBe(5)
  })
  it('favourites of every kind, and what you ate or opened lately', () => {
    const s = { foodFav: [], drinkFavs: [], kitchenFav: [], food: {} }
    for (const uid of ['F:dolma', 'D:greendetox', 'S:pepsi', 'N:pistachio', 'R:koshari']) {
      expect(toggleItemFav(s, itemOf(uid))).toBe(true)
      expect(isFav(s, itemOf(uid))).toBe(true)
    }
    expect(s.foodFav).toEqual(['dolma'])
    expect(s.drinkFavs).toEqual(['greendetox'])
    expect(s.kitchenFav).toEqual(['S:pepsi', 'N:pistachio', 'R:koshari'])
    expect(favItems(s)).toHaveLength(5)
    expect(toggleItemFav(s, itemOf('S:pepsi'))).toBe(false)
    s.food = { '2026-10-29': [{ f: 'samoon', t: 1 }], '2026-10-30': [{ sd: 'coke', t: 5 }, { r: 'dolma', t: 9 }] }
    for (let i = 0; i < 30; i++) noteSeen(s, 'N:' + NUTS[i].id)
    expect(s.kitchenSeen).toHaveLength(SEEN_MAX)
    const r = recentItems(s, 6)
    expect(r.slice(0, 3).map(x => x.uid)).toEqual(['R:dolma', 'S:coke', 'F:samoon'])
    expect(r).toHaveLength(6)
  })
})

describe('14.0 — everything about a food', () => {
  it('kilojoules, how filling, protein per 100 kcal, the walk that burns it', () => {
    expect(kJ(100)).toBe(418)
    expect(densityOf(80)).toBe('low')
    expect(densityOf(250)).toBe('medium')
    expect(densityOf(520)).toBe('high')
    expect(proteinPer100kcal(FOOD_BY_ID.chickenbreast)).toBeGreaterThan(15)
    const b = burnMinutes(350, 70)
    expect(b.walk).toBe(Math.round(350 / (3.5 * 3.5 * 70 / 200)))
    expect(b.run).toBeLessThan(b.walk)
    expect(burnMinutes(350, 100).walk).toBeLessThan(b.walk)
  })
  it('tags and the allergens a name suggests', () => {
    expect(allergensOf(FOOD_BY_ID.kunafa).map(a => a.key)).toEqual(expect.arrayContaining(['gluten', 'nuts']))
    expect(allergensOf(FOOD_BY_ID.tahini).map(a => a.key)).toContain('sesame')
    expect(allergensOf(FOOD_BY_ID.masgouf).map(a => a.key)).toContain('fish')
    expect(allergensOf(FOOD_BY_ID.apple)).toEqual([])
    expect(tagsOf({ ...FOOD_BY_ID.chickenbreast, fit: isFit(FOOD_BY_ID.chickenbreast) }).map(x => x.key)).toEqual(expect.arrayContaining(['fit', 'protein']))
    expect(tagsOf(itemOf('S:redbull')).map(x => x.key)).toContain('caffeine')
    expect(tagsOf(itemOf('S:cokezero')).map(x => x.key)).toContain('zero')
    expect(isFit(FOOD_BY_ID.baklava)).toBe(false)
  })
})

describe('14.0 — new dishes, recipes and drinks', () => {
  it('adds 100+ foods: Iraqi, Arab, Turkish, Persian, Indian, Western, gym meals and drinks', () => {
    expect(KITCHEN_14.length).toBeGreaterThanOrEqual(100)
    expect(FOODS.length).toBeGreaterThanOrEqual(736)
    const cats = new Set(FOOD_CATS.map(c => c.key))
    for (const f of KITCHEN_14) {
      expect(cats.has(f.cat), f.id).toBe(true)
      expect(f.fib != null && f.per100 && f.per100.fib != null, f.id).toBe(true)
      expect(photoKey('F', f.id), f.id).toBeTruthy()
    }
    for (const id of ['dawoodbasha', 'burghuldijaj', 'mandi', 'koshari', 'iskender', 'butterchicken', 'lasagna', 'mealprep', 'espresso', 'jallab', 'quinoa']) expect(FOOD_BY_ID[id], id).toBeTruthy()
    expect(KITCHEN_14.filter(f => f.fit).length).toBeGreaterThanOrEqual(15)
    expect(KITCHEN_14.filter(f => f.iraqi).map(f => f.id)).toEqual(expect.arrayContaining(['dawoodbasha', 'burghuldijaj']))
  })
  it('30 new recipes with real steps, ingredients that exist and a photo', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(102)
    const fresh = ['dawoodbasha', 'burghuldijaj', 'molokhiachicken', 'koshari', 'fatteh', 'muhammara', 'greeksalad', 'butterchicken', 'dal', 'friedrice', 'minestrone',
      'mashedpotato', 'avocadotoast', 'frenchtoast', 'mealprep', 'chickenveg', 'salmonquinoa', 'quinoasalad', 'proteinpancakes', 'parfait', 'overnightoats', 'tunawrap',
      'stirfry', 'lentilsalad', 'chickpeasalad', 'eggmuffins', 'tunapasta', 'pokebowl', 'burritobowl', 'smoothiebowl']
    for (const id of fresh) {
      const r = RECIPE_BY_ID[id]
      expect(r, id).toBeTruthy()
      expect(photoKey('R', id), id).toBeTruthy()
      for (const i of r.ing) expect(ING_BY_ID[i.id], id + ': ' + i.id).toBeTruthy()
      for (const st of r.steps) {
        expect(st != null, id).toBe(true)
        if (Array.isArray(st)) expect(TPL[st[0]], id + ': ' + st[0]).toBeTruthy()
        expect(stepText(st, x => x).length).toBeGreaterThan(5)
      }
      const n = recipeNutrition(r)
      expect(n.kcal > 50 && n.kcal < 1200, id + ' ' + n.kcal).toBe(true)
    }
    expect(RECIPES.filter(r => r.fit).length).toBeGreaterThanOrEqual(15)
  })
  it('a timer for any step that says how long', () => {
    expect(stepMinutes(['saute', 10, ['onion']])).toBe(10)
    expect(stepMinutes(['bakeAt', 180, 20])).toBe(20)
    expect(stepMinutes(['grillFor', 12])).toBe(12)
    expect(stepMinutes(['mix', ['onion']])).toBe(0)
    expect(stepMinutes('Boil the eggs for 8–10 minutes, then cool them in cold water.')).toBe(10)
    expect(stepMinutes('Pack them in a pot … and cook on low for 1 hour.')).toBe(60)
    expect(stepMinutes('اطبخها على نار هادئة ٦٠ دقيقة')).toBe(60)
    expect(stepMinutes('اتركها نص ساعة')).toBe(30)
    expect(stepMinutes('Serve hot.')).toBe(0)
  })
})

describe('14.0 — my cooking', () => {
  it('a dish keeps its steps, minutes, note and photo flag — and keeps them when edited elsewhere', () => {
    const s = { customFoods: [] }
    const f = saveBuiltMeal(s, { n: 'دولمة أمي', items: [{ id: 'rice', g: 300 }, { id: 'minced', g: 200 }], servings: 4, meal: 'l', steps: ['  لفّ الورق  ', '', 'اطبخها ساعة'], min: 90, note: 'من وصفة أمي', ph: true })
    expect(f.steps).toEqual(['لفّ الورق', 'اطبخها ساعة'])
    expect(f.min).toBe(90)
    expect(f.note).toBe('من وصفة أمي')
    expect(f.ph).toBe(true)
    expect(f.kcal).toBe(Math.round((360 * 3 + 254 * 2) / 4))
    // the meal builder saves it again without those fields: they stay
    const g = saveBuiltMeal(s, { id: f.id, n: 'دولمة أمي', items: f.items, servings: 4 })
    expect(g.steps).toEqual(f.steps)
    expect(g.min).toBe(90)
    expect(g.ph).toBe(true)
    // and they can be cleared
    const h = saveBuiltMeal(s, { id: f.id, n: 'دولمة أمي', items: f.items, servings: 4, steps: [], min: 0, note: '', ph: false })
    expect(h.steps).toBeUndefined()
    expect(h.min).toBeUndefined()
    expect(h.ph).toBeUndefined()
    expect(s.customFoods).toHaveLength(1)
  })
  it('lists my dishes and my foods apart', async () => {
    const noop = () => {}
    globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }
    globalThis.window ??= globalThis
    globalThis.addEventListener ??= noop
    const { myDishes, myFoods } = await import('./dishPhotos.js')
    const S = { customFoods: [{ id: 'a', n: 'X', kcal: 100, items: [{ id: 'egg', g: 50 }], servings: 1, ph: true }, { id: 'b', n: 'Y', kcal: 50 }] }
    expect(myDishes(S).map(d => [d.uid, d.hasPhoto])).toEqual([['M:a', true]])
    expect(myFoods(S).map(d => d.uid)).toEqual(['C:b'])
  })
})

describe('14.0 — in Arabic', () => {
  beforeAll(() => setLang('ar'))
  it('every new food, recipe, ingredient, step, tip, section, filter, tag and allergen has Arabic', () => {
    const keys = [
      ...KITCHEN_14.map(f => f.name), ...RECIPES.map(r => r.name), ...INGREDIENTS.map(i => i.name), ...STEP_TEXTS, ...TIP_TEXTS,
      ...SECTIONS.map(s => s.name), ...FOOD_PARTS.map(p => p.name), ...FILTERS.map(f => f.name), ...SORTS.map(s => s.name), ...ALLERGEN_NAMES,
      ...['iraqi', 'fit', 'protein', 'light', 'fibre', 'sugar', 'salt', 'caffeine', 'zero'].map(k => (tagsOf({ iq: k === 'iraqi', fit: k === 'fit', p: k === 'protein' ? 30 : 0, kcal: k === 'light' ? 100 : 500, fib: k === 'fibre' ? 9 : 0, sug: k === 'sugar' ? 40 : 0, na: k === 'salt' ? 900 : 0, caf: k === 'caffeine' ? 80 : 0, zero: k === 'zero' }).find(x => x.key === k) || {}).name),
    ]
    const missing = [...new Set(keys)].filter(k => k && !(k in ar))
    expect(missing).toEqual([])
    expect(t('Kitchen')).toBe('المطبخ')
    expect(t('My cooking')).toBe('طبخي الخاص')
    expect(t('Ready foods')).toBe('أطعمة جاهزة')
    expect(t('Beverages')).toBe('الشراب')
    expect(t('Food')).toBe('الطعام')
  })
  it('Arabic text has no runs of Latin letters', () => {
    for (const k of [...KITCHEN_14.map(f => f.name), ...SECTIONS.map(s => s.name)]) expect(/[A-Za-z]{2}/.test(ar[k]), k + ' → ' + ar[k]).toBe(false)
  })
})
