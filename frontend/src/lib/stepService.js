// Bridge to the native Android step counter (frontend/android/.../steps/StepServicePlugin).
//
// On Android the counting no longer happens in the WebView at all: a foreground service reads
// the hardware step counter all day — app closed, screen off, phone locked — and draws its own
// live notification (and home-screen widget) with the steps, a progress bar, distance, kcal,
// speed, a walking timer, a seconds-ticking clock in Baghdad time and a countdown to midnight.
// The web app only configures it (goal, stride, weight, switches, and every text it shows, in
// the app's language) and reads its numbers back into the synced state.
//
// Everything here is behind MOBILE + platform checks; web bundles never load the plugin.
import { MOBILE } from './mobile.js'
import { t, getLang, dateLocale } from './i18n.js'
import { goalOf, strideMeters, walkPrefs } from './stepMetrics.js'
import { IRAQ_TZ, clockZoneOf } from './liveClock.js'

let pluginP = null
async function plugin() {
  if (!MOBILE) return null
  if (!pluginP) {
    pluginP = (async () => {
      try {
        const { registerPlugin, Capacitor } = await import('@capacitor/core')
        if (Capacitor.getPlatform() !== 'android') return null
        if (!Capacitor.isPluginAvailable('StepService')) return null
        return registerPlugin('StepService')
      } catch { return null }
    })()
  }
  return pluginP
}

/** true on the Android app with the native service compiled in. */
export async function hasStepService() { return !!(await plugin()) }

/** The texts the service shows, in the app's language. {steps} / {left} are filled natively. */
export function serviceStrings(S) {
  const zone = clockZoneOf(S)
  return {
    channelLive: t('Live step counter'),
    channelLiveDesc: t('Your steps today, updated as you walk — also on the lock screen.'),
    channelAlert: t('Walking milestones'),
    channelAlertDesc: t('Every 1,000 steps and your daily goal, with a sound.'),
    channelAlertQuiet: t('Walking milestones (silent)'),
    todayTitle: t('Steps today'),
    live: t('Live'),
    walking: t('Walking'),
    paused: t('Paused'),
    pausedLine: t('Paused — tap Resume to keep counting.'),
    off: t('Off — tap to start'),
    pause: t('Pause'),
    resume: t('Resume'),
    open: t('Open'),
    km: 'km',
    kcal: 'kcal',
    kmh: 'km/h',
    active: t('active'),
    dayLeft: t('Day ends in'),
    zoneLabel: zone === IRAQ_TZ ? t('Baghdad') : '',
    goalTitle: t('Daily goal reached!') + ' 🎉',
    goalBody: [t('{0} steps today — well done.', '{steps}'), t('Champion! {0} steps today.', '{steps}')],
    goalSay: t('Goal reached. Well done!'),
    milestoneTitle: t('{0} steps!', '{steps}'),
    milestoneSay: t('{0} steps', '{steps}'),
    milestoneBody: [
      t('Keep going — {0} steps to your goal.', '{left}'),
      t('Great pace! Only {0} steps left.', '{left}'),
      t('You are doing great — {0} to go.', '{left}'),
    ],
    motto0: [t('Every journey starts with one step.')],
    motto1: [t('Good start — keep moving!'), t('Keep it up — every step counts.')],
    motto2: [t('Halfway there — you’ve got this.')],
    motto3: [t('Almost there — {0} steps left!', '{left}')],
    motto4: [t('Just {0} more steps!', '{left}')],
    mottoDone: [t('Goal reached — every extra step is a bonus!'), t('Champion! Keep the streak alive.')],
  }
}

/** Everything the service needs to know, from the profile state. */
export function serviceConfig(S, weightKg) {
  const p = walkPrefs(S)
  return {
    goal: goalOf(S),
    strideM: strideMeters(S),
    weightKg: Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 70,
    vibrate: !!p.haptics,
    alerts: !!p.notify,
    sound: S.sound !== false && p.alertSound !== false,
    voice: !!p.voice,
    lang: getLang(),
    locale: dateLocale(),
    clockZone: clockZoneOf(S),
    strings: serviceStrings(S),
  }
}

export async function serviceAvailable() {
  const P = await plugin()
  if (!P) return { stepCounter: false }
  try { return await P.isAvailable() } catch { return { stepCounter: false } }
}

export async function servicePermissions(interactive) {
  const P = await plugin()
  if (!P) return { activityRecognition: 'denied', notifications: 'denied' }
  let st = await P.getPermissionStatus()
  if (interactive && (st.activityRecognition !== 'granted' || st.notifications !== 'granted')) st = await P.requestPermissions()
  return st
}

export async function call(method, arg) {
  const P = await plugin()
  if (!P) return null
  try { return await P[method](arg || {}) } catch (e) { if (method === 'start') throw e; return null }
}

export async function onServiceEvent(name, fn) {
  const P = await plugin()
  if (!P) return () => {}
  const h = await P.addListener(name, fn)
  return () => { try { h.remove() } catch { /* */ } }
}
