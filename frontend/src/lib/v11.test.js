// 11.0 — water pace, the walk across Iraq, the profile picture helpers, more Iraqi drinks and food.
import { describe, it, expect } from 'vitest'
import { waterPace } from './water.js'
import { IRAQ_ROUTE, ROUTE_KM, journeyOf, journeyFor, totalSteps, pointAt, mapXY } from './journey.js'
import { AVATAR_EMOJI, EMOJI_SET, AVATAR_ICONS, AVATAR_COLORS, isAvatarPhoto, squareCrop } from './avatar.js'
import { DRINKS, DRINK_BY_ID, drinkNutrition } from './drinks.js'
import { FOOD_BY_ID } from './foodDb.js'

const at = (h, m = 0) => new Date(2026, 9, 24, h, m)

describe('water pace', () => {
  it('spreads the goal over your day and says ahead, on track or behind', () => {
    // 09:00–22:00, 2,600 ml: at 15:30 half the day is gone → 1,300 ml due
    expect(waterPace(2600, 1300, at(15, 30), '09:00', '22:00')).toMatchObject({ due: 1300, diff: 0, state: 'on' })
    expect(waterPace(2600, 1600, at(15, 30)).state).toBe('ahead')
    const b = waterPace(2600, 800, at(15, 30))
    expect(b).toMatchObject({ state: 'behind', diff: -500, left: 1800 })
    expect(b.perHour).toBe(280)                       // 1,800 ml over the 6.5 h left
    expect(waterPace(2600, 0, at(7)).state).toBe('early')
    expect(waterPace(2600, 2000, at(23)).state).toBe('late')
    expect(waterPace(2600, 2700, at(12)).state).toBe('done')
    // bad hours fall back to 09:00–22:00
    expect(waterPace(2600, 1300, at(15, 30), 'x', '25:00').due).toBe(1300)
  })
})

describe('from Zakho to Fao', () => {
  it('walks the road north to south, city by city', () => {
    expect(IRAQ_ROUTE[0].name).toBe('Zakho')
    expect(IRAQ_ROUTE[IRAQ_ROUTE.length - 1].name).toBe('Fao')
    expect(ROUTE_KM).toBe(1360)
    for (let i = 1; i < IRAQ_ROUTE.length; i++) {
      expect(IRAQ_ROUTE[i].at).toBeGreaterThan(IRAQ_ROUTE[i - 1].at)
      expect(IRAQ_ROUTE[i].lat).toBeLessThan(IRAQ_ROUTE[0].lat)          // always south of Zakho
    }
    const j = journeyOf(500)                                            // between Samarra (490) and Baghdad (615)
    expect([j.last.name, j.next.name, Math.round(j.toGo), j.lap]).toEqual(['Samarra', 'Baghdad', 115, 1])
    expect(journeyOf(0)).toMatchObject({ passed: 1, next: IRAQ_ROUTE[1] })
    const lap2 = journeyOf(ROUTE_KM + 75)
    expect([lap2.lap, lap2.last.name, lap2.next.name]).toEqual([2, 'Duhok', 'Mosul'])
    expect(journeyOf(ROUTE_KM - 1).next.name).toBe('Fao')
    // the map: north at the top, the marker between its two stops
    const [x0, y0] = mapXY(IRAQ_ROUTE[0]), [, yF] = mapXY(IRAQ_ROUTE[IRAQ_ROUTE.length - 1])
    expect(yF).toBeGreaterThan(y0)
    expect(x0).toBeGreaterThanOrEqual(0)
    const p = pointAt(500), s = mapXY(IRAQ_ROUTE[6]), b = mapXY(IRAQ_ROUTE[7])
    expect(p[1]).toBeGreaterThan(Math.min(s[1], b[1]))
    expect(p[1]).toBeLessThan(Math.max(s[1], b[1]))
  })
  it('counts every step of the history with your stride', () => {
    const S = { steps: { '2026-10-20': { n: 10000 }, '2026-10-21': { n: 12000 }, '2026-10-22': 3000 }, walk: { strideCm: 80 } }
    expect(totalSteps(S)).toBe(25000)
    expect(journeyFor(S)).toMatchObject({ steps: 25000, km: 20 })
    expect(journeyFor({}).km).toBe(0)
  })
})

describe('profile picture', () => {
  it('has hundreds of symbols in groups, the icons and 24 colours', () => {
    expect(EMOJI_SET.size).toBeGreaterThanOrEqual(250)
    expect(AVATAR_EMOJI.map(g => g.key)).toEqual(['faces', 'sport', 'animals', 'nature', 'food', 'iraq', 'things', 'hearts'])
    for (const g of AVATAR_EMOJI) expect(new Set(g.list).size, g.key).toBe(g.list.length)
    expect(AVATAR_ICONS.length).toBeGreaterThanOrEqual(30)
    expect(AVATAR_COLORS.length).toBe(24)
  })
  it('keeps only a small image of its own, cropped to the centre square', () => {
    expect(isAvatarPhoto('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true)
    expect(isAvatarPhoto('https://example.com/me.jpg')).toBe(false)
    expect(isAvatarPhoto('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false)
    expect(isAvatarPhoto('data:image/jpeg;base64,' + 'A'.repeat(250000))).toBe(false)
    expect(squareCrop(400, 300)).toEqual({ sx: 50, sy: 0, side: 300 })
    expect(squareCrop(300, 500)).toEqual({ sx: 0, sy: 100, side: 300 })
  })
})

describe('more Iraqi drinks and everyday food', () => {
  it('adds the teas, the juice shop and the winter drinks, counted from their ingredients', () => {
    expect(DRINKS.filter(d => d.cats.includes('iraqi')).length).toBeGreaterThanOrEqual(35)
    for (const id of ['chaihaleeb', 'chailemon', 'chainaana', 'kakao', 'haleebdibis', 'qahwaturkiya', 'nescafe', 'sharbatlemon', 'hamudhhilu', 'purtaqal', 'jazar', 'tuffah', 'inab', 'manga', 'mozhaleeb', 'farawlahaleeb', 'cocktail']) {
      const d = DRINK_BY_ID[id]
      expect(d, id).toBeTruthy()
      expect(d.story, id).toBeTruthy()
    }
    expect(DRINK_BY_ID.nescafe.caut).toContain('caffeine')
    const k = drinkNutrition(DRINK_BY_ID.mozhaleeb).kcal
    expect(k).toBeGreaterThan(220)                      // a glass of milk and a banana
    expect(k).toBeLessThan(300)
    expect(drinkNutrition(DRINK_BY_ID.qahwaturkiya).kcal).toBeLessThan(5)   // without the optional sugar
  })
  it('adds eggs and bread, sandwiches and rice with stew', () => {
    expect(FOOD_BY_ID.eggsamoon.kcal).toBe(FOOD_BY_ID.egg.kcal * 2 + FOOD_BY_ID.samoon.kcal)
    expect(FOOD_BY_ID.timmanfasolia.kcal).toBe(FOOD_BY_ID.rice.kcal + FOOD_BY_ID.fasolia.kcal)
    for (const id of ['iraqibreakfast', 'cheesesandwich', 'labnehsandwich', 'sheikhmahshi', 'shifta', 'makarona', 'amba', 'arnoos', 'shamiya']) expect(FOOD_BY_ID[id], id).toBeTruthy()
  })
})
