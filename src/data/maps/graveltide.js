/**
 * Graveltide — one shore, drawn twice, in each of the two states it has.
 *
 * The gravel skeleton of this beach — eleven bars and the eleven two-pace necks
 * that join them — is authored once and laid into the map twice, mirrored about
 * the shingle bank across the middle. South of the bank the tide is out: the
 * bars stand proud, the channels between them are ankle-deep, and you can walk
 * anywhere at all. North of the bank the tide is in: the same bars, in the same
 * places, at the same spacing, with the sea over everything else.
 *
 * That is the whole dungeon. The ebb half is not an easier version of the flood
 * half — it is a *drawing* of it. Everything you can see under your boots in the
 * south is the map of the north, and the player who walks the ebb shore paying
 * attention arrives at the bank already knowing where the necks are, because
 * they have been standing on all eleven of them.
 *
 * The bank is where the two states meet, and it is deliberately the one place
 * you can see both from. Its southern side is open along its entire length. Its
 * northern side has exactly two ways off it, F1 at the seventh column and F2 at
 * the thirty-third, and from up on the shingle both are visible as a thread of
 * grey in a lot of water. Choosing between them is choosing which side of the
 * shore to cross, and they do not meet again until the Point.
 *
 * Nothing is stranded. Every bar in the flood half is on the neck-chain
 * somewhere, which is a promise the shore makes and the ebb half proves.
 *
 * Rows use the same run-length notation as the other dungeons; one miscounted
 * row here would put a neck where the sea is.
 */

const W = 46;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[graveltide] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

// Glyphs, and what they are:
//   %  gravel — a bar, or a neck between two bars. Dry in both states.
//   :  the channels at low water — shin-deep, and walkable
//   ~  the same channels at high water
//   R  the reef of the Point
//   #  the cliff at the landward end

const TERRAIN = [
  // The Point. Three hundred paces of hard reef, and the far end of the shore.
  /*  0 */ row(R('R', 46)),
  /*  1 */ row(R('R', 46)),
  /*  2 */ row(R('R', 46)),
  /*  3 */ row(R('R', 46)),
  // THE FLOOD SHORE. From here to the bank the tide is in, and the only ground
  /*  4 */ row(R('~', 4), R('%', 15), R('~', 5), R('%', 19), R('~', 3)),
  // above it is the gravel. Everything drawn in water below was walked on
  /*  5 */ row(R('~', 4), R('%', 15), R('~', 5), R('%', 19), R('~', 3)),
  // thirty rows further south.
  /*  6 */ row(R('~', 4), R('%', 15), R('~', 5), R('%', 19), R('~', 3)),
  // F10 and F11 — the last two necks, onto the outer bar.
  /*  7 */ row(R('~', 8), R('%', 2), R('~', 26), R('%', 2), R('~', 8)),
  /*  8 */ row(R('~', 8), R('%', 2), R('~', 7), R('%', 11), R('~', 8), R('%', 2), R('~', 8)),
  /*  9 */ row(R('~', 2), R('%', 12), R('~', 3), R('%', 11), R('~', 4), R('%', 12), R('~', 2)),
  /* 10 */ row(R('~', 2), R('%', 12), R('~', 3), R('%', 11), R('~', 4), R('%', 12), R('~', 2)),
  /* 11 */ row(R('~', 2), R('%', 12), R('~', 3), R('%', 11), R('~', 4), R('%', 12), R('~', 2)),
  // F7, F8 and F9.
  /* 12 */ row(R('~', 11), R('%', 2), R('~', 9), R('%', 2), R('~', 14), R('%', 2), R('~', 6)),
  /* 13 */ row(R('~', 11), R('%', 2), R('~', 9), R('%', 2), R('~', 14), R('%', 2), R('~', 6)),
  /* 14 */ row(R('~', 5), R('%', 12), R('~', 3), R('%', 12), R('~', 3), R('%', 10), '~'),
  /* 15 */ row(R('~', 5), R('%', 12), R('~', 3), R('%', 12), R('~', 3), R('%', 10), '~'),
  /* 16 */ row(R('~', 5), R('%', 12), R('~', 3), R('%', 12), R('~', 3), R('%', 10), '~'),
  // F3, F4, F5 and F6 — four necks across the middle, and no others.
  /* 17 */ row(R('~', 9), R('%', 2), R('~', 3), R('%', 2), R('~', 8), R('%', 2), R('~', 12), R('%', 2), R('~', 6)),
  /* 18 */ row(R('~', 9), R('%', 2), R('~', 3), R('%', 2), R('~', 8), R('%', 2), R('~', 12), R('%', 2), R('~', 6)),
  /* 19 */ row(R('~', 3), R('%', 10), '~', R('%', 13), R('~', 3), R('%', 12), R('~', 4)),
  /* 20 */ row(R('~', 3), R('%', 10), '~', R('%', 13), R('~', 3), R('%', 12), R('~', 4)),
  /* 21 */ row(R('~', 3), R('%', 10), '~', R('%', 13), R('~', 3), R('%', 12), R('~', 4)),
  /* 22 */ row(R('~', 3), R('%', 10), R('~', 17), R('%', 12), R('~', 4)),
  // F1 and F2. Two ways off the bank and no third.
  /* 23 */ row(R('~', 7), R('%', 2), R('~', 24), R('%', 2), R('~', 11)),
  /* 24 */ row(R('~', 7), R('%', 2), R('~', 24), R('%', 2), R('~', 11)),
  /* 25 */ row(R('~', 7), R('%', 2), R('~', 24), R('%', 2), R('~', 11)),
  // THE SHINGLE BANK. The hinge of the shore: open to the ebb along its whole
  /* 26 */ row(R('%', 46)),
  // south side, and open to the flood at exactly two places.
  /* 27 */ row(R('%', 46)),
  /* 28 */ row(R('%', 46)),
  /* 29 */ row(R('%', 46)),
  // THE EBB SHORE. The same gravel, the same necks, the same everything —
  /* 30 */ row(R(':', 7), R('%', 2), R(':', 24), R('%', 2), R(':', 11)),
  // and the channels between them are ankle-deep and walkable.
  /* 31 */ row(R(':', 7), R('%', 2), R(':', 24), R('%', 2), R(':', 11)),
  /* 32 */ row(R(':', 7), R('%', 2), R(':', 24), R('%', 2), R(':', 11)),
  /* 33 */ row(R(':', 3), R('%', 10), R(':', 17), R('%', 12), R(':', 4)),
  /* 34 */ row(R(':', 3), R('%', 10), ':', R('%', 13), R(':', 3), R('%', 12), R(':', 4)),
  /* 35 */ row(R(':', 3), R('%', 10), ':', R('%', 13), R(':', 3), R('%', 12), R(':', 4)),
  /* 36 */ row(R(':', 3), R('%', 10), ':', R('%', 13), R(':', 3), R('%', 12), R(':', 4)),
  /* 37 */ row(R(':', 9), R('%', 2), R(':', 3), R('%', 2), R(':', 8), R('%', 2), R(':', 12), R('%', 2), R(':', 6)),
  /* 38 */ row(R(':', 9), R('%', 2), R(':', 3), R('%', 2), R(':', 8), R('%', 2), R(':', 12), R('%', 2), R(':', 6)),
  /* 39 */ row(R(':', 5), R('%', 12), R(':', 3), R('%', 12), R(':', 3), R('%', 10), ':'),
  /* 40 */ row(R(':', 5), R('%', 12), R(':', 3), R('%', 12), R(':', 3), R('%', 10), ':'),
  /* 41 */ row(R(':', 5), R('%', 12), R(':', 3), R('%', 12), R(':', 3), R('%', 10), ':'),
  /* 42 */ row(R(':', 11), R('%', 2), R(':', 9), R('%', 2), R(':', 14), R('%', 2), R(':', 6)),
  /* 43 */ row(R(':', 11), R('%', 2), R(':', 9), R('%', 2), R(':', 14), R('%', 2), R(':', 6)),
  /* 44 */ row(R(':', 2), R('%', 12), R(':', 3), R('%', 11), R(':', 4), R('%', 12), R(':', 2)),
  /* 45 */ row(R(':', 2), R('%', 12), R(':', 3), R('%', 11), R(':', 4), R('%', 12), R(':', 2)),
  /* 46 */ row(R(':', 2), R('%', 12), R(':', 3), R('%', 11), R(':', 4), R('%', 12), R(':', 2)),
  /* 47 */ row(R(':', 8), R('%', 2), R(':', 7), R('%', 11), R(':', 8), R('%', 2), R(':', 8)),
  /* 48 */ row(R(':', 8), R('%', 2), R(':', 26), R('%', 2), R(':', 8)),
  /* 49 */ row(R(':', 4), R('%', 15), R(':', 5), R('%', 19), R(':', 3)),
  /* 50 */ row(R(':', 4), R('%', 15), R(':', 5), R('%', 19), R(':', 3)),
  /* 51 */ row(R(':', 4), R('%', 15), R(':', 5), R('%', 19), R(':', 3)),
  // The strand, and the cut in the cliff where the road comes down.
  /* 52 */ row(R('%', 46)),
  /* 53 */ row(R('%', 46)),
  /* 54 */ row(R('%', 46)),
  /* 55 */ row(R('#', 18), R('%', 6), R('#', 22)),
];

export const GRAVELTIDE = {
  id: 'graveltide',
  name: 'Graveltide',
  subtitle: 'The Same Shore, Both Ways',
  kind: 'dungeon',
  light: 'dusk',
  grade: 'dusk',
  fog: ['#5d6a6e', 24, 108],
  tilt: 0.32,
  cameraDistance: 18,
  cameraPitch: 0.66,
  music: 'coast',
  base: 'sand',
  groundRamp: 'terrain',
  wallHeight: 11,
  wallMaterial: 'rock',
  // The beacons on the bars are the only lights on this shore, and at dusk with
  // the sea in they are how the necks are found at all.
  lampIntensity: 8,
  lampRange: 15,
  waterLevel: -0.06,
  water: { shallow: '#4a6f74', deep: '#0e1c26', foam: '#c2d4cc', waveHeight: 0.05, waveScale: 0.7 },

  sky: {
    zenith: '#2c3a54', horizon: '#d08c72', ground: '#4a5250',
    sunColor: '#ffb888', sunDir: [-0.55, 0.10, 0.28], cloud: 0.62,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [21, 53], face: 'north' },
    world: { at: [21, 53], face: 'north' },
  },

  exits: [
    { at: [18, 55], size: [6, 1], to: 'overworld', spawn: 'graveltide_strand',
      prompt: 'Go up the cut' },
  ],

  triggers: [],

  /**
   * The shore lies across the seam between two regions, and the bank is the
   * seam. South of it is Verge water and it behaves like Verge water. North of
   * it is not, and the difference in what meets you there is the second thing
   * the bank tells you, after the necks.
   *
   * The Point is left to the map's own table below: it is the far end, it is
   * the only ground on this coast that has never been under, and it is where
   * the hunts stand.
   */
  encounterZones: [
    { rect: [0, 52, 46, 4], table: 'sunken_verge' },        // the strand
    { rect: [0, 30, 46, 22], table: 'sunken_verge' },       // the ebb shore
    { rect: [0, 26, 46, 4], table: 'sunken_verge_rim' },    // the shingle bank
    { rect: [0, 4, 46, 22], table: 'gainsay_downs' },       // the flood shore
  ],

  // The last four groups are hunts rather than shore life, and they are only
  // ever rolled on the Point.
  encounters: {
    rate: 28, terrain: 'sand', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['keelworm', 'spallmoth', 'spallmoth'] },
      { weight: 24, enemies: ['charnelhound', 'crossgrainhound'] },
      { weight: 20, enemies: ['chalkwight', 'slipknave'] },
      { weight: 16, enemies: ['deadweight', 'rimhound'] },
      { weight: 10, enemies: ['dampener', 'theillwisher'] },
      { weight: 3, enemies: ['thekindlyone'] },
      { weight: 3, enemies: ['vergemarshal'] },
      { weight: 2, enemies: ['thelongbarrow'] },
      { weight: 2, enemies: ['thelongdrift'] },
    ],
  },

  props: [
    // --- the strand, and the way home ----------------------------------------
    { kit: 'savepoint', at: [24, 53], id: 'gt-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [18.5, 52.5], id: 'gt-strandpost',
      interact: { name: 'The Strand Notice', text: [
        'TIDE TABLE FOR GRAVELTIDE. The board under it has been scrubbed blank.',
        'Scratched into the frame where the board should be, by a different hand:',
        'THERE IS NO TABLE. IT IS OUT ON ONE SIDE AND IN ON THE OTHER. ALWAYS.',
      ] } },
    { kit: 'lamppost', at: [28.5, 52.5] },
    { kit: 'chest', at: [14.5, 53.5], id: 'gt-chest-1',
      contains: { kind: 'item', id: 'deepwellflask', count: 4, label: '4 Deepwell Flasks' } },

    // --- the ebb shore: the drawing ------------------------------------------
    { kit: 'chest', at: [8.5, 50.5], id: 'gt-chest-2',
      contains: { kind: 'item', id: 'stillwaterdram', count: 5, label: '5 Still Water Drams' } },
    { kit: 'lamppost', at: [33.5, 50.5] },
    { kit: 'rock', at: [5.0, 45.5], scale: 1.4, seed: 3 },
    { kit: 'chest', at: [22.5, 45.5], id: 'gt-chest-3',
      contains: { kind: 'item', id: 'tideheart', count: 1, label: 'a Tide Heart' } },
    { kit: 'lamppost', at: [19.5, 46.5] },
    { kit: 'rock', at: [38.0, 45.5], scale: 1.3, seed: 5 },
    { kit: 'lamppost', at: [10.5, 40.5] },
    { kit: 'signpost', at: [22.5, 40.5], id: 'gt-ebbpost',
      interact: { name: 'A Beacon Post', text: [
        'A tarred post with a lamp bracket, standing on dry gravel in a shore you',
        'could cross blindfold. Whoever set it here did not set it for this half.',
        'Look north and count the posts. They are in the water.',
      ] } },
    { kit: 'chest', at: [25.5, 40.5], id: 'gt-chest-4',
      contains: { kind: 'item', id: 'saltleathers', count: 1, label: 'a set of Salt Leathers' } },
    { kit: 'lamppost', at: [39.5, 40.5] },
    { kit: 'chest', at: [6.5, 34.5], id: 'gt-chest-5',
      contains: { kind: 'item', id: 'saltchakram', count: 1, label: 'a Salt Chakram' } },
    { kit: 'lamppost', at: [9.5, 35.5] },
    { kit: 'signpost', at: [19.5, 35.5], id: 'gt-necks',
      interact: { name: 'The Necks', text: [
        'Two paces of gravel joining this bar to the next, with a channel either',
        'side of it you could paddle in. Nothing about it matters here.',
        'There is one of these at the same place on the other side of the bank.',
      ] } },
    { kit: 'chest', at: [36.5, 34.5], id: 'gt-chest-6',
      contains: { kind: 'item', id: 'tidewardshield', count: 1, label: 'a Tideward Shield' } },
    { kit: 'lamppost', at: [33.5, 35.5] },

    // --- the shingle bank: the hinge -----------------------------------------
    { kit: 'savepoint', at: [23, 28], id: 'gt-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [20.5, 27.5], id: 'gt-bankpost',
      interact: { name: 'The Bank', text: [
        'From up here the shore behind you and the shore in front of you are the',
        'same shore. You can see it. The bars are in the same places, the necks',
        'are at the same spacings, and one of the two has the sea over it.',
        'Two threads of grey leave this bank going north. There is no third.',
      ] } },
    { kit: 'lamppost', at: [7.5, 27.5] },
    { kit: 'lamppost', at: [33.5, 27.5] },
    { kit: 'chest', at: [12.5, 28.5], id: 'gt-chest-7',
      contains: { kind: 'item', id: 'stoneheart', count: 1, label: 'a Stone Heart' } },
    { kit: 'rock', at: [40.0, 27.5], scale: 1.3, seed: 7 },

    // --- the flood shore, western chain --------------------------------------
    { kit: 'savepoint', at: [7, 21], id: 'gt-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [5.5, 20.5], id: 'gt-chest-8',
      contains: { kind: 'item', id: 'saltbitten', count: 1, label: 'a Saltbitten Blade' } },
    { kit: 'lamppost', at: [10.5, 20.5] },
    { kit: 'chest', at: [12.5, 15.5], id: 'gt-chest-9',
      contains: { kind: 'item', id: 'gravebindings', count: 1, label: 'a set of Grave Bindings' } },
    { kit: 'lamppost', at: [7.5, 15.5] },
    { kit: 'chest', at: [5.5, 10.5], id: 'gt-chest-10',
      contains: { kind: 'item', id: 'stormward', count: 1, label: 'a Storm Ward' } },
    { kit: 'chest', at: [21.5, 20.5], id: 'gt-chest-11',
      contains: { kind: 'item', id: 'wellspringlance', count: 1, label: 'a Wellspring Lance' } },
    { kit: 'signpost', at: [25.5, 15.5], id: 'gt-floodpost',
      interact: { name: 'A Beacon Post, Lit', text: [
        'The same post as the one on the dry bar, in the same place on the bar,',
        'and this one is burning. Somebody keeps the northern half lit and lets',
        'the southern half go dark, because the southern half does not need it.',
      ] } },

    // --- the flood shore, eastern chain --------------------------------------
    { kit: 'savepoint', at: [36, 21], id: 'gt-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [38.5, 20.5], id: 'gt-chest-12',
      contains: { kind: 'item', id: 'deepwardplate', count: 1, label: 'a suit of Deepward Plate' } },
    { kit: 'lamppost', at: [33.5, 20.5] },
    { kit: 'chest', at: [41.5, 15.5], id: 'gt-chest-13',
      contains: { kind: 'item', id: 'clearwatercharm', count: 1, label: 'a Clearwater Charm' } },
    { kit: 'lamppost', at: [37.5, 15.5] },
    { kit: 'chest', at: [35.5, 10.5], id: 'gt-chest-14',
      contains: { kind: 'item', id: 'crownofsalt', count: 1, label: 'the Crown of Salt' } },
    { kit: 'lamppost', at: [40.5, 10.5] },
    { kit: 'chest', at: [22.5, 9.5], id: 'gt-chest-15',
      contains: { kind: 'item', id: 'sandglass', count: 1, label: 'a Sand Glass' } },

    // --- the outer bar, and the Point ----------------------------------------
    { kit: 'chest', at: [14.5, 5.5], id: 'gt-chest-16',
      contains: { kind: 'item', id: 'tidecleaver', count: 1, label: 'a Tidecleaver' } },
    { kit: 'lamppost', at: [8.5, 5.5] },
    { kit: 'chest', at: [30.5, 5.5], id: 'gt-chest-17',
      contains: { kind: 'item', id: 'wardingcord', count: 2, label: '2 Warding Cords' } },
    { kit: 'savepoint', at: [23, 2], id: 'gt-save-5', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [20.5, 1.5], id: 'gt-point',
      interact: { name: 'The Point', text: [
        'Hard reef, and the only ground on this coast that has never once been',
        'under. Behind you the shore lies out in both its states at the same time,',
        'and from up here you cannot tell which of the two you crossed.',
      ] } },
    { kit: 'chest', at: [26.5, 1.5], id: 'gt-chest-18',
      contains: { kind: 'item', id: 'thelastportrait', count: 1, label: 'The Last Portrait' } },
    { kit: 'chest', at: [8.5, 2.5], id: 'gt-chest-19',
      contains: { kind: 'item', id: 'deepwellpendant', count: 1, label: 'a Deepwell Pendant' } },
    { kit: 'lamppost', at: [14.5, 1.5] },
    { kit: 'lamppost', at: [32.5, 1.5] },
    { kit: 'rock', at: [38.0, 2.0], scale: 1.4, seed: 9 },
  ],

  npcs: [],
};
