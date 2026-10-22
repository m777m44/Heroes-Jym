# Changelog

All notable changes to **MAHDI-JYM**. Versions follow [semver](https://semver.org/).
History before 2.0.0 is the upstream openGym project's, kept below unchanged.

## v5.0.0 — 2026-10-22

**A food & calorie log with an offline database of Iraqi and Arab dishes, linked to the calorie
calculator — and a redesigned notification with elegant progress rings for steps and water.**
*سجل طعام وسعرات مع قاعدة أكلات عراقية وعربية تعمل بدون إنترنت، مربوط بحاسبة السعرات — وإشعار جديد بحلقات تقدّم أنيقة للخطوات والماء.*

### 🍽️ Food log (Home → Food card, or Calorie calculator → Food log)
- **118 foods, offline**, in 10 categories: home dishes (dolma, kubba, quzi, tashreeb, masgouf,
  pacha, kahi with geymar…), bread & grains, meat/chicken/fish, eggs & dairy, vegetables, fruit,
  legumes & nuts, fast food, sweets and drinks — each with kcal, protein, carbs and fat for a usual
  serving (plate, piece, glass…), all names translated into the 12 languages.
- **Four meals** — breakfast, lunch, dinner, snacks; the meal is picked from the time of day.
- **Search that understands Arabic spelling** (with or without diacritics, ة/ه, أ/ا, ى/ي), plus
  Recent, All, ★ Favourites, My foods and category chips.
- **Amounts** from 0.5 to 20 servings with quick ×0.5 … ×3 chips and the totals as you change them;
  tap an entry to change the amount or meal, or remove it.
- **Quick calories** (a number from a label or menu) and **Create a food** (your own, per serving,
  with macros — editable and shown in search and under My foods).
- **Daily goal**, automatic: the calorie calculator's *eat* number while that goal runs → your
  Ideal body calories → 2,000; or set your own (±50). The screen shows where it comes from.
- **Summary ring** (green, orange over 100%, red over 110%) with Goal / Eaten / Left, **macro bars**
  against your protein / carbs / fat targets, a **7-day chart** with the average, and a streak.
- **Honest pointers**: over the goal (with how long a brisk walk burns it), low protein in the
  evening, fat over 40%, sweets and sugary drinks adding up.
- **Copy from the day before** in one tap; browse past days.
- **Home card**: the ring, kcal per meal (tap to add to that meal), *Add to {meal}* — it can be
  hidden from the Food screen (*Show on Home*).
- Part of the normal app data, so backups, phone storage and Drive carry it.

### 🔔 Notification: progress rings
- The one merged notification now shows **two rings side by side — steps and water** — with big
  numbers, the goal under each, and the ring turning **gold** when the steps goal is reached and
  **blue-check** when the water goal is.
- Kcal burned, distance and active time with small icons, and **today's food (eaten / goal)**.
- **Quick water buttons** stay right in the notification (add, undo, container).
- **Collapsed: one tidy line** — two mini rings with steps and water.
- The water-only panel uses the same rings.

### 🧹 Fixes & polish
- Amounts below half a serving no longer jump to 1 serving.
- 32 lint problems in older code cleaned up (unused variables / parameters) — 0 errors.
- Demo data includes a week of meals.
- Tests: 527 (food log, search, goals, insights, render and Arabic-only checks for the new
  screens and sheets). 12 locales × 2,407 keys.

## v4.2.0 — 2026-10-19

**An interactive daily plan and a calorie calculator: choose how you train today, see how many
calories you need to burn to reach your target weight, and get a burn plan whose exercises each
remind you at their own time.**
*خطة يومية تفاعلية وحاسبة سعرات: اختر طريقة تمرينك اليوم، واعرف كم سعرة تحتاج أن تحرق لتصل إلى وزنك المستهدف، واحصل على خطة حرق يذكّرك كل تمرين فيها في وقته.*

### ▶️ Start today's workout
- The Home button now shows **how long and how many calories** (e.g. "35 min · ≈ 280 kcal") and
  opens the choice instead of starting straight away: **🏠 Without equipment** or **🏋️ With
  equipment**, with today's plan on top. A workout already running opens directly. The
  reminder's *Start* button still starts today's plan right away.
- Each section now starts with a **burn plan** card showing today's calorie target.

### 🧮 Calorie calculator (Ideal body → Calorie calculator, or from the burn plan)
- Enter your **current weight, target weight and number of days**. Height, age and sex come from
  your profile and can be changed there, and the activity level is guessed from your steps.
- **7,700 kcal per kg**, resting burn by **Mifflin-St Jeor**, daily use by activity level
  (×1.2 / 1.375 / 1.55 / 1.725).
- Results, updated as you type: the **daily deficit**, **kcal to burn from exercise**, **kcal to
  eat a day**, **weekly loss**, what your body uses and the total.
- **Food or exercise slider**: how much of the deficit comes from eating less (up to 70%); the
  rest comes from training.
- **Honest warnings**: over 1,000 kcal a day from exercise, a deficit above half of what you use,
  over 1 kg a week or 0.5 kg a day, or eating below your resting burn / 1,200–1,500 kcal. Each
  one comes with the **healthy number of days** (0.75 kg a week).
- **Save as my goal** keeps it (day *n* of *N*, and it also sets your target weight). While it
  runs, the goal's exercise kcal is the daily burn target everywhere.
- Clear Arabic error messages for an impossible target, height or age.

### 🔥 Burn plan
- **8 home exercises** (running, brisk walking, abs, burpees, push-ups, squats, yoga, jumping
  jacks) and **8 gym exercises** (bench press, deadlift, squat, leg press, rows, shoulder press,
  lat pulldown, biceps curls), each with its kcal per minute **for your weight** (MET).
- Pick several, then **Build my plan**: the minutes are shared out so the total hits the day's
  target (3–60 min each), with a note when it runs over 2 hours.
- **The plan**: every exercise with minutes, kcal and its time; **Start now** (all of them, or a
  single exercise), tap an icon for the exercise's details, **Change exercises** (the target can
  be adjusted on the picking screen). It is saved and rebuilt when your weight changes. Brisk walking opens the step counter.
- **Reminders for each exercise at its own time**: start time (18:00 by default) and the gap
  between exercises (all together / 30 min / 1 h / 2 h), every day or today only, 7 days ahead.
  The buttons are **Start now**, **In 10 min** and **Skip**, and they work from the notification. Days
  you already trained are skipped. Notification permission is asked first, with a clear message
  if it's off.

### Also
- New **calculator** and **apple** icons; RTL, dark/light and theme colours throughout.
- 105 new strings in all 13 languages.
- Tests: calorie formulas, warnings and errors, plan sizing, reminder times and IDs, screen
  render, and the Arabic UI check for the new screens (509 tests).

## v4.1.0 — 2026-10-17

**Google sign-in that never ends in "didn't work", a Google check that shows exactly what Google
compares and what it answered, and today's workout linked to your scale.**
*تسجيل دخول Google لا ينتهي أبدًا بـ«لم ينجح»، فحص Google يعرض بالضبط ما يقارنه Google وما ردّ به، وتمرين اليوم مربوط بميزانك.*

### Google sign-in & Drive
- **Signing in can't fail any more once you pick an account.** If Google Drive can't be used yet,
  everything is saved to your account through Android Backup, and the app quietly tries Drive
  again every 6 hours. Settings → Account no longer shows "Google sign-in didn't work".
- **Google check** (Settings → Backups & restore): the package name and the **SHA-1 of the
  installed app**, read from the phone (tap to copy) — with a warning when it isn't the release
  key — Google Play services, Drive's status, and **Google's last answer** with its code, what it
  means and what to do. **Test Google Drive** tries again on the spot.
- **Every Google answer explained** in all 13 languages: app not registered (10 / 12500 /
  UNREGISTERED), Drive API switched off (403 accessNotConfigured), permission not allowed,
  account not a test user (403 / AUTH), no connection, no Google Play services.
- "Use Google Drive" and "Save now" show Google's real reason instead of a generic error.
- The setup guide uses the SHA-1 of the app you're running and says plainly: only an **Android**
  OAuth client is needed — no Web client ID, no new app version.
- Saving keeps happening on its own: a few seconds after opening, after changes, and when the app
  goes to the background (with a daily version in Drive).

### Today's workout, linked to your scale
- Today's plan on Home now compares your **latest weigh-in** with your **ideal weight** (from your
  height and age) and your **target weight**: lose / gain / keep, and how big the gap is
  (over 15 kg big, over 5 kg medium).
- **Why today looks like this** — e.g. "You are 12.4 kg above your ideal weight — today is built
  to burn more calories" — and a nudge to weigh in when the last weigh-in is over a week old.
- **Intensity** (very light → hard) from the kind of day, the gap and **how you feel today**:
  tap 😴 Tired / 🙂 Normal / ⚡ Full of energy. Tired days get one set less per exercise; a big
  fat-loss gap or lots of energy, one more (never on recovery days or your own routines).
- **Remind me at …** — one tap sets the daily workout reminder to your usual training time
  (from your last workouts, else 18:00). Reminders are planned **two weeks ahead** and each one
  now says why ("⚖️ …") along with the exercises, steps, water and calories.
- Reminders re-plan by themselves when your weight, target or energy changes.

## v4.0.0 — 2026-10-17

**Two ways to start a workout (without / with equipment), versioned backups you can go back
to, a smoother colour wheel with colour tools, 56 new theme families, and accessibility:
text size, high contrast, reduced motion — plus a fingerprint / PIN lock for the app.**
*طريقتان لبدء التمرين (بدون معدّات / بالمعدّات)، نسخ احتياطية بإصدارات يمكنك الرجوع إليها، عجلة ألوان أنعم مع أدوات الألوان، 56 عائلة ثيمات جديدة، وسهولة استخدام: حجم الخط، تباين عالٍ، تقليل الحركة — مع قفل التطبيق بالبصمة أو الرمز.*

### Start your workout
- The centre **Start** button opens a new screen with two big cards: **Without equipment**
  (at home, 325 exercises) and **With equipment** (at the gym, 999 exercises), above today's
  workout from your plan and a suggestion for today from your goal.
- **Without equipment:** HIIT, cardio, abs & core, upper body, lower body, full body,
  running & walking (with a shortcut to the step counter) and stretching & yoga.
- **With equipment:** chest, back, legs, shoulders, biceps, triceps, core and full body, with an
  **equipment filter** (barbell, dumbbells, cable, machines, kettlebell, bands, balls & more).
- Every category has a **quick session** (4 / 6 / 8 exercises; staples like push-ups, squats,
  bench press and rows lead, spread over the muscles; tap shuffle for another set), sensible
  sets and reps for the kind of training, an estimated time, and a full list to **pick your
  own** (up to 15). Your **recent sessions** sit on the start screen, one tap to do again.

### Backups & restore (Settings → Data, or Account)
- **Versions of your data:** a full copy is saved **once a day** when something changed, and
  whenever you tap **Save a version now**. Keep the newest 3, 7 (default) or 14; your own
  saves are kept apart. **Restore** any version — what you have now is saved first as
  "Before a restore", so a restore can always be undone — or **delete** it.
- When Google Drive is switched on for the app, the daily version is also uploaded to the
  private app folder in Drive (the same number kept), listed on the same screen with restore and
  delete; syncing retries by itself when the connection comes back.
- A clear status card shows where your account copy goes (this phone only / Google Drive /
  Android Backup), and a step-by-step guide explains the one-time Google Cloud setup that
  switches Drive on, with the package name and SHA-1 to copy.

### Colour wheel & themes
- The Theme Studio's wheel is painted once and redrawn at most once per frame, so dragging is
  smooth on mid-range phones, with a live read-out; arrow keys and [ ] work on a keyboard.
- New colour tools under the wheel: the theme's real colours with **HEX / RGB / HSL to copy**,
  a gradient preview, **colour harmonies** for the accent (complementary, split complementary,
  triadic, analogous, monochrome) and your **recent colours**.
- **56 new theme families** (392 themes) in two new categories, **MAHDI Signature** and
  **Coder classics** (Dracula, Nord, Tokyo Night, Gruvbox, Solarized, Monokai, One Dark…), and
  new members of the existing ones (glass, neon, nature, royal, light…). 16 categories,
  1,330 curated themes, 2,722,930 in all.

### Accessibility & security
- **Settings → Accessibility:** text size (Small / Normal / Large / Largest — the whole
  interface scales), **high contrast** (stronger text, separators and outlines) and **reduce
  motion** (no animations or confetti; the phone's own setting is always followed too).
- **Settings → Security** (Android): **lock the app with your fingerprint, face or the phone's
  PIN**, after it was away right away / 1 / 5 / 15 minutes. It uses the phone's own screen
  lock — the app never sees your fingerprint — and the phone's PIN always works. If the
  phone's screen lock is removed, the app lock turns itself off instead of locking you out.
- Screens open faster: the less-used ones load on demand.

### Under the hood
- `lib/workoutCategories.js`, `lib/backups.js` (IndexedDB / Capacitor files, a daily
  auto-version), Drive versions in `lib/cloud.js`, `lib/a11y.js`, `lib/appLock.js` with a new
  native `AppLock` plugin (androidx.biometric), `lib/colorTools.js`.
- 477 frontend tests (new: workout sections, backups, accessibility / lock timing, smoke tests
  for the new screens), 12 locales × 2,044 keys in sync. Android versionCode 20.

## v3.0.0 — 2026-10-17

**A full body plan: your ideal weight from 8 methods, what your body is made of, calories
and macros that adapt, a week-by-week road with milestones, workouts by goal and a
comparison dashboard. Plus 40 new themes with glass styles, a colour wheel, theme files,
and a private health log with medicine reminders.**
*خطة جسم كاملة: وزنك المثالي من 8 طرق، مكوّنات جسمك، سعرات وماكروز تتكيّف، طريق أسبوعي بمحطات إنجاز، تمارين حسب هدفك ولوحة مقارنة. مع 40 ثيم جديد بأنماط زجاجية، عجلة ألوان، ملفات ثيمات، وسجل صحي خاص مع تذكير الأدوية.*

### 🧍 Ideal body, now in four tabs: Overview · Body · Plan · Compare
- **8 ways to work out your ideal weight:** Devine, Robinson, Miller, Hamwi, Broca, Lorentz,
  BMI 22 and one based on body fat. Each is drawn against your healthy range. Your ideal
  weight blends them with the age-adjusted BMI range and adjusts ±5% for your **frame size**
  (small / medium / large, worked out from your wrist or picked by you).
- **What your body is made of:** fat, lean mass, skeletal muscle and body water, in kg and
  %, with a colour bar. Body fat uses the **US-Navy tape method** once you add your neck
  (and hips for women), otherwise the estimate from BMI and age. Both are shown.
- **Your programme:** lose fat, build muscle or keep your weight. It is chosen for you, or
  you pick it.
- **Calories and macros:** protein, carbs and fat in grams and %. **Calories adapt**: if your
  weight stalls for weeks the plan trims 150 kcal; if you lose too fast it adds 200 back
  (never below a safe floor).
- **Your road, week by week:** "Make it my goal" starts a plan from today's weight, with a
  target for every week (on track ✓, behind ↑, missed), 25 / 50 / 75 / 100% milestones, and
  a **full-screen celebration** when a weigh-in reaches one.
- **Workouts by goal:**
  - **Lose fat:** home workouts, HIIT and walking, as before.
  - **Build muscle:** a gym week of Push / Pull / Legs / Upper / Lower with real gym
    exercises and muscle-building tips. The reminder says "Gym workout".
  - **Keep my weight:** a mix of strength, walking and recovery.
  - Your training week is shown in the Plan tab.
- **Compare:** now vs before, your ideal, your goal, body fat, muscle and BMI side by side,
  a progress bar from your start to your goal, and the weight chart with the ideal band and
  goal line.

### 🎨 Themes: 40 more, glass styles, a colour wheel and theme files
- **40 new families** (280 themes) in two new categories, **Glass style** (10, with
  see-through cards over a soft aurora) and **Minimal** (8), plus new Dark, Light, Neon and
  Nature families. That makes 938 curated themes in 14 categories, and **2,722,538** in all.
- **Colour wheel** in the Theme Studio: drag inside for the background colour and strength,
  and on the ring for the accent.
- **Your own colour (HEX):** type or pick a colour to build a Studio theme around it, and see
  the closest ready-made theme.
- **Theme file:** export My themes and the current theme as a small JSON file, or import one
  from a friend or another phone.

### ❤️ Health log (new: Settings → Health log, or the card on Home)
- Every day: **mood, energy, stress** (1–5), **sleep** hours and quality, **resting heart
  rate**, **blood pressure** readings and **blood sugar** readings (fasting / after a meal /
  any time, in mg/dL or mmol/L).
- Readings are coloured by the official ranges: blood pressure by the American Heart
  Association, blood sugar by the American Diabetes Association.
  - A **red warning** appears for a blood-pressure crisis (over 180 / 120).
  - An orange one appears for low sugar.
- **Medicines & vitamins:** name, dose and up to 6 times a day. Tick off each dose, and get a
  **reminder notification** at each time, even when the app is closed. Tap the reminder to
  open the log.
- **Trends** over 7 or 30 days: averages, doses taken %, and charts for sleep, mood, blood
  pressure, heart rate and sugar. Move between days with ‹ ›.
- Private: it stays on the phone (and in your own backup). It is not a diagnosis.

### 🌍 Everything in 12 languages
- 268 new strings, all translated (1,824 keys per language). The Arabic UI guard now also
  checks the health log, every Ideal body tab and the new sheets.

## v2.12.0 — 2026-10-17

**Your ideal body by height, age and sex, and more than 2.7 million themes, sorted into
categories: Golden, Royal, Premium, Dark, Light and more, plus a Theme Studio.**
*جسمك المثالي حسب الطول والعمر والجنس، وأكثر من 2.7 مليون ثيم مقسّمة إلى فئات: الذهبي، الملكي، المتميز، الداكن، الفاتح وغيرها، مع استوديو الثيمات.*

### 🧍 Ideal body (new screen: Settings → Ideal body, or the line under any weight card)
- **Your ideal weight** worked out from your **height, age and sex**. It combines the
  age-adjusted BMI range (WHO, plus the US NRC table by age) with the four classic formulas
  (Devine, Robinson, Miller, Hamwi), and it always stays inside the healthy range for your
  height and the ideal range for your age.
- **Is your weight right for your height?** You get a BMI gauge with the four bands, your ideal
  band and a marker for you, plus how many kg you are from your ideal weight, or "you are in
  your ideal range".
- **Make it my goal** in one tap. The weight goal, the progress bar and the goal date all
  follow it.
- **Your numbers:**
  - BMI with its category.
  - Estimated body fat against the healthy range for your age and sex.
  - Resting burn (Mifflin–St Jeor).
  - Daily energy, from your real step average over the last 7 days.
  - Calories to lose, gain or keep.
  - Protein and water per day.
  - Waist ÷ height, if you add your waist.
- **Your road there:** how many weeks it takes at a safe pace (0.25–0.5 kg a week, never below
  1,200 / 1,500 kcal), and the expected date.
- **Weight monitoring:**
  - A pace check compares how fast you are actually losing or gaining with a safe 0.25–1 % of
    your weight a week. It flags "too fast", "good", "stalled" or "going the wrong way".
  - The body-weight chart now shades your ideal range behind the curve.
- Under-18s get their BMI and a growth-chart note instead of an adult ideal weight.
- Age is saved as a birth year, so it stays correct as the years pass. Everything stays on
  the phone.

### 🎨 Themes
- **Categories inside Themes:**
  - Golden, Royal, Premium, Dark, Light, Nature, Ocean & sky, Neon, Warm, Pastel, Classic and
    Sport.
  - A chip bar shows a count on every chip.
  - The screen opens on the category of the theme you are using.
- **658 named themes** (up from 120): 94 colour families (Champagne, Black gold, Imperial,
  Sapphire, Diamond, Obsidian, Pearl, Marble, Galaxy, Synthwave, Matrix, Lagoon, Terracotta,
  Cotton candy…), each in 7 styles. "Tinted" is new.
- **Theme Studio, with 2,721,600 more themes.** Pick a background colour, colour strength,
  accent, style and glow:
  - Every combination has its own number. Jump to any number, step with ‹ ›, or tap 🎲 for a
    surprise.
  - You get 9 fresh ideas each time.
  - The accent is always tuned to stay readable.
- **2,722,258 themes in all.** "Follow the phone" also works with Studio themes.
- **My themes:** keep up to 30 favourites with ★. They get their own chip at the front.

### ✨ Also
- New icons: crown, medal, palette, dice and more.
- New translations in all 12 languages.
- Arabic is fully Arabic on the new screens. The formula names are written in Arabic too.

## v2.11.0 — 2026-10-13

**Close any panel the way you expect — swipe it down or tap ✕ — and a ‹ back button that
takes you back to where you came from, on every screen.**
*أغلق أي لوحة كما تتوقع — اسحبها للأسفل أو اضغط ✕ — وزر رجوع ‹ في كل شاشة يعيدك إلى حيث كنت.*

### ✕ Panels (bottom sheets)
- **Every panel has a ✕ button** at its top right.
- **Swipe down to close:** the panel follows your finger and the background fades with it; a
  long pull or a quick flick closes it, a small one springs back. The handle bar always drags,
  even when the panel is scrolled.
- **The quick check-in before a workout** (the weight panel after the centre *Start* button)
  is no longer stuck: swipe it down, tap ✕, tap outside or press Back — nothing starts.
- **A smooth way out** for every panel and dialog: they slide down / fade instead of vanishing,
  whether closed by ✕, a swipe, a tap outside, the phone's Back button or a button inside.
- **Esc** closes the top panel on a keyboard.

### ‹ Back
- **One back button on every screen** (Settings, Themes, Walking, Water, Body weight, History,
  a routine, the coach): it goes back to the screen you came from, and to the right screen
  when you arrived from a notification. It points the right way in Arabic.
- The phone's Back button closes the top panel first, then goes back, as before.
- The tab bar now highlights *Home* on Water and Themes, and *Plan* on the coach.

## v2.10.0 — 2026-10-13

**120 themes in one "Themes" screen, the app follows your phone's language and light / dark
mode, a home-workout reminder with a light vibration, steps that never jump back, the walking
buttons from 2.8 — refined — and a brand-new celebration.**
*١٢٠ ثيمًا في زر واحد «الثيمات»، التطبيق يتبع لغة الهاتف ووضعه الفاتح/الداكن، تذكير تمرين البيت
مع اهتزاز خفيف، عدّاد خطوات لا يرجع للخلف، أزرار المشي بأسلوب 2.8 بشكل أقوى، واحتفال جديد كليًا.*

### 🎨 Themes (new)
- **One "Themes" row in Settings opens 120 themes:** 20 colour families (Classic, Midnight,
  Ocean, Forest, Sunset, Sakura, Royal, …) × 6 styles — *Dark*, *Pure black* (AMOLED), *Deep*,
  *Dusk*, *Light* and *Pastel*. Every card is a live mini preview.
- **Follows the phone** by default: switch the phone to light or dark and the app switches to
  the matching version of your theme. Filter by *All / Dark / Light*.
- The accent colour follows the theme, or pick your own.

### 🌍 Language
- A fresh install opens in **the phone's language** (*Settings → Language → Phone language*);
  change the phone's language and the app follows. Anything you chose yourself is kept.

### 🏠 Home-workout reminder (new)
- On days without a gym routine, a **heads-up reminder with a light vibration** shows the day's
  no-equipment workout: name, number of exercises, minutes, and the day's steps, water and
  calories. **Start** opens the workout right away; **Later** reminds you in 30 minutes.
- A follow-up an hour later if you haven't trained yet. *Settings → Notifications*.

### 👟 Steps
- **The number never steps back** (7,412 → 7,409 → 7,413 is gone): live steps from the step
  detector are shown at once and the step counter confirms them, without ever counting a step
  twice. Unconfirmed steps are dropped when you stop; only confirmed steps are saved.
- **Walking buttons:** back to the 2.8 layout — one big start / pause button, stop and reset
  beside it — larger, clearer and smoother.

### 💧 Water
- **The exercise with each water reminder follows the day's workout** — leg moves on leg day,
  mobility on Friday, cardio bursts on HIIT day, 30 new moves in total.

### 🎉 Celebration
- **Fireworks**, slowly turning light rays, twinkling stars and a shine across the badge;
  a new **brass fanfare** with a final chord (in the app and outside it).

### 📅 Today's plan
- **The whole week at a glance** (Saturday → Friday): each day's workout, minutes, steps and
  water, with the exercises one tap away.
- **On-plan streak:** days in a row with a day score of 67 % or more.

## v2.9.0 — 2026-10-13

**A plan for every day — workout, steps and water — to lose weight and get fitter, water
reminders that vibrate, and a cleaner, more modern look.**
*خطة لكل يوم — تمرين وخطوات وماء — لخسارة الوزن وتحسين الجسم، وتذكيرات ماء تهتز، وتصميم أنظف وأحدث.*

### 🎯 Today's plan (new)
- A card on Home gives **every day one workout, a steps target and a water target** that fit
  together: Saturday full-body fat burn, Sunday walking + core, Monday legs & glutes, Tuesday
  HIIT, Wednesday upper body & core, Thursday long walk + core, Friday mobility & recovery.
- **Adapts to you:** your steps target is your last week's average + 10 % (more on walking
  days); sets grow as you train more often; with a high BMI jumps are replaced by
  **joint-friendly** moves. A routine from your own week plan always comes first.
- Three rings (workout · steps · water), a **day score**, minutes, **calories and grams of fat
  burned**, the distance to your goal weight and a daily fat-loss tip.
- **One tap starts the workout** with the right exercises, sets and reps.
- Finish all three and the **full-screen celebration** plays.

### 💧 Water
- **Reminders vibrate** with a gentle "drip, drip, drop", also when the sound is off
  (*Water → Reminders → Vibrate*, on by default).
- **Today's schedule:** each reminder time with how much you should have drunk by then,
  *on track* or *X ml behind*, and a one-tap catch-up.

### ✨ Look & controls
- **New switches:** one neat size everywhere, a soft gradient, a check mark on the knob, a
  focus ring. **Fixed:** in Arabic the knob slid out of the switch and over the text.
- **Step counter controls** are now one dock: a big round start/pause button between two
  equal round buttons, *Reset* and *Stop*, each labelled.
- **Buttons** have one height per size, so rows and cards line up.
- **Fixed:** sliders in Arabic filled from the wrong side.

### 🕐 Clock
- The word **"Baghdad" is gone**: the clock always shows **your phone's local time**, in the
  app, the notification and the widget (the clock-zone setting was removed).

### 🛠 Under the hood
- 12 new tests (388 in total); 50 new translations in 12 languages.
- **Fixed:** five Coach server tests began failing on 13 October because their sample workout
  had aged out of the 12-week review window; the sample data now uses dates relative to today.

## v2.8.0 — 2026-10-13

**Sign in with Google now always works: no more "isn't set up for this version", and your data
is saved to your Google account straight away.**
*تسجيل الدخول بحساب Google يعمل دائمًا الآن: لا مزيد من رسالة «غير مُعدّ لهذه النسخة»، وتُحفظ بياناتك في حساب Google مباشرةً.*

### 🔐 Google account: works on every phone, no setup
- **Fixed:** picking an account showed *"Google sign-in isn't set up for this version of the
  app yet. Your data stays on this phone for now."* Signing in now uses **Android's own
  account chooser** (the Google accounts already on the phone, no password), which needs no
  Google Cloud setup.
- **Saved to your Google account at once through Android Backup.** Android uploads it in the
  background and **puts it back by itself** when you install MAHDI-JYM again or on a new
  phone: you open the app and you're welcomed back with everything in place.
- **Google Drive** (sync within seconds) switches on **by itself** once the app's one-time Google
  Cloud setup is done. It is retried quietly every few hours, or right away from
  *Settings → Google account → Use Google Drive*.
- Settings shows **where your data is saved** (Android Backup or Google Drive), with
  *last saved*. Your name and photo appear once Drive is connected.

### 🛠 Fixes and polish
- **Fixed:** after signing out and back in, automatic saving could stop until the app was
  restarted.
- Duplicate translations removed in 11 languages. Code clean-ups.
- 7 new tests for the account (376 in total).

## v2.7.0 — 2026-10-13

**One elegant notification for everything, Back pressed twice to leave, and Google sign-in
that no longer hangs.**
*إشعار واحد أنيق لكل شيء، الخروج بضغطتين على زر الرجوع، وتسجيل دخول Google لم يعد يتجمّد.*

### 🔔 One notification instead of two
- The step counter and the water panel are now **one bar**, divided into clear sections:
  - **Header:** today's date, status (Live / Walking / Paused), a clock and a **⏸ / ▶** button.
  - **Two cards side by side:** green **Steps** (count / goal, %, bar, "2,350 steps to go")
    and blue **Water** (ml / goal, %, bar, "750 ml to go"). Both turn into a ✓ at the goal.
  - **Stats:** km · kcal · km/h · walking time.
  - **Containers:** glass / كلاص · cup / كوب · can / علبة · bottle / قنينة. One tap adds a drink.
    Undo and Edit sit beside them.
  - **Footer:** the motto and the countdown to midnight.
- **Collapsed**, it shows steps and water side by side, plus a "+" for your usual container.
- Everything works with the app closed, and the bar updates the moment you drink or walk.
- **Water reminders still pop up** for a moment so you notice them. They go away by themselves
  when you drink, tap *In 15 min*, or after 15 minutes.
- With the step counter off, the water keeps its own panel as before. With water in the
  notifications off, the steps card fills the bar.
- The water screen's preview shows the new bar.

### ↩️ Back button: press twice to exit
- Back closes an open sheet first, then goes back a screen (or Home from a tab).
- On Home, the first press shows **"Press back again to exit"**. Only a second press within
  2 seconds leaves the app, and the step counter keeps counting in the background.

### 🔐 Google sign-in no longer hangs
- **Fixed:** sign-in could stay frozen on *"Connecting your account… choose an account in
  the window that appears"*, and no account list ever opened. The cause was a JavaScript
  promise that never settled, so the native chooser was never asked to open. It now opens
  straight away.
- Every step has a time limit, a hint appears if it's slow, and **Cancel** is always there,
  both on the first-launch screen and in Settings → Google account.
- If the chooser opens and then shows **error 10**, the one-time Google Cloud setup isn't done
  yet (see [docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md)).

## v2.6.0 — 2026-10-13

**Water right in the notifications, a water goal that adapts to your day, workout reminders
at each day's own time, and sign in with Google to save everything to your account.**
*الماء داخل الإشعارات، هدف ماء يتكيّف مع يومك، تذكير بالتمارين في وقت كل يوم، وتسجيل الدخول بحساب Google لحفظ كل شيء في حسابك.*

### 🔐 Sign in with Google: everything saved to your account
- **First launch** asks where your data should live: **Continue with Google** (Google's
  own chooser lists **the accounts already on the phone**; pick one, no password),
  **Save on this phone**, or **Skip**.
- Workouts, plan, routines, steps, water, body weight and settings go into a **private
  app folder in your Google Drive** that only MAHDI-JYM can see (`drive.appdata`, so your own
  files are never visible to the app). There is no MAHDI-JYM server in between.
- **Saved automatically**: a moment after each change, and right away when the app goes to
  the background. If both the account and this phone hold data on first sign-in, you choose
  which copy to keep. A new phone signed in to the same account gets everything back.
- **Settings → Google account**: your photo, name and email; *last saved …*; **Save now**;
  **Save automatically** on/off; **Undo the last restore**; **Switch account**; **Sign out**.
- One-time Google Cloud setup for the app owner: [docs/GOOGLE_SIGN_IN.md](docs/GOOGLE_SIGN_IN.md).

### 💧 Water in the notifications
- A new **water panel** in the notifications: today's ml and the goal with a bar, plus
  buttons for **glass / كلاص · cup / كوب · can / علبة · bottle / قنينة**, **Undo** and
  **Edit**. It all works with the app closed and updates instantly. Each container has its own
  shape. Your usual one is highlighted.
- Water → *Water panel in the notifications* switches it on or off, with a live preview of
  the notification.

### 🎯 An automatic water goal
- The daily goal now **adapts to your day**: body weight × 33 ml, **+70 ml per 1,000 steps**
  after the first 3,000, and **+10 ml per minute of training** (including a workout in
  progress).
- The Water screen explains it with a coloured breakdown (base · walking · training →
  today's goal). The Home card shows chips like 🚶 +450 · 🏋️ +300.
- The goal also grows in the notification during a walk with the app closed: the same rule
  runs natively. Each past day is judged against its own goal (streak, 14-day chart).
- Prefer a fixed goal? Switch *Automatic goal* off.

### 🏋️ Workout reminders at the workout's time
- **A time for each weekday** (Settings → Daily reminder → your week): every day with a
  routine shows its colour, its name and its own time. The others follow the shared time.
- The reminder now names **the routine, how many exercises, the first three, and about how
  long it takes**, e.g. «🏋️ يوم الدفع اليوم — 6 تمارين · حوالي 45 دقيقة — …».
- On Android the daily reminder is **on by default**.

### ✨ Design & polish
- New account screens with Google's colours, the account avatar and a live sync status.
- Smooth fills for the water bars and the goal breakdown (no bouncing).
- **Removed "Week starts on"** from Settings: the week always runs **Saturday → Friday**.

### Under the hood
- `lib/cloud.js` (Drive app-data sync, tested against a fake Drive: first sign-in, choose,
  newer-wins, token refresh, errors), native `GoogleAccount` plugin (`play-services-auth`),
  `WaterMath.autoGoal` (+ JVM tests), water panel actions (request codes 60–67).
- 71 new strings, translated into all 12 languages (1,226 keys each). The Arabic-UI guard now
  also covers the account screens.
- 365 frontend tests, 64 API tests.

## v2.5.0 — 2026-10-12

**Water reminders with an exercise, by glass, cup or can — and a full-screen celebration that
appears even with the app closed.**
*تذكير بشرب الماء مع تمرين مناسب، بالكلاص أو الكوب أو العلبة — واحتفال بملء الشاشة يظهر حتى والتطبيق مغلق.*

### 💧 Water, in millilitres, by what you drink from
- Pick your container: **glass / كلاص (200 ml) · cup / كوب (250 ml) · can / علبة (330 ml) ·
  bottle / قنينة (500 ml)**. One tap per container on the Home card, with **Undo**.
- A glass on the Home card **fills up as you drink** (a slow wave, no bounce); ml against
  the goal, the count in your container, the next reminder, the week, the streak.
- New **Water screen** (Home → Water, or Settings → Water & reminders): today's glass, the
  container picker, the daily goal with a **recommendation from your body weight**
  (≈ 33 ml per kg), the reminders and the last 14 days (7-day average, streak, best day).
- 2.4's glass counts are kept: they're read as 250 ml each until the day is written again.

### 🔔 Water reminders — with an exercise, in the notifications, with the app closed
- Every 60 / 90 / 120 / 180 minutes between the hours you choose (default 09:00–22:00,
  every 90 min). **Scheduled natively on Android**, so they arrive with the app closed and
  after a restart; skipped once the day's goal is reached.
- Each reminder shows **today's water with a progress bar and today's steps**, and **a
  suitable exercise**: a short walk (e.g. «امشِ 500 خطوة — حوالي 5 دقائق») when you've been
  still for an hour or are behind on the step pace for this time of day, otherwise a rotating
  mini-workout (10 squats, 20 calf raises, a 30-second plank, wall sit, lunges, stretches…).
- Buttons right in the notification: **“Drank it”** (adds one container, without opening the
  app) and **“In 15 min”**.
- The **live step notification** now has a **water row with its
  own progress bar** and a **“+ water” button** (adds one of your container).
- Changes made from a notification and in the app are merged both ways.
- iPhone: local notifications; browser: reminders while the app is open (+ a system
  notification when the tab is in the background). "Send a test reminder" on the Water screen.

### 🎉 Celebration — redesigned, full screen, also outside the app
- **New full-screen scene** in the app: a dark backdrop lit in the goal's colour, expanding
  rings, a glowing badge (trophy / medal / drop), the number counting up, and confetti
  falling with gravity, drift, spin and flutter on a canvas. Eases in — no bounce.
  6 seconds, tap to close. A water-goal celebration in blue.
- **With the app closed (Android)**, reaching the step goal or the water goal shows:
  - a **full-screen celebration over the lock screen** (it turns the screen on), drawn
    natively with the same scene, closing itself after 8 seconds, with an “Open app” button;
  - a **picture notification** — the image is drawn on the phone (gradient, confetti,
    number) — that replays the full-screen celebration when tapped;
  - a short **fanfare synthesized on the phone** (follows the Sounds switch and silent mode)
    and a vibration.
- With “Display over other apps” allowed (optional), the celebration also opens **on top of
  whatever app is in use**.
- Walking → **Celebrations**: in-app cheer, full screen with the app closed, also every
  1,000 steps (off by default), the status of “Full-screen notifications” and “Display over
  other apps” with a shortcut to each, and **Preview celebration / Preview the notification**.

### 🛠️ Fixes & polish
- The step notification's units are translated (كم · سعرة · كم/س instead of km / kcal).
- 79 new strings in all 12 languages (1,155 keys each); Arabic container names كلاص · كوب ·
  علبة · قنينة.
- Tests: water maths (ml, migration, merge, slots, exercise choice), the native config,
  the new screens and the Arabic guard (now covering the Water screen) — 344 web tests;
  `WaterMathTest` mirrors the reminder rules on the JVM in CI.
- Android: `USE_FULL_SCREEN_INTENT` and the optional `SYSTEM_ALERT_WINDOW` permissions;
  versionCode 11.

## v2.4.0 — 2026-10-11

**A Saturday-to-Friday week, routine names in Arabic, colours for every routine, a water
tracker, and Arabic everywhere.**
*أسبوع من السبت إلى الجمعة، أسماء الروتينات بالعربية، لون لكل روتين، متابعة شرب الماء، وعربية في كل مكان.*

### 📅 The week runs Saturday → Friday
- Every week view — the plan's weekly schedule, the week strip on Home, the calendar, the
  year heatmap, weekly stats, the Coach intake and the printed plan — now starts on
  **Saturday** and ends on **Friday** (السبت، الأحد، الاثنين، الثلاثاء، الأربعاء، الخميس، الجمعة).
- **Settings → General → Week starts on:** Saturday (default), Sunday or Monday.
- Weekly numbers (workouts per week, effort weeks) are grouped by the same week.

### 🏷️ Routine names in Arabic
- The starter routines and the built-in names are stored once and shown in the app's
  language: **يوم الدفع · يوم السحب · يوم الأرجل** (Push / Pull / Leg Day), «تمرين حرّ»,
  «روتين جديد»… Switching language renames them; names you typed stay as typed.
- Applies everywhere a routine name appears: Home, Plan, Workout, history, toasts, the
  daily reminder and the printed plan.

### 🎨 Colour
- Every routine has a colour (Push orange, Pull blue, Legs purple; pick any of ten in the
  routine editor). Lists, the today card, workout rows and the week schedule use it.
- **Redesigned weekly schedule:** days in week order, today highlighted, a colour strip per
  day, a «Rest» tag with a moon on rest days and a training / rest summary.
- **Six-day split:** Push · Pull · Legs twice a week, Saturday to Thursday, Friday off — the
  starter plan uses it, and existing starter plans get a one-tap button to switch.
- Two new accent colours: **indigo** and **mint** (label colours checked for contrast).

### 💧 Water tracker
- A new Home card: tap to add a glass (250 ml), see today's progress against a daily goal
  (6–12 glasses), the last seven days and your streak. Fully offline, kept for 400 days.
- **Settings → Walking & body → Water tracker** hides it.

### 🌐 Arabic everywhere
- **Exercise instructions in Arabic** for the first time — the dataset has none, so 488 step
  sentences were translated by hand; 201 exercises (the whole starter plan and the common gym
  lifts) now read fully in Arabic. The rest keep English steps, marked as such, never half
  translated.
- Remaining English in the Arabic UI translated: units (كغ، رطل، مل، ث), RIR / RPE
  («المتبقّي» / «الجهد»), 1RM («أقصى وزن لتكرار واحد»), GPS, JSON, PDF, Chrome / Safari,
  GMT (غرينتش), EZ bar, SkiErg, Greyskull LP, the progression hint («2.5 كغ إضافية») and more.
- A new test renders every screen, the main sheets and a workout in progress in Arabic and
  fails on any stray English (brand names excepted).
- 23 new strings in all 12 languages.

### 🐞 Fixes
- The dataset's broken "sled 45в° leg press" names now read "45°".
- Coach weekly day picker follows the week order.

## v2.3.0 — 2026-10-10

**Accurate step counting, a fully offline app, reset the counter, and new walking features.**
*عدّ خطوات دقيق، تطبيق يعمل بالكامل دون إنترنت، تصفير العدّاد، وميزات مشي جديدة.*

### 🐞 Steps jumping from 70 to 24,303 (Android)
- **Root cause:** Android's step sensor reports the steps since the phone was switched on.
  The counter treated any *lower* reading as a reboot and re-based on it; a single stray low
  value (a sensor hiccup) therefore made the next normal reading count in full — tens of
  thousands of steps at once. Nothing capped it.
- Reboots are now detected for real (Android's boot counter, uptime going backwards), never
  guessed. A low reading on the same boot is first treated as a glitch: the baseline stays,
  so the count simply continues when the sensor recovers; only two low readings in a row mean
  the sensor really restarted.
- Every increase must be humanly possible in the time since the previous reading (≤ 4 steps/s
  plus a small allowance) and a day can't exceed 150,000 steps; anything else is refused.
- The same rules protect the plugin path (iPhone, Android without the native service) and the
  browser counter. The arithmetic is unit-tested (JVM `StepMathTest`, run by CI before every
  APK build, plus vitest).
- Counting itself never needed the internet: it runs on the phone's sensor, and Settings now
  says so.

### 🔄 Reset the step counter
- **Walking → Reset step counter:** put today back to 0 and count on from now (two-tap
  confirm), or clear a wrong earlier day. The native service, the widget and the lock-screen
  notification follow at once.
- **This walk:** steps, time, distance and cadence (steps/min) of the current walk, with a
  **New walk** button that starts it again without touching the day.

### 🏅 Achievements
- Badges for big days (5k → 30k), lifetime steps (10k → 1M) and goal streaks (3 → 30 days),
  with progress — computed from your history, nothing extra stored or sent.

### 📴 Works fully offline
- **Android app:** all 1,324 exercise images and 1,324 animations (GIFs) now ship *inside*
  the APK — the exercise library works with no connection. (The APK grows to ~140 MB.)
- **Web / installed app:** the service worker precaches every file of the build at install,
  so every screen opens offline, not only the ones visited before; updates copy unchanged
  files instead of downloading them again. **Settings → Offline → Save for offline use**
  stores the exercise media in the browser (with progress, and *Free up space*).
- If a bundled image is ever missing, the app falls back to the pinned CDN copy once.

## v2.2.1 — 2026-10-10

**Bug fixes: the step counter counts, the permission dialog moves on, no crash from App info.**
*إصلاحات: العدّاد يعدّ الخطوات، نافذة الأذونات تتقدّم وتُغلق، ولا انهيار عند فتح معلومات التطبيق.*

### 🐞 Step counter stuck on 0 / "Starting…" forever (Android)
- **Root cause:** the bridge to the native step service resolved a promise *with the Capacitor
  plugin object itself*. That object answers every property, `then` included, so JavaScript
  treated it as a promise and waited for a native `then()` that doesn't exist — every call to
  the service hung forever. The counter never started (0 steps, "Starting…" for good), and the
  first-launch dialog waited on it, so it never asked for the activity permission and never
  closed. The plugin now only travels inside a plain `{ P }` box. Same fix for the
  notification plugin used by the browser/iPhone counter.
- Every native call is now **time-limited** (8 s; 15 s for `start`; 2 min for a system
  permission prompt), and the whole start is capped too: the status can no longer stay on
  "Starting…" — it ends in *Counting*, *Denied* or *Try again*, and a start that finishes late
  is still picked up.
- Overlapping starts (the launch-time reattach and a tap) share one attempt instead of the tap
  being ignored; a tap after a failed launch-time start gets its own try, with prompts.
- A slow `start` that times out although the service did start is detected (`getState`).
- Coming back from the system settings re-checks the permission and starts counting by itself.

### ✅ First-launch dialog always moves on
- The dialog resolves the platform itself before asking (it no longer falls back to the
  browser variant), every step is bounded, and the run is wrapped so it always reaches the
  final screen. A **Skip** link appears after 6 s of setup.
- The battery-exemption wait is shorter (max 30 s, and 2.5 s after you return from the
  system screen) and can be skipped.
- When physical activity ends up denied, the final screen and the Walking screen offer
  **Open settings** (new native `openAppSettings()` → the app's page → Permissions).

### 💥 No crash from App info → Permissions
- Android kills an app's process when one of its permissions is switched **off** — that is
  system behaviour. What crashed was the restart afterwards: the watchdog / sticky restart
  started the foreground service without the activity permission, Android 14+ refused the
  "health" service type, and the service stopped without ever calling `startForeground()` —
  which Android punishes by crashing the app, again on every retry.
  - One permission-checked way to start the service (`StepCounterService.send`) used by the
    watchdog, the boot receiver, the plugin and the restart kicks: no permission → no start.
  - The service always satisfies the `startForeground()` contract, even when it has to stop
    at once (a permission-free `shortService` fallback on Android 14+), and no longer
    reschedules itself in a loop after a refused start.
  - Defensive `try/catch` around sensor registration, the screen receiver
    (`ContextCompat.registerReceiver`, Android 14+ flag), alarms and boot.
- Counting stays switched on while the permission is off; allow it again and open the app —
  counting continues.

### 🧪 Tests
- New regression tests with a Capacitor-like *thenable* proxy (the exact failure), native call
  time-outs, and the store's start logic (hung start, late start, overlapping starts). 304 tests.

## v2.2.0 — 2026-10-10

**Runs nonstop in the background, asks once, speaks Arabic properly.** *يعمل في الخلفية بلا توقف، يطلب الأذونات مرة واحدة، وعربي بالكامل.*

### 🔋 Nonstop in the background (Android)
- A **watchdog** alarm (every 15 minutes, exact when allowed, and in Doze) checks that the step
  service is alive and brings it back if the system killed it — also 2 s after the app is
  swiped away and 5 s after the service is destroyed. Opening the app revives it too.
- **After a reboot**: boot receiver now also handles HTC/fast-boot phones, re-arms the watchdog
  and refreshes the widget; the service restarts by itself after an app update as before.
- New native calls: `getDeviceInfo()` (maker, model, Android version) and
  `openAutostartSettings()` — opens the **Autostart / "No restrictions"** screen on Xiaomi,
  Redmi, POCO, Huawei, Honor, Oppo, Realme, Vivo, iQOO, OnePlus, Samsung, Asus and Letv.

### ✅ One permission dialog on first launch
- A small **centred dialog** says what the app needs and why — physical activity,
  notifications, running in the background, starting after a restart — with a **your own
  responsibility / not a medical device** notice. **Agree & allow** then asks every permission in
  turn (activity, notifications, battery-optimisation exemption), switches the counter on, and
  on phones that need it opens the maker's autostart screen. Arabic/English toggle in the
  dialog; *Not now* asks again next launch. Browsers get the same dialog (notifications,
  iPhone motion) plus a link to the Android app.

### 🌍 Arabic, fully
- **All 1,324 exercise names in Arabic**, with the original English name in small type under
  each — in the library, the picker, workouts, routines, history, stats, the coach and shared
  plans. Search finds an exercise by either name (`سكوات` or `squat`). Generated from a gym
  glossary by `scripts/build-exercise-names.mjs` (CI checks every word has a translation).
- **Arabic units**: كغ، رطل، كم، كم/س، سعرة، سم، دقيقة. Coach equipment chips, the "PR" badge and
  every button label for screen readers are translated (12 languages).
- **English mode is English only.** A fresh install starts in the phone's language (an Arabic
  phone opens in Arabic).

### 🧹 Cleaner Settings
- The footer is just **MAHDI-JYM**. Tapping it opens *About*: version, licence (AGPL v3) and
  the source / openGym / exercise-data links the licence asks to keep reachable.

### 🐛 Fixes
- **Passkey sign-up did nothing inside an embedded preview** (the browser blocks passkeys in
  iframes and reports it like a cancel, which was swallowed). The login screen now detects the
  frame and offers **Open in a new tab**, and every passkey failure shows a clear message.
- Self-hosting (`scripts/local-host.mjs`): the API is **restarted automatically** if it crashes
  (with back-off) instead of taking the site down; `/api` answers 503 *restarting* meanwhile.
- `useLang()` supplies a server snapshot (server rendering no longer warns).

## v2.1.0 — 2026-10-10

**The step counter goes all-day — on the lock screen.** *عدّاد خطوات يعمل طوال اليوم، حتى والهاتف مقفل.*

### 📱 Live counter on the lock screen (Android)
- New native **foreground step-counter service**: counts with the app closed, the screen off
  and the phone locked; restarts itself after a reboot or an update. Uses the hardware step
  counter (step detector as fallback) — light on battery.
- **Live notification card**, also on the lock screen: steps / goal with a progress bar, a
  clock ticking **to the second in Baghdad time**, walking time, distance, calories, speed, the
  **countdown to midnight** and a motivation line that changes as you go — with **Pause /
  Resume** and **Open** buttons. A pause set from the notification survives reopening the app.
- **Home-screen widget** (4×2) with the same live numbers.
- **Milestones with sound**: every 1,000 steps and at your goal — vibration, a sound on its
  own channel, and an optional **voice coach** (Android text-to-speech, in the app language).
- Steps are kept per **hour**; days walked without opening the app are merged in on launch
  (raise-only — nothing recorded is ever lowered).
- Walking → *Lock screen & background*: one-tap **battery-optimisation exemption**,
  notification settings and a widget how-to. Phones without a step sensor fall back to the
  accelerometer instead of "unsupported".

### 🕰️ Live clock — Iraq time
- A **live clock** on the Walking screen: hours, minutes and **ticking seconds** in Baghdad
  time (UTC+3), the weekday, the Gregorian and **Hijri (Umm al-Qura)** dates, a **countdown to
  midnight** with a day-progress bar, and the steps per hour still needed to reach the goal.
  A compact version heads the steps card on Home. Settings: Baghdad or the device's zone.

### ✨ A new-look step counter
- Step ring redrawn: gradient arc with a soft glow, a tick every 1,000 steps, a bright dot
  riding the arc, a breathing pulse while you walk, gold at the goal.
- Numbers **roll up** to their new value; a walking figure bobs while steps come in.
- New **Today by hour** chart; motivation line in five tiers; active time as H:MM:SS;
  Live / Paused badges; a goal progress bar on the Home card.

### 🐛 Fixes
- 33 strings that were wrapped for translation but missing from every locale (weight check
  warnings, "in {0} days", the demo login, the Coach demo, Stats' "Exercise") now translated
  in all 12 languages; `check-locales.mjs` now also fails on any `t()` key missing from the
  locales, so this can't silently happen again.
- Admin: the invite-codes card now says whether sign-up is open or invite-only.
- Removed unused imports across the app (lint-clean: no undefined names, no hook-rule
  violations).

## v2.0.0 — 2026-10-10

**openGym becomes MAHDI-JYM** (short name **MH-JYM**) — *جسمك، خطتك، إرادتك.* Same design,
same colors, same privacy rules, same AGPL-3.0 license; a new name, walking, and verified body
weight.

### Rebrand
- Renamed everywhere: app name, PWA manifest, page titles, passkey relying-party name,
  notifications, print-outs, exports, Docker images (`ghcr.io/m777m44/mahdi-jym-{api,web}`),
  OCI labels, docs and website. Android/iOS app id `io.github.m777m44.mahdijym`.
- **Nothing you have breaks:** plan files shared from openGym (`opengym_plan`) still import,
  and the mobile app picks up its old `opengym-state.json` on first launch.
- Settings credits openGym; NOTICE.md records both upstream projects.

### 🚶 Pedometer
- Step counting on the device: the hardware step sensor in the mobile app
  (`@capgo/capacitor-pedometer`; Android keeps counting while the app sleeps, iOS fills in
  today from the motion history), an accelerometer step detector in the browser while the page
  is open (`lib/stepDetection.js` — low-pass magnitude, adaptive threshold, cadence window).
- **Speed (km/h)**, **distance**, **calories** and **active time**, live. Stride from height
  (0.415 × height) or entered by hand; calories from your latest weigh-in. Optional **GPS speed**
  (off by default; positions are never stored or sent).
- **Customizable daily step goal** with suggestions (fixed steps plus one above your own
  average). Step ring on Home, new **Walking** screen with a 7-day chart, streak, weekly
  total/average, goal-met days and best day.
- Daily totals live in your state (`steps`) and sync like everything else; background writes
  are throttled so walking doesn't re-upload your state every few seconds.

### 🔔 Ongoing step notification
- A silent, in-place notification while counting: steps / goal, distance, speed. Android:
  a true ongoing notification on its own low-importance channel; browser: a service-worker
  notification with a fixed tag. Tapping it opens the Walking screen.

### 📳 Haptics · 🎉 Celebration
- A triple haptic tick at every 1,000 steps and a longer pattern at the goal
  (`@capacitor/haptics`, Vibration API in browsers).
- A **5-second celebration overlay**: an SVG figure raising its arms, a confetti burst in the
  palette colors, a short Web Audio chime (no audio files) and a countdown bar. Respects
  *prefers-reduced-motion*; tap to dismiss. Haptics, celebration and notification each have
  their own switch.

### ⏰ Smarter daily reminder
- The workout-day reminder now carries your step goal; optional **walk reminder on rest days**,
  sent only while the goal isn't met.
- **Smart time suggestion** from when you usually start training (median start, 30 minutes
  earlier), one tap to use it.
- **Follow-up an hour later** if the workout still isn't logged (on by default).
- Mobile: dated local notifications planned 14 days ahead and refreshed whenever the app opens
  or the plan changes (`lib/dailyReminder.js`). Web: the server's push loop uses the same rules
  (`api/reminders.js`). Notification taps deep-link to Today or Walking.

### ⚖️ Verified body weight
- New **Body weight** screen: current, previous and the difference; change since the first
  weigh-in; weekly trend over four weeks; estimated date for reaching the goal.
- **Comparison against the target** with a progress bar from where the goal was set;
  **BMI** and category once a height is entered.
- **Verification on entry:** values outside the human range, or jumps too large for the time
  since the last weigh-in, ask you to double-check before saving.
- **Scale photo** per weigh-in, stored only on the device that took it (IndexedDB), never
  uploaded or synced, deleted together with the weigh-in.
- Chart with 30 d / 90 d / 1 y / all, and the full paged history with per-entry deltas.

### 🌍 Languages
- **Arabic** — every string translated, with a right-to-left layout (numbers, charts and
  number fields stay left-to-right; chevrons mirror). 13 languages.
- All new strings translated into the existing 11 locales.

### Under the hood
- New pure modules with tests: `stepDetection`, `stepMetrics`, `weightTracker`,
  `dailyReminder` (frontend) and `reminders` (api), plus a render smoke test for the new
  screens and a plan-share test for the legacy key.
- Android: `ACTIVITY_RECOGNITION`, `POST_NOTIFICATIONS`, `VIBRATE`, optional location
  permissions declared; iOS: motion and when-in-use location usage strings.
- Fixed an unescaped `&` in `assets/banner.svg` that made it invalid XML.

### 🌐 Website, Android APK & hosting
- **heroes-jym.com** — the project site rebuilt along the lines of opengym.ch: big feature
  blocks for the 2.0 additions, "and the rest of it", screenshots, the live demo embedded
  (served at `/demo/`), the two flavors, open-source stats. Plus a full **Arabic page**
  (`ar.html`, RTL) with step-by-step APK install help. Deployed by `pages.yml` with
  `website/CNAME`; `scripts/build-site.sh` assembles the same site locally.
- **APK built in CI** — `android-apk.yml` runs `build:mobile` + `assembleRelease` on JDK 21,
  verifies the signature with `apksigner`, uploads it on every push and publishes
  `MAHDI-JYM.apk` to a GitHub Release for every `v*` tag
  (`releases/latest/download/MAHDI-JYM.apk` is what the site links to). Release signing comes
  from `MJ_KEYSTORE*` env vars — repository secrets when set, otherwise a committed public
  keystore so all builds share one signature (see docs/MOBILE.md → *Signing*).
- **Self-host without Docker** — `scripts/local-host.mjs` starts the API and serves the built
  app with the nginx container's `/api` proxy and SPA fallback; media from `./media` or, if not
  downloaded, the pinned CDN dataset.
- CI: the Tests workflow now installs the API's dependencies (the coach/config/jobs tests
  import the provider adapters — this failed upstream too).

### Known limitations
- Browsers only deliver motion data while the page is open and on screen; for all-day counting
  use the mobile app.
- iOS has no ongoing notifications — the step notification there is a normal one, replaced
  silently.
- Mobile reminders are planned two weeks ahead; open the app at least once every two weeks to
  keep them coming.
- Server push reminder texts are in English (as in openGym).

---

# Upstream history (openGym)

The entries below are [openGym](https://github.com/DuarteSantos8/openGym)'s own changelog,
including the AI Coach fork MAHDI-JYM is built on. "openGym" in them means the project as it
was then.

## AI Coach fork (alexpcosta/openGym) — merged into MAHDI-JYM 2.0

### The AI Coach

openGym could always progress a plan. It could never *write* one, and it never looked at the
plan itself — the engine adjusted your weights inside whatever structure you had built, and the
effort ratings you logged were, by the app's own admission, read by nothing.

The Coach is an optional AI that does both jobs the engine deliberately doesn't: it designs
plans, and it changes them when your training says they should change. It runs as a CLI on your
own server, under your own provider account, and it is off until an admin turns it on.

- 🤖 **It builds you a plan.** A six-screen intake — goal, experience, days, session length,
  equipment, limitations, likes and dislikes — produces a complete weekly plan: routines,
  exercise selection, sets × reps, supersets, the week schedule, and a progression policy per
  routine with per-exercise overrides. Every exercise carries a sentence on why it is there.
  Don't like it? Say so in your own words ("swap the squats for split squats, Mondays are
  short") and the whole plan comes back revised.
- 🔍 **It reads what actually happened.** On demand, or weekly, or after every N sessions: sets
  hit and missed against their targets, effort trends, the stalls and deloads the engine fired,
  sessions you keep moving to another day, session length against the time you said you had,
  body weight against your goal, and muscle groups that got nothing. **Your RIR and RPE ratings
  finally have a reader.**
- ✅ **Changes you approve one at a time.** A review comes back as a list of discrete changes,
  each with a before → after and a rationale naming the evidence — "bench came in at RPE ≥ 9.5
  for three sessions and stalled twice; swapping to dumbbell press for four weeks". Tick the
  ones you want. Advice with no plan change attached goes in a separate notes section and
  applies nothing.
- ↩️ **Nothing is one-way.** Accepting snapshots your plan first, so one tap puts it back.
  Reverting a plan never touches a logged workout — the log is what happened.
- 🚦 **It knows when to say nothing.** A review that finds no reason to change anything says so
  and sends no notification. Suggestions you turn down are remembered, so the next review
  doesn't re-propose them without new evidence.
- 🔒 **The engine still owns your weights.** The Coach sets the plan and the policies; the
  deterministic progression engine still computes every session's target and still tells you
  why. Plans are where judgement lives, targets are where the math lives, and the math stays
  auditable and offline.
- 🧾 **A visible paper trail.** Every job, decision and applied change lands in a per-profile
  Coach log that syncs with your data and travels in your JSON backup.
- ⭐ **How did that feel?** An optional one-tap rating on the finish summary — too easy / about
  right / brutal, plus a note. The Coach reads both.

**For whoever runs the instance.** Both provider runtimes — Claude's Agent SDK and a pinned
OpenAI Codex CLI — ship inside the api image, so there is nothing to install and neither path
needs an API key. Enable the Coach, sign in (a `claude setup-token` you paste, or Codex's
ChatGPT device-code flow) and set spending caps entirely from the admin dashboard — no `.env`
editing, no restart. The card shows runtime version, sign-in state, jobs run today and the last
failure; it never shows anybody's intake answers, payloads or proposals. A **Fixture** provider
walks the entire loop with no AI account at all.

**For everyone else.** An instance with the Coach switched off is the app it was before, to the
byte: no new UI, no new requests, no change to the state you sync. Turning it on adds one
dismissible card until a profile consents, and consent is per profile — the admin enabling the
feature does not enable it for you. The consent screen lists exactly which categories of data
leave the server, names the provider, and says whose account pays. The mobile build has no
server and hides it; the demo runs it against a canned local provider so you can try the loop.

Under the hood: the provider runtime runs as an unprivileged user that cannot read `./data`,
with a scrubbed environment and no tools; every answer is validated against a closed list of
change types and the real exercise library before anyone sees it, with one repair round and
then a clean failure. A pasted Claude setup token is encrypted at rest with a key derived from
the instance secret; Codex's ChatGPT credential stays in Codex's own private cache, mounted
separately from app data and never copied into `coach.json`.

Documented in **[docs/AI_COACH.md](docs/AI_COACH.md)**, with setup walkthroughs for
[Claude](Claude-setup-instructions.md) and [ChatGPT/Codex](ChatGPT-setup-instructions.md) and
the design rationale in [openGym_AI_Strategy.pdf](openGym_AI_Strategy.pdf).

### The effort ratings, read back as statistics

v1.2.3 let you rate how hard a set was. Nothing then read that rating back — it lived in the set
label and nowhere else. Stats now answers the question the number was recorded for.

- 📊 **An Effort card in Stats** over 30d / 90d / 1Y / all time: average effort, the share of sets
  taken close to failure, and — always alongside them — how much of your training was rated at
  all. Rating is optional and off by default, so a partly rated history is normal; an average
  without its denominator would quietly speak for sets you never rated.
- **Week by week.** The weekly average with that week's set count in the tooltip, because the
  pair is the reading: volume up with effort up is fatigue accumulating, volume up with effort
  flat is the adaptation you were training for. Weeks resting on a single rated set are dropped
  rather than drawn.
- **Where the sets land.** The spread across the scale, not just the middle of it. Half your sets
  at failure and half in warm-up territory average out to a healthy-looking number; this is the
  chart that shows it.
- 🔥 **Hard-sets mode on the muscle map.** The same body diagram, counting only sets taken near
  failure — "where did the stimulus go" rather than "where did the volume go". A muscle can lead
  on set count and still never be trained hard.
- **Effort on the exercise curve.** Each session's dot on the top-set chart fills in as less is
  left in the tank, so the same weight moved with more in reserve stops reading as a flat line.
  Exercises with enough ratings also get an Effort curve of their own.
- **One history, whichever scale you use.** Everything aggregates internally in RIR and converts
  back for display, so a history that mixes your own RIR logs with imported RPE averages as one
  series instead of two half-empty ones. RIR charts count downward on the axis, so harder sets
  sit higher.
- Translated into all 12 UI languages.

## v1.2.3 — 2026-07-31

How hard a set was, in whichever of the two scales you already think in — and the ratings your
old app recorded come across with the rest of your history. Plus: the phone stops locking itself
mid-workout, the rest timer can hand time back as well as take it, and Settings is grouped by
what each thing actually affects.

### The screen stays on while you train

- ☀️ **Keep screen awake — Settings → *During a workout*, on by default.** Locking, unlocking
  and finding your place again between every set was the single most annoying thing about
  logging on a phone. The screen now stays lit for as long as a workout is running and lets go
  the moment you finish it, so nothing is held while you are not training.
- **It survives a tab switch.** Browsers release the lock whenever the page stops being visible,
  which is exactly what happens when you glance at a message. The lock is taken again each time
  the app comes back, rather than dying the first time you look away.
- **It follows the workout, not the screen you are on.** Checking Stats mid-session keeps the
  screen awake.
- **Where it isn't available, it says so.** iOS grants no wake lock in Low Power Mode, and older
  browsers have no Wake Lock API at all — the first is silent, the second shows the row disabled
  rather than offering a switch that does nothing. Needs HTTPS, like every other modern browser
  capability.

### Rest timer: take 15 seconds off, too

- ⏳ **A −15s button next to +15s.** The timer could only ever be extended or skipped outright;
  now it goes both ways. Taking off more than is left finishes the rest rather than counting
  into the negative — the same thing Skip does.
- **Rearranged so three controls fit.** The clock and the progress bar take the top row and the
  controls sit underneath: −15 and +15 together in number-line order, Skip pushed to the far
  edge so the button that ends the rest is not next to the one you tap to buy more time. On a
  wide screen it stays on one line. Tap targets are bigger than they were.
- **The bar is nearly opaque.** The set rows underneath were reading through it and making the
  clock hard to pick out.

### Settings, grouped by what it affects

- **General** (language, units) · **During a workout** (rest timer, keep screen awake, sounds,
  effort per set) · **Notifications** · **Appearance** (theme, body diagram, accent) · **Data**.
- The old grouping mixed axes: "Units & timer" put a display preference next to two workout
  behaviours, language sat under Appearance, and *Load starter plan* was buried between the
  backup actions and the destructive reset. Data now reads in the order you would use it — fill
  the plan, bring history over from another app, restore a backup, export one, wipe everything.
- Nothing was removed and no setting changed its meaning.

### Effort per set: RIR or RPE (#21)

- 🎯 **A third column on a working set, off by default.** Settings → *Effort per set* switches
  it between **Off**, **RIR** and **RPE**. It only appears on weighted rep sets: a plank or a
  treadmill row has nowhere to put it.
- **Two names for the same judgement.** RIR counts the reps you left in the tank; RPE reads the
  same effort off a 10-point scale, so RPE ≈ 10 − RIR. The setting has an (i) that lays the two
  scales side by side in a conversion table rather than explaining them in a paragraph.
- **Each set keeps the scale it was logged with.** Switching the setting changes what new sets
  ask for and nothing else — history is never silently rewritten, and a set logged as RIR 2
  still reads back as RIR 2 years later.
- **An unrated set stays unrated.** Blank and 0 are different things: RIR 0 says the set went to
  failure. So `−` on an untouched cell leaves it empty, `+` starts at the bottom of the scale
  and walks up in even steps, and stepping back off the bottom clears the cell again — a mistap
  is always undoable.
- **Nothing else reads the value.** Progression rules and estimated 1RM are unaffected; the
  rating is yours to look at, not an input to the maths.
- Upgrading keeps the column you had: a profile still carrying the old `showRir` flag — from
  this device, a sync, or a backup restored later — comes across as RIR.

### Import brings your ratings with it

- 📥 **The RPE Hevy and Strong export is no longer dropped.** An `RPE` column is read into the
  set, as is an `RIR` column if a file has one, and the import summary says how many sets
  arrived with a rating — plus where to switch the column on if it's off.
- A blank cell stays unrated rather than becoming 0. A written-out `0` counts as a rating on the
  RIR scale (a set to failure) but not on RPE, which starts at 1 — apps write 0 there to mean
  "nothing here", and reading it as an effort would stamp one on every unrated set in the file.
- Ratings above the scale are capped instead of thrown away, and junk in the column is ignored
  without losing the set.
- Backups already carried both fields and the setting, since a backup is the whole state — there
  are now tests pinning that, so it can't quietly stop being true.

## v1.2.2 — 2026-07-25

Training that moves on its own: an exercise can now be logged by time instead of reps, the
next weight follows a progression rule you choose rather than a single hard-coded hint, and
every lift carries an estimated 1RM. Plus a standalone mobile app, a shareable plan, and an
importer for your history from other apps.

### Timed sets and a timer for the set itself (#16)

- ⏱️ **Reps or time, per exercise.** Planks, hangs, wall sits, dead hangs and loaded
  carries no longer have to be filed under cardio to be timed. Each exercise in a routine
  picks its own mode, and a timed set can still carry weight for a weighted plank or a
  farmer's walk.
- ▶️ **A work timer, separate from the rest timer.** Start a timed set and it counts the
  hold down, beeping and buzzing at zero exactly as the rest timer does, then checks the
  set off itself. The two timers can never run at once — they mean opposite things.
- Finishing a hold early logs **the time you actually held**, not the target. A 38-second
  hold against a 45-second target is recorded as 38 seconds.
- The mode travels everywhere it should: routine editor, workout, history, exercise
  statistics (timed exercises chart their longest hold), the printable plan and the shared
  plan file.
- Plans made before this release are read exactly as they always were — nothing to migrate.

### Progression rules you can read (#17)

- 📈 **Pick a rule per routine, override it per exercise.** Linear progression, **Greyskull
  LP** (two straight sets plus an AMRAP final set, with double jumps and a 10 % reset),
  double progression through a rep range, or adding time for timed work. Or none at all.
- 🧾 **Every target explains itself.** "Every rep last time — 2.5 kg more." "Missed reps
  3 sessions running — reset to 55 kg and work back up." The rule is visible before you
  train, not after.
- The session opens with the right weights already in the rows, instead of suggesting them
  once you are standing at the bar.
- 🚫 **A bad session can't look like a good one.** Short reps count as a miss even when you
  checked the set off; a set you never checked counts as a miss because you did not do it.
  Nothing advances the load on a session that fell apart.
- Stalls and deloads are worked out from your log every time they are needed. Nothing is
  written back into a finished workout and no counters are stored, so fixing a mistyped set
  immediately produces the right next target.
- Lower-body lifts step up in larger jumps than upper-body ones by default, and any
  exercise can set its own step.
- Bodyweight exercises progress in **reps**, because there is no load to add to a push-up
  and no load to take off it either.

### Estimated 1RM (#18)

- 💪 **An estimated one-rep max for every lift**, in the exercise progress card (with its
  own curve you can switch to) and in the exercise detail sheet.
- It always names the set it came from — "from 90 kg × 5 on 15 Jul" — because an estimate
  off a heavy triple and one off a set of ten are very different claims.
- 🧮 **A calculator** for a set you have not done yet, so the number is reachable before
  there is any history.
- Epley by default, and it **refuses to guess above 12 reps**, where the common formulas
  disagree by double digits.
- A new best estimate is reported at the end of a workout separately from a weight PR —
  same weight for more reps is real progress, but it is not a heavier lift.

### Share a plan

- 📤 **Send someone your plan.** Plan → *Share your plan* writes a small file with your
  routines, the week schedule and any custom exercises they use — and nothing else. No
  workouts, no weigh-ins, no settings.
- Importing **merges**: shared routines arrive as new ones with fresh ids, custom exercises
  are matched by name so they are not duplicated, and your own plan is never overwritten.
  Taking the week schedule with it is optional.
- 🖨️ **A printable plan** (Save as PDF) laid out so a single exercise never breaks across
  a page.

### Fixes

- A shared plan file naming an exercise this build doesn't have can no longer take the app
  down. Unknown ids are dropped on import, anything that slips through renders as a
  placeholder you can delete, and an error boundary around the screens means a bad state is
  recoverable by switching tabs instead of reloading.
- Importing from another app converts weights **per row**, not per file. FitNotes writes the
  unit on each set, so a mixed export used to land 185 lb as 185 kg.
- Numbers follow the UI language instead of a hardcoded locale, which was putting Swiss
  apostrophes ("7'535 kg") in front of everyone. Volume stays in your own unit rather than
  switching to tonnes, which was wrong for pound profiles.
- Taking over a week schedule from a shared plan now really replaces Monday–Sunday instead
  of only the days the shared file happened to fill.
- The body-weight slider's ceiling follows your unit (300 kg / 660 lb).
- "Best: 85 Kg" is capitalised correctly again.

### One codebase, two flavors

openGym is also a standalone mobile app — and it ships as a direct APK download, not
through app stores.

- 📱 **Standalone mobile app.** The same frontend now also builds as a native iPhone /
  Android app (Capacitor) — the install-and-done flavor of openGym: no account, no server,
  no sync. Everything stays on the phone.
  - State is mirrored into a file in the app's private storage on every change, so your
    log survives even when the OS evicts WebView storage (iOS does).
  - The workout-day reminder becomes a **native notification** scheduled on the weekdays
    your plan actually has a routine — no push server involved.
  - Backups go out through the OS **share sheet** (Files, AirDrop, mail…).
  - Exercise images/animations load from the same CDN as the live demo.
  - `npm run build:mobile`, then open `android/` in Android Studio or `ios/` in Xcode —
    see **docs/MOBILE.md**. `NOTICE.md` now carries an AGPL §7 app-store exception.
- 🤖 **Android APK, no Play Store.** The official build is a signed, sideloadable APK
  (~4.5 MB) from [opengym.duarte-santos.ch](https://opengym.duarte-santos.ch) — deliberately
  store-free. docs/MOBILE.md covers building and signing your own.
- 🍎 **iOS reality check.** Apple permits no installs outside the App Store, so there is no
  iOS download; the docs explain the free options (self-hosted PWA on the home screen, or
  running the native app onto your own iPhone from Xcode).

- 📥 **Import your history from another app.** Settings → Data → *Import from another app*
  reads an export from **FitNotes** (both the Android and the FitNotes 2 iOS format),
  **Strong** and **Hevy**, and pulls body-weight history out of an **Apple Health** export.
  Anything else with a date, an exercise name and weight/reps columns is read too.
  - Every row becomes a set, grouped into workouts by date, so your history arrives with
    its real dates rather than as one lump. Hevy and Strong also carry session length, so
    the activity heatmap fills in properly.
  - Exercise names are matched against the 1,324-exercise library — parenthetical
    qualifiers like "(Barbell)" and shorthand like BB/DB are normalised, and a curated
    table covers the plain names people actually log ("Bench Press", "Squat", "RDL").
    Where a name is genuinely ambiguous it is *not* guessed at: it becomes one of your own
    exercises instead, because filing years of training under the wrong lift is worse than
    an unmatched name you can see and fix.
  - A summary shows what will happen — workouts, sets, how many exercises matched, which
    ones didn't, and whether weights need converting — before anything is written.
  - Importing is idempotent: days you already have data for are left alone, so running it
    twice, or importing from two apps, never duplicates a workout.

## v1.2.1 — 2026-07-23

A muscle map across the app, and a live demo you can try without installing anything.

- 💪 **Muscle map.** Three places now show which muscles your training actually reaches, drawn on a
  front-and-back body diagram shaded like the activity heatmap — more accent means more work.
  - **Stats → Muscle balance** aggregates a week, 30 days, 90 days or everything, lists your
    hardest-worked muscles with their set counts, and names the ones that got *nothing* in that
    period. That last list is the point of the card: the gaps are what you'd otherwise never notice.
    Tap any muscle to read its name and volume.
  - **Routine editor** previews what a session hits as you build it, so a hole in the plan shows up
    before you train around it for a month.
  - **The finish screen** shows what you just trained.
  - Load is counted in *effective sets* — a set counts fully for the exercise's target muscle and
    partially for its supporting ones — not in kilograms, because 100 kg of leg press and 12 kg of
    lateral raise say nothing about which muscle worked harder. Shading is relative within the
    period you're looking at, so the map always reads as a balance rather than an absolute.
  - Settings → Appearance → **Body diagram** switches between a male and female figure.
  - The exercise dataset spells muscles inconsistently ("delts", "deltoids" and "shoulders" are one
    muscle); all 50 spellings it uses are normalised onto the 18 the diagram can draw. Custom
    exercises, which only carry a body part, fall back to it. The geometry is ~90 kB and loads on
    demand, so the initial bundle is unchanged.
- 🐛 **Fixed: finishing a workout from its last exercise could blank the whole app.** The
  per-exercise weight sheet read the running workout without checking it was still there, and
  finishing clears it while that sheet is still on screen.
- ▶️ **Live demo** at [duartesantos8.github.io/openGym](https://duartesantos8.github.io/openGym/) —
  a browser-only build (`VITE_DEMO=1`) published to GitHub Pages on every push to `main`. It boots
  into guest mode with a seeded example profile (12 weeks of Push/Pull/Legs, weigh-ins, PRs) so
  every screen has something to show, and it never talks to a server. Passkeys, sync and the admin
  dashboard stay exclusive to self-hosted instances, which is where the backend lives.
- 🖼️ Builds can point the exercise media elsewhere via `VITE_IMG_BASE` / `VITE_GIF_BASE` — the demo
  serves the ~140 MB dataset from a CDN instead of shipping it. The default (`img/` and `gif/` next
  to the app) is unchanged.

## v1.2.0 — 2026-07-23

A complete visual redesign. Same app, same data — every screen redrawn.

### A designed interface, not an assembled one

- 🎨 **Rebuilt design system.** One type scale carrying hierarchy through size instead of making
  everything bold, a neutral surface ramp instead of saturated blue-greys, hairline separators
  instead of outlined boxes, and motion that acknowledges a press rather than animating for
  decoration. Light and dark are both first-class, and the eight accent colours now pick their
  label colour by measured contrast — the default green in light mode was failing WCAG AA on
  every primary button before.
- ✏️ **A hand-drawn icon set** (77 icons, single stroke weight, drawn on one 24×24 grid) replaces
  every emoji in the interface. Emoji render differently on each platform, sit on their own
  baseline and can't take a theme colour, which is what made the old UI feel stitched together.
  Icons inherit the surrounding text colour and optical size.
- 🏋️ **Routine icons.** Picking an icon for a routine now offers a grouped set — strength,
  equipment, cardio, recovery — instead of an emoji keyboard. Routines you already made keep
  their look: the old emoji are mapped forward automatically, so nothing to migrate and nothing
  to redo.
- ▶️ **New tab bar** with a raised Start button that turns into a pulsing orange Resume while a
  workout is running.
- 🏠 **Home reads as a plan for today** — week strip, today's session as one tappable row, body
  weight, and your streak.

### Charts

- 📈 **Axis labels, gridlines and the target-weight line are visible again** in dark mode. They
  were painted with colour variables that no longer existed, which silently fell back to black
  on black — and to no stroke at all for the lines.
- 💬 **The hover readout stays on screen.** It used to be positioned with a fixed offset that
  assumed one label width, so the first and last point pushed it under the chart's clip; it's now
  placed from its measured size and kept inside the frame, dropping below the point when the
  point sits high enough that the label would cover the value it reports.
- 🖱️ **It also goes away again** — moving off the chart now clears the readout, crosshair and
  marker, which previously stayed until you hovered somewhere else.

## v1.1.3 — 2026-07-22

Admin dashboard for self-hosters (opt-in — off by default), equipment filtering, and
workout-screen fixes.

### Admin dashboard

- 🛠️ **Admin dashboard** (Settings → Admin dashboard) for whoever runs the instance: a users
  overview with workout counts and last-active times, plus a per-user drill-down into their full
  workout history and body-weight log.
- 🟢 **Live "training now"** — see who's mid-workout in real time, with their current exercise and
  set progress, updated by a lightweight heartbeat while a workout is on screen.
- 🚫 **Disable / enable accounts** — a disabled account is signed out and locked out everywhere
  until you re-enable it.
- 🔑 **Invite-only signup** (optional) — require an invite code to create a profile; generate and
  revoke codes from the dashboard. Existing accounts are unaffected.
- ⚙️ Configured via environment: `ADMIN_UIDS` (comma-separated user ids who are admins) and
  `INVITE_ONLY=1`; both default off, so a fresh instance stays open with no admin. See
  `.env.example`. Admin access is gated by your passkey and enforced server-side.

### Exercises & workout

- 🏋️ **Filter exercises by equipment** (#6). A second filter row under the body parts lets you
  narrow the list to what you actually have — body weight, dumbbell, barbell, cable, band, and so
  on — in both the Exercises library and the exercise picker. The options adapt to what you've
  already selected and are ordered by how many exercises use them, so every combination on screen
  has results behind it and the row stays short. Building a bodyweight-only plan is now two taps
  per body part.
- 🔎 **Minimize the exercise animation during a workout** (#12). A ⤡ Minimize / ⤢ Expand button
  on the animation shrinks it to a thin strip so the set rows sit right under your thumb — no more
  scrolling past a big GIF to tick off a set. Your choice is remembered and applied to every
  exercise and future workout until you change it, so you set it once. Tapping the animation still
  pauses/plays it as before.
- ⏱️ **Fixed: the rest timer froze at 0:01** (#14) instead of counting down to the end. It also
  meant the timer could only be cleared with Skip, and a redundant "rest over" push notification
  could still fire.

## v1.1.2 — 2026-07-22

Custom exercises, full localization, and input fixes.

### Custom exercises (#11)

- ✨ **Create your own exercise** from the exercise picker or the Exercises tab: a name and a
  body part is all it takes. Your search text is pre-filled as the name, so "no match" flows
  straight into "create it".
- 📝 **Optional description** — setup, cues, anything you want to remember. It shows on the
  exercise's detail and config sheets (where a built-in exercise would show its animation),
  and it's searchable, so you can find your own exercises by their cues too.
- 🏋️ Custom exercises behave like built-in ones everywhere — routines, supersets, workout
  logging, weight suggestions, PRs, stats and history. The animation stays blank by design.
- 🏃 Pick the *cardio* body part and it logs time + speed instead of weight × reps, like the
  built-in cardio exercises.
- ✏️ Edit (rename, change body part or description) or delete your custom exercises — from
  their detail sheet in the Exercises tab, or straight from the exercise inside a routine via
  "Edit or delete this exercise". Deleting removes them from your routines; already-logged
  workouts keep their sets and still show the exercise name. (The routine sheet's old "Remove
  exercise" button is now labelled "Remove from routine", so the two are no longer confusable.)

### Localization (#7)

- 🌍 **12 UI languages**: English, Deutsch, Español, Français, Italiano, Português, Polski,
  Türkçe, Русский, 中文, 한국어, हिन्दी. Pick yours under Settings → Appearance → Language;
  the choice syncs with your profile like the theme does.
- 📖 **Localized exercise instructions** for 10 of those languages (all except German and
  Portuguese, which the upstream dataset doesn't cover yet — those fall back to English),
  covering all 1,324 exercises. Body-part filters, equipment and muscle tags are translated
  too; exercise *names* stay English (upstream limitation). Custom exercises are translated too.
- 📅 Dates, weekday and month labels follow the selected language.
- ⚡ Zero cost when unused: the app still ships English-only by default. Each UI language is a
  ~7 kB chunk and each instruction pack ~80–120 kB (gzipped), downloaded only when you switch —
  the initial bundle size is unchanged.
- 🛠️ New `scripts/build-instructions.mjs` regenerates the instruction packs from the upstream
  dataset; translations live in `frontend/src/locales/` (PRs welcome — it's one flat
  English-string → translation map per language).
- Known gaps: push notification texts (sent by the server) and plural forms in some languages
  are approximated; happy to take corrections from native speakers.

### Fixes

- ⌨️ Weight and other numeric fields now accept a comma as decimal separator ("33,5") — iOS
  decimal keyboards in many locales only offer a comma, which previously reset the field to 0.
  Partial input like "33," no longer snaps to 0 while typing. (#13)
- 📱 Fixed the exercise-config sheet (Sets / Reps / Weight, and the cardio variant) overflowing the
  screen edge on narrow phones — the Weight stepper was clipped and could make the whole page pan
  sideways in iOS Safari. Steppers now shrink to fit the viewport. (#10)
- 🛡️ Added a global horizontal-overflow guard so a single too-wide element can no longer knock the
  page layout off-scale.

## v1.1.1 — 2026-07-21

Reliability fixes for the push notifications shipped in v1.1.0, found through live testing:

- 🌍 Workout day reminder now fires by each user's own browser-detected timezone instead of a
  single server-wide one — works correctly regardless of where the server runs, and follows you
  automatically if you travel.
- 💾 Settings changes (like the reminder time) are flushed to the server immediately when the tab
  backgrounds or closes, instead of relying solely on a 1.5s debounce that could get cut short.
- ⏱️ Reminder check tightened from a 60s to a 10s interval, and pushes are now marked
  `urgency: 'high'` — cuts avoidable delay on top of it, though delivery time is ultimately up to
  Apple/Google's push relay.
- 🪵 Push send failures are now logged instead of silently swallowed.

## v1.1.0 — 2026-07-21

- 🐳 Prebuilt Docker images published to `ghcr.io/duartesantos8/opengym-{api,web}` (amd64 + arm64)
  via GitHub Actions, so self-hosting no longer requires building from source. `docker compose pull`
  grabs them; `docker compose up -d --build` still builds locally if you'd rather.
- 🔔 Push notifications: rest-timer-over alert (fires even if the app is closed) and an optional
  daily reminder on days you have a workout planned but haven't logged one yet. Opt in per-profile
  in Settings — requires a signed-in passkey profile. Backend gains one dependency (`web-push`);
  VAPID keys are generated on first run.
- 🐛 Fixed the rest timer stalling when the tab/app is backgrounded — it's now anchored to a real
  timestamp instead of a plain per-second counter, so it stays accurate after you come back.

## v1.0.0 — 2026-07-20

First public release. A complete, self-hostable gym & body-weight tracker.

**Highlights**
- ⚖️ Body-weight tracking with an interactive chart + goal line
- 🏋️ Weekly routine planner over 1,324 exercises with animated demos
- ▶️ Guided workouts: body-weight check-in, pre-filled weights, rest timer, PR detection, per-exercise weight tracking
- 🔗 Supersets and 🏃 cardio (time + speed) logging
- 🗓️ Per-day rescheduling without touching your weekly plan
- 🟩 GitHub-style activity heatmap (by time trained)
- 🔑 Passkey (WebAuthn) login with per-profile data that syncs across devices
- 🎨 Light/dark themes + 8 accent colors, synced to your profile
- 📦 JSON export/import, guest mode, PWA install, no telemetry

**Stack**
- React 19 + Vite (React Router, Zustand)
- Node backend, no framework, single dependency (`@simplewebauthn/server`), JSON-file storage
- nginx + multi-stage Docker so `docker compose up` builds and serves everything

**Notes**
- Exercise media (~140 MB) is fetched from [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) on first run.
- Licensed under GNU AGPL v3.0.
