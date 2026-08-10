/**
 * The Hollow Mine — read it as a section, not a plan.
 *
 * The map is drawn the way a mine surveyor draws one: a single shaft running
 * the whole height of the sheet, with the galleries hanging off it like rungs.
 * You come in at the adit, at the bottom of the sheet, and every gallery above
 * it is a level deeper. There is exactly one spine and there is never any
 * question which way is down — but each gallery is narrower than the one below
 * it, so the mine closes around the player by degrees rather than all at once.
 *
 * Two winzes cut between adjacent galleries off to the side. They are shorter
 * than going back to the shaft and they are where the money is, which is the
 * only argument this dungeon makes for leaving the spine.
 *
 * The deepest gallery is the sump. The company stopped digging there. The
 * company did not stop digging because the seam ran out.
 *
 * Rows use the same run-length notation as the other dungeons; a miscounted
 * row underground is an invisible hole in a wall.
 */

const W = 44;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[hollowmine] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('X', 44)),
  /*  1 */ row(R('X', 44)),
  /*  2 */ row(R('X', 44)),
  // --- the sump: the bottom of the shaft, and the end of the seam -----------
  /*  3 */ row(R('X', 8), R('C', 28), R('X', 8)),
  /*  4 */ row(R('X', 7), R('C', 30), R('X', 7)),
  /*  5 */ row(R('X', 7), R('C', 30), R('X', 7)),
  /*  6 */ row(R('X', 8), R('C', 28), R('X', 8)),
  /*  7 */ row(R('X', 8), R('C', 28), R('X', 8)),
  /*  8 */ row(R('X', 20), R('C', 4), R('X', 20)),
  /*  9 */ row(R('X', 20), R('C', 4), R('X', 20)),
  /* 10 */ row(R('X', 20), R('C', 4), R('X', 20)),
  // --- fifth gallery: pillared, and barely a gallery at all -----------------
  /* 11 */ row(R('X', 14), R('C', 16), R('X', 14)),
  /* 12 */ row(R('X', 14), R('C', 16), R('X', 14)),
  /* 13 */ row(R('X', 14), R('C', 4), R('X', 2), R('C', 4), R('X', 2), R('C', 4), R('X', 14)),
  /* 14 */ row(R('X', 14), R('C', 16), R('X', 14)),
  /* 15 */ row(R('X', 20), R('C', 4), R('X', 20)),
  /* 16 */ row(R('X', 20), R('C', 4), R('X', 20)),
  /* 17 */ row(R('X', 20), R('C', 4), R('X', 20)),
  // --- fourth gallery, with the head of the upper winze --------------------
  /* 18 */ row(R('X', 12), R('C', 20), R('X', 12)),
  /* 19 */ row(R('X', 12), R('C', 20), R('X', 12)),
  /* 20 */ row(R('X', 12), R('C', 24), R('X', 8)),
  /* 21 */ row(R('X', 12), R('C', 24), R('X', 8)),
  /* 22 */ row(R('X', 20), R('C', 4), R('X', 8), R('C', 4), R('X', 8)),
  /* 23 */ row(R('X', 20), R('C', 4), R('X', 8), R('C', 4), R('X', 8)),
  /* 24 */ row(R('X', 20), R('C', 4), R('X', 8), R('C', 4), R('X', 8)),
  // --- third gallery, with the foot of the upper winze ---------------------
  /* 25 */ row(R('X', 10), R('C', 26), R('X', 8)),
  /* 26 */ row(R('X', 10), R('C', 26), R('X', 8)),
  /* 27 */ row(R('X', 10), R('C', 26), R('X', 8)),
  /* 28 */ row(R('X', 10), R('C', 26), R('X', 8)),
  /* 29 */ row(R('X', 20), R('C', 4), R('X', 20)),
  /* 30 */ row(R('X', 20), R('C', 4), R('X', 20)),
  /* 31 */ row(R('X', 20), R('C', 4), R('X', 20)),
  // --- second gallery: the pillar hall, and the head of the lower winze ----
  /* 32 */ row(R('X', 6), R('C', 32), R('X', 6)),
  /* 33 */ row(R('X', 6), R('C', 6), R('X', 3), R('C', 14), R('X', 3), R('C', 6), R('X', 6)),
  /* 34 */ row(R('X', 6), R('C', 6), R('X', 3), R('C', 14), R('X', 3), R('C', 6), R('X', 6)),
  /* 35 */ row(R('X', 6), R('C', 32), R('X', 6)),
  /* 36 */ row(R('X', 8), R('C', 4), R('X', 8), R('C', 4), R('X', 20)),
  /* 37 */ row(R('X', 8), R('C', 4), R('X', 8), R('C', 4), R('X', 20)),
  /* 38 */ row(R('X', 8), R('C', 4), R('X', 8), R('C', 4), R('X', 20)),
  // --- first gallery: the working level, and the widest ground in the mine -
  /* 39 */ row(R('X', 4), R('C', 36), R('X', 4)),
  /* 40 */ row(R('X', 4), R('C', 36), R('X', 4)),
  /* 41 */ row(R('X', 4), R('C', 10), R('X', 4), R('C', 8), R('X', 4), R('C', 10), R('X', 4)),
  /* 42 */ row(R('X', 4), R('C', 36), R('X', 4)),
  // --- the adit -------------------------------------------------------------
  /* 43 */ row(R('X', 20), R('C', 4), R('X', 20)),
  /* 44 */ row(R('X', 20), R('C', 4), R('X', 20)),
  /* 45 */ row(R('X', 20), R('C', 4), R('X', 20)),
];

export const HOLLOW_MINE = {
  id: 'hollowmine',
  name: 'The Hollow Mine',
  subtitle: 'Five Levels and a Sump',
  kind: 'dungeon',
  light: 'cave',
  grade: 'cave',
  fog: ['#191720', 20, 88],
  tilt: 0.37,
  cameraDistance: 15,
  cameraPitch: 0.66,
  music: 'dungeon',
  base: 'cave',
  groundRamp: 'cave',
  // Tall, so the shaft reads as a shaft when you are standing at the bottom
  // of it looking up at four storeys of dressed rock.
  wallHeight: 12,
  lampIntensity: 8,
  lampRange: 13,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [22, 44], face: 'north' },
    world: { at: [22, 44], face: 'north' },
  },

  exits: [
    { at: [20, 45], size: [4, 1], to: 'overworld', spawn: 'hollowmine',
      prompt: 'Leave by the adit' },
  ],

  triggers: [],

  encounters: {
    rate: 20, terrain: 'cave', scenery: 'cave',
    groups: [
      { weight: 28, enemies: ['carrionbat', 'carrionbat', 'carrionbat'] },
      { weight: 24, enemies: ['gearwright', 'cairnwight'] },
      { weight: 20, enemies: ['aetherleech', 'aetherleech'] },
      { weight: 16, enemies: ['magitekarmour'] },
      { weight: 12, enemies: ['vaultsentinel'] },
    ],
  },

  props: [
    // --- the adit and the first gallery -------------------------------------
    { kit: 'savepoint', at: [22.5, 42.4], id: 'hm-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [19.4, 42.6], id: 'hm-board',
      interact: { name: 'Shift Board', text: [
        'A slate with six levels chalked down the side and a tally against each.',
        'Levels one to five are ruled off in a clerk\'s hand.',
        'Against the sump someone has written, much later: LEAVE IT.',
      ] } },
    { kit: 'lamppost', at: [8.0, 40.0] },
    { kit: 'lamppost', at: [36.0, 40.0] },
    { kit: 'cart', at: [15.5, 39.5], rot: 0.2 },
    { kit: 'crate', at: [30.4, 39.6], rot: 0.5 },
    { kit: 'barrel', at: [31.6, 40.4] },
    { kit: 'chest', at: [5.5, 39.5], id: 'hm-chest-1',
      contains: { kind: 'item', id: 'elixir', count: 3, label: '3 Elixirs' } },
    { kit: 'rock', at: [12.5, 42.4], scale: 1.2, seed: 3, material: 'cave' },
    { kit: 'rock', at: [31.5, 42.6], scale: 1.1, seed: 5, material: 'cave' },

    // --- the lower winze -----------------------------------------------------
    { kit: 'lamppost', at: [9.5, 37.5] },
    { kit: 'chest', at: [9.5, 36.5], id: 'hm-chest-2',
      contains: { kind: 'item', id: 'hoardersglove', count: 1, label: 'a Hoarder\'s Glove' } },

    // --- the second gallery ---------------------------------------------------
    { kit: 'savepoint', at: [7.5, 32.6], id: 'hm-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [7.0, 34.5] },
    { kit: 'lamppost', at: [36.0, 34.5] },
    { kit: 'cart', at: [26.5, 32.6], rot: 1.4 },
    { kit: 'barrel', at: [36.4, 33.4] },
    { kit: 'chest', at: [36.5, 32.5], id: 'hm-chest-3',
      contains: { kind: 'item', id: 'boltdirk', count: 1, label: 'a Bolt Dirk' } },
    { kit: 'rock', at: [16.0, 35.4], scale: 1.4, seed: 7, material: 'cave' },
    { kit: 'rock', at: [27.5, 35.6], scale: 1.3, seed: 9, material: 'cave' },

    // --- the third gallery ----------------------------------------------------
    { kit: 'lamppost', at: [11.5, 26.5] },
    { kit: 'lamppost', at: [34.0, 26.5] },
    { kit: 'crate', at: [12.6, 27.6], rot: 0.8 },
    { kit: 'chest', at: [11.5, 25.5], id: 'hm-chest-4',
      contains: { kind: 'item', id: 'ironbrooch', count: 1, label: 'an Iron Brooch' } },
    { kit: 'rock', at: [16.5, 27.4], scale: 1.2, seed: 11, material: 'cave' },
    { kit: 'rock', at: [29.0, 25.4], scale: 1.1, seed: 13, material: 'cave' },

    // --- the upper winze -------------------------------------------------------
    { kit: 'lamppost', at: [33.5, 23.5] },

    // --- the fourth gallery ------------------------------------------------------
    { kit: 'savepoint', at: [13.5, 18.6], id: 'hm-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [14.0, 20.5] },
    { kit: 'lamppost', at: [30.0, 20.5] },
    { kit: 'chest', at: [34.5, 20.5], id: 'hm-chest-5',
      contains: { kind: 'item', id: 'xpotion', count: 3, label: '3 X-Potions' } },
    { kit: 'rock', at: [17.5, 19.4], scale: 1.3, seed: 15, material: 'cave' },
    { kit: 'rock', at: [26.5, 21.6], scale: 1.2, seed: 17, material: 'cave' },

    // --- the fifth gallery ---------------------------------------------------
    { kit: 'lamppost', at: [15.5, 12.5] },
    { kit: 'lamppost', at: [28.0, 12.5] },
    { kit: 'chest', at: [15.5, 11.5], id: 'hm-chest-6',
      contains: { kind: 'item', id: 'longspear', count: 1, label: 'a Longspear' } },
    { kit: 'barrel', at: [28.4, 11.4] },

    // --- the sump --------------------------------------------------------------
    { kit: 'savepoint', at: [22.5, 6.6], id: 'hm-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The terminal feature of the mine, carrying the shift that never signed
    // out. The board beside it keeps the description of the sump itself.
    { kit: 'well', at: [21.5, 4.5], id: 'hm-sump', radius: 1.1, interactRadius: 2.4,
      interact: { prompt: 'The Sump', event: 'last_shift' } },
    { kit: 'signpost', at: [24.5, 3.5], id: 'hm-sump-board',
      interact: { name: 'The Sump', text: [
        'The bottom of the mine, and a hole in the bottom of the bottom.',
        'The seam did not run out here. It changed into something else, and the',
        'something else goes down past where the company was willing to follow.',
      ] } },
    // What the seam changed into is behind this, one wall further west than the
    // company was ever willing to cut.
    { kit: 'signpost', at: [12.5, 5.5], id: 'hm-engine-door',
      interact: { prompt: 'The door in the rock', event: 'first_engine' } },
    { kit: 'lamppost', at: [11.0, 4.5] },
    { kit: 'lamppost', at: [32.0, 4.5] },
    { kit: 'rock', at: [10.0, 6.4], scale: 1.8, seed: 19, material: 'cave' },
    { kit: 'rock', at: [33.0, 6.6], scale: 1.8, seed: 21, material: 'cave' },
    { kit: 'crate', at: [14.4, 3.4], rot: 0.4 },
    { kit: 'chest', at: [29.5, 3.5], id: 'hm-chest-7',
      contains: { kind: 'item', id: 'megalixir', count: 2, label: '2 Megalixirs' } },
    // Left in the sump by whoever was down here last, which was not the company.
    { kit: 'chest', at: [18.5, 6.5], id: 'hm-chest-8',
      contains: { kind: 'item', id: 'sundersong', count: 1, label: 'Sundersong' } },
  ],

  npcs: [],
};
