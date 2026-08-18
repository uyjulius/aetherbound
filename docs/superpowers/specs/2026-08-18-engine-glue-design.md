# Engine glue — determinism, palette, input, time

*18 August 2026. Sub-project 2 of the Godot port.*

## What this is

Four small modules that everything ported after them depends on:
`src/engine/rng.js`, `palette.js`, `input.js` and the timing half of
`scheduler.js`. Together about 1,000 lines of JS. None of it is interesting on
its own, and all of it is load-bearing.

Not in scope: `renderer.js` and `assets.js` are Three.js — Godot replaces them
rather than porting them. `analytics.js` is deferred; it needs an HTTP client and
a consent path, and nothing else waits on it.

## The RNG is the whole point

Every parity check the port already has — 3,804 formula values, 24,000 AI
decisions — compares *pure functions*. The moment a battle runs, the comparison
is against a stream of random numbers, and a port whose RNG diverges on the
tenth draw produces plausible, differently-wrong fights that no audit can catch.

`rng.js` is xoshiro128\*\* seeded through splitmix32, in 32-bit unsigned
arithmetic. GDScript has 64-bit signed integers, no `>>>`, and no `Math.imul`,
so a natural transcription is wrong in three separate ways:

- **Multiplication overflows.** `0xFFFFFFFF * 0xFFFFFFFF` needs 64 unsigned bits
  and `int` is signed, so the product wraps negative. The port splits both
  operands into 16-bit halves and reassembles mod 2³².
- **Right shift is arithmetic.** `>>` on a negative int propagates the sign bit,
  so every intermediate value is masked back to 32 bits before it is shifted.
- **Rotation needs an unsigned view.** `(x << k) | (x >>> (32 - k))` is only
  correct if both halves are masked.

So the port is checked, not reviewed: `tools/rng-parity.mjs` drives both
implementations through the same sequence and compares every value — raw draws,
`int`, `range`, `float`, `chance256`, `pick`, `weighted`, `shuffle`, and a
state save/restore round trip. It joins `npm run port`.

`weighted` accumulates floats and compares against a running total, so the order
of operations is preserved exactly rather than tidied.

## Palette and input are data, not transcription

The repo's rule is that data crosses the boundary through `to-godot.mjs` and gets
checked by `data-parity.mjs`. Both of these are data wearing a code costume:

- **Palette** — 40-odd five-step ramps of hex strings, the UI colours and the
  element colours. Exported as `palette.json`; `palette.gd` provides `ramp_at`
  and the conversions. Hand-copying 200 hex values into GDScript is a typo
  farm, and the ramps are the reason assets from different sources read as one
  hand.
- **Input** — twelve named actions and their keyboard bindings. Exported as
  `input.json` and built into Godot's `InputMap` at boot, so there is one
  binding table rather than one per engine. The alternative — a hand-maintained
  `[input]` block in `project.godot` — drifts the first time a key changes, and
  the control bar along the bottom of the screen *is* the game's statement of
  what the controls are.

Two mappings cannot be data because they are engine vocabulary, and both are
traps:

- `KeyboardEvent.code` strings → Godot key constants (`KeyW` → `KEY_W`,
  `ShiftLeft` → `KEY_SHIFT`). Anything unmapped is an error at boot, not a
  silently missing binding.
- **HTML5 gamepad button indices are not Godot's `JoyButton` values.** The
  standard web mapping puts the shoulder buttons at 4 and 5; Godot's enum puts
  them at 9 and 10, where the web mapping has Back and Guide. Reusing the
  numbers gives a controller whose shoulder buttons open the menu. The port maps
  them by name.

## Time

`scheduler.js` is generator-based: coroutines `yield` a descriptor and are sent
the frame's `dt` back. GDScript has no generators, but it has `await`, so the
shape changes and the semantics do not:

- The scheduler still owns game time. `wait`, `frames`, `until`, `tween` and
  `over` resume from the scheduler's own tick, so `time_scale` and pausing work
  on every routine at once — a `Timer` node or a raw `Tween` would run on wall
  clock and keep animating a paused game.
- `EASE` ports as pure functions, including `snap`, which is the one the menu
  cursor and damage pop-ups use.
- Events read almost identically: `yield* say(...)` becomes `await say(...)`.
  That matters for sub-project 5, where 6,511 lines have to move without being
  redesigned.

Cancellation is the one place the two engines genuinely differ. JS calls
`gen.return()` and the coroutine stops where it stands; GDScript cannot unwind a
suspended coroutine.

**Resolved:** cancelling disconnects the signal the body is parked on, which
releases the suspended frame outright rather than leaving it waiting forever.
Verified: a cancelled routine stops incrementing its counter, `--headless` exits
with no leaked objects, and no error is printed. Parking it instead would also
have kept a reference cycle alive — the signal holds the coroutine, the coroutine
holds the routine — for the rest of the session.

That has one consequence worth stating: **a routine's return value is not
captured.** Awaiting the body's call is the only way to read it, and that
suspension has no signal to disconnect, so cancelling would leak one frame per
cancelled routine forever. The reference never reads a routine's result — only
whether it finished — so `join` reports completion and nothing else.

## Two more places the port had to bend to match

**Routines start on the first tick, not when `run()` is called.** A JavaScript
generator does nothing until it is first stepped, so in the reference the frame
that starts a routine only gets as far as its first `yield`. Calling a GDScript
lambda runs it immediately, which made every ported cutscene land one tick early
— free divergence, and invisible. The body is now deferred by one tick, with the
same drain rule applied so a routine opening with `wait(0)` is no further behind
here than there.

**Pausing sets the delta to zero rather than skipping the pass.** The reference
has no pause flag; it sets `timeScale` to zero, which keeps stepping routines
while no time passes. Skipping the pass entirely looked equivalent and was not:
a routine started while paused never ran its first line, and an `until` gate that
opened during the pause was noticed a tick late.

## Result

All five harnesses pass. `npm run port` is now `parity` + `data-parity` +
`ai-parity` + `rng-parity` + `glue-parity`: 3,804 formula values, 40,855 table
numbers, 24,000 AI decisions, 1,719 RNG draws across nine seeds, and 897 glue
values.

The harnesses earned their keep immediately by finding three real defects that
review had passed over:

1. **`elasticOut` used `TAU / 6` where the reference uses `(2 * PI) / 3`.** Half
   the frequency. It still looked like a plausible elastic curve and undershot at
   0.25 where the real one is still overshooting.
2. **The reference's `getState()` returns *signed* words** — JavaScript's bitwise
   operators produce int32, so three quarters of the xoshiro state comes back
   negative. The bits are the same and the stream is unaffected, but the port now
   masks on the way in, and the probe proves it can read a save written by the
   browser build.
3. **Pause skipped the scheduler pass**, as above.

The palette check compares 687 values, including every ramp sampled at eight
points — which is where a rounding disagreement would have hidden. Floats are
compared as integer millionths with one unit of tolerance, because `backOut(0.5)`
is exactly 1.0876975 and `toFixed` and `snappedf` round it opposite ways: a
disagreement about a boundary, not about a curve.

## Verification

```bash
node tools/rng-parity.mjs      # joins `npm run port`
node tools/data-parity.mjs     # now covers palette and input
godot --headless --path godot --script res://tools/glue_probe.gd
```

The readiness line the title screen prints carries a table count, so adding two
tables moves it from `tables=11` to `tables=13` and `tools/web-smoke.mjs` has to
agree — which is the check working as intended rather than a chore.
