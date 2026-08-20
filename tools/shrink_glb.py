"""Bring a generated character down to a size a browser can download.

    python3 tools/shrink_glb.py godot/assets/models/corvin.glb --max 1024

Hunyuan3D returns 2048-pixel PBR maps, and a rigged character comes off the
pipeline at four to six megabytes. That is a fine asset for a renderer with a
hard drive behind it and a poor one for a game that has to arrive over a wire:
fourteen of them would add seventy megabytes to a pack that is currently
twenty-nine, and the party is on screen at about a tenth of that texture's
resolution anyway.

So the images are resized in place. `sips` does the decoding, because it is on
every Mac and because the alternative is a Python image dependency that this
repository does not otherwise need. The albedo is re-encoded as JPEG — it is a
photograph of cloth, it was JPEG when it arrived, and a lossless copy of a lossy
image is twice the bytes for none of the quality. Anything with an alpha channel
stays PNG.

The buffer is rebuilt rather than patched: every `bufferView` is copied out in
order and written back at a fresh four-byte-aligned offset, so the mesh data is
untouched and only the offsets move. Appending new images and leaving the old
bytes behind would have been shorter and would have grown the file it is meant
to shrink.
"""

from __future__ import annotations

import json
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def read_chunks(raw: bytes) -> list[tuple[int, bytes]]:
    magic, _version, total = struct.unpack("<III", raw[:12])
    if magic != 0x46546C67:
        raise SystemExit("not a GLB (bad magic)")
    out: list[tuple[int, bytes]] = []
    off = 12
    while off < total:
        length, kind = struct.unpack("<II", raw[off:off + 8])
        out.append((kind, raw[off + 8:off + 8 + length]))
        off += 8 + length
    return out


def write_glb(path: Path, chunks: list[tuple[int, bytes]]) -> None:
    body = b""
    for kind, payload in chunks:
        pad = (4 - len(payload) % 4) % 4
        filler = b" " * pad if kind == JSON_CHUNK else b"\x00" * pad
        payload = payload + filler
        body += struct.pack("<II", len(payload), kind) + payload
    path.write_bytes(struct.pack("<III", 0x46546C67, 2, 12 + len(body)) + body)


def resize(data: bytes, mime: str, longest: int) -> tuple[bytes, str]:
    """One image, no bigger than `longest` on its long edge."""
    suffix = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}.get(mime, ".png")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / f"in{suffix}"
        src.write_bytes(data)
        # `sips -g` first: an image already at or under the limit is left exactly as it is
        # rather than re-encoded, so running this twice cannot degrade anything.
        info = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(src)],
                              capture_output=True, text=True, check=True).stdout
        sizes = [int(line.split(":")[1]) for line in info.splitlines() if ":" in line
                 and line.strip().startswith(("pixelWidth", "pixelHeight"))]
        if not sizes:
            return data, mime
        if max(sizes) <= longest and mime == "image/jpeg":
            return data, mime
        # PNG only earns its size when there is an alpha channel to keep. These maps have
        # none — the metallic-roughness one was 788KB of PNG for a greyscale pair of channels
        # a browser has to download before anybody can see the character wearing it.
        alpha = subprocess.run(["sips", "-g", "hasAlpha", str(src)],
                               capture_output=True, text=True, check=True).stdout
        keep_png = "hasAlpha: yes" in alpha
        out_mime = "image/png" if keep_png else "image/jpeg"
        out = Path(tmp) / ("out.jpg" if out_mime == "image/jpeg" else "out.png")
        subprocess.run(["sips", "-Z", str(longest), "-s", "format",
                        "jpeg" if out_mime == "image/jpeg" else "png",
                        "-s", "formatOptions", "80", str(src), "--out", str(out)],
                       capture_output=True, check=True)
        return out.read_bytes(), out_mime


def shrink(path: Path, longest: int) -> None:
    raw = path.read_bytes()
    chunks = read_chunks(raw)
    gltf = json.loads(next(p for k, p in chunks if k == JSON_CHUNK))
    binary = next((p for k, p in chunks if k == BIN_CHUNK), b"")
    views = gltf.get("bufferViews", [])

    # Pull every view out, replacing the image ones with their smaller selves.
    payloads: list[bytes] = []
    for view in views:
        start = view.get("byteOffset", 0)
        payloads.append(binary[start:start + view["byteLength"]])

    before = len(raw)
    for image in gltf.get("images", []):
        if "bufferView" not in image:
            continue
        index = image["bufferView"]
        smaller, mime = resize(payloads[index], image.get("mimeType", "image/png"), longest)
        was = len(payloads[index])
        payloads[index] = smaller
        image["mimeType"] = mime
        print(f"  image  {was / 1024:7.0f}KB -> {len(smaller) / 1024:6.0f}KB  {mime}")

    # And write them back, in order, with fresh offsets. `byteStride` and every accessor read
    # through the view, so nothing else has to move.
    rebuilt = bytearray()
    for view, payload in zip(views, payloads):
        pad = (4 - len(rebuilt) % 4) % 4
        rebuilt += b"\x00" * pad
        view["byteOffset"] = len(rebuilt)
        view["byteLength"] = len(payload)
        rebuilt += payload
    if gltf.get("buffers"):
        gltf["buffers"][0]["byteLength"] = len(rebuilt)

    write_glb(path, [(JSON_CHUNK, json.dumps(gltf, separators=(",", ":")).encode("utf8")),
                     (BIN_CHUNK, bytes(rebuilt))])
    after = path.stat().st_size
    print(f"  {path.name}: {before / 1_048_576:.1f}MB -> {after / 1_048_576:.1f}MB")


def main() -> int:
    argv = sys.argv[1:]
    longest = 1024
    if "--max" in argv:
        at = argv.index("--max")
        longest = int(argv[at + 1])
        del argv[at:at + 2]
    args = [a for a in argv if not a.startswith("--")]
    if not args:
        raise SystemExit(__doc__)
    for arg in args:
        shrink(Path(arg), longest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
