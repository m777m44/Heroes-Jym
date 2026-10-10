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
})
