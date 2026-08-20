/**
 * Work out how the downloaded scenery is placed, and write the plan the port reads.
 *
 *   node tools/plan-scenery.mjs
 *
 * A model arrives at whatever size its author made it: the chest is 1.39 units wide, the
 * rock 3.30, the column 4.07 tall. The world it has to stand in has its own opinion —
 * every prop in the reference carries a collider measured from the geometry that actually
 * stood there, and those colliders are already checked placement for placement by
 * `tools/field-parity.mjs`. So the scale each model is placed at is *derived from the
 * collider it has to fill*, not eyeballed: this joins `maps.json` to `footprints.json` to
 * find what each kit's footprint really is, then divides.
 *
 * Two kinds of exception, and they are the reason this is a tool with a table in it rather
 * than one line of arithmetic:
 *
 *   1. Some colliders describe only a prop's *base*. A tree's collider is its trunk, one
 *      unit across; a lamppost's is its post. Scaling a tree to a one-unit bounding box
 *      gives a shrub. Those kits are placed by height instead, and the heights are
 *      authored here with their reasons.
 *   2. A building has no single size. It declares `w`, `d` and `h` per placement and the
 *      reference builds to fit, so the port scales its house asset per placement in all
 *      three axes. What is lost is the variation the reference generates from `storeys`,
 *      `timbered`, `chimney` and `awning` — that is geometry from arithmetic, which is the
 *      one thing this port does not do. Six styles keep a plaster town from looking like a
 *      marble one.
 *
 * Nothing here can break the simulation. Collision comes from the harvested footprints and
 * is unaffected by any of it; the worst a bad number can do is look wrong.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const DATA = path.join(root, 'godot', 'data');
const PROPS = path.join(root, 'godot', 'assets', 'props');
const say = (s = '') => console.log(s);

/**
 * How each kit meets the ground.
 *
 *   width   scale so the model's footprint matches the collider's — the default, and
 *           right for anything whose collider is the whole object
 *   height  scale to an authored height, for the kits whose collider is only their base
 *   box     scale each axis to the placement's own `w`, `d` and `h` — buildings
 *
 * `yaw` turns a model whose author faced it a different way. `sink` pushes a model into
 * the ground by a fraction of its height, for the things that should look bedded in
 * rather than balanced on the surface.
 */
const RULES = {
  // Whole-object colliders: the arithmetic does the work.
  chest: { fit: 'width' },
  barrel: { fit: 'width' },
  crate: { fit: 'width' },
  bench: { fit: 'width' },
  cart: { fit: 'width' },
  stall: { fit: 'width' },
  well: { fit: 'width' },
  fence: { fit: 'width' },
  flowerbox: { fit: 'width' },
  bush: { fit: 'width', sink: 0.08 },
  rock: { fit: 'width', sink: 0.12 },
  bridge: { fit: 'width' },

  // Base-only colliders. A tree's collider is its trunk and a lamppost's is its post, so
  // these are placed by how tall the thing should be in a world where a tile is two units
  // and a person is about 1.8 — a street lamp reads at three, a tree at six, a signpost at
  // eye level, a save crystal a little over head height so it can be seen across a room.
  // A lamppost that is a *lantern*: the model generated for this game is the lamp and its
  // chain, not a post, so fitting it to a post's height would put a two-metre lantern in the
  // street. Sized by the collider it stands in and hung so the top of its chain is where a
  // bracket would be.
  lamppost: { fit: 'width', hang: 3.2 },
  tree: { fit: 'height', height: 6.0 },
  signpost: { fit: 'height', height: 1.9 },
  savepoint: { fit: 'height', height: 2.2 },
  airshipmast: { fit: 'height', height: 12.0 },

  // The airship, scaled by its longest side rather than by width or height: it arrives 195
  // by 352 by 404 units, and which of those is its length depends on how its author stood it
  // up. Eleven units is a ship a party of four could ride and still see past — at sixteen it
  // fills the screen and the world behind it disappears.
  airship: { fit: 'longest', length: 11.0 },

  // Buildings scale to their own declared box, per placement.
  building: { fit: 'box' },
};

/**
 * The eight props the terrain glyphs place, and which asset stands in for each.
 *
 * Three of these are stand-ins and say so: the catalogue's pine, palm and dead-tree models
 * are *groups* of trees in one file, which is wrong for something placed one per tile, so
 * they borrow the oak for now. A snowfield of oaks is a worse map than a snowfield of
 * pines and a better one than a snowfield of nothing.
 */
const GLYPH_PROPS = {
  forest: { kit: 'tree', height: 7.0 },
  tree: { kit: 'tree', height: 6.0 },
  pine: { kit: 'tree', height: 6.5, standin: 'no single pine in the catalogue' },
  deadtree: { kit: 'tree', height: 5.0, standin: 'the dead trees come as a group of five' },
  palm: { kit: 'tree', height: 5.5, standin: 'the palms come as a group of five' },
  bush: { kit: 'bush', fit: 'width' },
  boulder: { kit: 'rock', fit: 'width' },
  reeds: { kit: 'bush', height: 1.4, standin: 'reeds are a bush at knee height' },
};

/**
 * Ground and wall materials: the reference's own texture plates.
 *
 * `GROUND_TEX` in `src/world/map.js` is the source of this mapping and it is copied here
 * rather than imported because that module pulls in Three.js. `tools/scenery-parity.mjs`
 * holds the two against each other so the copy cannot drift.
 */
const GROUND_TEX = {
  grass: 'grass', dirt: 'dirt_path', cobble: 'cobblestone', sand: 'sand',
  snow: 'snow', wood: 'wood_floor', marble: 'marble_floor',
  rock: 'rock_cliff', cave: 'cave_rock', swamp: 'dirt_path',
  aether: 'aether_stone', magitek: 'magitek_panel',
};
/** What a blocked tile is made of, by the ground it belongs to. */
const WALL_TEX = {
  grass: 'stone_wall', dirt: 'stone_wall', cobble: 'brick_wall', sand: 'plaster_wall',
  snow: 'stone_wall', wood: 'wood_planks', marble: 'marble_floor',
  rock: 'rock_cliff', cave: 'cave_rock', swamp: 'stone_wall',
  aether: 'aether_stone', magitek: 'magitek_panel', water: 'rock_cliff',
};

const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const maps = read(DATA, 'maps.json');
const footprints = read(DATA, 'footprints.json');
const legend = read(DATA, 'legend.json');
const manifest = fs.existsSync(path.join(PROPS, 'manifest.json'))
  ? read(PROPS, 'manifest.json') : {};
if (!Object.keys(manifest).length) {
  say('\x1b[31mFAIL\x1b[0m — no godot/assets/props/manifest.json. Run `npm run props -- --get ...`.');
  process.exit(1);
}
const TILE = legend.tile ?? 2;

// --- what each kit's footprint actually is -----------------------------------
//
// From the reference's own colliders, joined through the position each prop stands at.
// The median rather than the mean: a handful of oversized rocks would otherwise drag every
// rock in the world up with them.
const measured = {};
for (const [mapId, def] of Object.entries(maps)) {
  const table = footprints[mapId] ?? {};
  for (const prop of def.props ?? []) {
    const kit = prop.kit ?? '?';
    const [tx, tz] = prop.at ?? [0, 0];
    const shapes = table[`${(tx * TILE).toFixed(2)},${(tz * TILE).toFixed(2)}`];
    if (!shapes) continue;
    for (const shape of shapes) {
      const w = shape.kind === 'circle' ? shape.r * 2 : shape.w;
      const d = shape.kind === 'circle' ? shape.r * 2 : shape.d;
      (measured[kit] ??= []).push([w, d]);
    }
  }
}
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const plan = { tile: TILE, kits: {}, buildings: {}, glyphs: {}, ground: {}, walls: {} };
const notes = [];

for (const [kit, rule] of Object.entries(RULES)) {
  if (kit === 'building') continue;
  const asset = manifest[kit];
  if (!asset) { notes.push(`${kit}: no model downloaded`); continue; }
  const [sx, sy] = asset.size;
  const footprint = measured[kit] ? {
    w: Number(median(measured[kit].map(([w]) => w)).toFixed(3)),
    d: Number(median(measured[kit].map(([, d]) => d)).toFixed(3)),
  } : null;

  let scale;
  if (rule.fit === 'longest') {
    scale = rule.length / Math.max(sx, sy, asset.size[2] ?? 0, 1);
  } else if (rule.fit === 'height') {
    scale = rule.height / (sy || 1);
  } else if (footprint) {
    scale = footprint.w / (sx || 1);
  } else {
    // No collider anywhere for this kit — `savepoint` is walked onto, `fence` is nearly
    // all one placement — so the model keeps its own size and says so.
    scale = 1;
    notes.push(`${kit}: no collider in any map, placed at the model's own size`);
  }
  plan.kits[kit] = {
    file: asset.file,
    scale: Number(scale.toFixed(4)),
    // Lift so the model's own base sits on the floor, then bed it in if asked.
    // Standing on the floor, unless it hangs — in which case the *top* is what is placed, and
    // the model dangles from there.
    y: Number((rule.hang !== undefined
      ? rule.hang - (asset.base + sy) * scale
      : -asset.base * scale - (rule.sink ?? 0) * sy * scale).toFixed(4)),
    yaw: rule.yaw ?? 0,
    fit: rule.fit,
    footprint,
    model: asset.size,
  };
}

for (const style of ['plaster', 'stone', 'wood', 'marble', 'magitek', 'brick']) {
  const asset = manifest[`building_${style}`];
  if (!asset) { notes.push(`building_${style}: no model downloaded`); continue; }
  plan.buildings[style] = {
    file: asset.file,
    // Scaled per placement from the map's own `w`, `d` and `h`, so what is recorded here is
    // the model's size to divide by.
    model: asset.size,
    base: asset.base,
  };
}

for (const [name, spec] of Object.entries(GLYPH_PROPS)) {
  const asset = manifest[spec.kit];
  if (!asset) { notes.push(`glyph ${name}: no model for kit ${spec.kit}`); continue; }
  const [sx, sy] = asset.size;
  const radius = legend.glyph_radii?.[name] ?? null;
  const scale = spec.height ? spec.height / (sy || 1)
    : (radius ? (radius * 2) / (sx || 1) : 1);
  plan.glyphs[name] = {
    kit: spec.kit,
    file: asset.file,
    scale: Number(scale.toFixed(4)),
    y: Number((-asset.base * scale).toFixed(4)),
    radius,
    standin: spec.standin ?? null,
  };
  if (spec.standin) notes.push(`glyph ${name}: ${spec.standin}`);
}

for (const [ground, texture] of Object.entries(GROUND_TEX)) {
  plan.ground[ground] = { texture: `${texture}.png` };
}
for (const [ground, texture] of Object.entries(WALL_TEX)) {
  plan.walls[ground] = { texture: `${texture}.png` };
}
plan.pieces = {
  // The ground and the blocked tiles, from the two pieces every map is paved with.
  floor: manifest.block ? { file: manifest.block.file, model: manifest.block.size } : null,
  wall: manifest.block ? { file: manifest.block.file, model: manifest.block.size } : null,
  paved: manifest.floor ? { file: manifest.floor.file, model: manifest.floor.size } : null,
};

fs.writeFileSync(path.join(PROPS, 'placement.json'), `${JSON.stringify(plan, null, 1)}\n`);

say('\x1b[1mHow the scenery is placed\x1b[0m');
say('─'.repeat(58));
for (const [kit, k] of Object.entries(plan.kits)) {
  const target = k.fit === 'height' ? `${(k.model[1] * k.scale).toFixed(2)} tall`
    : (k.fit === 'longest' ? `${(Math.max(...k.model) * k.scale).toFixed(2)} long`
      : `${(k.model[0] * k.scale).toFixed(2)} wide`);
  say(`  ${kit.padEnd(13)} ×${k.scale.toFixed(3).padStart(7)}  → ${target.padEnd(12)}`
    + `${k.footprint ? `collider ${k.footprint.w}×${k.footprint.d}` : ''}`);
}
say(`  ${'buildings'.padEnd(13)} ${Object.keys(plan.buildings).length} styles, scaled per placement`);
say(`  ${'glyph props'.padEnd(13)} ${Object.keys(plan.glyphs).length} kinds`);
say(`  ${'materials'.padEnd(13)} ${Object.keys(plan.ground).length} grounds, `
  + `${Object.keys(plan.walls).length} wall surfaces`);
say();
for (const line of notes) say(`  \x1b[33mnote\x1b[0m  ${line}`);
say();
say(`\x1b[32mOK\x1b[0m — ${path.relative(root, path.join(PROPS, 'placement.json'))}`);
