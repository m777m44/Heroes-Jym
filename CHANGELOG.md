# Changelog

All notable changes to **MAHDI-JYM**. Versions follow [semver](https://semver.org/).
History before 2.0.0 is the upstream openGym project's, kept below unchanged.

## v13.0.0 — 2026-10-30

**A food database that knows how you cook it: 521 foods (190 new), each with calories for the
way it is made — Indomie in 41 ways plus a builder, 15 date cakes in three sizes, 45 canned &
processed foods, 74 shop snacks and 15 more Iraqi dishes — in a new Food database screen with
salt and sugar. Every theme now colours the notifications by itself, a bell on Home opens what is
still to come today, themes switch with a soft 0.3 s fade, and screens load when you open them.
Both Android versions have all of it.**
*قاعدة بيانات أطعمة تعرف كيف تطبخ: 521 صنفاً (190 جديداً)، لكل منها سعراتها حسب طريقة التحضير —
الإندومي بـ41 طريقة مع مُنشئ، و15 نوعاً من كيك التمر بثلاثة أحجام، و45 من المعلّبات والمصنّعات،
و74 من سناكات الدكان، و15 أكلة عراقية جديدة — في شاشة جديدة لقاعدة بيانات الأطعمة مع الملح والسكر.
كل ثيم يلوّن الإشعارات تلقائياً، وجرس في الرئيسية يعرض ما تبقّى لليوم، والثيمات تتبدل بتلاشٍ ناعم
خلال 0.3 ثانية، والشاشات تُحمَّل عند فتحها. النسختان على أندرويد فيهما كل ذلك.*

### 🍜 Indomie, worked out from its parts
- **41 ready-made ways** on a new *Instant noodles* shelf: uncooked (dry, with the seasoning,
  sauce, mayonnaise or cheese), boiled & drained (no / half / all the seasoning; + egg, 2 eggs,
  cheese, tuna, chicken, vegetables, mayo, ketchup, hot sauce, sausage), fried in oil (+ fried
  egg, cheese, chicken & vegetables…), with cooking cream, and the chicken, curry, vegetable,
  hot & spicy, Jumbo and cup packs.
- **The Indomie builder** (`lib/foods/indomie.js`): pick the pack, how it is made, the seasoning
  sachets (none / half / all), the sauces and up to three of each add-on — the calories, protein,
  carbs, fat, sodium and sugars follow live. Values are summed from the parts (noodle block,
  powder, seasoning oil, sauces, frying oil, cream, add-ons) so **kcal = 4p + 4c + 9f** always
  holds; draining keeps ~90 % of the block's fat and ~60 % of its salt, frying adds the oil it
  soaks up. Add-ons: egg +70, cheese +79, mayo +92, ketchup +19, hot sauce +14, tuna (80 g) +121,
  chicken (100 g) +165, vegetables +31 kcal.
- A mix that matches a ready-made way is logged as that food; any other mix keeps its recipe in
  the log entry (`ind`), so its name is rebuilt in Arabic or English whenever it is shown.

### 🍰 Date cakes, canned food, shop snacks, Iraqi dishes
- **15 date cakes** (plain, chocolate, cream, nuts, coconut, honey, cheese, vegan, gluten-free,
  oats, Lotus, tahini, toffee, cardamom & saffron, banana), per 100 g, in **small 50 g / medium
  100 g / large 150 g**.
- **45 canned & processed foods**: tuna (water, oil, drained, chili), corned beef, canned beef and
  chicken, luncheon and mortadella, sardines, mackerel, salmon, foul, chickpeas, hummus, beans,
  lentils, corn, peas, vegetables, mushrooms, tomatoes, okra, molokhia, olives, pickles, stuffed
  vine leaves, makdous, fruit in syrup, condensed and evaporated milk, qishta, soups… Foul and
  baked beans come as half or whole cans.
- **74 shop snacks**: chips (Lay's, Doritos, Pringles, Cheetos, Takis…), crackers, chocolate bars
  (Snickers, KitKat, Twix, Mars, Bounty, Galaxy, Kinder, Ferrero…), sweets and gum, biscuits
  (Oreo, Lotus, digestives), cakes and pastries (donuts, muffins, brownie, cheesecake), ice cream
  (Magnum, Cornetto…), café drinks (latte, Spanish latte, mocha, frappuccino, karak) and bars.
- **15 more Iraqi dishes** — fesenjoon, aroog, masgouf plate, chicken & potato tray, chicken quzi,
  tray kubba, dolma with ribs, laffat aroog / bagilla / geymar, meat boorak, carrot and semolina
  halwa, shakarlama, qatayef — and an *Iraqi* tag on 136 foods.
- New rows carry **sodium and sugars** and their **per 100 g** values; packets, bags, bars,
  sticks and boxes are new serving units. A can is millilitres only on the drinks shelf.

### 📖 The food database (`/foods`)
- Search in Arabic or English, shelves (All, Iraqi and every category with its count), sorting by
  the usual order, fewest calories or most protein. Each row shows protein / carbs / fat, how it
  is made and a *Salty* tag at 800 mg of sodium or more.
- A food's card: sizes (or ×0.5 – ×3), calories with the share of each macro, sodium against the
  2,000 mg daily limit, sugars against the 25 g aim, the values per 100 g, a favourite star, the
  meal, and *Add*. Indomie opens the builder.
- Reached from Food, Tools (a new tile), the Add food sheet (and *Build your Indomie* when you
  search for it), the Home shortcuts and the 🔍 quick search — which now finds every food.
- Lists draw 40 rows at a time and the next ones as you scroll (`components/LazyList.jsx`, with
  `content-visibility` on rows) — also in the Add food sheet.

### 🎨 Notifications in your theme
- `notifColor(S)` (themes.js) works the colour out from your data — the theme (its light or dark
  twin when following the phone) or the accent you picked; the classic green when
  "Notifications in the theme's colours" is off. Every reminder uses it: workout, burn plan,
  medicines, "Your day", schedule, water (iOS), the step counter, milestones and the test
  notification.
- The colour is part of every reminder signature, so reminders already waiting are re-made with
  a new theme — also when the phone flips light/dark.
- Android channels get the theme's **light colour** (workout, schedule, water and the JS-made
  channels; Android applies it when a channel is first created).
- A **Notification colour** card on the Notifications screen previews a reminder in the shade,
  with the switch; the **bell on Home** shows how many reminders are still to ring today and opens
  the **notification panel** (`lib/upcoming.js`, shared with the Notifications screen).

### ✨ Smoother and faster
- **Theme switch in 0.3 s:** a View Transition cross-fade where the browser has it, else a short
  colour transition on the main surfaces for the moment of the switch only; instant with reduced
  motion (`lib/themeSwitch.js`).
- **Buttons:** one documented set — primary, the new **secondary**, tinted, ghost, danger — with a
  **`loading`** state (spinner, `aria-busy`); buttons and switches are `type="button"`.
- **Code splitting:** every screen but Home loads on first use; the tab screens are fetched in the
  background once the app is idle. The first-start bundle drops from 804 kB to 632 kB (254 → 205
  kB gzipped). Exercise pictures and weigh-in photos load lazily. Search uses
  `useDeferredValue`; rows are memoised.

### 🧪 Tests & CI
- `src/lib/v13.test.js` (20 tests: shelves and counts, kcal vs macros, Indomie maths and
  ordering, add-ons, salt, normalising, sizes, Arabic for every new name / unit / size / part,
  `notifColor` for all 1,442 themes, the theme-switch animation); the Arabic UI guard renders
  the food database, every new food's card, the builder for each ready-made way, the amount
  sheet with sizes and the notification panel. 732 Vitest tests in all.
- **Playwright** end-to-end tests (`frontend/e2e/`, `npm run e2e`) on the demo build in Chromium:
  the main screens with no console errors, the food database (lazy list, shelf, search, card),
  date-cake sizes, the Indomie builder into the log, the notification colour, Arabic RTL. A new
  `e2e` job in the Tests workflow.
- **GitHub Pages:** `page_build` re-runs the deploy right after GitHub's own branch build, so
  the website, the web app and the demo always win while the Pages source is still a branch.
- 320 new Arabic strings (`scripts/i18n/13.0a.json`, `13.0b.json`); 4,908 keys, in sync.

## v12.0.0 — 2026-10-24

**Two Android versions with the same features — full (offline, everything inside) and light
(online, a small download that loads exercise media and pictures from this repository) — and the
real app on GitHub Pages as a web app. Updates inside the app. Any emoji typed with your keyboard
as your profile picture, ready-made pictures from the repository or a photo from your phone. 144
soft drinks (compare any two), 147 drinks and juices, 111 nuts, seeds and sweets. Arabic and
English only.**
*نسختا أندرويد بالمزايا نفسها — الكاملة (أوفلاين، كل شيء بداخلها) والخفيفة (أونلاين، تنزيل صغير
يحمّل حركات التمارين والصور من المستودع) — والتطبيق الحقيقي على صفحات جيت هب كتطبيق ويب. التحديثات
داخل التطبيق. أي إيموجي تكتبه بلوحة المفاتيح صورةً لملفك، أو صور جاهزة من المستودع، أو صورة من
هاتفك. 144 مشروبًا غازيًا (قارن أي اثنين)، 147 مشروبًا وعصيرًا، 111 من المكسرات والبذور والحلويات.
العربية والإنجليزية فقط.*

### 📦 Two versions, the same app
- **`MAHDI-JYM.apk` — full (offline):** everything inside — all 1,324 exercise images and
  animations, the wallpapers and the profile pictures. Works with no internet at all. The old
  download link keeps pointing at it.
- **`MAHDI-JYM-online.apk` — light (online):** the same code and features; exercise media come
  from the exercise dataset and the wallpapers / profile pictures from this repository through
  jsDelivr, pinned to a commit, when they are shown (and are cached). Wallpaper thumbnails and
  sounds stay inside, so the pickers work offline. `npm run build:mobile` builds it
  (`scripts/slim-online.mjs` drops the local copies); CI fails it above 40 MB.
- Same app id, signature and version code — install one over the other and your data stays.
- Every release ships both APKs plus `-v12.0.0` copies and `SHA256SUMS`.

### 🌐 GitHub Pages: the website, the web app and the demo
- **https://m777m44.github.io/Heroes-Jym/** — the website (English and Arabic), with all links
  relative so it works under the project path.
- **`/app/` — the web app** (`VITE_WEBAPP=1`): the real app with your own data in the browser —
  no server, no account; back it up with Settings → Data → Export.
- **`/demo/`** keeps its example data apart: its storage lives under a `demo:` prefix and it has
  its own IndexedDB and caches, so it never touches the web app's data on the same origin.

### 🔄 Updates in the app
- Settings → **App & updates**: your version and which one it is (full, light, web app), *Check
  for updates* against the newest GitHub release, the matching download with its size, and the
  other versions.
- On Android it checks quietly at most once a day and tells you once when a new version is out.

### 🙂 Profile picture
- **Type any emoji** with the keyboard — flags, skin tones and families too — or two letters;
  the last 12 you typed stay one tap away.
- **Ready-made pictures** kept in the repository (lion, tiger, wolf, falcon, Arabian horse,
  lifter, footballer, boxer, runner, superhero) and the wallpaper photos (nature, seas, anime).
- Or a photo from your phone, as before.

### 🥤 Soft drinks: 48 → 144
- Many more colas, lemon-lime, fruit sodas, mixers, malt drinks, energy drinks and homemade
  sodas, and two new groups: **iced teas** and **sports drinks**.
- **Compare any two** side by side at the same size: calories, sugar in teaspoons, caffeine,
  sodium and the walk that burns it — and which is lighter, by how much.
- **Caffeine for teens:** under 18 the meters count against about 100 mg a day instead of the
  adult 400 mg; today's caffeine shows next to today's sugar.

### 🍹 Drinks & juices: 88 → 147
- Iraqi classics: sage tea (maramiya), cinnamon & clove tea, saffron & cardamom milk,
  pomegranate lemonade, raqqi, mishmish and guava juice, pistachio milk, dibis w rashi milk.
- More for weight loss, digestion, energy, protein, immunity, sleep and hydration — matcha,
  kefir, soy milk, whey shakes, infused waters, coolers and warm milks — each worked out from
  its ingredients, with notes and cautions.

### 🥜 Nuts, seeds & sweets: 47 → 111
- A new group, **nut butters & tahini** (counted in your daily handful).
- Shelled pistachios and sunflower seeds, white seeds, hemp, poppy and black seed; spicy cashews,
  chilli peanuts, spicy kerzat, soy nuts, roasted peas and broad beans; Iraqi street snacks —
  **bagilla**, **lablabi**, boiled peanuts — edamame and fresh coconut.
- More dates (sukkari, ajwa, sayer, halawi, khadrawi, deglet nour), dried fruit, and the sweets
  of Iraqi gatherings: mann al-sama, baklawa, kleicha, halqoum, halawa, sweet kerzat.
- New drawings: jars of nut butter, beans, dried-fruit strips, baklawa, kleicha and halqoum.

### 🌍 Languages
- **Arabic and English only** — the other 11 languages and their instruction packs are gone,
  making every build smaller and faster. Everything new is translated into Arabic.

## v11.0.0 — 2026-10-24

**Your school week on your own times — up at 7:00, water, breakfast, get ready, school
7:30–12:40 with nothing inside it, home, water, lunch and a drink — and the rest of the day and the
weekend organised for you, every meal with its calories. Many more nuts (with their Iraqi names,
dried fruits and dates), Iraqi drinks and everyday Iraqi food, a real profile picture, the walk
"From Zakho to Fao", water in any amount with your pace, Iraq themes — and no more buzzing on
every tap.**
*أسبوع الدوام بأوقاتك أنت — استيقاظ 7:00، ماء، فطور، تجهّز، دوام 7:30–12:40 بلا أي شيء داخله، رجوع، ماء، غداء ومشروب — وباقي اليوم والعطلة منظّمة لك وكل وجبة بسعراتها. مكسرات أكثر بكثير بأسمائها العراقية مع الفواكه المجففة والتمور، ومشروبات وأكلات عراقية يومية، وصورة شخصية حقيقية، ورحلة «من زاخو إلى الفاو»، والماء بأي كمية مع معرفة تقدّمك، وثيمات العراق — ولا اهتزاز مع كل لمسة بعد الآن.*

### 🏫 The school week, rebuilt (My schedule → School week)
- **Sunday–Thursday, your times:** 07:00 wake up · 07:15 water (250 ml) · 07:20 breakfast (two
  boiled eggs and bread, 321 kcal) · 07:25 get ready (clothes, school bag, a water bottle) ·
  07:30–12:40 school, with no rest, water or food inside it · 12:40 back home · 12:50 water ·
  13:00 lunch · 13:40 a drink (noomi Basra).
- **The rest of the day:** a nap, homework (the hardest subject first), a snack (almonds and an
  apple), water, phone & games, review, a workout (Sun, Tue, Thu) or a walk / football (Mon,
  Wed), water, family time, **dinner with water after it** (cheese, bread, cucumber, tomato and
  olives), some free time, the school bag, **a light snack before bed — warm milk with cardamom
  and dates** — getting ready for bed, and sleep at 22:00 (9 hours).
- **A different Iraqi lunch every school day:** rice with fasolia, chicken with rice, rice with
  bamia, dolma with laban, biryani — each with its calories.
- **Friday and Saturday:** sleep in until 9:00, an Iraqi breakfast with tea (kahi and geymar on
  Friday), review or homework, phone & games, helping at home, lunch (dolma on Friday, masgouf on
  Saturday), tea, a nap, kerzat and fruit, football with friends or a workout, visiting
  relatives — and the same evening. Thursday and Friday nights run until 23:30.
- About 2,400 ml of water and every block's calories, protein, carbs and fat through the day.
  School keeps its time when you press +10; "Phone & games", family and free time don't ring.
- A school week made before 11.0 is **offered** the new one (Update / Keep mine) — never forced.

### 📅 My schedule
- The timeline is grouped into **morning, afternoon, evening and night**, each with its number of
  blocks and calories; the day shows its **protein, carbs and fat**.
- **Foods from the database** can go into any block ("Add a food": eggs, bread, rice, stews,
  fruit…), counted per serving and logged to the food diary with "Log & done".
- Blocks can have **their own icon** (phone & games, football, TV, family, school bag, clothes…),
  quantities show in the timeline ("Boiled egg ×2"), and template notes appear in your language.
- Fixed: a food item in a block was counted per 100 g instead of per serving.

### 🥜 Nuts, seeds, dried fruits and dates — 47 in all, with their Iraqi names
- New: melon seeds (حب بطيخ), lemon-salted pistachios, acorns (بلوط), royal kerzat, seed kerzat,
  popcorn (شامية), roasted corn, lupini (ترمس), crunchy coated peanuts.
- **Dried fruits & dates:** raisins (زبيب), golden raisins (كشمش), zahdi, khastawi, barhi and
  medjool dates — weighed with or without the stone — dried figs, apricots, qamar al-din, dried
  mulberries, prunes (عنجاص), banana chips.
- **Sweet & coated:** sugared almonds (ملبّس), sugar-coated chickpeas, chocolate nuts, simsimiya,
  jowziya, dates stuffed with almonds — with a sugar caution.
- Each one drawn (an acorn in its cap, popcorn, dates in their own colours, a sheet of qamar
  al-din, sesame and walnut bars…); a handful of popcorn or lupini weighs what it really weighs;
  only nuts and seeds count towards the daily handful.

### 🥤 Iraqi drinks — 88 in all, 38 Iraqi
- Tea with milk, tea with lemon, mint tea, hot cocoa, warm milk with dibis, Turkish coffee,
  Nescafé with milk, fresh lemonade, hamudh hilu, and the juice shop: orange, carrot, apple,
  grape and mango juice, banana milk, strawberry milk and the Iraqi juice cocktail — each with
  its recipe, calories worked out from the ingredients and a one-line story.

### 🍳 Everyday Iraqi food
- An Iraqi breakfast plate, two boiled eggs with samoon, two fried eggs with bread, cheese,
  olives and bread, timman with fasolia or bamia, green bean stew, sheikh mahshi, makarona,
  shifta, cheese / labneh / chips sandwiches, halawa with bread, popcorn, arnoos, amba and
  instant coffee 3-in-1.

### 👤 A real profile picture
- Your own photo from the phone (cropped to a circle, kept small, stays in your backups), or one
  of **270+ symbols** in groups — faces, sports, animals, nature, food, Iraq, things, hearts — or
  36 icons or your initial, on **24 colours**. Your choice wins over the Google account photo.

### 🚶 Walking
- **From Zakho to Fao:** all your steps as a walk across Iraq — Zakho, Duhok, Mosul, Erbil,
  Kirkuk, Tikrit, Samarra, Baghdad, Babylon, Karbala, Najaf, Diwaniyah, Samawah, Nasiriyah,
  Basra, Fao (1,360 km) — on a small map, with the next stop and laps.
- **The last five weeks** as a calendar, each day shaded by how close it came to the goal.

### 💧 Water
- **Any amount** (25 ml–1.5 L, quick sizes up to a 1.5 L bottle), or take some back — undoable.
- **Your pace:** how much should be in by now, ahead or behind, and the ml an hour still needed.

### 🎨 Iraq themes — 1,442 curated themes
- A new **Iraq** category: Tigris, Euphrates, Ishtar blue, Baghdad nights, Basra palms, Mosul
  marble, Erbil citadel, Samarra, the marshes, Kurdistan mountains, Sumer, Ur ziggurat, Iraqi
  dates, Halabja pomegranate, qamar al-din and the Iraq flag — every accent readable (≥ 3:1).

### ✋ Feel
- **The light vibration on every tap and swipe is off by default** (Settings → Vibrate on tap
  brings it back). Milestone, goal, countdown and set haptics stay.

### Quality
- 692 web tests (new: the school week on your times, parts of the day, foods in blocks, the new
  nuts, water pace, the journey, the profile picture helpers, the drinks and foods); the Arabic UI
  guard covers the new sheets; 12 locales × 4,262 keys in sync.

## v10.0.0 — 2026-10-24

**Soft drinks in every can, bottle and glass, nuts & seeds by the handful, and "My schedule" —
arrange school, meals, drinks, work and anything else yourself, on the days you choose, with
reminders that show everything you wrote and chose (Done ✓ and In 10 min right on the
notification). A school-week template (7:30–12:40, Sunday to Thursday), a notifications centre,
tidier notification settings, and many fixes.**
*مشروبات غازية بكل قوطية وبطل وكلاص وبكل الأحجام، ومكسرات وحَب بالحفنة، و«جدولي» — رتّب المدرسة والأكل والشرب والعمل وكل شيء بنفسك على الأيام التي تختارها، مع تذكيرات تعرض كل ما كتبته واخترته (وزرّا «تم ✓» و«بعد 10 دقائق» على الإشعار نفسه). قالب أسبوع الدوام (7:30–12:40 من الأحد إلى الخميس)، ومركز للإشعارات، وإعدادات إشعارات مرتّبة، وإصلاحات كثيرة.*

### 🥤 Soft drinks (new screen: Tools → Soft drinks, `/sodas`)
- 48 drinks: colas (Coca-Cola, Pepsi and their zero / diet versions, Kinza), lemon-lime (7Up,
  Sprite, Mountain Dew), fruit sodas (Mirinda, Fanta, Shani, Vimto), soda and sparkling water,
  tonic, ginger ale, 0.0 % malt drinks (Barbican flavours, Moussy, Fayrouz), energy drinks (Red
  Bull, Power Horse, Monster, Sting) and homemade sodas (mint & lemon soda, mojitos, rose soda,
  sparkling doogh).
- Every drink in the packs it is sold in — a can (150–500 ml, slim for energy drinks), a plastic
  bottle (250 ml–2.25 L), a glass bottle, a glass with ice, lemon and mint, a restaurant cup —
  drawn in its own colours (generic, no logos). The pack grows with the size; in the drink's sheet
  bubbles rise, the fizz pops and a shine passes over it.
- Calories, sugar in teaspoons (with sugar cubes) against the WHO daily limit, caffeine against
  the 400 mg day, sodium, carbs, the minutes of brisk walking that burn it, and the sugar-free
  twin with what switching saves. A big bottle suggests logging one glass.
- Logged to the right meal with its size ("Pepsi · 500 ml"); plain soda water and zero drinks
  without caffeine can count towards water. Today's soft drinks, sugar and recent picks on top.

### 🥜 Nuts & seeds (new screen: Tools → Nuts & seeds, `/nuts`)
- Pistachios, peanuts, almonds, walnuts, cashews, hazelnuts, pine nuts, macadamia, Brazil nuts,
  pecans, roasted chestnuts, sunflower, watermelon and pumpkin seeds, sesame, chia, flax, roasted
  chickpeas, dried coconut and **kerzat** (mixed nuts & seeds).
- Raw, roasted or roasted & salted; counted in handfuls, grams, pieces or spoons; weighed with
  or without the shell (the edible share is worked out). Calories, protein, fat, carbs, fibre,
  sugar, sodium, what it is rich in, why it is good for you and its cautions (allergies, salt,
  selenium, choking risk for small children).
- Each nut drawn — a pistachio opening its shell, a peanut in its pod, the striped sunflower seed
  … — bobbing in a small bowl, salted ones sparkling. A nut of the day and today's handful ring.

### 📅 My schedule (the day plan, rebuilt — `/dayplan`)
- **Arrange everything yourself:** every block has a kind (now also School, Prayer and Other), your
  own title, a start **and** end time, the weekdays it runs on (every day, school days, the weekend
  or any days), its own reminder (off, at the start, or 5–60 minutes before), notes, and food,
  drinks, soft drinks and nuts with their calories.
- **School week template:** school 7:30–12:40 Sunday to Thursday, then lunch, rest, homework, a
  snack, work, water, a workout, a recovery drink and dinner; Friday and Saturday have their own
  calmer plan.
- A week strip (Saturday first) shows and edits each day; copy a day onto other days. Your own
  blocks keep their times — overlaps are allowed (a water break during school).
- **+10 in the live view is for today only:** the block now gets 10 more minutes and the blocks
  after it move later up to the next one at a fixed time (school, prayer, sleep) — the schedule and
  the other days stay as they are, and the reminders follow today's new times. *Stop today's plan*
  no longer switches off *Run it every day*.
- **Reminders that show everything:** on Android each block rings as its own notification with
  the time, your notes and the food and drinks with their calories, in the block's colour, with
  **Done ✓** (logs what you planned, even with the app closed — applied when it opens) and **In
  10 min**. Each block has its own alarm on the phone that works out its next day and re-arms
  itself after ringing and after a reboot, so the whole schedule keeps reminding week after week
  even if the app is not opened; on iPhone they repeat weekly. A new schedule turns them on. A
  reminder still showing goes away when its block is done, skipped, deleted or changed. Reminders
  follow a change of the phone's clock or time zone (water reminders too).

### 🔔 Notifications
- A notifications centre (`/notifications`, from Settings and Tools): which reminders are on —
  schedule, water, workouts, your day, medicines, the burn plan, a running fast — and one timeline
  of everything still to ring today; a test notification and the phone's settings.
- The phone's notification settings are grouped: steps & activity, water, schedule & meals,
  workouts, health & medicines.

### ✨ Everywhere
- Tools grouped by kind with the new tiles; Home shortcuts for soft drinks and nuts; Home's plan
  card counts long blocks in hours and shows your note.
- Quick search finds every soft drink, nut and drink by name and opens it; the food search shows
  soft drinks and nuts too, and the food log draws them with their size.
- Every new string in all 13 languages (4,058 keys each); "What's new" shows the 10.0 highlights.

### 🛠 Fixes
- Drinks are logged to the meal of the time of day (they always went to snacks).
- After midnight a log goes to snacks, not breakfast.
- Sugary soft drinks count in the food screen's "sweet drinks and sweets" pointer.
- Nuts weighed in the shell keep their amount when you switch between grams and handfuls.
- The fasting reminder has its own notification id — it shared one with the burn plan's first
  reminder, so ending a fast could take that one away.
- New tests: soft-drink and nut maths, the school week, weekday blocks, reminders a week ahead
  and what they say; the Arabic screen guard covers every new screen and sheet.

## v9.0.0 — 2026-10-23

**Drinks & juices with calories worked out from the ingredients, your own drink builder, 28 new
Iraqi dishes, a day plan that runs live (study, work, workout, rest, meals, drinks), six new
celebration sound packs, the theme on Android's notification shade and status bar, ten sea
wallpapers — and a long list of battery fixes.**
*مشروبات وعصائر بسعرات محسوبة من المكوّنات، وصانع مشروباتك الخاصة، و28 طبقًا عراقيًا جديدًا، وخطة يوم تعمل مباشرة (دراسة وعمل وتمرين وراحة ووجبات ومشروبات)، وست حزم أصوات احتفال جديدة، وألوان الثيم في لوحة الإشعارات وشريط الحالة، وعشر خلفيات بحرية — مع إصلاحات كثيرة لاستهلاك البطارية.*

### 🥤 Drinks & juices (new screen: Tools → Drinks & juices, `/drinks`)
- **71 drinks** in eight groups — weight loss, digestion, **Iraqi classics** (shineena, Iraqi tea
  with cardamom, noomi Basra, Mosul's zbeeb, tamur hindi, qamar al-din, sous, sahlab, darseen with
  walnuts, mastaw, rose and mulberry sharbat…), energy & pre-workout, protein & recovery, immunity,
  sleep & calm and hydration. Search in both languages, hot / cold / under 100 kcal filters,
  favourites, a drink of the day and your recent drinks.
- **Calories from the ingredients**: a new ingredient table (kcal, protein, carbs, fat, sugar,
  density and household measures) so g, ml, tsp, tbsp, cup and pieces all convert the same way.
  Juices are their own ingredients (pressing leaves the pulp behind), steeped tea, herbs and infused
  fruit only count the little they give to the water, and optional sugar or honey shows as
  "+21 kcal". Each recipe has steps, why it's good for you, the best time, caffeine / milk / nut
  flags and cautions where they matter (liquorice and blood pressure, grapefruit and medicines…).
- **Log a drink** in one tap: an exact food-log entry, and the water it adds counted towards the
  water goal.
- **Create your drink**: pick ingredients, amounts and units and watch the calories, sugar and water
  add up live; save it to *My drinks*, edit it, or start from any library drink with
  *Make my own version*.
- Every drink is drawn — its own glass (tall glass, mug, the Iraqi istikan on its saucer, a jug, a
  finjan, a shaker) filled with its colour, with ice, steam, lemon or mint.

### 🌴 The Iraqi kitchen (Kitchen)
- **28 new Iraqi dishes** with ingredients, steps and calories per serving: masgouf, Kubba Mosul,
  Kubbat Halab, kubba hamudh, bulgur and potato kubba, timman bagilla, timman jazar, quzi, mutabbaq
  simach, margat qarnabeet and shijar, qormah sabzi, qeema, harissa, lablabi, shalgham, shorbat
  khudra, lamb and chicken tikka, Iraqi salad, yaprakh, dijaj mahshi, shifta, baked sambusa,
  burghul bil-hummus, a lighter date kleicha and fish in tamarind sauce. 50 Iraqi recipes in all,
  an **Iraqi** filter, and a healthy tip on many (bake instead of fry, a lean cut, less rice…).
- Steps are now short templates translated once ("Sauté over medium heat for 10 min: …"), so new
  recipes are fully translated in all 13 languages.

### 📅 Day plan (`/dayplan`)
- Pick a template — **workout day, study day, student athlete, rest day, Ramadan** (from your suhoor
  and iftar) or from scratch — laid out between your wake-up and sleep times. Every block can be
  edited: study, work, workout, rest, meal, drink, water break, walk, free time, sleep.
- **Accurate food and drink**: plan the dishes (kitchen recipes) and drinks of each meal; the meal
  targets share what is left of your daily goal after the planned drinks, and the totals show
  planned calories, water, study and moving time.
- **Start my day** and it runs live: the block now with a countdown ring, what comes next, +10
  minutes, skip, and *Log & done* — which logs exactly the planned dishes and drinks. Home shows the
  current block. On the phone each block can remind you, in your theme colour (date-specific, today
  and — with *Run it every day* — tomorrow).

### 🎺 Celebration sounds
- **Six new packs**: Champion (stadium hit, brass, choir, crowd), Epic (taiko, deep brass, choir),
  Neon (electronic build-up and drop), Royal (trumpet fanfare and timpani), Arcade (8-bit) and Zen
  (singing bowls and marimba) — plus the classic one. Pick and preview each moment, and set the
  volume, in **Settings → Celebration sound**. Fasting and the interval timer now celebrate with
  sound too.
- The sounds are rendered by `frontend/scripts/build-sounds.py` (no samples — synthesized, with a
  hall and mastering for phone speakers) and the Android lock-screen celebration plays the same
  files.

### 🎨 Your theme everywhere
- The **live notification** takes the theme's accent (rings, numbers, icon) and, on Android 12+, a
  deep themed card behind the expanded view; the water panel, reminders and workout notifications
  follow too (*Settings → Theme colours in notifications*).
- The **status bar and navigation bar** glide to the theme's colour with dark or light icons.
- A new in-app notification bar (toast), a slim accent scroll indicator while scrolling, smoother
  entrance animations, and new art wallpapers (lagoon, deep sea, palm grove, Babylon).
- **Ten new sea and ocean wallpapers** (Wallpapers → Seas).

### 🔋 Battery
- With the screen off the step counter no longer redraws its notification or the widget every
  second, nor wakes the app — the hardware counter keeps every step, and all of it is shown the
  moment the screen comes on. The per-step detector rests while the screen is off.
- The step store writes to disk at most every 15 s instead of on every step (62 days of history
  were re-written each time).
- The watchdog no longer wakes the phone every 15 minutes (it checks every 30, when the phone is
  awake anyway).
- The web app only hears live steps while it is on screen; its 1-second tick and 5-second save stop
  in the background.
- Sounds release the audio hardware when they end (an idle Web Audio context kept running), the
  voice engine is let go after a quiet minute and a half.
- Endless decorative animations now loop a few times and rest, and a **battery saver** (Auto at 20%,
  or always on) stops looping decorations and heavy blur.

### 🛠 Fixes (review of PR #11)
- Signing in with Google, or linking a backup file, never replaces local data silently when that
  data is only food, fasting, health, water or drinks — every log counts now.
- Switching off "Water in the notifications" removes the panel at once (a reminder that is up
  stays).
- Picking an existing Drive file remembers its real size, so a shorter backup can't leave the old
  file's tail behind on providers that don't truncate.
- A Drive file that can be read but not written is restored but not kept as the auto-save file,
  and the welcome screen now says so ("new changes stay on this phone") instead of promising
  that every change is saved to it.
- Sleep in the health log uses age-specific ranges for children (AASM).
- "Your day" reminders are now date-specific instead of repeating yesterday's plan, and are
  scheduled a week ahead — they keep coming when the app stays closed for days.
- Medicine reminders: every dose time gets its notification — all 20 medicines × 6 times, not
  only the first 60.
- Automatic on-device backups also keep profiles that only log food, drinks, fasting, intervals
  or breathing.
- Water logged and taken back from the notification while the app is closed keeps its newer
  change time, so an older copy from another device can't overwrite the day's total.

## v8.0.0 — 2026-10-23

**Google Drive that works with no setup, direct "Sign in with Google" on the web too, and a new
Tools hub: an interval timer, guided breathing, a fasting tracker with Ramadan mode, muscle
recovery on the body map and heart-rate zones — plus quick search, your own profile and avatar,
and a "What's new" tour.**
*Google Drive يعمل دون أي إعداد، وتسجيل دخول مباشر بحساب Google على الويب أيضًا، ومركز أدوات جديد: مؤقّت فترات (تاباتا وهيت وإيموم)، وتنفّس موجَّه، ومتتبّع صيام مع وضع رمضان، وتعافي العضلات على خريطة الجسم، ومناطق نبض القلب — مع بحث سريع، وملف شخصي وصورة رمزية، وجولة «ما الجديد».*

### ☁️ Google Drive — no setup (the fix for saving to the Google account)
- Until now, saving to Google Drive needed a one-time Google Cloud registration of the app; without
  it the data only went through Android Backup, which uploads slowly and can't be seen. **8.0 saves
  to a real file in your own Google Drive** — picked once in Android's file picker
  (*☰ → Drive → Save*), then rewritten a moment after every change. It works **with or without**
  signing in, and needs no Google Cloud project, client ID or Drive API.
- **Restore from Google Drive** on the first screen (and in Settings / Backups) brings everything
  back on a new phone: pick the file and it's restored. If both the file and the phone have data,
  the app asks which to keep — and writes nothing until you choose. A file that isn't MAHDI-JYM
  data is never touched.
- Several phones can share the file: a newer copy written by another phone is taken in, while
  this phone's own newer changes win. Whatever a restore replaces can be undone once.
- Clear states for everything that can go wrong: the permission gone after a reinstall
  (*Reconnect Google Drive* — the file name is remembered through Android Backup), the file
  deleted or moved, a passing write error (retried automatically).
- After signing in with Google, if the Drive API isn't set up the app goes straight on to
  *Save to your Google Drive too*, with the three taps shown. **Settings → Google account** lists
  every place your data is saved: Android Backup, the Google Drive file, the Drive app folder.
- Android: a new `DriveFile` plugin (Storage Access Framework, persistable permissions, truncating
  writes with a safe fallback), unit-tested in `DriveFileMathTest`.

### 🔑 Sign in with Google on the web (self-hosted)
- Set `GOOGLE_CLIENT_ID` (a Web OAuth client) and the login screen gets Google's official
  **Sign in with Google** button next to passkeys. The server verifies Google's signed ID token
  itself (RS256 against Google's published keys, audience, issuer, expiry, verified email) with
  `node:crypto` only — no new dependency, no client secret.
- The first Google sign-in creates a profile (data already in the browser moves into it;
  `INVITE_ONLY` still asks for a code); later sign-ins find it by the Google account's stable id.
  **Settings → Account** can link or unlink Google (unlinking only while a passkey remains).

### 🧰 Tools hub — new
- **Interval timer**: Tabata, HIIT 40/20 and 30/30, EMOM, sprints, boxing rounds or your own
  (work, rest, rounds, sets, set breaks, get-ready, cool-down). A big ring, the phase in colour,
  3-2-1 beeps, voice cues ("Last round!", "Halfway"), haptics, the screen kept on, pause / skip,
  and a log with calories. Time is derived from the start, so it stays exact with the screen locked.
- **Breathe**: box breathing, 4-7-8, coherent breathing and a quick recovery breath, with an orb
  that grows and shrinks with your breath (drawn per frame), a soft tick or voice at each step,
  1–10 minute sessions and your practice time.
- **Fasting tracker**: 12:12 to one meal a day, your own length, or **Ramadan** (from suhoor to
  iftar at your times). A live ring with stage markers, the stage your body is roughly in, a
  timeline, "I started earlier", streaks, the last 7 days, and a notification when it's done
  (on the phone). A running fast shows on Home.
- **Muscle recovery**: how ready each muscle is from your last five days of sets, on the body map
  (red → ready), the hours until each is ready, and the routine of your plan that fits best today.
- **Heart-rate zones**: your five zones from your age (Tanaka max HR) and, with a resting pulse
  (taken from the health log when there is one), the Karvonen method.

### ✨ Everywhere else
- **Home**: your avatar and name in a new header ("Good morning · Friday 23 October"), a row of
  quick tools, and the 🔍 **quick search** — screens, tools, settings, your routines and all 1,300+
  exercises, in your language or English, ignoring accents and Arabic diacritics.
- **Profile**: your name, an icon avatar and a colour (or your Google photo).
- **What's new** opens once after updating; new celebrations for a finished fast and timer.
- 266 new strings in all 13 languages; the Arabic guard test now also covers every new screen.

## v7.2.0 — 2026-10-23

**A timer for every workout with a 3 · 2 · 1 countdown, a finish with a medium vibration and a
celebration fanfare, 131 Iraqi dishes and fruits, your own foods with calories worked out for you,
and a redesigned notification with food calories in both its small and big views.**
*مؤقت لكل تمرين مع عدّ تنازلي ٣ · ٢ · ١، ونهاية باهتزاز متوسط ولحن احتفالي، و١٣١ أكلة عراقية وفاكهة، وأكلاتك الخاصة بسعرات يحسبها التطبيق، وإشعار بتصميم جديد يعرض سعرات الأكل في الوضعين الصغير والكبير.*

### ⏱ Workout timer
- **Starting any workout** shows a full-screen **3 · 2 · 1 · GO** with a ring, a soft tick and a
  light tap each second (tap to skip; can be turned off in Settings).
- The workout screen opens with a **live clock card**: elapsed time, a sets ring, sets done and
  calories burned so far. The centre tab shows the running time too.
- **The finish**: a professional **medium-strength vibration** (three firm pulses) and a short,
  elegant **celebration fanfare**, the full-screen celebration, then an animated summary —
  duration, calories, volume, sets, new records and the muscles you trained.

### 🍲 131 new foods — Iraqi dishes and fruits (313 in all)
- Dolma, every kind of kubba, tashreeb, pacha, masgouf, quzi, tepsi, maqluba, Iraqi breads,
  kahi with geymar and date syrup, kleicha, zalabia, luqaimat, Iraqi tea and drinks…
- Fruits: **pomegranate** (half, whole, seeds, juice), mulberries, quince, Barhi and other dates,
  figs, apricots, plums, citrus, melons and more — each with calories, protein, carbs and fat.

### ✨ Your own food — the app works out the calories
- Type what you ate and how much: **Smart** finds the closest food (Arabic or English) and scales
  it to your grams, or adds up the ingredients the name mentions, with a confidence badge and
  "pick the closest" if it is not right.
- **Ingredients** starts from what the name mentions; **Manual** takes calories or works them out
  from protein, carbs and fat. Then it goes straight into your meal.

### 🔔 The notification, redesigned
- **Collapsed**: three rings side by side — steps, water and **food calories** (orange when over
  the goal) — each opening its screen, plus a quick water button.
- **Expanded**: steps, water and food cards, a **protein / carbs / fat strip** with bars, and
  **net calories** (eaten − burned walking − burned training).
- During a workout the header shows a **live workout timer** in orange.

### 💎 Polish
- Springy, smooth buttons with a soft sheen on the main ones, springy switches and segmented
  controls, the active tab pops, and the start button pulses while a walk records — all calmer
  with Reduce motion on.

## v7.1.0 — 2026-10-23

**Ideal body for every age, the three numbers that start it all (age → height → weight), your
goal at the pace you pick, and "Your day": workouts, meals with calories and water, with times.**
*الجسم المثالي لكل الأعمار، ثلاثة أرقام تبدأ كل شيء (العمر ← الطول ← الوزن)، هدفك بالسرعة التي تختارها، و«يومك»: التمارين والوجبات بسعراتها والماء بأوقاتها.*

### 🧍 Ideal body for every age (2–100)
- **Children and teens (2–17)** get a real ideal weight now, from the CDC BMI-for-age growth
  charts: the 50th percentile for the height today is the ideal, the 5th–85th the healthy range.
  Their percentile shows on the BMI tile and the method on "How it is worked out".
- Child-safe numbers: Schofield resting energy, water by age, protein 1.1–1.3 g/kg, body fat
  from BMI and age. **No diets for children:** under 13 a heavy child keeps the weight steady and
  grows into it; 13–17 at most −250 kcal a day and 0.25 kg a week. No barbell days under 16.
- The "adults only — ask a doctor" text and the bare BMI line are gone. The tabs (Overview,
  Body, Plan, Compare) work for every age.

### 1 · 2 · 3 — the three numbers
- **Waist is replaced by Weight** under "About you". You type **age → height → weight**: each
  step lights up, ticks itself off and moves you to the next, with a 0/3 → 3/3 ring and bar.
- The weight is saved as today's weigh-in (it replaces one already made today). Waist stays in
  Body → Tape measurements.
- When all three are in, **your ideal weight counts up by itself**, then it becomes your goal
  (once, if you had none). Your details then fold into one line with an edit button.

### 🎯 Your goal
- **Ideal weight or your own target**, a track with Now · Ideal · Goal, and **Pace**: Gentle /
  Normal / Faster (−250 / −500 / −750 kcal, or +200 / +300 / +450 to gain).
- Weeks, kg a week, finish date and calories a day, never under a safe minimum (you are told
  when that slows the pace). A warning with "Use the ideal" if a target is outside the healthy
  range for your height. "Start the plan" starts the week-by-week road.
- The food log's daily goal now follows your own target and pace too.

### 🗓 Your day
- A **timeline from your wake-up to your bedtime** (changeable, plus a workout time):
  - water on waking and through the day, adding up exactly to your water goal;
  - **breakfast, lunch, snack and dinner** with their calories (25 / 35 / 10 / 30 % of the
    day) and **dishes from the kitchen that fit**, changing every day;
  - today's workout and an evening walk with the step goal; then sleep.
- Live status: done ✓, **next** (pulsing, with "in 1 h 20 min"), late. A progress ring and a
  calorie split bar.
- **One tap:** drink the water, log the meal (or open a dish), start the workout, open the walk.
- **Reminders** (switch in the schedule settings): meals with the calories and a dish idea,
  the workout and the walk at their times, every day.
- **Home:** a new card with what's next in your day and the two after it.

### Under the hood
- `lib/daySchedule.js` (+ tests), `goalPlan()` / `PACES` / the child growth curves in
  `lib/idealBody.js`, `components/body/` (BodyFlow, DaySchedule, DayNext), `syncDayReminders()`.
- +55 strings in 12 languages (2,818 keys each).

## v7.0.0 — 2026-10-23

**Motion and feel, advanced workout tools, weekly & monthly reports with a weight forecast, a
"Today" home-screen widget, and the first anime wallpapers.**
*حركة وإحساس احترافي، أدوات تمرين متقدّمة، تقارير أسبوعية وشهرية مع توقّع الوزن، ودجت «اليوم» على الشاشة الرئيسية، وأول خلفيات الأنمي.*

### ✨ Motion & feel
- **Ripple:** buttons, rows and cards answer your finger with a soft ripple from where you touched.
- **Tap haptics:** a light tick on every press in the Android app (Settings → Vibrate on tap).
- **Small celebrations:** a burst of colour when you add water, log food or tick off a set, and a
  bigger one when you set a record.
- **Elegant loading:** screens slide their cards in one after another, and slow screens show a
  shimmering skeleton instead of a blank page.
- Everything turns off with Settings → Reduce motion.

### 🏋️ Workout tools
- **Live records:** tick a set that beats your best estimated 1RM and you get a 🏆 on the set,
  a celebration, a success vibration and "New record! Estimated 1RM … (was …)".
- **Lift tools** (calculator button on every weighted exercise):
  - **Plate calculator:** what to put on each side for any target weight, with a drawn bar in
    competition colours. Bar choice is 20 / 15 / 10 kg or none (45 / 35 / 15 lb).
  - **1RM & %:** an estimated 1RM from weight × reps, plus a 100–50 % table with loads rounded to
    real plates and the reps to expect. Tap a row to see its plates.
- **Voice countdown:** "3, 2, 1" out loud at the end of a rest or a timed set, in the app's
  language (Settings → Voice countdown). Uses the phone's text-to-speech engine.

### 📊 Reports (Stats → Weekly & monthly report)
- **Periods:** a week (Saturday → Friday) or a month; browse back through earlier ones.
- **Score:** a 0–100 score ring for the period.
- **Six stats, each compared with the period before:** workouts and minutes, volume and sets,
  steps a day, water a day, calories a day and weight change.
- **Interactive charts:** steps, water and food per day, with a goal line; tap a bar to read it.
- **Records** set in the period, and your **top exercise**.
- **Weight forecast:** your weekly trend, and the date you reach your goal weight at this pace.
- **Smart tips:** up to four specific suggestions from your own numbers.

### 📱 "Today" home-screen widget
- Steps, water and calories as three rings with big numbers.
- **+200 / +250 / +500 ml** water buttons and Undo, right on the home screen.
- Tap a ring to open its screen. It updates with every step and every drink, and the existing
  steps widget stays.

### 🖼️ Wallpapers
- **Nature:** now 30 photos, including Erbil citadel, a Tigris sunrise, Gali Ali Beg waterfall,
  a coral reef, an oasis and a glacier cave.
- **Anime:** a new category with the first 10 original pictures; more are coming.

### 🔧 Fixes
- Sub-screen titles now sit next to the back button instead of being pushed to the far edge.
- Lint clean. 12 locales × 2,763 keys are in sync.

## v6.0.0 — 2026-10-22

**My kitchen — cook from what you have at home with the calories worked out, per meal; wallpapers
(nature photos, 80 generated artworks, your own gallery photos); new shapes and card styles; a
card-style notification; and 64 more foods.**
*مطبخي — اطبخ من الموجود في بيتك والسعرات محسوبة لكل وجبة؛ خلفيات (صور طبيعة، 80 لوحة فنية، وصورك من المعرض)؛ أشكال وأنماط بطاقات جديدة؛ إشعار ببطاقات؛ و64 أكلة إضافية.*

### 🍳 My kitchen (Food log → My kitchen, Home food card → What can I cook?, Add food → What can I cook?)
- **Recipes:** 44 home recipes — eggs with tomato, tahini with date syrup (راشي ودبس), shakshuka,
  ijja, baqilla bil-dihin, geymar with honey, foul, lentil soup, dolma, tashreeb, biryani, tepsi,
  maqluba, kebab, falafel, hummus, salads, snacks… Pick the meal (breakfast / lunch / dinner /
  snack); what you can cook now comes first, the rest say exactly what is missing. Each shows
  kcal per serving, protein / carbs / fat, minutes, ingredients and numbered steps, and goes into
  today's log in one tap (servings 0.5–8, any meal).
- **My kitchen:** 56 ingredients in 7 groups; tick what you have or add the basics in one tap.
- **Shopping list:** a recipe's missing ingredients go onto it; tick one when you buy it and it
  moves into your kitchen.
- **Build a meal:** put a meal together from ingredients by weight, see the calories and macros
  live, split into servings, log it — or save it as your own food and edit it later.
- Calories are calculated from typical values per 100 g of each ingredient.

### 🖼️ Wallpapers (Themes → Wallpaper, or Settings → Wallpaper)
- **Nature:** 20 photos that come with the app (marshes, palm groves, a Kurdistan valley, aurora,
  desert, lavender, snowy pines…). More nature and anime pictures come in the next updates.
- **Art:** 80 generated artworks (8 styles × 10 palettes) that take no space.
- **My photos:** add up to 40 pictures from the gallery; they are resized and kept on this phone
  only (never uploaded, not part of backups).
- **Dim** and **blur** sliders keep text readable; cards turn frosted so the picture shows through.

### 🔷 Shapes and card styles (Themes)
- **5 shapes** for cards, buttons and fields: round, soft, sharp, pill, leaf.
- **6 card styles:** solid, frosted glass, outline, floating, gradient, neon — with every theme
  and wallpaper.

### 🔔 Notification — cards
- The expanded bar is now a card per section — **steps, water and food** — each with a coloured
  icon, a big number, its goal and a slim progress bar; tap a card to open its screen.
- New **food card**: eaten against today's goal, with kcal left (or over, in orange).

### 🍽️ Food database: 118 → 182 foods
- Breakfasts first: eggs with tomato, tahini with date syrup, shakshuka, ijja, eggs with potato,
  baqilla with egg, geymar with honey, scrambled eggs, egg whites, cheese omelette.
- Kubba Mosul, Kubba Halab, tbeet, harissa, qorma sabzi, kofta, mujaddara, vermicelli soup,
  manakish, lahm bi ajeen, sambusa, kaak, shish tawook, basterma, turshi, jajik, zalabia,
  mann al-sama, basbousa, muhallabia, rice pudding, karkade and more — in all 12 languages.

### Checks
- vitest 39 files / 543 tests (new: kitchen, wallpapers & look, kitchen and wallpaper screens);
  every new screen and all 44 recipe sheets are checked for stray English in the Arabic UI.
- 12 locales × 2,706 keys in sync.

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
