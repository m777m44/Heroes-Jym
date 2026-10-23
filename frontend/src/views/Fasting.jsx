// Fasting tracker (8.0) — 12:12 to one meal a day, your own length, or Ramadan (from suhoor to
// iftar at your times). A live ring, the stage your body is roughly in, a timeline of what comes
// next, your streak and the last 7 days. On the phone a notification says when the fast is done.
// The maths is in lib/fasting.js.
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale } from '../lib/i18n.js'
import { PLANS, STAGES, planById, startFast, fastStatus, endFast, fastStats, lastDays, hmText, hText, normFasting, goalHours } from '../lib/fasting.js'
import { MOBILE } from '../lib/mobile.js'
import { celebrate } from '../lib/celebrate.js'
import { goalHaptic } from '../lib/hapticFeedback.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Switch, Button, BackButton } from '../components/ui.jsx'

const NOTIFY_ID = 7600
const ui = () => useUI.getState()
const hhmm = ms => new Date(ms).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
const dayShort = iso => new Date(iso + 'T12:00:00').toLocaleDateString(dateLocale(), { weekday: 'narrow' })

/** Phone only: one notification when the running fast reaches its goal (cancelled on end). */
export async function syncFastNotification(F) {
  if (!MOBILE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFY_ID }] }).catch(() => {})
    const f = normFasting(F)
    if (!f.active || !f.remind) return
    const at = f.active.start + f.active.goalH * 3600000
    if (at <= Date.now() + 30000) return
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    const ramadan = f.active.plan === 'ramadan'
    await LocalNotifications.schedule({ notifications: [{
      id: NOTIFY_ID, schedule: { at: new Date(at), allowWhileIdle: true },
      title: ramadan ? t('Time for iftar') : t('Fast complete!'),
      body: ramadan ? t('Your fast is done — break it gently with water and dates.') : t('You fasted {0} hours. Break it gently — water first, then a light meal.', f.active.goalH),
      extra: { route: '/fasting' },
    }] })
  } catch { /* notifications unavailable */ }
}

function StartedSheet({ close, onPick }) {
  const opts = [0, 1, 2, 3, 4, 6]
  const [custom, setCustom] = useState('')
  return <>
    <h3>{t('When did you start?')}</h3>
    <div className="fs-ago">
      {opts.map(h => <button key={h} className="chip" onClick={() => { close(); onPick(Date.now() - h * 3600000) }}>{h === 0 ? t('Just now') : t('{0} h ago', h)}</button>)}
    </div>
    <div className="row" style={{ gap: 8, marginTop: 12 }}>
      <input className="input" type="time" value={custom} onChange={e => setCustom(e.target.value)} aria-label={t('Start time')} />
      <Button size="sm" variant="tinted" onClick={() => {
        const m = /^(\d{2}):(\d{2})$/.exec(custom); if (!m) return
        const d = new Date(); d.setHours(+m[1], +m[2], 0, 0)
        if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1)
        close(); onPick(d.getTime())
      }}>{t('Set')}</Button>
    </div>
  </>
}

export default function Fasting() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const F = normFasting(S.fasting)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const st = fastStatus(F.active, now)
  const stats = fastStats(F.log, now)
  const days = lastDays(F.log, 7, now)
  const plan = planById(F.plan)
  const maxH = Math.max(16, ...days.map(d => d.hours))

  const save = fn => update(s => { const f = normFasting(s.fasting); fn(f); s.fasting = f })
  const begin = (start = Date.now()) => {
    let next = null
    save(f => { f.active = startFast(f, start); next = f })
    syncFastNotification(next)
    ui().toast(t('Fast started — you’ve got this!'))
  }
  const finish = () => {
    const e = endFast(F.active, Date.now())
    save(f => { f.log = [...f.log, e].slice(-400); f.active = null })
    syncFastNotification({ ...F, active: null })
    if (e.hit) { goalHaptic(); celebrate(Math.max(1, Math.round((e.end - e.start) / 3600000)), 'fast') }
    else ui().toast(t('Fast ended — {0}', hmText(e.end - e.start)))
  }
  const askEnd = () => st && st.done ? finish() : confirmSheet({
    title: t('End the fast early?'), message: t('{0} so far — it still counts in your log.', hmText(st ? st.elapsedMs : 0)),
    confirmText: t('End fast'), onConfirm: finish,
  })
  const setStart = () => ui().openSheet(close => <StartedSheet close={close} onPick={ms => {
    if (F.active) { let next = null; save(f => { f.active = { ...f.active, start: ms, goalH: f.active.plan === 'ramadan' ? goalHours(f, ms) : f.active.goalH }; next = f }); syncFastNotification(next) }
    else begin(ms)
  }} />)

  // the ring
  const R = 46, C = 2 * Math.PI * R
  const pct = st ? st.pct : 0
  const stage = st ? st.stage : STAGES[0]

  return <div className="narrow fs-page">
    <div className="hdr">
      <BackButton fallback="/tools" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Fasting tracker')}</h1><div className="sub">{t('Intermittent fasting and Ramadan')}</div></div>
    </div>

    <div className={'card fs-hero' + (st ? ' on' : '') + (st && st.done ? ' done' : '')}>
      <div className="fs-ring">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs><linearGradient id="fsg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--orange)" /><stop offset="1" stopColor="var(--pink)" /></linearGradient></defs>
          <circle className="fs-ring-bg" cx="50" cy="50" r={R} />
          <circle className="fs-ring-fg" cx="50" cy="50" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
          {STAGES.slice(1).map(sg => {
            const goal = st ? st.goalH : plan.fast || 16
            if (sg.h >= goal) return null
            const a = (sg.h / goal) * 2 * Math.PI
            return <circle key={sg.id} className={'fs-tick' + (st && st.elapsedH >= sg.h ? ' on' : '')} cx={50 + R * Math.cos(a)} cy={50 + R * Math.sin(a)} r="2.6" />
          })}
        </svg>
        <div className="fs-ring-in">
          {st ? <>
            <div className="lbl2">{st.done ? t('Goal reached!') : t('Fasting for')}</div>
            <div className="fs-time">{hmText(st.elapsedMs)}</div>
            <div className="small muted">{st.done ? t('+{0} over your goal', hmText(st.elapsedMs - st.goalMs)) : t('{0} to go', hmText(st.leftMs))}</div>
          </> : <>
            <div className="lbl2">{t('Ready when you are')}</div>
            <div className="fs-time">{plan.id === 'custom' ? hText(F.custom) : plan.id === 'ramadan' ? t('Ramadan') : <span dir="ltr">{plan.name}</span>}</div>
            <div className="small muted">{plan.id === 'ramadan' ? t('Until iftar at {0}', F.iftar) : t('{0} hours of fasting', plan.id === 'custom' ? F.custom : plan.fast)}</div>
          </>}
        </div>
      </div>
      {st && <div className="fs-stage" key={stage.id}><span className="fs-stage-ic"><Icon name={stage.icon} /></span><div><b>{t(stage.name)}</b><div className="small muted">{t(stage.desc)}</div></div></div>}
      {st && <div className="fs-times">
        <button onClick={setStart}><span className="lbl2">{t('Started')}</span><b>{hhmm(F.active.start)}</b><Icon name="pencil" /></button>
        <div><span className="lbl2">{t('Goal')}</span><b>{hhmm(st.endsAt)}</b></div>
      </div>}
      {st ? <Button variant={st.done ? 'primary' : 'tinted'} icon={st.done ? 'checkCircle' : 'stop'} onClick={askEnd}>{st.done ? t('Finish fast') : t('End fast')}</Button>
        : <><Button variant="primary" icon="play" onClick={() => begin()}>{t('Start fasting')}</Button>
          <button className="pg-later" onClick={setStart}>{t('I started earlier')}</button></>}
    </div>

    {!st && <Section title={t('Plan')}>
      <div className="fs-plans">
        {PLANS.map((p, i) => <button key={p.id} className={'fs-plan' + (F.plan === p.id ? ' on' : '')} style={{ '--i': i }} onClick={() => save(f => { f.plan = p.id })}>
          <b>{p.id === 'ramadan' ? '☾' : p.id === 'custom' ? hText(F.custom) : <span dir="ltr">{p.name}</span>}</b>
          <span>{p.id === 'ramadan' ? t('Ramadan') : p.id === 'custom' ? t('Custom') : t(p.sub)}</span>
        </button>)}
      </div>
      {F.plan === 'custom' && <Row title={t('Hours of fasting')}>
        <div className="stp it-stp">
          <button onClick={() => save(f => { f.custom = Math.max(1, f.custom - 1) })} aria-label={t('Decrease')}><Icon name="minus" /></button>
          <span className="val">{hText(F.custom)}</span>
          <button onClick={() => save(f => { f.custom = Math.min(72, f.custom + 1) })} aria-label={t('Increase')}><Icon name="plus" /></button>
        </div>
      </Row>}
      {F.plan === 'ramadan' && <>
        <Row icon="moon" iconTint="var(--indigo)" title={t('Suhoor ends')}><input className="input fs-tin" type="time" value={F.suhoor} onChange={e => save(f => { f.suhoor = e.target.value || f.suhoor })} /></Row>
        <Row icon="sun" iconTint="var(--orange)" title={t('Iftar')}><input className="input fs-tin" type="time" value={F.iftar} onChange={e => save(f => { f.iftar = e.target.value || f.iftar })} /></Row>
      </>}
    </Section>}

    {MOBILE && <Section>
      <Row icon="bell" iconTint="var(--red)" title={t('Tell me when the fast is done')}>
        <Switch checked={F.remind} onChange={v => { let next = null; save(f => { f.remind = v; next = f }); syncFastNotification(next) }} />
      </Row>
    </Section>}

    <Section title={t('What happens in your body')} footer={t('A rough guide — every body is different. Fasting isn’t for everyone: if you are pregnant, diabetic, underweight or on medication, ask a doctor first.')}>
      <div className="fs-tl">
        {STAGES.map(sg => {
          const reached = st && st.elapsedH >= sg.h
          const cur = st && st.stage.id === sg.id
          return <div key={sg.id} className={'fs-tl-i' + (reached ? ' on' : '') + (cur ? ' cur' : '')}>
            <span className="fs-tl-dot"><Icon name={sg.icon} /></span>
            <div className="grow"><b>{t(sg.name)}</b> <span className="small muted">{hText(sg.h)}+</span><div className="small muted">{t(sg.desc)}</div></div>
          </div>
        })}
      </div>
    </Section>

    <Section title={t('Your fasts')}>
      <div className="fs-week">
        {days.map(d => <div key={d.d} className={'fs-day' + (d.hit ? ' hit' : '')}>
          <div className="fs-col"><i style={{ height: Math.min(100, (d.hours / maxH) * 100) + '%' }} /></div>
          <span>{dayShort(d.d)}</span>
        </div>)}
      </div>
      <div className="fs-stats">
        <div><b>{stats.streak}</b><span>{t('Day streak')}</span></div>
        <div><b>{stats.hit}/{stats.count}</b><span>{t('Goals reached')}</span></div>
        <div><b>{hText(stats.longestH)}</b><span>{t('Longest')}</span></div>
        <div><b>{hText(stats.avgH)}</b><span>{t('Average')}</span></div>
      </div>
    </Section>
  </div>
}
