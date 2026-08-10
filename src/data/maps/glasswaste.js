/**
 * The Glasswaste — where the second draw came up through the ground.
 *
 * There is almost nothing here. No corridors, no doors, four small reefs of
 * fused glass and otherwise a floor you can see all the way across. Every
 * other dungeon in the world protects the player by hemming them in; this one
 * takes the walls away, and that is the threat. Nothing can be crept past.
 * Nothing can be broken line-of-sight with. The encounter fuse is the shortest
 * in the game and the shelter is two reefs apart, so the waste is dangerous in
 * exactly the way an open field is dangerous: not because you are trapped, but
 * because there is nowhere at all to be.
 *
 * The route is therefore not built, it is *marked* — a line of sighting posts
 * running south to north, each in sight of the last. A player who keeps the
 * posts on their path crosses in a straight line. A player who wanders finds
 * treasure at the reefs and pays for it in blood.
 *
 * Rows use the same run-length notation as the other dungeons.
 */

const W = 52;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[glasswaste] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('^', 52)),
  /*  1 */ row(R('^', 52)),
  // --- the northern shelf: the ground fused clean through ------------------
  /*  2 */ row(R('^', 2), R('A', 48), R('^', 2)),
  /*  3 */ row(R('^', 2), R('A', 48), R('^', 2)),
  /*  4 */ row(R('^', 2), R('A', 16), R('%', 16), R('A', 16), R('^', 2)),
  /*  5 */ row(R('^', 2), R('A', 10), R('%', 28), R('A', 10), R('^', 2)),
  /*  6 */ row(R('^', 2), R('A', 6), R('%', 36), R('A', 6), R('^', 2)),
  /*  7 */ row(R('^', 2), R('%', 14), R('A', 6), R('%', 8), R('A', 6), R('%', 14), R('^', 2)),
  /*  8 */ row(R('^', 2), R('%', 16), R('A', 4), R('%', 8), R('A', 4), R('%', 16), R('^', 2)),
  /*  9 */ row(R('^', 2), R('%', 48), R('^', 2)),
  /* 10 */ row(R('^', 2), R('%', 20), R('r', 2), R('%', 4), R('r', 2), R('%', 20), R('^', 2)),
  /* 11 */ row(R('^', 2), R('%', 48), R('^', 2)),
  // --- west reef ------------------------------------------------------------
  /* 12 */ row(R('^', 2), R('%', 8), R('^', 4), R('%', 36), R('^', 2)),
  /* 13 */ row(R('^', 2), R('%', 7), R('^', 6), R('%', 35), R('^', 2)),
  /* 14 */ row(R('^', 2), R('%', 8), R('^', 4), R('%', 36), R('^', 2)),
  /* 15 */ row(R('^', 2), R('%', 48), R('^', 2)),
  /* 16 */ row(R('^', 2), R('%', 22), R('A', 4), R('%', 22), R('^', 2)),
  /* 17 */ row(R('^', 2), R('%', 20), R('A', 8), R('%', 20), R('^', 2)),
  /* 18 */ row(R('^', 2), R('%', 22), R('A', 4), R('%', 22), R('^', 2)),
  /* 19 */ row(R('^', 2), R('%', 48), R('^', 2)),
  // --- east reef ------------------------------------------------------------
  /* 20 */ row(R('^', 2), R('%', 30), R('^', 4), R('%', 14), R('^', 2)),
  /* 21 */ row(R('^', 2), R('%', 29), R('^', 6), R('%', 13), R('^', 2)),
  /* 22 */ row(R('^', 2), R('%', 30), R('^', 4), R('%', 14), R('^', 2)),
  /* 23 */ row(R('^', 2), R('%', 48), R('^', 2)),
  /* 24 */ row(R('^', 2), R('%', 10), R('r', 2), R('%', 24), R('r', 2), R('%', 10), R('^', 2)),
  /* 25 */ row(R('^', 2), R('%', 48), R('^', 2)),
  // --- the burn: glass and a reef standing in it ---------------------------
  /* 26 */ row(R('^', 2), R('%', 14), R('A', 20), R('%', 14), R('^', 2)),
  /* 27 */ row(R('^', 2), R('%', 12), R('A', 24), R('%', 12), R('^', 2)),
  /* 28 */ row(R('^', 2), R('%', 12), R('^', 4), R('A', 20), R('%', 12), R('^', 2)),
  /* 29 */ row(R('^', 2), R('%', 11), R('^', 6), R('A', 19), R('%', 12), R('^', 2)),
  /* 30 */ row(R('^', 2), R('%', 12), R('^', 4), R('A', 20), R('%', 12), R('^', 2)),
  /* 31 */ row(R('^', 2), R('%', 14), R('A', 20), R('%', 14), R('^', 2)),
  /* 32 */ row(R('^', 2), R('%', 48), R('^', 2)),
  /* 33 */ row(R('^', 2), R('%', 48), R('^', 2)),
  /* 34 */ row(R('^', 2), R('%', 18), R('r', 2), R('%', 8), R('r', 2), R('%', 18), R('^', 2)),
  /* 35 */ row(R('^', 2), R('%', 48), R('^', 2)),
  /* 36 */ row(R('^', 2), R('%', 48), R('^', 2)),
  /* 37 */ row(R('^', 2), R('%', 48), R('^', 2)),
  // --- the notch you come in by --------------------------------------------
  /* 38 */ row(R('^', 22), R('%', 8), R('^', 22)),
  /* 39 */ row(R('^', 22), R('%', 8), R('^', 22)),
];

export const GLASSWASTE = {
  id: 'glasswaste',
  name: 'The Glasswaste',
  subtitle: 'Nowhere To Stand Out Of Sight',
  kind: 'dungeon',
  light: 'day',
  grade: 'desert',
  fog: ['#e2d3ae', 70, 300],
  tilt: 0.26,
  cameraDistance: 22,
  cameraPitch: 0.78,
  music: 'desert',
  base: 'sand',
  groundRamp: 'terrain',
  // Low, so the reefs read as shards standing in open ground rather than as
  // the walls of a room. Nothing here is allowed to feel like shelter.
  wallHeight: 5,
  wallMaterial: 'rock',
  outline: 1.0,

  sky: {
    zenith: '#6f97c4', horizon: '#f4e2bc', ground: '#c8b489',
    sunColor: '#fff4dc', sunDir: [0.2, 0.86, 0.1], cloud: 0.10,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [26, 37], face: 'north' },
    world: { at: [26, 37], face: 'north' },
  },

  exits: [
    { at: [22, 39], size: [8, 1], to: 'overworld', spawn: 'glasswaste',
      prompt: 'Leave the waste' },
  ],

  triggers: [],

  // The shortest fuse of any map in the game. Exposure is the dungeon.
  encounters: {
    rate: 15, terrain: 'sand', scenery: 'field',
    groups: [
      { weight: 28, enemies: ['scarpdrake'] },
      { weight: 24, enemies: ['cairnwight', 'cairnwight'] },
      { weight: 20, enemies: ['aetherleech', 'gearwright'] },
      { weight: 16, enemies: ['magitekarmour'] },
      { weight: 12, enemies: ['reliquary', 'cairnwight'] },
    ],
  },

  props: [
    // --- the notch, and the first sighting post ----------------------------
    { kit: 'savepoint', at: [26.5, 36.4], id: 'gw-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [23.4, 36.6], id: 'gw-first-post',
      interact: { name: 'First Sighting Post', text: [
        'An iron post with a sighting slot cut through the head of it.',
        'Look through it and the next post stands dead centre. There are eleven.',
        'Whoever set them meant for people to cross without stopping.',
      ] } },
    { kit: 'lamppost', at: [26.5, 34.5] },
    { kit: 'barrel', at: [29.4, 35.6] },

    // --- the sighting line, running north ----------------------------------
    { kit: 'signpost', at: [26.5, 32.5], id: 'gw-post-2' },
    { kit: 'signpost', at: [26.5, 28.5], id: 'gw-post-3' },
    { kit: 'signpost', at: [26.5, 24.5], id: 'gw-post-4' },
    { kit: 'signpost', at: [26.5, 19.5], id: 'gw-post-5' },
    { kit: 'signpost', at: [26.5, 15.5], id: 'gw-post-6' },
    { kit: 'signpost', at: [26.5, 11.5], id: 'gw-post-7' },
    { kit: 'signpost', at: [26.5, 7.5], id: 'gw-post-8' },
    { kit: 'lamppost', at: [26.5, 21.5] },
    { kit: 'lamppost', at: [26.5, 9.5] },

    // --- the burn reef, south-west -----------------------------------------
    { kit: 'rock', at: [13.5, 27.5], scale: 1.9, seed: 3 },
    { kit: 'rock', at: [12.0, 31.4], scale: 1.4, seed: 5 },
    { kit: 'chest', at: [12.5, 26.5], id: 'gw-chest-1',
      contains: { kind: 'item', id: 'stormflask', count: 3, label: '3 Storm Flasks' } },
    { kit: 'crate', at: [17.6, 31.6], rot: 0.6 },
    // The sheet lying flat in the burn. Standing where it can be looked at is
    // the whole of the approach; there is no cover here to look at it from.
    { kit: 'signpost', at: [20.5, 27.5], id: 'gw-pane',
      interact: { prompt: 'The lying sheet', event: 'standing_pane' } },
    // The burn is where the draw came up as fire, which is the one thing in the
    // world that has been through worse than a wyrm.
    { kit: 'chest', at: [19.5, 29.5], id: 'gw-chest-6',
      contains: { kind: 'item', id: 'wyrmscaleplate', count: 1, label: 'a suit of Wyrmscale Plate' } },

    // --- east reef ----------------------------------------------------------
    { kit: 'rock', at: [35.5, 23.4], scale: 1.7, seed: 7 },
    { kit: 'rock', at: [37.0, 19.5], scale: 1.3, seed: 9 },
    { kit: 'chest', at: [37.5, 23.5], id: 'gw-chest-2',
      contains: { kind: 'item', id: 'lastlight', count: 1, label: 'the Last Light' } },
    { kit: 'savepoint', at: [34.5, 19.4], id: 'gw-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [39.4, 21.6], id: 'gw-reefpost',
      interact: { name: 'Toppled Post', text: [
        'A sighting post lying flat, its head sheared clean off at the slot.',
        'Something walked through it rather than round it.',
      ] } },

    // --- west reef ----------------------------------------------------------
    { kit: 'rock', at: [7.5, 12.5], scale: 1.8, seed: 11 },
    { kit: 'rock', at: [15.0, 14.6], scale: 1.5, seed: 13 },
    { kit: 'chest', at: [6.5, 15.5], id: 'gw-chest-3',
      contains: { kind: 'item', id: 'stormfists', count: 1, label: 'a pair of Storm Fists' } },
    { kit: 'crate', at: [16.4, 12.4], rot: 0.3 },
    { kit: 'barrel', at: [16.6, 11.4] },

    // --- the northern shelf --------------------------------------------------
    { kit: 'savepoint', at: [26.5, 5.5], id: 'gw-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The terminal feature. A shaft in open ground with no road to it and
    // nothing built round it is the Tenth Well's whole description, and the
    // waste is the only place in the world that answers it. The post beside it
    // keeps the description of the vent itself.
    { kit: 'well', at: [26.0, 3.0], id: 'gw-vent', radius: 1.1, interactRadius: 2.4,
      interact: { prompt: 'The Vent', event: 'tenth_well' } },
    { kit: 'signpost', at: [29.4, 3.4], id: 'gw-vent-post',
      interact: { name: 'The Vent', text: [
        'The hole the draw came up through. It is perfectly round and the rim',
        'is smooth as a bottle lip, which is not something fire does.',
        'The glass runs downhill from here in every direction at once.',
      ] } },
    { kit: 'rock', at: [11.0, 4.0], scale: 2.0, seed: 15 },
    { kit: 'rock', at: [41.0, 4.0], scale: 2.0, seed: 17 },
    { kit: 'chest', at: [42.5, 6.5], id: 'gw-chest-4',
      contains: { kind: 'item', id: 'phoenixtear', count: 2, label: '2 Phoenix Tears' } },
    { kit: 'chest', at: [9.5, 6.5], id: 'gw-chest-5',
      contains: { kind: 'item', id: 'megalixir', count: 1, label: 'a Megalixir' } },
  ],

  npcs: [],
};
