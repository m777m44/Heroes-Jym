import { describe, it, expect } from 'vitest'

// 8.0 — the Drive-file rows in Settings / Backups and the picker hint, in each state.
const mem = new Map()
const noop = () => {}
globalThis.localStorage ??= { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) }
globalThis.window ??= globalThis
globalThis.document ??= { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible', documentElement: { dataset: {}, style: {} }, querySelector: () => null, createElement: () => ({ style: {} }) }

const React = await import('react')
const { renderToString } = await import('react-dom/server')
const { DriveFileRows, DriveSteps, fileError, placeName } = await import('./DriveFileUI.jsx')
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const rows = meta => text(renderToString(React.createElement(DriveFileRows, { meta, ago: () => '2 min ago' })))
const file = { name: 'MAHDI-JYM-backup.json', drive: true, place: 'drive', at: 1 }

describe('Drive file UI', () => {
  it('not linked: offers saving to Drive and restoring from it', () => {
    const h = rows({})
    expect(h).toContain('Save to Google Drive')
    expect(h).toContain('No setup')
    expect(h).toContain('Restore from Google Drive')
  })
  it('linked: where it is, its name and when it was saved', () => {
    const h = rows({ file, fileAt: 5 })
    expect(h).toContain('Google Drive')
    expect(h).toContain('MAHDI-JYM-backup.json · saved 2 min ago')
    expect(h).not.toContain('Restore from Google Drive')
  })
  it('broken or waiting: says what to do', () => {
    expect(rows({ file, fileErr: 'revoked' })).toContain('choose it again')
    expect(rows({ file, fileErr: 'missing' })).toContain('The file is gone')
    expect(rows({ file, fileErr: 'io' })).toContain('tried again automatically')
    expect(rows({ file, fileChoose: true })).toContain('Waiting for your choice')
  })
  it('after a reinstall: asks to pick the same file again', () => {
    const h = rows({ fileHint: { name: 'MAHDI-JYM-backup.json', drive: true } })
    expect(h).toContain('Reconnect Google Drive')
    expect(h).toContain('Pick MAHDI-JYM-backup.json again')
  })
  it('the picker hint and the wording helpers', () => {
    expect(text(renderToString(React.createElement(DriveSteps)))).toContain('Tap Save')
    expect(text(renderToString(React.createElement(DriveSteps, { open: true })))).toContain('Tap your MAHDI-JYM file')
    expect(placeName({ drive: true })).toBe('Google Drive')
    expect(placeName({ place: 'phone' })).toBe('A file on this phone')
    expect(fileError('notours')).toContain('isn’t a MAHDI-JYM backup')
    expect(fileError('whatever')).toContain('Couldn’t reach the file')
  })
})
