// Every playable location belongs to the authored Warm Earth campaign.
// Rectangles are tile coordinates; architecture and collision share this grid.
function grid(w, h, fill, rectangles = [], border = '#') {
  const cells = Array.from({ length: h }, (_, z) => Array.from({ length: w }, (_, x) => x === 0 || z === 0 || x === w - 1 || z === h - 1 ? border : fill));
  for (const [x, z, width, height, glyph] of rectangles) for (let y = z; y < z + height; y++) for (let a = x; a < x + width; a++) cells[y][a] = glyph;
  return cells.map(row => row.join(''));
}
const prop = (kit, id, at, extra = {}) => ({ kit, id, at, ...extra });
const mark = (at) => prop('savepoint', 'aether-mark', at, { interact: { save: true, prompt: 'Rest & save at the aether mark' } });
const event = (kit, id, at, prompt, extra = {}) => prop(kit, id, at, { event: id, interact: { prompt }, ...extra });
const chest = (id, at, item, count = 1) => prop('chest', id, at, { contains: { kind: 'item', id: item, count } });
const sign = (id, at, text) => prop('signpost', id, at, { interact: { name: 'Waymark', prompt: 'Read waymark', text } });
const npc = (id, name, at, extra = {}) => ({ id, name, at, face: 'south', ...extra });
const house = (id, at, enter, style = 'plaster') => prop('building', id, at, { w: 7, d: 5, h: 3, style, door: 'south', ...(enter ? { enter, enterPrompt: 'Enter the inn' } : {}) });
const trees = (points) => points.map((at, i) => prop('tree', `tree-${i}`, at));
const exits = (w, h, north, south, northExtra = {}, southExtra = {}) => [
  ...(north ? [{ at: [Math.floor(w / 2) - 1, 0], size: [3, 1], to: north, spawn: 'south', ...northExtra }] : []),
  ...(south ? [{ at: [Math.floor(w / 2) - 1, h - 1], size: [3, 1], to: south, spawn: 'north', ...southExtra }] : []),
];
function area(id, name, kind, w, h, fill, rects, extra = {}) {
  return { id, name, kind, subtitle: '', base: ({ '.': 'grass', C: 'cave', G: 'magitek', '*': 'snow', o: 'wood', A: 'aether' })[fill] ?? 'rock',
    terrain: grid(w, h, fill, rects), spawns: { default: { at: [Math.floor(w / 2) + .5, h - 3], face: 'north' }, south: { at: [Math.floor(w / 2) + .5, h - 3], face: 'north' }, north: { at: [Math.floor(w / 2) + .5, 3], face: 'south' } },
    props: [], npcs: [], exits: [], music: 'overworld', light: 'day', wallHeight: 2, ...extra };
}
const path = (w, h, glyph = ',') => [[Math.floor(w / 2) - 1, 0, 3, h, glyph]];
const encounters = (...groups) => ({ rate: 30, groups: groups.map(enemies => ({ enemies, weight: 1 })) });

export const CAMPAIGN_MAPS = Object.fromEntries([
  area('harrowmere', 'Harrowmere', 'Town', 29, 27, '.', [...path(29, 27, '='), [4, 11, 21, 3, '=']], {
    subtitle: 'I · The earth beneath us', music: 'town_harrowmere', light: 'dusk',
    props: [mark([14.5, 22.8]), house('inn', [6, 7], 'harrow_inn'), house('forge', [23, 7]), house('home', [23, 20]),
      prop('well', 'well', [10, 13]), prop('stall', 'market', [22, 13]), prop('lamppost', 'lamp1', [12, 9]), prop('lamppost', 'lamp2', [17, 17]),
      chest('supplies', [6, 19], 'potion', 3), sign('road-sign', [17, 3], ['North: Silt Road and Fen Barrow. East at the crossroads: Solmere.', 'Aether marks restore everyone and record a safe return point.']), ...trees([[3, 3], [26, 3], [3, 23], [26, 24]])],
    npcs: [npc('elder', 'Elder Sabbath', [14.5, 8], { event: 'elder' }), npc('halloran', 'Halloran', [22, 10.5], { shop: 'harrow_arms', prompt: 'Trade' }),
      npc('marrow', 'Marrow', [22, 15], { shop: 'harrow_items', prompt: 'Trade' }), npc('mira', 'Mira', [7, 14], { talk: ['The water in the well was warm before dawn. Now the bell is ringing by itself.', 'Elder Sabbath is at the north end of the square. He asked for the three of you.'] })],
    exits: exits(29, 27, 'silt_road', null),
  }),
  area('harrow_inn', 'The Lantern & Reed', 'Interior', 15, 13, 'o', [[6, 12, 3, 1, 'o']], {
    subtitle: 'A room above the quiet river', music: 'inn', cameraDistance: 13,
    props: [prop('bench', 'table', [5, 5]), prop('barrel', 'barrel', [12, 3]), prop('lamppost', 'hearth', [3, 10])],
    npcs: [npc('innkeeper', 'Nella', [9, 4], { inn: { name: 'The Lantern & Reed', price: 60 } })],
    exits: [{ at: [6, 12], size: [3, 1], to: 'harrowmere', spawn: 'inn' }],
  }),
  area('silt_road', 'The Silt Road', 'Road', 33, 29, '.', [...path(33, 29), [16, 14, 17, 3, ','], [1, 8, 12, 3, '~'], [21, 21, 11, 3, '~']], {
    subtitle: 'Old stones point toward a buried bell', music: 'marsh',
    props: [sign('crossroads', [19, 18], ['North: Fen Barrow. East: Solmere. South: Harrowmere.', 'Marsh beasts dislike fire. Wick’s Prayer restores the whole standing party without spending MP.']),
      chest('road-tonics', [7, 18], 'tonic', 3), ...trees([[3, 3], [8, 4], [25, 5], [28, 10], [5, 24], [22, 26]])],
    spawns: { default: { at: [16.5, 26] }, south: { at: [16.5, 26] }, north: { at: [16.5, 3] }, east: { at: [29.5, 15.5], face: 'west' } },
    encounters: encounters(['fenrat', 'mireslug'], ['reedstalker']),
    exits: [...exits(33, 29, 'fen_hall', 'harrowmere', { requires: ['elder-briefing'], blocked: 'Speak with Elder Sabbath in Harrowmere before entering the surveyors’ excavation.' }),
      { at: [32, 14], size: [1, 3], to: 'solmere', spawn: 'south', requires: ['elder-return'], blocked: 'Ferran has closed the eastern road. First discover what lies beneath Fen Barrow, then report to Elder Sabbath.' }],
  }),
  area('fen_hall', 'Fen Barrow · Survey Camp', 'dungeon', 25, 23, 'X', [[10, 0, 5, 23, 'C'], [3, 4, 19, 6, 'C'], [3, 14, 19, 6, 'C']], {
    subtitle: 'A bell rings where no hands can reach', base: 'cave', music: 'cave', light: 'night',
    props: [mark([9, 18]), chest('camp-medicine', [19, 17], 'phoenixtear', 2), prop('crate', 'supply', [4, 15]),
      event('signpost', 'survey-notes', [5, 6], 'Read the abandoned survey'), sign('sluice-instructions', [17, 7], ['The lower barrow is flooded. Open the Reed sluice in the west gallery and the Stone sluice in the east.', 'Return here to the aether mark before entering the bell chamber.'])],
    encounters: encounters(['fenrat', 'fenrat'], ['mireslug']), exits: exits(25, 23, 'fen_cistern', 'silt_road'),
  }),
  area('fen_cistern', 'Fen Barrow · Two Sluices', 'dungeon', 31, 27, 'X', [[13, 0, 5, 27, 'C'], [3, 8, 25, 4, 'C'], [3, 5, 6, 15, 'C'], [22, 5, 6, 15, 'C'], [7, 18, 17, 4, 'C'], [10, 13, 3, 4, '~'], [18, 13, 3, 4, '~']], {
    subtitle: 'Reed to the west · Stone to the east', base: 'cave', music: 'dungeon', light: 'night',
    props: [event('well', 'sluice-reed', [5.5, 6.5], 'Open the Reed sluice'), event('well', 'sluice-stone', [25.5, 6.5], 'Open the Stone sluice'),
      chest('fen-weapon', [5, 17], 'reedblade'), chest('fen-balm', [25, 17], 'balm', 2),
      sign('water-gate', [18.5, 3.5], ['The bronze door is held shut by water pressure. Both sluices must be open.'])],
    encounters: encounters(['reedstalker', 'mireslug'], ['reedstalker', 'fenrat']),
    exits: exits(31, 27, 'fen_heart', 'fen_hall', { requires: ['sluice-reed', 'sluice-stone'], blocked: 'Water presses against the door. Open both gallery sluices: Reed in the west, Stone in the east.' }),
  }),
  area('fen_heart', 'Fen Barrow · The Root Bell', 'dungeon', 23, 23, 'C', [[10, 22, 3, 1, 'C']], {
    subtitle: 'Something has learned to answer', music: 'deepworks', light: 'night',
    props: [event('savepoint', 'root-bell', [11.5, 7], 'Approach the root-wrapped bell', { scale: 2 }), mark([7.5, 18]),
      prop('rock', 'rock1', [4, 5], { scale: 2 }), prop('rock', 'rock2', [19, 5], { scale: 2 })],
    exits: exits(23, 23, null, 'fen_cistern'),
  }),
  area('solmere', 'Solmere', 'City', 31, 29, '=', [...path(31, 29, '='), [4, 12, 23, 4, 'M']], {
    subtitle: 'II · The city that burns tomorrow', music: 'solmere',
    props: [house('sol-inn', [6, 7], 'sol_inn', 'stone'), house('works', [25, 7], null, 'brick'), house('hall', [6, 22], null, 'marble'),
      mark([12, 24]), prop('stall', 'supplies', [24, 17]), event('airshipmast', 'dock', [25, 24], 'Board the Vagrant Star'),
      sign('foundry-road', [18, 3], ['North: the Crown Foundry. East quay: the Vagrant Star.', 'The governor is waiting in the central square.']), prop('lamppost', 'light1', [10, 12]), prop('lamppost', 'light2', [20, 12])],
    npcs: [npc('aurelian', 'Aurelian', [15.5, 10], { event: 'aurelian', hideAfter: 'furnace-crown' }), npc('supply-master', 'Orra', [24, 19], { shop: 'solmere_items', prompt: 'Trade' }),
      npc('armourer', 'Tallis', [24, 10.5], { shop: 'solmere_arms', prompt: 'Trade' }), npc('worker', 'Foundry worker', [7, 14], { talk: ['We were told the furnaces would warm every home. Last night the pipes started carrying voices.', 'Corvin wore a Ferran uniform once. Let us hope he remembers who lives outside their walls.'] })],
    exits: exits(31, 29, 'foundry_entry', 'silt_road', { requires: ['foundry-mission'], blocked: 'The foundry is under guard. Speak with Aurelian in the square.' }, { spawn: 'east' }),
  }),
  area('sol_inn', 'The Brass Lantern', 'Interior', 17, 13, 'o', [[7, 12, 3, 1, 'o']], {
    subtitle: 'Even the city must sleep', music: 'inn', cameraDistance: 13,
    props: [prop('bench', 'table', [5, 5]), prop('barrel', 'barrel', [13, 4])],
    npcs: [npc('sol-host', 'Emmet', [9, 4], { inn: { name: 'The Brass Lantern', price: 120 } })],
    exits: [{ at: [7, 12], size: [3, 1], to: 'solmere', spawn: 'inn' }],
  }),
  area('foundry_entry', 'Crown Foundry · Intake', 'dungeon', 29, 25, 'X', [[12, 0, 5, 25, 'G'], [3, 14, 23, 7, 'G'], [3, 4, 9, 13, 'G'], [18, 4, 8, 13, 'G'], [6, 4, 17, 4, 'G']], {
    subtitle: 'First cool the furnace. Then stop its heart.', base: 'magitek', music: 'imperium',
    props: [mark([10, 19]), event('signpost', 'foundry-orders', [5, 16], 'Read Corvin’s old orders'),
      event('well', 'coolant', [6, 6], 'Open the blue coolant intake'), chest('foundry-shield', [23, 6], 'crownshield'), chest('foundry-medicine', [23, 18], 'hipotion', 4)],
    encounters: encounters(['ferran_scout', 'ferran_scout'], ['furnace_drone']),
    exits: exits(29, 25, 'foundry_furnace', 'solmere', { requires: ['coolant'], blocked: 'The passage is too hot. Open the blue coolant intake in the western pump room.' }),
  }),
  area('foundry_furnace', 'Crown Foundry · Pressure Hall', 'dungeon', 29, 27, 'X', [[12, 0, 5, 27, 'G'], [3, 16, 23, 6, 'G'], [3, 5, 7, 16, 'G'], [19, 5, 7, 16, 'G'], [6, 5, 17, 4, 'G']], {
    subtitle: 'Red exhaust · Brass governor · The safe order', base: 'magitek', music: 'deepworks',
    props: [event('well', 'exhaust', [5.5, 7], 'Release the red exhaust'), event('well', 'governor', [22.5, 7], 'Lock the brass governor'),
      chest('foundry-rod', [5, 18], 'dawnstaff'), chest('foundry-tonics', [23, 18], 'tonic', 4),
      sign('pressure-manual', [18, 22], ['Emergency shutdown: BLUE coolant, RED exhaust, BRASS governor. The governor resets if pressure has nowhere to go.'])],
    encounters: encounters(['furnace_drone', 'ferran_scout'], ['furnace_drone', 'furnace_drone']),
    exits: exits(29, 27, 'foundry_heart', 'foundry_entry', { requires: ['governor'], blocked: 'The turbine seals the door. Follow the shutdown order: coolant, exhaust, governor.' }),
  }),
  area('foundry_heart', 'Crown Foundry · The Furnace Crown', 'dungeon', 25, 23, 'G', [[11, 22, 3, 1, 'G']], {
    subtitle: 'No city should be built on stolen tomorrows', base: 'magitek', music: 'imperium',
    props: [event('savepoint', 'furnace-crown', [12.5, 6], 'Confront the Ferran Warden', { scale: 2.2 }), mark([8, 18]),
      prop('building', 'turbine-left', [4, 6], { w: 3, d: 8, h: 5, style: 'magitek' }), prop('building', 'turbine-right', [21, 6], { w: 3, d: 8, h: 5, style: 'magitek' })],
    exits: exits(25, 23, null, 'foundry_furnace'),
  }),
  area('airship_deck', 'The Vagrant Star', 'Airship', 17, 25, 'o', [], {
    subtitle: 'III · Beyond the last horizon', music: 'airship', wallHeight: .7,
    props: [mark([5, 19]), event('airshipmast', 'helm', [8.5, 5], 'Set course for the Crown of Dawn'),
      event('signpost', 'land', [12, 19], 'Return to the Solmere quay'), prop('barrel', 'stores', [3, 12]), prop('barrel', 'stores2', [14, 12])],
    npcs: [npc('osric', 'Captain Osric', [5, 8], { talk: ['I used to sell passage to people running from their mistakes. This is the first time I have flown straight toward one.', 'The summit aether mark will keep you safe. Stock up before you cross the sky bridge.'] })],
  }),
  area('sky_pass', 'Crown of Dawn · The Ascent', 'Mountain', 29, 29, '^', [[12, 0, 5, 9, '*'], [4, 6, 21, 5, '*'], [4, 8, 5, 15, '*'], [4, 19, 21, 5, '*'], [12, 21, 5, 8, '*'], [20, 9, 5, 14, '*']], {
    subtitle: 'The wind carries every unfinished song', base: 'snow', grade: 'snow', music: 'mountain',
    props: [mark([10, 22]), chest('sky-lance', [22, 12], 'skylance'), chest('sky-balm', [6, 8], 'balm', 4),
      sign('observatory-waymark', [18, 6], ['North: the old observatory. Follow the western switchback, or search the eastern ledge for the lost lancer’s cache.'])],
    encounters: encounters(['sky_revenant'], ['sky_revenant', 'furnace_drone']), exits: exits(29, 29, 'observatory', 'airship_deck'),
  }),
  area('observatory', 'The Long Look', 'dungeon', 25, 25, 'M', [...path(25, 25, 'M'), [4, 5, 5, 5, 'A'], [16, 5, 5, 5, 'A']], {
    subtitle: 'A promise held in the stars', music: 'esper', light: 'night',
    props: [event('signpost', 'star-chart', [6.5, 7], 'Read the last astronomer’s chart'), event('savepoint', 'resonator', [18.5, 7], 'Answer the resonator'),
      mark([8, 20]), chest('observatory-robes', [19, 19], 'starrobe')],
    exits: exits(25, 25, 'engine_bridge', 'sky_pass', { requires: ['resonator'], blocked: 'The bridge is folded into the aether. Read the astronomer’s chart, then answer the eastern resonator.' }),
  }),
  area('engine_bridge', 'The Unfinished Bridge', 'dungeon', 19, 27, ' ', [[7, 0, 5, 27, 'A'], [3, 8, 13, 11, 'A']], {
    subtitle: 'The Engine remembers its guardians', base: 'aether', music: 'ruins', light: 'night', wallHeight: .6,
    props: [event('savepoint', 'bridge-guardian', [9.5, 10], 'Face the oathbound sentinel', { scale: 1.7 }), chest('bridge-tears', [14, 16], 'phoenixtear', 3)],
    exits: exits(19, 27, 'engine_heart', 'observatory', { requires: ['bridge-guardian'], blocked: 'The sentinel holds the far gate. Face it in the centre of the bridge.' }),
  }),
  area('engine_heart', 'The First Engine', 'dungeon', 27, 27, 'A', [[12, 26, 3, 1, 'A']], {
    subtitle: 'One future, freely given', base: 'aether', music: 'memory', light: 'night',
    props: [event('savepoint', 'first-engine', [13.5, 8], 'Enter the heart of the First Engine', { scale: 2.8 }), mark([9, 22]),
      event('signpost', 'homeward', [18, 22], 'Follow the thread home')], exits: exits(27, 27, null, 'engine_bridge'),
  }),
].map(map => [map.id, map]));
CAMPAIGN_MAPS.harrowmere.spawns.inn = { at: [6, 10.5], face: 'south' };
CAMPAIGN_MAPS.solmere.spawns.inn = { at: [6, 10.5], face: 'south' };
CAMPAIGN_MAPS.solmere.spawns.dock = { at: [23, 24], face: 'west' };

// Scenery keeps its footprint in the same definitions used by collision.
for (const map of Object.values(CAMPAIGN_MAPS)) {
  map.wallHeight = map.kind === 'Interior' ? 1.4 : map.base === 'magitek' ? 1.55 : map.kind === 'Road' ? .7 : map.kind === 'Mountain' ? 2.2 : map.wallHeight;
  for (const prop of map.props) {
    if (prop.id === 'root-bell') prop.radius = 1.3;
    if (['first-engine', 'furnace-crown', 'resonator'].includes(prop.id)) prop.radius = 1.65;
    if (prop.id === 'bridge-guardian') { prop.enemy = 'enginewarden'; prop.radius = .95; }
    if (['turbine-left', 'turbine-right'].includes(prop.id)) { prop.kit = 'pipe'; prop.radius = .65; }
  }
  if (map.kind === 'Interior') map.props.push(
    prop('bed', 'bed-west', [3, 3.5], { radius: 1.4 }), prop('bed', 'bed-east', [map.terrain[0].length - 3, 7], { radius: 1.4 }),
    prop('table', 'common-table', [5, 8], { radius: 1.1 }));
}
CAMPAIGN_MAPS.airship_deck.terrain = Array.from({ length: 25 }, (_, z) => Array.from({ length: 17 }, (_, x) => {
  const inset = z < 5 ? (5 - z) * 2 : z > 20 ? (z - 20) * 2 : 1;
  return z > 0 && z < 24 && x >= inset && x < 17 - inset ? 'o' : ' ';
}).join(''));
