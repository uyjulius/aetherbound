/**
 * The Fen Barrow — the first dungeon.
 *
 * Shaped as a loop with a spine: entrance hall, a long gallery with a room on
 * either flank, and a single corridor north to the boss. Both flank rooms are
 * optional and both hold treasure, so the player who explores is rewarded and
 * the player who beelines is not punished with a wall.
 *
 * Rows use the same run-length notation as the overworld — a miscounted row in
 * a cave is an invisible hole in a wall, which is far worse than a visible one.
 */

const W = 40;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[fenbarrow] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('X', 40)),
  /*  1 */ row(R('X', 40)),
  /*  2 */ row(R('X', 40)),
  // --- the barrow chamber --------------------------------------------------
  /*  3 */ row(R('X', 12), R('C', 16), R('X', 12)),
  /*  4 */ row(R('X', 11), R('C', 18), R('X', 11)),
  /*  5 */ row(R('X', 11), R('C', 18), R('X', 11)),
  /*  6 */ row(R('X', 10), R('C', 20), R('X', 10)),
  /*  7 */ row(R('X', 10), R('C', 20), R('X', 10)),
  /*  8 */ row(R('X', 11), R('C', 18), R('X', 11)),
  /*  9 */ row(R('X', 11), R('C', 18), R('X', 11)),
  /* 10 */ row(R('X', 12), R('C', 16), R('X', 12)),
  /* 11 */ row(R('X', 18), R('C', 4), R('X', 18)),
  /* 12 */ row(R('X', 18), R('C', 4), R('X', 18)),
  // --- the drowned hall ----------------------------------------------------
  /* 13 */ row(R('X', 13), R('C', 14), R('X', 13)),
  /* 14 */ row(R('X', 12), R('C', 16), R('X', 12)),
  /* 15 */ row(R('X', 12), R('C', 6), R('~', 4), R('C', 6), R('X', 12)),
  /* 16 */ row(R('X', 12), R('C', 6), R('~', 4), R('C', 6), R('X', 12)),
  /* 17 */ row(R('X', 13), R('C', 14), R('X', 13)),
  /* 18 */ row(R('X', 13), R('C', 14), R('X', 13)),
  /* 19 */ row(R('X', 13), R('C', 14), R('X', 13)),
  /* 20 */ row(R('X', 18), R('C', 4), R('X', 18)),
  // --- the long gallery and its flanking cells -----------------------------
  /* 21 */ row(R('X', 4), R('C', 32), R('X', 4)),
  /* 22 */ row(R('X', 4), R('C', 10), R('X', 4), R('C', 4), R('X', 4), R('C', 10), R('X', 4)),
  /* 23 */ row(R('X', 4), R('C', 10), R('X', 4), R('C', 4), R('X', 4), R('C', 10), R('X', 4)),
  /* 24 */ row(R('X', 4), R('C', 10), R('X', 4), R('C', 4), R('X', 4), R('C', 10), R('X', 4)),
  /* 25 */ row(R('X', 4), R('C', 10), R('X', 4), R('C', 4), R('X', 4), R('C', 10), R('X', 4)),
  /* 26 */ row(R('X', 4), R('C', 32), R('X', 4)),
  /* 27 */ row(R('X', 18), R('C', 4), R('X', 18)),
  /* 28 */ row(R('X', 18), R('C', 4), R('X', 18)),
  // --- the entrance hall ---------------------------------------------------
  /* 29 */ row(R('X', 14), R('C', 12), R('X', 14)),
  /* 30 */ row(R('X', 14), R('C', 12), R('X', 14)),
  /* 31 */ row(R('X', 14), R('C', 12), R('X', 14)),
  /* 32 */ row(R('X', 18), R('C', 4), R('X', 18)),
  /* 33 */ row(R('X', 18), R('C', 4), R('X', 18)),
];

export const FEN_BARROW = {
  id: 'fen_barrow',
  name: 'The Fen Barrow',
  subtitle: 'Sealed in the Ninth Year',
  kind: 'dungeon',
  light: 'cave',
  grade: 'cave',
  fog: ['#1b2130', 26, 95],
  tilt: 0.34,
  cameraDistance: 15,
  cameraPitch: 0.66,
  music: 'marsh',
  base: 'cave',
  groundRamp: 'cave',
  wallHeight: 7.5,
  waterLevel: -0.30,
  water: { shallow: '#1b3548', deep: '#0d1824', foam: '#4d8493', waveHeight: 0.05 },
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [19, 32], face: 'north' },
    world: { at: [19, 32], face: 'north' },
  },

  exits: [
    { at: [18, 33], size: [4, 1], to: 'overworld', spawn: 'fenbarrow', prompt: 'Leave the barrow' },
  ],

  encounters: {
    rate: 18,
    terrain: 'cave',
    scenery: 'cave',
    groups: [
      { weight: 30, enemies: ['mireslug', 'mireslug'] },
      { weight: 24, enemies: ['carrionbat', 'carrionbat', 'carrionbat'] },
      { weight: 20, enemies: ['siltcrawler', 'bogwisp'] },
      { weight: 16, enemies: ['huskrevenant'] },
      { weight: 10, enemies: ['thornmaw', 'mireslug'] },
    ],
  },

  triggers: [
    {
      at: [18, 11], size: [4, 1], kind: 'event', event: 'fenbarrow_boss',
      once: true,
    },
  ],

  props: [
    // --- entrance ---------------------------------------------------------
    { kit: 'savepoint', at: [19.5, 30], id: 'fb-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [16.5, 30.5], id: 'fb-warning',
      interact: { name: 'Iron Plaque', text: [
        'SEALED IN THE NINTH YEAR OF THE QUIET.',
        'BELOW LIES A DEBT. DO NOT SETTLE IT.',
      ] } },
    // The step under the plaque. Three parishes leave things on it and none of
    // them can name who told them to.
    { kit: 'signpost', at: [17.6, 30.5], id: 'fb-step',
      interact: { prompt: 'The step under the plaque', event: 'fenbarrow_debt' } },
    { kit: 'barrel', at: [24.2, 30.4] },
    { kit: 'crate', at: [24.6, 29.4], rot: 0.4 },

    // --- gallery ----------------------------------------------------------
    { kit: 'rock', at: [8.5, 21.6], scale: 1.3, seed: 3, material: 'cave' },
    { kit: 'rock', at: [31.4, 21.4], scale: 1.5, seed: 5, material: 'cave' },
    { kit: 'rock', at: [15.5, 26.4], scale: 1.1, seed: 7, material: 'cave' },
    { kit: 'rock', at: [25.6, 26.6], scale: 1.2, seed: 9, material: 'cave' },

    // --- west cell --------------------------------------------------------
    { kit: 'chest', at: [7.5, 23.5], id: 'fb-chest-1',
      contains: { kind: 'item', id: 'scalecoat', count: 1, label: 'a Scale Coat' } },
    { kit: 'barrel', at: [11.2, 24.6] },
    { kit: 'rock', at: [5.6, 24.8], scale: 0.9, seed: 11, material: 'cave' },

    // --- east cell --------------------------------------------------------
    { kit: 'chest', at: [32.5, 23.5], id: 'fb-chest-2',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },
    { kit: 'crate', at: [28.4, 24.4], rot: 0.2 },

    // --- drowned hall -----------------------------------------------------
    { kit: 'chest', at: [14.5, 18.5], id: 'fb-chest-3',
      contains: { kind: 'item', id: 'lanternstaff', count: 1, label: 'a Lantern Staff' } },
    { kit: 'lamppost', at: [13.6, 14.4] },
    { kit: 'lamppost', at: [25.4, 14.4] },
    { kit: 'rock', at: [17.4, 19.4], scale: 1.0, seed: 13, material: 'cave' },
    { kit: 'rock', at: [22.6, 13.6], scale: 1.2, seed: 15, material: 'cave' },

    // --- the barrow chamber -----------------------------------------------
    { kit: 'rock', at: [12.5, 5.5], scale: 1.8, seed: 17, material: 'cave' },
    { kit: 'rock', at: [27.5, 5.5], scale: 1.8, seed: 19, material: 'cave' },
    { kit: 'rock', at: [13.0, 9.0], scale: 1.3, seed: 21, material: 'cave' },
    { kit: 'rock', at: [27.0, 9.0], scale: 1.3, seed: 23, material: 'cave' },
    { kit: 'well', at: [20, 6], id: 'fb-well', radius: 1.2,
      interact: { name: 'The Ninth Well', text: [
        'The shaft goes down further than the barrow should allow.',
        'Something at the bottom is breathing in time with you.',
      ] } },
  ],

  npcs: [],
};
