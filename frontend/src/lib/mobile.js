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
// 9.0: reminders carry the theme's accent as their icon colour (Android). 13.0: worked out from
// the data (themes.js notifColor — also the classic green when themed notifications are off),
// and part of every reminder signature below, so a new theme re-colours the waiting reminders.
async function accentColor(S) {
  try { return (await import('./themes.js')).notifColor(S) } catch { return undefined }
}
/** Channel settings that follow the theme (Android applies them when a channel is first made). */
export const themedChannel = color => (color ? { lights: true, lightColor: color } : {})

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
  } catch { return null }   // first launch, or unreadable — localStorage copy takes over
}

export async function nativeSave(state) {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({ path: FILE, directory: Directory.Data, data: JSON.stringify(state), encoding: Encoding.UTF8 })
  } catch { /* keep the localStorage copy */ }
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
    const { planReminders, reminderText, planSignature, ID_BASE, PLAN_DAYS, LEGACY_IDS, reminderPrefs } = await import('./dailyReminder.js')
    // 4.2: the burn plan's reminders ride along (lib/burnPlan.js) — one per exercise at its time
    const { burnReminders, burnReminderText, burnSignature, BURN_ID_BASE, BURN_DAYS, SNOOZE_MIN } = await import('./burnPlan.js')
    const { bodyKg } = await import('./water.js')
    const kg = bodyKg(S)
    const color = await accentColor(S)
    const sig = planSignature(S) + burnSignature(S, kg) + '|' + color
    if (!interactive && sig === lastSig) return true
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const ids = [...LEGACY_IDS, ...Array.from({ length: PLAN_DAYS * 2 }, (_, i) => ID_BASE + i), ...Array.from({ length: BURN_DAYS * 10 }, (_, i) => BURN_ID_BASE + i)]
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) }).catch(() => {})
    const on = reminderPrefs(S).on
    const burn = burnReminders(S, kg)
    if (!on && !burn.length) { await nativeWorkoutReminders([]); lastSig = sig; return true }
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && interactive) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    const plan = on ? planReminders(S) : []
    const routeOf = item => (item.kind === 'walk' ? '/walk' : '/home')
    const { t } = await import('./i18n.js')
    const burnItems = burn.map(r => {
      const tx = burnReminderText(r)
      // Android: Start opens that exercise, "In 10 min" and "Skip" work without opening the app
      return { id: r.id, nid: r.nid, at: r.at.getTime(), title: tx.title, body: tx.body, big: tx.big, route: '/burn/review', start: tx.start,
        later: SNOOZE_MIN, laterLabel: t('In {0} min', SNOOZE_MIN), skip: t('Skip') }
    })
    // 2.10 Android: scheduled natively — a heads-up banner with a light vibration, "Start" and
    // "In 30 min" buttons, back after a reboot (WorkoutReminder.java).
    if (await nativeWorkoutReminders(plan.map(item => {
      const tx = reminderText(item, S)
      return { id: item.id, at: item.at.getTime(), title: tx.title, body: tx.body, big: tx.big || tx.body,
        route: routeOf(item), start: item.kind === 'plan' || item.kind === 'plannudge' ? '/home?start=plan' : routeOf(item) }
    }).concat(burnItems))) { lastSig = sig; return true }
    const notifications = plan.map(item => {
      const { title, body } = reminderText(item, S)
      return { id: item.id, title, body, iconColor: color, schedule: { at: item.at, allowWhileIdle: true }, extra: { route: routeOf(item) } }
    }).concat(burnItems.map(x => ({ id: x.id, title: x.title, body: x.body, iconColor: color, schedule: { at: new Date(x.at), allowWhileIdle: true }, extra: { route: x.start } })))
    if (notifications.length) await LocalNotifications.schedule({ notifications })
    lastSig = sig
    return true
  } catch { return false }
}

// 3.0 — medicine & vitamin reminders from the health log: one daily repeating local
// notification per dose time (ids 7400–7459, then 8000–8059 — health.js), on their own channel
// with vibration. Re-run only when the list changes.
let lastMedSig = null
export async function syncMedReminders(S, interactive = false) {
  try {
    const { medReminders, medReminderIds } = await import('./health.js')
    const items = medReminders(S)
    const color = await accentColor(S)
    const sig = JSON.stringify([items, S.lang, color])
    if (!interactive && sig === lastMedSig) return true
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: medReminderIds().map(id => ({ id })) }).catch(() => {})
    if (!items.length) { lastMedSig = sig; return true }
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && interactive) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    const { t } = await import('./i18n.js')
    await LocalNotifications.createChannel({ id: 'mj_meds', name: t('Medicine reminders'), description: t('Your medicines and vitamins'), importance: 4, visibility: 1, vibration: true, ...themedChannel(color) }).catch(() => {})
    await LocalNotifications.schedule({
      notifications: items.map(m => ({
        id: m.id, channelId: 'mj_meds', iconColor: color,
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

// 7.1 — "Your day" on the Ideal body screen: meals (with the calories and a dish), the workout
// and the evening walk at their times (channel mj_day). 9.0 (review on PR #11): no longer
// repeating notifications that kept showing the day they were made — each one is for one date,
// worked out for that date: today's still-ahead ones and the next six days' (ids in
// daySchedule.js), so they keep coming while the app stays closed, made again whenever the app
// opens or the plan changes. Water keeps its own reminders.
let lastDaySig = ''
export async function syncDayReminders(S, interactive = false) {
  if (!MOBILE) return false
  try {
    const [{ dayReminderItems, dayReminderId, dayReminderIds, DAY_REMIND_DAYS, DAY_REMIND_PER_DAY }, { idealBodyOf }, { isoOf }] = await Promise.all([import('./daySchedule.js'), import('./idealBody.js'), import('./format.js')])
    const now = new Date()
    const days = Array.from({ length: DAY_REMIND_DAYS }, (_, off) => off).map(off => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off)
      return { off, d, iso: isoOf(d) }
    })
    const r = idealBodyOf(S)
    const items = []
    for (const day of days) {
      dayReminderItems(S, r, day.iso).slice(0, DAY_REMIND_PER_DAY).forEach((x, i) => {
        const at = new Date(day.d.getFullYear(), day.d.getMonth(), day.d.getDate(), x.hour, x.minute)
        if (at.getTime() > now.getTime() + 30000) items.push({ ...x, id: dayReminderId(day.off, i), at })
      })
    }
    const color = await accentColor(S)
    const sig = JSON.stringify([days.map(d => d.iso), items.map(x => [x.id, +x.at, x.item.kcal, x.item.ideas && x.item.ideas[0] && x.item.ideas[0].id, x.item.plan && x.item.plan.title]), S.lang, color])
    if (!interactive && sig === lastDaySig) return true
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: dayReminderIds().map(id => ({ id })) }).catch(() => {})
    if (!items.length) { lastDaySig = sig; return true }
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && interactive) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    const { t } = await import('./i18n.js')
    const { MEALS } = await import('./food.js')
    const meal = k => t((MEALS.find(m => m.key === k) || MEALS[3]).name)
    await LocalNotifications.createChannel({ id: 'mj_day', name: t('Your day'), description: t('Meals, workout and walk at their times'), importance: 4, visibility: 1, vibration: true, ...themedChannel(color) }).catch(() => {})
    await LocalNotifications.schedule({
      notifications: items.map(({ id, at, item: x }) => {
        let title, body, route
        if (x.kind === 'meal') {
          title = '🍽 ' + meal(x.meal) + (x.kcal ? ' · ' + t('{0} kcal', x.kcal) : '')
          body = (x.ideas && x.ideas[0] ? t('For example: {0}', t(x.ideas[0].name)) + ' — ' : '') + t('Tap to log what you eat.')
          route = '/food'
        } else if (x.kind === 'workout') {
          title = '💪 ' + t(x.plan.title)
          body = t('{0} min', x.plan.minutes) + ' · ' + t('about {0} kcal', x.plan.kcal) + ' — ' + t('Tap to start.')
          route = '/home'
        } else {
          title = '🚶 ' + t('Evening walk')
          body = t('{0} steps today', x.steps) + ' · ' + t('{0} min', x.min)
          route = '/walk'
        }
        return { id, channelId: 'mj_day', title, body, iconColor: color, schedule: { at, allowWhileIdle: true }, extra: { route } }
      }),
    })
    lastDaySig = sig
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

/**
 * 13.1 — share plain text (the schedule): the phone's share sheet, the browser's Web Share, else it
 * is copied. → 'shared' | 'copied' | '' (cancelled or failed)
 */
export async function shareText(text, title = '') {
  try {
    if (MOBILE) { const { Share } = await import('@capacitor/share'); await Share.share({ title, text, dialogTitle: title }); return 'shared' }
    if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ title, text }); return 'shared' }
  } catch (e) {
    if (e && (e.name === 'AbortError' || /cancel/i.test(String(e.message || e)))) return ''
  }
  const { copyText } = await import('./clipboard.js')
  return (await copyText(text)) ? 'copied' : ''
}

export async function shareExport(json, filename) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  const w = await Filesystem.writeFile({ path: filename, directory: Directory.Cache, data: json, encoding: Encoding.UTF8 })
  await Share.share({ title: filename, url: w.uri })
}
