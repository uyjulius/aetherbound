/**
 * Sootreach — a chimney entered at the top, which is a tree grown downwards.
 *
 * Everything in this dungeon is one shape drawn once. You come in at the mouth
 * of the stack, which is the only opening in the map, and go down the trunk;
 * the trunk forks into two flues, each of those forks into two, and each of
 * those forks into two again. One, two, four, eight, and at the bottom of each
 * of the eight is the hearth it was built to draw.
 *
 * The flues narrow as they multiply — six feet in the trunk, five, four, three —
 * because that is what a chimney does: it is not one passage that gets smaller,
 * it is many passages that add up to the same throat. You feel it as a squeeze
 * and it is actually a division.
 *
 * There are no loops. A chimney has no reason to have any, and this one does not
 * pretend otherwise: from the head to any hearth there is exactly one route, and
 * the only way to see a second hearth is to climb back up to the fork you shared
 * with it. Every step you take is either downstream or a decision you are
 * unmaking. The map is legible as a tree from the first fork, and a player who
 * wants everything in it will walk the whole tree and know they have, which is
 * the compensation the shape offers for having no shortcuts in it.
 *
 * The eight hearths are eight rooms of one house — a kitchen, a hall, a nursery,
 * a study — and there is no door between any of them, because the house is not
 * the map. The chimney is the map. The house is only what it happens to be
 * attached to.
 *
 * Rows use the same run-length notation as the other dungeons; a miscounted row
 * in a flue is a door between two rooms that never had one.
 */

const W = 48;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[sootreach] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Glyphs, and what they are:
//   R  the leads at the head of the stack, out in the weather
//   C  flue — soot on brick, and every passage below the head
//   o  a hearth, and the boards of the room it belongs to
//   #  brickwork

const TERRAIN = [
  // The mouth of the stack, on the roof, and the only opening this map has.
  /*  0 */ row(R('#', 21), R('R', 6), R('#', 21)),
  // The head chamber. Six feet across, and the widest the flue ever gets.
  /*  1 */ row(R('#', 18), R('R', 12), R('#', 18)),
  /*  2 */ row(R('#', 18), R('R', 12), R('#', 18)),
  /*  3 */ row(R('#', 18), R('R', 12), R('#', 18)),
  /*  4 */ row(R('#', 18), R('R', 12), R('#', 18)),
  // THE TRUNK. One flue, and everything below is downstream of it.
  /*  5 */ row(R('#', 21), R('C', 6), R('#', 21)),
  /*  6 */ row(R('#', 21), R('C', 6), R('#', 21)),
  /*  7 */ row(R('#', 21), R('C', 6), R('#', 21)),
  /*  8 */ row(R('#', 21), R('C', 6), R('#', 21)),
  /*  9 */ row(R('#', 21), R('C', 6), R('#', 21)),
  // THE FIRST FORK — the gathering gallery. Two flues out of one.
  /* 10 */ row(R('#', 11), R('C', 26), R('#', 11)),
  /* 11 */ row(R('#', 11), R('C', 26), R('#', 11)),
  /* 12 */ row(R('#', 11), R('C', 5), R('#', 16), R('C', 5), R('#', 11)),
  /* 13 */ row(R('#', 11), R('C', 5), R('#', 16), R('C', 5), R('#', 11)),
  /* 14 */ row(R('#', 11), R('C', 5), R('#', 16), R('C', 5), R('#', 11)),
  /* 15 */ row(R('#', 11), R('C', 5), R('#', 16), R('C', 5), R('#', 11)),
  /* 16 */ row(R('#', 11), R('C', 5), R('#', 16), R('C', 5), R('#', 11)),
  /* 17 */ row(R('#', 11), R('C', 5), R('#', 16), R('C', 5), R('#', 11)),
  /* 18 */ row(R('#', 11), R('C', 5), R('#', 16), R('C', 5), R('#', 11)),
  /* 19 */ row(R('#', 11), R('C', 5), R('#', 16), R('C', 5), R('#', 11)),
  // THE SECOND FORK — two galleries, and four flues out of two.
  /* 20 */ row(R('#', 5), R('C', 15), R('#', 8), R('C', 15), R('#', 5)),
  /* 21 */ row(R('#', 5), R('C', 15), R('#', 8), R('C', 15), R('#', 5)),
  // Four flues, and they never meet again.
  /* 22 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  /* 23 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  /* 24 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  /* 25 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  /* 26 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  /* 27 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  /* 28 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  /* 29 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  /* 30 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  /* 31 */ row(R('#', 5), R('C', 4), R('#', 7), R('C', 4), R('#', 8), R('C', 4), R('#', 7), R('C', 4), R('#', 5)),
  // THE THIRD FORK — four galleries, and eight flues out of four.
  /* 32 */ row(R('#', 2), R('C', 9), R('#', 2), R('C', 10), R('#', 2), R('C', 10), R('#', 2), R('C', 9), R('#', 2)),
  /* 33 */ row(R('#', 2), R('C', 9), R('#', 2), R('C', 10), R('#', 2), R('C', 10), R('#', 2), R('C', 9), R('#', 2)),
  // Eight flues, three feet across, and each one has a room under it.
  /* 34 */ row(R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2)),
  /* 35 */ row(R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2)),
  /* 36 */ row(R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2)),
  /* 37 */ row(R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2)),
  /* 38 */ row(R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2)),
  /* 39 */ row(R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2)),
  /* 40 */ row(R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2)),
  /* 41 */ row(R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 4), R('C', 3), R('#', 2), R('C', 3), R('#', 3), R('C', 3), R('#', 2)),
  // THE HEARTHS. Eight rooms of one house, and no door between any of them.
  /* 42 */ row('#', R('o', 6), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 4), '#', R('o', 4), '#'),
  /* 43 */ row('#', R('o', 6), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 4), '#', R('o', 4), '#'),
  /* 44 */ row('#', R('o', 6), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 4), '#', R('o', 4), '#'),
  /* 45 */ row('#', R('o', 6), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 4), '#', R('o', 4), '#'),
  /* 46 */ row('#', R('o', 6), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 4), '#', R('o', 4), '#'),
  /* 47 */ row('#', R('o', 6), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 4), '#', R('o', 4), '#'),
  /* 48 */ row('#', R('o', 6), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 5), '#', R('o', 4), '#', R('o', 4), '#'),
  // Below this line is the floor of the house, and the house is not the map.
  /* 49 */ row(R('#', 48)),
];

export const SOOTREACH = {
  id: 'sootreach',
  name: 'Sootreach',
  subtitle: 'One Throat, Eight Hearths',
  kind: 'dungeon',
  light: 'cave',
  grade: 'cave',
  fog: ['#241f1c', 14, 62],
  tilt: 0.44,
  cameraDistance: 15,
  cameraPitch: 0.68,
  music: 'cave',
  base: 'cave',
  groundRamp: 'cave',
  wallHeight: 12,
  wallMaterial: 'brick',
  // Nothing reaches down a flue but what you carry. Below the head chamber the
  // sconces are the only reason any of this is visible at all.
  lampIntensity: 10,
  lampRange: 13,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [24, 2], face: 'south' },
    world: { at: [24, 2], face: 'south' },
  },

  exits: [
    { at: [21, 0], size: [6, 1], to: 'overworld', spawn: 'sootreach_stackhead',
      prompt: 'Climb out of the stack' },
  ],

  triggers: [],

  /**
   * The table changes at every fork, because the draught does. What lives in a
   * chimney lives at the depth where the air stops moving, and the air stops
   * moving a little further down at each division — so the trunk is nearly
   * clean, the second fork is where things start, and the third is where they
   * are.
   *
   * The hearths are left to the map's own table below. They are the eight ends
   * of the tree, they are the only rooms in it, and they are where the hunts
   * are standing.
   */
  encounterZones: [
    { rect: [0, 0, 48, 12], table: 'brood_acre' },            // head and trunk
    { rect: [0, 12, 48, 10], table: 'aether_shelf' },         // the first fork
    { rect: [0, 22, 48, 12], table: 'aether_shelf_inner' },   // the second fork
    { rect: [0, 34, 48, 8], table: 'quench_flats' },          // the third fork
  ],

  // The last four groups are hunts, and a hearth is the only place they fit.
  encounters: {
    rate: 26, terrain: 'cave', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['quenchmoth', 'quenchmoth', 'veinmoth'] },
      { weight: 24, enemies: ['theretort', 'temperhound'] },
      { weight: 20, enemies: ['drawnwire', 'wasteweevil'] },
      { weight: 16, enemies: ['unwoundman', 'hollowchoir'] },
      { weight: 10, enemies: ['nightshift', 'thecollector'] },
      { weight: 3, enemies: ['thetemper'] },
      { weight: 3, enemies: ['thecoldforge'] },
      { weight: 2, enemies: ['theslakingpit'] },
      { weight: 2, enemies: ['thetenthwell'] },
    ],
  },

  props: [
    // --- the head of the stack -----------------------------------------------
    { kit: 'savepoint', at: [24, 3], id: 'sr-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [20.5, 2.5], id: 'sr-stackhead',
      interact: { name: 'The Stack Head', text: [
        'A brick throat six feet across with the sky behind you and soot in front.',
        'Cut into the coping, by a sweep with time on his hands:',
        'ONE, TWO, FOUR, EIGHT. COUNT THEM ON THE WAY DOWN AND YOU CANNOT GET LOST.',
      ] } },
    { kit: 'lamppost', at: [27.5, 2.5] },
    { kit: 'chest', at: [19.5, 3.5], id: 'sr-chest-1',
      contains: { kind: 'item', id: 'lanternoil', count: 6, label: '6 flasks of Lantern Oil' } },

    // --- the trunk -------------------------------------------------------------
    { kit: 'lamppost', at: [22.5, 7.5] },
    { kit: 'signpost', at: [25.5, 8.5], id: 'sr-trunk',
      interact: { name: 'The Trunk', text: [
        'Every hearth in the house is drawing through this one length of brick.',
        'Below the next fork there is no length of brick you can say that about.',
      ] } },

    // --- the first fork --------------------------------------------------------
    { kit: 'lamppost', at: [14.5, 10.5] },
    { kit: 'lamppost', at: [33.5, 10.5] },
    { kit: 'signpost', at: [18.5, 11.5], id: 'sr-fork-1',
      interact: { name: 'The Gathering Gallery', text: [
        'One flue above, two below, and the two do not touch each other again.',
        'Whichever you take, the other half of this house is behind you.',
      ] } },
    { kit: 'chest', at: [13.5, 16.5], id: 'sr-chest-2',
      contains: { kind: 'item', id: 'kilnwraps', count: 1, label: 'a pair of Kiln Wraps' } },
    { kit: 'chest', at: [34.5, 16.5], id: 'sr-chest-3',
      contains: { kind: 'item', id: 'emberward', count: 2, label: '2 Ember Wards' } },
    { kit: 'lamppost', at: [12.5, 19.5] },
    { kit: 'lamppost', at: [35.5, 19.5] },

    // --- the second fork -------------------------------------------------------
    { kit: 'savepoint', at: [8, 21], id: 'sr-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [12.5, 20.5], id: 'sr-fork-2a',
      interact: { name: 'The West Gallery', text: [
        'Two more. Four in all now, and every one of them ends at a bedroom',
        'grate or a kitchen range, and none of them is a way through.',
      ] } },
    { kit: 'savepoint', at: [40, 21], id: 'sr-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [30.5, 20.5] },
    { kit: 'lamppost', at: [6.5, 26.5] },
    { kit: 'lamppost', at: [17.5, 26.5] },
    { kit: 'lamppost', at: [29.5, 26.5] },
    { kit: 'lamppost', at: [40.5, 26.5] },
    { kit: 'chest', at: [7.5, 30.5], id: 'sr-chest-4',
      contains: { kind: 'item', id: 'pyreflask', count: 5, label: '5 Pyre Flasks' } },
    { kit: 'chest', at: [18.5, 30.5], id: 'sr-chest-5',
      contains: { kind: 'item', id: 'cinderheart', count: 1, label: 'a Cinder Heart' } },
    { kit: 'chest', at: [30.5, 30.5], id: 'sr-chest-6',
      contains: { kind: 'item', id: 'quenchward', count: 1, label: 'a Quench Ward' } },
    { kit: 'chest', at: [41.5, 30.5], id: 'sr-chest-7',
      contains: { kind: 'item', id: 'temperedash', count: 1, label: 'a Tempered Ash' } },

    // --- the third fork --------------------------------------------------------
    { kit: 'signpost', at: [6.5, 33.4], id: 'sr-fork-3a',
      interact: { name: 'The Last Gallery', text: [
        'Eight, and the sweeps stopped numbering them here because from this',
        'point on a number would not have helped anybody.',
      ] } },
    { kit: 'lamppost', at: [18.5, 33.4] },
    { kit: 'lamppost', at: [29.5, 33.4] },
    { kit: 'lamppost', at: [41.5, 33.4] },

    // --- the hearths ------------------------------------------------------------
    { kit: 'lamppost', at: [2.5, 47.5] },
    { kit: 'chest', at: [3.5, 45.5], id: 'sr-chest-8',
      contains: { kind: 'item', id: 'mountainhands', count: 1, label: 'a pair of Mountain Hands' } },
    { kit: 'signpost', at: [5.5, 44.5], id: 'sr-hearth-1',
      interact: { name: 'The Kitchen Range', text: [
        'The biggest grate in the house, and the ash in it is a foot deep and cold.',
        'Whatever ran this kitchen ran it for a very long time and then stopped.',
      ] } },
    { kit: 'lamppost', at: [9.5, 47.5] },
    { kit: 'chest', at: [10.5, 45.5], id: 'sr-chest-9',
      contains: { kind: 'item', id: 'greatbalm', count: 4, label: '4 Greater Balms' } },
    { kit: 'chest', at: [16.5, 45.5], id: 'sr-chest-10',
      contains: { kind: 'item', id: 'wardensfalchion', count: 1, label: "a Warden's Falchion" } },
    { kit: 'signpost', at: [15.5, 47.5], id: 'sr-hearth-3',
      interact: { name: 'The Nursery Grate', text: [
        'A small grate with a guard still bolted across it, on the inside.',
        'The bolts are on the room side. Somebody was keeping something in.',
      ] } },
    { kit: 'savepoint', at: [22, 47], id: 'sr-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [22.5, 45.5], id: 'sr-chest-11',
      contains: { kind: 'item', id: 'thirdfold', count: 1, label: 'The Third Fold' } },
    { kit: 'lamppost', at: [27.5, 47.5] },
    { kit: 'chest', at: [28.5, 45.5], id: 'sr-chest-12',
      contains: { kind: 'item', id: 'quenchmail', count: 1, label: 'a suit of Quench Mail' } },
    { kit: 'chest', at: [34.5, 45.5], id: 'sr-chest-13',
      contains: { kind: 'item', id: 'engineheart', count: 1, label: 'an Engine Heart' } },
    { kit: 'signpost', at: [33.5, 47.5], id: 'sr-hearth-6',
      interact: { name: 'The Study Fire', text: [
        'A book grate, and the last thing burnt in it was books.',
        'There are eight of these rooms and this is the only one that was tidied.',
      ] } },
    { kit: 'lamppost', at: [40.5, 47.5] },
    { kit: 'chest', at: [39.5, 45.5], id: 'sr-chest-14',
      contains: { kind: 'item', id: 'sovereignpanacea', count: 3, label: '3 Sovereign Panaceas' } },
    { kit: 'savepoint', at: [45, 47], id: 'sr-save-5', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [44.5, 45.5], id: 'sr-chest-15',
      contains: { kind: 'item', id: 'quenchbrand', count: 1, label: 'the Quenchbrand' } },
    { kit: 'signpost', at: [44.5, 43.5], id: 'sr-hearth-8',
      interact: { name: 'The Last Hearth', text: [
        'The eighth, and the far end of the eighth branch, and the only room in',
        'the house you cannot reach from any of the other seven.',
        'Neither can they reach it. That is what a chimney is.',
      ] } },
  ],

  npcs: [],
};
