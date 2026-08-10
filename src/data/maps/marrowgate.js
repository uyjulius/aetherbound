/**
 * Marrowgate — a village standing in the corner of a city.
 *
 * Something enormous was here first. Nobody local will name it, and the
 * Imperium surveyors who come every spring write "prior settlement, extent
 * undetermined" and go home.
 *
 * The whole map is the old town: a marble grid of avenues on an exact eight-yard
 * pitch, dead straight, running out under the wall in every direction and
 * stopping at nothing. The blocks between them have gone to grass, and every so
 * often a course of white wall still stands a yard high in the middle of one,
 * squared to the grid to the inch.
 *
 * Marrowgate itself is the dirt. It is a patch in the south-west corner, no
 * more than a fifth of what it is standing on, and its lanes were worn by feet
 * rather than drawn — they cut across the avenues at whatever angle got people
 * to the well fastest. The two big houses are square to the old grid, because
 * they were built on found foundations. Every cottage that was not is crooked.
 *
 * So the storytelling is underfoot the entire time: the player walks marble
 * everywhere and lives on dirt in one corner of it, and the old avenues lead
 * away, beautifully, to absolutely nothing.
 */

const W = 36;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[marrowgate] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** The old grid: grassed-over blocks with marble avenues between them. */
const BLOCK = () => row(R('#', 2), R('.', 4), R('M', 2), R('.', 6), R('M', 2),
  R('.', 6), R('M', 2), R('.', 6), R('M', 2), R('.', 2), R('#', 2));
/** An old avenue, wall to wall, eight yards of marble. */
const AVENUE = () => row(R('#', 2), R('M', 32), R('#', 2));
/** The same, with Marrowgate's dirt eaten out of the western end. */
const MOD_BLOCK = () => row(R('#', 2), R(',', 14), R('.', 6), R('M', 2),
  R('.', 6), R('M', 2), R('.', 2), R('#', 2));
const MOD_AVENUE = () => row(R('#', 2), R(',', 14), R('M', 18), R('#', 2));

const TERRAIN = [
  /*  0 */ row(R('#', 36)),
  /*  1 */ row(R('#', 36)),
  // --- the old town, north quarter ------------------------------------------
  /*  2 */ BLOCK(),
  /*  3 */ BLOCK(),
  /*  4 */ BLOCK(),
  /*  5 */ BLOCK(),
  /*  6 */ AVENUE(),
  /*  7 */ AVENUE(),
  /*  8 */ BLOCK(),
  /*  9 */ BLOCK(),
  /* 10 */ BLOCK(),
  /* 11 */ BLOCK(),
  /* 12 */ BLOCK(),
  /* 13 */ BLOCK(),
  /* 14 */ AVENUE(),
  /* 15 */ AVENUE(),
  // --- Marrowgate, occupying one corner of it -------------------------------
  /* 16 */ MOD_BLOCK(),
  /* 17 */ MOD_BLOCK(),
  /* 18 */ MOD_BLOCK(),
  /* 19 */ MOD_BLOCK(),
  /* 20 */ MOD_BLOCK(),
  /* 21 */ MOD_BLOCK(),
  /* 22 */ MOD_AVENUE(),
  /* 23 */ MOD_AVENUE(),
  /* 24 */ MOD_BLOCK(),
  /* 25 */ MOD_BLOCK(),
  /* 26 */ MOD_BLOCK(),
  /* 27 */ MOD_BLOCK(),
  // --- the present gate, which is a gap in a wall nobody built --------------
  /* 28 */ row(R('#', 7), R(',', 4), R('#', 25)),
  /* 29 */ row(R('#', 7), R(',', 4), R('#', 25)),
];

export const MARROWGATE = {
  id: 'marrowgate',
  name: 'Marrowgate',
  subtitle: 'A Fifth of Something Larger',
  kind: 'town',
  light: 'dawn',
  grade: 'dawn',
  fog: ['#c4bcae', 80, 280],
  tilt: 0.44,
  cameraDistance: 19,
  music: 'memory',
  base: 'marble',
  groundRamp: 'terrain',
  wallHeight: 5.6,
  wallMaterial: 'marble',

  sky: {
    zenith: '#3c5a90', horizon: '#e8c8a4', ground: '#5e5a50',
    sunColor: '#ffd2a0', sunDir: [0.5, 0.24, 0.4], cloud: 0.5,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [8.5, 27], face: 'north' },
    world: { at: [8.5, 27], face: 'north' },
    old_gate: { at: [7.0, 2.5], face: 'south' },
  },

  exits: [
    { at: [7, 29], size: [4, 1], to: 'overworld', spawn: 'marrowgate', prompt: 'The lane out' },
  ],

  props: [
    // --- what is still standing of the old town -------------------------------
    { kit: 'building', at: [17.0, 1.0], w: 10, d: 3, h: 6.4, rise: 4.0,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-oldgate',
      interactRadius: 3.4,
      interact: { name: 'The Standing Gate', text: [
        'Two piers and a lintel, white, unweathered, and walled up to the top with the same rubble as the rest of the boundary.',
        'The road it was built for runs out from under the blocking, straight north, and is visible from here for as far as there is light.',
        'Nothing is carved on it. There is a great deal of room where carving would go.',
      ] } },

    { kit: 'building', at: [10.5, 4.0], w: 8, d: 6, h: 1.4, rise: 0.6,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-f' },
    { kit: 'building', at: [18.5, 4.0], w: 8, d: 6, h: 1.4, rise: 0.6,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-d' },
    { kit: 'building', at: [26.5, 4.0], w: 8, d: 6, h: 1.4, rise: 0.6,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-e' },
    { kit: 'building', at: [10.5, 10.5], w: 8, d: 8, h: 1.4, rise: 0.6,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-a' },
    { kit: 'building', at: [18.5, 10.5], w: 8, d: 8, h: 1.8, rise: 0.8,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-b' },
    { kit: 'building', at: [26.5, 10.5], w: 8, d: 8, h: 1.4, rise: 0.6,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-c' },
    { kit: 'building', at: [18.5, 19.0], w: 8, d: 8, h: 1.4, rise: 0.6,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-g' },
    { kit: 'building', at: [26.5, 19.0], w: 8, d: 8, h: 1.4, rise: 0.6,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-h' },
    { kit: 'building', at: [18.5, 25.5], w: 8, d: 6, h: 1.4, rise: 0.6,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-i' },
    { kit: 'building', at: [26.5, 25.5], w: 8, d: 6, h: 1.4, rise: 0.6,
      style: 'marble', roof: 'flat', windows: false, door: 'south', id: 'mg-old-j' },

    // --- the two square houses, on found foundations ---------------------------
    { kit: 'building', at: [4.5, 18.0], w: 7, d: 6, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'tile', timbered: true, balcony: true, chimney: true,
      door: 'east', id: 'mg-inn', enter: 'inn_marrowgate', enterPrompt: 'The Undercroft',
      sign: { icon: '🛏', text: 'The Undercroft', x: -2.6 } },

    { kit: 'building', at: [12.5, 18.0], w: 7, d: 6, h: 3.6, rise: 2.0,
      style: 'stone', roof: 'slate', awning: true, door: 'west',
      id: 'mg-shop', enter: 'shop_marrowgate', enterPrompt: 'Whatever Comes Up',
      sign: { icon: '🧪', text: 'Whatever Comes Up', x: 2.6 } },

    // --- and the crooked ones, which are all of them ---------------------------
    { kit: 'building', at: [4.0, 21.0], w: 5, d: 3.6, h: 3.2, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, rot: 0.16, door: 'south', id: 'mg-h-a' },
    { kit: 'building', at: [8.5, 21.2], w: 5, d: 3.6, h: 3.2, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, rot: -0.22, door: 'south', id: 'mg-h-b' },
    { kit: 'building', at: [13.0, 21.0], w: 5, d: 3.6, h: 3.2, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, rot: 0.19, door: 'south', id: 'mg-h-c' },
    { kit: 'building', at: [4.2, 25.5], w: 5.5, d: 3.8, h: 3.3, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, rot: -0.14, door: 'north', id: 'mg-h-d' },
    { kit: 'building', at: [11.8, 25.8], w: 5, d: 3.6, h: 3.2, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, rot: 0.21, door: 'north', id: 'mg-h-e' },
    { kit: 'building', at: [15.0, 25.4], w: 5, d: 3.6, h: 3.2, rise: 1.7,
      style: 'wood', roof: 'thatch', rot: -0.18, door: 'north', id: 'mg-h-f' },

    // --- Marrowgate's own furniture, none of it square to anything -------------
    { kit: 'well', at: [7.5, 23.5], id: 'mg-well', radius: 1.2,
      interact: { name: 'The Sunk Well', text: [
        'Dug in the ordinary way, in the ordinary place, and at eleven feet it broke into a stone-lined shaft already going down.',
        'They put a rope in it and stopped counting at ninety. The water is very good.',
      ] } },
    { kit: 'savepoint', at: [11.0, 23.5], id: 'mg-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // Salk's cellar hatch, in the lane the cellar runs back under, with the
    // reliquary's ground-rent note still nailed beside it.
    { kit: 'signpost', at: [7.4, 19.4], id: 'mg-undercroft',
      interact: { prompt: 'The cellar hatch', event: 'marrowgate_undercroft_rent' } },

    { kit: 'signpost', at: [15.0, 16.6], id: 'mg-survey',
      interact: { name: 'Survey Peg', text: [
        'An Imperium peg with a brass plate. MARROWGATE. POP. 340. PRIOR SETTLEMENT, EXTENT UNDETERMINED.',
        'Somebody has scratched under UNDETERMINED: WE COULD TELL YOU. YOU WOULD HAVE TO ASK.',
      ] } },
    { kit: 'signpost', at: [24.6, 22.6], id: 'mg-kerb',
      interact: { name: 'A Kerbstone', text: [
        'The avenue kerb runs true for four hundred yards in both directions and does not deviate by the width of a finger.',
        'Set into it at intervals, a small square hole. There are eleven thousand of them in the town. Nobody knows what stood in them.',
      ] } },

    { kit: 'lamppost', at: [8.0, 6.5] },
    { kit: 'lamppost', at: [26.0, 6.5] },
    { kit: 'lamppost', at: [26.0, 14.5] },
    { kit: 'lamppost', at: [22.5, 4.0] },
    { kit: 'lamppost', at: [22.5, 10.0] },
    { kit: 'lamppost', at: [22.5, 18.0] },
    { kit: 'lamppost', at: [22.5, 26.0] },
    { kit: 'lamppost', at: [30.5, 8.0] },
    { kit: 'lamppost', at: [30.5, 20.0] },
    { kit: 'bench', at: [12.0, 6.6], rot: 0 },
    { kit: 'bench', at: [24.0, 14.6], rot: 0 },

    { kit: 'cart', at: [3.4, 19.6], rot: 0.3 },
    { kit: 'crate', at: [14.6, 23.0], rot: 0.4 },
    { kit: 'crate', at: [15.2, 23.8], rot: -0.25 },
    { kit: 'barrel', at: [14.6, 19.4] },
    { kit: 'barrel', at: [3.2, 23.0] },
    { kit: 'flowerbox', at: [6.0, 20.0] },
    { kit: 'flowerbox', at: [10.4, 27.0] },
    { kit: 'stall', at: [9.0, 19.4], arg: '#8a6a23', rot: 0.22, id: 'mg-stall-1' },
    { kit: 'stall', at: [6.6, 26.4], arg: '#4e326c', rot: -0.3, id: 'mg-stall-2' },

    { kit: 'tree', at: [21.4, 5.4], kind: 'broadleaf', scale: 1.1, seed: 3, id: 'mg-tree-n' },
    { kit: 'tree', at: [21.4, 13.4], kind: 'autumn', scale: 1.05, seed: 7 },
    { kit: 'tree', at: [29.4, 13.4], kind: 'broadleaf', scale: 1.0, seed: 11 },
    { kit: 'tree', at: [29.4, 21.4], kind: 'autumn', scale: 1.1, seed: 13, id: 'mg-tree-se' },
    { kit: 'tree', at: [21.4, 27.0], kind: 'broadleaf', scale: 0.95, seed: 17 },
    { kit: 'bush', at: [17.0, 8.0], scale: 1.05, seed: 19, radius: 0 },
    { kit: 'bush', at: [25.0, 16.4], scale: 1.0, seed: 23, radius: 0 },
    { kit: 'bush', at: [33.0, 5.0], scale: 1.1, seed: 29, radius: 0 },
    { kit: 'bush', at: [33.0, 18.0], scale: 1.0, seed: 31, radius: 0 },

    { kit: 'chest', at: [3.0, 12.0], id: 'mg-chest-1',
      contains: { kind: 'gold', amount: 460, label: '460 gil' } },
    { kit: 'chest', at: [32.6, 24.0], id: 'mg-chest-2',
      contains: { kind: 'item', id: 'sandglass', count: 1, label: 'a Sandglass' } },
    { kit: 'chest', at: [15.0, 4.6], id: 'mg-chest-3',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },
    { kit: 'chest', at: [22.5, 7.5], id: 'mg-chest-4',
      contains: { kind: 'item', id: 'vellumdarts', count: 1, label: 'a set of Vellum Darts' } },
  ],

  /**
   * Marrowgate after. The dirt has gone back to grass in one season and the
   * grid is showing through it, which everyone here privately expected, and
   * nobody says, because saying it would be agreeing with the ground.
   */
  ruin: {
    subtitle: 'The Grid Showing Through',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#86807a', 45, 190],
    music: 'sorrow',
    sky: {
      zenith: '#4a4054', horizon: '#b0907e', ground: '#38342c',
      sunColor: '#ff9d63', sunDir: [-0.34, 0.2, 0.36], cloud: 0.94,
    },
    removeNpcs: ['mg-child', 'mg-scavenger', 'mg-imperium', 'mg-antiquary'],
    removeProps: ['mg-tree-n', 'mg-tree-se'],
    npcs: [
      {
        id: 'mg-ruin-antiquary', name: 'Rhoswen Cale', at: [22.6, 14.0], face: 'north',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'slim', height: 1.66, hair: 'long', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#4e326c', accent: '#ffd76a',
            legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
        talk: [
          'A whole town went under this one and left a grid and eleven thousand square holes. Now we have gone under, and we have left dirt.',
          'In four hundred years somebody will stand here and see only the marble, and they will be right about us.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [21.4, 5.4], kind: 'dead', scale: 1.35, seed: 801 },
      { kit: 'tree', at: [29.4, 21.4], kind: 'dead', scale: 1.2, seed: 803 },
      { kit: 'chest', at: [30.0, 4.6], id: 'mg-ruin-chest',
        contains: { kind: 'item', id: 'oathstone', count: 1, label: 'an Oathstone' } },
    ],
  },

  npcs: [
    {
      id: 'mg-reliquary', name: 'Reliquar Ansence', at: [9.6, 20.7], face: 'north',
      clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.69, hair: 'bald', expression: 'neutral',
        colors: { skin: '#6e4030', hair: '#241d26', torso: '#4e326c', accent: '#ffd76a',
          legs: '#38224f', boots: '#4b382d', cape: '#241636' } },
      shop: 'ninthwell_reliquary',
      talk: [
        'The Ninth Well keeps a reliquary and the reliquary keeps a counter, and the counter is out here because nobody sane goes down there to shop.',
        'Onder sells you whatever came up. I sell you what was put down on purpose. There is a difference and it is most of the price.',
      ],
    },
    {
      id: 'mg-inn', name: 'Perry Salk', at: [6.8, 17.5], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'braid', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#6b5d37', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 40, name: 'The Undercroft' },
      talk: [
        'Forty. The cellar is not mine. It was here. I put a house on top of it and I have been paying to heat somebody else\'s room for thirty years.',
        'It goes back further than the house. I have bricked it at nine yards, because at nine yards I stopped enjoying myself.',
      ],
    },
    {
      id: 'mg-shop', name: 'Onder Quillam', at: [8.8, 16.7], face: 'east', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.74, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#38224f', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943', cape: '#241636' } },
      shop: 'ashenhall_relics',
      talk: [
        'Everything on that shelf came out of a garden in this town, and every one of them was found by somebody digging for onions.',
        'I do not ask where. If I ask where, they stop bringing them, and then somebody has a thousand-year-old ring in a jar on a shelf for ever.',
      ],
    },
    {
      id: 'mg-digger', name: 'Hesk Bellow', at: [15.5, 23.0], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.88, hair: 'wild',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#4b382d' } },
      talk: [
        'Two feet of soil, then a floor. Every garden in Marrowgate. You cannot get a parsnip down and you cannot get a grave down either.',
        'We bury on the blocks where the floor is broken. There are only four such places and everyone knows which four.',
      ],
    },
    {
      id: 'mg-antiquary', name: 'Rhoswen Cale', at: [22.0, 14.0], face: 'north', clip: 'loiter', prompt: 'Speak',
      look: { build: 'slim', height: 1.66, hair: 'long', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#4e326c', accent: '#ffd76a',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      talk: [
        'Stand on the kerb and look north. Now south. It does not bend. Roads bend. Roads always bend, because the men laying them get tired.',
        'Whatever laid this did not get tired. That is the only thing I have established in nine years and I would rather I had not.',
      ],
    },
    {
      id: 'mg-mason', name: 'Mason Torrey', at: [13.0, 10.0], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.78, hair: 'short',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#5a3230', accent: '#a6b0bc',
          legs: '#414954', boots: '#2b2933', gloves: '#bda98b' } },
      talk: [
        'You cannot cut it. Not with iron, not with grit, not with a week. I have taken a chisel to that course there and left a mark you can only find by feel.',
        'So we build with the stone we can cut, next to the stone we cannot, and it looks exactly as good as it sounds.',
      ],
    },
    {
      id: 'mg-elder', name: 'Goodwife Ledger', at: [6.3, 21.8], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.59, hair: 'bob', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#2c5a45', accent: '#95836b',
          legs: '#4b382d', boots: '#3a2a20' } },
      event: 'marrowgate_hand',
      talk: [
        'Three hundred and forty of us. My grandmother said eight hundred. Her grandmother said the same as me, which we have all decided is a coincidence.',
        'A town this size does not need a gate as big as that one. So we did not build that one, and we have never built a smaller one, and we go out through a gap.',
      ],
    },
    {
      id: 'mg-imperium', name: 'Surveyor Anselm', at: [22.5, 10.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.72, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'I am to establish the extent. I have walked out four thousand yards north and the kerb is still under the turf and I have run out of chain.',
        'My report will say "extent undetermined". It said that last year. It is the most honest thing the Imperium publishes.',
      ],
    },
    {
      id: 'mg-scavenger', name: 'Fen Culliss', at: [30.0, 22.0], face: 'west', clip: 'idle', prompt: 'Speak',
      look: { build: 'slim', height: 1.70, hair: 'ponytail',
        colors: { skin: '#dbb28c', hair: '#6d4020', torso: '#496035', accent: '#3fc6d6',
          legs: '#4b382d', boots: '#3a2a20' } },
      event: 'marrowgate_eight_yards',
      talk: [
        'Out on the far blocks after rain. Rain washes the turf thin and things sit up out of it, and by afternoon they have gone back down.',
        'You have to know the pitch. Eight yards, always eight. Walk the pitch and you cover a block properly. Walk anyhow and you cover a quarter of it and think you have done.',
      ],
    },
    {
      id: 'mg-child', name: 'Wick', at: [7.0, 25.5], face: 'north', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.23, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'We play kerb-to-kerb. You may only step on the white. If you can get from the gate to the far wall without touching green you win, and nobody ever wins.',
        'Except at the north end. At the north end the white goes everywhere and the game stops being fun.',
      ],
    },
    {
      id: 'mg-watch', name: 'Night-Watch Praed', at: [14.5, 2.5], face: 'north', clip: 'loiter', prompt: 'Speak',
      look: { build: 'athletic', height: 1.76, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#33477c', accent: '#a6b0bc',
          legs: '#414954', boots: '#3b3943', cape: '#12566b' } },
      event: 'eleven_avenue',
      talk: [
        'I walk the avenues at night and I have never in eleven years met anybody on them, and I still walk in the middle.',
        'The marble holds the day\'s warmth until about the third hour. After that it is colder than the grass. You learn where to stand.',
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

export const INN_MARROWGATE = {
  ...ROOM_BASE,
  id: 'inn_marrowgate',
  name: 'The Undercroft',
  subtitle: 'Marrowgate',
  base: 'marble',
  wallMaterial: 'marble',
  music: 'festival',
  terrain: makeRoom(18, [
    '##################',
    '#MMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMM#',
    '#MMMMMMMMMMMMMMMM#',
    '########oo########',
  ], 'inn_marrowgate'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'marrowgate', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [4.5, 3.0], rot: 0 },
    { kit: 'bench', at: [4.5, 4.8], rot: 0 },
    { kit: 'bench', at: [12.5, 3.0], rot: 0 },
    { kit: 'bench', at: [12.5, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.8, 2.4] },
    { kit: 'crate', at: [15.2, 1.7], rot: 0.3 },
    { kit: 'lamppost', at: [6.0, 1.6] },
    { kit: 'lamppost', at: [11.5, 1.6] },
    { kit: 'flowerbox', at: [8.6, 5.4] },
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-mg-chest',
      contains: { kind: 'item', id: 'pilgrimsknot', count: 1, label: "a Pilgrim's Knot" } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-mg-board',
      interact: { name: 'The Bricked Arch', text: [
        'The far wall of the taproom is not a wall. It is an arch, filled in with local brick, and the brick stops eight inches short at the crown.',
        'Somebody keeps a candle on the ledge that gap makes. Nobody at the bar will say whose turn it is to light it.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-mg-keeper', name: 'Perry Salk', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'braid', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#6b5d37', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 40, name: 'The Undercroft' },
      talk: ['Forty. Floor is theirs, walls are mine, roof is mine and leaks. Draw your own conclusions about who built better.'],
    },
    {
      id: 'inn-mg-guest', name: 'Chain-Bearer', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.71, hair: 'short',
        colors: { skin: '#ac744c', hair: '#bd8746', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'I carry the far end of the surveyor\'s chain. Sixty-six feet at a time, and every sixty-six feet there is another kerb exactly where he says there will be.',
        'He finds that satisfying. I have started finding it otherwise.',
      ],
    },
  ],
};

export const SHOP_MARROWGATE = {
  ...ROOM_BASE,
  id: 'shop_marrowgate',
  name: 'Whatever Comes Up',
  subtitle: 'Marrowgate',
  music: 'memory',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_marrowgate'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'marrowgate', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.5, 2.6], rot: -0.3 },
    { kit: 'crate', at: [3.3, 1.8], rot: 0.45 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.7, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-mg-chest',
      contains: { kind: 'item', id: 'keeneyecharm', count: 1, label: 'a Keen-Eye Charm' } },
  ],

  npcs: [
    {
      id: 'shop-mg-keeper', name: 'Onder Quillam', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.74, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#38224f', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943', cape: '#241636' } },
      shop: 'ashenhall_relics',
      talk: ['Anything with a square hole in it, I will buy without haggling and I will not tell you why, and you should not press me on it.'],
    },
  ],
};

export const MARROWGATE_INTERIORS = {
  inn_marrowgate: INN_MARROWGATE,
  shop_marrowgate: SHOP_MARROWGATE,
};
