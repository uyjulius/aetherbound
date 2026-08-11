/**
 * Bestiary, part three — the mid-to-late game, Lv 25 to 80.
 *
 * Volume two established the principle: a region is a *difficulty band with an
 * identity*, and the identity is a lesson. This volume carries that past the
 * Ninth Well, where the sky is wrong and the map stops agreeing with itself.
 *
 * Seven regions, seven lessons, none of them repeated from volume two:
 *
 *   the Saltmarch       everything here drinks. Out-pace their sustain.
 *   the Glass Reach     they absorb. A blanket spell heals half the field.
 *   the Hollow Meridian they are counting. Kill them before the count lands.
 *   the Sunken Verge    formations with a spine. Choose the target, not the
 *                       nearest one.
 *   the Undermarch      polarity — half of them dodge steel, half shrug off
 *                       magic. Your best button is the wrong one twice a fight.
 *   the Aether Shelf    they take your MP, your buffs and your voice. Win on
 *                       the things that cost nothing.
 *   the Long Silence    no locks, no tricks, no mercy. Everything at once.
 *
 * Curve notes, because the numbers here are extrapolation rather than
 * invention. Party stats taper past level 40 (see `statAt`), so enemy offence
 * tapers with them — attack lands near 4.8x level and bends downward, magic
 * near 3x level for casters. Defence and magic defence *flatten* instead of
 * climbing: the SNES damage model divides by (255 - defence), so a defence of
 * 250 is not a hard fight, it is an unwinnable one. Past Lv 50 the load is
 * carried by hit points, which is the only lever that stays honest.
 *
 * Merged into ENEMIES/ENCOUNTERS by the core module, same as volume two.
 */

export const VOL3_ENEMIES = {
  // ======================= the Saltmarch (Lv 26-34) =======================
  /**
   * Salt pans east of the Drowned Coast, worked until the ground gave up.
   * Everything that survives out here has learned to take its water from
   * something that is carrying some, so the whole region is a sustain race:
   * the player's damage against the enemy's drain. Potions do not solve it —
   * killing things faster does, and so does silencing the ones that chant.
   */
  panleech: {
    id: 'panleech', name: 'Pan Leech', level: 26,
    look: { plan: 'floater', scale: 0.75, color: '#357c8c', eyeColor: '#96f0f5', eyeCount: 1, tendrils: true },
    stats: { hp: 780, mp: 260, atk: 96, def: 118, mag: 106, mdef: 150, spd: 46, eva: 32, lck: 24 },
    affinity: { water: 'absorb', bolt: 'weak', poison: 'resist' },
    exp: 450, gold: 420, drops: [{ id: 'hitonic', chance: 0.2 }],
    steal: [{ id: 'tonic', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'leech' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  brinehusk: {
    id: 'brinehusk', name: 'Brine Husk', level: 27,
    look: { plan: 'undead', scale: 1.05, color: '#dedbe0', accent: '#37606f', weapon: 'spear', eyeColor: '#96f0f5' },
    stats: { hp: 1080, mp: 60, atk: 138, def: 168, mag: 52, mdef: 118, spd: 26, eva: 6, lck: 8 },
    affinity: { holy: 'weak', water: 'absorb', shadow: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom'],
    exp: 480, gold: 440, drops: [{ id: 'softstone', chance: 0.18 }],
    steal: [{ id: 'antidote', chance: 0.3 }],
    ai: [
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Draw Off', power: 1.3, drain: true } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  thirstmoth: {
    id: 'thirstmoth', name: 'Thirst Moth', level: 28,
    look: { plan: 'avian', scale: 0.7, color: '#c6cedb', accent: '#6fa9b4', eyeColor: '#f7d968' },
    stats: { hp: 900, mp: 140, atk: 118, def: 130, mag: 96, mdef: 152, spd: 58, eva: 38, lck: 26 },
    affinity: { fire: 'weak', wind: 'resist', water: 'absorb' },
    exp: 500, gold: 470, drops: [{ id: 'echoherb', chance: 0.2 }],
    steal: [{ id: 'clarity', chance: 0.22 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Drink Deep', power: 1.2, drain: true } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'hush' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  rakehand: {
    id: 'rakehand', name: 'Rakehand', level: 28,
    look: { plan: 'construct', scale: 0.9, color: '#8d7c4a', accent: '#3b2c12', eyeColor: '#ffd76a', treads: true },
    stats: { hp: 1320, mp: 60, atk: 142, def: 190, mag: 44, mdef: 132, spd: 22, eva: 2, lck: 4 },
    affinity: { bolt: 'weak', water: 'weak', earth: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'charm'],
    exp: 520, gold: 620, drops: [{ id: 'shrapnel', chance: 0.2 }],
    steal: [{ id: 'ironbrooch', chance: 0.1 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Windrow', power: 1.4, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  saltferryman: {
    id: 'saltferryman', name: 'Salt Ferryman', level: 29,
    look: { plan: 'humanoid', scale: 1.05, color: '#96603f', accent: '#1a3c48', weapon: 'staff', eyeColor: '#96f0f5' },
    stats: { hp: 1180, mp: 200, atk: 122, def: 158, mag: 118, mdef: 168, spd: 38, eva: 16, lck: 22 },
    affinity: { bolt: 'weak', water: 'absorb', ice: 'resist' },
    exp: 560, gold: 700, drops: [{ id: 'hitonic', chance: 0.2 }],
    steal: [{ id: 'silkrobe', chance: 0.08 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'sap' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'brine', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  weirmaw: {
    id: 'weirmaw', name: 'Weir Maw', level: 30,
    look: { plan: 'blob', scale: 1.35, color: '#4d8493', accent: '#1a3c48', eyeColor: '#dbc891', eyeCount: 3 },
    stats: { hp: 1560, mp: 80, atk: 150, def: 148, mag: 70, mdef: 130, spd: 18, eva: 2, lck: 8 },
    affinity: { fire: 'weak', water: 'absorb', physical: 'resist', poison: 'immune' },
    immune: ['poison', 'venom', 'ko'],
    exp: 600, gold: 560, drops: [{ id: 'xpotion', chance: 0.12 }],
    steal: [{ id: 'antidote', chance: 0.35 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: 'Swallow The Weir', power: 1.6, drain: true } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Sour Wash', power: 1.1, status: { venom: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  saltdrinker: {
    id: 'saltdrinker', name: 'Salt Drinker', level: 31,
    look: { plan: 'quadruped', scale: 1.0, color: '#a2acbb', accent: '#4d422a', eyeColor: '#ff7a2f', spines: true },
    stats: { hp: 1500, mp: 20, atk: 172, def: 172, mag: 30, mdef: 120, spd: 54, eva: 22, lck: 18 },
    affinity: { water: 'resist', ice: 'weak' },
    exp: 620, gold: 580, drops: [{ id: 'hipotion', chance: 0.2 }],
    steal: [{ id: 'potion', chance: 0.35 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Run The Pans', power: 1.8 } },
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Lap It Up', power: 1.1, drain: true } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  crustcrab: {
    id: 'crustcrab', name: 'Crust Crab', level: 32,
    look: { plan: 'insect', scale: 1.2, legs: 8, color: '#dedbe0', accent: '#8d7c4a', eyeColor: '#ffd76a', stinger: false },
    stats: { hp: 1900, mp: 40, atk: 168, def: 205, mag: 40, mdef: 128, spd: 20, eva: 4, lck: 10 },
    affinity: { bolt: 'weak', earth: 'resist', physical: 'resist' },
    exp: 660, gold: 640, drops: [{ id: 'towershield', chance: 0.08 }],
    steal: [{ id: 'softstone', chance: 0.25 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Clamp', power: 1.3, status: { paralysis: 40 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  tallykeeper: {
    id: 'tallykeeper', name: 'Tally Keeper', level: 33,
    look: { plan: 'humanoid', scale: 1.0, color: '#ac744c', accent: '#4a4324', weapon: 'staff', eyeColor: '#f7d968' },
    stats: { hp: 1780, mp: 220, atk: 158, def: 180, mag: 132, mdef: 178, spd: 40, eva: 18, lck: 30 },
    affinity: { water: 'absorb', holy: 'weak' },
    exp: 700, gold: 900, drops: [{ id: 'quillbrush', chance: 0.08 }],
    steal: [{ id: 'focusring', chance: 0.1 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'knell' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'mire' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  sumpwidow: {
    id: 'sumpwidow', name: 'Sump Widow', level: 34,
    look: { plan: 'insect', scale: 1.15, legs: 8, color: '#37606f', accent: '#94bf55', eyeColor: '#e0574f', stinger: true },
    stats: { hp: 2050, mp: 120, atk: 182, def: 186, mag: 88, mdef: 150, spd: 46, eva: 24, lck: 20 },
    affinity: { fire: 'weak', water: 'absorb', poison: 'immune' },
    immune: ['poison', 'venom', 'blind'],
    exp: 760, gold: 820, drops: [{ id: 'panacea', chance: 0.14 }],
    steal: [{ id: 'wardingcord', chance: 0.05 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: "Widow's Draught", power: 1.7, drain: true } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Brine Sting', power: 1.2, status: { venom: 55 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Glass Reach (Lv 33-42) =====================
  /**
   * Where the Cinderspine's lightning has been striking the same sand for nine
   * hundred years. The ground is fulgurite; so, increasingly, is the wildlife.
   *
   * Every creature in the Reach absorbs exactly one element and attacks with
   * it, and the encounter tables deliberately pair opposites. The lesson is
   * the one blanket magic never teaches on its own: a Conflagrate into the
   * wrong formation is a full heal for half of it. Scan, or fight single
   * target, or put the sword away and use the other sword.
   */
  prismwing: {
    id: 'prismwing', name: 'Prism Wing', level: 33,
    look: { plan: 'avian', scale: 0.8, color: '#e8edf5', accent: '#9ccdd4', eyeColor: '#fff3b8' },
    stats: { hp: 1720, mp: 160, atk: 156, def: 166, mag: 128, mdef: 172, spd: 62, eva: 40, lck: 28 },
    affinity: { holy: 'absorb', shadow: 'weak', wind: 'resist' },
    exp: 700, gold: 760, drops: [{ id: 'hitonic', chance: 0.18 }],
    steal: [{ id: 'echoherb', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'sanctus' } },
      { if: 'always', do: { kind: 'attack', name: 'Splitlight', power: 1.2, element: 'holy' } },
    ],
  },
  fulgurite: {
    id: 'fulgurite', name: 'Fulgurite Walker', level: 34,
    look: { plan: 'construct', scale: 1.0, color: '#b8b6bd', accent: '#4a3308', eyeColor: '#f7d968' },
    stats: { hp: 2150, mp: 100, atk: 176, def: 200, mag: 96, mdef: 158, spd: 26, eva: 2, lck: 6 },
    affinity: { bolt: 'absorb', water: 'weak', earth: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind'],
    exp: 760, gold: 940, drops: [{ id: 'stormflask', chance: 0.2 }],
    steal: [{ id: 'shrapnel', chance: 0.25 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Strike Twice', power: 1.5, element: 'bolt' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  mirrorhusk: {
    id: 'mirrorhusk', name: 'Mirror Husk', level: 35,
    look: { plan: 'undead', scale: 1.1, color: '#a2acbb', accent: '#2c1b4d', weapon: 'sword', eyeColor: '#d63fb3' },
    stats: { hp: 2060, mp: 140, atk: 180, def: 192, mag: 112, mdef: 168, spd: 34, eva: 10, lck: 12 },
    affinity: { shadow: 'absorb', holy: 'weak', fire: 'resist' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko'],
    exp: 800, gold: 880, drops: [{ id: 'softstone', chance: 0.2 }],
    steal: [{ id: 'ashenkatana', chance: 0.06 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'always', do: { kind: 'attack', name: 'Backhand', power: 1.3, element: 'shadow' } },
    ],
  },
  shardswarm: {
    id: 'shardswarm', name: 'Shard Swarm', level: 35,
    look: { plan: 'insect', scale: 0.85, legs: 6, color: '#9ccdd4', accent: '#e8edf5', eyeColor: '#96f0f5', stinger: true },
    stats: { hp: 1880, mp: 60, atk: 172, def: 178, mag: 78, mdef: 148, spd: 56, eva: 34, lck: 18 },
    affinity: { wind: 'absorb', earth: 'weak', ice: 'resist' },
    exp: 790, gold: 840, drops: [{ id: 'hipotion', chance: 0.22 }],
    steal: [{ id: 'swiftband', chance: 0.05 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Scour', power: 1.3, element: 'wind', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  glasswort: {
    id: 'glasswort', name: 'Glasswort', level: 36,
    look: { plan: 'plant', scale: 1.1, color: '#8d7c4a', accent: '#9ccdd4', eyeColor: '#ffe45e' },
    stats: { hp: 2400, mp: 120, atk: 182, def: 202, mag: 124, mdef: 162, spd: 20, eva: 4, lck: 10 },
    affinity: { earth: 'absorb', wind: 'weak', water: 'resist', poison: 'immune' },
    immune: ['poison', 'blind', 'charm'],
    exp: 840, gold: 900, drops: [{ id: 'balm', chance: 0.18 }],
    steal: [{ id: 'panacea', chance: 0.1 }],
    ai: [
      { if: 'hpBelow', v: 0.45, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Splinter Fall', power: 1.4, element: 'earth', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  slagcolt: {
    id: 'slagcolt', name: 'Slag Colt', level: 37,
    look: { plan: 'quadruped', scale: 1.1, color: '#7d4436', accent: '#3a2226', eyeColor: '#ff7a2f', spines: true },
    stats: { hp: 2280, mp: 60, atk: 196, def: 188, mag: 92, mdef: 152, spd: 58, eva: 26, lck: 16 },
    affinity: { fire: 'absorb', water: 'weak', ice: 'weak' },
    exp: 880, gold: 940, drops: [{ id: 'emberflask', chance: 0.2 }],
    steal: [{ id: 'emberbrand', chance: 0.04 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: 'Run Molten', power: 1.9, element: 'fire' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  refractor: {
    id: 'refractor', name: 'The Refractor', level: 38,
    look: { plan: 'floater', scale: 0.9, color: '#12566b', eyeColor: '#3fc6d6', eyeCount: 2, tendrils: false },
    stats: { hp: 2140, mp: 340, atk: 158, def: 176, mag: 184, mdef: 206, spd: 52, eva: 32, lck: 30 },
    affinity: { aether: 'absorb', holy: 'weak', bolt: 'resist' },
    immune: ['blind', 'sleep'],
    exp: 920, gold: 1080, drops: [{ id: 'hitonic', chance: 0.24 }],
    steal: [{ id: 'focusring', chance: 0.1 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hollow' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  silveredmonk: {
    id: 'silveredmonk', name: 'Silvered Monk', level: 39,
    look: { plan: 'humanoid', scale: 1.05, color: '#c6cedb', accent: '#25404e', eyeColor: '#e8edf5' },
    stats: { hp: 2560, mp: 180, atk: 204, def: 196, mag: 138, mdef: 184, spd: 48, eva: 22, lck: 24 },
    affinity: { ice: 'absorb', fire: 'weak', water: 'resist' },
    immune: ['freeze', 'charm'],
    exp: 980, gold: 1120, drops: [{ id: 'frostflask', chance: 0.2 }],
    steal: [{ id: 'ironknuckles', chance: 0.12 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hoarfrost' } },
      { if: 'random', p: 0.2, do: { kind: 'attack', name: 'Still Palm', power: 1.5, element: 'ice', status: { freeze: 35 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  panewalker: {
    id: 'panewalker', name: 'Pane Walker', level: 40,
    look: { plan: 'construct', scale: 1.2, color: '#e8edf5', accent: '#5f6572', eyeColor: '#96f0f5', cannons: true },
    stats: { hp: 3000, mp: 160, atk: 208, def: 216, mag: 130, mdef: 178, spd: 28, eva: 2, lck: 6 },
    affinity: { bolt: 'absorb', water: 'weak', shadow: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stone'],
    exp: 1060, gold: 1300, drops: [{ id: 'mirrorshield', chance: 0.05 }],
    steal: [{ id: 'wardstone', chance: 0.16 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Shatterpane', power: 2.0, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'arcflash' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  kilnwidow: {
    id: 'kilnwidow', name: 'Kiln Widow', level: 41,
    look: { plan: 'insect', scale: 1.25, legs: 8, color: '#3a2226', accent: '#d8ac31', eyeColor: '#ff7a2f', stinger: true },
    stats: { hp: 2900, mp: 140, atk: 216, def: 200, mag: 126, mdef: 172, spd: 46, eva: 20, lck: 18 },
    affinity: { fire: 'absorb', ice: 'weak', earth: 'resist' },
    immune: ['freeze', 'poison'],
    exp: 1120, gold: 1240, drops: [{ id: 'xpotion', chance: 0.16 }],
    steal: [{ id: 'emberflask', chance: 0.3 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'spell', spell: 'conflagrate' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Anneal', power: 1.5, element: 'fire', status: { seizure: 40 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Hollow Meridian (Lv 40-50) =================
  /**
   * The line the broken world hangs from. Nothing here is in a hurry, because
   * nothing here believes the fight will last.
   *
   * Meridian creatures run *timers*: doom, stop, and scripts that build to a
   * detonation on a turn the player can count. Everything they do announces the
   * next thing they will do, which makes the whole region a race the player is
   * allowed to see the clock for — and losing it is therefore always the
   * player's own fault, which is the only kind of difficulty worth authoring.
   */
  hourhand: {
    id: 'hourhand', name: 'Hour Hand', level: 40,
    look: { plan: 'construct', scale: 1.05, color: '#ab8018', accent: '#4a4324', eyeColor: '#fff3b8' },
    stats: { hp: 2950, mp: 140, atk: 206, def: 212, mag: 122, mdef: 176, spd: 30, eva: 4, lck: 6 },
    affinity: { bolt: 'weak', aether: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'slow', 'stop'],
    exp: 1060, gold: 1280, drops: [{ id: 'swiftband', chance: 0.06 }],
    steal: [{ id: 'shrapnel', chance: 0.28 }],
    ai: [
      { if: 'turnIs', n: 6, do: { kind: 'attack', name: 'Strike The Hour', power: 2.2, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'mire' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  vespermoth: {
    id: 'vespermoth', name: 'Vesper Moth', level: 41,
    look: { plan: 'avian', scale: 0.75, color: '#4e4a52', accent: '#241636', eyeColor: '#d63fb3' },
    stats: { hp: 2620, mp: 200, atk: 194, def: 182, mag: 148, mdef: 186, spd: 66, eva: 42, lck: 30 },
    affinity: { holy: 'weak', shadow: 'absorb', wind: 'resist' },
    exp: 1120, gold: 1200, drops: [{ id: 'clarity', chance: 0.24 }],
    steal: [{ id: 'echoherb', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'lull', target: 'all' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'knell' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  deadreckoner: {
    id: 'deadreckoner', name: 'Dead Reckoner', level: 42,
    look: { plan: 'humanoid', scale: 1.05, color: '#918f98', accent: '#4a4324', weapon: 'staff', eyeColor: '#f7d968' },
    stats: { hp: 3050, mp: 220, atk: 212, def: 196, mag: 152, mdef: 182, spd: 44, eva: 18, lck: 26 },
    affinity: { aether: 'resist', shadow: 'resist', holy: 'weak' },
    exp: 1180, gold: 1400, drops: [{ id: 'hitonic', chance: 0.22 }],
    steal: [{ id: 'quietstep', chance: 0.05 }],
    ai: [
      { if: 'turnIs', n: 4, do: { kind: 'spell', spell: 'knell', target: 'all' } },
      { if: 'hpBelow', v: 0.4, do: { kind: 'spell', spell: 'halve' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  tollbriar: {
    id: 'tollbriar', name: 'Toll Briar', level: 43,
    look: { plan: 'plant', scale: 1.2, color: '#4b382d', accent: '#4a4324', eyeColor: '#e0574f' },
    stats: { hp: 3400, mp: 180, atk: 216, def: 208, mag: 144, mdef: 174, spd: 22, eva: 4, lck: 10 },
    affinity: { fire: 'weak', earth: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'charm', 'blind'],
    exp: 1240, gold: 1300, drops: [{ id: 'balm', chance: 0.2 }],
    steal: [{ id: 'panacea', chance: 0.14 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Arrears', power: 1.4, status: { stop: 45 }, target: 'all' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'blight', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  stoppedman: {
    id: 'stoppedman', name: 'The Stopped Man', level: 44,
    look: { plan: 'undead', scale: 1.15, color: '#ddccab', accent: '#2b2933', armored: true, eyeColor: '#3fc6d6' },
    stats: { hp: 3500, mp: 160, atk: 224, def: 214, mag: 138, mdef: 180, spd: 20, eva: 2, lck: 8 },
    affinity: { holy: 'weak', shadow: 'absorb', ice: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'stop', 'ko'],
    exp: 1300, gold: 1400, drops: [{ id: 'softstone', chance: 0.25 }],
    steal: [{ id: 'crownofsalt', chance: 0.04 }],
    ai: [
      { if: 'turnIs', n: 5, do: { kind: 'spell', spell: 'arrest', target: 'all' } },
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Catch Up', power: 2.1 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  latecomer: {
    id: 'latecomer', name: 'The Latecomer', level: 45,
    look: { plan: 'floater', scale: 1.0, color: '#2c1b4d', eyeColor: '#d63fb3', eyeCount: 3, tendrils: true },
    stats: { hp: 3200, mp: 380, atk: 190, def: 190, mag: 200, mdef: 214, spd: 56, eva: 34, lck: 32 },
    affinity: { shadow: 'absorb', holy: 'weak', aether: 'resist', physical: 'resist' },
    immune: ['ko', 'sleep', 'poison', 'stone'],
    exp: 1360, gold: 1560, drops: [{ id: 'phoenixtear', chance: 0.16 }],
    steal: [{ id: 'focusring', chance: 0.12 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  hushhound: {
    id: 'hushhound', name: 'Hush Hound', level: 46,
    look: { plan: 'quadruped', scale: 1.1, color: '#4e4a52', accent: '#22242a', eyeColor: '#dedbe0' },
    stats: { hp: 3600, mp: 60, atk: 244, def: 204, mag: 96, mdef: 168, spd: 62, eva: 28, lck: 20 },
    affinity: { shadow: 'resist', holy: 'weak' },
    exp: 1420, gold: 1500, drops: [{ id: 'echoherb', chance: 0.3 }],
    steal: [{ id: 'swiftband', chance: 0.08 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Nothing To Say', power: 2.0 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Throatcatch', power: 1.2, status: { silence: 60 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  quarterhusk: {
    id: 'quarterhusk', name: 'Quarter Husk', level: 47,
    look: { plan: 'undead', scale: 1.1, color: '#bda98b', accent: '#4a3308', weapon: 'axe', helmet: true, eyeColor: '#ffe45e' },
    stats: { hp: 3900, mp: 200, atk: 240, def: 218, mag: 156, mdef: 190, spd: 36, eva: 12, lck: 12 },
    affinity: { holy: 'weak', fire: 'weak', shadow: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko', 'stone'],
    exp: 1500, gold: 1600, drops: [{ id: 'ashenkatana', chance: 0.08 }],
    steal: [{ id: 'ironhelm', chance: 0.2 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'knell' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Quarter Chime', power: 1.5, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  noonwidow: {
    id: 'noonwidow', name: 'Noon Widow', level: 48,
    look: { plan: 'insect', scale: 1.2, legs: 8, color: '#4a4324', accent: '#ab8018', eyeColor: '#fff3b8', stinger: true },
    stats: { hp: 4050, mp: 180, atk: 248, def: 212, mag: 160, mdef: 186, spd: 50, eva: 24, lck: 20 },
    affinity: { fire: 'resist', ice: 'weak', holy: 'absorb' },
    immune: ['poison', 'venom', 'blind'],
    exp: 1580, gold: 1700, drops: [{ id: 'panacea', chance: 0.2 }],
    steal: [{ id: 'wardingcord', chance: 0.08 }],
    ai: [
      { if: 'turnIs', n: 7, do: { kind: 'attack', name: 'Full Noon', power: 2.4, element: 'holy', target: 'all' } },
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Second Sting', power: 1.3, status: { seizure: 50 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  lastbell: {
    id: 'lastbell', name: 'Last Bell', level: 50,
    look: { plan: 'construct', scale: 1.3, color: '#8a6a23', accent: '#3b2c12', eyeColor: '#ffd76a', cannons: true },
    stats: { hp: 4600, mp: 240, atk: 252, def: 214, mag: 172, mdef: 200, spd: 30, eva: 4, lck: 8 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stop', 'ko'],
    exp: 1740, gold: 2000, drops: [{ id: 'lanternstaff', chance: 0.1 }],
    steal: [{ id: 'wardstone', chance: 0.24 }],
    ai: [
      { if: 'turnIs', n: 8, do: { kind: 'attack', name: 'Toll For Nobody', power: 2.6, target: 'all' } },
      { if: 'hpBelow', v: 0.3, do: { kind: 'spell', spell: 'arrest', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Clapper', power: 1.5 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Sunken Verge (Lv 46-56) ====================
  /**
   * The rim of the Well, still garrisoned by people who were told to hold it
   * and were never told anything else.
   *
   * The Verge fights in *formations with a spine*. Standards and cantors are
   * fragile and sit behind something that is not; the shells are almost inert
   * bait with defence the player cannot chew through in the time the rest of
   * the rank needs. Almost everything here escalates on `allyDown`, so killing
   * the wrong thing first is punished immediately and legibly. The lesson is
   * target priority, which no amount of raw damage substitutes for.
   */
  vergestandard: {
    id: 'vergestandard', name: 'Verge Standard-Bearer', level: 46,
    look: { plan: 'humanoid', scale: 1.05, color: '#96603f', accent: '#25404e', metal: '#666c74', weapon: 'spear', eyeColor: '#ffd76a' },
    stats: { hp: 3550, mp: 200, atk: 234, def: 202, mag: 148, mdef: 180, spd: 42, eva: 16, lck: 22 },
    affinity: { water: 'resist', bolt: 'weak' },
    exp: 1420, gold: 1560, drops: [{ id: 'longspear', chance: 0.1 }],
    steal: [{ id: 'ironbrooch', chance: 0.2 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Close The Line', power: 1.9, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Colours Up', power: 1.4 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  chorister: {
    id: 'chorister', name: 'The Chorister', level: 47,
    look: { plan: 'undead', scale: 1.0, color: '#c6cedb', accent: '#12566b', weapon: 'staff', eyeColor: '#96f0f5' },
    stats: { hp: 3450, mp: 300, atk: 218, def: 198, mag: 186, mdef: 202, spd: 38, eva: 14, lck: 18 },
    affinity: { holy: 'weak', water: 'absorb', shadow: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'silence', 'doom'],
    exp: 1480, gold: 1620, drops: [{ id: 'hitonic', chance: 0.26 }],
    steal: [{ id: 'silkrobe', chance: 0.12 }],
    ai: [
      { if: 'allyDown', do: { kind: 'spell', spell: 'unlight' } },
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'brine', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  bulwarkshell: {
    id: 'bulwarkshell', name: 'Bulwark Shell', level: 48,
    look: { plan: 'insect', scale: 1.45, legs: 6, color: '#5b6674', accent: '#25404e', eyeColor: '#ffd76a', stinger: false },
    stats: { hp: 4600, mp: 40, atk: 210, def: 218, mag: 90, mdef: 160, spd: 16, eva: 2, lck: 8 },
    affinity: { bolt: 'weak', water: 'absorb', physical: 'resist', earth: 'resist' },
    immune: ['stop', 'slow', 'charm'],
    exp: 1560, gold: 1500, drops: [{ id: 'towershield', chance: 0.12 }],
    steal: [{ id: 'guardplate', chance: 0.06 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Set Against', power: 1.3, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  vergepike: {
    id: 'vergepike', name: 'Verge Pikeman', level: 49,
    look: { plan: 'humanoid', scale: 1.1, color: '#ac744c', accent: '#1a3c48', metal: '#5b6674', weapon: 'spear', armored: true, eyeColor: '#e0574f' },
    stats: { hp: 3900, mp: 140, atk: 250, def: 206, mag: 130, mdef: 178, spd: 46, eva: 20, lck: 18 },
    affinity: { bolt: 'weak', water: 'resist' },
    exp: 1620, gold: 1720, drops: [{ id: 'longspear', chance: 0.12 }],
    steal: [{ id: 'hipotion', chance: 0.35 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Step Into It', power: 2.0 } },
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Hamstring', power: 1.1, status: { slow: 55 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  stonelayer: {
    id: 'stonelayer', name: 'Stone Layer', level: 50,
    look: { plan: 'construct', scale: 1.25, color: '#a6b0bc', accent: '#2b3038', eyeColor: '#3fc6d6', treads: true },
    stats: { hp: 4500, mp: 180, atk: 246, def: 216, mag: 150, mdef: 190, spd: 26, eva: 2, lck: 6 },
    affinity: { bolt: 'weak', earth: 'absorb', poison: 'immune', shadow: 'resist' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stone'],
    exp: 1720, gold: 1900, drops: [{ id: 'guardplate', chance: 0.08 }],
    steal: [{ id: 'shrapnel', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'ossify' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  deepcantor: {
    id: 'deepcantor', name: 'Deep Cantor', level: 51,
    look: { plan: 'floater', scale: 0.95, color: '#12566b', eyeColor: '#96f0f5', eyeCount: 2, tendrils: true },
    stats: { hp: 4100, mp: 420, atk: 208, def: 196, mag: 216, mdef: 214, spd: 54, eva: 32, lck: 30 },
    affinity: { water: 'absorb', bolt: 'weak', aether: 'resist' },
    immune: ['ko', 'sleep', 'poison', 'silence'],
    exp: 1800, gold: 2000, drops: [{ id: 'hitonic', chance: 0.3 }],
    steal: [{ id: 'aetherweave', chance: 0.03 }],
    ai: [
      { if: 'allyDown', do: { kind: 'spell', spell: 'benediction' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'sap' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  vergeknight: {
    id: 'vergeknight', name: 'Knight of the Verge', level: 52,
    look: { plan: 'undead', scale: 1.25, color: '#a2acbb', accent: '#1a3c48', weapon: 'sword', armored: true, helmet: true, eyeColor: '#3fc6d6' },
    stats: { hp: 4800, mp: 200, atk: 268, def: 214, mag: 152, mdef: 192, spd: 44, eva: 14, lck: 14 },
    affinity: { holy: 'weak', water: 'absorb', shadow: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'ko', 'stone', 'doom'],
    exp: 1880, gold: 2050, drops: [{ id: 'wardenmail', chance: 0.04 }],
    steal: [{ id: 'ashenkatana', chance: 0.14 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Held To The Last', power: 2.2 } },
      { if: 'allyDown', do: { kind: 'attack', name: 'Dress The Rank', power: 1.7, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  hollowherald: {
    id: 'hollowherald', name: 'Hollow Herald', level: 53,
    look: { plan: 'humanoid', scale: 1.1, color: '#918f98', accent: '#2c1b4d', metal: '#d8ac31', weapon: 'staff', eyeColor: '#d63fb3' },
    stats: { hp: 4700, mp: 340, atk: 252, def: 208, mag: 196, mdef: 200, spd: 48, eva: 20, lck: 26 },
    affinity: { shadow: 'absorb', holy: 'weak', aether: 'resist' },
    immune: ['silence', 'confuse', 'charm'],
    exp: 1960, gold: 2200, drops: [{ id: 'scholarhood', chance: 0.14 }],
    steal: [{ id: 'focusring', chance: 0.16 }],
    ai: [
      { if: 'allyDown', do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hush', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  rimhound: {
    id: 'rimhound', name: 'Rim Hound', level: 54,
    look: { plan: 'quadruped', scale: 1.15, color: '#37606f', accent: '#16241d', eyeColor: '#96f0f5', spines: true },
    stats: { hp: 5000, mp: 80, atk: 282, def: 206, mag: 110, mdef: 176, spd: 64, eva: 30, lck: 22 },
    affinity: { water: 'resist', bolt: 'weak', ice: 'resist' },
    exp: 2050, gold: 2150, drops: [{ id: 'xpotion', chance: 0.2 }],
    steal: [{ id: 'swiftband', chance: 0.12 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Off The Leash', power: 2.1 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  keelworm: {
    id: 'keelworm', name: 'Keel Worm', level: 56,
    look: { plan: 'blob', scale: 1.6, color: '#25404e', accent: '#12566b', eyeColor: '#e0574f', eyeCount: 3 },
    stats: { hp: 5900, mp: 160, atk: 286, def: 200, mag: 168, mdef: 188, spd: 22, eva: 2, lck: 10 },
    affinity: { water: 'absorb', bolt: 'weak', physical: 'resist', poison: 'immune' },
    immune: ['poison', 'venom', 'ko', 'stop'],
    exp: 2250, gold: 2400, drops: [{ id: 'xpotion', chance: 0.24 }],
    steal: [{ id: 'panacea', chance: 0.2 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Take The Rank', power: 2.3, target: 'all', drain: true } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'brine', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Undermarch (Lv 52-63) ======================
  /**
   * Salt galleries under the Verge, dug for one purpose and repurposed by
   * everything since.
   *
   * The Undermarch is built on *polarity*. Half its residents are glass-eyed —
   * evasion in the sixties, so steel simply misses them — and half are dulled,
   * with magic defence high enough that a tier-four spell scratches. Neither
   * half is hard on its own; the encounter tables always field both, so the
   * party that has committed entirely to one answer spends the fight watching
   * half its turns do nothing. Bring the other sword.
   */
  shalestalker: {
    id: 'shalestalker', name: 'Shale Stalker', level: 52,
    look: { plan: 'insect', scale: 0.95, legs: 8, color: '#4b382d', accent: '#666c74', eyeColor: '#ffe45e', stinger: true },
    stats: { hp: 4200, mp: 100, atk: 262, def: 178, mag: 118, mdef: 150, spd: 78, eva: 62, lck: 26 },
    affinity: { earth: 'resist', ice: 'weak' },
    exp: 1880, gold: 1950, drops: [{ id: 'hipotion', chance: 0.3 }],
    steal: [{ id: 'thiefsknife', chance: 0.08 }],
    ai: [
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Off The Wall', power: 1.4, status: { blind: 55 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  deadweight: {
    id: 'deadweight', name: 'Deadweight', level: 53,
    look: { plan: 'construct', scale: 1.3, color: '#666c74', accent: '#22242a', eyeColor: '#e0574f', treads: true },
    stats: { hp: 5200, mp: 120, atk: 254, def: 216, mag: 128, mdef: 224, spd: 14, eva: 0, lck: 4 },
    affinity: { bolt: 'weak', aether: 'resist', poison: 'immune', shadow: 'resist' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stone', 'ko'],
    exp: 1960, gold: 2100, drops: [{ id: 'shrapnel', chance: 0.3 }],
    steal: [{ id: 'guardplate', chance: 0.1 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Come Down', power: 2.4 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Settle', power: 1.5, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  spallmoth: {
    id: 'spallmoth', name: 'Spall Moth', level: 54,
    look: { plan: 'avian', scale: 0.7, color: '#ddccab', accent: '#4b382d', eyeColor: '#f7d968' },
    stats: { hp: 4300, mp: 180, atk: 258, def: 172, mag: 150, mdef: 158, spd: 74, eva: 68, lck: 30 },
    affinity: { wind: 'absorb', bolt: 'weak' },
    exp: 2050, gold: 2100, drops: [{ id: 'eyedrops', chance: 0.35 }],
    steal: [{ id: 'swiftband', chance: 0.14 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'galecut' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  boringengine: {
    id: 'boringengine', name: 'The Boring Engine', level: 55,
    look: { plan: 'construct', scale: 1.4, color: '#5b6674', accent: '#3b2c12', eyeColor: '#ff7a2f', cannons: true, treads: true },
    stats: { hp: 5600, mp: 160, atk: 268, def: 220, mag: 140, mdef: 226, spd: 16, eva: 0, lck: 4 },
    affinity: { bolt: 'weak', water: 'weak', earth: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stone', 'ko', 'stop'],
    exp: 2150, gold: 2300, drops: [{ id: 'shrapnel', chance: 0.35 }],
    steal: [{ id: 'ironknuckles', chance: 0.2 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Full Face', power: 2.2, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  chalkwight: {
    id: 'chalkwight', name: 'Chalk Wight', level: 56,
    look: { plan: 'undead', scale: 1.15, color: '#e8edf5', accent: '#4b382d', weapon: 'axe', eyeColor: '#94bf55' },
    stats: { hp: 5500, mp: 200, atk: 274, def: 212, mag: 158, mdef: 230, spd: 20, eva: 2, lck: 8 },
    affinity: { holy: 'weak', earth: 'absorb', shadow: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko', 'stone'],
    exp: 2250, gold: 2400, drops: [{ id: 'softstone', chance: 0.3 }],
    steal: [{ id: 'crownofsalt', chance: 0.05 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'ossify' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Dust Off', power: 1.6, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  slipknave: {
    id: 'slipknave', name: 'Slip Knave', level: 57,
    look: { plan: 'humanoid', scale: 0.95, color: '#9a6147', accent: '#22242a', weapon: 'sword', eyeColor: '#ffe45e' },
    stats: { hp: 4700, mp: 160, atk: 282, def: 176, mag: 146, mdef: 156, spd: 76, eva: 66, lck: 34 },
    affinity: { shadow: 'resist', holy: 'weak' },
    exp: 2350, gold: 2600, drops: [{ id: 'thiefsknife', chance: 0.1 }],
    steal: [{ id: 'hoardersglove', chance: 0.06 }, { id: 'hipotion', chance: 0.3 }],
    ai: [
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Lift', power: 1.2, drain: true } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  dampener: {
    id: 'dampener', name: 'The Dampener', level: 58,
    look: { plan: 'floater', scale: 0.9, color: '#2b3038', eyeColor: '#5b6674', eyeCount: 1, tendrils: true },
    stats: { hp: 5400, mp: 400, atk: 240, def: 190, mag: 210, mdef: 236, spd: 46, eva: 12, lck: 24 },
    affinity: { aether: 'absorb', holy: 'weak', bolt: 'resist', physical: 'resist' },
    immune: ['ko', 'sleep', 'poison', 'silence', 'confuse'],
    exp: 2450, gold: 2700, drops: [{ id: 'hitonic', chance: 0.32 }],
    steal: [{ id: 'wardstone', chance: 0.2 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'hollow' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  crevicehound: {
    id: 'crevicehound', name: 'Crevice Hound', level: 59,
    look: { plan: 'quadruped', scale: 0.95, color: '#332c1c', accent: '#16241d', eyeColor: '#ff7a2f' },
    stats: { hp: 5200, mp: 60, atk: 300, def: 180, mag: 116, mdef: 152, spd: 80, eva: 58, lck: 24 },
    affinity: { earth: 'resist', wind: 'weak' },
    exp: 2550, gold: 2650, drops: [{ id: 'xpotion', chance: 0.22 }],
    steal: [{ id: 'sprinter', chance: 0.15 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Down The Crack', power: 2.1 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  pitprop: {
    id: 'pitprop', name: 'Pit Prop', level: 60,
    look: { plan: 'plant', scale: 1.35, color: '#4b382d', accent: '#332c1c', eyeColor: '#dbc891' },
    stats: { hp: 6600, mp: 140, atk: 292, def: 218, mag: 152, mdef: 232, spd: 18, eva: 2, lck: 8 },
    affinity: { fire: 'weak', earth: 'absorb', bolt: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'charm', 'stop', 'slow'],
    exp: 2700, gold: 2800, drops: [{ id: 'balm', chance: 0.3 }],
    steal: [{ id: 'towershield', chance: 0.16 }],
    ai: [
      { if: 'hpBelow', v: 0.25, do: { kind: 'attack', name: 'Bring It Down', power: 2.5, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Timber Bind', power: 1.3, status: { stop: 50 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  nightshift: {
    id: 'nightshift', name: 'The Night Shift', level: 62,
    look: { plan: 'undead', scale: 1.1, color: '#918f98', accent: '#2b2933', weapon: 'axe', helmet: true, eyeColor: '#3fc6d6' },
    stats: { hp: 6800, mp: 240, atk: 306, def: 206, mag: 178, mdef: 214, spd: 44, eva: 26, lck: 16 },
    affinity: { holy: 'weak', shadow: 'absorb', earth: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko', 'blind'],
    exp: 2950, gold: 3100, drops: [{ id: 'ashenkatana', chance: 0.12 }],
    steal: [{ id: 'ironhelm', chance: 0.3 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Work On', power: 2.0, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Aether Shelf (Lv 60-70) ====================
  /**
   * A pale flat where the aether comes up through the ground like frost on a
   * window, and every living thing has arranged itself around the supply.
   *
   * The Shelf takes things. MP, buffs, the ability to speak — the whole region
   * is a *resource denial* problem, and its creatures are individually softer
   * than the Undermarch's precisely because the fight is not meant to be lost
   * to damage. It is meant to be lost slowly, four turns after the last Tonic.
   * The party that arrives here rationing wins; the party that arrives casting
   * its most expensive spell at trash does not.
   */
  tithewisp: {
    id: 'tithewisp', name: 'Tithe Wisp', level: 60,
    look: { plan: 'floater', scale: 0.8, color: '#12566b', eyeColor: '#3fc6d6', eyeCount: 1, tendrils: true },
    stats: { hp: 5800, mp: 500, atk: 258, def: 192, mag: 208, mdef: 212, spd: 58, eva: 34, lck: 32 },
    affinity: { aether: 'absorb', holy: 'weak', bolt: 'resist' },
    immune: ['sleep', 'poison', 'silence'],
    exp: 2700, gold: 3000, drops: [{ id: 'hitonic', chance: 0.35 }],
    steal: [{ id: 'focusring', chance: 0.2 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'sap' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  quietingbell: {
    id: 'quietingbell', name: 'Quieting Bell', level: 61,
    look: { plan: 'construct', scale: 1.15, color: '#d8ac31', accent: '#3b2c12', eyeColor: '#fff3b8' },
    stats: { hp: 6600, mp: 260, atk: 288, def: 220, mag: 178, mdef: 206, spd: 28, eva: 4, lck: 8 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stone'],
    exp: 2800, gold: 3200, drops: [{ id: 'echoherb', chance: 0.4 }],
    steal: [{ id: 'lanternstaff', chance: 0.12 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hush', target: 'all' } },
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Dull Peal', power: 1.5, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  mendicant: {
    id: 'mendicant', name: 'The Mendicant', level: 62,
    look: { plan: 'humanoid', scale: 1.0, color: '#bda98b', accent: '#4e326c', weapon: 'staff', eyeColor: '#d63fb3' },
    stats: { hp: 6300, mp: 440, atk: 274, def: 200, mag: 200, mdef: 208, spd: 50, eva: 22, lck: 30 },
    affinity: { aether: 'absorb', shadow: 'resist', holy: 'weak' },
    immune: ['silence', 'charm', 'confuse'],
    exp: 2900, gold: 3400, drops: [{ id: 'hitonic', chance: 0.3 }],
    steal: [{ id: 'scholarhood', chance: 0.18 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'random', p: 0.35, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'always', do: { kind: 'attack', name: 'Open Palm', power: 1.3, drain: true } },
    ],
  },
  veinmoth: {
    id: 'veinmoth', name: 'Vein Moth', level: 63,
    look: { plan: 'avian', scale: 0.8, color: '#4e326c', accent: '#12566b', eyeColor: '#96f0f5' },
    stats: { hp: 6100, mp: 320, atk: 282, def: 186, mag: 192, mdef: 200, spd: 70, eva: 44, lck: 30 },
    affinity: { aether: 'absorb', wind: 'resist', fire: 'weak' },
    exp: 3000, gold: 3300, drops: [{ id: 'tonic', chance: 0.4 }],
    steal: [{ id: 'hitonic', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Tap The Vein', power: 1.4, drain: true } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  arrearswight: {
    id: 'arrearswight', name: 'Arrears Wight', level: 64,
    look: { plan: 'undead', scale: 1.15, color: '#ddccab', accent: '#2c1b4d', weapon: 'staff', eyeColor: '#d63fb3' },
    stats: { hp: 7000, mp: 300, atk: 298, def: 214, mag: 186, mdef: 208, spd: 42, eva: 14, lck: 14 },
    affinity: { holy: 'weak', shadow: 'absorb', aether: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko'],
    exp: 3150, gold: 3450, drops: [{ id: 'phoenixtear', chance: 0.2 }],
    steal: [{ id: 'crownofsalt', chance: 0.06 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  shelfhound: {
    id: 'shelfhound', name: 'Shelf Hound', level: 65,
    look: { plan: 'quadruped', scale: 1.2, color: '#c6cedb', accent: '#12566b', eyeColor: '#3fc6d6', spines: true },
    stats: { hp: 7200, mp: 100, atk: 320, def: 198, mag: 130, mdef: 184, spd: 72, eva: 34, lck: 22 },
    affinity: { aether: 'resist', ice: 'resist', fire: 'weak' },
    exp: 3300, gold: 3500, drops: [{ id: 'xpotion', chance: 0.28 }],
    steal: [{ id: 'swiftband', chance: 0.18 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Nothing Spare', power: 2.2 } },
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Bloodletting', power: 1.4, drain: true } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  wellspinner: {
    id: 'wellspinner', name: 'Well Spinner', level: 66,
    look: { plan: 'insect', scale: 1.3, legs: 8, color: '#241636', accent: '#8a5ce0', eyeColor: '#d63fb3', stinger: true },
    stats: { hp: 7400, mp: 280, atk: 312, def: 210, mag: 190, mdef: 200, spd: 52, eva: 26, lck: 20 },
    affinity: { aether: 'absorb', shadow: 'resist', holy: 'weak' },
    immune: ['poison', 'venom', 'blind', 'stop'],
    exp: 3450, gold: 3700, drops: [{ id: 'panacea', chance: 0.26 }],
    steal: [{ id: 'earnestcharm', chance: 0.04 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Bind The Thread', power: 1.4, status: { stop: 50 }, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'sap' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  theauditor: {
    id: 'theauditor', name: 'The Auditor', level: 67,
    look: { plan: 'humanoid', scale: 1.05, color: '#918f98', accent: '#1a1a22', metal: '#d8ac31', weapon: 'staff', eyeColor: '#fff3b8' },
    stats: { hp: 7600, mp: 480, atk: 306, def: 206, mag: 212, mdef: 214, spd: 54, eva: 24, lck: 34 },
    affinity: { aether: 'absorb', holy: 'resist', shadow: 'resist' },
    immune: ['silence', 'confuse', 'charm', 'sleep'],
    exp: 3600, gold: 4000, drops: [{ id: 'quillbrush', chance: 0.16 }],
    steal: [{ id: 'earnestcharm', chance: 0.05 }, { id: 'hitonic', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'halve' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  emptyvessel: {
    id: 'emptyvessel', name: 'Empty Vessel', level: 68,
    look: { plan: 'construct', scale: 1.3, color: '#a6b0bc', accent: '#12566b', eyeColor: '#96f0f5', cannons: true },
    stats: { hp: 8400, mp: 340, atk: 320, def: 222, mag: 194, mdef: 212, spd: 30, eva: 4, lck: 8 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stone', 'ko'],
    exp: 3800, gold: 4200, drops: [{ id: 'wardstone', chance: 0.25 }],
    steal: [{ id: 'mirrorshield', chance: 0.06 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Pour Out', power: 2.4, element: 'aether', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  thecollector: {
    id: 'thecollector', name: 'The Collector', level: 70,
    look: { plan: 'floater', scale: 1.15, color: '#2c1b4d', eyeColor: '#d63fb3', eyeCount: 3, tendrils: true },
    stats: { hp: 8300, mp: 600, atk: 296, def: 200, mag: 226, mdef: 220, spd: 60, eva: 36, lck: 36 },
    affinity: { aether: 'absorb', shadow: 'absorb', holy: 'weak', physical: 'resist' },
    immune: ['ko', 'sleep', 'poison', 'silence', 'stone', 'confuse'],
    exp: 4100, gold: 4700, drops: [{ id: 'megalixir', chance: 0.1 }],
    steal: [{ id: 'aetherweave', chance: 0.06 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Long Silence (Lv 68-80) ====================
  /**
   * Past the last place anyone has a name for. The Silence is not a region so
   * much as the width of what the Well took, and the things in it were people,
   * animals and machines before they were unwound.
   *
   * No lesson here, because there is nothing left to teach: everything is
   * immune to almost every lock, the affinities are closed, and the scripts
   * escalate on their own schedule regardless of what the party does. The
   * region exists to be *executed* — the final examination of every habit the
   * previous six taught, run at full speed with no room to improvise.
   */
  unwoundman: {
    id: 'unwoundman', name: 'The Unwound Man', level: 68,
    look: { plan: 'humanoid', scale: 1.1, color: '#b8b6bd', accent: '#2c1b4d', weapon: 'sword', eyeColor: '#d63fb3' },
    stats: { hp: 8600, mp: 320, atk: 328, def: 214, mag: 200, mdef: 206, spd: 56, eva: 22, lck: 24 },
    affinity: { shadow: 'absorb', aether: 'resist', holy: 'weak' },
    immune: ['sleep', 'confuse', 'charm', 'stop', 'doom'],
    exp: 3850, gold: 4200, drops: [{ id: 'xpotion', chance: 0.3 }],
    steal: [{ id: 'quietedge', chance: 0.04 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: 'Come Apart', power: 2.2 } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hollow' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  unmadehound: {
    id: 'unmadehound', name: 'Unmade Hound', level: 69,
    look: { plan: 'quadruped', scale: 1.2, color: '#2b2933', accent: '#241636', eyeColor: '#d63fb3', spines: true },
    stats: { hp: 8800, mp: 100, atk: 348, def: 200, mag: 132, mdef: 190, spd: 74, eva: 32, lck: 20 },
    affinity: { shadow: 'absorb', holy: 'weak', physical: 'resist' },
    immune: ['sleep', 'charm', 'blind', 'stop'],
    exp: 3950, gold: 4300, drops: [{ id: 'xpotion', chance: 0.3 }],
    steal: [{ id: 'twinfang', chance: 0.03 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Nothing Held Back', power: 2.4 } },
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Unpick', power: 1.5, status: { seizure: 55 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  hollowchoir: {
    id: 'hollowchoir', name: 'Hollow Choir', level: 70,
    look: { plan: 'floater', scale: 1.1, color: '#4e4a52', eyeColor: '#dedbe0', eyeCount: 3, tendrils: true },
    stats: { hp: 8700, mp: 620, atk: 300, def: 198, mag: 232, mdef: 218, spd: 60, eva: 34, lck: 32 },
    affinity: { holy: 'weak', shadow: 'absorb', aether: 'resist', physical: 'resist' },
    immune: ['ko', 'sleep', 'poison', 'silence', 'stone', 'confuse'],
    exp: 4100, gold: 4600, drops: [{ id: 'megalixir', chance: 0.08 }],
    steal: [{ id: 'scholarhood', chance: 0.25 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hush', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  blankface: {
    id: 'blankface', name: 'The Blank Face', level: 71,
    look: { plan: 'undead', scale: 1.2, color: '#dedbe0', accent: '#2b2933', armored: true, helmet: true, eyeColor: '#b8b6bd' },
    stats: { hp: 9400, mp: 280, atk: 340, def: 216, mag: 206, mdef: 210, spd: 44, eva: 14, lck: 12 },
    affinity: { holy: 'weak', shadow: 'absorb', ice: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko', 'stone', 'blind'],
    exp: 4250, gold: 4700, drops: [{ id: 'wardenmail', chance: 0.05 }],
    steal: [{ id: 'crownofsalt', chance: 0.1 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Featureless', power: 1.7, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  quietengine: {
    id: 'quietengine', name: 'The Quiet Engine', level: 72,
    look: { plan: 'construct', scale: 1.45, color: '#414954', accent: '#1a1a22', eyeColor: '#d63fb3', cannons: true, treads: true },
    stats: { hp: 10200, mp: 360, atk: 344, def: 226, mag: 210, mdef: 216, spd: 32, eva: 4, lck: 8 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'stone', 'ko', 'stop'],
    exp: 4400, gold: 4900, drops: [{ id: 'guardplate', chance: 0.14 }],
    steal: [{ id: 'aetherglass', chance: 0.02 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Run Silent', power: 2.5, element: 'aether', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'thunderhead' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  unlitmoth: {
    id: 'unlitmoth', name: 'Unlit Moth', level: 73,
    look: { plan: 'avian', scale: 0.85, color: '#241636', accent: '#2c1b4d', eyeColor: '#4e326c' },
    stats: { hp: 9600, mp: 340, atk: 336, def: 196, mag: 214, mdef: 204, spd: 76, eva: 46, lck: 30 },
    affinity: { holy: 'weak', shadow: 'absorb', wind: 'resist' },
    immune: ['blind', 'sleep', 'charm'],
    exp: 4550, gold: 5000, drops: [{ id: 'clarity', chance: 0.4 }],
    steal: [{ id: 'quietstep', chance: 0.12 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'addle', target: 'all' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  stillwidow: {
    id: 'stillwidow', name: 'Still Widow', level: 74,
    look: { plan: 'insect', scale: 1.35, legs: 8, color: '#2b2933', accent: '#4e326c', eyeColor: '#e0574f', stinger: true },
    stats: { hp: 10000, mp: 300, atk: 348, def: 212, mag: 208, mdef: 206, spd: 54, eva: 26, lck: 20 },
    affinity: { shadow: 'absorb', holy: 'weak', poison: 'immune' },
    immune: ['poison', 'venom', 'stop', 'slow', 'blind'],
    exp: 4700, gold: 5200, drops: [{ id: 'panacea', chance: 0.3 }],
    steal: [{ id: 'wardingcord', chance: 0.14 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Last Thread', power: 2.3, drain: true } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Wrap', power: 1.4, status: { stop: 55 }, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  deadorchard: {
    id: 'deadorchard', name: 'Dead Orchard', level: 75,
    look: { plan: 'plant', scale: 1.5, color: '#4b382d', accent: '#2b2933', eyeColor: '#dbc891' },
    stats: { hp: 11200, mp: 280, atk: 352, def: 224, mag: 202, mdef: 208, spd: 22, eva: 4, lck: 10 },
    affinity: { fire: 'weak', earth: 'absorb', shadow: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'charm', 'stop', 'blind'],
    exp: 4900, gold: 5300, drops: [{ id: 'megalixir', chance: 0.08 }],
    steal: [{ id: 'balm', chance: 0.4 }],
    ai: [
      { if: 'hpBelow', v: 0.25, do: { kind: 'attack', name: 'Nothing Fruits', power: 2.6, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'blight', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  marrowsaint: {
    id: 'marrowsaint', name: 'The Marrow Saint', level: 77,
    look: { plan: 'undead', scale: 1.25, color: '#ddccab', accent: '#4a3308', metal: '#d8ac31', weapon: 'staff', eyeColor: '#fff3b8' },
    stats: { hp: 11600, mp: 480, atk: 360, def: 218, mag: 228, mdef: 218, spd: 48, eva: 18, lck: 16 },
    affinity: { shadow: 'weak', holy: 'absorb', fire: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko', 'stone', 'silence'],
    exp: 5250, gold: 5700, drops: [{ id: 'lastlight', chance: 0.06 }],
    steal: [{ id: 'lanternstaff', chance: 0.2 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'spell', spell: 'benediction' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'sanctus' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  edgewalker: {
    id: 'edgewalker', name: 'Edge Walker', level: 79,
    look: { plan: 'humanoid', scale: 1.15, color: '#b8b6bd', accent: '#241636', metal: '#8a5ce0', weapon: 'sword', horns: true, eyeColor: '#d63fb3' },
    stats: { hp: 12400, mp: 420, atk: 372, def: 220, mag: 232, mdef: 214, spd: 60, eva: 26, lck: 28 },
    affinity: { shadow: 'absorb', aether: 'absorb', holy: 'weak' },
    immune: ['sleep', 'confuse', 'charm', 'stop', 'doom', 'ko'],
    exp: 5650, gold: 6200, drops: [{ id: 'quietedge', chance: 0.06 }],
    steal: [{ id: 'twinfang', chance: 0.08 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'spell', spell: 'sunder' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Off The Map', power: 1.9, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ============================== bosses ==================================
  /**
   * Twenty-two of them, roughly three per region, and only a handful sit on
   * the main line — the rest are hunts, standing at the end of a road the
   * player chose to walk down.
   *
   * Every one of them is the exam for its region's lesson. The Weighmaster
   * out-drinks a party that cannot burst; the Standing Pane punishes the mage
   * who never checks an affinity; the Eleventh Hour keeps a visible count and
   * ends the fight on turn eleven whether or not the party is ready. Phases
   * fire once and announce themselves, so the difficulty is always something
   * the player watched arrive.
   *
   * Rewards sit near five times a regular of the same level. That is markedly
   * less than the story gates of volumes one and two pay, and deliberately so:
   * those are paid once and pace the whole campaign, while a hunt is something
   * the player may reasonably do instead of levelling. A hunt that outpaid the
   * plot would quietly become the plot.
   */
  weighmaster: {
    id: 'weighmaster', name: 'The Weighmaster', level: 32, boss: true,
    look: { plan: 'humanoid', scale: 1.55, color: '#96603f', accent: '#1a3c48', metal: '#a2acbb', weapon: 'axe', armored: true, helmet: true, eyeColor: '#96f0f5' },
    stats: { hp: 7000, mp: 400, atk: 272, def: 196, mag: 144, mdef: 168, spd: 36, eva: 10, lck: 20 },
    affinity: { bolt: 'weak', water: 'absorb', poison: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse'],
    exp: 3000, gold: 4000, drops: [{ id: 'crownofsalt', chance: 1.0 }],
    steal: [{ id: 'xpotion', chance: 0.4 }, { id: 'ironbrooch', chance: 0.15 }],
    intro: 'Everything that crosses my pans gets weighed. You are light.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'attack', name: 'Final Reckoning', power: 2.4, target: 'all', drain: true } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'spell', spell: 'sap' } },
      { if: 'hasStatus', status: 'silence', do: { kind: 'attack', name: 'Counterweight', power: 1.8 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Short Measure', power: 1.3, status: { slow: 50 } } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'leech' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thegreatsump: {
    id: 'thegreatsump', name: 'The Great Sump', level: 35, boss: true,
    look: { plan: 'blob', scale: 2.0, color: '#37606f', accent: '#16241d', eyeColor: '#94bf55', eyeCount: 3 },
    stats: { hp: 9200, mp: 320, atk: 298, def: 182, mag: 166, mdef: 162, spd: 24, eva: 4, lck: 10 },
    affinity: { fire: 'weak', water: 'absorb', physical: 'resist', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'poison', 'venom', 'stop', 'doom'],
    exp: 3900, gold: 4800, drops: [{ id: 'hoardersglove', chance: 1.0 }],
    steal: [{ id: 'elixir', chance: 0.3 }, { id: 'panacea', chance: 0.4 }],
    intro: 'The pan is not empty. The pan has never once been empty.',
    ai: [
      { if: 'hpBelow', v: 0.22, phase: 3, do: { kind: 'attack', name: 'Take It All Back', power: 2.5, target: 'all', drain: true } },
      { if: 'hpBelow', v: 0.55, phase: 2, do: { kind: 'attack', name: 'Sour Flood', power: 1.8, status: { venom: 70 }, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Engulf', power: 1.6, status: { sleep: 55 } } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'sap' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  motherbrine: {
    id: 'motherbrine', name: 'The Mother Brine', level: 37, boss: true,
    look: { plan: 'floater', scale: 1.8, color: '#1a3c48', eyeColor: '#96f0f5', eyeCount: 3, tendrils: true },
    stats: { hp: 10500, mp: 640, atk: 277, def: 188, mag: 212, mdef: 196, spd: 48, eva: 26, lck: 28 },
    affinity: { water: 'absorb', ice: 'resist', bolt: 'weak', physical: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence'],
    exp: 4600, gold: 6000, drops: [{ id: 'wardingcord', chance: 1.0 }],
    steal: [{ id: 'megalixir', chance: 0.15 }, { id: 'hitonic', chance: 0.5 }],
    intro: 'She has been in the ground under the pans since before the pans.',
    ai: [
      { if: 'hpBelow', v: 0.18, phase: 3, do: { kind: 'attack', name: 'Everything Is Water', power: 2.6, element: 'water', target: 'all', drain: true } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'spell', spell: 'brine', target: 'all' } },
      { if: 'hasStatus', status: 'blind', do: { kind: 'spell', spell: 'sap' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'leech' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  theannealer: {
    id: 'theannealer', name: 'The Annealer', level: 38, boss: true,
    look: { plan: 'construct', scale: 1.7, color: '#7d4436', accent: '#3a2226', eyeColor: '#ff7a2f', cannons: true },
    stats: { hp: 12000, mp: 500, atk: 339, def: 218, mag: 202, mdef: 190, spd: 32, eva: 4, lck: 8 },
    affinity: { fire: 'absorb', ice: 'weak', water: 'weak', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence', 'poison', 'blind'],
    exp: 5000, gold: 6400, drops: [{ id: 'emberbrand', chance: 1.0 }],
    steal: [{ id: 'emberflask', chance: 0.5 }, { id: 'focusring', chance: 0.2 }],
    intro: 'It has been holding one temperature for six hundred years.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'spell', spell: 'conflagrate' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'attack', name: 'Soak Heat', power: 2.0, element: 'fire', target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Quench', power: 1.5, status: { seizure: 55 } } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'pyre' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  standingpane: {
    id: 'standingpane', name: 'The Standing Pane', level: 40, boss: true,
    look: { plan: 'construct', scale: 1.85, color: '#e8edf5', accent: '#5f6572', eyeColor: '#96f0f5' },
    stats: { hp: 13500, mp: 600, atk: 327, def: 220, mag: 228, mdef: 206, spd: 34, eva: 6, lck: 10 },
    affinity: { bolt: 'absorb', holy: 'absorb', shadow: 'absorb', water: 'weak', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence', 'poison'],
    exp: 5600, gold: 7200, drops: [{ id: 'mirrorshield', chance: 1.0 }],
    steal: [{ id: 'wardstone', chance: 0.5 }, { id: 'scholarhood', chance: 0.2 }],
    intro: 'You are looking at yourself. That is the entire trick, and it still works.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.45, phase: 2, do: { kind: 'spell', spell: 'benediction' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'thunderhead' } },
      { if: 'random', p: 0.2, do: { kind: 'attack', name: 'Show You', power: 1.6, element: 'holy' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  motherofglass: {
    id: 'motherofglass', name: 'The Mother of Glass', level: 42, boss: true,
    look: { plan: 'insect', scale: 1.9, legs: 8, color: '#9ccdd4', accent: '#e8edf5', eyeColor: '#d63fb3', stinger: true, eyeCount: 6 },
    stats: { hp: 15000, mp: 520, atk: 382, def: 216, mag: 240, mdef: 194, spd: 50, eva: 22, lck: 20 },
    affinity: { earth: 'absorb', wind: 'weak', fire: 'resist', ice: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'poison', 'venom', 'blind'],
    exp: 6300, gold: 8000, drops: [{ id: 'aetherweave', chance: 0.25 }, { id: 'xpotion', chance: 1.0 }],
    steal: [{ id: 'quietedge', chance: 0.05 }, { id: 'panacea', chance: 0.5 }],
    intro: 'Nine hundred years of lightning had to go somewhere. It went into her.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'attack', name: 'The Whole Reach', power: 2.7, element: 'earth', target: 'all' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'allyDown', do: { kind: 'attack', name: 'Brood Grief', power: 2.0, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Lay In Glass', power: 1.5, status: { stone: 35 } } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'ossify' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  theeleventhhour: {
    id: 'theeleventhhour', name: 'The Eleventh Hour', level: 46, boss: true,
    look: { plan: 'construct', scale: 1.9, color: '#ab8018', accent: '#4a4324', eyeColor: '#fff3b8', cannons: true },
    stats: { hp: 18000, mp: 700, atk: 413, def: 222, mag: 267, mdef: 206, spd: 38, eva: 6, lck: 10 },
    affinity: { bolt: 'weak', aether: 'absorb', shadow: 'resist', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'slow', 'doom', 'confuse', 'silence', 'poison'],
    exp: 7000, gold: 8800, drops: [{ id: 'lastlight', chance: 1.0 }],
    steal: [{ id: 'megalixir', chance: 0.2 }, { id: 'swiftband', chance: 0.4 }],
    intro: 'It shows the time. It has always shown the time. It is nearly the time.',
    ai: [
      { if: 'turnIs', n: 11, phase: 4, do: { kind: 'attack', name: 'The Hour', power: 3.4, target: 'all' } },
      { if: 'turnIs', n: 8, phase: 3, do: { kind: 'spell', spell: 'knell', target: 'all' } },
      { if: 'turnIs', n: 4, phase: 2, do: { kind: 'spell', spell: 'arrest', target: 'all' } },
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Wind Forward', power: 2.0, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Escapement', power: 1.6 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thelonghand: {
    id: 'thelonghand', name: 'The Long Hand', level: 48, boss: true,
    look: { plan: 'humanoid', scale: 1.6, color: '#918f98', accent: '#4a4324', metal: '#d8ac31', weapon: 'spear', horns: true, eyeColor: '#f7d968' },
    stats: { hp: 20000, mp: 800, atk: 403, def: 218, mag: 286, mdef: 212, spd: 52, eva: 18, lck: 26 },
    affinity: { holy: 'weak', shadow: 'absorb', aether: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'charm', 'silence'],
    exp: 7800, gold: 9600, drops: [{ id: 'quietstep', chance: 1.0 }],
    steal: [{ id: 'elixir', chance: 0.4 }, { id: 'focusring', chance: 0.25 }],
    intro: 'You are not late. You were never going to be on time.',
    ai: [
      { if: 'hpBelow', v: 0.15, phase: 3, do: { kind: 'spell', spell: 'severance' } },
      { if: 'hpBelow', v: 0.45, phase: 2, do: { kind: 'spell', spell: 'knell', target: 'all' } },
      { if: 'hasStatus', status: 'slow', do: { kind: 'attack', name: 'Overwound', power: 2.2, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'halve' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Sweep The Face', power: 1.6, status: { stop: 45 }, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thelatebell: {
    id: 'thelatebell', name: 'The Late Bell', level: 50, boss: true,
    look: { plan: 'construct', scale: 2.0, color: '#8a6a23', accent: '#3b2c12', eyeColor: '#ffd76a', cannons: true, treads: true },
    stats: { hp: 22500, mp: 760, atk: 431, def: 226, mag: 278, mdef: 214, spd: 40, eva: 6, lck: 10 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'absorb', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence', 'poison', 'blind'],
    exp: 8600, gold: 10800, drops: [{ id: 'aetherweave', chance: 1.0 }],
    steal: [{ id: 'megalixir', chance: 0.25 }, { id: 'wardstone', chance: 0.5 }],
    intro: 'Nobody rang it. Nobody has needed to ring it for a very long time.',
    ai: [
      { if: 'turnIs', n: 12, phase: 4, do: { kind: 'attack', name: 'Toll For Everyone', power: 3.2, target: 'all' } },
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'spell', spell: 'arrest', target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Hammer Down', power: 1.9, status: { paralysis: 50 } } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'thunderhead' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thefirstrank: {
    id: 'thefirstrank', name: 'The First Rank', level: 52, boss: true,
    look: { plan: 'humanoid', scale: 1.65, color: '#ac744c', accent: '#1a3c48', metal: '#666c74', weapon: 'spear', armored: true, helmet: true, eyeColor: '#e0574f' },
    stats: { hp: 24000, mp: 700, atk: 449, def: 224, mag: 259, mdef: 202, spd: 50, eva: 16, lck: 22 },
    affinity: { bolt: 'weak', water: 'resist', earth: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'charm'],
    exp: 9200, gold: 11500, drops: [{ id: 'longspear', chance: 1.0 }],
    steal: [{ id: 'wardenmail', chance: 0.12 }, { id: 'xpotion', chance: 0.5 }],
    intro: 'Hold the line. Nobody ever came to say otherwise.',
    ai: [
      { if: 'hpBelow', v: 0.18, phase: 3, do: { kind: 'attack', name: 'Nobody Passes', power: 2.8, target: 'all' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'attack', name: 'Second Rank', power: 2.0, target: 'all' } },
      { if: 'allyDown', do: { kind: 'attack', name: 'Close Up', power: 2.2 } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Set Pikes', power: 1.5, status: { paralysis: 45 }, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Drive Through', power: 1.8 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  bannerofthenine: {
    id: 'bannerofthenine', name: 'The Banner of the Nine', level: 54, boss: true,
    look: { plan: 'undead', scale: 1.7, color: '#c6cedb', accent: '#12566b', metal: '#d8ac31', weapon: 'staff', eyeColor: '#96f0f5' },
    stats: { hp: 26500, mp: 900, atk: 444, def: 220, mag: 294, mdef: 214, spd: 46, eva: 14, lck: 18 },
    affinity: { holy: 'weak', water: 'absorb', shadow: 'resist', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence', 'poison'],
    exp: 10200, gold: 12500, drops: [{ id: 'lanternstaff', chance: 1.0 }],
    steal: [{ id: 'aetherweave', chance: 0.15 }, { id: 'megalixir', chance: 0.25 }],
    intro: 'Nine went down. One came back up carrying the cloth.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'attack', name: 'Colours Fall', power: 2.2, element: 'water', target: 'all' } },
      { if: 'allyDown', do: { kind: 'spell', spell: 'benediction' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'brine', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  vergemarshal: {
    id: 'vergemarshal', name: 'The Verge Marshal', level: 56, boss: true,
    look: { plan: 'humanoid', scale: 1.75, color: '#96603f', accent: '#25404e', metal: '#a6b0bc', weapon: 'sword', armored: true, helmet: true, eyeColor: '#3fc6d6' },
    stats: { hp: 29000, mp: 900, atk: 494, def: 228, mag: 294, mdef: 210, spd: 54, eva: 18, lck: 24 },
    affinity: { bolt: 'weak', water: 'absorb', shadow: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'charm', 'silence'],
    exp: 11400, gold: 14000, drops: [{ id: 'wardenmail', chance: 1.0 }],
    steal: [{ id: 'tidecleaver', chance: 0.1 }, { id: 'elixir', chance: 0.5 }],
    intro: 'I have four hundred men on this rim and not one order since the Well opened.',
    ai: [
      { if: 'hpBelow', v: 0.12, phase: 4, do: { kind: 'attack', name: 'Last Standing Order', power: 3.0, target: 'all' } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'spell', spell: 'arrest', target: 'all' } },
      { if: 'hpBelow', v: 0.65, phase: 2, do: { kind: 'attack', name: 'Break Them', power: 2.1, target: 'all' } },
      { if: 'allyDown', do: { kind: 'attack', name: 'Name Them Later', power: 2.4 } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: "Marshal's Cut", power: 1.8 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thelongdrift: {
    id: 'thelongdrift', name: 'The Long Drift', level: 58, boss: true,
    look: { plan: 'blob', scale: 1.95, color: '#332c1c', accent: '#16241d', eyeColor: '#ffe45e', eyeCount: 3 },
    stats: { hp: 31000, mp: 600, atk: 505, def: 196, mag: 300, mdef: 200, spd: 40, eva: 26, lck: 14 },
    affinity: { earth: 'absorb', wind: 'weak', physical: 'resist', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'poison', 'venom'],
    exp: 12200, gold: 15000, drops: [{ id: 'twinfang', chance: 1.0 }],
    steal: [{ id: 'stormfists', chance: 0.12 }, { id: 'xpotion', chance: 0.5 }],
    intro: 'The gallery does not end. That is not a figure of speech.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'attack', name: 'Close The Drift', power: 2.8, target: 'all' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'hasStatus', status: 'blind', do: { kind: 'attack', name: 'Feel For You', power: 2.0, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Swallow Ground', power: 1.7, drain: true } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Fall In', power: 1.6, status: { blind: 55 }, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  themotherlode: {
    id: 'themotherlode', name: 'The Motherlode', level: 60, boss: true,
    look: { plan: 'construct', scale: 2.05, color: '#666c74', accent: '#22242a', eyeColor: '#ff7a2f', cannons: true, treads: true },
    stats: { hp: 34000, mp: 800, atk: 517, def: 228, mag: 306, mdef: 230, spd: 24, eva: 2, lck: 6 },
    affinity: { bolt: 'weak', water: 'weak', earth: 'absorb', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'slow', 'doom', 'confuse', 'silence', 'poison', 'blind'],
    exp: 13400, gold: 16500, drops: [{ id: 'stormfists', chance: 1.0 }],
    steal: [{ id: 'guardplate', chance: 0.4 }, { id: 'shrapnel', chance: 0.6 }],
    intro: 'They dug until they hit it. Then it started digging.',
    ai: [
      { if: 'hpBelow', v: 0.15, phase: 3, do: { kind: 'attack', name: 'Open Seam', power: 3.0, element: 'earth', target: 'all' } },
      { if: 'hpBelow', v: 0.45, phase: 2, do: { kind: 'attack', name: 'Grind Face', power: 2.2, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'ossify' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'upheaval' } },
      { if: 'random', p: 0.2, do: { kind: 'attack', name: 'Overburden', power: 1.8, status: { paralysis: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  theunderforeman: {
    id: 'theunderforeman', name: 'The Under-Foreman', level: 63, boss: true,
    look: { plan: 'humanoid', scale: 1.7, color: '#9a6147', accent: '#332c1c', metal: '#8a6a23', weapon: 'axe', armored: true, eyeColor: '#ffd76a' },
    stats: { hp: 38000, mp: 900, atk: 543, def: 222, mag: 314, mdef: 214, spd: 56, eva: 20, lck: 22 },
    affinity: { earth: 'resist', fire: 'resist', wind: 'weak', shadow: 'resist' },
    // Not immune to silence: `Hands Then` below is what it does about being
    // shut up, which makes silencing it a real trade rather than a no-op.
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'charm'],
    exp: 15000, gold: 18500, drops: [{ id: 'quietedge', chance: 1.0 }],
    steal: [{ id: 'hoardersglove', chance: 0.3 }, { id: 'megalixir', chance: 0.3 }],
    intro: 'Eleven years of shifts. Nobody up top ever wrote the last one down.',
    ai: [
      { if: 'hpBelow', v: 0.12, phase: 4, do: { kind: 'spell', spell: 'sunder' } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'attack', name: 'Double Shift', power: 2.6, target: 'all' } },
      { if: 'hpBelow', v: 0.65, phase: 2, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'hasStatus', status: 'silence', do: { kind: 'attack', name: 'Hands Then', power: 2.3 } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Clock Off', power: 1.7, status: { stop: 50 } } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Take The Face', power: 1.9 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thegreatthirst: {
    id: 'thegreatthirst', name: 'The Great Thirst', level: 66, boss: true,
    look: { plan: 'floater', scale: 1.95, color: '#12566b', eyeColor: '#3fc6d6', eyeCount: 3, tendrils: true },
    stats: { hp: 40000, mp: 1200, atk: 485, def: 206, mag: 332, mdef: 222, spd: 62, eva: 34, lck: 34 },
    affinity: { aether: 'absorb', bolt: 'resist', holy: 'weak', physical: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence', 'poison'],
    exp: 16000, gold: 19500, drops: [{ id: 'earnestcharm', chance: 1.0 }],
    steal: [{ id: 'megalixir', chance: 0.35 }, { id: 'focusring', chance: 0.4 }],
    intro: 'It does not want to kill you. It wants what you were going to spend.',
    ai: [
      { if: 'hpBelow', v: 0.18, phase: 3, do: { kind: 'spell', spell: 'lastword' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'attack', name: 'Drink The Room', power: 2.4, target: 'all', drain: true } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'sap' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thetithe: {
    id: 'thetithe', name: 'The Tithe', level: 68, boss: true,
    look: { plan: 'construct', scale: 2.0, color: '#d8ac31', accent: '#4a3308', eyeColor: '#fff3b8', cannons: true },
    stats: { hp: 43000, mp: 1000, atk: 524, def: 226, mag: 317, mdef: 220, spd: 38, eva: 6, lck: 10 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'absorb', holy: 'resist', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence', 'poison', 'blind'],
    exp: 17000, gold: 21000, drops: [{ id: 'crownofsalt', chance: 1.0 }],
    steal: [{ id: 'aetherglass', chance: 0.05 }, { id: 'megalixir', chance: 0.4 }],
    intro: 'A tenth of everything, it was agreed. Nobody agreed a tenth of what.',
    ai: [
      { if: 'hpBelow', v: 0.15, phase: 3, do: { kind: 'attack', name: 'Collect In Full', power: 3.0, element: 'aether', target: 'all' } },
      { if: 'hpBelow', v: 0.45, phase: 2, do: { kind: 'spell', spell: 'halve' } },
      { if: 'hasStatus', status: 'slow', do: { kind: 'spell', spell: 'benediction' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'hush', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  theopenhand: {
    id: 'theopenhand', name: 'The Open Hand', level: 70, boss: true,
    look: { plan: 'humanoid', scale: 1.8, color: '#bda98b', accent: '#4e326c', metal: '#8a5ce0', weapon: 'staff', horns: true, eyeColor: '#d63fb3' },
    stats: { hp: 46000, mp: 1300, atk: 514, def: 220, mag: 337, mdef: 222, spd: 60, eva: 24, lck: 32 },
    affinity: { aether: 'absorb', shadow: 'absorb', holy: 'weak' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'charm', 'silence', 'poison'],
    exp: 18000, gold: 22500, drops: [{ id: 'aetherweave', chance: 1.0 }],
    steal: [{ id: 'megalixir', chance: 0.4 }, { id: 'earnestcharm', chance: 0.2 }],
    intro: 'Give it here. You were never going to make anything of it.',
    ai: [
      { if: 'hpBelow', v: 0.15, phase: 4, do: { kind: 'spell', spell: 'lastword' } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.65, phase: 2, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Ask Once', power: 2.0, drain: true, target: 'all' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  whatremains: {
    id: 'whatremains', name: 'What Remains', level: 74, boss: true,
    look: { plan: 'undead', scale: 1.85, color: '#dedbe0', accent: '#2b2933', weapon: 'sword', armored: true, helmet: true, eyeColor: '#b8b6bd' },
    stats: { hp: 50000, mp: 1000, atk: 588, def: 224, mag: 347, mdef: 216, spd: 50, eva: 16, lck: 16 },
    affinity: { holy: 'weak', shadow: 'absorb', ice: 'resist', poison: 'immune' },
    // Blinding it is possible on purpose — see `Swing Wide` below.
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'charm', 'silence', 'poison'],
    exp: 19500, gold: 23500, drops: [{ id: 'wardenmail', chance: 1.0 }],
    steal: [{ id: 'lastlight', chance: 0.2 }, { id: 'megalixir', chance: 0.4 }],
    intro: 'It is wearing somebody. It is not wearing them well.',
    ai: [
      { if: 'hpBelow', v: 0.12, phase: 4, do: { kind: 'attack', name: 'Nothing Left Over', power: 3.2, target: 'all' } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.65, phase: 2, do: { kind: 'spell', spell: 'severance' } },
      { if: 'hasStatus', status: 'blind', do: { kind: 'attack', name: 'Swing Wide', power: 2.4, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Wear It Thinner', power: 2.0, drain: true } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thetenthwell: {
    id: 'thetenthwell', name: 'The Tenth Well', level: 77, boss: true,
    look: { plan: 'floater', scale: 2.2, color: '#241636', eyeColor: '#8a5ce0', eyeCount: 3, tendrils: true },
    stats: { hp: 54000, mp: 1400, atk: 561, def: 216, mag: 378, mdef: 226, spd: 58, eva: 30, lck: 30 },
    affinity: { aether: 'absorb', shadow: 'absorb', holy: 'weak', physical: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'charm', 'silence', 'poison', 'blind'],
    exp: 21500, gold: 26000, drops: [{ id: 'aetherglass', chance: 1.0 }],
    steal: [{ id: 'megalixir', chance: 0.5 }, { id: 'lastlight', chance: 0.15 }],
    intro: 'There were nine. Somebody, at some point, dug one more.',
    ai: [
      { if: 'hpBelow', v: 0.1, phase: 4, do: { kind: 'spell', spell: 'lastword' } },
      { if: 'hpBelow', v: 0.3, phase: 3, do: { kind: 'attack', name: 'Open Downward', power: 3.0, element: 'aether', target: 'all' } },
      { if: 'hpBelow', v: 0.6, phase: 2, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'turnEvery', n: 5, do: { kind: 'spell', spell: 'halve', target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'always', do: { kind: 'attack', name: 'Draw Down', power: 1.8, drain: true } },
    ],
  },

  theunwinding: {
    id: 'theunwinding', name: 'The Unwinding', level: 80, boss: true,
    look: { plan: 'humanoid', scale: 1.95, color: '#b8b6bd', accent: '#2c1b4d', metal: '#d63fb3', weapon: 'staff', horns: true, eyeColor: '#8a5ce0', eyeCount: 3 },
    stats: { hp: 58000, mp: 1200, atk: 629, def: 228, mag: 372, mdef: 222, spd: 64, eva: 24, lck: 30 },
    affinity: { shadow: 'absorb', aether: 'absorb', holy: 'weak', physical: 'resist' },
    // Silence is left off deliberately: `By Hand Then` is what it does about it.
    immune: ['ko', 'stone', 'sleep', 'stop', 'slow', 'doom', 'confuse', 'charm', 'poison', 'blind'],
    exp: 24500, gold: 30000, drops: [{ id: 'megalixir', chance: 1.0 }],
    steal: [{ id: 'quietedge', chance: 0.2 }, { id: 'aetherglass', chance: 0.08 }],
    intro: 'This is not a fight. This is the last of the thread going through the eye.',
    ai: [
      { if: 'hpBelow', v: 0.1, phase: 4, do: { kind: 'spell', spell: 'lastword' } },
      { if: 'hpBelow', v: 0.3, phase: 3, do: { kind: 'attack', name: 'Pull The Thread', power: 3.2, target: 'all' } },
      { if: 'hpBelow', v: 0.6, phase: 2, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hasStatus', status: 'silence', do: { kind: 'attack', name: 'By Hand Then', power: 2.6, target: 'all' } },
      { if: 'turnEvery', n: 5, do: { kind: 'spell', spell: 'sunder' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'halve' } },
      { if: 'always', do: { kind: 'attack', name: 'Contempt', power: 1.6 } },
    ],
  },

  thefirstengine: {
    id: 'thefirstengine', name: 'The First Engine', level: 80, boss: true,
    look: { plan: 'construct', scale: 2.4, color: '#5b6674', accent: '#12566b', eyeColor: '#96f0f5', cannons: true, treads: true, eyeCount: 3 },
    stats: { hp: 74000, mp: 1600, atk: 649, def: 232, mag: 385, mdef: 228, spd: 46, eva: 8, lck: 12 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'absorb', holy: 'resist', shadow: 'resist', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'slow', 'doom', 'confuse', 'charm', 'silence', 'poison', 'blind', 'berserk'],
    exp: 32000, gold: 42000, drops: [{ id: 'aetherglass', chance: 1.0 }, { id: 'megalixir', chance: 1.0 }],
    steal: [{ id: 'lastlight', chance: 0.3 }, { id: 'megalixir', chance: 0.6 }],
    intro: 'QUERY: WHO BUILT ME. NO RECORD. QUERY REPEATED FOR NINE HUNDRED YEARS.',
    ai: [
      { if: 'hpBelow', v: 0.08, phase: 6, do: { kind: 'spell', spell: 'lastword' } },
      { if: 'hpBelow', v: 0.25, phase: 5, do: { kind: 'attack', name: 'First Principle', power: 3.4, element: 'aether', target: 'all' } },
      { if: 'hpBelow', v: 0.45, phase: 4, do: { kind: 'spell', spell: 'unlight' } },
      // Was `hasStatus: berserk`, which nothing in the game can put on an
      // enemy, so the Engine's own escalation could never fire. It takes its
      // governor off once, on the way down. The phase numbers below it moved
      // up rather than this one taking a fraction: a phase rule is skipped if
      // a higher-numbered one has already fired, so the ladder has to descend.
      { if: 'hpBelow', v: 0.55, phase: 3, do: { kind: 'attack', name: 'Governor Off', power: 3.0 } },
      { if: 'hpBelow', v: 0.7, phase: 2, do: { kind: 'spell', spell: 'arrest', target: 'all' } },
      { if: 'turnEvery', n: 5, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'thunderhead' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Lance Array', power: 2.0, element: 'bolt', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
};

/**
 * Encounter tables for the seven regions, plus the pockets inside them that
 * deserve their own formations.
 *
 * Formations are the region's argument in miniature. The Glass Reach always
 * fields opposed absorptions so a single blanket spell cannot be right; the
 * Undermarch always fields one evasive and one dulled creature together; the
 * Verge always puts something fragile and important behind something that is
 * neither. A few tables reach back into volume two so the border between
 * regions reads as a gradient rather than a wall.
 */
export const VOL3_ENCOUNTERS = {
  saltmarch_pans: {
    rate: 24, terrain: 'sand', scenery: 'field',
    groups: [
      { weight: 28, enemies: ['panleech', 'panleech', 'brinehusk'] },
      { weight: 24, enemies: ['thirstmoth', 'thirstmoth'] },
      { weight: 20, enemies: ['rakehand', 'brinehusk'] },
      { weight: 16, enemies: ['saltferryman', 'panleech'] },
      { weight: 12, enemies: ['gullkin', 'gullkin', 'thirstmoth'] },
    ],
  },
  saltmarch_weirs: {
    rate: 22, terrain: 'sand', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['weirmaw', 'panleech'] },
      { weight: 24, enemies: ['saltdrinker', 'saltdrinker'] },
      { weight: 20, enemies: ['crustcrab', 'weirmaw'] },
      { weight: 18, enemies: ['tallykeeper', 'brinehusk', 'brinehusk'] },
      { weight: 12, enemies: ['sumpwidow'] },
    ],
  },
  glass_reach: {
    rate: 26, terrain: 'marble', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['prismwing', 'mirrorhusk'] },
      { weight: 24, enemies: ['fulgurite', 'shardswarm', 'shardswarm'] },
      { weight: 20, enemies: ['slagcolt', 'silveredmonk'] },
      { weight: 18, enemies: ['glasswort', 'shardswarm'] },
      { weight: 12, enemies: ['refractor', 'prismwing'] },
    ],
  },
  glass_reach_deep: {
    rate: 28, terrain: 'marble', scenery: 'none',
    groups: [
      { weight: 28, enemies: ['panewalker', 'kilnwidow'] },
      { weight: 24, enemies: ['silveredmonk', 'slagcolt'] },
      { weight: 20, enemies: ['refractor', 'refractor', 'fulgurite'] },
      { weight: 16, enemies: ['kilnwidow', 'glasswort'] },
      { weight: 12, enemies: ['panewalker', 'prismwing', 'mirrorhusk'] },
    ],
  },
  hollow_meridian: {
    rate: 26, terrain: 'dirt', scenery: 'field',
    groups: [
      { weight: 26, enemies: ['hourhand', 'vespermoth'] },
      { weight: 24, enemies: ['deadreckoner', 'vespermoth', 'vespermoth'] },
      { weight: 20, enemies: ['tollbriar', 'hushhound'] },
      { weight: 18, enemies: ['stoppedman', 'hourhand'] },
      { weight: 12, enemies: ['latecomer'] },
    ],
  },
  hollow_meridian_late: {
    rate: 28, terrain: 'dirt', scenery: 'none',
    groups: [
      { weight: 28, enemies: ['quarterhusk', 'hushhound', 'hushhound'] },
      { weight: 24, enemies: ['noonwidow', 'latecomer'] },
      { weight: 20, enemies: ['lastbell'] },
      { weight: 16, enemies: ['stoppedman', 'stoppedman', 'deadreckoner'] },
      { weight: 12, enemies: ['lastbell', 'quarterhusk'] },
    ],
  },
  sunken_verge: {
    rate: 28, terrain: 'cave', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['bulwarkshell', 'vergestandard'] },
      { weight: 24, enemies: ['vergepike', 'vergepike', 'chorister'] },
      { weight: 20, enemies: ['stonelayer', 'vergestandard'] },
      { weight: 18, enemies: ['bulwarkshell', 'deepcantor'] },
      { weight: 12, enemies: ['rimhound', 'rimhound', 'chorister'] },
    ],
  },
  sunken_verge_rim: {
    rate: 30, terrain: 'cave', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['vergeknight', 'hollowherald'] },
      { weight: 24, enemies: ['keelworm', 'deepcantor'] },
      { weight: 20, enemies: ['vergeknight', 'bulwarkshell', 'vergepike'] },
      { weight: 18, enemies: ['rimhound', 'hollowherald'] },
      { weight: 12, enemies: ['keelworm', 'stonelayer'] },
    ],
  },
  undermarch: {
    rate: 30, terrain: 'cave', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['shalestalker', 'deadweight'] },
      { weight: 24, enemies: ['spallmoth', 'spallmoth', 'boringengine'] },
      { weight: 20, enemies: ['chalkwight', 'shalestalker'] },
      { weight: 18, enemies: ['slipknave', 'deadweight'] },
      { weight: 12, enemies: ['dampener', 'crevicehound'] },
    ],
  },
  undermarch_deep: {
    rate: 32, terrain: 'cave', scenery: 'cave',
    groups: [
      { weight: 26, enemies: ['pitprop', 'crevicehound'] },
      { weight: 24, enemies: ['nightshift', 'slipknave'] },
      { weight: 20, enemies: ['dampener', 'spallmoth', 'spallmoth'] },
      { weight: 18, enemies: ['nightshift', 'pitprop'] },
      { weight: 12, enemies: ['boringengine', 'chalkwight', 'shalestalker'] },
    ],
  },
  aether_shelf: {
    rate: 26, terrain: 'snow', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['tithewisp', 'tithewisp', 'quietingbell'] },
      { weight: 24, enemies: ['mendicant', 'veinmoth'] },
      { weight: 20, enemies: ['arrearswight', 'tithewisp'] },
      { weight: 18, enemies: ['shelfhound', 'shelfhound', 'veinmoth'] },
      { weight: 12, enemies: ['wellspinner', 'mendicant'] },
    ],
  },
  aether_shelf_inner: {
    rate: 28, terrain: 'snow', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['theauditor', 'emptyvessel'] },
      { weight: 24, enemies: ['emptyvessel', 'wellspinner'] },
      { weight: 20, enemies: ['thecollector'] },
      { weight: 18, enemies: ['arrearswight', 'arrearswight', 'quietingbell'] },
      { weight: 12, enemies: ['thecollector', 'theauditor'] },
    ],
  },
  long_silence: {
    rate: 32, terrain: 'cave', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['unwoundman', 'unmadehound'] },
      { weight: 24, enemies: ['hollowchoir', 'blankface'] },
      { weight: 20, enemies: ['quietengine', 'unlitmoth'] },
      { weight: 18, enemies: ['unmadehound', 'unmadehound', 'unwoundman'] },
      { weight: 12, enemies: ['stillwidow', 'hollowchoir'] },
    ],
  },
  long_silence_edge: {
    rate: 34, terrain: 'cave', scenery: 'none',
    groups: [
      { weight: 26, enemies: ['deadorchard', 'stillwidow'] },
      { weight: 24, enemies: ['marrowsaint', 'blankface'] },
      { weight: 20, enemies: ['edgewalker'] },
      { weight: 18, enemies: ['quietengine', 'marrowsaint'] },
      { weight: 12, enemies: ['edgewalker', 'unlitmoth', 'unlitmoth'] },
    ],
  },
};
