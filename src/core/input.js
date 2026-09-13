const binds = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  run: ['ShiftLeft', 'ShiftRight'], confirm: ['Enter', 'Space', 'KeyZ'],
  cancel: ['Escape', 'KeyX', 'Backspace'], menu: ['KeyC'],
  map: ['KeyM'],
  debugBattle: ['KeyB'],
};

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.virtual = new Set();
    this.pressed = new Set();
    this.blocked = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    target.addEventListener('keydown', (event) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
      if (event.target?.closest?.('button') && ['Enter', 'Space'].includes(event.code)) return;
      if (this.blocked.has(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    target.addEventListener('keyup', (event) => this.down.delete(event.code));
    target.addEventListener('blur', () => { this.down.clear(); this.virtual.clear(); this.pressed.clear(); });
    document.querySelectorAll('[data-input]').forEach(button => {
      const code = binds[button.dataset.input]?.[0];
      if (!code) return;
      button.addEventListener('pointerdown', event => {
        event.preventDefault(); button.setPointerCapture(event.pointerId);
        this.virtual.add(code); this.pressed.add(code); button.classList.add('pressed');
      });
      const release = () => { this.virtual.delete(code); button.classList.remove('pressed'); };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    });
  }

  isDown(action) { return binds[action]?.some((code) => this.down.has(code) || this.virtual.has(code)) ?? false; }
  take(action) {
    const code = binds[action]?.find((value) => this.pressed.has(value));
    if (!code) return false;
    this.pressed.delete(code);
    return true;
  }
  axis() {
    return {
      x: Number(this.isDown('right')) - Number(this.isDown('left')),
      z: Number(this.isDown('down')) - Number(this.isDown('up')),
    };
  }
  flush() { this.pressed.clear(); }
}
