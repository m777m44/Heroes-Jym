#!/usr/bin/env bash
# 14.0 — the two Android apps' launcher icons: the MAHDI-JYM icon (android/app/src/main/res) with a
# small badge in the bottom corner, so the two installs are easy to tell apart on the home screen:
#
#   offline  (io.github.m777m44.mahdijym)         a blue  "OFF" badge  → android/app/src/offline/res
#   online   (io.github.m777m44.mahdijym.online)  a green "WEB" badge  → android/app/src/online/res
#
# The adaptive icon's foreground and the round icon keep the badge inside the inscribed circle, so
# no launcher mask (circle, squircle, teardrop) cuts it. Run it again whenever the icon changes:
#   bash scripts/flavor-icons.sh            (needs ImageMagick and the DejaVu Sans Bold font)
set -euo pipefail
cd "$(dirname "$0")/.."
RES=android/app/src/main/res
FONT=${FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}
[ -f "$FONT" ] || { echo "✗ font not found: $FONT"; exit 1; }

# badge <in> <out> <text> <colour> <cx> <cy> <w> <h>   (centre, width and height as fractions of the icon)
badge() {
  local in=$1 out=$2 text=$3 col=$4 cx=$5 cy=$6 bw=$7 bh=$8
  local W H
  W=$(identify -format '%w' "$in"); H=$(identify -format '%h' "$in")
  read -r x0 y0 x1 y1 r sw fs ty < <(awk -v W="$W" -v H="$H" -v cx="$cx" -v cy="$cy" -v bw="$bw" -v bh="$bh" 'BEGIN {
    w = bw * W; h = bh * H; x0 = cx * W - w / 2; y0 = cy * H - h / 2
    printf "%.1f %.1f %.1f %.1f %.1f %.1f %.1f %.1f\n", x0, y0, x0 + w, y0 + h, h / 2, (W >= 100 ? W * 0.018 : 1.2), h * 0.6, cy * H }')
  convert "$in" -fill "$col" -stroke '#0c0e12' -strokewidth "$sw" -draw "roundrectangle $x0,$y0 $x1,$y1 $r,$r" "$out.tmp.png"
  # the text, centred on the pill (gravity Center with an offset from the image centre)
  local ox oy
  ox=$(awk -v W="$W" -v cx="$cx" 'BEGIN { printf "%+.1f", cx * W - W / 2 }')
  oy=$(awk -v H="$H" -v ty="$ty" 'BEGIN { printf "%+.1f", ty - H / 2 }')
  convert "$out.tmp.png" -fill white -font "$FONT" -pointsize "$fs" -gravity Center -annotate "${ox}${oy}" "$text" "$out"
  rm -f "$out.tmp.png"
}

for flavor in offline online; do
  if [ "$flavor" = offline ]; then text=OFF; col='#3B82F6'; else text=WEB; col='#10B981'; fi
  for d in "$RES"/mipmap-*dpi; do
    dpi=$(basename "$d")
    out="android/app/src/$flavor/res/$dpi"
    mkdir -p "$out"
    # adaptive foreground: shown whole inside the mask's viewport → stay in its inscribed circle
    badge "$d/ic_launcher_foreground.png" "$out/ic_launcher_foreground.png" "$text" "$col" 0.667 0.772 0.40 0.215
    badge "$d/ic_launcher_round.png" "$out/ic_launcher_round.png" "$text" "$col" 0.667 0.772 0.40 0.215
    badge "$d/ic_launcher.png" "$out/ic_launcher.png" "$text" "$col" 0.69 0.79 0.44 0.235
  done
done
echo "✓ launcher icons: android/app/src/offline/res (OFF) and android/app/src/online/res (WEB)"
