import { prepareCampaign } from '../campaign/content.js';
const TABLES = [
  'maps', 'legend', 'characters', 'enemies', 'encounters', 'items', 'spells', 'espers',
  'shops', 'quests', 'statuses', 'char_models', 'monster_models', 'palette', 'tracks',
];

export async function loadGameData(onProgress = () => {}) {
  let complete = 0;
  const entries = await Promise.all(TABLES.map(async (name) => {
    const response = await fetch(`./content/data/${name}.json`);
    if (!response.ok) throw new Error(`Could not load ${name} (${response.status})`);
    const value = await response.json();
    complete += 1;
    onProgress(complete / TABLES.length, name);
    return [name, value];
  }));
  return prepareCampaign(Object.fromEntries(entries));
}

export const tileAt = (map, x, z) => map.terrain[Math.floor(z)]?.[Math.floor(x)] ?? ' ';

export function isWalkable(data, map, x, z) {
  const glyph = tileAt(map, x, z);
  return Boolean(data.legend.glyphs[glyph]?.walk);
}

export function activeMapDefinition(data, id, world = 'whole') {
  const base = data.maps[id];
  if (!base) throw new Error(`Unknown map ${id}`);
  if (world !== 'ruin' || !base.ruin) return base;
  return { ...base, ...base.ruin, id: base.id, name: base.name };
}
