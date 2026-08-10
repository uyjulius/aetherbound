/**
 * Material plate definitions.
 *
 * Each entry paints one seamless albedo texture. They all follow the same
 * discipline:
 *
 *   1. Build the *structure* first (courses of stone, planks, tiles). Texture
 *      without structure is just noise with a colour cast, which is the single
 *      most common failure in generated material art.
 *   2. Give every element its own colour drawn from the master ramps, so the
 *      surface has variety without leaving the palette.
 *   3. Bake a weak painted bevel — an artist's edge highlight, not lighting.
 *   4. Overlay directional brushwork, then grunge in the crevices.
 *   5. Glaze with big low-frequency light/dark masses (`macro`).
 *   6. Hue-shift and quantise to the palette so it matches everything else.
 *
 * Note on periodic noise: every call passes *cell counts per axis*, never a
 * scaled coordinate. The lattice wraps over a unit interval, so scaling the
 * input by a non-integer puts the tile edge mid-cell and produces a seam.
 */

import {
  Plate, fbm, ridged, worley, valueNoise, macroMask, mulberry32,
  ramp01, mixColor, scaleColor, clamp01, lerp, smoothstep, hex01,
} from './raster.mjs';

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/**
 * Split `total` into `count` integer spans of jittered size that sum *exactly*
 * to `total`. Exactness is what lets courses of stone wrap around the tile.
 */
function partition(total, count, rand, minFrac = 0.72, maxFrac = 1.34) {
  const raw = Array.from({ length: count }, () => lerp(minFrac, maxFrac, rand()));
  const sum = raw.reduce((a, b) => a + b, 0);
  const bounds = [0];
  let acc = 0;
  for (let i = 0; i < count; i++) {
    acc += (raw[i] / sum) * total;
    bounds.push(Math.min(total, Math.round(acc)));
  }
  bounds[count] = total;
  return bounds;
}

/**
 * Lay masonry courses that wrap exactly. Returns a height field for bevelling.
 */
function layCourses(plate, {
  rows = 6, blocksPerRow = 5, joint = 3, stagger = true,
  rand, blockColor, mortarColor, chipChance = 0.35, evenRows = false,
}) {
  const s = plate.size;
  const height = new Float32Array(s * s);
  const wrapI = (v, n) => ((v % n) + n) % n;
  const setH = (x, y, v) => { height[wrapI(y, s) * s + wrapI(x, s)] = v; };

  const rowBounds = evenRows
    ? Array.from({ length: rows + 1 }, (_, i) => Math.round((i / rows) * s))
    : partition(s, rows, rand, 0.80, 1.22);

  for (let r = 0; r < rows; r++) {
    const y0 = rowBounds[r];
    const y1 = rowBounds[r + 1];
    const rowH = y1 - y0;
    if (rowH <= 0) continue;

    const n = Math.max(2, blocksPerRow + Math.floor(rand() * 3) - 1);
    const colBounds = partition(s, n, rand, 0.62, 1.48);
    const offset = stagger ? Math.floor(rand() * s) : Math.round((r % 2) * s / (n * 2));

    for (let b = 0; b < n; b++) {
      const x0 = colBounds[b] + offset;
      const x1 = colBounds[b + 1] + offset;
      const w = x1 - x0;
      if (w <= 0) continue;

      const shade = rand();
      const base = blockColor(shade, r, rand);
      const tilt = (rand() - 0.5) * 0.07;

      for (let y = y0 + Math.ceil(joint / 2); y < y1 - joint / 2; y++) {
        for (let xf = x0 + Math.ceil(joint / 2); xf < x1 - joint / 2; xf++) {
          const lx = (xf - x0) / w;
          const ly = (y - y0) / rowH;
          const edge = Math.min(
            Math.min(lx, 1 - lx) * w,
            Math.min(ly, 1 - ly) * rowH,
          );
          setH(xf, y, smoothstep(0, 3.5, edge));
          // Dirt collects toward the joints.
          const grime = 1 - (1 - smoothstep(0, 6, edge)) * 0.18;
          const micro = 1 + (fbm(xf / s, y / s, 96, 96, 3, plate.seed + r * 17) - 0.5) * 0.12;
          plate.set(xf, y, scaleColor(base, (1 + tilt) * grime * micro));
        }
      }

      // Chipped corner: bite a triangular notch out.
      if (rand() < chipChance) {
        const cw = Math.round(lerp(2, Math.min(8, rowH * 0.35), rand()));
        const cx = rand() < 0.5 ? x0 + joint : x1 - joint - cw;
        const cy = rand() < 0.5 ? y0 + joint : y1 - joint - cw;
        for (let dy = 0; dy < cw; dy++) {
          for (let dx = 0; dx < cw - dy; dx++) {
            plate.blend(cx + dx, cy + dy, mortarColor, 0.72);
            setH(cx + dx, cy + dy, 0);
          }
        }
      }
    }
  }

  // Mortar fills everything the blocks did not claim.
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (height[y * s + x] === 0) {
        const nz = fbm(x / s, y / s, 64, 64, 3, plate.seed + 999);
        plate.set(x, y, scaleColor(mortarColor, 0.84 + nz * 0.30));
      }
    }
  }

  return (x, y) => height[wrapI(y, s) * s + wrapI(x, s)];
}

/** Grime that settles in low areas — the cheapest possible realism. */
function crevasseGrime(plate, heightAt, color, amount = 0.35) {
  return plate.overlay((u, v, x, y) => {
    const h = heightAt(x, y);
    const n = fbm(u, v, 20, 20, 4, plate.seed + 4242);
    return [color, (1 - h) * amount * (0.4 + n * 0.9)];
  });
}

/** Patchy discolouration — water stains, lichen, sun bleaching. */
function weatherPatches(plate, colors, { cells = 6, amount = 0.30, threshold = 0.55, seed = 0 } = {}) {
  return plate.overlay((u, v) => {
    const n = macroMask(u, v, plate.seed + seed, cells);
    if (n < threshold) return null;
    const t = smoothstep(threshold, threshold + 0.22, n);
    const idx = Math.floor(valueNoise(u, v, 3, 3, plate.seed + seed + 5) * colors.length);
    return [colors[Math.min(colors.length - 1, idx)], t * amount];
  });
}

/** Build a sampler for a height field stored as a flat array. */
function fieldSampler(field, size) {
  return (x, y) => field[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export const MATERIALS = {

  // --- architecture: walls -------------------------------------------------

  stone_wall: (size, seed) => {
    const p = new Plate(size, seed);
    const rand = mulberry32(seed);
    p.fill(ramp01('stone', 0.4));
    const heightAt = layCourses(p, {
      rows: 6, blocksPerRow: 5, joint: 3, rand,
      blockColor: (t) => mixColor(ramp01('stone', 0.24 + t * 0.50), ramp01('granite', 0.45), t * 0.38),
      mortarColor: ramp01('plaster', 0.50),
      chipChance: 0.45,
    });
    p.paintBevel(heightAt, 0.22, { gradScale: 5 });
    crevasseGrime(p, heightAt, ramp01('dirt', 0.18), 0.32);
    weatherPatches(p, [ramp01('foliage', 0.35), ramp01('grassdry', 0.30)], { cells: 4, amount: 0.18, threshold: 0.60 });
    p.brushwork({ amount: 0.075, scale: 30, aspect: 3, seed });
    p.macro({ amount: 0.20, cells: 3, seed: seed + 1 });
    p.hueShiftAll(0.30);
    p.quantize({ ramps: ['stone', 'granite', 'plaster', 'dirt', 'foliage', 'rock'] });
    return p;
  },

  plaster_wall: (size, seed) => {
    const p = new Plate(size, seed);
    p.fill(ramp01('plaster', 0.70));
    // Trowel sweeps: broad, shallow, following one direction.
    p.each((u, v) => {
      const sweep = fbm(u, v, 4, 14, 4, seed) - 0.5;
      const fine = fbm(u, v, 60, 60, 3, seed + 13) - 0.5;
      return scaleColor(ramp01('plaster', 0.66 + sweep * 0.30), 1 + fine * 0.06);
    });
    // Hairline cracks.
    p.overlay((u, v) => {
      const warp = (fbm(u, v, 7, 7, 3, seed + 5) - 0.5) * 0.30;
      const r = ridged(u + warp, v, 12, 12, 4, seed + 91);
      const crack = smoothstep(0.88, 0.99, r);
      return crack > 0 ? [ramp01('dirt', 0.16), crack * 0.5] : null;
    });
    // Water staining runs downward.
    p.overlay((u, v) => {
      const streak = fbm(u, v, 26, 2, 3, seed + 400);
      const a = smoothstep(0.60, 0.82, streak) * (1 - smoothstep(0.0, 0.80, v)) * 0.26;
      return [ramp01('dirt', 0.30), a];
    });
    weatherPatches(p, [ramp01('dirt', 0.28), ramp01('grassdry', 0.26), ramp01('foliage', 0.30)],
      { cells: 4, amount: 0.22, threshold: 0.60, seed: 7 });
    p.brushwork({ amount: 0.06, scale: 22, aspect: 5, seed: seed + 3 });
    p.macro({ amount: 0.24, cells: 2, seed: seed + 9 });
    p.hueShiftAll(0.34);
    p.quantize({ ramps: ['plaster', 'sand', 'dirt', 'grassdry', 'stone'] });
    return p;
  },

  brick_wall: (size, seed) => {
    const p = new Plate(size, seed);
    const rand = mulberry32(seed);
    p.fill(ramp01('brick', 0.4));
    const heightAt = layCourses(p, {
      rows: 12, blocksPerRow: 6, joint: 2, stagger: false, evenRows: true, rand,
      blockColor: (t, r, rnd) => {
        // A few bricks are over- or under-fired. Kept rare and kept *within
        // the family* — the earlier version used near-black and pale yellow,
        // which read as missing tiles rather than variation.
        const roll = rnd();
        if (roll < 0.05) return ramp01('rooftile', 0.14);
        if (roll < 0.12) return ramp01('brick', 0.78);
        return mixColor(ramp01('brick', 0.22 + t * 0.52), ramp01('rooftile', 0.40), t * 0.34);
      },
      mortarColor: ramp01('plaster', 0.52),
      chipChance: 0.30,
    });
    p.paintBevel(heightAt, 0.16, { gradScale: 6 });
    crevasseGrime(p, heightAt, ramp01('dirt', 0.20), 0.28);
    weatherPatches(p, [ramp01('plaster', 0.60), ramp01('foliage', 0.28)], { cells: 3, amount: 0.20, threshold: 0.62 });
    p.brushwork({ amount: 0.06, scale: 34, aspect: 3, seed });
    p.macro({ amount: 0.22, cells: 2, seed: seed + 4 });
    p.hueShiftAll(0.30);
    p.quantize({ ramps: ['brick', 'rooftile', 'plaster', 'dirt', 'copper', 'sand'] });
    return p;
  },

  // --- architecture: roofs -------------------------------------------------

  roof_tile: (size, seed) => {
    const p = new Plate(size, seed);
    const cols = 8, rows = 8;                 // divide the tile exactly
    const cw = size / cols, rh = size / rows;
    const rand = mulberry32(seed);
    const jitter = Float32Array.from({ length: cols * rows }, () => rand());
    const heightField = new Float32Array(size * size);

    p.each((u, v, x, y) => {
      const row = Math.floor(y / rh);
      const shift = (row % 2) * 0.5;          // alternate courses offset
      const cf = x / cw + shift;
      const col = Math.floor(cf);
      const lx = cf - col;
      const ly = (y - row * rh) / rh;

      // Raised-cosine barrel rather than a true semicircle: the semicircle has
      // infinite slope where it meets the groove, so adjacent texels either
      // side of a tile boundary differ sharply and the wrap reads as a seam.
      const barrel = 0.5 - 0.5 * Math.cos(lx * Math.PI * 2);
      const overlap = smoothstep(0, 0.20, ly);
      const h = barrel * (0.35 + overlap * 0.65);
      heightField[y * size + x] = h;

      const j = jitter[(row % rows) * cols + (((col % cols) + cols) % cols)];
      const base = mixColor(ramp01('rooftile', 0.20 + j * 0.50), ramp01('brick', 0.40), j * 0.30);
      const tuck = 1 - (1 - overlap) * 0.34;  // shadow under the course above
      const micro = 1 + (fbm(u, v, 110, 110, 3, seed + 21) - 0.5) * 0.10;
      return scaleColor(base, tuck * micro);
    });

    const heightAt = fieldSampler(heightField, size);
    p.paintBevel(heightAt, 0.26, { lx: -0.85, ly: -0.35, gradScale: 5 });
    // Moss collects in the valleys between barrels.
    p.overlay((u, v, x, y) => {
      const n = macroMask(u, v, seed + 700, 5);
      return [ramp01('foliage', 0.30 + n * 0.26), (1 - heightAt(x, y)) * smoothstep(0.52, 0.80, n) * 0.46];
    });
    weatherPatches(p, [ramp01('dirt', 0.26), ramp01('plaster', 0.38)], { cells: 4, amount: 0.18, threshold: 0.62, seed: 3 });
    p.brushwork({ amount: 0.05, scale: 40, aspect: 1.4, seed });
    p.macro({ amount: 0.20, cells: 2, seed: seed + 6 });
    p.hueShiftAll(0.32);
    p.quantize({ ramps: ['rooftile', 'brick', 'foliage', 'dirt', 'plaster'] });
    return p;
  },

  roof_slate: (size, seed) => {
    const p = new Plate(size, seed);
    const cols = 8, rows = 16;
    const cw = size / cols, rh = size / rows;
    const rand = mulberry32(seed);
    const jitter = Float32Array.from({ length: cols * rows }, () => rand());
    const heightField = new Float32Array(size * size);

    p.each((u, v, x, y) => {
      const row = Math.floor(y / rh);
      const shift = (row % 2) * 0.5;
      const cf = x / cw + shift;
      const col = Math.floor(cf);
      const lx = cf - col;
      const ly = (y - row * rh) / rh;
      const j = jitter[(row % rows) * cols + (((col % cols) + cols) % cols)];

      // Slates are hung, so the bottom edge lifts slightly off the one below.
      const edgeX = Math.min(lx, 1 - lx);
      const h = smoothstep(0, 0.07, edgeX) * (0.42 + smoothstep(0, 0.55, ly) * 0.58);
      heightField[y * size + x] = h;

      // Occasional slate is a different stone entirely.
      const base = j > 0.90
        ? ramp01('granite', 0.28 + j * 0.30)
        : ramp01('roofslate', 0.18 + j * 0.52);
      const shadowFromAbove = 1 - (1 - smoothstep(0, 0.20, ly)) * 0.38;
      const micro = 1 + (fbm(u, v, 130, 130, 3, seed + 55) - 0.5) * 0.12;
      return scaleColor(base, shadowFromAbove * micro);
    });

    const heightAt = fieldSampler(heightField, size);
    p.paintBevel(heightAt, 0.18, { gradScale: 7 });
    weatherPatches(p, [ramp01('foliage', 0.30), ramp01('snow', 0.32)], { cells: 5, amount: 0.17, threshold: 0.64, seed: 9 });
    p.brushwork({ amount: 0.05, scale: 44, aspect: 2, seed });
    p.macro({ amount: 0.22, cells: 2, seed: seed + 8 });
    p.hueShiftAll(0.30);
    p.quantize({ ramps: ['roofslate', 'stone', 'foliage', 'granite'] });
    return p;
  },

  thatch: (size, seed) => {
    const p = new Plate(size, seed);
    const rand = mulberry32(seed);
    p.fill(ramp01('grassdry', 0.34));
    const courses = 4;                        // fewer, deeper courses read better
    const ch = size / courses;
    for (let c = 0; c < courses; c++) {
      const y0 = c * ch;
      // Deep shadow at the head of each course, before the straw goes on.
      for (let x = 0; x < size; x++) {
        for (let d = 0; d < ch * 0.30; d++) {
          p.multiply(x, y0 + d, 1 - 0.30 * (1 - d / (ch * 0.30)));
        }
      }
      for (let i = 0; i < size * 5.5; i++) {
        const x = rand() * size;
        const len = ch * lerp(0.75, 1.25, rand());
        const lean = (rand() - 0.5) * 5;
        const t = rand();
        const col = ramp01(t > 0.85 ? 'sand' : 'grassdry', 0.18 + t * 0.62);
        for (let k = 0; k < len; k++) {
          const yy = y0 + k;
          const xx = x + lean * (k / len);
          // Straws emerge from shadow and brighten toward their loose tips.
          const a = 0.5 * smoothstep(0, ch * 0.30, k) * (0.45 + 0.55 * (k / len));
          p.blend(Math.round(xx), Math.round(yy), col, a);
        }
      }
    }
    weatherPatches(p, [ramp01('foliage', 0.28), ramp01('dirt', 0.26)], { cells: 4, amount: 0.26, threshold: 0.58 });
    p.brushwork({ amount: 0.07, scale: 12, aspect: 0.25, seed });   // strokes run vertically
    p.macro({ amount: 0.24, cells: 2, seed: seed + 3 });
    p.hueShiftAll(0.34);
    p.quantize({ ramps: ['grassdry', 'sand', 'dirt', 'foliage', 'bark'] });
    return p;
  },

  // --- timber --------------------------------------------------------------

  wood_planks: (size, seed) => {
    const p = new Plate(size, seed);
    const planks = 6;
    const rand = mulberry32(seed);
    const bounds = partition(size, planks, rand, 0.78, 1.26);
    const tone = Array.from({ length: planks }, () => rand());
    const knots = [];
    for (let i = 0; i < planks; i++) {
      const n = Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        knots.push({
          plank: i,
          y: rand() * size,
          x: bounds[i] + (0.25 + rand() * 0.5) * (bounds[i + 1] - bounds[i]),
          r: lerp(3.5, 8, rand()),
        });
      }
    }
    const plankOf = new Int32Array(size);
    for (let i = 0; i < planks; i++) for (let x = bounds[i]; x < bounds[i + 1]; x++) plankOf[x] = i;
    const heightField = new Float32Array(size * size);

    p.each((u, v, x, y) => {
      const pi = plankOf[x];
      const x0 = bounds[pi], x1 = bounds[pi + 1];
      const pw = x1 - x0;
      const lx = (x - x0) / pw;
      const t = tone[pi];

      // Grain: noise stretched hard along the plank so it reads as fibre.
      let grain = fbm(u, v, 40, 3, 4, seed + pi * 131);
      for (const k of knots) {
        if (k.plank !== pi) continue;
        const dx = x - k.x;
        const dy = Math.min(Math.abs(y - k.y), size - Math.abs(y - k.y));
        const d = Math.hypot(dx, dy * 0.55);
        if (d < k.r * 7) grain += Math.sin(d * 0.55) * (1 - d / (k.r * 7)) * 0.32;
      }
      const base = ramp01('wood', 0.26 + t * 0.36 + (grain - 0.5) * 0.44);

      const edge = Math.min(lx, 1 - lx) * pw;
      heightField[y * size + x] = smoothstep(0, 3, edge);
      const gap = 1 - (1 - smoothstep(0, 2.5, edge)) * 0.58;
      return scaleColor(base, gap);
    });

    for (const k of knots) {
      for (let dy = -k.r * 2; dy <= k.r * 2; dy++) {
        for (let dx = -k.r * 2; dx <= k.r * 2; dx++) {
          const d = Math.hypot(dx, dy * 0.7);
          if (d > k.r * 2) continue;
          const a = 1 - smoothstep(k.r * 0.55, k.r * 2, d);
          const ring = 0.5 + 0.5 * Math.sin(d * 1.9);
          p.blend(Math.round(k.x + dx), Math.round(k.y + dy), ramp01('bark', 0.14 + ring * 0.26), a * 0.85);
        }
      }
    }

    const heightAt = fieldSampler(heightField, size);
    p.paintBevel(heightAt, 0.14, { gradScale: 8 });
    p.overlay((u, v) => {
      const r = ridged(u, v, 22, 3, 3, seed + 808);
      return [ramp01('bark', 0.12), smoothstep(0.90, 1.0, r) * 0.42];
    });
    p.brushwork({ amount: 0.05, scale: 8, aspect: 0.16, seed });   // strokes along the grain
    p.macro({ amount: 0.18, cells: 2, seed: seed + 2 });
    p.hueShiftAll(0.30);
    p.quantize({ ramps: ['wood', 'woodpale', 'bark', 'dirt'] });
    return p;
  },

  wood_floor: (size, seed) => {
    const src = MATERIALS.wood_planks(size, seed + 5);
    // Rotate so boards run horizontally, then add foot-traffic polish.
    const p = new Plate(size, seed);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) p.set(x, y, src.get(y, x));
    // Interior boards read lighter than exterior cladding — they're finished
    // and polished by traffic, and a dark floor swallows the whole room.
    p.each((u, v, x, y) => scaleColor(p.get(x, y), 1.32));
    p.overlay((u, v) => {
      const n = macroMask(u, v, seed + 61, 3);
      return [ramp01('woodpale', 0.74), smoothstep(0.48, 0.84, n) * 0.34];
    });
    p.macro({ amount: 0.14, cells: 3, seed: seed + 77 });
    p.quantize({ ramps: ['wood', 'woodpale', 'bark', 'dirt'] });
    return p;
  },

  bark: (size, seed) => {
    const p = new Plate(size, seed);
    // Bark is *plates separated by fissures*, so build the plates as cells
    // stretched vertically rather than trying to noise your way to it.
    p.each((u, v) => {
      const warp = (fbm(u, v, 6, 3, 3, seed + 3) - 0.5) * 0.10;
      const w = worley(u + warp, v, 14, 4, seed);
      const fissure = 1 - smoothstep(0.0, 0.16, w.f2 - w.f1);
      const dome = smoothstep(0.0, 0.5, w.f1);
      const grain = fbm(u, v, 20, 5, 3, seed + 40) - 0.5;
      const base = ramp01('bark', 0.30 + w.id * 0.34 + (1 - dome) * 0.20 + grain * 0.24);
      // Fissures are deep and much darker than the plate faces.
      return mixColor(base, ramp01('bark', 0.06), fissure * 0.85);
    });
    // Lichen creeping out of the fissures.
    p.overlay((u, v) => {
      const n = macroMask(u, v, seed + 44, 6);
      return [ramp01('foliage', 0.34), smoothstep(0.62, 0.86, n) * 0.30];
    });
    p.brushwork({ amount: 0.07, scale: 10, aspect: 0.2, seed });
    p.macro({ amount: 0.18, cells: 3, seed: seed + 5 });
    p.hueShiftAll(0.30);
    p.quantize({ ramps: ['bark', 'wood', 'foliage', 'dirt'] });
    return p;
  },

  // --- ground --------------------------------------------------------------

  grass: (size, seed) => {
    const p = new Plate(size, seed);
    const rand = mulberry32(seed);
    p.each((u, v) => {
      const patch = macroMask(u, v, seed, 5);
      const dry = macroMask(u, v, seed + 90, 3);
      return mixColor(
        ramp01('grass', 0.26 + patch * 0.48),
        ramp01('grassdry', 0.32 + patch * 0.32),
        smoothstep(0.56, 0.84, dry) * 0.55,
      );
    });
    // Individual blades in clumps.
    for (let i = 0; i < size * size * 0.05; i++) {
      const x = rand() * size, y = rand() * size;
      const len = lerp(2.5, 7, rand());
      const lean = (rand() - 0.5) * 2.8;
      const light = rand();
      const col = ramp01(light > 0.70 ? 'grass' : 'foliage', 0.28 + rand() * 0.50);
      for (let k = 0; k < len; k++) {
        p.blend(Math.round(x + lean * (k / len)), Math.round(y - k), col, 0.34 * (1 - k / len) + 0.10);
      }
    }
    p.overlay((u, v) => {
      const n = macroMask(u, v, seed + 300, 7);
      return [ramp01('dirt', 0.30), smoothstep(0.70, 0.88, n) * 0.45];
    });
    // Tiny flowers — a little hue contrast makes a green field sing.
    for (let i = 0; i < size * 0.6; i++) {
      const x = rand() * size, y = rand() * size;
      const kind = rand();
      const col = kind < 0.5 ? ramp01('holy', 0.85) : kind < 0.8 ? ramp01('clothpurple', 0.74) : ramp01('gold', 0.80);
      p.blend(Math.round(x), Math.round(y), col, 0.8);
      p.blend(Math.round(x + 1), Math.round(y), col, 0.35);
      p.blend(Math.round(x), Math.round(y + 1), col, 0.35);
    }
    p.brushwork({ amount: 0.07, scale: 26, aspect: 2.5, seed });
    p.macro({ amount: 0.20, cells: 3, seed: seed + 11 });
    p.hueShiftAll(0.26);
    p.quantize({ ramps: ['grass', 'grassdry', 'foliage', 'dirt', 'holy', 'clothpurple', 'gold'] });
    return p;
  },

  dirt_path: (size, seed) => {
    const p = new Plate(size, seed);
    const rand = mulberry32(seed);
    p.each((u, v) => {
      const big = macroMask(u, v, seed, 4);
      const fine = fbm(u, v, 18, 18, 4, seed + 2);
      // Sits noticeably lighter than before: a path is compacted, sun-baked
      // earth, and the previous value read as wet topsoil.
      return ramp01('dirt', 0.34 + big * 0.38 + (fine - 0.5) * 0.24);
    });
    // Embedded pebbles, with a painted contact shadow beneath each.
    for (let i = 0; i < size * 1.6; i++) {
      const x = rand() * size, y = rand() * size;
      const r = lerp(2.5, 6, rand());
      const col = ramp01(rand() < 0.3 ? 'granite' : 'rock', 0.30 + rand() * 0.40);
      for (let dy = -r - 2; dy <= r + 2; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const d = Math.hypot(dx, dy);
          if (d <= r) {
            p.blend(Math.round(x + dx), Math.round(y + dy), col, 1 - smoothstep(r * 0.55, r, d));
          } else if (dy > 0 && d < r + 2) {
            p.multiply(Math.round(x + dx), Math.round(y + dy), 1 - 0.16 * (1 - (d - r) / 2));
          }
        }
      }
    }
    // Cracked mud.
    p.overlay((u, v) => {
      const w = worley(u, v, 9, 9, seed + 12);
      return [ramp01('dirt', 0.12), (1 - smoothstep(0.0, 0.06, w.f2 - w.f1)) * 0.35];
    });
    weatherPatches(p, [ramp01('grass', 0.36), ramp01('grassdry', 0.42)], { cells: 5, amount: 0.28, threshold: 0.64 });
    p.brushwork({ amount: 0.06, scale: 24, aspect: 3, seed });
    p.macro({ amount: 0.24, cells: 2, seed: seed + 13 });
    p.hueShiftAll(0.28);
    // 'granite' deliberately excluded: its cool blue steps sat close enough in
    // luma to the warm dirt steps that dithering flipped isolated texels to
    // blue, scattering confetti across the whole plate.
    p.quantize({ ramps: ['dirt', 'sand', 'rock', 'grass', 'grassdry'], dither: 0.18 });
    return p;
  },

  cobblestone: (size, seed) => {
    const p = new Plate(size, seed);
    const cells = 9;
    const heightField = new Float32Array(size * size);
    p.each((u, v, x, y) => {
      const warp = (fbm(u, v, 12, 12, 3, seed + 6) - 0.5) * 0.045;
      const w = worley(u + warp, v - warp, cells, cells, seed);
      const border = smoothstep(0.0, 0.085, w.f2 - w.f1);
      heightField[y * size + x] = border;
      const stone = ramp01(w.id > 0.85 ? 'granite' : 'rock', 0.22 + w.id * 0.52);
      const dome = 1 + (border - 0.5) * 0.18;
      return mixColor(ramp01('dirt', 0.20), scaleColor(stone, dome), border);
    });
    const heightAt = fieldSampler(heightField, size);
    p.paintBevel(heightAt, 0.22, { gradScale: 5 });
    crevasseGrime(p, heightAt, ramp01('dirt', 0.16), 0.40);
    weatherPatches(p, [ramp01('foliage', 0.32), ramp01('swamp', 0.42)], { cells: 6, amount: 0.20, threshold: 0.66 });
    p.brushwork({ amount: 0.055, scale: 36, aspect: 2, seed });
    p.macro({ amount: 0.22, cells: 2, seed: seed + 15 });
    p.hueShiftAll(0.30);
    p.quantize({ ramps: ['rock', 'stone', 'dirt', 'foliage', 'granite'] });
    return p;
  },

  sand: (size, seed) => {
    const p = new Plate(size, seed);
    p.each((u, v) => {
      // Wind ripples are a *wave*, not noise — a warped sine gives the crisp
      // regular crests that noise can never produce.
      const dune = fbm(u, v, 3, 3, 3, seed + 30);
      const warp = (fbm(u, v, 5, 5, 3, seed) - 0.5) * 0.55;
      const phase = (v + warp * 0.10) * 26 + u * 4;
      const ripple = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      // Crests catch light on their windward face, troughs collect shadow.
      const crest = Math.pow(ripple, 1.6);
      const grain = fbm(u, v, 128, 128, 2, seed + 17);
      return ramp01('sand', 0.26 + dune * 0.34 + crest * 0.28 + (grain - 0.5) * 0.12);
    });
    // Occasional shell / pebble fleck.
    const rand = mulberry32(seed);
    for (let i = 0; i < size * 0.5; i++) {
      p.blend(Math.round(rand() * size), Math.round(rand() * size), ramp01('plaster', 0.80), 0.55);
    }
    p.brushwork({ amount: 0.045, scale: 30, aspect: 4, seed });
    p.macro({ amount: 0.20, cells: 2, seed: seed + 21 });
    p.hueShiftAll(0.28);
    p.quantize({ ramps: ['sand', 'grassdry', 'dirt', 'plaster'] });
    return p;
  },

  snow: (size, seed) => {
    const p = new Plate(size, seed);
    p.each((u, v) => {
      const drift = fbm(u, v, 7, 4, 4, seed);
      const grain = fbm(u, v, 128, 128, 2, seed + 4);
      return ramp01('snow', 0.44 + drift * 0.44 + (grain - 0.5) * 0.10);
    });
    // Wind-scoured ridges catching cold blue in their lee.
    p.overlay((u, v) => {
      const r = ridged(u, v, 14, 6, 3, seed + 60);
      return [ramp01('ice', 0.55), smoothstep(0.72, 0.96, r) * 0.30];
    });
    p.brushwork({ amount: 0.04, scale: 28, aspect: 3, seed });
    p.macro({ amount: 0.18, cells: 2, seed: seed + 31 });
    p.hueShiftAll(0.22);
    p.quantize({ ramps: ['snow', 'ice', 'marble'] });
    return p;
  },

  // --- rock ----------------------------------------------------------------

  rock_cliff: (size, seed) => {
    const p = new Plate(size, seed);
    const rand = mulberry32(seed);
    // Strata as explicit bands with hard tops and soft bottoms, drawn rather
    // than noised. Multi-octave noise averages its own anisotropy away, which
    // is why the earlier version came out as flat grey cloud.
    const layers = partition(size, 9, rand, 0.55, 1.6);
    const layerTone = Array.from({ length: 9 }, () => rand());
    const rowOf = new Int32Array(size);
    for (let i = 0; i < 9; i++) for (let y = layers[i]; y < layers[i + 1]; y++) rowOf[y] = i;

    p.each((u, v, x, y) => {
      // Warp the band lookup so strata undulate instead of running ruler-flat.
      const warp = (fbm(u, v, 4, 2, 2, seed + 1) - 0.5) * size * 0.09;
      const yy = (((y + warp) | 0) % size + size) % size;
      const li = rowOf[yy];
      const t = layerTone[li];
      const y0 = layers[li], y1 = layers[li + 1];
      const ly = (yy - y0) / Math.max(1, y1 - y0);

      // Each bed is darker at its base where it beds onto the layer below.
      const bedding = 0.30 + smoothstep(0, 0.35, ly) * 0.70;
      const rough = fbm(u, v, 26, 20, 3, seed + 7) - 0.5;
      const chunk = ridged(u, v, 10, 8, 2, seed + 12);
      return ramp01(t > 0.72 ? 'granite' : 'rock',
        0.10 + t * 0.28 + bedding * 0.30 + rough * 0.26 + chunk * 0.14);
    });

    // Vertical fractures cutting across the beds.
    p.overlay((u, v) => {
      const r = ridged(u, v, 12, 2, 3, seed + 33);
      return [ramp01('granite', 0.06), smoothstep(0.80, 0.98, r) * 0.65];
    });
    // Soil and scrub caught on the ledges between beds.
    p.overlay((u, v, x, y) => {
      const li = rowOf[y];
      const y0 = layers[li];
      const onLedge = 1 - smoothstep(0, 5, y - y0);
      if (onLedge <= 0) return null;
      const n = macroMask(u, v, seed + 55, 5);
      return [ramp01(n > 0.55 ? 'foliage' : 'dirt', 0.26 + n * 0.20), onLedge * 0.55];
    });
    weatherPatches(p, [ramp01('foliage', 0.34), ramp01('grassdry', 0.30)], { cells: 5, amount: 0.22, threshold: 0.64 });
    p.brushwork({ amount: 0.085, scale: 22, aspect: 3, seed });
    p.macro({ amount: 0.16, cells: 4, seed: seed + 41 });
    p.hueShiftAll(0.32);
    p.quantize({ ramps: ['rock', 'granite', 'stone', 'dirt', 'foliage', 'grassdry'] });
    return p;
  },

  cave_rock: (size, seed) => {
    const p = new Plate(size, seed);
    // Flowstone: overlapping cellular lobes, each with its own value, so the
    // surface has readable forms rather than uniform grain.
    p.each((u, v) => {
      const warp = (fbm(u, v, 5, 5, 3, seed + 9) - 0.5) * 0.16;
      const w = worley(u + warp, v - warp, 6, 6, seed);
      const lobe = smoothstep(0.0, 0.55, w.f1);          // domed cells
      const crease = 1 - smoothstep(0.0, 0.10, w.f2 - w.f1);
      const grit = fbm(u, v, 40, 40, 3, seed + 5) - 0.5;
      const base = ramp01('granite', 0.14 + w.id * 0.26 + (1 - lobe) * 0.34 + grit * 0.22);
      return scaleColor(base, 1 - crease * 0.42);
    });
    // Damp streaks running down the wall.
    p.overlay((u, v) => {
      const streak = fbm(u, v, 30, 3, 3, seed + 220);
      return [ramp01('granite', 0.06), smoothstep(0.62, 0.88, streak) * 0.34];
    });
    // Mineral seams — a thread of colour keeps caves from being grey mud.
    p.overlay((u, v) => {
      const r = ridged(u, v, 9, 6, 3, seed + 501);
      const core = smoothstep(0.93, 1.0, r);
      const halo = smoothstep(0.86, 0.97, r);
      return halo > 0 ? [mixColor(ramp01('aether', 0.36), ramp01('aether', 0.78), core), halo * 0.65] : null;
    });
    p.brushwork({ amount: 0.08, scale: 20, aspect: 2, seed });
    p.macro({ amount: 0.20, cells: 4, seed: seed + 51 });
    p.hueShiftAll(0.34);
    p.quantize({ ramps: ['granite', 'rock', 'stone', 'dirt', 'aether'] });
    return p;
  },

  // --- interiors & finery --------------------------------------------------

  marble_floor: (size, seed) => {
    const p = new Plate(size, seed);
    const tiles = 2;                          // big slabs read better than a checker
    const tw = size / tiles;
    const heightField = new Float32Array(size * size);
    p.each((u, v, x, y) => {
      const tx = Math.floor(x / tw), ty = Math.floor(y / tw);
      const checker = (tx + ty) % 2 === 0;
      const lx = (x - tx * tw) / tw, ly = (y - ty * tw) / tw;
      const edge = Math.min(Math.min(lx, 1 - lx), Math.min(ly, 1 - ly)) * tw;
      heightField[y * size + x] = smoothstep(0, 2.5, edge);

      // Veining runs as one continuous periodic field across the whole plate.
      // Seeding it per slab made two different vein patterns collide at the
      // wrap, which is a genuine seam rather than a structural edge.
      const warp = (fbm(u, v, 6, 6, 3, seed + 13) - 0.5) * 0.25;
      const vein = ridged(u + warp, v - warp, 6, 8, 4, seed + 31);
      const base = checker ? ramp01('marble', 0.76) : ramp01('marble', 0.60);
      const veinCol = checker ? ramp01('granite', 0.60) : ramp01('granite', 0.46);
      // Broader, softer veins. Narrow high-contrast ones read as scribbles.
      const t = smoothstep(0.58, 0.94, vein) * 0.38;
      const grout = 1 - (1 - smoothstep(0, 2, edge)) * 0.40;
      return scaleColor(mixColor(base, veinCol, t), grout);
    });
    const heightAt = fieldSampler(heightField, size);
    p.paintBevel(heightAt, 0.10, { gradScale: 9 });
    // Worn tracks where feet have polished the stone.
    p.overlay((u, v) => {
      const n = macroMask(u, v, seed + 88, 2);
      return [ramp01('plaster', 0.58), smoothstep(0.56, 0.88, n) * 0.16];
    });
    p.macro({ amount: 0.12, cells: 2, seed: seed + 61 });
    p.hueShiftAll(0.24);
    p.quantize({ ramps: ['marble', 'granite', 'stone', 'plaster'] });
    return p;
  },

  iron_plate: (size, seed) => {
    const p = new Plate(size, seed);
    p.each((u, v) => {
      const n = fbm(u, v, 40, 40, 4, seed);
      const brush = fbm(u, v, 64, 6, 3, seed + 2);
      return ramp01('iron', 0.28 + n * 0.20 + (brush - 0.5) * 0.26);
    });
    const panels = 2;
    const pw = size / panels;
    // Recessed seams with a lit upper lip.
    p.overlay((u, v, x, y) => {
      const lx = (x % pw) / pw, ly = (y % pw) / pw;
      const edge = Math.min(Math.min(lx, 1 - lx), Math.min(ly, 1 - ly)) * pw;
      if (edge < 3) return [ramp01('iron', 0.08), 0.8];
      if (edge < 6) return [ramp01('steel', 0.74), 0.34];
      return null;
    });
    // Rivets around each panel.
    for (let py = 0; py < panels; py++) {
      for (let px = 0; px < panels; px++) {
        const n = 7;
        for (let i = 0; i < n; i++) {
          const f = (i + 0.5) / n;
          for (const [rx, ry] of [[f, 0.045], [f, 0.955], [0.045, f], [0.955, f]]) {
            const cx = (px + rx) * pw, cy = (py + ry) * pw;
            const R = 3.4;
            for (let dy = -R - 1; dy <= R + 1; dy++) {
              for (let dx = -R - 1; dx <= R + 1; dx++) {
                const d = Math.hypot(dx, dy);
                if (d > R + 1) continue;
                if (d > R) { p.multiply(Math.round(cx + dx), Math.round(cy + dy), 0.86); continue; }
                // Domed head: lit top-left, shadowed bottom-right.
                const lit = clamp01((-dx - dy) / (R * 2) + 0.5);
                p.blend(Math.round(cx + dx), Math.round(cy + dy),
                  ramp01('steel', 0.14 + lit * 0.76), 1 - smoothstep(R * 0.8, R, d) * 0.25);
              }
            }
          }
        }
      }
    }
    // Rust blooms. Applied before the rivets get their final highlight so the
    // rivets stay legible — they're the detail that says "manufactured".
    p.overlay((u, v) => {
      const n = macroMask(u, v, seed + 404, 5);
      return [ramp01('copper', 0.26 + n * 0.32), smoothstep(0.64, 0.90, n) * 0.40];
    });
    p.brushwork({ amount: 0.05, scale: 42, aspect: 5, seed });
    p.macro({ amount: 0.18, cells: 2, seed: seed + 71 });
    p.hueShiftAll(0.26);
    p.quantize({ ramps: ['iron', 'steel', 'copper', 'brass', 'granite'] });
    return p;
  },

  fabric: (size, seed) => {
    const p = new Plate(size, seed);
    const threads = 128;                      // divides the tile exactly
    p.each((u, v) => {
      // Woven weft/warp from two phase-shifted square waves.
      const warpT = Math.sin(u * threads * Math.PI * 2) * 0.5 + 0.5;
      const weftT = Math.sin(v * threads * Math.PI * 2 + 1.6) * 0.5 + 0.5;
      const weave = warpT * 0.5 + weftT * 0.5;
      const fibre = fbm(u, v, 110, 110, 3, seed);
      return ramp01('clothred', 0.26 + weave * 0.24 + (fibre - 0.5) * 0.16);
    });
    // A single embroidered band, low in the frame.
    p.overlay((u, v) => {
      const inBand = v > 0.72 && v < 0.86;
      if (!inBand) return null;
      const t = smoothstep(0.72, 0.745, v) * (1 - smoothstep(0.835, 0.86, v));
      const motif = Math.sin(u * Math.PI * 24) > 0.35 ? 1 : 0;
      return [ramp01('gold', 0.50 + motif * 0.26), t * 0.72];
    });
    weatherPatches(p, [ramp01('clothred', 0.14), ramp01('dirt', 0.30)], { cells: 3, amount: 0.20, threshold: 0.62 });
    p.macro({ amount: 0.20, cells: 2, seed: seed + 91 });
    p.hueShiftAll(0.28);
    p.quantize({ ramps: ['clothred', 'gold', 'brass', 'clothblack'] });
    return p;
  },

  // --- the strange ---------------------------------------------------------

  aether_stone: (size, seed) => {
    const p = new Plate(size, seed);
    p.each((u, v) => {
      const warp = (fbm(u, v, 6, 6, 4, seed + 3) - 0.5) * 0.35;
      const n = fbm(u + warp, v - warp, 12, 12, 5, seed);
      return ramp01('void', 0.14 + n * 0.44);
    });
    p.overlay((u, v) => {
      const r = ridged(u, v, 7, 7, 4, seed + 77);
      const core = smoothstep(0.90, 1.0, r);
      const halo = smoothstep(0.74, 0.93, r);
      return halo > 0 ? [mixColor(ramp01('aether', 0.52), ramp01('aether', 0.94), core), halo * 0.85] : null;
    });
    p.brushwork({ amount: 0.07, scale: 24, aspect: 2, seed });
    p.macro({ amount: 0.24, cells: 2, seed: seed + 101 });
    p.quantize({ ramps: ['void', 'aether', 'aetherhot', 'granite'] });
    return p;
  },

  magitek_panel: (size, seed) => {
    const p = new Plate(size, seed);
    const rand = mulberry32(seed);
    p.each((u, v) => {
      const n = fbm(u, v, 34, 34, 4, seed);
      const brush = fbm(u, v, 60, 5, 3, seed + 11);
      return ramp01('steel', 0.22 + n * 0.24 + (brush - 0.5) * 0.16);
    });
    // Recessed panel grid.
    const g = 4;
    const cw = size / g;
    p.overlay((u, v, x, y) => {
      const lx = (x % cw) / cw, ly = (y % cw) / cw;
      const edge = Math.min(Math.min(lx, 1 - lx), Math.min(ly, 1 - ly)) * cw;
      if (edge < 2) return [ramp01('iron', 0.10), 0.78];
      if (edge < 5) return [ramp01('steel', 0.70), 0.26];
      return null;
    });
    // Vent louvres on some panels — structure beats more glowing lines.
    for (let gy = 0; gy < g; gy++) {
      for (let gx = 0; gx < g; gx++) {
        if (rand() > 0.34) continue;
        const x0 = gx * cw, y0 = gy * cw;
        for (let i = 1; i < 7; i++) {
          const yy = y0 + (i / 7) * cw;
          for (let x = Math.round(x0 + cw * 0.18); x < x0 + cw * 0.82; x++) {
            p.blend(x, Math.round(yy), ramp01('iron', 0.14), 0.7);
            p.blend(x, Math.round(yy + 1), ramp01('steel', 0.62), 0.3);
          }
        }
      }
    }
    // A single conduit, run as a physical channel: a recessed dark trough with
    // a thin lit core. Bright lines painted straight onto a panel read as neon
    // decals; a trough reads as engineering.
    {
      const horizontal = rand() < 0.5;
      const pos = (Math.floor(rand() * g) + 0.5) * cw;
      const trough = 5;
      for (let t = 0; t < size; t++) {
        for (let w = -trough; w <= trough; w++) {
          const f = Math.abs(w) / trough;
          const put = (col, a) => {
            if (horizontal) p.blend(t, Math.round(pos + w), col, a);
            else p.blend(Math.round(pos + w), t, col, a);
          };
          if (f > 0.55) put(ramp01('iron', 0.10), 0.75);              // channel walls
          else if (f > 0.25) put(ramp01('iron', 0.18), 0.85);         // channel floor
          else put(ramp01('aether', 0.34 + (1 - f / 0.25) * 0.30), 0.55 * (1 - f / 0.25) + 0.2);
        }
      }
    }
    p.overlay((u, v) => {
      const n = macroMask(u, v, seed + 90, 5);
      return [ramp01('copper', 0.30), smoothstep(0.68, 0.88, n) * 0.34];
    });
    p.macro({ amount: 0.20, cells: 2, seed: seed + 121 });
    p.hueShiftAll(0.24);
    p.quantize({ ramps: ['steel', 'iron', 'aether', 'copper', 'brass'] });
    return p;
  },
};
