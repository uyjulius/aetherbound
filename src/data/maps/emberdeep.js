/**
 * The Emberdeep — drawn in section, and safe at the bottom.
 *
 * This is a cross-section, not a plan: the bottom of the page is the floor of
 * the chamber and the top of the page is its roof, and the whole map should be
 * read the way a mine surveyor reads one, as height. Which matters, because
 * heat rises. The sump along the bottom is cool enough to stand in all day.
 * Ten rows up it is bad. At the top it will kill you, and the map says so in
 * the only language a floor plan has — the shape of the thing you can walk on.
 *
 * The Emberdeep is a comb. There is one continuous space, the sump, running
 * the full width at the bottom; and there are five shelves above it, each one
 * higher, hotter, shorter and richer than the last. Not one of them connects
 * to another. Every shelf is a cul-de-sac served by a single stair that runs
 * all the way back down to the sump, so there is no traverse up there, no
 * route along the top, and no way to chain two shelves together. To reach the
 * second shelf from the first you go down, cross the floor, and climb again.
 *
 * That is the inversion, and it is legible from the first look at the map:
 * every instinct an RPG has ever taught says that up is progress and that the
 * high road is the way on. Here the high roads all end, and the only through
 * route in the building is the floor. The player who wants what is on the
 * fifth shelf has to go up into the worst air in the world, take it, and come
 * straight back down the way they came, and the map has been telling them so
 * since they walked in.
 *
 * The save points bear it out. There are five, and all five stand at the FOOT
 * of a stair, in a row along the sump. There is nowhere to rest above the
 * floor, because nowhere above the floor is restful.
 *
 * The cold pool in the middle of the sump is the coldest thing in the deep and
 * sits at its lowest point, which is not a coincidence and is not decoration.
 *
 * Rows use the same run-length notation as the other dungeons.
 */

const W = 48;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[emberdeep] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// The five teeth, west to east and low to high. Each is a stair band and a
// shelf band, and no stair passes through any other tooth's shelf — which is
// the whole reason the columns are spaced the way they are.
//
//   tooth 1: stair cols 4-6,   rows 29-32 | shelf cols 3-11,  rows 26-28
//   tooth 2: stair cols 13-15, rows 23-32 | shelf cols 12-20, rows 20-22
//   tooth 3: stair cols 22-24, rows 17-32 | shelf cols 21-29, rows 14-16
//   tooth 4: stair cols 31-33, rows 11-32 | shelf cols 30-38, rows 8-10
//   tooth 5: stair cols 40-42, rows 5-32  | shelf cols 34-45, rows 2-4
//
// The sump runs cols 2-45, rows 33-42, and every stair lands on it.

const TERRAIN = [
  /*  0 */ row(R('#', 48)),
  /*  1 */ row(R('#', 48)),
  // --- the fifth shelf: the top of the deep, and the worst of it ----------
  /*  2 */ row(R('#', 34), R('R', 12), R('#', 2)),
  /*  3 */ row(R('#', 34), R('R', 12), R('#', 2)),
  /*  4 */ row(R('#', 34), R('R', 12), R('#', 2)),
  // the fifth stair, running the whole height of the chamber
  /*  5 */ row(R('#', 40), R('R', 3), R('#', 5)),
  /*  6 */ row(R('#', 40), R('R', 3), R('#', 5)),
  /*  7 */ row(R('#', 40), R('R', 3), R('#', 5)),
  // --- the fourth shelf -----------------------------------------------------
  /*  8 */ row(R('#', 30), R('R', 9), R('#', 1), R('R', 3), R('#', 5)),
  /*  9 */ row(R('#', 30), R('R', 9), R('#', 1), R('R', 3), R('#', 5)),
  /* 10 */ row(R('#', 30), R('R', 9), R('#', 1), R('R', 3), R('#', 5)),
  /* 11 */ row(R('#', 31), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 12 */ row(R('#', 31), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 13 */ row(R('#', 31), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  // --- the third shelf ------------------------------------------------------
  /* 14 */ row(R('#', 21), R('R', 9), R('#', 1), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 15 */ row(R('#', 21), R('R', 9), R('#', 1), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 16 */ row(R('#', 21), R('R', 9), R('#', 1), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 17 */ row(R('#', 22), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 18 */ row(R('#', 22), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 19 */ row(R('#', 22), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  // --- the second shelf -----------------------------------------------------
  /* 20 */ row(R('#', 12), R('R', 9), R('#', 1), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 21 */ row(R('#', 12), R('R', 9), R('#', 1), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 22 */ row(R('#', 12), R('R', 9), R('#', 1), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 23 */ row(R('#', 13), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 24 */ row(R('#', 13), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 25 */ row(R('#', 13), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  // --- the first shelf, low enough to breathe on ---------------------------
  /* 26 */ row(R('#', 3), R('R', 9), R('#', 1), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 27 */ row(R('#', 3), R('R', 9), R('#', 1), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 28 */ row(R('#', 3), R('R', 9), R('#', 1), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 29 */ row(R('#', 4), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 30 */ row(R('#', 4), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 31 */ row(R('#', 4), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  /* 32 */ row(R('#', 4), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 6), R('R', 3), R('#', 5)),
  // --- the sump: the whole floor of the Emberdeep, and the cold water in it
  /* 33 */ row(R('#', 2), R('C', 44), R('#', 2)),
  /* 34 */ row(R('#', 2), R('C', 44), R('#', 2)),
  /* 35 */ row(R('#', 2), R('C', 16), R(':', 14), R('C', 14), R('#', 2)),
  /* 36 */ row(R('#', 2), R('C', 16), R(':', 2), R('~', 10), R(':', 2), R('C', 14), R('#', 2)),
  /* 37 */ row(R('#', 2), R('C', 16), R(':', 2), R('~', 10), R(':', 2), R('C', 14), R('#', 2)),
  /* 38 */ row(R('#', 2), R('C', 16), R(':', 2), R('~', 10), R(':', 2), R('C', 14), R('#', 2)),
  /* 39 */ row(R('#', 2), R('C', 16), R(':', 2), R('~', 10), R(':', 2), R('C', 14), R('#', 2)),
  /* 40 */ row(R('#', 2), R('C', 16), R(':', 14), R('C', 14), R('#', 2)),
  /* 41 */ row(R('#', 2), R('C', 44), R('#', 2)),
  /* 42 */ row(R('#', 2), R('C', 44), R('#', 2)),
  // --- the adit ------------------------------------------------------------
  /* 43 */ row(R('#', 22), R('C', 4), R('#', 22)),
  /* 44 */ row(R('#', 22), R('C', 4), R('#', 22)),
];

export const EMBERDEEP = {
  id: 'emberdeep',
  name: 'The Emberdeep',
  subtitle: 'Cool at the Bottom',
  kind: 'dungeon',
  light: 'ruin',
  grade: 'ruin',
  fog: ['#3a1c14', 18, 82],
  tilt: 0.38,
  cameraDistance: 17,
  cameraPitch: 0.72,
  music: 'desert',
  base: 'rock',
  groundRamp: 'terrain',
  wallHeight: 15,
  wallMaterial: 'rock',
  // The shelves are lit from above by the thing that makes them lethal, so the
  // lamps are only really needed down on the floor. They burn low.
  lampIntensity: 6,
  lampRange: 12,
  // Negative, so the cold pool sits down in the rock rather than on it.
  waterLevel: -0.12,
  water: { shallow: '#26505c', deep: '#060e14', foam: '#7ea8b0', waveHeight: 0.015, waveScale: 0.5 },
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [23, 43], face: 'north' },
    world: { at: [23, 43], face: 'north' },
  },

  exits: [
    { at: [22, 44], size: [4, 1], to: 'eastreach', spawn: 'emberdeep_adit',
      prompt: 'Leave the deep' },
  ],

  triggers: [],

  /**
   * One zone per band of height, and they get worse the further up the page
   * they are. The sump and the first stair share the mildest table; the
   * fourth and fifth teeth share the worst named one.
   *
   * The fifth shelf itself is deliberately left out of every zone, so it falls
   * through to the map's own table below. It is the top of the deep, it is the
   * only place in the world where three of these things are found, and it is
   * six paces from a drop back to the floor.
   */
  encounterZones: [
    { rect: [40, 5, 3, 28], table: 'quench_pits' },          // the fifth stair
    { rect: [30, 8, 9, 3], table: 'quench_pits' },           // the fourth shelf
    { rect: [31, 11, 3, 22], table: 'quench_pits' },         // the fourth stair
    { rect: [21, 14, 9, 3], table: 'quench_flats' },         // the third shelf
    { rect: [22, 17, 3, 16], table: 'quench_flats' },        // the third stair
    { rect: [12, 20, 9, 3], table: 'quench_flats' },         // the second shelf
    { rect: [13, 23, 3, 10], table: 'aether_shelf_inner' },  // the second stair
    { rect: [3, 26, 9, 3], table: 'aether_shelf_inner' },    // the first shelf
    { rect: [4, 29, 3, 4], table: 'aether_shelf' },          // the first stair
    { rect: [0, 33, 48, 12], table: 'aether_shelf' },        // the sump, and the adit
  ],

  encounters: {
    rate: 32, terrain: 'sand', scenery: 'cave',
    groups: [
      { weight: 24, enemies: ['thecoldshut', 'springhusk'] },
      { weight: 20, enemies: ['unmadehound', 'unmadehound', 'wasteweevil'] },
      { weight: 18, enemies: ['drawnwire', 'thecollector'] },
      { weight: 16, enemies: ['marrowsaint', 'slackwater'] },
      { weight: 12, enemies: ['quickthorn', 'quickthorn'] },
      { weight: 3, enemies: ['thetemper'] },
      { weight: 2, enemies: ['thecoldforge'] },
    ],
  },

  props: [
    // --- the adit and the sump -----------------------------------------------
    { kit: 'signpost', at: [20.5, 41.5], id: 'ed-adit',
      interact: { name: 'The Adit Board', text: [
        'A board at the mouth of the adit, in a fireman\'s hand, and short.',
        'THE FLOOR IS THE ROAD. EVERYTHING ELSE IS A DEAD END.',
        'GO UP FOR WHAT YOU CAME FOR AND COME STRAIGHT DOWN AGAIN.',
      ] } },
    { kit: 'barrel', at: [26.4, 41.4] },
    { kit: 'crate', at: [27.6, 42.4], rot: 0.9 },
    { kit: 'lamppost', at: [5.5, 41.5] },
    { kit: 'lamppost', at: [14.5, 41.5] },
    { kit: 'lamppost', at: [33.5, 41.5] },
    { kit: 'lamppost', at: [42.5, 41.5] },
    { kit: 'lamppost', at: [4.5, 34.5] },
    { kit: 'lamppost', at: [43.5, 34.5] },
    { kit: 'rock', at: [11.5, 36.5], scale: 1.2, seed: 3, material: 'cave' },
    { kit: 'rock', at: [37.5, 37.5], scale: 1.1, seed: 5, material: 'cave' },
    { kit: 'signpost', at: [16.5, 37.5], id: 'ed-pool',
      interact: { name: 'The Cold Pool', text: [
        'Standing water at the lowest point of the sump, and it is cold — properly',
        'cold, cold enough to ache. Nothing that rises has ever got down this far.',
        'The rim of it is worn into seats.',
      ] } },
    { kit: 'chest', at: [8.5, 38.5], id: 'ed-chest-1',
      contains: { kind: 'item', id: 'quenchcharge', count: 4, label: '4 Quench Charges' } },
    { kit: 'chest', at: [40.5, 38.5], id: 'ed-chest-2',
      contains: { kind: 'item', id: 'rimeflask', count: 3, label: '3 Rime Flasks' } },

    // --- the five save points, one at the foot of each stair -----------------
    { kit: 'savepoint', at: [5.5, 33.5], id: 'ed-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'savepoint', at: [14.5, 33.5], id: 'ed-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'savepoint', at: [23.5, 33.5], id: 'ed-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'savepoint', at: [32.5, 33.5], id: 'ed-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'savepoint', at: [41.5, 33.5], id: 'ed-save-5', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },

    // --- the first shelf: low enough to breathe on ---------------------------
    { kit: 'lamppost', at: [9.5, 27.5] },
    { kit: 'signpost', at: [7.5, 27.5], id: 'ed-plate-1',
      interact: { name: 'Shelf Plate', text: [
        'A plate riveted to the rock at the head of the stair. ONE.',
        'Beneath it a thermometer scale, and a scratch at the height of the mercury.',
      ] } },
    { kit: 'chest', at: [4.5, 27.5], id: 'ed-chest-3',
      contains: { kind: 'item', id: 'attuningring', count: 1, label: 'an Attuning Ring' } },

    // --- the second shelf ----------------------------------------------------
    { kit: 'lamppost', at: [13.5, 21.5] },
    { kit: 'rock', at: [15.5, 21.5], scale: 1.0, seed: 7 },
    { kit: 'chest', at: [18.5, 21.5], id: 'ed-chest-4',
      contains: { kind: 'item', id: 'phoenixember', count: 2, label: '2 Phoenix Embers' } },

    // --- the third shelf -----------------------------------------------------
    { kit: 'signpost', at: [22.5, 15.5], id: 'ed-plate-3',
      interact: { name: 'Shelf Plate', text: [
        'THREE. The scratch on the scale is a hand higher than it was on the first,',
        'and the rivets holding the plate have run and set again.',
      ] } },
    { kit: 'rock', at: [25.5, 15.5], scale: 1.0, seed: 9 },
    { kit: 'chest', at: [27.5, 15.5], id: 'ed-chest-5',
      contains: { kind: 'item', id: 'quenchward', count: 1, label: 'a Quench Ward' } },

    // --- the fourth shelf ----------------------------------------------------
    { kit: 'rock', at: [31.5, 9.5], scale: 1.1, seed: 11 },
    { kit: 'chest', at: [34.5, 9.5], id: 'ed-chest-6',
      contains: { kind: 'item', id: 'quenchmail', count: 1, label: 'a suit of Quench Mail' } },
    { kit: 'chest', at: [37.5, 9.5], id: 'ed-chest-7',
      contains: { kind: 'item', id: 'broodclaws', count: 1, label: 'a set of Brood Claws' } },

    // --- the fifth shelf: the top of the deep, and the end of the map --------
    { kit: 'signpost', at: [35.5, 3.5], id: 'ed-plate-5',
      interact: { name: 'Shelf Plate', text: [
        'FIVE. There is no scratch on this scale. The scale itself has gone soft',
        'and slumped down the rock, and whoever rivetted the plate did not stay',
        'to record anything.',
      ] } },
    // The terminal feature, and the reason for all of it: the deep is not
    // heated from below. It is heated from here.
    { kit: 'well', at: [38.5, 3.5], id: 'ed-flue', radius: 1.1, interactRadius: 2.4,
      interact: { name: 'The Flue', text: [
        'A round mouth in the roof of the chamber, faced in brick that has been',
        'fired so long it has gone to glass. The heat is not coming up out of the',
        'deep. It is coming down out of this, and has been for a very long time.',
      ] } },
    { kit: 'chest', at: [44.5, 3.5], id: 'ed-chest-8',
      contains: { kind: 'item', id: 'engineheart', count: 1, label: 'an Engine Heart' } },
  ],

  npcs: [],
};
