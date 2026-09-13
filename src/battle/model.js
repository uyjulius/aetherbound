import { activeParty, grantExp } from '../core/state.js';
import { ABILITIES, roleFor } from '../core/classes.js';
import { RNG, hash } from '../core/rng.js';

const GOOD = new Set(['protect', 'haste']);
const STATUS = new Set(['poison', 'blind', 'silence', 'slow', 'protect', 'haste']);
const SPECIAL = new Set(['revive', 'cureStatus', 'fullHeal', 'scan', 'stripBuffs']);
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export const supportsSpell = (spell) => spell && (['attack', 'heal'].includes(spell.kind)
  || (spell.kind === 'status' && Object.keys(spell.status ?? {}).every(key => STATUS.has(key)))
  || SPECIAL.has(spell.effect));

function hero(member, index) {
  return { uid: `hero-${member.id}`, side: 'party', index, source: member, id: member.id,
    name: member.name, level: member.level, hp: member.hp, maxHp: member.maxHp,
    mp: member.mp, maxMp: member.maxMp, attack: member.vig, defense: member.sta,
    magic: member.mag, resistance: member.res, speed: member.spd, row: member.row ?? roleFor(member.id).row,
    atb: 35 - index * 7, defending: false, cover: null, statuses: { ...(member.statuses ?? {}) }, turns: 0 };
}
function foe(enemy, index, duplicate) {
  return { uid: `enemy-${enemy.id}-${index}`, side: 'enemy', index, source: enemy, id: enemy.id,
    name: `${enemy.name}${duplicate ? ` ${String.fromCharCode(65 + index)}` : ''}`, level: enemy.level,
    hp: enemy.stats.hp, maxHp: enemy.stats.hp, mp: enemy.stats.mp, maxMp: enemy.stats.mp,
    attack: enemy.stats.atk, defense: enemy.stats.def, magic: enemy.stats.mag, resistance: enemy.stats.mdef,
    speed: enemy.stats.spd, atb: index * 7, row: 'front', defending: false, cover: null,
    statuses: {}, turns: 0, exp: enemy.exp ?? 0, gold: enemy.gold ?? 0, drops: enemy.drops ?? [] };
}

export class BattleModel {
  constructor(data, state, enemyIds, options = {}) {
    this.data = data; this.state = state;
    this.rng = new RNG(options.seed ?? hash(`${Date.now()}:${state.steps}:${enemyIds.join(',')}`));
    this.party = activeParty(state).map(hero);
    this.enemies = enemyIds.map((id, index) => data.enemies[id]
      ? foe(data.enemies[id], index, enemyIds.filter(other => other === id).length > 1) : null).filter(Boolean);
    if (!this.enemies.length) throw new Error('An encounter needs at least one valid enemy.');
    this.combatants = [...this.party, ...this.enemies];
    this.awaiting = null; this.busy = false; this.ended = null;
    this.canFlee = options.canFlee ?? !this.enemies.some(enemy => enemy.source.boss);
    this.battleMode = options.battleMode ?? 'wait';
    this.applied = new WeakSet(); this.actions = new WeakSet(); this.sequence = 0;
    this.lastError = ''; this.reward = null; this.escapeAttempts = 0;
    this.checkEnd();
  }

  alive(side) { return (side === 'party' ? this.party : this.enemies).filter(unit => unit.hp > 0); }
  checkEnd() {
    if (!this.alive('party').length) this.ended = 'defeat';
    else if (!this.alive('enemy').length) this.ended = 'victory';
    if (this.awaiting?.hp <= 0 || this.ended) this.awaiting = null;
    return this.ended;
  }

  update(dt) {
    if (this.busy || this.checkEnd() || (this.awaiting && this.battleMode === 'wait')) return null;
    for (const unit of this.combatants) {
      if (unit.hp <= 0) continue;
      const rate = (17 + Math.sqrt(Math.max(1, unit.speed)) * 2.3)
        * (unit.statuses.slow ? .55 : 1) * (unit.statuses.haste ? 1.4 : 1);
      unit.atb = Math.min(100, unit.atb + rate * dt);
    }
    // Stable readiness order; selecting a hero never discards another full gauge.
    const ready = this.combatants.find(unit => unit.hp > 0 && unit.atb >= 100
      && (unit.side === 'enemy' || !this.awaiting));
    if (!ready) return null;
    ready.defending = false; ready.cover = null;
    if (ready.side === 'party') { this.awaiting = ready; return { kind: 'command', actor: ready }; }
    const action = this.enemyAction(ready);
    if (action) { ready.atb = 0; this.busy = true; }
    return action;
  }

  definition(actor, choice) {
    if (!choice || !actor) return null;
    switch (choice.kind) {
      case 'attack': return { name: 'Attack', target: 'oneEnemy', category: 'physical', power: 1, mp: 0 };
      case 'defend': return { name: 'Defend', target: 'self', category: 'defend', mp: 0 };
      case 'row': return { name: 'Change row', target: 'self', category: 'row', mp: 0 };
      case 'flee': return this.canFlee ? { name: 'Retreat', target: 'self', category: 'flee', mp: 0 } : null;
      case 'ability': return roleFor(actor.id).skill === choice.id ? ABILITIES[choice.id] : null;
      case 'item': {
        const item = this.data.items[choice.id];
        return item?.kind === 'consumable' ? { ...item, category: 'item', mp: 0 } : null;
      }
      case 'spell': {
        const spell = this.data.spells[choice.id];
        if (!supportsSpell(spell) || (actor.side === 'party' && !actor.source.spells.includes(choice.id))) return null;
        return { ...spell, category: spell.kind === 'attack' ? 'magic' : spell.kind === 'heal' ? 'heal' : spell.effect ?? 'status' };
      }
      default: return null;
    }
  }

  targetOptions(actor, choice, definition = this.definition(actor, choice)) {
    if (!definition) return [];
    if (definition.target === 'self') return actor.hp > 0 ? [actor] : [];
    const own = actor.side === 'party' ? this.party : this.enemies;
    const other = actor.side === 'party' ? this.enemies : this.party;
    const allies = /Ally|Allies/.test(definition.target);
    const pool = allies ? own : other;
    const revive = definition.targetsKO || definition.category === 'revive' || definition.effect?.revive;
    return pool.filter(unit => (revive ? unit.hp <= 0 : unit.hp > 0)
      && !(definition.category === 'cover' && actor === unit));
  }

  command(actor, choice) {
    if (this.awaiting !== actor || this.busy || this.ended || actor.hp <= 0) return null;
    const action = this.prepare(actor, choice);
    if (!action) return null;
    this.awaiting = null; actor.atb = 0; actor.defending = false; actor.cover = null;
    this.busy = true;
    return action;
  }

  prepare(actor, choice, customDefinition) {
    this.lastError = '';
    const definition = customDefinition ?? this.definition(actor, choice);
    const fail = text => { this.lastError = text; return null; };
    if (!definition || actor.hp <= 0) return fail('That action is unavailable.');
    if (actor.mp < (definition.mp ?? 0)) return fail('Not enough MP.');
    if (choice.kind === 'spell' && actor.statuses.silence) return fail('Silence prevents spellcasting.');
    if (choice.kind === 'item' && !(this.state.inventory[choice.id] > 0)) return fail('None left in the pack.');
    const pool = this.targetOptions(actor, choice, definition);
    let targets;
    if (definition.target?.startsWith('all')) targets = pool;
    else if (definition.target === 'self') targets = pool;
    else targets = pool.filter(unit => unit.uid === choice.target).slice(0, 1);
    if (!targets.length) return fail('Choose a valid target.');
    const action = { sequence: ++this.sequence, kind: choice.kind, id: choice.id, actor, targets,
      definition, label: definition.name, healing: ['heal', 'revive', 'cureStatus'].includes(definition.category)
        || (definition.category === 'item' && !definition.effect?.damage) };
    this.actions.add(action);
    return action;
  }

  enemyIntent(unit) {
    if (unit.source.boss) return unit.turns % 3 === 2 ? 'Gathering aether · brace for a wave' : 'Watching the front line';
    if (unit.id === 'mireslug') return unit.turns % 3 === 2 ? 'Venom gathering' : 'Closing in';
    if (unit.id === 'reedstalker') return unit.turns % 3 === 2 ? 'Sharpening its barbs' : 'Stalking';
    return 'Ready to strike';
  }

  enemyAction(actor) {
    const target = this.rng.pick(this.alive('party'));
    if (!target) return null;
    let definition = this.definition(actor, { kind: 'attack' });
    if (actor.source.boss && actor.turns % 3 === 2) {
      definition = { name: actor.hp < actor.maxHp * .4 ? 'Aether Rupture' : 'Rising Mire', target: 'allEnemies',
        category: 'magic', power: actor.hp < actor.maxHp * .4 ? 38 : 20, element: 'water', mp: 0 };
    } else if (['mireslug', 'reedstalker'].includes(actor.id) && actor.turns % 3 === 2) {
      definition = { name: 'Venom barb', target: 'oneEnemy', category: 'physical', power: .8, status: { poison: 100 }, mp: 0 };
    }
    return this.prepare(actor, { kind: definition.category === 'magic' ? 'spell' : 'attack', target: target.uid }, definition);
  }

  damage(actor, target, definition) {
    const physical = definition.category === 'physical';
    const variance = .92 + this.rng.next() * .16;
    let amount = physical
      ? (actor.attack * 1.35 + actor.level * 2) * (definition.power ?? 1) * 90 / (80 + target.defense)
      : (actor.magic * 1.25 + (definition.power ?? 0) * 1.8) * 90 / (80 + target.resistance);
    if (physical && !definition.id) { if (actor.row === 'back') amount *= .55; }
    if (physical && target.row === 'back') amount *= .55;
    if (target.defending) amount *= .5;
    if (physical && target.statuses.protect) amount *= .6;
    const critical = physical && this.rng.chance(.06);
    if (critical) amount *= 1.6;
    const affinity = target.source.affinity?.[definition.element];
    if (affinity === 'weak') amount *= 1.5;
    if (affinity === 'resist') amount *= .5;
    if (affinity === 'absorb') amount *= -1;
    if (['null', 'immune'].includes(affinity)) amount = 0;
    if (physical && actor.statuses.blind && this.rng.chance(.65)) return { amount: 0, note: 'Miss' };
    return { amount: Math.round(amount * variance), critical, weak: affinity === 'weak', note: affinity === 'absorb' ? 'Absorbed' : amount === 0 ? 'Immune' : '' };
  }

  apply(action) {
    // A presentation callback may be delivered twice; a second impact cannot spend or reward twice.
    if (!action || !this.actions.has(action) || this.applied.has(action) || this.ended) return [];
    this.applied.add(action);
    const { actor, definition: def } = action;
    if (actor.hp <= 0) { this.busy = false; return []; }
    actor.mp = Math.max(0, actor.mp - (def.mp ?? 0));
    if (action.kind === 'item') this.state.inventory[action.id] = Math.max(0, this.state.inventory[action.id] - 1);
    const results = [];
    if (def.category === 'flee') {
      this.escapeAttempts += 1;
      const escaped = this.rng.chance(Math.min(1, .55 + (this.escapeAttempts - 1) * .25));
      if (escaped) this.ended = 'escape';
      results.push({ target: actor, amount: 0, note: escaped ? 'Escaped' : 'Escape failed' });
    } else for (let target of action.targets) {
      if (def.category === 'physical' && target.side === 'party') {
        const guard = this.alive('party').find(unit => unit !== target && unit.cover === target.uid);
        if (guard) { results.push({ target: guard, amount: 0, note: `Covers ${target.name}` }); target = guard; }
      }
      const result = { target, amount: 0 };
      const effect = def.category === 'item' ? def.effect ?? {} : {};
      const restore = amount => { result.healing = true; result.amount = Math.min(Math.round(amount), target.maxHp - target.hp); target.hp += result.amount; };
      if (def.category === 'defend') { actor.defending = true; result.note = 'Guarding'; }
      else if (def.category === 'row') { actor.row = actor.row === 'front' ? 'back' : 'front'; actor.source.row = actor.row; result.note = `${actor.row} row`; }
      else if (def.category === 'cover') { actor.cover = target.uid; result.note = 'Covered'; }
      else if (def.category === 'revive' || effect.revive) {
        if (target.hp <= 0) { restore(target.maxHp * (effect.revive ?? def.ratio ?? .25)); target.atb = 0; target.statuses = {}; result.revived = true; }
      } else if (target.hp > 0) {
        if (def.category === 'heal' || effect.heal || effect.fullHeal) {
          restore(effect.fullHeal || def.effect === 'fullHeal' ? target.maxHp : effect.heal ?? (actor.magic * 1.2 + (def.power ?? 0) * 2));
        }
        if (effect.mp || effect.fullMP) { result.mp = Math.min(effect.fullMP ? target.maxMp : effect.mp, target.maxMp - target.mp); target.mp += result.mp; result.healing = true; }
        if (['magic', 'physical'].includes(def.category) || effect.damage) {
          const hit = effect.damage ? { amount: effect.damage * (target.source.affinity?.[effect.element] === 'weak' ? 1.5 : target.source.affinity?.[effect.element] === 'absorb' ? -1 : ['immune', 'null'].includes(target.source.affinity?.[effect.element]) ? 0 : target.source.affinity?.[effect.element] === 'resist' ? .5 : 1) }
            : this.damage(actor, target, def);
          Object.assign(result, hit);
          if (hit.amount < 0) restore(-hit.amount);
          else target.hp = Math.max(0, target.hp - hit.amount);
        }
        if (def.category === 'cureStatus' || effect.cure || effect.cureAll) {
          const cures = effect.cureAll ? Object.keys(target.statuses).filter(id => !GOOD.has(id)) : effect.cure ?? def.cures ?? [];
          for (const status of cures) delete target.statuses[status];
          result.note = 'Cleansed'; result.healing = true;
        }
        if (def.category === 'stripBuffs') { for (const id of GOOD) delete target.statuses[id]; result.note = 'Dispelled'; }
        if (def.category === 'scan') result.note = `${target.hp}/${target.maxHp} HP · ${Object.entries(target.source.affinity ?? {}).map(([element, value]) => `${element}: ${value}`).join(', ') || 'No affinities'}`;
        for (const [id, chance] of Object.entries(def.status ?? effect.status ?? {})) {
          if (!STATUS.has(id) || target.source.immune?.includes(id) || target.source.affinity?.[id] === 'immune') continue;
          if (this.rng.chance(chance / 100)) { target.statuses[id] = 4; result.note = id; }
        }
      }
      if (target.hp <= 0) { target.atb = 0; target.cover = null; target.statuses = {}; result.fallen = true; }
      results.push(result);
    }
    actor.turns += 1;
    if (actor.statuses.poison && actor.hp > 0 && !this.ended) {
      const amount = Math.max(1, Math.round(actor.maxHp * .06));
      actor.hp = Math.max(0, actor.hp - amount);
      results.push({ target: actor, amount, note: 'Poison', fallen: actor.hp <= 0 });
    }
    for (const id of Object.keys(actor.statuses)) if (--actor.statuses[id] <= 0) delete actor.statuses[id];
    this.sync(); this.checkEnd();
    // Presentation owns busy until reactions finish, then releases the next turn.
    return results;
  }

  sync() {
    for (const unit of this.party) {
      unit.source.hp = clamp(unit.hp, 0, unit.maxHp); unit.source.mp = clamp(unit.mp, 0, unit.maxMp);
      unit.source.statuses = unit.hp > 0 ? { ...unit.statuses } : {};
    }
  }

  rewards() {
    if (this.ended !== 'victory') return null;
    if (this.reward) return this.reward;
    const exp = this.enemies.reduce((sum, enemy) => sum + enemy.exp, 0);
    const gold = this.enemies.reduce((sum, enemy) => sum + enemy.gold, 0);
    this.state.gold += gold; this.state.victories += 1;
    const items = [];
    for (const enemy of this.enemies) for (const drop of enemy.drops) if (this.rng.chance(drop.chance ?? 0)) {
      this.state.inventory[drop.id] = (this.state.inventory[drop.id] ?? 0) + 1;
      items.push(this.data.items[drop.id]?.name ?? drop.id);
    }
    this.reward = { exp, gold, items, levels: grantExp(this.state, exp, this.data) };
    return this.reward;
  }
}
