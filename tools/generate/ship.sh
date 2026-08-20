#!/bin/zsh
# Ship whatever the generator has finished, as it finishes.
#
# The meshes arrive in a trickle over days, one every time the GPU allowance covers a
# 270-second reservation. Each one still needs the same six steps — relabel its textures, cut
# the studio out, decimate, rig or measure, shrink, and say where it came from — and doing that
# by hand means the queue only advances while somebody is watching it.
#
# What is a prop and what is a creature comes from `tools/generated-ids.mjs`, not from the
# directory listing. The first version of this loop read `raw/` and shipped everything in it:
# all fourteen characters and a handful of shape-only spikes went through the prop pipeline and
# into the scenery manifest as furniture. The raw directory is a workspace, not a catalogue.
cd /Users/juliusuy/Documents/ff
G=$HOME/Documents/ff/.generation
BLENDER=/Applications/Blender.app/Contents/MacOS/Blender

while true; do
  shipped=0
  node tools/generated-ids.mjs > $G/ids.txt 2>/dev/null || { /bin/sleep 300; continue; }
  while read -r kind id; do
    raw=godot/assets/models/raw/$id.glb
    [ -f $raw ] || continue
    plan=${id%%_*}
    if [ "$kind" = "creature" ]; then
      out=assets/monsters/$id.glb
      [ -f $out ] && [ $out -nt $raw ] && continue
      python3 tools/fix_glb.py $raw > $G/ship-$id.log 2>&1
      $BLENDER -b -noaudio --python tools/blender/rig_creature.py -- \
        --raw $raw --out $out --plan $plan --height 1.6 --faces 4000 >> $G/ship-$id.log 2>&1
      if [ -f $out ]; then
        python3 tools/shrink_glb.py $out --max 1024 >> $G/ship-$id.log 2>&1
        echo "$(date +%H:%M) creature $id $(ls -la $out | awk '{printf "%.2fMB", $5/1048576}')"
        shipped=1
      else
        echo "$(date +%H:%M) creature $id FAILED: $(grep -E 'Error|SystemExit' $G/ship-$id.log | tail -1 | cut -c1-90)"
      fi
    else
      out=godot/assets/props/$id.glb
      [ -f $out ] && [ $out -nt $raw ] && continue
      python3 tools/fix_glb.py $raw > $G/ship-$id.log 2>&1
      $BLENDER -b -noaudio --python tools/blender/prop_shipping.py -- \
        --raw $raw --out $out --faces 3000 >> $G/ship-$id.log 2>&1
      if [ -f $out ]; then
        python3 tools/shrink_glb.py $out --max 1024 >> $G/ship-$id.log 2>&1
        node tools/mark-generated.mjs $id >> $G/ship-$id.log 2>&1
        echo "$(date +%H:%M) prop $id $(ls -la $out | awk '{printf "%.2fMB", $5/1048576}')"
        shipped=1
      else
        echo "$(date +%H:%M) prop $id FAILED: $(grep -E 'Error|SystemExit' $G/ship-$id.log | tail -1 | cut -c1-90)"
      fi
    fi
  done < $G/ids.txt
  if [ $shipped -eq 1 ]; then
    # Placements come from the models' own measurements, so they are re-planned every time one
    # changes shape — and the models are synced into the port, where the checks read them.
    npm run scenery >> $G/ship-scenery.log 2>&1 && echo "$(date +%H:%M) scenery re-planned"
    npm run sync:models >> $G/ship-scenery.log 2>&1 && echo "$(date +%H:%M) models synced"
  fi
  /bin/sleep 300
done
