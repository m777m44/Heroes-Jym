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
  Object.assign(useStore.getInitialState().S, st)
  await setLang('ar')
  const text = h => h.replace(/<span class="exn-en"[^>]*>[^<]*<\/span>/g, '').replace(/<title>.*?<\/title>/g, '').replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '\n').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  const views = { '/home': 'Home', '/plan': 'Plan', ['/plan/r/' + st.routines[0].id]: 'RoutineEdit', '/workout': 'Workout', '/stats': 'Stats', '/history': 'History', '/library': 'Library', '/settings': 'Settings', '/walk': 'Walking', '/weight': 'BodyWeight', '/water': 'Water', '/ideal': 'IdealBody', '/health': 'Health', '/themes': 'Themes', '/coach': 'Coach', '/coach/intake': 'CoachIntake' }
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
  // 3.0: the other Ideal body tabs, and the Theme Studio (wheel, HEX)
  const IB = await import('./IdealBody.jsx')
  for (const tab of ['body', 'plan', 'compare']) {
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: ['/ideal'] }, React.createElement(IB.default, { initialTab: tab })))
    for (const line of text(html).split('\n').map(s => s.trim()).filter(Boolean)) if (/[A-Za-z]{2,}/.test(line)) (found[line] = found[line] || new Set()).add('IdealBody:' + tab)
  }
  // sheets
  const { useUI } = await import('../store/useUI.js')
  const sh = await import('../sheets.jsx')
  const { stepResetSheet } = await import('../components/pedometer/StepReset.jsx')
  const { EXDB } = await import('../lib/exercises-data.js')
  const H = await import('./Health.jsx')
  const isoToday = new Date().toISOString().slice(0, 10)
  const w0 = st.workouts[st.workouts.length - 1]
  const ex0 = EXDB.find(e => e.n === 'barbell bench press')
  const calls = {
    bw: () => sh.bwSheet(), goal: () => sh.goalSheet(), exDetail: () => sh.exerciseDetailSheet(ex0), addTo: () => sh.addToRoutineSheet(ex0),
    custom: () => sh.customExSheet(), exConfig: () => sh.exConfigSheet(ex0, null, () => {}), tools: () => sh.planToolsSheet(),
    override: () => sh.dayOverrideSheet(w0.d), assign: () => sh.dayAssignSheet(6), detail: () => sh.workoutDetailSheet(w0), cal: () => sh.calendarSheet(),
    reset: () => stepResetSheet(),
    bp: () => H.bpSheet(isoToday), sugar: () => H.sugarSheet(isoToday, 'mmol'), med: () => H.medSheet(), medEdit: () => H.medSheet(st.meds[0]),
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
    scan(renderToString(React.createElement(card.default)), 'AccountSection')
    localStorage.setItem('mj_cloud', JSON.stringify({ mode: 'google', account: { email: 'mahdi@gmail.com', name: 'مهدي' }, auto: true, at: Date.now() - 5 * 60000, syncedTs: 1 }))
    scan(renderToString(React.createElement(card.default)), 'AccountSection:in')
    localStorage.removeItem('mj_cloud')
  }
  const ALLOWED = [/MAHDI-JYM/, /^English$/, /FitNotes/]
  const stray = Object.entries(found).filter(([l]) => !ALLOWED.some(r => r.test(l))).map(([l, s]) => `${[...s].join(',')}\t${l}`).sort()
  expect(stray).toEqual([])
})
