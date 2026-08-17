/**
 * Enemy AI parity: does the Godot port fight the same way?
 *
 *   node tools/ai-parity.mjs
 *
 * `parity.mjs` proves the two engines do the same arithmetic and
 * `data-parity.mjs` proves they read the same numbers. This proves they make
 * the same decisions, which is the third thing that has to hold and the one
 * most likely to rot quietly.
 *
 * The bestiary keeps its choreography in `ai` rules: every boss's escalation is
 * `phase` numbers on `hpBelow` entries. That logic was wrong in the reference
 * for the life of the project — a phase rule fired once and then locked itself
 * out, so bosses got *weaker* as their health fell and their signature moves
 * ran for exactly one turn each. Nothing crashed and no screenshot showed it.
 * A port is an excellent opportunity to reintroduce precisely that, so both
 * sides walk every creature through the same descending-HP sweep and every
 * chosen move is compared.
 *
 * Descending, and carrying the phase forward, on purpose: this measures the
 * *sequence* a creature produces over a fight rather than isolated lookups. A
 * phase bug is invisible to the latter and obvious in the former.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENEMIES } from '../src/data/enemies.js';
import { chooseAction } from '../src/battle/ai.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const ROLLS = [0.05, 0.5, 0.95];
const HP_STEPS = [1.0, 0.9, 0.8, 0.7, 0.66, 0.6, 0.55, 0.5, 0.45, 0.4,
  0.35, 0.3, 0.25, 0.2, 0.18, 0.15, 0.12, 0.1, 0.07, 0.05];
const TURNS = 14;

/** Must match `EnemyAI.signature` exactly. */
function signature(action = {}) {
  const kind = String(action.kind ?? 'attack');
  const name = String(action.name ?? '');
  const spell = String(action.spell ?? '');
  const power = Number(action.power ?? 1).toFixed(4);
  const target = String(action.target ?? 'one');
  const element = String(action.element ?? '');
  return `${kind}|${name}|${spell}|${power}|${target}|${element}`;
}

const reference = [];
for (const id of Object.keys(ENEMIES).sort()) {
  const rules = ENEMIES[id].ai ?? [];
  for (const roll of ROLLS) {
    for (const allyDown of [false, true]) {
      let phase = 0;
      let turn = 0;
      for (const hp of HP_STEPS) {
        turn += 1;
        if (turn > TURNS) turn = 1;
        const decision = chooseAction(rules, {
          hpFraction: hp, aiTurn: turn, phase, roll: () => roll, allyDown,
        });
        phase = decision.phase;
        reference.push(signature(decision.action) + (decision.entered ? '!' : ''));
      }
    }
  }
}

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/ai_probe.gd',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128 * 1024 * 1024 });
  const line = raw.split('\n').find((l) => l.trim().startsWith('{') && l.includes('"sig"'));
  if (!line) throw new Error(`no JSON payload in Godot output:\n${raw.slice(-800)}`);
  ported = JSON.parse(line);
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot AI probe.');
  say(`  ${err.message.split('\n')[0]}`);
  process.exit(1);
}

say('\x1b[1mEnemy AI: the Godot port against the reference implementation\x1b[0m');
say('─'.repeat(62));

const theirs = ported.sig ?? [];
if (theirs.length !== reference.length) {
  say(`  \x1b[31m✗\x1b[0m the two grids disagree in size: reference ${reference.length}, `
    + `port ${theirs.length} — nothing below would be comparable`);
  process.exit(1);
}

let wrong = 0;
let firstAt = -1;
for (let i = 0; i < reference.length; i++) {
  if (reference[i] !== theirs[i]) {
    wrong++;
    if (firstAt < 0) firstAt = i;
  }
}

const bosses = Object.values(ENEMIES).filter((e) => e.boss).length;
say(`  ${Object.keys(ENEMIES).length} creatures (${bosses} of them bosses)`);
say(`  ${reference.length.toLocaleString()} decisions compared`);
say();
if (wrong) {
  say(`  \x1b[31m✗\x1b[0m ${wrong} decisions differ. First at ${firstAt}:`);
  say(`      reference "${reference[firstAt]}"`);
  say(`      port      "${theirs[firstAt]}"`);
  say();
  say('\x1b[31mFAIL\x1b[0m — the port does not fight the same way. Phase handling is the');
  say('usual cause, and it fails silently: bosses simply stop escalating.');
  process.exit(1);
}
say('\x1b[32mOK\x1b[0m — every creature chooses the same move in every state.');
