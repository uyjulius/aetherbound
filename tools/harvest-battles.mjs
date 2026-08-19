/**
 * Harvest battle transcripts from the reference build.
 *
 *   npm run build && node tools/harvest-battles.mjs
 *
 * A fight is not a pure function and not a grid, so it cannot be compared the way
 * the formulas and the maps were. It is a state machine driven by fractional time
 * over a stream of seeded random numbers, and the only honest oracle for it is the
 * reference's own `BattleState`.
 *
 * So: seed the battle and loot streams, start a fight against a fixed group with a
 * scripted command policy — every player turn attacks the first living enemy — let
 * the game's own fixed-step loop run it, and record the state of every combatant
 * each time a turn completes. `tools/battle-parity.mjs` makes the port do the same
 * and compares turn for turn.
 *
 * `tools/balance.mjs` is deliberately not the oracle. It shares the AI walk with
 * the game and nothing else — it has its own battle loop — so comparing the port
 * against it would compare a port to an approximation of the thing being ported.
 *
 * The party is harvested too, not because it is under test but because it must be
 * identical on both sides: a fight between different characters is not a
 * comparison. Level, equipment and current HP/MP cross as data.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const port = Number(flag('port', 5180));
const say = (s = '') => console.log(s);

/**
 * How a player's turn is decided.
 *
 * Named rather than described, because the port has to make exactly the same
 * decision from the same state: a policy that differs by one turn compares two
 * different fights. Each is deliberately mechanical — no "best" target, no
 * cleverness — so both engines can implement it without interpretation.
 *
 *   attack        the first living enemy, every turn
 *   magic         the caster's first known attack spell on the first living enemy,
 *                 falling back to a swing when it is unknown or unaffordable
 *   heal          a Potion on the actor below three fifths health, else a swing
 *   defend-first  defend on the actor's first turn, swing after
 */
const POLICIES = ['attack', 'magic', 'heal', 'defend-first', 'special', 'steal', 'summon', 'limit'];

/**
 * The fights. Attack-only groups on purpose: the spine resolves attacks and
 * defends, and a creature whose rules reach for a spell would be compared against
 * a port that cannot cast one. Varied in size, level and speed so turn order is
 * actually exercised rather than assumed.
 */
const SCENARIOS = [
  { name: 'two-fenrat', enemies: ['fenrat', 'fenrat'], seed: 0x51a3c7 },
  { name: 'one-mireslug', enemies: ['mireslug'], seed: 0x2f6e2b1 },
  { name: 'three-mixed', enemies: ['fenrat', 'mireslug', 'fenrat'], seed: 0x9d2f11 },
  { name: 'two-roadwolf', enemies: ['roadwolf', 'roadwolf'], seed: 0x7c40b3 },
  { name: 'brigands', enemies: ['brigand', 'brigandarcher'], seed: 0x33ba9e },
  { name: 'three-carrionbat', enemies: ['carrionbat', 'carrionbat', 'carrionbat'], seed: 1234 },
  // Far above the party's level, so the fight runs long, the party takes real
  // damage and somebody falls over. A transcript where everything dies to the
  // opening swing proves the opening swing.
  { name: 'coursing-hounds', enemies: ['coursinghound', 'coursinghound'], seed: 0xbeef },
  { name: 'the-far-runner', enemies: ['thefarrunner'], seed: 0xfeed },

  // The other three policies, so spells, items and Defend are exercised rather
  // than described. The same groups deliberately reappear under a different
  // policy: the fight is the control and the decision is the variable.
  { name: 'magic-two-fenrat', enemies: ['fenrat', 'fenrat'], seed: 0x51a3c7, policy: 'magic' },
  { name: 'magic-roadwolves', enemies: ['roadwolf', 'roadwolf'], seed: 0x7c40b3, policy: 'magic' },
  { name: 'magic-brigands', enemies: ['brigand', 'brigandarcher'], seed: 0x33ba9e, policy: 'magic' },
  { name: 'heal-hounds', enemies: ['coursinghound'], seed: 0xbeef, policy: 'heal' },
  { name: 'heal-roadwolves', enemies: ['roadwolf', 'roadwolf'], seed: 0x1234, policy: 'heal' },
  { name: 'defend-hounds', enemies: ['coursinghound'], seed: 0xfeed, policy: 'defend-first' },
  { name: 'defend-brigands', enemies: ['brigand', 'brigandarcher'], seed: 0xabc, policy: 'defend-first' },

  // The per-character commands, summons and desperation. The `move` travels with
  // the scenario rather than being looked up: the fourteen command *tables* still
  // live in the reference's menu code and are a separate job, so what is under test
  // here is the resolution — which is the part with the arithmetic in it.
  {
    name: 'special-hammerfall', enemies: ['roadwolf', 'roadwolf'], seed: 0x7c40b3,
    policy: 'special', side: 'enemies',
    move: { label: 'Hammerfall', power: 2.1, target: 'all' },
  },
  {
    name: 'special-silence', enemies: ['brigand', 'brigandarcher'], seed: 0x33ba9e,
    policy: 'special', side: 'enemies',
    move: { label: 'Third Form: Silence', power: 2.6, status: { silence: 60 } },
  },
  {
    name: 'special-litany', enemies: ['coursinghound'], seed: 0xbeef,
    policy: 'special', side: 'party',
    move: { label: 'Litany of the Ninth', heal: 0.35, status: { regen: 100 } },
  },
  {
    name: 'special-quarry', enemies: ['roadwolf', 'roadwolf'], seed: 0x1234,
    policy: 'special', side: 'enemies',
    move: { label: 'Quarry', quarry: true },
  },
  {
    name: 'special-overclock', enemies: ['brigand', 'brigandarcher'], seed: 0xfeed,
    policy: 'special', side: 'enemies',
    move: { label: 'Overclock', overclock: 0.15, power: 2.4 },
  },
  {
    name: 'special-unmake', enemies: ['roadwolf', 'roadwolf'], seed: 0x2f6e2b1,
    policy: 'special', side: 'enemies',
    move: { label: 'Unmake', unmake: true, power: 1.2 },
  },
  { name: 'steal-brigands', enemies: ['brigand', 'brigandarcher'], seed: 0x51a3c7, policy: 'steal' },
  { name: 'summon-roadwolves', enemies: ['roadwolf', 'roadwolf'], seed: 0x9d2f11, policy: 'summon' },
  { name: 'limit-hounds', enemies: ['coursinghound'], seed: 0x33ba9e, policy: 'limit' },
];

/** Frames a fight is given before it is called a runaway. */
const FRAME_CAP = 60 * 240;

if (!fs.existsSync(path.join(root, 'public', 'game.js'))) {
  say('\x1b[31mFAIL\x1b[0m — public/game.js is missing. Run `npm run build` first.');
  process.exit(1);
}

const server = spawn(process.execPath, [path.join(root, 'tools', 'serve.mjs')], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
});
process.on('exit', () => { try { server.kill(); } catch { /* gone */ } });

const browser = await chromium.launch({
  headless: true,
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));

say('\x1b[1mHarvesting battle transcripts\x1b[0m');
/** A fresh campaign in a fresh page, so no fight inherits another's leftovers. */
async function freshCampaign() {
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__game?.state?.newGame || window.__game?.state?.player,
    null, { timeout: 60_000 });
  await page.evaluate(() => window.__game.state.newGame?.());
  await page.waitForFunction(() => window.__game?.state?.player, null, { timeout: 60_000 });
}

await freshCampaign();

// The party, once, before any fight touches it.
const partyState = await page.evaluate(() => {
  const party = window.__game.party;
  return {
    gold: party.gold,
    inventory: Object.fromEntries(party.inventory),
    members: [...party.roster.values()].map((m) => ({
      id: m.id,
      level: m.level,
      exp: m.exp,
      hp: m.hp,
      mp: m.mp,
      limit: m.limit,
      row: party.row.get(m.id) ?? 'front',
      active: party.active.includes(m.id),
      equipment: Object.fromEntries(
        Object.entries(m.equipment).map(([slot, item]) => [slot, item?.id ?? null])),
      esper: m.esper?.id ?? null,
      spells: { ...m.spells },
    })),
  };
});
say(`  party       ${partyState.members.length} member(s), `
  + `${partyState.members.filter((m) => m.active).length} active`);

const transcripts = {};
for (const [index, scenario] of SCENARIOS.entries()) {
  if (index > 0) await freshCampaign();
  const harvested = await page.evaluate(async ({ enemies, seed, frameCap, policy, move, side }) => {
    const game = window.__game;

    // A fresh fight from a known stream state, and the party restored to full so
    // one scenario cannot poison the next.
    window.__rng.battle.seed(seed);
    window.__rng.loot.seed(seed ^ 0x5bf03635);
    for (const m of game.party.roster.values()) m.fullRestore();

    // Every draw from the battle stream, counted. If the port's count matches and
    // its numbers do not, the bug is in how a number is used; if the counts differ,
    // the two engines are reading different parts of the stream and everything
    // after that point is noise.
    let draws = 0;
    const drawLog = [];
    const realU32 = window.__rng.battle.u32.bind(window.__rng.battle);
    window.__rng.battle.u32 = () => {
      draws++;
      const value = realU32();
      if (drawLog.length < 40) drawLog.push(value >>> 0);
      return value;
    };

    const snapshot = (state) => [...state.party, ...state.enemies].map((c) => ({
      id: c.id, kind: c.kind, hp: c.hp, mp: c.mp, turns: c.turnCount, ko: c.isKO,
      statuses: Object.entries(c.statuses)
        .map(([id, s]) => `${id}:${s.turns ?? 0}`).sort(),
    }));

    const waitFor = async (test, limit = 600) => {
      for (let i = 0; i < limit; i++) {
        if (test()) return true;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return false;
    };

    game.startBattle({}, { group: { enemies }, canFlee: false });
    // Detected by shape, not by class name: the bundle is minified, so
    // `constructor.name` is a single letter and comparing it to 'BattleState'
    // silently never matches.
    if (!await waitFor(() => Array.isArray(game.state?.enemies)
        && Array.isArray(game.state?.party))) {
      return { error: 'the battle never started' };
    }
    const state = game.state;

    // `_openCommandMenu` is the one hook a player's turn passes through, so
    // replacing it is the whole script — no synthesised key presses, no menu
    // navigation, nothing that could land a frame late and change the transcript.
    state._openCommandMenu = (actor) => {
      const target = state.enemies.find((e) => !e.isKO);
      const swing = () => state._commitAction(
        { actor, kind: 'attack', targets: target ? [target] : [] });

      if (policy === 'magic') {
        const known = Object.entries(actor.member?.spells ?? {})
          .filter(([, proficiency]) => proficiency >= 100)
          .map(([id]) => window.__spells[id])
          .filter((spell) => spell?.kind === 'attack')
          .sort((a, b) => a.id.localeCompare(b.id));
        const spell = known[0];
        if (spell && actor.mp >= spell.mp && target) {
          state._commitAction({ actor, kind: 'spell', spell, targets: [target] });
          return;
        }
        swing();
        return;
      }

      if (policy === 'heal') {
        const item = window.__items.potion;
        if (actor.hp < actor.maxHP * 0.6 && state.game.party.countItem('potion') > 0) {
          state._commitAction({ actor, kind: 'item', item, targets: [actor] });
          return;
        }
        swing();
        return;
      }

      if (policy === 'special') {
        const pool = side === 'party' ? state.party : state.enemies;
        const living = pool.filter((c) => !c.isKO);
        const targets = move.target === 'all' || side === 'party' ? living : living.slice(0, 1);
        if (targets.length) {
          state._commitAction({ actor, kind: 'special', move, targets });
          return;
        }
        swing();
        return;
      }

      if (policy === 'steal') {
        if (actor.turnCount === 0 && target) {
          state._commitAction({ actor, kind: 'steal', targets: [target] });
          return;
        }
        swing();
        return;
      }

      if (policy === 'summon') {
        const esper = actor.member?.esper;
        const summon = esper?.summon ?? {};
        const helps = summon.heal !== undefined
          || ['buffParty', 'healParty', 'hasteParty'].includes(summon.effect);
        const pool = helps ? state.party : state.enemies;
        const targets = pool.filter((c) => !c.isKO);
        if (esper && !actor._summoned && actor.mp >= esper.mp && targets.length) {
          state._commitAction({ actor, kind: 'summon', esper, targets });
          return;
        }
        swing();
        return;
      }

      if (policy === 'limit') {
        if (actor.limit >= 100 && target) {
          state._commitAction({ actor, kind: 'limit', targets: [target] });
          return;
        }
        swing();
        return;
      }

      if (policy === 'defend-first') {
        if (actor.turnCount === 0) {
          state._commitAction({ actor, kind: 'defend', targets: [] });
          return;
        }
        swing();
        return;
      }

      swing();
    };

    const log = [];
    let last = [...state.party, ...state.enemies].reduce((n, c) => n + c.turnCount, 0);
    let previous = snapshot(state);
    const realUpdate = state.update.bind(state);
    state.update = (dt, g) => {
      realUpdate(dt, g);
      const total = [...state.party, ...state.enemies]
        .reduce((n, c) => n + c.turnCount, 0);
      if (total === last) return;
      last = total;
      const now = snapshot(state);
      // Whose turn just ended: the one whose count moved.
      let actor = null;
      if (previous) {
        for (let i = 0; i < now.length; i++) {
          if (now[i].turns !== previous[i].turns) actor = now[i].id;
        }
      }
      previous = now;
      if (actor) {
        log.push({
          event: 'turn', index: log.length + 1, actor, state: now,
          draws, rng: window.__rng.battle.getState().map((w) => w >>> 0),
        });
      }
    };

    const ended = await waitFor(() => state.phase === 'ending', frameCap);
    // The ending sequence awards spoils a beat after the banner, so the rewards are
    // read once the party's gold has actually moved rather than on the same frame.
    await waitFor(() => state.result && game.party.gold !== undefined, 240);
    await new Promise((resolve) => setTimeout(resolve, 900));

    return {
      ended,
      draw_log: drawLog,
      result: state.result ?? null,
      turns: log,
      final: snapshot(state),
      gold: game.party.gold,
      levels: Object.fromEntries([...game.party.roster.values()].map((m) => [m.id, m.level])),
      inventory: Object.fromEntries(game.party.inventory),
      // What the fight left behind, member by member. Spoils are not part of a turn and the
      // transcript stopped at the last one, so the port could fight every fight identically and
      // still hand out nothing at the end of them — which is exactly what it did: espers teach
      // magic in this game and the port's never taught anybody a thing.
      spoils: Object.fromEntries([...game.party.roster.values()].map((m) => [m.id, {
        level: m.level, exp: m.exp, spells: { ...m.spells },
      }])),
    };
  }, {
    enemies: scenario.enemies, seed: scenario.seed, frameCap: FRAME_CAP,
    policy: scenario.policy ?? 'attack',
    move: scenario.move ?? {}, side: scenario.side ?? 'enemies',
  });

  if (harvested.error) {
    say(`  \x1b[31mFAIL\x1b[0m ${scenario.name}: ${harvested.error}`);
    continue;
  }
  transcripts[scenario.name] = { ...scenario, ...harvested };
  say(`  ${scenario.name.padEnd(18)} ${(scenario.policy ?? 'attack').padEnd(12)} `
    + `${String(harvested.turns.length).padStart(3)} turns  ${harvested.result ?? 'unfinished'}`);
}

if (pageErrors.length) {
  say(`\x1b[31mFAIL\x1b[0m — the page threw ${pageErrors.length} error(s):`);
  for (const line of pageErrors.slice(0, 4)) say(`  ${line}`);
}

await browser.close();
try { server.kill(); } catch { /* gone */ }

// Two files, kept apart on purpose — the same separation the field harvest uses.
//
// `battle-setup.json` is *input*: the party the fight is fought with and the seeds
// it is fought under, which the port reads because a fight between different
// characters is not a comparison. `reference-battles.json` is the *answer*, and only
// the harness reads it. A port handed the transcript it is being compared against
// proves nothing at all.
fs.mkdirSync(path.join(root, 'tools', 'fixtures'), { recursive: true });
fs.writeFileSync(path.join(root, 'tools', 'fixtures', 'battle-setup.json'),
  JSON.stringify({
    party: partyState,
    scenarios: Object.values(transcripts).map(({ name, enemies, seed, policy, move, side }) => ({
      name, enemies, seed, policy: policy ?? 'attack',
      move: move ?? {}, side: side ?? 'enemies',
    })),
  }, null, 1));
fs.writeFileSync(path.join(root, 'tools', 'fixtures', 'reference-battles.json'),
  JSON.stringify({ scenarios: transcripts }, null, 1));

say();
if (pageErrors.length) process.exit(1);
const turns = Object.values(transcripts).reduce((n, t) => n + t.turns.length, 0);
say(`\x1b[32mOK\x1b[0m — ${Object.keys(transcripts).length} fights, ${turns} turns.`);
say('Run `node tools/battle-parity.mjs` to hold the port against them.');
