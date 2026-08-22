#!/bin/zsh
# Generate every mesh whose concept view is newer than it, paced against the GPU allowance.
#
# ZeroGPU refuses a 270-second reservation in four seconds once the account's allowance is too
# low to cover it, and serves it again once the allowance has refilled. Measured, not assumed:
# three different Spaces refuse it identically within the same minute, while /shape_generation
# — 90 seconds, same Space, same token, same image — was served four times in three minutes.
# So a failure here is not a defect to skip past: the item goes back in the queue and the run
# waits. Nothing is substituted, and nothing is generated untextured to fill the gap, because a
# short call spends the very allowance the long one is waiting for.
#
# What is in the queue is decided by the clock, not by a list of what has been done. A mesh is
# wanted when there is no mesh, or when the view it was built from has been drawn again since —
# which is how the stall's plank roof and the bench's timber legs reach the world without
# anybody remembering to delete the old mesh first.
cd /Users/juliusuy/Documents/ff
G=$HOME/Documents/ff/.generation

while true; do
  node tools/generated-ids.mjs > $G/ids.txt 2>/dev/null || { /bin/sleep 300; continue; }
  wanted=0
  while read -r kind id; do
    raw=godot/assets/models/raw/$id.glb
    concept=assets/concepts/$id-front.png
    if [ "$kind" = "creature" ]; then
      shipped=assets/monsters/$id.glb
    else
      shipped=godot/assets/props/$id.glb
    fi
    [ -f $concept ] || continue
    [ -f $raw ] && [ $raw -nt $concept ] && continue
    # No reconstruction at all, but something already shipped: the well was generated before
    # there was a raw directory to keep reconstructions in, so the freshness test saw no mesh
    # and asked for 270 seconds of GPU to rebuild something already standing in the world.
    #
    # Only when there is no raw. Written the other way round — skip whenever the shipped file
    # is newer — it marks an item done the moment anything re-ships it, and re-shipping from an
    # *old* raw is exactly what happens when the cleanup improves. A shredded zombie sat at the
    # front of the queue all afternoon looking finished, because it had been re-cut that
    # morning from the reconstruction that shredded it.
    [ ! -f $raw ] && [ -f $shipped ] && [ $shipped -nt $concept ] && continue
    wanted=$((wanted+1))
    # Every round, and the exit code is respected. `isolate.mjs` refuses a view with a dark
    # band across an edge — the image model adds them unasked — because the fill cannot remove
    # one and the reconstruction would spend 270 seconds of GPU turning it into a slab.
    if ! node tools/isolate.mjs $id > $G/iso-$id.log 2>&1; then
      echo "  $id  bad view: $(grep -E 'along the|survives a stricter|suspect' $G/iso-$id.log | head -1 | cut -c1-90)"
      continue
    fi
    node tools/genmesh.mjs $id --textured --front-only > $G/mesh-$id.log 2>&1
    if [ -f $raw ] && [ $raw -nt $concept ]; then
      echo "  $id  $(ls -la $raw | awk '{printf "%.1fMB", $5/1048576}')  $(date +%H:%M)"
    elif grep -q "GPU quota exhausted" $G/mesh-$id.log; then
      echo "  $id  refused — the allowance is spent; waiting 10 minutes ($(date +%H:%M))"
      /bin/sleep 600
    else
      # Anything else — usually the Space itself being unreachable for a minute, which it is
      # several times an hour. Wait a little rather than sprinting through the whole queue
      # against a host that is not answering.
      echo "  $id  FAILED ($(date +%H:%M)): $(tail -1 $G/mesh-$id.log | cut -c1-110)"
      /bin/sleep 120
    fi
  done < $G/ids.txt
  if [ $wanted -eq 0 ]; then
    echo "=== every mesh is current ($(date +%H:%M))"
    /bin/sleep 600
  fi
done
