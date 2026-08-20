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
 * The fourteen playable characters are *this game's* models: generated from their own entries
 * in the character table — build, height, hair and every garment colour — reconstructed into a
 * mesh, rigged, and animated with the eight clips the game asks for by name. See
 * `tools/genconcept.mjs`, `tools/genmesh.mjs` and `tools/blender/rig_character.py`; the concept
 * views they were made from are in `assets/concepts/`.
 *
 * Under them is the crowd: nine models from poly.pizza that every NPC in the world is picked
 * from by a hash of their appearance. They stay because a villager should not be one of the
 * party wearing a different hat, and because a table of two hundred named villagers is not a
 * thing anybody should author.
 */
export const CHARACTER_MODELS = {
  // --- the party, generated for this game ---------------------------------
  vesna:     { file: 'vesna.glb', title: 'Vesna' },
  corvin:    { file: 'corvin.glb', title: 'Corvin' },
  aurelian:  { file: 'aurelian.glb', title: 'Aurelian' },
  bastian:   { file: 'bastian.glb', title: 'Bastian' },
  idris:     { file: 'idris.glb', title: 'Idris' },
  maret:     { file: 'maret.glb', title: 'Maret' },
  osric:     { file: 'osric.glb', title: 'Osric' },
  tam:       { file: 'tam.glb', title: 'Tam' },
  ilsabet:   { file: 'ilsabet.glb', title: 'Ilsabet' },
  oda:       { file: 'oda.glb', title: 'Oda' },
  kestrel:   { file: 'kestrel.glb', title: 'Kestrel' },
  rusk:      { file: 'rusk.glb', title: 'Rusk' },
  wick:      { file: 'wick.glb', title: 'Wick' },
  themask:   { file: 'themask.glb', title: 'The Mask' },

  // --- the crowd, from poly.pizza under CC-BY -----------------------------
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
 * Who an NPC may be drawn as. The party is deliberately not in here.
 */
export const CROWD = ['cubeguy', 'cubewoman', 'panda', 'mako', 'rabbit',
  'rabbitblond', 'rabbitcyan', 'rabbitpig', 'rabbitgrey'];

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
 * Which model plays which character: their own.
 *
 * This used to spread the party across nine stock models — two cube people, a panda, a robot
 * and the rabbits — so that the line-up read as an ensemble rather than as the same doll five
 * times. That was the right answer while the models were somebody else's. Now each of the
 * fourteen has a mesh made from their own entry in the character table, so the mapping is an
 * identity and the interesting part moved into the generator.
 *
 * Anyone not named here — every NPC in the game — is still picked from `CROWD` by a hash of
 * their appearance, so a given villager is always the same villager without anyone authoring
 * a table of two hundred of them.
 */
export const CAST = {
  vesna: 'vesna',
  corvin: 'corvin',
  aurelian: 'aurelian',
  bastian: 'bastian',
  idris: 'idris',
  maret: 'maret',
  osric: 'osric',
  tam: 'tam',
  ilsabet: 'ilsabet',
  oda: 'oda',
  kestrel: 'kestrel',
  rusk: 'rusk',
  wick: 'wick',
  themask: 'themask',
};

export function modelFor(def = {}) {
  if (def.id && CAST[def.id]) return CAST[def.id];
  // From the crowd only: an NPC who is Vesna in a different coat is worse than an NPC who is
  // one of nine villagers.
  const ids = CROWD.filter((id) => loaded.has(id));
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
