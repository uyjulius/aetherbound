/**
 * The Stormspire — a tower with no inside.
 *
 * The spire is solid. There is no door, no stair-well, no landing out of the
 * weather: the only way up is a ledge cut into the outside of the drum, and
 * the climb is therefore always half exposed to the drop. The map is that
 * helix flattened onto a page — three ledges wrapping the tower, each one a
 * storey higher, a storey tighter, and one face further round.
 *
 * Each ledge covers exactly two faces of the drum and hands you off at a
 * corner to the next one in, so the player is never choosing a route, only
 * following the building round. The legs shorten as you rise — thirty-four
 * paces, then twenty-nine, then nineteen, then six — which makes the last
 * stretch feel like the tower is reeling you in.
 *
 * You approach across the plateau first, in the open, with the whole thing
 * standing over you. That walk is deliberate. It is the only part of the map
 * where the spire can be looked at rather than climbed.
 *
 * Rows use the same run-length notation as the other dungeons.
 */

const W = 40;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[stormspire] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Each ledge is an L, not a square: one vertical face cut into a column band,
// one horizontal face cut across a row band. Everything else is solid drum, so
// the two lists below are the whole plan.
//
// Column bands, west to east — the vertical faces:
//   0-2   crag
//   3-5   ledge one, west face     (rows 8-36)
//   6-12  drum
//   13-15 ledge three, west face   (rows 18-26)
//   16-21 the crown                (rows 18-21)
//   22-28 drum
//   29-31 ledge two, east face     (rows 8-26)
//   32-36 drum, except rows 34-38, where ledge one's south face runs out to
//         the east buttress and drops to the foot of the stair
//   37-39 crag
//
// Row bands, north to south — the horizontal faces:
//   8-10  ledge two, north face    (cols 3-31)
//   24-26 ledge three, south face  (cols 13-31)
//   34-36 ledge one, south face    (cols 3-36)
//
// Each face overshoots into the next ledge's band by three columns; that
// overlap *is* the corner handoff, and shortening any of them seals the climb.

const TERRAIN = [
  /*  0 */ row(R('^', 40)),
  /*  1 */ row(R('^', 40)),
  /*  2 */ row(R('^', 40)),
  // --- solid drum: nothing is cut this high on the north face --------------
  /*  3 */ row(R('^', 3), R('#', 34), R('^', 3)),
  /*  4 */ row(R('^', 3), R('#', 34), R('^', 3)),
  /*  5 */ row(R('^', 3), R('#', 34), R('^', 3)),
  /*  6 */ row(R('^', 3), R('#', 34), R('^', 3)),
  /*  7 */ row(R('^', 3), R('#', 34), R('^', 3)),
  // --- ledge two, north face — ledge one hands over at this corner ---------
  /*  8 */ row(R('^', 3), R('R', 29), R('#', 5), R('^', 3)),
  /*  9 */ row(R('^', 3), R('R', 29), R('#', 5), R('^', 3)),
  /* 10 */ row(R('^', 3), R('R', 29), R('#', 5), R('^', 3)),
  /* 11 */ row(R('^', 3), R('R', 3), R('#', 23), R('R', 3), R('#', 5), R('^', 3)),
  /* 12 */ row(R('^', 3), R('R', 3), R('#', 23), R('R', 3), R('#', 5), R('^', 3)),
  /* 13 */ row(R('^', 3), R('R', 3), R('#', 23), R('R', 3), R('#', 5), R('^', 3)),
  /* 14 */ row(R('^', 3), R('R', 3), R('#', 23), R('R', 3), R('#', 5), R('^', 3)),
  /* 15 */ row(R('^', 3), R('R', 3), R('#', 23), R('R', 3), R('#', 5), R('^', 3)),
  /* 16 */ row(R('^', 3), R('R', 3), R('#', 23), R('R', 3), R('#', 5), R('^', 3)),
  /* 17 */ row(R('^', 3), R('R', 3), R('#', 23), R('R', 3), R('#', 5), R('^', 3)),
  // --- the crown, and the short throat that leads into it ------------------
  /* 18 */ row(R('^', 3), R('R', 3), R('#', 7), R('R', 3), R('M', 6), R('#', 7), R('R', 3), R('#', 5), R('^', 3)),
  /* 19 */ row(R('^', 3), R('R', 3), R('#', 7), R('R', 3), R('M', 6), R('#', 7), R('R', 3), R('#', 5), R('^', 3)),
  /* 20 */ row(R('^', 3), R('R', 3), R('#', 7), R('R', 3), R('M', 6), R('#', 7), R('R', 3), R('#', 5), R('^', 3)),
  /* 21 */ row(R('^', 3), R('R', 3), R('#', 7), R('R', 3), R('M', 6), R('#', 7), R('R', 3), R('#', 5), R('^', 3)),
  /* 22 */ row(R('^', 3), R('R', 3), R('#', 7), R('R', 3), R('#', 13), R('R', 3), R('#', 5), R('^', 3)),
  /* 23 */ row(R('^', 3), R('R', 3), R('#', 7), R('R', 3), R('#', 13), R('R', 3), R('#', 5), R('^', 3)),
  // --- ledge three, south face — ledge two hands over at this corner -------
  /* 24 */ row(R('^', 3), R('R', 3), R('#', 7), R('R', 19), R('#', 5), R('^', 3)),
  /* 25 */ row(R('^', 3), R('R', 3), R('#', 7), R('R', 19), R('#', 5), R('^', 3)),
  /* 26 */ row(R('^', 3), R('R', 3), R('#', 7), R('R', 19), R('#', 5), R('^', 3)),
  // --- solid drum: the south face of the tower carries nothing but ledge one
  /* 27 */ row(R('^', 3), R('R', 3), R('#', 31), R('^', 3)),
  /* 28 */ row(R('^', 3), R('R', 3), R('#', 31), R('^', 3)),
  /* 29 */ row(R('^', 3), R('R', 3), R('#', 31), R('^', 3)),
  /* 30 */ row(R('^', 3), R('R', 3), R('#', 31), R('^', 3)),
  /* 31 */ row(R('^', 3), R('R', 3), R('#', 31), R('^', 3)),
  /* 32 */ row(R('^', 3), R('R', 3), R('#', 31), R('^', 3)),
  /* 33 */ row(R('^', 3), R('R', 3), R('#', 31), R('^', 3)),
  // --- ledge one, south face: the long one ---------------------------------
  /* 34 */ row(R('^', 3), R('R', 34), R('^', 3)),
  /* 35 */ row(R('^', 3), R('R', 34), R('^', 3)),
  /* 36 */ row(R('^', 3), R('R', 34), R('^', 3)),
  // --- the foot of the stair, in the lee of the east buttress --------------
  /* 37 */ row(R('^', 34), R('R', 3), R('^', 3)),
  /* 38 */ row(R('^', 34), R('R', 3), R('^', 3)),
  // --- the plateau -----------------------------------------------------------
  /* 39 */ row(R('^', 3), R('R', 34), R('^', 3)),
  /* 40 */ row(R('^', 3), R('R', 8), R('^', 4), R('R', 22), R('^', 3)),
  /* 41 */ row(R('^', 3), R('R', 8), R('^', 4), R('R', 22), R('^', 3)),
  /* 42 */ row(R('^', 3), R('R', 34), R('^', 3)),
  /* 43 */ row(R('^', 18), R('R', 4), R('^', 18)),
];

export const STORMSPIRE = {
  id: 'stormspire',
  name: 'The Stormspire',
  subtitle: 'Climbed on the Outside',
  kind: 'dungeon',
  light: 'dusk',
  grade: 'dusk',
  fog: ['#4a4358', 34, 150],
  tilt: 0.32,
  cameraDistance: 18,
  cameraPitch: 0.72,
  music: 'mountain',
  base: 'rock',
  groundRamp: 'terrain',
  // The drum has to tower. At this height the ledge is a shelf on a cliff
  // rather than a corridor with a view.
  wallHeight: 16,
  wallMaterial: 'stone',
  // Dusk under storm cloud on a ledge with no roof: the way-lamps bolted to
  // the drum are genuinely what the player climbs by.
  lampIntensity: 7,
  lampRange: 12,

  sky: {
    zenith: '#241f3c', horizon: '#b06a52', ground: '#3c3442',
    sunColor: '#ffa86a', sunDir: [-0.6, 0.12, 0.28], cloud: 0.78,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [20, 42], face: 'north' },
    world: { at: [20, 42], face: 'north' },
  },

  exits: [
    { at: [18, 43], size: [4, 1], to: 'overworld', spawn: 'stormspire',
      prompt: 'Leave the spire' },
  ],

  triggers: [],

  encounters: {
    rate: 24, terrain: 'cobble', scenery: 'none',
    groups: [
      { weight: 28, enemies: ['scarpdrake'] },
      { weight: 24, enemies: ['cairnwight', 'lanternbearer'] },
      { weight: 20, enemies: ['ashknight'] },
      { weight: 16, enemies: ['magitekarmour', 'gearwright'] },
      { weight: 12, enemies: ['frostmaul', 'rimewalker'] },
    ],
  },

  props: [
    // --- the plateau ---------------------------------------------------------
    { kit: 'savepoint', at: [20.5, 41.5], id: 'ss-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [17.4, 41.6], id: 'ss-marker',
      interact: { name: 'Surveyor\'s Peg', text: [
        'A peg driven into the rock with a sighting of the spire scratched beside it.',
        'HEIGHT: NOT ESTABLISHED. ENTRANCE: NONE FOUND AT GRADE.',
        'Underneath, in charcoal: THERE ISN\'T ONE. GO ROUND THE OUTSIDE.',
      ] } },
    { kit: 'rock', at: [7.5, 39.5], scale: 1.7, seed: 3 },
    { kit: 'rock', at: [14.0, 42.4], scale: 1.4, seed: 5 },
    { kit: 'chest', at: [5.5, 40.5], id: 'ss-chest-1',
      contains: { kind: 'item', id: 'stormflask', count: 3, label: '3 Storm Flasks' } },
    { kit: 'crate', at: [30.4, 41.6], rot: 0.4 },
    { kit: 'barrel', at: [31.6, 40.4] },
    { kit: 'lamppost', at: [35.5, 39.5] },

    // --- ledge one: the long south leg, then the whole west face -----------
    { kit: 'lamppost', at: [35.5, 35.5] },
    { kit: 'lamppost', at: [4.5, 35.5] },
    { kit: 'rock', at: [21.0, 35.4], scale: 1.2, seed: 7 },
    { kit: 'chest', at: [12.5, 35.5], id: 'ss-chest-2',
      contains: { kind: 'item', id: 'scholarhood', count: 1, label: 'a Scholar\'s Hood' } },
    { kit: 'savepoint', at: [4.5, 31.5], id: 'ss-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [4.5, 24.5] },
    { kit: 'lamppost', at: [4.5, 15.5] },
    { kit: 'chest', at: [4.5, 19.5], id: 'ss-chest-3',
      contains: { kind: 'item', id: 'sprinter', count: 1, label: 'a pair of Sprinters' } },
    { kit: 'signpost', at: [4.5, 12.5], id: 'ss-bolt',
      interact: { name: 'Bolt Plate', text: [
        'A plate riveted to the drum at head height, worn nearly smooth.',
        'ONE. Above it, faintly, the ghost of a bracket that once held a rail.',
      ] } },

    // --- ledge two: the north face, then down the east face ----------------
    { kit: 'lamppost', at: [9.5, 9.5] },
    { kit: 'lamppost', at: [30.5, 9.5] },
    { kit: 'rock', at: [18.0, 9.4], scale: 1.1, seed: 9 },
    { kit: 'chest', at: [24.5, 9.5], id: 'ss-chest-4',
      contains: { kind: 'item', id: 'ashrod', count: 1, label: 'an Ashwood Rod' } },
    { kit: 'savepoint', at: [30.5, 13.5], id: 'ss-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [30.5, 19.5] },
    { kit: 'signpost', at: [30.5, 22.5], id: 'ss-bolt-2',
      interact: { name: 'Bolt Plate', text: [
        'The same plate, the same rivets, one storey up and a quarter turn round.',
        'TWO.',
      ] } },

    // --- ledge three: the south face, then up the west ----------------------
    { kit: 'lamppost', at: [25.5, 25.5] },
    { kit: 'lamppost', at: [14.5, 25.5] },
    { kit: 'rock', at: [20.0, 25.6], scale: 1.0, seed: 11 },
    { kit: 'chest', at: [18.5, 24.5], id: 'ss-chest-5',
      contains: { kind: 'item', id: 'megalixir', count: 2, label: '2 Megalixirs' } },
    { kit: 'signpost', at: [14.5, 22.5], id: 'ss-bolt-3',
      interact: { name: 'Bolt Plate', text: [
        'THREE. The rivets are bright. Nothing up here has had time to weather.',
      ] } },

    // --- the crown ------------------------------------------------------------
    { kit: 'savepoint', at: [19.5, 20.5], id: 'ss-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The crown is the terminal feature and it carries the Eleventh Hour, which
    // is where the magicite of that name is recorded as being: at the top of
    // the Stormspire, and you have to climb for it. The plate keeps the view.
    { kit: 'well', at: [20.0, 18.6], id: 'ss-crown', radius: 1.1, interactRadius: 2.4,
      interact: { prompt: 'The Head of the Spire', event: 'theeleventhhour' } },
    { kit: 'signpost', at: [17.5, 19.5], id: 'ss-crown-plate',
      interact: { name: 'The Head of the Spire', text: [
        'The ledge stops at a floor of dressed marble the size of a small room.',
        'There is nothing on it. From up here the storm is below you, and the',
        'whole of the waste is laid out flat and lit from underneath.',
      ] } },
    // Nine hundred years of weather come down on this one point, and something
    // has been sitting out every one of them a few paces off the crown.
    { kit: 'signpost', at: [20.5, 21.5], id: 'ss-nest',
      interact: { prompt: 'The nest of lead and glass', event: 'brood_of_glass' } },
    // The climb is the wager. This is what is at the top of it.
    { kit: 'chest', at: [16.5, 21.5], id: 'ss-chest-6',
      contains: { kind: 'item', id: 'thevagrantstar', count: 1, label: 'the Vagrant Star' } },
  ],

  npcs: [],
};
