// 12.0 — the keyboard avatar, in-app updates, pictures kept in the repository, the demo's own
// storage, comparing soft drinks, caffeine for teens and the much longer drink and nut lists.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { graphemes, isEmojiG, keyboardAvatar, isAvatarText, AVATAR_PICS, avatarPicUrl } from './avatar.js'
import { cmpVersion, parseRelease, checkLatest, lastCheck, autoCheck, apkUrl, APK_OFFLINE, APK_ONLINE, mb, VARIANT, WEB_APP } from './updates.js'
import { assetUrl, localUrl, REMOTE_ASSETS } from './assets.js'
import { prefixedStorage } from './storageNs.js'
import { SODAS, SODA_BY_ID, SODA_CATS, compareSodas, caffeineLimit, sodaNutrition, CAFFEINE_MAX_MG, CAFFEINE_TEEN_MG } from './sodas.js'
import { DRINKS, DRINK_BY_ID, DRINK_CATS, DING_BY_ID, drinkNutrition, drinkFlags, drinkNotes } from './drinks.js'
import { NUTS, NUT_BY_ID, NUTTY, nutDay, nutEntry, nutOfDay, nutNutrition, edibleGrams } from './nuts.js'

/** A small in-memory Storage (the tests run in Node). */
function memStorage() {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k),
    clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size },
  }
}
Object.defineProperty(globalThis, 'localStorage', { value: memStorage(), configurable: true, writable: true })

const near = (v, want, tol) => expect(Math.abs(v - want)).toBeLessThanOrEqual(tol)

describe('the keyboard avatar', () => {
  it('keeps emoji sequences whole — skin tones, flags and families', () => {
    expect(graphemes('👍🏽🇮🇶👨‍👩‍👧')).toEqual(['👍🏽', '🇮🇶', '👨‍👩‍👧'])
    expect(isEmojiG('🇮🇶')).toBe(true)
    expect(isEmojiG('A')).toBe(false)
  })
  it('takes the newest emoji typed, else the first two letters', () => {
    expect(keyboardAvatar('')).toBe(null)
    expect(keyboardAvatar('   ')).toBe(null)
    expect(keyboardAvatar('Mahdi')).toBe('Ma')
    expect(keyboardAvatar('مهدي')).toBe('مه')
    expect(keyboardAvatar('hi 🔥')).toBe('🔥')
    expect(keyboardAvatar('😀😎')).toBe('😎')
    expect(keyboardAvatar('🇮🇶')).toBe('🇮🇶')
    expect(keyboardAvatar('👍🏽')).toBe('👍🏽')
  })
  it('accepts one symbol or two letters, nothing else', () => {
    for (const v of ['🔥', '🇮🇶', '👨‍👩‍👧', 'MJ', 'م', '★']) expect(isAvatarText(v), v).toBe(true)
    for (const v of ['', 'abc', 'a b', '<b', '😀😎', 'x'.repeat(40), null, 7]) expect(isAvatarText(v), String(v)).toBe(false)
  })
  it('has ready-made pictures kept in the repository', () => {
    expect(AVATAR_PICS.length).toBeGreaterThanOrEqual(10)
    expect(new Set(AVATAR_PICS.map(a => a.id)).size).toBe(AVATAR_PICS.length)
    expect(avatarPicUrl('lion')).toBe('/avatars/lion.webp')
  })
})

describe('pictures kept in the repository', () => {
  it('come from the app itself unless the build points them at the repository', () => {
    expect(REMOTE_ASSETS).toBe(false)
    expect(assetUrl('wallpapers/n01.webp')).toBe('/wallpapers/n01.webp')
    expect(localUrl('wallpapers/t/n01.webp')).toBe('/wallpapers/t/n01.webp')
  })
})

describe('the demo keeps its own storage', () => {
  it('stores every key under a prefix and leaves the rest alone', () => {
    const real = memStorage()
    real.setItem('gym', 'real data')
    const demo = prefixedStorage(real)
    demo.setItem('gym', 'example data')
    expect(real.getItem('gym')).toBe('real data')
    expect(real.getItem('demo:gym')).toBe('example data')
    expect(demo.getItem('gym')).toBe('example data')
    expect(demo.length).toBe(1)
    expect(demo.key(0)).toBe('gym')
    demo.clear()
    expect(demo.length).toBe(0)
    expect(real.getItem('gym')).toBe('real data')
  })
})

describe('updates', () => {
  const release = {
    tag_name: 'v12.0.0', html_url: 'https://github.com/m777m44/Heroes-Jym/releases/tag/v12.0.0', published_at: '2026-10-24T12:00:00Z',
    assets: [{ name: 'MAHDI-JYM.apk', browser_download_url: 'https://x/full.apk', size: 154208607 }, { name: 'MAHDI-JYM-online.apk', browser_download_url: 'https://x/light.apk', size: 9437184 }],
  }
  const ok = body => vi.fn(async () => ({ ok: true, status: 200, json: async () => body }))
  beforeEach(() => localStorage.clear())

  it('compares versions', () => {
    expect(cmpVersion('12.0.0', '11.0.0')).toBe(1)
    expect(cmpVersion('v12.0', '12.0.0')).toBe(0)
    expect(cmpVersion('12.0.1', '12.1')).toBe(-1)
    expect(cmpVersion('10.0.0', '9.9.9')).toBe(1)
    expect(cmpVersion('', '0.0.0')).toBe(0)
  })
  it('reads a GitHub release: version, both APKs and whether it is newer', () => {
    const r = parseRelease(release, '11.0.0', 5)
    expect(r).toMatchObject({ version: '12.0.0', newer: true, checked: 5, at: '2026-10-24T12:00:00Z' })
    expect(r.offline).toEqual({ url: 'https://x/full.apk', size: 154208607 })
    expect(r.online).toEqual({ url: 'https://x/light.apk', size: 9437184 })
    expect(parseRelease(release, '12.0.0').newer).toBe(false)
    expect(parseRelease(null, '12.0.0')).toMatchObject({ version: '', newer: false, offline: null, online: null })
  })
  it('asks GitHub, remembers the answer and throws when it cannot', async () => {
    const f = ok(release)
    const r = await checkLatest({ fetchImpl: f, now: 1000, current: '11.0.0' })
    expect(f).toHaveBeenCalledTimes(1)
    expect(f.mock.calls[0][0]).toBe('https://api.github.com/repos/m777m44/Heroes-Jym/releases/latest')
    expect(r.newer).toBe(true)
    expect(lastCheck()).toMatchObject({ version: '12.0.0', checked: 1000 })
    await expect(checkLatest({ fetchImpl: vi.fn(async () => ({ ok: false, status: 403 })) })).rejects.toThrow('403')
    await expect(checkLatest({ fetchImpl: null })).rejects.toThrow()
  })
  it('checks by itself at most once a day, quietly', async () => {
    const H = 3600e3
    const f = ok(release)
    expect((await autoCheck({ fetchImpl: f, now: 10 * H, current: '11.0.0' })).version).toBe('12.0.0')
    // an hour later: the answer from earlier is reused, GitHub isn't asked again
    expect((await autoCheck({ fetchImpl: f, now: 11 * H, current: '11.0.0' })).version).toBe('12.0.0')
    expect(f).toHaveBeenCalledTimes(1)
    // up to date: nothing to say
    expect(await autoCheck({ fetchImpl: f, now: 12 * H, current: '12.0.0' })).toBe(null)
    // a day later it asks again; offline → null, never an error
    expect(await autoCheck({ fetchImpl: vi.fn(async () => { throw new Error('offline') }), now: 40 * H, current: '11.0.0' })).toBe(null)
  })
  it('links to the newest files, whatever the version', () => {
    expect(apkUrl(APK_OFFLINE)).toBe('https://github.com/m777m44/Heroes-Jym/releases/latest/download/MAHDI-JYM.apk')
    expect(apkUrl(APK_ONLINE)).toBe('https://github.com/m777m44/Heroes-Jym/releases/latest/download/MAHDI-JYM-online.apk')
    expect(WEB_APP).toBe('https://m777m44.github.io/Heroes-Jym/app/')
    expect(mb(154208607)).toBe('147')
    expect(mb(9437184)).toBe('9.0')
    expect(mb(0)).toBe('')
    expect(VARIANT).toBe('server')
  })
})

describe('soft drinks: 144, compared side by side, caffeine for teens', () => {
  it('has many more, in two new groups', () => {
    expect(SODAS.length).toBeGreaterThanOrEqual(140)
    for (const c of ['tea', 'sport']) {
      expect(SODA_CATS.some(x => x.key === c), c).toBe(true)
      expect(SODAS.filter(s => s.cat === c).length, c).toBeGreaterThanOrEqual(8)
    }
  })
  it('compares two drinks at the same size', () => {
    const coke = SODA_BY_ID.coke, zero = SODA_BY_ID.cokezero
    const r = compareSodas(coke, zero, 330, 70)
    expect(r.lighter).toBe('b')
    expect(r.kcal).toBe(sodaNutrition(coke, 330).kcal - sodaNutrition(zero, 330).kcal)
    expect(r.tsp).toBeGreaterThan(8)
    const row = k => r.rows.find(x => x.k === k)
    expect(row('kcal').best).toBe('b')
    expect(row('sugar').best).toBe('b')
    expect(row('walk').a).toBeGreaterThan(row('walk').b)
    const same = compareSodas(coke, coke, 500)
    expect(same.lighter).toBe(null)
    expect(same.rows.every(x => x.best === null)).toBe(true)
  })
  it('counts caffeine against 100 mg a day under 18', () => {
    expect(caffeineLimit(15)).toBe(CAFFEINE_TEEN_MG)
    expect(CAFFEINE_TEEN_MG).toBe(100)
    expect(caffeineLimit(18)).toBe(CAFFEINE_MAX_MG)
    expect(caffeineLimit(null)).toBe(CAFFEINE_MAX_MG)
  })
})

describe('drinks: 147, with more Iraqi classics', () => {
  it('fills every group', () => {
    expect(DRINKS.length).toBeGreaterThanOrEqual(145)
    for (const c of DRINK_CATS) expect(DRINKS.filter(d => d.cats.includes(c.key)).length, c.key).toBeGreaterThanOrEqual(12)
    expect(DRINKS.filter(d => d.cats.includes('iraqi')).length).toBeGreaterThanOrEqual(27)
    for (const id of ['maramiya', 'darseenqrunful', 'haleebzafaran', 'rummanleemon', 'raqqi', 'mishmish', 'jawafa', 'fustuqmilk', 'dibisrashimilk']) {
      expect(DRINK_BY_ID[id], id).toBeTruthy()
      expect(DRINK_BY_ID[id].story, id).toBeTruthy()
    }
  })
  it('works out the new ones from their ingredients', () => {
    near(drinkNutrition(DRINK_BY_ID.raqqi).kcal, 105, 2)                 // 350 g of watermelon
    expect(drinkFlags(DRINK_BY_ID.matchalatte).caffeine).toBe(true)     // matcha is tea
    expect(drinkFlags(DRINK_BY_ID.cashewdate)).toMatchObject({ nuts: true, dairy: true })
    expect(drinkFlags(DRINK_BY_ID.soyberry).dairy).toBe(false)          // soy milk is a plant milk
    expect(DRINK_BY_ID.maramiya.caut).toContain('preg')
    expect(drinkNutrition(DRINK_BY_ID.maramiya).kcal).toBeLessThanOrEqual(3)  // steeped sage gives almost nothing
    expect(drinkNotes(DRINK_BY_ID.jawafa).length).toBeGreaterThan(0)
    expect(DING_BY_ID.saffron && DING_BY_ID.cloves && DING_BY_ID.sage).toBeTruthy()
  })
})

describe('nuts: 111, with nut butters, Iraqi street snacks and sweets', () => {
  it('has many more', () => {
    expect(NUTS.length).toBeGreaterThanOrEqual(110)
    expect(new Set(NUTS.map(n => n.name)).size).toBe(NUTS.length)
    for (const id of ['tahini', 'pbutter', 'bagilla', 'lablabi', 'sukkari', 'ajwa', 'sayer', 'halawi', 'mann', 'baklawa', 'kleicha', 'kerzatspicy', 'kerzatsweet']) expect(NUT_BY_ID[id], id).toBeTruthy()
  })
  it('counts nut butters toward the daily handful, but the nut of the day stays a nut, seed or snack', () => {
    expect(NUTTY.has('butter')).toBe(true)
    expect(nutDay([nutEntry(NUT_BY_ID.tahini, { g: 15 }), nutEntry(NUT_BY_ID.baklawa, { g: 60 })]).g).toBe(15)
    for (let d = 1; d <= 28; d++) expect(['nut', 'seed', 'snack'], 'day ' + d).toContain(nutOfDay('2027-02-' + String(d).padStart(2, '0')).cat)
  })
  it('weighs the street snacks as they are served', () => {
    const b = NUT_BY_ID.bagilla
    expect(b.def).toBe('boiled')
    expect(b.cau).toContain('salt')
    expect(edibleGrams(b, 1, 'handful')).toBe(40)
    expect(nutNutrition(NUT_BY_ID.tahini, edibleGrams(NUT_BY_ID.tahini, 1, 'tbsp')).kcal).toBe(89)   // a spoon of tahini ≈ 89 kcal
    expect(NUT_BY_ID.sukkari.shell).toBe(true)                          // dates come with their stone
  })
})

describe('everything new is in Arabic', () => {
  it('translates the strings the app passes to t() from tables', async () => {
    const { readFileSync } = await import('node:fs')
    const { default: ar } = await import('../locales/ar.js')
    const { VARIANT_INFO } = await import('../components/AppUpdates.jsx')
    const keys = []
    for (const v of Object.values(VARIANT_INFO)) keys.push(v.title, v.sub)
    for (const a of AVATAR_PICS) keys.push(a.name)
    const src = f => readFileSync(new URL(f, import.meta.url), 'utf8')
    for (const m of src('../components/WhatsNew.jsx').matchAll(/(title|body): '((?:[^'\\]|\\.)*)'/g)) keys.push(m[2].replace(/\\'/g, "'"))
    for (const m of src('../components/ProfileSheet.jsx').matchAll(/key: '\w+', name: '([^']+)'/g)) keys.push(m[1])
    for (const m of src('../views/Sodas.jsx').matchAll(/label: '([^']+)', icon:/g)) keys.push(m[1])
    expect(keys.length).toBeGreaterThan(40)
    expect(keys.filter(k => !(k in ar))).toEqual([])
  })
})
