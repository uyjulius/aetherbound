import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { kitMaterials, building, tree, bush, rock, PROPS, signboard } from './kit.js';
import { toonMaterial, waterMaterial, waterMaterials, skyMaterial } from '../fx/materials.js';
import { assets } from '../engine/assets.js';
import { LIGHT_PRESETS } from '../engine/renderer.js';

/**
 * Map format and world construction.
 *
 * Maps are hand-authored. The terrain is an ASCII grid — the same thing a
 * 16-bit map editor produced, and readable and editable directly in source —
 * and everything with real presence (buildings, props, NPCs) is an explicit
 * placement with explicit parameters. Nothing about a map is generated at
 * runtime; the builder only translates the authored description into meshes
 * and a collision grid.
 *
 *   export const MAP = {
 *     id: 'harrowmere',
 *     name: 'Harrowmere',
 *     subtitle: 'Village on the Silt Road',
 *     kind: 'town',
 *     light: 'day', grade: 'noon',
 *     fog: ['#9fb2b8', 95, 300],
 *     music: 'town_harrowmere',
 *     base: 'grass',
 *     terrain: [
 *       '################',
 *       '#....,,,,,......#',
 *       ...
 *     ],
 *     props: [ { kit:'building', at:[8,6], rot:0, w:6, d:5, style:'plaster' } ],
 *     npcs:  [ { id:'miller', at:[10,9], face:'south', clip:'work', ... } ],
 *     exits: [ { at:[8,15], size:[2,1], to:'world', spawn:'harrowmere' } ],
 *   };
 */

/** One terrain cell in world units. Characters are ~1.7 units tall. */
export const TILE = 2;

/**
 * Terrain legend. `g` is the ground material, `walk` whether it can be entered,
 * `h` an elevation step in world units.
 */
/**
 * Terrain legend.
 *
 * `g` is the ground material, `walk` whether it can be entered, and `prop`
 * names a kit piece placed once at the centre of every tile carrying that
 * glyph. Glyph-props are how forests and orchards get authored: the *mask* is
 * hand-drawn in the terrain grid exactly like a 2D tilemap, and the builder
 * places precisely one instance per authored tile. Nothing is scattered or
 * sampled — a forest is only ever as big as the letters typed for it.
 */
export const LEGEND = {
  '.': { g: 'grass', walk: true },
  ',': { g: 'dirt', walk: true },
  '=': { g: 'cobble', walk: true },
  '%': { g: 'sand', walk: true },
  '*': { g: 'snow', walk: true },
  'o': { g: 'wood', walk: true },
  'M': { g: 'marble', walk: true },
  'R': { g: 'rock', walk: true },
  'C': { g: 'cave', walk: true },
  'A': { g: 'aether', walk: true },
  'G': { g: 'magitek', walk: true },
  '~': { g: 'water', walk: false, water: true },
  ':': { g: 'water', walk: true, water: true, shallow: true },
  '#': { g: 'rock', walk: false, wall: true },
  'X': { g: 'cave', walk: false, wall: true },
  '^': { g: 'rock', walk: false, cliff: true },
  ' ': { g: null, walk: false, void: true },

  // --- glyph-props ---------------------------------------------------------
  'f': { g: 'grass', walk: false, prop: 'forest' },        // dense wood, blocks
  't': { g: 'grass', walk: true, prop: 'tree' },           // scattered trees
  'p': { g: 'snow', walk: false, prop: 'pine' },
  'd': { g: 'dirt', walk: true, prop: 'deadtree' },
  'b': { g: 'grass', walk: true, prop: 'bush' },
  's': { g: 'sand', walk: true, prop: 'palm' },
  'r': { g: 'rock', walk: true, prop: 'boulder' },
  'w': { g: 'swamp', walk: true, prop: 'reeds' },
};

/** Kit builders used by glyph-props, and their collision radius. */
const GLYPH_PROPS = {
  forest:   { make: (seed) => tree({ kind: 'dark', scale: 1.25, seed }), radius: 0 },
  tree:     { make: (seed) => tree({ kind: 'broadleaf', scale: 1.1, seed }), radius: 0.6 },
  pine:     { make: (seed) => tree({ kind: 'pine', scale: 1.2, seed }), radius: 0 },
  deadtree: { make: (seed) => tree({ kind: 'dead', scale: 1.0, seed }), radius: 0.5 },
  bush:     { make: (seed) => bush({ scale: 1.2, seed }), radius: 0 },
  palm:     { make: (seed) => tree({ kind: 'palm', scale: 1.15, seed }), radius: 0.5 },
  boulder:  { make: (seed) => rock({ scale: 1.6, seed }), radius: 0.9 },
  reeds:    { make: (seed) => bush({ scale: 0.9, seed, kind: 'swampReed' }), radius: 0 },
};

const GROUND_TEX = {
  grass: 'grass', dirt: 'dirt_path', cobble: 'cobblestone', sand: 'sand',
  snow: 'snow', wood: 'wood_floor', marble: 'marble_floor',
  rock: 'rock_cliff', cave: 'cave_rock', swamp: 'dirt_path',
  aether: 'aether_stone', magitek: 'magitek_panel',
};

// ---------------------------------------------------------------------------
// Glyph-props
// ---------------------------------------------------------------------------

/**
 * Flatten a kit group into merged geometry, one entry per material.
 *
 * An overworld forest is several hundred trees, and a tree is eight meshes.
 * Drawn individually that is thousands of draw calls; merged per material and
 * instanced it is two.
 */
function flattenToInstanceable(group) {
  group.updateMatrixWorld(true);
  const byMaterial = new Map();
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const key = o.material;
    const geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    // Merging requires identical attribute sets across the batch.
    for (const name of Object.keys(geo.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    }
    if (!geo.attributes.uv) {
      const count = geo.attributes.position.count;
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    if (!byMaterial.has(key)) byMaterial.set(key, []);
    byMaterial.get(key).push(geo);
  });

  const out = [];
  for (const [material, geos] of byMaterial) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (merged) out.push({ geometry: merged, material });
  }
  return out;
}

/**
 * Place one instance of a kit piece at the centre of every tile bearing a
 * glyph-prop. Per-tile rotation and scale come from the tile coordinates, so
 * a forest never looks like a grid of clones — and re-loading the map always
 * reproduces exactly the same wood.
 */
function buildGlyphProps(def, grid, group, cellOf, W, H) {
  const buckets = new Map();
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const cell = cellOf(x, z);
      if (!cell.prop) continue;
      if (!buckets.has(cell.prop)) buckets.set(cell.prop, []);
      buckets.get(cell.prop).push([x, z]);
    }
  }

  for (const [name, tiles] of buckets) {
    const spec = GLYPH_PROPS[name];
    if (!spec) { console.warn(`[map] unknown glyph prop "${name}"`); continue; }
    const prototype = spec.make(1);
    const parts = flattenToInstanceable(prototype);
    if (!parts.length) continue;

    const dummy = new THREE.Object3D();
    for (const part of parts) {
      const inst = new THREE.InstancedMesh(part.geometry, part.material, tiles.length);
      inst.castShadow = true;
      inst.receiveShadow = true;
      inst.name = `glyph:${name}`;
      tiles.forEach(([x, z], i) => {
        // Deterministic jitter keyed on the tile, not a random source.
        const h = (x * 73856093) ^ (z * 19349663);
        const r1 = ((h >>> 0) % 1000) / 1000;
        const r2 = ((h >>> 10) % 1000) / 1000;
        const r3 = ((h >>> 20) % 1000) / 1000;
        dummy.position.set(
          x * TILE + TILE / 2 + (r1 - 0.5) * TILE * 0.45,
          0,
          z * TILE + TILE / 2 + (r2 - 0.5) * TILE * 0.45,
        );
        dummy.rotation.set(0, r3 * Math.PI * 2, 0);
        dummy.scale.setScalar(0.82 + r1 * 0.42);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      group.add(inst);
    }

    if (spec.radius > 0) {
      for (const [x, z] of tiles) {
        grid.addCircle(x * TILE + TILE / 2, z * TILE + TILE / 2, spec.radius, name);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Collision
// ---------------------------------------------------------------------------

export class CollisionGrid {
  constructor(width, height) {
    this.w = width;
    this.h = height;
    this.walk = new Uint8Array(width * height);
    this.shapes = [];       // explicit colliders from props
    this.triggers = [];     // {x,z,w,d,kind,data}
  }

  setWalk(x, z, v) {
    if (x < 0 || z < 0 || x >= this.w || z >= this.h) return;
    this.walk[z * this.w + x] = v ? 1 : 0;
  }

  isWalkTile(x, z) {
    if (x < 0 || z < 0 || x >= this.w || z >= this.h) return false;
    return this.walk[z * this.w + x] === 1;
  }

  /** World position → walkable? */
  isWalkWorld(wx, wz) {
    return this.isWalkTile(Math.floor(wx / TILE), Math.floor(wz / TILE));
  }

  addCircle(x, z, r, tag) { this.shapes.push({ kind: 'circle', x, z, r, tag }); }
  addRect(x, z, w, d, rot = 0, tag) { this.shapes.push({ kind: 'rect', x, z, w, d, rot, tag }); }

  /**
   * Resolve a movement from `from` to `to` for a body of `radius`.
   *
   * Axis-separated: if the combined move is blocked, try each axis alone. That
   * single detail is the difference between a character that slides smoothly
   * along a wall and one that sticks on every corner — and sticking is the
   * fastest way to make exploration feel bad.
   */
  resolve(fromX, fromZ, toX, toZ, radius) {
    const tryMove = (x, z) => (this.clear(x, z, radius) ? { x, z } : null);
    const full = tryMove(toX, toZ);
    if (full) return full;
    const slideX = tryMove(toX, fromZ);
    if (slideX) return slideX;
    const slideZ = tryMove(fromX, toZ);
    if (slideZ) return slideZ;

    // Never trap. If the *standing* position is itself illegal — a script
    // placed someone badly, a collider changed under a saved position, a
    // ruin variant redrew the ground — then every candidate above fails and
    // the mover is stuck in every direction forever, with no way out and no
    // error. A body inside geometry may always walk, so it can escape; it
    // just cannot use collision to stop, which it has already lost anyway.
    if (!this.clear(fromX, fromZ, radius)) return { x: toX, z: toZ };
    return { x: fromX, z: fromZ };
  }

  /** Is a circle at (x,z) free of terrain and shape collisions? */
  clear(x, z, r) {
    // Sample the grid at the body's extremes rather than just its centre.
    for (const [ox, oz] of [[0, 0], [-r, 0], [r, 0], [0, -r], [0, r],
      [-r * 0.7, -r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, r * 0.7]]) {
      if (!this.isWalkWorld(x + ox, z + oz)) return false;
    }
    for (const s of this.shapes) {
      if (s.kind === 'circle') {
        const d = Math.hypot(x - s.x, z - s.z);
        if (d < s.r + r) return false;
      } else {
        // Rotate the point into the rect's local frame.
        const c = Math.cos(-s.rot), sn = Math.sin(-s.rot);
        const dx = x - s.x, dz = z - s.z;
        const lx = dx * c - dz * sn;
        const lz = dx * sn + dz * c;
        if (Math.abs(lx) < s.w / 2 + r && Math.abs(lz) < s.d / 2 + r) return false;
      }
    }
    return true;
  }

  /** Trigger whose area contains the point, if any. */
  triggerAt(x, z) {
    for (const t of this.triggers) {
      if (x >= t.x && x <= t.x + t.w && z >= t.z && z <= t.z + t.d) return t;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Ground construction
// ---------------------------------------------------------------------------

/**
 * Build the ground.
 *
 * The base layer covers everything; other terrain types are laid over it as
 * feathered decals whose alpha fades wherever they meet a different type. Hard
 * tile boundaries are what make a 3D world look like a spreadsheet, and this
 * gives paths organic, painted edges for the cost of a few extra quads.
 */
function buildGround(def, grid, group) {
  const rows = def.terrain;
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  const cellOf = (x, z) => {
    if (x < 0 || z < 0 || x >= W || z >= H) return LEGEND[' '];
    return LEGEND[rows[z][x]] || LEGEND['.'];
  };

  const base = def.base || 'grass';

  // --- base plane, with tonal variation baked into vertex colour ----------
  const seg = 2;                                  // sub-tiles per cell
  const geoW = W * seg, geoH = H * seg;
  const baseGeo = new THREE.PlaneGeometry(W * TILE, H * TILE, geoW, geoH);
  baseGeo.rotateX(-Math.PI / 2);
  baseGeo.translate(W * TILE / 2, 0, H * TILE / 2);
  {
    const pos = baseGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const warm = new THREE.Color('#d8c48c');
    const cool = new THREE.Color('#9fb0d8');
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const n = Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.5
              + Math.sin(x * 0.037 + z * 0.041) * 0.5;
      tmp.setRGB(1, 1, 1).lerp(warm, Math.max(0, n) * 0.26).lerp(cool, Math.max(0, -n) * 0.22);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    baseGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  const baseMesh = new THREE.Mesh(baseGeo, toonMaterial({
    map: assets.tiled(GROUND_TEX[base] || 'grass', W * TILE * 0.25, H * TILE * 0.25),
    ramp: def.groundRamp || 'terrain',
    vertexColors: true,
  }));
  baseMesh.receiveShadow = true;
  baseMesh.name = 'ground-base';
  group.add(baseMesh);

  // --- overlay decals per additional terrain type -------------------------
  const types = new Map();
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const cell = cellOf(x, z);
      if (!cell.g || cell.water || cell.g === base) continue;
      if (!types.has(cell.g)) types.set(cell.g, []);
      types.get(cell.g).push([x, z]);
    }
  }

  let layer = 0;
  for (const [type, cells] of types) {
    const positions = [];
    const uvs = [];
    const colors = [];
    const indices = [];
    let vi = 0;
    for (const [x, z] of cells) {
      const sameAt = (dx, dz) => {
        const c = cellOf(x + dx, z + dz);
        return c.g === type;
      };
      // Corner alpha falls off wherever the neighbouring cells differ, which
      // feathers the decal into the base instead of ending on a hard tile edge.
      const cornerAlpha = (cx, cz) => {
        let n = 1;
        n += sameAt(cx, 0) ? 1 : 0;
        n += sameAt(0, cz) ? 1 : 0;
        n += sameAt(cx, cz) ? 1 : 0;
        return n / 4;
      };
      const x0 = x * TILE, z0 = z * TILE;
      const corners = [
        [x0, z0, -1, -1], [x0 + TILE, z0, 1, -1],
        [x0 + TILE, z0 + TILE, 1, 1], [x0, z0 + TILE, -1, 1],
      ];
      for (const [px, pz, cx, cz] of corners) {
        positions.push(px, 0, pz);
        uvs.push(px * 0.25, pz * 0.25);
        const a = cornerAlpha(cx, cz);
        colors.push(1, 1, 1, a * a); // squared so the falloff hugs the edge
      }
      indices.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
      vi += 4;
    }
    if (!positions.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    g.setIndex(indices);
    g.computeVertexNormals();
    const mat = toonMaterial({
      map: assets.tiled(GROUND_TEX[type] || 'dirt_path', 1),
      ramp: def.groundRamp || 'terrain',
      vertexColors: true,
      transparent: true,
    });
    mat.depthWrite = false;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1 - layer;
    mat.polygonOffsetUnits = -1;
    const m = new THREE.Mesh(g, mat);
    m.position.y = 0.012 + layer * 0.004;
    m.receiveShadow = true;
    m.name = `ground-${type}`;
    group.add(m);
    layer++;
  }

  // --- water --------------------------------------------------------------
  const waterCells = [];
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) if (cellOf(x, z).water) waterCells.push([x, z]);
  }
  if (waterCells.length) {
    const positions = [], uvs = [], indices = [];
    let vi = 0;
    for (const [x, z] of waterCells) {
      const x0 = x * TILE, z0 = z * TILE;
      positions.push(x0, 0, z0, x0 + TILE, 0, z0, x0 + TILE, 0, z0 + TILE, x0, 0, z0 + TILE);
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      indices.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
      vi += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    const mat = waterMaterial(def.water || {});
    waterMaterials.add(mat);
    const m = new THREE.Mesh(g, mat);
    m.position.y = def.waterLevel ?? -0.18;
    m.name = 'water';
    group.add(m);
  }

  // --- walls / cliffs -----------------------------------------------------
  const mats = kitMaterials();
  const wallCells = [];
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const c = cellOf(x, z);
      if (c.wall || c.cliff) wallCells.push([x, z, c]);
    }
  }
  if (wallCells.length) {
    // A town's boundary is a rampart, not a cliff face. Maps can name the
    // material so the same glyph reads correctly in a city and a cave.
    const wallMat = def.wallMaterial
      ? (mats[def.wallMaterial] || mats.rock)
      : (def.kind === 'dungeon' || def.kind === 'cave' ? mats.caveRock : mats.rock);
    const wallH = def.wallHeight ?? 4.5;
    for (const [x, z, c] of wallCells) {
      // Only build faces that border something walkable — interior fill is
      // never seen and would multiply the draw call count for nothing.
      const exposed = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => {
        const n = cellOf(x + dx, z + dz);
        return n.walk;
      });
      if (!exposed) continue;
      const h = wallH * (0.85 + ((x * 7 + z * 13) % 5) * 0.06);
      const m = new THREE.Mesh(new THREE.BoxGeometry(TILE, h, TILE), wallMat);
      m.position.set(x * TILE + TILE / 2, h / 2 - 0.2, z * TILE + TILE / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      // Slight per-cell rotation and scale so a wall run isn't a perfect extrusion.
      m.rotation.y = (((x * 31 + z * 17) % 7) - 3) * 0.012;
      m.scale.x = 1 + (((x * 11 + z * 5) % 5) - 2) * 0.01;
      group.add(m);
    }
  }

  return { W, H };
}

// ---------------------------------------------------------------------------
// Prop placement
// ---------------------------------------------------------------------------

/**
 * The footprint a prop presents to somebody walking into it.
 *
 * Only geometry standing at body height counts. A tree is a trunk you walk
 * around and a canopy you walk *under*; measuring the whole object would put
 * a three-metre wall around every sapling. The band stops below head height
 * for the same reason — a shop awning is not an obstacle.
 *
 * This replaces a table of per-kit radii. A circle around a long thin prop is
 * the reason towns had invisible walls: a bench is two metres of seat and a
 * handspan deep, and a circle enclosing it also encloses a metre of open
 * floor at each end, which the player can see perfectly well and cannot walk
 * on. Measured boxes match what is drawn.
 */
const BODY_HEIGHT = 1.35;

function groundFootprint(obj) {
  obj.updateMatrixWorld(true);
  const origin = obj.position.clone();
  const rot = obj.rotation.y;
  const cos = Math.cos(-rot), sin = Math.sin(-rot);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let found = false;

  obj.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry;
    if (!geo) return;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    // Sample the corners of the mesh's own box in world space, then drop it
    // if the whole thing floats above walking height.
    const pts = [];
    for (const x of [bb.min.x, bb.max.x]) {
      for (const y of [bb.min.y, bb.max.y]) {
        for (const z of [bb.min.z, bb.max.z]) {
          pts.push(new THREE.Vector3(x, y, z).applyMatrix4(o.matrixWorld));
        }
      }
    }
    if (Math.min(...pts.map((v) => v.y)) > BODY_HEIGHT) return;
    for (const v of pts) {
      // Back into the prop's own frame, so a rotated prop gets a rect that
      // hugs it rather than an axis-aligned box swollen by the rotation.
      const dx = v.x - origin.x, dz = v.z - origin.z;
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      minX = Math.min(minX, lx); maxX = Math.max(maxX, lx);
      minZ = Math.min(minZ, lz); maxZ = Math.max(maxZ, lz);
      found = true;
    }
  });

  if (!found) return null;
  const w = maxX - minX, d = maxZ - minZ;
  if (w < 0.05 || d < 0.05) return null;
  return { w, d };
}

function placeProps(def, grid, group, ctx) {
  const results = { interactables: [], lamps: [], spinners: [], chests: [] };
  for (const p of def.props || []) {
    let obj = null;
    const [tx, tz] = p.at;
    const wx = tx * TILE, wz = tz * TILE;

    switch (p.kit) {
      case 'building': obj = building(p); break;
      case 'tree': obj = tree(p); break;
      case 'bush': obj = bush(p); break;
      case 'rock': obj = rock(p); break;
      case 'sign': obj = signboard(p.text, p.icon); break;
      default:
        if (PROPS[p.kit]) obj = PROPS[p.kit](p.arg);
        break;
    }
    if (!obj) {
      console.warn(`[map] unknown kit "${p.kit}" in ${def.id}`);
      continue;
    }

    obj.position.set(wx, p.y ?? 0, wz);
    obj.rotation.y = p.rot ?? 0;
    if (p.scale) obj.scale.setScalar(p.scale);
    group.add(obj);

    // Collision: buildings get a rect from their footprint, props a box
    // measured from the geometry that actually stands at body height.
    if (p.solid !== false) {
      if (p.kit === 'building') {
        const f = obj.userData.footprint;
        grid.addRect(wx, wz, f.w, f.d, p.rot ?? 0, p.id);
      } else if (p.radius !== 0) {
        if (p.radius) {
          grid.addCircle(wx, wz, p.radius, p.id);
        } else {
          const fit = groundFootprint(obj);
          if (fit) grid.addRect(wx, wz, fit.w, fit.d, p.rot ?? 0, p.id);
        }
      }
    }

    // A building with `enter` gets a doorway trigger placed on the outside of
    // whichever face carries its door, so walking into the door works rather
    // than requiring a separate "press to enter" prompt.
    if (p.enter && p.kit === 'building') {
      const face = p.door || 'south';
      const halfW = (p.w ?? 6) / 2;
      const halfD = (p.d ?? 5) / 2;
      const offset = { south: [0, halfD + 0.6], north: [0, -halfD - 0.6],
        east: [halfW + 0.6, 0], west: [-halfW - 0.6, 0] }[face] || [0, halfD + 0.6];
      const rot = p.rot ?? 0;
      const c = Math.cos(rot), s = Math.sin(rot);
      const dx = offset[0] * c - offset[1] * s;
      const dz = offset[0] * s + offset[1] * c;
      grid.triggers.push({
        x: wx + dx - TILE / 2, z: wz + dz - TILE / 2, w: TILE, d: TILE,
        kind: 'exit',
        data: { to: p.enter, spawn: p.enterSpawn ?? 'default', prompt: p.enterPrompt ?? 'Enter' },
      });
    }

    if (obj.userData.light) results.lamps.push(obj.userData.light);
    if (obj.userData.spin) results.spinners.push(obj);
    if (p.kit === 'chest') results.chests.push({ obj, def: p });
    if (p.interact) {
      results.interactables.push({
        obj, at: [wx, wz], radius: p.interactRadius ?? 1.8, data: p.interact, id: p.id,
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// The built map
// ---------------------------------------------------------------------------

export class BuiltMap {
  constructor(def) {
    this.def = def;
    this.group = new THREE.Group();
    this.group.name = `map:${def.id}`;
    this.grid = null;
    this.width = 0;
    this.height = 0;
    this.lamps = [];
    this.spinners = [];
    this.interactables = [];
    this.chests = [];
    this.npcs = [];
    this.sky = null;
  }

  get worldWidth() { return this.width * TILE; }
  get worldDepth() { return this.height * TILE; }

  /** Convert a tile coordinate (may be fractional) to a world centre point. */
  static tileToWorld(tx, tz) {
    return new THREE.Vector3(tx * TILE, 0, tz * TILE);
  }

  update(dt, time) {
    for (const s of this.spinners) {
      for (const m of s.userData.spin) m.rotation.z += dt * 0.5;
    }
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
      }
    });
    this.group.removeFromParent();
  }
}

/** Construct a map definition into a live scene graph plus collision. */
export function buildMap(def) {
  const built = new BuiltMap(def);
  const rows = def.terrain;
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  built.width = W;
  built.height = H;

  const grid = new CollisionGrid(W, H);
  built.grid = grid;
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const ch = rows[z][x] ?? ' ';
      const cell = LEGEND[ch] || LEGEND['.'];
      grid.setWalk(x, z, cell.walk);
    }
  }

  buildGround(def, grid, built.group);
  const cellOf = (x, z) => {
    if (x < 0 || z < 0 || x >= W || z >= H) return LEGEND[' '];
    return LEGEND[rows[z][x]] || LEGEND['.'];
  };
  buildGlyphProps(def, grid, built.group, cellOf, W, H);
  const placed = placeProps(def, grid, built.group, built);
  built.lamps = placed.lamps;
  // Lamps are built dark and lit by the map, so the same prop works as unlit
  // street furniture at noon and as the only light source in a barrow.
  const lampIntensity = def.lampIntensity
    ?? (['cave', 'night', 'void', 'ruin'].includes(def.light) ? 9 : 0);
  for (const lamp of built.lamps) {
    lamp.intensity = lampIntensity;
    lamp.distance = def.lampRange ?? 12;
  }
  built.spinners = placed.spinners;
  built.interactables = placed.interactables;
  built.chests = placed.chests;

  // Triggers: exits and scripted zones.
  for (const e of def.exits || []) {
    const [tx, tz] = e.at;
    const [tw, td] = e.size || [1, 1];
    grid.triggers.push({
      x: tx * TILE, z: tz * TILE, w: tw * TILE, d: td * TILE,
      kind: 'exit', data: e,
    });
  }
  for (const t of def.triggers || []) {
    const [tx, tz] = t.at;
    const [tw, td] = t.size || [1, 1];
    grid.triggers.push({
      x: tx * TILE, z: tz * TILE, w: tw * TILE, d: td * TILE,
      kind: t.kind || 'event', data: t,
    });
  }

  if (def.sky) {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 20), skyMaterial(def.sky));
    sky.frustumCulled = false;
    sky.name = 'sky';
    built.sky = sky;
    built.group.add(sky);
  }

  return built;
}

/**
 * Resolve a map definition against the current world state.
 *
 * The second half of the game reuses the same geography under a different sky.
 * Rather than duplicating ten map files, a map may carry a `ruin` block whose
 * keys are merged over the base — atmosphere, music, encounters, and lists of
 * props/NPCs to add or remove by id. That keeps the two worlds genuinely the
 * same *place*, which is the entire emotional point of the device: the player
 * should recognise a street and find it wrong.
 */
export function resolveMap(def, worldState = 'whole') {
  const override = worldState === 'ruin' ? def.ruin : null;
  if (!override) return def;

  const merged = { ...def, ...override };

  // `removeProps` / `removeNpcs` take ids; `props` / `npcs` in the override are
  // additive rather than replacing, since most of a town survives.
  const dropProps = new Set(override.removeProps || []);
  const dropNpcs = new Set(override.removeNpcs || []);
  merged.props = [
    ...(def.props || []).filter((p) => !dropProps.has(p.id)),
    ...(override.props || []),
  ];
  merged.npcs = [
    ...(def.npcs || []).filter((n) => !dropNpcs.has(n.id)),
    ...(override.npcs || []),
  ];
  if (override.terrain) merged.terrain = override.terrain;
  // Triggers and exits replace wholesale when given, since routes change.
  merged.triggers = override.triggers ?? def.triggers;
  merged.exits = override.exits ?? def.exits;
  delete merged.ruin;
  delete merged.removeProps;
  delete merged.removeNpcs;
  return merged;
}

/** Apply a map's atmosphere to the renderer. */
export function applyAtmosphere(renderer, def) {
  renderer.lights.apply(LIGHT_PRESETS[def.light || 'day']);
  renderer.postfx.setGrade(def.grade || 'noon', def.gradeFade ?? 0.8);
  if (def.fog) renderer.setFog(def.fog[0], def.fog[1], def.fog[2]);
  renderer.postfx.setTiltShift(def.tilt ?? 0.38, def.tiltCenter ?? 0.60, def.tiltWidth ?? 0.26);
  renderer.postfx.setOutline(def.outline ?? 0.9);
}
