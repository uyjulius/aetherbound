/**
 * Find and download the scenery the Godot port stands in.
 *
 *   POLY_PIZZA_API_KEY=... node tools/fetch-props.mjs --survey [--kit tree]
 *   POLY_PIZZA_API_KEY=... node tools/fetch-props.mjs --get tree=abc123 rock=def456
 *   node tools/fetch-props.mjs --list
 *
 * The reference builds its world in JavaScript — a lamppost is a lathe, a cylinder and a
 * point light, assembled at runtime. That is the one thing this project does not do, and
 * moving the same arithmetic into Blender would be the same mistake with an extra step. So
 * the port's scenery is models made by people, from poly.pizza, chosen deliberately and
 * recorded with their author and licence.
 *
 * There are eighteen kits and 2,842 placements across ninety-five maps, so this is a small
 * job with a large effect: one asset per kit furnishes the entire world.
 *
 * `--survey` is the mode that matters. A title tells you almost nothing — whether a model
 * is a metre tall or a thousand, whether it stands on its own origin or floats above it,
 * whether it is one mesh or forty — and all three decide whether it can be dropped onto an
 * authored coordinate. So each candidate is downloaded, cracked open, and reported with its
 * real bounding box, its origin offset and its mesh and material counts. Choosing from
 * thumbnails would waste a lot of downloads and produce a village of floating sheds.
 *
 * Collision is *not* affected by any of this. The port's colliders come from
 * `godot/data/footprints.json`, harvested from the reference and checked placement for
 * placement by `tools/field-parity.mjs`, so a new model cannot break the simulation — it
 * can only look wrong, which is why the scale each one is placed at is derived from the
 * collider it has to fill rather than eyeballed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const OUT = path.join(root, 'godot', 'assets', 'props');
const MANIFEST = path.join(OUT, 'manifest.json');
const KEY = process.env.POLY_PIZZA_API_KEY;
const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const say = (s = '') => console.log(s);

/**
 * The kits the maps ask for, and what to search for.
 *
 * The counts are placements across all ninety-five maps in both world states, so the order
 * is the order in which getting one wrong is most visible. `terms` are searched in order
 * and the results pooled; `prefer` is an author whose work is CC0 — Quaternius's packs are
 * public domain and share one flat-shaded look, which matters more here than any single
 * model does, because eighteen assets by eighteen hands is not a world.
 */
const KITS = [
  { kit: 'lamppost', count: 558, terms: ['lamp post', 'street lamp', 'lantern post'] },
  { kit: 'chest', count: 405, terms: ['chest', 'treasure chest'] },
  // Six of them, because a building in this world declares a `style` and the reference
  // builds a different thing for each. What is lost either way is the per-building
  // variation the reference generates from `storeys`, `timbered`, `chimney`, `awning` and
  // the rest — that is arithmetic, and arithmetic is what this port does not do for
  // geometry. What is kept is that a plaster town does not look like a marble one.
  { kit: 'building_plaster', count: 139, terms: ['town house', 'timbered house', 'house'] },
  { kit: 'building_stone', count: 61, terms: ['stone house', 'building', 'stone building'] },
  { kit: 'building_wood', count: 39, terms: ['wooden house', 'sawmill', 'barn'] },
  { kit: 'building_marble', count: 21, terms: ['palace', 'temple', 'castle'] },
  { kit: 'building_magitek', count: 6, terms: ['factory', 'workshop', 'industrial building'] },
  { kit: 'building_brick', count: 4, terms: ['blacksmith', 'brick house', 'forge'] },
  { kit: 'signpost', count: 241, terms: ['signpost', 'wooden sign'] },
  { kit: 'barrel', count: 207, terms: ['barrel'] },
  { kit: 'crate', count: 202, terms: ['crate', 'wooden crate'] },
  { kit: 'rock', count: 167, terms: ['rock', 'boulder', 'rocks'] },
  { kit: 'tree', count: 160, terms: ['tree', 'pine tree', 'oak tree'] },
  { kit: 'bench', count: 152, terms: ['bench', 'park bench'] },
  { kit: 'savepoint', count: 131, terms: ['crystal', 'obelisk', 'shrine'] },
  { kit: 'flowerbox', count: 70, terms: ['flower bush', 'planter', 'flowers'] },
  { kit: 'fence', count: 63, terms: ['fence', 'wooden fence'] },
  { kit: 'cart', count: 54, terms: ['cart', 'wooden cart', 'wagon'] },
  { kit: 'stall', count: 54, terms: ['market stall', 'market stand'] },
  { kit: 'bush', count: 53, terms: ['bush', 'hedge'] },
  { kit: 'well', count: 52, terms: ['well', 'water well'] },
  { kit: 'bridge', count: 2, terms: ['bridge', 'small bridge'] },
  { kit: 'airshipmast', count: 1, terms: ['tower', 'mast', 'windmill'] },
  // The ship itself. Two continents in this world have no road to them, so this is not
  // scenery: it is the only way to reach them.
  { kit: 'airship', count: 1, terms: ['airship', 'blimp', 'zeppelin'] },
  // Not props but the ground and the walls, instanced per tile from the map's own terrain
  // rows. A modular piece placed at authored coordinates is level assembly; the alternative
  // — a plane and a box built in code — is the thing this project does not do.
  { kit: 'floor', count: 0, terms: ['floor tile', 'ground tile', 'stone floor'] },
  { kit: 'wall', count: 0, terms: ['wall modular', 'stone wall', 'modular wall'] },
  // One textured cube, twelve triangles. Every open tile in the world carries a piece of
  // ground and the overworld alone has 2,816 of them, so the ground has to be something a
  // MultiMesh can draw thousands of without thinking about it. The look comes from the
  // texture plates the reference already uses, not from this mesh.
  { kit: 'block', count: 0, terms: ['stone block', 'cube', 'block'] },
];

const api = async (p) => {
  const res = await fetch(`https://api.poly.pizza/v1.1${p}`, { headers: { 'x-auth-token': KEY } });
  if (!res.ok) throw new Error(`poly.pizza ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return res.json();
};

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Multiply two column-major 4×4 matrices, as glTF stores them. */
function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

/** A node's local matrix, from either `matrix` or its translation/rotation/scale. */
function localMatrix(node) {
  if (node.matrix) return node.matrix.slice();
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  // Quaternion to a rotation matrix, then scaled columns and the translation.
  const r = [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w),
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y),
  ];
  return [
    r[0] * sx, r[1] * sx, r[2] * sx, 0,
    r[3] * sy, r[4] * sy, r[5] * sy, 0,
    r[6] * sz, r[7] * sz, r[8] * sz, 0,
    tx, ty, tz, 1,
  ];
}

function apply(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

/**
 * What a GLB actually contains, from its own accessors.
 *
 * The bounding box comes from the POSITION accessors' `min` and `max`, which glTF requires,
 * so it is exact and needs no mesh maths — but it has to be carried up through the node
 * hierarchy by the *full* transform. Ignoring rotation, which an earlier version of this did,
 * reports a street light as two units tall and five deep: a fair number of models arrive with
 * a quarter-turn on their root node from being authored Z-up, and a survey that mixes those
 * up chooses assets by the wrong dimension. All eight corners are transformed for the same
 * reason.
 */
function inspectGLB(buf) {
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) return { error: 'not a GLB' };
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));

  const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  const meshBox = (meshIndex) => {
    const out = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const prim of json.meshes?.[meshIndex]?.primitives ?? []) {
      const accessor = json.accessors?.[prim.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (let i = 0; i < 3; i++) {
        out.min[i] = Math.min(out.min[i], accessor.min[i]);
        out.max[i] = Math.max(out.max[i], accessor.max[i]);
      }
    }
    return out;
  };

  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const walk = (nodeIndex, parent) => {
    const node = json.nodes?.[nodeIndex];
    if (!node) return;
    const world = multiply(parent, localMatrix(node));
    if (node.mesh !== undefined) {
      const mb = meshBox(node.mesh);
      if (Number.isFinite(mb.min[0])) {
        for (const corner of [
          [mb.min[0], mb.min[1], mb.min[2]], [mb.max[0], mb.min[1], mb.min[2]],
          [mb.min[0], mb.max[1], mb.min[2]], [mb.max[0], mb.max[1], mb.min[2]],
          [mb.min[0], mb.min[1], mb.max[2]], [mb.max[0], mb.min[1], mb.max[2]],
          [mb.min[0], mb.max[1], mb.max[2]], [mb.max[0], mb.max[1], mb.max[2]],
        ]) {
          const p = apply(world, corner);
          for (let i = 0; i < 3; i++) {
            box.min[i] = Math.min(box.min[i], p[i]);
            box.max[i] = Math.max(box.max[i], p[i]);
          }
        }
      }
    }
    for (const child of node.children ?? []) walk(child, world);
  };
  const scene = json.scenes?.[json.scene ?? 0];
  for (const nodeIndex of scene?.nodes ?? []) walk(nodeIndex, identity);

  const size = [0, 1, 2].map((i) => (Number.isFinite(box.max[i] - box.min[i])
    ? Number((box.max[i] - box.min[i]).toFixed(4)) : 0));
  return {
    meshes: (json.meshes ?? []).length,
    materials: (json.materials ?? []).length,
    nodes: (json.nodes ?? []).length,
    animations: (json.animations ?? []).length,
    textures: (json.textures ?? []).length,
    size,
    // How far the model's own base sits from its origin. A prop whose base is at y=0 drops
    // straight onto the floor; one that is centred needs lifting by half its height, and
    // knowing which is the difference between a village and a village of floating sheds.
    base: Number.isFinite(box.min[1]) ? Number(box.min[1].toFixed(4)) : 0,
    centre: [0, 2].map((i) => (Number.isFinite(box.min[i])
      ? Number(((box.min[i] + box.max[i]) / 2).toFixed(4)) : 0)),
  };
}

fs.mkdirSync(OUT, { recursive: true });
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

if (args.includes('--list')) {
  say('\x1b[1mThe kits the maps ask for\x1b[0m');
  for (const k of KITS) {
    const got = manifest[k.kit];
    say(`  ${k.kit.padEnd(13)} ${String(k.count).padStart(4)} placements  `
      + (got ? `\x1b[32m${got.title}\x1b[0m by ${got.author} (${got.licence})`
        : '\x1b[33mnot chosen\x1b[0m'));
  }
  process.exit(0);
}

if (!KEY) {
  say('Set POLY_PIZZA_API_KEY. See the project memory for the key.');
  process.exit(2);
}

if (args.includes('--survey')) {
  const only = flag('kit');
  const wanted = only ? KITS.filter((k) => k.kit === only) : KITS;
  // Kept from a previous run and written after every kit: surveying twenty kits is six
  // hundred downloads, and a report that only lands at the end loses all of it to one
  // interruption.
  const reportPath = path.join(OUT, 'survey.json');
  const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {};
  for (const k of wanted) {
    const pool = new Map();
    for (const term of k.terms) {
      try {
        const r = await api(`/search/${encodeURIComponent(term)}?limit=24`);
        for (const m of r.results ?? []) if (!pool.has(m.ID)) pool.set(m.ID, { ...m, term });
      } catch (err) {
        say(`  \x1b[33m${k.kit}\x1b[0m search "${term}" — ${err.message}`);
      }
    }
    say(`\x1b[1m${k.kit}\x1b[0m — ${pool.size} candidates`);
    const rows = [];
    for (const m of pool.values()) {
      if (!m.Download) continue;
      try {
        const buf = await download(m.Download);
        const info = inspectGLB(buf);
        if (info.error) continue;
        const author = m.Creator?.Username
          ?? String(m.Attribution ?? '').split(' by ')[1]?.split(',')[0] ?? '?';
        // From the API's own field. Reading it out of the attribution string got every
        // Quaternius model wrong: a CC0 attribution reads exactly like a CC-BY one.
        const licence = m.Licence ?? 'unknown';
        rows.push({
          id: m.ID, title: m.Title, author, licence, term: m.term,
          bytes: buf.length, tris: m['Tri Count'] ?? null, ...info,
        });
      } catch { /* a dead asset link is not worth stopping a survey for */ }
    }
    /**
     * The useful order: one author first, then the simplest models.
     *
     * Quaternius's packs are CC0 and share one flat-shaded look, and that matters more
     * here than any single model does — eighteen assets by eighteen hands is not a world,
     * it is a car boot sale. After that, fewest materials wins: a prop with forty
     * materials is a diorama rather than a piece of scenery, and every one of these is
     * about to be instanced five hundred times.
     */
    rows.sort((a, b) => (a.author === 'Quaternius' ? 0 : 1) - (b.author === 'Quaternius' ? 0 : 1)
      || a.materials - b.materials || a.bytes - b.bytes);
    for (const r of rows.slice(0, 12)) {
      say(`  ${r.id.padEnd(12)} ${String(r.title).slice(0, 26).padEnd(26)} `
        + `${r.author.slice(0, 14).padEnd(14)} ${String(r.licence).padEnd(8)} `
        + `${r.size.map((n) => n.toFixed(2)).join('×').padEnd(20)} base ${String(r.base).padStart(7)} `
        + `mesh ${String(r.meshes).padStart(2)} mat ${String(r.materials).padStart(2)} `
        + `${(r.bytes / 1024).toFixed(0)}KB`);
    }
    report[k.kit] = rows;
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 1)}\n`);
  }
  say();
  say(`\x1b[32mOK\x1b[0m — full report in ${path.relative(root, reportPath)}`);
}

const gets = [];
for (let i = args.indexOf('--get') + 1; i > 0 && i < args.length; i++) {
  if (args[i].startsWith('--')) break;
  gets.push(args[i]);
}
for (const pair of gets) {
  const [kit, id] = pair.split('=');
  if (!kit || !id) {
    say(`\x1b[31mFAIL\x1b[0m — "${pair}" should be kit=modelId`);
    process.exit(1);
  }
  if (!KITS.some((k) => k.kit === kit)) {
    say(`\x1b[31mFAIL\x1b[0m — no kit called "${kit}"`);
    process.exit(1);
  }
  const m = await api(`/model/${id}`);
  const buf = await download(m.Download);
  const info = inspectGLB(buf);
  if (info.error) {
    say(`\x1b[31mFAIL\x1b[0m — ${id} is ${info.error}`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(OUT, `${kit}.glb`), buf);
  const author = m.Creator?.Username
    ?? String(m.Attribution ?? '').split(' by ')[1]?.split(',')[0] ?? '?';
  manifest[kit] = {
    file: `${kit}.glb`,
    id,
    title: m.Title,
    author,
    licence: m.Licence ?? 'unknown',
    attribution: m.Attribution ?? '',
    source: `https://poly.pizza/m/${id}`,
    size: info.size,
    base: info.base,
    centre: info.centre,
    meshes: info.meshes,
    materials: info.materials,
    bytes: buf.length,
  };
  say(`  ${kit.padEnd(13)} ${m.Title} by ${author} — ${info.size.map((n) => n.toFixed(2)).join('×')}`);
}

if (gets.length) {
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
  // The credits file is written from the manifest rather than kept by hand: a licence note
  // that has to be remembered is a licence note that goes out of date.
  const entries = Object.entries(manifest).sort(([a], [b]) => (a < b ? -1 : 1));
  const line = ([kit, m]) => `| ${kit} | ${m.title} | ${m.author} | ${m.licence} | ${m.source} |`;
  // Two provenances, and they are not the same claim. A downloaded model is somebody's work
  // and the row is an attribution; a generated one is this project's own output and the row is
  // a record of how it was made. Mixing them in one table reads as if a person called
  // "generated for this game" had made a well.
  const bought = entries.filter(([, m]) => m.licence !== 'generated');
  const grown = entries.filter(([, m]) => m.licence === 'generated');
  fs.writeFileSync(path.join(OUT, 'CREDITS.md'), [
    '# Scenery',
    '',
    'Most props, walls and floor tiles in the Godot port are models made by people and',
    'obtained through [poly.pizza](https://poly.pizza). The reference build assembles its',
    'scenery in code; this does not, which is why these exist.',
    '',
    'CC0 imposes no attribution requirement. This file lists everything regardless,',
    'because using somebody\'s work without saying so is a poor way to behave — and where',
    'a model is CC-BY, saying so is also the licence.',
    '',
    '| Kit | Model | Author | Licence | Source |',
    '|---|---|---|---|---|',
    ...bought.map(line),
    '',
    ...(grown.length ? [
      '## Generated for this game',
      '',
      'These were made here rather than downloaded: a concept view from FLUX.1-schnell,',
      'reconstructed by Hunyuan3D-2.1, then cleaned, decimated and shrunk by the scripts in',
      '`tools/`. The concept views are in `assets/concepts/`.',
      '',
      '| Kit | Model | Made by | Provenance | From |',
      '|---|---|---|---|---|',
      ...grown.map(line),
      '',
    ] : []),
  ].join('\n'));
  say();
  say(`\x1b[32mOK\x1b[0m — ${gets.length} downloaded, manifest and CREDITS.md rewritten.`);
}

if (!args.includes('--survey') && !gets.length) {
  say('Nothing to do. Try --list, --survey, or --get kit=modelId.');
}
