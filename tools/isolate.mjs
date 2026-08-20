/**
 * Put a concept view on white before it is turned into a mesh.
 *
 *   node tools/isolate.mjs vesna
 *
 * Hunyuan3D reconstructs whatever reads as solid, and a studio backdrop with a
 * cast shadow reads as a floor: the first character attempt came back standing
 * on a slab of geometry that no amount of face reduction removes. The Space's
 * own `rembg` pass usually catches this, but "usually" is the wrong reliability
 * for something that costs 270 seconds of a daily GPU allowance to find out.
 * This makes the input unambiguous first, so the background removal has nothing
 * left to get wrong.
 *
 * The concept files themselves are never touched — they are the reference, and
 * regenerating one is the step this whole pipeline cannot currently do (see the
 * T-pose problem). The isolated copy is written alongside as `<view>-clean.png`,
 * which is what `genmesh.mjs` prefers when it exists.
 *
 * How it decides what is background: a flood fill inwards from the border,
 * taking only pixels that are near-neutral *and* bright. Both halves matter.
 * Neutrality alone would leak through the silhouette into dark hair, which is
 * just as grey as the backdrop; brightness alone would stop at the cast shadow
 * and leave the floor it implies. Clothing and skin are saturated enough to
 * survive either test — a boot here is 48 apart across its channels where the
 * backdrop is 15 — so the fill stops exactly at the figure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

/** Channel spread. Neutral greys sit near zero whatever their brightness. */
const SATURATION_MAX = 30;

/**
 * Brightness floor for background.
 *
 * The backdrop here runs 127–186 and its cast shadow 83–101, so this clears
 * both. It deliberately does not reach the darkest contact shadow directly
 * under a sole: that residue is a few hundred pixels wide, cannot read as a
 * floor plane, and lowering the floor far enough to catch it starts eating dark
 * hair instead.
 */
const LUMINANCE_MIN = 70;

function readImage(file) {
  const bytes = fs.readFileSync(file);
  if (/\.png$/i.test(file)) {
    const png = PNG.sync.read(bytes);
    return { width: png.width, height: png.height, data: png.data };
  }
  const raw = jpeg.decode(bytes, { useTArray: true });
  return { width: raw.width, height: raw.height, data: raw.data };
}

/**
 * Flood the background to white, returning the share of pixels changed.
 *
 * Four-connected and iterative. A recursive fill overflows the stack on a
 * 1024×1024 image where four fifths of the pixels qualify, which is the normal
 * case here rather than an edge case.
 */
function isolate({ width, height, data }) {
  const background = new Uint8Array(width * height);
  const queue = [];

  const qualifies = (index) => {
    const at = index * 4;
    const r = data[at], g = data[at + 1], b = data[at + 2];
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return spread < SATURATION_MAX && luminance > LUMINANCE_MIN;
  };

  const seed = (index) => {
    if (background[index] || !qualifies(index)) return;
    background[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  let filled = 0;
  while (queue.length) {
    const index = queue.pop();
    filled++;
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) seed(index - 1);
    if (x < width - 1) seed(index + 1);
    if (y > 0) seed(index - width);
    if (y < height - 1) seed(index + width);
  }

  const out = new PNG({ width, height });
  for (let index = 0; index < width * height; index++) {
    const at = index * 4;
    if (background[index]) {
      out.data[at] = 255; out.data[at + 1] = 255; out.data[at + 2] = 255;
    } else {
      out.data[at] = data[at]; out.data[at + 1] = data[at + 1]; out.data[at + 2] = data[at + 2];
    }
    out.data[at + 3] = 255;
  }
  return { png: out, share: filled / (width * height) };
}

/**
 * A dark band across an edge — a letterbox strip or a fake watermark.
 *
 * The image model adds them unasked: four of the thirty-six bestiary views came back with a
 * black bar along the bottom, one of them carrying invented studio text. They matter because
 * the flood fill cannot remove them — it takes pixels that are bright *and* neutral, and a
 * black bar is neither — so the bar survives into the mesh as a slab, and finding that out
 * costs 270 seconds of GPU and a rig fitted to a signboard.
 *
 * Measured as rows (or columns) that are mostly dark, counted inwards from each edge. A dark
 * subject touching the frame is not a band: it does not run the whole width.
 */
function darkBand({ width, height, data }) {
  const luminance = (x, y) => {
    const at = (y * width + x) * 4;
    return 0.299 * data[at] + 0.587 * data[at + 1] + 0.114 * data[at + 2];
  };
  const rowIsDark = (y) => {
    let dark = 0;
    for (let x = 0; x < width; x++) if (luminance(x, y) < 60) dark++;
    return dark > width * 0.75;
  };
  const columnIsDark = (x) => {
    let dark = 0;
    for (let y = 0; y < height; y++) if (luminance(x, y) < 60) dark++;
    return dark > height * 0.75;
  };
  const runs = {
    top: 0, bottom: 0, left: 0, right: 0,
  };
  while (runs.top < height * 0.2 && rowIsDark(runs.top)) runs.top++;
  while (runs.bottom < height * 0.2 && rowIsDark(height - 1 - runs.bottom)) runs.bottom++;
  while (runs.left < width * 0.2 && columnIsDark(runs.left)) runs.left++;
  while (runs.right < width * 0.2 && columnIsDark(width - 1 - runs.right)) runs.right++;
  // Six rows, because a single dark row is a compression edge and six is a decision.
  const found = Object.entries(runs).filter(([, run]) => run >= 6);
  return found.map(([edge, run]) => `${run}px along the ${edge}`);
}


const subject = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'vesna';
const concepts = path.join(root, 'assets', 'concepts');
const find = (stem) => ['.png', '.jpg', '.jpeg']
  .map((ext) => path.join(concepts, stem + ext)).find((p) => fs.existsSync(p)) ?? null;

const views = ['front', 'back', 'left', 'right']
  .map((view) => [view, find(`${subject}-${view}`)])
  .filter(([, file]) => file);

if (!views.length) {
  say(`\x1b[31mFAIL\x1b[0m — no concept views for ${subject} in ${path.relative(root, concepts)}.`);
  process.exit(1);
}

say(`\x1b[1mIsolating ${subject}\x1b[0m`);
let suspect = false;
const bands = [];
for (const [view, file] of views) {
  const image = readImage(file);
  const found = darkBand(image);
  if (found.length) bands.push(`${view}: ${found.join(', ')}`);
  const { png, share } = isolate(image);
  const out = path.join(concepts, `${subject}-${view}-clean.png`);
  fs.writeFileSync(out, PNG.sync.write(png));
  const percent = (share * 100).toFixed(1);

  // Judged on what is *left*, not on what was taken. The old test called anything above 90%
  // background suspect, which is true of a character and false of a bench: a small prop on a
  // full-height canvas is legitimately 95% background, and the warning fired on every one of
  // them until it meant nothing. What actually goes wrong is the fill leaking through the
  // silhouette and eating the subject, or never reaching the backdrop at all.
  const kept = 1 - share;
  const plausible = kept > 0.005 && share > 0.2;
  if (!plausible) suspect = true;
  say(`  ${view.padEnd(6)} ${percent.padStart(5)}% to white  ${plausible ? '' : '\x1b[33msuspect\x1b[0m  '}${path.basename(out)}`);
}

say();
if (bands.length) {
  say('\x1b[31mFAIL\x1b[0m — a dark band runs across an edge of this view:');
  for (const line of bands) say(`  ${line}`);
  say('The fill cannot take it — it removes what is bright and neutral, and a black bar is');
  say('neither — so it would be reconstructed as a slab. Generate the view again.');
  process.exit(1);
}
if (suspect) {
  say('\x1b[33mLook at the marked views before generating.\x1b[0m A fill that took almost');
  say('everything has leaked through the silhouette; one that took almost nothing');
  say('never reached the backdrop.');
  process.exit(1);
}
say(`Next: node tools/genmesh.mjs ${subject} --textured`);
