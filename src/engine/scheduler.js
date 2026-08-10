/**
 * Coroutines and tweens.
 *
 * Cutscenes, battle animations and UI transitions are all written as generator
 * functions that yield small "wait" descriptors. This keeps sequenced logic
 * readable top-to-bottom instead of scattered across callbacks:
 *
 *   yield* moveTo(actor, x, z, 0.6);
 *   yield wait(0.2);
 *   yield* say('Terra', 'It responded to me…');
 */

export const EASE = {
  linear: (t) => t,
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => --t * t * t + 1,
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  expoOut: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoIn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  backOut: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  backIn: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
  elasticOut: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  bounceOut: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  /** Overshoot then settle — good for menu cursors and damage pop-ups. */
  snap: (t) => 1 - Math.pow(1 - t, 4) * Math.cos(t * Math.PI * 1.2),
};

/** Yield this to pause a coroutine for `seconds` of *game* time. */
export function wait(seconds) {
  return { kind: 'wait', seconds };
}

/** Yield this to pause until `predicate()` returns true. */
export function until(predicate) {
  return { kind: 'until', predicate };
}

/** Yield this to pause for a number of rendered frames. */
export function frames(n) {
  return { kind: 'frames', n };
}

/**
 * Yield* this to interpolate a value over time.
 * `apply(v, t)` receives the eased value and the raw 0..1 progress.
 */
export function* tween(from, to, seconds, apply, ease = EASE.quadInOut) {
  if (seconds <= 0) { apply(to, 1); return; }
  let elapsed = 0;
  while (elapsed < seconds) {
    const dt = yield { kind: 'tick' };
    elapsed += dt;
    const t = Math.min(1, elapsed / seconds);
    apply(from + (to - from) * ease(t), t);
  }
  apply(to, 1);
}

/** Yield* this to run a callback every frame for a duration. */
export function* over(seconds, fn, ease = EASE.linear) {
  let elapsed = 0;
  while (elapsed < seconds) {
    const dt = yield { kind: 'tick' };
    elapsed += dt;
    const t = Math.min(1, elapsed / seconds);
    fn(ease(t), dt, t);
  }
}

class Coroutine {
  constructor(gen, tag) {
    this.gen = gen;
    this.tag = tag;
    this.done = false;
    this.result = undefined;
    this.waitTime = 0;
    this.waitFrames = 0;
    this.waitPredicate = null;
    this.paused = false;
    this._resolve = null;
    this.promise = new Promise((res) => { this._resolve = res; });
    this._pendingDt = 0;
  }

  step(dt) {
    if (this.done || this.paused) return;
    if (this.waitTime > 0) {
      this.waitTime -= dt;
      if (this.waitTime > 0) return;
      dt = -this.waitTime; // carry the remainder into this frame
      this.waitTime = 0;
    }
    if (this.waitFrames > 0) {
      this.waitFrames--;
      if (this.waitFrames > 0) return;
    }
    if (this.waitPredicate) {
      if (!this.waitPredicate()) return;
      this.waitPredicate = null;
    }

    // Drain as many non-blocking yields as the generator produces this frame.
    for (let guard = 0; guard < 4096; guard++) {
      let res;
      try {
        res = this.gen.next(dt);
      } catch (err) {
        console.error(`[coroutine:${this.tag}]`, err);
        this.finish(undefined);
        return;
      }
      if (res.done) { this.finish(res.value); return; }
      const y = res.value;
      if (y === undefined || y === null || y.kind === 'tick') return; // one step per frame
      if (y.kind === 'wait') {
        this.waitTime = y.seconds;
        if (this.waitTime > 0) return;
        continue;
      }
      if (y.kind === 'frames') { this.waitFrames = y.n; return; }
      if (y.kind === 'until') {
        if (y.predicate()) continue;
        this.waitPredicate = y.predicate;
        return;
      }
      if (typeof y.then === 'function') {
        // Awaiting a promise: block until it settles.
        let settled = false;
        let value;
        y.then((v) => { settled = true; value = v; }, (e) => { settled = true; value = e; });
        this.waitPredicate = () => settled;
        this._promiseValue = () => value;
        return;
      }
      return;
    }
    console.warn(`[coroutine:${this.tag}] yielded 4096 times without blocking — aborting`);
    this.finish(undefined);
  }

  finish(value) {
    this.done = true;
    this.result = value;
    this._resolve?.(value);
  }

  cancel() {
    if (this.done) return;
    try { this.gen.return?.(undefined); } catch { /* generator already closed */ }
    this.finish(undefined);
  }
}

export class Scheduler {
  constructor() {
    this.routines = [];
    this.timeScale = 1;
  }

  /** Start a generator. Returns a handle whose `.promise` resolves on finish. */
  run(genOrFn, tag = 'anon') {
    const gen = typeof genOrFn === 'function' ? genOrFn() : genOrFn;
    const co = new Coroutine(gen, tag);
    this.routines.push(co);
    return co;
  }

  /** Run and await completion (for use inside another coroutine: `yield* sched.join(x)`). */
  *join(co) {
    yield until(() => co.done);
    return co.result;
  }

  cancelTag(tag) {
    for (const co of this.routines) if (co.tag === tag) co.cancel();
  }

  cancelAll() {
    for (const co of this.routines) co.cancel();
    this.routines.length = 0;
  }

  get busy() {
    return this.routines.some((c) => !c.done);
  }

  update(dt) {
    const scaled = dt * this.timeScale;
    // Iterate over a snapshot: coroutines routinely spawn other coroutines.
    const snapshot = this.routines.slice();
    for (const co of snapshot) co.step(scaled);
    if (this.routines.some((c) => c.done)) {
      this.routines = this.routines.filter((c) => !c.done);
    }
  }
}

/** Global scheduler for cutscenes and world events. */
export const scheduler = new Scheduler();
