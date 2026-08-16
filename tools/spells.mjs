/**
 * Effect reachability — spells and summons the game accepts and cannot resolve.
 *
 *   node tools/spells.mjs
 *
 * `audit.mjs` asks whether a spell can be *learned*. This asks the question
 * one step further on: when the player finally casts the thing, is there any
 * code that knows what it does?
 *
 * The gap between those two questions hid three spells for the whole life of
 * the project. `applySpecialSpell` resolves `spell.effect` through a switch
 * with a `default:` arm that prints "No effect", so a spell whose effect
 * string has no case does not throw, does not warn, and does not show up in a
 * build — it just quietly takes the turn and the MP and prints a miss. Two of
 * them were taught by the Vagrant Star, Osric's signature magicite, and one
 * was Quicksilver: eighty MP, tier five, the top of the grey school.
 *
 * The same shape exists for esper summons, which resolve `summon.effect`
 * through a chain of comparisons rather than a switch, so both dispatch
 * styles are recognised here.
 *
 * The resolvers are read out of the source rather than imported, because the
 * thing being verified is that a branch for the effect *exists* — there is
 * nothing to import, and a checker that called the function would need a live
 * battle, a renderer and a target to find out.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPELLS } from '../src/data/spells.js';
import { ESPERS } from '../src/data/espers.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);
const src = fs.readFileSync(path.join(root, 'src/battle/battle.js'), 'utf8');

/**
 * Every effect name one named generator can resolve.
 *
 * Both dispatch shapes count, because the codebase uses both: the spell
 * resolver is a `switch` on `spell.effect`, and the summon resolver is a
 * chain of `esper.summon.effect === 'x'` comparisons. Matching only `case`
 * labels reported all six working summons as unhandled — a checker that
 * assumes one house style finds bugs that are not there, which is worse than
 * finding none.
 */
function handledBy(fnName) {
  const at = src.search(new RegExp(`\\*${fnName}\\s*\\(`));
  if (at < 0) return null;
  let depth = 0, i = src.indexOf('{', at), end = src.length;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = src.slice(at, end);
  return new Set([
    ...[...body.matchAll(/case\s+'([\w]+)'/g)].map((m) => m[1]),
    ...[...body.matchAll(/effect\s*===\s*'([\w]+)'/g)].map((m) => m[1]),
  ]);
}

const spellCases = handledBy('applySpecialSpell');
const summonCases = handledBy('doSummon');

say('\x1b[1mEffect reachability: declared effects against their resolver\x1b[0m');
say('─'.repeat(60));

const problems = [];

if (!spellCases) problems.push('applySpecialSpell not found in src/battle/battle.js');
else {
  const declared = Object.values(SPELLS).filter((s) => s.kind === 'special');
  const missing = declared.filter((s) => !spellCases.has(s.effect));
  say(`special spells: ${declared.length} declared, ${spellCases.size} effects handled`);
  for (const s of missing) {
    problems.push(`${s.name} (${s.mp} MP, tier ${s.tier ?? 1}) declares effect '${s.effect}', `
      + 'which applySpecialSpell does not handle — it resolves to "No effect"');
  }
}

if (!summonCases) problems.push('doSummon not found in src/battle/battle.js');
else {
  const declared = Object.values(ESPERS).filter((e) => e.summon?.effect);
  const missing = declared.filter((e) => !summonCases.has(e.summon.effect));
  say(`esper summons: ${declared.length} declared, ${summonCases.size} effects handled`);
  for (const e of missing) {
    problems.push(`${e.name} summons '${e.summon.effect}', which doSummon does not handle`);
  }
}

say();
if (problems.length) {
  for (const p of problems) say(`  \x1b[31m✗\x1b[0m ${p}`);
  say();
  say(`\x1b[31mFAIL\x1b[0m — ${problems.length} effect(s) the player can pay for and nothing resolves.`);
  process.exit(1);
}
say('\x1b[32mOK\x1b[0m — every declared spell and summon effect has a resolver.');
