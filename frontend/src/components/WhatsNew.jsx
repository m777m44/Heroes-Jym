// What's new (10.0, 11.0, 12.0) — shown once after updating (S.seenWhatsNew), and from search / Settings.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '12.0'

const ITEMS = [
  { icon: 'cube', c: '#5e5ce6', title: 'Two versions, the same app', body: 'The full version keeps everything inside the app and works with no internet. The light version is tiny and loads pictures from the app’s repository when you need them — same features, same updates.' },
  { icon: 'wifi', c: '#0a84ff', title: 'Open it in the browser too', body: 'MAHDI-JYM now runs as a web app on GitHub Pages — on any phone or computer, nothing to install. Your data stays on your device.' },
  { icon: 'refresh', c: '#30d158', title: 'Updates in the app', body: 'Settings shows your version, checks for a new one and opens the right download for your version.' },
  { icon: 'keyboard', c: '#ff9f0a', title: 'Any emoji as your picture', body: 'Type an emoji or two letters with your keyboard, pick one of the new pictures (a lion, a falcon, a lifter…), a wallpaper photo, or a photo from your phone.' },
  { icon: 'can', c: '#e0245e', title: '144 soft drinks', body: 'Iced teas, sports drinks and many more colas, fruit sodas, malt and energy drinks — and compare any two side by side.' },
  { icon: 'cup', c: '#a0461e', title: '147 drinks and juices', body: 'Sage and thyme tea, cinnamon and clove tea, saffron milk, raqqi, mishmish and guava juice, pistachio milk, dibis w rashi milk — and many more shakes, smoothies and infused waters.' },
  { icon: 'nut', c: '#c68a54', title: '111 nuts, seeds and sweets', body: 'Nut butters and tahini, bagilla and lablabi, more dates (sukkari, ajwa, sayer, halawi), dried fruit, mann al-sama, baklawa and kleicha.' },
  { icon: 'coffee', c: '#8b5e3c', title: 'Caffeine for teens', body: 'Under 18, the soft-drink screen counts caffeine against about 100 mg a day instead of the adult 400 mg.' },
  { icon: 'globe', c: '#8e8e93', title: 'Arabic and English', body: 'The app now comes in Arabic and English only — smaller and faster.' },
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
