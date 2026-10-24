// What's new (10.0) — shown once after updating (S.seenWhatsNew), and from search / Settings.
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const WHATS_NEW = '10.0'

const ITEMS = [
  { icon: 'calendar', c: '#5e5ce6', title: 'My schedule', body: 'Arrange everything yourself — school, meals, drinks, work, prayer — on the days you choose, with an end time and your own notes.' },
  { icon: 'school', c: '#c08552', title: 'School week', body: 'School Sunday to Thursday, 7:30 to 12:40, then lunch, rest, homework, work, drinks and dinner — and a calmer weekend.' },
  { icon: 'bellBadge', c: '#ff9f0a', title: 'Reminders that show everything', body: 'Each reminder shows the time, your notes and the food and drinks you chose with their calories — with Done ✓ and In 10 min.', mobile: true },
  { icon: 'can', c: '#e41e2b', title: 'Soft drinks', body: 'Colas, lemon-lime, fruit sodas, malt and energy drinks and homemade mojitos — in cans, bottles and glasses of every size, with sugar in teaspoons.' },
  { icon: 'nut', c: '#c68a54', title: 'Nuts & seeds', body: 'Pistachios, almonds, walnuts, cashews, the seeds you crack and kerzat — raw, roasted or salted, by the handful, with what each is good for.' },
  { icon: 'bell', c: '#30b0c7', title: 'All notifications in one place', body: 'Which reminders are on, what still rings today, and the phone’s notification settings grouped by kind.' },
  { icon: 'sparkles', c: '#bf5af2', title: 'Smoother everywhere', body: 'Tidier tools, smoother animations and many small fixes — drinks are now logged to the right meal.' },
]

function WhatsNewSheet({ close }) {
  const items = ITEMS.filter(i => !i.mobile || MOBILE)
  return <div className="wn">
    <div className="wn-hero" aria-hidden="true">
      <span className="wn-orb"><Icon name="sparkles" /></span>
      {[0, 1, 2, 3, 4].map(i => <span key={i} className={'wn-spark s' + i} />)}
    </div>
    <div className="wn-kicker">MAHDI-JYM 10.0</div>
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
