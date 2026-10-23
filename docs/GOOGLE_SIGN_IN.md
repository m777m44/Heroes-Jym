# Sign in with Google: saving to the account (2.6, reworked in 2.8 and 8.0)

*تسجيل الدخول بحساب Google وحفظ كل البيانات في الحساب. خطوات الإعداد بالعربية في آخر الصفحة.*

> **8.0: Google Drive with no setup.** The app can now save to **a real file in the user's own
> Google Drive**, chosen once in Android's file picker — no Google Cloud project, no OAuth client,
> no Drive API. This is the recommended way to keep data in Google Drive. See
> [Google Drive — no setup](#google-drive--no-setup-80) below. The web/self-hosted app can also
> offer **Sign in with Google** — see [Sign in with Google on the web](#sign-in-with-google-on-the-web-self-hosted-80).

## Google Drive — no setup (8.0)

| | |
|---|---|
| Setup | **none** — works on every Android phone with the Google Drive app |
| Where | one file, `MAHDI-JYM-backup.json`, wherever the user saves it (normally their Google Drive) |
| When | a few seconds after each change (and when the app goes to the background); the Drive app uploads it |
| Comes back | on a new phone: first screen → **Restore from Google Drive** → pick the file |
| Sign-in | not required — works signed in to Google or not |

How it works:

1. **Choosing the file.** After *Continue with Google* (when the Drive API isn't set up) the app
   offers *Save to your Google Drive too*; it is also in **Settings → Google account / Your data**
   and **Backups & restore**. Android's own file picker opens with the name filled in:
   **☰ → Drive → Save**. If the Google Drive app isn't installed, the app says so and links to it.
2. **Saving.** The app keeps a *persistable* permission for that one document (Storage Access
   Framework). It can read and write **only that file** — nothing else in the user's Drive. Every
   change is written a moment later (mode `wt`; providers without truncation get a padded write
   that the reader trims). The Google Drive app uploads it in the background.
3. **Restoring.** *Restore from Google Drive* opens the picker in "open" mode. A MAHDI-JYM file is
   restored straight away on an empty phone; if the phone has data too, the app asks which to
   keep and **writes nothing until the user chooses**. A file that isn't MAHDI-JYM data is never
   touched. The phone's previous data is kept and can be put back once (*Undo the last restore*).
4. **Several phones.** When another phone wrote the file since (its last-modified moved and its
   data is newer than what this phone last wrote), the file's data is taken in — unless this
   phone has newer changes of its own, which then win. As with Drive sync, the newer copy wins.
5. **Things that can go wrong** are shown in plain words in Settings:
   - *MAHDI-JYM may no longer write to the file* (a reinstall drops the permission — the file
     name is remembered through Android Backup, so Settings offers **Reconnect Google Drive**);
   - *The file is gone* (deleted or moved — choose it again or make a new one);
   - a passing error (offline, provider busy) is retried automatically on the next round.

The file format is the same JSON the app exports (`{ app, v, kind, savedAt, S }`); a plain
*Export backup* file can also be picked to restore.

| Piece | Where |
|---|---|
| Native plugin `DriveFile` (`pick`, `info`, `write`, `read`, `unlink`, `driveApp`) | `frontend/android/app/src/main/java/io/github/m777m44/mahdijym/account/DriveFilePlugin.java` (+ `DriveFileMath`, tested in `DriveFileMathTest`) |
| JS wrapper, file parsing | `frontend/src/lib/driveFile.js` |
| Linking, rounds, conflicts, choice, undo | `frontend/src/lib/cloud.js` (tested in `cloudFile.test.js`) |
| Picker hint, rows, flows | `frontend/src/components/DriveFileUI.jsx` |

## Sign in with Google on the web (self-hosted, 8.0)

The web app's own accounts are passkeys. An instance can **also** offer Google's official
*Sign in with Google* button:

1. Google Cloud → **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application**. Under **Authorized JavaScript origins** add your `ORIGIN`
   (e.g. `https://gym.example.com`; `http://localhost:8080` for local testing).
2. Put the client ID in `.env`: `GOOGLE_CLIENT_ID=…apps.googleusercontent.com`, then
   `docker compose up -d`. No client secret is needed.
3. The login screen now shows **Sign in with Google** above the passkey buttons, and
   **Settings → Account** can **link** Google to an existing passkey profile (or unlink it, as long
   as a passkey remains to sign in with).

What the server does (`api/google.js`): the browser gets an ID token from Google Identity Services
and posts it to `POST /api/google/login`. The server checks the RS256 signature against Google's
published keys (cached per their `Cache-Control`, refetched once on an unknown key id), the
audience (= `GOOGLE_CLIENT_ID`), the issuer, the expiry (±5 min) and a verified email — with
`node:crypto` only. The profile is found by the Google account's stable `sub`; the first sign-in
creates one (data already in the browser moves into it, `INVITE_ONLY` still asks for a code). Then
the usual session cookie is set. Without `GOOGLE_CLIENT_ID` there are no Google routes and the
button never appears — and the browser never loads anything from Google.

---

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

### The Google check (4.1) — read the real SHA-1 from the phone

**Settings → Backups & restore → Google check** shows what Google actually compares:

- the **package name** and the **SHA-1 of the installed APK**, read from the phone itself (tap to
  copy). If it differs from the release key above, the app was built with another key —
  register *that* SHA-1;
- whether **Google Play services** work;
- the **last answer from Google** (code + Google's own message) with what it means and what to do;
- **Test Google Drive** — tries again right away (and asks for the Drive permission if needed).

Signing in itself never fails once an account is picked: if Drive can't be used yet, saving
goes through Android Backup, and the app retries Drive by itself every 6 hours.

### Errors you may see

| Code | Shown as | What to do |
|---|---|---|
| `10` / `12500` / `UNREGISTERED_ON_API_CONSOLE` / `INVALID_AUDIENCE` | *Google doesn't know this app yet* | Create an **Android** OAuth client with exactly the package name + SHA-1 from the Google check. Wait ~5 minutes |
| `API_DISABLED` (HTTP 403 *accessNotConfigured* / *SERVICE_DISABLED*) | *The Google Drive API is switched off* | APIs & Services → Library → Google Drive API → Enable |
| `CONSENT` | *Access to Google Drive wasn't allowed* | Tap Test Google Drive → Allow. In Testing mode the account must be a test user |
| `HTTP_403` / `AUTH` / `16` | *Google refused access for this account* | Consent screen: External, the account as a test user, scope `…/auth/drive.appdata` |
| `7` / network | *No connection to Google* | Offline — the next save happens automatically |
| `12501` / user cancelled | nothing | The user closed the account picker |
| `UNAVAILABLE` | *Google Play services aren't available* | A phone without Google services (some Huawei phones, emulators without Play) |

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

## Google Drive بدون أي إعداد (8.0)

منذ 8.0 يستطيع التطبيق الحفظ في **ملف حقيقي داخل Google Drive الخاص بك** — دون مشروع Google Cloud ودون أي Client ID:

1. بعد «المتابعة باستخدام Google» (أو من الإعدادات ← حساب Google، أو من النسخ الاحتياطية والاستعادة) اختر **«اختر Google Drive»**.
2. في النافذة التي تظهر: **☰ (القائمة) ← Drive ← حفظ**. يُنشأ الملف `MAHDI-JYM-backup.json`.
3. من الآن يُكتب كل تغيير في هذا الملف بعد لحظات، ويرفعه تطبيق Google Drive. يعمل مع تسجيل الدخول أو بدونه.
4. **على هاتف جديد:** في أول شاشة اختر **«الاستعادة من Google Drive»** ثم اختر الملف — فتعود كل بياناتك.
   إن كان على الهاتف بيانات أيضًا يسألك التطبيق أيّها تريد، ولا يكتب شيئًا قبل اختيارك.
5. بعد إعادة تثبيت التطبيق يُطلب منك فقط **«أعد ربط Google Drive»** واختيار الملف نفسه مرة أخرى.

## تسجيل الدخول بحساب Google على الويب (للخوادم الخاصة، 8.0)

أنشئ في Google Cloud معرّف **OAuth client ID** من نوع **Web application**، وأضف عنوان موقعك (`ORIGIN`) في
**Authorized JavaScript origins**، ثم ضع المعرّف في ملف `.env`:
`GOOGLE_CLIENT_ID=...apps.googleusercontent.com`. يظهر بعدها زر **«تسجيل الدخول باستخدام Google»** في شاشة الدخول،
ويتحقق الخادم بنفسه من توقيع Google. لا حاجة لأي كلمة سر.

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

### فحص Google (4.1)

الإعدادات ← النسخ الاحتياطي والاستعادة ← **فحص Google**: يعرض اسم الحزمة وبصمة **SHA-1 للنسخة المثبّتة فعلًا**
(اضغط للنسخ)، وحالة خدمات Google Play، وآخر رد من Google مع شرح بالعربية وماذا تفعل، وزر **اختبار Google Drive**.
تسجيل الدخول نفسه لا يفشل بعد اختيار الحساب: إن لم يعمل Drive بعد فالحفظ يتم عبر نسخ Android الاحتياطي،
ويعيد التطبيق المحاولة مع Drive تلقائيًا كل 6 ساعات.

## Versions in Drive (4.0)

From 4.0 the app also keeps **versions** — full copies you can restore — in
**Settings → Data → Backups & restore**. They are always saved on the phone (one a day, plus
"Save a version now"). Once Google Drive works for the app (the setup above), the daily version is
also uploaded to the hidden app folder in Drive and listed under *In Google Drive* (same "keep the newest" setting),
each with restore and delete. Until then the screen says Drive isn't switched on yet and shows
the same steps as below, with the package name and SHA-1 ready to copy; tap **Try again** about
five minutes after finishing them — no new app version is needed.

### النسخ في Google Drive (4.0)

ابتداءً من 4.0 يحتفظ التطبيق بـ **نسخ** كاملة من بياناتك يمكنك استعادتها من
**الإعدادات ← البيانات ← النسخ الاحتياطية والاستعادة**:

1. تُحفظ نسخة تلقائيًا مرة يوميًا على الهاتف (عند حدوث أي تغيير)، ويمكنك حفظ نسخة في أي وقت بزر «احفظ نسخة الآن».
2. تختار الاحتفاظ بأحدث 3 أو 7 أو 14 نسخة، وعند الاستعادة تُحفظ بياناتك الحالية أولًا باسم «قبل الاستعادة» فيمكنك التراجع.
3. بعد إكمال خطوات الإعداد بالعربية أعلاه (مرة واحدة فقط)، انتظر نحو 5 دقائق ثم اضغط «حاول مجددًا» في الشاشة نفسها — لا تحتاج نسخة جديدة من التطبيق.
4. بعدها تُرفع النسخة اليومية أيضًا إلى مجلد التطبيق المخفي في Google Drive (بنفس عدد النسخ المختار)، وتظهر تحت «في Google Drive» مع الاستعادة والحذف.
5. حتى ذلك الحين لا يضيع شيء: تُحفظ بياناتك عبر النسخ الاحتياطي لأندرويد، والنسخ على الهاتف تعمل دائمًا.
