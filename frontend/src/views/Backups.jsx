// 4.0 — Settings → Backups & restore: where your data is saved, versions you can go back to
// (on this phone, and in Google Drive once Drive is on), and how to switch Drive on.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import {
  snapshotIndex, refreshIndex, takeSnapshot, readSnapshot, deleteSnapshot, pruneSnapshots,
  onSnapshotsChange, KEEP_OPTS, DEFAULT_KEEP,
} from '../lib/backups.js'
import {
  cloudMeta, onCloudChange, signedInGoogle, onDrive, lastSavedAt,
  listDriveVersions, uploadDriveVersion, readDriveVersion, deleteDriveVersion, upgradeToDrive,
} from '../lib/cloud.js'
import { MOBILE } from '../lib/mobile.js'
import { copyText } from '../lib/clipboard.js'
import { t, dateLocale } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { confirmSheet } from '../sheets.jsx'
import { agoLabel } from '../components/AccountSection.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Switch, Segmented, Button, BackButton } from '../components/ui.jsx'

const ui = () => useUI.getState()
const KIND = { auto: 'Automatic', manual: 'Saved by you', restore: 'Before a restore' }
const KIND_ICON = { auto: 'clock', manual: 'starFill', restore: 'reset' }
export const PACKAGE = 'io.github.m777m44.mahdijym'
export const SHA1 = '8F:72:13:9B:43:D8:29:DA:2A:00:A3:2A:B6:A5:3C:90:20:C4:1D:76'
const when = at => new Date(at).toLocaleString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const kb = n => (n >= 1048576 ? t('{0} MB', fmtNum(Math.round(n / 104857.6) / 10)) : t('{0} KB', fmtNum(Math.max(1, Math.round(n / 1024)))))

/** Put a saved copy back — what it replaces is saved first ("Before a restore"), so it can be undone. */
async function restore(load, label) {
  const j = await load()
  if (!j || !j.S) { ui().toast(t('This version could not be read.')); return }
  const st = useStore.getState()
  await takeSnapshot(st.S, 'restore').catch(() => null)
  st.replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), j.S), true)
  ui().toast(t('Restored the version from {0}', label))
}

function VersionRow({ v, onRestore, onDelete }) {
  return <div className="item bk-v">
    <span className={'bk-ico k-' + v.kind}><Icon name={KIND_ICON[v.kind] || 'clock'} /></span>
    <div className="grow">
      <div className="tt">{when(v.at)}</div>
      <div className="ss">{t(KIND[v.kind] || 'Automatic')} · {t('{0} workouts', fmtNum(v.workouts || 0))}{v.size ? ' · ' + kb(v.size) : ''}</div>
    </div>
    <Button size="sm" variant="tinted" icon="reset" onClick={onRestore}>{t('Restore')}</Button>
    <button className="iconbtn sm" onClick={onDelete} aria-label={t('Delete')}><Icon name="trash" /></button>
  </div>
}

export default function Backups() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const nav = useNavigate()
  const [list, setList] = useState(snapshotIndex)
  const [meta, setMeta] = useState(cloudMeta)
  const [dv, setDv] = useState(null)              // Drive versions: null = not loaded, 'error', or a list
  const [busy, setBusy] = useState(false)
  const keep = Number(S.backupKeep) || DEFAULT_KEEP
  const signed = signedInGoogle()
  const drive = signed && onDrive()

  useEffect(() => onSnapshotsChange(() => setList(snapshotIndex())), [])
  useEffect(() => onCloudChange(setMeta), [])
  useEffect(() => { refreshIndex().then(setList).catch(() => {}) }, [])
  const loadDrive = () => { setDv(null); listDriveVersions().then(setDv).catch(() => setDv('error')) }
  useEffect(() => { if (drive) loadDrive() }, [drive])

  const saveNow = async () => {
    setBusy(true)
    try {
      await takeSnapshot(S, 'manual')
      await pruneSnapshots(keep)
      if (drive) { await uploadDriveVersion(S, 'manual').catch(() => null); loadDrive() }
      ui().toast(t('Version saved'))
    } catch { ui().toast(t('Could not save the version')) } finally { setBusy(false) }
  }
  const askRestore = (v, load) => confirmSheet({
    title: t('Restore this version?'), confirmText: t('Restore'),
    message: t('Your data goes back to {0}. What you have now is saved first as “Before a restore”, so you can undo this.', when(v.at)),
    onConfirm: () => restore(load, when(v.at)),
  })
  const askDelete = (v, del) => confirmSheet({ title: t('Delete this version?'), message: when(v.at), confirmText: t('Delete'), danger: true, onConfirm: del })

  const where = !signed ? { icon: 'phone', name: t('This phone only'), sub: t('No account — the versions below and Export keep you safe.') }
    : drive ? { icon: 'cloudCheck', name: t('Google Drive'), sub: t('Private app folder · synced within seconds') }
      : { icon: 'shield', name: t('Android Backup'), sub: t('Through your Google account · no setup needed') }

  return <div className="bk">
    <div className="hdr">
      <BackButton fallback="/settings" />
      <div><h1>{t('Backups & restore')}</h1><div className="sub">{t('Versions of your data you can go back to')}</div></div>
    </div>

    <div className="card bk-where">
      <span className="bk-where-ico"><Icon name={where.icon} /></span>
      <div className="grow">
        <div className="lbl2">{t('Your account copy')}</div>
        <b>{where.name}</b>
        <div className="small muted">{where.sub}</div>
        {signed && <div className="small muted">{t('Last saved {0}', agoLabel(lastSavedAt(meta)))}</div>}
      </div>
    </div>
    {signed && !drive && meta.driveWhy === 'setup' && <div className="card bk-note">
      <Icon name="info" />
      <div className="grow">
        <b>{t('Google Drive isn’t switched on for this app yet')}</b>
        <div className="small muted">{t('That needs a one-time setup in Google Cloud by the app’s owner. Until then everything is saved through Android Backup — nothing is lost.')}</div>
        <div className="bk-note-b"><Button size="sm" variant="tinted" icon="list" onClick={() => driveGuideSheet()}>{t('How to switch on Google Drive')}</Button>
          <Button size="sm" icon="reset" disabled={busy} onClick={() => { setBusy(true); upgradeToDrive(useStore, true).then(() => ui().toast(t('Google Drive is on'))).catch(() => ui().toast(t('Google Drive is not available yet'))).finally(() => setBusy(false)) }}>{t('Try again')}</Button></div>
      </div>
    </div>}
    {!signed && MOBILE && <Button icon="personCircle" onClick={() => nav('/settings')}>{t('Sign in with Google in Settings')}</Button>}

    <Section title={t('Automatic versions')} footer={drive ? t('Once a day, when something changed, a full copy is kept on this phone and in Google Drive. The newest ones are kept; older ones are removed.') : t('Once a day, when something changed, a full copy is kept on this phone. The newest ones are kept; older ones are removed.')}>
      <Row icon="clock" iconTint="var(--teal)" title={t('Save a version every day')}>
        <Switch checked={S.autoBackup !== false} onChange={v => update(s => { s.autoBackup = v })} />
      </Row>
      <div className="bk-keep">
        <span className="small muted">{t('Keep the newest')}</span>
        <Segmented options={KEEP_OPTS.map(n => ({ value: n, label: t('{0} days', n) }))} value={keep}
          onChange={n => { update(s => { s.backupKeep = n }); pruneSnapshots(n).catch(() => {}) }} />
      </div>
    </Section>

    <Button variant="primary" icon="download" disabled={busy} onClick={saveNow}>{t('Save a version now')}</Button>

    <h2 className="startw-h"><Icon name="phone" />{t('On this phone')}<span className="small muted startw-hint">{fmtNum(list.length)}</span></h2>
    {list.length ? <div className="list">
      {list.map(v => <VersionRow key={v.id} v={v}
        onRestore={() => askRestore(v, () => readSnapshot(v.id))}
        onDelete={() => askDelete(v, () => deleteSnapshot(v.id))} />)}
    </div> : <div className="empty small"><div className="ico"><Icon name="history" /></div>{t('No versions yet — the first one is saved today.')}</div>}

    {drive && <>
      <h2 className="startw-h"><Icon name="cloud" />{t('In Google Drive')}
        <button className="h2link" onClick={loadDrive}><Icon name="reset" /> {t('Refresh')}</button></h2>
      {dv === null ? <div className="empty small"><span className="acc-spin" aria-hidden="true" /> {t('Loading…')}</div>
        : dv === 'error' ? <div className="empty small"><div className="ico"><Icon name="alert" /></div>{t('Could not reach Google Drive — check the connection.')}</div>
          : dv.length ? <div className="list">{dv.map(v => <VersionRow key={v.id} v={v}
            onRestore={() => askRestore(v, () => readDriveVersion(v.id))}
            onDelete={() => askDelete(v, () => deleteDriveVersion(v.id).then(loadDrive).catch(() => ui().toast(t('Could not reach Google Drive — check the connection.'))))} />)}</div>
            : <div className="empty small"><div className="ico"><Icon name="cloud" /></div>{t('No versions in Drive yet.')}</div>}
    </>}

    <p className="small muted bk-foot">{t('A version is a full copy: workouts, plan, routines, steps, water, body weight, health log and settings. Progress photos stay where they are. For a copy you can keep anywhere, use Export in Settings.')}</p>
  </div>
}

/* ---- the one-time Google Cloud setup, step by step (for the app's owner) ---- */
export function driveGuideSheet() {
  ui().openSheet(close => <DriveGuide close={close} />)
}
function Copyable({ label, value }) {
  return <button className="bk-copy" onClick={async () => { const ok = await copyText(value); ui().toast(ok ? t('Copied: {0}', label) : t('Could not copy')) }}>
    <span className="small muted">{label}</span><code dir="ltr">{value}</code><Icon name="copy" />
  </button>
}
function DriveGuide() {
  const steps = [
    t('Open console.cloud.google.com with your Google account and create a project (any name).'),
    t('APIs & Services → Library → search “Google Drive API” → Enable.'),
    t('OAuth consent screen → External → fill in the app name and your email → add the scope …/auth/drive.appdata → add your own account as a test user.'),
    t('Credentials → Create credentials → OAuth client ID → Android → paste the package name and SHA-1 below.'),
    t('Wait about 5 minutes, then come back here and tap Try again. Nothing changes in the app itself.'),
  ]
  return <div className="bk-guide">
    <h3>{t('Switch on Google Drive')}</h3>
    <p className="small muted">{t('Only needed once, by the app’s owner. Saving through Android Backup keeps working the whole time.')}</p>
    <ol>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
    <Copyable label={t('Package name')} value={PACKAGE} />
    <Copyable label="SHA-1" value={SHA1} />
    <p className="small muted">{t('Full guide: docs/GOOGLE_SIGN_IN.md in the project.')}</p>
  </div>
}
