/**
 * Wall geometry audit — holes you can see through.
 *
 *   node tools/geometry.mjs
 *
 * `audit.mjs` asks whether content can be reached and `collision.mjs` asks
 * whether the player can walk where the floor says they can. This asks a
 * third question that neither covers: **is the room actually closed?**
 *
 * `buildTerrain` in src/world/map.js does not build a box for every wall
 * cell. Interior fill — a wall cell buried inside a rock mass — is never seen
 * from the play area, and building it would multiply the draw calls for
 * nothing. That optimisation is right. What was wrong is the test it used:
 * a cell counted as visible only if one of its four *orthogonal* neighbours
 * was walkable, and the corner of a rectangular room touches the floor only
 * on the diagonal. So every room in the game was built with its four corners
 * missing, and the player could see through the notch into the void behind
 * the map — most obvious in the twenty interiors, where there is no sky
 * behind the hole to hide it.
 *
 * The check derives the visible set independently — a cell is visible if any
 * of the eight surrounding cells is walkable, which is what "on the room's
 * silhouette" means — and then asks whether the renderer's own rule
 * (`WALL_EXPOSURE`) would build all of it. Only the rule is imported, never
 * the answer: a checker that shares the code it is checking cannot catch the
 * code being wrong, but a checker that re-derives the requirement and holds
 * the implementation against it can.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGEND, WALL_EXPOSURE } from '../src/world/map.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const mapDir = path.join(root, 'src/data/maps');
const maps = new Map();
for (const file of fs.readdirSync(mapDir).filter((f) => f.endsWith('.js'))) {
  const mod = await import(path.join(mapDir, file));
  for (const value of Object.values(mod)) {
    if (!value || typeof value !== 'object') continue;
    if (value.terrain && value.id) maps.set(value.id, value);
    else for (const inner of Object.values(value)) {
      if (inner?.terrain && inner.id) maps.set(inner.id, inner);
    }
  }
}

/** The cell record a glyph resolves to, matching the renderer's lookup. */
function cellOf(def, x, z) {
  const T = def.terrain;
  if (z < 0 || z >= T.length) return {};
  const row = T[z];
  if (x < 0 || x >= row.length) return {};
  return LEGEND[row[x]] ?? {};
}

/** Every direction a floor tile can sit in and still put this cell on the silhouette. */
const VISIBLE_FROM = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Wall cells a player can see that the renderer's rule would skip.
 *
 * `VISIBLE_FROM` is the requirement, written out here so it does not move
 * when the implementation does; `WALL_EXPOSURE` is what the renderer will
 * actually consult.
 */
function holesIn(def) {
  const T = def.terrain;
  const H = T.length;
  const holes = [];
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < T[z].length; x++) {
      const c = cellOf(def, x, z);
      if (!c.wall && !c.cliff) continue;
      const built = WALL_EXPOSURE.some(([dx, dz]) => cellOf(def, x + dx, z + dz).walk);
      if (built) continue;
      const seen = VISIBLE_FROM.some(([dx, dz]) => cellOf(def, x + dx, z + dz).walk);
      if (seen) holes.push([x, z]);
    }
  }
  return holes;
}

say('\x1b[1mWall geometry: cells the renderer skips that the player can see\x1b[0m');
say('─'.repeat(62));

const offenders = [];
let totalHoles = 0;
for (const [id, def] of maps) {
  const holes = holesIn(def);
  if (!holes.length) continue;
  offenders.push({ id, kind: def.kind ?? '—', holes });
  totalHoles += holes.length;
}

offenders.sort((a, b) => b.holes.length - a.holes.length);
for (const o of offenders.slice(0, 15)) {
  say(`  ${o.id.padEnd(24)} ${String(o.kind).padEnd(10)} ${String(o.holes.length).padStart(3)} `
    + `holes  e.g. ${o.holes.slice(0, 3).map(([x, z]) => `(${x},${z})`).join(' ')}`);
}
if (offenders.length > 15) say(`  …and ${offenders.length - 15} more maps`);

say();
say(`${maps.size} maps checked, ${offenders.length} with holes, ${totalHoles} holes total`);

if (totalHoles) {
  say();
  say('\x1b[31mFAIL\x1b[0m — a wall cell that touches the floor diagonally is on the room\'s');
  say('silhouette. Skipping it leaves a notch the player can see through, and in an');
  say('interior there is no sky behind it to hide the hole.');
  process.exit(1);
}
say('\x1b[32mOK\x1b[0m — every wall cell a player can see is built.');
