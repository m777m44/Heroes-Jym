// What's new (8.0) — shown once after updating (S.seenWhatsNew), and from search / Settings.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '8.0'

const ITEMS = [
  { icon: 'cloud', c: '#0a84ff', title: 'Google Drive — no setup', body: 'Save everything to a file in your own Google Drive, chosen once. Every change is saved, and a new phone gets it all back.', mobile: true },
  { icon: 'personCircle', c: '#34a853', title: 'Sign in with Google', body: 'Pick an account on your phone — no password. Self-hosted servers can turn on Google sign-in for the web too.' },
  { icon: 'timer', c: '#ff375f', title: 'Interval timer', body: 'Tabata, HIIT, EMOM, sprints and boxing rounds — with voice, beeps and the screen kept on.' },
  { icon: 'wind', c: '#30b0c7', title: 'Breathe', body: 'Guided breathing with a calm animated orb: box, 4-7-8, coherent and after a hard set.' },
  { icon: 'moon', c: '#bf5af2', title: 'Fasting & Ramadan', body: '16:8 to one meal a day, or from suhoor to iftar — live stages, streaks and a reminder.' },
  { icon: 'heartPulse', c: '#30d158', title: 'Muscle recovery', body: 'See which muscles are ready again on the body map, and the routine that fits best today.' },
  { icon: 'heart', c: '#ff453a', title: 'Heart-rate zones', body: 'Your five training zones from your age and resting pulse.' },
  { icon: 'magnifier', c: '#ff9f0a', title: 'Quick search', body: 'Find any screen, tool, routine or exercise in a second.' },
]

function WhatsNewSheet({ close }) {
  const items = ITEMS.filter(i => !i.mobile || MOBILE)
  return <div className="wn">
    <div className="wn-hero" aria-hidden="true">
      <span className="wn-orb"><Icon name="sparkles" /></span>
      {[0, 1, 2, 3, 4].map(i => <span key={i} className={'wn-spark s' + i} />)}
    </div>
    <div className="wn-kicker">MAHDI-JYM 8.0</div>
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
