/**
 * Thistlebeck — one town, two of everything.
 *
 * The beck runs in a rock channel eleven fathoms down and has never once been
 * forded, dammed or diverted. There is a bridge. There has only ever been one
 * bridge, and the arguments about building a second are older than the families
 * having them.
 *
 * So the plan is two towns pretending to be one. The Old Side to the west is
 * paved to the wall and packed solid — it ran out of room three centuries ago
 * and simply built taller. The Farther Side to the east is grass and gardens
 * and set-back houses, because it had all the room in the world and no reason
 * to hurry. Each half has its own well, its own bell and its own opinions,
 * because it turned out to be easier to duplicate a town than to cross fifty
 * feet of air.
 *
 * And the bridge does not line up. It lands on the Old Side halfway down a
 * lane and on the Farther Side two doors north of the high street, so every
 * crossing ends in a jog. Both halves blame the other for this. Both are right.
 */

const W = 34;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[thistlebeck] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

/** Old Side paving, the gorge, Farther Side gardens with its north lane. */
const SPLIT = () => row(R('#', 2), R('=', 13), R('^', 1), R('~', 2), R('^', 1),
  R('.', 4), R(',', 5), R('.', 4), R('#', 2));

const TERRAIN = [
  /*  0 */ row(R('#', 34)),
  /*  1 */ row(R('#', 34)),
  // --- the top of the town, unpaved on both banks ---------------------------
  /*  2 */ row(R('#', 2), R(',', 13), R('^', 1), R('~', 2), R('^', 1), R('.', 13), R('#', 2)),
  /*  3 */ row(R('#', 2), R(',', 13), R('^', 1), R('~', 2), R('^', 1), R('.', 13), R('#', 2)),
  // --- the Old Side paved solid; the Farther Side still mostly garden -------
  /*  4 */ SPLIT(),
  /*  5 */ SPLIT(),
  /*  6 */ SPLIT(),
  /*  7 */ SPLIT(),
  /*  8 */ SPLIT(),
  /*  9 */ SPLIT(),
  /* 10 */ SPLIT(),
  /* 11 */ SPLIT(),
  // --- the crossing. The only one. ------------------------------------------
  /* 12 */ row(R('#', 2), R('=', 13), R(':', 4), R(',', 5), R('.', 8), R('#', 2)),
  /* 13 */ row(R('#', 2), R('=', 13), R(':', 4), R(',', 5), R('.', 8), R('#', 2)),
  // --- the Farther Side's high street, two doors adrift of the bridge -------
  /* 14 */ row(R('#', 2), R('=', 13), R('^', 1), R('~', 2), R('^', 1), R(',', 13), R('#', 2)),
  /* 15 */ row(R('#', 2), R('=', 13), R('^', 1), R('~', 2), R('^', 1), R(',', 13), R('#', 2)),
  /* 16 */ SPLIT(),
  /* 17 */ SPLIT(),
  /* 18 */ SPLIT(),
  /* 19 */ SPLIT(),
  /* 20 */ SPLIT(),
  /* 21 */ SPLIT(),
  /* 22 */ row(R('#', 2), R(',', 13), R('^', 1), R('~', 2), R('^', 1), R('.', 13), R('#', 2)),
  /* 23 */ row(R('#', 2), R(',', 13), R('^', 1), R('~', 2), R('^', 1), R('.', 13), R('#', 2)),
  // --- the road out, and it is on the Old Side, which the Farther Side minds -
  /* 24 */ row(R('#', 6), R(',', 4), R('#', 24)),
  /* 25 */ row(R('#', 6), R(',', 4), R('#', 24)),
];

export const THISTLEBECK = {
  id: 'thistlebeck',
  name: 'Thistlebeck',
  subtitle: 'One Bridge, Two Minds',
  kind: 'town',
  light: 'day',
  grade: 'dawn',
  fog: ['#aebcb8', 85, 270],
  tilt: 0.42,
  cameraDistance: 17,
  music: 'town_bazaar',
  base: 'grass',
  groundRamp: 'terrain',
  wallHeight: 5.4,
  wallMaterial: 'rock',
  waterLevel: -0.6,
  water: { shallow: '#3a6f7c', deep: '#12303c', foam: '#a8cdd4' },

  sky: {
    zenith: '#2f6a9c', horizon: '#d4cbb4', ground: '#5c5a4c',
    sunColor: '#ffdfae', sunDir: [0.42, 0.52, 0.44], cloud: 0.62,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [7.5, 23], face: 'north' },
    world: { at: [7.5, 23], face: 'north' },
    bridge: { at: [15.5, 12.5], face: 'east' },
  },

  exits: [
    { at: [6, 25], size: [4, 1], to: 'overworld', spawn: 'thistlebeck', prompt: 'The Old Side road' },
  ],

  props: [
    // --- the crossing ---------------------------------------------------------
    { kit: 'bridge', at: [17, 13], arg: 9, rot: Math.PI / 2, solid: false, y: -0.05, id: 'tb-bridge' },
    { kit: 'lamppost', at: [14.5, 11.6] },
    { kit: 'lamppost', at: [14.5, 14.4] },
    { kit: 'lamppost', at: [19.5, 11.6] },
    { kit: 'lamppost', at: [19.5, 14.4] },
    { kit: 'fence', at: [14.7, 8.0], arg: 14, rot: Math.PI / 2, radius: 0 },
    { kit: 'fence', at: [14.7, 19.0], arg: 14, rot: Math.PI / 2, radius: 0 },
    { kit: 'fence', at: [19.3, 8.0], arg: 14, rot: Math.PI / 2, radius: 0 },
    { kit: 'fence', at: [19.3, 21.5], arg: 7, rot: Math.PI / 2, radius: 0 },
    { kit: 'savepoint', at: [13.8, 14.4], id: 'tb-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [13.6, 11.4], id: 'tb-westboard',
      interact: { name: 'Old Side Notice', text: [
        'THE BRIDGE IS OF THE OLD SIDE. THE OLD SIDE MAINTAINS IT. THE OLD SIDE WILL SAY WHEN IT IS SWEPT.',
        'Somebody has nailed a smaller board beneath, in a neater hand: THE OLD SIDE HAS NOT SWEPT IT SINCE THE FLOOD.',
      ] } },
    { kit: 'signpost', at: [20.4, 14.6], id: 'tb-eastboard',
      interact: { name: 'Farther Side Notice', text: [
        'SUBSCRIPTIONS TOWARD A SECOND BRIDGE — TAKEN HERE, FOURTH YEAR OF ASKING.',
        'The tally below shows 214 gil. A second column, added later and much longer, shows what has been spent arguing about where to put it.',
      ] } },

    // --- the Old Side: paved to the wall, built upward ------------------------
    { kit: 'building', at: [4.5, 5.5], w: 8, d: 4.4, h: 3.6, storeys: 2, rise: 2.0,
      style: 'plaster', roof: 'slate', timbered: true, door: 'east', id: 'tb-w-a' },
    { kit: 'building', at: [12.5, 5.5], w: 8, d: 4.4, h: 3.6, storeys: 2, rise: 2.0,
      style: 'plaster', roof: 'slate', timbered: true, door: 'west', id: 'tb-w-d' },
    { kit: 'building', at: [4.5, 9.0], w: 8, d: 4.4, h: 3.5, storeys: 2, rise: 1.9,
      style: 'plaster', roof: 'tile', timbered: true, door: 'east', rot: 0.04, id: 'tb-w-b' },
    { kit: 'building', at: [12.5, 9.0], w: 8, d: 4.4, h: 3.5, storeys: 2, rise: 1.9,
      style: 'stone', roof: 'slate', chimney: true, door: 'west', id: 'tb-w-e' },

    { kit: 'building', at: [4.6, 16.8], w: 8, d: 6.4, h: 3.6, storeys: 2, rise: 2.2,
      style: 'plaster', roof: 'slate', timbered: true, balcony: true, chimney: true,
      door: 'east', id: 'tb-inn', enter: 'inn_thistlebeck', enterPrompt: 'The Farther Bank',
      sign: { icon: '🛏', text: 'The Farther Bank', x: -2.8 } },

    { kit: 'building', at: [12.5, 16.8], w: 8, d: 6, h: 4.4, rise: 2.6,
      style: 'stone', roof: 'slate', door: 'west', id: 'tb-w-bell',
      sign: { icon: '⚖', text: 'The Old Bell', x: 2.8 } },

    { kit: 'building', at: [4.5, 20.5], w: 8, d: 4.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'east', id: 'tb-w-c' },
    { kit: 'building', at: [12.5, 20.5], w: 8, d: 4.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'west', rot: -0.05, id: 'tb-w-g' },

    { kit: 'well', at: [8.5, 12.0], id: 'tb-well-west', radius: 1.2,
      interact: { name: 'The Old Side Well', text: [
        'Cut through ninety feet of rock in a year when the town was one town and could agree to pay for a thing.',
        'The rim is carved: FOR THISTLEBECK. Someone has since added, deeply and badly: (THIS SIDE).',
      ] } },
    { kit: 'crate', at: [3.0, 7.4], rot: 0.3 },
    { kit: 'crate', at: [3.5, 7.7], rot: -0.2 },
    { kit: 'barrel', at: [13.9, 7.6] },
    { kit: 'barrel', at: [13.6, 12.6] },
    { kit: 'crate', at: [3.2, 18.6], rot: 0.4 },
    { kit: 'bench', at: [8.6, 14.4], rot: 0 },
    { kit: 'flowerbox', at: [8.2, 10.4] },
    { kit: 'lamppost', at: [8.5, 6.6] },
    { kit: 'lamppost', at: [8.5, 19.0] },
    { kit: 'chest', at: [3.0, 12.0], id: 'tb-chest-1',
      contains: { kind: 'gold', amount: 300, label: '300 gil' } },
    { kit: 'chest', at: [8.5, 22.6], id: 'tb-chest-3',
      contains: { kind: 'item', id: 'balm', count: 2, label: '2 Field Balms' } },

    // --- the Farther Side: set back, and in no hurry ---------------------------
    { kit: 'building', at: [23.0, 4.5], w: 8, d: 4, h: 3.3, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', id: 'tb-e-a' },
    { kit: 'building', at: [28.5, 6.5], w: 7, d: 4.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', timbered: true, door: 'south', rot: 0.07, id: 'tb-e-b' },

    { kit: 'building', at: [23.0, 9.0], w: 9, d: 5, h: 3.6, rise: 1.9,
      style: 'plaster', roof: 'tile', awning: true, door: 'south',
      id: 'tb-e-shop', enter: 'shop_thistlebeck', enterPrompt: 'The Long Way Round',
      sign: { icon: '🧪', text: 'The Long Way Round', x: -3.2 } },

    { kit: 'building', at: [21.0, 18.5], w: 7, d: 4.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'north', id: 'tb-e-c' },
    { kit: 'building', at: [28.0, 18.5], w: 7, d: 4.4, h: 3.4, rise: 1.8,
      style: 'plaster', roof: 'thatch', door: 'north', rot: -0.06, id: 'tb-e-d' },
    { kit: 'building', at: [24.5, 21.0], w: 7, d: 4, h: 3.3, rise: 1.7,
      style: 'wood', roof: 'thatch', door: 'north', id: 'tb-e-e' },

    { kit: 'well', at: [26.0, 12.0], id: 'tb-well-east', radius: 1.2,
      interact: { name: 'The Farther Side Well', text: [
        'Newer, shallower, and sunk at enormous expense in the year the Old Side began charging a half-gil the bucket.',
        'A plaque, very polite: SUNK BY SUBSCRIPTION. FREE TO ALL PERSONS OF THISTLEBECK, WITHOUT EXCEPTION.',
        'The words WITHOUT EXCEPTION have been picked out in fresh paint every spring for sixty years.',
      ] } },
    { kit: 'stall', at: [21.5, 14.6], arg: '#2c5a45', id: 'tb-stall-1' },
    { kit: 'stall', at: [27.5, 14.6], arg: '#8a6a23', id: 'tb-stall-2' },
    { kit: 'bench', at: [24.6, 12.8], rot: 0 },
    { kit: 'cart', at: [30.6, 15.4], rot: 0.4 },
    { kit: 'barrel', at: [20.6, 12.4] },
    { kit: 'tree', at: [20.0, 3.0], kind: 'broadleaf', scale: 1.05, seed: 3, id: 'tb-tree-n' },
    { kit: 'tree', at: [30.0, 3.0], kind: 'autumn', scale: 1.0, seed: 7 },
    { kit: 'tree', at: [20.5, 22.5], kind: 'broadleaf', scale: 1.1, seed: 11 },
    { kit: 'tree', at: [30.0, 22.0], kind: 'autumn', scale: 0.95, seed: 13, id: 'tb-tree-s' },
    { kit: 'bush', at: [26.0, 4.0], scale: 1.0, seed: 17, radius: 0 },
    { kit: 'bush', at: [22.0, 22.0], scale: 1.05, seed: 19, radius: 0 },
    { kit: 'flowerbox', at: [24.8, 6.6] },
    { kit: 'chest', at: [30.5, 20.0], id: 'tb-chest-2',
      contains: { kind: 'item', id: 'ironbrooch', count: 1, label: 'an Iron Brooch' } },
  ],

  /**
   * Thistlebeck after. Both halves held. Neither half will cross, because the
   * bridge is the one thing in the world you can still choose not to use, and
   * choosing is the last thing anybody here has left.
   */
  ruin: {
    subtitle: 'Neither Side Crossing',
    light: 'dusk',
    grade: 'ruin',
    fog: ['#7c7a70', 45, 175],
    music: 'memory',
    sky: {
      zenith: '#4e4256', horizon: '#b28e7e', ground: '#33302a',
      sunColor: '#ff9d63', sunDir: [-0.32, 0.2, 0.4], cloud: 0.95,
    },
    removeNpcs: ['tb-child', 'tb-carter', 'tb-eastyoung', 'tb-bridgeman'],
    removeProps: ['tb-tree-n', 'tb-tree-s'],
    npcs: [
      {
        id: 'tb-ruin-bridgeman', name: 'Bridgeman Halloway', at: [14.0, 13.1], face: 'east',
        clip: 'loiter', prompt: 'Speak',
        look: { build: 'normal', height: 1.71, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#ac744c', hair: '#5e5163', torso: '#414954', accent: '#a6b0bc',
            legs: '#2b2933', boots: '#3b3943', cape: '#38224f' } },
        // The covenant is not gated on the world state, and the chest under the
        // ringing floor is still there, so it stays askable after the change.
        event: 'thistlebeck_covenant',
        talk: [
          'Nobody has crossed in nine days. Not because they cannot. Because they will not, and it has become a thing to be proud of.',
          'I sweep it every morning anyway. It is the cleanest bridge in the world and it is going to stay that way.',
        ],
      },
    ],
    props: [
      { kit: 'tree', at: [20.0, 3.0], kind: 'dead', scale: 1.3, seed: 601 },
      { kit: 'tree', at: [30.0, 22.0], kind: 'dead', scale: 1.2, seed: 603 },
      { kit: 'chest', at: [24.5, 19.4], id: 'tb-ruin-chest',
        contains: { kind: 'item', id: 'clearwatercharm', count: 1, label: 'a Clearwater Charm' } },
    ],
  },

  npcs: [
    {
      id: 'tb-gainsay', name: 'Broker Ivo Quint', at: [20.0, 13.4], face: 'west',
      clip: 'loiter', prompt: 'Speak',
      look: { build: 'slim', height: 1.72, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#241d26', torso: '#38224f', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943', gloves: '#4b382d' } },
      // Quint himself is the third stage of the Caldwick lodge chain now, and
      // an `event` closes a `shop`, so the Exchange trades over the trestle
      // beside him instead of shutting whenever he has something to say.
      event: 'caldwick_cord_cornered',
      talk: [
        'The Gainsay Exchange, and before you ask: yes, I will argue with you about the price of a thing you are trying to hand me for nothing, and yes, I will win.',
        'I set up at this end of the bridge because both banks will cross to reach me and neither will admit it. It is the only honest ground in the town.',
      ],
    },
    {
      id: 'tb-gainsay-clerk', name: 'Exchange Clerk Poll', at: [21.0, 12.4], face: 'west',
      clip: 'work', prompt: 'Trade',
      look: { build: 'normal', height: 1.64, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#95602d', torso: '#38224f', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'gainsay_exchange',
      talk: [
        'I keep the trestle. He keeps the argument, and lately he has been keeping it about nine miles of standing timber and nothing else at all.',
        'The prices are his. If you want them moved you will have to go and stand in front of him, and I would take a coat.',
      ],
    },
    {
      id: 'tb-inn', name: 'Ossa Vane', at: [7.0, 16.3], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.65, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 42, name: 'The Farther Bank' },
      talk: [
        'Forty-two. And yes, I know where the house is. My great-grandfather named it in a temper and we have all been living in the joke since.',
        'He wanted a house on the other side and the other side would not sell him one. So he built this and gave it their name, out of spite, and the spite outlived him by a hundred years.',
      ],
    },
    {
      id: 'tb-shop', name: 'Ravel Sperry', at: [22.5, 10.7], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.70, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'harrowmere_items',
      talk: [
        'Half my custom is Old Side. They come over, they buy, and they complain the whole way about having come over.',
        'I would open a second counter on their bank tomorrow. They will not let me. It would prove the crossing is a nuisance and then somebody would have to fix it.',
      ],
    },
    {
      id: 'tb-bridgeman', name: 'Bridgeman Halloway', at: [14.0, 12.5], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'normal', height: 1.71, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#3b3943', cape: '#38224f' } },
      event: 'thistlebeck_covenant',
      talk: [
        'Eleven hundred crossings a day, and I have counted every one for nineteen years, and both sides tell me my number is wrong.',
        'It is not that they hate each other. It is that hating each other is free and a second bridge is nine thousand gil.',
      ],
    },
    {
      id: 'tb-westelder', name: 'Alderman Frisk', at: [8.0, 8.2], face: 'east', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.68, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#4e326c', accent: '#d8ac31',
          legs: '#414954', boots: '#2b2933' } },
      talk: [
        'We are the town. They are the part of the town that is on the other side of the town. There is a difference and I am the only one left who can explain it.',
        'Look at our paving. Every stone laid by subscription. Now look across. Grass. They have had four hundred years and they have grass.',
      ],
    },
    {
      id: 'tb-eastelder', name: 'Alderwoman Pye', at: [24.5, 14.5], face: 'west', clip: 'loiter', prompt: 'Speak',
      look: { build: 'normal', height: 1.66, hair: 'braid', eyeStyle: 'sharp',
        colors: { skin: '#e7c39c', hair: '#dedbe0', torso: '#496035', accent: '#ffd76a',
          legs: '#6b5d37', boots: '#4b382d' } },
      talk: [
        'They paved every inch they had because they had run out of inches. We did not pave, because we have gardens. That is not idleness. That is having won.',
        'Their bell is older. I will grant them the bell. I will grant them nothing else and I would prefer you did not ask.',
      ],
    },
    {
      id: 'tb-fisher', name: 'Deep-Line Muddock', at: [19.1, 9.5], face: 'west', clip: 'sit', prompt: 'Speak',
      look: { build: 'athletic', height: 1.77, hair: 'wild',
        colors: { skin: '#96603f', hair: '#4a2a17', torso: '#33477c', accent: '#3fc6d6',
          legs: '#414954', boots: '#3a2a20', gloves: '#5b6674' } },
      talk: [
        'Eleven fathom of line before the hook is wet. You do not fish this beck so much as post a letter to it.',
        'Whatever is down there has been eating well since the spring. I have lost four hooks and I have not lost four hooks in a decade.',
      ],
    },
    {
      id: 'tb-priest', name: 'Bell-Keeper Wray', at: [8.0, 16.5], face: 'east', clip: 'work', prompt: 'Speak',
      look: { build: 'slim', height: 1.69, hair: 'short', expression: 'neutral',
        colors: { skin: '#6e4030', hair: '#dedbe0', torso: '#38224f', accent: '#ffd76a',
          legs: '#2b2933', boots: '#4b382d', cape: '#241636' } },
      event: 'eleven_bells',
      talk: [
        'One bell each. Ours is older and theirs is louder, and neither fact has ever brought a single soul across.',
        'They ring at noon. We ring at noon. From the middle of the bridge you can hear that we do not agree about noon.',
      ],
    },
    {
      id: 'tb-carter', name: 'Carter Bledd', at: [6.0, 22.3], face: 'north', clip: 'work', prompt: 'Speak',
      look: { build: 'hulking', height: 1.86, hair: 'topknot',
        colors: { skin: '#c08865', hair: '#342a37', torso: '#95836b', accent: '#7c4939',
          legs: '#5f6572', boots: '#4b382d', gloves: '#4b382d' } },
      talk: [
        'A loaded wagon will not take the bridge and the turn after it in one go. You cross empty, you turn, you come back for the load.',
        'Every carter in the valley knows the jog. Every carter in the valley charges Thistlebeck twice for it.',
      ],
    },
    {
      id: 'tb-eastyoung', name: 'Sela Pye', at: [28.5, 21.5], face: 'north', clip: 'idle', prompt: 'Speak',
      look: { build: 'slim', height: 1.64, hair: 'long', expression: 'neutral',
        colors: { skin: '#dcae8a', hair: '#bd8746', torso: '#1a8fa5', accent: '#f7d968',
          legs: '#414954', boots: '#4b382d' } },
      talk: [
        'I am marrying an Old Side boy in the spring. Both grandmothers have said they will not cross for it.',
        'So we are having it on the bridge. Halloway has offered to sweep. He is very pleased about the whole thing.',
      ],
    },
    {
      id: 'tb-child', name: 'Nib', at: [17.5, 12.5], face: 'west', clip: 'idle', prompt: 'Speak', wander: 1,
      look: { build: 'child', height: 1.25, hair: 'wild', expression: 'happy', blush: '#d5766a',
        colors: { skin: '#ac744c', hair: '#6d4020', torso: '#8b2a2c', accent: '#ffd76a',
          legs: '#33477c', boots: '#4b382d' } },
      talk: [
        'I carry messages. Two coppers a crossing and four if it is rude, and most of them are rude.',
        'I am the only person in Thistlebeck who is from the bridge. Both sides feed me. Neither side will have me.',
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
  fog: ['#241f1a', 22, 70],
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

export const INN_THISTLEBECK = {
  ...ROOM_BASE,
  id: 'inn_thistlebeck',
  name: 'The Farther Bank',
  subtitle: 'Thistlebeck',
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
  ], 'inn_thistlebeck'),

  spawns: { default: { at: [8, 6], face: 'north' } },
  exits: [{ at: [8, 7], size: [2, 1], to: 'thistlebeck', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'bench', at: [4.5, 3.0], rot: 0 },
    { kit: 'bench', at: [4.5, 4.8], rot: 0 },
    { kit: 'bench', at: [12.5, 3.0], rot: 0 },
    { kit: 'bench', at: [12.5, 4.8], rot: 0 },
    { kit: 'barrel', at: [2.0, 1.6] },
    { kit: 'barrel', at: [2.8, 2.4] },
    { kit: 'crate', at: [15.2, 1.7], rot: 0.35 },
    { kit: 'lamppost', at: [6.0, 1.6] },
    { kit: 'lamppost', at: [11.5, 1.6] },
    { kit: 'flowerbox', at: [8.6, 5.4] },
    { kit: 'chest', at: [15.4, 5.4], id: 'inn-tb-chest',
      contains: { kind: 'item', id: 'wardingcord', count: 1, label: 'a Warding Cord' } },
    { kit: 'signpost', at: [2.6, 5.4], id: 'inn-tb-board',
      interact: { name: 'The Slate', text: [
        'ROOMS. BEDS. NO OPINIONS AFTER TEN.',
        'Beneath it, a much longer list of persons currently not permitted to sit at the same table as other persons. It runs to two columns.',
      ] } },
  ],

  npcs: [
    {
      id: 'inn-tb-keeper', name: 'Ossa Vane', at: [8.5, 2.0], face: 'south', clip: 'work', prompt: 'Speak',
      look: { build: 'heavy', height: 1.65, hair: 'bob', expression: 'happy',
        colors: { skin: '#c08865', hair: '#4a2a17', torso: '#12566b', accent: '#ddccab',
          legs: '#414954', boots: '#4b382d' } },
      inn: { price: 42, name: 'The Farther Bank' },
      talk: ['Forty-two. If anyone asks which side you are staying on, say you are stopping the night and go up the stairs.'],
    },
    {
      id: 'inn-tb-guest', name: 'Surveyor of Spans', at: [3.4, 3.9], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'normal', height: 1.74, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#95602d', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      talk: [
        'Fourth time I have been engaged to site the second bridge. Fourth set of measurements. Same rock, same span, same answer.',
        'They do not want a bridge. They want a report saying the other side is being unreasonable, and I have written that four times too.',
      ],
    },
  ],
};

export const SHOP_THISTLEBECK = {
  ...ROOM_BASE,
  id: 'shop_thistlebeck',
  name: 'The Long Way Round',
  subtitle: 'Thistlebeck',
  music: 'town_bazaar',
  terrain: makeRoom(16, [
    '################',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#oooooooooooooo#',
    '#######oo#######',
  ], 'shop_thistlebeck'),

  spawns: { default: { at: [7, 4], face: 'north' } },
  exits: [{ at: [7, 5], size: [2, 1], to: 'thistlebeck', spawn: 'default', prompt: 'Outside' }],

  props: [
    { kit: 'crate', at: [2.0, 1.6], rot: 0.2 },
    { kit: 'crate', at: [2.5, 2.6], rot: -0.3 },
    { kit: 'barrel', at: [13.2, 1.7] },
    { kit: 'barrel', at: [12.7, 2.6] },
    { kit: 'lamppost', at: [7.5, 1.4] },
    { kit: 'flowerbox', at: [4.6, 3.6] },
    { kit: 'chest', at: [13.4, 3.6], id: 'shop-tb-chest',
      contains: { kind: 'gold', amount: 220, label: '220 gil' } },
  ],

  npcs: [
    {
      id: 'shop-tb-keeper', name: 'Ravel Sperry', at: [8.0, 2.0], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'slim', height: 1.70, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#2c5a45', accent: '#ab8018',
          legs: '#2b2933', boots: '#3b3943' } },
      shop: 'harrowmere_items',
      talk: ['Prices are the same for both banks. I have said so on the door, in writing, and I am still asked twice a day.'],
    },
  ],
};

export const THISTLEBECK_INTERIORS = {
  inn_thistlebeck: INN_THISTLEBECK,
  shop_thistlebeck: SHOP_THISTLEBECK,
};
