import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { useEffect, useState } from 'react'
import { fmtClock } from '../lib/workoutTimer.js'
import Icon from './Icon.jsx'

// 7.2: while a workout runs, the Start tab shows its live time (ticks on its own)
function TabClock({ start }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv) }, [])
  return <span className="tab-clock">{fmtClock(Math.max(0, now - start))}</span>
}

export default function TabBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  if (!user && !isGuest) return null
  const cur = loc.pathname.split('/')[1] || 'home'
  const on = k => cur === k || (cur === 'history' && k === 'stats') || (cur === 'start' && k === 'start') || (['settings', 'walk', 'weight', 'water', 'themes', 'ideal'].includes(cur) && k === 'home') || (cur === 'coach' && k === 'plan')

  // 4.0: Start opens the choice — today's routine / plan, without or with equipment
  const startWorkout = () => nav(S.active ? '/workout' : '/start')
  const Tab = ({ k, icon, to, label }) => (
    <button className={on(k) ? 'on' : ''} onClick={() => nav(to)}>
      <Icon name={icon} /><span>{label}</span>
    </button>
  )

  return (
    <nav id="tabbar">
      <Tab k="home" icon="house" to="/home" label={t('Home')} />
      <Tab k="plan" icon="calendar" to="/plan" label={t('Plan')} />
      <button className={'start' + (S.active ? ' rec' : '')} onClick={startWorkout} aria-label={S.active ? t('Resume') : t('Start')}>
        <span className="cir"><Icon name={S.active ? 'play' : 'dumbbell'} /></span>
        <span>{S.active ? <TabClock start={S.active.start} /> : t('Start')}</span>
      </button>
      <Tab k="stats" icon="chart" to="/stats" label={t('Stats')} />
      <Tab k="library" icon="list" to="/library" label={t('Exercises')} />
    </nav>
  )
}
