/**
 * The Hollowing — four closed rings, and no two entered from the same side.
 *
 * The plan is the simplest thing in the world: four square galleries, one
 * inside the next, and a small marble room at the centre of all of them. What
 * makes it a dungeon is where the four gates are. There is exactly one way
 * through each dividing wall, and no two of them are on the same side of the
 * building. You come in from the SOUTH. The way out of ring A is on the NORTH.
 * The way out of ring B is on the WEST. The way out of ring C is on the EAST.
 * The way into the middle is on the NORTH again.
 *
 * Because every ring is a *complete* circuit, the map never tells the player
 * which way round to go — both directions are open, both are lit, both look
 * identical, and one of them is right. Twice the gate is on the far side and
 * the walk is half a ring whichever way you turn; twice it is a quarter turn
 * and the wrong guess costs three times the distance. That is the whole game
 * this building plays: it never blocks you and it never lies to you, it simply
 * declines to say.
 *
 * The rings are drawn as square annuli three paces wide, which is why every
 * corner looks like every other corner and why the notch-stones at the gates
 * are the only landmarks that mean anything. Rows use the same run-length
 * notation as the other dungeons; a miscounted row in a dividing wall would
 * open a fifth gate nobody authored, and a fifth gate would undo the map.
 */

const W = 48;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[thehollowing] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Bands, identical on both axes, which is what makes the rings square:
//   0-1 rock | 2-4 ring A | 5-6 wall | 7-9 ring B | 10-11 wall |
//   12-14 ring C | 15-16 wall | 17-19 ring D | 20-21 wall |
//   22-25 the middle | 26-27 wall | 28-30 ring D | 31-32 wall |
//   33-35 ring C | 36-37 wall | 38-40 ring B | 41-42 wall |
//   43-45 ring A | 46-47 rock
//
// The gates are all four paces wide and all cut on the centre line of a side,
// so each one is exactly as far from the two corners beside it.

const TERRAIN = [
  // --- the outer rock ------------------------------------------------------
  /*  0 */ row(R('#', 48)),
  /*  1 */ row(R('#', 48)),
  // --- ring A, north leg ---------------------------------------------------
  /*  2 */ row(R('#', 2), R('C', 44), R('#', 2)),
  /*  3 */ row(R('#', 2), R('C', 44), R('#', 2)),
  /*  4 */ row(R('#', 2), R('C', 44), R('#', 2)),
  // the gate from ring A into ring B, on the NORTH side
  /*  5 */ row(R('#', 2), R('C', 3), R('#', 17), R('C', 4), R('#', 17), R('C', 3), R('#', 2)),
  /*  6 */ row(R('#', 2), R('C', 3), R('#', 17), R('C', 4), R('#', 17), R('C', 3), R('#', 2)),
  // --- ring B, north leg ---------------------------------------------------
  /*  7 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 34), R('#', 2), R('C', 3), R('#', 2)),
  /*  8 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 34), R('#', 2), R('C', 3), R('#', 2)),
  /*  9 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 34), R('#', 2), R('C', 3), R('#', 2)),
  /* 10 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 28), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 11 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 28), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  // --- ring C, north leg ---------------------------------------------------
  /* 12 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 24), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 13 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 24), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 14 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 24), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 15 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 18), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 16 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 18), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  // --- ring D, north leg ---------------------------------------------------
  /* 17 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 14), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 18 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 14), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 19 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 14), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  // the gate from ring D into the middle, on the NORTH side
  /* 20 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('M', 4), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 21 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('M', 4), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  // --- the middle, and the two side gates that stand level with it --------
  // west: ring B into ring C.  east: ring C into ring D.
  /* 22 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 8), R('#', 2), R('C', 3), R('#', 2), R('M', 4), R('#', 2), R('C', 8), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 23 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 8), R('#', 2), R('C', 3), R('#', 2), R('M', 4), R('#', 2), R('C', 8), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 24 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 8), R('#', 2), R('C', 3), R('#', 2), R('M', 4), R('#', 2), R('C', 8), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 25 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 8), R('#', 2), R('C', 3), R('#', 2), R('M', 4), R('#', 2), R('C', 8), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  // --- ring D, south leg ---------------------------------------------------
  /* 26 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 8), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 27 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 8), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 28 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 14), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 29 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 14), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 30 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 14), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 31 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 18), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 32 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 18), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  // --- ring C, south leg ---------------------------------------------------
  /* 33 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 24), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 34 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 24), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 35 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2), R('C', 24), R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 36 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 28), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  /* 37 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 3), R('#', 28), R('C', 3), R('#', 2), R('C', 3), R('#', 2)),
  // --- ring B, south leg ---------------------------------------------------
  /* 38 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 34), R('#', 2), R('C', 3), R('#', 2)),
  /* 39 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 34), R('#', 2), R('C', 3), R('#', 2)),
  /* 40 */ row(R('#', 2), R('C', 3), R('#', 2), R('C', 34), R('#', 2), R('C', 3), R('#', 2)),
  /* 41 */ row(R('#', 2), R('C', 3), R('#', 38), R('C', 3), R('#', 2)),
  /* 42 */ row(R('#', 2), R('C', 3), R('#', 38), R('C', 3), R('#', 2)),
  // --- ring A, south leg ---------------------------------------------------
  /* 43 */ row(R('#', 2), R('C', 44), R('#', 2)),
  /* 44 */ row(R('#', 2), R('C', 44), R('#', 2)),
  /* 45 */ row(R('#', 2), R('C', 44), R('#', 2)),
  // --- the way in, on the SOUTH side ---------------------------------------
  /* 46 */ row(R('#', 22), R('C', 4), R('#', 22)),
  /* 47 */ row(R('#', 22), R('C', 4), R('#', 22)),
];

export const THE_HOLLOWING = {
  id: 'thehollowing',
  name: 'The Hollowing',
  subtitle: 'Four Rings, Four Sides',
  kind: 'dungeon',
  light: 'cave',
  grade: 'cave',
  fog: ['#191a24', 18, 78],
  tilt: 0.36,
  cameraDistance: 16,
  cameraPitch: 0.70,
  music: 'dungeon',
  base: 'cave',
  groundRamp: 'cave',
  wallHeight: 12,
  wallMaterial: 'stoneFine',
  // The galleries have no openings to the outside at all, so the way-lamps at
  // the corners are the only reason the corners can be told apart.
  lampIntensity: 9,
  lampRange: 13,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [23, 46], face: 'north' },
    world: { at: [23, 46], face: 'north' },
  },

  exits: [
    { at: [22, 47], size: [4, 1], to: 'eastreach', spawn: 'hollowing_mouth',
      prompt: 'Leave the rings' },
  ],

  triggers: [],

  // One table for the whole building. The Hollowing is not a difficulty ramp
  // and pretending otherwise with zones would contradict the plan: every ring
  // is the same corridor, and the only thing that changes as you go in is how
  // much of it you have already walked.
  encounters: {
    rate: 28, terrain: 'cave', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['vergepike', 'vergepike', 'chorister'] },
      { weight: 22, enemies: ['bulwarkshell', 'vergestandard'] },
      { weight: 18, enemies: ['lychgatewight', 'pallmoth'] },
      { weight: 16, enemies: ['barrowmaw', 'sextonhusk'] },
      { weight: 12, enemies: ['deepcantor', 'stonelayer'] },
      { weight: 10, enemies: ['vergeknight', 'hollowherald'] },
      { weight: 3, enemies: ['thelatebell'] },
      { weight: 2, enemies: ['bannerofthenine'] },
    ],
  },

  props: [
    // --- ring A: entered from the SOUTH, left by the NORTH ------------------
    { kit: 'savepoint', at: [23.5, 44.5], id: 'th-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [20.5, 44.5], id: 'th-post-a',
      interact: { name: 'Notch-Stone, One Notch', text: [
        'A stone set flush in the gallery wall, cut with a single notch and an arrow.',
        'The arrow points at nothing. It is the same distance to the gate either way.',
        'Below, in a later hand: THE STONES COUNT THE WALLS, NOT THE TURNS.',
      ] } },
    { kit: 'lamppost', at: [3.5, 44.5] },       // south-west corner
    { kit: 'lamppost', at: [44.5, 44.5] },      // south-east corner
    { kit: 'lamppost', at: [3.5, 3.5] },        // north-west corner
    { kit: 'lamppost', at: [44.5, 3.5] },       // north-east corner
    { kit: 'rock', at: [12.0, 44.4], scale: 1.2, seed: 3, material: 'cave' },
    { kit: 'rock', at: [3.5, 30.0], scale: 1.0, seed: 5, material: 'cave' },
    { kit: 'crate', at: [34.4, 44.4], rot: 0.6 },
    { kit: 'chest', at: [8.5, 44.5], id: 'th-chest-1',
      contains: { kind: 'item', id: 'deeptonic', count: 4, label: '4 Deep Tonics' } },
    { kit: 'chest', at: [44.5, 18.5], id: 'th-chest-2',
      contains: { kind: 'item', id: 'greatbalm', count: 3, label: '3 Great Balms' } },
    // The gate out of ring A, on the north side, four paces wide.
    { kit: 'lamppost', at: [20.5, 3.5] },
    { kit: 'lamppost', at: [27.5, 3.5] },

    // --- ring B: entered from the NORTH, left by the WEST -------------------
    { kit: 'savepoint', at: [23.5, 8.5], id: 'th-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [27.5, 8.5], id: 'th-post-b',
      interact: { name: 'Notch-Stone, Two Notches', text: [
        'The same stone, the same hand, two notches. You have crossed one wall.',
        'The gallery it stands in is a closed ring and you have already walked',
        'part of it. There is no way to tell which part.',
      ] } },
    { kit: 'lamppost', at: [8.5, 8.5] },        // north-west corner
    { kit: 'lamppost', at: [39.5, 8.5] },       // north-east corner
    { kit: 'lamppost', at: [8.5, 39.5] },       // south-west corner
    { kit: 'lamppost', at: [39.5, 39.5] },      // south-east corner
    { kit: 'rock', at: [24.0, 39.4], scale: 1.1, seed: 7, material: 'cave' },
    { kit: 'barrel', at: [39.4, 26.4] },
    { kit: 'chest', at: [17.5, 39.5], id: 'th-chest-3',
      contains: { kind: 'item', id: 'mourningsteel', count: 1, label: 'Mourning Steel' } },
    { kit: 'chest', at: [39.5, 14.5], id: 'th-chest-4',
      contains: { kind: 'item', id: 'wardenshelm', count: 1, label: 'a Warden\'s Helm' } },

    // --- ring C: entered from the WEST, left by the EAST --------------------
    { kit: 'savepoint', at: [13.5, 23.5], id: 'th-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [13.5, 20.5], id: 'th-post-c',
      interact: { name: 'Notch-Stone, Three Notches', text: [
        'Three notches, and the gate you want is directly opposite, across the ring.',
        'Left or right, it is the same walk. Someone has scratched a tally beside',
        'the stone: forty-one strokes to the left, forty on the right.',
      ] } },
    { kit: 'lamppost', at: [13.5, 13.5] },      // north-west corner
    { kit: 'lamppost', at: [34.5, 13.5] },      // north-east corner
    { kit: 'lamppost', at: [13.5, 34.5] },      // south-west corner
    { kit: 'lamppost', at: [34.5, 34.5] },      // south-east corner
    { kit: 'rock', at: [24.0, 13.4], scale: 0.9, seed: 9, material: 'cave' },
    { kit: 'chest', at: [24.5, 34.5], id: 'th-chest-5',
      contains: { kind: 'item', id: 'vigilblade', count: 1, label: 'a Vigil Blade' } },
    { kit: 'chest', at: [34.5, 20.5], id: 'th-chest-6',
      contains: { kind: 'item', id: 'gravebindings', count: 1, label: 'a set of Grave Bindings' } },

    // --- ring D: entered from the EAST, left by the NORTH -------------------
    { kit: 'savepoint', at: [29.5, 23.5], id: 'th-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [29.5, 27.5], id: 'th-post-d',
      interact: { name: 'Notch-Stone, Four Notches', text: [
        'Four notches. The last ring, and the shortest — a quarter turn to the gate,',
        'if you guess the quarter. Nothing on the stone says which.',
      ] } },
    { kit: 'lamppost', at: [18.5, 18.5] },      // north-west corner
    { kit: 'lamppost', at: [29.5, 18.5] },      // north-east corner
    { kit: 'lamppost', at: [18.5, 29.5] },      // south-west corner
    { kit: 'lamppost', at: [29.5, 29.5] },      // south-east corner
    { kit: 'crate', at: [22.4, 29.4], rot: 1.2 },
    { kit: 'chest', at: [18.5, 24.5], id: 'th-chest-7',
      contains: { kind: 'item', id: 'ninthward', count: 1, label: 'a Ninth Ward' } },

    // --- the middle ----------------------------------------------------------
    // Four walls crossed, four sides used, and the room they were hiding is
    // eight paces by eight. The stone beside the shaft keeps the description.
    { kit: 'well', at: [23.5, 24.5], id: 'th-middle', radius: 1.1, interactRadius: 2.4,
      interact: { name: 'The Middle of the Hollowing', text: [
        'A shaft, sunk through the floor of the innermost room, faced in dressed stone.',
        'It goes down further than the lamp reaches. There is no windlass and no rope,',
        'and the coping is worn smooth on every side, as though by hands rather than rope.',
      ] } },
    { kit: 'lamppost', at: [22.5, 22.5] },
    { kit: 'chest', at: [25.5, 22.5], id: 'th-chest-8',
      contains: { kind: 'item', id: 'resonancerod', count: 1, label: 'a Resonance Rod' } },
  ],

  npcs: [],
};
