/**
 * Solmere — the Engine City.
 *
 * Built on the only Aether Engine anyone ever managed to *tame*, and shaped
 * like it: everything terraces down from the palace, so wherever the player
 * stands they can see where the power is. Marble above, working stone below,
 * and a workshop quarter at the bottom where the actual city lives.
 */

const W = 44;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[solmere] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 44)),
  /*  1 */ row(R('#', 44)),
  // --- palace terrace ------------------------------------------------------
  /*  2 */ row(R('#', 10), R('M', 24), R('#', 10)),
  /*  3 */ row(R('#', 9), R('M', 26), R('#', 9)),
  /*  4 */ row(R('#', 9), R('M', 26), R('#', 9)),
  /*  5 */ row(R('#', 8), R('M', 28), R('#', 8)),
  /*  6 */ row(R('#', 8), R('M', 28), R('#', 8)),
  /*  7 */ row(R('#', 9), R('M', 26), R('#', 9)),
  /*  8 */ row(R('#', 10), R('M', 24), R('#', 10)),
  /*  9 */ row(R('#', 18), R('M', 8), R('#', 18)),
  // --- upper plaza ---------------------------------------------------------
  /* 10 */ row(R('#', 6), R('=', 32), R('#', 6)),
  /* 11 */ row(R('#', 6), R('=', 32), R('#', 6)),
  /* 12 */ row(R('#', 6), R('=', 32), R('#', 6)),
  /* 13 */ row(R('#', 6), R('=', 32), R('#', 6)),
  // --- the great plaza and its fountain ------------------------------------
  /* 14 */ row(R('#', 4), R('=', 36), R('#', 4)),
  /* 15 */ row(R('#', 4), R('=', 14), R('M', 8), R('=', 14), R('#', 4)),
  /* 16 */ row(R('#', 4), R('=', 14), R('M', 8), R('=', 14), R('#', 4)),
  /* 17 */ row(R('#', 4), R('=', 14), R('M', 8), R('=', 14), R('#', 4)),
  /* 18 */ row(R('#', 4), R('=', 36), R('#', 4)),
  /* 19 */ row(R('#', 4), R('=', 36), R('#', 4)),
  /* 20 */ row(R('#', 4), R('=', 36), R('#', 4)),
  // --- workshop quarter ----------------------------------------------------
  /* 21 */ row(R('#', 4), R('=', 36), R('#', 4)),
  /* 22 */ row(R('#', 4), R('=', 10), R('#', 4), R('=', 8), R('#', 4), R('=', 10), R('#', 4)),
  /* 23 */ row(R('#', 4), R('=', 10), R('#', 4), R('=', 8), R('#', 4), R('=', 10), R('#', 4)),
  /* 24 */ row(R('#', 4), R('=', 10), R('#', 4), R('=', 8), R('#', 4), R('=', 10), R('#', 4)),
  /* 25 */ row(R('#', 4), R('=', 36), R('#', 4)),
  /* 26 */ row(R('#', 4), R('=', 36), R('#', 4)),
  // --- the south gate ------------------------------------------------------
  /* 27 */ row(R('#', 10), R('=', 24), R('#', 10)),
  /* 28 */ row(R('#', 10), R('=', 24), R('#', 10)),
  /* 29 */ row(R('#', 18), R('=', 8), R('#', 18)),
  /* 30 */ row(R('#', 18), R('=', 8), R('#', 18)),
  /* 31 */ row(R('#', 20), R('=', 4), R('#', 20)),
];

/**
 * Scripted zones. The collapsed gallery is in the workshop quarter, against the
 * blank face between the two works — the one place in Solmere where the city is
 * still standing on top of a hole it dug. The ruined city restates this and adds
 * Kestrel's reading outside the archive, since a ruin override replaces the
 * trigger list rather than merging it.
 */
const SOLMERE_TRIGGERS = [
  { at: [18, 22], size: [2, 1], kind: 'event', event: 'bastian_heavy_end' },
];

export const SOLMERE = {
  id: 'solmere',
  name: 'Solmere',
  subtitle: 'The Engine City',
  kind: 'town',
  light: 'day',
  grade: 'noon',
  fog: ['#a8b8c0', 110, 320],
  tilt: 0.40,
  cameraDistance: 17,
  music: 'solmere',
  base: 'cobble',
  groundRamp: 'terrain',
  wallHeight: 8.5,
  wallMaterial: 'stoneFine',

  sky: {
    zenith: '#2c5c8e', horizon: '#b6bfb8', ground: '#54524a',
    sunColor: '#ffdda0', sunDir: [0.4, 0.62, 0.45], cloud: 0.55,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [21, 29], face: 'north' },
    world: { at: [21, 30], face: 'north' },
  },

  exits: [
    { at: [20, 31], size: [4, 1], to: 'overworld', spawn: 'solmere', prompt: 'Leave Solmere' },
  ],

  triggers: SOLMERE_TRIGGERS,

  props: [
    // --- the palace --------------------------------------------------------
    { kit: 'building', at: [22, 4.4], w: 16, d: 7, h: 5.0, storeys: 2, rise: 3.4,
      style: 'marble', roof: 'slate', door: 'south', windows: true, id: 'sol-palace',
      enter: 'palace_solmere', enterPrompt: 'The Engine House',
      sign: { icon: '⚙', text: 'The Engine House', x: 0 } },
    { kit: 'building', at: [12.5, 6.6], w: 5, d: 4, h: 4.0, rise: 2.0, style: 'marble', roof: 'slate', door: 'south', id: 'sol-palace-w' },
    { kit: 'building', at: [31.5, 6.6], w: 5, d: 4, h: 4.0, rise: 2.0, style: 'marble', roof: 'slate', door: 'south', id: 'sol-palace-e' },
    { kit: 'lamppost', at: [16.5, 9.5] },
    { kit: 'lamppost', at: [27.5, 9.5] },

    // --- the fountain ------------------------------------------------------
    { kit: 'well', at: [22, 16], id: 'sol-fountain', radius: 1.3,
      interact: { name: 'The Tamed Well', text: [
        'Aether runs clear through the basin, cold and faintly humming.',
        'A brass plate reads: DRAWN, NOT TAKEN. — A. MARCHETTI, YEAR 41.',
      ] } },
    { kit: 'bench', at: [18.5, 18.6], rot: 0 },
    { kit: 'bench', at: [25.5, 18.6], rot: 0 },
    { kit: 'flowerbox', at: [18.0, 14.4] },
    { kit: 'flowerbox', at: [26.0, 14.4] },
    { kit: 'lamppost', at: [16.0, 17.0] },
    { kit: 'lamppost', at: [28.0, 17.0] },

    // --- upper plaza trade -------------------------------------------------
    { kit: 'building', at: [10.5, 11.6], w: 7, d: 4.6, h: 3.8, storeys: 2, rise: 2.0,
      style: 'stone', roof: 'slate', door: 'south', awning: true, id: 'sol-inn',
      sign: { icon: '🛏', text: 'The Governor’s Rest' } },
    { kit: 'building', at: [33.5, 11.6], w: 7, d: 4.6, h: 3.6, rise: 1.9,
      style: 'stone', roof: 'slate', door: 'south', awning: true, id: 'sol-items',
      sign: { icon: '🧪', text: 'Aetheric Supply' } },
    { kit: 'stall', at: [15.5, 20.4], arg: '#33477c' },
    { kit: 'stall', at: [28.5, 20.4], arg: '#8a6a23' },

    // --- workshop quarter --------------------------------------------------
    { kit: 'building', at: [10.5, 23.2], w: 8, d: 5, h: 4.2, rise: 1.6,
      style: 'magitek', roof: 'iron', door: 'east', chimney: true, id: 'sol-forge',
      sign: { icon: '⚒', text: 'Marchetti Works', x: -3 } },
    { kit: 'building', at: [33.5, 23.2], w: 8, d: 5, h: 4.2, rise: 1.6,
      style: 'magitek', roof: 'iron', door: 'west', chimney: true, id: 'sol-relic',
      sign: { icon: '◆', text: 'Relic Assay', x: 3 } },
    { kit: 'cart', at: [21.5, 22.6], rot: 0.2 },
    { kit: 'barrel', at: [18.4, 23.4] },
    { kit: 'barrel', at: [18.9, 24.2] },
    { kit: 'crate', at: [25.6, 23.6], rot: 0.5 },
    { kit: 'crate', at: [26.2, 24.6], rot: -0.3 },

    // --- gate --------------------------------------------------------------
    { kit: 'lamppost', at: [19.0, 28.2] },
    { kit: 'lamppost', at: [24.0, 28.2] },
    { kit: 'savepoint', at: [22, 27.4], id: 'sol-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [17.5, 27.0], id: 'sol-sign',
      interact: { name: 'City Notice', text: [
        'BY ORDER OF THE ENGINE HOUSE: aether draw is rationed to four measures a household.',
        'Someone has scratched beneath it: FIVE FOR THE PALACE.',
      ] } },

    { kit: 'chest', at: [6.5, 19.5], id: 'sol-chest-1',
      contains: { kind: 'item', id: 'focusring', count: 1, label: 'a Focus Ring' } },
    { kit: 'chest', at: [37.5, 19.5], id: 'sol-chest-2',
      contains: { kind: 'item', id: 'hitonic', count: 3, label: '3 Hi-Tonics' } },
    { kit: 'chest', at: [22, 3.0], id: 'sol-chest-3',
      contains: { kind: 'esper', id: 'brasswright', label: 'a shard of magicite' } },
  ],

  /**
   * Solmere after. The city that tamed an Engine is the city that was standing
   * closest to it, so it took the worst of it — and the fountain still runs,
   * because Aurelian's plumbing was better than his politics.
   */
  ruin: {
    subtitle: 'The City That Drew Too Deep',
    light: 'ruin',
    grade: 'ruin',
    fog: ['#8a7264', 55, 190],
    music: 'ruins',
    sky: {
      zenith: '#5e4438', horizon: '#c09a80', ground: '#3a322a',
      sunColor: '#ff9d63', sunDir: [0.25, 0.2, 0.45], cloud: 0.95,
    },
    encounters: {
      rate: 24, terrain: 'cobble', scenery: 'none',
      groups: [
        { weight: 30, enemies: ['gearwright', 'gearwright'] },
        { weight: 24, enemies: ['aetherleech', 'gearwright'] },
        { weight: 20, enemies: ['magitekarmour'] },
        { weight: 16, enemies: ['vaultsentinel'] },
        { weight: 10, enemies: ['aetherleech', 'aetherleech', 'aetherleech'] },
      ],
    },
    // Kestrel will not read the roll out inside a building with a roll on it,
    // so the reading happens on the paving outside the branch she is the whole
    // of — a few steps south of where she stands.
    triggers: [
      ...SOLMERE_TRIGGERS,
      { at: [34, 15], size: [3, 2], kind: 'event', event: 'kestrel_sixty_one' },
    ],
    removeNpcs: ['sol-child', 'sol-guard', 'sol-shop'],
    npcs: [
      {
        id: 'kestrel', name: 'Kestrel', at: [33.5, 13.8], face: 'south', clip: 'work',
        prompt: 'Speak', event: 'recruit_kestrel',
        look: { id: 'kestrel', build: 'child', height: 1.20, hair: 'short', eyeStyle: 'round',
          colors: { skin: '#dcae8a', hair: '#5e5163', torso: '#1a8fa5', accent: '#f7d968',
            legs: '#33477c', boots: '#4b382d', gloves: '#3fc6d6', cape: '#12566b' } },
      },
      {
        id: 'sol-ruin-warden', name: 'Gate Warden', at: [19.5, 29.0], face: 'south', clip: 'sit', prompt: 'Speak',
        look: { build: 'athletic', height: 1.80, hair: 'short', eyeStyle: 'sharp', expression: 'sad',
          colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#414954', accent: '#5a3230',
            legs: '#2b2933', boots: '#3b3943', metal: '#666c74' } },
        talk: [
          'Gate is still shut. I still shut it every night.',
          'There is nothing left to keep out and nothing left to keep in, and I still shut it.',
        ],
      },
    ],
    props: [
      { kit: 'rock', at: [14.0, 12.0], scale: 2.0, seed: 401 },
      { kit: 'rock', at: [29.0, 12.0], scale: 1.8, seed: 403 },
      { kit: 'tree', at: [11.0, 20.0], kind: 'dead', scale: 1.4, seed: 405 },
      { kit: 'chest', at: [22.0, 6.0], id: 'sol-ruin-chest',
        contains: { kind: 'item', id: 'aetherglass', count: 1, label: 'Aetherglass' } },
    ],
  },

  npcs: [
    {
      id: 'aurelian', name: 'Aurelian Marchetti', at: [22, 10.6], face: 'south', clip: 'loiter',
      prompt: 'Speak', event: 'recruit_aurelian',
      look: { id: 'aurelian', build: 'athletic', height: 1.82, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#dbb28c', hair: '#bd8746', torso: '#4b64a3', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943', gloves: '#5b6674', metal: '#a6b0bc', cape: '#33477c' },
        buckle: true },
    },
    {
      id: 'bastian', name: 'Bastian Marchetti', at: [21.5, 24.4], face: 'north', clip: 'work',
      prompt: 'Speak', event: 'recruit_bastian',
      look: { id: 'bastian', build: 'hulking', height: 1.94, hair: 'topknot',
        colors: { skin: '#c08865', hair: '#342a37', torso: '#95836b', accent: '#8b2a2c',
          legs: '#bda98b', boots: '#4b382d', gloves: '#7c4939' } },
    },
    {
      id: 'sol-inn', name: 'Hestia', at: [9.0, 13.8], face: 'south', clip: 'loiter', prompt: 'Speak',
      look: { build: 'heavy', height: 1.68, hair: 'bob',
        colors: { skin: '#e7c39c', hair: '#5e5163', torso: '#2c5a45', accent: '#ddccab', legs: '#5e412c', boots: '#4b382d' },
        expression: 'happy' },
      inn: { price: 90, name: "The Governor's Rest" },
      talk: ['Ninety gil, and the water actually runs hot. You will not find that anywhere else on this coast.'],
    },
    {
      id: 'sol-shop', name: 'Quill', at: [33.5, 13.8], face: 'south', clip: 'work', prompt: 'Trade',
      look: { build: 'child', height: 1.24, hair: 'short', eyeStyle: 'round',
        colors: { skin: '#dcae8a', hair: '#5e5163', torso: '#1a8fa5', accent: '#f7d968', legs: '#33477c', boots: '#4b382d', cape: '#12566b' } },
      shop: 'solmere_items',
      talk: ['Vellum-run, Vellum-stocked. We do not haggle and we do not water the tonics.'],
    },
    {
      id: 'sol-smith', name: 'Foreman Ott', at: [13.4, 23.2], face: 'east', clip: 'work', prompt: 'Trade',
      look: { build: 'hulking', height: 1.88, hair: 'bald', eyeStyle: 'sharp',
        colors: { skin: '#96603f', hair: '#241d26', torso: '#5b6674', accent: '#8a6a23', legs: '#414954', boots: '#22242a', gloves: '#666c74', metal: '#a6b0bc' } },
      shop: 'solmere_arms',
      talk: ['Everything on that rack will outlive you. Try to make that a long time.'],
    },
    {
      id: 'sol-guard', name: 'Gate Warden', at: [19.5, 29.0], face: 'south', clip: 'idle', prompt: 'Speak',
      look: { build: 'athletic', height: 1.80, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#4a2a17', torso: '#414954', accent: '#8a6a23', legs: '#2b2933', boots: '#3b3943', metal: '#a6b0bc' } },
      talk: ['Ferran patrols on the north road twice a day now. We count them. We do not stop them.'],
    },
    {
      id: 'sol-scholar', name: 'Archivist Bel', at: [30.0, 17.6], face: 'west', clip: 'loiter', prompt: 'Speak', wander: 1,
      look: { build: 'slim', height: 1.66, hair: 'braid',
        colors: { skin: '#9a6147', hair: '#dedbe0', torso: '#4e326c', accent: '#ab8018', legs: '#2b2933', boots: '#4b382d', cape: '#38224f' },
        expression: 'sad' },
      talk: [
        'Every esper we have opened had a name inside it. A real one. A person\'s.',
        'The Chancellor has read the same records I have. He simply drew a different conclusion about what that permits.',
      ],
    },
    {
      id: 'sol-child', name: 'Tam', at: [26.5, 21.4], face: 'west', clip: 'idle', prompt: 'Speak', wander: 2,
      look: { build: 'child', height: 1.30, hair: 'wild', expression: 'happy',
        colors: { skin: '#c08865', hair: '#7a4a22', torso: '#496035', accent: '#ffd76a', legs: '#5e412c', boots: '#4b382d' },
        blush: '#d5766a' },
      talk: ['The big one in the workshop can lift a whole engine block. I have *seen* it.'],
    },
  ],
};
