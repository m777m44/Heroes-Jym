// 13.1 — your week at a glance. Each kind of day (Sunday–Thursday, Friday & Saturday …) as a bar of
// coloured blocks from the morning to bedtime and a clean list of times, grouped into morning,
// afternoon, evening and night: what each block is, how long, the food and water it carries (the
// menu of each day when it changes), and whether it reminds you. The whole week can be shared as
// text (WhatsApp, notes) or copied.
//   <WeekKinds plan onOpen />   the kinds of day as small cards on the schedule screen
//   weekGlanceSheet(i)          the sheet, open on kind `i`
//   shareSchedule()             the week as text → the share sheet (or the clipboard)
// Data: lib/dayPlan.js (weekTypes, planText).
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, U, dateLocale, getLang } from '../lib/i18n.js'
import { DAYS, DAYN, weekStartOf } from '../lib/format.js'
import { MEALS } from '../lib/food.js'
import {
  KINDS, weekTypes, planText, blockKcal, blockMl, normPlan, partOf, daysLabel, itemInfo, noteText, SCHOOL_DAYS, WEEKEND,
} from '../lib/dayPlan.js'
import { shareText } from '../lib/mobile.js'
import { copyText } from '../lib/clipboard.js'
import Icon from '../components/Icon.jsx'
import { Button, Segmented } from '../components/ui.jsx'

const ui = () => useUI.getState()
const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const clock = m => { const d = new Date(2000, 0, 1, Math.floor(((m % 1440) + 1440) % 1440 / 60), ((m % 60) + 60) % 60); return d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) }
const durText = m => (m >= 60 ? (Math.floor(m / 60) + ' ' + U('h') + (m % 60 ? ' ' + (m % 60) + ' ' + U('mn') : '')) : t('{0} min', n0(m)))
/** A duration that never breaks across two lines ("3 h 1 m" stays together). */
const durTight = m => durText(m).replace(/ /g, '\u00a0')
const mealName = key => t((MEALS.find(m => m.key === key) || MEALS[1]).name)
const kindName = b => (b.n ? t(b.n) : b.k === 'meal' ? mealName(b.meal) : t((KINDS[b.k] || KINDS.other).name))
const iconOf = b => b.ic || (KINDS[b.k] || KINDS.other).icon
const same = (a, b) => a.length === b.length && a.every(x => b.includes(x))
/** "Sunday – Thursday", "Friday & Saturday", "Every day" — else "Sun · Tue". */
export const kindLabel = days => (same(days, SCHOOL_DAYS) ? t('Sunday – Thursday') : same(days, WEEKEND) ? t('Friday & Saturday')
  : days.length === 7 ? t('Every day') : daysLabel(days, DAYS.map(d => t(d)), t, weekStartOf()))
const itemsText = (St, b) => (b.items || []).map(it => itemInfo(St, it)).filter(Boolean)
  .map(x => (x.own ? x.name : t(x.name)) + (x.kind === 'n' ? ' · ' + n0(x.g) + ' ' + U('g') : x.q !== 1 ? ' × ' + x.q.toLocaleString(dateLocale()) : ''))
  .join(getLang() === 'ar' ? '، ' : ', ')

/** The minutes of a kind of day: school, work, study, moving; water and calories (a range when the menu changes). */
function sumOf(St, ty) {
  const min = {}
  for (const { b } of ty.rows) min[b.k] = (min[b.k] || 0) + b.d
  const kc = ty.days.map((_, i) => ty.rows.reduce((a, r) => a + blockKcal(St, r.each[i]), 0))
  const ml = ty.rows.reduce((a, r) => a + blockMl(St, r.b), 0)
  const rem = ty.rows.filter(r => (r.b.rm === undefined ? 0 : r.b.rm) >= 0).length
  return { min, lo: Math.min(...kc), hi: Math.max(...kc), ml, rem }
}

/** A day as one bar: each block where it sits between the first block and bedtime. */
export function DayBar({ blocks, axis = false }) {
  const awake = blocks.filter(b => b.k !== 'sleep')
  if (!awake.length) return null
  const start = awake[0].s
  const rel = m => (((m - start) % 1440) + 1440) % 1440
  const end = Math.max(60, ...awake.map(b => rel(b.s) + b.d))
  return <div className="wg-barw">
    <div className="wg-bar" aria-hidden="true">
      {awake.map(b => <i key={b.id} style={{ '--c': (KINDS[b.k] || KINDS.other).color, insetInlineStart: (rel(b.s) / end * 100) + '%', width: Math.max(0.8, b.d / end * 100) + '%' }} />)}
    </div>
    {axis && <div className="wg-axis small muted" aria-hidden="true"><span>{clock(start)}</span><span>{clock(start + end / 2)}</span><span>{clock(start + end)}</span></div>}
  </div>
}

/** The kinds of day as small cards (shown when the week has more than one). */
export function WeekKinds({ plan, onOpen }) {
  const St = useStore(s => s.S)
  const types = useMemo(() => weekTypes(plan, weekStartOf()), [plan])
  if (types.length < 2) return null
  return <div className="wg-kinds">
    {types.slice(0, 3).map((ty, i) => {
      const s = sumOf(St, ty)
      const key = [['school', 'School'], ['work', 'Work'], ['study', 'Study']].filter(([k]) => s.min[k] > 0)
      return <button key={ty.days.join()} type="button" className="card wg-kind" style={{ '--i': i }} onClick={() => onOpen(i)}>
        <span className="wg-kind-h"><b>{kindLabel(ty.days)}</b><Icon name="chevronRight" className="chev" /></span>
        <DayBar blocks={ty.rows.map(r => r.b)} />
        <span className="wg-kind-s small">{key.length ? key.map(([k, name]) => t(name) + '\u00a0' + durTight(s.min[k])).join(' · ') : t('{0} blocks', n0(ty.rows.length))}</span>
      </button>
    })}
  </div>
}

function Glance({ start = 0 }) {
  const St = useStore(s => s.S)
  const plan = normPlan(St.planner)
  const types = useMemo(() => weekTypes(plan, weekStartOf()), [plan])
  const [ti, setTi] = useState(start)
  if (!plan || !types.length) return <div className="wg"><h3>{t('Week at a glance')}</h3><p className="small muted">{t('Nothing planned on this day yet.')}</p></div>
  const ty = types[Math.min(ti, types.length - 1)]
  const s = sumOf(St, ty)
  const shortDays = ty.days.map(d => t(DAYS[d]))
  // the list in parts of the day
  const parts = []
  for (const r of ty.rows) {
    const p = partOf(r.b.s)
    const last = parts[parts.length - 1]
    if (!last || last.p.key !== p.key) parts.push({ p, rows: [r] }); else last.rows.push(r)
  }
  const chips = [
    ['list', t('{0} blocks', n0(ty.rows.length)), 'var(--acc)'],
    s.min.school > 0 && ['school', durText(s.min.school), KINDS.school.color],
    s.min.work > 0 && ['briefcase', durText(s.min.work), KINDS.work.color],
    s.min.study > 0 && ['book', durText(s.min.study), KINDS.study.color],
    (s.min.walk || 0) + (s.min.workout || 0) > 0 && ['figureWalk', durText((s.min.walk || 0) + (s.min.workout || 0)), KINDS.walk.color],
    s.ml > 0 && ['drop', n0(s.ml) + ' ' + U('ml'), KINDS.water.color],
    s.hi > 0 && ['flame', <><bdi dir="ltr">{s.lo !== s.hi ? n0(s.lo) + '–' + n0(s.hi) : n0(s.hi)}</bdi> {U('kcal')}</>, 'var(--orange)'],
    ['bell', t('{0} reminders', n0(s.rem)), 'var(--red)'],
  ].filter(Boolean)
  return <div className="wg">
    <h3>{t('Week at a glance')}</h3>
    {types.length > 1 && <Segmented options={types.map((x, i) => ({ value: i, label: kindLabel(x.days) }))} value={Math.min(ti, types.length - 1)} onChange={setTi} />}
    <div className="wg-chips">{chips.map(([ic, txt, c]) => <span key={ic} className="wg-chip" style={{ '--c': c }}><Icon name={ic} />{txt}</span>)}</div>
    <DayBar blocks={ty.rows.map(r => r.b)} axis />
    <div className="wg-list">
      {parts.map(({ p, rows }, pi) => <div key={p.key + pi} className="wg-part" role="list" aria-label={t(p.name)}>
        <div className="wg-part-h" role="presentation"><Icon name={p.icon} /><b>{t(p.name)}</b></div>
        {rows.map(({ b, each, same: one }) => {
          const K = KINDS[b.k] || KINDS.other
          const rm = b.rm === undefined ? 0 : b.rm
          const ml = blockMl(St, b), kc = one ? blockKcal(St, b) : 0
          const its = one ? itemsText(St, b) : ''
          return <div key={b.id} role="listitem" className="wg-row" style={{ '--c': K.color }}>
            <span className="wg-t"><b>{clock(b.s)}</b>{b.k !== 'sleep' && b.d > 10 && <small>{clock(b.s + b.d)}</small>}</span>
            <span className="wg-ic"><Icon name={iconOf(b)} /></span>
            <span className="wg-txt">
              <b>{kindName(b)}</b>
              <small>{durText(b.d)}{kc > 0 && <> · {n0(kc)} {U('kcal')}</>}{ml > 0 && <> · {n0(ml)} {U('ml')}</>}</small>
              {its && <small className="wg-its" dir="auto">{its}</small>}
              {!one && <span className="wg-menu">{each.map((x, i) => <small key={x.id + i} dir="auto"><i>{shortDays[i]}</i>{itemsText(St, x) || '—'}</small>)}</span>}
              {b.nt && <small className="wg-note" dir="auto">{noteText(b.nt, t)}</small>}
            </span>
            <span className={'wg-bell' + (rm < 0 ? ' off' : '')} title={rm < 0 ? t('Off') : rm > 0 ? t('{0} min before', n0(rm)) : t('At the start')}><Icon name={rm < 0 ? 'bellSlash' : 'bell'} /></span>
          </div>
        })}
      </div>)}
    </div>
    <div className="dp-edit-save">
      <Button variant="tinted" icon="copy" onClick={() => copySchedule()}>{t('Copy')}</Button>
      <Button variant="primary" icon="upload" onClick={() => shareSchedule()}>{t('Share')}</Button>
    </div>
  </div>
}
export const weekGlanceSheet = (start = 0) => ui().openSheet(() => <Glance start={start} />)

/** The week as text, in your language. */
export function scheduleText(St) {
  const plan = normPlan(St.planner)
  if (!plan) return ''
  return planText(St, plan, {
    names: DAYN.map(d => t(d)), tr: t, fmtTime: clock, weekStart: weekStartOf(), title: 'My schedule', mealName,
    sep: getLang() === 'ar' ? '، ' : ', ', label: kindLabel,
  }) + '\n\n— MAHDI-JYM'
}
export async function shareSchedule() {
  const r = await shareText(scheduleText(useStore.getState().S), t('My schedule'))
  if (r === 'copied') ui().toast(t('Copied — paste it anywhere'))
}
async function copySchedule() {
  const ok = await copyText(scheduleText(useStore.getState().S))
  ui().toast(ok ? t('Copied — paste it anywhere') : t('Could not copy'))
}
