import { EXTRA_ENEMIES, EXTRA_ENCOUNTERS } from './enemies-extended.js';
import { VOL3_ENEMIES, VOL3_ENCOUNTERS } from './enemies-vol3.js';
import { VOL4_ENEMIES, VOL4_ENCOUNTERS } from './enemies-vol4.js';

/**
 * The bestiary.
 *
 * `look` feeds buildMonster. `ai` is a script: a list of rules evaluated top to
 * bottom each turn, first match wins. That keeps behaviour readable and lets
 * bosses have real phases without a scripting language.
 *
 * Rule conditions: hpBelow, turnEvery, turnIs, hasStatus, allyDown, always,
 *                  phase, selfHpBelow, partyHasStatus, random
 */

export const ENEMIES = {
  // ======================= Silt Road / Harrowmere fields ==================
  mireslug: {
    id: 'mireslug', name: 'Mire Slug', level: 3,
    look: { plan: 'blob', scale: 0.85, color: '#487028', accent: '#2e4a1c', eyeColor: '#dbc891' },
    stats: { hp: 62, mp: 0, atk: 14, def: 28, mag: 6, mdef: 20, spd: 12, eva: 2, lck: 6 },
    affinity: { fire: 'weak', water: 'resist', poison: 'immune' },
    exp: 12, gold: 14, drops: [{ id: 'potion', chance: 0.16 }, { id: 'antidote', chance: 0.10 }],
    steal: [{ id: 'antidote', chance: 0.35 }],
    ai: [
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Acid Spray', power: 1.1, element: 'poison', status: { poison: 35 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  fenrat: {
    id: 'fenrat', name: 'Fen Rat', level: 2,
    look: { plan: 'quadruped', scale: 0.55, color: '#5a4433', accent: '#37271f', eyeColor: '#e0574f' },
    stats: { hp: 38, mp: 0, atk: 16, def: 20, mag: 4, mdef: 14, spd: 26, eva: 8, lck: 10 },
    affinity: {},
    exp: 8, gold: 9, drops: [{ id: 'potion', chance: 0.12 }],
    steal: [{ id: 'potion', chance: 0.30 }],
    ai: [{ if: 'always', do: { kind: 'attack' } }],
  },

  reedstalker: {
    id: 'reedstalker', name: 'Reed Stalker', level: 4,
    look: { plan: 'insect', scale: 0.8, legs: 6, color: '#3f4c2c', accent: '#94bf55', eyeColor: '#ffe45e', stinger: false },
    stats: { hp: 74, mp: 12, atk: 22, def: 32, mag: 12, mdef: 24, spd: 30, eva: 14, lck: 12 },
    affinity: { fire: 'weak', wind: 'resist' },
    exp: 18, gold: 20, drops: [{ id: 'potion', chance: 0.18 }],
    steal: [{ id: 'eyedrops', chance: 0.30 }],
    ai: [
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'dimming' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  siltcrawler: {
    id: 'siltcrawler', name: 'Silt Crawler', level: 5,
    look: { plan: 'insect', scale: 1.0, legs: 8, color: '#6b5d37', accent: '#8d7c4a', eyeColor: '#ff7a2f', stinger: true },
    stats: { hp: 108, mp: 20, atk: 30, def: 44, mag: 14, mdef: 28, spd: 24, eva: 8, lck: 10 },
    affinity: { ice: 'weak', earth: 'resist' },
    exp: 28, gold: 32, drops: [{ id: 'antidote', chance: 0.22 }, { id: 'hipotion', chance: 0.05 }],
    steal: [{ id: 'boltdirk', chance: 0.08 }, { id: 'antidote', chance: 0.30 }],
    ai: [
      { if: 'hpBelow', v: 0.4, do: { kind: 'attack', name: 'Barb Sting', power: 1.5, status: { venom: 50 } } },
      { if: 'random', p: 0.2, do: { kind: 'attack', name: 'Barb Sting', power: 1.3, status: { poison: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  roadwolf: {
    id: 'roadwolf', name: 'Road Wolf', level: 6,
    look: { plan: 'quadruped', scale: 0.95, color: '#4e515e', accent: '#26262e', eyeColor: '#ffd76a', spines: false },
    stats: { hp: 132, mp: 0, atk: 38, def: 48, mag: 8, mdef: 22, spd: 38, eva: 16, lck: 14 },
    affinity: { ice: 'resist' },
    exp: 34, gold: 30, drops: [{ id: 'potion', chance: 0.2 }],
    steal: [{ id: 'potion', chance: 0.4 }],
    ai: [
      { if: 'allyDown', do: { kind: 'attack', name: 'Frenzy', power: 1.6 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  bogwisp: {
    id: 'bogwisp', name: 'Bog Wisp', level: 5,
    look: { plan: 'floater', scale: 0.7, color: '#2f4a36', eyeColor: '#94bf55', eyeCount: 1, tendrils: true },
    stats: { hp: 76, mp: 60, atk: 14, def: 24, mag: 30, mdef: 52, spd: 32, eva: 30, lck: 18 },
    affinity: { fire: 'weak', shadow: 'absorb', physical: 'resist' },
    exp: 30, gold: 40, drops: [{ id: 'tonic', chance: 0.14 }],
    steal: [{ id: 'tonic', chance: 0.25 }],
    ai: [
      { if: 'turnEvery', n: 2, do: { kind: 'spell', spell: 'ember' } },
      { if: 'random', p: 0.3, do: { kind: 'spell', spell: 'lull' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  brigand: {
    id: 'brigand', name: 'Silt Road Brigand', level: 7,
    look: { plan: 'humanoid', scale: 1.0, color: '#9a6147', accent: '#5a3230', metal: '#5b6674', weapon: 'sword', eyeColor: '#e0574f' },
    stats: { hp: 168, mp: 10, atk: 44, def: 58, mag: 10, mdef: 26, spd: 30, eva: 12, lck: 16 },
    affinity: {},
    exp: 44, gold: 85, drops: [{ id: 'potion', chance: 0.25 }, { id: 'ironsword', chance: 0.04 }],
    steal: [{ id: 'potion', chance: 0.3 }, { id: 'ironsword', chance: 0.06 }],
    ai: [
      { if: 'hpBelow', v: 0.3, do: { kind: 'attack', name: 'Desperate Swing', power: 1.8 } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  brigandarcher: {
    id: 'brigandarcher', name: 'Brigand Archer', level: 7,
    look: { plan: 'humanoid', scale: 0.95, color: '#ac744c', accent: '#3f4a6b', weapon: 'spear', eyeColor: '#ffd76a' },
    stats: { hp: 140, mp: 16, atk: 40, def: 44, mag: 14, mdef: 30, spd: 36, eva: 18, lck: 20 },
    affinity: {},
    exp: 42, gold: 78, drops: [{ id: 'potion', chance: 0.2 }],
    steal: [{ id: 'eyedrops', chance: 0.35 }],
    ai: [
      { if: 'random', p: 0.3, do: { kind: 'attack', name: 'Hamstring', power: 0.9, status: { slow: 45 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  thornmaw: {
    id: 'thornmaw', name: 'Thornmaw', level: 9,
    look: { plan: 'plant', scale: 1.0, color: '#4b382d', accent: '#2f4a36', eyeColor: '#ffe45e' },
    stats: { hp: 240, mp: 40, atk: 52, def: 70, mag: 26, mdef: 40, spd: 16, eva: 4, lck: 8 },
    affinity: { fire: 'weak', water: 'absorb', earth: 'resist' },
    exp: 66, gold: 60, drops: [{ id: 'hipotion', chance: 0.12 }],
    steal: [{ id: 'balm', chance: 0.2 }],
    ai: [
      { if: 'hpBelow', v: 0.5, do: { kind: 'spell', spell: 'blight' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Bramble Lash', power: 1.4, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  carrionbat: {
    id: 'carrionbat', name: 'Carrion Bat', level: 6,
    look: { plan: 'avian', scale: 0.65, color: '#4e326c', accent: '#241636', eyeColor: '#ff7a2f' },
    stats: { hp: 88, mp: 18, atk: 32, def: 34, mag: 18, mdef: 34, spd: 44, eva: 34, lck: 16 },
    affinity: { holy: 'weak', shadow: 'resist' },
    exp: 26, gold: 24, drops: [{ id: 'potion', chance: 0.12 }],
    steal: [{ id: 'potion', chance: 0.25 }],
    ai: [
      { if: 'random', p: 0.25, do: { kind: 'attack', name: 'Bloodletting', power: 1.0, drain: true } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  huskrevenant: {
    id: 'huskrevenant', name: 'Husk Revenant', level: 10,
    look: { plan: 'undead', scale: 1.05, color: '#ddccab', accent: '#2b2933', weapon: 'axe', eyeColor: '#3fc6d6' },
    stats: { hp: 268, mp: 30, atk: 58, def: 76, mag: 22, mdef: 44, spd: 22, eva: 6, lck: 8 },
    affinity: { holy: 'weak', fire: 'weak', shadow: 'absorb', poison: 'immune' },
    immune: ['poison', 'sleep', 'confuse', 'doom'],
    exp: 78, gold: 96, drops: [{ id: 'softstone', chance: 0.15 }],
    steal: [{ id: 'echoherb', chance: 0.3 }],
    ai: [
      { if: 'turnEvery', n: 4, do: { kind: 'spell', spell: 'knell' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  ferransentry: {
    id: 'ferransentry', name: 'Ferran Sentry', level: 11,
    look: { plan: 'construct', scale: 0.9, color: '#5b6674', accent: '#22242a', eyeColor: '#3fc6d6', cannons: false },
    stats: { hp: 320, mp: 40, atk: 62, def: 96, mag: 30, mdef: 60, spd: 20, eva: 2, lck: 4 },
    affinity: { bolt: 'weak', water: 'weak', poison: 'immune', earth: 'resist' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind'],
    exp: 96, gold: 140, drops: [{ id: 'hipotion', chance: 0.18 }],
    steal: [{ id: 'shrapnel', chance: 0.12 }],
    ai: [
      { if: 'hpBelow', v: 0.35, do: { kind: 'attack', name: 'Overload Burst', power: 1.9, element: 'bolt', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Suppression Fire', power: 1.2, target: 'all' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  // ============================== bosses ==================================
  bogfather: {
    id: 'bogfather', name: 'The Bogfather', level: 12, boss: true,
    // The first boss is a lesson, and a lesson that costs nothing teaches
    // nothing. It should take a quarter of the party's health bar before it
    // goes down — enough to make somebody open the item menu for the first
    // time — while staying a fight a level-12 party wins every time.
    look: { plan: 'blob', scale: 1.9, color: '#3f4c2c', accent: '#1d2418', eyeColor: '#ffe45e', eyeCount: 3 },
    stats: { hp: 3000, mp: 180, atk: 85, def: 78, mag: 40, mdef: 62, spd: 22, eva: 4, lck: 10 },
    affinity: { fire: 'weak', ice: 'resist', water: 'absorb', poison: 'immune' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse'],
    exp: 620, gold: 900, drops: [{ id: 'scalecoat', chance: 1.0 }],
    steal: [{ id: 'hipotion', chance: 0.4 }, { id: 'swiftband', chance: 0.08 }],
    intro: 'The water stands up.',
    ai: [
      // The blight rule carries a phase on purpose. Without one it matched
      // every turn below half health, so the whole second act of the game's
      // first boss fight was a power-38 plink — the audit read 9% of the
      // party's health taken, and it was right.
      { if: 'hpBelow', v: 0.25, phase: 3, do: { kind: 'attack', name: 'Drowning Tide', power: 2.2, element: 'water', target: 'all' } },
      { if: 'hpBelow', v: 0.55, phase: 2, do: { kind: 'spell', spell: 'blight', target: 'all' } },
      // Every other turn, not every fourth. A boss the party kills in five
      // turns has no fourth-turn move; the cadence has to fit the fight the
      // damage curve actually allows, or the script is decoration.
      { if: 'turnEvery', n: 2, do: { kind: 'attack', name: 'Engulf', power: 1.6, status: { sleep: 50 } } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'brine' } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  ferranwarden: {
    id: 'ferranwarden', name: 'Ferran Warden', level: 16, boss: true,
    look: { plan: 'construct', scale: 1.5, color: '#414954', accent: '#1a1a22', eyeColor: '#d63fb3', cannons: true, treads: true },
    stats: { hp: 2600, mp: 240, atk: 87, def: 118, mag: 52, mdef: 88, spd: 26, eva: 4, lck: 6 },
    affinity: { bolt: 'weak', water: 'weak', poison: 'immune', shadow: 'resist' },
    immune: ['poison', 'sleep', 'confuse', 'silence', 'blind', 'ko', 'stone', 'doom'],
    exp: 1400, gold: 2200, drops: [{ id: 'guardplate', chance: 1.0 }],
    steal: [{ id: 'shrapnel', chance: 0.5 }, { id: 'ironbrooch', chance: 0.1 }],
    intro: 'IDENTIFY. IDENTIFY. NON-COMPLIANT.',
    ai: [
      { if: 'hpBelow', v: 0.2, phase: 3, do: { kind: 'attack', name: 'Cinder Protocol', power: 2.6, element: 'fire', target: 'all' } },
      { if: 'hpBelow', v: 0.5, phase: 2, do: { kind: 'attack', name: 'Lance Battery', power: 1.9, element: 'bolt', target: 'all' } },
      { if: 'turnEvery', n: 3, do: { kind: 'attack', name: 'Grapnel', power: 1.4, status: { stop: 40 } } },
      { if: 'always', do: { kind: 'attack' } },
    ],
  },

  vhaineshadow: {
    id: 'vhaineshadow', name: 'Vhaine, Unwound', level: 24, boss: true,
    look: { plan: 'humanoid', scale: 1.25, color: '#b8b6bd', accent: '#2c1b4d', metal: '#d8ac31', weapon: 'staff', horns: true, eyeColor: '#d63fb3', eyeCount: 2 },
    stats: { hp: 6000, mp: 600, atk: 152, def: 128, mag: 150, mdef: 120, spd: 42, eva: 14, lck: 30 },
    affinity: { holy: 'weak', shadow: 'absorb', aether: 'resist' },
    immune: ['ko', 'stone', 'sleep', 'stop', 'doom', 'confuse', 'charm', 'silence'],
    exp: 4200, gold: 6000, drops: [{ id: 'aetherweave', chance: 1.0 }],
    steal: [{ id: 'elixir', chance: 0.3 }],
    intro: 'You brought a *sword* to the end of the world?',
    ai: [
      { if: 'hpBelow', v: 0.15, phase: 3, do: { kind: 'spell', spell: 'unlight' } },
      { if: 'hpBelow', v: 0.45, phase: 2, do: { kind: 'spell', spell: 'gravewell' } },
      { if: 'turnEvery', n: 5, do: { kind: 'spell', spell: 'severance' } },
      { if: 'turnEvery', n: 3, do: { kind: 'spell', spell: 'hollow' } },
      { if: 'random', p: 0.2, do: { kind: 'spell', spell: 'addle' } },
      { if: 'always', do: { kind: 'attack', name: 'Contempt', power: 1.3 } },
    ],
  },
};

/**
 * Encounter tables. `groups` are weighted formations; every formation is
 * hand-picked so the player meets deliberate combinations rather than a random
 * soup of whatever is in level range.
 */
export const ENCOUNTERS = {
  siltroad_north: {
    rate: 24,
    groups: [
      { weight: 30, enemies: ['fenrat', 'fenrat'] },
      { weight: 26, enemies: ['mireslug'] },
      { weight: 22, enemies: ['fenrat', 'mireslug', 'fenrat'] },
      { weight: 14, enemies: ['reedstalker', 'fenrat'] },
      { weight: 8, enemies: ['bogwisp'] },
    ],
  },
  siltroad_south: {
    rate: 22,
    groups: [
      { weight: 28, enemies: ['reedstalker', 'reedstalker'] },
      { weight: 24, enemies: ['siltcrawler'] },
      { weight: 20, enemies: ['roadwolf', 'roadwolf'] },
      { weight: 16, enemies: ['brigand', 'brigandarcher'] },
      { weight: 12, enemies: ['bogwisp', 'carrionbat'] },
    ],
  },
  fenmarsh: {
    rate: 20,
    groups: [
      { weight: 30, enemies: ['mireslug', 'mireslug', 'bogwisp'] },
      { weight: 24, enemies: ['thornmaw'] },
      { weight: 22, enemies: ['siltcrawler', 'siltcrawler'] },
      { weight: 14, enemies: ['huskrevenant'] },
      { weight: 10, enemies: ['carrionbat', 'carrionbat', 'carrionbat'] },
    ],
  },
  ferran_road: {
    rate: 26,
    groups: [
      { weight: 34, enemies: ['ferransentry'] },
      { weight: 26, enemies: ['brigand', 'brigand', 'brigandarcher'] },
      { weight: 22, enemies: ['huskrevenant', 'carrionbat'] },
      { weight: 18, enemies: ['ferransentry', 'roadwolf'] },
    ],
  },
};

// The later-region bestiary lives in its own module to keep both files
// readable; it is merged in here so callers only ever see one registry.
Object.assign(ENEMIES, EXTRA_ENEMIES);
Object.assign(ENEMIES, VOL3_ENEMIES);
Object.assign(ENEMIES, VOL4_ENEMIES);
Object.assign(ENCOUNTERS, EXTRA_ENCOUNTERS);
Object.assign(ENCOUNTERS, VOL3_ENCOUNTERS);
Object.assign(ENCOUNTERS, VOL4_ENCOUNTERS);

export function enemyById(id) {
  const e = ENEMIES[id];
  if (!e) console.warn(`[enemies] unknown enemy: ${id}`);
  return e || null;
}

/** Every boss in the game, for the bestiary screen and balance tooling. */
export function allBosses() {
  return Object.values(ENEMIES).filter((e) => e.boss);
}
