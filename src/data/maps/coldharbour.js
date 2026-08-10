/**
 * Coldharbour — a port with its back to the sea.
 *
 * The basin silted in over ninety years, a foot a decade, so slowly that no
 * single generation was the one that lost it. What is left is a flat of grey
 * sand and reed where forty ships used to lie, and one thin channel out at the
 * top of the map that still floods and is no use to anybody.
 *
 * The plan is the story. Coldharbour was built as one grand terrace facing the
 * water — Custom House, Harbourmaster's, Exchange, all in a row, all with their
 * good fronts and their doors on the north. The map keeps them exactly where
 * they were put. But the trade went to the land road, so the town turned round
 * behind them: the back lane, which was where the middens were, is now the high
 * street, and every building on it has had a door cut in a wall that was never
 * meant to have one.
 *
 * So the player walks in from the south into a busy, scruffy, entirely
 * functional lane, threads one of the two alleys between the grand houses, and
 * comes out onto a wide swept marble-grade quay facing a mud flat. The best
 * architecture in the town is the part nobody uses, and it is all pointing the
 * wrong way.
 */

const W = 32;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[coldharbour] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 32)),
  // --- what is left of the water -------------------------------------------
  /*  1 */ row(R('#', 2), R('~', 28), R('#', 2)),
  /*  2 */ row(R('#', 2), R('~', 28), R('#', 2)),
  /*  3 */ row(R('#', 2), R(':', 28), R('#', 2)),
  // --- the flat: what ninety years of a river putting things down looks like
  /*  4 */ row(R('#', 2), R(':', 3), R('%', 22), R(':', 3), R('#', 2)),
  /*  5 */ row(R('#', 2), R('%', 28), R('#', 2)),
  /*  6 */ row(R('#', 2), R('%', 10), R('w', 4), R('%', 14), R('#', 2)),
  /*  7 */ row(R('#', 2), R('%', 28), R('#', 2)),
  /*  8 */ row(R('#', 2), R('%', 8), R('w', 3), R('%', 17), R('#', 2)),
  /*  9 */ row(R('#', 2), R('%', 28), R('#', 2)),
  /* 10 */ row(R('#', 2), R('%', 28), R('#', 2)),
  // --- the quay, still decked, still swept ---------------------------------
  /* 11 */ row(R('#', 2), R('o', 28), R('#', 2)),
  /* 12 */ row(R('#', 2), R('o', 28), R('#', 2)),
  // --- the harbour front, and the terrace standing on it -------------------
  /* 13 */ row(R('#', 2), R('=', 28), R('#', 2)),
  /* 14 */ row(R('#', 2), R('=', 28), R('#', 2)),
  /* 15 */ row(R('#', 2), R('=', 28), R('#', 2)),
  /* 16 */ row(R('#', 2), R('=', 28), R('#', 2)),
  // --- the back lane, which is the high street now -------------------------
  /* 17 */ row(R('#', 2), R(',', 28), R('#', 2)),
  /* 18 */ row(R('#', 2), R(',', 28), R('#', 2)),
  /* 19 */ row(R('#', 2), R(',', 28), R('#', 2)),
  /* 20 */ row(R('#', 2), R(',', 28), R('#', 2)),
  /* 21 */ row(R('#', 2), R(',', 28), R('#', 2)),
  /* 22 */ row(R('#', 2), R('.', 28), R('#', 2)),
  /* 23 */ row(R('#', 2), R('.', 28), R('#', 2)),
  /* 24 */ row(R('#', 4), R('.', 24), R('#', 4)),
  // --- the land road, which took everything --------------------------------
  /* 25 */ row(R('#', 13), R(',', 6), R('#', 13)),
  /* 26 */ row(R('#', 13), R(',', 6), R('#', 13)),
  /* 27 */ row(R('#', 32)),
];

export const COLDHARBOUR = {
  id: 'coldharbour',
  name: 'Coldharbour',
  subtitle: 'The Wrong Side of the Terrace',
  kind: 'town',
  light: 'day',
  grade: 'dawn',
  fog: ['#c2c4bc', 80, 260],
  tilt: 0.42,
  cameraDistance: 18,
  music: 'coast',
  base: 'sand',
  groundRamp: 'terrain',
  wallHeight: 4.6,
  wallMaterial: 'stone',
  waterLevel: -0.30,
  water: { shallow: '#5b7d7a', deep: '#213f44', foam: '#b6cbc4' },

  sky: {
    zenith: '#4a7ea6', horizon: '#d9d2bc', ground: '#6a6656',
    sunColor: '#ffe0b8', sunDir: [0.3, 0.44, -0.4], cloud: 0.72,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [15.5, 24], face: 'north' },
    world: { at: [15.5, 24], face: 'north' },
    quay: { at: [15.5, 12], face: 'north' },
  },

  exits: [
    { at: [13, 26], size: [6, 1], to: 'eastreach', spawn: 'coldharbour_landgate', prompt: 'The land road' },
  ],

  props: [
    // --- the flat -------------------------------------------------------------
    { kit: 'rock', at: [6.0, 6.4], scale: 1.2, seed: 3 },
    { kit: 'rock', at: [24.0, 5.6], scale: 1.0, seed: 7 },
    { kit: 'cart', at: [9.0, 9.0], rot: 1.2, id: 'ch-mudcart' },
    { kit: 'barrel', at: [20.0, 8.4] },
    { kit: 'crate', at: [20.8, 9.0], rot: 0.4 },
    { kit: 'signpost', at: [16.0, 7.0], id: 'ch-channelmark',
      interact: { name: 'The Channel Mark', text: [
        'A post out on the flat with depths cut into it, one notch a year, going down.',
        'The top notch is at head height and reads FOUR FATHOM. The bottom is at your ankle and has no number, only a date, and the date is this spring.',
      ] } },
    { kit: 'chest', at: [27.0, 6.0], id: 'ch-chest-flat',
      contains: { kind: 'item', id: 'greatbalm', count: 2, label: '2 Great Balms' } },

    // --- the quay -------------------------------------------------------------
    { kit: 'barrel', at: [5.0, 11.4] },
    { kit: 'barrel', at: [5.8, 11.6] },
    { kit: 'barrel', at: [26.4, 11.4] },
    { kit: 'crate', at: [27.2, 11.7], rot: -0.3 },
    { kit: 'lamppost', at: [8.0, 11.6] },
    { kit: 'lamppost', at: [16.0, 11.6] },
    { kit: 'lamppost', at: [24.0, 11.6] },
    { kit: 'bench', at: [11.4, 12.4], rot: Math.PI },
    { kit: 'bench', at: [20.6, 12.4], rot: Math.PI },
    { kit: 'fence', at: [12.0, 10.6], arg: 8, radius: 0 },
    { kit: 'fence', at: [20.0, 10.6], arg: 8, radius: 0 },
    { kit: 'savepoint', at: [16.0, 13.2], id: 'ch-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [12.4, 13.6], id: 'ch-quayboard',
      interact: { name: 'The Quay Regulations', text: [
        'Cut into the stone, in the good lettering the town could afford when it had a harbour.',
        'NO VESSEL TO LIE ALONGSIDE ABOVE THREE DAYS. NO CARGO TO BE LEFT ON THE STONE OVERNIGHT.',
        'Both rules have been kept faultlessly for the last forty years.',
      ] } },

    // --- the grand terrace, all of it facing the mud -------------------------
    { kit: 'building', at: [7.0, 15.0], w: 8, d: 4, h: 4.0, storeys: 2, rise: 2.2,
      style: 'stone', roof: 'slate', chimney: true, door: 'north', id: 'ch-custom',
      sign: { icon: '⚖', text: 'The Custom House', x: -2.8 } },
    { kit: 'building', at: [16.0, 15.0], w: 8, d: 4, h: 3.8, storeys: 2, rise: 2.2,
      style: 'stone', roof: 'slate', balcony: true, chimney: true, door: 'south',
      id: 'ch-inn', enter: 'inn_coldharbour', enterPrompt: "The Harbourmaster's",
      sign: { icon: '🛏', text: "The Harbourmaster's", x: 2.8 } },
    { kit: 'building', at: [25.0, 15.0], w: 8, d: 4, h: 4.0, storeys: 2, rise: 2.2,
      style: 'stone', roof: 'slate', chimney: true, door: 'north', id: 'ch-exchange',
      sign: { icon: '⚖', text: 'The Corn Exchange', x: -2.8 } },
    // What a bricked-up front looks like from the harbour side.
    { kit: 'crate', at: [5.6, 13.2], rot: 0.2 },
    { kit: 'crate', at: [6.4, 13.4], rot: -0.4 },
    { kit: 'barrel', at: [8.2, 13.2] },
    { kit: 'crate', at: [23.6, 13.3], rot: 0.5 },
    { kit: 'barrel', at: [26.4, 13.3] },
    { kit: 'lamppost', at: [11.6, 15.0] },
    { kit: 'lamppost', at: [20.4, 15.0] },

    // --- the back lane --------------------------------------------------------
    { kit: 'building', at: [9.0, 19.5], w: 7, d: 4.4, h: 3.6, rise: 1.9,
      style: 'plaster', roof: 'tile', awning: true, door: 'south',
      id: 'ch-shop', enter: 'shop_coldharbour', enterPrompt: 'Back of the Terrace',
      sign: { icon: '🧪', text: 'Back of the Terrace', x: -2.6 } },
    { kit: 'building', at: [3.5, 19.5], w: 5, d: 4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', id: 'ch-h-a' },
    { kit: 'building', at: [16.5, 19.6], w: 6, d: 4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', rot: 0.05, id: 'ch-h-b' },
    { kit: 'building', at: [23.0, 19.6], w: 6, d: 4, h: 3.5, rise: 1.8,
      style: 'wood', roof: 'thatch', door: 'south', id: 'ch-h-c' },
    { kit: 'building', at: [28.6, 19.6], w: 5, d: 4, h: 3.4, rise: 1.7,
      style: 'plaster', roof: 'thatch', door: 'south', rot: -0.06, id: 'ch-h-d' },
    { kit: 'stall', at: [13.0, 17.6], arg: '#2c5a45', id: 'ch-stall-1' },
    { kit: 'stall', at: [20.0, 17.6], arg: '#8a6a23', id: 'ch-stall-2' },
    { kit: 'stall', at: [6.0, 17.6], arg: '#8b2a2c', id: 'ch-stall-3' },
    { kit: 'stall', at: [27.0, 17.6], arg: '#33477c', id: 'ch-stall-4' },
    { kit: 'well', at: [16.0, 22.4], id: 'ch-well', radius: 1.2,
      interact: { name: 'The Lane Well', text: [
        'Sunk behind the terrace in the year the sweet water in the basin turned. It is the only well in Coldharbour and it is in the back lane.',
        'Somebody has scratched on the coping: WE HAD A HARBOUR AND WE DUG A HOLE.',
      ] } },
    { kit: 'cart', at: [11.0, 22.0], rot: 0.4 },
    { kit: 'cart', at: [21.4, 22.2], rot: 1.4 },
    { kit: 'barrel', at: [4.4, 22.2] },
    { kit: 'crate', at: [5.2, 22.6], rot: 0.3 },
    { kit: 'flowerbox', at: [8.0, 21.8] },
    { kit: 'flowerbox', at: [24.4, 21.8] },
    { kit: 'lamppost', at: [13.4, 21.4] },
    { kit: 'lamppost', at: [18.6, 21.4] },
    { kit: 'tree', at: [7.0, 23.6], kind: 'broadleaf', scale: 1.05, seed: 11, id: 'ch-tree-lane' },
    { kit: 'tree', at: [25.0, 23.6], kind: 'autumn', scale: 1.0, seed: 13, id: 'ch-tree-road' },
    { kit: 'bush', at: [10.0, 23.4], scale: 1.0, seed: 17, radius: 0 },
    { kit: 'bush', at: [22.0, 23.4], scale: 1.05, seed: 19, radius: 0 },
    { kit: 'chest', at: [3.0, 17.0], id: 'ch-chest-lane',
      contains: { kind: 'gold', amount: 330, label: '330 gil' } },
    { kit: 'chest', at: [29.4, 23.0], id: 'ch-chest-road',
      contains: { kind: 'item', id: 'clearwatercharm', count: 1, label: 'a Clearwater Charm' } },
    { kit: 'signpost', at: [12.6, 24.4], id: 'ch-roadboard',
      interact: { name: 'The Carriers\' Board', text: [
        'WAGGONS DEPART DAILY FOR THE INLAND MARKETS. NO SAILING DATES ARE POSTED AT THIS TIME.',
        'The words AT THIS TIME are painted over something shorter and much older.',
      ] } },
  ],

  /**
   * Coldharbour after. The flat took the last of the channel in a night, and
   * the terrace is now looking at a plain. The quay is still swept. There is a
   * rota for it and the rota is still kept.
   */
  ruin: {
    subtitle: 'A Quay and a Plain',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#8b8878', 48, 180],
    music: 'memory',
    sky: {
      zenith: '#4c4356', horizon: '#bb9782', ground: '#38352c',
      sunColor: '#ff9d63', sunDir: [-0.3, 0.22, -0.4], cloud: 0.95,
    },
    removeNpcs: ['ch-child', 'ch-carter', 'ch-cockler', 'ch-harbourmaster'],
    removeProps: ['ch-tree-lane', 'ch-tree-road'],
    npcs: [
      {
        id: 'ch-ruin-master', name: 'Harbourmaster Sallow', at: [17.0, 12.0], face: 'north',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'normal', height: 1.73, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#ac744c', hair: '#5e5163', torso: '#12566b', accent: '#a6b0bc',
            legs: '#2b2933', boots: '#3b3943', cape: '#38224f' } },
        talk: [
          'The channel closed on a still night. No wind, no tide worth the name. It simply stopped being water.',
          'I hold the office until somebody appoints a successor, and there is nobody left to do the appointing, so I hold the office.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [7.0, 23.6], kind: 'dead', scale: 1.3, seed: 801 },
      { kit: 'tree', at: [25.0, 23.6], kind: 'dead', scale: 1.2, seed: 803 },
      { kit: 'chest', at: [16.0, 9.0], id: 'ch-ruin-chest',
        contains: { kind: 'item', id: 'tideheart', count: 1, label: 'a Tideheart' } },
    ],
  },

  npcs: [
    {
      id: 'ch-inn', name: 'Merrit Sallow', at: [16.0, 17.0], face: 'north', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.67, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 40, name: "The Harbourmaster's" },
      talk: [
        'Forty. The good rooms face the harbour, which is to say they face a field of grey sand, so I let them cheapest and everybody is happy about it.',
        'The front door is under six courses of brick and has been since my father. You come in at the back, through what used to be the coal store, and you say nothing about it.',
      ],
    },
    {
      id: 'ch-shop', name: 'Wenna Furze', at: [9.0, 21.8], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.70, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'drownedcoast_wreckers',
      talk: [
        'My grandmother sold ships\' stores off the quay. I sell the same list to waggoners in a lane behind her shop, and I have not moved a shelf.',
        'Half of what is on that counter came out of the basin as it dried. Ninety years of a harbour quietly losing things, and every one of them within a quarter mile of my back door.',
      ],
    },
    {
      id: 'ch-harbourmaster', name: 'Harbourmaster Sallow', at: [16.0, 12.0], face: 'north',
      clip: 'work', prompt: 'Speak', facePlayer: true,
      look: { build: 'normal', height: 1.73, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#12566b', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#3b3943', cape: '#38224f' } },
      talk: [
        'I take the depth at six every morning and I write it in the book. It has been the same number since the winter before last, and I still go.',
        'The office is for life and the salary is eleven gil a quarter. Neither of those was ever meant to be a joke.',
      ],
    },
    {
      id: 'ch-dredger', name: 'Committee-Clerk Pring', at: [20.0, 13.0], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.68, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#dedbe0', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'The Dredging Committee has met on the first of every month for forty-one years. We have never once failed to meet.',
        'We have eleven hundred gil in the fund and a quotation for nine thousand, and both figures have been carefully preserved.',
      ],
    },
    {
      id: 'ch-pilot', name: 'Pilot Ordway', at: [12.0, 12.0], face: 'north', clip: 'sit', prompt: 'Speak',
      look: { build: 'athletic', height: 1.78, hair: 'wild',
        colors: { skin: '#96603f', hair: '#dedbe0', torso: '#33477c', accent: '#3fc6d6',
          legs: '#414954', boots: '#3a2a20', gloves: '#5b6674' } },
      talk: [
        'I brought vessels up that channel in the dark on the sound of the bank. There is no trick to it. You listen for the part that has stopped answering.',
        'I sit here because it is where I sat. Nobody has told me to stop and I would want it in writing.',
      ],
    },
    {
      id: 'ch-cockler', name: 'Cockler Bee', at: [22.0, 8.0], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.62, hair: 'braid',
        colors: { skin: '#e7c39c', hair: '#bd8746', torso: '#496035', accent: '#ffd76a',
          legs: '#6b5d37', boots: '#4b382d', gloves: '#95836b' } },
      talk: [
        'Everybody stood on the wall watching the harbour die and I went down and had a look at what was arriving.',
        'Cockle, worm and samphire, and I take more off that flat in a week than my father took off the water in a month. I do not say so at the inn.',
      ],
    },
    {
      id: 'ch-mason', name: 'Mason Redruth', at: [24.0, 13.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.86, hair: 'bald',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      talk: [
        'Nineteen front doors bricked and eleven back walls opened, and I have not been out of work since I was twenty-two.',
        'I do the fronts properly, mind. Squared and coursed and pointed. If a thing is going to be shut it can be shut handsomely.',
      ],
    },
    {
      id: 'ch-carter', name: 'Waggoner Kell', at: [12.0, 22.6], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.87, hair: 'topknot',
        colors: { skin: '#c08865', hair: '#342a37', torso: '#6b5d37', accent: '#7c4939',
          legs: '#5e412c', boots: '#4b382d', gloves: '#4b382d' } },
      talk: [
        'They hate us in this lane and they have hated us for two generations, and every one of them takes the money.',
        'The road did not beat the harbour. The mud beat the harbour. We just turned up with a waggon while everybody was busy being upset.',
      ],
    },
    {
      id: 'ch-widow', name: 'Old Nance Ordway', at: [19.0, 22.6], face: 'north', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.58, hair: 'long', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#4e326c', accent: '#95836b',
          legs: '#4b382d', boots: '#3a2a20', cape: '#241636' } },
      talk: [
        'I keep my chair facing the terrace. Everybody else turned theirs round to watch the road and I will not be doing that.',
        'You can hear the difference, you know. A town facing water sounds one way. This sounds like a yard.',
      ],
    },
    {
      id: 'ch-child', name: 'Sprat Furze', at: [13.0, 9.0], face: 'north', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.24, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'You can walk to the middle of where the ships were. I have done it twice. It takes eleven counts and then you are standing in the harbour.',
        'There are ribs out there. Not fish. The big kind, in a line, like a hall with no roof, and grown-ups get strange if you mention it.',
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
  fog: ['#211f1c', 22, 70],
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

export const INN_COLDHARBOUR = {
  ...ROOM_BASE,
  id: 'inn_coldharbour',
  name: "The Harbourmaster's",
  subtitle: 'Coldharbour',
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
  ], 'inn_coldharbour'),

  spawns: { default: { at: [9, 6], face: 'north' } },
  exits: [{ at: [9, 7], size: [2, 1], to: 'coldharbour', spawn: 'default', prompt: 'Outside' }],

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
    { kit: 'chest', at: [17.4, 5.4], id: 'inn-ch-chest',
      contains: { kind: 'item', id: 'wanderersbell', count: 1, label: "a Wanderer's Bell" } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-ch-board',
      interact: { name: 'The Arrivals Slate', text: [
        'A shipping slate, ruled in four columns: VESSEL. MASTER. OUT OF. BERTH.',
        'It has been wiped clean and re-ruled every morning for forty years, and the columns have been empty for thirty-one of them.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-ch-keeper', name: 'Merrit Sallow', at: [9.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.67, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 40, name: "The Harbourmaster's" },
      talk: ['Forty. If you want the view, ask for the north room, and then do not come down and complain to me about the view.'],
    },
    {
      id: 'inn-ch-guest', name: 'Surveyor of Cuts', at: [3.6, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.74, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'A cut from the channel to the quay is eleven hundred yards of digging and it silts again in nine years. I have told them that three times.',
        'They pay me handsomely to say it and then they minute it and then they meet again. I have stopped bringing new figures.',
      ],
    },
  ],
};

export const SHOP_COLDHARBOUR = {
  ...ROOM_BASE,
  id: 'shop_coldharbour',
  name: 'Back of the Terrace',
  subtitle: 'Coldharbour',
  music: 'shop',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_coldharbour'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'coldharbour', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.6], rot: -0.3 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.6, 2.6] },
    { kit: 'barrel', at: [13.0, 3.4] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.6, 3.6] },
    { kit: 'chest', at: [10.6, 3.6], id: 'shop-ch-chest',
      contains: { kind: 'gold', amount: 210, label: '210 gil' } },
  ],

  npcs: [
    {
      id: 'shop-ch-keeper', name: 'Wenna Furze', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.70, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'drownedcoast_wreckers',
      talk: ['The room behind you was a coal store. If anything you buy off me tastes faintly of it, that is the room and not the goods.'],
    },
  ],
};

export const COLDHARBOUR_INTERIORS = {
  inn_coldharbour: INN_COLDHARBOUR,
  shop_coldharbour: SHOP_COLDHARBOUR,
};
