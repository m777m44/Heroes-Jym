// Arabic UI guard: renders every screen, the main sheets and a workout in progress in Arabic
// and fails on any visible run of Latin letters. Allowed: brand / product names, the language
// name "English" in the picker, and the English sub-line under exercise names (lang="en").
import { it, expect } from 'vitest'
const mem = new Map()
globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }
globalThis.window ??= globalThis
const noop = () => {}
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }
globalThis.addEventListener ??= noop
globalThis.removeEventListener ??= noop

it('the Arabic UI has no stray English', async () => {
  const React = await import('react')
  const { renderToString } = await import('react-dom/server')
  const { MemoryRouter } = await import('react-router-dom')
  const { useStore } = await import('../store/useStore.js')
  const { buildDemoState } = await import('../lib/demoSeed.js')
  const { setLang } = await import('../lib/i18n.js')
  const st = buildDemoState()
  // medicine names / doses are what the user typed — an Arabic user types them in Arabic
  st.meds = st.meds.map((m, i) => ({ ...m, name: ['فيتامين د', 'مغنيسيوم'][i], dose: ['1000 وحدة', '200 ملغ'][i] }))
  // 8.0: a fast in progress (Home card, the live tool strip, the fasting screen) and a finished one
  const H8 = 3600000, t8 = Date.now()
  st.fasting = { plan: 'custom', custom: 18, active: { start: t8 - 13 * H8, goalH: 16, plan: '16' }, log: [{ start: t8 - 40 * H8, end: t8 - 23 * H8, goalH: 16, plan: '16', hit: true }] }
  st.intervals = [{ d: new Date().toISOString().slice(0, 10), at: t8 - H8, preset: 'tabata', name: 'Tabata', sec: 230, work: 160, rounds: 8, kcal: 30, done: true }]
  // 9.0: a drink of your own (named in Arabic), a favourite, and today's drink log
  st.myDrinks = [{ id: 'md1', n: 'عصيري الصباحي', col: '#ff8c1a', t: 'c', sv: 1, ing: [['orangejuice', 200, 'ml'], ['banana', 1, 'piece'], ['ice', 75, 'g']], note: 'أخلطه وأشربه باردًا', at: t8 }]
  st.drinkFavs = ['zbeeb', 'md1']
  // 10.0: soft drinks and nuts in today's food log (the Food screen draws them), and the soft-drink screen's "recently"
  {
    const SD = await import('../lib/sodas.js'), NT = await import('../lib/nuts.js')
    const d0 = new Date().toISOString().slice(0, 10)
    st.food = { ...(st.food || {}), [d0]: [...((st.food || {})[d0] || []), SD.sodaEntry(SD.SODA_BY_ID.coke, { pk: 'can', ml: 330, meal: 'l' }), SD.sodaEntry(SD.SODA_BY_ID.mintlemon, { pk: 'glass', ml: 300, meal: 's' }), NT.nutEntry(NT.NUT_BY_ID.pistachio, { g: 30, form: 'salted', meal: 's' })] }
  }
  Object.assign(useStore.getInitialState().S, st)
  await setLang('ar')
  const text = h => h.replace(/<span class="exn-en"[^>]*>[^<]*<\/span>/g, '').replace(/<title>.*?<\/title>/g, '').replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '\n').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  const views = { '/home': 'Home', '/plan': 'Plan', ['/plan/r/' + st.routines[0].id]: 'RoutineEdit', '/workout': 'Workout', '/stats': 'Stats', '/history': 'History', '/library': 'Library', '/settings': 'Settings', '/walk': 'Walking', '/weight': 'BodyWeight', '/water': 'Water', '/ideal': 'IdealBody', '/health': 'Health', '/themes': 'Themes', '/coach': 'Coach', '/coach/intake': 'CoachIntake', '/start': 'StartWorkout', '/backups': 'Backups', '/calories': 'Calories', '/food': 'Food', '/kitchen': 'Kitchen', '/kitchen?tab=pantry': 'Kitchen', '/kitchen?tab=build': 'Kitchen', '/kitchen?m=b&x': 'Kitchen', '/wallpapers': 'Wallpapers', '/reports': 'Reports', '/tools': 'Tools', '/timer': 'Timer', '/breathe': 'Breathe', '/fasting': 'Fasting', '/recovery': 'Recovery', '/drinks': 'Drinks', '/drinks?c=iraqi': 'Drinks', '/drinks?c=mine': 'Drinks', '/drinks?c=fav': 'Drinks', '/dayplan': 'DayPlan', '/sodas': 'Sodas', '/nuts': 'Nuts', '/notifications': 'Notifications', '/schedule': 'DayPlan' }
  const found = {}
  for (const [path, name] of Object.entries(views)) {
    let html
    try {
      const mod = await import('./' + name + '.jsx')
      html = renderToString(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(mod.default)))
    } catch (e) { throw new Error(name + ': ' + e.message) }
    for (const line of text(html).split('\n').map(s => s.trim()).filter(Boolean)) {
      if (/[A-Za-z]{2,}/.test(line)) (found[line] = found[line] || new Set()).add(name)
    }
  }
  // 9.0: a day plan from each template, started today (live card, timeline, totals)
  {
    const DP = await import('./DayPlan.jsx')
    const { newPlan, TEMPLATES } = await import('../lib/dayPlan.js')
    const S0 = useStore.getInitialState().S
    const iso0 = new Date().toISOString().slice(0, 10)
    for (const tp of TEMPLATES) {
      const P = newPlan(tp.id, {}, { prefs: { wake: '07:00', sleep: '23:00' }, seed: 3 })
      P.days = { [iso0]: { on: Date.now(), done: {}, skip: {} } }
      P.remind = true
      S0.planner = P
      let html
      try { html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/dayplan'] }, React.createElement(DP.default))) } catch (e) { throw new Error('DayPlan:' + tp.id + ': ' + e.message) }
      for (const line of text(html).split('\n').map(x => x.trim()).filter(Boolean)) if (/[A-Za-z]{2,}/.test(line)) (found[line] = found[line] || new Set()).add('DayPlan:' + tp.id)
    }
  }
  // 11.0: a school week made before 11.0 — the card offering the new one
  {
    const DP = await import('./DayPlan.jsx')
    const { newPlan } = await import('../lib/dayPlan.js')
    const S0 = useStore.getInitialState().S
    const P = newPlan('school', {}, { seed: 1 }); delete P.tv
    S0.planner = P
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/dayplan'] }, React.createElement(DP.default)))
    expect(html).toContain('sc-upd')
    for (const line of text(html).split('\n').map(x => x.trim()).filter(Boolean)) if (/[A-Za-z]{2,}/.test(line)) (found[line] = found[line] || new Set()).add('DayPlan:oldSchool')
  }
  // 3.0: the other Ideal body tabs, and the Theme Studio (wheel, HEX)
  const IB = await import('./IdealBody.jsx')
  for (const tab of ['body', 'plan', 'compare']) {
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/ideal'] }, React.createElement(IB.default, { initialTab: tab })))
    for (const line of text(html).split('\n').map(s => s.trim()).filter(Boolean)) if (/[A-Za-z]{2,}/.test(line)) (found[line] = found[line] || new Set()).add('IdealBody:' + tab)
  }
  // 4.2: the burn plan — picking, and the review with reminders on; a section page with its burn entry
  {
    const BP = await import('./BurnPlan.jsx')
    const SW = await import('./StartWorkout.jsx')
    const S0 = useStore.getInitialState().S
    const prev = S0.burnPlan
    S0.burnPlan = { mode: 'home', keys: ['run', 'walk', 'burpee', 'yoga'], target: 2400, remind: true, gap: 30, start: '18:00', daily: true }
    S0.calGoal = { currentKg: 90, targetKg: 80, days: 60, activity: 'light', dietShare: 30, exerciseKcal: 900, eatKcal: 2100, dailyDeficit: 1280, from: new Date().toISOString().slice(0, 10) }
    for (const [name, C, path] of [['BurnSelect', BP.BurnSelect, '/burn/home'], ['BurnReview', BP.BurnReview, '/burn/review'], ['WorkoutSection', SW.WorkoutSection, '/start/home'], ['Calories+goal', (await import('./Calories.jsx')).default, '/calories']]) {
      let html
      try { html = renderToString(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(C))) } catch (e) { throw new Error(name + ': ' + e.message) }
      for (const line of text(html).split('\n').map(x => x.trim()).filter(Boolean)) if (/[A-Za-z]{2,}/.test(line)) (found[line] = found[line] || new Set()).add(name)
    }
    S0.burnPlan = prev
    delete S0.calGoal
  }
  // sheets
  const { useUI } = await import('../store/useUI.js')
  const sh = await import('../sheets.jsx')
  const { stepResetSheet } = await import('../components/pedometer/StepReset.jsx')
  const { EXDB } = await import('../lib/exercises-data.js')
  const H = await import('./Health.jsx')
  const isoToday = new Date().toISOString().slice(0, 10)
  const FS = await import('../components/food/FoodSheets.jsx')
  const { FOOD_BY_ID } = await import('../lib/foodDb.js')
  const K = await import('./Kitchen.jsx')
  const { RECIPES } = await import('../lib/kitchen.js')
  const HZ = await import('../components/HrZonesSheet.jsx')
  const WN = await import('../components/WhatsNew.jsx')
  const PF = await import('../components/ProfileSheet.jsx')
  const QS = await import('../components/QuickSearch.jsx')
  const DK = await import('./Drinks.jsx')
  const DR = await import('../lib/drinks.js')
  const SP = await import('../components/SoundPacks.jsx')
  const DPV = await import('./DayPlan.jsx')
  const SDV = await import('./Sodas.jsx')
  const NTV = await import('./Nuts.jsx')
  const SDL = await import('../lib/sodas.js')
  const NTL = await import('../lib/nuts.js')
  const WAV = await import('./Water.jsx')
  const w0 = st.workouts[st.workouts.length - 1]
  const ex0 = EXDB.find(e => e.n === 'barbell bench press')
  const calls = {
    bw: () => sh.bwSheet(), goal: () => sh.goalSheet(), exDetail: () => sh.exerciseDetailSheet(ex0), addTo: () => sh.addToRoutineSheet(ex0),
    custom: () => sh.customExSheet(), exConfig: () => sh.exConfigSheet(ex0, null, () => {}), tools: () => sh.planToolsSheet(),
    override: () => sh.dayOverrideSheet(w0.d), assign: () => sh.dayAssignSheet(6), detail: () => sh.workoutDetailSheet(w0), cal: () => sh.calendarSheet(),
    reset: () => stepResetSheet(),
    foodAdd: () => FS.addFoodSheet({ iso: isoToday, meal: 'l' }), foodAmount: () => FS.amountSheet({ food: FOOD_BY_ID.dolma, iso: isoToday, meal: 'l' }),
    foodEntry: () => FS.entrySheet(isoToday, { id: 'x', f: 'kubba', kcal: 190, q: 2, m: 'b' }), foodQuick: () => FS.quickSheet({ iso: isoToday, meal: 's' }),
    foodCustom: () => FS.customFoodSheet(null, { iso: isoToday, meal: 'd' }), foodCustomEdit: () => FS.customFoodSheet({ id: 'cf1', n: 'سلطة البيت', kcal: 150, p: 3, c: 10, f: 9 }),
    foodGoal: () => FS.foodGoalSheet(isoToday),
    ingPick: () => K.ingPickSheet(() => {}),
    ...Object.fromEntries(RECIPES.map(r => ['recipe_' + r.id, () => K.recipeSheet(r.id, 'l')])),
    bp: () => H.bpSheet(isoToday), sugar: () => H.sugarSheet(isoToday, 'mmol'), med: () => H.medSheet(), medEdit: () => H.medSheet(st.meds[0]),
    // 8.0
    zones: () => HZ.zonesSheet(), whatsNew: () => WN.whatsNewSheet(), profile: () => PF.profileSheet(), search: () => QS.quickSearchSheet(() => {}),
    // 9.0
    ...Object.fromEntries(DR.DRINKS.map(d => ['drink_' + d.id, () => DK.drinkSheet(d.id)])),
    drinkMine: () => DK.drinkSheet('md1'), drinkBuilder: () => DK.drinkBuilderSheet(), drinkRemix: () => DK.drinkBuilderSheet(null, { from: DR.DRINK_BY_ID.greendetox }),
    drinkEdit: () => DK.drinkBuilderSheet(useStore.getState().S.myDrinks[0]), drinkPick: () => DK.pickDrinkSheet(() => {}), sounds: () => SP.soundPacksSheet(),
    blockMeal: () => DPV.blockSheet({ k: 'meal', s: 780, d: 45, meal: 'l', items: [{ t: 'r', id: 'masgouf', q: 1 }, { t: 'd', id: 'shineena', q: 1 }] }, 650),
    blockNew: () => DPV.blockSheet({ s: 600 }), blockWater: () => DPV.blockSheet({ id: 'bw', k: 'water', s: 600, d: 5, ml: 300 }),
    // 10.0: every soft drink and nut, in every pack / form; the pickers; a school block with notes, a soft drink and nuts
    ...Object.fromEntries(SDL.SODAS.map(x => ['soda_' + x.id, () => SDV.sodaSheet(x.id)])),
    ...Object.fromEntries(Object.keys(SDL.PACKS).map(pk => ['sodaPack_' + pk, () => SDV.sodaSheet('coke', { pk, ml: SDL.PACKS[pk].sizes[1] })])),
    sodaBig: () => SDV.sodaSheet('pepsi', { pk: 'bottle', ml: 2250 }), sodaPick: () => SDV.pickSodaSheet(() => {}),
    ...Object.fromEntries(NTL.NUTS.map(x => ['nut_' + x.id, () => NTV.nutSheet(x.id)])),
    nutPick: () => NTV.pickNutSheet(() => {}),
    blockSchool: () => DPV.blockSheet({ id: 'bs', k: 'school', s: 450, d: 310, w: [0, 1, 2, 3, 4], rm: 10, nt: 'امتحان رياضيات — خذ الحاسبة', items: [{ t: 's', id: 'sprite', pk: 'can', ml: 250, q: 1 }, { t: 'n', id: 'almond', fm: 'raw', g: 25, q: 1 }] }),
    blockWeekend: () => DPV.blockSheet({ id: 'bf', k: 'prayer', s: 750, d: 20, w: [5], rm: -1 }),
    // 11.0: foods in a block (eggs and bread), a template note, a block icon; the food picker; any amount of water
    blockFood: () => DPV.blockSheet({ id: 'bfd', k: 'meal', s: 440, d: 5, meal: 'b', ic: 'shirt', nt: 'Clothes, school bag and a water bottle', items: [{ t: 'f', id: 'egg', q: 2 }, { t: 'f', id: 'khubz', q: 1 }] }),
    foodPick: () => DPV.foodPickSheet(() => {}), waterCustom: () => WAV.customWaterSheet(),
    profileIcon: () => { useStore.getState().S.profile = { name: 'مهدي', icon: 'dumbbell', color: '#ce1126' }; PF.profileSheet() },
    profilePhoto: () => { useStore.getState().S.profile = { name: 'مهدي', photo: 'data:image/jpeg;base64,AAAA', color: '#007a3d' }; PF.profileSheet() },
  }
  for (const [name, open] of Object.entries(calls)) {
    useUI.setState({ sheets: [] })
    try { open() } catch (e) { throw new Error('open ' + name + ': ' + e.message) }
    for (const sht of useUI.getState().sheets) {
      let html
      try { html = renderToString(React.createElement(MemoryRouter, null, sht.render(() => {}))) } catch (e) { throw new Error(name + ': ' + e.message) }
      for (const line of text(html).split('\n').map(x => x.trim()).filter(Boolean)) if (/[A-Za-z]{2,}/.test(line)) (found[line] = found[line] || new Set()).add('sheet:' + name)
    }
  }
  // a workout in progress
  sh.beginWorkout(st.routines[0].id, 80)
  Object.assign(useStore.getInitialState().S, { active: useStore.getState().S.active })
  {
    const mod = await import('./Workout.jsx')
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/workout'] }, React.createElement(mod.default)))
    for (const line of text(html).split('\n').map(x => x.trim()).filter(Boolean)) if (/[A-Za-z]{2,}/.test(line)) (found[line] = found[line] || new Set()).add('activeWorkout')
  }
  // the Google account screens (2.6): the first-launch choice and the Settings card, signed out and in
  {
    const scan = (html, where) => {
      for (const line of text(html).split('\n').map(x => x.trim()).filter(Boolean)) {
        const rest = line.replace(/\S+@\S+/g, '').replace(/\b(Google|Drive|Play)\b/g, '')
        if (/[A-Za-z]{2,}/.test(rest)) (found[line] = found[line] || new Set()).add(where)
      }
    }
    const gate = await import('../components/AccountGate.jsx')
    const card = await import('../components/AccountSection.jsx')
    scan(renderToString(React.createElement(gate.default, { onDone: () => {} })), 'AccountGate')
    for (const [k] of ['setup', 'network', 'consent', 'unavailable', 'failed'].map(r => [r])) scan(gate.accountError(k) || '', 'accountError')
    scan(renderToString(React.createElement(MemoryRouter, null, React.createElement(card.default))), 'AccountSection')
    localStorage.setItem('mj_cloud', JSON.stringify({ mode: 'google', account: { email: 'mahdi@gmail.com', name: 'مهدي' }, auto: true, at: Date.now() - 5 * 60000, syncedTs: 1 }))
    scan(renderToString(React.createElement(MemoryRouter, null, React.createElement(card.default))), 'AccountSection:in')
    localStorage.removeItem('mj_cloud')
  }
  // 8.0: Google's own product names stay Latin in Arabic too (as on the account screens)
  const ALLOWED = [/MAHDI-JYM/, /^English$/, /FitNotes/, { test: l => !/[A-Za-z]{2,}/.test(l.replace(/\b(Google|Drive)\b/g, '')) }]
  const stray = Object.entries(found).filter(([l]) => !ALLOWED.some(r => r.test(l))).map(([l, s]) => `${[...s].join(',')}\t${l}`).sort()
  expect(stray).toEqual([])
})
