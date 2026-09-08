# Spell-effects verification

Scope: the ten tasks in `2026-08-29-particles-and-spell-effects.md`.
The material and post-processing phases belong to separate plans.

## Current evidence

- `npm run port`: every constituent suite printed green through bestiary. The command
  wrapper terminated the five-minute aggregate process after the final output, so its
  shell exit status is not used as evidence; the relevant effects suite printed 71
  comparisons and the audio, scenery, models, cast, and bestiary suites also printed
  their complete green summaries.
- `godot --headless --path godot --script res://tools/fx_probe.gd`: 71 checks pass;
  two renderer-only checks explicitly skip.
- The same probe with a real display driver: all 71 checks pass.
- `godot --path godot --script res://tools/render_spells.gd`: twelve distinct strips;
  every spell changes the empty stage. All twelve strips were visually inspected.
  Fire rises, ice gathers and shatters, bolt strikes vertically, earth erupts,
  and heal rises gently. The other effects also have distinct sequences.
- The renderer's `--mutation-empty` mode fails on empty/duplicate strips. A normal
  run restores the twelve visible strips in `.renders/spell_<element>.png`.
- Shortening ice's wait from 0.52 to 0.2 seconds fails parity on duration.
  Changing fire's burst from 70 to 71 fails on the emission transcript.
  Both mutations were restored, and parity passed again.
- A browser run exposed a missed final-burst count: physical emits particles just
  before its coroutine returns. The completion path now samples that burst.
  Removing that sampling fails the new view regression check; restoring it passes.
  The subsequent exported browser run reported `peak=22` for physical and `peak=62`
  for the corrected aether cast, then resolved the fight.
- Non-elemental spell selection now matches the reference: white magic uses holy,
  other magic uses aether, and healing uses heal. Explicit elements take precedence
  for other spells. The probe covers these choices.
- Exported full-pool CPU simulation/upload measurement: 2.498 ms per update for
  3,000 particles (15.0% of a 60 Hz frame budget) in the final browser run. This measures
  field updates, not total rendering cost. The pool remains at 3,000.
- A clean `npm run export:web` succeeds after restoring all mutations and applying
  the spell-selection correction.

## Final browser gate

`node tools/web-smoke.mjs --port 5180` exits 0 with readiness, field, scene, battle,
spell, particle, save, chest, menu, shop, equipment, inn, map, credits, analytics,
instrumentation, network, console, and engine-warning checks green. It reports the
corrected aether effect emitting particles, opens every map without warnings, and
credits all 86 generated models. The final line is:

`OK — the exported build boots in a browser and finds its data.`
