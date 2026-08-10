/**
 * Find and download monster models from Poly Pizza.
 *
 *   POLY_PIZZA_API_KEY=... node tools/fetch-monsters.mjs --survey
 *   POLY_PIZZA_API_KEY=... node tools/fetch-monsters.mjs --get <id> [<id>...]
 *
 * The same job `fetch-characters.mjs` did for the cast, for the bestiary. The
 * monsters were 700 lines of spheres, cones and cylinders bolted together in
 * JavaScript and animated by sine waves — the identical approach that was
 * thrown out for the party, and it reads the same way: like an equation, not
 * like a creature.
 *
 * Search terms are grouped by the nine body plans the game's 200 enemies are
 * written against, so the survey reports coverage per plan rather than a heap
 * of models with no idea whether anything can play a spider.
 *
 * Unlike the cast, a monster does *not* have to be rigged. A static mesh is
 * still an artist's mesh, and the battle view can move a whole creature —
 * lunge, recoil, die — without touching a skeleton. Rigged ones are preferred
 * and reported first; static ones are kept as a fallback so no plan ends up
 * with nothing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const OUT = path.join(root, 'assets/monsters');
const KEY = process.env.POLY_PIZZA_API_KEY;

if (!KEY) {
  console.error('Set POLY_PIZZA_API_KEY. See the project memory for the key.');
  process.exit(2);
}

const args = process.argv.slice(2);
const api = async (p) => {
  const res = await fetch(`https://api.poly.pizza/v1.1${p}`, { headers: { 'x-auth-token': KEY } });
  if (!res.ok) throw new Error(`poly.pizza ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return res.json();
};

/** The nine plans the bestiary is written against, and what to search for. */
const PLANS = {
  quadruped: ['wolf', 'bear', 'boar', 'rat', 'low poly animal', 'fox', 'monster animal'],
  humanoid: ['goblin', 'orc', 'troll', 'bandit', 'imp', 'ogre', 'monster humanoid'],
  undead: ['skeleton', 'zombie', 'ghost', 'wraith', 'undead', 'mummy'],
  insect: ['spider', 'beetle', 'scorpion', 'ant', 'insect', 'bug monster'],
  avian: ['bat', 'bird monster', 'crow', 'harpy', 'gargoyle', 'dragon'],
  construct: ['golem', 'robot', 'mech', 'statue monster', 'automaton', 'turret'],
  plant: ['plant monster', 'mushroom monster', 'treant', 'carnivorous plant', 'vine monster'],
  blob: ['slime', 'blob', 'ooze', 'jelly monster', 'slime monster'],
  floater: ['eye monster', 'floating monster', 'wisp', 'jellyfish', 'ghost orb', 'flying eye'],
};

function inspectGLB(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) return { error: 'not a GLB' };
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const skinned = (json.nodes ?? []).filter((n) => n.skin !== undefined).length;
  const joints = (json.skins ?? []).reduce((n, s) => n + (s.joints?.length ?? 0), 0);
  return {
    meshes: (json.meshes ?? []).length,
    skins: (json.skins ?? []).length,
    joints,
    animations: (json.animations ?? []).length,
    animNames: (json.animations ?? []).map((a) => a.name).slice(0, 12),
    rigged: skinned > 0 && joints > 0,
  };
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

fs.mkdirSync(OUT, { recursive: true });

if (args.includes('--survey')) {
  const byPlan = new Map();
  const seen = new Map();

  for (const [plan, terms] of Object.entries(PLANS)) {
    byPlan.set(plan, []);
    for (const t of terms) {
      try {
        const r = await api(`/search/${encodeURIComponent(t)}`);
        for (const m of r.results ?? []) {
          if (!m.Download) continue;
          if (!seen.has(m.ID)) seen.set(m.ID, { ...m, plan, term: t });
          byPlan.get(plan).push(m.ID);
        }
      } catch (err) {
        console.error(`[search] ${plan}/${t} — ${err.message}`);
      }
    }
  }
  console.log(`[survey] ${seen.size} unique models across ${Object.keys(PLANS).length} plans\n`);

  const rows = [];
  for (const m of seen.values()) {
    try {
      const buf = await download(m.Download);
      const info = inspectGLB(buf);
      // Reject the enormous ones: a battle can stage six at once.
      const tris = Number(m['Tri Count'] ?? 0);
      const ok = !info.error && info.meshes > 0 && (!tris || tris < 40000);
      if (!ok) continue;
      fs.writeFileSync(path.join(OUT, `${m.ID}.glb`), buf);
      rows.push({
        id: m.ID, title: m.Title, plan: m.plan, term: m.term,
        attribution: m.Attribution, creator: m.Creator?.Username ?? null,
        licence: m.Licence ?? m.License ?? null, tris, bytes: buf.length, ...info,
      });
      const tag = info.rigged ? `RIGGED anims=${info.animations}` : 'static';
      console.log(`${m.plan.padEnd(10)} ${String(m.Title).slice(0, 30).padEnd(30)} ${tag.padEnd(20)} ${m.ID}`);
    } catch {
      // A dead link is not worth stopping a survey for.
    }
  }

  fs.writeFileSync(path.join(OUT, 'survey.json'), JSON.stringify(rows, null, 2));
  console.log('\n[survey] coverage per plan:');
  for (const plan of Object.keys(PLANS)) {
    const mine = rows.filter((r) => r.plan === plan);
    console.log(`  ${plan.padEnd(10)} ${String(mine.length).padStart(3)} models `
      + `(${mine.filter((r) => r.rigged).length} rigged)`);
  }
  console.log(`\n[survey] → ${path.relative(root, path.join(OUT, 'survey.json'))}`);
}

for (let i = args.indexOf('--get') + 1; i > 0 && i < args.length; i++) {
  const id = args[i];
  if (id.startsWith('--')) break;
  const m = await api(`/model/${id}`);
  const buf = await download(m.Download);
  fs.writeFileSync(path.join(OUT, `${id}.glb`), buf);
  console.log(`[get] ${id} ${m.Title} → assets/monsters/${id}.glb`);
  console.log(`      ${m.Attribution}`);
}
