// Demo build (VITE_DEMO=1) and web app build (VITE_WEBAPP=1) — what runs on GitHub Pages.
//
// Pages can only serve static files, so there is no API: passkey sign-in, per-profile sync
// and the admin dashboard all need the Node backend and are simply not part of these builds.
// Both stay in guest mode (everything in this browser):
//   · the demo (/demo/) boots with a seeded example history (demoSeed.js), so the charts,
//     heatmap, streaks and "last time you lifted…" pre-fills have something to show;
//   · the web app (/app/, 12.0) is the real app — your own data, nothing seeded.
// The two share one origin (m777m44.github.io), so the demo keeps its data apart: its
// localStorage keys and IndexedDB names are prefixed (lib/storageNs.js, dbName()), and every
// service worker names its caches after its own scope (public/sw.js).
//
// Vite replaces VITE_DEMO / VITE_WEBAPP at build time, so the Pages-only UI folds away and the
// seed generator — imported dynamically — never lands in a self-hosted bundle.
export const DEMO = import.meta.env.VITE_DEMO === '1'
export const WEBAPP = import.meta.env.VITE_WEBAPP === '1'
/** No backend at all (GitHub Pages): the demo or the web app. */
export const NO_SERVER = DEMO || WEBAPP
export const DEMO_SEEDED = 'gym_demo_seeded_v1'
export const REPO = 'https://github.com/m777m44/Heroes-Jym'
/** IndexedDB database name — the demo's are kept apart from the web app's on the same origin. */
export const dbName = name => (DEMO ? 'demo-' : '') + name
