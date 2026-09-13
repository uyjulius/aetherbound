import * as THREE from 'three';
import { groundTexture, surfaceMaterial } from './materials.js';

const mat = (color, metalness = 0, emissive = null) => new THREE.MeshStandardMaterial({ color, roughness: metalness ? .45 : .85, metalness, ...(emissive ? { emissive, emissiveIntensity: .8 } : {}) });
const mesh = (root, geometry, material, x = 0, y = 0, z = 0) => {
  const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); object.castShadow = object.receiveShadow = true; root.add(object); return object;
};
const box = (root, w, h, d, material, x = 0, y = h / 2, z = 0) => mesh(root, new THREE.BoxGeometry(w, h, d), material, x, y, z);
const cylinder = (root, radius, height, material, x = 0, y = height / 2, z = 0, top = radius) => mesh(root, new THREE.CylinderGeometry(top, radius, height, 12), material, x, y, z);
function beam(root, from, to, radius, material) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
  const object = cylinder(root, radius, delta.length(), material); object.position.copy(a).lerp(b, .5); object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return object;
}
function ring(root, radius, material, x = 0, y = 0, z = 0, tube = .055) { return mesh(root, new THREE.TorusGeometry(radius, tube, 7, 36), material, x, y, z); }
function plaque(root, text, x, y, z, width = 1.2) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 80;
  const context = canvas.getContext('2d'); context.fillStyle = '#132330'; context.fillRect(0, 0, 256, 80);
  context.strokeStyle = '#b79b59'; context.lineWidth = 4; context.strokeRect(3, 3, 250, 74);
  context.fillStyle = '#f5dfa0'; context.font = 'bold 25px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 128, 42, 240);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const label = mesh(root, new THREE.PlaneGeometry(width, width * 80 / 256), material, x, y, z);
  label.userData.ownedTexture = texture; return label;
}
function crystal(root, color = '#73dee8', height = 1.25) {
  const stone = mat(color, .2, color);
  return mesh(root, new THREE.OctahedronGeometry(.3, 0), stone, 0, height, 0);
}
function lantern(root, x = 0, z = 0, height = 2.8) {
  const iron = mat('#333e46', .65), glow = mat('#ffe0a0', .1, '#ffbe62');
  cylinder(root, .19, .15, iron, x, .075, z); cylinder(root, .055, height, iron, x, height / 2, z);
  box(root, .42, .06, .42, iron, x, height, z); box(root, .28, .42, .28, glow, x, height + .25, z);
  for (const dx of [-.2, .2]) for (const dz of [-.2, .2]) box(root, .035, .52, .035, iron, x + dx, height + .27, z + dz);
  mesh(root, new THREE.ConeGeometry(.35, .28, 4), iron, x, height + .66, z).rotation.y = Math.PI / 4;
}
function wheel(root, color, y = 1.3) {
  const iron = mat('#424d58', .65), paint = mat(color, .5);
  cylinder(root, .32, .15, iron); cylinder(root, .12, y, iron, 0, y / 2, 0);
  const turn = new THREE.Group(); turn.position.set(0, y, .2); root.add(turn);
  ring(turn, .43, paint, 0, 0, 0, .055);
  for (let a = 0; a < 4; a++) { const spoke = box(turn, .055, .82, .05, iron, 0, 0, 0); spoke.rotation.z = a * Math.PI / 4; }
  mesh(turn, new THREE.SphereGeometry(.1, 8, 6), paint);
  return turn;
}
function machinery(def, completed) {
  const root = new THREE.Group();
  const colors = { coolant: '#4eacf0', exhaust: '#d3593c', governor: '#c7a05b', 'sluice-reed': '#53b99a', 'sluice-stone': '#bdac88' };
  const name = def.id.replace('sluice-', '').toUpperCase(), color = colors[def.id];
  const steel = mat('#4c5d65', .6);
  const turn = wheel(root, color);
  cylinder(root, .22, 1.35, steel, -.46, .68, -.28); cylinder(root, .22, 1.35, steel, .46, .68, -.28);
  beam(root, [-.46, 1.35, -.28], [.46, 1.35, -.28], .21, steel);
  plaque(root, name, 0, .48, .29, 1.15);
  const lamp = mesh(root, new THREE.SphereGeometry(.09, 8, 6), mat(completed ? '#9ce6a0' : color, .1, completed ? '#6dcc7f' : color), .63, 1.55, 0);
  root.userData.update = (dt, elapsed, active) => { turn.rotation.z += ((active ? Math.PI * 1.5 : 0) - turn.rotation.z) * Math.min(1, dt * 3); lamp.material.color.set(active ? '#9ce6a0' : color); lamp.material.emissive.set(active ? '#6dcc7f' : color); };
  turn.rotation.z = completed ? Math.PI * 1.5 : 0; return root;
}
function aetherMark() {
  const root = new THREE.Group(), stone = mat('#5b7182', .25), glow = mat('#8be4e4', .1, '#5eaebf');
  cylinder(root, .62, .12, stone);
  const halo = ring(root, .58, glow, 0, .09, 0, .02); halo.rotation.x = Math.PI / 2;
  const jewel = crystal(root); jewel.scale.set(.7, 1.7, .7);
  for (let i = 0; i < 6; i++) box(root, .04, .04, .13, glow, Math.sin(i * Math.PI / 3) * .42, .09, Math.cos(i * Math.PI / 3) * .42).rotation.y = i * Math.PI / 3;
  root.userData.update = (dt, elapsed) => { jewel.rotation.y += dt * .6; jewel.position.y = 1.05 + Math.sin(elapsed * 1.7) * .09; };
  return root;
}
function chest(completed) {
  const root = new THREE.Group(), wood = surfaceMaterial('wood_planks', '#9c734b'), metal = mat('#b99a61', .65);
  box(root, 1.05, .53, .68, wood); box(root, 1.1, .06, .72, metal, 0, .07);
  for (const x of [-.36, .36]) { box(root, .07, .56, .72, metal, x, .29); }
  const lid = new THREE.Group(); lid.position.set(0, .53, -.34); root.add(lid);
  box(lid, 1.07, .18, .7, wood, 0, .07, .34);
  for (const x of [-.36, .36]) box(lid, .07, .2, .72, metal, x, .07, .34);
  box(root, .14, .16, .07, metal, 0, .4, .38);
  lid.rotation.x = completed ? -1.15 : 0;
  root.userData.update = (dt, elapsed, active) => { lid.rotation.x += ((active ? -1.15 : 0) - lid.rotation.x) * Math.min(1, dt * 6); };
  return root;
}
function bell(completed) {
  const root = new THREE.Group(), bronze = mat('#ad894d', .6), wood = surfaceMaterial('bark', '#685642');
  cylinder(root, .19, 3.8, wood, -1.05, 1.9); cylinder(root, .19, 3.8, wood, 1.05, 1.9); beam(root, [-1.2, 3.8, 0], [1.2, 3.8, 0], .2, wood);
  cylinder(root, .12, .7, bronze, 0, 3.3, 0);
  mesh(root, new THREE.CylinderGeometry(.43, .87, 1.35, 20, 1, true), bronze, 0, 2.35);
  const rim = ring(root, .88, bronze, 0, 1.68, 0, .09); rim.rotation.x = Math.PI / 2;
  mesh(root, new THREE.SphereGeometry(.17, 10, 8), bronze, 0, 1.82);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; beam(root, [Math.sin(a) * 1.2, 0, Math.cos(a) * .8], [Math.sin(a) * .35, 2.15, Math.cos(a) * .35], .075, wood); }
  plaque(root, completed ? 'THE BELL IS QUIET' : 'THE ROOT BELL', 0, .55, .75, 1.8); return root;
}
function core(kind, completed) {
  const root = new THREE.Group(), metal = mat('#bc9c63', .75), stone = mat('#4f626e', .2);
  cylinder(root, 1.1, .22, stone); cylinder(root, .65, 1.2, metal, 0, .65, 0, .38);
  const jewel = crystal(root, kind === 'furnace-crown' && !completed ? '#ffa35c' : '#75e5e9', 2.15); jewel.scale.setScalar(kind === 'first-engine' ? 2.1 : 1.4);
  const rings = [];
  for (let i = 0; i < 3; i++) { const hoop = ring(root, .92 + i * .14, metal, 0, 2.1, 0); hoop.rotation.set(i * .9, i * .8, i * .4); rings.push(hoop); }
  for (const x of [-1.4, 1.4]) { cylinder(root, .2, 2.7, stone, x, 1.35); crystal(root, '#c9e8e5', 2.8).position.x = x; }
  root.userData.update = (dt, elapsed) => { rings.forEach((hoop, i) => { hoop.rotation.y += dt * (.2 + i * .13); }); jewel.rotation.y -= dt * .3; };
  return root;
}
function lectern(stars = false) {
  const root = new THREE.Group(), wood = mat('#775740'), gold = mat('#b49a60', .5);
  box(root, .75, .1, .65, wood); box(root, .16, 1.1, .16, wood);
  const board = box(root, 1.2, .08, .85, wood, 0, 1.25); board.rotation.x = -.35;
  const page = box(root, 1.08, .012, .72, mat(stars ? '#173b57' : '#d2c599'), 0, 1.305, 0); page.rotation.x = -.35;
  if (stars) for (let i = 0; i < 9; i++) mesh(root, new THREE.SphereGeometry(.018 + i % 2 * .013, 5, 4), gold, Math.sin(i * 4) * .45, 1.34 + Math.cos(i * 2) * .08, Math.cos(i * 2) * .28);
  return root;
}
export function createScenery(def, completed = false) {
  if (['coolant', 'exhaust', 'governor', 'sluice-reed', 'sluice-stone'].includes(def.id)) return machinery(def, completed);
  if (def.id === 'root-bell') return bell(completed);
  if (['first-engine', 'furnace-crown', 'resonator'].includes(def.id)) return core(def.id, completed);
  if (['survey-notes', 'foundry-orders', 'star-chart'].includes(def.id)) return lectern(def.id === 'star-chart');
  if (def.kit === 'savepoint' && def.interact?.save) return aetherMark();
  if (def.kit === 'chest') return chest(completed);
  const root = new THREE.Group();
  if (def.kit === 'lamppost') { lantern(root); return root; }
  if (['helm', 'dock'].includes(def.id)) { wheel(root, '#c8a86d', 1.2); plaque(root, def.id === 'helm' ? 'THE HELM' : 'VAGRANT STAR', 0, .4, .3, 1.4); return root; }
  if (def.kit === 'bed') {
    const wood = mat('#634937'), linen = mat('#d5c9ac'), blanket = mat('#4c697e');
    box(root, 1.4, .4, 2.4, wood); box(root, 1.32, .18, 2.3, linen, 0, .48); box(root, 1.3, .04, 1.6, blanket, 0, .59, .3); box(root, 1, .15, .45, linen, 0, .61, -.8); box(root, 1.5, 1, .12, wood, 0, .5, -1.2); return root;
  }
  if (def.kit === 'table') { const wood = mat('#866346'); box(root, 1.8, .12, 1.2, wood, 0, .85); for (const x of [-.72, .72]) for (const z of [-.42, .42]) box(root, .12, .85, .12, wood, x, .42, z); return root; }
  if (def.kit === 'pipe') {
    const metal = mat('#7c898a', .65); cylinder(root, .45, def.h ?? 3.6, metal); for (const y of [.3, 1.7, 3.3]) cylinder(root, .52, .12, metal, 0, y); return root;
  }
  return null;
}

export function createAirship(width = 26, length = 44, deck = true) {
  const root = new THREE.Group(), wood = surfaceMaterial('wood_planks', '#886445'), metal = mat('#a59465', .65), sail = mat('#d8c9a5');
  // The playable deck remains flat; hull, outriggers and rigging give it a ship silhouette.
  const hull = mesh(root, new THREE.CylinderGeometry(width * .48, width * .3, 4.5, 8), wood, 0, -2.4); hull.scale.z = length / width;
  if (deck) {
    const outline = new THREE.Shape();
    const points = [[-.48,-.34],[-.22,-.48],[.22,-.48],[.48,-.34],[.48,.34],[.22,.48],[-.22,.48],[-.48,.34]];
    points.forEach(([x,z], index) => index ? outline.lineTo(x * width, z * length) : outline.moveTo(x * width, z * length)); outline.closePath();
    const floor = mesh(root, new THREE.ShapeGeometry(outline), new THREE.MeshStandardMaterial({ map: groundTexture('wood'), color: '#a29b83' }), 0, -.12); floor.rotation.x = -Math.PI / 2;
  }
  for (const side of [-1, 1]) {
    beam(root, [side * width * .51, .9, -length * .44], [side * width * .51, .9, length * .44], .075, metal);
    for (let z = -length * .42; z < length * .44; z += 3) cylinder(root, .07, .95, metal, side * width * .51, .48, z);
    const nacelle = mesh(root, new THREE.CylinderGeometry(1, 1.4, length * .42, 12), metal, side * width * .68, -1.4, 0); nacelle.rotation.x = Math.PI / 2;
    const hub = new THREE.Group(); hub.position.set(side * width * .68, -1.4, length * .23); root.add(hub);
    for (let i = 0; i < 3; i++) { const blade = box(hub, .22, 3.7, .1, wood, 0, 0, 0); blade.rotation.z = i * Math.PI / 3; }
    hub.userData.spin = 3;
    for (const z of [-length * .23, length * .23]) beam(root, [side * width * .48, -.3, z], [side * width * .68, -1.4, z], .13, metal);
  }
  // Side masts keep the deck's central walking route and the camera sightline clear.
  for (const side of [-1, 1]) {
    const x = side * width * .52, z = -length * .1;
    cylinder(root, .15, 7.5, wood, x, 3.75, z);
    beam(root, [x, 7.3, z], [x, .5, z + length * .29], .025, metal);
    const cloth = mesh(root, new THREE.PlaneGeometry(width * .32, 4.5, 3, 3), sail, x - side * width * .12, 5, z); cloth.material.side = THREE.DoubleSide; cloth.rotation.y = side * .3;
    beam(root, [x, 7.4, z], [x - side * width * .31, 7.4, z], .09, wood);
  }
  root.userData.update = dt => root.traverse(object => { if (object.userData.spin) object.rotation.z += dt * object.userData.spin; });
  return root;
}

export function createBackdrop(map, width, height) {
  const root = new THREE.Group();
  if (map.kind === 'Airship') {
    root.add(createAirship(width * 2 - 2, height * 2 - 2));
    const cloud = mat('#dae5e9');
    for (let i = 0; i < 24; i++) { const puff = mesh(root, new THREE.IcosahedronGeometry(3 + i % 4, 2), cloud, Math.sin(i * 2.1) * 50, -9 - i % 5, Math.cos(i * 1.3) * 60); puff.scale.set(2.5, .35, 1); }
    root.userData.update = dt => root.children[0].userData.update(dt); return root;
  }
  if (['Town', 'City', 'Road', 'Mountain'].includes(map.kind)) {
    const snow = map.base === 'snow';
    const ground = mesh(root, new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: groundTexture(snow ? 'snow' : 'grass'), color: snow ? '#b6c4cd' : '#6d8557', roughness: 1 }), 0, -.22); ground.rotation.x = -Math.PI / 2;
    const mountain = mat(snow ? '#758997' : '#647967');
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI / 12, radius = 66 + i % 3 * 13, high = 12 + i % 5 * 5;
      const peak = mesh(root, new THREE.ConeGeometry(14 + i % 4 * 3, high, 7), mountain, Math.sin(angle) * radius, high / 2 - 2, Math.cos(angle) * radius); peak.rotation.y = i;
      if (snow || i % 4 === 0) mesh(root, new THREE.ConeGeometry(5, high * .26, 7), mat('#cbd5d7'), peak.position.x, high * .87 - 2, peak.position.z).rotation.y = i;
    }
  } else if (map.base === 'aether' || map.id === 'observatory') {
    const stone = mat('#2d4559', .3), light = mat('#5dbecb', .1, '#3b7d92');
    for (let i = 0; i < 14; i++) {
      const a = i * Math.PI / 7, radius = width + 12 + i % 2 * 8;
      const island = mesh(root, new THREE.OctahedronGeometry(2 + i % 4, 0), stone, Math.sin(a) * radius, -3 - i % 5, Math.cos(a) * radius); island.scale.y = 2;
      crystal(root, '#7cd6e0', 2).position.set(island.position.x, island.position.y + 4, island.position.z);
    }
    const halo = ring(root, Math.max(width, height) * 1.15, light, 0, -2, 0, .15); halo.rotation.x = Math.PI / 2;
  }
  return root;
}

export function buildBattleStage(root, environment) {
  const base = environment.base === 'rock' ? 'cobble' : environment.base ?? 'grass';
  const texture = groundTexture(base).clone(); texture.repeat.set(24, 20); texture.needsUpdate = true;
  const floor = mesh(root, new THREE.PlaneGeometry(72, 60), new THREE.MeshStandardMaterial({ map: texture, color: '#bbbcae', roughness: .95 }), 0, -.025); floor.rotation.x = -Math.PI / 2;
  const metal = mat('#a48d65', .6), stone = mat('#747b78'), bark = mat('#61533e');
  if (base === 'magitek') {
    const steel = mat('#657984', .55), glow = mat('#f4b975', .2, '#dc8748');
    for (const x of [-12, -6, 0, 6, 12]) { cylinder(root, .25, 5.8, steel, x, 2.9, -11); cylinder(root, .35, .15, metal, x, .15, -11); }
    beam(root, [-13, 5.6, -11], [13, 5.6, -11], .3, steel);
    for (const x of [-10, 10]) { cylinder(root, 1.65, 3.8, steel, x, 1.9, -13); cylinder(root, 1.7, .3, metal, x, .5, -13); box(root, 1.1, 1.5, .1, glow, x, 1.8, -11.3); }
    for (let x = -11; x < 12; x += 4) box(root, 2.8, .04, .2, glow, x, .015, -7.5);
  } else if (base === 'aether' || environment.id === 'observatory') {
    const light = mat('#83d8db', .2, '#5da1b4');
    for (const radius of [7.5, 9.2, 12]) { const hoop = ring(root, radius, metal, 0, -.007, 0, .035); hoop.rotation.x = Math.PI / 2; }
    const engine = core('first-engine', true); engine.position.set(0, .5, -13); engine.scale.setScalar(1.5); root.add(engine);
    for (const x of [-11, -7, 7, 11]) { cylinder(root, .35, 4.5, stone, x, 2.25, -10, .23); const jewel = mesh(root, new THREE.OctahedronGeometry(.35), light, x, 4.9, -10); jewel.scale.y = 1.7; }
  } else if (base === 'cave') {
    for (let i = 0; i < 15; i++) {
      const rock = mesh(root, new THREE.IcosahedronGeometry(1.5 + i % 3 * .25, 1), stone, (i - 7) * 2.3, 1, -10 - i % 3);
      rock.scale.set(1.4, 1.4 + i % 3 * .4, 1); rock.rotation.set(i * .3, i, 0);
      if (i % 3 === 0) lantern(root, (i - 7) * 2.3, -8.5, 2.1);
    }
    for (const x of [-12, 12]) beam(root, [x, 0, -9], [x * .7, 5, -11], .22, bark);
  } else {
    const leaf = mat(base === 'snow' ? '#557269' : '#58784b');
    for (let i = 0; i < 12; i++) {
      const x = (i - 5.5) * 3.2, z = -11 - i % 3 * 3, height = 4.3 + i % 3;
      cylinder(root, .15, height, bark, x, height / 2, z);
      for (let layer = 0; layer < 3; layer++) mesh(root, new THREE.ConeGeometry(1.8 - layer * .35, 2.4, 9), leaf, x, height * .65 + layer * .9, z);
      if (base === 'snow') mesh(root, new THREE.ConeGeometry(.6, 1.2, 9), mat('#d8e0de'), x, height * .65 + 2.1, z);
    }
    for (const x of [-25, 24, -10, 11]) mesh(root, new THREE.ConeGeometry(12, 13, 7), mat(base === 'snow' ? '#98adb7' : '#748974'), x, 5, -32);
  }
  return [texture];
}
