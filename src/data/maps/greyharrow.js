/**
 * Greyharrow — a fort with a market growing through it.
 *
 * Built to hold four hundred men, on a plan drawn by an engineer who never
 * came: a rampart, one gate, three cross-lanes at exact intervals, and six
 * identical barrack blocks in two ranks. Nothing in the layout is a choice.
 * Everything in it is a measurement.
 *
 * There are now sixty-one soldiers and something over nine hundred civilians,
 * and the plan has not changed by a single yard, because a plan cannot be
 * argued with. So the town happened *inside* it. The parade ground is the
 * market — the geometry underneath is still perfectly square and the stalls on
 * top are at every angle but square. Four of the six blocks have had doors cut
 * into the wrong walls and washing hung off the drill rails. One block, out on
 * the east, is still exactly as drawn, with a fence round it and a man in front
 * of it, and everybody in Greyharrow can tell you which one it is.
 *
 * The joke is legible from anywhere you stand: the ground is army, the things
 * standing on it are not, and the ground is losing.
 */

const W = 32;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[greyharrow] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** A cross-lane: ruler-straight, wall to wall, exactly as drawn. */
const LANE = () => row(R('#', 3), R('=', 26), R('#', 3));
/** A block band: barrack plots either side of the parade. */
const BLOCK = () => row(R('#', 3), R(',', 6), R('=', 14), R(',', 6), R('#', 3));

const TERRAIN = [
  /*  0 */ row(R('#', 32)),
  /*  1 */ row(R('#', 32)),
  /*  2 */ row(R('#', 32)),
  // --- first cross-lane ----------------------------------------------------
  /*  3 */ LANE(),
  /*  4 */ LANE(),
  // --- blocks one and two --------------------------------------------------
  /*  5 */ BLOCK(),
  /*  6 */ BLOCK(),
  /*  7 */ BLOCK(),
  /*  8 */ BLOCK(),
  /*  9 */ BLOCK(),
  // --- second cross-lane ---------------------------------------------------
  /* 10 */ LANE(),
  /* 11 */ LANE(),
  // --- blocks three and four -----------------------------------------------
  /* 12 */ BLOCK(),
  /* 13 */ BLOCK(),
  /* 14 */ BLOCK(),
  /* 15 */ BLOCK(),
  /* 16 */ BLOCK(),
  // --- third cross-lane ----------------------------------------------------
  /* 17 */ LANE(),
  /* 18 */ LANE(),
  // --- blocks five and six -------------------------------------------------
  /* 19 */ BLOCK(),
  /* 20 */ BLOCK(),
  /* 21 */ BLOCK(),
  /* 22 */ BLOCK(),
  // --- the gate ------------------------------------------------------------
  /* 23 */ row(R('#', 14), R('=', 4), R('#', 14)),
  /* 24 */ row(R('#', 14), R('=', 4), R('#', 14)),
  /* 25 */ row(R('#', 14), R('=', 4), R('#', 14)),
];

export const GREYHARROW = {
  id: 'greyharrow',
  name: 'Greyharrow',
  subtitle: 'Sixty-One Soldiers',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#b6bcbc', 90, 290],
  tilt: 0.42,
  cameraDistance: 18,
  music: 'festival',
  base: 'cobble',
  groundRamp: 'terrain',
  wallHeight: 6.0,
  wallMaterial: 'stone',

  sky: {
    zenith: '#33689c', horizon: '#c8ccc4', ground: '#5a5a54',
    sunColor: '#ffe8c0', sunDir: [0.38, 0.6, 0.4], cloud: 0.55,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [15.5, 21.5], face: 'north' },
    world: { at: [15.5, 21.5], face: 'north' },
    mess: { at: [9.6, 13.0], face: 'west' },
  },

  exits: [
    { at: [14, 25], size: [4, 1], to: 'overworld', spawn: 'greyharrow', prompt: 'The gate road' },
  ],

  props: [
    // --- the six blocks, drawn identical, lived in otherwise -----------------
    { kit: 'building', at: [6.3, 7.5], w: 9, d: 6.4, h: 3.6, storeys: 2, rise: 1.9,
      style: 'stone', roof: 'slate', door: 'east', awning: true, id: 'gh-block-a',
      sign: { icon: '🧪', text: 'No. 1 Block', x: -3.0 } },
    { kit: 'building', at: [25.7, 7.5], w: 9, d: 6.4, h: 3.6, storeys: 2, rise: 1.9,
      style: 'stone', roof: 'slate', door: 'west', id: 'gh-block-b',
      sign: { icon: '⚒', text: 'No. 2 Block', x: 3.0 } },

    { kit: 'building', at: [6.3, 14.5], w: 9, d: 6.4, h: 3.6, storeys: 2, rise: 2.0,
      style: 'stone', roof: 'slate', chimney: true, balcony: true, door: 'east',
      id: 'gh-block-c', enter: 'inn_greyharrow', enterPrompt: 'The Mess',
      sign: { icon: '🛏', text: 'The Mess', x: -3.0 } },

    { kit: 'building', at: [25.7, 14.5], w: 9, d: 6.4, h: 3.6, storeys: 2, rise: 2.0,
      style: 'stone', roof: 'slate', awning: true, door: 'west',
      id: 'gh-block-d', enter: 'shop_greyharrow', enterPrompt: 'Requisitions',
      sign: { icon: '⚖', text: 'Requisitions', x: 3.0 } },

    { kit: 'building', at: [6.3, 21.0], w: 9, d: 6.4, h: 3.6, storeys: 2, rise: 1.9,
      style: 'stone', roof: 'slate', timbered: true, door: 'east', id: 'gh-block-e',
      sign: { icon: '🐟', text: 'No. 5 Block', x: -3.0 } },
    { kit: 'building', at: [25.7, 21.0], w: 9, d: 6.4, h: 3.6, storeys: 2, rise: 1.9,
      style: 'stone', roof: 'slate', door: 'west', id: 'gh-block-f' },

    // --- the one block still exactly as drawn ---------------------------------
    { kit: 'fence', at: [25.7, 4.4], arg: 10, radius: 0 },
    { kit: 'fence', at: [25.7, 10.6], arg: 10, radius: 0 },

    // --- the gate, and the two guardhouses that still man it ------------------
    { kit: 'building', at: [12.0, 22.0], w: 5, d: 3, h: 3.4, rise: 1.6,
      style: 'stone', roof: 'slate', door: 'north', id: 'gh-guard-w' },
    { kit: 'building', at: [20.0, 22.0], w: 5, d: 3, h: 3.4, rise: 1.6,
      style: 'stone', roof: 'slate', door: 'north', id: 'gh-guard-e' },
    { kit: 'signpost', at: [17.4, 21.4], id: 'gh-parade',
      interact: { name: 'Standing Orders', text: [
        'ORDER 4. THE PARADE GROUND IS TO BE KEPT CLEAR AT ALL TIMES.',
        'The board is bolted to a stall frame. There is a basket of onions on the bracket. Somebody has hung a shirt over ORDER 5.',
      ] } },
    { kit: 'lamppost', at: [14.4, 22.6] },
    { kit: 'lamppost', at: [17.6, 22.6] },

    // --- the parade ground, or what is left of it -----------------------------
    { kit: 'well', at: [15.5, 12.0], id: 'gh-well', radius: 1.2,
      interact: { name: 'The Parade Well', text: [
        'Sunk nine years ago in the exact centre of the drill square, by subscription, at night, by persons unknown.',
        'The garrison lodged a formal objection. The garrison also draws its water here.',
      ] } },
    { kit: 'savepoint', at: [15.5, 19.5], id: 'gh-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [15.5, 4.6], id: 'gh-muster',
      interact: { name: 'The Muster Board', text: [
        'ESTABLISHMENT: 400. PRESENT: 61. The 61 has been scraped off and rewritten so often the slate is thin there.',
        'Under it, in a different hand entirely: MARKET DAY IS EVERY DAY NOW. STALLHOLDERS SEE THE SERJEANT.',
      ] } },

    { kit: 'stall', at: [11.0, 8.0], arg: '#8b2a2c', rot: 0.18, id: 'gh-stall-1' },
    { kit: 'stall', at: [20.0, 8.0], arg: '#2c5a45', rot: -0.22, id: 'gh-stall-2' },
    { kit: 'stall', at: [11.0, 16.0], arg: '#8a6a23', rot: -0.14, id: 'gh-stall-3' },
    { kit: 'stall', at: [20.0, 16.0], arg: '#33477c', rot: 0.26, id: 'gh-stall-4' },
    { kit: 'stall', at: [11.0, 20.5], arg: '#4e326c', rot: 0.3, id: 'gh-stall-5' },
    { kit: 'stall', at: [20.0, 20.5], arg: '#b34a41', rot: -0.19, id: 'gh-stall-6' },

    { kit: 'cart', at: [10.0, 4.0], rot: 0.42 },
    { kit: 'cart', at: [21.0, 4.0], rot: -0.3 },
    { kit: 'cart', at: [10.5, 11.0], rot: 1.4 },
    { kit: 'cart', at: [20.5, 11.0], rot: 0.6 },
    { kit: 'bench', at: [13.0, 10.6], rot: 0.1 },
    { kit: 'bench', at: [18.0, 10.6], rot: -0.12 },
    { kit: 'lamppost', at: [9.4, 6.4] },
    { kit: 'lamppost', at: [21.6, 6.4] },
    { kit: 'lamppost', at: [9.4, 15.4] },
    { kit: 'lamppost', at: [21.6, 15.4] },
    { kit: 'lamppost', at: [9.4, 20.4] },
    { kit: 'lamppost', at: [21.6, 20.4] },

    // --- the lean-tos in the drill lanes ---------------------------------------
    { kit: 'crate', at: [7.0, 10.6], rot: 0.35 },
    { kit: 'crate', at: [7.6, 11.2], rot: -0.2 },
    { kit: 'barrel', at: [8.2, 10.4] },
    { kit: 'crate', at: [7.0, 17.6], rot: 0.5 },
    { kit: 'barrel', at: [7.6, 18.2] },
    { kit: 'crate', at: [24.6, 17.6], rot: -0.4 },
    { kit: 'barrel', at: [24.2, 18.2] },
    { kit: 'flowerbox', at: [9.0, 7.5] },
    { kit: 'flowerbox', at: [23.0, 8.6] },
    { kit: 'flowerbox', at: [9.0, 21.0] },
    { kit: 'flowerbox', at: [23.0, 20.6] },
    { kit: 'tree', at: [5.0, 3.4], kind: 'broadleaf', scale: 1.0, seed: 3, id: 'gh-tree-nw' },
    { kit: 'tree', at: [26.5, 3.4], kind: 'autumn', scale: 1.05, seed: 7 },
    { kit: 'bush', at: [4.2, 17.6], scale: 1.0, seed: 11, radius: 0 },
    { kit: 'bush', at: [27.6, 10.4], scale: 1.05, seed: 13, radius: 0 },

    { kit: 'chest', at: [4.0, 3.6], id: 'gh-chest-1',
      contains: { kind: 'gold', amount: 420, label: '420 gil' } },
    { kit: 'chest', at: [27.5, 12.0], id: 'gh-chest-2',
      contains: { kind: 'item', id: 'ironhelm', count: 1, label: 'an Iron Helm' } },
    { kit: 'chest', at: [4.5, 18.0], id: 'gh-chest-3',
      contains: { kind: 'item', id: 'wardstone', count: 1, label: 'a Wardstone' } },
    { kit: 'chest', at: [28.5, 20.0], id: 'gh-chest-4',
      contains: { kind: 'item', id: 'windlassbow', count: 1, label: 'a Windlass Bow' } },
    // "In the guardhouse, in a drawer, unlabelled." The west guardhouse's
    // door faces the parade, and the duty desk stands just inside it — four
    // garrisons have inventoried this as "misc" and none of them moved it off
    // the gate. It is not on the square, and it is not anywhere anyone looks.
    { kit: 'chest', at: [12.0, 20.9], id: 'gh-guard-drawer',
      contains: { kind: 'esper', id: 'thequietone', label: 'a shard of magicite' } },
  ],

  /**
   * Greyharrow after. The market is gone and the plan is showing again, which
   * is the most frightening thing that has happened here in a century. The
   * square is square. You can see all six blocks from the gate. Nobody likes it.
   */
  ruin: {
    subtitle: 'The Square Is Square Again',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#7e8080', 45, 180],
    music: 'imperium',
    sky: {
      zenith: '#4a4658', horizon: '#a8907c', ground: '#33342e',
      sunColor: '#ff9d63', sunDir: [-0.36, 0.22, 0.34], cloud: 0.92,
    },
    removeNpcs: ['gh-child', 'gh-market', 'gh-washer', 'gh-serjeant'],
    removeProps: ['gh-tree-nw'],
    npcs: [
      {
        id: 'gh-ruin-serjeant', name: 'Serjeant Kadd', at: [22.5, 7.6], face: 'west',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'athletic', height: 1.80, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#9a6147', hair: '#342a37', torso: '#414954', accent: '#a6b0bc',
            legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
        talk: [
          'Sixty-one on the book. Sixty-one on parade. First time in my service the two numbers agreed and I would give anything to have it back the other way.',
          'You can see clean across the square now. I have been asking for that for eleven years.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [5.0, 3.4], kind: 'dead', scale: 1.25, seed: 701 },
      { kit: 'chest', at: [15.5, 6.0], id: 'gh-ruin-chest',
        contains: { kind: 'item', id: 'brokenstandard', count: 1, label: 'a Broken Standard' } },
    ],
  },

  npcs: [
    {
      id: 'gh-armoury', name: 'Field Armourer Kest', at: [18.5, 12.0], face: 'south',
      clip: 'work', prompt: 'Trade',
      look: { build: 'hulking', height: 1.83, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#4b64a3', accent: '#a6b0bc',
          legs: '#414954', boots: '#2b2933', gloves: '#666c74' } },
      shop: 'ferran_armoury',
      talk: [
        'Marchetti field armoury. We follow the column, and the column has not moved in four years, so here I am on somebody\'s parade ground selling to somebody\'s greengrocer.',
        'Bly requisitions. I sell. If you can tell me the difference by the end of the month I will give you the sallet.',
      ],
    },
    {
      id: 'gh-inn', name: 'Ilsabet Rook', at: [9.1, 14.0], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.67, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#496035', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 44, name: 'The Mess' },
      talk: [
        'Forty-four. It was the officers\' mess and it has the fireplaces to prove it, and the officers have three rooms at the back and pay the same as you.',
        'My mother took the lease when there were eight officers left and nobody could think of a reason not to.',
      ],
    },
    {
      id: 'gh-quarter', name: 'Quartermaster Bly', at: [21.9, 14.0], face: 'east', clip: 'work', prompt: 'Trade',
      look: { build: 'normal', height: 1.71, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      shop: 'ferran_quartermaster',
      talk: [
        'I am supplied for four hundred men. I have sixty-one. What I sell you is the difference, and the difference is the only reason this town eats.',
        'It is not smuggling. It is on a form. I invented the form, but it is a form.',
      ],
    },
    {
      id: 'gh-serjeant', name: 'Serjeant Kadd', at: [22.5, 7.0], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.80, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#342a37', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'Number Two Block. Regulation lines, regulation fence, regulation nothing hanging off it. One block. I hold one block.',
        'The rest of them have geraniums. I am not going to talk about the geraniums.',
      ],
    },
    {
      id: 'gh-captain', name: 'Captain Ilene Marr', at: [15.0, 9.5], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'slim', height: 1.73, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#5e5163', torso: '#33477c', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943', cape: '#38224f' } },
      event: 'greyharrow_ford',
      talk: [
        'I am supposed to clear the square every morning. I have been supposed to for six years. On the day I do it, nine hundred people have nowhere to sell their eggs and sixty-one of us have to explain why.',
        'The Imperium sends a letter about it every quarter. I keep them. Bound. It is the only regimental history we are making.',
      ],
    },
    {
      id: 'gh-market', name: 'Bevis Hark', at: [18.0, 15.8], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.69, hair: 'wild',
        colors: { skin: '#ac744c', hair: '#6d4020', torso: '#8a6a23', accent: '#b34a41',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'Every stall on this square pays the garrison a half-gil the day. Not rent — they cannot let rent. It is a fine, and we pay it in advance, cheerfully, for ever.',
        'Set your frame square to the paving and they can prove you are obstructing. Set it crooked and you are only untidy. That is why nothing here is straight.',
      ],
    },
    {
      id: 'gh-washer', name: 'Nell Cauder', at: [12.0, 15.8], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.62, hair: 'braid',
        colors: { skin: '#dbb28c', hair: '#bd8746', torso: '#2c5a45', accent: '#9ccdd4',
          legs: '#414954', boots: '#3a2a20' } },
      talk: [
        'The drill rails run the length of every block at exactly the right height for a line of sheets. Whoever designed this fort did the whole town a favour and would be furious about it.',
        'Four hundred men would have needed those rails. Sixty-one do not. So.',
      ],
    },
    {
      id: 'gh-cooper', name: 'Cooper Wend', at: [3.0, 10.75], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.87, hair: 'topknot',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#4b382d', gloves: '#4b382d' } },
      event: 'greyharrow_indenture',
      talk: [
        'Behind the blocks. Nobody drew this lane, it is just the space the engineer left by accident, and there are eleven trades working in it.',
        'A fort has no back streets. Greyharrow has one, and it is the only part of the town that grew.',
      ],
    },
    {
      id: 'gh-veteran', name: 'Old Marchand', at: [21.0, 10.2], face: 'south', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.64, hair: 'bald', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#5a3230', accent: '#a6b0bc',
          legs: '#414954', boots: '#2b2933' } },
      talk: [
        'Thirty-one years, and I was here when this square was empty and four hundred of us stood on it, and I will tell you honestly it was worse.',
        'A fort full of soldiers is a fort waiting for something. A fort full of onions is a fort that got away with it.',
      ],
    },
    {
      id: 'gh-clerk', name: 'Clerk Ondwin', at: [16.0, 21.75], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.68, hair: 'short',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#4b64a3', accent: '#8a6a23',
          legs: '#2b2933', boots: '#3b3943' } },
      // The drawer is his problem: he is the only man in the fort who cannot
      // issue it, condemn it or lose it, and the shard in it is also the one
      // sitting in the guardroom chest, which the scene knows about.
      event: 'greyharrow_misc_drawer',
      talk: [
        'Everyone entering is a visitor to the garrison. That is the only category on the form. Nine hundred people live here as permanent visitors.',
        'I have written to have the form changed. Twice. The second letter was very good.',
      ],
    },
    {
      id: 'gh-child', name: 'Pim', at: [15.0, 20.75], face: 'south', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.27, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#8b2a2c', accent: '#f7d968',
          legs: '#33477c', boots: '#4b382d' } },
      talk: [
        'You can run the whole fort blindfold if you count the lanes. Three across, two down, gate. Everyone my age can do it.',
        'The soldiers cannot. They came from somewhere else and they still look at the corners.',
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
  fog: ['#262420', 22, 70],
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

export const INN_GREYHARROW = {
  ...ROOM_BASE,
  id: 'inn_greyharrow',
  name: 'The Mess',
  subtitle: 'Greyharrow',
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
  ], 'inn_greyharrow'),

  spawns: { default: { at: [9, 6], face: 'north' } },
  exits: [{ at: [9, 7], size: [2, 1], to: 'greyharrow', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [5.0, 3.0], rot: 0 },
    { kit: 'bench', at: [5.0, 4.8], rot: 0 },
    { kit: 'bench', at: [14.0, 3.0], rot: 0 },
    { kit: 'bench', at: [14.0, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.8, 2.4] },
    { kit: 'crate', at: [17.2, 1.7], rot: 0.3 },
    { kit: 'crate', at: [17.0, 2.8], rot: -0.25 },
    { kit: 'lamppost', at: [6.5, 1.6] },
    { kit: 'lamppost', at: [13.0, 1.6] },
    { kit: 'flowerbox', at: [9.6, 5.4] },
    { kit: 'chest', at: [17.4, 5.4], id: 'inn-gh-chest',
      contains: { kind: 'item', id: 'secondbreath', count: 1, label: 'a Second Breath' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-gh-board',
      interact: { name: 'The Mess Board', text: [
        'A painted list of every officer who has held this room, ending abruptly forty years ago.',
        'Beneath it, on a card: ROOMS 1s 4d. NO BOOTS ON THE TABLE. THIS APPLIES TO THE OFFICERS TOO AND THEY KNOW IT.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-gh-keeper', name: 'Ilsabet Rook', at: [9.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.67, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#496035', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 44, name: 'The Mess' },
      talk: ['Forty-four. Reveille is at five and there is nothing I can do about that, and neither, at this point, can they.'],
    },
    {
      id: 'inn-gh-guest', name: 'Lieutenant Sorrel', at: [3.6, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'slim', height: 1.75, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#bd8746', torso: '#33477c', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943', cape: '#12566b' } },
      talk: [
        'I was posted here to reduce the establishment. It is already reduced. There is nothing for me to do except eat in a room my grandfather was proud of.',
        'I have started helping with the stalls. If you write and tell anyone I will deny it and I will be believed.',
      ],
    },
  ],
};

export const SHOP_GREYHARROW = {
  ...ROOM_BASE,
  id: 'shop_greyharrow',
  name: 'Requisitions',
  subtitle: 'Greyharrow',
  base: 'cobble',
  music: 'imperium',
  terrain: makeRoom(16, [
    '################',
    '#==============#',
    '#==============#',
    '#==============#',
    '#==============#',
    '#######==#######',
  ], 'shop_greyharrow'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'greyharrow', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.15 },
    { kit: 'crate', at: [2.5, 2.6], rot: -0.2 },
    { kit: 'crate', at: [3.3, 1.8], rot: 0.35 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.7, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'chest', at: [13.4, 3.8], id: 'shop-gh-chest',
      contains: { kind: 'item', id: 'towershield', count: 1, label: 'a Tower Shield' } },
  ],

  npcs: [
    {
      id: 'shop-gh-keeper', name: 'Quartermaster Bly', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'normal', height: 1.71, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      shop: 'ferran_quartermaster',
      talk: ['Everything on that rack is issued, not sold. You are signing for it. What you sign is not important. That you sign is enormously important.'],
    },
  ],
};

export const GREYHARROW_INTERIORS = {
  inn_greyharrow: INN_GREYHARROW,
  shop_greyharrow: SHOP_GREYHARROW,
};
