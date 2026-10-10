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
| Exercise media | served by your server (`img/`, `gif/`) | loaded from the jsDelivr CDN |

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
npm run build:mobile        # VITE_MOBILE build + `cap sync` into android/ and ios/

npx cap open android        # opens Android Studio → run on emulator or device
npx cap open ios            # opens Xcode (Mac only) → set your signing team, then run
```

`npm run build:mobile` bakes the CDN media base into the bundle and copies the web build
into both native projects — re-run it after every web-code change before building natively.

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

- **Android** counts in the step sensor while the app sleeps; the steps arrive the next time
  MAHDI-JYM reads it. Some vendors (Xiaomi, Huawei, Samsung "deep sleep") kill background
  apps aggressively — exclude MAHDI-JYM from battery optimisation if counts lag.
- **iOS** has no ongoing notifications and no background sensor stream for third-party apps;
  when you open the app, today's total is filled in from the CoreMotion history.
- **Reminders** are scheduled as dated notifications 14 days ahead and rescheduled whenever
  the app opens or the plan changes, so open the app at least once every two weeks.

After pulling 2.0 into an existing native project, run `npx cap sync` once so Gradle and
CocoaPods pick up the two new plugins.

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
cd frontend && npm run build:mobile
cd android && ./gradlew assembleRelease            # → app/build/outputs/apk/release/app-release-unsigned.apk

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
