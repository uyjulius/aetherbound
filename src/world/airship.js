/**
 * The Gallowglass — the party's airship.
 *
 * Built rather than sculpted: a timber hull, a canvas envelope above it on
 * four iron struts, two ducted screws on outriggers, and an aether furnace
 * amidships that is the only part of it the Imperium would recognise. The
 * silhouette matters more than the detail, because at flight altitude the
 * player sees it from above and behind at about forty metres and almost
 * nothing below a metre in size survives that distance.
 *
 * The hull is deliberately narrow and long. A wide ship reads as a boat from
 * overhead; a narrow one reads as something that was meant to go fast.
 *
 * Everything here is grouped under a single root whose origin sits at the
 * waterline of the hull, so the field code can treat it exactly like a
 * character actor — set `root.position` and `root.rotation.y` and nothing else.
 */

import * as THREE from 'three';
import { kitMaterials } from './kit.js';
import { toonMaterial } from '../fx/materials.js';
import { rampAt } from '../engine/palette.js';

/**
 * Lofted hull: a stack of rectangular rings that narrow towards bow and stern,
 * stitched into a closed shell. Cheaper and more controllable than a lathe,
 * and it keeps the chine crease that makes the toon ramp read the form.
 */
function hullGeometry(length = 7.2, beam = 2.0, depth = 1.15) {
  // Station lines: [t along keel, half-beam scale, depth scale]. The bow
  // (t = 1) comes to a point; the stern is cut square, like a real transom.
  const stations = [
    [0.00, 0.62, 0.55],
    [0.08, 0.80, 0.86],
    [0.24, 0.96, 1.00],
    [0.46, 1.00, 1.00],
    [0.68, 0.90, 0.94],
    [0.86, 0.62, 0.76],
    [1.00, 0.10, 0.44],
  ];

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // Each station is a 4-point ring: deck-port, keel-port, keel-starboard,
  // deck-starboard. Four points is enough — the crease between them is the
  // whole point of the shape.
  const ringFor = ([t, bs, ds]) => {
    const z = (t - 0.5) * length;
    const x = (beam * 0.5) * bs;
    const yTop = 0;
    const yBot = -depth * ds;
    return [
      new THREE.Vector3(-x, yTop, z),
      new THREE.Vector3(-x * 0.72, yBot, z),
      new THREE.Vector3(x * 0.72, yBot, z),
      new THREE.Vector3(x, yTop, z),
    ];
  };

  const rings = stations.map(ringFor);
  for (const ring of rings) {
    for (const p of ring) {
      positions.push(p.x, p.y, p.z);
      normals.push(0, 0, 0);
      uvs.push((p.x / beam) + 0.5, (p.z / length) + 0.5);
    }
  }

  // Skin between consecutive rings. Only the outer three faces are built —
  // the deck is a separate piece so it can take a different material.
  for (let s = 0; s < rings.length - 1; s++) {
    const a = s * 4;
    const b = (s + 1) * 4;
    for (let i = 0; i < 3; i++) {
      indices.push(a + i, b + i, b + i + 1);
      indices.push(a + i, b + i + 1, a + i + 1);
    }
  }

  // Transom: cap the square stern so the hull is not open from behind.
  indices.push(0, 2, 1, 0, 3, 2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** The gas envelope: a stretched sphere, flattened underneath. */
function envelopeGeometry(length = 8.4, beam = 3.0, height = 2.6) {
  const geo = new THREE.SphereGeometry(0.5, 20, 12);
  geo.scale(beam, height, length);
  const pos = geo.attributes.position;
  // Flatten the underside so it sits on its struts instead of bulging past
  // them, and pinch the ends so it reads as an airship rather than a balloon.
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y < 0) pos.setY(i, y * 0.55);
    const taper = 1 - Math.pow(Math.abs(z) / (length * 0.5), 3) * 0.35;
    pos.setX(i, pos.getX(i) * taper);
    pos.setY(i, pos.getY(i) * taper);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build the airship.
 *
 * Returns `{ root, update }`. `update(dt, speedFraction)` spins the screws and
 * applies the idle bob; `speedFraction` is 0 when parked and 1 at full
 * throttle, and it drives both the screw rate and how far the ship heels.
 */
export function buildAirship() {
  const M = kitMaterials();
  const root = new THREE.Group();
  root.name = 'airship';

  const timber = M.woodDark;
  const canvas = toonMaterial({ color: rampAt('plaster', 0.66), ramp: 'standard' });
  const trim = M.gold;
  const iron = M.iron;
  const furnace = toonMaterial({
    color: '#3fc6d6', ramp: 'magitek',
    emissive: '#2ba3bd', emissiveIntensity: 1.8,
  });

  // --- hull ----------------------------------------------------------------
  const hull = new THREE.Mesh(hullGeometry(), timber);
  hull.castShadow = true;
  root.add(hull);

  // Deck. Inset slightly so the hull's top edge shows as a gunwale line.
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 6.9), M.woodFloor);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.01;
  root.add(deck);

  // Gunwale rail — a thin box run down each side. This is the single detail
  // that most sells the hull as a made object rather than a shape.
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 6.6), trim);
    rail.position.set(side * 0.98, 0.11, 0);
    rail.castShadow = true;
    root.add(rail);
  }

  // --- envelope ------------------------------------------------------------
  const envelope = new THREE.Mesh(envelopeGeometry(), canvas);
  envelope.position.y = 3.5;
  envelope.castShadow = true;
  root.add(envelope);

  // Reinforcing bands, so the envelope reads as panelled cloth under tension.
  for (const z of [-2.6, -0.9, 0.9, 2.6]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.055, 6, 20), trim);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 3.5, z);
    band.scale.set(1.12, 1, 0.95);
    root.add(band);
  }

  // Struts from deck to envelope.
  for (const [sx, sz] of [[-0.8, -2.2], [0.8, -2.2], [-0.8, 2.2], [0.8, 2.2]]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 6), iron);
    strut.position.set(sx, 1.35, sz);
    strut.rotation.z = -sx * 0.16;
    root.add(strut);
  }

  // --- screws --------------------------------------------------------------
  // Kept low and outboard: high nacelles fight the envelope for the
  // silhouette, low ones read instantly as propulsion.
  const screws = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.3), iron);
    arm.position.set(side * 1.5, -0.15, -1.9);
    root.add(arm);

    const duct = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 6, 16), iron);
    duct.position.set(side * 2.1, -0.15, -1.9);
    root.add(duct);

    const hubGroup = new THREE.Group();
    hubGroup.position.set(side * 2.1, -0.15, -1.9);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 8), trim);
    hub.rotation.x = Math.PI / 2;
    hubGroup.add(hub);
    // Each blade hangs off its own pivot rotated about the hub axis, so the
    // four stay a rigid disc when the hub group spins.
    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.z = (i / 4) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.028), timber);
      blade.position.y = 0.5;
      blade.rotation.y = 0.35;     // pitch, so the disc catches the light
      pivot.add(blade);
      hubGroup.add(pivot);
    }
    root.add(hubGroup);
    screws.push(hubGroup);
  }

  // --- furnace and fins ----------------------------------------------------
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), furnace);
  core.position.set(0, 0.42, -0.4);
  root.add(core);

  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.5, 8), iron);
  housing.position.set(0, 0.2, -0.4);
  root.add(housing);

  // Tail fins — one vertical, two horizontal, at the stern of the envelope.
  const finV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 1.2), canvas);
  finV.position.set(0, 4.5, -4.0);
  root.add(finV);
  for (const side of [-1, 1]) {
    const finH = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 1.0), canvas);
    finH.position.set(side * 0.9, 3.5, -4.0);
    root.add(finH);
  }

  // Bowsprit, purely for reading direction at a glance from above.
  const sprit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.4, 6), trim);
  sprit.rotation.x = Math.PI / 2;
  sprit.position.set(0, 0.12, 4.1);
  root.add(sprit);

  let spin = 0;
  let bob = 0;

  return {
    root,
    /**
     * @param {number} dt      seconds
     * @param {number} thrust  0 parked … 1 full throttle
     */
    update(dt, thrust = 0) {
      // Screws idle even when parked — a stopped airship looks broken.
      spin += dt * (6 + thrust * 46);
      for (const s of screws) s.rotation.z = spin;

      bob += dt * (1.1 + thrust * 0.8);
      root.position.y = root.userData.baseY ?? 0;
      root.position.y += Math.sin(bob) * 0.13 + Math.sin(bob * 0.53) * 0.06;

      // Nose down and heel into the turn under power. Small numbers: an
      // airship that banks like a fighter stops reading as heavy.
      root.rotation.x = -thrust * 0.055;
      root.rotation.z += ((root.userData.targetRoll ?? 0) - root.rotation.z) * Math.min(1, dt * 3);
    },
  };
}
