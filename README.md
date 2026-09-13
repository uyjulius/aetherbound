# Aetherbound

Aetherbound is a browser RPG about a company of travellers following the heat of a buried Engine. This repository contains the fresh Three.js runtime, the authored game data and assets, and the static-site deployment.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:4173`. Use WASD or the arrow keys to move, Shift to run, Enter to interact, C to open the ledger. Add `?test` to the URL to enable B for a test encounter.

## Verify

```sh
npm run check
```

The check covers combat targeting, roles, formation, revival, resources, statuses, reward integrity and save growth. Chromium then exercises field interaction, skeletal movement, keyboard target selection and cancellation, timed battle impacts, victory, revival and defeat/checkpoint recovery.

The full rewrite is in progress. Campaign, merchants, equipment and environment polish are tracked with release requirements in [docs/REWRITE.md](docs/REWRITE.md). Passing the current checks does not establish a complete campaign.
