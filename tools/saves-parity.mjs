/**
 * Save parity: the port loads the reference's save files.
 *
 *   node tools/harvest-saves.mjs && node tools/saves-parity.mjs
 *
 * A save is the one thing in this game that outlives the build that wrote it, so
 * the port does not get a format of its own. It reads the blobs the reference has
 * been writing to `localStorage` all along, and the party it rebuilds has to be
 * the party the reference rebuilds from the same bytes — member for member, stat
 * for stat, down to the fraction of a spell half-learned.
 *
 * The two fixtures are kept apart on purpose:
 *
 *   reference-saves.json           the blobs, which the port reads
 *   reference-saves-restored.json  the parties, which it is compared against
 *
 * Nothing the port sees contains an answer. What is under test is the *recomputing*
 * — a level from experience, seven stats from that level, a sword from an id, a
 * ceiling that has to clamp the health stored under it — which is exactly where the
 * reference itself was broken until this harness was built: it recomputed the level
 * with a stale copy of the experience curve and every save in existence loaded at
 * level 1.
 *
 * The port's own writer is checked in the same pass. A save it writes is parsed
 * back and has to describe the same party, or a game saved in Godot is a game only
 * the JS build can open.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);
const fixture = (name) => {
  const file = path.join(root, 'tools', 'fixtures', name);
  if (!fs.existsSync(file)) {
    say(`\x1b[31mFAIL\x1b[0m — no tools/fixtures/${name}. Run \`npm run harvest:saves\`.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const blobs = fixture('reference-saves.json');
const answers = fixture('reference-saves-restored.json');

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/saves_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const start = raw.indexOf('{');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-800)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 8).join('\n  ')}`);
  process.exit(1);
}

say('\x1b[1mSaves: the Godot port loading the reference’s own files\x1b[0m');
say('─'.repeat(58));

const failures = [];
let compared = 0;

/** Numbers as text, so 40 and 40.0 are the same answer and 40.5 is not 40. */
const near = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
  return String(a) === String(b);
};

function compare(where, expected, actual) {
  if (Array.isArray(expected)) {
    compared++;
    const theirs = Array.isArray(actual) ? actual : [];
    if (expected.length !== theirs.length) {
      failures.push(`${where}: port has ${theirs.length} entries, reference ${expected.length}`
        + `\n    port      ${JSON.stringify(theirs).slice(0, 120)}`
        + `\n    reference ${JSON.stringify(expected).slice(0, 120)}`);
      return;
    }
    for (const [i, value] of expected.entries()) compare(`${where}[${i}]`, value, theirs[i]);
    return;
  }
  if (expected && typeof expected === 'object') {
    for (const key of Object.keys(expected)) {
      compare(`${where}.${key}`, expected[key], actual?.[key]);
    }
    return;
  }
  compared++;
  if (!near(expected, actual)) {
    failures.push(`${where}: port ${JSON.stringify(actual)}, reference ${JSON.stringify(expected)}`);
  }
}

const names = Object.keys(answers.parties).sort();
for (const name of names) {
  const expected = answers.parties[name];
  const actual = ported.parties?.[name];
  const before = failures.length;
  if (!actual) {
    failures.push(`${name}: the port did not load this save at all`);
  } else {
    compare(name, expected, actual);
    // And the round trip through the port's own writer, against the same answers.
    compare(`${name} rewritten`, expected, ported.rewritten?.[name]);
  }
  const members = expected.roster.length;
  const bytes = blobs.saves[name]?.raw?.length ?? 0;
  const verdict = failures.length === before
    ? '\x1b[32magrees\x1b[0m'
    : `\x1b[31m${failures.length - before} difference(s)\x1b[0m`;
  say(`  ${name.padEnd(14)} ${String(bytes).padStart(5)} bytes  ${members} member(s)  ${verdict}`);
}

// The slot summary a load screen reads. Its own comparison, because a list that says
// "Unknown, Lv 1" cannot be used even when the load behind it is perfect.
for (const name of names) {
  const expected = blobs.saves[name]?.peek;
  const actual = ported.slots?.[name];
  if (!expected) continue;
  compare(`${name} slot.location`, expected.location, actual?.location);
  compare(`${name} slot.level`, expected.level, actual?.level);
  compare(`${name} slot.time`, expected.time, actual?.time);
  compare(`${name} slot.gold`, expected.gold, actual?.gold);
  compare(`${name} slot.names`, expected.names, actual?.names);
}

say();
if (failures.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${failures.length} difference(s) across ${compared} values:`);
  for (const line of failures.slice(0, 14)) say(`  ${line}`);
  if (failures.length > 14) say(`  … and ${failures.length - 14} more`);
  process.exit(1);
}

say(`\x1b[32mOK\x1b[0m — ${names.length} saves, ${compared.toLocaleString()} values, and the port `
  + 'rebuilt every party exactly as the reference does — including the ones it wrote itself.');
