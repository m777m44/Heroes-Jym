// What's new (10.0 – 14.0) — shown once after updating (S.seenWhatsNew), and from search / Settings.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '14.0'

// 14.0
const ITEMS = [
  { icon: 'fork', c: '#ff9f0a', title: 'The Kitchen', body: 'All the food, cooking and drinks in one place — Foods → Kitchen: Food, Drinks and Tools, six big doors (street food, make your Indomie, canned food & shops, drinks, sweets, Iraqi food), my own cooking, ready foods and fresh food.' },
  { icon: 'image', c: '#ff375f', title: 'A real photo for every food', body: '780 real photographs from Wikimedia Commons — every food, dish, drink, soft drink, nut and ingredient — drifting slowly and smoothly, with who took each one.' },
  { icon: 'sliders', c: '#ff6a3d', title: 'The meal builder', body: 'A burger, a shawarma, a falafel or kebab sandwich, a pizza or any recipe opens with what goes into it: change the grams, take out the mayonnaise, add cheese or a second patty — calories, protein, carbs, fat and salt follow live. Nothing counts until you add it.' },
  { icon: 'bolt', c: '#bf5af2', title: 'Street food', body: '85+ street dishes — burgers, zinger, hot dog, shawarma arabi, tawook, liver and kubba laffat, falafel, pizza, manakish, dim sum, onion rings and more — 60 of them built from their ingredients.' },
  { icon: 'noodles', c: '#ffd60a', title: 'Make your Indomie', body: 'What is in the pack and its calories, how long each way takes and how to make it — with a cooking timer, and the oil sachet in or out.' },
  { icon: 'book', c: '#30d158', title: '100+ new dishes and 30 recipes', body: 'Iraqi, Arab, Turkish, Persian, Indian and gym meals with every detail: fibre, sodium, kilojoules, how filling, the walk that burns it and what it may contain.' },
  { icon: 'pencil', c: '#ff9500', title: 'My own cooking', body: 'Your own dishes with your own photo, the ingredients by weight, the steps and the time — the calories work themselves out.' },
  { icon: 'cube', c: '#0a84ff', title: 'Two apps side by side', body: 'MAHDI-JYM (blue OFF badge, everything inside) and MAHDI-JYM Online (green WEB badge, light) are now separate apps — install both, each with its own data.', mobile: true },
  { icon: 'rocket', c: '#10b981', title: 'The online app updates itself', body: 'MAHDI-JYM Online downloads a new version inside the app and restarts into it — no new APK, your data stays. Settings → App & updates.', mobile: true },
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
