import { describe, it, expect } from 'vitest'
import { THEMES, FAMILIES, VARIANTS, THEME_IDX, themeIdOf, resolveTheme, themeTokens, onColor, luminance, applyTheme, themePreview } from './themes.js'

const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

describe('themes', () => {
  it('has more than 100 themes with unique ids', () => {
    expect(THEMES.length).toBe(FAMILIES.length * VARIANTS.length)
    expect(THEMES.length).toBeGreaterThan(100)
    expect(new Set(THEMES.map(x => x.id)).size).toBe(THEMES.length)
  })
  it('reads old saves and unknown values', () => {
    expect(themeIdOf('dark')).toBe('classic-dark')
    expect(themeIdOf('light')).toBe('classic-light')
    expect(themeIdOf(undefined)).toBe('classic-dark')
    expect(themeIdOf('nope')).toBe('classic-dark')
    expect(themeIdOf('ocean-deep')).toBe('ocean-deep')
  })
  it('follows the phone by switching to the family’s light / dark counterpart', () => {
    expect(resolveTheme({ theme: 'ocean-deep' }, false).id).toBe('ocean-soft')
    expect(resolveTheme({ theme: 'ocean-deep' }, true).id).toBe('ocean-deep')
    expect(resolveTheme({ theme: 'rose-light' }, true).id).toBe('rose-dark')
    expect(resolveTheme({ theme: 'gold-amoled' }, false).id).toBe('gold-light')
    expect(resolveTheme({ theme: 'dark' }, false).id).toBe('classic-light')       // a 2.x save, phone in light mode
    expect(resolveTheme({ theme: 'ocean-deep', themeSystem: false }, false).id).toBe('ocean-deep')
    expect(resolveTheme({ theme: 'ocean-deep' }, null).id).toBe('ocean-deep')      // unknown phone setting
  })
  it('keeps Classic Dark / Light exactly as the stylesheet draws them', () => {
    expect(themeTokens(THEME_IDX['classic-dark']).surfaces).toBeNull()
    expect(themeTokens(THEME_IDX['classic-light']).surfaces).toBeNull()
    expect(themeTokens(THEME_IDX['classic-dark']).accent['--acc']).toBe('#30d158')
  })
  it('gives every theme readable button text and a mode-appropriate page colour', () => {
    for (const th of THEMES) {
      const tk = themeTokens(th)
      const acc = tk.accent['--acc']
      expect(contrast(acc, tk.accent['--on-acc'])).toBeGreaterThanOrEqual(3)
      const bgL = luminance(tk.bg)
      if (th.mode === 'dark') expect(bgL).toBeLessThan(0.05)
      else expect(bgL).toBeGreaterThan(0.6)
    }
  })
  it('picks black or white for text on a colour', () => {
    expect(onColor('#ffd60a')).toBe('#000000')
    expect(onColor('#1a237e')).toBe('#ffffff')
  })
  it('applies the tokens to <html> and resets them on the next theme', () => {
    const props = {}
    const de = { dataset: {}, style: { setProperty: (k, v) => { props[k] = v }, removeProperty: k => { delete props[k] } } }
    const meta = { content: '' }
    const doc = { documentElement: de, querySelector: () => meta }
    applyTheme(THEME_IDX['ocean-deep'], 'theme', doc)
    expect(de.dataset.theme).toBe('dark')
    expect(de.dataset.accent).toBe('theme')
    expect(props['--bg']).toMatch(/^hsl\(/)
    expect(props['--acc']).toBe('#40c8e0')
    expect(props['--bg-glow']).toMatch(/radial-gradient/)
    expect(meta.content).toMatch(/^#[0-9a-f]{6}$/)
    applyTheme(THEME_IDX['classic-light'], 'violet', doc)
    expect(de.dataset.theme).toBe('light')
    expect(de.dataset.accent).toBe('violet')
    expect(props['--bg']).toBeUndefined()
    expect(props['--acc']).toBeUndefined()            // the stylesheet's accent rule takes over
    expect(meta.content).toBe('#f2f2f7')
  })
  it('previews every theme', () => {
    for (const th of THEMES) {
      const p = themePreview(th)
      expect(p.bg && p.surface && p.acc && p.label).toBeTruthy()
    }
  })
})

describe('themes 2.12 — categories and the Studio', async () => {
  const { CATEGORIES, STUDIO_COUNT, studioNumber, studioParams, studioTheme, themeOf, familiesOf, randomStudio } = await import('./themes.js')
  it('sorts every family into one of the named categories', () => {
    const ids = CATEGORIES.map(c => c.id)
    for (const want of ['golden', 'royal', 'dark', 'light', 'premium']) expect(ids).toContain(want)
    for (const f of FAMILIES) expect(ids).toContain(f.cat)
    expect(CATEGORIES.reduce((n, c) => n + familiesOf(c.id).length, 0)).toBe(FAMILIES.length)
    for (const c of CATEGORIES) expect(familiesOf(c.id).length).toBeGreaterThanOrEqual(5)
    expect(new Set(FAMILIES.map(f => f.id)).size).toBe(FAMILIES.length)
  })
  it('offers well over a million themes in all', () => {
    expect(STUDIO_COUNT + THEMES.length).toBeGreaterThan(1_000_000)
  })
  it('numbers Studio themes both ways', () => {
    for (const n of [1, 2, 777, 123456, STUDIO_COUNT - 1, STUDIO_COUNT, randomStudio(() => 0.5)]) expect(studioNumber(studioParams(n))).toBe(n)
    expect(studioParams(0)).toBeNull()
    expect(studioParams(STUDIO_COUNT + 1)).toBeNull()
    expect(themeOf('g-0')).toBeNull()
    expect(themeOf('g-' + (STUDIO_COUNT + 1))).toBeNull()
  })
  it('keeps every Studio accent readable', () => {
    for (let i = 0; i < 400; i++) {
      const th = studioTheme(1 + Math.floor((i * 104729) % STUDIO_COUNT))
      const tk = themeTokens(th)
      expect(contrast(tk.accent['--acc'], tk.bg)).toBeGreaterThanOrEqual(2.95)
    }
  })
  it('saves and restores a Studio theme, and follows the phone with it', () => {
    const n = studioNumber({ h: 210, s: 6, v: 'deep', a: 40, g: 1 })
    expect(themeIdOf('g-' + n)).toBe('g-' + n)
    const dark = resolveTheme({ theme: 'g-' + n }, true)
    expect(dark.id).toBe('g-' + n)
    const light = resolveTheme({ theme: 'g-' + n }, false)
    expect(light.mode).toBe('light')
    expect(light.studio).toMatchObject({ h: 210, s: 6, a: 40, g: 1 })
    const props = themePreview(light)
    expect(props).toBeTruthy()
  })
})
