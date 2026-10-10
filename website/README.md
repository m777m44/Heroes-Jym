# heroes-jym.com

Source of the project website — plain hand-written HTML/CSS/JS, no build step.
Deployed to GitHub Pages by `../.github/workflows/pages.yml`; `CNAME` sets the custom
domain **heroes-jym.com**.

| Path | What |
| --- | --- |
| `index.html` | English landing page (features, screenshots, live demo, download) |
| `ar.html` | Arabic landing page (RTL) with step-by-step APK install help |
| `docs.html`, `about.html` | Docs & story |
| `site.js` | Live GitHub numbers + latest release version/size (fails silently) |

Not in this folder (added at deploy time):

- `img/` — the five screenshots from `../assets/screenshots/` plus `banner.png`
- `icon-180.png` / `icon-512.png` — copied from `../frontend/public/`
- `demo/` — the browser-only demo build of the app (`VITE_DEMO=1`)
- `MAHDI-JYM.apk` — copy of the newest GitHub Release APK
  (the download buttons link to `releases/latest/download/MAHDI-JYM.apk` directly)

Preview locally: `bash scripts/build-site.sh && python3 -m http.server -d _site 8080`
