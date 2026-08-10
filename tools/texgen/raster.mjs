/**
 * A tiny painting library for authoring seamless material plates.
 *
 * Everything here works in *tile space*: coordinates wrap at the tile edge, so
 * a shape drawn across the right edge reappears on the left. That's what makes
 * the output genuinely seamless rather than "seamless after a blur pass",
 * which is the usual giveaway.
 *
 * Colour is kept in linear-ish sRGB floats 0..1 while painting and converted on
 * write, so blending behaves.
 */

import { PNG } from 'pngjs';
import fs from 'node:fs';
import { RAMPS, hexToRgb, rampAt } from '../../src/engine/palette.js';

// ---------------------------------------------------------------------------
// Deterministic noise
// ---------------------------------------------------------------------------

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Value noise on a periodic lattice, with independent cell counts per axis.
 *
 * Per-axis periods matter more than they look: the lattice only wraps over a
 * *unit* interval of input, so the usual trick of squashing one axis by
 * scaling the coordinate (`fbm(u * 2.6, v * 0.3, …)`) silently lands the tile
 * edge mid-cell and produces a visible seam. Asking for `px = 26, py = 3`
 * gives the same anisotropy and still wraps exactly.
 */
export function valueNoise(x, y, px, py = px, seed = 0) {
  const pxi = Math.max(1, Math.round(px));
  const pyi = Math.max(1, Math.round(py));
  const fx = x * pxi;
  const fy = y * pyi;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = smooth(fx - ix);
  const ty = smooth(fy - iy);
  const wx = (v) => ((v % pxi) + pxi) % pxi;
  const wy = (v) => ((v % pyi) + pyi) % pyi;
  const x0 = wx(ix), x1 = wx(ix + 1);
  const y0 = wy(iy), y1 = wy(iy + 1);
  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  const top = a + (b - a) * tx;
  const bot = c + (d - c) * tx;
  return top + (bot - top) * ty;
}

/** Fractal sum of periodic value noise. Still wraps exactly. */
export function fbm(x, y, px, py, octaves, seed, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0;
  let cx = px, cy = py;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, y, cx, cy, seed + i * 977) * amp;
    norm += amp;
    amp *= gain;
    cx *= 2; cy *= 2;
  }
  return sum / norm;
}

/**
 * Ridged noise — the sharp creases read as cracks and rock strata far better
 * than plain fbm, which always looks like clouds.
 */
export function ridged(x, y, px, py, octaves, seed) {
  let sum = 0, amp = 1, norm = 0;
  let cx = px, cy = py;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise(x, y, cx, cy, seed + i * 613) * 2 - 1);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    cx *= 2; cy *= 2;
  }
  return sum / norm;
}

/**
 * Periodic Worley/cellular noise. Returns {f1, f2, id} — f2-f1 gives clean cell
 * borders (cobbles, cracked earth, scales), and `id` lets each cell take its
 * own colour.
 */
export function worley(x, y, px, py = px, seed = 0) {
  const pxi = Math.max(1, Math.round(px));
  const pyi = Math.max(1, Math.round(py));
  const fx = x * pxi, fy = y * pyi;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  let f1 = Infinity, f2 = Infinity, id = 0;
  const wx = (v) => ((v % pxi) + pxi) % pxi;
  const wy = (v) => ((v % pyi) + pyi) % pyi;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = ix + ox, cy = iy + oy;
      const hx = wx(cx), hy = wy(cy);
      const jx = cx + hash2(hx, hy, seed);
      const jy = cy + hash2(hx, hy, seed + 7919);
      const d = Math.hypot(jx - fx, jy - fy);
      if (d < f1) { f2 = f1; f1 = d; id = hash2(hx, hy, seed + 104729); }
      else if (d < f2) { f2 = d; }
    }
  }
  return { f1, f2, id };
}

/**
 * Large-scale value modulation.
 *
 * The difference between a texture that looks painted and one that looks
 * generated is almost always this: painted surfaces have big light and dark
 * masses across the whole plate, with detail riding on top. Uniform detail at
 * one frequency everywhere is the signature of machine output.
 */
export function macroMask(x, y, seed, cells = 3) {
  const warp = (fbm(x, y, cells, cells, 3, seed + 17) - 0.5) * 0.35;
  return fbm(x + warp, y - warp, cells, cells, 4, seed);
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
};

export function hex01(hex) {
  const [r, g, b] = hexToRgb(hex);
  return [r / 255, g / 255, b / 255];
}

/** Sample one of the master ramps at 0..1 and return floats. */
export function ramp01(name, t) {
  return hex01(rampAt(name, t));
}

export function mixColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function scaleColor(c, k) {
  return [clamp01(c[0] * k), clamp01(c[1] * k), clamp01(c[2] * k)];
}

export function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

export function hslToRgb([h, s, l]) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

/**
 * Shift a colour's hue toward warm as it lightens and cool as it darkens.
 * This is the single most important operation in the whole art pipeline — it
 * is what separates painted-looking material from flat recoloured noise.
 */
export function hueShift(color, amount) {
  const [h, s, l] = rgbToHsl(color);
  // Warm target ~0.09 (amber), cool target ~0.60 (blue-violet).
  const target = l > 0.5 ? 0.09 : 0.60;
  let dh = target - h;
  if (dh > 0.5) dh -= 1;
  if (dh < -0.5) dh += 1;
  const weight = Math.abs(l - 0.5) * 2 * amount;
  const ns = clamp01(s * (1 + (l < 0.5 ? 0.16 : -0.08) * amount));
  return hslToRgb([(h + dh * weight + 1) % 1, ns, l]);
}

// ---------------------------------------------------------------------------
// The canvas
// ---------------------------------------------------------------------------

export class Plate {
  constructor(size, seed = 1) {
    this.size = size;
    this.data = new Float32Array(size * size * 3);
    this.alpha = null;
    this.rand = mulberry32(seed);
    this.seed = seed;
  }

  wrap(v) {
    const s = this.size;
    return ((v % s) + s) % s;
  }

  index(x, y) {
    return (this.wrap(y | 0) * this.size + this.wrap(x | 0)) * 3;
  }

  get(x, y) {
    const i = this.index(x, y);
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }

  set(x, y, c) {
    const i = this.index(x, y);
    this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2];
  }

  blend(x, y, c, a) {
    if (a <= 0) return;
    const i = this.index(x, y);
    const k = a > 1 ? 1 : a;
    this.data[i] += (c[0] - this.data[i]) * k;
    this.data[i + 1] += (c[1] - this.data[i + 1]) * k;
    this.data[i + 2] += (c[2] - this.data[i + 2]) * k;
  }

  multiply(x, y, k) {
    const i = this.index(x, y);
    this.data[i] = clamp01(this.data[i] * k);
    this.data[i + 1] = clamp01(this.data[i + 1] * k);
    this.data[i + 2] = clamp01(this.data[i + 2] * k);
  }

  fill(c) {
    for (let i = 0; i < this.data.length; i += 3) {
      this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2];
    }
    return this;
  }

  /** Visit every texel with normalised uv. `fn(u, v, x, y)` returns a colour or null. */
  each(fn) {
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const c = fn((x + 0.5) / s, (y + 0.5) / s, x, y);
        if (c) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Like `each` but blends the returned [color, alpha] pair. */
  overlay(fn) {
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const r = fn((x + 0.5) / s, (y + 0.5) / s, x, y);
        if (r) this.blend(x, y, r[0], r[1]);
      }
    }
    return this;
  }

  /** Wrapping filled rectangle with soft edges. */
  rect(x0, y0, w, h, color, feather = 0) {
    for (let dy = -feather; dy < h + feather; dy++) {
      for (let dx = -feather; dx < w + feather; dx++) {
        let a = 1;
        if (feather > 0) {
          const ex = Math.min(dx + feather, w + feather - 1 - dx) / (feather * 2 || 1);
          const ey = Math.min(dy + feather, h + feather - 1 - dy) / (feather * 2 || 1);
          a = clamp01(Math.min(ex, ey) + 0.5);
        }
        this.blend(x0 + dx, y0 + dy, color, a);
      }
    }
    return this;
  }

  /** A 1px wrapping line, used for mortar joints and plank seams. */
  hline(y, x0, x1, color, alpha = 1) {
    for (let x = x0; x < x1; x++) this.blend(x, y, color, alpha);
    return this;
  }

  vline(x, y0, y1, color, alpha = 1) {
    for (let y = y0; y < y1; y++) this.blend(x, y, color, alpha);
    return this;
  }

  /** Separable box blur (wrapping). Two passes approximate a gaussian well. */
  blur(radius, passes = 2) {
    if (radius < 1) return this;
    const s = this.size;
    const r = Math.round(radius);
    const tmp = new Float32Array(this.data.length);
    for (let p = 0; p < passes; p++) {
      // horizontal
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          let a = 0, b = 0, c = 0;
          for (let k = -r; k <= r; k++) {
            const i = this.index(x + k, y);
            a += this.data[i]; b += this.data[i + 1]; c += this.data[i + 2];
          }
          const n = r * 2 + 1;
          const o = (y * s + x) * 3;
          tmp[o] = a / n; tmp[o + 1] = b / n; tmp[o + 2] = c / n;
        }
      }
      this.data.set(tmp);
      // vertical
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          let a = 0, b = 0, c = 0;
          for (let k = -r; k <= r; k++) {
            const i = this.index(x, y + k);
            a += this.data[i]; b += this.data[i + 1]; c += this.data[i + 2];
          }
          const n = r * 2 + 1;
          const o = (y * s + x) * 3;
          tmp[o] = a / n; tmp[o + 1] = b / n; tmp[o + 2] = c / n;
        }
      }
      this.data.set(tmp);
    }
    return this;
  }

  /**
   * Fake a painted bevel: brighten where the height field rises and darken
   * where it falls, along a fixed "paint light" direction. This is *painted*
   * shading baked into albedo, kept deliberately weak so it reads as an
   * artist's edge highlight rather than baked lighting (which fights the
   * engine's real lights and is a classic amateur texture mistake).
   */
  paintBevel(heightAt, strength = 0.18, { lx = -0.7, ly = -0.7, gradScale = 6, warm = 0.35 } = {}) {
    const s = this.size;
    const out = new Float32Array(this.data.length);
    out.set(this.data);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const hC = heightAt(x, y);
        const grad = (heightAt(this.wrap(x + 1), y) - hC) * lx
                   + (heightAt(x, this.wrap(y + 1)) - hC) * ly;
        const g = Math.max(-1, Math.min(1, grad * gradScale));
        const k = 1 + g * strength;
        const i = (y * s + x) * 3;
        // Lit edges warm slightly, shadowed edges cool — a painter's bevel,
        // not a normal map.
        const wr = 1 + (g > 0 ? g * warm * 0.10 : g * warm * -0.04);
        const wb = 1 + (g > 0 ? g * warm * -0.06 : g * warm * 0.12);
        out[i] = clamp01(this.data[i] * k * wr);
        out[i + 1] = clamp01(this.data[i + 1] * k);
        out[i + 2] = clamp01(this.data[i + 2] * k * wb);
      }
    }
    this.data.set(out);
    return this;
  }

  /**
   * Break up flat areas with visible brush strokes. Elongated, directional,
   * multi-scale — the opposite of uniform per-pixel noise, which reads as
   * digital grain rather than paint.
   */
  brushwork({ amount = 0.09, scale = 26, aspect = 4, seed = 11 } = {}) {
    // Strokes are just anisotropic noise: many cells along the stroke axis,
    // few across it. `aspect` is how long a stroke is relative to its width.
    const px = Math.max(1, Math.round(scale));
    const py = Math.max(1, Math.round(scale / aspect));
    return this.each((u, v, x, y) => {
      const n1 = fbm(u, v, px, py, 3, seed) - 0.5;
      const n2 = fbm(u, v, px * 3, py * 3, 2, seed + 31) - 0.5;
      const k = 1 + (n1 * 0.78 + n2 * 0.22) * amount * 2;
      const c = this.get(x, y);
      return [clamp01(c[0] * k), clamp01(c[1] * k), clamp01(c[2] * k)];
    });
  }

  /**
   * Apply the big light/dark masses. Run this near the end, after detail —
   * it unifies a busy plate the way a glaze does over a painting.
   */
  macro({ amount = 0.16, cells = 3, seed = 5, warmth = 0.35 } = {}) {
    return this.each((u, v, x, y) => {
      const m = macroMask(u, v, seed, cells) - 0.5;
      const k = 1 + m * amount * 2;
      const c = this.get(x, y);
      // Brighter regions drift warm, darker regions cool — a glaze, not a
      // brightness slider.
      return [
        clamp01(c[0] * (k + m * warmth * 0.06)),
        clamp01(c[1] * k),
        clamp01(c[2] * (k - m * warmth * 0.05)),
      ];
    });
  }

  /** Apply the warm-light / cool-shadow hue shift across the whole plate. */
  hueShiftAll(amount = 0.35) {
    return this.each((u, v, x, y) => hueShift(this.get(x, y), amount));
  }

  /**
   * Snap every texel to the nearest colour in the master palette, with ordered
   * dithering so gradients don't band. This is the step that forces every
   * material — however it was produced — into one coherent art direction.
   */
  quantize({ ramps = null, dither = 0.28, levels = null } = {}) {
    const targets = [];
    const names = ramps || Object.keys(RAMPS);
    for (const name of names) {
      const steps = levels ?? 9;
      for (let i = 0; i < steps; i++) targets.push(ramp01(name, i / (steps - 1)));
    }
    // 4x4 Bayer matrix.
    const bayer = [
      [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5],
    ];
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 3;
        const d = (bayer[y & 3][x & 3] / 16 - 0.5) * dither * 0.08;
        const r = clamp01(this.data[i] + d);
        const g = clamp01(this.data[i + 1] + d);
        const b = clamp01(this.data[i + 2] + d);
        let best = targets[0], bestD = Infinity;
        for (const t of targets) {
          // Weighted toward luma — matching brightness matters more than hue.
          const dr = (t[0] - r) * 0.55, dg = (t[1] - g) * 0.75, db = (t[2] - b) * 0.35;
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestD) { bestD = dist; best = t; }
        }
        this.data[i] = best[0]; this.data[i + 1] = best[1]; this.data[i + 2] = best[2];
      }
    }
    return this;
  }

  /**
   * Seamlessness, measured *relative* to the texture's own contrast.
   *
   * An absolute edge-difference metric lies: a material whose structure puts a
   * genuine high-contrast feature on the tile boundary (the groove between two
   * roof tiles, say) scores terribly while tiling perfectly. What actually
   * matters is whether the wrap-around step looks like any other neighbouring
   * pair of texels. Returns a ratio — 1.0 means the seam is indistinguishable
   * from ordinary interior detail.
   */
  seamError() {
    const s = this.size;
    const diff = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    let edge = 0;
    for (let i = 0; i < s; i++) {
      edge += diff(this.get(0, i), this.get(s - 1, i));
      edge += diff(this.get(i, 0), this.get(i, s - 1));
    }
    edge /= s * 2;

    // Compare against the 90th percentile of interior neighbour differences,
    // not the mean. Structured materials (courses of tile, planks) contain
    // strong internal transitions by design; the question is whether the wrap
    // boundary is *within the range* of those, not whether it beats the
    // average smooth texel.
    const samples = [];
    for (let y = 0; y < s; y += 2) {
      for (let x = 0; x < s - 1; x += 2) {
        samples.push(diff(this.get(x, y), this.get(x + 1, y)));
        samples.push(diff(this.get(y, x), this.get(y, x + 1)));
      }
    }
    samples.sort((a, b) => a - b);
    const p90 = samples[Math.floor(samples.length * 0.9)] || 1e-4;
    return edge / Math.max(p90, 1e-4);
  }

  setAlphaFrom(fn) {
    const s = this.size;
    this.alpha = new Float32Array(s * s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        this.alpha[y * s + x] = clamp01(fn((x + 0.5) / s, (y + 0.5) / s, x, y));
      }
    }
    return this;
  }

  writePNG(path) {
    const s = this.size;
    const png = new PNG({ width: s, height: s, colorType: this.alpha ? 6 : 2 });
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 3;
        const o = (y * s + x) * 4;
        png.data[o] = Math.round(clamp01(this.data[i]) * 255);
        png.data[o + 1] = Math.round(clamp01(this.data[i + 1]) * 255);
        png.data[o + 2] = Math.round(clamp01(this.data[i + 2]) * 255);
        png.data[o + 3] = this.alpha ? Math.round(this.alpha[y * s + x] * 255) : 255;
      }
    }
    fs.mkdirSync(path.substring(0, path.lastIndexOf('/')), { recursive: true });
    fs.writeFileSync(path, PNG.sync.write(png));
    return this;
  }

  /** Load an externally generated plate (e.g. from an image model) as a start. */
  static fromPNG(path, seed = 1) {
    const png = PNG.sync.read(fs.readFileSync(path));
    const size = Math.min(png.width, png.height);
    const plate = new Plate(size, seed);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const src = (y * png.width + x) * 4;
        const dst = (y * size + x) * 3;
        plate.data[dst] = png.data[src] / 255;
        plate.data[dst + 1] = png.data[src + 1] / 255;
        plate.data[dst + 2] = png.data[src + 2] / 255;
      }
    }
    return plate;
  }

  /**
   * Resample to a square of `size` with bilinear filtering, wrapping at the
   * edges so a plate that already tiles still tiles afterwards.
   */
  resample(size) {
    if (size === this.size) return this;
    const src = this.data;
    const ss = this.size;
    const out = new Float32Array(size * size * 3);
    const at = (x, y, c) => {
      const xi = ((x % ss) + ss) % ss;
      const yi = ((y % ss) + ss) % ss;
      return src[(yi * ss + xi) * 3 + c];
    };
    const ratio = ss / size;
    for (let y = 0; y < size; y++) {
      const sy = (y + 0.5) * ratio - 0.5;
      const y0 = Math.floor(sy), fy = sy - y0;
      for (let x = 0; x < size; x++) {
        const sx = (x + 0.5) * ratio - 0.5;
        const x0 = Math.floor(sx), fx = sx - x0;
        for (let c = 0; c < 3; c++) {
          const a = at(x0, y0, c) * (1 - fx) + at(x0 + 1, y0, c) * fx;
          const b = at(x0, y0 + 1, c) * (1 - fx) + at(x0 + 1, y0 + 1, c) * fx;
          out[(y * size + x) * 3 + c] = a * (1 - fy) + b * fy;
        }
      }
    }
    this.data = out;
    this.size = size;
    this.alpha = null;
    return this;
  }

  /**
   * Keep the middle `fraction` of the plate and blow it back up to full size.
   *
   * This is the blunt instrument that turns a generated *picture* into a
   * *material*. Image models asked for "a stone wall" reliably answer with a
   * building — arches, a horizon, a sky — because that is what the caption
   * "stone wall" is attached to in their training data. Throwing away the
   * outer two thirds discards the composition and keeps the surface, which is
   * the only part that was ever wanted.
   */
  cropCentre(fraction = 0.5) {
    return this.cropAt(fraction, 0.5, 0.5);
  }

  /** Crop a square of `fraction` of the plate, centred on (cx, cy) in 0..1. */
  cropAt(fraction, cx, cy) {
    const s = this.size;
    const w = Math.max(8, Math.round(s * fraction));
    const x0 = Math.max(0, Math.min(s - w, Math.round(cx * s - w / 2)));
    const y0 = Math.max(0, Math.min(s - w, Math.round(cy * s - w / 2)));
    const out = new Float32Array(w * w * 3);
    for (let y = 0; y < w; y++) {
      for (let x = 0; x < w; x++) {
        const si = ((y0 + y) * s + (x0 + x)) * 3;
        const di = (y * w + x) * 3;
        out[di] = this.data[si];
        out[di + 1] = this.data[si + 1];
        out[di + 2] = this.data[si + 2];
      }
    }
    this.data = out;
    this.size = w;
    this.alpha = null;
    return this.resample(s);
  }

  /**
   * Crop to whichever region of the plate looks most like a material.
   *
   * Image models compose. Asked for a paving texture they return one dramatic
   * ring of cobbles in the middle of the frame, and cropping the centre keeps
   * exactly the part that is least usable — a radially symmetric plate tiles
   * into a kaleidoscope. But the *corners* of that same image are usually
   * honest, undifferentiated material.
   *
   * So try several windows and keep the flattest one, scoring each by the
   * variance of its heavily blurred luminance. That measures large-scale
   * structure, which is precisely what separates a photograph of a subject
   * from a swatch of a surface: a good material has detail everywhere and
   * composition nowhere.
   */
  cropUniform(fraction = 0.55) {
    const candidates = [
      [0.5, 0.5], [0.26, 0.26], [0.74, 0.26], [0.26, 0.74], [0.74, 0.74],
      [0.5, 0.24], [0.5, 0.76], [0.24, 0.5], [0.76, 0.5],
    ];
    let best = null;
    for (const [cx, cy] of candidates) {
      const probe = new Plate(this.size, this.seed);
      probe.data = Float32Array.from(this.data);
      probe.cropAt(fraction, cx, cy);
      // Radiality dominates: a window whose detail all points at one spot is
      // unusable however evenly lit it is. Composition breaks the ties.
      const score = probe.radialityScore() + probe.compositionScore() * 8;
      if (!best || score < best.score) best = { cx, cy, score };
    }
    return this.cropAt(fraction, best.cx, best.cy);
  }

  /**
   * How much *composition* is left in the plate, as opposed to material.
   *
   * A surface has detail everywhere and structure nowhere; a photograph of a
   * subject has a bright middle, a dark corner, or a vanishing point. Blurring
   * hard and measuring what survives separates the two, because only
   * large-scale structure survives a heavy blur.
   *
   * Returns roughly 0.000–0.05. Under about 0.004 is a usable material; a
   * centred subject or a perspective field scores several times that.
   */
  compositionScore() {
    const probe = new Plate(this.size, this.seed);
    probe.data = Float32Array.from(this.data);
    probe.resample(64);
    probe.blur(7, 2);
    let mean = 0;
    const lum = new Float64Array(64 * 64);
    for (let i = 0; i < lum.length; i++) {
      lum[i] = (probe.data[i * 3] + probe.data[i * 3 + 1] + probe.data[i * 3 + 2]) / 3;
      mean += lum[i];
    }
    mean /= lum.length;
    let variance = 0;
    for (const l of lum) variance += (l - mean) * (l - mean);
    return variance / lum.length;
  }

  /**
   * How radial the plate's detail is — the number that actually catches a
   * generated "material" that is really a photograph of a subject.
   *
   * `compositionScore` measures brightness structure, and de-lighting removes
   * that, so a starburst field of grass converging on a vanishing point can
   * score better than a genuinely flat swatch. What gives it away is not
   * brightness but *orientation*: every blade points at the same spot. So take
   * the image gradient at each pixel and compare its direction with the
   * direction out from the centre. If those agree far more often than chance,
   * the plate has a vanishing point in it and will tile into a kaleidoscope.
   *
   * Doubling the angle before averaging makes the measure blind to sign, so a
   * streak pointing inward counts the same as one pointing outward. Returns
   * 0 for isotropic detail, 1 for perfectly radial.
   */
  radialityScore(cx = 0.5, cy = 0.5) {
    const probe = new Plate(this.size, this.seed);
    probe.data = Float32Array.from(this.data);
    probe.resample(128);
    probe.blur(1, 1);
    const n = 128;
    const ox = cx * (n - 1), oy = cy * (n - 1);
    const lum = new Float64Array(n * n);
    for (let i = 0; i < n * n; i++) {
      lum[i] = (probe.data[i * 3] + probe.data[i * 3 + 1] + probe.data[i * 3 + 2]) / 3;
    }
    let sx = 0, sy = 0, total = 0;
    for (let y = 1; y < n - 1; y++) {
      for (let x = 1; x < n - 1; x++) {
        const gx = lum[y * n + x + 1] - lum[y * n + x - 1];
        const gy = lum[(y + 1) * n + x] - lum[(y - 1) * n + x];
        const mag = Math.hypot(gx, gy);
        if (mag < 1e-4) continue;
        const dx = x - ox, dy = y - oy;
        const r = Math.hypot(dx, dy);
        if (r < n * 0.08) continue;          // the very centre has no direction
        // Angle between the gradient and the outward radial, doubled so that
        // opposite directions are treated as the same orientation.
        const delta = Math.atan2(gy, gx) - Math.atan2(dy, dx);
        sx += Math.cos(2 * delta) * mag;
        sy += Math.sin(2 * delta) * mag;
        total += mag;
      }
    }
    return total > 0 ? Math.hypot(sx, sy) / total : 0;
  }

  /**
   * The overall "is this a material or a picture" score, and the number the
   * build actually decides on.
   *
   * `radialityScore` only sees a vanishing point it is looking straight at, so
   * a starburst sitting off to one side scores clean. Sampling five centres
   * and keeping the worst closes that blind spot. Composition is folded in at
   * a weight that puts the two terms on a comparable scale.
   *
   * Lower is better. Authored plates land around 0.05-0.2.
   */
  structureScore() {
    let worst = 0;
    for (const [cx, cy] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
      worst = Math.max(worst, this.radialityScore(cx, cy));
    }
    return worst + this.compositionScore() * 8;
  }

  /**
   * Bring the plate's overall lightness to a target.
   *
   * De-lighting removes *gradients* but preserves the mean, so a material the
   * model happened to photograph in shade stays in shade — and a set where
   * bark is nearly black next to bright sand reads as a pile of unrelated
   * photographs, which is exactly the failure this pipeline exists to avoid.
   *
   * Applied as a gamma rather than a scale, so nothing clips: midtones move,
   * black stays black and white stays white.
   */
  normaliseExposure(target = 0.46) {
    const s = this.size;
    let mean = 0;
    for (let i = 0; i < s * s; i++) {
      mean += (this.data[i * 3] + this.data[i * 3 + 1] + this.data[i * 3 + 2]) / 3;
    }
    mean /= s * s;
    if (mean < 1e-3 || Math.abs(mean - target) < 0.01) return this;

    const gamma = Math.log(target) / Math.log(mean);
    const g = Math.max(0.35, Math.min(2.8, gamma));
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = Math.pow(clamp01(this.data[i]), g);
    }
    return this;
  }

  /**
   * How much fine detail the plate carries.
   *
   * The companion to `structureScore`, and necessary because that number
   * alone picks badly: a photograph of a flat green field has no composition
   * in it whatsoever and scores beautifully, while being useless as grass.
   * Mean gradient magnitude at full resolution measures the opposite thing —
   * whether there is any material *in* the material.
   *
   * Higher is better. A good swatch lands around 0.03-0.10; featureless mush
   * comes in under 0.015.
   */
  detailScore() {
    const s = this.size;
    const d = this.data;
    let total = 0;
    for (let y = 1; y < s - 1; y += 2) {
      for (let x = 1; x < s - 1; x += 2) {
        const i = (y * s + x) * 3;
        const l = (v) => (d[v] + d[v + 1] + d[v + 2]) / 3;
        const gx = l(i + 3) - l(i - 3);
        const gy = l(i + s * 3) - l(i - s * 3);
        total += Math.hypot(gx, gy);
      }
    }
    return total / (((s - 2) / 2) * ((s - 2) / 2));
  }

  /**
   * Divide out low-frequency luminance.
   *
   * Generated plates almost always arrive with lighting baked in — a vignette,
   * a soft gradient, a cast shadow from a light source that does not exist in
   * our scene. On a 3D surface that reads instantly as wrong, because the
   * engine is also lighting the same geometry and the two disagree. Dividing
   * by a heavily blurred copy of the plate's own luminance flattens all of it
   * while leaving the fine detail, which is the part worth keeping.
   *
   * `strength` 1 removes the gradient entirely; lower values leave some, which
   * suits materials that genuinely have large-scale tone variation.
   */
  deLight(strength = 0.9, radius = null) {
    const s = this.size;
    const r = radius ?? Math.max(8, Math.round(s * 0.18));

    // Blur a copy to get the low-frequency term.
    const low = new Plate(s, this.seed);
    low.data = Float32Array.from(this.data);
    low.blur(r, 2);

    let mean = 0;
    for (let i = 0; i < s * s; i++) {
      mean += (low.data[i * 3] + low.data[i * 3 + 1] + low.data[i * 3 + 2]) / 3;
    }
    mean /= s * s;
    if (mean < 1e-4) return this;

    for (let i = 0; i < s * s; i++) {
      const l = (low.data[i * 3] + low.data[i * 3 + 1] + low.data[i * 3 + 2]) / 3;
      // Clamp the correction so a near-black region cannot explode.
      const gain = Math.min(2.2, Math.max(0.45, mean / Math.max(l, 1e-3)));
      const k = 1 + (gain - 1) * strength;
      for (let c = 0; c < 3; c++) {
        this.data[i * 3 + c] = clamp01(this.data[i * 3 + c] * k);
      }
    }
    return this;
  }

  /**
   * Force an arbitrary image to tile. Used on externally generated plates,
   * which never tile no matter how firmly the prompt asks.
   *
   * Two steps, and the order is the whole trick:
   *
   *   1. Offset the plate by half in both axes. The border pixels now meet in
   *      the middle, so the outer edges wrap perfectly and the only remaining
   *      discontinuity is the cross through the centre — which, unlike the
   *      border, is somewhere we are allowed to paint.
   *   2. Heal that cross by averaging each side with its reflection in the
   *      seam. Reflection is what makes this exact rather than approximate:
   *      the two columns either side of the join both resolve to the same
   *      average, so the join is continuous by construction. The weight
   *      tapers to zero within `band`, so no mirror symmetry is visible more
   *      than a few percent of the plate away from the centre.
   */
  makeSeamless(blend = 0.16) {
    const s = this.size;
    const half = s >> 1;
    const band = Math.max(2, Math.round(s * blend));

    // 1. Offset by half, wrapping.
    const src = Float32Array.from(this.data);
    for (let y = 0; y < s; y++) {
      const sy = (y + half) % s;
      for (let x = 0; x < s; x++) {
        const sx = (x + half) % s;
        const d = (y * s + x) * 3;
        const o = (sy * s + sx) * 3;
        this.data[d] = src[o];
        this.data[d + 1] = src[o + 1];
        this.data[d + 2] = src[o + 2];
      }
    }

    // 2. Heal the centre cross, one axis at a time.
    //
    // Patch it with material lifted from elsewhere in the same plate rather
    // than with a reflection. Reflecting is exact but it makes the seam into
    // an axis of symmetry, and on any texture with structure — brick courses,
    // planks, tiles — a kaleidoscope is far more obvious than the seam was.
    //
    // The patch is the plate shifted a quarter across and a third down: same
    // material, decorrelated content, and its own centre cross lands well
    // outside the band being repaired. Blending in with a window that reaches
    // 1 exactly on the join and 0 at the band edge means the discontinuity is
    // multiplied by zero where it lives, and both fields are smooth
    // everywhere else — so the result is continuous without being symmetric.
    const healAxis = (vertical) => {
      const cur = Float32Array.from(this.data);
      const px = (s >> 2), py = Math.round(s / 3);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const c = vertical ? x : y;
          const d = Math.abs(c - half + 0.5);
          if (d > band) continue;
          const w = 1 - smoothstep(0, band, d);
          const sx = (x + px) % s;
          const sy = (y + py) % s;
          const i = (y * s + x) * 3;
          const j = (sy * s + sx) * 3;
          this.data[i] = cur[i] * (1 - w) + cur[j] * w;
          this.data[i + 1] = cur[i + 1] * (1 - w) + cur[j + 1] * w;
          this.data[i + 2] = cur[i + 2] * (1 - w) + cur[j + 2] * w;
        }
      }
    };
    healAxis(true);
    healAxis(false);
    return this;
  }
}
