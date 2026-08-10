/**
 * Caldwick — everything that is here is here because of the kiln.
 *
 * The Great Kiln has been alight for two hundred and eleven years. Letting it
 * out costs eleven days and a fortune in faggots, so it has never been let out,
 * and the town is arranged entirely around that one fact.
 *
 * The plan is a single yard with the kiln in the middle of it, and one street:
 * the ring you walk to get round the thing. There is no other route anywhere in
 * Caldwick. Every door in the town faces inward, because a door that faces away
 * from the kiln faces away from the work.
 *
 * The ground does the rest of the storytelling on its own. It is graded by
 * heat — scorched bare stone on the apron where the burners work and nothing
 * will grow, then beaten dirt where the drying-hurdles stand, then cobble out
 * at the wall where the houses are. Rent runs the same way and everybody knows
 * their own number: you can tell a family's standing in this town by how far
 * they live from the fire.
 */

const W = 30;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[caldwick] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 30)),
  /*  1 */ row(R('#', 30)),
  // --- the outer cobble: houses, and the cool side of everything -----------
  /*  2 */ row(R('#', 8), R('=', 14), R('#', 8)),
  /*  3 */ row(R('#', 6), R('=', 18), R('#', 6)),
  /*  4 */ row(R('#', 5), R('=', 3), R(',', 14), R('=', 3), R('#', 5)),
  /*  5 */ row(R('#', 4), R('=', 3), R(',', 16), R('=', 3), R('#', 4)),
  // --- the drying ground, and the first of the scorch ----------------------
  /*  6 */ row(R('#', 3), R('=', 3), R(',', 8), R('R', 2), R(',', 8), R('=', 3), R('#', 3)),
  /*  7 */ row(R('#', 3), R('=', 3), R(',', 7), R('R', 4), R(',', 7), R('=', 3), R('#', 3)),
  /*  8 */ row(R('#', 2), R('=', 3), R(',', 7), R('R', 6), R(',', 7), R('=', 3), R('#', 2)),
  /*  9 */ row(R('#', 2), R('=', 3), R(',', 6), R('R', 8), R(',', 6), R('=', 3), R('#', 2)),
  /* 10 */ row(R('#', 2), R('=', 2), R(',', 6), R('R', 10), R(',', 6), R('=', 2), R('#', 2)),
  // --- the apron: burnt to the rock, and the ring you walk round the fire ---
  /* 11 */ row(R('#', 2), R('=', 2), R(',', 5), R('R', 12), R(',', 5), R('=', 2), R('#', 2)),
  /* 12 */ row(R('#', 2), R('=', 2), R(',', 5), R('R', 12), R(',', 5), R('=', 2), R('#', 2)),
  /* 13 */ row(R('#', 2), R('=', 2), R(',', 5), R('R', 12), R(',', 5), R('=', 2), R('#', 2)),
  /* 14 */ row(R('#', 2), R('=', 2), R(',', 5), R('R', 12), R(',', 5), R('=', 2), R('#', 2)),
  /* 15 */ row(R('#', 2), R('=', 2), R(',', 6), R('R', 10), R(',', 6), R('=', 2), R('#', 2)),
  /* 16 */ row(R('#', 2), R('=', 3), R(',', 6), R('R', 8), R(',', 6), R('=', 3), R('#', 2)),
  /* 17 */ row(R('#', 2), R('=', 3), R(',', 7), R('R', 6), R(',', 7), R('=', 3), R('#', 2)),
  /* 18 */ row(R('#', 3), R('=', 3), R(',', 7), R('R', 4), R(',', 7), R('=', 3), R('#', 3)),
  /* 19 */ row(R('#', 3), R('=', 3), R(',', 8), R('R', 2), R(',', 8), R('=', 3), R('#', 3)),
  // --- back out to the cool side -------------------------------------------
  /* 20 */ row(R('#', 4), R('=', 3), R(',', 16), R('=', 3), R('#', 4)),
  /* 21 */ row(R('#', 5), R('=', 3), R(',', 14), R('=', 3), R('#', 5)),
  /* 22 */ row(R('#', 6), R('=', 18), R('#', 6)),
  /* 23 */ row(R('#', 8), R('=', 14), R('#', 8)),
  // --- the fuel gate -------------------------------------------------------
  /* 24 */ row(R('#', 12), R('=', 6), R('#', 12)),
  /* 25 */ row(R('#', 12), R('=', 6), R('#', 12)),
];

export const CALDWICK = {
  id: 'caldwick',
  name: 'Caldwick',
  subtitle: 'Two Hundred and Eleven Years Alight',
  kind: 'town',
  light: 'dusk',
  grade: 'dusk',
  fog: ['#d2c8b0', 60, 220],
  tilt: 0.42,
  cameraDistance: 18,
  music: 'solmere',
  base: 'dirt',
  groundRamp: 'terrain',
  wallHeight: 4.8,
  wallMaterial: 'stone',
  lampIntensity: 7,

  sky: {
    zenith: '#4a4468', horizon: '#e0a878', ground: '#4c443a',
    sunColor: '#ffb070', sunDir: [-0.4, 0.3, 0.34], cloud: 0.6,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [14.5, 23], face: 'north' },
    world: { at: [14.5, 23], face: 'north' },
    apron: { at: [17.0, 8.8], face: 'south' },
  },

  exits: [
    { at: [12, 25], size: [6, 1], to: 'overworld', spawn: 'caldwick', prompt: 'The fuel road' },
  ],

  props: [
    // --- the kiln: the reason for all of it ---------------------------------
    { kit: 'building', at: [15.0, 12.5], w: 11, d: 9, h: 5.2, rise: 3.0,
      style: 'stone', roof: 'cone', chimney: true, windows: false, door: 'north', id: 'cw-kiln' },
    { kit: 'signpost', at: [15.0, 15.6], id: 'cw-kilnboard',
      interact: { name: 'The Kiln Book', text: [
        'A slate the size of a door, ruled by hand and rewritten every dawn.',
        'DAY 77,214. DRAWN 40 BUSHEL. CHARGED 40 BUSHEL. HEAT: GOOD.',
        'The word GOOD is in a different chalk from the rest. It has been for a while.',
      ] } },
    { kit: 'savepoint', at: [11.0, 15.6], id: 'cw-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'barrel', at: [11.6, 10.6] },
    { kit: 'barrel', at: [11.9, 11.5] },
    { kit: 'crate', at: [18.6, 10.6], rot: 0.3 },
    { kit: 'crate', at: [18.2, 11.5], rot: -0.4 },
    { kit: 'crate', at: [12.0, 15.0], rot: 0.5 },
    { kit: 'barrel', at: [18.4, 15.2] },
    { kit: 'lamppost', at: [11.4, 8.6] },
    { kit: 'lamppost', at: [18.6, 8.6] },
    { kit: 'lamppost', at: [11.4, 17.4] },
    { kit: 'lamppost', at: [18.6, 17.4] },

    // --- the ring of doors, all of them facing the fire ----------------------
    { kit: 'building', at: [15.0, 4.5], w: 8, d: 3.6, h: 3.5, rise: 1.8,
      style: 'stone', roof: 'slate', chimney: true, door: 'south', id: 'cw-lodge',
      sign: { icon: '⚖', text: 'The Burners\' Lodge', x: -2.8 } },
    { kit: 'building', at: [8.0, 7.0], w: 6, d: 4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'east', id: 'cw-house-a' },
    { kit: 'building', at: [22.0, 7.0], w: 6, d: 4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'tile', timbered: true, door: 'west', rot: 0.05, id: 'cw-house-b' },

    { kit: 'building', at: [5.5, 12.5], w: 6, d: 7, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'slate', timbered: true, balcony: true, chimney: true,
      door: 'east', id: 'cw-inn', enter: 'inn_caldwick', enterPrompt: 'The Slaked Hand',
      sign: { icon: '🛏', text: 'The Slaked Hand', x: -2.4 } },

    { kit: 'building', at: [24.5, 12.5], w: 6, d: 7, h: 3.9, rise: 2.0,
      style: 'stone', roof: 'iron', chimney: true, door: 'west',
      id: 'cw-forge', enter: 'forge_caldwick', enterPrompt: 'Crane\'s Iron',
      sign: { icon: '⚒', text: 'Crane\'s Iron', x: 2.4 } },

    { kit: 'building', at: [8.0, 18.0], w: 6, d: 4, h: 3.4, rise: 1.7,
      style: 'plaster', roof: 'tile', door: 'north', id: 'cw-house-c' },
    { kit: 'building', at: [22.0, 18.0], w: 6, d: 4, h: 3.4, rise: 1.7,
      style: 'plaster', roof: 'tile', door: 'north', rot: -0.06, id: 'cw-house-d' },
    { kit: 'building', at: [10.0, 20.5], w: 6, d: 3.6, h: 3.3, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'north', id: 'cw-house-e' },
    { kit: 'building', at: [20.0, 20.5], w: 6, d: 3.6, h: 3.3, rise: 1.7,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'north', id: 'cw-house-f' },

    // --- the drying ground ----------------------------------------------------
    { kit: 'well', at: [7.0, 9.0], id: 'cw-well', radius: 1.2,
      interact: { name: 'The Slaking Well', text: [
        'Not for drinking. The water goes on the burnt lime, and what comes off it will take the skin off a hand in a breath.',
        'Chained to the winch, a pair of gloves that nobody owns and everybody uses.',
      ] } },
    // A lift pump on a brick plinth, off the apron on the ring road, running.
    // Caldwick is a town organised around one machine that has never been
    // allowed to stop, which is the only place in the world this pump could
    // have run eleven years on a strap somebody filed by hand.
    { kit: 'well', at: [22.0, 15.5], id: 'cw-pump', radius: 1.2, interactRadius: 2.2,
      interact: { prompt: 'The lift pump', event: 'aurelian_pump' } },
    { kit: 'fence', at: [7.4, 5.4], arg: 7, radius: 0 },
    { kit: 'fence', at: [22.6, 5.4], arg: 7, radius: 0 },
    { kit: 'fence', at: [7.4, 19.4], arg: 7, radius: 0 },
    { kit: 'fence', at: [22.6, 19.4], arg: 7, radius: 0 },
    { kit: 'cart', at: [25.0, 18.6], rot: 1.5 },
    { kit: 'cart', at: [5.6, 18.6], rot: 0.3 },
    { kit: 'crate', at: [25.4, 8.0], rot: 0.2 },
    { kit: 'crate', at: [25.0, 9.0], rot: -0.35 },
    { kit: 'barrel', at: [4.8, 7.4] },
    { kit: 'barrel', at: [4.4, 8.3] },
    { kit: 'bench', at: [15.0, 6.4], rot: Math.PI },
    { kit: 'bench', at: [15.0, 18.8], rot: 0 },
    { kit: 'flowerbox', at: [10.4, 3.4] },
    { kit: 'flowerbox', at: [19.6, 3.4] },
    { kit: 'tree', at: [5.4, 4.4], kind: 'dead', scale: 0.9, seed: 3, id: 'cw-tree-nw' },
    { kit: 'tree', at: [24.6, 4.4], kind: 'dead', scale: 1.0, seed: 7 },
    { kit: 'tree', at: [5.6, 21.0], kind: 'dead', scale: 0.95, seed: 11 },
    { kit: 'rock', at: [24.4, 21.2], scale: 1.0, seed: 13 },

    // --- the fuel gate ---------------------------------------------------------
    { kit: 'lamppost', at: [12.4, 23.4] },
    { kit: 'lamppost', at: [17.6, 23.4] },
    // The lodge's own slate, out on the apron beside the kiln wall. In the
    // whole world it is a tally; in the ruined one it is the last line anybody
    // wrote, and the lodge holds its count over it.
    { kit: 'signpost', at: [11.9, 13.4], id: 'cw-apronboard',
      interact: { prompt: 'The apron tally', event: 'caldwick_cold_apron' } },

    { kit: 'signpost', at: [18.4, 22.4], id: 'cw-fuelboard',
      interact: { name: 'The Fuel Board', text: [
        'CORD WANTED. ALL LENGTHS. ALL WEATHERS. PAID AT THE GATE, IN COIN, WITHOUT ARGUMENT.',
        'Underneath, smaller: WE HAVE FOURTEEN DAYS OF WOOD. WE HAVE NEVER HAD FEWER THAN SIXTY.',
      ] } },

    { kit: 'chest', at: [3.5, 16.5], id: 'cw-chest-1',
      contains: { kind: 'gold', amount: 340, label: '340 gil' } },
    { kit: 'chest', at: [26.5, 9.5], id: 'cw-chest-2',
      contains: { kind: 'item', id: 'emberward', count: 1, label: 'an Emberward' } },
    { kit: 'chest', at: [15.0, 3.4], id: 'cw-chest-3',
      contains: { kind: 'item', id: 'hitonic', count: 2, label: '2 Hi-Tonics' } },
    { kit: 'chest', at: [20.6, 16.4], id: 'cw-chest-4',
      contains: { kind: 'item', id: 'emberbrand', count: 1, label: 'an Emberbrand' } },
  ],

  /**
   * Caldwick after. The kiln is out. Nobody in the town has ever seen it out,
   * and there is no procedure for it, because there was never going to be one.
   */
  ruin: {
    subtitle: 'Cold on the Apron',
    light: 'night',
    grade: 'ruin',
    fog: ['#5e5a56', 40, 165],
    music: 'memory',
    sky: {
      zenith: '#2c2c40', horizon: '#7a6a72', ground: '#2a2824',
      sunColor: '#9fb6e8', sunDir: [-0.2, 0.3, -0.4], cloud: 0.94,
    },
    removeNpcs: ['cw-child', 'cw-carter', 'cw-reeve', 'cw-kilnwarden'],
    removeProps: ['cw-tree-nw'],
    npcs: [
      {
        id: 'cw-ruin-warden', name: 'Kilnwarden Rue', at: [15.1, 8.8], face: 'south',
        clip: 'work', prompt: 'Speak',
        look: { build: 'heavy', height: 1.72, hair: 'bald', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#96603f', hair: '#241d26', torso: '#5a3230', accent: '#8a6a23',
            legs: '#5f6572', boots: '#3a2a20', gloves: '#7c4939' } },
        talk: [
          'It went out on a Tuesday. Two hundred and eleven years, and it chose a Tuesday.',
          'I have the relighting written down. Eleven days, four hundred cord, and forty men. I have the eleven days.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [5.4, 4.4], kind: 'dead', scale: 1.3, seed: 501 },
      { kit: 'chest', at: [8.0, 15.0], id: 'cw-ruin-chest',
        contains: { kind: 'item', id: 'cinderheart', count: 1, label: 'a Cinderheart' } },
    ],
  },

  npcs: [
    {
      id: 'cw-quench', name: 'Quench-Yard Factor Halle', at: [21.0, 12.5], face: 'west',
      clip: 'work', prompt: 'Trade',
      look: { build: 'athletic', height: 1.76, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#5b6674', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      shop: 'quench_yard',
      talk: [
        'The Quench is a cooling yard the Engines walked away from and left running. Caldwick has kept one fire alight for two hundred and eleven years, so Caldwick understands the bill.',
        'Wards, hearts and plain steel. I will not sell you a burning sword at any price. The last party that carried one into the pit fed it.',
      ],
    },
    {
      id: 'cw-inn', name: 'Marda Quist', at: [7.7, 12.0], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.63, hair: 'braid', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 38, name: 'The Slaked Hand' },
      talk: [
        'Thirty-eight, and you will not need the blanket. Nobody in Caldwick has needed a blanket since my great-grandmother.',
        'The east rooms are dearer. They face the kiln. I have explained to three generations of visitors that this is not the bargain they think it is.',
      ],
    },
    {
      id: 'cw-smith', name: 'Halber Crane', at: [21.3, 12.0], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.90, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      // An `event` short-circuits `shop`, so the bar has gone to the hand
      // standing next to him rather than closing with Crane's conversation.
      event: 'caldwick_fourth_hour',
      talk: [
        'I have never lit my own forge. I take heat off the kiln down a flue my grandfather cut, and I pay the burners in nails.',
        'It means I cannot work when they are not working. In two hundred years that has cost me eleven days, all of them in one week, and everyone still talks about that week.',
      ],
    },
    {
      id: 'cw-forgehand', name: 'Forge-Hand Bettony', at: [21.4, 13.5], face: 'east', clip: 'work', prompt: 'Trade',
      look: { build: 'athletic', height: 1.68, hair: 'braid', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#4a2a17', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#3a2a20', gloves: '#bda98b' } },
      shop: 'solmere_arms',
      talk: [
        'Crane sets the price and I take the coin, and he has not stood at this trestle since March.',
        'He is on the apron most days now with the reeve and a book. I sell more when he is not here, which I have decided not to tell him.',
      ],
    },
    {
      id: 'cw-kilnwarden', name: 'Kilnwarden Rue', at: [14.5, 8.8], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.72, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#5a3230', accent: '#8a6a23',
          legs: '#5f6572', boots: '#3a2a20', gloves: '#7c4939' } },
      talk: [
        'Forty bushel drawn from the bottom, forty charged in at the top, every day since before the Imperium had a name for itself.',
        'It is not clever. It is only that nobody has ever been allowed to stop, including me, including at my own wedding.',
      ],
    },
    {
      id: 'cw-reeve', name: 'Chalk-Reeve Ondrey', at: [14.5, 22.0], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.68, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      event: 'caldwick_flue_arithmetic',
      talk: [
        'I weigh what goes out of that gate and I weigh what comes in, and the two numbers have been drifting apart since the spring.',
        'Not stealing. Nobody steals lime, it is heavy and it eats your cart. The kiln is simply giving less back than it is being fed.',
      ],
    },
    {
      id: 'cw-burner', name: 'Burner Fettle', at: [16.5, 15.7], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.76, hair: 'wild',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#6b5d37', accent: '#b34a41',
          legs: '#4b382d', boots: '#3a2a20', gloves: '#bda98b' } },
      event: 'caldwick_lodge_notice',
      talk: [
        'Four hours on the apron, four hours off, and you drink the whole four hours you are off. It is not enjoyment. It is arithmetic.',
        'You can read a burner by his eyebrows. I have not had mine since I was nineteen.',
      ],
    },
    {
      id: 'cw-factor', name: 'Lime-Factor Vosk', at: [21.5, 9.0], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'slim', height: 1.74, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#5e5163', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#414954', boots: '#3b3943', cape: '#38224f' } },
      talk: [
        'Mortar for the Engine City, plaster for Solmere, and a barrel a month to a man in Ferran who will not say what he does with it.',
        'They think they are buying stone dust. They are buying two hundred years of somebody not going to bed.',
      ],
    },
    {
      id: 'cw-carter', name: 'Carter Nunn', at: [7.5, 20.25], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.70, hair: 'short',
        colors: { skin: '#dbb28c', hair: '#bd8746', torso: '#496035', accent: '#5a3230',
          legs: '#6b5d37', boots: '#4b382d' } },
      event: 'caldwick_short_cord',
      talk: [
        'I bring wood in and I take dust out, and the cart is the same cart, which is why it is white on the inside and black on the outside.',
        'Fourteen days of fuel on the yard. I have carted here nineteen years and I have never come in on a yard I could see across.',
      ],
    },
    {
      id: 'cw-widow', name: 'Widow Skeeling', at: [7.6, 9.5], face: 'south', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.58, hair: 'bob', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#4e326c', accent: '#95836b',
          legs: '#4b382d', boots: '#3a2a20' } },
      talk: [
        'We were four rings out when I married. We are two rings in now. You may say that as a rise if you like. My knees do not.',
        'The nearer you live to it the less you sleep and the more you are worth. Somebody clever arranged that and it was not us.',
      ],
    },
    {
      id: 'cw-child', name: 'Ash-Girl Tibb', at: [11.5, 16.5], face: 'east', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.22, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'I rake the apron. You have to go round it the same way every time or you tread the hot into the cold and then somebody shouts.',
        'Widdershins in the morning, sunwise after. Everyone in the town walks the ring the right way without being told. Watch them. They do.',
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
  fog: ['#2a221a', 22, 70],
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

export const INN_CALDWICK = {
  ...ROOM_BASE,
  id: 'inn_caldwick',
  name: 'The Slaked Hand',
  subtitle: 'Caldwick',
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
  ], 'inn_caldwick'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'caldwick', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [4.5, 3.0], rot: 0 },
    { kit: 'bench', at: [4.5, 4.8], rot: 0 },
    { kit: 'bench', at: [12.5, 3.0], rot: 0 },
    { kit: 'bench', at: [12.5, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.8, 2.4] },
    { kit: 'crate', at: [15.2, 1.7], rot: 0.3 },
    { kit: 'crate', at: [15.0, 2.8], rot: -0.2 },
    { kit: 'lamppost', at: [6.0, 1.6] },
    { kit: 'lamppost', at: [11.5, 1.6] },
    { kit: 'flowerbox', at: [8.6, 5.4] },
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-cw-chest',
      contains: { kind: 'item', id: 'steadyband', count: 1, label: 'a Steady Band' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-cw-board',
      interact: { name: 'The Shift Board', text: [
        'Four columns of names, ruled to the edge of the slate and then continued on the wall in pencil.',
        'A note pinned at the bottom: IF YOUR NAME IS NOT HERE YOU ARE NOT ON. DO NOT COME UP AND HELP. IT IS WORSE.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-cw-keeper', name: 'Marda Quist', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.63, hair: 'braid', expression: 'happy',
        colors: { skin: '#c08865', hair: '#5e5163', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 38, name: 'The Slaked Hand' },
      talk: ['Thirty-eight. The shift changes at four and at eight and at midnight, and this house is on the corner of all three.'],
    },
    {
      id: 'inn-cw-guest', name: 'Off-Shift Burner', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'athletic', height: 1.79, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#7c4939', accent: '#b34a41',
          legs: '#4b382d', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'Do not ask me what it is like in there. I will tell you, and then you will have to buy me another one, and then I will tell you again.',
        'There is a mark on the inner wall at shoulder height. Nobody made it. It has been getting higher since the thaw.',
      ],
    },
  ],
};

export const FORGE_CALDWICK = {
  ...ROOM_BASE,
  id: 'forge_caldwick',
  name: "Crane's Iron",
  subtitle: 'Caldwick',
  base: 'cobble',
  music: 'solmere',
  terrain: makeRoom(16, [
    '################',
    '#==============#',
    '#==============#',
    '#==============#',
    '#==============#',
    '#######==#######',
  ], 'forge_caldwick'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'caldwick', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.7, 2.5] },
    { kit: 'crate', at: [13.2, 1.6], rot: 0.4 },
    { kit: 'crate', at: [13.0, 2.7], rot: -0.2 },
    { kit: 'lamppost', at: [4.5, 1.5] },
    { kit: 'lamppost', at: [11.5, 1.5] },
    { kit: 'chest', at: [13.4, 3.8], id: 'forge-cw-chest',
      contains: { kind: 'item', id: 'guardsabre', count: 1, label: 'a Guard Sabre' } },
  ],

  npcs: [
    {
      id: 'forge-cw-smith', name: 'Halber Crane', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'hulking', height: 1.90, hair: 'topknot', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#4b382d' } },
      shop: 'solmere_arms',
      talk: ['That grating in the floor is the flue. Do not stand on it, do not drop anything down it, and do not ask what it sounds like at night.'],
    },
  ],
};

export const CALDWICK_INTERIORS = {
  inn_caldwick: INN_CALDWICK,
  forge_caldwick: FORGE_CALDWICK,
};
