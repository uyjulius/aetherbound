/**
 * Growth parity: stat curves and the experience table.
 *
 *   node tools/growth-parity.mjs
 *
 * `statAt`, `expForLevel` and `levelForExp` live in `src/data/characters.js`
 * rather than in `formulas.js`, which is the only reason they were not already
 * covered — `parity.mjs` imports the formulas module and stops there. They decide
 * every number a combatant brings into a fight and how long it takes to earn
 * them, so they are worth more than the average pure function.
 *
 * Every level from 1 to 99 for every stat, not a sample: the places where this
 * can go wrong are level 1, the damping elbow at 41, and wherever a stat hits its
 * 255 cap, and a sampled curve steps over all three.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS, statAt, expForLevel, levelForExp } from '../src/data/characters.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);
const STATS = ['hp', 'mp', 'vig', 'spd', 'sta', 'mag', 'res', 'lck'];
const EXP_PROBES = [0, 1, 48, 49, 50, 500, 5000, 50000, 500000, 5000000, 50000000];

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/growth_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const start = raw.indexOf('{');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-600)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 6).join('\n  ')}`);
  process.exit(1);
}

say('\x1b[1mGrowth: the Godot port against the reference implementation\x1b[0m');
say('─'.repeat(58));

const failures = [];
let compared = 0;

for (const id of Object.keys(CHARACTERS).sort()) {
  for (const stat of STATS) {
    const theirs = ported.stats?.[id]?.[stat] ?? [];
    for (let level = 1; level <= 99; level++) {
      compared++;
      const expected = statAt(id, stat, level);
      const actual = theirs[level - 1];
      if (expected !== actual && failures.length < 10) {
        failures.push(`${id} ${stat} at level ${level}: port ${actual}, reference ${expected}`);
      }
    }
  }
}
say(`  stat values  ${compared.toLocaleString().padStart(7)}  `
  + `${failures.length ? `\x1b[31m${failures.length} differ\x1b[0m` : '\x1b[32mall agree\x1b[0m'}`);

const expBefore = failures.length;
for (let level = 0; level <= 100; level++) {
  compared++;
  const expected = expForLevel(level);
  if (expected !== ported.exp?.[level] && failures.length < 20) {
    failures.push(`expForLevel(${level}): port ${ported.exp?.[level]}, reference ${expected}`);
  }
}
say(`  exp table        ${String(101).padStart(3)}  `
  + `${failures.length > expBefore ? '\x1b[31mdiffers\x1b[0m' : '\x1b[32mall agree\x1b[0m'}`);

const levelBefore = failures.length;
EXP_PROBES.forEach((total, i) => {
  compared++;
  const expected = levelForExp(total);
  if (expected !== ported.levels?.[i] && failures.length < 30) {
    failures.push(`levelForExp(${total}): port ${ported.levels?.[i]}, reference ${expected}`);
  }
});
say(`  level lookups     ${String(EXP_PROBES.length).padStart(2)}  `
  + `${failures.length > levelBefore ? '\x1b[31mdiffers\x1b[0m' : '\x1b[32mall agree\x1b[0m'}`);

say();
if (failures.length) {
  say('\x1b[31mFAIL\x1b[0m — the curves differ:');
  for (const line of failures) say(`  ${line}`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${compared.toLocaleString()} values: every stat of every character at `
  + 'every level, and the whole experience curve.');
