// 12.0 — the demo and the web app are served from the same origin on GitHub Pages
// (m777m44.github.io/Heroes-Jym/demo/ and …/app/), and browsers give one origin one
// localStorage. Without this the demo's example data would overwrite your real data in the web
// app. So in the demo build every key is stored under a "demo:" prefix. Imported first in
// main.jsx, before any module reads storage; in every other build it does nothing.
import { DEMO } from './demo.js'

export const NS = 'demo:'

/** A Storage-like view of `real` that keeps every key under `prefix`. */
export function prefixedStorage(real, prefix = NS) {
  const own = () => {
    const out = []
    for (let i = 0; i < real.length; i++) { const k = real.key(i); if (k && k.startsWith(prefix)) out.push(k) }
    return out
  }
  return {
    getItem: k => real.getItem(prefix + k),
    setItem: (k, v) => real.setItem(prefix + k, String(v)),
    removeItem: k => real.removeItem(prefix + k),
    clear: () => { for (const k of own()) real.removeItem(k) },
    key: i => { const k = own()[i]; return k ? k.slice(prefix.length) : null },
    get length() { return own().length },
  }
}

if (DEMO && typeof window !== 'undefined') {
  try {
    const view = prefixedStorage(window.localStorage)
    Object.defineProperty(window, 'localStorage', { value: view, configurable: true })
  } catch { /* storage blocked (private mode) — the app falls back to memory as before */ }
}
