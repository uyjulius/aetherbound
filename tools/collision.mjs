/**
 * Find invisible walls.
 *
 * A tile the player cannot walk on is fine when there is something standing
 * there — a building, a rock, a hedge. It is maddening when the ground looks
 * exactly like the road either side of it. This walks every map and reports
 * blocked ground with nothing visible on it, which is the difference between
 * "that is a wall" and "the game is broken".
 *
 * A blocked tile counts as *explained* when some piece of scene geometry
 * actually overlaps it. Everything else is an invisible wall.
 *
 *   node tools/collision.mjs [--url http://localhost:5177] [--map harrowmere]
 */

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const URL = flag('url', 'http://localhost:5177');
const ONLY = flag('map', null);
// The continents are 64x44 of instanced scenery and take minutes each to
// traverse; they are also not where the complaint lives. `--all` includes them.
const ALL = args.includes('--all');
const SKIP = new Set(['overworld', 'eastreach']);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.state?.player, null, { timeout: 30000 });

const maps = await page.evaluate(() => Object.keys(window.__maps ?? {}));
const targets = ONLY ? [ONLY] : maps.filter((m) => ALL || !SKIP.has(m));

const results = [];
for (const id of targets) {
  const r = await page.evaluate(async (mapId) => {
    const g = window.__game;
    await g.gotoMap(mapId, 'default');
    await new Promise((res) => setTimeout(res, 420));
    const st = g.state;
    if (!st?.map || g.currentMapId !== mapId) return null;

    const THREE_BOX3 = window.THREE_BOX3;
    const V3 = window.THREE_V3;
    const grid = st.map.grid;
    const TILE = 2;
    const R = 0.42;

    // Every solid thing on the map, as a world box. The ground plane and the
    // sky are excluded: they cover everything and would explain every tile.
    const solids = [];
    const collect = (root) => root.traverse((o) => {
      if (!o.isMesh && !o.isInstancedMesh) return;
      const name = (o.name || '') + (o.parent?.name || '');
      if (/sky|ground|terrain|decal|water/i.test(name)) return;
      const box = new THREE_BOX3().setFromObject(o);
      // Skip anything flat on the floor — painted markings, not obstacles.
      if (box.max.y - box.min.y < 0.35) return;
      // And the arena-sized meshes, which would explain every tile.
      if (box.max.x - box.min.x > 30 && box.max.z - box.min.z > 30) return;
      solids.push(box);
    });
    collect(st.map.group);
    // People are obstacles too, and they do not live in the map group. Leaving
    // them out made every villager look like an invisible wall.
    for (const n of st.npcs) collect(n.root);

    const covered = (wx, wz) => solids.some((b) =>
      wx >= b.min.x - 0.6 && wx <= b.max.x + 0.6
      && wz >= b.min.z - 0.6 && wz <= b.max.z + 0.6);

    // A tile is "reachable ground" if the terrain layer says it is walkable —
    // then anything blocking it comes from a collider, not the map's design.
    const bad = [];
    let blocked = 0;
    for (let tz = 0; tz < st.map.height; tz++) {
      for (let tx = 0; tx < st.map.width; tx++) {
        const wx = tx * TILE + TILE / 2;
        const wz = tz * TILE + TILE / 2;
        if (!grid.isWalkTile(tx, tz)) continue;   // designed as wall/water/void
        if (grid.clear(wx, wz, R)) continue;      // player can stand: fine
        blocked++;
        if (!covered(wx, wz)) bad.push([tx, tz]);
      }
    }
    return { id: mapId, name: st.mapDef.name, w: st.map.width, h: st.map.height, blocked, bad, solids: solids.length };
  }, id);
  if (r) results.push(r);
}

await browser.close();

let totalBad = 0;
const offenders = [];
for (const r of results) {
  totalBad += r.bad.length;
  if (r.bad.length) offenders.push(r);
}

console.log(`${results.length} maps walked\n`);
for (const r of offenders.sort((a, b) => b.bad.length - a.bad.length).slice(0, 20)) {
  const sample = r.bad.slice(0, 8).map(([x, z]) => `${x},${z}`).join(' ');
  console.log(`  ${r.name} (${r.id}) — ${r.bad.length} invisible of ${r.blocked} blocked  [${sample}${r.bad.length > 8 ? ' …' : ''}]`);
}
console.log(`\n${totalBad === 0
  ? 'Every blocked tile has something standing on it.'
  : `${totalBad} tiles block the player with nothing visible there.`}`);
process.exit(totalBad === 0 ? 0 : 1);
