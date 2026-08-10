import * as THREE from 'three';
import { toonMaterial, foliageMaterial, windMaterials, aetherMaterial, aetherMaterials } from '../fx/materials.js';
import { assets } from '../engine/assets.js';
import { rampAt } from '../engine/palette.js';

/**
 * The modular building kit.
 *
 * Every structure in Aetherbound is assembled from these parts, the same way
 * an environment artist works from a kit rather than sculpting each house.
 * Placement is always explicit and hand-authored — the kit supplies the
 * vocabulary, the map files supply the composition.
 *
 * The rules that keep the towns from looking machine-stamped:
 *   - Nothing is a bare box. Every wall gets a plinth, a cornice or a frame,
 *     because the eye reads a silhouette long before it reads a texture.
 *   - Roofs overhang. A roof flush with its walls is the single clearest tell
 *     of untouched primitive geometry.
 *   - Openings are real recessed geometry, not a texture of a window.
 */

// ---------------------------------------------------------------------------
// Material registry — built lazily so textures are loaded first.
// ---------------------------------------------------------------------------

let M = null;

export function initKitMaterials() {
  const t = (name, r, ry) => assets.tiled(name, r, ry ?? r);
  M = {
    stone: toonMaterial({ map: t('stone_wall', 1), ramp: 'standard' }),
    stoneFine: toonMaterial({ map: t('stone_wall', 2), ramp: 'standard' }),
    plaster: toonMaterial({ map: t('plaster_wall', 1), ramp: 'standard' }),
    brick: toonMaterial({ map: t('brick_wall', 1), ramp: 'standard' }),
    roofTile: toonMaterial({ map: t('roof_tile', 1), ramp: 'standard' }),
    roofSlate: toonMaterial({ map: t('roof_slate', 1), ramp: 'standard' }),
    thatch: toonMaterial({ map: t('thatch', 1), ramp: 'standard' }),
    wood: toonMaterial({ map: t('wood_planks', 1), ramp: 'standard' }),
    woodDark: toonMaterial({ map: t('wood_planks', 1), color: '#8a6a52', ramp: 'standard' }),
    woodFloor: toonMaterial({ map: t('wood_floor', 1), ramp: 'interior' }),
    bark: toonMaterial({ map: t('bark', 1), ramp: 'terrain' }),
    cobble: toonMaterial({ map: t('cobblestone', 1), ramp: 'terrain' }),
    dirt: toonMaterial({ map: t('dirt_path', 1), ramp: 'terrain' }),
    grass: toonMaterial({ map: t('grass', 1), ramp: 'terrain' }),
    sand: toonMaterial({ map: t('sand', 1), ramp: 'terrain' }),
    snow: toonMaterial({ map: t('snow', 1), ramp: 'snow' }),
    rock: toonMaterial({ map: t('rock_cliff', 1), ramp: 'terrain' }),
    caveRock: toonMaterial({ map: t('cave_rock', 1), ramp: 'cave' }),
    marble: toonMaterial({ map: t('marble_floor', 1), ramp: 'interior' }),
    iron: toonMaterial({ map: t('iron_plate', 1), ramp: 'standard' }),
    fabric: toonMaterial({ map: t('fabric', 1), ramp: 'standard', side: THREE.DoubleSide }),
    aetherStone: toonMaterial({ map: t('aether_stone', 1), ramp: 'magitek' }),
    magitek: toonMaterial({ map: t('magitek_panel', 1), ramp: 'magitek' }),
    // Solids
    darkWood: toonMaterial({ color: rampAt('wood', 0.18), ramp: 'standard' }),
    glass: toonMaterial({ color: '#3fc6d6', ramp: 'standard', transparent: true, opacity: 0.42, emissive: '#1a8fa5', emissiveIntensity: 0.4 }),
    lamp: toonMaterial({ color: '#ffe0a0', ramp: 'standard', emissive: '#ffbb55', emissiveIntensity: 2.6 }),
    gold: toonMaterial({ color: rampAt('gold', 0.62), ramp: 'standard' }),
    canvasCloth: toonMaterial({ color: rampAt('plaster', 0.72), ramp: 'standard', side: THREE.DoubleSide }),
  };
  return M;
}

export function kitMaterials() {
  if (!M) initKitMaterials();
  return M;
}

// ---------------------------------------------------------------------------
// Geometry cache
// ---------------------------------------------------------------------------

const geoCache = new Map();
const geo = (key, build) => {
  if (!geoCache.has(key)) geoCache.set(key, build());
  return geoCache.get(key);
};

const box = (w, h, d) => geo(`b:${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 8) => geo(`c:${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Scale a texture's UVs to world size so a 4m wall and a 12m wall show bricks
 * of the same size. Without this, every building silently has its own brick
 * scale, and the town reads as a collage.
 */
function worldUV(geometry, scale = 0.5) {
  const g = geometry.clone();
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(norm.getX(i)), ny = Math.abs(norm.getY(i)), nz = Math.abs(norm.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u, v;
    if (ny > nx && ny > nz) { u = x; v = z; }         // floor / ceiling
    else if (nx > nz) { u = z; v = y; }               // side wall
    else { u = x; v = y; }                            // front wall
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = v * scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

const uvBox = (w, h, d, scale = 0.5) =>
  geo(`ub:${w},${h},${d},${scale}`, () => worldUV(new THREE.BoxGeometry(w, h, d), scale));

// ---------------------------------------------------------------------------
// Roofs
// ---------------------------------------------------------------------------

/** Gable roof: two sloped planes plus triangular end walls. */
function gableRoof(w, d, rise, overhang, roofMat, wallMat) {
  const g = new THREE.Group();
  const W = w + overhang * 2;
  const D = d + overhang * 2;
  const slopeLen = Math.hypot(D / 2, rise);
  const angle = Math.atan2(rise, D / 2);

  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(uvBox(W, 0.16, slopeLen, 0.55), roofMat);
    panel.position.set(0, rise / 2, side * D / 4);
    // Rotating about +X tips the panel's +Z edge downward. The outer eave is
    // the edge at `side * D/2`, so the sign must match `side` — negating it
    // builds the roof upside down, as a valley instead of a ridge.
    panel.rotation.x = side * angle;
    panel.castShadow = true;
    panel.receiveShadow = true;
    g.add(panel);
  }

  // Ridge beam — a tiny detail that reads as construction.
  const ridge = mesh(box(W + 0.08, 0.20, 0.26), roofMat, 0, rise + 0.06, 0);
  g.add(ridge);

  // Gable end walls close the triangle.
  const tri = new THREE.Shape();
  tri.moveTo(-w / 2, 0);
  tri.lineTo(w / 2, 0);
  tri.lineTo(0, rise);
  tri.closePath();
  const triGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false });
  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(worldUV(triGeo, 0.5), wallMat);
    end.position.set(0, 0, side * (d / 2) - (side < 0 ? 0.12 : 0));
    end.castShadow = true;
    g.add(end);
  }
  return g;
}

/** Hip roof: four sloped faces meeting at a ridge. */
function hipRoof(w, d, rise, overhang, roofMat) {
  const g = new THREE.Group();
  const W = w + overhang * 2;
  const D = d + overhang * 2;
  const ridgeLen = Math.max(0.001, W - D * 0.6);

  const shape = new THREE.BufferGeometry();
  const hw = W / 2, hd = D / 2, rl = ridgeLen / 2;
  // 6 verts: 4 eave corners, 2 ridge ends.
  const v = [
    -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd,
    -rl, rise, 0, rl, rise, 0,
  ];
  const idx = [
    0, 1, 5, 0, 5, 4,   // back slope
    2, 3, 4, 2, 4, 5,   // front slope
    1, 2, 5,            // right hip
    3, 0, 4,            // left hip
  ];
  shape.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  shape.setIndex(idx);
  shape.computeVertexNormals();
  const roof = new THREE.Mesh(worldUV(shape, 0.5), roofMat);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  return g;
}

/** Conical roof for round towers. */
function coneRoof(radius, rise, roofMat, sides = 8) {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(
    geo(`cone:${radius},${rise},${sides}`, () => worldUV(new THREE.ConeGeometry(radius, rise, sides), 0.5)),
    roofMat);
  cone.position.y = rise / 2;
  cone.castShadow = true;
  g.add(cone);
  return g;
}

// ---------------------------------------------------------------------------
// Openings
// ---------------------------------------------------------------------------

function doorway(width, height, frameMat, doorMat, { arched = false, open = false } = {}) {
  const g = new THREE.Group();
  const t = 0.14;
  // Recessed reveal, so the opening has depth.
  const jambL = mesh(box(t, height, 0.34), frameMat, -width / 2 - t / 2, height / 2, 0);
  const jambR = mesh(box(t, height, 0.34), frameMat, width / 2 + t / 2, height / 2, 0);
  const lintel = mesh(box(width + t * 2, t, 0.34), frameMat, 0, height + t / 2, 0);
  g.add(jambL, jambR, lintel);

  if (arched) {
    const arch = new THREE.Mesh(
      geo(`arch:${width}`, () => worldUV(new THREE.TorusGeometry(width / 2 + t / 2, t / 2, 6, 12, Math.PI), 0.8)),
      frameMat);
    arch.position.y = height + t / 2;
    arch.castShadow = true;
    g.add(arch);
  }

  if (!open) {
    const door = mesh(uvBox(width - 0.04, height - 0.04, 0.10, 0.9), doorMat, 0, height / 2, -0.08);
    g.add(door);
    // Handle and hinges: three tiny meshes that make a door read as a door.
    const mats = kitMaterials();
    g.add(mesh(cyl(0.05, 0.05, 0.08, 6), mats.gold, width * 0.30, height * 0.48, -0.16));
    for (const hy of [height * 0.22, height * 0.78]) {
      g.add(mesh(box(0.16, 0.06, 0.04), mats.iron, -width * 0.36, hy, -0.15));
    }
  }
  return g;
}

function window4(width, height, frameMat, glassMat, { shutters = false, sill = true } = {}) {
  const g = new THREE.Group();
  const t = 0.10;
  g.add(mesh(box(width + t * 2, t, 0.26), frameMat, 0, height / 2 + t / 2, 0));
  g.add(mesh(box(width + t * 2, t, 0.26), frameMat, 0, -height / 2 - t / 2, 0));
  g.add(mesh(box(t, height, 0.26), frameMat, -width / 2 - t / 2, 0, 0));
  g.add(mesh(box(t, height, 0.26), frameMat, width / 2 + t / 2, 0, 0));
  // Mullions — the cross that says "window" at any distance.
  g.add(mesh(box(0.05, height, 0.20), frameMat, 0, 0, 0.02));
  g.add(mesh(box(width, 0.05, 0.20), frameMat, 0, 0, 0.02));
  const pane = mesh(box(width, height, 0.05), glassMat, 0, 0, -0.06);
  pane.castShadow = false;
  g.add(pane);
  if (sill) g.add(mesh(box(width + t * 3, 0.09, 0.34), frameMat, 0, -height / 2 - t, 0.06));
  if (shutters) {
    for (const side of [-1, 1]) {
      const sh = mesh(uvBox(width * 0.55, height, 0.06, 1.2), frameMat,
        side * (width / 2 + width * 0.30), 0, 0.16);
      sh.rotation.y = side * -0.28;
      g.add(sh);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

/**
 * A house. `style` selects the wall/roof material combination and detailing.
 * Everything else is explicit so map files stay readable.
 */
export function building({
  w = 6, d = 5, h = 3.6, style = 'plaster', roof = 'gable', rise = 2.0,
  storeys = 1, door = 'south', windows = true, sign = null, chimney = false,
  timbered = false, balcony = false, awning = null, porch = false,
} = {}) {
  const mats = kitMaterials();
  const g = new THREE.Group();

  const wallMat = {
    plaster: mats.plaster, stone: mats.stone, brick: mats.brick,
    wood: mats.wood, magitek: mats.magitek, marble: mats.marble,
  }[style] || mats.plaster;
  const roofMat = {
    tile: mats.roofTile, slate: mats.roofSlate, thatch: mats.thatch,
    iron: mats.iron,
  }[roof === 'gable' || roof === 'hip' || roof === 'cone' ? 'tile' : roof] || mats.roofTile;

  const totalH = h * storeys;

  // Plinth: a stone base course. Buildings that meet the ground with a bare
  // wall edge always look like they were dropped in.
  const plinth = mesh(uvBox(w + 0.34, 0.44, d + 0.34, 0.5), mats.stone, 0, 0.22, 0);
  g.add(plinth);

  // Walls, one box per storey with a string course between.
  for (let s = 0; s < storeys; s++) {
    const y = 0.44 + h * s + h / 2;
    // Upper storeys jetty out slightly — characteristic, and it breaks the slab.
    const jetty = s > 0 ? 0.22 : 0;
    const body = mesh(uvBox(w + jetty, h, d + jetty, 0.5), wallMat, 0, y, 0);
    g.add(body);
    if (s > 0) {
      g.add(mesh(box(w + jetty + 0.12, 0.14, d + jetty + 0.12), mats.woodDark, 0, 0.44 + h * s, 0));
    }
  }

  // Timber framing: vertical studs plus a corner post at each edge.
  if (timbered) {
    for (let s = 0; s < storeys; s++) {
      const y0 = 0.44 + h * s;
      const jetty = s > 0 ? 0.22 : 0;
      const W = w + jetty, D = d + jetty;
      const studs = Math.max(2, Math.round(W / 1.5));
      for (let i = 0; i <= studs; i++) {
        const x = -W / 2 + (i / studs) * W;
        for (const zz of [-D / 2, D / 2]) {
          g.add(mesh(box(0.16, h, 0.10), mats.woodDark, x, y0 + h / 2, zz + (zz > 0 ? 0.05 : -0.05)));
        }
      }
      for (const xx of [-W / 2, W / 2]) {
        g.add(mesh(box(0.10, h, D), mats.woodDark, xx + (xx > 0 ? 0.05 : -0.05), y0 + h / 2, 0));
      }
      // Top and bottom plates.
      for (const yy of [y0 + 0.06, y0 + h - 0.06]) {
        g.add(mesh(box(W + 0.12, 0.14, D + 0.12), mats.woodDark, 0, yy, 0));
      }
    }
  }

  // Roof
  const roofY = 0.44 + totalH;
  let roofGroup;
  if (roof === 'hip') roofGroup = hipRoof(w, d, rise, 0.42, roofMat);
  else if (roof === 'flat') {
    roofGroup = new THREE.Group();
    roofGroup.add(mesh(uvBox(w + 0.5, 0.3, d + 0.5, 0.5), roofMat, 0, 0.15, 0));
    // Parapet.
    for (const [px, pz, pw, pd] of [[0, -d / 2 - 0.1, w + 0.5, 0.2], [0, d / 2 + 0.1, w + 0.5, 0.2],
      [-w / 2 - 0.15, 0, 0.2, d + 0.5], [w / 2 + 0.15, 0, 0.2, d + 0.5]]) {
      roofGroup.add(mesh(uvBox(pw, 0.5, pd, 0.6), wallMat, px, 0.45, pz));
    }
  } else roofGroup = gableRoof(w, d, rise, 0.42, roofMat, wallMat);
  roofGroup.position.y = roofY;
  g.add(roofGroup);

  // Door on the requested face.
  const faces = { south: [0, 0, d / 2, 0], north: [0, 0, -d / 2, Math.PI], east: [w / 2, 0, 0, Math.PI / 2], west: [-w / 2, 0, 0, -Math.PI / 2] };
  if (door && faces[door]) {
    const [dx, , dz, ry] = faces[door];
    const dw = 1.15, dh = 2.15;
    const dg = doorway(dw, dh, mats.woodDark, mats.wood, { arched: style === 'stone' || style === 'marble' });
    dg.position.set(dx, 0.44, dz);
    dg.rotation.y = ry;
    // Push the frame just proud of the wall so it never z-fights.
    dg.translateZ(0.06);
    g.add(dg);

    if (porch) {
      const p = new THREE.Group();
      p.add(mesh(uvBox(dw + 1.5, 0.16, 1.5, 0.6), mats.woodDark, 0, dh + 0.30, 0.75));
      for (const side of [-1, 1]) {
        p.add(mesh(cyl(0.09, 0.11, dh + 0.30, 6), mats.woodDark, side * (dw / 2 + 0.55), (dh + 0.30) / 2, 1.35));
      }
      p.position.set(dx, 0.44, dz);
      p.rotation.y = ry;
      p.translateZ(0.06);
      g.add(p);
    }
  }

  // Windows, spread along the long faces of each storey.
  if (windows) {
    const perFace = Math.max(1, Math.floor(w / 2.6));
    for (let s = 0; s < storeys; s++) {
      const y = 0.44 + h * s + h * 0.60;
      const jetty = s > 0 ? 0.22 : 0;
      for (const [face, ry] of [['south', 0], ['north', Math.PI]]) {
        for (let i = 0; i < perFace; i++) {
          const x = perFace === 1 ? 0 : -w * 0.32 + (i / (perFace - 1)) * w * 0.64;
          // Don't put a window where the door is.
          if (face === door && s === 0 && Math.abs(x) < 1.1) continue;
          const wg = window4(0.86, 1.05, mats.woodDark, mats.glass, { shutters: style !== 'magitek' });
          wg.position.set(x, y, (face === 'south' ? 1 : -1) * ((d + jetty) / 2 + 0.06));
          wg.rotation.y = ry;
          g.add(wg);
        }
      }
    }
  }

  if (chimney) {
    const cx = w * 0.30;
    const ch = mesh(uvBox(0.75, totalH * 0.45 + rise + 0.8, 0.75, 0.7), mats.brick, cx, 0.44 + totalH * 0.78 + rise * 0.5, -d * 0.22);
    g.add(ch);
    g.add(mesh(box(0.95, 0.18, 0.95), mats.stone, cx, 0.44 + totalH * 0.78 + rise * 0.5 + (totalH * 0.45 + rise + 0.8) / 2, -d * 0.22));
  }

  if (balcony) {
    const by = 0.44 + h;
    const bal = new THREE.Group();
    bal.add(mesh(uvBox(w * 0.7, 0.14, 1.3, 0.7), mats.woodDark, 0, 0, 0));
    const posts = 6;
    for (let i = 0; i <= posts; i++) {
      const x = -w * 0.35 + (i / posts) * w * 0.7;
      bal.add(mesh(box(0.07, 0.75, 0.07), mats.woodDark, x, 0.44, 0.6));
    }
    bal.add(mesh(box(w * 0.7, 0.09, 0.12), mats.woodDark, 0, 0.82, 0.6));
    bal.position.set(0, by, d / 2 + 0.65);
    g.add(bal);
  }

  if (awning) {
    const aw = new THREE.Group();
    const stripes = mats.fabric;
    const canopy = mesh(uvBox(w * 0.86, 0.10, 1.6, 0.8), stripes, 0, 0, 0);
    canopy.rotation.x = 0.28;
    aw.add(canopy);
    for (const side of [-1, 1]) {
      aw.add(mesh(cyl(0.05, 0.05, 0.9, 5), mats.iron, side * w * 0.40, -0.45, 0.7));
    }
    aw.position.set(0, 0.44 + h * 0.78, d / 2 + 0.85);
    g.add(aw);
  }

  if (sign) {
    const sg = signboard(sign.text || '', sign.icon || null);
    sg.position.set(sign.x ?? w * 0.36, 0.44 + h * 0.80, d / 2 + 0.30);
    g.add(sg);
  }

  g.userData.footprint = { w: w + 0.34, d: d + 0.34 };
  return g;
}

/** A hanging shop sign on a wrought-iron bracket. */
export function signboard(text, icon) {
  const mats = kitMaterials();
  const g = new THREE.Group();
  g.add(mesh(box(0.06, 0.06, 0.72), mats.iron, 0, 0.34, 0.36));
  g.add(mesh(box(0.06, 0.34, 0.06), mats.iron, 0, 0.17, 0.68));

  const boardW = 1.10, boardH = 0.72;
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 168;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = rampAt('wood', 0.30);
  ctx.fillRect(0, 0, 256, 168);
  ctx.strokeStyle = rampAt('gold', 0.62);
  ctx.lineWidth = 7;
  ctx.strokeRect(11, 11, 234, 146);
  if (icon) {
    ctx.fillStyle = rampAt('gold', 0.72);
    ctx.font = '86px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 128, 84);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = mesh(box(boardW, boardH, 0.07),
    toonMaterial({ map: tex, ramp: 'standard' }), 0, -0.30, 0.68);
  g.add(board);
  g.userData.signText = text;
  return g;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export const PROPS = {
  barrel: () => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    g.add(mesh(cyl(0.32, 0.28, 0.82, 10), mats.wood, 0, 0.41, 0));
    for (const y of [0.14, 0.68]) g.add(mesh(cyl(0.335, 0.335, 0.07, 10), mats.iron, 0, y, 0));
    g.add(mesh(cyl(0.30, 0.30, 0.04, 10), mats.woodDark, 0, 0.83, 0));
    return g;
  },

  crate: () => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    g.add(mesh(uvBox(0.72, 0.68, 0.72, 1.4), mats.wood, 0, 0.34, 0));
    for (const [x, z] of [[0, 0.37], [0, -0.37]]) {
      g.add(mesh(box(0.74, 0.07, 0.03), mats.woodDark, x, 0.12, z));
      g.add(mesh(box(0.74, 0.07, 0.03), mats.woodDark, x, 0.56, z));
    }
    return g;
  },

  well: () => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    g.add(mesh(cyl(0.95, 1.0, 0.90, 12), mats.stone, 0, 0.45, 0));
    g.add(mesh(cyl(1.02, 1.02, 0.12, 12), mats.stoneFine, 0, 0.94, 0));
    const water = mesh(cyl(0.82, 0.82, 0.02, 12),
      toonMaterial({ color: '#245566', ramp: 'cave' }), 0, 0.70, 0);
    g.add(water);
    for (const side of [-1, 1]) {
      g.add(mesh(box(0.14, 1.7, 0.14), mats.woodDark, side * 0.8, 1.75, 0));
    }
    g.add(mesh(box(1.9, 0.14, 0.14), mats.woodDark, 0, 2.55, 0));
    // Little pitched shingle roof.
    const roof = gableRoof(2.2, 1.5, 0.55, 0.2, mats.roofTile, mats.woodDark);
    roof.position.y = 2.62;
    roof.rotation.y = Math.PI / 2;
    g.add(roof);
    g.add(mesh(cyl(0.10, 0.10, 1.7, 8), mats.woodDark, 0, 2.48, 0).rotateZ(Math.PI / 2));
    const bucket = mesh(cyl(0.20, 0.17, 0.26, 8), mats.wood, 0, 1.55, 0);
    g.add(bucket);
    g.add(mesh(box(0.02, 0.85, 0.02), mats.iron, 0, 2.05, 0));
    return g;
  },

  lamppost: () => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    g.add(mesh(cyl(0.10, 0.16, 3.0, 8), mats.iron, 0, 1.5, 0));
    g.add(mesh(cyl(0.24, 0.30, 0.16, 8), mats.iron, 0, 0.08, 0));
    const head = new THREE.Group();
    head.position.y = 3.0;
    g.add(head);
    head.add(mesh(cyl(0.05, 0.22, 0.34, 4), mats.iron, 0, 0.30, 0));
    const glow = mesh(box(0.26, 0.34, 0.26), mats.lamp, 0, 0.06, 0);
    glow.castShadow = false;
    head.add(glow);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      head.add(mesh(box(0.03, 0.36, 0.03), mats.iron, Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15));
    }
    head.add(mesh(cyl(0.02, 0.02, 0.22, 4), mats.iron, 0, 0.52, 0));
    // A real light so the lamp actually lights its surroundings at night.
    const light = new THREE.PointLight(0xffbb66, 0, 7, 2);
    light.position.set(0, 3.06, 0);
    light.userData.isLamp = true;
    g.add(light);
    g.userData.light = light;
    return g;
  },

  fence: (len = 2) => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    const posts = Math.max(2, Math.round(len / 1.0) + 1);
    for (let i = 0; i < posts; i++) {
      const x = -len / 2 + (i / (posts - 1)) * len;
      g.add(mesh(box(0.12, 1.05, 0.12), mats.woodDark, x, 0.52, 0));
    }
    for (const y of [0.38, 0.82]) g.add(mesh(box(len, 0.09, 0.07), mats.wood, 0, y, 0));
    return g;
  },

  cart: () => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    g.add(mesh(uvBox(1.9, 0.55, 1.1, 1.2), mats.wood, 0, 0.78, 0));
    for (const side of [-1, 1]) {
      const wheel = mesh(
        geo('wheel', () => new THREE.TorusGeometry(0.46, 0.09, 6, 14)), mats.woodDark,
        0, 0.50, side * 0.62);
      g.add(wheel);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI;
        g.add(mesh(box(0.90, 0.06, 0.06), mats.woodDark, 0, 0.50, side * 0.62).rotateZ(a));
      }
    }
    g.add(mesh(box(1.7, 0.09, 0.09), mats.woodDark, 1.5, 0.62, 0).rotateZ(-0.16));
    return g;
  },

  stall: (cloth = '#8b2a2c') => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    const W = 2.4, D = 1.2, TABLE_H = 0.92, POST_H = 2.05;
    const canopyMat = toonMaterial({ color: cloth, ramp: 'standard', side: THREE.DoubleSide });

    // Table top with an apron under it, so it isn't a plank on sticks.
    g.add(mesh(uvBox(W, 0.14, D, 1.0), mats.wood, 0, TABLE_H, 0));
    g.add(mesh(uvBox(W - 0.14, 0.20, D - 0.14, 1.0), mats.woodDark, 0, TABLE_H - 0.16, 0));

    const corners = [[-W / 2 + 0.12, -D / 2 + 0.10], [W / 2 - 0.12, -D / 2 + 0.10],
      [-W / 2 + 0.12, D / 2 - 0.10], [W / 2 - 0.12, D / 2 - 0.10]];
    for (const [x, z] of corners) {
      g.add(mesh(box(0.09, TABLE_H, 0.09), mats.woodDark, x, TABLE_H / 2, z));
      g.add(mesh(box(0.08, POST_H, 0.08), mats.woodDark, x, TABLE_H + POST_H / 2, z));
    }
    // Cross-braces at the top of the posts carry the canopy.
    const ridgeY = TABLE_H + POST_H;
    for (const z of [-D / 2 + 0.10, D / 2 - 0.10]) {
      g.add(mesh(box(W - 0.10, 0.08, 0.08), mats.woodDark, 0, ridgeY, z));
    }

    // Canopy: two panels meeting at a ridge that actually sits on the posts.
    const rise = 0.42;
    const slope = Math.hypot(D / 2 + 0.28, rise);
    const angle = Math.atan2(rise, D / 2 + 0.28);
    for (const side of [-1, 1]) {
      const p = mesh(uvBox(W + 0.36, 0.05, slope, 1.0), canopyMat,
        0, ridgeY + rise / 2, side * (D / 4 + 0.14));
      p.rotation.x = side * angle;
      g.add(p);
    }
    g.add(mesh(box(W + 0.40, 0.07, 0.07), mats.woodDark, 0, ridgeY + rise + 0.02, 0));

    // Scalloped valance along the front eave — the fussy detail that reads as
    // "market" rather than "trestle table".
    for (let i = 0; i < 8; i++) {
      const x = -W / 2 + (i + 0.5) / 8 * W;
      g.add(mesh(box(W / 8 - 0.03, 0.20, 0.03), canopyMat, x, ridgeY - 0.10, D / 2 + 0.26));
    }
    return g;
  },

  bench: () => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    g.add(mesh(uvBox(1.8, 0.10, 0.46, 1.4), mats.wood, 0, 0.46, 0));
    g.add(mesh(uvBox(1.8, 0.46, 0.09, 1.4), mats.wood, 0, 0.72, -0.20).rotateX(0.14));
    for (const side of [-1, 1]) {
      g.add(mesh(box(0.10, 0.46, 0.42), mats.woodDark, side * 0.78, 0.23, 0));
    }
    return g;
  },

  flowerbox: () => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    g.add(mesh(uvBox(1.1, 0.30, 0.36, 1.6), mats.wood, 0, 0.15, 0));
    const bloom = foliageMaterial({ color: '#5f815c', ramp: 'terrain', amplitude: 0.10, stiffness: 0.9 });
    windMaterials.add(bloom);
    for (let i = 0; i < 7; i++) {
      const x = -0.44 + (i / 6) * 0.88;
      g.add(mesh(geo('bloom', () => new THREE.IcosahedronGeometry(0.16, 0)), bloom, x, 0.36, (i % 2) * 0.10 - 0.05));
    }
    const petalColors = ['#d5766a', '#ffd76a', '#8a68ab'];
    for (let i = 0; i < 6; i++) {
      const c = petalColors[i % 3];
      g.add(mesh(geo('petal', () => new THREE.IcosahedronGeometry(0.07, 0)),
        toonMaterial({ color: c, ramp: 'terrain' }),
        -0.40 + (i / 5) * 0.80, 0.46, (i % 2) * 0.12 - 0.06));
    }
    return g;
  },

  signpost: () => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    g.add(mesh(cyl(0.08, 0.10, 2.1, 6), mats.woodDark, 0, 1.05, 0));
    for (const [y, dir] of [[1.85, 1], [1.50, -1]]) {
      const arm = mesh(uvBox(0.95, 0.24, 0.06, 1.6), mats.wood, dir * 0.50, y, 0);
      g.add(arm);
    }
    return g;
  },

  chest: (opened = false) => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    const body = mesh(uvBox(0.86, 0.52, 0.60, 1.6), mats.wood, 0, 0.26, 0);
    g.add(body);
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.52, -0.30);
    g.add(lidPivot);
    const lid = mesh(uvBox(0.90, 0.16, 0.62, 1.6), mats.wood, 0, 0.08, 0.30);
    lidPivot.add(lid);
    lidPivot.add(mesh(box(0.94, 0.06, 0.10), mats.gold, 0, 0.14, 0.30));
    if (opened) lidPivot.rotation.x = -2.1;
    g.add(mesh(box(0.18, 0.22, 0.06), mats.gold, 0, 0.34, 0.31));
    for (const x of [-0.34, 0.34]) g.add(mesh(box(0.07, 0.54, 0.62), mats.gold, x, 0.26, 0));
    g.userData.lid = lidPivot;
    return g;
  },

  /**
   * A stone bridge: arched span, parapets, cutwater piers. Built properly
   * rather than faked with a flat-roofed building — a bridge is the thing the
   * player crosses on the way out of the first town, so it carries weight.
   */
  bridge: (span = 6) => {
    const mats = kitMaterials();
    const g = new THREE.Group();
    const width = 4.4;
    const segments = 9;
    const rise = 0.55;

    // Deck: segments following a shallow arc.
    for (let i = 0; i < segments; i++) {
      const t = (i + 0.5) / segments;
      const y = Math.sin(t * Math.PI) * rise;
      const z = -span / 2 + t * span;
      const slab = mesh(uvBox(width, 0.30, span / segments + 0.06, 0.6), mats.stoneFine, 0, y, z);
      g.add(slab);
      // Parapets ride the same arc.
      for (const side of [-1, 1]) {
        g.add(mesh(uvBox(0.34, 0.66, span / segments + 0.06, 0.7), mats.stone,
          side * (width / 2 - 0.17), y + 0.48, z));
        g.add(mesh(box(0.44, 0.12, span / segments + 0.06), mats.stoneFine,
          side * (width / 2 - 0.17), y + 0.86, z));
      }
    }
    // Piers at each bank, with a wedge cutwater facing upstream.
    for (const side of [-1, 1]) {
      g.add(mesh(uvBox(width + 0.5, 1.4, 1.0, 0.6), mats.stone, 0, -0.55, side * (span / 2 - 0.2)));
    }
    g.add(mesh(cyl(0.5, 0.7, 1.6, 3), mats.stone, -width / 2 - 0.2, -0.5, 0));
    return g;
  },

  savepoint: () => {
    const g = new THREE.Group();
    const mat = aetherMaterial({ color: '#3fc6d6', intensity: 0.85, scroll: [0, -0.35], opacity: 0.7 });
    aetherMaterials.add(mat);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), mat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.04;
    g.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 6, 28), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);
    const light = new THREE.PointLight(0x3fc6d6, 3.2, 8, 2);
    light.position.y = 1.0;
    g.add(light);
    g.userData.spin = [disc, ring];
    return g;
  },

  /**
   * Mooring mast. Where the airship is parked and boarded from.
   *
   * Built as a scaffold rather than a tower so it reads as temporary — the
   * Gallowglass is not the kind of thing anyone built infrastructure for, and
   * a permanent-looking mast would imply an aviation industry the world does
   * not have.
   */
  airshipmast: () => {
    const M = kitMaterials();
    const g = new THREE.Group();

    // Four raking legs braced into a platform.
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.2, 6), M.woodDark);
      leg.position.set(sx * 1.0, 2.6, sz * 1.0);
      leg.rotation.z = -sx * 0.13;
      leg.rotation.x = sz * 0.13;
      leg.castShadow = true;
      g.add(leg);
    }
    for (const y of [1.5, 3.2]) {
      for (const axis of [0, 1]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(axis ? 0.08 : 2.2, 0.08, axis ? 2.2 : 0.08), M.woodDark);
        brace.position.set(axis ? 1.0 : 0, y, axis ? 0 : 1.0);
        g.add(brace);
        const b2 = brace.clone();
        b2.position.set(axis ? -1.0 : 0, y, axis ? 0 : -1.0);
        g.add(b2);
      }
    }

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 2.6), M.woodFloor);
    deck.position.y = 5.2;
    deck.castShadow = true;
    g.add(deck);

    // The mooring arm itself, and a lamp on it so the mast is findable at night.
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), M.iron);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(1.2, 5.6, 0);
    g.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M.lamp);
    lamp.position.set(2.3, 5.6, 0);
    g.add(lamp);
    const light = new THREE.PointLight(0xffbb55, 2.4, 12, 2);
    light.position.set(2.3, 5.6, 0);
    g.add(light);

    // Ladder up the near face, so the platform reads as reachable.
    for (let i = 0; i < 9; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), M.woodDark);
      rung.position.set(0, 0.6 + i * 0.52, 1.05);
      g.add(rung);
    }

    return g;
  },
};

// ---------------------------------------------------------------------------
// Vegetation
// ---------------------------------------------------------------------------

let foliageMats = null;
function foliage() {
  if (foliageMats) return foliageMats;
  const make = (color, amp) => {
    const m = foliageMaterial({ color, ramp: 'terrain', amplitude: amp, stiffness: 0.45 });
    windMaterials.add(m);
    return m;
  };
  foliageMats = {
    broadleaf: make('#5f8a4a', 0.15),
    broadleafDark: make('#3f6340', 0.14),
    autumn: make('#a06a2e', 0.15),
    pine: make('#2f4a36', 0.09),
    palm: make('#6a9a52', 0.22),
    bush: make('#4a7040', 0.11),
    dead: make('#63503f', 0.13),
    swampReed: make('#57653a', 0.26),
  };
  return foliageMats;
}

/**
 * Trees are built from stacked, jittered canopy lobes on a leaning trunk.
 * The lean matters: perfectly vertical trunks in a row read as telegraph poles.
 */
export function tree({ kind = 'broadleaf', scale = 1, seed = 0 } = {}) {
  const mats = kitMaterials();
  const f = foliage();
  const g = new THREE.Group();
  // Deterministic per-instance jitter from the seed.
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  if (kind === 'pine') {
    const h = 5.2 * scale;
    g.add(mesh(cyl(0.16 * scale, 0.34 * scale, h, 7), mats.bark, 0, h / 2, 0));
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const r = (1.75 - t * 1.25) * scale;
      const cone = mesh(geo(`pinecone:${i}`, () => new THREE.ConeGeometry(1, 1, 7)), f.pine,
        0, (1.5 + t * 3.6) * scale, 0);
      cone.scale.set(r, (1.7 - t * 0.5) * scale, r);
      g.add(cone);
    }
  } else if (kind === 'palm') {
    const h = 5.0 * scale;
    const lean = 0.14 + rnd() * 0.12;
    const trunk = new THREE.Group();
    let parent = trunk;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      seg.position.y = i === 0 ? 0 : h / 5;
      seg.rotation.z = lean / 5;
      parent.add(seg);
      const m = mesh(cyl(0.17 * scale, 0.21 * scale, h / 5, 7), mats.bark, 0, h / 10, 0);
      seg.add(m);
      parent = seg;
    }
    g.add(trunk);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd();
      const frond = mesh(geo('frond', () => new THREE.ConeGeometry(0.42, 2.5, 4)), f.palm, 0, 0, 0);
      frond.scale.set(scale, scale, scale * 0.35);
      frond.position.set(Math.cos(a) * 1.05 * scale, -0.15 * scale, Math.sin(a) * 1.05 * scale);
      frond.rotation.set(Math.sin(a) * 1.15, -a, -Math.cos(a) * 1.15);
      parent.add(frond);
    }
  } else if (kind === 'dead') {
    const h = 4.2 * scale;
    g.add(mesh(cyl(0.14 * scale, 0.40 * scale, h, 6), mats.bark, 0, h / 2, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rnd() * 0.8;
      const len = (1.2 + rnd() * 1.0) * scale;
      const branch = mesh(cyl(0.04 * scale, 0.10 * scale, len, 5), mats.bark,
        Math.cos(a) * len * 0.32, h * (0.55 + rnd() * 0.4), Math.sin(a) * len * 0.32);
      branch.rotation.set(Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0);
      g.add(branch);
    }
  } else {
    const leafMat = kind === 'autumn' ? f.autumn : kind === 'dark' ? f.broadleafDark : f.broadleaf;
    const h = (3.0 + rnd() * 0.8) * scale;
    const lean = (rnd() - 0.5) * 0.14;
    const trunk = mesh(cyl(0.20 * scale, 0.38 * scale, h, 7), mats.bark, 0, h / 2, 0);
    trunk.rotation.z = lean;
    g.add(trunk);
    // Two forking limbs give the canopy something to sit on.
    for (const side of [-1, 1]) {
      const b = mesh(cyl(0.10 * scale, 0.16 * scale, 1.3 * scale, 5), mats.bark,
        side * 0.35 * scale, h * 0.86, (rnd() - 0.5) * 0.4 * scale);
      b.rotation.z = side * -0.55;
      g.add(b);
    }
    const lobes = 4 + Math.floor(rnd() * 2);
    for (let i = 0; i < lobes; i++) {
      const r = (1.30 - i * 0.13 + rnd() * 0.28) * scale;
      const lobe = mesh(geo('lobe', () => new THREE.IcosahedronGeometry(1, 1)), leafMat,
        (rnd() - 0.5) * 1.5 * scale,
        (h + 0.5 + i * 0.55 + rnd() * 0.3) * 1.0,
        (rnd() - 0.5) * 1.5 * scale);
      lobe.scale.setScalar(r);
      lobe.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      g.add(lobe);
    }
  }
  return g;
}

export function bush({ scale = 1, seed = 0, kind = 'bush' } = {}) {
  const f = foliage();
  const g = new THREE.Group();
  let s = seed * 7919 + 104729;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const lobes = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < lobes; i++) {
    const r = (0.42 + rnd() * 0.30) * scale;
    const lobe = mesh(geo('bushlobe', () => new THREE.IcosahedronGeometry(1, 0)), f[kind] || f.bush,
      (rnd() - 0.5) * 0.8 * scale, r * 0.82, (rnd() - 0.5) * 0.8 * scale);
    lobe.scale.setScalar(r);
    lobe.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    g.add(lobe);
  }
  return g;
}

export function rock({ scale = 1, seed = 0, material = 'rock' } = {}) {
  const mats = kitMaterials();
  const g = new THREE.Group();
  let s = seed * 6151 + 1;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const count = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < count; i++) {
    const r = (0.5 + rnd() * 0.7) * scale / (i + 1);
    const m = mesh(geo('rockgeo', () => new THREE.DodecahedronGeometry(1, 0)),
      material === 'cave' ? mats.caveRock : mats.rock,
      (rnd() - 0.5) * scale, r * 0.6, (rnd() - 0.5) * scale);
    m.scale.set(r, r * (0.6 + rnd() * 0.5), r * (0.8 + rnd() * 0.4));
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    g.add(m);
  }
  return g;
}
