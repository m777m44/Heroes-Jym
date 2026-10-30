# Building the mobile app (iOS / Android)

MAHDI-JYM ships in two flavors from the same codebase:

| | **Self-hosted** (this repo's default) | **Mobile app** (`VITE_MOBILE=1`) |
|---|---|---|
| Runs | in any browser, against your own server | natively on iPhone / Android (Capacitor shell) |
| Accounts | passkey sign-in, one profile per person | none — the phone *is* the account |
| Data | synced to your server, readable on desktop | stays on the device (file in the app's private storage) |
| Reminders | Web Push from your server | native local notifications, no server involved |
| Step counter | accelerometer, while the page is open | hardware step sensor, keeps counting in the background (Android) |
| Step notification | service-worker notification | ongoing notification (Android), silent replace (iOS) |
| Exercise media | served by your server (`img/`, `gif/`); *Settings → Offline* saves them in the browser | inside the APK (offline build, the released app) — or the jsDelivr CDN (`build:mobile`) |
| Without internet | the whole app (service worker precaches every built file) | everything — the app never needs a connection |

The mobile flavor never talks to a backend: no sign-in screen, no sync, no telemetry.
State is mirrored from `localStorage` into `mahdi-jym-state.json` in the app's private data
directory on every change (iOS is allowed to evict WebView storage under pressure — the
file mirror is the durable copy and is restored on launch). Backups go out through the
OS share sheet instead of a browser download.

## Prerequisites

- Node 20+
- **Android:** Android Studio (bundles the SDK). Java 21 for Gradle.
- **iOS:** a Mac with Xcode 15+ and CocoaPods (`brew install cocoapods`). A free Apple ID
  is enough to run the app on your own iPhone (see below); paid membership is only needed
  for App Store distribution, which MAHDI-JYM doesn't do.

## Build & run

```sh
cd frontend
npm install
npm run build:mobile        # VITE_MOBILE build + `cap sync` into android/ and ios/ (media from the CDN)

# or the offline app, exactly like the released APK: every exercise image + animation inside
(cd .. && scripts/fetch-media.sh)   # → ../media; or point MEDIA_DIR at a dataset checkout
MEDIA_DIR=../media npm run build:mobile:offline

npx cap open android        # opens Android Studio → run on emulator or device
npx cap open ios            # opens Xcode (Mac only) → set your signing team, then run
```

`npm run build:mobile` bakes the CDN media base into the bundle and copies the web build
into both native projects — re-run it after every web-code change before building natively.

`npm run build:mobile:offline` keeps the media paths relative and copies all 1,324 JPGs and
1,324 GIFs (~138 MB) into `dist/img` + `dist/gif` before `cap sync`
(`scripts/bundle-media.mjs` — it fails if any exercise has no file). The APK grows to about
140 MB, and the exercise library then works with no connection at all. CI always builds this
way (`.github/workflows/android-apk.yml` downloads the dataset at the pinned commit and caches it).

> **Heads-up:** after `build:mobile`, `frontend/dist` contains the *mobile* bundle.
> Run a plain `npm run build` again before deploying `dist` to a server.

## Steps, notifications and permissions (2.0)

| Feature | Plugin | Android permission (asked at runtime) | iOS |
|---|---|---|---|
| Step counter | `@capgo/capacitor-pedometer` 7.x | `ACTIVITY_RECOGNITION` — *Physical activity* | `NSMotionUsageDescription` — *Motion & Fitness* |
| Ongoing step notification, reminders | `@capacitor/local-notifications` | `POST_NOTIFICATIONS` (Android 13+) | notification prompt |
| 1,000-step haptics | `@capacitor/haptics` | `VIBRATE` (install-time) | — |
| GPS speed (optional, off by default) | WebView geolocation | `ACCESS_FINE_LOCATION` | `NSLocationWhenInUseUsageDescription` |

Nothing is requested at launch: the first tap on **Start counting** asks for physical
activity (and notifications if the step notification is on); location is only asked
while counting with GPS speed switched on. Every step value and position stays on the phone.

- **Android** (2.1+) counts in a native foreground service — see below. Some vendors (Xiaomi,
  Huawei, Samsung "deep sleep") kill background apps aggressively — exclude MAHDI-JYM from
  battery optimisation (Walking → *Keep counting in the background*) if counts lag.
- **iOS** has no ongoing notifications and no background sensor stream for third-party apps;
  when you open the app, today's total is filled in from the CoreMotion history.
- **Reminders** are scheduled as dated notifications 14 days ahead and rescheduled whenever
  the app opens or the plan changes, so open the app at least once every two weeks.

After pulling 2.0 into an existing native project, run `npx cap sync` once so Gradle and
CocoaPods pick up the two new plugins.

## Live step counter on the lock screen (2.1, Android)

The Android app counts steps in its own **foreground service** (`android/app/src/main/java/
io/github/m777m44/mahdijym/steps/`), so counting goes on with the app closed, the screen off
and the phone locked, and resumes by itself after a reboot.

| Piece | File | What it does |
|---|---|---|
| Service | `StepCounterService.java` | Listens to the hardware step counter (step detector as fallback), files steps per day and per hour, computes speed/active time, fires the 1,000-step and goal alerts (vibration, sound, optional voice via Android TTS) |
| Notification | `StepNotifier.java`, `res/layout/notif_steps_*.xml` | The live card on the notification shade **and the lock screen**: steps / goal, a progress bar, a clock ticking in the phone’s local time with seconds, walking time, km, kcal, the countdown to midnight and a motivation line; **Pause / Resume** and **Open** buttons |
| Widget | `StepWidget.java`, `res/xml/widget_steps_info.xml` | Home-screen (and, where the launcher allows, lock-screen) widget with the same live numbers |
| Storage | `StepStore.java` | Two months of daily totals + hourly buckets in SharedPreferences; the app merges them on launch (raise-only — nothing already recorded is ever lowered) |
| Bridge | `StepServicePlugin.java` ↔ `frontend/src/lib/stepService.js` | `start / pause / resume / stop / configure / getState / getHistory`, battery-exemption and notification-settings shortcuts; `steps` and `open` events |
| Boot | `BootReceiver.java` | Restarts the counter after a reboot or an app update if it was on |

Permissions involved: `ACTIVITY_RECOGNITION`, `POST_NOTIFICATIONS` (Android 13+, asked on the
first **Start counting**), `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_HEALTH`,
`RECEIVE_BOOT_COMPLETED` and `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (only used when you tap
*Keep counting in the background*). Texts on the notification come from the app's language
setting. The service is used only in the Android app; browsers and iOS keep the 2.0 behaviour.

**Lock-screen visibility:** Android shows the card on the lock screen when *Settings →
Notifications → Notifications on lock screen* allows it ("show all content"). The shortcut
Walking → *Notification settings* opens the app's page directly.

## Nonstop in the background & first-launch permissions (2.2, Android)

On first launch a centred dialog lists what the app needs and why, with a
user-responsibility notice. **Agree & allow** runs, in order:

1. the runtime prompts — *Physical activity* (Android 10+) and *Notifications* (Android 13+);
2. starts the foreground step service;
3. the **battery-optimisation exemption** dialog (needed so Android 12+ lets the app start
   its service from the background, e.g. after a reboot or from the watchdog);
4. on phones whose maker adds its own background killer — Xiaomi/Redmi/POCO, Huawei/Honor,
   Oppo/Realme/OnePlus (ColorOS), Vivo/iQOO, Samsung, Asus, Letv — the maker's **Autostart /
   "No restrictions"** screen (`openAutostartSettings()`; falls back to the app's info page).

What keeps it running:

| Layer | What it does |
|---|---|
| Foreground service, `START_STICKY` | the system restarts it if it has to kill it |
| `Watchdog` alarm, every 15 min | exact/allow-while-idle; restarts the service if it's gone |
| `onTaskRemoved` / `onDestroy` | re-kick 2 s / 5 s later while counting is on |
| `BootReceiver` | `BOOT_COMPLETED`, `QUICKBOOT_POWERON` (incl. HTC), `MY_PACKAGE_REPLACED` |
| App launch | `StepServicePlugin.load()` revives a stopped service |

Turning counting off (Walking → Stop) cancels the watchdog; nothing restarts after that.
The consent is stored in `localStorage` (`mj_consent_v1`).

## Water reminders & the full-screen celebration (2.5, Android)

- **Water reminders** are AlarmManager alarms owned by `WaterReminder.java` (re-armed after a
  reboot by `BootReceiver` and whenever the web app sends `configureWater`). Each one reads the
  native `WaterStore` (prefs `mj_water`) and `StepStore`, so it shows today's water, steps and
  an exercise picked by `WaterMath.suggest` (mirrored in `lib/water.js`, tested on both sides).
  “Drank it” and the “+ water” button on the live step notification are broadcasts — they work
  without opening the app; the web app merges the days back (`getWater` / `water` event).
- **Celebration outside the app:** `Celebration.java` posts a high-priority notification with
  a picture drawn by `CelebrationArt` and a full-screen intent to `CelebrationActivity`
  (Canvas scene in `CelebrationView`, jingle synthesized by `Fanfare`). Android shows it over
  the lock screen when the screen is off/locked; on Android 14+ the user can switch
  full-screen intents off per app (Walking → Celebrations shows the state and a shortcut).
  With **Display over other apps** allowed (`SYSTEM_ALERT_WINDOW`, optional) it also opens on
  top of other apps on an unlocked screen.
- iPhone schedules the next day of water reminders as local notifications; there is no
  full-screen celebration outside the app on iOS.

## Water panel, automatic goal, workout reminders & Google account (2.6, Android)

- **Water panel in the notifications** (channel *Water in the notifications*, id 7101,
  low importance, silent): today's ml against the goal with a bar, the automatic-goal
  breakdown, and **four container buttons (glass / cup / can / bottle) plus Undo and Edit**.
  Tapping a container adds it, Undo takes the last one back, and Edit opens the Water screen. All of
  this works with the app closed. The step notification keeps its small "+" and Undo.
  Turn it off under Water → *Water panel in the notifications*. The reminder uses the same id,
  so a reminder and the panel never show twice.
- **Automatic water goal**: body weight × 33 ml (2,000 ml without a weigh-in), **+70 ml per
  1,000 steps after the first 3,000** (at most +1,200), and **+10 ml per training minute** (at most +1,500).
  The same rule runs natively (`WaterMath.autoGoal`, steps from `StepStore`), so the
  notification goal grows during a walk with the app closed. A fixed goal is still available.
- **Workout reminders at each day's own time**: Settings → Daily reminder → a time for every
  weekday that has a routine. The notification names the routine, how many exercises, the
  first three exercises and about how long it takes (sets × (40 s + rest)).
- **Sign in with Google**: see [GOOGLE_SIGN_IN.md](GOOGLE_SIGN_IN.md). The first launch asks
  Google / this phone / skip, then shows the permissions dialog.

## One notification, Back twice to exit & a sign-in fix (2.7, Android)

- **One bar instead of two.** While the step counter runs, its notification (id 7001,
  `notif_live_small` / `notif_live_big`, `DecoratedCustomViewStyle`, no action row) carries the water too:
  - *Collapsed*: steps | water side by side, each with its own bar, plus a **"+"** for your usual container.
  - *Expanded*: date · status · clock · ⏸ / ▶; a green **Steps** card and a blue **Water** card
    (amount / goal, %, bar, "… to go"); km · kcal · km/h · walking time; the four containers
    with **Undo** and **Edit**; the motto and the countdown to midnight.
  - With the water tracker or *Water in the notifications* off, the steps card fills the width.
  - The separate water panel (id 7101) is now only posted while the step counter is off.
    `WaterReminder.merged()` decides this, and switching between the two needs no restart.
  - A **water reminder** still pops up on its own so it can be heard (channel *Water
    reminders*). It disappears when you drink (from any button), tap *In 15 min*, or after 15 minutes.
- **Back button**: `MainActivity` registers an `OnBackPressedCallback` and asks
  `window.mjBack()` (`lib/backButton.js`) what to do:
  - close the open sheet;
  - from Plan / Stats / Exercises, go Home;
  - from a deeper screen, go back one screen;
  - on Home, the first press shows *Press back again to exit* and a second press within
    2 s leaves the app. The step counter keeps running.
  - If the page doesn't answer, the same rule runs natively with an Android toast.
- **Google sign-in no longer hangs** on "Connecting your account…". Capacitor plugin
  objects are *thenables* (`then` is forwarded to native and never answers), so returning
  one from an `async` function waited forever. `cloud.js` now keeps the plugin in a `{ p }`
  holder (like `stepService.js`), gives every call a time limit, and the screens have a
  **Cancel** button. Natively, the chooser opens after at most 1.5 s even if the
  sign-out of a cached account stalls, and backing out of it counts as a cancel.
  Error **10** still means the Google Cloud setup in [GOOGLE_SIGN_IN.md](GOOGLE_SIGN_IN.md) isn't finished.

## Google account without setup (2.8, Android)

- **Signing in** uses `AccountManager.newChooseAccountIntent`, Android's own chooser of the Google
  accounts on the phone. It needs no Google Cloud project, so it can't fail with error 10.
- **Saving** works straight away through **Android Backup**: `MjBackupAgent`, a key/value
  agent, backs up only `files/mj-backup.json`, with `restoreAnyVersion`. A fresh install takes
  the restored copy back before the first-launch question.
- **Google Drive** is used when the app's signing key is registered
  ([GOOGLE_SIGN_IN.md](GOOGLE_SIGN_IN.md)). It is retried quietly every 6 h and takes over by itself.
- `getToken({ ask: false })` never shows a screen in the background.

## Today's plan, vibrating water reminders & a new look (2.9)

| What | Where | Notes |
|---|---|---|
| Today's plan | `lib/dailyPlan.js`, `components/TodayPlan.jsx` | Every day one workout + a steps target + a water target, for fat loss. Saturday full body · Sunday walking + core · Monday legs & glutes · Tuesday HIIT · Wednesday upper body & core · Thursday long walk + core · Friday mobility & recovery. A routine from your own week wins; a day marked *rest* becomes mobility & recovery. Steps = last 7 days' average + 10 % (more on walking days, less on HIIT/recovery, 5,000–18,000). Sets follow how often you trained in the last 14 days; with a BMI ≥ 30 jumps become joint-friendly moves. The full day done → the full-screen celebration (once a day). Off in *Settings → Today's plan on Home*. |
| My kitchen (6.0) | `lib/kitchen.js`, `views/Kitchen.jsx` | 56 ingredients, 44 recipes per meal (ready-to-cook first, missing ingredients named), calories from per-100 g values, one-tap log, shopping list (bought → into the kitchen), meal builder saved as your own food. `S.pantry`, `S.shopping`. |
| Wallpapers, shapes, card styles (6.0) | `lib/wallpapers.js`, `lib/wallpaperList.js` (generated by `scripts/build-wallpapers.py`), `lib/look.js`, `views/Wallpapers.jsx` | Bundled photos in `public/wallpapers/` (768w WebP + thumbnails in `t/`, cached on first view, not precached), 140 CSS artworks (9.0: seas `s*`, Iraq `q*` once added), your own photos in IndexedDB (`mj-walls`, ≤1440 px JPEG, never uploaded). `S.wall = { id, dim, blur }`, `S.shape`, `S.cardStyle` → `<html data-wall data-shape data-card>`. |
| Drinks & juices (9.0) | `lib/drinks.js`, `lib/recipeText.js`, `views/Drinks.jsx`, `components/DrinkGlass.jsx` | 71 drinks, an ingredient table with density and household units, steeped / strained shares, optional rows, notes and cautions. `S.myDrinks`, `S.drinkFavs`, `S.drinkLog`; a logged drink is a food entry with `dr` (+ water via `logWater`). |
| Iraqi kitchen (9.0) | `lib/kitchen.js` (`iq`, `tip`, template steps) | 28 new dishes; steps can be `[template, …args]` from `lib/recipeText.js`. |
| Day plan (9.0) | `lib/dayPlan.js`, `views/DayPlan.jsx`, `lib/planReminders.js` | `S.planner = { tpl, wake, sleep, remind, auto, blocks, days }` (not `S.dayPlan`, which holds per-date routine overrides). Date-specific notifications 7700–7799 on channel `mj_plan`, in the theme accent. |
| Sound packs (9.0) | `scripts/build-sounds.py` → `public/sounds/<pack>/<kind>.mp3`, `lib/celebrate.js`, `components/SoundPacks.jsx`, `steps/Fanfare.java` | `S.soundPack`, `S.soundVol` (also sent in the step-service config for the lock-screen celebration). Sounds are runtime-cached by the service worker, not precached. The AudioContext suspends 4 s after the last sound (`lib/sound.js keepAwakeFor`). |
| Theme on Android (9.0) | `lib/nativeTheme.js`, `lib/themes.js themePalette()`, `steps/Theme.java`, `steps/SystemBars.java`, `StepServicePlugin.setTheme` | Palette → prefs `mj_theme`; notifications tint text / icons (all versions) and rings / cards (Android 12+); status and navigation bars animate to the theme. `S.notifTheme === false` keeps the classic look. |
| Battery (9.0) | `lib/battery.js`, `StepCounterService`, `StepStore.saveSoon`, `Watchdog` | Screen off: no notification / widget redraws, no step detector; web events only while visible; store writes ≤ every 15 s; watchdog non-wakeup every 30 min; `<html data-saver>` (S.saver auto/on/off). |
| Soft drinks (10.0) | `lib/sodas.js`, `components/SodaArt.jsx`, `views/Sodas.jsx` | 48 drinks × packs (`can`, `bottle`, `glassb`, `glass`, `cup`) and sizes; values per 100 ml. A logged soft drink is a food entry with `sd`, `pk`, `ml` (kcal per pack, `q` = how many). |
| Nuts & seeds (10.0) | `lib/nuts.js`, `components/NutArt.jsx`, `views/Nuts.jsx` | 20 nuts / seeds / snacks, raw · roasted · salted, edible share in the shell, handful = 30 g. A logged portion is a food entry with `nut`, `fm`, `g`. |
| My schedule (10.0) | `lib/dayPlan.js`, `views/DayPlan.jsx`, `lib/planLog.js`, `lib/planReminders.js`, `steps/PlanReminder.java` | Blocks gain `w` (weekdays), `nt` (notes), `rm` (reminder lead, −1 off). `planAlarms` gives the phone one entry per block (weekdays, start, lead, text, quiet days) → `schedulePlanReminders`; each is one alarm that works out its next ring (`PlanMath`, unit-tested) and re-arms itself after ringing, and after a reboot. Native ids 8200–8399, channel `mj_plan`, Done ✓ / In 10 min (snoozes keyed by occurrence); Done is queued (`takePlanActions`) and logged by `applyPlanActions` when the app opens. A day's own changes (`days[iso].mv`, +10 in the live view) keep the usual alarm quiet that day and add a one-day entry (`once`: that date only — `PlanMath` never arms it for another day, also after a reboot). Weekdays and quiet days are the block's own date, also when the lead makes it ring the evening before. A new list takes away reminders already in the shade that no longer apply (block gone, done / skipped, day stopped, moved or new text — matched by the notification's extras). `BootReceiver` re-arms them (and water) after a reboot and when the clock or time zone changes (`TIME_SET`, `TIMEZONE_CHANGED`); a ring far too early or long after its block is not shown. iOS / no native service: weekly-repeating LocalNotifications 7700–7759 (`weeklyFallback`); a block moved for one day rings once at each time that week (`once` → `schedule.at`). |
| Notification centre & channel groups (10.0) | `views/Notifications.jsx`, `steps/Channels.java`, `organizeChannels` | Channels sit in named groups (steps & activity, water, schedule & meals, workouts, health), names from the app's language. The centre lists schedule, water, workouts, your day, medicines, burn plan and a running fast (its "done" notification, Capacitor id 7680 — 7600 until 9.0, which the burn plan's slots use; a pending 9.0 one is unarmed by `cancelLegacyFastAlarm` without touching the shade). |
| School week 2 (11.0) | `lib/dayPlan.js` (`SCHOOL`, `SCHOOL_TV`, `oldSchoolPlan`, `noteText`, `partOf`, `BLOCK_ICONS`), `views/DayPlan.jsx` | The school template on fixed times: Sun–Thu 07:00 wake · 07:15 water · 07:20 breakfast · 07:25 get ready · 07:30–12:40 school (nothing inside) · 12:40 home · 12:50 water · 13:00 lunch (a different dish each day) · 13:40 drink … dinner + water · a light snack before bed · sleep 22:00 (Sun–Wed, Sat nights) / 23:30 (Thu, Fri nights); Fri / Sat from 09:00. Plans carry `tv` (2); an older school plan is offered the new one. Blocks may carry `ic` (an icon from `BLOCK_ICONS`) and `f` items (foods from `foodDb.js`, kcal per serving, logged by `completeBlock` with `makeEntry`). Template names and notes are t() keys (`TEMPLATE_TEXTS`); `noteText` translates only template notes. `MAX_BLOCKS` 80 (native slots 8200–8399 stay enough: blocks + one-day copies ≤ 160). |
| Two versions (12.0) | `package.json` (`build:mobile`, `build:mobile:offline`), `scripts/slim-online.mjs`, `lib/assets.js`, `.github/workflows/android-apk.yml` | **offline** `MAHDI-JYM.apk`: everything inside (exercise media, wallpapers, profile pictures). **online** `MAHDI-JYM-online.apk`: the same app with exercise media from the dataset on jsDelivr and wallpapers / pictures from this repository (`VITE_ASSET_BASE`, pinned to a commit) — `slim-online.mjs` removes the local copies, thumbnails and sounds stay. Same app id, signature and version code, so one installs over the other with the data kept (14.0: two apps — see *Two apps side by side* below). CI fails the online APK above 40 MB. |
| Updates (12.0) | `lib/updates.js`, `components/AppUpdates.jsx`, `App.jsx` | Settings → *App & updates*: the version and which one this is (`VARIANT`), *Check for updates* (GitHub API, `mj_update`), the matching download, the other versions. On Android it checks quietly at most once every 20 h and shows a toast once per version (`mj_update_told`). |
| Web app (12.0) | `lib/demo.js` (`WEBAPP`, `NO_SERVER`, `dbName`), `lib/storageNs.js`, `public/sw.js`, `scripts/build-site.sh` | GitHub Pages serves the real app at `/app/` (`VITE_WEBAPP=1`, data in the browser) and the demo at `/demo/`; the demo keeps its storage under `demo:` and its own IndexedDB / caches so the two never mix. |
| Profile pictures (12.0) | `lib/avatar.js` (`keyboardAvatar`, `isAvatarText`, `AVATAR_PICS`), `components/ProfileSheet.jsx` | Any emoji typed with the keyboard (flags, skin tones, families) or two letters; the last 12 typed (`S.avatarRecent`); ready-made pictures in `public/avatars/` and the wallpaper photos; a photo from the phone. |
| Nuts 2 (11.0) | `lib/nuts.js`, `components/NutArt.jsx` | 47 items in 5 categories (`nut`, `seed`, `snack`, `dried`, `sweet`); forms add `boiled` (salted), `dried`, `sweet`; `hf` = grams in a handful (popcorn 10, lupini 40); dates weigh with the stone (`ef` 0.9). `nutDay` counts grams of `NUTTY` categories only. |
| Profile picture (11.0) | `lib/avatar.js`, `components/ProfileSheet.jsx` | `S.profile = { name, color, emoji? \| icon? \| photo? }` — the photo is a 192 px JPEG data URL (`avatarFromFile`, centre-cropped; `isAvatarPhoto` accepts only small image data URLs). 271 symbols in 8 groups, 36 icons, 24 colours. |
| Journey & water pace (11.0) | `lib/journey.js`, `components/pedometer/JourneyCard.jsx`, `water.js` (`waterPace`), `views/Water.jsx` | All steps × stride along Zakho → Fao (1,360 km, 16 stops, laps). `waterPace(goal, ml, now, from, to)` → due by now, ahead / behind, ml an hour to finish; "Custom amount" logs any 25–1,500 ml (`drinkMl`, undoable). |
| Motion & feel (7.0) | `lib/motion.js`, `index.css` (7.0 motion block) | One delegated `pointerdown` listener: ripple on buttons/rows/cards, a light `@capacitor/haptics` tick (`S.tapHaptics`), `burst()` particles for water / food / sets / records, staggered card entrance, shimmer skeleton. All off under `html[data-motion=reduce]`. |
| Workout tools (7.0) | `lib/plates.js`, `components/workout/LiftTools.jsx`, `lib/voice.js`, `views/Workout.jsx` | Live e1RM record on set tick (`set.pr`), plate calculator (kg/lb bars), 1RM % table rounded to loadable weights, spoken 3-2-1 via `@capacitor-community/text-to-speech` 6.x (web: `speechSynthesis`), `S.voiceCount`. |
| Reports (7.0) | `lib/report.js`, `views/Reports.jsx` (`/reports`) | Week (Sat→Fri) / month vs the period before: score, six stats, tap-to-read bars, records, weight forecast (`weeklyRate`/`etaToGoal`), rule-based tips. |
| Today widget (7.0) | `steps/TodayWidget.java`, `layout/widget_today.xml`, `xml/widget_today_info.xml` | Steps / water / food rings + water buttons (broadcast `WaterReminder.ACTION_ADD`, request codes 90–98). Refreshed from `StepWidget.updateAll()`. |
| Vibration | `WaterReminder.java` (`mj_water_vib`, `mj_water_quiet_vib`), `WaterStore.remindVibrate()` | Water reminders buzz "drip, drip, drop" (`0,180,120,180,120,420` ms), also with the sound off. *Water → Reminders → Vibrate*. Android 8+ fixes vibration per channel, hence the two new channels. |
| Water schedule | `waterSchedule()` in `lib/water.js` | The reminder times with how much you should have drunk by each; on track / *X ml behind*, with a one-tap catch-up. |
| Clock | `lib/liveClock.js`, `StepStore.clockZone()` | Always the phone's own time zone; no city name anywhere (the old `clockZone` setting is ignored, natively too). |
| Controls | `index.css` (`.sw`, `.walk-dock`, `.btn`) | One switch size (52 × 32) that works right-to-left, the walking control dock (reset · start/pause · stop), one height per button size. |

## Themes, phone language, home-workout reminders & steady steps (2.10)

| What | Where | Notes |
|---|---|---|
| Themes | `lib/themes.js`, `views/Themes.jsx` (`/themes`) | 20 families × 6 variants (dark · pure black · deep · dusk · light · pastel) = 120, generated from a hue; `applyTheme()` sets the CSS variables inline. `themeSystem` (default on) swaps to the light / dark counterpart with the phone (`prefers-color-scheme`). Old `dark` / `light` values migrate to Classic. |
| Phone language | `langOf()` / `deviceLang()` in `lib/i18n.js` | `lang: 'auto'` is the new default: the first of `navigator.languages` we have, else English. |
| Home-workout reminder | `WorkoutReminder.java` (channel `mj_workout`), `scheduleWorkoutReminders`, `lib/dailyReminder.js` | Heads-up, silent, light vibration `0,60,90,60`; *Start* → `/home?start=plan`, *Later* = 30 min; next 14 days, rescheduled after a restart (`BootReceiver`). iOS uses Capacitor local notifications. |
| Steady steps | `StepMath.provisionalAfter()`, `StepStore.settleProvisional()` | A counter reading of *d* steps uses up *d* provisional detector steps (max 200), so the total never goes down; 1.5 s after the idle flush unconfirmed ones are dropped. The snapshot's `confirmed` is what JS saves. |
| Day-specific water moves | `movesForKind()` in `lib/water.js`, `movesByDay` in `lib/waterSync.js`, `WaterStore.moves()` | Each weekday's reminders pick moves that fit that day's workout. |
| Celebration | `CelebrationView.java`, `Fanfare.java`, `CelebrationOverlay.jsx`, `lib/celebrate.js` | Fireworks, rays, a brass fanfare with a final chord. |
| Walking buttons | `views/Walking.jsx` (`.walk-ctl`, `.wbtn`) | The 2.8 layout again, refined; the 2.9 dock is gone. |

## Panels you can swipe away & one back button (2.11)

| What | Where | Notes |
|---|---|---|
| ✕ and swipe-to-close | `components/Modals.jsx` (`swipeCloses()`), `.sheet-head` / `.sheet-x` in `index.css` | Every bottom sheet has a ✕ at the top right and a sticky handle. A pull of more than 110 px, or a flick faster than 0.55 px/ms (min 28 px), closes; less springs back. Locked sheets have neither. |
| Exit animation | `useUI.closeSheet()` (`closing`, `SHEET_OUT_MS` = 220) | A closing sheet slides down / fades, then leaves the stack — the same for ✕, swipe, backdrop, Back and `close()`. The Back button skips sheets already closing. |
| Workout check-in | `bwSheet()` in `sheets.jsx` | No longer locked: dismissing it starts nothing. |
| Back button | `BackButton` in `components/ui.jsx`, `goBack()` in `lib/nav.js` | History back when the router has an index > 0, else a per-screen fallback (`replace`). |

## Ideal body & theme categories (2.12)

| What | Where | Notes |
|---|---|---|
| Ideal-body maths | `lib/idealBody.js` (tests: `idealBody.test.js`) | Pure, in kg/cm. Healthy BMI 18.5–24.9 (22–27 from 65) ∩ NRC-by-age band → `idealKg`. `ideal` = mean of band mid and the 4 formulas, clamped to the band. Deurenberg body fat, Mifflin–St Jeor BMR × step-based activity, ±500/300 kcal, floors 1200/1500. |
| Screen | `views/IdealBody.jsx` (`/ideal`), `components/IdealChip.jsx` | State: `sex`, `birthYear` (from the age typed in), `waistCm`, `heightCm`. "Make it my goal" sets `targetW` (in the profile unit) and `targetFrom`. |
| Weight-chart band | `LineChart` `band` prop | Shaded `[lo, hi]` and clipped to the chart, so it never stretches the y-axis. |
| Theme categories | `lib/themes.js` `CATEGORIES`, `FAMILIES[].cat` | 12 categories, 94 families × 7 variants = 658 curated ids `<family>-<variant>`. |
| Theme Studio | `studioNumber` / `studioParams` / `studioTheme` | 360 hues × 10 strengths × 7 styles × 36 accents × 3 glows = 2,721,600. Saved as `g-<n>`. The accent lightness is solved for ≥ 3:1 on the background. Following the phone swaps the style for its light/dark counterpart. |
| Favourites | `S.themeFavs` (max 30) | Curated or `g-` ids. |

## Ideal-body plan, glass themes & a health log (3.0)

| What | Where | Notes |
|---|---|---|
| Ideal-body engine | `lib/idealBody.js` (tests: `idealBody.test.js`) | 8 methods: Devine, Robinson, Miller, Hamwi, Broca, Lorentz, BMI 22 and body-fat-based (today's lean mass ÷ (1 − healthy-fat mid)). `ideal` = (age band mid + mean of the first 6) / 2 × frame (±5 %, from wrist ÷ height), clamped to the band. US-Navy body fat when waist + neck (+ hips) are known, else Deurenberg. Composition: Boer lean mass, Lee skeletal muscle, Watson body water. Programmes: lose (TDEE − 500, floors 1200/1500), muscle (+250/300), keep. Macros 1.8/2.0/1.6 g protein per kg. |
| Adaptive calories & road | `adaptKcal`, `weightRoad`, `milestoneCrossed` | Pace over 4 weeks: stalled → −150 kcal, too fast → +200 (muscle: the other way). Road = weekly targets (on / behind / missed / future) and 25/50/75/100 % milestones. A weigh-in that crosses a milestone fires the full-screen `body` celebration. |
| Screen | `views/IdealBody.jsx` (`/ideal`) | Tabs Overview · Body · Plan · Compare. State: `neckCm`, `hipCm`, `wristCm`, `frame` ('auto'), `bodyGoal` ('auto' / lose / muscle / keep), `bodyPlan` `{ start, fromKg, toKg, weeklyKg }`. |
| Daily programmes | `lib/dailyPlan.js` `PROGRAM_WEEKS`, `programOf` | Muscle week = push / pull / legs / upper / lower in the gym (`gym: true`); the reminder says "Gym workout" and drops "no equipment". |
| Glass & minimal themes | `lib/themes.js` | 14 categories, 134 families, 938 curated ids. A family with `glass: true` gets see-through `--surface*` and a three-colour aurora glow; `applyTheme` sets `data-glass` = mode for the rim / blur rules. |
| Colour wheel, HEX, files | `components/ColorWheel.jsx`, `hexToHsl`, `nearestTheme`, `studioFromHex`, `exportThemes` / `parseThemes` | Disc = background hue × strength, ring = accent hue (10° steps). File: `{ kind: 'mahdi-jym-themes', version: 1, current, themes }`; import merges into My themes (unknown ids dropped). |
| Health log | `lib/health.js` (tests: `health.test.js`), `views/Health.jsx` (`/health`), `components/HealthCard.jsx` | `S.health[iso]` = `{ sleepH, sleepQ, mood, energy, stress, rhr, bp[], sugar[] }` (sugar stored in mg/dL, shown in `S.sugarUnit`). BP by ACC/AHA 2017 (crisis > 180/120 → red warning), sugar by ADA per context. `S.meds[]` + `S.medLog[iso]['id@HH:MM']`. |
| Medicine reminders | `lib/mobile.js` `syncMedReminders` | Local notifications on channel `mj_meds`, ids 7400–7459, daily repeat (`schedule.on`), tap → `/health`. Re-synced on every save and on start. |

## Workout sections, backups, accessibility & app lock (4.0)

- **Start** (the centre tab) opens `/start`: *Without equipment* and *With equipment*, each with
  categories (`/start/home/hiit`, `/start/gym/chest?eq=dumbbell` …), quick sessions and recent
  sessions. Categories are filters over the bundled exercise library, so it all works offline.
- **Backups & restore** (`/backups`): versions are files in the app's private storage
  (Capacitor Filesystem, `Directory.Data/snapshots`; IndexedDB in a browser), one automatic
  version a day. With Google Drive switched on they are also uploaded as
  `mahdi-jym-version-*.json` to the hidden app folder (`drive.appdata`), following the same "keep the newest" setting.
- **App lock**: the native `AppLock` plugin (`lock/AppLockPlugin.java`) uses
  `androidx.biometric` with `BIOMETRIC_WEAK | DEVICE_CREDENTIAL`, so fingerprint, face and the
  phone's PIN / pattern all work. The setting is per phone (`localStorage mj_lock`), never in
  synced data, so restoring a backup on another phone can't lock anyone out.
- **Accessibility**: text size uses CSS `zoom` on `<html>` (`--z` corrects viewport-height
  rules); high contrast and reduced motion are `data-contrast` / `data-motion` on `<html>`.

## App icons & splash screens

`frontend/resources/icon.svg` is the 1024×1024 source (the app's dumbbell glyph on the
app background). Generate all platform assets from it on a machine with the tooling:

```sh
cd frontend
npx @capacitor/assets generate --iconBackgroundColor '#0c0e12' --splashBackgroundColor '#0c0e12'
```

(If the generator won't take the SVG directly, export it to `resources/icon.png` at
1024×1024 first — any image tool can do it.)

## Distribution — deliberately no app stores

MAHDI-JYM's mobile app is not on the Play Store or App Store, and that's a choice: no store
accounts, no store rules, no yearly fees between you and an open-source app.

### Android — sideload the APK

The official signed APK is at **[GitHub Releases](https://github.com/m777m44/Heroes-Jym/releases)**
— direct link: <https://github.com/m777m44/Heroes-Jym/releases/latest/download/MAHDI-JYM.apk>,
and the light version at <https://github.com/m777m44/Heroes-Jym/releases/latest/download/MAHDI-JYM-online.apk>;
both are offered on **[the website](https://m777m44.github.io/Heroes-Jym/)**. Android asks you to allow installs
from the browser the first time — that's standard for any app outside the Play Store.

#### Built by CI

`.github/workflows/android-apk.yml` builds the APK on every push that touches `frontend/`
(download it from the run's *Artifacts*) and, for every `v*` tag, publishes it to a GitHub
Release as `MAHDI-JYM.apk` + `MAHDI-JYM-vX.Y.Z.apk` + `SHA256SUMS.txt`:

```sh
git tag v2.0.1 && git push origin v2.0.1     # → release with the signed APK a few minutes later
```

#### Signing

`app/build.gradle` signs the release build from environment variables (`MJ_KEYSTORE`,
`MJ_KEYSTORE_PASSWORD`, `MJ_KEY_ALIAS`, `MJ_KEY_PASSWORD`, `MJ_KEYSTORE_TYPE`); without them
the release APK is left unsigned, as before. In CI:

- **Repository secrets present** → `ANDROID_KEYSTORE_BASE64` (base64 of a `.jks`/`.p12`),
  `ANDROID_KEYSTORE_PASSWORD`, optional `ANDROID_KEY_ALIAS` (default `mahdi-jym`) and
  `ANDROID_KEY_PASSWORD` sign the build with your **private** key.
- **No secrets** → the committed public keystore `android/keystore/mahdi-jym-public.p12`
  signs it. Every build then shares one signature, so updates install over the old app, but
  since the key is public anyone could produce an APK Android would accept as an update.
  Fine for yourself and people who only install from the official release; switch to a
  private key before distributing widely.

Switching keys changes the signature: Android will refuse to update an app installed with the
old key. Export a backup (Settings → *Export backup (JSON)*), uninstall, install the new APK, import.

To build and sign your own locally:

```sh
cd frontend && MEDIA_DIR=../media npm run build:mobile:offline   # or build:mobile for a small CDN build
cd android && ./gradlew testReleaseUnitTest assembleRelease            # → app/build/outputs/apk/release/app-release-unsigned.apk

# one-time: create a keystore. KEEP IT — updates must be signed with the same key,
# or Android refuses to install the new version over the old one.
keytool -genkeypair -keystore my.keystore -alias mahdi-jym -keyalg RSA -validity 10950

# align + sign (zipalign/apksigner ship with the Android SDK build-tools)
zipalign -f -p 4 app-release-unsigned.apk aligned.apk
apksigner sign --ks my.keystore --ks-key-alias mahdi-jym --out MAHDI-JYM.apk aligned.apk
```

### iPhone — what's actually possible

Apple does not allow installing apps outside the App Store, so there is no `.ipa` download
that would simply install. Your free options:

- **Self-host + PWA** (recommended): open your instance in Safari → Share → *Add to Home
  Screen*. Full-screen app, no expiry, plus sync and passkeys.
- **Xcode free signing:** open `ios/` in Xcode with a free Apple ID as the team and run it
  onto your own iPhone. Apple expires the signature after 7 days; re-run from Xcode to renew.
- **AltStore:** automates that 7-day re-signing over Wi-Fi via a Mac companion app.

### Release notes for maintainers

- Bump `versionName`/`versionCode` in `android/app/build.gradle` per release; keep them in
  step with `frontend/package.json`. `versionCode` must strictly increase or updates won't
  install over an existing APK.
- **License:** MAHDI-JYM is AGPL-3.0, which by itself sits badly with app-store terms of
  service. `NOTICE.md` carries an app-store exception (an additional permission under
  AGPL §7) granted by the copyright holder — relevant only if store distribution ever happens.
- The app requests notification permission only when the workout-day reminder is switched
  on, and (on Android) declares `SCHEDULE_EXACT_ALARM` so the reminder fires to the minute
  where the user allows it.

## Google check & scale-linked workout (4.1)

| What | Where | Notes |
|---|---|---|
| Diagnostics | `GoogleAccountPlugin.diagnostics()` | Returns `package`, `sha1` (the installed APK's signing certificate, `GET_SIGNING_CERTIFICATES` on API 28+, else `GET_SIGNATURES`; colon-separated upper case), `play` / `playOk` (GoogleApiAvailability) and `email`. Shown on Settings → Backups → Google check (`views/Backups.jsx`). |
| Drive error detail | `lib/cloud.js` `drive()` / `getToken()` | Failures keep `code` + `raw`; a 403 *accessNotConfigured* / *SERVICE_DISABLED* becomes reason `setup`, code `API_DISABLED`. Stored as `driveCode` / `driveMsg` in `mj_cloud`, cleared once Drive works. Explained by `lib/googleErrors.js`. |
| Sign-in never fails after picking | `components/AccountSection.jsx` | `firstSync` errors fall back to Android Backup (`'backup'`) instead of a toast; Drive actions toast Google's explained reason. |
| Scale-linked plan | `lib/scaleWorkout.js` → `lib/dailyPlan.js` `planFor()` | Adds `scale`, `energy` (`S.energy[iso]`), `intensity`, `reasons`; sets ±1 by gap and energy. The 14-day reminder planner (`lib/dailyReminder.js`) carries the reason; `planSignature` includes the latest weight, `targetW`, `energy`, `bodyGoal`. |

## Calorie calculator & burn plan (4.2)

| What | Where | Notes |
|---|---|---|
| Calculator | `lib/calorieCalc.js`, `views/Calories.jsx` (`/calories`) | `calcCalorieGoal()` — 7700 kcal/kg, Mifflin-St Jeor, activity ×1.2/1.375/1.55/1.725, diet share ≤ 70%. Throws `{ key }` (a locale key) on bad input; returns `warnings[{ key, args }]`, `safeDays` (0.75 kg/week). Saved as `S.calGoal = { currentKg, targetKg, days, activity, dietShare, exerciseKcal, eatKcal, dailyDeficit, from }`; also sets `S.targetW`. |
| Burn plan | `lib/burnPlan.js`, `views/BurnPlan.jsx` (`/burn/home`, `/burn/gym`, `/burn/review`) | 8 + 8 activities with MET (kcal/min = MET·3.5·kg/200). `buildBurnPlan()` spreads the target over the picked exercises (3–60 min each). Saved as `S.burnPlan = { mode, keys, target, remind, start, gap, daily, from }`, rebuilt for the current weight. `burnTarget()` uses `S.calGoal.exerciseKcal` while the goal runs. |
| Burn reminders | `burnReminders()` → `lib/mobile.js` `syncReminder()` → `WorkoutReminder.java` | Item ids `1100 + day·10 + i`, notification slots `7600 + day·10 + i`, 7 days. Items carry `nid`, `later` (10 min), `laterLabel` and `skip`; `ACTION_SKIP` just dismisses. Scheduled even when the daily reminder is off. *Start* → `/burn/review?start=all\|<i>` (walking → `/walk`), which starts the session. Fallback: Capacitor local notifications (`extra.route`). |

## Ideal body for every age & "Your day" (7.1)

| What | Where | Notes |
|---|---|---|
| Children 2–17 | `lib/idealBody.js` `childBody()` | CDC BMI-for-age P5/P50/P85/P95 interpolated by age (`childBmiCurve`, `bmiPercentile`); Schofield BMR (`childBmr`); water by age (`childWaterMl`); Deurenberg child body fat. Under 13 no deficit (`growInto`), 13–17 −250 kcal / 0.25 kg a week. `MIN_AGE` 2, heights 70–250 cm. `planFor()` swaps gym days for the body-weight week under 16. |
| Pace & goal | `PACES`, `goalPlan(r, targetKg)`, `goalPlanOf(S)` | `S.bodyPace` slow / normal / fast. `foodGoalOf()` uses `goalPlanOf` when `S.targetW` is set and the programme is automatic. |
| Your day | `lib/daySchedule.js` → `components/body/DaySchedule.jsx`, Home `DayNext.jsx` | `S.day = { wake, sleep, workout: 'auto' \| 'HH:MM', remind }`. Meals 25/35/10/30 % of `foodGoalOf().kcal`, dishes from `kitchen.js`; water slots sum to the water goal (children: `r.waterMl`). |
| Day reminders | `lib/mobile.js` `syncDayReminders()` (store save + resume) | Capacitor local notifications, channel `mj_day`, ids **7500–7529**, daily repeating at each meal / workout / walk time, re-made when the day's dishes or workout change. Water keeps its own reminders. |


## Workout timer, Iraqi foods, your own food & the notification (7.2)

| What | Where | Notes |
|---|---|---|
| Start countdown | `components/workout/StartCountdown.jsx` (mounted in `App.jsx`), `sheets.jsx` `beginWorkout()` | 3 · 2 · 1 · GO over the screen with a ring, a tick beep + `tickHaptic()` each second and `workoutHaptic('go')` at GO. Tap to skip. Off in Settings → `S.workoutCountdown === false`. Reduced motion skips the animation. |
| Live workout clock | `components/workout/WorkoutClock.jsx` in `views/Workout.jsx`; `TabClock` in `components/TabBar.jsx` | Elapsed time (1 s), a sets ring, sets done and live kcal from `lib/workoutTimer.js` (`workoutKcalOn`, MET × 3.5 × kg / 200 × min, lifting MET 5 → 7 by cardio share, 4 h cap). The centre tab shows the same clock while a workout runs. |
| Finish | `FinishSummary` in `sheets.jsx`, `lib/celebrate.js` `workoutFanfare()`, `lib/hapticFeedback.js` `workoutHaptic('finish')` | A medium three-pulse vibration and a short brass-like major fanfare (Web Audio, offline), the full-screen celebration (kind `workout`), then an animated summary: duration, kcal, volume, sets, new PRs and the muscles trained. |
| Iraqi foods & fruits | `lib/foodDb.js` (block "7.2: Iraqi dishes, fruits and more") | 131 new foods → 313 in all: dolma, kubba of every kind, tashreeb, pacha, masgouf, quzi, tepsi, Iraqi breads, kahi & geymar, Iraqi sweets and drinks; pomegranate (half / whole / seeds / juice), mulberries, quince, Barhi dates and many more fruits. Names in 13 languages. |
| Your own food | `lib/foodEstimate.js` → `CustomFood` in `components/food/FoodSheets.jsx` | Three ways: **Smart** (type a name + grams → best database match per language, else the kitchen ingredients it mentions, else an energy-density guess; a confidence badge and "pick the closest"), **Ingredients** (pre-filled from the name, grams each, saved as a built meal) and **Manual** (kcal, or worked out from P/C/F). Saved with `saveCustomFood(s, {…, g, est})`. |
| Notification, collapsed | `res/layout/notif_live_small.xml`, `StepNotifier.fillLiveSmall()` | Three rings — steps, water, **food kcal** (orange when over) — each opens its screen (request codes 21 / 22 / 23), plus a quick +water button. |
| Notification, expanded | `notif_live_big.xml`, `StepNotifier.fillLive()` | Cards for steps / water / food, then a **macros strip** (protein, carbs, fat bars against their goals) and **net kcal** = eaten − steps kcal − workout kcal. While a workout runs the header shows a native `Chronometer` and "● Workout" in orange. JS sends `food: {day, eaten, goal, p, c, f, pg, cg, fg, wk}` and `workout: {start} \| null` in the service config. |
| Polish | `index.css` (7.2 block) | Spring press on buttons, a sheen on primary buttons, springy segmented controls and switches, the active tab pops, a pulsing start button while recording. All off under reduced motion. |

## Two apps side by side & updates inside the app (14.0)

| What | Where | Notes |
|---|---|---|
| Two apps | `android/app/build.gradle` (`productFlavors`), `android/app/src/online/res/values*/strings.xml`, `.github/workflows/android-apk.yml` | **offline** `io.github.m777m44.mahdijym` "MAHDI-JYM" (the id every earlier version had — it installs over them, data kept) and **online** `io.github.m777m44.mahdijym.online` "MAHDI-JYM Online" (`applicationIdSuffix`). Same code, signature and version code; Gradle tasks `assembleOfflineRelease` / `assembleOnlineRelease` (`testOfflineReleaseUnitTest` for the step maths). CI checks both ids and names with `aapt2 dump badging`. Each app has its own data — moving it: Settings → Data → Export backup / Import backup. "Sign in with Google" in the online app needs a second Android OAuth client for its package (docs/GOOGLE_SIGN_IN.md); the no-setup Drive file works in both. |
| Badged icons | `scripts/flavor-icons.sh` → `android/app/src/{offline,online}/res/mipmap-*` | The launcher icon with a blue **OFF** / green **WEB** pill in the bottom corner, kept inside the inscribed circle so no launcher mask cuts it (adaptive foreground, round and legacy icons, every density). Run the script again when the icon changes. |
| Updates inside the app | `lib/liveUpdate.js`, `components/LiveUpdate.jsx`, `App.jsx`, `main.jsx`, `scripts/build-site.sh`, `scripts/live-manifest.mjs` | GitHub Pages carries the online app's web bundle (`npm run build:online-web`, the same build the light APK has) at `/live/<version>/` and `/live/online.json` (`v`, `version`, `native`, `base`, `files: [[path, size, sha256]]`). The online app checks at most once every 20 h (and on *Check for updates*): newer and `native` ≤ the APK's level (`mjNative` in package.json → `__NATIVE_LEVEL__`, recorded as `mj_apk` whenever the APK's own version runs) → a card above the tab bar offers it. Files are verified by SHA-256 (unchanged ones copied from the running version), written to `files/live/<version>/`, then `WebView.setServerBasePath` reloads into them — same origin `https://localhost`, so localStorage, IndexedDB and the state file stay. `liveBoot` makes it permanent (`persistServerBasePath`) after the new version has run 4 s; a version closed sooner is switched to again (twice at most), one that never started is marked `mj_live_bad`. Installing an APK resets to its own version (Capacitor's new-binary check); *Go back to the built-in version* uses `setServerAssetPath('public')`. **Bump `mjNative` whenever the native side changes** (a plugin added or updated, new Java methods the web code calls) — older APKs are then sent to download the new APK instead. |
| Street food & the meal builder | `lib/foods/street.js`, `lib/mealBuilder.js`, `components/kitchen/MealBuilder.jsx`, `components/kitchen/IngPick.jsx` | 60 dishes built from parts (`BUILDS`: ingredient id + grams; 18 of them new) take their values from their ingredients (`withBuild` in `foods/index.js`), so the builder starts exactly at the food's values. 45 new kitchen ingredients and sodium for every ingredient (`itemsTotals().na`). A changed dish is logged with `mb: { n, x: [[kind, ingredient]] }` and named by `food.js builtLabel` in the current language. |

