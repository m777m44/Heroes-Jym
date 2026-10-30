// 13.0 — the notification panel: the bell on Home opens everything still to ring today, from
// every feature (lib/upcoming.js), each in its kind's colour, under a header in the colour your
// notifications wear with the current theme (themes.js notifColor). Loaded on the first tap.
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale } from '../lib/i18n.js'
import { upcoming } from '../lib/upcoming.js'
import { notifColor } from '../lib/themes.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

const n0 = v => Math.round(+v || 0).toLocaleString(dateLocale())
const hm = d => d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
const MAX = 8

function Panel({ nav, close }) {
  const S = useStore(s => s.S)
  const list = upcoming(S, new Date())
  const go = to => { close(); nav(to) }
  return <div className="np">
    <div className="np-head" style={{ '--nc': notifColor(S) }}>
      <span className="np-bell" aria-hidden="true"><Icon name="bellBadge" /></span>
      <span className="grow">
        <b>{t('Still to come today')}</b>
        <span className="small muted">{list.length ? t('{0} more today · next at {1}', n0(list.length), hm(list[0].at)) : t('Nothing more today')}</span>
      </span>
    </div>
    {list.length ? <div className="nf-tl np-list">
      {list.slice(0, MAX).map((x, i) => <button key={i} type="button" className="nf-it" style={{ '--c': x.color, '--i': i }} onClick={() => go(x.to)}>
        <span className="nf-it-t">{hm(x.at)}</span>
        <span className="nf-it-ic"><Icon name={x.icon} /></span>
        <span className="grow"><b dir="auto">{x.title}</b><span className="small muted">{x.sub}</span></span>
      </button>)}
      {list.length > MAX && <div className="small muted nf-more">{t('And {0} more', n0(list.length - MAX))}</div>}
    </div> : <div className="empty small"><div className="ico"><Icon name="bellSlash" /></div>{t('Nothing more today')}</div>}
    <div className="np-btns">
      <Button variant="secondary" icon="bellBadge" onClick={() => go('/notifications')}>{t('All notifications')}</Button>
      <Button variant="ghost" icon="palette" onClick={() => go('/themes')}>{t('Themes')}</Button>
    </div>
  </div>
}

export const notifPanelSheet = nav => useUI.getState().openSheet(close => <Panel nav={nav} close={close} />)
