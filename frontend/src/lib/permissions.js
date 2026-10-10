// First-launch permissions: what the app needs to count steps all day in the background, asked
// in one go from the dialog in components/PermissionGate.jsx after the user agrees.
//
// Android app: physical activity + notifications (one system prompt each), then the step
// counter is switched on (native foreground service — keeps running with the app closed, the
// screen off, and after a restart), then the battery-optimisation exemption (a system dialog),
// then — on Xiaomi, Huawei, Oppo, Vivo… — the maker's own "autostart" screen.
// Browser: notifications and (iOS) motion access; a page can only count while it is open.
import { MOBILE } from './mobile.js'
import { hasStepService, servicePermissions, call as serviceCall } from './stepService.js'

export const CONSENT_KEY = 'mj_consent_v1'

export function consentGiven() {
  try { return !!localStorage.getItem(CONSENT_KEY) } catch { return true }
}
export function saveConsent() {
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ at: Date.now(), v: 1 })) } catch { /* private mode */ }
}
export function clearConsent() {
  try { localStorage.removeItem(CONSENT_KEY) } catch { /* */ }
}

/** Where we run: 'android' (native service), 'mobile' (iOS app), 'web'. */
export async function platform() {
  if (MOBILE && await hasStepService()) return 'android'
  return MOBILE ? 'mobile' : 'web'
}

export async function deviceInfo() {
  return (await serviceCall('getDeviceInfo')) || { autostart: false }
}

export async function batteryExempt() {
  const r = await serviceCall('getBatteryStatus')
  return !!(r && r.ignoring)
}

/** Ask for the battery exemption and wait (up to `ms`) until it's granted or the user returns. */
export async function requestBattery({ ms = 45000, poll = 1000, isCancelled = () => false } = {}) {
  if (await batteryExempt()) return true
  await serviceCall('requestBatteryExemption')
  const t0 = Date.now()
  while (Date.now() - t0 < ms && !isCancelled()) {
    await new Promise(r => setTimeout(r, poll))
    if (await batteryExempt()) return true
  }
  return batteryExempt()
}

export const openAutostart = () => serviceCall('openAutostartSettings')

/** Runtime permissions (system prompts). → { activity, notifications } as 'granted' | 'denied' | 'prompt' */
export async function requestRuntime(plat) {
  if (plat === 'android') {
    const st = await servicePermissions(true)
    return { activity: st.activityRecognition, notifications: st.notifications }
  }
  // Browsers / iOS app: notifications if the page can show them, motion on iOS Safari.
  let notifications = 'unsupported'
  try {
    if (typeof Notification !== 'undefined') {
      notifications = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    }
  } catch { notifications = 'denied' }
  let activity = 'granted'
  try {
    const DME = typeof window !== 'undefined' && window.DeviceMotionEvent
    if (DME && typeof DME.requestPermission === 'function') activity = await DME.requestPermission()
    else if (!DME) activity = 'unsupported'
  } catch { activity = 'denied' }
  return { activity, notifications: notifications === 'default' ? 'prompt' : notifications }
}

/** Short summary for the dialog's checklist. */
export const ok = v => v === 'granted' || v === true
