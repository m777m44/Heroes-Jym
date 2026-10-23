// What's new (9.0) — shown once after updating (S.seenWhatsNew), and from search / Settings.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '9.0'

const ITEMS = [
  { icon: 'cup', c: '#30d158', title: 'Drinks & juices', body: 'Over seventy healthy drinks — for weight loss, digestion, energy, recovery, sleep and Iraqi classics — with calories worked out from the ingredients.' },
  { icon: 'blender', c: '#ffb627', title: 'Your own drinks', body: 'Put a drink together from the ingredients and see its calories, sugar and water add up as you go.' },
  { icon: 'palm', c: '#d4a017', title: 'The Iraqi kitchen', body: 'Masgouf, Kubba Mosul, timman bagilla, qeema, lablabi and more — with steps and calories per serving, and lighter tips.' },
  { icon: 'calendar', c: '#5e5ce6', title: 'Day plan', body: 'Study, work, workout, rest, meals and drinks at their times — start your day and it runs live, logging exactly what you planned.' },
  { icon: 'music', c: '#ff9f0a', title: 'New celebration sounds', body: 'Six new sound packs — Champion, Epic, Neon, Royal, Arcade and Zen — in the app and on the lock screen.' },
  { icon: 'battery', c: '#34c759', title: 'Kinder to your battery', body: 'The step counter rests while the screen is off, sounds stop when they end, and a battery saver turns on at 20%.' },
  { icon: 'palette', c: '#bf5af2', title: 'Your theme everywhere', body: 'The notification shade and the status bar now take your theme’s colours, with smoother animations all round.' },
  { icon: 'image', c: '#40c8e0', title: 'New wallpapers', body: 'Ten new seas and oceans, and new art backgrounds — lagoon, deep sea, palm grove and Babylon.' },
]

function WhatsNewSheet({ close }) {
  const items = ITEMS.filter(i => !i.mobile || MOBILE)
  return <div className="wn">
    <div className="wn-hero" aria-hidden="true">
      <span className="wn-orb"><Icon name="sparkles" /></span>
      {[0, 1, 2, 3, 4].map(i => <span key={i} className={'wn-spark s' + i} />)}
    </div>
    <div className="wn-kicker">MAHDI-JYM 9.0</div>
    <h2 className="wn-title">{t('What’s new')}</h2>
    <div className="wn-list">
      {items.map((it, i) => <div key={it.title} className="wn-i" style={{ '--i': i, '--c': it.c }}>
        <span className="wn-ic"><Icon name={it.icon} /></span>
        <div><b>{t(it.title)}</b><p>{t(it.body)}</p></div>
      </div>)}
    </div>
    <Button variant="primary" onClick={close}>{t('Let’s go')}</Button>
  </div>
}

export function whatsNewSheet() {
  useStore.getState().update(s => { s.seenWhatsNew = WHATS_NEW })
  useUI.getState().openSheet(close => <WhatsNewSheet close={close} />)
}
