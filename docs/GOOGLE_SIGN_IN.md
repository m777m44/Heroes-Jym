# Sign in with Google: saving to the account (2.6, reworked in 2.8)

*تسجيل الدخول بحساب Google وحفظ كل البيانات في الحساب. خطوات الإعداد بالعربية في آخر الصفحة.*

The Android app can keep a copy of **everything** (workouts, plan, routines, steps, water,
body weight and settings) in the user's Google account. Progress photos stay on the phone.

> **2.8: signing in needs no setup any more.** The account chooser is Android's own, and saving
> works straight away through **Android Backup**. The Google Cloud setup below is optional: it
> switches saving to **Google Drive** (faster, within seconds), and the app picks this up by itself.
> Before 2.8, a missing setup showed *"Google sign-in isn't set up for this version of the app
> yet"* (error 10). That message no longer appears.

## Two ways of saving

| | **Android Backup** (always works) | **Google Drive** (after the setup below) |
|---|---|---|
| Setup | none | one Android OAuth client in Google Cloud |
| Where | Android's backup in the phone's Google account | hidden app-data folder in the account's Drive |
| When | Android uploads in the background, usually within a few hours | ~90 s after each change, and when the app goes to the background |
| Comes back | when MAHDI-JYM is installed again, or on a new phone with the same account (automatically, before the first screen) | on signing in on any phone |

- **How Android Backup works here:** `MjBackupAgent` is a key/value backup agent. It backs up
  one file, `files/mj-backup.json`, which the app rewrites after changes while signed in.
  - The phone needs *Backup by Google One* turned on (it is on by default on most phones).
  - Up to 5 MB, free.
  - On a fresh install, the app finds the restored file and takes it back before the
    first-launch question, signed in as before.
- **Choosing Drive or backup:** signing in tries Drive first.
  - If Google answers that the app isn't registered (error 10 / `UNREGISTERED_ON_API_CONSOLE`),
    or the user declines Drive access, saving goes through Android Backup.
  - Drive is retried quietly every 6 hours, never showing a screen. Once it works, the app
    switches to Drive by itself.
  - *Settings → Google account → Use Google Drive* retries right away.
- **While signed in,** the backup copy is kept up to date in both modes, as a second safety net.

## How it works for the user

1. **First launch** (before the permissions dialog), *Keep your progress safe* offers three
   choices:
   - **Continue with Google**: Android's account chooser opens and lists **the Google
     accounts already on the phone**. Pick one and you're signed in. No password, no typing,
     and no setup needed.
   - **Save on this phone**: nothing leaves the phone.
   - **Skip**: same as "on this phone"; you can sign in later.
2. If the account already has MAHDI-JYM data **and** the phone has some too, the app asks
   which copy to keep. If only one side has data, it is used without asking.
3. From then on every change is saved automatically, about 90 seconds after it happens and
   right away when the app goes to the background. A new phone signed in to the same account
   gets everything back.
4. **Settings → Google account** shows the account (photo, name, email) and when it was last
   saved. It also offers *Save now*, *Save automatically* (on/off), *Undo the last restore*
   (puts back what a download replaced), *Switch account* and *Sign out*.

Sync rules: if only the phone changed, it uploads. If only the account changed, it downloads.
If both changed, the newer copy wins. Whatever a download replaces is kept on the phone and
can be restored once.

## Where the data goes

Into **one file, `mahdi-jym-data.json`, in the account's Google Drive *app-data folder***.
This is a hidden folder that only MAHDI-JYM can read or write. The app uses the
`https://www.googleapis.com/auth/drive.appdata` scope, which **cannot see any of the user's
own Drive files**. The file does not count as a visible document. It is removed when the user
deletes the app's data under *Drive → Settings → Manage apps*.

There is no MAHDI-JYM server in between: the phone talks to Google directly.

## One-time setup in Google Cloud (owner of the app)

Google only hands out sign-ins to apps it knows. Without this setup, the button shows
*"Google sign-in isn't set up for this version of the app yet"* (error 10) and the data simply
stays on the phone. The app needs **no client ID or secret**: Android clients are matched by
package name + signing certificate.

1. Open <https://console.cloud.google.com/> and create a project (e.g. *MAHDI-JYM*).
2. **APIs & Services → Library → Google Drive API → Enable.**
3. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - App name *MAHDI-JYM*, support email, developer email; audience **External**.
   - **Data access → Add scope** `.../auth/drive.appdata` (a non-sensitive scope, so no
     verification is needed).
   - While the app is in **Testing**, add every Google account that should be able to sign in
     under **Audience → Test users** (up to 100). Choose **Publish app** to open it to everyone.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Android**:

   | Field | Value |
   |---|---|
   | Package name | `io.github.m777m44.mahdijym` |
   | SHA-1 certificate fingerprint | `8F:72:13:9B:43:D8:29:DA:2A:00:A3:2A:B6:A5:3C:90:20:C4:1D:76` |

   The SHA-1 belongs to `frontend/android/keystore/mahdi-jym-public.p12`, which the GitHub
   Actions APK build signs with (`CN=MAHDI-JYM, O=MAHDI-JYM, C=IQ`; SHA-256
   `73:57:F6:D6:ED:71:B6:22:0F:28:E0:B0:8B:BA:C6:5E:E0:EB:05:9B:C1:A3:42:4B:F2:78:15:F7:05:EA:F2:AE`).
   If you sign with your own key, add its SHA-1 as a second Android client:
   `keytool -list -v -keystore your.jks`.
5. Wait a few minutes, then on the phone: Settings → Google account → **Sign in with Google**.

> ⚠️ **About the public keystore.** The keystore in the repository is public, so anyone can
> sign an APK that Google accepts as "MAHDI-JYM". It still can't read anyone's data: each user
> still has to pick their own account and grant access on their own phone. But for a real public
> release, create a private keystore, keep it secret (GitHub Actions secrets), and register its
> SHA-1 instead.

### Errors you may see

| Message | Meaning |
|---|---|
| *isn't set up for this version* | Code 10/12500: the package + SHA-1 isn't registered, or the account isn't a test user |
| *Drive access wasn't allowed* | The user declined the Drive permission |
| *Google Play services aren't available* | A phone without Google services (some Huawei phones, emulators without Play) |
| *No connection to Google* | Offline. The next save happens automatically when back online |

## For developers

| Piece | Where |
|---|---|
| Native plugin `GoogleAccount` (`isAvailable`, `current`, `signIn`, `getToken`, `signOut`, `disconnect`) | `frontend/android/app/src/main/java/io/github/m777m44/mahdijym/account/GoogleAccountPlugin.java` |
| Drive app-data sync, rules, throttling, undo | `frontend/src/lib/cloud.js` (tested in `cloud.test.js`) |
| First-launch choice | `frontend/src/components/AccountGate.jsx` |
| Settings card | `frontend/src/components/AccountSection.jsx` |

Uses `com.google.android.gms:play-services-auth` (Google Sign-In + `GoogleAuthUtil` for the
access token); no other dependencies. The web/self-hosted build keeps its own account system
(passkeys + server sync) and does not show these screens.

---

## الإعداد بالعربية (مرة واحدة، لصاحب التطبيق)

> **منذ 2.8 هذا الإعداد اختياري.** تسجيل الدخول يعمل دون أي إعداد عبر نافذة حسابات أندرويد نفسها،
> والحفظ يتم مباشرةً عبر **النسخ الاحتياطي لأندرويد** في حساب Google. هذا الإعداد يضيف فقط الحفظ
> في **Google Drive** (أسرع، خلال ثوانٍ)، والتطبيق ينتقل إليه تلقائيًا بعد إتمامه.


1. افتح <https://console.cloud.google.com/> وأنشئ مشروعًا باسم **MAHDI-JYM**.
2. **APIs & Services → Library → Google Drive API → Enable** (فعّل Google Drive API).
3. **OAuth consent screen**: اسم التطبيق MAHDI-JYM، بريدك، النوع **External**. أضف النطاق
   `drive.appdata` (نطاق غير حساس، فلا يحتاج مراجعة من Google). ما دام التطبيق في وضع
   **Testing**، أضف الحسابات التي ستسجّل الدخول في **Test users**، أو اضغط **Publish app** ليعمل للجميع.
4. **Credentials → Create credentials → OAuth client ID → Android**:
   - Package name: `io.github.m777m44.mahdijym`
   - SHA-1: `8F:72:13:9B:43:D8:29:DA:2A:00:A3:2A:B6:A5:3C:90:20:C4:1D:76`
5. انتظر بضع دقائق، ثم من الهاتف: الإعدادات ← حساب Google ← **تسجيل الدخول باستخدام Google**.

لا يحتاج التطبيق أي Client ID أو كلمة سر داخل الكود. Google يتعرّف عليه من اسم الحزمة وبصمة التوقيع.
