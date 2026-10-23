// Profile (8.0): your name and an avatar (an icon on a colour) for the Home header — kept with
// your data (S.profile), so it comes back with a backup. A signed-in Google account's photo is
// used when there is one.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

export const AVATAR_ICONS = ['dumbbell', 'flame', 'bolt', 'trophy', 'crown', 'rocket', 'star', 'heart', 'mountain', 'moon', 'sun', 'target', 'arm', 'figureRun', 'bike', 'swim', 'boxing', 'kettlebell']
export const AVATAR_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff375f', '#bf5af2', '#5e5ce6', '#30b0c7', '#ffd60a']

export const profileOf = S => {
  const p = (S && S.profile) || {}
  return {
    name: typeof p.name === 'string' ? p.name.slice(0, 30) : '',
    icon: AVATAR_ICONS.includes(p.icon) ? p.icon : null,
    color: AVATAR_COLORS.includes(p.color) ? p.color : AVATAR_COLORS[0],
  }
}

/** The round avatar: the photo, else the icon, else the initial, on the chosen colour. */
export function ProfileAvatar({ S, photo, size = 36, onClick, label }) {
  const p = profileOf(S)
  const Tag = onClick ? 'button' : 'span'
  const style = { width: size, height: size, '--c': p.color, fontSize: size * 0.48 }
  return <Tag className="pf-av" style={style} onClick={onClick} aria-label={label}>
    {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" />
      : p.icon ? <Icon name={p.icon} />
      : p.name ? <span className="pf-ini">{[...p.name.trim()][0].toUpperCase()}</span>
      : <Icon name="person" />}
  </Tag>
}

function ProfileSheet({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const cur = profileOf(S)
  const [name, setName] = useState(cur.name)
  const [icon, setIcon] = useState(cur.icon)
  const [color, setColor] = useState(cur.color)
  const preview = { ...S, profile: { name, icon, color } }
  const save = () => {
    update(s => { s.profile = { name: name.trim().slice(0, 30), icon, color } })
    useUI.getState().toast(t('Profile saved'))
    close()
  }
  const workouts = S.workouts.length
  const steps = Object.values(S.steps || {}).reduce((a, v) => a + (Number(v && typeof v === 'object' ? v.n : v) || 0), 0)
  const minutes = Math.round(S.workouts.reduce((a, w) => a + (w.end && w.start ? Math.max(0, w.end - w.start) : 0), 0) / 60000)
  return <div className="pf">
    <div className="pf-top">
      <ProfileAvatar S={preview} size={84} />
      <div className="pf-stats">
        <div><b>{workouts}</b><span>{t('Workouts')}</span></div>
        <div><b>{minutes >= 600 ? Math.round(minutes / 60) + 'h' : minutes}</b><span>{minutes >= 600 ? t('Hours trained') : t('Minutes trained')}</span></div>
        <div><b>{steps >= 10000 ? Math.round(steps / 1000) + 'k' : steps}</b><span>{t('Steps')}</span></div>
      </div>
    </div>
    <input className="input" placeholder={t('Your name')} maxLength={30} value={name} onChange={e => setName(e.target.value)} />
    <div className="pf-h">{t('Avatar')}</div>
    <div className="pf-icons">
      <button className={'pf-pick' + (!icon ? ' on' : '')} onClick={() => setIcon(null)} aria-label={t('Initial')}><span>{name.trim() ? [...name.trim()][0].toUpperCase() : 'A'}</span></button>
      {AVATAR_ICONS.map(ic => <button key={ic} className={'pf-pick' + (icon === ic ? ' on' : '')} onClick={() => setIcon(ic)} aria-label={ic}><Icon name={ic} /></button>)}
    </div>
    <div className="pf-h">{t('Colour')}</div>
    <div className="pf-colors">
      {AVATAR_COLORS.map(c => <button key={c} className={'pf-col' + (color === c ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />)}
    </div>
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </div>
}

export const profileSheet = () => useUI.getState().openSheet(close => <ProfileSheet close={close} />)
