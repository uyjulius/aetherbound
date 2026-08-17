"""Photoreal asset generation: concept views -> textured mesh -> Godot.

    python3 tools/assetgen.py well

One asset, end to end, so the photoreal target can be judged from a render
rather than from a plan. It deliberately generates the *textured* mesh via
Hunyuan3D-2.1's `/generation_all`, which returns real PBR maps — the Kingdom
Hearts project uses the cheaper `/shape_generation` and projects concept art on
afterwards, which is right for a stylised look but gives albedo only. Photoreal
needs roughness and normals the projection cannot invent.

Credentials and the two generator clients are reused from that project rather
than reimplemented: `tools/kh/imagegen.py` and `tools/kh/meshgen.py` already
encode a lot of paid-for debugging — the safety-filter fallback chain, the fact
that the image API returns JPEG bytes named `.png` (which Blender tolerates and
Godot silently does not), that the gradio kwarg is `token` and not `hf_token`,
and that ZeroGPU quota errors state exactly what is left and should be read
rather than retried against.

If this direction is kept, those two modules should be vendored into this repo
with the stylised-specific bits dropped, and the tokens moved into a gitignored
.env here. Reaching across projects is fine for a spike and wrong for a
pipeline.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

FF = Path(__file__).resolve().parent.parent
KH = Path.home() / "Documents" / "kingdom-hearts"

sys.path.insert(0, str(KH / "tools"))

CONCEPTS = FF / "assets" / "concepts"
MODELS = FF / "godot" / "assets" / "models"


def load_env(path: Path) -> None:
    """Minimal .env reader — the tokens live in the Kingdom Hearts repo root."""
    if not path.exists():
        raise SystemExit(f"no .env at {path}")
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# Subjects are described the way a photographer would brief a shoot, not the
# way a game designer would describe an object. Hunyuan3D reconstructs what it
# is shown, so the concept image has to already *be* the material read we want:
# stated lens and lighting, a plain background it can matte off, and no ground
# plane or base — the mesh generator will happily build a diorama plinth into
# the geometry if the concept implies one, and that plinth then has to be cut
# out by hand in Blender.
## A character has to arrive in a T-pose or the rig cannot be fitted.
##
## `build_humanoid_rig` measures the mesh rather than assuming proportions, and
## the way it finds the shoulder line is to take the mean height of the
## far-lateral vertices — the outstretched hands are the only geometry way out
## at the sides. An A-pose or a relaxed stance puts those vertices near the
## hips, the shoulder line lands in the pelvis, and the arms deform from the
## wrong pivot. So the pose is stated four different ways, because image models
## drift back to a natural stance given any latitude at all.
T_POSE = (
    "standing in a strict symmetrical T-pose, both arms stretched straight out "
    "horizontally to the sides at exactly shoulder height, palms down, fingers "
    "together, legs straight and slightly apart, feet flat and parallel, "
    "facing camera directly, full body visible head to feet, no props, "
    "no weapon, arms not lowered, arms not bent"
)

CHARACTERS = {
    # Vesna's palette is taken from her entry in src/data/characters.js so the
    # generated model and the reference build agree on who she is.
    "vesna": (
        "photorealistic full-body character reference of a slim young woman, "
        "1.66m tall, a travelling mage-duelist in a worn fantasy world; "
        "long olive-green hair, warm light-tan skin; deep red belted tunic with "
        "gold trim and a gold buckle, indigo blue trousers, scuffed brown "
        "leather boots and tan leather gloves, a dark crimson half-cape over "
        "one shoulder; practical hard-wearing cloth with visible weave, "
        "leather with real grain and wear; " + T_POSE + "; "
        "even soft studio lighting, neutral light grey seamless background, "
        "sharp focus, physically based materials, photogrammetry reference, 8k"
    ),
}

SUBJECTS = {
    "well": (
        "photorealistic product photograph of a weathered medieval village "
        "stone well, drystone masonry with lichen and moss in the joints, "
        "iron-banded oak windlass with a frayed hemp rope, mossy wet stone, "
        "worn timber, shot on 85mm lens, soft overcast studio lighting, "
        "neutral light grey seamless background, object centred and complete, "
        "sharp focus, high dynamic range, physically based materials, 8k"
    ),
    "lantern": (
        "photorealistic product photograph of an antique wrought iron and "
        "glass hanging lantern, pitted blackened metal, soot-stained bevelled "
        "glass panes, candle stub inside, shot on 85mm lens, soft overcast "
        "studio lighting, neutral light grey seamless background, object "
        "centred and complete, sharp focus, physically based materials, 8k"
    ),
}

# The rear view exists because a single front image can only hallucinate the
# back, and the mesh model measurably improves when given more than one.
REAR_SUFFIX = (
    ", photographed from directly behind, rear view of the same object, "
    "identical lighting and background"
)


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    subject = args[0] if args else "well"
    catalogue = {**SUBJECTS, **CHARACTERS}
    if subject not in catalogue:
        raise SystemExit(f"unknown subject {subject!r}; try: {', '.join(catalogue)}")
    SUBJECTS.update(CHARACTERS)

    # `--shape` asks for geometry only via `/shape_generation`, which reserves
    # 90s of GPU instead of the textured endpoint's 270s. `--anon` drops the
    # token so the call lands on the anonymous ZeroGPU pool, which is metered
    # separately from the Pro one — the way to keep working when the account's
    # daily allowance is spent. Colour then comes from projecting the concept
    # views in Blender rather than from the model.
    shape_only = "--shape" in flags
    anonymous = "--anon" in flags

    load_env(KH / ".env")
    if anonymous:
        os.environ.pop("HF_TOKEN", None)
    elif not os.environ.get("HF_TOKEN"):
        raise SystemExit("HF_TOKEN missing — the textured endpoint needs it")

    from kh import imagegen, meshgen  # noqa: E402  (path set above)

    CONCEPTS.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)

    prompt = SUBJECTS[subject]
    front = CONCEPTS / f"{subject}-front.png"
    back = CONCEPTS / f"{subject}-back.png"

    print(f"[1/3] concept views for {subject!r}")
    imagegen.generate(prompt, front)
    print(f"      front -> {front.relative_to(FF)}")
    imagegen.generate(prompt + REAR_SUFFIX, back)
    print(f"      back  -> {back.relative_to(FF)}")

    endpoint = "/shape_generation (geometry only, ~90s GPU)" if shape_only \
        else "/generation_all (PBR, ~270s GPU)"
    pool = "anonymous pool" if anonymous else "Pro quota"
    print(f"[2/3] mesh via Hunyuan3D-2.1 {endpoint} on the {pool}")
    glb = MODELS / (f"{subject}-shape.glb" if shape_only else f"{subject}.glb")
    meshgen.generate(front, glb, back=back, octree=256, steps=30,
                     textured=not shape_only)
    size_mb = glb.stat().st_size / 1e6
    print(f"      mesh  -> {glb.relative_to(FF)}  ({size_mb:.1f} MB)")

    print("[3/3] done. Render it with:")
    print("      godot --headless --path godot --script res://tools/render_asset.gd -- "
          f"{subject}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
