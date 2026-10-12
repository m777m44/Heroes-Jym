import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { nav } from '../lib/nav.js'
import { MOBILE } from '../lib/mobile.js'
import {
  CONTAINERS, CONTAINER_NAME, CONTAINER_COUNT, GOALS_ML, REMIND_EVERY, containerOf, waterGoalMlOf, mlOn, waterDays,
  waterStreak, waterAverage, countIn, recommendedMl, waterRemindPrefs, nextReminder, MOVES,
} from '../lib/water.js'
import { bodyKg, testWaterReminder } from '../lib/waterSync.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, SelectRow, Switch, Button } from '../components/ui.jsx'
import { ContainerIcon, Vessel, drink, undoLast, useWaterUndo, fmtMl } from '../components/water/WaterParts.jsx'

const everyLabel = m => m % 60 === 0 ? t('Every {0} h', m / 60) : t('Every {0} min', m)

// Water & reminders (2.5): the glass for today, what you drink from, the goal (with a
// recommendation from your body weight), the reminders — hours, interval, a short exercise
// with each — and the last two weeks.
export default function Water() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const canUndo = useWaterUndo(s => s.stack.length > 0)
  const [busy, setBusy] = useState(false)
  const iso = todayISO()
  const goal = waterGoalMlOf(S)
  const ml = mlOn(S, iso)
  const unit = containerOf(S)
  const rp = waterRemindPrefs(S)
  const days = waterDays(S, iso, 14)
  const max = Math.max(goal, ...days.map(d => d.ml), 1)
  const kg = bodyKg(S)
  const rec = recommendedMl(kg)
  const next = rp.on ? nextReminder(rp, new Date()) : null
  const time = d => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
  const setRemind = patch => update(s => { s.waterRemind = { ...waterRemindPrefs(s), ...patch } })
  const best = Math.max(0, ...days.map(d => d.ml))

  const enableReminders = async v => {
    setRemind({ on: v })
    if (v && !MOBILE && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission() } catch { /* toast fallback */ }
    }
  }
  const test = async () => {
    setBusy(true)
    const r = await testWaterReminder(useStore.getState().S)
    setBusy(false)
    if (typeof r === 'string' && r.startsWith('toast:')) useUI.getState().toast(r.slice(6))
    else if (r === 'denied') useUI.getState().toast(t('Notifications are blocked for this app in the system settings.'))
  }

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" className="icn-dir" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Water')}</h1></div>
      <Button size="sm" icon="reset" onClick={undoLast} disabled={!canUndo}>{t('Undo')}</Button>
    </div>

    <div className="card whydro">
      <Vessel pct={ml / goal} size={120} label={t('{0} of {1} ml', fmtMl(ml), fmtMl(goal))} />
      <div className="big">{fmtMl(ml)}<span className="muted" style={{ fontSize: '1rem' }}> / {fmtMl(goal)} {t('ml')}</span></div>
      <div className="small muted">
        {t(CONTAINER_COUNT[unit.key], countIn(ml, unit).toLocaleString(dateLocale()))} · {Math.min(999, Math.round(ml / goal * 100))}%
        {next && ml < goal ? <> · <Icon name="bell" /> {t('Next reminder {0}', time(next))}</> : null}
      </div>
      <div className="water-chips" style={{ width: '100%' }}>
        {CONTAINERS.map(c => (
          <button key={c.key} className={'wchip' + (c.key === unit.key ? ' sel' : '')} onClick={() => drink(c)}>
            <ContainerIcon kind={c.key} />
            <span className="wchip-n">{t(CONTAINER_NAME[c.key])}</span>
            <span className="wchip-ml">+{fmtMl(c.ml)}</span>
          </button>
        ))}
      </div>
    </div>

    <Section title={t('I usually drink from')} footer={t('The reminder’s “Drank it” button and the “+” on the step notification add one of these.')}>
      <div className="wcont" style={{ padding: 12 }}>
        {CONTAINERS.map(c => (
          <button key={c.key} className={c.key === unit.key ? 'sel' : ''} aria-pressed={c.key === unit.key}
            onClick={() => update(s => { s.waterUnit = c.key })}>
            <ContainerIcon kind={c.key} />
            <b>{t(CONTAINER_NAME[c.key])}</b>
            <small>{fmtMl(c.ml)} {t('ml')}</small>
          </button>
        ))}
      </div>
    </Section>

    <Section title={t('Daily goal')} footer={kg
      ? t('About 33 ml per kg of body weight — {0} ml for {1} kg. More on hot days and training days.', fmtMl(rec), Math.round(kg))
      : t('Log your body weight for a personal recommendation (about 33 ml per kg).')}>
      <SelectRow icon="target" iconTint="var(--blue)" title={t('Daily water goal')} sheetTitle={t('Daily water goal')}
        value={goal}
        options={[...new Set([...GOALS_ML, goal, rec])].sort((a, b) => a - b).map(g => ({ value: g, label: `${fmtMl(g)} ${t('ml')}` + (g === rec && kg ? ' · ' + t('Recommended') : '') }))}
        onChange={v => update(s => { s.waterGoalMl = v })} />
      {kg && goal !== rec && <Row icon="sparkles" iconTint="var(--teal)" title={t('Use the recommendation')} value={`${fmtMl(rec)} ${t('ml')}`}
        accessory="chevron" onClick={() => update(s => { s.waterGoalMl = rec })} />}
    </Section>

    <Section title={t('Reminders')}
      footer={MOBILE
        ? t('Arrive with the app closed, with today’s water and steps and a short exercise. Skipped once the goal is reached.')
        : t('In the browser, reminders appear while MAHDI-JYM is open. Install the Android app for reminders with the app closed.')}>
      <Row icon="bell" iconTint="var(--blue)" title={t('Remind me to drink')} subtitle={next ? t('Next reminder {0}', time(next)) : null}>
        <Switch checked={rp.on} onChange={enableReminders} />
      </Row>
      {rp.on && <>
        <SelectRow icon="timer" iconTint="var(--purple)" title={t('How often')} sheetTitle={t('How often')} value={rp.every}
          options={REMIND_EVERY.map(m => ({ value: m, label: everyLabel(m) }))} onChange={v => setRemind({ every: v })} />
        <Row icon="sun" iconTint="var(--yellow)" title={t('From')}>
          <input type="time" className="timefield" value={rp.from} onChange={e => e.target.value && setRemind({ from: e.target.value })} aria-label={t('From')} />
        </Row>
        <Row icon="moon" iconTint="var(--indigo, var(--purple))" title={t('Until')}>
          <input type="time" className="timefield" value={rp.to} onChange={e => e.target.value && setRemind({ to: e.target.value })} aria-label={t('Until')} />
        </Row>
        <Row icon="figureStrength" iconTint="var(--orange)" title={t('Suggest an exercise')}
          subtitle={t('A short walk after sitting still or when behind on steps, else a quick move like “{0}”.', t(MOVES[0]))}>
          <Switch checked={rp.move} onChange={v => setRemind({ move: v })} />
        </Row>
        <Row icon="play" iconTint="var(--teal)" title={t('Send a test reminder')} accessory="chevron" onClick={busy ? undefined : test} />
      </>}
    </Section>

    <Section title={t('Last 14 days')}>
      <div style={{ padding: '12px 14px 14px' }}>
        <div className="wbars" aria-hidden="true">
          {days.map(d => <div key={d.iso} className={'b' + (d.iso === iso ? ' today' : '')}>
            <i style={{ height: Math.max(3, Math.round(d.ml / max * 100)) + '%', background: d.ml >= goal ? 'linear-gradient(180deg,#64d2ff,var(--blue))' : 'color-mix(in srgb,var(--blue) 40%,transparent)' }} />
            <span>{new Date(d.iso + 'T12:00:00').getDate().toLocaleString(dateLocale())}</span>
          </div>)}
        </div>
        <div className="wstats">
          <div><b>{fmtMl(waterAverage(S, iso, 7))}</b><span>{t('7-day average')} ({t('ml')})</span></div>
          <div><b>{waterStreak(S, iso).toLocaleString(dateLocale())}</b><span>{t('Day streak')}</span></div>
          <div><b>{fmtMl(best)}</b><span>{t('Best day')} ({t('ml')})</span></div>
        </div>
      </div>
    </Section>

    <Section title={t('Settings')}>
      <Row icon="drop" iconTint="var(--blue)" title={t('Water tracker')} subtitle={t('The Water card on Home')}>
        <Switch checked={S.waterOn !== false} onChange={v => update(s => { s.waterOn = v })} />
      </Row>
      <Row icon="sparkles" iconTint="var(--pink)" title={t('Celebrations')} subtitle={t('Full screen, also with the app closed')} accessory="chevron" onClick={() => nav('/walk')} />
    </Section>
  </div>
}
