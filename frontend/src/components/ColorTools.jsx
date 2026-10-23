// 4.0 — the Theme Studio's toolbox under the colour wheel: the theme's real colours with HEX /
// RGB / HSL to copy, a gradient preview, colour harmonies for the accent, and your recent Studio
// themes.
import { themeTokens, studioTheme, studioParams } from '../lib/themes.js'
import { rgbText, hslText, colourName, HARMONIES, harmonyAccent } from '../lib/colorTools.js'
import { copyText } from '../lib/clipboard.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import Icon from './Icon.jsx'

function Swatch({ label, hex }) {
  const copy = async v => { const ok = await copyText(v); useUI.getState().toast(ok ? t('Copied: {0}', v) : t('Could not copy')) }
  return <div className="ctool-sw">
    <i style={{ background: hex }} />
    <div className="grow">
      <div className="small muted">{label} · {t(colourName(hex))}</div>
      <div className="ctool-vals">
        {[hex.toUpperCase(), rgbText(hex), hslText(hex)].map(v => <button key={v} className="ctool-v" onClick={() => copy(v)} aria-label={t('Copy {0}', v)}>
          <span dir="ltr">{v}</span><Icon name="copy" />
        </button>)}
      </div>
    </div>
  </div>
}

export default function ColorTools({ th, p, onChange, recent = [], onRecent }) {
  const tk = themeTokens(th)
  const acc = tk.accent['--acc']
  const surf = (tk.surfaces && tk.surfaces['--surface']) || tk.bg
  const cur = HARMONIES.find(x => harmonyAccent(p.h, x.id) === p.a)
  return <div className="ctool">
    <div className="ctool-grad" style={{ background: `linear-gradient(90deg, ${tk.bg}, ${surf} 45%, ${acc})` }} aria-hidden="true" />
    <Swatch label={t('Background')} hex={tk.bg} />
    <Swatch label={t('Accent')} hex={acc} />
    <label className="studio-l"><span>{t('Colour harmony')}</span>{cur && <b>{t(cur.name)}</b>}</label>
    <div className="chips ctool-harm">
      {HARMONIES.map(x => { const a = harmonyAccent(p.h, x.id); return <button key={x.id} className={'chip nocap' + (cur && cur.id === x.id ? ' on' : '')} aria-pressed={!!cur && cur.id === x.id} onClick={() => onChange({ a })}>
        <i className="ctool-dot" style={{ background: `hsl(${p.h} 70% 50%)` }} /><i className="ctool-dot" style={{ background: `hsl(${a} 88% 56%)` }} />{t(x.name)}
      </button> })}
    </div>
    {recent.length > 0 && <>
      <label className="studio-l"><span>{t('Recent colours')}</span></label>
      <div className="ctool-recent">
        {recent.map(n => { const q = studioParams(n); if (!q) return null; const rt = themeTokens(studioTheme(n)); return <button key={n} className={'ctool-rc' + (n === th.studio?.n ? ' on' : '')} onClick={() => onRecent(q)} aria-label={t('Studio #{0}', fmtNum(n))} title={'#' + fmtNum(n)}
          style={{ background: rt.bg, boxShadow: `inset 0 0 0 5px ${rt.bg}, inset 0 0 0 20px ${rt.accent['--acc']}` }} /> })}
      </div>
    </>}
  </div>
}
