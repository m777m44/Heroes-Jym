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

describe('themes 3.0 — glass, minimal, HEX and theme files', async () => {
  const T = await import('./themes.js')
  it('has 40 more families, Glass and Minimal, all with unique ids', () => {
    expect(T.FAMILIES.length).toBe(134)
    expect(T.THEMES.length).toBe(938)
    expect(T.CATEGORIES.map(c => c.id)).toEqual(expect.arrayContaining(['glass', 'minimal']))
    expect(new Set(T.FAMILIES.map(f => f.id)).size).toBe(T.FAMILIES.length)
    for (const c of T.CATEGORIES) expect(T.familiesOf(c.id).length).toBeGreaterThan(0)
    expect(T.familiesOf('glass').every(f => f.glass)).toBe(true)
  })
  it('glass themes get see-through cards and an aurora, and mark the page', () => {
    const tk = T.themeTokens(T.THEME_IDX['glass-aurora-dark'])
    expect(tk.glass).toBe(true)
    expect(tk.surfaces['--surface']).toMatch(/\/ 0\.\d+\)$/)
    expect(tk.glow.split('radial-gradient').length - 1).toBe(3)
    const de = { style: { setProperty() {}, removeProperty() {} }, dataset: {} }
    const doc = { documentElement: de, querySelector: () => null }
    T.applyTheme(T.THEME_IDX['glass-rose-light'], 'theme', doc)
    expect(de.dataset.glass).toBe('light')
    T.applyTheme(T.THEME_IDX['forest-dark'], 'theme', doc)
    expect(de.dataset.glass).toBeUndefined()
  })
  it('reads HEX colours', () => {
    expect(T.hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 })
    expect(T.hexToHsl('0f0')).toEqual({ h: 120, s: 100, l: 50 })
    expect(T.hexToHsl('#808080').s).toBe(0)
    expect(T.hexToHsl('nope')).toBeNull()
    expect(T.normHex('#ABC')).toBe('#aabbcc')
  })
  it('finds the closest curated theme and builds a Studio theme around a colour', () => {
    expect(T.nearestTheme('#ffd60a', 'dark').id).toBe('gold-dark')
    expect(T.nearestTheme('#0a84ff', 'dark').family.acc).toBe('#0a84ff')
    expect(T.nearestTheme('#zzz')).toBeNull()
    const p = T.studioFromHex('#ff375f', 'light')
    expect(p.v).toBe('tint')
    expect(T.studioTheme(T.studioNumber(p))).toBeTruthy()
    expect(p.a).toBe(Math.round(T.hexToHsl('#ff375f').h / 10) * 10 % 360)
  })
  it('exports My themes and imports only known ids', () => {
    const json = T.exportThemes({ theme: 'glass-ocean-dark', themeFavs: ['gold-dark', 'g-42', 'gold-dark'] })
    const back = T.parseThemes(json)
    expect(back.current).toBe('glass-ocean-dark')
    expect(back.themes).toEqual(['glass-ocean-dark', 'gold-dark', 'g-42'])
    const mixed = T.parseThemes(JSON.stringify({ kind: T.THEME_FILE_KIND, themes: ['nope', 'pure-light'], current: 'bad' }))
    expect(mixed).toEqual({ current: null, themes: ['pure-light'] })
    expect(() => T.parseThemes('{"workouts":[]}')).toThrow()
    expect(() => T.parseThemes('not json')).toThrow()
  })
})
