#!/usr/bin/env node
// 16.0 — a much lighter offline APK: the 1,324 exercise animations go in as small H.264 MP4
// videos instead of GIFs. Same 180 × 180 picture, same frames, same timing — about a tenth of the
// size (≈ 126 MB of GIFs → ≈ 12 MB), and Android plays video with its hardware decoder, so the
// animations are smoother and use less memory and battery than a GIF.
//
//   MEDIA_DIR=/path/with/videos FFMPEG=/path/to/ffmpeg node scripts/convert-media.mjs
//
// MEDIA_DIR holds the hasaneyldrm/exercises-dataset layout (videos/*.gif, or gif/*.gif). Every
// GIF becomes MEDIA_DIR/mp4/<same name>.mp4; files already converted with the same settings are
// kept (CI caches the folder), so a second run only does what is new. Fails if any GIF can't be
// converted — scripts/bundle-media.mjs then refuses to build a half-offline app.
//
// The media is © Gym visual (https://gymvisual.com/), redistributed by the dataset at 180 × 180
// with its permission. The videos keep exactly that size; the app shows the attribution.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { availableParallelism } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
/** The encoder settings — part of the cache key: change them and every file is made again. */
export const FFMPEG_ARGS = [
  '-an', '-fps_mode', 'passthrough',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-profile:v', 'main', '-level', '3.1', '-pix_fmt', 'yuv420p',
  '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos',
  '-movflags', '+faststart',
]
export const SETTINGS = 'h264-crf26-main31-v1'

/** "0001-abc.gif" → "0001-abc.mp4" (the app does the same: lib/exercises.js videoName). */
export const mp4Name = gif => String(gif).replace(/\.gif$/i, '') + '.mp4'

function run(ffmpeg, src, out) {
  return new Promise((ok, fail) => {
    const tmp = out + '.part.mp4'
    const p = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, ...FFMPEG_ARGS, tmp], { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', d => { err += d })
    p.on('error', fail)
    p.on('close', code => {
      if (code === 0 && existsSync(tmp) && statSync(tmp).size > 0) { renameSync(tmp, out); ok() } else { rmSync(tmp, { force: true }); fail(new Error((err || 'ffmpeg exit ' + code).trim().split('\n').pop())) }
    })
  })
}

export async function convertAll({ media, ffmpeg = 'ffmpeg', jobs = Math.max(2, availableParallelism ? availableParallelism() : 4), log = console.log } = {}) {
  const gifDir = ['videos', 'gif'].map(n => join(media, n)).find(p => existsSync(p))
  if (!gifDir) throw new Error(`No GIFs in ${media} (expected videos/ or gif/)`)
  const outDir = join(media, 'mp4')
  mkdirSync(outDir, { recursive: true })
  const stamp = join(outDir, '.settings')
  // other settings than last time: start again
  if (existsSync(stamp) && readFileSync(stamp, 'utf8').trim() !== SETTINGS) for (const f of readdirSync(outDir)) rmSync(join(outDir, f), { force: true })
  writeFileSync(stamp, SETTINGS + '\n')
  const gifs = readdirSync(gifDir).filter(f => /\.gif$/i.test(f)).sort()
  const todo = gifs.filter(g => !existsSync(join(outDir, mp4Name(g))))
  log(`${gifs.length} animations — ${gifs.length - todo.length} already converted, ${todo.length} to go (${jobs} at a time)`)
  const failed = []
  let i = 0, done = 0
  const worker = async () => {
    while (i < todo.length) {
      const g = todo[i++]
      try { await run(ffmpeg, join(gifDir, g), join(outDir, mp4Name(g))) } catch (e) { failed.push(g + ': ' + e.message) }
      if (++done % 200 === 0) log(`  ${done} / ${todo.length}`)
    }
  }
  await Promise.all(Array.from({ length: jobs }, worker))
  let gifBytes = 0, mp4Bytes = 0
  for (const g of gifs) {
    gifBytes += statSync(join(gifDir, g)).size
    const m = join(outDir, mp4Name(g))
    if (existsSync(m)) mp4Bytes += statSync(m).size
  }
  return { count: gifs.length, failed, gifBytes, mp4Bytes, outDir }
}

if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))) {
  const media = resolve(process.env.MEDIA_DIR || join(here, '..', '..', 'media'))
  const ffmpeg = process.env.FFMPEG || 'ffmpeg'
  const r = await convertAll({ media, ffmpeg })
  const mb = b => (b / 1e6).toFixed(1) + ' MB'
  if (r.failed.length) {
    console.error(`✗ ${r.failed.length} animation(s) could not be converted, e.g.\n  ` + r.failed.slice(0, 5).join('\n  '))
    process.exit(1)
  }
  console.log(`✓ ${r.count} animations as MP4 in ${r.outDir}: ${mb(r.gifBytes)} of GIFs → ${mb(r.mp4Bytes)} (${Math.round(100 * r.mp4Bytes / Math.max(1, r.gifBytes))} %)`)
}
