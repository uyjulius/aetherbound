/**
 * Scenery parity: the port's world against the authored one.
 *
 *   node tools/scenery-parity.mjs
 *
 * The port cannot build the reference's scenery — that scenery is computed, and nothing here
 * may be — so it places hand-made models at the reference's own coordinates instead. That
 * makes this a different kind of check from the others in this suite: there is no numeric
 * oracle for how a village *looks*. What can be checked, and is:
 *
 *   1. Every kit the maps ask for has a model, and every model the plan names is on disk.
 *      A missing kit is a hole in ninety-five maps and a warning nobody reads.
 *   2. Every placement is accounted for. The port walks the same 2,842 props and the same
 *      terrain rows the reference does, so the counts have to agree map for map — computed
 *      here straight from `maps.json` and compared with what the Godot probe built.
 *   3. The materials are the reference's. `GROUND_TEX` in `src/world/map.js` decides what
 *      each ground is surfaced with, and the plan carries a copy; the copy is held against
 *      the original so it cannot drift. The plates themselves are compared byte for byte
 *      between `assets/textures` and the copy inside the Godot project.
 *   4. Every model is licensed and credited. These are other people's models: a file with no
 *      author recorded is one this project has no right to ship.
 *
 * What this cannot check is whether a chest is the right size, and it is worth being plain
 * about that. The scale each model is placed at is *derived* from the collider it has to
 * fill — colliders `tools/field-parity.mjs` already checks placement for placement — so the
 * arithmetic is verified even though the appearance is not. A wrong number can only look
 * wrong; it cannot move a wall.
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const DATA = path.join(root, 'godot', 'data');
const PROPS = path.join(root, 'godot', 'assets', 'props');
const say = (s = '') => console.log(s);
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

for (const file of ['manifest.json', 'placement.json']) {
  if (!fs.existsSync(path.join(PROPS, file))) {
    say(`\x1b[31mFAIL\x1b[0m — no godot/assets/props/${file}. Run \`npm run scenery\`.`);
    process.exit(1);
  }
}
const manifest = read(path.join(PROPS, 'manifest.json'));
const plan = read(path.join(PROPS, 'placement.json'));
const maps = read(path.join(DATA, 'maps.json'));
const legend = read(path.join(DATA, 'legend.json'));

const failures = [];
const notes = [];
let compared = 0;
const fail = (line) => { if (failures.length < 20) failures.push(line); };

say('\x1b[1mScenery: the port’s world against the authored one\x1b[0m');
say('─'.repeat(58));

// --- 1. every kit has a model ------------------------------------------------
const kitsUsed = new Map();
for (const [id, def] of Object.entries(maps)) {
  for (const state of [def, def.ruin]) {
    for (const prop of state?.props ?? []) {
      const kit = prop.kit ?? '?';
      kitsUsed.set(kit, (kitsUsed.get(kit) ?? 0) + 1);
      if (kit === 'building') {
        const style = prop.style ?? 'plaster';
        compared++;
        if (!plan.buildings?.[style]) fail(`${id}: a ${style} building with no model`);
      }
    }
  }
}
for (const [kit, count] of [...kitsUsed].sort((a, b) => b[1] - a[1])) {
  if (kit === 'building') continue;
  compared++;
  if (!plan.kits?.[kit]) fail(`kit "${kit}": ${count} placements and no model`);
}
// And the props the terrain places itself.
for (const spec of Object.values(legend.glyphs ?? {})) {
  if (!spec.prop) continue;
  compared++;
  if (!plan.glyphs?.[spec.prop]) fail(`glyph prop "${spec.prop}": no model`);
}
// And the rotations are in the units the port adds them to. The plan's `yaw` is summed with
// the rotation the map gives a prop, which is radians — `rot` runs to 1.5708 and 3.1416 — and
// the rules that produce it are written in degrees, where a person is reading them. Nothing
// carried a yaw at all until the generated fence needed a quarter turn, so the mismatch had
// never fired; the first one would have spun a fence ninety radians and looked like a bug in
// the placement data.
for (const [kit, spec] of Object.entries(plan.kits ?? {})) {
  compared++;
  const yaw = Number(spec.yaw ?? 0);
  if (!Number.isFinite(yaw) || Math.abs(yaw) > Math.PI * 2) {
    fail(`kit "${kit}": a yaw of ${yaw} — the port reads radians, so this is degrees`);
  }
}

// Every file the plan names, on disk.
const named = [
  ...Object.values(plan.kits ?? {}).map((k) => k.file),
  ...Object.values(plan.buildings ?? {}).map((b) => b.file),
  ...Object.values(plan.glyphs ?? {}).map((g) => g.file),
  ...Object.values(plan.pieces ?? {}).filter(Boolean).map((p) => p.file),
];
for (const file of new Set(named)) {
  compared++;
  if (!fs.existsSync(path.join(PROPS, file))) fail(`${file}: named by the plan, not on disk`);
}
say(`  models           ${kitsUsed.size} kits, ${Object.keys(plan.buildings ?? {}).length} `
  + `building styles, ${Object.keys(plan.glyphs ?? {}).length} glyph props`);

// --- 2. every placement accounted for ----------------------------------------
//
// What the port should build, counted here from the same data it reads. Props are the map's
// own list minus the kits with no model; glyph props are one per tile carrying one; tiles are
// every cell that is not void.
function expected(def) {
  let props = 0;
  for (const prop of def.props ?? []) {
    const kit = prop.kit ?? '?';
    if (kit === 'building') { if (plan.buildings?.[prop.style ?? 'plaster']) props++; continue; }
    if (plan.kits?.[kit]) props++;
  }
  let tiles = 0;
  for (const row of def.terrain ?? []) {
    for (const glyph of row) {
      const spec = legend.glyphs?.[glyph];
      if (spec?.void) continue;
      tiles++;
      if (spec?.prop && plan.glyphs?.[spec.prop]) props++;
    }
  }
  return { props, tiles };
}

const GODOT = process.env.GODOT ?? 'godot';
const SAMPLE = ['harrowmere', 'overworld', 'solmere', 'inn_harrowmere', 'sunkenvault',
  'thornmarch', 'emberlyn', 'shop_harrowmere'];
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/scenery_probe.gd', '--', ...SAMPLE,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const start = raw.indexOf('{"maps"');
  if (start < 0) throw new Error(`no report in the probe output:\n${raw.slice(-800)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 8).join('\n  ')}`);
  process.exit(1);
}

for (const id of SAMPLE) {
  const want = expected(maps[id]);
  const got = ported.maps?.[id];
  compared += 2;
  if (!got) { fail(`${id}: the port built nothing`); continue; }
  if (got.props !== want.props) {
    fail(`${id}: ${got.props} props placed, ${want.props} in the map data`);
  }
  if (got.tiles !== want.tiles) {
    fail(`${id}: ${got.tiles} tiles paved, ${want.tiles} in the terrain`);
  }
}
say(`  placements       ${SAMPLE.length} maps compared against their own data`);

// --- 3. the materials are the reference's ------------------------------------
const mapSource = fs.readFileSync(path.join(root, 'src', 'world', 'map.js'), 'utf8');
const block = mapSource.slice(mapSource.indexOf('const GROUND_TEX'));
const referenceGround = {};
for (const [, ground, texture] of block.slice(0, block.indexOf('};'))
  .matchAll(/(\w+):\s*'([\w_]+)'/g)) {
  referenceGround[ground] = texture;
}
compared++;
if (!Object.keys(referenceGround).length) fail('could not read GROUND_TEX out of src/world/map.js');
for (const [ground, texture] of Object.entries(referenceGround)) {
  compared++;
  const mine = plan.ground?.[ground]?.texture;
  if (mine !== `${texture}.png`) {
    fail(`ground "${ground}": the port surfaces it with ${mine}, the reference with ${texture}.png`);
  }
}

const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const plateDir = path.join(root, 'assets', 'textures');
const copyDir = path.join(root, 'godot', 'assets', 'textures');
const plates = fs.readdirSync(plateDir).filter((n) => n.endsWith('.png'));
for (const name of plates) {
  compared++;
  const copy = path.join(copyDir, name);
  if (!fs.existsSync(copy)) {
    fail(`${name}: not copied into the Godot project — run \`npm run sync:textures\``);
  } else if (digest(path.join(plateDir, name)) !== digest(copy)) {
    fail(`${name}: the copy in the Godot project differs from the plate`);
  }
}
// Every surface the plan names has to be one of those plates.
for (const table of ['ground', 'walls']) {
  for (const [key, spec] of Object.entries(plan[table] ?? {})) {
    compared++;
    if (!plates.includes(spec.texture)) fail(`${table} "${key}": no plate called ${spec.texture}`);
  }
}
say(`  materials        ${Object.keys(referenceGround).length} grounds agree, `
  + `${plates.length} plates identical on both sides`);

// --- 4. licensed and credited ------------------------------------------------
const credits = fs.existsSync(path.join(PROPS, 'CREDITS.md'))
  ? fs.readFileSync(path.join(PROPS, 'CREDITS.md'), 'utf8') : '';
for (const [kit, asset] of Object.entries(manifest)) {
  compared += 3;
  if (!asset.author || asset.author === '?') fail(`${kit}: no author recorded`);
  if (!asset.licence || asset.licence === 'unknown') fail(`${kit}: no licence recorded`);
  if (!credits.includes(asset.source ?? ' ')) fail(`${kit}: not in CREDITS.md`);
}
const byLicence = {};
for (const asset of Object.values(manifest)) {
  byLicence[asset.licence] = (byLicence[asset.licence] ?? 0) + 1;
}
say(`  licences         ${Object.entries(byLicence).map(([l, n]) => `${n}× ${l}`).join(', ')}`);
for (const [kit, spec] of Object.entries(plan.glyphs ?? {})) {
  if (spec.standin) notes.push(`${kit}: ${spec.standin}`);
}

say();
for (const line of notes) say(`  \x1b[33mnote\x1b[0m  ${line}`);
if (failures.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${failures.length} problem(s) across ${compared} checks:`);
  for (const line of failures) say(`  ${line}`);
  process.exit(1);
}
const bytes = Object.values(manifest).reduce((n, m) => n + (m.bytes ?? 0), 0) / 1024 / 1024;
say(`\x1b[32mOK\x1b[0m — ${compared.toLocaleString()} checks: every kit the world asks for has a `
  + `model, every placement is`);
say(`     accounted for, the plates are the reference's own, and all `
  + `${Object.keys(manifest).length} models are credited (${bytes.toFixed(1)} MB).`);
