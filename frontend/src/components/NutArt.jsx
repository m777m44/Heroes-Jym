// 10.0 — nuts and seeds, drawn: a pistachio opening its shell, a peanut in its pod, an almond, a
// walnut half, a cashew, a hazelnut with its cap, pine nuts, a macadamia, a Brazil nut, a pecan, a
// roasted chestnut with its cross, the striped sunflower seed, watermelon and pumpkin seeds, sesame,
// chia, flax, a roasted chickpea, kerzat (a little of everything) and dried coconut.
// Roasted pieces are a shade darker, salted ones sparkle with salt, `shell` shows them in the shell.
// `pile` draws three pieces in a small bowl (the hero); `live` makes them bob and the salt twinkle.
// 11.0 — melon seeds, lemon pistachios, an acorn in its cap, popcorn, a corn kernel, lupini, crunchy
// peanuts, royal and seed kerzat; dates (each kind its own colour), raisins, figs, apricots, a sheet
// of qamar al-din, mulberries, prunes, banana chips; sugared almonds and chickpeas, chocolate nuts,
// simsimiya and jowziya bars and a date stuffed with an almond. Shapes may take the item's colour.
// 12.0 — jars of nut butter and spreads, beans, dried-fruit strips, baklawa, kleicha, halqoum and
// the new mixes (mixed nuts, trail mix, student mix, sweet and spicy kerzat).
import { useId } from 'react'
import { Photo, usePhotos } from './FoodPhoto.jsx'

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
// 11.0 — `col` is the item's own colour (dates, raisins, sugared sweets come in several)
const ds = (col, k) => mix(col, 'black', k)
Object.assign(PIECE, {
  melon: (c, shell) => shell
    ? <><path d="M0 -11C5 -10 7.4 -4 7.4 1.6C7.4 7.6 4 11 0 11S-7.4 7.6-7.4 1.6C-7.4-4-5-10 0-11Z" fill={c('#f1e8cc')} stroke={c('#c9b98f')} strokeWidth=".9" /><path d="M0 -8.6C3 -7.8 5 -3 5 1.6C5 6 2.8 8.6 0 8.6" fill="none" stroke={c('#ddd0aa')} strokeWidth=".8" /></>
    : <ellipse rx="5" ry="8" fill={c('#efe3c4')} stroke={c('#c4b48a')} strokeWidth=".8" />,
  acorn: c => <><path d="M-7.6 -1.6C-7.6 6-4 11 0 11S7.6 6 7.6-1.6Z" fill={c('#b5793f')} stroke={c('#80501f')} strokeWidth=".9" /><path d="M-9.4 -1.4C-9.4-6.4-5-9.6 0-9.6S9.4-6.4 9.4-1.4C6 0-6 0-9.4-1.4Z" fill={c('#7a5a34')} stroke={c('#4f3a1f')} strokeWidth=".9" /><path d="M-6 -5.2h12M-8 -3h16" stroke={c('#5d4426')} strokeWidth=".7" /><path d="M0 -9.6V-12.6" stroke={c('#4f3a1f')} strokeWidth="1.4" strokeLinecap="round" /><ellipse cx="-3" cy="4" rx="1.6" ry="3" fill="#fff" opacity=".22" /></>,
  popcorn: c => <><g fill={c('#fff8e6')} stroke={c('#e3cf9c')} strokeWidth=".8"><circle cx="-4.6" cy="-2" r="5.4" /><circle cx="4" cy="-4" r="5" /><circle cx="5" cy="3.6" r="4.6" /><circle cx="-3" cy="5" r="4.8" /><circle cx=".4" cy="0" r="4.6" /></g><path d="M-2 -1.4C-1 1.4 1.4 2.4 3.6 1.6" fill="none" stroke={c('#f0b44a')} strokeWidth="1.2" strokeLinecap="round" /></>,
  corn: c => <><path d="M-6 -9C-2 -11 2 -11 6 -9C8 -4 6.6 4 3.4 9.4C1.6 11.4-1.6 11.4-3.4 9.4C-6.6 4-8-4-6-9Z" fill={c('#f2b33d')} stroke={c('#c4841b')} strokeWidth=".9" /><path d="M-4 -7.6C-1.4 -8.6 1.4 -8.6 4 -7.6C4 -4 1.6 -2 0 -2S-4 -4-4 -7.6Z" fill={c('#fbe3a0')} /><ellipse cx="-2.4" cy="2" rx="1.2" ry="3" fill="#fff" opacity=".3" /></>,
  lupin: c => <><ellipse rx="10" ry="8.6" fill={c('#f4d35e')} stroke={c('#c9a32e')} strokeWidth=".9" /><path d="M6.6 -2.6C8.6 -1.6 8.6 1.6 6.6 2.6" fill="none" stroke={c('#b08a1e')} strokeWidth="1.1" /><ellipse cx="-3" cy="-3" rx="3.4" ry="1.8" fill="#fff" opacity=".4" /></>,
  crunchy: c => <><circle r="9" fill={c('#d98e3f')} stroke={c('#a9651f')} strokeWidth=".9" /><g fill={c('#b8702a')}>{[[-4, -1], [2, -4], [4, 2], [-1, 4], [-5, 3.6], [5.4, -1.4], [0, 0]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".9" />)}</g><ellipse cx="-3" cy="-3.6" rx="2.6" ry="1.6" fill="#fff" opacity=".35" /></>,
  date: (c, _s, col = '#b5772f') => <><path d="M0 -12C5 -12 7 -6 7 0C7 7 4.6 12 0 12S-7 7-7 0C-7-6-5-12 0-12Z" fill={c(col)} stroke={c(ds(col, 0.32))} strokeWidth=".9" /><path d="M-3 -7C-4 -2-4 3-2.6 8M2.6 -8C3.6 -3 3.4 2 2.2 7" fill="none" stroke={c(ds(col, 0.36))} strokeWidth=".7" opacity=".75" /><ellipse cx="-2.6" cy="-5" rx="1.6" ry="3.4" fill="#fff" opacity=".3" /></>,
  raisin: (c, _s, col = '#4a2a3a') => <><path d="M-6 -4C-4 -8 3 -8.6 6 -5C8.6 -2 8 4 5 6.4C2 8.6-3.6 8.4-6 5.4C-8 3-8 -1.4-6 -4Z" fill={c(col)} stroke={c(ds(col, 0.3))} strokeWidth=".8" /><path d="M-3.6 -3C-1 -1.6 1 -1.8 3.6 -3.4M-4 2C-1.6 3.4 1.6 3.4 4.4 1.6" fill="none" stroke={c(ds(col, 0.38))} strokeWidth=".7" /><ellipse cx="-2.4" cy="-4.2" rx="1.6" ry=".9" fill="#fff" opacity=".35" /></>,
  fig: c => <><path d="M0 -11C2 -11 2.6 -9 2.4 -7.6C7 -6 10 -2 10 2.6C10 8 5.6 11 0 11S-10 8-10 2.6C-10-2-7-6-2.4-7.6C-2.6-9-2-11 0-11Z" fill={c('#8a6a48')} stroke={c('#5c4228')} strokeWidth=".9" /><g fill={c('#e9d3a8')}>{[[-4, 2], [-1, 5], [3, 3], [5, -1], [0, 0], [-5, -2], [2, 7]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".7" />)}</g><ellipse cx="-4" cy="-3" rx="2" ry="1.2" fill="#fff" opacity=".22" /></>,
  apricot: c => <><path d="M0 -10C6 -10 10.6 -5.6 10.6 0S6 10 0 10S-10.6 5.6-10.6 0S-6 -10 0 -10Z" fill={c('#f29f3d')} stroke={c('#c76f15')} strokeWidth=".9" /><path d="M0 -10C-2.4 -4-2.4 4 0 10" fill="none" stroke={c('#c76f15')} strokeWidth=".9" /><ellipse cx="4" cy="-4" rx="2.6" ry="1.6" fill="#fff" opacity=".32" /></>,
  sheet: c => <><path d="M-11 -7L9 -9.4L11 7L-9 9.4Z" fill={c('#f08a24')} stroke={c('#b85e0c')} strokeWidth=".9" /><path d="M-11 -7L-3.6 -1.4L-9 9.4Z" fill={c('#d9731a')} /><path d="M-1 -5.6L7 -6.6" stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" strokeLinecap="round" /></>,
  mulberry: (c, _s, col = '#d8c7a2') => <><path d="M0 -12.6V-9.6" stroke={c('#7d8f3a')} strokeWidth="1.4" strokeLinecap="round" />{[[0, -7], [-3, -4.4], [3, -4.4], [-4, -0.6], [0, -1.6], [4, -0.6], [-3.4, 3.2], [1, 2.6], [3.6, 3.4], [-1, 6.4], [2, 6.6]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill={c(col)} stroke={c(ds(col, 0.25))} strokeWidth=".5" />)}</>,
  prune: c => <><path d="M0 -10.6C6.4 -10.6 9.6 -5 9.6 0.6C9.6 6.6 5.4 10.6 0 10.6S-9.6 6.6-9.6 0.6C-9.6-5-6.4-10.6 0-10.6Z" fill={c('#3a1f2b')} stroke={c('#1f0f17')} strokeWidth=".9" /><path d="M-4 -5C-5 0-4 4-1.6 7M3 -6C4 -1 3.6 3 2 6" fill="none" stroke="#000" strokeOpacity=".35" strokeWidth=".8" /><ellipse cx="-3" cy="-5" rx="2" ry="3" fill="#fff" opacity=".2" /></>,
  chip: c => <><circle r="9.6" fill={c('#f3d98a')} stroke={c('#c9a24a')} strokeWidth=".9" /><circle r="3.2" fill="none" stroke={c('#b98a3a')} strokeWidth="1" strokeDasharray="1 1.4" /><path d="M-6 -5C-3 -7.4 3 -7.4 6 -5" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" strokeLinecap="round" /></>,
  sugared: (c, _s, col = '#f6eaf2') => <><ellipse rx="10.4" ry="7.4" fill={c(col)} stroke={c(ds(col, 0.18))} strokeWidth=".9" /><ellipse cx="-3.6" cy="-3" rx="4" ry="1.7" fill="#fff" opacity=".75" /></>,
  sugarball: (c, _s, col = '#f9dfe9') => <><circle r="8" fill={c(col)} stroke={c(ds(col, 0.2))} strokeWidth=".9" /><ellipse cx="-2.6" cy="-3" rx="2.8" ry="1.6" fill="#fff" opacity=".75" /></>,
  choc: c => <><ellipse rx="10.6" ry="7.8" fill={c('#5a3825')} stroke={c('#3a2214')} strokeWidth=".9" /><path d="M-6 -4C-3 -6 3 -6 6 -4" fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth="1.4" strokeLinecap="round" /></>,
  bar: (c, _s, col = '#e2b55e') => <><rect x="-13" y="-6.4" width="26" height="12.8" rx="2.8" fill={c(col)} stroke={c(ds(col, 0.3))} strokeWidth=".9" /><g fill={c(mix(col, 'white', 0.55))}>{[[-9, -3, 20], [-5, 1, -30], [-1, -3.4, 50], [3, 1.6, 10], [7, -2.6, -40], [9.6, 2.4, 30], [-8, 3.4, 60], [0, 3.6, -20], [5, -0.4, 70]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="1.4" ry=".7" transform={`rotate(${r} ${x} ${y})`} />)}</g><path d="M-11 -4.6H11" stroke="#fff" strokeOpacity=".3" strokeWidth="1" strokeLinecap="round" /></>,
  nutbar: (c, _s, col = '#b07a3f') => <><rect x="-13" y="-6.4" width="26" height="12.8" rx="2.8" fill={c(col)} stroke={c(ds(col, 0.32))} strokeWidth=".9" /><g fill={c('#d8b07c')} stroke={c('#8a5a2c')} strokeWidth=".5">{[[-8, -1, 3], [-1, 1.6, 3.4], [6, -1.4, 3]].map(([x, y, r], i) => <g key={i}><ellipse cx={x} cy={y} rx={r} ry={r * 0.75} /><path d={`M${x} ${y - r * 0.7}V${y + r * 0.7}`} fill="none" /></g>)}</g></>,
  stuffed: c => <><path d="M0 -12C5.4 -12 7.6 -6 7.6 0C7.6 7 5 12 0 12S-7.6 7-7.6 0C-7.6-6-5.4-12 0-12Z" fill={c('#6b3a1f')} stroke={c('#40200f')} strokeWidth=".9" /><path d="M-2.6 -7.4C0 -9 3 -6 2.6 0C2.2 5-1 8-2.6 6.6C-4 3-4.4 -4-2.6 -7.4Z" fill={c('#e8cfa3')} stroke={c('#b8925c')} strokeWidth=".7" /><ellipse cx="-4" cy="-6" rx="1.2" ry="2.6" fill="#fff" opacity=".25" /></>,
})
// 12.0 — a jar of nut butter or spread, a bean (bagilla, edamame, peas), a dried-fruit strip, a
// baklawa diamond, a kleicha swirl and a cube of halqoum — each in the item's own colour
Object.assign(PIECE, {
  jar: (c, _s, col = '#c68a3c') => <><rect x="-9" y="-6" width="18" height="17" rx="3.4" fill={c('#f4efe6')} stroke={c('#cfc4b1')} strokeWidth=".8" /><rect x="-7.6" y="-2" width="15.2" height="11.6" rx="2.4" fill={c(col)} /><rect x="-10" y="-11" width="20" height="5.6" rx="1.6" fill={c(mix(col, 'black', 0.35))} /><path d="M-5 1h3" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" /></>,
  bean: (c, _s, col = '#a7b36b') => <><path d="M-10 -2C-10 -8 -3 -10 2 -8C5 -7 6 -4 8 -4C11 -4 12 0 11 4C9.6 9 2 10 -3 8.6C-8 7 -10 3 -10 -2Z" fill={c(col)} stroke={c(mix(col, 'black', 0.3))} strokeWidth=".9" /><path d="M-5 -3C-3 -5 0 -5 2 -4" stroke="#fff" strokeOpacity=".45" strokeWidth="1.2" fill="none" strokeLinecap="round" /></>,
  slice: (c, _s, col = '#f6a623') => <><path d="M-12 4C-8 -6 4 -10 12 -6C9 -1 2 6 -6 9C-9 10 -12 8 -12 4Z" fill={c(col)} stroke={c(mix(col, 'black', 0.25))} strokeWidth=".9" /><path d="M-7 3C-3 -2 2 -5 7 -5" stroke="#fff" strokeOpacity=".35" strokeWidth="1.1" fill="none" strokeLinecap="round" /></>,
  baklava: (c, _s, col = '#d9a441') => <><path d="M0 -11L12 0L0 11L-12 0Z" fill={c(col)} stroke={c(mix(col, 'black', 0.3))} strokeWidth=".9" /><path d="M-8 -3.6H8M-10 0H10M-8 3.6H8" stroke={c(mix(col, 'black', 0.18))} strokeWidth=".7" /><circle r="2.6" fill={c('#7fae4a')} /></>,
  cookie: (c, _s, col = '#c88a4a') => <><circle r="10.6" fill={c(col)} stroke={c(mix(col, 'black', 0.3))} strokeWidth=".9" /><path d="M0 0c2 0 2.6 2.4.6 3.4c-3 1.4-6-1.2-5-4.4c1.4-4.4 7.6-5 9.6-.6c2.2 4.6-1.6 9.6-6.6 9.4" fill="none" stroke={c(mix(col, 'black', 0.35))} strokeWidth="1.3" strokeLinecap="round" /></>,
  cube: (c, _s, col = '#f2b8c6') => <><path d="M-9 -4L0 -9L9 -4V6L0 11L-9 6Z" fill={c(col)} stroke={c(mix(col, 'black', 0.25))} strokeWidth=".9" /><path d="M-9 -4L0 1L9 -4M0 1V11" stroke={c(mix(col, 'black', 0.15))} strokeWidth=".8" fill="none" /><g fill="#fff" opacity=".85">{[[-4, -4], [3, -5], [0, -7], [5, 3], [-5, 4]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".7" />)}</g></>,
})
// items drawn with another's piece
Object.assign(PIECE, {
  // 12.0
  pbutter: PIECE.jar, almondbutter: PIECE.jar, tahini: PIECE.jar, cashewbutter: PIECE.jar, sunbutter: PIECE.jar, pistachiocream: PIECE.jar, hazelnutspread: PIECE.jar,
  dibisrashi: PIECE.jar, datepaste: PIECE.jar, almondsmoked: PIECE.almond, pistachioshelled: PIECE.pistachio, mixednuts: PIECE.almond, sunflowershelled: PIECE.sunflower,
  sunflowerbbq: PIECE.sunflower, whiteseeds: PIECE.pumpkin, pumpkinshelled: PIECE.pumpkin, hemp: PIECE.sesame, poppy: PIECE.chia, nigella: PIECE.chia,
  cashewspicy: PIECE.cashew, peanutspicy: PIECE.peanut, kerzatspicy: PIECE.peanut, soynuts: PIECE.chickpea, peasroasted: PIECE.bean, favaroasted: PIECE.bean,
  bagilla: PIECE.bean, lablabi: PIECE.chickpea, peanutsboiled: PIECE.peanut, edamame: PIECE.bean, coconutfresh: PIECE.coconut, coconutchips: PIECE.slice,
  seedbar: PIECE.nutbar, granola: PIECE.crunchy, studentmix: PIECE.raisin, sukkari: PIECE.date, ajwa: PIECE.date, sayer: PIECE.date, halawi: PIECE.date,
  khadrawi: PIECE.date, deglet: PIECE.date, cranberries: PIECE.raisin, goji: PIECE.raisin, driedcherries: PIECE.raisin, driedstrawberries: PIECE.raisin,
  driedmango: PIECE.slice, driedpineapple: PIECE.slice, driedkiwi: PIECE.slice, applechips: PIECE.slice, driedpeach: PIECE.apricot, cashewhoney: PIECE.cashew,
  almondhoney: PIECE.almond, peanuthoney: PIECE.peanut, pecancandied: PIECE.pecan, trailmix: PIECE.choc, kerzatsweet: PIECE.sugared, halawa: PIECE.bar,
  mann: PIECE.sugarball, baklawa: PIECE.baklava, kleicha: PIECE.cookie, halqoum: PIECE.cube, peanutbrittle: PIECE.nutbar, datescoconut: PIECE.sugarball,
  datenutballs: PIECE.sugarball, chocdates: PIECE.choc,
})
Object.assign(PIECE, { kerzat: PIECE.peanut, pistachiolemon: PIECE.pistachio, zahdi: PIECE.date, khastawi: PIECE.date, barhi: PIECE.date, medjool: PIECE.date,
  raisins: PIECE.raisin, kishmish: PIECE.raisin, figs: PIECE.fig, apricots: PIECE.apricot, qamaraldin: PIECE.sheet, mulberries: PIECE.mulberry, prunes: PIECE.prune,
  bananachips: PIECE.chip, mlabbas: PIECE.sugared, chickpeacandy: PIECE.sugarball, chocnuts: PIECE.choc, simsimiya: PIECE.bar, jowziya: PIECE.nutbar, datestuffed: PIECE.stuffed })
// the mixes: [piece, x, y, rotation, scale, in the shell] — in the bowl and on their own
const MIX = {
  kerzat: { pile: [['peanut', -14, 2, -18, 1.02, true], ['pistachio', 14, 3, 14, 1.02, true], ['cashew', -1, -9, 8, 1.08, false], ['sunflower', 3, 10, 70, 0.84, true]],
    one: [['peanut', -8, 4, -18, 1, true], ['cashew', 9, -5, 12, 1, false], ['pistachio', 3, 12, 4, 0.82, true]] },
  kerzatroyal: { pile: [['cashew', -13, 3, -14, 1.04, false], ['pistachio', 13, 4, 16, 1, true], ['almond', 0, -9, 6, 1.02, false], ['hazelnut', 2, 10, 0, 0.8, false]],
    one: [['cashew', -8, 3, -16, 1, false], ['almond', 9, -5, 14, 0.92, false], ['hazelnut', 4, 11, 0, 0.72, false]] },
  kerzatseeds: { pile: [['sunflower', -13, 3, -30, 0.95, true], ['melon', 12, 4, 25, 0.95, true], ['pumpkin', 0, -8, 5, 0.95, true], ['watermelon', 3, 10, 70, 0.8, true]],
    one: [['sunflower', -8, 3, -25, 0.9, true], ['melon', 8, -4, 20, 0.9, true], ['pumpkin', 2, 10, 80, 0.75, true]] },
  // 12.0
  mixednuts: { pile: [['cashew', -13, 3, -14, 1.04, false], ['almond', 13, 4, 16, 1.04, false], ['walnut', 0, -8, 4, 1, false], ['hazelnut', 3, 10, 0, 0.9, false]],
    one: [['almond', -8, 3, -16, 1, false], ['cashew', 8, -4, 12, 1, false], ['hazelnut', 2, 11, 0, 0.8, false]] },
  trailmix: { pile: [['peanut', -13, 3, -14, 1, false], ['raisin', 13, 4, 16, 1, false], ['choc', 0, -8, 4, 0.95, false], ['almond', 3, 10, 20, 0.9, false]],
    one: [['peanut', -8, 3, -16, 1, false], ['choc', 8, -4, 12, 0.9, false], ['raisin', 2, 11, 0, 0.85, false]] },
  studentmix: { pile: [['raisin', -13, 3, -14, 1, false], ['almond', 13, 4, 16, 1, false], ['cashew', 0, -8, 4, 1, false], ['walnut', 3, 10, 0, 0.85, false]],
    one: [['raisin', -8, 3, -16, 1, false], ['almond', 8, -4, 12, 1, false], ['walnut', 2, 11, 0, 0.8, false]] },
  kerzatsweet: { pile: [['sugared', -13, 3, -14, 1, false], ['raisin', 13, 4, 16, 1, false], ['pistachio', 0, -8, 4, 1, true], ['sugarball', 3, 10, 0, 0.85, false]],
    one: [['sugared', -8, 3, -16, 1, false], ['pistachio', 8, -4, 12, 1, true], ['raisin', 2, 11, 0, 0.85, false]] },
  kerzatspicy: { pile: [['peanut', -13, 3, -14, 1, false], ['corn', 13, 4, 16, 1, false], ['cashew', 0, -8, 4, 1, false], ['chickpea', 3, 10, 0, 0.85, false]],
    one: [['peanut', -8, 3, -16, 1, false], ['corn', 8, -4, 12, 1, false], ['cashew', 2, 11, 0, 0.8, false]] },
}

function NutDrawn({ nut, size = 48, live = false, shell = false, form = null, pile = false, className = '', label }) {
  const raw = useId()
  const id = 'na' + raw.replace(/[^a-zA-Z0-9]/g, '')
  const n = nut || {}
  const fm = form || n.def || 'raw'
  // roasted pieces a shade darker; raw, boiled, dried and sweet ones keep their colour
  const k = fm === 'roasted' || fm === 'salted' ? 0.14 : 0
  const c = hex => (k ? mix(hex, 'black', k) : hex)
  const sh = shell && n.shell
  const salted = fm === 'salted' || fm === 'boiled'
  const draw = (kind, hasShell) => (PIECE[kind] || PIECE.almond)(c, hasShell, kind === n.id ? n.col : undefined)
  const m = MIX[n.id]
  const flat = ['bar', 'nutbar', 'sheet'].includes(n.id) || ['simsimiya', 'jowziya', 'qamaraldin', 'halawa', 'seedbar', 'peanutbrittle'].includes(n.id)
  const pieces = pile
    ? (m ? m.pile : flat ? [[n.id, -6, 5, -8, 0.95, sh], [n.id, 6, -6, 10, 0.95, sh]] : [[n.id, -13, 4, -16, 1.04, sh], [n.id, 13, 5, 18, 1.04, sh], [n.id, 0, -8, 4, 1.16, sh]])
    : m ? m.one : [[n.id, 0, 0, flat ? -8 : -12, flat ? 1.5 : 1.7, sh]]
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

/**
 * 14.0 — the real photo of the nut, seed or dried fruit (lib/photos) when it has one; the drawing otherwise, or with
 * `drawn` (the pack, form and mix pickers, where the drawing's shape is the point).
 */
export default function NutArt(props) {
  const ph = usePhotos()
  const k = !props.drawn && ph && props.nut ? ph.photoKey('N', props.nut.id) : null
  const art = <NutDrawn {...props} />
  if (!k) return art
  const size = props.size || 48
  return <span className={'art-ph' + (props.className ? ' ' + props.className : '')} style={{ width: size, height: size }} role={props.label ? 'img' : undefined} aria-label={props.label || undefined}>
    <Photo k={k} size="t" alt="" fallback={art} />
  </span>
}
