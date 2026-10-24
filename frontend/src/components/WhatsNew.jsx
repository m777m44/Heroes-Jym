// What's new (10.0, 11.0) — shown once after updating (S.seenWhatsNew), and from search / Settings.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '11.0'

const ITEMS = [
  { icon: 'school', c: '#c08552', title: 'Your school week, your times', body: 'Up at 7:00, water, breakfast, get ready, school 7:30–12:40 with nothing inside it, home, water, lunch and a drink — then a nap, homework, games, review, sport, dinner with water and a light snack before bed.' },
  { icon: 'calendar', c: '#5e5ce6', title: 'Friday and Saturday too', body: 'Sleep in, an Iraqi breakfast, study, phone & games, helping at home, football, family and rest — every block with its calories.' },
  { icon: 'nut', c: '#c68a54', title: 'Many more nuts, with Iraqi names', body: 'Melon seeds, lemon pistachios, acorns, royal and seed kerzat, shamiya, termis — and dried fruits and dates: zbeeb, kishmish, zahdi, khastawi, barhi, figs, qamar al-din, mlabbas and more.' },
  { icon: 'cup', c: '#a0461e', title: 'More Iraqi drinks', body: 'Chai haleeb, mint and lemon tea, kakao, milk with dibis, Turkish coffee, Nescafé, hamudh hilu and the juice shop: orange, carrot, apple, grape, mango, banana and strawberry milk and the Iraqi cocktail.' },
  { icon: 'fork', c: '#ff9f0a', title: 'Everyday Iraqi food', body: 'Eggs with samoon, cheese and labneh sandwiches, timman with fasolia or bamia, sheikh mahshi, shifta, makarona, amba, arnoos — and foods can go straight into your schedule.' },
  { icon: 'personCircle', c: '#ff375f', title: 'A real profile picture', body: 'Your own photo from the phone, or one of hundreds of symbols — faces, sport, animals, nature, food, Iraq — on 24 colours.' },
  { icon: 'route', c: '#30d158', title: 'From Zakho to Fao', body: 'All your steps as a walk across Iraq, city by city — and the last five weeks at a glance.' },
  { icon: 'drop', c: '#0a84ff', title: 'Water, any amount', body: 'Add any amount up to a 1.5 L bottle, and see if you are ahead or behind right now.' },
  { icon: 'palm', c: '#d4a017', title: 'Iraq themes', body: 'The Tigris, the Euphrates, Ishtar blue, Baghdad nights, Basra palms, Mosul marble, the marshes and more — 1,442 themes in all.' },
  { icon: 'vibrate', c: '#8e8e93', title: 'No more buzzing on every tap', body: 'The light vibration when you tap or swipe is off — switch it back on in Settings if you liked it.' },
]

function WhatsNewSheet({ close }) {
  const items = ITEMS.filter(i => !i.mobile || MOBILE)
  return <div className="wn">
    <div className="wn-hero" aria-hidden="true">
      <span className="wn-orb"><Icon name="sparkles" /></span>
      {[0, 1, 2, 3, 4].map(i => <span key={i} className={'wn-spark s' + i} />)}
    </div>
    <div className="wn-kicker">MAHDI-JYM 11.0</div>
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
