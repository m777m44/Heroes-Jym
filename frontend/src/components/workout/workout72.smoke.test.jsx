// 7.2 render smoke: the workout clock, the start countdown and "your own food" with smart calories.
import { describe, it, expect, beforeAll } from 'vitest'

const mem = new Map()
globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }
globalThis.window ??= globalThis
const noop = () => {}
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }

let React, renderToString, useStore
beforeAll(async () => {
  React = await import('react')
  ;({ renderToString } = await import('react-dom/server'))
  ;({ useStore } = await import('../../store/useStore.js'))
  Object.assign(useStore.getInitialState().S, { bodyweight: [{ d: '2026-10-01', w: 80 }], unit: 'kg' })
})

describe('7.2 workout timer', () => {
  it('shows the live clock, sets ring and calories', async () => {
    const { default: WorkoutClock } = await import('./WorkoutClock.jsx')
    const A = { start: Date.now() - (12 * 60 + 5) * 1000, entries: [{ id: 'x', sets: [{ done: true }, { done: false }] }] }
    const html = renderToString(React.createElement(WorkoutClock, { A }))
    expect(html).toContain('wclock')
    expect(html).toMatch(/12:0[5-7]/)
    expect(html).toContain('50')                       // 1 of 2 sets
    expect(html).toContain('kcal')
    expect(html).toMatch(/>(8[0-9])</)                 // 5 MET × 3.5 × 80 / 200 × ~12 min ≈ 84
  })
  it('counts down 3 · 2 · 1 · GO', async () => {
    const { default: StartCountdown, useCountdown } = await import('./StartCountdown.jsx')
    useCountdown.getInitialState().run = { key: 1, label: 'Push Day', onGo: noop }
    const html = renderToString(React.createElement(StartCountdown))
    expect(html).toContain('cdown')
    expect(html).toContain('Push Day')
    expect(html).toContain('>3<')
    expect(html).toContain('Tap to skip')
    useCountdown.getInitialState().run = null
  })
})

describe('7.2 your own food', () => {
  it('estimates the calories from a name and grams', async () => {
    const { CustomFood } = await import('../food/FoodSheets.jsx')
    const html = renderToString(React.createElement(CustomFood, { name: 'pomegranate juice', close: noop }))
    expect(html).toContain('cf-est')
    expect(html).toContain('Based on:')
    expect(html).toContain('135')                      // one glass
    expect(html).toContain('Close match')
    const empty = renderToString(React.createElement(CustomFood, { close: noop }))
    expect(empty).toContain('Type a name')
  })
})
