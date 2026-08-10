/**
 * Stonecross — a town that is an argument with one object.
 *
 * The Cross was here before the town, before the road, and before anybody who
 * could write about it. It is white stone of a kind not quarried within two
 * hundred miles, it is eleven yards high, and the four faces carry one word
 * each in a script nobody has ever read aloud.
 *
 * Everything else on this map is a consequence. The four streets are the four
 * faces: they leave the Cross at exact right angles and run dead straight to
 * the four points of the town, and the town's wall was built as a diamond so
 * that the streets could reach it without turning. That is why Stonecross has
 * no corners — they were cut off to keep the geometry honest. Every house is
 * squared to the monument rather than to the ground, so the blocks between the
 * streets are wedges and nobody's garden is a rectangle.
 *
 * The apron itself is marble, swept, fenced and completely useless: no market
 * is allowed on it, no cart crosses it, and the only things standing there are
 * benches facing inward. The whole town is arranged to look at a thing it
 * cannot explain, and has built an institution, a trade and four rival
 * theories on top of that fact.
 */

const W = 30;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[stonecross] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** A band of the diamond: `pad` walls each side, the arm running down the middle. */
const BAND = (pad) => row(R('#', pad), R(',', 13 - pad), R('=', 4), R(',', 13 - pad), R('#', pad));

const TERRAIN = [
  /*  0 */ row(R('#', 30)),
  /*  1 */ row(R('#', 30)),
  // --- the north point, and the arm running down from it -------------------
  /*  2 */ BAND(11),
  /*  3 */ BAND(10),
  /*  4 */ BAND(9),
  /*  5 */ BAND(8),
  /*  6 */ BAND(7),
  /*  7 */ BAND(6),
  /*  8 */ BAND(5),
  /*  9 */ BAND(4),
  /* 10 */ BAND(3),
  /* 11 */ BAND(2),
  // --- the apron, and the east and west arms crossing it -------------------
  /* 12 */ row(R('#', 2), R(',', 9), R('M', 8), R(',', 9), R('#', 2)),
  /* 13 */ row(R('#', 2), R('=', 9), R('M', 8), R('=', 9), R('#', 2)),
  /* 14 */ row(R('#', 2), R('=', 9), R('M', 8), R('=', 9), R('#', 2)),
  /* 15 */ row(R('#', 2), R('=', 9), R('M', 8), R('=', 9), R('#', 2)),
  /* 16 */ row(R('#', 2), R('=', 9), R('M', 8), R('=', 9), R('#', 2)),
  /* 17 */ row(R('#', 2), R(',', 9), R('M', 8), R(',', 9), R('#', 2)),
  // --- and down to the south point ------------------------------------------
  /* 18 */ BAND(2),
  /* 19 */ BAND(3),
  /* 20 */ BAND(4),
  /* 21 */ BAND(5),
  /* 22 */ BAND(6),
  /* 23 */ BAND(7),
  /* 24 */ BAND(8),
  /* 25 */ BAND(9),
  /* 26 */ BAND(10),
  /* 27 */ BAND(11),
  /* 28 */ row(R('#', 13), R('=', 4), R('#', 13)),
  /* 29 */ row(R('#', 30)),
];

export const STONECROSS = {
  id: 'stonecross',
  name: 'Stonecross',
  subtitle: 'Four Faces, Four Words',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#c2c6c4', 90, 280],
  tilt: 0.44,
  cameraDistance: 18,
  music: 'solmere',
  base: 'dirt',
  groundRamp: 'terrain',
  wallHeight: 4.8,
  wallMaterial: 'stone',

  sky: {
    zenith: '#3d76ac', horizon: '#dfd8c2', ground: '#5c5a50',
    sunColor: '#ffe8c0', sunDir: [0.38, 0.62, 0.3], cloud: 0.42,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [14.5, 26], face: 'north' },
    world: { at: [14.5, 26], face: 'north' },
    apron: { at: [14.5, 18], face: 'north' },
    northpoint: { at: [14.5, 3], face: 'south' },
  },

  exits: [
    { at: [13, 28], size: [4, 1], to: 'overworld', spawn: 'stonecross_fourthface', prompt: 'The Fourth Face road' },
  ],

  props: [
    // --- the Cross ------------------------------------------------------------
    { kit: 'building', at: [15.0, 15.0], w: 7, d: 7, h: 1.1, rise: 0.2,
      style: 'marble', roof: 'flat', windows: false, door: null, id: 'sc-plinth' },
    { kit: 'building', at: [15.0, 15.0], w: 3.6, d: 3.6, h: 8.0, rise: 3.6,
      style: 'marble', roof: 'cone', windows: false, door: null, solid: false, id: 'sc-cross' },
    { kit: 'fence', at: [15.0, 12.8], arg: 9, radius: 0 },
    { kit: 'fence', at: [15.0, 17.2], arg: 9, radius: 0 },
    { kit: 'fence', at: [12.8, 15.0], arg: 9, rot: Math.PI / 2, radius: 0 },
    { kit: 'fence', at: [17.2, 15.0], arg: 9, rot: Math.PI / 2, radius: 0 },
    { kit: 'lamppost', at: [11.6, 12.6] },
    { kit: 'lamppost', at: [18.4, 12.6] },
    { kit: 'lamppost', at: [11.6, 17.4] },
    { kit: 'lamppost', at: [18.4, 17.4] },
    { kit: 'bench', at: [15.0, 12.2], rot: Math.PI },
    { kit: 'bench', at: [15.0, 17.8], rot: 0 },
    { kit: 'bench', at: [12.2, 15.0], rot: Math.PI / 2 },
    { kit: 'bench', at: [17.8, 15.0], rot: -Math.PI / 2 },
    { kit: 'savepoint', at: [11.4, 14.4], id: 'sc-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [18.6, 15.8], id: 'sc-faceboard',
      interact: { name: 'The Reading Board', text: [
        'A board set up by the Antiquaries so that visitors may see the four words without walking round.',
        'Each is copied stroke for stroke in black paint, and under each is a proposed reading, and under each proposed reading is a shorter line in a different hand reading NO.',
      ] } },
    { kit: 'signpost', at: [11.4, 16.2], id: 'sc-apronrule',
      interact: { name: 'The Apron Rule', text: [
        'NO STALL. NO CART. NO BEAST. NO GAME. NO GATHERING ABOVE SIX PERSONS.',
        'Nothing on the board says why. The rules are four hundred years old and every one of them was passed in a hurry.',
      ] } },

    // --- the north quarter ------------------------------------------------------
    { kit: 'building', at: [11.5, 5.0], w: 4, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'slate', timbered: true, door: 'south', id: 'sc-h-j' },
    { kit: 'building', at: [18.5, 5.0], w: 4, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'slate', timbered: true, door: 'south', id: 'sc-h-k' },
    { kit: 'building', at: [9.0, 8.2], w: 7, d: 6.4, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'slate', timbered: true, balcony: true, chimney: true,
      door: 'east', id: 'sc-inn', enter: 'inn_stonecross', enterPrompt: 'The Noon Shadow',
      sign: { icon: '🛏', text: 'The Noon Shadow', x: -2.6 } },
    { kit: 'building', at: [21.0, 8.2], w: 7, d: 6.4, h: 3.6, storeys: 2, rise: 2.0,
      style: 'plaster', roof: 'tile', awning: true, door: 'west',
      id: 'sc-shop', enter: 'shop_stonecross', enterPrompt: 'The Four Readings',
      sign: { icon: '🧪', text: 'The Four Readings', x: 2.6 } },
    { kit: 'lamppost', at: [12.4, 6.4] },
    { kit: 'lamppost', at: [17.6, 6.4] },
    { kit: 'barrel', at: [12.6, 3.6] },
    { kit: 'barrel', at: [17.4, 3.6] },
    { kit: 'chest', at: [14.0, 2.6], id: 'sc-chest-north',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },

    // --- the west quarter --------------------------------------------------------
    { kit: 'building', at: [7.0, 11.6], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'east', id: 'sc-h-e' },
    { kit: 'building', at: [7.0, 17.6], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'east', id: 'sc-h-g' },
    { kit: 'well', at: [5.0, 14.6], id: 'sc-well-west', radius: 1.2,
      interact: { name: 'The West Well', text: [
        'Sunk in line with the west arm, because in Stonecross even a hole in the ground is squared to the Cross.',
        'It took four extra months and eleven extra feet of digging to be in line. The minutes of the meeting survive and are not apologetic.',
      ] } },
    { kit: 'stall', at: [9.0, 13.6], arg: '#8a6a23', id: 'sc-stall-1' },
    { kit: 'stall', at: [9.0, 16.4], arg: '#2c5a45', id: 'sc-stall-2' },
    { kit: 'crate', at: [3.4, 13.0], rot: 0.3 },
    { kit: 'crate', at: [3.0, 13.9], rot: -0.25 },
    { kit: 'chest', at: [2.6, 16.4], id: 'sc-chest-west',
      contains: { kind: 'gold', amount: 320, label: '320 gil' } },

    // --- the east quarter --------------------------------------------------------
    { kit: 'building', at: [23.0, 11.6], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'west', id: 'sc-h-f' },
    { kit: 'building', at: [23.0, 17.6], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'stone', roof: 'slate', chimney: true, door: 'west', id: 'sc-antiquaries',
      sign: { icon: '⚖', text: 'The Antiquaries', x: 2.0 } },
    { kit: 'well', at: [25.0, 14.6], id: 'sc-well-east', radius: 1.2,
      interact: { name: 'The East Well', text: [
        'The older well, and eleven inches out of line with the east arm, which the town has known about for two centuries.',
        'There is a standing proposal to move it. It comes up at every meeting and is deferred at every meeting, and both facts are minuted.',
      ] } },
    { kit: 'stall', at: [21.0, 13.6], arg: '#8b2a2c', id: 'sc-stall-3' },
    { kit: 'stall', at: [21.0, 16.4], arg: '#33477c', id: 'sc-stall-4' },
    { kit: 'barrel', at: [26.6, 13.2] },
    { kit: 'crate', at: [26.4, 16.4], rot: 0.4 },
    { kit: 'chest', at: [27.0, 15.6], id: 'sc-chest-east',
      contains: { kind: 'item', id: 'sandglass', count: 1, label: 'a Sandglass' } },

    // --- the south quarter -------------------------------------------------------
    { kit: 'building', at: [8.0, 20.0], w: 6, d: 4, h: 3.5, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'east', id: 'sc-h-a' },
    { kit: 'building', at: [22.0, 20.0], w: 6, d: 4, h: 3.5, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'west', id: 'sc-h-c' },
    { kit: 'building', at: [10.0, 23.4], w: 5, d: 3.6, h: 3.4, rise: 1.7,
      style: 'plaster', roof: 'thatch', door: 'north', id: 'sc-h-b' },
    { kit: 'building', at: [20.0, 23.4], w: 5, d: 3.6, h: 3.4, rise: 1.7,
      style: 'plaster', roof: 'thatch', door: 'north', id: 'sc-h-d' },
    { kit: 'building', at: [11.0, 25.8], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'stone', roof: 'slate', door: 'north', id: 'sc-hall',
      sign: { icon: '⚖', text: 'The Reading Room', x: -1.9 } },
    { kit: 'building', at: [19.0, 25.8], w: 5, d: 3.4, h: 3.3, rise: 1.7,
      style: 'wood', roof: 'thatch', door: 'north', id: 'sc-h-i' },
    { kit: 'lamppost', at: [12.4, 22.6] },
    { kit: 'lamppost', at: [17.6, 22.6] },
    { kit: 'bench', at: [13.0, 20.4], rot: 0 },
    { kit: 'bench', at: [17.0, 20.4], rot: 0 },
    { kit: 'flowerbox', at: [12.4, 19.2] },
    { kit: 'flowerbox', at: [17.6, 19.2] },
    { kit: 'cart', at: [7.0, 22.6], rot: 1.4 },
    { kit: 'cart', at: [23.0, 22.6], rot: 0.3 },
    { kit: 'tree', at: [6.0, 19.4], kind: 'broadleaf', scale: 1.05, seed: 3, id: 'sc-tree-sw' },
    { kit: 'tree', at: [24.0, 19.4], kind: 'autumn', scale: 1.0, seed: 7, id: 'sc-tree-se' },
    { kit: 'bush', at: [13.6, 27.0], scale: 1.0, seed: 17, radius: 0 },
    { kit: 'bush', at: [16.4, 27.0], scale: 1.05, seed: 19, radius: 0 },
    { kit: 'chest', at: [16.6, 24.4], id: 'sc-chest-south',
      contains: { kind: 'item', id: 'keeneyecharm', count: 1, label: 'a Keen-Eye Charm' } },
    { kit: 'signpost', at: [12.6, 27.4], id: 'sc-gateboard',
      interact: { name: 'The Fourth Face Gate', text: [
        'THIS ROAD LEAVES BY THE FOURTH FACE. TRAVELLERS ARE ASKED NOT TO COPY THE WORD.',
        'Somebody has copied the word onto the board underneath, badly, and somebody else has scrubbed at it and given up halfway.',
      ] } },
  ],

  /**
   * Stonecross after. The Cross has not changed at all, which is the difficulty.
   * The town around it has emptied, the Antiquaries are down to one, and the
   * apron is still swept every morning by people who will not say why.
   */
  ruin: {
    subtitle: 'The Cross Unaltered',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#8a8880', 46, 175],
    music: 'memory',
    sky: {
      zenith: '#4a4258', horizon: '#b99a86', ground: '#36342e',
      sunColor: '#ff9d63', sunDir: [-0.36, 0.24, 0.3], cloud: 0.94,
    },
    removeNpcs: ['sc-child', 'sc-guide', 'sc-mason', 'sc-warden'],
    removeProps: ['sc-tree-sw', 'sc-tree-se'],
    npcs: [
      {
        id: 'sc-ruin-warden', name: 'Cross-Warden Ferrers', at: [13.0, 12.0], face: 'south',
        clip: 'work', prompt: 'Speak',
        look: { build: 'normal', height: 1.70, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#ac744c', hair: '#dedbe0', torso: '#414954', accent: '#a6b0bc',
            legs: '#2b2933', boots: '#3a2a20', cape: '#38224f' } },
        talk: [
          'Not a mark on it. Not a crack, not a stain, not so much as a swallow\'s nest. Everything else in this town has aged and it has not.',
          'I sweep the apron at six. I have thought about stopping. I would rather not find out what the sweeping was for.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [6.0, 19.4], kind: 'dead', scale: 1.3, seed: 1001 },
      { kit: 'tree', at: [24.0, 19.4], kind: 'dead', scale: 1.2, seed: 1003 },
      { kit: 'chest', at: [9.0, 15.0], id: 'sc-ruin-chest',
        contains: { kind: 'item', id: 'oathstone', count: 1, label: 'an Oathstone' } },
    ],
  },

  npcs: [
    {
      id: 'sc-inn', name: 'Hesper Ferrers', at: [11.0, 8.6], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 42, name: 'The Noon Shadow' },
      talk: [
        'Forty-two. The house is named for where the shadow reaches at midday, and the shadow reaches the doorstep, and that is a fact I have never had to advertise.',
        'Visitors always ask which room has the view of it. All of them do. That is the town.',
      ],
    },
    {
      id: 'sc-shop', name: 'Ordell Craik', at: [19.0, 8.6], face: 'east', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.72, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'ashenhall_relics',
      talk: [
        'The shop is called the Four Readings and I stock four of everything, which is a joke that has paid my rent for eleven years.',
        'Half my custom is pilgrims and half is people who live here and are sick of pilgrims. I sell both of them the same rope.',
      ],
    },
    {
      id: 'sc-warden', name: 'Cross-Warden Ferrers', at: [16.0, 12.0], face: 'south',
      clip: 'work', prompt: 'Speak', facePlayer: true,
      look: { build: 'normal', height: 1.70, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#dedbe0', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#3a2a20', cape: '#38224f' } },
      talk: [
        'Off the marble, if you would. No carts, no beasts, no games, no gatherings above six. I did not write the rules and I enforce every one of them.',
        'People ask what happens if they touch it. Nothing happens. Nothing has ever happened. I would still rather you did not.',
      ],
    },
    {
      id: 'sc-antiquary', name: 'Antiquary Pell', at: [20.6, 17.4], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.73, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#5e5163', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#414954', boots: '#3b3943', cape: '#38224f' } },
      talk: [
        'There are four readings in the literature. Boundary marker, calendar, grave, and warning. I have spent thirty years and I believe all four and none of them.',
        'The honest position is that we have a very large object and a very small vocabulary. Nobody funds the honest position.',
      ],
    },
    {
      id: 'sc-mason', name: 'Mason Quilter', at: [13.0, 18.0], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.87, hair: 'bald',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      talk: [
        'I measured it properly, with a plumb and a chain, over three days. It is true to a hair on all four faces and there is no joint anywhere in it.',
        'That is the part nobody wants. Not the words. A stone eleven yards high with no joint in it, and no quarry within two hundred miles that could give you the block.',
      ],
    },
    {
      id: 'sc-priest', name: 'Keeper Undell', at: [15.0, 18.6], face: 'north', clip: 'loiter', prompt: 'Speak',
      look: { build: 'normal', height: 1.68, hair: 'long', expression: 'neutral',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#38224f', accent: '#ffd76a',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      talk: [
        'We do not worship it. We keep the apron and we keep the hours and we are extremely careful about the difference, in public.',
        'Four faces, four words, four turnings of the year. If that is a coincidence it is a very well organised one.',
      ],
    },
    {
      id: 'sc-farmer', name: 'Goodwife Marle', at: [10.0, 20.6], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.63, hair: 'braid',
        colors: { skin: '#e7c39c', hair: '#bd8746', torso: '#496035', accent: '#ffd76a',
          legs: '#6b5d37', boots: '#4b382d' } },
      talk: [
        'It is a sundial. It has always been a sundial. The shadow crosses my gate at eight and the mill at noon and that is the whole of my interest in it.',
        'The Antiquaries have been at it three hundred years. I get my hay in on it every summer. One of us is using the thing.',
      ],
    },
    {
      id: 'sc-guide', name: 'Guide Nym', at: [17.0, 19.4], face: 'north', clip: 'loiter', prompt: 'Speak',
      look: { build: 'slim', height: 1.70, hair: 'ponytail', expression: 'happy',
        colors: { skin: '#dcae8a', hair: '#bd8746', torso: '#2c5a45', accent: '#f7d968',
          legs: '#414954', boots: '#4b382d' } },
      talk: [
        'Two coppers for the tour, four if you want the tragic version, six if you want it to be about a king.',
        'None of it is true and everybody knows it. They are not paying for the truth, they walked eleven miles and they would like something to have happened.',
      ],
    },
    {
      id: 'sc-old', name: 'Old Barrow', at: [24.0, 20.6], face: 'west', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.60, hair: 'short', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#95836b', accent: '#496035',
          legs: '#6b5d37', boots: '#4b382d' } },
      talk: [
        'In my grandfather\'s time they meant to move it. Forty men, two winches and a road laid special. They got it a hand\'s breadth and stopped.',
        'Nobody will say why they stopped. Every one of the forty said the same thing afterwards, which was nothing, and they all said it very fast.',
      ],
    },
    {
      id: 'sc-child', name: 'Tegg', at: [12.0, 13.0], face: 'east', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.23, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'I got up it once, as far as the second band. It is not slippery and it is not cold. It is exactly as warm as your hand, all the way up, in February.',
        'I told the Antiquaries and they wrote it down and then they told me not to say it to visitors.',
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
  fog: ['#232019', 22, 70],
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

export const INN_STONECROSS = {
  ...ROOM_BASE,
  id: 'inn_stonecross',
  name: 'The Noon Shadow',
  subtitle: 'Stonecross',
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
  ], 'inn_stonecross'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'stonecross', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [4.5, 3.0], rot: 0 },
    { kit: 'bench', at: [4.5, 4.8], rot: 0 },
    { kit: 'bench', at: [12.5, 3.0], rot: 0 },
    { kit: 'bench', at: [12.5, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.8, 2.4] },
    { kit: 'crate', at: [15.2, 1.7], rot: 0.3 },
    { kit: 'crate', at: [15.0, 2.8], rot: -0.25 },
    { kit: 'lamppost', at: [6.0, 1.6] },
    { kit: 'lamppost', at: [11.5, 1.6] },
    { kit: 'flowerbox', at: [8.6, 5.4] },
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-sc-chest',
      contains: { kind: 'item', id: 'clearwatercharm', count: 1, label: 'a Clearwater Charm' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-sc-board',
      interact: { name: 'The Shadow Line', text: [
        'A brass strip let into the floor of the taproom, running from the door to the hearth.',
        'On midsummer noon the shadow of the Cross lies exactly along it. The house was built round the strip. The strip was here first.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-sc-keeper', name: 'Hesper Ferrers', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 42, name: 'The Noon Shadow' },
      talk: ['Forty-two. Do not stand on the brass. Half the town will tell you it is unlucky and the other half will tell you it wears.'],
    },
    {
      id: 'inn-sc-guest', name: 'Pilgrim of the Third Reading', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.72, hair: 'long', expression: 'neutral',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#38224f', accent: '#ffd76a',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      talk: [
        'Nine days on the road to stand in front of it for an afternoon, and I will tell you honestly, it is a very large stone.',
        'That is not disappointment. I expected a very large stone. I did not expect it to be quite so uninterested in me.',
      ],
    },
  ],
};

export const SHOP_STONECROSS = {
  ...ROOM_BASE,
  id: 'shop_stonecross',
  name: 'The Four Readings',
  subtitle: 'Stonecross',
  music: 'shop',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_stonecross'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'stonecross', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.6], rot: -0.3 },
    { kit: 'crate', at: [3.4, 1.8], rot: 0.5 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.6, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.8, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-sc-chest',
      contains: { kind: 'gold', amount: 240, label: '240 gil' } },
  ],

  npcs: [
    {
      id: 'shop-sc-keeper', name: 'Ordell Craik', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.72, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'ashenhall_relics',
      talk: ['I do not sell rubbings, I do not sell copies, and I do not sell the word on a card. Three people have tried it and all three left the county.'],
    },
  ],
};

export const STONECROSS_INTERIORS = {
  inn_stonecross: INN_STONECROSS,
  shop_stonecross: SHOP_STONECROSS,
};
