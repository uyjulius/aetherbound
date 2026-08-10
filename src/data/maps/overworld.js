/**
 * Caelum Vast — the western continent.
 *
 * Hand-drawn, row by row. Rows are written in run-length notation (`R(char,
 * count)`) rather than as raw strings: a 64-column map typed by hand goes
 * ragged almost immediately, and a single miscounted row silently becomes a
 * wall of void tiles. `row()` asserts the width, so a mistake fails at import
 * instead of turning up as an invisible hole in the world.
 *
 * The geography is deliberate:
 *   - One road runs the length of the continent, wandering a column at a time
 *     so it reads as a road rather than a ruler. Every settlement sits on it.
 *   - Mountains wall the north, forest walls the east, ocean the rest. The
 *     player is funnelled south-to-north without ever meeting an invisible
 *     wall.
 *   - The fen in the south-west is the only region with no road, which is why
 *     the barrow down there has stayed shut.
 */

const W = 64;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[overworld] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('~', 64)),
  /*  1 */ row(R('~', 64)),
  /*  2 */ row(R('~', 64)),
  /*  3 */ row(R('~', 64)),
  // --- the Cinderspine, north wall -----------------------------------------
  /*  4 */ row(R('~', 8), R('#', 48), R('~', 8)),
  /*  5 */ row(R('~', 7), R('#', 6), R('*', 34), R('#', 9), R('~', 8)),
  /*  6 */ row(R('~', 7), R('#', 5), R('*', 36), R('#', 8), R('~', 8)),
  /*  7 */ row(R('~', 7), R('#', 5), R('*', 12), R('p', 8), R('*', 16), R('#', 8), R('~', 8)),
  /*  8 */ row(R('~', 7), R('#', 6), R('*', 34), R('#', 9), R('~', 8)),
  /*  9 */ row(R('~', 7), R('#', 8), R('*', 8), R(',', 2), R('*', 20), R('#', 11), R('~', 8)),
  // --- foothills -----------------------------------------------------------
  /* 10 */ row(R('~', 7), R('#', 10), R('.', 6), R(',', 2), R('.', 10), R('#', 21), R('~', 8)),
  /* 11 */ row(R('~', 6), R('#', 8), R('.', 10), R(',', 2), R('.', 12), R('#', 18), R('~', 8)),
  /* 12 */ row(R('~', 6), R('#', 6), R('.', 12), R(',', 2), R('.', 14), R('#', 16), R('~', 8)),
  /* 13 */ row(R('~', 6), R('#', 4), R('.', 14), R(',', 2), R('.', 16), R('#', 14), R('~', 8)),
  // --- the Marrowfields ----------------------------------------------------
  /* 14 */ row(R('~', 6), R('%', 3), R('.', 16), R(',', 2), R('.', 18), R('f', 11), R('~', 8)),
  /* 15 */ row(R('~', 5), R('%', 4), R('.', 16), R(',', 2), R('.', 18), R('f', 11), R('~', 8)),
  /* 16 */ row(R('~', 5), R('%', 4), R('t', 4), R('.', 12), R(',', 2), R('.', 16), R('f', 13), R('~', 8)),
  /* 17 */ row(R('~', 5), R('%', 4), R('t', 4), R('.', 12), R(',', 2), R('.', 16), R('f', 13), R('~', 8)),
  /* 18 */ row(R('~', 5), R('%', 3), R('.', 18), R(',', 2), R('.', 14), R('f', 14), R('~', 8)),
  /* 19 */ row(R('~', 5), R('%', 3), R('.', 18), R(',', 2), R('.', 14), R('f', 14), R('~', 8)),
  /* 20 */ row(R('~', 5), R('%', 3), R('.', 8), R('b', 4), R('.', 6), R(',', 2), R('.', 14), R('f', 14), R('~', 8)),
  /* 21 */ row(R('~', 5), R('%', 3), R('.', 18), R(',', 2), R('.', 12), R('f', 16), R('~', 8)),
  // --- the eastern branch, toward Solmere ----------------------------------
  /* 22 */ row(R('~', 5), R('%', 3), R('.', 18), R(',', 24), R('.', 2), R('f', 4), R('~', 8)),
  /* 23 */ row(R('~', 5), R('%', 3), R('.', 18), R(',', 2), R('.', 16), R('f', 12), R('~', 8)),
  /* 24 */ row(R('~', 5), R('%', 3), R('.', 18), R(',', 2), R('.', 16), R('f', 12), R('~', 8)),
  /* 25 */ row(R('~', 5), R('%', 4), R('.', 17), R(',', 2), R('t', 6), R('.', 10), R('f', 12), R('~', 8)),
  /* 26 */ row(R('~', 5), R('%', 4), R('.', 17), R(',', 2), R('.', 16), R('f', 12), R('~', 8)),
  /* 27 */ row(R('~', 5), R('%', 4), R('.', 17), R(',', 2), R('.', 16), R('f', 12), R('~', 8)),
  // --- the Sunken Fen ------------------------------------------------------
  /* 28 */ row(R('~', 5), R('%', 4), R('w', 6), R('.', 11), R(',', 2), R('.', 14), R('f', 14), R('~', 8)),
  /* 29 */ row(R('~', 5), R('%', 4), R('w', 8), R('.', 9), R(',', 2), R('.', 12), R('f', 16), R('~', 8)),
  /* 30 */ row(R('~', 5), R('%', 4), R('w', 10), R('.', 7), R(',', 2), R('.', 12), R('f', 16), R('~', 8)),
  /* 31 */ row(R('~', 5), R('%', 4), R('w', 10), R('.', 7), R(',', 2), R('.', 12), R('f', 16), R('~', 8)),
  /* 32 */ row(R('~', 5), R('%', 4), R('w', 12), R('.', 5), R(',', 2), R('.', 10), R('f', 18), R('~', 8)),
  /* 33 */ row(R('~', 5), R('%', 4), R('w', 14), R('.', 3), R(',', 2), R('.', 10), R('f', 18), R('~', 8)),
  /* 34 */ row(R('~', 5), R('%', 4), R('w', 14), R('d', 3), R(',', 2), R('.', 8), R('f', 20), R('~', 8)),
  /* 35 */ row(R('~', 5), R('%', 5), R('w', 12), R('.', 4), R(',', 2), R('.', 8), R('f', 20), R('~', 8)),
  /* 36 */ row(R('~', 5), R('%', 6), R('w', 10), R('.', 4), R(',', 2), R('.', 9), R('f', 20), R('~', 8)),
  // --- the southern shore --------------------------------------------------
  /* 37 */ row(R('~', 5), R('%', 10), R('.', 8), R(',', 2), R('.', 10), R('%', 21), R('~', 8)),
  /* 38 */ row(R('~', 4), R('%', 14), R('s', 4), R('%', 6), R(',', 2), R('%', 26), R('~', 8)),
  /* 39 */ row(R('~', 4), R('%', 52), R('~', 8)),
  /* 40 */ row(R('~', 64)),
  /* 41 */ row(R('~', 64)),
  /* 42 */ row(R('~', 64)),
  /* 43 */ row(R('~', 64)),
];

export const OVERWORLD = {
  id: 'overworld',
  name: 'Caelum Vast',
  subtitle: 'The Western Reach',
  kind: 'field',
  light: 'day',
  grade: 'noon',
  fog: ['#9fb4be', 120, 400],
  // The world map pulls the camera back and flattens the tilt-shift: on a
  // continent you want to read the landscape, not a diorama.
  tilt: 0.20,
  cameraDistance: 46,
  cameraPitch: 0.98,
  music: 'overworld',
  speedScale: 1.75,
  base: 'grass',
  groundRamp: 'terrain',
  wallHeight: 9.5,
  waterLevel: -0.55,
  water: { shallow: '#2f7a90', deep: '#0d1824', foam: '#9ccdd4', waveHeight: 0.14 },

  sky: {
    zenith: '#2a5e92', horizon: '#b0c2b8', ground: '#4e4c42',
    sunColor: '#ffdda0', sunDir: [0.45, 0.62, 0.35], cloud: 0.75,
  },

  terrain: TERRAIN,

  spawns: {
    // Where each of the fourth-ring places puts you back.
    ashfall_eaves: { at: [17, 11], face: 'south' },
    graveltide_strand: { at: [12, 13], face: 'south' },
    sootreach_stackhead: { at: [41, 16], face: 'south' },
    pilgrimsrest_gate: { at: [31, 29], face: 'south' },
    theloom_roofstair: { at: [6, 30], face: 'south' },
    wexford_foot: { at: [25, 37], face: 'south' },
    nettlebed_southlane: { at: [10, 38], face: 'south' },
    stonecross_fourthface: { at: [15, 38], face: 'south' },
    thrapton_companygate: { at: [35, 38], face: 'south' },
    bellfoundry_yardgate: { at: [40, 38], face: 'south' },
    default: { at: [26, 30], face: 'south' },
    harrowmere: { at: [26, 32], face: 'north' },
    ferran: { at: [27, 13], face: 'south' },
    ashenhall: { at: [24, 9], face: 'south' },
    solmere: { at: [47, 22], face: 'west' },
    fenbarrow: { at: [13, 33], face: 'east' },
    weepingwood: { at: [48, 22], face: 'west' },
    coast: { at: [20, 37], face: 'north' },
    // The second ring of settlements. Each is sited on terrain that matches
    // what the town is: the harbour on the western shore, the quarry against
    // the northern rock, the caravan crossroads out in open country.
    emberlyn: { at: [20, 19], face: 'south' },
    emberlyn_north: { at: [20, 16], face: 'north' },
    saltmarch: { at: [6, 19], face: 'south' },
    highfell: { at: [13, 8], face: 'south' },
    duncastle: { at: [37, 20], face: 'south' },
    verrenholt: { at: [35, 33], face: 'south' },
    // Dungeon mouths, sited on terrain that explains them: the mine and the
    // spire in the northern rock, the flooded vault on the southern shore,
    // the thorn maze against the fen, the glass waste out in the open.
    hollowmine: { at: [35, 7], face: 'south' },
    stormspire: { at: [46, 8], face: 'south' },
    thornmarch: { at: [18, 29], face: 'south' },
    glasswaste: { at: [41, 27], face: 'south' },
    sunkenvault: { at: [5, 37], face: 'north' },
    reach_crossing: { at: [50, 22], face: 'west' },
    // The fourth ring.
    ashfall: { at: [17, 12], face: 'south' },
    graveltide: { at: [12, 14], face: 'south' },
    sootreach: { at: [41, 17], face: 'south' },
    pilgrimsrest: { at: [31, 30], face: 'south' },
    theloom: { at: [6, 31], face: 'south' },
    wexford: { at: [25, 36], face: 'south' },
    nettlebed: { at: [10, 37], face: 'south' },
    stonecross: { at: [15, 37], face: 'south' },
    thrapton: { at: [35, 37], face: 'south' },
    bellfoundry: { at: [40, 37], face: 'south' },
    // The third ring — the later towns and the optional dungeons.
    oxmere: { at: [26, 19], face: 'south' },
    // Oxmere is a road with a gate at each end, so the world map offers both;
    // coming out of the north gate must not put you at the south one.
    oxmere_north: { at: [26, 16], face: 'north' },
    lowfen: { at: [22, 25], face: 'south' },
    caldwick: { at: [32, 18], face: 'south' },
    thistlebeck: { at: [12, 20], face: 'south' },
    greyharrow: { at: [37, 13], face: 'south' },
    marrowgate: { at: [16, 24], face: 'south' },
    saltworks: { at: [7, 25], face: 'south' },
    kingspyre: { at: [41, 7], face: 'south' },
    drownedhalls: { at: [30, 35], face: 'south' },
    bramblewold: { at: [29, 24], face: 'south' },
    ironquarry: { at: [35, 26], face: 'south' },
    lastlantern: { at: [12, 28], face: 'south' },
  },

  /**
   * The far side of the map is a rumour until the Gallowglass. Flying east off
   * the edge is the only way to reach the Meridian Reach, which is what makes
   * the airship a discovery rather than a fast-travel button.
   */
  crossing: {
    edge: 'east',
    to: 'eastreach',
    spawn: 'landfall',
    prompt: 'Cross to the Meridian Reach',
  },

  /**
   * Regions, checked in order — earlier entries win, so a small pocket can sit
   * inside a larger band. Difficulty rises northward and eastward, which is the
   * direction the road pushes you.
   */
  encounterZones: [
    { rect: [4, 4, 44, 10], table: 'cinderspine' },      // the snowfield and its passes
    { rect: [44, 12, 20, 22], table: 'weeping_wood' },   // the eastern forest
    { rect: [4, 27, 22, 10], table: 'fenmarsh' },        // the sunken fen
    { rect: [4, 36, 56, 5], table: 'drowned_coast' },    // the southern shore
    { rect: [4, 14, 44, 14], table: 'marrowfields' },    // the central plains
    { rect: [0, 0, 64, 44], table: 'siltroad_south' },   // fallback
  ],

  encounters: {
    rate: 30,
    terrain: 'grass',
    scenery: 'field',
    groups: [
      { weight: 26, enemies: ['fenrat', 'fenrat', 'mireslug'] },
      { weight: 22, enemies: ['reedstalker', 'reedstalker'] },
      { weight: 20, enemies: ['roadwolf', 'roadwolf'] },
      { weight: 16, enemies: ['brigand', 'brigandarcher'] },
      { weight: 10, enemies: ['carrionbat', 'carrionbat', 'bogwisp'] },
      { weight: 6, enemies: ['siltcrawler', 'thornmaw'] },
    ],
  },

  exits: [
    { at: [26, 31], size: [2, 1], to: 'harrowmere', spawn: 'world', prompt: 'Harrowmere' },
    { at: [27, 12], size: [2, 1], to: 'ferran_outpost', spawn: 'world', prompt: 'Ferran Outpost' },
    { at: [22, 7], size: [2, 1], to: 'ashenhall', spawn: 'world', prompt: 'Ashenhall' },
    { at: [48, 22], size: [2, 1], to: 'solmere', spawn: 'world', prompt: 'Solmere' },
    { at: [12, 33], size: [2, 1], to: 'fen_barrow', spawn: 'world', prompt: 'The Fen Barrow' },
    // Moved four tiles west off the Ashenhall doorstep. The hall's footprint
    // is 7 wide plus its plinth, so its collider — centred on [23, 6.2] —
    // reached from x 42.3 to 49.7 and covered this doorway completely: the
    // pass could be walked *out* of and never into. The mouth of the pass is
    // along the wall from the hall, not through it.
    { at: [18, 6], size: [2, 1], to: 'cinderspine', spawn: 'world', prompt: 'The Cinderspine Pass' },
    { at: [31, 12], size: [2, 1], to: 'ninth_well', spawn: 'world', prompt: 'The Ninth Well' },
    { at: [49, 22], size: [2, 1], to: 'weeping_wood', spawn: 'world', prompt: 'The Weeping Wood' },
    { at: [20, 38], size: [2, 1], to: 'drowned_coast', spawn: 'world', prompt: 'The Drowned Coast' },
    { at: [20, 18], size: [2, 1], to: 'emberlyn', spawn: 'world', prompt: 'Emberlyn' },
    // Emberlyn is a crossroads, so it has two gates and the world map has to
    // offer both — walking out of the north gate and arriving back at the
    // south one would undo the whole point of the town's layout.
    { at: [20, 15], size: [2, 1], to: 'emberlyn', spawn: 'world_north', prompt: 'Emberlyn (north gate)' },
    { at: [6, 18], size: [2, 1], to: 'saltmarch', spawn: 'world', prompt: 'Saltmarch' },
    { at: [13, 7], size: [2, 1], to: 'highfell', spawn: 'world', prompt: 'Highfell' },
    { at: [37, 19], size: [2, 1], to: 'duncastle', spawn: 'world', prompt: 'Duncastle' },
    { at: [35, 32], size: [2, 1], to: 'verrenholt', spawn: 'world', prompt: 'Verrenholt' },
    { at: [35, 6], size: [2, 1], to: 'hollowmine', spawn: 'world', prompt: 'The Hollow Mine' },
    { at: [46, 7], size: [2, 1], to: 'stormspire', spawn: 'world', prompt: 'The Stormspire' },
    { at: [18, 28], size: [2, 1], to: 'thornmarch', spawn: 'world', prompt: 'The Thornmarch' },
    { at: [41, 26], size: [2, 1], to: 'glasswaste', spawn: 'world', prompt: 'The Glass Waste' },
    { at: [5, 38], size: [2, 1], to: 'sunkenvault', spawn: 'world', prompt: 'The Sunken Vault' },
    { at: [26, 18], size: [2, 1], to: 'oxmere', spawn: 'world', prompt: 'Oxmere' },
    { at: [26, 15], size: [2, 1], to: 'oxmere', spawn: 'world_north', prompt: 'Oxmere (north gate)' },
    { at: [22, 24], size: [2, 1], to: 'lowfen', spawn: 'world', prompt: 'Lowfen' },
    { at: [17, 11], size: [2, 1], to: 'ashfall', spawn: 'world', prompt: 'Ashfall' },
    { at: [12, 13], size: [2, 1], to: 'graveltide', spawn: 'world', prompt: 'Graveltide' },
    { at: [41, 16], size: [2, 1], to: 'sootreach', spawn: 'world', prompt: 'Sootreach' },
    { at: [31, 29], size: [2, 1], to: 'pilgrimsrest', spawn: 'world', prompt: "Pilgrim's Rest" },
    { at: [6, 30], size: [2, 1], to: 'theloom', spawn: 'world', prompt: 'The Loom' },
    { at: [25, 37], size: [2, 1], to: 'wexford', spawn: 'world', prompt: 'Wexford' },
    { at: [10, 38], size: [2, 1], to: 'nettlebed', spawn: 'world', prompt: 'Nettlebed' },
    { at: [15, 38], size: [2, 1], to: 'stonecross', spawn: 'world', prompt: 'Stonecross' },
    { at: [35, 38], size: [2, 1], to: 'thrapton', spawn: 'world', prompt: 'Thrapton' },
    { at: [40, 38], size: [2, 1], to: 'bellfoundry', spawn: 'world', prompt: 'Bellfoundry' },
    { at: [32, 17], size: [2, 1], to: 'caldwick', spawn: 'world', prompt: 'Caldwick' },
    { at: [12, 19], size: [2, 1], to: 'thistlebeck', spawn: 'world', prompt: 'Thistlebeck' },
    { at: [37, 12], size: [2, 1], to: 'greyharrow', spawn: 'world', prompt: 'Greyharrow' },
    { at: [16, 23], size: [2, 1], to: 'marrowgate', spawn: 'world', prompt: 'Marrowgate' },
    { at: [7, 24], size: [2, 1], to: 'saltworks', spawn: 'world', prompt: 'The Saltworks' },
    { at: [41, 6], size: [2, 1], to: 'kingspyre', spawn: 'world', prompt: 'Kingspyre' },
    { at: [30, 36], size: [2, 1], to: 'drownedhalls', spawn: 'world', prompt: 'The Drowned Halls' },
    { at: [29, 23], size: [2, 1], to: 'bramblewold', spawn: 'world', prompt: 'The Bramblewold' },
    { at: [35, 25], size: [2, 1], to: 'ironquarry', spawn: 'world', prompt: 'The Iron Quarry' },
    { at: [12, 27], size: [2, 1], to: 'lastlantern', spawn: 'world', prompt: 'The Last Lantern' },
  ],

  props: [
    // Settlement markers. On a world map a town is a silhouette you steer
    // toward, so each one is a cluster of roofs rather than a real street plan.
    { kit: 'building', at: [26, 30.2], w: 5, d: 4, h: 3, rise: 1.8, style: 'plaster', roof: 'thatch', timbered: true, door: 'south', id: 'wm-harrowmere-a' },
    { kit: 'building', at: [23.5, 29.6], w: 4, d: 3.4, h: 2.6, rise: 1.5, style: 'plaster', roof: 'thatch', door: 'south', id: 'wm-harrowmere-b' },
    { kit: 'building', at: [28.6, 29.4], w: 4, d: 3.4, h: 2.6, rise: 1.5, style: 'stone', roof: 'slate', door: 'south', id: 'wm-harrowmere-c' },
    { kit: 'signpost', at: [27.6, 31.4], id: 'wm-sign-harrowmere',
      interact: { name: 'Signpost', text: ['HARROWMERE — village, inn, forge.'] } },

    // The mooring mast. Standing on the plain outside Harrowmere from the
    // first hour of the game, long before there is anything tied to it — so
    // when the Gallowglass finally arrives the player already knows where to
    // go, and has walked past the answer a dozen times.
    { kit: 'airshipmast', at: [30, 26], id: 'wm-mast', radius: 1.6,
      interact: { airship: true, prompt: 'Mooring mast' } },

    { kit: 'building', at: [27, 11.2], w: 6, d: 4.4, h: 4.2, rise: 1.4, style: 'magitek', roof: 'iron', door: 'south', windows: false, id: 'wm-ferran-a' },
    { kit: 'building', at: [24.4, 10.8], w: 4, d: 3.6, h: 3.6, rise: 1.2, style: 'stone', roof: 'iron', door: 'south', windows: false, id: 'wm-ferran-b' },
    { kit: 'lamppost', at: [29.2, 11.8] },
    { kit: 'signpost', at: [28.6, 12.4], id: 'wm-sign-ferran',
      interact: { name: 'Signpost', text: ['FERRAN OUTPOST — no admittance without a Silt Road Pass.'] } },

    { kit: 'building', at: [23, 6.2], w: 7, d: 5, h: 4.6, rise: 2.4, style: 'stone', roof: 'slate', door: 'south', windows: false, id: 'wm-ashenhall' },
    { kit: 'rock', at: [21, 7.4], scale: 2.2, seed: 3 },
    { kit: 'rock', at: [26, 7.0], scale: 1.8, seed: 5 },

    { kit: 'building', at: [50, 21.2], w: 7, d: 5, h: 5.4, storeys: 2, rise: 2.2, style: 'marble', roof: 'slate', door: 'west', id: 'wm-solmere-a' },
    { kit: 'building', at: [52.5, 23.4], w: 5, d: 4, h: 4.2, rise: 1.8, style: 'marble', roof: 'slate', door: 'west', id: 'wm-solmere-b' },
    { kit: 'building', at: [49.6, 24.2], w: 4.5, d: 3.6, h: 3.6, rise: 1.6, style: 'stone', roof: 'tile', door: 'west', id: 'wm-solmere-c' },
    { kit: 'signpost', at: [47.4, 22.8], id: 'wm-sign-solmere',
      interact: { name: 'Signpost', text: ['SOLMERE — the Engine City. Mind the steam vents.'] } },

    { kit: 'rock', at: [12.4, 32.6], scale: 2.6, seed: 11, id: 'wm-barrow' },
    { kit: 'rock', at: [10.8, 33.8], scale: 1.9, seed: 13 },
    { kit: 'signpost', at: [14.4, 33.2], id: 'wm-sign-barrow',
      interact: { name: 'Weathered Stone', text: ['The carving has almost gone. You can make out: SEALED IN THE NINTH YEAR.'] } },
    // The second plaque, down at the door itself rather than out on the reeds
    // with the first one. Reading it is what points the party at the fen: the
    // mud in front of it has been walked on, recently, in one direction.
    // Sited clear of the barrow's own exit trigger so examining it cannot
    // drop the player through the door mid-sentence.
    { kit: 'signpost', at: [12.8, 34.6], id: 'wm-barrow-plaque',
      interact: { prompt: 'The barrow door', event: 'barrow_hint' } },

    // --- optional encounters, off the road -------------------------------
    { kit: 'tree', at: [14.0, 17.0], kind: 'dark', scale: 2.6, seed: 101, id: 'wm-oak',
      interactRadius: 2.6,
      interact: { prompt: 'Approach the oak', event: 'standing_oak' } },
    { kit: 'signpost', at: [16.0, 17.6], id: 'wm-sign-oak',
      interact: { name: 'Rotted Marker', text: ['DO NOT CUT. DO NOT ASK. DO NOT LINGER.'] } },

    { kit: 'cart', at: [30.0, 26.5], rot: 1.1, id: 'wm-barricade',
      interactRadius: 2.2,
      interact: { prompt: 'Inspect the barricade', event: 'toll_baron' } },

    // Landmarks along the road, so travel has punctuation.
    { kit: 'well', at: [24.6, 19.4], id: 'wm-well',
      interact: { name: 'Roadside Well', text: ['Cold, clean, and someone has left a tin cup on the rim.'] } },
    // The milestone Corvin's fence sits on. It has been on this road as long as
    // the road has, which is roughly Ashby's point.
    { kit: 'signpost', at: [24.4, 24.6], id: 'wm-milestone',
      interact: { name: 'Milestone', text: [
        'SOLMERE XI — HARROWMERE VI.',
        'The mile figures have been recut by somebody who did not agree with them.',
      ] } },
    { kit: 'bench', at: [28.2, 25.4], rot: 1.2 },
    { kit: 'cart', at: [29.4, 16.6], rot: 0.6 },
    { kit: 'lamppost', at: [25.6, 22.6] },
    { kit: 'chest', at: [8.4, 17.6], id: 'wm-chest-1',
      contains: { kind: 'item', id: 'hipotion', count: 1, label: 'a Hi-Potion' } },
    { kit: 'chest', at: [41.4, 28.6], id: 'wm-chest-2',
      contains: { kind: 'item', id: 'swiftband', count: 1, label: 'a Swift Band' } },
  ],

  /**
   * After the cataclysm. Same continent, same road, wrong sky.
   *
   * Only the things that would actually change are overridden: the light, the
   * air, what lives out here, and who is still standing on the road. The
   * terrain grid is untouched on purpose — the player should be walking a
   * route they already know.
   */
  ruin: {
    name: 'Caelum Vast',
    subtitle: 'After',
    light: 'ruin',
    grade: 'ruin',
    fog: ['#8a7264', 70, 300],
    music: 'overworld_ruin',
    sky: {
      zenith: '#6b4a3a', horizon: '#c8a184', ground: '#3e352c',
      sunColor: '#ff9d63', sunDir: [0.3, 0.24, 0.4], cloud: 0.95,
    },
    encounterZones: [
      { rect: [4, 4, 44, 10], table: 'cinderspine' },
      { rect: [44, 12, 20, 22], table: 'ashenhall' },
      { rect: [4, 27, 22, 10], table: 'solmere_works' },
      { rect: [4, 36, 56, 5], table: 'drowned_coast' },
      { rect: [4, 14, 44, 14], table: 'ferran_road' },
      { rect: [0, 0, 64, 44], table: 'ferran_road' },
    ],
    /**
     * Two zones that only exist once the sky has changed, both a step off the
     * road rather than on it — the road is walked constantly and neither scene
     * wants to be walked through.
     *
     *   - the flattened grass under the ridge, where Tam stops the party
     *   - the roadside well, which is the only thing in the world that is
     *     exactly as cold as it was
     */
    triggers: [
      { at: [21, 12], size: [3, 2], kind: 'event', event: 'tam_quiet_lesson' },
      { at: [24, 20], size: [2, 1], kind: 'event', event: 'vesna_still_here' },
    ],
    // The pilgrim and the scout are gone; two people who stayed are not.
    removeNpcs: ['pilgrim', 'scout'],
    npcs: [
      {
        id: 'ow-survivor', name: 'Survivor', at: [26, 24], face: 'south', clip: 'sit', prompt: 'Speak',
        look: { build: 'normal', height: 1.70, hair: 'wild',
          colors: { skin: '#9a6147', hair: '#4a2a17', torso: '#6b5d37', accent: '#5a3230',
            legs: '#4d422a', boots: '#3a2a20' }, expression: 'sad' },
        talk: [
          'The road is still here. That is the part nobody expected.',
          'Everything else went, and the road is still here, so people walk it. Where else would they go?',
        ],
      },
      {
        id: 'tam', name: 'Tam', at: [16, 18], face: 'south', clip: 'idle', wander: 3,
        prompt: 'Speak', event: 'recruit_tam',
        look: { id: 'tam', build: 'child', height: 1.42, hair: 'wild', expression: 'surprised',
          colors: { skin: '#9a6147', hair: '#7a4a22', torso: '#6b5d37', accent: '#496035',
            legs: '#4b382d', boots: '#3a2a20', gloves: '#63503f' } },
      },
    ],
    props: [
      { kit: 'chest', at: [34, 20], id: 'ow-ruin-chest',
        contains: { kind: 'item', id: 'megalixir', count: 2, label: '2 Megalixirs' } },
      { kit: 'tree', at: [18.0, 22.0], kind: 'dead', scale: 1.6, seed: 201 },
      { kit: 'tree', at: [33.0, 25.0], kind: 'dead', scale: 1.4, seed: 203 },
      { kit: 'tree', at: [22.0, 27.0], kind: 'dead', scale: 1.5, seed: 205 },
    ],
  },

  npcs: [
    {
      id: 'pilgrim', name: 'Road Pilgrim', at: [26, 24], face: 'south', clip: 'loiter', wander: 1,
      look: { build: 'normal', height: 1.70, hair: 'bald',
        colors: { skin: '#9a6147', hair: '#241d26', torso: '#95836b', accent: '#5e412c', legs: '#6b5d37', boots: '#4b382d', cape: '#8d7c4a' } },
      talk: [
        'Walking to Solmere. They say the Engine City still has bread.',
        'Don\'t take the fen road. Whatever\'s down there isn\'t hungry — it\'s bored.',
      ],
    },
    {
      // Corvin's fence, on the milestone beside the road with the ledger open.
      // He is on the stretch every route out of Harrowmere uses, which is the
      // point: Corvin has walked a different road every year and it is this one.
      id: 'ow-ashby', name: 'Ashby', at: [25, 24], face: 'east', clip: 'sit',
      prompt: 'Speak', event: 'corvin_debt', facePlayer: true,
      look: { build: 'normal', height: 1.72, hair: 'short', eyeStyle: 'sharp', expression: 'neutral',
        colors: { skin: '#dbb28c', hair: '#241d26', torso: '#3a3340', accent: '#ab8018',
          legs: '#2b2933', boots: '#3a2a20', gloves: '#4b382d', cape: '#2f2733' } },
    },
    {
      id: 'scout', name: 'Ferran Scout', at: [28, 14], face: 'south', clip: 'idle',
      look: { build: 'athletic', height: 1.78, hair: 'short', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#342a37', torso: '#414954', accent: '#8a6a23', legs: '#2b2933', boots: '#22242a', metal: '#a6b0bc' } },
      talk: ['Outpost is closed to civilians. Turn around.'],
    },
  ],
};
