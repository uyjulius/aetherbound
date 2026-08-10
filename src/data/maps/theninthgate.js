/**
 * The Ninth Gate — nine chambers in a row, and four gates that still work.
 *
 * The building was designed to be walked once, from the west end to the east,
 * along a processional way with nine gates opening off it in a line. That
 * route is still there, still level, still marble, and it is the first thing
 * the player sees. It is also a lie. Five of the nine gates are shut, and shut
 * for good: what is left of them is a niche in the wall three paces wide and
 * one pace deep, which you can walk into and stand in and get no further.
 *
 * So the map is really two buildings on top of each other. There is the front
 * of house — the way, the four gates that open, the ceremony — and there is
 * the back passage, a low dirt run behind all nine chambers, reached by a
 * stair at either end of the way, which is how the work was actually done and
 * how the player will actually get about. Four of the shut chambers are
 * entered from behind, through breaches in their own back wall. The remaining
 * two are entered sideways, through holes knocked between one chamber and its
 * neighbour by somebody who could not be bothered to walk round.
 *
 * The back passage is cut in two at the middle by a fall, which is what stops
 * it from simply replacing the way. It is two dead runs, not one corridor, and
 * each has to be entered from its own end of the building — so reaching the
 * fifth chamber and reaching the second chamber are journeys in opposite
 * directions from the same spot on the way.
 *
 * The ninth gate is shut. It is the last niche on the way, at the far east
 * end, and it is where the player naturally arrives and stops. Getting into
 * the ninth chamber means walking the whole way back, up the east stair,
 * along the eastern half of the back passage, and in through the hole in its
 * back wall — arriving behind the gate, looking at the inside of it.
 *
 * Rows use the same run-length notation as the other dungeons.
 */

const W = 63;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[theninthgate] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Chambers, west to east, five paces wide with a one-pace cross wall between:
//   1: cols 5-9    2: 11-15   3: 17-21   4: 23-27   5: 29-33
//   6: 35-39       7: 41-45   8: 47-51   9: 53-57
//
// Gates that open: 1, 3, 6, 8. Gates that are shut: 2, 4, 5, 7, 9.
// Breached from the back passage: 2, 5, 9.
// Broken through sideways: 4 (from 3, at col 22), 7 (from 8, at col 46).
//
// Rows: 2-8 back passage | 9-10 back wall | 11-21 chambers |
//       22-23 gate wall  | 24-29 the way  | 30-35 the porch

const TERRAIN = [
  /*  0 */ row(R('#', 63)),
  /*  1 */ row(R('#', 63)),
  // --- the back passage: the way the work was actually done ---------------
  // It is cut in two at the middle by a fall, so it is two runs, not one.
  /*  2 */ row(R('#', 2), R(',', 22), R('#', 2), R(',', 35), R('#', 2)),
  /*  3 */ row(R('#', 2), R(',', 22), R('#', 2), R(',', 35), R('#', 2)),
  /*  4 */ row(R('#', 2), R(',', 22), R('#', 2), R(',', 35), R('#', 2)),
  /*  5 */ row(R('#', 2), R(',', 22), R('#', 2), R(',', 35), R('#', 2)),
  /*  6 */ row(R('#', 2), R(',', 22), R('#', 2), R(',', 35), R('#', 2)),
  /*  7 */ row(R('#', 2), R(',', 22), R('#', 2), R(',', 35), R('#', 2)),
  /*  8 */ row(R('#', 2), R(',', 22), R('#', 2), R(',', 35), R('#', 2)),
  // --- the back wall of the chambers, breached behind the 2nd, 5th and 9th -
  /*  9 */ row(R('#', 2), R(',', 2), R('#', 8), R(',', 3), R('#', 15), R(',', 3), R('#', 21), R(',', 3), R('#', 2), R(',', 2), R('#', 2)),
  /* 10 */ row(R('#', 2), R(',', 2), R('#', 8), R(',', 3), R('#', 15), R(',', 3), R('#', 21), R(',', 3), R('#', 2), R(',', 2), R('#', 2)),
  // --- the nine chambers ---------------------------------------------------
  /* 11 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  /* 12 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  /* 13 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  /* 14 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  // the holes knocked through into the 4th and the 7th
  /* 15 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 11), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 11), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  /* 16 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 11), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 11), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  /* 17 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  /* 18 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  /* 19 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  /* 20 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  /* 21 */ row(R('#', 2), R(',', 2), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R('M', 5), R('#', 1), R(',', 2), R('#', 2)),
  // --- the gate wall: four gaps, five niches that go nowhere ---------------
  /* 22 */ row(R('#', 2), R(',', 2), R('#', 2), R('M', 3), R('#', 9), R('M', 3), R('#', 15), R('M', 3), R('#', 9), R('M', 3), R('#', 8), R(',', 2), R('#', 2)),
  /* 23 */ row(R('#', 2), R(',', 2), R('#', 2), R('M', 3), R('#', 3), R('M', 3), R('#', 3), R('M', 3), R('#', 3), R('M', 3), R('#', 3), R('M', 3), R('#', 3), R('M', 3), R('#', 3), R('M', 3), R('#', 3), R('M', 3), R('#', 3), R('M', 3), R('#', 2), R(',', 2), R('#', 2)),
  // --- the processional way ------------------------------------------------
  /* 24 */ row(R('#', 2), R('M', 59), R('#', 2)),
  /* 25 */ row(R('#', 2), R('M', 59), R('#', 2)),
  /* 26 */ row(R('#', 2), R('M', 59), R('#', 2)),
  /* 27 */ row(R('#', 2), R('M', 59), R('#', 2)),
  /* 28 */ row(R('#', 2), R('M', 59), R('#', 2)),
  /* 29 */ row(R('#', 2), R('M', 59), R('#', 2)),
  // --- the porch -----------------------------------------------------------
  /* 30 */ row(R('#', 5), R('M', 4), R('#', 54)),
  /* 31 */ row(R('#', 5), R('M', 4), R('#', 54)),
  /* 32 */ row(R('#', 3), R('M', 10), R('#', 50)),
  /* 33 */ row(R('#', 3), R('M', 10), R('#', 50)),
  /* 34 */ row(R('#', 3), R('M', 10), R('#', 50)),
  // --- the way out ---------------------------------------------------------
  /* 35 */ row(R('#', 6), R('M', 4), R('#', 53)),
];

export const THE_NINTH_GATE = {
  id: 'theninthgate',
  name: 'The Ninth Gate',
  subtitle: 'Four of Nine',
  kind: 'dungeon',
  light: 'void',
  grade: 'ruin',
  fog: ['#1e1a26', 20, 90],
  tilt: 0.34,
  cameraDistance: 18,
  cameraPitch: 0.68,
  music: 'imperium',
  base: 'marble',
  groundRamp: 'cave',
  wallHeight: 18,
  wallMaterial: 'stoneFine',
  lampIntensity: 9,
  lampRange: 14,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [7, 33], face: 'north' },
    world: { at: [7, 33], face: 'north' },
  },

  exits: [
    { at: [6, 35], size: [4, 1], to: 'eastreach', spawn: 'ninthgate_porch',
      prompt: 'Leave the gates' },
  ],

  triggers: [],

  /**
   * The zones are laid out along the building, west to east, because that is
   * the direction the whole map is built to be read in. The back passage is
   * worse than the way it serves, which is the correct relationship between a
   * ceremonial route and the corridor the staff used.
   *
   * The ninth chamber is left out of every zone. It is the one room nobody has
   * been in, it is entered from behind, and it falls through to the map's own
   * table below, which is where the three hunts are.
   */
  encounterZones: [
    { rect: [0, 24, 63, 12], table: 'long_silence' },        // the way and the porch
    { rect: [0, 11, 23, 13], table: 'long_silence' },         // chambers 1-3, west stair
    { rect: [23, 11, 18, 13], table: 'long_silence_edge' },   // chambers 4-6
    { rect: [41, 11, 11, 13], table: 'overwind_road' },       // chambers 7-8
    { rect: [58, 11, 5, 13], table: 'overwind_road' },        // the east stair
    { rect: [0, 2, 63, 9], table: 'overwind_road' },          // the back passage
  ],

  encounters: {
    rate: 34, terrain: 'marble', scenery: 'none',
    groups: [
      { weight: 24, enemies: ['theerrand', 'edgewalker'] },
      { weight: 20, enemies: ['coursinghound', 'coursinghound', 'edgewalker'] },
      { weight: 18, enemies: ['thewhirligig', 'snapwidow'] },
      { weight: 14, enemies: ['thefarrunner'] },
      { weight: 3, enemies: ['theovertaking'] },
      { weight: 2, enemies: ['thelongrun'] },
      { weight: 1, enemies: ['theoverwind'] },
    ],
  },

  props: [
    // --- the porch -----------------------------------------------------------
    { kit: 'savepoint', at: [7.5, 33.5], id: 'ng-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [10.5, 33.5], id: 'ng-porch',
      interact: { name: 'The Order of Procession', text: [
        'A bronze plate at the head of the porch, listing nine gates and the order',
        'in which they were to be passed. Somebody has gone down the list with a',
        'nail and struck out the second, the fourth, the fifth, the seventh and',
        'the ninth, and written across the bottom: GO ROUND THE BACK.',
      ] } },
    { kit: 'lamppost', at: [4.5, 33.5] },

    // --- the processional way -------------------------------------------------
    { kit: 'lamppost', at: [4.5, 26.5] },
    { kit: 'lamppost', at: [12.5, 26.5] },
    { kit: 'lamppost', at: [20.5, 26.5] },
    { kit: 'lamppost', at: [28.5, 26.5] },
    { kit: 'lamppost', at: [36.5, 26.5] },
    { kit: 'lamppost', at: [44.5, 26.5] },
    { kit: 'lamppost', at: [52.5, 26.5] },
    { kit: 'lamppost', at: [58.5, 26.5] },
    { kit: 'savepoint', at: [30.5, 28.5], id: 'ng-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The niches. Standing in one is the clearest statement this map makes.
    { kit: 'signpost', at: [13.5, 23.5], id: 'ng-niche-2',
      interact: { name: 'The Second Gate', text: [
        'Three paces wide, one pace deep, and then dressed stone. The gate was',
        'not blocked up afterwards — the wall behind it was built at the same',
        'time as the frame, by the same hands, in the same course.',
      ] } },
    { kit: 'signpost', at: [25.5, 23.5], id: 'ng-niche-4',
      interact: { name: 'The Fourth Gate', text: [
        'The same. You can put your hand on the stone where the leaf would have',
        'hung. There are no hinges, and there is no scar where hinges were.',
      ] } },
    { kit: 'signpost', at: [43.5, 23.5], id: 'ng-niche-7',
      interact: { name: 'The Seventh Gate', text: [
        'The seventh. From in here you can hear the eighth chamber through the',
        'cross wall, which means the cross wall is thinner than this one is.',
      ] } },
    { kit: 'signpost', at: [55.5, 23.5], id: 'ng-niche-9',
      interact: { name: 'The Ninth Gate', text: [
        'The end of the way, and the last of them. Deeper than the others by a',
        'hand, and the stone at the back of it is a different colour, and warm.',
        'There is a way into this chamber. It is not this.',
      ] } },

    // --- the chambers that open off the way ----------------------------------
    { kit: 'lamppost', at: [7.5, 20.5] },
    { kit: 'chest', at: [7.5, 13.5], id: 'ng-chest-1',
      contains: { kind: 'item', id: 'overwinddraught', count: 4, label: '4 Overwind Draughts' } },
    { kit: 'lamppost', at: [19.5, 13.5] },
    { kit: 'savepoint', at: [19.5, 19.5], id: 'ng-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [37.5, 20.5] },
    { kit: 'chest', at: [37.5, 13.5], id: 'ng-chest-2',
      contains: { kind: 'item', id: 'hollowglass', count: 1, label: 'a Hollow Glass' } },
    { kit: 'savepoint', at: [49.5, 19.5], id: 'ng-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [49.5, 13.5], id: 'ng-chest-3',
      contains: { kind: 'item', id: 'overwindlance', count: 1, label: 'an Overwind Lance' } },

    // --- the chambers that do not --------------------------------------------
    { kit: 'chest', at: [13.5, 13.5], id: 'ng-chest-4',
      contains: { kind: 'item', id: 'overwindcowl', count: 1, label: 'an Overwind Cowl' } },
    { kit: 'chest', at: [25.5, 19.5], id: 'ng-chest-5',
      contains: { kind: 'item', id: 'wagerstones', count: 1, label: 'a set of Wager Stones' } },
    { kit: 'signpost', at: [31.5, 13.5], id: 'ng-fifth',
      interact: { name: 'The Fifth Chamber', text: [
        'Reached from behind, through a hole somebody made in its own back wall',
        'with a pick, from the outside, working inwards. Whatever this room was',
        'for, it was emptied by people who were not allowed through the front.',
      ] } },
    { kit: 'rock', at: [30.5, 18.5], scale: 1.1, seed: 3, material: 'cave' },
    { kit: 'chest', at: [43.5, 19.5], id: 'ng-chest-6',
      contains: { kind: 'item', id: 'overwindband', count: 1, label: 'an Overwind Band' } },

    // --- the back passage ------------------------------------------------------
    { kit: 'lamppost', at: [8.5, 5.5] },
    { kit: 'lamppost', at: [20.5, 5.5] },
    { kit: 'lamppost', at: [34.5, 5.5] },
    { kit: 'lamppost', at: [48.5, 5.5] },
    { kit: 'lamppost', at: [58.5, 5.5] },
    { kit: 'lamppost', at: [2.5, 16.5] },
    { kit: 'lamppost', at: [59.5, 16.5] },
    { kit: 'signpost', at: [22.5, 5.5], id: 'ng-fall',
      interact: { name: 'The Fall', text: [
        'The back passage stops here, filled floor to roof, and starts again on',
        'the far side of it. Two runs, not one corridor — which means the fifth',
        'chamber and the second chamber are opposite journeys from the same door.',
      ] } },
    { kit: 'savepoint', at: [30.5, 5.5], id: 'ng-save-5', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'crate', at: [16.4, 6.4], rot: 0.7 },
    { kit: 'barrel', at: [17.6, 5.4] },
    { kit: 'chest', at: [50.5, 6.5], id: 'ng-chest-7',
      contains: { kind: 'item', id: 'megalixir', count: 2, label: '2 Megalixirs' } },

    // --- the ninth chamber, entered from behind ------------------------------
    { kit: 'lamppost', at: [57.5, 13.5] },
    { kit: 'signpost', at: [53.5, 13.5], id: 'ng-ninth',
      interact: { name: 'Behind the Ninth Gate', text: [
        'You come in at the back of it, and the gate is the far wall. From this',
        'side it has hinges, and a bar, and the bar is drawn. It was never shut.',
        'It was walled up on the outside, with this room left ready behind it.',
      ] } },
    { kit: 'well', at: [55.5, 15.5], id: 'ng-shaft', radius: 1.1, interactRadius: 2.4,
      interact: { name: 'The Ninth Chamber', text: [
        'A shaft in the floor, exactly where the eight other chambers have a',
        'plinth. Nothing was ever put in this room, because this room is not for',
        'putting things in. It is the one that lets something out.',
      ] } },
    { kit: 'chest', at: [55.5, 19.5], id: 'ng-chest-8',
      contains: { kind: 'item', id: 'thelongargument', count: 1, label: 'the Long Argument' } },
  ],

  npcs: [],
};
