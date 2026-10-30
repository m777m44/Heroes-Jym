// 14.0 — the Kitchen's cooking timer: rice, eggs, tea, pasta… several can run at once. A timer
// shows in a small bar at the bottom of the Kitchen while it runs and rings (a few beeps and a
// note) when it is done. On the phone a notification rings too, even with the app closed
// (ids 7685–7694).
//   cookTimerSheet()                 the presets and your own minutes
//   startCookTimer(seconds, label)   start one (from a recipe step's timer button)
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useUI } from '../../store/useUI.js'
import { useStore } from '../../store/useStore.js'
import { t, U, dateLocale } from '../../lib/i18n.js'
import { MOBILE } from '../../lib/mobile.js'
import { beep } from '../../lib/sound.js'
import Icon from '../Icon.jsx'
import { Button } from '../ui.jsx'

export const COOK_IDS = [7685, 7686, 7687, 7688, 7689, 7690, 7691, 7692, 7693, 7694]
export const PRESETS = [
  { key: 'egg-soft', name: 'Soft-boiled egg', min: 6, icon: 'egg' },
  { key: 'egg-hard', name: 'Hard-boiled egg', min: 10, icon: 'egg' },
  { key: 'rice', name: 'Rice (timman)', min: 20, icon: 'bread' },
  { key: 'pasta', name: 'Pasta', min: 10, icon: 'noodles' },
  { key: 'indomie', name: 'Indomie', min: 3, icon: 'noodles' },
  { key: 'tea', name: 'Iraqi tea (brewing)', min: 5, icon: 'coffee' },
  { key: 'lentils', name: 'Red lentils', min: 25, icon: 'seed' },
  { key: 'chicken', name: 'Chicken (boiling)', min: 40, icon: 'flame' },
  { key: 'oven', name: 'Oven tray', min: 45, icon: 'flame' },
]
const pad = n => String(n).padStart(2, '0')
/** "04:59" / "1:02:03" */
export function clock(sec) {
  const s = Math.max(0, Math.ceil(sec))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return ((h ? h + ':' + pad(m) : pad(m)) + ':' + pad(r)).replace(/\d/g, d => (+d).toLocaleString(dateLocale()))
}

/** The running timers (this session): [{ id, label, end, total, done }] */
export const useCookTimers = create(() => ({ list: [] }))
let tick = null
function ensureTick() {
  if (tick) return
  tick = setInterval(() => {
    const now = Date.now()
    const { list } = useCookTimers.getState()
    if (!list.length) { clearInterval(tick); tick = null; return }
    let changed = false
    const next = list.map(x => {
      if (!x.done && x.end <= now) { changed = true; ring(x); return { ...x, done: true } }
      return x
    })
    useCookTimers.setState({ list: changed ? next : [...list] })
  }, 1000)
}
function ring(x) {
  const sound = useStore.getState().S.sound !== false
  for (let i = 0; i < 4; i++) { beep(sound, 880, 0.18, i * 0.32); beep(sound, 1175, 0.14, i * 0.32 + 0.16) }
  useUI.getState().toast(t('{0} is ready!', x.label))
}
async function notify(x, slot) {
  if (!MOBILE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    await LocalNotifications.schedule({ notifications: [{
      id: COOK_IDS[slot], schedule: { at: new Date(x.end), allowWhileIdle: true },
      title: t('{0} is ready!', x.label), body: t('Your cooking timer is done.'), extra: { route: '/kitchen' },
    }] })
  } catch { /* no notifications */ }
}
async function unnotify(slot) {
  if (!MOBILE || slot < 0) return
  try { const { LocalNotifications } = await import('@capacitor/local-notifications'); await LocalNotifications.cancel({ notifications: [{ id: COOK_IDS[slot] }] }) } catch { /* */ }
}

export function startCookTimer(seconds, label) {
  const { list } = useCookTimers.getState()
  const used = new Set(list.map(x => x.slot))
  const slot = COOK_IDS.findIndex((_, i) => !used.has(i))
  if (slot < 0) { useUI.getState().toast(t('Ten timers are already running.')); return null }
  const x = { id: Date.now() + '-' + slot, slot, label: label || t('Cooking timer'), end: Date.now() + seconds * 1000, total: seconds, done: false }
  useCookTimers.setState({ list: [...list, x] })
  ensureTick()
  notify(x, slot)
  useUI.getState().toast(t('Timer started: {0}', clock(seconds)))
  return x
}
export function stopCookTimer(id) {
  const { list } = useCookTimers.getState()
  const x = list.find(y => y.id === id)
  if (x && !x.done) unnotify(x.slot)
  useCookTimers.setState({ list: list.filter(y => y.id !== id) })
}

/** The running timers as a bar (the Kitchen screens show it at the bottom). */
export function CookTimersBar() {
  const list = useCookTimers(s => s.list)
  if (!list.length) return null
  return <div className="ct-bar" role="status">
    {list.map(x => {
      const left = (x.end - Date.now()) / 1000
      return <div key={x.id} className={'ct-run' + (x.done ? ' done' : '')} style={{ '--p': x.done ? 1 : 1 - left / x.total }}>
        <Icon name={x.done ? 'bell' : 'timer'} />
        <span className="grow" dir="auto">{x.label}</span>
        <b>{x.done ? t('Ready') : clock(left)}</b>
        <button type="button" className="iconbtn sm" aria-label={t('Stop')} onClick={() => stopCookTimer(x.id)}><Icon name="xmark" /></button>
      </div>
    })}
  </div>
}

function CookTimer({ close }) {
  const [min, setMin] = useState(15)
  const list = useCookTimers(s => s.list)
  const [, redraw] = useState(0)
  useEffect(() => { const id = setInterval(() => redraw(v => v + 1), 1000); return () => clearInterval(id) }, [])
  return <div className="ct">
    <h3>{t('Cooking timer')}</h3>
    {list.length > 0 && <CookTimersBar />}
    <div className="ct-presets">
      {PRESETS.map(p => <button key={p.key} type="button" className="ct-p" onClick={() => { startCookTimer(p.min * 60, t(p.name)); close() }}>
        <span className="ct-p-ic" aria-hidden="true"><Icon name={p.icon} /></span>
        <b>{t(p.name)}</b><small>{t('{0} min', p.min.toLocaleString(dateLocale()))}</small>
      </button>)}
    </div>
    <div className="lbl2" style={{ marginTop: 14 }}>{t('Your own time')}</div>
    <div className="kit-sv">
      <span>{t('Minutes')}</span>
      <div className="kit-svc">
        <button className="iconbtn" aria-label={t('Less')} onClick={() => setMin(v => Math.max(1, v - (v > 10 ? 5 : 1)))}><Icon name="minus" /></button>
        <b>{min.toLocaleString(dateLocale())}</b>
        <button className="iconbtn" aria-label={t('More')} onClick={() => setMin(v => Math.min(240, v + (v >= 10 ? 5 : 1)))}><Icon name="plus" /></button>
      </div>
      <span className="small muted">{U('min')}</span>
    </div>
    <Button variant="primary" icon="timer" onClick={() => { startCookTimer(min * 60, t('Cooking timer')); close() }}>{t('Start')}</Button>
  </div>
}
export const cookTimerSheet = () => useUI.getState().openSheet(close => <CookTimer close={close} />)
