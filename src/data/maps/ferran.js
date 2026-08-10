/**
 * The Ferran Outpost.
 *
 * A walled compound, laid out the way an occupying army lays one out: a single
 * gate you have to walk the length of, barracks flanking the approach so you
 * are overlooked the whole way, and the keep raised at the far end. The player
 * is meant to feel watched from the moment they step through the gate.
 */

const W = 36;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[ferran] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 36)),
  /*  1 */ row(R('#', 36)),
  // --- the keep ------------------------------------------------------------
  /*  2 */ row(R('#', 8), R('M', 20), R('#', 8)),
  /*  3 */ row(R('#', 8), R('M', 20), R('#', 8)),
  /*  4 */ row(R('#', 8), R('M', 20), R('#', 8)),
  /*  5 */ row(R('#', 8), R('M', 20), R('#', 8)),
  /*  6 */ row(R('#', 8), R('M', 20), R('#', 8)),
  /*  7 */ row(R('#', 14), R('M', 8), R('#', 14)),
  // --- upper yard ----------------------------------------------------------
  /*  8 */ row(R('#', 3), R('=', 30), R('#', 3)),
  /*  9 */ row(R('#', 3), R('=', 30), R('#', 3)),
  /* 10 */ row(R('#', 3), R('=', 30), R('#', 3)),
  // --- barracks flanking the approach --------------------------------------
  /* 11 */ row(R('#', 3), R('=', 6), R('#', 3), R('=', 12), R('#', 3), R('=', 6), R('#', 3)),
  /* 12 */ row(R('#', 3), R('=', 6), R('#', 3), R('=', 12), R('#', 3), R('=', 6), R('#', 3)),
  /* 13 */ row(R('#', 3), R('=', 6), R('#', 3), R('=', 12), R('#', 3), R('=', 6), R('#', 3)),
  /* 14 */ row(R('#', 3), R('=', 6), R('#', 3), R('=', 12), R('#', 3), R('=', 6), R('#', 3)),
  // --- lower yard ----------------------------------------------------------
  /* 15 */ row(R('#', 3), R('=', 30), R('#', 3)),
  /* 16 */ row(R('#', 3), R('=', 30), R('#', 3)),
  /* 17 */ row(R('#', 3), R('=', 30), R('#', 3)),
  /* 18 */ row(R('#', 12), R('=', 12), R('#', 12)),
  /* 19 */ row(R('#', 12), R('=', 12), R('#', 12)),
  // --- the gate ------------------------------------------------------------
  /* 20 */ row(R('#', 16), R('=', 4), R('#', 16)),
  /* 21 */ row(R('#', 16), R('=', 4), R('#', 16)),
];

export const FERRAN_OUTPOST = {
  id: 'ferran_outpost',
  name: 'Ferran Outpost',
  subtitle: 'Silt Road Garrison',
  kind: 'town',
  light: 'magitek',
  grade: 'magitek',
  fog: ['#7f929c', 70, 220],
  tilt: 0.38,
  cameraDistance: 16,
  music: 'imperium',
  base: 'cobble',
  groundRamp: 'magitek',
  wallHeight: 9.5,
  wallMaterial: 'iron',
  lampIntensity: 6,

  sky: {
    zenith: '#33556e', horizon: '#9aa8a4', ground: '#4a4a44',
    sunColor: '#d8e4e0', sunDir: [0.3, 0.5, 0.5], cloud: 0.85,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [17, 20], face: 'north' },
    world: { at: [17, 20], face: 'north' },
  },

  exits: [
    { at: [16, 21], size: [4, 1], to: 'overworld', spawn: 'ferran', prompt: 'Leave the outpost' },
  ],

  triggers: [
    { at: [14, 8], size: [8, 1], kind: 'event', event: 'ferran_warden', once: true },
    // The standing-order board by the gate. Maret pins four pages of her own
    // under it, which is the last thing she does inside these walls.
    { at: [14, 18], size: [2, 1], kind: 'event', event: 'maret_countersign' },
  ],

  props: [
    // --- the keep ---------------------------------------------------------
    { kit: 'building', at: [18, 3.6], w: 14, d: 6, h: 5.4, storeys: 2, rise: 1.4,
      style: 'magitek', roof: 'iron', door: 'south', windows: false, id: 'fo-keep',
      sign: { icon: '⚙', text: 'Engine House Annexe', x: 0 } },
    { kit: 'lamppost', at: [13.0, 7.6] },
    { kit: 'lamppost', at: [23.0, 7.6] },

    // --- barracks ---------------------------------------------------------
    { kit: 'building', at: [7.5, 12.4], w: 5, d: 5, h: 3.6, rise: 1.2,
      style: 'magitek', roof: 'iron', door: 'east', windows: false, id: 'fo-barracks-w' },
    { kit: 'building', at: [28.5, 12.4], w: 5, d: 5, h: 3.6, rise: 1.2,
      style: 'magitek', roof: 'iron', door: 'west', windows: false, id: 'fo-barracks-e' },

    // --- yard clutter -----------------------------------------------------
    { kit: 'crate', at: [13.5, 16.4], rot: 0.2 },
    { kit: 'crate', at: [14.2, 17.2], rot: -0.4 },
    { kit: 'barrel', at: [22.5, 16.6] },
    { kit: 'barrel', at: [23.2, 17.4] },
    { kit: 'cart', at: [18.0, 16.8], rot: 1.4 },
    { kit: 'crate', at: [6.0, 9.4], rot: 0.6 },
    { kit: 'barrel', at: [30.0, 9.6] },
    { kit: 'lamppost', at: [12.5, 15.6] },
    { kit: 'lamppost', at: [23.5, 15.6] },
    { kit: 'lamppost', at: [15.0, 19.4] },
    { kit: 'lamppost', at: [21.0, 19.4] },

    // --- gate --------------------------------------------------------------
    { kit: 'savepoint', at: [18, 19.0], id: 'fo-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [15.0, 18.2], id: 'fo-notice',
      interact: { name: 'Standing Order', text: [
        'ORDER 114: All aether recovered in the fen is Imperium property.',
        'ORDER 115: Order 114 applies retroactively.',
        'ORDER 116: Personnel are reminded not to look into the wells.',
      ] } },

    { kit: 'chest', at: [6.0, 16.0], id: 'fo-chest-1',
      contains: { kind: 'item', id: 'hipotion', count: 3, label: '3 Hi-Potions' } },
    { kit: 'chest', at: [30.0, 16.0], id: 'fo-chest-2',
      contains: { kind: 'item', id: 'ironhelm', count: 1, label: 'an Iron Helm' } },
    { kit: 'chest', at: [12.0, 4.0], id: 'fo-chest-3',
      contains: { kind: 'esper', id: 'stormcaller', label: 'a shard of magicite' } },
    { kit: 'chest', at: [24.0, 4.0], id: 'fo-chest-4',
      contains: { kind: 'item', id: 'guardplate', count: 1, label: 'a suit of Guard Plate' } },
  ],

  npcs: [
    {
      // Vell trades rather than sells, which is the whole of the brass errand —
      // so the conversation is his and the counter is the storesman's. The
      // stock list is unchanged; it has simply moved one man to the left.
      id: 'fo-quartermaster', name: 'Quartermaster Vell', at: [26.5, 16.4], face: 'west',
      clip: 'work', prompt: 'Speak', event: 'quartermaster_trade',
      look: { build: 'normal', height: 1.72, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#5e5163', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74', metal: '#a6b0bc' } },
      talk: ['Requisitions. I do not ask where the coin came from and you do not ask where the stock did.'],
    },
    {
      id: 'fo-storesman', name: 'Storesman', at: [28, 17], face: 'west',
      clip: 'work', prompt: 'Trade',
      look: { build: 'heavy', height: 1.66, hair: 'bald', eyeStyle: 'round',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#414954', accent: '#8a6a23',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      shop: 'ferran_quartermaster',
      talk: ['Chit first, stock second. The Quartermaster does the other kind of business and I would rather not hear about it.'],
    },
    {
      // The north post, and Order 116, and the count he wrote down before an
      // officer of the watch gave him a different figure to write.
      id: 'fo-ostrel', name: 'Gate-Sentry Ostrel', at: [25.0, 6.0], face: 'south', clip: 'idle', prompt: 'Speak',
      look: { build: 'athletic', height: 1.75, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#4a2a17', torso: '#414954', accent: '#a6b0bc',
          legs: '#2b2933', boots: '#22242a', gloves: '#666c74' } },
      event: 'eleven_order',
      talk: [
        'Nothing goes in the day-book but what I saw and the time I saw it at.',
      ],
    },
    {
      id: 'fo-sentry', name: 'Sentry', at: [15.5, 10.5], face: 'south', clip: 'idle', prompt: 'Speak',
      look: { build: 'athletic', height: 1.78, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#414954', accent: '#5b6674',
          legs: '#2b2933', boots: '#22242a', metal: '#a6b0bc' } },
      talk: [
        'Keep out of the annexe. Whatever they hauled up from the fen, it is *awake* in there.',
        'Two of ours went in to log it. We have stopped counting them as missing.',
      ],
    },
    {
      id: 'fo-engineer', name: 'Field Engineer', at: [21.0, 12.0], face: 'west',
      clip: 'work', prompt: 'Speak', wander: 1,
      look: { build: 'slim', height: 1.68, hair: 'ponytail',
        colors: { skin: '#dbb28c', hair: '#95602d', torso: '#5b6674', accent: '#1a8fa5',
          legs: '#414954', boots: '#3b3943', gloves: '#666c74' },
        expression: 'sad' },
      talk: [
        'The draw rate tripled last month and nobody upstairs will say why.',
        'I have run the numbers four times. At this rate the Ninth Well is dry inside a year, and I do not think dry means empty.',
      ],
    },
    {
      id: 'maret', name: 'General Maret Sunder', at: [20.5, 9.5], face: 'south', clip: 'loiter',
      prompt: 'Speak', event: 'recruit_maret',
      look: { id: 'maret', build: 'slim', height: 1.72, hair: 'ponytail', eyeStyle: 'sharp',
        colors: { skin: '#f0d5b8', hair: '#dedbe0', torso: '#dedbe0', accent: '#4b64a3',
          legs: '#5b6674', boots: '#414954', gloves: '#97929a', metal: '#a6b0bc', cape: '#33477c' },
        buckle: true },
    },
    {
      id: 'fo-prisoner', name: 'Ragged Prisoner', at: [8.5, 10.0], face: 'east', clip: 'sit', prompt: 'Speak',
      look: { build: 'slim', height: 1.70, hair: 'wild',
        colors: { skin: '#6e4030', hair: '#4a2a17', torso: '#95836b', accent: '#5a3230',
          legs: '#6b5d37', boots: '#3a2a20' }, expression: 'sad' },
      talk: [
        'I was a lamplighter at Ashenhall. Eight lanterns, and I kept the ninth.',
        'They took it off me at the gate. If you find it — it is not a lamp. It never was.',
      ],
    },
  ],
};
