/**
 * Ashenhall — the lantern-keepers' seat, burned in the War of Cinders.
 *
 * Laid out as a cathedral: a long nave you approach down, two transepts
 * crossing it, and the reliquary at the head. The shape does the storytelling —
 * you walk the length of a building that was built to make you feel small, and
 * everything in it is dead.
 */

const W = 38;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[ashenhall] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 38)),
  /*  1 */ row(R('#', 38)),
  // --- the reliquary -------------------------------------------------------
  /*  2 */ row(R('#', 10), R('M', 18), R('#', 10)),
  /*  3 */ row(R('#', 9), R('M', 20), R('#', 9)),
  /*  4 */ row(R('#', 9), R('M', 20), R('#', 9)),
  /*  5 */ row(R('#', 9), R('M', 20), R('#', 9)),
  /*  6 */ row(R('#', 10), R('M', 18), R('#', 10)),
  /*  7 */ row(R('#', 16), R('M', 6), R('#', 16)),
  /*  8 */ row(R('#', 16), R('M', 6), R('#', 16)),
  // --- upper transept ------------------------------------------------------
  /*  9 */ row(R('#', 6), R('M', 26), R('#', 6)),
  /* 10 */ row(R('#', 6), R('M', 26), R('#', 6)),
  /* 11 */ row(R('#', 6), R('M', 26), R('#', 6)),
  /* 12 */ row(R('#', 6), R('M', 26), R('#', 6)),
  // --- the nave ------------------------------------------------------------
  /* 13 */ row(R('#', 14), R('M', 10), R('#', 14)),
  /* 14 */ row(R('#', 14), R('M', 10), R('#', 14)),
  /* 15 */ row(R('#', 14), R('M', 10), R('#', 14)),
  /* 16 */ row(R('#', 14), R('M', 10), R('#', 14)),
  /* 17 */ row(R('#', 14), R('M', 10), R('#', 14)),
  // --- lower transept ------------------------------------------------------
  /* 18 */ row(R('#', 6), R('M', 26), R('#', 6)),
  /* 19 */ row(R('#', 6), R('M', 26), R('#', 6)),
  /* 20 */ row(R('#', 6), R('M', 26), R('#', 6)),
  /* 21 */ row(R('#', 6), R('M', 26), R('#', 6)),
  // --- the approach --------------------------------------------------------
  /* 22 */ row(R('#', 14), R('M', 10), R('#', 14)),
  /* 23 */ row(R('#', 14), R('M', 10), R('#', 14)),
  /* 24 */ row(R('#', 14), R('M', 10), R('#', 14)),
  /* 25 */ row(R('#', 16), R('M', 6), R('#', 16)),
  /* 26 */ row(R('#', 16), R('M', 6), R('#', 16)),
  /* 27 */ row(R('#', 16), R('M', 6), R('#', 16)),
];

/**
 * Scripted zones.
 *
 * The reliquary boss sits at the head of the nave; the two quiet scenes sit off
 * to either side of it, because both of them are about standing in a particular
 * spot rather than about meeting anybody:
 *
 *   - the west alcoves, where Wick was taught eight names at six years old
 *   - the worn patch in the lower transept, which is the floor of the school
 *
 * The ruined hall restates these and adds the choir, since `resolveMap`
 * replaces a trigger list rather than merging it.
 */
const ASHENHALL_TRIGGERS = [
  { at: [16, 8], size: [6, 1], kind: 'event', event: 'ashenhall_reliquary', once: true },
  { at: [10, 4], size: [2, 2], kind: 'event', event: 'wick_eighth_name' },
  { at: [9, 20], size: [2, 2], kind: 'event', event: 'oda_ninth_form' },
];

export const ASHENHALL = {
  id: 'ashenhall',
  name: 'Ashenhall',
  subtitle: 'Seat of the Nine Lanterns',
  kind: 'dungeon',
  light: 'ruin',
  grade: 'ruin',
  fog: ['#2a2430', 24, 90],
  tilt: 0.36,
  cameraDistance: 16,
  cameraPitch: 0.68,
  music: 'ruins',
  base: 'marble',
  groundRamp: 'cave',
  wallHeight: 11,
  wallMaterial: 'stone',
  lampIntensity: 7,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [18, 26], face: 'north' },
    world: { at: [18, 26], face: 'north' },
  },

  exits: [
    { at: [16, 27], size: [6, 1], to: 'overworld', spawn: 'ashenhall', prompt: 'Leave Ashenhall' },
  ],

  triggers: ASHENHALL_TRIGGERS,

  /**
   * Ashenhall after. The hall was already burnt and already dark, so nothing
   * about the place changes — what changes is that the eight alcoves the party
   * emptied are lit again, on the far side of the reliquary from Wick's.
   */
  ruin: {
    subtitle: 'Nine Alcoves, Eight Lit',
    triggers: [
      ...ASHENHALL_TRIGGERS,
      { at: [22, 3], size: [3, 2], kind: 'event', event: 'choir_under_ashenhall' },
    ],
  },

  encounters: {
    rate: 22, terrain: 'marble', scenery: 'none',
    groups: [
      { weight: 28, enemies: ['lanternbearer', 'huskrevenant'] },
      { weight: 24, enemies: ['ashknight'] },
      { weight: 20, enemies: ['reliquary'] },
      { weight: 16, enemies: ['ashknight', 'lanternbearer'] },
      { weight: 12, enemies: ['cairnwight', 'cairnwight'] },
    ],
  },

  props: [
    // --- the approach ------------------------------------------------------
    { kit: 'savepoint', at: [18.5, 25.4], id: 'ah-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [15.5, 24.6], id: 'ah-plaque',
      interact: { name: 'Burned Plaque', text: [
        'Eight names have been chiselled out. The ninth was never carved.',
        'Beneath, in a different hand: SHE KEPT IT. SHE WAS RIGHT TO.',
      ] } },
    { kit: 'lamppost', at: [15.5, 22.5] },
    { kit: 'lamppost', at: [21.5, 22.5] },

    // --- lower transept ----------------------------------------------------
    { kit: 'rock', at: [8.0, 19.5], scale: 1.4, seed: 3 },
    { kit: 'rock', at: [29.0, 19.5], scale: 1.6, seed: 5 },
    { kit: 'chest', at: [7.5, 20.5], id: 'ah-chest-1',
      contains: { kind: 'item', id: 'crownofsalt', count: 1, label: 'a Crown of Salt' } },
    { kit: 'chest', at: [30.0, 20.5], id: 'ah-chest-2',
      contains: { kind: 'item', id: 'xpotion', count: 3, label: '3 X-Potions' } },
    { kit: 'lamppost', at: [10.5, 19.0] },
    { kit: 'lamppost', at: [27.0, 19.0] },

    // --- the nave ----------------------------------------------------------
    { kit: 'bench', at: [15.4, 15.0], rot: 0 },
    { kit: 'bench', at: [21.6, 15.0], rot: 0 },
    { kit: 'bench', at: [15.4, 16.6], rot: 0 },
    { kit: 'bench', at: [21.6, 16.6], rot: 0 },
    { kit: 'lamppost', at: [15.0, 13.6] },
    { kit: 'lamppost', at: [22.0, 13.6] },

    // --- upper transept ----------------------------------------------------
    { kit: 'chest', at: [7.5, 10.5], id: 'ah-chest-3',
      contains: { kind: 'item', id: 'mirrorshield', count: 1, label: 'a Mirror Shield' } },
    { kit: 'chest', at: [30.0, 10.5], id: 'ah-chest-4',
      contains: { kind: 'item', id: 'megalixir', count: 1, label: 'a Megalixir' } },
    { kit: 'rock', at: [9.5, 11.5], scale: 1.3, seed: 7 },
    { kit: 'rock', at: [28.0, 11.5], scale: 1.2, seed: 9 },
    { kit: 'lamppost', at: [12.0, 10.0] },
    { kit: 'lamppost', at: [25.0, 10.0] },

    // --- the reliquary -----------------------------------------------------
    { kit: 'well', at: [19, 4], id: 'ah-reliquary', radius: 1.2,
      interact: { name: 'The Ninth Alcove', text: [
        'Eight alcoves stand empty and scoured. The ninth still holds its lamp.',
        'It has been burning, unattended, for a thousand years.',
      ] } },
    // The rail in front of the ninth alcove. After the change there is a card
    // hooked to it, and a man on the door who wrote it himself.
    { kit: 'signpost', at: [19.0, 5.6], id: 'ah-alcove-card',
      interact: { prompt: 'The card on the rail', event: 'ashenhall_cleaned' } },
    { kit: 'lamppost', at: [13.0, 4.0] },
    { kit: 'lamppost', at: [25.0, 4.0] },
    { kit: 'rock', at: [11.5, 3.0], scale: 1.5, seed: 11 },
    { kit: 'rock', at: [26.5, 3.0], scale: 1.5, seed: 13 },
  ],

  npcs: [],
};
