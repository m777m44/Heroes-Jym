// 8.0 — "Google Drive, no setup" in the UI: the three-step hint for Android's file picker, the
// rows Settings and Backups show for the linked file, and the connect / restore flows (with the
// "which data do you keep?" question when both sides have some).
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { cloudMeta, linkDriveFile, resolveFileChoice, unlinkDriveFile, syncNow, fileLinked } from '../lib/cloud.js'
import { driveAppInstalled, DRIVE_PLAY, FILE_NAME } from '../lib/driveFile.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { Row, Button } from './ui.jsx'

const ui = () => useUI.getState()

/** Google Drive's triangle, in its own colours. */
export function DriveMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 87.3 78" aria-hidden="true">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 0 0 0 53h27.5z" fill="#00ac47" />
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335" />
      <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="M73.4 26.5 60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  )
}

/** "☰ → Drive → Save": what to tap in Android's picker. `open` = picking an existing file. */
export function DriveSteps({ open = false }) {
  const steps = open
    ? [['list', t('Tap ☰ (the menu)')], ['cloud', t('Choose Google Drive')], ['check', t('Tap your MAHDI-JYM file')]]
    : [['list', t('Tap ☰ (the menu)')], ['cloud', t('Choose Google Drive')], ['download', t('Tap Save')]]
  return <ol className="df-steps">
    {steps.map(([ic, s], i) => <li key={i} style={{ '--i': i }}><span className="df-n">{i + 1}</span><Icon name={ic} /><span>{s}</span></li>)}
  </ol>
}

/** Where the linked file lives, in words. */
export const placeName = f => (!f ? '' : f.drive ? t('Google Drive') : f.place === 'phone' ? t('A file on this phone') : t('A file in another app'))

/** The reason a Drive-file action failed, in words. */
export function fileError(reason) {
  if (reason === 'notours') return t('That file isn’t a MAHDI-JYM backup — nothing was changed.')
  if (reason === 'revoked') return t('MAHDI-JYM may no longer write to the file — choose it again.')
  if (reason === 'missing') return t('The file is gone (deleted or moved) — choose it again or make a new one.')
  if (reason === 'unavailable') return t('Not available on this phone.')
  return t('Couldn’t reach the file. Check the connection and try again.')
}

/** Is the Google Drive app on this phone? (null while checking / unknown) */
export function useDriveApp() {
  const [v, setV] = useState(null)
  useEffect(() => { driveAppInstalled().then(setV).catch(() => setV(null)) }, [])
  return v
}

/**
 * Connect (mode 'create') or restore from (mode 'open') a file. Resolves the outcome:
 * 'uploaded' | 'restored' | 'cancelled' | 'failed' — and shows its own toast / choice sheet.
 */
export async function driveFileFlow(mode = 'create', { quiet = false } = {}) {
  try {
    const r = await linkDriveFile(useStore, mode)
    if (r === 'choose') return await askFileChoice()
    if (!quiet) ui().toast(r === 'restored' ? t('Your data was restored from Google Drive.') : t('Saved to Google Drive'))
    return r
  } catch (e) {
    if (e && e.reason === 'cancelled') return 'cancelled'
    ui().toast(fileError(e && e.reason))
    return 'failed'
  }
}

/** Both the file and this phone have data — ask which to keep (nothing is written before). */
export function askFileChoice() {
  return new Promise(resolve => {
    const finish = which => resolveFileChoice(useStore, which)
      .then(x => { ui().toast(x === 'restored' ? t('Your data was restored from Google Drive.') : t('Saved to Google Drive')); resolve(x) })
      .catch(e => { ui().toast(fileError(e && e.reason)); resolve('failed') })
    confirmSheet({
      title: t('Data found in the file'),
      message: t('The file has MAHDI-JYM data, and this phone has some too. Which one do you want to keep?'),
      confirmText: t('Use the file’s data'),
      cancelText: t('Keep this phone’s data'),
      onConfirm: () => finish('file'),
      onCancel: () => finish('phone'),
    })
  })
}

/** The bottom sheet for the linked file: save now, choose another, stop. */
export function driveFileSheet() {
  ui().openSheet(close => <DriveFileSheet close={close} />)
}
function DriveFileSheet({ close }) {
  const [busy, setBusy] = useState(false)
  const m = cloudMeta()
  const f = m.file || {}
  const save = async () => {
    setBusy(true)
    try { await syncNow(useStore); ui().toast(t('Saved to Google Drive')) } catch (e) { ui().toast(fileError(e && e.reason)) }
    setBusy(false); close()
  }
  return <div className="df-sheet">
    <div className="df-sheet-h">
      <span className="df-mark"><DriveMark size={30} /></span>
      <div className="grow"><b>{placeName(f)}</b><div className="small muted df-name" dir="auto">{f.name || FILE_NAME}</div></div>
    </div>
    <p className="small muted">{t('Every change is written to this file a moment after you make it, and the Google Drive app uploads it. On a new phone, choose “Restore from Google Drive” and pick this file.')}</p>
    <Button variant="primary" icon="upload" disabled={busy} onClick={save}>{t('Save now')}</Button>
    <div style={{ height: 8 }} />
    <Button icon="shuffle" disabled={busy} onClick={() => { close(); driveFileFlow('create') }}>{t('Choose another file')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="danger" icon="xmark" disabled={busy} onClick={() => {
      close()
      confirmSheet({
        title: t('Stop saving to this file?'), message: t('The file stays in your Google Drive with everything saved so far. Changes are no longer written to it.'),
        confirmText: t('Stop'), danger: true, onConfirm: () => unlinkDriveFile().then(() => ui().toast(t('No longer saved to the file'))),
      })
    }}>{t('Stop saving to this file')}</Button>
  </div>
}

/**
 * The Drive-file rows for a Settings section: linked → its state (tap: the sheet above);
 * not linked → "Save to Google Drive" (no setup). Plus "Restore from Google Drive".
 */
export function DriveFileRows({ meta, ago, restore = true }) {
  const linked = fileLinked(meta)
  const f = meta.file
  const hint = !linked && meta.fileHint
  if (linked) {
    const broken = meta.fileErr === 'revoked' || meta.fileErr === 'missing'
    return <>
      <Row icon={broken ? 'alert' : 'cloudCheck'} iconTint={broken ? 'var(--orange)' : 'var(--green)'}
        title={placeName(f)}
        subtitle={broken ? fileError(meta.fileErr) : meta.fileChoose ? t('Waiting for your choice') : meta.fileErr ? t('Not saved yet — tried again automatically') : t('{0} · saved {1}', f.name || FILE_NAME, ago(meta.fileAt))}
        accessory="chevron" onClick={broken ? () => driveFileFlow('create') : meta.fileChoose ? askFileChoice : driveFileSheet} />
    </>
  }
  return <>
    <Row icon="cloud" iconTint="var(--blue)" title={hint ? t('Reconnect Google Drive') : t('Save to Google Drive')}
      subtitle={hint ? t('Pick {0} again — reinstalling removes the permission', hint.name) : t('No setup — pick Google Drive once and every change is saved there')}
      accessory="chevron" onClick={() => driveFileFlow(hint ? 'open' : 'create')} />
    {restore && !hint && <Row icon="download" iconTint="var(--teal)" title={t('Restore from Google Drive')}
      subtitle={t('Pick a MAHDI-JYM backup file')} accessory="chevron" onClick={() => driveFileFlow('open')} />}
  </>
}
