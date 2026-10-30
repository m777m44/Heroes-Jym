// What's new (10.0 – 13.1) — shown once after updating (S.seenWhatsNew), and from search / Settings.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '13.1'

// 13.1
const ITEMS = [
  { icon: 'school', c: '#c08552', title: 'Your school & work week', body: 'Water at 7:00, breakfast, school 7:30–12:40, lunch and rest, work 1:40–6:15 with a break, dinner, a walk with water, study until 11:45 and sleep at 12:00 — Friday and Saturday with the afternoon for study, the rest shaped your way.' },
  { icon: 'bell', c: '#ff453a', title: 'A reminder at every step', body: 'Every block of your day rings on time with what to do, the food and the water you planned — the midnight bedtime too. A walk can carry its bottle of water.' },
  { icon: 'list', c: '#0a84ff', title: 'Your week at a glance', body: 'Sunday–Thursday and Friday & Saturday: a bar of each day, every time and the menu of each day — share it as text on WhatsApp.' },
  { icon: 'basket', c: '#30b0c7', title: 'Shops & markets', body: '111 more packaged foods from Iraqi shops — cakes and croissants, canned mahshi, Samyang and other noodles, halqoum, alij, Dubai chocolate, biscuits, chips, cheese triangles, frozen food, mouta and boxed juices — 316 in 14 aisles.' },
  { icon: 'candy', c: '#ff375f', title: 'Halqoum, alij and canned mahshi', body: 'Halqoum with pistachio, walnut, coconut or cream; alij and candies; stuffed eggplant, peppers, zucchini and cabbage in cans — each with its calories, salt and sugar.' },
  { icon: 'bottle', c: '#64d2ff', title: 'Water on the way', body: 'Give a walk the bottle you take with you — it counts in your day’s water, and the reminder says how much to drink.' },
  { icon: 'magnifier', c: '#bf5af2', title: 'Search the way you speak', body: 'Type جبس, علچ, موطا or اندوني and the food database finds chips, gum, ice cream and Indomie.' },
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
