// 17.0 — the in-app update: the bundle's own file list and build id, the manifest with notes, deciding
// on a newer build of the same version, the exact (byte by byte) download that copies what it has, tries
// again and can be cancelled and resumed, the APK release (digest, notes), and the update flow's meter,
// snooze and history.
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const mem = new Map()
globalThis.localStorage ??= { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k), clear: () => mem.clear() }
globalThis.location ??= { origin: 'https://localhost', search: '', hash: '' }

const { parseLive, liveDecision, liveId, folderOf, folderOfBase, planOf, downloadLive, readBody, localBundle, COPY_WEIGHT, isAbort, takeUpdated } = await import('./liveUpdate.js')
const { releaseNotesOf, parseRelease } = await import('./updates.js')
const { meter, etaOf, snoozed, offerId, addHistory, updateHistory, HISTORY_MAX, autoOn, setAutoOn, useUpdate, updateDemo, updateCancel, isBusy } = await import('./appUpdate.js')
const { errCode, takeApkUpdated } = await import('./apkUpdate.js')
const { releaseNotes, notesComments } = await import('../../scripts/release-notes.mjs')
const { bundleFiles, buildId } = await import('../../scripts/bundle-files.mjs')

const here = dirname(fileURLToPath(import.meta.url))
const sha = s => createHash('sha256').update(s).digest('hex')
const enc = s => new TextEncoder().encode(s)

/** A tiny in-memory Filesystem with the calls downloadLive makes. */
function fakeFs() {
  const files = new Map()
  return {
    files,
    io: {
      Directory: { Data: 'DATA' },
      Filesystem: {
        rmdir: async ({ path }) => { for (const k of [...files.keys()]) if (k.startsWith(path + '/')) files.delete(k) },
        writeFile: async ({ path, data }) => { files.set(path, data) },
        getUri: async ({ path }) => ({ uri: 'file:///data/user/0/app/files/' + path }),
      },
    },
  }
}
/** A response whose body arrives in chunks. */
function resp(bytes, { status = 200, chunk = 3 } = {}) {
  let o = 0
  return {
    ok: status >= 200 && status < 300, status,
    body: { getReader: () => ({ read: async () => (o >= bytes.length ? { done: true } : { done: false, value: bytes.slice(o, (o += chunk)) }), cancel: () => {} }) },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  }
}

describe('17.0 — the bundle knows its own files and build', () => {
  it('lists every file with size and SHA-256, and a build id that follows the contents', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mj-b-'))
    try {
      mkdirSync(join(dir, 'assets'))
      writeFileSync(join(dir, 'index.html'), '<!doctype html>')
      writeFileSync(join(dir, 'assets', 'a.js'), 'console.log(1)')
      writeFileSync(join(dir, 'assets', 'a.js.map'), '{}')
      writeFileSync(join(dir, 'mj-files.json'), '{}')
      const f1 = bundleFiles(dir)
      expect(f1.map(f => f[0])).toEqual(['assets/a.js', 'index.html'])
      expect(f1[0]).toEqual(['assets/a.js', 14, sha('console.log(1)')])
      const b1 = buildId(f1)
      expect(b1).toMatch(/^[0-9a-f]{12}$/)
      expect(buildId(bundleFiles(dir))).toBe(b1)                 // same files, same id
      writeFileSync(join(dir, 'assets', 'a.js'), 'console.log(2)')
      expect(buildId(bundleFiles(dir))).not.toBe(b1)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
  it('the manifest carries the build, its time and the what’s new, and lists mj-files.json too', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mj-m-'))
    try {
      mkdirSync(join(dir, 'b'))
      writeFileSync(join(dir, 'b', 'index.html'), '<!doctype html>')
      writeFileSync(join(dir, 'b', 'mj-files.json'), JSON.stringify({ v: 1, build: 'abcdef012345', built: '2026-11-07T10:00:00.000Z', files: [] }))
      execFileSync(process.execPath, [join(here, '..', '..', 'scripts', 'live-manifest.mjs'), join(dir, 'b'), join(dir, 'online.json'), '17.0.0-abcdef012345/'])
      const raw = JSON.parse(readFileSync(join(dir, 'online.json'), 'utf8'))
      expect(raw.build).toBe('abcdef012345')
      expect(raw.built).toBe('2026-11-07T10:00:00.000Z')
      expect(raw.files.map(f => f[0])).toEqual(['index.html', 'mj-files.json'])
      expect(typeof raw.notes.en).toBe('string')
      const m = parseLive(raw)
      expect(m.build).toBe('abcdef012345')
      expect(m.base.endsWith('/live/17.0.0-abcdef012345/')).toBe(true)
      expect(liveId(m)).toBe(raw.version + '+abcdef012345')
      expect(folderOf(m)).toBe(raw.version + '-abcdef012345')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
  it('reads the summary of a version from CHANGELOG.md, both languages', () => {
    const md = '# Changelog\n\n## v17.0.0 — 2026-11-07\n\n**Update inside the app — with `Update` and *Cancel*,\nand [more](x).**\n*تحديث من داخل التطبيق\nبنسبة مئوية.*\n\n(an aside)\n\n### 🔄 Update\n- x\n\n## v16.0.0\n\n**Old.**\n'
    const n = releaseNotes(md, '17.0.0')
    expect(n.en).toBe('Update inside the app — with Update and Cancel, and more.')
    expect(n.ar).toBe('تحديث من داخل التطبيق بنسبة مئوية.')
    expect(releaseNotes(md, '9.9.9')).toEqual({ version: '9.9.9', en: '', ar: '' })
    const c = notesComments(n)
    expect(releaseNotesOf('Intro\n' + c + '\nmore')).toEqual({ en: n.en, ar: n.ar })
    expect(releaseNotesOf('no notes here')).toBe(null)
    const real = releaseNotes(readFileSync(join(here, '..', '..', '..', 'CHANGELOG.md'), 'utf8'), JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf8')).version)
    expect(real.en.length).toBeGreaterThan(20)
    expect(real.ar.length).toBeGreaterThan(10)
  })
})

describe('17.0 — deciding on an update', () => {
  const H = 'a'.repeat(64)
  const man = o => parseLive({ v: 1, version: '17.0.0', native: 1, build: 'bbbbbbbbbbbb', built: '2026-11-08T10:00:00Z', base: '17.0.0-bbbbbbbbbbbb/', files: [['index.html', 10, H]], ...o })
  it('a newer build of the same version is offered; the same build or an older one is not', () => {
    const m = man()
    expect(liveDecision(m, { current: '17.0.0', build: 'aaaaaaaaaaaa', built: '2026-11-07T10:00:00Z', apkNative: 1, bad: null })).toBe('ready')
    expect(liveDecision(m, { current: '17.0.0', build: 'bbbbbbbbbbbb', built: '2026-11-07T10:00:00Z', apkNative: 1, bad: null })).toBe('latest')
    expect(liveDecision(m, { current: '17.0.0', build: 'aaaaaaaaaaaa', built: '2026-11-09T10:00:00Z', apkNative: 1, bad: null })).toBe('latest')
    expect(liveDecision(m, { current: '17.0.0', build: null, built: null, apkNative: 1, bad: null })).toBe('latest')
    expect(liveDecision(m, { current: '16.0.0', build: null, apkNative: 1, bad: null })).toBe('ready')
    expect(liveDecision(m, { current: '17.0.1', build: 'aaaaaaaaaaaa', apkNative: 1, bad: null })).toBe('latest')
  })
  it('one that could not start is not offered again — but the next build is', () => {
    const m = man()
    expect(liveDecision(m, { current: '16.0.0', apkNative: 1, bad: '17.0.0+bbbbbbbbbbbb' })).toBe('failed')
    expect(liveDecision(m, { current: '16.0.0', apkNative: 1, bad: '17.0.0' })).toBe('failed')                    // marked by 16.0
    expect(liveDecision(m, { current: '16.0.0', apkNative: 1, bad: '17.0.0+cccccccccccc' })).toBe('ready')
    expect(liveDecision(man({ native: 2 }), { current: '16.0.0', apkNative: 1, bad: null })).toBe('needs-apk')
  })
  it('works out what a download costs: only the changed files come over the network', () => {
    const m = parseLive({ v: 1, version: '17.0.0', native: 1, files: [['index.html', 100, H], ['assets/a.js', 5000, 'b'.repeat(64)], ['assets/b.js', 3000, 'c'.repeat(64)]] })
    const local = { map: new Map([['assets/a.js', 'b'.repeat(64)], ['assets/b.js', 'd'.repeat(64)]]) }
    expect(planOf(m, local)).toEqual({ net: 3100, copy: 5000, files: 3, changed: 2 })
    expect(planOf(m, null)).toEqual({ net: 8100, copy: 0, files: 3, changed: 3 })
  })
  it('reads the running bundle’s list, and copes without one', async () => {
    const ok = await localBundle({ fresh: true, origin: 'https://localhost', fetchImpl: async () => ({ ok: true, json: async () => ({ build: 'abc123abc123', built: 'x', files: [['index.html', 1, 'A'.repeat(64)]] }) }) })
    expect(ok.build).toBe('abc123abc123')
    expect(ok.map.get('index.html')).toBe('a'.repeat(64))
    const none = await localBundle({ fresh: true, origin: 'https://localhost', fetchImpl: async () => { throw new Error('no') } })
    expect(none).toMatchObject({ build: null, map: null })
    expect(folderOfBase('/data/user/0/io.github.m777m44.mahdijym.online/files/live/17.0.0-abc123abc123')).toBe('17.0.0-abc123abc123')
    expect(folderOfBase('')).toBe(null)
  })
})

describe('17.0 — the download: exact, resumable, cancellable', () => {
  const A = enc('a'.repeat(40)), B = enc('b'.repeat(30)), I = enc('<!doctype html>')
  const m = parseLive({ v: 1, version: '17.0.0', native: 1, build: 'feedfeedfeed', base: '17.0.0-feedfeedfeed/',
    files: [['index.html', I.length, sha(I)], ['assets/a.js', A.length, sha(A)], ['assets/b.js', B.length, sha(B)]] })
  const remote = { 'index.html': I, 'assets/a.js': A, 'assets/b.js': B }
  const nowait = async () => {}

  it('counts bytes as they arrive, copies what the running version has, and ends at exactly 100 %', async () => {
    const F = fakeFs(), seen = []
    const local = { map: new Map([['assets/a.js', sha(A)]]) }
    const fetchImpl = async url => {
      if (url.startsWith('https://localhost/')) return resp(remote[url.slice(18)])
      return resp(remote[url.slice(m.base.length)])
    }
    const path = await downloadLive(m, { io: F.io, local, fetchImpl, wait: nowait, onProgress: p => seen.push(p) })
    expect(path).toBe('/data/user/0/app/files/live/17.0.0-feedfeedfeed')
    expect([...F.files.keys()].sort()).toEqual(['live/17.0.0-feedfeedfeed/.mj-live.json', 'live/17.0.0-feedfeedfeed/assets/a.js', 'live/17.0.0-feedfeedfeed/assets/b.js', 'live/17.0.0-feedfeedfeed/index.html'])
    const last = seen[seen.length - 1]
    expect(last.net).toBe(I.length + B.length)                  // only the changed files over the network
    expect(last.netDone).toBe(last.net)
    expect(last.total).toBeCloseTo(I.length + B.length + A.length * COPY_WEIGHT, 6)
    expect(last.done).toBe(last.total)
    expect(last.filesDone).toBe(3)
    for (let i = 1; i < seen.length; i++) expect(seen[i].done).toBeGreaterThanOrEqual(seen[i - 1].done)   // never backwards
    expect(seen.length).toBeGreaterThan(8)                      // chunk by chunk, not file by file
    expect(Buffer.from(F.files.get('live/17.0.0-feedfeedfeed/assets/b.js'), 'base64').toString()).toBe('b'.repeat(30))
  })
  it('tries a failing file again, and a broken file counts nothing', async () => {
    const F = fakeFs()
    let fails = 2
    const fetchImpl = async url => {
      const p = url.slice(m.base.length)
      if (p === 'assets/b.js' && fails-- > 0) return fails === 1 ? resp(enc('broken!')) : { ok: false, status: 503 }
      return resp(remote[p])
    }
    const seen = []
    await downloadLive(m, { io: F.io, local: { map: new Map() }, fetchImpl, wait: nowait, onProgress: p => seen.push(p) })
    expect(seen[seen.length - 1].netDone).toBe(I.length + A.length + B.length)
    await expect(downloadLive({ ...m, build: 'deaddeaddead' }, { io: fakeFs().io, local: { map: new Map() }, fetchImpl: async () => ({ ok: false, status: 404 }), wait: nowait, tries: 2 })).rejects.toThrow(/HTTP 404/)
  })
  it('stops when cancelled, then goes on from the files it already has', async () => {
    const F = fakeFs()
    const ctl = new AbortController()
    let got = 0
    const fetchImpl = async (url, o = {}) => {
      const p = url.slice(m.base.length)
      got++
      if (p === 'assets/b.js') { ctl.abort(); if (o.signal && o.signal.aborted) { const e = new Error('aborted'); e.name = 'AbortError'; throw e } }
      return resp(remote[p])
    }
    const err = await downloadLive({ ...m, build: 'cafecafecafe' }, { io: F.io, local: { map: new Map() }, fetchImpl, wait: nowait, signal: ctl.signal, workers: 1 }).catch(e => e)
    expect(isAbort(err)).toBe(true)
    const before = got
    const asked = []
    await downloadLive({ ...m, build: 'cafecafecafe' }, { io: F.io, local: { map: new Map() }, wait: nowait, workers: 1, fetchImpl: async url => { asked.push(url.slice(m.base.length)); return resp(remote[url.slice(m.base.length)]) } })
    expect(before).toBeGreaterThanOrEqual(2)
    expect(asked).toEqual(['assets/b.js'])                      // index.html and a.js were kept
  })
  it('reads a body without a stream too', async () => {
    let n = 0
    const b = await readBody({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }, k => { n += k })
    expect(new Uint8Array(b)).toEqual(new Uint8Array([1, 2, 3]))
    expect(n).toBe(3)
  })
  it('says once what it switched to', () => {
    localStorage.setItem('mj_live_done', JSON.stringify({ v: '17.0.0', same: true }))
    expect(takeUpdated()).toEqual({ v: '17.0.0', same: true })
    expect(takeUpdated()).toBe(null)
    localStorage.setItem('mj_live_done', JSON.stringify('16.0.0'))   // written by 16.0
    expect(takeUpdated()).toEqual({ v: '16.0.0', same: false })
  })
})

describe('17.0 — a new APK, inside the app', () => {
  it('a release gives each APK’s size, SHA-256 and the notes', () => {
    const H = 'e'.repeat(64)
    const r = parseRelease({ tag_name: 'v17.1.0', html_url: 'u', body: '<!-- mj-notes-en: Faster. -->\n<!-- mj-notes-ar: أسرع. -->', assets: [
      { name: 'MAHDI-JYM.apk', browser_download_url: 'https://github.com/x/MAHDI-JYM.apk', size: 70e6, digest: 'sha256:' + H },
      { name: 'MAHDI-JYM-online.apk', browser_download_url: 'https://github.com/x/MAHDI-JYM-online.apk', size: 7e6 }] }, '17.0.0')
    expect(r.newer).toBe(true)
    expect(r.offline).toEqual({ url: 'https://github.com/x/MAHDI-JYM.apk', size: 70e6, sha256: H })
    expect(r.online).toEqual({ url: 'https://github.com/x/MAHDI-JYM-online.apk', size: 7e6 })
    expect(r.notes).toEqual({ en: 'Faster.', ar: 'أسرع.' })
  })
  it('names the plugin’s errors, and notices the update arrived', () => {
    expect(errCode({ code: 'CHECKSUM' })).toBe('CHECKSUM')
    expect(errCode({ code: 'HTTP_404' })).toBe('NETWORK')
    expect(errCode({})).toBe('NETWORK')
    localStorage.setItem('mj_apk_target', JSON.stringify({ v: '17.1.0', at: Date.now() }))
    expect(takeApkUpdated('17.0.0')).toBe(null)                  // not yet (the installer was closed)
    expect(takeApkUpdated('17.1.0')).toBe('17.1.0')
    expect(takeApkUpdated('17.1.0')).toBe(null)                  // said once
    localStorage.setItem('mj_apk_target', JSON.stringify({ v: '17.1.0', at: Date.now() - 3 * 86400e3 }))
    expect(takeApkUpdated('17.0.0')).toBe(null)
    expect(localStorage.getItem('mj_apk_target')).toBe(null)     // forgotten after two days
  })
})

describe('17.0 — the update flow', () => {
  beforeEach(() => { localStorage.removeItem('mj_upd_history'); localStorage.removeItem('mj_upd_snooze'); localStorage.removeItem('mj_upd_auto') })
  it('the meter smooths the speed, and the time left follows it', () => {
    const mt = meter()
    expect(mt.push(0, 0)).toBe(0)
    expect(mt.push(500000, 100)).toBe(0)                         // too soon for a sample
    expect(mt.push(1000000, 500)).toBe(2000000)                  // 1 MB in 0.5 s
    expect(mt.push(1500000, 1000)).toBe(2000000 * 0.7 + 1000000 * 0.3)
    expect(etaOf(1e6, 3e6, 1e6)).toBe(2)
    expect(etaOf(1e6, 3e6, 0)).toBe(null)
    expect(etaOf(3e6, 3e6, 1e6)).toBe(0)
  })
  it('“Cancel” hides an offer for 12 hours — a newer one shows at once', () => {
    const o = { kind: 'live', version: '17.0.0', build: 'aaaaaaaaaaaa' }
    const now = Date.now()
    expect(offerId(o)).toBe('live:17.0.0+aaaaaaaaaaaa')
    const s = { id: offerId(o), until: now + 12 * 3600e3 }
    expect(snoozed(o, now, s)).toBe(true)
    expect(snoozed(o, now + 13 * 3600e3, s)).toBe(false)
    expect(snoozed({ ...o, build: 'bbbbbbbbbbbb' }, now, s)).toBe(false)
  })
  it('keeps the versions this phone got, newest first', () => {
    addHistory({ v: '17.0.0', how: 'apk', at: 1 })
    addHistory({ v: '17.0.0', how: 'live', same: true, at: 2 })
    addHistory({ v: '17.0.1', how: 'live', at: 3 })
    expect(updateHistory().map(h => h.v + ':' + h.how)).toEqual(['17.0.1:live', '17.0.0:live', '17.0.0:apk'])
    for (let i = 0; i < 20; i++) addHistory({ v: '18.0.' + i, how: 'live' })
    expect(updateHistory()).toHaveLength(HISTORY_MAX)
  })
  it('looking by itself can be turned off', () => {
    expect(autoOn()).toBe(true)
    setAutoOn(false)
    expect(autoOn()).toBe(false)
    setAutoOn(true)
    expect(autoOn()).toBe(true)
  })
  it('the demo offers the next version, and Cancel takes it away', () => {
    updateDemo({ notes: { en: 'x', ar: 'س' } })
    const s = useUpdate.getState()
    expect(s).toMatchObject({ phase: 'available', kind: 'demo', dock: true })
    expect(s.version.split('.').length).toBe(3)
    expect(isBusy()).toBe(false)
    expect(updateCancel()).toBe('hidden')
    expect(useUpdate.getState()).toMatchObject({ phase: 'idle', dock: false, kind: null })
  })
})
