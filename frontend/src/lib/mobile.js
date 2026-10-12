// Mobile build (VITE_MOBILE=1) — the standalone app-store version (Capacitor native shell).
//
// There is no backend: nothing to sign in to, everything lives on the phone. Unlike guest
// mode in a browser, this is the user's only copy of their training log, so it can't depend
// on WebView localStorage alone (iOS evicts that under storage pressure). Every persist()
// therefore also lands in a JSON file in the app's private data directory, and boot()
// restores from it. The daily reminders use native local notifications scheduled per
// calendar date — no server involved, unlike Web Push in the self-hosted version.
//
// Like the demo build, MOBILE is replaced at build time, so all of this folds away in
// web bundles; the Capacitor plugins are only ever imported behind it.

export const MOBILE = import.meta.env.VITE_MOBILE === '1'

const FILE = 'mahdi-jym-state.json'
// Name of the mirror before the MAHDI-JYM rebrand — read once as a fallback so an existing
// install keeps its log after updating.
const LEGACY_FILE = 'opengym-state.json'

export async function nativeLoad() {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const read = path => Filesystem.readFile({ path, directory: Directory.Data, encoding: Encoding.UTF8 })
    const r = await read(FILE).catch(() => read(LEGACY_FILE))
    return JSON.parse(r.data)
  } catch (e) { return null }   // first launch, or unreadable — localStorage copy takes over
}

export async function nativeSave(state) {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({ path: FILE, directory: Directory.Data, data: JSON.stringify(state), encoding: Encoding.UTF8 })
  } catch (e) { /* keep the localStorage copy */ }
}

// (Re)schedule the daily reminders as concrete calendar dates for the next two weeks
// (lib/dailyReminder.js): workout days that aren't trained yet, a follow-up an hour later, and
// rest-day walking reminders if switched on. Dated one-shot notifications instead of the old
// weekly repeat mean a day you already trained, or moved the workout away from, stays quiet.
// Cheap, but only re-run when something the plan depends on changed (planSignature) — steps
// are saved every few seconds on a walk. `interactive` gates the OS permission prompt to the
// Settings toggle; a background resync never pops a dialog.
let lastSig = null
export async function syncReminder(S, interactive = false) {
  try {
    const { planReminders, reminderText, planSignature, ID_BASE, PLAN_DAYS, LEGACY_IDS } = await import('./dailyReminder.js')
    const sig = planSignature(S)
    if (!interactive && sig === lastSig) return true
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const ids = [...LEGACY_IDS, ...Array.from({ length: PLAN_DAYS * 2 }, (_, i) => ID_BASE + i)]
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) }).catch(() => {})
    const { reminderPrefs } = await import('./dailyReminder.js')
    if (!reminderPrefs(S).on) { lastSig = sig; return true }
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && interactive) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    const notifications = planReminders(S).map(item => ({
      id: item.id,
      ...reminderText(item, S),
      schedule: { at: item.at, allowWhileIdle: true },
      extra: { route: item.kind === 'walk' ? '/walk' : '/home' },
    }))
    if (notifications.length) await LocalNotifications.schedule({ notifications })
    lastSig = sig
    return true
  } catch (e) { return false }
}

// WKWebView can't do blob-URL downloads, so the backup goes out through the OS share sheet
// (Files, AirDrop, mail, …) from a temp file instead.
// Tapping a local notification (reminder or step counter) opens the screen it is about.
// Registered once by App; the listener survives for the app's lifetime.
let tapBound = false
export async function onNotificationTap(go) {
  if (!MOBILE || tapBound) return
  tapBound = true
  const open = route => { if (typeof route === 'string' && route.startsWith('/')) go(route) }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.addListener('localNotificationActionPerformed', ev => open(ev?.notification?.extra?.route))
  } catch { /* plugin unavailable */ }
  // Android: the native step counter's live notification and home-screen widget.
  try {
    const { onServiceEvent, call } = await import('./stepService.js')
    await onServiceEvent('open', ev => open(ev && ev.route))
    const r = await call('getLaunchRoute')
    open(r && r.route)
  } catch { /* no step service */ }
}

export async function shareExport(json, filename) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  const w = await Filesystem.writeFile({ path: filename, directory: Directory.Cache, data: json, encoding: Encoding.UTF8 })
  await Share.share({ title: filename, url: w.uri })
}
