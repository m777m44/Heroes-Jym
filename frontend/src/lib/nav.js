// Lets non-component modules (sheet flows) navigate. App registers the router's navigate.
let _nav = () => {}
export const setNav = fn => { _nav = fn }
export const nav = (to, opts) => (opts ? _nav(to, opts) : _nav(to))

/**
 * 2.11: the ‹ back button on every screen — back to the screen you came from when there is
 * one inside the app (the router keeps an index in history.state), else to `fallback` (opened
 * from a notification, a shortcut or a fresh start). The phone's Back button does the same
 * (lib/backButton.js).
 */
export function goBack(fallback = '/home') {
  const idx = typeof window !== 'undefined' && window.history.state ? Number(window.history.state.idx) || 0 : 0
  if (idx > 0) window.history.back()
  else nav(fallback, { replace: true })
}
