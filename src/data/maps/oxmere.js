/**
 * Oxmere — the town that is a road.
 *
 * Twelve thousand head come down the drove every autumn, and a beast that has
 * walked eleven days does not turn corners. So Oxmere never grew a square, a
 * green, a back lane or a single junction. It is one road from gate to gate,
 * and every building in it is a wall of that road.
 *
 * The plan says the rest. The road is enormous at both ends — the standings,
 * where herds are held and counted, and where a wagon can be turned — and it
 * closes to a throat in the middle, because the burgesses discovered four
 * centuries ago that a beast in a narrow place walks slowly, and a drover
 * beside a slow beast will buy things. Every shop in Oxmere is in the pinch.
 * Every house is not. The player walks the whole economy end to end and cannot
 * take a wrong turning, because there is no turning to take.
 */

const W = 22;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[oxmere] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 22)),
  /*  1 */ row(R('#', 22)),
  // --- the north gate ------------------------------------------------------
  /*  2 */ row(R('#', 8), R('=', 6), R('#', 8)),
  /*  3 */ row(R('#', 8), R('=', 6), R('#', 8)),
  // --- the upper standing: where the herds are held and counted ------------
  /*  4 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /*  5 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /*  6 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /*  7 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /*  8 */ row(R('#', 3), R(',', 16), R('#', 3)),
  // --- the road closing ----------------------------------------------------
  /*  9 */ row(R('#', 4), R(',', 14), R('#', 4)),
  /* 10 */ row(R('#', 4), R(',', 14), R('#', 4)),
  /* 11 */ row(R('#', 4), R(',', 14), R('#', 4)),
  /* 12 */ row(R('#', 5), R(',', 12), R('#', 5)),
  /* 13 */ row(R('#', 5), R(',', 12), R('#', 5)),
  /* 14 */ row(R('#', 6), R(',', 10), R('#', 6)),
  /* 15 */ row(R('#', 6), R(',', 3), R('=', 4), R(',', 3), R('#', 6)),
  // --- the pinch: the only paved ground, and every shop in the town --------
  /* 16 */ row(R('#', 7), R(',', 1), R('=', 6), R(',', 1), R('#', 7)),
  /* 17 */ row(R('#', 7), R(',', 1), R('=', 6), R(',', 1), R('#', 7)),
  /* 18 */ row(R('#', 7), R(',', 1), R('=', 6), R(',', 1), R('#', 7)),
  /* 19 */ row(R('#', 7), R(',', 1), R('=', 6), R(',', 1), R('#', 7)),
  /* 20 */ row(R('#', 7), R(',', 1), R('=', 6), R(',', 1), R('#', 7)),
  /* 21 */ row(R('#', 6), R(',', 3), R('=', 4), R(',', 3), R('#', 6)),
  // --- the road opening again ----------------------------------------------
  /* 22 */ row(R('#', 6), R(',', 10), R('#', 6)),
  /* 23 */ row(R('#', 5), R(',', 12), R('#', 5)),
  /* 24 */ row(R('#', 5), R(',', 12), R('#', 5)),
  /* 25 */ row(R('#', 4), R(',', 14), R('#', 4)),
  /* 26 */ row(R('#', 4), R(',', 14), R('#', 4)),
  // --- the lower standing --------------------------------------------------
  /* 27 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /* 28 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /* 29 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /* 30 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /* 31 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /* 32 */ row(R('#', 3), R(',', 16), R('#', 3)),
  /* 33 */ row(R('#', 3), R(',', 16), R('#', 3)),
  // --- the south gate ------------------------------------------------------
  /* 34 */ row(R('#', 8), R('=', 6), R('#', 8)),
  /* 35 */ row(R('#', 8), R('=', 6), R('#', 8)),
];

export const OXMERE = {
  id: 'oxmere',
  name: 'Oxmere',
  subtitle: 'One Road, Both Ends',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#c4b896', 95, 300],
  tilt: 0.44,
  cameraDistance: 17,
  music: 'town_harrowmere',
  base: 'dirt',
  groundRamp: 'terrain',
  wallHeight: 4.4,
  wallMaterial: 'plaster',

  sky: {
    zenith: '#3d72a4', horizon: '#dcc79e', ground: '#6d6048',
    sunColor: '#ffe4b0', sunDir: [0.4, 0.6, 0.42], cloud: 0.5,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [10.5, 33], face: 'north' },
    world: { at: [10.5, 33], face: 'north' },
    world_north: { at: [10.5, 4], face: 'south' },
    inn: { at: [9.9, 17.6], face: 'west' },
  },

  exits: [
    { at: [8, 35], size: [6, 1], to: 'overworld', spawn: 'oxmere', prompt: 'The lower drove' },
    { at: [8, 2], size: [6, 1], to: 'overworld', spawn: 'oxmere_north', prompt: 'The upper drove' },
  ],

  props: [
    // --- the north gate ------------------------------------------------------
    { kit: 'lamppost', at: [8.4, 2.6] },
    { kit: 'lamppost', at: [13.6, 2.6] },
    { kit: 'signpost', at: [12.6, 3.4], id: 'ox-gatepost',
      interact: { name: 'The Count Post', text: [
        'A slate on a post, ruled into columns: HEAD IN. HEAD OUT. HEAD LOST.',
        'Today reads 1,140 / 1,138 / 2. The 2 has been circled by somebody with strong feelings about it.',
      ] } },

    // --- the upper standing ---------------------------------------------------
    { kit: 'building', at: [6.2, 6.0], w: 6, d: 4.4, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'east', id: 'ox-byre-a' },
    { kit: 'building', at: [15.8, 6.0], w: 6, d: 4.4, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'west', rot: -0.05, id: 'ox-byre-b' },
    { kit: 'fence', at: [7.0, 8.2], arg: 8, radius: 0 },
    { kit: 'fence', at: [15.0, 8.2], arg: 8, radius: 0 },
    { kit: 'fence', at: [7.0, 4.6], arg: 6, radius: 0 },
    { kit: 'fence', at: [15.0, 4.6], arg: 6, radius: 0 },
    { kit: 'cart', at: [4.6, 8.4], rot: 0.3 },
    { kit: 'cart', at: [17.4, 8.4], rot: -0.2 },
    { kit: 'barrel', at: [4.2, 4.8] },
    { kit: 'barrel', at: [17.8, 4.8] },
    { kit: 'tree', at: [3.8, 7.4], kind: 'broadleaf', scale: 1.05, seed: 3, id: 'ox-tree-upper' },
    { kit: 'tree', at: [18.2, 7.4], kind: 'autumn', scale: 1.0, seed: 7 },
    { kit: 'chest', at: [3.9, 5.2], id: 'ox-chest-1',
      contains: { kind: 'gold', amount: 380, label: '380 gil' } },

    // --- the road closing -----------------------------------------------------
    { kit: 'building', at: [6.0, 10.0], w: 5, d: 3.6, h: 3.3, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'east', id: 'ox-house-a' },
    { kit: 'building', at: [16.0, 10.0], w: 5, d: 3.6, h: 3.3, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'west', rot: 0.06, id: 'ox-house-b' },
    { kit: 'building', at: [7.0, 12.9], w: 5, d: 3.4, h: 3.6, rise: 1.7,
      style: 'stone', roof: 'slate', chimney: true, door: 'east', id: 'ox-farriery',
      sign: { icon: '⚒', text: 'Dunnock, Shoeing', x: -2.2 } },
    { kit: 'building', at: [15.0, 12.9], w: 4.6, d: 3.4, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'slate', door: 'west', id: 'ox-hurdleyard',
      sign: { icon: '⚖', text: 'Hurdles & Withies', x: 2.0 } },
    { kit: 'barrel', at: [5.0, 11.4] },
    { kit: 'crate', at: [16.9, 11.5], rot: 0.4 },

    // --- the pinch ------------------------------------------------------------
    { kit: 'well', at: [10.5, 14.5], id: 'ox-trough', radius: 1.2,
      interact: { name: 'The Head Trough', text: [
        'Not a well for people. The lip is worn low on all four sides and the water is never once still.',
        'A brass plate: FILLED BY THE TOWN. FOULED BY YOU. FINE OF SIX GIL.',
      ] } },
    { kit: 'lamppost', at: [8.2, 15.4] },
    { kit: 'lamppost', at: [13.8, 15.4] },
    { kit: 'lamppost', at: [8.2, 21.4] },
    { kit: 'lamppost', at: [13.8, 21.4] },

    { kit: 'building', at: [7.4, 18.0], w: 7, d: 6.4, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'tile', timbered: true, balcony: true, chimney: true,
      door: 'east', id: 'ox-inn', enter: 'inn_oxmere', enterPrompt: 'Rest & Be Thankful',
      sign: { icon: '🛏', text: 'Rest & Be Thankful', x: -2.6 } },

    { kit: 'building', at: [13.6, 18.0], w: 7, d: 6.4, h: 3.6, storeys: 2, rise: 2.0,
      style: 'plaster', roof: 'tile', awning: true, door: 'west',
      id: 'ox-store', enter: 'shop_oxmere', enterPrompt: 'Hoof & Hurdle',
      sign: { icon: '🧪', text: 'Hoof & Hurdle', x: 2.6 } },

    { kit: 'stall', at: [7.0, 15.2], arg: '#8a6a23', id: 'ox-stall-1' },
    { kit: 'stall', at: [15.0, 15.2], arg: '#2c5a45', id: 'ox-stall-2' },
    { kit: 'stall', at: [7.0, 21.2], arg: '#8b2a2c', id: 'ox-stall-3' },
    { kit: 'stall', at: [15.0, 21.2], arg: '#33477c', id: 'ox-stall-4' },
    { kit: 'flowerbox', at: [10.0, 15.6] },
    { kit: 'chest', at: [10.5, 22.4], id: 'ox-chest-3',
      contains: { kind: 'item', id: 'sprinter', count: 1, label: 'a pair of Sprinters' } },

    // --- the road opening again -----------------------------------------------
    { kit: 'building', at: [7.4, 23.4], w: 5, d: 3.4, h: 3.3, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'east', id: 'ox-house-c' },
    { kit: 'building', at: [14.6, 23.4], w: 5, d: 3.4, h: 3.3, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'west', rot: -0.07, id: 'ox-house-d' },
    { kit: 'building', at: [6.2, 26.1], w: 5, d: 3.6, h: 3.4, rise: 1.7,
      style: 'plaster', roof: 'thatch', door: 'east', id: 'ox-house-e' },
    { kit: 'building', at: [15.8, 26.1], w: 5, d: 3.6, h: 3.4, rise: 1.7,
      style: 'plaster', roof: 'thatch', door: 'west', id: 'ox-house-f' },
    { kit: 'bench', at: [12.4, 22.6], rot: 0 },
    { kit: 'bench', at: [8.6, 25.0], rot: Math.PI },

    // --- the lower standing ----------------------------------------------------
    { kit: 'building', at: [5.4, 29.0], w: 6, d: 4.4, h: 3.7, rise: 1.7,
      style: 'stone', roof: 'slate', door: 'east', id: 'ox-weighhouse',
      sign: { icon: '⚖', text: 'The Weighing Shed', x: -2.2 } },
    { kit: 'building', at: [16.6, 29.0], w: 6, d: 4.4, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'west', id: 'ox-byre-c' },
    { kit: 'fence', at: [7.0, 31.4], arg: 8, radius: 0 },
    { kit: 'fence', at: [15.0, 31.4], arg: 8, radius: 0 },
    { kit: 'fence', at: [7.0, 32.8], arg: 8, radius: 0 },
    { kit: 'fence', at: [15.0, 32.8], arg: 8, radius: 0 },
    { kit: 'cart', at: [4.4, 30.6], rot: 1.5 },
    { kit: 'cart', at: [4.6, 32.4], rot: 0.2 },
    { kit: 'barrel', at: [17.6, 32.2] },
    { kit: 'crate', at: [17.4, 31.2], rot: 0.35 },
    { kit: 'tree', at: [3.8, 28.2], kind: 'autumn', scale: 1.1, seed: 11 },
    { kit: 'tree', at: [18.2, 27.4], kind: 'broadleaf', scale: 1.0, seed: 13, id: 'ox-tree-lower' },
    { kit: 'bush', at: [4.0, 33.4], scale: 1.0, seed: 17, radius: 0 },
    { kit: 'bush', at: [18.0, 33.4], scale: 1.05, seed: 19, radius: 0 },

    // The weighing shed's beam, on the yard side of the weighhouse where the
    // queue comes off the platform. Ivy sends you here to watch the arm.
    { kit: 'signpost', at: [7.4, 28.6], id: 'ox-weighbeam',
      interact: { prompt: 'The weighing beam', event: 'oxmere_weighing_beam' } },

    { kit: 'savepoint', at: [10.5, 32.0], id: 'ox-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [13.2, 33.4], id: 'ox-roadsign',
      interact: { name: 'The Mile Board', text: [
        'SOUTH — nine days to the fairs, if the grass holds. Eleven if it does not.',
        'NORTH — six days back to nothing you would want.',
        'Below, cut deep and old: DO NOT SLEEP IN THE ROAD. THE ROAD IS WHERE THEY COME.',
      ] } },
    { kit: 'chest', at: [18.1, 30.6], id: 'ox-chest-2',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },
  ],

  /**
   * Oxmere after. The road is still a road. Nothing walks it. The hurdles are
   * up, the trough is filled, and the standings are swept every morning by
   * people who will not say who for.
   */
  ruin: {
    subtitle: 'Nothing Coming Down',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#8d7c5e', 55, 195],
    music: 'memory',
    sky: {
      zenith: '#5f4738', horizon: '#c6a082', ground: '#3c342a',
      sunColor: '#ff9d63', sunDir: [-0.34, 0.22, 0.38], cloud: 0.9,
    },
    removeNpcs: ['ox-boy', 'ox-drift', 'ox-chalker', 'ox-warden'],
    removeProps: ['ox-tree-upper', 'ox-tree-lower'],
    npcs: [
      {
        id: 'ox-ruin-warden', name: 'Roadwarden Cuffe', at: [10.6, 2.8], face: 'south',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'athletic', height: 1.79, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#496035', accent: '#8a6a23',
            legs: '#5e412c', boots: '#3a2a20', cape: '#5a3230' } },
        talk: [
          'I open the gate at first light and shut it at dark. There is nothing on either side of it.',
          'A gate that is not opened stops being a gate. I am not having that.',
        ],
      },
      {
        // `eleven_drove` is the drift-master's account and only says anything
        // after the change, but the base `ox-drift` is struck off in the ruin.
        // He gets a replacement standing a tile over from where he used to.
        id: 'ox-ruin-drift', name: 'Drift-Master Sallow', at: [5.6, 8.0], face: 'east',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'hulking', height: 1.88, hair: 'wild', expression: 'sad',
          colors: { skin: '#96603f', hair: '#342a37', torso: '#6b5d37', accent: '#7c4939',
            legs: '#5e412c', boots: '#3a2a20', gloves: '#4b382d' } },
        event: 'eleven_drove',
        talk: [
          'No drove since the spring. I stand where I stood and I count what is in front of me, which is nothing, twice a day.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [3.8, 7.4], kind: 'dead', scale: 1.3, seed: 401 },
      { kit: 'tree', at: [18.2, 27.4], kind: 'dead', scale: 1.2, seed: 403 },
      { kit: 'chest', at: [10.5, 5.0], id: 'ox-ruin-chest',
        contains: { kind: 'item', id: 'wanderersbell', count: 1, label: "a Wanderer's Bell" } },
    ],
  },

  npcs: [
    {
      id: 'ox-hedge', name: 'Hedgewife Corrance', at: [6.9, 15.5], face: 'east',
      clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.61, hair: 'braid', expression: 'happy',
        colors: { skin: '#dbb28c', hair: '#6d4020', torso: '#496035', accent: '#ffd76a',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#4b382d' } },
      shop: 'weepingwood_hedge',
      talk: [
        'Down out of the Weeping Wood twice a year, and both times to a fair, because a wood has no money in it and a fair is nothing but.',
        'Everything on the trestle grew within a mile of a place I will not take you to. The hood keeps the wet off. The rest keeps the wood off.',
      ],
    },
    {
      id: 'ox-apiary', name: 'Broodacre Keeper Mell', at: [6.6, 21.6], face: 'east',
      clip: 'work', prompt: 'Trade',
      look: { build: 'normal', height: 1.70, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#bd8746', torso: '#ab8018', accent: '#ddccab',
          legs: '#6b5d37', boots: '#4b382d', gloves: '#95836b' } },
      shop: 'broodacre_apiary',
      talk: [
        'It was an apiary. There are no bees in it now and there is a great deal else, and the hives were the right shape for what I fill them with instead.',
        'Everything here goes off in a spread. You will understand why the first time something comes at you four abreast.',
      ],
    },
    {
      id: 'ox-inn', name: 'Neave Tarrant', at: [9.4, 19.4], face: 'east', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 40, name: 'Rest & Be Thankful' },
      talk: [
        'Forty. You get a bed, a bowl, and the noise. I cannot sell you the quiet, we have not got any.',
        'My grandmother named the house. She meant it about the road. Everyone since has meant it about her.',
      ],
    },
    {
      id: 'ox-store', name: 'Bly Ossick', at: [10.7, 16.0], face: 'west', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.72, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'solmere_items',
      talk: [
        'I could have my shop anywhere in this town. I have it here, in the throat, where a man is standing still whether he likes it or not.',
        'That is not cunning. Everyone worked it out. That is why the rent here is four times the gate.',
      ],
    },
    {
      id: 'ox-warden', name: 'Roadwarden Cuffe', at: [10.0, 2.8], face: 'south', clip: 'work',
      prompt: 'Speak', facePlayer: true,
      look: { build: 'athletic', height: 1.79, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#496035', accent: '#8a6a23',
          legs: '#5e412c', boots: '#3a2a20', cape: '#5a3230' } },
      event: 'oxmere_two_head',
      talk: [
        'You are on foot, which makes you traffic, not trade. Keep to the left of the road and you and I will never speak again.',
        'Two head short on the morning count. Not strayed — a strayed beast comes back at supper. These did not come back at supper.',
      ],
    },
    {
      id: 'ox-drift', name: 'Drift-Master Sallow', at: [5.0, 8.0], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.88, hair: 'wild',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#6b5d37', accent: '#7c4939',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#4b382d' } },
      event: 'eleven_drove',
      talk: [
        'Eleven hundred head, and every one of them thinks it invented walking. You do not drive a drove. You suggest.',
        'Take the throat slowly. A beast that panics in there does not stop until the south gate, and it takes the front of two shops with it.',
      ],
    },
    {
      // In the town since Tuesday, paying for his own drink outside the inn.
      // He stamps every beam between here and the coast twice a year, and it
      // is September.
      id: 'ox-sealer', name: 'Sealer Dacomb', at: [10.6, 19.4], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'normal', height: 1.73, hair: 'short', eyeStyle: 'sharp', expression: 'neutral',
        colors: { skin: '#dbb28c', hair: '#5e5163', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      event: 'oxmere_sealer_of_weights',
      talk: [
        'Four hundred beams a year between here and the coast, and every one of them wants a look, a stamp and a line in the book.',
      ],
    },
    {
      id: 'ox-farrier', name: 'Farrier Dunnock', at: [9.0, 12.5], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.74, hair: 'bald',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#5a3230', accent: '#a6b0bc',
          legs: '#414954', boots: '#2b2933', gloves: '#4b382d' } },
      talk: [
        'Cattle shoes. Two little half-moons a hoof, and they wear through in nine days, which is the length of the drove, which is not a coincidence.',
        'I have shod for thirty-one autumns and I have never in my life seen the animal at the other end of the road.',
      ],
    },
    {
      id: 'ox-hurdler', name: 'Old Pettigrew', at: [12.0, 12.5], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.60, hair: 'short', eyeStyle: 'closed', expression: 'neutral',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#95836b', accent: '#496035',
          legs: '#6b5d37', boots: '#4b382d' } },
      event: 'oxmere_last_hurdler',
      talk: [
        'A hurdle is six foot of hazel and an argument with a cow. I make eleven a week and the town buys nine.',
        'They ask me why not ten, to be tidy. Because two get broken, and one gets stolen, and that is the year.',
      ],
    },
    {
      id: 'ox-chalker', name: 'Chalker Ivy', at: [7.0, 30.0], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.63, hair: 'braid',
        colors: { skin: '#e7c39c', hair: '#bd8746', torso: '#2c5a45', accent: '#ffd76a',
          legs: '#414954', boots: '#3a2a20' } },
      event: 'oxmere_chalk_bar',
      talk: [
        'Blue on the shoulder for Ferran, red for the fairs, and a bar across for anything the drover would rather I did not ask about.',
        'I have chalked two hundred thousand animals and not one of them has thanked me. I have made peace with it.',
      ],
    },
    {
      id: 'ox-widow', name: 'Widow Marle', at: [13.0, 28.5], face: 'west', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.65, hair: 'long', expression: 'sad',
        colors: { skin: '#c08865', hair: '#dedbe0', torso: '#38224f', accent: '#8b2a2c',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      // She is sat within sight of the mile board, which is the thing the
      // scene opens on; Pettigrew's half of it is inside the event.
      event: 'oxmere_road_warning',
      talk: [
        'My husband walked this road forty years and died in a bed. He was extremely annoyed about it.',
        'Everybody in Oxmere is between two places. I am the only one who has stopped, and it is not restful.',
      ],
    },
    {
      id: 'ox-boy', name: 'Sprat', at: [10.0, 23.0], face: 'north', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.24, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'I run the gap. When the herd is coming and the throat is full, someone has to get a message from the top of the town to the bottom, and it cannot be a cow.',
        'Fastest was a hundred and four counts. Nobody has beaten it. Nobody else is small enough to try.',
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

export const INN_OXMERE = {
  ...ROOM_BASE,
  id: 'inn_oxmere',
  name: 'Rest & Be Thankful',
  subtitle: 'Oxmere',
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
  ], 'inn_oxmere'),

  spawns: { default: { at: [9, 6], face: 'north' } },
  exits: [{ at: [9, 7], size: [2, 1], to: 'oxmere', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [5.0, 3.0], rot: 0 },
    { kit: 'bench', at: [5.0, 4.8], rot: 0 },
    { kit: 'bench', at: [14.0, 3.0], rot: 0 },
    { kit: 'bench', at: [14.0, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.8, 2.4] },
    { kit: 'barrel', at: [3.4, 1.6] },
    { kit: 'crate', at: [17.2, 1.7], rot: 0.3 },
    { kit: 'crate', at: [17.0, 2.8], rot: -0.25 },
    { kit: 'lamppost', at: [6.5, 1.6] },
    { kit: 'lamppost', at: [13.0, 1.6] },
    { kit: 'flowerbox', at: [9.6, 5.4] },
    { kit: 'chest', at: [17.4, 5.4], id: 'inn-ox-chest',
      contains: { kind: 'item', id: 'roadcoat', count: 1, label: 'a Road Coat' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-ox-board',
      interact: { name: 'The Drove Board', text: [
        'WANTED: two drovers and a dog. The dog is the urgent one.',
        'LOST between the throat and the lower standing: one grey bullock, one temper, one wife.',
        'Somebody has written underneath: FOUND THE BULLOCK.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-ox-keeper', name: 'Neave Tarrant', at: [9.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 40, name: 'Rest & Be Thankful' },
      talk: ['Forty. The herd goes past the window at four and you will be awake for it whether you paid for that or not.'],
    },
    {
      id: 'inn-ox-guest', name: 'Fair Buyer', at: [3.6, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.73, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#5e5163', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#414954', boots: '#3a2a20', cape: '#38224f' } },
      talk: [
        'I buy beasts I never see, from men I never meet, on the word of a chalk mark. It has gone wrong twice in twenty years.',
        'Both times it was the same man and both times he apologised beautifully.',
      ],
    },
  ],
};

export const SHOP_OXMERE = {
  ...ROOM_BASE,
  id: 'shop_oxmere',
  name: 'Hoof & Hurdle',
  subtitle: 'Oxmere',
  music: 'town_harrowmere',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_oxmere'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'oxmere', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.5, 2.6], rot: -0.3 },
    { kit: 'crate', at: [3.3, 1.8], rot: 0.5 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.7, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.6, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-ox-chest',
      contains: { kind: 'item', id: 'panacea', count: 2, label: '2 Panaceas' } },
  ],

  npcs: [
    {
      id: 'shop-ox-keeper', name: 'Bly Ossick', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.72, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#33477c', accent: '#3fc6d6',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'solmere_items',
      talk: ['Mind the doorway. Twice a year something with horns decides it would like to come in and look at the tonics.'],
    },
  ],
};

export const OXMERE_INTERIORS = {
  inn_oxmere: INN_OXMERE,
  shop_oxmere: SHOP_OXMERE,
};
