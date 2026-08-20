/**
 * The bestiary: thirty-six creatures, and whether any of them would ship as a statue or a slab.
 *
 *   node tools/bestiary-parity.mjs
 *
 * The same two silent failures `cast-parity.mjs` exists for, on the other half of the roster:
 * a mesh that carries a skin and twenty joints and deforms nothing, and a reconstruction that
 * turned the concept view's studio floor into a two-metre sheet of geometry the creature then
 * stands on. Neither shows up in a viewer, and neither shows up in any check that only asks
 * whether the file loaded.
 *
 * What is different from the cast is that there is no single right shape. These come from nine
 * body plans — a wolf is twice as long as it is tall, a dragon is twice as wide, a slime is
 * neither — so the silhouette is measured against what its own plan can be. And the clip names
 * are resolved through `CastModels`, the port's own code, rather than by matching here: the
 * game finds a creature's animations by pattern and falls back along a chain, and a check with
 * its own idea of resolution would pass files the game cannot play.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const GODOT = process.env.GODOT ?? 'godot';
let report;
const probe = () => execFileSync(GODOT, [
  '--headless', '--path', path.join(root, 'godot'),
  '--script', 'res://tools/check_bestiary.gd',
], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const find = (text) => (text ?? '').split('\n').reverse()
  .find((line) => line.trim().startsWith('{"bestiary"'));
try {
  const line = find(probe());
  if (!line) throw new Error('no report in the probe output');
  report = JSON.parse(line.trim());
} catch (err) {
  // The probe exits non-zero when it finds trouble, and its report is still on stdout.
  const line = find(String(err.stdout ?? ''));
  if (!line) {
    say('\x1b[31mFAIL\x1b[0m — could not run the Godot bestiary check.');
    say(`  ${String(err.message).split('\n').slice(0, 6).join('\n  ')}`);
    process.exit(1);
  }
  report = JSON.parse(line.trim());
}

say('\x1b[1mThe bestiary: rigged, animated, and shaped like what they are\x1b[0m');
say('─'.repeat(62));

const bestiary = report.bestiary ?? {};
const names = Object.keys(bestiary).sort((a, b) => (bestiary[a].plan ?? '')
  .localeCompare(bestiary[b].plan ?? '') || a.localeCompare(b));
for (const name of names) {
  const beast = bestiary[name];
  const [w, h, d] = beast.size ?? [0, 0, 0];
  say(`  ${name.padEnd(24)} ${(beast.plan ?? '').padEnd(9)} `
    + `${w.toFixed(2)} × ${h.toFixed(2)} × ${d.toFixed(2)}  `
    + `${String(beast.bones).padStart(2)} bones  ${beast.clips} clips  `
    + `least movement ${beast.least_movement}`);
}
say();
const trouble = report.trouble ?? [];
if (trouble.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${trouble.length} problem(s) in the bestiary:`);
  for (const line of trouble.slice(0, 12)) say(`  ${line}`);
  if (trouble.length > 12) say(`  … and ${trouble.length - 12} more`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${names.length} creatures, ${names.length * 7} clip requests answered,`);
say('   and not one of them is a statue or standing on the studio floor.');
