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
const BUTTONS = [
  {
    id: 'cam-left', action: 'pageLeft', hold: true, fieldOnly: true,
    label: 'Turn', hint: 'Q', glyph: 'rotate-left',
  },
  {
    id: 'cam-right', action: 'pageRight', hold: true, fieldOnly: true,
    label: 'Turn', hint: 'E', glyph: 'rotate-right',
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
};

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
    if (spec.id === 'pause') {
      el.addEventListener('click', () => this.togglePause());
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

  togglePause() {
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
    const onField = !!this.game.state?.player;
    for (const [, { el, spec }] of this.buttons) {
      if (spec.fieldOnly) el.classList.toggle('is-disabled', !onField);
    }
    const confirm = this.buttons.get('confirm');
    if (confirm) {
      const word = onField ? 'Talk' : 'OK';
      const label = confirm.el.querySelector('.control-label');
      if (label.textContent !== word) label.textContent = word;
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    this.el.remove();
  }
}
