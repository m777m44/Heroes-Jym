// The phone's Back button (2.7.0, Android). MainActivity asks window.mjBack() what to do:
//
//   a sheet or dialog is open      → close it (a locked one stays)          'handled'
//   on a tab (Plan, Stats, …)      → go to Home                              'handled'
//   on a deeper screen             → the previous screen (else Home)         'handled'
//   on Home, first press           → "Press back again to exit"              'armed'
//   on Home, again within 2 s      → leave the app (the step counter keeps   'exit'
//                                     running in the background)
//
// Without an answer from here (the page still loading), MainActivity falls back to the same
// press-twice rule with a native toast.
import { useUI } from '../store/useUI.js'
import { t } from './i18n.js'
import { nav } from './nav.js'

export const BACK_EXIT_MS = 2000
const TABS = ['/plan', '/stats', '/library']

/** Pure decision: { sheets:[{locked}], path, idx (router history index), now, last }. */
export function decideBack({ sheets = [], path = '/home', idx = 0, now = 0, last = 0 }) {
  if (sheets.length) return sheets[sheets.length - 1].locked ? 'locked' : 'close'
  const p = (path || '/home').replace(/\/+$/, '') || '/home'
  if (p !== '/home') {
    if (TABS.includes(p)) return 'home'
    return idx > 0 ? 'back' : 'home'
  }
  return now - last < BACK_EXIT_MS ? 'exit' : 'arm'
}

let lastBack = 0

/** What MainActivity calls; returns 'handled' | 'armed' | 'exit'. */
export function onBack(now = Date.now()) {
  const ui = useUI.getState()
  const path = (window.location.hash || '').replace(/^#/, '').split('?')[0] || '/home'
  const idx = (window.history.state && Number(window.history.state.idx)) || 0
  const act = decideBack({ sheets: ui.sheets, path, idx, now, last: lastBack })
  switch (act) {
    case 'close': ui.closeSheet(ui.sheets[ui.sheets.length - 1].id); return 'handled'
    case 'locked': return 'handled'
    case 'back': window.history.back(); return 'handled'
    case 'home': nav('/home', { replace: true }); return 'handled'
    case 'exit': lastBack = 0; return 'exit'
    default:
      lastBack = now
      ui.toast(t('Press back again to exit'))
      return 'armed'
  }
}

export function installBackButton() {
  if (typeof window === 'undefined') return () => {}
  window.mjBack = () => { try { return onBack() } catch { return 'none' } }
  return () => { delete window.mjBack }
}
