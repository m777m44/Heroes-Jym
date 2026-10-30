import './lib/storageNs.js'   // 12.0: first — the demo keeps its storage apart from the web app
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { MOBILE } from './lib/mobile.js'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)

// 14.0: the online Android app updates itself (lib/liveUpdate.js): settle a version it just switched
// to, remember this APK's native level, tidy up old downloads. Folds away in every other build.
if (MOBILE && import.meta.env.VITE_OFFLINE_MEDIA !== '1') import('./lib/liveUpdate.js').then(m => m.liveBoot()).catch(() => {})

// Not in the mobile build: the native shell already serves everything from disk.
if (!MOBILE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
