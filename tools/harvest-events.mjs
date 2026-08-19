/**
 * Harvest what every scripted event actually does.
 *
 *   node tools/harvest-events.mjs
 *
 * The 108 events in `src/data/events*.js` are generators taking `(game, ctx)`, and
 * they reach the world through a narrow surface: dialogue, a battle, a chest, a
 * flag, a quest, a track of music, a shake of the camera. That makes them testable
 * without a renderer — drive the generator with a `game` that records every call
 * instead of performing it, and what comes out is the scene's script.
 *
 * No browser. These modules import the scheduler, the map's tile size and the esper
 * table, and nothing that needs a canvas.
 *
 * Each event is run under several **policies**, because an event is a branching
 * script and one pass through it proves one branch:
 *
 *   first    every choice takes option 0, every battle is won, no flags set
 *   second   every choice takes option 1
 *   last     every choice takes the final option
 *   lost     every battle is lost
 *   flagged  every flag already set and every quest already advanced
 *
 * The transcript is the ordered list of calls and yields. `tools/events-parity.mjs`
 * makes the Godot port run the same events under the same policies and compares.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EVENTS } from '../src/data/events.js';
import { VOL2_EVENTS } from '../src/data/events-vol2.js';
import { VOL3_EVENTS } from '../src/data/events-vol3.js';
import { VOL4_EVENTS } from '../src/data/events-vol4.js';
import { VOL5_EVENTS } from '../src/data/events-vol5.js';
import { BOSS_EVENTS } from '../src/data/events-bosses.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const ALL = {
  ...EVENTS, ...VOL2_EVENTS, ...VOL3_EVENTS, ...VOL4_EVENTS, ...VOL5_EVENTS, ...BOSS_EVENTS,
};

const POLICIES = ['first', 'second', 'last', 'lost', 'flagged'];
/** A scene that yields this many times without finishing is not a scene. */
const STEP_CAP = 20000;

/**
 * A `game` that writes down what was asked of it.
 *
 * Every method that the events use is here, and anything they reach for that is
 * missing shows up as a thrown error naming it — which is the point: the port has to
 * offer exactly this surface, and a scene that quietly did nothing because a mock
 * swallowed a call would compare equal to a scene that was never written.
 */
function recorder(policy) {
  const log = [];
  const record = (call, ...args) => {
    log.push({ call, args: args.map(plain) });
  };
  const flags = new Set();
  const quests = new Map();

  const choose = (choices) => {
    const n = Array.isArray(choices) ? choices.length : 2;
    if (policy === 'second') return Math.min(1, n - 1);
    if (policy === 'last') return n - 1;
    return 0;
  };

  /** A member, with the surface a scene reads off one. */
  const member = (id) => ({
    id, name: id.charAt(0).toUpperCase() + id.slice(1), level: 6,
    hp: 100, mp: 20, limit: 0,
    learnSpell: (spell) => record('member.learnSpell', id, spell),
    knowsSpell: () => policy === 'flagged',
    equipment: {},
    spells: {},
  });

  const dialogue = {
    *speak(speaker, lines, opts) { record('dialogue.speak', speaker, lines, opts); },
    *say(speaker, line, opts) { record('dialogue.say', speaker, line, opts); },
    *ask(question, choices, opts) {
      const picked = choose(choices);
      record('dialogue.ask', question, choices, opts, picked);
      return picked;
    },
    close() { record('dialogue.close'); },
  };

  const party = {
    hasFlag: (id) => { record('party.hasFlag', id); return policy === 'flagged' || flags.has(id); },
    setFlag: (id) => { record('party.setFlag', id); flags.add(id); },
    startQuest: (id, stage = 0) => record('party.startQuest', id, stage),
    advanceQuest: (id, stage) => record('party.advanceQuest', id, stage),
    completeQuest: (id) => record('party.completeQuest', id),
    questStage: (id) => { record('party.questStage', id); return policy === 'flagged' ? 99 : 0; },
    recruit: (id, level) => { record('party.recruit', id, level); return member(id); },
    member: (id) => { record('party.member', id); return member(id); },
    addItem: (id, count) => record('party.addItem', id, count),
    addGold: (amount) => record('party.addGold', amount),
    learnSpell: (id) => record('party.learnSpell', id),
    fullRestore: () => record('party.fullRestore'),
    averageLevel: () => 6,
    hasEncounterWard: () => false,
    activeMembers: [{ id: 'vesna', name: 'Vesna', level: 6 }],
    espers: { has: (id) => { record('party.espers.has', id); return policy === 'flagged'; },
      add: (id) => record('party.espers.add', id) },
    roster: { has: (id) => { record('party.roster.has', id); return policy === 'flagged'; },
      get: (id) => ({ id, name: id }), values: () => [], size: 1 },
    spendGold: (amount) => { record('party.spendGold', amount); return true; },
    inventory: new Map(),
    // The bestiary is a count in one scene — how many kinds of creature have been
    // met — so it is a Map like the real one rather than a number.
    bestiary: new Map(policy === 'flagged'
      ? [['fenrat', 1], ['mireslug', 1], ['roadwolf', 1]] : []),
    gold: 500,
    worldState: 'whole',
    playTime: 0,
    quests,
  };

  const game = {
    party,
    dialogue,
    stage: { classList: { toggle: (name, on) => record('stage.class', name, on) } },
    renderer: {
      rig: { shake: (a, b) => record('rig.shake', round(a), round(b)) },
      postfx: {
        flash: (colour, strength) => record('postfx.flash', colour, round(strength)),
        set flashStrength(v) { /* tweened every frame; not a decision */ },
        get flashStrength() { return 0; },
        setGrade: (name, t) => record('postfx.grade', name, round(t)),
        desaturate: 0,
      },
    },
    playMusic: (id, opts) => record('playMusic', id, opts),
    grantChest: function* (id, contents) { record('grantChest', id, contents); },
    gotoMap: (id, spawn) => { record('gotoMap', id, spawn); },
    celebrate: function* (...args) { record('celebrate', ...args); },
    showEnding: function* (...args) { record('showEnding', ...args); },
    startBattleScene: function* (encounter, opts) {
      const result = policy === 'lost' ? 'defeat' : 'victory';
      record('startBattleScene', encounter, opts, result);
      return result;
    },
    runEvent: function* (id, ctx) { record('runEvent', id); },
    saves: { save: (slot) => record('save', slot) },
    autosave: (reason) => record('autosave', reason),
    config: { atbMode: 'wait' },
    currentMapId: 'harrowmere',
  };
  return { game, log };
}

const round = (n) => (typeof n === 'number' ? Number(n.toFixed(4)) : n);

/** Arguments as comparable plain data — functions and nodes are not compared. */
function plain(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'function') return '<fn>';
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === 'object') {
    // The field is passed to `grantChest` so the chest can be placed, and it is a
    // live object with a player and a map in it. Recording its contents would make
    // the transcript a description of the mock rather than of the scene.
    if ('mapDef' in value || 'player' in value) return '<field>';
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (key === 'field' || key === 'npc' || key === 'prop') continue;
      out[key] = plain(value[key]);
    }
    return out;
  }
  if (typeof value === 'number') return round(value);
  return value;
}

/** The trigger context a scene is handed. */
function context() {
  return {
    field: {
      paused: false,
      player: { x: 10, z: 10 },
      npcs: [],
      mapDef: { id: 'harrowmere' },
      // The recruit scenes rebuild the follower line so the new member walks out
      // of the scene with everyone else instead of appearing on the next map load.
      refreshParty: () => {},
      walkTo: function* () {},
    },
    npc: { id: 'innkeeper', name: 'Marla' },
    trigger: { kind: 'event', data: {} },
  };
}

/** Drive one event to the end, recording what it asks for and what it waits on. */
function run(name, event, policy) {
  const { game, log } = recorder(policy);
  const generator = event(game, context());
  let steps = 0;
  let sent;
  for (;;) {
    if (++steps > STEP_CAP) {
      log.push({ call: '<abandoned>', args: [steps] });
      break;
    }
    let step;
    try {
      step = generator.next(sent);
    } catch (err) {
      log.push({ call: '<threw>', args: [String(err.message).slice(0, 200)] });
      break;
    }
    if (step.done) break;
    const y = step.value;
    // Waits are part of a scene's shape — a beat before a line lands is a
    // decision — so they are recorded, rounded, rather than skipped.
    if (y && y.kind === 'wait') {
      log.push({ yield: 'wait', seconds: round(y.seconds) });
      sent = y.seconds;
    } else if (y && y.kind === 'frames') {
      log.push({ yield: 'frames', n: y.n });
      sent = 1 / 60;
    } else if (y && y.kind === 'until') {
      // The predicate is satisfied immediately: everything it could be waiting
      // for is mocked, and a scene that genuinely blocks here would be a scene
      // nobody could finish.
      log.push({ yield: 'until' });
      sent = 1 / 60;
    } else if (y && y.kind === 'tick') {
      sent = 1 / 60;
    } else {
      log.push({ yield: 'other' });
      sent = 1 / 60;
    }
  }
  return log;
}

const transcripts = {};
let calls = 0;
for (const [name, event] of Object.entries(ALL).sort(([a], [b]) => a.localeCompare(b))) {
  transcripts[name] = {};
  for (const policy of POLICIES) {
    const log = run(name, event, policy);
    transcripts[name][policy] = log;
    calls += log.length;
  }
}

fs.mkdirSync(path.join(root, 'tools', 'fixtures'), { recursive: true });
fs.writeFileSync(path.join(root, 'tools', 'fixtures', 'reference-events.json'),
  JSON.stringify({ policies: POLICIES, events: transcripts }));

const abandoned = Object.entries(transcripts)
  .filter(([, runs]) => Object.values(runs).some((log) => log.some((e) => e.call === '<abandoned>')));
const threw = Object.entries(transcripts)
  .filter(([, runs]) => Object.values(runs).some((log) => log.some((e) => e.call === '<threw>')));

say('\x1b[1mHarvesting scripted events\x1b[0m');
say(`  ${Object.keys(ALL).length} events × ${POLICIES.length} policies`);
say(`  ${calls.toLocaleString()} recorded calls and waits`);
if (threw.length) {
  say();
  say(`\x1b[33m${threw.length} event(s) reached for something the recorder does not offer:\x1b[0m`);
  for (const [name, runs] of threw.slice(0, 8)) {
    const first = Object.values(runs).flat().find((e) => e.call === '<threw>');
    say(`  ${name}: ${first.args[0]}`);
  }
}
if (abandoned.length) {
  say(`\x1b[33m${abandoned.length} event(s) never finished:\x1b[0m ${abandoned.map(([n]) => n).join(', ')}`);
}
say();
say(threw.length || abandoned.length
  ? '\x1b[33mPartial\x1b[0m — the surface above has to be filled in before these compare.'
  : '\x1b[32mOK\x1b[0m — every event ran to the end under every policy.');
