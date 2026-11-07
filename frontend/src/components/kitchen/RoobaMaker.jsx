// 17.0 — the Rooba corner's home rooba maker (lib/roobaMaker.js): how long in the warmth (5–12 hours),
// a ring that fills while it sets, the fridge timer after it, and a bowl to log when it is ready. Both
// timers ring on the phone with the app closed (notification ids 8601, 8602).
import { useEffect, useState } from 'react'
import { t, dateLocale, U } from '../../lib/i18n.js'
import { MOBILE } from '../../lib/mobile.js'
import { todayISO } from '../../lib/format.js'
import { SET_HOURS, DEFAULT_HOURS, FRIDGE_HOURS, ROOBA_NOTIF, roobaPhase, roobaStart, roobaChill, roobaClear, leftParts } from '../../lib/roobaMaker.js'
import Icon from '../Icon.jsx'
import { Button } from '../ui.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const clockOf = ms => new Date(ms).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
export function leftText(ms) {
  const { h, m } = leftParts(ms)
  return h ? t('{0} h {1} min left', n0(h), n0(m)) : t('{0} min left', n0(Math.max(1, m)))
}

async function notify(id, at, title, body) {
  if (!MOBILE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return
    await LocalNotifications.cancel({ notifications: [{ id: ROOBA_NOTIF.set }, { id: ROOBA_NOTIF.cold }] }).catch(() => {})
    await LocalNotifications.schedule({ notifications: [{ id, schedule: { at: new Date(at), allowWhileIdle: true }, title, body, extra: { route: '/kitchen/s/rooba' } }] })
  } catch { /* no notifications */ }
}
async function unnotify() {
  if (!MOBILE) return
  try { const { LocalNotifications } = await import('@capacitor/local-notifications'); await LocalNotifications.cancel({ notifications: [{ id: ROOBA_NOTIF.set }, { id: ROOBA_NOTIF.cold }] }) } catch { /* */ }
}

/** The card at the top of the Rooba corner. */
export default function RoobaMaker() {
  const [, redraw] = useState(0)
  const [hours, setHours] = useState(DEFAULT_HOURS)
  const st = roobaPhase()
  useEffect(() => {
    if (st.phase !== 'setting' && st.phase !== 'chilling') return
    const id = setInterval(() => redraw(v => v + 1), 20000)
    return () => clearInterval(id)
  }, [st.phase])
  const start = () => {
    const s = roobaStart(hours)
    notify(ROOBA_NOTIF.set, s.end, t('Your rooba has set'), t('Put it in the fridge for {0} hours — it firms up.', n0(FRIDGE_HOURS)))
    redraw(v => v + 1)
  }
  const chill = () => {
    const s = roobaChill()
    notify(ROOBA_NOTIF.cold, s.end, t('Your rooba is ready'), t('Cold, firm and ready to eat — keep two spoons for the next batch.'))
    redraw(v => v + 1)
  }
  const stop = () => { roobaClear(); unnotify(); redraw(v => v + 1) }
  const howTo = () => import('../../views/Kitchen.jsx').then(m => m.recipeSheet('roobahome', 's'))
  const logBowl = () => Promise.all([import('../food/FoodSheets.jsx'), import('../../lib/foodDb.js')]).then(([FS, DB]) => FS.amountSheet({ food: DB.FOOD_BY_ID.yogurt, iso: todayISO(), meal: 's' }))
  const ring = st.phase === 'setting' || st.phase === 'chilling'
  return <div className={'card rm rm-' + st.phase} role="region" aria-label={t('Make rooba at home')}>
    <div className="rm-head">
      <span className="rm-ic" style={ring ? { '--p': st.p } : null} aria-hidden="true">
        {ring && <svg viewBox="0 0 44 44"><circle className="rm-track" cx="22" cy="22" r="19" /><circle className="rm-fill" cx="22" cy="22" r="19" style={{ strokeDashoffset: (1 - st.p) * 119.4 }} /></svg>}
        <Icon name={st.phase === 'chilling' ? 'snowflake' : st.phase === 'ready' || st.phase === 'set' ? 'checkCircle' : 'milk'} />
      </span>
      <div className="grow">
        <b>{st.phase === 'setting' ? t('Your rooba is setting') : st.phase === 'set' ? t('Your rooba has set!') : st.phase === 'chilling' ? t('In the fridge') : st.phase === 'ready' ? t('Your rooba is ready') : t('Make rooba at home')}</b>
        <span className="small muted">{st.phase === 'setting' ? t('{0} · ready at {1} — don’t move it', leftText(st.left), clockOf(st.end))
          : st.phase === 'set' ? t('Put it in the fridge for {0} hours — it firms up and the taste rounds out.', n0(FRIDGE_HOURS))
            : st.phase === 'chilling' ? t('{0} · ready at {1}', leftText(st.left), clockOf(st.end))
              : st.phase === 'ready' ? t('Cold, firm and ready to eat — keep two spoons for the next batch.')
                : t('Warm milk and a spoon of rooba — a bowl of thick rooba by morning. The timer keeps going with the app closed.')}</span>
      </div>
    </div>
    {st.phase === 'idle' && <>
      <div className="rm-hours" role="radiogroup" aria-label={t('Hours in the warmth')}>
        {SET_HOURS.map(h => <button key={h} type="button" role="radio" aria-checked={hours === h} className={'chip nocap' + (hours === h ? ' on' : '')} onClick={() => setHours(h)}>
          {n0(h)} {U('h')}</button>)}
      </div>
      <p className="small muted rm-tip">{t('6–8 hours for a mild rooba, 10–12 for a sour one. Somewhere warm — an oven with just its light on is perfect.')}</p>
      <div className="rm-btns">
        <Button variant="tinted" icon="book" onClick={howTo}>{t('How to make it')}</Button>
        <Button variant="primary" icon="timer" onClick={start}>{t('Start · {0} h', n0(hours))}</Button>
      </div>
    </>}
    {st.phase === 'set' && <div className="rm-btns">
      <Button variant="tinted" onClick={stop}>{t('Done')}</Button>
      <Button variant="primary" icon="snowflake" onClick={chill}>{t('Start the fridge timer')}</Button>
    </div>}
    {(st.phase === 'setting' || st.phase === 'chilling') && <div className="rm-btns">
      <Button variant="tinted" icon="book" onClick={howTo}>{t('How to make it')}</Button>
      <Button variant="tinted" icon="xmark" onClick={stop}>{t('Stop')}</Button>
    </div>}
    {st.phase === 'ready' && <div className="rm-btns">
      <Button variant="tinted" onClick={stop}>{t('Done')}</Button>
      <Button variant="primary" icon="plus" onClick={logBowl}>{t('Log a bowl')}</Button>
    </div>}
  </div>
}
