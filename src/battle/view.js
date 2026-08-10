import * as THREE from 'three';
import { buildCharacter, CharacterAnimator } from '../world/character.js';
import { buildMonster, MonsterAnimator } from './monsters.js';
import { toonMaterial, skyMaterial } from '../fx/materials.js';
import { assets } from '../engine/assets.js';
import { kitMaterials, tree, bush, rock } from '../world/kit.js';
import { EASE } from '../engine/scheduler.js';
import { ParticleSystem } from '../fx/particles.js';

/**
 * The battle stage.
 *
 * Party on the right, enemies on the left, camera three-quarters on — the
 * layout every player of this genre already knows how to read. The arena is
 * built as an "island" that replaces the field view rather than fighting in
 * place: it guarantees a clean, readable composition regardless of where the
 * encounter was triggered.
 */

const PARTY_X = 5.4;
const ENEMY_X = -5.0;

export class BattleView {
  constructor(renderer, { terrain = 'grass', scenery = 'field' } = {}) {
    this.renderer = renderer;
    this.group = new THREE.Group();
    this.group.name = 'battle-arena';
    this.terrain = terrain;
    this.scenery = scenery;
    this.actors = new Map();     // combatant id → { root, anim, kind, home }
    this.hidden = [];
    this._time = 0;
  }

  // --- setup --------------------------------------------------------------

  build(party, enemies) {
    const r = this.renderer;

    // Hide the field rather than tearing it down: returning to exploration
    // after a battle has to be instant, and rebuilding a town would stall.
    for (const child of r.scene.children) {
      if (child.visible && !child.isLight) {
        child.visible = false;
        this.hidden.push(child);
      }
    }
    r.scene.add(this.group);

    // The shadow camera follows the player around the field map; the arena is
    // built at the origin, which would leave it entirely outside the shadow
    // frustum and therefore entirely in shadow.
    r.lights.follow(0, 0);
    this._fogRestore = { color: r.scene.fog.color.clone(), near: r.scene.fog.near, far: r.scene.fog.far };
    r.setFog('#8fa6b0', 40, 120);

    this._buildArena();
    this._placeParty(party);
    this._placeEnemies(enemies);
    this._frameCamera();
    this.particles = new ParticleSystem(this.group);
    return this;
  }

  /**
   * Context handed to the spell-effect coroutines, so they can emit particles
   * and drive the camera without knowing anything about the battle state.
   */
  fxContext() {
    return {
      scene: this.group,
      particles: this.particles,
      shake: (amount, decay = 3.2) => this.renderer.rig.shake(amount, decay),
      flash: (color, strength) => {
        const c = new THREE.Color(color);
        this.renderer.postfx.flash([c.r, c.g, c.b], strength);
        this._flashDecay = strength;
      },
    };
  }

  _buildArena() {
    const texName = { grass: 'grass', dirt: 'dirt_path', sand: 'sand', snow: 'snow', cave: 'cave_rock', cobble: 'cobblestone', marble: 'marble_floor' }[this.terrain] || 'grass';

    // The battle gets its own sky: the field's belongs to the map group, which
    // is hidden for the duration.
    const skyOpts = this.scenery === 'cave'
      ? { zenith: '#101828', horizon: '#2a3040', ground: '#14161f', sunColor: '#6a7a96', cloud: 0, stars: 0 }
      : { zenith: '#2f6494', horizon: '#a6bcb8', ground: '#565448', sunColor: '#ffdda0', sunDir: [0.5, 0.55, 0.4], cloud: 0.55 };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 20), skyMaterial(skyOpts));
    sky.frustumCulled = false;
    sky.name = 'battle-sky';
    this.group.add(sky);
    this.sky = sky;

    // Ground island: wide enough that the fog swallows the rim before the
    // camera can see the disc end.
    const geo = new THREE.CircleGeometry(44, 56);
    geo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(geo, toonMaterial({
      map: assets.tiled(texName, 22), ramp: 'terrain',
    }));
    ground.receiveShadow = true;
    this.group.add(ground);

    // A low rim of rocks and greenery frames the fight and hides the disc edge.
    if (this.scenery !== 'none') {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.3;
        const dist = 13 + (i % 3) * 2.2;
        const x = Math.cos(a) * dist;
        const z = Math.sin(a) * dist;
        // Keep the camera-facing wedge clear so nothing blocks the view.
        if (z > 6 && Math.abs(x) < 12) continue;
        let prop;
        if (this.scenery === 'cave') prop = rock({ scale: 1.6 + (i % 3) * 0.5, seed: i * 7, material: 'cave' });
        else if (i % 3 === 0) prop = rock({ scale: 1.1 + (i % 2) * 0.4, seed: i * 5 });
        else if (i % 3 === 1) prop = tree({ kind: this.scenery === 'snow' ? 'pine' : 'broadleaf', scale: 1.1, seed: i * 11 });
        else prop = bush({ scale: 1.3, seed: i * 3 });
        prop.position.set(x, 0, z);
        this.group.add(prop);
      }
    }
  }

  _placeParty(party) {
    party.forEach((c, i) => {
      const built = buildCharacter({ ...c.def.look, id: c.id });
      const anim = new CharacterAnimator(built);
      anim.play('battleIdle', { blend: 0 });
      // Staggered column: front row forward, back row behind, slight arc so
      // nobody is hidden behind anybody.
      const row = c.row === 'back' ? 2.1 : 0;
      // Biased toward -Z: the +Z end of the line sits behind the party status
      // panel in the bottom-right of the frame.
      const spread = party.length === 1 ? 0 : (i / (party.length - 1) - 0.5) * (party.length * 2.2);
      const home = new THREE.Vector3(
        PARTY_X + row + Math.sin(i * 1.1) * 0.45,
        0,
        spread - 1.1,
      );
      built.root.position.copy(home);
      built.root.rotation.y = -Math.PI / 2 - 0.32;
      this.group.add(built.root);
      this.actors.set(c.id, { root: built.root, anim, kind: 'party', home: home.clone(), combatant: c, built });
    });
  }

  _placeEnemies(enemies) {
    const n = enemies.length;
    enemies.forEach((e, i) => {
      const built = buildMonster(e.def.look);
      const anim = new MonsterAnimator(built);
      const size = e.def.look.scale ?? 1;
      // Enemies fan out along Z, which is what the three-quarter camera reads
      // as screen-*width* on the left-hand side. The spread has to be generous
      // because that camera also compresses Z into depth: a tighter fan puts
      // three creatures on top of each other. Outer members sit further back,
      // forming a shallow arc rather than a firing line — and the per-index X
      // stagger is deliberately gone, since it partially cancelled the fan.
      const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * Math.min(10.5, n * 3.4);
      const home = new THREE.Vector3(
        ENEMY_X - size * 0.9 - Math.abs(spread) * 0.30,
        0,
        spread,
      );
      built.root.position.copy(home);
      built.root.rotation.y = Math.PI / 2 + 0.28;
      this.group.add(built.root);
      this.actors.set(e.id, { root: built.root, anim, kind: 'enemy', home: home.clone(), combatant: e, built });
    });
  }

  _frameCamera() {
    const rig = this.renderer.rig;
    // Three-quarter view, low enough that the characters read at full height
    // and close enough that the action fills the frame.
    rig.position.set(7.6, 5.2, 11.4);
    rig.target.set(-0.6, 1.5, 0.2);
    this.renderer.postfx.setTiltShift(0.26, 0.54, 0.32);
    this.renderer.postfx.setFocus(13.5, 18);
    this.renderer.autofocus = false;
  }

  teardown() {
    this.group.removeFromParent();
    this.group.traverse((o) => { if (o.isMesh) o.geometry?.dispose?.(); });
    for (const child of this.hidden) child.visible = true;
    this.hidden.length = 0;
    this.renderer.autofocus = true;
    if (this._fogRestore) {
      this.renderer.setFog(this._fogRestore.color, this._fogRestore.near, this._fogRestore.far);
    }
  }

  // --- per-frame ----------------------------------------------------------

  update(dt) {
    this._time += dt;
    for (const a of this.actors.values()) a.anim.update(dt);
    if (this.sky) this.sky.position.copy(this.renderer.camera.position);
    this.particles?.update(dt);
    // Screen flashes decay here rather than in each effect, so an effect that
    // is interrupted can never leave the screen stuck white.
    if (this._flashDecay > 0) {
      this._flashDecay = Math.max(0, this._flashDecay - dt * 2.6);
      this.renderer.postfx.flashStrength = this._flashDecay;
    }
  }

  actorFor(combatantId) { return this.actors.get(combatantId) || null; }

  /** World position of a combatant's chest, for targeting VFX and popups. */
  anchor(combatantId, height = 1.2) {
    const a = this.actors.get(combatantId);
    if (!a) return new THREE.Vector3();
    return new THREE.Vector3(a.root.position.x, height, a.root.position.z);
  }

  /** Project a world point to CSS pixels for the DOM overlay. */
  project(v3) {
    const p = v3.clone().project(this.renderer.camera);
    const rect = this.renderer.canvas.getBoundingClientRect();
    return { x: (p.x * 0.5 + 0.5) * rect.width, y: (-p.y * 0.5 + 0.5) * rect.height };
  }

  // --- animation helpers (used from battle coroutines) --------------------

  play(combatantId, clip) {
    const a = this.actors.get(combatantId);
    if (!a) return;
    if (a.kind === 'party') a.anim.play(clip);
    else a.anim.play(clip);
  }

  setActionT(combatantId, t) {
    const a = this.actors.get(combatantId);
    if (a) a.anim.actionT = t;
  }

  /** Step forward, strike, step back. Yields until the swing lands. */
  *meleeApproach(attackerId, targetId) {
    const a = this.actors.get(attackerId);
    const t = this.actors.get(targetId);
    if (!a || !t) return;
    const from = a.home.clone();
    // Stop short of the target so models never intersect.
    const dir = t.root.position.clone().sub(from).normalize();
    const to = t.root.position.clone().sub(dir.multiplyScalar(2.1));
    to.y = 0;

    if (a.kind === 'party') a.anim.play('run');
    let e = 0;
    const dur = 0.26;
    while (e < dur) {
      const dt = yield { kind: 'tick' };
      e += dt;
      const k = EASE.quadOut(Math.min(1, e / dur));
      a.root.position.lerpVectors(from, to, k);
      a.root.lookAt(t.root.position.x, 0, t.root.position.z);
    }
    if (a.kind === 'party') { a.anim.play('attack'); a.anim.actionT = 0; }
    else a.anim.play('attack');
  }

  *meleeReturn(attackerId) {
    const a = this.actors.get(attackerId);
    if (!a) return;
    const from = a.root.position.clone();
    let e = 0;
    const dur = 0.30;
    while (e < dur) {
      const dt = yield { kind: 'tick' };
      e += dt;
      const k = EASE.quadInOut(Math.min(1, e / dur));
      a.root.position.lerpVectors(from, a.home, k);
    }
    a.root.position.copy(a.home);
    a.root.rotation.set(0, a.kind === 'party' ? -Math.PI / 2 - 0.32 : Math.PI / 2 + 0.28, 0);
    if (a.kind === 'party') a.anim.play('battleIdle');
    else a.anim.play('idle');
  }

  /** Drive a one-shot clip's parameter from 0 to 1 over `seconds`. */
  *driveAction(combatantId, seconds) {
    const a = this.actors.get(combatantId);
    if (!a) { yield { kind: 'wait', seconds }; return; }
    let e = 0;
    while (e < seconds) {
      const dt = yield { kind: 'tick' };
      e += dt;
      a.anim.actionT = Math.min(1, e / seconds);
    }
  }

  /** Flash a combatant white — the universal "this hit landed" signal. */
  *hitFlash(combatantId, color = 0xffffff, seconds = 0.16) {
    const a = this.actors.get(combatantId);
    if (!a) return;
    const targets = [];
    // Party members are one skinned mesh with a *list* of materials, one per
    // geometry group, so a naive `o.material.emissive` misses every one of them
    // and the hit never flashes.
    a.root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m?.emissive) targets.push({ m, e: m.emissive.clone(), i: m.emissiveIntensity ?? 1 });
      }
    });
    for (const t of targets) { t.m.emissive.setHex(color); t.m.emissiveIntensity = 1.6; }
    let e = 0;
    while (e < seconds) {
      const dt = yield { kind: 'tick' };
      e += dt;
      const k = 1 - e / seconds;
      for (const t of targets) t.m.emissiveIntensity = 1.6 * k;
    }
    for (const t of targets) { t.m.emissive.copy(t.e); t.m.emissiveIntensity = t.i; }
  }

  /** Death: fade out and sink. */
  *dissolve(combatantId, seconds = 0.75) {
    const a = this.actors.get(combatantId);
    if (!a) return;
    a.anim.play('dead');
    const mats = [];
    a.root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m && !mats.includes(m)) { mats.push(m); m.transparent = true; }
      }
    });
    let e = 0;
    while (e < seconds) {
      const dt = yield { kind: 'tick' };
      e += dt;
      const k = 1 - e / seconds;
      for (const m of mats) m.opacity = k;
    }
    a.root.visible = false;
  }

  setVisible(combatantId, v) {
    const a = this.actors.get(combatantId);
    if (a) a.root.visible = v;
  }
}
