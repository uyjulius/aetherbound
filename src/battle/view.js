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

// Where the camera stands, and what it looks at. Declared here rather than
// inside `_frameCamera` because the formation is laid out relative to it.
const CAM_HOME = new THREE.Vector3(7.6, 5.2, 11.4);
const CAM_LOOK = new THREE.Vector3(-0.6, 1.5, 0.2);

/**
 * The ground direction the camera reads as *across the screen*, and the one it
 * reads as into it.
 *
 * This is the whole problem with the formation, stated as two vectors. The
 * enemies used to be laid out along world Z on the assumption that Z was
 * screen-width; it is not. The camera sits at +X +Z looking back through the
 * origin, so Z is roughly three-quarters depth and only one-quarter width —
 * spacing creatures a metre apart along it moved them barely half that across
 * the screen, and they piled up. Laying them out along `STAGE_U` means a unit
 * of spacing is a unit of visible separation.
 */
const STAGE_FWD = CAM_LOOK.clone().sub(CAM_HOME).setY(0).normalize();
const STAGE_U = new THREE.Vector3(-STAGE_FWD.z, 0, STAGE_FWD.x);

/** Extent of an axis-aligned box along a ground direction. */
function extentAlong(box, dir) {
  const hx = (box.max.x - box.min.x) / 2;
  const hz = (box.max.z - box.min.z) / 2;
  return 2 * (hx * Math.abs(dir.x) + hz * Math.abs(dir.z));
}

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

  /**
   * The party line, along the same stage axis as the enemies.
   *
   * This had the identical fault: spread along world Z, which the camera reads
   * mostly as depth, so a full party of four stood almost on the same spot.
   */
  _placeParty(party) {
    const GAP = 1.5;
    const centre = new THREE.Vector3(PARTY_X, 0, 0);
    const span = party.length <= 1 ? 0 : (party.length - 1) * GAP;

    party.forEach((c, i) => {
      const built = buildCharacter({ ...c.def.look, id: c.id });
      const anim = new CharacterAnimator(built);
      anim.play('battleIdle', { blend: 0 });

      // Biased toward -U — away from the party status panel in the bottom
      // right of the frame, which the far end of the line would sit behind.
      const offset = (party.length <= 1 ? 0 : i * GAP - span / 2) - 1.4;
      // A back-row character stands further from the enemy, which reads as
      // slightly further up the screen.
      const row = c.row === 'back' ? 1.9 : 0;
      const home = centre.clone()
        .addScaledVector(STAGE_U, offset)
        .addScaledVector(STAGE_FWD, -row + Math.sin(i * 1.1) * 0.35);

      built.root.position.copy(home);
      built.root.rotation.y = -Math.PI / 2 - 0.32;
      this.group.add(built.root);
      this.actors.set(c.id, { root: built.root, anim, kind: 'party', home: home.clone(), combatant: c, built });
    });
  }

  /**
   * Lay the enemies out along Z, which the three-quarter camera reads as
   * screen-width on the left-hand side.
   *
   * Spacing is derived from each creature's *measured* footprint rather than
   * its index. The previous version divided a fixed span between however many
   * enemies there were, so a group of six shared the same room as a group of
   * three and the gap fell to nothing — six `hollybound` overlapped by half a
   * unit, and several other species touched. Size did not enter into it at
   * all, so the widest creatures in the game were packed exactly as tightly as
   * the smallest.
   *
   * Anything too wide for one rank forms two, because stretching a single rank
   * far enough for six large monsters walks them out of frame.
   */
  _placeEnemies(enemies) {
    // Build first, measure second, place third: a creature's real width is a
    // property of its assembled mesh, not of the `scale` in its data.
    const units = enemies.map((e) => {
      const built = buildMonster(e.def.look);
      // Turn it to face the party *before* measuring. A creature is modelled
      // facing down its own axis and then rotated a quarter turn onto the
      // stage, which swaps its width and its depth — measuring first packs a
      // long creature as though it were a narrow one.
      built.root.rotation.y = Math.PI / 2 + 0.28;
      built.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(built.root);
      return {
        e,
        built,
        anim: new MonsterAnimator(built),
        // What matters is how much room the creature takes up *across the
        // screen*, which is its extent along the stage's horizontal axis.
        half: Math.max(0.45, extentAlong(box, STAGE_U) / 2),
        depth: Math.max(0.5, extentAlong(box, STAGE_FWD)),
      };
    });

    const GAP = 0.7;              // clear ground between neighbours
    const ARC = 0.16;             // outer members sit a little further back

    // One rank, always.
    //
    // A second rank is the obvious way to fit a large group, and it does not
    // work here: the camera looks down the axis that would separate the ranks,
    // so a creature standing metres behind another lands on the same pixels.
    // Measured, the back rank was up to 100% covered — invisible. Enemies
    // therefore share one line and the camera pulls back to take it all in,
    // which costs some size in big fights and keeps every creature legible.
    // The left-hand half of the frame is all the room there is: run the line
    // any wider and it reaches across into the party's side of the screen.
    // When a group cannot fit, everything in it shrinks together rather than
    // some of it being pushed out of sight.
    const MAX_SPAN = 11;
    const natural = units.reduce((t, u, i) => t + u.half * 2 + (i ? GAP : 0), 0);
    const shrink = natural > MAX_SPAN ? Math.max(0.62, MAX_SPAN / natural) : 1;
    if (shrink < 1) {
      for (const u of units) {
        u.built.root.scale.multiplyScalar(shrink);
        u.half *= shrink;
        u.depth *= shrink;
      }
    }

    const span = units.reduce((t, u, i) => t + u.half * 2 + (i ? GAP : 0), 0);

    // Keep the line clear of the party. A wide group centred on the enemy
    // anchor reaches across the middle of the screen and ends up standing
    // among the heroes; sliding the whole line left is better than shrinking
    // it further, because the camera widens to follow.
    const RIGHT_LIMIT = -0.6;
    const anchor = new THREE.Vector3(ENEMY_X, 0, 0);
    const shift = Math.min(0, RIGHT_LIMIT - (anchor.dot(STAGE_U) + span / 2));
    const centre = anchor.clone().addScaledVector(STAGE_U, shift);

    let along = -span / 2;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (i) along += GAP;
      along += u.half;
      const offset = along;
      along += u.half;

      // Along the stage's horizontal axis, then pushed away from the camera
      // by its own depth and a little more at the ends, for a shallow arc
      // rather than a firing line.
      const home = centre.clone()
        .addScaledVector(STAGE_U, offset)
        .addScaledVector(STAGE_FWD, -(u.depth * 0.25 + Math.abs(offset) * ARC));
      u.built.root.position.copy(home);
      this.group.add(u.built.root);
      this.actors.set(u.e.id, {
        root: u.built.root, anim: u.anim, kind: 'enemy',
        home: home.clone(), combatant: u.e, built: u.built,
      });
    }
  }

  _frameCamera() {
    const rig = this.renderer.rig;
    // Three-quarter view, low enough that the characters read at full height
    // and close enough that the action fills the frame.
    const HOME = CAM_HOME, LOOK = CAM_LOOK;
    rig.position.copy(HOME);
    rig.target.copy(LOOK);

    // Six large creatures need more room than one, and a fixed camera simply
    // cropped them: pull back until everything on the stage is inside the
    // frame. Most fights need no adjustment at all, so the composition the
    // arena was designed around is what players see nearly always.
    const cam = this.renderer.camera;
    const bounds = new THREE.Box3();
    for (const a of this.actors.values()) {
      a.root.updateMatrixWorld(true);
      bounds.union(new THREE.Box3().setFromObject(a.root));
    }
    if (!bounds.isEmpty()) {
      const corners = [];
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
        }
      }

      // Aim at what is actually there before backing off. Pulling straight
      // back from the designed look-point cannot rescue a formation that has
      // slid left to stay clear of the party — the far end simply leaves the
      // frame faster than the extra distance recovers it.
      const mid = bounds.getCenter(new THREE.Vector3());
      const target = LOOK.clone().lerp(new THREE.Vector3(mid.x, LOOK.y, mid.z), 0.75);
      const offset = HOME.clone().sub(LOOK);
      rig.target.copy(target);
      rig.position.copy(target).add(offset);

      // 8% of margin, so nothing sits flush against the edge of the screen.
      const FIT = 0.92;
      for (let step = 0; step < 24; step++) {
        cam.position.copy(rig.position);
        cam.lookAt(rig.target);
        cam.updateMatrixWorld(true);
        cam.updateProjectionMatrix();
        let worst = 0;
        for (const c of corners) {
          const v = c.clone().project(cam);
          worst = Math.max(worst, Math.abs(v.x), Math.abs(v.y));
        }
        if (worst <= FIT) break;
        offset.multiplyScalar(1.07);
        rig.position.copy(target).add(offset);
      }
    }

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
