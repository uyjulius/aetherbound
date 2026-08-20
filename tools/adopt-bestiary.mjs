/**
 * Adopt the generated bestiary: point the roster at this game's own creatures.
 *
 *   node tools/adopt-bestiary.mjs            # check and rewrite
 *   node tools/adopt-bestiary.mjs --prune    # …and delete the models nothing refers to
 *
 * The thirty-six entries in `MONSTER_MODELS` are Poly Pizza ids because that is where the
 * roster came from. The replacements are generated here, one per entry, and they are named
 * after the entry they replace — `quadruped_wolf`, `undead_skeleton2` — by the same rule
 * `genconcept.mjs` used to write their concept views, so the mapping is derived rather than
 * typed and cannot drift.
 *
 * Order is preserved exactly. A species is assigned a model by hashing its own look and
 * indexing into its plan's list, so moving an entry moves two hundred creatures onto different
 * meshes; renaming one in place moves nobody.
 *
 * Nothing is rewritten until every replacement exists. A half-adopted roster is the worst of
 * both: a table that names generated models, a directory holding bought ones, and a game that
 * loads whichever it finds.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MONSTER_MODELS } from '../src/battle/monstermodels.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);
const prune = process.argv.includes('--prune');

/** The name `genconcept.mjs --bestiary` gives an entry: plan, title, and a count for repeats. */
function keyFor(plan, title, seen) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `${plan}_${slug}`;
  seen[key] = (seen[key] ?? 0) + 1;
  return seen[key] === 1 ? key : `${key}${seen[key]}`;
}

const seen = {};
const mapping = [];
for (const [plan, entries] of Object.entries(MONSTER_MODELS)) {
  for (const entry of entries) {
    mapping.push({ plan, title: entry.title, from: entry.id, to: keyFor(plan, entry.title, seen) });
  }
}

const dir = path.join(root, 'assets', 'monsters');
const missing = mapping.filter((m) => !fs.existsSync(path.join(dir, `${m.to}.glb`)));
if (missing.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${missing.length} of ${mapping.length} replacements are not built:`);
  for (const m of missing.slice(0, 10)) say(`  ${m.plan.padEnd(10)} ${m.title.padEnd(20)} ${m.to}.glb`);
  if (missing.length > 10) say(`  … and ${missing.length - 10} more`);
  process.exit(1);
}

const source = path.join(root, 'src', 'battle', 'monstermodels.js');
let text = fs.readFileSync(source, 'utf8');
for (const m of mapping) {
  const needle = `{ id: '${m.from}', title: '${m.title.replace(/'/g, "\\'")}' }`;
  if (!text.includes(needle)) {
    say(`\x1b[31mFAIL\x1b[0m — could not find ${needle} in monstermodels.js`);
    process.exit(1);
  }
  text = text.replace(needle, `{ id: '${m.to}', title: '${m.title.replace(/'/g, "\\'")}' }`);
}
fs.writeFileSync(source, text);
for (const m of mapping) say(`  ${m.plan.padEnd(10)} ${m.title.padEnd(20)} ${m.from} → ${m.to}`);

const credits = path.join(dir, 'CREDITS.md');
fs.writeFileSync(credits, `# Creature models

The bestiary is generated for this game, one model per entry in
\`src/battle/monstermodels.js\`. A concept view from **FLUX.1-schnell**,
reconstructed by **Hunyuan3D-2.1**, then cleaned, rigged and animated by the
scripts in \`tools/\`: \`genconcept.mjs\`, \`isolate.mjs\`, \`genmesh.mjs\` and
\`blender/rig_creature.py\`.

Four skeletons cover nine body plans — a biped, a quadruped, a winged shape and
a stalk — and the clips each one carries are authored in
\`tools/blender/creature_clips.py\`. Nothing here is procedural: the geometry is
reconstructed from a drawn view and the motion is keyframed by hand.

Nobody needs crediting for these. They are listed because a file that cannot say
where it came from is a file nobody can check.

| Plan | Creature | Model | Concept view |
|---|---|---|---|
${mapping.map((m) => `| ${m.plan} | ${m.title} | \`${m.to}.glb\` | assets/concepts/${m.to}-front.png |`).join('\n')}

Two hundred species share these thirty-six models: which one a species gets is a
hash of its own look, and it is told apart from its neighbours by size and tint.
`);
say();
say(`  rewrote ${path.relative(root, source)} and ${path.relative(root, credits)}`);

const kept = new Set(mapping.map((m) => `${m.to}.glb`));
const stale = fs.readdirSync(dir).filter((f) => f.endsWith('.glb') && !kept.has(f));
if (stale.length && prune) {
  for (const file of stale) fs.unlinkSync(path.join(dir, file));
  say(`  deleted ${stale.length} model(s) nothing refers to any more`);
} else if (stale.length) {
  say(`  ${stale.length} model(s) are no longer referred to — run again with --prune to delete`);
}
say();
say(`\x1b[32mOK\x1b[0m — ${mapping.length} creatures, all of them this game's own. `
  + 'Run `npm run sync:models && npm run export`.');
