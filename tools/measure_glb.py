"""What a GLB's geometry actually occupies, in the shape the props manifest wants.

    python3 tools/measure_glb.py godot/assets/props/well.glb

`fetch-props.mjs` measures every model it downloads and writes `size`, `base` and `centre`
into the manifest, because `plan-scenery.mjs` places a prop by measuring it: the scale comes
from the footprint the maps declare divided by the model's own width, and the lift comes from
how far the model's base sits from its origin. A prop that arrives any other way — generated
here rather than downloaded — needs the same three numbers, and had none, so the planner threw
`object null is not iterable` and the well could not be placed at all.

Node transforms are applied, because a glTF's root often carries a scale: the mesh data can be
two centimetres across with a hundred-fold transform above it, and the number that matters is
the one the engine will see.
"""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

JSON_CHUNK = 0x4E4F534A


def chunks(raw: bytes) -> list[tuple[int, bytes]]:
    magic, _version, total = struct.unpack("<III", raw[:12])
    if magic != 0x46546C67:
        raise SystemExit("not a GLB (bad magic)")
    out = []
    off = 12
    while off < total:
        length, kind = struct.unpack("<II", raw[off:off + 8])
        out.append((kind, raw[off + 8:off + 8 + length]))
        off += 8 + length
    return out


def matrix_of(node: dict) -> list[list[float]]:
    if "matrix" in node:
        m = node["matrix"]
        return [[m[0], m[4], m[8], m[12]], [m[1], m[5], m[9], m[13]],
                [m[2], m[6], m[10], m[14]], [m[3], m[7], m[11], m[15]]]
    out = [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]
    scale = node.get("scale", [1, 1, 1])
    rotation = node.get("rotation", [0, 0, 0, 1])
    translation = node.get("translation", [0, 0, 0])
    x, y, z, w = rotation
    rot = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]
    for i in range(3):
        for j in range(3):
            out[i][j] = rot[i][j] * scale[j]
        out[i][3] = translation[i]
    return out


def multiply(a: list[list[float]], b: list[list[float]]) -> list[list[float]]:
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def apply(m: list[list[float]], point: tuple[float, float, float]) -> tuple[float, float, float]:
    x, y, z = point
    return tuple(m[i][0] * x + m[i][1] * y + m[i][2] * z + m[i][3] for i in range(3))


def measure(path: Path) -> dict:
    gltf = json.loads(next(p for k, p in chunks(path.read_bytes()) if k == JSON_CHUNK))
    lo = [float("inf")] * 3
    hi = [float("-inf")] * 3

    identity = [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]

    def walk(index: int, parent: list[list[float]]) -> None:
        node = gltf["nodes"][index]
        world = multiply(parent, matrix_of(node))
        if "mesh" in node:
            for primitive in gltf["meshes"][node["mesh"]].get("primitives", []):
                accessor = gltf["accessors"][primitive["attributes"]["POSITION"]]
                mn, mx = accessor["min"], accessor["max"]
                # Every corner of the box, because a rotation turns a box into a box with
                # different bounds and taking two corners would under-report it.
                for cx in (mn[0], mx[0]):
                    for cy in (mn[1], mx[1]):
                        for cz in (mn[2], mx[2]):
                            for axis, value in enumerate(apply(world, (cx, cy, cz))):
                                lo[axis] = min(lo[axis], value)
                                hi[axis] = max(hi[axis], value)
        for child in node.get("children", []):
            walk(child, world)

    scene = gltf.get("scenes", [{}])[gltf.get("scene", 0)]
    for root in scene.get("nodes", []):
        walk(root, identity)

    return {
        "size": [round(hi[i] - lo[i], 4) for i in range(3)],
        "base": round(lo[1], 4),
        "centre": [round((lo[0] + hi[0]) / 2, 4), round((lo[2] + hi[2]) / 2, 4)],
        "meshes": len(gltf.get("meshes", [])),
        "materials": len(gltf.get("materials", [])),
        "textures": len(gltf.get("textures", [])),
    }


def main() -> int:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    for arg in sys.argv[1:]:
        print(json.dumps({Path(arg).name: measure(Path(arg))}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
