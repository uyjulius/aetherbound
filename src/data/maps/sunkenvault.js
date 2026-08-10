/**
 * The Sunken Vault — an Imperium cistern that lost its argument with the water.
 *
 * The building is still perfectly symmetrical; the flood is not. Every route
 * through it is dictated by what happens to be standing above the waterline,
 * so the player reads the vault's *plan* through its ruin: a dais you can see
 * from the moment you arrive but must ford to reach, a drowned nave whose two
 * aisles are the only dry ground and whose middle is a single knee-deep
 * crossing, and a pump floor where the piers survive and the bays did not.
 *
 * Nothing here is a maze. Everything here is a detour, and the detour is the
 * water's idea rather than the architect's — which is the whole point.
 *
 * Rows use the same run-length notation as the other dungeons. A miscounted
 * row in a flooded vault is an invisible hole in a wall, which is far worse
 * than a visible one.
 */

const W = 40;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[sunkenvault] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 40)),
  /*  1 */ row(R('#', 40)),
  // --- the cistern head: a dais marooned in the deep ------------------------
  /*  2 */ row(R('#', 4), R('~', 32), R('#', 4)),
  /*  3 */ row(R('#', 4), R('~', 10), R('M', 12), R('~', 10), R('#', 4)),
  /*  4 */ row(R('#', 4), R('~', 8), R('M', 16), R('~', 8), R('#', 4)),
  /*  5 */ row(R('#', 4), R('~', 8), R('M', 16), R('~', 8), R('#', 4)),
  /*  6 */ row(R('#', 4), R('~', 10), R('M', 12), R('~', 10), R('#', 4)),
  /*  7 */ row(R('#', 4), R('~', 14), R('M', 4), R('~', 14), R('#', 4)),
  // the ford: the causeway is still there, it is simply two feet under
  /*  8 */ row(R('#', 4), R('~', 14), R(':', 4), R('~', 14), R('#', 4)),
  /*  9 */ row(R('#', 4), R('~', 14), R(':', 4), R('~', 14), R('#', 4)),
  // --- the long causeway, and one submerged ledge off it -------------------
  /* 10 */ row(R('#', 4), R('~', 14), R('M', 4), R('~', 14), R('#', 4)),
  /* 11 */ row(R('#', 4), R('~', 14), R('M', 4), R(':', 10), R('M', 4), R('#', 4)),
  /* 12 */ row(R('#', 4), R('~', 14), R('M', 4), R('~', 10), R('M', 4), R('#', 4)),
  /* 13 */ row(R('#', 4), R('~', 14), R('M', 4), R('~', 14), R('#', 4)),
  // --- the drowned nave: two dry aisles and one crossing -------------------
  /* 14 */ row(R('#', 2), R('M', 36), R('#', 2)),
  /* 15 */ row(R('#', 2), R('M', 6), R('~', 24), R('M', 6), R('#', 2)),
  /* 16 */ row(R('#', 2), R('M', 6), R('~', 24), R('M', 6), R('#', 2)),
  /* 17 */ row(R('#', 2), R('M', 6), R('~', 24), R('M', 6), R('#', 2)),
  /* 18 */ row(R('#', 2), R('M', 6), R(':', 24), R('M', 6), R('#', 2)),
  /* 19 */ row(R('#', 2), R('M', 6), R('~', 24), R('M', 6), R('#', 2)),
  /* 20 */ row(R('#', 2), R('M', 6), R('~', 24), R('M', 6), R('#', 2)),
  /* 21 */ row(R('#', 2), R('M', 6), R('~', 24), R('M', 6), R('#', 2)),
  /* 22 */ row(R('#', 2), R('M', 12), R('~', 12), R('M', 12), R('#', 2)),
  /* 23 */ row(R('#', 2), R('M', 12), R('~', 12), R('M', 12), R('#', 2)),
  // --- the two descents ----------------------------------------------------
  /* 24 */ row(R('#', 2), R('M', 8), R('#', 20), R('M', 8), R('#', 2)),
  /* 25 */ row(R('#', 2), R('M', 8), R('#', 20), R('M', 8), R('#', 2)),
  /* 26 */ row(R('#', 2), R('M', 8), R('#', 20), R('M', 8), R('#', 2)),
  // --- the pump floor: the piers kept, the bays did not --------------------
  /* 27 */ row(R('#', 2), R('M', 36), R('#', 2)),
  /* 28 */ row(R('#', 2), R('M', 36), R('#', 2)),
  /* 29 */ row(R('#', 2), R('M', 4), R('~', 7), R('M', 4), R('~', 6), R('M', 4), R('~', 7), R('M', 4), R('#', 2)),
  /* 30 */ row(R('#', 2), R('M', 4), R('~', 7), R('M', 4), R('~', 6), R('M', 4), R('~', 7), R('M', 4), R('#', 2)),
  /* 31 */ row(R('#', 2), R('M', 4), R('~', 7), R('M', 4), R('~', 6), R('M', 4), R('~', 7), R('M', 4), R('#', 2)),
  /* 32 */ row(R('#', 2), R('M', 36), R('#', 2)),
  /* 33 */ row(R('#', 2), R('M', 36), R('#', 2)),
  /* 34 */ row(R('#', 2), R('M', 4), R('~', 7), R('M', 4), R('~', 6), R('M', 4), R('~', 7), R('M', 4), R('#', 2)),
  /* 35 */ row(R('#', 2), R('M', 4), R('~', 7), R('M', 4), R('~', 6), R('M', 4), R('~', 7), R('M', 4), R('#', 2)),
  /* 36 */ row(R('#', 2), R('M', 36), R('#', 2)),
  // --- the receiving hall, still dry ---------------------------------------
  /* 37 */ row(R('#', 8), R('M', 24), R('#', 8)),
  /* 38 */ row(R('#', 8), R('M', 24), R('#', 8)),
  /* 39 */ row(R('#', 8), R('M', 24), R('#', 8)),
  /* 40 */ row(R('#', 17), R('M', 6), R('#', 17)),
  /* 41 */ row(R('#', 17), R('M', 6), R('#', 17)),
  /* 42 */ row(R('#', 17), R('M', 6), R('#', 17)),
];

export const SUNKEN_VAULT = {
  id: 'sunkenvault',
  name: 'The Sunken Vault',
  subtitle: 'Cistern of the Second Draw',
  kind: 'dungeon',
  light: 'cave',
  grade: 'cave',
  fog: ['#16242e', 24, 96],
  tilt: 0.35,
  cameraDistance: 16,
  cameraPitch: 0.68,
  music: 'cave',
  base: 'marble',
  groundRamp: 'cave',
  wallHeight: 10,
  wallMaterial: 'stone',
  lampIntensity: 8,
  lampRange: 14,
  // Positive, so the flood sits *over* the vault floor rather than under it —
  // this map is unreadable if the water cannot be seen.
  waterLevel: 0.08,
  water: { shallow: '#2c5f72', deep: '#0a161e', foam: '#7fbcc6', waveHeight: 0.045, waveScale: 0.30 },
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [20, 41], face: 'north' },
    world: { at: [20, 41], face: 'north' },
  },

  exits: [
    { at: [17, 42], size: [6, 1], to: 'overworld', spawn: 'sunkenvault',
      prompt: 'Leave the vault' },
  ],

  // Nothing here is walked into. The one scripted thing in the vault is the
  // intake at the cistern head, and it is examined rather than tripped over —
  // see `sv-intake` below.
  triggers: [],

  encounters: {
    rate: 22, terrain: 'marble', scenery: 'cave',
    groups: [
      { weight: 28, enemies: ['tidechanter', 'shellback'] },
      { weight: 24, enemies: ['aetherleech', 'aetherleech'] },
      { weight: 20, enemies: ['gearwright', 'shellback'] },
      { weight: 16, enemies: ['vaultsentinel'] },
      { weight: 12, enemies: ['aetherleech', 'tidechanter', 'tidechanter'] },
    ],
  },

  props: [
    // --- the receiving hall ------------------------------------------------
    { kit: 'savepoint', at: [20.5, 39.4], id: 'sv-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [17.4, 38.6], id: 'sv-gauge',
      interact: { name: 'Draw Gauge', text: [
        'A brass rule bolted to the wall, numbered from the floor to the ceiling.',
        'Every figure below the sixteenth notch is under water. The gauge is still ticking.',
      ] } },
    { kit: 'lamppost', at: [10.0, 38.0] },
    { kit: 'lamppost', at: [29.0, 38.0] },
    { kit: 'crate', at: [12.4, 37.6], rot: 0.3 },
    { kit: 'barrel', at: [27.6, 37.4] },
    { kit: 'chest', at: [9.5, 37.5], id: 'sv-chest-1',
      contains: { kind: 'item', id: 'xpotion', count: 3, label: '3 X-Potions' } },

    // --- the pump floor ----------------------------------------------------
    { kit: 'lamppost', at: [3.5, 34.0] },
    { kit: 'lamppost', at: [35.5, 34.0] },
    { kit: 'lamppost', at: [14.5, 29.0] },
    { kit: 'lamppost', at: [24.5, 29.0] },
    { kit: 'barrel', at: [3.6, 30.4] },
    { kit: 'crate', at: [35.4, 30.6], rot: 0.5 },
    { kit: 'cart', at: [24.5, 38.4], rot: 1.5 },
    { kit: 'chest', at: [3.5, 28.6], id: 'sv-chest-2',
      contains: { kind: 'item', id: 'wardingcord', count: 1, label: 'a Warding Cord' } },
    { kit: 'chest', at: [35.5, 35.4], id: 'sv-chest-3',
      contains: { kind: 'item', id: 'elixir', count: 2, label: '2 Elixirs' } },
    { kit: 'rock', at: [24.6, 27.4], scale: 1.1, seed: 3, material: 'cave' },
    { kit: 'rock', at: [14.4, 36.6], scale: 1.2, seed: 5, material: 'cave' },

    // --- the drowned nave --------------------------------------------------
    { kit: 'savepoint', at: [8.5, 22.6], id: 'sv-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [4.5, 20.0] },
    { kit: 'lamppost', at: [35.5, 20.0] },
    { kit: 'lamppost', at: [4.5, 16.0] },
    { kit: 'lamppost', at: [35.5, 16.0] },
    { kit: 'bench', at: [4.6, 17.6], rot: 0 },
    { kit: 'bench', at: [35.4, 17.6], rot: 0 },
    { kit: 'chest', at: [34.5, 23.4], id: 'sv-chest-4',
      contains: { kind: 'item', id: 'towershield', count: 1, label: 'a Tower Shield' } },
    // The two aisles are the only dry ground in the nave, so they are where a
    // vault's worth of unclaimed property ended up when the water came in.
    { kit: 'chest', at: [6.5, 19.5], id: 'sv-chest-6',
      contains: { kind: 'item', id: 'reliquaryknife', count: 1, label: 'the Reliquary Knife' } },
    { kit: 'chest', at: [32.5, 16.5], id: 'sv-chest-7',
      contains: { kind: 'item', id: 'thelastportrait', count: 1, label: 'the Last Portrait' } },
    { kit: 'signpost', at: [18.4, 14.6], id: 'sv-ford',
      interact: { name: 'Nave Marker', text: [
        'The aisles are dry and the nave is not, and both were meant to be dry.',
        'Someone has chalked an arrow at the one place the water thins. It is still there.',
      ] } },
    // The dry aisle, four feet from the water, where the hours are still said.
    { kit: 'signpost', at: [20.4, 14.6], id: 'sv-dryaisle',
      interact: { prompt: 'The dry aisle', event: 'sunkenvault_hours' } },
    { kit: 'rock', at: [3.4, 19.4], scale: 1.0, seed: 7, material: 'cave' },
    { kit: 'rock', at: [36.6, 19.6], scale: 1.1, seed: 9, material: 'cave' },

    // --- the causeway and its ledge ----------------------------------------
    { kit: 'lamppost', at: [19.0, 12.5] },
    // The ledge is barely wide enough for one person, so nothing else stands
    // on it — a rock here would wall the chest off from the only approach.
    { kit: 'chest', at: [34.5, 11.5], id: 'sv-chest-5',
      contains: { kind: 'item', id: 'megalixir', count: 1, label: 'a Megalixir' } },

    // --- the cistern head --------------------------------------------------
    { kit: 'savepoint', at: [19.5, 6.6], id: 'sv-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The terminal feature of the vault, and what it carries: the intake is the
    // one part of this building still doing its job, which is exactly what
    // What Remains is about. Its plate keeps the description.
    { kit: 'well', at: [20, 4.5], id: 'sv-intake', radius: 1.1, interactRadius: 2.4,
      interact: { prompt: 'The Intake', event: 'whatremains' } },
    { kit: 'signpost', at: [22.4, 3.4], id: 'sv-intake-plate',
      interact: { name: 'The Intake', text: [
        'The mouth of the vault. Water goes down it, and has been going down it',
        'for eleven years without the level in here dropping so much as a hand.',
      ] } },
    { kit: 'lamppost', at: [14.0, 4.0] },
    { kit: 'lamppost', at: [26.0, 4.0] },
    { kit: 'rock', at: [13.4, 5.6], scale: 1.6, seed: 13, material: 'cave' },
    { kit: 'rock', at: [26.6, 5.6], scale: 1.6, seed: 15, material: 'cave' },
    { kit: 'crate', at: [16.4, 3.4], rot: 0.7 },
  ],

  npcs: [],
};
