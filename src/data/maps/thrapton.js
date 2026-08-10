/**
 * Thrapton — forty-one houses and one landlord.
 *
 * Cadd & Son sank the pit, built the town to work it, and never sold a brick.
 * Every roof on this map is company property. So is the shop, the lodging
 * house, the chapel and the ground under all of them, and the rent comes off
 * the wage before the wage is a wage.
 *
 * The plan says it before anybody speaks. Thrapton is a grid drawn by an
 * accountant: streets at an exact pitch, blocks of an exact depth, cottages of
 * one design set out on one spacing, every door on the same face, every roof
 * the same slate. Nothing is crooked, nothing is characterful, and nothing was
 * decided by anybody who had to live in it.
 *
 * At the head of the avenue, closing it, is the Counting House — twice the
 * height of anything else and the only building on the map that is not
 * repeated. Everything in the town faces up the avenue at it, because the
 * avenue was laid out so that it would.
 *
 * There is exactly one irregularity. Number thirty-one has a tiled roof, a
 * porch and a flower box, because sixty years ago a clerk wrote the wrong
 * number on a conveyance and the company has been trying to correct it ever
 * since. The whole town walks past it on purpose.
 */

const W = 30;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[thrapton] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** A paved cross-street, wall to wall. */
const STREET = () => row(R('#', 2), R('=', 26), R('#', 2));
/** A block: company ground either side of the avenue. */
const BLOCK = () => row(R('#', 2), R(',', 11), R('=', 4), R(',', 11), R('#', 2));

const TERRAIN = [
  /*  0 */ row(R('#', 30)),
  /*  1 */ row(R('#', 30)),
  // --- the forecourt, and the Counting House standing across the top -------
  /*  2 */ STREET(),
  /*  3 */ STREET(),
  /*  4 */ STREET(),
  // --- the first rank -------------------------------------------------------
  /*  5 */ BLOCK(),
  /*  6 */ BLOCK(),
  /*  7 */ BLOCK(),
  /*  8 */ STREET(),
  /*  9 */ STREET(),
  // --- the second block, deep enough for two ranks back to back ------------
  /* 10 */ BLOCK(),
  /* 11 */ BLOCK(),
  /* 12 */ BLOCK(),
  /* 13 */ BLOCK(),
  /* 14 */ STREET(),
  /* 15 */ STREET(),
  // --- the third block ------------------------------------------------------
  /* 16 */ BLOCK(),
  /* 17 */ BLOCK(),
  /* 18 */ BLOCK(),
  /* 19 */ BLOCK(),
  /* 20 */ STREET(),
  /* 21 */ STREET(),
  // --- the fourth block, and Number Thirty-One at the end of it ------------
  /* 22 */ BLOCK(),
  /* 23 */ BLOCK(),
  /* 24 */ BLOCK(),
  /* 25 */ STREET(),
  /* 26 */ row(R('#', 13), R('=', 4), R('#', 13)),
  /* 27 */ row(R('#', 30)),
];

/** Every cottage in Thrapton, to the inch. */
const COTTAGE = {
  kit: 'building', w: 4, d: 3.4, h: 3.2, rise: 1.6,
  style: 'plaster', roof: 'slate', windows: true, rot: 0,
};
const cottage = (id, at, door) => ({ ...COTTAGE, id, at, door });

export const THRAPTON = {
  id: 'thrapton',
  name: 'Thrapton',
  subtitle: 'Cadd & Son, Proprietors',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#bcbcb4', 85, 265],
  tilt: 0.42,
  cameraDistance: 18,
  music: 'solmere',
  base: 'dirt',
  groundRamp: 'terrain',
  wallHeight: 4.6,
  wallMaterial: 'brick',

  sky: {
    zenith: '#41729c', horizon: '#d6cdb6', ground: '#5a564a',
    sunColor: '#ffe3b6', sunDir: [0.36, 0.56, 0.34], cloud: 0.6,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [14.5, 25], face: 'north' },
    world: { at: [14.5, 25], face: 'north' },
    counting: { at: [14.5, 5], face: 'north' },
  },

  exits: [
    { at: [13, 26], size: [4, 1], to: 'overworld', spawn: 'thrapton_companygate', prompt: 'The company gate' },
  ],

  props: [
    // --- the head of the avenue ------------------------------------------------
    { kit: 'building', at: [15.0, 3.2], w: 10, d: 4, h: 4.4, storeys: 2, rise: 2.6,
      style: 'stone', roof: 'slate', chimney: true, door: 'south', id: 'tp-counting',
      sign: { icon: '⚖', text: 'Cadd & Son', x: -3.6 } },
    { kit: 'building', at: [7.0, 3.2], w: 7, d: 4.4, h: 3.6, rise: 1.9,
      style: 'brick', roof: 'slate', awning: true, door: 'south',
      id: 'tp-store', enter: 'shop_thrapton', enterPrompt: 'The Company Store',
      sign: { icon: '🧪', text: 'The Company Store', x: -2.6 } },
    { kit: 'building', at: [23.0, 3.2], w: 7, d: 4.4, h: 3.6, storeys: 2, rise: 2.0,
      style: 'brick', roof: 'slate', chimney: true, door: 'south',
      id: 'tp-inn', enter: 'inn_thrapton', enterPrompt: 'The Company Rooms',
      sign: { icon: '🛏', text: 'The Company Rooms', x: 2.6 } },
    { kit: 'lamppost', at: [12.4, 4.6] },
    { kit: 'lamppost', at: [17.6, 4.6] },
    { kit: 'signpost', at: [11.0, 4.6], id: 'tp-rentboard',
      interact: { name: 'The Rent Board', text: [
        'RENTS ARE DEDUCTED. COAL IS DEDUCTED. TOOLS ARE DEDUCTED. THE DOCTOR IS DEDUCTED.',
        'BALANCES ARE PAID IN COMPANY NOTE AND ARE GOOD AT THE COMPANY STORE.',
        'A line at the foot, in the same neat hand: THIS IS NOT A COMPLAINT BOX.',
      ] } },
    { kit: 'chest', at: [3.0, 2.6], id: 'tp-chest-yard',
      contains: { kind: 'gold', amount: 300, label: '300 gil' } },

    // --- the first rank ---------------------------------------------------------
    cottage('tp-c-01', [4.0, 6.2], 'south'),
    cottage('tp-c-02', [8.4, 6.2], 'south'),
    cottage('tp-c-03', [21.6, 6.2], 'south'),
    cottage('tp-c-04', [26.0, 6.2], 'south'),
    { kit: 'lamppost', at: [11.0, 8.6] },
    { kit: 'lamppost', at: [19.0, 8.6] },
    { kit: 'barrel', at: [6.2, 5.4] },
    { kit: 'barrel', at: [23.8, 5.4] },

    // --- the second block, two ranks back to back --------------------------------
    cottage('tp-c-05', [4.0, 11.0], 'north'),
    cottage('tp-c-06', [8.4, 11.0], 'north'),
    cottage('tp-c-07', [21.6, 11.0], 'north'),
    cottage('tp-c-08', [26.0, 11.0], 'north'),
    cottage('tp-c-09', [4.0, 13.0], 'south'),
    cottage('tp-c-10', [8.4, 13.0], 'south'),
    cottage('tp-c-11', [21.6, 13.0], 'south'),
    cottage('tp-c-12', [26.0, 13.0], 'south'),
    { kit: 'well', at: [11.6, 12.0], id: 'tp-well', radius: 1.2,
      interact: { name: 'The Company Well', text: [
        'One well to the town, sunk at the exact centre of the plan so that no cottage is nearer it than any other.',
        'The plaque records the depth, the cost and the year, and then the words TO THE ACCOUNT OF THE OCCUPIERS.',
      ] } },
    { kit: 'savepoint', at: [18.4, 12.0], id: 'tp-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [11.0, 14.6] },
    { kit: 'lamppost', at: [19.0, 14.6] },
    { kit: 'crate', at: [6.2, 10.4], rot: 0.3 },
    { kit: 'crate', at: [23.8, 13.8], rot: -0.25 },
    { kit: 'chest', at: [2.6, 12.0], id: 'tp-chest-west',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },

    // --- the third block ----------------------------------------------------------
    cottage('tp-c-13', [4.0, 17.0], 'north'),
    cottage('tp-c-14', [8.4, 17.0], 'north'),
    cottage('tp-c-15', [21.6, 17.0], 'north'),
    cottage('tp-c-16', [26.0, 17.0], 'north'),
    { kit: 'building', at: [11.4, 18.6], w: 5, d: 3.4, h: 3.8, rise: 2.2,
      style: 'brick', roof: 'slate', door: 'east', id: 'tp-chapel',
      sign: { icon: '⚖', text: 'The Company Chapel', x: -1.9 } },
    { kit: 'building', at: [18.6, 18.6], w: 5, d: 3.4, h: 3.6, rise: 2.0,
      style: 'brick', roof: 'slate', door: 'west', id: 'tp-school',
      sign: { icon: '⚖', text: 'The Company School', x: 1.9 } },
    { kit: 'lamppost', at: [11.0, 20.6] },
    { kit: 'lamppost', at: [19.0, 20.6] },
    { kit: 'bench', at: [14.0, 20.6], rot: 0 },
    { kit: 'bench', at: [16.0, 20.6], rot: 0 },
    { kit: 'barrel', at: [6.2, 19.6] },
    { kit: 'barrel', at: [6.9, 19.9] },
    { kit: 'chest', at: [27.4, 19.6], id: 'tp-chest-east',
      contains: { kind: 'item', id: 'steadyband', count: 1, label: 'a Steady Band' } },

    // --- the fourth block, and the one that is wrong --------------------------------
    cottage('tp-c-17', [4.0, 23.2], 'north'),
    cottage('tp-c-18', [8.4, 23.2], 'north'),
    cottage('tp-c-19', [21.6, 23.2], 'north'),
    { kit: 'building', at: [26.0, 23.2], w: 4, d: 3.4, h: 3.2, rise: 1.6,
      style: 'plaster', roof: 'tile', porch: true, door: 'north', id: 'tp-c-31',
      sign: { icon: '⚖', text: 'Thirty-One', x: -1.5 } },
    { kit: 'flowerbox', at: [26.0, 21.8] },
    { kit: 'signpost', at: [24.2, 22.0], id: 'tp-noticeboard',
      interact: { name: 'The Notice on Thirty-One', text: [
        'NOTICE TO QUIT, SERVED THIS DAY AND EVERY QUARTER DAY THESE SIXTY YEARS.',
        'The paper is fresh. The nail hole under it goes right through the post and out the other side.',
      ] } },
    { kit: 'lamppost', at: [12.4, 25.4] },
    { kit: 'lamppost', at: [17.6, 25.4] },
    { kit: 'cart', at: [10.6, 24.0], rot: 0.3 },
    { kit: 'cart', at: [19.4, 24.0], rot: 1.4 },
    { kit: 'tree', at: [12.0, 22.4], kind: 'broadleaf', scale: 1.0, seed: 3, id: 'tp-tree-a' },
    { kit: 'tree', at: [18.0, 22.4], kind: 'broadleaf', scale: 1.0, seed: 3, id: 'tp-tree-b' },
    { kit: 'chest', at: [27.4, 25.4], id: 'tp-chest-gate',
      contains: { kind: 'item', id: 'ledgerofsmalldebts', count: 1, label: 'a Ledger of Small Debts' } },
    { kit: 'signpost', at: [12.0, 25.4], id: 'tp-gateboard',
      interact: { name: 'The Gate Notice', text: [
        'THRAPTON. PRIVATE GROUND THROUGHOUT. NO HAWKING, NO PREACHING, NO MEETINGS.',
        'VISITORS ARE WELCOME AND ARE REMINDED THAT THE ROAD, THE VERGE AND THE GATE ARE ALSO PRIVATE.',
      ] } },
  ],

  /**
   * Thrapton after. The pit is shut and the company is a name on a locked
   * door, and forty-one families are still paying rent into a slot in the
   * Counting House because nobody has told them they may stop.
   */
  ruin: {
    subtitle: 'Still Deducted',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#83817a', 46, 175],
    music: 'memory',
    sky: {
      zenith: '#453f54', horizon: '#b39580', ground: '#35332c',
      sunColor: '#ff9d63', sunDir: [-0.34, 0.22, 0.34], cloud: 0.94,
    },
    removeNpcs: ['tp-child', 'tp-carpenter', 'tp-painter', 'tp-clerk'],
    removeProps: ['tp-tree-a', 'tp-tree-b'],
    npcs: [
      {
        id: 'tp-ruin-clerk', name: 'Chief Clerk Pargeter', at: [13.0, 5.0], face: 'north',
        clip: 'work', prompt: 'Speak',
        look: { build: 'slim', height: 1.71, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#414954', accent: '#a6b0bc',
            legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
        talk: [
          'The books balance. Rent in, coal out, sundries. I have kept them every quarter and they have balanced every quarter.',
          'There is nobody to send them to. I post them into the slot in the door, which is where they were always posted, and the door is locked, which it always was.',
        ],
      },
    ],
    props: [
      { kit: 'chest', at: [15.0, 6.0], id: 'tp-ruin-chest',
        contains: { kind: 'item', id: 'unbrokenoath', count: 1, label: 'an Unbroken Oath' } },
    ],
  },

  npcs: [
    {
      id: 'tp-inn', name: 'Mrs Ottrey', at: [23.0, 5.6], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.65, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 40, name: 'The Company Rooms' },
      talk: [
        'Forty, and I will take your coin gladly, because coin is the only thing that comes into this town from outside and does not go straight back out.',
        'I do not own the beds. I do not own the blankets. I am paid a wage to let you sleep in Mr Cadd\'s furniture and I have made my peace with the arrangement.',
      ],
    },
    {
      id: 'tp-shop', name: 'Storeman Bettes', at: [6.2, 5.6], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.72, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'ferran_quartermaster',
      talk: [
        'You are paid in company note, company note is good at this counter, and this counter is the only counter. That is not a swindle, it is a circle, and everybody can see the whole of it.',
        'Your coin, though. Real coin I take at a discount and I do not apologise, because the moment I have it I have to explain to the Counting House where it went.',
      ],
    },
    {
      id: 'tp-clerk', name: 'Chief Clerk Pargeter', at: [15.0, 5.0], face: 'north', clip: 'work',
      prompt: 'Speak', facePlayer: true,
      look: { build: 'slim', height: 1.71, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'Forty-one cottages, thirty-nine tenancies, one lodging house and one anomaly. I could recite the rent roll backwards and on one occasion I have.',
        'The avenue is four rods wide and points at this window. That was not for grandeur. It was so that one man at this desk can see who is out of doors at eleven in the morning.',
      ],
    },
    {
      id: 'tp-agent', name: 'Agent Fewkes', at: [17.0, 8.6], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'normal', height: 1.75, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#414954', boots: '#3b3943', cape: '#38224f' } },
      talk: [
        'People expect me to be a villain and I keep having to disappoint them. The roofs are sound, the drains work, and there has not been a fever here in eleven years.',
        'That is the difficulty with Thrapton. It is a very well kept town, and not one soul in it can shut their own front door against the man who keeps it.',
      ],
    },
    {
      id: 'tp-widow', name: 'Widow Sarrell', at: [6.0, 8.6], face: 'south', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.60, hair: 'long', expression: 'sad',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#4e326c', accent: '#95836b',
          legs: '#4b382d', boots: '#3a2a20', cape: '#241636' } },
      talk: [
        'The house came with the job. My husband had the job. You may work the rest of it out yourself and you will be quicker than the Counting House was.',
        'They have been very decent. Six months, and the rent forgiven, and a letter saying so. Decency is a thing they can afford and I take it, because the alternative is the road.',
      ],
    },
    {
      id: 'tp-painter', name: 'Ren Sallow', at: [4.0, 20.6], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.76, hair: 'wild',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#496035', accent: '#b34a41',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'I painted my door green. That is the entire offence. There is a schedule of colours and green is not on it, and there are eleven letters about it in a file somewhere.',
        'They will have it back to the schedule by the spring. I know that. Everybody on the street knows that. They still come out and look at it.',
      ],
    },
    {
      id: 'tp-freeholder', name: 'Bartle Quinn', at: [26.0, 20.6], face: 'north', clip: 'loiter', prompt: 'Speak',
      look: { build: 'normal', height: 1.68, hair: 'short', expression: 'happy',
        colors: { skin: '#9a6147', hair: '#bd8746', torso: '#2c5a45', accent: '#ffd76a',
          legs: '#6b5d37', boots: '#4b382d' } },
      talk: [
        'Sixty years ago a clerk wrote thirty-one where he meant thirteen, and my grandmother signed it, and the company has been very polite about it ever since.',
        'I get a notice to quit every quarter day. I keep them in a tin. There are two hundred and forty and I would not part with one of them.',
      ],
    },
    {
      id: 'tp-carpenter', name: 'Joiner Meade', at: [9.0, 14.6], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.85, hair: 'topknot',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      talk: [
        'I mend what breaks and I put it back exactly as it was. If a man wants a shelf I have to ask, and the asking goes up the avenue and comes back down in a fortnight.',
        'Forty-one identical houses and I have never once been allowed to make one of them better. I am a very good joiner. You would not know it from this street.',
      ],
    },
    {
      id: 'tp-preacher', name: 'Chaplain Undrell', at: [13.0, 18.6], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.70, hair: 'short', expression: 'neutral',
        colors: { skin: '#f0d5b8', hair: '#5e5163', torso: '#38224f', accent: '#ffd76a',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      talk: [
        'The chapel is company property, my stipend is company money, and I preach on Sundays about the eye of a needle to a congregation that finds it very funny.',
        'Mr Cadd sits at the front and finds it funny too. That is the part I have never got round.',
      ],
    },
    {
      id: 'tp-child', name: 'Nub', at: [15.0, 16.0], face: 'south', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.22, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'The houses are all the same so you go by the damage. Ours is the one with the crack over the door like a fish. Two doors down is the one with the mended step.',
        'Strangers count. We do not count. Counting is how they find out you have got lost and then everybody knows.',
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
  fog: ['#221f1b', 22, 70],
  tilt: 0.30,
  cameraDistance: 12,
  cameraPitch: 0.62,
  base: 'wood',
  groundRamp: 'interior',
  wallHeight: 4.2,
  wallMaterial: 'brick',
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

export const INN_THRAPTON = {
  ...ROOM_BASE,
  id: 'inn_thrapton',
  name: 'The Company Rooms',
  subtitle: 'Thrapton',
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
  ], 'inn_thrapton'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'thrapton', spawn: 'default', prompt: 'Outside' }],

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
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-tp-chest',
      contains: { kind: 'item', id: 'wardensignet', count: 1, label: "a Warden's Signet" } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-tp-board',
      interact: { name: 'The House Rules', text: [
        'NO LODGER TO REMAIN ABOVE SIX NIGHTS WITHOUT LEAVE OF THE COUNTING HOUSE.',
        'NO GAMES. NO SUBSCRIPTIONS. NO COLLECTIONS OF ANY KIND UPON THESE PREMISES.',
        'Somebody has pencilled at the bottom: RULE THREE IS THE ONLY ONE THEY MEAN.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-tp-keeper', name: 'Mrs Ottrey', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.65, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 40, name: 'The Company Rooms' },
      talk: ['Forty. Sign the book with a name and not a number. Everybody here signs with a number and it has begun to depress me.'],
    },
    {
      id: 'inn-tp-guest', name: 'Union Man', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'athletic', height: 1.77, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#7c4939', accent: '#b34a41',
          legs: '#4b382d', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'Six nights, and the sixth is tomorrow. You cannot organise a town where the meeting hall, the field and the road are all the same man\'s property.',
        'I have tried three times. Every time it ends with a very courteous letter and somebody else\'s family on the road, and I stopped being brave about it after the second.',
      ],
    },
  ],
};

export const SHOP_THRAPTON = {
  ...ROOM_BASE,
  id: 'shop_thrapton',
  name: 'The Company Store',
  subtitle: 'Thrapton',
  music: 'shop',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_thrapton'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'thrapton', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.6], rot: -0.3 },
    { kit: 'crate', at: [3.4, 1.8], rot: 0.5 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.6, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.8, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-tp-chest',
      contains: { kind: 'item', id: 'panacea', count: 2, label: '2 Panaceas' } },
  ],

  npcs: [
    {
      id: 'shop-tp-keeper', name: 'Storeman Bettes', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.72, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'ferran_quartermaster',
      talk: ['The ledger on the counter is not for you. That is the tick book, and every name in this town is in it, and it is the reason nobody leaves.'],
    },
  ],
};

export const THRAPTON_INTERIORS = {
  inn_thrapton: INN_THRAPTON,
  shop_thrapton: SHOP_THRAPTON,
};
