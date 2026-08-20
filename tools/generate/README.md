# The generation queues

Three loops that turn the world into this project's own work, paced against Hugging Face's
GPU allowance. They are here rather than in a scratch directory because the pacing is a set of
decisions, and one of them was wrong in a way worth remembering.

    nohup zsh tools/generate/views.sh  > .generation/views.log  2>&1 &
    nohup zsh tools/generate/meshes.sh > .generation/meshes.log 2>&1 &
    nohup zsh tools/generate/ship.sh   > .generation/ship.log   2>&1 &

`views.sh` redraws concept views that came back unusable — a dark band across an edge, a
display pedestal, a salamander where the roster says slime. `meshes.sh` reconstructs a mesh for
every view that has one and is newer than it. `ship.sh` cleans, rigs, decimates and credits
whatever the other two have finished.

**They queue by freshness, not by a list of what is left.** The first version kept a list and
called an item done when the mesh file existed — so when the stall's view was redrawn and its
reconstruction was refused for want of GPU, the loop found yesterday's mesh on disk and
reported "stall 4.9MB" in green. A queue that cannot tell "already done" from "done before the
question changed" will confidently skip the work it exists to do.

Logs go to `.generation/`, which is not in the repository.
