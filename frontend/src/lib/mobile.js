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
// true when the Android step service took the list (it replaces whatever was scheduled before).
async function nativeWorkoutReminders(items) {
  try {
    const { hasStepService, call } = await import('./stepService.js')
    if (!(await hasStepService())) return false
    const { t } = await import('./i18n.js')
    const r = await call('scheduleWorkoutReminders', {
      items,
      strings: { channel: t('Workout reminders'), channelDesc: t('Your workout and home-workout reminders'), start: t('Start'), later: t('In 30 min') },
    })
    return !!r && typeof r.scheduled === 'number'
  } catch { return false }
}
export async function syncReminder(S, interactive = false) {
  try {
    const { planReminders, reminderText, planSignature, ID_BASE, PLAN_DAYS, LEGACY_IDS } = await import('./dailyReminder.js')
    const sig = planSignature(S)
    if (!interactive && sig === lastSig) return true
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const ids = [...LEGACY_IDS, ...Array.from({ length: PLAN_DAYS * 2 }, (_, i) => ID_BASE + i)]
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) }).catch(() => {})
    const { reminderPrefs } = await import('./dailyReminder.js')
    if (!reminderPrefs(S).on) { await nativeWorkoutReminders([]); lastSig = sig; return true }
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && interactive) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    const plan = planReminders(S)
    const routeOf = item => (item.kind === 'walk' ? '/walk' : '/home')
    // 2.10 Android: scheduled natively — a heads-up banner with a light vibration, "Start" and
    // "In 30 min" buttons, back after a reboot (WorkoutReminder.java).
    if (await nativeWorkoutReminders(plan.map(item => {
      const tx = reminderText(item, S)
      return { id: item.id, at: item.at.getTime(), title: tx.title, body: tx.body, big: tx.big || tx.body,
        route: routeOf(item), start: item.kind === 'plan' || item.kind === 'plannudge' ? '/home?start=plan' : routeOf(item) }
    }))) { lastSig = sig; return true }
    const notifications = plan.map(item => {
      const { title, body } = reminderText(item, S)
      return { id: item.id, title, body, schedule: { at: item.at, allowWhileIdle: true }, extra: { route: routeOf(item) } }
    })
    if (notifications.length) await LocalNotifications.schedule({ notifications })
    lastSig = sig
    return true
  } catch (e) { return false }
}

// 3.0 — medicine & vitamin reminders from the health log: one daily repeating local
// notification per dose time (ids 7400 + n), on their own channel with vibration. Re-run only
// when the list changes.
let lastMedSig = null
export async function syncMedReminders(S, interactive = false) {
  try {
    const { medReminders, MED_ID_BASE } = await import('./health.js')
    const items = medReminders(S)
    const sig = JSON.stringify([items, S.lang])
    if (!interactive && sig === lastMedSig) return true
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: Array.from({ length: 60 }, (_, i) => ({ id: MED_ID_BASE + i })) }).catch(() => {})
    if (!items.length) { lastMedSig = sig; return true }
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && interactive) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    const { t } = await import('./i18n.js')
    await LocalNotifications.createChannel({ id: 'mj_meds', name: t('Medicine reminders'), description: t('Your medicines and vitamins'), importance: 4, visibility: 1, vibration: true }).catch(() => {})
    await LocalNotifications.schedule({
      notifications: items.map(m => ({
        id: m.id, channelId: 'mj_meds',
        title: (m.kind === 'vit' ? '💊 ' + t('Vitamin time: {0}', m.name) : '💊 ' + t('Medicine time: {0}', m.name)),
        body: (m.dose ? m.dose + ' · ' : '') + t('Tap to mark it as taken.'),
        schedule: { on: { hour: m.hour, minute: m.minute }, repeats: true, allowWhileIdle: true },
        extra: { route: '/health' },
      })),
    })
    lastMedSig = sig
    return true
  } catch { return false }
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
