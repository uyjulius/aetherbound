/**
 * Merrowdyke — a town in a bowl, and a path round the rim of it.
 *
 * The sea is nine feet above the chimneys. It has been for four hundred years,
 * ever since the first ring of turf went up and the water inside was pumped
 * out, and everybody in Merrowdyke has grown up knowing the exact number.
 *
 * The plan is a ring and a hole. The dyke crown runs unbroken all the way
 * round the map and it is walkable end to end, which is the entire point: the
 * player arrives *on* the rim, at the ramp in the south face, and can see the
 * whole town at once before setting foot in it — the drains, the roofs, the
 * pump house, everybody. Then they walk down into it and cannot see anything
 * again.
 *
 * Inside, the ground is cut into six blocks by three drains — two running
 * north and south, one running east and west — and there is exactly one
 * causeway across the main drain, which is where the whole town has to pass and
 * therefore where the whole town talks. There is no well, because a well here
 * would fill with sea. The water comes off the roofs into a cistern on the
 * crown, which means the only sweet water in Merrowdyke is at the top of the
 * one thing everybody is afraid of.
 */

const W = 32;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[merrowdyke] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** A row inside the ring: wall, dyke, twenty-four columns of polder, dyke, wall. */
const POLDER = (mid) => row(R('#', 2), R('R', 2), mid, R('R', 2), R('#', 2));
/** The ordinary polder row — two north-south drains at the block edges. */
const DRY = () => POLDER(R(',', 6) + R(':', 1) + R(',', 10) + R(':', 1) + R(',', 6));
/** The main drain, with the single causeway across it. */
const MAIN = () => POLDER(R(':', 10) + R(',', 4) + R(':', 10));

const TERRAIN = [
  /*  0 */ row(R('#', 32)),
  // --- the sea, which is higher than everything below this line ------------
  /*  1 */ row(R('#', 2), R('~', 28), R('#', 2)),
  /*  2 */ row(R('#', 2), R('~', 28), R('#', 2)),
  /*  3 */ row(R('#', 2), R('~', 28), R('#', 2)),
  // --- the crown of the north dyke ------------------------------------------
  /*  4 */ row(R('#', 2), R('R', 28), R('#', 2)),
  /*  5 */ row(R('#', 2), R('R', 28), R('#', 2)),
  // --- the polder -----------------------------------------------------------
  /*  6 */ DRY(),
  /*  7 */ DRY(),
  /*  8 */ DRY(),
  /*  9 */ DRY(),
  /* 10 */ DRY(),
  /* 11 */ DRY(),
  /* 12 */ DRY(),
  /* 13 */ DRY(),
  /* 14 */ DRY(),
  /* 15 */ MAIN(),
  /* 16 */ DRY(),
  /* 17 */ DRY(),
  /* 18 */ DRY(),
  /* 19 */ DRY(),
  /* 20 */ DRY(),
  /* 21 */ DRY(),
  /* 22 */ DRY(),
  /* 23 */ DRY(),
  /* 24 */ DRY(),
  /* 25 */ DRY(),
  // --- the crown of the south dyke, and the one cut through it -------------
  /* 26 */ row(R('#', 2), R('R', 28), R('#', 2)),
  /* 27 */ row(R('#', 2), R('R', 12), R(',', 4), R('R', 12), R('#', 2)),
  /* 28 */ row(R('#', 14), R(',', 4), R('#', 14)),
  /* 29 */ row(R('#', 32)),
];

export const MERROWDYKE = {
  id: 'merrowdyke',
  name: 'Merrowdyke',
  subtitle: 'Nine Feet Under the Sea',
  kind: 'town',
  light: 'day',
  grade: 'dawn',
  fog: ['#b0bcbc', 85, 265],
  tilt: 0.42,
  cameraDistance: 19,
  music: 'marsh',
  base: 'dirt',
  groundRamp: 'terrain',
  wallHeight: 4.4,
  wallMaterial: 'rock',
  waterLevel: 0.05,
  water: { shallow: '#4d7a78', deep: '#1b3b44', foam: '#adc9c4' },

  sky: {
    zenith: '#3f77a6', horizon: '#d5d2ba', ground: '#575e4e',
    sunColor: '#ffe4bc', sunDir: [0.34, 0.5, 0.42], cloud: 0.66,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [15.5, 26], face: 'north' },
    world: { at: [15.5, 26], face: 'north' },
    crown: { at: [11.5, 4], face: 'south' },
    causeway: { at: [15.5, 15], face: 'north' },
  },

  exits: [
    { at: [14, 28], size: [4, 1], to: 'eastreach', spawn: 'merrowdyke_dykegate', prompt: 'The dyke ramp' },
  ],

  props: [
    // --- the crown -------------------------------------------------------------
    { kit: 'well', at: [16.0, 4.6], id: 'md-cistern', radius: 1.2,
      interact: { name: 'The Crown Cistern', text: [
        'Not a well. A stone tank sunk into the top of the dyke, fed by lead pipe off every roof in the town.',
        'A board beside it: SWEET WATER. DRAW FREELY. DO NOT WASH IN IT. DO NOT LOOK OVER THE OTHER SIDE WHILE DRAWING.',
      ] } },
    { kit: 'lamppost', at: [6.0, 4.6] },
    { kit: 'lamppost', at: [26.0, 4.6] },
    { kit: 'lamppost', at: [6.0, 26.4] },
    { kit: 'lamppost', at: [26.0, 26.4] },
    { kit: 'bench', at: [11.0, 4.6], rot: 0 },
    { kit: 'bench', at: [21.0, 4.6], rot: 0 },
    { kit: 'signpost', at: [13.4, 4.6], id: 'md-levelboard',
      interact: { name: 'The Level Board', text: [
        'A post with two marks and a great deal of space between them. The upper reads SEA. The lower reads THE CHURCH FLOOR.',
        'The gap is nine feet. A third mark, halfway and unlabelled, has a date beside it: the year of the breach, which nobody in Merrowdyke calls anything else.',
      ] } },
    { kit: 'barrel', at: [3.0, 9.0] },
    { kit: 'barrel', at: [3.0, 10.0] },
    { kit: 'crate', at: [28.6, 20.0], rot: 0.3 },
    { kit: 'crate', at: [28.6, 21.0], rot: -0.25 },
    { kit: 'chest', at: [3.0, 22.0], id: 'md-chest-crown',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },
    { kit: 'chest', at: [28.6, 6.6], id: 'md-chest-north',
      contains: { kind: 'gold', amount: 340, label: '340 gil' } },

    // --- the ramp and the sluice ------------------------------------------------
    { kit: 'lamppost', at: [13.4, 27.4] },
    { kit: 'lamppost', at: [18.6, 27.4] },
    { kit: 'signpost', at: [18.6, 26.4], id: 'md-gateboard',
      interact: { name: 'The Gate Order', text: [
        'THE GATE IS SHUT AT THE FLOOD AND OPENED AT THE EBB. IT IS SHUT BY THE KEEPER. IT IS NOT SHUT BY YOU.',
        'Under that, in paint that has been renewed many more times than the rest: IF THE BELL GOES, GO UP. NOT HOME. UP.',
      ] } },
    { kit: 'savepoint', at: [11.0, 26.4], id: 'md-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },

    // --- the causeway, where the whole town has to pass -------------------------
    { kit: 'fence', at: [13.0, 14.6], arg: 5, radius: 0 },
    { kit: 'fence', at: [19.0, 14.6], arg: 5, radius: 0 },
    { kit: 'fence', at: [13.0, 15.6], arg: 5, radius: 0 },
    { kit: 'fence', at: [19.0, 15.6], arg: 5, radius: 0 },
    { kit: 'stall', at: [15.0, 16.6], arg: '#2c5a45', id: 'md-stall-1' },
    { kit: 'stall', at: [17.0, 13.6], arg: '#8a6a23', id: 'md-stall-2' },
    { kit: 'bush', at: [11.0, 15.0], kind: 'swampReed', scale: 0.9, seed: 3, radius: 0 },
    { kit: 'bush', at: [12.0, 15.0], kind: 'swampReed', scale: 1.0, seed: 5, radius: 0 },
    { kit: 'bush', at: [20.0, 15.0], kind: 'swampReed', scale: 0.95, seed: 7, radius: 0 },
    { kit: 'bush', at: [21.0, 15.0], kind: 'swampReed', scale: 1.0, seed: 9, radius: 0 },
    { kit: 'bush', at: [10.0, 9.0], kind: 'swampReed', scale: 0.9, seed: 11, radius: 0 },
    { kit: 'bush', at: [10.0, 20.0], kind: 'swampReed', scale: 1.0, seed: 13, radius: 0 },
    { kit: 'bush', at: [21.0, 8.0], kind: 'swampReed', scale: 0.95, seed: 15, radius: 0 },
    { kit: 'bush', at: [21.0, 22.0], kind: 'swampReed', scale: 1.0, seed: 17, radius: 0 },

    // --- the middle blocks ------------------------------------------------------
    { kit: 'building', at: [14.0, 19.0], w: 7, d: 6.4, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'tile', timbered: true, balcony: true, chimney: true,
      door: 'south', id: 'md-inn', enter: 'inn_merrowdyke', enterPrompt: 'The Water Mark',
      sign: { icon: '🛏', text: 'The Water Mark', x: -2.6 } },
    { kit: 'building', at: [18.4, 19.0], w: 5, d: 4.4, h: 3.5, rise: 1.9,
      style: 'plaster', roof: 'tile', awning: true, door: 'south',
      id: 'md-shop', enter: 'shop_merrowdyke', enterPrompt: 'The Dry Counter',
      sign: { icon: '🧪', text: 'The Dry Counter', x: 1.9 } },
    { kit: 'building', at: [15.5, 24.0], w: 6, d: 3.4, h: 4.2, rise: 2.2,
      style: 'stone', roof: 'iron', chimney: true, door: 'north', id: 'md-pumphouse',
      sign: { icon: '⚒', text: 'The Pump House', x: -2.2 } },
    { kit: 'building', at: [13.0, 8.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', id: 'md-h-a' },
    { kit: 'building', at: [18.5, 8.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', rot: 0.05, id: 'md-h-b' },
    { kit: 'building', at: [15.5, 12.0], w: 6, d: 3.4, h: 3.8, rise: 2.2,
      style: 'stone', roof: 'slate', door: 'south', id: 'md-chapel',
      sign: { icon: '⚖', text: 'The Low Church', x: -2.2 } },

    // --- the west blocks ---------------------------------------------------------
    { kit: 'building', at: [6.5, 8.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'south', id: 'md-h-d' },
    { kit: 'building', at: [6.5, 12.0], w: 5, d: 3.4, h: 3.3, rise: 1.7,
      style: 'wood', roof: 'thatch', door: 'south', id: 'md-h-e' },
    { kit: 'building', at: [6.5, 18.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'east', id: 'md-h-h' },
    { kit: 'building', at: [6.5, 22.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'east', rot: -0.05, id: 'md-h-i' },
    { kit: 'cart', at: [8.6, 10.4], rot: 1.4 },
    { kit: 'barrel', at: [4.6, 16.0] },
    { kit: 'crate', at: [5.4, 16.2], rot: 0.4 },
    { kit: 'flowerbox', at: [8.4, 20.2] },
    { kit: 'chest', at: [4.4, 24.6], id: 'md-chest-west',
      contains: { kind: 'item', id: 'clearwatercharm', count: 1, label: 'a Clearwater Charm' } },

    // --- the east blocks ---------------------------------------------------------
    { kit: 'building', at: [24.5, 8.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'south', id: 'md-h-f' },
    { kit: 'building', at: [25.0, 12.0], w: 5, d: 3.4, h: 3.3, rise: 1.7,
      style: 'wood', roof: 'thatch', door: 'south', id: 'md-h-g' },
    { kit: 'building', at: [25.0, 18.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'west', id: 'md-h-j' },
    { kit: 'building', at: [25.0, 22.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'west', rot: 0.06, id: 'md-h-k' },
    { kit: 'cart', at: [23.0, 10.4], rot: 0.3 },
    { kit: 'barrel', at: [27.4, 16.0] },
    { kit: 'crate', at: [26.6, 16.2], rot: -0.3 },
    { kit: 'flowerbox', at: [23.4, 20.2] },
    { kit: 'lamppost', at: [22.6, 24.4] },
    { kit: 'lamppost', at: [9.4, 24.4] },
    { kit: 'chest', at: [27.6, 24.6], id: 'md-chest-east',
      contains: { kind: 'item', id: 'wardingcord', count: 1, label: 'a Warding Cord' } },
    { kit: 'signpost', at: [12.4, 21.6], id: 'md-drainboard',
      interact: { name: 'The Drain Roster', text: [
        'Six blocks, six names, and a column of dates. Whichever block you live in, you cut your length of drain in your month.',
        'The last column is headed DID NOT and it has been empty since the breach, which is a longer run than any of the pumps have managed.',
      ] } },
  ],

  /**
   * Merrowdyke after. The pump is still turning. Everything about this town is
   * a thing that must not be allowed to stop, and it has not been allowed to
   * stop, and there are not enough of them left to keep that true for long.
   */
  ruin: {
    subtitle: 'The Pump Still Turning',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#7f8580', 44, 170],
    music: 'memory',
    sky: {
      zenith: '#454358', horizon: '#b0977f', ground: '#343630',
      sunColor: '#ff9d63', sunDir: [-0.3, 0.2, 0.4], cloud: 0.96,
    },
    removeNpcs: ['md-child', 'md-drainer', 'md-newcomer', 'md-reeve'],
    removeProps: [],
    npcs: [
      {
        id: 'md-ruin-reeve', name: 'Dyke-Reeve Halland', at: [20.0, 26.0], face: 'north',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'athletic', height: 1.76, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#ac744c', hair: '#5e5163', torso: '#496035', accent: '#a6b0bc',
            legs: '#5f6572', boots: '#3a2a20', cape: '#5a3230' } },
        talk: [
          'I walk the crown twice a day and there is nobody below to walk it for. I have not been able to think of a reason to stop.',
          'It is turf and clay and four hundred years of somebody. Take away the somebody and you have got a heap of mud with the sea leaning on it.',
        ],
      },
    ],
    props: [
      { kit: 'chest', at: [15.5, 6.0], id: 'md-ruin-chest',
        contains: { kind: 'item', id: 'tideheart', count: 1, label: 'a Tideheart' } },
    ],
  },

  npcs: [
    {
      id: 'md-inn', name: 'Tace Halland', at: [16.0, 20.0], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 38, name: 'The Water Mark' },
      talk: [
        'Thirty-eight. There is a line painted round the taproom at shoulder height and I would rather you did not ask about it on your first night.',
        'Everybody sleeps well here. Nine feet of water over your head and a pump you can hear through the floor, and it is the quietest sleep in the county. I have never worked out why.',
      ],
    },
    {
      id: 'md-shop', name: 'Ovett Crane', at: [19.0, 21.6], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.71, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'harrowmere_items',
      talk: [
        'The Dry Counter, and the name is a boast. Every shelf in here is a foot off the floor and every crate stands on a brick.',
        'I sell more rope, tallow and oiled cloth than anything a person would eat. In Merrowdyke the staple goods are the ones that keep other things working.',
      ],
    },
    {
      id: 'md-reeve', name: 'Dyke-Reeve Halland', at: [21.0, 26.0], face: 'north',
      clip: 'work', prompt: 'Speak', facePlayer: true,
      look: { build: 'athletic', height: 1.76, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#496035', accent: '#a6b0bc',
          legs: '#5f6572', boots: '#3a2a20', cape: '#5a3230' } },
      talk: [
        'Walk the crown before you go down. Everybody does it once and most people do it every time, and it is not for the view.',
        'You are looking for three things: a wet patch on the inner face, a rabbit hole, and a sheep standing somewhere a sheep would not stand. In that order of seriousness.',
      ],
    },
    {
      id: 'md-sluice', name: 'Sluice-Keeper Vare', at: [15.0, 27.0], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.68, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#5b6674', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      talk: [
        'Shut at the flood, open at the ebb, and I have done it two and a half thousand times and I count out loud every time.',
        'People say I could set it and leave it. People say that about everything until the once it matters, and then they are extremely quiet about having said it.',
      ],
    },
    {
      id: 'md-pump', name: 'Pumpman Orrel', at: [15.0, 21.8], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.86, hair: 'topknot',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      talk: [
        'Two horses, four hours apiece, and a wheel my grandfather cut the teeth of. It lifts nine feet and it has to lift nine feet whatever the weather says.',
        'The pump does not drain the town. The pump keeps the town from becoming the thing it wants to be, which is a lake, and it has wanted that the entire time.',
      ],
    },
    {
      id: 'md-drainer', name: 'Drainer Copp', at: [11.0, 16.0], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.74, hair: 'wild',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#6b5d37', accent: '#b34a41',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'Every man cuts his own length in his own month. Nobody has ever had to be told twice, and nobody has ever been thanked for it either.',
        'You can tell a slack length from a hundred yards. The reed goes taller and the water goes still, and still water in Merrowdyke is not restful, it is a warning.',
      ],
    },
    {
      id: 'md-chapel', name: 'Warden Prynn', at: [15.0, 10.0], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'slim', height: 1.70, hair: 'short', expression: 'neutral',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#38224f', accent: '#ffd76a',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      talk: [
        'We bury on the crown. There is nowhere else. Every soul in Merrowdyke ends up nine feet higher than they ever managed to live.',
        'The bell is not rung for services. The bell is rung for one thing only, and everybody in this town knows what to do when they hear it, including the children, including at night.',
      ],
    },
    {
      id: 'md-newcomer', name: 'Ide Marrow', at: [22.4, 20.4], face: 'west', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.72, hair: 'long', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#bd8746', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#414954', boots: '#4b382d' } },
      talk: [
        'I came down from the uplands four years ago and I still cannot get used to standing in a street and watching a mast go past above the roofline.',
        'They do not look up. Not one of them looks up. I asked why and a woman told me you only look up if you are going to do something about it.',
      ],
    },
    {
      id: 'md-old', name: 'Old Merrit', at: [8.0, 24.0], face: 'north', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.59, hair: 'short', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#95836b', accent: '#496035',
          legs: '#6b5d37', boots: '#4b382d' } },
      talk: [
        'I was six at the breach. It was not a wave and it was not a roar. It was a hiss, and it came up the drains before it came over the top, which nobody expected.',
        'Everybody remembers the water. I remember the fish in the church. Two hundred of them, in rows, where the pews had floated out.',
      ],
    },
    {
      id: 'md-child', name: 'Tetch', at: [17.0, 16.0], face: 'north', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.22, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'You can get round the whole crown in two hundred and forty counts if you do not stop and nobody sees you.',
        'The rule is you never run on the inner face and you never dig anywhere. I dug once. My father did not shout. That was much worse.',
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
  fog: ['#1e2120', 22, 70],
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

export const INN_MERROWDYKE = {
  ...ROOM_BASE,
  id: 'inn_merrowdyke',
  name: 'The Water Mark',
  subtitle: 'Merrowdyke',
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
  ], 'inn_merrowdyke'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'merrowdyke', spawn: 'default', prompt: 'Outside' }],

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
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-md-chest',
      contains: { kind: 'item', id: 'frostward', count: 1, label: 'a Frostward' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-md-board',
      interact: { name: 'The Painted Line', text: [
        'A red line runs round all four walls of the taproom at the height of a tall man\'s shoulder, kept fresh, and it is not a decoration.',
        'A card under it: THIS IS WHERE IT CAME TO. IT WENT DOWN AGAIN. IT WILL GO DOWN AGAIN.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-md-keeper', name: 'Tace Halland', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 38, name: 'The Water Mark' },
      talk: ['Thirty-eight. The upstairs rooms are dearer and everybody thinks that is about the view. It is not about the view.'],
    },
    {
      id: 'inn-md-guest', name: 'Coastal Engineer', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.73, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'Clay core, turf face, a batter of one in three, and four centuries of people putting a spadeful back where the rain took it. There is no engineering in it at all.',
        'That is what I put in my report and they were insulted. I meant it as the compliment it is. You cannot buy four centuries of somebody caring.',
      ],
    },
  ],
};

export const SHOP_MERROWDYKE = {
  ...ROOM_BASE,
  id: 'shop_merrowdyke',
  name: 'The Dry Counter',
  subtitle: 'Merrowdyke',
  music: 'shop',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_merrowdyke'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'merrowdyke', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.6], rot: -0.3 },
    { kit: 'crate', at: [3.4, 1.8], rot: 0.5 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.6, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.8, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-md-chest',
      contains: { kind: 'gold', amount: 250, label: '250 gil' } },
  ],

  npcs: [
    {
      id: 'shop-md-keeper', name: 'Ovett Crane', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.71, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'harrowmere_items',
      talk: ['Everything is up on a brick. If you put a thing on the floor in this town you are telling the whole street you have just arrived.'],
    },
  ],
};

export const MERROWDYKE_INTERIORS = {
  inn_merrowdyke: INN_MERROWDYKE,
  shop_merrowdyke: SHOP_MERROWDYKE,
};
