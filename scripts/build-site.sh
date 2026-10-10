#!/usr/bin/env bash
# Assembles the heroes-jym.com site into _site/ (or $1): website/ + screenshots + icons +
# the browser-only demo at /demo/ (+ the latest release APK when `gh` can fetch it).
# Used by .github/workflows/pages.yml and for local previews:
#   bash scripts/build-site.sh && python3 -m http.server -d _site 8080
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-_site}
DATASET=${DATASET:-https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd}

if [ "${SKIP_DEMO_BUILD:-}" != 1 ]; then
  [ -d frontend/node_modules ] || (cd frontend && npm ci --ignore-scripts)
  (cd frontend && VITE_DEMO=1 VITE_IMG_BASE="$DATASET/images/" VITE_GIF_BASE="$DATASET/videos/" npx vite build)
fi

rm -rf "$OUT" && mkdir -p "$OUT/img"
cp -r website/. "$OUT/"
rm -f "$OUT/README.md"
cp assets/screenshots/*.png assets/banner.png "$OUT/img/"
cp frontend/public/icon-180.png frontend/public/icon-512.png "$OUT/"
cp -r frontend/dist "$OUT/demo"

if command -v gh >/dev/null && [ "${SKIP_APK:-}" != 1 ]; then
  gh release download --repo m777m44/Heroes-Jym --pattern MAHDI-JYM.apk --dir "$OUT" 2>/dev/null \
    || echo "note: no release APK downloaded — the site links to GitHub Releases instead"
fi
echo "site ready in $OUT/"
