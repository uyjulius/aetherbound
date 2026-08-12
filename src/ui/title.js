import * as THREE from 'three';
import { input } from '../engine/input.js';
import { buildMap, applyAtmosphere, resolveMap, TILE } from '../world/map.js';
import { el } from './ui.js';
import { audio } from '../audio/audio.js';
import { analytics, EV } from '../engine/analytics.js';

/**
 * The title screen.
 *
 * There was none: the game booted straight into a fresh campaign, every time,
 * and the only way to load a save was to start a new game and open the menu
 * from inside it. A forty-hour game whose front door starts you over is a
 * front door that loses saves.
 *
 * The background is the game. Not artwork of the game — the game: Harrowmere
 * itself, the real map with its real atmosphere, under a camera that drifts
 * slowly around the village square while the Prelude plays. It is the most
 * honest establishing shot available, it costs no new assets, and it puts the
 * player's own destination on screen before they press anything. The logo is
 * an authored SVG wordmark over it.
 */

/** Where the camera looks: the village well, the centre of the square. */
const LOOK = { x: 16.5 * TILE, y: 2.2, z: 8.5 * TILE };
const ORBIT_RADIUS = 21;
const ORBIT_HEIGHT = 9.5;
const ORBIT_SPEED = 0.022;          // radians per second — a full lap in ~4.7 min

export class TitleState {
  constructor(game, { mapDef, onNewGame, onLoad }) {
    this.game = game;
    this.mapDef = resolveMap(mapDef, 'whole');
    this.onNewGame = onNewGame;
    this.onLoad = onLoad;
    this.map = null;
    this.root = null;
    this.angle = Math.PI * 0.85;
    this.index = 0;
    this.items = [];
    this.mode = 'menu';             // menu | slots
    this._busy = false;
    this.isTitle = true;            // the control bar reads this and stands down
  }

  enter(game) {
    const r = game.renderer;
    this.map = buildMap(this.mapDef);
    r.scene.add(this.map.group);
    applyAtmosphere(r, this.mapDef);
    r.lights.follow(LOOK.x, LOOK.z);
    this._placeCamera(0);

    // The Prelude belongs to this screen — harp and choir over a still
    // village, and the world starts when the player decides it does.
    game.playMusic('prelude', { fade: 1.6 });

    this._buildDom();
    analytics.track(EV.TITLE_VIEWED, {
      has_save: this.game.latestSave() !== null,
    });
  }

  exit(game) {
    game.renderer.scene.remove(this.map.group);
    this.map?.dispose?.();
    this.root?.remove();
    this.root = null;
  }

  // --- the drift ----------------------------------------------------------

  _placeCamera(dt) {
    this.angle += ORBIT_SPEED * dt;
    const rig = this.game.renderer.rig;
    // A slow orbit with a gentle breathing bob; the camera never stops, so
    // the screen reads as a place rather than a backdrop.
    const bob = Math.sin(this.angle * 3.1) * 0.55;
    rig.position.set(
      LOOK.x + Math.sin(this.angle) * ORBIT_RADIUS,
      ORBIT_HEIGHT + bob,
      LOOK.z + Math.cos(this.angle) * ORBIT_RADIUS,
    );
    rig.target.set(LOOK.x, LOOK.y, LOOK.z);
  }

  update(dt) {
    this._placeCamera(dt);
    if (this._busy) return;

    if (input.justPressed('down')) this._move(1);
    if (input.justPressed('up')) this._move(-1);
    if (input.justPressed('confirm')) this._select();
    if (input.justPressed('cancel') && this.mode === 'slots') this._showMenu();
  }

  // --- the overlay --------------------------------------------------------

  _buildDom() {
    this.root = el('div', { id: 'title-layer' });

    // The wordmark. Authored SVG: the aether star from the boot screen, the
    // name in the display face, and a rule that carries the subtitle. Layered
    // glows are CSS; nothing here is an image file.
    this.root.innerHTML = `
      <div class="title-block">
        <svg class="title-star" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#96f0f5"/>
              <stop offset="0.55" stop-color="#3fc6d6"/>
              <stop offset="1" stop-color="#1a8fa5"/>
            </linearGradient>
          </defs>
          <path d="M60 8 L70 46 L108 60 L70 74 L60 112 L50 74 L12 60 L50 46 Z" fill="url(#tg)"/>
          <circle cx="60" cy="60" r="7" fill="#0b1230"/>
        </svg>
        <svg class="title-word-svg" viewBox="0 0 900 110" aria-label="Aetherbound">
          <defs>
            <linearGradient id="tw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#fdfaf0"/>
              <stop offset="0.48" stop-color="#e9e2c8"/>
              <stop offset="0.72" stop-color="#b7ccdc"/>
              <stop offset="1" stop-color="#96f0f5"/>
            </linearGradient>
          </defs>
          <text x="450" y="78" text-anchor="middle" class="title-word"
            fill="url(#tw)" stroke="rgba(9,14,36,.85)" stroke-width="1.5"
            paint-order="stroke fill">AETHERBOUND</text>
        </svg>
        <div class="title-rule"><span></span><em>the world is still here</em><span></span></div>
      </div>
      <div class="title-menu" role="menu"></div>
      <div class="title-foot">
        <span>Aetherbound</span>
      </div>`;
    this.game.uiRoot.appendChild(this.root);
    this.menuEl = this.root.querySelector('.title-menu');
    this._showMenu();
  }

  _showMenu() {
    this.mode = 'menu';
    const latest = this.game.latestSave();
    const slots = this.game.saves.list().filter(Boolean);
    this.items = [
      latest && {
        label: 'Continue',
        hint: `${latest.locationName ?? latest.location ?? ''} · ${latest.partyNames?.[0] ?? ''} Lv ${latest.leadLevel ?? ''}`,
        act: () => this._continue(),
      },
      { label: 'New Game', act: () => this._newGame() },
      slots.length > 1 && { label: 'Load Game', act: () => this._showSlots() },
    ].filter(Boolean);
    this.index = 0;
    this._render();
  }

  _showSlots() {
    this.mode = 'slots';
    const slots = this.game.saves.list();
    this.items = slots.map((s, i) => s && {
      label: `Slot ${i + 1} — ${s.location}`,
      hint: `${s.names?.[0] ?? ''} Lv ${s.level} · ${s.time}`,
      act: () => this._load(i),
    }).filter(Boolean);
    this.items.push({ label: 'Back', act: () => this._showMenu() });
    this.index = 0;
    this._render();
  }

  _render() {
    this.menuEl.innerHTML = '';
    this.items.forEach((item, i) => {
      const row = el('div', {
        class: `title-item${i === this.index ? ' selected' : ''}`,
        'data-clickable': true,
        onclick: () => { this.index = i; this._select(); },
        onmouseenter: () => { this.index = i; this._render(); },
      }, [
        el('span', { class: 'title-item-label', text: item.label }),
        item.hint ? el('span', { class: 'title-item-hint', text: item.hint }) : null,
      ]);
      this.menuEl.appendChild(row);
    });
  }

  _move(dir) {
    this.index = (this.index + dir + this.items.length) % this.items.length;
    audio.sfx('cursor');
    this._render();
  }

  _select() {
    audio.sfx('confirm');
    this.items[this.index]?.act();
  }

  // --- the three doors ----------------------------------------------------

  /** Also the hook the automated checks use to get past this screen. */
  newGame() { return this._newGame(); }

  async _newGame() {
    if (this._busy) return;
    this._busy = true;
    await this.game.fade(1, 0.9);
    await this.onNewGame();
    await this.game.fade(0, 1.2);
  }

  async _continue() {
    const latest = this.game.latestSave();
    if (!latest || this._busy) return;
    this._busy = true;
    await this.game.fade(1, 0.7);
    await this.onLoad(latest);
    await this.game.fade(0, 0.9);
  }

  async _load(slot) {
    const data = this.game.saves.load(slot);
    if (!data || this._busy) return;
    this._busy = true;
    await this.game.fade(1, 0.7);
    await this.onLoad(data);
    await this.game.fade(0, 0.9);
  }
}
