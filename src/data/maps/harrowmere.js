/**
 * Harrowmere — the opening village, on the Silt Road below the Ferran border.
 *
 * Laid out by hand. The shape is deliberate: a ring road around a central
 * plaza so the player always has a legible loop, one river cutting the south
 * with a single bridge so the exit is impossible to miss, and every shop on
 * the ring where it can be seen from the square.
 */

/**
 * Scripted zones. Held in a const because the ruined village adds one of its
 * own, and `resolveMap` replaces the trigger list wholesale rather than merging
 * it — so the ruin override has to restate these rather than lose them.
 *
 *   - the mill wheel is on the bank beside the mill, where Tolliver sends you
 *     back to once Halloran has poured the bearing
 *   - the elder's garden is behind the north side of the square, which is the
 *     one place Watchman Ivo's rota points at
 */
const HARROWMERE_TRIGGERS = [
  { at: [6, 18], size: [3, 1], kind: 'event', event: 'millwheel_turns' },
  { at: [15, 1], size: [4, 2], kind: 'event', event: 'surveyor_answer' },
];

export const HARROWMERE = {
  id: 'harrowmere',
  name: 'Harrowmere',
  subtitle: 'Village on the Silt Road',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#a8bcc0', 90, 280],
  tilt: 0.42,
  music: 'town_harrowmere',
  base: 'grass',
  groundRamp: 'terrain',
  wallHeight: 3.1,
  waterLevel: -0.22,
  water: { shallow: '#3a7f8c', deep: '#1a3c48', foam: '#9ccdd4' },

  sky: {
    zenith: '#2f6494', horizon: '#a6bcb8', ground: '#565448',
    sunColor: '#ffdda0', sunDir: [0.5, 0.55, 0.4], cloud: 0.68,
  },

  //                1111111111222222222233333
  //      01234567890123456789012345678901234
  terrain: [
    '##################################', //  0
    '#................................#', //  1
    '#................................#', //  2
    '#....,,,,,,,,,,,,,,,,,,,,,,,,....#', //  3
    '#....,======================,....#', //  4
    '#....,=....................=,....#', //  5
    '#....,=....................=,....#', //  6
    '#....,=.....==========.....=,....#', //  7
    '#....,=.....==========.....=,....#', //  8
    '#....,=.....==========.....=,....#', //  9
    '#....,=.....==========.....=,....#', // 10
    '#....,=....................=,....#', // 11
    '#....,=....................=,....#', // 12
    '#....,======================,....#', // 13
    '#....,,,,,,,,,,,,,,,,,,,,,,,,....#', // 14
    '#................................#', // 15
    '#..~~~~~~~~~~~~~~::~~~~~~~~~~~~..#', // 16
    '#..~~~~~~~~~~~~~~::~~~~~~~~~~~~..#', // 17
    '#................::..............#', // 18
    '#................,,..............#', // 19
    '#................,,..............#', // 20
    '#................,,..............#', // 21
    '#################,,###############', // 22
  ],

  spawns: {
    default: { at: [17, 20], face: 'north' },
    world: { at: [17, 21], face: 'north' },
    inn: { at: [10, 8], face: 'south' },
  },

  exits: [
    { at: [17, 22], size: [2, 1], to: 'overworld', spawn: 'harrowmere', prompt: 'Leave Harrowmere' },
  ],

  triggers: HARROWMERE_TRIGGERS,

  props: [
    // --- the square -------------------------------------------------------
    { kit: 'well', at: [16.5, 8.5], id: 'well',
      interact: { name: 'Village Well', text: [
        'The water is cold and tastes faintly of iron.',
        'Someone has scratched a tally into the stone rim — forty-one marks, then nothing.',
      ] } },

    // The rim itself, on the side people do not put their hands. Forty-one
    // marks, and the woman who cut them is still in the village.
    { kit: 'signpost', at: [15.4, 8.5], id: 'hm-wellrim',
      interact: { prompt: 'The marks on the rim', event: 'harrowmere_tally' } },
    { kit: 'lamppost', at: [12.5, 6.5] },
    { kit: 'lamppost', at: [21.5, 6.5] },
    { kit: 'lamppost', at: [12.5, 11.5] },
    { kit: 'lamppost', at: [21.5, 11.5] },

    { kit: 'stall', at: [13.5, 12.6], rot: 0, arg: '#8b2a2c', id: 'stall-cloth' },
    { kit: 'stall', at: [20.5, 12.6], rot: 0, arg: '#2c5a45', id: 'stall-fruit' },
    { kit: 'bench', at: [14.6, 5.6], rot: Math.PI },
    { kit: 'bench', at: [19.4, 5.6], rot: Math.PI },
    { kit: 'cart', at: [24.5, 9.5], rot: 0.4 },
    { kit: 'barrel', at: [25.4, 8.4] },
    { kit: 'barrel', at: [25.9, 9.1] },
    { kit: 'crate', at: [25.2, 10.3], rot: 0.3 },

    // --- north side: inn and the elder's house ---------------------------
    { kit: 'building', at: [10, 5.2], w: 8, d: 4.6, h: 3.5, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'gable', timbered: true, chimney: true, balcony: true,
      door: 'south', id: 'inn', enter: 'inn_harrowmere', enterPrompt: 'The Kettle & Cinder', sign: { icon: '🛏', text: 'The Kettle & Cinder' } },

    { kit: 'building', at: [22.5, 5.2], w: 7, d: 4.6, h: 3.6, storeys: 1, rise: 1.9,
      style: 'plaster', roof: 'gable', timbered: true, chimney: true, awning: true,
      door: 'south', id: 'itemshop', enter: 'shop_harrowmere', enterPrompt: 'Marrow & Salt', sign: { icon: '🧪', text: 'Marrow & Salt' } },

    // --- south side: smith and homes -------------------------------------
    { kit: 'building', at: [10, 12.0], w: 7, d: 4.4, h: 3.8, rise: 1.8,
      style: 'stone', roof: 'slate', chimney: true, door: 'north',
      id: 'smith', enter: 'forge_harrowmere', enterPrompt: 'Halloran Forge', sign: { icon: '⚒', text: 'Halloran Forge', x: -2.4 } },

    { kit: 'building', at: [22.5, 12.0], w: 6.5, d: 4.2, h: 3.4, rise: 1.9,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'north', id: 'house-a' },

    // --- outer ring -------------------------------------------------------
    { kit: 'building', at: [4.0, 2.4], w: 5.5, d: 4, h: 3.2, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', rot: 0.12, id: 'house-b' },
    { kit: 'building', at: [29.0, 2.4], w: 5.5, d: 4, h: 3.2, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', rot: -0.09, id: 'house-c' },
    { kit: 'building', at: [4.5, 19.5], w: 6, d: 4.4, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'east', rot: 0, id: 'mill' },
    { kit: 'building', at: [28.5, 19.5], w: 5, d: 4, h: 3.2, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'west', id: 'house-d' },

    // --- fences and gardens ----------------------------------------------
    { kit: 'fence', at: [7.0, 3.4], arg: 5, rot: 0, radius: 0 },
    { kit: 'fence', at: [27.0, 3.4], arg: 5, rot: 0, radius: 0 },

    // The elder's garden, behind the north side of the square. Ivo's rota says
    // the surveyor went in and out of the north gate twice and there is nothing
    // up here but the ridge path and this wall, so this is where the answer is.
    { kit: 'fence', at: [14.0, 2.8], arg: 6, rot: 0, radius: 0 },
    { kit: 'bench', at: [16.6, 1.4], rot: 0 },
    { kit: 'flowerbox', at: [19.4, 1.6], rot: 0 },
    { kit: 'flowerbox', at: [8.2, 7.3], rot: 0 },
    { kit: 'flowerbox', at: [24.0, 7.3], rot: 0 },
    { kit: 'flowerbox', at: [12.0, 10.2], rot: 0 },

    // --- trees ------------------------------------------------------------
    { kit: 'tree', at: [2.5, 5.5], kind: 'broadleaf', scale: 1.15, seed: 3 },
    { kit: 'tree', at: [2.2, 9.0], kind: 'broadleaf', scale: 0.95, seed: 7 },
    { kit: 'tree', at: [3.0, 12.5], kind: 'dark', scale: 1.1, seed: 11 },
    { kit: 'tree', at: [31.0, 6.0], kind: 'broadleaf', scale: 1.05, seed: 13 },
    { kit: 'tree', at: [31.4, 10.0], kind: 'dark', scale: 1.2, seed: 17 },
    { kit: 'tree', at: [30.5, 13.5], kind: 'broadleaf', scale: 0.9, seed: 19 },
    { kit: 'tree', at: [8.0, 18.5], kind: 'broadleaf', scale: 1.0, seed: 23 },
    { kit: 'tree', at: [25.0, 18.0], kind: 'autumn', scale: 1.1, seed: 29 },
    { kit: 'tree', at: [12.5, 20.5], kind: 'dark', scale: 0.95, seed: 31 },
    { kit: 'tree', at: [22.0, 20.8], kind: 'broadleaf', scale: 1.05, seed: 37 },
    { kit: 'tree', at: [6.0, 1.5], kind: 'pine', scale: 1.0, seed: 41 },
    { kit: 'tree', at: [27.5, 1.4], kind: 'pine', scale: 1.1, seed: 43 },

    { kit: 'bush', at: [5.5, 15.5], scale: 1.1, seed: 5, radius: 0 },
    { kit: 'bush', at: [28.0, 15.2], scale: 1.0, seed: 9, radius: 0 },
    { kit: 'bush', at: [14.0, 15.4], scale: 0.9, seed: 15, radius: 0 },
    { kit: 'bush', at: [20.5, 15.6], scale: 1.05, seed: 21, radius: 0 },
    { kit: 'rock', at: [3.5, 16.5], scale: 0.9, seed: 2 },
    { kit: 'rock', at: [30.0, 17.2], scale: 1.0, seed: 4 },

    // --- the bridge -------------------------------------------------------
    { kit: 'bridge', at: [17, 17], arg: 7, id: 'bridge', solid: false, y: -0.05 },

    // --- save point + chest ----------------------------------------------
    { kit: 'savepoint', at: [17, 19.2], id: 'save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [26.5, 3.2], id: 'chest-hm-1',
      contains: { kind: 'item', id: 'potion', count: 2, label: '2 Potions' } },
    { kit: 'chest', at: [5.5, 15.6], id: 'chest-hm-2',
      contains: { kind: 'gold', amount: 150, label: '150 gil' } },
    { kit: 'chest', at: [30.0, 12.6], id: 'chest-hm-3',
      contains: { kind: 'esper', id: 'greenmother', label: 'a shard of magicite' } },

    // The house by the mill. The last letter in Almer Selby's bag is addressed
    // here in his own hand, and he walked past this gate twice a month for
    // nine years without putting it under the door. A prop rather than a floor
    // trigger because the scene asks a question and the answer must be the
    // player's — a `once` trigger would burn on a player who walked away.
    { kit: 'fence', at: [8.0, 20.4], arg: 3, radius: 0, id: 'hm-mill-gate',
      interact: { prompt: 'The gate by the mill', event: 'postbag_last' } },

    { kit: 'signpost', at: [17.8, 21.2], id: 'roadsign',
      interact: { name: 'Signpost', text: ['SOUTH — the Silt Road, and Solmere beyond.', 'NORTH — Harrowmere. Mind the bridge in flood season.'] } },
  ],

  /**
   * Harrowmere after. The village survived, which is worse than if it hadn't —
   * the same people are still doing the same jobs in a world that ended.
   */
  ruin: {
    subtitle: 'What Is Left of the Silt Road',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#8a7a6a', 60, 200],
    music: 'memory',
    sky: {
      zenith: '#6a4c40', horizon: '#c8a184', ground: '#3e352c',
      sunColor: '#ff9d63', sunDir: [-0.4, 0.2, 0.3], cloud: 0.9,
    },
    // Ilsabet sets her board down in the corner of the plaza the moment she has
    // somewhere to prop it, which is where the long look happens.
    triggers: [
      ...HARROWMERE_TRIGGERS,
      { at: [12, 7], size: [2, 2], kind: 'event', event: 'ilsabet_long_look' },
    ],
    removeNpcs: ['kid1', 'kid2', 'wanderer'],
    npcs: [
      {
        id: 'hm-ruin-child', name: 'Pib', at: [14.5, 9.5], face: 'east', clip: 'sit', prompt: 'Speak',
        look: { build: 'child', height: 1.24, hair: 'wild', expression: 'sad',
          colors: { skin: '#c08865', hair: '#6d4020', torso: '#496035', accent: '#5a3230',
            legs: '#5e412c', boots: '#4b382d' } },
        talk: [
          'I told everyone about the light in the sky.',
          'I was right and it did not help at all. Nobody has said sorry and I do not want them to.',
        ],
      },
      {
        id: 'ilsabet', name: 'Ilsabet Rook', at: [19.5, 10.5], face: 'west', clip: 'work',
        prompt: 'Speak', event: 'recruit_ilsabet',
        look: { id: 'ilsabet', build: 'child', height: 1.32, hair: 'bob', expression: 'neutral',
          colors: { skin: '#f0d5b8', hair: '#7a4a22', torso: '#68488c', accent: '#ffd76a',
            legs: '#d5766a', boots: '#5f6572', gloves: '#c39145' } },
      },
    ],
    props: [
      { kit: 'tree', at: [8.0, 18.5], kind: 'dead', scale: 1.2, seed: 301 },
      { kit: 'tree', at: [25.0, 18.0], kind: 'dead', scale: 1.3, seed: 303 },
      { kit: 'chest', at: [12.0, 5.5], id: 'hm-ruin-chest',
        contains: { kind: 'item', id: 'aetherweave', count: 1, label: 'a robe of Aetherweave' } },
    ],
  },

  npcs: [
    {
      id: 'innkeeper', name: 'Marla', at: [8.5, 7.6], face: 'south',
      clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8b2a2c', accent: '#ddccab', legs: '#5e412c', boots: '#4b382d' },
        expression: 'happy' },
      inn: { price: 30, name: 'The Kettle & Cinder' },
      talk: ['Bed and board, thirty gil. The stew is better than it smells.'],
    },
    {
      id: 'shopkeep', name: 'Odo', at: [22.5, 7.8], face: 'south',
      clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.74, hair: 'bald',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#33477c', accent: '#ab8018', legs: '#2b2933', boots: '#3b3943' },
        eyeStyle: 'sharp' },
      shop: 'harrowmere_items',
      talk: ['Salt, tinder, tonics. If it keeps you breathing, I stock it.'],
    },
    {
      id: 'smith', name: 'Halloran', at: [10.0, 10.0], face: 'north',
      clip: 'work', prompt: 'Trade',
      look: { build: 'hulking', height: 1.92, hair: 'topknot',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#95836b', accent: '#7c4939', legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' },
        eyeStyle: 'sharp' },
      shop: 'harrowmere_arms',
      talk: ['Imperium buys my good steel and leaves me the scrap. Take what I have.'],
    },
    {
      id: 'elder', name: 'Elder Sabbath', at: [16.5, 6.4], face: 'south',
      clip: 'idle', prompt: 'Speak',
      look: { build: 'slim', height: 1.62, hair: 'long',
        colors: { skin: '#dbb28c', hair: '#dedbe0', torso: '#4e326c', accent: '#ab8018', legs: '#2b2933', boots: '#4b382d', cape: '#38224f' },
        expression: 'sad' },
      event: 'harrowmere_intro',
      talk: [
        'You feel it too, then. The ground has been warm since the thaw.',
        'They are digging again, north of the ridge. Ferran engineers, with lamps that burn without oil.',
        'A thousand years we let the Engines sleep. Now a boy in a chancellor\'s coat wants to wind them.',
      ],
    },
    {
      id: 'kid1', name: 'Pib', at: [14.5, 9.5], face: 'east', wander: 2,
      clip: 'idle', prompt: 'Speak',
      look: { build: 'child', height: 1.24, hair: 'wild',
        colors: { skin: '#c08865', hair: '#6d4020', torso: '#496035', accent: '#ffd76a', legs: '#5e412c', boots: '#4b382d' },
        blush: '#d5766a', expression: 'happy' },
      talk: ['I saw a light in the sky last night! Green, like a frog. Nobody believes me.'],
    },
    {
      id: 'kid2', name: 'Wren', at: [19.0, 10.5], face: 'west', wander: 2,
      clip: 'idle', prompt: 'Speak',
      look: { build: 'child', height: 1.30, hair: 'braid',
        colors: { skin: '#e7c39c', hair: '#95602d', torso: '#b34a41', accent: '#dedbe0', legs: '#33477c', boots: '#5e412c' },
        blush: '#d5766a' },
      talk: ['Pib says he saw a light. Pib also says he can talk to geese.'],
    },
    {
      id: 'guard', name: 'Watchman Ivo', at: [17.6, 15.0], face: 'south',
      clip: 'loiter', prompt: 'Speak', event: 'surveyor_rota',
      look: { build: 'athletic', height: 1.80, hair: 'short',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#414954', accent: '#8a6a23', legs: '#2b2933', boots: '#3b3943', metal: '#a6b0bc' },
        eyeStyle: 'sharp' },
      talk: [
        'Road south is open, but there\'s things in the reeds since the digging started.',
        'Keep to the stones and you\'ll be fine. Mostly.',
      ],
    },
    {
      id: 'farmer', name: 'Tolliver', at: [6.5, 19.0], face: 'east',
      clip: 'work', prompt: 'Speak', facePlayer: true, event: 'millwheel_errand',
      look: { build: 'normal', height: 1.76, hair: 'short',
        colors: { skin: '#9a6147', hair: '#5e5163', torso: '#6b5d37', accent: '#4b382d', legs: '#8d7c4a', boots: '#4b382d' } },
      talk: ['Mill wheel\'s seized twice this month. River\'s running wrong — too fast, too cold.'],
    },
    {
      id: 'wanderer', name: 'Hooded Traveller', at: [26.0, 15.4], face: 'west',
      clip: 'loiter', prompt: 'Speak',
      look: { build: 'slim', height: 1.70, hair: 'bald',
        colors: { skin: '#6e4030', hair: '#171319', torso: '#2b2933', accent: '#4e326c', legs: '#1e1c25', boots: '#171319', cape: '#241636' },
        eyeStyle: 'sharp', expression: 'neutral' },
      talk: [
        'You have the resonance. Don\'t look so startled — it hums off you like a struck glass.',
        'When it wakes properly, you will want somewhere to be. Solmere, perhaps. Ask for the Marchetti twins.',
      ],
    },
  ],
};
