/**
 * Engine-glue parity: palette, input bindings, easing curves and the scheduler.
 *
 *   node tools/glue-parity.mjs
 *
 * `data-parity.mjs` fingerprints the exported tables by their *numbers*, which is
 * exactly the wrong instrument for two of these: a palette is two hundred hex
 * strings and a binding table is a list of key names, and both would sail through
 * a numeric check while being wrong. So they are compared as what they are.
 *
 * What is actually being tested, in each case:
 *
 * - **Palette** — not that the ramps crossed intact (the exporter copies them),
 *   but that `ramp_hex` blends and rounds identically. Sampling a five-step ramp
 *   at 0.61 is a lerp between two hex values followed by a round and a clamp, and
 *   two languages disagreeing about `round(128.5)` produces a palette that is
 *   subtly off in the mid-tones only.
 * - **Input** — that every binding *resolved*. A `KeyboardEvent.code` with no
 *   Godot equivalent is otherwise a control that silently does nothing, and the
 *   gamepad numbers are actively misleading: the web spec's shoulder buttons are
 *   Godot's Back and Guide. The comparison is on button *names* for that reason.
 * - **Easing** — that the curves are the same curves. `snap` overshoots to 1.019
 *   and settles; a version that does not makes every menu feel slightly dead.
 * - **Scheduler** — timing behaviour, tick by tick. Both sides are driven with
 *   fixed deltas, so "finished on the seventh tick of 0.1s" is an assertion. This
 *   is where the port and the reference had a genuine one-tick disagreement: a
 *   JavaScript generator does nothing until first stepped, while calling a
 *   GDScript lambda runs it, so the port defers the body to the first tick.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RAMPS, INK, PAPER, UI, ELEMENT_COLOR, rampAt, hexToRgb, rgbToHex, flatPalette }
  from '../src/engine/palette.js';
import { ACTIONS, DEFAULT_BINDINGS, PAD_BUTTONS } from '../src/engine/input.js';
import { Scheduler, EASE, wait, frames, until, tween } from '../src/engine/scheduler.js';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const say = (s = '') => console.log(s);

const RAMP_SAMPLES = [0, 0.13, 0.25, 0.5, 0.61, 0.75, 0.99, 1];
const EASE_SAMPLES = [0, 0.1, 0.25, 0.33, 0.5, 0.66, 0.75, 0.9, 1];
const HEX_ROUND_TRIP = ['#14121b', '#efe8db', '#ff7a2f', '#000000', '#ffffff', '#3fc6d6'];
const round6 = (n) => Number(n.toFixed(6));

// --- what Godot will call these keys ---------------------------------------
// Written here independently of the port's table so the two are a cross-check
// rather than a copy. `ShiftLeft` and `ShiftRight` both land on `Shift`: Godot's
// keycodes do not distinguish the two, so the reference's separate bindings
// collapse — which is why `run` ends up with one key event and not two.
const KEY_LABELS = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Enter: 'Enter', Space: 'Space', Escape: 'Escape', Backspace: 'Backspace', Tab: 'Tab',
  ShiftLeft: 'Shift', ShiftRight: 'Shift',
  BracketLeft: 'BracketLeft', BracketRight: 'BracketRight',
};
const keyLabel = (code) => KEY_LABELS[code] ?? (code.startsWith('Key') ? code.slice(3) : null);

// W3C standard gamepad index → the name of the control. Godot's `JoyButton`
// enum uses different *numbers* for several of these, which is the entire reason
// this check exists.
const PAD_NAMES = {
  0: 'A', 1: 'B', 2: 'X', 3: 'Y',
  4: 'LeftShoulder', 5: 'RightShoulder',
  6: 'LeftTrigger', 7: 'RightTrigger',
  8: 'Back', 9: 'Start', 10: 'LeftStick', 11: 'RightStick',
  12: 'DpadUp', 13: 'DpadDown', 14: 'DpadLeft', 15: 'DpadRight',
};
const AXIS_INDICES = new Set([6, 7]);

function referencePalette() {
  const names = Object.keys(RAMPS).sort();
  const samples = {};
  for (const name of names) samples[name] = RAMP_SAMPLES.map((t) => rampAt(name, t));
  const roundTrips = {};
  for (const hex of HEX_ROUND_TRIP) {
    const rgb = hexToRgb(hex);
    roundTrips[hex] = { rgb, back: rgbToHex(rgb[0], rgb[1], rgb[2]) };
  }
  const flat = flatPalette();
  return {
    ramp_names: names,
    ramp_values: RAMPS,
    samples,
    round_trips: roundTrips,
    edges: [rgbToHex(-40, 0.4, 0.5), rgbToHex(255.5, 300, 254.5), rgbToHex(127.5, 128.5, 1.5)],
    flat_size: flat.length,
    flat_first: flat[0],
    flat_last: flat[flat.length - 1],
    ink: INK,
    paper: PAPER,
    ui: UI,
    element: ELEMENT_COLOR,
  };
}

function referenceInput() {
  const out = {};
  for (const action of ACTIONS) {
    const labels = [];
    for (const code of DEFAULT_BINDINGS[action] ?? []) {
      const label = keyLabel(code);
      if (label === null) throw new Error(`no Godot key name for ${code} (${action})`);
      if (!labels.includes(label)) labels.push(label);
    }
    const indices = PAD_BUTTONS[action] ?? [];
    const buttons = indices.filter((i) => !AXIS_INDICES.has(i)).map((i) => PAD_NAMES[i]);
    const axes = indices.filter((i) => AXIS_INDICES.has(i)).map((i) => PAD_NAMES[i]);
    out[action] = {
      keys: labels,
      buttons,
      axes,
      // Godot collapses identical events, so the count follows the deduplicated
      // labels rather than the raw binding list.
      events: labels.length + buttons.length + axes.length,
      deadzone: axes.length ? 0.5 : 0.45,
    };
  }
  return out;
}

function referenceEase() {
  const names = {
    linear: 'linear', quadIn: 'quadIn', quadOut: 'quadOut', quadInOut: 'quadInOut',
    cubicIn: 'cubicIn', cubicOut: 'cubicOut', cubicInOut: 'cubicInOut',
    expoOut: 'expoOut', expoIn: 'expoIn', backOut: 'backOut', backIn: 'backIn',
    elasticOut: 'elasticOut', bounceOut: 'bounceOut', snap: 'snap',
  };
  const out = {};
  for (const name of Object.keys(names)) {
    out[name] = EASE_SAMPLES.map((t) => round6(EASE[name](t)));
  }
  return out;
}

/** The same timing cases the probe drives, with the same deltas. */
function referenceScheduler() {
  const out = {};

  let sched = new Scheduler();
  const order = [];
  const waiter = sched.run(function* () { yield wait(0.5); order.push('done'); }, 'wait');
  let finishedOn = -1;
  for (let tick = 0; tick < 10; tick++) {
    sched.update(0.1);
    if (waiter.done && finishedOn < 0) finishedOn = tick + 1;
  }
  out.wait_finished_on_tick = finishedOn;

  sched = new Scheduler();
  const stamps = [];
  const carried = sched.run(function* () {
    yield wait(0.25);
    stamps.push('first');
    yield wait(0.25);
    stamps.push('second');
  }, 'carry');
  sched.update(0.3);
  out.carry_after_one_tick = [...stamps];
  sched.update(0.3);
  out.carry_after_two_ticks = [...stamps];
  out.carry_done = carried.done;

  sched = new Scheduler();
  const framed = sched.run(function* () { yield frames(3); }, 'frames');
  let framesOn = -1;
  for (let tick = 0; tick < 6; tick++) {
    sched.update(0.016);
    if (framed.done && framesOn < 0) framesOn = tick + 1;
  }
  out.frames_finished_on_tick = framesOn;

  sched = new Scheduler();
  const gate = { open: false };
  const gated = sched.run(function* () { yield until(() => gate.open); }, 'until');
  sched.update(0.1);
  out.until_before_open = gated.done;
  gate.open = true;
  sched.update(0.1);
  out.until_after_open = gated.done;

  sched = new Scheduler();
  const values = [];
  sched.run(function* () {
    yield* tween(0, 10, 0.5, (v) => values.push(round6(v)), EASE.linear);
  }, 'tween');
  for (let tick = 0; tick < 6; tick++) sched.update(0.1);
  out.tween_values = values;

  sched = new Scheduler();
  const drained = sched.run(function* () {
    yield wait(0);
    yield wait(0);
    yield wait(0);
  }, 'drain');
  sched.update(0.1);
  out.zero_waits_done_in_one_tick = drained.done;

  sched = new Scheduler();
  sched.timeScale = 2;
  const fast = sched.run(function* () { yield wait(1); }, 'fast');
  let fastOn = -1;
  for (let tick = 0; tick < 12; tick++) {
    sched.update(0.1);
    if (fast.done && fastOn < 0) fastOn = tick + 1;
  }
  out.time_scale_2_finished_on_tick = fastOn;

  // The reference has no `paused` flag; a zero time scale is the same statement,
  // and the port's flag is compared against it rather than against nothing.
  sched = new Scheduler();
  sched.timeScale = 0;
  const held = sched.run(function* () { yield wait(0.1); }, 'paused');
  for (let tick = 0; tick < 10; tick++) sched.update(0.1);
  out.paused_blocks_progress = !held.done;
  sched.timeScale = 1;
  sched.update(0.1);
  out.unpaused_resumes = held.done;

  sched = new Scheduler();
  const steps = { count: 0 };
  const doomed = sched.run(function* () {
    for (;;) {
      yield wait(0.1);
      steps.count++;
    }
  }, 'doomed');
  sched.update(0.1);
  sched.update(0.1);
  out.steps_before_cancel = steps.count;
  doomed.cancel();
  for (let tick = 0; tick < 5; tick++) sched.update(0.1);
  out.steps_after_cancel = steps.count;
  out.cancelled_flag = doomed.done;
  out.routines_left = sched.routines.length;

  sched = new Scheduler();
  const tagged = { count: 0 };
  sched.run(function* () {
    for (;;) {
      yield wait(0.1);
      tagged.count++;
    }
  }, 'battle-action');
  sched.update(0.1);
  sched.cancelTag('battle-action');
  sched.update(0.1);
  sched.update(0.1);
  out.cancel_tag_stops_at = tagged.count;
  out.busy_after_cancel_tag = sched.busy;
  return out;
}

const GODOT = process.env.GODOT ?? 'godot';
let ported;
try {
  const raw = execFileSync(GODOT, [
    '--headless', '--path', path.join(root, 'godot'),
    '--script', 'res://tools/glue_probe.gd',
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const start = raw.indexOf('{"ease"');
  if (start < 0) throw new Error(`no transcript in the probe output:\n${raw.slice(-800)}`);
  ported = JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1));
} catch (err) {
  say('\x1b[31mFAIL\x1b[0m — could not run the Godot probe.');
  say(`  ${String(err.message).split('\n').slice(0, 6).join('\n  ')}`);
  say('  Set GODOT=/path/to/godot if it is not on PATH.');
  process.exit(1);
}

say('\x1b[1mEngine glue: the Godot port against the reference implementation\x1b[0m');
say('─'.repeat(64));

const failures = [];
let compared = 0;

/** Walk two values together and report the first difference at each leaf. */
function compare(where, expected, actual) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      failures.push(`${where}: expected a list of ${expected.length}, got ${JSON.stringify(actual)}`);
      return;
    }
    if (expected.length !== actual.length) {
      failures.push(`${where}: ${actual.length} entries, expected ${expected.length}`);
      return;
    }
    expected.forEach((value, i) => compare(`${where}[${i}]`, value, actual[i]));
    return;
  }
  if (expected && typeof expected === 'object') {
    const keys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual ?? {}).sort();
    const missing = keys.filter((k) => !actualKeys.includes(k));
    const extra = actualKeys.filter((k) => !keys.includes(k));
    if (missing.length) failures.push(`${where}: the port is missing ${missing.join(', ')}`);
    if (extra.length) failures.push(`${where}: the port has extra ${extra.join(', ')}`);
    for (const key of keys.filter((k) => actualKeys.includes(k))) {
      compare(`${where}.${key}`, expected[key], actual[key]);
    }
    return;
  }
  compared++;
  // Floats within a tolerance rather than on equality of their rounded form.
  // `backOut(0.5)` is 1.0876975 exactly halfway, and JavaScript's `toFixed` and
  // Godot's `snappedf` land on either side of it — a disagreement about the
  // rounding boundary, not about the curve. Anything genuinely wrong here is
  // wrong by far more than this: the `elasticOut` period bug this check found
  // was off by 0.2.
  // Compared as integer millionths, allowing a difference of one: both sides
  // already rounded to six decimals, so one unit in the last place is the most a
  // rounding boundary can produce, and expressing the tolerance in integers
  // avoids arguing with floating point about whether 1e-6 is 1e-6.
  const same = typeof expected === 'number' && typeof actual === 'number'
    ? Math.abs(Math.round(expected * 1e6) - Math.round(actual * 1e6)) <= 1
    : expected === actual;
  if (!same) {
    failures.push(`${where}: port ${JSON.stringify(actual)}, reference ${JSON.stringify(expected)}`);
  }
}

const sections = [
  ['palette', referencePalette()],
  ['input', referenceInput()],
  ['ease', referenceEase()],
  ['scheduler', referenceScheduler()],
];

for (const [name, expected] of sections) {
  const before = failures.length;
  const countBefore = compared;
  compare(name, expected, ported[name]);
  const bad = failures.length - before;
  const mark = bad ? `\x1b[31m${bad} differ\x1b[0m` : '\x1b[32mall agree\x1b[0m';
  say(`  ${name.padEnd(11)} ${String(compared - countBefore).padStart(5)} values  ${mark}`);
}

say();
if (failures.length) {
  say('\x1b[31mFAIL\x1b[0m — the glue does not match:');
  for (const line of failures.slice(0, 14)) say(`  ${line}`);
  if (failures.length > 14) say(`  … and ${failures.length - 14} more`);
  process.exit(1);
}
say(`\x1b[32mOK\x1b[0m — ${compared.toLocaleString()} values across palette, input, easing and `
  + 'scheduler timing, and the port agrees on every one.');
