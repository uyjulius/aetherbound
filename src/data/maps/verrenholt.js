/**
 * Verrenholt — built for four thousand, kept by ninety.
 *
 * Verrenholt was laid out in the good years by people who were certain of the
 * next hundred: a processional avenue eight strides wide, a proper grid either
 * side of it, a moot hall at the head. All of that is still here. The people
 * are not.
 *
 * So the plan is a generous town with the population pushed into one corner of
 * it, and the storytelling is done by everything the player walks past and
 * finds empty. The avenue is the spine and it deliberately leads *nowhere* —
 * the hall at the top burned and was never cleared, so the grandest street in
 * the region terminates in a rectangle of nettles. The living crowd the
 * south-west blocks, close enough to hear each other; the eastern grid is
 * roofless shells and dead orchard. Nothing is placed at the centre. The centre
 * is the point.
 */

const W = 40;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[verrenholt] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const AVENUE_WIDE = () => row(R('#', 4), R('.', 12), R('=', 8), R('.', 12), R('#', 4));
const AVENUE_LIVED = () => row(R('#', 4), R(',', 12), R('=', 8), R(',', 12), R('#', 4));

const TERRAIN = [
  /*  0 */ row(R('#', 40)),
  /*  1 */ row(R('#', 40)),
  // --- the hall ground: grass now, and the avenue stops at it --------------
  /*  2 */ row(R('#', 6), R('.', 28), R('#', 6)),
  /*  3 */ row(R('#', 6), R('.', 28), R('#', 6)),
  /*  4 */ row(R('#', 6), R('.', 10), R('=', 8), R('.', 10), R('#', 6)),
  /*  5 */ row(R('#', 6), R('.', 10), R('=', 8), R('.', 10), R('#', 6)),
  /*  6 */ AVENUE_WIDE(),
  /*  7 */ AVENUE_WIDE(),
  // --- the northern blocks: emptied, and the streets have gone to dirt -----
  /*  8 */ AVENUE_LIVED(),
  /*  9 */ AVENUE_LIVED(),
  /* 10 */ AVENUE_LIVED(),
  /* 11 */ AVENUE_LIVED(),
  // --- the cross street, the only one still swept --------------------------
  /* 12 */ row(R('#', 4), R(',', 32), R('#', 4)),
  /* 13 */ row(R('#', 4), R(',', 32), R('#', 4)),
  // --- the southern blocks: the living are in the west of these ------------
  /* 14 */ AVENUE_WIDE(),
  /* 15 */ AVENUE_WIDE(),
  /* 16 */ AVENUE_WIDE(),
  /* 17 */ row(R('#', 4), R('.', 3), R('d', 2), R('.', 7), R('=', 8),
    R('.', 5), R('d', 2), R('.', 5), R('#', 4)),
  /* 18 */ AVENUE_WIDE(),
  /* 19 */ row(R('#', 6), R('.', 10), R('=', 8), R('.', 10), R('#', 6)),
  // --- the common, reverting -----------------------------------------------
  /* 20 */ row(R('#', 6), R('b', 4), R('.', 20), R('b', 4), R('#', 6)),
  /* 21 */ row(R('#', 6), R('.', 28), R('#', 6)),
  /* 22 */ row(R('#', 6), R('d', 4), R('.', 20), R('d', 4), R('#', 6)),
  /* 23 */ row(R('#', 8), R('.', 24), R('#', 8)),
  // --- the south road -------------------------------------------------------
  /* 24 */ row(R('#', 17), R(',', 6), R('#', 17)),
  /* 25 */ row(R('#', 17), R(',', 6), R('#', 17)),
];

export const VERRENHOLT = {
  id: 'verrenholt',
  name: 'Verrenholt',
  subtitle: 'Built for Four Thousand',
  kind: 'town',
  light: 'dawn',
  grade: 'dawn',
  fog: ['#b0aa96', 70, 240],
  tilt: 0.44,
  cameraDistance: 17,
  music: 'memory',
  base: 'grass',
  groundRamp: 'terrain',
  wallHeight: 3.6,
  wallMaterial: 'stone',

  sky: {
    zenith: '#3c5f86', horizon: '#d8c0a0', ground: '#5a5444',
    sunColor: '#ffcf9a', sunDir: [0.6, 0.22, 0.3], cloud: 0.66,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [19.5, 23], face: 'north' },
    world: { at: [19.5, 23], face: 'north' },
    hall: { at: [19.5, 5], face: 'south' },
  },

  exits: [
    { at: [17, 25], size: [6, 1], to: 'overworld', spawn: 'verrenholt', prompt: 'Leave Verrenholt' },
  ],

  props: [
    // --- the head of the avenue: what the fire left of the moot hall --------
    { kit: 'building', at: [19.5, 3.2], w: 12, d: 3.6, h: 2.2,
      style: 'stone', roof: 'flat', door: null, windows: false, id: 'vh-hall',
      sign: { icon: '◆', text: 'The Moot Hall', x: 0 } },
    { kit: 'rock', at: [14.5, 3.6], scale: 1.4, seed: 3 },
    { kit: 'rock', at: [24.6, 3.6], scale: 1.3, seed: 5 },
    { kit: 'rock', at: [16.0, 3.6], scale: 1.0, seed: 7 },
    { kit: 'tree', at: [11.0, 2.8], kind: 'dead', scale: 1.3, seed: 11 },
    { kit: 'tree', at: [28.5, 2.6], kind: 'dead', scale: 1.2, seed: 13 },
    { kit: 'signpost', at: [19.5, 5.4], id: 'vh-hallplaque',
      interact: { name: 'Foundation Stone', text: [
        'SET DOWN IN THE FORTIETH YEAR FOR THE USE OF THE COMMONALTY OF VERRENHOLT AND OF THEIR CHILDREN AFTER THEM.',
        'The stone is unmarked by the fire. Everything that was built on it is gone, and the promise is still perfectly legible, which is somehow worse.',
      ] } },

    // --- the empty eastern grid: roofless shells ------------------------------
    { kit: 'building', at: [28.0, 8.0], w: 6, d: 4.0, h: 2.4,
      style: 'plaster', roof: 'flat', door: null, windows: false, id: 'vh-shell-a' },
    { kit: 'building', at: [33.0, 10.6], w: 5, d: 3.6, h: 2.2,
      style: 'plaster', roof: 'flat', door: null, windows: false, rot: 0.08, id: 'vh-shell-b' },
    { kit: 'building', at: [27.5, 16.0], w: 6, d: 4.0, h: 2.4,
      style: 'plaster', roof: 'flat', door: null, windows: false, id: 'vh-shell-c' },
    { kit: 'building', at: [33.0, 15.4], w: 5, d: 3.6, h: 2.6,
      style: 'stone', roof: 'flat', door: null, windows: false, rot: -0.1, id: 'vh-shell-d' },
    { kit: 'building', at: [28.5, 6.2], w: 5, d: 3.4, h: 3.0,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', windows: false, id: 'vh-shell-e' },
    { kit: 'building', at: [11.0, 6.4], w: 6, d: 3.8, h: 2.4,
      style: 'plaster', roof: 'flat', door: null, windows: false, id: 'vh-shell-f' },

    { kit: 'rock', at: [31.0, 8.4], scale: 1.1, seed: 17 },
    { kit: 'rock', at: [25.0, 11.0], scale: 0.9, seed: 19 },
    { kit: 'rock', at: [34.5, 18.0], scale: 1.2, seed: 23 },
    { kit: 'bush', at: [30.0, 12.6], scale: 1.2, seed: 29, radius: 0 },
    { kit: 'bush', at: [26.0, 13.4], scale: 1.0, seed: 31, radius: 0 },
    { kit: 'bush', at: [34.0, 7.0], scale: 1.1, seed: 37, radius: 0 },
    { kit: 'tree', at: [32.0, 4.4], kind: 'autumn', scale: 1.0, seed: 41 },
    { kit: 'tree', at: [25.5, 19.4], kind: 'dead', scale: 1.1, seed: 43 },
    { kit: 'tree', at: [8.0, 21.6], kind: 'dead', scale: 1.2, seed: 47 },
    { kit: 'fence', at: [30.0, 20.0], arg: 5, radius: 0 },
    { kit: 'fence', at: [10.0, 4.4], arg: 4, radius: 0 },

    // --- the lived-in corner --------------------------------------------------
    { kit: 'building', at: [9.0, 15.5], w: 8, d: 4.4, h: 3.4, storeys: 2, rise: 2.0,
      style: 'plaster', roof: 'thatch', timbered: true, chimney: true, door: 'east',
      id: 'vh-inn', enter: 'inn_verrenholt', enterPrompt: "Anse's",
      sign: { icon: '🛏', text: "Anse's", x: -2.8 } },

    { kit: 'building', at: [9.0, 10.0], w: 7, d: 4.2, h: 3.2, rise: 1.8,
      style: 'wood', roof: 'thatch', awning: true, door: 'east',
      id: 'vh-pedlar', enter: 'shop_verrenholt', enterPrompt: 'Rennick, Sundries',
      sign: { icon: '🧪', text: 'Rennick, Sundries', x: -2.4 } },

    { kit: 'building', at: [7.5, 17.6], w: 5, d: 3.4, h: 3.0, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, chimney: true, door: 'east', id: 'vh-house-a' },
    { kit: 'building', at: [13.6, 17.6], w: 5, d: 3.4, h: 3.0, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, chimney: true, door: 'north', id: 'vh-house-b' },
    { kit: 'building', at: [13.6, 9.4], w: 5, d: 3.4, h: 3.0, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', id: 'vh-house-c' },

    { kit: 'well', at: [12.5, 12.5], id: 'vh-well', radius: 1.2,
      interact: { name: 'The North Well', text: [
        'One of eleven wells sunk for a town of four thousand. This is the only one still roped.',
        'Somebody keeps the other ten covered and weighted. Nobody has said why out loud, and everybody keeps doing it.',
      ] } },

    { kit: 'flowerbox', at: [11.4, 14.6] },
    { kit: 'flowerbox', at: [7.0, 13.4] },
    { kit: 'bench', at: [14.6, 13.0], rot: 0 },
    { kit: 'barrel', at: [5.4, 12.8] },
    { kit: 'barrel', at: [5.9, 13.5] },
    { kit: 'crate', at: [6.4, 16.0], rot: 0.3 },
    { kit: 'cart', at: [11.0, 19.0], rot: 0.3 },
    { kit: 'fence', at: [6.0, 19.4], arg: 5, radius: 0 },
    { kit: 'lamppost', at: [15.6, 12.6] },
    { kit: 'lamppost', at: [10.0, 12.6] },
    { kit: 'tree', at: [5.0, 15.0], kind: 'broadleaf', scale: 1.05, seed: 53, id: 'vh-tree-w' },
    { kit: 'tree', at: [16.0, 20.4], kind: 'broadleaf', scale: 0.95, seed: 59, id: 'vh-tree-common' },
    { kit: 'bush', at: [17.0, 18.6], scale: 1.0, seed: 61, radius: 0 },

    // --- the avenue itself, kept only because nobody has stopped -------------
    { kit: 'lamppost', at: [16.6, 8.4] },
    { kit: 'lamppost', at: [23.4, 8.4] },
    { kit: 'lamppost', at: [16.6, 16.4] },
    { kit: 'lamppost', at: [23.4, 16.4] },
    { kit: 'bench', at: [17.2, 10.6], rot: 0 },
    { kit: 'bench', at: [22.8, 10.6], rot: 0 },
    { kit: 'bench', at: [17.2, 14.8], rot: 0 },
    { kit: 'bench', at: [22.8, 14.8], rot: 0 },

    // --- the south road --------------------------------------------------------
    { kit: 'savepoint', at: [19.5, 22.4], id: 'vh-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [17.6, 23.4], id: 'vh-roadsign',
      interact: { name: 'Milepost', text: [
        'VERRENHOLT. POP. 4,120.',
        'The four has been rubbed at by a thumb until the paint has gone. Nobody has repainted it and nobody has corrected it.',
      ] } },
    { kit: 'lamppost', at: [18.4, 21.4] },
    { kit: 'lamppost', at: [20.6, 21.4] },

    { kit: 'chest', at: [30.5, 17.6], id: 'vh-chest-1',
      contains: { kind: 'item', id: 'silkrobe', count: 1, label: 'a Silk Robe' } },
    { kit: 'chest', at: [34.0, 12.4], id: 'vh-chest-2',
      contains: { kind: 'gold', amount: 220, label: '220 gil' } },
    { kit: 'chest', at: [7.5, 3.4], id: 'vh-chest-3',
      contains: { kind: 'item', id: 'lanternstaff', count: 1, label: 'a Lantern Staff' } },
    { kit: 'chest', at: [24.0, 5.0], id: 'vh-chest-4',
      contains: { kind: 'item', id: 'vigilshield', count: 1, label: 'a Vigil Shield' } },
  ],

  /**
   * Verrenholt after. It is very difficult to tell, at first glance, that
   * anything has happened here at all — which is the cruellest joke the map
   * has, and the reason the reeve keeps talking.
   */
  ruin: {
    subtitle: 'You Would Hardly Know',
    light: 'ruin',
    grade: 'ruin',
    fog: ['#8b7f6c', 50, 180],
    music: 'memory',
    sky: {
      zenith: '#5e4a3c', horizon: '#c0a084', ground: '#3a342a',
      sunColor: '#ff9d63', sunDir: [-0.4, 0.2, 0.34], cloud: 0.92,
    },
    // Hollis stands in the ruin where she stands in the whole world, so the
    // whole world's Reeve has to be taken out rather than doubled.
    removeNpcs: ['vh-child', 'vh-returner', 'vh-scavenger', 'vh-reeve'],
    removeProps: ['vh-tree-w', 'vh-tree-common'],
    npcs: [
      {
        id: 'vh-ruin-reeve', name: 'Reeve Hollis', at: [19.6, 6.6], face: 'south',
        clip: 'work', prompt: 'Speak',
        look: { build: 'slim', height: 1.61, hair: 'long', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#dbb28c', hair: '#dedbe0', torso: '#4e326c', accent: '#ab8018',
            legs: '#2b2933', boots: '#4b382d', cape: '#38224f' } },
        talk: [
          'Ninety-one. It was ninety-one before, and it is ninety-one now.',
          'Everywhere else lost people. We had already lost ours. I have spent forty years being early and it has finally paid.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [5.0, 15.0], kind: 'dead', scale: 1.2, seed: 341 },
      { kit: 'tree', at: [16.0, 20.4], kind: 'dead', scale: 1.1, seed: 343 },
      { kit: 'chest', at: [16.0, 2.6], id: 'vh-ruin-chest',
        contains: { kind: 'item', id: 'lastlight', count: 1, label: 'a Last Light' } },
    ],
  },

  npcs: [
    {
      id: 'vh-almoner', name: 'Almoner Sesta Wray', at: [23.0, 6.6], face: 'west',
      clip: 'work', prompt: 'Trade',
      look: { build: 'normal', height: 1.67, hair: 'long', expression: 'neutral',
        colors: { skin: '#9a6147', hair: '#dedbe0', torso: '#2b2933', accent: '#ddccab',
          legs: '#1e1c25', boots: '#3a2a20', cape: '#414954' } },
      shop: 'kindlyground_almoner',
      talk: [
        'I keep the burial fund. There are four thousand names in it and two hundred and eleven people to spend it on, so I have begun spending it on the living instead.',
        'Grave salt, a vigil robe, a phoenix tear. Things for the walk out and things for the walk back. I have stopped assuming which one anybody is on.',
      ],
    },
    {
      id: 'vh-inn', name: 'Widow Anse', at: [11.6, 15.4], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.61, hair: 'bob',
        colors: { skin: '#c08865', hair: '#dedbe0', torso: '#5a3230', accent: '#ddccab',
          legs: '#4b382d', boots: '#3a2a20' } },
      inn: { price: 15, name: "Anse's" },
      talk: [
        'Fifteen. It is my front room and there is one bed in it, and if you take it I sleep in the chair, so do not be sentimental about it — take it.',
        'The sign outside says nothing but my name. There was a proper name once. It was on the sign that burned with everything else.',
      ],
    },
    {
      id: 'vh-pedlar', name: 'Cobb Rennick', at: [11.4, 10.0], face: 'west', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.70, hair: 'wild', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#5e5163', torso: '#6b5d37', accent: '#8a6a23',
          legs: '#5e412c', boots: '#3a2a20' } },
      shop: 'harrowmere_items',
      talk: [
        'The crates say Marrow & Salt. The crates are not from here. Neither is anything in them and neither, if you go back far enough, am I.',
        'I buy job lots off the carters at the crossing and I do not mark up much, because who exactly would I be marking up.',
      ],
    },
    {
      // The moot is Hollis's, and it is a whole-world scene: it is about what
      // to do with the empty half of a town before the frost, and after the
      // sky changes there is no frost worth arguing about. So it hangs on the
      // living Hollis only; the ruin's Hollis keeps her own two lines.
      id: 'vh-reeve', name: 'Reeve Hollis', at: [19.0, 6.6], face: 'south', clip: 'work',
      prompt: 'Speak', event: 'verrenholt_moot',
      look: { build: 'slim', height: 1.61, hair: 'long', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#dedbe0', torso: '#4e326c', accent: '#ab8018',
          legs: '#2b2933', boots: '#4b382d', cape: '#38224f' } },
      talk: [
        'Ninety-one souls, and I hold the roll, and the roll has room for four thousand one hundred and twenty.',
        'People assume I find that painful. I find it *administrative*, which after forty years turns out to be the same thing worn smooth.',
      ],
    },
    {
      // Mab keeps the book with the rows in it, so the letter addressed to a
      // man in the fourth row comes to her. She is out on the east grid where
      // the burying ground gate is, and she is here in both worlds.
      id: 'vh-sexton', name: 'Sexton Mab', at: [26.0, 10.4], face: 'west', clip: 'work',
      prompt: 'Speak', event: 'postbag_sexton',
      look: { build: 'normal', height: 1.68, hair: 'braid', expression: 'neutral',
        colors: { skin: '#6e4030', hair: '#4a2a17', torso: '#2b2933', accent: '#95836b',
          legs: '#4b382d', boots: '#3a2a20', gloves: '#5e412c' } },
      talk: [
        'The burying ground is out past the east wall and it is the best-kept thing in this town by a distance nobody wants to measure.',
        'I do the empty houses too. Sweep them, air them, shut them. They keep better swept. It costs me a morning and it costs the town nothing.',
      ],
    },
    {
      id: 'vh-grazier', name: 'Grazier Lune', at: [22.0, 18.6], face: 'north', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'athletic', height: 1.74, hair: 'short',
        colors: { skin: '#ac744c', hair: '#95602d', torso: '#496035', accent: '#6b5d37',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'I run forty head straight up the avenue twice a day. There is nobody to object and the grass between the setts is the best in the parish.',
        'My grandfather would have been hanged for this. I have thought about that, and I have kept doing it.',
      ],
    },
    {
      id: 'vh-scavenger', name: 'Lead-Stripper', at: [29.5, 13.6], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.72, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#5b6674', accent: '#666c74',
          legs: '#414954', boots: '#22242a', gloves: '#4b382d' } },
      talk: [
        'Roof lead. Nobody is under it and lead does not care whose it was.',
        'The Reeve writes down every house I open and what I took out of it. I have asked him who the record is for. He says the record is for the record.',
      ],
    },
    {
      id: 'vh-returner', name: 'Man Come Back', at: [21.0, 12.6], face: 'north', clip: 'idle', prompt: 'Speak',
      look: { build: 'normal', height: 1.76, hair: 'short', expression: 'sad',
        colors: { skin: '#f0d5b8', hair: '#4a2a17', torso: '#33477c', accent: '#5a3230',
          legs: '#2b2933', boots: '#3a2a20', cape: '#414954' } },
      talk: [
        'Nineteen years in Solmere and I came back for a fortnight to see the house.',
        'It is still there. That is the trouble. If it had fallen down I could have gone home on Tuesday.',
      ],
    },
    {
      id: 'vh-child', name: 'Tup', at: [15.4, 19.4], face: 'east', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.25, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#e7c39c', hair: '#6d4020', torso: '#b34a41', accent: '#ffd76a',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'I am the only one my size. There is another at the mill but she is nearly nine so that is different.',
        'I have named all the empty houses. That one is Bell, that one is Sorry, and that big one is Mr Chair.',
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
  fog: ['#26201a', 22, 70],
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

export const INN_VERRENHOLT = {
  ...ROOM_BASE,
  id: 'inn_verrenholt',
  name: "Anse's",
  subtitle: 'Verrenholt',
  music: 'memory',
  terrain: makeRoom(14, [
    '##############',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '######oo######',
  ], 'inn_verrenholt'),

  spawns: { default: { at: [6, 4], face: 'north' } },
  exits: [{ at: [6, 5], size: [2, 1], to: 'verrenholt', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [3.4, 3.0], rot: 0 },
    { kit: 'bench', at: [9.8, 3.0], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'crate', at: [11.2, 1.7], rot: 0.3 },
    { kit: 'lamppost', at: [6.5, 1.4] },
    { kit: 'flowerbox', at: [4.4, 1.6] },
    { kit: 'chest', at: [11.4, 3.6], id: 'inn-vh-chest',
      contains: { kind: 'item', id: 'earnestcharm', count: 1, label: 'an Earnest Charm' } },
    { kit: 'signpost', at: [2.4, 3.6], id: 'inn-vh-board',
      interact: { name: 'Framed Sampler', text: [
        'Stitched in careful child\'s letters: VERRENHOLT WELCOMES THE STRANGER AND KEEPS HIM.',
        'The frame is dusted daily. The glass is cracked and has not been replaced, because replacing it would mean taking it down.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-vh-keeper', name: 'Widow Anse', at: [6.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.61, hair: 'bob',
        colors: { skin: '#c08865', hair: '#dedbe0', torso: '#5a3230', accent: '#ddccab',
          legs: '#4b382d', boots: '#3a2a20' } },
      inn: { price: 15, name: "Anse's" },
      talk: ['Fifteen. There is bread and there is more bread. I will not insult you by calling the second one supper.'],
    },
    {
      id: 'inn-vh-old', name: 'Man by the Window', at: [3.8, 3.8], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'slim', height: 1.62, hair: 'bald', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#6b5d37', accent: '#95836b',
          legs: '#4b382d', boots: '#3a2a20' } },
      talk: [
        'Everyone asks what happened. Nothing happened. That is the answer and nobody ever likes it.',
        'The mill went, then the fair went, then the young went, and each of those took eleven years, so there was never a day to point at.',
      ],
    },
  ],
};

export const SHOP_VERRENHOLT = {
  ...ROOM_BASE,
  id: 'shop_verrenholt',
  name: 'Rennick, Sundries',
  subtitle: 'Verrenholt',
  music: 'memory',
  terrain: makeRoom(14, [
    '##############',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '#oooooooooooo#',
    '######oo######',
  ], 'shop_verrenholt'),

  spawns: { default: { at: [6, 4], face: 'north' } },
  exits: [{ at: [6, 5], size: [2, 1], to: 'verrenholt', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.6], rot: -0.3 },
    { kit: 'barrel', at: [11.2, 1.7] },
    { kit: 'barrel', at: [10.7, 2.7] },
    { kit: 'lamppost', at: [6.5, 1.4] },
    { kit: 'chest', at: [4.0, 3.6], id: 'shop-vh-chest',
      contains: { kind: 'gold', amount: 120, label: '120 gil' } },
  ],

  npcs: [
    {
      id: 'shop-vh-keeper', name: 'Cobb Rennick', at: [7.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.70, hair: 'wild', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#5e5163', torso: '#6b5d37', accent: '#8a6a23',
          legs: '#5e412c', boots: '#3a2a20' } },
      shop: 'harrowmere_items',
      talk: ['Take your time. You are the second customer this week and the first one was Anse, and she was only in to complain.'],
    },
  ],
};

export const VERRENHOLT_INTERIORS = {
  inn_verrenholt: INN_VERRENHOLT,
  shop_verrenholt: SHOP_VERRENHOLT,
};
