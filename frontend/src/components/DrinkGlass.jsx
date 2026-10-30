// 9.0 — a drink, drawn: its own vessel (a tall glass, a mug, the Iraqi istikan on its saucer, a
// jug, a small finjan or a shaker) filled with the drink's colour; ice for cold drinks, steam for
// hot ones, a lemon slice or a mint leaf when they are in it, a straw in tall cold glasses.
// Pure SVG; `live` animates the surface, bubbles and steam (the detail screen only — a list of
// seventy drinks stays still, which is kinder to the battery).
import { useId } from 'react'
import { Photo, usePhotos } from './FoodPhoto.jsx'

// viewBox 0 0 100 120 · body path, liquid top (fraction of the inner height) and the inner span
const V = {
  tall: { d: 'M26 14H74L68.4 104.6Q67.8 110 62.4 110H37.6Q32.2 110 31.6 104.6Z', y0: 14, y1: 110, lvl: 0.76 },
  mug: { d: 'M22 34H70V92Q70 108 54 108H38Q22 108 22 92Z', y0: 34, y1: 108, lvl: 0.74, handle: 'M70 46h5a12 12 0 0 1 0 24h-5' },
  istikan: { d: 'M32 34C34 52 40 62 40 72C40 82 35 88 36 96Q37 102 43 102H57Q63 102 64 96C65 88 60 82 60 72C60 62 66 52 68 34Z', y0: 34, y1: 102, lvl: 0.82, saucer: [50, 106, 30, 4.6] },
  jug: { d: 'M31 20H67L65 30Q75 40 75 60V96Q75 108 63 108H35Q23 108 23 96V60Q23 40 33 30Z', y0: 20, y1: 108, lvl: 0.66, handle: 'M74 44q12 2 12 16t-11 18', spout: 'M31 20l-7 5' },
  finjan: { d: 'M26 58H74Q73 92 50 94Q27 92 26 58Z', y0: 58, y1: 94, lvl: 0.7, saucer: [50, 98, 31, 4.4] },
  shaker: { d: 'M30 32H70V100Q70 108 62 108H38Q30 108 30 100Z', y0: 32, y1: 108, lvl: 0.7, lid: 'M32 18Q32 14 36 14H64Q68 14 68 18V32H32Z' },
}
export const GLASSES = Object.keys(V)

function mix(hex, to, k) {
  const h = String(hex || '#7cc35a').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const t = to === 'white' ? 255 : 0
  return '#' + c.map(v => Math.round(v + (t - v) * k).toString(16).padStart(2, '0')).join('')
}

/**
 * <DrinkGlass drink={d} size={56} live />  — d needs { g, col, t, ing } (library or your own).
 * `level` overrides how full it is (0–1), e.g. while building a drink.
 */
function GlassDrawn({ drink, size = 56, live = false, level = null, className = '', label }) {
  const uidRaw = useId()
  const id = 'dg' + uidRaw.replace(/[^a-zA-Z0-9]/g, '')
  const d = drink || {}
  const v = V[d.g] || V.tall
  const hot = d.t === 'h'
  const has = k => (d.ing || []).some(r => r.id === k && !r.opt)
  const lvl = Math.max(0.12, Math.min(0.95, level == null ? v.lvl : level))
  const top = v.y0 + (1 - lvl) * (v.y1 - v.y0)
  const col = d.col || '#7cc35a'
  const light = mix(col, 'white', 0.38), dark = mix(col, 'black', 0.22)
  const sparkling = has('sparkling')
  const cold = !hot
  const lemon = has('lemon') || has('lemonjuice') || has('lime') || has('limejuice')
  const mint = has('mint')
  const straw = cold && (d.g === 'tall' || !d.g)
  return <svg className={'dg' + (live ? ' live' : '') + (hot ? ' hot' : ' cold') + (className ? ' ' + className : '')}
    viewBox="0 0 100 120" width={size} height={size * 1.2} role="img" aria-label={label || undefined} aria-hidden={label ? undefined : true}>
    <defs>
      <clipPath id={id + 'c'}><path d={v.d} /></clipPath>
      <linearGradient id={id + 'g'} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={light} />
        <stop offset="1" stopColor={dark} />
      </linearGradient>
      <linearGradient id={id + 's'} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity=".55" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
    {v.saucer && <ellipse className="dg-saucer" cx={v.saucer[0]} cy={v.saucer[1]} rx={v.saucer[2]} ry={v.saucer[3]} />}
    {v.lid && <path className="dg-lid" d={v.lid} />}
    {straw && <path className="dg-straw" d="M62 2L54 70" />}
    <path className="dg-body" d={v.d} />
    <g clipPath={`url(#${id}c)`}>
      <rect x="0" y={top} width="100" height={120 - top} fill={`url(#${id}g)`} />
      <g className="dg-wave" style={{ transformOrigin: '50% ' + top + 'px' }}>
        <path d={`M-50 ${top} q12.5 -3.2 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V${top + 6} H-50Z`} fill={light} opacity=".85" />
      </g>
      {cold && !sparkling && <g className="dg-ice">
        <rect x="36" y={top + 4} width="13" height="13" rx="3.2" transform={`rotate(-12 42 ${top + 10})`} />
        <rect x="52" y={top + 7} width="12" height="12" rx="3" transform={`rotate(14 58 ${top + 13})`} />
      </g>}
      {(sparkling || (cold && live)) && <g className="dg-bubs">
        {[[40, 0.9, 0], [55, 0.7, 0.6], [62, 1.1, 1.2], [47, 0.6, 1.7]].map(([x, r, dl], i) =>
          <circle key={i} cx={x} cy={v.y1 - 8} r={1.4 + r} style={{ animationDelay: dl + 's' }} />)}
      </g>}
      <rect x="0" y="0" width="22" height="120" fill={`url(#${id}s)`} opacity=".5" transform="translate(30 0) skewX(-6)" />
    </g>
    <path className="dg-rim" d={v.d} />
    {v.handle && <path className="dg-handle" d={v.handle} />}
    {v.spout && <path className="dg-rim" d={v.spout} />}
    {lemon && d.g !== 'mug' && d.g !== 'finjan' && <g className="dg-lemon" transform={`translate(${d.g === 'istikan' ? 66 : 72} ${v.y0 + 1})`}>
      <circle r="9.5" />
      <circle r="6.6" className="dg-lemon-in" />
      <path d="M0 -6.6V6.6M-6.6 0H6.6M-4.7 -4.7L4.7 4.7M4.7 -4.7L-4.7 4.7" />
    </g>}
    {mint && <path className="dg-mint" d={`M${d.g === 'mug' ? 30 : 34} ${v.y0 + 2}c-6 -10 4 -16 12 -14c-1 8 -6 13 -12 14Z`} />}
    {hot && <g className="dg-steam">
      <path d={`M40 ${v.y0 - 4}c-5 -6 5 -9 0 -16`} />
      <path d={`M50 ${v.y0 - 6}c-5 -6 5 -9 0 -17`} />
      <path d={`M60 ${v.y0 - 4}c-5 -6 5 -9 0 -16`} />
    </g>}
  </svg>
}

/**
 * 14.0 — the real photo of the drink (lib/photos) when it has one; the drawing otherwise, or with
 * `drawn` (the pack, form and mix pickers, where the drawing's shape is the point).
 */
export default function DrinkGlass(props) {
  const ph = usePhotos()
  const d = props.drink
  const k = !props.drawn && ph && d && !d.mine ? ph.photoKey('D', d.id) : null
  const art = <GlassDrawn {...props} />
  if (!k) return art
  const size = props.size || 48
  return <span className={'art-ph' + (props.className ? ' ' + props.className : '')} style={{ width: size, height: size }} role={props.label ? 'img' : undefined} aria-label={props.label || undefined}>
    <Photo k={k} size="t" alt="" fallback={art} />
  </span>
}
