/**
 * Find and download character models from Poly Pizza.
 *
 *   POLY_PIZZA_API_KEY=... node tools/fetch-characters.mjs --survey
 *   POLY_PIZZA_API_KEY=... node tools/fetch-characters.mjs --get <id> [<id>...]
 *
 * These are models made by people, which is the point — the character mesh
 * used to be computed in JavaScript from capsules and lofted tubes, and no
 * amount of tuning makes that read as hand-made, because it isn't.
 *
 * `--survey` is the important mode. The catalogue is mostly *static* props,
 * and a character with no skeleton cannot be driven by the game's fourteen
 * animation clips. So this downloads candidates, cracks open each GLB and
 * reports whether it actually carries skins and joints, rather than trusting
 * the title. Deciding that from thumbnails would waste a lot of downloads.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const OUT = path.join(root, 'assets/models');
const KEY = process.env.POLY_PIZZA_API_KEY;

if (!KEY) {
  console.error('Set POLY_PIZZA_API_KEY. See the project memory for the key.');
  process.exit(2);
}

const args = process.argv.slice(2);
const api = async (p) => {
  const res = await fetch(`https://api.poly.pizza/v1.1${p}`, {
    headers: { 'x-auth-token': KEY },
  });
  if (!res.ok) throw new Error(`poly.pizza ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

/**
 * Read the JSON chunk out of a GLB and report what the file actually contains.
 *
 * A glTF is only "rigged" if it has skins *and* the meshes reference them; a
 * file can carry an armature that nothing is bound to, which looks rigged in a
 * viewer's outliner and animates nothing.
 */
function inspectGLB(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) return { error: 'not a GLB' };
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const skinned = (json.nodes ?? []).filter((n) => n.skin !== undefined).length;
  const joints = (json.skins ?? []).reduce((n, s) => n + (s.joints?.length ?? 0), 0);
  return {
    meshes: (json.meshes ?? []).length,
    skins: (json.skins ?? []).length,
    skinnedNodes: skinned,
    joints,
    animations: (json.animations ?? []).length,
    materials: (json.materials ?? []).length,
    nodes: (json.nodes ?? []).length,
    rigged: skinned > 0 && joints > 0,
    jointNames: (json.skins?.[0]?.joints ?? []).slice(0, 24)
      .map((i) => json.nodes[i]?.name).filter(Boolean),
  };
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

fs.mkdirSync(OUT, { recursive: true });

if (args.includes('--survey')) {
  // Terms chosen to cover both the look we want and the words modellers
  // actually tag rigged humanoids with.
  const terms = [
    'character', 'chibi', 'rigged character', 'animated character',
    'hero', 'knight', 'villager', 'adventurer', 'rpg character',
    'low poly character', 'cute character', 'person', 'human',
  ];

  const seen = new Map();
  for (const t of terms) {
    try {
      const r = await api(`/search/${encodeURIComponent(t)}`);
      for (const m of r.results ?? []) if (!seen.has(m.ID)) seen.set(m.ID, { ...m, term: t });
    } catch (err) {
      console.error(`[search] ${t} — ${err.message}`);
    }
  }
  console.log(`[survey] ${seen.size} unique models across ${terms.length} terms\n`);

  const rows = [];
  let n = 0;
  for (const m of seen.values()) {
    if (!m.Download) continue;
    n++;
    try {
      const buf = await download(m.Download);
      const info = inspectGLB(buf);
      rows.push({ ...m, info, bytes: buf.length });
      if (info.rigged) {
        fs.writeFileSync(path.join(OUT, `${m.ID}.glb`), buf);
        console.log(`RIGGED  ${m.ID}  ${String(m.Title).slice(0, 34).padEnd(34)} `
          + `joints=${info.joints} anims=${info.animations} tris≈${m['Tri Count'] ?? '?'}`);
        if (info.jointNames.length) console.log(`        bones: ${info.jointNames.join(', ')}`);
      }
    } catch (err) {
      // A dead asset link is not worth stopping a survey for.
    }
  }

  const rigged = rows.filter((r) => r.info.rigged);
  console.log(`\n[survey] inspected ${n}; ${rigged.length} are actually rigged`);
  fs.writeFileSync(path.join(OUT, 'survey.json'),
    JSON.stringify(rows.map((r) => ({
      id: r.ID, title: r.Title, term: r.term, attribution: r.Attribution,
      download: r.Download, ...r.info,
    })), null, 2));
  console.log(`[survey] full report → ${path.relative(root, path.join(OUT, 'survey.json'))}`);
}

for (let i = args.indexOf('--get') + 1; i > 0 && i < args.length; i++) {
  const id = args[i];
  if (id.startsWith('--')) break;
  const m = await api(`/model/${id}`);
  const buf = await download(m.Download);
  fs.writeFileSync(path.join(OUT, `${id}.glb`), buf);
  console.log(`[get] ${id} ${m.Title} → assets/models/${id}.glb`);
  console.log(`      ${m.Attribution}`);
}
