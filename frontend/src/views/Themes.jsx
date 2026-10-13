// Themes (2.10): 120 themes behind the single "Themes" row in Settings — 20 colour families,
// each in six variants (dark, pure black, deep, dusk, light, pastel) — plus "follow the phone"
// for light / dark and an optional accent colour of your own. See lib/themes.js.
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { ACCENTS } from '../lib/format.js'
import { FAMILIES, VARIANTS, THEMES, THEME_IDX, resolveTheme, themePreview } from '../lib/themes.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, Switch, Segmented, BackButton } from '../components/ui.jsx'

const systemDark = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : null)

/** A tiny phone screen in the theme's colours. */
export function ThemeMock({ th, big = false }) {
  const p = themePreview(th)
  return <span className={'tmock' + (big ? ' big' : '')} style={{ background: p.bg, color: p.label }} aria-hidden="true">
    {p.glow && <span className="tmock-glow" style={{ background: p.glow }} />}
    <span className="tmock-bar" style={{ background: p.surface }}>
      <i style={{ background: p.acc }} /><b style={{ background: p.label }} />
    </span>
    <span className="tmock-card" style={{ background: p.surface }}>
      <span className="tmock-ring" style={{ borderColor: p.acc }} />
      <span className="tmock-lines"><b style={{ background: p.label }} /><b style={{ background: p.surface2 }} /></span>
    </span>
    <span className="tmock-btn" style={{ background: p.acc }} />
  </span>
}

export const themeName = th => t(th.family.name) + ' · ' + t(th.variant.name)

export default function Themes() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [filter, setFilter] = useState('all')
  const follow = S.themeSystem !== false
  const shown = resolveTheme(S, systemDark())
  const variants = useMemo(() => VARIANTS.filter(v => filter === 'all' || v.mode === filter), [filter])

  const pick = id => {
    const th = THEME_IDX[id]
    const sys = systemDark()
    const keepFollow = follow && (sys == null || th.mode === (sys ? 'dark' : 'light'))
    update(s => { s.theme = id; s.accent = 'theme'; if (follow && !keepFollow) s.themeSystem = false })
    if (follow && !keepFollow) useUI.getState().toast(t('“Follow the phone” is off, so this theme stays as you chose it.'))
  }

  return <div className="narrow">
    <div className="hdr">
      <BackButton fallback="/settings" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Themes')}</h1></div>
    </div>

    <div className="card theme-hero">
      <ThemeMock th={shown} big />
      <div className="theme-hero-t">
        <div className="lbl2">{t('Current theme')}</div>
        <div className="theme-hero-n">{themeName(shown)}</div>
        <div className="small muted">{t('{0} themes · {1} colour families', THEMES.length, FAMILIES.length)}</div>
      </div>
    </div>

    <Section footer={t('The theme switches to its light or dark version together with your phone.')}>
      <Row icon="phone" iconTint="var(--indigo)" title={t('Follow the phone')} subtitle={t('Light or dark, like your phone')}>
        <Switch checked={follow} onChange={v => update(s => { s.themeSystem = v })} />
      </Row>
    </Section>

    <div className="theme-filter">
      <Segmented options={[{ value: 'all', label: t('All') }, { value: 'dark', icon: 'moon', label: t('Dark') }, { value: 'light', icon: 'sun', label: t('Light') }]}
        value={filter} onChange={setFilter} />
    </div>

    {FAMILIES.map(f => <section key={f.id} className="theme-fam">
      <h2 className="theme-fam-h"><span className="theme-fam-dot" style={{ background: `linear-gradient(135deg, ${f.acc}, ${f.accL})` }} />{t(f.name)}</h2>
      <div className="theme-grid">
        {variants.map(v => {
          const th = THEME_IDX[f.id + '-' + v.id]
          const on = th.id === shown.id                 // what's on screen (the counterpart when following the phone)
          return <button key={th.id} className={'theme-card' + (on ? ' on' : '')} onClick={() => pick(th.id)} aria-pressed={on} aria-label={themeName(th)}>
            <ThemeMock th={th} />
            <span className="theme-card-n">{t(v.name)}</span>
            {on && <span className="theme-check"><Icon name="check" /></span>}
          </button>
        })}
      </div>
    </section>)}

    <Section title={t('Accent color')} footer={t('“From the theme” uses each theme’s own colour.')}>
      <div className="lrow" style={{ paddingTop: 14, paddingBottom: 14 }}>
        <div className="swatches">
          <button className={'swatch swatch-theme' + (!S.accent || S.accent === 'theme' ? ' on' : '')} onClick={() => update(s => { s.accent = 'theme' })}
            aria-label={t('From the theme')} title={t('From the theme')}><Icon name="sparkles" /></button>
          {Object.entries(ACCENTS).map(([k, c], i) => (
            <button key={k} className={'swatch' + (S.accent === k ? ' on' : '')} style={{ background: c }}
              onClick={() => update(s => { s.accent = k })} aria-label={t('Accent color') + ' ' + (i + 1)} />
          ))}
        </div>
      </div>
    </Section>
  </div>
}
