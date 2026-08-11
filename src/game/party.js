import { CHARACTERS, statAt, expForLevel, levelForExp } from '../data/characters.js';
import { analytics, EV } from '../engine/analytics.js';
import { QUESTS } from '../data/quests.js';

/**
 * Party and roster state.
 *
 * A `Member` is a recruited character's live state: level, experience, current
 * HP/MP, equipment, learned spells, statuses that persist out of battle. The
 * `Party` owns the roster, the active four, gold and the inventory.
 */

export class Member {
  constructor(charId, level = 1) {
    const def = CHARACTERS[charId];
    if (!def) throw new Error(`Unknown character: ${charId}`);
    this.id = charId;
    this.def = def;
    this.exp = expForLevel(level);
    this.level = level;
    this.equipment = { weapon: null, offhand: null, head: null, body: null, relic1: null, relic2: null };
    this.spells = {};              // spellId → proficiency 0..100
    this.esper = null;             // equipped magicite
    this.statuses = {};            // persistent statuses (e.g. 'zombie')
    this.hp = this.maxHP;
    this.mp = this.maxMP;
    this.limit = 0;                // desperation gauge 0..100
    this.commands = ['attack', def.command, 'magic', 'item'];
  }

  get name() { return this.def.name; }

  /** Base stat before equipment. */
  baseStat(stat) { return statAt(this.id, stat, this.level); }

  /** Stat including equipment bonuses. */
  stat(stat) {
    let v = this.baseStat(stat);
    for (const item of Object.values(this.equipment)) {
      if (item?.stats?.[stat]) v += item.stats[stat];
    }
    // Espers add their own growth bonus while equipped.
    if (this.esper?.bonus?.[stat]) v += this.esper.bonus[stat];
    return Math.max(1, Math.round(v));
  }

  get maxHP() {
    let v = this.baseStat('hp');
    for (const item of Object.values(this.equipment)) if (item?.stats?.hp) v += item.stats.hp;
    if (this.esper?.bonus?.hp) v += this.esper.bonus.hp;
    return Math.max(1, Math.round(v));
  }

  get maxMP() {
    let v = this.baseStat('mp');
    for (const item of Object.values(this.equipment)) if (item?.stats?.mp) v += item.stats.mp;
    if (this.esper?.bonus?.mp) v += this.esper.bonus.mp;
    return Math.max(0, Math.round(v));
  }

  get isKO() { return this.hp <= 0; }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHP, this.hp + amount);
    return this.hp - before;
  }

  restoreMP(amount) {
    const before = this.mp;
    this.mp = Math.min(this.maxMP, this.mp + amount);
    return this.mp - before;
  }

  fullRestore() {
    this.hp = this.maxHP;
    this.mp = this.maxMP;
    this.statuses = {};
  }

  /** Award experience. Returns the number of levels gained. */
  gainExp(amount) {
    if (this.isKO) return 0;
    const before = this.level;
    this.exp += amount;
    this.level = levelForExp(this.exp);
    const gained = this.level - before;
    if (gained > 0) {
      analytics.track(EV.LEVEL_GAINED, {
        character: this.id, character_name: this.name,
        level: this.level, levels_gained: gained, from_level: before,
      });
      // Level-ups top up the *gained* HP/MP rather than fully healing, which
      // would make levelling a free rest.
      const hpGain = statAt(this.id, 'hp', this.level) - statAt(this.id, 'hp', before);
      const mpGain = statAt(this.id, 'mp', this.level) - statAt(this.id, 'mp', before);
      this.hp = Math.min(this.maxHP, this.hp + hpGain);
      this.mp = Math.min(this.maxMP, this.mp + mpGain);
    }
    return gained;
  }

  get expToNext() {
    return Math.max(0, expForLevel(this.level + 1) - this.exp);
  }

  knowsSpell(id) { return (this.spells[id] ?? 0) >= 100; }

  learnSpell(id, amount = 100) {
    const before = this.spells[id] ?? 0;
    this.spells[id] = Math.min(100, before + amount);
    const learned = this.spells[id] >= 100;
    if (learned && before < 100) {
      analytics.track(EV.SPELL_LEARNED, { spell: id, character: this.id, level: this.level });
    }
    return learned;
  }

  serialize() {
    return {
      id: this.id, exp: this.exp, hp: this.hp, mp: this.mp, limit: this.limit,
      equipment: Object.fromEntries(Object.entries(this.equipment).map(([k, v]) => [k, v?.id ?? null])),
      spells: this.spells, esper: this.esper?.id ?? null, statuses: this.statuses,
    };
  }
}

export class Party {
  constructor() {
    this.roster = new Map();       // charId → Member
    this.active = [];              // up to 4 charIds, in formation order
    this.reserve = [];
    this.gold = 500;
    this.inventory = new Map();    // itemId → count
    this.espers = new Set();
    this.steps = 0;
    this.playTime = 0;
    this.flags = new Set();        // story flags
    this.quests = new Map();
    this.bestiary = new Map();
    this.row = new Map();          // charId → 'front' | 'back'
    // 'whole' before the cataclysm, 'ruin' after. Map definitions resolve
    // against this, so the same geography reads as a different world.
    this.worldState = 'whole';
    this.airship = null;    // {map, x, z, facing} once the ship is parked
  }

  recruit(charId, level = null) {
    if (this.roster.has(charId)) return this.roster.get(charId);
    // New members arrive near the party's current power, not at level 1 —
    // otherwise every late recruit is unusable dead weight.
    const avg = this.averageLevel();
    const m = new Member(charId, level ?? Math.max(1, Math.round(avg)));
    this.roster.set(charId, m);
    analytics.track(EV.CHARACTER_RECRUITED, {
      character: charId, character_name: m.name, level: m.level,
      roster_size: this.roster.size, play_seconds: Math.round(this.playTime),
    });
    this.row.set(charId, 'front');
    if (this.active.length < 4) this.active.push(charId);
    else this.reserve.push(charId);
    return m;
  }

  averageLevel() {
    if (!this.roster.size) return 1;
    let total = 0;
    for (const m of this.roster.values()) total += m.level;
    return total / this.roster.size;
  }

  member(id) { return this.roster.get(id) ?? null; }

  get activeMembers() {
    return this.active.map((id) => this.roster.get(id)).filter(Boolean);
  }

  /** Appearance definitions for the field, in formation order. */
  activeCharacterDefs() {
    return this.activeMembers.map((m) => ({ ...m.def.look, id: m.id }));
  }

  get isWiped() {
    return this.activeMembers.every((m) => m.isKO);
  }

  setActive(ids) {
    this.active = ids.slice(0, 4);
    this.reserve = [...this.roster.keys()].filter((id) => !this.active.includes(id));
  }

  // --- inventory ----------------------------------------------------------

  addItem(id, count = 1) {
    const next = Math.min(99, (this.inventory.get(id) ?? 0) + count);
    this.inventory.set(id, next);
    return next;
  }

  removeItem(id, count = 1) {
    const have = this.inventory.get(id) ?? 0;
    if (have < count) return false;
    if (have === count) this.inventory.delete(id);
    else this.inventory.set(id, have - count);
    return true;
  }

  countItem(id) { return this.inventory.get(id) ?? 0; }

  addGold(amount) { this.gold = Math.max(0, Math.min(9999999, this.gold + amount)); }
  spendGold(amount) {
    if (this.gold < amount) return false;
    this.gold -= amount;
    return true;
  }

  // --- flags & quests -----------------------------------------------------

  setFlag(name, on = true) {
    // `seen_*` is bookkeeping for which maps have been visited; it would
    // double every map event for nothing.
    if (on && !this.flags.has(name) && !name.startsWith('seen_')) {
      analytics.track(EV.STORY_FLAG_SET, { flag: name, play_seconds: Math.round(this.playTime) });
    }
    on ? this.flags.add(name) : this.flags.delete(name);
  }
  hasFlag(name) { return this.flags.has(name); }

  startQuest(id, stage = 0) {
    if (!this.quests.has(id)) analytics.track(EV.QUEST_STARTED, this._questProps(id));
    this.quests.set(id, { stage, done: false });
  }

  advanceQuest(id, stage) {
    const q = this.quests.get(id);
    if (!q || q.stage === stage) return;
    q.stage = stage;
    analytics.track(EV.QUEST_ADVANCED, { ...this._questProps(id), stage });
  }

  completeQuest(id) {
    const q = this.quests.get(id) || { stage: 0 };
    if (!q.done) analytics.track(EV.QUEST_COMPLETED, { ...this._questProps(id), stage: q.stage });
    q.done = true;
    this.quests.set(id, q);
  }

  /** Shared shape so a quest funnel can be built on one set of properties. */
  _questProps(id) {
    return {
      quest: id,
      quest_name: QUESTS[id]?.name ?? id,
      quest_kind: QUESTS[id]?.kind ?? 'side',
      party_level: Math.round(this.averageLevel()),
      play_seconds: Math.round(this.playTime),
    };
  }
  questStage(id) { return this.quests.get(id)?.stage ?? -1; }

  recordKill(enemyId) {
    this.bestiary.set(enemyId, (this.bestiary.get(enemyId) ?? 0) + 1);
  }

  hasEncounterWard() {
    return this.activeMembers.some((m) =>
      Object.values(m.equipment).some((e) => e?.effects?.includes('noEncounter')));
  }

  restAll() {
    for (const m of this.roster.values()) m.fullRestore();
  }

  serialize() {
    return {
      roster: [...this.roster.values()].map((m) => m.serialize()),
      active: this.active,
      gold: this.gold,
      inventory: [...this.inventory.entries()],
      espers: [...this.espers],
      flags: [...this.flags],
      quests: [...this.quests.entries()],
      bestiary: [...this.bestiary.entries()],
      row: [...this.row.entries()],
      playTime: this.playTime,
      steps: this.steps,
      worldState: this.worldState,
      // Where the airship was left, so it is still there on a reload.
      airship: this.airship,
    };
  }
}
