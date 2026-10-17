// Themes — everything behind the single "Themes" row in Settings (2.10, regrouped in 2.12):
//   · 12 categories (Golden, Royal, Premium, Dark, Light, Nature, Ocean & sky, Neon, Warm,
//     Pastel, Classic, Sport) of 94 colour families × 7 variants = 658 curated themes
//   · the Theme Studio: 2,721,600 numbered themes from five controls, a dice and a number jump
//   · "My themes" (★, up to MAX_FAVS), "follow the phone" for light / dark, an accent of your own
// See lib/themes.js.
import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { ACCENTS, fmtNum } from '../lib/format.js'
import {
  CATEGORIES, VARIANTS, THEMES, THEME_IDX, STUDIO_COUNT, resolveTheme, themePreview,
  themeOf, familiesOf, studioNumber, studioParams, studioTheme, randomStudio,
  normHex, nearestTheme, studioFromHex, exportThemes, parseThemes,
} from '../lib/themes.js'
import { todayISO } from '../lib/format.js'
import { MOBILE, shareExport } from '../lib/mobile.js'
import ColorWheel from '../components/ColorWheel.jsx'
import ColorTools from '../components/ColorTools.jsx'
import { pushRecent } from '../lib/colorTools.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, Switch, Segmented, Slider, Button, BackButton } from '../components/ui.jsx'

export const MAX_FAVS = 30
const systemDark = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : null)

/** A tiny phone screen in the theme's colours. */
export function ThemeMock({ th, big = false }) {
  const p = themePreview(th)
  return <span className={'tmock' + (big ? ' big' : '') + (th.family.glass ? ' glass' : '')} style={{ background: p.bg, color: p.label }} aria-hidden="true">
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

export const themeName = th => th.studio
  ? t('Studio #{0}', fmtNum(th.studio.n)) + ' · ' + t(th.variant.name)
  : t(th.family.name) + ' · ' + t(th.variant.name)

const catOf = th => (th.studio ? 'studio' : th.family.cat)

/** One theme as a pickable card. */
function ThemeCard({ th, on, onPick, label }) {
  return <button className={'theme-card' + (on ? ' on' : '')} onClick={() => onPick(th.id)} aria-pressed={on} aria-label={themeName(th)}>
    <ThemeMock th={th} />
    <span className="theme-card-n">{label}</span>
    {on && <span className="theme-check"><Icon name="check" /></span>}
  </button>
}

export default function Themes() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const follow = S.themeSystem !== false
  const shown = resolveTheme(S, systemDark())
  const favs = (S.themeFavs || []).filter(id => themeOf(id))
  const [tab, setTab] = useState(() => catOf(shown))
  const [filter, setFilter] = useState('all')
  const cat = CATEGORIES.find(c => c.id === tab)
  const mode = cat && cat.mode ? cat.mode : filter
  const variants = useMemo(() => VARIANTS.filter(v => mode === 'all' || v.mode === mode), [mode])
  const isFav = favs.includes(shown.id)

  const pick = id => {
    const th = themeOf(id)
    if (!th) return
    const sys = systemDark()
    const keepFollow = follow && (sys == null || th.mode === (sys ? 'dark' : 'light'))
    update(s => { s.theme = id; s.accent = 'theme'; if (follow && !keepFollow) s.themeSystem = false; if (th.studio) s.recentStudio = pushRecent(s.recentStudio, th.studio.n) })
    if (follow && !keepFollow) useUI.getState().toast(t('“Follow the phone” is off, so this theme stays as you chose it.'))
  }
  const toggleFav = id => {
    const on = favs.includes(id)
    if (!on && favs.length >= MAX_FAVS) { useUI.getState().toast(t('My themes is full — remove one first ({0} at most).', MAX_FAVS)); return }
    update(s => { const f = (s.themeFavs || []).filter(x => x !== id); s.themeFavs = on ? f : [id, ...f] })
    useUI.getState().toast(on ? t('Removed from My themes') : t('Saved to My themes'))
  }

  const tabs = [
    ...(favs.length ? [{ id: 'favs', name: 'My themes', icon: 'star' }] : []),
    ...CATEGORIES,
    { id: 'studio', name: 'Theme Studio', icon: 'palette' },
  ]

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
        <div className="small muted">{t('{0} themes in all', fmtNum(THEMES.length + STUDIO_COUNT))}</div>
        <div className="small dim">{t('{0} curated in {1} categories · {2} in the Studio', THEMES.length, CATEGORIES.length, fmtNum(STUDIO_COUNT))}</div>
        <button className={'theme-fav' + (isFav ? ' on' : '')} onClick={() => toggleFav(shown.id)} aria-pressed={isFav}>
          <Icon name={isFav ? 'starFill' : 'star'} /><span>{isFav ? t('In My themes') : t('Save to My themes')}</span>
        </button>
      </div>
    </div>

    <Section footer={t('The theme switches to its light or dark version together with your phone.')}>
      <Row icon="phone" iconTint="var(--indigo)" title={t('Follow the phone')} subtitle={t('Light or dark, like your phone')}>
        <Switch checked={follow} onChange={v => update(s => { s.themeSystem = v })} />
      </Row>
    </Section>

    <div className="theme-tabs" role="tablist">
      {tabs.map(c => <button key={c.id} role="tab" aria-selected={tab === c.id} className={'theme-tab' + (tab === c.id ? ' on' : '') + (c.id === 'studio' ? ' studio' : '')}
        onClick={() => setTab(c.id)}>
        <Icon name={c.icon} /><span>{t(c.name)}</span>
        {c.id !== 'favs' && c.id !== 'studio' && <em>{familiesOf(c.id).length * (c.mode ? VARIANTS.filter(v => v.mode === c.mode).length : VARIANTS.length)}</em>}
        {c.id === 'favs' && <em>{favs.length}</em>}
      </button>)}
    </div>

    {tab === 'studio' ? <Studio shown={shown} onPick={pick} favs={favs} onFav={toggleFav} recent={S.recentStudio || []} />
      : tab === 'favs' ? <section className="theme-fam">
        <div className="theme-grid">
          {favs.map(id => { const th = themeOf(id); return <ThemeCard key={id} th={th} on={th.id === shown.id} onPick={pick} label={th.studio ? '#' + fmtNum(th.studio.n) : t(th.family.name)} /> })}
        </div>
        <div className="small dim" style={{ textAlign: 'center', marginTop: 10 }}>{t('Tap ★ on the current theme to keep it here.')}</div>
      </section>
      : <>
        {!(cat && cat.mode) && <div className="theme-filter">
          <Segmented options={[{ value: 'all', label: t('All') }, { value: 'dark', icon: 'moon', label: t('Dark') }, { value: 'light', icon: 'sun', label: t('Light') }]}
            value={filter} onChange={setFilter} />
        </div>}
        {familiesOf(tab).map(f => <section key={f.id} className="theme-fam">
          <h2 className="theme-fam-h"><span className="theme-fam-dot" style={{ background: `linear-gradient(135deg, ${f.acc}, ${f.accL})` }} />{t(f.name)}</h2>
          <div className="theme-grid">
            {variants.map(v => {
              const th = THEME_IDX[f.id + '-' + v.id]
              return <ThemeCard key={th.id} th={th} on={th.id === shown.id} onPick={pick} label={t(v.name)} />
            })}
          </div>
        </section>)}
      </>}

    <ThemeFile S={S} update={update} pick={pick} />

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

/* ---- the Theme Studio: 2,721,600 themes from five controls ---- */
const GLOW_OPTS = [{ value: 0, label: 'Off' }, { value: 1, label: 'Soft' }, { value: 2, label: 'Strong' }]
const randomSet = k => Array.from({ length: k }, () => randomStudio())

function Studio({ shown, onPick, favs, onFav, recent }) {
  // the draft starts from the Studio theme on screen, else a close match of the curated one
  const [p, setP] = useState(() => shown.studio
    ? { ...shown.studio }
    : { h: shown.family.h, s: Math.max(1, Math.min(10, Math.round(shown.family.s / 10) || 3)), v: shown.variant.id, a: Math.round(shown.family.h / 10) * 10 % 360, g: shown.variant.glow ? 1 : 0 })
  const [jump, setJump] = useState('')
  const [ideas, setIdeas] = useState(() => randomSet(9))
  const n = studioNumber(p)
  const th = studioTheme(n)
  const set = patch => setP(x => ({ ...x, ...patch }))
  const go = k => { const m = ((n - 1 + k) % STUDIO_COUNT + STUDIO_COUNT) % STUDIO_COUNT + 1; setP(studioParams(m)) }
  const doJump = () => {
    const m = Number(String(jump).replace(/[^\d]/g, ''))
    const q = studioParams(m)
    if (!q) { useUI.getState().toast(t('Pick a number from 1 to {0}.', fmtNum(STUDIO_COUNT))); return }
    setP(q); setJump('')
  }
  const ideaCards = useMemo(() => ideas.map(m => { const it = studioTheme(m); return <ThemeCard key={m} th={it} on={it.id === shown.id} onPick={() => setP(studioParams(m))} label={'#' + fmtNum(m)} /> }), [ideas, shown.id])
  const applied = shown.id === th.id
  const fav = favs.includes(th.id)

  return <div className="studio">
    <div className="card studio-hero">
      <ThemeMock th={th} big />
      <div className="studio-hero-t">
        <div className="lbl2">{t('Theme Studio')}</div>
        <div className="studio-num">#{fmtNum(n)}</div>
        <div className="small dim">{t('of {0}', fmtNum(STUDIO_COUNT))}</div>
        <div className="studio-nav">
          <button className="iconbtn" onClick={() => go(-1)} aria-label={t('Previous')}><Icon name="chevronLeft" /></button>
          <button className="iconbtn studio-dice" onClick={() => setP(studioParams(randomStudio()))} aria-label={t('Surprise me')}><Icon name="dice" /></button>
          <button className="iconbtn" onClick={() => go(1)} aria-label={t('Next')}><Icon name="chevronRight" /></button>
          <button className={'iconbtn studio-star' + (fav ? ' on' : '')} onClick={() => onFav(th.id)} aria-pressed={fav} aria-label={t('Save to My themes')}><Icon name={fav ? 'starFill' : 'star'} /></button>
        </div>
      </div>
    </div>

    <div className="card studio-ctl">
      <ColorWheel h={p.h} s={p.s} a={p.a} onChange={set} />
      <ColorTools th={th} p={p} onChange={set} recent={recent} onRecent={q => setP(q)} />
      <HexPick mode={th.mode} onBuild={q => setP(q)} onPick={onPick} shown={shown} />
      <label className="studio-l"><span>{t('Background colour')}</span><b>{p.h}°</b></label>
      <Slider className="sld-hue" value={p.h} min={0} max={359} onChange={h => set({ h })} />
      <label className="studio-l"><span>{t('Colour strength')}</span><b>{p.s}/10</b></label>
      <Slider value={p.s} min={1} max={10} onChange={s => set({ s })} />
      <label className="studio-l"><span>{t('Accent colour')}</span><b>{p.a}°</b></label>
      <Slider className="sld-hue" value={p.a} min={0} max={350} step={10} onChange={a => set({ a })} />
      <label className="studio-l"><span>{t('Style')}</span><b>{t(VARIANTS.find(v => v.id === p.v).name)}</b></label>
      <div className="studio-styles">
        {VARIANTS.map(v => { const vt = studioTheme(studioNumber({ ...p, v: v.id })); return <button key={v.id} className={'studio-style' + (p.v === v.id ? ' on' : '')} onClick={() => set({ v: v.id })} aria-pressed={p.v === v.id}>
          <ThemeMock th={vt} /><span>{t(v.name)}</span>
        </button> })}
      </div>
      <label className="studio-l"><span>{t('Glow')}</span></label>
      <Segmented options={GLOW_OPTS.map(o => ({ value: o.value, label: t(o.label) }))} value={p.g} onChange={g => set({ g })} />
      <div className="studio-jump">
        <input className="input" inputMode="numeric" placeholder={t('Go to theme number…')} value={jump}
          onChange={e => setJump(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doJump() }} aria-label={t('Go to theme number…')} />
        <Button size="sm" onClick={doJump}>{t('Go')}</Button>
      </div>
      <Button variant="primary" icon={applied ? 'checkCircle' : 'palette'} disabled={applied} onClick={() => onPick(th.id)}>
        {applied ? t('This theme is on') : t('Use this theme')}
      </Button>
    </div>

    <section className="theme-fam">
      <h2 className="theme-fam-h row between"><span className="row" style={{ gap: 8 }}><Icon name="sparkles" />{t('Ideas for you')}</span>
        <button className="h2link" onClick={() => setIdeas(randomSet(9))}><Icon name="dice" /> {t('More')}</button></h2>
      <div className="theme-grid">
        {ideaCards}
      </div>
    </section>
  </div>
}


/* ---- 3.0: type or pick a colour → a Studio theme around it, and the closest curated one ---- */
function HexPick({ mode, onBuild, onPick, shown }) {
  const [hex, setHex] = useState('')
  const ok = normHex(hex)
  const near = ok ? nearestTheme(ok, mode) : null
  return <div className="hexpick">
    <label className="studio-l"><span>{t('Your own colour (HEX)')}</span></label>
    <div className="hexrow">
      <input type="color" value={ok || '#30d158'} onChange={e => setHex(e.target.value)} aria-label={t('Pick a colour')} />
      <input className="input" placeholder="#30d158" value={hex} maxLength={7} spellCheck={false} autoCapitalize="off"
        onChange={e => setHex(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && ok) onBuild(studioFromHex(ok, mode)) }} aria-label={t('Your own colour (HEX)')} />
      <Button size="sm" disabled={!ok} onClick={() => onBuild(studioFromHex(ok, mode))}>{t('Build')}</Button>
    </div>
    {hex && !ok && <div className="small" style={{ color: 'var(--orange)' }}>{t('Use 3 or 6 hex digits, like #30d158.')}</div>}
    {near && <div className="hex-near">
      <ThemeMock th={near} />
      <div><div className="small muted">{t('Closest ready-made theme')}</div><b>{themeName(near)}</b></div>
      <Button size="sm" variant={near.id === shown.id ? 'plain' : 'primary'} disabled={near.id === shown.id} onClick={() => onPick(near.id)}>{near.id === shown.id ? t('On') : t('Use')}</Button>
    </div>}
  </div>
}

/* ---- 3.0: My themes as a file — keep it, send it to a friend, load it on another phone ---- */
function ThemeFile({ S, update, pick }) {
  const ref = useRef(null)
  const toast = useUI(s => s.toast)
  const doExport = async () => {
    const json = exportThemes(S)
    const name = 'mahdi-jym-themes-' + todayISO() + '.json'
    if (MOBILE) { try { await shareExport(json, name); toast(t('Themes exported')) } catch (e) { /* dismissed */ } return }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    toast(t('Themes exported'))
  }
  const doImport = ev => {
    const f = ev.target.files && ev.target.files[0]
    ev.target.value = ''
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const d = parseThemes(String(rd.result))
        let added = 0
        update(s => {
          const have = (s.themeFavs || []).slice()
          for (const id of d.themes) if (!have.includes(id) && have.length < MAX_FAVS) { have.push(id); added++ }
          s.themeFavs = have
        })
        if (d.current) pick(d.current)
        toast(t('{0} themes added to My themes', added))
      } catch (e) { toast(t('This is not a MAHDI-JYM theme file')) }
    }
    rd.readAsText(f)
  }
  return <Section title={t('Theme file')} footer={t('Save My themes and the current theme as a small file, or load one from a friend or another phone.')}>
    <div className="theme-file">
      <Button icon="download" onClick={doExport}>{t('Export')}</Button>
      <Button icon="upload" onClick={() => ref.current && ref.current.click()}>{t('Import')}</Button>
    </div>
    <input ref={ref} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={doImport} />
  </Section>
}
