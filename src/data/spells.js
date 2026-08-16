/**
 * Magic.
 *
 * Spells are learned from espers (magicite) rather than by level, so who knows
 * what is a decision the player makes — the single best structural idea in
 * FF6's progression, because it turns levelling into planning.
 *
 * target: 'oneEnemy' | 'allEnemies' | 'oneAlly' | 'allAllies' | 'self' | 'any' | 'allAny'
 * kind:   'attack' | 'heal' | 'status' | 'buff' | 'special'
 */

export const SPELLS = {
  // --- black: fire -------------------------------------------------------
  ember:    { id: 'ember', name: 'Ember', kind: 'attack', school: 'black', element: 'fire', power: 21, mp: 4, target: 'oneEnemy', tier: 1 },
  pyre:     { id: 'pyre', name: 'Pyre', kind: 'attack', school: 'black', element: 'fire', power: 60, mp: 20, target: 'oneEnemy', tier: 2 },
  conflagrate: { id: 'conflagrate', name: 'Conflagrate', kind: 'attack', school: 'black', element: 'fire', power: 141, mp: 51, target: 'allEnemies', tier: 3 },

  // --- black: ice --------------------------------------------------------
  rime:     { id: 'rime', name: 'Rime', kind: 'attack', school: 'black', element: 'ice', power: 21, mp: 5, target: 'oneEnemy', tier: 1 },
  hoarfrost: { id: 'hoarfrost', name: 'Hoarfrost', kind: 'attack', school: 'black', element: 'ice', power: 60, mp: 20, target: 'oneEnemy', tier: 2 },
  glaciate: { id: 'glaciate', name: 'Glaciate', kind: 'attack', school: 'black', element: 'ice', power: 141, mp: 52, target: 'allEnemies', tier: 3 },

  // --- black: bolt -------------------------------------------------------
  spark:    { id: 'spark', name: 'Spark', kind: 'attack', school: 'black', element: 'bolt', power: 21, mp: 6, target: 'oneEnemy', tier: 1 },
  arcflash: { id: 'arcflash', name: 'Arcflash', kind: 'attack', school: 'black', element: 'bolt', power: 60, mp: 21, target: 'oneEnemy', tier: 2 },
  thunderhead: { id: 'thunderhead', name: 'Thunderhead', kind: 'attack', school: 'black', element: 'bolt', power: 141, mp: 53, target: 'allEnemies', tier: 3 },

  // --- black: other elements --------------------------------------------
  brine:    { id: 'brine', name: 'Brine', kind: 'attack', school: 'black', element: 'water', power: 46, mp: 15, target: 'oneEnemy', tier: 2 },
  galecut:  { id: 'galecut', name: 'Galecut', kind: 'attack', school: 'black', element: 'wind', power: 40, mp: 13, target: 'allEnemies', tier: 2 },
  upheaval: { id: 'upheaval', name: 'Upheaval', kind: 'attack', school: 'black', element: 'earth', power: 72, mp: 24, target: 'allEnemies', tier: 2, ignores: 'float' },
  blight:   { id: 'blight', name: 'Blight', kind: 'attack', school: 'black', element: 'poison', power: 38, mp: 12, target: 'oneEnemy', tier: 1, status: { poison: 60 } },
  gravewell: { id: 'gravewell', name: 'Gravewell', kind: 'attack', school: 'black', element: 'shadow', power: 105, mp: 40, target: 'oneEnemy', tier: 3 },
  unlight:  { id: 'unlight', name: 'Unlight', kind: 'attack', school: 'black', element: 'shadow', power: 165, mp: 68, target: 'allEnemies', tier: 4 },

  // --- black: non-elemental & finishers ---------------------------------
  hollow:   { id: 'hollow', name: 'Hollow', kind: 'attack', school: 'black', element: null, power: 120, mp: 46, target: 'oneEnemy', tier: 3 },
  sunder:   { id: 'sunder', name: 'Sunder', kind: 'attack', school: 'black', element: null, power: 210, mp: 88, target: 'oneEnemy', tier: 4 },
  lastword: { id: 'lastword', name: 'Last Word', kind: 'attack', school: 'black', element: 'aether', power: 255, mp: 150, target: 'allEnemies', tier: 5 },

  // --- fractional & instant ---------------------------------------------
  halve:    { id: 'halve', name: 'Halve', kind: 'special', school: 'black', effect: 'fractionHP', fraction: 0.5, mp: 38, target: 'oneEnemy', tier: 3 },
  toll:     { id: 'toll', name: 'Toll', kind: 'special', school: 'black', effect: 'levelMultiple', of: 5, mp: 22, target: 'allEnemies', tier: 2 },
  severance:{ id: 'severance', name: 'Severance', kind: 'status', school: 'black', status: { ko: 45 }, mp: 62, target: 'oneEnemy', tier: 4 },
  ossify:   { id: 'ossify', name: 'Ossify', kind: 'status', school: 'black', status: { stone: 40 }, mp: 30, target: 'oneEnemy', tier: 3 },
  knell:    { id: 'knell', name: 'Knell', kind: 'status', school: 'black', status: { doom: 60 }, mp: 20, target: 'oneEnemy', tier: 2 },

  // --- black: debuffs ----------------------------------------------------
  dimming:  { id: 'dimming', name: 'Dimming', kind: 'status', school: 'black', status: { blind: 70 }, mp: 4, target: 'oneEnemy', tier: 1 },
  hush:     { id: 'hush', name: 'Hush', kind: 'status', school: 'black', status: { silence: 70 }, mp: 8, target: 'oneEnemy', tier: 1 },
  lull:     { id: 'lull', name: 'Lull', kind: 'status', school: 'black', status: { sleep: 65 }, mp: 6, target: 'oneEnemy', tier: 1 },
  addle:    { id: 'addle', name: 'Addle', kind: 'status', school: 'black', status: { confuse: 55 }, mp: 10, target: 'oneEnemy', tier: 2 },
  mire:     { id: 'mire', name: 'Mire', kind: 'status', school: 'black', status: { slow: 75 }, mp: 5, target: 'oneEnemy', tier: 1 },
  arrest:   { id: 'arrest', name: 'Arrest', kind: 'status', school: 'black', status: { stop: 55 }, mp: 26, target: 'oneEnemy', tier: 3 },
  beguile:  { id: 'beguile', name: 'Beguile', kind: 'status', school: 'black', status: { charm: 50 }, mp: 16, target: 'oneEnemy', tier: 2 },
  wither:   { id: 'wither', name: 'Wither', kind: 'status', school: 'black', status: { imp: 45 }, mp: 12, target: 'oneEnemy', tier: 2 },

  // --- white: healing ----------------------------------------------------
  mend:     { id: 'mend', name: 'Mend', kind: 'heal', school: 'white', power: 22, mp: 5, target: 'oneAlly', tier: 1 },
  mendra:   { id: 'mendra', name: 'Mendra', kind: 'heal', school: 'white', power: 56, mp: 20, target: 'oneAlly', tier: 2 },
  mendaga:  { id: 'mendaga', name: 'Mendaga', kind: 'heal', school: 'white', power: 130, mp: 48, target: 'oneAlly', tier: 3 },
  solace:   { id: 'solace', name: 'Solace', kind: 'heal', school: 'white', power: 66, mp: 40, target: 'allAllies', tier: 3 },
  fullmend: { id: 'fullmend', name: 'Full Mend', kind: 'heal', school: 'white', power: 0, effect: 'fullHeal', mp: 68, target: 'oneAlly', tier: 4 },
  reprise:  { id: 'reprise', name: 'Reprise', kind: 'special', school: 'white', effect: 'revive', ratio: 0.25, mp: 18, target: 'oneAlly', tier: 2, targetsKO: true },
  reprisex: { id: 'reprisex', name: 'Reprise+', kind: 'special', school: 'white', effect: 'revive', ratio: 1.0, mp: 60, target: 'oneAlly', tier: 4, targetsKO: true },

  // --- white: cures & buffs ---------------------------------------------
  cleanse:  { id: 'cleanse', name: 'Cleanse', kind: 'special', school: 'white', effect: 'cureStatus', cures: ['poison', 'blind', 'silence', 'sleep', 'confuse', 'imp', 'venom', 'seizure'], mp: 12, target: 'oneAlly', tier: 2 },
  unbind:   { id: 'unbind', name: 'Unbind', kind: 'special', school: 'white', effect: 'cureStatus', cures: ['stone'], mp: 15, target: 'oneAlly', tier: 2 },
  wardflesh:{ id: 'wardflesh', name: 'Wardflesh', kind: 'buff', school: 'white', status: { protect: 100 }, mp: 12, target: 'oneAlly', tier: 2 },
  wardmind: { id: 'wardmind', name: 'Wardmind', kind: 'buff', school: 'white', status: { shell: 100 }, mp: 15, target: 'oneAlly', tier: 2 },
  mirrorward:{ id: 'mirrorward', name: 'Mirrorward', kind: 'buff', school: 'white', status: { reflect: 100 }, mp: 22, target: 'oneAlly', tier: 3 },
  quicken:  { id: 'quicken', name: 'Quicken', kind: 'buff', school: 'white', status: { haste: 100 }, mp: 10, target: 'oneAlly', tier: 2 },
  quickenall:{ id: 'quickenall', name: 'Quicken All', kind: 'buff', school: 'white', status: { haste: 100 }, mp: 40, target: 'allAllies', tier: 4 },
  renewal:  { id: 'renewal', name: 'Renewal', kind: 'buff', school: 'white', status: { regen: 100 }, mp: 10, target: 'oneAlly', tier: 2 },
  buoy:     { id: 'buoy', name: 'Buoy', kind: 'buff', school: 'white', status: { float: 100 }, mp: 14, target: 'allAllies', tier: 2 },
  bulwark:  { id: 'bulwark', name: 'Bulwark', kind: 'buff', school: 'white', status: { protect: 100, shell: 100 }, mp: 30, target: 'allAllies', tier: 3 },
  sanctus:  { id: 'sanctus', name: 'Sanctus', kind: 'attack', school: 'white', element: 'holy', power: 108, mp: 42, target: 'oneEnemy', tier: 3 },
  benediction:{ id: 'benediction', name: 'Benediction', kind: 'attack', school: 'white', element: 'holy', power: 185, mp: 80, target: 'allEnemies', tier: 4 },

  // --- grey: utility -----------------------------------------------------
  // 14 MP, not 1. Draining 18 for a cost of 1 was a net gain of seventeen
  // every cast, from a tier-1 spell any caster learns in a handful of fights —
  // so MP stopped being a resource, and with it the question of which spell
  // you can afford, which is the only thing rationing magic at all. At 14 it
  // is still worth casting on a full-MP target and it is no longer a battery.
  siphon:   { id: 'siphon', name: 'Siphon', kind: 'special', school: 'grey', effect: 'drainMP', power: 30, mp: 14, target: 'oneEnemy', tier: 1 },
  leech:    { id: 'leech', name: 'Leech', kind: 'special', school: 'grey', effect: 'drainHP', power: 48, mp: 16, target: 'oneEnemy', tier: 2 },
  sap:      { id: 'sap', name: 'Sap', kind: 'special', school: 'grey', effect: 'drainHP', power: 100, mp: 38, target: 'oneEnemy', tier: 3 },
  quicksilver:{ id: 'quicksilver', name: 'Quicksilver', kind: 'special', school: 'grey', effect: 'extraTurn', mp: 80, target: 'self', tier: 5 },
  dispel:   { id: 'dispel', name: 'Dispel', kind: 'special', school: 'grey', effect: 'stripBuffs', mp: 25, target: 'oneEnemy', tier: 3 },
  scan:     { id: 'scan', name: 'Scan', kind: 'special', school: 'grey', effect: 'scan', mp: 3, target: 'oneEnemy', tier: 1 },
  warpout:  { id: 'warpout', name: 'Warp Out', kind: 'special', school: 'grey', effect: 'flee', mp: 20, target: 'self', tier: 2 },
  reversal: { id: 'reversal', name: 'Reversal', kind: 'special', school: 'grey', effect: 'swapHPMP', mp: 1, target: 'oneAlly', tier: 3 },
};

/** School → UI colour, used by the magic menu and the VFX. */
export const SCHOOL_COLOR = { black: '#8a5ce0', white: '#fff3b8', grey: '#3fc6d6' };

export function spellList(school = null) {
  return Object.values(SPELLS).filter((s) => !school || s.school === school);
}

/** MP cost after equipment modifiers. */
export function spellCost(spell, member) {
  let cost = spell.mp;
  for (const item of Object.values(member?.equipment || {})) {
    if (item?.effects?.includes('halfMP')) cost = Math.ceil(cost / 2);
    if (item?.effects?.includes('oneMP')) cost = 1;
  }
  return Math.max(0, cost);
}
