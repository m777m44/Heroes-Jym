import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { createHash } from 'node:crypto'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

const backend = process.env.API_TARGET || 'http://127.0.0.1:3000'
const media = process.env.MEDIA_TARGET || 'http://127.0.0.1:8888'

// Offline web app: after the build, write the list of every built file (and a version derived
// from their contents) into dist/sw.js. The service worker precaches them at install, so every
// screen opens without a connection — not only the ones visited before. Exercise media
// (img/, gif/) are left out: they are saved on demand (Settings → Offline). Wallpapers too: each
// is cached the first time it is shown.
function precacheSW() {
  let outDir = 'dist'
  return {
    name: 'mj-precache-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir },
    closeBundle() {
      const swPath = join(outDir, 'sw.js')
      if (!existsSync(swPath)) return
      const files = []
      const walk = d => {
        for (const n of readdirSync(d)) {
          const p = join(d, n)
          const rel = relative(outDir, p).split(sep).join('/')
          if (statSync(p).isDirectory()) { if (rel !== 'img' && rel !== 'gif' && rel !== 'wallpapers' && rel !== 'sounds') walk(p) }
          else if (rel !== 'sw.js' && !rel.endsWith('.map')) files.push(rel)
        }
      }
      walk(outDir)
      files.sort()
      const h = createHash('sha256')
      for (const f of files) h.update(f).update(readFileSync(join(outDir, f)))
      const version = pkg.version + '-' + h.digest('hex').slice(0, 10)
      // 12.0: media bases that point at a CDN (the Pages builds) are cached by the worker too
      const cdnMedia = [process.env.VITE_IMG_BASE, process.env.VITE_GIF_BASE].filter(u => /^https:\/\//.test(u || ''))
      const sw = readFileSync(swPath, 'utf8')
        .replace(/const VERSION = '[^']*'/, `const VERSION = '${version}'`)
        .replace(/const PRECACHE = \[[^\]]*\]/, `const PRECACHE = ${JSON.stringify(['./', ...files])}`)
        .replace(/const MEDIA_PREFIXES = \[[^\]]*\]/, `const MEDIA_PREFIXES = ${JSON.stringify(cdnMedia)}`)
      writeFileSync(swPath, sw)
    },
  }
}

export default defineConfig({
  plugins: [react(), precacheSW()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: './',
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/img': { target: media, changeOrigin: true },
      '/gif': { target: media, changeOrigin: true }
    }
  },
  build: { chunkSizeWarningLimit: 1500 }
})
