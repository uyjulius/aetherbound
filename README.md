# Aetherbound

Aetherbound is a browser RPG about a company of travellers following the heat of a buried Engine. This repository contains the fresh Three.js runtime, the authored game data and assets, and the static-site deployment.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:4173`. Use WASD or the arrow keys to move, Shift to run, Enter to interact, C to open the ledger, and M for the area map. Touch screens have a direction pad, Run, Act, Map and Ledger controls. Add `?test` to the URL to enable B for a test encounter.

## Verify

```sh
npm run check
```

The check covers combat, campaign gates, reachable maps, equipment, trading, field items, boss balance, save migration and resource integrity. Chromium exercises skeletal movement, explicit targets, timed impacts, victory, revival, field healing, checkpoint recovery, failed asset loading and touch controls.

Run `npm run check:release` for the complete gate, including presentation checks across eight environments and a browser journey through all three chapters, purchases, recruitment, four bosses, the ending and save/continue. The campaign runner uses ordinary keyboard movement and UI commands; it does not teleport, change combat stats or set story flags. `npm run campaign` runs that journey against an existing build; `BASE_URL=https://aetherbound.uy.sg npm run campaign` verifies the deployed site. `npm run presentation` checks authored scene fixtures and portrait/landscape battle layouts.

The fresh campaign has 16 connected locations, a party that grows from three to five, permanent character roles, usable inventory, equipment, merchants and inns. Implementation and release evidence are tracked in [docs/REWRITE.md](docs/REWRITE.md).
