/**
 * The Last Lantern — a road that keeps taking width away from you.
 *
 * There are no turnings. From the gate to the lamp room it is one straight line
 * sixty rows long, and the only thing that happens on it is that it gets
 * narrower: twenty-four paces across at the gate, then twenty, sixteen, twelve,
 * eight, six, four, and at the very end two. Every step down is dead symmetric
 * about the same axis, so the walls come in evenly from both sides and the
 * player has no sense of being pushed to one side of anything — only of the
 * world closing to a point directly in front of them.
 *
 * The bays go the same way. There are four of them, one off each of the wide
 * bands, and there are none at all below twelve paces. The road stops having
 * anything to offer at exactly the moment it stops having room, and a player
 * who has been checking the sides for treasure will feel that stop as clearly
 * as they feel the walls.
 *
 * So do the lanterns. They are two paces apart at the gate and forty paces
 * apart at the end, and there is a long stretch of the four-pace band with none
 * on it at all. Then the road opens, once, into a room ten paces by five, with
 * one lantern burning in it. That lantern is the only thing this dungeon is
 * about, and the entire approach exists to make it legible from a very long way
 * off and to take a very long time to reach.
 *
 * Rows use the same run-length notation as the other dungeons.
 */

const W = 36;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[lastlantern] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 36)),
  // --- the lamp room: ten paces by five, and the end of the road -----------
  /*  1 */ row(R('#', 13), R('M', 10), R('#', 13)),
  /*  2 */ row(R('#', 13), R('M', 10), R('#', 13)),
  /*  3 */ row(R('#', 13), R('M', 10), R('#', 13)),
  /*  4 */ row(R('#', 13), R('M', 10), R('#', 13)),
  /*  5 */ row(R('#', 13), R('M', 10), R('#', 13)),
  // --- two paces wide ------------------------------------------------------
  /*  6 */ row(R('#', 17), R('=', 2), R('#', 17)),
  /*  7 */ row(R('#', 17), R('=', 2), R('#', 17)),
  /*  8 */ row(R('#', 17), R('=', 2), R('#', 17)),
  /*  9 */ row(R('#', 17), R('=', 2), R('#', 17)),
  // --- four -----------------------------------------------------------------
  /* 10 */ row(R('#', 16), R('=', 4), R('#', 16)),
  /* 11 */ row(R('#', 16), R('=', 4), R('#', 16)),
  /* 12 */ row(R('#', 16), R('=', 4), R('#', 16)),
  /* 13 */ row(R('#', 16), R('=', 4), R('#', 16)),
  /* 14 */ row(R('#', 16), R('=', 4), R('#', 16)),
  /* 15 */ row(R('#', 16), R('=', 4), R('#', 16)),
  // --- six ------------------------------------------------------------------
  /* 16 */ row(R('#', 15), R('=', 6), R('#', 15)),
  /* 17 */ row(R('#', 15), R('=', 6), R('#', 15)),
  /* 18 */ row(R('#', 15), R('=', 6), R('#', 15)),
  /* 19 */ row(R('#', 15), R('=', 6), R('#', 15)),
  /* 20 */ row(R('#', 15), R('=', 6), R('#', 15)),
  /* 21 */ row(R('#', 15), R('=', 6), R('#', 15)),
  /* 22 */ row(R('#', 15), R('=', 6), R('#', 15)),
  // --- eight ----------------------------------------------------------------
  /* 23 */ row(R('#', 14), R('=', 8), R('#', 14)),
  /* 24 */ row(R('#', 14), R('=', 8), R('#', 14)),
  /* 25 */ row(R('#', 14), R('=', 8), R('#', 14)),
  /* 26 */ row(R('#', 14), R('=', 8), R('#', 14)),
  /* 27 */ row(R('#', 14), R('=', 8), R('#', 14)),
  /* 28 */ row(R('#', 14), R('=', 8), R('#', 14)),
  /* 29 */ row(R('#', 14), R('=', 8), R('#', 14)),
  // --- twelve, and the last bay ---------------------------------------------
  /* 30 */ row(R('#', 12), R('=', 12), R('#', 12)),
  /* 31 */ row(R('#', 12), R('=', 12), R('#', 12)),
  /* 32 */ row(R('#', 12), R('=', 16), R('#', 8)),
  /* 33 */ row(R('#', 12), R('=', 16), R('#', 8)),
  /* 34 */ row(R('#', 12), R('=', 16), R('#', 8)),
  /* 35 */ row(R('#', 12), R('=', 12), R('#', 12)),
  /* 36 */ row(R('#', 12), R('=', 12), R('#', 12)),
  // --- sixteen --------------------------------------------------------------
  /* 37 */ row(R('#', 10), R('=', 16), R('#', 10)),
  /* 38 */ row(R('#', 10), R('=', 16), R('#', 10)),
  /* 39 */ row(R('#', 6), R('=', 20), R('#', 10)),
  /* 40 */ row(R('#', 6), R('=', 20), R('#', 10)),
  /* 41 */ row(R('#', 6), R('=', 20), R('#', 10)),
  /* 42 */ row(R('#', 10), R('=', 16), R('#', 10)),
  /* 43 */ row(R('#', 10), R('=', 16), R('#', 10)),
  // --- twenty ---------------------------------------------------------------
  /* 44 */ row(R('#', 8), R('=', 20), R('#', 8)),
  /* 45 */ row(R('#', 8), R('=', 20), R('#', 8)),
  /* 46 */ row(R('#', 8), R('=', 24), R('#', 4)),
  /* 47 */ row(R('#', 8), R('=', 24), R('#', 4)),
  /* 48 */ row(R('#', 8), R('=', 24), R('#', 4)),
  /* 49 */ row(R('#', 8), R('=', 20), R('#', 8)),
  /* 50 */ row(R('#', 8), R('=', 20), R('#', 8)),
  // --- twenty-four: the width of the road where it leaves the world ---------
  /* 51 */ row(R('#', 6), R('=', 24), R('#', 6)),
  /* 52 */ row(R('#', 6), R('=', 24), R('#', 6)),
  /* 53 */ row(R('#', 2), R('=', 28), R('#', 6)),
  /* 54 */ row(R('#', 2), R('=', 28), R('#', 6)),
  /* 55 */ row(R('#', 2), R('=', 28), R('#', 6)),
  /* 56 */ row(R('#', 6), R('=', 24), R('#', 6)),
  /* 57 */ row(R('#', 6), R('=', 24), R('#', 6)),
  // --- the gate --------------------------------------------------------------
  /* 58 */ row(R('#', 16), R('=', 4), R('#', 16)),
  /* 59 */ row(R('#', 16), R('=', 4), R('#', 16)),
];

export const LAST_LANTERN = {
  id: 'lastlantern',
  name: 'The Last Lantern',
  subtitle: 'Twenty-Four Paces to Two',
  kind: 'dungeon',
  light: 'void',
  grade: 'void',
  fog: ['#171326', 16, 74],
  tilt: 0.42,
  cameraDistance: 16,
  cameraPitch: 0.64,
  music: 'ruins',
  base: 'cobble',
  groundRamp: 'cave',
  wallHeight: 10,
  wallMaterial: 'stone',
  // There is no sky over this road and no light on it but the lanterns, so they
  // have to burn hard and reach a long way.
  lampIntensity: 11,
  lampRange: 16,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [18, 58], face: 'north' },
    world: { at: [18, 58], face: 'north' },
  },

  exits: [
    { at: [16, 59], size: [4, 1], to: 'overworld', spawn: 'lastlantern',
      prompt: 'Leave the road' },
  ],

  // The road is one line and everything on it is passed through, so nothing
  // here is tripped over. All three scripted things are examined.
  triggers: [],

  /**
   * The road narrows and the table changes at every step down, because that is
   * the only thing this map does and the encounters ought to do it too. Each
   * width band is one region: the shelf at twenty-four and twenty paces, the
   * Quench at sixteen and twelve, the Silence at eight and six, and the two
   * Overwind tables on the four- and two-pace stretches where the road has
   * stopped having room to offer anything. The band a player is standing in is
   * legible from the walls, which makes this the one place in the world where
   * the difficulty is drawn rather than described.
   *
   * The lamp room is deliberately left to the map's own table below. It is the
   * end of the road and it is where the six hunts are.
   */
  encounterZones: [
    { rect: [0, 51, 36, 9], table: 'aether_shelf' },        // twenty-four paces
    { rect: [0, 44, 36, 7], table: 'aether_shelf_inner' },  // twenty
    { rect: [0, 37, 36, 7], table: 'quench_flats' },        // sixteen
    { rect: [0, 30, 36, 7], table: 'quench_pits' },         // twelve
    { rect: [0, 23, 36, 7], table: 'long_silence' },        // eight
    { rect: [0, 16, 36, 7], table: 'long_silence_edge' },   // six
    { rect: [0, 10, 36, 6], table: 'overwind_road' },       // four
    { rect: [0, 6, 36, 4], table: 'overwind_far' },         // two
  ],

  // The last six groups are the hunts, and they are only ever rolled in the
  // lamp room, which is the one place on this road with anything in it.
  encounters: {
    rate: 24, terrain: 'cobble', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['quietingbell', 'tithewisp', 'tithewisp'] },
      { weight: 24, enemies: ['theauditor', 'emptyvessel'] },
      { weight: 20, enemies: ['unlitmoth', 'mendicant'] },
      { weight: 18, enemies: ['blankface', 'hollowchoir'] },
      { weight: 12, enemies: ['thecollector', 'quietengine'] },
      { weight: 3, enemies: ['theslakingpit'] },
      { weight: 3, enemies: ['thetemper'] },
      { weight: 2, enemies: ['thecoldforge'] },
      { weight: 2, enemies: ['theovertaking'] },
      { weight: 2, enemies: ['thelongrun'] },
      { weight: 1, enemies: ['theoverwind'] },
    ],
  },

  props: [
    // --- twenty-four paces: the lanterns are two apart here -------------------
    { kit: 'savepoint', at: [18, 56], id: 'll-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [15.4, 55.6], id: 'll-milepost',
      interact: { name: 'The First Post', text: [
        'A milepost at the head of the road, cut with a single line of numbers.',
        '24 20 16 12 8 6 4 2 1',
        'There is no distance beside any of them. They are not distances.',
      ] } },
    { kit: 'lamppost', at: [8.5, 56.5] },
    { kit: 'lamppost', at: [27.5, 56.5] },
    { kit: 'lamppost', at: [10.5, 53.5] },
    { kit: 'lamppost', at: [25.5, 53.5] },
    { kit: 'lamppost', at: [12.5, 51.5] },
    { kit: 'lamppost', at: [23.5, 51.5] },
    { kit: 'chest', at: [3.5, 54.5], id: 'll-chest-1',
      contains: { kind: 'item', id: 'lanternoil', count: 5, label: '5 flasks of Lantern Oil' } },
    { kit: 'crate', at: [4.6, 53.4], rot: 0.3 },

    // --- twenty ----------------------------------------------------------------
    { kit: 'lamppost', at: [10.5, 49.5] },
    { kit: 'lamppost', at: [25.5, 49.5] },
    { kit: 'lamppost', at: [12.5, 45.5] },
    { kit: 'lamppost', at: [23.5, 45.5] },
    { kit: 'chest', at: [30.5, 47.5], id: 'll-chest-2',
      contains: { kind: 'item', id: 'ninefoldcharm', count: 1, label: 'a Ninefold Charm' } },
    { kit: 'barrel', at: [29.4, 46.4] },
    // A bay wide enough to queue in, and the last one on the road that is.
    { kit: 'signpost', at: [28.5, 47.5], id: 'll-almshouse',
      interact: { prompt: 'The queue in the bay', event: 'theopenhand' } },
    // A bay cut square into the west wall at twenty paces, with a hearth in the
    // back of it that has never had a fire in it.
    { kit: 'signpost', at: [8.6, 46.4], id: 'll-coldforge',
      interact: { prompt: 'The bay at twenty paces', event: 'lastlantern_cold_forge' } },
    { kit: 'chest', at: [10.5, 47.5], id: 'll-chest-9',
      contains: { kind: 'item', id: 'bothhands', count: 1, label: 'Both Hands' } },

    // --- sixteen ---------------------------------------------------------------
    { kit: 'savepoint', at: [18, 42], id: 'll-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [12.5, 42.5] },
    { kit: 'lamppost', at: [23.5, 42.5] },
    { kit: 'lamppost', at: [14.5, 37.5] },
    { kit: 'chest', at: [7.5, 40.5], id: 'll-chest-3',
      contains: { kind: 'item', id: 'vigilrobe', count: 1, label: 'a Vigil Robe' } },

    // --- twelve, and the last bay ----------------------------------------------
    { kit: 'lamppost', at: [13.5, 34.5] },
    { kit: 'lamppost', at: [22.5, 31.5] },
    { kit: 'chest', at: [25.5, 33.5], id: 'll-chest-4',
      contains: { kind: 'item', id: 'vesperstaff', count: 1, label: 'a Vesper Staff' } },
    { kit: 'signpost', at: [15.4, 30.6], id: 'll-lastbay',
      interact: { name: 'The Last Bay', text: [
        'A bay cut into the west wall, and the last one the road has room for.',
        'Someone has scratched a line under the numbers on the post outside it.',
        'BELOW TWELVE THERE IS NOWHERE TO PUT ANYTHING DOWN.',
      ] } },
    // The one thing on this road that was ever collected, still bolted to the
    // floor of the last bay with room to bolt anything to.
    { kit: 'signpost', at: [21.5, 32.5], id: 'll-tithebox',
      interact: { prompt: 'The bolted box', event: 'thetithe' } },
    { kit: 'chest', at: [15.5, 32.5], id: 'll-chest-10',
      contains: { kind: 'item', id: 'overwindrod', count: 1, label: 'an Overwind Rod' } },

    // --- eight -------------------------------------------------------------------
    { kit: 'lamppost', at: [15.5, 28.5] },
    { kit: 'savepoint', at: [18, 24], id: 'll-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [20.5, 26.5], id: 'll-chest-5',
      contains: { kind: 'item', id: 'unbrokenoath', count: 1, label: 'an Unbroken Oath' } },
    { kit: 'chest', at: [15.5, 24.5], id: 'll-chest-11',
      contains: { kind: 'item', id: 'overwindchakram', count: 1, label: 'an Overwind Chakram' } },

    // --- six, then four: the road goes dark --------------------------------------
    { kit: 'lamppost', at: [16.5, 21.5] },
    { kit: 'chest', at: [19.5, 17.5], id: 'll-chest-6',
      contains: { kind: 'item', id: 'mantleofnine', count: 1, label: 'the Mantle of Nine' } },
    { kit: 'chest', at: [16.5, 20.5], id: 'll-chest-12',
      contains: { kind: 'item', id: 'stillfold', count: 1, label: 'the Still Fold' } },
    { kit: 'chest', at: [18.5, 12.5], id: 'll-chest-13',
      contains: { kind: 'item', id: 'quenchgauntlets', count: 1, label: 'a pair of Quench Gauntlets' } },
    { kit: 'signpost', at: [17.4, 14.6], id: 'll-darkpost',
      interact: { name: 'The Unlit Post', text: [
        'A lantern bracket with no lantern in it, and no sign there ever was one.',
        'From here to the end of the road there are no brackets at all.',
      ] } },

    // --- two -----------------------------------------------------------------------
    { kit: 'savepoint', at: [18, 8], id: 'll-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [17.5, 7.5], id: 'll-chest-14',
      contains: { kind: 'item', id: 'quenchbrand', count: 1, label: 'the Quenchbrand' } },

    // --- the lamp room ---------------------------------------------------------------
    { kit: 'lamppost', at: [17.5, 2.5] },
    // The end of the road, and the address the Last Lantern's magicite is
    // recorded at: the small room at the end. What is holding the banner up in
    // here is what has been filling the lantern. The bracket keeps the
    // description of the room.
    { kit: 'signpost', at: [20.4, 3.4], id: 'll-lantern',
      interact: { prompt: 'The Last Lantern', event: 'bannerofthenine' } },
    { kit: 'signpost', at: [16.5, 4.5], id: 'll-lantern-bracket',
      interact: { name: 'The Last Lantern', text: [
        'One lantern on one bracket in a room ten paces by five, and it is lit.',
        'Somebody has been filling it. The road behind you is twenty-four paces',
        'wide where it leaves the world and two paces wide where it arrives here,',
        'and nobody has walked it in a very long time.',
      ] } },
    { kit: 'chest', at: [19.5, 4.5], id: 'll-chest-15',
      contains: { kind: 'item', id: 'wellheart', count: 1, label: 'a Well Heart' } },
    { kit: 'chest', at: [14.5, 4.5], id: 'll-chest-7',
      contains: { kind: 'item', id: 'ninthlanternstaff', count: 1, label: 'the Ninth Lantern Staff' } },
    { kit: 'chest', at: [21.5, 1.5], id: 'll-chest-8',
      contains: { kind: 'item', id: 'lanternheart', count: 1, label: 'a Lantern Heart' } },
    { kit: 'bench', at: [14.5, 2.0] },
  ],

  // The one person on this road. She has been filling the lamp every ninth day
  // for eleven years because Tunn handed her the can, and the posts outside
  // count down to where she is standing.
  npcs: [
    {
      id: 'll-hesper', name: 'Hesper Cawl', at: [18.0, 3.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.66, hair: 'bob', expression: 'neutral',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#38224f', accent: '#ffd76a',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      event: 'lastlantern_office',
      talk: [
        'Every ninth day, a measure and a half of oil, and the wick trimmed square and not slanted.',
      ],
    },
  ],
};
