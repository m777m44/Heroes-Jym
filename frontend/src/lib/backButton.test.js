import { describe, it, expect } from 'vitest'
const noop = () => {}
const mem = new Map()
globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }
globalThis.window ??= globalThis
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }
const { decideBack, BACK_EXIT_MS } = await import('./backButton.js')

describe('the phone’s Back button (2.7.0)', () => {
  it('closes the open sheet first; a locked one stays', () => {
    expect(decideBack({ sheets: [{}], path: '/home' })).toBe('close')
    expect(decideBack({ sheets: [{}, { locked: true }], path: '/plan' })).toBe('locked')
  })
  it('goes Home from a tab, back from a deeper screen (Home when there is no history)', () => {
    expect(decideBack({ path: '/plan', idx: 3 })).toBe('home')
    expect(decideBack({ path: '/stats/' })).toBe('home')
    expect(decideBack({ path: '/plan/r/abc', idx: 2 })).toBe('back')
    expect(decideBack({ path: '/water', idx: 0 })).toBe('home')   // opened from a notification
  })
  it('on Home: the first press warns, a second within 2 s exits', () => {
    expect(decideBack({ path: '/home', now: 10_000, last: 0 })).toBe('arm')
    expect(decideBack({ path: '/home', now: 11_500, last: 10_000 })).toBe('exit')
    expect(decideBack({ path: '/home', now: 10_000 + BACK_EXIT_MS, last: 10_000 })).toBe('arm')
    expect(decideBack({ path: '', now: 5, last: 0 })).toBe('exit')     // '' is Home; 5 ms after "0"
  })
})
