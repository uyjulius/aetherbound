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


def _base_colour_image(part):
    """The image feeding a part's base colour, or None."""
    for slot in part.material_slots:
        material = slot.material
        if material is None or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            link = node.inputs["Base Color"].links
            if link and link[0].from_node.type == "TEX_IMAGE":
                image = link[0].from_node.image
                if image and image.size[0] and image.size[1]:
                    return image
    return None


def _looks_like_studio(part, samples=400):
    """Whether a part is painted the flat neutral grey of a photographer's backdrop.

    The geometric test cannot tell a studio wall from a building's wall — both are large, flat
    and thin, and that is not a subtlety: it deleted the walls of two of the six building
    styles and left a roof floating over a doorway. What tells them apart is the paint. A
    backdrop is one neutral grey; brick, plaster and magitek panelling are neither uniform nor
    neutral.

    Measured on the meshes that prompted this. Corvin's studio sheets: mean saturation 0.015
    and 0.019, colour variance 0.0105 and 0.0109, mean RGB (0.5, 0.5, 0.49). The magitek
    building's walls: saturation 0.089 to 0.138, variance 0.016 to 0.059. The brick building's:
    saturation 0.042 to 0.216, variance 0.047 to 0.198. The line is drawn between them, on both
    numbers, because either alone leaves less room than it looks.

    Returns True when it cannot tell — no UVs, no texture — which is the old behaviour.
    """
    image = _base_colour_image(part)
    uv = part.data.uv_layers.active
    if image is None or uv is None or not len(part.data.loops):
        return True
    pixels = image.pixels[:]
    width, height = image.size
    step = max(1, len(part.data.loops) // samples)
    values = []
    for index in range(0, len(part.data.loops), step):
        u, v = uv.data[index].uv
        x = min(width - 1, max(0, int(u * width)))
        y = min(height - 1, max(0, int((1.0 - v) * height)))
        at = (y * width + x) * 4
        values.append(pixels[at:at + 3])
    if not values:
        return True
    mean = [sum(c[k] for c in values) / len(values) for k in range(3)]
    variance = sum(sum((c[k] - mean[k]) ** 2 for k in range(3)) for c in values) / len(values)
    saturation = sum(max(c) - min(c) for c in values) / len(values)
    return saturation < 0.03 and variance < 0.015


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
        if span[0] < 0.03 * biggest and span[1] > 0.35 * biggest and _looks_like_studio(part):
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
