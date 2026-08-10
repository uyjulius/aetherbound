/**
 * The Windwake — ten towers in a drowned firth, and a route you do not choose.
 *
 * There is no ground here. There are ten tower tops standing out of the water
 * and the spans that were built between them, and the only question this
 * dungeon ever asks is which of those spans is still there.
 *
 * They were built as a straight line. Landing, Middle Ward, Crosswind, the
 * Head — four towers stacked up the middle of the firth with a span between
 * each, and the drum towers and the wards out to either side were the sidings
 * off it. Every one of the four spans on that straight line is down. What is
 * left of them is drawn: two paces of deck off the tower that built them,
 * railed and swept and ending in air. Stand on the stub off Middle Ward and the
 * Landing is directly in front of you, close enough to shout to.
 *
 * So the crossing is made entirely around the outside. Landing to Tallow, up to
 * the West Drum, up to North Ward, across to Crosswind, and only then north to
 * the Head — five spans and a long way round, and not one of them chosen. The
 * eastern arm, the Gantry and the East Drum and the Bell, is the same journey
 * with its last span missing, so it is a limb rather than a route: you can walk
 * all of it and you cannot get anywhere by it, and you can see that from the
 * Landing if you look at which way the two spans off it point.
 *
 * Middle Ward is the cruel one. It is the biggest tower on the map, it is dead
 * centre, three of its four spans are stubs, and the one that works comes in
 * from the side and goes back out the same way. It is a dead end with the best
 * view in the firth.
 *
 * Rows use the same run-length notation as the other dungeons; one miscounted
 * row over water is a span nobody built.
 */

const W = 50;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[windwake] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Glyphs, and what they are:
//   R  a tower top — dressed stone, and the only standing ground
//   o  a span, or what is left of one
//   #  a winch house on the crown of a tower
//   ~  the firth, a hundred and forty feet down

const TERRAIN = [
  /*  0 */ row(R('~', 50)),
  // T10 THE HEAD. The far tower, and the only thing north of Crosswind.
  /*  1 */ row(R('~', 18), R('R', 15), R('~', 17)),
  /*  2 */ row(R('~', 18), R('R', 15), R('~', 17)),
  /*  3 */ row(R('~', 18), R('R', 4), R('#', 3), R('R', 2), R('#', 3), R('R', 3), R('~', 17)),
  /*  4 */ row(R('~', 18), R('R', 4), R('#', 3), R('R', 2), R('#', 3), R('R', 3), R('~', 17)),
  /*  5 */ row(R('~', 18), R('R', 15), R('~', 17)),
  /*  6 */ row(R('~', 18), R('R', 15), R('~', 17)),
  // The Crosswind span — the last crossing on the map that still stands.
  /*  7 */ row(R('~', 24), R('o', 2), R('~', 24)),
  // T8 NORTH WARD and T9 THE BELL.
  /*  8 */ row(R('~', 6), R('R', 9), R('~', 9), R('o', 2), R('~', 10), R('R', 9), R('~', 5)),
  /*  9 */ row(R('~', 6), R('R', 9), R('~', 9), R('o', 2), R('~', 10), R('R', 9), R('~', 5)),
  /* 10 */ row(R('~', 6), R('R', 9), R('~', 9), R('o', 2), R('~', 10), R('R', 9), R('~', 5)),
  /* 11 */ row(R('~', 6), R('R', 3), R('#', 3), R('R', 3), R('~', 9), R('o', 2), R('~', 10), R('R', 3), R('#', 3), R('R', 3), R('~', 5)),
  /* 12 */ row(R('~', 6), R('R', 3), R('#', 3), R('R', 3), R('~', 6), R('R', 9), R('~', 6), R('R', 3), R('#', 3), R('R', 3), R('~', 5)),
  // The North Ward span, and the stub of the one the Bell used to answer.
  /* 13 */ row(R('~', 6), R('R', 3), R('#', 3), R('R', 3), R('o', 6), R('R', 9), R('~', 4), R('o', 2), R('R', 3), R('#', 3), R('R', 3), R('~', 5)),
  /* 14 */ row(R('~', 6), R('R', 9), R('o', 6), R('R', 9), R('~', 4), R('o', 2), R('R', 9), R('~', 5)),
  /* 15 */ row(R('~', 6), R('R', 9), R('~', 6), R('R', 3), R('#', 3), R('R', 3), R('~', 6), R('R', 9), R('~', 5)),
  /* 16 */ row(R('~', 6), R('R', 9), R('~', 6), R('R', 3), R('#', 3), R('R', 3), R('~', 6), R('R', 9), R('~', 5)),
  // The two drum spans.
  /* 17 */ row(R('~', 8), R('o', 2), R('~', 11), R('R', 3), R('#', 3), R('R', 3), R('~', 10), R('o', 2), R('~', 8)),
  /* 18 */ row(R('~', 8), R('o', 2), R('~', 11), R('R', 9), R('~', 10), R('o', 2), R('~', 8)),
  /* 19 */ row(R('~', 8), R('o', 2), R('~', 11), R('R', 9), R('~', 10), R('o', 2), R('~', 8)),
  // T5 THE WEST DRUM and T6 THE EAST DRUM.
  /* 20 */ row(R('~', 3), R('R', 9), R('~', 9), R('R', 9), R('~', 9), R('R', 9), R('~', 2)),
  // Crosswind reaching south for Middle Ward. Two paces of it are left.
  /* 21 */ row(R('~', 3), R('R', 9), R('~', 12), R('o', 2), R('~', 13), R('R', 9), R('~', 2)),
  /* 22 */ row(R('~', 3), R('R', 9), R('~', 12), R('o', 2), R('~', 13), R('R', 9), R('~', 2)),
  /* 23 */ row(R('~', 3), R('R', 3), R('#', 3), R('R', 3), R('~', 27), R('R', 3), R('#', 3), R('R', 3), R('~', 2)),
  // T4 MIDDLE WARD. Four spans were built off this tower. One still stands.
  /* 24 */ row(R('~', 3), R('R', 3), R('#', 3), R('R', 3), R('~', 8), R('R', 11), R('~', 8), R('R', 3), R('#', 3), R('R', 3), R('~', 2)),
  // The West Drum span, and the stub that pointed at the East Drum.
  /* 25 */ row(R('~', 3), R('R', 3), R('#', 3), R('R', 3), R('o', 8), R('R', 11), R('o', 3), R('~', 5), R('R', 3), R('#', 3), R('R', 3), R('~', 2)),
  /* 26 */ row(R('~', 3), R('R', 9), R('o', 8), R('R', 11), R('o', 3), R('~', 5), R('R', 9), R('~', 2)),
  /* 27 */ row(R('~', 3), R('R', 9), R('~', 8), R('R', 4), R('#', 3), R('R', 4), R('~', 8), R('R', 9), R('~', 2)),
  /* 28 */ row(R('~', 3), R('R', 9), R('~', 8), R('R', 4), R('#', 3), R('R', 4), R('~', 8), R('R', 9), R('~', 2)),
  // The two long spans down to Tallow and the Gantry.
  /* 29 */ row(R('~', 7), R('o', 2), R('~', 11), R('R', 4), R('#', 3), R('R', 4), R('~', 11), R('o', 2), R('~', 6)),
  /* 30 */ row(R('~', 7), R('o', 2), R('~', 11), R('R', 11), R('~', 11), R('o', 2), R('~', 6)),
  /* 31 */ row(R('~', 7), R('o', 2), R('~', 11), R('R', 11), R('~', 11), R('o', 2), R('~', 6)),
  /* 32 */ row(R('~', 7), R('o', 2), R('~', 11), R('R', 11), R('~', 11), R('o', 2), R('~', 6)),
  // Middle Ward reaching south for the Landing. Two paces of it are left.
  /* 33 */ row(R('~', 7), R('o', 2), R('~', 15), R('o', 2), R('~', 16), R('o', 2), R('~', 6)),
  // T2 TALLOW and T3 THE GANTRY.
  /* 34 */ row(R('~', 5), R('R', 9), R('~', 10), R('o', 2), R('~', 11), R('R', 9), R('~', 4)),
  /* 35 */ row(R('~', 5), R('R', 9), R('~', 23), R('R', 9), R('~', 4)),
  /* 36 */ row(R('~', 5), R('R', 9), R('~', 23), R('R', 9), R('~', 4)),
  /* 37 */ row(R('~', 5), R('R', 3), R('#', 3), R('R', 3), R('~', 23), R('R', 3), R('#', 3), R('R', 3), R('~', 4)),
  // T1 THE LANDING, and the mooring you arrive at.
  /* 38 */ row(R('~', 5), R('R', 3), R('#', 3), R('R', 3), R('~', 7), R('R', 9), R('~', 7), R('R', 3), R('#', 3), R('R', 3), R('~', 4)),
  // The two spans off the Landing — and both of them go outwards.
  /* 39 */ row(R('~', 5), R('R', 3), R('#', 3), R('R', 3), R('o', 7), R('R', 9), R('o', 7), R('R', 3), R('#', 3), R('R', 3), R('~', 4)),
  /* 40 */ row(R('~', 5), R('R', 9), R('o', 7), R('R', 3), R('#', 3), R('R', 3), R('o', 7), R('R', 9), R('~', 4)),
  /* 41 */ row(R('~', 5), R('R', 9), R('~', 7), R('R', 3), R('#', 3), R('R', 3), R('~', 7), R('R', 9), R('~', 4)),
  /* 42 */ row(R('~', 5), R('R', 9), R('~', 7), R('R', 3), R('#', 3), R('R', 3), R('~', 7), R('R', 9), R('~', 4)),
  /* 43 */ row(R('~', 21), R('R', 9), R('~', 20)),
  /* 44 */ row(R('~', 21), R('R', 9), R('~', 20)),
  /* 45 */ row(R('~', 21), R('R', 9), R('~', 20)),
];

export const WINDWAKE = {
  id: 'windwake',
  name: 'The Windwake',
  subtitle: 'Ten Towers, Five Spans',
  kind: 'dungeon',
  light: 'dawn',
  grade: 'dawn',
  fog: ['#8fa0ad', 30, 130],
  tilt: 0.30,
  cameraDistance: 19,
  cameraPitch: 0.74,
  music: 'mountain',
  base: 'rock',
  groundRamp: 'terrain',
  wallHeight: 5,
  wallMaterial: 'stone',
  // Dawn at this height is a long way off the water, and the deck lamps are what
  // tell a standing span from a stub before you are out on it.
  lampIntensity: 6,
  lampRange: 14,
  waterLevel: -1.4,
  water: { shallow: '#4a6e80', deep: '#0c1824', foam: '#b8cdd6', waveHeight: 0.03, waveScale: 1.2 },

  sky: {
    zenith: '#25406a', horizon: '#f0b487', ground: '#5a6a72',
    sunColor: '#ffd2a0', sunDir: [0.55, 0.12, 0.34], cloud: 0.36,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [23, 43], face: 'north' },
    world: { at: [23, 43], face: 'north' },
  },

  exits: [
    { at: [23, 45], size: [4, 1], to: 'eastreach', spawn: 'windwake_mooring',
      prompt: 'Go down to the mooring' },
  ],

  triggers: [],

  /**
   * A tower top has a parapet and a winch house and somewhere to put your back.
   * A span is four feet of plank with the firth under it and the wind coming
   * across it in one direction all day. They are not the same place and they do
   * not roll the same table, and the difference is the reason the long way round
   * costs what it costs.
   *
   * The Head is left to the map's own table below. It is the end of the
   * crossing, and it is where the hunts are.
   */
  encounterZones: [
    { rect: [14, 39, 7, 2], table: 'brood_acre_hives' },
    { rect: [30, 39, 7, 2], table: 'brood_acre_hives' },
    { rect: [7, 29, 2, 5], table: 'brood_acre_hives' },
    { rect: [42, 29, 2, 5], table: 'brood_acre_hives' },
    { rect: [12, 25, 8, 2], table: 'brood_acre_hives' },
    { rect: [8, 17, 2, 3], table: 'brood_acre_hives' },
    { rect: [40, 17, 2, 3], table: 'brood_acre_hives' },
    { rect: [15, 13, 6, 2], table: 'brood_acre_hives' },
    { rect: [24, 7, 2, 5], table: 'brood_acre_hives' },
    // Everything from North Ward southward. The Head is deliberately outside it.
    { rect: [0, 8, 50, 38], table: 'gainsay_deep' },
  ],

  // The last four groups are hunts, and the Head is the only tower they stand on.
  encounters: {
    rate: 28, terrain: 'cobble', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['chaffmidge', 'chaffmidge', 'veinmoth'] },
      { weight: 24, enemies: ['acrecrow', 'shelfhound'] },
      { weight: 20, enemies: ['quietingbell', 'tithewisp'] },
      { weight: 16, enemies: ['brooddrone', 'broodnurse'] },
      { weight: 12, enemies: ['arrearswight', 'grudgewight'] },
      { weight: 3, enemies: ['theanswering'] },
      { weight: 3, enemies: ['theunderforeman'] },
      { weight: 2, enemies: ['thegainsayer'] },
      { weight: 2, enemies: ['theacremother'] },
    ],
  },

  props: [
    // --- T1 the Landing --------------------------------------------------------
    { kit: 'savepoint', at: [23, 44], id: 'ww-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [22.5, 39.5], id: 'ww-landing',
      interact: { name: 'The Landing Board', text: [
        'SPANS FROM THIS TOWER: TALLOW (W), THE GANTRY (E), MIDDLE WARD (N).',
        'The third line has been struck through, and under it, in charcoal:',
        'NOR THE ONE AFTER IT. NOR THE ONE AFTER THAT. GO ROUND.',
      ] } },
    { kit: 'lamppost', at: [28.5, 44.5] },
    { kit: 'crate', at: [21.6, 41.4], rot: 0.4 },
    { kit: 'chest', at: [27.5, 39.5], id: 'ww-chest-1',
      contains: { kind: 'item', id: 'hawksbreath', count: 4, label: "4 flasks of Hawk's Breath" } },
    { kit: 'fence', at: [29.9, 42], arg: 6, rot: 1.5708 },

    // --- T2 Tallow -------------------------------------------------------------
    { kit: 'lamppost', at: [6.5, 35.5] },
    { kit: 'barrel', at: [5.4, 40.6] },
    { kit: 'chest', at: [11.5, 41.5], id: 'ww-chest-2',
      contains: { kind: 'item', id: 'overwindcowl', count: 1, label: 'an Overwind Cowl' } },
    { kit: 'signpost', at: [12.5, 35.5], id: 'ww-tallow',
      interact: { name: 'Tallow', text: [
        'A tallow store with the doors off it, and the wind has had the inside.',
        'The span north out of here is the first one on this map that is whole,',
        'and it is also the first one that does not go where you want to go.',
      ] } },

    // --- T3 the Gantry ---------------------------------------------------------
    { kit: 'lamppost', at: [44.5, 35.5] },
    { kit: 'chest', at: [38.5, 41.5], id: 'ww-chest-3',
      contains: { kind: 'item', id: 'galeflask', count: 5, label: '5 Gale Flasks' } },
    { kit: 'signpost', at: [38.5, 35.5], id: 'ww-gantry',
      interact: { name: 'The Gantry', text: [
        'The head of the eastern arm, and every tower on it is worth walking to.',
        'None of them is worth walking to on the way to anywhere.',
      ] } },

    // --- T4 Middle Ward, and the three stubs -----------------------------------
    { kit: 'savepoint', at: [22, 31], id: 'ww-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [22.5, 28.5] },
    { kit: 'chest', at: [28.5, 31.5], id: 'ww-chest-4',
      contains: { kind: 'item', id: 'overwindband', count: 1, label: 'an Overwind Band' } },
    { kit: 'chest', at: [21.5, 25.5], id: 'ww-chest-5',
      contains: { kind: 'item', id: 'wardensignet', count: 1, label: "a Warden's Signet" } },
    { kit: 'signpost', at: [28.5, 25.5], id: 'ww-middle',
      interact: { name: 'Middle Ward', text: [
        'The tallest tower in the firth, sited dead centre so that everything',
        'could be reached from it, and three of its four spans end in air.',
        'You came up here the long way round and you will go back down it.',
      ] } },
    { kit: 'signpost', at: [24.6, 33.6], id: 'ww-stub-south',
      interact: { name: 'The South Stub', text: [
        'Two paces of swept deck with a rail on it, and then the firth.',
        'The Landing is straight ahead and close enough to shout across.',
        'It took you five spans to get from there to here.',
      ] } },
    { kit: 'chest', at: [32.5, 25.5], id: 'ww-chest-6',
      contains: { kind: 'item', id: 'overwindcoat', count: 1, label: 'an Overwind Coat' } },

    // --- T5 the West Drum ------------------------------------------------------
    { kit: 'lamppost', at: [4.5, 21.5] },
    { kit: 'chest', at: [10.5, 27.5], id: 'ww-chest-7',
      contains: { kind: 'item', id: 'stormheart', count: 1, label: 'a Storm Heart' } },
    { kit: 'signpost', at: [4.5, 27.5], id: 'ww-westdrum',
      interact: { name: 'The West Drum', text: [
        'A winding drum the size of a room, with the cable still on it, going up.',
        'Whatever it was lifting, it was not lifting it off the water.',
      ] } },

    // --- T6 the East Drum ------------------------------------------------------
    { kit: 'savepoint', at: [46, 27], id: 'ww-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [46.5, 21.5] },
    { kit: 'chest', at: [40.5, 27.5], id: 'ww-chest-8',
      contains: { kind: 'item', id: 'stormpike', count: 1, label: 'a Stormpike' } },

    // --- T7 Crosswind ----------------------------------------------------------
    { kit: 'savepoint', at: [23, 19], id: 'ww-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [28.5, 13.5] },
    { kit: 'chest', at: [28.5, 19.5], id: 'ww-chest-9',
      contains: { kind: 'item', id: 'quickeningdraught', count: 3, label: '3 Quickening Draughts' } },
    { kit: 'signpost', at: [22.5, 13.5], id: 'ww-crosswind',
      interact: { name: 'Crosswind', text: [
        'The one tower on the straight line that can still be reached, and it can',
        'only be reached from the side. Both of its own straight-line spans are',
        'stubs. The span north out of here is the last whole one on the map.',
      ] } },
    { kit: 'signpost', at: [24.6, 21.6], id: 'ww-stub-north',
      interact: { name: 'The North Stub', text: [
        'Middle Ward is below you and in front of you and has a stub of its own,',
        'pointing back. The two of them are eight feet apart at the ends.',
      ] } },

    // --- T8 North Ward ---------------------------------------------------------
    { kit: 'lamppost', at: [13.5, 15.5] },
    { kit: 'chest', at: [7.5, 9.5], id: 'ww-chest-10',
      contains: { kind: 'item', id: 'broodveil', count: 1, label: 'a Brood Veil' } },
    { kit: 'signpost', at: [7.5, 15.5], id: 'ww-northward',
      interact: { name: 'North Ward', text: [
        'The corner of the long way round, and the only tower on it with a roof.',
        'Somebody wintered here. There is a mark on the wall for every crossing',
        'they made, and they are all in one column, and the column is short.',
      ] } },

    // --- T9 the Bell -----------------------------------------------------------
    { kit: 'lamppost', at: [43.5, 15.5] },
    { kit: 'chest', at: [43.5, 9.5], id: 'ww-chest-11',
      contains: { kind: 'item', id: 'ironhail', count: 1, label: 'an Ironhail' } },
    { kit: 'chest', at: [37.5, 15.5], id: 'ww-chest-12',
      contains: { kind: 'item', id: 'wakefulcharm', count: 1, label: 'a Wakeful Charm' } },
    { kit: 'signpost', at: [37.5, 9.5], id: 'ww-bell',
      interact: { name: 'The Bell', text: [
        'The far end of the eastern arm. The bell is still hung and still rings,',
        'and what it was rung for was to tell Crosswind that the span was clear.',
        'You can see Crosswind from here. You cannot get to it from here.',
      ] } },
    { kit: 'chest', at: [34.5, 13.5], id: 'ww-chest-13',
      contains: { kind: 'item', id: 'secondbreath', count: 1, label: 'a Second Breath' } },

    // --- T10 the Head ----------------------------------------------------------
    { kit: 'savepoint', at: [26, 5], id: 'ww-save-5', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [21.5, 5.5] },
    { kit: 'lamppost', at: [30.5, 1.5] },
    { kit: 'signpost', at: [25.5, 1.5], id: 'ww-head',
      interact: { name: 'The Head', text: [
        'The last tower, and from up here the straight line is obvious: Landing,',
        'Middle Ward, Crosswind, the Head, all four in a row and all four still',
        'standing. It is only the four spans between them that are gone.',
      ] } },
    { kit: 'chest', at: [19.5, 5.5], id: 'ww-chest-14',
      contains: { kind: 'item', id: 'theninthgate', count: 1, label: 'The Ninth Gate' } },
    { kit: 'chest', at: [31.5, 5.5], id: 'ww-chest-15',
      contains: { kind: 'item', id: 'overwindlance', count: 1, label: 'an Overwind Lance' } },
    { kit: 'chest', at: [19.5, 1.5], id: 'ww-chest-16',
      contains: { kind: 'item', id: 'sprinter', count: 1, label: 'a Sprinter' } },
  ],

  npcs: [],
};
