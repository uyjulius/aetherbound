/**
 * The Thornmarch — a maze that is secretly a spiral.
 *
 * From inside the briar it reads as a labyrinth: every wall looks the same,
 * every turn looks like the last, and it goes on long enough to feel like it
 * has no end. It has no junctions at all. The whole march is one unbroken
 * corridor wound three times round itself, so the player who simply keeps
 * walking arrives at the heart, and the player who tries to "solve" it finds
 * there was never anything to solve. That is the deal this dungeon makes:
 * endless, but never a trap. There is not one dead end in it.
 *
 * The three thorn plugs are what turn a ring into a spiral. Each sits just
 * *past* the point where the corridor steps inwards, so at every crossroads
 * the briar has already made the choice for you — which is why the march can
 * be enormous without ever being cruel.
 *
 * Rows use the same run-length notation as the other dungeons; a miscounted
 * row in a hedge is an invisible gate, which would undo the whole idea.
 */

const W = 48;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[thornmarch] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Column bands, west to east:
//   0-2 dyke | 3-5 ring A | 6-8 briar | 9-11 ring B | 12-14 briar |
//   15-17 ring C | 18-19 briar | 20-27 the heart | 28-29 briar |
//   30-32 ring C | 33-35 briar | 36-38 ring B | 39-41 briar |
//   42-44 ring A | 45-47 dyke
// The row bands are identical, which is what makes the rings square.

const TERRAIN = [
  /*  0 */ row(R('#', 48)),
  /*  1 */ row(R('#', 48)),
  /*  2 */ row(R('#', 48)),
  // --- ring A, north leg ---------------------------------------------------
  /*  3 */ row(R('#', 3), R(',', 42), R('#', 3)),
  /*  4 */ row(R('#', 3), R(',', 42), R('#', 3)),
  /*  5 */ row(R('#', 3), R(',', 42), R('#', 3)),
  /*  6 */ row(R('#', 3), R(',', 3), R('f', 36), R(',', 3), R('#', 3)),
  /*  7 */ row(R('#', 3), R(',', 3), R('f', 36), R(',', 3), R('#', 3)),
  /*  8 */ row(R('#', 3), R(',', 3), R('f', 36), R(',', 3), R('#', 3)),
  // --- ring B, north leg ---------------------------------------------------
  /*  9 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 30), R('f', 3), R(',', 3), R('#', 3)),
  /* 10 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 30), R('f', 3), R(',', 3), R('#', 3)),
  /* 11 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 30), R('f', 3), R(',', 3), R('#', 3)),
  /* 12 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 24), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 13 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 24), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 14 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 24), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  // --- ring C, north leg ---------------------------------------------------
  /* 15 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 18), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 16 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 18), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 17 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 18), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 18 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 12), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 19 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 12), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  // --- the heart ------------------------------------------------------------
  /* 20 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 2), R('.', 8), R('f', 2), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 21 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 2), R('.', 8), R('f', 2), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 22 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 2), R('.', 8), R('f', 2), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 23 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 2), R('.', 8), R('f', 2), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  // the mouth of the heart — the only gap in its briar, on the east side
  /* 24 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 2), R('.', 8), R(',', 2), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 25 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 2), R('.', 8), R(',', 2), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 26 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 2), R('.', 8), R(',', 2), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  // ring C's east leg is plugged here, three rows short of its own corner
  /* 27 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 2), R('.', 8), R('f', 2), R('f', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 28 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 18), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  /* 29 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 18), R(',', 3), R('f', 3), R(',', 3), R('#', 3)),
  // --- ring C, south leg — and the step inward from ring B -----------------
  /* 30 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 24), R('f', 3), R(',', 3), R('#', 3)),
  /* 31 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 24), R('f', 3), R(',', 3), R('#', 3)),
  /* 32 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 3), R(',', 24), R('f', 3), R(',', 3), R('#', 3)),
  // ring B's east leg is plugged here
  /* 33 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 30), R(',', 3), R('#', 3)),
  /* 34 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 30), R(',', 3), R('#', 3)),
  /* 35 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 3), R('f', 30), R(',', 3), R('#', 3)),
  // --- ring B, south leg — and the step inward from ring A -----------------
  /* 36 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 36), R('#', 3)),
  /* 37 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 36), R('#', 3)),
  /* 38 */ row(R('#', 3), R(',', 3), R('f', 3), R(',', 36), R('#', 3)),
  // ring A's east leg is plugged here — three paces north of where you came in
  /* 39 */ row(R('#', 3), R(',', 3), R('f', 39), R('#', 3)),
  /* 40 */ row(R('#', 3), R(',', 3), R('f', 39), R('#', 3)),
  /* 41 */ row(R('#', 3), R(',', 3), R('f', 39), R('#', 3)),
  // --- ring A, south leg ---------------------------------------------------
  /* 42 */ row(R('#', 3), R(',', 42), R('#', 3)),
  /* 43 */ row(R('#', 3), R(',', 42), R('#', 3)),
  /* 44 */ row(R('#', 3), R(',', 42), R('#', 3)),
  // --- the gate in the dyke -------------------------------------------------
  /* 45 */ row(R('#', 42), R(',', 3), R('#', 3)),
  /* 46 */ row(R('#', 42), R(',', 3), R('#', 3)),
  /* 47 */ row(R('#', 42), R(',', 3), R('#', 3)),
];

export const THORNMARCH = {
  id: 'thornmarch',
  name: 'The Thornmarch',
  subtitle: 'Three Times Round, Then In',
  kind: 'dungeon',
  light: 'dusk',
  grade: 'dusk',
  fog: ['#3a3a30', 22, 84],
  tilt: 0.38,
  cameraDistance: 15,
  cameraPitch: 0.70,
  music: 'marsh',
  base: 'grass',
  groundRamp: 'terrain',
  wallHeight: 7,
  wallMaterial: 'rock',
  // Dusk under a closed briar canopy is nearly night at ground level, so the
  // way-lamps at the corners have to actually burn.
  lampIntensity: 7,
  lampRange: 13,

  sky: {
    zenith: '#3c3a58', horizon: '#c08a5e', ground: '#3a3626',
    sunColor: '#ffb070', sunDir: [-0.5, 0.16, 0.4], cloud: 0.55,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [43, 46], face: 'north' },
    world: { at: [43, 46], face: 'north' },
  },

  exits: [
    { at: [42, 47], size: [3, 1], to: 'overworld', spawn: 'thornmarch',
      prompt: 'Leave the march' },
  ],

  // The Walker is met on the road rather than found at a place, so she is a
  // zone rather than a prop. No `once` on her: the scene offers a choice and
  // declining must leave the offer standing, and a one-shot flag is spent on
  // entry whichever way the player answers.
  triggers: [
    { at: [9, 27], size: [3, 2], kind: 'event', event: 'thornmarch_circuit' },
  ],

  // A long walk deserves a long fuse: the march is three times the length of
  // an ordinary dungeon, so the step threshold is set well above normal or the
  // player would fight the whole way round.
  encounters: {
    rate: 34, terrain: 'dirt', scenery: 'field',
    groups: [
      { weight: 28, enemies: ['bramblecolt', 'hollybound'] },
      { weight: 24, enemies: ['hollybound', 'hollybound'] },
      { weight: 20, enemies: ['lanternmoth', 'lanternmoth', 'lanternmoth'] },
      { weight: 16, enemies: ['mourner'] },
      { weight: 12, enemies: ['bramblecolt', 'cairnwight'] },
    ],
  },

  props: [
    // --- the gate ----------------------------------------------------------
    { kit: 'savepoint', at: [43.5, 44.4], id: 'tm-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [40.6, 43.4], id: 'tm-gatepost',
      interact: { name: 'Warden\'s Post', text: [
        'KEEP THE THORN ON YOUR RIGHT HAND AND DO NOT DOUBLE BACK.',
        'Beneath, worn nearly out: THERE IS NOWHERE TO DOUBLE BACK TO.',
      ] } },
    { kit: 'lamppost', at: [43.5, 42.5] },

    // --- ring A ------------------------------------------------------------
    { kit: 'lamppost', at: [4.5, 43.5] },     // south-west corner
    { kit: 'rock', at: [20.0, 43.4], scale: 1.1, seed: 3 },
    { kit: 'bush', at: [30.5, 42.6], scale: 1.2, seed: 5 },
    { kit: 'chest', at: [12.5, 43.5], id: 'tm-chest-1',
      contains: { kind: 'item', id: 'hitonic', count: 4, label: '4 Hi-Tonics' } },
    { kit: 'lamppost', at: [4.5, 4.5] },      // north-west corner
    { kit: 'bush', at: [4.4, 24.5], scale: 1.1, seed: 7 },
    { kit: 'rock', at: [4.6, 32.4], scale: 0.9, seed: 9 },
    { kit: 'chest', at: [4.5, 14.5], id: 'tm-chest-2',
      contains: { kind: 'item', id: 'panacea', count: 3, label: '3 Panaceas' } },
    { kit: 'lamppost', at: [43.5, 4.5] },     // north-east corner
    { kit: 'bush', at: [26.5, 4.4], scale: 1.3, seed: 11 },
    { kit: 'signpost', at: [34.6, 4.6], id: 'tm-mark-a',
      interact: { name: 'Cut Stone', text: [
        'A stone half-swallowed by briar. A single notch has been cut into it.',
        'You will find two more of these, and each will have one notch fewer.',
      ] } },
    { kit: 'chest', at: [43.5, 24.5], id: 'tm-chest-3',
      contains: { kind: 'item', id: 'quillbrush', count: 1, label: 'a Quill Brush' } },

    // --- ring B ------------------------------------------------------------
    { kit: 'savepoint', at: [37.5, 37.4], id: 'tm-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [10.5, 37.5] },    // south-west corner
    { kit: 'bush', at: [24.5, 37.4], scale: 1.2, seed: 13 },
    { kit: 'lamppost', at: [10.5, 10.5] },    // north-west corner
    { kit: 'rock', at: [10.4, 20.5], scale: 1.0, seed: 15 },
    { kit: 'chest', at: [10.5, 30.5], id: 'tm-chest-4',
      contains: { kind: 'item', id: 'silkrobe', count: 1, label: 'a Silk Robe' } },
    { kit: 'lamppost', at: [37.5, 10.5] },    // north-east corner
    { kit: 'signpost', at: [28.6, 10.4], id: 'tm-mark-b',
      interact: { name: 'Cut Stone', text: [
        'The same stone, the same hand, one notch cut into it — and it is not',
        'the stone you saw before. You have been round once already.',
      ] } },
    { kit: 'bush', at: [37.4, 20.5], scale: 1.1, seed: 17 },

    // --- ring C ------------------------------------------------------------
    { kit: 'lamppost', at: [16.5, 31.5] },    // south-west corner
    { kit: 'lamppost', at: [16.5, 16.5] },    // north-west corner
    { kit: 'lamppost', at: [31.5, 16.5] },    // north-east corner
    { kit: 'rock', at: [24.0, 31.4], scale: 1.2, seed: 19 },
    { kit: 'bush', at: [24.5, 16.4], scale: 1.3, seed: 21 },
    { kit: 'chest', at: [16.5, 24.5], id: 'tm-chest-5',
      contains: { kind: 'item', id: 'quietstep', count: 1, label: 'a pair of Quiet Step' } },

    // --- the heart ----------------------------------------------------------
    { kit: 'savepoint', at: [21.5, 25.5], id: 'tm-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The well at the middle of the march is the terminal feature, and the
    // reason the briar will not close over it is the Great Thirst underneath.
    // The stone beside it keeps the description.
    { kit: 'well', at: [23.5, 22.5], id: 'tm-heart', radius: 1.1, interactRadius: 2.4,
      interact: { prompt: 'The Middle of the March', event: 'thegreatthirst' } },
    { kit: 'signpost', at: [24.5, 25.5], id: 'tm-heart-stone',
      interact: { name: 'The Middle of the March', text: [
        'A well, in the one place in the march where the briar refuses to grow.',
        'The thorn stops in a clean circle around it, as if it were being polite.',
      ] } },
    { kit: 'tree', at: [26.5, 25.5], kind: 'dead', scale: 1.3, seed: 23 },
    { kit: 'bush', at: [21.0, 21.0], scale: 1.4, seed: 25 },
    { kit: 'chest', at: [26.5, 21.0], id: 'tm-chest-6',
      contains: { kind: 'item', id: 'megalixir', count: 1, label: 'a Megalixir' } },
    // A corridor with no junctions has exactly one end, and this is what is
    // sitting in it.
    { kit: 'chest', at: [21.5, 27.5], id: 'tm-chest-7',
      contains: { kind: 'item', id: 'unboundfist', count: 1, label: 'the Unbound Fist' } },
  ],

  npcs: [],
};
