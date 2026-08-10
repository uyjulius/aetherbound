/**
 * The Pilgrims' Rest — a road across open water, and five places to stand on it.
 *
 * The moor drowned and the road did not. What is left is a causeway two paces
 * wide folding back and forth across a flooded plain in eight straight legs,
 * with a walled shrine at every turn. There is nothing else. No branches, no
 * choices, no second route: the road goes where it goes and the only decision
 * this dungeon offers is whether to keep walking.
 *
 * The shrines are the whole point, and the map is built so that they cannot be
 * mistaken for scenery. They are the only walled ground on the map, the only
 * lit ground on the map, and the only ground on the map where nothing comes for
 * you — the road rolls its own table every few paces and a shrine rolls almost
 * nothing at all. Two paces inside a shrine door the world goes quiet, and two
 * paces back out it does not. That is a mechanical fact the player will learn
 * within one leg and will then plan every leg around.
 *
 * The folding is deliberate. Because the legs run back and forth, each shrine is
 * in plain sight from the one before it long before it can be reached: Shrine V
 * sits nine paces across the water from Shrine IV and sixty paces along the road
 * from it, and you look at it for the whole of leg seven. The water between the
 * legs is the distance the map keeps showing you and refusing to let you take.
 *
 * Three of the shrines failed. They are drawn as what is left — the same marble
 * platform, off the same road, with the wall gone and the lamp gone — and they
 * are worth stopping at, and stopping at them is not safe. A player who does not
 * look at the walls will find that out.
 *
 * Rows use the same run-length notation as the other dungeons; a miscounted row
 * on a causeway is a shortcut across water that was never built.
 */

const W = 44;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[pilgrimsrest] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Glyphs, and what they are:
//   =  the causeway — two paces wide, and never more
//   M  shrine marble, walled or not
//   #  shrine wall, cut through at exactly one place each
//   ~  the moor, which is nine feet of standing water everywhere

const TERRAIN = [
  // SHRINE V, THE REST, and SHRINE IV, THE TURNING — the last two, side by
  /*  0 */ row(R('~', 12), R('#', 11), R('~', 11), R('#', 10)),
  // side across nine paces of water, and sixty paces of road apart.
  /*  1 */ row(R('~', 12), '#', R('M', 9), '#', R('~', 11), '#', R('M', 8), '#'),
  // Leg 8, west. The only leg with a shrine at both ends.
  /*  2 */ row(R('~', 12), '#', R('M', 9), R('=', 13), R('M', 8), '#'),
  /*  3 */ row(R('~', 12), '#', R('M', 9), R('=', 13), R('M', 8), '#'),
  /*  4 */ row(R('~', 12), '#', R('M', 9), '#', R('~', 11), '#', R('M', 8), '#'),
  /*  5 */ row(R('~', 12), '#', R('M', 9), '#', R('~', 11), '#', R('M', 8), '#'),
  // Leg 7, north.
  /*  6 */ row(R('~', 12), '#', R('M', 9), '#', R('~', 11), R('#', 5), R('=', 2), R('#', 3)),
  /*  7 */ row(R('~', 12), '#', R('M', 9), '#', R('~', 16), R('=', 2), R('~', 3)),
  /*  8 */ row(R('~', 12), R('#', 11), R('~', 16), R('=', 2), R('~', 3)),
  /*  9 */ row(R('~', 39), R('=', 2), R('~', 3)),
  /* 10 */ row(R('~', 39), R('=', 2), R('~', 3)),
  /* 11 */ row(R('~', 39), R('=', 2), R('~', 3)),
  // SHRINE III, THE WAITING.
  /* 12 */ row(R('~', 21), R('#', 10), R('~', 8), R('=', 2), R('~', 3)),
  /* 13 */ row(R('~', 21), '#', R('M', 8), '#', R('~', 8), R('=', 2), R('~', 3)),
  // Leg 6, east.
  /* 14 */ row(R('~', 21), '#', R('M', 8), R('=', 11), R('~', 3)),
  /* 15 */ row(R('~', 21), '#', R('M', 8), R('=', 11), R('~', 3)),
  // A shrine that is no longer one. No wall, no lamp, and the road goes past.
  /* 16 */ row(R('~', 21), '#', R('M', 8), '#', R('~', 2), R('M', 4), R('~', 7)),
  /* 17 */ row(R('~', 21), '#', R('M', 8), '#', R('~', 2), R('M', 4), R('~', 7)),
  // Leg 5, north.
  /* 18 */ row(R('~', 21), R('#', 4), R('=', 2), R('#', 4), R('~', 2), R('M', 4), R('~', 7)),
  /* 19 */ row(R('~', 25), R('=', 2), R('~', 17)),
  /* 20 */ row(R('~', 25), R('=', 2), R('~', 17)),
  /* 21 */ row(R('~', 25), R('=', 2), R('~', 17)),
  /* 22 */ row(R('~', 25), R('=', 2), R('~', 17)),
  /* 23 */ row(R('~', 25), R('=', 2), R('~', 17)),
  // SHRINE II, THE KNEELING.
  /* 24 */ row('~', R('#', 10), R('~', 4), R('M', 4), R('~', 6), R('=', 2), R('~', 17)),
  /* 25 */ row('~', '#', R('M', 8), '#', R('~', 4), R('M', 4), R('~', 6), R('=', 2), R('~', 17)),
  // Leg 4, east.
  /* 26 */ row('~', '#', R('M', 8), R('=', 17), R('~', 17)),
  /* 27 */ row('~', '#', R('M', 8), R('=', 17), R('~', 17)),
  /* 28 */ row('~', '#', R('M', 8), '#', R('~', 33)),
  /* 29 */ row('~', '#', R('M', 8), '#', R('~', 33)),
  // Leg 3, north.
  /* 30 */ row('~', R('#', 4), R('=', 2), R('#', 4), R('~', 33)),
  /* 31 */ row(R('~', 5), R('=', 2), R('~', 37)),
  /* 32 */ row(R('~', 5), R('=', 2), R('~', 37)),
  /* 33 */ row(R('~', 5), R('=', 2), R('~', 37)),
  // The second of the three that failed.
  /* 34 */ row(R('~', 5), R('=', 2), R('M', 4), R('~', 33)),
  /* 35 */ row(R('~', 5), R('=', 2), R('M', 4), R('~', 33)),
  // SHRINE I, THE HEARING — the first walled ground on the road.
  /* 36 */ row(R('~', 5), R('=', 2), R('M', 4), R('~', 5), R('#', 10), R('~', 18)),
  /* 37 */ row(R('~', 5), R('=', 2), R('~', 9), '#', R('M', 8), '#', R('~', 18)),
  // Leg 2, west.
  /* 38 */ row(R('~', 5), R('=', 12), R('M', 8), '#', R('~', 18)),
  /* 39 */ row(R('~', 5), R('=', 12), R('M', 8), '#', R('~', 18)),
  /* 40 */ row(R('~', 16), '#', R('M', 8), '#', R('~', 18)),
  /* 41 */ row(R('~', 16), '#', R('M', 8), '#', R('~', 18)),
  // Leg 1, north, out of the gate.
  /* 42 */ row(R('~', 16), R('#', 4), R('=', 2), R('#', 4), R('~', 18)),
  /* 43 */ row(R('~', 20), R('=', 2), R('~', 22)),
  /* 44 */ row(R('~', 20), R('=', 2), R('~', 22)),
  /* 45 */ row(R('~', 20), R('=', 2), R('~', 22)),
  /* 46 */ row(R('~', 20), R('=', 2), R('~', 22)),
  /* 47 */ row(R('~', 20), R('=', 2), R('~', 22)),
  // The apron inside the gate. The road starts here and nowhere is safe yet.
  /* 48 */ row(R('~', 18), R('=', 6), R('~', 20)),
  /* 49 */ row(R('~', 18), R('=', 6), R('~', 20)),
  /* 50 */ row(R('~', 18), R('=', 6), R('~', 20)),
  /* 51 */ row(R('~', 18), R('=', 6), R('~', 20)),
];

export const PILGRIMS_REST = {
  id: 'pilgrimsrest',
  name: "The Pilgrims' Rest",
  subtitle: 'Five Walls on Eighty Paces of Road',
  kind: 'dungeon',
  light: 'night',
  grade: 'night',
  fog: ['#1c2632', 18, 96],
  tilt: 0.34,
  cameraDistance: 17,
  cameraPitch: 0.70,
  music: 'ruins',
  base: 'cobble',
  groundRamp: 'terrain',
  wallHeight: 7,
  wallMaterial: 'stone',
  // There is no lamp anywhere on the road, by design. Every light on this map is
  // inside a wall, and the walk between two of them is done by what is left of
  // the moon on the water.
  lampIntensity: 12,
  lampRange: 17,
  waterLevel: -0.10,
  water: { shallow: '#2c4048', deep: '#080e16', foam: '#7d94a0', waveHeight: 0.02, waveScale: 0.5 },

  sky: {
    zenith: '#101828', horizon: '#3c4a62', ground: '#182028',
    sunColor: '#9fb6e8', sunDir: [-0.3, 0.28, -0.5], cloud: 0.48,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [21, 50], face: 'north' },
    world: { at: [21, 50], face: 'north' },
  },

  exits: [
    { at: [19, 51], size: [4, 1], to: 'overworld', spawn: 'pilgrimsrest_gate',
      prompt: 'Leave by the gate' },
  ],

  triggers: [],

  /**
   * One rectangle per leg of road, and not one over a shrine. Everything the
   * road is standing in gets a table and the difficulty climbs leg by leg as the
   * causeway gets further from the gate; everything inside a wall falls through
   * to the map's own table below, which is set at a rate no walk the length of a
   * shrine will ever reach.
   *
   * The three failed shrines are covered like road, because that is what they
   * are now.
   */
  encounterZones: [
    { rect: [18, 48, 6, 4], table: 'quench_flats' },        // the apron
    { rect: [20, 42, 2, 6], table: 'quench_flats' },        // leg 1
    { rect: [5, 38, 12, 2], table: 'quench_flats' },        // leg 2
    { rect: [5, 30, 2, 10], table: 'long_silence' },        // leg 3
    { rect: [10, 26, 17, 2], table: 'long_silence' },       // leg 4
    { rect: [7, 34, 4, 3], table: 'long_silence' },         // the first failed shrine
    { rect: [25, 18, 2, 10], table: 'quench_pits' },        // leg 5
    { rect: [30, 14, 11, 2], table: 'quench_pits' },        // leg 6
    { rect: [15, 24, 4, 3], table: 'quench_pits' },         // the second failed shrine
    { rect: [33, 16, 4, 3], table: 'quench_pits' },         // the third failed shrine
    { rect: [39, 6, 2, 10], table: 'long_silence_edge' },   // leg 7
    { rect: [22, 2, 13, 2], table: 'long_silence_edge' },   // leg 8
  ],

  /**
   * The inside of a shrine. The rate is set so high that no walk the size of a
   * shrine floor will ever trip it, which is the mechanical form of the promise
   * the walls make. The one group in it is what still gets over a wall now and
   * then, so that the safety is a very good bet rather than a law.
   */
  encounters: {
    rate: 900, terrain: 'marble', scenery: 'none',
    groups: [
      { weight: 1, enemies: ['mendicant', 'blankface'] },
    ],
  },

  props: [
    // --- the gate apron: outside every wall on the map -----------------------
    { kit: 'savepoint', at: [21, 49], id: 'pr-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [19.5, 48.5], id: 'pr-gatepost',
      interact: { name: 'The Gate Post', text: [
        'FIVE RESTS TO THE FAR END. THE ROAD BETWEEN THEM IS NOT A REST.',
        'Below that, in a hand that pressed much harder:',
        'DO NOT SIT DOWN ANYWHERE THERE IS NOT A WALL.',
      ] } },
    { kit: 'signpost', at: [22.5, 50.5], id: 'pr-milepost',
      interact: { name: 'The Milepost', text: [
        'A milepost with five notches on it and four of them scratched over.',
        'Whoever kept this count was counting down, and stopped at one.',
      ] } },

    // --- Shrine I, the Hearing -----------------------------------------------
    { kit: 'savepoint', at: [21, 39], id: 'pr-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [18.5, 38.5] },
    { kit: 'lamppost', at: [23.5, 40.5] },
    { kit: 'bench', at: [20.5, 37.6] },
    { kit: 'chest', at: [18.5, 40.5], id: 'pr-chest-1',
      contains: { kind: 'item', id: 'vigilbalm', count: 5, label: '5 Vigil Balms' } },
    { kit: 'signpost', at: [22.5, 37.5], id: 'pr-shrine-1',
      interact: { name: 'The Hearing', text: [
        'The first wall on the road, and the first quiet. Step back through the',
        'door and listen to what the difference sounds like.',
        'Everything that follows on this road is built out of that difference.',
      ] } },

    // --- the first failed shrine ----------------------------------------------
    { kit: 'chest', at: [8.5, 35.5], id: 'pr-chest-2',
      contains: { kind: 'item', id: 'pilgrimsknot', count: 1, label: "a Pilgrim's Knot" } },
    { kit: 'signpost', at: [9.5, 34.5], id: 'pr-ruin-1',
      interact: { name: 'A Rest, Formerly', text: [
        'The same marble, the same size, the same distance off the road.',
        'The wall was taken away stone by stone and used for something else.',
        'You can tell the difference standing on it. You can hear the difference.',
      ] } },

    // --- Shrine II, the Kneeling ----------------------------------------------
    { kit: 'savepoint', at: [6, 27], id: 'pr-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [3.5, 26.5] },
    { kit: 'lamppost', at: [8.5, 28.5] },
    { kit: 'chest', at: [3.5, 28.5], id: 'pr-chest-3',
      contains: { kind: 'item', id: 'kindlybalm', count: 4, label: '4 Kindly Balms' } },
    { kit: 'signpost', at: [7.5, 25.5], id: 'pr-shrine-2',
      interact: { name: 'The Kneeling', text: [
        'Nine paces by five, and the floor is worn through in one place only,',
        'a foot inside the door, where everybody stopped to make sure.',
      ] } },

    // --- the second failed shrine ---------------------------------------------
    { kit: 'chest', at: [16.5, 24.5], id: 'pr-chest-4',
      contains: { kind: 'item', id: 'oathstone', count: 1, label: 'an Oathstone' } },
    { kit: 'signpost', at: [17.5, 25.5], id: 'pr-ruin-2',
      interact: { name: 'A Rest, Formerly', text: [
        'The second of them. This one still has its lamp bracket and no lamp.',
        'The road does not care either way. The road is the same all the way.',
      ] } },

    // --- Shrine III, the Waiting -----------------------------------------------
    { kit: 'savepoint', at: [26, 15], id: 'pr-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [23.5, 14.5] },
    { kit: 'lamppost', at: [28.5, 16.5] },
    { kit: 'bench', at: [25.6, 13.6] },
    { kit: 'chest', at: [23.5, 16.5], id: 'pr-chest-5',
      contains: { kind: 'item', id: 'wayfarerrobe', count: 1, label: "a Wayfarer's Robe" } },
    { kit: 'signpost', at: [28.5, 13.5], id: 'pr-shrine-3',
      interact: { name: 'The Waiting', text: [
        'From the door of this one you can see the Turning, four legs ahead and',
        'thirty paces away across the water, with its lamps lit.',
        'It is going to take you the better part of an hour to get there.',
      ] } },

    // --- the third failed shrine ------------------------------------------------
    { kit: 'chest', at: [34.5, 17.5], id: 'pr-chest-6',
      contains: { kind: 'item', id: 'wanderersbell', count: 1, label: "a Wanderer's Bell" } },
    { kit: 'signpost', at: [35.5, 16.5], id: 'pr-ruin-3',
      interact: { name: 'A Rest, Formerly', text: [
        'The last of the three, and the largest, and the one closest to the end.',
        'Whatever took the walls off these three took them in order, working back',
        'from the far end of the road, and stopped when it had three.',
      ] } },

    // --- Shrine IV, the Turning --------------------------------------------------
    { kit: 'savepoint', at: [39, 3], id: 'pr-save-5', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [36.5, 2.5] },
    { kit: 'lamppost', at: [41.5, 4.5] },
    { kit: 'chest', at: [36.5, 4.5], id: 'pr-chest-7',
      contains: { kind: 'item', id: 'unbrokenoath', count: 1, label: 'an Unbroken Oath' } },
    { kit: 'signpost', at: [40.5, 1.5], id: 'pr-shrine-4',
      interact: { name: 'The Turning', text: [
        'The road turns here for the last time and goes west, and the Rest is at',
        'the end of it, nine paces off this doorstep across open water.',
        'You have been looking at it since the Waiting.',
      ] } },

    // --- Shrine V, the Rest --------------------------------------------------------
    { kit: 'savepoint', at: [17, 4], id: 'pr-save-6', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [14.5, 2.5] },
    { kit: 'lamppost', at: [20.5, 6.5] },
    { kit: 'bench', at: [17.5, 5.6] },
    { kit: 'chest', at: [14.5, 6.5], id: 'pr-chest-8',
      contains: { kind: 'item', id: 'kindlystaff', count: 1, label: 'The Kindly Staff' } },
    { kit: 'chest', at: [19.5, 2.5], id: 'pr-chest-9',
      contains: { kind: 'item', id: 'ninthward', count: 1, label: 'The Ninth Ward' } },
    { kit: 'chest', at: [17.5, 7.5], id: 'pr-chest-10',
      contains: { kind: 'item', id: 'harrowfold', count: 1, label: 'The Harrow Fold' } },
    { kit: 'signpost', at: [17.5, 1.5], id: 'pr-shrine-5',
      interact: { name: 'The Rest', text: [
        'The far end, and the biggest walls on the road, and no door out of it',
        'but the one you came in by. This is not a waypoint. This is the place',
        'the road was built to get to, and everything before it was the road.',
      ] } },
  ],

  npcs: [],
};
