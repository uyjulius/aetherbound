/**
 * The Meridian Reach — the eastern continent, and where the Imperium came from.
 *
 * There is no road here from Caelum Vast and no boat that will make the
 * crossing. The Reach exists to give the airship a reason: until the
 * Gallowglass, the far side of the map is a rumour, and the moment the player
 * has it the world doubles.
 *
 * The shape is the point. Caelum Vast is one solid mass walled by mountains,
 * so it reads as a country you are travelling *through*. The Reach is cut in
 * half by a channel four miles wide with two causeways over it, so it reads as
 * two countries that have been arguing for a thousand years — which is the
 * history. The northern lobe is marble and cobble, laid out on a grid by
 * people who had surveyors; the southern lobe is sand and rock and was never
 * planned by anybody. The Imperium is from the north. It has always said the
 * south is empty.
 *
 * Rows use the same run-length notation as Caelum Vast, and for the same
 * reason: a 64-column map typed by hand goes ragged immediately, and one
 * miscounted row becomes an invisible wall.
 */

const W = 64;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[eastreach] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('~', 64)),
  /*  1 */ row(R('~', 64)),
  /*  2 */ row(R('~', 64)),
  /*  3 */ row(R('~', 64)),
  // --- the northern lobe: the surveyed country ----------------------------
  /*  4 */ row(R('~', 8), R('#', 48), R('~', 8)),
  /*  5 */ row(R('~', 7), R('#', 6), R('=', 38), R('#', 5), R('~', 8)),
  /*  6 */ row(R('~', 7), R('#', 4), R('=', 42), R('#', 3), R('~', 8)),
  /*  7 */ row(R('~', 7), R('#', 4), R('=', 12), R('M', 18), R('=', 12), R('#', 3), R('~', 8)),
  /*  8 */ row(R('~', 7), R('#', 4), R('=', 12), R('M', 18), R('=', 12), R('#', 3), R('~', 8)),
  /*  9 */ row(R('~', 7), R('#', 4), R('=', 10), R('M', 22), R('=', 10), R('#', 3), R('~', 8)),
  /* 10 */ row(R('~', 7), R('#', 4), R('=', 10), R('M', 22), R('=', 10), R('#', 3), R('~', 8)),
  /* 11 */ row(R('~', 7), R('#', 5), R('=', 14), R('M', 12), R('=', 14), R('#', 4), R('~', 8)),
  /* 12 */ row(R('~', 7), R('#', 5), R('=', 42), R('#', 2), R('~', 8)),
  /* 13 */ row(R('~', 8), R('#', 4), R('=', 40), R('#', 4), R('~', 8)),
  /* 14 */ row(R('~', 9), R('#', 3), R('=', 38), R('#', 6), R('~', 8)),
  /* 15 */ row(R('~', 10), R('=', 44), R('~', 10)),
  // Two headlands, and nothing else on the south shore.
  /* 16 */ row(R('~', 14), R('=', 6), R('~', 10), R('=', 6), R('~', 28)),
  // --- the Channel --------------------------------------------------------
  /* 17 */ row(R('~', 14), R(',', 6), R('~', 10), R(',', 6), R('~', 28)),
  /* 18 */ row(R('~', 14), R(',', 6), R('~', 10), R(',', 6), R('~', 28)),
  /* 19 */ row(R('~', 14), R(',', 6), R('~', 10), R(',', 6), R('~', 28)),
  /* 20 */ row(R('~', 14), R(',', 6), R('~', 10), R(',', 6), R('~', 28)),
  /* 21 */ row(R('~', 14), R(',', 6), R('~', 10), R(',', 6), R('~', 28)),
  // --- the southern lobe: the country nobody surveyed ---------------------
  /* 22 */ row(R('~', 10), R('%', 44), R('~', 10)),
  /* 23 */ row(R('~', 9), R('%', 46), R('~', 9)),
  /* 24 */ row(R('~', 8), R('%', 20), R(',', 6), R('%', 22), R('~', 8)),
  /* 25 */ row(R('~', 8), R('%', 20), R(',', 6), R('%', 22), R('~', 8)),
  /* 26 */ row(R('~', 8), R('%', 14), R('R', 8), R(',', 6), R('R', 8), R('%', 12), R('~', 8)),
  /* 27 */ row(R('~', 8), R('%', 14), R('R', 8), R(',', 6), R('R', 8), R('%', 12), R('~', 8)),
  /* 28 */ row(R('~', 8), R('%', 20), R(',', 6), R('%', 22), R('~', 8)),
  /* 29 */ row(R('~', 8), R('%', 46), R('~', 10)),
  /* 30 */ row(R('~', 9), R('%', 20), R('=', 6), R('%', 19), R('~', 10)),
  /* 31 */ row(R('~', 9), R('%', 20), R('=', 6), R('%', 19), R('~', 10)),
  /* 32 */ row(R('~', 10), R('%', 44), R('~', 10)),
  /* 33 */ row(R('~', 10), R('%', 20), R(',', 4), R('%', 20), R('~', 10)),
  /* 34 */ row(R('~', 11), R('%', 42), R('~', 11)),
  /* 35 */ row(R('~', 12), R('%', 40), R('~', 12)),
  /* 36 */ row(R('~', 14), R('%', 36), R('~', 14)),
  /* 37 */ row(R('~', 18), R('%', 28), R('~', 18)),
  /* 38 */ row(R('~', 24), R('%', 16), R('~', 24)),
  /* 39 */ row(R('~', 64)),
  /* 40 */ row(R('~', 64)),
  /* 41 */ row(R('~', 64)),
  /* 42 */ row(R('~', 64)),
  /* 43 */ row(R('~', 64)),
];

export const EASTREACH = {
  id: 'eastreach',
  name: 'The Meridian Reach',
  subtitle: 'Where They Came From',
  kind: 'field',
  light: 'day',
  grade: 'noon',
  fog: ['#c4b49a', 130, 420],
  tilt: 0.20,
  cameraDistance: 46,
  cameraPitch: 0.98,
  music: 'reach',
  speedScale: 1.75,
  base: 'sand',
  groundRamp: 'terrain',
  wallHeight: 9.5,
  waterLevel: -0.55,
  water: { shallow: '#3d8ea0', deep: '#0e1a22', foam: '#cfe6ea', waveHeight: 0.12 },

  sky: {
    zenith: '#3a6a92', horizon: '#d8c9a8', ground: '#5a4c38',
    sunColor: '#ffe6b0', sunDir: [0.4, 0.68, 0.3], cloud: 0.42,
  },

  terrain: TERRAIN,

  /**
   * The airship puts down on the marble at the head of the northern lobe.
   * There is no `default` on foot because there is no way to arrive on foot.
   */
  spawns: {
    // Where each of the Reach's own places puts you back.
    saltcathedral_porch: { at: [14, 6], face: 'south' },
    ninthgate_porch: { at: [46, 6], face: 'south' },
    hollowing_mouth: { at: [14, 13], face: 'south' },
    undertow_tail: { at: [46, 13], face: 'south' },
    windwake_mooring: { at: [24, 13], face: 'south' },
    longbarrow_porch: { at: [14, 24], face: 'south' },
    emberdeep_adit: { at: [46, 24], face: 'south' },
    coldharbour_landgate: { at: [20, 32], face: 'south' },
    merrowdyke_dykegate: { at: [44, 32], face: 'south' },
    hobbsferry_northlanding: { at: [30, 36], face: 'south' },
    default: { at: [31, 12], face: 'south' },
    landfall: { at: [31, 12], face: 'south' },
    north_causeway: { at: [16, 16], face: 'south' },
    south_causeway: { at: [33, 22], face: 'north' },
    // Everything the Reach has, north lobe then south.
    saltcathedral: { at: [14, 7], face: 'south' },
    theninthgate: { at: [46, 7], face: 'south' },
    thehollowing: { at: [14, 14], face: 'south' },
    theundertow: { at: [46, 14], face: 'south' },
    windwake: { at: [24, 14], face: 'south' },
    thelongbarrow: { at: [14, 25], face: 'south' },
    emberdeep: { at: [46, 25], face: 'south' },
    coldharbour: { at: [20, 33], face: 'south' },
    merrowdyke: { at: [44, 33], face: 'south' },
    hobbsferry: { at: [30, 37], face: 'south' },
  },

  /**
   * Flying off the western edge takes you home, and the same on the far side.
   * A crossing is only offered to a player in the air — walking into the sea
   * does nothing, which is what keeps the airship the answer.
   */
  crossing: {
    edge: 'west',
    to: 'overworld',
    spawn: 'reach_crossing',
    prompt: 'Cross to Caelum Vast',
  },

  /**
   * Difficulty is read north to south, not by distance from a start point:
   * the surveyed lobe is patrolled and merely dangerous, the causeways are
   * a choke, and the southern lobe is where the things the Imperium says
   * are not there actually live.
   */
  encounterZones: [
    { rect: [10, 4, 46, 12], table: 'aether_shelf' },      // the marble country
    { rect: [12, 16, 28, 7], table: 'sunken_verge' },      // the causeways
    { rect: [8, 22, 48, 8], table: 'overwind_road' },      // the near south
    { rect: [8, 30, 48, 10], table: 'overwind_far' },      // the deep south
    { rect: [0, 0, 64, 44], table: 'aether_shelf' },       // fallback
  ],

  encounters: { rate: 30, terrain: 'sand', scenery: 'field' },

  exits: [
{ at: [14, 6], size: [2, 1], to: 'saltcathedral', spawn: 'world', prompt: 'The Salt Cathedral' },
    { at: [46, 6], size: [2, 1], to: 'theninthgate', spawn: 'world', prompt: 'The Ninth Gate' },
    { at: [14, 13], size: [2, 1], to: 'thehollowing', spawn: 'world', prompt: 'The Hollowing' },
    { at: [46, 13], size: [2, 1], to: 'theundertow', spawn: 'world', prompt: 'The Undertow' },
    { at: [24, 13], size: [2, 1], to: 'windwake', spawn: 'world', prompt: 'Windwake' },
    { at: [14, 24], size: [2, 1], to: 'thelongbarrow', spawn: 'world', prompt: 'The Long Barrow' },
    { at: [46, 24], size: [2, 1], to: 'emberdeep', spawn: 'world', prompt: 'Emberdeep' },
    { at: [20, 32], size: [2, 1], to: 'coldharbour', spawn: 'world', prompt: 'Coldharbour' },
    { at: [44, 32], size: [2, 1], to: 'merrowdyke', spawn: 'world', prompt: 'Merrowdyke' },
    { at: [30, 36], size: [2, 1], to: 'hobbsferry', spawn: 'world', prompt: 'Hobbs Ferry' },
  ],

  props: [
    // --- the northern capital ---------------------------------------------
    // Laid out on a grid, because these are the people who brought surveyors.
    { kit: 'building', at: [26, 8.2], w: 6, d: 4.4, h: 4.6, rise: 1.6, style: 'marble', roof: 'slate', door: 'south', id: 'er-hall-a' },
    { kit: 'building', at: [34, 8.2], w: 6, d: 4.4, h: 4.6, rise: 1.6, style: 'marble', roof: 'slate', door: 'south', id: 'er-hall-b' },
    { kit: 'building', at: [30, 10.4], w: 8, d: 5, h: 5.4, rise: 1.8, style: 'marble', roof: 'iron', door: 'south', id: 'er-hall-c' },
    { kit: 'lamppost', at: [24, 11] },
    { kit: 'lamppost', at: [38, 11] },
    { kit: 'signpost', at: [31.4, 12.8], id: 'er-sign',
      interact: { name: 'Survey Marker', text: [
        'MERIDIAN REACH — NORTHERN DIVISION. SURVEYED YEAR ELEVEN.',
        'Below that, in a different hand and much later: SOUTHERN DIVISION, UNSURVEYED.',
        'Below that, later still: THERE IS PLENTY DOWN THERE.',
      ] } },
    { kit: 'savepoint', at: [31.5, 13.6], id: 'er-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },

    // --- the causeways ------------------------------------------------------
    { kit: 'signpost', at: [16.4, 16.6], id: 'er-sign-north',
      interact: { name: 'Toll Board', text: [
        'The board lists a toll in a currency that stopped being minted before the war.',
        'Someone has left the correct number of stones on the ledge underneath it anyway.',
      ] } },
    { kit: 'lamppost', at: [15, 18] },
    { kit: 'lamppost', at: [19, 20] },
    { kit: 'lamppost', at: [33, 18] },
    { kit: 'lamppost', at: [34, 20] },
    { kit: 'chest', at: [18.5, 19.4], id: 'er-chest-1',
      contains: { kind: 'item', id: 'megalixir', count: 2, label: '2 Megalixirs' } },

    // --- the southern lobe ---------------------------------------------------
    { kit: 'savepoint', at: [33.5, 23.4], id: 'er-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'rock', at: [20, 26.5], scale: 1.8, seed: 11, material: 'rock' },
    { kit: 'rock', at: [42, 27.5], scale: 1.8, seed: 13, material: 'rock' },
    { kit: 'well', at: [33, 30.5], id: 'er-well', radius: 1.4,
      interact: { name: 'A Well', text: [
        'It is a good well, in good repair, a hundred miles from anywhere the Imperium admits is inhabited.',
        'Somebody drew from it this morning.',
      ] } },
    { kit: 'chest', at: [22.5, 33.4], id: 'er-chest-2',
      contains: { kind: 'item', id: 'elixir', count: 3, label: '3 Elixirs' } },
    // The toll ledge, and the recut markers between it and the well. Walk them
    // and they agree with each other and with nothing underfoot.
    { kit: 'signpost', at: [31.4, 33.6], id: 'er-tollledge',
      interact: { prompt: 'The toll ledge', event: 'reach_gainsayer' } },
    { kit: 'signpost', at: [33.4, 33.6], id: 'er-sign-south',
      interact: { name: 'A Painted Stone', text: [
        'A flat stone, painted with nine marks, eight of them crossed through.',
        'It is not Imperium work and it is not old.',
      ] } },
  ],

  npcs: [],
};
