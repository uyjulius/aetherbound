"""Make a generated GLB honest about what its textures are.

    python3 tools/fix_glb.py godot/assets/models/well.glb

Hunyuan3D returns PBR textures embedded as data URIs that declare
`data:image/png;base64,...` and then contain JPEG bytes. Most tools sniff the
content and never notice; Godot believes the declared type, hands the bytes to
its PNG decoder, and fails with

    ERROR: Condition "!success" is true. Returning: ERR_FILE_CORRUPT

The model still imports — geometry is in a different chunk — so the asset
arrives untextured and looks like the *generator* produced a bad mesh rather
than like the container mislabelled an image. That is an expensive way to lose
an afternoon, and it is the same class of bug the Kingdom Hearts pipeline hit
from the other direction with files named `.png` on disk.

This rewrites the declared type to match the actual bytes rather than
transcoding, because the bytes are fine: a JPEG called a JPEG loads everywhere,
and re-encoding a lossy image to PNG would triple the size to fix a label.
"""

from __future__ import annotations

import base64
import json
import struct
import sys
from pathlib import Path

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def sniff(data: bytes) -> str | None:
    """The real media type of an image, from its leading bytes."""
    if data[:8] == PNG_MAGIC:
        return "image/png"
    if data[:2] == b"\xff\xd8":
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:2] == b"BM":
        return "image/bmp"
    return None


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
        # Every chunk is padded to four bytes: JSON with spaces, binary with
        # zeroes. Getting this wrong produces a file that most importers accept
        # and Godot rejects, which is the worst of both.
        pad = (4 - len(payload) % 4) % 4
        filler = b" " * pad if kind == JSON_CHUNK else b"\x00" * pad
        payload = payload + filler
        body += struct.pack("<II", len(payload), kind) + payload
    path.write_bytes(struct.pack("<III", 0x46546C67, 2, 12 + len(body)) + body)


def fix(path: Path) -> int:
    raw = path.read_bytes()
    chunks = read_chunks(raw)
    gltf = None
    for kind, payload in chunks:
        if kind == JSON_CHUNK:
            gltf = json.loads(payload)
    if gltf is None:
        raise SystemExit("no JSON chunk in GLB")

    bin_payload = next((p for k, p in chunks if k == BIN_CHUNK), b"")
    buffer_views = gltf.get("bufferViews", [])
    corrected = 0

    for index, image in enumerate(gltf.get("images", [])):
        declared: str | None = None
        actual: str | None = None

        uri = image.get("uri", "")
        if uri.startswith("data:"):
            header, _, payload = uri.partition(",")
            declared = header[len("data:"):].split(";")[0]
            actual = sniff(base64.b64decode(payload[:64] + "=="))
            if actual and actual != declared:
                image["uri"] = f"data:{actual};base64,{payload}"
                corrected += 1
        elif "bufferView" in image:
            declared = image.get("mimeType")
            view = buffer_views[image["bufferView"]]
            start = view.get("byteOffset", 0)
            actual = sniff(bin_payload[start:start + 16])
            if actual and actual != declared:
                image["mimeType"] = actual
                corrected += 1

        state = "ok" if actual == declared else f"\x1b[33mfixed\x1b[0m {declared} -> {actual}"
        print(f"  image[{index}] declared={declared} actual={actual}  {state}")

    if corrected:
        chunks = [(k, json.dumps(gltf, separators=(",", ":")).encode("utf8")) if k == JSON_CHUNK
                  else (k, p) for k, p in chunks]
        write_glb(path, chunks)
    return corrected


def main() -> int:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    total = 0
    for arg in sys.argv[1:]:
        path = Path(arg)
        print(path.name)
        total += fix(path)
    print(f"{total} mislabelled image(s) corrected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
