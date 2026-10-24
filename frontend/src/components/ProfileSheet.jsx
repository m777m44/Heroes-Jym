// Profile (8.0): your name and an avatar (an icon on a colour) for the Home header — kept with
// your data (S.profile), so it comes back with a backup. A signed-in Google account's photo is
// used when there is one.
// 11.0 — a real profile picture: your own photo from the phone (cropped to a circle), or one of
// hundreds of symbols in groups (faces, sport, animals, nature, food, Iraq, things, hearts), the
// icons, or your initial — on one of 24 colours. Your own choice wins over the Google photo.
//   S.profile = { name, color, icon?, emoji?, photo? (a small JPEG data URL) }
import { useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { AVATAR_EMOJI, EMOJI_SET, AVATAR_ICONS, AVATAR_COLORS, isAvatarPhoto, avatarFromFile } from '../lib/avatar.js'
import Icon from './Icon.jsx'
import { Button, Segmented } from './ui.jsx'

export { AVATAR_ICONS, AVATAR_COLORS }

export const profileOf = S => {
  const p = (S && S.profile) || {}
  return {
    name: typeof p.name === 'string' ? p.name.slice(0, 30) : '',
    icon: AVATAR_ICONS.includes(p.icon) ? p.icon : null,
    emoji: EMOJI_SET.has(p.emoji) ? p.emoji : null,
    photo: isAvatarPhoto(p.photo) ? p.photo : null,
    color: AVATAR_COLORS.includes(p.color) ? p.color : AVATAR_COLORS[0],
  }
}

/** The round avatar: your photo, your symbol or icon, else the account photo, else the initial — on your colour. */
export function ProfileAvatar({ S, photo, size = 36, onClick, label }) {
  const p = profileOf(S)
  const Tag = onClick ? 'button' : 'span'
  const style = { width: size, height: size, '--c': p.color, fontSize: size * 0.48 }
  const img = p.photo || (!p.emoji && !p.icon ? photo : null)
  return <Tag className={'pf-av' + (p.emoji && !img ? ' emo' : '')} style={style} onClick={onClick} aria-label={label}>
    {img ? <img src={img} alt="" referrerPolicy="no-referrer" />
      : p.emoji ? <span className="pf-emo" style={{ fontSize: size * 0.56 }}>{p.emoji}</span>
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
  const [av, setAv] = useState({ icon: cur.icon, emoji: cur.emoji, photo: cur.photo })
  const [color, setColor] = useState(cur.color)
  const [tab, setTab] = useState(cur.photo ? 'photo' : cur.icon ? 'icons' : 'emoji')
  const [grp, setGrp] = useState(() => (cur.emoji && AVATAR_EMOJI.find(g => g.list.includes(cur.emoji))?.key) || AVATAR_EMOJI[0].key)
  const [busy, setBusy] = useState(false)
  const file = useRef(null)
  const preview = { ...S, profile: { name, color, ...av } }
  const pick = x => setAv({ icon: null, emoji: null, photo: null, ...x })
  const save = () => {
    update(s => {
      const p = { name: name.trim().slice(0, 30), color }
      if (av.photo) p.photo = av.photo
      else if (av.emoji) p.emoji = av.emoji
      else if (av.icon) p.icon = av.icon
      s.profile = p
    })
    useUI.getState().toast(t('Profile saved'))
    close()
  }
  const onFile = async e => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try { pick({ photo: await avatarFromFile(f) }) } catch { useUI.getState().toast(t('This picture could not be opened')) }
    setBusy(false)
  }
  const workouts = S.workouts.length
  const steps = Object.values(S.steps || {}).reduce((a, v) => a + (Number(v && typeof v === 'object' ? v.n : v) || 0), 0)
  const minutes = Math.round(S.workouts.reduce((a, w) => a + (w.end && w.start ? Math.max(0, w.end - w.start) : 0), 0) / 60000)
  const group = AVATAR_EMOJI.find(g => g.key === grp) || AVATAR_EMOJI[0]
  const initial = name.trim() ? [...name.trim()][0].toUpperCase() : 'A'
  return <div className="pf">
    <div className="pf-top">
      <ProfileAvatar S={preview} size={88} />
      <div className="pf-stats">
        <div><b>{workouts}</b><span>{t('Workouts')}</span></div>
        <div><b>{minutes >= 600 ? Math.round(minutes / 60) + 'h' : minutes}</b><span>{minutes >= 600 ? t('Hours trained') : t('Minutes trained')}</span></div>
        <div><b>{steps >= 10000 ? Math.round(steps / 1000) + 'k' : steps}</b><span>{t('Steps')}</span></div>
      </div>
    </div>
    <input className="input" placeholder={t('Your name')} maxLength={30} value={name} onChange={e => setName(e.target.value)} dir="auto" />
    <div className="pf-h">{t('Avatar')}</div>
    <Segmented options={[{ value: 'emoji', label: t('Symbols') }, { value: 'icons', label: t('Icons') }, { value: 'photo', label: t('Photo') }]} value={tab} onChange={setTab} />
    {tab === 'emoji' && <>
      <div className="pf-grps scroll" role="tablist">
        {AVATAR_EMOJI.map(g => <button key={g.key} role="tab" aria-selected={grp === g.key} className={'chip nocap' + (grp === g.key ? ' on' : '')} onClick={() => setGrp(g.key)}><Icon name={g.icon} />{t(g.name)}</button>)}
      </div>
      <div className="pf-emos" key={grp}>
        {group.list.map((e, i) => <button key={e} className={'pf-pick pf-emo-b' + (av.emoji === e && !av.photo ? ' on' : '')} style={{ '--i': Math.min(i, 30) }} onClick={() => pick({ emoji: e })} aria-label={t('Symbol {0}', i + 1)}><span>{e}</span></button>)}
      </div>
    </>}
    {tab === 'icons' && <div className="pf-icons">
      <button className={'pf-pick' + (!av.icon && !av.emoji && !av.photo ? ' on' : '')} onClick={() => pick({})} aria-label={t('Initial')}><span>{initial}</span></button>
      {AVATAR_ICONS.map(ic => <button key={ic} className={'pf-pick' + (av.icon === ic && !av.photo ? ' on' : '')} onClick={() => pick({ icon: ic })} aria-label={t('Icon')}><Icon name={ic} /></button>)}
    </div>}
    {tab === 'photo' && <div className="pf-photo">
      <input ref={file} type="file" accept="image/*" hidden onChange={onFile} />
      <Button variant="tinted" icon="camera" disabled={busy} onClick={() => file.current && file.current.click()}>{av.photo ? t('Change photo') : t('Choose a photo')}</Button>
      {av.photo && <Button variant="plain" icon="trash" className="danger" onClick={() => pick({})}>{t('Remove photo')}</Button>}
      <p className="small muted">{t('Cropped to a circle and kept small — it stays on this phone and in your backups.')}</p>
    </div>}
    <div className="pf-h">{t('Colour')}</div>
    <div className="pf-colors">
      {AVATAR_COLORS.map(c => <button key={c} className={'pf-col' + (color === c ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} aria-label={t('Colour')} aria-pressed={color === c} />)}
    </div>
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </div>
}

export const profileSheet = () => useUI.getState().openSheet(close => <ProfileSheet close={close} />)
