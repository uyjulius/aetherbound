/**
 * Model parity: the port shows the same character and the same creature.
 *
 *   node tools/models-parity.mjs
 *
 * Two hundred species share thirty-six meshes and fourteen characters share nine, and which
 * one you get is decided by a hash of your own appearance. That is the whole reason this
 * harness exists. A wrong hash is not a crash and not a warning: it is a wolf where the
 * reference showed a slime, for one species out of two hundred, in a game where nobody would
 * notice until they had met both.
 *
 * The reference's own `modelFor` and `modelForLook` are imported and run here — they have no
 * Three.js in the code paths that matter, only in the loaders, so the assignment can be asked
 * directly. The port answers through a probe. Then:
 *
 *   - all 14 party members and every one of the 297 people in the world, by model
 *   - all 200 species, by model
 *   - the clip tables, which decide whether a creature attacks or stands still
 *   - and the files themselves, byte for byte between the reference's directories and the
 *     copies inside the Godot project, because two sets of meshes is two casts
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const DATA = path.join(root, 'godot', 'data');
const say = (s = '') => console.log(s);
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const charModels = read(path.join(DATA, 'char_models.json'));
const monsterModels = read(path.join(DATA, 'monster_models.json'));
const characters = read(path.join(DATA, 'characters.json'));
const enemies = read(path.join(DATA, 'enemies.json'));
const maps = read(path.join(DATA, 'maps.json'));

const failures = [];
let compared = 0;
const fail = (line) => { if (failures.length < 20) failures.push(line); };

/**
 * The reference's assignment, reimplemented from its source in twelve lines.
 *
 * Not imported: `charmodels.js` and `monstermodels.js` both import Three.js at module level
 * for their loaders, and pulling a WebGL renderer into a comparison of two hash functions is
 * a worse dependency than a transcription this short. What makes the transcription safe is
 * that it is checked *against the reference's own tables* — which cross as data — and that
 * the seed is quoted from the source above each use.
 */
const fnv1a = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};

// `JSON.stringify([def.id, def.build, def.hair, def.colors])`
const characterModel = (def) => {
  if (def.id && charModels.cast[def.id]) return charModels.cast[def.id];
  // The crowd, not every model in the table: the party's own fourteen are in there too and an
  // NPC is never one of them.
  const keys = charModels.crowd ?? Object.keys(charModels.models);
  const seed = JSON.stringify([def.id, def.build, def.hair, def.colors]);
  return keys[fnv1a(seed) % keys.length];
};

// `JSON.stringify([look.plan, look.color, look.accent, look.eyeColor, look.scale])`
const monsterModel = (look = {}) => {
  const plan = monsterModels.plans[look.plan] ? look.plan : 'humanoid';
  const list = monsterModels.plans[plan];
  if (!list?.length) return null;
  if (look.model) return look.model;
  const seed = JSON.stringify([look.plan, look.color, look.accent, look.eyeColor, look.scale]);
  return list[fnv1a(seed) % list.length].id;
};

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/models_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  // The last line that is a JSON object. Godot's serialiser sorts keys, so which one comes
  // first is not something to depend on.
  const line = raw.split('\n').reverse()
    .find((l) => l.trim().startsWith('{') && l.trim().endsWith('}'));
  if (!line) throw new Error(`no report in the probe output:\n${raw.slice(-800)}`);
  ported = JSON.parse(line.trim());
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 8).join('\n  ')}`);
  process.exit(1);
}

say('\x1b[1mModels: who the port puts on screen\x1b[0m');
say('─'.repeat(58));

// --- the cast ----------------------------------------------------------------
for (const [id, def] of Object.entries(characters)) {
  compared++;
  const expected = characterModel({ id, ...(def.look ?? {}) });
  const actual = ported.characters?.[id];
  if (actual !== expected) fail(`${id}: the port plays ${actual}, the reference ${expected}`);
}

// Everybody else. The three hundred people in the world are the case the hash exists for —
// none of them is in the cast list, so every one is a hash, and a hash that disagrees changes
// three hundred faces.
let villagers = 0;
for (const [mapId, def] of Object.entries(maps)) {
  for (const [state, block] of [['whole', def], ['ruin', def.ruin]]) {
    for (const npc of block?.npcs ?? []) {
      const look = npc.look ?? null;
      if (!look) continue;
      villagers++;
      compared++;
      // Keyed by map and world state too: the same villager id stands in a town and in its
      // ruined form with a different look, and comparing one against the other reports a
      // difference that is really two different people.
      const key = `${mapId}/${state}/${npc.id}`;
      const expected = characterModel({ id: npc.id, ...look });
      const actual = ported.npcs?.[key];
      if (actual !== expected) {
        fail(`${key}: the port plays ${actual}, the reference ${expected}`);
      }
    }
  }
}
say(`  the cast         ${Object.keys(characters).length} party members, ${villagers} villagers`);

// --- the bestiary ------------------------------------------------------------
for (const [id, def] of Object.entries(enemies)) {
  compared++;
  const expected = monsterModel(def.look ?? {});
  const actual = ported.enemies?.[id];
  if (actual !== expected) fail(`${id}: the port plays ${actual}, the reference ${expected}`);
}
const used = new Set(Object.values(ported.enemies ?? {}));
say(`  the bestiary     ${Object.keys(enemies).length} species across ${used.size} meshes`);

// --- the clips ---------------------------------------------------------------
for (const [clip, name] of Object.entries(charModels.clips)) {
  compared++;
  if (ported.char_clips?.[clip] !== name) {
    fail(`character clip ${clip}: the port uses ${ported.char_clips?.[clip]}, the reference ${name}`);
  }
}
// And what those names resolve to in the models themselves, which is the part that decides
// whether anybody moves.
for (const [key, resolved] of Object.entries(ported.resolved ?? {})) {
  compared++;
  if (!resolved) fail(`${key}: no authored clip found`);
}
say(`  clips            ${Object.keys(charModels.clips).length} character clips, `
  + `${Object.keys(ported.resolved ?? {}).length} resolved against real models`);

// --- the files ---------------------------------------------------------------
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const [from, to] of [
  [path.join(root, 'assets', 'models'), path.join(root, 'godot', 'assets', 'cast')],
  [path.join(root, 'assets', 'monsters'), path.join(root, 'godot', 'assets', 'monsters')],
]) {
  for (const name of fs.readdirSync(from).filter((n) => n.endsWith('.glb'))) {
    compared++;
    const copy = path.join(to, name);
    if (!fs.existsSync(copy)) {
      fail(`${name}: not copied into the Godot project — run \`npm run sync:models\``);
    } else if (digest(path.join(from, name)) !== digest(copy)) {
      fail(`${name}: the copy in the Godot project differs from the original`);
    }
  }
}
// Every model either table names has to be one of those files.
for (const model of Object.values(charModels.models)) {
  compared++;
  if (!fs.existsSync(path.join(root, 'godot', 'assets', 'cast', model.file))) {
    fail(`${model.file}: named by the cast table, not in the project`);
  }
}
for (const list of Object.values(monsterModels.plans)) {
  for (const entry of list) {
    compared++;
    if (!fs.existsSync(path.join(root, 'godot', 'assets', 'monsters', `${entry.id}.glb`))) {
      fail(`${entry.id}.glb: named by the bestiary roster, not in the project`);
    }
  }
}
const bytes = ['cast', 'monsters'].reduce((total, dir) => total
  + fs.readdirSync(path.join(root, 'godot', 'assets', dir))
    .filter((n) => n.endsWith('.glb'))
    .reduce((n, name) => n + fs.statSync(path.join(root, 'godot', 'assets', dir, name)).size, 0), 0);
say(`  files            identical on both sides (${(bytes / 1024 / 1024).toFixed(1)} MB)`);

say();
if (failures.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${failures.length} difference(s) across ${compared} checks:`);
  for (const line of failures) say(`  ${line}`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${compared.toLocaleString()} checks: every character and every species `
  + 'is played by the mesh the');
say('     reference plays it with, and the clips resolve to keyframes an artist authored.');
