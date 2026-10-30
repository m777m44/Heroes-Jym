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
