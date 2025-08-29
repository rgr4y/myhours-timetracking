#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/icon-1024.png"
  exit 1
fi

SRC_PNG="$1"
if [[ ! -f "$SRC_PNG" ]]; then
  echo "File not found: $SRC_PNG"
  exit 1
fi

OUT_DIR="build"
ICONSET="$OUT_DIR/icon.iconset"
ICNS_OUT="$OUT_DIR/icon.icns"

mkdir -p "$ICONSET" "$OUT_DIR"

sizes=(16 32 64 128 256 512 1024)

for sz in "${sizes[@]}"; do
  # base
  sips -z "$sz" "$sz" "$SRC_PNG" --out "$ICONSET/icon_${sz}x${sz}.png" >/dev/null
  # @2x
  sips -z $((sz*2)) $((sz*2)) "$SRC_PNG" --out "$ICONSET/icon_${sz}x${sz}@2x.png" >/dev/null
done

iconutil -c icns "$ICONSET" -o "$ICNS_OUT"
echo "Generated: $ICNS_OUT"

