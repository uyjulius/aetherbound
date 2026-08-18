# Godot shell, web export and deploy — design

*18 August 2026. Sub-project 1 of the Godot port.*

## Why this comes first

The port has 22,000 lines of runtime left to move and a working game already
live at `aetherbound.uy.sg`. Every one of those lines is worth less than the
answer to a simpler question: does a Godot build of this project reach that
domain and run in a browser at all?

Nothing about gameplay is in this sub-project. It exists to turn the delivery
path from an assumption into a checked one, so that everything ported after it
is publishable the day it is written.

## Decisions this locks in

**The web build runs the Compatibility renderer.** Forward+ needs Vulkan and the
web platform has WebGL 2, so `renderer/rendering_method.web` overrides the
project's `forward_plus`. Desktop keeps Forward+ and everything the asset
renderers already rely on — SDFGI, SSIL, 8192-pixel shadow maps — while the web
build gets what Compatibility supports. This is the first place the
"Godot-native look" decision has teeth: the browser will not show the same image
the offline renders do, and knowing how far apart they are is part of what this
sub-project reports.

**The export is single-threaded** (`web_nothreads`). GitHub Pages cannot send
`Cross-Origin-Opener-Policy` or `Cross-Origin-Embedder-Policy`, so
`SharedArrayBuffer` is unavailable and a threaded export would not boot. The
site stays exactly where it is; the workflow gains a job.

**The Godot build lands at `/godot/`, not at the root.** The JS build is the
playable game and stays the root until the port can finish a run start to
finish. Both are published from the same workflow, from the same commit.

## What is built

| Piece | Path | Purpose |
|---|---|---|
| Main scene | `godot/scenes/title.tscn` | What `run/main_scene` points at |
| Title screen | `godot/scripts/ui/title.gd` | Reads the real cast through `Database`, prints the readiness line |
| Export preset | `godot/export_presets.cfg` | Web, nothreads, Compatibility |
| Export driver | `tools/export-web.mjs` | Runs the headless export, checks the artefacts, reports sizes |
| Browser check | `tools/web-smoke.mjs` | Serves the export, loads it, fails on any console error |
| Deploy | `.github/workflows/pages.yml` | Downloads Godot and its templates, exports, publishes `_site/godot/` |

## The readiness contract

A Godot web build that fails to boot still serves an HTML page and still paints
a canvas, so "the page loaded" proves nothing. The title screen prints one line
when it has data:

```
AETHERBOUND_READY cast=14 tables=11 renderer=gl_compatibility
```

`tools/web-smoke.mjs` waits for that line and fails if it does not arrive, if any
console error appears, or if any request 404s. This is the same rule the JS smoke
test already follows: a check that cannot fail is not a check.

The counts come from `Database.load_all()`, which already fails loudly when the
manifest and the tables disagree — so a truncated or mis-assembled `.pck`
surfaces as a startup error rather than as an empty bestiary during a battle.

## Sizes, and what fails the build

The project currently carries three generated models (~17 MB of GLB plus
extracted textures), so the `.pck` is expected in the tens of megabytes and the
wasm around 10 MB gzipped. Both are well inside what Pages serves.

`tools/export-web.mjs` fails when:

- the export command returns non-zero, or
- `index.html`, `index.wasm` or `index.pck` is missing, or
- the `.pck` is under 1 MB, which is what a preset that silently exported no
  resources looks like.

## Out of scope

Input mapping, audio, field, battle, events, menus, and taking over the root.
Each of those is its own sub-project with its own spec.

## Verification

```bash
npm run export:web     # export, with artefact checks
npm run smoke:web      # load the exported build in a real browser

# and against what is actually deployed
node tools/web-smoke.mjs --url https://aetherbound.uy.sg/godot/
```

CI runs the first two before publishing: a build that does not boot does not
deploy. The `--url` form catches what only production gets wrong — a missing
content type on the wasm, a path that resolves from a directory but not from a
subpath, a stale cache.

## Result

Live at `https://aetherbound.uy.sg/godot/` from commit `e41c2da`: 62.7 MB
exported (10.1 MB of wasm over the wire), boots in Chromium with no console
errors and no engine warnings, and reports `cast=14 tables=11
renderer=gl_compatibility`. The JS game still holds the root.
