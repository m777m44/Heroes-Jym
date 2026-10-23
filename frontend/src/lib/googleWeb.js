// 8.0 — "Sign in with Google" on a self-hosted instance (GOOGLE_CLIENT_ID on the server).
//
// Google Identity Services draws its own official button and hands back an ID token; the server
// verifies it (api/google.js) and sets the usual session cookie. The script is loaded only when
// the instance has a client ID, so an instance without it never contacts Google.
import { api } from './api.js'

const SRC = 'https://accounts.google.com/gsi/client'
let loading = null

/** Load Google Identity Services once → google.accounts.id. */
export function loadGis() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.reject(new Error('no browser'))
  if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve(window.google.accounts.id)
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SRC
      s.async = true
      s.defer = true
      const tm = setTimeout(() => { loading = null; reject(new Error('timeout')) }, 15000)
      s.onload = () => {
        clearTimeout(tm)
        const id = window.google && window.google.accounts && window.google.accounts.id
        if (id) resolve(id); else { loading = null; reject(new Error('gis missing')) }
      }
      s.onerror = () => { clearTimeout(tm); loading = null; reject(new Error('blocked')) }
      document.head.appendChild(s)
    })
  }
  return loading
}

// GIS is initialised once per client ID; whichever button is on screen receives the token.
let initedFor = null
let handler = null

/**
 * Draw Google's button into `el`. `onCredential(idToken)` is called after the user picks an
 * account. Resolves once drawn; rejects when Google's script can't be loaded (blocked/offline).
 */
export async function renderGoogleButton(el, { clientId, onCredential, theme = 'outline', text = 'continue_with', locale } = {}) {
  const id = await loadGis()
  handler = onCredential
  if (initedFor !== clientId) {
    id.initialize({
      client_id: clientId,
      callback: r => { if (r && r.credential && handler) handler(r.credential) },
      ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true, itp_support: true,
    })
    initedFor = clientId
  }
  if (!el) return
  el.innerHTML = ''
  const width = Math.round(Math.min(400, Math.max(220, el.clientWidth || 320)))
  id.renderButton(el, { type: 'standard', theme, size: 'large', text, shape: 'pill', logo_alignment: 'left', width, locale })
}

export const googleLogin = (credential, code) => api('/api/google/login', { method: 'POST', body: JSON.stringify({ credential, code: code || '' }) })
export const googleLink = credential => api('/api/google/link', { method: 'POST', body: JSON.stringify({ credential }) })
export const googleUnlink = () => api('/api/google/unlink', { method: 'POST', body: '{}' })
