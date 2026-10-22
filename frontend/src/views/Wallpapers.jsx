// 6.0 — /wallpapers: a picture behind the whole app. Nature and anime photos that come with the app,
// generated art, and your own photos from the gallery (kept on this phone only). Dim and blur keep
// the text readable over any picture.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import {
  visibleCats, wallsOf, catOf, normWall, photoUrl, artBackground, listMine, addMine, removeMine, MAX_DIM, MAX_BLUR, MAX_MINE, DEFAULT_DIM,
} from '../lib/wallpapers.js'
import Icon from '../components/Icon.jsx'
import { BackButton, Button, Segmented, Switch, Section, Row } from '../components/ui.jsx'

const toast = m => useUI.getState().toast(m)

function Tile({ w, on, onPick, onDelete }) {
  return <div className={'wall-tile' + (on ? ' on' : '')} role="button" tabIndex={0} aria-pressed={on} onClick={onPick}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick() } }}
    style={w.bg ? { background: w.bg } : { backgroundColor: w.color || 'var(--surface-2)' }}>
    {w.thumb && <img src={w.thumb} alt="" loading="lazy" decoding="async" />}
    {on && <span className="wall-ok"><Icon name="check" /></span>}
    {onDelete && <button className="wall-del" aria-label={t('Delete')} onClick={e => { e.stopPropagation(); onDelete() }}><Icon name="trash" /></button>}
  </div>
}

export default function Wallpapers() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const wall = normWall(S.wall)
  const cats = visibleCats()
  const [cat, setCat] = useState(() => (cats.some(c => c.key === catOf(wall.id)) ? catOf(wall.id) : cats[0].key))
  const [mine, setMine] = useState([])
  const [busy, setBusy] = useState(false)
  const file = useRef(null)
  useEffect(() => { let live = true; listMine().then(m => { if (live) setMine(m) }); return () => { live = false } }, [])
  const set = patch => update(s => { s.wall = { ...normWall(s.wall), ...patch } })
  const pick = id => set({ id })
  const list = wallsOf(cat, mine)
  const prevBg = !wall.id ? null : catOf(wall.id) === 'art' ? artBackground(wall.id)
    : catOf(wall.id) === 'mine' ? (mine.find(m => 'mine:' + m.id === wall.id) || {}).thumb && `url("${mine.find(m => 'mine:' + m.id === wall.id).thumb}") center/cover`
      : `url("${photoUrl(wall.id, true)}") center/cover`
  const onFiles = async e => {
    const files = e.target.files
    if (!files || !files.length) return
    setBusy(true)
    try {
      const ids = await addMine(files)
      const m = await listMine()
      setMine(m)
      if (ids.length) { pick('mine:' + ids[0]); toast(t('{0} photos added', ids.length)) }
      else toast(t('You can keep up to {0} photos.', MAX_MINE))
    } catch { toast(t('That photo could not be opened.')) }
    setBusy(false)
    e.target.value = ''
  }
  const del = async id => {
    await removeMine(id)
    if (wall.id === 'mine:' + id) set({ id: null })
    setMine(await listMine())
  }

  return <div className="walls narrow">
    <div className="hdr">
      <BackButton fallback="/themes" />
      <div><h1>{t('Wallpaper')}</h1><div className="sub">{t('A picture behind the whole app')}</div></div>
    </div>

    <div className="card wall-now">
      <span className="wall-now-p" style={prevBg ? { background: prevBg } : null} />
      <div className="grow">
        <b>{wall.id ? t('Wallpaper on') : t('No wallpaper')}</b>
        <div className="small muted">{wall.id ? t('Tap another picture to change it.') : t('Pick a picture below.')}</div>
        {wall.id && <div style={{ marginTop: 8 }}><Button variant="tinted" size="sm" icon="xmark" onClick={() => set({ id: null })}>{t('Remove wallpaper')}</Button></div>}
      </div>
    </div>

    {wall.id && <div className="card">
      <div className="wall-sl">
        <span>{t('Dim')}</span>
        <input type="range" min="0" max={MAX_DIM} step="0.05" value={wall.dim} aria-label={t('Dim')} onChange={e => set({ dim: +e.target.value })} />
        <b>{Math.round(wall.dim * 100)}%</b>
      </div>
      <div className="wall-sl">
        <span>{t('Blur')}</span>
        <input type="range" min="0" max={MAX_BLUR} step="1" value={wall.blur} aria-label={t('Blur')} onChange={e => set({ blur: +e.target.value })} />
        <b>{wall.blur}</b>
      </div>
      {(wall.dim !== DEFAULT_DIM || wall.blur) ? <button className="chip nocap" style={{ marginTop: 10 }} onClick={() => set({ dim: DEFAULT_DIM, blur: 0 })}>{t('Reset')}</button> : null}
    </div>}

    <Segmented className="wall-tabs" options={cats.map(c => ({ value: c.key, label: t(c.name) }))} value={cat} onChange={setCat} />

    <div className="wall-grid">
      {cat === 'mine' && <button className="wall-tile wall-add" disabled={busy} onClick={() => file.current && file.current.click()}>
        <Icon name={busy ? 'timer' : 'plus'} />{busy ? t('Adding…') : t('Add from gallery')}
      </button>}
      {list.map(w => <Tile key={w.id} w={w} on={wall.id === w.id} onPick={() => pick(w.id)}
        onDelete={cat === 'mine' ? () => del(w.id.slice(5)) : null} />)}
    </div>
    <input ref={file} type="file" accept="image/*" multiple hidden onChange={onFiles} />
    {cat === 'mine' && <div className="small muted food-foot">{t('Your photos stay on this phone — they are resized and never uploaded. They are not part of backups.')}</div>}
    {cat === 'art' && <div className="small muted food-foot">{t('{0} artworks drawn by the app — they take no space.', list.length)}</div>}

    <div style={{ height: 14 }} />
    <Section footer={t('Frosted cards let the picture show through softly.')}>
      <Row icon="layers" iconTint="var(--indigo)" title={t('Glass cards')} subtitle={t('Shape and card style are in Themes')}>
        <Switch checked={S.cardStyle === 'glass'} onChange={v => update(s => { s.cardStyle = v ? 'glass' : 'solid' })} />
      </Row>
    </Section>
  </div>
}
