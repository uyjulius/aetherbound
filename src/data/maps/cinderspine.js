/**
 * The Cinderspine Pass.
 *
 * A switchback: the route zig-zags west, east, west again before reaching the
 * summit, so the climb *feels* like a climb rather than a corridor with snow
 * on it. Each traverse is wide and each ledge is narrow, which also means the
 * player fights in open ground and rests in cover.
 */

const W = 34;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[cinderspine] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 34)),
  /*  1 */ row(R('#', 34)),
  // --- the summit ----------------------------------------------------------
  /*  2 */ row(R('#', 12), R('*', 10), R('#', 12)),
  /*  3 */ row(R('#', 11), R('*', 12), R('#', 11)),
  /*  4 */ row(R('#', 11), R('*', 12), R('#', 11)),
  /*  5 */ row(R('#', 12), R('*', 10), R('#', 12)),
  /*  6 */ row(R('#', 14), R('*', 6), R('#', 14)),
  /*  7 */ row(R('#', 14), R('*', 6), R('#', 14)),
  // --- upper west ledge ----------------------------------------------------
  /*  8 */ row(R('#', 4), R('*', 14), R('#', 16)),
  /*  9 */ row(R('#', 4), R('*', 14), R('#', 16)),
  /* 10 */ row(R('#', 4), R('*', 14), R('#', 16)),
  /* 11 */ row(R('#', 4), R('*', 26), R('#', 4)),
  /* 12 */ row(R('#', 4), R('*', 26), R('#', 4)),
  // --- east ledge ----------------------------------------------------------
  /* 13 */ row(R('#', 16), R('*', 14), R('#', 4)),
  /* 14 */ row(R('#', 16), R('*', 14), R('#', 4)),
  /* 15 */ row(R('#', 16), R('*', 14), R('#', 4)),
  /* 16 */ row(R('#', 4), R('*', 26), R('#', 4)),
  /* 17 */ row(R('#', 4), R('*', 26), R('#', 4)),
  // --- lower west ledge ----------------------------------------------------
  /* 18 */ row(R('#', 4), R('*', 14), R('#', 16)),
  /* 19 */ row(R('#', 4), R('*', 14), R('#', 16)),
  /* 20 */ row(R('#', 4), R('*', 14), R('#', 16)),
  /* 21 */ row(R('#', 4), R('*', 26), R('#', 4)),
  /* 22 */ row(R('#', 4), R('*', 26), R('#', 4)),
  // --- the approach --------------------------------------------------------
  /* 23 */ row(R('#', 14), R('*', 6), R('#', 14)),
  /* 24 */ row(R('#', 14), R('*', 6), R('#', 14)),
  /* 25 */ row(R('#', 14), R('*', 6), R('#', 14)),
];

export const CINDERSPINE = {
  id: 'cinderspine',
  name: 'The Cinderspine',
  subtitle: 'Above the Snowline',
  kind: 'dungeon',
  light: 'snow',
  grade: 'snow',
  fog: ['#c4d4e6', 30, 130],
  tilt: 0.34,
  cameraDistance: 17,
  cameraPitch: 0.70,
  music: 'snowfield',
  base: 'snow',
  groundRamp: 'snow',
  wallHeight: 13,
  wallMaterial: 'rock',

  sky: {
    zenith: '#3a6f9e', horizon: '#d4e0ea', ground: '#8f9aa8',
    sunColor: '#ffffff', sunDir: [0.5, 0.7, 0.3], cloud: 0.35,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [16, 24], face: 'north' },
    world: { at: [16, 24], face: 'north' },
  },

  exits: [
    { at: [14, 25], size: [6, 1], to: 'overworld', spawn: 'ashenhall', prompt: 'Descend the pass' },
  ],

  triggers: [
    { at: [14, 7], size: [6, 1], kind: 'event', event: 'cinderspine_wyrm', once: true },
    // Where the drift lay across the mouth of the pass, and where the road
    // under it comes out when the hill starts draining. It spans the whole of
    // the approach corridor, so it cannot be walked round.
    //
    // Deliberately *not* `once`: the flag is armed on entry, before the event
    // runs, and before the sky changes this scene is one line about nine feet
    // of snow. Flagging it here would spend the thaw on a player who walked
    // up the pass in the first act. The event guards itself on `thaw_walked`.
    { at: [14, 22], size: [6, 1], kind: 'event', event: 'cinderspine_thaw' },
  ],

  encounters: {
    rate: 26, terrain: 'snow', scenery: 'snow',
    groups: [
      { weight: 28, enemies: ['rimewalker', 'rimewalker'] },
      { weight: 22, enemies: ['frostmaul'] },
      { weight: 20, enemies: ['cairnwight', 'rimewalker'] },
      { weight: 18, enemies: ['scarpdrake'] },
      { weight: 12, enemies: ['frostmaul', 'rimewalker', 'rimewalker'] },
    ],
  },

  props: [
    // --- the approach ------------------------------------------------------
    { kit: 'savepoint', at: [16.5, 23.4], id: 'cs-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [14.6, 23.0], id: 'cs-marker',
      interact: { name: 'Cairn Marker', text: [
        'A stack of stones with a boot frozen into the base of it.',
        'Someone has scratched an arrow pointing back the way you came.',
      ] } },
    { kit: 'tree', at: [5.5, 21.5], kind: 'pine', scale: 1.2, seed: 3 },
    { kit: 'tree', at: [27.0, 21.0], kind: 'pine', scale: 1.1, seed: 5 },
    { kit: 'rock', at: [8.0, 22.4], scale: 1.4, seed: 7 },

    // --- lower west ledge --------------------------------------------------
    { kit: 'chest', at: [5.5, 19.0], id: 'cs-chest-1',
      contains: { kind: 'item', id: 'wardenmail', count: 1, label: 'a suit of Warden Mail' } },
    { kit: 'rock', at: [11.0, 19.4], scale: 1.6, seed: 9 },
    { kit: 'tree', at: [8.5, 18.4], kind: 'pine', scale: 1.0, seed: 11 },

    // --- east ledge --------------------------------------------------------
    { kit: 'chest', at: [28.0, 14.0], id: 'cs-chest-2',
      contains: { kind: 'esper', id: 'hoarking', label: 'a shard of magicite' } },
    { kit: 'rock', at: [19.0, 14.6], scale: 1.5, seed: 13 },
    { kit: 'tree', at: [24.0, 13.4], kind: 'pine', scale: 1.2, seed: 15 },

    // --- upper west ledge --------------------------------------------------
    { kit: 'chest', at: [5.5, 9.0], id: 'cs-chest-3',
      contains: { kind: 'item', id: 'xpotion', count: 3, label: '3 X-Potions' } },
    { kit: 'rock', at: [12.0, 9.6], scale: 1.7, seed: 17 },
    { kit: 'rock', at: [9.0, 8.4], scale: 1.2, seed: 19 },

    // --- the summit --------------------------------------------------------
    { kit: 'chest', at: [13.0, 3.0], id: 'cs-chest-4',
      contains: { kind: 'esper', id: 'lastwinter', label: 'a shard of magicite' } },
    { kit: 'rock', at: [20.5, 3.2], scale: 2.0, seed: 21 },
    { kit: 'rock', at: [12.5, 4.6], scale: 1.6, seed: 23 },
    { kit: 'signpost', at: [17.5, 5.0], id: 'cs-summit',
      interact: { name: 'The Cairn at the Top', text: [
        'The stones here are older than the pass and were not stacked by hands.',
        'Below, the whole of Caelum Vast lies out flat and small and busy.',
      ] } },
  ],

  npcs: [],
};
