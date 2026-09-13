export class AudioDirector {
  constructor(config) {
    this.config = config;
    this.music = new Audio();
    this.music.loop = true;
    this.music.preload = 'auto';
    this.current = '';
    this.unlocked = false;
    window.addEventListener('pointerdown', () => this.unlock(), { once: true });
    window.addEventListener('keydown', () => this.unlock(), { once: true });
  }

  unlock() { this.unlocked = true; if (this.current) this.music.play().catch(() => {}); }

  play(name) {
    if (!name || this.current === name) return;
    this.current = name;
    this.music.src = `./content/audio/music/${name}.ogg`;
    this.music.volume = this.config.music;
    if (this.unlocked) this.music.play().catch(() => {});
  }

  sfx(name) {
    if (!this.unlocked) return;
    const sound = new Audio(`./content/audio/sfx/${name}.ogg`);
    sound.volume = this.config.sound;
    sound.play().catch(() => {});
  }

  setVolumes() { this.music.volume = this.config.music; }
}
