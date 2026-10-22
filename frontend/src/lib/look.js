// 6.0 — the shape of things and the style of cards, on top of any theme.
//   S.shape      round (default) · soft · sharp · pill · leaf
//   S.cardStyle  solid (default) · glass · outline · shadow · gradient · neon
// Painted as <html data-shape data-card>; the rules live at the end of index.css.
export const SHAPES = [
  { key: 'round', name: 'Round' },
  { key: 'soft', name: 'Soft' },
  { key: 'sharp', name: 'Sharp' },
  { key: 'pill', name: 'Pill' },
  { key: 'leaf', name: 'Leaf' },
]
export const CARD_STYLES = [
  { key: 'solid', name: 'Solid' },
  { key: 'glass', name: 'Frosted glass' },
  { key: 'outline', name: 'Outline' },
  { key: 'shadow', name: 'Floating' },
  { key: 'gradient', name: 'Gradient' },
  { key: 'neon', name: 'Neon' },
]
const has = (list, k) => list.some(x => x.key === k)
export const shapeOf = S => (S && has(SHAPES, S.shape) ? S.shape : 'round')
export const cardStyleOf = S => (S && has(CARD_STYLES, S.cardStyle) ? S.cardStyle : 'solid')

export function applyLook(S, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return
  const de = doc.documentElement
  const sh = shapeOf(S), cs = cardStyleOf(S)
  if (sh === 'round') delete de.dataset.shape; else de.dataset.shape = sh
  if (cs === 'solid') delete de.dataset.card; else de.dataset.card = cs
}
