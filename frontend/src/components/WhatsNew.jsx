// What's new (10.0 – 14.0) — shown once after updating (S.seenWhatsNew), and from search / Settings.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '15.0'

// 15.0
const ITEMS = [
  { icon: 'palette', c: '#34e0a1', title: 'A new look', body: 'New colours and a cleaner, calmer design everywhere: the new MAHDI Midnight theme, softer cards, glowing buttons, a glass tab bar — and ten new elegant themes in Themes → 15.0 Elegant.' },
  { icon: 'expand', c: '#0a84ff', title: 'Tap a photo for everything', body: 'Tap the photo of any food or drink and it opens big — zoom in with two fingers — with everything about it: where it comes from, the calories and protein / carbs / fat split, the full nutrition table per serving and per 100 g, your day, good to know, what is in it and a lighter choice.' },
  { icon: 'xmark', c: '#5e5ce6', title: 'Lists that stay open', body: 'The food and drink lists and cards no longer close when you scroll or swipe — only the ✕ at the top right closes them. (Settings → Tools, if you want the swipe back.)' },
  { icon: 'location', c: '#ff9f0a', title: 'Iraq city by city', body: 'The kitchens of Baghdad, Mosul, Tal Afar, Najaf & Karbala, Basra, Kurdistan, Kirkuk, Anbar and the south — 100 new dishes: zingil and ayran ashi, burda pilaf, tashreeb guss, Najaf dahina, masmouta, Erbil kebab, Fallujah kebab, dulaimiya and more.' },
  { icon: 'fish', c: '#40c8e0', title: 'Iraq’s fish', body: 'A new Fish & seafood section: bunni, gattan, zubaidi, sbour, biyah, carp, tilapia and Fao shrimp — grilled, fried, in machboos or saloona — and “fish twice a week” to keep you on track.' },
  { icon: 'icecream', c: '#ff375f', title: 'Moota and azbari', body: 'Iraqi moota (ice cream with cardamom and rose water) and azbari — Baghdad’s old raspberry water ice — in a new Ice cream section.' },
  { icon: 'fork', c: '#ff6a3d', title: 'Liver, pacha and street food', body: 'Liver with bulgur, the meelaq grill (liver, heart, kidneys), the full pacha with kipayat, tongues and trotters, guss and falafel in stone-oven samoon and the big falafel wrap.' },
  { icon: 'bolt', c: '#ffd60a', title: 'Iraq’s energy drinks', body: 'ASPI RASH, K9, 4U, Tiger, Red Strong, Winner, Lion and Hell — with their sugar and caffeine — and a Today card for your caffeine, sugar and salt from everything you logged.' },
  { icon: 'dice', c: '#30d158', title: 'Surprise me and fits my day', body: '“Surprise me” picks a dish that fits the calories you have left; “Fits my day” filters any section to what still fits today.' },
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
