/**
 * Audit the analytics taxonomy.
 *
 *   node tools/events.mjs
 *
 * An event stream rots in two directions and neither one throws. Names fork —
 * `Battle Started`, `battle_start`, `BattleBegin` — until no chart can be
 * built across them; and events get declared, dashboards get built on them,
 * and the call site that was supposed to fire them never lands, so the chart
 * reads zero forever and nobody can tell whether that is the instrumentation
 * or the players.
 *
 * So this checks both: every name in `EV` is used somewhere in the game, every
 * `EV.*` referenced actually exists, no two events share a name, and the whole
 * set follows one convention. Exits non-zero if any of that is false.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const read = (p) => fs.readFileSync(p, 'utf8');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

const files = walk(path.join(root, 'src')).filter((f) => f.endsWith('.js'));
const modulePath = path.join(root, 'src/engine/analytics.js');
const mod = read(modulePath);

const declared = [...mod.matchAll(/^ {2}([A-Z_0-9]+):\s*'([^']+)',/gm)]
  .map((m) => ({ key: m[1], name: m[2] }));

// The module fires its own lifecycle events — Session Started, Session Ended —
// so excluding it reported those two as dead. Declarations here are
// `NAME: 'Name',` and never `EV.NAME`, so scanning it cannot false-positive.
const used = new Map();                       // key → files that reference it
for (const f of files) {
  for (const m of read(f).matchAll(/EV\.([A-Z_0-9]+)/g)) {
    const rel = path.relative(root, f);
    if (!used.has(m[1])) used.set(m[1], new Set());
    used.get(m[1]).add(rel);
  }
}

const problems = [];
const say = (s = '') => console.log(s);

say(`${declared.length} events declared, ${used.size} referenced across the game`);

const names = declared.map((d) => d.name);
const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
if (dupes.length) problems.push(`duplicate event names: ${dupes.join(', ')}`);

const undeclared = [...used.keys()].filter((k) => !declared.some((d) => d.key === k));
if (undeclared.length) problems.push(`EV.${undeclared.join(', EV.')} referenced but not declared`);

// `Object Verbed`, title case, no punctuation. One convention or none.
const offConvention = declared.filter((d) => !/^[A-Z][A-Za-z]+( [A-Z][A-Za-z]+)*$/.test(d.name));
if (offConvention.length) {
  problems.push(`off-convention names: ${offConvention.map((d) => `"${d.name}"`).join(', ')}`);
}

const unfired = declared.filter((d) => !used.has(d.key));
if (unfired.length) {
  problems.push(`${unfired.length} declared events are never fired: `
    + unfired.map((d) => d.key).join(', '));
}

say();
say('event                          fired from');
for (const d of declared) {
  const where = used.get(d.key);
  const mark = where ? '' : '\x1b[31m';
  const list = where ? [...where].map((f) => f.replace('src/', '')).join(', ') : 'NOWHERE';
  say(`${mark}${d.name.padEnd(30)} ${list}\x1b[0m`);
}

say();
if (problems.length) {
  for (const p of problems) say(`[!] ${p}`);
  process.exit(1);
}
say('Every declared event fires, every fired event is declared, names are consistent.');
