import { useStore } from '../store/useStore.js'
import { t, dateLocale } from '../lib/i18n.js'
import {
  useNow, clockZoneOf, timeIn, dateLine, hijriLine, msToMidnight, dayProgress, splitDuration, zoneOffsetLabel, IRAQ_TZ,
} from '../lib/liveClock.js'
import Icon from './Icon.jsx'

const pad = n => String(n).padStart(2, '0')

// Each digit pair is keyed by its value, so a change remounts it and replays the little
// slide-in — the seconds visibly tick, the minutes and hours flip when they roll over.
function Digits({ v, cls = '' }) {
  return <span className={'lc-dg ' + cls} key={v}>{pad(v)}</span>
}

/**
 * The live clock: Baghdad time (or the device's) to the second, the weekday with the Gregorian
 * and Hijri dates, and how long is left of today — the window to reach the step goal — with a
 * bar showing how much of the day has gone. `compact` is the one-line version for Home.
 */
export default function LiveClock({ compact = false, children }) {
  const S = useStore(s => s.S)
  const now = useNow(1000)
  const zone = clockZoneOf(S)
  const loc = dateLocale()
  const { h, m, s } = timeIn(now, zone)
  const left = splitDuration(msToMidnight(now))
  const label = zone === IRAQ_TZ ? t('Baghdad time') : t('Device time')
  if (compact) {
    return <div className="lc lc-compact" aria-label={label}>
      <Icon name="clock" />
      <span className="lc-time" dir="ltr"><Digits v={h} />:<Digits v={m} />:<Digits v={s} cls="sec" /></span>
      <span className="lc-date">{dateLine(now, zone, loc)}</span>
    </div>
  }
  const hijri = hijriLine(now, zone, loc)
  return <div className="card lc" role="timer" aria-label={label}>
    <div className="lc-top">
      <span className="lc-zone"><Icon name="clock" /> {label} <span className="lc-off">{zoneOffsetLabel(now, zone)}</span></span>
      {children}
    </div>
    <div className="lc-time big" dir="ltr">
      <Digits v={h} /><span className="lc-colon">:</span><Digits v={m} /><span className="lc-colon">:</span><Digits v={s} cls="sec" />
    </div>
    <div className="lc-date">{dateLine(now, zone, loc)}</div>
    {hijri && <div className="lc-hijri">{hijri}</div>}
    <div className="lc-left">
      <span>{t('Day ends in')}</span>
      <b dir="ltr">{pad(left.h)}:{pad(left.m)}:{pad(left.s)}</b>
    </div>
    <div className="lc-bar" aria-hidden="true"><i style={{ width: (dayProgress(now) * 100).toFixed(2) + '%' }} /></div>
  </div>
}
