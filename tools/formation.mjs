/**
 * Adversarial check on the battle formation.
 *
 * The complaint this exists for is "the enemies are bunched up together", and
 * the obvious fix — push them further apart — has an equally obvious failure
 * mode: walk them out of frame. So this checks both, for every creature in the
 * game rather than the handful anyone would think to look at by hand:
 *
 *   1. no two enemies overlap on the ground
 *   2. every enemy is inside the camera's view
 *   3. the group stays centred rather than drifting to one side
 *
 * It drives the real placement code on a scratch container instead of starting
 * two thousand battles, so a full sweep takes seconds.
 *
 *   node tools/formation.mjs [--url http://localhost:5177] [--sizes 1,2,3,4,5,6]
 */

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const URL = flag('url', 'http://localhost:5177');
const SIZES = flag('sizes', '1,2,3,4,5,6').split(',').map(Number);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.state?.player, null, { timeout: 30000 });

// One real battle, purely to get hold of the view class and a framed camera.
await page.evaluate(() => window.__game.startBattle({ enemies: ['fenrat'] }));
await page.waitForFunction(() => window.__game.state?.enemies?.length > 0, null, { timeout: 20000 });
await page.waitForTimeout(2500);

const report = await page.evaluate(({ sizes }) => {
  const g = window.__game;
  const Box3 = window.THREE_BOX3;
  const V3 = window.THREE_V3;
  const Group = window.THREE_GROUP;
  const ViewCtor = g.state.view.constructor;
  const camera = g.renderer.camera;
  const ENEMIES = window.__enemies;
  const ENCOUNTERS = window.__encounters;

  /** Run the real placement code without building a whole battle. */
  const layout = (ids) => {
    const view = Object.create(ViewCtor.prototype);
    view.group = new Group();
    view.actors = new Map();
    view.renderer = g.renderer;
    const fakes = ids.map((id, i) => ({
      id: `probe-${i}`, name: ENEMIES[id]?.name ?? id, def: ENEMIES[id],
    }));
    if (fakes.some((f) => !f.def?.look)) return null;
    // A full party, because the enemy line has to stay clear of it — sliding
    // enemies apart is worthless if it walks them in among the heroes.
    view._placeParty(g.party.activeMembers.slice(0, 4));
    view._placeEnemies(fakes);
    // The camera adapts to the formation, so the on-screen test has to run it.
    // Measuring against whatever camera happened to be left over from another
    // fight tests nothing.
    view._frameCamera();
    return [...view.actors.values()].map((a) => {
      a.root.updateMatrixWorld(true);
      const box = new Box3().setFromObject(a.root);
      return { box, name: a.combatant.name, home: a.home, kind: a.kind };
    });
  };

  /**
   * How much of each other two creatures cover *on screen*.
   *
   * Ground separation is the wrong measure and it fooled an earlier version of
   * this file into passing a formation that was plainly bunched: the camera
   * looks along the axis that separated the ranks, so two creatures standing
   * metres apart in world space projected onto nearly the same pixels. What
   * the player sees is the projected silhouette, so that is what is measured —
   * the fraction of the smaller creature's screen area hidden by the larger.
   */
  const screenRect = (box) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const v = new V3(x, y, z).project(camera);
          x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
          y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
        }
      }
    }
    return { x0, y0, x1, y1, area: Math.max(1e-6, (x1 - x0) * (y1 - y0)) };
  };

  const worstOverlap = (placed) => {
    const rects = placed.filter((p) => p.kind !== 'party')
      .map((p) => ({ ...screenRect(p.box), name: p.name }));
    let worst = 0, pair = null;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (w <= 0 || h <= 0) continue;
        const covered = (w * h) / Math.min(a.area, b.area);
        if (covered > worst) { worst = covered; pair = `${a.name}/${b.name}`; }
      }
    }
    return { sep: worst, pair };
  };

  /** How far outside the viewport the worst corner sits, in NDC. */
  const worstOffscreen = (placed) => {
    let worst = 0, who = null;
    for (const p of placed) {
      const { min, max } = p.box;
      for (const c of [[min.x, min.y, min.z], [max.x, min.y, max.z],
        [min.x, max.y, max.z], [max.x, max.y, min.z],
        [min.x, min.y, max.z], [max.x, min.y, min.z]]) {
        const v = new V3(c[0], c[1], c[2]).project(camera);
        const over = Math.max(Math.abs(v.x) - 1, Math.abs(v.y) - 1);
        if (over > worst) { worst = over; who = p.name; }
      }
    }
    return { over: worst, who };
  };

  const cases = [];
  for (const [id, def] of Object.entries(ENEMIES)) {
    // Bosses are staged alone — the game never spawns six of them, and
    // testing that invents a composition no player can reach. Their size is
    // still exercised, at the count they actually appear in.
    const counts = def.boss ? [1] : sizes;
    for (const n of counts) cases.push({ label: `${id} x${n}`, ids: Array.from({ length: n }, () => id) });
  }
  // Every authored encounter group, which is where mixed species actually occur.
  for (const [key, table] of Object.entries(ENCOUNTERS)) {
    for (const grp of table.groups ?? []) {
      const ids = grp.enemies ?? grp;
      if (Array.isArray(ids)) cases.push({ label: `encounter ${key}: ${ids.join('+')}`, ids });
    }
  }

  const overlaps = [], offscreen = [], skipped = [], crossed = [];
  let sidesWorst = 0, sidesCase = null;
  const MAX_COVER = 0.34;
  let minSep = 0, minSepCase = null, maxOver = 0, maxOverCase = null;
  for (const c of cases) {
    const placed = layout(c.ids);
    if (!placed) { skipped.push(c.label); continue; }
    const o = worstOverlap(placed);
    if (o.sep > minSep) { minSep = o.sep; minSepCase = `${c.label} (${o.pair})`; }
    // A little mutual cover is normal in any crowd scene; more than a third
    // of a creature hidden means the player cannot tell how many there are.
    if (o.sep > MAX_COVER) overlaps.push(`${c.label} — ${o.pair} ${(o.sep * 100).toFixed(0)}% covered`);
    const eR = placed.filter((p) => p.kind !== 'party').map((p) => ({ ...screenRect(p.box), name: p.name }));
    const pR = placed.filter((p) => p.kind === 'party').map((p) => ({ ...screenRect(p.box), name: p.name }));
    for (const e of eR) {
      for (const q of pR) {
        const w = Math.min(e.x1, q.x1) - Math.max(e.x0, q.x0);
        const h = Math.min(e.y1, q.y1) - Math.max(e.y0, q.y0);
        if (w > 0 && h > 0) {
          const cover = (w * h) / Math.min(e.area, q.area);
          if (cover > sidesWorst) { sidesWorst = cover; sidesCase = `${c.label} (${e.name} over ${q.name})`; }
          if (cover > 0.12) crossed.push(`${c.label} — ${e.name} stands over ${q.name} (${(cover*100).toFixed(0)}%)`);
        }
      }
    }
    const s = worstOffscreen(placed);
    if (s.over > maxOver) { maxOver = s.over; maxOverCase = `${c.label} (${s.who})`; }
    if (s.over > 0) offscreen.push(`${c.label} — ${s.who} is ${(s.over * 100).toFixed(0)}% past the edge`);
  }
  return {
    total: cases.length, skipped: skipped.length,
    overlaps, offscreen, crossed, sidesWorst, sidesCase,
    minSep, minSepCase, maxOver, maxOverCase,
  };
}, { sizes: SIZES });

await browser.close();

const line = (ok, name, detail) => console.log(`[ ${ok ? 'ok' : 'FAIL'} ] ${name}${detail ? `  — ${detail}` : ''}`);

console.log(`${report.total} formations checked (${report.skipped} skipped for missing art)\n`);
line(report.overlaps.length === 0, 'no enemy is hidden behind another',
  `worst mutual cover ${(report.minSep * 100).toFixed(0)}% — ${report.minSepCase ?? 'single'}`);
for (const o of report.overlaps.slice(0, 12)) console.log(`         ${o}`);
if (report.overlaps.length > 12) console.log(`         …and ${report.overlaps.length - 12} more`);

line(report.offscreen.length === 0, 'every enemy is on screen',
  report.maxOver > 0 ? `worst ${(report.maxOver * 100).toFixed(0)}% past the edge — ${report.maxOverCase}`
    : `closest approach to the edge is inside the frame`);
for (const o of report.offscreen.slice(0, 12)) console.log(`         ${o}`);
if (report.offscreen.length > 12) console.log(`         …and ${report.offscreen.length - 12} more`);

line(report.crossed.length === 0, 'enemies keep to their own side',
  `worst enemy-over-hero ${(report.sidesWorst * 100).toFixed(0)}% — ${report.sidesCase ?? 'none'}`);
for (const o of report.crossed.slice(0, 8)) console.log(`         ${o}`);
if (report.crossed.length > 8) console.log(`         …and ${report.crossed.length - 8} more`);

const failed = report.overlaps.length + report.offscreen.length + report.crossed.length;
console.log(`\n${failed === 0 ? 'Formation is clean.' : `${failed} formation problems.`}`);
process.exit(failed === 0 ? 0 : 1);
