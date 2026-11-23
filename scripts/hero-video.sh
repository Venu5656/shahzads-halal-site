#!/usr/bin/env bash
#
# Builds the homepage hero's background loop from camera-original footage.
#
#   scripts/hero-video.sh "shahzad chicken platter .mov"
#
# Writes public/video/flat-top.mp4 and public/video/flat-top-poster.webp.
#
# The source is not in this repository — it is 92 MB of 4K vertical video, and
# nothing reads it at build or run time. This script is how the 1 MB file that
# IS committed came to exist, so that swapping the hero for different footage
# is a command rather than an afternoon of remembering what was done.
#
# Needs ffmpeg and cwebp (brew install ffmpeg webp).
set -euo pipefail

SRC="${1:?usage: scripts/hero-video.sh <source-video>}"
OUT="public/video"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- 1. the shot -----------------------------------------------------------
# START/LEN pick one continuous take. Find the cuts in a new source with:
#   ffmpeg -i "$SRC" -filter_complex "select='gt(scene,0.2)',metadata=print" \
#     -an -f null - 2>&1 | grep pts_time
# and choose the longest gap between them. A background loop must not contain
# a cut: a hard change every few seconds in the corner of somebody's eye is
# what makes this kind of thing look cheap.
START=2.2
LEN=8          # one second longer than the loop, to pay for the crossfade
LOOP=7

# --- 2. the frame ----------------------------------------------------------
# The source is 2160x3840 (vertical). CROP takes a 16:9 band centred on the
# food; the page then letterboxes that with object-fit: cover. Cropping here
# rather than in CSS means we are not shipping thousands of pixels of ceiling.
CROP="crop=2160:1215:0:1500"

# The grade, baked in. Up a little and a touch richer, which is the opposite
# of where this started: the first version took the brightness DOWN on the
# theory that a heavy scrim was going over it anyway, and the two compounded
# into a hero nobody could make out. Mean luma was 82 of 255 before the scrim
# and about 29 after it on a phone. It is 108 now, and the scrim came down to
# match — see .kuro-hero-scrim in src/app/kuro.css, which is the other half of
# this and has to move with it.
#
# Override to try another: GRADE="eq=brightness=0.1" scripts/hero-video.sh ...
GRADE="${GRADE:-eq=brightness=0.06:saturation=1.08:contrast=1.06}"

ffmpeg -v error -ss "$START" -t "$LEN" -i "$SRC" -an \
  -vf "$CROP,scale=1280:720:flags=lanczos" \
  -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -y "$TMP/seg.mp4"

# --- 3. the loop -----------------------------------------------------------
# Crossfade the last second back into the first, so the end of the loop IS its
# beginning and the join is invisible. Output is LOOP seconds from LEN of
# source: frames [1, LEN] with [0, 1] faded in over the final second.
ffmpeg -v error -i "$TMP/seg.mp4" -filter_complex \
  "[0:v]split[a][b];\
   [a]trim=start=1:end=$LEN,setpts=PTS-STARTPTS[main];\
   [b]trim=start=0:end=1,setpts=PTS-STARTPTS[pre];\
   [main][pre]xfade=transition=fade:duration=1:offset=$((LOOP - 1))[v]" \
  -map "[v]" -an -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p \
  -y "$TMP/loop.mp4"

# --- 4. delivery -----------------------------------------------------------
# CRF 32 rather than something kinder: at 1:1 against CRF 26 the difference is
# invisible once the scrim is over it, and it is a third of the bytes. No WebM
# — VP9 came out LARGER than this on steam-heavy footage, so it would have
# been a second file to serve for nothing.
mkdir -p "$OUT"
ffmpeg -v error -i "$TMP/loop.mp4" -an -vf "$GRADE" \
  -c:v libx264 -crf 32 -preset veryslow -profile:v main -pix_fmt yuv420p \
  -movflags +faststart -g 60 -y "$OUT/flat-top.mp4"

# The poster is frame one, which is also the last frame, so the still and the
# loop's join agree. It paints before any script runs and is all that anybody
# on reduced motion or Save Data ever sees.
ffmpeg -v error -i "$OUT/flat-top.mp4" -frames:v 1 -y "$TMP/poster.png"
cwebp -quiet -q 72 "$TMP/poster.png" -o "$OUT/flat-top-poster.webp"

# Sizes in bytes, not `du` — that reports blocks allocated on disk, which on
# APFS rounds an 82 KB file up to 144 KB and makes it look as though something
# went wrong when nothing did.
for f in "$OUT/flat-top.mp4" "$OUT/flat-top-poster.webp"; do
  printf '%8s KB  %s\n' "$(( $(wc -c < "$f") / 1024 ))" "$f"
done
