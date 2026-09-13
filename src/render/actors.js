import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { hash } from '../core/rng.js';

const loader = new GLTFLoader();
const cache = new Map();

function getGLTF(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
}

function cleanClipName(name) {
  return name.split('|').at(-1).replace(/\.\d+$/, '').toLowerCase().replace(/[\s-]+/g, '_');
}

function firstMatching(clips, patterns) {
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'i');
    const clip = clips.find((candidate) => regex.test(cleanClipName(candidate.name)));
    if (clip) return clip;
  }
  return null;
}

export class Actor {
  constructor(gltf, options = {}) {
    this.root = new THREE.Group();
    this.root.name = options.name ?? 'actor';
    this.model = clone(gltf.scene);
    this.root.add(this.model);
    this.clips = gltf.animations ?? [];
    this.rules = options.rules ?? {};
    this.once = new Set(options.once ?? []);
    this.actions = new Map();
    this.current = null;
    this.fallback = options.fallback ?? {};
    this.mixer = this.clips.length ? new THREE.AnimationMixer(this.model) : null;

    this.model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) {
        const copy = material => { const owned = material.clone(); owned.roughness = Math.max(.55, owned.roughness ?? .75); return owned; };
        node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material);
      }
    });

    const initialBox = new THREE.Box3().setFromObject(this.model);
    const sourceHeight = Math.max(.001, initialBox.max.y - initialBox.min.y);
    const scale = (options.height ?? 1.75) / sourceHeight * (options.scale ?? 1);
    this.model.scale.setScalar(scale);
    this.model.updateMatrixWorld(true);
    const grounded = new THREE.Box3().setFromObject(this.model);
    this.model.position.y -= grounded.min.y;
    this.height = grounded.max.y - grounded.min.y;
    this.baseOffset = this.model.position.y;
    this.poseBounds = new THREE.Box3();
    this.rootWorld = new THREE.Vector3();
    this.rootScale = new THREE.Vector3();
    this.play('idle', 0);
  }

  findClip(label) {
    if (!this.clips.length) return null;
    const desired = this.rules[label];
    const patterns = Array.isArray(desired) ? desired : desired ? [`^${desired}$`, desired] : [`^${label}$`, label];
    let clip = firstMatching(this.clips, patterns);
    if (!clip && this.fallback[label]) clip = this.findClip(this.fallback[label]);
    if (!clip && label === 'run') clip = this.findClip('walk');
    if (!clip && label !== 'idle') clip = this.findClip('idle');
    return clip ?? this.clips[0];
  }

  play(label, fade = .18) {
    const clip = this.findClip(label);
    if (!clip || !this.mixer) return false;
    const key = clip.uuid;
    if (this.current?.key === key && !this.once.has(label)) {
      // Walk/run can share one authored clip. A gait change must still change
      // its speed and semantic state, without restarting the skeleton pose.
      this.current.action.setEffectiveTimeScale(label === 'run' ? 1.75 : 1);
      this.current.label = label; this.root.userData.animation = label;
      return true;
    }
    const action = this.actions.get(key) ?? this.mixer.clipAction(clip);
    this.actions.set(key, action);
    action.enabled = true;
    action.setEffectiveTimeScale(label === 'run' ? 1.75 : 1);
    action.setLoop(this.once.has(label) ? THREE.LoopOnce : THREE.LoopRepeat, this.once.has(label) ? 1 : Infinity);
    action.clampWhenFinished = this.once.has(label);
    action.reset().fadeIn(fade).play();
    if (this.current?.action && this.current.action !== action) this.current.action.fadeOut(fade);
    if (this.current?.label === 'dead' && label !== 'dead') this.model.position.y = this.baseOffset;
    this.current = { key, action, label };
    this.groundClock = 0;
    this.root.userData.animation = label;
    return true;
  }

  face(target) {
    const dx = target.x - this.root.position.x;
    const dz = target.z - this.root.position.z;
    if (dx * dx + dz * dz > .0001) this.root.rotation.y = Math.atan2(dx, dz);
  }

  update(dt) {
    this.mixer?.update(dt);
    if (this.current?.label !== 'dead') return;
    this.groundClock += dt;
    if (this.groundClock < .05) return;
    this.groundClock = 0;
    // The death clip changes the skeleton's lowest point. Its bind-pose offset
    // cannot keep the final body on the floor, so ground the evaluated pose.
    this.root.updateWorldMatrix(true, true);
    this.model.traverse(node => { if (node.isSkinnedMesh) node.computeBoundingBox(); });
    this.poseBounds.setFromObject(this.model);
    this.root.getWorldPosition(this.rootWorld);
    this.root.getWorldScale(this.rootScale);
    this.model.position.y -= (this.poseBounds.min.y - this.rootWorld.y) / this.rootScale.y;
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.model.traverse(node => {
      node.skeleton?.dispose();
      if (Array.isArray(node.material)) node.material.forEach(material => material.dispose()); else node.material?.dispose();
    });
    this.root.removeFromParent();
  }
}

function crowdModel(npc, table) {
  const hint = `${npc.id} ${npc.name}`.toLowerCase();
  for (const role of ['elder', 'smith', 'baker', 'child', 'miller', 'fisherwoman', 'weaver', 'farmhand', 'carter']) {
    const id = `villager_${role}`;
    if (hint.includes(role) && table.models[id]) return id;
  }
  const crowd = table.crowd ?? Object.keys(table.models);
  return crowd[hash(JSON.stringify(npc.look ?? npc.id)) % crowd.length];
}

export async function createCharacter(identity, charModels, options = {}) {
  const id = charModels.cast?.[identity.id] ?? crowdModel(identity, charModels);
  const file = charModels.models[id]?.file ?? `${id}.glb`;
  const gltf = await getGLTF(`./content/assets/cast/${file}`);
  return new Actor(gltf, {
    name: identity.name,
    height: identity.look?.height ?? options.height ?? 1.72,
    scale: options.scale ?? 1,
    rules: { idle: 'idle', walk: 'walk', run: charModels.clips?.run ?? 'walk', loiter: charModels.clips?.loiter ?? 'idle' },
    fallback: { run: 'walk', walk: 'idle', attack: 'idle', cast: 'attack', hurt: 'idle', dead: 'idle', victory: 'idle' },
    once: charModels.once,
  });
}

export async function createEnemy(enemy, monsterModels, variant = 0) {
  const plan = enemy.look?.plan ?? 'quadruped';
  const choices = monsterModels.plans[plan] ?? monsterModels.plans.quadruped;
  const selected = enemy.look?.model
    ? { id: enemy.look.model.replace(/\.glb$/, '') }
    : choices[(hash(enemy.id) + variant) % choices.length];
  const gltf = await getGLTF(`./content/assets/monsters/${selected.id}.glb`);
  return new Actor(gltf, {
    name: enemy.name,
    height: plan === 'floater' ? 1.45 : 1.65,
    scale: enemy.look?.scale ?? 1,
    rules: monsterModels.clips,
    fallback: monsterModels.fallback,
    once: monsterModels.once,
  });
}

export async function loadPropModel(name) {
  try {
    const gltf = await getGLTF(`./content/assets/props/${name}.glb`);
    const model = clone(gltf.scene);
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true; node.receiveShadow = true;
        node.geometry = node.geometry.clone();
        node.material = Array.isArray(node.material) ? node.material.map(material => material.clone()) : node.material.clone();
      }
    });
    return model;
  } catch { return null; }
}

export function assetProgress(callback) {
  THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => callback(loaded / Math.max(1, total));
}
