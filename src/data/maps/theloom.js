/**
 * The Loom — a weaving hall in two halves, and the grain turns between them.
 *
 * A weaving floor is built along its work. The beams run one way, the aisles run
 * between them, and for as long as you are on that floor there is one direction
 * that means *along* and one that means *across*, and you stop noticing that you
 * know it. This building has two floors of that kind laid end to end, and their
 * grains are at right angles.
 *
 * The weft hall is five aisles running east and west. It is one continuous fold:
 * you come in at the roof stair, take the first aisle east to the crossing at the
 * far end, come back west along the second, go east along the third, and so on,
 * so that the whole hall is walked as a single line doubling back on itself, and
 * the only thing that ever changes is which end of the building you are at.
 *
 * The turn is two paces wide and five long and it is the hinge of the map. You
 * go into it walking west and come out of it walking south, and on the other
 * side of it the warp hall is nine aisles running north and south, folding
 * exactly the same way about an axis rotated ninety degrees. Every reflex you
 * built in the first half is now wrong by a right angle. Players will find
 * themselves walking the length of an aisle to reach something that is four
 * paces away through a beam, which is what a weaver would have done too.
 *
 * There are four crossings this building did not intend to have. Two healds have
 * gone in the weft hall and two in the warp hall, and each one cuts a fold in
 * half. In the warp hall both of them sit on the same course as the cloth-room
 * door, so the one row that lets you cheat the grain is a single visible line
 * straight across the floor. Finding it is the reward for having read the room
 * rather than walked it.
 *
 * Rows use the same run-length notation as the other dungeons; a miscounted row
 * between two aisles is a heald nobody broke.
 */

const W = 46;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[theloom] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Glyphs, and what they are:
//   o  the boards of an aisle, worn along the grain of its own hall
//   M  the doors, the turn, and the floor of the cloth room
//   #  a beam, standing where a loom stood

const TERRAIN = [
  // The roof stair, and the only way in or out.
  /*  0 */ row(R('#', 20), R('M', 4), R('#', 22)),
  /*  1 */ row(R('#', 20), R('M', 4), R('#', 22)),
  /*  2 */ row(R('#', 20), R('M', 4), R('#', 22)),
  // THE WEFT HALL. Five aisles, all of them running east and west.
  /*  3 */ row(R('#', 2), R('o', 42), R('#', 2)),
  /*  4 */ row(R('#', 2), R('o', 42), R('#', 2)),
  // c1 — the east crossing.
  /*  5 */ row(R('#', 40), R('o', 2), R('#', 4)),
  /*  6 */ row(R('#', 40), R('o', 2), R('#', 4)),
  /*  7 */ row(R('#', 2), R('o', 42), R('#', 2)),
  /*  8 */ row(R('#', 2), R('o', 42), R('#', 2)),
  // c2 at the west end, and c5 in the middle: a heald that has gone.
  /*  9 */ row(R('#', 4), R('o', 2), R('#', 16), R('o', 2), R('#', 22)),
  /* 10 */ row(R('#', 4), R('o', 2), R('#', 16), R('o', 2), R('#', 22)),
  /* 11 */ row(R('#', 2), R('o', 42), R('#', 2)),
  /* 12 */ row(R('#', 2), R('o', 42), R('#', 2)),
  // c3 — the east crossing.
  /* 13 */ row(R('#', 40), R('o', 2), R('#', 4)),
  /* 14 */ row(R('#', 40), R('o', 2), R('#', 4)),
  /* 15 */ row(R('#', 2), R('o', 42), R('#', 2)),
  /* 16 */ row(R('#', 2), R('o', 42), R('#', 2)),
  // c4 at the west end, and c6 in the middle: the second broken heald.
  /* 17 */ row(R('#', 4), R('o', 2), R('#', 12), R('o', 2), R('#', 26)),
  /* 18 */ row(R('#', 4), R('o', 2), R('#', 12), R('o', 2), R('#', 26)),
  /* 19 */ row(R('#', 2), R('o', 42), R('#', 2)),
  /* 20 */ row(R('#', 2), R('o', 42), R('#', 2)),
  // THE TURN. Two paces wide, five paces long, and the grain changes in it.
  /* 21 */ row(R('#', 6), R('M', 2), R('#', 38)),
  /* 22 */ row(R('#', 6), R('M', 2), R('#', 38)),
  /* 23 */ row(R('#', 6), R('M', 2), R('#', 38)),
  /* 24 */ row(R('#', 6), R('M', 2), R('#', 38)),
  /* 25 */ row(R('#', 6), R('M', 2), R('#', 38)),
  // THE WARP HALL. Nine aisles, all of them running north and south, and the
  /* 26 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  // cloth room down the east side. d2, d4, d6, d8 — the north crossings.
  /* 27 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('M', 6), R('#', 2)),
  /* 28 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('M', 6), R('#', 2)),
  /* 29 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 30 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 31 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 32 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 33 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 34 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  // s1, s2 and the cloth-room door, all on one course.
  /* 35 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 6), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 6), R('#', 2), R('o', 2), R('M', 8), R('#', 2)),
  /* 36 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 6), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 6), R('#', 2), R('o', 2), R('M', 8), R('#', 2)),
  /* 37 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 38 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 39 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 40 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 41 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 42 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  // d1, d3, d5, d7 — the south crossings.
  /* 43 */ row(R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 44 */ row(R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 6), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  /* 45 */ row(R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('o', 2), R('#', 2), R('M', 6), R('#', 2)),
  // The south wall. There is no door in it.
  /* 46 */ row(R('#', 46)),
  /* 47 */ row(R('#', 46)),
];

export const THE_LOOM = {
  id: 'theloom',
  name: 'The Loom',
  subtitle: 'Two Halls at Right Angles',
  kind: 'dungeon',
  light: 'interior',
  grade: 'ruin',
  fog: ['#2a2420', 14, 70],
  tilt: 0.40,
  cameraDistance: 15,
  cameraPitch: 0.66,
  music: 'imperium',
  base: 'wood',
  groundRamp: 'interior',
  wallHeight: 8,
  wallMaterial: 'brick',
  // The clerestory went years ago and the aisle lamps are what is left. They are
  // hung one to an aisle, which is also how you count where you are.
  lampIntensity: 8,
  lampRange: 14,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [22, 2], face: 'south' },
    world: { at: [22, 2], face: 'south' },
  },

  exits: [
    { at: [20, 0], size: [4, 1], to: 'overworld', spawn: 'theloom_roofstair',
      prompt: 'Go up the roof stair' },
  ],

  triggers: [],

  /**
   * The hall gets worse the further along the work you are, which is the order
   * the cloth moved in and therefore the order everything else in here moved in
   * too. Three bands, and then the cloth room, which is left to the map's own
   * table below because it is the end of the work and it is where the hunts are.
   */
  encounterZones: [
    { rect: [0, 0, 46, 14], table: 'long_silence' },        // the first three aisles
    { rect: [0, 14, 46, 12], table: 'long_silence_edge' },  // the last two, and the turn
    { rect: [0, 26, 38, 22], table: 'overwind_road' },      // the whole warp hall
  ],

  // The last four groups are hunts, and the cloth room is the only floor in the
  // building with the space to meet one on.
  encounters: {
    rate: 26, terrain: 'marble', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['stillwidow', 'swarfspinner'] },
      { weight: 24, enemies: ['drawnwire', 'drawnwire', 'flickermoth'] },
      { weight: 20, enemies: ['springhusk', 'thecoldshut'] },
      { weight: 16, enemies: ['edgewalker', 'coursinghound'] },
      { weight: 10, enemies: ['thewhirligig', 'snapwidow'] },
      { weight: 3, enemies: ['theovertaking'] },
      { weight: 3, enemies: ['thelongrun'] },
      { weight: 2, enemies: ['theunwinding'] },
      { weight: 2, enemies: ['theoverwind'] },
    ],
  },

  props: [
    // --- the roof stair --------------------------------------------------------
    { kit: 'savepoint', at: [22, 1], id: 'tl-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [20.5, 1.5], id: 'tl-door',
      interact: { name: 'The Stair Board', text: [
        'WEFT FLOOR FIRST. WARP FLOOR THROUGH THE TURN. MIND THE GRAIN.',
        'The last three words have been gone over so many times with a thumb',
        'that the paint has come off the board around them.',
      ] } },

    // --- the weft hall ---------------------------------------------------------
    { kit: 'chest', at: [3.5, 3.5], id: 'tl-chest-1',
      contains: { kind: 'item', id: 'clarity', count: 5, label: '5 Clarity Draughts' } },
    { kit: 'signpost', at: [10.5, 3.5], id: 'tl-weft',
      interact: { name: 'The First Aisle', text: [
        'The boards are worn in one direction only, and it is the direction you',
        'are facing. On a floor like this you can walk without looking down.',
      ] } },
    { kit: 'lamppost', at: [30.5, 4.5] },
    { kit: 'chest', at: [42.5, 7.5], id: 'tl-chest-2',
      contains: { kind: 'item', id: 'overwinddraught', count: 4, label: '4 Overwind Draughts' } },
    { kit: 'lamppost', at: [15.5, 8.5] },
    { kit: 'signpost', at: [23.5, 8.5], id: 'tl-heald-1',
      interact: { name: 'A Broken Heald', text: [
        'The beam has failed here and the gap goes straight through to the next',
        'aisle. It is halfway along, which is exactly where it is worth having.',
      ] } },
    { kit: 'chest', at: [2.5, 11.5], id: 'tl-chest-3',
      contains: { kind: 'item', id: 'attuningring', count: 1, label: 'an Attuning Ring' } },
    { kit: 'lamppost', at: [33.5, 12.5] },
    { kit: 'savepoint', at: [24, 16], id: 'tl-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [42.5, 15.5], id: 'tl-chest-4',
      contains: { kind: 'item', id: 'longlookveil', count: 1, label: 'a Long Look Veil' } },
    { kit: 'lamppost', at: [30.5, 20.5] },
    { kit: 'chest', at: [42.5, 19.5], id: 'tl-chest-5',
      contains: { kind: 'item', id: 'quietstep', count: 1, label: 'a pair of Quiet Step' } },
    { kit: 'signpost', at: [9.5, 19.5], id: 'tl-turnpost',
      interact: { name: 'The Turn', text: [
        'The last aisle of the weft hall, and the door out of it is in the side',
        'wall rather than the end wall, which is the first thing this building',
        'has done that is not along the grain.',
      ] } },

    // --- the turn ---------------------------------------------------------------
    { kit: 'savepoint', at: [7, 23], id: 'tl-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [6.5, 24.6], id: 'tl-grain',
      interact: { name: 'The Grain', text: [
        'Five paces of passage, and at the far end of it the boards are running',
        'the other way. Everything you learned about this building in the last',
        'hall is now ninety degrees out.',
      ] } },

    // --- the warp hall ----------------------------------------------------------
    { kit: 'chest', at: [2.5, 26.5], id: 'tl-chest-6',
      contains: { kind: 'item', id: 'thevagrantstar', count: 1, label: 'The Vagrant Star' } },
    { kit: 'lamppost', at: [3.5, 34.5] },
    { kit: 'savepoint', at: [7, 45], id: 'tl-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [6.5, 45.5], id: 'tl-chest-7',
      contains: { kind: 'item', id: 'stillwaterwraps', count: 1, label: 'a pair of Still Water Wraps' } },
    { kit: 'chest', at: [10.5, 26.5], id: 'tl-chest-8',
      contains: { kind: 'item', id: 'hollowglass', count: 1, label: 'a Hollowglass Rod' } },
    { kit: 'lamppost', at: [11.5, 39.5] },
    { kit: 'signpost', at: [15.5, 38.5], id: 'tl-heald-2',
      interact: { name: 'The Broken Course', text: [
        'Stand here and look east along the row. Two beams have failed on this',
        'one course and so has the wall of the cloth room, and the gaps line up.',
        'Everything in this building that lets you cross the grain is on this row.',
      ] } },
    { kit: 'chest', at: [18.5, 45.5], id: 'tl-chest-9',
      contains: { kind: 'item', id: 'resonantcharm', count: 1, label: 'a Resonant Charm' } },
    { kit: 'savepoint', at: [23, 27], id: 'tl-save-5', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [22.5, 39.5] },
    { kit: 'chest', at: [26.5, 26.5], id: 'tl-chest-10',
      contains: { kind: 'item', id: 'witheringclaws', count: 1, label: 'a pair of Withering Claws' } },
    { kit: 'lamppost', at: [31.5, 32.5] },
    { kit: 'chest', at: [34.5, 44.5], id: 'tl-chest-11',
      contains: { kind: 'item', id: 'thelongargument', count: 1, label: 'The Long Argument' } },

    // --- the cloth room -----------------------------------------------------------
    { kit: 'signpost', at: [40.5, 27.5], id: 'tl-cloth',
      interact: { name: 'The Cloth Room', text: [
        'Twenty paces of room down the east side of the building, and one door',
        'into it, and the door is in the middle of a wall on the broken course.',
        'Everything this hall ever made came through that one gap sideways.',
      ] } },
    { kit: 'lamppost', at: [39.5, 30.5] },
    { kit: 'crate', at: [42.4, 29.6], rot: 0.5 },
    { kit: 'chest', at: [42.5, 31.5], id: 'tl-chest-12',
      contains: { kind: 'item', id: 'mantleofnine', count: 1, label: 'the Mantle of Nine' } },
    { kit: 'chest', at: [39.5, 28.5], id: 'tl-chest-13',
      contains: { kind: 'item', id: 'wagerstones', count: 1, label: 'a set of Wager Stones' } },
    { kit: 'bench', at: [40.0, 38.0] },
    { kit: 'lamppost', at: [42.5, 37.5] },
    { kit: 'savepoint', at: [41, 43], id: 'tl-save-6', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [39.5, 44.5], id: 'tl-chest-14',
      contains: { kind: 'item', id: 'overwindrod', count: 1, label: 'an Overwind Rod' } },
    { kit: 'chest', at: [42.5, 41.5], id: 'tl-chest-15',
      contains: { kind: 'item', id: 'stillfold', count: 1, label: 'The Still Fold' } },
  ],

  npcs: [],
};
