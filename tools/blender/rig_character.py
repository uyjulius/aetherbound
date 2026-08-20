"""Turn a generated humanoid mesh into a rigged, animated GLB for Godot.

    blender -b -noaudio --python tools/blender/rig_character.py -- \
        --raw godot/assets/models/raw/vesna.glb \
        --out godot/assets/models/vesna.glb \
        --height 1.66 --faces 12000

The rigging machinery comes from the Kingdom Hearts project — it measures the
mesh to place bones instead of assuming proportions, and it weights by
proximity because Blender's automatic (heat) weighting *reports success* on
marching-cubes meshes while producing zero weighted vertices. That failure is
the reason this script exists as a checked pipeline rather than a manual step:
the export still carries JOINTS_0 and WEIGHTS_0, so it looks fine, and the
character renders in its rest pose forever.

What is Aetherbound's own is the clip vocabulary (see clips.py) and the
verification at the end, which refuses to write a GLB that would load as a
statue.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector

FF = Path(__file__).resolve().parent.parent.parent
KH_TOOLS = Path.home() / "Documents" / "kingdom-hearts" / "tools"
sys.path.insert(0, str(KH_TOOLS))
sys.path.insert(0, str(FF / "tools" / "blender"))

from blender import rigging            # noqa: E402  (KH's rigger)
import clips as ab_clips               # noqa: E402  (Aetherbound's verbs)


def argv_after_ddash() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--height", type=float, default=1.66)
    ap.add_argument("--faces", type=int, default=12000)
    return ap.parse_args(argv_after_ddash())


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_mesh(path: str):
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit(f"no mesh in {path}")
    # Hunyuan3D returns a single surface; join anything else so the rig binds
    # one object rather than silently skinning only the first.
    bpy.ops.object.select_all(action="DESELECT")
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


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


def orient_and_scale(obj, height: float) -> None:
    """glTF is Y-up; the rigger works in Z-up. Normalise both axis and size."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    lo = Vector((min(v.co.x for v in obj.data.vertices),
                 min(v.co.y for v in obj.data.vertices),
                 min(v.co.z for v in obj.data.vertices)))
    hi = Vector((max(v.co.x for v in obj.data.vertices),
                 max(v.co.y for v in obj.data.vertices),
                 max(v.co.z for v in obj.data.vertices)))
    size = hi - lo

    # The tallest axis of a standing figure is its height, whichever axis the
    # exporter chose to call up. Rotating on a guess is how a character ends up
    # rigged lying down with its arms as legs.
    up_axis = max(range(3), key=lambda i: size[i])
    if up_axis == 1:                       # Y-up -> Z-up
        obj.rotation_euler = (1.5707963, 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
    elif up_axis == 0:                     # X-up, unusual but seen
        obj.rotation_euler = (0, 0, 1.5707963)
        bpy.ops.object.transform_apply(rotation=True)

    lo_z = min(v.co.z for v in obj.data.vertices)
    hi_z = max(v.co.z for v in obj.data.vertices)
    current = hi_z - lo_z
    if current <= 0:
        raise SystemExit("mesh has no height after orientation")
    obj.scale = (height / current,) * 3
    bpy.ops.object.transform_apply(scale=True)

    # Feet on the floor and centred, so the rig's root sits where Godot expects.
    lo_z = min(v.co.z for v in obj.data.vertices)
    cx = (max(v.co.x for v in obj.data.vertices)
          + min(v.co.x for v in obj.data.vertices)) * 0.5
    cy = (max(v.co.y for v in obj.data.vertices)
          + min(v.co.y for v in obj.data.vertices)) * 0.5
    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= lo_z


def decimate(obj, faces: int) -> None:
    """Generated meshes arrive dense and uniform; games want fewer, better."""
    current = len(obj.data.polygons)
    if current <= faces:
        return
    mod = obj.modifiers.new("decimate", "DECIMATE")
    mod.ratio = faces / current
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def pack_textures() -> None:
    """glTF export emits sibling PNGs unless images are packed, and the GLB then
    breaks the moment those files are cleaned up."""
    for image in bpy.data.images:
        if image.source == "FILE" and not image.packed_file:
            try:
                image.pack()
            except RuntimeError:
                pass


def verify_skin(obj, rig) -> tuple[int, int]:
    """Count vertices that actually carry weight.

    This is the check that matters. A mesh can be parented to an armature, get
    vertex groups, export JOINTS_0/WEIGHTS_0 and still have every weight at
    zero — which is exactly what heat weighting does here. The symptom is a
    character that never moves, and it is invisible until someone plays the
    game.
    """
    group_index = {g.index for g in obj.vertex_groups
                   if g.name in {b.name for b in rig.data.bones}}
    weighted = 0
    for v in obj.data.vertices:
        if any(g.group in group_index and g.weight > 0.0 for g in v.groups):
            weighted += 1
    return weighted, len(obj.data.vertices)


def main() -> int:
    args = parse_args()
    clear_scene()

    obj = import_mesh(args.raw)
    obj = cut_backdrop(obj)
    orient_and_scale(obj, args.height)
    decimate(obj, args.faces)

    rig = rigging.build_humanoid_rig(obj, name="rig")
    weighted, total = verify_skin(obj, rig)
    print(f"[rig] {weighted}/{total} vertices weighted")
    if weighted == 0:
        raise SystemExit(
            "no vertex carries any weight — the mesh would export as a statue. "
            "This is the heat-weighting failure; proximity weighting should "
            "have caught it.")

    made = rigging.author_animations(rig, clips=ab_clips.CLIPS)
    print(f"[rig] {len(made)} clips: " + ", ".join(name for name, _loop, _end in made))

    missing = {"idle", "walk", "battleIdle", "attack", "cast", "hurt", "dead", "victory"} \
        - {name for name, _l, _e in made}
    if missing:
        raise SystemExit(f"clips the game asks for by name are missing: {sorted(missing)}")

    pack_textures()

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_bake_animation=True,
        # Keep tracks whose value never changes.
        #
        # Blender's exporter drops a channel that holds one value for the whole clip, on the
        # reasonable-sounding grounds that it carries no animation. What such a channel carries
        # is a *pose*, and a bone with no track sits wherever the rest pose put it — which for
        # these meshes is a T-pose. None of the eight clips here holds a bone perfectly still,
        # so nothing is lost today; this is a guard against the clip that eventually does.
        export_optimize_animation_size=False,
        export_skins=True,
        export_yup=True,
        use_selection=True,
    )
    print(f"[rig] wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
