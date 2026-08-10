import * as THREE from 'three';
import { input } from '../engine/input.js';
import { scheduler, wait, until, tween, EASE } from '../engine/scheduler.js';
import { buildMap, applyAtmosphere, TILE } from './map.js';
import { buildCharacter, CharacterAnimator } from './character.js';
import { initKitMaterials } from './kit.js';
import { buildAirship } from './airship.js';
import { el, showAreaTitle } from '../ui/ui.js';
import { DialogueBox } from '../ui/dialogue.js';

/**
 * Field mode: walking around the world.
 *
 * Owns the loaded map, the player, the party followers, NPCs, the camera and
 * interaction. Battle and menus are separate states that suspend this one.
 */

const PLAYER_RADIUS = 0.42;
const WALK_SPEED = 4.4;
const RUN_SPEED = 7.6;

// Airship. Cruise is a little over twice a run, and boost twice that again —
// fast enough that crossing the continent is a short flight rather than a
// chore, slow enough that the player can still read the landscape going past.
const AIRSHIP_SPEED = 17;
const AIRSHIP_BOOST_SPEED = 30;
const AIRSHIP_ALTITUDE = 9.5;
const AIRSHIP_PARKED_Y = 0.9;
const AIRSHIP_CAMERA_DISTANCE = 30;
const AIRSHIP_CAMERA_PITCH = 0.82;

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

class FieldCamera {
  constructor(rig) {
    this.rig = rig;
    this.yaw = Math.PI;            // looking down -Z
    this.targetYaw = Math.PI;
    this.pitch = 0.72;             // radians above horizontal
    this.distance = 13.5;
    this.targetDistance = 13.5;
    this.height = 1.4;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.smoothing = 7.5;
    this.freeLook = true;
  }

  snapTo(x, z) {
    this.look.set(x, this.height, z);
    this._place(0, true);
  }

  _place(dt, instant = false) {
    const d = this.distance;
    const wanted = new THREE.Vector3(
      this.look.x + Math.sin(this.yaw) * Math.cos(this.pitch) * d,
      this.look.y + Math.sin(this.pitch) * d,
      this.look.z + Math.cos(this.yaw) * Math.cos(this.pitch) * d,
    );
    if (instant) {
      this.rig.position.copy(wanted);
      this.rig.target.copy(this.look);
    } else {
      const k = 1 - Math.exp(-this.smoothing * dt);
      this.rig.position.lerp(wanted, k);
      this.rig.target.lerp(this.look, k);
    }
  }

  update(dt, targetX, targetZ) {
    if (this.freeLook) {
      // Shoulder buttons orbit in 45° detents — free-spinning analogue orbit
      // makes a top-down world disorienting, and detents keep the world's
      // compass legible.
      if (input.justPressed('pageLeft')) this.targetYaw += Math.PI / 4;
      if (input.justPressed('pageRight')) this.targetYaw -= Math.PI / 4;
    }
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 6);
    this.distance += (this.targetDistance - this.distance) * Math.min(1, dt * 4);
    // Lead the camera slightly toward where the player is heading.
    this.look.lerp(new THREE.Vector3(targetX, this.height, targetZ), Math.min(1, dt * this.smoothing));
    this._place(dt);
  }

  /**
   * Convert an input vector into world-space movement for the current yaw.
   *
   * The camera sits *behind* the look target and faces along +forward, so
   * "away from the camera" is the direction the player expects W to go. An
   * earlier version negated both axes, which inverted all four keys — W drove
   * the party down the screen and A drove them right. It survived a long time
   * because the smoke test teleports the player with `place()` and never
   * presses a movement key, so nothing exercised this path.
   */
  transformInput(ix, iy) {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    return { x: ix * c - iy * s, z: ix * s + iy * c };
  }
}

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

class Actor {
  constructor(def, character) {
    this.def = def;
    this.ch = character;
    this.anim = new CharacterAnimator(character);
    this.root = character.root;
    this.x = 0;
    this.z = 0;
    this.facing = Math.PI;
    this.targetFacing = Math.PI;
    this.speed = 0;
    this.radius = def.radius ?? 0.42;
  }

  place(x, z, facing = this.facing) {
    this.x = x; this.z = z;
    this.facing = this.targetFacing = facing;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = facing;
  }

  faceTowards(x, z) {
    this.targetFacing = Math.atan2(x - this.x, z - this.z);
  }

  update(dt) {
    // Shortest-arc turn.
    let diff = this.targetFacing - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.facing += diff * Math.min(1, dt * 14);
    this.root.rotation.y = this.facing;
    this.root.position.set(this.x, this.root.position.y, this.z);
    this.anim.moveSpeed = this.speed / RUN_SPEED;
    this.anim.update(dt);
  }
}

// ---------------------------------------------------------------------------
// Field state
// ---------------------------------------------------------------------------

export class FieldState {
  constructor(game, { mapDef, spawn = null, party = null }) {
    this.game = game;
    this.mapDef = mapDef;
    this.spawnName = spawn;
    this.partyDefs = party;
    this.map = null;
    this.player = null;
    this.followers = [];
    this.npcs = [];
    this.camera = null;
    this.dialogue = null;
    this.busy = false;              // a cutscene or conversation owns input
    this.interactTarget = null;
    this.promptEl = null;
    this.stepAccum = 0;
    this.encounterThreshold = 0;
    this.onEncounter = null;        // set by the game to hand off to battle
    this.onExit = null;
    this.paused = false;
    this.vehicle = null;            // null on foot, else the airship rig
    this.parked = null;             // the ship sitting on this map, if any
  }

  // --- lifecycle ----------------------------------------------------------

  enter(game) {
    initKitMaterials();
    const r = game.renderer;

    this.map = buildMap(this.mapDef);
    r.scene.add(this.map.group);
    applyAtmosphere(r, this.mapDef);

    this.camera = new FieldCamera(r.rig);
    // The world map wants a longer lens and a steeper angle than a town street:
    // on a continent the player is reading the landscape, not the architecture.
    if (this.mapDef.cameraDistance) {
      this.camera.distance = this.camera.targetDistance = this.mapDef.cameraDistance;
    }
    if (this.mapDef.cameraPitch) this.camera.pitch = this.mapDef.cameraPitch;
    // Running everywhere is the norm on a world map; walking pace across a
    // continent is tedious.
    this.speedScale = this.mapDef.speedScale ?? 1;

    // Player + followers from the active party.
    const partyDefs = this.partyDefs || game.party?.activeCharacterDefs?.() || [];
    const leadDef = partyDefs[0] || { id: 'hero', build: 'normal', height: 1.72, hair: 'short' };
    const lead = buildCharacter(leadDef);
    r.scene.add(lead.root);
    this.player = new Actor(leadDef, lead);
    this.player.radius = PLAYER_RADIUS;

    for (let i = 1; i < Math.min(partyDefs.length, 4); i++) {
      const f = buildCharacter(partyDefs[i]);
      r.scene.add(f.root);
      const actor = new Actor(partyDefs[i], f);
      actor.trail = [];
      this.followers.push(actor);
    }

    // Spawn point.
    const spawn = this._resolveSpawn();
    this.player.place(spawn.x, spawn.z, spawn.facing);
    for (const f of this.followers) f.place(spawn.x, spawn.z, spawn.facing);
    this.camera.snapTo(spawn.x, spawn.z);

    this._buildNPCs();

    this.dialogue = game.dialogue || (game.dialogue = new DialogueBox(game.uiRoot));
    this.promptEl = el('div', { class: 'interact-prompt hidden' });
    game.uiRoot.appendChild(this.promptEl);

    showAreaTitle(game.uiRoot, this.mapDef.name, this.mapDef.subtitle);
    if (this.mapDef.music) game.playMusic(this.mapDef.music, { fade: 1.4 });

    this.encounterThreshold = this._rollEncounterThreshold();
    r.lights.follow(spawn.x, spawn.z);

    // If the ship was left on this map, put it back exactly where it was.
    const left = game.party?.airship;
    if (left && left.map === this.mapDef.id) {
      const rig = buildAirship();
      rig.root.userData.baseY = AIRSHIP_PARKED_Y;
      rig.root.position.set(left.x, AIRSHIP_PARKED_Y, left.z);
      rig.root.rotation.y = left.facing ?? 0;
      r.scene.add(rig.root);
      this.parked = { rig, x: left.x, z: left.z };
    }
  }

  exit(game) {
    this.map?.dispose();
    if (this.vehicle) {
      game.renderer.scene.remove(this.vehicle.rig.root);
      this.vehicle = null;
    }
    if (this.parked) {
      game.renderer.scene.remove(this.parked.rig.root);
      this.parked = null;
    }
    game.renderer.scene.remove(this.player.root);
    for (const f of this.followers) game.renderer.scene.remove(f.root);
    for (const n of this.npcs) game.renderer.scene.remove(n.root);
    this.promptEl?.remove();
    this.dialogue?.close();
  }

  _resolveSpawn() {
    const points = this.mapDef.spawns || {};
    const name = this.spawnName;
    const p = (name && points[name]) || points.default || Object.values(points)[0];
    if (!p) {
      // Fall back to the first walkable tile so a map is never unenterable.
      for (let z = 0; z < this.map.height; z++) {
        for (let x = 0; x < this.map.width; x++) {
          if (this.map.grid.isWalkTile(x, z)) {
            return { x: x * TILE + TILE / 2, z: z * TILE + TILE / 2, facing: Math.PI };
          }
        }
      }
      return { x: 0, z: 0, facing: Math.PI };
    }
    const facings = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 };
    return {
      x: p.at[0] * TILE + TILE / 2,
      z: p.at[1] * TILE + TILE / 2,
      facing: facings[p.face] ?? Math.PI,
    };
  }

  _buildNPCs() {
    for (const def of this.mapDef.npcs || []) {
      const ch = buildCharacter(def.look || { build: 'normal', height: 1.70, hair: 'short' });
      this.game.renderer.scene.add(ch.root);
      const actor = new Actor(def, ch);
      const facings = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 };
      actor.place(def.at[0] * TILE + TILE / 2, def.at[1] * TILE + TILE / 2, facings[def.face] ?? 0);
      actor.anim.play(def.clip || 'idle', { blend: 0 });
      actor.homeX = actor.x;
      actor.homeZ = actor.z;
      actor.wanderTimer = 1 + Math.random() * 3;
      this.map.grid.addCircle(actor.x, actor.z, 0.44, def.id);
      actor.collider = this.map.grid.shapes[this.map.grid.shapes.length - 1];
      this.npcs.push(actor);
    }
  }

  // --- update -------------------------------------------------------------

  update(dt, game) {
    if (this.paused) return;
    const r = game.renderer;

    // The field menu suspends exploration entirely while it's open.
    if (game.menu?.open) {
      game.menu.update();
      if (this.vehicle) {
        // Keep the screws turning and the ship bobbing under the menu; a
        // frozen airship behind a translucent menu looks like a crash.
        this.vehicle.rig.update(dt, this.vehicle.thrust);
        this.camera.update(dt, this.vehicle.x, this.vehicle.z);
      } else {
        this.player.anim.play('idle');
        this.player.update(dt);
        this.camera.update(dt, this.player.x, this.player.z);
      }
      return;
    }

    if (!this.busy) {
      if (input.justPressed('menu')) {
        game.menu?.show();
        this.promptEl.classList.add('hidden');
        return;
      }
      if (this.vehicle) this._updateAirship(dt);
      else { this._updatePlayer(dt); this._updateInteraction(); }
    } else {
      this.player.speed = 0;
      this.player.anim.play('idle');
    }

    if (this.vehicle) {
      this.vehicle.rig.update(dt, this.vehicle.thrust);
    } else {
      this._updateFollowers(dt);
      this.player.update(dt);
      for (const f of this.followers) f.update(dt);
      // A parked ship keeps idling — screws ticking over, hull breathing on
      // its moorings. A completely static one reads as scenery.
      this.parked?.rig.update(dt, 0);
    }
    this._updateNPCs(dt);
    for (const n of this.npcs) n.update(dt);

    const fx = this.vehicle ? this.vehicle.x : this.player.x;
    const fz = this.vehicle ? this.vehicle.z : this.player.z;
    this.camera.update(dt, fx, fz);
    r.lights.follow(fx, fz);
    this.map.update(dt, r.time);
    if (this.map.sky) this.map.sky.position.copy(r.camera.position);
  }

  _updatePlayer(dt) {
    const mv = input.moveVector();
    const running = input.isDown('run');
    // The Sprinter relic does what its description says. It advertised
    // "Move faster in the field" and, until this line, did not.
    const sprinting = this.game.party?.activeMembers?.some(
      (m) => Object.values(m.equipment).some((e) => e?.effects?.includes('fastField')));
    const speed = (running ? RUN_SPEED : WALK_SPEED)
      * (this.speedScale ?? 1) * (sprinting ? 1.3 : 1);
    const moving = Math.abs(mv.x) > 0.01 || Math.abs(mv.y) > 0.01;

    if (moving) {
      const dir = this.camera.transformInput(mv.x, mv.y);
      const len = Math.hypot(dir.x, dir.z) || 1;
      const nx = dir.x / len, nz = dir.z / len;
      const mag = Math.min(1, Math.hypot(mv.x, mv.y));
      const step = speed * mag * dt;
      const to = this.map.grid.resolve(
        this.player.x, this.player.z,
        this.player.x + nx * step, this.player.z + nz * step,
        PLAYER_RADIUS);
      const travelled = Math.hypot(to.x - this.player.x, to.z - this.player.z);
      this.player.x = to.x;
      this.player.z = to.z;
      this.player.targetFacing = Math.atan2(nx, nz);
      this.player.speed = travelled / Math.max(dt, 1e-5);
      this.player.anim.play(running ? 'run' : 'walk');
      this._accumulateSteps(travelled);
      this._checkTriggers();
    } else {
      this.player.speed = 0;
      this.player.anim.play('idle');
    }
  }

  // --- the airship --------------------------------------------------------

  /**
   * Board. The party and the walking camera go away; the ship and a longer,
   * higher lens replace them.
   *
   * Flight deliberately ignores the collision grid entirely. An airship that
   * bumps into a hedge is not an airship — the whole reward of getting one is
   * that the map stops being a set of corridors and becomes a shape you can
   * look at. The only constraint is the map boundary.
   */
  board(game) {
    if (this.vehicle) return;
    // Re-use the parked hull if there is one, so boarding does not spawn a
    // second ship next to the one already sitting there.
    const rig = this.parked?.rig ?? buildAirship();
    if (!this.parked) game.renderer.scene.add(rig.root);
    this.parked = null;
    game.party.airship = null;

    rig.root.userData.baseY = AIRSHIP_ALTITUDE;
    rig.root.position.set(this.player.x, AIRSHIP_ALTITUDE, this.player.z);
    rig.root.rotation.y = this.player.facing;

    this.vehicle = { rig, thrust: 0, facing: this.player.facing, x: this.player.x, z: this.player.z };
    game.playMusic('airship', { fade: 1.2 });

    this.player.root.visible = false;
    for (const f of this.followers) f.root.visible = false;
    this.promptEl.classList.add('hidden');

    this.camera.targetDistance = AIRSHIP_CAMERA_DISTANCE;
    this.camera.pitch = AIRSHIP_CAMERA_PITCH;
    this.camera.height = AIRSHIP_ALTITUDE * 0.8;
  }

  /** Step off onto the tile below, leaving the ship where it stands. */
  disembark(game) {
    if (!this.vehicle) return;
    const { rig, x, z, facing } = this.vehicle;
    this.vehicle = null;

    // The hull stays in the scene, settled onto its skids a little off to one
    // side so the party is not standing inside it.
    const px = x + Math.sin(facing + Math.PI / 2) * 3.2;
    const pz = z + Math.cos(facing + Math.PI / 2) * 3.2;
    rig.root.userData.baseY = AIRSHIP_PARKED_Y;
    rig.root.userData.targetRoll = 0;
    rig.root.position.set(px, AIRSHIP_PARKED_Y, pz);
    this.parked = { rig, x: px, z: pz };
    game.party.airship = { map: this.mapDef.id, x: px, z: pz, facing };

    this.player.place(x, z, facing);
    this.player.root.visible = true;
    for (const f of this.followers) { f.place(x, z, facing); f.root.visible = true; }
    this._trail = [];

    this.camera.targetDistance = this.mapDef.cameraDistance ?? 13.5;
    this.camera.pitch = this.mapDef.cameraPitch ?? 0.72;
    this.camera.height = 1.4;
    this.camera.snapTo(x, z);
    this.encounterThreshold = this._rollEncounterThreshold();
    if (this.mapDef.music) game.playMusic(this.mapDef.music, { fade: 1.2 });
  }

  /** Is the ship currently over ground it could put down on? */
  canLand() {
    if (!this.vehicle) return false;
    const { x, z } = this.vehicle;
    // Require the landing tile *and* its neighbours to be clear, so the party
    // never disembarks into a one-tile pocket they cannot walk out of.
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!this.map.grid.isWalkWorld(x + dx * TILE, z + dz * TILE)) return false;
    }
    return true;
  }

  /** Is the ship pressed against the named edge of the map? */
  _atCrossingEdge(edge) {
    if (!this.vehicle) return false;
    const w = this.map.grid.w * TILE, h = this.map.grid.h * TILE;
    const margin = TILE * 1.5;
    const { x, z } = this.vehicle;
    if (edge === 'west') return x <= margin;
    if (edge === 'east') return x >= w - margin;
    if (edge === 'north') return z <= margin;
    if (edge === 'south') return z >= h - margin;
    return false;
  }

  _updateAirship(dt) {
    const v = this.vehicle;
    const mv = input.moveVector();
    const boosting = input.isDown('run');
    const mag = Math.min(1, Math.hypot(mv.x, mv.y));
    const moving = mag > 0.01;

    const top = boosting ? AIRSHIP_BOOST_SPEED : AIRSHIP_SPEED;
    // Momentum, so the ship feels heavy rather than like a cursor. It takes
    // about a second and a half to reach cruise and rather longer to stop.
    const wanted = moving ? top : 0;
    v.thrust += (Math.min(1, wanted / AIRSHIP_BOOST_SPEED) - v.thrust) * Math.min(1, dt * (moving ? 0.9 : 1.6));

    if (moving) {
      const dir = this.camera.transformInput(mv.x, mv.y);
      const len = Math.hypot(dir.x, dir.z) || 1;
      const target = Math.atan2(dir.x / len, dir.z / len);
      let diff = target - v.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      v.facing += diff * Math.min(1, dt * 2.4);
      // Heel into the turn, proportional to how hard it is turning.
      v.rig.root.userData.targetRoll = Math.max(-0.34, Math.min(0.34, -diff * 1.1));
    } else {
      v.rig.root.userData.targetRoll = 0;
    }

    const speed = v.thrust * AIRSHIP_BOOST_SPEED;
    v.x += Math.sin(v.facing) * speed * dt;
    v.z += Math.cos(v.facing) * speed * dt;

    // Clamp to the map, with a margin so the ship never leaves the ground
    // plane behind and floats over the void.
    const w = this.map.grid.w * TILE, h = this.map.grid.h * TILE;
    v.x = Math.max(TILE, Math.min(w - TILE, v.x));
    v.z = Math.max(TILE, Math.min(h - TILE, v.z));

    v.rig.root.position.x = v.x;
    v.rig.root.position.z = v.z;
    v.rig.root.rotation.y = v.facing;

    // Crossing prompt, at the edge of the world.
    //
    // Offered only in the air. A continent with no road to it is the whole
    // reason the airship exists, and letting a walker paddle across would
    // undo that in one line.
    const cross = this.mapDef.crossing;
    if (cross && this._atCrossingEdge(cross.edge)) {
      this.promptEl.textContent = cross.prompt ?? 'Cross';
      this.promptEl.classList.remove('hidden');
      if (input.justPressed('confirm')) {
        this.busy = true;
        this.onExit?.({ to: cross.to, spawn: cross.spawn, byAir: true });
      }
      return;
    }

    // Landing prompt.
    const landable = this.canLand();
    this.promptEl.textContent = landable ? 'Land' : '';
    this.promptEl.classList.toggle('hidden', !landable);
    if (landable && input.justPressed('confirm')) this.disembark(this.game);
  }

  _updateFollowers(dt) {
    // Followers walk the leader's recent path, spaced behind them. Simple
    // breadcrumb trailing beats any steering behaviour for a party line: it
    // guarantees they never take a shortcut through a wall.
    if (!this.followers.length) return;
    this._trail = this._trail || [];
    const last = this._trail[0];
    if (!last || Math.hypot(this.player.x - last.x, this.player.z - last.z) > 0.16) {
      this._trail.unshift({ x: this.player.x, z: this.player.z });
      if (this._trail.length > 240) this._trail.pop();
    }
    const spacing = 9;   // breadcrumbs between party members
    this.followers.forEach((f, i) => {
      const idx = Math.min(this._trail.length - 1, spacing * (i + 1));
      const target = this._trail[idx];
      if (!target) return;
      const dx = target.x - f.x, dz = target.z - f.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        const step = Math.min(dist, RUN_SPEED * dt * (dist > 2.4 ? 1.35 : 1));
        f.x += (dx / dist) * step;
        f.z += (dz / dist) * step;
        f.targetFacing = Math.atan2(dx, dz);
        f.speed = step / Math.max(dt, 1e-5);
        f.anim.play(f.speed > WALK_SPEED * 0.92 ? 'run' : 'walk');
      } else {
        f.speed = 0;
        f.anim.play('idle');
      }
    });
  }

  _updateNPCs(dt) {
    for (const n of this.npcs) {
      if (n.def.wander) {
        n.wanderTimer -= dt;
        if (n.wanderTimer <= 0) {
          n.wanderTimer = 2 + Math.random() * 4;
          const r = n.def.wander * TILE;
          n.wx = n.homeX + (Math.random() - 0.5) * 2 * r;
          n.wz = n.homeZ + (Math.random() - 0.5) * 2 * r;
        }
        if (n.wx !== undefined) {
          const dx = n.wx - n.x, dz = n.wz - n.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.2) {
            const step = Math.min(d, 1.9 * dt);
            const to = this.map.grid.resolve(n.x, n.z, n.x + (dx / d) * step, n.z + (dz / d) * step, 0.4);
            // Keep the NPC's own collider with it, or it blocks itself.
            n.x = to.x; n.z = to.z;
            if (n.collider) { n.collider.x = n.x; n.collider.z = n.z; }
            n.targetFacing = Math.atan2(dx, dz);
            n.speed = step / Math.max(dt, 1e-5);
            n.anim.play('walk');
          } else {
            n.speed = 0;
            n.anim.play(n.def.clip || 'idle');
          }
        }
      }
      // Turn to look at the player when they come close.
      if (n.def.facePlayer !== false) {
        const d = Math.hypot(this.player.x - n.x, this.player.z - n.z);
        if (d < 2.6 && n.speed < 0.1) n.faceTowards(this.player.x, this.player.z);
      }
    }
  }

  // --- interaction --------------------------------------------------------

  _updateInteraction() {
    // See `_interact`: nothing may start while the key that closed the last
    // one is still held.
    if (this._interactGuard) {
      if (input.isDown('confirm')) {
        this.promptEl.classList.add('hidden');
        return;
      }
      this._interactGuard = false;
    }

    // Look slightly ahead of the player so you interact with what you face.
    const ax = this.player.x + Math.sin(this.player.facing) * 0.9;
    const az = this.player.z + Math.cos(this.player.facing) * 0.9;

    let best = null;
    let bestDist = Infinity;

    for (const n of this.npcs) {
      if (!n.def.talk && !n.def.shop && !n.def.inn && !n.def.event) continue;
      const d = Math.hypot(ax - n.x, az - n.z);
      if (d < 1.7 && d < bestDist) { best = { kind: 'npc', actor: n, label: n.def.prompt || 'Talk' }; bestDist = d; }
    }
    for (const it of this.map.interactables) {
      const d = Math.hypot(ax - it.at[0], az - it.at[1]);
      if (d < it.radius && d < bestDist) {
        best = { kind: 'object', obj: it, label: it.data.prompt || 'Examine' };
        bestDist = d;
      }
    }
    for (const c of this.map.chests) {
      if (c.def.opened) continue;
      const d = Math.hypot(ax - c.obj.position.x, az - c.obj.position.z);
      if (d < 1.7 && d < bestDist) { best = { kind: 'chest', chest: c, label: 'Open' }; bestDist = d; }
    }
    // A ship left on the ground is boardable from where it stands, so landing
    // somewhere remote is a decision rather than a mistake.
    if (this.parked) {
      const d = Math.hypot(ax - this.parked.x, az - this.parked.z);
      if (d < 3.4 && d < bestDist) { best = { kind: 'airship', label: 'Board' }; bestDist = d; }
    }

    this.interactTarget = best;
    if (best) {
      this.promptEl.classList.remove('hidden');
      this.promptEl.textContent = best.label;
      const pos = this._project(this.player.x, 2.3, this.player.z);
      this.promptEl.style.left = `${pos.x}px`;
      this.promptEl.style.top = `${pos.y}px`;
      if (input.justPressed('confirm')) this._interact(best);
    } else {
      this.promptEl.classList.add('hidden');
    }
  }

  _project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.game.renderer.camera);
    const rect = this.game.renderer.canvas.getBoundingClientRect();
    return {
      x: (v.x * 0.5 + 0.5) * rect.width,
      y: (-v.y * 0.5 + 0.5) * rect.height,
    };
  }

  _interact(target) {
    const self = this;
    this.busy = true;
    // The press that *ends* a conversation is still flagged for the rest of
    // this tick. Without a guard, `_updateInteraction` sees it again the
    // moment `busy` clears and starts the same conversation over — so a
    // one-page line could never be dismissed at all. Hold interaction until
    // confirm is physically released.
    this._interactGuard = true;
    scheduler.run(function* () {
      try {
        if (target.kind === 'npc') {
          const n = target.actor;
          n.faceTowards(self.player.x, self.player.z);
          yield* self.runNPC(n);
        } else if (target.kind === 'chest') {
          yield* self.openChest(target.chest);
        } else if (target.kind === 'object') {
          yield* self.runObject(target.obj);
        } else if (target.kind === 'airship') {
          self.board(self.game);
        }
      } finally {
        self.busy = false;
      }
    }, 'interact');
  }

  *runNPC(n) {
    const def = n.def;
    if (def.event && this.game.runEvent) {
      yield* this.game.runEvent(def.event, { field: this, npc: n });
      return;
    }
    if (def.shop && this.game.openShop) {
      if (def.talk) yield* this.dialogue.speak(def.name, [].concat(def.talk), { keepOpen: true });
      this.dialogue.close();
      yield* this.game.openShop(def.shop, this);
      return;
    }
    if (def.inn && this.game.openInn) {
      yield* this.game.openInn(def.inn, this, def);
      return;
    }
    const lines = typeof def.talk === 'function' ? def.talk(this.game) : def.talk;
    yield* this.dialogue.speak(def.name, [].concat(lines || ['…']));
  }

  *openChest(chest) {
    const lid = chest.obj.userData.lid;
    if (lid) yield* tween(0, -2.1, 0.35, (v) => { lid.rotation.x = v; }, EASE.backOut);
    chest.def.opened = true;
    const contents = chest.def.contains;
    if (this.game.grantChest) yield* this.game.grantChest(contents, this);
    else yield* this.dialogue.speak(null, [`Found ${contents?.label || 'nothing'}.`]);
  }

  *runObject(it) {
    const data = it.data;
    if (data.event && this.game.runEvent) {
      yield* this.game.runEvent(data.event, { field: this, object: it });
      return;
    }
    if (data.save && this.game.openSaveMenu) {
      yield* this.game.openSaveMenu(this);
      return;
    }
    if (data.shop && this.game.openShop) {
      if (data.text) yield* this.dialogue.speak(data.name ?? null, [].concat(data.text), { keepOpen: true });
      this.dialogue.close();
      yield* this.game.openShop(data.shop, this);
      return;
    }
    if (data.airship) {
      if (!this.game.party.hasFlag('airship')) {
        yield* this.dialogue.speak(null, ['A mooring mast, and nothing moored to it.']);
        return;
      }
      const go = yield* this.dialogue.ask('Board the Gallowglass?', ['Board', 'Not yet'],
        { speaker: null, cancelable: true });
      this.dialogue.close();
      if (go === 0) this.board(this.game);
      return;
    }
    yield* this.dialogue.speak(data.name || null, [].concat(data.text || ['Nothing of note.']));
  }

  // --- exits & encounters -------------------------------------------------

  _checkTriggers() {
    const t = this.map.grid.triggerAt(this.player.x, this.player.z);
    if (!t) { this._lastTrigger = null; return; }
    if (this._lastTrigger === t) return;
    this._lastTrigger = t;
    // `once` triggers arm a story flag rather than a per-instance boolean, so
    // they stay fired across a save/load and a re-entry to the map.
    //
    // The flag is armed *after* the scene finishes, not on entry. Setting it
    // on entry looks equivalent and is not: a player who flees the fight, or
    // reloads mid-scene, or closes the tab, would have spent the trigger
    // without ever seeing what it was for, and the content would be gone for
    // that save permanently.
    const onceKey = t.data?.once
      ? `trigger:${this.mapDef.id}:${t.data.event || t.x},${t.z}`
      : null;
    if (onceKey && this.game.party.hasFlag(onceKey)) return;

    if (t.kind === 'exit') {
      if (onceKey) this.game.party.setFlag(onceKey);
      this.onExit?.(t.data);
    } else if (t.kind === 'event' && this.game.runEvent) {
      const self = this;
      this.busy = true;
      scheduler.run(function* () {
        try {
          yield* self.game.runEvent(t.data.event, { field: self, trigger: t });
          if (onceKey) self.game.party.setFlag(onceKey);
        } finally { self.busy = false; }
      }, 'trigger');
    }
  }

  /**
   * The encounter table for wherever the player is standing.
   *
   * A continent that rolls one table everywhere makes the whole map feel like
   * one place. Zones are authored rectangles in tile space, checked in order,
   * so a small dangerous pocket can sit inside a larger safe region.
   */
  currentEncounterTable() {
    const zones = this.mapDef.encounterZones;
    if (zones) {
      const tx = this.player.x / TILE;
      const tz = this.player.z / TILE;
      for (const z of zones) {
        const [x, zz, w, h] = z.rect;
        if (tx >= x && tx < x + w && tz >= zz && tz < zz + h) {
          return this.game.encounterTable?.(z.table) ?? null;
        }
      }
    }
    return this.mapDef.encounters ?? null;
  }

  _rollEncounterThreshold() {
    const enc = this.currentEncounterTable();
    if (!enc) return Infinity;
    // Distance-based rather than time-based, so standing still is safe and
    // running doesn't inflate the rate.
    const base = enc.rate ?? 26;
    return base * (0.55 + Math.random() * 0.9);
  }

  _accumulateSteps(distance) {
    if (!this.onEncounter) return;
    const table = this.currentEncounterTable();
    if (!table) return;
    if (this.game.party?.hasEncounterWard?.()) return;
    this.stepAccum += distance;
    if (this.stepAccum >= this.encounterThreshold) {
      this.stepAccum = 0;
      this.encounterThreshold = this._rollEncounterThreshold();
      this.onEncounter(table);
    }
  }

  /**
   * Rebuild the follower line from the current party.
   *
   * Called after a recruitment or a formation change so the new member walks
   * out of the scene with everyone else instead of appearing on the next map
   * load.
   */
  refreshParty() {
    for (const f of this.followers) this.game.renderer.scene.remove(f.root);
    this.followers.length = 0;
    const defs = this.game.party.activeCharacterDefs();
    for (let i = 1; i < Math.min(defs.length, 4); i++) {
      const built = buildCharacter(defs[i]);
      this.game.renderer.scene.add(built.root);
      const actor = new Actor(defs[i], built);
      actor.place(this.player.x, this.player.z, this.player.facing);
      this.followers.push(actor);
    }
  }

  // --- helpers for cutscenes ---------------------------------------------

  actorById(id) {
    if (id === 'player' || id === this.player.def.id) return this.player;
    return this.npcs.find((n) => n.def.id === id)
      || this.followers.find((f) => f.def.id === id)
      || null;
  }

  /** Walk an actor to a tile position. Use inside a cutscene coroutine. */
  *walkTo(actor, tileX, tileZ, speed = WALK_SPEED) {
    const tx = tileX * TILE + TILE / 2;
    const tz = tileZ * TILE + TILE / 2;
    actor.anim.play('walk');
    while (true) {
      const dt = yield { kind: 'tick' };
      const dx = tx - actor.x, dz = tz - actor.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) break;
      const step = Math.min(d, speed * dt);
      actor.x += (dx / d) * step;
      actor.z += (dz / d) * step;
      actor.targetFacing = Math.atan2(dx, dz);
      actor.speed = speed;
    }
    actor.speed = 0;
    actor.anim.play('idle');
  }
}
