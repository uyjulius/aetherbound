/**
 * Lowfen — a town with somewhere else to be.
 *
 * The fen takes it four winters in five. Everyone knows this, nobody has ever
 * left, and the answer they arrived at some centuries ago was not to build
 * higher but to build *twice*.
 *
 * So the map is two towns stacked one above the other, and the player can see
 * both from anywhere. The lower town is a single timber spine running the width
 * of the fen with five short spurs hanging off it, each ending in a platform on
 * piles — a comb, laid flat on the water. That is where Lowfen lives from March
 * to November. Below and around it, the ground is silt, reed and standing
 * shallows you can wade through at low water, which is how half the town gets
 * about anyway.
 *
 * And above it, up the bank, is the terrace: a wide bare shelf of dry ground
 * with no buildings on it whatsoever, and two ranks of squared footing stones
 * set out on it in order, numbered, swept, and waiting. It is the emptiest
 * place on the map and it is the most obviously *inhabited* — because it is
 * the same town, with the houses taken off it, and everybody here can point at
 * the stone their family goes back onto.
 */

const W = 34;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[lowfen] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** A spur row: the boardwalk fingers reaching down off the spine. */
const SPURS = () => row(R('#', 2), R(':', 3), R('o', 2), R(':', 4), R('o', 2), R(':', 4),
  R('o', 2), R(':', 4), R('o', 2), R(':', 4), R('o', 2), R(':', 1), R('#', 2));
/** A platform row: the house decks, and shallow water between every one. */
const PLATFORMS = () => row(R('#', 2), R(':', 2), R('o', 4), R(':', 2), R('o', 4), R(':', 2),
  R('o', 4), R(':', 2), R('o', 4), R(':', 2), R('o', 4), R('#', 2));

const TERRAIN = [
  // --- the road out, over the ridge ----------------------------------------
  /*  0 */ row(R('#', 15), R(',', 4), R('#', 15)),
  /*  1 */ row(R('#', 15), R(',', 4), R('#', 15)),
  // --- the terrace: dry, swept, numbered, and empty -------------------------
  /*  2 */ row(R('#', 2), R(',', 30), R('#', 2)),
  /*  3 */ row(R('#', 2), R(',', 30), R('#', 2)),
  /*  4 */ row(R('#', 2), R(',', 30), R('#', 2)),
  /*  5 */ row(R('#', 2), R(',', 30), R('#', 2)),
  /*  6 */ row(R('#', 2), R(',', 30), R('#', 2)),
  /*  7 */ row(R('#', 2), R(',', 30), R('#', 2)),
  /*  8 */ row(R('#', 2), R(',', 30), R('#', 2)),
  // --- the bank, where the town is at the moment ---------------------------
  /*  9 */ row(R('#', 2), R('%', 30), R('#', 2)),
  /* 10 */ row(R('#', 2), R('%', 30), R('#', 2)),
  /* 11 */ row(R('#', 2), R('%', 30), R('#', 2)),
  // --- the spine -----------------------------------------------------------
  /* 12 */ row(R('#', 2), R('%', 1), R('o', 28), R('%', 1), R('#', 2)),
  /* 13 */ row(R('#', 2), R('%', 1), R('o', 28), R('%', 1), R('#', 2)),
  // --- the comb ------------------------------------------------------------
  /* 14 */ SPURS(),
  /* 15 */ PLATFORMS(),
  /* 16 */ PLATFORMS(),
  /* 17 */ PLATFORMS(),
  // --- the fen -------------------------------------------------------------
  /* 18 */ row(R('#', 2), R(':', 30), R('#', 2)),
  /* 19 */ row(R('#', 2), R(':', 30), R('#', 2)),
  /* 20 */ row(R('#', 2), R('w', 30), R('#', 2)),
  /* 21 */ row(R('#', 2), R('w', 30), R('#', 2)),
  /* 22 */ row(R('#', 2), R(':', 6), R('~', 18), R(':', 6), R('#', 2)),
  /* 23 */ row(R('#', 2), R(':', 6), R('~', 18), R(':', 6), R('#', 2)),
  /* 24 */ row(R('#', 2), R(':', 6), R('~', 18), R(':', 6), R('#', 2)),
  /* 25 */ row(R('#', 2), R('~', 30), R('#', 2)),
  /* 26 */ row(R('#', 2), R('~', 30), R('#', 2)),
  /* 27 */ row(R('#', 2), R('~', 30), R('#', 2)),
];

export const LOWFEN = {
  id: 'lowfen',
  name: 'Lowfen',
  subtitle: 'Four Winters in Five',
  kind: 'town',
  light: 'day',
  grade: 'neutral',
  fog: ['#b4c0bc', 70, 250],
  tilt: 0.44,
  cameraDistance: 18,
  music: 'coast',
  base: 'sand',
  groundRamp: 'terrain',
  wallHeight: 4.6,
  wallMaterial: 'rock',
  waterLevel: -0.14,
  water: { shallow: '#4a7f74', deep: '#1d3c3a', foam: '#c4dcd0' },

  sky: {
    zenith: '#5a86a8', horizon: '#d8d8c8', ground: '#5c5e50',
    sunColor: '#ffeed0', sunDir: [0.3, 0.44, 0.5], cloud: 0.86,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [16.5, 3], face: 'south' },
    world: { at: [16.5, 3], face: 'south' },
    spine: { at: [16.0, 12.6], face: 'south' },
  },

  exits: [
    { at: [15, 0], size: [4, 1], to: 'overworld', spawn: 'lowfen', prompt: 'The ridge road' },
  ],

  props: [
    // --- the terrace: the town with the houses taken off it -------------------
    { kit: 'building', at: [7.0, 4.0], w: 8, d: 4.4, h: 3.6, rise: 1.8,
      style: 'stone', roof: 'slate', door: 'south', id: 'lf-highstore',
      sign: { icon: '⚖', text: 'The Dry Store', x: -2.8 } },

    { kit: 'rock', at: [4.0, 6.5], scale: 0.7, seed: 3, radius: 0.6 },
    { kit: 'rock', at: [8.0, 6.5], scale: 0.7, seed: 5, radius: 0.6 },
    { kit: 'rock', at: [12.0, 6.5], scale: 0.7, seed: 7, radius: 0.6 },
    { kit: 'rock', at: [16.0, 6.5], scale: 0.7, seed: 11, radius: 0.6 },
    { kit: 'rock', at: [20.0, 6.5], scale: 0.7, seed: 13, radius: 0.6 },
    { kit: 'rock', at: [24.0, 6.5], scale: 0.7, seed: 17, radius: 0.6 },
    { kit: 'rock', at: [28.0, 6.5], scale: 0.7, seed: 19, radius: 0.6 },
    { kit: 'rock', at: [4.0, 8.0], scale: 0.7, seed: 23, radius: 0.6 },
    { kit: 'rock', at: [8.0, 8.0], scale: 0.7, seed: 29, radius: 0.6 },
    { kit: 'rock', at: [12.0, 8.0], scale: 0.7, seed: 31, radius: 0.6 },
    { kit: 'rock', at: [16.0, 8.0], scale: 0.7, seed: 37, radius: 0.6 },
    { kit: 'rock', at: [20.0, 8.0], scale: 0.7, seed: 41, radius: 0.6 },
    { kit: 'rock', at: [24.0, 8.0], scale: 0.7, seed: 43, radius: 0.6 },
    { kit: 'rock', at: [28.0, 8.0], scale: 0.7, seed: 47, radius: 0.6 },

    { kit: 'well', at: [22.0, 6.0], id: 'lf-well', radius: 1.2,
      interact: { name: 'The Terrace Well', text: [
        'The only sweet water for four miles, sunk on the shelf because the shelf is the only thing that is never under.',
        'A line of chalk on the coping, at knee height, dated. Another at hip. Another, faintly, above the winch.',
      ] } },
    { kit: 'signpost', at: [10.0, 6.0], id: 'lf-terraceboard',
      interact: { name: 'The Footing Book', text: [
        'A board of numbered stones and the families that go on them. FOURTEEN — CULLEN. FIFTEEN — ABBOT. SIXTEEN — VACANT SINCE.',
        'It is not a plan for a town. It is a plan for putting a town back, and it has been used nine times in a hundred years.',
      ] } },
    { kit: 'fence', at: [16.0, 2.6], arg: 12, radius: 0 },
    { kit: 'tree', at: [30.0, 3.0], kind: 'dead', scale: 1.1, seed: 53, id: 'lf-tree-ne' },
    { kit: 'tree', at: [3.4, 3.2], kind: 'dead', scale: 0.95, seed: 59 },
    { kit: 'bush', at: [26.0, 3.4], scale: 1.0, seed: 61, radius: 0 },
    { kit: 'chest', at: [3.0, 5.0], id: 'lf-chest-1',
      contains: { kind: 'gold', amount: 320, label: '320 gil' } },

    // --- the bank: everything that has to be indoors ---------------------------
    { kit: 'building', at: [8.0, 10.0], w: 8, d: 5, h: 3.6, storeys: 2, rise: 2.2,
      style: 'wood', roof: 'slate', balcony: true, chimney: true, door: 'south',
      id: 'lf-inn', enter: 'inn_lowfen', enterPrompt: 'The High Water',
      sign: { icon: '🛏', text: 'The High Water', x: -2.8 } },

    { kit: 'building', at: [22.0, 10.0], w: 8, d: 5, h: 3.5, rise: 2.0,
      style: 'wood', roof: 'tile', awning: true, door: 'south',
      id: 'lf-shop', enter: 'shop_lowfen', enterPrompt: 'The Wrack Line',
      sign: { icon: '🧪', text: 'The Wrack Line', x: -2.8 } },

    { kit: 'building', at: [15.0, 10.0], w: 6, d: 4.4, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'south', id: 'lf-store-a' },
    { kit: 'building', at: [28.5, 10.0], w: 6, d: 4.4, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'south', rot: 0.05, id: 'lf-store-b' },

    // --- the spine -------------------------------------------------------------
    { kit: 'lamppost', at: [7.0, 12.4] },
    { kit: 'lamppost', at: [16.0, 12.4] },
    { kit: 'lamppost', at: [24.0, 12.4] },
    { kit: 'lamppost', at: [30.0, 12.4] },
    { kit: 'fence', at: [9.0, 13.9], arg: 6, radius: 0 },
    { kit: 'fence', at: [15.0, 13.9], arg: 6, radius: 0 },
    { kit: 'fence', at: [21.0, 13.9], arg: 6, radius: 0 },
    { kit: 'fence', at: [27.0, 13.9], arg: 6, radius: 0 },
    { kit: 'barrel', at: [5.0, 12.6] },
    { kit: 'barrel', at: [5.6, 13.4] },
    { kit: 'barrel', at: [27.0, 12.6] },
    { kit: 'crate', at: [27.6, 13.4], rot: 0.3 },
    { kit: 'cart', at: [19.5, 12.6], rot: 1.5 },
    { kit: 'signpost', at: [12.6, 13.4], id: 'lf-floodboard',
      interact: { name: 'The Flood Board', text: [
        'A post cut with a notch for every year the water came over the spine, and a number beside each for the day it went down again.',
        'The last four notches are the last four years. The gaps between them used to be five and six.',
        'At the very top, above every notch and cut fresh: THIS ONE IS NOT A GUESS.',
      ] } },
    { kit: 'savepoint', at: [19.0, 13.4], id: 'lf-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },

    // --- the platforms ---------------------------------------------------------
    { kit: 'building', at: [5.9, 16.6], w: 6, d: 3.2, h: 3.2, rise: 2.4,
      style: 'wood', roof: 'thatch', door: 'north', id: 'lf-plat-1' },
    { kit: 'building', at: [11.9, 16.6], w: 6, d: 3.2, h: 3.2, rise: 2.4,
      style: 'wood', roof: 'thatch', door: 'north', id: 'lf-plat-2' },
    { kit: 'building', at: [17.9, 16.6], w: 6, d: 3.2, h: 3.2, rise: 2.4,
      style: 'wood', roof: 'thatch', door: 'north', rot: 0.04, id: 'lf-plat-3' },
    { kit: 'building', at: [23.9, 16.6], w: 6, d: 3.2, h: 3.2, rise: 2.4,
      style: 'wood', roof: 'thatch', door: 'north', id: 'lf-plat-4' },
    { kit: 'building', at: [29.9, 16.6], w: 6, d: 3.2, h: 3.2, rise: 2.4,
      style: 'wood', roof: 'thatch', door: 'north', rot: -0.05, id: 'lf-plat-5' },

    { kit: 'barrel', at: [4.4, 15.4] },
    { kit: 'crate', at: [10.4, 15.4], rot: 0.3 },
    { kit: 'barrel', at: [16.4, 15.4] },
    { kit: 'crate', at: [22.4, 15.4], rot: -0.35 },
    { kit: 'barrel', at: [28.4, 15.4] },
    { kit: 'flowerbox', at: [12.6, 15.4] },
    { kit: 'flowerbox', at: [24.6, 15.4] },

    // --- the fen ----------------------------------------------------------------
    { kit: 'chest', at: [3.0, 21.0], id: 'lf-chest-3',
      contains: { kind: 'item', id: 'springwater', count: 2, label: '2 Springwaters' } },
    { kit: 'chest', at: [29.0, 23.0], id: 'lf-chest-2',
      contains: { kind: 'item', id: 'tidewardshield', count: 1, label: 'a Tideward Shield' } },
    { kit: 'chest', at: [26.0, 19.5], id: 'lf-chest-4',
      contains: { kind: 'item', id: 'serpentstooth', count: 1, label: "a Serpent's Tooth" } },
  ],

  /**
   * Lowfen after. The lower town has been struck and carried up, on schedule,
   * to a terrace that will not be needed again — because the thing they packed
   * for is not the water, and there is no notch on the post for it.
   */
  ruin: {
    subtitle: 'Carried Up and Not Coming Down',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#767c76', 40, 165],
    music: 'memory',
    sky: {
      zenith: '#48485a', horizon: '#a08c80', ground: '#2e322c',
      sunColor: '#ff9d63', sunDir: [-0.3, 0.2, 0.42], cloud: 0.96,
    },
    removeNpcs: ['lf-child', 'lf-fisher', 'lf-carter', 'lf-reeve'],
    removeProps: ['lf-tree-ne'],
    npcs: [
      {
        id: 'lf-ruin-reeve', name: 'Flood-Reeve Abbot', at: [13.6, 12.9], face: 'south',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'normal', height: 1.68, hair: 'braid', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#96603f', hair: '#dedbe0', torso: '#12566b', accent: '#9ccdd4',
            legs: '#414954', boots: '#3a2a20', cape: '#1a8fa5' } },
        talk: [
          'We struck the lower town in a day and a half. Best we have ever done it. Everyone knew their stone.',
          'There is no notch on the post for this. I have been standing here a week trying to decide where it would go.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [30.0, 3.0], kind: 'dead', scale: 1.35, seed: 901 },
      { kit: 'chest', at: [20.0, 4.6], id: 'lf-ruin-chest',
        contains: { kind: 'item', id: 'deepwellpendant', count: 1, label: 'a Deepwell Pendant' } },
    ],
  },

  npcs: [
    {
      id: 'lf-passcamp', name: 'Pass-Camp Sutler Dree', at: [8.1, 6.0], face: 'south',
      clip: 'work', prompt: 'Trade',
      look: { build: 'heavy', height: 1.73, hair: 'wild', eyeStyle: 'sharp',
        colors: { skin: '#c08865', hair: '#dedbe0', torso: '#5b6674', accent: '#9ccdd4',
          legs: '#5f6572', boots: '#3a2a20', gloves: '#4b382d', cape: '#414954' } },
      shop: 'cinderspine_camp',
      talk: [
        'The camp at the Cinderspine shuts when the pass does, and then the whole stock has to winter somewhere. It winters here, on the terrace, on a stone with a number on it.',
        'Thaw wine, a road coat, a felted hood. Lowfen buys more of it than the pass ever did, which tells you something about Lowfen.',
      ],
    },
    {
      id: 'lf-inn', name: 'Hessa Culleen', at: [7.5, 12.2], face: 'north', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.64, hair: 'bob', expression: 'happy',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#3a2a20' } },
      inn: { price: 36, name: 'The High Water' },
      talk: [
        'Thirty-six. Ground floor is boards and trestles and nothing that will not lift. Everything I care about is on the first floor and always has been.',
        'The mark on the taproom wall is from the year my mother was born. She used to say she was born under it. She was not being funny.',
      ],
    },
    {
      id: 'lf-shop', name: 'Ardo Fenn', at: [21.5, 12.2], face: 'north', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.73, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'drownedcoast_wreckers',
      talk: [
        'Everything on that shelf came in on water and can go out on water. I do not stock a single thing that would be a decision.',
        'You want to know what a Lowfen man owns? Whatever he can carry twice. Once up, once down.',
      ],
    },
    {
      id: 'lf-reeve', name: 'Flood-Reeve Abbot', at: [13.0, 12.9], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.68, hair: 'braid', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#dedbe0', torso: '#12566b', accent: '#9ccdd4',
          legs: '#414954', boots: '#3a2a20', cape: '#1a8fa5' } },
      talk: [
        'I call the strike. Not the water — anyone can see the water. I call it two days before, and if I call it wrong twice they take the post off me.',
        'It has been called wrong twice by the same man, once, in a hundred years. He went up the terrace and stayed on his own stone and nobody said a word to him for eleven years.',
      ],
    },
    {
      id: 'lf-terrace', name: 'Stone-Keeper Wend', at: [13.5, 6.5], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.76, hair: 'short',
        colors: { skin: '#dbb28c', hair: '#4a2a17', torso: '#6b5d37', accent: '#95836b',
          legs: '#5e412c', boots: '#4b382d', gloves: '#bda98b' } },
      event: 'lowfen_last_carry',
      talk: [
        'Fourteen footings swept, levelled and checked every month of my life, and I have seen them used nine times.',
        'You will say that is a great deal of sweeping for nine times. Ask me in November whether it was.',
      ],
    },
    {
      id: 'lf-fisher', name: 'Eel-Wife Draik', at: [9.5, 18.75], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.61, hair: 'long',
        colors: { skin: '#6e4030', hair: '#342a37', torso: '#496035', accent: '#3fc6d6',
          legs: '#4b382d', boots: '#3a2a20', gloves: '#5b6674' } },
      talk: [
        'Low water you walk out to the traps. High water you row over the top of your own roof and do not think about it.',
        'The eels have gone up the fen this year. All of them, at once, in a night. They do that when they know something, and they are not obliged to tell me what.',
      ],
    },
    {
      id: 'lf-carter', name: 'Carrier Pell', at: [6.2, 12.8], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.86, hair: 'topknot',
        colors: { skin: '#c08865', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#4b382d', gloves: '#4b382d' } },
      event: 'lowfen_lime_barge',
      talk: [
        'Every stick of furniture in this town is made to come apart. Beds in four, table in three, loom in eleven and the eleventh is the one you lose.',
        'A stranger built a proper dresser here once. Solid. Beautiful. It is still down there. You can see the top of it at low water.',
      ],
    },
    {
      id: 'lf-widow', name: 'Widow Sarn', at: [25.5, 6.0], face: 'west', clip: 'sit', prompt: 'Speak',
      look: { build: 'slim', height: 1.57, hair: 'bob', expression: 'sad', eyeStyle: 'closed',
        colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#38224f', accent: '#8b2a2c',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      talk: [
        'Stone sixteen. Vacant since. There is nobody left to carry it up, so it stays swept and stays empty, and every year somebody asks and every year we leave it.',
        'You cannot put a different family on a stone. It is not the law. It is worse than the law.',
      ],
    },
    {
      id: 'lf-netman', name: 'Trap-Setter Ollow', at: [29.5, 14.9], face: 'west', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.70, hair: 'wild',
        colors: { skin: '#ac744c', hair: '#6d4020', torso: '#33477c', accent: '#9ccdd4',
          legs: '#414954', boots: '#3a2a20' } },
      talk: [
        'Five platforms, five families, and each of us can see straight into the other four. There has never been a secret kept in Lowfen and there never will be.',
        'It is not friendliness. It is that when the reeve calls the strike you need to know at a glance whether the man next door has started, because if he has, you are late.',
      ],
    },
    {
      id: 'lf-boatman', name: 'Punt-Man Quare', at: [28.5, 12.1], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'athletic', height: 1.80, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#4a2a17', torso: '#1a8fa5', accent: '#a6b0bc',
          legs: '#12566b', boots: '#3a2a20' } },
      talk: [
        'Two foot of water and a pole. I have never in my life been anywhere that a horse could not have gone faster, and I have never once been stopped.',
        'In August I go where you are standing. In February I go over it. Same route. It is only the height that argues.',
      ],
    },
    {
      id: 'lf-child', name: 'Tetch', at: [12.7, 14.9], face: 'south', clip: 'idle', prompt: 'Speak', wander: 1,
      look: { build: 'child', height: 1.24, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#2c5a45', accent: '#ffd76a',
          legs: '#33477c', boots: '#4b382d' } },
      talk: [
        'I know my stone. Everybody knows their stone before they can write. Mine is nine and it has a chip out of the north corner and that is how you tell.',
        'When the water comes I carry the shutters. Four of them, two trips, and I have never dropped one, and I would like that written down somewhere.',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Interiors
// ---------------------------------------------------------------------------

const ROOM_BASE = {
  kind: 'interior',
  light: 'interior',
  grade: 'cave',
  fog: ['#20211e', 22, 70],
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

function makeRoom(width, rows, label) {
  return rows.map((r) => {
    if (r.length !== width) {
      throw new Error(`[${label}] row is ${r.length} columns, expected ${width}: ${r}`);
    }
    return r;
  });
}

export const INN_LOWFEN = {
  ...ROOM_BASE,
  id: 'inn_lowfen',
  name: 'The High Water',
  subtitle: 'Lowfen',
  music: 'festival',
  terrain: makeRoom(18, [
    '##################',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '########oo########',
  ], 'inn_lowfen'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'lowfen', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [4.5, 3.0], rot: 0 },
    { kit: 'bench', at: [4.5, 4.8], rot: 0 },
    { kit: 'bench', at: [12.5, 3.0], rot: 0 },
    { kit: 'bench', at: [12.5, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.8, 2.4] },
    { kit: 'crate', at: [15.2, 1.7], rot: 0.3 },
    { kit: 'crate', at: [15.0, 2.8], rot: -0.2 },
    { kit: 'lamppost', at: [6.0, 1.6] },
    { kit: 'lamppost', at: [11.5, 1.6] },
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-lf-chest',
      contains: { kind: 'item', id: 'wayfarerhat', count: 1, label: 'a Wayfarer Hat' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-lf-board',
      interact: { name: 'The Mark', text: [
        'A hand-width band of brown across the plaster at shoulder height, running the whole room and out through the doorframe.',
        'Every table, every trestle and every stool in here is lower than it. Nothing in this room is nailed down. Nothing ever has been.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-lf-keeper', name: 'Hessa Culleen', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.64, hair: 'bob', expression: 'happy',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#3a2a20' } },
      inn: { price: 36, name: 'The High Water' },
      talk: ['Thirty-six, and your room is upstairs, and there is a reason for that which I would rather you worked out in the morning.'],
    },
    {
      id: 'inn-lf-guest', name: 'Fen Surveyor', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.72, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'I was sent to recommend a permanent relocation to the terrace. I have written the recommendation four times and torn it up four times.',
        'They are not stubborn. They have simply decided to live in two places, and my department has no column for that.',
      ],
    },
  ],
};

export const SHOP_LOWFEN = {
  ...ROOM_BASE,
  id: 'shop_lowfen',
  name: 'The Wrack Line',
  subtitle: 'Lowfen',
  music: 'coast',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_lowfen'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'lowfen', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.5, 2.6], rot: -0.3 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.7, 2.6] },
    { kit: 'barrel', at: [13.4, 3.5] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'chest', at: [4.0, 3.6], id: 'shop-lf-chest',
      contains: { kind: 'item', id: 'saltleathers', count: 1, label: 'a set of Salt Leathers' } },
  ],

  npcs: [
    {
      id: 'shop-lf-keeper', name: 'Ardo Fenn', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.73, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'drownedcoast_wreckers',
      talk: ['Shelves are on brackets and the brackets come off with a thumb. Two of us can empty this shop in the time it takes to boil a kettle, and we have timed it.'],
    },
  ],
};

export const LOWFEN_INTERIORS = {
  inn_lowfen: INN_LOWFEN,
  shop_lowfen: SHOP_LOWFEN,
};
