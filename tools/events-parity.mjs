/**
 * Event parity: do the ported scenes do the same things?
 *
 *   node tools/events-parity.mjs
 *
 * The oracle is `tools/fixtures/reference-events.json`, harvested by
 * `harvest-events.mjs`: each of the 124 scenes driven with a `game` that records
 * every call instead of performing it, under five branch policies. This makes the
 * port run the scenes it has against the same policies and compares the transcripts
 * call for call — the speaker and the lines, the choices offered and taken, the
 * battles started and their options, the flags set, the quests advanced, the beats
 * waited.
 *
 * Coverage is reported rather than assumed. A scene the port has not been given yet
 * is *missing*, which is a different thing from wrong, and the number that matters
 * while a translation is in progress is how many are done and how many of those
 * agree.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const fixturePath = path.join(root, 'tools', 'fixtures', 'reference-events.json');
if (!fs.existsSync(fixturePath)) {
  say('\x1b[31mFAIL\x1b[0m — no fixture. Run `node tools/harvest-events.mjs`.');
  process.exit(1);
}
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/events_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const start = raw.indexOf('{"events"');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-800)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 8).join('\n  ')}`);
  process.exit(1);
}

say('\x1b[1mEvents: the ported scenes against the reference\x1b[0m');
say('─'.repeat(52));

/**
 * One recorded entry as a comparable string.
 *
 * Numbers are normalised, because Godot prints `1.0` where JavaScript prints `1`
 * and an earlier harness spent six failures on exactly that. Everything else is
 * compared literally: a line of dialogue with a word changed is a different scene.
 */
function entry(step) {
  if (step.yield) {
    return `yield ${step.yield}${step.seconds !== undefined ? ` ${Number(step.seconds)}` : ''}`
      + `${step.n !== undefined ? ` ${step.n}` : ''}`;
  }
  return `${step.call}(${JSON.stringify(normalise(step.args ?? []))})`;
}

function normalise(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number(value.toFixed(4));
  if (Array.isArray(value)) return value.map(normalise);
  if (typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = normalise(value[key]);
    return out;
  }
  return value;
}

const names = Object.keys(fixture.events).sort();
const failures = [];
let comparedSteps = 0;
let agreed = 0;
const missing = [];

for (const name of names) {
  const theirs = fixture.events[name];
  const mine = ported.events?.[name];
  if (!mine) { missing.push(name); continue; }

  let ok = true;
  for (const policy of fixture.policies) {
    const expected = (theirs[policy] ?? []).map(entry);
    const actual = (mine[policy] ?? []).map(entry);
    const steps = Math.max(expected.length, actual.length);
    for (let i = 0; i < steps; i++) {
      comparedSteps++;
      if (expected[i] === actual[i]) continue;
      ok = false;
      failures.push(`${name} [${policy}] step ${i + 1}:\n`
        + `           port      ${actual[i] ?? '(nothing)'}\n`
        + `           reference ${expected[i] ?? '(nothing)'}`);
      break;
    }
    if (!ok) break;
  }
  if (ok) agreed++;
}

const portedCount = names.length - missing.length;
say(`  scenes ported     ${String(portedCount).padStart(3)} of ${names.length}`);
say(`  of those, agree   ${String(agreed).padStart(3)}`);
say(`  steps compared  ${comparedSteps.toLocaleString().padStart(5)}`);
say();

if (failures.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${failures.length} ported scene(s) differ:`);
  for (const line of failures.slice(0, 8)) say(`  ${line}`);
  if (failures.length > 8) say(`  … and ${failures.length - 8} more`);
  process.exit(1);
}
if (!portedCount) {
  say('\x1b[31mFAIL\x1b[0m — no scenes are ported yet.');
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${portedCount} of ${names.length} scenes ported, and all `
  + `${comparedSteps.toLocaleString()} recorded steps match. `
  + `${missing.length} still to translate.`);
