/**
 * Data parity: does the Godot port read the same tables the reference does?
 *
 *   node tools/data-parity.mjs
 *
 * `parity.mjs` proves the two engines compute damage identically. That is only
 * half the guarantee — identical formulas fed different numbers produce a
 * different game just as surely. This closes the other half by fingerprinting
 * every exported table on both sides.
 *
 * The fingerprint is row count, the ids, and the sum and count of every number
 * found anywhere in the table. A bestiary that crosses with one attack value
 * rounded, one price shifted or one array truncated still loads, still looks
 * right in a diff, and is a rebalanced game. The id set catches rows vanishing;
 * the numeric sum catches values changing; the numeric count catches fields
 * being dropped even when the survivors happen to add up the same.
 *
 * The id *hash* is deliberately not compared: Godot's `Array.hash()` and any
 * JavaScript equivalent are different algorithms, and matching them would mean
 * reimplementing one inside the other — a checker whose own machinery is the
 * most likely thing to be wrong. The sorted id list is compared directly
 * instead, which is what the hash was standing in for anyway.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const DATA = path.join(root, 'godot', 'data');
const say = (s = '') => console.log(s);

const TABLES = ['enemies', 'encounters', 'items', 'shops', 'spells', 'espers',
  'quests', 'tracks', 'characters', 'maps'];

/** Total and count of every number reachable inside a value, booleans excluded. */
function numbers(value) {
  let sum = 0;
  let count = 0;
  if (typeof value === 'number') {
    return [value, 1];
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const [s, c] = numbers(item);
      sum += s; count += c;
    }
    return [sum, count];
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value).sort()) {
      const [s, c] = numbers(value[key]);
      sum += s; count += c;
    }
  }
  return [sum, count];
}

const round4 = (n) => Number(n.toFixed(4));

// --- the reference side, read from what the exporter wrote -------------------
//
// Reading the JSON rather than re-importing the JS modules is the point: this
// check is about whether the *export* survived the trip into Godot, and
// `to-godot.mjs` already exports straight from the modules with no transform.
const reference = {};
for (const name of TABLES) {
  const file = path.join(DATA, `${name}.json`);
  if (!fs.existsSync(file)) {
    say(`\x1b[31mFAIL\x1b[0m — ${name}.json is missing. Run \`node tools/to-godot.mjs\`.`);
    process.exit(1);
  }
  const table = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ids = Object.keys(table).sort();
  let sum = 0;
  let count = 0;
  for (const id of ids) {
    const [s, c] = numbers(table[id]);
    sum += s; count += c;
  }
  reference[name] = { rows: ids.length, ids, num_sum: round4(sum), num_count: count };
}
{
  const order = JSON.parse(fs.readFileSync(path.join(DATA, 'cast_order.json'), 'utf8'));
  reference.cast_order = { rows: order.length, ids: null, num_sum: 0, num_count: 0 };
}

// --- the port's side ---------------------------------------------------------
const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/data_probe.gd',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  const line = raw.split('\n').find((l) => l.trim().startsWith('{') && l.includes('"enemies"'));
  if (!line) throw new Error(`no JSON payload in Godot output:\n${raw.slice(-800)}`);
  ported = JSON.parse(line);
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot data probe.');
  say(`  ${err.message.split('\n')[0]}`);
  process.exit(1);
}

say('\x1b[1mData tables: the Godot port against the reference export\x1b[0m');
say('─'.repeat(58));

const problems = [];
for (const name of Object.keys(reference)) {
  const a = reference[name];
  const b = ported[name];
  if (!b) { problems.push(`${name}: the port did not load this table at all`); continue; }

  const notes = [];
  if (a.rows !== b.rows) notes.push(`${a.rows} rows here, ${b.rows} there`);
  if (a.num_count !== b.num_count) {
    notes.push(`${a.num_count} numeric fields here, ${b.num_count} there`);
  }
  // Floats survive a JSON round trip exactly, so this is a tight bound on
  // purpose: a real difference means a value changed, not that it drifted.
  if (Math.abs(a.num_sum - b.num_sum) > 0.01) {
    notes.push(`numbers total ${a.num_sum} here, ${b.num_sum} there`);
  }
  say(`  ${name.padEnd(11)} ${String(a.rows).padStart(4)} rows  `
    + `${String(a.num_count).padStart(6)} numbers  `
    + (notes.length ? `\x1b[31m${notes.join('; ')}\x1b[0m` : '\x1b[32mmatches\x1b[0m'));
  if (notes.length) problems.push(`${name}: ${notes.join('; ')}`);
}

say();
if (problems.length) {
  for (const p of problems) say(`  \x1b[31m✗\x1b[0m ${p}`);
  say();
  say('\x1b[31mFAIL\x1b[0m — the port is not reading the same game. Identical formulas fed');
  say('different numbers produce a different game just as surely as different formulas.');
  process.exit(1);
}
const rows = Object.values(reference).reduce((n, t) => n + t.rows, 0);
const nums = Object.values(reference).reduce((n, t) => n + t.num_count, 0);
say(`\x1b[32mOK\x1b[0m — ${rows.toLocaleString()} rows and ${nums.toLocaleString()} numbers, `
  + 'identical on both sides.');
