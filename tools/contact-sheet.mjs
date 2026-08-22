/**
 * Every generated asset, on one page.
 *
 *   node tools/contact-sheet.mjs              # everything
 *   node tools/contact-sheet.mjs --creatures
 *
 * This exists because the defect it looks for has no number.
 *
 * A reconstruction that came out wrong — a skeleton with a six-metre pole through it, a zombie
 * shredded into shards, a temple reduced to two slivers of its own shadow — passes every check
 * in this repository. It loads, it is rigged, its weights are bound, it animates, it stands on
 * the floor. Three separate attempts were made to find a number that separates the broken ones
 * from the good, and all three are worth recording as failures:
 *
 *   **Silhouette against the concept.** Rasterise the mesh front-on, compare with the alpha of
 *   the view it was made from. Sound in principle, and the twelve creatures scored 0.43 to 0.75
 *   with the broken ones scattered through the middle — partly because a quadruped's concept is
 *   drawn three-quarter, so its silhouette legitimately does not match.
 *
 *   **Depth.** A creature drawn front-on should not be deep. The one with a pole measured 3.7
 *   times its own height — and a husky, which is fine, measured 2.2, with nothing in between to
 *   draw a line through.
 *
 *   **Coherence.** Weld the vertices, count connected pieces, take the largest one's share of
 *   the surface. The shredded zombie scored *best* of all twelve. Decimation shatters every one
 *   of these meshes into hundreds of pieces, so what this measures is the decimator.
 *
 * What caught every one of them was looking at a picture. So the answer is not another
 * assertion, it is to make the looking cheap: one sheet, every asset, regenerated after a
 * batch lands.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);
const GODOT = process.env.GODOT ?? 'godot';

const only = process.argv.includes('--creatures') ? 'creature'
  : process.argv.includes('--props') ? 'prop' : null;

const listed = execFileSync('node', [path.join(root, 'tools', 'generated-ids.mjs')],
  { encoding: 'utf8' }).trim().split('\n').map((line) => line.split(' '));

const subjects = [];
for (const [kind, id] of listed) {
  if (only && kind !== only) continue;
  const file = kind === 'creature'
    ? path.join(root, 'godot', 'assets', 'monsters', `${id}.glb`)
    : path.join(root, 'godot', 'assets', 'props', `${id}.glb`);
  if (fs.existsSync(file)) subjects.push({ kind, id, res: `res://assets/${kind === 'creature' ? 'monsters' : 'props'}/${id}.glb` });
}
if (!subjects.length) {
  say('\x1b[31mFAIL\x1b[0m — nothing generated to look at yet.');
  process.exit(1);
}

// Godot's import cache does not notice a file replaced underneath it by a build script, and a
// sheet of last week's models is worse than no sheet at all.
say('\x1b[1mRendering every generated asset\x1b[0m');
execFileSync(GODOT, ['--headless', '--path', path.join(root, 'godot'), '--import'],
  { stdio: 'ignore' });

const renders = path.join(root, '.renders');
const done = [];
for (const subject of subjects) {
  try {
    execFileSync(GODOT, ['--path', path.join(root, 'godot'),
      '--script', 'res://tools/render_asset.gd', '--', subject.res], { stdio: 'ignore' });
    if (fs.existsSync(path.join(renders, `${subject.id}.png`))) done.push(subject);
  } catch {
    say(`  ${subject.id.padEnd(24)} \x1b[31mwould not render\x1b[0m`);
  }
}

const sheet = path.join(renders, only ? `contact-${only}s.png` : 'contact-sheet.png');
execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
names = sys.argv[1:]
cell, label = 260, 22
cols = 6
rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGB', (cell * cols, (cell + label) * rows), (22, 22, 24))
draw = ImageDraw.Draw(sheet)
for n, name in enumerate(names):
    x, y = cell * (n % cols), (cell + label) * (n // cols)
    sheet.paste(Image.open('${renders}/%s.png' % name).resize((cell, cell)), (x, y))
    draw.text((x + 4, y + cell + 5), name, fill=(190, 190, 195))
sheet.save('${sheet}')
`, ...done.map((s) => s.id)]);

say();
say(`\x1b[32mOK\x1b[0m — ${done.length} asset(s) on ${path.relative(root, sheet)}. `
  + 'Look at it: this is the check that has caught every reconstruction failure so far.');
