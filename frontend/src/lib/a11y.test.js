import { describe, it, expect } from 'vitest'
import { applyA11y, textScaleOf, TEXT_SIZES } from './a11y.js'
import { shouldLock, LOCK_AFTER, DEFAULT_AFTER } from './appLock.js'

const el = () => { const props = {}; return { dataset: {}, style: { zoom: '', setProperty: (k, v) => { props[k] = v }, removeProperty: k => { delete props[k] }, props } } }

describe('4.0 accessibility', () => {
  it('text size zooms the page and tells vh rules about it', () => {
    const de = el()
    applyA11y({ textScale: 1.3, highContrast: true, reduceMotion: true }, de)
    expect(de.style.zoom).toBe('1.3'); expect(de.style.props['--z']).toBe('1.3')
    expect(de.dataset).toEqual({ contrast: 'more', motion: 'reduce' })
    applyA11y({ textScale: 1 }, de)
    expect(de.style.zoom).toBe(''); expect(de.style.props['--z']).toBeUndefined()
    expect(de.dataset).toEqual({})
  })
  it('ignores sizes it does not offer', () => {
    expect(textScaleOf({ textScale: 7 })).toBe(1)
    expect(textScaleOf({})).toBe(1)
    expect(TEXT_SIZES.map(x => x.value)).toEqual([0.9, 1, 1.15, 1.3])
  })
})
describe('4.0 app lock timing', () => {
  it('locks on start and after the chosen time away', () => {
    const now = 1e9
    expect(shouldLock({ on: false, after: 0 }, null, now)).toBe(false)
    expect(shouldLock({ on: true, after: 60 }, null, now)).toBe(true)
    expect(shouldLock({ on: true, after: 60 }, now - 30000, now)).toBe(false)
    expect(shouldLock({ on: true, after: 60 }, now - 61000, now)).toBe(true)
    expect(shouldLock({ on: true, after: 0 }, now - 1, now)).toBe(true)
    expect(LOCK_AFTER).toContain(DEFAULT_AFTER)
  })
})
