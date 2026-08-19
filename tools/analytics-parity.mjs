/**
 * Analytics parity: the port reports to the same project, under the same names.
 *
 *   node tools/analytics-parity.mjs
 *
 * The JS build has been instrumented since it went up. When the Godot port took the site's
 * root the game stopped reporting anything, and the fix is not a second taxonomy — it is the
 * same one. So this holds three things together:
 *
 *   1. **The exported table is the reference's table.** `godot/data/analytics.json` is written
 *      from `EV` in `src/engine/analytics.js`; every key and every string is compared, both
 *      ways, so neither an added event nor a renamed one can go out unnoticed.
 *   2. **The port's constants are that table's values.** `analytics.gd` declares a `const` per
 *      event rather than looking names up in a dictionary — a typo in a constant is a parse
 *      error, where a typo in a lookup is an event that silently never arrives. Each constant
 *      is matched against the reference by *key*, so `MAP_ENTERED` in the port has to be
 *      `EV.MAP_ENTERED`'s string and not merely some valid event name.
 *   3. **What the port does not send yet is named.** A port that instruments a third of the
 *      game and says nothing about the rest is indistinguishable from a game where the rest
 *      never happens. The gap is printed, every event of it, and it is not a failure — the
 *      port genuinely has fewer places to report from than the reference does.
 *
 * What this cannot check is that the same *act* sends the same event with the same properties
 * on both sides. That would need a harvest from both builds and a way to line up two different
 * UIs; it is worth saying plainly rather than implying the coverage is deeper than it is.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EV, TOKEN, ENDPOINT } from '../src/engine/analytics.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const exported = JSON.parse(
  fs.readFileSync(path.join(root, 'godot', 'data', 'analytics.json'), 'utf8'));
const module = fs.readFileSync(
  path.join(root, 'godot', 'scripts', 'engine', 'analytics.gd'), 'utf8');

say('\x1b[1mAnalytics: the port against the reference taxonomy\x1b[0m');
say('─'.repeat(58));

const failures = [];
let compared = 0;

// --- 1. the exported table ---------------------------------------------------
for (const [key, name] of Object.entries(EV)) {
  compared++;
  if (exported.events?.[key] !== name) {
    failures.push(`${key}: exported "${exported.events?.[key]}", reference "${name}"`);
  }
}
for (const key of Object.keys(exported.events ?? {})) {
  compared++;
  if (!(key in EV)) failures.push(`${key}: exported but not in the reference's table`);
}
compared += 2;
if (exported.token !== TOKEN) failures.push('the exported token is not the reference\'s');
if (exported.endpoint !== ENDPOINT) failures.push('the exported endpoint is not the reference\'s');
say(`  taxonomy   ${String(Object.keys(EV).length).padStart(4)} events  `
  + `${failures.length ? `\x1b[31m${failures.length} differ\x1b[0m` : '\x1b[32mall agree\x1b[0m'}`);

// --- 2. the port's constants -------------------------------------------------
//
// Only the events, not every constant in the file: the batch sizes and the storage keys are
// the port's own business.
const declared = new Map();
for (const line of module.split('\n')) {
  const m = /^const ([A-Z][A-Z0-9_]*) := "([^"]*)"$/.exec(line.trim());
  if (!m) continue;
  if (!(m[1] in EV)) continue;          // BATCH_SIZE and friends are not events
  declared.set(m[1], m[2]);
}
const constBefore = failures.length;
for (const [key, name] of declared) {
  compared++;
  if (EV[key] !== name) failures.push(`analytics.gd ${key} = "${name}", reference "${EV[key]}"`);
}
// A string that looks like an event name but is not declared under its own key — the shape a
// copy-paste error takes.
for (const line of module.split('\n')) {
  const m = /^const ([A-Z][A-Z0-9_]*) := "([A-Z][a-z]+ [A-Za-z ]+)"$/.exec(line.trim());
  if (!m || declared.has(m[1])) continue;
  compared++;
  failures.push(`analytics.gd ${m[1]} = "${m[2]}" is not an event in the reference's table`);
}
say(`  constants  ${String(declared.size).padStart(4)} events  `
  + `${failures.length > constBefore ? `\x1b[31m${failures.length - constBefore} wrong\x1b[0m`
    : '\x1b[32mall match the reference\x1b[0m'}`);

// --- 3. what the port does not send yet --------------------------------------
//
// Measured from the call sites rather than from the constants: a constant nobody uses is not
// instrumentation. Every `Telemetry.<KEY>` in the port's own scripts counts.
const sources = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.gd')) sources.push(full);
  }
};
walk(path.join(root, 'godot', 'scripts'));
const used = new Set();
for (const file of sources) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/Telemetry\.([A-Z][A-Z0-9_]*)/g)) {
    if (m[1] in EV) used.add(m[1]);
  }
  // The module sends two of its own — the session's first and last event — and refers to them
  // by bare name because it is inside the class. Excluding the module instead reported both as
  // declared-and-never-sent, which is how this counting was wrong the first time.
  for (const m of text.matchAll(/_track\(([A-Z][A-Z0-9_]*)/g)) {
    if (m[1] in EV) used.add(m[1]);
  }
}
const unused = [...declared.keys()].filter((key) => !used.has(key));
for (const key of unused) {
  compared++;
  failures.push(`analytics.gd declares ${key} and nothing sends it`);
}
const missing = Object.keys(EV).filter((key) => !used.has(key));
say(`  call sites ${String(used.size).padStart(4)} events sent, ${missing.length} not yet`);
say();
if (missing.length) {
  say('  \x1b[2mthe reference sends these and the port does not, yet:\x1b[0m');
  for (let i = 0; i < missing.length; i += 4) {
    say(`  \x1b[2m${missing.slice(i, i + 4).map((k) => k.toLowerCase()).join(', ')}\x1b[0m`);
  }
  say();
}

if (failures.length) {
  say('\x1b[31mFAIL\x1b[0m — the port and the reference disagree:');
  for (const line of failures.slice(0, 12)) say(`  ${line}`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${compared.toLocaleString()} checks: the port reports to the same`);
say(`   project under ${used.size} of the reference's ${Object.keys(EV).length} event names.`);
