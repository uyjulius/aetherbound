import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { input } from './engine/input.js';
import { scheduler } from './engine/scheduler.js';
import { assets } from './engine/assets.js';
import { initKitMaterials } from './world/kit.js';
import { FieldState } from './world/field.js';
import { loadCharacterModels } from './world/charmodels.js';
import { loadMonsterModels } from './battle/monstermodels.js';
import { resolveMap } from './world/map.js';
import { BattleState } from './battle/battle.js';
import { DialogueBox } from './ui/dialogue.js';
import { ControlBar } from './ui/controls.js';
import { Party } from './game/party.js';
import { HARROWMERE } from './data/maps/harrowmere.js';
import { OVERWORLD } from './data/maps/overworld.js';
import { ENCOUNTERS, ENEMIES } from './data/enemies.js';
import { SPELLS } from './data/spells.js';
import { ITEMS, isEquippable } from './data/items.js';
import { rng } from './engine/rng.js';
import { audio } from './audio/audio.js';
import { TRACKS } from './data/music.js';
import { saves, SaveManager } from './game/saves.js';
import { MenuSystem, applyWindowTheme } from './ui/menu.js';
import { ShopScreen } from './ui/shop.js';
import { ESPERS } from './data/espers.js';
import { analytics, EV } from './engine/analytics.js';
import { dangerOf } from './world/danger.js';
import { TitleState } from './ui/title.js';

/** Stamped into every event so releases can be told apart. */
const BUILD = 'aetherbound-2026-08';
import { EVENTS } from './data/events.js';
import { FEN_BARROW } from './data/maps/fenbarrow.js';
import { SOLMERE } from './data/maps/solmere.js';
import { FERRAN_OUTPOST } from './data/maps/ferran.js';
import { ASHENHALL } from './data/maps/ashenhall.js';
import { CINDERSPINE } from './data/maps/cinderspine.js';
import { NINTH_WELL } from './data/maps/ninthwell.js';
import { WEEPING_WOOD } from './data/maps/weepingwood.js';
import { DROWNED_COAST } from './data/maps/drownedcoast.js';
import { INTERIORS } from './data/maps/interiors.js';
import { EMBERLYN, EMBERLYN_INTERIORS } from './data/maps/emberlyn.js';
import { SALTMARCH, SALTMARCH_INTERIORS } from './data/maps/saltmarch.js';
import { HIGHFELL, HIGHFELL_INTERIORS } from './data/maps/highfell.js';
import { DUNCASTLE, DUNCASTLE_INTERIORS } from './data/maps/duncastle.js';
import { VERRENHOLT, VERRENHOLT_INTERIORS } from './data/maps/verrenholt.js';
import { SUNKEN_VAULT } from './data/maps/sunkenvault.js';
import { THORNMARCH } from './data/maps/thornmarch.js';
import { GLASSWASTE } from './data/maps/glasswaste.js';
import { HOLLOW_MINE } from './data/maps/hollowmine.js';
import { STORMSPIRE } from './data/maps/stormspire.js';
import { VOL2_EVENTS } from './data/events-vol2.js';
import { BOSS_EVENTS } from './data/events-bosses.js';
import { VOL3_EVENTS } from './data/events-vol3.js';
import { OXMERE, OXMERE_INTERIORS } from './data/maps/oxmere.js';
import { CALDWICK, CALDWICK_INTERIORS } from './data/maps/caldwick.js';
import { THISTLEBECK, THISTLEBECK_INTERIORS } from './data/maps/thistlebeck.js';
import { GREYHARROW, GREYHARROW_INTERIORS } from './data/maps/greyharrow.js';
import { MARROWGATE, MARROWGATE_INTERIORS } from './data/maps/marrowgate.js';
import { LOWFEN, LOWFEN_INTERIORS } from './data/maps/lowfen.js';
import { EASTREACH } from './data/maps/eastreach.js';
import { ASHFALL } from './data/maps/ashfall.js';
import { GRAVELTIDE } from './data/maps/graveltide.js';
import { WINDWAKE } from './data/maps/windwake.js';
import { SOOTREACH } from './data/maps/sootreach.js';
import { PILGRIMS_REST } from './data/maps/pilgrimsrest.js';
import { THE_LOOM } from './data/maps/theloom.js';
import { THE_HOLLOWING } from './data/maps/thehollowing.js';
import { SALT_CATHEDRAL } from './data/maps/saltcathedral.js';
import { THE_UNDERTOW } from './data/maps/theundertow.js';
import { EMBERDEEP } from './data/maps/emberdeep.js';
import { THE_LONG_BARROW } from './data/maps/thelongbarrow.js';
import { THE_NINTH_GATE } from './data/maps/theninthgate.js';
import { WEXFORD, WEXFORD_INTERIORS } from './data/maps/wexford.js';
import { COLDHARBOUR, COLDHARBOUR_INTERIORS } from './data/maps/coldharbour.js';
import { NETTLEBED, NETTLEBED_INTERIORS } from './data/maps/nettlebed.js';
import { STONECROSS, STONECROSS_INTERIORS } from './data/maps/stonecross.js';
import { MERROWDYKE, MERROWDYKE_INTERIORS } from './data/maps/merrowdyke.js';
import { THRAPTON, THRAPTON_INTERIORS } from './data/maps/thrapton.js';
import { BELLFOUNDRY, BELLFOUNDRY_INTERIORS } from './data/maps/bellfoundry.js';
import { HOBBSFERRY, HOBBSFERRY_INTERIORS } from './data/maps/hobbsferry.js';
import { VOL4_EVENTS } from './data/events-vol4.js';
import { VOL5_EVENTS } from './data/events-vol5.js';
import { SALTWORKS } from './data/maps/saltworks.js';
import { KINGSPYRE } from './data/maps/kingspyre.js';
import { DROWNED_HALLS } from './data/maps/drownedhalls.js';
import { BRAMBLEWOLD } from './data/maps/bramblewold.js';
import { IRON_QUARRY } from './data/maps/ironquarry.js';
import { LAST_LANTERN } from './data/maps/lastlantern.js';
import { wait, until } from './engine/scheduler.js';

/**
 * Entry point. Owns the frame loop and the top-level state machine.
 *
 * States are objects with optional enter/exit/update/render hooks. Only one is
 * ever active; transitions are explicit so nothing leaks between the field,
 * battle and menu.
 */

const FIXED_DT = 1 / 60;
const MAX_FRAME = 0.25;

const MAPS = {
  harrowmere: HARROWMERE,
  overworld: OVERWORLD,
  fen_barrow: FEN_BARROW,
  solmere: SOLMERE,
  ferran_outpost: FERRAN_OUTPOST,
  ashenhall: ASHENHALL,
  cinderspine: CINDERSPINE,
  ninth_well: NINTH_WELL,
  weeping_wood: WEEPING_WOOD,
  drowned_coast: DROWNED_COAST,
  emberlyn: EMBERLYN,
  saltmarch: SALTMARCH,
  highfell: HIGHFELL,
  duncastle: DUNCASTLE,
  verrenholt: VERRENHOLT,
  sunkenvault: SUNKEN_VAULT,
  thornmarch: THORNMARCH,
  glasswaste: GLASSWASTE,
  hollowmine: HOLLOW_MINE,
  stormspire: STORMSPIRE,
  oxmere: OXMERE,
  caldwick: CALDWICK,
  thistlebeck: THISTLEBECK,
  greyharrow: GREYHARROW,
  marrowgate: MARROWGATE,
  lowfen: LOWFEN,
  eastreach: EASTREACH,
  ashfall: ASHFALL,
  graveltide: GRAVELTIDE,
  windwake: WINDWAKE,
  sootreach: SOOTREACH,
  pilgrimsrest: PILGRIMS_REST,
  theloom: THE_LOOM,
  thehollowing: THE_HOLLOWING,
  saltcathedral: SALT_CATHEDRAL,
  theundertow: THE_UNDERTOW,
  emberdeep: EMBERDEEP,
  thelongbarrow: THE_LONG_BARROW,
  theninthgate: THE_NINTH_GATE,
  wexford: WEXFORD,
  coldharbour: COLDHARBOUR,
  nettlebed: NETTLEBED,
  stonecross: STONECROSS,
  merrowdyke: MERROWDYKE,
  thrapton: THRAPTON,
  bellfoundry: BELLFOUNDRY,
  hobbsferry: HOBBSFERRY,
  saltworks: SALTWORKS,
  kingspyre: KINGSPYRE,
  drownedhalls: DROWNED_HALLS,
  bramblewold: BRAMBLEWOLD,
  ironquarry: IRON_QUARRY,
  lastlantern: LAST_LANTERN,
  // Each town carries its own interiors so a town and the rooms inside it stay
  // in one file; they are spread here alongside the original set.
  ...INTERIORS,
  ...EMBERLYN_INTERIORS,
  ...SALTMARCH_INTERIORS,
  ...HIGHFELL_INTERIORS,
  ...DUNCASTLE_INTERIORS,
  ...VERRENHOLT_INTERIORS,
  ...OXMERE_INTERIORS,
  ...CALDWICK_INTERIORS,
  ...THISTLEBECK_INTERIORS,
  ...GREYHARROW_INTERIORS,
  ...MARROWGATE_INTERIORS,
  ...LOWFEN_INTERIORS,
  ...WEXFORD_INTERIORS,
  ...COLDHARBOUR_INTERIORS,
  ...NETTLEBED_INTERIORS,
  ...STONECROSS_INTERIORS,
  ...MERROWDYKE_INTERIORS,
  ...THRAPTON_INTERIORS,
  ...BELLFOUNDRY_INTERIORS,
  ...HOBBSFERRY_INTERIORS,
};

/**
 * The main-arc scenes and the sidequests live in separate modules, but events
 * are addressed by a single flat id everywhere — map triggers, NPCs and props
 * all just name one — so they are merged into one lookup here.
 */
const ALL_EVENTS = {
  ...EVENTS, ...VOL2_EVENTS, ...VOL3_EVENTS, ...VOL4_EVENTS,
  ...VOL5_EVENTS, ...BOSS_EVENTS,
};

/** Weighted pick from an encounter table's formations. */
function pickEncounterGroup(encounters) {
  if (!encounters) return null;
  if (encounters.enemies) return encounters;           // already a formation
  const groups = encounters.groups || [];
  if (!groups.length) return null;
  return rng.encounter.weighted(groups.map((g) => [g.weight ?? 1, g]));
}

class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas, { quality: 'high' });
    this.uiRoot = document.getElementById('ui');
    this.stage = document.getElementById('stage');
    this.fadeEl = document.getElementById('fade');

    this.state = null;
    this.pendingState = null;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fps = 60;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this.paused = false;

    this.party = new Party();
    this.dialogue = null;
    this.saves = saves;
    this.config = saves.loadConfig();
    this.menu = null;
    // Where the party was standing when it last left each map, so a doorway
    // returns them to the doorway. Not saved: reloading inside a building and
    // stepping out falls back to the authored spawn, which is correct enough.
    this._returnPoints = new Map();
    this.currentMapId = 'harrowmere';
    this.currentMapName = 'Harrowmere';
    this.currentSpawn = 'default';
    applyWindowTheme(this.config.windowColour);
    this.renderer.setQuality(this.config.quality);

    input.attach(window);
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) input.clear();
    });

    // Browsers refuse to start audio without a gesture, so the engine comes up
    // on the player's very first input and then plays whatever the current
    // state asked for.
    const wake = () => {
      audio.init();
      audio.resume();
      if (this.pendingMusic) this.playMusic(this.pendingMusic);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('pointerdown', wake);
    };
    window.addEventListener('keydown', wake);
    window.addEventListener('pointerdown', wake);

    this.controls = new ControlBar(this);
  }

  /**
   * Queue a state change for the next simulation tick.
   *
   * `suspend: true` parks the outgoing state instead of tearing it down, for
   * transitions the player is expected to come back from — a battle over the
   * field being the only one. The state itself decides what that means.
   */
  setState(next, { suspend = false } = {}) {
    this.pendingState = next;
    this.pendingSuspend = suspend;
  }

  /**
   * Run a coroutine on the global scheduler.
   *
   * Anything that reads input has to be driven from inside the fixed
   * simulation step — that is the only window where `justPressed` is valid.
   * Cutscenes, shops and menus all go through here rather than a bare
   * requestAnimationFrame loop.
   */
  run(genOrFn, tag = 'game') {
    return scheduler.run(genOrFn, tag);
  }

  saveConfig() {
    this.saves.saveConfig(this.config);
    audio.setVolume('music', this.config.musicVolume);
    audio.setVolume('sfx', this.config.sfxVolume);
  }

  /** Does a map id resolve? Used by exit validation and by tooling. */
  mapExists(id) { return Object.prototype.hasOwnProperty.call(MAPS, id); }

  /** The raw definition behind a map id, for anything that needs to look
   *  through a door without walking through it. */
  mapDefinition(id) { return MAPS[id] ?? null; }

  /** Every registered map id. */
  mapIds() { return Object.keys(MAPS); }

  /**
   * A periodic pulse, once a minute of played time.
   *
   * Everything else in the instrumentation fires on a decision. This is the
   * denominator: how long people play, where they are while they play it, and
   * whether the frame rate is holding up on their machine. Without it there is
   * no way to tell a session that ended because somebody finished from one
   * that ended because the game was chugging.
   */
  _sampleHeartbeat() {
    const minute = Math.floor(this.party.playTime / 60);
    if (minute === this._lastHeartbeat) return;
    this._lastHeartbeat = minute;
    if (!minute) return;

    const info = this.renderer?.renderer?.info;
    analytics.track(EV.PERFORMANCE_SAMPLED, {
      play_minutes: minute,
      fps: this.fps ? Math.round(this.fps) : null,
      draw_calls: info?.render?.calls ?? null,
      triangles: info?.render?.triangles ?? null,
      geometries: info?.memory?.geometries ?? null,
      textures: info?.memory?.textures ?? null,
      map: this.currentMapId,
      state: this.state?.constructor?.name ?? null,
      party_level: Math.round(this.party.averageLevel()),
      steps: this.party.steps,
    });
    // Walking distance is the pacing signal the battle count cannot give.
    if (minute % 5 === 0) {
      analytics.track(EV.STEPS_WALKED, { steps: this.party.steps, play_minutes: minute });
    }
  }

  /** Look up an encounter table by name, for per-region overworld zones. */
  encounterTable(name) {
    const t = ENCOUNTERS[name];
    if (!t) console.warn(`[game] unknown encounter table: ${name}`);
    return t ?? null;
  }

  /** Play a named track, remembering it if audio hasn't been unlocked yet. */
  playMusic(id, opts = {}) {
    const track = TRACKS[id];
    if (!track) return;
    this.pendingMusic = id;
    if (audio.ready) audio.play(track, opts);
  }

  _applyPendingState() {
    if (!this.pendingState) return;
    const next = this.pendingState;
    const suspend = this.pendingSuspend;
    this.pendingState = null;
    this.pendingSuspend = false;

    const prev = this.state;
    if (suspend && prev?.suspend) prev.suspend(this);
    else prev?.exit?.(this);

    this.state = next;
    // A state that was parked rather than destroyed comes back through
    // `resume`, which keeps everything it was holding — most importantly
    // where the player was standing.
    if (next?.suspended && next.resume) next.resume(this);
    else next?.enter?.(this);
  }

  /** Fade the whole screen. Resolves when the transition finishes. */
  fade(to, seconds = 0.5) {
    this.fadeEl.style.transition = `opacity ${seconds}s ease`;
    void this.fadeEl.offsetWidth;   // flush so the transition always plays
    this.fadeEl.style.opacity = String(to);
    return new Promise((res) => setTimeout(res, seconds * 1000));
  }

  // --- map travel ---------------------------------------------------------

  _wireField(field) {
    field.onExit = (exit) => {
      if (field._travelling) return;
      field._travelling = true;
      // Remember the doorway being walked through, so coming back out of it
      // puts the party there rather than at the map's spawn point. Every
      // interior in the game exits to `spawn: 'default'`, which is the town
      // *gate* — so leaving the inn used to teleport you to the edge of town.
      if (field.player) {
        this._returnPoints.set(this.currentMapId, {
          x: field.player.x, z: field.player.z, facing: field.player.facing,
        });
      }
      this.gotoMap(exit.to, exit.spawn, { byAir: exit.byAir === true, viaExit: true });
    };
    field.onEncounter = (encounters) => this.startBattle(encounters);
    return field;
  }

  /**
   * Resume from a saved game.
   *
   * The save format, the writer and `restoreParty` all existed; nothing ever
   * called them. The game could be saved and then never loaded — no Continue,
   * no Load menu, and a party wipe simply stood the dead party back up where
   * they fell, because there was nowhere to return them to.
   */
  async loadFrom(data) {
    analytics.track(EV.GAME_LOADED, {
      map: data?.mapId ?? null,
      play_seconds: Math.round(data?.party?.playTime ?? 0),
      world_state: data?.party?.worldState ?? null,
      roster_size: data?.party?.roster?.length ?? 0,
    });
    if (!data) return false;
    this.party = SaveManager.restoreParty(data.party ?? data);
    this._returnPoints.clear();
    // Restoring an exact position matters: saving in the middle of a dungeon
    // and reloading at its entrance loses real progress.
    const at = data.position
      ? { x: data.position.x, z: data.position.z, facing: data.position.facing }
      : null;
    const base = MAPS[data.mapId] ?? HARROWMERE;
    const def = resolveMap(base, this.party.worldState);
    await this.fade(1, 0.35);
    this.currentMapId = data.mapId ?? 'harrowmere';
    this.currentMapName = def.name;
    this.currentSpawn = data.spawn ?? null;
    const next = this._wireField(new FieldState(this, { mapDef: def, spawn: data.spawn ?? null, spawnAt: at }));
    this.setState(next);
    this._applyPendingState();
    await this.fade(0, 0.55);
    return true;
  }

  /** The most recently written slot, or null if the player has never saved. */
  latestSave() {
    let best = null;
    for (let i = 0; i < this.saves.slots; i++) {
      const data = this.saves.load(i);
      if (data && (!best || (data.savedAt ?? 0) > (best.savedAt ?? 0))) best = data;
    }
    return best;
  }

  async gotoMap(mapId, spawn = null, opts = {}) {
    const base = MAPS[mapId];
    if (!base) {
      console.warn(`[game] no such map: ${mapId}`);
      return;
    }
    const def = resolveMap(base, this.party.worldState);
    await this.fade(1, 0.35);
    this.currentMapId = mapId;
    this.currentMapName = def.name;
    this.currentSpawn = spawn;
    // Walking back through a door you came out of returns you to it. Scripted
    // travel — the cataclysm throwing the party across the world — deliberately
    // does not, and uses the authored spawn.
    const returnTo = opts.viaExit ? this._returnPoints.get(mapId) : null;
    const next = this._wireField(new FieldState(this, { mapDef: def, spawn, spawnAt: returnTo }));

    // Where the party is is the single most useful property on every other
    // event, so it is registered rather than repeated at each call site.
    analytics.register({ map: mapId, map_name: def.name, world_state: this.party.worldState });
    const arrival = {
      map: mapId, map_name: def.name, spawn: spawn ?? 'default',
      via: opts.byAir ? 'air' : opts.viaExit ? 'door' : 'script',
      party_level: Math.round(this.party.averageLevel()),
      play_seconds: Math.round(this.party.playTime),
      danger: Math.round(dangerOf(def, spawn)),
    };
    analytics.track(EV.MAP_ENTERED, arrival);
    if (!this.party.hasFlag(`seen_${mapId}`)) {
      this.party.setFlag(`seen_${mapId}`);
      analytics.track(EV.MAP_FIRST_SEEN, arrival);
      // Walking into somewhere the signpost warned about is the clearest
      // signal the difficulty gradient is not reading.
      const gap = arrival.danger - arrival.party_level;
      if (gap >= 12) analytics.track(EV.DOOR_WARNING_IGNORED, { ...arrival, level_gap: gap });
    }
    this.setState(next);
    this._applyPendingState();
    // Crossing an ocean means arriving over one. A party set down on foot at
    // the far shore would be standing in the sea, so the flight continues.
    if (opts.byAir && this.party.hasFlag('airship')) next.board(this);
    await this.fade(0, 0.55);
  }

  // --- events & cutscenes -------------------------------------------------

  /** Run a scripted event by id. Coroutine. */
  *runEvent(eventId, ctx = {}) {
    const ev = ALL_EVENTS[eventId];
    if (!ev) { console.warn(`[game] unknown event: ${eventId}`); return; }
    yield* ev(this, ctx);
  }

  /**
   * Start a battle from inside a cutscene and wait for its outcome.
   *
   * The field is only suspended, not torn down, so the scene resumes exactly
   * where it left off once the fight resolves.
   */
  *startBattleScene(encounter, opts = {}) {
    let result = null;
    this.startBattle(encounter, { ...opts, onComplete: (r) => { result = r; } });
    yield until(() => result !== null);
    // Wait for the field to be back and the fade to finish before continuing.
    yield until(() => !!this.state?.player);
    yield wait(0.65);
    return result;
  }

  /**
   * The end-of-game card: play time, party, and completion stats.
   * Coroutine, so the finale scene can wait for the player to dismiss it.
   */
  *showEnding() {
    const p = this.party;
    const hh = Math.floor(p.playTime / 3600);
    const mm = Math.floor((p.playTime % 3600) / 60);
    const lines = [
      `Time played: ${hh}h ${String(mm).padStart(2, '0')}m`,
      `Party: ${p.activeMembers.map((m) => `${m.name} Lv${m.level}`).join(', ')}`,
      `Espers recovered: ${p.espers.size} of ${Object.keys(ESPERS).length}`,
      `Species recorded: ${p.bestiary.size}`,
      `Quests completed: ${[...p.quests.values()].filter((q) => q.done).length}`,
    ];
    yield* this.dialogue.speak('The Ninth Year of the Quiet', lines);
    yield* this.dialogue.speak(null, [
      'Your save file is marked complete. Load it to keep exploring — the world stays open.',
    ]);
  }

  // --- world interactions the field delegates to us -----------------------

  /** Chest contents. Coroutine: the field yields* this. */
  *grantChest(contents, field) {
    audio.sfx('chest');
    if (!contents) { yield* this.dialogue.speak(null, ['It is empty.']); return; }
    switch (contents.kind) {
      case 'item':
        this.party.addItem(contents.id, contents.count ?? 1);
        yield* this.dialogue.speak(null, [`Found ${contents.label || ITEMS[contents.id]?.name || 'something'}.`]);
        break;
      case 'gold':
        this.party.addGold(contents.amount);
        yield* this.dialogue.speak(null, [`Found ${contents.amount} gil.`]);
        break;
      case 'esper': {
        const esper = ESPERS[contents.id];
        this.party.espers.add(contents.id);
        analytics.track(EV.ESPER_ACQUIRED, {
          esper: contents.id, map: this.currentMapId,
          owned: this.party.espers.size,
          party_level: Math.round(this.party.averageLevel()),
        });
        // Magicite gets its own cue. Finding one is the game's main progression
        // beat, and it should not sound like finding a hat.
        this.playMusic('esper', { fade: 0.6 });
        yield* this.dialogue.speak(null, [
          `A shard of magicite — ${esper?.name ?? contents.id}.`,
          esper?.flavour ?? '',
          'Equip it from the Espers menu to begin learning its magic.',
        ].filter(Boolean));
        if (field?.mapDef?.music) this.playMusic(field.mapDef.music, { fade: 1.4 });
        break;
      }
      case 'key':
        this.party.addItem(contents.id, contents.count ?? 1);
        yield* this.celebrate([`Obtained ${contents.label || ITEMS[contents.id]?.name || 'something'}.`], field);
        break;
      default:
        yield* this.dialogue.speak(null, ['Nothing of use.']);
        break;
    }
  }

  /**
   * A short fanfare over whatever is playing, then back to the map's theme.
   *
   * For key items and finished quests only. The cue stops meaning anything the
   * moment it plays for a third Potion, so callers should be sparing.
   */
  *celebrate(lines, field) {
    this.playMusic('fanfare', { fade: 0.15 });
    yield* this.dialogue.speak(null, lines);
    if (field?.mapDef?.music) this.playMusic(field.mapDef.music, { fade: 1.0 });
  }

  *openShop(shopId, field) {
    this.shop = this.shop || new ShopScreen(this);
    this.playMusic('shop', { fade: 0.4 });
    try {
      yield* this.shop.run(shopId);
    } finally {
      // Restore in `finally` so backing out of a shop mid-transaction, or any
      // throw inside it, still hands the town its own theme back.
      if (field?.mapDef?.music) this.playMusic(field.mapDef.music, { fade: 0.8 });
    }
  }

  *openInn(inn, field, npcDef) {
    const price = inn.price ?? 30;
    const choice = yield* this.dialogue.ask(
      `A room is ${price} gil. Rest?`,
      ['Rest', 'Not now'],
      { speaker: npcDef?.name ?? 'Innkeeper', cancelable: true },
    );
    if (choice !== 0) { this.dialogue.close(); return; }
    if (!this.party.spendGold(price)) {
      yield* this.dialogue.speak(npcDef?.name ?? 'Innkeeper', ["You haven't the coin. Come back when you have."]);
      return;
    }
    // Fade out, restore, fade back — the classic beat. `fade` returns a
    // promise, but this is a coroutine, so the timing is driven by yielded
    // waits rather than awaits.
    this.dialogue.close();
    this.playMusic('inn', { fade: 0.5 });
    this.fade(1, 1.0);
    yield wait(1.2);
    this.party.restAll();
    yield wait(0.9);
    this.fade(0, 1.0);
    yield wait(1.1);
    if (field?.mapDef?.music) this.playMusic(field.mapDef.music, { fade: 1.2 });
    yield* this.dialogue.speak(null, ['The party wakes rested. HP and MP fully restored.']);
  }

  *openSaveMenu(field) {
    const slots = this.saves.list();
    const labels = slots.map((s, i) => (s
      ? `Slot ${i + 1} — ${s.location}, Lv ${s.level}, ${s.time}`
      : `Slot ${i + 1} — Empty`));
    const choice = yield* this.dialogue.ask('Record your journey?', [...labels, 'Not now'], { cancelable: true });
    if (choice < 0 || choice >= slots.length) { this.dialogue.close(); return; }
    this.saves.save(choice, this);
    audio.sfx('chest');
    yield* this.dialogue.speak(null, [`Saved to slot ${choice + 1}.`]);
  }

  // --- battle -------------------------------------------------------------

  /**
   * Hand off from the field to a battle and back.
   *
   * The field state is kept alive (just suspended) rather than destroyed, so
   * returning from a fight is instantaneous and the player lands exactly where
   * they were standing.
   */
  async startBattle(encounters, opts = {}) {
    if (this.state instanceof BattleState) return;
    const field = this.state instanceof FieldState ? this.state : null;
    const group = opts.group || pickEncounterGroup(encounters);
    if (!group) return;

    if (field) field.paused = true;
    await this.fade(1, 0.28);

    const battle = new BattleState(this, {
      encounter: group,
      terrain: encounters?.terrain || opts.terrain || 'grass',
      scenery: encounters?.scenery || opts.scenery || 'field',
      boss: opts.boss ?? false,
      canFlee: opts.canFlee ?? true,
      onEnd: (result) => this._endBattle(result, field, opts),
    });
    this._suspendedField = field;
    this._battleStarted = Date.now();
    analytics.track(EV.BATTLE_STARTED, {
      enemies: group.enemies,
      enemy_count: group.enemies.length,
      formation: group.enemies.join('+'),
      boss: opts.boss ?? false,
      can_flee: opts.canFlee ?? true,
      terrain: encounters?.terrain || opts.terrain || 'grass',
      party_level: Math.round(this.party.averageLevel()),
      party: this.party.active,
      enemy_level: Math.round(group.enemies.reduce((n, id) =>
        n + (ENEMIES[id]?.level ?? 0), 0) / Math.max(1, group.enemies.length)),
      play_seconds: Math.round(this.party.playTime),
    });
    this.setState(battle, { suspend: true });
    this._applyPendingState();
    await this.fade(0, 0.45);
  }

  async _endBattle(result, field, opts) {
    await this.fade(1, 0.4);
    const wiped = result === 'defeat' && !opts.allowDefeat;
    analytics.track(EV.BATTLE_ENDED, {
      result,
      boss: opts.boss ?? false,
      seconds: this._battleStarted ? (Date.now() - this._battleStarted) / 1000 : null,
      party_level: Math.round(this.party.averageLevel()),
      survivors: this.party.activeMembers.filter((m) => !m.isKO).length,
      gold: this.party.gold,
    });
    if (result === 'flee') analytics.track(EV.BATTLE_FLED, { boss: opts.boss ?? false });
    if (wiped) {
      analytics.track(EV.PARTY_WIPED, {
        party_level: Math.round(this.party.averageLevel()),
        play_seconds: Math.round(this.party.playTime),
      });
    }
    if (wiped) {
      // Game over. Losing gets its own theme first — it should sound like
      // something, not like the battle music simply stopping.
      this.playMusic('gameover', { fade: 0.6 });
      await new Promise((r) => setTimeout(r, 2600));

      // Back to the last save. Standing the dead party up on the spot where
      // they were killed costs the defeat all its meaning — and drops them in
      // the middle of whatever killed them.
      const last = this.latestSave();
      if (last) {
        await this.loadFrom(last);
        this.party.restAll();
        this.playMusic(this.currentMapName && MAPS[this.currentMapId]?.music, { fade: 1.4 });
        opts.onComplete?.(result);
        return;
      }
      // Never saved: the run restarts rather than dead-ending.
      this.party.restAll();
      await this.gotoMap('harrowmere', 'default');
      opts.onComplete?.(result);
      return;
    }
    if (field) {
      // `resume` restores the atmosphere, camera, lights and field music, and
      // leaves the party standing where the fight started.
      this.setState(field);
      this._applyPendingState();
      this.renderer.autofocus = true;
    }
    opts.onComplete?.(result);
    await this.fade(0, 0.5);
  }

  loop = () => {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    let frame = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frame > MAX_FRAME) frame = MAX_FRAME;

    this._fpsAccum += frame;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this.fps = this._fpsFrames / this._fpsAccum;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }

    this._applyPendingState();

    if (!this.paused) {
      this.accumulator += frame;
      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < 5) {
        // Input is polled per *simulation* tick, not per rendered frame.
        // Polling per frame drops presses whenever rendering outruns the fixed
        // step — at 120fps against a 60Hz sim that is every other input.
        input.poll(now);
        scheduler.update(FIXED_DT);
        this.state?.update?.(FIXED_DT, this);
        this.accumulator -= FIXED_DT;
        steps++;
        this.party.playTime += FIXED_DT;
        this._sampleHeartbeat();
      }
      if (steps === 5) this.accumulator = 0;   // recover from a long stall
    }

    this.state?.render?.(frame, this);
    this.renderer.render(frame);
    this.controls?.update();
    this.frameCount++;
  };

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

/**
 * A fresh campaign: the starting three, geared and taught enough magic to make
 * combat interesting from the first fight.
 */
async function startNewCampaign(game) {
  const equip = (member, ids) => {
    for (const id of ids) {
      const item = ITEMS[id];
      if (item) member.equipment[item.slot] = item;
    }
    member.fullRestore();
  };
  const vesna = game.party.recruit('vesna', 6);
  equip(vesna, ['ironsword', 'travelvest', 'leathercap']);
  for (const s of ['ember', 'rime', 'spark', 'mend', 'dimming']) vesna.learnSpell(s);

  const corvin = game.party.recruit('corvin', 6);
  equip(corvin, ['boltdirk', 'travelvest', 'leathercap', 'woodshield']);

  const wick = game.party.recruit('wick', 6);
  equip(wick, ['ashrod', 'silkrobe', 'leathercap']);
  for (const s of ['mend', 'cleanse', 'renewal', 'wardflesh', 'scan']) wick.learnSpell(s);

  game.party.addItem('potion', 5);
  game.party.addItem('antidote', 2);
  game.party.addItem('tonic', 2);
  // One esper to start, so the progression system is legible from the outset.
  game.party.espers.add('emberwake');
  vesna.esper = ESPERS.emberwake;

  analytics.track(EV.GAME_STARTED, { start_level: 6, party: game.party.active });
  // The opening map is set directly rather than through `gotoMap`, so it needs
  // its own event — without it every session's first map is missing and the
  // funnel starts at whatever door the player walked through second.
  analytics.register({ map: 'harrowmere', map_name: HARROWMERE.name, world_state: 'whole' });
  analytics.track(EV.MAP_ENTERED, {
    map: 'harrowmere', map_name: HARROWMERE.name, spawn: 'default', via: 'boot',
    party_level: Math.round(game.party.averageLevel()), play_seconds: 0, danger: 0,
  });
  analytics.track(EV.MAP_FIRST_SEEN, { map: 'harrowmere', map_name: HARROWMERE.name, via: 'boot' });

  game.currentMapId = 'harrowmere';
  game.currentMapName = HARROWMERE.name;
  game.setState(game._wireField(new FieldState(game, { mapDef: HARROWMERE, spawn: 'default' })));
  game._applyPendingState();
}

async function boot() {
  const bootStarted = performance.now();
  const canvas = document.getElementById('view');
  const game = new Game(canvas);
  window.__game = game;   // handy for debugging and automated smoke tests

  analytics.init({ version: BUILD }).register({ quality: game.config?.quality ?? null });
  window.__analytics = analytics;
  window.__input = input;   // debug: the input singleton, for the stuck-controls probes
  analytics.track(EV.APP_LOADED, { load_seconds: performance.now() / 1000 });

  // A crash the player hits and never reports is the most expensive kind.
  window.addEventListener('error', (e) => analytics.track(EV.ERROR_THROWN, {
    message: String(e.message).slice(0, 300),
    source: `${e.filename ?? ''}:${e.lineno ?? 0}`,
    stack: String(e.error?.stack ?? '').slice(0, 600),
    map: game.currentMapId, state: game.state?.constructor?.name ?? null,
  }));
  window.addEventListener('unhandledrejection', (e) => analytics.track(EV.ERROR_THROWN, {
    message: String(e.reason?.message ?? e.reason).slice(0, 300),
    stack: String(e.reason?.stack ?? '').slice(0, 600),
    kind: 'promise', map: game.currentMapId,
  }));
  window.__audio = audio;
  window.__tracks = TRACKS;
  window.__spells = SPELLS;
  window.__items = ITEMS;
  window.__equippable = isEquippable;
  window.THREE_V3 = THREE.Vector3;   // for tools/ probes
  window.THREE_BOX3 = THREE.Box3;    // ditto — measuring what is actually on screen
  window.__enemies = ENEMIES;
  window.__encounters = ENCOUNTERS;
  window.__maps = MAPS;
  window.THREE_GROUP = THREE.Group;

  const bootEl = document.getElementById('boot');
  const fill = document.getElementById('boot-fill');
  const status = document.getElementById('boot-status');

  status.textContent = 'Mixing pigments…';
  assets.init(game.renderer.renderer);
  assets.onProgress = (pct) => { fill.style.width = `${pct * 84}%`; };
  await assets.loadAll();

  // Character models are glTF files made by artists, and every map builds its
  // NPCs synchronously, so they have to be in memory before the first one is
  // constructed.
  status.textContent = 'Waking the cast…';
  const modelCount = await loadCharacterModels('assets/models/', (pct) => {
    fill.style.width = `${84 + pct * 3}%`;
  });
  console.log(`[boot] ${modelCount} character models loaded`);

  // The bestiary is preloaded too: a battle is entered from a fade, and
  // fetching a creature's mesh at that moment would stall the transition.
  status.textContent = 'Waking what sleeps…';
  const monsterCount = await loadMonsterModels('assets/monsters/', (pct) => {
    fill.style.width = `${87 + pct * 3}%`;
  });
  console.log(`[boot] ${monsterCount} monster models loaded`);

  status.textContent = 'Raising the village…';
  fill.style.width = '92%';
  initKitMaterials();
  game.dialogue = new DialogueBox(game.uiRoot);
  game.menu = new MenuSystem(game);

  status.textContent = 'Waking the world…';
  fill.style.width = '100%';

  analytics.track(EV.ASSETS_LOADED, {
    boot_seconds: (performance.now() - bootStarted) / 1000,
    quality: game.config?.quality ?? null,
  });

  // Boot ends at the title, not in the field. The game used to start a fresh
  // campaign on every load, and the only way to reach a save was to start a
  // new game over the top of it and open the menu from inside.
  game.setState(new TitleState(game, {
    mapDef: HARROWMERE,
    onNewGame: () => startNewCampaign(game),
    onLoad: (data) => game.loadFrom(data),
  }));
  game.start();

  // Debug hook so combat can be exercised without walking to an encounter.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB' && game.state instanceof FieldState) {
      game.startBattle(ENCOUNTERS.siltroad_south);
    }
    if (e.code === 'KeyN' && game.state instanceof FieldState) {
      game.startBattle({ enemies: ['bogfather'] }, { boss: true, scenery: 'field' });
    }
  });

  bootEl.classList.add('hidden');
  await game.fade(0, 1.0);
}

boot().catch((err) => {
  console.error(err);
  const status = document.getElementById('boot-status');
  if (status) {
    status.textContent = `Failed to start — ${err.message}`;
    status.style.color = '#e0574f';
  }
});
