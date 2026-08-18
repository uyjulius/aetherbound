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
suspended coroutine. The reference build only cancels three routines, all of them
battle animations, so the port marks a routine cancelled and never resumes it —
which stops it at its next await and leaves it suspended. The test for this
asserts the routine stops changing state and that nothing is printed to the
error log; if Godot objects to a coroutine that is never resumed, the fallback is
a cancellation flag the routine checks, and that decision is recorded here.

## Verification

```bash
node tools/rng-parity.mjs      # joins `npm run port`
node tools/data-parity.mjs     # now covers palette and input
godot --headless --path godot --script res://tools/glue_probe.gd
```

The readiness line the title screen prints carries a table count, so adding two
tables moves it from `tables=11` to `tables=13` and `tools/web-smoke.mjs` has to
agree — which is the check working as intended rather than a chore.
