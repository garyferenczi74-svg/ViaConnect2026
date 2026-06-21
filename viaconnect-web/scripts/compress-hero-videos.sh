#!/usr/bin/env bash
#
# compress-hero-videos.sh
#
# Re-compresses the oversized hero/background videos flagged by the
# 2026-06-20 hero-video health audit and (optionally) re-uploads them to
# Supabase Storage, overwriting the same paths so no code URLs change.
#
# Why: every hero video already loads with HTTP range streaming, but a
# handful of un-optimized exports (15 to 35 MB) cause soft stalls on slow
# connections. Re-encoding muted background loops to 720p H.264 CRF 28 with
# the moov atom at the front (+faststart) cuts them roughly 4 to 6x and lets
# playback start before the full download. The landing hero is kept at 1080p
# CRF 24 because it is full-screen, and a poster frame is extracted for it.
#
# Requires: ffmpeg, curl. Upload also needs the Supabase service role key.
#
# Usage:
#   bash scripts/compress-hero-videos.sh              # download + compress + poster + size report
#   bash scripts/compress-hero-videos.sh --upload     # also re-upload (needs SUPABASE_SERVICE_ROLE_KEY)
#
# The compressed files land in ./hero-fix/out/ and the poster in
# viaconnect-web/public/images/hero-poster.jpg. If you do not use --upload,
# upload ./hero-fix/out/* yourself via the Supabase dashboard (Storage ->
# the bucket -> upload -> replace existing), keeping the EXACT same filename
# and bucket (including the "Metobolic" spelling and the two videos that live
# in the Hero Images bucket).
#
# Note: storage objects are cached max-age=3600, so a replaced file can take
# up to ~1 hour to propagate (or purge the CDN cache).

set -euo pipefail

PROJECT="nnhkcufyqjojdbvdrpky"
BASE="https://${PROJECT}.supabase.co/storage/v1/object/public"
UPLOAD_BASE="https://${PROJECT}.supabase.co/storage/v1/object"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"     # .../viaconnect-web
WORK="${SCRIPT_DIR}/../hero-fix"               # working dir (gitignored output)
ORIG="${WORK}/orig"
OUT="${WORK}/out"
POSTER_DEST="${WEB_ROOT}/public/images/hero-poster.jpg"

DO_UPLOAD="no"
[ "${1:-}" = "--upload" ] && DO_UPLOAD="yes"

# Each entry: bucket|filename|tier   (tier is "loop" or "hero")
ENTRIES=(
  "Hero Videos|unlock your genetic blueprint.mp4|loop"
  "Hero Videos|Metobolic.mp4|loop"
  "Hero Videos|Blood Test.mp4|loop"
  "Hero Videos|Mountain top.mp4|loop"
  "Hero Images|Methylation Testing.mp4|loop"
  "Hero Images|CannabisIQ.mp4|loop"
  "Hero Videos|Food 5.mp4|loop"
  "Hero Videos|Methylation SNP Support.mp4|loop"
  "Assets|DNA HD.mp4|hero"
)

# URL-encode spaces (the only non-alphanumeric in these names besides dots)
enc() { printf '%s' "$1" | sed 's/ /%20/g'; }

human() { # bytes -> MB string
  awk "BEGIN{printf \"%.1f MB\", $1/1048576}"
}

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "ERROR: '$1' is required but not installed."; exit 1; }
}

require ffmpeg
require curl

if [ "${DO_UPLOAD}" = "yes" ] && [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "ERROR: --upload needs SUPABASE_SERVICE_ROLE_KEY in the environment."
  echo "       export SUPABASE_SERVICE_ROLE_KEY=... (keep it secret; do not commit it)."
  exit 1
fi

mkdir -p "${ORIG}" "${OUT}" "${WEB_ROOT}/public/images"

echo "=== Hero video re-compression ==="
echo "Working dir: ${WORK}"
echo "Upload:      ${DO_UPLOAD}"
echo

for entry in "${ENTRIES[@]}"; do
  IFS='|' read -r bucket file tier <<< "${entry}"
  url="${BASE}/$(enc "${bucket}")/$(enc "${file}")"
  src="${ORIG}/${file}"
  dst="${OUT}/${file}"

  echo "--- ${bucket}/${file} (${tier}) ---"

  # 1. Download original
  echo "  downloading..."
  curl -fsSL -o "${src}" "${url}"
  before=$(wc -c < "${src}")

  # 2. Compress per tier. -an strips audio (all players are muted).
  #    +faststart moves the moov atom to the front for progressive playback.
  if [ "${tier}" = "hero" ]; then
    ffmpeg -y -loglevel error -i "${src}" -an \
      -vf "scale='min(1920,iw)':-2,fps=30" \
      -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 24 -preset slow \
      -movflags +faststart "${dst}"
  else
    ffmpeg -y -loglevel error -i "${src}" -an \
      -vf "scale='min(1280,iw)':-2,fps=30" \
      -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 28 -preset slow \
      -movflags +faststart "${dst}"
  fi
  after=$(wc -c < "${dst}")
  echo "  $(human "${before}")  ->  $(human "${after}")"

  # 3. Poster for the landing hero
  if [ "${tier}" = "hero" ]; then
    echo "  extracting poster -> ${POSTER_DEST}"
    ffmpeg -y -loglevel error -i "${src}" -ss 00:00:01 -frames:v 1 -q:v 2 "${POSTER_DEST}"
  fi

  # 4. Optional upload (overwrite same path, keep all code URLs valid)
  if [ "${DO_UPLOAD}" = "yes" ]; then
    up="${UPLOAD_BASE}/$(enc "${bucket}")/$(enc "${file}")"
    echo "  uploading (x-upsert)..."
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${up}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "x-upsert: true" \
      -H "Content-Type: video/mp4" \
      --data-binary "@${dst}")
    if [ "${code}" = "200" ] || [ "${code}" = "201" ]; then
      echo "  uploaded OK (${code})"
    else
      echo "  UPLOAD FAILED (HTTP ${code}) - upload ${dst} manually via the dashboard."
    fi
  fi
  echo
done

echo "=== Done ==="
echo "Compressed files: ${OUT}"
echo "Landing poster:   ${POSTER_DEST}  (commit it: git add public/images/hero-poster.jpg)"
if [ "${DO_UPLOAD}" != "yes" ]; then
  echo
  echo "Next: upload ${OUT}/* to Supabase Storage, replacing the same filenames"
  echo "in the same buckets. Then verify, e.g.:"
  echo "  curl -sI -r 0-1 \"${BASE}/Hero%20Videos/Mountain%20top.mp4\" | grep -i content-range"
fi
