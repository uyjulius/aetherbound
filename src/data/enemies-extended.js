/**
 * Bestiary, part two.
 *
 * Kept in its own module so the core file stays readable. Everything here is
 * merged into ENEMIES/ENCOUNTERS at import time.
 *
 * Regions are designed as *difficulty bands with identities*, not just bigger
 * numbers: the Marrowfields teach elemental weakness, the Weeping Wood teaches
 * status management, the Cinderspine teaches resistance, and Solmere's
 * machines are immune to almost every status so the player has to actually
 * fight rather than lock things down.
 */

export const EXTRA_ENEMIES = {
  // ======================= the Marrowfields (Lv 8-14) =====================
  fieldhusk: {
    id: 'fieldhusk', name: 'Field Husk', level: 9,
    look: { plan: 'undead', scale: 0.95, color: '#bda98b', accent: '#4d422a', weapon: 'sword', eyeColor: '#94bf55' },
    stats: { hp: 210, mp: 18, atk: 48, def: 62, mag: 16, mdef: 34, spd: 24, eva: 6, lck: 8 },
    affinity: { fire: 'weak', holy: 'weak', shadow: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse'],
    exp: 58, gold: 52, drops: [{ id: 'potion', chance: 0.2 }],
    steal: [{ id: 'antidote', chance: 0.3 }],
    ai: [{ if: 'always', do: { kind: 'attack' } }],
  },
  glasswing: {
    id: 'glasswing', name: 'Glasswing', level: 8,
    look: { plan: 'avian', scale: 0.55, color: '#9ccdd4', accent: '#4d8493', eyeColor: '#ffd76a' },
    stats: { hp: 96, mp: 40, atk: 30, def: 30, mag: 34, mdef: 48, spd: 52, eva: 40, lck: 24 },
    affinity: { bolt: 'weak', wind: 'absorb' },
    exp: 40, gold: 44, drops: [{ id: 'tonic', chance: 0.15 }],
    steal: [{ id: 'tonic', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'galecut' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  furrowhound: {
    id: 'furrowhound', name: 'Furrow Hound', level: 10,
    look: { plan: 'quadruped', scale: 1.05, color: '#6b5d37', accent: '#332c1c', eyeColor: '#ff7a2f', spines: true },
    stats: { hp: 246, mp: 0, atk: 58, def: 72, mag: 10, mdef: 28, spd: 42, eva: 18, lck: 16 },
    affinity: { earth: 'resist', ice: 'weak' },
    exp: 72, gold: 58, drops: [{ id: 'hipotion', chance: 0.1 }],
    steal: [{ id: 'potion', chance: 0.35 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: 'Run Down', power: 1.7 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  chaffgolem: {
    id: 'chaffgolem', name: 'Chaff Golem', level: 12,
    look: { plan: 'plant', scale: 1.15, color: '#8d7c4a', accent: '#6b5d37', eyeColor: '#e0574f' },
    stats: { hp: 380, mp: 30, atk: 66, def: 96, mag: 22, mdef: 40, spd: 14, eva: 2, lck: 6 },
    affinity: { fire: 'weak', bolt: 'resist', earth: 'absorb' },
    immune: ['sleep', 'confuse', 'charm'],
    exp: 96, gold: 84, drops: [{ id: 'balm', chance: 0.14 }],
    steal: [{ id: 'balm', chance: 0.25 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Threshing', power: 1.5, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  tollman: {
    id: 'tollman', name: 'Road Tollman', level: 11,
    look: { plan: 'humanoid', scale: 1.05, color: '#96603f', accent: '#3a2226', metal: '#666c74', weapon: 'axe', armored: true, eyeColor: '#e0574f' },
    stats: { hp: 300, mp: 24, atk: 62, def: 86, mag: 14, mdef: 30, spd: 28, eva: 10, lck: 18 },
    affinity: {},
    exp: 88, gold: 165, drops: [{ id: 'guardsabre', chance: 0.05 }],
    steal: [{ id: 'ironhelm', chance: 0.12 }, { id: 'potion', chance: 0.3 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Collect In Full', power: 2.0 } },
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Shield Bash', power: 0.9, status: { paralysis: 40 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Weeping Wood (Lv 13-19) ====================
  lanternmoth: {
    id: 'lanternmoth', name: 'Lantern Moth', level: 14,
    look: { plan: 'avian', scale: 0.7, color: '#ab8018', accent: '#4a3308', eyeColor: '#f7d968' },
    stats: { hp: 208, mp: 60, atk: 44, def: 54, mag: 46, mdef: 62, spd: 48, eva: 32, lck: 22 },
    affinity: { fire: 'absorb', ice: 'weak' },
    exp: 104, gold: 96, drops: [{ id: 'echoherb', chance: 0.2 }],
    steal: [{ id: 'emberflask', chance: 0.18 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'lull', target: 'all' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'ember' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  hollybound: {
    id: 'hollybound', name: 'Hollybound', level: 15,
    look: { plan: 'plant', scale: 1.0, color: '#4b382d', accent: '#213629', eyeColor: '#94bf55' },
    stats: { hp: 420, mp: 70, atk: 70, def: 92, mag: 52, mdef: 66, spd: 22, eva: 6, lck: 12 },
    affinity: { fire: 'weak', water: 'absorb', poison: 'immune' },
    immune: ['poison', 'blind'],
    exp: 132, gold: 110, drops: [{ id: 'hipotion', chance: 0.18 }],
    steal: [{ id: 'panacea', chance: 0.1 }],
    ai: [
      { if: 'hpBelow', v: 0.45, do: { kind: 'spell', spell: 'blight', target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Bindroot', power: 1.2, status: { stop: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  mourner: {
    id: 'mourner', name: 'The Mourner', level: 17,
    look: { plan: 'floater', scale: 0.95, color: '#4e4a52', eyeColor: '#dedbe0', eyeCount: 2, tendrils: true },
    stats: { hp: 352, mp: 120, atk: 40, def: 66, mag: 74, mdef: 96, spd: 40, eva: 28, lck: 20 },
    affinity: { holy: 'weak', shadow: 'absorb', physical: 'resist' },
    immune: ['ko', 'poison', 'sleep'],
    exp: 168, gold: 150, drops: [{ id: 'hitonic', chance: 0.16 }],
    steal: [{ id: 'echoherb', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hush', target: 'all' } },
      { if: 'random', p: 0.35, do: { kind: 'spell', spell: 'leech' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  bramblecolt: {
    id: 'bramblecolt', name: 'Bramblecolt', level: 16,
    look: { plan: 'quadruped', scale: 1.15, color: '#2f4a36', accent: '#16241d', eyeColor: '#ffe45e', spines: true },
    stats: { hp: 400, mp: 30, atk: 82, def: 88, mag: 26, mdef: 48, spd: 50, eva: 24, lck: 18 },
    affinity: { fire: 'weak', wind: 'resist' },
    exp: 150, gold: 128, drops: [{ id: 'hipotion', chance: 0.16 }],
    steal: [{ id: 'swiftband', chance: 0.06 }],
    ai: [
      { if: 'hpBelow', v: 0.5, do: { kind: 'attack', name: 'Goring Charge', power: 1.9 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Cinderspine (Lv 18-26) =====================
  rimewalker: {
    id: 'rimewalker', name: 'Rimewalker', level: 20,
    look: { plan: 'humanoid', scale: 1.15, color: '#c6cedb', accent: '#37606f', helmet: true, weapon: 'spear', eyeColor: '#9ccdd4' },
    stats: { hp: 520, mp: 90, atk: 96, def: 118, mag: 54, mdef: 82, spd: 34, eva: 12, lck: 14 },
    affinity: { fire: 'weak', ice: 'absorb', water: 'resist' },
    immune: ['freeze'],
    exp: 220, gold: 210, drops: [{ id: 'towershield', chance: 0.08 }],
    steal: [{ id: 'hipotion', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hoarfrost' } },
      { if: 'random', p: 0.2, do: { kind: 'attack', name: 'Frost Lance', power: 1.4, element: 'ice', status: { freeze: 30 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  scarpdrake: {
    id: 'scarpdrake', name: 'Scarp Drake', level: 23,
    look: { plan: 'avian', scale: 1.25, color: '#5f6572', accent: '#2f3038', eyeColor: '#ff7a2f' },
    stats: { hp: 720, mp: 110, atk: 118, def: 126, mag: 66, mdef: 88, spd: 46, eva: 20, lck: 16 },
    affinity: { ice: 'weak', wind: 'absorb', earth: 'immune' },
    exp: 300, gold: 320, drops: [{ id: 'xpotion', chance: 0.12 }],
    steal: [{ id: 'ashenkatana', chance: 0.05 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: 'Downdraught', power: 1.8, element: 'wind', target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'galecut' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  cairnwight: {
    id: 'cairnwight', name: 'Cairn Wight', level: 22,
    look: { plan: 'undead', scale: 1.2, color: '#a2acbb', accent: '#25404e', weapon: 'axe', eyeColor: '#3fc6d6' },
    stats: { hp: 640, mp: 100, atk: 108, def: 122, mag: 62, mdef: 90, spd: 30, eva: 8, lck: 10 },
    affinity: { holy: 'weak', fire: 'resist', ice: 'resist', shadow: 'absorb' },
    immune: ['poison', 'sleep', 'confuse', 'doom', 'ko'],
    exp: 280, gold: 268, drops: [{ id: 'softstone', chance: 0.2 }],
    steal: [{ id: 'crownofsalt', chance: 0.04 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'ossify' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  frostmaul: {
    id: 'frostmaul', name: 'Frostmaul', level: 25,
    look: { plan: 'blob', scale: 1.5, color: '#6fa9b4', accent: '#25404e', eyeColor: '#e8edf5', eyeCount: 3 },
    stats: { hp: 880, mp: 80, atk: 122, def: 108, mag: 74, mdef: 94, spd: 20, eva: 4, lck: 8 },
    affinity: { fire: 'weak', ice: 'absorb', physical: 'resist' },
    immune: ['freeze', 'poison', 'ko'],
    exp: 360, gold: 380, drops: [{ id: 'xpotion', chance: 0.16 }],
    steal: [{ id: 'wardstone', chance: 0.12 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'spell', spell: 'glaciate' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Crushing Cold', power: 1.6, element: 'ice' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= Solmere & the Engine (Lv 20-30) ================
  gearwright: {
    id: 'gearwright', name: 'Gearwright', level: 21,
    look: { plan: 'construct', scale: 0.85, color: '#8a6a23', accent: '#3b2c12', eyeColor: '#f7d968' },
    stats: { hp: 480, mp: 60, atk: 92, def: 134, mag: 48, mdef: 76, spd: 26, eva: 4, lck: 6 },
    affinity: { bolt: 'weak', water: 'weak', poison: 'immune', shadow: 'resist' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'charm'],
    exp: 236, gold: 300, drops: [{ id: 'shrapnel', chance: 0.2 }],
    steal: [{ id: 'ironbrooch', chance: 0.1 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Piston Drive', power: 1.5 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  aetherleech: {
    id: 'aetherleech', name: 'Aether Leech', level: 24,
    look: { plan: 'floater', scale: 0.8, color: '#12566b', eyeColor: '#3fc6d6', eyeCount: 1, tendrils: true },
    stats: { hp: 560, mp: 200, atk: 70, def: 92, mag: 96, mdef: 120, spd: 44, eva: 30, lck: 26 },
    affinity: { aether: 'absorb', bolt: 'resist', holy: 'weak' },
    exp: 310, gold: 340, drops: [{ id: 'hitonic', chance: 0.22 }],
    steal: [{ id: 'focusring', chance: 0.08 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'siphon' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'hollow' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  magitekarmour: {
    id: 'magitekarmour', name: 'Magitek Armour', level: 26,
    look: { plan: 'construct', scale: 1.35, color: '#414954', accent: '#22242a', eyeColor: '#3fc6d6', cannons: true },
    stats: { hp: 1040, mp: 120, atk: 132, def: 158, mag: 88, mdef: 108, spd: 30, eva: 4, lck: 6 },
    affinity: { bolt: 'weak', water: 'weak', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'ko', 'stone'],
    exp: 470, gold: 620, drops: [{ id: 'guardplate', chance: 0.08 }],
    steal: [{ id: 'shrapnel', chance: 0.3 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Cinder Sweep', power: 1.9, element: 'fire', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Lance Battery', power: 1.5, element: 'bolt' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  vaultsentinel: {
    id: 'vaultsentinel', name: 'Vault Sentinel', level: 28,
    look: { plan: 'construct', scale: 1.1, color: '#a6b0bc', accent: '#2b3038', eyeColor: '#d63fb3', treads: true },
    stats: { hp: 1180, mp: 160, atk: 138, def: 176, mag: 96, mdef: 132, spd: 22, eva: 2, lck: 4 },
    affinity: { bolt: 'weak', earth: 'resist', poison: 'immune', shadow: 'resist' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'ko', 'stone', 'doom'],
    exp: 560, gold: 760, drops: [{ id: 'mirrorshield', chance: 0.06 }],
    steal: [{ id: 'wardstone', chance: 0.2 }],
    ai: [
      { if: 'hpBelow', v: 0.25, do: { kind: 'attack', name: 'Purge Protocol', power: 2.3, target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'arrest' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= the Drowned Coast (Lv 15-22) ===================
  tidechanter: {
    id: 'tidechanter', name: 'Tide Chanter', level: 18,
    look: { plan: 'humanoid', scale: 1.0, color: '#6fa9b4', accent: '#1a3c48', weapon: 'staff', eyeColor: '#96f0f5' },
    stats: { hp: 380, mp: 140, atk: 58, def: 76, mag: 88, mdef: 104, spd: 38, eva: 18, lck: 22 },
    affinity: { bolt: 'weak', water: 'absorb', ice: 'resist' },
    exp: 178, gold: 190, drops: [{ id: 'hitonic', chance: 0.18 }],
    steal: [{ id: 'silkrobe', chance: 0.08 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'brine', target: 'all' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'mendra' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  shellback: {
    id: 'shellback', name: 'Shellback', level: 17,
    look: { plan: 'insect', scale: 1.3, legs: 6, color: '#5b6674', accent: '#357c8c', eyeColor: '#ffd76a', stinger: false },
    stats: { hp: 520, mp: 20, atk: 78, def: 148, mag: 20, mdef: 56, spd: 16, eva: 2, lck: 8 },
    affinity: { bolt: 'weak', physical: 'resist', water: 'absorb' },
    exp: 160, gold: 140, drops: [{ id: 'woodshield', chance: 0.12 }],
    steal: [{ id: 'towershield', chance: 0.05 }],
    ai: [
      { if: 'hpBelow', v: 0.5, do: { kind: 'attack', name: 'Shell Guard', power: 0.6, status: { protect: 100 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  gullkin: {
    id: 'gullkin', name: 'Gullkin Raider', level: 16,
    look: { plan: 'avian', scale: 0.9, color: '#dedbe0', accent: '#5f6572', eyeColor: '#ffd76a' },
    stats: { hp: 300, mp: 40, atk: 76, def: 70, mag: 30, mdef: 50, spd: 60, eva: 38, lck: 30 },
    affinity: { bolt: 'weak', wind: 'resist' },
    exp: 140, gold: 175, drops: [{ id: 'potion', chance: 0.25 }],
    steal: [{ id: 'thiefsknife', chance: 0.05 }, { id: 'potion', chance: 0.3 }],
    ai: [
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Snatch', power: 0.8, drain: true } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ======================= Ashenhall (Lv 24-32) ===========================
  lanternbearer: {
    id: 'lanternbearer', name: 'Lantern Bearer', level: 26,
    look: { plan: 'undead', scale: 1.05, color: '#ddccab', accent: '#4a4324', weapon: 'staff', eyeColor: '#fff3b8' },
    stats: { hp: 760, mp: 220, atk: 96, def: 128, mag: 112, mdef: 140, spd: 36, eva: 14, lck: 18 },
    affinity: { shadow: 'weak', holy: 'absorb', fire: 'resist' },
    immune: ['poison', 'sleep', 'blind', 'ko'],
    exp: 430, gold: 480, drops: [{ id: 'lanternstaff', chance: 0.1 }],
    steal: [{ id: 'scholarhood', chance: 0.12 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'sanctus' } },
      { if: 'random', p: 0.25, do: { kind: 'spell', spell: 'mendaga' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  ashknight: {
    id: 'ashknight', name: 'Knight of Ash', level: 29,
    look: { plan: 'undead', scale: 1.25, color: '#918f98', accent: '#2b2933', weapon: 'sword', armored: true, helmet: true, eyeColor: '#e0574f' },
    stats: { hp: 1120, mp: 90, atk: 158, def: 182, mag: 60, mdef: 104, spd: 38, eva: 12, lck: 12 },
    affinity: { holy: 'weak', shadow: 'resist', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'ko', 'stone'],
    exp: 620, gold: 720, drops: [{ id: 'wardenmail', chance: 0.04 }],
    steal: [{ id: 'ashenkatana', chance: 0.1 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Oathbreaker', power: 2.2 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Cleave', power: 1.5, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
  reliquary: {
    id: 'reliquary', name: 'Walking Reliquary', level: 27,
    look: { plan: 'construct', scale: 1.0, color: '#d8ac31', accent: '#4a3308', eyeColor: '#fff3b8' },
    stats: { hp: 900, mp: 180, atk: 104, def: 190, mag: 108, mdef: 168, spd: 24, eva: 4, lck: 30 },
    affinity: { shadow: 'weak', holy: 'absorb', physical: 'resist' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'ko', 'stone'],
    exp: 540, gold: 900, drops: [{ id: 'elixir', chance: 0.1 }],
    steal: [{ id: 'lastlight', chance: 0.05 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'benediction' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ============================== bosses ==================================
  tollbaron: {
    id: 'tollbaron', name: 'The Toll Baron', level: 14, boss: true,
    look: { plan: 'humanoid', scale: 1.5, color: '#96603f', accent: '#5a3230', metal: '#8a6a23', weapon: 'axe', armored: true, helmet: true, eyeColor: '#e0574f' },
    stats: { hp: 2100, mp: 120, atk: 92, def: 118, mag: 36, mdef: 62, spd: 32, eva: 10, lck: 16 },
    affinity: { bolt: 'weak' },
    immune: ['ko', 'stone', 'sleep', 'doom', 'stop'],
    exp: 900, gold: 1600, drops: [{ id: 'longspear', chance: 1.0 }],
    steal: [{ id: 'ironbrooch', chance: 0.4 }],
    intro: 'The road is mine. The toll is everything you carry.',
    ai: [
      { if: 'hpBelow', v: 0.25, phase: 2, do: { kind: 'attack', name: 'Nothing Left', power: 2.4, target: 'all' } },
      { if: 'hpBelow', v: 0.55, do: { kind: 'attack', name: 'Ruinous Swing', power: 1.9 } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Iron Boot', power: 1.3, status: { paralysis: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  greenmother_guardian: {
    id: 'greenmother_guardian', name: 'The Standing Oak', level: 19, boss: true,
    look: { plan: 'plant', scale: 1.9, color: '#4b382d', accent: '#2f4a36', eyeColor: '#ffe45e' },
    stats: { hp: 3200, mp: 260, atk: 104, def: 142, mag: 88, mdef: 96, spd: 20, eva: 4, lck: 10 },
    affinity: { fire: 'weak', water: 'absorb', earth: 'immune', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'poison', 'doom', 'confuse'],
    exp: 1700, gold: 2400, drops: [{ id: 'aetherweave', chance: 0.2 }],
    steal: [{ id: 'balm', chance: 0.5 }, { id: 'focusring', chance: 0.12 }],
    intro: 'You are very young, and you are standing on my roots.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'attack', name: 'Winter Comes Early', power: 2.5, target: 'all' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'spell', spell: 'renewal' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Root Cage', power: 1.4, status: { stop: 50 }, target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'blight', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  cinderwyrm: {
    id: 'cinderwyrm', name: 'The Cinder Wyrm', level: 27, boss: true,
    look: { plan: 'avian', scale: 2.1, color: '#7d4436', accent: '#3a2226', eyeColor: '#ff7a2f' },
    stats: { hp: 4800, mp: 320, atk: 152, def: 168, mag: 120, mdef: 128, spd: 44, eva: 16, lck: 18 },
    affinity: { ice: 'weak', fire: 'absorb', wind: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'freeze'],
    exp: 3200, gold: 4800, drops: [{ id: 'emberbrand', chance: 1.0 }],
    steal: [{ id: 'xpotion', chance: 0.4 }, { id: 'twinfang', chance: 0.08 }],
    intro: 'It does not roar. It inhales, and the pass goes dark.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'attack', name: 'Everything Burns', power: 2.8, element: 'fire', target: 'all' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'spell', spell: 'conflagrate' } },
      { if: 'turnEvery', n: 4, do: { kind: 'attack', name: 'Wingstorm', power: 1.7, element: 'wind', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Rake', power: 1.6 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  eighthlantern: {
    id: 'eighthlantern', name: 'The Eighth Lantern', level: 30, boss: true,
    look: { plan: 'floater', scale: 1.7, color: '#ddccab', eyeColor: '#fff3b8', eyeCount: 2, tendrils: true },
    stats: { hp: 5600, mp: 400, atk: 128, def: 154, mag: 138, mdef: 172, spd: 46, eva: 22, lck: 24 },
    affinity: { shadow: 'weak', holy: 'absorb', fire: 'resist', physical: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence', 'blind'],
    exp: 4600, gold: 6200, drops: [{ id: 'lastlight', chance: 1.0 }],
    steal: [{ id: 'megalixir', chance: 0.3 }, { id: 'scholarhood', chance: 0.2 }],
    intro: 'Eight of us went out. I did not go out. I went looking.',
    ai: [
      { if: 'hpBelow', v: 0.18, phase: 3, do: { kind: 'spell', spell: 'benediction' } },
      { if: 'hpBelow', v: 0.45, phase: 2, do: { kind: 'attack', name: 'Long Vigil', power: 2.2, element: 'holy', target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'ossify' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'sanctus' } },
      { if: 'random', p: 0.2, do: { kind: 'spell', spell: 'dispel' } },
      { if: 'always', do: { kind: 'attack', name: 'Lamplight', power: 1.4, element: 'holy' } },
    ],
  },

  enginewarden: {
    id: 'enginewarden', name: 'Warden of the Ninth Well', level: 32, boss: true,
    look: { plan: 'construct', scale: 2.0, color: '#5b6674', accent: '#12566b', eyeColor: '#d63fb3', cannons: true },
    stats: { hp: 7200, mp: 480, atk: 178, def: 206, mag: 150, mdef: 176, spd: 40, eva: 8, lck: 12 },
    affinity: { bolt: 'weak', water: 'weak', aether: 'absorb', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'silence', 'poison', 'blind'],
    exp: 6400, gold: 9000, drops: [{ id: 'aetherglass', chance: 1.0 }],
    steal: [{ id: 'megalixir', chance: 0.25 }, { id: 'earnestcharm', chance: 0.1 }],
    intro: 'QUERY: WHY DID YOU WAKE ME. RESPONSE WINDOW: EXPIRED.',
    ai: [
      { if: 'hpBelow', v: 0.15, phase: 4, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.35, phase: 3, do: { kind: 'attack', name: 'Wellspring', power: 2.6, element: 'aether', target: 'all' } },
      { if: 'hpBelow', v: 0.65, phase: 2, do: { kind: 'spell', spell: 'arrest', target: 'all' } },
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Lance Array', power: 1.8, element: 'bolt', target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },
};

export const EXTRA_ENCOUNTERS = {
  marrowfields: {
    rate: 26, terrain: 'grass', scenery: 'field',
    groups: [
      { weight: 28, enemies: ['fieldhusk', 'fenrat', 'fenrat'] },
      { weight: 24, enemies: ['furrowhound', 'furrowhound'] },
      { weight: 20, enemies: ['glasswing', 'glasswing', 'glasswing'] },
      { weight: 16, enemies: ['tollman', 'brigandarcher'] },
      { weight: 12, enemies: ['chaffgolem'] },
    ],
  },
  weeping_wood: {
    rate: 24, terrain: 'grass', scenery: 'field',
    groups: [
      { weight: 26, enemies: ['hollybound', 'lanternmoth'] },
      { weight: 24, enemies: ['bramblecolt', 'bramblecolt'] },
      { weight: 20, enemies: ['mourner'] },
      { weight: 18, enemies: ['lanternmoth', 'lanternmoth', 'glasswing'] },
      { weight: 12, enemies: ['hollybound', 'hollybound'] },
    ],
  },
  cinderspine: {
    rate: 28, terrain: 'snow', scenery: 'snow',
    groups: [
      { weight: 28, enemies: ['rimewalker', 'rimewalker'] },
      { weight: 22, enemies: ['frostmaul'] },
      { weight: 20, enemies: ['cairnwight', 'rimewalker'] },
      { weight: 18, enemies: ['scarpdrake'] },
      { weight: 12, enemies: ['frostmaul', 'rimewalker', 'rimewalker'] },
    ],
  },
  solmere_works: {
    rate: 24, terrain: 'cobble', scenery: 'none',
    groups: [
      { weight: 30, enemies: ['gearwright', 'gearwright'] },
      { weight: 24, enemies: ['aetherleech', 'gearwright'] },
      { weight: 20, enemies: ['magitekarmour'] },
      { weight: 16, enemies: ['vaultsentinel'] },
      { weight: 10, enemies: ['aetherleech', 'aetherleech', 'aetherleech'] },
    ],
  },
  drowned_coast: {
    rate: 22, terrain: 'sand', scenery: 'field',
    groups: [
      { weight: 30, enemies: ['gullkin', 'gullkin', 'gullkin'] },
      { weight: 24, enemies: ['shellback', 'shellback'] },
      { weight: 22, enemies: ['tidechanter', 'gullkin'] },
      { weight: 14, enemies: ['tidechanter', 'shellback'] },
      { weight: 10, enemies: ['carrionbat', 'gullkin', 'gullkin'] },
    ],
  },
  ashenhall: {
    rate: 26, terrain: 'marble', scenery: 'none',
    groups: [
      { weight: 28, enemies: ['lanternbearer', 'huskrevenant'] },
      { weight: 24, enemies: ['ashknight'] },
      { weight: 20, enemies: ['reliquary'] },
      { weight: 16, enemies: ['ashknight', 'lanternbearer'] },
      { weight: 12, enemies: ['cairnwight', 'cairnwight'] },
    ],
  },
};
