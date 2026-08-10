/**
 * Nettlebed — four places that all answer to the same name.
 *
 * Nether Nettlebed, Nettlebed Green, Priors Nettlebed and Nettlebed Watering
 * were four separate hamlets at the four corners of one common. They have grown
 * until their lanes touch, and the Imperium's surveyors have written them down
 * as one town, and not a soul who lives here has agreed to that.
 *
 * So the plan has no centre, on purpose. The four hamlets sit in the four
 * corners of the map, each with its own ground, its own well and its own
 * opinion about which of them is the real Nettlebed. Everything that joins them
 * runs round the *outside* — a lane along each edge — because the ring was
 * built by people going to market and not by people visiting each other.
 *
 * The middle is the Betweens: eight tiles of unclaimed scrub that no hamlet
 * mows, drains or pays for. Four short stub lanes point into it from the four
 * hamlets and every one of them stops three tiles short, which is exactly how
 * far each hamlet was prepared to maintain. The only things in the middle are a
 * boundary stone with four names cut into its four faces, the nettles that gave
 * the place its name, and the children, who are the only people in the parish
 * who use it.
 */

const W = 34;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[nettlebed] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** Rows 10, 18 and 19 pattern: west lane, hamlet skirts, stubs, open middle. */
const STUBS = () => row(R('#', 2), R(',', 2), R('.', 6), R(',', 2), R('.', 10),
  R(',', 2), R('.', 6), R(',', 2), R('#', 2));
const OPEN = () => row(R('#', 2), R(',', 2), R('.', 26), R(',', 2), R('#', 2));

const TERRAIN = [
  /*  0 */ row(R('#', 34)),
  /*  1 */ row(R('#', 34)),
  /*  2 */ row(R('#', 2), R('.', 30), R('#', 2)),
  // --- the north arm of the ring lane --------------------------------------
  /*  3 */ row(R('#', 2), R(',', 30), R('#', 2)),
  // --- Nether Nettlebed (west) and Nettlebed Green (east) ------------------
  /*  4 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /*  5 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /*  6 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /*  7 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /*  8 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /*  9 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  // --- the stubs point in from the north pair, and stop --------------------
  /* 10 */ STUBS(),
  /* 11 */ row(R('#', 2), R(',', 2), R('.', 6), R(',', 2), R('.', 3), R('b', 2), R('.', 5),
    R(',', 2), R('.', 6), R(',', 2), R('#', 2)),
  /* 12 */ row(R('#', 2), R(',', 2), R('.', 6), R(',', 2), R('.', 2), R('b', 3), R('t', 1),
    R('.', 4), R(',', 2), R('.', 6), R(',', 2), R('#', 2)),
  /* 13 */ row(R('#', 2), R(',', 2), R('.', 6), R(',', 2), R('.', 4), R('b', 4), R('.', 2),
    R(',', 2), R('.', 6), R(',', 2), R('#', 2)),
  // --- the Betweens: nobody's, and it shows --------------------------------
  /* 14 */ row(R('#', 2), R(',', 2), R('.', 8), R('b', 2), R('.', 3), R('t', 1), R('b', 2),
    R('.', 10), R(',', 2), R('#', 2)),
  /* 15 */ row(R('#', 2), R(',', 2), R('.', 8), R('b', 3), R('.', 2), R('b', 3),
    R('.', 10), R(',', 2), R('#', 2)),
  /* 16 */ row(R('#', 2), R(',', 2), R('.', 6), R(',', 2), R('.', 2), R('b', 2), R('t', 1),
    R('b', 2), R('.', 3), R(',', 2), R('.', 6), R(',', 2), R('#', 2)),
  /* 17 */ row(R('#', 2), R(',', 2), R('.', 6), R(',', 2), R('.', 3), R('b', 3), R('.', 4),
    R(',', 2), R('.', 6), R(',', 2), R('#', 2)),
  /* 18 */ STUBS(),
  /* 19 */ OPEN(),
  // --- Priors Nettlebed (west) and Nettlebed Watering (east) ---------------
  /* 20 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /* 21 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /* 22 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /* 23 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /* 24 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  /* 25 */ row(R('#', 2), R(',', 10), R('.', 10), R(',', 10), R('#', 2)),
  // --- the south arm of the ring, and the road out that belongs to nobody --
  /* 26 */ row(R('#', 2), R(',', 30), R('#', 2)),
  /* 27 */ row(R('#', 2), R('.', 30), R('#', 2)),
  /* 28 */ row(R('#', 15), R(',', 4), R('#', 15)),
  /* 29 */ row(R('#', 34)),
];

export const NETTLEBED = {
  id: 'nettlebed',
  name: 'Nettlebed',
  subtitle: 'Four Corners, One Name',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#b5c4a8', 95, 290],
  tilt: 0.42,
  cameraDistance: 18,
  music: 'town_harrowmere',
  base: 'grass',
  groundRamp: 'terrain',
  wallHeight: 4.2,
  wallMaterial: 'rock',

  sky: {
    zenith: '#3f7cb0', horizon: '#dcd4ac', ground: '#5e6444',
    sunColor: '#ffe6b8', sunDir: [0.4, 0.6, 0.36], cloud: 0.48,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [16.5, 27], face: 'north' },
    world: { at: [16.5, 27], face: 'north' },
    betweens: { at: [16.5, 15], face: 'north' },
  },

  exits: [
    { at: [15, 28], size: [4, 1], to: 'overworld', spawn: 'nettlebed_southlane', prompt: 'The common road' },
  ],

  props: [
    // --- Nether Nettlebed: oldest, poorest, and will tell you both -----------
    { kit: 'building', at: [5.5, 5.6], w: 7, d: 4.4, h: 3.6, storeys: 2, rise: 2.1,
      style: 'plaster', roof: 'thatch', timbered: true, balcony: true, chimney: true,
      door: 'south', id: 'nb-inn', enter: 'inn_nettlebed', enterPrompt: 'The Four Bells',
      sign: { icon: '🛏', text: 'The Four Bells', x: -2.6 } },
    { kit: 'building', at: [10.2, 5.4], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', id: 'nb-nw-a' },
    { kit: 'building', at: [5.0, 8.7], w: 5, d: 3.4, h: 3.3, rise: 1.7,
      style: 'wood', roof: 'thatch', door: 'north', id: 'nb-nw-b' },
    { kit: 'well', at: [8.8, 8.4], id: 'nb-well-nw', radius: 1.2,
      interact: { name: 'The Nether Well', text: [
        'Rope-worn to a groove on the north side, which is the side Nether Nettlebed stands on to draw.',
        'Cut into the coping: THE TOWN WELL. Somebody from another corner has added, in tar: OF NETHER.',
      ] } },
    { kit: 'barrel', at: [3.0, 4.4] },
    { kit: 'barrel', at: [3.6, 4.9] },
    { kit: 'cart', at: [11.4, 8.6], rot: 0.4 },
    { kit: 'fence', at: [8.0, 3.6], arg: 7, radius: 0 },
    { kit: 'lamppost', at: [7.4, 6.6] },
    { kit: 'chest', at: [2.6, 9.4], id: 'nb-chest-nw',
      contains: { kind: 'gold', amount: 280, label: '280 gil' } },

    // --- Nettlebed Green: has the green, and considers that decisive ---------
    { kit: 'building', at: [24.4, 5.4], w: 5, d: 3.6, h: 3.5, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'south', id: 'nb-ne-a' },
    { kit: 'building', at: [29.4, 5.4], w: 5, d: 3.6, h: 3.5, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'south', rot: 0.05, id: 'nb-ne-b' },
    { kit: 'building', at: [26.8, 8.8], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'stone', roof: 'slate', chimney: true, door: 'north', id: 'nb-ne-c',
      sign: { icon: '⚖', text: 'The Green Room', x: -1.8 } },
    { kit: 'well', at: [23.0, 8.4], id: 'nb-well-ne', radius: 1.2,
      interact: { name: 'The Green Well', text: [
        'Newer, deeper, and roofed, and the roof is the point: it was built the summer after Nether put a lid on theirs.',
        'A painted board: OPEN TO ALL FOUR. Beneath it, a smaller board listing the hours at which all four may come.',
      ] } },
    { kit: 'bench', at: [21.4, 5.0], rot: 0 },
    { kit: 'bench', at: [21.4, 6.8], rot: 0 },
    { kit: 'flowerbox', at: [20.6, 8.2] },
    { kit: 'tree', at: [19.4, 4.4], kind: 'broadleaf', scale: 1.1, seed: 3, id: 'nb-tree-green' },
    { kit: 'tree', at: [31.2, 8.6], kind: 'autumn', scale: 1.0, seed: 7, id: 'nb-tree-ne' },
    { kit: 'stall', at: [29.6, 8.8], arg: '#2c5a45', id: 'nb-stall-1' },
    { kit: 'lamppost', at: [25.4, 3.6] },
    { kit: 'chest', at: [31.4, 4.4], id: 'nb-chest-ne',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },

    // --- Priors Nettlebed: has the chapel, the ground and the paperwork ------
    { kit: 'building', at: [5.2, 21.8], w: 6, d: 4.4, h: 4.0, rise: 2.4,
      style: 'stone', roof: 'slate', door: 'east', id: 'nb-chapel',
      sign: { icon: '⚖', text: 'The Priors\' Chapel', x: -2.2 } },
    { kit: 'building', at: [10.4, 21.2], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'east', id: 'nb-sw-a' },
    { kit: 'building', at: [5.6, 24.8], w: 5, d: 3.4, h: 3.3, rise: 1.7,
      style: 'plaster', roof: 'thatch', door: 'north', id: 'nb-sw-b' },
    { kit: 'well', at: [9.2, 24.6], id: 'nb-well-sw', radius: 1.2,
      interact: { name: 'The Priors\' Well', text: [
        'Consecrated, according to Priors Nettlebed. Unconsecrated but very cold, according to everybody else.',
        'The bucket is chained and the chain is longer than it needs to be, so that a person from another corner may draw without touching the coping.',
      ] } },
    { kit: 'fence', at: [8.4, 20.4], arg: 6, radius: 0 },
    { kit: 'lamppost', at: [3.4, 20.4] },
    { kit: 'bush', at: [2.6, 22.6], scale: 1.0, seed: 17, radius: 0 },
    { kit: 'crate', at: [11.4, 24.6], rot: 0.3 },
    { kit: 'crate', at: [11.0, 25.4], rot: -0.2 },
    { kit: 'chest', at: [2.6, 25.4], id: 'nb-chest-sw',
      contains: { kind: 'item', id: 'gravesalt', count: 2, label: '2 Grave Salts' } },

    // --- Nettlebed Watering: has the forge, the shop and everybody's custom --
    { kit: 'building', at: [26.4, 21.8], w: 7, d: 4.4, h: 3.6, rise: 1.9,
      style: 'plaster', roof: 'tile', awning: true, door: 'south',
      id: 'nb-shop', enter: 'shop_nettlebed', enterPrompt: 'The Watering Counter',
      sign: { icon: '🧪', text: 'The Watering Counter', x: -2.6 } },
    { kit: 'building', at: [30.6, 21.2], w: 4, d: 3.6, h: 3.4, rise: 1.8,
      style: 'stone', roof: 'iron', chimney: true, door: 'west', id: 'nb-forge',
      sign: { icon: '⚒', text: 'Kestle, Shoeing', x: -1.6 } },
    { kit: 'building', at: [24.2, 24.9], w: 5, d: 3.4, h: 3.3, rise: 1.7,
      style: 'wood', roof: 'thatch', door: 'north', id: 'nb-se-a' },
    { kit: 'well', at: [29.2, 24.8], id: 'nb-well-se', radius: 1.2,
      interact: { name: 'The Watering', text: [
        'The trough the hamlet is named for, fed by a pipe from a spring that four corners have argued about for two centuries.',
        'The spring is in the Betweens. Nobody owns the Betweens. This has never once been mentioned out loud at a parish meeting.',
      ] } },
    { kit: 'cart', at: [21.6, 22.6], rot: 1.4 },
    { kit: 'barrel', at: [31.4, 25.4] },
    { kit: 'stall', at: [21.4, 25.0], arg: '#8a6a23', id: 'nb-stall-2' },
    { kit: 'lamppost', at: [28.0, 20.4] },
    { kit: 'flowerbox', at: [22.6, 20.6] },
    { kit: 'chest', at: [31.4, 19.0], id: 'nb-chest-se',
      contains: { kind: 'item', id: 'ironbrooch', count: 1, label: 'an Iron Brooch' } },

    // --- the Betweens ---------------------------------------------------------
    { kit: 'signpost', at: [17.0, 15.0], id: 'nb-boundstone',
      interact: { name: 'The Boundary Stone', text: [
        'Four faces, four names, cut by four different masons in four different centuries and none of them level with the others.',
        'NETHER. GREEN. PRIORS. WATERING. The top of the stone is worn smooth, because the beaters of the bounds strike it once each, every year, in that order, and the order is the only thing everybody agrees on.',
      ] } },
    { kit: 'savepoint', at: [17.0, 17.0], id: 'nb-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'rock', at: [13.2, 16.4], scale: 1.0, seed: 11 },
    { kit: 'rock', at: [20.6, 13.6], scale: 0.9, seed: 13 },
    { kit: 'chest', at: [19.4, 17.6], id: 'nb-chest-mid',
      contains: { kind: 'item', id: 'quicklimecharm', count: 1, label: 'a Quicklime Charm' } },
    { kit: 'signpost', at: [16.6, 26.6], id: 'nb-roadboard',
      interact: { name: 'The Road Board', text: [
        'FOR NETTLEBED, TAKE THE LANE. Below it, four smaller boards, each nailed over part of the one before.',
        'FOR NETHER, LEFT. FOR THE GREEN, RIGHT. FOR PRIORS, LEFT AND LEFT. FOR WATERING, ASK AT PRIORS AND DO NOT SAY WHO SENT YOU.',
      ] } },
  ],

  /**
   * Nettlebed after. Three corners are shut up. The fourth is still ringing its
   * bell at the hour it always rang it, and the beaters still went round the
   * bounds this spring, because if they stop there will be no Nettlebed at all,
   * only four empty places.
   */
  ruin: {
    subtitle: 'Three Corners Dark',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#867f6e', 50, 180],
    music: 'memory',
    sky: {
      zenith: '#4d4356', horizon: '#bc9880', ground: '#39352a',
      sunColor: '#ff9d63', sunDir: [-0.34, 0.22, 0.34], cloud: 0.92,
    },
    removeNpcs: ['nb-child', 'nb-carrier', 'nb-surveyor', 'nb-hayward'],
    removeProps: ['nb-tree-green', 'nb-tree-ne'],
    npcs: [
      {
        id: 'nb-ruin-hayward', name: 'Hayward Prowse', at: [15.0, 17.0], face: 'south',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'normal', height: 1.70, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#ac744c', hair: '#5e5163', torso: '#496035', accent: '#8a6a23',
            legs: '#5e412c', boots: '#3a2a20', cape: '#5a3230' } },
        talk: [
          'I beat the bounds alone this year. Nether, Green, Priors, Watering, in that order, and I struck the stone four times.',
          'A parish is a line somebody walks. So long as somebody walks it, there is still a parish, and I am somebody.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [19.4, 4.4], kind: 'dead', scale: 1.3, seed: 901 },
      { kit: 'tree', at: [31.2, 8.6], kind: 'dead', scale: 1.2, seed: 903 },
      { kit: 'chest', at: [14.0, 14.0], id: 'nb-ruin-chest',
        contains: { kind: 'item', id: 'unbrokenoath', count: 1, label: 'an Unbroken Oath' } },
    ],
  },

  npcs: [
    {
      id: 'nb-inn', name: 'Ivy Trewe', at: [7.4, 7.4], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.65, hair: 'braid', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 36, name: 'The Four Bells' },
      talk: [
        'Thirty-six. And the house is called the Four Bells because there are four chapels within a mile and none of them agree about the hour.',
        'Sleep here and you will be woken four times by four different notions of morning. I do not apologise for it. I did not build the chapels.',
      ],
    },
    {
      id: 'nb-shop', name: 'Kestle Vann', at: [26.4, 24.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.71, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'weepingwood_hedge',
      talk: [
        'Everyone in the parish comes to this counter and every one of them tells me on the way in that they have come a long way.',
        'It is nine hundred yards from the furthest door in Nettlebed to this one. I have paced it. I do not say so, because the walk is the whole of their grievance and I sell things.',
      ],
    },
    {
      id: 'nb-nether', name: 'Goodman Trewe', at: [8.0, 5.0], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.69, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#496035', accent: '#5a3230',
          legs: '#6b5d37', boots: '#4b382d' } },
      talk: [
        'Nether is the oldest. There is a charter, it is in a box, and the box is in Priors, which is the entire difficulty.',
        'They will say the Green is the town because the Green has a green. A green is grass somebody stopped ploughing. We were here when it was ploughed.',
      ],
    },
    {
      id: 'nb-green', name: 'Mistress Cadgwith', at: [21.6, 6.4], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'normal', height: 1.66, hair: 'bob', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#4e326c', accent: '#d8ac31',
          legs: '#414954', boots: '#3a2a20' } },
      talk: [
        'A town has a green, a bench and somewhere to stand about. Look around you. You are standing about. I rest my case entirely.',
        'Nether has a lane. Priors has a graveyard. Watering has a puddle with ambitions. We have this, and you came to it, and that is my proof.',
      ],
    },
    {
      id: 'nb-priors', name: 'Parson Kew', at: [8.4, 22.0], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.72, hair: 'short', expression: 'neutral',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#38224f', accent: '#ffd76a',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      talk: [
        'Every soul in the parish is buried here, whichever corner they were rude in. On the ground alone, Priors is Nettlebed, and I say so gently and often.',
        'The charter is in my vestry in a locked box and I have never opened it. If it says what Nether hopes it says, we lose the argument, and the argument is what holds the four together.',
      ],
    },
    {
      id: 'nb-watering', name: 'Smith Prowse', at: [30.0, 22.6], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.88, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      talk: [
        'I have shod horses out of all four corners for thirty years and not one of them cared whose grass it was standing on.',
        'Let them argue. Every argument ends with somebody walking somewhere, and everything that walks comes past my door eventually.',
      ],
    },
    {
      id: 'nb-surveyor', name: 'Surveyor Bagnall', at: [15.0, 12.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.74, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'I was sent to establish the centre of Nettlebed. It is a straightforward calculation and I finished it in an afternoon, four years ago.',
        'The centre is a nettle patch eleven feet from where you are standing. Nobody will accept a finding they cannot build a chapel on, so I have been resurveying ever since, very slowly, at their expense.',
      ],
    },
    {
      id: 'nb-carrier', name: 'Carrier Loam', at: [17.0, 26.0], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.77, hair: 'wild',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#6b5d37', accent: '#b34a41',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'Four addresses, all of them Nettlebed, and the only way to tell them apart is which of them the letter makes angry.',
        'I take the ring round the outside and I do the whole parish in an hour. Cut through the middle and you would do it in ten minutes, and then somebody would have to admit the middle was a road.',
      ],
    },
    {
      id: 'nb-hayward', name: 'Hayward Prowse', at: [19.0, 15.0], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.70, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#496035', accent: '#8a6a23',
          legs: '#5e412c', boots: '#3a2a20', cape: '#5a3230' } },
      talk: [
        'Nobody mows the Betweens. Nether says it is the Green\'s. The Green says it is Priors\'. Priors says it is common. Watering says nothing and grazes it at night.',
        'The nettles are eleven feet across and the boundary stone is somewhere in the middle of them. I know exactly where. It is my only real power.',
      ],
    },
    {
      id: 'nb-child', name: 'Wick', at: [16.0, 13.0], face: 'south', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.22, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'We all play in the middle because it is the only bit our mothers cannot see us in from any of the four.',
        'You get stung to the knee and then you are not from anywhere for the afternoon. It is the best part of Nettlebed and no grown person has been in it for years.',
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
  fog: ['#231e17', 22, 70],
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

export const INN_NETTLEBED = {
  ...ROOM_BASE,
  id: 'inn_nettlebed',
  name: 'The Four Bells',
  subtitle: 'Nettlebed',
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
  ], 'inn_nettlebed'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'nettlebed', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [4.5, 3.0], rot: 0 },
    { kit: 'bench', at: [4.5, 4.8], rot: 0 },
    { kit: 'bench', at: [12.5, 3.0], rot: 0 },
    { kit: 'bench', at: [12.5, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.8, 2.4] },
    { kit: 'barrel', at: [3.4, 1.6] },
    { kit: 'crate', at: [15.2, 1.7], rot: 0.3 },
    { kit: 'lamppost', at: [6.0, 1.6] },
    { kit: 'lamppost', at: [11.5, 1.6] },
    { kit: 'flowerbox', at: [8.6, 5.4] },
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-nb-chest',
      contains: { kind: 'item', id: 'pilgrimsknot', count: 1, label: "a Pilgrim's Knot" } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-nb-board',
      interact: { name: 'The Settle Board', text: [
        'Four benches in this room and four notices above them, one to a corner, each claiming its bench by long custom.',
        'A fifth notice, in Ivy Trewe\'s hand: THEY ARE MY BENCHES. SIT WHERE YOU LIKE. I WILL DEAL WITH IT.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-nb-keeper', name: 'Ivy Trewe', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.65, hair: 'braid', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 36, name: 'The Four Bells' },
      talk: ['Thirty-six. If anybody asks which corner you are stopping in, tell them the ceiling and go up the stairs.'],
    },
    {
      id: 'inn-nb-guest', name: 'Tithe Clerk', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'slim', height: 1.71, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#5e5163', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#414954', boots: '#3a2a20', cape: '#38224f' } },
      talk: [
        'One town, one tithe. That is the rule and it has cost me eleven days a year for nine years.',
        'They will not pay a quarter each. Each corner will pay the whole, on condition the other three are recorded as having paid nothing. I have stopped explaining why that does not work.',
      ],
    },
  ],
};

export const SHOP_NETTLEBED = {
  ...ROOM_BASE,
  id: 'shop_nettlebed',
  name: 'The Watering Counter',
  subtitle: 'Nettlebed',
  music: 'shop',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_nettlebed'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'nettlebed', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.6], rot: -0.3 },
    { kit: 'crate', at: [3.4, 1.8], rot: 0.5 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.6, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.8, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-nb-chest',
      contains: { kind: 'item', id: 'balm', count: 3, label: '3 Field Balms' } },
  ],

  npcs: [
    {
      id: 'shop-nb-keeper', name: 'Kestle Vann', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.71, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'weepingwood_hedge',
      talk: ['One price, four corners, and I write the corner in the book so that at the end of the year I can prove nobody is favoured. They still check.'],
    },
  ],
};

export const NETTLEBED_INTERIORS = {
  inn_nettlebed: INN_NETTLEBED,
  shop_nettlebed: SHOP_NETTLEBED,
};
