import { restoreParty } from './state.js';
export function trade(data, state, shopId, itemId, operation) {
  const shop = data.shops[shopId], item = data.items[itemId];
  if (!shop || !item || !['buy', 'sell'].includes(operation)) return { ok: false, message: 'That trade is unavailable.' };
  const count = state.inventory[itemId] ?? 0;
  if (operation === 'buy') {
    if (!shop.stock.includes(itemId) || !(item.price > 0)) return { ok: false, message: 'That item is not for sale.' };
    if (state.gold < item.price) return { ok: false, message: 'Not enough gil.' };
    if (count >= 99) return { ok: false, message: 'Your pack holds 99 of this item already.' };
    state.gold -= item.price; state.inventory[itemId] = count + 1;
  } else {
    if (count < 1 || !(item.sell > 0)) return { ok: false, message: 'You have none to sell.' };
    state.inventory[itemId] = count - 1; state.gold += item.sell;
  }
  return { ok: true, message: `${operation === 'buy' ? 'Bought' : 'Sold'} ${item.name}.` };
}
export function restAtInn(state, price) {
  if (!Number.isFinite(price) || price < 0 || state.gold < price) return { ok: false, message: 'Not enough gil for a room.' };
  state.gold -= price; restoreParty(state);
  return { ok: true, message: 'Morning comes. Everyone’s HP and MP are restored.' };
}
export function fieldTargets(data, state, itemId) {
  const item = data.items[itemId], effect = item?.effect;
  if (item?.kind !== 'consumable' || !effect || effect.damage || effect.status) return [];
  return state.roster.filter(hero => effect.revive ? hero.hp <= 0 : hero.hp > 0);
}
export function useFieldItem(data, state, itemId, heroId) {
  const item = data.items[itemId], effect = item?.effect;
  if (!(state.inventory[itemId] > 0)) return { ok: false, message: 'None left in the pack.' };
  const eligible = fieldTargets(data, state, itemId);
  const targets = item.target === 'allAllies' ? eligible : eligible.filter(hero => hero.id === heroId);
  if (!targets.length) return { ok: false, message: 'Choose a valid target.' };
  let changed = false;
  for (const hero of targets) {
    const hp = hero.hp, mp = hero.mp, ailments = JSON.stringify(hero.statuses);
    if (effect.revive) hero.hp = Math.max(1, Math.round(hero.maxHp * effect.revive));
    if (effect.heal) hero.hp = Math.min(hero.maxHp, hero.hp + effect.heal);
    if (effect.mp) hero.mp = Math.min(hero.maxMp, hero.mp + effect.mp);
    if (effect.fullHeal) hero.hp = hero.maxHp;
    if (effect.fullMP) hero.mp = hero.maxMp;
    if (effect.cureAll) hero.statuses = {};
    for (const id of effect.cure ?? []) delete hero.statuses[id];
    changed ||= hp !== hero.hp || mp !== hero.mp || ailments !== JSON.stringify(hero.statuses);
  }
  if (!changed) return { ok: false, message: 'No effect. The item stays in your pack.' };
  state.inventory[itemId] -= 1;
  return { ok: true, message: `${item.name} used${targets.length === 1 ? ` on ${targets[0].name}` : ' on the party'}.` };
}
