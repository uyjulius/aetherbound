const SAVE_KEY = 'aetherbound.v2.save';
const CONFIG_KEY = 'aetherbound.v2.config';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function statAt(character, key, level) {
  return Math.max(1, Math.round((character.base?.[key] ?? 1)
    + (character.growth?.[key] ?? 0) * Math.max(0, level - 1)));
}

export function makeMember(character, level = 6) {
  const maxHp = statAt(character, 'hp', level);
  const maxMp = statAt(character, 'mp', level);
  const starterSpells = character.id === 'vesna'
    ? ['ember', 'rime', 'spark', 'mend']
    : character.id === 'wick' ? ['mend', 'cleanse'] : [];
  return {
    id: character.id, name: character.name, title: character.title, role: character.role,
    level, exp: 0, hp: maxHp, mp: maxMp, maxHp, maxMp,
    vig: statAt(character, 'vig', level), mag: statAt(character, 'mag', level),
    sta: statAt(character, 'sta', level), res: statAt(character, 'res', level),
    spd: statAt(character, 'spd', level), lck: statAt(character, 'lck', level),
    spells: starterSpells, defending: false,
  };
}

export function newGame(data) {
  const roster = ['vesna', 'corvin', 'wick'].map((id) => makeMember(data.characters[id]));
  return {
    version: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    playTime: 0,
    world: 'whole',
    mapId: 'harrowmere',
    spawn: 'default',
    position: null,
    gold: 500,
    roster,
    active: roster.map((member) => member.id),
    inventory: { potion: 5, antidote: 2, tonic: 2 },
    opened: [],
    flags: [],
    quest: { id: 'warm-earth', stage: 0, text: 'Speak with Elder Sabbath' },
    steps: 0,
    victories: 0,
  };
}

export function normalizeState(data, raw) {
  const fresh = newGame(data);
  if (!raw || raw.version !== 2) return fresh;
  const state = { ...fresh, ...raw };
  state.roster = (raw.roster ?? []).filter((member) => data.characters[member.id]).map((member) => {
    const basis = makeMember(data.characters[member.id], clamp(Number(member.level) || 1, 1, 99));
    return { ...basis, ...member, hp: clamp(member.hp ?? basis.maxHp, 0, basis.maxHp),
      mp: clamp(member.mp ?? basis.maxMp, 0, basis.maxMp) };
  });
  if (!state.roster.length) state.roster = fresh.roster;
  if (!data.maps[state.mapId]) state.mapId = 'harrowmere';
  state.inventory = { ...fresh.inventory, ...(raw.inventory ?? {}) };
  state.opened = Array.isArray(raw.opened) ? raw.opened : [];
  state.flags = Array.isArray(raw.flags) ? raw.flags : [];
  return state;
}

export function loadSave(data) {
  try { return normalizeState(data, JSON.parse(localStorage.getItem(SAVE_KEY))); }
  catch { return null; }
}

export function hasSave() { return Boolean(localStorage.getItem(SAVE_KEY)); }

export function saveGame(state) {
  state.updatedAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  return state.updatedAt;
}

export function clearSave() { localStorage.removeItem(SAVE_KEY); }

export function loadConfig() {
  const defaults = { music: .55, sound: .75, camera: 'follow' };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(CONFIG_KEY)) }; }
  catch { return defaults; }
}

export function saveConfig(config) { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); }

export function activeParty(state) {
  return state.active.map((id) => state.roster.find((member) => member.id === id)).filter(Boolean);
}

export function restoreParty(state) {
  for (const member of state.roster) { member.hp = member.maxHp; member.mp = member.maxMp; }
}

export function grantExp(state, amount) {
  const levels = [];
  for (const member of activeParty(state)) {
    member.exp += amount;
    const needed = member.level * member.level * 18;
    if (member.exp >= needed && member.level < 99) {
      member.exp -= needed;
      member.level += 1;
      member.maxHp += 30;
      member.maxMp += 6;
      member.hp = member.maxHp;
      member.mp = member.maxMp;
      member.vig += 2; member.mag += 2; member.sta += 2; member.res += 2; member.spd += 1;
      levels.push(member.name);
    }
  }
  return levels;
}
