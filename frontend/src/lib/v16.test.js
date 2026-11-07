// 16.0 — Abu Janna's drinks and Iraq's other drink makers, caffeine in your body, the lighter offline
// APK (exercise animations as MP4) and the product photos from Open Food Facts.
import { describe, it, expect } from 'vitest'
import ar from '../locales/ar.js'
import { SODAS, SODA_BY_ID, sodaNutrition, searchSodas, SODA_SWAP, caffeineLimit } from './sodas.js'
import { BRANDS, BRAND_BY_KEY, brandOf, brandSodas, brandWords, MADE_IN_IRAQ } from './brands.js'
import { FOOD_BY_ID } from './foodDb.js'
import { PHOTO_ROWS } from './photos/manifest.js'
import { commonsUrl, isOffFile, fileLabel } from './photos/index.js'
import {
  remaining, levelAt, caffeineDoses, caffeineNow, afterDrink, caffeineWeek, energyFreeDays, entryCaffeine, entryTime,
  nextBedtime, bedtimeOf, underAt, isoOf, SLEEP_OK_MG,
} from './caffeineLive.js'
import { videoName } from './exercises.js'
import { parseSources, offPath, offAuthor, OFF_LICENCE } from '../../scripts/food-photos/fetch.mjs'
import { mp4Name, FFMPEG_ARGS } from '../../scripts/convert-media.mjs'
import { FEATURED, featuredCount } from './kitchenHub.js'

const latin = s => /[A-Za-z]{2}/.test(String(s).replace(/\{\d\}/g, '').replace(/MAHDI-JYM/g, ''))
const H = 3600e3

describe('16.0 — Abu Janna and Iraq’s drink makers', () => {
  it('Abu Janna: 4U, Three Stars and his soft drink in lemon & mint and in mint, with his restaurant’s fish', () => {
    const b = BRAND_BY_KEY.abujanna
    expect(b.featured).toBe(true)
    expect(BRANDS[0].key).toBe('abujanna')
    expect(brandSodas('abujanna').map(s => s.id)).toEqual(['fouru', 'threestars', 'abujannalm', 'abujannamint'])
    for (const id of b.foods) expect(FOOD_BY_ID[id], id).toBeTruthy()
    // the lemon & mint label (Open Food Facts 0729927750910): 11.5 g sugar per 100 ml, a 330 ml can, no caffeine
    const lm = SODA_BY_ID.abujannalm
    expect([lm.s100, lm.cf100, lm.def.pk, lm.def.ml]).toEqual([11.5, 0, 'can', 330])
    expect(sodaNutrition(lm, 330).sugar).toBeCloseTo(38, 0)
    expect(SODA_BY_ID.threestars.energy && SODA_BY_ID.fouru.energy).toBe(true)
    expect(sodaNutrition(SODA_BY_ID.threestars, 250).caffeine).toBe(80)
  })
  it('every maker’s drinks exist, each drink has one maker, and the sugar-free swap still points somewhere real', () => {
    const seen = new Set()
    for (const b of BRANDS) {
      expect(b.sodas.length, b.key).toBeGreaterThan(0)
      for (const id of b.sodas) { expect(SODA_BY_ID[id], b.key + ' → ' + id).toBeTruthy(); expect(seen.has(id), id).toBe(false); seen.add(id) }
      expect(brandOf(b.sodas[0]).key).toBe(b.key)
    }
    expect(MADE_IN_IRAQ.size).toBe(seen.size)
    for (const id of ['threestars', 'abujannalm', 'abujannamint', 'wildlion']) expect(SODA_BY_ID[SODA_SWAP[id]], id).toBeTruthy()
    expect(brandOf('coke')).toBe(null)
  })
  it('finds them however they are written: ابو جنه, أبو جنة, فور يو, ٣ ستارز, 3 stars, Abu Janna', () => {
    for (const q of ['ابو جنه', 'أبو جنة', 'abu janna', 'فور يو', 'فوريو', '٣ ستارز', '3 stars', 'ثري ستار']) {
      const ids = searchSodas({ q, words: brandWords }).map(s => s.id)
      expect(ids, q).toContain('fouru')
      expect(ids, q).toContain('threestars')
    }
    expect(searchSodas({ q: 'نعناع', words: brandWords }).map(s => s.id)).toContain('abujannamint')
    expect(searchSodas({ only: MADE_IN_IRAQ }).length).toBe(MADE_IN_IRAQ.size)
  })
  it('the Kitchen has a door to Abu Janna’s drinks', () => {
    const f = FEATURED.find(x => x.key === 'abujanna')
    expect(f.to).toBe('/sodas?brand=abujanna')
    expect(featuredCount(f)).toBe(4)
  })
  it('everything new is in Arabic, with no runs of Latin letters', () => {
    const keys = [
      ...BRANDS.flatMap(b => [b.name, b.place, b.about]), ...['threestars', 'abujannalm', 'abujannamint', 'wildlion'].map(id => SODA_BY_ID[id].name),
      'Abu Janna drinks', 'Made in Iraq', 'Caffeine in your body', 'From his restaurant in Mosul', '{0} drinks',
    ]
    for (const k of keys) {
      expect(ar[k], k).toBeTruthy()
      if (k !== 'ASPI RASH') expect(latin(ar[k]), k + ' → ' + ar[k]).toBe(false)
    }
  })
})

describe('16.0 — caffeine in your body', () => {
  const now = new Date('2026-11-07T15:00:00').getTime()
  const iso = isoOf(now)
  const S = { planner: { sleep: '23:00' }, food: { [iso]: [
    { id: 'a', sd: 'fouru', pk: 'can', ml: 250, q: 1, m: 's', t: now - 2 * H },
    { id: 'b', f: 'americano', q: 1, m: 'b', t: now - 6 * H },
    { id: 'c', f: 'dolma', q: 1, m: 'l', t: now - 3 * H },
  ] } }
  it('one drink goes in over about 45 minutes, then halves about every 5 hours', () => {
    expect(remaining(100, 0)).toBe(0)
    expect(remaining(100, 0.75)).toBeGreaterThan(85)
    expect(remaining(100, 0.75)).toBeLessThan(95)
    expect(remaining(100, 5.75) / remaining(100, 0.75)).toBeCloseTo(0.5, 1)
    expect(remaining(100, 30)).toBeLessThan(2)
  })
  it('counts soft drinks by their label, coffees and teas from the shelves — and nothing else', () => {
    expect(entryCaffeine(S.food[iso][0])).toBe(80)
    expect(entryCaffeine(S.food[iso][1])).toBe(95)
    expect(entryCaffeine(S.food[iso][2])).toBe(0)
    expect(caffeineDoses(S, now).map(d => d.mg)).toEqual([95, 80])
    // a copied entry keeps the copy's time stamp from another day → its meal's usual time
    expect(new Date(entryTime({ m: 'b', t: now - 3 * 24 * H }, iso)).getHours()).toBe(8)
  })
  it('the level now, today against the limit for your age, bedtime, and when it drops under 50 mg', () => {
    const teen = caffeineNow(S, { now, age: 16 })
    expect(teen.total).toBe(175)
    expect(teen.limit).toBe(caffeineLimit(16))
    expect(teen.over).toBe(true)
    expect(teen.level).toBeGreaterThan(90)
    expect(teen.level).toBeLessThan(120)
    expect(new Date(teen.bed).getHours()).toBe(23)
    expect(teen.atBed).toBeLessThan(SLEEP_OK_MG)
    expect(teen.sleepOk).toBe(true)
    expect(teen.under).toBeGreaterThan(now)
    expect(levelAt(teen.doses, teen.under)).toBeLessThan(SLEEP_OK_MG)
    const adult = caffeineNow(S, { now, age: 30 })
    expect([adult.limit, adult.over]).toEqual([400, false])
    expect(caffeineNow({}, { now }).active).toBe(false)
  })
  it('what one more can would do', () => {
    const a = afterDrink(S, 80, { now, age: 16 })
    expect(a.total).toBe(255)
    expect(a.atBed).toBeGreaterThan(caffeineNow(S, { now }).atBed)
    expect(a.sleepOk).toBe(false)
  })
  it('a drink just had is still going in: "under 50 mg" waits for its peak', () => {
    const d = [{ t: now, mg: 60 }]
    const at = underAt(d, now)
    expect(at).toBeGreaterThan(now + H)
  })
  it('bedtime from My schedule (then Ideal body, then 23:00); at 00:30 it is still last night’s', () => {
    expect(bedtimeOf({ planner: { sleep: '22:30' }, day: { sleep: '23:30' } })).toBe('22:30')
    expect(bedtimeOf({ day: { sleep: '23:30' } })).toBe('23:30')
    expect(bedtimeOf({})).toBe('23:00')
    const late = new Date('2026-11-08T00:30:00').getTime()
    expect(new Date(nextBedtime({}, late)).getDate()).toBe(7)
    expect(new Date(nextBedtime({}, new Date('2026-11-08T03:00:00').getTime())).getDate()).toBe(8)
  })
  it('the last 7 days and the days in a row without an energy drink', () => {
    const S2 = { food: { ...S.food, '2026-11-02': [{ id: 'x', sd: 'threestars', ml: 250, q: 2, t: new Date('2026-11-02T18:00:00').getTime() }] } }
    const w = caffeineWeek(S2, now)
    expect(w.length).toBe(7)
    expect(w[w.length - 1]).toMatchObject({ iso, mg: 175, energy: 1 })
    expect(w.find(d => d.iso === '2026-11-02')).toMatchObject({ mg: 160, energy: 2 })
    expect(energyFreeDays(S2, now)).toBe(0)
    expect(energyFreeDays({ food: { '2026-11-02': S2.food['2026-11-02'] } }, now)).toBe(5)
    expect(energyFreeDays({}, now)).toBe(null)
  })
})

describe('16.0 — product photos from Open Food Facts', () => {
  it('reads o:<barcode>/<image> sources and @contain', () => {
    const p = parseSources('o:0729927750910/15@contain')
    expect(p.contain).toBe(true)
    expect(p.list[0]).toMatchObject({ kind: 'o', code: '0729927750910', img: '15', value: 'off:0729927750910/15' })
    expect(parseSources('w:Masgouf@top')).toMatchObject({ focus: 'top', contain: false })
    expect(() => parseSources('o:abc/1')).toThrow()
    expect(offPath('0729927750910')).toBe('072/992/775/0910')
    expect(offAuthor('ah40')).toBe('ah40 · Open Food Facts')
    expect(offAuthor('07811671071')).toBe('Open Food Facts contributors')   // a phone number is never shown
    expect(OFF_LICENCE).toBe('CC BY-SA 3.0')
  })
  it('Abu Janna’s soft drinks show their own photos; the credit links to the product', () => {
    const rows = Object.fromEntries(PHOTO_ROWS.map(r => [r[0], r]))
    expect(rows.abujannalm[1]).toMatch(/^o:0729927750910\//)
    expect(rows.abujannamint[1]).toMatch(/^o:0729927750958\//)
    expect(isOffFile('off:0729927750910/15')).toBe(true)
    expect(commonsUrl('off:0729927750910/15')).toBe('https://world.openfoodfacts.org/product/0729927750910')
    expect(fileLabel('off:0729927750910/15')).toBe('Open Food Facts · 0729927750910')
    expect(commonsUrl('Masgouf.jpg')).toBe('https://commons.wikimedia.org/wiki/File:Masgouf.jpg')
  })
})

describe('16.0 — the lighter offline APK', () => {
  it('animations as small H.264 videos with the same names', () => {
    expect(mp4Name('0001-2gPfomN.gif')).toBe('0001-2gPfomN.mp4')
    expect(videoName('0001-2gPfomN.gif')).toBe(mp4Name('0001-2gPfomN.gif'))
    const a = FFMPEG_ARGS.join(' ')
    expect(a).toContain('libx264')
    expect(a).toContain('+faststart')
    expect(a).toContain('yuv420p')
    expect(a).toContain('-an')
    expect(a).not.toMatch(/scale=\d/)   // the 180 × 180 size stays (the media owner's terms)
  })
})
