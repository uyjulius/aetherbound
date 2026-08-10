/**
 * The Weeping Wood.
 *
 * Not a corridor with trees on it: a set of clearings joined by narrow ways,
 * so the player is repeatedly enclosed and then released. The dense-forest
 * glyph blocks movement, which means the *shape* of the wood is drawn rather
 * than fenced — every wall here is a tree the player can see.
 */

const W = 40;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[weepingwood] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('f', 40)),
  /*  1 */ row(R('f', 40)),
  // --- the shrine clearing -------------------------------------------------
  /*  2 */ row(R('f', 12), R('.', 16), R('f', 12)),
  /*  3 */ row(R('f', 11), R('.', 18), R('f', 11)),
  /*  4 */ row(R('f', 11), R('.', 18), R('f', 11)),
  /*  5 */ row(R('f', 12), R('.', 16), R('f', 12)),
  /*  6 */ row(R('f', 18), R('.', 4), R('f', 18)),
  /*  7 */ row(R('f', 18), R('.', 4), R('f', 18)),
  // --- the long glade ------------------------------------------------------
  /*  8 */ row(R('f', 6), R('.', 28), R('f', 6)),
  /*  9 */ row(R('f', 6), R('.', 12), R('t', 4), R('.', 12), R('f', 6)),
  /* 10 */ row(R('f', 6), R('.', 28), R('f', 6)),
  /* 11 */ row(R('f', 6), R('.', 28), R('f', 6)),
  /* 12 */ row(R('f', 6), R('.', 8), R('f', 12), R('.', 8), R('f', 6)),
  /* 13 */ row(R('f', 6), R('.', 8), R('f', 12), R('.', 8), R('f', 6)),
  // --- west hollow and east hollow ----------------------------------------
  /* 14 */ row(R('f', 4), R('.', 12), R('f', 8), R('.', 12), R('f', 4)),
  /* 15 */ row(R('f', 4), R('.', 12), R('f', 8), R('.', 12), R('f', 4)),
  /* 16 */ row(R('f', 4), R('.', 12), R('f', 8), R('.', 12), R('f', 4)),
  /* 17 */ row(R('f', 4), R('.', 32), R('f', 4)),
  /* 18 */ row(R('f', 4), R('.', 32), R('f', 4)),
  /* 19 */ row(R('f', 8), R('.', 6), R('b', 12), R('.', 6), R('f', 8)),
  /* 20 */ row(R('f', 8), R('.', 24), R('f', 8)),
  // --- the approach --------------------------------------------------------
  /* 21 */ row(R('f', 10), R('.', 20), R('f', 10)),
  /* 22 */ row(R('f', 10), R('.', 20), R('f', 10)),
  /* 23 */ row(R('f', 16), R('.', 8), R('f', 16)),
  /* 24 */ row(R('f', 16), R('.', 8), R('f', 16)),
  /* 25 */ row(R('f', 18), R('.', 4), R('f', 18)),
  /* 26 */ row(R('f', 18), R('.', 4), R('f', 18)),
];

export const WEEPING_WOOD = {
  id: 'weeping_wood',
  name: 'The Weeping Wood',
  subtitle: 'Nothing Here Is Lost',
  kind: 'field',
  light: 'dusk',
  grade: 'dusk',
  fog: ['#5f6a52', 40, 150],
  tilt: 0.34,
  cameraDistance: 18,
  cameraPitch: 0.74,
  music: 'forest',
  base: 'grass',
  groundRamp: 'terrain',
  wallHeight: 7,

  sky: {
    zenith: '#3a4a6a', horizon: '#c8a882', ground: '#3e3a30',
    sunColor: '#ff9d63', sunDir: [-0.6, 0.28, 0.3], cloud: 0.5,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [19, 25], face: 'north' },
    world: { at: [19, 25], face: 'north' },
  },

  exits: [
    { at: [18, 26], size: [4, 1], to: 'overworld', spawn: 'weepingwood', prompt: 'Leave the wood' },
  ],

  /**
   * The wood after. Nothing about the trees changed, so the override carries
   * one thing only: the shrine step, on the narrow way up into the clearing.
   *
   * Idris buries his second sword here and nowhere else, and only once the sky
   * has changed — which is why the zone exists in the ruin block rather than in
   * the base map, where it would sit under his feet for the whole first half.
   */
  ruin: {
    subtitle: 'Nothing Here Is Lost',
    triggers: [
      { at: [19, 7], size: [2, 1], kind: 'event', event: 'idris_second_sword' },
    ],
  },

  encounters: {
    rate: 24, terrain: 'grass', scenery: 'field',
    groups: [
      { weight: 26, enemies: ['hollybound', 'lanternmoth'] },
      { weight: 24, enemies: ['bramblecolt', 'bramblecolt'] },
      { weight: 20, enemies: ['mourner'] },
      { weight: 18, enemies: ['lanternmoth', 'lanternmoth', 'glasswing'] },
      { weight: 12, enemies: ['hollybound', 'hollybound'] },
    ],
  },

  props: [
    // --- approach ---------------------------------------------------------
    { kit: 'savepoint', at: [19.5, 24.4], id: 'ww-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [17.4, 23.4], id: 'ww-sign',
      interact: { name: 'Weathered Post', text: [
        'The lettering has been grown over. What is left reads: — EEPING — OOD.',
        'Under it, freshly cut: TURN BACK OR BE QUIET. EITHER IS FINE.',
      ] } },
    { kit: 'tree', at: [12.5, 21.5], kind: 'autumn', scale: 1.3, seed: 3 },
    { kit: 'tree', at: [26.5, 21.0], kind: 'autumn', scale: 1.2, seed: 5 },
    { kit: 'bush', at: [15.5, 22.4], scale: 1.2, seed: 7, radius: 0 },

    // --- hollows ----------------------------------------------------------
    { kit: 'chest', at: [6.5, 15.5], id: 'ww-chest-1',
      contains: { kind: 'item', id: 'ashenkatana', count: 1, label: 'an Ashen Katana' } },
    { kit: 'chest', at: [32.5, 15.5], id: 'ww-chest-2',
      contains: { kind: 'item', id: 'hitonic', count: 4, label: '4 Hi-Tonics' } },
    { kit: 'tree', at: [8.0, 17.4], kind: 'dark', scale: 1.4, seed: 9 },
    { kit: 'tree', at: [31.0, 17.6], kind: 'dark', scale: 1.4, seed: 11 },
    { kit: 'rock', at: [10.5, 14.6], scale: 1.2, seed: 13 },

    // --- the long glade ---------------------------------------------------
    { kit: 'well', at: [19.5, 10.5], id: 'ww-spring', radius: 1.2,
      interact: { name: 'The Weeping Spring', text: [
        'Water comes up through the roots and goes nowhere. It has been doing this for a very long time.',
        'It tastes of copper and old rain.',
      ] } },
    // The path people walk in to ask things on. For a thousand years nothing
    // answered, which was the arrangement; since the spring it answers.
    { kit: 'signpost', at: [21.6, 10.6], id: 'ww-askingpath',
      interact: { prompt: 'The asking path', event: 'weeping_answer' } },
    { kit: 'tree', at: [9.0, 9.0], kind: 'broadleaf', scale: 1.5, seed: 15 },
    { kit: 'tree', at: [30.0, 9.0], kind: 'broadleaf', scale: 1.5, seed: 17 },
    { kit: 'bench', at: [16.0, 11.6], rot: 0.2 },

    // --- the shrine -------------------------------------------------------
    { kit: 'building', at: [20, 3.4], w: 7, d: 4.4, h: 3.4, rise: 2.0,
      style: 'stone', roof: 'thatch', door: 'south', windows: false, id: 'ww-shrine' },
    { kit: 'rock', at: [15.0, 4.2], scale: 1.6, seed: 19 },
    { kit: 'rock', at: [25.0, 4.2], scale: 1.6, seed: 21 },
    { kit: 'chest', at: [14.0, 2.6], id: 'ww-chest-3',
      contains: { kind: 'item', id: 'quietedge', count: 1, label: 'the Quiet Edge' } },
  ],

  npcs: [
    {
      id: 'idris', name: 'Ser Idris Vance', at: [20, 5.6], face: 'south', clip: 'sit',
      prompt: 'Speak', event: 'recruit_idris',
      look: { id: 'idris', build: 'heavy', height: 1.86, hair: 'braid', eyeStyle: 'sharp', expression: 'angry',
        colors: { skin: '#dbb28c', hair: '#241d26', torso: '#1f4033', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943', gloves: '#666c74', metal: '#8b9199' } },
    },
    {
      id: 'ww-hermit', name: 'The Quiet Woman', at: [24.0, 18.0], face: 'west',
      clip: 'loiter', prompt: 'Speak', wander: 1,
      look: { build: 'slim', height: 1.64, hair: 'long',
        colors: { skin: '#9a6147', hair: '#dedbe0', torso: '#3f4a6b', accent: '#57653a',
          legs: '#4d422a', boots: '#3a2a20', cape: '#2f4a36' }, expression: 'sad' },
      talk: [
        'The wood took the sound out of itself the year Ashenhall burned. It has not given it back.',
        'Shout if you like. It will not carry, and something will still hear you.',
      ],
    },
  ],
};
