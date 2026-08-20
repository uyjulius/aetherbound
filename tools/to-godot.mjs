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
import { QUESTS, QUEST_KIND_ORDER, QUEST_KIND_LABEL } from '../src/data/quests.js';
// The two model tables. Which mesh plays a character and which plays a creature is a set of
// authored decisions — a hand-written cast list of fourteen, a body-plan roster of thirty-six
// — plus one hash that has to agree exactly, or the port shows a different monster from the
// one the reference shows for the same species. So they cross as data.
import { CHARACTER_MODELS, CAST, CLIP_MAP, ONCE_CLIPS } from '../src/world/charmodels.js';
// The control bar's own words. "Talk" for confirm and "Enter" rather than "Z" are authored
// choices about how to explain the game to somebody who has just arrived, and a port that
// derived them from the key table instead would tell them to press Z.
import { BUTTONS as CONTROL_BUTTONS, DPAD as CONTROL_DPAD } from '../src/ui/controls.js';
import {
  MONSTER_MODELS, CLIP_PATTERNS, FALLBACK,
  ONCE_CLIPS as MONSTER_ONCE,
} from '../src/battle/monstermodels.js';
import { TRACKS } from '../src/data/music.js';
import { CHARACTERS, CAST_ORDER } from '../src/data/characters.js';
import { RAMPS, INK, PAPER, UI, ELEMENT_COLOR } from '../src/engine/palette.js';
import { TILE, LEGEND, WALL_EXPOSURE, GLYPH_PROP_RADII } from '../src/world/map.js';
import { STATUSES, STATUS_DISPLAY, TICK_RATES } from '../src/battle/formulas.js';
import { EV, TOKEN, ENDPOINT } from '../src/engine/analytics.js';
import { COMMANDS } from '../src/battle/commands.js';
import { BOSS_SPECS } from '../src/data/events-bosses.js';
import { ACTIONS, DEFAULT_BINDINGS, PAD_BUTTONS } from '../src/engine/input.js';

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

/**
 * Every model the port ships, with its author and licence.
 *
 * Three sources, because three tools fetched them: the props keep a JSON manifest, and the cast
 * and the bestiary keep the markdown their fetchers write. Parsing generated markdown is only
 * safe because the generator is in this repository — so the patterns are strict and a line that
 * stops matching is an error rather than a missing credit.
 */
function readCredits() {
  const entries = [];

  const props = JSON.parse(fs.readFileSync(
    path.join(root, 'godot', 'assets', 'props', 'manifest.json'), 'utf8'));
  for (const [kit, model] of Object.entries(props)) {
    entries.push({
      kind: 'scenery', what: kit, title: model.title, author: model.author,
      licence: model.licence, source: model.source,
    });
  }

  const cast = fs.readFileSync(path.join(root, 'assets', 'models', 'CREDITS.md'), 'utf8');
  const castRows = [...cast.matchAll(/^\| (?!Character model|---)(.+?) \| (https:\/\/\S+) \|$/gm)];
  if (!castRows.length) throw new Error('assets/models/CREDITS.md: no rows matched');
  for (const [, title, source] of castRows) {
    entries.push({
      kind: 'cast', what: '', title: title.trim(), author: 'Quaternius',
      licence: 'CC0 1.0', source,
    });
  }

  const monsters = fs.readFileSync(path.join(root, 'assets', 'monsters', 'CREDITS.md'), 'utf8');
  // Up to the period *before* "Licence at", not the first period in the URL — which is inside
  // `poly.pizza` and cut every source down to `https://poly`.
  const monsterRows = [...monsters.matchAll(
    /^- \*\*(.+?)\*\* \((.+?)\) — (.+?) — "(?:.+?)" by (.+?), (https:\/\/\S+?)\. Licence/gm)];
  if (!monsterRows.length) throw new Error('assets/monsters/CREDITS.md: no rows matched');
  for (const [, title, species, licence, author, source] of monsterRows) {
    entries.push({ kind: 'bestiary', what: species, title, author, licence, source });
  }

  // Every source has to be a model page. The first version of the monster pattern stopped at the
  // first period, which is inside `poly.pizza`, so seventy-two credits shipped pointing at
  // `https://poly` — a check here rather than an eye on a screenshot.
  for (const entry of entries) {
    if (!/^https:\/\/poly\.pizza\/m\/[A-Za-z0-9_-]+$/.test(entry.source ?? '')) {
      throw new Error(`credit for "${entry.title}" has a source of "${entry.source}"`);
    }
  }

  // Sorted so the list reads the same way every time, and the ones that *require* attribution
  // first: a credits screen that buries them under two hundred CC0 lines is a credits screen
  // nobody reads to the end of.
  entries.sort((a, b) => Number(a.licence.startsWith('CC0')) - Number(b.licence.startsWith('CC0'))
    || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
  return { entries };
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
  // The order and the names the journal groups quests under. Authored rather than
  // derivable — "Companions" before "Errands" is a judgement about what a returning
  // player wants to see first — so it crosses as data instead of being retyped in
  // GDScript where it would quietly drift.
  write('quest_kinds', { order: QUEST_KIND_ORDER, label: QUEST_KIND_LABEL }),
  // Only what a label needs. The glyphs are inline SVG and the click wiring is the web
  // build's own; what crosses is which controls are worth naming, in what order, and how.
  write('controls', {
    bar: CONTROL_BUTTONS.map(({ id, action, label, hint, fieldOnly, battleOnly, primary }) => ({
      id, action: action ?? null, label, hint,
      fieldOnly: Boolean(fieldOnly), battleOnly: Boolean(battleOnly), primary: Boolean(primary),
    })),
    move: CONTROL_DPAD.map(({ id, action, label, hint }) => ({ id, action, label, hint })),
  }),

  // The cast's meshes and the clips that drive them. `clips` maps a game clip to the name
  // the artist gave it; `once` is the ones that play and hold rather than looping.
  write('char_models', {
    models: CHARACTER_MODELS,
    cast: CAST,
    clips: CLIP_MAP,
    once: [...ONCE_CLIPS],
  }),
  // The bestiary's meshes. `clips` is a list of patterns per game clip rather than a name,
  // because the roster comes from eight packs and no two agree on what an attack is called —
  // they cross as regular-expression *sources*, which GDScript's `RegEx` reads unchanged.
  write('monster_models', {
    plans: MONSTER_MODELS,
    clips: Object.fromEntries(Object.entries(CLIP_PATTERNS)
      .map(([clip, patterns]) => [clip, patterns.map((r) => r.source)])),
    fallback: FALLBACK,
    once: [...MONSTER_ONCE],
  }),
  write('tracks', TRACKS),
  write('characters', CHARACTERS),
  write('cast_order', CAST_ORDER),
  write('maps', maps),

  // Palette and input are data wearing a code costume, and they cross the same
  // way the tables do rather than being retyped in GDScript. Two hundred hex
  // values transcribed by hand is a typo farm, and the ramps are the reason
  // assets from different sources read as one hand — a single wrong digit is a
  // material that no longer belongs to the set. The bindings are worse: the
  // control bar along the bottom of the screen *is* the game's statement of what
  // the controls are, so a second copy of them drifts the first time a key moves.
  //
  // Row counts here are section counts rather than rows, so the manifest only
  // asserts presence. The contents are compared value by value by
  // `tools/glue-parity.mjs`, which the numeric fingerprint in `data-parity.mjs`
  // could not do — a palette contains no numbers.
  write('palette', { ramps: RAMPS, ink: INK, paper: PAPER, ui: UI, element: ELEMENT_COLOR }),
  write('input', { actions: ACTIONS, keyboard: DEFAULT_BINDINGS, pad: PAD_BUTTONS }),

  // The terrain legend, which is what turns 95 grids of characters into a world:
  // which glyphs can be walked on, which are walls, and the collision radius of
  // each glyph-prop. The port builds its collision grid from this and is compared
  // against the reference's own grids cell by cell.
  write('legend', {
    tile: TILE, glyphs: LEGEND, wall_exposure: WALL_EXPOSURE, glyph_radii: GLYPH_PROP_RADII,
  }),

  // The status table: durations, whether each is good or bad, whether it blocks a
  // turn, whether it survives the battle, what it ticks. Twenty-eight rows of
  // flags where one wrong boolean makes a status permanent or free — which has
  // happened, twice, in the reference — so it crosses as data rather than being
  // retyped in GDScript.
  write('statuses', { statuses: STATUSES, tick_rates: TICK_RATES, display: STATUS_DISPLAY }),
  // Who made the models. Every prop, character and creature in this port is somebody's work
  // obtained through poly.pizza, and several are CC-BY, where saying so *is* the licence — so it
  // has to be in the game rather than only in a markdown file in the repository. Read from the
  // three files the fetch tools write rather than kept by hand, and it throws rather than
  // shipping a short list if any of them stops matching the shape it is parsed with.
  write('credits', readCredits()),
  // The instrumentation, so the port sends to the same project under the same event
  // names rather than a second taxonomy that drifts. The token is a client token and is
  // already in the JS bundle served from this origin; it is not a secret.
  write('analytics', { token: TOKEN, endpoint: ENDPOINT, events: EV }),

  // The fourteen per-character commands. Every character's second command is the
  // reason to bring them, and the numbers on the options are balance decisions —
  // Rusk's tiers cost a quarter, a half and nine tenths of his health for 2.2, 4.0
  // and 7.5 times a swing. The port reads these rather than a transcription.
  write('commands', COMMANDS),

  // The optional bosses. Sixteen scenes differing only in their nouns is a table, and
  // one factory over the same rows beats sixteen translations of the same six lines.
  write('boss_events', BOSS_SPECS),
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
