# Aetherbound: The Warm Earth

A complete original 3D party RPG inspired by Final Fantasy IV’s dramatic party adventure and active-time commands. Aetherbound uses its own cast, setting, dialogue, models and music. The legacy Godot runtime was removed; the replacement is a fresh Three.js application built with esbuild and hosted through GitHub Pages.

## Implemented release scope

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Complete campaign | Three chapters, 16 connected maps, four bosses, two recruits and a resolved ending with a return home | `scripts/campaign-smoke.mjs` navigates from New Journey to the ending and reload/Continue using keyboard movement and UI commands only |
| Tactical combat | Wait/Active time, explicit targets, distinct roles, formation, Cover, Prayer, Skyfall, magic, elements, statuses, healing/revival, defend, escape and boss phases | Deterministic combat tests plus browser target, revival, victory and defeat checks |
| Animation | Skeletal walk/run, attack/cast, hit, death and victory poses; impacts occur after the action lead-in and results wait for confirmation | Browser checks inspect bone motion, pre-impact HP, selected-target damage and held death/result states |
| Grounded exploration | Separate party spawns, followers on the walked trail, textured paths, collision, threshold doors, NPCs, chests, mechanisms and checkpoints | Connected-route tests, eight scene fixtures and the full walking campaign |
| Progression | Five permanent character roles; experience/growth, five equipment slots, usable pack inventory, merchants, inns and recruitment | Ownership, gil, growth and resource conservation tests; purchase/equip/rest flows during the campaign |
| Presentation | Town and mountain backdrops, warm inns, stone barrows, metal foundries, animated valves/chests/aether marks, a rigged airship and contextual battle stages | Inspected `.renders/presentation-*.png` and `.renders/campaign-*.png` captures |
| Usability | Keyboard, pointer, touch direction pad/Run/Act, responsive ledger, an area map, onboarding, battle help and audio/battle settings | Desktop/touch smoke; portrait and landscape five-member battle framing and HP/MP visibility assertions |
| Persistence/recovery | Versioned validated saves, safe Continue, checkpoints, resource conservation, idempotent rewards and retryable model loading | Save tests, full completed-save reload, defeat recovery and an intentionally failed asset download followed by retry |
| Shipping | Reproducible static build; GitHub Actions runs the full release gate before publishing to aetherbound.uy.sg | `.github/workflows/pages.yml`; deployed identity is exposed at `/build.json` |

## Verification commands

- `npm run check`: 19 combat, campaign, map, progression and save tests; production build; desktop/touch/recovery smoke.
- `npm run presentation`: eight authored scene fixtures plus final-boss phone and landscape layouts. Fixtures set up saved scenes for visual inspection; they are separate from the normal-action campaign runner.
- `npm run campaign`: complete local journey with no teleporting, stat boosts, inventory injection or story-flag edits.
- `npm run check:release`: all of the above, required by the deployment workflow.
- `BASE_URL=https://aetherbound.uy.sg npm run campaign`: the same complete journey against production, using a fresh browser save. Captures use `.renders/live-campaign-*.png`.

The complete campaign passed at `de81dbc`, including all four bosses, five party members, the ending and reload/Continue, with no browser errors. The final presentation and reliability pass replaces mismatched well/valve props, adds the ship hull and rigging, improves dungeon materials and battle backgrounds, separates party spawns, fits all five heroes on phones and adds asset-load recovery. Its full release verification and deployed-domain journey are in progress. Deployment status and final results will be recorded after the gates finish.
