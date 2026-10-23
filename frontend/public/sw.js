/* MAHDI-JYM service worker — works fully offline.
   - App shell: every file of the build is precached at install (the list and VERSION are
     written into this file by vite.config.js → precacheSW), so all screens open offline.
   - Hashed assets (assets/*) and exercise media (img/, gif/) are cache-first.
   - Exercise media can be saved in bulk from Settings → Offline (lib/offlineMedia.js); they
     live in their own cache that survives app updates.
   - Everything else: network first, cache as fallback. /api/ is never cached. */
const VERSION = 'dev'
const PRECACHE = []
const SHELL = 'mahdi-jym-shell-' + VERSION
const RUNTIME = 'mahdi-jym-rt-v1'
const MEDIA = 'mahdi-jym-media-v1'
const KEEP = [SHELL, RUNTIME, MEDIA]

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL)
    // one by one: a single missing file must not cancel the whole offline copy
    // hashed assets that an earlier version already holds are copied, not downloaded again
    .then(c => Promise.allSettled(PRECACHE.map(async u => {
      const hit = u.startsWith('assets/') && await caches.match(u)
      return hit ? c.put(u, hit) : c.add(new Request(u, { cache: 'reload' }))
    })))
    .then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()))
})
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(self.registration.showNotification(data.title || 'MAHDI-JYM', {
    body: data.body || '',
    icon: 'icon-512.png',
    badge: 'icon-180.png',
    tag: data.tag || 'mahdi-jym',
    renotify: true,
    data: { url: data.url || './' }
  }))
})
self.addEventListener('notificationclick', e => {
  e.notification.close()
  // deep link: reminders open Today, the step notification opens the walking screen
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const c = clients.find(c => 'focus' in c)
    if (!c) return self.clients.openWindow(target)
    return ('navigate' in c && c.url !== target ? c.navigate(target).catch(() => c) : Promise.resolve(c)).then(w => (w || c).focus())
  }))
})

const scoped = path => new URL(path, self.registration.scope).href

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/api/')) return    // never cache auth/data

  const isMedia = url.pathname.includes('/img/') || url.pathname.includes('/gif/') || url.pathname.includes('/wallpapers/') || url.pathname.includes('/sounds/')
  const isAsset = url.pathname.includes('/assets/')
  if (isMedia || isAsset) {
    // cache-first: media never change, hashed assets are immutable
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(isMedia ? MEDIA : RUNTIME).then(c => c.put(e.request, copy)) }
      return res
    })))
    return
  }
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(e.request, copy)) }
    return res
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit
    || (e.request.mode === 'navigate'
      ? caches.match(scoped('index.html')).then(h => h || caches.match(scoped('./'))).then(h => h || Response.error())
      : Response.error()))))
})
