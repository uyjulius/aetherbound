import * as THREE from 'three';
import { activeMapDefinition, isWalkable, tileAt } from '../core/data.js';
import { createCharacter, loadPropModel } from '../render/actors.js';
import { hash } from '../core/rng.js';
import { restoreParty, saveGame } from '../core/state.js';

const TILE = 2;
const GROUND_COLORS = {
  grass: '#657957', dirt: '#84694e', cobble: '#85858a', sand: '#ad9369', snow: '#d4dde0',
  wood: '#75563d', marble: '#aaa7a0', rock: '#696a69', cave: '#49484c', aether: '#456d73',
  magitek: '#586877', swamp: '#52634e', water: '#39778d',
};
const PROP_HEIGHT = {
  tree: 5.6, bush: 1.25, rock: 1.05, signpost: 1.9, lamppost: 3.5, well: 1.35,
  stall: 2.7, bench: .85, cart: 1.4, barrel: 1.1, crate: 1, flowerbox: .75,
  fence: 1.05, bridge: .55, savepoint: 1.6, chest: .85, airship: 7,
};
const FACE = { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 };

function disposeTree(root) {
  root.traverse((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
    else object.material?.dispose?.();
  });
  root.clear();
}

function paletteMaterial(color, roughness = .9) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: .02 });
}

function makeBuilding(prop) {
  const root = new THREE.Group();
  const colors = {
    plaster: ['#d2c2a4', '#6b4737'], stone: ['#807f78', '#484a4a'], wood: ['#76563d', '#493326'],
    brick: ['#9b6551', '#563d35'], marble: ['#b2b0a9', '#60656b'], magitek: ['#677581', '#273846'],
  };
  const [wall, roof] = colors[prop.style] ?? colors.plaster;
  const width = prop.w ?? 5;
  const depth = prop.d ?? 4;
  const height = (prop.h ?? 3.2) + Math.max(0, (prop.storeys ?? 1) - 1) * 1.7;
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), paletteMaterial(wall));
  body.position.y = height / 2;
  body.castShadow = body.receiveShadow = true;
  root.add(body);

  const roofHeight = prop.rise ?? 1.5;
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * .72, roofHeight, prop.roof === 'slate' ? 4 : 4), paletteMaterial(roof));
  roofMesh.position.y = height + roofHeight / 2;
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.scale.z = depth / Math.max(width, depth);
  roofMesh.castShadow = true;
  root.add(roofMesh);

  const door = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.55, .08), paletteMaterial('#382920'));
  const south = prop.door !== 'north' && prop.door !== 'east' && prop.door !== 'west';
  door.position.set(prop.door === 'east' ? width / 2 + .045 : prop.door === 'west' ? -width / 2 - .045 : 0, .78,
    prop.door === 'north' ? -depth / 2 - .045 : south ? depth / 2 + .045 : 0);
  door.rotation.y = prop.door === 'east' || prop.door === 'west' ? Math.PI / 2 : 0;
  root.add(door);
  return root;
}

function makeFallbackProp(prop) {
  const root = new THREE.Group();
  const height = PROP_HEIGHT[prop.kit] ?? 1.4;
  if (prop.kit === 'tree') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.2, .3, height * .48, 7), paletteMaterial('#604633'));
    trunk.position.y = height * .24;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(height * .28, 1), paletteMaterial(prop.kind === 'autumn' ? '#9b6542' : '#4d714b'));
    crown.position.y = height * .65;
    root.add(trunk, crown);
  } else {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.35, .48, height, 7), paletteMaterial(prop.arg && typeof prop.arg === 'string' ? prop.arg : '#7d725e'));
    mesh.position.y = height / 2;
    root.add(mesh);
  }
  root.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  return root;
}

function normalizeProp(model, prop) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const height = Math.max(.01, box.max.y - box.min.y);
  const target = PROP_HEIGHT[prop.kit] ?? 1.5;
  const scale = target / height * (Number(prop.scale) || 1);
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const grounded = new THREE.Box3().setFromObject(model);
  model.position.y -= grounded.min.y;
  return model;
}

export class World {
  constructor({ data, state, renderer, input, onDialogue, onEncounter, onToast, onHud }) {
    Object.assign(this, { data, state, renderer, input, onDialogue, onEncounter, onToast, onHud });
    this.root = renderer.worldRoot;
    this.actors = [];
    this.npcs = [];
    this.props = [];
    this.player = null;
    this.followers = [];
    this.map = null;
    this.mapId = null;
    this.width = 0;
    this.height = 0;
    this.locked = true;
    this.nearby = null;
    this.lastTile = '';
    this.walkedTiles = 0;
    this.elapsed = 0;
  }

  toWorld(at, y = 0) {
    return new THREE.Vector3((at[0] - this.width / 2) * TILE, y, (at[1] - this.height / 2) * TILE);
  }

  toTile(position) {
    return { x: position.x / TILE + this.width / 2, z: position.z / TILE + this.height / 2 };
  }

  async load(mapId = this.state.mapId, spawnId = this.state.spawn, position = this.state.position) {
    this.locked = true;
    for (const actor of this.actors) actor.dispose();
    this.actors = []; this.npcs = []; this.followers = []; this.props = [];
    disposeTree(this.root);
    this.mapId = mapId;
    this.map = activeMapDefinition(this.data, mapId, this.state.world);
    this.state.mapId = mapId;
    this.state.spawn = spawnId ?? 'default';
    this.width = Math.max(...this.map.terrain.map((row) => row.length));
    this.height = this.map.terrain.length;
    this.renderer.setEnvironment(this.map);
    this.buildTerrain();
    await Promise.all([this.buildProps(), this.buildParty(position), this.buildNpcs()]);
    this.renderer.track(this.player.root.position, true);
    this.lastTile = this.tileKey(this.player.root.position);
    this.locked = false;
    this.onHud?.(this.map);
    console.info(`FIELD_READY ${this.mapId} actors=${this.actors.length}`);
  }

  buildTerrain() {
    const groups = new Map();
    for (let z = 0; z < this.height; z += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const glyph = tileAt(this.map, x, z);
        const legend = this.data.legend.glyphs[glyph];
        if (!legend || legend.void) continue;
        const ground = legend.g ?? this.map.base ?? 'grass';
        if (!groups.has(ground)) groups.set(ground, []);
        groups.get(ground).push({ x, z, wall: legend.wall || legend.cliff, water: legend.water });
      }
    }
    const matrix = new THREE.Matrix4();
    for (const [ground, cells] of groups) {
      const wallHeight = Number(this.map.wallHeight) || 2.8;
      const geometry = new THREE.BoxGeometry(TILE, 1, TILE);
      const material = new THREE.MeshStandardMaterial({
        color: GROUND_COLORS[ground] ?? '#6f6b5d', roughness: ground === 'water' ? .3 : .95,
        metalness: ground === 'water' ? .08 : 0, transparent: ground === 'water', opacity: ground === 'water' ? .77 : 1,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
      mesh.receiveShadow = true;
      cells.forEach((cell, index) => {
        const yScale = cell.wall ? wallHeight : .18;
        const position = this.toWorld([cell.x + .5, cell.z + .5], cell.wall ? wallHeight / 2 - .08 : -.1);
        matrix.compose(position, new THREE.Quaternion(), new THREE.Vector3(1, yScale, 1));
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.root.add(mesh);
    }
  }

  async buildProps() {
    const work = (this.map.props ?? []).map(async (prop) => {
      let model;
      if (prop.kit === 'building') model = makeBuilding(prop);
      else model = normalizeProp(await loadPropModel(prop.kit) ?? makeFallbackProp(prop), prop);
      model.position.add(this.toWorld(prop.at, Number(prop.y) || 0));
      model.rotation.y += Number(prop.rot) || 0;
      model.userData.kind = 'prop';
      model.userData.definition = prop;
      this.root.add(model);
      if (prop.interact || prop.contains || prop.enter) this.props.push({ root: model, definition: prop });
      return model;
    });
    await Promise.all(work);
  }

  async buildParty(savedPosition) {
    const spawn = this.map.spawns?.[this.state.spawn] ?? this.map.spawns?.default ?? { at: [1, 1], face: 'south' };
    const start = savedPosition && this.state.mapId === this.mapId
      ? this.toWorld(savedPosition) : this.toWorld(spawn.at);
    const party = this.state.active.map((id) => this.data.characters[id]).filter(Boolean);
    for (let i = 0; i < party.length; i += 1) {
      const actor = await createCharacter(party[i], this.data.char_models, { scale: i ? .94 : 1 });
      actor.root.position.copy(start).add(new THREE.Vector3((i % 2 ? -1 : 1) * i * .55, 0, i * 1.25));
      actor.root.rotation.y = FACE[spawn.face] ?? 0;
      actor.play('idle');
      this.root.add(actor.root);
      this.actors.push(actor);
      if (i === 0) this.player = actor; else this.followers.push(actor);
    }
  }

  async buildNpcs() {
    await Promise.all((this.map.npcs ?? []).map(async (npc, index) => {
      const actor = await createCharacter(npc, this.data.char_models, { scale: npc.look?.build === 'child' ? .88 : 1 });
      actor.root.position.copy(this.toWorld(npc.at));
      actor.root.rotation.y = FACE[npc.face] ?? 0;
      actor.play(npc.clip ?? 'idle');
      this.root.add(actor.root);
      this.actors.push(actor);
      this.npcs.push({ actor, definition: npc, origin: actor.root.position.clone(), phase: hash(`${this.mapId}:${npc.id}:${index}`) / 0xffffffff * Math.PI * 2 });
    }));
  }

  tileKey(position) {
    const tile = this.toTile(position);
    return `${Math.floor(tile.x)},${Math.floor(tile.z)}`;
  }

  canStand(position) {
    const tile = this.toTile(position);
    if (!isWalkable(this.data, this.map, tile.x, tile.z)) return false;
    for (const prop of this.map.props ?? []) {
      if (prop.solid === false || prop.radius === 0) continue;
      const center = this.toWorld(prop.at);
      if (prop.kit === 'building') {
        if (Math.abs(position.x - center.x) < (prop.w ?? 5) / 2 + .35 && Math.abs(position.z - center.z) < (prop.d ?? 4) / 2 + .35) return false;
      } else {
        const radius = prop.radius ?? (prop.kit === 'tree' ? .65 : ['well', 'stall', 'cart'].includes(prop.kit) ? .8 : .45);
        if (radius > 0 && position.distanceToSquared(center) < (radius + .35) ** 2) return false;
      }
    }
    return true;
  }

  nearestInteraction() {
    if (!this.player) return null;
    const point = this.player.root.position;
    let nearest = null;
    for (const npc of this.npcs) {
      const distance = point.distanceTo(npc.actor.root.position);
      if (distance < 3.15 && (!nearest || distance < nearest.distance)) nearest = { ...npc, kind: 'npc', distance };
    }
    for (const prop of this.props) {
      const distance = point.distanceTo(prop.root.position);
      const range = prop.definition.kit === 'building' ? Math.max(3, Math.min(6, (prop.definition.w ?? 5) * .65)) : 3;
      if (distance < range && (!nearest || distance < nearest.distance)) nearest = { ...prop, kind: 'prop', distance };
    }
    return nearest;
  }

  interactionLabel(target) {
    if (!target) return '';
    const def = target.definition;
    if (target.kind === 'npc') return `${def.prompt ?? 'Speak'} · ${def.name}`;
    if (def.contains) return this.state.opened.includes(`${this.mapId}:${def.id}`) ? 'Opened chest' : 'Open chest';
    return def.interact?.prompt ?? def.interact?.name ?? def.enterPrompt ?? 'Examine';
  }

  interact() {
    const target = this.nearby;
    if (!target) return;
    if (target.kind === 'npc') {
      target.actor.face(this.player.root.position);
      const npc = target.definition;
      let lines = [...(npc.talk ?? ['They have nothing to say.'])];
      if (npc.id === 'elder' && this.state.quest.stage === 0) {
        lines = [
          'The warmth beneath Harrowmere is no spring thaw. Something old is turning below Fen Barrow.',
          'Follow the Silt Road, Vesna. Find the surveyors’ camp, and do not let them wake what they have found.',
          'Corvin knows the old mile stones. Wick knows when the earth is afraid. Trust them both.',
        ];
        this.state.quest = { id: 'warm-earth', stage: 1, text: 'Follow the Silt Road toward Fen Barrow' };
        this.onHud?.(this.map);
      }
      if (npc.inn && this.state.gold >= npc.inn.price) {
        lines.push(`${npc.inn.name} has a warm room ready. Your party rests for ${npc.inn.price} gil.`);
        this.state.gold -= npc.inn.price;
        for (const member of this.state.roster) { member.hp = member.maxHp; member.mp = member.maxMp; }
      }
      if (npc.shop) lines.push('The shelves are being inventoried for the road. Come back after the next caravan.');
      this.onDialogue?.(npc.name, lines);
      return;
    }
    const prop = target.definition;
    if (prop.interact?.save) {
      restoreParty(this.state);
      const tile = this.toTile(this.player.root.position);
      this.state.position = [tile.x, tile.z];
      this.state.checkpoint = { mapId: this.mapId, spawn: this.state.spawn, position: [...this.state.position] };
      saveGame(this.state);
      this.onHud?.(this.map, this.interactionLabel(target));
      this.onToast?.('Party restored. Journey saved at the aether mark.');
      return;
    }
    if (prop.contains) {
      const key = `${this.mapId}:${prop.id}`;
      if (this.state.opened.includes(key)) { this.onToast?.('The chest is empty.'); return; }
      this.state.opened.push(key);
      if (prop.contains.kind === 'gold') this.state.gold += prop.contains.amount ?? 0;
      if (prop.contains.kind === 'item') this.state.inventory[prop.contains.id] = (this.state.inventory[prop.contains.id] ?? 0) + (prop.contains.count ?? 1);
      this.onToast?.(`Found ${prop.contains.label ?? 'something useful'}.`);
      return;
    }
    if (prop.enter && this.data.maps[prop.enter]) { this.onExit({ to: prop.enter, spawn: 'default' }); return; }
    const lines = prop.interact?.text ?? [prop.enterPrompt ? `${prop.enterPrompt} is closed for the evening.` : 'Wind and weather have worn it smooth.'];
    this.onDialogue?.(prop.interact?.name ?? prop.enterPrompt ?? 'The road', lines);
  }

  findExit(position) {
    const tile = this.toTile(position);
    return (this.map.exits ?? []).find((exit) => tile.x >= exit.at[0] && tile.x < exit.at[0] + (exit.size?.[0] ?? 1)
      && tile.z >= exit.at[1] && tile.z < exit.at[1] + (exit.size?.[1] ?? 1));
  }

  async onExit(exit) {
    if (this.locked || !this.data.maps[exit.to]) return;
    this.state.position = null;
    this.state.spawn = exit.spawn ?? 'default';
    await this.load(exit.to, this.state.spawn);
  }

  maybeEncounter() {
    const encounters = this.map.encounters ?? this.data.encounters[this.mapId];
    if (!encounters?.groups?.length || this.walkedTiles < 6) return;
    const rate = Math.max(8, Number(encounters.rate) || 30);
    if (Math.random() >= 1 / rate) return;
    this.walkedTiles = 0;
    const total = encounters.groups.reduce((sum, group) => sum + (group.weight ?? 1), 0);
    let roll = Math.random() * total;
    let selected = encounters.groups[0];
    for (const group of encounters.groups) { roll -= group.weight ?? 1; if (roll <= 0) { selected = group; break; } }
    this.locked = true;
    this.onEncounter?.(selected.enemies);
  }

  update(dt, paused = false) {
    this.elapsed += dt;
    for (const actor of this.actors) actor.update(dt);
    if (!this.player || this.locked || paused) return;
    const axis = this.input.axis();
    const moving = Math.abs(axis.x) + Math.abs(axis.z) > .08;
    if (moving) {
      const length = Math.hypot(axis.x, axis.z) || 1;
      const running = this.input.isDown('run');
      const speed = running ? 7.5 : 4.25;
      const step = new THREE.Vector3(axis.x / length * speed * dt, 0, axis.z / length * speed * dt);
      const next = this.player.root.position.clone();
      next.x += step.x;
      if (this.canStand(next)) this.player.root.position.x = next.x;
      next.copy(this.player.root.position); next.z += step.z;
      if (this.canStand(next)) this.player.root.position.z = next.z;
      this.player.face(this.player.root.position.clone().add(step));
      this.player.play(running ? 'run' : 'walk');
      this.player.root.userData.motion = running ? 'run' : 'walk';
    } else {
      this.player.play('idle');
      this.player.root.userData.motion = 'idle';
    }

    for (let i = 0; i < this.followers.length; i += 1) {
      const follower = this.followers[i];
      const angle = this.player.root.rotation.y;
      const lateral = i % 2 ? -.72 : .72;
      const back = 1.25 + i * .75;
      const target = this.player.root.position.clone().add(new THREE.Vector3(
        Math.sin(angle) * -back + Math.cos(angle) * lateral, 0,
        Math.cos(angle) * -back - Math.sin(angle) * lateral,
      ));
      const distance = follower.root.position.distanceTo(target);
      if (distance > .12) {
        follower.face(target);
        follower.root.position.lerp(target, 1 - Math.exp(-dt * 5));
        follower.play(distance > 2.8 ? 'run' : 'walk');
      } else follower.play('idle');
    }

    for (const npc of this.npcs) {
      if (!npc.definition.wander) continue;
      const radius = npc.definition.wander * TILE;
      const target = npc.origin.clone().add(new THREE.Vector3(Math.sin(this.elapsed * .22 + npc.phase) * radius, 0, Math.cos(this.elapsed * .18 + npc.phase) * radius));
      if (npc.actor.root.position.distanceTo(target) > .35) {
        npc.actor.face(target);
        npc.actor.root.position.lerp(target, dt * .28);
        npc.actor.play('walk');
      }
    }

    this.renderer.track(this.player.root.position);
    const key = this.tileKey(this.player.root.position);
    if (key !== this.lastTile) {
      this.lastTile = key; this.state.steps += 1; this.walkedTiles += 1;
      this.state.position = Object.values(this.toTile(this.player.root.position));
      const exit = this.findExit(this.player.root.position);
      if (exit) { this.onExit(exit); return; }
      this.maybeEncounter();
    }
    const nearby = this.nearestInteraction();
    if (nearby?.definition !== this.nearby?.definition) {
      this.nearby = nearby;
      this.onHud?.(this.map, this.interactionLabel(nearby));
    }
    const location = this.toTile(this.player.root.position);
    this.state.position = [location.x, location.z];
    if (this.input.take('confirm')) this.interact();
  }
}
