/**
 * Command parity: what each character's second command offers.
 *
 *   node tools/commands-parity.mjs
 *
 * The fourteen per-character commands are the reason to bring one character over
 * another, and the numbers on their options are balance decisions: Rusk's tiers
 * cost a quarter, a half and nine tenths of his health for 2.2, 4.0 and 7.5 times a
 * swing. Their *resolution* is compared by `battle-parity.mjs`, which fights real
 * fights with them. What this compares is the menu: which options exist at which
 * level, what numbers they carry, and — for Osric's wager — how often each outcome
 * comes up from a seeded stream.
 *
 * Every level from 1 to 99, because a gate changes the list at one exact level and
 * a sampled sweep steps over it.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS, movesFor } from '../src/battle/commands.js';
import { RNG } from '../src/engine/rng.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/commands_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const start = raw.indexOf('{');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-600)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 6).join('\n  ')}`);
  process.exit(1);
}

say('\x1b[1mCommands: the Godot port against the reference implementation\x1b[0m');
say('─'.repeat(60));

const failures = [];
let compared = 0;

/**
 * One move as comparable fields.
 *
 * Numbers stay numbers. Godot prints `4.0` where JavaScript prints `4`, and an
 * earlier version of this compared the printed forms — which reported six failures
 * about a table that matched exactly.
 */
const shape = (move) => ({
  label: move.label ?? '',
  power: Number(move.power ?? 0),
  heal: Number(move.heal ?? -1),
  element: move.element ?? '',
  target: move.target ?? '',
  status: Object.fromEntries(
    Object.entries(move.status ?? {}).map(([id, chance]) => [id, Number(chance)])),
});

const sameMove = (a, b) => a.label === b.label && a.power === b.power
  && a.heal === b.heal && a.element === b.element && a.target === b.target
  && JSON.stringify(a.status) === JSON.stringify(b.status);

for (const id of Object.keys(COMMANDS).sort()) {
  const expectedKind = `${COMMANDS[id].label}|${COMMANDS[id].kind}`;
  compared++;
  if (ported.kinds?.[id] !== expectedKind) {
    failures.push(`${id}: port ${ported.kinds?.[id]}, reference ${expectedKind}`);
  }
  for (let level = 1; level <= 99; level++) {
    compared++;
    const expected = movesFor(id, level).map(shape);
    const actual = (ported.options?.[id]?.[level - 1] ?? []).map(shape);
    const agrees = expected.length === actual.length
      && expected.every((move, i) => sameMove(move, actual[i]));
    if (!agrees) {
      failures.push(`${id} at level ${level}: port ${JSON.stringify(actual)}`
        + `, reference ${JSON.stringify(expected)}`);
      break;
    }
  }
}
say(`  option lists ${String(compared).padStart(6)}  `
  + `${failures.length ? `\x1b[31m${failures.length} differ\x1b[0m` : '\x1b[32mall agree\x1b[0m'}`);

// Osric's wager, over the same seeded stream and the same number of rolls.
const before = failures.length;
const stream = new RNG(0x51a3c7);
const outcomes = COMMANDS.wager.outcomes;
for (let i = 0; i < 200; i++) {
  compared++;
  const expected = stream.weighted(outcomes.map((o) => [o.weight, o])).label;
  if (ported.wager?.[i] !== expected) {
    failures.push(`wager roll ${i + 1}: port ${ported.wager?.[i]}, reference ${expected}`);
    break;
  }
}
say(`  wager rolls     ${String(200).padStart(3)}  `
  + `${failures.length > before ? '\x1b[31mdiffers\x1b[0m' : '\x1b[32mall agree\x1b[0m'}`);

// Rusk's tiers, priced off max HP.
const tiersBefore = failures.length;
const expectedTiers = [];
for (const maxHP of [100, 237, 1000, 7431]) {
  for (const tier of COMMANDS.overclock.tiers) {
    expectedTiers.push({
      label: tier.label, hp: Math.floor(maxHP * tier.cost), power: Number(tier.power),
    });
  }
}
expectedTiers.forEach((expected, i) => {
  compared++;
  const actual = ported.overclock?.[i] ?? {};
  if (actual.label !== expected.label || Number(actual.hp) !== expected.hp
    || Number(actual.power) !== expected.power) {
    failures.push(`overclock tier ${i + 1}: port ${JSON.stringify(actual)}`
      + `, reference ${JSON.stringify(expected)}`);
  }
});
say(`  overclock cost   ${String(expectedTiers.length).padStart(2)}  `
  + `${failures.length > tiersBefore ? '\x1b[31mdiffers\x1b[0m' : '\x1b[32mall agree\x1b[0m'}`);

say();
if (failures.length) {
  say('\x1b[31mFAIL\x1b[0m — the commands differ:');
  for (const line of failures.slice(0, 10)) say(`  ${line}`);
  if (failures.length > 10) say(`  … and ${failures.length - 10} more`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${compared.toLocaleString()} values: every command's options at every `
  + 'level, 200 weighted rolls, and every Overclock price.');
