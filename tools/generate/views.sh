#!/bin/zsh
# The concept views that have to be drawn again, asked for until they are.
cd /Users/juliusuy/Documents/ff
S=/private/tmp/claude-501/-Users-juliusuy-Documents-ff/8888b88b-342b-454d-8e34-09aa0df8805e/scratchpad
QUEUE=(stall wall quadruped_husky plant_carnivoreplant floater_tentacle blob_slime2 blob_pinkslime blob_slimeenemy)
# The stall's canvas awning reconstructs as a crumpled sheet; its prompt now asks for a plank
# roof, so the view has to be drawn again — and it is a prop, so it is drawn with --world.
WORLD_QUEUE=(stall wall)
round=0
while [ ${#QUEUE[@]} -gt 0 ] && [ $round -lt 40 ]; do
  round=$((round+1))
  LEFT=()
  for id in $QUEUE; do
    if (($WORLD_QUEUE[(Ie)$id])); then
      node tools/genconcept.mjs $id --world --force > $S/con-$id.log 2>&1
    else
      node tools/genconcept.mjs $id --bestiary --force > $S/con-$id.log 2>&1
    fi
    if grep -q "made" $S/con-$id.log && node tools/isolate.mjs $id > $S/iso-$id.log 2>&1; then
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
