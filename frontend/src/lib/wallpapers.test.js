import { describe, it, expect } from 'vitest'
import { ART, artBackground, wallsOf, normWall, catOf, wallExists, applyWallpaper, visibleCats, MAX_DIM } from './wallpapers.js'
import { NATURE } from './wallpaperList.js'
import { applyLook, shapeOf, cardStyleOf } from './look.js'

const fakeDoc = () => {
  const props = {}
  const de = { dataset: {}, style: { setProperty: (k, v) => { props[k] = v }, removeProperty: k => { delete props[k] }, getPropertyValue: k => props[k] || '' } }
  return { documentElement: de, props }
}

describe('wallpapers', () => {
  it('has generated art and bundled photos', () => {
    expect(ART.length).toBe(80)
    for (const id of ART) expect(artBackground(id)).toMatch(/gradient/)
    expect(artBackground('art:nope:ocean')).toBe(null)
    expect(NATURE.length).toBeGreaterThanOrEqual(10)
    expect(wallsOf('nature')[0].thumb).toMatch(/wallpapers\/t\/n01\.webp$/)
    expect(wallsOf('mine', [{ id: 'p1', thumb: 'blob:x' }])).toEqual([{ id: 'mine:p1', thumb: 'blob:x' }])
  })
  it('hides an empty anime category', () => {
    const keys = visibleCats().map(c => c.key)
    expect(keys).toContain('nature')
    expect(keys).toContain('art')
  })
  it('normalises the setting', () => {
    expect(normWall(null)).toEqual({ id: null, dim: 0.35, blur: 0 })
    expect(normWall({ id: 'n01', dim: 5, blur: -3 })).toEqual({ id: 'n01', dim: MAX_DIM, blur: 0 })
    expect(normWall({ id: 'zz' }).id).toBe(null)
    expect(catOf('art:mesh:ocean')).toBe('art')
    expect(catOf('mine:p1')).toBe('mine')
    expect(wallExists('n01')).toBe(true)
  })
  it('paints and clears', () => {
    const d = fakeDoc()
    applyWallpaper({ id: 'art:mesh:ocean', dim: 0.5 }, 'dark', d)
    expect(d.documentElement.dataset.wall).toBe('art')
    expect(d.documentElement.dataset.glass).toBe('dark')
    expect(d.props['--wall-bg']).toMatch(/gradient/)
    expect(d.props['--surface']).toMatch(/color-mix/)
    applyWallpaper({ id: 'n02' }, 'light', d)
    expect(d.props['--wall-bg']).toMatch(/n02\.webp/)
    expect(d.props['--wall-tint']).toBe('255,255,255')
    applyWallpaper({ id: null }, 'dark', d)
    expect(d.documentElement.dataset.wall).toBeUndefined()
    expect(d.props['--wall-bg']).toBeUndefined()
  })
})

describe('look', () => {
  it('applies shape and card style', () => {
    const d = fakeDoc()
    applyLook({ shape: 'pill', cardStyle: 'neon' }, d)
    expect(d.documentElement.dataset).toMatchObject({ shape: 'pill', card: 'neon' })
    applyLook({ shape: 'x', cardStyle: 'solid' }, d)
    expect(d.documentElement.dataset.shape).toBeUndefined()
    expect(d.documentElement.dataset.card).toBeUndefined()
    expect(shapeOf({})).toBe('round')
    expect(cardStyleOf({ cardStyle: 'glass' })).toBe('glass')
  })
})
