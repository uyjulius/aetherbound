import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { toonMaterial } from '../fx/materials.js';
import { analytics, EV } from '../engine/analytics.js';

/**
 * Monster models, loaded from glTF.
 *
 * These are modelled and animated by people. What they replace was 700 lines
 * of JavaScript bolting spheres, cones and cylinders together into "a body
 * plan", animated by sine waves — the same approach that was thrown out for
 * the party, and it read the same way: like an equation rather than a
 * creature.
 *
 * Licences are in `assets/monsters/CREDITS.md`; most of the roster is CC0 and
 * five models are CC-BY, so the credits are a requirement rather than a
 * courtesy.
 */

/**
 * The roster, grouped by the body plan the bestiary is written against.
 *
 * Four models per plan. The game has 200 enemies and 36 models, so a species
 * is assigned by a hash of its own look — the same creature always appears as
 * the same model — and told apart by size and tint rather than by having 200
 * separate meshes.
 */
export const MONSTER_MODELS = {
  quadruped: [
    { id: 'quadruped_wolf', title: 'Wolf' }, { id: 'quadruped_fox', title: 'Fox' },
    { id: 'quadruped_bull', title: 'Bull' }, { id: 'quadruped_husky', title: 'Husky' },
  ],
  humanoid: [
    { id: 'humanoid_goblin', title: 'Goblin' }, { id: 'humanoid_zombie', title: 'Zombie' },
    { id: 'humanoid_bigarm', title: 'Big Arm' }, { id: 'humanoid_wizard', title: 'Wizard' },
  ],
  undead: [
    { id: 'undead_zombie', title: 'Zombie' }, { id: 'undead_skeleton', title: 'Skeleton' },
    { id: 'undead_skeleton2', title: 'Skeleton' }, { id: 'undead_skeleton3', title: 'Skeleton' },
  ],
  insect: [
    { id: 'insect_spider', title: 'Spider' }, { id: 'insect_crab', title: 'Crab' },
    { id: 'insect_armabee', title: 'Armabee' }, { id: 'insect_armabeeevolved', title: 'Armabee Evolved' },
  ],
  avian: [
    { id: 'avian_dragon', title: 'Dragon' }, { id: 'avian_dragon2', title: 'Dragon' },
    { id: 'avian_bat', title: 'Bat' }, { id: 'avian_glub', title: 'Glub' },
  ],
  construct: [
    { id: 'construct_mech', title: 'Mech' }, { id: 'construct_robot', title: 'Robot' },
    { id: 'construct_robotenemy', title: 'Robot Enemy' }, { id: 'construct_robotenemylarge', title: 'Robot Enemy Large' },
  ],
  plant: [
    { id: 'plant_mushroomking', title: 'Mushroom King' }, { id: 'plant_cactoro', title: 'Cactoro' },
    { id: 'plant_cactoro2', title: 'Cactoro' }, { id: 'plant_carnivoreplant', title: 'Carnivore Plant' },
  ],
  blob: [
    { id: 'blob_slime', title: 'Slime' }, { id: 'blob_slime2', title: 'Slime' },
    { id: 'blob_pinkslime', title: 'Pink Slime' }, { id: 'blob_slimeenemy', title: 'Slime Enemy' },
  ],
  floater: [
    { id: 'floater_tentacle', title: 'Tentacle' }, { id: 'floater_mantaray', title: 'Manta Ray' },
    { id: 'floater_flyingenemy', title: 'Flying Enemy' }, { id: 'floater_blobfish', title: 'Blobfish' },
  ],
};

/**
 * Game clip → whatever the artist happened to call it.
 *
 * The roster comes from about eight different packs and no two agree on
 * names: an attack is `Attack`, `Punch`, `Bite_Front`, `Spider_Attack`,
 * `Headbutt` or `attack` depending on who made it. Rather than a table with a
 * line per model, each game clip carries an ordered list of patterns and
 * takes the first authored clip that matches — so a new model usually needs
 * no mapping at all.
 */
export const CLIP_PATTERNS = {
  idle: [/^idle$/i, /flying_idle/i, /_idle$/i, /^idle/i, /idle/i, /swimming_normal/i, /^swim$/i],
  attack: [/^attack$/i, /_attack$/i, /attack(?!_ranged)/i, /bite_front/i, /bite/i,
    /punch/i, /headbutt/i, /^kick$/i, /_kick$/i, /shoot/i],
  cast: [/spell/i, /attack_ranged/i, /shoot/i, /^no$/i, /^yes$/i, /dance/i],
  hurt: [/hitreact/i, /hitrecieve/i, /recievehit/i, /_hit$/i, /^hit$/i],
  dead: [/death/i, /^dead$/i],
  walk: [/^walk$/i, /_walk$/i, /walking/i, /^moving$/i, /gallop$/i, /fast_flying/i,
    /flying/i, /swimming_fast/i, /crawl/i],
  run: [/^run$/i, /running/i, /gallop/i, /fast_flying/i, /_run$/i],
};

/** Clips that play once and hold their last frame. */
export const ONCE_CLIPS = new Set(['attack', 'cast', 'hurt', 'dead']);

/** Where each game clip falls back to when a model has nothing matching. */
export const FALLBACK = { cast: 'attack', run: 'walk', walk: 'idle', hurt: 'idle', attack: 'idle', dead: 'idle' };

const loaded = new Map();

/**
 * The glTF clip names arrive as `CharacterArmature|…|Idle`, sometimes nested
 * several deep and sometimes with a `.001` suffix. Only the tail carries
 * meaning.
 */
function clipKey(name) {
  const tail = name.split('|').pop() ?? name;
  return tail.replace(/\.\d+$/, '');
}

/** Load the whole bestiary's models. Called once at boot. */
export async function loadMonsterModels(base = 'assets/monsters/', onProgress = null) {
  const loader = new GLTFLoader();
  const all = Object.entries(MONSTER_MODELS).flatMap(([plan, list]) =>
    list.map((m) => ({ ...m, plan })));
  let done = 0;

  await Promise.all(all.map(async (spec) => {
    try {
      const gltf = await loader.loadAsync(`${base}${spec.id}.glb`);
      const clips = new Map();
      for (const clip of gltf.animations) {
        const key = clipKey(clip.name);
        if (!clips.has(key)) clips.set(key, clip);
      }

      const box = new THREE.Box3().setFromObject(gltf.scene);
      loaded.set(spec.id, {
        scene: gltf.scene,
        clips,
        plan: spec.plan,
        title: spec.title,
        nativeHeight: Math.max(0.001, box.max.y - box.min.y),
        // Artists disagree about where a model's origin sits; assuming zero
        // leaves half the bestiary hovering or buried.
        footOffset: box.min.y,
        resolved: resolveClips(clips),
      });
    } catch (err) {
      // A monster that fails to load does not throw — the battle stages an
      // empty group and the fight looks broken. Production once shipped with
      // the whole bestiary missing and a green deploy; this is how that gets
      // noticed from a player's machine rather than from a screenshot.
      console.warn(`[monsters] ${spec.id} (${spec.title}) failed — ${err.message}`);
      analytics.track(EV.ASSET_FAILED, {
        kind: 'monster', id: spec.id, title: spec.title, plan: spec.plan,
        message: String(err.message).slice(0, 200),
      });
    }
    onProgress?.(++done / all.length, spec.title);
  }));

  return loaded.size;
}

/** Work out, once per model, which authored clip serves each game clip. */
function resolveClips(clips) {
  const names = [...clips.keys()];
  const out = {};
  for (const [game, patterns] of Object.entries(CLIP_PATTERNS)) {
    for (const re of patterns) {
      const hit = names.find((n) => re.test(n));
      if (hit) { out[game] = hit; break; }
    }
  }
  // Resolve fallbacks after the direct matches, so `cast → attack` can find
  // an attack that was itself matched by pattern.
  for (const game of Object.keys(CLIP_PATTERNS)) {
    let seen = 0;
    let key = game;
    while (!out[key] && FALLBACK[key] && seen++ < 4) key = FALLBACK[key];
    if (!out[game]) out[game] = out[key] ?? names[0] ?? null;
  }
  return out;
}

/**
 * Which model plays this creature.
 *
 * Keyed off the look, so the same species is always the same creature without
 * anyone authoring a table of two hundred entries. `look.model` overrides it
 * where a specific boss wants a specific mesh.
 */
export function modelForLook(look = {}) {
  const plan = MONSTER_MODELS[look.plan] ? look.plan : 'humanoid';
  const list = MONSTER_MODELS[plan].filter((m) => loaded.has(m.id));
  if (!list.length) return null;
  if (look.model && loaded.has(look.model)) return look.model;

  const seed = JSON.stringify([look.plan, look.color, look.accent, look.eyeColor, look.scale]);
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return list[h % list.length].id;
}

export function monsterModelIds() { return [...loaded.keys()]; }

/**
 * Instance a monster.
 *
 * `SkeletonUtils.clone`, because a plain clone shares the skeleton and a rank
 * of six identical creatures would all be posed by whichever one animated
 * last.
 */
export function instanceMonster(modelId, { height = 1.7, tint = null } = {}) {
  const entry = loaded.get(modelId) ?? loaded.values().next().value;
  if (!entry) return null;

  const root = new THREE.Group();
  const scene = skeletonClone(entry.scene);
  const s = height / entry.nativeHeight;
  scene.scale.setScalar(s);
  scene.position.y = -entry.footOffset * s;
  root.add(scene);

  scene.traverse((o) => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    o.castShadow = true;
    o.receiveShadow = false;
    const src = Array.isArray(o.material) ? o.material : [o.material];
    const next = src.map((m) => toonMaterial({
      map: m.map ?? null,
      // The artist's own colours, always.
      //
      // An earlier version painted the whole creature with the species colour
      // from the bestiary data. On a textured model that muddies someone's
      // hand-painted work, and on an untextured one it is worse: those models
      // carry a separate material per part — trunk, body, eyes — and a single
      // tint collapses all of them into one flat silhouette. The Hollybound
      // came out as a dark blob with a hat. Species are told apart by which
      // creature they are and how big it is, which is how the genre has
      // always done it.
      color: m.map ? '#ffffff' : (m.color?.getHexString ? `#${m.color.getHexString()}` : '#ffffff'),
      ramp: 'character',
      skinning: true,
    }));
    o.material = Array.isArray(o.material) ? next : next[0];
  });

  return { root, scene, clips: entry.clips, resolved: entry.resolved, scale: s, title: entry.title };
}
