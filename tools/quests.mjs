/**
 * Journal directions against the world they describe.
 *
 *   node tools/quests.mjs
 *
 * Every quest carries a `where` — the one navigation aid the game has, since
 * there is no map screen and no objective marker. It is hand-written prose,
 * and eleven of them pointed at the wrong place: Grandmaster Oda, who sits in
 * the starting village's shop behind no gate at all, was listed under "the
 * Ninth Lantern", which is a real, loadable, level-68 dungeon on the far
 * continent. A player who trusts the journal walks into a fight forty levels
 * above them; a player who does not trust it has no navigation at all.
 *
 * The check cannot verify prose and does not try. A first version flagged any
 * `where` naming a map other than the quest's own and reported twelve, most of
 * which were correct English: "off the road, west of Harrowmere" names
 * Harrowmere as a landmark, and "Solmere, and the Ninth Well below it" names
 * two places of which the first is right. Flagging those trains people to
 * ignore the checker.
 *
 * So it checks the harm instead of the grammar: a direction that sends the
 * player somewhere *far more dangerous than the quest actually is*. That is
 * the failure that hurt — Grandmaster Oda listed under the Ninth Lantern is a
 * level-68 dungeon standing in for a village shop — and a landmark reference
 * to a safe town is not.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUESTS } from '../src/data/quests.js';
import { ENCOUNTERS, ENEMIES } from '../src/data/enemies.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

// --- where does each quest's script actually run? --------------------------

const eventFiles = fs.readdirSync(path.join(root, 'src/data'))
  .filter((f) => f.startsWith('events') && f.endsWith('.js'));
const eventSrc = eventFiles
  .map((f) => fs.readFileSync(path.join(root, 'src/data', f), 'utf8')).join('\n');

/** eventId → the quests it starts, advances or completes. */
const questsOfEvent = new Map();
{
  const lines = eventSrc.split('\n');
  let current = null;
  for (const line of lines) {
    const def = line.match(/^\s{0,4}\*?\s*([A-Za-z0-9_]+)\s*\(game/)
      || line.match(/^\s{0,4}([A-Za-z0-9_]+):\s*function\*/);
    if (def) current = def[1];
    for (const m of line.matchAll(/(?:start|advance|complete)Quest\(\s*['"`]([\w-]+)['"`]/g)) {
      if (!current) continue;
      if (!questsOfEvent.has(current)) questsOfEvent.set(current, new Set());
      questsOfEvent.get(current).add(m[1]);
    }
  }
}

// Which maps reference which events, and what those maps are called.
const mapDir = path.join(root, 'src/data/maps');
const maps = new Map();               // mapId → display name
const mapsOfQuest = new Map();        // questId → Set<mapId>
for (const file of fs.readdirSync(mapDir).filter((f) => f.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(mapDir, file), 'utf8');
  const mod = await import(path.join(mapDir, file));
  const local = [];
  const collect = (v) => {
    if (!v || typeof v !== 'object') return;
    if (v.terrain && v.id) { maps.set(v.id, { name: v.name || v.id, def: v }); local.push(v.id); }
    else for (const inner of Object.values(v)) collect(inner);
  };
  for (const value of Object.values(mod)) collect(value);
  for (const m of text.matchAll(/event:\s*['"`]([\w-]+)['"`]/g)) {
    const quests = questsOfEvent.get(m[1]);
    if (!quests) continue;
    for (const q of quests) {
      if (!mapsOfQuest.has(q)) mapsOfQuest.set(q, new Set());
      for (const id of local) mapsOfQuest.get(q).add(id);
    }
  }
}

// --- does any `where` name the wrong real place? ---------------------------

/**
 * Match a map's display name in prose, tolerating the spacing the writing
 * actually uses: the map is "The Iron Quarry" and the journal said "the
 * Ironquarry". An exact match missed it, which is how a checker reports zero
 * problems on data that has them.
 */
function nameRe(name) {
  const body = name.replace(/^the\s+/i, '');
  const pattern = body.split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*');
  return new RegExp(`\\b(?:the\\s+)?${pattern}\\b`, 'i');
}

/** Map display names, longest first so "the Ninth Well" beats "the Ninth". */
const named = [...maps.entries()]
  .map(([id, m]) => ({ id, name: m.name }))
  .filter((m) => m.name && m.name.length > 4)
  .sort((a, b) => b.name.length - a.name.length);

say('\x1b[1mJournal directions against the maps the quests actually run on\x1b[0m');
say('─'.repeat(64));

/**
 * How dangerous a map is: the mean level of anything it can roll.
 *
 * A map's encounters come from its zones or from an inline table, and only
 * sometimes from a registry entry sharing its id — reading `ENCOUNTERS[mapId]`
 * alone scored the Iron Quarry at zero and let the check pass on the very
 * misdirection it was written for.
 */
const mapDanger = new Map();
for (const [id, { def }] of maps) {
  const tables = new Set();
  if (ENCOUNTERS[id]) tables.add(ENCOUNTERS[id]);
  if (def.encounters?.groups) tables.add(def.encounters);
  for (const z of def.encounterZones ?? []) if (ENCOUNTERS[z.table]) tables.add(ENCOUNTERS[z.table]);
  const levels = [...tables].flatMap((t) => (t.groups ?? []).flatMap((g) => g.enemies))
    .map((e) => ENEMIES[e]?.level).filter((n) => typeof n === 'number');
  mapDanger.set(id, levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0);
}

/** A gap this wide turns a wrong direction into a death sentence. */
const LETHAL_GAP = 10;

const wrong = [];
const prose = [];
for (const [id, q] of Object.entries(QUESTS)) {
  if (!q.where) continue;
  const hosts = mapsOfQuest.get(id);
  if (!hosts || !hosts.size) continue;          // nothing to check it against
  const mentioned = named.filter((m) => nameRe(m.name).test(q.where));
  if (!mentioned.length) { prose.push(id); continue; }
  // Naming any correct destination is enough — "Solmere, and the Ninth Well
  // below it" is a good direction, not a wrong one.
  if (mentioned.some((m) => hosts.has(m.id))) continue;
  const safest = Math.min(...[...hosts].map((h) => mapDanger.get(h) ?? 0));
  for (const m of mentioned) {
    const gap = (mapDanger.get(m.id) ?? 0) - safest;
    if (gap >= LETHAL_GAP) {
      wrong.push({ id, where: q.where, names: m.name, gap: Math.round(gap), actually: [...hosts].join(', ') });
    }
  }
}

for (const w of wrong) {
  say(`  \x1b[31m✗\x1b[0m ${w.id.padEnd(12)} says "${w.where}" — that is ${w.names}, `
    + `${w.gap} levels deadlier than ${w.actually}, where the quest actually is`);
}
say();
say(`${Object.keys(QUESTS).length} quests, ${mapsOfQuest.size} with locatable scripts, `
  + `${wrong.length} sending the player somewhere lethal, ${prose.length} written as prose`);

if (wrong.length) {
  say();
  say('\x1b[31mFAIL\x1b[0m — the journal is the only navigation this game has. A direction');
  say('that names a real map far deadlier than the quest is will be followed, and it');
  say('leads somewhere the party cannot survive.');
  process.exit(1);
}
say('\x1b[32mOK\x1b[0m — no journal entry points at somewhere lethal.');
