// 13.1 — your school & work week with a reminder at every step (a midnight bedtime too), a walk
// that carries its water, the day in the order you live it, the week at a glance and as text to
// share; and what Iraqi shops sell in packets, cans and jars — the "Shops & markets" shelf.
import { describe, it, expect, beforeAll } from 'vitest'
import ar from '../locales/ar.js'
import {
  newPlan, normPlan, blocksOn, dayOrder, weekTypes, planText, planNotifications, planAlarms, blockText, blockMl, upsertBlock, buildTemplate,
  liveState, extendNow, dayBlocks, toMin, toHHMM, carriesWater, KIND_EMOJI, blockEmoji, TEMPLATE_TEXTS, TEMPLATES, SCHOOL_DAYS, WEEKEND,
} from './dayPlan.js'
import { FOODS, FOOD_BY_ID, MARKET_COUNT, MARKET_AISLES } from './foodDb.js'
import { MARKET, MARKET_TYPES, MARKET_OLD } from './foods/market.js'
import { MORE_FOODS } from './foods/index.js'
import { searchFoods, hasWord, normalize, SYNONYMS } from './food.js'
import { setLang, t } from './i18n.js'

const school = () => ({ ...newPlan('school', {}, { seed: 1 }), remind: true })

describe('13.1 — the school & work week', () => {
  it('reads from the morning down to the midnight bedtime', () => {
    const P = school()
    const raw = blocksOn(P, 0)
    expect(raw[0]).toMatchObject({ k: 'sleep', s: 0 })                        // by the clock the night comes first …
    const day = dayOrder(raw)
    expect(day[0]).toMatchObject({ k: 'water', s: toMin('07:00') })            // … as you live it, it closes the day
    expect(day.at(-1)).toMatchObject({ k: 'sleep', s: 0, n: 'Lock up & sleep' })
    expect(day).toHaveLength(raw.length)
    // a sleep after suhoor (05:00) or a 23:00 bedtime: the order stays as it is
    const ramadan = buildTemplate('ramadan', {}, { suhoor: '04:30', iftar: '18:30' })
    expect(dayOrder(ramadan)).toEqual(ramadan)
    const late = normPlan({ blocks: [{ id: 'a', k: 'meal', s: toMin('00:15'), d: 15, meal: 's' }, { id: 'b', k: 'sleep', s: toMin('00:30'), d: 420 }, { id: 'c', k: 'wake', s: toMin('07:30'), d: 10 }] })
    expect(dayOrder(late.blocks).map(b => b.id)).toEqual(['c', 'a', 'b'])   // the snack before a 00:30 bedtime closes the day too
    expect(dayOrder([])).toEqual([])
  })

  it('reminds at every step — the 00:00 bedtime too, a sleep after suhoor stays quiet', () => {
    const P = school()
    const mon = new Date(2026, 10, 1, 21, 0)                                    // Sunday 1 November, 21:00
    const list = planNotifications({}, P, mon, undefined, undefined, { days: 2 })
    const bed = list.find(n => n.kind === 'sleep')
    expect(bed.at.getDate()).toBe(2)
    expect([bed.at.getHours(), bed.at.getMinutes()]).toEqual([0, 0])
    expect(bed.title).toBe('Lock up & sleep · 00:00')
    expect(bed.body).toBe('Phone, screens and lights off — everything locked')
    // tonight: water & a break at 22:00, study at 22:30, the snack at 23:45, then lights out
    expect(list.slice(0, 4).map(n => toHHMM(n.at.getHours() * 60 + n.at.getMinutes()))).toEqual(['22:00', '22:30', '23:45', '00:00'])
    const R = { ...normPlan({ blocks: buildTemplate('ramadan', {}, { suhoor: '04:30', iftar: '18:30' }) }), remind: true }
    const quiet = R.blocks.filter(b => b.k === 'sleep' && b.s >= 60 && b.s < 360)
    expect(quiet.length).toBe(1)
    expect(planAlarms({}, R, mon).some(a => a.block === quiet[0].id)).toBe(false)
    // the phone: one alarm per block, the free mornings quiet — and every alarm says what to do
    const al = planAlarms({}, P, mon)
    expect(al.length).toBe(P.blocks.filter(b => b.rm !== -1).length)
    expect(al.find(a => a.kind === 'school')).toMatchObject({ start: toMin('07:30'), w: SCHOOL_DAYS })
    expect(al.find(a => a.title.startsWith('Go to work'))).toMatchObject({ start: toMin('13:40'), w: SCHOOL_DAYS })
    expect(al.find(a => a.title.startsWith('Back to work'))).toMatchObject({ start: toMin('16:44') })
    expect(al.find(a => a.title.startsWith('Finish all your work'))).toMatchObject({ start: toMin('18:15') })
    expect(al.length).toBeLessThan(60)
  })

  it('a walk carries the water you drink on the way', () => {
    expect([carriesWater('water'), carriesWater('walk'), carriesWater('study')]).toEqual([true, true, false])
    const s = { planner: newPlan('custom') }
    const a = upsertBlock(s, { k: 'walk', s: 1140, d: 60, ml: 500 })
    const b = upsertBlock(s, { k: 'walk', s: 1240, d: 30 })
    const c = upsertBlock(s, { k: 'study', s: 600, d: 60, ml: 400 })
    const by = id => s.planner.blocks.find(x => x.id === id)
    expect([by(a).ml, by(b).ml, by(c).ml]).toEqual([500, undefined, undefined])
    expect(blockMl({}, by(a))).toBe(500)
    expect(blockMl({}, by(c))).toBe(0)
    const tx = blockText({}, by(a))
    expect(tx.body).toBe('A 60-minute walk — take 500 ml of water and drink as you go.')
    expect(tx.lines).toContain('💧 500 ml')
    expect(blockText({}, by(b)).body).toBe('A 30-minute walk — fresh air and steps.')
  })

  it('+10 at 06:55 keeps the sleep on today’s date and school at 07:30', () => {
    const s = { planner: school() }
    const thu = new Date(2026, 9, 29, 6, 55), iso = '2026-10-29'
    const L = liveState(s.planner, null, thu)
    expect(L.cur.b).toMatchObject({ k: 'sleep', s: 0 })
    extendNow(s, L.cur, 10, thu)
    const day = dayOrder(dayBlocks(s.planner, iso))
    expect(day.find(b => b.k === 'water').s).toBe(toMin('07:10'))
    expect(day.find(b => b.k === 'meal' && b.meal === 'b').s).toBe(toMin('07:20'))
    expect(day.find(b => b.k === 'school')).toMatchObject({ s: toMin('07:30'), d: 310 })
    expect(day.find(b => b.n === 'Go to work').s).toBe(toMin('13:40'))
  })

  it('sees the week as two kinds of day — Sunday–Thursday and Friday & Saturday', () => {
    const P = school()
    const types = weekTypes(P, 6)
    expect(types.map(x => x.days)).toEqual([[0, 1, 2, 3, 4], [6, 5]])
    const [sd, we] = types
    expect([...we.days].sort()).toEqual(WEEKEND)
    expect(sd.rows).toHaveLength(18)
    expect(we.rows).toHaveLength(19)
    expect(sd.rows.at(-1).b).toMatchObject({ k: 'sleep', s: 0 })
    // lunch, dinner and the snack change from day to day, breakfast doesn't
    const same = n => sd.rows.find(r => (r.b.n || r.b.meal) === n).same
    expect([same('b'), same('Lunch & rest'), same('d'), same('Light snack'), same('Take a break')]).toEqual([true, false, false, false, true])
    expect(sd.rows.find(r => r.b.n === 'Lunch & rest').each.map(b => b.w[0])).toEqual([0, 1, 2, 3, 4])
    // one kind for a plan with no weekdays
    expect(weekTypes(newPlan('workout'), 6).map(x => x.days.length)).toEqual([7])
    expect(weekTypes(null)).toEqual([])
  })

  it('writes the week as text to share, with an emoji for each step', () => {
    const P = school()
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const txt = planText({}, P, { names, mealName: m => ({ b: 'Breakfast', l: 'Lunch', d: 'Dinner', s: 'Snack' })[m] })
    const lines = txt.split('\n')
    expect(lines[0]).toBe('🗓️ My schedule')
    expect(lines).toContain('📅 Sun–Thu')
    expect(lines).toContain('📅 Sat · Fri')
    expect(lines).toContain('07:00 – 07:10  🥤 Drink water — 💧 300 ml')
    expect(lines).toContain('07:10 – 07:20  🍳 Breakfast — Boiled egg × 2, Arabic bread')
    expect(lines).toContain('07:30 – 12:40  🏫 Go to school')
    expect(lines).toContain('13:00 – 13:40  🍲 Lunch & rest')                      // a different dish each day — not listed
    expect(lines).toContain('19:00 – 20:00  🚶 Walk with water — 💧 500 ml')
    expect(lines).toContain('00:00  😴 Lock up & sleep')
    expect(lines.indexOf('00:00  😴 Lock up & sleep')).toBeGreaterThan(lines.indexOf('23:45 – 00:00  🥜 Light snack'))
    // your words for the days, your language, your separator
    const t2 = planText({}, P, { names, tr: (k, ...a) => 'AR:' + k.replace(/\{(\d)\}/g, (_, i) => a[i]), label: d => d.length + ' days', sep: '، ' })
    expect(t2).toContain('📅 5 days')
    expect(t2).toContain('AR:Go to school')
    expect(t2).toContain('AR:Boiled egg × 2، AR:Arabic bread')
    for (const k of Object.keys(KIND_EMOJI)) expect(blockEmoji({ k })).toBe(KIND_EMOJI[k])
    expect(blockEmoji({ k: 'other', ic: 'shirt' })).toBe('👕')
    expect(blockEmoji({ k: 'meal', meal: 's' })).toBe('🥜')
  })

  it('speaks Arabic: the template, its blocks and notes', () => {
    for (const k of TEMPLATE_TEXTS) expect(ar[k], k).toBeTruthy()
    for (const x of TEMPLATES) { expect(ar[x.name], x.name).toBeTruthy(); expect(ar[x.desc], x.id).toBeTruthy() }
    for (const k of ['A {0}-minute walk — take {1} ml of water and drink as you go.', 'Week at a glance', 'Share my schedule', 'Sunday – Thursday', 'Friday & Saturday'])
      expect(ar[k], k).toBeTruthy()
    expect(ar['Lock up & sleep']).toBe('قفل كل شيء والنوم')
    expect(ar['Back to work']).toBe('بدء العمل')
  })
})

describe('13.1 — the "Shops & markets" shelf', () => {
  it('adds 100+ packaged foods from Iraqi shops, 300+ on the shelf, in 14 aisles', () => {
    expect(MARKET.length).toBeGreaterThanOrEqual(100)
    expect(MARKET_COUNT).toBeGreaterThanOrEqual(300)
    expect(FOODS.length).toBeGreaterThanOrEqual(620)
    expect(new Set(FOODS.map(f => f.id)).size).toBe(FOODS.length)
    expect(MARKET_AISLES.map(a => a.key)).toEqual(MARKET_TYPES.map(a => a.key))
    for (const a of MARKET_AISLES) expect(a.n, a.key).toBeGreaterThanOrEqual(5)
    for (const f of MARKET) expect(MARKET_TYPES.some(a => a.key === f.mk), f.id).toBe(true)
    for (const f of MARKET) expect(MORE_FOODS).toContain(f)
    // the older packaged foods join their aisle; whole shelves come with theirs
    for (const [mk, ids] of Object.entries(MARKET_OLD)) for (const id of ids) expect(FOOD_BY_ID[id].mk, id).toBe(mk)
    expect(FOODS.filter(f => f.cat === 'noodles').every(f => f.mk === 'noodles')).toBe(true)
    expect(FOODS.filter(f => f.cat === 'canned').every(f => f.mk === 'canned')).toBe(true)
    expect(FOOD_BY_ID.dolma.mk).toBeUndefined()                                  // a home dish isn't sold in a packet
  })

  it('has what was asked for: cake, mahshi, Indomie, halqoum and alij — and much more', () => {
    const mk = a => FOODS.filter(f => f.mk === a)
    const has = (list, re) => list.filter(f => re.test(f.name)).length
    expect(has(mk('cakes'), /cake/i)).toBeGreaterThanOrEqual(20)                   // date cakes + packaged cakes
    expect(has(mk('canned'), /mahshi|stuffed/i)).toBeGreaterThanOrEqual(6)
    expect(has(mk('noodles'), /Indomie/)).toBeGreaterThanOrEqual(40)
    expect(has(mk('noodles'), /Samyang|Maggi|Nissin|Koka|Shin/)).toBeGreaterThanOrEqual(8)
    expect(has(mk('sweets'), /Halqoum|Turkish delight/)).toBeGreaterThanOrEqual(5)
    expect(has(mk('gum'), /gum|alij/i)).toBeGreaterThanOrEqual(5)
    expect(mk('frozen').length + mk('icecream').length + mk('dairy').length + mk('bakery').length).toBeGreaterThanOrEqual(40)
    // canned mahshi: a can is two servings, salt counted
    const egg = FOOD_BY_ID.mahshieggplant
    expect(egg).toMatchObject({ cat: 'canned', g: 200, kcal: 240 })
    expect(egg.sizes.find(x => x.key === 'can').q).toBe(2)
    expect(egg.na).toBe(840)
    expect(FOOD_BY_ID.buldak).toMatchObject({ kcal: 530, na: 1280, prep: 'boiled' })
    expect(FOOD_BY_ID.mangonectar.ml).toBe(true)
    expect(FOOD_BY_ID.gumsugar.kcal).toBeLessThan(30)
  })

  it('names every new food and aisle in Arabic', () => {
    for (const f of MARKET) expect(ar[f.name], f.id).toBeTruthy()
    for (const a of MARKET_TYPES) expect(ar[a.name], a.key).toBeTruthy()
    for (const k of ['Shops & markets', 'All aisles', 'Cakes']) expect(ar[k], k).toBeTruthy()
    expect(ar['Halqoum with pistachio (Turkish delight)']).toContain('حلقوم')
    expect(ar['Mastic gum (Arabic alij)']).toContain('علج')
    expect(ar['Stuffed eggplant (canned mahshi)']).toContain('محشي')
  })
})

describe('13.1 — the words people type', () => {
  beforeAll(async () => { await setLang('ar') })
  it('finds شيبس for جبس, علج for علك or علچ, إندومي for اندوني and موطا for ice cream', () => {
    for (const g of SYNONYMS) for (const w of g) expect(hasWord(normalize(g[0]), normalize(w)), w).toBe(true)   // each finds the first
    expect(hasWord('شيبس بطاطا', 'جبس')).toBe(true)
    expect(hasWord('حلقوم', 'علك')).toBe(false)
    const find = q => searchFoods({}, q).map(f => f.id)
    expect(t('Halqoum with walnut')).toBe('حلقوم بالجوز')
    expect(find('جبس')).toEqual(expect.arrayContaining(['chipssmall', 'ruffles', 'chips', 'chipscheese']))
    expect(find('چبس')).toEqual(expect.arrayContaining(['chipssmall', 'ruffles']))
    for (const q of ['علك', 'علچ', 'علج']) expect(find(q), q).toEqual(expect.arrayContaining(['gumsugar', 'mastic', 'bubblegum', 'gum']))
    expect(find('علك')).not.toContain('haribo')
    expect(find('اندوني').length).toBeGreaterThanOrEqual(41)
    expect(find('موطا')).toEqual(expect.arrayContaining(['icestick', 'icecreamvanilla']))
    expect(find('محشي معلب')).toEqual(expect.arrayContaining(['mahshieggplant', 'mahshipepper', 'mahshizucchini']))
    expect(find('حلقوم').length).toBeGreaterThanOrEqual(5)
  })
})
