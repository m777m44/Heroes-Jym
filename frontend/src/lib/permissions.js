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
  const d = await serviceCall('getDeviceInfo')
  return d && typeof d === 'object' ? d : { autostart: false }
}

export async function batteryExempt() {
  const r = await serviceCall('getBatteryStatus')
  return !!(r && r.ignoring)
}

/**
 * Ask for the battery exemption and wait until it's granted — at most `ms`, and no longer
 * than `afterReturn` once the app is visible again after the system screen was shown (the
 * user said no, or the phone never showed the dialog).
 */
export async function requestBattery({ ms = 30000, poll = 1000, afterReturn = 2500, isCancelled = () => false } = {}) {
  if (await batteryExempt()) return true
  if (isCancelled()) return false
  await serviceCall('requestBatteryExemption')
  const t0 = Date.now()
  let wasHidden = false, backAt = 0
  while (Date.now() - t0 < ms && !isCancelled()) {
    await new Promise(r => setTimeout(r, poll))
    if (await batteryExempt()) return true
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
    if (hidden) { wasHidden = true; backAt = 0 } else if (wasHidden && !backAt) backAt = Date.now()
    if (backAt && Date.now() - backAt >= afterReturn) break
  }
  return batteryExempt()
}

export const openAutostart = () => serviceCall('openAutostartSettings')

/** The app's page in the system settings (Permissions → Physical activity → Allow). */
export async function openAppSettings() {
  const r = await serviceCall('openAppSettings')
  if (r && r.opened) return true
  const a = await serviceCall('openAutostartSettings')
  return !!(a && a.opened)   // falls back to the same page on older builds
}

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
