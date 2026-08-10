/**
 * Texture build step.
 *
 *   node tools/gen-textures.mjs [--size 512] [--only name,name] [--contact]
 *
 * Provider-agnostic by design: if `assets/raw/<name>.png` exists (a plate from
 * an image model), it is used as the starting point and pushed through the
 * same coherence pass — forced to tile, hue-shifted and quantised to the master
 * palette. Otherwise the plate is painted from the authored definition.
 *
 * The coherence pass is the important part either way. Dropping raw generated
 * images straight into a scene is exactly what makes a game look machine-made:
 * every plate arrives with its own lighting, its own colour temperature and its
 * own level of detail, and the eye reads that inconsistency instantly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { MATERIALS } from './texgen/materials.mjs';
import { Plate } from './texgen/raster.mjs';
import { quilt } from './texgen/quilt.mjs';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const OUT_DIR = path.join(root, 'assets/textures');
const RAW_DIR = path.join(root, 'assets/raw');

const args = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const SIZE = Number(getFlag('size', 512));
const ONLY = getFlag('only', null)?.split(',').map((s) => s.trim());
const CONTACT = args.includes('--contact');

// Stable per-material seeds: regenerating must never reshuffle the art.
const SEEDS = {
  stone_wall: 1001, plaster_wall: 1002, brick_wall: 1003,
  roof_tile: 1010, roof_slate: 1011, thatch: 1012,
  wood_planks: 1020, wood_floor: 1021, bark: 1022,
  grass: 1030, dirt_path: 1031, cobblestone: 1032, sand: 1033, snow: 1034,
  rock_cliff: 1040, cave_rock: 1041,
  marble_floor: 1050, iron_plate: 1051, fabric: 1052,
  aether_stone: 1060, magitek_panel: 1061,
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const names = (ONLY || Object.keys(MATERIALS)).filter((n) => {
  if (!MATERIALS[n]) { console.warn(`[tex] unknown material "${n}"`); return false; }
  return true;
});

/** How much better a generated plate must be to beat the synthesiser. */
const WIN_MARGIN = 0.85;

const report = [];
const t0 = Date.now();

for (const name of names) {
  const seed = SEEDS[name] ?? 1;
  const rawPath = path.join(RAW_DIR, `${name}.png`);
  const start = Date.now();
  let plate;
  let source;
  let chosen = '';

  // Every candidate the model produced for this material.
  const candidates = fs.existsSync(RAW_DIR)
    ? fs.readdirSync(RAW_DIR)
      .filter((f) => f === `${name}.png` || f.startsWith(`${name}__`))
      .map((f) => path.join(RAW_DIR, f))
    : [];

  if (candidates.length) {
    // 1. Choose. The model's output varies enormously run to run, so score
    //    every candidate and keep the one with the least composition in it —
    //    the flattest, most evenly-detailed, least "photograph of a place".
    // Score on both axes. Composition is the thing to avoid, but detail is
    // the thing to want, and optimising for one alone picks badly: a
    // photograph of a flat green field has no composition in it at all and is
    // useless as grass. Subtracting detail from structure asks for a swatch
    // that is busy everywhere and composed nowhere.
    let best = null;
    for (const file of candidates) {
      const probe = Plate.fromPNG(file, seed);
      probe.resample(256);
      const score = probe.structureScore() - probe.detailScore() * 2.5;
      if (!best || score < best.score) best = { file, score };
    }
    chosen = `${candidates.length} cand`;

    // 2. Flatten the lighting the model baked in, at a radius large enough to
    //    take the gradient and leave the material. Doing this *before*
    //    quilting matters: patches with different exposures never blend, and
    //    tonal blocking is what makes naive quilting look like patchwork.
    plate = Plate.fromPNG(best.file, seed);
    plate.deLight(0.9, 200);

    // 3. Quilt a seamless tile out of it. This is the step that makes a
    //    generated image usable at all — see tools/texgen/quilt.mjs. The tile
    //    wraps by construction, and every pixel in it is a source pixel, so
    //    the result is genuinely the model's material rather than a
    //    procedural imitation of it.
    plate = quilt(plate, SIZE, { block: 128, overlap: 40, tries: 400, seed });
    source = 'quilted';

    // 4. The same coherence pass the whole set gets. This is what stops
    //    twenty-one independently generated images reading as twenty-one
    //    unrelated photographs: one hue discipline, one palette.
    // Match the set's overall value before touching hue, or the hue shift
    // reads a dark plate as all-shadow and pushes the whole thing cold.
    plate.normaliseExposure(0.46);
    plate.hueShiftAll(0.06);
    plate.quantize({ dither: 0.16, levels: 40 });
  } else {
    // No generated plate for this material. The authored synthesiser is the
    // fallback of last resort, not a competitor — if this fires, generation
    // failed and the right fix is to re-run it.
    source = 'NO SOURCE';
    plate = MATERIALS[name](SIZE, seed);
  }

  const outPath = path.join(OUT_DIR, `${name}.png`);
  plate.writePNG(outPath);
  const err = plate.seamError();
  const ms = Date.now() - start;
  report.push({ name, source, seam: err, ms, size: plate.size, chosen });
  // Ratio vs. interior contrast: ~1 is seamless, >2.5 means a real visible seam.
  const flag = err > 2.5 ? '  ⚠ seam' : '';
  const rad = chosen ? `  ${chosen}` : '';
  const why = source === 'NO SOURCE' ? '  ← no generated candidate; run npm run textures:raw' : '';
  console.log(`[tex] ${name.padEnd(16)} ${source.padEnd(10)} ${String(plate.size).padStart(4)}px  seam=${err.toFixed(2)}×${rad}  ${ms}ms${flag}${why}`);
}

console.log(`[tex] ${report.length} plates in ${((Date.now() - t0) / 1000).toFixed(1)}s → assets/textures/`);

// A contact sheet makes it possible to judge whether the whole set reads as
// one artist's hand — which is the only thing that actually matters here.
if (CONTACT) {
  const cols = Math.ceil(Math.sqrt(report.length));
  const rows = Math.ceil(report.length / cols);
  const cell = 192;
  const gap = 8;
  const W = cols * (cell + gap) + gap;
  const H = rows * (cell + gap) + gap;
  const sheet = new PNG({ width: W, height: H });
  sheet.data.fill(20);

  report.forEach((entry, i) => {
    const src = PNG.sync.read(fs.readFileSync(path.join(OUT_DIR, `${entry.name}.png`)));
    const cx = gap + (i % cols) * (cell + gap);
    const cy = gap + Math.floor(i / cols) * (cell + gap);
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        // Show the texture tiled 2x2 so seams are immediately obvious.
        const sx = Math.floor((x / cell) * src.width * 2) % src.width;
        const sy = Math.floor((y / cell) * src.height * 2) % src.height;
        const s = (sy * src.width + sx) * 4;
        const d = ((cy + y) * W + (cx + x)) * 4;
        sheet.data[d] = src.data[s];
        sheet.data[d + 1] = src.data[s + 1];
        sheet.data[d + 2] = src.data[s + 2];
        sheet.data[d + 3] = 255;
      }
    }
  });
  const sheetPath = path.join(root, 'assets/contact-sheet.png');
  fs.writeFileSync(sheetPath, PNG.sync.write(sheet));
  console.log(`[tex] contact sheet → ${path.relative(root, sheetPath)}`);
}
