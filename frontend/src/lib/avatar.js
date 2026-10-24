// 11.0 — the profile picture: hundreds of symbols in groups (faces, sport, animals, nature, food,
// Iraq, things, hearts), more colours, and a photo from the phone — cropped to a square and made
// small (a 192 px JPEG, about 20 KB) so it lives in S.profile and comes back with a backup.
// Pure helpers + one DOM helper (avatarFromFile). Screen: components/ProfileSheet.jsx.
// 12.0 — any emoji or symbol typed on the keyboard (keyboardAvatar), and ready-made pictures from
// the repository (AVATAR_PICS) next to your own photos.
import { assetUrl } from './assets.js'

export const AVATAR_EMOJI = [
  { key: 'faces', name: 'Faces', icon: 'smile', list: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😛', '😜', '🤪', '😎', '🤓', '🧐', '🤠', '🥳', '😏', '😌', '😴', '🤗', '🤔', '🫡', '🤫', '😤', '😡', '🥶', '🥵', '🤯', '😱', '🤖', '👽', '👻', '💀', '🤡', '😺', '😸', '😻', '🙈', '🙉', '🙊'] },
  { key: 'sport', name: 'Sports', icon: 'trophy', list: ['💪', '🏋️', '🤸', '🏃', '🚴', '🏊', '🤾', '⛹️', '🧗', '🤺', '🏇', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🥊', '🥋', '🏓', '🏸', '🏒', '⛳', '🏹', '🎳', '🛹', '⛸️', '🎿', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎯', '🏁', '⏱️'] },
  { key: 'animals', name: 'Animals', icon: 'heart', list: ['🦁', '🐯', '🐆', '🐺', '🦊', '🐻', '🐼', '🐨', '🐸', '🐵', '🦍', '🐴', '🦄', '🐎', '🐪', '🐫', '🦅', '🦉', '🐦', '🐧', '🦜', '🕊️', '🐬', '🐳', '🦈', '🐟', '🐢', '🐍', '🦖', '🐉', '🦂', '🐝', '🦋', '🐞', '🐙', '🐱', '🐶', '🐰', '🦌', '🐐', '🐑', '🦓', '🦒', '🐘'] },
  { key: 'nature', name: 'Nature', icon: 'leafy', list: ['🌴', '🌵', '🌳', '🌲', '🌾', '🌻', '🌹', '🌷', '🌸', '🌺', '🍀', '🍁', '🌙', '⭐', '🌟', '✨', '☀️', '🌤️', '🌈', '⚡', '🔥', '💧', '🌊', '❄️', '🌋', '🏔️', '🏜️', '🌍', '🪐', '☄️', '🌕'] },
  { key: 'food', name: 'Food', icon: 'apple', list: ['🍎', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🥕', '🌽', '🍋', '🍊', '🫐', '🥚', '🍳', '🫓', '🥙', '🧆', '🍢', '🍗', '🍖', '🍕', '🍔', '🍟', '🍩', '🍪', '🍫', '🍯', '🥛', '☕', '🍵', '🫖', '🧃', '🥤', '🍰', '🧁', '🍦'] },
  { key: 'iraq', name: 'Iraq', icon: 'palm', list: ['🇮🇶', '🕌', '📿', '🏺', '🏛️', '🛶', '🐃', '🌴', '🐪', '🫖', '☕', '🍯', '🫓', '🍢', '🧆', '🌙', '🦅', '🏜️', '🌾', '🐟'] },
  { key: 'things', name: 'Things', icon: 'star', list: ['🎮', '🕹️', '🎧', '🎸', '🎹', '🥁', '🎤', '📚', '📖', '✏️', '🎒', '💻', '📱', '⌚', '📷', '🎨', '🎬', '🚀', '✈️', '🚗', '🏎️', '🏍️', '🚲', '⚓', '🔑', '💎', '🧩', '🎲', '♟️', '🧭', '🔭', '🔬', '💡', '🛡️', '⚔️', '👑', '🎩', '🕶️'] },
  { key: 'hearts', name: 'Hearts', icon: 'heart', list: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖', '💗', '💝', '💯', '✅', '☮️', '♾️', '🔆', '💫', '🌀', '🎉', '🎊', '🎁', '🔱', '⚜️'] },
]
export const EMOJI_SET = new Set(AVATAR_EMOJI.flatMap(g => g.list))

// ---- 12.0: anything from the keyboard ----------------------------------------------------------------
// The emoji keyboard has thousands more than the groups above (flags, skin tones, families…), and
// some people want their initials. One "character" is a grapheme: 👍🏽, 🇮🇶 and 👨‍👩‍👦 are one each.
let seg = null
/** Split into user-perceived characters (grapheme clusters). */
export function graphemes(s) {
  const str = String(s || '')
  try {
    if (!seg) seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return [...seg.segment(str)].map(x => x.segment)
  } catch {
    // no Intl.Segmenter: keep an emoji sequence (joiners, skin tones, flags) together
    const out = []
    for (const ch of str) {
      const prev = out[out.length - 1]
      if (prev && (/[\u200d\ufe0f\u{1f3fb}-\u{1f3ff}\u{e0020}-\u{e007f}]/u.test(ch) || prev.endsWith('\u200d') || (/\p{Regional_Indicator}/u.test(ch) && /^\p{Regional_Indicator}$/u.test(prev)))) out[out.length - 1] = prev + ch
      else out.push(ch)
    }
    return out
  }
}
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u
/** Is this grapheme an emoji (pictograph or flag)? */
export const isEmojiG = g => EMOJI_RE.test(g || '')
/**
 * What the keyboard field shows as the avatar: the newest emoji typed (any — flags, skin tones,
 * families), else the first two letters, digits or symbols (initials, ★, ♥…). null when empty.
 */
export function keyboardAvatar(input) {
  const gs = graphemes(String(input || '').normalize('NFC').replace(/[\s\p{Cc}]+/gu, ''))
  if (!gs.length) return null
  for (let i = gs.length - 1; i >= 0; i--) if (isEmojiG(gs[i])) return gs[i]
  return gs.slice(0, 2).join('')
}
/** A stored avatar symbol: one character (emoji or symbol), or two that aren't emoji (initials). */
export function isAvatarText(v) {
  if (typeof v !== 'string' || !v || v.length > 32 || /[\s\p{Cc}<>]/u.test(v)) return false
  if (EMOJI_SET.has(v)) return true
  const gs = graphemes(v)
  return gs.length === 1 || (gs.length === 2 && !gs.some(isEmojiG))
}

export const AVATAR_ICONS = ['dumbbell', 'flame', 'bolt', 'trophy', 'crown', 'rocket', 'star', 'heart', 'mountain', 'moon', 'sun', 'target', 'arm', 'figureRun', 'bike', 'swim',
  'boxing', 'kettlebell', 'barbell', 'figureWalk', 'medal', 'shield', 'palm', 'book', 'school', 'music', 'gamepad', 'ball', 'leafy', 'drop', 'sparkles', 'smile', 'camera', 'lightbulb', 'prayer', 'nut']
export const AVATAR_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff375f', '#bf5af2', '#5e5ce6', '#30b0c7', '#ffd60a',
  '#ff453a', '#ff6482', '#ff9500', '#d4a017', '#34c759', '#007a3d', '#66d4cf', '#64d2ff', '#7d7aff', '#af52de', '#ac8e68', '#c08552', '#ce1126', '#8e8e93', '#3a3a3c', '#1c1c1e']

// ---- 12.0: ready-made pictures, kept in the repository (public/avatars/) ---------------------------------
// The online (light) app loads them from GitHub (lib/assets.js); the others carry them inside.
export const AVATAR_PICS = [
  { id: 'lion', name: 'Lion' }, { id: 'tiger', name: 'Tiger' }, { id: 'wolf', name: 'Wolf' },
  { id: 'falcon', name: 'Falcon' }, { id: 'horse', name: 'Arabian horse' }, { id: 'lifter', name: 'Lifter' },
  { id: 'footballer', name: 'Footballer' }, { id: 'boxer', name: 'Boxer' }, { id: 'runner-girl', name: 'Runner' },
  { id: 'hero', name: 'Superhero' },
]
export const avatarPicUrl = id => assetUrl('avatars/' + id + '.webp')

export const PHOTO_SIDE = 192
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/
/** A stored profile photo is a small image data URL (never a link to somewhere else). */
export const isAvatarPhoto = v => typeof v === 'string' && v.length < 200000 && PHOTO_RE.test(v)

/** The largest centred square of a w × h picture: { sx, sy, side }. */
export function squareCrop(w, h) {
  const side = Math.max(0, Math.min(+w || 0, +h || 0))
  return { sx: Math.round(((+w || 0) - side) / 2), sy: Math.round(((+h || 0) - side) / 2), side }
}

async function bitmapOf(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file)
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url })
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000) }
}

/** The first of `urls` that loads → a small square JPEG data URL (centre-cropped). */
export async function avatarFromUrls(urls, fetchImpl = typeof fetch === 'function' ? fetch : null) {
  for (const u of urls) {
    try {
      const r = await fetchImpl(u)
      if (!r.ok) continue
      const b = await r.blob()
      return await avatarFromFile(b.type && /^image\//.test(b.type) ? b : new Blob([b], { type: 'image/webp' }))
    } catch { /* next one */ }
  }
  throw new Error('unavailable')
}

/** A picked picture → a small square JPEG data URL (centre-cropped). Throws if it can't be read. */
export async function avatarFromFile(file, side = PHOTO_SIDE) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('not an image')
  const bmp = await bitmapOf(file)
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight
  const { sx, sy, side: s } = squareCrop(w, h)
  if (!s) throw new Error('empty image')
  const c = document.createElement('canvas')
  c.width = side; c.height = side
  const g = c.getContext('2d')
  g.imageSmoothingQuality = 'high'
  g.drawImage(bmp, sx, sy, s, s, 0, 0, side, side)
  if (bmp.close) bmp.close()
  const url = c.toDataURL('image/jpeg', 0.84)
  if (!isAvatarPhoto(url)) throw new Error('encode')
  return url
}
