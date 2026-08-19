import { analytics, EV } from '../engine/analytics.js';

/**
 * The on-screen bar exists for people without a keyboard, and nothing else
 * says whether it is being used or ignored. Tracked once per button per
 * session: the raw stream would be thousands of camera nudges.
 */
function track(spec) {
  analytics.once(`control:${spec.id}`, EV.CONTROL_USED, { control: spec.id, action: spec.action ?? null });
}
import { input } from '../engine/input.js';

/**
 * The on-screen control bar.
 *
 * Everything here is a second route to something the keyboard already does —
 * nothing is exclusive to it. That matters for two reasons: a player on a
 * trackpad or a phone can reach the whole game without memorising Q/E/C, and
 * the bar doubles as the game's only visible statement of what the controls
 * are. A player who never touches it still learns from it.
 *
 * The buttons drive input *actions*, not key codes, so a rebound key is
 * automatically reflected here and the labels stay honest.
 */

/**
 * Camera turns are held-to-repeat, so the button follows suit: press and hold
 * to keep rotating. Menu, pause and the two answer buttons are taps.
 */
export const BUTTONS = [
  {
    id: 'cam-left', action: 'pageLeft', hold: true, fieldOnly: true,
    label: 'Turn', hint: 'Q', glyph: 'rotate-left',
  },
  {
    id: 'cam-right', action: 'pageRight', hold: true, fieldOnly: true,
    label: 'Turn', hint: 'E', glyph: 'rotate-right',
  },
  {
    id: 'run', action: 'run', latch: true, fieldOnly: true,
    label: 'Walk', hint: 'Shift', glyph: 'run',
  },
  {
    // Escaping is holding both shoulder buttons for a second — faithful to the
    // source material and completely undiscoverable. It gets a button, shown
    // only when there is something to escape from.
    id: 'flee', action: null, battleOnly: true,
    label: 'Flee', hint: 'Q+E', glyph: 'flee',
  },
  {
    id: 'menu', action: 'menu', label: 'Menu', hint: 'C', glyph: 'menu',
  },
  {
    id: 'pause', action: null, label: 'Pause', hint: 'P', glyph: 'pause',
  },
  {
    id: 'cancel', action: 'cancel', label: 'Back', hint: 'Esc', glyph: 'back',
  },
  {
    id: 'confirm', action: 'confirm', label: 'Talk', hint: 'Enter', glyph: 'confirm',
    primary: true,
  },
];

/** Inline SVG rather than glyph characters, which vary wildly between fonts. */
const GLYPHS = {
  'rotate-left': '<path d="M13 5a7 7 0 1 1-6.6 9.3" /><polyline points="3.2 9.4 6.1 5.2 10.4 7.6" />',
  'rotate-right': '<path d="M11 5a7 7 0 1 0 6.6 9.3" /><polyline points="20.8 9.4 17.9 5.2 13.6 7.6" />',
  menu: '<line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />',
  pause: '<line x1="9" y1="5" x2="9" y2="19" /><line x1="15" y1="5" x2="15" y2="19" />',
  back: '<line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />',
  confirm: '<polyline points="5 12.5 10 17.5 19 6.5" />',
  play: '<polygon points="7 5 19 12 7 19" />',
  // A walking figure and a running one — the same body, leaning.
  walk: '<circle cx="12.5" cy="4.6" r="1.9" /><path d="M12 8.2v5m0 0-2.6 5.4M12 13.2l2.4 5.4M12 9.6 9.2 12M12 9.6l3 1.8" />',
  run: '<circle cx="14" cy="4.6" r="1.9" /><path d="M13.2 8.2 10.6 13l3.2 1.4-1.2 4.6M10.6 13 7 14.2M13.8 10.4l3.4.8M4 8.5h3M3 12h2.6" />',
  flee: '<path d="M14 5h6v6" /><path d="M20 5 12 13" /><path d="M11 6H5.5A1.5 1.5 0 0 0 4 7.5V19h11v-5" />',
  'arrow-up': '<polyline points="6 14 12 8 18 14" />',
  'arrow-down': '<polyline points="6 10 12 16 18 10" />',
  'arrow-left': '<polyline points="14 6 8 12 14 18" />',
  'arrow-right': '<polyline points="10 6 16 12 10 18" />',
};

/**
 * The movement pad, held to walk.
 *
 * These drive the same four input *actions* the keyboard does, through the
 * same virtual press/release path as the camera buttons, so a rebound key
 * changes nothing here and nothing about movement becomes exclusive to the
 * pointer. Field only — the battle is a menu, and a d-pad over it would
 * suggest the party can be walked around mid-fight.
 */
export const DPAD = [
  { id: 'move-up', action: 'up', label: 'Up', hint: 'W', glyph: 'arrow-up', cls: 'dpad-up' },
  { id: 'move-left', action: 'left', label: 'Left', hint: 'A', glyph: 'arrow-left', cls: 'dpad-left' },
  { id: 'move-right', action: 'right', label: 'Right', hint: 'D', glyph: 'arrow-right', cls: 'dpad-right' },
  { id: 'move-down', action: 'down', label: 'Down', hint: 'S', glyph: 'arrow-down', cls: 'dpad-down' },
];

function svg(glyph) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[glyph] ?? ''}</svg>`;
}

export class ControlBar {
  constructor(game) {
    this.game = game;
    this.buttons = new Map();

    const bar = document.createElement('div');
    bar.className = 'control-bar';
    bar.setAttribute('data-clickable', '');

    for (const spec of BUTTONS) {
      const b = document.createElement('button');
      b.className = `control-btn${spec.primary ? ' is-primary' : ''}`;
      b.type = 'button';
      b.dataset.id = spec.id;
      b.setAttribute('data-clickable', '');
      b.setAttribute('aria-label', `${spec.label} (${spec.hint})`);
      b.innerHTML = `${svg(spec.glyph)}<span class="control-label">${spec.label}</span><span class="control-hint">${spec.hint}</span>`;
      this._wire(b, spec);
      bar.appendChild(b);
      this.buttons.set(spec.id, { el: b, spec });
    }

    this.el = bar;
    game.uiRoot.appendChild(bar);

    const pad = document.createElement('div');
    pad.className = 'dpad';
    pad.setAttribute('data-clickable', '');
    for (const spec of DPAD) {
      const b = document.createElement('button');
      b.className = `control-btn ${spec.cls}`;
      b.type = 'button';
      b.dataset.id = spec.id;
      b.setAttribute('data-clickable', '');
      b.setAttribute('aria-label', `${spec.label} (${spec.hint})`);
      b.innerHTML = svg(spec.glyph);
      this._wire(b, { ...spec, hold: true });
      pad.appendChild(b);
      this.buttons.set(spec.id, { el: b, spec: { ...spec, fieldOnly: true } });
    }
    const centre = document.createElement('div');
    centre.className = 'dpad-label';
    centre.textContent = 'MOVE';
    pad.appendChild(centre);
    this.pad = pad;
    game.uiRoot.appendChild(pad);

    // Keyboard pause has to live outside the simulation: `input.poll` only
    // runs while unpaused, so a paused game cannot see its own unpause key.
    this._onKey = (e) => {
      if (e.code === 'KeyP' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) {
        e.preventDefault();
        this.togglePause();
      }
    };
    window.addEventListener('keydown', this._onKey);
  }

  _wire(el, spec) {
    // Every button reports itself once; the branches below only add the
    // behaviour, so a new control can never be added without instrumentation.
    el.addEventListener('pointerdown', () => track(spec));

    if (spec.id === 'pause') {
      el.addEventListener('click', () => this.togglePause());
      return;
    }

    if (spec.id === 'flee') {
      // Holding the button *is* holding both shoulders — the battle already
      // measures a hold, including the decay when you let go, so this feeds
      // the same mechanism rather than inventing a second way to escape.
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture?.(e.pointerId);
        input.virtualPress('pageLeft');
        input.virtualPress('pageRight');
      });
      const stop = () => {
        input.virtualRelease('pageLeft');
        input.virtualRelease('pageRight');
      };
      el.addEventListener('pointerup', stop);
      el.addEventListener('pointercancel', stop);
      el.addEventListener('lostpointercapture', stop);
      return;
    }

    if (spec.latch) {
      el.addEventListener('click', () => {
        input.setLatched(spec.action, !input.isLatched(spec.action));
        this._paintLatch(el, spec);
      });
      return;
    }

    if (spec.hold) {
      // Pointer events cover mouse, touch and pen in one path. Capture keeps
      // the release coming to us even if the finger slides off the button,
      // which would otherwise leave the camera spinning forever.
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture?.(e.pointerId);
        input.virtualPress(spec.action);
      });
      const stop = () => input.virtualRelease(spec.action);
      el.addEventListener('pointerup', stop);
      el.addEventListener('pointercancel', stop);
      el.addEventListener('lostpointercapture', stop);
      return;
    }

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.virtualTap(spec.action);
    });
  }

  /**
   * The run toggle shows the state you are *in*, not the one you would switch
   * to. A button that reads "Run" while you are already running is the single
   * most common way to make a toggle unreadable.
   */
  _paintLatch(el, spec) {
    const on = input.isLatched(spec.action);
    el.classList.toggle('is-on', on);
    el.querySelector('svg').outerHTML = svg(on ? 'run' : 'walk');
    el.querySelector('.control-label').textContent = on ? 'Run' : 'Walk';
    el.setAttribute('aria-pressed', String(on));
    el.setAttribute('aria-label', on ? 'Running — tap to walk' : 'Walking — tap to run');
  }

  togglePause() {
    analytics.track(EV.GAME_PAUSED, {
      paused: !this.game.paused,
      map: this.game.currentMapId,
      state: this.game.state?.constructor?.name ?? null,
    });
    const g = this.game;
    g.paused = !g.paused;
    // A paused game still renders, so the world does not vanish — it simply
    // stops. Releasing whatever was held keeps the party from walking on
    // through the pause.
    if (g.paused) input.clear();
    this.el.classList.toggle('is-paused', g.paused);
    const btn = this.buttons.get('pause');
    if (btn) {
      btn.el.querySelector('svg').outerHTML = svg(g.paused ? 'play' : 'pause');
      btn.el.querySelector('.control-label').textContent = g.paused ? 'Resume' : 'Pause';
    }
  }

  /**
   * Keep the bar honest about context: the camera cannot be turned outside the
   * field, and "Talk" is only the right word for the confirm button there.
   */
  update() {
    // The title screen has its own two buttons and no game behind it; a bar
    // offering Menu, Pause and Flee in front of a logo is noise.
    const onTitle = this.game.state?.isTitle === true;
    this.el.classList.toggle('hidden', onTitle);
    this.pad.classList.toggle('hidden', onTitle);
    if (onTitle) return;

    const onField = !!this.game.state?.player;
    const inBattle = !!this.game.state?.enemies;
    this.pad.classList.toggle('hidden', !onField);
    for (const [, { el, spec }] of this.buttons) {
      // Buttons that do not apply here are hidden outright rather than
      // disabled: a permanently greyed Flee on every town street is clutter,
      // and a Turn button that does nothing in a fight is a lie.
      if (spec.battleOnly) el.classList.toggle('hidden', !inBattle);
      else if (spec.fieldOnly) el.classList.toggle('hidden', !onField);
    }

    // Fleeing is not always allowed — boss fights refuse it — so the button
    // says so rather than silently doing nothing.
    const flee = this.buttons.get('flee');
    if (flee && inBattle) flee.el.classList.toggle('is-disabled', this.game.state.canFlee === false);

    const confirm = this.buttons.get('confirm');
    if (confirm) {
      const word = onField ? 'Talk' : 'OK';
      const label = confirm.el.querySelector('.control-label');
      if (label.textContent !== word) label.textContent = word;
    }

    // Shift is still a hold, so the toggle has to follow the keyboard or the
    // two disagree about whether the party is running.
    const run = this.buttons.get('run');
    if (run) {
      const on = input.isLatched('run');
      if (run.el.classList.contains('is-on') !== on) this._paintLatch(run.el, run.spec);
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    this.el.remove();
    this.pad.remove();
  }
}
