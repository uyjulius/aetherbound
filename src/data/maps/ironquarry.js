/**
 * The Iron Quarry — six benches, and every one of them is watched.
 *
 * A quarry is cut downwards in steps, and this map is nothing but those steps
 * drawn in order: six long benches stacked down the sheet, each one a storey
 * lower than the last and each one set a little further in, so the pit narrows
 * as it deepens. Between benches there is a face you cannot climb, and the only
 * way down is the haul road, which is cut at the east end, then the west, then
 * the east again — five switchbacks, and the reason the descent takes as long
 * as it does.
 *
 * The thing that makes this a quarry and not a staircase is the lookouts. Each
 * bench pushes a three-pace tongue out over the face of the one below it and
 * stops dead. They go nowhere. What they are for is standing on: from the first
 * lookout you are looking down at the second bench you have not walked yet, and
 * from the fifth you are looking straight down into the sump. Every level of
 * this dungeon is overlooked by the level above it, and the player has been
 * standing on the thing doing the overlooking since the first two minutes.
 *
 * The floor changes as it drops — rock, then the dirt the rock was cut out of,
 * then cave stone that has not seen the sky — so the descent can be felt as
 * well as counted.
 *
 * Rows use the same run-length notation as the other dungeons; one miscounted
 * row in a face is a way down that should not exist.
 */

const W = 44;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[ironquarry] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  // --- the rim gate ---------------------------------------------------------
  /*  0 */ row(R('^', 20), R('R', 4), R('^', 20)),
  /*  1 */ row(R('^', 20), R('R', 4), R('^', 20)),
  /*  2 */ row(R('^', 20), R('R', 4), R('^', 20)),
  // --- the first bench: the rim road, and the only level ground in the pit --
  /*  3 */ row(R('^', 3), R('R', 38), R('^', 3)),
  /*  4 */ row(R('^', 3), R('R', 38), R('^', 3)),
  /*  5 */ row(R('^', 3), R('R', 38), R('^', 3)),
  /*  6 */ row(R('^', 3), R('R', 38), R('^', 3)),
  /*  7 */ row(R('^', 3), R('R', 38), R('^', 3)),
  /*  8 */ row(R('^', 3), R('R', 38), R('^', 3)),
  /*  9 */ row(R('^', 3), R('R', 38), R('^', 3)),
  // the first lookout, and the haul road down at the east end
  /* 10 */ row(R('^', 10), R('R', 3), R('^', 23), R(',', 4), R('^', 4)),
  /* 11 */ row(R('^', 36), R(',', 4), R('^', 4)),
  // --- the second bench -----------------------------------------------------
  /* 12 */ row(R('^', 5), R('R', 36), R('^', 3)),
  /* 13 */ row(R('^', 5), R('R', 36), R('^', 3)),
  /* 14 */ row(R('^', 5), R('R', 36), R('^', 3)),
  /* 15 */ row(R('^', 5), R('R', 36), R('^', 3)),
  /* 16 */ row(R('^', 5), R('R', 36), R('^', 3)),
  /* 17 */ row(R('^', 5), R('R', 36), R('^', 3)),
  /* 18 */ row(R('^', 5), R('R', 36), R('^', 3)),
  // the second lookout, and the haul road back down at the west end
  /* 19 */ row(R('^', 5), R(',', 4), R('^', 19), R('R', 3), R('^', 13)),
  /* 20 */ row(R('^', 5), R(',', 4), R('^', 35)),
  // --- the third bench: below the rock, into the dirt -----------------------
  /* 21 */ row(R('^', 5), R(',', 34), R('^', 5)),
  /* 22 */ row(R('^', 5), R(',', 34), R('^', 5)),
  /* 23 */ row(R('^', 5), R(',', 34), R('^', 5)),
  /* 24 */ row(R('^', 5), R(',', 34), R('^', 5)),
  /* 25 */ row(R('^', 5), R(',', 34), R('^', 5)),
  /* 26 */ row(R('^', 5), R(',', 34), R('^', 5)),
  /* 27 */ row(R('^', 5), R(',', 34), R('^', 5)),
  // the third lookout, and the haul road east
  /* 28 */ row(R('^', 12), R(',', 3), R('^', 19), R(',', 4), R('^', 6)),
  /* 29 */ row(R('^', 34), R(',', 4), R('^', 6)),
  // --- the fourth bench -----------------------------------------------------
  /* 30 */ row(R('^', 7), R(',', 32), R('^', 5)),
  /* 31 */ row(R('^', 7), R(',', 32), R('^', 5)),
  /* 32 */ row(R('^', 7), R(',', 32), R('^', 5)),
  /* 33 */ row(R('^', 7), R(',', 32), R('^', 5)),
  /* 34 */ row(R('^', 7), R(',', 32), R('^', 5)),
  /* 35 */ row(R('^', 7), R(',', 32), R('^', 5)),
  /* 36 */ row(R('^', 7), R(',', 32), R('^', 5)),
  // the fourth lookout, and the haul road west
  /* 37 */ row(R('^', 7), R(',', 4), R('^', 15), R(',', 3), R('^', 15)),
  /* 38 */ row(R('^', 7), R(',', 4), R('^', 33)),
  // --- the fifth bench: out of the light ------------------------------------
  /* 39 */ row(R('^', 7), R('C', 30), R('^', 7)),
  /* 40 */ row(R('^', 7), R('C', 30), R('^', 7)),
  /* 41 */ row(R('^', 7), R('C', 30), R('^', 7)),
  /* 42 */ row(R('^', 7), R('C', 30), R('^', 7)),
  /* 43 */ row(R('^', 7), R('C', 30), R('^', 7)),
  /* 44 */ row(R('^', 7), R('C', 30), R('^', 7)),
  /* 45 */ row(R('^', 7), R('C', 30), R('^', 7)),
  // the fifth lookout, and the last of the haul road
  /* 46 */ row(R('^', 14), R('C', 3), R('^', 15), R(',', 4), R('^', 8)),
  /* 47 */ row(R('^', 32), R(',', 4), R('^', 8)),
  // --- the sump: the floor of the quarry, and the water standing in it ------
  /* 48 */ row(R('^', 9), R('C', 28), R('^', 7)),
  /* 49 */ row(R('^', 9), R('C', 28), R('^', 7)),
  /* 50 */ row(R('^', 9), R('C', 7), R('~', 14), R('C', 7), R('^', 7)),
  /* 51 */ row(R('^', 9), R('C', 7), R('~', 14), R('C', 7), R('^', 7)),
  /* 52 */ row(R('^', 9), R('C', 7), R('~', 14), R('C', 7), R('^', 7)),
  /* 53 */ row(R('^', 44)),
];

export const IRON_QUARRY = {
  id: 'ironquarry',
  name: 'The Iron Quarry',
  subtitle: 'Six Benches to the Sump',
  kind: 'dungeon',
  light: 'dawn',
  grade: 'dawn',
  fog: ['#4e4640', 26, 118],
  tilt: 0.34,
  cameraDistance: 17,
  cameraPitch: 0.72,
  music: 'mountain',
  base: 'rock',
  groundRamp: 'terrain',
  // Tall enough that a face reads as a face. At this height the bench below is
  // visible from the lookout and unreachable from anywhere else.
  wallHeight: 13,
  wallMaterial: 'rock',
  // First light does not reach past the third bench, so the working lamps are
  // doing real work from halfway down.
  lampIntensity: 7,
  lampRange: 13,
  waterLevel: 0.04,
  water: { shallow: '#3d5a52', deep: '#101c1c', foam: '#9ab8a8', waveHeight: 0.02, waveScale: 0.4 },

  sky: {
    zenith: '#2e3450', horizon: '#e0a878', ground: '#4a4238',
    sunColor: '#ffd0a0', sunDir: [0.5, 0.14, 0.3], cloud: 0.30,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [22, 3], face: 'south' },
    world: { at: [22, 3], face: 'south' },
  },

  exits: [
    { at: [20, 0], size: [4, 1], to: 'overworld', spawn: 'ironquarry',
      prompt: 'Leave by the rim' },
  ],

  // Every bench is walked end to end and then walked back to the haul road, so
  // a tripwire on one would fire on the way past. The quarry's two scripted
  // things are examined.
  triggers: [],

  /**
   * Six benches, and the table changes at every face. The workings hold the odd
   * benches and the Gainsay holds the even ones — the pit cuts down through the
   * boundary between two regions rather than sitting inside one — and the last
   * bench is already into the Brood Acre, which is what has been coming up the
   * haul road at night.
   *
   * The sump is deliberately left to the map's own table below: it is the floor
   * of the quarry, it is the one part of the hill that was never cut, and it is
   * where the five hunts are.
   */
  encounterZones: [
    { rect: [0, 0, 44, 12], table: 'undermarch' },          // rim road, first bench
    { rect: [0, 12, 44, 9], table: 'gainsay_downs' },       // second bench
    { rect: [0, 21, 44, 9], table: 'undermarch_deep' },     // third bench
    { rect: [0, 30, 44, 9], table: 'gainsay_deep' },        // fourth bench
    { rect: [0, 39, 44, 5], table: 'brood_acre' },          // fifth bench, upper
    { rect: [0, 44, 44, 4], table: 'brood_acre_hives' },    // fifth bench, lower
  ],

  // The last five groups are hunts rather than wildlife — the things the
  // benches were meant to be counted for, standing in the sump — at weights low
  // enough that meeting one is an event rather than a toll.
  encounters: {
    rate: 26, terrain: 'cave', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['shalestalker', 'deadweight'] },
      { weight: 24, enemies: ['spallmoth', 'spallmoth', 'boringengine'] },
      { weight: 20, enemies: ['chalkwight', 'slipknave'] },
      { weight: 18, enemies: ['crevicehound', 'dampener'] },
      { weight: 12, enemies: ['pitprop', 'nightshift'] },
      { weight: 3, enemies: ['theanswering'] },
      { weight: 3, enemies: ['thegainsayer'] },
      { weight: 2, enemies: ['theacremother'] },
      { weight: 2, enemies: ['thelastlitter'] },
      { weight: 2, enemies: ['thewholeacre'] },
    ],
  },

  props: [
    // --- the first bench: the rim road ---------------------------------------
    { kit: 'savepoint', at: [22, 5], id: 'iq-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [19.4, 5.6], id: 'iq-rimpost',
      interact: { name: 'Rim Notice', text: [
        'SIX BENCHES. HAUL ROAD EAST, WEST, EAST, WEST, EAST.',
        'STAND ON THE LOOKOUTS BEFORE YOU GO DOWN, AND COUNT WHAT IS ON THE',
        'BENCH BELOW. IF THE COUNT CHANGES ON THE WAY DOWN, COME BACK UP.',
      ] } },
    { kit: 'lamppost', at: [9.5, 5.5] },
    { kit: 'lamppost', at: [34.5, 5.5] },
    { kit: 'cart', at: [29.5, 7.5], rot: 0.3 },
    { kit: 'chest', at: [5.5, 7.5], id: 'iq-chest-1',
      contains: { kind: 'item', id: 'deadfallcharge', count: 4, label: '4 Deadfall Charges' } },
    { kit: 'signpost', at: [11.5, 10.5], id: 'iq-look-1',
      interact: { name: 'First Lookout', text: [
        'A tongue of the bench pushed out over the face and railed on three sides.',
        'The second bench is nine feet under your boots and forty paces long, and',
        'you can see every foot of it. Nothing is on it. Not yet.',
      ] } },

    // --- the second bench ------------------------------------------------------
    { kit: 'lamppost', at: [37.5, 13.5] },
    { kit: 'lamppost', at: [8.5, 16.5] },
    { kit: 'barrel', at: [21.4, 13.4] },
    { kit: 'crate', at: [22.6, 14.6], rot: 0.5 },
    { kit: 'chest', at: [35.5, 16.5], id: 'iq-chest-2',
      contains: { kind: 'item', id: 'siegelock', count: 1, label: 'a Siege Lock' } },
    // Off the Gainsay, which the second bench cuts straight into.
    { kit: 'chest', at: [12.5, 14.5], id: 'iq-chest-8',
      contains: { kind: 'item', id: 'answeringshield', count: 1, label: 'an Answering Shield' } },
    { kit: 'savepoint', at: [29.5, 19.5], id: 'iq-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },

    // --- the third bench -------------------------------------------------------
    { kit: 'lamppost', at: [10.5, 22.5] },
    { kit: 'lamppost', at: [33.5, 22.5] },
    { kit: 'rock', at: [18.0, 25.5], scale: 1.5, seed: 3 },
    { kit: 'chest', at: [7.5, 25.5], id: 'iq-chest-3',
      contains: { kind: 'item', id: 'cairnbreakers', count: 1, label: 'a pair of Cairn Breakers' } },
    { kit: 'chest', at: [28.5, 24.5], id: 'iq-chest-9',
      contains: { kind: 'item', id: 'echostone', count: 1, label: 'an Echo Stone' } },
    { kit: 'signpost', at: [13.5, 28.5], id: 'iq-look-3',
      interact: { name: 'Third Lookout', text: [
        'From here the first lookout is two benches up and directly overhead, and',
        'you can see the underside of its planking. Somebody is meant to be on it.',
      ] } },

    // --- the fourth bench ------------------------------------------------------
    { kit: 'savepoint', at: [22, 33], id: 'iq-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [12.5, 31.5] },
    { kit: 'lamppost', at: [33.5, 31.5] },
    { kit: 'cart', at: [16.5, 35.5], rot: 1.5 },
    { kit: 'chest', at: [36.5, 34.5], id: 'iq-chest-4',
      contains: { kind: 'item', id: 'gravehelm', count: 1, label: 'a Grave Helm' } },
    { kit: 'chest', at: [9.5, 33.5], id: 'iq-chest-10',
      contains: { kind: 'item', id: 'answeringmirror', count: 1, label: 'an Answering Mirror' } },
    { kit: 'lamppost', at: [27.5, 37.5] },

    // --- the fifth bench -------------------------------------------------------
    { kit: 'lamppost', at: [11.5, 40.5] },
    { kit: 'lamppost', at: [32.5, 40.5] },
    { kit: 'rock', at: [24.0, 43.5], scale: 1.6, seed: 5, material: 'cave' },
    { kit: 'chest', at: [8.5, 43.5], id: 'iq-chest-5',
      contains: { kind: 'item', id: 'siegeplate', count: 1, label: 'a suit of Siege Plate' } },
    { kit: 'chest', at: [34.5, 44.5], id: 'iq-chest-6',
      contains: { kind: 'item', id: 'sunderingcharge', count: 3, label: '3 Sundering Charges' } },
    // The fifth bench is already in the Acre. This came up the haul road.
    { kit: 'chest', at: [20.5, 41.5], id: 'iq-chest-11',
      contains: { kind: 'item', id: 'broodfang', count: 1, label: 'a Brood Fang' } },
    // Something crossing the fifth bench against the wind, all afternoon.
    { kit: 'signpost', at: [28.5, 44.5], id: 'iq-drift',
      interact: { prompt: 'The drift on the bench', event: 'thelongdrift' } },
    { kit: 'signpost', at: [15.5, 46.5], id: 'iq-look-5',
      interact: { name: 'Fifth Lookout', text: [
        'The last of them, and the only one nobody bothered to rail.',
        'Straight down from the edge is the sump, and the water in it is not the',
        'colour water is, and the shapes standing in it are not standing in it.',
      ] } },

    // --- the sump ---------------------------------------------------------------
    { kit: 'savepoint', at: [12, 49], id: 'iq-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [11.5, 51.5] },
    { kit: 'lamppost', at: [33.5, 51.5] },
    // The bottom terrace, which is the address the Pit Warden's magicite is
    // recorded at, and where the seam the company stopped short of actually
    // starts. The face beside it keeps the description of the sump.
    { kit: 'well', at: [13.5, 51.5], id: 'iq-sump', radius: 1.1, interactRadius: 2.4,
      interact: { prompt: 'The Sump', event: 'themotherlode' } },
    { kit: 'signpost', at: [16.5, 48.5], id: 'iq-sump-face',
      interact: { name: 'The Sump', text: [
        'The floor of the quarry, and the only part of it that was never cut.',
        'The company took the iron out of this hill in six clean steps and then',
        'stopped, one bench above where the iron actually starts.',
      ] } },
    { kit: 'chest', at: [33.5, 49.5], id: 'iq-chest-7',
      contains: { kind: 'item', id: 'bloodironband', count: 1, label: 'a Blood Iron Band' } },
    // Standing water at the bottom of an iron pit is a slaking pit whether
    // anybody meant it to be one or not, and two things were left in it.
    { kit: 'chest', at: [15.5, 50.5], id: 'iq-chest-12',
      contains: { kind: 'item', id: 'quenchlance', count: 1, label: 'a Quench Lance' } },
    { kit: 'chest', at: [31.5, 50.5], id: 'iq-chest-13',
      contains: { kind: 'item', id: 'quenchcrown', count: 1, label: 'a Quench Crown' } },
    { kit: 'crate', at: [30.4, 48.6], rot: 0.8 },
    { kit: 'rock', at: [10.0, 48.5], scale: 1.7, seed: 7, material: 'cave' },
  ],

  npcs: [],
};
