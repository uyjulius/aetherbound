/**
 * Wexford — the town that is a staircase.
 *
 * The hill goes up two hundred and nine steps from the water to the watch, and
 * Wexford is what happened to the people who had to live on it. There is no
 * street. There is the stair, and there are the treads either side of it wide
 * enough to stand a house on, and that is the entire plan.
 *
 * The map is banded top to bottom — a rock riser, two paved treads, another
 * riser — so the eye reads the climb from any point on it, and the flights
 * *taper*: twenty-four tiles across at the foot, eight at the head. The town
 * narrows as it rises because the hill does, and because the people at the top
 * were able to insist on it.
 *
 * Everything else in Wexford follows from carrying. There is exactly one piece
 * of level ground, the Middle Landing, and it holds the inn, the shop, the
 * well and every trestle in the town, because it is the only place a table
 * stands honest. Below it is the Foot, which is where things are put down.
 * Above it is where things are paid to go. The porters' tariff is charged by
 * the step, so the price of a barrel in Wexford is a matter of altitude, and
 * everybody here can tell you their own height in coppers.
 */

const W = 30;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[wexford] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 30)),
  /*  1 */ row(R('#', 30)),
  // --- the Head: eight strides wide, and the whole town below it -----------
  /*  2 */ row(R('#', 11), R('=', 8), R('#', 11)),
  /*  3 */ row(R('#', 11), R('=', 8), R('#', 11)),
  /*  4 */ row(R('#', 11), R('=', 8), R('#', 11)),
  // --- the upper flight: riser, tread, tread, and again --------------------
  /*  5 */ row(R('#', 9), R('R', 12), R('#', 9)),
  /*  6 */ row(R('#', 9), R('=', 12), R('#', 9)),
  /*  7 */ row(R('#', 9), R('=', 12), R('#', 9)),
  /*  8 */ row(R('#', 8), R('R', 14), R('#', 8)),
  /*  9 */ row(R('#', 8), R('=', 14), R('#', 8)),
  /* 10 */ row(R('#', 8), R('=', 14), R('#', 8)),
  /* 11 */ row(R('#', 7), R('R', 16), R('#', 7)),
  /* 12 */ row(R('#', 7), R('=', 16), R('#', 7)),
  /* 13 */ row(R('#', 7), R('=', 16), R('#', 7)),
  /* 14 */ row(R('#', 5), R('R', 20), R('#', 5)),
  // --- the Middle Landing: the only level ground in Wexford ----------------
  /* 15 */ row(R('#', 3), R(',', 3), R('=', 18), R(',', 3), R('#', 3)),
  /* 16 */ row(R('#', 3), R(',', 3), R('=', 18), R(',', 3), R('#', 3)),
  /* 17 */ row(R('#', 3), R(',', 3), R('=', 18), R(',', 3), R('#', 3)),
  /* 18 */ row(R('#', 3), R(',', 3), R('=', 18), R(',', 3), R('#', 3)),
  /* 19 */ row(R('#', 3), R(',', 3), R('=', 18), R(',', 3), R('#', 3)),
  // --- the lower flight: broader, shallower, and worn to a dish ------------
  /* 20 */ row(R('#', 4), R('R', 22), R('#', 4)),
  /* 21 */ row(R('#', 4), R('=', 22), R('#', 4)),
  /* 22 */ row(R('#', 4), R('=', 22), R('#', 4)),
  /* 23 */ row(R('#', 4), R('R', 22), R('#', 4)),
  /* 24 */ row(R('#', 4), R('=', 22), R('#', 4)),
  /* 25 */ row(R('#', 4), R('=', 22), R('#', 4)),
  /* 26 */ row(R('#', 3), R('R', 24), R('#', 3)),
  /* 27 */ row(R('#', 3), R('=', 24), R('#', 3)),
  /* 28 */ row(R('#', 3), R('=', 24), R('#', 3)),
  /* 29 */ row(R('#', 3), R('R', 24), R('#', 3)),
  // --- the Foot: where things are put down ---------------------------------
  /* 30 */ row(R('#', 2), R(',', 26), R('#', 2)),
  /* 31 */ row(R('#', 2), R(',', 26), R('#', 2)),
  /* 32 */ row(R('#', 2), R(',', 26), R('#', 2)),
  /* 33 */ row(R('#', 2), R(',', 26), R('#', 2)),
  /* 34 */ row(R('#', 2), R(',', 26), R('#', 2)),
  /* 35 */ row(R('#', 12), R(',', 6), R('#', 12)),
  /* 36 */ row(R('#', 12), R(',', 6), R('#', 12)),
  /* 37 */ row(R('#', 30)),
];

export const WEXFORD = {
  id: 'wexford',
  name: 'Wexford',
  subtitle: 'Two Hundred and Nine',
  kind: 'town',
  light: 'day',
  grade: 'dawn',
  fog: ['#b9c4c0', 90, 280],
  tilt: 0.44,
  cameraDistance: 18,
  music: 'town_harrowmere',
  base: 'rock',
  groundRamp: 'terrain',
  wallHeight: 5.2,
  wallMaterial: 'stone',

  sky: {
    zenith: '#3a72a8', horizon: '#d8cdb2', ground: '#5e5a4e',
    sunColor: '#ffe2b4', sunDir: [0.36, 0.58, 0.4], cloud: 0.55,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [14.5, 34], face: 'north' },
    world: { at: [14.5, 34], face: 'north' },
    landing: { at: [14.5, 18], face: 'north' },
    head: { at: [14.5, 4], face: 'south' },
  },

  exits: [
    { at: [12, 36], size: [6, 1], to: 'overworld', spawn: 'wexford_foot', prompt: 'The foot of the stair' },
  ],

  props: [
    // --- the Head -------------------------------------------------------------
    { kit: 'building', at: [14.5, 3.3], w: 6, d: 3.4, h: 3.9, rise: 2.1,
      style: 'stone', roof: 'slate', chimney: true, door: 'south', id: 'wx-watch',
      sign: { icon: '⚖', text: 'The Stair-Head Watch', x: -2.3 } },
    { kit: 'lamppost', at: [11.6, 4.5] },
    { kit: 'lamppost', at: [17.4, 4.5] },
    { kit: 'signpost', at: [12.0, 2.4], id: 'wx-countpost',
      interact: { name: 'The Count Stone', text: [
        'A slab set into the top tread, lettered deep and refilled with lead every generation.',
        'TWO HUNDRED AND NINE. CUT BY THE PARISH. DISPUTED BY NOBODY WHO HAS COUNTED.',
        'Below, in a smaller and much angrier hand: THE QUAY IS NOT THE STAIR.',
      ] } },
    { kit: 'chest', at: [17.6, 2.5], id: 'wx-chest-head',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },

    // --- the upper flight -----------------------------------------------------
    { kit: 'building', at: [10.6, 6.5], w: 4, d: 3.4, h: 3.5, rise: 1.9,
      style: 'plaster', roof: 'slate', timbered: true, door: 'east', id: 'wx-h-a' },
    { kit: 'building', at: [19.4, 6.5], w: 4, d: 3.4, h: 3.5, rise: 1.9,
      style: 'plaster', roof: 'slate', timbered: true, door: 'west', rot: 0.05, id: 'wx-h-b' },
    { kit: 'building', at: [10.1, 9.5], w: 4, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'east', id: 'wx-h-c' },
    { kit: 'building', at: [19.9, 9.5], w: 4, d: 3.4, h: 3.4, rise: 1.8,
      style: 'stone', roof: 'slate', door: 'west', id: 'wx-h-d' },
    { kit: 'building', at: [9.0, 12.5], w: 5, d: 3.4, h: 3.5, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'east', id: 'wx-h-e' },
    { kit: 'building', at: [21.0, 12.5], w: 5, d: 3.4, h: 3.5, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'west', rot: -0.04, id: 'wx-h-f' },
    { kit: 'lamppost', at: [14.5, 8.0] },
    { kit: 'lamppost', at: [14.5, 11.0] },
    { kit: 'barrel', at: [12.6, 7.4] },
    { kit: 'barrel', at: [17.4, 10.4] },
    { kit: 'crate', at: [12.4, 13.6], rot: 0.3 },
    { kit: 'crate', at: [13.2, 13.7], rot: -0.25 },

    // --- the Middle Landing ---------------------------------------------------
    { kit: 'building', at: [7.0, 17.0], w: 7, d: 6.4, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'slate', timbered: true, balcony: true, chimney: true,
      door: 'east', id: 'wx-inn', enter: 'inn_wexford', enterPrompt: 'The Half Landing',
      sign: { icon: '🛏', text: 'The Half Landing', x: -2.6 } },
    { kit: 'building', at: [23.0, 17.0], w: 7, d: 6.4, h: 3.6, storeys: 2, rise: 2.0,
      style: 'plaster', roof: 'tile', awning: true, door: 'west',
      id: 'wx-shop', enter: 'shop_wexford', enterPrompt: 'The Carrying Trade',
      sign: { icon: '🧪', text: 'The Carrying Trade', x: 2.6 } },
    { kit: 'well', at: [15.0, 15.8], id: 'wx-well', radius: 1.2,
      interact: { name: 'The Landing Well', text: [
        'The only well in Wexford, and it is halfway up on purpose: sunk where the carry is the same either way.',
        'A brass plate on the winch, worn almost smooth: HALF UP. HALF DOWN. NOBODY FURTHER.',
      ] } },
    { kit: 'savepoint', at: [15.0, 19.0], id: 'wx-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'stall', at: [11.5, 17.0], arg: '#8a6a23', id: 'wx-stall-1' },
    { kit: 'stall', at: [18.5, 17.0], arg: '#2c5a45', id: 'wx-stall-2' },
    { kit: 'stall', at: [11.5, 19.2], arg: '#8b2a2c', id: 'wx-stall-3' },
    { kit: 'stall', at: [18.5, 19.2], arg: '#33477c', id: 'wx-stall-4' },
    { kit: 'bench', at: [13.0, 15.4], rot: Math.PI },
    { kit: 'bench', at: [17.0, 15.4], rot: Math.PI },
    { kit: 'flowerbox', at: [4.2, 15.6] },
    { kit: 'flowerbox', at: [25.8, 15.6] },
    { kit: 'lamppost', at: [4.4, 18.6] },
    { kit: 'lamppost', at: [25.6, 18.6] },
    { kit: 'chest', at: [4.4, 17.2], id: 'wx-chest-landing',
      contains: { kind: 'gold', amount: 360, label: '360 gil' } },
    { kit: 'signpost', at: [25.8, 19.4], id: 'wx-tariff',
      interact: { name: 'The Porterage Tariff', text: [
        'A board of prices, ruled by height rather than by weight. FOOT TO LANDING: FOUR. LANDING TO HEAD: NINE.',
        'HEAD TO FOOT: ONE, AND YOU CARRY IT YOURSELF, AND WE WILL NOT WATCH.',
        'At the bottom, added by a different hand: A MAN IS NOT CARGO. RATES ON APPLICATION.',
      ] } },

    // --- the lower flight -----------------------------------------------------
    { kit: 'building', at: [6.4, 21.6], w: 4.4, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'east', id: 'wx-h-g' },
    { kit: 'building', at: [23.6, 21.6], w: 4.4, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'west', rot: 0.06, id: 'wx-h-h' },
    { kit: 'building', at: [6.4, 24.6], w: 4.4, d: 3.4, h: 3.3, rise: 1.7,
      style: 'plaster', roof: 'thatch', door: 'east', id: 'wx-h-i' },
    { kit: 'building', at: [23.6, 24.6], w: 4.4, d: 3.4, h: 3.3, rise: 1.7,
      style: 'wood', roof: 'thatch', door: 'west', id: 'wx-h-j' },
    { kit: 'building', at: [5.6, 27.7], w: 5, d: 3.4, h: 3.5, rise: 1.8,
      style: 'stone', roof: 'slate', door: 'east', id: 'wx-chairhouse',
      sign: { icon: '⚒', text: 'The Chair Loft', x: -1.9 } },
    { kit: 'building', at: [24.4, 27.7], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'west', id: 'wx-h-k' },
    { kit: 'lamppost', at: [15.0, 22.4] },
    { kit: 'lamppost', at: [15.0, 27.0] },
    { kit: 'bench', at: [10.6, 22.4], rot: 0 },
    { kit: 'bench', at: [19.4, 25.4], rot: 0 },
    { kit: 'barrel', at: [9.2, 28.4] },
    { kit: 'barrel', at: [9.9, 28.6] },
    { kit: 'crate', at: [20.6, 28.4], rot: 0.4 },
    { kit: 'bush', at: [4.6, 21.4], scale: 1.0, seed: 17, radius: 0 },
    { kit: 'bush', at: [25.4, 24.4], scale: 1.05, seed: 19, radius: 0 },

    // --- the Foot -------------------------------------------------------------
    { kit: 'building', at: [6.0, 32.0], w: 6, d: 4.4, h: 3.6, rise: 1.9,
      style: 'wood', roof: 'thatch', door: 'east', id: 'wx-porterhouse',
      sign: { icon: '⚖', text: 'The Weighing Floor', x: -2.2 } },
    { kit: 'building', at: [24.0, 32.0], w: 6, d: 4.4, h: 3.5, rise: 1.9,
      style: 'wood', roof: 'thatch', door: 'west', rot: -0.05, id: 'wx-h-l' },
    { kit: 'cart', at: [10.2, 31.0], rot: 0.3 },
    { kit: 'cart', at: [19.8, 31.0], rot: 1.5 },
    { kit: 'crate', at: [11.0, 33.4], rot: 0.2 },
    { kit: 'crate', at: [11.8, 33.6], rot: -0.35 },
    { kit: 'crate', at: [18.6, 33.4], rot: 0.5 },
    { kit: 'barrel', at: [12.8, 30.6] },
    { kit: 'barrel', at: [17.2, 30.6] },
    { kit: 'fence', at: [7.0, 34.4], arg: 8, radius: 0 },
    { kit: 'fence', at: [23.0, 34.4], arg: 8, radius: 0 },
    { kit: 'lamppost', at: [12.4, 35.4] },
    { kit: 'lamppost', at: [17.6, 35.4] },
    { kit: 'tree', at: [3.6, 30.6], kind: 'broadleaf', scale: 1.05, seed: 3, id: 'wx-tree-foot' },
    { kit: 'tree', at: [26.4, 34.2], kind: 'autumn', scale: 1.0, seed: 7, id: 'wx-tree-quay' },
    { kit: 'chest', at: [3.4, 33.6], id: 'wx-chest-foot',
      contains: { kind: 'item', id: 'sprinter', count: 1, label: 'a pair of Sprinters' } },
    { kit: 'signpost', at: [26.6, 31.4], id: 'wx-footboard',
      interact: { name: 'The Foot Board', text: [
        'CARRIAGE ARRANGED. ALL WEIGHTS. NO ARGUMENT ABOUT THE STEPS, THEY ARE THE SAME STEPS FOR EVERYBODY.',
        'Under it, a list of goods left at the foot and never sent for. It goes back eleven years and the earliest entry is a piano.',
      ] } },
  ],

  /**
   * Wexford after. The stair is swept from the head down, every morning, by a
   * warden with nobody left to count. Nothing goes up. The Foot is stacked to
   * the wall with things that were paid for and never carried.
   */
  ruin: {
    subtitle: 'Nothing Going Up',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#8c8578', 50, 185],
    music: 'memory',
    sky: {
      zenith: '#54455c', horizon: '#c09a80', ground: '#3a352c',
      sunColor: '#ff9d63', sunDir: [-0.36, 0.24, 0.36], cloud: 0.92,
    },
    removeNpcs: ['wx-child', 'wx-porter', 'wx-carter', 'wx-warden'],
    removeProps: ['wx-tree-foot', 'wx-tree-quay'],
    npcs: [
      {
        id: 'wx-ruin-warden', name: 'Stair-Warden Ockle', at: [16.0, 4.0], face: 'south',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'normal', height: 1.69, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#ac744c', hair: '#5e5163', torso: '#414954', accent: '#a6b0bc',
            legs: '#2b2933', boots: '#3a2a20', cape: '#5a3230' } },
        talk: [
          'Two hundred and nine, and I have swept every one of them this morning, same as I did when there was a reason.',
          'A stair is a promise that somebody is coming up it. I am not the one who gets to break it.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [3.6, 30.6], kind: 'dead', scale: 1.3, seed: 701 },
      { kit: 'tree', at: [26.4, 34.2], kind: 'dead', scale: 1.2, seed: 703 },
      { kit: 'chest', at: [15.0, 31.0], id: 'wx-ruin-chest',
        contains: { kind: 'item', id: 'wakefulcharm', count: 1, label: 'a Wakeful Charm' } },
    ],
  },

  npcs: [
    {
      id: 'wx-inn', name: 'Bessa Lyle', at: [9.0, 17.4], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.64, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 44, name: 'The Half Landing' },
      talk: [
        'Forty-four, and the bed is level. In Wexford that is not a boast, it is the whole of the trade.',
        'My great-grandmother paid a mason more than the house cost to make this floor honest. Every other floor in the town leans downhill and pretends it does not.',
      ],
    },
    {
      id: 'wx-shop', name: 'Coll Anstey', at: [21.0, 17.4], face: 'east', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.73, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'cinderspine_camp',
      talk: [
        'Everything on that shelf came up a hundred and four steps on somebody\'s back, and the price says so. It is not greed. It is arithmetic with a spine in it.',
        'I am halfway up because halfway up is where both ends of the town will grudgingly meet. Neither of them enjoys it, which is how I know the price is right.',
      ],
    },
    {
      id: 'wx-chairman', name: 'Chair-Master Vennell', at: [7.5, 27.8], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.80, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#5b6674', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      talk: [
        'Four men to a chair and the fare is by the step, not the mile. That is why nobody rich lives at the bottom and nobody sensible lives at the top.',
        'We change shoulders at the Landing. If we did not, the man in front would be carrying the whole of Wexford by the time we reached the Watch.',
      ],
    },
    {
      id: 'wx-porter', name: 'Porter Dace', at: [12.0, 31.6], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.89, hair: 'wild',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#6b5d37', accent: '#b34a41',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'A barrel to the Head is nine coppers. To the Landing, four. To the Foot, nothing, because that is where the barrel already is.',
        'You never carry a thing all the way up Wexford. You carry it as far as somebody has paid for, you put it down, and it becomes their difficulty.',
      ],
    },
    {
      id: 'wx-warden', name: 'Stair-Warden Ockle', at: [14.0, 4.0], face: 'south', clip: 'work',
      prompt: 'Speak', facePlayer: true,
      look: { build: 'normal', height: 1.69, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#3a2a20', cape: '#5a3230' } },
      talk: [
        'Two hundred and nine. Half the town will tell you eleven. The extra two are the quay, and the quay is a quay.',
        'I sweep downward. Everybody sweeps downward. Whatever is at the bottom of Wexford has been put there by nine generations of us not wanting it.',
      ],
    },
    {
      id: 'wx-mason', name: 'Tread-Mason Hulke', at: [16.0, 12.0], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.75, hair: 'bald',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#95836b', accent: '#a6b0bc',
          legs: '#414954', boots: '#3a2a20', gloves: '#4b382d' } },
      talk: [
        'They wear hollow in the middle, so everyone walks in the hollow, so they wear hollower. I cut them square again eleven at a time and start over at the bottom.',
        'Step one hundred and forty has been recut nine times. There is more of me in that step now than there is of the hill.',
      ],
    },
    {
      id: 'wx-bonesetter', name: 'Bone-Setter Praed', at: [20.0, 15.6], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.70, hair: 'braid', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#2c5a45', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d', gloves: '#95836b' } },
      talk: [
        'Ankles going up, wrists coming down, and heads at the Landing, because the Landing is where people stop looking where they are going.',
        'I have set the same man\'s arm three times, on the same step, always on his way down for the same forgotten thing.',
      ],
    },
    {
      id: 'wx-widow', name: 'Widow Anstruther', at: [11.0, 21.4], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.59, hair: 'long', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#4e326c', accent: '#95836b',
          legs: '#4b382d', boots: '#3a2a20', cape: '#241636' } },
      talk: [
        'I have not been below this riser since the year my husband died, and I do not propose to give the town the satisfaction now.',
        'Everything comes up to me. Bread comes up, water comes up, gossip comes up and arrives improved. Only I go down, eventually, and there is a charge for that as well.',
      ],
    },
    {
      id: 'wx-carter', name: 'Carter Symes', at: [21.0, 30.4], face: 'west', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.71, hair: 'short',
        colors: { skin: '#dbb28c', hair: '#bd8746', torso: '#496035', accent: '#5a3230',
          legs: '#6b5d37', boots: '#4b382d' } },
      talk: [
        'I own the only wheeled thing in Wexford. It lives at the Foot and it has never once been useful above the second riser.',
        'I bought it at Emberlyn and I was extremely pleased with myself for about a week.',
      ],
    },
    {
      id: 'wx-child', name: 'Pipp', at: [15.0, 24.0], face: 'north', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.23, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'Foot to Head is four hundred and one counts. That is mine and nobody has taken it. Head to Foot is nine, and that is nobody, because you have to survive it.',
        'They tell you two at a time going up and one at a time coming down. Everybody says it and everybody does the opposite and everybody falls over.',
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
  fog: ['#241f18', 22, 70],
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

export const INN_WEXFORD = {
  ...ROOM_BASE,
  id: 'inn_wexford',
  name: 'The Half Landing',
  subtitle: 'Wexford',
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
  ], 'inn_wexford'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'wexford', spawn: 'default', prompt: 'Outside' }],

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
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-wx-chest',
      contains: { kind: 'item', id: 'steadyband', count: 1, label: 'a Steady Band' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-wx-board',
      interact: { name: 'The Carrying Book', text: [
        'A ledger open on a lectern, one line to a load. WHAT. HOW HIGH. WHO PAID.',
        'The last four entries all read HALF WAY, WOULD NOT GO FURTHER, LEFT WITH BESSA.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-wx-keeper', name: 'Bessa Lyle', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.64, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 44, name: 'The Half Landing' },
      talk: ['Forty-four. Put a cup down anywhere in this room and it stays where you put it. Try that in any other house in Wexford.'],
    },
    {
      id: 'inn-wx-guest', name: 'Off-Shift Chairman', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'athletic', height: 1.82, hair: 'short',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#7c4939', accent: '#b34a41',
          legs: '#4b382d', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'Twenty-two years on the front poles. My left shoulder is an inch lower than my right and I can tell you which inch pays for this drink.',
        'The trick is not the going up. The trick is the going down with an empty chair and your knees telling you about it.',
      ],
    },
  ],
};

export const SHOP_WEXFORD = {
  ...ROOM_BASE,
  id: 'shop_wexford',
  name: 'The Carrying Trade',
  subtitle: 'Wexford',
  music: 'shop',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_wexford'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'wexford', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.6], rot: -0.3 },
    { kit: 'crate', at: [3.4, 1.8], rot: 0.5 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.6, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.8, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-wx-chest',
      contains: { kind: 'item', id: 'panacea', count: 2, label: '2 Panaceas' } },
  ],

  npcs: [
    {
      id: 'shop-wx-keeper', name: 'Coll Anstey', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.73, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'cinderspine_camp',
      talk: ['I do not deliver. I have never delivered. There are two hundred and nine reasons and you have walked over some of them.'],
    },
  ],
};

export const WEXFORD_INTERIORS = {
  inn_wexford: INN_WEXFORD,
  shop_wexford: SHOP_WEXFORD,
};
