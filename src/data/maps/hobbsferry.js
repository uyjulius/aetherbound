/**
 * Hobbsferry — one town, two banks, and a boat.
 *
 * The Hobb is four hundred feet across and forty deep in the channel, and
 * there has never been a bridge. There is a ferry. There has always been a
 * ferry, it is held by one family, and everything else on this map is a
 * consequence of that single fact.
 *
 * The plan is two banks that are not the same town twice over — they have
 * specialised. The north bank is the Waiting Side: an inn, a tea stall, a
 * ferry office, and more benches per yard than anywhere in the province,
 * because the north bank is where you stand about being early. The south bank
 * is the Business Side: warehouses, a weighing floor, the shop, the market —
 * everything anybody actually came here to do. Nobody waits on the south bank.
 * Waiting on the south bank means you have missed something.
 *
 * The two slips do not face each other. The north one runs out at the top of
 * the reach and the south one a hundred yards downstream, because the current
 * sets that way and a laden boat crosses on the slant. The player can see both
 * from either, cannot walk between them, and has to take the boat like
 * everybody else — which is exactly the experience the whole town is built on.
 */

const W = 32;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[hobbsferry] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const NORTH = () => row(R('#', 2), R(',', 28), R('#', 2));
const SOUTH = () => row(R('#', 2), R(',', 28), R('#', 2));

const TERRAIN = [
  /*  0 */ row(R('#', 32)),
  // --- the only road into the place, and it comes to the wrong bank --------
  /*  1 */ row(R('#', 13), R(',', 6), R('#', 13)),
  /*  2 */ row(R('#', 13), R(',', 6), R('#', 13)),
  // --- the Waiting Side ------------------------------------------------------
  /*  3 */ NORTH(),
  /*  4 */ NORTH(),
  /*  5 */ NORTH(),
  /*  6 */ NORTH(),
  /*  7 */ NORTH(),
  /*  8 */ NORTH(),
  /*  9 */ NORTH(),
  /* 10 */ NORTH(),
  /* 11 */ NORTH(),
  /* 12 */ row(R('#', 2), R('=', 28), R('#', 2)),
  // --- the Hobb, and the two slips that do not face each other -------------
  /* 13 */ row(R('#', 2), R('~', 6), R('o', 4), R('~', 18), R('#', 2)),
  /* 14 */ row(R('#', 2), R('~', 6), R('o', 4), R('~', 18), R('#', 2)),
  /* 15 */ row(R('#', 2), R('~', 28), R('#', 2)),
  /* 16 */ row(R('#', 2), R('~', 28), R('#', 2)),
  /* 17 */ row(R('#', 2), R('~', 18), R('o', 4), R('~', 6), R('#', 2)),
  /* 18 */ row(R('#', 2), R('~', 18), R('o', 4), R('~', 6), R('#', 2)),
  // --- the Business Side -----------------------------------------------------
  /* 19 */ row(R('#', 2), R('=', 28), R('#', 2)),
  /* 20 */ SOUTH(),
  /* 21 */ SOUTH(),
  /* 22 */ SOUTH(),
  /* 23 */ SOUTH(),
  /* 24 */ SOUTH(),
  /* 25 */ SOUTH(),
  /* 26 */ SOUTH(),
  /* 27 */ SOUTH(),
  /* 28 */ SOUTH(),
  /* 29 */ row(R('#', 32)),
];

export const HOBBSFERRY = {
  id: 'hobbsferry',
  name: 'Hobbsferry',
  subtitle: 'No Bridge, and No Plans',
  kind: 'town',
  light: 'day',
  grade: 'dawn',
  fog: ['#b4c2c4', 88, 275],
  tilt: 0.42,
  cameraDistance: 18,
  music: 'coast',
  base: 'dirt',
  groundRamp: 'terrain',
  wallHeight: 4.4,
  wallMaterial: 'rock',
  waterLevel: -0.24,
  water: { shallow: '#3f7180', deep: '#132e3a', foam: '#aacdd6' },

  sky: {
    zenith: '#3c78ac', horizon: '#d7d0b6', ground: '#585a4c',
    sunColor: '#ffe3b4', sunDir: [0.4, 0.52, 0.4], cloud: 0.6,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [15.5, 4], face: 'south' },
    world: { at: [15.5, 4], face: 'south' },
    north_slip: { at: [8.6, 12], face: 'north' },
    south_slip: { at: [22.6, 19], face: 'south' },
  },

  exits: [
    { at: [13, 1], size: [6, 1], to: 'eastreach', spawn: 'hobbsferry_northlanding', prompt: 'The north road' },
    // The ferry. It is the only crossing, and it costs a fade to sea and back.
    { at: [8, 14], size: [4, 1], to: 'hobbsferry', spawn: 'south_slip', prompt: 'Take the ferry across' },
    { at: [20, 17], size: [4, 1], to: 'hobbsferry', spawn: 'north_slip', prompt: 'Take the ferry back' },
  ],

  props: [
    // --- the Waiting Side --------------------------------------------------------
    { kit: 'building', at: [8.0, 6.0], w: 8, d: 6.4, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'slate', timbered: true, balcony: true, chimney: true,
      door: 'south', id: 'hf-inn', enter: 'inn_hobbsferry', enterPrompt: 'The Half Hour',
      sign: { icon: '🛏', text: 'The Half Hour', x: -3.0 } },
    { kit: 'building', at: [16.0, 10.0], w: 6, d: 4, h: 3.6, rise: 2.0,
      style: 'stone', roof: 'slate', chimney: true, door: 'north', id: 'hf-office',
      sign: { icon: '⚖', text: 'The Ferry Office', x: -2.2 } },
    { kit: 'building', at: [13.0, 4.4], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', id: 'hf-h-d' },
    { kit: 'building', at: [22.0, 5.5], w: 6, d: 4, h: 3.5, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', rot: 0.05, id: 'hf-h-a' },
    { kit: 'building', at: [27.0, 8.6], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'west', id: 'hf-h-b' },
    { kit: 'building', at: [3.6, 10.6], w: 5, d: 3.4, h: 3.3, rise: 1.7,
      style: 'wood', roof: 'thatch', door: 'east', id: 'hf-h-c' },

    { kit: 'bench', at: [11.0, 11.4], rot: 0 },
    { kit: 'bench', at: [13.0, 11.4], rot: 0 },
    { kit: 'bench', at: [19.6, 11.4], rot: 0 },
    { kit: 'bench', at: [21.6, 11.4], rot: 0 },
    { kit: 'bench', at: [23.6, 11.4], rot: 0 },
    { kit: 'bench', at: [6.0, 9.4], rot: 0 },
    { kit: 'stall', at: [12.6, 8.4], arg: '#8a6a23', id: 'hf-stall-tea' },
    { kit: 'stall', at: [20.0, 8.4], arg: '#2c5a45', id: 'hf-stall-pie' },
    { kit: 'lamppost', at: [10.0, 12.4] },
    { kit: 'lamppost', at: [16.0, 12.4] },
    { kit: 'lamppost', at: [24.0, 12.4] },
    { kit: 'lamppost', at: [15.4, 2.6] },
    { kit: 'flowerbox', at: [18.4, 6.4] },
    { kit: 'barrel', at: [3.0, 5.4] },
    { kit: 'barrel', at: [3.0, 6.4] },
    { kit: 'crate', at: [28.4, 12.0], rot: 0.3 },
    { kit: 'crate', at: [28.4, 11.0], rot: -0.25 },
    { kit: 'savepoint', at: [6.0, 12.2], id: 'hf-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [14.0, 12.4], id: 'hf-timetable',
      interact: { name: 'The Times of Crossing', text: [
        'A board, glazed, with the hours painted on and a slot for a slate underneath.',
        'THE FERRY GOES WHEN THE FERRY IS FULL. THE HOURS BELOW ARE A GUIDE AND ARE NOT A PROMISE.',
        'The slate in the slot says, in chalk: WHEN IT SUITS. It has said that for as long as anybody can remember and the glass is kept beautifully clean.',
      ] } },
    { kit: 'signpost', at: [13.4, 2.6], id: 'hf-roadboard',
      interact: { name: 'The Road Notice', text: [
        'HOBBSFERRY. NORTH BANK. ALL BUSINESS OF THE TOWN IS CONDUCTED ON THE SOUTH BANK.',
        'A traveller has added, in charcoal, with feeling: THEN WHY IS THE ROAD HERE.',
      ] } },
    { kit: 'chest', at: [2.6, 3.4], id: 'hf-chest-north',
      contains: { kind: 'gold', amount: 320, label: '320 gil' } },
    { kit: 'chest', at: [28.6, 4.4], id: 'hf-chest-lane',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },

    // --- the slips ---------------------------------------------------------------
    { kit: 'barrel', at: [8.4, 13.4] },
    { kit: 'barrel', at: [11.6, 13.4] },
    { kit: 'crate', at: [20.4, 18.4], rot: 0.2 },
    { kit: 'crate', at: [23.6, 18.4], rot: -0.3 },

    // --- the Business Side ----------------------------------------------------------
    { kit: 'building', at: [6.0, 21.2], w: 8, d: 5, h: 4.0, rise: 2.2,
      style: 'wood', roof: 'slate', windows: false, door: 'north', id: 'hf-warehouse-a',
      sign: { icon: '⚖', text: 'The Weighing Floor', x: -3.0 } },
    { kit: 'building', at: [14.4, 21.2], w: 8, d: 5, h: 4.0, rise: 2.2,
      style: 'wood', roof: 'slate', windows: false, door: 'north', id: 'hf-warehouse-b' },
    { kit: 'building', at: [24.0, 22.0], w: 7, d: 4.4, h: 3.6, rise: 1.9,
      style: 'plaster', roof: 'tile', awning: true, door: 'north',
      id: 'hf-shop', enter: 'shop_hobbsferry', enterPrompt: 'The Far Bank Counter',
      sign: { icon: '🧪', text: 'The Far Bank Counter', x: -2.6 } },
    { kit: 'building', at: [6.0, 25.8], w: 6, d: 4, h: 3.5, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'north', id: 'hf-h-e' },
    { kit: 'building', at: [14.0, 25.8], w: 6, d: 4, h: 3.5, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'north', rot: -0.05, id: 'hf-h-f' },
    { kit: 'building', at: [22.0, 26.2], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'north', id: 'hf-h-g' },
    { kit: 'building', at: [28.0, 25.0], w: 4, d: 3.4, h: 3.3, rise: 1.7,
      style: 'wood', roof: 'thatch', door: 'west', id: 'hf-h-h' },
    { kit: 'well', at: [19.0, 24.6], id: 'hf-well', radius: 1.2,
      interact: { name: 'The South Bank Well', text: [
        'The only well in the town. The north bank draws from the beck and has complained about it for two hundred years.',
        'A board on the winch: WATER FREE TO ALL. CARRIAGE OF WATER ACROSS THE RIVER, ONE COPPER THE PAIL, PAYABLE TO THE FERRY.',
      ] } },
    { kit: 'stall', at: [10.4, 24.0], arg: '#8b2a2c', id: 'hf-stall-1' },
    { kit: 'stall', at: [17.0, 22.4], arg: '#33477c', id: 'hf-stall-2' },
    { kit: 'cart', at: [10.6, 20.4], rot: 1.4 },
    { kit: 'cart', at: [26.0, 19.6], rot: 0.3 },
    { kit: 'crate', at: [3.0, 24.0], rot: 0.3 },
    { kit: 'crate', at: [3.6, 24.8], rot: -0.2 },
    { kit: 'barrel', at: [19.4, 20.4] },
    { kit: 'barrel', at: [20.2, 20.6] },
    { kit: 'lamppost', at: [12.0, 19.6] },
    { kit: 'lamppost', at: [22.0, 19.6] },
    { kit: 'flowerbox', at: [24.0, 25.0] },
    { kit: 'tree', at: [2.8, 20.6], kind: 'broadleaf', scale: 1.05, seed: 3, id: 'hf-tree-w' },
    { kit: 'tree', at: [29.2, 21.4], kind: 'autumn', scale: 1.0, seed: 7, id: 'hf-tree-e' },
    { kit: 'bush', at: [9.0, 27.6], scale: 1.0, seed: 17, radius: 0 },
    { kit: 'bush', at: [26.0, 27.6], scale: 1.05, seed: 19, radius: 0 },
    { kit: 'chest', at: [2.6, 27.4], id: 'hf-chest-south',
      contains: { kind: 'item', id: 'wanderersbell', count: 1, label: "a Wanderer's Bell" } },
    { kit: 'chest', at: [29.4, 27.4], id: 'hf-chest-yard',
      contains: { kind: 'item', id: 'clearwatercharm', count: 1, label: 'a Clearwater Charm' } },
    { kit: 'signpost', at: [17.0, 19.6], id: 'hf-tollboard',
      interact: { name: 'The Toll Table', text: [
        'A PERSON, ONE COPPER. A PERSON WITH A LOAD, TWO. A BEAST, FOUR. A CART, TEN, AND TAKEN TO PIECES.',
        'A CORPSE, NOTHING, AND IT GOES FIRST. That line is older than the rest and has been recut twice.',
      ] } },
  ],

  /**
   * Hobbsferry after. The north bank is empty and the south bank is holding on,
   * and the boat still crosses, because a ferry that stops crossing is two
   * villages that will never see each other again.
   */
  ruin: {
    subtitle: 'The Boat Still Crossing',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#84867e', 46, 175],
    music: 'memory',
    sky: {
      zenith: '#44405a', horizon: '#b39682', ground: '#35342d',
      sunColor: '#ff9d63', sunDir: [-0.32, 0.22, 0.38], cloud: 0.94,
    },
    removeNpcs: ['hf-child', 'hf-carter', 'hf-promoter', 'hf-ferryman'],
    removeProps: ['hf-tree-w', 'hf-tree-e'],
    npcs: [
      {
        id: 'hf-ruin-ferryman', name: 'Ferryman Hobb', at: [10.0, 13.0], face: 'south',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'hulking', height: 1.86, hair: 'wild', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#96603f', hair: '#dedbe0', torso: '#33477c', accent: '#3fc6d6',
            legs: '#414954', boots: '#3a2a20', gloves: '#5b6674' } },
        talk: [
          'Nine crossings yesterday and eight of them empty. I go on the hour whether there is anybody in the boat or not, now.',
          'My family has held this crossing for four hundred years and every one of us understood the same thing: the boat is not a business. The boat is the only thing joining them.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [2.8, 20.6], kind: 'dead', scale: 1.3, seed: 1101 },
      { kit: 'tree', at: [29.2, 21.4], kind: 'dead', scale: 1.2, seed: 1103 },
      { kit: 'chest', at: [15.5, 7.0], id: 'hf-ruin-chest',
        contains: { kind: 'item', id: 'tideheart', count: 1, label: 'a Tideheart' } },
    ],
  },

  npcs: [
    {
      id: 'hf-inn', name: 'Rhoda Kell', at: [8.0, 8.4], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 38, name: 'The Half Hour' },
      talk: [
        'Thirty-eight. The house is called the Half Hour because that is what everybody says when they come in, and not one of them has ever been right.',
        'I do not need to advertise, I do not need to be good, and I am good anyway, which annoys me. There is nowhere else to stand.',
      ],
    },
    {
      id: 'hf-shop', name: 'Ansel Vye', at: [24.0, 24.4], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.71, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'harrowmere_items',
      talk: [
        'Everything on these shelves has been in that boat. That is a copper a load on the ferry before I have unwrapped it, and it is in the price, and I show people the toll table.',
        'The north bank asks me to open a counter on their side. I would need two of everything and two of me. I have offered them one of me, on Thursdays. They were not pleased.',
      ],
    },
    {
      id: 'hf-ferryman', name: 'Ferryman Hobb', at: [9.0, 13.0], face: 'south', clip: 'work',
      prompt: 'Speak', facePlayer: true,
      look: { build: 'hulking', height: 1.86, hair: 'wild', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#33477c', accent: '#3fc6d6',
          legs: '#414954', boots: '#3a2a20', gloves: '#5b6674' } },
      talk: [
        'I go when she is full or when I have a mind to, and in four hundred years nobody has established which of those it was on any given morning.',
        'The slips do not face each other because the water does not. Come across on the square and you land a furlong below the town with a boat full of people telling you about it.',
      ],
    },
    {
      id: 'hf-clerk', name: 'Toll-Clerk Bly', at: [16.0, 7.6], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.70, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#5e5163', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'A copper a head, two with a load, ten for a cart and the cart in pieces. I have taken that toll eleven thousand times and been argued with eleven thousand times.',
        'The dead go free and they go first. That is the oldest line on the table and it is the only one nobody has ever tried to haggle over.',
      ],
    },
    {
      id: 'hf-waiting', name: 'Waiting Man Prole', at: [22.0, 10.4], face: 'south', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.72, hair: 'short', expression: 'neutral',
        colors: { skin: '#dbb28c', hair: '#bd8746', torso: '#496035', accent: '#5a3230',
          legs: '#6b5d37', boots: '#4b382d' } },
      talk: [
        'Third morning. I have a letter that must be handed to a man on the south bank and he has a letter that must be handed to me, and neither of us will cross to be the one who came.',
        'We can see each other. He is the one by the weighing floor in the brown. We have waved. It has become quite friendly and neither of us is going anywhere.',
      ],
    },
    {
      id: 'hf-merchant', name: 'Factor Skene', at: [12.0, 22.8], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.74, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#95602d', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#414954', boots: '#3b3943', cape: '#38224f' } },
      talk: [
        'Nobody waits on this bank. If you are standing still on the south side you have missed a boat, a price or a point, and everyone can see which.',
        'They sit on their benches over there and they call us hard. We are not hard. We are simply on the side where the thing has to be finished.',
      ],
    },
    {
      id: 'hf-carter', name: 'Carter Ludd', at: [9.0, 20.4], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.88, hair: 'topknot',
        colors: { skin: '#c08865', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#4b382d', gloves: '#4b382d' } },
      talk: [
        'Unload, ferry, reload, and the wheels go over separately, and it is four hours for four hundred feet.',
        'Every carter west of here quotes Hobbsferry as a day. It is not a day. It is a morning and a temper, and we all charge for the day.',
      ],
    },
    {
      id: 'hf-promoter', name: 'Mr Ashbee', at: [17.6, 10.4], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'slim', height: 1.73, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#38224f', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943', gloves: '#4b382d' } },
      talk: [
        'Three piers, a middle span and nine hundred gil, and I have the drawings in my bag and I have had them for six years.',
        'The Hobbs will not sell the crossing right and the corporation will not buy what it cannot get. So I stand here and describe a bridge to people standing in a queue for a boat, and they buy me drinks, and nothing happens.',
      ],
    },
    {
      id: 'hf-widow', name: 'Old Mrs Prole', at: [25.0, 10.4], face: 'south', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.59, hair: 'long', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#4e326c', accent: '#95836b',
          legs: '#4b382d', boots: '#3a2a20', cape: '#241636' } },
      talk: [
        'Nineteen years since I was on the other side. My sister is over there. We write, and the letters go across for nothing because the ferryman is fond of us.',
        'It is not the water. I was born on a boat. It is that if I go over I shall have to come back, and I have got out of the habit of the coming back.',
      ],
    },
    {
      id: 'hf-child', name: 'Sput', at: [12.0, 10.0], face: 'south', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.23, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'You can swim it in the slack at the bottom of the tide. Four of us have. You come out a long way down and you walk back up in front of everybody, which is the hard part.',
        'The ferryman knows. He has never told anyone. He just charges you double the next time and does not say why.',
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
  fog: ['#1f2120', 22, 70],
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

export const INN_HOBBSFERRY = {
  ...ROOM_BASE,
  id: 'inn_hobbsferry',
  name: 'The Half Hour',
  subtitle: 'Hobbsferry',
  music: 'festival',
  terrain: makeRoom(20, [
    '####################',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#########oo#########',
  ], 'inn_hobbsferry'),

  spawns: { default: { at: [9, 6], face: 'north' } },
  exits: [{ at: [9, 7], size: [2, 1], to: 'hobbsferry', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [5.0, 3.0], rot: 0 },
    { kit: 'bench', at: [5.0, 4.8], rot: 0 },
    { kit: 'bench', at: [14.0, 3.0], rot: 0 },
    { kit: 'bench', at: [14.0, 4.8], rot: 0 },
    { kit: 'bench', at: [9.6, 3.4], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.8, 2.4] },
    { kit: 'crate', at: [17.2, 1.7], rot: 0.3 },
    { kit: 'crate', at: [17.0, 2.8], rot: -0.25 },
    { kit: 'lamppost', at: [6.5, 1.6] },
    { kit: 'lamppost', at: [13.0, 1.6] },
    { kit: 'flowerbox', at: [11.6, 5.4] },
    { kit: 'chest', at: [17.4, 5.4], id: 'inn-hf-chest',
      contains: { kind: 'item', id: 'sandglass', count: 1, label: 'a Sandglass' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-hf-board',
      interact: { name: 'The Waiting Book', text: [
        'A ledger left open on a shelf by the window, for people to write down what they missed the boat for.',
        'The entries include a wedding, four funerals, two markets, one execution and a great many dinners. The most recent reads: NOTHING. I JUST LIKE IT IN HERE.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-hf-keeper', name: 'Rhoda Kell', at: [9.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 38, name: 'The Half Hour' },
      talk: ['Thirty-eight. And if you hear the bell and run, sit down again. The bell is for the boat coming in, not the boat going out.'],
    },
    {
      id: 'inn-hf-guest', name: 'Drover Off the Boat', at: [3.6, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'athletic', height: 1.78, hair: 'wild',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#6b5d37', accent: '#b34a41',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'Beasts go four coppers a head and they go one at a time, so a drove of forty is a day and a half and a great deal of shouting from the bank.',
        'You would think we would go round. It is eleven miles to the next crossing and the next crossing is a Hobb as well.',
      ],
    },
  ],
};

export const SHOP_HOBBSFERRY = {
  ...ROOM_BASE,
  id: 'shop_hobbsferry',
  name: 'The Far Bank Counter',
  subtitle: 'Hobbsferry',
  music: 'shop',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_hobbsferry'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'hobbsferry', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.6], rot: -0.3 },
    { kit: 'crate', at: [3.4, 1.8], rot: 0.5 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.6, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.8, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-hf-chest',
      contains: { kind: 'gold', amount: 230, label: '230 gil' } },
  ],

  npcs: [
    {
      id: 'shop-hf-keeper', name: 'Ansel Vye', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.71, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'harrowmere_items',
      talk: ['Buy it now. There is no second counter, there is no second boat, and the two of those facts have kept this shop in business for a century.'],
    },
  ],
};

export const HOBBSFERRY_INTERIORS = {
  inn_hobbsferry: INN_HOBBSFERRY,
  shop_hobbsferry: SHOP_HOBBSFERRY,
};
