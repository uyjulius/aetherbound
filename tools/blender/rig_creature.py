"""Turn a generated creature into a rigged, animated GLB for the bestiary.

    blender -b -noaudio --python tools/blender/rig_creature.py -- \
        --raw godot/assets/models/raw/quadruped_wolf.glb \
        --out godot/assets/monsters/quadruped_wolf.glb \
        --plan quadruped --height 1.4 --faces 4000

The character pipeline is the same idea and cannot be reused whole: `rig_character.py` fits a
humanoid skeleton by measuring for a shoulder line, and a wolf has no shoulders where that
looks. `creature_rig.py` picks one of four skeletons from the body plan the bestiary already
sorts every species into, and `creature_clips.py` authors what each of those four can do.

Orientation is *not* guessed here, and that is the one real difference from the character
script. That one rotates the mesh so its tallest axis points up, which is right for a standing
figure and wrong for a wolf — the tallest axis of a wolf is its length, and the rig would come
back fitted to an animal lying on its nose. What comes off the Space is Z-up; the exporter
turns it Y-up on the way out. So this scales and stands the creature on the floor, and leaves
the axes alone.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector

FF = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(Path.home() / "Documents" / "kingdom-hearts" / "tools"))
sys.path.insert(0, str(FF / "tools" / "blender"))

from blender import rigging              # noqa: E402  (KH's rigger)
import clips as cast_clips               # noqa: E402  (the cast's eight, for bipeds)
import creature_clips                    # noqa: E402
import creature_rig                      # noqa: E402
from cleanup import cut_backdrop         # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--height", type=float, default=1.6)
    parser.add_argument("--faces", type=int, default=4000)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def stand(obj, height: float) -> None:
    """Scale to height, stand on the floor, centre on the origin. No rotation: see above."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    current = (max(v.co.z for v in obj.data.vertices)
               - min(v.co.z for v in obj.data.vertices))
    if current <= 0:
        raise SystemExit("mesh has no height")
    obj.scale = (height / current,) * 3
    bpy.ops.object.transform_apply(scale=True)

    lo_z = min(v.co.z for v in obj.data.vertices)
    cx = (max(v.co.x for v in obj.data.vertices) + min(v.co.x for v in obj.data.vertices)) * 0.5
    cy = (max(v.co.y for v in obj.data.vertices) + min(v.co.y for v in obj.data.vertices)) * 0.5
    obj.location = Vector((-cx, -cy, -lo_z))
    bpy.ops.object.transform_apply(location=True)


def decimate(obj, faces: int) -> None:
    have = len(obj.data.polygons)
    if have <= faces:
        return
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("decimate", "DECIMATE")
    modifier.ratio = faces / have
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    print(f"[creature] {have} faces -> {len(obj.data.polygons)}")


def verify(obj, rig) -> tuple[int, int]:
    """How many vertices actually carry weight. Zero is a statue that exports cleanly."""
    groups = {g.index for g in obj.vertex_groups if g.name in rig.data.bones}
    weighted = sum(1 for v in obj.data.vertices
                   if any(g.group in groups and g.weight > 0.0 for g in v.groups))
    return weighted, len(obj.data.vertices)


def main() -> int:
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=args.raw)

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit(f"no mesh in {args.raw}")
    bpy.ops.object.select_all(action="DESELECT")
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()

    obj = cut_backdrop(bpy.context.view_layer.objects.active)
    stand(obj, args.height)
    decimate(obj, args.faces)

    rig, shape = creature_rig.build(obj, args.plan)
    weighted, total = verify(obj, rig)
    print(f"[creature] {shape} rig, {weighted}/{total} vertices weighted")
    if weighted == 0:
        raise SystemExit("no vertex carries any weight — this would ship as a statue")

    clips = cast_clips.CLIPS if shape == "biped" else creature_clips.BY_SHAPE[shape]
    made = rigging.author_animations(rig, clips=clips)
    names = [name for name, _loop, _end in made]
    print(f"[creature] {len(names)} clips: {', '.join(names)}")
    # `idle` is the one every fallback ends at. Without it the creature stands still whatever
    # the fight asks for, and the bestiary's fallback chain has nowhere to land.
    if "idle" not in names:
        raise SystemExit("no idle clip — every other clip falls back to it")

    for image in bpy.data.images:
        if image.packed_file is None and image.source == "FILE":
            try:
                image.pack()
            except RuntimeError:
                pass

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_bake_animation=True,
        export_optimize_animation_size=False,
        export_skins=True,
        export_yup=True,
        use_selection=True,
    )
    print(f"[creature] wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
