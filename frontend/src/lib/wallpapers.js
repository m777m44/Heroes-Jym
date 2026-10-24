// 6.0 — wallpapers behind the whole app.
//   nature / anime / sea / iraq  photos bundled with the app (public/wallpapers/<id>.webp, thumbnails
//                   in t/) — 9.0 added seas & oceans (s*) and Iraq (q*, shown once there are any)
//   art             generated backgrounds: 10 styles × 14 palettes, pure CSS (no files; 9.0 added
//                   ripples, dunes and the lagoon, deep sea, palm grove and Babylon palettes)
//   mine            your own photos from the gallery, resized on the phone and kept in IndexedDB
//                   (never uploaded; they are not part of the backup)
// S.wall = { id, dim (0–0.85), blur (px 0–24) } — id null means no wallpaper.
// applyWallpaper(wall, mode) runs right after applyTheme (which resets the surface colours), so it
// can make the surfaces translucent over the picture and switch on the frosted-glass rules.
import { NATURE, ANIME, SEA, IRAQ } from './wallpaperList.js'
import { dbName } from './demo.js'
import { assetUrl, localUrl, REMOTE_ASSETS, cachedAsset } from './assets.js'

export const WALL_CATS = [
  { key: 'nature', name: 'Nature', icon: 'mountain' },
  { key: 'sea', name: 'Seas', icon: 'waves' },
  { key: 'iraq', name: 'Iraq', icon: 'palm' },
  { key: 'anime', name: 'Anime', icon: 'sparkles' },
  { key: 'art', name: 'Art', icon: 'palette' },
  { key: 'mine', name: 'My photos', icon: 'image' },
]
export const DEFAULT_DIM = 0.35
export const MAX_DIM = 0.85
export const MAX_BLUR = 24
export const MAX_MINE = 40

// 12.0: the full pictures come from the repository in the online (light) app; thumbnails are
// always inside the app (lib/assets.js)
export const photoUrl = (id, thumb = false) => (thumb ? localUrl('wallpapers/t/' + id + '.webp') : assetUrl('wallpapers/' + id + '.webp'))

// ---- generated art -------------------------------------------------------------------------------
export const PALETTES = {
  ocean: ['#071a2b', '#0f4c75', '#00b4d8', '#90e0ef'],
  sunset: ['#2b1055', '#d53369', '#ff9a44', '#ffd86f'],
  forest: ['#06281d', '#1e6f50', '#52b788', '#d8f3dc'],
  royal: ['#160a33', '#5b2a86', '#c86bfa', '#ffd700'],
  fire: ['#1a0505', '#8e0e00', '#ff512f', '#f9d423'],
  candy: ['#3d1a4a', '#ff6fa5', '#a18cd1', '#fbc2eb'],
  night: ['#04050d', '#1b1f3b', '#3a4a8a', '#9fb4ff'],
  mint: ['#002b33', '#07575b', '#4fc1b5', '#c4f1e8'],
  gold: ['#140f04', '#5c4300', '#d4a017', '#fff1a8'],
  rose: ['#2a0a14', '#8a1c3c', '#e85d75', '#ffd1dc'],
  // 9.0
  lagoon: ['#03262e', '#05668d', '#00a6a6', '#9ef0f0'],
  deepsea: ['#020b1a', '#0b2545', '#2a6f97', '#8da9c4'],
  palm: ['#0d1f0f', '#2d5016', '#c9a227', '#f2e8c9'],
  babylon: ['#06123d', '#1d3fa6', '#d4a017', '#ffe9a8'],
}
const STYLES = {
  mesh: ([a, b, c, d]) => `radial-gradient(at 18% 22%, ${c} 0, transparent 52%), radial-gradient(at 85% 18%, ${b} 0, transparent 50%), radial-gradient(at 60% 88%, ${d}55 0, transparent 55%), linear-gradient(160deg, ${a}, ${b})`,
  aurora: ([a, b, c, d]) => `radial-gradient(120% 60% at 30% 0%, ${c}cc 0, transparent 60%), radial-gradient(90% 50% at 85% 10%, ${d}88 0, transparent 60%), linear-gradient(180deg, ${b} 0%, ${a} 70%)`,
  sunset: ([a, b, c, d]) => `radial-gradient(60% 30% at 50% 62%, ${d} 0, transparent 70%), linear-gradient(180deg, ${a} 0%, ${b} 40%, ${c} 72%, ${d} 100%)`,
  waves: ([a, b, c]) => `repeating-radial-gradient(circle at 50% 115%, ${b} 0 26px, ${a} 26px 52px), linear-gradient(${c}, ${a})`,
  stripes: ([a, b, c, d]) => `repeating-linear-gradient(135deg, ${d}14 0 36px, transparent 36px 72px), linear-gradient(135deg, ${a}, ${b} 55%, ${c})`,
  prism: ([a, b, c, d]) => `conic-gradient(from 210deg at 50% 62%, ${a}, ${b}, ${c}, ${d}, ${b}, ${a})`,
  dots: ([a, b, c, d]) => `radial-gradient(${d}33 1.6px, transparent 1.8px) 0 0/22px 22px, linear-gradient(170deg, ${a}, ${b} 60%, ${c})`,
  orbs: ([a, b, c, d]) => `radial-gradient(circle at 25% 30%, ${c} 0 14%, transparent 34%), radial-gradient(circle at 78% 62%, ${d}aa 0 10%, transparent 30%), radial-gradient(circle at 40% 85%, ${b} 0 12%, transparent 32%), ${a}`,
  // 9.0
  ripples: ([a, b, c, d]) => `repeating-radial-gradient(circle at 20% 12%, ${d}26 0 2px, transparent 2px 24px), radial-gradient(90% 60% at 20% 10%, ${c}66 0, transparent 60%), linear-gradient(165deg, ${a}, ${b} 60%, ${c})`,
  dunes: ([a, b, c, d]) => `radial-gradient(130% 55% at 50% 118%, ${d}cc 0 40%, transparent 41%), radial-gradient(150% 65% at 15% 112%, ${c}d9 0 45%, transparent 46%), radial-gradient(170% 75% at 92% 108%, ${b} 0 50%, transparent 51%), linear-gradient(180deg, ${a}, ${b} 75%)`,
}
export const ART_STYLES = Object.keys(STYLES)
export const ART = ART_STYLES.flatMap(st => Object.keys(PALETTES).map(p => 'art:' + st + ':' + p))
export function artBackground(id) {
  const [, st, p] = String(id).split(':')
  return STYLES[st] && PALETTES[p] ? STYLES[st](PALETTES[p]) : null
}

// ---- the lists -------------------------------------------------------------------------------------
export function wallsOf(cat, mine = []) {
  if (cat === 'nature') return NATURE.map(([id, color]) => ({ id, color, thumb: photoUrl(id, true) }))
  if (cat === 'anime') return ANIME.map(([id, color]) => ({ id, color, thumb: photoUrl(id, true) }))
  if (cat === 'sea') return SEA.map(([id, color]) => ({ id, color, thumb: photoUrl(id, true) }))
  if (cat === 'iraq') return IRAQ.map(([id, color]) => ({ id, color, thumb: photoUrl(id, true) }))
  if (cat === 'art') return ART.map(id => ({ id, bg: artBackground(id) }))
  if (cat === 'mine') return mine.map(m => ({ id: 'mine:' + m.id, thumb: m.thumb }))
  return []
}
const PHOTO_CATS = { anime: ANIME, sea: SEA, iraq: IRAQ }
export const visibleCats = () => WALL_CATS.filter(c => !PHOTO_CATS[c.key] || PHOTO_CATS[c.key].length)
const COLOR = Object.fromEntries([...NATURE, ...ANIME, ...SEA, ...IRAQ])
const PREFIX = { a: 'anime', s: 'sea', q: 'iraq' }
export const catOf = id => (!id ? null : id.startsWith('art:') ? 'art' : id.startsWith('mine:') ? 'mine' : PREFIX[id[0]] || 'nature')
export const wallExists = id => !!id && (catOf(id) === 'art' ? !!artBackground(id) : catOf(id) === 'mine' ? true : id in COLOR)
export function normWall(w) {
  const x = w && typeof w === 'object' ? w : {}
  const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d)
  return { id: wallExists(x.id) ? x.id : null, dim: num(x.dim, 0, MAX_DIM, DEFAULT_DIM), blur: num(x.blur, 0, MAX_BLUR, 0) }
}

// ---- your photos (IndexedDB) ----------------------------------------------------------------------
const DB = dbName('mj-walls'), STORE = 'p'
function db() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no indexedDB'))
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
const tx = async (mode, fn) => {
  const d = await db()
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode), st = t.objectStore(STORE)
    let out
    Promise.resolve(fn(st)).then(v => { out = v })
    t.oncomplete = () => res(out)
    t.onerror = () => rej(t.error)
  })
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })

/** Fit a picture inside max × max and encode it as JPEG. */
export async function resizeImage(file, max, quality = 0.85) {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  c.getContext('2d').drawImage(bmp, 0, 0, w, h)
  if (bmp.close) bmp.close()
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', quality))
}

const urls = new Map()
const urlOf = (key, blob) => { if (!urls.has(key)) urls.set(key, URL.createObjectURL(blob)); return urls.get(key) }

/** Your photos, newest first: [{ id, t, thumb (blob URL) }]. */
export async function listMine() {
  try {
    const all = await tx('readonly', st => req(st.getAll()))
    return (all || []).sort((a, b) => b.t - a.t).map(r => ({ id: r.id, t: r.t, thumb: urlOf(r.id + ':t', r.thumb) }))
  } catch { return [] }
}
/** Add photos from the gallery. Returns the new ids (stops at MAX_MINE). */
export async function addMine(files, now = Date.now()) {
  const have = (await listMine()).length
  const ids = []
  for (const f of [...files].slice(0, Math.max(0, MAX_MINE - have))) {
    if (!/^image\//.test(f.type || 'image/')) continue
    const full = await resizeImage(f, 1440, 0.85)
    const thumb = await resizeImage(full, 320, 0.7)
    const id = 'p' + (now + ids.length).toString(36)
    await tx('readwrite', st => req(st.put({ id, t: now + ids.length, full, thumb })))
    ids.push(id)
  }
  return ids
}
export async function removeMine(id) {
  for (const k of [id, id + ':t']) if (urls.has(k)) { URL.revokeObjectURL(urls.get(k)); urls.delete(k) }
  try { await tx('readwrite', st => req(st.delete(id))) } catch { /* gone already */ }
}
async function mineUrl(id) {
  if (urls.has(id)) return urls.get(id)
  try {
    const r = await tx('readonly', st => req(st.get(id)))
    return r ? urlOf(id, r.full) : null
  } catch { return null }
}

// ---- painting ----------------------------------------------------------------------------------------
let token = 0
/** Paint the wallpaper (call right after applyTheme). */
export function applyWallpaper(wall, mode = 'dark', doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return
  const de = doc.documentElement
  const w = normWall(wall)
  const my = ++token
  if (!w.id) {
    delete de.dataset.wall
    for (const k of ['--wall-bg', '--wall-dim', '--wall-blur', '--wall-tint']) de.style.removeProperty(k)
    return
  }
  const dark = mode !== 'light'
  const cs = typeof getComputedStyle === 'function' ? getComputedStyle(de) : null
  const cur = (k, d) => (de.style.getPropertyValue(k) || (cs && cs.getPropertyValue(k)) || d).trim() || d
  // translucent surfaces over the picture (applyTheme just reset them, so this never stacks)
  const mix = (k, d, pct) => de.style.setProperty(k, `color-mix(in srgb, ${cur(k, d)} ${pct}%, transparent)`)
  mix('--surface', dark ? '#1c1c1e' : '#ffffff', dark ? 62 : 70)
  mix('--surface-2', dark ? '#2c2c2e' : '#ececef', dark ? 70 : 76)
  mix('--bg-el', dark ? '#1c1c1e' : '#ffffff', dark ? 74 : 80)
  de.style.setProperty('--bg-glow', 'none')
  de.dataset.glass = dark ? 'dark' : 'light'
  de.dataset.wall = catOf(w.id)
  de.style.setProperty('--wall-dim', String(w.dim))
  de.style.setProperty('--wall-blur', w.blur + 'px')
  de.style.setProperty('--wall-tint', dark ? '0,0,0' : '255,255,255')
  const cat = catOf(w.id)
  if (cat === 'art') { de.style.setProperty('--wall-bg', artBackground(w.id)); return }
  if (cat === 'mine') {
    de.style.setProperty('--wall-bg', dark ? '#111' : '#eee')
    mineUrl(w.id.slice(5)).then(u => { if (my === token && u) de.style.setProperty('--wall-bg', `url("${u}") center/cover no-repeat, #111`) })
    return
  }
  // 12.0: online (light) app — the picture comes from the repository once, then from the
  // phone's copy (Cache Storage), so it also shows without internet
  if (REMOTE_ASSETS) {
    const bg = COLOR[w.id] || '#222'
    de.style.setProperty('--wall-bg', bg)
    cachedAsset(photoUrl(w.id)).then(u => { if (my === token && u) de.style.setProperty('--wall-bg', `url("${u}") center/cover no-repeat, ${bg}`) })
    return
  }
  // absolute: a relative url() inside a custom property resolves against the stylesheet (assets/)
  let src = photoUrl(w.id)
  try { src = new URL(src, doc.baseURI || undefined).href } catch { /* keep it as is */ }
  de.style.setProperty('--wall-bg', `url("${src}") center/cover no-repeat, ${COLOR[w.id] || '#222'}`)
}
