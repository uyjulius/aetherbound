import { analytics, EV } from '../engine/analytics.js';
import { Member, Party } from './party.js';
import { ITEMS } from '../data/items.js';
import { ESPERS } from '../data/espers.js';
import { serializeRng, deserializeRng } from '../engine/rng.js';

/**
 * Save data.
 *
 * Three numbered slots plus a separate config blob, all in localStorage.
 * Saves store *ids*, never object references — item and character definitions
 * are looked up fresh on load, so a content update never corrupts an existing
 * save.
 */

const PREFIX = 'aetherbound.save.';
const CONFIG_KEY = 'aetherbound.config';
const SLOTS = 3;
/**
 * The autosave, kept beside the three manual slots rather than inside them.
 *
 * Saving used to be entirely manual — two call sites, a save point and the
 * menu — while the only failure state in the game silently rolled the player
 * back to whatever they last chose to write. The simulator records about one
 * wipe in three hundred battles, so the game never trains the habit of
 * saving, and the one time it takes something away the player has almost
 * certainly not saved recently. It is a separate key so an autosave can never
 * overwrite a slot the player was curating.
 */
export const AUTOSAVE_SLOT = 'auto';
const VERSION = 1;

export const DEFAULT_CONFIG = {
  atbMode: 'wait',
  battleSpeed: 3,
  textSpeed: 4,
  musicVolume: 0.65,
  sfxVolume: 0.8,
  quality: 'high',
  windowColour: 'Sapphire',
};

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export class SaveManager {
  constructor() {
    this.slots = SLOTS;
  }

  _key(slot) { return `${PREFIX}${slot}`; }

  /** Slot summaries for the save/load screens; null for an empty slot. */
  list() {
    const out = [];
    for (let i = 0; i < SLOTS; i++) {
      out.push(this.peek(i));
    }
    return out;
  }

  peek(slot) {
    try {
      const raw = localStorage.getItem(this._key(slot));
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        slot,
        location: data.locationName || 'Unknown',
        level: data.leadLevel ?? 1,
        time: formatTime(data.party?.playTime ?? 0),
        gold: data.party?.gold ?? 0,
        saved: data.savedAt,
        names: data.partyNames || [],
      };
    } catch {
      return null;
    }
  }

  save(slot, game) {
    analytics.track(EV.GAME_SAVED, {
      slot, map: game.currentMapId, map_name: game.currentMapName,
      party_level: Math.round(game.party.averageLevel()),
      play_seconds: Math.round(game.party.playTime),
      gold: game.party.gold, roster_size: game.party.roster.size,
      world_state: game.party.worldState,
      quests_done: [...game.party.quests.values()].filter((q) => q.done).length,
    });
    const lead = game.party.activeMembers[0];
    const data = {
      version: VERSION,
      savedAt: Date.now(),
      mapId: game.currentMapId,
      spawn: game.currentSpawn ?? null,
      position: game.state?.player ? { x: game.state.player.x, z: game.state.player.z, facing: game.state.player.facing } : null,
      locationName: game.currentMapName || 'the road',
      leadLevel: lead?.level ?? 1,
      partyNames: game.party.activeMembers.map((m) => m.name),
      party: game.party.serialize(),
      rng: serializeRng(),
      config: game.config,
    };
    try {
      localStorage.setItem(this._key(slot), JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('[save] failed', err);
      return false;
    }
  }

  load(slot) {
    try {
      const raw = localStorage.getItem(this._key(slot));
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version !== VERSION) {
        console.warn('[save] version mismatch, ignoring slot', slot);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[save] failed to read', err);
      return null;
    }
  }

  delete(slot) {
    localStorage.removeItem(this._key(slot));
  }

  /** Rebuild a live Party from serialised data. */
  static restoreParty(data) {
    const party = new Party();
    party.gold = data.gold ?? 500;
    party.playTime = data.playTime ?? 0;
    party.steps = data.steps ?? 0;
    party.inventory = new Map(data.inventory || []);
    party.espers = new Set(data.espers || []);
    party.flags = new Set(data.flags || []);
    party.quests = new Map(data.quests || []);
    party.bestiary = new Map(data.bestiary || []);
    party.row = new Map(data.row || []);
    party.openedChests = new Set(data.openedChests || []);
    party.worldState = data.worldState || 'whole';
    party.airship = data.airship || null;

    for (const m of data.roster || []) {
      const member = new Member(m.id, 1);
      member.exp = m.exp;
      member.level = Math.max(1, memberLevelFromExp(m.exp));
      member.spells = m.spells || {};
      member.statuses = m.statuses || {};
      member.limit = m.limit ?? 0;
      member.esperGrowth = m.esperGrowth || {};
      for (const [slot, id] of Object.entries(m.equipment || {})) {
        member.equipment[slot] = id ? (ITEMS[id] ?? null) : null;
      }
      member.esper = m.esper ? (ESPERS[m.esper] ?? null) : null;
      member.hp = Math.min(m.hp ?? member.maxHP, member.maxHP);
      member.mp = Math.min(m.mp ?? member.maxMP, member.maxMP);
      party.roster.set(m.id, member);
      if (!party.row.has(m.id)) party.row.set(m.id, 'front');
    }
    party.active = (data.active || []).filter((id) => party.roster.has(id));
    if (!party.active.length) party.active = [...party.roster.keys()].slice(0, 4);
    party.reserve = [...party.roster.keys()].filter((id) => !party.active.includes(id));
    deserializeRng(data.rng);
    return party;
  }

  // --- config -------------------------------------------------------------

  loadConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  saveConfig(config) {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn('[save] config write failed', err);
    }
  }
}

// Imported lazily to avoid a circular dependency with characters.js.
function memberLevelFromExp(exp) {
  let lv = 1;
  const need = (l) => Math.round(24 * Math.pow(l - 1, 2.42) + 40 * (l - 1));
  while (lv < 99 && exp >= need(lv + 1)) lv++;
  return lv;
}

export const saves = new SaveManager();
