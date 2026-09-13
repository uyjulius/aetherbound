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

## Release verification: `7a2797a`

- All 19 unit tests, the production build, desktop/touch/recovery smoke and presentation checks passed in GitHub Actions.
- The smoke check verifies actual skeleton motion, run speed, selected targets, pre-impact HP preservation, visible impacts, victory hold/rewards, field healing, revival, held death poses, checkpoint recovery, touch controls, the area map and a failed asset download followed by a successful retry. It waits for the ledger to finish closing before sending the next keyboard command.
- Presentation checks and inspected captures cover town, inn, road, barrow, foundry, airship, mountain and the First Engine. All five heroes and their HP/MP are visible at desktop 1440×900, portrait 390×844, landscape 844×390 and short portrait 320×568. Hosted CI uses the same CSS viewports at lower pixel density for its software renderer.
- A clean local campaign completed all three chapters and four bosses, recruited both companions, reached the ending, returned to Harrowmere and reloaded the completed save. It recorded 19 victories with no browser errors or missing-resource responses. Movement and battle choices used ordinary controls throughout.
- The [release workflow](https://github.com/uyjulius/aetherbound/actions/runs/34763375420) runs smoke, presentation and campaign verification on independent runners. Deployment requires the build and every verification job to succeed. Browser captures are retained as workflow artifacts.

The full GitHub campaign and production deployment passed. The live `/build.json` reports `7a2797ae6d39`; SHA-256 checks of `index.html`, `app.js` and `style.css` match the local release build exactly.

A fresh live-domain journey passed from New Journey through all three chapters, all four bosses, both recruits, the ending, the return to Harrowmere and reload/Continue. It used ordinary movement and UI commands, with no browser errors or missing-resource responses. The live touch check also passed dialogue, saving, the area map, battle targeting, visible impact, victory and return to exploration. Inspected live captures are under `.renders/live-campaign-*.png` and `.renders/live-mobile-*.png`.

All release requirements above are implemented and verified. The deployed application release is `7a2797a`; later documentation-only commits do not change its build.
