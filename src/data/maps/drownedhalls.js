/**
 * The Drowned Halls — the same building drawn twice on one sheet.
 *
 * This is a surveyor's plan, not a plan of a place. The upper half of the map
 * is the storey that is under water and the lower half is the storey that is
 * not, printed one above the other the way a surveyor prints them, with the
 * four stairs drawn across the gutter between the plans. The two halves are the
 * identical building: four chambers north, four chambers south, one spine down
 * the middle, doorways in exactly the same places. Nothing about the shape of
 * the customs house has changed. Only what is passable has.
 *
 * Above, the spine is cut in two places by fallen vaulting. Below, the spine is
 * cut in one place by water too deep to wade. The cuts are not above one
 * another, and that single fact is the whole dungeon: to get past a fall you go
 * down and walk under it, and to get past the deep you come up and walk over
 * it, and you keep swapping storeys until the building runs out. The player is
 * never choosing a route. They are being handed from one floor to the other by
 * a building that is broken in two different ways.
 *
 * The far end is the drowned north-west chamber, which the deep water cuts off
 * from the rest of its own storey. There is exactly one stair down to it.
 *
 * Rows use the same run-length notation as the other dungeons; a miscounted row
 * here would put a hole through a floor slab, which is the one thing this map
 * cannot survive.
 */

const W = 48;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[drownedhalls] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  // ===== the drowned storey ================================================
  /*  0 */ row(R('#', 48)),
  /*  1 */ row(R('#', 48)),
  // the north range: four chambers, and the first of them has no floor left
  /*  2 */ row(R('#', 2), R(':', 9), R('#', 2), R(':', 10), R('#', 2), R(':', 10), R('#', 2), R(':', 9), R('#', 2)),
  /*  3 */ row(R('#', 2), R(':', 2), R('~', 5), R(':', 2), R('#', 2), R(':', 10), R('#', 2), R(':', 10), R('#', 2), R(':', 2), R('~', 5), R(':', 2), R('#', 2)),
  /*  4 */ row(R('#', 2), R(':', 2), R('~', 5), R(':', 2), R('#', 2), R(':', 10), R('#', 2), R(':', 10), R('#', 2), R(':', 2), R('~', 5), R(':', 2), R('#', 2)),
  /*  5 */ row(R('#', 2), R(':', 9), R('#', 2), R(':', 10), R('#', 2), R(':', 10), R('#', 2), R(':', 9), R('#', 2)),
  /*  6 */ row(R('#', 2), R(':', 9), R('#', 2), R(':', 10), R('#', 2), R(':', 10), R('#', 2), R(':', 9), R('#', 2)),
  // doorways onto the spine
  /*  7 */ row(R('#', 5), R(':', 2), R('#', 10), R(':', 2), R('#', 10), R(':', 2), R('#', 9), R(':', 2), R('#', 6)),
  /*  8 */ row(R('#', 5), R(':', 2), R('#', 10), R(':', 2), R('#', 10), R(':', 2), R('#', 9), R(':', 2), R('#', 6)),
  // --- the spine, cut once by deep water -----------------------------------
  /*  9 */ row(R('#', 2), R(':', 7), R('~', 6), R(':', 31), R('#', 2)),
  /* 10 */ row(R('#', 2), R(':', 7), R('~', 6), R(':', 31), R('#', 2)),
  /* 11 */ row(R('#', 2), R(':', 7), R('~', 6), R(':', 31), R('#', 2)),
  /* 12 */ row(R('#', 2), R(':', 7), R('~', 6), R(':', 31), R('#', 2)),
  /* 13 */ row(R('#', 2), R(':', 7), R('~', 6), R(':', 31), R('#', 2)),
  // doorways onto the spine
  /* 14 */ row(R('#', 5), R(':', 2), R('#', 10), R(':', 2), R('#', 10), R(':', 2), R('#', 9), R(':', 2), R('#', 6)),
  /* 15 */ row(R('#', 5), R(':', 2), R('#', 10), R(':', 2), R('#', 10), R(':', 2), R('#', 9), R(':', 2), R('#', 6)),
  // the south range: the three chambers the stairs come down into
  /* 16 */ row(R('#', 2), R(':', 9), R('#', 2), R(':', 10), R('#', 2), R(':', 10), R('#', 2), R(':', 9), R('#', 2)),
  /* 17 */ row(R('#', 2), R(':', 9), R('#', 2), R(':', 2), R('~', 6), R(':', 2), R('#', 2), R(':', 10), R('#', 2), R(':', 9), R('#', 2)),
  /* 18 */ row(R('#', 2), R(':', 9), R('#', 2), R(':', 2), R('~', 6), R(':', 2), R('#', 2), R(':', 10), R('#', 2), R(':', 9), R('#', 2)),
  /* 19 */ row(R('#', 2), R(':', 9), R('#', 2), R(':', 10), R('#', 2), R(':', 10), R('#', 2), R(':', 9), R('#', 2)),
  /* 20 */ row(R('#', 2), R(':', 9), R('#', 2), R(':', 10), R('#', 2), R(':', 10), R('#', 2), R(':', 9), R('#', 2)),
  // --- the stairs, drawn across the gutter between the two plans -----------
  /* 21 */ row(R('#', 8), R('R', 2), R('#', 10), R('R', 2), R('#', 10), R('R', 2), R('#', 9), R('R', 2), R('#', 3)),
  /* 22 */ row(R('#', 8), R('R', 2), R('#', 10), R('R', 2), R('#', 10), R('R', 2), R('#', 9), R('R', 2), R('#', 3)),
  /* 23 */ row(R('#', 8), R('R', 2), R('#', 10), R('R', 2), R('#', 10), R('R', 2), R('#', 9), R('R', 2), R('#', 3)),
  /* 24 */ row(R('#', 8), R('R', 2), R('#', 10), R('R', 2), R('#', 10), R('R', 2), R('#', 9), R('R', 2), R('#', 3)),
  /* 25 */ row(R('#', 8), R('R', 2), R('#', 10), R('R', 2), R('#', 10), R('R', 2), R('#', 9), R('R', 2), R('#', 3)),
  // ===== the storey above ==================================================
  /* 26 */ row(R('#', 8), R('R', 2), R('#', 10), R('R', 2), R('#', 10), R('R', 2), R('#', 9), R('R', 2), R('#', 3)),
  /* 27 */ row(R('#', 8), R('R', 2), R('#', 10), R('R', 2), R('#', 10), R('R', 2), R('#', 9), R('R', 2), R('#', 3)),
  // the north range: the three chambers the stairs come up into
  /* 28 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  /* 29 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  /* 30 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  /* 31 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  /* 32 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  // doorways onto the spine
  /* 33 */ row(R('#', 5), R('M', 2), R('#', 10), R('M', 2), R('#', 10), R('M', 2), R('#', 9), R('M', 2), R('#', 6)),
  /* 34 */ row(R('#', 5), R('M', 2), R('#', 10), R('M', 2), R('#', 10), R('M', 2), R('#', 9), R('M', 2), R('#', 6)),
  // --- the spine, cut twice by fallen vaulting, and neither cut is above ---
  /* 35 */ row(R('#', 2), R('M', 16), R(':', 2), R('#', 5), R(':', 2), R('M', 6), R(':', 2), R('#', 4), R(':', 2), R('M', 5), R('#', 2)),
  /* 36 */ row(R('#', 2), R('M', 16), R(':', 2), R('#', 5), R(':', 2), R('M', 6), R(':', 2), R('#', 4), R(':', 2), R('M', 5), R('#', 2)),
  /* 37 */ row(R('#', 2), R('M', 16), R(':', 2), R('#', 5), R(':', 2), R('M', 6), R(':', 2), R('#', 4), R(':', 2), R('M', 5), R('#', 2)),
  /* 38 */ row(R('#', 2), R('M', 16), R(':', 2), R('#', 5), R(':', 2), R('M', 6), R(':', 2), R('#', 4), R(':', 2), R('M', 5), R('#', 2)),
  /* 39 */ row(R('#', 2), R('M', 16), R(':', 2), R('#', 5), R(':', 2), R('M', 6), R(':', 2), R('#', 4), R(':', 2), R('M', 5), R('#', 2)),
  // doorways onto the spine
  /* 40 */ row(R('#', 5), R('M', 2), R('#', 10), R('M', 2), R('#', 10), R('M', 2), R('#', 9), R('M', 2), R('#', 6)),
  /* 41 */ row(R('#', 5), R('M', 2), R('#', 10), R('M', 2), R('#', 10), R('M', 2), R('#', 9), R('M', 2), R('#', 6)),
  // the south range
  /* 42 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  /* 43 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  /* 44 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  /* 45 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  /* 46 */ row(R('#', 2), R('M', 9), R('#', 2), R('M', 10), R('#', 2), R('M', 10), R('#', 2), R('M', 9), R('#', 2)),
  // --- the water gate -------------------------------------------------------
  /* 47 */ row(R('#', 29), R('M', 4), R('#', 15)),
  /* 48 */ row(R('#', 29), R('M', 4), R('#', 15)),
  /* 49 */ row(R('#', 29), R('M', 4), R('#', 15)),
  /* 50 */ row(R('#', 29), R('M', 4), R('#', 15)),
];

export const DROWNED_HALLS = {
  id: 'drownedhalls',
  name: 'The Drowned Halls',
  subtitle: 'One Building, Two Plans',
  kind: 'dungeon',
  light: 'cave',
  grade: 'cave',
  fog: ['#132630', 22, 92],
  tilt: 0.36,
  cameraDistance: 16,
  cameraPitch: 0.68,
  music: 'cave',
  base: 'marble',
  groundRamp: 'cave',
  wallHeight: 11,
  wallMaterial: 'stoneFine',
  lampIntensity: 9,
  lampRange: 14,
  // Positive, so the flood sits over the floor rather than under it. The lower
  // plan is unreadable if the water cannot be seen standing in it.
  waterLevel: 0.10,
  water: { shallow: '#2f6274', deep: '#0b1820', foam: '#82c0ca', waveHeight: 0.04, waveScale: 0.28 },
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [31, 49], face: 'north' },
    world: { at: [31, 49], face: 'north' },
  },

  exits: [
    { at: [29, 50], size: [4, 1], to: 'overworld', spawn: 'drownedhalls',
      prompt: 'Leave the halls' },
  ],

  // The building hands the party from one storey to the other over and over,
  // so every part of it is crossed more than once and a tripwire would fire on
  // a crossing rather than at an arrival. Both scripted things are examined.
  triggers: [],

  /**
   * The customs house sits on the line between the Verge and the Kindly Ground
   * and the two plans divide along it: what is still dry belongs to the Verge,
   * and what is under water belongs to the ground that buries things. Each
   * storey climbs half a band as it goes, so swapping floors is also how the
   * difficulty is paced.
   *
   * The cut-off north-west chamber — the far end, and the only room in the
   * building with one way in — is deliberately left to the map's own table
   * below, because that is where the two Kindly Ground hunts are.
   */
  encounterZones: [
    { rect: [0, 42, 48, 9], table: 'kindly_ground' },           // above, the south range
    { rect: [0, 21, 48, 21], table: 'sunken_verge' },           // above, the stairs and north
    { rect: [0, 9, 48, 12], table: 'kindly_ground_barrows' },   // below, the drowned spine
    { rect: [11, 2, 37, 7], table: 'sunken_verge_rim' },        // below, the north range
  ],

  // The last two groups are the hunts, at a weight that keeps them rare: two
  // things off the Kindly Ground that never left the strongroom end.
  encounters: {
    rate: 24, terrain: 'marble', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['bulwarkshell', 'vergestandard'] },
      { weight: 24, enemies: ['vergepike', 'vergepike', 'chorister'] },
      { weight: 20, enemies: ['stonelayer', 'deepcantor'] },
      { weight: 18, enemies: ['vergeknight', 'hollowherald'] },
      { weight: 12, enemies: ['keelworm', 'rimhound'] },
      { weight: 3, enemies: ['thekindlyone'] },
      { weight: 2, enemies: ['thelongbarrow'] },
    ],
  },

  props: [
    // --- above: the water gate and the south range ---------------------------
    { kit: 'savepoint', at: [30.5, 45.5], id: 'dh-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [27.4, 45.4], id: 'dh-plan',
      interact: { name: 'Surveyor Plan', text: [
        'A plan pinned to the wall in oiled cloth, drawn as two storeys, one over',
        'the other, with the stairs ruled across the gap between them.',
        'Someone has inked over the lower plan in blue, and written: STILL THERE.',
      ] } },
    { kit: 'lamppost', at: [26.5, 43.5] },
    { kit: 'lamppost', at: [33.5, 43.5] },
    { kit: 'chest', at: [42.5, 44.5], id: 'dh-chest-1',
      contains: { kind: 'item', id: 'deepwellflask', count: 3, label: '3 Deepwell Flasks' } },

    // --- above: the middle length of the spine, between the two falls --------
    { kit: 'lamppost', at: [28.5, 37.5] },
    { kit: 'crate', at: [31.6, 36.4], rot: 0.7 },
    { kit: 'chest', at: [26.5, 30.5], id: 'dh-chest-2',
      contains: { kind: 'item', id: 'clearwatercharm', count: 1, label: 'a Clearwater Charm' } },
    { kit: 'lamppost', at: [32.5, 29.5] },

    // --- the middle stair, down into the drowned storey ----------------------
    { kit: 'lamppost', at: [32.5, 29.5] },
    { kit: 'savepoint', at: [31.5, 19.5], id: 'dh-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },

    // --- below: the long reach of the drowned spine --------------------------
    { kit: 'lamppost', at: [24.5, 11.5] },
    { kit: 'lamppost', at: [38.5, 11.5] },
    { kit: 'rock', at: [30.0, 12.4], scale: 1.2, seed: 3, material: 'cave' },
    { kit: 'chest', at: [43.5, 11.5], id: 'dh-chest-3',
      contains: { kind: 'item', id: 'tidewardshield', count: 1, label: 'a Tideward Shield' } },
    { kit: 'well', at: [17.5, 11.5], id: 'dh-gauge', radius: 1.1, interactRadius: 2.4,
      interact: { name: 'The Tide Gauge', text: [
        'A brass column in the middle of the drowned spine, ruled in feet.',
        'The water stands at eleven. The highest mark cut into the brass is four,',
        'and it has been cut over three times, each time higher than the last.',
      ] } },
    // The guard was posted on the spine and has not been taken off it.
    // The lower plan, inked over in blue and written across, and the drum with
    // the line on it that settles nothing.
    { kit: 'signpost', at: [19.4, 11.4], id: 'dh-lowerplan',
      interact: { prompt: 'The lower plan', event: 'drownedhalls_blue' } },
    { kit: 'signpost', at: [21.5, 12.5], id: 'dh-rank',
      interact: { prompt: 'The rank on the spine', event: 'thefirstrank' } },

    // --- below: the east wing ------------------------------------------------
    { kit: 'lamppost', at: [44.5, 18.5] },
    { kit: 'chest', at: [38.5, 19.5], id: 'dh-chest-4',
      contains: { kind: 'item', id: 'wellspringlance', count: 1, label: 'a Wellspring Lance' } },
    // A gate that was held, and then cut up by whoever held it.
    { kit: 'chest', at: [41.5, 19.5], id: 'dh-chest-9',
      contains: { kind: 'item', id: 'theninthgate', count: 1, label: 'the Ninth Gate' } },

    // --- above: the west wing, reached by the second stair -------------------
    { kit: 'savepoint', at: [8.5, 37.5], id: 'dh-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [14.5, 37.5] },
    { kit: 'lamppost', at: [4.5, 30.5] },
    { kit: 'chest', at: [15.5, 44.5], id: 'dh-chest-5',
      contains: { kind: 'item', id: 'deepwardplate', count: 1, label: 'a suit of Deepward Plate' } },
    { kit: 'chest', at: [19.5, 30.5], id: 'dh-chest-6',
      contains: { kind: 'item', id: 'stillwaterwraps', count: 1, label: 'a pair of Still Water Wraps' } },
    { kit: 'crate', at: [6.4, 44.4], rot: 1.1 },
    // Two things the Kindly Ground sent up the river and the customs house
    // impounded, both still in the north range where they were logged.
    { kit: 'chest', at: [7.5, 30.5], id: 'dh-chest-10',
      contains: { kind: 'item', id: 'witheringclaws', count: 1, label: 'a set of Withering Claws' } },
    { kit: 'chest', at: [42.5, 30.5], id: 'dh-chest-11',
      contains: { kind: 'item', id: 'kindlyvestment', count: 1, label: 'a Kindly Vestment' } },

    // --- below: the cut-off north-west chamber, the far end ------------------
    { kit: 'savepoint', at: [4.5, 19.5], id: 'dh-save-4', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [4.5, 11.5] },
    { kit: 'lamppost', at: [4.5, 5.5] },
    { kit: 'chest', at: [3.0, 5.5], id: 'dh-chest-7',
      contains: { kind: 'item', id: 'deepwellpendant', count: 1, label: 'a Deepwell Pendant' } },
    { kit: 'chest', at: [9.5, 2.6], id: 'dh-chest-8',
      contains: { kind: 'item', id: 'deepwellrobe', count: 1, label: 'a Deepwell Robe' } },
    // The far end of the building, and what is still standing in the doorway of
    // it holding a commission from an office that stopped existing. The plan
    // pinned beside the door keeps the description.
    { kit: 'signpost', at: [2.8, 2.5], id: 'dh-strongroom',
      interact: { prompt: 'Strongroom Door', event: 'vergemarshal' } },
    { kit: 'signpost', at: [6.5, 2.5], id: 'dh-strongroom-plan',
      interact: { name: 'Strongroom Door', text: [
        'The door of the strongroom, standing open, with the water above its lintel.',
        'The floor inside is simply gone. What is under it is not the storey below,',
        'because the storey below is where you have just come from.',
      ] } },
    // The lower floor at low water, which is where the Undercroft is recorded.
    { kit: 'chest', at: [6.5, 5.5], id: 'dh-chest-12',
      contains: { kind: 'esper', id: 'theundercroft', count: 1, label: 'a shard of magicite' } },
  ],

  npcs: [],
};
