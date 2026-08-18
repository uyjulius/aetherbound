# Battle — the spine

*19 August 2026. Sub-project 4 of the Godot port.*

## Scope

The part of a fight that every fight has: combatants, the ATB gauges, whose turn
it is, attack, defend, item, spell, statuses, knockouts, victory, defeat, rewards
and fleeing. Plus the party model underneath it, because a combatant's numbers
come from a member's level, growth curve, equipment and magicite.

Out of scope, and named so the gap is visible rather than implied: the fourteen
per-character special commands (`attune`, `blitz`, `iaido`, `wager`, `mimic` and
the rest), summons, limit breaks and Scan. They are the widest part of battle.js
and the least structural — each is a self-contained resolution on top of the spine
this sub-project builds. They get sub-project 4b.

Also out: the battle *view* and its UI. Same reason as the field — the reference
draws its combatants from geometry computed in code, and that is an asset problem.

## What already exists

`formulas.gd` (damage, defence, ATB rate, hit chance, exp and gold shares, limit
gain) and `enemy_ai.gd` (the shared rule walk) are ported and checked — 3,804
values and 24,000 decisions. `scheduler.gd` exists because battle actions in the
reference are coroutines that yield, and they will port as `await`.

Missing underneath: `statAt`, `expForLevel` and `levelForExp` live in
`src/data/characters.js` rather than in `formulas.js`, so they have never been
compared. They are the first thing this sub-project ports, and the cheapest to
check: 14 characters × 8 stats × 99 levels is eleven thousand pure values.

## The oracle problem, and the answer

The other harnesses had an oracle that was either a pure function or a harvestable
grid. A battle is neither: it is a state machine driven by fractional time, and
its outcome depends on a stream of seeded random numbers.

`tools/balance.mjs` is *not* the oracle. It is a simulator that shares the AI walk
with the game and nothing else — it has its own battle loop, and comparing the port
against it would compare a port to an approximation.

So the battle is harvested like the walks were: the reference's own `BattleState`,
stepped at a fixed delta in a browser with `view` and `ui` replaced by no-ops, its
`battle` RNG stream reseeded to a known value, and a **scripted command policy**
(every player turn commits `attack` on the first living enemy). What comes out is a
frame-by-frame transcript — each combatant's HP, MP, ATB, statuses, turn count, the
phase, the active actor — and the port has to reproduce it exactly.

That is a much stronger claim than "the same damage numbers". It pins the order the
gauges fill in, the frame a turn opens on, when a status ticks down, and who dies
first.

Fixed delta matters twice over: ATB is `rate × dt × 16`, so a variable frame time
changes who acts first, and a transcript recorded at variable dt could not be
reproduced by anything.

## What the port is

| Piece | Path |
|---|---|
| Stat curves and the exp table | `godot/scripts/data/growth.gd` |
| Member and party | `godot/scripts/game/party.gd` |
| Combatants | `godot/scripts/battle/combatant.gd` |
| The fight | `godot/scripts/battle/battle.gd` |
| Statuses, as exported data | `godot/data/statuses.json` |

Statuses cross as data for the same reason the palette did: `STATUSES` is a table
of durations, kinds and flags, and retyping it is a way to get one flag wrong.

## Details that are scars, and are carried over deliberately

- **A blocked combatant serves its sentence on the clock it would have acted on.**
  Stop, Paralysis and Freeze all block turns; durations are counted in the victim's
  own turns and decremented when it acts. So the victim never acted, the counter
  never moved, and every one of them was permanent for the rest of the fight — a
  40% roll to remove a party member from the game. The gauge still fills for a
  blocked combatant; it buys a tick of the status instead of a turn.
- **Fleeing works with a menu open.** In wait mode a command menu is up almost
  every frame, so gating the escape hold on the active phase meant no battle could
  ever be fled.
- **A guard raised last turn lasts until this one.** That is the whole trade
  Defend offers, and it is spent when the character acts again.
- **A good status cancels its opposite rather than stacking.**

## Verification

```bash
node tools/growth-parity.mjs    # 11k stat values and the exp curve; no browser
node tools/harvest-battles.mjs  # occasional; needs a browser
node tools/battle-parity.mjs    # joins `npm run port`
```
