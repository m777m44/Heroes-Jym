// 10.0 — a soft drink, drawn: a can (slim for energy drinks), a plastic bottle, a glass bottle with
// a crown cap, a glass with ice, lemon and mint, or a restaurant cup with a lid and a straw — in the
// drink's own colours, generic (no logos). The shape follows the size: a 150 ml can is short, a
// 2.25 L bottle tall and wide, so switching sizes shows the difference.
// `live` animates rising bubbles, the fizz, condensation running down and a passing shine (the
// detail screen; lists stay still, which is kinder to the battery). Reduce motion and the battery
// saver stop it (index.css).
import { useId } from 'react'
import { packDims } from '../lib/sodas.js'

function mix(hex, to, k) {
  const h = String(hex || '#888888').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const t = to === 'white' ? 255 : 0
  return '#' + c.map(v => Math.round(v + (t - v) * k).toString(16).padStart(2, '0')).join('')
}
const hash = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h }
const f1 = v => Math.round(v * 10) / 10
const G = 116          // ground line

// ---- emblems: a simple mark per kind of drink, in the second brand colour ------------------------------
function Emblem({ s, cx, cy, r, col }) {
  if (s.energy) return <path className="sa-mark" d={`M${f1(cx + r * 0.2)} ${f1(cy - r)}L${f1(cx - r * 0.55)} ${f1(cy + r * 0.12)}H${f1(cx - r * 0.02)}L${f1(cx - r * 0.25)} ${f1(cy + r)}L${f1(cx + r * 0.6)} ${f1(cy - r * 0.2)}H${f1(cx + r * 0.06)}Z`} fill={col} />
  if (s.cat === 'malt') return <g className="sa-mark" fill={col}>{[-0.62, -0.2, 0.22].map((k, i) => <g key={i}><ellipse cx={f1(cx - r * 0.24)} cy={f1(cy + k * r)} rx={f1(r * 0.2)} ry={f1(r * 0.34)} transform={`rotate(-30 ${f1(cx - r * 0.24)} ${f1(cy + k * r)})`} /><ellipse cx={f1(cx + r * 0.24)} cy={f1(cy + k * r)} rx={f1(r * 0.2)} ry={f1(r * 0.34)} transform={`rotate(30 ${f1(cx + r * 0.24)} ${f1(cy + k * r)})`} /></g>)}<rect x={f1(cx - r * 0.05)} y={f1(cy - r * 0.6)} width={f1(r * 0.1)} height={f1(r * 1.6)} /></g>
  if (s.cat === 'mixer') return <g className="sa-mark" fill="none" stroke={col} strokeWidth={f1(Math.max(0.8, r * 0.16))}><circle cx={f1(cx - r * 0.3)} cy={f1(cy + r * 0.3)} r={f1(r * 0.42)} /><circle cx={f1(cx + r * 0.42)} cy={f1(cy - r * 0.18)} r={f1(r * 0.3)} /><circle cx={f1(cx - r * 0.1)} cy={f1(cy - r * 0.62)} r={f1(r * 0.18)} /></g>
  if (s.cat === 'fruit' || s.cat === 'home') return <g className="sa-mark"><circle cx={cx} cy={f1(cy + r * 0.1)} r={f1(r * 0.78)} fill={col} /><path d={`M${cx} ${f1(cy - r * 0.62)}c${f1(r * 0.3)} ${f1(-r * 0.5)} ${f1(r * 0.8)} ${f1(-r * 0.5)} ${f1(r * 0.9)} ${f1(-r * 0.36)}c${f1(-r * 0.2)} ${f1(r * 0.4)} ${f1(-r * 0.6)} ${f1(r * 0.5)} ${f1(-r * 0.9)} ${f1(r * 0.36)}Z`} fill={mix(col, 'black', 0.25)} /></g>
  if (s.cat === 'clear') return <g className="sa-mark"><circle cx={cx} cy={cy} r={f1(r * 0.8)} fill={col} /><circle cx={cx} cy={cy} r={f1(r * 0.56)} fill="#ffffff" opacity=".55" /><path d={`M${f1(cx - r * 0.56)} ${cy}H${f1(cx + r * 0.56)}M${cx} ${f1(cy - r * 0.56)}V${f1(cy + r * 0.56)}`} stroke={col} strokeWidth={f1(r * 0.12)} /></g>
  return null
}

// a swoosh band across a label, from the left edge to the right
const swoosh = (x0, x1, y, h, k = 1) => `M${f1(x0 - 2)} ${f1(y + h * 0.5 * k)}C${f1(x0 + (x1 - x0) * 0.3)} ${f1(y - h * 0.9 * k)} ${f1(x0 + (x1 - x0) * 0.62)} ${f1(y + h * 1.1 * k)} ${f1(x1 + 2)} ${f1(y - h * 0.4 * k)}V${f1(y + h * 0.5)}C${f1(x0 + (x1 - x0) * 0.62)} ${f1(y + h * 1.9 * k)} ${f1(x0 + (x1 - x0) * 0.3)} ${f1(y + h * 0.1)} ${f1(x0 - 2)} ${f1(y + h * 1.4 * k)}Z`

function Bubbles({ x0, x1, y0, y1, seed, n = 6 }) {
  const h = hash(seed)
  return <g className="sa-bub">
    {Array.from({ length: n }, (_, i) => {
      const k = ((h >> (i * 3)) & 15) / 15
      const x = f1(x0 + (x1 - x0) * (0.12 + 0.76 * ((i * 0.37 + k * 0.5) % 1)))
      return <circle key={i} cx={x} cy={f1(y1 - 3)} r={f1(0.9 + k * 1.3)} style={{ animationDelay: f1(i * 0.42 + k) + 's', '--rise': f1(-(y1 - y0) + 4) + 'px' }} />
    })}
  </g>
}

function Drops({ x0, x1, y0, y1, seed, n = 6 }) {
  const h = hash(seed + 'd')
  return <g className="sa-drops">
    {Array.from({ length: n }, (_, i) => {
      const a = ((h >> (i * 4)) & 15) / 15, b = ((h >> (i * 4 + 2)) & 15) / 15
      const x = f1(x0 + 3 + (x1 - x0 - 6) * ((i / n + a * 0.3) % 1)), y = f1(y0 + (y1 - y0) * (0.15 + 0.7 * b))
      return <ellipse key={i} cx={x} cy={y} rx={f1(0.9 + a * 0.6)} ry={f1(1.3 + a * 0.8)} style={{ animationDelay: f1(i * 0.8 + b * 2) + 's' }} />
    })}
  </g>
}

// ---- the packs -------------------------------------------------------------------------------------------
function Can({ s, w, h, id, live }) {
  const x0 = 50 - w / 2, x1 = 50 + w / 2, top = G - h
  const body = `M${f1(x0)} ${f1(top + 7)}C${f1(x0)} ${f1(top + 4)} ${f1(x0 + 3)} ${f1(top + 2.4)} ${f1(x0 + 4)} ${f1(top + 1.6)}H${f1(x1 - 4)}C${f1(x1 - 3)} ${f1(top + 2.4)} ${f1(x1)} ${f1(top + 4)} ${f1(x1)} ${f1(top + 7)}V${G - 4}Q${f1(x1)} ${G} ${f1(x1 - 4)} ${G}H${f1(x0 + 4)}Q${f1(x0)} ${G} ${f1(x0)} ${G - 4}Z`
  const ly = top + h * 0.5, lh = Math.max(5, h * 0.12)
  return <>
    <ellipse className="sa-shadow" cx="50" cy={G + 1.6} rx={f1(w * 0.62)} ry="2.6" />
    <clipPath id={id + 'b'}><path d={body} /></clipPath>
    <path d={body} fill={s.br} />
    <g clipPath={`url(#${id}b)`}>
      {s.zero && <rect x={f1(x0)} y={f1(top + 5)} width={w} height={f1(Math.max(3, h * 0.07))} fill={s.br2} />}
      <path d={swoosh(x0, x1, ly, lh)} fill={s.br2} opacity=".92" />
      <Emblem s={s} cx={50} cy={f1(top + h * 0.3)} r={f1(Math.min(w, h) * 0.17)} col={s.zero ? '#ffffff' : s.br2} />
      <rect x={f1(x0)} y={f1(top)} width={w} height="5.6" fill={`url(#${id}m)`} />
      <rect x={f1(x0)} y={G - 3.6} width={w} height="3.6" fill={`url(#${id}m)`} />
      <rect x={f1(x0)} y={f1(top)} width={w} height={h} fill={`url(#${id}c)`} />
      {live && <Drops x0={x0} x1={x1} y0={top + 8} y1={G - 8} seed={s.id} />}
      <rect className="sa-shine" x={f1(x0 - 14)} y={f1(top)} width="10" height={h} fill="#ffffff" opacity=".0" transform={`skewX(-14)`} />
    </g>
    <ellipse cx="50" cy={f1(top + 1.9)} rx={f1(w / 2 - 3.6)} ry="1.9" fill="#d5d9df" stroke="#9aa1aa" strokeWidth=".6" />
    <path d={`M${f1(47)} ${f1(top + 1)}h6a1.1 1.1 0 0 1 0 2.2h-6a1.1 1.1 0 0 1 0-2.2Z`} fill="#b9bfc7" stroke="#8d949d" strokeWidth=".4" />
    <path className="sa-rim" d={body} />
    {live && <Bubbles x0={44} x1={56} y0={top - 22} y1={top + 2} seed={s.id + 'f'} n={5} />}
  </>
}

function Bottle({ s, w, h, id, live }) {
  const x0 = 50 - w / 2, x1 = 50 + w / 2, top = G - h
  const capW = Math.max(8.5, w * 0.34), nk = capW * 0.88
  const capB = top + 6, neckB = capB + h * 0.1, shB = neckB + h * 0.17
  const big = h >= 94
  const wy0 = shB + (G - shB) * 0.48, wy1 = shB + (G - shB) * 0.7
  const pinch = big ? 2.2 : 1.2
  const d = `M${f1(50 - nk / 2)} ${f1(capB)}V${f1(neckB)}C${f1(50 - nk / 2)} ${f1(neckB + h * 0.07)} ${f1(x0)} ${f1(shB - h * 0.09)} ${f1(x0)} ${f1(shB)}V${f1(wy0)}Q${f1(x0 + pinch)} ${f1((wy0 + wy1) / 2)} ${f1(x0)} ${f1(wy1)}V${G - 6}Q${f1(x0)} ${G} ${f1(x0 + 5)} ${G}H${f1(x1 - 5)}Q${f1(x1)} ${G} ${f1(x1)} ${G - 6}V${f1(wy1)}Q${f1(x1 - pinch)} ${f1((wy0 + wy1) / 2)} ${f1(x1)} ${f1(wy0)}V${f1(shB)}C${f1(x1)} ${f1(shB - h * 0.09)} ${f1(50 + nk / 2)} ${f1(neckB + h * 0.07)} ${f1(50 + nk / 2)} ${f1(neckB)}V${f1(capB)}Z`
  const lvl = neckB + 2
  const clear = s.cat === 'clear' || s.cat === 'mixer'
  const ly = shB + (G - shB) * 0.14, lh = (G - shB) * 0.3
  return <>
    <ellipse className="sa-shadow" cx="50" cy={G + 1.6} rx={f1(w * 0.62)} ry="2.6" />
    <clipPath id={id + 'b'}><path d={d} /></clipPath>
    <path className="sa-glass" d={d} />
    <g clipPath={`url(#${id}b)`}>
      <rect x={f1(x0)} y={f1(lvl)} width={w} height={f1(G - lvl)} fill={`url(#${id}l)`} opacity={clear ? 0.55 : 0.96} />
      <path className="sa-wave" style={{ '--wl': '20px' }} d={`M${f1(x0 - 20)} ${f1(lvl)}q5 -1.4 10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0t10 0V${f1(lvl + 2)}H${f1(x0 - 20)}Z`} fill={mix(s.col, 'white', 0.4)} opacity=".7" />
      {live && <Bubbles x0={x0} x1={x1} y0={lvl} y1={G} seed={s.id} n={big ? 8 : 6} />}
      <rect x={f1(x0)} y={f1(ly)} width={w} height={f1(lh)} fill={s.br} />
      <path d={swoosh(x0, x1, ly + lh * 0.38, lh * 0.22, 0.7)} fill={s.br2} opacity=".95" />
      <Emblem s={s} cx={50} cy={f1(ly + lh * 0.5)} r={f1(Math.min(w, lh) * 0.26)} col={s.zero ? '#ffffff' : s.br2} />
      <rect x={f1(x0)} y={f1(top)} width={w} height={h} fill={`url(#${id}c)`} opacity=".6" />
      <rect className="sa-shine" x={f1(x0 - 14)} y={f1(top)} width="9" height={h} fill="#ffffff" opacity="0" transform="skewX(-14)" />
    </g>
    <path className="sa-rim thin" d={d} />
    <rect x={f1(50 - capW / 2)} y={f1(top)} width={f1(capW)} height="6.4" rx="1.4" fill={s.zero ? s.br2 : s.br} />
    <path d={`M${f1(50 - capW / 2 + 1.6)} ${f1(top + 1.4)}v3.6M${f1(50 - capW / 6)} ${f1(top + 1.4)}v3.6M${f1(50 + capW / 6)} ${f1(top + 1.4)}v3.6M${f1(50 + capW / 2 - 1.6)} ${f1(top + 1.4)}v3.6`} stroke="#000" strokeOpacity=".22" strokeWidth=".7" />
    <rect x={f1(50 - nk / 2 - 1)} y={f1(capB + 0.6)} width={f1(nk + 2)} height="1.6" rx=".8" fill={s.zero ? s.br2 : s.br} opacity=".85" />
  </>
}

function GlassBottle({ s, w, h, id, live }) {
  const x0 = 50 - w / 2, x1 = 50 + w / 2, top = G - h
  const nk = Math.max(7.5, w * 0.36), capB = top + 5, neckB = capB + h * 0.3, shB = neckB + h * 0.14
  const d = `M${f1(50 - nk / 2)} ${f1(capB)}V${f1(neckB)}C${f1(50 - nk / 2)} ${f1(neckB + h * 0.06)} ${f1(x0)} ${f1(shB - h * 0.07)} ${f1(x0)} ${f1(shB)}V${G - 5}Q${f1(x0)} ${G} ${f1(x0 + 4)} ${G}H${f1(x1 - 4)}Q${f1(x1)} ${G} ${f1(x1)} ${G - 5}V${f1(shB)}C${f1(x1)} ${f1(shB - h * 0.07)} ${f1(50 + nk / 2)} ${f1(neckB + h * 0.06)} ${f1(50 + nk / 2)} ${f1(neckB)}V${f1(capB)}Z`
  const lvl = capB + (neckB - capB) * 0.42
  const clear = s.cat === 'clear' || s.cat === 'mixer'
  const ly = shB + (G - shB) * 0.2, lh = (G - shB) * 0.46
  return <>
    <ellipse className="sa-shadow" cx="50" cy={G + 1.6} rx={f1(w * 0.66)} ry="2.4" />
    <clipPath id={id + 'b'}><path d={d} /></clipPath>
    <path className="sa-glass tint" d={d} />
    <g clipPath={`url(#${id}b)`}>
      <rect x={f1(x0)} y={f1(lvl)} width={w} height={f1(G - lvl)} fill={`url(#${id}l)`} opacity={clear ? 0.5 : 0.95} />
      {live && <Bubbles x0={x0} x1={x1} y0={lvl} y1={G} seed={s.id} n={6} />}
      <rect x={f1(x0)} y={f1(ly)} width={w} height={f1(lh)} rx="3" fill={s.br} />
      <path d={swoosh(x0, x1, ly + lh * 0.55, lh * 0.16, 0.8)} fill={s.br2} />
      <Emblem s={s} cx={50} cy={f1(ly + lh * 0.3)} r={f1(Math.min(w, lh) * 0.2)} col={s.zero ? '#ffffff' : s.br2} />
      <rect x={f1(50 - nk / 2)} y={f1(capB + (neckB - capB) * 0.55)} width={f1(nk)} height={f1((neckB - capB) * 0.22)} fill={s.br} />
      <rect x={f1(x0)} y={f1(top)} width={w} height={h} fill={`url(#${id}c)`} opacity=".55" />
      <rect className="sa-shine" x={f1(x0 - 14)} y={f1(top)} width="8" height={h} fill="#ffffff" opacity="0" transform="skewX(-14)" />
    </g>
    <path className="sa-rim thin" d={d} />
    <path d={`M${f1(50 - nk / 2 - 1.4)} ${f1(top + 4.2)}l1 -3.4l1.2 1.4l1.2 -1.4l1.2 1.4l1.2 -1.4l1.2 1.4l1.2 -1.4l1.2 1.4l1.2 -1.4l1 3.4Z`} fill={s.br2 === '#ffffff' ? s.br : s.br2} stroke="#000" strokeOpacity=".25" strokeWidth=".5" />
    <rect x={f1(50 - nk / 2 - 1.4)} y={f1(top + 3.2)} width={f1(nk + 2.8)} height="2.2" rx=".8" fill={s.br2 === '#ffffff' ? s.br : s.br2} />
  </>
}

function Glass({ s, w, h, id, live }) {
  const x0 = 50 - w / 2, x1 = 50 + w / 2, top = G - h, b0 = 50 - w * 0.4, b1 = 50 + w * 0.4
  const d = `M${f1(x0)} ${f1(top)}H${f1(x1)}L${f1(b1 + 0.6)} ${G - 3}Q${f1(b1)} ${G} ${f1(b1 - 3)} ${G}H${f1(b0 + 3)}Q${f1(b0)} ${G} ${f1(b0 - 0.6)} ${G - 3}Z`
  const lvl = top + h * 0.2
  const clear = s.cat === 'mixer' || s.id === 'soda'
  return <>
    <ellipse className="sa-shadow" cx="50" cy={G + 1.6} rx={f1(w * 0.5)} ry="2.4" />
    {(s.cat === 'home' || s.mint || s.ice) && <path className="sa-straw" d={`M${f1(x1 - w * 0.22)} ${f1(top - 16)}L${f1(50 + w * 0.06)} ${f1(G - h * 0.35)}`} stroke={s.br} />}
    <clipPath id={id + 'b'}><path d={d} /></clipPath>
    <path className="sa-glass" d={d} />
    <g clipPath={`url(#${id}b)`}>
      <rect x={f1(x0)} y={f1(lvl)} width={w} height={f1(G - lvl)} fill={`url(#${id}l)`} opacity={clear ? 0.45 : 0.95} />
      <path className="sa-wave" style={{ '--wl': '25px' }} d={`M${f1(x0 - 25)} ${f1(lvl)}q6.25 -1.8 12.5 0t12.5 0t12.5 0t12.5 0t12.5 0t12.5 0t12.5 0V${f1(lvl + 2.4)}H${f1(x0 - 25)}Z`} fill={mix(s.col, 'white', 0.45)} opacity=".8" />
      {(s.ice || s.cat !== 'home') && !s.dairy && <g className="sa-ice">
        <rect x={f1(50 - w * 0.26)} y={f1(lvl + 1.5)} width={f1(w * 0.22)} height={f1(w * 0.22)} rx="2.6" transform={`rotate(-12 ${f1(50 - w * 0.15)} ${f1(lvl + 1.5 + w * 0.11)})`} />
        <rect x={f1(50 + w * 0.02)} y={f1(lvl + 3)} width={f1(w * 0.2)} height={f1(w * 0.2)} rx="2.4" transform={`rotate(14 ${f1(50 + w * 0.12)} ${f1(lvl + 3 + w * 0.1)})`} />
      </g>}
      {s.mint && <g className="sa-leaf"><path d={`M${f1(50 - w * 0.1)} ${f1(lvl + h * 0.36)}c-6 -4 -4 -10 2 -11c2 5 1 9 -2 11Z`} /><path d={`M${f1(50 + w * 0.14)} ${f1(lvl + h * 0.5)}c5 -5 11 -3 11 2c-5 2 -9 1 -11 -2Z`} /></g>}
      {live && <Bubbles x0={b0} x1={b1} y0={lvl} y1={G} seed={s.id} n={7} />}
      <rect className="sa-shine" x={f1(x0 - 14)} y={f1(top)} width="9" height={h} fill="#ffffff" opacity="0" transform="skewX(-14)" />
    </g>
    <path className="sa-hi" d={`M${f1(x0 + 3.4)} ${f1(top + 4)}L${f1(b0 + 2.6)} ${G - 6}`} />
    <path className="sa-rim thin" d={d} />
    {s.lemon && <g className="sa-lemon" transform={`translate(${f1(x0 + 3)} ${f1(top + 1)})`}><circle r={f1(Math.max(5.5, w * 0.16))} /><circle r={f1(Math.max(3.8, w * 0.11))} className="in" /></g>}
    {live && !s.dairy && <g className="sa-fizz">{[0, 1, 2, 3].map(i => <circle key={i} cx={f1(50 - w * 0.25 + i * w * 0.17)} cy={f1(lvl - 1)} r={f1(0.7 + (i % 2) * 0.4)} style={{ animationDelay: f1(i * 0.35) + 's' }} />)}</g>}
  </>
}

function Cup({ s, w, h, id, live }) {
  const x0 = 50 - w / 2, x1 = 50 + w / 2, top = G - h + 6, b0 = 50 - w * 0.36, b1 = 50 + w * 0.36
  const d = `M${f1(x0 + 1)} ${f1(top)}H${f1(x1 - 1)}L${f1(b1)} ${G - 2}Q${f1(b1 - 0.4)} ${G} ${f1(b1 - 2.4)} ${G}H${f1(b0 + 2.4)}Q${f1(b0 + 0.4)} ${G} ${f1(b0)} ${G - 2}Z`
  const by = top + h * 0.3, bh = h * 0.26
  return <>
    <ellipse className="sa-shadow" cx="50" cy={G + 1.6} rx={f1(w * 0.46)} ry="2.4" />
    <path className="sa-straw" d={`M${f1(50 + w * 0.12)} ${f1(top - 3)}L${f1(50 + w * 0.26)} ${f1(top - 20)}`} stroke={s.br} />
    <clipPath id={id + 'b'}><path d={d} /></clipPath>
    <path d={d} fill="#fbfbfd" />
    <g clipPath={`url(#${id}b)`}>
      <rect x={f1(x0)} y={f1(by)} width={w} height={f1(bh)} fill={s.br} />
      <path d={swoosh(x0, x1, by + bh * 0.42, bh * 0.2, 0.8)} fill={s.br2 === '#ffffff' ? '#ffffff' : s.br2} />
      <Emblem s={s} cx={50} cy={f1(by - h * 0.12)} r={f1(w * 0.1)} col={s.br} />
      <rect x={f1(x0)} y={f1(top)} width={w} height={h} fill={`url(#${id}c)`} opacity=".45" />
      <rect className="sa-shine" x={f1(x0 - 14)} y={f1(top)} width="9" height={h} fill="#ffffff" opacity="0" transform="skewX(-14)" />
    </g>
    <path className="sa-rim thin" d={d} />
    <path d={`M${f1(x0 - 1.2)} ${f1(top)}h${f1(w + 2.4)}v-2.2q0 -1.6 -1.6 -1.6h${f1(-(w - 0.8))}q-1.6 0 -1.6 1.6Z`} fill="#eef0f3" stroke="#a6adb6" strokeWidth=".6" />
    <path d={`M${f1(x0 + 4)} ${f1(top - 3.8)}q${f1(w / 2 - 4)} -5 ${f1(w - 8)} 0Z`} fill="#f6f7f9" stroke="#a6adb6" strokeWidth=".6" />
    {live && <Bubbles x0={x0 + 4} x1={x1 - 4} y0={top - 18} y1={top - 4} seed={s.id + 'c'} n={3} />}
  </>
}

const DRAW = { can: Can, bottle: Bottle, glassb: GlassBottle, glass: Glass, cup: Cup }

/** <SodaArt soda={s} pk="can" ml={330} size={56} live />  — the pack drawn at its size. */
export default function SodaArt({ soda, pk, ml, size = 56, live = false, className = '', label }) {
  const raw = useId()
  const id = 'sa' + raw.replace(/[^a-zA-Z0-9]/g, '')
  const s = soda || {}
  const P = DRAW[pk] ? pk : (s.def && s.def.pk) || 'can'
  const v = ml || (s.def && s.def.ml) || 330
  const [w, h] = packDims(P, v, !!s.energy)
  const Draw = DRAW[P]
  return <svg className={'sa sa-' + P + (live ? ' live' : '') + (className ? ' ' + className : '')} viewBox="0 0 100 120" width={size} height={size * 1.2}
    role="img" aria-label={label || undefined} aria-hidden={label ? undefined : true}>
    <defs>
      <linearGradient id={id + 'c'} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity=".38" />
        <stop offset=".16" stopColor="#fff" stopOpacity=".32" />
        <stop offset=".34" stopColor="#fff" stopOpacity="0" />
        <stop offset=".72" stopColor="#000" stopOpacity=".06" />
        <stop offset="1" stopColor="#000" stopOpacity=".42" />
      </linearGradient>
      <linearGradient id={id + 'm'} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8f969f" /><stop offset=".25" stopColor="#f2f4f6" /><stop offset=".6" stopColor="#c4c9d0" /><stop offset="1" stopColor="#7d848d" />
      </linearGradient>
      <linearGradient id={id + 'l'} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={mix(s.col || '#888', 'white', 0.25)} />
        <stop offset="1" stopColor={mix(s.col || '#888', 'black', 0.2)} />
      </linearGradient>
    </defs>
    <g className="sa-in" key={P + v}><Draw s={s} w={w} h={h} id={id} live={live} /></g>
  </svg>
}
