/**
 * Emberlyn — the crossing of four roads.
 *
 * Emberlyn never decided to become a town. Two roads met, somebody sold water
 * to the people waiting, and four centuries later the market has crept so far
 * along both arms that the buildings are simply the walls of a corridor.
 *
 * The plan is a cross and nothing else. There is deliberately no square: the
 * player is always standing in *one arm* of the crossing and can never see the
 * whole place at once, which is precisely how Emberlyn does business — every
 * conversation here is about what is coming down the arm you cannot see. The
 * caravan yard is shoved out to the south gate, because a wagon needs room to
 * turn and a wagon turning in the market is a day's takings lost by everyone
 * it scrapes past.
 */

const W = 42;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[emberlyn] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 42)),
  /*  1 */ row(R('#', 42)),
  // --- the north gate ------------------------------------------------------
  /*  2 */ row(R('#', 18), R('=', 6), R('#', 18)),
  /*  3 */ row(R('#', 18), R('=', 6), R('#', 18)),
  // --- the north arm -------------------------------------------------------
  /*  4 */ row(R('#', 8), R(',', 10), R('=', 6), R(',', 10), R('#', 8)),
  /*  5 */ row(R('#', 8), R(',', 10), R('=', 6), R(',', 10), R('#', 8)),
  /*  6 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  /*  7 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  /*  8 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  /*  9 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  /* 10 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  /* 11 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  // --- the east-west arm: the only place the town is wide ------------------
  /* 12 */ row(R('#', 2), R('=', 38), R('#', 2)),
  /* 13 */ row(R('#', 2), R('=', 38), R('#', 2)),
  /* 14 */ row(R('#', 2), R('=', 38), R('#', 2)),
  /* 15 */ row(R('#', 2), R('=', 38), R('#', 2)),
  // --- the south arm -------------------------------------------------------
  /* 16 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  /* 17 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  /* 18 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  /* 19 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  /* 20 */ row(R('#', 6), R(',', 12), R('=', 6), R(',', 12), R('#', 6)),
  // --- the caravan yard ----------------------------------------------------
  /* 21 */ row(R('#', 4), R('%', 14), R('=', 6), R('%', 14), R('#', 4)),
  /* 22 */ row(R('#', 4), R('%', 14), R('=', 6), R('%', 14), R('#', 4)),
  /* 23 */ row(R('#', 4), R('%', 14), R('=', 6), R('%', 14), R('#', 4)),
  // --- the south gate ------------------------------------------------------
  /* 24 */ row(R('#', 18), R('=', 6), R('#', 18)),
  /* 25 */ row(R('#', 18), R('=', 6), R('#', 18)),
];

export const EMBERLYN = {
  id: 'emberlyn',
  name: 'Emberlyn',
  subtitle: 'The Crossing of Four Roads',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#c8b494', 100, 300],
  tilt: 0.40,
  cameraDistance: 16,
  music: 'town_bazaar',
  base: 'dirt',
  groundRamp: 'terrain',
  wallHeight: 4.6,
  wallMaterial: 'plaster',

  sky: {
    zenith: '#3a6ea0', horizon: '#e0c69c', ground: '#6b5c44',
    sunColor: '#ffe0ab', sunDir: [0.45, 0.58, 0.4], cloud: 0.42,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [21, 23], face: 'north' },
    world: { at: [21, 23], face: 'north' },
    world_north: { at: [21, 4], face: 'south' },
    inn: { at: [15, 9], face: 'west' },
  },

  exits: [
    { at: [18, 25], size: [6, 1], to: 'overworld', spawn: 'emberlyn', prompt: 'The south road' },
    { at: [18, 2], size: [6, 1], to: 'overworld', spawn: 'emberlyn_north', prompt: 'The north road' },
  ],

  props: [
    // --- the crossing itself -----------------------------------------------
    { kit: 'well', at: [20.5, 13.5], id: 'em-well', radius: 1.2,
      interact: { name: 'The Crossing Well', text: [
        'Deep, sweet, and the entire reason there is a town here rather than a milestone.',
        'The rim is worn into four smooth saddles — one for each road, where drovers have set the same bucket down for four hundred years.',
      ] } },
    { kit: 'lamppost', at: [17.4, 11.6] },
    { kit: 'lamppost', at: [24.6, 11.6] },
    { kit: 'lamppost', at: [17.4, 16.4] },
    { kit: 'lamppost', at: [24.6, 16.4] },

    // --- the north arm: the respectable end ---------------------------------
    { kit: 'building', at: [12.0, 8.0], w: 9, d: 6, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'tile', timbered: true, balcony: true, chimney: true,
      door: 'east', id: 'em-inn', enter: 'inn_emberlyn', enterPrompt: 'The Long Table',
      sign: { icon: '🛏', text: 'The Long Table', x: -3.2 } },

    { kit: 'building', at: [30.0, 8.0], w: 9, d: 6, h: 3.8, storeys: 2, rise: 2.0,
      style: 'stone', roof: 'slate', awning: true, door: 'west', id: 'em-counting',
      sign: { icon: '⚖', text: 'The Weighing Hall', x: 3.2 } },

    { kit: 'building', at: [12.6, 5.2], w: 5, d: 3.6, h: 3.2, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', id: 'em-house-a' },
    { kit: 'building', at: [29.4, 5.2], w: 5, d: 3.6, h: 3.2, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', rot: -0.08, id: 'em-house-b' },

    // --- the south arm: the trade end ---------------------------------------
    { kit: 'building', at: [12.0, 18.0], w: 8, d: 5, h: 3.6, rise: 1.9,
      style: 'plaster', roof: 'tile', awning: true, door: 'east',
      id: 'em-supply', enter: 'shop_emberlyn', enterPrompt: 'Cartage & Cure',
      sign: { icon: '🧪', text: 'Cartage & Cure', x: -2.8 } },

    { kit: 'building', at: [30.0, 18.0], w: 8, d: 5, h: 3.9, rise: 1.7,
      style: 'stone', roof: 'slate', chimney: true, door: 'west', id: 'em-arms',
      sign: { icon: '⚒', text: 'Bill of Lading', x: 2.8 } },

    // --- the market, spilling down both arms --------------------------------
    { kit: 'stall', at: [19.0, 7.0], arg: '#8b2a2c', id: 'em-stall-1' },
    { kit: 'stall', at: [23.0, 7.0], arg: '#2c5a45', id: 'em-stall-2' },
    { kit: 'stall', at: [19.0, 10.4], arg: '#8a6a23', id: 'em-stall-3' },
    { kit: 'stall', at: [23.0, 10.4], arg: '#4e326c', id: 'em-stall-4' },
    { kit: 'stall', at: [4.6, 13.0], arg: '#33477c', id: 'em-stall-5' },
    { kit: 'stall', at: [4.6, 14.8], arg: '#b34a41', id: 'em-stall-6' },
    { kit: 'stall', at: [37.4, 13.0], arg: '#2c5a45', id: 'em-stall-7' },
    { kit: 'stall', at: [37.4, 14.8], arg: '#ab8018', id: 'em-stall-8' },
    { kit: 'stall', at: [19.0, 17.2], arg: '#496035', id: 'em-stall-9' },
    { kit: 'stall', at: [23.0, 17.2], arg: '#7c4939', id: 'em-stall-10' },

    { kit: 'crate', at: [8.0, 12.6], rot: 0.3 },
    { kit: 'crate', at: [8.6, 13.4], rot: -0.2 },
    { kit: 'barrel', at: [9.4, 12.5] },
    { kit: 'barrel', at: [33.0, 15.2] },
    { kit: 'crate', at: [33.8, 14.4], rot: 0.5 },
    { kit: 'flowerbox', at: [16.0, 12.4] },
    { kit: 'flowerbox', at: [25.6, 15.4] },
    { kit: 'bench', at: [14.0, 15.2], rot: 0 },
    { kit: 'bench', at: [28.0, 12.6], rot: Math.PI },

    // --- the caravan yard ---------------------------------------------------
    { kit: 'cart', at: [8.5, 22.0], rot: 0.25 },
    { kit: 'cart', at: [13.0, 22.6], rot: -0.4 },
    { kit: 'cart', at: [31.5, 22.2], rot: 1.5 },
    { kit: 'cart', at: [35.0, 21.6], rot: 0.1 },
    { kit: 'barrel', at: [10.6, 21.4] },
    { kit: 'barrel', at: [11.2, 22.2] },
    { kit: 'crate', at: [29.0, 21.5], rot: 0.4 },
    { kit: 'crate', at: [29.6, 22.4], rot: -0.3 },
    { kit: 'crate', at: [16.2, 23.0], rot: 0.15 },
    { kit: 'fence', at: [7.0, 20.6], arg: 6, radius: 0 },
    { kit: 'fence', at: [34.5, 20.6], arg: 6, radius: 0 },
    { kit: 'lamppost', at: [19.0, 21.4] },
    { kit: 'lamppost', at: [23.0, 21.4] },

    // --- greenery, such as it is --------------------------------------------
    { kit: 'tree', at: [7.0, 7.5], kind: 'autumn', scale: 1.05, seed: 3, id: 'em-tree-nw' },
    { kit: 'tree', at: [7.4, 10.6], kind: 'broadleaf', scale: 0.95, seed: 7 },
    { kit: 'tree', at: [34.6, 7.2], kind: 'autumn', scale: 1.1, seed: 11, id: 'em-tree-ne' },
    { kit: 'tree', at: [34.2, 10.8], kind: 'broadleaf', scale: 1.0, seed: 13 },
    { kit: 'tree', at: [7.2, 19.4], kind: 'broadleaf', scale: 1.05, seed: 17 },
    { kit: 'tree', at: [34.8, 19.4], kind: 'autumn', scale: 0.95, seed: 19 },
    { kit: 'bush', at: [9.0, 4.6], scale: 1.0, seed: 23, radius: 0 },
    { kit: 'bush', at: [32.8, 4.6], scale: 1.1, seed: 29, radius: 0 },

    // --- signage, save, treasure --------------------------------------------
    { kit: 'signpost', at: [17.2, 22.6], id: 'em-sign',
      interact: { name: 'Toll Board', text: [
        'NORTH ROAD — 4 gil the axle, 1 the head, nothing for children under a hand tall.',
        'SOUTH ROAD — as above, doubled, on account of the state of it.',
        'Someone has added, in charcoal: EAST ROAD — CLOSED. ASK NOBODY WHY.',
      ] } },
    // The charcoal line under the toll board, and the road it closes.
    { kit: 'signpost', at: [19.4, 22.6], id: 'em-eastroad',
      interact: { prompt: 'The east road', event: 'emberlyn_eastroad' } },
    { kit: 'savepoint', at: [21, 20.4], id: 'em-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },

    { kit: 'chest', at: [3.6, 12.6], id: 'em-chest-1',
      contains: { kind: 'gold', amount: 420, label: '420 gil' } },
    { kit: 'chest', at: [38.4, 15.4], id: 'em-chest-2',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },
    { kit: 'chest', at: [5.4, 22.6], id: 'em-chest-3',
      contains: { kind: 'item', id: 'swiftband', count: 1, label: 'a Swift Band' } },
    // "Blew in with the caravans and stayed" — so it is in the yard, on the
    // far side from the drovers' end, among the boxes nobody has claimed
    // either. Three parishes have written to disown it and it is still here.
    { kit: 'chest', at: [26.5, 22.8], id: 'em-chest-foundling',
      contains: { kind: 'esper', id: 'windfoundling', label: 'a shard of magicite' } },
    { kit: 'chest', at: [17.0, 6.4], id: 'em-chest-4',
      contains: { kind: 'item', id: 'nightknife', count: 1, label: 'a Night Market Knife' } },
  ],

  /**
   * Emberlyn after. A crossroads is only worth anything if something is still
   * crossing it. Nothing is. The stalls are up and the canvas is clean, and
   * the traders stand behind them all day because the alternative is to admit
   * that they are standing in a field.
   */
  ruin: {
    subtitle: 'Where Nothing Crosses',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#8f7a5e', 55, 190],
    music: 'memory',
    sky: {
      zenith: '#65483a', horizon: '#c8a184', ground: '#3e352c',
      sunColor: '#ff9d63', sunDir: [-0.35, 0.24, 0.36], cloud: 0.92,
    },
    // Idryn is still here, but as the ruin's version of himself, so the whole
    // world's copy has to go or the two of him stand in the same boot.
    removeNpcs: ['em-child', 'em-toll', 'em-drover', 'em-master'],
    removeProps: ['em-tree-nw', 'em-tree-ne'],
    npcs: [
      {
        id: 'em-ruin-master', name: 'Caravan-Master Idryn', at: [26.6, 9.6], face: 'east',
        clip: 'sit', prompt: 'Speak', event: 'emberlyn_caravan',
        look: { build: 'heavy', height: 1.70, hair: 'bald', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#96603f', hair: '#241d26', torso: '#6b5d37', accent: '#8a6a23',
            legs: '#5e412c', boots: '#4b382d', gloves: '#7c4939' } },
        talk: [
          'Forty-one wagons on the book for this month. I have written all forty-one in.',
          'A ledger is a promise about the future. I am not stopping just because the future has.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [7.0, 7.5], kind: 'dead', scale: 1.3, seed: 301 },
      { kit: 'tree', at: [34.6, 7.2], kind: 'dead', scale: 1.2, seed: 303 },
      { kit: 'chest', at: [20.5, 4.6], id: 'em-ruin-chest',
        contains: { kind: 'item', id: 'quietstep', count: 1, label: 'a Quiet Step' } },
    ],
  },

  npcs: [
    {
      id: 'em-highworks', name: 'Highworks Factor Ombrin', at: [26.6, 7.4], face: 'east',
      clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.74, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#414954', boots: '#3b3943', gloves: '#666c74', cape: '#38224f' } },
      shop: 'solmere_highworks',
      talk: [
        'Marchetti Highworks. Not the Works — the Highworks, which is the floor above it, and the difference is about eleven thousand gil an item.',
        'I sell out of a strongbox on the Weighing Hall steps because the Hall will not have me inside and the road will not have me outside. This is the compromise.',
      ],
    },
    {
      id: 'em-inn', name: 'Sabrena Loth', at: [15.4, 9.2], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.64, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 45, name: 'The Long Table' },
      talk: ['Forty-five, and you eat at the long table with everyone else. We do not do private rooms and we do not do secrets.'],
    },
    {
      id: 'em-items', name: 'Perrin Alcaz', at: [15.2, 17.4], face: 'west', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.71, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'solmere_items',
      talk: [
        'Solmere stock, Solmere prices, plus cartage. The cartage is the only honest number on the shelf.',
        'Everything else was decided by a man in a marble room who has never seen the south road in March.',
      ],
    },
    {
      id: 'em-arms', name: 'Widow Cabbot', at: [26.8, 17.4], face: 'east', clip: 'work', prompt: 'Trade',
      look: { build: 'normal', height: 1.69, hair: 'braid', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#dedbe0', torso: '#5a3230', accent: '#a6b0bc',
          legs: '#414954', boots: '#2b2933', gloves: '#4b382d' } },
      shop: 'solmere_arms',
      talk: [
        'Every blade here came up from the Works on a Marchetti lading bill. I add the cartage and my temper.',
        'My husband carted for them thirty years. They sent a form letter and a discount.',
      ],
    },
    {
      id: 'em-master', name: 'Caravan-Master Idryn', at: [26.6, 9.0], face: 'east',
      clip: 'work', prompt: 'Speak',
      // The same scene in both worlds: before, it is a man reciting a
      // timetable; after, it is a man reciting the same timetable at a road
      // with nothing on the end of it. The event decides which.
      event: 'emberlyn_caravan',
      look: { build: 'heavy', height: 1.70, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#6b5d37', accent: '#8a6a23',
          legs: '#5e412c', boots: '#4b382d', gloves: '#7c4939' } },
      talk: [
        'Nine wagons north this week. Two came back. That is not a mystery, that is arithmetic — the other seven went on to Solmere and are somebody else\'s problem.',
        'Ask me again in a fortnight and it will be a mystery.',
      ],
    },
    {
      // Nabb keeps the road passes as well as the toll, and the widow he sends
      // you to is four minutes away at the yard end of the market — which is
      // the length of the south arm, and the only errand in Emberlyn that
      // makes the player walk the whole crossing on purpose.
      id: 'em-toll', name: 'Toll Clerk Nabb', at: [19.0, 4.6], face: 'south', clip: 'work',
      prompt: 'Speak', facePlayer: true, event: 'carter_pass',
      look: { build: 'slim', height: 1.66, hair: 'short',
        colors: { skin: '#e7c39c', hair: '#5e5163', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943' } },
      talk: [
        'On foot? Then you are a head, not an axle, and a head is one gil. I shall not take it. I am telling you so you know I could.',
        'Ferran surveyors have come through the north gate eleven times this season and paid on nine of them. I write down the two.',
      ],
    },
    {
      id: 'em-drover', name: 'Drover Halm', at: [10.2, 22.3], face: 'north', clip: 'sit', prompt: 'Speak',
      look: { build: 'athletic', height: 1.78, hair: 'wild',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#496035', accent: '#5a3230',
          legs: '#6b5d37', boots: '#3a2a20' } },
      talk: [
        'South road has gone soft past the second milestone. Not muddy. Soft. The wheels come up warm.',
        'I have carted forty years and I have never once had to explain to an ox why we are turning round.',
      ],
    },
    {
      id: 'em-fortune', name: 'Mother Vell', at: [6.6, 14.6], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'slim', height: 1.58, hair: 'long', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#4e326c', accent: '#ffd76a',
          legs: '#38224f', boots: '#4b382d', cape: '#241636' } },
      talk: [
        'I do not tell fortunes. I quote odds. It is the same trade with the flattery taken out.',
        'You, at four to one against, which is generous, and I am not usually generous before noon.',
      ],
    },
    {
      // The satchel came out of the ditch under the hedge on the yard's own
      // road, so it is the porter who has it and the porter who knows whose
      // round it was. He stays through the ruin: the hook by the weighbridge
      // is still there afterwards and so is he.
      id: 'em-porter', name: 'Yard Porter', at: [33.0, 22.4], face: 'west', clip: 'work', prompt: 'Speak',
      event: 'postbag_found',
      look: { build: 'hulking', height: 1.90, hair: 'topknot',
        colors: { skin: '#c08865', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#4b382d', gloves: '#4b382d' } },
      talk: ['Crates from the Engine City go on the north side. Crates that hum go on the north side and further apart.'],
    },
    {
      // Orme buys descriptions, not specimens, so she keeps her cabinet on the
      // east–west arm where the traffic is and lets the animal-in-a-sack trade
      // walk past her to the shambles. She is here in both worlds; the drawers
      // do not care what the sky is doing.
      id: 'em-cabinet', name: 'Cabinet-Keeper Orme', at: [29.0, 13.6], face: 'south',
      clip: 'work', prompt: 'Speak', event: 'cabinet_of_species',
      look: { build: 'normal', height: 1.65, hair: 'braid', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#dedbe0', torso: '#2c5a45', accent: '#ddccab',
          legs: '#414954', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'Four hundred and six drawers, of which two hundred and nine have something in them and the rest have a label and a hope.',
        'I do not want the animal. I want the description, and I want it from somebody who was close enough to be wrong about the colour.',
      ],
    },
    {
      id: 'em-child', name: 'Sesk', at: [24.5, 14.5], face: 'west', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.28, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'I take bets on which gate a wagon leaves by. North pays best because everybody guesses south.',
        'Do not tell Mother Vell. She says I am undercutting her.',
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
  fog: ['#2a2018', 22, 70],
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

export const INN_EMBERLYN = {
  ...ROOM_BASE,
  id: 'inn_emberlyn',
  name: 'The Long Table',
  subtitle: 'Emberlyn',
  music: 'festival',
  terrain: makeRoom(20, [
    '####################',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#oooooooooooooooooo#',
    '#########oo#########',
  ], 'inn_emberlyn'),

  spawns: { default: { at: [9, 7], face: 'north' } },
  exits: [{ at: [9, 8], size: [2, 1], to: 'emberlyn', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [6.0, 3.2], rot: 0 },
    { kit: 'bench', at: [6.0, 5.2], rot: 0 },
    { kit: 'bench', at: [13.0, 3.2], rot: 0 },
    { kit: 'bench', at: [13.0, 5.2], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.7, 2.4] },
    { kit: 'barrel', at: [3.3, 1.7] },
    { kit: 'crate', at: [17.2, 1.7], rot: 0.3 },
    { kit: 'crate', at: [17.0, 2.8], rot: -0.2 },
    { kit: 'lamppost', at: [5.0, 1.8] },
    { kit: 'lamppost', at: [14.5, 1.8] },
    { kit: 'flowerbox', at: [9.5, 6.6] },
    { kit: 'chest', at: [17.4, 6.4], id: 'inn-em-chest',
      contains: { kind: 'item', id: 'hoardersglove', count: 1, label: "a Hoarder's Glove" } },
    { kit: 'signpost', at: [3.0, 6.4], id: 'inn-em-board',
      interact: { name: 'The Board', text: [
        'WANTED: two hands for the Solmere run. Must not be sick in a cart.',
        'WANTED: whoever took the grey mare. No questions, no reprisals, and I am lying about the reprisals.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-em-keeper', name: 'Sabrena Loth', at: [9.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.64, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 45, name: 'The Long Table' },
      talk: ['Forty-five. You will be woken at five by drovers arguing about a road neither of them has been down.'],
    },
    {
      id: 'inn-em-guest', name: 'Northern Trader', at: [4.6, 4.2], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.75, hair: 'braid', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#bd8746', torso: '#2c5a45', accent: '#ab8018',
          legs: '#414954', boots: '#3a2a20', cape: '#38224f' } },
      talk: [
        'I came down through the pass with sixty bolts of cloth and I am going back with sixty bolts of cloth.',
        'Nobody up there wants cloth. They want candles, salt, and somebody to tell them it is nothing.',
      ],
    },
  ],
};

export const SHOP_EMBERLYN = {
  ...ROOM_BASE,
  id: 'shop_emberlyn',
  name: 'Cartage & Cure',
  subtitle: 'Emberlyn',
  music: 'town_bazaar',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_emberlyn'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'emberlyn', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.4, 2.6], rot: -0.3 },
    { kit: 'crate', at: [3.2, 1.8], rot: 0.5 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.8, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.5, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-em-chest',
      contains: { kind: 'item', id: 'panacea', count: 2, label: '2 Panaceas' } },
  ],

  npcs: [
    {
      id: 'shop-em-keeper', name: 'Perrin Alcaz', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.71, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'solmere_items',
      talk: ['Shut the door, the dust gets into the tonics and then the tonics get into people.'],
    },
  ],
};

export const EMBERLYN_INTERIORS = {
  inn_emberlyn: INN_EMBERLYN,
  shop_emberlyn: SHOP_EMBERLYN,
};
