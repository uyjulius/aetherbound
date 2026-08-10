/**
 * Image quilting — building a seamless tile out of an arbitrary photograph.
 *
 * This is the step that makes generated textures usable, and it replaces the
 * whole "ask the model nicely for a tileable image" approach, which does not
 * work and cannot be made to work. Image models compose. Asked for a stone
 * wall they return a building; asked for a macro shot they return one hero
 * stone; asked for an orthophoto they return a field with a vanishing point.
 * All three tile into a kaleidoscope.
 *
 * Quilting sidesteps the argument entirely. Rather than using the image, it
 * uses the image as a *bag of patches*: lay down small overlapping blocks, and
 * for each new block search the source for the patch that best matches what is
 * already committed in the overlap region, then cut between them along the
 * path of least difference. Global composition — the horizon, the vanishing
 * point, the dramatic centred stone — cannot survive being reassembled from
 * 64-pixel tiles, but local material appearance survives perfectly, because
 * every output pixel is a source pixel.
 *
 * Efros & Freeman, "Image Quilting for Texture Synthesis and Transfer" (2001).
 * Two additions here:
 *
 *   - The output is synthesised on a *torus*: the last column of blocks
 *     matches the first, and the last row matches the top, so the result tiles
 *     by construction rather than by a blend applied afterwards.
 *   - Candidate patches are drawn from a shortlist of the best matches rather
 *     than the single best, which stops the synthesiser latching onto one
 *     region of the source and reproducing it in stripes.
 */

import { Plate, clamp01 } from './raster.mjs';

/** Sum of squared differences between two blocks, over a mask of offsets. */
function ssd(src, s, out, o, size, w, offsets) {
  let total = 0;
  for (const [dx, dy] of offsets) {
    const si = (((s.y + dy) * w + (s.x + dx)) * 3);
    const oi = (((o.y + dy) * size + (o.x + dx)) * 3);
    const dr = src[si] - out[oi];
    const dg = src[si + 1] - out[oi + 1];
    const db = src[si + 2] - out[oi + 2];
    total += dr * dr + dg * dg + db * db;
  }
  return total;
}

/**
 * Minimum-error boundary cut through a vertical overlap strip.
 *
 * Returns, for each row, the column at which to switch from the old block to
 * the new one. Straight-line seams are what make naive quilting look like
 * patchwork; letting the seam wander along the darkest path of the difference
 * surface hides it in whatever detail the material already has.
 */
function verticalCut(cost, w, h) {
  const acc = new Float64Array(w * h);
  acc.set(cost.subarray(0, w));
  for (let y = 1; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = acc[(y - 1) * w + x];
      if (x > 0) best = Math.min(best, acc[(y - 1) * w + x - 1]);
      if (x < w - 1) best = Math.min(best, acc[(y - 1) * w + x + 1]);
      acc[y * w + x] = cost[y * w + x] + best;
    }
  }
  const path = new Int32Array(h);
  let x = 0;
  for (let i = 1; i < w; i++) if (acc[(h - 1) * w + i] < acc[(h - 1) * w + x]) x = i;
  path[h - 1] = x;
  for (let y = h - 2; y >= 0; y--) {
    let best = x;
    if (x > 0 && acc[y * w + x - 1] < acc[y * w + best]) best = x - 1;
    if (x < w - 1 && acc[y * w + x + 1] < acc[y * w + best]) best = x + 1;
    x = best;
    path[y] = x;
  }
  return path;
}

/**
 * Synthesise a seamless `size`×`size` tile from `source`.
 *
 * @param {Plate}  source
 * @param {number} size      output edge, in pixels
 * @param {object} opts
 *   block    patch edge; roughly the largest feature that should stay intact
 *   overlap  how much of each patch is matched against its neighbours
 *   tries    how many source positions to sample per placement
 *   shortlist how many of the best matches to choose randomly between
 */
export function quilt(source, size, {
  block = 96, overlap = 24, tries = 260, shortlist = 8, seed = 1,
} = {}) {
  const w = source.size;
  const src = source.data;
  const out = new Plate(size, seed);
  const dst = out.data;
  const rand = out.rand;

  const step = block - overlap;
  const cols = Math.ceil(size / step);
  const rows = Math.ceil(size / step);

  // Offsets describing the overlap regions, built once per block kind.
  const leftMask = [];
  const topMask = [];
  for (let y = 0; y < block; y++) for (let x = 0; x < overlap; x++) leftMask.push([x, y]);
  for (let y = 0; y < overlap; y++) for (let x = 0; x < block; x++) topMask.push([x, y]);

  /** Wrapped write, so blocks that run off the edge land back on the other side. */
  const put = (ox, oy, sx, sy, bw, bh, cutLeft, cutTop) => {
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        // Respect the boundary cuts: inside them, keep what is already there.
        if (cutLeft && x < overlap && x < cutLeft[y]) continue;
        if (cutTop && y < overlap && y < cutTop[x]) continue;
        const dx = (ox + x) % size;
        const dy = (oy + y) % size;
        const si = (((sy + y) % w) * w + ((sx + x) % w)) * 3;
        const di = (dy * size + dx) * 3;
        dst[di] = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
      }
    }
  };

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const ox = bx * step;
      const oy = by * step;
      const first = bx === 0 && by === 0;

      // Which overlaps must match? On a torus the final column and row also
      // have to agree with the first, which is what makes the tile wrap.
      const matchLeft = !first;
      const matchTop = !first && by > 0;

      let picks = [];
      if (first) {
        picks = [{ x: (rand() * (w - block)) | 0, y: (rand() * (w - block)) | 0, e: 0 }];
      } else {
        const scored = [];
        for (let t = 0; t < tries; t++) {
          const sx = (rand() * (w - block)) | 0;
          const sy = (rand() * (w - block)) | 0;
          let e = 0;
          if (matchLeft) e += ssd(src, { x: sx, y: sy }, dst, { x: ox % size, y: oy % size }, size, w, leftMask);
          if (matchTop) e += ssd(src, { x: sx, y: sy }, dst, { x: ox % size, y: oy % size }, size, w, topMask);
          scored.push({ x: sx, y: sy, e });
        }
        scored.sort((a, b) => a.e - b.e);
        picks = scored.slice(0, shortlist);
      }
      const pick = picks[(rand() * picks.length) | 0];

      // Build the seam paths through each overlap strip.
      let cutLeft = null;
      let cutTop = null;
      if (matchLeft) {
        const cost = new Float64Array(overlap * block);
        for (let y = 0; y < block; y++) {
          for (let x = 0; x < overlap; x++) {
            const si = (((pick.y + y) % w) * w + ((pick.x + x) % w)) * 3;
            const di = (((oy + y) % size) * size + ((ox + x) % size)) * 3;
            const dr = src[si] - dst[di], dg = src[si + 1] - dst[di + 1], db = src[si + 2] - dst[di + 2];
            cost[y * overlap + x] = dr * dr + dg * dg + db * db;
          }
        }
        cutLeft = verticalCut(cost, overlap, block);
      }
      if (matchTop) {
        // Transpose and reuse the same solver.
        const cost = new Float64Array(overlap * block);
        for (let x = 0; x < block; x++) {
          for (let y = 0; y < overlap; y++) {
            const si = (((pick.y + y) % w) * w + ((pick.x + x) % w)) * 3;
            const di = (((oy + y) % size) * size + ((ox + x) % size)) * 3;
            const dr = src[si] - dst[di], dg = src[si + 1] - dst[di + 1], db = src[si + 2] - dst[di + 2];
            cost[x * overlap + y] = dr * dr + dg * dg + db * db;
          }
        }
        cutTop = verticalCut(cost, overlap, block);
      }

      put(ox, oy, pick.x, pick.y, block, block, cutLeft, cutTop);
    }
  }

  for (let i = 0; i < dst.length; i++) dst[i] = clamp01(dst[i]);
  return out;
}
