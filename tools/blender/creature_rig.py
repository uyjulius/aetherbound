"""Rigs for the things that are not people.

The cast arrives in a T-pose and `rigging.build_humanoid_rig` fits a skeleton by measuring
it. A wolf, a slime and a manta ray do not have shoulders, and measuring one for a shoulder
line puts the bone through its ribs.

So: four shapes, chosen by the body plan the bestiary already sorts creatures into. Every one
of them is fitted to the mesh rather than assumed — the same discipline as the humanoid rig,
for the same reason, which is that these meshes are generated and no two of them are the same
size or proportion.

    biped     humanoid, undead, construct   the humanoid rig, unchanged
    quadruped quadruped, insect             a spine along the body and a leg at each corner
    winged    avian, floater                a spine and a wing to each side
    stalk     plant, blob                   a spine from the base to the top, and nothing else

What every shape has in common is a `root` at the floor and a `body` chain, so one set of
clips can drive all four: see `creature_clips.py`.
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path.home() / "Documents" / "kingdom-hearts" / "tools"))

from blender import rigging            # noqa: E402  (KH's rigger and its weighting)

SHAPES = {
    "humanoid": "biped", "undead": "biped", "construct": "biped",
    "quadruped": "quadruped", "insect": "quadruped",
    "avian": "winged", "floater": "winged",
    "plant": "stalk", "blob": "stalk",
}


def _bbox(obj):
    lo = Vector((min(v.co.x for v in obj.data.vertices),
                 min(v.co.y for v in obj.data.vertices),
                 min(v.co.z for v in obj.data.vertices)))
    hi = Vector((max(v.co.x for v in obj.data.vertices),
                 max(v.co.y for v in obj.data.vertices),
                 max(v.co.z for v in obj.data.vertices)))
    return lo, hi


def _armature(obj, spec, name="rig"):
    """Build the armature from `(name, head, tail, parent)` and bind by proximity.

    Blender's automatic weighting reports success on marching-cubes geometry while producing
    zero weighted vertices, which exports as a mesh with skinning attributes and no skin — the
    same trap the character rig documents. Bind by name, then weight by distance.
    """
    data = bpy.data.armatures.new(name)
    rig = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    made = {}
    for bone_name, head, tail, parent in spec:
        bone = data.edit_bones.new(bone_name)
        bone.head = head
        bone.tail = tail
        if (bone.tail - bone.head).length < 1e-5:
            bone.tail = bone.head + Vector((0, 0, 0.02))
        if parent:
            bone.parent = made[parent]
            bone.use_connect = False
        made[bone_name] = bone
    bpy.ops.object.mode_set(mode="OBJECT")

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_NAME")
    rigging.assign_proximity_weights(obj, rig)
    return rig


def _quadruped(obj):
    """A spine down the length of the animal and a leg under each corner.

    The long axis is measured, not assumed: a wolf generated from a three-quarter view can come
    back facing any way, and a spine laid along the wrong axis animates a creature that folds
    sideways.
    """
    lo, hi = _bbox(obj)
    size = hi - lo
    length_axis = 0 if size.x >= size.y else 1
    width_axis = 1 - length_axis
    length = size[length_axis]
    width = size[width_axis]
    height = size.z
    mid = (hi + lo) * 0.5

    def P(along, across, up):
        """A point in the animal's own frame: along its length, across its width, up."""
        point = [0.0, 0.0, 0.0]
        point[length_axis] = lo[length_axis] + length * along
        point[width_axis] = lo[width_axis] + width * across
        point[2] = lo.z + height * up
        return Vector(point)

    back = 0.62          # where the spine sits, as a fraction of height
    spec = [
        ("root", P(0.5, 0.5, 0.0), P(0.5, 0.5, 0.12), None),
        ("hips", P(0.18, 0.5, back), P(0.42, 0.5, back), "root"),
        ("spine", P(0.42, 0.5, back), P(0.68, 0.5, back), "hips"),
        ("chest", P(0.68, 0.5, back), P(0.86, 0.5, back + 0.05), "spine"),
        ("head", P(0.86, 0.5, back + 0.05), P(1.0, 0.5, back + 0.12), "chest"),
        ("tail", P(0.18, 0.5, back), P(0.02, 0.5, back + 0.04), "hips"),
    ]
    # Four legs, at the corners of the footprint. `.L`/`.R` and front/back are named for the
    # clips, which swing diagonal pairs.
    for side, across in (("L", 0.22), ("R", 0.78)):
        spec += [
            (f"leg_front.{side}", P(0.78, across, back - 0.05), P(0.78, across, 0.02), "chest"),
            (f"leg_back.{side}", P(0.24, across, back - 0.05), P(0.24, across, 0.02), "hips"),
        ]
    return _armature(obj, spec)


def _winged(obj):
    """A spine and one wing to each side, fitted to where the geometry actually reaches."""
    lo, hi = _bbox(obj)
    size = hi - lo
    centre = (hi + lo) * 0.5
    span_axis = 0 if size.x >= size.y else 1
    depth_axis = 1 - span_axis
    half = size[span_axis] * 0.5

    def P(across, depth, up):
        point = [0.0, 0.0, 0.0]
        point[span_axis] = centre[span_axis] + half * across
        point[depth_axis] = centre[depth_axis] + size[depth_axis] * depth
        point[2] = lo.z + size.z * up
        return Vector(point)

    spec = [
        ("root", P(0, 0, 0.0), P(0, 0, 0.1), None),
        ("hips", P(0, 0, 0.3), P(0, 0, 0.55), "root"),
        ("spine", P(0, 0, 0.55), P(0, 0, 0.78), "hips"),
        ("head", P(0, 0.12, 0.78), P(0, 0.24, 0.9), "spine"),
    ]
    for side, sign in (("L", 1.0), ("R", -1.0)):
        spec += [
            (f"wing.{side}", P(sign * 0.18, 0, 0.68), P(sign * 0.6, 0, 0.7), "spine"),
            (f"wingtip.{side}", P(sign * 0.6, 0, 0.7), P(sign * 0.98, 0, 0.72), f"wing.{side}"),
        ]
    return _armature(obj, spec)


def _stalk(obj):
    """A chain from the base to the top. A slime has no limbs and does not want any."""
    lo, hi = _bbox(obj)
    size = hi - lo
    centre = (hi + lo) * 0.5

    def P(up):
        return Vector((centre.x, centre.y, lo.z + size.z * up))

    return _armature(obj, [
        ("root", P(0.0), P(0.08), None),
        ("hips", P(0.08), P(0.36), "root"),
        ("spine", P(0.36), P(0.64), "hips"),
        ("chest", P(0.64), P(0.86), "spine"),
        ("head", P(0.86), P(1.0), "chest"),
    ])


def build(obj, plan: str):
    """The rig for a body plan, and the shape's name so the clips know what they are driving."""
    shape = SHAPES.get(plan, "stalk")
    if shape == "biped":
        return rigging.build_humanoid_rig(obj, name="rig"), shape
    if shape == "quadruped":
        return _quadruped(obj), shape
    if shape == "winged":
        return _winged(obj), shape
    return _stalk(obj), shape
