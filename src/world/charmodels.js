import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { toonMaterial } from '../fx/materials.js';

/**
 * Character models, loaded from glTF.
 *
 * These are modelled and animated by people. The previous character was
 * geometry computed in JavaScript from capsules and lofted tubes, and the
 * animation was likewise computed — sine waves driving bone rotations. Both
 * are gone. What ships now is an artist's mesh with an artist's keyframes.
 *
 * The models come from poly.pizza under CC-BY, so `ATTRIBUTION` below is not
 * decoration: it has to appear in the credits for the licence to be met.
 */

/**
 * The cast, mapped to models.
 *
 * The pack shares one skeleton across every character, which is the reason
 * this works at all — one set of animation clips drives the whole roster, and
 * a new party member is a line in this table rather than a rigging job.
 */
export const CHARACTER_MODELS = {
  cubeguy:   { file: 'K1IczhnvQ5.glb', title: 'Cube Guy Character' },
  cubewoman: { file: '75ikp7NEDx.glb', title: 'Cube Woman Character' },
  panda:     { file: 'q1uJ28Hs8T.glb', title: 'Panda' },
  mako:      { file: '2urczqZ9Xf.glb', title: 'Mako' },
  rabbit:    { file: 'mKev485XTR.glb', title: 'Rabbit' },
  rabbitblond: { file: 'cMsI6FDhNx.glb', title: 'Rabbit Blond' },
  rabbitcyan:  { file: 'RPZ9gxcFL3.glb', title: 'Rabbit Cyan Hair' },
  rabbitpig:   { file: 'SwKX8OIlw8.glb', title: 'Rabbit With pigtails' },
  rabbitgrey:  { file: 'KRnXIKJbqp.glb', title: 'Rabbit Grey' },
};

/**
 * Game clip → the animation the artist actually authored.
 *
 * The pack names clips for a third-person action game, so a few need
 * reinterpreting: a spellcast borrows the affirmative gesture, and sitting
 * borrows the crouch. Everything here resolves to real keyframes; nothing
 * falls back to a computed pose.
 */
export const CLIP_MAP = {
  idle: 'Idle',
  loiter: 'Idle',
  walk: 'Walk',
  run: 'Run',
  battleIdle: 'Idle_Hold',
  attack: 'Punch',
  cast: 'Yes',
  hurt: 'HitReact',
  victory: 'Wave',
  dead: 'Death',
  sit: 'Duck',
  work: 'Idle_Attack',
};

/** Clips that play once and hold, rather than looping. */
export const ONCE_CLIPS = new Set(['attack', 'cast', 'hurt', 'victory', 'dead']);

/**
 * Which model plays which character.
 *
 * Chosen so the party reads as an ensemble rather than a line-up of the same
 * doll: two cube people, a panda, a robot, and the rabbits spread across the
 * rest. Anyone not named here — every NPC in the game — gets a model picked
 * from a hash of their appearance, so a given villager is always the same
 * villager without anyone having to author a table of them.
 */
const CAST = {
  vesna: 'cubewoman', corvin: 'cubeguy', wick: 'rabbitgrey',
  aurelian: 'cubeguy', bastian: 'panda', idris: 'rabbit',
  osric: 'rabbitblond', maret: 'cubewoman', tam: 'rabbitpig',
  ilsabet: 'rabbitcyan', kestrel: 'rabbitblond', oda: 'rabbit',
  rusk: 'panda', themask: 'mako',
};

export function modelFor(def = {}) {
  if (def.id && CAST[def.id]) return CAST[def.id];
  const ids = [...loaded.keys()];
  if (!ids.length) return null;
  // Stable pick from whatever identifies this character's look.
  const seed = JSON.stringify([def.id, def.build, def.hair, def.colors]);
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ids[h % ids.length];
}

const loaded = new Map();
let attribution = [];

/**
 * The glTF clip names arrive as `CharacterArmature|CharacterArmature|…|Idle`
 * and sometimes with a `.001` suffix where the exporter found duplicates.
 * Only the last segment carries meaning.
 */
function clipKey(name) {
  const tail = name.split('|').pop() ?? name;
  return tail.replace(/\.\d+$/, '');
}

/**
 * Load every model. Called once at boot, before the first character is built,
 * because `buildCharacter` is synchronous and used from map construction.
 */
export async function loadCharacterModels(base = 'assets/models/', onProgress = null) {
  const loader = new GLTFLoader();
  const entries = Object.entries(CHARACTER_MODELS);
  let done = 0;

  await Promise.all(entries.map(async ([id, spec]) => {
    try {
      const gltf = await loader.loadAsync(base + spec.file);

      // Index the clips by their meaningful name, keeping the first of any
      // duplicate pair — the `.001` variants are the same motion re-exported.
      const clips = new Map();
      for (const clip of gltf.animations) {
        const key = clipKey(clip.name);
        if (!clips.has(key)) clips.set(key, clip);
      }

      // Normalise height. The pack is authored at roughly two units tall;
      // the game measures characters in metres and positions cameras and
      // colliders against that, so the scene is scaled at instance time.
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const nativeHeight = Math.max(0.001, box.max.y - box.min.y);
      // Where the model's feet are relative to its origin. Artists do not
      // agree on this — some author from the floor, some from the hips — so
      // assuming zero leaves half the cast hovering.
      const footOffset = box.min.y;

      loaded.set(id, { scene: gltf.scene, clips, nativeHeight, footOffset, spec });
      attribution.push(spec.title);
    } catch (err) {
      console.warn(`[models] ${id} failed to load — ${err.message}`);
    }
    onProgress?.(++done / entries.length, id);
  }));

  return loaded.size;
}

export function modelIds() {
  return [...loaded.keys()];
}

export function attributionList() {
  return attribution.slice();
}

/**
 * Instance a model for one character.
 *
 * `SkeletonUtils.clone` rather than `Object3D.clone`, because a plain clone
 * shares the skeleton — every character would then be posed by whichever one
 * animated last, which looks like the whole party is possessed.
 */
export function instanceModel(modelId, { height = 1.72, tint = null } = {}) {
  const entry = loaded.get(modelId) ?? loaded.values().next().value;
  if (!entry) return null;

  const root = new THREE.Group();
  const scene = skeletonClone(entry.scene);
  const s = height / entry.nativeHeight;
  scene.scale.setScalar(s);
  // Plant the feet on y = 0, whatever the model's own origin was.
  scene.position.y = -entry.footOffset * s;
  root.add(scene);

  // Re-shade to the game's toon ramp, keeping the artist's own texture as the
  // colour map. Without this the characters are lit by a different model from
  // everything else in the scene and read as pasted on.
  scene.traverse((o) => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    o.castShadow = true;
    o.receiveShadow = false;
    const src = Array.isArray(o.material) ? o.material : [o.material];
    const next = src.map((m) => toonMaterial({
      map: m.map ?? null,
      color: tint ?? (m.map ? '#ffffff' : (m.color?.getHexString?.() ? `#${m.color.getHexString()}` : '#ffffff')),
      ramp: 'character',
      skinning: true,
    }));
    o.material = Array.isArray(o.material) ? next : next[0];
  });

  return { root, scene, clips: entry.clips, scale: s };
}
