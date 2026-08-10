/**
 * Saltmarch — the town with no ground.
 *
 * Saltmarch is built out over the water on piles, because the only firm land
 * for a league is the headland it turns its back on. The plan is a single
 * timber causeway running from the pier head down to the shore, with two
 * wharves hung off it like ribs, and open water in the channels between.
 *
 * The shape does the storytelling twice over. First, there is no square and no
 * green: every step the player takes is on somebody's floor, over somebody's
 * mooring, and the whole town can hear it. Second, the tide is the map — the
 * flats around the wharf ends are walkable shallows, so the town is measurably
 * bigger at low water than at high, and every person here organises their day
 * around a number posted on a board.
 */

const W = 40;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[saltmarch] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** One wharf row: deck, mooring channel, causeway, mooring channel, deck. */
const WHARF = () => row(R('~', 2), R('o', 12), R('~', 3), R('o', 6), R('~', 3), R('o', 12), R('~', 2));
/** A gangway row, where the wharves are joined across the channels. */
const GANGWAY = () => row(R('~', 2), R('o', 36), R('~', 2));

const TERRAIN = [
  // --- open water ----------------------------------------------------------
  /*  0 */ row(R('~', 40)),
  /*  1 */ row(R('~', 40)),
  /*  2 */ row(R('~', 40)),
  // --- the pier head, standing out alone in the roads ----------------------
  /*  3 */ row(R('~', 17), R('o', 6), R('~', 17)),
  /*  4 */ row(R('~', 17), R('o', 6), R('~', 17)),
  /*  5 */ row(R('~', 17), R('o', 6), R('~', 17)),
  // --- the wharves ---------------------------------------------------------
  /*  6 */ WHARF(),
  /*  7 */ WHARF(),
  /*  8 */ GANGWAY(),
  /*  9 */ WHARF(),
  /* 10 */ WHARF(),
  /* 11 */ GANGWAY(),
  /* 12 */ WHARF(),
  /* 13 */ WHARF(),
  // --- the tidal flats, walkable at low water ------------------------------
  /* 14 */ row(R('~', 2), R(':', 12), R('~', 3), R('o', 6), R('~', 3), R(':', 12), R('~', 2)),
  /* 15 */ row(R(':', 17), R('o', 6), R(':', 17)),
  /* 16 */ row(R(':', 12), R('%', 16), R(':', 12)),
  // --- the shore and the salt pans -----------------------------------------
  /* 17 */ row(R('%', 40)),
  /* 18 */ row(R('%', 8), R(',', 24), R('%', 8)),
  /* 19 */ row(R('%', 6), R(',', 28), R('%', 6)),
  /* 20 */ row(R('#', 4), R('%', 4), R(',', 24), R('%', 4), R('#', 4)),
  /* 21 */ row(R('#', 8), R(',', 24), R('#', 8)),
  // --- the cut through the headland ----------------------------------------
  /* 22 */ row(R('#', 17), R(',', 6), R('#', 17)),
  /* 23 */ row(R('#', 17), R(',', 6), R('#', 17)),
];

export const SALTMARCH = {
  id: 'saltmarch',
  name: 'Saltmarch',
  subtitle: 'Built Over the Water',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#9fc0c6', 80, 260],
  tilt: 0.42,
  cameraDistance: 16,
  music: 'coast',
  base: 'sand',
  groundRamp: 'terrain',
  wallHeight: 5.2,
  wallMaterial: 'stone',
  waterLevel: -0.16,
  water: { shallow: '#3f8b95', deep: '#173845', foam: '#c8e6e8' },

  sky: {
    zenith: '#2b6a94', horizon: '#cfd8cf', ground: '#5a5c54',
    sunColor: '#ffe6bc', sunDir: [0.35, 0.5, 0.55], cloud: 0.72,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [19.5, 21], face: 'north' },
    world: { at: [19.5, 21], face: 'north' },
    pier: { at: [19.5, 4], face: 'south' },
  },

  exits: [
    { at: [17, 23], size: [6, 1], to: 'overworld', spawn: 'saltmarch', prompt: 'Leave Saltmarch' },
  ],

  props: [
    // --- the pier head ------------------------------------------------------
    { kit: 'lamppost', at: [17.5, 3.5] },
    { kit: 'lamppost', at: [22.5, 3.5] },
    { kit: 'crate', at: [18.2, 4.6], rot: 0.3 },
    { kit: 'crate', at: [18.0, 5.4], rot: -0.4 },
    { kit: 'barrel', at: [21.6, 4.5] },
    { kit: 'barrel', at: [22.1, 5.3] },
    { kit: 'signpost', at: [21.9, 3.4], id: 'sm-tideboard',
      interact: { name: 'The Tide Board', text: [
        'Chalked, and rechalked so often the slate has gone grey: HIGH 4 PAST NOON. LOW HALF PAST TEN.',
        'Underneath, in a hand that has been shaking for years: 41 DAYS SINCE THE WATER CAME UP WARM.',
      ] } },

    // --- west wharf ---------------------------------------------------------
    { kit: 'building', at: [5.5, 7.0], w: 6, d: 3.6, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'south', id: 'sm-house-a' },
    { kit: 'building', at: [10.5, 7.0], w: 6, d: 3.6, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'south', id: 'sm-house-b' },
    { kit: 'building', at: [5.5, 10.0], w: 6, d: 3.6, h: 3.5, rise: 1.7,
      style: 'wood', roof: 'slate', chimney: true, door: 'north', id: 'sm-smokehouse',
      sign: { icon: '🐟', text: 'Faskin Smokehouse', x: -2.0 } },
    { kit: 'building', at: [10.5, 10.0], w: 6, d: 3.6, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'north', id: 'sm-house-c' },
    { kit: 'building', at: [8.0, 13.0], w: 9, d: 3.6, h: 3.6, storeys: 2, rise: 2.0,
      style: 'plaster', roof: 'slate', timbered: true, balcony: true, chimney: true,
      door: 'north', id: 'sm-inn', enter: 'inn_saltmarch', enterPrompt: 'The Drowned Bell',
      sign: { icon: '🛏', text: 'The Drowned Bell', x: -3.2 } },

    // --- east wharf ---------------------------------------------------------
    { kit: 'building', at: [29.5, 7.0], w: 6, d: 3.6, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'south', id: 'sm-house-d' },
    { kit: 'building', at: [34.5, 7.0], w: 6, d: 3.6, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'south', rot: 0.06, id: 'sm-house-e' },
    { kit: 'building', at: [32.0, 10.0], w: 9, d: 3.6, h: 3.6, rise: 1.9,
      style: 'plaster', roof: 'tile', awning: true, door: 'north',
      id: 'sm-shop', enter: 'shop_saltmarch', enterPrompt: 'Marrow & Salt',
      sign: { icon: '🧪', text: 'Marrow & Salt', x: -3.2 } },
    { kit: 'building', at: [29.5, 13.0], w: 6, d: 3.6, h: 3.5, rise: 1.7,
      style: 'wood', roof: 'slate', door: 'north', id: 'sm-netloft' },
    { kit: 'building', at: [34.5, 13.0], w: 6, d: 3.6, h: 3.4, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'north', id: 'sm-house-f' },

    // --- railings along the wharf edges --------------------------------------
    { kit: 'fence', at: [2.1, 9.5], arg: 15, rot: Math.PI / 2, radius: 0 },
    { kit: 'fence', at: [13.9, 9.5], arg: 15, rot: Math.PI / 2, radius: 0 },
    { kit: 'fence', at: [26.1, 9.5], arg: 15, rot: Math.PI / 2, radius: 0 },
    { kit: 'fence', at: [37.9, 9.5], arg: 15, rot: Math.PI / 2, radius: 0 },
    { kit: 'fence', at: [17.1, 8.0], arg: 9, rot: Math.PI / 2, radius: 0 },
    { kit: 'fence', at: [22.9, 8.0], arg: 9, rot: Math.PI / 2, radius: 0 },

    // --- working clutter ------------------------------------------------------
    { kit: 'barrel', at: [3.4, 8.4] },
    { kit: 'barrel', at: [3.9, 9.1] },
    { kit: 'barrel', at: [3.3, 9.8] },
    { kit: 'crate', at: [12.6, 8.4], rot: 0.4 },
    { kit: 'crate', at: [12.9, 11.5], rot: -0.25 },
    { kit: 'barrel', at: [27.0, 8.5] },
    { kit: 'crate', at: [27.4, 11.6], rot: 0.3 },
    { kit: 'crate', at: [36.8, 8.5], rot: -0.5 },
    { kit: 'barrel', at: [36.6, 11.5] },
    { kit: 'cart', at: [19.5, 15.0], rot: 1.55 },
    { kit: 'lamppost', at: [16.6, 8.0] },
    { kit: 'lamppost', at: [23.4, 8.0] },
    { kit: 'lamppost', at: [16.6, 11.0] },
    { kit: 'lamppost', at: [23.4, 11.0] },
    { kit: 'bench', at: [19.6, 6.6], rot: 0 },

    // --- the shore: salt pans, sweet water, and the road out -----------------
    { kit: 'well', at: [19.5, 18.5], id: 'sm-well', radius: 1.2,
      interact: { name: 'The Sweet Well', text: [
        'The only water in Saltmarch that is not salt, and it is guarded like a treasury.',
        'A brass cup on a chain. A notice: ONE CUP. THE TOWN IS WATCHING AND THE TOWN IS PETTY.',
      ] } },
    { kit: 'fence', at: [4.5, 17.4], arg: 7, radius: 0 },
    { kit: 'fence', at: [4.5, 19.2], arg: 7, radius: 0 },
    { kit: 'fence', at: [35.0, 17.4], arg: 7, radius: 0 },
    { kit: 'fence', at: [35.0, 19.2], arg: 7, radius: 0 },
    { kit: 'crate', at: [9.0, 19.6], rot: 0.2 },
    { kit: 'barrel', at: [30.5, 19.5] },
    { kit: 'barrel', at: [31.1, 20.2] },
    { kit: 'tree', at: [7.5, 20.6], kind: 'dead', scale: 0.9, seed: 5 },
    { kit: 'tree', at: [32.0, 17.6], kind: 'dead', scale: 1.0, seed: 9, id: 'sm-tree-pan' },
    { kit: 'rock', at: [8.6, 20.6], scale: 1.1, seed: 3 },
    { kit: 'rock', at: [31.2, 20.6], scale: 1.0, seed: 7 },
    { kit: 'lamppost', at: [18.4, 20.6] },
    { kit: 'lamppost', at: [21.6, 20.6] },

    { kit: 'savepoint', at: [19.5, 16.6], id: 'sm-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [17.4, 21.4], id: 'sm-roadsign',
      interact: { name: 'Weathered Post', text: [
        'SOUTH — the cut, and the road inland. Two days if it does not rain.',
        'Below: SALTMARCH ACCEPTS NO RESPONSIBILITY FOR PERSONS ON THE FLATS AT HIGH WATER.',
      ] } },

    { kit: 'chest', at: [3.0, 12.6], id: 'sm-chest-1',
      contains: { kind: 'gold', amount: 260, label: '260 gil' } },
    { kit: 'chest', at: [36.8, 6.4], id: 'sm-chest-2',
      contains: { kind: 'item', id: 'tidecleaver', count: 1, label: 'a Tidecleaver' } },
    { kit: 'chest', at: [19.5, 3.4], id: 'sm-chest-3',
      contains: { kind: 'item', id: 'phoenixtear', count: 2, label: '2 Phoenix Tears' } },
    // "Brought up in a net and never claimed" — so it is on the east wharf
    // outside the net loft, with the rest of what came up in the nets and
    // was never asked after. Kessa mends two doors along and has never once
    // mentioned it, which is exactly what the netsman did.
    { kit: 'chest', at: [26.8, 12.5], id: 'sm-chest-netfall',
      contains: { kind: 'esper', id: 'thelateharvest', label: 'a shard of magicite' } },
  ],

  /**
   * Saltmarch after. A town over water survives whatever happens on land, which
   * is the joke: it is intact, and there is nothing to bring in and nowhere to
   * send it. The tide board is still chalked every morning.
   */
  ruin: {
    subtitle: 'Still Chalking the Board',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#7a7a72', 45, 170],
    music: 'memory',
    sky: {
      zenith: '#4c4258', horizon: '#b08c7c', ground: '#33302c',
      sunColor: '#ff9d63', sunDir: [-0.3, 0.18, 0.4], cloud: 0.96,
    },
    // Onna is replaced by her ruined self on the same spot, so the whole
    // world's Tide-Reeve has to be taken off the board with the others.
    removeNpcs: ['sm-boy', 'sm-tallyman', 'sm-pilot', 'sm-reeve'],
    removeProps: ['sm-tree-pan'],
    npcs: [
      {
        id: 'sm-ruin-reeve', name: 'Tide-Reeve Onna', at: [21.8, 4.4], face: 'west',
        clip: 'work', prompt: 'Speak', event: 'saltmarch_withies',
        look: { build: 'slim', height: 1.64, hair: 'braid', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#96603f', hair: '#dedbe0', torso: '#12566b', accent: '#9ccdd4',
            legs: '#414954', boots: '#3a2a20', cape: '#1a8fa5' } },
        talk: [
          'High at four. Low at half past ten. It has not once been wrong and it is not going to start.',
          'You may keep whatever you like. I am keeping the tide.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [32.0, 17.6], kind: 'dead', scale: 1.4, seed: 311 },
      { kit: 'chest', at: [8.0, 16.6], id: 'sm-ruin-chest',
        contains: { kind: 'item', id: 'crownofsalt', count: 1, label: 'a Crown of Salt' } },
    ],
  },

  npcs: [
    {
      id: 'sm-relay', name: 'Relay-Rider Onnec', at: [18.6, 4.6], face: 'east',
      clip: 'loiter', prompt: 'Trade',
      look: { build: 'athletic', height: 1.72, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#12566b', accent: '#d8ac31',
          legs: '#414954', boots: '#3a2a20', gloves: '#4b382d', cape: '#1a8fa5' } },
      shop: 'overwind_relay',
      talk: [
        'Overwind Relay. We keep a stage at every place a fast thing has to stop, and a pier is the worst stop there is — you cannot outrun a tide, you can only be early for it.',
        'Everything on the board is about getting your turn before the other fellow. That is the whole trade. There is nothing else in it.',
      ],
    },
    {
      id: 'sm-inn', name: 'Corrie Faskin', at: [8.4, 11.2], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.62, hair: 'bob', expression: 'happy',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#3a2a20' } },
      inn: { price: 35, name: 'The Drowned Bell' },
      talk: [
        'Thirty-five, and the room over the channel is cheaper because it moves. Some people pay extra for that.',
        'It is called the Drowned Bell because there is one under us. You will hear it when the tide is right and you will not sleep after.',
      ],
    },
    {
      id: 'sm-items', name: 'Ansel Wray', at: [32.4, 8.2], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.73, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'harrowmere_items',
      talk: [
        'Same firm as the one up the Silt Road. Odo sends the crates down and I send the money up, and neither of us has met the other.',
        'Salt I have my own of. Everything else came a long way to be in your hand.',
      ],
    },
    {
      id: 'sm-reeve', name: 'Tide-Reeve Onna', at: [21.2, 4.4], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.64, hair: 'braid', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#dedbe0', torso: '#12566b', accent: '#9ccdd4',
          legs: '#414954', boots: '#3a2a20', cape: '#1a8fa5' } },
      talk: [
        'I am not the mayor. Saltmarch has no mayor. I chalk the board and the town does what the board says, which comes to the same thing.',
        'The water has been coming in warm since the thaw. Not warm like a summer. Warm like a body.',
      ],
    },
    {
      id: 'sm-netmender', name: 'Old Kessa', at: [29.5, 11.2], face: 'south', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.56, hair: 'bob', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#6b5d37', accent: '#5a3230',
          legs: '#4b382d', boots: '#3a2a20' } },
      talk: [
        'Sixty years mending nets. You get so you can do it without looking, and then you get so you would rather not look.',
        'There is nothing in them this month. Not torn. Not full. Just nothing, every morning, politely.',
      ],
    },
    {
      id: 'sm-salter', name: 'Salter Gribb', at: [6.5, 18.4], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.77, hair: 'short',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#95836b', accent: '#8a6a23',
          legs: '#6b5d37', boots: '#4b382d', gloves: '#bda98b' } },
      talk: [
        'Nine days to dry a pan properly. The Imperium man asked if we could do it in four. I asked if he could hold his breath for six.',
        'Salt is patience with a price on it. That is the whole trade.',
      ],
    },
    {
      // The withies are Dace's while there is a Dace. After the sky changes he
      // has gone south and the scene passes to Onna on the pier head, so the
      // ruin's Tide-Reeve carries the same event and gets the other half of it.
      id: 'sm-pilot', name: 'Harbour Pilot Dace', at: [19.6, 8.6], face: 'north', clip: 'loiter',
      prompt: 'Speak', event: 'saltmarch_withies',
      look: { build: 'athletic', height: 1.81, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#342a37', torso: '#33477c', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#3b3943', cape: '#12566b' } },
      talk: [
        'Two channels in. One of them is a lie the seabed tells at half tide. I take the money either way.',
        'Six hulls this year run up on the eastern bar. Four of them had a pilot aboard. He is not here any more and I would not go looking.',
      ],
    },
    {
      // She is at the far end of the pier with her back to the town, which is
      // where the letter has to be handed over — she will not take it with
      // anybody watching, and out here nobody is. She stays after, too.
      id: 'sm-widow', name: 'Woman on the Pier', at: [18.6, 3.6], face: 'north', clip: 'idle',
      prompt: 'Speak', event: 'postbag_pier',
      look: { build: 'slim', height: 1.67, hair: 'long', expression: 'sad',
        colors: { skin: '#e7c39c', hair: '#4a2a17', torso: '#38224f', accent: '#8b2a2c',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      talk: [
        'The Merrowline. Out eleven days, due in six.',
        'I am aware of the arithmetic. I would rather do it standing here.',
      ],
    },
    {
      id: 'sm-tallyman', name: 'Imperium Tallyman', at: [23.4, 15.4], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.70, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'Every pan, every barrel, every hull. I am not popular and I am not paid to be.',
        'They tell me salt is a strategic good now. Nobody will tell me what it is strategic *for*, and I have stopped enjoying my own guesses.',
      ],
    },
    {
      id: 'sm-boy', name: 'Kettle', at: [15.6, 15.4], face: 'east', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.26, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#ac744c', hair: '#6d4020', torso: '#2c5a45', accent: '#ffd76a',
          legs: '#33477c', boots: '#4b382d' } },
      talk: [
        'At low water I go under the wharf for what people drop. Coins mostly. A ring once. A key that fits nothing.',
        'You have to be back up before the board says. The board is never wrong. That is the scary bit about the board.',
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
  fog: ['#22201c', 22, 70],
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

export const INN_SALTMARCH = {
  ...ROOM_BASE,
  id: 'inn_saltmarch',
  name: 'The Drowned Bell',
  subtitle: 'Saltmarch',
  terrain: makeRoom(18, [
    '##################',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '#oooooooooooooooo#',
    '########oo########',
  ], 'inn_saltmarch'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'saltmarch', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [4.0, 3.0], rot: 0 },
    { kit: 'bench', at: [4.0, 4.8], rot: 0 },
    { kit: 'bench', at: [13.0, 3.0], rot: 0 },
    { kit: 'bench', at: [13.0, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.7, 2.3] },
    { kit: 'crate', at: [15.3, 1.7], rot: 0.3 },
    { kit: 'lamppost', at: [5.5, 1.6] },
    { kit: 'lamppost', at: [12.0, 1.6] },
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-sm-chest',
      contains: { kind: 'item', id: 'wardingcord', count: 1, label: 'a Warding Cord' } },
    { kit: 'signpost', at: [3.0, 5.4], id: 'inn-sm-board',
      interact: { name: 'Crew Board', text: [
        'BERTHS WANTED — three, for the Merrowline. Struck through twice and written again underneath.',
        'FOR SALE — one bell, salvaged, cracked, will not stop ringing. Buyer collects.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-sm-keeper', name: 'Corrie Faskin', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.62, hair: 'bob', expression: 'happy',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#3a2a20' } },
      inn: { price: 35, name: 'The Drowned Bell' },
      talk: ['Thirty-five. Fish stew. It is always fish stew. I have stopped pretending there is a choice.'],
    },
    {
      id: 'inn-sm-diver', name: 'Wreck Diver', at: [5.2, 4.0], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'athletic', height: 1.76, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#1a8fa5', accent: '#3fc6d6',
          legs: '#12566b', boots: '#3a2a20', gloves: '#5b6674' } },
      talk: [
        'There is a hull down on the eastern bar with a hold full of brass lattice and nobody will pay me to bring it up.',
        'Not because it is dangerous. Because the Imperium already knows it is there, and they have not come for it either.',
      ],
    },
  ],
};

export const SHOP_SALTMARCH = {
  ...ROOM_BASE,
  id: 'shop_saltmarch',
  name: 'Marrow & Salt',
  subtitle: 'Saltmarch',
  music: 'coast',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_saltmarch'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'saltmarch', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.5, 2.6], rot: -0.3 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.7, 2.6] },
    { kit: 'barrel', at: [13.4, 3.5] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'chest', at: [4.0, 3.6], id: 'shop-sm-chest',
      contains: { kind: 'gold', amount: 180, label: '180 gil' } },
  ],

  npcs: [
    {
      id: 'shop-sm-keeper', name: 'Ansel Wray', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.73, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'harrowmere_items',
      talk: ['Damp gets into everything here. If a wrapper looks sorry for itself, that is the wrapper, not the medicine.'],
    },
  ],
};

export const SALTMARCH_INTERIORS = {
  inn_saltmarch: INN_SALTMARCH,
  shop_saltmarch: SHOP_SALTMARCH,
};
