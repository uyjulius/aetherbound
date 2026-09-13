export const SLOTS = { weapon: 'Weapon', body: 'Armour', head: 'Head', offhand: 'Shield', relic1: 'Relic' };
export const STATS = ['vig', 'mag', 'sta', 'res', 'spd', 'lck'];
export function statAt(character, key, level) {
  return Math.max(key === 'mp' ? 0 : 1, Math.round((character.base?.[key] ?? 1) + (character.growth?.[key] ?? 0) * Math.max(0, level - 1)));
}
export function canEquip(data, member, item, slot = item?.slot) {
  return Boolean(item && SLOTS[slot] && item.slot === slot && (item.types ? item.types.includes(member.id) : data.characters[member.id]?.equip?.includes(item.type)));
}
export function equipmentStats(data, member) {
  const character = data.characters[member.id];
  const stats = Object.fromEntries(['hp', 'mp', ...STATS].map(key => [key, statAt(character, key, member.level)]));
  for (const [slot, id] of Object.entries(member.equipment ?? {})) {
    const item = data.items[id]; if (!canEquip(data, member, item, slot)) continue;
    for (const [key, value] of Object.entries(item.stats ?? {})) if (key in stats) stats[key] += value;
  }
  return { maxHp: Math.max(1, stats.hp), maxMp: Math.max(0, stats.mp), ...Object.fromEntries(STATS.map(key => [key, Math.max(1, stats[key])])) };
}
export function refreshEquipment(data, member) {
  Object.assign(member, equipmentStats(data, member));
  // Changing clothes cannot generate HP/MP or revive someone.
  member.hp = Math.min(member.hp, member.maxHp); member.mp = Math.min(member.mp, member.maxMp);
}
export function equipItem(data, state, memberId, slot, itemId) {
  const member = state.roster.find(hero => hero.id === memberId), item = data.items[itemId];
  if (!member || !SLOTS[slot]) return { ok: false, message: 'Choose a party member and equipment slot.' };
  if (itemId && (!canEquip(data, member, item, slot) || !(state.inventory[itemId] > 0))) return { ok: false, message: 'That equipment is unavailable for this hero.' };
  member.equipment ??= {};
  const old = member.equipment[slot];
  if (!itemId && !old) return { ok: false, message: 'That slot is already empty.' };
  if (itemId) state.inventory[itemId] -= 1;
  if (old) state.inventory[old] = (state.inventory[old] ?? 0) + 1;
  if (itemId) member.equipment[slot] = itemId; else delete member.equipment[slot];
  refreshEquipment(data, member);
  return { ok: true, message: itemId ? `${member.name} equipped ${item.name}.` : `${member.name} removed ${data.items[old]?.name ?? old}.` };
}
