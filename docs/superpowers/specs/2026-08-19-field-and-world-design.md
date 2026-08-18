# Field and world — design

*19 August 2026. Sub-project 3 of the Godot port.*

## What this covers

The world *simulation*: the collision grid, walkability, movement, the camera,
triggers, exits and encounter stepping. `src/world/field.js` and the
non-rendering half of `src/world/map.js`, about 2,000 of the 3,617 lines in
`src/world/`.

**Not scenery.** The reference builds its ground, walls and props from geometry
computed in code (`kit.js`, `buildTerrain`, `buildGround`), and this project does
not ship procedurally generated assets — moving that computation into GDScript
would be the same mistake in a new language. Walls, buildings and foliage are an
asset problem, and they get their own sub-project with the generator that already
produced the well, the lantern and Vesna. What ships here is a diagnostic view:
the grid, the player, the camera and the encounter counter, drawn as a debug
overlay that nobody could mistake for the game.

That split is deliberate rather than convenient. The simulation is the part that
can be *proved* identical to the reference, and it is worth proving before any of
it is buried under scenery.

## What can be checked exactly, and what cannot

| Layer | Source | Portable exactly? |
|---|---|---|
| Terrain walkability | `LEGEND` × terrain rows | Yes — exported as data |
| Glyph-prop colliders | constant radii per kit | Yes — exported as data |
| Exits and trigger zones | map data | Yes |
| `clear` / `resolve` | pure geometry | Yes |
| Movement integration | speed constants + `resolve` | Yes |
| **Authored prop footprints** | measured from built meshes | **No** |

The last row is the interesting one. A building's collider is a rectangle
measured from the bounding box of the kit geometry that stands at body height —
so it exists only once the reference has *built* the prop, and the port's real
assets will have different boxes. Recomputing it is impossible; guessing it would
put invisible walls in towns.

So it is harvested. `tools/harvest-reference.mjs` drives the built game in a
browser, walks all 95 maps, and writes two things:

- `godot/data/footprints.json` — every authored prop's collider, which the port
  **reads** because it cannot derive it.
- `tools/fixtures/reference-grids.json` — the full walk bitmap and trigger list
  per map, which the port **is compared against** and never reads.

Keeping those two apart is the whole point: a checker fed the answer proves
nothing. The fixture also records a hash of `maps.json`, and `field-parity.mjs`
fails if the maps have changed since the harvest rather than comparing against a
stale oracle. That keeps the parity run browser-free, so it works in CI.

## Ported pieces

| Piece | Path |
|---|---|
| Legend and radii, as data | `godot/data/legend.json` |
| Collision grid | `godot/scripts/world/collision_grid.gd` |
| Grid construction from a map | `godot/scripts/world/map_build.gd` |
| Field runtime | `godot/scripts/world/field.gd` |
| Debug view | `godot/scenes/field_debug.tscn` |

Two details from the reference are carried over deliberately, because both are
scars:

- **Axis-separated resolution.** If the combined move is blocked, each axis is
  tried alone. That is the difference between sliding along a wall and sticking
  on every corner.
- **Never trap.** If the *standing* position is already illegal — a script placed
  someone badly, a collider moved under a saved position — every candidate fails
  and the mover is stuck in every direction with no error. A body inside geometry
  is allowed to move.

## A contradiction in the reference, and what the port does about it

`rng.js` says every random decision routes through a named stream so battles,
encounters and drops replay exactly from a save. `_rollEncounterThreshold` uses
`Math.random()`, so encounter *spacing* does not. The promise and the code
disagree, and the code is wrong: reloading a save and walking the same path gives
different encounters.

The reference is corrected to draw from the `encounter` stream — the same uniform
0.55–1.45 spread, from a source that can be replayed — and the port does the same.
This is a bug fix rather than a redesign, and it is what makes the encounter half
of this sub-project checkable at all.

## Verification

```bash
node tools/harvest-reference.mjs   # occasional; needs a browser
node tools/field-parity.mjs        # joins `npm run port`; no browser
```

`field-parity.mjs` compares, for all 95 maps: every walkability cell, every
collider, every trigger rectangle, then `clear` and `resolve` over a synthetic
grid built to sit on the awkward cases — corners, one-tile gaps, a body standing
inside geometry — and finally a scripted walk on several maps, position by
position, tick by tick.
