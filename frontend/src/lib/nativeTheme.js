// 9.0 — the theme on Android outside the web view: the status bar and navigation bar take the
// app's background colour (with a short colour animation) and dark or light icons to match, and
// the live notification, the water panel and the widgets take the theme's colours — accent,
// surface and text — unless S.notifTheme is false (then they keep the classic green look).
import { MOBILE } from './mobile.js'
import { themePalette } from './themes.js'

let last = ''
export async function syncNativeTheme(S) {
  if (!MOBILE) return
  const p = themePalette()
  if (!p) return
  const cfg = { ...p, notif: !S || S.notifTheme !== false }
  const sig = JSON.stringify(cfg)
  if (sig === last) return
  last = sig
  try {
    const { call } = await import('./stepService.js')
    await call('setTheme', cfg)
  } catch { last = '' }
}
