// Water: keeps the app, the reminders and (on Android) the native water store in step.
//
//  Android  the reminders live natively (WaterReminder.java): the config + translated texts go
//           to `configureWater` whenever they change; days are merged both ways — a drink
//           logged from a notification shows up here, one logged here updates the live step
//           notification — and the later change of a day wins.
//  iOS      the next day of reminders is scheduled with local notifications (static texts).
//  Web      a browser can't wake a closed page, so while the app is open a reminder appears
//           as a toast (and a system notification when the tab is in the background).
import { MOBILE } from './mobile.js'
import { t, getLang, dateLocale } from './i18n.js'
import { todayISO, isoOf } from './format.js'
import { walkPrefs } from './stepMetrics.js'
import {
  CONTAINERS, CONTAINER_NAME, MOVES, containerOf, waterGoalMlOf, waterGoalParts, waterRemindPrefs, mlOn, changedAt,
  mergeNative, nextReminder, reminderSlots, suggestMove, bodyKg, waterPanelOn, movesForKind,
} from './water.js'
import { planFor } from './dailyPlan.js'
import { notifColor } from './themes.js'

export { bodyKg }

const fmt = n => Math.round(n).toLocaleString(dateLocale())

/** "Cup (250 ml)" */
export const containerPhrase = c => `${t(CONTAINER_NAME[c.key])} (${fmt(c.ml)} ${t('ml')})`

/** Every text the native reminder shows; {ml} {goal} {unit} {steps} {n} {min} {move} are filled natively. */
export function waterStrings(S) {
  const c = containerOf(S)
  return {
    title: '💧 ' + t('Time for water — {0}', containerPhrase(c)),
    body: t('{0} of {1} ml today', '{ml}', '{goal}'),
    stepsLine: t('{0} steps', '{steps}'),
    walk: '🚶 ' + t('You have been still a while — walk {0} steps (about {1} min).', '{n}', '{min}'),
    move: '🏋️ ' + t('Quick move: {0}', '{move}'),
    drink: '✓ ' + t('Drank it'),
    snooze: t('In 15 min'),
    added: t('+{0} ml · {1} of {2} ml', '{unit}', '{ml}', '{goal}'),
    goalTitle: t('Water goal reached!'),
    goalBody: t('{0} ml today — your body thanks you.', '{ml}'),
    liveRow: '💧 ' + t('{0} of {1} ml', '{ml}', '{goal}'),
    liveAdd: '+ ' + t(CONTAINER_NAME[c.key]),
    mlUnit: t('ml'),
    channel: t('Water reminders'),
    channelDesc: t('A reminder to drink, with a short exercise.'),
    channelQuiet: t('Water reminders (silent)'),
    channelVib: t('Water reminders (vibrate)'),           // 2.9 — sound + vibration
    channelQuietVib: t('Water reminders (vibrate only)'),  // 2.9 — vibration, no sound
    channelCelebrate: t('Celebrations'),
    open: t('Open app'),
    tapClose: t('Tap anywhere to close'),
    // 2.6 — the water panel in the notifications
    panelTitle: t('Water today'),
    label: t('Water'),
    panelLeft: t('{0} ml to go', '{left}'),
    panelDone: t('Goal reached — well done!'),
    panelAuto: t('Auto goal: {0} + {1} walking + {2} training', '{base}', '{walk}', '{train}'),
    undo: t('Undo'),
    edit: t('Edit'),
    channelPanel: t('Water in the notifications'),
  }
}

export function waterConfig(S) {
  const c = containerOf(S)
  const wp = walkPrefs(S)
  const day = todayISO()
  const parts = waterGoalParts(S, day)
  return {
    on: S.waterOn !== false,
    goalMl: parts.total,
    // 2.6 — the automatic goal: the native side adds the walking part itself from live steps
    auto: parts.auto,
    baseMl: parts.base,
    workoutDay: day,
    workoutMl: parts.workoutMl,
    panel: waterPanelOn(S),
    containers: CONTAINERS.map(x => ({ key: x.key, ml: x.ml, name: t(CONTAINER_NAME[x.key]) })),
    unitMl: c.ml,
    unit: c.key,
    remind: waterRemindPrefs(S),
    sound: S.sound !== false,
    vibrate: wp.haptics !== false,
    fullCelebrate: wp.celebrate !== false && wp.fullCelebrate !== false,
    lang: getLang(),
    locale: dateLocale(),
    strings: waterStrings(S),
    moves: MOVES.map(m => t(m)),
    // 2.10: { getDay(): [moves] } — each weekday's reminders follow that day's workout
    movesByDay: movesByDay(S),
  }
}

/** The water-reminder moves of the day `iso` (English keys), from its plan. */
export function dayMoves(S, iso) {
  let kind = null
  try { kind = S.planOn === false ? null : planFor(S, iso).kind } catch { /* no plan */ }
  return movesForKind(kind)
}

/** Translated moves for the next seven days, keyed by getDay() (native: Calendar.DAY_OF_WEEK - 1). */
export function movesByDay(S, now = new Date()) {
  const out = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12)
    out[d.getDay()] = dayMoves(S, isoOf(d)).map(m => t(m))
  }
  return out
}

/** The reminder text for a non-native platform (no live step count available). */
export function staticReminder(S, at, slot) {
  const p = waterRemindPrefs(S)
  const moves = dayMoves(S, isoOf(at))
  const g = suggestMove({ now: at.getTime(), steps: 0, goal: 1, lastStepAt: 0, from: p.from, to: p.to, slot, moves })
  const move = t(moves[g.kind === 'move' ? g.i : 0])
  return {
    title: '💧 ' + t('Time for water — {0}', containerPhrase(containerOf(S))),
    body: p.move ? t('Quick move: {0}', move) : t('A reminder to drink, with a short exercise.'),
  }
}

// ---- the sync loop ------------------------------------------------------------------------

const IOS_ID_BASE = 3000, IOS_MAX = 24
let started = false

export function startWaterSync(store) {
  if (started) return () => {}
  started = true
  const S = () => store.getState().S
  let stop = []
  let native = null           // stepService module when the Android service is present
  let cfgSig = null
  let pushed = { day: null, ml: -1, at: 0 }

  const today = () => todayISO()

  const mergeFromNative = days => {
    if (!days) return false
    const cur = S()
    const probe = { waterMl: { ...(cur.waterMl || {}) }, waterAt: { ...(cur.waterAt || {}) }, water: cur.water }
    if (!mergeNative(probe, days)) return false      // nothing newer — don't touch the state
    const d = today()
    pushed = { day: d, ml: mlOn(probe, d), at: changedAt(probe, d) }   // set first: no echo back
    store.getState().updateQuiet(s => { mergeNative(s, days) })
    return true
  }

  const pushConfig = (force = false) => {
    const cfg = waterConfig(S())
    const sig = JSON.stringify(cfg)
    if (!force && sig === cfgSig) return
    cfgSig = sig
    if (native) native.call('configureWater', { config: cfg })
    else if (MOBILE) scheduleIOS()
  }

  const pushToday = () => {
    if (!native) return
    const d = today()
    const ml = mlOn(S(), d), at = changedAt(S(), d)
    if (pushed.day === d && pushed.ml === ml) return
    if (!at) return            // nothing logged in the app for today yet
    pushed = { day: d, ml, at }
    native.call('setWater', { day: d, ml, at, celebrated: ml >= waterGoalMlOf(S()) })
  }

  const pull = async () => {
    if (!native) return
    const r = await native.call('getWater')
    if (r && r.days) mergeFromNative(r.days)
  }

  // iOS: the next IOS_MAX slots as dated one-shot notifications.
  let iosSig = null
  const scheduleIOS = async () => {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const st = S()
      const p = waterRemindPrefs(st)
      const color = notifColor(st)   // 13.0: the theme's colour — a new theme re-colours them
      const sig = JSON.stringify([waterConfig(st).strings.title, p, waterGoalMlOf(st), mlOn(st, today()) >= waterGoalMlOf(st), getLang(), today(), color])
      if (sig === iosSig) return
      iosSig = sig
      await LocalNotifications.cancel({ notifications: Array.from({ length: IOS_MAX }, (_, i) => ({ id: IOS_ID_BASE + i })) }).catch(() => {})
      if (!p.on || st.waterOn === false) return
      const perm = await LocalNotifications.checkPermissions()
      if (perm.display !== 'granted') return
      const now = new Date()
      const done = mlOn(st, today()) >= waterGoalMlOf(st)
      const out = []
      for (let k = 0; k < 2 && out.length < IOS_MAX; k++) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, 12)
        reminderSlots(p, day).forEach((at, i) => {
          if (at <= now || (k === 0 && done) || out.length >= IOS_MAX) return
          out.push({ id: IOS_ID_BASE + out.length, ...staticReminder(st, at, i), iconColor: color, schedule: { at, allowWhileIdle: true }, extra: { route: '/water' } })
        })
      }
      if (out.length) await LocalNotifications.schedule({ notifications: out })
    } catch { /* no plugin */ }
  }

  // Web: while the page is open.
  let webNext = null
  const webTick = async () => {
    const st = S()
    const p = waterRemindPrefs(st)
    if (!p.on || st.waterOn === false) { webNext = null; return }
    const now = new Date()
    if (!webNext) { webNext = nextReminder(p, now); return }
    if (now < webNext) return
    const due = webNext
    webNext = nextReminder(p, now)
    if (now - due > 10 * 60000) return               // the tab slept through it
    if (mlOn(st, today()) >= waterGoalMlOf(st)) return
    const { title, body } = staticReminder(st, due, Math.floor(due.getTime() / 60000 / p.every))
    try {
      const { useUI } = await import('../store/useUI.js')
      useUI.getState().toast(title + ' — ' + body)
    } catch { /* */ }
    try {
      if (document.visibilityState === 'hidden' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, tag: 'mj-water' })
      }
    } catch { /* */ }
  }

  const onChange = () => { pushConfig(); pushToday(); if (!native && MOBILE) scheduleIOS() }

  ;(async () => {
    if (MOBILE) {
      try {
        const m = await import('./stepService.js')
        if (await m.hasStepService()) native = m
      } catch { native = null }
    }
    if (native) {
      await pull()
      pushConfig(true)
      pushToday()
      const off = await native.onServiceEvent('water', ev => { if (ev && ev.day) mergeFromNative({ [ev.day]: { ml: ev.ml, at: ev.at } }) })
      stop.push(off)
      const onVis = () => { if (document.visibilityState === 'visible') pull() }
      document.addEventListener('visibilitychange', onVis)
      stop.push(() => document.removeEventListener('visibilitychange', onVis))
    } else {
      pushConfig(true)
      if (!MOBILE && typeof window !== 'undefined') {
        const tm = setInterval(webTick, 30000)
        webTick()
        stop.push(() => clearInterval(tm))
      }
    }
    stop.push(store.subscribe(onChange))
  })()

  return () => { stop.forEach(f => { try { f() } catch { /* */ } }); stop = []; started = false }
}

// ---- for the settings screens -------------------------------------------------------------

async function svc() {
  if (!MOBILE) return null
  try { const m = await import('./stepService.js'); return (await m.hasStepService()) ? m : null } catch { return null }
}

export async function testWaterReminder(S) {
  const m = await svc()
  if (m) { await m.call('configureWater', { config: waterConfig(S) }); await m.call('testWaterReminder'); return 'native' }
  if (MOBILE) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      let perm = await LocalNotifications.checkPermissions()
      if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
      if (perm.display !== 'granted') return 'denied'
      await LocalNotifications.schedule({ notifications: [{ id: IOS_ID_BASE + IOS_MAX, ...staticReminder(S, new Date(), Date.now()), iconColor: notifColor(S), schedule: { at: new Date(Date.now() + 1500) }, extra: { route: '/water' } }] })
      return 'local'
    } catch { return 'none' }
  }
  const { title, body } = staticReminder(S, new Date(), Math.floor(Date.now() / 60000))
  try {
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') await Notification.requestPermission()
      if (Notification.permission === 'granted') { new Notification(title, { body, tag: 'mj-water' }); return 'web' }
    }
  } catch { /* */ }
  return 'toast:' + title + ' — ' + body
}

/** { fullScreen, overlay, sdk } on Android, null elsewhere. */
export async function celebrationStatus() {
  const m = await svc()
  return m ? m.call('getCelebrationStatus') : null
}
export async function openCelebrationSetting(which) {
  const m = await svc()
  if (m) await m.call(which === 'overlay' ? 'openOverlaySettings' : 'openFullScreenSettings')
}

/** The native full-screen cheer (Android) — `mode` 'screen' | 'notification'. false elsewhere. */
export async function previewNativeCelebration(S, kind, value, mode = 'screen') {
  const m = await svc()
  if (!m) return false
  const water = kind === 'water'
  const v = value.toLocaleString(dateLocale())
  await m.call('previewCelebration', {
    mode,
    spec: {
      kind, value,
      kicker: water ? t('Water goal reached!') : kind === 'goal' ? t('Daily goal reached!') : t('Milestone'),
      sub: water ? t('{0} ml today — your body thanks you.', v) : kind === 'goal' ? t('{0} steps today — well done.', v) : t('steps — keep it up!'),
      unit: water ? t('ml') : t('steps'),
      open: t('Open app'),
      hint: t('Tap anywhere to close'),
      channel: t('Celebrations'),
      locale: dateLocale(),
      sound: S.sound !== false,
      vibrate: walkPrefs(S).haptics !== false,
    },
  })
  return true
}
