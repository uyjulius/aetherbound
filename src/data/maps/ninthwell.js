/**
 * The Ninth Well — the endgame.
 *
 * A descent, and shaped like one: three galleries of Imperium workings, each
 * one narrower and further from daylight, then the Well itself, then whatever
 * the Chancellor has made of the chamber beneath it. The floor changes under
 * you as you go — machine plating gives way to aether-stone — so the player
 * can feel they have left the Imperium's part of the shaft behind without
 * being told.
 *
 * Two bosses: the Warden guards the Well, and Vhaine is past it.
 */

const W = 36;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[ninthwell] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 36)),
  /*  1 */ row(R('#', 36)),
  // --- the chamber beneath ------------------------------------------------
  /*  2 */ row(R('#', 10), R('A', 16), R('#', 10)),
  /*  3 */ row(R('#', 9), R('A', 18), R('#', 9)),
  /*  4 */ row(R('#', 9), R('A', 18), R('#', 9)),
  /*  5 */ row(R('#', 9), R('A', 18), R('#', 9)),
  /*  6 */ row(R('#', 10), R('A', 16), R('#', 10)),
  /*  7 */ row(R('#', 16), R('A', 4), R('#', 16)),
  /*  8 */ row(R('#', 16), R('A', 4), R('#', 16)),
  // --- the Well -----------------------------------------------------------
  /*  9 */ row(R('#', 8), R('A', 20), R('#', 8)),
  /* 10 */ row(R('#', 7), R('A', 22), R('#', 7)),
  /* 11 */ row(R('#', 7), R('A', 22), R('#', 7)),
  /* 12 */ row(R('#', 7), R('A', 22), R('#', 7)),
  /* 13 */ row(R('#', 8), R('A', 20), R('#', 8)),
  /* 14 */ row(R('#', 16), R('A', 4), R('#', 16)),
  /* 15 */ row(R('#', 16), R('A', 4), R('#', 16)),
  // --- third gallery ------------------------------------------------------
  /* 16 */ row(R('#', 4), R('G', 28), R('#', 4)),
  /* 17 */ row(R('#', 4), R('G', 28), R('#', 4)),
  /* 18 */ row(R('#', 4), R('G', 28), R('#', 4)),
  /* 19 */ row(R('#', 14), R('G', 8), R('#', 14)),
  /* 20 */ row(R('#', 14), R('G', 8), R('#', 14)),
  // --- second gallery -----------------------------------------------------
  /* 21 */ row(R('#', 4), R('G', 28), R('#', 4)),
  /* 22 */ row(R('#', 4), R('G', 28), R('#', 4)),
  /* 23 */ row(R('#', 4), R('G', 28), R('#', 4)),
  /* 24 */ row(R('#', 14), R('G', 8), R('#', 14)),
  /* 25 */ row(R('#', 14), R('G', 8), R('#', 14)),
  // --- first gallery ------------------------------------------------------
  /* 26 */ row(R('#', 6), R('G', 24), R('#', 6)),
  /* 27 */ row(R('#', 6), R('G', 24), R('#', 6)),
  /* 28 */ row(R('#', 6), R('G', 24), R('#', 6)),
  /* 29 */ row(R('#', 14), R('G', 8), R('#', 14)),
  /* 30 */ row(R('#', 14), R('G', 8), R('#', 14)),
  // --- the head of the shaft ----------------------------------------------
  /* 31 */ row(R('#', 16), R('G', 4), R('#', 16)),
  /* 32 */ row(R('#', 16), R('G', 4), R('#', 16)),
  /* 33 */ row(R('#', 16), R('G', 4), R('#', 16)),
];

/**
 * The three story zones of the descent, held in a const because the shaft after
 * the cataclysm restates them and adds two of its own — `resolveMap` replaces a
 * trigger list rather than merging it, and losing the finale would be fatal.
 */
const NINTH_WELL_TRIGGERS = [
  { at: [16, 14], size: [4, 1], kind: 'event', event: 'ninthwell_warden', once: true },
  // The Well opening is the hinge of the game, so it fires on the way *out*
  // of the Warden's chamber rather than on the way to the final fight — the
  // player then walks the changed world before they finish the story.
  { at: [16, 9], size: [4, 1], kind: 'event', event: 'cataclysm', once: true },
  { at: [16, 7], size: [4, 1], kind: 'event', event: 'ninthwell_finale', once: true },
];

export const NINTH_WELL = {
  id: 'ninth_well',
  name: 'The Ninth Well',
  subtitle: 'What They Were Digging For',
  kind: 'dungeon',
  light: 'void',
  grade: 'void',
  fog: ['#140f22', 22, 90],
  tilt: 0.36,
  cameraDistance: 16,
  cameraPitch: 0.68,
  music: 'imperium',
  base: 'magitek',
  groundRamp: 'magitek',
  wallHeight: 12,
  wallMaterial: 'iron',
  lampIntensity: 7,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [17, 32], face: 'north' },
    world: { at: [17, 32], face: 'north' },
  },

  exits: [
    { at: [16, 33], size: [4, 1], to: 'overworld', spawn: 'ferran', prompt: 'Climb out' },
  ],

  triggers: NINTH_WELL_TRIGGERS,

  /**
   * The shaft after it was opened. The galleries are the same galleries; what is
   * new is ash on the plating, and a low door in the west wall of the Well that
   * nobody could open while the inventory said the key was lost.
   */
  ruin: {
    subtitle: 'The Hole It Came Out Of',
    triggers: [
      ...NINTH_WELL_TRIGGERS,
      // First gallery, on the ash: two sets of prints, one inside the other.
      { at: [12, 27], size: [3, 2], kind: 'event', event: 'mask_reflection' },
      // The low door, flush with the west wall of the Well chamber.
      { at: [8, 10], size: [2, 2], kind: 'event', event: 'the_well_reads_back' },
    ],
  },

  encounters: {
    rate: 24, terrain: 'cobble', scenery: 'cave',
    groups: [
      { weight: 28, enemies: ['vaultsentinel'] },
      { weight: 24, enemies: ['magitekarmour', 'gearwright'] },
      { weight: 20, enemies: ['aetherleech', 'aetherleech'] },
      { weight: 16, enemies: ['ashknight', 'cairnwight'] },
      { weight: 12, enemies: ['magitekarmour', 'magitekarmour'] },
    ],
  },

  props: [
    // --- head of the shaft -------------------------------------------------
    { kit: 'savepoint', at: [17.5, 31.4], id: 'nw-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [16.4, 31.0], id: 'nw-notice',
      interact: { name: 'Bolted Notice', text: [
        'DRAW SCHEDULE — NINTH WELL',
        'Year 41: four measures. Year 46: eleven. Year 49: forty-two.',
        'Someone has written under the last figure: THERE IS NOT FORTY-TWO OF ANYTHING DOWN THERE.',
      ] } },

    // Where the draw gear was bolted down. Nobody stands here until afterwards,
    // and then somebody stands here with a sheet of paper.
    { kit: 'signpost', at: [19.4, 31.0], id: 'nw-shafthead',
      interact: { prompt: 'The shaft head', event: 'ninthwell_account' } },

    // --- galleries ---------------------------------------------------------
    { kit: 'lamppost', at: [8.0, 27.0] },
    { kit: 'lamppost', at: [27.0, 27.0] },
    { kit: 'crate', at: [10.5, 27.6], rot: 0.3 },
    { kit: 'barrel', at: [24.5, 27.4] },
    { kit: 'chest', at: [7.0, 26.6], id: 'nw-chest-1',
      contains: { kind: 'item', id: 'megalixir', count: 2, label: '2 Megalixirs' } },

    { kit: 'lamppost', at: [6.0, 22.0] },
    { kit: 'lamppost', at: [29.0, 22.0] },
    { kit: 'cart', at: [17.5, 22.4], rot: 0.8 },
    { kit: 'chest', at: [29.5, 22.6], id: 'nw-chest-2',
      contains: { kind: 'item', id: 'twinfang', count: 1, label: 'a Twin Fang' } },

    { kit: 'lamppost', at: [6.0, 17.0] },
    { kit: 'lamppost', at: [29.0, 17.0] },
    { kit: 'chest', at: [6.5, 17.6], id: 'nw-chest-3',
      contains: { kind: 'item', id: 'earnestcharm', count: 1, label: 'an Earnest Charm' } },
    { kit: 'savepoint', at: [17.5, 16.4], id: 'nw-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },

    // --- the Well ----------------------------------------------------------
    { kit: 'well', at: [17.5, 11], id: 'nw-well', radius: 1.4,
      interact: { name: 'The Ninth Well', text: [
        'The shaft goes down past where the lamplight gives out.',
        'It is not dark down there. It is simply too far to see.',
      ] } },
    { kit: 'lamppost', at: [10.0, 10.0] },
    { kit: 'lamppost', at: [25.0, 10.0] },
    { kit: 'lamppost', at: [10.0, 13.0] },
    { kit: 'lamppost', at: [25.0, 13.0] },
    { kit: 'lamppost', at: [12.0, 5.0] },
    { kit: 'lamppost', at: [23.0, 5.0] },
    { kit: 'rock', at: [9.0, 12.4], scale: 1.5, seed: 3, material: 'cave' },
    { kit: 'rock', at: [26.0, 12.4], scale: 1.5, seed: 5, material: 'cave' },

    // --- the chamber beneath ----------------------------------------------
    { kit: 'savepoint', at: [17.5, 8.6], id: 'nw-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'rock', at: [11.0, 4.0], scale: 2.0, seed: 7, material: 'cave' },
    { kit: 'rock', at: [24.0, 4.0], scale: 2.0, seed: 9, material: 'cave' },
    { kit: 'chest', at: [11.5, 2.6], id: 'nw-chest-4',
      contains: { kind: 'esper', id: 'enginechild', label: 'a shard of magicite' } },
  ],

  npcs: [
    {
      id: 'themask', name: 'The Mask', at: [17.5, 30.0], face: 'south', clip: 'idle',
      prompt: 'Approach', event: 'recruit_mask', facePlayer: true,
      look: { id: 'themask', build: 'normal', height: 1.74, hair: 'bald', eyeStyle: 'closed',
        colors: { skin: '#b8b6bd', hair: '#4a4750', torso: '#2c1b4d', accent: '#3fc6d6',
          legs: '#1c1131', boots: '#0f0a1c', gloves: '#41296f', cape: '#2c1b4d' } },
    },
  ],
};
