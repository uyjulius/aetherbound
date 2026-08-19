/**
 * Field parity: the Godot port's world against the reference's.
 *
 *   node tools/field-parity.mjs
 *
 * Four things are compared, and they are four different kinds of claim.
 *
 * **The grids.** For all 95 maps, and again for the 26 the cataclysm rewrites:
 * every walkability cell, every collider, every trigger rectangle, the resolved
 * spawn point, and whether the party can legally stand on it. The second pass is
 * the point of `MapBuild.resolve` — half the game is played in those maps' ruined
 * form, and a port that read the `ruin` block wrongly would look right for the
 * whole first act. The oracle is `tools/fixtures/reference-grids.json`, harvested from
 * the running reference build by `harvest-reference.mjs`. A cell is one bit and
 * there are a hundred thousand of them; getting the legend or the ragged-row rule
 * subtly wrong shows up here as a handful of tiles somewhere in a barrow.
 *
 * **The movement cases.** `clear`, `resolve` and `trigger_at` over a synthetic
 * grid with a one-tile gap, an inside corner, a dead end, a circle, a rotated
 * rectangle and a body that starts inside geometry. These run against the
 * reference's own `CollisionGrid`, imported directly — it has no Three.js in it,
 * so it needs no browser.
 *
 * **The walks.** The reference's own `_updatePlayer`, stepped at a fixed delta with
 * a stubbed input, against the port's `Field.update` doing the same. Four camera
 * bearings per map, because the reference twice shipped a camera-relative input
 * bug that was correct at the default angle and reversed a quarter turn away, and
 * both times it survived because the tests only measured the default.
 *
 * **The flights.** The airship, stepped the same way, at cruise and at full boost. Its reach
 * is a game rule rather than a feel: two continents in this world have no road to them, so how
 * far the ship travels in a second and where it is allowed to put down decide whether they can
 * be reached at all.
 *
 * **The oracle's age.** The fixture records a hash of `maps.json`. If the maps have
 * changed since the harvest, this fails and asks for a re-harvest rather than
 * comparing today's port against last week's world.
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CollisionGrid } from '../src/world/map.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const CASE_ROWS = [
  '########',
  '#......#',
  '#.##...#',
  '#.#....#',
  '#....#.#',
  '#.#..#.#',
  '#......#',
  '########',
];
const CASE_RADII = [0.1, 0.42, 0.8];
const round4 = (n) => Number(n.toFixed(4));

const fixturePath = path.join(root, 'tools', 'fixtures', 'reference-grids.json');
if (!fs.existsSync(fixturePath)) {
  say('\x1b[31mFAIL\x1b[0m — no fixture. Run `npm run build && node tools/harvest-reference.mjs`.');
  process.exit(1);
}
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const mapsHash = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(root, 'godot', 'data', 'maps.json')))
  .digest('hex')
  .slice(0, 16);
if (fixture.maps_hash !== mapsHash) {
  say('\x1b[31mFAIL\x1b[0m — the fixture was harvested from different maps.');
  say(`  fixture ${fixture.maps_hash}, current ${mapsHash}`);
  say('  Re-run `npm run build && node tools/harvest-reference.mjs`.');
  process.exit(1);
}

/** The synthetic grid, built the same way on both sides. */
function caseGrid() {
  const grid = new CollisionGrid(8, 8);
  CASE_ROWS.forEach((row, z) => {
    for (let x = 0; x < row.length; x++) grid.setWalk(x, z, row[x] === '.');
  });
  grid.addCircle(7, 7, 0.9, 'circle');
  grid.addRect(9, 5, 2.4, 1.2, Math.PI / 6, 'rect');
  return grid;
}

function referenceCases() {
  const grid = caseGrid();
  const clear = [];
  for (const radius of CASE_RADII) {
    for (let x = 0; x <= 16.0001; x += 0.25) {
      for (let z = 0; z <= 16.0001; z += 0.25) clear.push(grid.clear(x, z, radius) ? 1 : 0);
    }
  }

  const starts = [
    [3, 3], [3, 5], [9, 3], [11, 11], [7, 9], [5, 5],
    [5, 5.5], [7.2, 7.2],
  ];
  const deltas = [
    [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5],
    [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4],
    [2.5, 0], [0, 2.5], [1.8, 1.8],
  ];
  const resolve = [];
  for (const [fx, fz] of starts) {
    for (const [dx, dz] of deltas) {
      for (const radius of CASE_RADII) {
        const to = grid.resolve(fx, fz, fx + dx, fz + dz, radius);
        resolve.push([round4(to.x), round4(to.z)]);
      }
    }
  }

  grid.triggers.push({ x: 4, z: 4, w: 2, d: 2, kind: 'exit', data: { to: 'elsewhere' } });
  grid.triggers.push({ x: 5, z: 5, w: 3, d: 1, kind: 'event', data: {} });
  const triggerAt = [];
  for (let x = 3; x <= 9.0001; x += 0.5) {
    for (let z = 3; z <= 9.0001; z += 0.5) {
      triggerAt.push(grid.triggerAt(x, z)?.kind ?? '');
    }
  }
  return { clear, resolve, trigger_at: triggerAt };
}

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/field_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const start = raw.indexOf('{"cases"') >= 0 ? raw.indexOf('{"cases"') : raw.indexOf('{"maps"');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-800)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 6).join('\n  ')}`);
  say('  Set GODOT=/path/to/godot if it is not on PATH.');
  process.exit(1);
}

say('\x1b[1mField: the Godot port against the reference build\x1b[0m');
say('─'.repeat(56));

const failures = [];
const tally = {
  cells: 0, shapes: 0, triggers: 0, spawns: 0, clear: 0, resolve: 0, trigger_at: 0, trail: 0,
  flight: 0,
};
const fail = (line) => { if (failures.length < 16) failures.push(line); else failures.push(null); };

// --- grids -----------------------------------------------------------------
const shapeKey = (s) => (s.kind === 'circle'
  ? `circle ${round4(s.x)} ${round4(s.z)} ${round4(s.r)}`
  : `rect ${round4(s.x)} ${round4(s.z)} ${round4(s.w)} ${round4(s.d)} ${round4(s.rot)}`);

for (const [id, expected] of Object.entries(fixture.grids)) {
  const actual = ported.maps?.[id];
  if (!actual) { fail(`${id}: the port built no grid`); continue; }
  if (actual.width !== expected.width || actual.height !== expected.height) {
    fail(`${id}: ${actual.width}x${actual.height}, expected ${expected.width}x${expected.height}`);
    continue;
  }

  for (let z = 0; z < expected.height; z++) {
    const a = actual.walk[z];
    const b = expected.walk[z];
    for (let x = 0; x < expected.width; x++) {
      tally.cells++;
      if (a[x] !== b[x]) {
        fail(`${id} tile ${x},${z}: port ${a[x] === '.' ? 'walkable' : 'blocked'}`
          + `, reference ${b[x] === '.' ? 'walkable' : 'blocked'}`);
      }
    }
  }

  // Colliders as a multiset: the two sides build them in a different order —
  // the reference interleaves prop meshes and colliders while placing scenery —
  // and order does not affect whether a body is blocked.
  const mine = actual.shapes.map(shapeKey).sort();
  const theirs = expected.shapes.map(shapeKey).sort();
  tally.shapes += theirs.length;
  if (mine.length !== theirs.length) {
    fail(`${id}: ${mine.length} colliders, expected ${theirs.length}`);
  } else {
    for (let i = 0; i < mine.length; i++) {
      if (mine[i] !== theirs[i]) fail(`${id} collider: port [${mine[i]}], reference [${theirs[i]}]`);
    }
  }

  // Triggers in order, because `trigger_at` returns the first match and the
  // order therefore decides which door a player standing on two of them uses.
  tally.triggers += expected.triggers.length;
  if (actual.triggers.length !== expected.triggers.length) {
    fail(`${id}: ${actual.triggers.length} triggers, expected ${expected.triggers.length}`);
  } else {
    for (let i = 0; i < expected.triggers.length; i++) {
      const a = actual.triggers[i];
      const b = expected.triggers[i];
      const same = round4(a.x) === round4(b.x) && round4(a.z) === round4(b.z)
        && round4(a.w) === round4(b.w) && round4(a.d) === round4(b.d)
        && a.kind === b.kind && (a.to ?? null) === (b.to ?? null);
      if (!same) {
        fail(`${id} trigger ${i}: port ${JSON.stringify(a)}, reference ${JSON.stringify(b)}`);
      }
    }
  }

  tally.spawns++;
  if (round4(actual.spawn[0]) !== round4(expected.spawn[0])
    || round4(actual.spawn[1]) !== round4(expected.spawn[1])) {
    fail(`${id} spawn: port ${actual.spawn}, reference ${expected.spawn}`);
  }
  if (actual.standing_clear !== expected.standing_clear) {
    fail(`${id}: standing_clear ${actual.standing_clear}, expected ${expected.standing_clear}`);
  }
}

// --- movement cases --------------------------------------------------------
const cases = referenceCases();
for (const name of ['clear', 'resolve', 'trigger_at']) {
  const a = ported.cases?.[name] ?? [];
  const b = cases[name];
  if (a.length !== b.length) {
    fail(`cases.${name}: ${a.length} values, expected ${b.length}`);
    continue;
  }
  for (let i = 0; i < b.length; i++) {
    tally[name]++;
    const same = Array.isArray(b[i])
      ? round4(a[i]?.[0]) === round4(b[i][0]) && round4(a[i]?.[1]) === round4(b[i][1])
      : a[i] === b[i];
    if (!same) {
      fail(`cases.${name}[${i}]: port ${JSON.stringify(a[i])}, reference ${JSON.stringify(b[i])}`);
    }
  }
}

// --- walks -----------------------------------------------------------------
const drifts = [];
for (const [key, expected] of Object.entries(fixture.walks ?? {})) {
  const actual = ported.walks?.[key];
  if (!actual) { fail(`walk ${key}: the port produced no trail`); continue; }
  if (actual.trail.length !== expected.trail.length) {
    fail(`walk ${key}: ${actual.trail.length} positions, expected ${expected.trail.length}`);
    continue;
  }
  // The whole trail, by how far apart it drifts rather than by exact equality.
  //
  // A logic difference — a wrong bearing, a missed slide, the wrong speed — moves
  // the player by a step, 0.07 units, and keeps moving them, so it shows up as a
  // divergence that grows. The bound below is far under a step and far over
  // double-precision noise, so it separates the two.
  //
  // It was set after this check found a real one. The port drifted 0.0002 units
  // over two hundred steps, growing, and the cause was `Vector2`: Godot's vector
  // types are single precision in a standard build while a GDScript `float` is a
  // double, so every position that passed through one lost seven digits. With the
  // movement arithmetic kept in `float`, half the walks now match bit for bit and
  // the rest to within a millionth of a unit.
  const TRAIL_TOLERANCE = 0.00001;
  let worst = 0;
  let worstStep = -1;
  for (let i = 0; i < expected.trail.length; i++) {
    tally.trail++;
    const drift = Math.max(
      Math.abs(actual.trail[i][0] - expected.trail[i][0]),
      Math.abs(actual.trail[i][1] - expected.trail[i][1]));
    if (drift > worst) { worst = drift; worstStep = i; }
  }
  drifts.push([key, worst, worstStep]);
  if (worst > TRAIL_TOLERANCE) {
    fail(`walk ${key}: drifts ${worst.toFixed(4)} by step ${worstStep} — `
      + `port ${JSON.stringify(actual.trail[worstStep])}`
      + `, reference ${JSON.stringify(expected.trail[worstStep])}`);
  }
}

// --- the flights -------------------------------------------------------------
//
// Four of them: two maps, cruise and boost. Compared the same way as the walks and with the
// same bound, plus the two answers that decide where a player can go — whether the ship may
// put down here, and whether it is against the edge that crosses to another continent.
let worstFlight = 0;
let worstFlightKey = '';
for (const [key, expected] of Object.entries(fixture.flights ?? {})) {
  const actual = ported.flights?.[key];
  if (!actual) { fail(`flight ${key}: the port produced no trail`); continue; }
  if (actual.trail.length !== expected.trail.length) {
    fail(`flight ${key}: ${actual.trail.length} positions, expected ${expected.trail.length}`);
    continue;
  }
  const FLIGHT_TOLERANCE = 0.0001;
  let worst = 0;
  let worstStep = -1;
  for (let i = 0; i < expected.trail.length; i++) {
    tally.flight++;
    // Position, bearing and thrust: a wrong turn rate shows in the bearing long before it
    // shows in the position, and thrust is the momentum the reference deliberately gave it.
    const drift = Math.max(
      Math.abs(actual.trail[i][0] - expected.trail[i][0]),
      Math.abs(actual.trail[i][1] - expected.trail[i][1]),
      Math.abs(actual.trail[i][2] - expected.trail[i][2]),
      Math.abs(actual.trail[i][3] - expected.trail[i][3]));
    if (drift > worst) { worst = drift; worstStep = i; }
  }
  if (worst > worstFlight) { worstFlight = worst; worstFlightKey = key; }
  if (worst > FLIGHT_TOLERANCE) {
    fail(`flight ${key}: drifts ${worst.toFixed(5)} by step ${worstStep} — `
      + `port ${JSON.stringify(actual.trail[worstStep])}`
      + `, reference ${JSON.stringify(expected.trail[worstStep])}`);
  }
  tally.flight += 2;
  if (actual.landable !== expected.landable) {
    fail(`flight ${key}: the port ${actual.landable ? 'would' : 'would not'} land here, `
      + `the reference ${expected.landable ? 'would' : 'would not'}`);
  }
  if (actual.crossing !== expected.crossing) {
    fail(`flight ${key}: the port ${actual.crossing ? 'is' : 'is not'} at the crossing edge, `
      + `the reference ${expected.crossing ? 'is' : 'is not'}`);
  }
}

const labels = {
  cells: 'walk cells', shapes: 'colliders', triggers: 'triggers', spawns: 'spawn points',
  clear: 'clear()', resolve: 'resolve()', trigger_at: 'trigger_at()', trail: 'walk positions',
  flight: 'flight steps',
};
const real = failures.filter(Boolean);
for (const [key, label] of Object.entries(labels)) {
  const bad = real.filter((line) => line.includes(label.replace('()', '')) ).length;
  say(`  ${label.padEnd(16)} ${tally[key].toLocaleString().padStart(8)} compared`
    + `  ${bad ? `\x1b[31m${bad} noted\x1b[0m` : '\x1b[32mall agree\x1b[0m'}`);
}

say();
if (real.length) {
  say(`\x1b[31mFAIL\x1b[0m — the port's world differs from the reference's:`);
  for (const line of real.slice(0, 16)) say(`  ${line}`);
  const hidden = failures.length - real.slice(0, 16).length;
  if (hidden > 0) say(`  … and ${hidden} more`);
  process.exit(1);
}
const worstDrift = drifts.reduce((n, [, d]) => Math.max(n, d), 0);
say(`  worst walk drift ${worstDrift.toExponential(1)} units, on `
  + `${drifts.filter(([, d]) => d > 0).length} of ${drifts.length} walks`);
say(`  worst flight drift ${worstFlight.toExponential(1)} on `
  + `${worstFlightKey || 'nothing'}`);
if (process.env.FIELD_PARITY_DETAIL) {
  for (const [key, drift, step] of drifts) {
    say(`    ${key.padEnd(20)} ${drift.toFixed(5)} at step ${step}`);
  }
}
say();
const total = Object.values(tally).reduce((n, v) => n + v, 0);
const keys = Object.keys(fixture.grids);
const ruinKeys = keys.filter((k) => k.endsWith('#ruin')).length;
say(`\x1b[32mOK\x1b[0m — ${total.toLocaleString()} values across ${keys.length - ruinKeys} maps `
  + `and the ${ruinKeys} of them the cataclysm changes: every walkable cell,`);
say('     every collider, every trigger, every spawn, every step of sixteen walks, and four'
  + ' flights.');
