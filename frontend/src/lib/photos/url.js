// 14.0 — where a kitchen photo's file is, and its own slow drift — kept apart from the photo
// list (./index.js) so the food log's bubbles can draw a photo without loading the whole list.
import { assetUrl } from '../assets.js'

/** The big 640 × 480 picture ('m') or the 200 × 200 one for lists ('t'). */
export const photoUrl = (key, size = 't') => assetUrl(`food/${size === 'm' ? 'm' : 't'}/${key}.webp`)

/** One of four slow drifts for the moving photos, picked from the key so each photo has its own. */
export function driftOf(key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return Math.abs(h) % 4
}

/**
 * A photographer's name as Commons metadata gives it, tidied for the credit line: no wiki user
 * prefixes ("w:en:User:"), "(talk)" links, "(photographer)", "Own work"/"Self", signatures with a
 * date, or the "No machine-readable author provided … assumed" note.
 */
export function cleanAuthor(a) {
  let s = String(a || '')
  const m = /No machine-readable author provided\.\s*(.+?)\s+assumed/i.exec(s)
  if (m) s = m[1]
  s = s.replace(/\s+-{1,2}\s+.*$/, '')                                   // "Name -- signature, date" / "Name - Wikimedia Commons - ©…"
    .replace(/\b(?:w:)?(?:[a-z]{2,3}:)?(?:User|Benutzer|Utilisateur|Usuario|Utente|Gebruiker):/gi, '')
    .replace(/\(\s*t\s*a\s*l\s*k\s*\)/gi, '').replace(/\((?:photographer|fotograf[oa]?|contribs?)\)/gi, '')
    .replace(/^\s*(?:self|myself|own work)[,:]?\s*/i, '').replace(/\s+from\s+[a-z]{2,3}:wp\b/i, '')
    .replace(/\s+/g, ' ').trim()
  if (/^\(.*\)$/.test(s)) s = s.slice(1, -1).trim()
  const half = s.length / 2
  if (s.length > 6 && s.length % 2 === 1 && s.slice(0, half - 0.5) === s.slice(half + 0.5)) s = s.slice(0, half - 0.5)   // "Unknown author Unknown author"
  return s || 'Wikimedia Commons'
}
