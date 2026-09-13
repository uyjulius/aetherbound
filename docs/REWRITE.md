# Aetherbound rewrite: The Warm Earth

## Brief

Build a complete original 3D party RPG inspired by Final Fantasy IV. The previous rewrite is a prototype, not evidence of a complete game. The release must support a coherent journey from New Journey to an ending through exploration, story changes, tactical battles and character growth.

The inspiration is a dramatic party adventure with distinctive character roles and active-time commands. Square Enix describes FFIV's diverse cast, deep plot and Active Time Battle system: https://eu.finalfantasy.com/news/513 . Aetherbound retains its own cast, setting, dialogue, models and music.

## Release requirements and evidence

- **3D presentation:** textured environments with coherent scale, readable paths/doors, grounded animated characters, a camera that keeps navigation visible, contextual battle backgrounds, visible attack/cast/hit/death/victory sequences. Verify screenshots and actual movement/action clips across town, road, interior, dungeon and boss scenes.
- **Tactical combat:** explicit targets; front/back formation; distinct permanent character roles; magic costs and elemental strengths; defend, protection, recovery/revival, statuses, escape; enemy patterns and boss phases; result screens; persistent rewards. Verify deterministic model tests and real keyboard/mouse playthroughs including defeat and recovery.
- **Complete campaign:** authored opening, escalating conflict, party changes, at least three substantial story chapters with dungeons/bosses and a resolved ending. Suggested arc: Harrowmere/Fen Barrow discovery; Ferran/Solmere conflict; the Engine summit and return. Quest text must lead to reachable objectives. Verify a new-save-to-ending playthrough through ordinary interactions.
- **Exploration:** collision agrees with visible geometry; followers stay on navigable routes; NPC conversations, map exits, doors, chests, checkpoints and quest triggers work. Verify campaign route movement and map re-entry with saved locations.
- **RPG progression:** experience and class growth, equipment choices, functional merchants/inns, usable inventory, meaningful rewards, party formation and recruitment. Verify buy/equip/use/revive/level-up flows and resource conservation.
- **Usability:** polished readable UI, keyboard and pointer controls with reliable focus/cancel behavior; clear onboarding and battle help; responsive layouts and touch controls; audio and battle settings; no placeholder interactions. Verify desktop and mobile-sized pages.
- **Persistence and reliability:** versioned validated saves, checkpoint recovery, safe new/continue, no duplicate rewards or actions, no softlocks on missing resources. Verify save round trips, invalid saves and normal transitions.
- **Shipping:** replace the whole legacy runtime with the fresh architecture; reproducible build and relevant CI gates; deploy to aetherbound.uy.sg through the existing GitHub Actions pipeline. Verify the deployed commit and live journey.

## Current audit (2026-09-13)

Base f55cda7 renders models and a basic encounter, but the three unit tests and short browser check do not cover most release requirements. Field `take('interact')` has no input binding. Shops show placeholder text. No story trigger dispatcher or ending exists. Attacks choose random targets, dead heroes are omitted, and there is no revival. HP normalization can discard earned growth. Every battle uses one bare arena. Ground textures are retained but unused. These are incomplete work, not accepted limitations.

## Work sequence

1. Combat, class identity, resource correctness, input and save foundations.
2. Campaign and quest/trigger orchestration with real merchants, equipment and recovery.
3. World geometry, textures, navigation/camera, contextual battle stages and mobile controls.
4. Full playthrough, balance, visual iteration, deployment and final requirement audit.

Update this file with evidence as implementation proceeds; do not mark the overall goal complete based on a subset of gates.

## Combat foundation evidence

Implemented on `feature/iv-inspired-rewrite` after f55cda7:

- Explicit keyboard/pointer target menus with cancellation; fixed roles and unique abilities; front/back damage, Cover, Prayer and Skyfall; spell and item menus; revival keeps fallen heroes in the roster; visible boss intent; Wait/Active setting; escape and result confirmation.
- Simulation and presentation are separated: a frame-driven 0.65-second lead-in precedes impact, then reactions finish before another action. Duplicate impact/reward calls are idempotent. Animation time pauses when the tab is hidden.
- Field Enter binding works. Aether marks restore, save and record checkpoint positions. Defeat returns there after confirmation. Save normalization preserves depleted inventory, validates active members and derives level stats from authored growth.
- `npm run check`: 12 model/state/data tests pass. Chromium exercises real savepoint input, actual skeleton pose changes while walking, keyboard target cancellation/selection, pre-impact HP preservation, selected-target damage, victory hold/reward/return, item-menu revival, a lethal boss wave, held death clips and checkpoint recovery. Screenshots captured under `.renders/rewrite-*.png` and inspected.

The broader goal remains incomplete. Current battle environments are an initial textured stage, not finished art. The existing campaign still stops after the elder conversation; shops, equipment, quest triggers, navigation polish and mobile controls remain release work. No new main/production deployment is claimed by these checks.
