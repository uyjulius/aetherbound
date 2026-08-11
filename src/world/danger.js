import { ENEMIES, ENCOUNTERS } from '../data/enemies.js';

/**
 * How dangerous the place through a door is.
 *
 * Not one exit in this game is gated on a story flag, and that is on purpose —
 * it is an open world, and a locked door on the road is the opposite of one.
 * But open has to mean *informed*. The Pilgrim's Rest gate is a few steps from
 * the Harrowmere road, and the moment the party walks through it they are
 * standing in a zone written for level 68. There was nothing anywhere to tell
 * them, so the only feedback the world gave for going the wrong way was dying.
 *
 * So the door reads the room. What the signpost shows is the level of whatever
 * is standing where the party will *arrive* — not the worst thing in the map,
 * because the pilgrim road is fifty tiles long and the hard end of it is a
 * journey away, and reporting the maximum would make every long map look like
 * an ambush.
 */

/** Cache, since this walks encounter tables and maps never change at runtime. */
const cache = new Map();

/** Mean level of everything a table can field. */
function tableLevel(name) {
  const table = ENCOUNTERS[name];
  if (!table?.groups?.length) return 0;
  let total = 0, count = 0;
  for (const g of table.groups) {
    for (const id of g.enemies) {
      const e = ENEMIES[id];
      if (!e) continue;
      total += e.level; count++;
    }
  }
  return count ? total / count : 0;
}

/**
 * The level of the encounters waiting at a map's arrival point.
 *
 * Returns 0 for anywhere with no encounters at all — a town, an inn, a shop —
 * which is exactly right: those doors need no warning.
 */
export function dangerOf(def, spawnName = null) {
  if (!def) return 0;
  const key = `${def.id}:${spawnName ?? ''}`;
  if (cache.has(key)) return cache.get(key);

  const spawn = def.spawns?.[spawnName] ?? def.spawns?.world ?? def.spawns?.default;
  let level = 0;
  if (spawn && def.encounterZones?.length) {
    const [sx, sz] = spawn.at;
    for (const z of def.encounterZones) {
      const [x, y, w, h] = z.rect;
      if (sx >= x && sx < x + w && sz >= y && sz < y + h) { level = tableLevel(z.table); break; }
    }
  }
  // No zone covers the arrival tile, so the map's own table is what rolls.
  if (!level && def.encounters?.groups?.length) {
    let total = 0, count = 0;
    for (const g of def.encounters.groups) {
      for (const id of g.enemies) {
        const e = ENEMIES[id];
        if (!e) continue;
        total += e.level; count++;
      }
    }
    level = count ? total / count : 0;
  }

  cache.set(key, level);
  return level;
}

/**
 * What to say about it, given who is standing at the door.
 *
 * Three bands, and deliberately no numbers: a party that has never seen a
 * level readout on an enemy should not be handed one on a signpost. The words
 * are the ones a person at the roadside would use.
 */
export function dangerNote(destinationLevel, partyLevel) {
  if (!destinationLevel) return null;
  const gap = destinationLevel - partyLevel;
  if (gap >= 22) return { text: 'nobody comes back from there', tone: 'grave' };
  if (gap >= 12) return { text: 'well past what you can handle', tone: 'bad' };
  if (gap >= 5) return { text: 'harder than the road behind you', tone: 'warn' };
  return null;
}
