// What's new (10.0 – 16.0) — shown once after updating (S.seenWhatsNew), and from search / Settings.
// 16.0: someone coming straight from 14.0 (the offline app had no 15.0 release) also sees what 15.0 brought.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '16.0'

// 16.0
const ITEMS = [
  { icon: 'starFill', c: '#f5b301', title: 'Abu Janna’s drinks', body: 'His own page in Soft drinks: 4U, Three Stars and his soft drink in six flavours — lemon & mint, gazoz, green apple, passion fruit, cherry & vanilla and wild berry — each with a real photo of its can, and the masgouf, fried fish and mutabbaq of his Mosul restaurant. Kitchen → Abu Janna drinks.' },
  { icon: 'flag', c: '#30d158', title: 'Made in Iraq', body: 'Iraq’s own drink makers — Abu Janna, Dijla (RC Cola, Wild Lion), Karwanchi (K9), ASPI RASH and Pepsi bottled in Erbil and Baghdad — and a Made in Iraq filter.' },
  { icon: 'bolt', c: '#ff9f0a', title: 'Caffeine in your body', body: 'How much caffeine is in you right now, hour by hour: when it drops under 50 mg, how much is left at your bedtime, today against the limit for your age, the last 7 days and your days in a row without an energy drink.' },
  { icon: 'alert', c: '#ff453a', title: 'Before you open a can', body: 'Every energy drink and cola now shows what it would do: your caffeine today with it, and what would still be in you at bedtime.' },
  { icon: 'download', c: '#0a84ff', title: 'A much smaller app', body: 'The full app is now about 70 MB instead of 181 MB: the exercise animations are small videos — faster to download, smoother to play and lighter on the battery.' },
  { icon: 'rocket', c: '#bf5af2', title: 'Faster everywhere', body: 'Pictures start loading sooner, the online app updates faster, and search finds every drink however you write it — ابو جنه, أبو جنة, فور يو or ٣ ستارز.' },
]

// 15.0
const ITEMS15 = [
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

function WhatsNewSheet({ close, since }) {
  const items = ITEMS.filter(i => !i.mobile || MOBILE)
  // 16.0: coming from before 15.0 (or opened from search): 15.0's news too, after 16.0's
  const more = since !== '15.0' ? ITEMS15 : []
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
      {more.length > 0 && <div className="wn-sub">{t('Also new since 15.0')}</div>}
      {more.map((it, i) => <div key={it.title} className="wn-i" style={{ '--i': items.length + i, '--c': it.c }}>
        <span className="wn-ic"><Icon name={it.icon} /></span>
        <div><b>{t(it.title)}</b><p>{t(it.body)}</p></div>
      </div>)}
    </div>
    <Button variant="primary" onClick={close}>{t('Let’s go')}</Button>
  </div>
}

export function whatsNewSheet() {
  const since = useStore.getState().S.seenWhatsNew
  useStore.getState().update(s => { s.seenWhatsNew = WHATS_NEW })
  useUI.getState().openSheet(close => <WhatsNewSheet close={close} since={since === WHATS_NEW ? '15.0' : since} />)
}
