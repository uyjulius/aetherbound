import { learnedSpells, roleFor } from './classes.js';
const SAVE_KEY = 'aetherbound.v2.save';
const CONFIG_KEY = 'aetherbound.v2.config';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const number = (value, fallback, low = 0, high = 9999999) => Number.isFinite(value) ? clamp(value, low, high) : fallback;
const STATS = ['vig', 'mag', 'sta', 'res', 'spd', 'lck'];

export function statAt(character, key, level) {
  return Math.max(key === 'mp' ? 0 : 1, Math.round((character.base?.[key] ?? 1)
    + (character.growth?.[key] ?? 0) * Math.max(0, level - 1)));
}
export function makeMember(character, level = 6) {
  const role = roleFor(character.id);
  return { id: character.id, name: character.name, title: character.title, role: role.name,
    level, exp: 0, hp: statAt(character, 'hp', level), mp: statAt(character, 'mp', level),
    maxHp: statAt(character, 'hp', level), maxMp: statAt(character, 'mp', level),
    ...Object.fromEntries(STATS.map(key => [key, statAt(character, key, level)])),
    row: role.row, spells: learnedSpells(character.id, level), statuses: {}, defending: false };
}
export function newGame(data) {
  const roster = ['vesna', 'corvin', 'wick'].map(id => makeMember(data.characters[id]));
  return { version: 2, createdAt: Date.now(), updatedAt: Date.now(), playTime: 0,
    world: 'whole', mapId: 'harrowmere', spawn: 'default', position: null,
    checkpoint: { mapId: 'harrowmere', spawn: 'default', position: null },
    gold: 500, roster, active: roster.map(member => member.id),
    inventory: { potion: 5, antidote: 2, tonic: 2, phoenixtear: 2 }, opened: [], flags: [],
    quest: { id: 'warm-earth', stage: 0, text: 'Speak with Elder Sabbath' }, steps: 0, victories: 0 };
}
function position(value) { return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) ? value : null; }
export function normalizeState(data, raw) {
  const fresh = newGame(data);
  if (!raw || raw.version !== 2) return fresh;
  const seen = new Set();
  const roster = (Array.isArray(raw.roster) ? raw.roster : []).filter(member => {
    if (!member || !data.characters[member.id] || seen.has(member.id)) return false;
    seen.add(member.id); return true;
  }).map(member => {
    const basis = makeMember(data.characters[member.id], Math.floor(number(member.level, 6, 1, 99)));
    return { ...basis, exp: number(member.exp, 0), hp: number(member.hp, basis.maxHp, 0, basis.maxHp),
      mp: number(member.mp, basis.maxMp, 0, basis.maxMp), row: ['front', 'back'].includes(member.row) ? member.row : basis.row,
      spells: [...new Set([...basis.spells, ...(Array.isArray(member.spells) ? member.spells.filter(id => data.spells?.[id]) : [])])],
      statuses: Object.fromEntries(Object.entries(member.statuses ?? {}).filter(([id, turns]) =>
        ['poison','blind','silence','slow','protect','haste'].includes(id) && Number.isFinite(turns) && turns > 0).map(([id, turns]) => [id, Math.min(4, turns)])) };
  });
  const state = { ...fresh, ...raw, roster: roster.length ? roster : fresh.roster };
  state.active = [...new Set(Array.isArray(raw.active) ? raw.active : [])].filter(id => state.roster.some(member => member.id === id)).slice(0, 5);
  if (!state.active.length) state.active = state.roster.slice(0, 5).map(member => member.id);
  state.mapId = data.maps?.[raw.mapId] ? raw.mapId : fresh.mapId;
  state.spawn = typeof raw.spawn === 'string' ? raw.spawn : 'default';
  state.position = position(raw.position);
  state.inventory = raw.inventory && typeof raw.inventory === 'object' ? Object.fromEntries(Object.entries(raw.inventory)
    .filter(([id, count]) => data.items?.[id] && Number.isFinite(count) && count >= 0).map(([id, count]) => [id, Math.floor(Math.min(999, count))])) : fresh.inventory;
  for (const key of ['gold', 'steps', 'victories', 'playTime']) state[key] = number(raw[key], fresh[key]);
  for (const key of ['opened', 'flags']) state[key] = Array.isArray(raw[key]) ? [...new Set(raw[key].filter(id => typeof id === 'string'))] : [];
  state.quest = raw.quest && Number.isInteger(raw.quest.stage) && typeof raw.quest.text === 'string' ? raw.quest : fresh.quest;
  state.checkpoint = data.maps?.[raw.checkpoint?.mapId] ? { mapId: raw.checkpoint.mapId,
    spawn: typeof raw.checkpoint.spawn === 'string' ? raw.checkpoint.spawn : 'default', position: position(raw.checkpoint.position) } : fresh.checkpoint;
  return state;
}
export function loadSave(data) {
  try { const raw = JSON.parse(localStorage.getItem(SAVE_KEY)); return raw?.version === 2 ? normalizeState(data, raw) : null; }
  catch { return null; }
}
export function hasSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY))?.version === 2; } catch { return false; }
}
export function saveGame(state) { state.updatedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return state.updatedAt; }
export function clearSave() { localStorage.removeItem(SAVE_KEY); }
export function loadConfig() {
  let raw = {}; try { raw = JSON.parse(localStorage.getItem(CONFIG_KEY)) ?? {}; } catch {}
  return { music: number(raw.music, .55, 0, 1), sound: number(raw.sound, .75, 0, 1), battleMode: raw.battleMode === 'active' ? 'active' : 'wait' };
}
export function saveConfig(config) { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); }
export function activeParty(state) { return state.active.map(id => state.roster.find(member => member.id === id)).filter(Boolean); }
export function restoreParty(state) { for (const member of state.roster) { member.hp = member.maxHp; member.mp = member.maxMp; member.statuses = {}; } }
export function expNeeded(level) { return level * 45; }
export function grantExp(state, amount, data) {
  const levels = [];
  for (const member of activeParty(state)) {
    member.exp += Math.max(0, amount);
    while (member.exp >= expNeeded(member.level) && member.level < 99) {
      member.exp -= expNeeded(member.level); member.level += 1;
      const grown = makeMember(data.characters[member.id], member.level);
      // Growth grants the capacity gained, not a free full heal or resurrection.
      if (member.hp > 0) member.hp += grown.maxHp - member.maxHp;
      member.mp += grown.maxMp - member.maxMp;
      for (const key of ['maxHp', 'maxMp', ...STATS]) member[key] = grown[key];
      member.spells = [...new Set([...member.spells, ...grown.spells])];
      if (!levels.includes(member.name)) levels.push(member.name);
    }
  }
  return levels;
}
