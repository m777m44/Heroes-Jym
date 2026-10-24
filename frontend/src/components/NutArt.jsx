// 10.0 — nuts and seeds, drawn: a pistachio opening its shell, a peanut in its pod, an almond, a
// walnut half, a cashew, a hazelnut with its cap, pine nuts, a macadamia, a Brazil nut, a pecan, a
// roasted chestnut with its cross, the striped sunflower seed, watermelon and pumpkin seeds, sesame,
// chia, flax, a roasted chickpea, kerzat (a little of everything) and dried coconut.
// Roasted pieces are a shade darker, salted ones sparkle with salt, `shell` shows them in the shell.
// `pile` draws three pieces in a small bowl (the hero); `live` makes them bob and the salt twinkle.
import { useId } from 'react'

function mix(hex, to, k) {
  const h = String(hex || '#888888').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const t = to === 'white' ? 255 : 0
  return '#' + c.map(v => Math.round(v + (t - v) * k).toString(16).padStart(2, '0')).join('')
}

// one piece, centred on 0,0, about 30 units across. `c(hex)` darkens it when roasted.
const PIECE = {
  pistachio: (c, shell) => shell
    ? <><ellipse rx="13" ry="9.6" fill={c('#ead6ad')} stroke={c('#bf9c63')} strokeWidth="1" /><path d="M-10.5 -1.6C-6 -7 6 -7 10.5 -1.6C6 1.8 -6 1.8 -10.5 -1.6Z" fill={c('#8cbf4a')} stroke={c('#6b4a6a')} strokeWidth="1.1" /><path d="M-12 1.6C-6 6.4 6 6.4 12 1.6" fill="none" stroke={c('#bf9c63')} strokeWidth=".9" /></>
    : <><ellipse rx="10.6" ry="7" fill={c('#93c24f')} /><path d="M-10.4 1.2C-6 6.8 6 6.8 10.4 1.2C7 3.2 -7 3.2 -10.4 1.2Z" fill={c('#7a4b6e')} opacity=".85" /><ellipse cx="-3" cy="-2.6" rx="4" ry="1.6" fill="#fff" opacity=".35" /></>,
  peanut: (c, shell) => shell
    ? <><path d="M-13 -1c0-5 4-7.4 7.6-6.6c2.6.6 3.6 2.4 5.4 2.4s2.8-1.8 5.4-2.4C19-8.4 21-1 13 1.6c-1.8.6-3.8 1.6-5.4 3.6c-1.8 2.2-3.8 3.4-6.6 3.4C-8 8.6-13 4.6-13-1Z" fill={c('#e3bf86')} stroke={c('#b48a4f')} strokeWidth="1" /><path d="M-9 -3l3 6M-4 -5l3 7M2 -3l3 6M7 -5l3 6" stroke={c('#c79f63')} strokeWidth=".8" /></>
    : <><ellipse cx="-4.6" rx="7" ry="5.6" fill={c('#d79a6a')} /><ellipse cx="5" cy=".6" rx="6.6" ry="5.4" fill={c('#cd8d5c')} /><ellipse cx="-6" cy="-2" rx="2.6" ry="1.2" fill="#fff" opacity=".35" /></>,
  almond: (c, shell) => <><path d="M-12 2C-12-4-4-9 13-6C9 4 1 9-5 9C-9 9-12 6-12 2Z" fill={c(shell ? '#dcbf8f' : '#b97a46')} stroke={c(shell ? '#b0905c' : '#8e5a30')} strokeWidth=".9" />
    {shell ? <g fill={c('#b0905c')}>{[[-6, 1], [-2, -2], [2, 1], [5, -2], [-3, 4], [1, 5]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".8" />)}</g>
      : <path d="M-8 3C-3 -1 4 -4 10 -5M-7 6C-1 3 5 0 9 -1" fill="none" stroke={c('#8e5a30')} strokeWidth=".8" opacity=".7" />}</>,
  walnut: (c, shell) => shell
    ? <><circle r="12" fill={c('#c49a68')} stroke={c('#93693c')} strokeWidth="1" /><path d="M0 -12V12M-7 -6c3 2 3 5 0 7M7 -6c-3 2-3 5 0 7M-6 6c2 1 4 1 6 0" fill="none" stroke={c('#93693c')} strokeWidth=".9" /></>
    : <><path d="M-12 0c0-6 4-9 8-9c2 0 3 1 4 2c1-1 2-2 4-2c4 0 8 3 8 9s-4 9-8 9c-2 0-3-1-4-2c-1 1-2 2-4 2c-4 0-8-3-8-9Z" fill={c('#cfa069')} stroke={c('#9c7140')} strokeWidth=".9" /><path d="M0 -7V7M-8 -3c2 1 3 3 2 6M8 -3c-2 1-3 3-2 6M-5 -6c1 2 0 4-2 4M5 -6c-1 2 0 4 2 4" fill="none" stroke={c('#9c7140')} strokeWidth=".8" /></>,
  cashew: c => <><path d="M-11 -4C-12 4-5 10 3 9C9 8 12 4 11 0C10-3 7-3 6 0C5 3 2 4-1 3C-4 2-5-1-5-4C-5-8-10-8-11-4Z" fill={c('#f0d7a2')} stroke={c('#c9a96c')} strokeWidth=".9" /><path d="M-8 -2C-8 3-3 6 2 6" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" /></>,
  hazelnut: (c, shell) => shell
    ? <><path d="M0 -12C8 -12 11 -4 11 2C11 8 6 12 0 12S-11 8-11 2C-11-4-8-12 0-12Z" fill={c('#a2643a')} stroke={c('#7a4524')} strokeWidth=".9" /><path d="M-9.6 4C-6 8 6 8 9.6 4C9 10 5 12 0 12S-9 10-9.6 4Z" fill={c('#d8b68c')} /><ellipse cx="-4" cy="-5" rx="2.4" ry="3.6" fill="#fff" opacity=".25" /></>
    : <><circle r="9.6" fill={c('#d0a06c')} stroke={c('#8f5d33')} strokeWidth=".9" /><path d="M-6 -3c3 -3 8 -2 9 1" fill="none" stroke={c('#8f5d33')} strokeWidth=".8" /><ellipse cx="-3" cy="-4" rx="2.4" ry="1.4" fill="#fff" opacity=".35" /></>,
  pine: c => <>{[[-7, -2, -20], [0, 2, 10], [7, -3, 35]].map(([x, y, r], i) => <path key={i} transform={`translate(${x} ${y}) rotate(${r})`} d="M0 -6.6C2.6 -6.6 3.4 -2 3.4 1C3.4 4.4 2 6.6 0 6.6S-3.4 4.4-3.4 1C-3.4-2-2.6-6.6 0-6.6Z" fill={c('#f1ddae')} stroke={c('#cfb479')} strokeWidth=".8" />)}</>,
  macadamia: c => <><circle r="10.6" fill={c('#f2e0b6')} stroke={c('#cdb27c')} strokeWidth=".9" /><path d="M-2 -10.4C0 -6 4 -5 8 -6.6" fill="none" stroke={c('#cdb27c')} strokeWidth=".8" /><ellipse cx="-4" cy="-3.6" rx="3" ry="2" fill="#fff" opacity=".4" /></>,
  brazil: c => <><path d="M-13 3C-13-2-8-6 0-7.5C6-8.6 11-8 13-5.5C14-3.5 12-1 8 1L-4 7C-9 9.4-13 8-13 3Z" fill={c('#7b4a2a')} stroke={c('#55301a')} strokeWidth=".9" /><path d="M-9 3C-9 0-5-3 1-4.6C5-5.6 8-5.4 9.4-4.4C8.6-2.6 6-1.2 3 .2L-4 4C-7 5.4-9 5-9 3Z" fill={c('#ecdcc0')} opacity=".92" /><path d="M-6 1.5C-2-1 3-2.6 7-3" fill="none" stroke={c('#b48a5e')} strokeWidth=".7" /></>,
  pecan: c => <><path d="M-13 0C-13-5-8-7 0-7S13-5 13 0S8 7 0 7S-13 5-13 0Z" fill={c('#93542e')} stroke={c('#673618')} strokeWidth=".9" /><path d="M-12 0H12M-8 -6c1 3 1 9 0 12M-3 -7c1 4 1 10 0 14M3 -7c-1 4-1 10 0 14M8 -6c-1 3-1 9 0 12" fill="none" stroke={c('#673618')} strokeWidth=".8" /></>,
  chestnut: c => <><path d="M0 -12C7 -12 12 -5 12 2C12 8 7 11 0 11S-12 8-12 2C-12-5-7-12 0-12Z" fill={c('#6e3620')} stroke={c('#4a2112')} strokeWidth=".9" /><path d="M-11.6 4C-7 7 7 7 11.6 4C11 9 6 11 0 11S-11 9-11.6 4Z" fill={c('#c8a17a')} /><path d="M-5 -6L5 2M5 -6L-5 2" stroke={c('#f2d38b')} strokeWidth="2.6" strokeLinecap="round" /><ellipse cx="-5" cy="-6" rx="2" ry="3" fill="#fff" opacity=".18" /></>,
  sunflower: (c, shell) => shell
    ? <><path d="M0 -13C5 -9 7 -2 6.4 4C5.8 9 3 12 0 12S-5.8 9-6.4 4C-7-2-5-9 0-13Z" fill={c('#2f2f33')} /><path d="M0 -12V11M-3.4 -7C-4 -1-4 5-2.6 10M3.4 -7C4 -1 4 5 2.6 10" stroke="#e9e9ee" strokeWidth="1" opacity=".8" /></>
    : <path d="M0 -9C3.4 -6 4.4 -1 4 3C3.6 7 2 9 0 9S-3.6 7-4 3C-4.4-1-3.4-6 0-9Z" fill={c('#a7a58a')} stroke={c('#7e7c63')} strokeWidth=".8" />,
  watermelon: (c, shell) => shell
    ? <><path d="M0 -10C5 -10 8 -5 8 1C8 7 4 11 0 11S-8 7-8 1C-8-5-5-10 0-10Z" fill={c('#3a2f28')} stroke={c('#1f1814')} strokeWidth=".9" /><path d="M-5 -2C-5 4-2 8 0 8" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1.2" /></>
    : <ellipse rx="5.6" ry="8" fill={c('#e7dcc0')} stroke={c('#b9aa86')} strokeWidth=".8" />,
  pumpkin: (c, shell) => shell
    ? <><path d="M0 -12C6 -11 9 -4 9 2C9 8 5 12 0 12S-9 8-9 2C-9-4-6-11 0-12Z" fill={c('#f1ead2')} stroke={c('#c8bc95')} strokeWidth="1" /><path d="M0 -9.6C4 -8.6 6.4 -3 6.4 2C6.4 6.6 3.6 9.6 0 9.6S-6.4 6.6-6.4 2C-6.4-3-4-8.6 0-9.6Z" fill="none" stroke={c('#d8cca6')} strokeWidth=".9" /></>
    : <path d="M0 -10C4.6 -9 7 -3 7 2C7 7 4 10 0 10S-7 7-7 2C-7-3-4.6-9 0-10Z" fill={c('#6f9440')} stroke={c('#4d6d26')} strokeWidth=".8" />,
  sesame: c => <>{[[-7, -3, -30], [-1, -6, 10], [5, -2, 40], [-4, 4, -10], [3, 5, 25], [9, 4, 60]].map(([x, y, r], i) => <path key={i} transform={`translate(${x} ${y}) rotate(${r})`} d="M0 -4C1.8 -3 2.4 -1 2.2 1C2 3 1 4 0 4S-2 3-2.2 1C-2.4-1-1.8-3 0-4Z" fill={c('#efdcad')} stroke={c('#c6ae78')} strokeWidth=".6" />)}</>,
  chia: c => <>{[[-7, -3, '#4c4744'], [-2, -6, '#a9a39b'], [4, -4, '#2f2c2a'], [8, 1, '#7b746e'], [-5, 3, '#2f2c2a'], [0, 1, '#d8d2c8'], [4, 5, '#4c4744'], [-9, 2, '#a9a39b'], [-1, 7, '#7b746e']].map(([x, y, f], i) => <ellipse key={i} cx={x} cy={y} rx="2" ry="1.5" fill={c(f)} />)}</>,
  flax: c => <>{[[-7, -2, -25], [0, -5, 15], [7, -1, 50], [-3, 5, -5], [5, 6, 30]].map(([x, y, r], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}><path d="M0 -4.6C2 -3.6 2.8 -1 2.6 1.4C2.4 3.6 1.2 4.6 0 4.6S-2.4 3.6-2.6 1.4C-2.8-1-2-3.6 0-4.6Z" fill={c('#9a6537')} /><ellipse cx="-.8" cy="-1.6" rx=".8" ry="1.6" fill="#fff" opacity=".45" /></g>)}</>,
  chickpea: c => <><path d="M0 -10C6 -10 10 -5 10 1C10 7 5 10 0 10S-10 7-10 1C-10-3-8-6-6-7.4C-6-9.4-4-11-2-10.6C-1.4-10.2-.8-10 0-10Z" fill={c('#e3b260')} stroke={c('#b98634')} strokeWidth=".9" /><path d="M-4 -6C-1 -2-1 3-4 7" fill="none" stroke={c('#b98634')} strokeWidth=".8" opacity=".7" /><ellipse cx="3" cy="-3.6" rx="2.6" ry="1.6" fill="#fff" opacity=".35" /></>,
  coconut: c => <><path d="M-13 -1A13 13 0 0 0 13 -1Z" fill={c('#7a4a2a')} /><path d="M-11 -1A11 11 0 0 0 11 -1Z" fill="#fbf8f1" /><path d="M-8 -1A8 8 0 0 0 8 -1Z" fill={c('#efe7d6')} /><path d="M-13 -1H13" stroke={c('#5a3219')} strokeWidth="1.2" /></>,
}
PIECE.kerzat = PIECE.peanut

export default function NutArt({ nut, size = 48, live = false, shell = false, form = null, pile = false, className = '', label }) {
  const raw = useId()
  const id = 'na' + raw.replace(/[^a-zA-Z0-9]/g, '')
  const n = nut || {}
  const fm = form || n.def || 'raw'
  const k = fm === 'raw' ? 0 : 0.14
  const c = hex => (k ? mix(hex, 'black', k) : hex)
  const sh = shell && n.shell
  const salted = fm === 'salted'
  const draw = (kind, hasShell) => (PIECE[kind] || PIECE.almond)(c, hasShell)
  const pieces = pile
    ? (n.id === 'kerzat' ? [['peanut', -14, 2, -18, 1.02, true], ['pistachio', 14, 3, 14, 1.02, true], ['cashew', -1, -9, 8, 1.08, false], ['sunflower', 3, 10, 70, 0.84, true]]
      : [[n.id, -13, 4, -16, 1.04, sh], [n.id, 13, 5, 18, 1.04, sh], [n.id, 0, -8, 4, 1.16, sh]])
    : n.id === 'kerzat' ? [['peanut', -8, 4, -18, 1, true], ['cashew', 9, -5, 12, 1, false], ['pistachio', 3, 12, 4, 0.82, true]]
      : [[n.id, 0, 0, -12, 1.7, sh]]
  return <svg className={'na' + (live ? ' live' : '') + (salted ? ' salted' : '') + (className ? ' ' + className : '')} viewBox="0 0 64 64" width={size} height={size}
    role="img" aria-label={label || undefined} aria-hidden={label ? undefined : true}>
    <defs>
      <radialGradient id={id + 'b'} cx=".5" cy=".3" r=".8">
        <stop offset="0" stopColor="#b98256" /><stop offset="1" stopColor="#6e4325" />
      </radialGradient>
    </defs>
    {pile && <>
      <ellipse className="na-shadow" cx="32" cy="58" rx="24" ry="3.4" />
      <path d="M8 38H56C55 50 45 57 32 57S9 50 8 38Z" fill={`url(#${id}b)`} />
      <ellipse cx="32" cy="38" rx="24" ry="5" fill="#8a5632" />
      <ellipse cx="32" cy="38" rx="21" ry="3.6" fill="#5a3519" />
      <path d="M14 45C20 52 44 52 50 45" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="1.6" strokeLinecap="round" />
    </>}
    {!pile && <ellipse className="na-shadow" cx="32" cy="54" rx="17" ry="3" />}
    <g transform="translate(32 31)">
      {pieces.map(([kind, x, y, r, s, hs], i) => <g key={i} transform={`translate(${x} ${y})`}>
        <g className="na-p" style={{ animationDelay: (i * 0.45) + 's' }}>
          <g transform={`rotate(${r}) scale(${s})`}>{draw(kind, hs)}</g>
        </g>
      </g>)}
      {salted && <g className="na-salt">{[[-9, -6], [6, -9], [10, 2], [-4, 6], [2, -2], [-12, 3], [13, -5]].map(([x, y], i) => <rect key={i} x={x} y={y} width="1.6" height="1.6" rx=".3" transform={`rotate(${i * 23} ${x} ${y})`} style={{ animationDelay: (i * 0.3) + 's' }} />)}</g>}
    </g>
  </svg>
}
