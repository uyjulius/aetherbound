/**
 * Deterministic RNG.
 *
 * Every random decision in the game routes through a named stream so that
 * battles, encounters and drops can be replayed exactly from a save. Nothing
 * in the *world* is randomly generated — this is for combat variance, chest
 * drops and flavour only.
 */

/** xoshiro128** — fast, small state, good distribution. */
export class RNG {
  constructor(seed = 0x2f6e2b1) {
    this.seed(seed);
  }

  seed(n) {
    // splitmix32 to expand a single integer into 128 bits of state.
    let x = n >>> 0;
    const next = () => {
      x = (x + 0x9e3779b9) >>> 0;
      let z = x;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
      return (z ^ (z >>> 15)) >>> 0;
    };
    this.s0 = next();
    this.s1 = next();
    this.s2 = next();
    this.s3 = next();
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) this.s0 = 1;
    return this;
  }

  /** Raw 32-bit unsigned. */
  u32() {
    const rotl = (x, k) => ((x << k) | (x >>> (32 - k))) >>> 0;
    const result = Math.imul(rotl(Math.imul(this.s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = rotl(this.s3, 11);
    return result;
  }

  /** Float in [0,1). */
  next() {
    return this.u32() / 4294967296;
  }

  /** Integer in [0, n). */
  int(n) {
    return n <= 0 ? 0 : this.u32() % n;
  }

  /** Integer in [lo, hi] inclusive. */
  range(lo, hi) {
    return lo + this.int(hi - lo + 1);
  }

  /** Float in [lo, hi). */
  float(lo, hi) {
    return lo + this.next() * (hi - lo);
  }

  /** True with probability p (0..1). */
  chance(p) {
    return this.next() < p;
  }

  /** True with probability n/256 — the classic SNES-style roll. */
  chance256(n) {
    return this.int(256) < n;
  }

  pick(arr) {
    return arr[this.int(arr.length)];
  }

  /** Weighted pick. `entries` is [{weight, ...}] or [[weight, value]]. */
  weighted(entries) {
    let total = 0;
    for (const e of entries) total += Array.isArray(e) ? e[0] : e.weight;
    let roll = this.next() * total;
    for (const e of entries) {
      const w = Array.isArray(e) ? e[0] : e.weight;
      roll -= w;
      if (roll <= 0) return Array.isArray(e) ? e[1] : e;
    }
    const last = entries[entries.length - 1];
    return Array.isArray(last) ? last[1] : last;
  }

  /** In-place Fisher-Yates. */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getState() {
    return [this.s0, this.s1, this.s2, this.s3];
  }

  setState(s) {
    [this.s0, this.s1, this.s2, this.s3] = s;
    return this;
  }
}

/** Named global streams. Keeps combat variance independent of VFX jitter. */
export const rng = {
  battle: new RNG(0x51a3c7),
  encounter: new RNG(0x9d2f11),
  loot: new RNG(0x7c40b3),
  world: new RNG(0x33ba9e),
  fx: new RNG(Date.now() & 0x7fffffff), // cosmetic only, never saved
};

export function serializeRng() {
  return {
    battle: rng.battle.getState(),
    encounter: rng.encounter.getState(),
    loot: rng.loot.getState(),
    world: rng.world.getState(),
  };
}

export function deserializeRng(data) {
  if (!data) return;
  for (const k of ['battle', 'encounter', 'loot', 'world']) {
    if (data[k]) rng[k].setState(data[k]);
  }
}
