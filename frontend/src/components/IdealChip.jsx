// 2.12: one line under a weight card — your ideal weight and how far it is — opening "Ideal body".
import { useStore } from '../store/useStore.js'
import { t, U } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { fromKg, toKg } from '../lib/weightTracker.js'
import { idealBody, ageOf, sexOf } from '../lib/idealBody.js'
import Icon from './Icon.jsx'

export default function IdealChip({ onOpen }) {
  const S = useStore(s => s.S)
  const last = S.bodyweight.length ? S.bodyweight[S.bodyweight.length - 1] : null
  const r = idealBody({ heightCm: S.heightCm, age: ageOf(S), sex: sexOf(S), weightKg: last ? toKg(last.w, S.unit) : null })
  const w = v => fmtNum(Math.round(fromKg(v, S.unit) * 10) / 10) + ' ' + U(S.unit)
  let text
  if (!r || !r.adult || !r.ideal) text = t('Find your ideal weight by height and age')
  else if (r.toIdeal == null) text = t('Ideal weight {0}', w(r.ideal))
  else text = t('Ideal weight {0}', w(r.ideal)) + ' · ' + (r.goal === 'keep' ? t('you are there') : t(r.goal === 'lose' ? '{0} to lose' : '{0} to gain', w(Math.abs(r.toIdeal))))
  return <button className={'ideal-chip' + (r && r.goal ? ' ' + r.goal : '')} onClick={onOpen}>
    <Icon name="person" /><span>{text}</span><Icon name="chevronRight" className="chev" />
  </button>
}
