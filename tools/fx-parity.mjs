/**
 * Effects parity: the port asks for the same effect the reference asks for.
 *
 *   node tools/fx-parity.mjs
 *
 * The oracle is the reference's own `SPELL_FX`, run here through the reference's own
 * `Scheduler` — not an approximation of it. `wait(seconds)` in `src/engine/scheduler.js`
 * yields a `{kind: 'wait', seconds}` descriptor and it is `Coroutine.step` that blocks for
 * that many frames; a loop that just calls `gen.next(DT)` until done resumes after a single
 * step regardless of how long the wait was, which collapses every pause to one tick. Driven
 * naively, fire measures 57 ticks; driven through `Scheduler` it measures 75, matching what
 * the port (and the game) actually produce. Effects with no `wait` at all — bolt, earth,
 * heal, physical — come out identical either way, which is the control that proves the cause.
 * So this harness imports `Scheduler` and steps it exactly the way `Coroutine.step` would in
 * the running game, on the reference's own code, with no GL context needed — Three.js
 * geometry construction is pure typed arrays. There is no transcription to drift out of date.
 *
 * What is compared is the *emission transcript*: every burst, ring, column and implode with
 * all of its parameters, every shake and flash, every mesh effect by kind and colour, in
 * order, plus the number of ticks the whole thing takes at a fixed 1/60. Those numbers are the
 * authored shape of the spell — 52 shards gathering for 0.52s and then 64 shattering outward
 * at speed 9 with negative gravity is what "ice" means, and one wrong figure is a different
 * spell that still looks like a spell.
 *
 * What is *not* compared is where any individual particle went. The emitters randomise, and
 * they must: a bolt should jag differently every cast. `fx_probe.gd` is the half that checks
 * the particles actually moved; this half checks they were asked for correctly. Neither is
 * sufficient alone — on 20 August a transcript harness passed 124 scenes while a dozen
 * handlers did nothing at all.
 *
 * Mesh effects are logged by kind and colour without positions, because `bolt` picks its sky
 * point at random and a position would differ between two runs of the same build.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { SPELL_FX } from '../src/fx/spellfx.js';
import { Scheduler } from '../src/engine/scheduler.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const GODOT = process.env.GODOT ?? 'godot';
const DT = 1 / 60;
const ELEMENTS = ['fire', 'ice', 'bolt', 'water', 'wind', 'earth',
  'poison', 'holy', 'shadow', 'aether', 'heal', 'physical'];

const say = (s = '') => console.log(s);
const failures = [];
let compared = 0;
const fail = (line) => { if (failures.length < 20) failures.push(line); };

/** Millionths, so two builds that print a float differently still agree. */
const q = (n) => Math.round(Number(n) * 1e6);

/**
 * Record what the reference asks for, by handing its coroutines a context that only listens.
 *
 * The reference's effects call `ctx.particles.<emitter>(pos, options)` with an options object,
 * `ctx.shake?.()` / `ctx.flash?.()` optionally, and build meshes through the imported
 * builders. The mesh calls cannot be intercepted through the context — they are direct
 * imports — so they are counted from the scene graph instead: every object the effect adds is
 * one mesh effect, identified by what it is made of.
 *
 * Driven through `Scheduler`, the reference's own driver: `SPELL_FX[element](ctx, pos)` is a
 * generator object (the entries are `*fire(ctx, pos) {...}` etc.), which is exactly what
 * `Scheduler.run(genOrFn, tag)` accepts without wrapping in a function — see its
 * `typeof genOrFn === 'function' ? genOrFn() : genOrFn` guard in `src/engine/scheduler.js`.
 * `sched.update(DT)` advances every routine's `Coroutine.step`, which is what turns a `wait`
 * descriptor into a real number of blocked ticks instead of one.
 */
function recordReference(element) {
  const calls = [];
  const scene = new THREE.Scene();
  const add = scene.add.bind(scene);
  scene.add = (...objects) => {
    for (const object of objects) {
      let kind;
      if (object.userData.spin) kind = 'circle';
      else if (object.isGroup) kind = 'bolt';
      else if (object.geometry?.type === 'CylinderGeometry') kind = 'pillar';
      else if (object.geometry?.type === 'RingGeometry' &&
          object.geometry.parameters.thetaLength < Math.PI * 2) kind = 'slash';
      else if (object.geometry?.type === 'RingGeometry') kind = 'shockwave';
      if (!kind) throw new Error(`${element}: unknown mesh effect ${object.type}`);
      const mesh = object.isMesh ? object : object.getObjectByProperty('isMesh', true);
      calls.push(['mesh', kind, `#${mesh.material.color.getHexString()}`]);
    }
    return add(...objects);
  };
  const emitter = (kind, keys) => (pos, opts = {}) =>
    calls.push([kind, ...keys.map((k) => opts[k] ?? null)]);

  const particles = {
    burst: emitter('burst', ['count', 'speed', 'spread', 'life', 'size',
      'color', 'endColor', 'gravity', 'drag', 'up', 'turbulence']),
    ring: emitter('ring', ['count', 'radius', 'speed', 'life', 'size',
      'color', 'endColor', 'gravity', 'drag', 'up']),
    column: emitter('column', ['count', 'radius', 'speed', 'life', 'size',
      'color', 'endColor', 'drag', 'turbulence']),
    implode: emitter('implode', ['count', 'radius', 'life', 'size', 'color', 'endColor']),
    streak: emitter('streak', ['count', 'life', 'size', 'color', 'endColor', 'jitter', 'drag']),
  };
  const ctx = {
    scene, particles,
    shake: (amount, frequency = 2.0) => calls.push(['shake', amount, frequency]),
    flash: (color, strength) => calls.push(['flash', color, strength]),
  };

  const sched = new Scheduler();
  const co = sched.run(SPELL_FX[element](ctx, new THREE.Vector3(0, 1, 0)), element);
  let ticks = 0;
  while (!co.done && ticks < 900) { sched.update(DT); ticks++; }
  return { calls, ticks, done: co.done };
}

/**
 * The reference's defaults, applied where a spell omits an option.
 *
 * The port's `FXContext` takes every parameter explicitly, so a `null` from the reference has
 * to be filled in with the same default the reference's own emitter would have used, or the
 * two sides disagree on numbers neither of them chose. Quoted from `src/fx/particles.js`:
 *   burst(pos, { count = 40, speed = 4, spread = 1, life = 0.8, size = 0.5, color = '#ffffff',
 *     endColor = null, gravity = -2, drag = 1.2, up = 0, turbulence = 0 } = {})
 *   ring(pos, { count = 48, radius = 0.4, speed = 6, life = 0.6, size = 0.45,
 *     color = '#ffffff', endColor = null, gravity = 0, drag = 2.2, up = 0.6 } = {})
 *   column(pos, { count = 50, radius = 0.7, speed = 5, life = 1.0, size = 0.5,
 *     color = '#ffffff', endColor = null, drag = 0.4, turbulence = 1.2 } = {})
 *   implode(pos, { count = 44, radius = 3.2, life = 0.55, size = 0.42,
 *     color = '#ffffff', endColor = null } = {})
 *   streak(from, to, { count = 26, life = 0.45, size = 0.4, color = '#ffffff', endColor = null,
 *     jitter = 0.25, drag = 1.4 } = {})
 */
const DEFAULTS = {
  burst: { count: 40, speed: 4, spread: 1, life: 0.8, size: 0.5, color: '#ffffff',
    endColor: null, gravity: -2, drag: 1.2, up: 0, turbulence: 0 },
  ring: { count: 48, radius: 0.4, speed: 6, life: 0.6, size: 0.45, color: '#ffffff',
    endColor: null, gravity: 0, drag: 2.2, up: 0.6 },
  column: { count: 50, radius: 0.7, speed: 5, life: 1.0, size: 0.5, color: '#ffffff',
    endColor: null, drag: 0.4, turbulence: 1.2 },
  implode: { count: 44, radius: 3.2, life: 0.55, size: 0.42, color: '#ffffff', endColor: null },
  streak: { count: 26, life: 0.45, size: 0.4, color: '#ffffff', endColor: null,
    jitter: 0.25, drag: 1.4 },
};

/** One call in comparable fields. Colours lowercased; numbers in millionths. */
function normalise(call) {
  const [kind, ...args] = call;
  if (kind === 'mesh') return [kind, args[0], String(args[1]).toLowerCase()];
  if (kind === 'shake') return [kind, q(args[0]), q(args[1])];
  if (kind === 'flash') return [kind, String(args[0]).toLowerCase(), q(args[1])];
  const keys = Object.keys(DEFAULTS[kind]);
  const parts = keys.map((key, i) => {
    let v = args[i];
    if (v === null || v === undefined) v = DEFAULTS[kind][key];
    // `endColor` defaults to the start colour inside the reference's `spawn`, not to null.
    if (v === null && key === 'endColor') v = args[keys.indexOf('color')] ?? '#ffffff';
    return typeof v === 'string' ? v.toLowerCase() : q(v);
  });
  return [kind, ...parts];
}

const display = (call) => call ? `${call[0]}(${call.slice(1).join(',')})` : '(none)';
const callsAgree = (a, b) => a?.length === b?.length && a.every((value, i) =>
  typeof value === 'number' && typeof b[i] === 'number'
    ? Math.abs(value - b[i]) <= 1
    : value === b[i]);

say('\x1b[1mEffects parity — the port asks for what the reference asks for\x1b[0m');

const raw = execFileSync(GODOT, [
  '--headless', '--path', path.join(root, 'godot'),
  '--script', 'res://tools/fx_probe.gd', '--', '--record',
], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const line = raw.trim().split('\n').filter((l) => l.trim().startsWith('{')).pop();
if (!line) {
  say('\x1b[31mthe probe printed no transcript\x1b[0m');
  say(raw.slice(-2000));
  process.exit(1);
}
const port = JSON.parse(line);

for (const element of ELEMENTS) {
  const expected = recordReference(element);
  if (!expected.done) { fail(`${element}: the reference never finished`); continue; }
  const actual = port[element];
  if (!actual) { fail(`${element}: the port recorded nothing`); continue; }

  const refCalls = expected.calls.map(normalise);
  const portCalls = actual.calls.map(normalise);

  compared += refCalls.length + 1;
  if (refCalls.length !== portCalls.length) {
    fail(`${element}: ${portCalls.length} emissions, reference has ${refCalls.length}`);
  }
  for (let i = 0; i < Math.max(refCalls.length, portCalls.length); i++) {
    if (!callsAgree(refCalls[i], portCalls[i])) {
      fail(`${element} #${i}:\n    reference ${display(refCalls[i])}\n    port      ${display(portCalls[i])}`);
      break;
    }
  }
  // Duration, in ticks at a fixed 1/60. Ice holds for half a second before it shatters and
  // that pause is the effect; a port that skipped it would emit every identical call.
  if (Math.abs(expected.ticks - actual.ticks) > 1) {
    fail(`${element}: ${actual.ticks} ticks, reference takes ${expected.ticks}`);
  }
}

say();
if (failures.length) {
  for (const line of failures) say(`\x1b[31m✗\x1b[0m ${line}`);
  say(`\n\x1b[31m${failures.length} disagreements\x1b[0m over ${compared} comparisons`);
  process.exit(1);
}
say(`\x1b[32m✓\x1b[0m ${ELEMENTS.length} effects agree, ${compared} comparisons`);
