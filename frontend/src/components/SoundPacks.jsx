// 9.0 — choose the celebration sound: six new packs (rendered by scripts/build-sounds.py, the
// same files the Android celebration plays) plus the classic synth. Tap a pack to hear its big
// "goal" sound; the chips below play each moment of the chosen pack; the slider sets the volume.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { PACKS, packOf, volOf, previewPack } from '../lib/celebrate.js'
import Icon from './Icon.jsx'
import { Slider } from './ui.jsx'

const MOMENTS = [
  ['milestone', 'Step milestone'], ['goal', 'Goal reached'], ['water', 'Water goal'],
  ['workout', 'Workout done'], ['plan', 'Day complete'], ['fast', 'Fast complete'],
]

function SoundPacks({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const pack = packOf(S)
  const vol = volOf(S)
  const [playing, setPlaying] = useState(null)
  const hear = (id, kind = 'goal') => {
    setPlaying(id + kind)
    previewPack(id, kind, Math.max(0.15, vol))
    setTimeout(() => setPlaying(p => (p === id + kind ? null : p)), 2600)
  }
  return <div className="snd-sheet">
    <h3>{t('Celebration sound')}</h3>
    <p className="small muted">{t('Plays when you reach a goal — in the app and on the lock screen.')}</p>
    <div className="snd-list" role="radiogroup" aria-label={t('Celebration sound')}>
      {PACKS.map((p, i) => <button key={p.id} role="radio" aria-checked={pack === p.id} className={'snd-pack' + (pack === p.id ? ' on' : '') + (playing && playing.startsWith(p.id) ? ' playing' : '')}
        style={{ '--c': p.c, '--i': i }} onClick={() => { update(s => { s.soundPack = p.id }); hear(p.id) }}>
        <span className="snd-ic"><Icon name={p.icon} /><i className="snd-eq" aria-hidden="true"><b /><b /><b /></i></span>
        <span className="grow"><b>{t(p.name)}</b><span className="small muted">{t(p.desc)}</span></span>
        <span className="snd-check">{pack === p.id ? <Icon name="checkCircle" /> : <Icon name="play" />}</span>
      </button>)}
    </div>
    <div className="lbl2" style={{ marginTop: 14 }}>{t('Hear each moment')}</div>
    <div className="snd-moments">
      {MOMENTS.map(([k, label]) => <button key={k} className={'chip nocap' + (playing === pack + k ? ' on' : '')} onClick={() => hear(pack, k)}><Icon name="play" />{t(label)}</button>)}
    </div>
    <div className="lbl2" style={{ marginTop: 14 }}>{t('Volume')}</div>
    <div className="snd-vol">
      <Icon name="speaker" />
      <Slider value={Math.round(vol * 100)} min={0} max={100} step={5} onChange={v => update(s => { s.soundVol = v / 100 })} />
      <b>{Math.round(vol * 100)}%</b>
    </div>
    {S.sound === false && <div className="snd-off"><Icon name="bellSlash" /><span className="grow">{t('Sounds are off — celebrations stay silent.')}</span>
      <button className="chip nocap on" onClick={() => update(s => { s.sound = true })}>{t('Turn on')}</button></div>}
    <button className="btn primary snd-done" onClick={close}><span>{t('Done')}</span></button>
  </div>
}

export const soundPacksSheet = () => useUI.getState().openSheet(close => <SoundPacks close={close} />)
export const packName = S => t((PACKS.find(p => p.id === packOf(S)) || PACKS[0]).name)
