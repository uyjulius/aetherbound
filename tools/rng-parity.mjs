/**
 * RNG parity: the Godot port against the reference implementation.
 *
 *   node tools/rng-parity.mjs
 *
 * The other parity checks compare pure functions — 3,804 formula values, 40,855
 * table numbers, 24,000 AI decisions — and every one of them is blind to this.
 * The moment a battle actually runs, the two engines are being asked to agree on
 * a *stream*: which enemy acts first, whether the hit lands, what the chest
 * holds. An RNG that diverges on the tenth draw produces fights that are
 * plausible, different, and invisible to every audit this project owns.
 *
 * xoshiro128** is 32-bit unsigned arithmetic. GDScript has 64-bit signed ints,
 * no `Math.imul` and no logical right shift, so the port carries a hand-written
 * 32-bit multiply and masks before every shift. That is exactly the kind of code
 * that is correct for the first few thousand draws and wrong at one bit
 * position, so it is not reviewed, it is compared.
 *
 * The script of draws below is in a fixed order and must stay in lockstep with
 * `godot/tools/rng_probe.gd`. The property under test is not "does it produce
 * plausible numbers" but "does it produce these numbers, in this order, after
 * this exact sequence of calls" — so any reordering on one side has to be
 * mirrored on the other or the check quietly stops meaning anything.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RNG } from '../src/engine/rng.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const SEEDS = [0, 1, 0x2f6e2b1, 0x51a3c7, 0x9d2f11, 0x7c40b3, 0x33ba9e, 4294967295, 123456789];
const INT_MODULI = [1, 2, 3, 5, 6, 7, 10, 16, 100, 256, 1000];
const RANGES = [[0, 0], [1, 6], [-4, 4], [10, 99]];
const FLOAT_RANGES = [[0, 1], [-3.5, 2.25], [10, 10], [1, 1000]];
const CHANCE256 = [0, 1, 64, 128, 255, 256];
const CHANCES = [0, 0.25, 0.5, 0.75, 1];
const PICK_FROM = ['a', 'b', 'c', 'd', 'e'];

const round6 = (n) => Number(n.toFixed(6));

// The reference's state words come out signed — JavaScript's bitwise operators
// return int32, so `s0 ^= s3` leaves a negative number in three quarters of the
// state. The 128 bits are identical and both forms produce the same stream, so
// the comparison is on the words as unsigned rather than on their skin. The port
// stores the unsigned form and masks on the way in, which is why it can read a
// save written by the browser build.
const unsigned = (words) => words.map((w) => w >>> 0);

/** The same walk the probe performs, in the same order. */
function walk(seed) {
  const r = new RNG(seed);
  const out = { seed, state: unsigned(r.getState()) };

  out.u32 = Array.from({ length: 32 }, () => r.u32());
  out.float_range = FLOAT_RANGES.map(([lo, hi]) => round6(r.float(lo, hi)));

  out.int_below = [];
  for (const n of INT_MODULI) for (let i = 0; i < 3; i++) out.int_below.push(r.int(n));

  out.int_range = [];
  for (const [lo, hi] of RANGES) for (let i = 0; i < 3; i++) out.int_range.push(r.range(lo, hi));

  out.chance256 = [];
  for (const n of CHANCE256) for (let i = 0; i < 3; i++) out.chance256.push(r.chance256(n));

  out.chance = [];
  for (const p of CHANCES) for (let i = 0; i < 3; i++) out.chance.push(r.chance(p));

  out.pick = Array.from({ length: 6 }, () => r.pick(PICK_FROM));

  out.weighted_pairs = Array.from({ length: 6 },
    () => r.weighted([[1, 'one'], [3, 'three'], [0.5, 'half'], [7, 'seven']]));
  out.weighted_dicts = Array.from({ length: 6 },
    () => r.weighted([
      { weight: 2, id: 'a' }, { weight: 5, id: 'b' }, { weight: 0.25, id: 'c' },
    ]).id);

  out.shuffle = Array.from({ length: 3 },
    () => r.shuffle(Array.from({ length: 12 }, (_, k) => k)));

  const saved = r.getState();
  out.saved_state = unsigned(saved);
  out.after_save = Array.from({ length: 5 }, () => r.u32());
  r.setState(saved);
  out.after_restore = Array.from({ length: 5 }, () => r.u32());
  // The port is also asked to restore from the signed form, since that is what a
  // browser save contains. Same expected stream.
  out.after_signed_restore = out.after_restore;
  return out;
}

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/rng_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const start = raw.indexOf('{"runs"');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-800)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say(`\x1b[31mFAIL\x1b[0m — could not run the Godot probe.`);
  say(`  ${String(err.message).split('\n').slice(0, 6).join('\n  ')}`);
  say('  Set GODOT=/path/to/godot if it is not on PATH.');
  process.exit(1);
}

say('\x1b[1mRNG: the Godot port against the reference implementation\x1b[0m');
say('─'.repeat(58));

const CATEGORIES = [
  'state', 'u32', 'float_range', 'int_below', 'int_range', 'chance256', 'chance',
  'pick', 'weighted_pairs', 'weighted_dicts', 'shuffle',
  'saved_state', 'after_save', 'after_restore', 'after_signed_restore',
];

const tally = new Map(CATEGORIES.map((c) => [c, { checked: 0, bad: 0 }]));
const failures = [];

const flatten = (value) => (Array.isArray(value) ? value.flat(4) : [value]);

for (const [index, seed] of SEEDS.entries()) {
  const expected = walk(seed);
  const actual = ported.runs?.[index];
  if (!actual) {
    failures.push(`seed ${seed}: the probe produced no run`);
    continue;
  }
  if (actual.seed !== seed) {
    failures.push(`run ${index}: probe walked seed ${actual.seed}, reference walked ${seed}`);
    continue;
  }
  for (const category of CATEGORIES) {
    const a = flatten(expected[category]);
    const b = flatten(actual[category]);
    const stats = tally.get(category);
    if (a.length !== b.length) {
      stats.bad++;
      failures.push(`seed ${seed} ${category}: ${b.length} values, expected ${a.length}`);
      continue;
    }
    for (let i = 0; i < a.length; i++) {
      stats.checked++;
      if (a[i] === b[i]) continue;
      stats.bad++;
      if (failures.length < 12) {
        failures.push(`seed ${seed} ${category}[${i}]: port ${JSON.stringify(b[i])}`
          + `, reference ${JSON.stringify(a[i])}`);
      }
    }
  }

  // The round trip has to hold on each side independently, not merely match the
  // other side: two implementations that both lose the same word would agree
  // with each other and still break a save reloaded mid-battle.
  if (JSON.stringify(actual.after_save) !== JSON.stringify(actual.after_restore)) {
    failures.push(`seed ${seed}: the port's state round trip changed the stream`);
  }
}

let total = 0;
for (const [category, stats] of tally) {
  total += stats.checked;
  const mark = stats.bad ? `\x1b[31m${stats.bad} differ\x1b[0m` : '\x1b[32mall agree\x1b[0m';
  say(`  ${category.padEnd(15)} ${String(stats.checked).padStart(5)} values  ${mark}`);
}

say();
if (failures.length) {
  say(`\x1b[31mFAIL\x1b[0m — the streams diverge:`);
  for (const line of failures.slice(0, 12)) say(`  ${line}`);
  if (failures.length > 12) say(`  … and ${failures.length - 12} more`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${total.toLocaleString()} values across ${SEEDS.length} seeds, `
  + 'and every draw in every stream is identical.');
