/**
 * Reachability audit.
 *
 *   node tools/audit.mjs
 *
 * Every bug worth finding in this project so far has been the same bug: content
 * that exists, is correct, and cannot be reached. A chest in a wall. A quest no
 * NPC mentions. A spell no esper teaches. A relic whose effect nothing reads. A
 * summon whose effect has no branch. None of those throw, none of them show up
 * in a build, and a playthrough only catches them by accident.
 *
 * So this checks the whole registry the other way round: not "does everything
 * referenced exist" — the smoke test covers that — but "is everything that
 * exists referenced". It is the difference between a game that runs and a game
 * that can actually be played to completion.
 *
 * Exits non-zero if anything is stranded, so it can gate a build.
 */

import { ENEMIES, ENCOUNTERS, allBosses } from '../src/data/enemies.js';
import { ITEMS, SHOPS } from '../src/data/items.js';
import { SPELLS } from '../src/data/spells.js';
import { ESPERS } from '../src/data/espers.js';
import { TRACKS } from '../src/data/music.js';
import { EVENTS } from '../src/data/events.js';
import { LEGEND, TILE, resolveMap } from '../src/world/map.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

// Optional volumes — present or not depending on what has been merged.
async function optional(rel, key) {
  try { return (await import(rel))[key] ?? {}; } catch { return {}; }
}
const VOL2_EVENTS = await optional('../src/data/events-vol2.js', 'VOL2_EVENTS');
const VOL3_EVENTS = await optional('../src/data/events-vol3.js', 'VOL3_EVENTS');
const VOL4_EVENTS = await optional('../src/data/events-vol4.js', 'VOL4_EVENTS');
const VOL5_EVENTS = await optional('../src/data/events-vol5.js', 'VOL5_EVENTS');
const BOSS_EVENTS = await optional('../src/data/events-bosses.js', 'BOSS_EVENTS');
const ALL_EVENTS = {
  ...EVENTS, ...VOL2_EVENTS, ...VOL3_EVENTS, ...VOL4_EVENTS,
  ...VOL5_EVENTS, ...BOSS_EVENTS,
};

// --- load every map ---------------------------------------------------------

const mapDir = path.join(root, 'src/data/maps');
const maps = [];
for (const file of fs.readdirSync(mapDir).filter((f) => f.endsWith('.js'))) {
  const mod = await import(path.join(mapDir, file));
  for (const value of Object.values(mod)) {
    if (!value || typeof value !== 'object') continue;
    // A map definition, or a bag of interiors keyed by id.
    if (value.terrain) maps.push(value);
    else for (const inner of Object.values(value)) if (inner?.terrain) maps.push(inner);
  }
}

/**
 * Walk a map's base form *and* its ruined override, because half the content
 * in this game only exists in one of the two world states.
 *
 * This defers to the engine's own `resolveMap` rather than merging by hand.
 * An earlier version reimplemented the merge and got it wrong — it appended
 * the ruin's NPCs without honouring `removeNpcs`, so every correctly-written
 * ruin replacement looked like two people standing on one tile. A checker
 * that models the engine approximately reports bugs that do not exist, which
 * is worse than not checking, because somebody goes and "fixes" them.
 */
function variants(def) {
  if (!def.ruin) return [def];
  return [def, resolveMap(def, 'ruin')];
}

// --- gather every reference the world actually makes -------------------------

const referenced = {
  event: new Set(), shop: new Set(), item: new Set(), esper: new Set(),
  enemy: new Set(), track: new Set(), encounter: new Set(),
};

for (const def of maps) {
  for (const v of variants(def)) {
    if (v.music) referenced.track.add(v.music);
    if (v.encounters) referenced.encounter.add(v.id);
    for (const g of v.encounters?.groups ?? []) for (const e of g.enemies) referenced.enemy.add(e);
    for (const z of v.encounterZones ?? []) referenced.encounter.add(z.table);
    for (const n of v.npcs ?? []) {
      if (n.event) referenced.event.add(n.event);
      if (n.shop) referenced.shop.add(n.shop);
      if (n.inn) referenced.shop.add(n.shop ?? '');
    }
    for (const t of v.triggers ?? []) if (t.event) referenced.event.add(t.event);
    for (const p of v.props ?? []) {
      if (p.interact?.event) referenced.event.add(p.interact.event);
      if (p.interact?.shop) referenced.shop.add(p.interact.shop);
      const c = p.contains;
      if (c?.kind === 'item' || c?.kind === 'key') referenced.item.add(c.id);
      if (c?.kind === 'esper') referenced.esper.add(c.id);
    }
  }
}

// Zone tables name other tables; pull their enemies in too.
for (const name of referenced.encounter) {
  for (const g of ENCOUNTERS[name]?.groups ?? []) for (const e of g.enemies) referenced.enemy.add(e);
}

// Plenty of content is reached from code rather than from map data — the
// starting esper is granted at boot, the battle and boss themes are played by
// the battle state, the fanfare by `celebrate`. Scanning only maps and events
// would report all of that as stranded, so sweep the source that can reach it.
const codeFiles = [
  'src/data/events.js', 'src/data/events-vol2.js', 'src/data/events-vol3.js',
  'src/data/events-vol4.js', 'src/data/events-vol5.js',
  'src/data/events-bosses.js',
  'src/main.js', 'src/battle/battle.js', 'src/world/field.js', 'src/ui/menu.js',
  'src/ui/shop.js', 'src/game/party.js',
];
const eventSrc = codeFiles
  .map((f) => path.join(root, f))
  .filter((f) => fs.existsSync(f))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');
for (const [set, table] of [[referenced.item, ITEMS], [referenced.esper, ESPERS],
  [referenced.enemy, ENEMIES], [referenced.track, TRACKS], [referenced.shop, SHOPS]]) {
  for (const id of Object.keys(table)) {
    if (new RegExp(`['"\`]${id}['"\`]`).test(eventSrc)) set.add(id);
  }
}
for (const shop of Object.values(SHOPS)) for (const id of shop.stock ?? []) referenced.item.add(id);

// --- the checks --------------------------------------------------------------

const problems = [];
const report = (label, stranded, note) => {
  if (stranded.length) {
    problems.push({ label, stranded, note });
    console.log(`\n[!] ${label} — ${stranded.length} stranded`);
    if (note) console.log(`    ${note}`);
    console.log(`    ${stranded.join(', ')}`);
  } else {
    console.log(`[ ok ] ${label}`);
  }
};

// 1. Every spell must be learnable by somebody.
const taught = new Set();
for (const e of Object.values(ESPERS)) for (const s of Object.keys(e.teaches ?? {})) taught.add(s);
report('every spell is learnable',
  Object.keys(SPELLS).filter((id) => !taught.has(id)),
  'a spell no esper teaches can be cast at the player and never by them');

// 2. Every esper must be findable.
report('every esper is findable',
  Object.keys(ESPERS).filter((id) => !referenced.esper.has(id)),
  'not in any chest and not granted by any event');

// 3. Every event must be triggerable.
report('every event is triggerable',
  Object.keys(ALL_EVENTS).filter((id) => !referenced.event.has(id)),
  'no NPC, trigger or prop in any map refers to it');

// 4. Every shop must have a shopkeeper.
report('every shop has a shopkeeper',
  Object.keys(SHOPS).filter((id) => !referenced.shop.has(id)),
  'no NPC or prop opens it');

// 5. Every enemy must appear somewhere.
const bossIds = new Set(allBosses().map((b) => b.id));
report('every enemy can be fought',
  Object.keys(ENEMIES).filter((id) => !referenced.enemy.has(id) && !bossIds.has(id)),
  'in no encounter table any map uses');
report('every boss can be fought',
  [...bossIds].filter((id) => !referenced.enemy.has(id)),
  'not named by any event or encounter table');

// 6. Every item must be obtainable.
report('every item is obtainable',
  Object.keys(ITEMS).filter((id) => !referenced.item.has(id)),
  'in no shop, no chest and no event');

// 7. Every track must be heard.
report('every track is heard',
  Object.keys(TRACKS).filter((id) => !referenced.track.has(id)),
  'no map or event plays it');

// 8. Every chest must be openable — the interaction radius is in world units.
const unreachableChests = [];
for (const def of maps) {
  for (const v of variants(def)) {
    for (const p of v.props ?? []) {
      if (p.kit !== 'chest') continue;
      const wx = p.at[0] * TILE, wz = p.at[1] * TILE;
      let best = Infinity;
      for (let tz = 0; tz < v.terrain.length; tz++) {
        for (let tx = 0; tx < v.terrain[0].length; tx++) {
          if (!LEGEND[v.terrain[tz][tx]]?.walk) continue;
          best = Math.min(best, Math.hypot((tx + 0.5) * TILE - wx, (tz + 0.5) * TILE - wz));
        }
      }
      if (best > 1.7) unreachableChests.push(`${v.id}:${p.id ?? p.at}`);
    }
  }
}
report('every chest is openable', [...new Set(unreachableChests)],
  'no walkable tile within the interaction radius');

// 9. Every NPC must be standing somewhere it can legally stand.
//
// This keeps catching real bugs — a wanderer in a river, a smith inside a
// wall, a shopkeeper inside their own shop's footprint. None of it throws;
// the NPC is simply unreachable, or worse, blocks a doorway.
const badNpcs = [];
for (const def of maps) {
  for (const v of variants(def)) {
    for (const n of v.npcs ?? []) {
      const ch = v.terrain[Math.floor(n.at[1])]?.[Math.floor(n.at[0])];
      if (!LEGEND[ch]?.walk) badNpcs.push(`${v.id}:${n.id ?? n.name} on '${ch}'`);
    }
  }
}
report('every NPC stands on open ground', [...new Set(badNpcs)],
  'an NPC in a wall or a river cannot be talked to');

// 10. Two NPCs must not occupy one tile.
//
// The usual cause is a `ruin` override adding a replacement without listing
// the original in `removeNpcs`, so after the world breaks both are present and
// one is inside the other.
const stacked = [];
for (const def of maps) {
  for (const v of variants(def)) {
    const seen = new Map();
    for (const n of v.npcs ?? []) {
      const key = `${Math.round(n.at[0] * 2)},${Math.round(n.at[1] * 2)}`;
      if (seen.has(key)) stacked.push(`${v.id}: ${seen.get(key)} and ${n.id ?? n.name}`);
      else seen.set(key, n.id ?? n.name);
    }
  }
}
report('no two NPCs share a tile', [...new Set(stacked)],
  'usually a ruin override that forgot its removeNpcs entry');

console.log(`\n${maps.length} map variants, ${Object.keys(ENEMIES).length} enemies, `
  + `${Object.keys(ITEMS).length} items, ${Object.keys(ESPERS).length} espers, `
  + `${Object.keys(ALL_EVENTS).length} events, ${Object.keys(TRACKS).length} tracks`);

if (problems.length) {
  const total = problems.reduce((n, p) => n + p.stranded.length, 0);
  console.log(`\n${total} pieces of content exist but cannot be reached.`);
  process.exit(1);
}
console.log('\nNothing is stranded: every piece of content in the game is reachable.');
