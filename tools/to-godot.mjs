/**
 * Export the game's data tables to the Godot port.
 *
 *   node tools/to-godot.mjs
 *
 * Two thirds of this project is data — the bestiary, the item and spell tables,
 * the cast, the quest graph, the encounter tables and 137 map variants — and
 * none of it is engine-specific. Rewriting it by hand in GDScript would be
 * weeks of transcription whose only possible outcome is a typo, so it is
 * exported instead, and `godot/tools/data_probe.gd` checks the result against
 * the same source.
 *
 * JSON rather than Godot `.tres` resources. Custom resources are more idiomatic
 * and would be the right answer for a handful of authored things, but there are
 * two hundred enemies and two hundred and seventy-five items here, and a
 * generated `.tres` per row is a lot of files to diff for no gain. Godot parses
 * JSON natively; the typed accessors live in `scripts/data/database.gd` where
 * they can be read.
 *
 * Nothing is transformed on the way out. Every rebalance from the audit passes
 * lives in these numbers, so the exporter's only job is to move them without
 * opinion — `tools/parity.mjs` already proves the *formulas* agree, and this
 * keeps the *inputs* to those formulas identical too.
 *
 * Events are deliberately not exported. `src/data/events*.js` is 6,511 lines of
 * generator coroutines — executable scripts with branching, party checks and
 * dialogue flow, not tables — and pretending they are data would produce a file
 * nothing can run. They need porting as code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ENEMIES, ENCOUNTERS } from '../src/data/enemies.js';
import { ITEMS, SHOPS } from '../src/data/items.js';
import { SPELLS } from '../src/data/spells.js';
import { ESPERS } from '../src/data/espers.js';
import { QUESTS } from '../src/data/quests.js';
import { TRACKS } from '../src/data/music.js';
import { CHARACTERS, CAST_ORDER } from '../src/data/characters.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const OUT = path.join(root, 'godot', 'data');
const say = (s = '') => console.log(s);

/**
 * Load every map module the same way the audits do.
 *
 * Map files export their definitions under assorted names — some a single
 * object, some a bundle of them — so the shape is discovered rather than
 * assumed, exactly as `tools/balance.mjs` and `tools/geometry.mjs` do it.
 */
async function loadMaps() {
  const dir = path.join(root, 'src/data/maps');
  const maps = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const mod = await import(path.join(dir, file));
    const collect = (value) => {
      if (!value || typeof value !== 'object') return;
      if (value.terrain && value.id) { maps[value.id] = value; return; }
      for (const inner of Object.values(value)) collect(inner);
    };
    for (const value of Object.values(mod)) collect(value);
  }
  return maps;
}

/**
 * Strip what cannot cross the boundary.
 *
 * Some map props carry `talk` as a *function* — the field supports it, and it
 * is how a line of dialogue can depend on world state. `JSON.stringify` drops
 * functions silently, which would export an NPC that is mute in Godot and
 * chatty in the reference with nothing to show for it. So they are replaced by
 * a marker the port can find and the count is reported, because that is a real
 * porting task and not a rounding error.
 */
let dynamicTalk = 0;
function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      if (typeof inner === 'function') {
        if (key === 'talk') { dynamicTalk++; out.talk = { __dynamic: true }; }
        continue;
      }
      if (inner === undefined) continue;
      out[key] = scrub(inner);
    }
    return out;
  }
  return value;
}

function write(name, data) {
  const json = JSON.stringify(scrub(data));
  const file = path.join(OUT, `${name}.json`);
  fs.writeFileSync(file, json);
  const rows = Array.isArray(data) ? data.length : Object.keys(data).length;
  say(`  ${name.padEnd(12)} ${String(rows).padStart(5)} rows  ${(json.length / 1024).toFixed(0).padStart(5)} KB`);
  return { name, rows, bytes: json.length };
}

fs.mkdirSync(OUT, { recursive: true });
say('\x1b[1mExporting data tables to the Godot port\x1b[0m');
say('─'.repeat(48));

const maps = await loadMaps();
const written = [
  write('enemies', ENEMIES),
  write('encounters', ENCOUNTERS),
  write('items', ITEMS),
  write('shops', SHOPS),
  write('spells', SPELLS),
  write('espers', ESPERS),
  write('quests', QUESTS),
  write('tracks', TRACKS),
  write('characters', CHARACTERS),
  write('cast_order', CAST_ORDER),
  write('maps', maps),
];

// A manifest so the Godot side can assert it loaded everything it was given,
// rather than quietly running on three tables and a missing bestiary.
const manifest = Object.fromEntries(written.map((w) => [w.name, w.rows]));
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));

say();
say(`${written.reduce((n, w) => n + w.rows, 0).toLocaleString()} rows, `
  + `${(written.reduce((n, w) => n + w.bytes, 0) / 1048576).toFixed(1)} MB total`);
if (dynamicTalk) {
  say();
  say(`\x1b[33mnote\x1b[0m ${dynamicTalk} NPC \`talk\` fields are functions, not text, and were `
    + 'exported as a marker.');
  say('     They depend on world state and have to be ported as code, not data.');
}
say('\x1b[32mOK\x1b[0m — run `node tools/data-parity.mjs` to check the port reads it identically.');
