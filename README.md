# Aetherbound

A 3D turn-based RPG in the Final Fantasy VI tradition: hand-authored world, ATB
combat, an ensemble cast where everyone plays differently, and a score built on
a single recurring motif.

```bash
npm install
npm run textures     # paint the material plates (~6s)
npm run build
npm run serve        # → http://localhost:5177
```

`npm run smoke` drives a real browser through the whole loop and fails on any
console error.

**Controls** — arrows/WASD move, `Shift` run, `Enter`/`Z` confirm, `Esc`/`X`
cancel, `C` menu, `Q`/`E` rotate camera, `P` pause, both shoulder buttons to
flee a battle. Movement is relative to the camera, so the same key always
walks the same way *on screen* however the camera is turned. Gamepads work.
Everything is also on the control bar along the bottom of the screen, which
doubles as the game's statement of what the controls are.
Debug: `B` starts a random encounter, `N` starts a boss fight.

**Getting into a town** — walk onto its entrance; there is no button to press.
The name of whatever doorway, gate or road you are approaching appears above
it as you get close.

**The playable arc** — talk to Elder Sabbath in Harrowmere, leave by the south
bridge, and follow the road. The Fen Barrow is south-west, Solmere east, the
Ferran Outpost north, Ashenhall and the Cinderspine Pass north of that. The
Standing Oak and the Toll Baron's barricade are off the road and optional.

---

## What this is

The engine is finished and verified, and the game is **completable start to
finish** — five chapters, five mandatory bosses, an ending. The main line is
about ninety minutes; the optional content either side of it is worth many
times that. See [Honest state](#honest-state) at the bottom before reading
anything else as a claim of completeness.

### Rendering

A custom post chain does most of the visual identity work:

- **Toon shading with hue-shifted ramps.** Three samples the gradient at
  `dotNL * 0.5 + 0.5`, so the terminator sits at the ramp's midpoint and
  everything below it must stay at the deepest shadow value. Ramps shift *hue*
  as they darken — shadows cool, lights warm — which is the difference between
  painted-looking material and flat recoloured noise.
- **Depth-normal ink outlines** whose weight varies with distance, so they read
  as a drawn line rather than a uniform sticker. Characters get an extra
  inverted-hull contour, the way a comic artist inks a figure more heavily than
  its background.
- **Tilt-shift depth of field** for the diorama look, restrained bloom, a
  filmic tonemap that keeps mids linear so flat painted colour stays flat, and
  split-toning applied as a zero-mean *multiply* after tonemapping so it shifts
  hue without lifting blacks into grey.
- **Grain stepped at 24fps.** Per-frame noise shimmers and reads as cheap;
  24fps reads as film.

### Art pipeline

`tools/gen-textures.mjs` produces 21 seamless material plates. The important
part is the *coherence pass* that every plate goes through regardless of where
it came from: forced tiling, painterly brushwork, a low-frequency value glaze,
hue shifting, and quantisation to one 40-ramp master palette.

The pipeline is provider-agnostic. Drop a plate from any image model into
`assets/raw/<name>.png` and it becomes the starting point for that material
instead of the authored synthesiser — same coherence pass either way. That pass
is the point: raw generated images each arrive with their own lighting, colour
temperature and detail level, and the eye reads that inconsistency instantly.

A relative seam metric (`edge difference ÷ 90th-percentile interior contrast`)
flags real seams while tolerating materials whose structure legitimately puts a
hard edge on the tile boundary. `npm run textures` prints it per plate and
writes a 2×2-tiled contact sheet to `assets/contact-sheet.png`.

### Characters

Segmented rigid limbs on a joint hierarchy rather than skinned meshes — which
is what PS1-era JRPG characters actually were, and reads as deliberate
stylisation instead of a failed attempt at realism. Proportions follow a 5.5-head
canon measured from the ground up. Faces are *painted marks* on a simple head
shape: two eyes, a brow carrying the expression, and a small mouth. Nothing here
can land in the uncanny valley.

Animation is procedural — 14 clips (idle, walk, run, battle stance, attack,
cast, hurt, victory, dead, sit, loiter, work…) computed from the clock and
blended, so every character and NPC gets the full move set for free.

### World

Maps are hand-authored ASCII terrain grids plus explicit prop placements. The
`LEGEND` maps characters to ground type and walkability; buildings, props and
NPCs are placed by hand with explicit parameters. Nothing about a map is
generated at runtime — the builder only translates the authored description
into meshes and a collision grid.

Ground is a base layer with other terrain types laid over it as **feathered
decals** whose alpha falls off wherever they meet a different type, so paths get
organic painted edges instead of hard tile boundaries.

### Battle

ATB with wait and active modes. SNES-style formulas — defence divides rather
than subtracts, ±12.5% variance — because that is what makes a turn-based game
feel the way players expect; additive defence produces flat numbers where every
hit is identical. 25 statuses, elemental affinities including absorb, rows,
crits, reflect. Enemy behaviour is a list of rules evaluated top to bottom, so
bosses get real phases without a scripting language.

### Spell effects

One preallocated pool of 3,000 CPU-simulated particles, drawn as soft additive
discs generated in the shader — no sprite textures, so no hard sprite edges.
Nothing allocates during a battle; dead particles are swap-removed to keep the
live range contiguous.

Each element gets a **distinct silhouette of motion**, not a recoloured puff,
because in a turn-based game the player watches these thousands of times and
the read has to be instant:

| | |
|---|---|
| fire | charge, detonate, embers rise and cool |
| ice | shards converge, *hang*, shatter outward |
| bolt | no wind-up — strikes downward in one frame |
| earth | erupts from below, heavy high-gravity debris |
| holy | pillar descends and widens, motes drift up |
| shadow | collapses inward and stays dark |
| heal | the only effect that rises gently rather than bursting |

Effects are coroutines, so the battle script waits for the visual to land
before applying damage — the hit should look like it *caused* the number.
Magic circles, shockwaves, light pillars, swept slash arcs and chained
lightning are mesh-based; everything else is particles.

### Interiors

Buildings carry an `enter` id; the builder places a doorway trigger just
outside whichever face holds the door, rotated with the building. Walking into
a door loads the interior — no prompt, no separate interaction, which is how
this genre has always worked.

Interiors are small hand-authored rooms rather than generated boxes, lit by the
`interior` preset with the sky switched off, so stepping through a door gives an
immediate and unmistakable change of register. Four rooms cover the buildings
that matter; the cost per additional door is one screen of data.

### Two worlds

The story has a hinge: partway down the Ninth Well, Vhaine pulls it open and
the world changes state. Everything after that is the **same continent, the
same road, the same towns, wrong sky**.

That is deliberately not a second set of maps. A map definition may carry a
`ruin` block whose keys merge over the base — light, grade, fog, sky, music,
encounter regions, plus lists of props and NPCs to add or remove *by id*:

```js
ruin: {
  subtitle: 'What Is Left of the Silt Road',
  light: 'dusk', grade: 'ruin', music: 'memory',
  removeNpcs: ['kid1', 'kid2', 'wanderer'],
  npcs: [ /* who stayed, and who they are now */ ],
  props: [ /* dead trees, a chest that wasn't there before */ ],
}
```

The terrain grid is untouched on purpose. The emotional point of the device is
that the player recognises a street and finds it wrong, and duplicating the map
would quietly destroy that — you would be walking somewhere new that merely
resembled the old place. Party `worldState` is saved, so the two halves survive
a reload.

### Music

The score is *composed* — note data performed at runtime by modelled
instruments — not streamed audio. Loops are sample-accurate (a rendered loop
always has a seam, and the player hears it the fortieth time round a town),
tracks layer dynamically, and it costs kilobytes instead of megabytes.

Everything is built on the **Aetherbound motif**: a rising minor sixth followed
by a stepwise fall. It opens the Prelude, it is the world-map melody, it appears
*inverted* under the boss theme (the villain's music is the world's music,
corrupted), and it is quoted in the major for the opening village.

---

## Layout

```
src/
  engine/     renderer, post chain, input, scheduler, palette, assets, RNG
  fx/         toon/water/sky/foliage materials, post-processing
  world/      map format + builder, building kit, characters, field state
  battle/     ATB engine, formulas, monster body plans, battle view + UI
  ui/         window toolkit, dialogue, field menu
  audio/      synthesiser + sequencer
  data/       characters, enemies, items, spells, music, maps
  game/       party/roster state, save manager
tools/
  build.mjs, serve.mjs, smoke.mjs
  gen-textures.mjs, texgen/{raster,materials}.mjs
```

Some non-obvious decisions that took a while to get right and should not be
casually undone:

- **Input is polled per simulation tick, not per rendered frame.** Polling per
  frame silently drops roughly half of all button presses when rendering
  outruns the fixed step (120fps render against a 60Hz sim).
- **The character animator must not capture a rest pose for the `root` joint.**
  Root carries world placement, which the owning actor writes every frame;
  snapshotting and restoring it drags the character back to the origin.
- **Periodic noise only wraps when input scaling is integer.** Squashing an axis
  with `fbm(u * 2.6, …)` lands the tile edge mid-cell. Ask for per-axis cell
  counts instead.
- **Bloom upsampling must read a different target than it writes.** Reading and
  writing the same mip is the WebGL feedback loop the driver complains about.
- **Contrast is a smoothstep S-curve, not pivot-and-scale.** Pivot-and-scale
  clips everything below the pivot straight to black.

---

## Honest state

The brief was a complete ~40-hour game. What exists is a **finished engine and a
verified vertical slice**, not a finished game. Concretely:

| Area | State |
|---|---|
| Engine, rendering, post FX | Complete |
| Art pipeline + 21 materials | Complete |
| Characters, animation, field mode | Complete |
| ATB battle system | Complete |
| Particle + spell effect system | Complete |
| Esper/magicite system + summons | Complete |
| Menus, shops, inns, config, save/load | Complete |
| Audio engine | Complete |
| Cutscene / event / quest scripting | Complete |
**The game has a beginning, a middle and an end, and can be finished.** The
smoke test plays it through to the ending card. What it does not have is
anything like forty hours of content.

| Area | Count | Target |
|---|---|---|
| Score | **36 tracks** | 30+ — met |
| Cast | **14, all recruitable, all mechanically distinct** | met |
| Bestiary | **200 enemies, 45 bosses** | ~180 — met |
| Items / spells / espers | **255 / 58 / 26** | ~250 — met |
| Maps | **137 variants** across two continents | ~45 — met |
| Quests and scenes | **124 events** | 60+ — met |
| Shops | 19 | |
| Second world state | **Done** — see [Two worlds](#two-worlds) | |
| Airship | **Done** — the Gallowglass | |
| Second continent | **Done** — the Meridian Reach, reachable only by air | |
| Automated checks | **102/102**, including a playthrough to the ending | |
| Reachability audit | **0 stranded** — `npm run audit` | |

Playtime, stated honestly, is two numbers rather than one — this section used
to give the larger of them here and the smaller one twice elsewhere, which is
not an estimate, it is a contradiction:

- **The main line is about ninety minutes.** Measured, not guessed: breadth-
  first search over the real terrain grids gives the walking distance between
  the story beats, and at the encounter tables' own rates that is on the order
  of forty random battles and five bosses.
- **Seeing everything is on the order of forty hours.** That counts both
  continents, the hundred-odd sidequests, all 45 bosses and the encounter
  regions that carry the level curve from 24 to 85.

The gap between those two numbers was the game's central design problem, and
`node tools/balance.mjs` now measures the join rather than each side
separately: the main line's five mandatory bosses are checked against the
level the road actually delivers, because they used to be written eleven
levels above it and the game was unwinnable without grinding at one corridor.

### `npm run audit`

The bug this project kept producing was never a crash. It was content that
existed, was correct, and could not be reached: a chest in a wall, a quest no
NPC mentioned, a spell no esper taught, a relic whose effect nothing read, a
boss no door led to. None of it throws and none of it shows up in a build.

So there is a second test that checks the registry backwards — not "does
everything referenced exist" but "is everything that exists referenced" — and
fails the build while anything is stranded. It found 178 pieces of unreachable
content on its first run. It now reports zero.

The main line, all covered end-to-end by the smoke test:

1. Harrowmere → the world map → the Fen Barrow → **the Bogfather** → Hollow King esper.
2. Solmere → recruit Aurelian (gated on 1) → recruit Bastian (gated on Aurelian)
   → the Ferran Outpost → **the Ferran Warden** → Maret defects.
3. Ashenhall → **the Eighth Lantern** → the Ninth Lantern esper → Idris will
   now stand up.
4. The Cinderspine Pass → **the Cinder Wyrm**, two espers on the ledges.
5. The Ninth Well → **the Warden of the Ninth Well** → the Well opens and
   **the world breaks** → walk the ruined continent → **Vhaine, Unwound** →
   ending.

After the break, three more join: Tam on the road, Ilsabet painting in
Harrowmere, Kestrel still filing in Solmere. Oda waits in a Harrowmere shop
until someone asks him the useful question; Rusk has been standing against a
wall in the Engine House for eleven years because nobody said stand down; and
The Mask turns up at the shaft head only once the world has broken, and never
explains itself.

Optional, off the road: **the Standing Oak** (Greenmother esper), **the Toll
Baron** ambush, the Weeping Wood (Idris, the Quiet Edge) and the Drowned Coast
(Osric, the Saltwidow esper, the Tidecleaver).

Recruitment is gated on story state rather than location, so the party you
arrive at the Well with reflects what you actually did: Idris will not move
until Ashenhall's last lamp goes out, and Maret will not defect until she has
heard one of her own machines die.

The continent is divided into six encounter regions — snowfield, forest, fen,
coast, plains and the road — each rolling its own bestiary, so difficulty rises
as the road pushes north and east.

Walking the main line is on the order of ninety minutes. Everything past that
is content against finished systems, and there is a great deal of it — see
[Honest state](#honest-state) for both numbers and how they were measured.

**Two things did not go as briefed.**

*AI-generated textures.* All 21 materials are generated, and there is no
procedural fallback in the shipping set. `npm run textures` prints `quilted`
on every line.

Getting there took abandoning the obvious approach. Asking an image model for
a tileable texture does not work and cannot be made to work: asked for a stone
wall it returns a photograph of a building, asked for a macro shot it returns
one hero stone, asked for an orthophoto it returns a field with a vanishing
point. All three tile into a kaleidoscope. Three rounds of prompt engineering
moved the failure around without fixing it.

What works is to stop using the image and start using it as a *bag of
patches*. `tools/texgen/quilt.mjs` implements Efros & Freeman image quilting:
lay down small overlapping blocks, search the source for the patch that best
matches what is already committed in the overlap, and cut between them along
the path of least difference. Composition cannot survive being reassembled
from 128-pixel tiles; local material appearance survives perfectly, because
every output pixel is a source pixel. Two additions to the classic algorithm:
the tile is synthesised on a torus so it wraps by construction rather than by
a blend applied afterwards, and patches are drawn from a shortlist of good
matches rather than the single best, which stops the synthesiser reproducing
one region of the source in stripes.

The rest is selection. Ten candidates are generated per material and scored on
two axes — `structureScore` (how much composition is in it, lower better) and
`detailScore` (how much material, higher better). Optimising either alone
picks badly: a photograph of a flat green field has no composition at all and
is useless as grass. The winner is then de-lit, quilted, exposure-matched to
the rest of the set, and hue-shifted lightly.

```bash
npm run textures:raw -- --candidates 10   # keyless, via Pollinations
npm run textures                          # quilt + coherence + contact sheet
```

*Scale.* Forty hours of content is on the order of several hundred thousand words
of writing, a few hundred hand-built maps, and a full balance pass. The
foundation is deliberately built so that content is now *data entry* against
finished systems — a new town is one file of ASCII and prop placements, a new
enemy is one object, a new track is note data — but that content genuinely does
not exist yet, and I would rather say so than imply otherwise.
