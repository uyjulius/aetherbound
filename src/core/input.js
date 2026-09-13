const binds = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  run: ['ShiftLeft', 'ShiftRight'], confirm: ['Enter', 'Space', 'KeyZ'],
  cancel: ['Escape', 'KeyX', 'Backspace'], menu: ['KeyC', 'Tab'],
  debugBattle: ['KeyB'],
};

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this.blocked = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
    target.addEventListener('keydown', (event) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
      if (event.target?.closest?.('button') && ['Enter', 'Space'].includes(event.code)) return;
      if (this.blocked.has(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    target.addEventListener('keyup', (event) => this.down.delete(event.code));
    target.addEventListener('blur', () => { this.down.clear(); this.pressed.clear(); });
  }

  isDown(action) { return binds[action]?.some((code) => this.down.has(code)) ?? false; }
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
