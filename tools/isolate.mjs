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
for (const [view, file] of views) {
  const { png, share } = isolate(readImage(file));
  const out = path.join(concepts, `${subject}-${view}-clean.png`);
  fs.writeFileSync(out, PNG.sync.write(png));
  const percent = (share * 100).toFixed(1);

  // A plausible full-body view is mostly background but not entirely. Outside
  // this band the thresholds have either leaked through the silhouette or
  // failed to reach the backdrop at all, and the result is not worth spending
  // GPU minutes on — so it is called out rather than quietly written.
  const plausible = share > 0.3 && share < 0.9;
  if (!plausible) suspect = true;
  say(`  ${view.padEnd(6)} ${percent.padStart(5)}% to white  ${plausible ? '' : '\x1b[33msuspect\x1b[0m  '}${path.basename(out)}`);
}

say();
if (suspect) {
  say('\x1b[33mLook at the marked views before generating.\x1b[0m A fill that took almost');
  say('everything has leaked through the silhouette; one that took almost nothing');
  say('never reached the backdrop.');
  process.exit(1);
}
say(`Next: node tools/genmesh.mjs ${subject} --textured`);
