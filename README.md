# Aetherbound

Aetherbound is a browser RPG about a company of travellers following the heat of a buried Engine. This repository contains the fresh Three.js runtime, the authored game data and assets, and the static-site deployment.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:4173`. Use WASD or the arrow keys to move, Shift to run, Enter to interact, C to open the ledger, and B to start a test encounter.

## Verify

```sh
npm run check
```

The check covers map links and combat state, creates the production build, then drives the title, field movement, actor animation, and battle impact timing in Chromium.
