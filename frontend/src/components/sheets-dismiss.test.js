import { describe, it, expect, vi } from 'vitest'
const noop = () => {}
const mem = new Map()
globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }
globalThis.window ??= globalThis
window.location ??= { hash: '#/home' }
window.history ??= { state: { idx: 0 }, back: () => {} }
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }
const { swipeCloses, SWIPE_CLOSE_PX } = await import('./Modals.jsx')
const { useUI, SHEET_OUT_MS } = await import('../store/useUI.js')
const { onBack } = await import('../lib/backButton.js')
const navMod = await import('../lib/nav.js')

describe('2.11 — dismissing a sheet', () => {
  it('a long pull or a quick flick closes it; a small or slow one springs back', () => {
    expect(swipeCloses(SWIPE_CLOSE_PX + 1, 2000)).toBe(true)    // long pull, however slow
    expect(swipeCloses(60, 80)).toBe(true)                      // quick flick
    expect(swipeCloses(60, 600)).toBe(false)                    // short and slow
    expect(swipeCloses(20, 10)).toBe(false)                     // a twitch, not a swipe
    expect(swipeCloses(-200, 50)).toBe(false)                   // upward
  })

  it('closing slides the sheet out first, then removes it; closing twice is harmless', () => {
    vi.useFakeTimers()
    const ui = useUI.getState()
    ui.closeAll()
    const h = ui.openSheet(() => null)
    h.close(); h.close()
    expect(useUI.getState().sheets).toHaveLength(1)
    expect(useUI.getState().sheets[0].closing).toBe(true)
    vi.advanceTimersByTime(SHEET_OUT_MS + 5)
    expect(useUI.getState().sheets).toHaveLength(0)
    vi.useRealTimers()
  })

  it('the phone’s Back closes the sheet underneath a closing one, not the closing one again', () => {
    vi.useFakeTimers()
    const ui = useUI.getState()
    ui.closeAll()
    const a = ui.openSheet(() => null)
    const b = ui.openSheet(() => null)
    b.close()
    expect(onBack()).toBe('handled')
    const st = useUI.getState().sheets
    expect(st.find(s => s.id === a.id).closing).toBe(true)
    vi.advanceTimersByTime(SHEET_OUT_MS + 5)
    expect(useUI.getState().sheets).toHaveLength(0)
    vi.useRealTimers()
  })
})

describe('15.0 — pinned food and drink lists', () => {
  it('Back leaves a pinned sheet open and wiggles its ✕; with the setting off it closes as before', async () => {
    vi.useFakeTimers()
    const { useStore } = await import('../store/useStore.js')
    const ui = useUI.getState()
    ui.closeAll()
    const n0 = useUI.getState().nudge
    const h = ui.openSheet(() => null, { pinned: true })
    expect(onBack()).toBe('handled')
    expect(useUI.getState().sheets.find(x => x.id === h.id).closing).toBeFalsy()
    expect(useUI.getState().nudge).toBe(n0 + 1)
    useStore.getState().S.pinSheets = false
    expect(onBack()).toBe('handled')
    expect(useUI.getState().sheets.find(x => x.id === h.id).closing).toBe(true)
    vi.advanceTimersByTime(SHEET_OUT_MS + 5)
    expect(useUI.getState().sheets).toHaveLength(0)
    delete useStore.getState().S.pinSheets
    // its own ✕ (close) always works
    const h2 = ui.openSheet(() => null, { pinned: true })
    h2.close()
    vi.advanceTimersByTime(SHEET_OUT_MS + 5)
    expect(useUI.getState().sheets).toHaveLength(0)
    vi.useRealTimers()
  })
})

describe('2.11 — the ‹ back button', () => {
  it('goes back in the app’s history when there is some, else to the fallback screen', () => {
    const calls = []
    navMod.setNav((to, opts) => calls.push([to, opts]))
    const back = vi.fn()
    const hist = window.history
    window.history = { state: { idx: 0 }, back }
    navMod.goBack('/settings')
    expect(calls).toEqual([['/settings', { replace: true }]])
    window.history.state = { idx: 2 }
    navMod.goBack('/settings')
    expect(back).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(1)
    window.history = hist
  })
})
