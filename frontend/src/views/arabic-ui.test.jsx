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
  Object.assign(useStore.getInitialState().S, st)
  await setLang('ar')
  const text = h => h.replace(/<span class="exn-en"[^>]*>[^<]*<\/span>/g, '').replace(/<title>.*?<\/title>/g, '').replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '\n').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  const views = { '/home': 'Home', '/plan': 'Plan', ['/plan/r/' + st.routines[0].id]: 'RoutineEdit', '/workout': 'Workout', '/stats': 'Stats', '/history': 'History', '/library': 'Library', '/settings': 'Settings', '/walk': 'Walking', '/weight': 'BodyWeight', '/water': 'Water', '/coach': 'Coach', '/coach/intake': 'CoachIntake' }
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
  // sheets
  const { useUI } = await import('../store/useUI.js')
  const sh = await import('../sheets.jsx')
  const { stepResetSheet } = await import('../components/pedometer/StepReset.jsx')
  const { EXDB } = await import('../lib/exercises-data.js')
  const w0 = st.workouts[st.workouts.length - 1]
  const ex0 = EXDB.find(e => e.n === 'barbell bench press')
  const calls = {
    bw: () => sh.bwSheet(), goal: () => sh.goalSheet(), exDetail: () => sh.exerciseDetailSheet(ex0), addTo: () => sh.addToRoutineSheet(ex0),
    custom: () => sh.customExSheet(), exConfig: () => sh.exConfigSheet(ex0, null, () => {}), tools: () => sh.planToolsSheet(),
    override: () => sh.dayOverrideSheet(w0.d), assign: () => sh.dayAssignSheet(6), detail: () => sh.workoutDetailSheet(w0), cal: () => sh.calendarSheet(),
    reset: () => stepResetSheet(),
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
  const ALLOWED = [/MAHDI-JYM/, /^English$/, /FitNotes/]
  const stray = Object.entries(found).filter(([l]) => !ALLOWED.some(r => r.test(l))).map(([l, s]) => `${[...s].join(',')}\t${l}`).sort()
  expect(stray).toEqual([])
})
