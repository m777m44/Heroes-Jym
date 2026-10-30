// What's new (10.0 – 13.0) — shown once after updating (S.seenWhatsNew), and from search / Settings.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '13.0'

// 13.0
const ITEMS = [
  { icon: 'noodles', c: '#ffb300', title: 'Indomie, made your way', body: 'Over 40 ways to make Indomie — dry, boiled, fried, as a soup or with cream — and a builder: pick the pack, the seasoning and what goes in (egg, cheese, tuna, chicken…) and the calories follow.' },
  { icon: 'cake', c: '#a2845e', title: '15 date cakes in three sizes', body: 'Plain, chocolate, Lotus, tahini, oats, vegan, gluten-free and more — small (50 g), medium (100 g) or large (150 g).' },
  { icon: 'can', c: '#30b0c7', title: 'Canned food and shop snacks', body: 'Tuna, corned beef, luncheon, foul, chickpeas, olives and more cans and jars — and chips, chocolate bars, biscuits, ice cream and café drinks from the shop, with their salt and sugar.' },
  { icon: 'book', c: '#5e5ce6', title: 'The food database', body: 'Every food of the app in one place: search, shelves, sorting by calories or protein, and each food per serving and per 100 g.' },
  { icon: 'palm', c: '#30d158', title: '15 more Iraqi dishes', body: 'Fesenjoon, aroog, tray kubba, chicken quzi, dolma with ribs, laffat bagilla and geymar, carrot and semolina halwa, shakarlama, qatayef and more.' },
  { icon: 'bellBadge', c: '#ff9f0a', title: 'Notifications in your theme', body: 'Every theme colours the reminders by itself — the icon, the buttons and the phone light — and the bell on Home shows what is still to come today.' },
  { icon: 'sparkles', c: '#bf5af2', title: 'Smoother and faster', body: 'Themes change with a soft fade, screens load when you open them, and long lists draw as you scroll.' },
]

function WhatsNewSheet({ close }) {
  const items = ITEMS.filter(i => !i.mobile || MOBILE)
  return <div className="wn">
    <div className="wn-hero" aria-hidden="true">
      <span className="wn-orb"><Icon name="sparkles" /></span>
      {[0, 1, 2, 3, 4].map(i => <span key={i} className={'wn-spark s' + i} />)}
    </div>
    <div className="wn-kicker">MAHDI-JYM {WHATS_NEW}</div>
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
