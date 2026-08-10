/**
 * Ashfall — a town you arrive at from above, and enter by falling into.
 *
 * The ash came down on Ashfall in one night and stopped four feet below the
 * eaves, so the town is still there and the streets are still where they were;
 * it is only that the ground is now the roofline. What you walk on is a ridge
 * of slates. What you walk over is somebody's upper landing.
 *
 * The whole map is one roof spine running north up the middle with ribs off it,
 * and the spine is broken in two places. Those two breaks are the entire
 * design. You cannot step over a break — fifteen feet of ridge is simply gone —
 * so at each one the only way on is to find the rib that ends at a hole, drop
 * through it into the buried street underneath, walk the street in the dark
 * past the break, and come up through a second hole onto the next stretch of
 * roof. Twice. The player who never goes down never gets past row thirty-two.
 *
 * The holes are drawn as ash: a pale tongue of drift spilling from the roof
 * into the room below, which is exactly what a hole in a roof under six feet of
 * ash looks like from above. Where a rib ends in slate it ends; where it ends
 * in ash there is a way down. That is the only rule this dungeon has and it is
 * legible from the first rib.
 *
 * Four of the ribs end at holes that lead nowhere but a room — the cooperage,
 * the tanner's court, the weigh house, the guildhall — and those rooms are
 * where the town's belongings are, because everything anybody owned is still
 * indoors. The market square at the top is reached the same way as everything
 * else here: by falling into it.
 *
 * Rows use the same run-length notation as the other dungeons; a miscounted row
 * in a roof is a hole nobody drew.
 */

const W = 48;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[ashfall] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Glyphs, and what they are:
//   o  slate — the roofline, the ground you arrive on
//   %  ash   — a hole in a roof, and the drift pouring through it
//   =  cobble — a buried street or room, under the roof
//   #  the town itself: walls, gables and packed ash, none of it passable

const TERRAIN = [
  // The rim of the drift. Nothing above this line was ever a town.
  /*  0 */ row(R('#', 48)),
  /*  1 */ row(R('#', 48)),
  /*  2 */ row(R('#', 3), R('=', 11), R('#', 34)),
  // The landing, and the hole down into the market square. This is the end
  /*  3 */ row(R('#', 3), R('=', 9), R('%', 2), R('o', 19), R('#', 2), R('=', 10), R('#', 3)),
  /*  4 */ row(R('#', 3), R('=', 9), R('%', 2), R('o', 19), R('#', 2), R('=', 10), R('#', 3)),
  /*  5 */ row(R('#', 3), R('=', 11), R('#', 8), R('o', 4), R('#', 9), R('=', 10), R('#', 3)),
  // of the walk, and it is the only part of the roofline that is flat.
  /*  6 */ row(R('#', 3), R('=', 11), R('#', 8), R('o', 12), R('%', 2), R('=', 9), R('#', 3)),
  /*  7 */ row(R('#', 3), R('=', 11), R('#', 8), R('o', 12), R('%', 2), R('=', 9), R('#', 3)),
  /*  8 */ row(R('#', 3), R('=', 11), R('#', 8), R('o', 4), R('#', 9), R('=', 10), R('#', 3)),
  /*  9 */ row(R('#', 22), R('o', 4), R('#', 9), R('=', 10), R('#', 3)),
  // Out of Well Street onto the north ridge — the far side of the first break.
  /* 10 */ row(R('#', 2), R('=', 6), R('%', 2), R('o', 16), R('#', 9), R('=', 10), R('#', 3)),
  /* 11 */ row(R('#', 2), R('=', 6), R('%', 2), R('o', 16), R('#', 9), R('=', 10), R('#', 3)),
  /* 12 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 9), R('=', 10), R('#', 3)),
  /* 13 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 22)),
  /* 14 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 9), R('=', 8), R('#', 5)),
  // The rib to the weigh house.
  /* 15 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 12), R('%', 2), R('=', 7), R('#', 5)),
  /* 16 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 12), R('%', 2), R('=', 7), R('#', 5)),
  /* 17 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 9), R('=', 8), R('#', 5)),
  // The first break. The ridge stops. Fifteen feet of it is simply not there.
  /* 18 */ row(R('#', 2), R('=', 6), R('#', 27), R('=', 8), R('#', 5)),
  /* 19 */ row(R('#', 2), R('=', 6), R('#', 27), R('=', 8), R('#', 5)),
  /* 20 */ row(R('#', 2), R('=', 6), R('#', 27), R('=', 8), R('#', 5)),
  // The middle ridge. It reaches nothing at either end but the two ribs below.
  /* 21 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 9), R('=', 8), R('#', 5)),
  /* 22 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 22)),
  /* 23 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 22)),
  // Down into Well Street, which is the only way past the first break.
  /* 24 */ row(R('#', 2), R('=', 4), R('%', 2), R('o', 18), R('#', 22)),
  /* 25 */ row(R('#', 2), R('=', 4), R('%', 2), R('o', 18), R('#', 22)),
  // Out of Fish Street — the far side of the second break.
  /* 26 */ row(R('#', 22), R('o', 16), R('%', 2), R('=', 6), R('#', 2)),
  /* 27 */ row(R('#', 22), R('o', 16), R('%', 2), R('=', 6), R('#', 2)),
  /* 28 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 14), R('=', 6), R('#', 2)),
  // The rib to the tanner's court, which goes nowhere at all.
  /* 29 */ row(R('#', 2), R('=', 4), R('%', 2), R('o', 18), R('#', 14), R('=', 6), R('#', 2)),
  /* 30 */ row(R('#', 2), R('=', 4), R('%', 2), R('o', 18), R('#', 14), R('=', 6), R('#', 2)),
  /* 31 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 14), R('=', 6), R('#', 2)),
  // The second break, and the reason nobody walks in from the south gate.
  /* 32 */ row(R('#', 2), R('=', 6), R('#', 32), R('=', 6), R('#', 2)),
  /* 33 */ row(R('#', 2), R('=', 6), R('#', 32), R('=', 6), R('#', 2)),
  /* 34 */ row(R('#', 2), R('=', 6), R('#', 32), R('=', 6), R('#', 2)),
  // The south ridge, and the roof you come in over.
  /* 35 */ row(R('#', 22), R('o', 4), R('#', 14), R('=', 6), R('#', 2)),
  /* 36 */ row(R('#', 22), R('o', 4), R('#', 14), R('=', 6), R('#', 2)),
  /* 37 */ row(R('#', 22), R('o', 4), R('#', 14), R('=', 6), R('#', 2)),
  // Down into Fish Street, which is the only way past the second break.
  /* 38 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 18), R('%', 2), R('=', 4), R('#', 2)),
  /* 39 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 18), R('%', 2), R('=', 4), R('#', 2)),
  /* 40 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 14), R('=', 6), R('#', 2)),
  /* 41 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 22)),
  /* 42 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 22)),
  // The rib to the cooperage yard.
  /* 43 */ row(R('#', 2), R('=', 4), R('%', 2), R('o', 18), R('#', 22)),
  /* 44 */ row(R('#', 2), R('=', 4), R('%', 2), R('o', 18), R('#', 22)),
  /* 45 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 22)),
  /* 46 */ row(R('#', 2), R('=', 6), R('#', 14), R('o', 4), R('#', 22)),
  // The eaves at the south gate, three feet under the ash.
  /* 47 */ row(R('#', 22), R('o', 4), R('#', 22)),
];

export const ASHFALL = {
  id: 'ashfall',
  name: 'Ashfall',
  subtitle: 'The Roofs Are the Ground Now',
  kind: 'dungeon',
  light: 'dusk',
  grade: 'ruin',
  fog: ['#6b6055', 20, 88],
  tilt: 0.36,
  cameraDistance: 16,
  cameraPitch: 0.70,
  music: 'desert',
  base: 'sand',
  groundRamp: 'terrain',
  // Tall enough that a gable reads as a gable and the street below reads as a
  // street, rather than as a trench.
  wallHeight: 9,
  wallMaterial: 'plaster',
  // Half this map is indoors under six feet of ash. Without the street lamps
  // still burning the buried half is unplayable.
  lampIntensity: 9,
  lampRange: 14,

  sky: {
    zenith: '#4a3f4e', horizon: '#d0996a', ground: '#6a5c4c',
    sunColor: '#ffc088', sunDir: [-0.42, 0.12, 0.5], cloud: 0.72,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [24, 46], face: 'north' },
    world: { at: [24, 46], face: 'north' },
  },

  exits: [
    { at: [22, 47], size: [4, 1], to: 'overworld', spawn: 'ashfall_eaves',
      prompt: 'Climb down off the roofs' },
  ],

  triggers: [],

  /**
   * Above and below are two different places and they are priced differently.
   * The roofline is open, windy and half-lit and the things on it are the
   * things that came in over the drift; the buried streets are a barrow with
   * furniture in it, and everything down there was already here.
   */
  encounterZones: [
    { rect: [3, 2, 11, 7], table: 'kindly_ground_barrows' },     // the market square
    { rect: [35, 3, 10, 10], table: 'kindly_ground_barrows' },   // the guildhall
    { rect: [35, 14, 8, 8], table: 'kindly_ground_barrows' },    // the weigh house
    { rect: [2, 10, 6, 16], table: 'kindly_ground_barrows' },    // Well Street
    { rect: [2, 28, 6, 7], table: 'kindly_ground_barrows' },     // the tanner's court
    { rect: [40, 26, 6, 15], table: 'kindly_ground_barrows' },   // Fish Street
    { rect: [2, 38, 6, 9], table: 'kindly_ground_barrows' },     // the cooperage yard
  ],

  // The roofline's own table. Thinner than the barrows below it, because up
  // here there is nowhere for anything to be standing.
  encounters: {
    rate: 30, terrain: 'sand', scenery: 'none',
    groups: [
      { weight: 28, enemies: ['pallmoth', 'pallmoth', 'hushhound'] },
      { weight: 24, enemies: ['quarterhusk', 'sextonhusk'] },
      { weight: 20, enemies: ['tallowmass', 'shamblehound'] },
      { weight: 16, enemies: ['noonwidow', 'pallmoth'] },
      { weight: 12, enemies: ['stonelayer', 'lastbell'] },
    ],
  },

  props: [
    // --- the south ridge, where you come in over the eaves -------------------
    { kit: 'savepoint', at: [23.5, 45.5], id: 'af-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [22.6, 44.4], id: 'af-gatepost',
      interact: { name: 'The Gable Post', text: [
        'A street name-plate, bolted to a gable end at the height of your knee.',
        'WELL STREET. It is pointing down.',
      ] } },
    { kit: 'lamppost', at: [24.5, 42.5] },
    { kit: 'lamppost', at: [23.5, 37.5] },

    // --- the cooperage yard, down the west rib -------------------------------
    { kit: 'lamppost', at: [3.5, 44.5] },
    { kit: 'chest', at: [4.5, 42.5], id: 'af-chest-1',
      contains: { kind: 'item', id: 'gravesalt', count: 4, label: '4 measures of Grave Salt' } },
    { kit: 'barrel', at: [5.6, 41.4] },
    { kit: 'barrel', at: [3.4, 40.6] },
    { kit: 'signpost', at: [6.4, 39.5], id: 'af-cooper',
      interact: { name: "The Cooper's Yard", text: [
        'Forty barrels, stacked and hooped and never collected, and above them a',
        'hole in the roof with the evening coming through it.',
        'Everything in this town is exactly where it was put down.',
      ] } },

    // --- Fish Street: the way past the second break --------------------------
    { kit: 'lamppost', at: [43.5, 38.5] },
    { kit: 'crate', at: [44.4, 36.6], rot: 0.4 },
    { kit: 'chest', at: [43.5, 33.5], id: 'af-chest-2',
      contains: { kind: 'item', id: 'broodleathers', count: 1, label: 'a set of Brood Leathers' } },
    { kit: 'savepoint', at: [42.5, 30.5], id: 'af-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [41.5, 28.4], id: 'af-fishstreet',
      interact: { name: 'Fish Street', text: [
        'A street with a roof of ash over it and two holes in that roof, one at',
        'each end. Between them it is fifteen paces of a dark that is not yours.',
        'The lamps are still lit. Nobody has been down to light them.',
      ] } },
    { kit: 'lamppost', at: [44.5, 27.5] },

    // --- the middle ridge ----------------------------------------------------
    { kit: 'signpost', at: [22.6, 22.4], id: 'af-break-1',
      interact: { name: 'The First Break', text: [
        'The ridge ends. Fifteen feet on it starts again, at the same height,',
        'pointing the same way. There is nothing in between but ash going down.',
        'Somewhere under your boots there is a street that goes the whole way.',
      ] } },
    { kit: 'lamppost', at: [24.5, 29.5] },

    // --- the tanner's court, off the rib that goes nowhere -------------------
    { kit: 'lamppost', at: [6.5, 33.5] },
    { kit: 'chest', at: [4.5, 32.5], id: 'af-chest-3',
      contains: { kind: 'item', id: 'gravewardknot', count: 1, label: 'a Graveward Knot' } },
    { kit: 'crate', at: [3.4, 30.6], rot: 0.9 },

    // --- Well Street: the way past the first break ---------------------------
    { kit: 'lamppost', at: [3.5, 23.5] },
    { kit: 'barrel', at: [6.6, 21.4] },
    { kit: 'chest', at: [5.5, 19.5], id: 'af-chest-4',
      contains: { kind: 'item', id: 'deepwellrobe', count: 1, label: 'a Deepwell Robe' } },
    { kit: 'savepoint', at: [4.5, 16.5], id: 'af-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [6.4, 13.5], id: 'af-wellstreet',
      interact: { name: 'Well Street', text: [
        'The name-plate on the gable was right, and it was pointing the right way.',
        'This is the street it meant. You have been walking along the top of it',
        'since you came in, and this is the first time you have been in it.',
      ] } },
    { kit: 'lamppost', at: [3.5, 11.5] },

    // --- the weigh house -----------------------------------------------------
    { kit: 'lamppost', at: [37.5, 17.5] },
    { kit: 'crate', at: [39.4, 16.6], rot: 0.2 },
    { kit: 'chest', at: [40.5, 19.5], id: 'af-chest-5',
      contains: { kind: 'item', id: 'ledgerofsmalldebts', count: 1, label: 'the Ledger of Small Debts' } },
    { kit: 'signpost', at: [37.5, 20.4], id: 'af-weighhouse',
      interact: { name: 'The Weigh House', text: [
        'The beam is still true and there is still a load on one pan of it.',
        'Whatever was in the other pan went out through the door at a run.',
      ] } },

    // --- the guildhall -------------------------------------------------------
    { kit: 'savepoint', at: [39.5, 9.5], id: 'af-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [37.5, 5.5] },
    { kit: 'bench', at: [42.0, 9.0] },
    { kit: 'chest', at: [42.5, 6.5], id: 'af-chest-6',
      contains: { kind: 'item', id: 'thelastfold', count: 1, label: 'The Last Fold' } },
    { kit: 'signpost', at: [40.5, 11.4], id: 'af-guildhall',
      interact: { name: 'The Guildhall', text: [
        'A long room with a long table in it and every chair pushed in.',
        'They finished the meeting. That is the part that is hard to hold.',
      ] } },

    // --- the north ridge and the landing over the market ---------------------
    { kit: 'lamppost', at: [23.5, 13.5] },
    { kit: 'signpost', at: [24.4, 8.5], id: 'af-break-2',
      interact: { name: 'The Second Break', text: [
        'The same again, and this time you know what it means and where to go.',
        'The gable post at the gate was not a warning. It was a direction.',
      ] } },
    { kit: 'lamppost', at: [17.5, 3.5] },
    { kit: 'lamppost', at: [29.5, 3.5] },

    // --- the market square, which you enter by falling into it ---------------
    { kit: 'savepoint', at: [9.5, 5.5], id: 'af-save-5', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'well', at: [6.5, 4.5], id: 'af-well', radius: 1.1, interactRadius: 2.4,
      interact: { name: 'The Ash Well', text: [
        'The market well, in a square with a lid of ash over it, and the lid is',
        'six feet thick and holding. The bucket is down. The rope is taut.',
        'Somebody is drawing water in Ashfall and it is not you.',
      ] } },
    { kit: 'cart', at: [10.0, 7.0], rot: 0.6 },
    { kit: 'lamppost', at: [4.5, 7.5] },
    { kit: 'chest', at: [11.5, 6.5], id: 'af-chest-7',
      contains: { kind: 'item', id: 'kindlyvestment', count: 1, label: 'a Kindly Vestment' } },
    { kit: 'chest', at: [4.5, 3.5], id: 'af-chest-8',
      contains: { kind: 'item', id: 'mourningsteel', count: 1, label: 'a Mourning Steel' } },
    { kit: 'signpost', at: [12.5, 7.5], id: 'af-market',
      interact: { name: 'The Market Square', text: [
        'The widest open ground in the town, and the only way into it is a hole.',
        'You came in over the eaves at the south gate and you have been descending',
        'ever since without ever once walking downhill.',
      ] } },
  ],

  npcs: [],
};
