/**
 * The Drowned Coast.
 *
 * Open beach with the sea eating into it — the shallows are walkable and the
 * deep water is not, so the coastline itself does the level design. The wreck
 * of the Vagrant Star sits at the far end, which is where Osric is, because of
 * course it is.
 */

const W = 40;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[drownedcoast] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  // --- open water ----------------------------------------------------------
  /*  0 */ row(R('~', 40)),
  /*  1 */ row(R('~', 40)),
  /*  2 */ row(R('~', 14), R(':', 12), R('~', 14)),
  // --- the sandbar and the wreck -------------------------------------------
  /*  3 */ row(R('~', 12), R(':', 4), R('%', 8), R(':', 4), R('~', 12)),
  /*  4 */ row(R('~', 11), R(':', 3), R('%', 12), R(':', 3), R('~', 11)),
  /*  5 */ row(R('~', 11), R(':', 3), R('%', 12), R(':', 3), R('~', 11)),
  /*  6 */ row(R('~', 12), R(':', 4), R('%', 8), R(':', 4), R('~', 12)),
  /*  7 */ row(R('~', 14), R(':', 12), R('~', 14)),
  /*  8 */ row(R('~', 16), R(':', 8), R('~', 16)),
  /*  9 */ row(R('~', 16), R(':', 8), R('~', 16)),
  // --- the tidal flats -----------------------------------------------------
  /* 10 */ row(R('~', 4), R(':', 32), R('~', 4)),
  /* 11 */ row(R('~', 4), R(':', 10), R('%', 12), R(':', 10), R('~', 4)),
  /* 12 */ row(R('~', 4), R('%', 32), R('~', 4)),
  /* 13 */ row(R('~', 4), R('%', 32), R('~', 4)),
  /* 14 */ row(R('~', 4), R('%', 12), R(':', 8), R('%', 12), R('~', 4)),
  /* 15 */ row(R('~', 4), R('%', 12), R(':', 8), R('%', 12), R('~', 4)),
  /* 16 */ row(R('~', 4), R('%', 32), R('~', 4)),
  // --- the dunes -----------------------------------------------------------
  /* 17 */ row(R('#', 4), R('%', 32), R('#', 4)),
  /* 18 */ row(R('#', 4), R('%', 10), R('s', 4), R('%', 4), R('s', 4), R('%', 10), R('#', 4)),
  /* 19 */ row(R('#', 4), R('%', 32), R('#', 4)),
  /* 20 */ row(R('#', 6), R('%', 28), R('#', 6)),
  /* 21 */ row(R('#', 6), R('%', 28), R('#', 6)),
  /* 22 */ row(R('#', 14), R('%', 12), R('#', 14)),
  /* 23 */ row(R('#', 16), R('%', 8), R('#', 16)),
  /* 24 */ row(R('#', 18), R('%', 4), R('#', 18)),
  /* 25 */ row(R('#', 18), R('%', 4), R('#', 18)),
];

export const DROWNED_COAST = {
  id: 'drowned_coast',
  name: 'The Drowned Coast',
  subtitle: 'Low Tide Only',
  kind: 'field',
  light: 'dawn',
  grade: 'dawn',
  fog: ['#b8c6c4', 60, 220],
  tilt: 0.30,
  cameraDistance: 20,
  cameraPitch: 0.76,
  music: 'coast',
  base: 'sand',
  groundRamp: 'terrain',
  wallHeight: 6,
  waterLevel: -0.30,
  water: { shallow: '#4d94a8', deep: '#12262f', foam: '#cfeef2', waveHeight: 0.11 },

  sky: {
    zenith: '#5a86ae', horizon: '#f0d0b0', ground: '#6a6458',
    sunColor: '#ffd2a0', sunDir: [0.65, 0.22, -0.3], cloud: 0.45,
  },

  terrain: TERRAIN,

  spawns: {
    default: { at: [19, 24], face: 'north' },
    world: { at: [19, 24], face: 'north' },
  },

  exits: [
    { at: [18, 25], size: [4, 1], to: 'overworld', spawn: 'coast', prompt: 'Leave the coast' },
  ],

  encounters: {
    rate: 22, terrain: 'sand', scenery: 'field',
    groups: [
      { weight: 30, enemies: ['gullkin', 'gullkin', 'gullkin'] },
      { weight: 24, enemies: ['shellback', 'shellback'] },
      { weight: 22, enemies: ['tidechanter', 'gullkin'] },
      { weight: 14, enemies: ['tidechanter', 'shellback'] },
      { weight: 10, enemies: ['carrionbat', 'gullkin', 'gullkin'] },
    ],
  },

  props: [
    // --- the dunes --------------------------------------------------------
    { kit: 'savepoint', at: [19.5, 22.4], id: 'dc-save', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [17.4, 21.6], id: 'dc-tidepost',
      interact: { name: 'Tide Post', text: [
        'Notches cut up the post to mark high water. The top notch is above your head.',
        'Someone has written beside it: SHE WAS THE KEEPER. SHE SAID YES.',
      ] } },
    { kit: 'rock', at: [8.0, 20.4], scale: 1.5, seed: 3 },
    { kit: 'rock', at: [31.0, 20.6], scale: 1.4, seed: 5 },
    { kit: 'chest', at: [7.0, 18.5], id: 'dc-chest-1',
      contains: { kind: 'item', id: 'tidecleaver', count: 1, label: 'the Tidecleaver' } },

    // The coast light, up on the dune head above the shingle. The tide post
    // twenty paces east already carries her epitaph — SHE WAS THE KEEPER. SHE
    // SAID YES — and this is the tower she kept and the door that stayed
    // padlocked from the year the requisitions took the oil.
    //
    // The tower itself is the interactable rather than a marker beside it: the
    // scene is going through the door, and a wide interact radius means the
    // player triggers it by walking up to the tower, not by hunting a post.
    { kit: 'building', at: [11.0, 20.6], w: 4.5, d: 4.5, h: 3.6, storeys: 3, rise: 2.6,
      style: 'stone', roof: 'cone', windows: false, door: 'north', id: 'dc-lighthouse',
      interactRadius: 3.4,
      interact: { prompt: 'The lighthouse door', event: 'lighthouse_relit' },
      sign: { icon: '◆', text: 'The Coast Light', x: 0 } },

    // --- the flats --------------------------------------------------------
    { kit: 'cart', at: [12.0, 13.5], rot: 1.6 },
    { kit: 'barrel', at: [27.0, 13.0] },
    { kit: 'crate', at: [28.0, 13.8], rot: 0.4 },
    { kit: 'rock', at: [16.0, 16.4], scale: 1.2, seed: 7 },
    { kit: 'rock', at: [24.0, 16.6], scale: 1.3, seed: 9 },
    { kit: 'chest', at: [33.0, 12.5], id: 'dc-chest-2',
      contains: { kind: 'esper', id: 'saltwidow', label: 'a shard of magicite' } },

    // --- the wreck --------------------------------------------------------
    { kit: 'building', at: [19.5, 4.6], w: 9, d: 5, h: 3.0, rise: 1.2,
      style: 'wood', roof: 'thatch', door: 'south', windows: false, rot: 0.22, id: 'dc-wreck' },
    { kit: 'barrel', at: [15.0, 5.4] },
    { kit: 'barrel', at: [24.0, 5.6] },
    { kit: 'crate', at: [16.2, 3.4], rot: 0.7 },
    { kit: 'chest', at: [23.5, 3.4], id: 'dc-chest-3',
      contains: { kind: 'item', id: 'megalixir', count: 1, label: 'a Megalixir' } },
  ],

  npcs: [
    {
      id: 'osric', name: 'Osric Vale', at: [19.5, 6.6], face: 'south', clip: 'loiter',
      prompt: 'Speak', event: 'recruit_osric',
      look: { id: 'osric', build: 'slim', height: 1.84, hair: 'long', eyeStyle: 'sharp',
        colors: { skin: '#ac744c', hair: '#dedbe0', torso: '#4e326c', accent: '#d8ac31',
          legs: '#2b2933', boots: '#3b3943', gloves: '#97929a', cape: '#38224f' },
        buckle: true },
    },
    {
      // He has Osric's ship's papers on the shelf with everything else the tide
      // brought up, and he will not sell them. He will cut for them.
      id: 'dc-wrecker', name: 'Beachcomber', at: [12.5, 17.0], face: 'east',
      clip: 'work', prompt: 'Speak', wander: 2, event: 'osric_ledger_game',
      look: { build: 'normal', height: 1.70, hair: 'wild',
        colors: { skin: '#6e4030', hair: '#95836b', torso: '#6b5d37', accent: '#4b382d',
          legs: '#5e412c', boots: '#3a2a20' } },
      talk: [
        'Tide brings up the strangest things since the digging started. Bits of lamp. Bits of people.',
        'I do not sell those. I put them back.',
      ],
    },
  ],
};
