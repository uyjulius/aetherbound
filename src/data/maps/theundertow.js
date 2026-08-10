/**
 * The Undertow — a gallery scoured one way, and only one way.
 *
 * The whole map is a single straight flooded gallery, thirty-six paces across
 * and fifty long, standing ankle-deep. What is in it is eighteen sumps: holes
 * scoured through the floor by water that has been going the same direction
 * for a very long time. Every sump is drawn the shape the water made it —
 * blunt across the north end, where the flow piles up against it, and drawn
 * out southward to a single tile of a point, where the flow closes behind it.
 *
 * That one detail is the dungeon. Walking SOUTH, you meet the wide end of a
 * stone first, step round it, and find the channel opening in front of you the
 * whole way past: the gaps widen as you go, so you never have to choose, never
 * have to double back, and can run the length of the gallery without slowing.
 * Walking NORTH, you get the same geometry backwards. You enter each band
 * where the channels are widest, and they close steadily as you advance, until
 * three paces is all there is — and by then you are committed, because the
 * stone on either side is forty paces of deep water. Pick the wrong slot at the
 * bottom of a band and you walk it to the top before you find out.
 *
 * The six bands are set so that every slot in one points squarely at the nose
 * of a stone in the next. Nothing about the going north is ever blocked; it is
 * only ever a jink, then a commitment, then a jink. Downstream is a run.
 *
 * The party comes in at the tail and works up against it, which means the map
 * is played the slow way first and the fast way last, and the run home at the
 * end takes about a fifth of the time the climb did. Everything worth having
 * is in the slack water at the sides — six cells scoured into the walls where
 * the current lets go — because the fast way passes none of them.
 *
 * Rows use the same run-length notation as the other dungeons; a miscounted
 * row here would blunt a point or square off a nose, and the shape of these
 * stones is the only instruction the player gets.
 */

const W = 44;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[theundertow] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// The gallery runs cols 4-39. The stones stand in six bands, and the bands
// alternate between two sets of centre lines:
//   odd bands  (rows 8, 24, 40): centres at cols 11, 23, 35 — slots at 4-6, 16-18, 28-30
//   even bands (rows 16, 32, 48): centres at cols 5, 17, 29, 39 — slots at 9-12, 22-24, 34-36
// Each stone is nine paces across at its blunt north end and loses one pace a
// side every row south, so it comes to a point in five rows.

const TERRAIN = [
  /*  0 */ row(R('#', 44)),
  /*  1 */ row(R('#', 44)),
  // --- the head of the gallery, above the scour ----------------------------
  /*  2 */ row(R('#', 4), R('R', 36), R('#', 4)),
  /*  3 */ row(R('#', 4), R('R', 36), R('#', 4)),
  /*  4 */ row(R('#', 4), R('R', 36), R('#', 4)),
  /*  5 */ row(R('#', 4), R('R', 36), R('#', 4)),
  /*  6 */ row(R('#', 4), R('R', 36), R('#', 4)),
  /*  7 */ row(R('#', 4), R(':', 36), R('#', 4)),
  // --- first band of sumps: three stones, three slots ----------------------
  /*  8 */ row(R('#', 4), R(':', 3), R('~', 9), R(':', 3), R('~', 9), R(':', 3), R('~', 9), R('#', 4)),
  /*  9 */ row(R('#', 4), R(':', 4), R('~', 7), R(':', 5), R('~', 7), R(':', 5), R('~', 7), R(':', 1), R('#', 4)),
  /* 10 */ row(R('#', 4), R(':', 5), R('~', 5), R(':', 7), R('~', 5), R(':', 7), R('~', 5), R(':', 2), R('#', 4)),
  /* 11 */ row(R('#', 4), R(':', 6), R('~', 3), R(':', 9), R('~', 3), R(':', 9), R('~', 3), R(':', 3), R('#', 4)),
  /* 12 */ row(R('#', 4), R(':', 7), R('~', 1), R(':', 11), R('~', 1), R(':', 11), R('~', 1), R(':', 4), R('#', 4)),
  // slack water, west wall
  /* 13 */ row(R('#', 1), R('R', 3), R(':', 36), R('#', 4)),
  /* 14 */ row(R('#', 1), R('R', 3), R(':', 36), R('#', 4)),
  /* 15 */ row(R('#', 1), R('R', 3), R(':', 36), R('#', 4)),
  // --- second band, set to stand square in the first band's slots ---------
  /* 16 */ row(R('#', 4), R('~', 5), R(':', 4), R('~', 9), R(':', 3), R('~', 9), R(':', 3), R('~', 3), R('#', 4)),
  /* 17 */ row(R('#', 4), R('~', 4), R(':', 6), R('~', 7), R(':', 5), R('~', 7), R(':', 5), R('~', 2), R('#', 4)),
  /* 18 */ row(R('#', 4), R('~', 3), R(':', 8), R('~', 5), R(':', 7), R('~', 5), R(':', 7), R('~', 1), R('#', 4)),
  /* 19 */ row(R('#', 4), R(':', 1), R('~', 1), R(':', 10), R('~', 3), R(':', 9), R('~', 3), R(':', 9), R('#', 4)),
  /* 20 */ row(R('#', 4), R(':', 13), R('~', 1), R(':', 11), R('~', 1), R(':', 10), R('#', 4)),
  // slack water, east wall
  /* 21 */ row(R('#', 4), R(':', 36), R('R', 3), R('#', 1)),
  /* 22 */ row(R('#', 4), R(':', 36), R('R', 3), R('#', 1)),
  /* 23 */ row(R('#', 4), R(':', 36), R('R', 3), R('#', 1)),
  // --- third band ----------------------------------------------------------
  /* 24 */ row(R('#', 4), R(':', 3), R('~', 9), R(':', 3), R('~', 9), R(':', 3), R('~', 9), R('#', 4)),
  /* 25 */ row(R('#', 4), R(':', 4), R('~', 7), R(':', 5), R('~', 7), R(':', 5), R('~', 7), R(':', 1), R('#', 4)),
  /* 26 */ row(R('#', 4), R(':', 5), R('~', 5), R(':', 7), R('~', 5), R(':', 7), R('~', 5), R(':', 2), R('#', 4)),
  /* 27 */ row(R('#', 4), R(':', 6), R('~', 3), R(':', 9), R('~', 3), R(':', 9), R('~', 3), R(':', 3), R('#', 4)),
  /* 28 */ row(R('#', 4), R(':', 7), R('~', 1), R(':', 11), R('~', 1), R(':', 11), R('~', 1), R(':', 4), R('#', 4)),
  // slack water, west wall
  /* 29 */ row(R('#', 1), R('R', 3), R(':', 36), R('#', 4)),
  /* 30 */ row(R('#', 1), R('R', 3), R(':', 36), R('#', 4)),
  /* 31 */ row(R('#', 1), R('R', 3), R(':', 36), R('#', 4)),
  // --- fourth band ---------------------------------------------------------
  /* 32 */ row(R('#', 4), R('~', 5), R(':', 4), R('~', 9), R(':', 3), R('~', 9), R(':', 3), R('~', 3), R('#', 4)),
  /* 33 */ row(R('#', 4), R('~', 4), R(':', 6), R('~', 7), R(':', 5), R('~', 7), R(':', 5), R('~', 2), R('#', 4)),
  /* 34 */ row(R('#', 4), R('~', 3), R(':', 8), R('~', 5), R(':', 7), R('~', 5), R(':', 7), R('~', 1), R('#', 4)),
  /* 35 */ row(R('#', 4), R(':', 1), R('~', 1), R(':', 10), R('~', 3), R(':', 9), R('~', 3), R(':', 9), R('#', 4)),
  /* 36 */ row(R('#', 4), R(':', 13), R('~', 1), R(':', 11), R('~', 1), R(':', 10), R('#', 4)),
  // slack water, east wall
  /* 37 */ row(R('#', 4), R(':', 36), R('R', 3), R('#', 1)),
  /* 38 */ row(R('#', 4), R(':', 36), R('R', 3), R('#', 1)),
  /* 39 */ row(R('#', 4), R(':', 36), R('R', 3), R('#', 1)),
  // --- fifth band ----------------------------------------------------------
  /* 40 */ row(R('#', 4), R(':', 3), R('~', 9), R(':', 3), R('~', 9), R(':', 3), R('~', 9), R('#', 4)),
  /* 41 */ row(R('#', 4), R(':', 4), R('~', 7), R(':', 5), R('~', 7), R(':', 5), R('~', 7), R(':', 1), R('#', 4)),
  /* 42 */ row(R('#', 4), R(':', 5), R('~', 5), R(':', 7), R('~', 5), R(':', 7), R('~', 5), R(':', 2), R('#', 4)),
  /* 43 */ row(R('#', 4), R(':', 6), R('~', 3), R(':', 9), R('~', 3), R(':', 9), R('~', 3), R(':', 3), R('#', 4)),
  /* 44 */ row(R('#', 4), R(':', 7), R('~', 1), R(':', 11), R('~', 1), R(':', 11), R('~', 1), R(':', 4), R('#', 4)),
  // slack water, west wall
  /* 45 */ row(R('#', 1), R('R', 3), R(':', 36), R('#', 4)),
  /* 46 */ row(R('#', 1), R('R', 3), R(':', 36), R('#', 4)),
  /* 47 */ row(R('#', 1), R('R', 3), R(':', 36), R('#', 4)),
  // --- sixth band ----------------------------------------------------------
  /* 48 */ row(R('#', 4), R('~', 5), R(':', 4), R('~', 9), R(':', 3), R('~', 9), R(':', 3), R('~', 3), R('#', 4)),
  /* 49 */ row(R('#', 4), R('~', 4), R(':', 6), R('~', 7), R(':', 5), R('~', 7), R(':', 5), R('~', 2), R('#', 4)),
  /* 50 */ row(R('#', 4), R('~', 3), R(':', 8), R('~', 5), R(':', 7), R('~', 5), R(':', 7), R('~', 1), R('#', 4)),
  /* 51 */ row(R('#', 4), R(':', 1), R('~', 1), R(':', 10), R('~', 3), R(':', 9), R('~', 3), R(':', 9), R('#', 4)),
  /* 52 */ row(R('#', 4), R(':', 13), R('~', 1), R(':', 11), R('~', 1), R(':', 10), R('#', 4)),
  // slack water, east wall
  /* 53 */ row(R('#', 4), R(':', 36), R('R', 3), R('#', 1)),
  /* 54 */ row(R('#', 4), R(':', 36), R('R', 3), R('#', 1)),
  // --- the tail, where the water lets go -----------------------------------
  /* 55 */ row(R('#', 4), R('R', 36), R('#', 4)),
  /* 56 */ row(R('#', 4), R('R', 36), R('#', 4)),
  /* 57 */ row(R('#', 4), R('R', 36), R('#', 4)),
  /* 58 */ row(R('#', 4), R('R', 36), R('#', 4)),
  /* 59 */ row(R('#', 4), R('R', 36), R('#', 4)),
  // --- the way out ---------------------------------------------------------
  /* 60 */ row(R('#', 20), R('R', 4), R('#', 20)),
  /* 61 */ row(R('#', 20), R('R', 4), R('#', 20)),
];

export const THE_UNDERTOW = {
  id: 'theundertow',
  name: 'The Undertow',
  subtitle: 'Fast One Way',
  kind: 'dungeon',
  light: 'cave',
  grade: 'cave',
  fog: ['#0e1c24', 16, 66],
  tilt: 0.36,
  cameraDistance: 17,
  cameraPitch: 0.70,
  music: 'cave',
  base: 'rock',
  groundRamp: 'cave',
  wallHeight: 14,
  wallMaterial: 'rock',
  lampIntensity: 9,
  lampRange: 13,
  // Positive, so the shallow standing water sits over the floor and the sumps
  // read as holes rather than as patches of darker stone.
  waterLevel: 0.10,
  water: { shallow: '#2a5a68', deep: '#08141c', foam: '#8ec4cc', waveHeight: 0.05, waveScale: 0.26 },
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [21, 58], face: 'north' },
    world: { at: [21, 58], face: 'north' },
  },

  exits: [
    { at: [20, 61], size: [4, 1], to: 'eastreach', spawn: 'undertow_tail',
      prompt: 'Leave the gallery' },
  ],

  triggers: [],

  // Two zones, split at the middle of the run, and the head left out of both.
  // The head is the only part of the gallery above the scour, and it is where
  // the two hunts are.
  encounterZones: [
    { rect: [0, 27, 44, 35], table: 'undermarch' },        // the lower run and the tail
    { rect: [0, 7, 44, 20], table: 'undermarch_deep' },    // the upper run
  ],

  encounters: {
    rate: 30, terrain: 'cave', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['keelworm', 'crossgrainhound'] },
      { weight: 22, enemies: ['slipknave', 'bitterbriar', 'bitterbriar'] },
      { weight: 18, enemies: ['dampener', 'theillwisher'] },
      { weight: 16, enemies: ['crevicehound', 'grudgewight'] },
      { weight: 12, enemies: ['pitprop', 'tithewisp', 'tithewisp'] },
      { weight: 10, enemies: ['boringengine'] },
      { weight: 3, enemies: ['thelongdrift'] },
      { weight: 2, enemies: ['themotherlode'] },
    ],
  },

  props: [
    // --- the tail, where the water lets go -----------------------------------
    { kit: 'savepoint', at: [21.5, 57.5], id: 'ut-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [18.5, 57.5], id: 'ut-board',
      interact: { name: 'The Tail Board', text: [
        'A board wedged in the rock at the foot of the gallery, in a gauger\'s hand.',
        'THE STONES ARE ALL POINTED THE SAME WAY. GOING UP, THE GAPS SHUT ON YOU.',
        'CHOOSE YOUR SLOT FROM THE BOTTOM AND DO NOT CHANGE YOUR MIND.',
      ] } },
    { kit: 'lamppost', at: [10.5, 57.5] },
    { kit: 'lamppost', at: [31.5, 57.5] },
    { kit: 'crate', at: [8.5, 58.5], rot: 0.5 },
    { kit: 'chest', at: [35.5, 58.5], id: 'ut-chest-1',
      contains: { kind: 'item', id: 'stillwaterdram', count: 3, label: '3 Still Water Drams' } },

    // --- the run: wrack piled against the blunt end of every stone ----------
    // None of it is solid. It is there so that the north faces read as north
    // faces from a long way off, which is the only warning the map gives.
    { kit: 'rock', at: [11.5, 7.5], scale: 1.2, seed: 3, material: 'cave', solid: false },
    { kit: 'rock', at: [23.5, 7.5], scale: 1.2, seed: 5, material: 'cave', solid: false },
    { kit: 'rock', at: [35.5, 7.5], scale: 1.2, seed: 7, material: 'cave', solid: false },
    { kit: 'rock', at: [5.5, 15.5], scale: 1.2, seed: 9, material: 'cave', solid: false },
    { kit: 'rock', at: [17.5, 15.5], scale: 1.2, seed: 11, material: 'cave', solid: false },
    { kit: 'rock', at: [29.5, 15.5], scale: 1.2, seed: 13, material: 'cave', solid: false },
    { kit: 'rock', at: [39.5, 15.5], scale: 1.1, seed: 15, material: 'cave', solid: false },
    { kit: 'rock', at: [11.5, 23.5], scale: 1.2, seed: 17, material: 'cave', solid: false },
    { kit: 'rock', at: [23.5, 23.5], scale: 1.2, seed: 19, material: 'cave', solid: false },
    { kit: 'rock', at: [35.5, 23.5], scale: 1.2, seed: 21, material: 'cave', solid: false },
    { kit: 'rock', at: [5.5, 31.5], scale: 1.2, seed: 23, material: 'cave', solid: false },
    { kit: 'rock', at: [17.5, 31.5], scale: 1.2, seed: 25, material: 'cave', solid: false },
    { kit: 'rock', at: [29.5, 31.5], scale: 1.2, seed: 27, material: 'cave', solid: false },
    { kit: 'rock', at: [39.5, 31.5], scale: 1.1, seed: 29, material: 'cave', solid: false },
    { kit: 'rock', at: [11.5, 39.5], scale: 1.2, seed: 31, material: 'cave', solid: false },
    { kit: 'rock', at: [23.5, 39.5], scale: 1.2, seed: 33, material: 'cave', solid: false },
    { kit: 'rock', at: [35.5, 39.5], scale: 1.2, seed: 35, material: 'cave', solid: false },
    { kit: 'rock', at: [5.5, 47.5], scale: 1.2, seed: 37, material: 'cave', solid: false },
    { kit: 'rock', at: [17.5, 47.5], scale: 1.2, seed: 39, material: 'cave', solid: false },
    { kit: 'rock', at: [29.5, 47.5], scale: 1.2, seed: 41, material: 'cave', solid: false },
    { kit: 'rock', at: [39.5, 47.5], scale: 1.1, seed: 43, material: 'cave', solid: false },

    { kit: 'lamppost', at: [8.5, 54.5] },
    { kit: 'lamppost', at: [34.5, 54.5] },
    { kit: 'lamppost', at: [8.5, 46.5] },
    { kit: 'lamppost', at: [34.5, 46.5] },
    { kit: 'lamppost', at: [8.5, 38.5] },
    { kit: 'lamppost', at: [34.5, 38.5] },
    { kit: 'lamppost', at: [8.5, 30.5] },
    { kit: 'lamppost', at: [34.5, 30.5] },
    { kit: 'lamppost', at: [8.5, 22.5] },
    { kit: 'lamppost', at: [34.5, 22.5] },
    { kit: 'lamppost', at: [8.5, 14.5] },
    { kit: 'lamppost', at: [34.5, 14.5] },

    // --- the slack water: six cells the current never reaches ---------------
    { kit: 'lamppost', at: [2.5, 13.5] },
    { kit: 'chest', at: [2.5, 14.5], id: 'ut-chest-2',
      contains: { kind: 'item', id: 'stillglass', count: 1, label: 'a Still Glass' } },
    { kit: 'lamppost', at: [41.5, 21.5] },
    { kit: 'savepoint', at: [41.5, 22.5], id: 'ut-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [2.5, 29.5], id: 'ut-slack',
      interact: { name: 'Slack Water', text: [
        'A pocket scoured into the wall where the flow turns back on itself and',
        'gives up. Everything the gallery has ever carried and let go of is here,',
        'sorted by weight, in bands, like a shelf somebody keeps.',
      ] } },
    { kit: 'chest', at: [2.5, 30.5], id: 'ut-chest-3',
      contains: { kind: 'item', id: 'tideheart', count: 1, label: 'a Tideheart' } },
    { kit: 'lamppost', at: [41.5, 37.5] },
    { kit: 'savepoint', at: [41.5, 38.5], id: 'ut-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [2.5, 45.5] },
    { kit: 'chest', at: [2.5, 46.5], id: 'ut-chest-4',
      contains: { kind: 'item', id: 'stillwatergi', count: 1, label: 'a Still Water Gi' } },
    { kit: 'chest', at: [41.5, 53.5], id: 'ut-chest-5',
      contains: { kind: 'item', id: 'wellspringdew', count: 3, label: '3 Wellspring Dew' } },

    // --- the head, above the scour -------------------------------------------
    { kit: 'savepoint', at: [21.5, 5.5], id: 'ut-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The terminal feature: the thing the whole gallery has been pointing at,
    // which is not an outflow but an intake.
    { kit: 'well', at: [21.5, 3.5], id: 'ut-intake', radius: 1.1, interactRadius: 2.4,
      interact: { name: 'The Intake', text: [
        'The head of the gallery, and no spring in it. The water is going the other',
        'way: down a throat in the rock, steadily, with no sound at all.',
        'Fifty paces of scoured stone behind you, and this is what did it — not',
        'something pouring out, but something drinking.',
      ] } },
    { kit: 'signpost', at: [17.5, 3.5], id: 'ut-gauge',
      interact: { name: 'A Gauger\'s Rod', text: [
        'A graduated rod driven into the floor by the intake, ruled in inches.',
        'The water stands at two. Every mark above four has been scratched out',
        'and the words NOT SINCE written across them.',
      ] } },
    { kit: 'lamppost', at: [10.5, 3.5] },
    { kit: 'lamppost', at: [32.5, 3.5] },
    { kit: 'crate', at: [28.5, 5.5], rot: 1.1 },
    { kit: 'chest', at: [6.5, 5.5], id: 'ut-chest-6',
      contains: { kind: 'item', id: 'magpiechain', count: 1, label: 'a Magpie Chain' } },
    { kit: 'chest', at: [12.5, 5.5], id: 'ut-chest-7',
      contains: { kind: 'item', id: 'wellspringdew', count: 2, label: '2 Wellspring Dew' } },
    { kit: 'chest', at: [36.5, 3.5], id: 'ut-chest-8',
      contains: { kind: 'item', id: 'ironhail', count: 1, label: 'an Iron Hail' } },
  ],

  npcs: [],
};
