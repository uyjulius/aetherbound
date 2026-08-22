"""Cleaning up what a mesh generator hands back.

Shared by the character rig and the prop pipeline, because the studio the subject was
photographed in comes back as geometry either way: `rig_character.py` found ten of fourteen
characters standing on a slab, and the well — the first asset this project ever generated —
has a 1.86-metre floor under it too.

Blender-only. Imported by scripts run as `blender -b --python`.
"""

from __future__ import annotations

import bpy


def _box(part):
    """A part's bounding box, as two corners."""
    xs = [v.co.x for v in part.data.vertices]
    ys = [v.co.y for v in part.data.vertices]
    zs = [v.co.z for v in part.data.vertices]
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))


def _bounds(parts, spans, biggest):
    """The box around the substantial geometry — the subject, once the flat stuff is set aside.

    Solid means *not flat compared to itself*: the thinnest span over the longest. Four
    definitions were tried and three of them are recorded here, because each was fooled by
    something that shares the property it tested.

    *Absolute thickness* — thicker than 2% of the model is geometry. The marble temple's shards
    are three centimetres against a one-metre model, so they cleared it, the box stretched to
    the whole reconstruction volume, and nothing could be outside it.

    *Area* — carrying 1% of the total surface is geometry. But the largest area in any of these
    files belongs to the studio backdrop; a two-metre sheet has more surface than a torso. A
    zombie's box stretched to its backdrop and it shipped four and a half metres wide.

    *Connectivity* — the largest part, plus everything touching it, repeated. The most
    principled of the four and the worst in practice, for the same reason as area: the seed it
    starts from is the biggest thing in the file, and on a character that is a wall of the
    studio. Corvin came out 272 metres across with three parts left.

    Relative flatness is what is left, and the numbers do not overlap: backdrop sheets on Corvin
    and the zombie run 0.001 to 0.020, while the temple's real parts — pediment, columns, steps
    — run 0.035 to 0.158 and the strips of backdrop around them run 0.004 to 0.014.

    It is not perfect, and the imperfection is worth naming: the temple's shards are chunky
    little bits rather than sheets, so they pass this test and rejoin the core they were meant
    to be measured against. That is a rule chasing a defect that should not exist — the
    reconstruction only invents this debris when it is handed a flat pale background, and it is
    handed an alpha cut-out now. This cut is a net for what gets through, not the fix.
    """
    solid = []
    for part in parts:
        span = sorted(spans[part.name])
        if span[2] > 0 and span[0] / span[2] >= 0.03:
            solid.append(part)
    if not solid:
        return None
    boxes = [_box(p) for p in solid]
    return (tuple(min(b[0][i] for b in boxes) for i in range(3)),
            tuple(max(b[1][i] for b in boxes) for i in range(3)))


def _gap(part, core):
    """How far a part sits from a box. Zero when they touch or overlap."""
    low, high = _box(part)
    total = 0.0
    for i in range(3):
        distance = max(core[0][i] - high[i], low[i] - core[1][i], 0.0)
        total += distance * distance
    return total ** 0.5


def _fills_the_volume(span, biggest):
    """Whether a flat part spans the whole reconstruction volume in both its large axes.

    This is what separates a studio backdrop from a building's wall, and it took two goes.

    The first tried to tell them apart by *paint*: a backdrop is one flat neutral grey, a brick
    wall is not. That worked on the models it was written for and then failed on the first one
    it had not seen — a zombie's floor plate measured saturation 0.040 against a brick wall's
    0.042, and its colour variance came out higher than the wall's, because a reconstructed
    plate's UVs wander across the whole texture atlas and sample the creature.

    Geometry says it without ambiguity. Hunyuan3D reconstructs into a cube, and the backdrop it
    invents *is* a face of that cube: the plates on Corvin and on both zombies measure 1.99 and
    1.98 against a 1.99 model, which is 100% and 99.5%. A real wall belongs to the object and
    stops where the object does — the magitek building's reach 87% and 79%, the brick building's
    80% and 80%, and the marble temple's roof is 100% in one axis but 69% in the other. Nothing
    real fills the box in both directions while being one percent thick.
    """
    large = sorted(span, reverse=True)[:2]
    return all(value > 0.95 * biggest for value in large)


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
        if (span[0] < 0.03 * biggest and span[1] > 0.35 * biggest
                and _fills_the_volume(spans[part.name], biggest)):
            # Remember where it was. Everything else the backdrop left behind is lying in this
            # same plane, and that is the only thing those fragments have in common: they are
            # every size, they are scattered across two metres, and there are twelve hundred of
            # them.
            flat = spans[part.name].index(span[0])
            axis = "xyz"[flat]
            values = [getattr(v.co, axis) for v in part.data.vertices]
            planes.append((flat, (max(values) + min(values)) / 2))
            drop(part, "sheet")
        # There used to be a second rule here, for *strips*: long in one axis and nothing in the
        # other two, which is the shape a backdrop's edges come back as. It was removed, because
        # it is also the shape of a fence rail. The generated fence shipped as four disconnected
        # posts — the reconstruction had produced perfectly good rails and this cut ate all
        # seven of them — and a rule that cannot tell the edge of a wall from the rail of a
        # fence is a rule that decides by luck which props survive.
        #
        # Nothing was lost by removing it. A backdrop edge lies *in* the backdrop, so the plane
        # test below already takes it; a fence rail lies in mid-air, so it does not.

    # Then everything else lying in that plane. A matted-out backdrop leaves a dust of fragments
    # behind: twelve hundred of them on Corvin, each too small to be a sheet, none of them
    # anywhere near the figure, and together they made the bounding box seven metres across —
    # which the rig then scaled the whole character against.
    #
    # Lying in the plane is *not* enough on its own, and the fence is why. A flat subject and the
    # backdrop invented behind it occupy the same plane, so a rule that drops everything thin and
    # coplanar drops the fence's rails along with the slabs between them: the prop shipped as four
    # disconnected posts, twice, once with a rule about strips and once without.
    #
    # What separates them is where the rest of the object is. Backdrop debris sits away from the
    # subject — the studio floor extends a metre past the figure standing on it, and its edges
    # bound the sheet rather than the figure. A rail runs between two posts and touches both. So
    # a thin coplanar part is dropped when it is *small* (dust is dust wherever it lies) or when
    # it is adrift from the solid core, and kept when it is joined to it.
    solid = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    core = _bounds(solid, spans, biggest)
    kept = list(solid)
    for flat, coordinate in planes:
        axis = "xyz"[flat]
        for part in list(kept):
            if part.name not in {o.name for o in bpy.context.scene.objects}:
                continue
            values = [getattr(v.co, axis) for v in part.data.vertices]
            thickness = max(values) - min(values)
            middle = (max(values) + min(values)) / 2
            if thickness >= 0.04 * biggest or abs(middle - coordinate) >= 0.08 * biggest:
                continue
            if max(spans[part.name]) < 0.12 * biggest:
                drop(part, "speck")
            elif core is not None and _gap(part, core) > 0.02 * biggest:
                drop(part, "debris")
        kept = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    # And anything small drifting on its own, plane or no plane. The marble temple came back
    # with three white shards of its own base lying a metre away from it — too small to be
    # sheets, in nobody's plane, and enough to double the width of the bounding box. Buildings
    # are scaled per axis to fill a footprint, so a stray does not merely float: it squashes
    # the building it is measured with.
    #
    # Distance is the whole test; size is not part of it. A first version spared anything longer
    # than a quarter of the object, on the theory that a sword or a fence rail might be adrift —
    # but a sword is in a hand and a rail is between two posts, and both measure a gap of zero.
    # What the exemption actually spared was the largest shard, which went on sitting beside the
    # temple like a dropped sheet of paper.
    core = _bounds([o for o in bpy.context.scene.objects if o.type == "MESH"], spans, biggest)
    if core is not None:
        for part in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
            if _gap(part, core) > 0.06 * biggest:
                drop(part, "stray")

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
