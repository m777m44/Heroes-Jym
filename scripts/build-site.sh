#!/usr/bin/env bash
# Assembles the GitHub Pages site into _site/ (or $1):
#
#   /           the project website (website/ — plain HTML, no build step), English
#   /ar.html    the same site in Arabic
#   /app/       12.0: the web app — the real MAHDI-JYM in the browser, your own data kept in
#               this browser (VITE_WEBAPP=1), installable from the browser menu
#   /demo/      the browser-only demo with an example history (VITE_DEMO=1)
#
# Used by .github/workflows/pages.yml and for local previews:
#   bash scripts/build-site.sh && python3 -m http.server -d _site 8080
#
# The exercise images/GIFs (~140 MB) are never part of the site: both builds take them from the
# upstream dataset on jsDelivr, pinned to a commit so the CDN (and the app's offline copy) can
# keep them forever. The APKs stay on GitHub Releases — the site links there.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-_site}
DATASET=${DATASET:-https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

[ -d frontend/node_modules ] || (cd frontend && npm ci --ignore-scripts)
for kind in app demo; do
  flag=VITE_WEBAPP; [ "$kind" = demo ] && flag=VITE_DEMO
  (cd frontend && env "$flag=1" VITE_IMG_BASE="$DATASET/images/" VITE_GIF_BASE="$DATASET/videos/" \
    npx vite build --outDir "$TMP/$kind" --emptyOutDir --logLevel warn)
done

rm -rf "$OUT" && mkdir -p "$OUT/img"
cp -r website/. "$OUT/"
rm -f "$OUT/README.md"
cp assets/screenshots/*.png assets/banner.png "$OUT/img/"
cp frontend/public/icon-180.png frontend/public/icon-512.png "$OUT/"
cp -r "$TMP/app" "$OUT/app"
cp -r "$TMP/demo" "$OUT/demo"
touch "$OUT/.nojekyll"
echo "site ready in $OUT/ ($(du -sh "$OUT" | cut -f1))"
