import * as THREE from 'three';
import { input } from '../engine/input.js';
import { scheduler, wait, until, tween, over, EASE } from '../engine/scheduler.js';
import { rng } from '../engine/rng.js';
import { BattleView } from './view.js';
import { BattleUI } from './ui.js';
import { SPELLS, spellCost } from '../data/spells.js';
import { ITEMS } from '../data/items.js';
import { TEACH_RATE } from '../data/espers.js';
import { enemyById } from '../data/enemies.js';
import { ELEMENT_COLOR } from '../engine/palette.js';
import { PACING } from './pacing.js';
import { audio } from '../audio/audio.js';
import { analytics, EV } from '../engine/analytics.js';
import { playSpellFX } from '../fx/spellfx.js';
import {
  physicalDamage, monsterDamage, magicDamage, healAmount, rollHit, rollCritical,
  rollStatus, elementalMultiplier, atbRate, limitGain, expShare, goldShare,
  STATUSES, TICK_RATES, MONSTER_SPELL_REFERENCE,
} from './formulas.js';

/**
 * Active-time battle.
 *
 * The core loop is: every conscious combatant fills an ATB gauge; when it
 * fills they act. Player turns open a command menu (which optionally freezes
 * the gauges — "wait" mode); enemy turns consult a small rule script. Actions
 * are coroutines so animation, damage and text stay in lockstep without a
 * separate animation state machine.
 */

let nextCombatantId = 1;

/**
 * How often a creature repeats the signature move of the phase it is in.
 *
 * Every third turn. Once, on entering, is too little — that was the old
 * behaviour and it made bosses get *weaker* as their health fell. Every turn
 * is too much: it turns the end of every fight into one move on a loop and
 * pushed six bosses under a 50% win rate against a party at their own level.
 */
export const PHASE_REPEAT = 3;

// ---------------------------------------------------------------------------
// Combatants
// ---------------------------------------------------------------------------

class Combatant {
  constructor() {
    this.uid = nextCombatantId++;
    this.atb = 0;
    this.statuses = {};      // id → { turns, meta }
    this.scanned = false;
    this.turnCount = 0;
    this.phase = 1;
  }

  get isKO() { return this.hp <= 0; }
  get canAct() {
    if (this.isKO) return false;
    return !Object.keys(this.statuses).some((s) => STATUSES[s]?.blocksTurn);
  }

  hasStatus(id) { return id in this.statuses; }

  addStatus(id, turns = 0) {
    const def = STATUSES[id];
    if (!def) return false;
    if (this.immune?.includes(id)) return false;
    // A good status cancels its opposite rather than stacking.
    const opposites = { haste: 'slow', slow: 'haste', protect: null, shell: null };
    const opp = opposites[id];
    if (opp && this.statuses[opp]) delete this.statuses[opp];
    this.statuses[id] = { turns: turns || def.duration || 0 };
    if (id === 'ko') this.hp = 0;
    return true;
  }

  removeStatus(id) { delete this.statuses[id]; }

  clearBadStatuses() {
    for (const id of Object.keys(this.statuses)) {
      if (STATUSES[id]?.kind === 'bad' && id !== 'ko') delete this.statuses[id];
    }
  }
}

class PartyCombatant extends Combatant {
  constructor(member, row) {
    super();
    this.kind = 'party';
    this.member = member;
    this.id = member.id;
    this.def = member.def;
    this.name = member.name;
    this.row = row || 'front';
    this.hp = member.hp;
    this.maxHP = member.maxHP;
    this.mp = member.mp;
    this.maxMP = member.maxMP;
    this.limit = member.limit ?? 0;
    this.immune = member.def.immune || [];
    for (const item of Object.values(member.equipment)) {
      if (item?.immune) this.immune = this.immune.concat(item.immune);
    }
    if (member.hp <= 0) this.statuses.ko = { turns: 0 };
  }

  stat(s) { return this.member.stat(s); }
  get level() { return this.member.level; }
  get weapon() { return this.member.equipment.weapon; }

  get attack() {
    const base = this.weapon?.stats?.atk ?? 12;
    let bonus = 0;
    for (const item of Object.values(this.member.equipment)) bonus += item?.stats?.atk ?? 0;
    return base + (bonus - (this.weapon?.stats?.atk ?? 0));
  }

  get defence() {
    let d = Math.floor(this.stat('sta') * 0.7);
    for (const item of Object.values(this.member.equipment)) d += item?.stats?.def ?? 0;
    return d;
  }

  get magicDefence() {
    let d = Math.floor(this.stat('res') * 0.8);
    for (const item of Object.values(this.member.equipment)) d += item?.stats?.mdef ?? 0;
    return d;
  }

  get evade() {
    let e = Math.floor(this.stat('spd') * 0.22);
    for (const item of Object.values(this.member.equipment)) e += item?.stats?.eva ?? 0;
    return e;
  }

  get affinity() {
    if (this._unmade) return {};
    const a = {};
    for (const item of Object.values(this.member.equipment)) Object.assign(a, item?.resist || {});
    return a;
  }

  /** Write live battle state back to the persistent member. */
  commit() {
    this.member.hp = Math.max(0, this.hp);
    this.member.mp = Math.max(0, this.mp);
    this.member.limit = this.limit;
    // Only ailments flagged `persists` survive the battle.
    const keep = {};
    for (const id of Object.keys(this.statuses)) {
      if (STATUSES[id]?.persists) keep[id] = true;
    }
    this.member.statuses = keep;
  }
}

class EnemyCombatant extends Combatant {
  constructor(def, index, total) {
    super();
    this.kind = 'enemy';
    this.def = def;
    this.id = `${def.id}#${index}`;
    // Multiple copies get A/B/C suffixes, as tradition demands.
    this.name = total > 1 ? `${def.name} ${String.fromCharCode(65 + index)}` : def.name;
    this.level = def.level;
    this.maxHP = def.stats.hp;
    this.hp = def.stats.hp;
    this.maxMP = def.stats.mp;
    this.mp = def.stats.mp;
    this.row = 'front';
    this.immune = def.immune || [];
    this.aiTurn = 0;
  }

  stat(s) {
    const map = { vig: 'atk', spd: 'spd', sta: 'def', mag: 'mag', res: 'mdef', lck: 'lck' };
    return this.def.stats[map[s] || s] ?? 10;
  }

  get attack() { return this.def.stats.atk; }
  get defence() { return this.def.stats.def; }
  get magicDefence() { return this.def.stats.mdef; }
  get evade() { return this.def.stats.eva ?? 0; }
  // Maret's Unmake blanks the table for the rest of the fight, so an absorb
  // becomes a plain hit. `affinity` is derived rather than stored, hence a
  // flag rather than an assignment.
  get affinity() { return this._unmade ? {} : (this.def.affinity || {}); }
}

// ---------------------------------------------------------------------------
// Battle state
// ---------------------------------------------------------------------------

export class BattleState {
  constructor(game, { encounter, terrain = 'grass', scenery = 'field', boss = false, onEnd = null, canFlee = true }) {
    this.game = game;
    this.encounterDef = encounter;
    this.terrain = terrain;
    this.scenery = scenery;
    this.isBoss = boss;
    this.onEnd = onEnd;
    this.canFlee = canFlee && !boss;

    this.party = [];
    this.enemies = [];
    this.view = null;
    this.ui = null;
    this.phase = 'intro';        // intro | active | menu | executing | ending
    this.activeActor = null;
    this.queue = [];
    this.battleSpeed = game.config?.battleSpeed ?? 3;
    this.waitMode = game.config?.atbMode !== 'active';
    this.escapeHold = 0;
    this.result = null;
    this.turnLog = [];
  }

  // --- lifecycle ----------------------------------------------------------

  enter(game) {
    const members = game.party.activeMembers;
    this.party = members.map((m) => new PartyCombatant(m, game.party.row.get(m.id)));

    // `autoReflect` is a standing condition, not something cast, so it is
    // applied here rather than on the first turn — a reflect that only came up
    // after the enemy's opening spell would be worthless on exactly the fights
    // it is bought for.
    for (const c of this.party) {
      if (Object.values(c.member.equipment).some((e) => e?.effects?.includes('autoReflect'))) {
        c.addStatus('reflect');
      }
    }

    const ids = this.encounterDef.enemies || [];
    const counts = new Map();
    this.enemies = ids.map((id, i) => {
      const def = enemyById(id);
      const n = counts.get(id) ?? 0;
      counts.set(id, n + 1);
      return def ? new EnemyCombatant(def, n, ids.filter((x) => x === id).length) : null;
    }).filter(Boolean);

    this.view = new BattleView(game.renderer, { terrain: this.terrain, scenery: this.scenery });
    this.view.build(this.party, this.enemies);

    this.ui = new BattleUI(game.uiRoot);
    this.ui.buildPartyPanel(this.party);

    game.renderer.postfx.setGrade(this.isBoss ? 'ruin' : 'noon', 0.5);
    game.playMusic(this.isBoss ? 'boss' : 'battle', { fade: 0.6 });

    const self = this;
    scheduler.run(function* () { yield* self.introSequence(); }, 'battle-intro');
  }

  exit(game) {
    this.ui?.clearTags();
    this.ui?.destroy();
    this.view?.teardown();
    scheduler.cancelTag('battle-intro');
    scheduler.cancelTag('battle-action');
  }

  *introSequence() {
    const boss = this.enemies.find((e) => e.def.boss);
    if (boss?.def.intro) {
      this.ui.showBanner(boss.def.name, 2.2, '#e0574f');
      yield wait(0.6);
      yield* this.game.dialogue.speak(boss.def.name, [boss.def.intro]);
    }
    // A boss opens with its gauge part-filled.
    //
    // It has just been given a line of dialogue and a banner with its name on
    // it; going down before it has taken a single turn makes all of that a
    // joke. Half the bosses in the game were dying inside one round to a party
    // that had brought the right element, which is correct play being rewarded
    // — but the fight should still start.
    for (const e of this.enemies) if (e.def.boss) e.atb = 55;

    // Pre-emptive and back-attack rolls, the classic openers.
    const roll = rng.battle.next();
    if (roll < 0.06) {
      this.ui.showBanner('Pre-emptive!', 1.4, '#8ce07a');
      for (const c of this.party) c.atb = 100;
    } else if (roll > 0.97 && !this.isBoss) {
      this.ui.showBanner('Ambush!', 1.4, '#e0574f');
      for (const e of this.enemies) e.atb = 100;
    }
    this.phase = 'active';
  }

  // --- per-frame ----------------------------------------------------------

  update(dt, game) {
    this.view.update(dt);

    if (this.phase === 'active' || (this.phase === 'menu' && !this.waitMode)) {
      this._tickATB(dt);
    }
    if (this.phase === 'active') {
      this._maybeStartTurn();
    }
    // Fleeing works with a menu open. It has to: in wait mode a command menu
    // is up almost every frame — the moment anyone's gauge fills, phase is
    // 'menu' — so gating this on 'active' meant the escape hold literally
    // never accumulated and no battle could be fled at all, from the keyboard
    // or the Flee button alike.
    if (this.phase === 'active' || this.phase === 'menu') {
      this._handleFleeInput(dt);
    }
    if (this.phase === 'menu' && this.ui.activeMenu) {
      this.ui.activeMenu.update();
      this._updateTargeting();
    }

    this.ui.updatePartyPanel(this.party, this.activeActor?.id);
    this.ui.syncEnemyTags(this.enemies, this.view, this._targetedIds());
  }

  _tickATB(dt) {
    for (const c of [...this.party, ...this.enemies]) {
      if (c.isKO) continue;
      if (!c.canAct) { this._serveSentence(c, dt); continue; }
      const rate = atbRate(c.stat('spd'), {
        haste: c.hasStatus('haste'),
        slow: c.hasStatus('slow'),
        stop: c.hasStatus('stop'),
        battleSpeed: this.battleSpeed,
      });
      c.atb = Math.min(100, c.atb + rate * dt * 100 * 0.16);
    }
  }

  /**
   * Count down a turn-blocking status on somebody who cannot take turns.
   *
   * Durations are counted in the victim's own turns and decremented in
   * `endOfTurn`, which only runs when a combatant acts. Stop, Paralysis and
   * Freeze all set `blocksTurn`, so the victim never acted, so `endOfTurn`
   * never ran, so the counter never moved: every one of them was permanent
   * for the rest of the fight. The Ferran Warden's Grapnel is a 40% roll to
   * remove a party member from the game, and Arrest did the same to an enemy.
   *
   * So a blocked combatant serves its sentence on the clock it would have
   * acted on — the gauge still fills, it simply buys a tick of the status
   * instead of a turn. Only `blocksTurn` statuses are counted here; poison
   * and the other per-turn effects keep their existing meaning, because those
   * do fire on turns their victim actually takes.
   */
  _serveSentence(c, dt) {
    const rate = atbRate(c.stat('spd'), { battleSpeed: this.battleSpeed });
    c._blockedFill = (c._blockedFill ?? 0) + rate * dt * 100 * 0.16;
    if (c._blockedFill < 100) return;
    c._blockedFill = 0;
    for (const [id, state] of Object.entries(c.statuses)) {
      if (!STATUSES[id]?.blocksTurn || !(state.turns > 0)) continue;
      state.turns--;
      if (state.turns <= 0) c.removeStatus(id);
    }
  }

  _maybeStartTurn() {
    if (this.activeActor) return;
    // Enemies act the moment they're ready; the player's turn opens a menu.
    const readyEnemy = this.enemies.find((e) => !e.isKO && e.canAct && e.atb >= 100);
    if (readyEnemy) { this._beginEnemyTurn(readyEnemy); return; }
    const readyAlly = this.party.find((p) => !p.isKO && p.canAct && p.atb >= 100);
    if (readyAlly) this._beginPlayerTurn(readyAlly);
  }

  _handleFleeInput(dt) {
    if (!this.canFlee) return;
    // Holding both shoulder buttons runs away, as in the source material.
    if (input.isDown('pageLeft') && input.isDown('pageRight')) {
      this.escapeHold += dt;
      if (this.escapeHold > 0.9) this._flee();
    } else {
      this.escapeHold = Math.max(0, this.escapeHold - dt * 2);
    }
  }

  // --- player turn --------------------------------------------------------

  _beginPlayerTurn(actor) {
    this.activeActor = actor;
    this.phase = 'menu';
    this.view.play(actor.id, 'battleIdle');
    // A guard raised last turn lasts until this one — that is the whole trade
    // Defend offers, and it is spent now that the character is acting again.
    if (actor._defending) { actor._defending = false; actor.removeStatus('protect'); }

    if (actor.hasStatus('berserk')) {
      this._commitAction({ actor, kind: 'attack', targets: [this._randomEnemy()] });
      return;
    }
    if (actor.hasStatus('confuse')) {
      const pool = rng.battle.next() < 0.5 ? this.party : this.enemies;
      const t = pool.filter((c) => !c.isKO);
      this._commitAction({ actor, kind: 'attack', targets: [rng.battle.pick(t)] });
      return;
    }
    // Charmed: fighting for the other side, and meaning it.
    //
    // Beguile has been in the spell list from the beginning, costs 16 MP, and
    // did nothing at all — `charm` was in the status table, the UI displayed
    // it, four relics sold immunity to it, and no line of code anywhere read
    // it. Confuse hits either side at random; charm always hits your own,
    // which is what makes it worth the extra MP.
    if (actor.hasStatus('charm')) {
      const own = this.party.filter((c) => !c.isKO && c !== actor);
      if (own.length) {
        this._commitAction({ actor, kind: 'attack', targets: [rng.battle.pick(own)] });
        return;
      }
    }
    this._openCommandMenu(actor);
  }

  _openCommandMenu(actor) {
    const items = [
      { label: 'Attack', cmd: 'attack' },
      { label: commandLabel(actor.def.command), cmd: actor.def.command },
      { label: 'Magic', cmd: 'magic',
        disabled: actor.hasStatus('silence') || actor.hasStatus('imp')
          || !this._spellsFor(actor).length },
      { label: 'Item', cmd: 'item' },
      { label: 'Defend', cmd: 'defend' },
      { label: actor.row === 'front' ? 'Row: Front' : 'Row: Back', cmd: 'row' },
    ];
    // One summon per battle, in the tradition — an esper is a resource you
    // spend, not a spell you spam.
    const esper = actor.member?.esper;
    if (esper) {
      items.splice(2, 0, {
        label: `Summon: ${esper.name}`, cmd: 'summon',
        right: `${esper.mp} MP`,
        disabled: actor._summoned || actor.mp < esper.mp,
      });
    }
    // Appended, not unshifted. Putting it first meant that on the exact turn
    // the gauge filled, the top item silently stopped being Attack — and a
    // player confirming out of habit spent a once-a-fight resource on
    // whatever the default target happened to be. Menu positions have to be
    // stable turn to turn; a new option arrives at the bottom, where nothing
    // else moves under the cursor.
    if (actor.limit >= 100) items.push({ label: '★ Desperation', cmd: 'limit' });

    this.ui.showCommands(items, {
      title: actor.name,
      onSelect: (item) => this._chooseCommand(actor, item.cmd),
      onCancel: () => {},
    });
  }

  _spellsFor(actor) {
    const known = Object.entries(actor.member?.spells || {})
      .filter(([, v]) => v >= 100)
      .map(([id]) => SPELLS[id])
      .filter(Boolean);
    return known;
  }

  _chooseCommand(actor, cmd) {
    analytics.track(EV.COMMAND_USED, {
      command: cmd, character: actor.id, character_name: actor.name,
      level: actor.level, boss: this.isBoss,
      unique: cmd === actor.def.command,
      hp_fraction: actor.hp / Math.max(1, actor.maxHP),
    });
    switch (cmd) {
      case 'attack':
        this._beginTargeting(actor, 'oneEnemy', (targets) =>
          this._commitAction({ actor, kind: 'attack', targets }));
        break;

      case 'defend':
        this._commitAction({ actor, kind: 'defend', targets: [actor] });
        break;

      case 'row':
        actor.row = actor.row === 'front' ? 'back' : 'front';
        this.game.party.row.set(actor.id, actor.row);
        analytics.track(EV.ROW_CHANGED, { character: actor.id, row: actor.row, where: 'battle' });
        this.ui.popMenu();
        this._openCommandMenu(actor);
        break;

      case 'magic': {
        const spells = this._spellsFor(actor);
        const items = spells.map((s) => {
          const cost = spellCost(s, actor.member);
          // The element goes on the row. This is the one screen where the
          // choice of element decides the fight, and it was the one screen
          // that hid it: the field menu shows school, element, power and
          // target, while this showed a name and a bare number, so a player
          // had to have memorised which of forty spell names is the ice one.
          return {
            label: s.element ? `${s.name} · ${s.element}` : s.name,
            right: `${cost} MP`, spell: s,
            disabled: actor.mp < cost,
          };
        });
        this.ui.showCommands(items, {
          title: 'Magic',
          onSelect: (item) => this._beginTargeting(actor, item.spell.target, (targets) =>
            this._commitAction({ actor, kind: 'spell', spell: item.spell, targets }),
          { targetsKO: !!item.spell.targetsKO }),
          onCancel: () => this.ui.popMenu(),
        });
        break;
      }

      case 'item': {
        const inv = [...this.game.party.inventory.entries()]
          .map(([id, count]) => ({ item: ITEMS[id], count }))
          .filter((e) => e.item && e.item.kind === 'consumable');
        const items = inv.map((e) => ({ label: e.item.name, right: `×${e.count}`, item: e.item }));
        if (!items.length) items.push({ label: '(no items)', disabled: true });
        this.ui.showCommands(items, {
          title: 'Item',
          onSelect: (entry) => this._beginTargeting(actor, entry.item.target, (targets) =>
            this._commitAction({ actor, kind: 'item', item: entry.item, targets }),
          { targetsKO: !!entry.item.targetsKO }),
          onCancel: () => this.ui.popMenu(),
        });
        break;
      }

      case 'summon': {
        const esper = actor.member.esper;
        const targets = esper.summon.target === 'allAllies'
          ? this.party.filter((p) => !p.isKO)
          : esper.summon.target === 'oneEnemy'
            ? [this._randomEnemy()].filter(Boolean)
            : this.enemies.filter((e) => !e.isKO);
        this._commitAction({ actor, kind: 'summon', esper, targets });
        break;
      }

      case 'limit':
        this._commitAction({ actor, kind: 'limit', targets: this.enemies.filter((e) => !e.isKO) });
        break;

      default:
        this._runSpecialCommand(actor, cmd);
        break;
    }
  }

  /** Character-unique commands. */
  _runSpecialCommand(actor, cmd) {
    switch (cmd) {
      case 'pilfer':
        this._beginTargeting(actor, 'oneEnemy', (targets) =>
          this._commitAction({ actor, kind: 'steal', targets }));
        break;
      case 'blitz': {
        const moves = [
          { label: 'Rising Gale', power: 1.6, element: 'wind' },
          { label: 'Hammerfall', power: 2.1, target: 'all' },
          { label: 'Sunbreaker', power: 2.8, element: 'fire' },
        ].filter((m, i) => actor.level >= 1 + i * 8);
        this.ui.showCommands(moves.map((m) => ({ label: m.label, move: m })), {
          title: 'Blitz',
          onSelect: (item) => this._beginTargeting(actor, item.move.target === 'all' ? 'allEnemies' : 'oneEnemy',
            (targets) => this._commitAction({ actor, kind: 'special', move: item.move, targets })),
          onCancel: () => this.ui.popMenu(),
        });
        break;
      }
      case 'iaido': {
        const moves = [
          { label: 'First Form: Dew', power: 1.5 },
          { label: 'Second Form: Reed', power: 2.0, target: 'all' },
          { label: 'Third Form: Silence', power: 2.6, status: { silence: 60 } },
        ].filter((m, i) => actor.level >= 1 + i * 9);
        this.ui.showCommands(moves.map((m) => ({ label: m.label, move: m })), {
          title: 'Iaido',
          onSelect: (item) => this._beginTargeting(actor, item.move.target === 'all' ? 'allEnemies' : 'oneEnemy',
            (targets) => this._commitAction({ actor, kind: 'special', move: item.move, targets })),
          onCancel: () => this.ui.popMenu(),
        });
        break;
      }
      case 'annotate':
        this._beginTargeting(actor, 'oneEnemy', (targets) =>
          this._commitAction({ actor, kind: 'scan', targets }));
        break;
      case 'litany':
        this._commitAction({ actor, kind: 'special', targets: this.party.filter((p) => !p.isKO),
          move: { label: 'Litany of the Ninth', heal: 0.35, status: { regen: 100 } } });
        break;
      case 'wager': {
        const outcomes = [
          { label: 'Cinders', power: 1.4, element: 'fire', target: 'all' },
          { label: 'Hail', power: 1.6, element: 'ice', target: 'all' },
          { label: 'The Long Odds', power: 3.4 },
          { label: 'Nothing', power: 0 },
        ];
        const pick = rng.battle.weighted(outcomes.map((o, i) => [i === 3 ? 1 : i === 2 ? 1.5 : 3, o]));
        this._commitAction({ actor, kind: 'special', move: pick,
          targets: pick.target === 'all' ? this.enemies.filter((e) => !e.isKO) : [this._randomEnemy()] });
        break;
      }
      /**
       * Vesna — Attune. Re-elements her weapon for the rest of the fight.
       *
       * The whole game's affinity table is the puzzle; this is the tool for
       * solving it. Against the thing in the Well, which absorbs aether and
       * shrugs off steel, the answer is to stop swinging the biggest number
       * and start swinging the right one.
       */
      case 'attune': {
        const items = ['fire', 'ice', 'bolt', 'water', 'wind', 'earth', 'holy', 'shadow'].map((el) => ({
          label: el[0].toUpperCase() + el.slice(1),
          right: actor._attune === el ? 'attuned' : '',
          element: el,
        }));
        items.push({ label: 'Plain steel', element: null });
        this.ui.showCommands(items, {
          title: 'Attune',
          onSelect: (item) => {
            actor._attune = item.element;
            this._commitAction({ actor, kind: 'special', targets: [actor], move: {
              label: item.element ? `Attuned: ${item.label}` : 'Unattuned',
            } });
          },
          onCancel: () => { this.ui.popMenu(); this._openCommandMenu(actor); },
        });
        break;
      }

      /**
       * Aurelian — Contraption. One device per turn, each solving a different
       * problem, so he is the answer to whatever the fight is doing rather
       * than a second sword.
       */
      case 'contraption': {
        const devices = [
          { label: 'Scattergun', power: 1.5, target: 'all', desc: 'all foes' },
          { label: 'Ward Frame', heal: 0, status: { protect: 1, shell: 1 }, self: true, desc: 'party guard' },
          { label: 'Grapnel', power: 2.4, desc: 'one foe, hard' },
          { label: 'Smoke Pot', status: { blind: 1 }, target: 'all', desc: 'blind all' },
        ];
        this.ui.showCommands(devices.map((d) => ({ label: d.label, right: d.desc, device: d })), {
          title: 'Contraption',
          onSelect: ({ device }) => {
            const targets = device.self ? this.party.filter((c) => !c.isKO)
              : device.target === 'all' ? this.enemies.filter((e) => !e.isKO)
                : null;
            if (targets) this._commitAction({ actor, kind: 'special', targets, move: device });
            else this._beginTargeting(actor, 'oneEnemy', (t) =>
              this._commitAction({ actor, kind: 'special', targets: t, move: device }));
          },
          onCancel: () => { this.ui.popMenu(); this._openCommandMenu(actor); },
        });
        break;
      }

      /**
       * Maret — Unmake. Strips a target's buffs *and* its elemental affinities
       * for the rest of the fight. She spent years signing the requisitions
       * that made these things; she knows where the seams are.
       */
      case 'unmake':
        this._beginTargeting(actor, 'oneEnemy', (targets) =>
          this._commitAction({ actor, kind: 'special', targets, move: { label: 'Unmake', unmake: true } }));
        break;

      /**
       * Tam — Quarry. Marks one enemy; everyone hits it harder until it dies.
       * A child pointing at the thing everybody should be looking at.
       */
      case 'quarry':
        this._beginTargeting(actor, 'oneEnemy', (targets) =>
          this._commitAction({ actor, kind: 'special', targets, move: { label: 'Quarry', quarry: true } }));
        break;

      /**
       * Ilsabet — Render. Paints an enemy, and learns one spell it knows.
       * Permanently: the sketchbook goes with her.
       */
      case 'render':
        this._beginTargeting(actor, 'oneEnemy', (targets) =>
          this._commitAction({ actor, kind: 'special', targets, move: { label: 'Render', render: true } }));
        break;

      /**
       * Oda — Stance. A standing trade, changed as a turn, never for free.
       */
      case 'stance': {
        const stances = [
          { label: 'Open Hand', id: null, desc: 'no trade' },
          { label: 'Falling Guard', id: 'protect', desc: 'guard up, slow' },
          { label: 'Running Form', id: 'haste', desc: 'fast, fragile' },
          { label: 'Ninth Form', id: 'critUp', desc: 'strike true' },
        ];
        this.ui.showCommands(stances.map((s) => ({
          label: s.label, right: actor._stance === s.id ? 'held' : s.desc, stance: s,
        })), {
          title: 'Stance',
          onSelect: ({ stance }) => {
            for (const s of ['protect', 'haste', 'critUp']) actor.removeStatus(s);
            actor.removeStatus('slow');
            actor._stance = stance.id;
            if (stance.id) {
              actor.addStatus(stance.id);
              if (stance.id === 'protect') actor.addStatus('slow');
            }
            this._commitAction({ actor, kind: 'special', targets: [actor], move: { label: stance.label } });
          },
          onCancel: () => { this.ui.popMenu(); this._openCommandMenu(actor); },
        });
        break;
      }

      /**
       * Rusk — Overclock. Spends his own health for damage. He has been
       * standing against a wall for eleven years; he is not precious about it.
       */
      case 'overclock': {
        const tiers = [
          { label: 'Quarter', cost: 0.25, power: 2.2 },
          { label: 'Half', cost: 0.5, power: 4.0 },
          { label: 'Everything', cost: 0.9, power: 7.5 },
        ];
        // Priced off max HP, not current. Off current it was a fraction of a
        // shrinking number floored at 1, so at 1 HP "Everything" cost one
        // point and left him on one point — a free power-7.5 strike every
        // turn, for ever, roughly four times the strongest spell in the game.
        // Off max HP the trade is the one the command is supposed to be: a
        // real slice of the health bar, and the biggest tier is a commitment
        // Rusk cannot make twice.
        this.ui.showCommands(tiers.map((t) => ({
          label: t.label, right: `${Math.floor(actor.maxHP * t.cost)} HP`, tier: t,
          disabled: actor.hp <= Math.floor(actor.maxHP * t.cost),
        })), {
          title: 'Overclock',
          onSelect: ({ tier }) => this._beginTargeting(actor, 'oneEnemy', (targets) =>
            this._commitAction({ actor, kind: 'special', targets, move: {
              label: `Overclock: ${tier.label}`, power: tier.power, overclock: tier.cost,
            } })),
          onCancel: () => { this.ui.popMenu(); this._openCommandMenu(actor); },
        });
        break;
      }

      /**
       * The Mask — Mimic. Repeats whatever the party did last, free.
       *
       * It never explains itself and it has no moves of its own, which is the
       * entire characterisation. Mechanically it makes the Mask worth exactly
       * as much as the rest of the party is worth, which is the joke.
       */
      case 'mimic': {
        const last = this._lastPartyAction;
        if (!last) {
          this.ui.showAction('Nothing to copy yet');
          this._commitAction({ actor, kind: 'defend', targets: [actor] });
          break;
        }
        const live = (last.targets ?? []).filter((t) => t && (!t.isKO || last.spell?.targetsKO));
        const targets = live.length ? live
          : [last.actor?.kind === 'party' ? this._randomEnemy() : this._randomAlly()].filter(Boolean);
        // Copied spells cost the Mask nothing — it is not casting, it is
        // doing the same thing again.
        this._commitAction({ ...last, actor, targets, mimicked: true });
        break;
      }

      default:
        // Anything genuinely unknown falls back to a plain attack rather than
        // dead-ending the player's turn.
        this._beginTargeting(actor, 'oneEnemy', (targets) =>
          this._commitAction({ actor, kind: 'attack', targets }));
        break;
    }
  }

  // --- targeting ----------------------------------------------------------

  /**
   * Choose who an action lands on.
   *
   * `targetsKO` is the flag every revive in the game carries — Reprise,
   * Reprise+, the Phoenix Tear and the Phoenix Ember — and it has to be
   * consulted *here*, when the list of candidates is built, not only when the
   * effect resolves. It used to be read against `this._allowsKOTargets`, a
   * property nothing ever assigned, so the filter was always a plain
   * `!isKO`: a fallen character never appeared in the target list and every
   * revive in the game could only be pointed at somebody who did not need it.
   * Losing a character was therefore permanent for the rest of the fight, with
   * the player holding a Phoenix Tear the menu would not let them use. The
   * resolution path was right all along (see `_commitAction` and
   * `applySpell`); only the pool was wrong.
   */
  _beginTargeting(actor, targetKind, done, { targetsKO = false } = {}) {
    const reachable = (p) => !p.isKO || targetsKO;
    if (targetKind === 'self') { done([actor]); return; }
    if (targetKind === 'allEnemies') { done(this.enemies.filter((e) => !e.isKO)); return; }
    if (targetKind === 'allAllies') { done(this.party.filter(reachable)); return; }

    const pool = targetKind === 'oneAlly'
      ? this.party.filter(reachable)
      : this.enemies.filter((e) => !e.isKO);
    if (!pool.length) { done([]); return; }

    this._targeting = { pool, index: 0, done, actor };
    // Mark the fallen. A revive's target list is mostly people who do not need
    // it, and the one who does is the only unlabelled thing on screen.
    this.ui.showCommands(pool.map((c) => ({ label: c.name, right: c.isKO ? 'KO' : '' })), {
      title: 'Target',
      onSelect: (_, i) => {
        const t = this._targeting;
        this._targeting = null;
        this.ui.popMenu();
        t.done([t.pool[i]]);
      },
      onCancel: () => { this._targeting = null; this.ui.popMenu(); },
    });
  }

  _updateTargeting() {
    if (!this._targeting) return;
    const menu = this.ui.activeMenu;
    if (menu) this._targeting.index = menu.index;
  }

  _targetedIds() {
    if (!this._targeting) return [];
    const t = this._targeting.pool[this._targeting.index];
    return t ? [t.id] : [];
  }

  _randomEnemy() {
    const alive = this.enemies.filter((e) => !e.isKO);
    return alive.length ? rng.battle.pick(alive) : null;
  }

  _randomAlly() {
    const alive = this.party.filter((p) => !p.isKO);
    return alive.length ? rng.battle.pick(alive) : null;
  }

  // --- enemy turn ---------------------------------------------------------

  _beginEnemyTurn(enemy) {
    this.activeActor = enemy;
    enemy.aiTurn++;
    // A charmed creature fights its own side; a confused one swings at random.
    // Without this the player's Beguile and Addle were decoration on anything
    // that was not immune to them, which is most of the bestiary.
    if (enemy.hasStatus('charm')) {
      const own = this.enemies.filter((e) => !e.isKO && e !== enemy);
      if (own.length) {
        this._commitAction({ actor: enemy, kind: 'attack', targets: [rng.battle.pick(own)] });
        return;
      }
    }
    if (enemy.hasStatus('confuse')) {
      const pool = rng.battle.next() < 0.5 ? this.enemies : this.party;
      const live = pool.filter((c) => !c.isKO && c !== enemy);
      if (live.length) {
        this._commitAction({ actor: enemy, kind: 'attack', targets: [rng.battle.pick(live)] });
        return;
      }
    }
    const action = this._evaluateAI(enemy);
    this._commitAction(action);
  }

  _evaluateAI(enemy) {
    const rules = enemy.def.ai || [{ if: 'always', do: { kind: 'attack' } }];
    const hpFrac = enemy.hp / enemy.maxHP;
    for (const rule of rules) {
      let match = false;
      switch (rule.if) {
        case 'always': match = true; break;
        case 'hpBelow': match = hpFrac < rule.v; break;
        case 'selfHpBelow': match = hpFrac < rule.v; break;
        case 'turnEvery': match = enemy.aiTurn % rule.n === 0; break;
        case 'turnIs': match = enemy.aiTurn === rule.n; break;
        case 'random': match = rng.battle.next() < rule.p; break;
        case 'allyDown': match = this.enemies.some((e) => e.isKO); break;
        case 'hasStatus': match = enemy.hasStatus(rule.status); break;
        // Documented in the bestiary header and never implemented, so any
        // rule keyed to it silently never fired.
        case 'partyHasStatus':
          match = this.party.some((c) => !c.isKO && c.hasStatus(rule.status));
          break;
        default: match = false;
      }
      if (!match) continue;
      // A phase is a state the creature enters, not a move it spends.
      //
      // This used to read `enemy.phase >= rule.phase → skip`, which locked a
      // phase rule out the moment it fired — including itself. A boss would
      // reach 35% health, announce "Phase 3", use its signature move exactly
      // once, and then fall through to its filler rules for the rest of the
      // fight. Every boss in the game got *weaker* as its health dropped,
      // which is precisely backwards, and it is why so many phase scripts
      // read as decoration: they ran for one turn each.
      //
      // Now a lower-numbered phase is superseded by a higher one, entering a
      // phase announces it once and swings, and the signature then recurs on
      // a beat while the creature stays in that phase.
      //
      // The beat matters as much as the stickiness. Letting the phase rule
      // match every turn — the obvious fix — is what a boss's rule list asks
      // for once it is past the threshold, and it turned the back half of
      // every fight into the same party-wide move on repeat: the Eighth
      // Lantern went to a 0% win rate against a party at its own level, and
      // five other bosses fell below half. Escalation is the goal; a loop is
      // not. Between beats the creature drops through to its ordinary rules,
      // so a phase reads as pressure rather than as a metronome.
      if (rule.phase) {
        if (enemy.phase > rule.phase) continue;
        if (enemy.phase < rule.phase) {
          enemy.phase = rule.phase;
          this.ui.showBanner(`${enemy.name} — Phase ${rule.phase}`, 1.4, '#e0574f');
        } else if (enemy.aiTurn % PHASE_REPEAT !== 0) {
          continue;                      // in the phase, but not its beat
        }
      }
      return this._buildEnemyAction(enemy, rule.do);
    }
    return { actor: enemy, kind: 'attack', targets: [this._randomAlly()].filter(Boolean) };
  }

  _buildEnemyAction(enemy, spec) {
    if (spec.kind === 'spell') {
      const spell = SPELLS[spec.spell];
      if (!spell) return { actor: enemy, kind: 'attack', targets: [this._randomAlly()].filter(Boolean) };

      // A spell that helps is cast on the caster's own side.
      //
      // Without this every restorative an enemy knows lands on the party
      // instead: the Tidechanter's Mendra healed whoever it was fighting, and
      // the Shellback handed out Protect to the people hitting it. The rule
      // reads off the spell's own kind and target, so new data gets it right
      // without anyone remembering to.
      const helpful = spell.kind === 'heal' || spell.kind === 'buff'
        || spell.target === 'oneAlly' || spell.target === 'allAllies';
      if (helpful) {
        const side = this.enemies.filter((e) => !e.isKO || spell.targetsKO);
        const wide = spec.target === 'all' || spell.target === 'allAllies';
        // Prefer the ally that most needs it, so a heal is a real decision
        // rather than a coin toss the player watches being lost.
        const hurt = [...side].sort((a, b) => (a.hp / a.maxHP) - (b.hp / b.maxHP));
        const targets = wide ? side : [hurt[0] ?? enemy];
        return { actor: enemy, kind: 'spell', spell, targets: targets.filter(Boolean), enemyCast: true };
      }

      const targets = (spec.target === 'all' || spell.target === 'allEnemies')
        ? this.party.filter((p) => !p.isKO)
        : [this._randomAlly()].filter(Boolean);
      return { actor: enemy, kind: 'spell', spell, targets, enemyCast: true };
    }
    const targets = spec.target === 'all'
      ? this.party.filter((p) => !p.isKO)
      : [this._randomAlly()].filter(Boolean);
    return { actor: enemy, kind: 'attack', targets, move: spec };
  }

  // --- execution ----------------------------------------------------------

  _commitAction(action) {
    this.ui.clearMenus();
    this._targeting = null;
    this.phase = 'executing';
    // Remember the last real thing the party did, for Mimic. A mimicked
    // action is not itself recorded, or the Mask would lock onto its own
    // reflection and the command would stop meaning anything.
    if (action.actor?.kind === 'party' && !action.mimicked
      && action.kind !== 'defend' && action.kind !== 'row') {
      this._lastPartyAction = { ...action };
    }
    const self = this;
    scheduler.run(function* () {
      try {
        yield* self.executeAction(action);
      } catch (err) {
        console.error('[battle] action failed', err);
      } finally {
        action.actor.atb = 0;
        action.actor.turnCount++;
        self.activeActor = null;
        yield* self.endOfTurn(action.actor);
        if (!self._checkEnd()) self.phase = 'active';
      }
    }, 'battle-action');
  }

  *executeAction(action) {
    const { actor, kind } = action;
    // Targets may have died between selection and execution.
    let targets = (action.targets || []).filter((t) => t && (!t.isKO || action.spell?.targetsKO || action.item?.targetsKO));
    if (!targets.length && kind !== 'defend') {
      const fallback = actor.kind === 'party' ? this._randomEnemy() : this._randomAlly();
      if (!fallback) return;
      targets = [fallback];
    }

    switch (kind) {
      case 'attack': yield* this.doAttack(actor, targets, action.move); break;
      case 'spell': yield* this.doSpell(actor, targets, action.spell); break;
      case 'item': yield* this.doItem(actor, targets, action.item); break;
      case 'defend': yield* this.doDefend(actor); break;
      case 'steal': yield* this.doSteal(actor, targets[0]); break;
      case 'scan': yield* this.doScan(actor, targets[0]); break;
      case 'special': yield* this.doSpecial(actor, targets, action.move); break;
      case 'summon': yield* this.doSummon(actor, targets, action.esper); break;
      case 'limit': yield* this.doLimit(actor, targets); break;
      default: break;
    }
  }

  // --- individual actions -------------------------------------------------

  *doAttack(actor, targets, move) {
    const name = move?.name;
    if (name) this.ui.showAction(name);
    const isRanged = actor.kind === 'party' && actor.weapon?.effects?.includes('reachBack');

    if (actor.kind === 'party' && !isRanged) {
      yield* this.view.meleeApproach(actor.id, targets[0].id);
      yield* this.view.driveAction(actor.id, 0.42);
    } else {
      this.view.play(actor.id, 'attack');
      yield wait(0.30);
    }

    // The slash lands a beat before the damage number.
    // Vesna's Attune replaces the weapon's element for the rest of the fight.
    const swingElement = move?.element || actor._attune || actor.weapon?.element || 'physical';
    const swingAt = this.view.anchor(targets[0].id, 1.3);
    yield* playSpellFX(this.view.fxContext(), swingElement, swingAt);

    // A second weapon means a second swing, at reduced power so the relic is
    // a meaningful upgrade rather than a flat doubling. Only on a plain
    // attack: letting it multiply a scripted enemy move would be chaos.
    const dualWield = actor.kind === 'party' && !move
      && Object.values(actor.member?.equipment ?? {}).some((e) => e?.effects?.includes('dualWield'));

    for (const pass of dualWield ? [1, 0.62] : [1]) {
      if (pass !== 1) {
        yield* playSpellFX(this.view.fxContext(), actor.weapon?.element || 'physical', swingAt);
      }
      for (const target of targets) {
        if (target.isKO) continue;
        const element = move?.element || actor._attune || actor.weapon?.element || null;
        const power = (move?.power ?? 1) * pass;
        const dealt = yield* this.resolvePhysical(actor, target, {
          power, element, status: move?.status, drain: move?.drain,
        });
        if (dealt > 0) yield* this._stealOnHit(actor, target);
      }
    }

    if (actor.kind === 'party' && !isRanged) yield* this.view.meleeReturn(actor.id);
    else yield wait(0.2);
  }

  /**
   * `stealOnHit`: a connecting blow sometimes lifts something as well.
   *
   * Rolled off the same steal table the Steal command uses, so a knife that
   * pickpockets can never pull loot the command could not — otherwise the
   * relic would quietly become the best source of rare drops in the game.
   */
  *_stealOnHit(actor, target) {
    if (actor.kind !== 'party') return;
    const knife = Object.values(actor.member?.equipment ?? {})
      .find((e) => e?.effects?.includes('stealOnHit'));
    if (!knife) return;
    const table = target.def?.steal;
    if (!table?.length) return;
    // Rolled on the loot stream, like every other acquisition, so a battle
    // replays identically from a seed whatever the party is wearing.
    if (rng.loot.next() > 0.16) return;

    for (const entry of table) {
      if (rng.loot.next() > entry.chance) continue;
      if (!ITEMS[entry.id]) continue;
      this.game.party.addItem(entry.id, 1);
      const pos = this.view.project(this.view.anchor(target.id, 1.9));
      this.ui.popup(pos, ITEMS[entry.id].name, 'heal');
      yield wait(0.22);
      return;
    }
  }

  *resolvePhysical(actor, target, { power = 1, element = null, status = null, drain = false, ignoreDefence = 0 } = {}) {
    const hit = rollHit({
      accuracy: 100 + (actor.kind === 'party' ? actor.stat('lck') * 0.2 : 6),
      targetEvade: target.evade,
      blind: actor.hasStatus('blind'),
      vanish: target.hasStatus('vanish'),
    });
    const pos = this.view.project(this.view.anchor(target.id, 1.5));
    if (!hit) {
      this.ui.popup(pos, 'Miss', 'miss');
      yield wait(0.18);
      return 0;
    }

    const crit = rollCritical({
      luck: actor.kind === 'party' ? actor.stat('lck') : 8,
      bonus: (actor.hasStatus('critUp') ? 0.25 : 0) + (actor.weapon?.effects?.includes('critUp') ? 0.08 : 0),
    });

    // Tam's Quarry marks a target for the whole party, not just for Tam.
    const quarry = target._quarry ? 1.25 : 1;
    let defence = target.hasStatus('protect') ? Math.floor(target.defence * 1.6) : target.defence;
    // Imp. Wither has cost 12 MP for nothing since the spell list was written:
    // the status was inflicted, shown in the UI, and read by no one. An imp
    // can barely hit and can barely take one, which is the whole joke.
    if (target.hasStatus('imp')) defence = Math.floor(defence * 0.35);
    const multiplier = power * (actor.hasStatus('berserk') ? 1.25 : 1) * quarry
      * (actor.hasStatus('imp') ? 0.25 : 1);

    // The two sides do not share a damage curve. A party member's output has
    // to climb from rats to a boss with eighty thousand hit points; a
    // creature's job is to take a predictable bite out of a health bar, off
    // the `atk` its bestiary entry actually authored.
    let dmg = actor.kind === 'party'
      ? physicalDamage({
        attackerLevel: actor.level,
        vigour: actor.stat('vig'),
        weaponPower: actor.attack,
        defence,
        rows: { attacker: actor.row, target: target.row },
        // A weapon with reach does not lose damage for standing at the back.
        // That is the entire reason to own a bow or a spear, and `reachBack`
        // — the largest single effect group in the item tables, 21 weapons —
        // had exactly one reader in the codebase, which skipped the walk-up
        // animation. The property was sold in shop text and did nothing.
        reachBack: !!actor.weapon?.effects?.includes('reachBack'),
        critical: crit,
        multiplier,
        ignoreDefence,
      })
      : monsterDamage({
        level: actor.level,
        power: actor.attack,
        defence,
        rows: { attacker: actor.row, target: target.row },
        multiplier: multiplier * (crit ? 1.5 : 1),
        ignoreDefence,
      });

    let mult = elementalMultiplier(element, target.affinity);
    if (element === 'earth' && target.hasStatus('float')) mult = 0;
    dmg = Math.round(dmg * Math.abs(mult));
    this._trackAffinity(actor, target, element, mult);

    if (mult < 0) {
      target.hp = Math.min(target.maxHP, target.hp + dmg);
      this.ui.popup(pos, `+${dmg}`, 'heal');
    } else if (mult === 0) {
      this.ui.popup(pos, 'Null', 'miss');
      dmg = 0;
    } else {
      yield* this.applyDamage(actor, target, dmg, { crit, element, weak: mult > 1, resisted: mult > 0 && mult < 1 });
      if (drain) {
        const gain = Math.floor(dmg * 0.5);
        actor.hp = Math.min(actor.maxHP, actor.hp + gain);
        this.ui.popup(this.view.project(this.view.anchor(actor.id, 1.5)), `+${gain}`, 'heal');
      }
    }

    if (status && !target.isKO) {
      for (const [id, chance] of Object.entries(status)) {
        if (rollStatus({ chance, targetRes: target.magicDefence, immune: target.immune, status: id, level: actor.level, targetLevel: target.level })) {
          target.addStatus(id);
        }
      }
    }
    yield wait(0.12);
    return dmg;
  }

  /** Apply damage with all the feedback: flash, shake, popup, death check. */
  *applyDamage(source, target, amount, {
    crit = false, element = null, weak = false, resisted = false, magic = false,
  } = {}) {
    const before = target.hp;
    target.hp = Math.max(0, target.hp - amount);
    const dealt = before - target.hp;

    const pos = this.view.project(this.view.anchor(target.id, 1.5));
    this.ui.popup(pos, dealt, crit ? 'crit' : 'damage');
    if (weak) this.ui.showAction('Weakness!');
    // The other half of the affinity table. Weakness has always announced
    // itself and resistance never did, so a half-damage hit was indistinguishable
    // from an unlucky damage roll — the player got no signal that the element
    // they chose was the wrong one, which is the entire lesson the bestiary's
    // affinities exist to teach.
    else if (resisted) this.ui.showAction('Resisted');

    this.view.play(target.id, 'hurt');
    if (target.kind === 'party') this.view.setActionT(target.id, 0);
    audio.sfx(crit ? 'crit' : 'hit');

    // Impact spray, tinted by element and scaled by how hard the hit landed.
    const impactAt = this.view.anchor(target.id, 1.2);
    const severityRaw = Math.min(1, dealt / Math.max(1, target.maxHP * 0.30));
    this.view.particles.burst(impactAt, {
      count: 14 + Math.round(severityRaw * 26),
      speed: 4 + severityRaw * 5,
      life: 0.38,
      size: 0.34 + severityRaw * 0.25,
      color: crit ? '#ffd76a' : (element ? ELEMENT_COLOR[element] : '#ffffff'),
      endColor: element ? ELEMENT_COLOR[element] : '#d8d3c6',
      gravity: -6, drag: 2.2,
    });

    // Impact: shake scales with the fraction of max HP lost, so a chip hit and
    // a devastating one don't feel identical.
    const severity = Math.min(1, dealt / Math.max(1, target.maxHP * 0.35));
    this.game.renderer.rig.shake(0.10 + severity * 0.42, 4.5);
    if (crit || weak) {
      this.game.renderer.postfx.flash(hexToVec(element ? ELEMENT_COLOR[element] : '#ffffff'), 0.32);
      scheduler.run(function* () {
        yield* tween(0.32, 0, 0.28, (v) => { window.__game.renderer.postfx.flashStrength = v; });
      }, 'battle-action');
    }
    scheduler.run((function* (view, id) { yield* view.hitFlash(id); })(this.view, target.id), 'battle-action');

    // Sleep and freeze break on damage.
    for (const id of Object.keys(target.statuses)) {
      if (STATUSES[id]?.wakesOnHit) target.removeStatus(id);
    }

    if (target.kind === 'party') {
      target.limit = Math.min(100, target.limit + limitGain({
        damageTaken: dealt, maxHP: target.maxHP, currentHP: target.hp,
        alliesDown: this.party.filter((p) => p.isKO).length,
      }));
    }

    if (target.hp <= 0) yield* this.killCombatant(target);
  }

  *killCombatant(target) {
    target.addStatus('ko');
    target.atb = 0;
    if (target.kind === 'enemy') {
      analytics.track(EV.ENEMY_KILLED, {
        enemy: target.def.id, enemy_name: target.def.name, enemy_level: target.level,
        boss: target.def.boss ?? false,
      });
      if (target.def.boss) {
        analytics.track(EV.BOSS_DEFEATED, {
          boss_id: target.def.id, boss_name: target.def.name, boss_level: target.level,
          party_level: Math.round(this.game.party.averageLevel()),
          party_down: this.party.filter((p) => p.isKO).length,
          play_seconds: Math.round(this.game.party.playTime),
        });
      }
    } else {
      analytics.track(EV.CHARACTER_KO, {
        character: target.id, character_name: target.name, boss: this.isBoss,
      });
    }
    if (target.kind === 'enemy') {
      yield* this.view.dissolve(target.id, 0.6);
      this.game.party.recordKill(target.def.id);
    } else {
      this.view.play(target.id, 'dead');
      // An auto-revive relic gets its one moment.
      const relic = Object.values(target.member.equipment).find((e) => e?.effects?.includes('autoRevive'));
      if (relic && !target._usedRevive) {
        target._usedRevive = true;
        yield wait(0.4);
        target.removeStatus('ko');
        target.hp = Math.floor(target.maxHP * 0.5);
        this.ui.showAction(`${relic.name} flares!`);
        this.view.play(target.id, 'battleIdle');
      }
    }
  }

  *doSpell(actor, targets, spell) {
    const cost = actor.kind === 'party' ? spellCost(spell, actor.member) : spell.mp;
    if (actor.kind === 'party') {
      if (actor.mp < cost) { this.ui.showAction('Not enough MP'); yield wait(0.4); return; }
      actor.mp -= cost;
    }
    this.ui.showAction(spell.name);
    if (actor.kind === 'party') {
      analytics.track(EV.SPELL_CAST, {
        spell: spell.id, spell_name: spell.name, school: spell.school,
        element: spell.element ?? null, tier: spell.tier ?? null, mp_cost: cost,
        character: actor.id, targets: targets.length, boss: this.isBoss,
      });
    }
    audio.sfx('magic');
    this.view.play(actor.id, 'cast');

    // A magic circle blooms under the caster during the wind-up.
    const casterPos = this.view.anchor(actor.id, 0.05);
    const fxCtx = this.view.fxContext();
    this.view.particles.implode(this.view.anchor(actor.id, 1.2), {
      count: 22, radius: 1.8, life: 0.5,
      color: spell.school === 'white' ? '#fff3b8' : ELEMENT_COLOR[spell.element] || '#8a5ce0',
      size: 0.35,
    });
    if (actor.kind === 'party') yield* this.view.driveAction(actor.id, 0.65);
    else yield wait(0.5);

    // The effect plays at the target *before* damage resolves, so the number
    // reads as a consequence of the spell rather than arriving alongside it.
    const fxElement = spell.kind === 'heal' ? 'heal'
      : spell.element || (spell.school === 'white' ? 'holy' : 'aether');
    const primary = targets[0];
    if (primary) {
      const at = this.view.anchor(primary.id, 0.9);
      yield* playSpellFX(fxCtx, fxElement, at);
    }
    // Wide spells splash a lighter version on the remaining targets at once.
    if (targets.length > 1) {
      for (const t of targets.slice(1)) {
        this.view.particles.burst(this.view.anchor(t.id, 1.1), {
          count: 26, speed: 5, life: 0.5, size: 0.5,
          color: ELEMENT_COLOR[spell.element] || '#8a5ce0',
        });
      }
      yield wait(0.12);
    }

    // `doubleCast`: the spell resolves twice for one MP payment. The second
    // pass re-checks the target list, so a wide spell that already killed
    // everything does not swing at corpses.
    const twice = actor.kind === 'party'
      && Object.values(actor.member?.equipment ?? {}).some((e) => e?.effects?.includes('doubleCast'));

    for (let pass = 0; pass < (twice ? 2 : 1); pass++) {
      const live = pass === 0 ? targets : targets.filter((t) => !t.isKO || spell.targetsKO);
      if (!live.length) break;
      if (pass > 0) {
        this.ui.showAction(`${spell.name} again`);
        const at = this.view.anchor(live[0].id, 0.9);
        yield* playSpellFX(fxCtx, fxElement, at);
      }
      for (const target of live) {
        // Reflect bounces the spell back at the caster's side.
        if (target.hasStatus('reflect') && spell.school !== 'grey' && spell.kind !== 'buff') {
          this.ui.showAction('Reflected!');
          const pool = actor.kind === 'party' ? this.party : this.enemies;
          const bounce = pool.filter((c) => !c.isKO);
          if (bounce.length) yield* this.applySpell(actor, rng.battle.pick(bounce), spell);
          continue;
        }
        yield* this.applySpell(actor, target, spell);
      }
    }
    yield wait(0.2);
  }

  *applySpell(actor, target, spell) {
    const pos = this.view.project(this.view.anchor(target.id, 1.5));
    const casterMag = actor.kind === 'party' ? actor.stat('mag') : actor.def.stats.mag;

    if (spell.kind === 'attack') {
      const mdef = target.hasStatus('shell')
        ? Math.floor(target.magicDefence * 1.6) : target.magicDefence;
      // Same split as a swing: the party's spells climb, a creature's spell is
      // worth a multiple of its own attack.
      let dmg = actor.kind === 'party'
        ? magicDamage({
          casterLevel: actor.level, magic: casterMag, spellPower: spell.power, magicDefence: mdef,
        })
        : monsterDamage({
          level: actor.level, power: casterMag, defence: mdef,
          multiplier: spell.power / MONSTER_SPELL_REFERENCE,
        });
      let mult = elementalMultiplier(spell.element, target.affinity);
      // Buoy grants Float and Float did nothing, so a 14 MP party-wide buff
      // was a no-op — and `upheaval`'s own `ignores: 'float'` note, written to
      // be the exception, had no rule to be an exception to.
      if (spell.element === 'earth' && target.hasStatus('float') && spell.ignores !== 'float') mult = 0;
      dmg = Math.round(dmg * Math.abs(mult));
      this._trackAffinity(actor, target, spell.element, mult, spell.id);
      if (mult < 0) {
        target.hp = Math.min(target.maxHP, target.hp + dmg);
        this.ui.popup(pos, `+${dmg}`, 'heal');
      } else if (mult === 0) {
        this.ui.popup(pos, 'Null', 'miss');
      } else {
        yield* this.applyDamage(actor, target, dmg, { element: spell.element, weak: mult > 1, resisted: mult > 0 && mult < 1, magic: true });
      }
      if (spell.status) {
        for (const [id, chance] of Object.entries(spell.status)) {
          if (rollStatus({ chance, targetRes: target.magicDefence, immune: target.immune, status: id, level: actor.level, targetLevel: target.level })) target.addStatus(id);
        }
      }
    } else if (spell.kind === 'heal') {
      if (spell.effect === 'fullHeal') {
        const healed = target.maxHP - target.hp;
        target.hp = target.maxHP;
        this.ui.popup(pos, healed, 'heal');
      } else {
        const amount = healAmount({ casterLevel: actor.level, magic: casterMag, spellPower: spell.power });
        // Undead take healing as damage — an old trick, still a good one.
        if (target.hasStatus('zombie') || target.def?.undead) {
          yield* this.applyDamage(actor, target, amount, { magic: true });
        } else {
          const before = target.hp;
          target.hp = Math.min(target.maxHP, target.hp + amount);
          this.ui.popup(pos, target.hp - before, 'heal');
        }
      }
    } else if (spell.kind === 'status' || spell.kind === 'buff') {
      let any = false;
      for (const [id, chance] of Object.entries(spell.status || {})) {
        const guaranteed = spell.kind === 'buff';
        if (guaranteed || rollStatus({ chance, targetRes: target.magicDefence, immune: target.immune, status: id, level: actor.level, targetLevel: target.level })) {
          if (id === 'ko') { yield* this.applyDamage(actor, target, target.hp, {}); }
          else target.addStatus(id);
          any = true;
        }
      }
      this.ui.popup(pos, any ? STATUSES[Object.keys(spell.status)[0]]?.name ?? 'Ok' : 'Resisted', any ? 'heal' : 'miss');
    } else if (spell.kind === 'special') {
      yield* this.applySpecialSpell(actor, target, spell, pos);
    }
  }

  *applySpecialSpell(actor, target, spell, pos) {
    switch (spell.effect) {
      case 'revive': {
        if (!target.isKO) { this.ui.popup(pos, 'No effect', 'miss'); break; }
        target.removeStatus('ko');
        target.hp = Math.max(1, Math.floor(target.maxHP * spell.ratio));
        this.view.setVisible(target.id, true);
        this.view.play(target.id, 'battleIdle');
        this.ui.popup(pos, target.hp, 'heal');
        break;
      }
      case 'cureStatus': {
        let cured = 0;
        for (const s of spell.cures) if (target.hasStatus(s)) { target.removeStatus(s); cured++; }
        this.ui.popup(pos, cured ? 'Cured' : 'No effect', cured ? 'heal' : 'miss');
        break;
      }
      case 'drainHP': {
        // Drain is cast by both sides, so it takes the same split as any
        // other spell rather than handing creatures the party's curve.
        const dmg = actor.kind === 'party'
          ? magicDamage({
            casterLevel: actor.level, magic: actor.stat('mag'),
            spellPower: spell.power, magicDefence: target.magicDefence,
          })
          : monsterDamage({
            level: actor.level, power: actor.stat('mag'), defence: target.magicDefence,
            multiplier: spell.power / MONSTER_SPELL_REFERENCE,
          });
        yield* this.applyDamage(actor, target, dmg, { magic: true });
        actor.hp = Math.min(actor.maxHP, actor.hp + dmg);
        this.ui.popup(this.view.project(this.view.anchor(actor.id, 1.5)), dmg, 'heal');
        break;
      }
      case 'drainMP': {
        const amount = Math.min(target.mp, Math.floor(spell.power * 0.6));
        target.mp -= amount;
        actor.mp = Math.min(actor.maxMP, actor.mp + amount);
        this.ui.popup(pos, amount, 'mp');
        break;
      }
      case 'fractionHP': {
        const dmg = Math.max(1, Math.floor(target.hp * spell.fraction));
        yield* this.applyDamage(actor, target, dmg, { magic: true });
        break;
      }
      case 'stripBuffs': {
        let n = 0;
        for (const id of Object.keys(target.statuses)) {
          if (STATUSES[id]?.kind === 'good') { target.removeStatus(id); n++; }
        }
        this.ui.popup(pos, n ? 'Dispelled' : 'No effect', n ? 'heal' : 'miss');
        break;
      }
      case 'scan':
        target.scanned = true;
        this.ui.popup(pos, 'Analysed', 'heal');
        break;
      case 'flee':
        this._flee();
        break;
      // The three below had no case at all and fell through to "No effect" —
      // including Quicksilver, an 80 MP tier-five capstone taught by Osric's
      // signature magicite, which spent the turn and the MP and printed a
      // miss. `audit.mjs` passed them because they are learnable, and the
      // balance audit passed them because it only cross-checks status names.
      // `tools/spells.mjs` now holds every declared effect against this
      // switch, so the next one cannot ship silent.
      case 'levelMultiple': {
        // The classic level-N roulette: it lands only on a target whose level
        // divides evenly, which is why it reads the bestiary's levels rather
        // than a damage curve.
        if (target.level % spell.of !== 0) { this.ui.popup(pos, 'No effect', 'miss'); break; }
        const dmg = actor.kind === 'party'
          ? magicDamage({
            casterLevel: actor.level, magic: actor.stat('mag'),
            spellPower: 90, magicDefence: target.magicDefence,
          })
          : monsterDamage({
            level: actor.level, power: actor.stat('mag'), defence: target.magicDefence,
            multiplier: 90 / MONSTER_SPELL_REFERENCE,
          });
        yield* this.applyDamage(actor, target, dmg, { magic: true });
        break;
      }
      case 'extraTurn': {
        // Refill the gauge rather than granting a turn directly: the ATB is
        // the only clock in the fight, so handing back a full bar is the same
        // thing said in the system's own terms, and it cannot double-book the
        // actor the way a re-entrant turn would.
        target.atb = 100;
        this.ui.popup(pos, 'Again', 'heal');
        break;
      }
      case 'swapHPMP': {
        // Both clamped, because the two pools are not the same size and the
        // spell should never be a free full heal or a way to mint MP.
        const hp = Math.min(target.hp, target.maxMP);
        const mp = Math.min(target.mp, target.maxHP);
        target.hp = Math.max(1, mp);
        target.mp = hp;
        this.ui.popup(pos, 'Reversed', 'heal');
        break;
      }
      default:
        this.ui.popup(pos, 'No effect', 'miss');
        break;
    }
  }

  *doItem(actor, targets, item) {
    if (!this.game.party.removeItem(item.id, 1)) return;
    analytics.track(EV.ITEM_USED, {
      item: item.id, item_name: item.name, where: 'battle',
      character: actor.id, boss: this.isBoss, targets: targets.length,
    });
    this.ui.showAction(item.name);
    this.view.play(actor.id, 'cast');
    if (actor.kind === 'party') yield* this.view.driveAction(actor.id, 0.4);
    for (const target of targets) {
      const pos = this.view.project(this.view.anchor(target.id, 1.5));
      const e = item.effect || {};
      if (e.heal) {
        const before = target.hp;
        target.hp = Math.min(target.maxHP, target.hp + e.heal);
        this.ui.popup(pos, target.hp - before, 'heal');
      }
      if (e.mp) {
        const before = target.mp;
        target.mp = Math.min(target.maxMP, target.mp + e.mp);
        this.ui.popup(pos, target.mp - before, 'mp');
      }
      if (e.fullHeal) { target.hp = target.maxHP; this.ui.popup(pos, 'Full', 'heal'); }
      if (e.fullMP) target.mp = target.maxMP;
      if (e.cure) for (const s of e.cure) target.removeStatus(s);
      if (e.cureAll) target.clearBadStatuses();
      if (e.revive && target.isKO) {
        target.removeStatus('ko');
        target.hp = Math.floor(target.maxHP * e.revive);
        this.view.setVisible(target.id, true);
        this.view.play(target.id, 'battleIdle');
        this.ui.popup(pos, target.hp, 'heal');
      }
      if (e.status) for (const [id] of Object.entries(e.status)) target.addStatus(id);
      if (e.damage) {
        const mult = elementalMultiplier(e.element, target.affinity);
        yield* this.applyDamage(actor, target, Math.round(e.damage * Math.abs(mult) || 1), { element: e.element, weak: mult > 1, resisted: mult > 0 && mult < 1 });
      }
      yield wait(0.1);
    }
    yield wait(0.25);
  }

  *doDefend(actor) {
    actor.addStatus('protect', 2);
    // Defend has to survive its own turn. `endOfTurn` runs in the `finally` of
    // this same action, and it used to clear `_defending` and strip the
    // Protect there — so the guard went up and came down before a single
    // enemy could swing, and the most-pressed non-attack button in the game
    // bought nothing at all. Stamping the turn it was raised on lets the
    // teardown tell "the turn I defended" from "the turn after", which is the
    // one that should end it.
    actor._defending = true;
    this.ui.showAction('Defending');
    yield wait(0.3);
  }

  *doSteal(actor, target) {
    this.ui.showAction('Pilfer');
    yield* this.view.meleeApproach(actor.id, target.id);
    yield* this.view.driveAction(actor.id, 0.3);
    const pos = this.view.project(this.view.anchor(target.id, 1.5));
    const table = target.def.steal || [];
    const bonus = Object.values(actor.member.equipment).some((e) => e?.effects?.includes('stealUp')) ? 2 : 1;
    let got = null;
    for (const entry of table) {
      if (rng.loot.next() < entry.chance * bonus) { got = entry.id; break; }
    }
    analytics.track(EV.STEAL_ATTEMPTED, {
      enemy: target.def.id, enemy_name: target.def.name,
      got: got ?? null, success: !!got, boosted: bonus > 1,
    });
    if (got && ITEMS[got]) {
      this.game.party.addItem(got, 1);
      this.ui.popup(pos, ITEMS[got].name, 'heal');
    } else {
      this.ui.popup(pos, 'Nothing', 'miss');
    }
    yield* this.view.meleeReturn(actor.id);
  }

  *doScan(actor, target) {
    this.ui.showAction('Annotate');
    this.view.play(actor.id, 'cast');
    yield* this.view.driveAction(actor.id, 0.4);
    analytics.track(EV.ENEMY_SCANNED, {
      enemy: target.def.id, enemy_name: target.def.name, enemy_level: target.level,
      boss: this.isBoss,
    });
    target.scanned = true;
    const weak = Object.entries(target.affinity).filter(([, v]) => v === 'weak').map(([k]) => k);
    yield* this.game.dialogue.speak(target.name, [
      `HP ${target.hp}/${target.maxHP}   MP ${target.mp}/${target.maxMP}`,
      weak.length ? `Weak to: ${weak.join(', ')}.` : 'No elemental weakness found.',
    ]);
  }

  *doSpecial(actor, targets, move) {
    this.ui.showAction(move.label);
    this.view.play(actor.id, actor.kind === 'party' ? 'cast' : 'attack');
    if (actor.kind === 'party') yield* this.view.driveAction(actor.id, 0.5);
    // Overclock pays first, so the cost lands even if the blow misses.
    if (move.overclock) {
      const spent = Math.max(1, Math.floor(actor.maxHP * move.overclock));
      actor.hp = Math.max(1, actor.hp - spent);
      this.ui.popup(this.view.project(this.view.anchor(actor.id, 1.5)), spent, 'damage');
      yield wait(0.15);
    }

    for (const target of targets) {
      const pos = this.view.project(this.view.anchor(target.id, 1.5));

      if (move.unmake) {
        // Strip every good status, then blank the affinity table for the rest
        // of the fight. An absorb becomes a plain hit; a resistance stops
        // mattering. This is the counter to a boss built around one element.
        for (const [id, s] of Object.entries(STATUSES)) {
          if (s.kind === 'good' && target.hasStatus(id)) target.removeStatus(id);
        }
        target._unmade = true;
        this.ui.popup(pos, 'Unmade', 'heal');
      }

      if (move.quarry) {
        target._quarry = true;
        this.ui.popup(pos, 'Quarry', 'heal');
      }

      if (move.render) {
        // Learn one spell the target knows and Ilsabet does not.
        const known = new Set(Object.entries(actor.member?.spells ?? {})
          .filter(([, v]) => v >= 100).map(([id]) => id));
        const theirs = (target.def?.ai ?? [])
          .map((rule) => rule.do?.spell)
          .filter((id) => id && SPELLS[id] && !known.has(id));
        const learned = theirs.length ? rng.battle.pick(theirs) : null;
        if (learned) {
          actor.member.spells[learned] = 100;
          this.ui.showAction(`${actor.name} learned ${SPELLS[learned].name}`);
          this.ui.popup(pos, 'Rendered', 'heal');
        } else {
          this.ui.popup(pos, 'Nothing to draw', 'miss');
        }
      }

      if (move.heal) {
        const amount = Math.floor(target.maxHP * move.heal);
        const before = target.hp;
        target.hp = Math.min(target.maxHP, target.hp + amount);
        this.ui.popup(pos, target.hp - before, 'heal');
      }
      // Statuses ride the blow and roll like any other. They used to be
      // applied here *as well*, unconditionally, before `resolvePhysical` got
      // a look at them — so every one landed twice and the first time was a
      // certainty. The numbers the bestiary writes are chances: the
      // Yardmaster's `{ berserk: 70 }` is meant to be seven turns in ten, and
      // arrived as ten, on the whole party, skipping the immunity list and the
      // level term in `rollStatus` on the way past.
      if (move.power) {
        yield* this.resolvePhysical(actor, target, { power: move.power, element: move.element, status: move.status });
      } else if (move.status) {
        // A pure status move has no blow to ride, so it rolls on its own.
        for (const [id, chance] of Object.entries(move.status)) {
          if (rollStatus({
            chance, targetRes: target.magicDefence, immune: target.immune,
            status: id, level: actor.level, targetLevel: target.level,
          })) target.addStatus(id);
        }
      }
      yield wait(0.08);
    }
    yield wait(0.25);
  }

  /**
   * Summon. Given the whole screen for a moment — an esper is the most
   * expensive button in the game and has to feel like it.
   */
  *doSummon(actor, targets, esper) {
    actor.mp -= esper.mp;
    actor._summoned = true;
    analytics.track(EV.SUMMON_USED, {
      esper: esper.id, esper_name: esper.name, character: actor.id,
      boss: this.isBoss, mp_cost: esper.mp,
    });

    this.ui.showBanner(esper.name, 2.0, esper.color);
    this.view.play(actor.id, 'cast');
    this.game.renderer.postfx.setGrade('void', 0.4);
    yield* this.view.driveAction(actor.id, 0.9);

    // Charge: colour floods in, camera pulls, then the release.
    const colour = hexToVec(esper.color);
    this.game.renderer.postfx.flash(colour, 0.0);
    yield* over(0.75, (t) => {
      this.game.renderer.postfx.flashStrength = t * 0.85;
      this.game.renderer.rig.shake(0.06 + t * 0.35, 2.5);
      this.game.renderer.postfx.radialBlur = t * 0.7;
    });
    this.game.renderer.rig.shake(0.9, 3.0);
    audio.sfx('magic');
    yield wait(0.2);
    yield* over(0.6, (t) => {
      this.game.renderer.postfx.flashStrength = (1 - t) * 0.85;
      this.game.renderer.postfx.radialBlur = (1 - t) * 0.7;
    });
    this.game.renderer.postfx.radialBlur = 0;
    this.game.renderer.postfx.flashStrength = 0;

    this.ui.showAction(esper.summon.name);
    const summonFx = this.view.fxContext();
    const summonElement = esper.summon.heal || esper.summon.effect ? 'heal' : (esper.summon.element || 'aether');
    for (const t of targets) {
      summonFx.particles.implode(this.view.anchor(t.id, 1.2), {
        count: 30, radius: 3.0, life: 0.4, color: esper.color, size: 0.55,
      });
    }
    yield wait(0.35);
    if (targets[0]) yield* playSpellFX(summonFx, summonElement, this.view.anchor(targets[0].id, 0.9));

    // Reviving has to reach the fallen, and the ordinary target list has
    // already filtered them out — so this one works off the roster directly
    // rather than off `targets`.
    if (esper.summon.effect === 'reviveParty') {
      for (const c of this.party) {
        const pos = this.view.project(this.view.anchor(c.id, 1.5));
        if (c.isKO) {
          c.removeStatus('ko');
          c.hp = Math.max(1, Math.floor(c.maxHP * 0.5));
          this.view.play(c.id, 'battleIdle');
          this.ui.popup(pos, 'Revived', 'heal');
        } else {
          const before = c.hp;
          c.hp = Math.min(c.maxHP, c.hp + Math.floor(c.maxHP * 0.35));
          if (c.hp > before) this.ui.popup(pos, c.hp - before, 'heal');
        }
        yield wait(0.10);
      }
      this.game.renderer.postfx.setGrade(this.isBoss ? 'ruin' : 'noon', 0.9);
      yield wait(0.3);
      return;
    }

    for (const target of targets) {
      if (esper.summon.heal) {
        const pos = this.view.project(this.view.anchor(target.id, 1.5));
        const amount = Math.floor(target.maxHP * esper.summon.heal);
        const before = target.hp;
        target.hp = Math.min(target.maxHP, target.hp + amount);
        this.ui.popup(pos, target.hp - before, 'heal');
      } else if (esper.summon.effect === 'buffParty') {
        target.addStatus('protect');
        target.addStatus('shell');
        target.addStatus('haste');
        this.ui.popup(this.view.project(this.view.anchor(target.id, 1.5)), 'Warded', 'heal');
      } else if (esper.summon.effect === 'healParty') {
        const pos = this.view.project(this.view.anchor(target.id, 1.5));
        const amount = healAmount({
          casterLevel: actor.level, magic: actor.stat('mag'), spellPower: 90, multiplier: 1,
        });
        const before = target.hp;
        target.hp = Math.min(target.maxHP, target.hp + amount);
        this.ui.popup(pos, target.hp - before, 'heal');
      } else if (esper.summon.effect === 'hasteParty') {
        target.addStatus('haste');
        this.ui.popup(this.view.project(this.view.anchor(target.id, 1.5)), 'Hasted', 'heal');
      } else if (esper.summon.effect === 'silenceAll') {
        const pos = this.view.project(this.view.anchor(target.id, 1.5));
        if ((target.immune || []).includes('silence')) {
          this.ui.popup(pos, 'Null', 'miss');
        } else {
          target.addStatus('silence');
          this.ui.popup(pos, 'Silenced', 'heal');
        }
      } else if (esper.summon.effect === 'fractionHP') {
        // Proportional damage, like Halve. Bosses are immune, or the summon
        // would trivialise every long fight in the game.
        const pos = this.view.project(this.view.anchor(target.id, 1.5));
        if (target.def?.boss) {
          this.ui.popup(pos, 'Null', 'miss');
        } else {
          const loss = Math.max(1, Math.floor(target.hp * (esper.summon.fraction ?? 0.5)));
          yield* this.applyDamage(actor, target, loss, { magic: true });
        }
      } else {
        const dmg = magicDamage({
          casterLevel: actor.level, magic: actor.stat('mag'), spellPower: esper.summon.power,
          magicDefence: target.hasStatus('shell') ? Math.floor(target.magicDefence * 1.6) : target.magicDefence,
        });
        const mult = elementalMultiplier(esper.summon.element, target.affinity);
        if (mult <= 0) {
          this.ui.popup(this.view.project(this.view.anchor(target.id, 1.5)), mult < 0 ? `+${dmg}` : 'Null', mult < 0 ? 'heal' : 'miss');
          if (mult < 0) target.hp = Math.min(target.maxHP, target.hp + dmg);
        } else {
          yield* this.applyDamage(actor, target, Math.round(dmg * mult), { element: esper.summon.element, weak: mult > 1, resisted: mult > 0 && mult < 1, magic: true });
        }
      }
      yield wait(0.10);
    }
    this.game.renderer.postfx.setGrade(this.isBoss ? 'ruin' : 'noon', 0.9);
    yield wait(0.3);
  }

  *doLimit(actor, targets) {
    analytics.track(EV.LIMIT_USED, {
      character: actor.id, character_name: actor.name, boss: this.isBoss,
      hp_fraction: actor.hp / Math.max(1, actor.maxHP),
    });
    actor.limit = 0;
    this.ui.showBanner(`${actor.name}: Desperation`, 1.6, '#ff8a4c');
    this.game.renderer.rig.shake(0.55, 3);
    this.view.play(actor.id, 'cast');
    yield* this.view.driveAction(actor.id, 0.7);
    this.game.renderer.postfx.flash([1, 0.7, 0.4], 0.6);
    scheduler.run(function* () {
      yield* tween(0.6, 0, 0.6, (v) => { window.__game.renderer.postfx.flashStrength = v; });
    }, 'battle-action');
    for (const t of targets) {
      yield* this.resolvePhysical(actor, t, { power: 3.2, ignoreDefence: 0.5 });
    }
    yield wait(0.3);
  }

  /**
   * Whether the party found the answer to a creature, or the opposite.
   *
   * The affinity table is the puzzle the whole bestiary is built around, and
   * nothing else in the instrumentation shows whether anybody is solving it.
   * Only the party's own attacks are recorded: an enemy hitting a resistance
   * is the script, not a decision.
   */
  _trackAffinity(actor, target, element, mult, spell = null) {
    if (actor?.kind !== 'party' || !element || mult === 1) return;
    const props = {
      element, spell, enemy: target.def?.id ?? target.id,
      enemy_name: target.name, boss: this.isBoss, scanned: target.scanned === true,
    };
    if (mult > 1) analytics.track(EV.WEAKNESS_HIT, props);
    else if (mult <= 0) analytics.track(EV.ATTACK_ABSORBED, { ...props, absorbed: mult < 0 });
  }

  // --- turn end -----------------------------------------------------------

  *endOfTurn(actor) {
    if (actor.isKO) return;
    // Damage/heal over time, then countdown statuses.
    for (const [id, state] of Object.entries(actor.statuses)) {
      const def = STATUSES[id];
      if (!def) continue;
      if (def.tick) {
        const rate = TICK_RATES[def.tick] ?? 0.05;
        const amount = Math.max(1, Math.floor(actor.maxHP * rate));
        const pos = this.view.project(this.view.anchor(actor.id, 1.5));
        if (def.tick === 'regen') {
          const before = actor.hp;
          actor.hp = Math.min(actor.maxHP, actor.hp + amount);
          this.ui.popup(pos, actor.hp - before, 'heal');
        } else {
          yield* this.applyDamage(null, actor, amount, {});
        }
        yield wait(0.12);
      }
      if (state.turns > 0) {
        state.turns--;
        if (state.turns <= 0) {
          if (def.onExpire === 'kill' && !actor.isKO) {
            yield* this.applyDamage(null, actor, actor.hp, {});
          }
          actor.removeStatus(id);
        }
      }
    }
  }

  // --- resolution ---------------------------------------------------------

  _checkEnd() {
    if (this.phase === 'ending') return true;
    const enemiesDown = this.enemies.every((e) => e.isKO);
    const partyDown = this.party.every((p) => p.isKO);
    if (enemiesDown) { this._finish('victory'); return true; }
    if (partyDown) { this._finish('defeat'); return true; }
    return false;
  }

  _flee() {
    if (this.phase === 'ending' || !this.canFlee) return;
    this._finish('flee');
  }

  _finish(result) {
    this.phase = 'ending';
    this.result = result;
    const self = this;
    scheduler.cancelTag('battle-action');
    scheduler.run(function* () { yield* self.finishSequence(result); }, 'battle-intro');
  }

  *finishSequence(result) {
    this.ui.clearMenus();
    if (result === 'victory') {
      for (const c of this.party) {
        if (!c.isKO) { this.view.play(c.id, 'victory'); this.view.setActionT(c.id, 0); }
      }
      this.game.playMusic('victory', { fade: 0.15, restart: true });
      this.ui.showBanner('Victory', PACING.victoryBanner, '#ffd76a');
      yield wait(PACING.victoryBeat);
      yield* this.awardSpoils();
    } else if (result === 'flee') {
      this.ui.showBanner('Escaped', 1.2, '#9aa2b8');
      yield wait(0.7);
    } else {
      this.ui.showBanner('Defeat', 2.4, '#e0574f');
      this.game.renderer.postfx.desaturate = 1;
      yield wait(2.0);
    }
    for (const c of this.party) c.commit();
    this.game.renderer.postfx.desaturate = 0;
    this.onEnd?.(result, this);
  }

  *awardSpoils() {
    let exp = 0, rawGold = 0;
    const drops = [];
    for (const e of this.enemies) {
      exp += e.def.exp;
      rawGold += e.def.gold;
      for (const d of e.def.drops || []) {
        if (rng.loot.next() < d.chance) drops.push(d.id);
      }
    }
    const survivors = this.party.filter((p) => !p.isKO).length;
    const each = expShare(exp, survivors);
    const gold = goldShare(rawGold);
    this.game.party.addGold(gold);
    for (const id of drops) this.game.party.addItem(id, 1);

    const lines = [`Gained ${each} EXP and ${gold} gil.`];

    // The bench learns too, at half rate.
    //
    // There are fourteen playable characters and four slots, and a benched
    // member used to gain nothing at all — `awardSpoils` only ever walked the
    // combatants. New recruits arrive at the party average, so the moment a
    // character was swapped out they froze there for the rest of the game and
    // swapping them back in was a punishment. That makes the Formation screen
    // a commitment rather than a choice, which is the opposite of what a cast
    // this size is for. Half, not full, so who actually fights still matters.
    const fighting = new Set(this.party.map((c) => c.member));
    for (const m of this.game.party.roster.values()) {
      if (fighting.has(m) || m.isKO) continue;
      m.gainExp(Math.max(1, Math.floor(each * 0.5)));
    }

    for (const c of this.party) {
      if (c.isKO) continue;
      const levels = c.member.gainExp(each);
      c.maxHP = c.member.maxHP;
      c.maxMP = c.member.maxMP;
      if (levels > 0) lines.push(`${c.name} reached level ${c.member.level}!`);
      // Espers teach magic: proficiency accrues per battle.
      const esper = c.member.esper;
      if (esper) {
        for (const [spellId, rate] of Object.entries(esper.teaches || {})) {
          if (!c.member.knowsSpell(spellId) && c.member.learnSpell(spellId, rate * TEACH_RATE)) {
            lines.push(`${c.name} learned ${SPELLS[spellId]?.name ?? spellId}!`);
          }
        }
      }
    }
    if (drops.length) {
      const names = drops.map((d) => ITEMS[d]?.name ?? d);
      lines.push(`Found: ${names.join(', ')}.`);
    }
    // Routine spoils are not worth a button press. Anything a player would
    // actually stop for — a level, a learned spell, loot — arrives as an
    // extra line, so "one line" is exactly the case with nothing to read.
    // Those ride the banner and clear themselves; the rest, and every boss,
    // still open the dialogue. `spoilsBlocking` keeps the old behaviour
    // available and tells the balance audit which one it is pricing.
    const routine = lines.length === 1 && !this.isBoss;
    if (routine && !PACING.spoilsBlocking) {
      this.ui.showBanner(lines[0], 1.4, '#ffd76a');
      yield wait(0.9);
    } else {
      yield* this.game.dialogue.speak(null, lines);
    }
  }
}

function commandLabel(cmd) {
  return {
    attune: 'Attune', pilfer: 'Pilfer', contraption: 'Contraption', blitz: 'Blitz',
    iaido: 'Iaido', unmake: 'Unmake', wager: 'Wager', quarry: 'Quarry',
    render: 'Render', stance: 'Stance', annotate: 'Annotate', overclock: 'Overclock',
    litany: 'Litany', mimic: 'Mimic',
  }[cmd] || 'Special';
}

function hexToVec(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}
