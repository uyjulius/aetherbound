# The effects layer — design

*28 August 2026. The last unported system of the Godot port.*

## What this covers

`src/fx/` — 1,897 lines across four modules, and the last unported system in the
game. Particles and the eleven spell effects, the toon material chain, and the
post-processing composite.

It is the port's own bug class, one more time. Nineteen parity harnesses pass.
Seventy-one browser checks pass. And every spell in the port draws the same
thing: one `OmniLight3D` at nine energy, faded over 200ms
(`battle_view.gd:1053`), with a number over it. Fire, Blizzard, Bolt, Holy and
Shadow are distinguishable only by the colour of the light.

The reference authored eleven **distinct silhouettes of motion** on purpose, and
said why: *"In a turn-based game the player watches these thousands of times, so
the read has to be instant and the shape has to carry the information."* Fire
billows and rises. Ice gathers, hangs, then shatters outward — the pause is the
whole effect. Bolt has no wind-up, because lightning's character is that it has
already happened. Earth erupts from below. Heal is the only one that goes gently
up. None of that is in the port.

Two dead handlers mark the same gap from the other side: `event_context.gd:559`
`grade()` and `:563` `stage_class()` both record and do nothing, because there
has never been anything to call.

## The decision this reverses

Two places in the port record dropping this chain deliberately:

- `project.godot:9` — *"The stylised toon chain in the web build is deliberately
  not carried over — that identity was built for primitive geometry, and this
  port exists to replace the geometry."*
- `atmosphere.gd:13` — the same about the grade and tilt-shift.

Both were written when the port's geometry was Quaternius packs and code-built
kit. It is now 86 generated models. The call taken here is that the look is
worth carrying anyway, over the new geometry rather than instead of it — so
**both comments are rewritten as part of this work.** A codebase that documents
a decision it no longer holds is worse than one that documents nothing.

## What Compatibility allows, and what it does not

The web build runs `gl_compatibility` and that is the build that ships. From the
4.7 renderer feature table:

| Feature | Compatibility | Consequence here |
|---|---|---|
| `SCREEN_TEXTURE`, `DEPTH_TEXTURE` | Yes | Composite is a fullscreen quad |
| Glow, tonemap, adjustments | Yes | Bloom is `Environment.glow` |
| `NORMAL_ROUGHNESS_TEXTURE` | **Forward+ only** | Outline is depth+normal on desktop, **depth-only on web** |
| `CompositorEffect` | **Mobile/Forward+ only** | Post is a `ColorRect`, not a compositor |
| HDR buffer | **No** — R10G10B10A2 UNORM | Bright-pass thresholds differ from the reference's half-float |

The outline row is the one that costs something real. The reference's line varies
in weight with distance because it reads both depth and normals; on the web the
port gets the depth half only, which misses creases between surfaces at the same
depth. It is built per-renderer rather than pretended away, and the depth-only
path is what the browser check exercises.

## Units

| Unit | Path | What it is |
|---|---|---|
| Particle field | `godot/scripts/fx/particles.gd` | Pooled CPU integrator + five emitters |
| Mesh effects | `godot/scripts/fx/effects.gd` | Five builders, additive |
| Spell effects | `godot/scripts/fx/spellfx.gd` | Eleven element coroutines |
| Materials | `godot/scripts/fx/materials.gd` | Toon, foliage, water, aether, rim |
| Post chain | `godot/scripts/fx/postfx.gd` | Composite quad, twelve grades |
| Shaders | `godot/shaders/*.gdshader` | Six; the project has none today |

### Particle field

A direct port of the reference's integrator, not a reach for `GPUParticles3D`.
The reference chose CPU simulation for a stated reason — per-particle
turbulence, drag, gravity flips and colour-over-life are awkward in a
fire-and-forget GPU system — and `implode`, which aims every particle to arrive
at the centre exactly as it dies, is the case that makes the point.

3,000 particles, parallel `PackedFloat32Array`s, swap-remove to keep the live
range contiguous, and the same maths: two-frequency turbulence, exponential
drag, grow-fast/shrink-slow size, alpha to the 1.4 power. Emitters: `burst`,
`ring`, `column`, `implode`, `streak`.

Three.js draws these as `THREE.Points` sized by `gl_PointSize`. **Godot 3D has
no point sprites.** It becomes one `MultiMeshInstance3D` over a unit quad,
billboarded in the vertex shader, with `INSTANCE_CUSTOM` carrying size and alpha
and per-instance `COLOR` carrying the lerped colour — still one draw call, still
a soft additive disc generated in the fragment shader with no sprite texture to
load.

### Randomness — the trap

The reference's emitters call `Math.random()`, and that is correct: a bolt
should jag differently every cast. The port must reproduce that with **Godot's
own unseeded RNG and never with `RNGStreams`.**

Drawing from a game stream would consume draws from `battle`, and the whole
battle port is verified by comparing draw sequences. The fx layer would
silently desynchronise every fight and `battle-parity` would fail somewhere far
away from the cause. This is the one place in the port where `randf()` is right
— `scenery.gd:320` avoids it for the opposite and equally deliberate reason.

The consequence for checking: **positions are not comparable across builds.**
Parity compares the emission calls and their parameters; behaviour is checked in
Godot against a live field. See below.

### Materials

`kit.js` builds 26 named toon materials for code-built architecture. The port's
seam is `scenery.gd:180`, which today returns a flat `StandardMaterial3D` per
texture plate. Godot has no `MeshToonMaterial`, so the ramp is a real shader
sampling one of the reference's eight `GradientTexture1D`s — standard,
character, terrain, interior, cave, snow, magitek, night.

Rim light stays opt-in, for the reference's reason: on architecture it paints a
hard white line along every grazing edge and reads as an artefact. Characters
and props only.

Foliage wind and water are capability the port simply lacks — its trees do not
move and its water is `albedo_color` with `roughness 0.15`.

### Post chain

A `ColorRect` over the viewport running `composite.gdshader`: ink outline,
tilt-shift depth of field, vignette, chromatic aberration, grain stepped at
24fps, and the screen flash. Bloom is `Environment.glow`.

The twelve grades live in the shader rather than in `Environment.adjustment_*`,
because the reference's grade is exposure, contrast as an S-curve amount,
saturation, lift, white point, a filter multiply and a split-tone — richer than
three adjustment sliders can express. `set_grade(name, seconds)` crossfades, and
`event_context.grade()` finally has something to call.

Two of the reference's notes are carried because both are scars: grain steps at
24fps because per-frame noise shimmers and looks cheap, and split-toning is a
zero-mean multiply *after* tonemapping because the additive version lifts blacks
into grey.

### Battle timing

The reference awaits the effect and then applies damage — *"the hit should look
like it caused the number."* The port flashes and shows the number together.
`_commit` in `battle_view.gd` gains the await, so the effect lands first.

## Checking

Two harnesses, because one of them alone is the mistake this port already made.

**`tools/fx-parity.mjs`** — recording mode both sides, comparing the emission
transcript per element: every `burst`/`ring`/`column`/`implode` with its
parameters, every `wait`, every `shake` and `flash`, in order. This is
`events-parity`'s shape, and it is the only thing that can prove fire is *this*
fire and not a plausible orange one.

**`godot/tools/fx_probe.gd`** — and this is the half that matters, because on
20 August a transcript harness let a dozen dead handlers pass while every scene
matched. It compares *effects*, against a live field:

- particles actually spawn, and the pool drains back to zero
- a burst's mean radius from the origin **grows**; an implode's **shrinks**
- no two elements produce the same **signature** — the tuple of peak particle
  count, total lifetime, mean end-radius and mean colour. Eleven effects that
  differ only in colour would pass every other check on this list, and that is
  precisely the failure being guarded against
- the twelve grades produce twelve different framebuffers
- `SubViewport` captures differ from each other and from an empty stage —
  `render_character.gd`'s rule, that an image tool which cannot prove its output
  changed is indistinguishable from the statue it is meant to catch

The probe seeds its own `RandomNumberGenerator` so the checks are reproducible
while the game's are not.

Both harnesses are made to fail before they are trusted, and `npm run port`
gains `fx-parity`. The browser check gains one line: a cast spell emitted
particles.

## Performance, and the decision point

3,000 particles times roughly twenty float operations per frame, **in
GDScript**, single-threaded, on a software rasteriser in CI. GDScript is far
slower than JS at exactly this. The CPU port is kept anyway — it is what makes
the behaviour faithful and checkable — but phase 1 ends with a measurement on
the exported web build, and if it costs frames the answer is a `.web`
pool-size override, in the style the project already uses for shadow maps.

Measuring it is part of phase 1, not a thing discovered in phase 4.

## Order

1. `particles.gd`, `effects.gd`, `fx_probe.gd`, and the measurement
2. `spellfx.gd` — eleven elements — `fx-parity.mjs`, and the battle timing change
3. `materials.gd` and its shaders, into `scenery.gd` and `cast_models.gd`
4. `postfx.gd` and the grades; wire `grade()` and `stage_class()`; rewrite the
   two comments that say this chain was dropped on purpose

Phase 2 is the one a player would notice. Phases 3 and 4 are what make the port
look like the game rather than like a port of it.
