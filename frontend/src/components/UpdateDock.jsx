// 17.0 — the in-app update on screen (lib/appUpdate.js):
//   UpdateDock    docked at the bottom of the screen, over the tab bar's edge: what the update is
//                 (version, size, what's new) with "Update" and "Cancel"; then the download — a big
//                 percentage that moves smoothly with the real bytes, MB done of total, the speed, the
//                 time left and the three steps (download · check · install). It can shrink to a slim
//                 bar while you keep using the app.
//   UpdateCenter  Settings → App & updates: the state, "Check for updates", "Look for updates by itself",
//                 and the versions this phone got.
import { useEffect, useRef, useState } from 'react'
import { t, dateLocale, getLang } from '../lib/i18n.js'
import { motionReduced } from '../lib/a11y.js'
import { APP_VERSION } from '../lib/updates.js'
import { useUpdate, updateStart, updateCancel, updateCheck, updateInstall, updateAllow, updateShow, updateDemo, isBusy, autoOn, setAutoOn, updateHistory } from '../lib/appUpdate.js'
import Icon from './Icon.jsx'
import { Button, Row, Switch } from './ui.jsx'

const num = (v, d = 1) => (+v || 0).toLocaleString(dateLocale(), { minimumFractionDigits: d, maximumFractionDigits: d })
/** Bytes → "6.2" (MB, one decimal; at least 0.1). */
export const mbOf = b => num(Math.max(0.1, (+b || 0) / 1048576), (+b || 0) >= 100 * 1048576 ? 0 : 1)
/** Bytes per second → "1.4 MB/s" / "820 KB/s". */
export function speedOf(bps) {
  if (!(bps > 0)) return ''
  return bps >= 1048576 ? t('{0} MB/s', num(bps / 1048576)) : t('{0} KB/s', num(Math.max(1, bps / 1024), 0))
}
/** Seconds → "12 s left" / "3 min left" / "almost done". */
export function etaText(s) {
  if (s == null) return ''
  if (s <= 1) return t('almost done')
  if (s < 60) return t('{0} s left', num(s, 0))
  const m = Math.floor(s / 60), r = s % 60
  return m < 10 && r ? t('{0} min {1} s left', num(m, 0), num(r, 0)) : t('{0} min left', num(Math.round(s / 60), 0))
}

/**
 * A number that glides to its target (about 0.2 s behind, never backwards while a download runs) —
 * the percentage and the bar move smoothly between the network's chunks.
 */
export function useSmooth(target, { reset = false } = {}) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    if (reset || motionReduced() || typeof requestAnimationFrame !== 'function') { cur.current = target; setV(target); return }
    let raf = 0, last = 0
    const step = now => {
      const dt = last ? Math.min(64, now - last) : 16
      last = now
      const next = cur.current + (target - cur.current) * (1 - Math.exp(-dt / 90))
      cur.current = Math.abs(target - next) < 0.0004 ? target : next
      setV(cur.current)
      if (cur.current !== target) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, reset])
  return v
}

const STEPS = [
  { key: 'download', name: 'Download', icon: 'download' },
  { key: 'check', name: 'Check', icon: 'shield' },
  { key: 'install', name: 'Install', icon: 'sparkles' },
]
const stepOf = phase => (phase === 'downloading' ? 0 : phase === 'verifying' ? 1 : ['installing', 'permission', 'ready', 'done'].includes(phase) ? 2 : -1)

function Steps({ phase }) {
  const at = stepOf(phase)
  return <ol className="ud-steps" aria-hidden="true">
    {STEPS.map((s, i) => <li key={s.key} className={i < at || phase === 'done' ? 'done' : i === at ? 'now' : ''}>
      <span className="ud-step-dot"><Icon name={i < at || phase === 'done' ? 'check' : s.icon} /></span>
      <span className="ud-step-t">{t(s.name)}</span>
    </li>)}
  </ol>
}

/** The bar and its numbers. */
function Progress({ s, mini = false }) {
  const target = s.phase === 'downloading' ? (s.total > 0 ? Math.min(1, s.done / s.total) : 0) : stepOf(s.phase) > 0 ? 1 : 0
  const p = useSmooth(target, { reset: target === 0 })
  const pct = Math.floor(p * 100 + 1e-6)
  const bar = <div className={'ud-bar' + (s.phase === 'downloading' ? ' live' : '')} role="progressbar" aria-label={t('Update progress')}
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={t('{0}%', pct)}>
    <i style={{ transform: `scaleX(${p.toFixed(4)})` }} />
  </div>
  if (mini) return <>{bar}<b className="ud-mini-pct">{t('{0}%', num(pct, 0))}</b></>
  // the MB follow the same gliding share as the bar (an APK: bytes are the share); the online app's
  // count is the network's alone (files copied from the running version don't cost data)
  const got = s.kind === 'live' ? s.bytes : Math.min(s.bytesTotal, p * s.bytesTotal)
  const meta = s.phase === 'downloading'
    ? [s.bytesTotal > 0 ? t('{0} of {1} MB', mbOf(got), mbOf(s.bytesTotal)) : '', speedOf(s.speed), etaText(s.eta)].filter(Boolean)
    : [s.phase === 'verifying' ? t('Checking every file (SHA-256)') : s.phase === 'installing' ? (s.kind === 'apk' ? t('Opening Android’s installer…') : t('Restarting into the new version…')) : '']
  return <div className="ud-prog">
    <div className="ud-pct-row">
      <span className="ud-pct" aria-hidden="true"><b>{num(pct, 0)}</b><small>%</small></span>
      <span className="ud-meta" aria-live="off">{meta.map((m, i) => <span key={i}>{m}</span>)}</span>
    </div>
    {bar}
    <Steps phase={s.phase} />
  </div>
}

const ICON = { available: 'rocket', downloading: 'download', verifying: 'shield', installing: 'sparkles', permission: 'lock', ready: 'checkCircle', error: 'alert', done: 'checkCircle' }

/** The texts of each moment. */
function texts(s) {
  const v = s.version
  const size = s.size > 0 ? mbOf(s.size) : ''
  switch (s.phase) {
    case 'available': return {
      title: s.same ? t('New improvements for MAHDI-JYM {0}', v) : t('MAHDI-JYM {0} is here', v),
      sub: s.stopped ? t('Download stopped — what came down is kept; it goes on from there.')
        : s.kind === 'live' ? (size ? t('{0} MB · inside the app, no reinstall · your data stays', size) : t('Inside the app, no reinstall · your data stays'))
          : s.kind === 'apk' ? t('{0} MB · downloads here, then Android installs it over this one · your data stays', size)
            : s.kind === 'demo' ? t('A demo: see how updating works — nothing is downloaded')
              : t('Download the new app and install it over this one — your data stays.'),
    }
    case 'downloading': return { title: t('Downloading the update…'), sub: 'MAHDI-JYM ' + v }
    case 'verifying': return { title: t('Checking the update…'), sub: 'MAHDI-JYM ' + v }
    case 'installing': return { title: s.kind === 'apk' ? t('Installing…') : t('Installing — the app restarts'), sub: t('Your data stays exactly as it is') }
    case 'permission': return { title: t('Allow updates from MAHDI-JYM'), sub: t('Android asks once: turn on “Allow from this source”, then come back — the update goes on.') }
    case 'ready': return { title: t('Ready to install — MAHDI-JYM {0}', v), sub: t('Downloaded and checked. Tap Install — your data stays.') }
    case 'done': return { title: t('Updated — MAHDI-JYM {0}', v), sub: t('In the Android app the new version starts now. This was a demo.') }
    case 'error': return {
      title: t('The update stopped'),
      sub: s.error === 'checksum' ? t('A file didn’t match what was published — it downloads again.')
        : s.error === 'space' ? t('Not enough space on the phone — free {0} MB and try again.', mbOf(s.size * 1.2))
          : s.error === 'install' ? t('Android’s installer didn’t open — try again.')
            : t('Check the connection and try again — it goes on from where it stopped.'),
    }
    default: return null
  }
}

/** The update at the bottom of the screen. */
export default function UpdateDock() {
  const s = useUpdate()
  const [mini, setMini] = useState(false)
  const busy = isBusy(s.phase)
  useEffect(() => { if (!busy) setMini(false) }, [busy])
  const show = s.dock && !!s.kind && ['available', 'downloading', 'verifying', 'installing', 'permission', 'ready', 'error', 'done'].includes(s.phase)
  if (!show) return null
  const tx = texts(s)
  if (!tx) return null
  const lang = getLang()
  const notes = s.phase === 'available' && !s.stopped && s.notes ? (lang === 'ar' ? s.notes.ar || s.notes.en : s.notes.en || s.notes.ar) : ''
  if (mini && busy) {
    return <div className="ud ud-is-mini" role="region" aria-label={t('App update')}>
      <button type="button" className="ud-mini" onClick={() => setMini(false)} aria-label={t('Show the update')}>
        <span className={'ud-badge sm ' + s.phase}><Icon name={ICON[s.phase]} /></span>
        <span className="ud-mini-t">{tx.title}</span>
        <Progress s={s} mini />
      </button>
    </div>
  }
  const primary = s.phase === 'available' ? { label: t('Update'), icon: 'download', on: updateStart }
    : s.phase === 'error' ? { label: t('Try again'), icon: 'refresh', on: updateStart }
      : s.phase === 'permission' ? { label: t('Open settings'), icon: 'gear', on: updateAllow }
        : s.phase === 'ready' ? { label: t('Install'), icon: 'download', on: updateInstall }
          : null
  const canCancel = s.phase !== 'verifying' && s.phase !== 'installing'
  return <div className={'ud ud-' + s.phase} role="region" aria-label={t('App update')}>
    <div className="ud-card">
      <div className="ud-head">
        <span className={'ud-badge ' + s.phase} aria-hidden="true"><Icon name={ICON[s.phase]} /></span>
        <div className="ud-titles" aria-live="polite">
          <b>{tx.title}</b>
          <small>{tx.sub}</small>
        </div>
        {busy && <button type="button" className="iconbtn sm ud-shrink" onClick={() => setMini(true)} aria-label={t('Make it small')}><Icon name="chevronDown" /></button>}
      </div>
      {notes && <p className="ud-notes" dir="auto"><Icon name="sparkle" /><span>{notes}</span></p>}
      {(busy || s.phase === 'ready' || s.phase === 'permission' || s.phase === 'done') && <Progress s={s} />}
      {(primary || canCancel || s.phase === 'done') && <div className="ud-btns">
        {s.phase === 'done' ? <Button variant="primary" onClick={updateCancel}>{t('Close')}</Button> : <>
          {canCancel && <Button variant="tinted" className={'ud-cancel' + (primary ? '' : ' wide')} icon="xmark" onClick={updateCancel}>{t('Cancel')}</Button>}
          {primary && <Button variant="primary" className="ud-go" icon={primary.icon} onClick={primary.on}>{primary.label}{s.phase === 'available' && s.size > 0 ? ' · ' + t('{0} MB', mbOf(s.size)) : ''}</Button>}
        </>}
      </div>}
    </div>
  </div>
}

// ---- Settings → App & updates ------------------------------------------------------------------------
const ago = at => {
  if (!at) return ''
  const m = Math.round((Date.now() - at) / 60000)
  if (m < 1) return t('just now')
  if (m < 60) return t('{0} min ago', num(m, 0))
  const h = Math.round(m / 60)
  if (h < 24) return t('{0} h ago', num(h, 0))
  return new Date(at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })
}
const HOW = { live: 'Inside the app', same: 'Inside the app — improvements', apk: 'New app, installed from inside the app', install: 'Installed' }
const howOf = h => HOW[h.same ? 'same' : h.how] || HOW.install

/** Settings → App & updates in the Android apps: the in-app update's rows. */
export function UpdateCenter() {
  const s = useUpdate()
  const [auto, setAuto] = useState(autoOn)
  const [open, setOpen] = useState(false)
  const busy = isBusy(s.phase)
  const hist = updateHistory()
  const status = s.phase === 'checking' ? t('Checking…')
    : s.phase === 'latest' ? t('You have the newest version ({0})', APP_VERSION) + (s.checkedAt ? ' · ' + ago(s.checkedAt) : '')
      : s.phase === 'available' ? (s.same ? t('Improvements for {0} are ready', s.version) : t('Version {0} is ready', s.version)) + (s.size ? ' · ' + t('{0} MB', mbOf(s.size)) : '')
        : s.phase === 'downloading' ? t('Downloading… {0}%', num(s.total ? Math.floor(s.done / s.total * 100) : 0, 0))
          : s.phase === 'error' ? (s.error === 'offline' ? t('Couldn’t reach GitHub — are you online?') : t('The update stopped'))
            : ['verifying', 'installing', 'ready', 'permission'].includes(s.phase) ? t('Installing…')
              : t('Updates download and install inside the app')
  return <>
    <Row icon="refresh" iconTint="var(--blue)" title={t('Check for updates')} subtitle={status} accessory={busy ? null : 'chevron'}
      className={'upd-row' + (s.phase === 'checking' ? ' busy' : '')} onClick={busy || s.phase === 'checking' ? undefined : () => updateCheck()} />
    {(s.phase === 'available' || s.phase === 'error' || s.phase === 'ready' || s.phase === 'permission') && s.kind && <div className="lu-inline">
      <Button variant="primary" icon="download" onClick={() => { updateShow(); updateStart() }}>
        {s.phase === 'ready' ? t('Install') : t('Update now')}{s.size > 0 && s.phase === 'available' ? ' · ' + t('{0} MB', mbOf(s.size)) : ''}
      </Button>
    </div>}
    {busy && !s.dock && <div className="lu-inline"><Button variant="tinted" onClick={updateShow}>{t('Show the update')}</Button></div>}
    <Row icon="bolt" iconTint="var(--green)" title={t('Look for updates by itself')} subtitle={t('When the app opens and when you come back to it')}>
      <Switch checked={auto} onChange={v => { setAuto(v); setAutoOn(v) }} label={t('Look for updates by itself')} />
    </Row>
    <Row icon="history" iconTint="var(--indigo)" title={t('Update history')} subtitle={hist.length ? 'MAHDI-JYM ' + hist[0].v + ' · ' + t(howOf(hist[0])) : t('Nothing yet')}
      onClick={hist.length ? () => setOpen(o => !o) : undefined}>
      {hist.length > 0 && <Icon name={open ? 'chevronUp' : 'chevronDown'} className="lrow-c" />}
    </Row>
    {open && hist.length > 0 && <ul className="ud-hist">
      {hist.map((h, i) => <li key={i}><b>MAHDI-JYM {h.v}</b><span>{t(howOf(h))}</span><time>{new Date(h.at).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></li>)}
    </ul>}
  </>
}

/** The web app and demo: see how the in-app update looks, with a pretend download. */
export function UpdateDemoRow({ notes = null }) {
  return <Row icon="sparkles" iconTint="var(--purple)" title={t('See how updating works')} subtitle={t('The Android apps update from inside — try it here with a pretend download')}
    accessory="chevron" onClick={() => updateDemo(notes ? { notes } : {})} />
}
