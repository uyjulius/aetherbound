/**
 * Interiors.
 *
 * Small hand-authored rooms, one per building that matters. They are cheap to
 * enter and leave, which is the whole point — a town where you can open four
 * doors is a much bigger place than a town where you can open none, and the
 * cost per door is one screen of data.
 *
 * Every interior is lit by `interior` (warm lamplight, cool bounce) with the
 * sky switched off, so stepping through a door produces an immediate and
 * unmistakable change of register.
 */

const R = (ch, n) => ch.repeat(n);

/** Rooms are small enough to write directly, with a width assertion. */
function makeRoom(width, rows, label) {
  return rows.map((r) => {
    if (r.length !== width) {
      throw new Error(`[${label}] row is ${r.length} columns, expected ${width}: ${r}`);
    }
    return r;
  });
}

const INTERIOR_BASE = {
  kind: 'interior',
  light: 'interior',
  grade: 'cave',
  fog: ['#2a2018', 22, 70],
  tilt: 0.30,
  cameraDistance: 12,
  cameraPitch: 0.62,
  base: 'wood',
  groundRamp: 'interior',
  wallHeight: 4.2,
  wallMaterial: 'plaster',
  lampIntensity: 8,
  sky: null,
  music: 'inn',
};

// ---------------------------------------------------------------------------
// The Kettle & Cinder — Harrowmere's inn
// ---------------------------------------------------------------------------

export const INN_HARROWMERE = {
  ...INTERIOR_BASE,
  id: 'inn_harrowmere',
  name: 'The Kettle & Cinder',
  subtitle: 'Harrowmere',
  terrain: makeRoom(18, [
    '##################',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '########oo########',
  ], 'inn_harrowmere'),

  spawns: { default: { at: [8, 7], face: 'north' } },
  exits: [{ at: [8, 8], size: [2, 1], to: 'harrowmere', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [3.5, 3.0], rot: 0 },
    { kit: 'bench', at: [3.5, 5.0], rot: 0 },
    { kit: 'bench', at: [13.5, 3.0], rot: 0 },
    { kit: 'bench', at: [13.5, 5.0], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.5] },
    { kit: 'barrel', at: [2.6, 2.2] },
    { kit: 'crate', at: [15.4, 1.6], rot: 0.3 },
    { kit: 'lamppost', at: [5.5, 2.0] },
    { kit: 'lamppost', at: [12.0, 2.0] },
    { kit: 'chest', at: [15.5, 6.5], id: 'inn-hm-chest',
      contains: { kind: 'item', id: 'hipotion', count: 2, label: '2 Hi-Potions' } },
    { kit: 'signpost', at: [6.5, 6.5], id: 'inn-hm-board',
      interact: { name: 'Notice Board', text: [
        'A card reads: LOST — one grey cat, answers to nothing, has never answered to anything.',
        'Beneath it, newer: FOUND — the road south. Do not use it after dark.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-hm-keeper', name: 'Marla', at: [9.0, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8b2a2c', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 30, name: 'The Kettle & Cinder' },
      talk: ['Thirty gil and the fire is already lit. Mind the step on the way up.'],
    },
    {
      // The surveyor question starts here: he has been going over it since
      // spring, and he is the one who sends you on to Odo's ledger.
      id: 'inn-hm-drunk', name: 'Regular', at: [4.5, 4.0], face: 'east', clip: 'sit', prompt: 'Speak',
      event: 'surveyor_question',
      look: { build: 'normal', height: 1.74, hair: 'short',
        colors: { skin: '#9a6147', hair: '#5e5163', torso: '#6b5d37', accent: '#4b382d',
          legs: '#5e412c', boots: '#3a2a20' } },
      talk: [
        'Ferran surveyor came through in the spring. Bought a round. Asked where the old barrow was.',
        'Everybody told him. That is the part I keep going over.',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Halloran Forge — Harrowmere's smith
// ---------------------------------------------------------------------------

export const FORGE_HARROWMERE = {
  ...INTERIOR_BASE,
  id: 'forge_harrowmere',
  name: 'Halloran Forge',
  subtitle: 'Harrowmere',
  base: 'cobble',
  music: 'town_harrowmere',
  terrain: makeRoom(16, [
    '################',
    '#==============#',
    '#==============#',
    '#==============#',
    '#==============#',
    '#==============#',
    '#######==#######',
  ], 'forge_harrowmere'),

  spawns: { default: { at: [7, 5], face: 'north' } },
  exits: [{ at: [7, 6], size: [2, 1], to: 'harrowmere', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.6, 2.4] },
    { kit: 'crate', at: [13.2, 1.6], rot: 0.4 },
    { kit: 'crate', at: [13.0, 2.6], rot: -0.2 },
    { kit: 'lamppost', at: [4.5, 1.6] },
    { kit: 'lamppost', at: [11.5, 1.6] },
    { kit: 'chest', at: [13.5, 4.5], id: 'forge-hm-chest',
      contains: { kind: 'item', id: 'guardsabre', count: 1, label: 'a Guard Sabre' } },
  ],

  npcs: [
    {
      // Halloran at the pattern rather than at the rack: the bearing errand is
      // held here, and the arms counter stays with the Halloran standing in the
      // square outside his own door, so nothing about trading with him moves.
      id: 'forge-hm-smith', name: 'Halloran', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.92, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      event: 'forge_brass',
      talk: ['Come in, shut the door. The heat is the only thing I have got left worth keeping.'],
    },
  ],
};

// ---------------------------------------------------------------------------
// Marrow & Salt — Harrowmere's supplies
// ---------------------------------------------------------------------------

export const SHOP_HARROWMERE = {
  ...INTERIOR_BASE,
  id: 'shop_harrowmere',
  name: 'Marrow & Salt',
  subtitle: 'Harrowmere',
  music: 'town_harrowmere',
  terrain: makeRoom(14, [
    '##############',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '######oo######',
  ], 'shop_harrowmere'),

  spawns: { default: { at: [6, 4], face: 'north' } },
  exits: [{ at: [6, 5], size: [2, 1], to: 'harrowmere', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.5], rot: 0.2 },
    { kit: 'crate', at: [2.2, 2.4], rot: -0.3 },
    { kit: 'barrel', at: [11.4, 1.6] },
    { kit: 'barrel', at: [11.0, 2.5] },
    { kit: 'lamppost', at: [6.5, 1.4] },
    { kit: 'flowerbox', at: [4.0, 3.4] },
  ],

  npcs: [
    {
      // Odo at the ledger rather than at the counter — the line about the map
      // case is written in it, and the ledger lives in the shop. The stall Odo
      // keeps in the square outside still sells, so the stock is not lost.
      id: 'shop-hm-keeper', name: 'Odo', at: [7.0, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.74, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#33477c', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      event: 'surveyor_ledger',
      talk: ['Everything on the shelf, nothing under the counter. I sleep well.'],
    },
    {
      id: 'oda', name: 'Grandmaster Oda', at: [10.5, 3.2], face: 'west', clip: 'sit',
      prompt: 'Speak', event: 'recruit_oda',
      look: { id: 'oda', build: 'athletic', height: 1.70, hair: 'bald', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#171319', torso: '#8b2a2c', accent: '#ddccab',
          legs: '#8b2a2c', boots: '#4b382d', gloves: '#7c4939' } },
    },
  ],
};

// ---------------------------------------------------------------------------
// The Engine House — Solmere's palace
// ---------------------------------------------------------------------------

/**
 * The east end of the hall — the wall Rusk was posted against in year forty-one,
 * and the rectangle of clean brick where something used to hang beside him. He
 * has to be relieved standing where he stood, so the scene is a zone rather than
 * a second conversation on the construct itself.
 *
 * In the const because the ruined Engine House restates its triggers.
 */
const PALACE_SOLMERE_TRIGGERS = [
  { at: [18, 3], size: [3, 2], kind: 'event', event: 'rusk_stand_down' },
];

export const PALACE_SOLMERE = {
  ...INTERIOR_BASE,
  id: 'palace_solmere',
  name: 'The Engine House',
  subtitle: 'Solmere',
  base: 'marble',
  grade: 'magitek',
  light: 'magitek',
  wallMaterial: 'marble',
  wallHeight: 6.5,
  music: 'solmere',
  cameraDistance: 15,
  terrain: makeRoom(24, [
    '########################',
    '#MMMMMMMMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMMMMMMMM#',
    '###########MM###########',
  ], 'palace_solmere'),

  spawns: { default: { at: [11, 7], face: 'north' } },
  exits: [{ at: [11, 8], size: [2, 1], to: 'solmere', spawn: 'default', prompt: 'Outside' }],

  triggers: PALACE_SOLMERE_TRIGGERS,

  /**
   * The Engine House after. The roof over the east end is gone and the lattice
   * is still turning, because it was never wired to care about the roof.
   *
   * The Under-Clerk is still signing for the draw — same post, same sheets, no
   * one left to hand them to — and he is the one who puts the decision to the
   * party, so the base clerk is swapped for the one who carries the scene.
   */
  ruin: {
    subtitle: 'Solmere — What Is Still Turning',
    fog: ['#2b1f18', 20, 64],
    music: 'ruins',
    removeNpcs: ['palace-clerk'],
    triggers: PALACE_SOLMERE_TRIGGERS,
    npcs: [
      {
        id: 'palace-clerk-ruin', name: 'Under-Clerk', at: [9, 3], face: 'east', clip: 'work',
        prompt: 'Speak', event: 'the_last_measure',
        look: { build: 'slim', height: 1.68, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#dbb28c', hair: '#95602d', torso: '#4b64a3', accent: '#d8ac31',
            legs: '#2b2933', boots: '#3b3943', gloves: '#97929a' } },
      },
    ],
  },

  props: [
    { kit: 'lamppost', at: [4.5, 2.0] },
    { kit: 'lamppost', at: [19.0, 2.0] },
    { kit: 'lamppost', at: [4.5, 6.0] },
    { kit: 'lamppost', at: [19.0, 6.0] },
    { kit: 'bench', at: [7.0, 5.5], rot: 0 },
    { kit: 'bench', at: [16.5, 5.5], rot: 0 },
    { kit: 'well', at: [11.8, 2.4], id: 'palace-core', radius: 1.2,
      interact: { name: 'The Tamed Engine', text: [
        'A lattice the size of a cart, suspended in a brass cradle, turning very slowly.',
        'There is a name etched on the inner ring. It is a woman\'s name and nobody in Solmere will say it aloud.',
      ] } },
    { kit: 'chest', at: [3.0, 4.5], id: 'palace-chest-1',
      contains: { kind: 'item', id: 'earnestcharm', count: 1, label: 'an Earnest Charm' } },
    { kit: 'chest', at: [20.5, 4.5], id: 'palace-chest-2',
      contains: { kind: 'item', id: 'hitonic', count: 5, label: '5 Hi-Tonics' } },
  ],

  npcs: [
    {
      id: 'palace-clerk', name: 'Under-Clerk', at: [8.5, 4.0], face: 'east', clip: 'work',
      prompt: 'Speak', wander: 1,
      look: { build: 'slim', height: 1.68, hair: 'short',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943' } },
      talk: [
        'Eleven measures a day, and every one of them signed for.',
        'The signature at the bottom of every page is the same, and it has been the same for eleven years, and it is not the King\'s.',
      ],
    },
    {
      id: 'rusk', name: 'Rusk', at: [15.0, 3.4], face: 'west', clip: 'idle',
      prompt: 'Speak', event: 'recruit_rusk',
      look: { id: 'rusk', build: 'hulking', height: 2.05, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#8b9199', hair: '#4a4f57', torso: '#5b6674', accent: '#1a8fa5',
          legs: '#414954', boots: '#22242a', gloves: '#666c74', metal: '#a6b0bc' } },
    },
  ],
};

export const INTERIORS = {
  inn_harrowmere: INN_HARROWMERE,
  forge_harrowmere: FORGE_HARROWMERE,
  shop_harrowmere: SHOP_HARROWMERE,
  palace_solmere: PALACE_SOLMERE,
};
