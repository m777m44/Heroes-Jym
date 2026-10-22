// The "steps today" notification that stays in the shade while the step counter runs, plus
// one-off milestone notifications for when the app isn't on screen.
//
// Native (Android/iOS): @capacitor/local-notifications. On Android the notification is posted
// `ongoing` (can't be swiped away) and `autoCancel: false`, on a low-importance channel so the
// updates are silent — re-posting the same id replaces it in place. iOS has no ongoing
// notifications; there it is a normal, silently replaced one.
// Browser: the service worker's showNotification with a fixed tag (replaced in place, silent,
// requireInteraction so desktop browsers keep it up). Browsers have no true "ongoing" flag.
//
// Nothing here asks for permission by itself except ensurePermission(), which only the
// switch on the walking screen calls — a background update never pops a dialog.
import { MOBILE } from './mobile.js'
import { t, dateLocale } from './i18n.js'

export const ONGOING_ID = 7001
const MILESTONE_ID = 7002
const CHANNEL = 'pedometer'
const CHANNEL_ALERTS = 'milestones'
const TAG = 'mahdi-jym-steps'
const fmt = n => Math.round(n).toLocaleString(dateLocale())

let channelsReady = false
// Returns a plain box, never the plugin itself: a Capacitor plugin proxy is "thenable" (it
// answers `then`), so resolving a promise with it would hang forever. See stepService.js.
async function native() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  if (!channelsReady) {
    channelsReady = true
    // Android only (no-ops elsewhere). Importance 2 = low: shown, never makes a sound.
    await LocalNotifications.createChannel({ id: CHANNEL, name: t('Step counter'), description: t('Your steps today, while counting'), importance: 2, visibility: 1, vibration: false }).catch(() => {})
    await LocalNotifications.createChannel({ id: CHANNEL_ALERTS, name: t('Walking milestones'), importance: 4, visibility: 1, vibration: true }).catch(() => {})
  }
  return { LN: LocalNotifications }
}
async function swReg() {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return null
  try { return await navigator.serviceWorker.getRegistration() } catch { return null }
}

export async function ensurePermission() {
  try {
    if (MOBILE) {
      const { LN } = await native()
      let p = await LN.checkPermissions()
      if (p.display !== 'granted') p = await LN.requestPermissions()
      return p.display === 'granted'
    }
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    return (await Notification.requestPermission()) === 'granted'
  } catch { return false }
}

export function ongoingText({ steps, goal, speed, km }) {
  const pct = goal ? Math.min(100, Math.floor(steps / goal * 100)) : 0
  return {
    title: t('{0} / {1} steps', fmt(steps), fmt(goal)) + ' · ' + pct + '%',
    body: t('Speed {0} km/h · {1} km', (speed || 0).toFixed(1), (km || 0).toFixed(2)),
  }
}

/** Post or replace the ongoing notification. */
export async function showOngoing(data) {
  const { title, body } = ongoingText(data)
  try {
    if (MOBILE) {
      const { LN } = await native()
      await LN.schedule({ notifications: [{ id: ONGOING_ID, title, body, ongoing: true, autoCancel: false, channelId: CHANNEL, extra: { route: '/walk' }, schedule: { allowWhileIdle: true } }] })
      return
    }
    const reg = await swReg()
    if (reg) await reg.showNotification(title, { body, tag: TAG, silent: true, renotify: false, requireInteraction: true, icon: 'icon-512.png', badge: 'icon-180.png', data: { url: './#/walk' } })
  } catch { /* notifications unavailable — the counter keeps going */ }
}

export async function clearOngoing() {
  try {
    if (MOBILE) { const { LN } = await native(); await LN.cancel({ notifications: [{ id: ONGOING_ID }] }); return }
    const reg = await swReg()
    if (reg) (await reg.getNotifications({ tag: TAG })).forEach(n => n.close())
  } catch { /* */ }
}

/** A milestone reached while the app is in the background — a normal, audible notification. */
export async function notifyMilestone(steps, kind) {
  const title = kind === 'goal' ? t('Daily goal reached!') : t('{0} steps!', fmt(steps))
  const body = kind === 'goal' ? t('{0} steps today — well done.', fmt(steps)) : t('Keep it up — every step counts.')
  try {
    if (MOBILE) {
      const { LN } = await native()
      await LN.schedule({ notifications: [{ id: MILESTONE_ID, title, body, channelId: CHANNEL_ALERTS, extra: { route: '/walk' }, schedule: { allowWhileIdle: true } }] })
      return
    }
    const reg = await swReg()
    if (reg) await reg.showNotification(title, { body, tag: TAG + '-milestone', icon: 'icon-512.png', badge: 'icon-180.png', data: { url: './#/walk' } })
  } catch { /* */ }
}
