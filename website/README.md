# The MAHDI-JYM website — https://m777m44.github.io/Heroes-Jym/

Source of the project website — plain hand-written HTML/CSS/JS, no build step.
Deployed to GitHub Pages by `../.github/workflows/pages.yml` (Settings → Pages → Source:
**GitHub Actions**). Every link is relative, so the site works under the `/Heroes-Jym/`
project path (and on any custom domain later).

| Path | What |
| --- | --- |
| `index.html` | English landing page (what's new, features, screenshots, live demo, the three ways to get the app) |
| `ar.html` | Arabic landing page (RTL) with step-by-step APK install help |
| `docs.html`, `about.html` | Docs & story |
| `site.js` | Live GitHub numbers + the newest release's version and the size of each APK (fails silently) |

Not in this folder (added at deploy time by `../scripts/build-site.sh`):

- `app/` — **the web app** (`VITE_WEBAPP=1`): the real app, your own data in your browser
- `demo/` — the demo with example data (`VITE_DEMO=1`); its storage is kept apart from the web app's
- `img/` — the five screenshots from `../assets/screenshots/` plus `banner.png`
- `icon-180.png` / `icon-512.png` — copied from `../frontend/public/`

The APKs are not copied: the buttons link to
`releases/latest/download/MAHDI-JYM.apk` (full, offline) and
`releases/latest/download/MAHDI-JYM-online.apk` (light, online), which always point at the
newest release.

Preview locally: `bash scripts/build-site.sh && python3 -m http.server -d _site 8080`
