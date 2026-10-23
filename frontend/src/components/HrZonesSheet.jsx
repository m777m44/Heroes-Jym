// Heart-rate zones (8.0): the five training zones from your age and, if you know it, your
// resting pulse (taken from the health log when there is one). The maths is in lib/hrZones.js.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { zonesFor, maxHR } from '../lib/hrZones.js'
import { ageOf, birthYearFor } from '../lib/idealBody.js'
import { NumberField } from './ui.jsx'

const ui = () => useUI.getState()

/** The last resting heart rate in the health log (within 60 days), else null. */
function lastRhr(S) {
  const h = S.health || {}
  const days = Object.keys(h).sort().reverse().slice(0, 60)
  for (const d of days) if (Number(h[d] && h[d].rhr) > 0) return Number(h[d].rhr)
  return null
}

function ZonesSheet() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const age = ageOf(S)
  const [rest, setRest] = useState(lastRhr(S) || '')
  const zones = age ? zonesFor(age, rest) : null
  return <div className="hz-sheet">
    <h3>{t('Heart-rate zones')}</h3>
    <div className="hz-inputs">
      <label><span>{t('Age')}</span><NumberField value={age || ''} decimal={false} onChange={v => update(s => { s.birthYear = birthYearFor(Number(v)) })} /></label>
      <label><span>{t('Resting pulse')}</span><NumberField value={rest} decimal={false} onChange={v => setRest(v)} /></label>
    </div>
    {zones ? <>
      <div className="small muted" style={{ margin: '4px 0 10px' }}>{t('Max heart rate ≈ {0} bpm', maxHR(age))} · {zones[0].karvonen ? t('with your resting pulse (Karvonen)') : t('add your resting pulse for more precise zones')}</div>
      <div className="hz-list">
        {zones.slice().reverse().map((z, i) => <div key={z.z} className="hz-z" style={{ '--c': z.color, '--i': i, '--w': (z.hi * 100) + '%' }}>
          <span className="hz-n">{z.z}</span>
          <div className="grow"><b>{t(z.name)}</b><div className="small muted">{t(z.desc)}</div></div>
          <span className="hz-bpm" dir="ltr">{z.from}–{z.to}</span>
        </div>)}
      </div>
    </> : <div className="small muted">{t('Enter your age to see your zones.')}</div>}
  </div>
}
export const zonesSheet = () => ui().openSheet(() => <ZonesSheet />)
