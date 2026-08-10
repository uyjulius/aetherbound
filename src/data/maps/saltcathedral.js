/**
 * The Salt Cathedral — a room too big to be seen, hung with curtains of salt.
 *
 * The floor plan is almost nothing: one hall, forty-six paces by forty, with a
 * lattice of piers holding up whatever is overhead, and a single small room in
 * the north-east corner with a door on it. Written down like that it sounds
 * like an empty box. It does not play like one, because the player never sees
 * it. The fog here is drawn in at thirteen paces and the lamps carry eleven,
 * so what is legible at any moment is a pier, an aisle, and the pale shapes of
 * the next thing along — never the walls, never the shape, never the size.
 *
 * The hall is therefore divided twice, by two different kinds of thing, and
 * the rule is exact and worth learning at the door:
 *
 *   if it is drawn in the plan, it stops you;
 *   if it is not drawn in the plan, it only stops your eyes.
 *
 * The piers and the six fallen screens are terrain and they are solid. The
 * salt is not. It has grown down out of the vault in ropes and sheets and it
 * hangs in long lines across the aisles, and every one of those lines can be
 * walked straight through. So the cathedral looks partitioned into chambers
 * and is not, and the player spends the whole map learning to distrust the
 * evidence of a wall — walking at the pale sheets on purpose, and being wrong
 * about one in six of them.
 *
 * The piers are set on a staggered lattice rather than a square one, which is
 * the small cruelty that stops the space from ever resolving: no aisle runs
 * clear across the hall, so there is no line of sight that would give the game
 * away, and nowhere to stand that tells you where you are.
 *
 * Rows use the same run-length notation as the other dungeons.
 */

const W = 52;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[saltcathedral] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// The piers stand two paces square, on rows 5, 11, 17, 23, 29 and 35, and the
// odd-numbered rows of piers are set three paces east of the even ones. Six
// screens — slabs of the fallen vault, standing on edge — are the only other
// solid thing in the hall, and the salt house in the north-east corner is the
// only enclosure with a door.

const TERRAIN = [
  /*  0 */ row(R('#', 52)),
  /*  1 */ row(R('#', 52)),
  /*  2 */ row(R('#', 52)),
  // --- the north end of the hall, and the salt house in the corner --------
  // The salt house is the only enclosure in the cathedral. Everything else
  // that divides this space is either a pier or a curtain.
  /*  3 */ row(R('#', 3), R('M', 31), R('#', 1), R('M', 4), R('#', 13)),
  /*  4 */ row(R('#', 3), R('M', 31), R('#', 1), R('M', 4), R('#', 1), R('M', 8), R('#', 4)),
  /*  5 */ row(R('#', 3), R('M', 1), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 3), R('M', 4), R('#', 1), R('M', 8), R('#', 4)),
  /*  6 */ row(R('#', 3), R('M', 1), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 3), R('M', 4), R('#', 1), R('M', 8), R('#', 4)),
  /*  7 */ row(R('#', 3), R('M', 31), R('#', 1), R('M', 4), R('#', 1), R('M', 8), R('#', 4)),
  /*  8 */ row(R('#', 3), R('M', 31), R('#', 1), R('M', 4), R('#', 1), R('M', 8), R('#', 4)),
  /*  9 */ row(R('#', 3), R('M', 31), R('#', 1), R('M', 4), R('#', 1), R('M', 8), R('#', 4)),
  /* 10 */ row(R('#', 3), R('M', 31), R('#', 1), R('M', 4), R('#', 5), R('M', 2), R('#', 6)),
  // --- the piers begin to stagger ------------------------------------------
  /* 11 */ row(R('#', 3), R('M', 4), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 4), R('#', 3), R('M', 5), R('#', 2), R('M', 5), R('#', 3)),
  /* 12 */ row(R('#', 3), R('M', 4), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 4), R('#', 3), R('M', 5), R('#', 2), R('M', 5), R('#', 3)),
  /* 13 */ row(R('#', 3), R('M', 31), R('#', 1), R('M', 14), R('#', 3)),
  // a fallen slab of the vault, standing on edge across the aisle
  /* 14 */ row(R('#', 3), R('M', 5), R('#', 12), R('M', 14), R('#', 1), R('M', 14), R('#', 3)),
  /* 15 */ row(R('#', 3), R('M', 46), R('#', 3)),
  /* 16 */ row(R('#', 3), R('M', 46), R('#', 3)),
  /* 17 */ row(R('#', 3), R('M', 1), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 1), R('#', 3)),
  /* 18 */ row(R('#', 3), R('M', 1), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 1), R('#', 3)),
  /* 19 */ row(R('#', 3), R('M', 46), R('#', 3)),
  // another, in the north-east quarter
  /* 20 */ row(R('#', 3), R('M', 23), R('#', 15), R('M', 8), R('#', 3)),
  /* 21 */ row(R('#', 3), R('M', 46), R('#', 3)),
  /* 22 */ row(R('#', 3), R('M', 46), R('#', 3)),
  /* 23 */ row(R('#', 3), R('M', 4), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 3)),
  /* 24 */ row(R('#', 3), R('M', 4), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 3)),
  /* 25 */ row(R('#', 3), R('M', 46), R('#', 3)),
  // a third, running north-south, and a fourth against the east wall
  /* 26 */ row(R('#', 3), R('M', 19), R('#', 1), R('M', 18), R('#', 11)),
  /* 27 */ row(R('#', 3), R('M', 19), R('#', 1), R('M', 26), R('#', 3)),
  /* 28 */ row(R('#', 3), R('M', 19), R('#', 1), R('M', 26), R('#', 3)),
  /* 29 */ row(R('#', 3), R('M', 1), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 2), R('#', 1), R('M', 2), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 1), R('#', 3)),
  /* 30 */ row(R('#', 3), R('M', 1), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 2), R('#', 1), R('M', 2), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 1), R('#', 3)),
  /* 31 */ row(R('#', 3), R('M', 19), R('#', 1), R('M', 26), R('#', 3)),
  // the last screen, in the south-west quarter
  /* 32 */ row(R('#', 3), R('M', 2), R('#', 13), R('M', 4), R('#', 1), R('M', 26), R('#', 3)),
  /* 33 */ row(R('#', 3), R('M', 19), R('#', 1), R('M', 26), R('#', 3)),
  /* 34 */ row(R('#', 3), R('M', 19), R('#', 1), R('M', 26), R('#', 3)),
  /* 35 */ row(R('#', 3), R('M', 4), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 3)),
  /* 36 */ row(R('#', 3), R('M', 4), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 2), R('M', 5), R('#', 3)),
  /* 37 */ row(R('#', 3), R('M', 19), R('#', 1), R('M', 26), R('#', 3)),
  /* 38 */ row(R('#', 3), R('M', 19), R('#', 1), R('M', 26), R('#', 3)),
  /* 39 */ row(R('#', 3), R('M', 46), R('#', 3)),
  /* 40 */ row(R('#', 3), R('M', 46), R('#', 3)),
  /* 41 */ row(R('#', 3), R('M', 46), R('#', 3)),
  /* 42 */ row(R('#', 3), R('M', 46), R('#', 3)),
  // --- the porch, in the south-west corner ---------------------------------
  /* 43 */ row(R('#', 5), R('=', 6), R('#', 41)),
  /* 44 */ row(R('#', 5), R('=', 6), R('#', 41)),
  /* 45 */ row(R('#', 6), R('=', 4), R('#', 42)),
];

export const SALT_CATHEDRAL = {
  id: 'saltcathedral',
  name: 'The Salt Cathedral',
  subtitle: 'Seen a Piece at a Time',
  kind: 'dungeon',
  light: 'cave',
  grade: 'snow',
  fog: ['#b6c4d0', 13, 50],
  tilt: 0.34,
  cameraDistance: 17,
  cameraPitch: 0.66,
  music: 'deepworks',
  base: 'marble',
  groundRamp: 'cave',
  // The vault is high enough that it is never in shot, which is deliberate:
  // there is no ceiling to read the size of the room off.
  wallHeight: 22,
  wallMaterial: 'stoneFine',
  // Short reach on purpose. A long lamp would show the player the hall.
  lampIntensity: 10,
  lampRange: 11,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [7, 43], face: 'north' },
    world: { at: [7, 43], face: 'north' },
  },

  exits: [
    { at: [6, 45], size: [4, 1], to: 'eastreach', spawn: 'saltcathedral_porch',
      prompt: 'Leave the cathedral' },
  ],

  triggers: [],

  // The north third of the hall — the end the player cannot see from anywhere,
  // and reaches last — carries the deeper table. Everything south of it, and
  // the salt house, falls through to the map's own below.
  encounterZones: [
    { rect: [0, 0, 52, 16], table: 'gainsay_deep' },
  ],

  encounters: {
    rate: 26, terrain: 'marble', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['naysayer', 'chaffmidge', 'chaffmidge'] },
      { weight: 22, enemies: ['theillwisher', 'grudgewight'] },
      { weight: 18, enemies: ['quietingbell', 'tithewisp'] },
      { weight: 16, enemies: ['theobjection', 'nightshift'] },
      { weight: 12, enemies: ['mendicant', 'veinmoth', 'veinmoth'] },
      { weight: 10, enemies: ['theretort', 'acrecrow'] },
      { weight: 3, enemies: ['thegainsayer'] },
      { weight: 2, enemies: ['theanswering'] },
    ],
  },

  props: [
    // --- the porch -----------------------------------------------------------
    { kit: 'savepoint', at: [7.5, 43.5], id: 'sc-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [9.5, 43.5], id: 'sc-rule',
      interact: { name: 'The Porch Board', text: [
        'A board bolted to the porch wall, lettered by somebody who came out again.',
        'IF IT IS ON THE PLAN IT WILL STOP YOU. IF IT IS NOT, IT WILL NOT.',
        'THE SALT IS NOT ON THE PLAN. WALK AT IT.',
      ] } },
    { kit: 'lamppost', at: [8.5, 44.5] },

    // --- the south range -----------------------------------------------------
    { kit: 'lamppost', at: [4.5, 41.5] },
    { kit: 'lamppost', at: [20.5, 41.5] },
    { kit: 'lamppost', at: [36.5, 41.5] },
    { kit: 'lamppost', at: [46.5, 41.5] },
    { kit: 'signpost', at: [24.5, 41.5], id: 'sc-nave',
      interact: { name: 'A Surveyor\'s Peg', text: [
        'A peg driven into the floor, with a tape still knotted to it. The tape',
        'runs out north into the fog and does not come back. Chalked on the flag',
        'beside it: 40 AND STILL GOING. NOT A NAVE. NO END TO IT THAT WAY.',
      ] } },
    { kit: 'chest', at: [3.5, 36.5], id: 'sc-chest-1',
      contains: { kind: 'item', id: 'mirrordust', count: 3, label: '3 Mirror Dust' } },

    // The salt: long lines of it, hanging across the aisles. None of it is
    // solid. Every one of these is a place the player will stop dead the first
    // time and walk straight through the second.
    { kit: 'tree', at: [6.5, 39.5], kind: 'dead', scale: 1.5, seed: 3, solid: false },
    { kit: 'tree', at: [9.5, 39.5], kind: 'dead', scale: 1.5, seed: 5, solid: false },
    { kit: 'tree', at: [12.5, 39.5], kind: 'dead', scale: 1.5, seed: 7, solid: false },
    { kit: 'tree', at: [15.5, 39.5], kind: 'dead', scale: 1.5, seed: 9, solid: false },
    { kit: 'tree', at: [18.5, 39.5], kind: 'dead', scale: 1.5, seed: 11, solid: false },
    { kit: 'tree', at: [24.5, 30.5], kind: 'dead', scale: 1.5, seed: 13, solid: false },
    { kit: 'tree', at: [24.5, 33.5], kind: 'dead', scale: 1.5, seed: 15, solid: false },
    { kit: 'tree', at: [24.5, 36.5], kind: 'dead', scale: 1.5, seed: 17, solid: false },
    { kit: 'tree', at: [24.5, 39.5], kind: 'dead', scale: 1.5, seed: 19, solid: false },
    { kit: 'tree', at: [26.5, 33.5], kind: 'dead', scale: 1.4, seed: 21, solid: false },
    { kit: 'tree', at: [29.5, 33.5], kind: 'dead', scale: 1.4, seed: 23, solid: false },
    { kit: 'tree', at: [32.5, 33.5], kind: 'dead', scale: 1.4, seed: 25, solid: false },
    { kit: 'tree', at: [35.5, 33.5], kind: 'dead', scale: 1.4, seed: 27, solid: false },
    { kit: 'tree', at: [38.5, 28.5], kind: 'dead', scale: 1.5, seed: 29, solid: false },
    { kit: 'tree', at: [38.5, 31.5], kind: 'dead', scale: 1.5, seed: 31, solid: false },
    { kit: 'tree', at: [38.5, 34.5], kind: 'dead', scale: 1.5, seed: 33, solid: false },
    { kit: 'tree', at: [38.5, 37.5], kind: 'dead', scale: 1.5, seed: 35, solid: false },
    { kit: 'rock', at: [10.5, 33.5], scale: 1.3, seed: 37, material: 'cave', solid: false },
    { kit: 'rock', at: [35.5, 29.5], scale: 1.3, seed: 39, material: 'cave', solid: false },

    // --- the middle of the hall ---------------------------------------------
    { kit: 'savepoint', at: [24.5, 21.5], id: 'sc-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'savepoint', at: [40.5, 39.5], id: 'sc-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [4.5, 25.5] },
    { kit: 'lamppost', at: [20.5, 25.5] },
    { kit: 'lamppost', at: [46.5, 33.5] },
    { kit: 'signpost', at: [25.5, 15.5], id: 'sc-screen',
      interact: { name: 'A Fallen Screen', text: [
        'A slab of the vault, come down whole and standing on its edge like a',
        'wall someone meant. It is twelve paces long and it is not salt, and',
        'walking at it teaches that in one step.',
      ] } },
    { kit: 'chest', at: [12.5, 27.5], id: 'sc-chest-2',
      contains: { kind: 'item', id: 'nervetonic', count: 3, label: '3 Nerve Tonics' } },
    { kit: 'chest', at: [47.5, 24.5], id: 'sc-chest-3',
      contains: { kind: 'item', id: 'chanterscirclet', count: 1, label: 'a Chanter\'s Circlet' } },
    { kit: 'chest', at: [19.5, 31.5], id: 'sc-chest-4',
      contains: { kind: 'item', id: 'ledgerofsmalldebts', count: 1, label: 'the Ledger of Small Debts' } },
    { kit: 'chest', at: [30.5, 19.5], id: 'sc-chest-5',
      contains: { kind: 'item', id: 'gainsayknife', count: 1, label: 'a Gainsay Knife' } },
    { kit: 'tree', at: [10.5, 16.5], kind: 'dead', scale: 1.5, seed: 41, solid: false },
    { kit: 'tree', at: [10.5, 19.5], kind: 'dead', scale: 1.5, seed: 43, solid: false },
    { kit: 'tree', at: [10.5, 22.5], kind: 'dead', scale: 1.5, seed: 45, solid: false },
    { kit: 'tree', at: [10.5, 25.5], kind: 'dead', scale: 1.5, seed: 47, solid: false },
    { kit: 'tree', at: [10.5, 28.5], kind: 'dead', scale: 1.5, seed: 49, solid: false },
    { kit: 'tree', at: [4.5, 15.5], kind: 'dead', scale: 1.4, seed: 51, solid: false },
    { kit: 'tree', at: [7.5, 15.5], kind: 'dead', scale: 1.4, seed: 53, solid: false },
    { kit: 'tree', at: [13.5, 15.5], kind: 'dead', scale: 1.4, seed: 55, solid: false },
    { kit: 'tree', at: [16.5, 15.5], kind: 'dead', scale: 1.4, seed: 57, solid: false },
    { kit: 'tree', at: [19.5, 15.5], kind: 'dead', scale: 1.4, seed: 59, solid: false },
    { kit: 'tree', at: [28.5, 21.5], kind: 'dead', scale: 1.5, seed: 61, solid: false },
    { kit: 'tree', at: [31.5, 21.5], kind: 'dead', scale: 1.5, seed: 63, solid: false },
    { kit: 'tree', at: [34.5, 21.5], kind: 'dead', scale: 1.5, seed: 65, solid: false },
    { kit: 'tree', at: [37.5, 21.5], kind: 'dead', scale: 1.5, seed: 67, solid: false },
    { kit: 'tree', at: [40.5, 21.5], kind: 'dead', scale: 1.5, seed: 69, solid: false },
    { kit: 'tree', at: [43.5, 21.5], kind: 'dead', scale: 1.5, seed: 71, solid: false },
    { kit: 'tree', at: [46.5, 21.5], kind: 'dead', scale: 1.5, seed: 73, solid: false },
    { kit: 'tree', at: [25.5, 27.5], kind: 'dead', scale: 1.4, seed: 75, solid: false },
    { kit: 'tree', at: [28.5, 27.5], kind: 'dead', scale: 1.4, seed: 77, solid: false },
    { kit: 'tree', at: [31.5, 27.5], kind: 'dead', scale: 1.4, seed: 79, solid: false },
    { kit: 'tree', at: [34.5, 27.5], kind: 'dead', scale: 1.4, seed: 81, solid: false },
    { kit: 'tree', at: [37.5, 27.5], kind: 'dead', scale: 1.4, seed: 83, solid: false },
    { kit: 'rock', at: [14.5, 19.5], scale: 1.3, seed: 85, material: 'cave', solid: false },
    { kit: 'rock', at: [42.5, 17.5], scale: 1.3, seed: 87, material: 'cave', solid: false },

    // --- the north range, which is never seen from anywhere else ------------
    { kit: 'lamppost', at: [16.5, 8.5] },
    { kit: 'lamppost', at: [28.5, 3.5] },
    { kit: 'lamppost', at: [46.5, 15.5] },
    { kit: 'chest', at: [4.5, 3.5], id: 'sc-chest-6',
      contains: { kind: 'item', id: 'answeringrobe', count: 1, label: 'an Answering Robe' } },
    { kit: 'tree', at: [17.5, 4.5], kind: 'dead', scale: 1.5, seed: 89, solid: false },
    { kit: 'tree', at: [17.5, 7.5], kind: 'dead', scale: 1.5, seed: 91, solid: false },
    { kit: 'tree', at: [17.5, 10.5], kind: 'dead', scale: 1.5, seed: 93, solid: false },
    { kit: 'tree', at: [31.5, 4.5], kind: 'dead', scale: 1.5, seed: 95, solid: false },
    { kit: 'tree', at: [31.5, 7.5], kind: 'dead', scale: 1.5, seed: 97, solid: false },
    { kit: 'tree', at: [31.5, 10.5], kind: 'dead', scale: 1.5, seed: 99, solid: false },
    { kit: 'tree', at: [31.5, 13.5], kind: 'dead', scale: 1.5, seed: 101, solid: false },
    { kit: 'tree', at: [31.5, 16.5], kind: 'dead', scale: 1.5, seed: 103, solid: false },

    // --- the salt house: the one room in the cathedral with a door ----------
    { kit: 'savepoint', at: [42.5, 8.5], id: 'sc-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'well', at: [44.5, 6.5], id: 'sc-spring', radius: 1.1, interactRadius: 2.4,
      interact: { name: 'The Salt Spring', text: [
        'A shaft in the floor of the salt house, with brine standing in it a foot',
        'from the lip. Every rope and sheet in the cathedral came up out of this',
        'hole, one grain at a time, and is still coming.',
      ] } },
    { kit: 'signpost', at: [43.5, 9.5], id: 'sc-house',
      interact: { name: 'The Salt House', text: [
        'The only door in the building. Somebody wanted one room in here that',
        'stayed the same size when they looked away from it.',
      ] } },
    { kit: 'chest', at: [45.5, 7.5], id: 'sc-chest-7',
      contains: { kind: 'item', id: 'resonantcharm', count: 1, label: 'a Resonant Charm' } },
  ],

  npcs: [],
};
