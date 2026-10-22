// Haptics for walking milestones.
//
// Native builds use @capacitor/haptics (real impact/notification engines on iOS and Android);
// browsers fall back to navigator.vibrate, which Android Chrome honours and iOS Safari ignores.
// The plugin is only ever imported behind MOBILE, like every other Capacitor plugin here.
import { MOBILE } from './mobile.js'
import { vibrate } from './sound.js'

const wait = ms => new Promise(r => setTimeout(r, ms))

/** Every 1 000 steps: three medium taps — noticeable in a pocket, not alarming. */
export async function milestoneHaptic() {
  if (MOBILE) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      for (let i = 0; i < 3; i++) { await Haptics.impact({ style: ImpactStyle.Medium }); await wait(140) }
      return
    } catch { /* plugin missing on this platform — fall through */ }
  }
  vibrate([70, 110, 70, 110, 70])
}

/** Daily goal reached: the platform's own "success" pattern, then a long buzz. */
export async function goalHaptic() {
  if (MOBILE) {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics')
      await Haptics.notification({ type: NotificationType.Success })
      await wait(250)
      await Haptics.vibrate({ duration: 400 })
      return
    } catch { /* fall through */ }
  }
  vibrate([90, 80, 90, 80, 400])
}
