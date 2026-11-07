// 16.0 — caffeine in your body (lib/caffeineLive.js): a card with how much is in you now, a little
// curve of the hours ahead and when it drops under 50 mg; tap it for the whole picture — the curve
// from this morning to after your bedtime, today against the daily limit for your age, what is left
// at bedtime, each drink, the last 7 days and the days in a row without an energy drink.
//   <CaffeineCard />        Home, the soft drinks page and the kitchen's Drinks tab (only when there
//                           is caffeine in you or logged today — `always` shows it anyway)
//   caffeineSheet()         the whole picture
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale } from '../lib/i18n.js'
import { ageOf } from '../lib/idealBody.js'
import { SODA_BY_ID } from '../lib/sodas.js'
import { FOOD_BY_ID } from '../lib/foodDb.js'
import { DRINK_BY_ID } from '../lib/drinks.js'
import {
  caffeineNow, curve, caffeineWeek, energyFreeDays, bedtimeOf, SLEEP_OK_MG, SINGLE_DOSE_MG, STOP_BEFORE_BED_H, HALF_LIFE_H,
} from '../lib/caffeineLive.js'
import { nav } from '../lib/nav.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const hm = ms => new Date(ms).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
const H = 3600e3

/** The current caffeine numbers, refreshed every minute. */
export function useCaffeine() {
  const S = useStore(s => s.S)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60e3); return () => clearInterval(id) }, [])
  const age = ageOf(S)
  return useMemo(() => ({ ...caffeineNow(S, { now, age }), now, age, S }), [S, now, age])
}

/** An entry's name for the list of today's drinks. */
function doseName(e) {
  if (e.sd && SODA_BY_ID[e.sd]) return t(SODA_BY_ID[e.sd].name)
  if (e.dr && DRINK_BY_ID[e.dr]) return t(DRINK_BY_ID[e.dr].name)
  if (e.f && FOOD_BY_ID[e.f]) return t(FOOD_BY_ID[e.f].name)
  return e.n ? t(e.n) : t('Caffeine')
}

/** The curve as an SVG: the area under it, the 50 mg line, now, bedtime and a dot for each drink. */
function Curve({ c, from, to, height = 150, mini = false }) {
  const pts = useMemo(() => curve(c.doses, from, to, mini ? 20 : 8), [c.doses, from, to, mini])
  const W = 320, Hh = height, pad = mini ? 4 : 18
  const max = Math.max(SLEEP_OK_MG * 1.6, ...pts.map(p => p.mg)) * 1.12
  const x = tt => pad + (tt - from) / (to - from) * (W - pad * 2)
  const y = mg => Hh - pad - mg / max * (Hh - pad * 2)
  const line = pts.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.mg).toFixed(1)).join(' ')
  const area = line + ` L${x(to).toFixed(1)} ${y(0)} L${x(from).toFixed(1)} ${y(0)} Z`
  const nowX = x(Math.min(Math.max(c.now, from), to))
  const bedIn = c.bed >= from && c.bed <= to
  const ticks = []
  if (!mini) {
    const first = Math.ceil(from / (3 * H)) * 3 * H
    for (let tt = first; tt <= to; tt += 3 * H) ticks.push(tt)
  }
  return <svg className={'cf-curve' + (mini ? ' mini' : '')} viewBox={`0 0 ${W} ${Hh}`} preserveAspectRatio="none" role="img"
    aria-label={t('Caffeine in your body over the day')}>
    <defs>
      <linearGradient id={mini ? 'cfgm' : 'cfg'} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--orange)" stopOpacity=".55" />
        <stop offset="1" stopColor="var(--orange)" stopOpacity="0" />
      </linearGradient>
    </defs>
    {!mini && ticks.map(tt => <g key={tt}><line x1={x(tt)} x2={x(tt)} y1={pad} y2={Hh - pad} className="cf-grid" />
      <text x={x(tt)} y={Hh - 3} className="cf-tick">{hm(tt)}</text></g>)}
    <line x1={pad} x2={W - pad} y1={y(SLEEP_OK_MG)} y2={y(SLEEP_OK_MG)} className="cf-ok" />
    {!mini && <text x={W - pad} y={y(SLEEP_OK_MG) - 4} className="cf-ok-t">{n0(SLEEP_OK_MG)} {U('mg')}</text>}
    <path d={area} fill={`url(#${mini ? 'cfgm' : 'cfg'})`} />
    <path d={line} className="cf-line" />
    {bedIn && <g className="cf-bed"><line x1={x(c.bed)} x2={x(c.bed)} y1={pad} y2={Hh - pad} />{!mini && <text x={x(c.bed)} y={pad + 9}>{t('Bed')}</text>}</g>}
    <line x1={nowX} x2={nowX} y1={pad} y2={Hh - pad} className="cf-now" />
    <circle cx={nowX} cy={y(c.level)} r={mini ? 3 : 4.5} className="cf-dot" />
    {!mini && c.doses.filter(d => d.t >= from && d.t <= to).map((d, i) => <circle key={i} cx={x(d.t)} cy={y(0) - 1} r="3.5" className="cf-dose" />)}
  </svg>
}

/** The small card. Hidden when there is no caffeine in you and none logged today (unless `always`). */
export function CaffeineCard({ always = false }) {
  const c = useCaffeine()
  if (!always && !c.active) return null
  const from = c.now - 2 * H, to = c.now + 10 * H
  const sub = c.level < SLEEP_OK_MG
    ? (c.peak >= SLEEP_OK_MG ? t('Rising — {0} mg at {1}', n0(c.peak), hm(c.peakAt)) : t('Under {0} mg — fine for sleep', n0(SLEEP_OK_MG)))
    : c.under ? t('Under {0} mg at {1}', n0(SLEEP_OK_MG), hm(c.under)) : ''
  return <button type="button" className={'card cf-card' + (c.over ? ' over' : '')} onClick={caffeineSheet}>
    <span className="cf-card-ic" aria-hidden="true"><Icon name="bolt" /></span>
    <span className="cf-card-t">
      <span className="lbl2">{t('Caffeine in your body')}</span>
      <b className="cf-mg">{n0(c.level)}<small> {U('mg')}</small></b>
      <span className="cf-sub">{sub}</span>
    </span>
    <span className="cf-card-r">
      <Curve c={c} from={from} to={to} height={56} mini />
      <span className={'cf-today' + (c.over ? ' over' : '')}>{t('Today {0} / {1} mg', n0(c.total), n0(c.limit))}</span>
    </span>
  </button>
}

function Week({ S, now, limit }) {
  const days = useMemo(() => caffeineWeek(S, now), [S, now])
  const max = Math.max(limit, ...days.map(d => d.mg)) || 1
  const free = energyFreeDays(S, now)
  const cans = days.reduce((a, d) => a + d.energy, 0)
  return <>
    <div className="cf-week" role="img" aria-label={t('Caffeine in the last 7 days')} style={{ '--lim': (limit / max * 100) + '%' }}>
      {days.map(d => <div key={d.iso} className={'cf-wd' + (d.mg > limit ? ' over' : '')}>
        <span className="cf-wd-v">{d.mg ? n0(d.mg) : ''}</span>
        <span className="cf-wd-b"><em style={{ height: Math.max(d.mg ? 4 : 0, d.mg / max * 100) + '%' }} /></span>
        <span className="cf-wd-d">{new Date(d.iso + 'T12:00:00').toLocaleDateString(dateLocale(), { weekday: 'narrow' })}</span>
        {d.energy > 0 && <span className="cf-wd-e" title={t('Energy drinks')}><Icon name="can" />{n0(d.energy)}</span>}
      </div>)}
    </div>
    <div className="cf-streak">
      <span className="cf-streak-ic"><Icon name={free === 0 ? 'can' : 'trophy'} /></span>
      <span className="grow">
        <b>{free === null ? t('No energy drinks logged yet') : free === 0 ? t('An energy drink today') : t('{0} days in a row without an energy drink', n0(free))}</b>
        <span className="small muted">{t('{0} energy drinks in the last 7 days', n0(cans))}</span>
      </span>
    </div>
  </>
}

function CaffeineSheet({ close }) {
  const c = useCaffeine()
  const teen = Number.isFinite(c.age) && c.age < 18
  const first = c.todayDoses.length ? c.todayDoses[0].t : c.now
  const from = Math.min(c.now - 4 * H, first - 0.5 * H)
  const to = Math.max(c.bed + 2 * H, c.now + 6 * H)
  const lastOk = c.bed - STOP_BEFORE_BED_H * H
  return <div className="cf-sheet">
    <div className="cf-sheet-h">
      <span className="cf-card-ic big" aria-hidden="true"><Icon name="bolt" /></span>
      <div><h3>{t('Caffeine in your body')}</h3><div className="small muted">{t('From everything you logged — coffee, tea, soft drinks and energy drinks')}</div></div>
    </div>
    <Curve c={c} from={from} to={to} height={170} />
    <div className="cf-stats">
      <div><span>{t('Now')}</span><b>{n0(c.level)}<small> {U('mg')}</small></b></div>
      <div className={c.over ? 'over' : ''}><span>{t('Today')}</span><b>{n0(c.total)}<small> / {n0(c.limit)} {U('mg')}</small></b></div>
      <div className={c.sleepOk ? 'ok' : 'warn'}><span>{t('At bedtime ({0})', hm(c.bed))}</span><b>{n0(c.atBed)}<small> {U('mg')}</small></b></div>
      <div><span>{t('Under {0} mg', n0(SLEEP_OK_MG))}</span><b>{c.level < SLEEP_OK_MG && c.peak < SLEEP_OK_MG ? t('Now') : c.under ? hm(c.under) : '—'}</b></div>
    </div>
    {c.over && <div className="cf-note bad"><Icon name="alert" /><span>{teen
      ? t('Over the daily limit for teens: about {0} mg a day under 18 — energy drinks are not for children and teens.', n0(c.limit))
      : t('Over the daily limit for a healthy adult ({0} mg).', n0(c.limit))}</span></div>}
    {c.bigDose && <div className="cf-note bad"><Icon name="alert" /><span>{t('More than {0} mg in one go — that much at once can bring a racing heart, shaking and an upset stomach.', n0(SINGLE_DOSE_MG))}</span></div>}
    {!c.sleepOk && <div className="cf-note warn"><Icon name="bed" /><span>{t('About {0} mg will still be in you at bedtime — it can make falling asleep harder and sleep lighter.', n0(c.atBed))}</span></div>}
    {c.active && c.sleepOk && <div className="cf-note ok"><Icon name="moon" /><span>{t('Under {0} mg by your bedtime — good for sleep.', n0(SLEEP_OK_MG))}</span></div>}

    <div className="dk-sec-t">{t('Today’s caffeine')}</div>
    {c.todayDoses.length ? <div className="cf-doses">{c.todayDoses.map((d, i) => <div key={i} className="cf-dose-r">
      <span className="cf-dose-t" dir="ltr">{hm(d.t)}</span>
      <span className="grow" dir="auto">{doseName(d.e)}{(+d.e.q || 1) !== 1 ? ' ×' + n0(d.e.q) : ''}</span>
      <b>{n0(d.mg)}<small> {U('mg')}</small></b>
    </div>)}</div> : <p className="small muted">{t('Nothing with caffeine logged today.')}</p>}

    <div className="dk-sec-t">{t('The last 7 days')}</div>
    <Week S={c.S} now={c.now} limit={c.limit} />

    <div className="dk-sec-t">{t('Good to know')}</div>
    <ul className="cf-tips">
      <li>{t('Your body clears about half the caffeine every {0} hours — so a can at 5 pm is still half there at 10 pm.', n0(HALF_LIFE_H))}</li>
      <li>{t('For good sleep, the last caffeine about {0} hours before bed — for you that is {1}.', n0(STOP_BEFORE_BED_H), hm(lastOk))}</li>
      <li>{teen ? t('Under 18: about 100 mg a day at most — that is one small coffee or a little more than one energy drink can. Energy drinks are not recommended for teens.') : t('A healthy adult: up to 400 mg a day, and no more than 200 mg at once. In pregnancy: 200 mg a day at most.')}</li>
      <li>{t('Never mix energy drinks with alcohol, and not during long hard exercise in the heat.')}</li>
    </ul>
    <p className="small muted">{t('Bedtime {0} — from My schedule. An estimate: how fast caffeine leaves differs from person to person.', bedtimeOf(c.S))}</p>
    <Button variant="tinted" icon="calendar" onClick={() => { close(); nav('/dayplan') }}>{t('Change my bedtime')}</Button>
  </div>
}

export const caffeineSheet = () => useUI.getState().openSheet(close => <CaffeineSheet close={close} />)
