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
| Notification | `StepNotifier.java`, `res/layout/notif_steps_*.xml` | The live card on the notification shade **and the lock screen**: steps / goal, a progress bar, a clock ticking in Baghdad time (or the device zone) with seconds, walking time, km, kcal, the countdown to midnight and a motivation line; **Pause / Resume** and **Open** buttons |
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
also offered on **[heroes-jym.com](https://heroes-jym.com)**. Android asks you to allow installs
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
