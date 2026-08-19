/**
 * Battle parity: the port's fights against the reference's.
 *
 *   node tools/battle-parity.mjs
 *
 * The oracle is `tools/fixtures/reference-battles.json`, harvested by
 * `harvest-battles.mjs` from the reference's own `BattleState` under a scripted
 * command policy and a seeded stream. Both sides fight the same party against the
 * same group from the same seed, and every completed turn is compared: whose turn
 * it was, and the HP, MP, statuses, turn count and knockout state of everyone in
 * the fight afterwards.
 *
 * Turn by turn rather than at the end, because an outcome that matches proves very
 * little — two fights can arrive at the same victory by different routes, and a
 * port that rounds one damage number differently will usually still win. The first
 * turn that differs is where the bug is, and it is printed with both sides' numbers
 * side by side.
 *
 * ATB is deliberately not compared. The reference spends frames animating what the
 * port resolves immediately, so the two agree on the order gauges fill in and not on
 * the value on a bar at a given instant. Order is what a fight is made of.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const fixturePath = path.join(root, 'tools', 'fixtures', 'reference-battles.json');
if (!fs.existsSync(fixturePath)) {
  say('\x1b[31mFAIL\x1b[0m — no fixture. Run `npm run build && npm run harvest:battles`.');
  process.exit(1);
}
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/battle_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const start = raw.indexOf('{"scenarios"');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-800)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 8).join('\n  ')}`);
  process.exit(1);
}

say('\x1b[1mBattle: the port’s fights against the reference’s\x1b[0m');
say('─'.repeat(58));

const failures = [];
let comparedTurns = 0;
let comparedValues = 0;

/** One combatant's state as a single comparable line. */
const line = (c) => `${c.id} hp=${c.hp} mp=${c.mp} turns=${c.turns}`
  + `${c.ko ? ' KO' : ''}${c.statuses?.length ? ` [${c.statuses.join(' ')}]` : ''}`;

for (const [name, expected] of Object.entries(fixture.scenarios)) {
  const actual = ported.scenarios?.[name];
  if (!actual) {
    failures.push(`${name}: the port fought no such battle`);
    continue;
  }
  if (actual.unsupported?.length) {
    failures.push(`${name}: the spine could not resolve ${actual.unsupported.join(', ')}`);
    continue;
  }

  // The stream itself, strictly: the same numbers in the same order. This is
  // unambiguous where a per-turn count is not, and it is what caught the port
  // skipping the pre-emptive-strike roll at the start of every fight.
  const mine = actual.draw_log ?? [];
  const theirs = expected.draw_log ?? [];
  const shared = Math.min(mine.length, theirs.length);
  for (let i = 0; i < shared; i++) {
    comparedValues++;
    if (mine[i] !== theirs[i]) {
      failures.push(`${name}: the battle stream diverges at draw ${i + 1} — `
        + `port ${mine[i]}, reference ${theirs[i]}`);
      break;
    }
  }

  let firstDivergence = -1;
  const turns = Math.min(expected.turns.length, actual.turns.length);
  for (let i = 0; i < turns; i++) {
    comparedTurns++;
    const a = actual.turns[i];
    const b = expected.turns[i];
    const problems = [];
    if (a.actor !== b.actor) problems.push(`actor: port ${a.actor}, reference ${b.actor}`);
    for (let k = 0; k < b.state.length; k++) {
      comparedValues += 5;
      const mine = line(a.state[k] ?? {});
      const theirs = line(b.state[k]);
      if (mine !== theirs) problems.push(`  port ${mine}\n         reference ${theirs}`);
    }
    if (problems.length) {
      firstDivergence = i + 1;
      // The draw counts are context, not a verdict.
      //
      // They are cumulative at the moment a turn is recorded, and on the reference
      // side that moment is the end of the frame in which the turn's count moved.
      // When the turn had no statuses to tick, its wrap-up finishes inside that
      // same frame, the *next* turn begins in the same frame, and its opening rolls
      // land before the snapshot. So the reference's count legitimately runs one or
      // two ahead of the port's without anything being wrong. What the counts are
      // good for is telling a divergence from a desynchronisation once the states
      // already disagree — and the draw *sequences* are compared separately, where
      // being one number out of step is unambiguous.
      problems.push(`(draws at this point: port ${a.draws}, reference ${b.draws})`);
      failures.push(`${name} turn ${i + 1}:\n         ${problems.join('\n         ')}`);
      break;
    }
  }

  if (firstDivergence < 0 && expected.turns.length !== actual.turns.length) {
    failures.push(`${name}: ${actual.turns.length} turns, reference took ${expected.turns.length}`
      + ' (every shared turn agreed, so the fight diverged after the last compared one)');
  }
  if (firstDivergence < 0 && actual.result !== expected.result) {
    failures.push(`${name}: ended in ${actual.result}, reference ended in ${expected.result}`);
  }
  if (firstDivergence < 0 && actual.gold !== expected.gold) {
    failures.push(`${name}: ${actual.gold} gold, reference ${expected.gold}`);
  }

  const status = firstDivergence < 0 && expected.turns.length === actual.turns.length
    && actual.result === expected.result
    ? '\x1b[32magrees\x1b[0m'
    : `\x1b[31mdiffers${firstDivergence > 0 ? ` from turn ${firstDivergence}` : ''}\x1b[0m`;
  say(`  ${name.padEnd(18)} ${String(expected.turns.length).padStart(3)} turns  `
    + `${(expected.result ?? '?').padEnd(8)} ${status}`);
}

say();
if (failures.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${failures.length} fight(s) differ:`);
  for (const entry of failures.slice(0, 6)) say(`  ${entry}`);
  if (failures.length > 6) say(`  … and ${failures.length - 6} more`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${Object.keys(fixture.scenarios).length} fights, ${comparedTurns} turns, `
  + `${comparedValues.toLocaleString()} values, and the port fought every one of them identically.`);
