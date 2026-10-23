// Quick search (8.0) — the 🔍 on Home: type and jump to any screen, tool, routine or exercise.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, exName, exSearch } from '../lib/i18n.js'
import { EXDB } from '../lib/exercises.js'
import { routineLabel } from '../lib/routines.js'
import { search } from '../lib/quickSearch.js'
import { exerciseDetailSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'

const KIND = { place: 'Screens & tools', routine: 'Your routines', exercise: 'Exercises' }
const SUGGEST = ['Interval timer', 'Fasting tracker', 'Breathe', 'Recovery', 'Water', 'Backups & restore']

function QuickSearch({ close, nav, extra }) {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  useEffect(() => { const tm = setTimeout(() => ref.current && ref.current.focus(), 220); return () => clearTimeout(tm) }, [])
  const all = useMemo(() => [...EXDB, ...(S.customEx || [])], [S.customEx])
  const res = useMemo(() => search(q, { routines: S.routines, exercises: all, tr: t, exName, exSearch, routineName: r => routineLabel(r.name) }), [q, S.routines, all])
  const go = r => {
    close()
    if (r.kind === 'exercise') { setTimeout(() => exerciseDetailSheet(r.ex), 120); return }
    if (r.to && r.to[0] === '#') { setTimeout(() => extra[r.to.slice(1)] && extra[r.to.slice(1)](), 120); return }
    nav(r.to)
  }
  const groups = ['place', 'routine', 'exercise'].map(k => [k, res.filter(r => r.kind === k)]).filter(([, l]) => l.length)
  const quick = useMemo(() => SUGGEST.map(s => search(s, { tr: t })[0]).filter(Boolean), [])

  return <div className="qs">
    <div className="qs-box">
      <Icon name="magnifier" />
      <input ref={ref} className="qs-in" value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search screens, tools, exercises…')}
        onKeyDown={e => { if (e.key === 'Enter' && res[0]) go(res[0]) }} enterKeyHint="search" aria-label={t('Search')} />
      {q && <button className="qs-x" onClick={() => { setQ(''); ref.current && ref.current.focus() }} aria-label={t('Clear')}><Icon name="xmark" /></button>}
    </div>
    {!q && <>
      <div className="qs-h">{t('Try')}</div>
      <div className="qs-chips">{quick.map(r => <button key={r.title} className="chip" onClick={() => go(r)}><Icon name={r.icon} style={{ color: r.tint }} /> {r.title}</button>)}</div>
    </>}
    {q && !res.length && <div className="qs-empty"><Icon name="magnifier" /><div>{t('Nothing found for “{0}”', q)}</div></div>}
    <div className="qs-res">
      {groups.map(([k, list]) => <div key={k}>
        <div className="qs-h">{t(KIND[k])}</div>
        {list.slice(0, k === 'exercise' ? 12 : 8).map((r, i) => <button key={k + (r.id || r.to) + i} className="qs-r" style={{ '--i': i }} onClick={() => go(r)}>
          <span className="lrow-i" style={{ '--tint': r.tint }}><Icon name={r.icon} /></span>
          <span className="grow"><b>{r.title}</b>{r.sub && <small>{r.sub}</small>}</span>
          <Icon name="chevronRight" className="lrow-c" />
        </button>)}
      </div>)}
    </div>
  </div>
}

/** Open the search sheet. `extra` = actions for '#…' targets ({ zones, whatsnew, profile }). */
export function quickSearchSheet(nav, extra = {}) {
  useUI.getState().openSheet(close => <QuickSearch close={close} nav={nav} extra={extra} />)
}
