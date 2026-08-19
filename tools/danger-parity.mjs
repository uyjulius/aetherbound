/**
 * Danger parity: what the signpost at every door knows.
 *
 *   node tools/danger-parity.mjs
 *
 * `dangerOf` is the whole of this game's difficulty signposting. Every exit in the world is
 * open from the first minute — no story flag gates a door — so the only thing standing
 * between a level 9 party and the pilgrim road written for level 68 is the sentence the
 * signpost adds when they walk up to it. If the port computes a different number, or the
 * same number and a different sentence, the port has a difficulty curve the reference does
 * not: the doors are still open, but nothing warns anybody any more.
 *
 * Every map and every named spawn, plus the unnamed arrival — 95 maps and around 250 doors,
 * not a sample. The arithmetic has three paths through it (a zone that covers the arrival
 * tile, the map's own table, nothing at all), and which path a given door takes depends on
 * two numbers in a rect.
 *
 * The map definitions come from `godot/data/maps.json` — the file the port reads and the
 * file the exporter writes from the reference's own map modules — because the reference's
 * `MAPS` is assembled inside `main.js`, which cannot be imported outside a browser. What is
 * being checked here is the arithmetic, and both sides are reading the same tiles. The
 * encounter and enemy tables are *not* shared: the reference reads its own modules and the
 * port reads its JSON, so a table that drifted between them fails here.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dangerOf, dangerNote } from '../src/world/danger.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);
const PARTY_LEVELS = [1, 8, 17, 26, 40, 55, 68, 82, 99];

const maps = JSON.parse(fs.readFileSync(path.join(root, 'godot', 'data', 'maps.json'), 'utf8'));

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/danger_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const start = raw.indexOf('{"levels"');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-600)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 6).join('\n  ')}`);
  process.exit(1);
}

say('\x1b[1mDanger: what the port tells the party a door leads to\x1b[0m');
say('─'.repeat(58));

const failures = [];
let compared = 0;
let warned = 0;

for (const id of Object.keys(maps).sort()) {
  const def = maps[id];
  // The unnamed arrival first, then every spawn the map declares, which is the set of
  // doorways that can actually deposit a party here.
  const spawns = ['', ...Object.keys(def.spawns ?? {}).sort()];
  for (const spawn of spawns) {
    compared++;
    // `dangerOf` takes the spawn name the exit carries, and an exit with no spawn hands it
    // `undefined` rather than an empty string.
    const expected = dangerOf(def, spawn === '' ? undefined : spawn);
    const actual = ported.levels?.[id]?.[spawn];
    // A mean of integer levels: exact in binary on both sides unless the count differs, but
    // compared with a tolerance anyway, because one side is a 64-bit double and the other is
    // whatever `float` means in GDScript.
    if (actual === undefined || Math.abs(expected - actual) > 1e-9) {
      if (failures.length < 10) {
        failures.push(`${id} via ${spawn || '(no spawn)'}: `
          + `port ${actual}, reference ${expected}`);
      }
    }
    if (expected > 0) warned++;
  }
}
say(`  doors        ${compared.toLocaleString().padStart(7)}  `
  + `${failures.length ? `\x1b[31m${failures.length} differ\x1b[0m` : '\x1b[32mall agree\x1b[0m'}`);
say(`  with monsters through them  ${String(warned).padStart(4)}`);

const noteBefore = failures.length;
for (let destination = 0; destination <= 90; destination++) {
  for (const party of PARTY_LEVELS) {
    compared++;
    const note = dangerNote(destination, party);
    const expected = note ? `${note.tone}/${note.text}` : '';
    const actual = ported.notes?.[String(destination)]?.[String(party)];
    if (expected !== actual && failures.length < 20) {
      failures.push(`note(${destination}, ${party}): port "${actual}", reference "${expected}"`);
    }
  }
}
say(`  warnings     ${String(91 * PARTY_LEVELS.length).padStart(7)}  `
  + `${failures.length > noteBefore ? '\x1b[31mdiffers\x1b[0m' : '\x1b[32mall agree\x1b[0m'}`);

say();
if (failures.length) {
  say('\x1b[31mFAIL\x1b[0m — the port and the reference disagree:');
  for (const line of failures) say(`  ${line}`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${compared.toLocaleString()} checks: every door in the world reports the`);
say('   same danger, and every gap gets the same words.');
