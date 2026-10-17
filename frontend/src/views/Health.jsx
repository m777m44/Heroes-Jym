// Health log (3.0) — sleep, mood, energy, stress, resting heart rate, blood pressure, blood
// sugar and your medicines / vitamins with reminders. Everything stays on this phone (and in
// your own backup); the maths and the medical ranges are in lib/health.js.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale } from '../lib/i18n.js'
import { fmtDate, fmtNum, todayISO } from '../lib/format.js'
import {
  RANGES, inRange, bpCategory, sugarCategory, sleepCategory, rhrCategory, toMgdl, fromMgdl, dayLog, setDay,
  addReading, removeReading, summary, series, logStreak, dosesOn, toggleDose, adherence, cleanTimes,
  newMedId, MED_MAX, shiftIso, TIME_RE,
} from '../lib/health.js'
import { ageOf } from '../lib/idealBody.js'
import Icon from '../components/Icon.jsx'
import CommitNumber from '../components/CommitNumber.jsx'
import LineChart from '../components/LineChart.jsx'
import { Section, Row, Segmented, Switch, Button, BackButton, NumberField } from '../components/ui.jsx'
import { confirmSheet } from '../sheets.jsx'

const BP = {
  low: ['Low', 'var(--blue)'], normal: ['Normal', 'var(--green)'], elevated: ['Elevated', 'var(--yellow)'],
  stage1: ['High — stage 1', 'var(--orange)'], stage2: ['High — stage 2', 'var(--red)'], crisis: ['Crisis range', 'var(--red)'],
}
const SUGAR = { low: ['Low', 'var(--red)'], normal: ['Normal', 'var(--green)'], pre: ['Raised', 'var(--orange)'], high: ['High', 'var(--red)'] }
const SLEEP = { short: ['Too short', 'var(--red)'], bitShort: ['A bit short', 'var(--orange)'], good: ['Enough', 'var(--green)'], long: ['Long', 'var(--yellow)'] }
const RHR = { low: ['Low (fine if you are fit)', 'var(--blue)'], normal: ['Normal', 'var(--green)'], high: ['High', 'var(--orange)'] }
const CTX = { fasting: 'Fasting', after: '2 h after a meal', random: 'Any time' }
const SCALES = {
  mood: ['Very low', 'Low', 'Okay', 'Good', 'Great'],
  energy: ['Drained', 'Low', 'Okay', 'Good', 'Full'],
  stress: ['None', 'Low', 'Some', 'High', 'Very high'],
  sleepQ: ['Very poor', 'Poor', 'Okay', 'Good', 'Excellent'],
}
const clock = ms => new Date(ms).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
const ui = () => useUI.getState()

export default function Health() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const today = todayISO()
  const [iso, setIso] = useState(today)
  const [range, setRange] = useState(7)
  const [metric, setMetric] = useState('sleep')
  const log = dayLog(S, iso)
  const unit = S.sugarUnit === 'mmol' ? 'mmol' : 'mgdl'
  const uLbl = unit === 'mmol' ? t('mmol/L') : t('mg/dL')
  const age = ageOf(S)
  const set = patch => update(s => setDay(s, iso, patch))
  const crisis = (log.bp || []).some(b => bpCategory(b.sys, b.dia) === 'crisis')
  const lowSugar = (log.sugar || []).some(x => x.v < 70)
  const sum = summary(S, iso, range)
  const adh = adherence(S, iso, range)
  const doses = dosesOn(S, iso)
  const streak = logStreak(S, today)
  const sl = sleepCategory(log.sleepH, age)
  const rc = rhrCategory(log.rhr)

  return <div className="narrow health">
    <div className="hdr">
      <BackButton fallback="/settings" />
      <div style={{ flex: 1, marginInlineStart: 10 }}><h1>{t('Health log')}</h1><div className="sub">{t('Private — stays on this phone')}</div></div>
    </div>

    {/* the day */}
    <div className="hl-date">
      <button className="iconbtn" onClick={() => setIso(shiftIso(iso, -1))} aria-label={t('Previous day')}><Icon name="chevronLeft" /></button>
      <div className="hl-date-t">
        <b>{iso === today ? t('Today') : iso === shiftIso(today, -1) ? t('Yesterday') : fmtDate(iso, true)}</b>
        {streak > 1 && <span className="small muted">{t('{0}-day logging streak', streak)}</span>}
      </div>
      <button className="iconbtn" disabled={iso >= today} onClick={() => setIso(shiftIso(iso, 1))} aria-label={t('Next day')}><Icon name="chevronRight" /></button>
    </div>
    {iso !== today && <div style={{ textAlign: 'center', marginTop: -6, marginBottom: 12 }}><button className="h2link" onClick={() => setIso(today)}>{t('Back to today')}</button></div>}

    {crisis && <div className="card hl-alert" role="alert">
      <Icon name="alert" /><div><b>{t('Blood pressure in the crisis range (over 180 / 120)')}</b>
        <div className="small">{t('Sit and rest for 5 minutes, then measure again. If it stays this high, or you have chest pain, shortness of breath, weakness, or trouble seeing or speaking — call emergency services now.')}</div></div>
    </div>}
    {lowSugar && <div className="card hl-alert warn" role="alert">
      <Icon name="alert" /><div><b>{t('Low blood sugar (under {0})', fromMgdl(70, unit) + ' ' + uLbl)}</b>
        <div className="small">{t('Take 15 g of fast sugar (juice, sugar, glucose tablets), check again in 15 minutes, and tell your doctor if it keeps happening.')}</div></div>
    </div>}

    <Section title={t('How you feel')}>
      {['mood', 'energy', 'stress'].map(k => <ScaleRow key={k} k={k} value={log[k]} onChange={v => set({ [k]: v })}
        icon={k === 'mood' ? 'smile' : k === 'energy' ? 'bolt' : 'wind'} tint={k === 'mood' ? 'var(--yellow)' : k === 'energy' ? 'var(--orange)' : 'var(--purple)'}
        title={t(k === 'mood' ? 'Mood' : k === 'energy' ? 'Energy' : 'Stress')} />)}
    </Section>

    <Section title={t('Sleep')} footer={sl ? t(SLEEP[sl][0]) + ' · ' + t('adults need 7–9 hours') : t('Last night, in hours (half hours are fine).')}>
      <Row icon="bed" iconTint="var(--indigo)" title={t('Hours slept')}>
        <CommitNumber className="rowfield" decimal value={log.sleepH} placeholder="7.5" aria-label={t('Hours slept')}
          onCommit={v => set({ sleepH: inRange(v, RANGES.sleepH) ? Math.round(v * 2) / 2 : null })} />
        <span className="muted small">{t('h')}</span>
      </Row>
      <ScaleRow k="sleepQ" value={log.sleepQ} onChange={v => set({ sleepQ: v })} icon="moon" tint="var(--teal)" title={t('Sleep quality')} />
    </Section>

    <Section title={t('Heart')} footer={rc ? t('Resting heart rate: {0}', t(RHR[rc][0])) : t('Measure after waking, before getting up: count your pulse for 30 seconds × 2.')}>
      <Row icon="heartPulse" iconTint="var(--red)" title={t('Resting heart rate')}>
        <CommitNumber className="rowfield" value={log.rhr} placeholder="64" aria-label={t('Resting heart rate')}
          onCommit={v => set({ rhr: inRange(v, RANGES.rhr) ? v : null })} />
        <span className="muted small">{t('bpm')}</span>
      </Row>
    </Section>

    {/* blood pressure */}
    <Readings title={t('Blood pressure')} icon="gauge" tint="var(--pink)" empty={t('No readings for this day.')} onAdd={() => bpSheet(iso)}
      footer={t('Sit quietly for 5 minutes, arm at heart level. Two readings a minute apart are better than one.')}
      items={(log.bp || []).map(b => { const c = bpCategory(b.sys, b.dia); return {
        t: b.t, main: b.sys + ' / ' + b.dia, unit: t('mmHg'), sub: b.pulse ? t('pulse {0}', b.pulse) : '', chip: BP[c],
        onDel: () => update(s => removeReading(s, iso, 'bp', b.t)),
      } })} />

    {/* blood sugar */}
    <Readings title={t('Blood sugar')} icon="drop" tint="var(--orange)" empty={t('No readings for this day.')} onAdd={() => sugarSheet(iso, unit)}
      head={<Segmented className="seg-inline" value={unit} onChange={v => update(s => { s.sugarUnit = v })}
        options={[{ value: 'mgdl', label: t('mg/dL') }, { value: 'mmol', label: t('mmol/L') }]} />}
      footer={t('Fasting: normal under {0}, raised {0}–{1}, high from {1} {2}.', fromMgdl(100, unit), fromMgdl(126, unit), uLbl)}
      items={(log.sugar || []).map(x => { const c = sugarCategory(x.v, x.ctx); return {
        t: x.t, main: fmtNum(fromMgdl(x.v, unit)), unit: uLbl, sub: t(CTX[x.ctx] || 'Any time'), chip: SUGAR[c],
        onDel: () => update(s => removeReading(s, iso, 'sugar', x.t)),
      } })} />

    {/* medicines & vitamins */}
    <div className="sect">
      <div className="row between sect-t"><h2 className="sect-t" style={{ margin: 0 }}>{t('Medicines & vitamins')}</h2>
        <button className="h2link" onClick={() => medSheet()}><Icon name="plus" /> {t('Add')}</button></div>
      <div className="sect-b">
        {doses.length ? doses.map(d => <button key={d.key} className={'lrow hl-dose' + (d.taken ? ' on' : '')} onClick={() => update(s => toggleDose(s, iso, d.key))} aria-pressed={d.taken}>
          <span className="hl-tick">{d.taken && <Icon name="check" />}</span>
          <span className="grow"><b>{d.med.name}</b>{d.med.dose ? <span className="muted"> · {d.med.dose}</span> : null}
            <span className="small dim" style={{ display: 'block' }}>{t(d.med.kind === 'vit' ? 'Vitamin' : 'Medicine')}</span></span>
          <span className="hl-time">{d.time}</span>
        </button>) : <div className="lrow small muted">{(S.meds || []).length ? t('Nothing due on this day.') : t('Add your medicines and vitamins to tick them off and get a reminder at each time.')}</div>}
      </div>
      {(S.meds || []).length > 0 && <div className="hl-meds">
        {S.meds.map(m => <button key={m.id} className={'hl-med' + (m.on === false ? ' off' : '')} onClick={() => medSheet(m)}>
          <Icon name={m.kind === 'vit' ? 'sparkles' : 'pill'} /><span>{m.name}</span>{m.remind !== false && m.on !== false && <Icon name="bell" />}
        </button>)}
      </div>}
    </div>

    {/* trends */}
    <div className="card">
      <div className="row between"><h2 style={{ margin: 0 }}>{t('Trends')}</h2>
        <Segmented className="seg-inline" value={range} onChange={setRange} options={[{ value: 7, label: t('{0} days', 7) }, { value: 30, label: t('{0} days', 30) }]} /></div>
      <div className="hl-tiles">
        <Mini icon="bed" c="var(--indigo)" l={t('Sleep')} v={sum.sleepH != null ? fmtNum(sum.sleepH) + ' ' + t('h') : '—'} />
        <Mini icon="smile" c="var(--yellow)" l={t('Mood')} v={sum.mood != null ? fmtNum(sum.mood) + '/5' : '—'} />
        <Mini icon="bolt" c="var(--orange)" l={t('Energy')} v={sum.energy != null ? fmtNum(sum.energy) + '/5' : '—'} />
        <Mini icon="wind" c="var(--purple)" l={t('Stress')} v={sum.stress != null ? fmtNum(sum.stress) + '/5' : '—'} />
        <Mini icon="heartPulse" c="var(--red)" l={t('Resting HR')} v={sum.rhr != null ? sum.rhr + ' ' + t('bpm') : '—'} />
        <Mini icon="gauge" c={sum.bp ? BP[sum.bp.cat][1] : 'var(--pink)'} l={t('Blood pressure')} v={sum.bp ? sum.bp.sys + '/' + sum.bp.dia : '—'} />
        <Mini icon="drop" c="var(--orange)" l={t('Fasting sugar')} v={sum.sugarFasting != null ? fmtNum(fromMgdl(sum.sugarFasting, unit)) : '—'} />
        <Mini icon="pill" c="var(--green)" l={t('Doses taken')} v={adh != null ? adh + '%' : '—'} />
      </div>
      <Segmented className="hl-metric" value={metric} onChange={setMetric}
        options={[{ value: 'sleep', label: t('Sleep') }, { value: 'mood', label: t('Mood') }, { value: 'bp', label: t('BP') }, { value: 'rhr', label: t('Heart') }, { value: 'sugar', label: t('Sugar') }]} />
      <Trend S={S} iso={iso} days={range} metric={metric} unit={unit} />
      <div className="small dim">{t('{0} of the last {1} days logged.', sum.daysLogged, range)}</div>
    </div>

    <div className="small dim ideal-note"><Icon name="info" /> {t('A personal log, not a diagnosis. Ranges follow the American Heart Association and the American Diabetes Association. Talk to your doctor about your numbers and before changing any medicine.')}</div>
  </div>
}

function ScaleRow({ k, value, onChange, icon, tint, title }) {
  return <div className="lrow hl-scale">
    <span className="lrow-i" style={{ '--tint': tint }}><Icon name={icon} /></span>
    <div className="grow">
      <div className="row between"><span>{title}</span><span className="small muted">{value ? t(SCALES[k][value - 1]) : ''}</span></div>
      <div className="hl-dots" role="radiogroup" aria-label={title}>
        {[1, 2, 3, 4, 5].map(n => <button key={n} role="radio" aria-checked={value === n} className={'hl-dot' + (value === n ? ' on' : '') + (value && n <= value ? ' fill' : '')}
          style={{ '--c': tint }} onClick={() => onChange(value === n ? null : n)} aria-label={t(SCALES[k][n - 1])}>{n}</button>)}
      </div>
    </div>
  </div>
}

function Readings({ title, icon, tint, items, empty, onAdd, footer, head }) {
  return <Section title={title} footer={footer}>
    {head && <div className="lrow" style={{ justifyContent: 'flex-end' }}>{head}</div>}
    {items.length ? items.map(x => <div key={x.t} className="lrow hl-read">
      <span className="lrow-i" style={{ '--tint': tint }}><Icon name={icon} /></span>
      <div className="grow"><b className="hl-read-v">{x.main}</b> <span className="small muted">{x.unit}</span>
        <div className="small dim">{clock(x.t)}{x.sub ? ' · ' + x.sub : ''}</div></div>
      {x.chip && <span className="hl-chip" style={{ '--c': x.chip[1] }}>{t(x.chip[0])}</span>}
      <button className="iconbtn" onClick={() => confirmSheet({ title: t('Delete this reading?'), confirmText: t('Delete'), danger: true, onConfirm: x.onDel })} aria-label={t('Delete')}><Icon name="trash" /></button>
    </div>) : <div className="lrow small muted">{empty}</div>}
    <button className="lrow hl-add" onClick={onAdd}><Icon name="plus" /> {t('Add reading')}</button>
  </Section>
}

function Mini({ icon, c, l, v }) {
  return <div className="hl-mini" style={{ '--c': c }}><span><Icon name={icon} /></span><b>{v}</b><small>{l}</small></div>
}

function Trend({ S, iso, days, metric, unit }) {
  const pick = {
    sleep: l => l.sleepH, mood: l => l.mood, rhr: l => l.rhr,
    bp: l => (l.bp && l.bp.length ? Math.round(l.bp.reduce((a, b) => a + b.sys, 0) / l.bp.length) : null),
    sugar: l => (l.sugar && l.sugar.length ? fromMgdl(l.sugar.reduce((a, b) => a + b.v, 0) / l.sugar.length, unit) : null),
  }[metric]
  const pts = series(S, iso, days, pick)
  const band = metric === 'sleep' ? [7, 9] : metric === 'bp' ? [90, 120] : metric === 'rhr' ? [60, 100] : metric === 'sugar' ? [fromMgdl(70, unit), fromMgdl(140, unit)] : null
  if (pts.length < 2) return <div className="hl-empty small muted">{t('Log at least two days to see a trend.')}</div>
  return <div className="chart"><LineChart points={pts} h={150} band={band} color={metric === 'bp' ? 'var(--pink)' : metric === 'sleep' ? 'var(--indigo)' : 'var(--acc)'} /></div>
}

/* ---------------------------------------------------------------- sheets */
export function bpSheet(iso) {
  ui().openSheet(close => <BpSheet iso={iso} close={close} />)
}
function BpSheet({ iso, close }) {
  const [sys, setSys] = useState(null), [dia, setDia] = useState(null), [pulse, setPulse] = useState(null)
  const ok = inRange(sys, RANGES.sys) && inRange(dia, RANGES.dia) && sys > dia && (pulse == null || inRange(pulse, RANGES.pulse))
  const c = ok ? bpCategory(sys, dia) : null
  const save = () => {
    if (!ok) { ui().toast(t('Check the numbers — the top one is bigger than the bottom one.')); return }
    useStore.getState().update(s => addReading(s, iso, 'bp', { t: stamp(iso), sys, dia, ...(pulse ? { pulse } : {}) }))
    close(); ui().toast(t('Saved'))
  }
  return <div className="hl-sheet">
    <h3>{t('Blood pressure')}</h3>
    <div className="hl-bp">
      <label><span>{t('Top (systolic)')}</span><NumberField className="input" decimal={false} nullable value={sys} onChange={setSys} placeholder="120" autoFocus /></label>
      <b>/</b>
      <label><span>{t('Bottom (diastolic)')}</span><NumberField className="input" decimal={false} nullable value={dia} onChange={setDia} placeholder="80" /></label>
    </div>
    <label className="hl-f"><span>{t('Pulse (optional)')}</span><NumberField className="input" decimal={false} nullable value={pulse} onChange={setPulse} placeholder="70" /></label>
    {c && <div className="hl-chip big" style={{ '--c': BP[c][1] }}>{t(BP[c][0])}</div>}
    <Button variant="primary" onClick={save} disabled={!ok}>{t('Save')}</Button>
  </div>
}
export function sugarSheet(iso, unit) {
  ui().openSheet(close => <SugarSheet iso={iso} unit={unit} close={close} />)
}
function SugarSheet({ iso, unit, close }) {
  const [v, setV] = useState(null), [ctx, setCtx] = useState('fasting')
  const mg = v != null ? Math.round(toMgdl(v, unit)) : null
  const ok = inRange(mg, RANGES.sugarMgdl)
  const c = ok ? sugarCategory(mg, ctx) : null
  const save = () => {
    if (!ok) return
    useStore.getState().update(s => addReading(s, iso, 'sugar', { t: stamp(iso), v: mg, ctx }))
    close(); ui().toast(t('Saved'))
  }
  return <div className="hl-sheet">
    <h3>{t('Blood sugar')}</h3>
    <label className="hl-f"><span>{unit === 'mmol' ? t('mmol/L') : t('mg/dL')}</span>
      <NumberField className="input" decimal={unit === 'mmol'} nullable value={v} onChange={setV} placeholder={unit === 'mmol' ? '5.4' : '95'} autoFocus /></label>
    <Segmented value={ctx} onChange={setCtx} options={Object.entries(CTX).map(([k, l]) => ({ value: k, label: t(l) }))} />
    {c && <div className="hl-chip big" style={{ '--c': SUGAR[c][1] }}>{t(SUGAR[c][0])}</div>}
    <Button variant="primary" onClick={save} disabled={!ok}>{t('Save')}</Button>
  </div>
}
// a reading for today is stamped now; for an earlier day, at noon of that day
const stamp = iso => (iso === todayISO() ? Date.now() : new Date(iso + 'T12:00:00').getTime())

export function medSheet(med) {
  const S = useStore.getState().S
  if (!med && (S.meds || []).length >= MED_MAX) { ui().toast(t('You can keep up to {0} medicines and vitamins.', MED_MAX)); return }
  ui().openSheet(close => <MedSheet med={med} close={close} />)
}
function MedSheet({ med, close }) {
  const [m, setM] = useState(() => med ? { ...med, times: [...(med.times || [])] } : { id: newMedId(), name: '', kind: 'med', dose: '', times: ['08:00'], on: true, remind: true })
  const [time, setTime] = useState('20:00')
  const patch = p => setM(x => ({ ...x, ...p }))
  const ok = m.name.trim().length > 0 && cleanTimes(m.times).length > 0
  const save = () => {
    if (!ok) { ui().toast(t('Add a name and at least one time.')); return }
    const clean = { ...m, name: m.name.trim().slice(0, 40), dose: (m.dose || '').trim().slice(0, 30), times: cleanTimes(m.times).slice(0, 6) }
    useStore.getState().update(s => { s.meds = s.meds || []; const i = s.meds.findIndex(x => x.id === clean.id); if (i >= 0) s.meds[i] = clean; else s.meds.push(clean) })
    close(); ui().toast(clean.remind && clean.on ? t('Saved — you will get a reminder at each time') : t('Saved'))
  }
  const del = () => confirmSheet({ title: t('Delete {0}?', m.name || t('Medicine')), confirmText: t('Delete'), danger: true,
    onConfirm: () => { useStore.getState().update(s => { s.meds = (s.meds || []).filter(x => x.id !== m.id) }); close() } })
  return <div className="hl-sheet">
    <h3>{med ? t('Edit') : t('Add a medicine or vitamin')}</h3>
    <Segmented value={m.kind} onChange={kind => patch({ kind })} options={[{ value: 'med', label: t('Medicine') }, { value: 'vit', label: t('Vitamin') }]} />
    <label className="hl-f"><span>{t('Name')}</span><input className="input" value={m.name} maxLength={40} onChange={e => patch({ name: e.target.value })} placeholder={m.kind === 'vit' ? t('Vitamin D') : t('Name of the medicine')} /></label>
    <label className="hl-f"><span>{t('Dose (optional)')}</span><input className="input" value={m.dose} maxLength={30} onChange={e => patch({ dose: e.target.value })} placeholder={t('1 tablet')} /></label>
    <div className="hl-f"><span>{t('Times each day')}</span>
      <div className="hl-times">
        {cleanTimes(m.times).map(x => <span key={x} className="hl-timechip">{x}<button onClick={() => patch({ times: m.times.filter(y => y !== x) })} aria-label={t('Remove {0}', x)}><Icon name="xmark" /></button></span>)}
        <span className="hl-timeadd"><input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} aria-label={t('Time')} />
          <Button size="sm" icon="plus" disabled={!TIME_RE.test(time) || m.times.includes(time) || m.times.length >= 6} onClick={() => patch({ times: [...m.times, time] })}>{t('Add')}</Button></span>
      </div>
    </div>
    <div className="sect-b" style={{ margin: '4px 0 14px' }}>
      <Row icon="bell" iconTint="var(--red)" title={t('Remind me')} subtitle={t('A notification at each time, even when the app is closed')}><Switch checked={m.remind !== false} onChange={remind => patch({ remind })} /></Row>
      <Row icon="pill" iconTint="var(--green)" title={t('Taking it now')} subtitle={t('Turn off to pause without deleting')}><Switch checked={m.on !== false} onChange={on => patch({ on })} /></Row>
    </div>
    <Button variant="primary" onClick={save} disabled={!ok}>{t('Save')}</Button>
    {med && <><div style={{ height: 8 }} /><Button variant="danger" onClick={del}>{t('Delete')}</Button></>}
  </div>
}
