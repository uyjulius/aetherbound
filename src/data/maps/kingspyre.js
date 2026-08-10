/**
 * The Kingspyre — one room, and a thing standing in the middle of it.
 *
 * There are no corridors here, no doors, no second chamber. The hall is forty
 * rows deep and forty-six across and it is all one space, so from the stoke
 * door the player can see the dais at the far end and the whole of the walk to
 * it. What they cannot see is what is on the other side of the stack.
 *
 * The stack is the dungeon. Twelve paces of solid kiln brick going up through
 * the roof, planted dead centre, throwing four paces of ash on every side and
 * blocking the one sightline that matters. Every route across this hall is the
 * same route — straight at the dais — until the stack makes you commit to a
 * side, and then you are walking blind down one flank of it with no way to see
 * what is coming round the other. That is the whole trick, and it costs the
 * map nothing but a hole in the middle.
 *
 * Twelve piers stand in three ranks. None of them divides the room; they are
 * there so the eye has something to measure forty rows of floor against, which
 * is the difference between a hall that feels enormous and one that feels empty.
 *
 * Rows use the same run-length notation as the other dungeons.
 */

const W = 52;
const R = (ch, n) => ch.repeat(n);

function row(...parts) {
  const s = parts.join('');
  if (s.length !== W) {
    throw new Error(`[kingspyre] row is ${s.length} columns, expected ${W}: ${s}`);
  }
  return s;
}

const TERRAIN = [
  /*  0 */ row(R('#', 52)),
  /*  1 */ row(R('#', 52)),
  /*  2 */ row(R('#', 52)),
  // --- the hall: forty rows of floor with nothing across it ----------------
  /*  3 */ row(R('#', 3), R('=', 46), R('#', 3)),
  // the dais at the north end, in plain sight from the door
  /*  4 */ row(R('#', 3), R('=', 17), R('M', 12), R('=', 17), R('#', 3)),
  /*  5 */ row(R('#', 3), R('=', 17), R('M', 12), R('=', 17), R('#', 3)),
  /*  6 */ row(R('#', 3), R('=', 17), R('M', 12), R('=', 17), R('#', 3)),
  /*  7 */ row(R('#', 3), R('=', 17), R('M', 12), R('=', 17), R('#', 3)),
  // the first rank of piers
  /*  8 */ row(R('#', 3), R('=', 5), R('#', 2), R('=', 5), R('#', 2), R('=', 3), R('M', 12), R('=', 4), R('#', 2), R('=', 5), R('#', 2), R('=', 4), R('#', 3)),
  /*  9 */ row(R('#', 3), R('=', 5), R('#', 2), R('=', 5), R('#', 2), R('=', 3), R('M', 12), R('=', 4), R('#', 2), R('=', 5), R('#', 2), R('=', 4), R('#', 3)),
  /* 10 */ row(R('#', 3), R('=', 46), R('#', 3)),
  /* 11 */ row(R('#', 3), R('=', 46), R('#', 3)),
  /* 12 */ row(R('#', 3), R('=', 46), R('#', 3)),
  // --- the ash: the stack throws it four paces on every side ---------------
  /* 13 */ row(R('#', 3), R('=', 13), R(',', 20), R('=', 13), R('#', 3)),
  /* 14 */ row(R('#', 3), R('=', 13), R(',', 20), R('=', 13), R('#', 3)),
  /* 15 */ row(R('#', 3), R('=', 13), R(',', 20), R('=', 13), R('#', 3)),
  /* 16 */ row(R('#', 3), R('=', 13), R(',', 20), R('=', 13), R('#', 3)),
  // --- the stack: solid, twelve paces through, and in everybody's way ------
  /* 17 */ row(R('#', 3), R('=', 13), R(',', 7), R('#', 6), R(',', 7), R('=', 13), R('#', 3)),
  /* 18 */ row(R('#', 3), R('=', 13), R(',', 6), R('#', 8), R(',', 6), R('=', 13), R('#', 3)),
  /* 19 */ row(R('#', 3), R('=', 13), R(',', 5), R('#', 10), R(',', 5), R('=', 13), R('#', 3)),
  /* 20 */ row(R('#', 3), R('=', 13), R(',', 4), R('#', 12), R(',', 4), R('=', 13), R('#', 3)),
  /* 21 */ row(R('#', 3), R('=', 13), R(',', 4), R('#', 12), R(',', 4), R('=', 13), R('#', 3)),
  // the second rank of piers, level with the middle of the stack
  /* 22 */ row(R('#', 3), R('=', 5), R('#', 2), R('=', 5), R('#', 2), R(',', 3), R('#', 12), R(',', 4), R('#', 2), R('=', 5), R('#', 2), R('=', 4), R('#', 3)),
  /* 23 */ row(R('#', 3), R('=', 5), R('#', 2), R('=', 5), R('#', 2), R(',', 3), R('#', 12), R(',', 4), R('#', 2), R('=', 5), R('#', 2), R('=', 4), R('#', 3)),
  /* 24 */ row(R('#', 3), R('=', 13), R(',', 4), R('#', 12), R(',', 4), R('=', 13), R('#', 3)),
  /* 25 */ row(R('#', 3), R('=', 13), R(',', 4), R('#', 12), R(',', 4), R('=', 13), R('#', 3)),
  /* 26 */ row(R('#', 3), R('=', 13), R(',', 5), R('#', 10), R(',', 5), R('=', 13), R('#', 3)),
  /* 27 */ row(R('#', 3), R('=', 13), R(',', 6), R('#', 8), R(',', 6), R('=', 13), R('#', 3)),
  /* 28 */ row(R('#', 3), R('=', 13), R(',', 7), R('#', 6), R(',', 7), R('=', 13), R('#', 3)),
  // --- out of the stack's shadow again -------------------------------------
  /* 29 */ row(R('#', 3), R('=', 13), R(',', 20), R('=', 13), R('#', 3)),
  /* 30 */ row(R('#', 3), R('=', 13), R(',', 20), R('=', 13), R('#', 3)),
  /* 31 */ row(R('#', 3), R('=', 13), R(',', 20), R('=', 13), R('#', 3)),
  /* 32 */ row(R('#', 3), R('=', 13), R(',', 20), R('=', 13), R('#', 3)),
  /* 33 */ row(R('#', 3), R('=', 46), R('#', 3)),
  /* 34 */ row(R('#', 3), R('=', 46), R('#', 3)),
  /* 35 */ row(R('#', 3), R('=', 46), R('#', 3)),
  // the third rank of piers
  /* 36 */ row(R('#', 3), R('=', 5), R('#', 2), R('=', 5), R('#', 2), R('=', 19), R('#', 2), R('=', 5), R('#', 2), R('=', 4), R('#', 3)),
  /* 37 */ row(R('#', 3), R('=', 5), R('#', 2), R('=', 5), R('#', 2), R('=', 19), R('#', 2), R('=', 5), R('#', 2), R('=', 4), R('#', 3)),
  /* 38 */ row(R('#', 3), R('=', 46), R('#', 3)),
  /* 39 */ row(R('#', 3), R('=', 46), R('#', 3)),
  /* 40 */ row(R('#', 3), R('=', 46), R('#', 3)),
  /* 41 */ row(R('#', 3), R('=', 46), R('#', 3)),
  /* 42 */ row(R('#', 3), R('=', 46), R('#', 3)),
  // --- the stoke door -------------------------------------------------------
  /* 43 */ row(R('#', 24), R('=', 4), R('#', 24)),
  /* 44 */ row(R('#', 24), R('=', 4), R('#', 24)),
  /* 45 */ row(R('#', 24), R('=', 4), R('#', 24)),
];

export const KINGSPYRE = {
  id: 'kingspyre',
  name: 'The Kingspyre',
  subtitle: 'One Room, One Stack',
  kind: 'dungeon',
  light: 'ruin',
  grade: 'ruin',
  fog: ['#3a2a22', 28, 130],
  tilt: 0.30,
  cameraDistance: 19,
  cameraPitch: 0.76,
  music: 'imperium',
  base: 'cobble',
  groundRamp: 'terrain',
  // Very tall, because the stack has to read as a chimney rather than a block,
  // and because the hall needs a ceiling the player never sees the top of.
  wallHeight: 20,
  wallMaterial: 'brick',
  lampIntensity: 8,
  lampRange: 16,
  sky: null,

  terrain: TERRAIN,

  spawns: {
    default: { at: [26, 43], face: 'north' },
    world: { at: [26, 43], face: 'north' },
  },

  exits: [
    { at: [24, 45], size: [4, 1], to: 'overworld', spawn: 'kingspyre',
      prompt: 'Leave by the stoke door' },
  ],

  // Nothing in a single room can be walked into without being walked into on
  // the way to something else, so the hall's one scripted thing sits on the
  // stoke mouth and is examined.
  triggers: [],

  /**
   * The hall is the deep end of the glass country, so it names that region's
   * two tables instead of keeping a copy of them: the floor south of the stack
   * rolls the reach, the floor north of it rolls the deep. The two flanks of
   * the stack — the blind walk, which is the only part of this map that is
   * about anything — keep the mixed table below, so the fight the player is
   * least able to see coming is the one they cannot predict the shape of.
   */
  encounterZones: [
    { rect: [0, 0, 52, 17], table: 'glass_reach_deep' },  // the dais end
    { rect: [0, 29, 52, 12], table: 'glass_reach' },      // the door end
  ],

  // A short fuse. The hall is one open crossing and there is nowhere in it to
  // break off an approach, so the walk has to cost something.
  encounters: {
    rate: 20, terrain: 'cobble', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['kilnwidow', 'slagcolt'] },
      { weight: 24, enemies: ['refractor', 'refractor', 'fulgurite'] },
      { weight: 20, enemies: ['panewalker', 'silveredmonk'] },
      { weight: 18, enemies: ['glasswort', 'kilnwidow'] },
      { weight: 12, enemies: ['panewalker', 'prismwing', 'mirrorhusk'] },
    ],
  },

  props: [
    // --- the stoke door ------------------------------------------------------
    { kit: 'savepoint', at: [26, 41], id: 'kp-save-1', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'signpost', at: [23.4, 41.4], id: 'kp-door-board',
      interact: { name: 'Stoking Board', text: [
        'A board by the door, ruled for a shift of eleven men.',
        'NEVER LESS THAN FOUR ON THE FLOOR AND NEVER ONE ON THE FLOOR ALONE.',
        'UNDER NO CIRCUMSTANCES GO ROUND THE STACK TO FETCH A MAN BACK.',
      ] } },
    { kit: 'lamppost', at: [20, 39] },
    { kit: 'lamppost', at: [32, 39] },
    { kit: 'cart', at: [29.5, 38.5], rot: 1.3 },

    // --- the south of the hall, and the third rank of piers -------------------
    { kit: 'lamppost', at: [10.5, 37.5] },
    { kit: 'lamppost', at: [41.5, 37.5] },
    { kit: 'chest', at: [7.0, 38.5], id: 'kp-chest-1',
      contains: { kind: 'item', id: 'pyreflask', count: 4, label: '4 Pyre Flasks' } },
    { kit: 'chest', at: [45.0, 38.5], id: 'kp-chest-2',
      contains: { kind: 'item', id: 'emberward', count: 1, label: 'an Ember Ward' } },
    { kit: 'rock', at: [14.0, 34.5], scale: 1.5, seed: 3 },
    { kit: 'rock', at: [38.0, 34.5], scale: 1.4, seed: 5 },

    // --- the ash, south face --------------------------------------------------
    { kit: 'lamppost', at: [17, 31] },
    { kit: 'lamppost', at: [34, 31] },
    // The stack is the dungeon and the mouth is the way into it. What is still
    // firing in there has not been fed in sixty years. The board beside it
    // keeps the description of the door.
    { kit: 'well', at: [25.5, 30.5], id: 'kp-mouth', radius: 1.1, interactRadius: 2.6,
      interact: { prompt: 'The Stoke Mouth', event: 'theannealer' } },
    { kit: 'signpost', at: [23.5, 32.5], id: 'kp-mouth-board',
      interact: { name: 'The Stoke Mouth', text: [
        'An iron door in the foot of the stack, big enough to walk into upright.',
        'It is shut. It is also warm, and the ash in front of it has been swept',
        'flat by something coming out and going back in.',
      ] } },
    { kit: 'barrel', at: [21.4, 31.6] },
    { kit: 'crate', at: [29.6, 31.4], rot: 0.6 },

    // --- the two flanks of the stack: the blind walk --------------------------
    { kit: 'savepoint', at: [18.5, 22.5], id: 'kp-save-2', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'chest', at: [33.5, 22.5], id: 'kp-chest-3',
      contains: { kind: 'item', id: 'kilnwraps', count: 1, label: 'a pair of Kiln Wraps' } },
    { kit: 'lamppost', at: [12.5, 22.5] },
    { kit: 'lamppost', at: [39.5, 22.5] },
    { kit: 'rock', at: [17.5, 16.0], scale: 1.2, seed: 7 },
    { kit: 'rock', at: [34.0, 29.0], scale: 1.3, seed: 9 },
    // In the ash on the blind flank of the stack — the middle of the room,
    // which is where the King's Pyre is recorded as being and also the problem.
    { kit: 'chest', at: [34.5, 20.5], id: 'kp-chest-9',
      contains: { kind: 'esper', id: 'thekingspyre', count: 1, label: 'a shard of magicite' } },

    // --- the ash, north face --------------------------------------------------
    { kit: 'lamppost', at: [17, 14] },
    { kit: 'lamppost', at: [34, 14] },
    { kit: 'chest', at: [20.5, 14.5], id: 'kp-chest-4',
      contains: { kind: 'item', id: 'cinderheart', count: 1, label: 'a Cinder Heart' } },
    { kit: 'chest', at: [31.5, 14.5], id: 'kp-chest-5',
      contains: { kind: 'item', id: 'temperedash', count: 1, label: 'a Tempered Ash' } },
    { kit: 'crate', at: [24.4, 12.6], rot: 0.2 },

    // --- the north of the hall, and the dais ----------------------------------
    { kit: 'savepoint', at: [25.5, 11.0], id: 'kp-save-3', radius: 0,
      interact: { save: true, prompt: 'Rest & Save' } },
    { kit: 'lamppost', at: [10.5, 8.5] },
    { kit: 'lamppost', at: [41.5, 8.5] },
    { kit: 'chest', at: [6.5, 6.5], id: 'kp-chest-6',
      contains: { kind: 'item', id: 'cinderbrand', count: 1, label: 'the Cinderbrand' } },
    { kit: 'chest', at: [45.5, 6.5], id: 'kp-chest-7',
      contains: { kind: 'item', id: 'enginecrown', count: 1, label: 'an Engine Crown' } },
    // On the dais, where whoever stood here stood to watch the fire. A blade
    // folded four hundred times belongs in front of the thing that folded it.
    { kit: 'chest', at: [31.5, 6.5], id: 'kp-chest-8',
      contains: { kind: 'item', id: 'thelastfold', count: 1, label: 'the Last Fold' } },
    { kit: 'signpost', at: [19.4, 6.6], id: 'kp-dais-post',
      interact: { name: 'Dais Rail', text: [
        'A brass rail around a floor of dressed marble, facing the stack.',
        'Whoever stood here stood to watch the fire, not the door.',
      ] } },
    // The stoking board, ruled for a shift of eleven, and the instruction under
    // it about going round the back of the stack.
    { kit: 'signpost', at: [23.4, 6.6], id: 'kp-stokeboard',
      interact: { prompt: 'The stoking board', event: 'kingspyre_relight' } },
    { kit: 'lamppost', at: [22, 5] },
    { kit: 'lamppost', at: [29, 5] },
  ],

  npcs: [],
};
