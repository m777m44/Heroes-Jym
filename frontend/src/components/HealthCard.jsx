// Home card for the health log (3.0): today's sleep, mood and blood pressure at a glance and
// the next dose due. Tap → /health.
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { todayISO, fmtNum } from '../lib/format.js'
import { dayLog, dosesOn, bpCategory } from '../lib/health.js'
import Icon from './Icon.jsx'
import { nav } from '../lib/nav.js'

const BPC = { low: 'var(--blue)', normal: 'var(--green)', elevated: 'var(--yellow)', stage1: 'var(--orange)', stage2: 'var(--red)', crisis: 'var(--red)' }

export default function HealthCard() {
  const S = useStore(s => s.S)
  const iso = todayISO()
  const log = dayLog(S, iso)
  const doses = dosesOn(S, iso)
  const left = doses.filter(d => !d.taken)
  const now = new Date().toTimeString().slice(0, 5)
  const next = left.find(d => d.time >= now) || left[0]
  const bp = log.bp && log.bp.length ? log.bp[log.bp.length - 1] : null
  const cat = bp ? bpCategory(bp.sys, bp.dia) : null
  const empty = !Object.keys(log).length && !doses.length
  return <button className="card tappable hcard" onClick={() => nav('/health')}>
    <div className="row between">
      <div className="row" style={{ gap: 8 }}><span className="hcard-i"><Icon name="heartPulse" /></span><b>{t('Health log')}</b></div>
      <Icon name="chevronRight" className="dim" />
    </div>
    {empty ? <div className="small muted" style={{ marginTop: 6 }}>{t('Log sleep, mood, blood pressure, sugar and your medicines — private, on this phone.')}</div>
      : <div className="hcard-row">
        <span><Icon name="bed" />{log.sleepH != null ? fmtNum(log.sleepH) + ' ' + t('h') : '—'}</span>
        <span><Icon name="smile" />{log.mood ? log.mood + '/5' : '—'}</span>
        <span style={cat ? { color: BPC[cat] } : null}><Icon name="gauge" />{bp ? bp.sys + '/' + bp.dia : '—'}</span>
        {doses.length > 0 && <span><Icon name="pill" />{doses.length - left.length}/{doses.length}</span>}
      </div>}
    {next && <div className="small hcard-next"><Icon name="bell" /> {t('Next: {0} at {1}', next.med.name, next.time)}</div>}
  </button>
}
