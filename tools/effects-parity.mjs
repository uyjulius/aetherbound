/**
 * Effects parity: what a scene's calls actually do.
 *
 *   node tools/effects-parity.mjs
 *
 * `events-parity.mjs` proves the port's 124 scenes make the same calls the reference's do, in
 * the same order, with the same arguments. It cannot prove those calls *land*, and this is not
 * a hypothetical distinction: the port shipped an `EventContext` where a dozen calls recorded
 * themselves and then did nothing at all. The cataclysm set a property nobody read, so half the
 * second act never happened; espers granted by scenes were never added; a night's rest healed
 * nobody; and two scenes worked out what the party owed from a hard-coded 500 gil. Every
 * transcript matched, because a transcript is a record of what was *said*, and the reference
 * says the same things.
 *
 * So this compares the party afterwards. Each case starts from a fresh New Game — built the
 * same way on both sides, which `saves-parity.mjs` already proves is the same party — applies a
 * short list of context calls, and serialises. The reference side calls the reference's own
 * party methods, which is what its scenes do: `p.restAll()`, `p.espers.delete(id)`,
 * `m.esper = null`. Every value in the save is compared, so a call that changes one number too
 * many fails here as loudly as one that changes nothing.
 *
 * The second half is the questions. A context answers scenes as well as serving them, and the
 * port's answers were partly fiction — `count_item` returned 3 whatever was in the bag. Those
 * are compared as values.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Party } from '../src/game/party.js';
import { ITEMS } from '../src/data/items.js';
import { ESPERS } from '../src/data/espers.js';
import { SPELLS } from '../src/data/spells.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

/**
 * The cases, single-sourced here and interpreted by both sides.
 *
 * `setup` is what the scene finds; `calls` is what it does; `ask` is what it asks afterwards.
 * Every call the port's context can make to a party is covered — the point of the harness is
 * that a call which is merely recorded is indistinguishable from a call that works, so being
 * exhaustive is the whole design rather than a nicety.
 */
const CASES = [
  { name: 'a story flag', calls: [['set_flag', ['cataclysm']]] },
  { name: 'a flag asked about', calls: [['set_flag', ['cataclysm']]], ask: ['has_flag', ['cataclysm']] },
  { name: 'a flag never set', calls: [], ask: ['has_flag', ['nonesuch']] },
  { name: 'a quest opened', calls: [['start_quest', ['firstengine']]] },
  { name: 'a quest opened at a stage', calls: [['start_quest_at', ['after', 2]]] },
  { name: 'a quest moved on', calls: [['start_quest_at', ['after', 2]], ['advance_quest', ['after', 3]]] },
  { name: 'a quest moved to where it already is', calls: [['start_quest_at', ['after', 3]], ['advance_quest', ['after', 3]]] },
  { name: 'a quest that was never opened', calls: [['advance_quest', ['nonesuch', 2]]] },
  { name: 'a quest finished', calls: [['start_quest_at', ['after', 4]], ['complete_quest', ['after']]] },
  { name: 'a quest stage read back', calls: [['start_quest_at', ['after', 5]]], ask: ['quest_stage', ['after']] },
  { name: 'the stage of a quest nobody opened', calls: [], ask: ['quest_stage', ['nonesuch']] },
  { name: 'items into the bag', calls: [['add_item', ['potion', 3]]] },
  { name: 'one item, no count', calls: [['add_item', ['elixir']]] },
  { name: 'a key item', calls: [['add_item', ['enginekey', 1]]] },
  { name: 'the bag counted', calls: [['add_item', ['potion', 3]]], ask: ['count_item', ['potion']] },
  { name: 'the bag counted for something absent', calls: [], ask: ['count_item', ['elixir']] },
  { name: 'gold in', calls: [['add_gold', [1234]]] },
  { name: 'gold out', calls: [['spend_gold', [300]]] },
  { name: 'gold the party has not got', calls: [['spend_gold', [999999]]] },
  { name: 'gold read back', calls: [['add_gold', [1234]]], ask: ['gold', []] },
  { name: 'gold read back after spending', calls: [['spend_gold', [200]]], ask: ['gold', []] },
  { name: 'a recruit', calls: [['recruit', ['aurelian']]] },
  { name: 'a recruit at a level', calls: [['recruit', ['kestrel', 20]]] },
  { name: 'a recruit who is already here', calls: [['recruit', ['vesna', 30]]] },
  { name: 'the fifth recruit goes to the bench', calls: [['recruit', ['aurelian']], ['recruit', ['bastian']]] },
  { name: 'whether somebody is in the roster', calls: [['recruit', ['osric']]], ask: ['in_roster', ['osric']] },
  { name: 'whether somebody absent is', calls: [], ask: ['in_roster', ['oda']] },
  { name: 'a recruit read back', calls: [['recruit', ['kestrel', 20]]], ask: ['member_level', ['kestrel']] },
  { name: 'a member who never joined', calls: [], ask: ['member_level', ['oda']] },
  { name: 'an esper given', calls: [['add_esper', ['hollowking']]] },
  { name: 'an esper taken back', calls: [['remove_esper', ['emberwake']]] },
  { name: 'an esper unequipped from whoever held it', calls: [['clear_esper', ['vesna']]] },
  { name: 'whether the party carries an esper', calls: [['add_esper', ['greenmother']]], ask: ['has_esper', ['greenmother']] },
  { name: 'whether it carries one it does not', calls: [], ask: ['has_esper', ['ninthlantern']] },
  { name: 'a spell taught to one member', calls: [['member_learn_spell', ['wick', 'reprise']]] },
  { name: 'a spell taught twice', calls: [['member_learn_spell', ['wick', 'reprise']], ['member_learn_spell', ['wick', 'reprise']]] },
  { name: 'a spell taught to somebody who knows it', calls: [['member_learn_spell', ['vesna', 'ember']]] },
  { name: 'a night at a shrine', setup: [['wound', []]], calls: [['rest_all', []]] },
  { name: 'a night that also wakes the fallen', setup: [['wound', []], ['ko', ['corvin']]], calls: [['rest_all', []]] },
  { name: 'the world turning over', calls: [['world_state', ['ruin']]] },
  { name: 'the world read back', calls: [['world_state', ['ruin']]], ask: ['world_state', []] },
  { name: 'the world before it turns', calls: [], ask: ['world_state', []] },
  { name: 'the bestiary counted', calls: [], ask: ['bestiary_size', []] },
];

// --- the reference side ------------------------------------------------------
//
// A New Game, built exactly as `main.js` builds one. Not shared with the port through a
// fixture on purpose: if the two ever stop starting from the same party, that is itself
// something this should notice.
function newGame() {
  const party = new Party();
  const equip = (member, ids) => {
    for (const id of ids) {
      const item = ITEMS[id];
      if (item) member.equipment[item.slot] = item;
    }
    member.fullRestore();
  };
  const vesna = party.recruit('vesna', 6);
  equip(vesna, ['ironsword', 'travelvest', 'leathercap']);
  for (const s of ['ember', 'rime', 'spark', 'mend', 'dimming']) vesna.learnSpell(s);
  const corvin = party.recruit('corvin', 6);
  equip(corvin, ['boltdirk', 'travelvest', 'leathercap', 'woodshield']);
  const wick = party.recruit('wick', 6);
  equip(wick, ['ashrod', 'silkrobe', 'leathercap']);
  for (const s of ['mend', 'cleanse', 'renewal', 'wardflesh', 'scan']) wick.learnSpell(s);
  party.addItem('potion', 5);
  party.addItem('antidote', 2);
  party.addItem('tonic', 2);
  party.espers.add('emberwake');
  vesna.esper = ESPERS.emberwake;
  vesna.fullRestore();
  return party;
}

function prepare(party, what, args) {
  switch (what) {
    case 'wound':
      for (const m of party.roster.values()) { m.hp = 1; m.mp = 0; }
      return;
    case 'ko':
      party.roster.get(args[0]).hp = 0;
      return;
    case 'spend_all':
      party.gold = 0;
      return;
    default:
      throw new Error(`unknown setup step: ${what}`);
  }
}

/** The reference's own party methods — which is what its scenes call. */
function apply(party, call, args) {
  switch (call) {
    case 'set_flag': return party.setFlag(args[0]);
    case 'start_quest': return party.startQuest(args[0]);
    case 'start_quest_at': return party.startQuest(args[0], args[1]);
    case 'advance_quest': return party.advanceQuest(args[0], args[1]);
    case 'complete_quest': return party.completeQuest(args[0]);
    case 'add_item': return party.addItem(args[0], args[1] ?? 1);
    case 'add_gold': return party.addGold(args[0]);
    case 'spend_gold': return party.spendGold(args[0]);
    case 'recruit': return party.recruit(args[0], args[1] ?? null);
    case 'add_esper': return party.espers.add(args[0]);
    case 'remove_esper': return party.espers.delete(args[0]);
    case 'clear_esper': {
      const m = party.roster.get(args[0]);
      if (m) m.esper = null;
      return undefined;
    }
    case 'member_learn_spell': {
      const m = party.roster.get(args[0]);
      if (m) m.learnSpell(args[1]);
      return undefined;
    }
    case 'rest_all': return party.restAll();
    case 'world_state': { party.worldState = args[0]; return undefined; }
    default: throw new Error(`unknown call: ${call}`);
  }
}

function ask(party, call, args) {
  switch (call) {
    case 'count_item': return party.countItem(args[0]);
    case 'gold': return party.gold;
    case 'has_flag': return party.hasFlag(args[0]);
    case 'has_esper': return party.espers.has(args[0]);
    case 'in_roster': return party.roster.has(args[0]);
    case 'quest_stage': return party.questStage(args[0]);
    case 'bestiary_size': return party.bestiary.size;
    case 'member_level': return party.roster.get(args[0])?.level ?? -1;
    case 'world_state': return party.worldState;
    default: throw new Error(`unknown question: ${call}`);
  }
}

const expected = {};
for (const testCase of CASES) {
  const party = newGame();
  for (const [what, args] of testCase.setup ?? []) prepare(party, what, args);
  for (const [call, args] of testCase.calls ?? []) apply(party, call, args);
  expected[testCase.name] = {
    party: party.serialize(),
    answer: testCase.ask ? ask(party, testCase.ask[0], testCase.ask[1]) : null,
  };
}

// --- the port's side ---------------------------------------------------------
const casesFile = path.join(os.tmpdir(), 'aetherbound-effects-cases.json');
fs.writeFileSync(casesFile, JSON.stringify(CASES));

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/effects_probe.gd', '--', casesFile,
  ], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  const start = raw.indexOf('{"cases"');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-800)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot effects probe.');
  say(`  ${String(err.message).split('\n').slice(0, 8).join('\n  ')}`);
  process.exit(1);
}

say('\x1b[1mEffects: what a scene\'s calls do to the party\x1b[0m');
say('─'.repeat(58));

/** Every leaf in a serialised party, as `path → value`, so a difference names itself. */
function leaves(value, at = '', into = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => leaves(item, `${at}[${i}]`, into));
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value).sort()) leaves(value[key], at ? `${at}.${key}` : key, into);
  } else {
    into.set(at, typeof value === 'number' ? Number(value.toFixed(4)) : value);
  }
  return into;
}

const failures = [];
let compared = 0;

for (const testCase of CASES) {
  const mine = ported.cases?.[testCase.name];
  if (!mine) {
    failures.push(`${testCase.name}: the probe returned nothing`);
    continue;
  }
  const theirs = leaves(expected[testCase.name].party);
  const ours = leaves(mine.party);
  const keys = new Set([...theirs.keys(), ...ours.keys()]);
  for (const key of keys) {
    compared++;
    // `null` and a missing key are the same fact in a save; the languages disagree about
    // which one they write.
    const a = theirs.get(key) ?? null;
    const b = ours.get(key) ?? null;
    if (a === b) continue;
    if (failures.length < 12) {
      failures.push(`${testCase.name} — ${key}: port ${JSON.stringify(b)}, `
        + `reference ${JSON.stringify(a)}`);
    }
  }
  if (testCase.ask) {
    compared++;
    const a = expected[testCase.name].answer;
    const b = mine.answer;
    // The bridge writes booleans as booleans and ints as floats; compare by value.
    const same = typeof a === 'boolean' ? Boolean(b) === a
      : typeof a === 'number' ? Number(b) === a : String(b) === String(a);
    if (!same && failures.length < 12) {
      failures.push(`${testCase.name} — ${testCase.ask[0]}(): port ${JSON.stringify(b)}, `
        + `reference ${JSON.stringify(a)}`);
    }
  }
}

say(`  cases        ${String(CASES.length).padStart(5)}`);
say(`  values       ${compared.toLocaleString().padStart(5)}  `
  + `${failures.length ? `\x1b[31m${failures.length} differ\x1b[0m` : '\x1b[32mall agree\x1b[0m'}`);
say();
if (failures.length) {
  say('\x1b[31mFAIL\x1b[0m — a scene\'s calls do something different in the port:');
  for (const line of failures) say(`  ${line}`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${compared.toLocaleString()} values across ${CASES.length} cases: every call a`);
say('   scene can make lands on the party exactly as the reference lands it.');
