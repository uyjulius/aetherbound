import * as THREE from 'three';
import { toonMaterial, outlineMaterial, aetherMaterial, aetherMaterials } from '../fx/materials.js';
import { rampAt } from '../engine/palette.js';

/**
 * Monster construction.
 *
 * Enemies are built from a small set of *body plans* — quadruped, insect,
 * humanoid, blob, avian, construct, floater, plant — each parameterised by
 * size, proportion and colour. A body plan is a hand-built armature; the data
 * files choose which plan and dress it. That gives a large bestiary that still
 * looks like one artist's menagerie, instead of a pile of unrelated shapes.
 *
 * Every monster exposes the same `joints` contract the animator drives, so all
 * of them idle, lunge, recoil and die without per-creature animation work.
 */

const geoCache = new Map();
const geo = (key, build) => {
  if (!geoCache.has(key)) geoCache.set(key, build());
  return geoCache.get(key);
};

const sphere = (r, s = 12) => geo(`s${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s - 4)));
const boxG = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cone = (r, h, s = 7) => geo(`c${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
const cylG = (rt, rb, h, s = 7) => geo(`y${rt},${rb},${h},${s}`, () => {
  const g = new THREE.CylinderGeometry(rt, rb, h, s);
  g.translate(0, -h / 2, 0);
  return g;
});
const icoG = (r, d = 0) => geo(`i${r},${d}`, () => new THREE.IcosahedronGeometry(r, d));

function part(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function monsterMaterial(color, opts = {}) {
  return toonMaterial({
    color, ramp: 'character',
    rim: { color: opts.rim || '#b8d4ff', strength: opts.rimStrength ?? 0.30, power: 3.0 },
    ...opts.material,
  });
}

/**
 * A single glowing eye, or a cluster. Eyes are the cheapest possible way to
 * make a shape read as alive and to communicate a creature's temperament.
 */
function eyes(group, { count = 2, radius = 0.09, spread = 0.22, y = 0, z = 0.3, color = '#ffd76a' }) {
  const mat = toonMaterial({ color, ramp: 'character', emissive: color, emissiveIntensity: 2.2 });
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
    const e = part(sphere(radius, 8), mat, t * spread, y + (count > 2 ? Math.abs(t) * -0.06 : 0), z);
    e.castShadow = false;
    group.add(e);
  }
  return group;
}

// ---------------------------------------------------------------------------
// Body plans
// ---------------------------------------------------------------------------

const PLANS = {
  /** Four-legged beast: wolves, boars, great cats. */
  quadruped(def) {
    const s = def.scale ?? 1;
    const skin = monsterMaterial(def.color || rampAt('bark', 0.4));
    const accent = monsterMaterial(def.accent || rampAt('bark', 0.2));
    const root = new THREE.Group();
    const joints = { root };

    const body = new THREE.Group();
    body.position.y = 0.95 * s;
    root.add(body);
    joints.body = body;

    const torso = part(icoG(0.62 * s, 1), skin);
    torso.scale.set(1.5, 0.9, 0.95);
    body.add(torso);

    const shoulders = part(icoG(0.50 * s, 1), skin, 0, 0.10 * s, 0.55 * s);
    shoulders.scale.set(1.05, 1.0, 0.9);
    body.add(shoulders);

    const neck = new THREE.Group();
    neck.position.set(0, 0.22 * s, 0.78 * s);
    body.add(neck);
    joints.neck = neck;
    neck.add(part(cylG(0.22 * s, 0.30 * s, 0.42 * s), skin, 0, 0.42 * s, 0).rotateX(0.5));

    const head = new THREE.Group();
    head.position.set(0, 0.12 * s, 0.34 * s);
    neck.add(head);
    joints.head = head;
    const skull = part(icoG(0.34 * s, 1), skin);
    skull.scale.set(0.9, 0.85, 1.25);
    head.add(skull);
    // Snout gives the silhouette a direction, which is what makes a lump a beast.
    head.add(part(cone(0.20 * s, 0.42 * s, 6), accent, 0, -0.05 * s, 0.42 * s).rotateX(Math.PI / 2));
    for (const side of [-1, 1]) {
      head.add(part(cone(0.12 * s, 0.28 * s, 4), accent, side * 0.20 * s, 0.28 * s, -0.02 * s).rotateZ(side * 0.3));
    }
    eyes(head, { count: 2, radius: 0.075 * s, spread: 0.19 * s, y: 0.08 * s, z: 0.28 * s, color: def.eyeColor || '#ffd76a' });

    // Legs
    for (const [i, [fx, fz]] of [[-1, 1], [1, 1], [-1, -1], [1, -1]].entries()) {
      const hip = new THREE.Group();
      hip.position.set(fx * 0.38 * s, -0.10 * s, fz * 0.62 * s);
      body.add(hip);
      hip.add(part(cylG(0.15 * s, 0.12 * s, 0.52 * s), skin));
      const knee = new THREE.Group();
      knee.position.y = -0.52 * s;
      hip.add(knee);
      knee.add(part(cylG(0.12 * s, 0.10 * s, 0.44 * s), skin));
      const paw = part(icoG(0.16 * s, 0), accent, 0, -0.46 * s, 0.05 * s);
      paw.scale.set(1, 0.7, 1.3);
      knee.add(paw);
      joints[`leg${i}`] = hip;
      joints[`knee${i}`] = knee;
    }

    // Tail: three segments, animated as a chain.
    let parent = body;
    joints.tail = [];
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? 0.15 * s : 0, i === 0 ? -0.85 * s : -0.30 * s);
      parent.add(seg);
      seg.add(part(cylG(0.10 * s * (1 - i * 0.22), 0.07 * s, 0.32 * s), skin, 0, 0, -0.16 * s).rotateX(Math.PI / 2));
      joints.tail.push(seg);
      parent = seg;
    }

    if (def.spines) {
      for (let i = 0; i < 5; i++) {
        const spine = part(cone(0.07 * s, 0.30 * s * (1 - Math.abs(i - 2) * 0.2), 4), accent,
          0, 0.55 * s, (0.5 - i * 0.28) * s);
        body.add(spine);
      }
    }
    return { root, joints, height: 1.8 * s };
  },

  /** Upright humanoid: bandits, soldiers, cultists, ogres. */
  humanoid(def) {
    const s = def.scale ?? 1;
    const skin = monsterMaterial(def.color || rampAt('skin1', 0.4));
    const cloth = monsterMaterial(def.accent || rampAt('clothblack', 0.5));
    const metal = monsterMaterial(def.metal || rampAt('iron', 0.6));
    const root = new THREE.Group();
    const joints = { root };

    const body = new THREE.Group();
    body.position.y = 1.10 * s;
    root.add(body);
    joints.body = body;

    const hips = part(boxG(0.52 * s, 0.34 * s, 0.34 * s), cloth);
    body.add(hips);
    const chest = new THREE.Group();
    chest.position.y = 0.30 * s;
    body.add(chest);
    joints.chest = chest;
    const torso = part(boxG(0.78 * s, 0.72 * s, 0.42 * s), cloth, 0, 0.30 * s, 0);
    chest.add(torso);
    if (def.armored) chest.add(part(boxG(0.84 * s, 0.44 * s, 0.48 * s), metal, 0, 0.36 * s, 0));

    const head = new THREE.Group();
    head.position.y = 0.86 * s;
    chest.add(head);
    joints.head = head;
    const skull = part(icoG(0.28 * s, 1), skin);
    skull.scale.set(1, 1.1, 0.95);
    head.add(skull);
    if (def.helmet) {
      head.add(part(cylG(0.30 * s, 0.32 * s, 0.30 * s, 8), metal, 0, 0.28 * s, 0));
      head.add(part(boxG(0.56 * s, 0.10 * s, 0.34 * s), metal, 0, 0.06 * s, 0));
    }
    if (def.horns) {
      for (const side of [-1, 1]) {
        head.add(part(cone(0.08 * s, 0.44 * s, 5), metal, side * 0.22 * s, 0.30 * s, 0).rotateZ(side * 0.5));
      }
    }
    eyes(head, { count: def.eyeCount ?? 2, radius: 0.055 * s, spread: 0.13 * s, y: 0.03 * s, z: 0.25 * s, color: def.eyeColor || '#e0574f' });

    for (const side of [-1, 1]) {
      const key = side < 0 ? 'L' : 'R';
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.50 * s, 0.60 * s, 0);
      chest.add(shoulder);
      shoulder.add(part(sphere(0.16 * s, 8), cloth));
      shoulder.add(part(cylG(0.13 * s, 0.11 * s, 0.46 * s), skin));
      const elbow = new THREE.Group();
      elbow.position.y = -0.46 * s;
      shoulder.add(elbow);
      elbow.add(part(cylG(0.11 * s, 0.10 * s, 0.42 * s), skin));
      const hand = part(boxG(0.18 * s, 0.20 * s, 0.16 * s), cloth, 0, -0.50 * s, 0);
      elbow.add(hand);
      joints[`arm${key}`] = shoulder;
      joints[`elbow${key}`] = elbow;
      joints[`hand${key}`] = hand;
    }

    for (const side of [-1, 1]) {
      const key = side < 0 ? 'L' : 'R';
      const hip = new THREE.Group();
      hip.position.set(side * 0.18 * s, -0.16 * s, 0);
      body.add(hip);
      hip.add(part(cylG(0.16 * s, 0.13 * s, 0.52 * s), cloth));
      const knee = new THREE.Group();
      knee.position.y = -0.52 * s;
      hip.add(knee);
      knee.add(part(cylG(0.13 * s, 0.11 * s, 0.48 * s), cloth));
      knee.add(part(boxG(0.20 * s, 0.14 * s, 0.32 * s), metal, 0, -0.54 * s, 0.06 * s));
      joints[`leg${key}`] = hip;
      joints[`knee${key}`] = knee;
    }

    if (def.weapon) {
      const w = new THREE.Group();
      if (def.weapon === 'sword') {
        w.add(part(boxG(0.09 * s, 0.95 * s, 0.04 * s), metal, 0, -0.45 * s, 0));
        w.add(part(boxG(0.26 * s, 0.07 * s, 0.09 * s), cloth, 0, 0.02 * s, 0));
      } else if (def.weapon === 'axe') {
        w.add(part(cylG(0.05 * s, 0.05 * s, 0.9 * s), cloth, 0, 0, 0));
        w.add(part(boxG(0.34 * s, 0.30 * s, 0.06 * s), metal, 0.14 * s, -0.72 * s, 0));
      } else if (def.weapon === 'spear') {
        w.add(part(cylG(0.045 * s, 0.045 * s, 1.5 * s), cloth, 0, 0.4 * s, 0));
        w.add(part(cone(0.09 * s, 0.34 * s, 5), metal, 0, 0.58 * s, 0));
      } else if (def.weapon === 'staff') {
        w.add(part(cylG(0.05 * s, 0.05 * s, 1.3 * s), cloth, 0, 0.3 * s, 0));
        const orb = part(sphere(0.14 * s, 8), monsterMaterial(def.eyeColor || '#3fc6d6', { material: { emissive: def.eyeColor || '#3fc6d6', emissiveIntensity: 2 } }), 0, 0.44 * s, 0);
        w.add(orb);
      }
      w.position.set(0, -0.50 * s, 0.08 * s);
      w.rotation.x = -0.25;
      joints.elbowR.add(w);
      joints.weapon = w;
    }
    return { root, joints, height: 2.1 * s };
  },

  /** Many-legged: spiders, mantises, scorpions. */
  insect(def) {
    const s = def.scale ?? 1;
    const shell = monsterMaterial(def.color || rampAt('foliage', 0.35));
    const soft = monsterMaterial(def.accent || rampAt('poison', 0.45));
    const root = new THREE.Group();
    const joints = { root };

    const body = new THREE.Group();
    body.position.y = 0.72 * s;
    root.add(body);
    joints.body = body;

    const abdomen = part(icoG(0.58 * s, 1), shell, 0, 0, -0.55 * s);
    abdomen.scale.set(1, 0.85, 1.25);
    body.add(abdomen);
    const thorax = part(icoG(0.40 * s, 1), shell, 0, 0.06 * s, 0.15 * s);
    body.add(thorax);

    const head = new THREE.Group();
    head.position.set(0, 0.10 * s, 0.55 * s);
    body.add(head);
    joints.head = head;
    head.add(part(icoG(0.26 * s, 1), shell));
    eyes(head, { count: def.eyeCount ?? 4, radius: 0.06 * s, spread: 0.20 * s, y: 0.06 * s, z: 0.20 * s, color: def.eyeColor || '#94bf55' });
    for (const side of [-1, 1]) {
      head.add(part(cone(0.06 * s, 0.34 * s, 4), soft, side * 0.14 * s, -0.08 * s, 0.22 * s).rotateX(1.9));
    }

    const legCount = def.legs ?? 6;
    for (let i = 0; i < legCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const along = Math.floor(i / 2) / Math.max(1, legCount / 2 - 1) - 0.5;
      const hip = new THREE.Group();
      hip.position.set(side * 0.34 * s, 0.02 * s, along * 0.75 * s);
      hip.rotation.z = side * 0.9;
      hip.rotation.y = -side * along * 0.7;
      body.add(hip);
      hip.add(part(cylG(0.055 * s, 0.045 * s, 0.52 * s), shell));
      const knee = new THREE.Group();
      knee.position.y = -0.52 * s;
      knee.rotation.z = -side * 1.7;
      hip.add(knee);
      knee.add(part(cylG(0.045 * s, 0.03 * s, 0.60 * s), shell));
      joints[`leg${i}`] = hip;
      joints[`knee${i}`] = knee;
    }

    if (def.stinger) {
      let parent = body;
      joints.tail = [];
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Group();
        seg.position.set(0, i === 0 ? 0.35 * s : 0.26 * s, i === 0 ? -0.9 * s : -0.06 * s);
        seg.rotation.x = 0.55;
        parent.add(seg);
        seg.add(part(sphere(0.14 * s * (1 - i * 0.12), 7), shell));
        joints.tail.push(seg);
        parent = seg;
      }
      parent.add(part(cone(0.09 * s, 0.34 * s, 5), soft, 0, 0.18 * s, 0));
    }
    return { root, joints, height: 1.5 * s };
  },

  /** Gelatinous: slimes, oozes, puddings. */
  blob(def) {
    const s = def.scale ?? 1;
    const jelly = toonMaterial({
      color: def.color || rampAt('poison', 0.5), ramp: 'character',
      transparent: true, opacity: 0.86,
      rim: { color: def.eyeColor || '#ffffff', strength: 0.55, power: 2.0 },
    });
    const root = new THREE.Group();
    const joints = { root };
    const body = new THREE.Group();
    body.position.y = 0.55 * s;
    root.add(body);
    joints.body = body;

    const blobMesh = part(icoG(0.78 * s, 2), jelly);
    blobMesh.scale.set(1.1, 0.85, 1.0);
    body.add(blobMesh);
    joints.blobMesh = blobMesh;
    // Inner mass: a darker core so it reads as volume rather than a bubble.
    const core = part(icoG(0.34 * s, 1), monsterMaterial(def.accent || rampAt('poison', 0.22)), 0, -0.10 * s, 0);
    body.add(core);
    eyes(body, { count: def.eyeCount ?? 2, radius: 0.10 * s, spread: 0.24 * s, y: 0.12 * s, z: 0.55 * s, color: def.eyeColor || '#f4f1e6' });
    return { root, joints, height: 1.3 * s };
  },

  /** Winged: bats, harpies, wyverns. */
  avian(def) {
    const s = def.scale ?? 1;
    const skin = monsterMaterial(def.color || rampAt('clothpurple', 0.4));
    const membrane = toonMaterial({
      color: def.accent || rampAt('clothpurple', 0.28), ramp: 'character',
      side: THREE.DoubleSide, transparent: true, opacity: 0.94,
    });
    const root = new THREE.Group();
    const joints = { root };
    const body = new THREE.Group();
    body.position.y = 1.55 * s;
    root.add(body);
    joints.body = body;

    const torso = part(icoG(0.42 * s, 1), skin);
    torso.scale.set(0.9, 1.15, 0.9);
    body.add(torso);

    const head = new THREE.Group();
    head.position.y = 0.50 * s;
    body.add(head);
    joints.head = head;
    head.add(part(icoG(0.24 * s, 1), skin));
    head.add(part(cone(0.11 * s, 0.34 * s, 5), skin, 0, -0.02 * s, 0.26 * s).rotateX(Math.PI / 2));
    for (const side of [-1, 1]) {
      head.add(part(cone(0.09 * s, 0.32 * s, 4), skin, side * 0.15 * s, 0.24 * s, -0.04 * s).rotateZ(side * 0.35));
    }
    eyes(head, { count: 2, radius: 0.06 * s, spread: 0.13 * s, y: 0.04 * s, z: 0.19 * s, color: def.eyeColor || '#ff7a2f' });

    joints.wings = [];
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.32 * s, 0.22 * s, -0.05 * s);
      body.add(wing);
      const bone = part(cylG(0.05 * s, 0.035 * s, 1.0 * s), skin, 0, 0, 0);
      bone.rotation.z = side * Math.PI / 2;
      wing.add(bone);
      for (let i = 0; i < 3; i++) {
        const panel = part(boxG(0.75 * s, 0.02 * s, 0.60 * s), membrane,
          side * (0.42 + i * 0.06) * s, -0.18 * s - i * 0.22 * s, -0.10 * s);
        panel.rotation.z = side * 0.35;
        panel.rotation.x = -0.20;
        wing.add(panel);
      }
      joints.wings.push(wing);
      joints[`wing${side < 0 ? 'L' : 'R'}`] = wing;
    }
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.16 * s, -0.38 * s, 0);
      body.add(leg);
      leg.add(part(cylG(0.07 * s, 0.05 * s, 0.44 * s), skin));
      leg.add(part(cone(0.09 * s, 0.20 * s, 4), skin, 0, -0.50 * s, 0.06 * s).rotateX(Math.PI));
      joints[`leg${side < 0 ? 'L' : 'R'}`] = leg;
    }
    return { root, joints, height: 2.2 * s, flying: true };
  },

  /** Machine: magitek armour, sentries, the Engines' children. */
  construct(def) {
    const s = def.scale ?? 1;
    const plate = monsterMaterial(def.color || rampAt('steel', 0.5));
    const dark = monsterMaterial(def.accent || rampAt('iron', 0.25));
    const glowMat = aetherMaterial({ color: def.eyeColor || '#3fc6d6', intensity: 1.6 });
    aetherMaterials.add(glowMat);
    const root = new THREE.Group();
    const joints = { root };

    const body = new THREE.Group();
    body.position.y = 1.25 * s;
    root.add(body);
    joints.body = body;

    body.add(part(boxG(1.10 * s, 0.90 * s, 0.80 * s), plate));
    body.add(part(boxG(1.20 * s, 0.18 * s, 0.88 * s), dark, 0, 0.50 * s, 0));
    // Core: the thing you are obviously meant to hit.
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 12, 10), glowMat);
    core.position.set(0, 0.05 * s, 0.44 * s);
    body.add(core);
    joints.core = core;

    const head = new THREE.Group();
    head.position.y = 0.68 * s;
    body.add(head);
    joints.head = head;
    head.add(part(boxG(0.52 * s, 0.36 * s, 0.52 * s), plate));
    eyes(head, { count: def.eyeCount ?? 1, radius: 0.09 * s, spread: 0.16 * s, y: 0, z: 0.28 * s, color: def.eyeColor || '#3fc6d6' });

    for (const side of [-1, 1]) {
      const key = side < 0 ? 'L' : 'R';
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.68 * s, 0.28 * s, 0);
      body.add(shoulder);
      shoulder.add(part(boxG(0.32 * s, 0.34 * s, 0.34 * s), dark));
      shoulder.add(part(cylG(0.13 * s, 0.11 * s, 0.52 * s), plate, 0, -0.16 * s, 0));
      const elbow = new THREE.Group();
      elbow.position.y = -0.68 * s;
      shoulder.add(elbow);
      if (def.cannons) {
        elbow.add(part(cylG(0.17 * s, 0.15 * s, 0.62 * s, 8), dark, 0, 0, 0.10 * s).rotateX(Math.PI / 2 + 0.1));
        const muzzle = new THREE.Mesh(new THREE.RingGeometry(0.06 * s, 0.14 * s, 10), glowMat);
        muzzle.position.set(0, 0.06 * s, 0.62 * s);
        elbow.add(muzzle);
      } else {
        elbow.add(part(cylG(0.12 * s, 0.10 * s, 0.46 * s), plate));
        elbow.add(part(boxG(0.24 * s, 0.24 * s, 0.24 * s), dark, 0, -0.52 * s, 0));
      }
      joints[`arm${key}`] = shoulder;
      joints[`elbow${key}`] = elbow;
    }

    if (def.treads) {
      body.position.y = 0.95 * s;
      for (const side of [-1, 1]) {
        const tread = part(boxG(0.42 * s, 0.52 * s, 1.5 * s), dark, side * 0.55 * s, -0.72 * s, 0);
        body.add(tread);
        for (let i = 0; i < 3; i++) {
          body.add(part(cylG(0.20 * s, 0.20 * s, 0.46 * s, 8), plate,
            side * 0.55 * s, -0.72 * s, (i - 1) * 0.52 * s).rotateZ(Math.PI / 2));
        }
      }
    } else {
      for (const side of [-1, 1]) {
        const key = side < 0 ? 'L' : 'R';
        const hip = new THREE.Group();
        hip.position.set(side * 0.30 * s, -0.48 * s, 0);
        body.add(hip);
        hip.add(part(cylG(0.16 * s, 0.13 * s, 0.56 * s), plate));
        const knee = new THREE.Group();
        knee.position.y = -0.56 * s;
        hip.add(knee);
        knee.add(part(cylG(0.13 * s, 0.11 * s, 0.52 * s), plate));
        knee.add(part(boxG(0.30 * s, 0.14 * s, 0.46 * s), dark, 0, -0.56 * s, 0.06 * s));
        joints[`leg${key}`] = hip;
        joints[`knee${key}`] = knee;
      }
    }
    return { root, joints, height: 2.6 * s };
  },

  /** Hovering: wisps, eyes, elementals, spectres. */
  floater(def) {
    const s = def.scale ?? 1;
    const skin = monsterMaterial(def.color || rampAt('void', 0.45));
    const root = new THREE.Group();
    const joints = { root };
    const body = new THREE.Group();
    body.position.y = 1.45 * s;
    root.add(body);
    joints.body = body;

    const core = part(icoG(0.52 * s, 2), skin);
    body.add(core);
    joints.blobMesh = core;
    eyes(body, { count: def.eyeCount ?? 1, radius: 0.16 * s, spread: 0.26 * s, y: 0.02 * s, z: 0.42 * s, color: def.eyeColor || '#ffd76a' });

    // Orbiting motes: cheap, and instantly says "magical".
    joints.motes = [];
    const moteMat = aetherMaterial({ color: def.eyeColor || '#3fc6d6', intensity: 1.8 });
    aetherMaterials.add(moteMat);
    for (let i = 0; i < 5; i++) {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 8, 6), moteMat);
      const a = (i / 5) * Math.PI * 2;
      mote.position.set(Math.cos(a) * 0.85 * s, Math.sin(a * 1.7) * 0.25 * s, Math.sin(a) * 0.85 * s);
      mote.userData.angle = a;
      body.add(mote);
      joints.motes.push(mote);
    }
    if (def.tendrils) {
      joints.tail = [];
      let parent = body;
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Group();
        seg.position.y = i === 0 ? -0.40 * s : -0.28 * s;
        parent.add(seg);
        seg.add(part(cylG(0.11 * s * (1 - i * 0.18), 0.08 * s, 0.28 * s), skin));
        joints.tail.push(seg);
        parent = seg;
      }
    }
    return { root, joints, height: 2.0 * s, flying: true };
  },

  /** Rooted: treants, mandrakes, fungal horrors. */
  plant(def) {
    const s = def.scale ?? 1;
    const bark = monsterMaterial(def.color || rampAt('bark', 0.35));
    const leaf = monsterMaterial(def.accent || rampAt('foliage', 0.45));
    const root = new THREE.Group();
    const joints = { root };
    const body = new THREE.Group();
    body.position.y = 0.9 * s;
    root.add(body);
    joints.body = body;

    body.add(part(cylG(0.42 * s, 0.62 * s, 1.4 * s), bark, 0, 0.7 * s, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      body.add(part(cylG(0.10 * s, 0.16 * s, 0.5 * s), bark,
        Math.cos(a) * 0.42 * s, -0.55 * s, Math.sin(a) * 0.42 * s).rotateZ(Math.cos(a) * 0.6));
    }
    const head = new THREE.Group();
    head.position.y = 0.85 * s;
    body.add(head);
    joints.head = head;
    for (let i = 0; i < 4; i++) {
      const lobe = part(icoG(0.42 * s - i * 0.04 * s, 1), leaf,
        Math.cos(i * 2.1) * 0.28 * s, 0.18 * s + i * 0.16 * s, Math.sin(i * 2.1) * 0.28 * s);
      head.add(lobe);
    }
    eyes(head, { count: 2, radius: 0.08 * s, spread: 0.18 * s, y: 0, z: 0.34 * s, color: def.eyeColor || '#ffe45e' });
    for (const side of [-1, 1]) {
      const key = side < 0 ? 'L' : 'R';
      const arm = new THREE.Group();
      arm.position.set(side * 0.48 * s, 0.72 * s, 0);
      body.add(arm);
      arm.rotation.z = side * 0.7;
      arm.add(part(cylG(0.11 * s, 0.08 * s, 0.72 * s), bark));
      const elbow = new THREE.Group();
      elbow.position.y = -0.72 * s;
      arm.add(elbow);
      elbow.add(part(cylG(0.08 * s, 0.06 * s, 0.56 * s), bark));
      joints[`arm${key}`] = arm;
      joints[`elbow${key}`] = elbow;
    }
    return { root, joints, height: 2.4 * s };
  },

  /** Bones: skeletons, revenants, the restless dead. */
  undead(def) {
    const built = PLANS.humanoid({ ...def, color: def.color || rampAt('plaster', 0.78), accent: def.accent || rampAt('clothblack', 0.35) });
    // Ribs and a hollow look, layered onto the humanoid frame.
    const s = def.scale ?? 1;
    const bone = monsterMaterial(def.color || rampAt('plaster', 0.78));
    for (let i = 0; i < 4; i++) {
      const rib = part(boxG(0.62 * s - i * 0.04 * s, 0.05 * s, 0.40 * s), bone, 0, 0.16 * s + i * 0.15 * s, 0.02 * s);
      built.joints.chest.add(rib);
    }
    return built;
  },
};

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildMonster(def) {
  const plan = PLANS[def.plan] || PLANS.quadruped;
  const built = plan(def);
  built.def = def;

  if (def.outline !== false) {
    const outlineMat = outlineMaterial(def.outlineWidth ?? 0.026);
    const shells = [];
    built.root.traverse((o) => { if (o.isMesh && o.geometry && o.material?.transparent !== true) shells.push(o); });
    for (const src of shells) {
      const shell = new THREE.Mesh(src.geometry, outlineMat);
      shell.position.copy(src.position);
      shell.rotation.copy(src.rotation);
      shell.scale.copy(src.scale);
      shell.renderOrder = -1;
      src.parent.add(shell);
    }
  }
  return built;
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

/**
 * Monster animator. Deliberately simple and shared: idle breathing, a forward
 * lunge for attacks, a recoil for damage, and a collapse for death. A bestiary
 * of 180 creatures cannot afford bespoke rigs, and consistent motion actually
 * helps readability in combat.
 */
export class MonsterAnimator {
  constructor(built) {
    this.m = built;
    this.j = built.joints;
    this.time = Math.random() * 10;
    this.phase = Math.random() * Math.PI * 2;
    this.clip = 'idle';
    this.actionT = 0;
    this.flying = built.flying || false;
    this.baseY = built.joints.body?.position.y ?? 1;
    this.dead = false;
  }

  play(clip) { this.clip = clip; this.actionT = 0; }

  update(dt) {
    this.time += dt;
    const j = this.j;
    const body = j.body;
    if (!body) return;
    const t = this.time;
    const breathe = Math.sin(t * 1.9 + this.phase);

    if (this.clip === 'dead') {
      this.actionT = Math.min(1, this.actionT + dt * 1.6);
      const p = this.actionT;
      body.position.y = this.baseY * (1 - p * 0.75);
      body.rotation.z = p * 0.9;
      body.rotation.x = p * 0.35;
      this.m.root.scale.setScalar(1 - p * 0.06);
      return;
    }

    body.rotation.set(0, 0, 0);
    let y = this.baseY;

    if (this.flying) {
      y += Math.sin(t * 1.5 + this.phase) * 0.16;
      body.rotation.z = Math.sin(t * 0.9 + this.phase) * 0.06;
      for (const w of j.wings || []) {
        w.rotation.z = (w.position.x < 0 ? -1 : 1) * (0.25 + Math.sin(t * 6) * 0.45);
      }
    } else {
      y += breathe * 0.035;
    }

    if (j.blobMesh) {
      // Squash-and-stretch keeps gelatinous things from reading as beach balls.
      const wob = Math.sin(t * 2.6 + this.phase);
      j.blobMesh.scale.set(1.1 + wob * 0.07, 0.85 - wob * 0.07, 1.0 + wob * 0.05);
    }
    if (j.motes) {
      for (const mote of j.motes) {
        const a = mote.userData.angle + t * 0.9;
        const r = 0.85 + Math.sin(t * 2 + mote.userData.angle) * 0.12;
        mote.position.set(Math.cos(a) * r, Math.sin(a * 1.7 + t) * 0.25, Math.sin(a) * r);
      }
    }
    if (j.head) {
      j.head.rotation.x = breathe * 0.05;
      j.head.rotation.y = Math.sin(t * 0.7 + this.phase) * 0.16;
    }
    for (const [i, seg] of (j.tail || []).entries()) {
      seg.rotation.y = Math.sin(t * 2.2 + i * 0.7 + this.phase) * 0.18;
    }
    for (let i = 0; i < 8; i++) {
      const leg = j[`leg${i}`];
      if (leg) leg.rotation.x = Math.sin(t * 2.4 + i * 1.1) * 0.06;
    }

    if (this.clip === 'attack') {
      this.actionT = Math.min(1, this.actionT + dt * 1.8);
      const p = this.actionT;
      // Coil, then snap forward, then settle.
      const lunge = p < 0.3 ? -p / 0.3 * 0.35 : p < 0.5 ? ((p - 0.3) / 0.2) * 1.7 - 0.35 : (1 - (p - 0.5) / 0.5) * 1.35;
      this.m.root.position.z = -lunge * 0.9;
      body.rotation.x = -lunge * 0.14;
      if (j.armR) j.armR.rotation.x = -lunge * 1.1;
      if (j.elbowR) j.elbowR.rotation.x = 0.4 + lunge * 0.3;
      if (p >= 1) this.play('idle');
    } else if (this.clip === 'hurt') {
      this.actionT = Math.min(1, this.actionT + dt * 3.2);
      const impact = Math.exp(-this.actionT * 5);
      this.m.root.position.z = impact * 0.42;
      body.rotation.x = impact * 0.32;
      if (this.actionT >= 1) this.play('idle');
    } else if (this.clip === 'cast') {
      this.actionT = Math.min(1, this.actionT + dt * 1.2);
      const rise = Math.sin(Math.min(1, this.actionT) * Math.PI);
      y += rise * 0.28;
      if (j.armL) j.armL.rotation.x = -rise * 1.6;
      if (j.armR) j.armR.rotation.x = -rise * 1.6;
      if (this.actionT >= 1) this.play('idle');
    } else {
      this.m.root.position.z += (0 - this.m.root.position.z) * Math.min(1, dt * 8);
    }

    body.position.y = y;
  }
}
