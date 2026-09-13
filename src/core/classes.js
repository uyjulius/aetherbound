// Fixed roles make each recruit change the party's tactical options.
export const CLASSES = {
  vesna: { name: 'Aether Knight', row: 'front', skill: 'resonance', magic: 'Aether arts', spells: [[1, 'ember'], [1, 'rime'], [4, 'spark'], [8, 'mire'], [12, 'pyre']] },
  corvin: { name: 'Vanguard', row: 'front', skill: 'cover', spells: [] },
  wick: { name: 'Dawn Priest', row: 'back', skill: 'prayer', magic: 'White magic', spells: [[1, 'mend'], [4, 'cleanse'], [6, 'reprise'], [10, 'mendra'], [14, 'solace']] },
  kestrel: { name: 'Sky Lancer', row: 'front', skill: 'jump', spells: [] },
  aurelian: { name: 'Oathkeeper', row: 'front', skill: 'cover', magic: 'White magic', spells: [[1, 'mend'], [10, 'reprise']] },
};

export const ABILITIES = {
  resonance: { id: 'resonance', name: 'Resonance', target: 'oneEnemy', mp: 6, power: 34, element: 'aether', category: 'magic', desc: 'A focused aether strike. Ignores formation.' },
  cover: { id: 'cover', name: 'Cover', target: 'oneAlly', mp: 0, category: 'cover', desc: 'Intercept physical attacks on an ally until your next turn.' },
  prayer: { id: 'prayer', name: 'Prayer', target: 'allAllies', mp: 0, power: 8, category: 'heal', desc: 'Restore a little HP to every standing ally.' },
  jump: { id: 'jump', name: 'Skyfall', target: 'oneEnemy', mp: 4, power: 1.9, category: 'physical', desc: 'A leaping spear strike that ignores formation.' },
};

export function roleFor(id) { return CLASSES[id] ?? { name: 'Wayfarer', row: 'front', spells: [] }; }
export function learnedSpells(id, level) { return roleFor(id).spells.filter(([at]) => level >= at).map(([, spell]) => spell); }
