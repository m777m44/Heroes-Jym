// 14.0 — the online app updates itself: the manifest GitHub Pages carries (made by
// scripts/live-manifest.mjs), what the app decides from it, and the base64 it writes files with.
import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseLive, liveDecision, toBase64, LIVE_URL, NATIVE_LEVEL, liveSupported } from './liveUpdate.js'

const here = dirname(fileURLToPath(import.meta.url))
const H = 'a'.repeat(64)
const man = (o = {}) => ({ v: 1, version: '14.0.1', native: 1, base: '14.0.1/', files: [['index.html', 900, H], ['assets/index-x1.js', 5000, 'b'.repeat(64)]], ...o })

describe('14.0 — updating the online app inside the app', () => {
  it('reads the manifest: version, native level, files, where they are', () => {
    const m = parseLive(man())
    expect(m.version).toBe('14.0.1')
    expect(m.native).toBe(1)
    expect(m.size).toBe(5900)
    expect(m.base).toBe('https://m777m44.github.io/Heroes-Jym/live/14.0.1/')
    expect(m.files[1]).toEqual({ p: 'assets/index-x1.js', s: 5000, h: 'b'.repeat(64) })
    expect(LIVE_URL).toBe('https://m777m44.github.io/Heroes-Jym/live/online.json')
  })
  it('refuses anything broken or unsafe', () => {
    expect(() => parseLive(null)).toThrow()
    expect(() => parseLive(man({ v: 2 }))).toThrow()
    expect(() => parseLive(man({ version: 'latest' }))).toThrow()
    expect(() => parseLive(man({ files: [['assets/a.js', 1, H]] }))).toThrow(/index/)
    expect(() => parseLive(man({ files: [['index.html', 1, H], ['../evil.js', 1, H]] }))).toThrow(/path/)
    expect(() => parseLive(man({ files: [['index.html', 1, H], ['/abs.js', 1, H]] }))).toThrow(/path/)
    expect(() => parseLive(man({ files: [['index.html', 1, 'nothex']] }))).toThrow(/hash/)
  })
  it('decides: newest already, ready, needs the new app, or it could not start before', () => {
    const m = parseLive(man())
    expect(liveDecision(m, { current: '14.0.1', apkNative: 1, bad: null })).toBe('latest')
    expect(liveDecision(m, { current: '14.1.0', apkNative: 1, bad: null })).toBe('latest')
    expect(liveDecision(m, { current: '14.0.0', apkNative: 1, bad: null })).toBe('ready')
    expect(liveDecision(parseLive(man({ native: 2 })), { current: '14.0.0', apkNative: 1, bad: null })).toBe('needs-apk')
    expect(liveDecision(m, { current: '14.0.0', apkNative: 1, bad: '14.0.1' })).toBe('failed')
    expect(liveDecision(null, { current: '14.0.0', apkNative: 1 })).toBe('latest')
  })
  it('writes files as base64, big ones too', () => {
    const big = new Uint8Array(200000).map((_, i) => i * 7 % 256)
    expect(Buffer.from(toBase64(big.buffer), 'base64').equals(Buffer.from(big))).toBe(true)
    expect(toBase64(new Uint8Array([104, 105]).buffer)).toBe('aGk=')
  })
  it('only the online Android app does it', () => {
    expect(liveSupported()).toBe(false)   // tests run as the web build
    expect(NATIVE_LEVEL).toBeGreaterThanOrEqual(1)
  })
  it('scripts/live-manifest.mjs makes a manifest the app accepts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mj-live-'))
    try {
      mkdirSync(join(dir, 'b', 'assets'), { recursive: true })
      writeFileSync(join(dir, 'b', 'index.html'), '<!doctype html><title>MAHDI-JYM</title>')
      writeFileSync(join(dir, 'b', 'assets', 'index-abc.js'), 'console.log(1)')
      writeFileSync(join(dir, 'b', 'assets', 'index-abc.js.map'), '{}')
      execFileSync(process.execPath, [join(here, '..', '..', 'scripts', 'live-manifest.mjs'), join(dir, 'b'), join(dir, 'online.json'), '9.9.9/'])
      const raw = JSON.parse(readFileSync(join(dir, 'online.json'), 'utf8'))
      const pkg = JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf8'))
      expect(raw.version).toBe(pkg.version)
      expect(raw.native).toBe(pkg.mjNative)
      const m = parseLive(raw)
      expect(m.files.map(f => f.p)).toEqual(['assets/index-abc.js', 'index.html'])   // no source maps
      expect(m.base.endsWith('/live/9.9.9/')).toBe(true)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
