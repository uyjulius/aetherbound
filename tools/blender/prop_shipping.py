"""Turn a generated prop into one a village can afford.

    blender -b -noaudio --python tools/blender/prop_shipping.py -- \
        --raw godot/assets/models/well.glb \
        --out godot/assets/props/well.glb --faces 3000

The character pipeline has had this step since the cast was rigged; the two props this
project generated first — a well and a hanging lantern — never got one, and so never got
used. They came off the Space at forty thousand triangles with two-thousand-pixel maps and a
metre of studio floor underneath, which is a fine thing to look at in isolation and not a
thing to place forty of in a town.

So: cut the studio out (`cleanup.cut_backdrop`, shared with the rig), decimate, pack the
textures into the file so a prop is one file the way the pack's props are, and write it where
the scenery loads kits from. Texture *size* is `tools/shrink_glb.py`'s job afterwards, for the
same reason it is there for the cast: it needs an image decoder and Blender is not one.

No rig, no clips — a well does not act.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))

from cleanup import cut_backdrop          # noqa: E402


def argv_after_ddash() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--faces", type=int, default=3000)
    parser.add_argument("--lay-flat", action="store_true",
                        help="turn a slab so its thinnest axis points up")
    return parser.parse_args(argv_after_ddash())


def lay_flat(obj) -> bool:
    """Turn a slab so the thin way is up.

    The reconstruction follows the orientation of the view it was given, and the paving-slab
    concept is drawn from above at an angle — so the slab came back standing on its edge: two
    metres wide, two metres *tall*, and twenty-two centimetres thick. As a floor tile, laid
    hundreds of times across the world, that is a wall.

    The mesh is rewritten rather than rotated through an operator. `transform_apply` reported
    success here and changed nothing — the object was selected and active and the span was
    identical before and after — and a rotation that silently does not happen is worse than one
    that fails, because the export still looks like a slab in the log.

    Only for props declared flat, and it does nothing when they already are. A rule that
    guessed which props are slabs would eventually decide a signpost is one.
    """
    span = [max(getattr(v.co, a) for v in obj.data.vertices)
            - min(getattr(v.co, a) for v in obj.data.vertices) for a in "xyz"]
    thinnest = span.index(min(span))
    # Blender is Z-up here and the exporter turns it Y-up, so "flat" means thin along Blender Z.
    if thinnest == 2:
        return False
    for vertex in obj.data.vertices:
        x, y, z = vertex.co
        vertex.co = (x, z, y) if thinnest == 1 else (z, y, x)
    obj.data.update()
    after = [max(getattr(v.co, a) for v in obj.data.vertices)
             - min(getattr(v.co, a) for v in obj.data.vertices) for a in "xyz"]
    if after.index(min(after)) != 2:
        raise SystemExit(f"lay-flat did nothing: {span} -> {after}")
    print(f"[prop] laid flat: {tuple(round(v, 2) for v in span)} -> "
          f"{tuple(round(v, 2) for v in after)}")
    return True


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
    if args.lay_flat:
        lay_flat(obj)

    faces = len(obj.data.polygons)
    if faces > args.faces:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new("decimate", "DECIMATE")
        modifier.ratio = args.faces / faces
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    print(f"[prop] {faces} faces -> {len(obj.data.polygons)}")

    # Sitting on the floor and centred on its own footprint, because the placement plan measures
    # the model to decide where to put it and an offset origin becomes a prop half in the wall.
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    for image in bpy.data.images:
        if image.packed_file is None and image.source == "FILE":
            try:
                image.pack()
            except RuntimeError:
                pass

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        export_animations=False,
        export_skins=False,
        export_yup=True,
        use_selection=True,
    )
    print(f"[prop] wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
