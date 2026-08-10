/**
 * Bellfoundry — a town divided by how much noise you are allowed to make.
 *
 * Casting a bell is the loudest week of work anybody does. Tuning one is the
 * quietest: a man with a scraper and an ear, listening for a beat two hundred
 * times a day. Bellfoundry does both, and four centuries ago it gave up trying
 * to do them in the same place.
 *
 * So the map is split down the middle by the Muffle — a wall two rods thick
 * with one gate in it — and the two halves are opposites in every material on
 * the ground. West is the Loud Side: cobble, scorched casting floor, the
 * foundry, the loam sheds, the trial pit where every bell is rung before it
 * leaves. East is the Quiet Side: grass, straw-laid lanes, houses set well
 * apart, and a planted screen of limes along the whole length of the wall,
 * because trees eat sound and the tuners costed it.
 *
 * The gate is the only way through and it is deliberately narrow, which is the
 * town's oldest running argument: a finished bell will not fit it, so every
 * bell that has ever been tuned went the long way round outside the wall. The
 * player crosses at one point, and the moment they do the ground, the buildings
 * and the spacing all change under them at once.
 */

const W = 34;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[bellfoundry] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** Sixteen columns of Loud Side, two of Muffle, twelve of Quiet Side. */
const SPLIT = (loud, gate, quiet) => row(R('#', 2), loud, gate, quiet, R('#', 2));
const WALL = () => R('#', 2);

const PAVED = () => R('=', 16);
const YARD = () => R('=', 2) + R('R', 12) + R('=', 2);
const PIT = () => R('=', 3) + R('R', 10) + R('=', 3);

const GREEN = () => R('t', 1) + R('.', 11);
const OPEN = () => R('.', 12);
const LANE = () => R('t', 1) + R('.', 1) + R(',', 8) + R('.', 2);

const TERRAIN = [
  /*  0 */ row(R('#', 34)),
  /*  1 */ row(R('#', 34)),
  /*  2 */ SPLIT(PAVED(), WALL(), OPEN()),
  /*  3 */ SPLIT(PAVED(), WALL(), OPEN()),
  // --- the casting floor, burnt to the rock --------------------------------
  /*  4 */ SPLIT(YARD(), WALL(), LANE()),
  /*  5 */ SPLIT(YARD(), WALL(), LANE()),
  /*  6 */ SPLIT(YARD(), WALL(), GREEN()),
  /*  7 */ SPLIT(YARD(), WALL(), GREEN()),
  /*  8 */ SPLIT(YARD(), WALL(), GREEN()),
  /*  9 */ SPLIT(YARD(), WALL(), GREEN()),
  /* 10 */ SPLIT(PAVED(), WALL(), LANE()),
  /* 11 */ SPLIT(PAVED(), WALL(), LANE()),
  // --- the Muffle gate, and the only crossing in the town ------------------
  /* 12 */ SPLIT(PAVED(), R(',', 2), R(',', 12)),
  /* 13 */ SPLIT(PAVED(), R(',', 2), R(',', 12)),
  // --- the trial pit, where every bell is proved ---------------------------
  /* 14 */ SPLIT(PIT(), WALL(), LANE()),
  /* 15 */ SPLIT(PIT(), WALL(), LANE()),
  /* 16 */ SPLIT(PIT(), WALL(), GREEN()),
  /* 17 */ SPLIT(PIT(), WALL(), GREEN()),
  /* 18 */ SPLIT(PAVED(), WALL(), GREEN()),
  /* 19 */ SPLIT(PAVED(), WALL(), GREEN()),
  /* 20 */ SPLIT(PAVED(), WALL(), LANE()),
  /* 21 */ SPLIT(PAVED(), WALL(), LANE()),
  /* 22 */ SPLIT(PAVED(), WALL(), OPEN()),
  /* 23 */ SPLIT(PAVED(), WALL(), OPEN()),
  /* 24 */ row(R('#', 6), R('=', 4), R('#', 24)),
  /* 25 */ row(R('#', 34)),
];

export const BELLFOUNDRY = {
  id: 'bellfoundry',
  name: 'Bellfoundry',
  subtitle: 'The Loud Side and the Other One',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#c0bcae', 85, 265],
  tilt: 0.42,
  cameraDistance: 18,
  music: 'bell_town',
  base: 'cobble',
  groundRamp: 'terrain',
  wallHeight: 5.0,
  wallMaterial: 'stone',

  sky: {
    zenith: '#3f74a4', horizon: '#dbceb0', ground: '#5c584a',
    sunColor: '#ffe2b2', sunDir: [0.38, 0.56, 0.36], cloud: 0.54,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [7.5, 23], face: 'north' },
    world: { at: [7.5, 23], face: 'north' },
    muffle: { at: [18.5, 12.5], face: 'east' },
    quiet: { at: [25, 12.5], face: 'east' },
  },

  exits: [
    { at: [6, 24], size: [4, 1], to: 'overworld', spawn: 'bellfoundry_yardgate', prompt: 'The yard gate' },
  ],

  props: [
    // --- the Loud Side ---------------------------------------------------------
    { kit: 'building', at: [9.0, 6.5], w: 12, d: 6, h: 6.0, rise: 3.0,
      style: 'stone', roof: 'iron', chimney: true, windows: false, door: 'south', id: 'bf-foundry',
      sign: { icon: '⚒', text: 'The Casting House', x: -4.4 } },
    { kit: 'building', at: [4.0, 3.4], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'stone', roof: 'slate', door: 'south', id: 'bf-h-c' },
    { kit: 'building', at: [15.0, 3.4], w: 4, d: 3.4, h: 3.4, rise: 1.8,
      style: 'stone', roof: 'slate', door: 'south', id: 'bf-h-d' },
    { kit: 'building', at: [4.6, 11.5], w: 6, d: 6.4, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'slate', timbered: true, balcony: true, chimney: true,
      door: 'east', id: 'bf-inn', enter: 'inn_bellfoundry', enterPrompt: 'The Clapper',
      sign: { icon: '🛏', text: 'The Clapper', x: -2.2 } },
    { kit: 'building', at: [14.0, 11.0], w: 6, d: 4, h: 3.8, rise: 2.0,
      style: 'stone', roof: 'iron', chimney: true, door: 'west', id: 'bf-loamshed',
      sign: { icon: '⚒', text: 'The Loam Shed', x: 2.2 } },
    { kit: 'building', at: [9.5, 15.5], w: 7, d: 5, h: 1.2, rise: 0.2,
      style: 'stone', roof: 'flat', windows: false, door: null, id: 'bf-pit' },
    { kit: 'building', at: [14.5, 19.5], w: 6, d: 4, h: 3.6, rise: 1.9,
      style: 'stone', roof: 'slate', door: 'north', id: 'bf-store',
      sign: { icon: '⚖', text: 'The Metal Store', x: -2.2 } },
    { kit: 'building', at: [4.6, 19.5], w: 5, d: 4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'slate', timbered: true, door: 'north', id: 'bf-h-a' },
    { kit: 'building', at: [9.5, 21.8], w: 5, d: 3.4, h: 3.3, rise: 1.7,
      style: 'plaster', roof: 'slate', door: 'north', id: 'bf-h-b' },

    { kit: 'fence', at: [9.5, 13.6], arg: 9, radius: 0 },
    { kit: 'fence', at: [9.5, 17.4], arg: 9, radius: 0 },
    { kit: 'signpost', at: [13.4, 15.4], id: 'bf-pitboard',
      interact: { name: 'The Trial Board', text: [
        'EVERY BELL IS RUNG IN THE PIT BEFORE IT LEAVES. NO BELL LEAVES UNRUNG. NO EXCEPTIONS HAVE EVER BEEN MADE.',
        'Under it, a list of the last nine trials with a note against each. Six say GOOD. Two say CRACKED, WITH REGRET. One says WOULD NOT STOP.',
      ] } },
    { kit: 'savepoint', at: [6.0, 15.4], id: 'bf-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'barrel', at: [3.0, 6.4] },
    { kit: 'barrel', at: [3.0, 7.4] },
    { kit: 'crate', at: [16.4, 6.4], rot: 0.3 },
    { kit: 'crate', at: [16.4, 7.6], rot: -0.25 },
    { kit: 'cart', at: [3.4, 17.6], rot: 1.4 },
    { kit: 'cart', at: [16.0, 22.4], rot: 0.3 },
    { kit: 'lamppost', at: [7.0, 10.4] },
    { kit: 'lamppost', at: [12.4, 10.4] },
    { kit: 'lamppost', at: [7.0, 20.4] },
    { kit: 'lamppost', at: [12.4, 20.4] },
    { kit: 'stall', at: [7.0, 12.6], arg: '#8b2a2c', id: 'bf-stall-1' },
    { kit: 'stall', at: [12.0, 12.6], arg: '#8a6a23', id: 'bf-stall-2' },
    { kit: 'chest', at: [16.6, 15.4], id: 'bf-chest-pit',
      contains: { kind: 'gold', amount: 350, label: '350 gil' } },
    { kit: 'chest', at: [2.6, 22.6], id: 'bf-chest-yard',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },
    { kit: 'signpost', at: [6.4, 23.4], id: 'bf-gateboard',
      interact: { name: 'The Yard Gate Notice', text: [
        'BELLS OUT BY THIS GATE ONLY. THE MUFFLE IS FOR PERSONS.',
        'Beneath, in a hand that has clearly written it more than once: A BELL HAS NEVER FITTED THROUGH THE MUFFLE. NOBODY IS GOING TO WIDEN THE MUFFLE. STOP ASKING.',
      ] } },

    // --- the Muffle ---------------------------------------------------------------
    { kit: 'lamppost', at: [17.4, 12.4] },
    { kit: 'lamppost', at: [20.6, 12.4] },
    { kit: 'signpost', at: [20.6, 13.6], id: 'bf-muffleboard',
      interact: { name: 'The Muffle Order', text: [
        'BEYOND THIS GATE: NO CART, NO IRON-SHOD BEAST, NO HAMMER, NO DOG, NO SINGING BETWEEN THE HOURS.',
        'THE STRAW IS LAID DAILY AND IS PAID FOR BY THE TUNING HOUSE. WALK ON IT.',
      ] } },

    // --- the Quiet Side -------------------------------------------------------------
    { kit: 'building', at: [26.0, 8.0], w: 7, d: 4.4, h: 3.6, rise: 1.9,
      style: 'plaster', roof: 'tile', awning: true, door: 'south',
      id: 'bf-shop', enter: 'shop_bellfoundry', enterPrompt: 'The Long Note',
      sign: { icon: '🧪', text: 'The Long Note', x: -2.6 } },
    { kit: 'building', at: [24.0, 4.0], w: 5, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', id: 'bf-q-a' },
    { kit: 'building', at: [29.6, 4.0], w: 4, d: 3.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', rot: 0.05, id: 'bf-q-b' },
    { kit: 'building', at: [23.0, 17.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'south', id: 'bf-q-c' },
    { kit: 'building', at: [29.0, 17.0], w: 5, d: 3.6, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'south', rot: -0.05, id: 'bf-q-d' },
    { kit: 'building', at: [26.0, 21.6], w: 7, d: 4, h: 4.0, rise: 2.4,
      style: 'stone', roof: 'slate', chimney: true, door: 'north', id: 'bf-tuninghouse',
      sign: { icon: '⚖', text: 'The Tuning House', x: -2.6 } },
    { kit: 'well', at: [30.4, 12.6], id: 'bf-well', radius: 1.2,
      interact: { name: 'The Quiet Well', text: [
        'The winch is leathered, the chain is sleeved and the bucket has a felt rim. Drawing water here makes almost no sound at all.',
        'Cut into the coping, and very old: A TUNER HEARS THE BEAT. THE BEAT IS TWO NOTES ARGUING. DO NOT ADD A THIRD.',
      ] } },
    { kit: 'bench', at: [23.4, 12.0], rot: Math.PI },
    { kit: 'bench', at: [27.0, 14.0], rot: 0 },
    { kit: 'flowerbox', at: [22.4, 10.4] },
    { kit: 'flowerbox', at: [28.4, 10.4] },
    { kit: 'bush', at: [22.0, 20.0], scale: 1.0, seed: 17, radius: 0 },
    { kit: 'bush', at: [30.0, 20.0], scale: 1.05, seed: 19, radius: 0 },
    { kit: 'tree', at: [25.0, 2.6], kind: 'broadleaf', scale: 1.1, seed: 3, id: 'bf-tree-n' },
    { kit: 'tree', at: [29.0, 23.0], kind: 'broadleaf', scale: 1.05, seed: 7, id: 'bf-tree-s' },
    { kit: 'chest', at: [31.4, 22.6], id: 'bf-chest-quiet',
      contains: { kind: 'item', id: 'echostone', count: 1, label: 'an Echo Stone' } },
    { kit: 'chest', at: [31.4, 6.6], id: 'bf-chest-lane',
      contains: { kind: 'item', id: 'wakefulcharm', count: 1, label: 'a Wakeful Charm' } },
    { kit: 'signpost', at: [22.4, 5.6], id: 'bf-strawboard',
      interact: { name: 'The Straw Roster', text: [
        'Whose week it is to lay the straw, going back four years, in a column of small neat names.',
        'Against one name, a note: LAID GRAVEL. HAS BEEN SPOKEN TO. The handwriting is trembling with a rage it is not permitted to make a noise about.',
      ] } },
  ],

  /**
   * Bellfoundry after. The casting house is cold and the trial pit is empty,
   * and the Quiet Side has got its wish at last and cannot bear it. The rule
   * about noise is still enforced, by one man, against nobody.
   */
  ruin: {
    subtitle: 'Both Sides Quiet',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#86847a', 46, 175],
    music: 'memory',
    sky: {
      zenith: '#47415a', horizon: '#b79881', ground: '#37342d',
      sunColor: '#ff9d63', sunDir: [-0.34, 0.22, 0.36], cloud: 0.93,
    },
    removeNpcs: ['bf-child', 'bf-moulder', 'bf-hauler', 'bf-tuner'],
    removeProps: ['bf-tree-n', 'bf-tree-s'],
    npcs: [
      {
        id: 'bf-ruin-tuner', name: 'Tuner Hesk', at: [26.0, 12.0], face: 'west',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'slim', height: 1.69, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#2c5a45', accent: '#ddccab',
            legs: '#414954', boots: '#4b382d', gloves: '#95836b' } },
        talk: [
          'Forty years I asked the Loud Side to be quieter. I would give the whole of my hearing to have one hour of it back.',
          'You cannot tune in silence. You need something to argue with. There is nothing on the other side of that wall to argue with any more.',
        ],
      },
    ],
    props: [
      { kit: 'chest', at: [9.5, 12.6], id: 'bf-ruin-chest',
        contains: { kind: 'item', id: 'bellringer', count: 1, label: 'a Bellringer' } },
    ],
  },

  npcs: [
    {
      id: 'bf-inn', name: 'Cass Orrick', at: [7.6, 10.6], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 40, name: 'The Clapper' },
      talk: [
        'Forty. I will not pretend it is quiet. There is a house on the other side of the wall that is quiet and it charges sixty for it.',
        'People come back to me. They say the silence over there gets into your ears and starts making its own noise. I do not argue with a returning customer.',
      ],
    },
    {
      id: 'bf-shop', name: 'Peverel Hesk', at: [26.0, 10.4], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.70, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'solmere_items',
      talk: [
        'Nothing on my shelves rattles. Everything is bedded in wool or felt and the door has a leather shoe on it, and it took me two years to get all of that right.',
        'I sell to the Loud Side as well. They come through the gate, they shout their order out of habit, and I let them, because they always look so embarrassed afterwards.',
      ],
    },
    {
      id: 'bf-founder', name: 'Master Founder Kelsall', at: [9.0, 9.6], face: 'south', clip: 'work',
      prompt: 'Speak', facePlayer: true,
      look: { build: 'hulking', height: 1.89, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#5a3230', accent: '#7c4939',
          legs: '#5f6572', boots: '#2b2933', gloves: '#bda98b' } },
      talk: [
        'Nine tons of metal, one pour, and eleven weeks of loam work behind it. If the pour goes wrong you do not fix it. You break the whole thing up and start in the spring.',
        'They say we are the noisy half. We are noisy for six days a year. The rest of it is men standing in a shed watching clay dry, in total silence, and nobody has ever thanked us for that either.',
      ],
    },
    {
      id: 'bf-tuner', name: 'Tuner Hesk', at: [24.0, 12.0], face: 'west', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.69, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#2c5a45', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d', gloves: '#95836b' } },
      talk: [
        'I take metal off the inside with a scraper until two notes stop arguing. A day of that is perhaps a spoonful of bronze.',
        'One cart on the lane and I lose the beat and the morning with it. That is the whole of the rule, and every visitor thinks it is grandeur, and it is arithmetic.',
      ],
    },
    {
      id: 'bf-moulder', name: 'Loam-Moulder Vey', at: [11.0, 10.6], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'athletic', height: 1.74, hair: 'braid',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#6b5d37', accent: '#b34a41',
          legs: '#5e412c', boots: '#3a2a20', gloves: '#bda98b' } },
      talk: [
        'Clay, horse dung, goat hair and beer. That is a bell mould, and if you laughed just then you have never had one crack on you.',
        'The shape is drawn with a board on a spindle. One line, turned round once. Everything a bell is, is in that one line.',
      ],
    },
    {
      id: 'bf-hauler', name: 'Hauler Dunnage', at: [14.0, 22.4], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.87, hair: 'topknot',
        colors: { skin: '#c08865', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#4b382d', gloves: '#4b382d' } },
      talk: [
        'Out of the yard gate, a mile round the outside of the wall, and back in at the tuners\' end. For a thing that starts and finishes four hundred yards apart.',
        'Four hundred years and nobody has widened the Muffle, because the Quiet Side would have to agree to it, and the Quiet Side has noticed what a wide gate would let through.',
      ],
    },
    {
      id: 'bf-warden', name: 'Quiet-Warden Prow', at: [21.0, 13.0], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'normal', height: 1.71, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#5e5163', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', cape: '#38224f' } },
      talk: [
        'Boots on the straw, please, and if you have anything loose about you, hold it. I am not being fussy. I am being paid.',
        'Two shillings for a shout, four for a hammer, and a full crown for a dog. The dog rate has not been collected in nine years and I keep it on the board as a deterrent.',
      ],
    },
    {
      id: 'bf-deaf', name: 'Old Founder Tibbald', at: [28.0, 12.0], face: 'south', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.62, hair: 'short', expression: 'neutral', eyeStyle: 'closed',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#95836b', accent: '#496035',
          legs: '#6b5d37', boots: '#4b382d' } },
      talk: [
        'Forty-one years at the furnace, and I bought a house on this side the week I could no longer hear a word of what anybody said in it.',
        'They think it is a joke. It is not a joke. Over there they would have to shout at me and I would have to watch them doing it.',
      ],
    },
    {
      id: 'bf-landlady', name: 'Mistress Pell', at: [24.0, 19.4], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.64, hair: 'braid', expression: 'happy',
        colors: { skin: '#e7c39c', hair: '#bd8746', torso: '#4e326c', accent: '#ffd76a',
          legs: '#414954', boots: '#4b382d' } },
      talk: [
        'Six tuners in six rooms and every one of them wants the room at the back, and there is only one room at the back.',
        'I let it by seniority. It has caused more bad feeling in this house than money ever has, and none of it is ever said above a whisper.',
      ],
    },
    {
      id: 'bf-child', name: 'Tam', at: [11.0, 19.0], face: 'east', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.23, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#dcae8a', hair: '#6d4020', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#5e412c', boots: '#4b382d' } },
      talk: [
        'I am not allowed through the gate. Not banned exactly. It is that everybody over there looks at you until you come back.',
        'When they ring one in the pit you feel it in your teeth before you hear it. Everybody on this side stops what they are doing and grins. Nobody admits to the grinning.',
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
  fog: ['#221f1a', 22, 70],
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

export const INN_BELLFOUNDRY = {
  ...ROOM_BASE,
  id: 'inn_bellfoundry',
  name: 'The Clapper',
  subtitle: 'Bellfoundry',
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
  ], 'inn_bellfoundry'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'bellfoundry', spawn: 'default', prompt: 'Outside' }],

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
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-bf-chest',
      contains: { kind: 'item', id: 'emberward', count: 1, label: 'an Emberward' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-bf-board',
      interact: { name: 'The Peal Board', text: [
        'Every bell cast in this town, its weight, its note and where it went, in six columns going back further than the paper should allow.',
        'The last line has no destination. WEIGHT: NINE TON ONE. NOTE: NOT YET SETTLED. It has read that for two years.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-bf-keeper', name: 'Cass Orrick', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.66, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#8a6a23', accent: '#ddccab',
          legs: '#5e412c', boots: '#4b382d' } },
      inn: { price: 40, name: 'The Clapper' },
      talk: ['Forty. If they are proving one in the pit at six, you will know about it, and no, I will not take anything off for that.'],
    },
    {
      id: 'inn-bf-guest', name: 'Parish Buyer', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.73, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#414954', boots: '#3a2a20', cape: '#38224f' } },
      talk: [
        'Eleven parishes subscribed for four years to buy one bell and they have sent me to make sure it is the right one.',
        'I cannot read a note. I have told them so twice in writing. I shall stand at the pit, it shall be rung, and I shall nod, and that will be four years of somebody\'s money.',
      ],
    },
  ],
};

export const SHOP_BELLFOUNDRY = {
  ...ROOM_BASE,
  id: 'shop_bellfoundry',
  name: 'The Long Note',
  subtitle: 'Bellfoundry',
  music: 'shop',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_bellfoundry'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'bellfoundry', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.6, 2.6], rot: -0.3 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.6, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.8, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-bf-chest',
      contains: { kind: 'gold', amount: 260, label: '260 gil' } },
  ],

  npcs: [
    {
      id: 'shop-bf-keeper', name: 'Peverel Hesk', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.70, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'solmere_items',
      talk: ['Everything is packed in wool before it leaves the counter. It is not care for the goods. It is that a customer walking home rattling is a customer I hear about.'],
    },
  ],
};

export const BELLFOUNDRY_INTERIORS = {
  inn_bellfoundry: INN_BELLFOUNDRY,
  shop_bellfoundry: SHOP_BELLFOUNDRY,
};
