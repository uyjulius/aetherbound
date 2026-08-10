/**
 * The Long Barrow — one corridor, eighty rows long, and eighteen doors.
 *
 * There is nothing to navigate here. The corridor runs dead straight from the
 * porch to the head chamber, three paces wide the whole way, and it does not
 * fork, bend, branch, rise or double back once in eighty rows. A player who
 * simply holds north walks the entire dungeon. There is no map to learn and
 * nothing to solve, and that is the design: every single decision this place
 * asks for is the same decision, asked eighteen times.
 *
 * Which cell do you open?
 *
 * The cells alternate, west and east, four rows out of step so that no two
 * doors ever face each other and the corridor never shows you two at once. You
 * come level with a doorway, and the only thing you can see is how deep the
 * cell goes. Thirteen of them are eight paces deep and turn black two steps in.
 * Four are only four paces deep, and can be read whole from the corridor
 * without going in at all — and those shallow ones are, deliberately, neither
 * consistently the safe ones nor consistently the empty ones. The one thing
 * the barrow will not do is let the player build a rule.
 *
 * So the cost of the dungeon is entirely elective. Everything in it — every
 * chest, both of the two save points on the run, every stone worth reading —
 * is behind a door that can be walked past, and the encounter table gets worse
 * the further up the corridor you go. The player who opens nothing arrives at
 * the head chamber quickly and badly under-equipped. The player who opens
 * everything walks four times the distance. Both of those are correct.
 *
 * Rows use the same run-length notation as the other dungeons.
 */

const W = 27;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[thelongbarrow] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Columns: 0-1 rock | 2-9 west cells | 10-11 wall | 12-14 corridor |
//          15-16 wall | 17-24 east cells | 25-26 rock
//
// West cells begin on rows 10, 18, 26, 34, 42, 50, 58, 66 and 74.
// East cells begin on rows 14, 22, 30, 38, 46, 54, 62, 70 and 78.
// Each is six rows deep with its doorway on the middle two, so the doors are
// four rows out of step and no two are ever in shot together.
// The shallow cells — west 26 and 58, east 30 and 70 — stop four paces in.

const TERRAIN = [
  /*  0 */ row(R('#', 27)),
  /*  1 */ row(R('#', 27)),
  // --- the head of the barrow ----------------------------------------------
  /*  2 */ row(R('#', 2), R('C', 23), R('#', 2)),
  /*  3 */ row(R('#', 2), R('C', 23), R('#', 2)),
  /*  4 */ row(R('#', 2), R('C', 23), R('#', 2)),
  /*  5 */ row(R('#', 2), R('C', 23), R('#', 2)),
  /*  6 */ row(R('#', 2), R('C', 23), R('#', 2)),
  // --- the corridor begins, and does not turn again ------------------------
  /*  7 */ row(R('#', 12), R(',', 3), R('#', 12)),
  /*  8 */ row(R('#', 12), R(',', 3), R('#', 12)),
  /*  9 */ row(R('#', 12), R(',', 3), R('#', 12)),
  // cell 1, west
  /* 10 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 12)),
  /* 11 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 12)),
  /* 12 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  /* 13 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  // cell 2, east
  /* 14 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 15 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 16 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  /* 17 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  // cell 3, west
  /* 18 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 19 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 20 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  /* 21 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  // cell 4, east
  /* 22 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 23 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 24 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  /* 25 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  // cell 5, west — shallow, and readable from the doorway
  /* 26 */ row(R('#', 6), R('C', 4), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 27 */ row(R('#', 6), R('C', 4), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 28 */ row(R('#', 6), R('C', 4), R(',', 5), R('#', 12)),
  /* 29 */ row(R('#', 6), R('C', 4), R(',', 5), R('#', 12)),
  // cell 6, east — shallow
  /* 30 */ row(R('#', 6), R('C', 4), R('#', 2), R(',', 3), R('#', 2), R('C', 4), R('#', 6)),
  /* 31 */ row(R('#', 6), R('C', 4), R('#', 2), R(',', 3), R('#', 2), R('C', 4), R('#', 6)),
  /* 32 */ row(R('#', 12), R(',', 5), R('C', 4), R('#', 6)),
  /* 33 */ row(R('#', 12), R(',', 5), R('C', 4), R('#', 6)),
  // cell 7, west
  /* 34 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 4), R('#', 6)),
  /* 35 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 4), R('#', 6)),
  /* 36 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  /* 37 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  // cell 8, east
  /* 38 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 39 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 40 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  /* 41 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  // cell 9, west
  /* 42 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 43 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 44 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  /* 45 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  // cell 10, east
  /* 46 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 47 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 48 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  /* 49 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  // cell 11, west
  /* 50 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 51 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 52 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  /* 53 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  // cell 12, east
  /* 54 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 55 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 56 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  /* 57 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  // cell 13, west — shallow
  /* 58 */ row(R('#', 6), R('C', 4), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 59 */ row(R('#', 6), R('C', 4), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 60 */ row(R('#', 6), R('C', 4), R(',', 5), R('#', 12)),
  /* 61 */ row(R('#', 6), R('C', 4), R(',', 5), R('#', 12)),
  // cell 14, east
  /* 62 */ row(R('#', 6), R('C', 4), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 63 */ row(R('#', 6), R('C', 4), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 64 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  /* 65 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  // cell 15, west
  /* 66 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 67 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 68 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  /* 69 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  // cell 16, east — shallow
  /* 70 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 4), R('#', 6)),
  /* 71 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 4), R('#', 6)),
  /* 72 */ row(R('#', 12), R(',', 5), R('C', 4), R('#', 6)),
  /* 73 */ row(R('#', 12), R(',', 5), R('C', 4), R('#', 6)),
  // cell 17, west
  /* 74 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 4), R('#', 6)),
  /* 75 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 4), R('#', 6)),
  /* 76 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  /* 77 */ row(R('#', 2), R('C', 8), R(',', 5), R('#', 12)),
  // cell 18, east
  /* 78 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 79 */ row(R('#', 2), R('C', 8), R('#', 2), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 80 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  /* 81 */ row(R('#', 12), R(',', 5), R('C', 8), R('#', 2)),
  /* 82 */ row(R('#', 12), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 83 */ row(R('#', 12), R(',', 3), R('#', 2), R('C', 8), R('#', 2)),
  /* 84 */ row(R('#', 12), R(',', 3), R('#', 12)),
  /* 85 */ row(R('#', 12), R(',', 3), R('#', 12)),
  /* 86 */ row(R('#', 12), R(',', 3), R('#', 12)),
  // --- the porch -----------------------------------------------------------
  /* 87 */ row(R('#', 8), R(',', 11), R('#', 8)),
  /* 88 */ row(R('#', 8), R(',', 11), R('#', 8)),
  /* 89 */ row(R('#', 8), R(',', 11), R('#', 8)),
  // --- the way out ---------------------------------------------------------
  /* 90 */ row(R('#', 11), R(',', 4), R('#', 12)),
  /* 91 */ row(R('#', 11), R(',', 4), R('#', 12)),
];

export const THE_LONG_BARROW = {
  id: 'thelongbarrow',
  name: 'The Long Barrow',
  subtitle: 'Eighteen Doors',
  kind: 'dungeon',
  light: 'cave',
  grade: 'ruin',
  fog: ['#241d18', 15, 60],
  tilt: 0.40,
  cameraDistance: 15,
  cameraPitch: 0.66,
  music: 'reach_south',
  base: 'dirt',
  groundRamp: 'cave',
  // Low. A barrow is a roofed trench, not a hall, and the ceiling should be
  // visible in shot the whole way down the corridor.
  wallHeight: 6,
  wallMaterial: 'stone',
  lampIntensity: 10,
  lampRange: 11,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [13, 89], face: 'north' },
    world: { at: [13, 89], face: 'north' },
  },

  exits: [
    { at: [11, 91], size: [4, 1], to: 'eastreach', spawn: 'longbarrow_porch',
      prompt: 'Leave the barrow' },
  ],

  triggers: [],

  // The corridor is one straight line and the table gets worse the further
  // along it you are, which is the only pressure the map applies to the choice
  // it keeps asking. The head end — everything north of row 30 — is left out
  // of both zones so it falls through to the map's own table, where the hunts
  // are.
  encounterZones: [
    { rect: [0, 60, 27, 32], table: 'kindly_ground' },            // the first third
    { rect: [0, 30, 27, 30], table: 'kindly_ground_barrows' },    // the middle
  ],

  encounters: {
    rate: 26, terrain: 'dirt', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['cerementspinner', 'shalestalker'] },
      { weight: 22, enemies: ['deadweight', 'spallmoth', 'spallmoth'] },
      { weight: 18, enemies: ['charnelhound', 'charnelhound'] },
      { weight: 16, enemies: ['chalkwight', 'cerementspinner'] },
      { weight: 12, enemies: ['thegravedigger'] },
      { weight: 3, enemies: ['thekindlyone'] },
      { weight: 2, enemies: ['thebutchersbill'] },
    ],
  },

  props: [
    // --- the porch -----------------------------------------------------------
    { kit: 'savepoint', at: [13.5, 88.5], id: 'lb-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [10.5, 88.5], id: 'lb-porch',
      interact: { name: 'The Porch Stone', text: [
        'A stone set upright in the porch, cut in an old alphabet and read out',
        'below by a later hand: EIGHTEEN LIE HERE AND ONE DOES NOT.',
        'Under that, in charcoal, someone has been counting: 18 DOORS. 4 SHALLOW.',
        'NO PATTERN. I LOOKED.',
      ] } },
    { kit: 'lamppost', at: [16.5, 88.5] },
    { kit: 'crate', at: [9.5, 88.5], rot: 0.4 },

    // --- the corridor: lamps alternate sides, one to a cell ------------------
    { kit: 'lamppost', at: [14.5, 82.5] },
    { kit: 'lamppost', at: [12.5, 74.5] },
    { kit: 'lamppost', at: [14.5, 66.5] },
    { kit: 'lamppost', at: [12.5, 58.5] },
    { kit: 'lamppost', at: [14.5, 50.5] },
    { kit: 'lamppost', at: [12.5, 42.5] },
    { kit: 'lamppost', at: [14.5, 34.5] },
    { kit: 'lamppost', at: [12.5, 26.5] },
    { kit: 'lamppost', at: [14.5, 18.5] },
    { kit: 'lamppost', at: [13.5, 8.5] },
    { kit: 'signpost', at: [12.5, 12.5], id: 'lb-lintel-1',
      interact: { name: 'A Cut Lintel', text: [
        'The stone over this doorway carries a name, or a rank, or a debt — it is',
        'the same three characters that are over every other door in the barrow,',
        'and nobody living reads them.',
      ] } },
    { kit: 'signpost', at: [14.5, 72.5], id: 'lb-lintel-2',
      interact: { name: 'A Cut Lintel', text: [
        'The same three characters. This door is four paces deep and you can see',
        'the back wall of it from where you are standing.',
        'It has been cut shallow on purpose. There is no telling why.',
      ] } },

    // --- the eighteen cells --------------------------------------------------
    // west, row 10
    { kit: 'chest', at: [3.5, 14.5], id: 'lb-chest-1',
      contains: { kind: 'item', id: 'marrowdraught', count: 4, label: '4 Marrow Draughts' } },
    // east, row 14
    { kit: 'signpost', at: [21.5, 17.5], id: 'lb-cell-2',
      interact: { name: 'An Occupied Cell', text: [
        'Somebody is still in this one, laid out properly, hands crossed, and',
        'entirely undisturbed. It is the only cell in the barrow that is.',
      ] } },
    // west, row 18
    { kit: 'rock', at: [3.5, 19.5], scale: 1.0, seed: 3, material: 'cave' },
    { kit: 'signpost', at: [5.5, 21.5], id: 'lb-cell-3',
      interact: { name: 'An Emptied Cell', text: [
        'Emptied, and not recently. The slab is scored where something was',
        'levered off it, and the scoring goes towards the door.',
      ] } },
    // east, row 22
    { kit: 'chest', at: [23.5, 26.5], id: 'lb-chest-2',
      contains: { kind: 'item', id: 'archivistcap', count: 1, label: 'an Archivist\'s Cap' } },
    // west, row 26 — shallow
    { kit: 'chest', at: [7.5, 27.5], id: 'lb-chest-3',
      contains: { kind: 'item', id: 'kindlybalm', count: 3, label: '3 Kindly Balms' } },
    // east, row 30 — shallow, and empty
    { kit: 'rock', at: [19.5, 33.5], scale: 1.1, seed: 5, material: 'cave' },
    // west, row 34
    { kit: 'chest', at: [3.5, 38.5], id: 'lb-chest-4',
      contains: { kind: 'item', id: 'gravewardknot', count: 1, label: 'a Graveward Knot' } },
    // east, row 38
    { kit: 'chest', at: [23.5, 42.5], id: 'lb-chest-5',
      contains: { kind: 'item', id: 'vellumvestments', count: 1, label: 'a set of Vellum Vestments' } },
    // west, row 42 — empty
    { kit: 'rock', at: [4.5, 44.5], scale: 1.0, seed: 7, material: 'cave' },
    { kit: 'rock', at: [7.5, 46.5], scale: 0.9, seed: 9, material: 'cave' },
    // east, row 46 — a cell somebody camped in
    { kit: 'savepoint', at: [20.5, 49.5], id: 'lb-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'barrel', at: [22.4, 48.4] },
    // west, row 50
    { kit: 'chest', at: [3.5, 54.5], id: 'lb-chest-6',
      contains: { kind: 'item', id: 'winterlong', count: 1, label: 'a Winterlong' } },
    // east, row 54
    { kit: 'chest', at: [23.5, 58.5], id: 'lb-chest-7',
      contains: { kind: 'item', id: 'harrowfold', count: 1, label: 'a Harrowfold' } },
    // west, row 58 — shallow, and the second camp
    { kit: 'savepoint', at: [7.5, 61.5], id: 'lb-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // east, row 62 — empty
    { kit: 'rock', at: [21.5, 65.5], scale: 1.1, seed: 11, material: 'cave' },
    { kit: 'crate', at: [19.5, 66.5], rot: 0.8 },
    // west, row 66
    { kit: 'chest', at: [3.5, 70.5], id: 'lb-chest-8',
      contains: { kind: 'item', id: 'stoneheart', count: 1, label: 'a Stoneheart' } },
    // east, row 70 — shallow
    { kit: 'chest', at: [19.5, 74.5], id: 'lb-chest-9',
      contains: { kind: 'item', id: 'oathcut', count: 1, label: 'an Oathcut' } },
    // west, row 74
    { kit: 'signpost', at: [5.5, 77.5], id: 'lb-cell-17',
      interact: { name: 'A Prepared Cell', text: [
        'Cut, dressed, swept, and never used. There is nothing in it at all and',
        'there never has been. It is the last cell on the west side.',
      ] } },
    // east, row 78
    { kit: 'signpost', at: [21.5, 81.5], id: 'lb-cell-18',
      interact: { name: 'A Prepared Cell', text: [
        'The same. Cut, dressed, swept, empty. Two cells made ready at the door',
        'end of the barrow, which is where the newest work would go.',
      ] } },

    // --- the head chamber ----------------------------------------------------
    { kit: 'savepoint', at: [13.5, 5.5], id: 'lb-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The nineteenth. The corridor has exactly one end and this is standing in it.
    { kit: 'well', at: [13.5, 3.5], id: 'lb-head', radius: 1.1, interactRadius: 2.4,
      interact: { name: 'The Head of the Barrow', text: [
        'A shaft, sunk in the floor of the head chamber and lined with the same',
        'dressed stone as the cells. It is a cell, turned on its end and sunk.',
        'The lintel above it carries the same three characters, cut deeper.',
      ] } },
    { kit: 'signpost', at: [10.5, 3.5], id: 'lb-head-stone',
      interact: { name: 'The Head Stone', text: [
        'EIGHTEEN LIE HERE, again, and then the count that follows it has been',
        'chiselled out. Not weathered. Chiselled, by somebody who had a reason.',
      ] } },
    { kit: 'lamppost', at: [20.5, 3.5] },
    { kit: 'lamppost', at: [6.5, 5.5] },
    { kit: 'chest', at: [4.5, 3.5], id: 'lb-chest-10',
      contains: { kind: 'item', id: 'kindlystaff', count: 1, label: 'a Kindly Staff' } },
  ],

  npcs: [],
};
