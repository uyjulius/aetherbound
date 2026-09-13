import { CAMPAIGN_MAPS } from './maps.js';
const gear = (id, name, slot, types, price, stats, desc, extra = {}) => ({ id, name, kind: slot === 'weapon' ? 'weapon' : 'armor', slot, types, price, sell: Math.floor(price / 2), stats, desc, ...extra });
export const EQUIPMENT = Object.fromEntries([
  gear('roadblade', 'Road Blade', 'weapon', ['vesna', 'corvin', 'aurelian'], 180, { vig: 6 }, 'A dependable blade for the long road.'),
  gear('reedblade', 'Reedfire Blade', 'weapon', ['vesna', 'corvin', 'aurelian'], 550, { vig: 12, mag: 3 }, 'A warm edge. Physical attacks carry fire.', { element: 'fire' }),
  gear('crownblade', 'Crown Sabre', 'weapon', ['vesna', 'corvin', 'aurelian'], 900, { vig: 22, sta: 4 }, 'A heavy guard protects its wielder.'),
  gear('dawnwand', 'Dawn Wand', 'weapon', ['vesna', 'wick'], 220, { mag: 7 }, 'A small lantern for a small miracle.'),
  gear('dawnstaff', 'Dawnkeeper Staff', 'weapon', ['vesna', 'wick'], 850, { mag: 18, res: 6 }, 'Its flame answers the living.'),
  gear('travelspear', 'Pilgrim Spear', 'weapon', ['kestrel', 'aurelian'], 250, { vig: 12 }, 'An old spear, remade for a new journey.'),
  gear('skylance', 'Horizon Lance', 'weapon', ['kestrel', 'aurelian'], 1200, { vig: 28, spd: 6 }, 'A counterweight of aetherglass makes the point weightless.'),
  gear('travelcoat', 'Travel Coat', 'body', ['vesna', 'corvin', 'wick', 'kestrel', 'aurelian'], 180, { sta: 6, hp: 20 }, 'Waxed cloth keeps the marsh cold out.'),
  gear('scalecoat', 'Reed Scale Coat', 'body', ['vesna', 'corvin', 'kestrel', 'aurelian'], 650, { sta: 16, hp: 55 }, 'A light coat of overlapping river scales.'),
  gear('crownplate', 'Crown Plate', 'body', ['corvin', 'aurelian'], 1100, { sta: 26, hp: 90, spd: -3 }, 'Protective armour, at a small cost to speed.'),
  gear('starrobe', 'Astronomer’s Robe', 'body', ['vesna', 'wick', 'kestrel'], 1000, { sta: 8, res: 20, mp: 25 }, 'Its lining is a map of the sky.'),
  gear('roadcap', 'Road Cap', 'head', ['vesna', 'corvin', 'wick', 'kestrel', 'aurelian'], 100, { sta: 4, hp: 10 }, 'Simple protection.'),
  gear('crownshield', 'Crown Shield', 'offhand', ['vesna', 'corvin', 'aurelian'], 600, { sta: 14, res: 5 }, 'The emblem has been struck from its face.'),
  gear('dawncharm', 'Dawn Charm', 'relic1', ['vesna', 'corvin', 'wick', 'kestrel', 'aurelian'], 700, { res: 10, mp: 15 }, 'A keepsake from a morning worth remembering.'),
  gear('swiftband', 'Swift Band', 'relic1', ['vesna', 'corvin', 'wick', 'kestrel', 'aurelian'], 800, { spd: 10 }, 'Aether gathers more quickly around the wearer.'),
].map(item => [item.id, item]));
export const STARTING_EQUIPMENT = {
  vesna: { weapon: 'roadblade', body: 'travelcoat' }, corvin: { weapon: 'roadblade', body: 'travelcoat' }, wick: { weapon: 'dawnwand', body: 'travelcoat' },
  kestrel: { weapon: 'travelspear', body: 'scalecoat' }, aurelian: { weapon: 'crownblade', body: 'crownplate', offhand: 'crownshield' },
};
export function prepareCampaign(data) {
  const source = data.enemies;
  const enemy = (id, base, name, level, hp, atk, def, mag, exp, gold, extra = {}) => ({ ...source[base], id, name, level, boss: false,
    stats: { hp, mp: 100, atk, def, mag, mdef: Math.round(def * .8), spd: 24 }, exp, gold, drops: [], intro: `${name} bars the way.`, ...extra });
  const titles = { vesna: 'The Resonant', corvin: 'Former Ferran Captain', wick: 'Keeper of the Dawn', kestrel: 'Lancer of the High Winds', aurelian: 'A Crown Laid Down' };
  return { ...data, maps: CAMPAIGN_MAPS, encounters: {},
    characters: Object.fromEntries(Object.entries(data.characters).map(([id, character]) => [id, { ...character, title: titles[id] ?? character.title }])),
    items: { ...Object.fromEntries(['potion', 'hipotion', 'tonic', 'phoenixtear', 'balm', 'antidote', 'eyedrops', 'echoherb', 'panacea', 'emberflask', 'frostflask', 'stormflask', 'elixir', 'megalixir'].map(id => [id, data.items[id]])), ...EQUIPMENT },
    startingEquipment: STARTING_EQUIPMENT,
    shops: {
      harrow_items: { name: 'Marrow & Salt', stock: ['potion', 'antidote', 'tonic', 'phoenixtear', 'emberflask'] },
      harrow_arms: { name: 'Halloran’s Forge', stock: ['roadblade', 'dawnwand', 'travelcoat', 'roadcap', 'reedblade'] },
      solmere_items: { name: 'Aetheric Supply', stock: ['potion', 'hipotion', 'tonic', 'balm', 'phoenixtear', 'panacea', 'frostflask', 'stormflask'] },
      solmere_arms: { name: 'Tallis’s Workshop', stock: ['crownblade', 'dawnstaff', 'scalecoat', 'crownplate', 'crownshield', 'starrobe', 'dawncharm', 'swiftband'] },
    },
    enemies: {
      fenrat: enemy('fenrat', 'fenrat', 'Fen Rat', 4, 55, 17, 20, 5, 22, 18, { drops: [{ id: 'potion', chance: .18 }] }),
      mireslug: enemy('mireslug', 'mireslug', 'Mire Slug', 4, 85, 18, 26, 10, 28, 22),
      reedstalker: enemy('reedstalker', 'reedstalker', 'Reed Stalker', 5, 135, 27, 30, 12, 45, 35),
      bogfather: enemy('bogfather', 'bogfather', 'The Rootbound Bell', 8, 1100, 38, 36, 18, 600, 850, { boss: true, drops: [{ id: 'scalecoat', chance: 1 }], wave: { name: 'Rising Mire', element: 'water', power: 13, enrage: 'The Bell Unbound', enragePower: 20 } }),
      ferran_scout: enemy('ferran_scout', 'ferranwarden', 'Ferran Scout', 8, 200, 37, 40, 16, 80, 55, { look: { plan: 'humanoid', scale: 1 }, affinity: { bolt: 'weak' }, immune: [] }),
      furnace_drone: enemy('furnace_drone', 'ferranwarden', 'Furnace Drone', 9, 275, 42, 48, 25, 95, 70, { look: { plan: 'construct', scale: .9 }, affinity: { ice: 'weak', fire: 'resist' } }),
      ferranwarden: enemy('ferranwarden', 'ferranwarden', 'The Furnace Warden', 11, 2400, 58, 56, 30, 1300, 2000, { boss: true, drops: [{ id: 'crownplate', chance: 1 }], wave: { name: 'Lance Battery', element: 'bolt', power: 20, enrage: 'Cinder Protocol', enragePower: 30 } }),
      sky_revenant: enemy('sky_revenant', 'reedstalker', 'Sky Revenant', 12, 420, 55, 50, 32, 150, 100, { look: { plan: 'avian', scale: 1.2 }, affinity: { fire: 'weak', ice: 'resist' }, immune: [] }),
      enginewarden: enemy('enginewarden', 'enginewarden', 'The Oathbound Sentinel', 13, 2500, 65, 65, 36, 1700, 1200, { boss: true, affinity: { bolt: 'weak' }, drops: [{ id: 'elixir', chance: 1 }], wave: { name: 'Oath of Silence', element: 'aether', power: 24, enrage: 'Broken Oath', enragePower: 34 } }),
      thefirstengine: enemy('thefirstengine', 'thefirstengine', 'The First Engine', 16, 4400, 72, 70, 44, 2400, 2500, { boss: true, affinity: { bolt: 'weak', aether: 'absorb' }, drops: [], wave: { name: 'Borrowed Tomorrow', element: 'aether', power: 25, enrage: 'The Last Horizon', enragePower: 38 } }),
    },
  };
}
