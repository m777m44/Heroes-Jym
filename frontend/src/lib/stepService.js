// Bridge to the native Android step counter (frontend/android/.../steps/StepServicePlugin).
//
// On Android the counting no longer happens in the WebView at all: a foreground service reads
// the hardware step counter all day — app closed, screen off, phone locked — and draws its own
// live notification (and home-screen widget) with the steps, a progress bar, distance, kcal,
// speed, a walking timer, a seconds-ticking clock in the phone's time and a countdown to midnight.
// The web app only configures it (goal, stride, weight, switches, and every text it shows, in
// the app's language) and reads its numbers back into the synced state.
//
// Everything here is behind MOBILE + platform checks; web bundles never load the plugin.
import { MOBILE } from './mobile.js'
import { t, U, getLang, dateLocale } from './i18n.js'
import { goalOf, strideMeters, walkPrefs } from './stepMetrics.js'
import { clockZoneOf } from './liveClock.js'
import { foodNative } from './food.js'
import { todayISO } from './format.js'

// IMPORTANT: a Capacitor plugin proxy answers *every* property — `then` included — so it
// looks like a promise. Returning it from an async function (or resolving any promise with
// it) makes JS call `proxy.then(resolve, reject)`, which goes to a native method that doesn't
// exist and never calls back: every `await` on it hangs forever. (That was the 2.1/2.2 bug
// behind "Starting…" that never ended and a permission dialog that never closed.) So the
// proxy only ever travels inside a plain box: `{ P }`.
let boxP = null
function box() {
  if (!MOBILE) return Promise.resolve(null)
  if (!boxP) {
    boxP = (async () => {
      try {
        const { registerPlugin, Capacitor } = await import('@capacitor/core')
        if (Capacitor.getPlatform() !== 'android') return null
        if (!Capacitor.isPluginAvailable('StepService')) return null
        return { P: registerPlugin('StepService') }
      } catch { return null }
    })()
  }
  return boxP
}

/** Rejects with Error('timeout') when `p` takes longer than `ms`. */
export function withTimeout(p, ms) {
  let timer
  return Promise.race([
    Promise.resolve(p).finally(() => clearTimeout(timer)),
    new Promise((_, rej) => { timer = setTimeout(() => { const e = new Error('timeout'); e.code = 'timeout'; rej(e) }, ms) }),
  ])
}

// Native calls answer in milliseconds; these limits only matter when something is wrong.
const QUICK_MS = 8000
const START_MS = 15000
const ASK_MS = 120000           // the system permission dialog waits for the user

/** true on the Android app with the native service compiled in. */
export async function hasStepService() { return !!(await box()) }

/** The texts the service shows, in the app's language. {steps} / {left} are filled natively. */
export function serviceStrings() {   // (callers may still pass S — unused since 2.9)
  return {
    channelLive: t('Live step counter'),
    channelLiveDesc: t('Your steps today, updated as you walk — also on the lock screen.'),
    channelAlert: t('Walking milestones'),
    channelAlertDesc: t('Every 1,000 steps and your daily goal, with a sound.'),
    channelAlertQuiet: t('Walking milestones (silent)'),
    todayTitle: t('Steps today'),
    // 2.7.0 — steps and water in one notification
    stepsLabel: t('Steps'),
    stepsLeft: t('{0} steps to go', '{left}'),
    stepsDone: t('Goal reached!'),
    live: t('Live'),
    walking: t('Walking'),
    paused: t('Paused'),
    pausedLine: t('Paused — tap Resume to keep counting.'),
    off: t('Off — tap to start'),
    pause: t('Pause'),
    resume: t('Resume'),
    open: t('Open'),
    km: U('km'),
    kcal: U('kcal'),
    kmh: U('km/h'),
    active: t('active'),
    dayLeft: t('Day ends in'),
    eaten: t('eaten'),
    foodLabel: t('Food'),
    foodLeft: t('{0} kcal left', '{n}'),
    foodOver: t('{0} kcal over', '{n}'),
    zoneLabel: '',                       // 2.9: no city name next to the clock
    goalTitle: t('Daily goal reached!') + ' 🎉',
    // 2.5 — the full-screen celebration and its picture notification
    goalKicker: t('Daily goal reached!'),
    milestoneKicker: t('Milestone'),
    stepsUnit: t('steps'),
    celebrateOpen: t('Open app'),
    celebrateHint: t('Tap anywhere to close'),
    channelCelebrate: t('Celebrations'),
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
    celebrate: p.celebrate !== false,
    fullCelebrate: p.celebrate !== false && p.fullCelebrate !== false,
    fullMilestones: p.celebrate !== false && !!p.fullMilestones,
    lang: getLang(),
    locale: dateLocale(),
    clockZone: clockZoneOf(),
    strings: serviceStrings(S),
    // 5.0: today's food log for the notification (kcal eaten / goal)
    food: S && S.foodOn !== false ? foodNative(S, todayISO()) : null,
  }
}

export async function serviceAvailable() {
  const b = await box()
  if (!b) return { stepCounter: false }
  try { return await withTimeout(b.P.isAvailable(), QUICK_MS) } catch { return { stepCounter: false } }
}

const DENIED = { activityRecognition: 'denied', notifications: 'denied' }

/**
 * Current permission state; with `interactive`, asks for what's missing first ('activity':
 * only when physical activity is missing — notifications were asked already). Never throws.
 */
export async function servicePermissions(interactive) {
  const b = await box()
  if (!b) return DENIED
  let st
  try { st = await withTimeout(b.P.getPermissionStatus(), QUICK_MS) } catch { st = null }
  const missing = !st || st.activityRecognition !== 'granted' || (interactive !== 'activity' && st.notifications !== 'granted')
  if (interactive && missing) {
    try { st = await withTimeout(b.P.requestPermissions(), ASK_MS) }
    catch { try { st = await withTimeout(b.P.getPermissionStatus(), QUICK_MS) } catch { /* keep */ } }
  }
  return st && typeof st === 'object' ? { ...DENIED, ...st } : DENIED
}

/** Calls a plugin method. `start` throws (code 'denied' | 'error' | 'timeout'); others return null on failure. */
export async function call(method, arg) {
  const b = await box()
  if (!b) return null
  try { return await withTimeout(b.P[method](arg || {}), method === 'start' ? START_MS : QUICK_MS) }
  catch (e) { if (method === 'start') throw e; return null }
}

export async function onServiceEvent(name, fn) {
  const b = await box()
  if (!b) return () => {}
  let h = null
  try { h = await withTimeout(b.P.addListener(name, fn), QUICK_MS) } catch { /* no live events; polling covers it */ }
  return () => { try { h?.remove() } catch { /* */ } }
}
