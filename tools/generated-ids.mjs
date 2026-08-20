/**
 * The ids this project generates, and what each one is.
 *
 *   node tools/generated-ids.mjs           # "prop chest", "creature quadruped_wolf", …
 *   node tools/generated-ids.mjs --props
 *
 * Written because a shipping run that reads the raw directory instead of a catalogue ships
 * everything it finds: the first version treated all fourteen characters and a handful of
 * shape-only spikes as props, decimated them, and wrote them into the scenery manifest as
 * furniture. The directory is a workspace. This is the list.
 *
 * Props are the kits the world actually places, which is the props manifest's own keys.
 * Creatures are named for the roster entry each one replaces, by the same rule
 * `genconcept.mjs --bestiary` used to draw them and `adopt-bestiary.mjs` uses to find them.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MONSTER_MODELS } from '../src/battle/monstermodels.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

const props = Object.keys(JSON.parse(fs.readFileSync(
  path.join(root, 'godot', 'assets', 'props', 'manifest.json'), 'utf8')));

const seen = {};
const creatures = [];
for (const [plan, entries] of Object.entries(MONSTER_MODELS)) {
  for (const entry of entries) {
    const slug = entry.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = `${plan}_${slug}`;
    seen[key] = (seen[key] ?? 0) + 1;
    creatures.push(seen[key] === 1 ? key : `${key}${seen[key]}`);
  }
}

const only = process.argv.includes('--props') ? 'props'
  : process.argv.includes('--creatures') ? 'creatures' : null;
if (only === 'props') console.log(props.join('\n'));
else if (only === 'creatures') console.log(creatures.join('\n'));
else {
  for (const id of props) console.log(`prop ${id}`);
  for (const id of creatures) console.log(`creature ${id}`);
}
