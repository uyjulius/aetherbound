#!/bin/zsh
# The concept views that have to be drawn again, asked for until they are.
#
# `--attempt $round` matters. The seed comes from the id, so a view redrawn with the same
# prompt is the same picture — the three views that arrived with a watermark band across them
# came back with the identical band, three times, until the seed was allowed to move.
cd /Users/juliusuy/Documents/ff
G=$HOME/Documents/ff/.generation
QUEUE=(blob_slime2)
# The stall's canvas awning reconstructs as a crumpled sheet; its prompt now asks for a plank
# roof, so the view has to be drawn again — and it is a prop, so it is drawn with --world.
WORLD_QUEUE=()
round=0
while [ ${#QUEUE[@]} -gt 0 ] && [ $round -lt 40 ]; do
  round=$((round+1))
  LEFT=()
  for id in $QUEUE; do
    if (($WORLD_QUEUE[(Ie)$id])); then
      node tools/genconcept.mjs $id --world --force --attempt $round > $G/con-$id.log 2>&1
    else
      node tools/genconcept.mjs $id --bestiary --force --attempt $round > $G/con-$id.log 2>&1
    fi
    if grep -q "made" $G/con-$id.log && node tools/isolate.mjs $id > $G/iso-$id.log 2>&1; then
      echo "  $id  drawn and matted ($(date +%H:%M))"
    else
      LEFT+=($id)
    fi
  done
  QUEUE=($LEFT)
  if [ ${#QUEUE[@]} -gt 0 ]; then
    echo "--- ${#QUEUE[@]} views still to draw ($(date +%H:%M)): $QUEUE"
    /bin/sleep 420
  fi
done
echo "=== concepts done, ${#QUEUE[@]} never drawn: $QUEUE"
