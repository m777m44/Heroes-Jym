import { useEffect, useState, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { bindUI } from './components/ui.jsx'
import { setLang, useLang, isRTL, t, langOf } from './lib/i18n.js'
import { resolveTheme, applyTheme } from './lib/themes.js'
import { setNav, nav } from './lib/nav.js'
import { onNotificationTap } from './lib/mobile.js'
import { useWakeLock } from './lib/wakelock.js'
import Icon from './components/Icon.jsx'
import TabBar from './components/TabBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Modals from './components/Modals.jsx'
import Toast from './components/Toast.jsx'
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
import CelebrationOverlay from './components/pedometer/CelebrationOverlay.jsx'
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
  useEffect(() => { onNotificationTap(to => nav(to)) }, [])
  const systemDark = useSystemDark()
  useEffect(() => { applyTheme(resolveTheme(S, systemDark), S.accent) }, [S.theme, S.themeSystem, S.accent, systemDark])
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
      <CelebrationOverlay />
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
