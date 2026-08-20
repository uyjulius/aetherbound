/**
 * The cast: fourteen characters, and whether any of them would ship as a statue or a slab.
 *
 *   node tools/cast-parity.mjs
 *
 * These models are this game's own — generated from the character table, reconstructed,
 * rigged and animated by `tools/genconcept.mjs`, `tools/genmesh.mjs` and
 * `tools/blender/rig_character.py` — and every failure in that pipeline is silent.
 *
 *   **A statue.** A mesh can carry a skin, twenty joints, inverse bind matrices and eight
 *   animations and still deform nothing: Blender's automatic weighting reports success on a
 *   marching-cubes mesh while weighting zero vertices. The export looks correct in every
 *   viewer that does not press play.
 *
 *   **A slab.** The reconstruction turns anything that reads as solid into geometry, so a
 *   concept view's studio floor comes back as a two-metre sheet lying through the figure's
 *   shins, with a thousand fragments of matted-out backdrop scattered around it. Ten of the
 *   first fourteen came out that way, and nothing in the rigging noticed: they weighted, they
 *   animated, and they walked into the first fight standing on a paving stone.
 *
 * So this loads each shipped model, plays every clip the game asks for by name, samples a bone
 * at two points in each, and measures the silhouette. A person is taller than they are wide,
 * even with both arms out.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const GODOT = process.env.GODOT ?? 'godot';
let report;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/check_cast.gd',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const line = raw.split('\n').reverse().find((l) => l.trim().startsWith('{"cast"'));
  if (!line) throw new Error(`no report in the probe output:\n${raw.slice(-800)}`);
  report = JSON.parse(line.trim());
} catch (err) {
  // The probe exits non-zero when it finds trouble, and its report is still on stdout.
  const output = String(err.stdout ?? '');
  const line = output.split('\n').reverse().find((l) => l.trim().startsWith('{"cast"'));
  if (!line) {
    say('\x1b[31mFAIL\x1b[0m — could not run the Godot cast check.');
    say(`  ${String(err.message).split('\n').slice(0, 6).join('\n  ')}`);
    process.exit(1);
  }
  report = JSON.parse(line.trim());
}

say('\x1b[1mThe cast: rigged, animated, and shaped like people\x1b[0m');
say('─'.repeat(58));

const cast = report.cast ?? {};
const names = Object.keys(cast).sort();
for (const name of names) {
  const who = cast[name];
  const [w, h, d] = who.size ?? [0, 0, 0];
  say(`  ${name.padEnd(10)} ${w.toFixed(2)} × ${h.toFixed(2)} × ${d.toFixed(2)}  `
    + `${String(who.bones).padStart(2)} bones  ${who.clips} clips  `
    + `least movement ${who.least_movement}  arms at ${who.arm_angle}`);
}
say();
const trouble = report.trouble ?? [];
if (trouble.length) {
  say(`\x1b[31mFAIL\x1b[0m — ${trouble.length} problem(s) with the cast:`);
  for (const line of trouble) say(`  ${line}`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${names.length} characters, ${names.length * 8} clips, and every one of`);
say('   them moves and stands on its own two feet.');
