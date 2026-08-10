/**
 * The Bramblewold — nine greens, and the wood shuts behind you.
 *
 * The wold is not a maze and it does not branch. It is nine clearings strung on
 * a single line that ploughs the map the way a field is ploughed: east along
 * the bottom, north one band, west along the middle, north again, east along
 * the top. A player who never once chooses a direction walks the whole of it.
 *
 * What makes it one-way is the shape of the gaps. Every clearing is left by a
 * funnel: a four-pace mouth that closes to two paces and stays two paces for
 * four more, so you are poured out of one green and squeezed down a tunnel into
 * the next. What is behind you when you arrive is therefore not a gate. It is a
 * two-pace slot in a wall of thorn that looks exactly like the rest of the wall
 * of thorn, and the mouth that made it obvious is at the far end of the tunnel,
 * where you cannot see it. Nothing has closed. It is simply that the way back
 * was never a thing you could look at, and by the third green the player has
 * stopped trying.
 *
 * Two blind spurs run off the trodden way and both stop two rows short of the
 * green beyond them, which is deliberate: they are the two places the wold
 * appears to fold back on itself, and neither of them does.
 *
 * The ninth green is the only one cut square to its block. The briar gives up
 * there, and it is the first thing in the wold with corners.
 *
 * Rows use the same run-length notation as the other dungeons; one miscounted
 * row in a funnel would open a door back through the thorn and undo the whole
 * argument.
 */

const W = 48;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[bramblewold] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 48)),
  /*  1 */ row(R('#', 48)),
  /*  2 */ row(R('#', 48)),
  // ===== the top band: greens seven, eight and nine =========================
  /*  3 */ row(R('#', 3), R('f', 3), R('.', 4), R('f', 12), R('.', 4), R('f', 9), R('.', 10), R('#', 3)),
  /*  4 */ row(R('#', 3), R('f', 2), R('.', 6), R('f', 10), R('.', 6), R('f', 8), R('.', 10), R('#', 3)),
  /*  5 */ row(R('#', 3), 'f', R('.', 8), R('f', 8), R('.', 8), R('f', 7), R('.', 10), R('#', 3)),
  // the mouths of the funnels east, out of seven and out of eight
  /*  6 */ row(R('#', 3), R('.', 12), R('f', 4), R('.', 12), R('f', 4), R('.', 10), R('#', 3)),
  /*  7 */ row(R('#', 3), R('.', 42), R('#', 3)),
  // and the two-pace slots they narrow to
  /*  8 */ row(R('#', 3), R('.', 42), R('#', 3)),
  /*  9 */ row(R('#', 3), R('.', 12), R('f', 4), R('.', 12), R('f', 4), R('.', 10), R('#', 3)),
  /* 10 */ row(R('#', 3), 'f', R('.', 8), R('f', 8), R('.', 8), R('f', 7), R('.', 10), R('#', 3)),
  /* 11 */ row(R('#', 3), R('f', 2), R('.', 6), R('f', 10), R('.', 6), R('f', 8), R('.', 10), R('#', 3)),
  /* 12 */ row(R('#', 3), R('f', 3), R('.', 4), R('f', 12), R('.', 4), R('f', 9), R('.', 10), R('#', 3)),
  // --- the throat up out of green six, and a spur that stops two rows short
  /* 13 */ row(R('#', 3), R('f', 4), R('.', 2), R('f', 36), R('#', 3)),
  /* 14 */ row(R('#', 3), R('f', 4), R('.', 2), R('f', 36), R('#', 3)),
  /* 15 */ row(R('#', 3), R('f', 4), R('.', 2), R('f', 30), R('.', 2), R('f', 4), R('#', 3)),
  /* 16 */ row(R('#', 3), R('f', 4), R('.', 2), R('f', 30), R('.', 2), R('f', 4), R('#', 3)),
  /* 17 */ row(R('#', 3), R('f', 3), R('.', 4), R('f', 29), R('.', 2), R('f', 4), R('#', 3)),
  /* 18 */ row(R('#', 3), R('f', 3), R('.', 4), R('f', 29), R('.', 2), R('f', 4), R('#', 3)),
  // ===== the middle band: greens six, five and four =========================
  /* 19 */ row(R('#', 3), R('f', 3), R('.', 4), R('f', 12), R('.', 4), R('f', 12), R('.', 4), R('f', 3), R('#', 3)),
  /* 20 */ row(R('#', 3), R('f', 2), R('.', 6), R('f', 10), R('.', 6), R('f', 10), R('.', 6), R('f', 2), R('#', 3)),
  /* 21 */ row(R('#', 3), 'f', R('.', 8), R('f', 8), R('.', 8), R('f', 8), R('.', 8), 'f', R('#', 3)),
  // the mouths of the funnels back west, out of four and out of five
  /* 22 */ row(R('#', 3), R('.', 10), R('f', 4), R('.', 12), R('f', 4), R('.', 12), R('#', 3)),
  /* 23 */ row(R('#', 3), R('.', 42), R('#', 3)),
  // and their slots
  /* 24 */ row(R('#', 3), R('.', 42), R('#', 3)),
  /* 25 */ row(R('#', 3), R('.', 10), R('f', 4), R('.', 12), R('f', 4), R('.', 12), R('#', 3)),
  /* 26 */ row(R('#', 3), 'f', R('.', 8), R('f', 8), R('.', 8), R('f', 8), R('.', 8), 'f', R('#', 3)),
  /* 27 */ row(R('#', 3), R('f', 2), R('.', 6), R('f', 10), R('.', 6), R('f', 10), R('.', 6), R('f', 2), R('#', 3)),
  /* 28 */ row(R('#', 3), R('f', 3), R('.', 4), R('f', 12), R('.', 4), R('f', 12), R('.', 4), R('f', 3), R('#', 3)),
  // --- the throat up out of green three, and the second blind spur ---------
  /* 29 */ row(R('#', 3), R('f', 36), R('.', 2), R('f', 4), R('#', 3)),
  /* 30 */ row(R('#', 3), R('f', 36), R('.', 2), R('f', 4), R('#', 3)),
  /* 31 */ row(R('#', 3), R('f', 20), R('.', 2), R('f', 14), R('.', 2), R('f', 4), R('#', 3)),
  /* 32 */ row(R('#', 3), R('f', 20), R('.', 2), R('f', 14), R('.', 2), R('f', 4), R('#', 3)),
  /* 33 */ row(R('#', 3), R('f', 20), R('.', 2), R('f', 13), R('.', 4), R('f', 3), R('#', 3)),
  /* 34 */ row(R('#', 3), R('f', 20), R('.', 2), R('f', 13), R('.', 4), R('f', 3), R('#', 3)),
  // ===== the bottom band: greens one, two and three =========================
  /* 35 */ row(R('#', 3), R('f', 3), R('.', 4), R('f', 12), R('.', 4), R('f', 12), R('.', 4), R('f', 3), R('#', 3)),
  /* 36 */ row(R('#', 3), R('f', 2), R('.', 6), R('f', 10), R('.', 6), R('f', 10), R('.', 6), R('f', 2), R('#', 3)),
  /* 37 */ row(R('#', 3), 'f', R('.', 8), R('f', 8), R('.', 8), R('f', 8), R('.', 8), 'f', R('#', 3)),
  // the mouths of the funnels east, out of one and out of two
  /* 38 */ row(R('#', 3), R('.', 12), R('f', 4), R('.', 12), R('f', 4), R('.', 10), R('#', 3)),
  /* 39 */ row(R('#', 3), R('.', 42), R('#', 3)),
  // and their slots
  /* 40 */ row(R('#', 3), R('.', 42), R('#', 3)),
  /* 41 */ row(R('#', 3), R('.', 12), R('f', 4), R('.', 12), R('f', 4), R('.', 10), R('#', 3)),
  /* 42 */ row(R('#', 3), 'f', R('.', 8), R('f', 8), R('.', 8), R('f', 8), R('.', 8), 'f', R('#', 3)),
  /* 43 */ row(R('#', 3), R('f', 2), R('.', 6), R('f', 10), R('.', 6), R('f', 10), R('.', 6), R('f', 2), R('#', 3)),
  /* 44 */ row(R('#', 3), R('f', 3), R('.', 4), R('f', 12), R('.', 4), R('f', 12), R('.', 4), R('f', 3), R('#', 3)),
  // --- the hunting gate ------------------------------------------------------
  /* 45 */ row(R('#', 6), R(',', 4), R('#', 38)),
  /* 46 */ row(R('#', 6), R(',', 4), R('#', 38)),
  /* 47 */ row(R('#', 6), R(',', 4), R('#', 38)),
];

export const BRAMBLEWOLD = {
  id: 'bramblewold',
  name: 'The Bramblewold',
  subtitle: 'Nine Greens and No Way Back',
  kind: 'dungeon',
  light: 'night',
  grade: 'night',
  fog: ['#1c2430', 20, 86],
  tilt: 0.40,
  cameraDistance: 14,
  cameraPitch: 0.66,
  music: 'forest',
  base: 'grass',
  groundRamp: 'terrain',
  wallHeight: 8,
  wallMaterial: 'rock',
  // Night under a closed canopy is genuinely black. The wold is walked by the
  // hunting lamps and by nothing else.
  lampIntensity: 9,
  lampRange: 12,

  sky: {
    zenith: '#0e1220', horizon: '#2c3a4a', ground: '#141a16',
    sunColor: '#8fa8d0', sunDir: [-0.3, 0.42, -0.5], cloud: 0.42,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [8, 45], face: 'north' },
    world: { at: [8, 45], face: 'north' },
  },

  exits: [
    { at: [6, 47], size: [4, 1], to: 'overworld', spawn: 'bramblewold',
      prompt: 'Leave the wold' },
  ],

  // The wold is walked in one direction and every green is passed through, so
  // a tripwire anywhere on the trodden way would fire on the way past. Its
  // three scripted things are examined instead.
  triggers: [],

  /**
   * Two regions share this band and the wold borders both, so the wold walks
   * out of one and into the other rather than picking a side: the Meridian's
   * clock-things hold the bottom band, the Yards' stock holds the middle, and
   * the two throats between the bands are where the handover happens — which
   * is also where there is no room to back out of it.
   *
   * The ninth green is deliberately left to the map's own table below. It is
   * the far end, it is the only end, and it is where the two Yards hunts walk.
   */
  encounterZones: [
    { rect: [0, 35, 48, 13], table: 'hollow_meridian' },       // greens one to three
    { rect: [0, 19, 48, 16], table: 'blooding_yards' },        // greens four to six
    { rect: [0, 13, 48, 6], table: 'hollow_meridian_late' },   // the throat up
    { rect: [0, 3, 33, 10], table: 'blooding_yards_pens' },    // greens seven and eight
  ],

  // A long walk with no shortcuts in it, so the fuse is set well above normal
  // or the player would fight their way through nine clearings.
  //
  // The last two groups are hunts rather than wildlife: two things off the
  // Blooding Yards that walk the far greens, at a weight low enough that
  // meeting one is an event rather than a tax.
  encounters: {
    rate: 32, terrain: 'grass', scenery: 'field',
    groups: [
      { weight: 26, enemies: ['tollbriar', 'hushhound'] },
      { weight: 24, enemies: ['vespermoth', 'vespermoth', 'hourhand'] },
      { weight: 20, enemies: ['deadreckoner', 'stoppedman'] },
      { weight: 18, enemies: ['quarterhusk', 'hushhound', 'hushhound'] },
      { weight: 12, enemies: ['noonwidow', 'latecomer'] },
      { weight: 3, enemies: ['theyardmaster'] },
      { weight: 2, enemies: ['thebutchersbill'] },
    ],
  },

  props: [
    // --- green one: the hunting gate -----------------------------------------
    { kit: 'savepoint', at: [8, 40], id: 'bw-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [5.6, 38.4], id: 'bw-gatepost',
      interact: { name: 'Hunting Post', text: [
        'A post at the mouth of the wold with a single instruction burned into it.',
        'GO ON. DO NOT TURN AND LOOK FOR THIS POST AGAIN.',
        'Below it, in a different hand: YOU WILL NOT FIND IT.',
      ] } },
    { kit: 'lamppost', at: [10.5, 38.5] },
    { kit: 'bush', at: [6.4, 41.6], scale: 1.2, seed: 3 },
    { kit: 'chest', at: [5.5, 41.5], id: 'bw-chest-1',
      contains: { kind: 'item', id: 'vigilbalm', count: 4, label: '4 Vigil Balms' } },

    // --- green two, and the spur that looks like a way north ------------------
    { kit: 'lamppost', at: [21.5, 38.5] },
    { kit: 'tree', at: [26.5, 41.5], kind: 'dead', scale: 1.2, seed: 5 },
    { kit: 'chest', at: [24, 40], id: 'bw-chest-2',
      contains: { kind: 'item', id: 'bramblehooks', count: 1, label: 'a pair of Bramble Hooks' } },
    { kit: 'chest', at: [23.5, 32.5], id: 'bw-chest-3',
      contains: { kind: 'item', id: 'wanderersbell', count: 1, label: 'a Wanderer\'s Bell' } },

    // --- green three ----------------------------------------------------------
    { kit: 'savepoint', at: [40, 40], id: 'bw-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [37.5, 38.5] },
    { kit: 'bush', at: [42.4, 41.6], scale: 1.3, seed: 7 },
    // Dropped by somebody the Yards could not goad, in the last green before
    // the wold turns north and stops offering a way back.
    { kit: 'chest', at: [37.5, 41.5], id: 'bw-chest-10',
      contains: { kind: 'item', id: 'bloodingplate', count: 1, label: 'a suit of Blooding Plate' } },
    { kit: 'signpost', at: [42.4, 38.4], id: 'bw-mark-1',
      interact: { name: 'Cut Bough', text: [
        'A bough cut clean through at shoulder height, the cut long healed over.',
        'Whoever cut it was marking the way in. There is no mark on the far side.',
      ] } },

    // --- green four, and the second blind spur --------------------------------
    { kit: 'lamppost', at: [40, 25.5] },
    { kit: 'chest', at: [42.5, 24], id: 'bw-chest-4',
      contains: { kind: 'item', id: 'bramblecoat', count: 1, label: 'a Bramble Coat' } },
    { kit: 'bush', at: [37.5, 22.5], scale: 1.1, seed: 9 },
    { kit: 'chest', at: [39.5, 16.5], id: 'bw-chest-5',
      contains: { kind: 'item', id: 'longlookveil', count: 1, label: 'a Long Look Veil' } },

    // --- green five -----------------------------------------------------------
    { kit: 'savepoint', at: [24, 24], id: 'bw-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'tree', at: [21.5, 22.5], kind: 'dead', scale: 1.3, seed: 11 },
    { kit: 'lamppost', at: [26.5, 25.5] },
    // The middle green, and the one thing in the wold that is still moving in
    // a straight line.
    { kit: 'signpost', at: [26.5, 22.5], id: 'bw-longhand',
      interact: { prompt: 'The sweep in the grass', event: 'thelonghand' } },

    // --- green six ------------------------------------------------------------
    { kit: 'lamppost', at: [10.5, 25.5] },
    { kit: 'chest', at: [5.5, 24], id: 'bw-chest-6',
      contains: { kind: 'item', id: 'greenhood', count: 1, label: 'a Greenmother\'s Hood' } },
    { kit: 'bush', at: [9.4, 22.6], scale: 1.2, seed: 13 },
    // The hood is in this green because the wood grew it here. So is the rest
    // of the set.
    { kit: 'chest', at: [8.5, 20.5], id: 'bw-chest-9',
      contains: { kind: 'item', id: 'greenmotherclaws', count: 1, label: 'a set of Greenmother\'s Claws' } },

    // --- green seven ----------------------------------------------------------
    { kit: 'lamppost', at: [8, 10.5] },
    { kit: 'signpost', at: [5.6, 7.4], id: 'bw-mark-2',
      interact: { name: 'Cut Bough', text: [
        'The same cut, the same healed-over scar, at the same height.',
        'It faces the way you are going, which means it was cut by somebody who',
        'came the way you came and never turned round either.',
      ] } },
    { kit: 'chest', at: [10.5, 5.5], id: 'bw-chest-7',
      contains: { kind: 'item', id: 'thawwine', count: 4, label: '4 flasks of Thaw Wine' } },
    // A bell that is rung here and heard somewhere else, which is the one thing
    // a wood that never lets you look back is well suited to hiding.
    { kit: 'signpost', at: [10.5, 8.5], id: 'bw-latebell',
      interact: { prompt: 'The sound with nothing making it', event: 'thelatebell' } },

    // --- green eight ----------------------------------------------------------
    { kit: 'savepoint', at: [24, 8], id: 'bw-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The blooding gate at the bottom of the Oxmere drove: two posts in the
    // thorn with a gate hung between them, and the hinges greased.
    { kit: 'fence', at: [27.4, 6.6], arg: 4, radius: 0, id: 'bw-bloodinggate',
      interact: { prompt: 'The blooding gate', event: 'bramblewold_yardmaster' } },
    { kit: 'lamppost', at: [21.5, 5.5] },
    { kit: 'tree', at: [26.5, 10.5], kind: 'dead', scale: 1.2, seed: 15 },

    // --- green nine: the far end, and the only corners in the wold ------------
    { kit: 'savepoint', at: [37.5, 10.5], id: 'bw-save-5', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The far end, which is the only end, and the address the Briar King's
    // magicite is recorded at. The stone beside it keeps the description.
    { kit: 'well', at: [40.5, 7.5], id: 'bw-ninth', radius: 1.1, interactRadius: 2.4,
      interact: { prompt: 'The Ninth Green', event: 'theunwinding' } },
    { kit: 'signpost', at: [38.5, 5.5], id: 'bw-ninth-stone',
      interact: { name: 'The Ninth Green', text: [
        'A clearing cut square, with a well in it and a bench beside the well.',
        'The briar stops dead at the edge of the paving and will not come over it.',
        'Behind you the wold is one unbroken wall, and there is no slot in it.',
      ] } },
    { kit: 'bench', at: [43.0, 7.5], rot: 1.57 },
    { kit: 'lamppost', at: [36.5, 4.5] },
    { kit: 'lamppost', at: [43.5, 4.5] },
    { kit: 'chest', at: [43.5, 10.5], id: 'bw-chest-8',
      contains: { kind: 'item', id: 'megalixir', count: 3, label: '3 Megalixirs' } },
  ],

  npcs: [],
};
