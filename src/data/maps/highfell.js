/**
 * Highfell — cut into the hill it sells.
 *
 * Highfell is not built on a hillside, it is built *into* one: three shelves
 * quarried one above another out of the same face, joined by a single ramp at
 * each level and — this is the point — the ramps are at opposite ends. To get
 * from the yard to the masters' shelf you walk the full length of the town
 * twice, in view of both other levels the whole way.
 *
 * So the plan is a switchback, and a switchback has a hierarchy built into it.
 * Everyone in Highfell is standing on stone somebody below them cut, and
 * everyone in Highfell is being looked down on by somebody who has stopped
 * cutting. Nothing here is level and nothing here is unobserved. The galleries
 * bored into the west wall are where the money comes from and where the town
 * loses two or three people a year, which are treated as the same fact.
 */

const W = 38;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[highfell] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 38)),
  /*  1 */ row(R('#', 38)),
  // --- the masters' shelf, with the old gallery at its back ----------------
  /*  2 */ row(R('#', 4), R('C', 6), R('R', 24), R('#', 4)),
  /*  3 */ row(R('#', 4), R('C', 6), R('R', 24), R('#', 4)),
  /*  4 */ row(R('#', 4), R('R', 30), R('#', 4)),
  /*  5 */ row(R('#', 4), R('R', 30), R('#', 4)),
  /*  6 */ row(R('#', 4), R('R', 30), R('#', 4)),
  // --- the face between them, cut through at the eastern end ---------------
  /*  7 */ row(R('#', 4), R('^', 24), R('R', 6), R('#', 4)),
  // --- the town shelf ------------------------------------------------------
  /*  8 */ row(R('#', 3), R('R', 32), R('#', 3)),
  /*  9 */ row(R('#', 3), R('R', 32), R('#', 3)),
  /* 10 */ row(R('#', 3), R('R', 32), R('#', 3)),
  /* 11 */ row(R('#', 3), R('C', 6), R('R', 26), R('#', 3)),
  /* 12 */ row(R('#', 3), R('C', 6), R('R', 26), R('#', 3)),
  /* 13 */ row(R('#', 3), R('R', 32), R('#', 3)),
  // --- the face again, cut through at the western end ----------------------
  /* 14 */ row(R('#', 3), R('R', 6), R('^', 26), R('#', 3)),
  // --- the cutting yard ----------------------------------------------------
  /* 15 */ row(R('#', 2), R('R', 34), R('#', 2)),
  /* 16 */ row(R('#', 2), R('R', 34), R('#', 2)),
  /* 17 */ row(R('#', 2), R('R', 34), R('#', 2)),
  /* 18 */ row(R('#', 2), R('R', 34), R('#', 2)),
  /* 19 */ row(R('#', 2), R('R', 34), R('#', 2)),
  /* 20 */ row(R('#', 2), R('R', 34), R('#', 2)),
  // --- the haul road down ---------------------------------------------------
  /* 21 */ row(R('#', 6), R('R', 26), R('#', 6)),
  /* 22 */ row(R('#', 10), R('R', 18), R('#', 10)),
  /* 23 */ row(R('#', 16), R(',', 6), R('#', 16)),
  /* 24 */ row(R('#', 16), R(',', 6), R('#', 16)),
  /* 25 */ row(R('#', 16), R(',', 6), R('#', 16)),
];

export const HIGHFELL = {
  id: 'highfell',
  name: 'Highfell',
  subtitle: 'Three Shelves and a Hole',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#9aa2a0', 75, 250],
  tilt: 0.44,
  cameraDistance: 16,
  music: 'town_harrowmere',
  base: 'rock',
  groundRamp: 'terrain',
  wallHeight: 7.5,
  wallMaterial: 'stone',
  lampIntensity: 3,

  sky: {
    zenith: '#2e5f88', horizon: '#b4bcb4', ground: '#4e4c46',
    sunColor: '#ffe2b0', sunDir: [0.55, 0.5, 0.3], cloud: 0.6,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [18.5, 23], face: 'north' },
    world: { at: [18.5, 23], face: 'north' },
    shelf: { at: [18.5, 10], face: 'south' },
  },

  exits: [
    { at: [16, 25], size: [6, 1], to: 'overworld', spawn: 'highfell', prompt: 'Leave Highfell' },
  ],

  props: [
    // --- the masters' shelf --------------------------------------------------
    { kit: 'building', at: [24.0, 4.0], w: 9, d: 4.6, h: 3.8, storeys: 2, rise: 2.0,
      style: 'stone', roof: 'slate', chimney: true, door: 'south', id: 'hf-masters',
      sign: { icon: '⚖', text: 'The Cutting Office', x: -3.2 } },
    { kit: 'building', at: [14.0, 4.2], w: 7, d: 4.2, h: 3.6, rise: 1.9,
      style: 'stone', roof: 'slate', door: 'south', id: 'hf-master-house' },
    { kit: 'lamppost', at: [10.5, 2.6] },
    { kit: 'lamppost', at: [19.0, 6.2] },
    { kit: 'lamppost', at: [30.0, 6.2] },
    { kit: 'crate', at: [11.0, 3.4], rot: 0.3 },
    { kit: 'crate', at: [11.4, 4.3], rot: -0.2 },
    { kit: 'barrel', at: [6.5, 2.6] },
    { kit: 'barrel', at: [7.2, 3.3] },
    { kit: 'bench', at: [28.0, 5.6], rot: Math.PI },
    { kit: 'flowerbox', at: [20.4, 2.6] },
    { kit: 'rock', at: [32.0, 3.0], scale: 1.2, seed: 3 },
    { kit: 'signpost', at: [8.5, 4.6], id: 'hf-oldgallery',
      interact: { name: 'The Old Gallery', text: [
        'Boarded, and the boards are older than most of the town.',
        'A plate above the mouth: CLOSED BY ORDER, YEAR 22. Eleven names beneath it, and no dates, because they were all the same day.',
      ] } },

    // --- the town shelf ------------------------------------------------------
    { kit: 'building', at: [13.0, 9.6], w: 9, d: 4.6, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'slate', timbered: true, chimney: true, balcony: true,
      door: 'south', id: 'hf-inn', enter: 'inn_highfell', enterPrompt: 'The Splitting Wedge',
      sign: { icon: '🛏', text: 'The Splitting Wedge', x: -3.2 } },

    { kit: 'building', at: [26.0, 9.6], w: 8, d: 4.6, h: 3.6, rise: 1.9,
      style: 'plaster', roof: 'slate', awning: true, door: 'south', id: 'hf-store',
      sign: { icon: '🧪', text: 'The Company Store', x: -2.8 } },

    { kit: 'building', at: [19.5, 12.6], w: 7, d: 3.2, h: 3.4, rise: 1.6,
      style: 'stone', roof: 'slate', door: 'north', id: 'hf-chapel',
      sign: { icon: '◆', text: 'Wake House', x: 2.4 } },

    { kit: 'lamppost', at: [8.0, 8.6] },
    { kit: 'lamppost', at: [18.5, 8.6] },
    { kit: 'lamppost', at: [31.0, 8.6] },
    { kit: 'lamppost', at: [5.0, 11.5] },
    { kit: 'bench', at: [24.0, 13.0], rot: 0 },
    { kit: 'bench', at: [30.0, 13.0], rot: 0 },
    { kit: 'crate', at: [5.6, 13.2], rot: 0.4 },
    { kit: 'barrel', at: [4.4, 13.4] },
    { kit: 'crate', at: [33.0, 11.4], rot: -0.3 },
    { kit: 'barrel', at: [33.4, 12.4] },
    { kit: 'flowerbox', at: [11.0, 13.4] },

    // --- the winch, on the lip above the yard ---------------------------------
    { kit: 'well', at: [16.5, 13.6], id: 'hf-winch', radius: 1.2,
      interact: { name: 'The Drum', text: [
        'A hauling winch the size of a room, and the rope on it is thicker than a man\'s leg.',
        'Everything Highfell has ever sold went up this drum. So did everyone it ever lost, eventually.',
      ] } },

    // --- the cutting yard -----------------------------------------------------
    { kit: 'building', at: [7.0, 17.0], w: 8, d: 4.6, h: 4.0, rise: 1.6,
      style: 'stone', roof: 'iron', chimney: true, door: 'east',
      id: 'hf-toolwright', enter: 'forge_highfell', enterPrompt: 'The Toolwright',
      sign: { icon: '⚒', text: 'The Toolwright', x: -2.8 } },

    { kit: 'building', at: [29.0, 17.0], w: 7, d: 4.4, h: 3.6, rise: 1.7,
      style: 'stone', roof: 'slate', door: 'west', id: 'hf-weighhouse',
      sign: { icon: '⚖', text: 'Weigh House', x: 2.4 } },

    { kit: 'cart', at: [16.0, 17.5], rot: 0.2 },
    { kit: 'cart', at: [21.5, 19.0], rot: 1.5 },
    { kit: 'rock', at: [13.5, 16.0], scale: 1.6, seed: 5 },
    { kit: 'rock', at: [18.0, 15.6], scale: 1.4, seed: 7 },
    { kit: 'rock', at: [23.5, 16.2], scale: 1.7, seed: 11 },
    { kit: 'rock', at: [11.0, 20.0], scale: 1.3, seed: 13 },
    { kit: 'rock', at: [25.5, 20.2], scale: 1.5, seed: 17 },
    { kit: 'rock', at: [4.0, 19.6], scale: 1.2, seed: 19 },
    { kit: 'rock', at: [33.0, 20.0], scale: 1.1, seed: 23 },
    { kit: 'crate', at: [15.0, 20.4], rot: 0.3 },
    { kit: 'crate', at: [15.7, 21.0], rot: -0.4 },
    { kit: 'barrel', at: [19.4, 21.0] },
    { kit: 'barrel', at: [20.1, 21.6] },
    { kit: 'lamppost', at: [13.0, 21.6] },
    { kit: 'lamppost', at: [24.0, 21.6] },
    { kit: 'fence', at: [8.0, 21.6], arg: 5, radius: 0 },
    { kit: 'fence', at: [29.0, 21.6], arg: 5, radius: 0 },
    { kit: 'tree', at: [3.5, 15.6], kind: 'pine', scale: 0.95, seed: 29, id: 'hf-tree-yard' },
    { kit: 'tree', at: [34.5, 15.8], kind: 'pine', scale: 1.05, seed: 31 },
    { kit: 'bush', at: [31.0, 21.0], scale: 0.9, seed: 37, radius: 0 },

    // --- the haul road out -----------------------------------------------------
    { kit: 'savepoint', at: [18.5, 22.2], id: 'hf-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [16.6, 22.6], id: 'hf-roadsign',
      interact: { name: 'Haul Road Notice', text: [
        'LOADED CARTS HAVE THE ROAD. EMPTY CARTS HAVE THE VERGE. PEOPLE HAVE NEITHER.',
        'Somebody has scratched: AND YET HERE WE ALL ARE.',
      ] } },

    { kit: 'chest', at: [5.0, 2.6], id: 'hf-chest-1',
      contains: { kind: 'item', id: 'ironbrooch', count: 1, label: 'an Iron Brooch' } },
    { kit: 'chest', at: [4.0, 11.6], id: 'hf-chest-2',
      contains: { kind: 'item', id: 'hipotion', count: 2, label: '2 Hi-Potions' } },
    { kit: 'chest', at: [3.0, 18.0], id: 'hf-chest-3',
      contains: { kind: 'gold', amount: 340, label: '340 gil' } },
  ],

  /**
   * Highfell after. The galleries did not fall in. The town is entirely intact
   * and entirely out of work, which is a distinction the masters' shelf is
   * still trying to explain to the yard.
   */
  ruin: {
    subtitle: 'Nothing Left to Cut',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#7e766e', 45, 165],
    music: 'memory',
    sky: {
      zenith: '#5a4640', horizon: '#b89684', ground: '#35322c',
      sunColor: '#ff9d63', sunDir: [-0.45, 0.2, 0.3], cloud: 0.9,
    },
    // The Gallery Foreman is re-cast for the ruin on the very same spot, so
    // the whole world's copy of him has to come off.
    removeNpcs: ['hf-child', 'hf-surveyor', 'hf-store', 'hf-foreman'],
    removeProps: ['hf-tree-yard'],
    npcs: [
      {
        id: 'hf-ruin-cutter', name: 'Gallery Foreman', at: [16.6, 18.4], face: 'north',
        clip: 'work', prompt: 'Speak',
        look: { build: 'hulking', height: 1.89, hair: 'bald', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#96603f', hair: '#241d26', torso: '#95836b', accent: '#5a3230',
            legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
        talk: [
          'Still cutting. Nobody is buying, and I am still cutting.',
          'You want to try standing in a yard this size with your hands empty. I did it for one morning and I have not tried it since.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [3.5, 15.6], kind: 'dead', scale: 1.2, seed: 321 },
      { kit: 'chest', at: [6.5, 3.4], id: 'hf-ruin-chest',
        contains: { kind: 'item', id: 'towershield', count: 1, label: 'a Tower Shield' } },
    ],
  },

  npcs: [
    {
      id: 'hf-ashforge', name: 'Ash Forge Factor Vellick', at: [11.0, 18.4], face: 'north',
      clip: 'work', prompt: 'Trade',
      look: { build: 'hulking', height: 1.84, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#6e4030', hair: '#241d26', torso: '#5a3230', accent: '#95836b',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      shop: 'ashenhall_forge',
      talk: [
        'Ashenhall steel, brought down the pass on a sledge because no cart will carry it and no horse will pull it twice.',
        'A quarry eats iron. Sennet keeps you in edges; I keep you in the things you put between yourself and the hill.',
      ],
    },
    {
      id: 'hf-inn', name: 'Berrick Tull', at: [13.0, 11.4], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.70, hair: 'short', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#5a3230', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 55, name: 'The Splitting Wedge' },
      talk: [
        'Fifty-five. The beds are on the shelf side because the yard side gets the blasting at six.',
        'You will still hear it. You will simply hear it through a wall, which people seem to find worth the money.',
      ],
    },
    {
      id: 'hf-store', name: 'Ilva Marrick', at: [26.0, 11.4], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.68, hair: 'bob', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'solmere_items',
      talk: [
        'Company store. The company sets the prices and the company pays the wages, and I am told the two are unrelated.',
        'Cash, mind. I stopped taking chits the month the chits stopped being worth anything.',
      ],
    },
    {
      id: 'hf-toolwright', name: 'Sennet Vaux', at: [9.6, 17.0], face: 'west', clip: 'work', prompt: 'Trade',
      look: { build: 'hulking', height: 1.86, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      shop: 'harrowmere_arms',
      talk: [
        'Halloran\'s mark on the tang, and Halloran\'s seconds are better than most men\'s firsts.',
        'He sends what the Imperium turned down. I sharpen it properly and sell it honest, and everyone comes out ahead except Halloran.',
      ],
    },
    {
      // Kant is the one who asks, because he is the one who has to open the
      // gallery or not. He is on the masters' shelf and the foreman and Marn
      // are on the two below him, which is the town's whole argument in
      // elevation. He is here in both worlds.
      id: 'hf-overseer', name: 'Overseer Ruel Kant', at: [24.0, 6.2], face: 'south', clip: 'loiter',
      prompt: 'Speak', event: 'highfell_shelf',
      look: { build: 'normal', height: 1.75, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#dedbe0', torso: '#4e326c', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943', cape: '#38224f' } },
      talk: [
        'From up here I can see every hand in the yard. That is not a boast, it is the reason the office is up here.',
        'The Imperium wants the deep gallery reopened. I have told them what it did in Year 22. They wrote it down very neatly.',
      ],
    },
    {
      id: 'hf-foreman', name: 'Gallery Foreman', at: [16.0, 18.4], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.89, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#95836b', accent: '#8a6a23',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      talk: [
        'Rock talks before it goes. Little ticks, like a kettle cooling. Learn that and you will be old.',
        'It has been ticking for three weeks and it has not gone. I would rather it went.',
      ],
    },
    {
      // Four of them were two hundred feet into the west face when it happened
      // and saw nothing at all, which is the only account on this hill that
      // has no picture in it.
      id: 'hf-rannock', name: 'Gallery Hand Rannock', at: [19.0, 18.4], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.84, hair: 'wild',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#6b5d37', accent: '#7c4939',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#bda98b' } },
      event: 'eleven_gallery',
      talk: [
        'Two hundred feet of hill over your head and no weather in it at all. Best room in Highfell and the pay is the same as the yard.',
      ],
    },
    {
      id: 'hf-cutter', name: 'Old Marn', at: [27.5, 13.0], face: 'north', clip: 'sit', prompt: 'Speak',
      look: { build: 'slim', height: 1.63, hair: 'wild', expression: 'sad',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#6b5d37', accent: '#95836b',
          legs: '#4b382d', boots: '#3a2a20' } },
      talk: [
        'Thirty-one years in the galleries. They give you a bench on the town shelf and a name on a plate if you go the other way.',
        'I sit here and breathe carefully and watch the drum. It is a better view than the one I had.',
      ],
    },
    {
      id: 'hf-wakekeeper', name: 'Wake-Keeper Serrin', at: [19.5, 10.8], face: 'north', clip: 'idle', prompt: 'Speak',
      look: { build: 'slim', height: 1.66, hair: 'long', expression: 'neutral',
        colors: { skin: '#ac744c', hair: '#171319', torso: '#2b2933', accent: '#dedbe0',
          legs: '#1e1c25', boots: '#4b382d', cape: '#414954' } },
      talk: [
        'The Wake House opens when the drum rings twice. It has rung twice four times this year.',
        'I keep the door unlocked the rest of the time. People come in to sit where it is quiet and pretend they came for something else.',
      ],
    },
    {
      id: 'hf-surveyor', name: 'Ferran Surveyor', at: [30.5, 10.6], face: 'west', clip: 'work',
      prompt: 'Speak', wander: 1,
      look: { build: 'slim', height: 1.71, hair: 'ponytail',
        colors: { skin: '#e7c39c', hair: '#bd8746', torso: '#5b6674', accent: '#1a8fa5',
          legs: '#414954', boots: '#3b3943', gloves: '#666c74' } },
      talk: [
        'I am measuring the deep gallery. Not the stone — the *hum*. It has a pitch, and the pitch is rising.',
        'The Overseer thinks I am here about slate. I have let him keep thinking it, because the alternative is a conversation.',
      ],
    },
    {
      id: 'hf-child', name: 'Nix', at: [30.5, 6.4], face: 'south', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.30, hair: 'braid', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#496035', accent: '#ffd76a',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'I can get from the yard to here in a hundred and four. That is running both ramps and not stopping at the Wake House.',
        'Mam says if she catches me on the winch rope again she will send me down the drum herself, which is not a real threat because it is the fast way.',
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
  fog: ['#241f1a', 22, 70],
  tilt: 0.30,
  cameraDistance: 12,
  cameraPitch: 0.62,
  base: 'wood',
  groundRamp: 'interior',
  wallHeight: 4.2,
  wallMaterial: 'stone',
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

export const INN_HIGHFELL = {
  ...ROOM_BASE,
  id: 'inn_highfell',
  name: 'The Splitting Wedge',
  subtitle: 'Highfell',
  terrain: makeRoom(18, [
    '##################',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '########oo########',
  ], 'inn_highfell'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'highfell', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [4.0, 3.0], rot: 0 },
    { kit: 'bench', at: [4.0, 4.8], rot: 0 },
    { kit: 'bench', at: [13.0, 3.0], rot: 0 },
    { kit: 'bench', at: [13.0, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.6, 2.4] },
    { kit: 'crate', at: [15.3, 1.7], rot: 0.4 },
    { kit: 'lamppost', at: [5.5, 1.6] },
    { kit: 'lamppost', at: [12.0, 1.6] },
    { kit: 'flowerbox', at: [8.5, 5.6] },
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-hf-chest',
      contains: { kind: 'item', id: 'ironhelm', count: 1, label: 'an Iron Helm' } },
    { kit: 'signpost', at: [3.0, 5.4], id: 'inn-hf-board',
      interact: { name: 'The Slate', text: [
        'Names in chalk, with a number after each. It is not a debt board. It is who is down the gallery today.',
        'Two names have been up since Tuesday. Nobody has rubbed them out and nobody will.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-hf-keeper', name: 'Berrick Tull', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.70, hair: 'short', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#5a3230', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 55, name: 'The Splitting Wedge' },
      talk: ['Fifty-five, and do not tip the cutters. They will only match it and then neither of you has any money.'],
    },
    {
      id: 'inn-hf-widow', name: 'Woman by the Fire', at: [5.2, 4.0], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.65, hair: 'bob', expression: 'sad',
        colors: { skin: '#9a6147', hair: '#4a2a17', torso: '#2b2933', accent: '#8b2a2c',
          legs: '#414954', boots: '#3a2a20' } },
      talk: [
        'The Overseer came himself. He was very correct about it. He had the words ready and he had clearly practised them.',
        'What I wanted was for him to be bad at it. I still think about that more than I think about the gallery.',
      ],
    },
  ],
};

export const FORGE_HIGHFELL = {
  ...ROOM_BASE,
  id: 'forge_highfell',
  name: 'The Toolwright',
  subtitle: 'Highfell',
  base: 'cobble',
  music: 'town_harrowmere',
  terrain: makeRoom(16, [
    '################',
    '#==============#',
    '#==============#',
    '#==============#',
    '#==============#',
    '#######==#######',
  ], 'forge_highfell'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'highfell', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.7, 2.4] },
    { kit: 'crate', at: [13.2, 1.6], rot: 0.4 },
    { kit: 'crate', at: [13.0, 2.7], rot: -0.2 },
    { kit: 'lamppost', at: [4.5, 1.5] },
    { kit: 'lamppost', at: [11.5, 1.5] },
    { kit: 'chest', at: [13.4, 3.8], id: 'forge-hf-chest',
      contains: { kind: 'item', id: 'longspear', count: 1, label: 'a Long Spear' } },
  ],

  npcs: [
    {
      id: 'forge-hf-smith', name: 'Sennet Vaux', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'hulking', height: 1.86, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      shop: 'harrowmere_arms',
      talk: ['A quarry eats steel. Half of what I do all day is putting an edge back on something that met the hill and lost.'],
    },
  ],
};

export const HIGHFELL_INTERIORS = {
  inn_highfell: INN_HIGHFELL,
  forge_highfell: FORGE_HIGHFELL,
};
