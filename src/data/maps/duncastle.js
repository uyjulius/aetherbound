/**
 * Duncastle — two walls and a dog-leg.
 *
 * Duncastle was laid out by somebody who expected to be attacked and has never
 * forgiven the world for not getting round to it. The approach doubles back on
 * itself twice before the outer gate, so a cart — or a column — has to turn
 * broadside under the wall to get in at all. Then the bailey: a wide, flat,
 * deliberately empty killing ground that the player must cross corner to
 * corner, because the postern into the inner ward is at the far *opposite* end
 * from the gate they came through. You cannot see into Duncastle from outside
 * Duncastle. That is not an accident of the ground; it cost money.
 *
 * The consequence is social as much as martial. Outsiders trade in the bailey
 * and go no further, so the bailey has become the market and the market is
 * full of people who have been here a fortnight and are not going to be let in.
 */

const W = 36;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[duncastle] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const WARD = () => row(R('#', 6), R('=', 24), R('#', 6));
const BAILEY = () => row(R('#', 3), R('=', 30), R('#', 3));

const TERRAIN = [
  /*  0 */ row(R('#', 36)),
  /*  1 */ row(R('#', 36)),
  // --- the inner ward: the actual town -------------------------------------
  /*  2 */ WARD(),
  /*  3 */ WARD(),
  /*  4 */ WARD(),
  /*  5 */ WARD(),
  /*  6 */ WARD(),
  /*  7 */ WARD(),
  /*  8 */ WARD(),
  /*  9 */ WARD(),
  // --- the inner wall, pierced by one postern, at the western end ----------
  /* 10 */ row(R('#', 6), R('=', 6), R('#', 24)),
  /* 11 */ row(R('#', 6), R('=', 6), R('#', 24)),
  // --- the bailey: kept empty on purpose, used as a market on sufferance ---
  /* 12 */ BAILEY(),
  /* 13 */ BAILEY(),
  /* 14 */ BAILEY(),
  /* 15 */ BAILEY(),
  /* 16 */ BAILEY(),
  /* 17 */ BAILEY(),
  /* 18 */ BAILEY(),
  /* 19 */ BAILEY(),
  // --- the outer gate, at the eastern end: the long diagonal is the point --
  /* 20 */ row(R('#', 24), R('=', 4), R('#', 8)),
  /* 21 */ row(R('#', 24), R('=', 4), R('#', 8)),
  // --- the barbican, doubling back ------------------------------------------
  /* 22 */ row(R('#', 22), R('=', 8), R('#', 6)),
  /* 23 */ row(R('#', 22), R('=', 8), R('#', 6)),
  /* 24 */ row(R('#', 16), R('=', 14), R('#', 6)),
  /* 25 */ row(R('#', 16), R('=', 6), R('#', 14)),
  /* 26 */ row(R('#', 16), R('=', 6), R('#', 14)),
  /* 27 */ row(R('#', 16), R('=', 6), R('#', 14)),
];

export const DUNCASTLE = {
  id: 'duncastle',
  name: 'Duncastle',
  subtitle: 'Two Walls and a Dog-Leg',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#8f9aa2', 65, 220],
  tilt: 0.40,
  cameraDistance: 17,
  music: 'imperium',
  base: 'cobble',
  groundRamp: 'terrain',
  wallHeight: 10.0,
  wallMaterial: 'stone',
  lampIntensity: 3,

  sky: {
    zenith: '#33587a', horizon: '#a8b2ac', ground: '#4a4842',
    sunColor: '#e8dcbc', sunDir: [0.35, 0.55, 0.42], cloud: 0.78,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [18.5, 26], face: 'north' },
    world: { at: [18.5, 26], face: 'north' },
    ward: { at: [18.5, 8], face: 'south' },
  },

  exits: [
    { at: [16, 27], size: [6, 1], to: 'overworld', spawn: 'duncastle', prompt: 'Leave Duncastle' },
  ],

  props: [
    // --- the barbican approach ------------------------------------------------
    { kit: 'lamppost', at: [16.6, 25.4] },
    { kit: 'lamppost', at: [21.4, 25.4] },
    { kit: 'lamppost', at: [23.0, 22.6] },
    { kit: 'lamppost', at: [28.6, 22.6] },
    { kit: 'crate', at: [27.4, 24.4], rot: 0.3 },
    { kit: 'crate', at: [28.5, 24.8], rot: -0.4 },
    { kit: 'barrel', at: [22.8, 24.6] },
    { kit: 'signpost', at: [17.0, 24.4], id: 'dc-gatesign',
      interact: { name: 'Gate Notice', text: [
        'ALL PERSONS ARE VIEWED FROM THE WALL FOR THE WHOLE OF THE APPROACH. THIS IS NOT A THREAT. IT IS A COURTESY.',
        'BEARERS OF WRIT MAY PASS THE POSTERN. ALL OTHERS TRADE IN THE BAILEY AND SLEEP OUTSIDE IT.',
      ] } },
    { kit: 'savepoint', at: [19.6, 24.5], id: 'dc-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },

    // --- the bailey -----------------------------------------------------------
    { kit: 'well', at: [17.5, 15.5], id: 'dc-well', radius: 1.2,
      interact: { name: 'The Siege Well', text: [
        'Sunk two hundred feet through rock so that a garrison could outlast anyone patient enough to sit outside.',
        'Nobody has ever sat outside. The town maintains the well anyway, immaculately, out of what can only be described as hope.',
      ] } },

    { kit: 'building', at: [6.5, 18.0], w: 5, d: 3.6, h: 3.2, rise: 1.5,
      style: 'stone', roof: 'slate', door: 'east',
      id: 'dc-store', enter: 'store_duncastle', enterPrompt: 'Requisitions',
      sign: { icon: '🧪', text: 'Requisitions', x: -1.8 } },

    { kit: 'building', at: [29.5, 18.0], w: 5, d: 3.6, h: 3.2, rise: 1.5,
      style: 'stone', roof: 'slate', door: 'west', id: 'dc-guardhouse',
      sign: { icon: '⚔', text: 'Bailey Watch', x: 1.8 } },

    { kit: 'stall', at: [8.0, 13.4], arg: '#33477c', id: 'dc-stall-1' },
    { kit: 'stall', at: [12.0, 13.4], arg: '#6b5d37', id: 'dc-stall-2' },
    { kit: 'stall', at: [24.0, 13.4], arg: '#5a3230', id: 'dc-stall-3' },
    { kit: 'stall', at: [28.0, 13.4], arg: '#2c5a45', id: 'dc-stall-4' },
    { kit: 'cart', at: [21.0, 18.6], rot: 1.5 },
    { kit: 'cart', at: [12.5, 19.0], rot: 0.2 },
    { kit: 'crate', at: [14.6, 12.8], rot: 0.4 },
    { kit: 'crate', at: [15.2, 13.6], rot: -0.2 },
    { kit: 'barrel', at: [20.6, 12.8] },
    { kit: 'barrel', at: [21.2, 13.5] },
    { kit: 'crate', at: [4.4, 15.0], rot: 0.5 },
    { kit: 'barrel', at: [31.4, 15.2] },
    { kit: 'lamppost', at: [5.0, 12.6] },
    { kit: 'lamppost', at: [31.0, 12.6] },
    { kit: 'lamppost', at: [5.0, 19.4] },
    { kit: 'lamppost', at: [31.0, 19.4] },
    { kit: 'lamppost', at: [17.5, 19.4] },
    { kit: 'bench', at: [24.5, 16.4], rot: 0 },
    { kit: 'bench', at: [10.5, 16.4], rot: 0 },
    { kit: 'fence', at: [26.5, 19.6], arg: 6, radius: 0 },

    // --- the postern ----------------------------------------------------------
    { kit: 'lamppost', at: [6.6, 11.5] },
    { kit: 'lamppost', at: [11.4, 11.5] },

    // --- the inner ward -------------------------------------------------------
    { kit: 'building', at: [18.0, 4.0], w: 14, d: 5.6, h: 5.0, storeys: 2, rise: 2.4,
      style: 'stone', roof: 'slate', chimney: true, door: 'south', id: 'dc-hall',
      sign: { icon: '⚔', text: 'The Muster Hall', x: 0 } },

    { kit: 'building', at: [9.5, 7.4], w: 6, d: 4.4, h: 3.6, storeys: 2, rise: 2.0,
      style: 'plaster', roof: 'slate', timbered: true, chimney: true, door: 'east',
      id: 'dc-inn', enter: 'inn_duncastle', enterPrompt: 'The Second Wall',
      sign: { icon: '🛏', text: 'The Second Wall', x: -2.2 } },

    { kit: 'building', at: [26.0, 7.4], w: 6, d: 4.4, h: 3.8, rise: 1.8,
      style: 'stone', roof: 'iron', chimney: true, door: 'west', id: 'dc-armoury',
      sign: { icon: '⚒', text: 'Town Armoury', x: 2.2 } },

    { kit: 'building', at: [9.5, 3.2], w: 5, d: 3.4, h: 3.2, rise: 1.6,
      style: 'plaster', roof: 'slate', timbered: true, door: 'south', id: 'dc-house-a' },
    { kit: 'building', at: [26.5, 3.2], w: 5, d: 3.4, h: 3.2, rise: 1.6,
      style: 'plaster', roof: 'slate', timbered: true, door: 'south', id: 'dc-house-b' },

    { kit: 'lamppost', at: [13.4, 6.4] },
    { kit: 'lamppost', at: [22.6, 6.4] },
    { kit: 'bench', at: [15.5, 8.6], rot: 0 },
    { kit: 'bench', at: [20.5, 8.6], rot: 0 },
    // The muster roll, out on the trestle in front of the hall where the bailey
    // can see it. Six of its crossings were ruled before the men were dead.
    { kit: 'signpost', at: [18.0, 6.6], id: 'dc-musterroll',
      interact: { prompt: 'The muster roll', event: 'duncastle_roll' } },
    { kit: 'flowerbox', at: [17.0, 6.6] },
    { kit: 'flowerbox', at: [19.0, 6.6] },
    { kit: 'barrel', at: [7.0, 9.0] },
    { kit: 'barrel', at: [7.6, 9.6] },
    { kit: 'crate', at: [28.6, 9.2], rot: 0.3 },
    { kit: 'tree', at: [12.0, 9.2], kind: 'dark', scale: 0.9, seed: 5, id: 'dc-tree-w' },
    { kit: 'tree', at: [24.0, 9.2], kind: 'dark', scale: 0.95, seed: 7, id: 'dc-tree-e' },

    { kit: 'chest', at: [7.0, 2.6], id: 'dc-chest-1',
      contains: { kind: 'item', id: 'guardplate', count: 1, label: 'a suit of Guard Plate' } },
    { kit: 'chest', at: [29.0, 2.6], id: 'dc-chest-2',
      contains: { kind: 'item', id: 'hitonic', count: 3, label: '3 Hi-Tonics' } },
    { kit: 'chest', at: [4.0, 12.6], id: 'dc-chest-3',
      contains: { kind: 'gold', amount: 500, label: '500 gil' } },
  ],

  /**
   * Duncastle after. The wall held. The wall was always going to hold, because
   * the wall was never the problem. The gate is still shut at dusk against a
   * direction the danger did not come from.
   */
  ruin: {
    subtitle: 'The Wall Held',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#7c7268', 45, 165],
    music: 'memory',
    sky: {
      zenith: '#54423c', horizon: '#b09080', ground: '#33302a',
      sunColor: '#ff9d63', sunDir: [-0.4, 0.2, 0.35], cloud: 0.93,
    },
    // Ord is recast for the ruin on the same flagstone, so the whole world's
    // Gate-Captain has to be removed rather than stood inside.
    removeNpcs: ['dc-child', 'dc-trader', 'dc-store', 'dc-gatecaptain'],
    removeProps: ['dc-tree-w', 'dc-tree-e'],
    npcs: [
      {
        id: 'dc-ruin-captain', name: 'Gate-Captain Ord', at: [26.1, 21.4], face: 'south',
        clip: 'idle', prompt: 'Speak',
        look: { build: 'athletic', height: 1.83, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#ac744c', hair: '#5e5163', torso: '#414954', accent: '#5a3230',
            legs: '#2b2933', boots: '#22242a', metal: '#666c74' } },
        talk: [
          'Not one breach. Not one. Every stone where the masons left it.',
          'I have been up on the wall walk trying to work out what I should have been watching, and the answer keeps coming back: not the road.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [12.0, 9.2], kind: 'dead', scale: 1.1, seed: 331 },
      { kit: 'tree', at: [24.0, 9.2], kind: 'dead', scale: 1.2, seed: 333 },
      { kit: 'chest', at: [17.5, 12.6], id: 'dc-ruin-chest',
        contains: { kind: 'item', id: 'wardenmail', count: 1, label: 'a suit of Warden Mail' } },
    ],
  },

  npcs: [
    {
      id: 'dc-sutler', name: 'Sutler Bram Ockley', at: [10.5, 19.2], face: 'east',
      clip: 'work', prompt: 'Trade',
      look: { build: 'heavy', height: 1.68, hair: 'wild',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#6b5d37', accent: '#8a6a23',
          legs: '#5e412c', boots: '#4b382d', gloves: '#7c4939' } },
      shop: 'bloodingyards_sutler',
      talk: [
        'The wagon came off the Blooding Yards and it is going back to the Blooding Yards, and in between it is parked here because a bailey is flat and nobody shoots at it.',
        'I stock nothing clever. Steadying dram, nerve tonic, a helm. Men do not lose fights out there because they were outmatched, they lose them because they were made angry first.',
      ],
    },
    {
      id: 'dc-gatecaptain', name: 'Gate-Captain Ord', at: [25.5, 21.4], face: 'south',
      clip: 'idle', prompt: 'Speak',
      look: { build: 'athletic', height: 1.83, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', metal: '#a6b0bc' } },
      talk: [
        'You walked the whole approach with four crossbows on you and you never looked up once. That is either nerve or it is ignorance and I am not paid to tell them apart.',
        'Trade in the bailey. If somebody lets you through the postern, that is somebody\'s decision and it becomes their problem, not mine.',
      ],
    },
    {
      id: 'dc-postern', name: 'Postern Warden', at: [8.5, 11.4], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.76, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#414954', accent: '#5b6674',
          legs: '#2b2933', boots: '#22242a', metal: '#666c74' } },
      talk: [
        'Fourteen years on this door. I have let nine strangers through and I remember all nine faces and what they were carrying.',
        'You are the tenth. Do not make me remember you for the wrong reason.',
      ],
    },
    {
      id: 'dc-store', name: 'Requisitions Clerk Bex', at: [9.0, 16.6], face: 'east', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.67, hair: 'ponytail',
        colors: { skin: '#e7c39c', hair: '#95602d', torso: '#5b6674', accent: '#1a8fa5',
          legs: '#414954', boots: '#3b3943', gloves: '#666c74' } },
      shop: 'ferran_quartermaster',
      talk: [
        'It was the town store until the spring. Then the Imperium bought the stock, the shelves, and the word above the door.',
        'Same shelves. Same me. New prices, and a form for everything.',
      ],
    },
    {
      id: 'dc-armourer', name: 'Master-at-Arms Fenn', at: [23.5, 6.9], face: 'east', clip: 'work', prompt: 'Trade',
      look: { build: 'hulking', height: 1.87, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#342a37', torso: '#5b6674', accent: '#8a6a23',
          legs: '#414954', boots: '#22242a', gloves: '#666c74', metal: '#a6b0bc' } },
      shop: 'solmere_arms',
      talk: [
        'Everything on that rack is muster kit. Duncastle keeps enough for four hundred and can field a hundred and ten.',
        'The rest we clean, oil, and count. Twice a year. Out loud.',
      ],
    },
    {
      id: 'dc-inn', name: 'Hesper Groat', at: [12.0, 8.6], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#2c5a45', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 60, name: 'The Second Wall' },
      talk: [
        'Sixty. You are inside the second wall, and half of what you are paying for is the sentence I have just said.',
        'The other half is the bread, which is genuinely very good, and which nobody ever mentions.',
      ],
    },
    {
      id: 'dc-chandler', name: 'Chandler Aves', at: [28.0, 6.4], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.64, hair: 'braid',
        colors: { skin: '#dbb28c', hair: '#dedbe0', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d', gloves: '#bda98b' } },
      talk: [
        'Eleven thousand candles in the undercroft, turned twice a year so the wax does not slump.',
        'Enough for a hundred and forty nights of siege. My grandmother set the number and nobody has dared to be the one who reduces it.',
      ],
    },
    {
      // Quill sits out in the bailey, which is where he reads it — cap still
      // on, in front of everybody, and then goes and rings the hour four
      // minutes early. He is here after the wall holds, too.
      id: 'dc-oldsoldier', name: 'Bellringer Quill', at: [20.0, 13.0], face: 'north', clip: 'sit',
      prompt: 'Speak', event: 'postbag_bell',
      look: { build: 'slim', height: 1.60, hair: 'wild', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#95836b', accent: '#5a3230',
          legs: '#4b382d', boots: '#3a2a20' } },
      talk: [
        'I ring the alarm bell on the first of every month so the town does not forget what it sounds like.',
        'Everyone hates it. Everyone would hate the alternative more, and none of them has worked out that those are the same feeling.',
      ],
    },
    {
      // Fifteen days in the bailey and Ord is twenty paces away at the gate,
      // which is the whole joke: the two of them are in sight of each other
      // for the length of the errand. Base world only — he has gone by the
      // time the wall is the only thing left that worked.
      id: 'dc-trader', name: 'Barred Trader', at: [27.0, 16.0], face: 'west', clip: 'loiter',
      prompt: 'Speak', event: 'duncastle_bailey',
      look: { build: 'normal', height: 1.73, hair: 'short', expression: 'sad',
        colors: { skin: '#f0d5b8', hair: '#bd8746', torso: '#4e326c', accent: '#ab8018',
          legs: '#2b2933', boots: '#3a2a20', cape: '#38224f' } },
      talk: [
        'Sixteen days in this yard. I have sold my whole load, bought a return load, and I have still never seen a street.',
        'I have started imagining it. In my version there are geraniums. Do not tell me if there are not.',
      ],
    },
    {
      id: 'dc-wallwatch', name: 'Wall Watch', at: [13.6, 12.6], face: 'south', clip: 'idle', prompt: 'Speak', wander: 1,
      look: { build: 'athletic', height: 1.79, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#4a2a17', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#3b3943', metal: '#a6b0bc' } },
      talk: ['Four hours up, four hours down, and the road empty for every one of them. It is the best job in the world and it is slowly driving me mad.'],
    },
    {
      id: 'dc-child', name: 'Wick', at: [14.0, 17.4], face: 'east', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.27, hair: 'short', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#ac744c', hair: '#342a37', torso: '#33477c', accent: '#f7d968',
          legs: '#414954', boots: '#4b382d' } },
      talk: [
        'There is a way onto the wall walk from behind the chandler\'s that nobody has bricked up because nobody knows.',
        'I am telling you because you will be gone by Thursday and Ord will not believe you.',
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
  fog: ['#241f1c', 22, 70],
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

export const INN_DUNCASTLE = {
  ...ROOM_BASE,
  id: 'inn_duncastle',
  name: 'The Second Wall',
  subtitle: 'Duncastle',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'inn_duncastle'),

  spawns: { default: { at: [7, 5], face: 'north' } },
  exits: [{ at: [7, 6], size: [2, 1], to: 'duncastle', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [3.6, 3.0], rot: 0 },
    { kit: 'bench', at: [3.6, 4.6], rot: 0 },
    { kit: 'bench', at: [11.8, 3.0], rot: 0 },
    { kit: 'bench', at: [11.8, 4.6], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.7, 2.3] },
    { kit: 'crate', at: [13.3, 1.8], rot: 0.3 },
    { kit: 'lamppost', at: [5.0, 1.6] },
    { kit: 'lamppost', at: [10.5, 1.6] },
    { kit: 'chest', at: [13.4, 4.6], id: 'inn-dc-chest',
      contains: { kind: 'item', id: 'wardstone', count: 2, label: '2 Wardstones' } },
    { kit: 'signpost', at: [2.6, 4.6], id: 'inn-dc-board',
      interact: { name: 'Muster Roll', text: [
        'A hundred and ten names, ruled in columns, with the old ones crossed and the new ones written under.',
        'Six of the crossings are in the same ink as the writing beneath. Somebody prepared for the loss in advance and was right.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-dc-keeper', name: 'Hesper Groat', at: [7.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#2c5a45', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 60, name: 'The Second Wall' },
      talk: ['Sixty, and the shutters get barred at dusk whether you are in or out. That is not my rule and I am not the one to argue it with.'],
    },
    {
      id: 'inn-dc-mason', name: 'Wall Mason', at: [4.4, 3.8], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'hulking', height: 1.84, hair: 'bald',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#95836b', accent: '#8a6a23',
          legs: '#5f6572', boots: '#4b382d', gloves: '#bda98b' } },
      talk: [
        'Nine generations of my family have repointed that wall and not one of us has seen it used.',
        'My father called that a triumph. I call it a very long invoice. We did not speak much.',
      ],
    },
  ],
};

export const STORE_DUNCASTLE = {
  ...ROOM_BASE,
  id: 'store_duncastle',
  name: 'Requisitions',
  subtitle: 'Duncastle',
  base: 'cobble',
  music: 'imperium',
  terrain: makeRoom(14, [
    '##############',
    '#============#',
    '#============#',
    '#============#',
    '#============#',
    '######==######',
  ], 'store_duncastle'),

  spawns: { default: { at: [6, 4], face: 'north' } },
  exits: [{ at: [6, 5], size: [2, 1], to: 'duncastle', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.5], rot: -0.3 },
    { kit: 'crate', at: [3.2, 1.7], rot: 0.5 },
    { kit: 'barrel', at: [11.2, 1.7] },
    { kit: 'barrel', at: [10.8, 2.6] },
    { kit: 'lamppost', at: [6.5, 1.4] },
    { kit: 'chest', at: [11.4, 3.8], id: 'store-dc-chest',
      contains: { kind: 'item', id: 'shrapnel', count: 2, label: '2 Shrapnel Charges' } },
  ],

  npcs: [
    {
      id: 'store-dc-clerk', name: 'Requisitions Clerk Bex', at: [7.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.67, hair: 'ponytail',
        colors: { skin: '#e7c39c', hair: '#95602d', torso: '#5b6674', accent: '#1a8fa5',
          legs: '#414954', boots: '#3b3943', gloves: '#666c74' } },
      shop: 'ferran_quartermaster',
      talk: ['Sign nothing you have not read. I say that to everyone. Nobody has ever taken it as advice about me.'],
    },
  ],
};

export const DUNCASTLE_INTERIORS = {
  inn_duncastle: INN_DUNCASTLE,
  store_duncastle: STORE_DUNCASTLE,
};
