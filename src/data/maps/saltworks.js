/**
 * The Saltworks — a map where the walls are the road.
 *
 * Thirty-six evaporation pans in a six-by-six rank, and not one of them can be
 * crossed. Everything the player walks on is a bund: the two-pace earth wall
 * built to hold one pan apart from the next. The floor of this dungeon is its
 * masonry, and the rooms are the parts you can see and never enter — which is
 * the exact inverse of every other place in the world, and is legible from the
 * first step, because the whole grid is visible at once from the sea gate.
 *
 * What survives is what the works kept up. The head bund along the north, three
 * cross ranks, and the two long spines down either flank are sound; the ranks
 * between them have slumped, and where a bund went it took its crossings with
 * it, so a drowned rank leaves no stepping stones behind. That leaves a ladder:
 * two rails, three rungs, and a decision at every rail about which way to turn.
 * Every rung reaches both rails, so there is no wrong turn anywhere in the
 * works — only long ones, and the player can always see how long.
 *
 * Three pans were drawn down before the works were abandoned and are floored
 * hard. They are the only rooms the saltworks has, the only cul-de-sacs in it,
 * and each of the three is worth the walk out and back.
 *
 * Rows use the same run-length notation as the other dungeons; a miscounted row
 * in a bund is an invisible bridge across a pan, which would collapse the whole
 * idea into an open field.
 */

const W = 48;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[saltworks] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 48)),
  /*  1 */ row(R('#', 48)),
  // --- the head bund: the one rank the works never let go ------------------
  /*  2 */ row(R('#', 2), R('%', 44), R('#', 2)),
  /*  3 */ row(R('#', 2), R('%', 44), R('#', 2)),
  // the crystallising floor, drawn down: the far end of the works
  /*  4 */ row(R('#', 2), R('%', 2), R('=', 5), R('%', 2), R('~', 26), R('%', 2), R('~', 5), R('%', 2), R('#', 2)),
  /*  5 */ row(R('#', 2), R('%', 2), R('=', 5), R('%', 2), R('~', 26), R('%', 2), R('~', 5), R('%', 2), R('#', 2)),
  /*  6 */ row(R('#', 2), R('%', 2), R('=', 5), R('%', 2), R('~', 26), R('%', 2), R('~', 5), R('%', 2), R('#', 2)),
  /*  7 */ row(R('#', 2), R('%', 2), R('=', 5), R('%', 2), R('~', 26), R('%', 2), R('~', 5), R('%', 2), R('#', 2)),
  /*  8 */ row(R('#', 2), R('%', 2), R('=', 5), R('%', 2), R('~', 26), R('%', 2), R('~', 5), R('%', 2), R('#', 2)),
  // --- first rank -----------------------------------------------------------
  /*  9 */ row(R('#', 2), R('%', 44), R('#', 2)),
  /* 10 */ row(R('#', 2), R('%', 44), R('#', 2)),
  // the west sluice link, running down through a drowned crossing
  /* 11 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('~', 26), R('%', 2), R('#', 2)),
  /* 12 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('~', 26), R('%', 2), R('#', 2)),
  /* 13 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('~', 26), R('%', 2), R('#', 2)),
  /* 14 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('~', 26), R('%', 2), R('#', 2)),
  /* 15 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('~', 26), R('%', 2), R('#', 2)),
  // --- second rank: gone, and its crossings with it -------------------------
  /* 16 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('~', 26), R('%', 2), R('#', 2)),
  /* 17 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('~', 26), R('%', 2), R('#', 2)),
  /* 18 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('=', 5), R('~', 21), R('%', 2), R('#', 2)),
  /* 19 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('=', 5), R('~', 21), R('%', 2), R('#', 2)),
  /* 20 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('=', 5), R('~', 21), R('%', 2), R('#', 2)),
  /* 21 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('=', 5), R('~', 21), R('%', 2), R('#', 2)),
  /* 22 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 2), R('=', 5), R('~', 21), R('%', 2), R('#', 2)),
  // --- third rank -----------------------------------------------------------
  /* 23 */ row(R('#', 2), R('%', 44), R('#', 2)),
  /* 24 */ row(R('#', 2), R('%', 44), R('#', 2)),
  // the east sluice link
  /* 25 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 26 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 27 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 28 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 29 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  // --- fourth rank: gone ----------------------------------------------------
  /* 30 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 31 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 32 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 33 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 34 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 35 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  /* 36 */ row(R('#', 2), R('%', 2), R('~', 26), R('%', 2), R('~', 12), R('%', 2), R('#', 2)),
  // --- fifth rank -----------------------------------------------------------
  /* 37 */ row(R('#', 2), R('%', 44), R('#', 2)),
  /* 38 */ row(R('#', 2), R('%', 44), R('#', 2)),
  // the ferryman pan, drawn down, and the riser up from the gate
  /* 39 */ row(R('#', 2), R('%', 2), R('~', 19), R('%', 2), R('~', 14), R('=', 5), R('%', 2), R('#', 2)),
  /* 40 */ row(R('#', 2), R('%', 2), R('~', 19), R('%', 2), R('~', 14), R('=', 5), R('%', 2), R('#', 2)),
  /* 41 */ row(R('#', 2), R('%', 2), R('~', 19), R('%', 2), R('~', 14), R('=', 5), R('%', 2), R('#', 2)),
  /* 42 */ row(R('#', 2), R('%', 2), R('~', 19), R('%', 2), R('~', 14), R('=', 5), R('%', 2), R('#', 2)),
  /* 43 */ row(R('#', 2), R('%', 2), R('~', 19), R('%', 2), R('~', 14), R('=', 5), R('%', 2), R('#', 2)),
  // --- the sea bund: only the middle of it is still a road ------------------
  /* 44 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 16), R('~', 12), R('%', 2), R('#', 2)),
  /* 45 */ row(R('#', 2), R('%', 2), R('~', 12), R('%', 16), R('~', 12), R('%', 2), R('#', 2)),
  // --- the sea gate ---------------------------------------------------------
  /* 46 */ row(R('#', 23), R('%', 2), R('#', 23)),
  /* 47 */ row(R('#', 23), R('%', 2), R('#', 23)),
];

export const SALTWORKS = {
  id: 'saltworks',
  name: 'The Saltworks',
  subtitle: 'Six Ranks of Six',
  kind: 'dungeon',
  light: 'dusk',
  grade: 'dusk',
  fog: ['#5a4c52', 26, 120],
  tilt: 0.34,
  cameraDistance: 17,
  cameraPitch: 0.74,
  music: 'coast',
  base: 'sand',
  groundRamp: 'terrain',
  // Low, because the point of the saltworks is that you can see all thirty-six
  // pans at once. Anything taller than a bund would turn it into a maze.
  wallHeight: 5,
  wallMaterial: 'stone',
  // The sun is nearly down and the brine reflects none of it. The bund lamps
  // are what the ferrymen actually walked by.
  lampIntensity: 7,
  lampRange: 13,
  waterLevel: 0.06,
  water: { shallow: '#8a9a86', deep: '#2e3a3c', foam: '#e6e2d0', waveHeight: 0.02, waveScale: 0.55 },

  sky: {
    zenith: '#3a3450', horizon: '#d19a6a', ground: '#4a4038',
    sunColor: '#ffbe86', sunDir: [-0.42, 0.10, 0.52], cloud: 0.34,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [24, 45], face: 'north' },
    world: { at: [24, 45], face: 'north' },
  },

  exits: [
    { at: [23, 47], size: [2, 1], to: 'overworld', spawn: 'saltworks',
      prompt: 'Leave the works' },
  ],

  // Everything scripted here is examined rather than walked into: the works is
  // a grid of bunds a player crosses in every direction, and a tripwire laid on
  // one would fire on the way past to somewhere else.
  triggers: [],

  /**
   * The works is one region drawn twice — the shallow end and the deep — so it
   * names the salt country's two tables rather than keeping its own copy of
   * them. The ranks nearest the sea gate roll the pans; everything from the
   * third rank north rolls the weirs, which is the harder half of the same
   * band. The sea bund itself keeps the mixed table below, so the first two
   * minutes of the works are the works as a whole.
   */
  encounterZones: [
    { rect: [0, 0, 48, 23], table: 'saltmarch_weirs' },   // head bund to third rank
    { rect: [0, 23, 48, 21], table: 'saltmarch_pans' },   // third rank to fifth
  ],

  encounters: {
    rate: 26, terrain: 'sand', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['saltdrinker', 'saltdrinker'] },
      { weight: 24, enemies: ['weirmaw', 'brinehusk', 'brinehusk'] },
      { weight: 20, enemies: ['crustcrab', 'weirmaw'] },
      { weight: 18, enemies: ['tallykeeper', 'saltferryman'] },
      { weight: 12, enemies: ['sumpwidow'] },
    ],
  },

  props: [
    // --- the sea gate --------------------------------------------------------
    { kit: 'savepoint', at: [24, 45], id: 'sw-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [21.4, 45.4], id: 'sw-gatepost',
      interact: { name: 'Tally Post', text: [
        'A post with a slate wired to it, ruled into thirty-six squares.',
        'Every square but three carries the same word: HOLDING.',
        'The three that do not say DRAWN, and have been crossed through twice.',
      ] } },
    { kit: 'lamppost', at: [24, 38] },
    { kit: 'chest', at: [24, 41], id: 'sw-chest-1',
      contains: { kind: 'item', id: 'gravesalt', count: 4, label: '4 Grave Salts' } },

    // --- the ferryman pan, drawn down ---------------------------------------
    { kit: 'lamppost', at: [39.5, 39.5] },
    { kit: 'crate', at: [42.4, 42.4], rot: 0.4 },
    { kit: 'barrel', at: [42.6, 41.2] },
    { kit: 'chest', at: [41.5, 41.5], id: 'sw-chest-2',
      contains: { kind: 'item', id: 'saltleathers', count: 1, label: 'a set of Salt Leathers' } },

    // --- the fifth rank, and the two spines ---------------------------------
    { kit: 'lamppost', at: [3, 38] },
    { kit: 'lamppost', at: [45, 38] },
    { kit: 'rock', at: [10, 38.4], scale: 1.1, seed: 3 },
    { kit: 'chest', at: [31, 38], id: 'sw-chest-3',
      contains: { kind: 'item', id: 'saltchakram', count: 1, label: 'a Salt Chakram' } },
    { kit: 'savepoint', at: [3, 31], id: 'sw-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [45, 24] },

    // --- the middle pan, drawn down ------------------------------------------
    { kit: 'lamppost', at: [18.6, 22.4] },
    // The middle pan is the one that went dry in a night. The post beside the
    // sluice keeps the description of the sluice.
    { kit: 'well', at: [20.5, 20.5], id: 'sw-sluice', radius: 1.1, interactRadius: 2.4,
      interact: { prompt: 'The Middle Sluice', event: 'sump_that_drank' } },
    { kit: 'signpost', at: [21.5, 22.5], id: 'sw-sluice-post',
      interact: { name: 'The Middle Sluice', text: [
        'A brick shaft in the floor of a drawn pan, with a gate in the bottom of it.',
        'Turning the gate would flood this pan from the one beside it, and that one',
        'from the next, and so on to the sea. Nobody has turned it. Nobody will.',
      ] } },
    { kit: 'chest', at: [21.5, 18.6], id: 'sw-chest-4',
      contains: { kind: 'item', id: 'quicklimecharm', count: 1, label: 'a Quicklime Charm' } },

    // --- the third rank -------------------------------------------------------
    { kit: 'lamppost', at: [17, 24] },
    { kit: 'lamppost', at: [38, 24] },
    { kit: 'chest', at: [10, 24], id: 'sw-chest-5',
      contains: { kind: 'item', id: 'deepwellflask', count: 3, label: '3 Deepwell Flasks' } },
    { kit: 'signpost', at: [31.4, 23.6], id: 'sw-rankpost',
      interact: { name: 'Rank Marker', text: [
        'THIRD RANK. WORKING.',
        'Two ranks north and two ranks south the same posts stand in open water,',
        'still bolted upright, marking bunds that are not there any more.',
      ] } },
    // Where the crop was weighed off before it went to the parish, and what has
    // been doing the weighing since.
    { kit: 'signpost', at: [34, 24], id: 'sw-scales',
      interact: { prompt: 'The weighing scales', event: 'weighmaster' } },

    // --- the first rank and the head bund ------------------------------------
    { kit: 'savepoint', at: [10, 10], id: 'sw-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [24, 10] },
    { kit: 'lamppost', at: [38, 10] },
    { kit: 'rock', at: [31.4, 9.6], scale: 0.9, seed: 5 },
    { kit: 'chest', at: [45, 10], id: 'sw-chest-6',
      contains: { kind: 'item', id: 'sovereignpanacea', count: 2, label: '2 Sovereign Panaceas' } },
    { kit: 'lamppost', at: [3, 3] },
    { kit: 'lamppost', at: [45, 3] },
    { kit: 'crate', at: [17.4, 3.4], rot: 0.9 },

    // --- the crystallising floor: the far end of the works --------------------
    { kit: 'savepoint', at: [5, 7.6], id: 'sw-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    // The far end of the works, and the pan that has not filled since the works
    // closed — which is the address the Salt Mother's magicite is recorded at.
    // The post beside it keeps the description of the floor.
    { kit: 'well', at: [6.5, 6.5], id: 'sw-floor', radius: 1.1, interactRadius: 2.4,
      interact: { prompt: 'The Crystallising Floor', event: 'motherbrine' } },
    { kit: 'signpost', at: [7.5, 8.5], id: 'sw-floor-post',
      interact: { name: 'The Crystallising Floor', text: [
        'The first pan the works ever cut, and the last one they drew down.',
        'The floor of it is not salt. It is a single sheet of something clear and',
        'very cold, and the rake marks in it are on the underside.',
      ] } },
    { kit: 'chest', at: [8.4, 4.6], id: 'sw-chest-7',
      contains: { kind: 'item', id: 'crownofsalt', count: 1, label: 'the Crown of Salt' } },
    // Salt-iron, nine bands of it, cut on the floor that made the salt.
    { kit: 'chest', at: [4.5, 6.5], id: 'sw-chest-8',
      contains: { kind: 'item', id: 'ninthcrown', count: 1, label: 'the Ninth Crown' } },
    { kit: 'barrel', at: [4.5, 4.5] },
  ],

  npcs: [],
};
