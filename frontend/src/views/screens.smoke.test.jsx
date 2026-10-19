// Render smoke test for the 2.0 screens: server-renders each one with a realistic profile so a
// typo, an undefined import or a bad hook call fails CI instead of a phone. No DOM needed —
// renderToString runs no effects, which is exactly the "first paint" path.
import { describe, it, expect, beforeAll } from 'vitest'

const mem = new Map()
globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }
globalThis.window ??= globalThis
const noop = () => {}
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }
globalThis.addEventListener ??= noop
globalThis.removeEventListener ??= noop

let React, renderToString, MemoryRouter, useStore
beforeAll(async () => {
  React = await import('react')
  ;({ renderToString } = await import('react-dom/server'))
  ;({ MemoryRouter } = await import('react-router-dom'))
  ;({ useStore } = await import('../store/useStore.js'))
  const { todayISO, isoOf } = await import('../lib/format.js')
  const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return isoOf(d) }
  const bodyweight = Array.from({ length: 12 }, (_, i) => ({ d: day(60 - i * 5), w: 84 - i * 0.4 }))
  const steps = {}; for (let i = 0; i < 10; i++) steps[day(i)] = { n: 4000 + i * 900, ms: 1800000 }
  // renderToString reads zustand's *initial* snapshot (getServerSnapshot), so seed that object
  Object.assign(useStore.getInitialState().S, { bodyweight, steps, targetW: 78, targetFrom: 84, heightCm: 178, stepGoal: 8000,
    reminder: { on: true, time: '18:00', tz: 'UTC', nudge: true, walk: true } })
  expect(steps[todayISO()]).toBeTruthy()
})

const text = h => h.replace(/<title>.*?<\/title>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')
const render = async (path, file) => {
  const mod = await import(file)
  const El = mod.default
  return renderToString(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(El)))
}

describe('2.0 screens render', () => {
  it('Walking', async () => {
    const html = await render('/walk', './Walking.jsx')
    expect(html).toContain('stepring')
    if (process.env.DUMP) console.log(text(html))
    expect(html).toMatch(/8[,.\u202f\u00a0]?000/)   // the goal, localized
    // live clock (the phone's local time — no city since 2.9) with the midnight countdown, hourly chart, mottos
    expect(html).toContain('lc-time big')
    expect(html).toContain('Local time')
    expect(html).not.toMatch(/Baghdad|بغداد/)
    expect(html).toContain('GMT')
    expect(html).toContain('Day ends in')
    expect(html).toContain('hourchart')
    expect(html).toContain('walk-motto')
    expect(html).toContain('Milestone sound')
    expect(html).not.toContain('Voice coach')       // native TTS — Android app only
    // 2.10: the 2.8 layout again, refined — one wide start button, reset as a chip
    expect(html).toContain('walk-ctl')
    expect((html.match(/class="wbtn wbtn-go/g) || []).length).toBe(1)   // idle: one wide start button
    expect(html).toContain('walk-reset')
  })
  it('Themes (2.12: categories + Studio)', async () => {
    const html = await render('/themes', './Themes.jsx')
    // opens on the category of the theme in use (Classic: 7 families × 7 styles — 4.0 added Retro)
    expect((html.match(/class="theme-card[" ]/g) || []).length).toBe(49)
    expect((html.match(/class="theme-card on"/g) || []).length).toBe(1)
    expect(html).toContain('Follow the phone')
    expect(html).toContain('2,722,930 themes in all')
    expect(html).toContain('>Glass style<'); expect(html).toContain('>Minimal<'); expect(html).toContain('Theme file')
    for (const c of ['Golden', 'Royal', 'Premium', 'Dark', 'Light', 'Theme Studio']) expect(html).toContain('>' + c + '<')
    expect((html.match(/class="theme-tab[" ]/g) || []).length).toBeGreaterThanOrEqual(15)
    expect(html).toContain('swatch-theme')
  })
  it('Ideal body (2.12)', async () => {
    Object.assign(useStore.getInitialState().S, { sex: 'male', birthYear: new Date().getFullYear() - 34, waistCm: 88 })
    const html = await render('/ideal', './IdealBody.jsx')
    expect(html).toContain('ideal-big')
    expect(html).toContain('bmig-me')
    expect((html.match(/class="ideal-tile"/g) || []).length).toBe(8)
    expect(html).toContain('Devine formula')
    expect(html).toContain('Lorentz formula')
    expect(html).toContain('not medical advice')
    expect(html).toContain('ideal-tabs')                       // 3.0: Overview · Body · Plan · Compare
    for (const x of ['Overview', 'Body', 'Plan', 'Compare']) expect(html).toContain('>' + x + '<')
  })
  it('Health log (3.0)', async () => {
    const iso = new Date().toISOString().slice(0, 10)
    Object.assign(useStore.getInitialState().S, {
      health: { [iso]: { mood: 4, sleepH: 7.5, bp: [{ t: Date.now(), sys: 185, dia: 100 }], sugar: [{ t: Date.now() + 1, v: 95, ctx: 'fasting' }] } },
      meds: [{ id: 'm1', name: 'Vitamin D', kind: 'vit', dose: '1000 IU', times: ['08:00'], on: true, remind: true }], medLog: {},
    })
    const html = await render('/health', './Health.jsx')
    expect(html).toContain('Health log')
    expect(html).toContain('hl-alert')                         // 185 / 100 is in the crisis range
    expect(html).toContain('185 / 100')
    expect(html).toContain('Vitamin D')
    expect((html.match(/class="hl-dot[" ]/g) || []).length).toBe(20)   // mood, energy, stress, sleep quality × 5
    expect(html).toContain('not a diagnosis')
  })
  it('BodyWeight', async () => {
    const html = await render('/weight', './BodyWeight.jsx')
    expect(html).toContain('wcmp')
    expect(html).toContain('79.6')                 // latest entry
    expect(html).toContain('value="178"')          // height field shows the saved height
    expect(html).toContain('25.1')                 // BMI at 178 cm
    if (process.env.DUMP) console.log(text(html))
  })
  it('Home (steps card + weight link)', async () => {
    const html = await render('/home', './Home.jsx')
    expect(html).toContain('steps-card')
    expect(html).toContain('h2link')
    expect(html).toContain('lc-compact')           // 2.1: the live clock line
    expect(html).toContain('steps-bar')
    // 2.9: today's plan — workout + steps + water, with a start button and a tip
    expect(html).toContain('plan-card')
    expect((html.match(/class="plan-goal[" ]/g) || []).length).toBe(3)
    expect(html).toContain('plan-start')
    expect(html).toContain('plan-tip')
  })
  it('Settings (reminder extras + walking section)', async () => {
    const html = await render('/settings', './Settings.jsx')
    expect(html.length).toBeGreaterThan(1000)
  })
  it('CelebrationOverlay', async () => {
    const { celebrate, useCelebration } = await import('../lib/celebrate.js')
    celebrate(8000, 'goal')
    expect(useCelebration.getState().current).toBeTruthy()
    useCelebration.getInitialState().current = useCelebration.getState().current   // SSR snapshot, see above
    const html = await render('/home', '../components/pedometer/CelebrationOverlay.jsx')
    // 2.5: full screen — confetti canvas, rings, badge, count-up, no bouncing figure
    expect(html).toContain('celebrate kind-goal')
    expect(html).toContain('celebrate-confetti')
    expect(html).toContain('celebrate-badge')
    expect(html).toContain('Daily goal reached!')
    expect(html).not.toContain('cheer-fig')
    celebrate(2000, 'water')
    useCelebration.getInitialState().current = useCelebration.getState().current
    const w = await render('/home', '../components/pedometer/CelebrationOverlay.jsx')
    expect(w).toContain('kind-water')
    expect(w).toContain('Water goal reached!')
    celebrate(100, 'plan')                           // 2.9: the whole day's plan done
    useCelebration.getInitialState().current = useCelebration.getState().current
    const pl = await render('/home', '../components/pedometer/CelebrationOverlay.jsx')
    expect(pl).toContain('kind-plan')
    expect(pl).toContain('Today’s plan complete!'.replace('’', "'").replace("'", '&#x27;'))
    useCelebration.getInitialState().current = null
  })
  it('Water (2.5: containers, goal, reminders, history)', async () => {
    const st = useStore.getInitialState().S
    Object.assign(st, { waterAuto: false, waterUnit: 'can', waterGoalMl: 2500, waterRemind: { on: true, every: 90, from: '08:00', to: '22:00' } })
    const html = await render('/water', './Water.jsx')
    expect(html).toContain('vessel')
    expect(html).toContain('wcont')
    expect(html).toContain('Remind me to drink')
    expect(html).toContain('How often')
    expect(html).toContain('type="time"')
    expect(html).toContain('2,500')
    expect(html).toContain('Last 14 days')
    expect(html).toContain('wsched')                 // 2.9: today's drinking schedule
    expect(html).toContain('Today&#x27;s schedule')
    const home = await render('/home', '../components/WaterCard.jsx')
    expect(home).toContain('water-chips')
    expect(home).toMatch(/wchip sel[^>]*>.*?Can/)
    const { setLang } = await import('../lib/i18n.js')
    await setLang('ar')
    try {
      const ar = await render('/water', './Water.jsx')
      for (const w of ['كلاص', 'كوب', 'علبة', 'قنينة', 'ذكّرني بشرب الماء', 'التذكيرات']) expect(ar).toContain(w)
    } finally { await setLang('en') }
  })
  it('Walking in Arabic (RTL language, translated)', async () => {
    const { setLang, isRTL, dateLocale } = await import('../lib/i18n.js')
    await setLang('ar')
    try {
      expect(isRTL('ar')).toBe(true)
      expect((12345).toLocaleString(dateLocale())).toBe('12,345')   // Western digits, like the inputs
      const html = await render('/walk', './Walking.jsx')
      expect(html).toContain('المشي')
      expect(html).toContain('icn-dir')            // the back chevron is the mirrored kind
      expect(html).toContain('التوقيت المحلي')       // the clock label, translated
      expect(html).not.toContain('بغداد')           // 2.9: no city anywhere
      expect(html).toContain('ينتهي اليوم بعد')
      expect(html).toContain('dir="ltr"')          // digits of the clock stay left-to-right
    } finally { await setLang('en') }
  })

  // 2.2: Arabic UI is fully Arabic (exercise names in Arabic with the English one under them,
  // Arabic units); the English UI has no Arabic text at all.
  it('exercise names and units follow the language', async () => {
    const { setLang, exName, exNameEn, exSearch, U } = await import('../lib/i18n.js')
    const { EXDB } = await import('../lib/exercises-data.js')
    const bench = EXDB.find(e => e.n === 'barbell bench press')
    await setLang('ar')
    try {
      expect(exName(bench)).toBe('ضغط بنش بالبار')
      expect(exNameEn(bench)).toBe('barbell bench press')
      expect(exSearch(bench)).toContain('bench')
      expect(exSearch(bench)).toContain('ضغط')
      expect(U('kg')).toBe('كغ')
      expect(exName({ id: 'c_custom', n: 'My move' })).toBe('My move')      // custom: as typed
      const html = await render('/library', './Library.jsx')
      expect(html).toContain('جلوس البطن 3/4')
      expect(html).toContain('exn-en')
    } finally { await setLang('en') }
    expect(exName(bench)).toBe('barbell bench press')
    expect(exNameEn(bench)).toBe('')
    expect(U('kg')).toBe('kg')
    expect(U('mn')).toBe('m')
    const en = await render('/library', './Library.jsx')
    expect(en).not.toMatch(/[\u0600-\u06FF]/)
  })
  it('Settings ends with just the app name', async () => {
    const html = await render('/settings', './Settings.jsx')
    expect(html).toContain('app-sign')
    expect(html).not.toContain('AGPL')
    expect(html).not.toContain('exercises-dataset')
  })
})

describe('4.0 screens render', () => {
  const at = async (path, El) => { const R = await import('react-router-dom'); return renderToString(React.createElement(MemoryRouter, { initialEntries: [path] },
    React.createElement(R.Routes, null, React.createElement(R.Route, { path: '/start/:mode/:cat', element: React.createElement(El) }), React.createElement(R.Route, { path: '/start/:mode', element: React.createElement(El) })))) }
  it('Start: two sections', async () => {
    const html = await render('/start', './StartWorkout.jsx')
    expect(html).toContain('wmode-home'); expect(html).toContain('wmode-gym')
  })
  it('Start: each section lists its categories, the gym has the equipment filter', async () => {
    const m = await import('./StartWorkout.jsx')
    const home = await at('/start/home', m.WorkoutSection)
    expect((home.match(/class="wcat"/g) || []).length).toBe(8)
    const gym = await at('/start/gym', m.WorkoutSection)
    expect((gym.match(/class="wcat"/g) || []).length).toBe(8)
    const cat = await at('/start/gym/chest?eq=dumbbell', m.WorkoutCategory)
    expect(cat).toContain('startw-eq'); expect(cat).toContain('startw-quick')
    const run = await at('/start/home/run', m.WorkoutCategory)
    expect(run).toContain('startw-ql')
  })
  it('Backups & restore', async () => {
    const html = await render('/backups', './Backups.jsx')
    expect(html).toContain('bk-where')
  })
})

describe('4.2 calorie calculator & burn plan render', () => {
  const S0 = () => useStore.getInitialState().S
  const el = async (path, file, name) => {
    const mod = await import(file)
    return renderToString(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(mod[name || 'default'])))
  }
  it('the calculator works out a plan from the profile', async () => {
    Object.assign(S0(), { birthYear: 1994, sex: 'male' })
    const html = await el('/calories', './Calories.jsx')
    expect(html).toContain('calc-stats')
    expect(text(html)).toMatch(/kcal/)
  })
  it('the calculator shows a clear error for an impossible target', async () => {
    Object.assign(S0(), { calGoal: { currentKg: 70, targetKg: 120, days: 30, activity: 'light', dietShare: 0 } })
    const html = await el('/calories', './Calories.jsx')
    expect(html).toContain('calc-err')
    delete S0().calGoal
  })
  it('picking exercises: home and gym', async () => {
    const home = await el('/burn/home', './BurnPlan.jsx', 'BurnSelect')
    expect(home).toContain('burn-grid')
    expect(text(home)).toMatch(/Running/)
    expect((home.match(/burn-card/g) || []).length).toBeGreaterThanOrEqual(8)
  })
  it('the review has an empty state and a full plan', async () => {
    delete S0().burnPlan
    const empty = await el('/burn/review', './BurnPlan.jsx', 'BurnReview')
    expect(empty).toContain('class="empty"')
    S0().burnPlan = { mode: 'gym', keys: ['bench', 'row', 'biceps'], target: 400, remind: true, start: '18:00', gap: 30, daily: true }
    const full = await el('/burn/review', './BurnPlan.jsx', 'BurnReview')
    expect(full).toContain('timef')
    expect(text(full)).toMatch(/Bench press/)
    expect(text(full)).toMatch(/18:00|6:00/)
    delete S0().burnPlan
  })
  it('the section page leads to the burn plan', async () => {
    const SW = await import('./StartWorkout.jsx')
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/start/home'] }, React.createElement(SW.WorkoutSection)))
    expect(html).toContain('burn-entry')
  })
})
