/**
 * Harvest the reference build's collision state.
 *
 *   npm run build && node tools/harvest-reference.mjs
 *
 * Two files come out of this, and the difference between them is the whole
 * reason it exists:
 *
 * - `godot/data/footprints.json` — the colliders the port **cannot derive**. A
 *   building's rectangle is measured from the bounding box of the kit geometry
 *   that stands at body height, so it exists only once the reference has built
 *   the prop. Recomputing it in GDScript is impossible without shipping the same
 *   code-built geometry, and guessing it would put invisible walls in towns.
 * - `tools/fixtures/reference-grids.json` — the walk bitmap, the trigger list and
 *   every collider per map. The port is **compared** against this and never reads
 *   it. A checker handed the answer proves nothing.
 *
 * The fixture also carries **scripted walks**: the reference's own
 * `_updatePlayer` driven with a fixed delta and a stubbed input, for four camera
 * bearings on four maps, recording the trail position by position. That is the
 * only way to check the port's movement against the real thing rather than
 * against a restatement of it — and the bearings matter, because the reference
 * shipped a camera-relative input bug twice that was correct at the default angle
 * and reversed a quarter turn away.
 *
 * The fixture makes `field-parity.mjs` browser-free, which is what lets it run in
 * CI. It records a hash of `maps.json` so a stale oracle is an error rather than
 * a comparison against last week's world.
 *
 * This is the only tool here that needs a browser and a GPU, because the thing
 * being measured is geometry that only exists once Three.js has built it.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const port = Number(flag('port', 5179));
const only = flag('map', null);
const say = (s = '') => console.log(s);

if (!fs.existsSync(path.join(root, 'public', 'game.js'))) {
  say('\x1b[31mFAIL\x1b[0m — public/game.js is missing. Run `npm run build` first.');
  process.exit(1);
}

// The dev server, started here rather than assumed: this tool is run rarely and
// by hand, and "did you remember to start the server" is a bad first failure.
const server = spawn(process.execPath, [path.join(root, 'tools', 'serve.mjs')], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
});
const stopServer = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stopServer);

const browser = await chromium.launch({
  headless: true,
  // The reference is a Three.js game: no WebGL, no world to measure. The full
  // browser rather than `chrome-headless-shell`, which has none.
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

say('\x1b[1mHarvesting the reference build\x1b[0m');
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
// Boot ends at the title screen, so a campaign has to be started before there is
// a field to measure. Same door the smoke test uses.
await page.waitForFunction(
  () => window.__game?.state?.newGame || window.__game?.state?.player,
  null, { timeout: 60_000 });
await page.evaluate(() => window.__game.state.newGame?.());
await page.waitForFunction(() => window.__game?.state?.player, null, { timeout: 60_000 });

const maps = await page.evaluate(() => Object.keys(window.__maps ?? {}));
if (!maps.length) throw new Error('the page exposed no maps');
const targets = only ? [only] : maps;
/**
 * And the same places after the cataclysm.
 *
 * Twenty-six of the maps carry a `ruin` block — a different sky, different music,
 * props and people added and taken away — and the second half of the game is played
 * in it. Harvesting only the world before it would leave the port's `resolve` unchecked
 * against exactly the maps that need it, so those twenty-six are walked twice and the
 * ruined pass is keyed `<id>#ruin`.
 */
const ruined = await page.evaluate((ids) => ids.filter((id) => window.__maps[id]?.ruin), targets);
say(`  ${targets.length} maps, ${ruined.length} of them twice`);

const grids = {};
const footprints = {};
let colliderCount = 0;
let shared = 0;

/** Every map in one world, then the ruined ones in the other. */
const passes = [
  { state: 'whole', ids: targets, suffix: '' },
  { state: 'ruin', ids: ruined, suffix: '#ruin' },
];

for (const pass of passes) {
for (const id of pass.ids) {
  const harvested = await page.evaluate(async ({ mapId, worldState }) => {
    const game = window.__game;
    // Set before the map is asked for: `gotoMap` resolves the definition against
    // this, which is the whole mechanism under test.
    game.party.worldState = worldState;
    await game.gotoMap(mapId, 'default');
    await new Promise((resolve) => setTimeout(resolve, 380));
    const state = game.state;
    if (!state?.map || game.currentMapId !== mapId) return null;

    const grid = state.map.grid;
    const rows = [];
    for (let z = 0; z < state.map.height; z++) {
      let row = '';
      for (let x = 0; x < state.map.width; x++) row += grid.isWalkTile(x, z) ? '.' : '#';
      rows.push(row);
    }
    // Rounded on the way out: these are floats produced by a bounding-box
    // measurement, and comparing them to more precision than they carry would
    // fail on the last bit for no reason.
    const round = (n) => Number(n.toFixed(4));
    return {
      worldState: game.party.worldState,
      width: state.map.width,
      height: state.map.height,
      walk: rows,
      shapes: grid.shapes.map((s) => (s.kind === 'circle'
        ? { kind: 'circle', x: round(s.x), z: round(s.z), r: round(s.r), tag: s.tag ?? null }
        : {
          kind: 'rect', x: round(s.x), z: round(s.z), w: round(s.w), d: round(s.d),
          rot: round(s.rot ?? 0), tag: s.tag ?? null,
        })),
      triggers: grid.triggers.map((t) => ({
        x: round(t.x), z: round(t.z), w: round(t.w), d: round(t.d),
        kind: t.kind ?? null, to: t.data?.to ?? t.to ?? null,
      })),
      props: (state.mapDef.props ?? []).map((p) => ({
        at: p.at, kit: p.kit, id: p.id ?? null, solid: p.solid !== false,
      })),
      spawn: [round(state.player.x), round(state.player.z)],
      standing_clear: grid.clear(state.player.x, state.player.z, 0.42),
    };
  }, { mapId: id, worldState: pass.state });

  if (!harvested) {
    say(`  \x1b[33mskip\x1b[0m ${id} — the map did not load`);
    continue;
  }
  if (harvested.worldState !== pass.state) {
    say(`\x1b[31mFAIL\x1b[0m — ${id} was harvested in "${harvested.worldState}", `
      + `not "${pass.state}"`);
    process.exit(1);
  }
  const key = `${id}${pass.suffix}`;

  grids[key] = {
    width: harvested.width, height: harvested.height,
    walk: harvested.walk, triggers: harvested.triggers, shapes: harvested.shapes,
    spawn: harvested.spawn, standing_clear: harvested.standing_clear,
  };

  // Split the colliders: the ones tagged with a glyph-prop name are derivable
  // from the legend and the terrain, and the port must build those itself. What
  // is left belongs to authored props and is what gets written out as data.
  const glyphNames = new Set(Object.keys(
    JSON.parse(fs.readFileSync(path.join(root, 'godot', 'data', 'legend.json'), 'utf8')).glyph_radii));
  const authored = harvested.shapes.filter((s) => !glyphNames.has(s.tag));

  // Keyed by the collider's own world position, to two decimals.
  //
  // Not by tile: a prop's `at` is not necessarily integral — half-tile positions
  // are common, and `[16.5, 8.5]` rounds to tile 17,9 while the port would read
  // tile 16,8 from the same numbers. The world position is exactly the prop's
  // position with no rounding decision in it at all. A prop's `id` would be the
  // obvious key and is optional, and its index in the map file is not stable
  // across edits.
  //
  // A list per position rather than one entry: some props stack, and keeping only
  // the last would silently unblock one.
  const byTile = {};
  for (const shape of authored) {
    const key = `${shape.x.toFixed(2)},${shape.z.toFixed(2)}`;
    const entry = shape.kind === 'circle'
      ? { kind: 'circle', r: shape.r }
      : { kind: 'rect', w: shape.w, d: shape.d, rot: shape.rot };
    if (byTile[key]) {
      byTile[key].push(entry);
      shared++;
    } else {
      byTile[key] = [entry];
    }
    colliderCount++;
  }
  footprints[key] = byTile;
  process.stdout.write(`\r  ${key.padEnd(24)} ${harvested.width}x${harvested.height}  `
    + `${authored.length} authored colliders   `);
}
}
say();
// Back to the world the walks below expect.
await page.evaluate(() => { window.__game.party.worldState = 'whole'; });

if (pageErrors.length) {
  say(`\x1b[31mFAIL\x1b[0m — the page threw ${pageErrors.length} error(s):`);
  for (const line of pageErrors.slice(0, 3)) say(`  ${line}`);
  await browser.close();
  stopServer();
  process.exit(1);
}

// --- scripted walks --------------------------------------------------------
// The reference's own movement code, stepped by hand. Input is stubbed rather
// than synthesised as key events so the delta is exactly 1/60 every frame, and
// `_checkTriggers` is stubbed out because the port's `update` only *reports* a
// trigger where the reference acts on it — a walk that stepped on a door would
// otherwise change map halfway through and compare two different worlds.
const WALK_SCRIPT = [
  [[0, -1], 40], [[1, 0], 40], [[0, 1], 25],
  [[-1, 0], 55], [[0.7, -0.7], 40], [[-0.7, -0.7], 30],
];
const WALK_MAPS = ['harrowmere', 'inn_harrowmere', 'overworld', 'sunkenvault'];
const walks = {};

for (const id of WALK_MAPS) {
  if (!maps.includes(id)) continue;
  for (const detents of [0, 1, 2, 3]) {
    const walk = await page.evaluate(async ({ mapId, turn, script }) => {
      const game = window.__game;
      await game.gotoMap(mapId, 'default');
      await new Promise((resolve) => setTimeout(resolve, 380));
      const state = game.state;
      const input = window.__input;

      const bearing = Math.PI + turn * Math.PI / 4;
      state.camera.yaw = bearing;
      state.camera.targetYaw = bearing;
      state._checkTriggers = () => {};
      const realMove = input.moveVector.bind(input);
      const realDown = input.isDown.bind(input);

      const trail = [];
      let vector = { x: 0, y: 0 };
      input.moveVector = () => vector;
      input.isDown = () => false;
      try {
        for (const [move, steps] of script) {
          vector = { x: move[0], y: move[1] };
          for (let i = 0; i < steps; i++) {
            state._updatePlayer(1 / 60);
            trail.push([Number(state.player.x.toFixed(6)), Number(state.player.z.toFixed(6))]);
          }
        }
      } finally {
        input.moveVector = realMove;
        input.isDown = realDown;
      }
      return { trail, steps: Number(state.stepAccum.toFixed(4)) };
    }, { mapId: id, turn: detents, script: WALK_SCRIPT });
    walks[`${id}@${detents}`] = walk;
  }
  process.stdout.write(`\r  walked ${id.padEnd(18)}     `);
}
say();

const mapsHash = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(root, 'godot', 'data', 'maps.json')))
  .digest('hex')
  .slice(0, 16);

fs.writeFileSync(path.join(root, 'godot', 'data', 'footprints.json'),
  JSON.stringify(footprints));
fs.writeFileSync(path.join(root, 'tools', 'fixtures', 'reference-grids.json'),
  JSON.stringify({ maps_hash: mapsHash, harvested: targets.length, grids, walks }));

await browser.close();
stopServer();

say();
say(`  footprints  ${Object.keys(footprints).length} maps, ${colliderCount} colliders`);
say(`  fixture     ${Object.keys(grids).length} maps, ${Object.keys(walks).length} walks, `
  + `maps.json hash ${mapsHash}`);
if (shared) {
  say(`  shared      ${shared} collider(s) sit on a tile that already had one, and are kept`);
}
say();
say('\x1b[32mOK\x1b[0m — run `node tools/field-parity.mjs` to compare the port against this.');
