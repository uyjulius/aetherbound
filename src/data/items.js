/**
 * Items and equipment.
 *
 * `slot` is where equipment goes; consumables have no slot.
 * `stats` are flat additions; `effects` are named behaviours the battle and
 * field systems check for by string.
 */

import { VOL2_ITEMS, VOL2_SHOPS } from './items-vol2.js';
import { VOL3_ITEMS, VOL3_SHOPS } from './items-vol3.js';

export const ITEMS = {
  // --- consumables: healing ---------------------------------------------
  potion:      { id: 'potion', name: 'Potion', kind: 'consumable', price: 50, sell: 25, target: 'oneAlly', effect: { heal: 120 }, desc: 'Restores 120 HP.' },
  hipotion:    { id: 'hipotion', name: 'Hi-Potion', kind: 'consumable', price: 300, sell: 150, target: 'oneAlly', effect: { heal: 550 }, desc: 'Restores 550 HP.' },
  xpotion:     { id: 'xpotion', name: 'X-Potion', kind: 'consumable', price: 1200, sell: 600, target: 'oneAlly', effect: { heal: 2200 }, desc: 'Restores 2200 HP.' },
  tonic:       { id: 'tonic', name: 'Tonic', kind: 'consumable', price: 150, sell: 75, target: 'oneAlly', effect: { mp: 60 }, desc: 'Restores 60 MP.' },
  hitonic:     { id: 'hitonic', name: 'Hi-Tonic', kind: 'consumable', price: 600, sell: 300, target: 'oneAlly', effect: { mp: 200 }, desc: 'Restores 200 MP.' },
  elixir:      { id: 'elixir', name: 'Elixir', kind: 'consumable', price: 0, sell: 2500, target: 'oneAlly', effect: { fullHeal: true, fullMP: true }, desc: 'Fully restores HP and MP.' },
  megalixir:   { id: 'megalixir', name: 'Megalixir', kind: 'consumable', price: 0, sell: 8000, target: 'allAllies', effect: { fullHeal: true, fullMP: true }, desc: 'Fully restores the whole party.' },
  balm:        { id: 'balm', name: 'Field Balm', kind: 'consumable', price: 220, sell: 110, target: 'allAllies', effect: { heal: 200 }, desc: 'Restores 200 HP to all allies.' },

  // --- consumables: status ----------------------------------------------
  antidote:    { id: 'antidote', name: 'Antidote', kind: 'consumable', price: 40, sell: 20, target: 'oneAlly', effect: { cure: ['poison', 'venom'] }, desc: 'Cures poison.' },
  eyedrops:    { id: 'eyedrops', name: 'Eyebright', kind: 'consumable', price: 40, sell: 20, target: 'oneAlly', effect: { cure: ['blind'] }, desc: 'Cures blindness.' },
  echoherb:    { id: 'echoherb', name: 'Echo Herb', kind: 'consumable', price: 60, sell: 30, target: 'oneAlly', effect: { cure: ['silence'] }, desc: 'Cures silence.' },
  softstone:   { id: 'softstone', name: 'Soft Stone', kind: 'consumable', price: 120, sell: 60, target: 'oneAlly', effect: { cure: ['stone'] }, desc: 'Cures petrification.' },
  clarity:     { id: 'clarity', name: 'Clarity Draught', kind: 'consumable', price: 100, sell: 50, target: 'oneAlly', effect: { cure: ['confuse', 'charm', 'muddle', 'sleep'] }, desc: 'Clears the mind.' },
  panacea:     { id: 'panacea', name: 'Panacea', kind: 'consumable', price: 450, sell: 225, target: 'oneAlly', effect: { cureAll: true }, desc: 'Cures all ailments.' },
  phoenixtear:{ id: 'phoenixtear', name: 'Phoenix Tear', kind: 'consumable', price: 500, sell: 250, target: 'oneAlly', targetsKO: true, effect: { revive: 0.5 }, desc: 'Revives with half HP.' },

  // --- consumables: offensive -------------------------------------------
  emberflask:  { id: 'emberflask', name: 'Ember Flask', kind: 'consumable', price: 180, sell: 90, target: 'allEnemies', effect: { damage: 90, element: 'fire' }, desc: 'Fire damage to all foes.' },
  frostflask:  { id: 'frostflask', name: 'Frost Flask', kind: 'consumable', price: 180, sell: 90, target: 'allEnemies', effect: { damage: 90, element: 'ice' }, desc: 'Ice damage to all foes.' },
  stormflask:  { id: 'stormflask', name: 'Storm Flask', kind: 'consumable', price: 180, sell: 90, target: 'allEnemies', effect: { damage: 90, element: 'bolt' }, desc: 'Lightning damage to all foes.' },
  shrapnel:    { id: 'shrapnel', name: 'Shrapnel Charge', kind: 'consumable', price: 400, sell: 200, target: 'oneEnemy', effect: { damage: 320 }, desc: 'Heavy damage to one foe.' },
  wardstone:   { id: 'wardstone', name: 'Wardstone', kind: 'consumable', price: 800, sell: 400, target: 'allAllies', effect: { status: { protect: 100, shell: 100 } }, desc: 'Shields the party.' },

  // --- weapons: swords ---------------------------------------------------
  ironsword:   { id: 'ironsword', name: 'Iron Sword', kind: 'weapon', type: 'sword', slot: 'weapon', price: 300, sell: 150, stats: { atk: 26, vig: 2 }, desc: 'Honest steel, poorly balanced.' },
  guardsabre:  { id: 'guardsabre', name: 'Guard Sabre', kind: 'weapon', type: 'sword', slot: 'weapon', price: 900, sell: 450, stats: { atk: 44, sta: 4 }, desc: 'Militia issue. Reliable.' },
  emberbrand:  { id: 'emberbrand', name: 'Emberbrand', kind: 'weapon', type: 'sword', slot: 'weapon', price: 2400, sell: 1200, stats: { atk: 68, mag: 6 }, element: 'fire', desc: 'Sheathed in a low, constant heat.' },
  tidecleaver: { id: 'tidecleaver', name: 'Tidecleaver', kind: 'weapon', type: 'sword', slot: 'weapon', price: 4200, sell: 2100, stats: { atk: 92, spd: 4 }, element: 'water', desc: 'Salt never dries on the blade.' },
  aetherglass: { id: 'aetherglass', name: 'Aetherglass', kind: 'weapon', type: 'sword', slot: 'weapon', price: 12000, sell: 6000, stats: { atk: 148, mag: 14, res: 8 }, element: 'aether', effects: ['halfMP'], desc: 'Cut from a sleeping Engine. It hums.' },

  // --- weapons: daggers --------------------------------------------------
  boltdirk:    { id: 'boltdirk', name: 'Bolt Dirk', kind: 'weapon', type: 'dagger', slot: 'weapon', price: 250, sell: 125, stats: { atk: 18, spd: 5 }, desc: 'Quick, and quiet enough.' },
  thiefsknife: { id: 'thiefsknife', name: "Thief's Knife", kind: 'weapon', type: 'dagger', slot: 'weapon', price: 1800, sell: 900, stats: { atk: 40, spd: 8, lck: 10 }, effects: ['stealOnHit'], desc: 'Sometimes takes more than blood.' },
  quietedge:   { id: 'quietedge', name: 'Quiet Edge', kind: 'weapon', type: 'dagger', slot: 'weapon', price: 5600, sell: 2800, stats: { atk: 78, spd: 12, lck: 14 }, effects: ['critUp'], desc: 'The blade that ended the Ninth Lantern.' },

  // --- weapons: other ----------------------------------------------------
  ashenkatana: { id: 'ashenkatana', name: 'Ashen Katana', kind: 'weapon', type: 'katana', slot: 'weapon', price: 3200, sell: 1600, stats: { atk: 82, spd: 3 }, desc: 'Folded four hundred times at Ashenhall.' },
  longspear:   { id: 'longspear', name: 'Long Spear', kind: 'weapon', type: 'spear', slot: 'weapon', price: 1400, sell: 700, stats: { atk: 52, sta: 3 }, effects: ['reachBack'], desc: 'Strikes from the back row unpenalised.' },
  ironknuckles:{ id: 'ironknuckles', name: 'Iron Knuckles', kind: 'weapon', type: 'fist', slot: 'weapon', price: 700, sell: 350, stats: { atk: 38, vig: 4 }, desc: 'For arguments that need finishing.' },
  stormfists:  { id: 'stormfists', name: 'Storm Fists', kind: 'weapon', type: 'fist', slot: 'weapon', price: 4800, sell: 2400, stats: { atk: 96, spd: 6, vig: 6 }, element: 'bolt', desc: 'Thunder lives in the wrappings.' },
  ashrod:      { id: 'ashrod', name: 'Ashwood Rod', kind: 'weapon', type: 'rod', slot: 'weapon', price: 400, sell: 200, stats: { atk: 12, mag: 8 }, desc: 'Light, and eager to conduct.' },
  lanternstaff:{ id: 'lanternstaff', name: 'Lantern Staff', kind: 'weapon', type: 'staff', slot: 'weapon', price: 1600, sell: 800, stats: { atk: 22, mag: 16, res: 6 }, desc: 'Its flame has never once gone out.' },
  quillbrush:  { id: 'quillbrush', name: 'Quill Brush', kind: 'weapon', type: 'brush', slot: 'weapon', price: 900, sell: 450, stats: { atk: 16, mag: 12, lck: 6 }, desc: 'Paints what it is told, mostly.' },

  // --- armour: body ------------------------------------------------------
  travelvest:  { id: 'travelvest', name: 'Travel Vest', kind: 'armor', type: 'lightArmor', slot: 'body', price: 200, sell: 100, stats: { def: 14, hp: 30 }, desc: 'Waxed canvas. Sheds rain.' },
  scalecoat:   { id: 'scalecoat', name: 'Scale Coat', kind: 'armor', type: 'lightArmor', slot: 'body', price: 800, sell: 400, stats: { def: 32, hp: 90, sta: 3 }, desc: 'Overlapping plates on leather.' },
  guardplate:  { id: 'guardplate', name: 'Guard Plate', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 2200, sell: 1100, stats: { def: 58, hp: 220, sta: 6, spd: -2 }, desc: 'Heavy, and worth the weight.' },
  silkrobe:    { id: 'silkrobe', name: 'Silk Robe', kind: 'armor', type: 'robe', slot: 'body', price: 700, sell: 350, stats: { def: 20, mdef: 26, mp: 18, mag: 3 }, desc: 'Woven for those who fight with words.' },
  aetherweave: { id: 'aetherweave', name: 'Aetherweave', kind: 'armor', type: 'robe', slot: 'body', price: 9000, sell: 4500, stats: { def: 62, mdef: 78, mp: 60, mag: 10, res: 10 }, effects: ['halfMP'], desc: 'The threads are not entirely thread.' },
  wardenmail:  { id: 'wardenmail', name: 'Warden Mail', kind: 'armor', type: 'heavyArmor', slot: 'body', price: 11000, sell: 5500, stats: { def: 118, mdef: 52, hp: 600, sta: 12 }, resist: { shadow: 'resist' }, desc: 'Worn by those who held the last gate.' },

  // --- armour: head ------------------------------------------------------
  leathercap:  { id: 'leathercap', name: 'Leather Cap', kind: 'armor', type: 'hat', slot: 'head', price: 120, sell: 60, stats: { def: 8, hp: 15 }, desc: '' },
  ironhelm:    { id: 'ironhelm', name: 'Iron Helm', kind: 'armor', type: 'helm', slot: 'head', price: 500, sell: 250, stats: { def: 22, hp: 60, sta: 2 }, desc: '' },
  scholarhood: { id: 'scholarhood', name: "Scholar's Hood", kind: 'armor', type: 'hat', slot: 'head', price: 900, sell: 450, stats: { def: 12, mdef: 28, mp: 24, mag: 4 }, desc: '' },
  crownofsalt: { id: 'crownofsalt', name: 'Crown of Salt', kind: 'armor', type: 'helm', slot: 'head', price: 7000, sell: 3500, stats: { def: 54, mdef: 46, hp: 260, res: 8 }, immune: ['confuse', 'charm'], desc: '' },

  // --- shields -----------------------------------------------------------
  woodshield:  { id: 'woodshield', name: 'Oak Shield', kind: 'armor', type: 'shield', slot: 'offhand', price: 180, sell: 90, stats: { def: 12, eva: 6 }, desc: '' },
  towershield: { id: 'towershield', name: 'Tower Shield', kind: 'armor', type: 'shield', slot: 'offhand', price: 1600, sell: 800, stats: { def: 40, eva: 10, sta: 4, spd: -1 }, desc: '' },
  mirrorshield:{ id: 'mirrorshield', name: 'Mirror Shield', kind: 'armor', type: 'shield', slot: 'offhand', price: 8000, sell: 4000, stats: { def: 48, mdef: 60, eva: 14 }, effects: ['autoReflect'], desc: '' },

  // --- relics ------------------------------------------------------------
  swiftband:   { id: 'swiftband', name: 'Swift Band', kind: 'relic', slot: 'relic1', price: 1200, sell: 600, stats: { spd: 12 }, desc: 'Speed +12.' },
  ironbrooch:  { id: 'ironbrooch', name: 'Iron Brooch', kind: 'relic', slot: 'relic1', price: 900, sell: 450, stats: { sta: 8, hp: 150 }, desc: 'Stamina and vitality.' },
  focusring:   { id: 'focusring', name: 'Focus Ring', kind: 'relic', slot: 'relic1', price: 2000, sell: 1000, stats: { mag: 10, mp: 30 }, desc: 'Magic +10.' },
  twinfang:    { id: 'twinfang', name: 'Twin Fang', kind: 'relic', slot: 'relic1', price: 6000, sell: 3000, effects: ['dualWield'], desc: 'Wield a weapon in each hand.' },
  earnestcharm:{ id: 'earnestcharm', name: 'Earnest Charm', kind: 'relic', slot: 'relic1', price: 3000, sell: 1500, effects: ['doubleCast'], desc: 'Cast two spells in one turn.' },
  quietstep:   { id: 'quietstep', name: 'Quiet Step', kind: 'relic', slot: 'relic1', price: 2400, sell: 1200, effects: ['noEncounter'], desc: 'Wild things lose interest in you.' },
  lastlight:   { id: 'lastlight', name: 'Last Light', kind: 'relic', slot: 'relic1', price: 0, sell: 5000, effects: ['autoRevive'], desc: 'Revives once when felled.' },
  hoardersglove:{ id: 'hoardersglove', name: "Hoarder's Glove", kind: 'relic', slot: 'relic1', price: 2600, sell: 1300, effects: ['stealUp'], desc: 'Doubles the chance to pilfer.' },
  sprinter:    { id: 'sprinter', name: 'Sprinter', kind: 'relic', slot: 'relic1', price: 800, sell: 400, effects: ['fastField'], desc: 'Move faster in the field.' },
  wardingcord: { id: 'wardingcord', name: 'Warding Cord', kind: 'relic', slot: 'relic1', price: 3400, sell: 1700, immune: ['poison', 'blind', 'silence'], desc: 'Wards common ailments.' },

  // --- key items ---------------------------------------------------------
  siltroadpass:{ id: 'siltroadpass', name: 'Silt Road Pass', kind: 'key', desc: 'Lets you through the Ferran checkpoint.' },
  enginekey:   { id: 'enginekey', name: 'Engine Key', kind: 'key', desc: 'Cold to the touch, always.' },
};

// Volume two — the mid-to-late game gear and consumables. Kept in its own
// module for the same reason the bestiary is: this file stays readable.
Object.assign(ITEMS, VOL2_ITEMS);
Object.assign(ITEMS, VOL3_ITEMS);

export const ITEM_LIST = Object.values(ITEMS);

export function isEquippable(item, member) {
  if (!item || !item.slot) return false;
  if (item.kind === 'relic') return true;
  return (member.def.equip || []).includes(item.type);
}

/** Shop inventories, referenced by NPC `shop` ids. */
export const SHOPS = {
  harrowmere_items: {
    name: 'Marrow & Salt',
    stock: ['potion', 'antidote', 'eyedrops', 'echoherb', 'tonic', 'leathercap', 'travelvest',
      'emberflask', 'wayfarerrobe'],
  },
  harrowmere_arms: {
    name: 'Halloran Forge',
    stock: ['ironsword', 'boltdirk', 'ironknuckles', 'ashrod', 'woodshield', 'travelvest', 'leathercap'],
  },
  solmere_items: {
    name: 'Aetheric Supply',
    stock: ['potion', 'hipotion', 'tonic', 'antidote', 'eyedrops', 'echoherb', 'softstone',
      'clarity', 'balm', 'phoenixtear', 'emberflask', 'frostflask', 'stormflask'],
  },
  solmere_arms: {
    name: 'Marchetti Works',
    stock: ['guardsabre', 'ashenkatana', 'longspear', 'thiefsknife', 'stormfists', 'lanternstaff',
      'scalecoat', 'guardplate', 'silkrobe', 'ironhelm', 'scholarhood', 'towershield',
      'swiftband', 'ironbrooch', 'focusring', 'sprinter'],
  },
  ferran_quartermaster: {
    name: 'Requisitions',
    stock: ['hipotion', 'hitonic', 'panacea', 'shrapnel', 'wardstone', 'guardplate', 'ironhelm', 'wardingcord',
      'rimeflask', 'arcflask', 'galeflask', 'deadfallcharge', 'lanternoil'],
  },
};

// The later shops, kept beside their stock in the volume-two module.
Object.assign(SHOPS, VOL2_SHOPS);
Object.assign(SHOPS, VOL3_SHOPS);
