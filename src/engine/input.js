/**
 * Input: keyboard + gamepad → a small set of named actions.
 *
 * The whole game only ever asks "is CONFIRM pressed this frame?" — never about
 * raw keys — so remapping and gamepad support come for free.
 */

export const ACTIONS = /** @type {const} */ ([
  'up', 'down', 'left', 'right',
  'confirm', 'cancel', 'menu', 'special',
  'pageLeft', 'pageRight',
  'run', 'start',
]);

export const DEFAULT_BINDINGS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['Enter', 'Space', 'KeyZ'],
  cancel: ['Escape', 'KeyX', 'Backspace'],
  menu: ['KeyC', 'Tab'],
  special: ['KeyV', 'ShiftLeft'],
  pageLeft: ['KeyQ', 'BracketLeft'],
  pageRight: ['KeyE', 'BracketRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  start: ['Enter'],
};

// Standard gamepad mapping (Xbox-ish layout).
const PAD_BUTTONS = {
  confirm: [0],       // A
  cancel: [1],        // B
  menu: [3, 9],       // Y / Start
  special: [2],       // X
  pageLeft: [4],      // LB
  pageRight: [5],     // RB
  run: [6, 7],        // triggers
  start: [9],
  up: [12],
  down: [13],
  left: [14],
  right: [15],
};

const DPAD_DEADZONE = 0.45;

class InputManager {
  constructor() {
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.keyToActions = new Map();
    this.down = new Set();       // actions held
    this.pressed = new Set();    // actions that went down since the last poll
    this.released = new Set();   // actions that came up since the last poll
    // Events arrive asynchronously between frames. They accumulate here and
    // are swapped in at poll time; clearing `pressed` at the top of a frame
    // instead would discard every event that landed since the previous frame,
    // which silently drops roughly half of all button presses.
    this._pendingPressed = new Set();
    this._pendingReleased = new Set();
    this._rawDown = new Set();   // physical keys currently held
    this._repeatAt = new Map();  // action → next auto-repeat timestamp (ms)
    this._padDown = new Set();
    this._anyKeyPressed = false;
    this.enabled = true;
    this.axis = { x: 0, y: 0 };   // analogue stick, -1..1
    this.rebuild();
  }

  rebuild() {
    this.keyToActions.clear();
    for (const [action, keys] of Object.entries(this.bindings)) {
      for (const k of keys) {
        if (!this.keyToActions.has(k)) this.keyToActions.set(k, []);
        this.keyToActions.get(k).push(action);
      }
    }
  }

  attach(target = window) {
    target.addEventListener('keydown', (e) => {
      // Let the browser keep its own shortcuts (devtools, reload, fullscreen).
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      this._rawDown.add(e.code);
      this._anyKeyPressed = true;
      for (const a of this.keyToActions.get(e.code) || []) this._press(a);
    });
    target.addEventListener('keyup', (e) => {
      this._rawDown.delete(e.code);
      for (const a of this.keyToActions.get(e.code) || []) {
        // Only release if no other bound key for this action is still held.
        const stillHeld = (this.bindings[a] || []).some((k) => this._rawDown.has(k));
        if (!stillHeld) this._release(a);
      }
    });
    target.addEventListener('blur', () => this.clear());
    return this;
  }

  _press(action) {
    if (!this.down.has(action)) {
      this.down.add(action);
      this._pendingPressed.add(action);
      this._repeatAt.set(action, performance.now() + 280);
    }
  }

  _release(action) {
    if (this.down.has(action)) {
      this.down.delete(action);
      this._pendingReleased.add(action);
      this._repeatAt.delete(action);
    }
  }

  clear() {
    this._rawDown.clear();
    for (const a of [...this.down]) this._release(a);
  }

  /** Call once per frame, before game logic. */
  poll(now) {
    // Swap in everything that arrived since the last frame.
    const p = this.pressed;
    this.pressed = this._pendingPressed;
    p.clear();
    this._pendingPressed = p;

    const r = this.released;
    this.released = this._pendingReleased;
    r.clear();
    this._pendingReleased = r;

    this._anyKeyPressed = this.pressed.size > 0;
    this._pollGamepad();
    // Auto-repeat for menu navigation: initial delay then rapid fire.
    for (const action of ['up', 'down', 'left', 'right', 'pageLeft', 'pageRight']) {
      if (!this.down.has(action)) continue;
      const at = this._repeatAt.get(action) ?? 0;
      if (now >= at) {
        this.pressed.add(action);
        this._repeatAt.set(action, now + 70);
      }
    }
  }

  _pollGamepad() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const pad = [...pads].find((p) => p && p.connected);
    if (!pad) { this.axis.x = 0; this.axis.y = 0; return; }

    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    this.axis.x = Math.abs(ax) > 0.18 ? ax : 0;
    this.axis.y = Math.abs(ay) > 0.18 ? ay : 0;

    const nowDown = new Set();
    for (const [action, indices] of Object.entries(PAD_BUTTONS)) {
      if (indices.some((i) => pad.buttons[i]?.pressed)) nowDown.add(action);
    }
    // Treat a pushed stick as a d-pad for menu navigation.
    if (this.axis.y < -DPAD_DEADZONE) nowDown.add('up');
    if (this.axis.y > DPAD_DEADZONE) nowDown.add('down');
    if (this.axis.x < -DPAD_DEADZONE) nowDown.add('left');
    if (this.axis.x > DPAD_DEADZONE) nowDown.add('right');

    for (const a of nowDown) if (!this._padDown.has(a)) this._press(a);
    for (const a of this._padDown) {
      if (!nowDown.has(a) && !(this.bindings[a] || []).some((k) => this._rawDown.has(k))) {
        this._release(a);
      }
    }
    this._padDown = nowDown;
  }

  isDown(action) { return this.enabled && this.down.has(action); }
  justPressed(action) { return this.enabled && this.pressed.has(action); }
  justReleased(action) { return this.enabled && this.released.has(action); }
  anyPressed() { return this.enabled && (this.pressed.size > 0 || this._anyKeyPressed); }

  /** Movement vector for field exploration, normalised, y is "forward". */
  moveVector() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = this.axis.x;
    let y = this.axis.y;
    if (x === 0 && y === 0) {
      x = (this.down.has('right') ? 1 : 0) - (this.down.has('left') ? 1 : 0);
      y = (this.down.has('down') ? 1 : 0) - (this.down.has('up') ? 1 : 0);
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }
}

export const input = new InputManager();
