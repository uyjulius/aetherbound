"""Cleaning up what a mesh generator hands back.

Shared by the character rig and the prop pipeline, because the studio the subject was
photographed in comes back as geometry either way: `rig_character.py` found ten of fourteen
characters standing on a slab, and the well — the first asset this project ever generated —
has a 1.86-metre floor under it too.

Blender-only. Imported by scripts run as `blender -b --python`.
"""

from __future__ import annotations

import bpy


def cut_backdrop(obj):
    """Delete the studio the character was photographed in.

    The reconstruction turns anything that reads as solid into geometry, and a concept view
    has a backdrop and a floor whether or not the prompt asked for one. `isolate.mjs` floods
    the background to white before the upload and that removes most of it; what survives is a
    soft gradient or a shadow the flood stopped at, and it comes back as a sheet — two metres
    square and two centimetres thick, lying through the figure's shins.

    Ten of the first fourteen characters came out with one, and it is unmissable in game and
    invisible in every check that only asks whether the rig deforms. So the mesh is split into
    its loose parts and anything shaped like a sheet is dropped: flat in one axis, wide in the
    other two. A character has no part like that — fingers, straps and boot buckles are small
    in every direction, and a cape is thin but not two metres across.
    """
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")

    parts = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if len(parts) < 2:
        return obj
    spans = {}
    for part in parts:
        xs = [v.co.x for v in part.data.vertices]
        ys = [v.co.y for v in part.data.vertices]
        zs = [v.co.z for v in part.data.vertices]
        spans[part.name] = (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
    biggest = max(max(span) for span in spans.values())

    dropped = []

    def drop(part, why):
        dropped.append((why, spans[part.name]))
        bpy.data.objects.remove(part, do_unlink=True)

    planes = []
    for part in list(parts):
        span = sorted(spans[part.name])
        # A sheet: flat, and wide in the two axes it is not flat in. Both halves matter — "flat"
        # alone would take a cape, "wide" alone would take the whole body.
        if span[0] < 0.03 * biggest and span[1] > 0.35 * biggest:
            # Remember where it was. Everything else the backdrop left behind is lying in this
            # same plane, and that is the only thing those fragments have in common: they are
            # every size, they are scattered across two metres, and there are twelve hundred of
            # them.
            flat = spans[part.name].index(span[0])
            axis = "xyz"[flat]
            values = [getattr(v.co, axis) for v in part.data.vertices]
            planes.append((flat, (max(values) + min(values)) / 2))
            drop(part, "sheet")
        # A strip: long in one axis and nothing in the other two. These are the *edges* of the
        # backdrop, and dropping the sheet without them leaves a two-metre wire frame around the
        # character — which is why Corvin still measured seven metres across after the first
        # version of this cut removed both walls.
        elif span[2] > 0.35 * biggest and span[1] < 0.03 * biggest:
            drop(part, "strip")

    # Then everything else lying in that plane. A matted-out backdrop leaves a dust of fragments
    # behind: twelve hundred of them on Corvin, each too small to be a sheet or a strip, none of
    # them anywhere near the figure, and together they made the bounding box seven metres across
    # — which the rig then scaled the whole character against.
    #
    # What they share is the plane. A part flat enough to lie *in* the floor is not part of a
    # person: a boot rests on the floor but stands up out of it, and a cape is thin in one axis
    # and long in another. So the test is thinness *and* proximity to a plane a sheet was found
    # in, which is why nothing is dropped at all when there was no backdrop to begin with.
    kept = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for flat, coordinate in planes:
        axis = "xyz"[flat]
        for part in list(kept):
            if part.name not in {o.name for o in bpy.context.scene.objects}:
                continue
            values = [getattr(v.co, axis) for v in part.data.vertices]
            thickness = max(values) - min(values)
            middle = (max(values) + min(values)) / 2
            if thickness < 0.04 * biggest and abs(middle - coordinate) < 0.08 * biggest:
                drop(part, "speck")
        kept = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    kept = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not kept:
        raise SystemExit("every part looked like a backdrop — nothing left to rig")

    bpy.ops.object.select_all(action="DESELECT")
    for part in kept:
        part.select_set(True)
    bpy.context.view_layer.objects.active = kept[0]
    if len(kept) > 1:
        bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    tally = {}
    for why, _span in dropped:
        tally[why] = tally.get(why, 0) + 1
    if tally:
        print("[rig] backdrop removed: "
              + ", ".join(f"{count} {why}(s)" for why, count in sorted(tally.items())))
    print(f"[rig] {len(dropped)} part(s) removed, {len(kept)} kept")
    return joined
