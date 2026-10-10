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
    // 2.1: live clock (Baghdad by default) with the midnight countdown, hourly chart, mottos
    expect(html).toContain('lc-time big')
    expect(html).toContain('Baghdad time')
    expect(html).toContain('GMT+3')
    expect(html).toContain('Day ends in')
    expect(html).toContain('hourchart')
    expect(html).toContain('walk-motto')
    expect(html).toContain('Milestone sound')
    expect(html).not.toContain('Voice coach')       // native TTS — Android app only
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
    expect(html).toContain('celebrate goal')
    expect(html).toContain('cheer-arm-l')
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
      expect(html).toContain('توقيت بغداد')         // 2.1: the clock label, translated
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
