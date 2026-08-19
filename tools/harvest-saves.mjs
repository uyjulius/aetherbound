/**
 * Harvest save files from the reference build, and the parties they load as.
 *
 *   npm run build && node tools/harvest-saves.mjs
 *
 * A save is the one piece of this game that outlives the build that wrote it. The
 * port therefore does not get to invent a format: it has to read the blobs the
 * reference has been writing all along, byte-compatibly enough that somebody who
 * has been playing at this address presses Continue and finds their party.
 *
 * So this writes two files, and keeps them apart on purpose:
 *
 *   tools/fixtures/reference-saves.json           the blobs — what the port reads
 *   tools/fixtures/reference-saves-restored.json  the parties — what it is judged against
 *
 * The answers come from the reference's own `restoreParty`, not from the save's
 * contents: the interesting part of loading is what is *recomputed* — a level from
 * experience, a stat from a level, a piece of equipment from an id — and comparing
 * a port against the blob it just read would check nothing at all.
 *
 * Each scenario is a deliberate state, reached through the game's own API rather
 * than by playing: levels gained, a bag filled, magicite carried and banked, a
 * fourth member on the bench, quests at three different stages, chests opened, a
 * world after its cataclysm, an airship parked. Between them they touch every
 * field the format has.
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
const port = Number(flag('port', 5181));
const say = (s = '') => console.log(s);

/**
 * The states to save from.
 *
 * `setup` runs in the page with the live game in hand. Everything it does is
 * deterministic — no `Math.random`, no clock — so the fixture is the same on any
 * machine and a diff in it means the reference changed.
 */
const SCENARIOS = [
  {
    name: 'fresh',
    slot: 0,
    where: { mapId: 'harrowmere', spawn: 'default', locationName: 'Harrowmere' },
    setup: () => {},
  },
  {
    name: 'levelled',
    slot: 1,
    where: { mapId: 'overworld', spawn: 'harrowmere', locationName: 'The Silt Road' },
    setup: (g) => {
      for (const m of g.party.roster.values()) m.gainExp(4000);
      // Hurt, and not evenly: a save that restores everybody to full would hide a
      // clamp that was reading the wrong ceiling.
      const [a, b] = g.party.activeMembers;
      a.hp = 7;
      b.mp = 0;
      g.party.addGold(1234);
      g.party.steps = 4821;
      g.party.playTime = 3671.5;
    },
  },
  {
    name: 'kitted',
    slot: 2,
    where: { mapId: 'sunkenvault', spawn: 'default', locationName: 'The Sunken Vault' },
    setup: (g) => {
      const items = window.__items;
      const party = g.party;
      const [lead, second] = party.activeMembers;
      lead.equipment.weapon = items.rimebrand;
      lead.equipment.relic1 = items.focusring;
      second.equipment.head = null;   // an empty slot, which is its own case
      party.addItem('hipotion', 9);
      party.addItem('phoenixtear', 3);
      party.addItem('echoherb', 1);
      // Magicite carried *and* banked: `esperGrowth` is the field that made which
      // esper you levelled with matter, and it is a float per stat.
      party.espers.add('hoarking');
      lead.esper = window.__espers.hoarking;
      lead.gainExp(9000);
      second.learnSpell('rime', 40);   // part-learned, so the fraction crosses
    },
  },
  {
    name: 'party-of-four',
    slot: 'auto',
    where: { mapId: 'duncastle', spawn: 'gate', locationName: 'Duncastle' },
    setup: (g) => {
      const party = g.party;
      party.recruit('rusk', 12);
      party.recruit('kestrel', 9);
      // Four in, one on the bench, and the rows mixed — the back row halves physical
      // damage, so a row that failed to cross would quietly change every fight.
      party.setActive(['vesna', 'rusk', 'wick', 'kestrel']);
      party.row.set('vesna', 'back');
      party.row.set('kestrel', 'back');
    },
  },
  {
    name: 'mid-story',
    slot: 0,
    // Solmere rather than the open road: it is a town with a `ruin` block, so the save
    // lands somewhere the cataclysm has visibly changed, and its default spawn is one a
    // party can actually stand on — the overworld's, in both worlds, is not.
    where: { mapId: 'solmere', spawn: null, locationName: 'Solmere', nudge: [1.5, 0] },
    setup: (g) => {
      const party = g.party;
      party.setFlag('barrow_cleared');
      party.setFlag('seen_harrowmere');
      party.startQuest('barrow', 0);
      party.startQuest('engine', 0);
      party.advanceQuest('engine', 2);
      party.startQuest('cabinet', 0);
      party.completeQuest('cabinet');
      party.recordKill('fenrat');
      party.recordKill('fenrat');
      party.recordKill('mireslug');
      party.openChest('harrowmere', 'hm-well');
      party.openChest('sunkenvault', 'sv-chest-1');
      party.worldState = 'ruin';
      party.airship = { map: 'overworld', x: 12.5, z: 30.25, facing: 1.5 };
      party.playTime = 20 * 3600 + 42 * 60;
    },
  },
];

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

say('\x1b[1mHarvesting save files\x1b[0m');

/**
 * How a restored party is described.
 *
 * Defined once, in the page, and reimplemented in `godot/tools/saves_probe.gd`
 * against the same field names — so the comparison is between two independent
 * readings of the same blob rather than between two copies of one function.
 */
const DESCRIBE = `(party) => {
  const stats = ['vig', 'spd', 'sta', 'mag', 'res', 'lck'];
  const pairs = (map) => [...map.entries()].map(([k, v]) => k + ':' + v).sort();
  return {
    gold: party.gold,
    playTime: party.playTime,
    steps: party.steps,
    worldState: party.worldState,
    // Sorted pairs rather than JSON: the two languages' serialisers disagree about
    // key order, and where the airship is parked is not a question about key order.
    airship: party.airship
      ? Object.entries(party.airship).map(([k, v]) => k + ':' + v).sort().join(' ') : '',
    active: party.active.join(','),
    reserve: [...party.reserve].sort().join(','),
    inventory: pairs(party.inventory),
    espers: [...party.espers].sort(),
    flags: [...party.flags].sort(),
    quests: [...party.quests.entries()]
      .map(([id, q]) => id + ':' + q.stage + ':' + (q.done ? 1 : 0)).sort(),
    bestiary: pairs(party.bestiary),
    rows: pairs(party.row),
    openedChests: [...party.openedChests].sort(),
    roster: [...party.roster.values()]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((m) => ({
        id: m.id,
        level: m.level,
        exp: m.exp,
        hp: m.hp,
        mp: m.mp,
        maxHP: m.maxHP,
        maxMP: m.maxMP,
        limit: m.limit,
        stats: stats.map((s) => m.stat(s)),
        equipment: Object.entries(m.equipment)
          .map(([slot, item]) => slot + ':' + (item?.id ?? '-')).sort(),
        esper: m.esper?.id ?? '-',
        spells: Object.entries(m.spells).map(([id, p]) => id + ':' + p).sort(),
        statuses: Object.keys(m.statuses).sort(),
        esperGrowth: Object.entries(m.esperGrowth).map(([s, v]) => s + ':' + v).sort(),
      })),
  };
}`;

async function freshCampaign() {
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__game?.state?.newGame || window.__game?.state?.player,
    null, { timeout: 60_000 });
  await page.evaluate(() => {
    // A clean store, so a slot from the previous scenario is never mistaken for this
    // one's, and `latest()` means something.
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('aetherbound.save.')) localStorage.removeItem(key);
    }
    window.__game.state.newGame?.();
  });
  await page.waitForFunction(() => window.__game?.state?.player, null, { timeout: 60_000 });
}

const blobs = {};
const restored = {};

for (const scenario of SCENARIOS) {
  await freshCampaign();
  const got = await page.evaluate(async ({ name, slot, where, setupSource, describeSource }) => {
    const g = window.__game;
    // eslint-disable-next-line no-new-func
    const setup = new Function(`return (${setupSource})`)();
    const describe = new Function(`return (${describeSource})`)();
    setup(g);

    // Actually go there, rather than telling the save it happened. The writer reads the
    // map and the live player position, and a position invented here would be a position
    // no player could be standing on — the ruined overworld put the first attempt at this
    // a tile off the bottom of the world.
    await g.gotoMap(where.mapId, where.spawn ?? 'default');
    await new Promise((resolve) => setTimeout(resolve, 420));
    g.currentMapName = where.locationName;
    const nudge = where.nudge ?? [0, 0];
    if (g.state?.player && (nudge[0] || nudge[1])) {
      // Off the spawn on purpose, so restoring the position is telling a different story
      // from resolving the spawn.
      g.state.player.x += nudge[0];
      g.state.player.z += nudge[1];
    }

    const ok = g.saves.save(slot, g);
    const raw = localStorage.getItem(`aetherbound.save.${slot}`);
    const peek = g.saves.peek(slot);
    // And what it loads as. `restoreParty` is static on the manager's class, reached
    // through the instance because the bundle is minified.
    const party = g.saves.constructor.restoreParty(JSON.parse(raw).party);
    // Whether the party could legally be standing where the save says they are. Reported
    // rather than assumed: a fixture that saves inside a wall is a fixture that proves
    // the port restores nonsense faithfully.
    const at = JSON.parse(raw).position;
    const clear = at ? g.state.map.grid.clear(at.x, at.z, 0.42) : null;
    return { name, ok, raw, peek, clear, described: describe(party) };
  }, {
    name: scenario.name,
    slot: scenario.slot,
    where: scenario.where,
    setupSource: scenario.setup.toString(),
    describeSource: DESCRIBE,
  });

  if (!got.ok || !got.raw) {
    say(`\x1b[31mFAIL\x1b[0m — ${scenario.name} did not write a slot`);
    process.exit(1);
  }
  blobs[scenario.name] = {
    slot: scenario.slot,
    // The blob as text, exactly as it sits in the browser's store. The port parses
    // this, so anything lost in re-serialising it here would be a lie.
    raw: got.raw,
    peek: got.peek,
  };
  restored[scenario.name] = got.described;
  const members = got.described.roster.length;
  // Reported, not enforced: some of the reference's own spawns overlap a collider — the
  // overworld's does, in both worlds — and `resolve` has a rule for a body that starts
  // inside geometry precisely because of it. What would be wrong is not noticing.
  if (got.clear === false) {
    say(`  \x1b[33mnote\x1b[0m  ${scenario.name} saves inside geometry, as the reference `
      + 'stands here too');
  }
  say(`  ${scenario.name.padEnd(14)} ${String(got.raw.length).padStart(6)} bytes  `
    + `${members} member(s)  lv ${got.peek.level}  ${got.described.gold} gil  `
    + `${got.clear === null ? 'no position' : (got.clear ? 'standing clear' : 'inside geometry')}`);
}

await browser.close();
server.kill();

if (pageErrors.length) {
  say();
  say(`\x1b[31mFAIL\x1b[0m — the page threw: ${pageErrors[0]}`);
  process.exit(1);
}

const dir = path.join(root, 'tools', 'fixtures');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'reference-saves.json'),
  `${JSON.stringify({ harvested: Object.keys(blobs).length, saves: blobs }, null, 1)}\n`);
fs.writeFileSync(path.join(dir, 'reference-saves-restored.json'),
  `${JSON.stringify({ harvested: Object.keys(restored).length, parties: restored }, null, 1)}\n`);

say();
say(`\x1b[32mOK\x1b[0m — ${Object.keys(blobs).length} saves and the parties they load as.`);
say('Next: node tools/saves-parity.mjs');
