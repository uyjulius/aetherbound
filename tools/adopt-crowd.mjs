/**
 * Adopt the generated villagers: draw a town's people with this game's own models.
 *
 *   node tools/adopt-crowd.mjs            # check and rewrite
 *   node tools/adopt-crowd.mjs --prune    # …and delete the models nothing refers to
 *
 * The nine entries in `CROWD` are Quaternius's, and every townsperson who is not one of the
 * fourteen named characters is drawn as one of them. That was the last bought thing in the
 * world.
 *
 * Order is preserved, and it matters as much here as in the bestiary: a villager's model is
 * `CROWD[fnv1a(their appearance) % CROWD.length]`, so the list's *length* and *order* decide
 * who looks like whom. Nine replace nine, in place — three hundred villagers keep the same
 * neighbours they had, drawn as people instead of rabbits.
 *
 * Nothing is rewritten until all nine exist. A half-adopted crowd is a town where some people
 * are villagers and the rest are cubes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CROWD, CHARACTER_MODELS } from '../src/world/charmodels.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);
const prune = process.argv.includes('--prune');

/** A villager id read back as a title: `villager_fisherwoman` → `Fisherwoman`. */
const titleOf = (id) => {
  const word = id.replace('villager_', '');
  return word.charAt(0).toUpperCase() + word.slice(1);
};

const dir = path.join(root, 'assets', 'models');
const villagers = fs.readdirSync(dir)
  .filter((name) => /^villager_[a-z]+\.glb$/.test(name))
  .map((name) => name.replace('.glb', ''))
  .sort();

if (villagers.length < CROWD.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${villagers.length} of ${CROWD.length} villagers are built.`);
  say('  Nine replace nine: the crowd is indexed by a hash, so a short list would redraw');
  say('  every townsperson in the world rather than the ones whose model changed.');
  process.exit(1);
}
if (villagers.length > CROWD.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${villagers.length} villagers for ${CROWD.length} crowd slots.`);
  say('  Changing the length changes which villager every one of three hundred people is.');
  process.exit(1);
}

const source = path.join(root, 'src', 'world', 'charmodels.js');
let text = fs.readFileSync(source, 'utf8');

// The bought block, replaced whole. Matched from its own comment to the closing brace so a
// stray `rabbit` elsewhere in the file cannot be caught by this.
const start = text.indexOf('  // --- the crowd,');
const end = text.indexOf('};', start);
if (start < 0 || end < 0) {
  say('\x1b[31mFAIL\x1b[0m — could not find the crowd block in charmodels.js');
  process.exit(1);
}
const width = Math.max(...villagers.map((id) => id.length)) + 2;
const rows = villagers.map((id) =>
  `  ${`${id}:`.padEnd(width)}{ file: '${id}.glb', title: '${titleOf(id)}' },`).join('\n');
text = `${text.slice(0, start)}  // --- the crowd, generated for this game -----------------------------------\n`
  + `${rows}\n${text.slice(end)}`;

// And the list itself, which is what the hash indexes into.
const listStart = text.indexOf('export const CROWD = [');
const listEnd = text.indexOf('];', listStart);
if (listStart < 0 || listEnd < 0) {
  say('\x1b[31mFAIL\x1b[0m — could not find the CROWD list in charmodels.js');
  process.exit(1);
}
const wrapped = [];
let line = 'export const CROWD = [';
for (const id of villagers) {
  const piece = `'${id}', `;
  if (line.length + piece.length > 96) { wrapped.push(line.trimEnd()); line = '  '; }
  line += piece;
}
wrapped.push(line.trimEnd().replace(/,$/, ''));
text = text.slice(0, listStart) + wrapped.join('\n') + text.slice(listEnd);
fs.writeFileSync(source, text);

for (const [i, id] of villagers.entries()) {
  say(`  ${String(CROWD[i]).padEnd(12)} → ${id}`);
}

const cast = path.join(root, 'assets', 'models', 'CREDITS.md');
let credits = fs.readFileSync(cast, 'utf8');
const crowdStart = credits.indexOf('## The crowd:');
if (crowdStart < 0) {
  say('\x1b[31mFAIL\x1b[0m — no crowd section in assets/models/CREDITS.md');
  process.exit(1);
}
credits = `${credits.slice(0, crowdStart)}## The crowd: generated for this game

Every townsperson who is not one of the fourteen is drawn as one of these nine.
They are described as *types* rather than as people — a miller, a fisherwoman, a
child — with no crest, no armour and no weapon, because a villager who reads as
a hero is worse than one who reads as a villager. They share the party's
skeleton and its eight clips.

Which one a person gets is a hash of their own appearance, so the same villager
is always the same villager, and the party is deliberately not in the pool.

| Villager | Model | Concept view |
|---|---|---|
${villagers.map((id) => `| ${titleOf(id)} | \`${id}.glb\` | assets/concepts/${id}-front.png |`).join('\n')}
`;
fs.writeFileSync(cast, credits);
say();
say(`  rewrote ${path.relative(root, source)} and ${path.relative(root, cast)}`);

const kept = new Set([...villagers, ...Object.keys(CHARACTER_MODELS)
  .filter((k) => !CROWD.includes(k))].map((id) => `${id}.glb`));
const stale = fs.readdirSync(dir).filter((f) => f.endsWith('.glb') && !kept.has(f));
if (stale.length && prune) {
  for (const file of stale) fs.unlinkSync(path.join(dir, file));
  say(`  deleted ${stale.length} model(s) nothing refers to any more`);
} else if (stale.length) {
  say(`  ${stale.length} model(s) are no longer referred to — run again with --prune to delete`);
}
say();
say(`\x1b[32mOK\x1b[0m — ${villagers.length} villagers, and nothing in the world is `
  + "somebody else's any more. Run `npm run sync:models && npm run export:godot`.");
