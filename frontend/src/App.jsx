import { useEffect, useState, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { bindUI } from './components/ui.jsx'
import { setLang, useLang, isRTL, t, langOf } from './lib/i18n.js'
import { resolveTheme, applyTheme } from './lib/themes.js'
import { applyWallpaper } from './lib/wallpapers.js'
import { applyLook } from './lib/look.js'
import { installTouchFeedback } from './lib/motion.js'
import { setNav, nav } from './lib/nav.js'
import { onNotificationTap, syncDayReminders } from './lib/mobile.js'
import { useWakeLock } from './lib/wakelock.js'
import Icon from './components/Icon.jsx'
import TabBar from './components/TabBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Modals from './components/Modals.jsx'
import Toast from './components/Toast.jsx'
import ScrollIndicator from './components/ScrollIndicator.jsx'
import RestTimer from './components/RestTimer.jsx'
import Login from './views/Login.jsx'
import Home from './views/Home.jsx'
import Plan from './views/Plan.jsx'
import RoutineEdit from './views/RoutineEdit.jsx'
import Workout from './views/Workout.jsx'
import Stats from './views/Stats.jsx'
import History from './views/History.jsx'
import Library from './views/Library.jsx'
import Settings from './views/Settings.jsx'
import Walking from './views/Walking.jsx'
import BodyWeight from './views/BodyWeight.jsx'
import Water from './views/Water.jsx'
import Themes from './views/Themes.jsx'
// 4.0: screens you open now and then load on first use (a smaller first start)
const Admin = lazy(() => import('./views/Admin.jsx'))
const Coach = lazy(() => import('./views/Coach.jsx'))
const CoachIntake = lazy(() => import('./views/CoachIntake.jsx'))
const CoachProposal = lazy(() => import('./views/CoachProposal.jsx'))
const IdealBody = lazy(() => import('./views/IdealBody.jsx'))
const Health = lazy(() => import('./views/Health.jsx'))
const Backups = lazy(() => import('./views/Backups.jsx'))
const StartWorkout = lazy(() => import('./views/StartWorkout.jsx'))
const WorkoutSection = lazy(() => import('./views/StartWorkout.jsx').then(m => ({ default: m.WorkoutSection })))
const WorkoutCategory = lazy(() => import('./views/StartWorkout.jsx').then(m => ({ default: m.WorkoutCategory })))
// 4.2: the calorie calculator and the burn plan
const Calories = lazy(() => import('./views/Calories.jsx'))
const BurnSelect = lazy(() => import('./views/BurnPlan.jsx').then(m => ({ default: m.BurnSelect })))
const BurnReview = lazy(() => import('./views/BurnPlan.jsx').then(m => ({ default: m.BurnReview })))
const Food = lazy(() => import('./views/Food.jsx'))
const Kitchen = lazy(() => import('./views/Kitchen.jsx'))
const Wallpapers = lazy(() => import('./views/Wallpapers.jsx'))
const Reports = lazy(() => import('./views/Reports.jsx'))
// 8.0
const Tools = lazy(() => import('./views/Tools.jsx'))
const Timer = lazy(() => import('./views/Timer.jsx'))
const Breathe = lazy(() => import('./views/Breathe.jsx'))
const Fasting = lazy(() => import('./views/Fasting.jsx'))
const Recovery = lazy(() => import('./views/Recovery.jsx'))
const Drinks = lazy(() => import('./views/Drinks.jsx'))       // 9.0
const DayPlan = lazy(() => import('./views/DayPlan.jsx'))     // 9.0
const Sodas = lazy(() => import('./views/Sodas.jsx'))         // 10.0
const Nuts = lazy(() => import('./views/Nuts.jsx'))           // 10.0
const Notifications = lazy(() => import('./views/Notifications.jsx'))   // 10.0
import CelebrationOverlay from './components/pedometer/CelebrationOverlay.jsx'
import StartCountdown from './components/workout/StartCountdown.jsx'
import PermissionGate from './components/PermissionGate.jsx'
import AccountGate from './components/AccountGate.jsx'
import { storageChosen, startCloudSync, restoreFromBackup } from './lib/cloud.js'
import { startAutoSnapshots } from './lib/backups.js'
import { applyA11y } from './lib/a11y.js'
import AppLock from './components/AppLock.jsx'
import { MOBILE } from './lib/mobile.js'
import { DEMO } from './lib/demo.js'
import { usePedometer } from './store/usePedometer.js'
import { startWaterSync } from './lib/waterSync.js'
import { installBackButton } from './lib/backButton.js'
import { bindSoundPrefs, prefetchPack, packOf } from './lib/celebrate.js'
import { initBatterySaver, refreshSaver } from './lib/battery.js'
import { syncNativeTheme } from './lib/nativeTheme.js'
import { syncPlanReminders, pullPlanActions, organizeChannels } from './lib/planReminders.js'

bindUI(useUI)   // lets the shared controls open sheets without importing the store at module scope

// The phone's light / dark setting, live (2.10: themes can follow it — lib/themes.js).
const darkQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
function useSystemDark() {
  const [dark, setDark] = useState(() => (darkQuery ? darkQuery.matches : null))
  useEffect(() => {
    if (!darkQuery) return
    const on = e => setDark(e.matches)
    darkQuery.addEventListener ? darkQuery.addEventListener('change', on) : darkQuery.addListener(on)
    return () => { darkQuery.removeEventListener ? darkQuery.removeEventListener('change', on) : darkQuery.removeListener(on) }
  }, [])
  return dark
}

function Shell() {
  const navigate = useNavigate()
  const loc = useLocation()
  const { S, user, ready } = useStore()
  const isGuest = useStore(s => s.isGuest())
  const langV = useLang()   // re-renders the whole shell when the language (pack) changes
  useEffect(() => { setNav(navigate) }, [navigate])
  useEffect(() => installBackButton(), [])
  useEffect(() => installTouchFeedback(() => useStore.getState().S), [])   // 7.0: ripple + tap haptics
  useEffect(() => { onNotificationTap(to => nav(to)) }, [])
  const systemDark = useSystemDark()
  useEffect(() => {
    const th = resolveTheme(S, systemDark)
    applyTheme(th, S.accent)
    applyWallpaper(S.wall, th.mode)     // 6.0: after the theme — it makes the surfaces see-through
  }, [S.theme, S.themeSystem, S.accent, systemDark, S.wall]) // eslint-disable-line react-hooks/exhaustive-deps
  // 9.0: the theme reaches Android — status / navigation bars and the notification shade
  useEffect(() => { const tm = setTimeout(() => syncNativeTheme(useStore.getState().S), 150); return () => clearTimeout(tm) }, [S.theme, S.themeSystem, S.accent, systemDark, S.wall, S.notifTheme]) // eslint-disable-line react-hooks/exhaustive-deps
  // 9.0: sound packs read their settings from the store; the battery saver watches the battery
  useEffect(() => { bindSoundPrefs(() => useStore.getState().S); initBatterySaver(() => useStore.getState().S) }, [])
  useEffect(() => { refreshSaver() }, [S.saver])
  useEffect(() => { applyLook(S) }, [S.shape, S.cardStyle]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { applyA11y(S) }, [S.textScale, S.highContrast, S.reduceMotion]) // eslint-disable-line react-hooks/exhaustive-deps
  const lang = langOf(S)                     // 'auto' → the phone's language
  useEffect(() => { setLang(lang) }, [lang])
  useEffect(() => {
    const de = document.documentElement
    de.lang = lang
    de.dir = isRTL(lang) ? 'rtl' : 'ltr'
  }, [langV, lang])
  // every tab/route change starts at the top of the page
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  // bound to the workout, not to the route — checking Stats mid-session keeps the screen on
  useWakeLock(!!S.active && S.keepAwake !== false)

  const authed = user || isGuest
  // the step counter comes back on by itself if it was on when the app was last closed
  useEffect(() => { if (ready && authed) usePedometer.getState().resume() }, [ready, authed])
  // water: reminders (native on Android) and the two-way sync with the notification buttons
  useEffect(() => { if (ready && authed) return startWaterSync(useStore) }, [ready, authed])
  // 9.0: the chosen sound pack is fetched once in the background, so it also plays offline
  useEffect(() => {
    if (!ready) return
    const tm = setTimeout(() => { const st = useStore.getState().S; if (st.sound !== false) prefetchPack(packOf(st)) }, 9000)
    return () => clearTimeout(tm)
  }, [ready, S.soundPack])
  // 9.0: date-specific reminders are re-armed when the app comes back (a new day, a new plan)
  useEffect(() => {
    if (!ready || !authed) return
    // 10.0: "Done ✓" pressed on schedule reminders while the app was closed is logged now
    const pull = () => pullPlanActions().then(r => { if (r && r.count) useUI.getState().toast(r.kcal ? t('From your reminders: {0} done · {1} kcal logged', r.count, r.kcal) : t('From your reminders: {0} done', r.count)) })
    const onVis = () => { if (document.visibilityState === 'visible') { const st = useStore.getState().S; syncDayReminders(st); pull().finally(() => syncPlanReminders(useStore.getState().S)) } }
    pull()
    organizeChannels()
    // Done ✓ tapped while the app stays on screen (the shade pulled over it) is picked up too
    const iv = MOBILE ? setInterval(() => { if (document.visibilityState === 'visible') pull() }, 60000) : null
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis) }
  }, [ready, authed])
  // 9.0: day-plan reminders follow the plan (and are re-made for a new day when the app opens)
  useEffect(() => { if (ready && authed) syncPlanReminders(useStore.getState().S) }, [ready, authed, S.planner, S.lang]) // eslint-disable-line react-hooks/exhaustive-deps
  // 2.6: the Google account copy (when signed in) — kept in step while the app runs
  useEffect(() => { if (ready && authed) return startCloudSync(useStore) }, [ready, authed])
  // 4.0: a version of your data once a day, kept on this phone (Settings → Backups & restore)
  useEffect(() => {
    if (!ready || !authed || DEMO) return
    return startAutoSnapshots(() => useStore.getState().S, () => { const st = useStore.getState().S; return { keep: Number(st.backupKeep) || 7, enabled: st.autoBackup !== false } })
  }, [ready, authed])
  // first launch on the phone: where should the data live? (then the permissions dialog)
  const [chosen, setChosen] = useState(() => !MOBILE || storageChosen())
  // 2.8: installed again / a new phone — Android may have put the account's backup copy back.
  // Checked before the first-launch question, which is then not needed.
  const [checked, setChecked] = useState(chosen)
  useEffect(() => {
    if (!ready || !authed || checked) return
    let live = true
    restoreFromBackup(useStore)
      .then(ok => { if (live && ok) { setChosen(true); useUI.getState().toast(t('Welcome back — your data was restored from your Google account')) } })
      .catch(() => {})
      .finally(() => { if (live) setChecked(true) })
    return () => { live = false }
  }, [ready, authed, checked])
  // back from the system settings (e.g. "Physical activity" allowed again): try once more
  useEffect(() => {
    if (!ready || !authed) return
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      const st = usePedometer.getState().status
      if (st === 'denied' || st === 'error') usePedometer.getState().resume()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [ready, authed])
  if (!ready && !authed) return (
    <div id="app">
      <div style={{ paddingTop: '44vh', display: 'flex', justifyContent: 'center', fontSize: 34, color: 'var(--label-3)' }}>
        <Icon name="dumbbell" />
      </div>
    </div>
  )

  return (
    <>
      {/* keyed on the route: a view that throws is contained, and switching tabs
          re-mounts the boundary, so the tab bar is always a way out */}
      <div id="app" className="vfade" key={loc.pathname}>
        <ErrorBoundary>
          {!authed ? <Login /> : (
            <Suspense fallback={<div className="lazy-wait" aria-busy="true" />}>
            <Routes>
              <Route path="/home" element={<Home />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/plan/r/:id" element={<RoutineEdit />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/history" element={<History />} />
              <Route path="/library" element={<Library />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/walk" element={<Walking />} />
              <Route path="/weight" element={<BodyWeight />} />
              <Route path="/water" element={<Water />} />
              <Route path="/ideal" element={<IdealBody />} />
              <Route path="/health" element={<Health />} />
              <Route path="/backups" element={<Backups />} />
              <Route path="/start" element={<StartWorkout />} />
              <Route path="/start/:mode" element={<WorkoutSection />} />
              <Route path="/start/:mode/:cat" element={<WorkoutCategory />} />
              <Route path="/calories" element={<Calories />} />
              <Route path="/food" element={<Food />} />
              <Route path="/kitchen" element={<Kitchen />} />
              <Route path="/wallpapers" element={<Wallpapers />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/timer" element={<Timer />} />
              <Route path="/breathe" element={<Breathe />} />
              <Route path="/fasting" element={<Fasting />} />
              <Route path="/recovery" element={<Recovery />} />
              <Route path="/drinks" element={<Drinks />} />
              <Route path="/dayplan" element={<DayPlan />} />
              <Route path="/schedule" element={<DayPlan />} />
              <Route path="/sodas" element={<Sodas />} />
              <Route path="/nuts" element={<Nuts />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/burn/review" element={<BurnReview />} />
              <Route path="/burn/:mode" element={<BurnSelect />} />
              <Route path="/themes" element={<Themes />} />
              {/* The Coach screens gate themselves on the instance config; the routes exist
                  unconditionally so a deep link from a notification lands somewhere sane
                  rather than on the catch-all. */}
              <Route path="/coach" element={<Coach />} />
              <Route path="/coach/intake" element={<CoachIntake />} />
              <Route path="/coach/proposal" element={<CoachProposal />} />
              <Route path="/admin" element={user?.admin ? <Admin /> : <Navigate to="/home" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
            </Suspense>
          )}
        </ErrorBoundary>
      </div>
      <TabBar />
      <RestTimer />
      <Modals />
      <Toast />
      <ScrollIndicator />
      <CelebrationOverlay />
      <StartCountdown />
      {MOBILE && !DEMO && <AppLock />}
      {authed && ready && !DEMO && checked && (chosen ? <PermissionGate /> : <AccountGate onDone={() => setChosen(true)} />)}
    </>
  )
}

export default function App() {
  const boot = useStore(s => s.boot)
  useEffect(() => { boot() }, [boot])
  return <HashRouter><Shell /></HashRouter>
}
