import { activeParty, grantExp } from '../core/state.js';
import { RNG, hash } from '../core/rng.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function playerCombatant(member, index) {
  return {
    uid: `hero-${member.id}`, side: 'party', index, source: member,
    id: member.id, name: member.name, level: member.level,
    hp: member.hp, maxHp: member.maxHp, mp: member.mp, maxMp: member.maxMp,
    attack: member.vig, defense: member.sta, magic: member.mag, resistance: member.res,
    speed: member.spd, atb: index * 11, defending: false,
  };
}

function enemyCombatant(enemy, index) {
  return {
    uid: `enemy-${enemy.id}-${index}`, side: 'enemy', index, source: enemy,
    id: enemy.id, name: enemy.name, level: enemy.level,
    hp: enemy.stats.hp, maxHp: enemy.stats.hp, mp: enemy.stats.mp, maxMp: enemy.stats.mp,
    attack: enemy.stats.atk, defense: enemy.stats.def, magic: enemy.stats.mag,
    resistance: enemy.stats.mdef, speed: enemy.stats.spd, atb: 12 + index * 8,
    defending: false, exp: enemy.exp ?? 0, gold: enemy.gold ?? 0, drops: enemy.drops ?? [],
  };
}

export class BattleModel {
  constructor(data, state, enemyIds) {
    this.data = data;
    this.state = state;
    this.rng = new RNG(hash(`${Date.now()}:${state.steps}:${enemyIds.join(',')}`));
    this.party = activeParty(state).filter((member) => member.hp > 0).map(playerCombatant);
    this.enemies = enemyIds.map((id, index) => data.enemies[id] ? enemyCombatant(data.enemies[id], index) : null).filter(Boolean);
    if (!this.enemies.length) this.enemies.push(enemyCombatant(data.enemies.fenrat, 0));
    this.combatants = [...this.party, ...this.enemies];
    this.awaiting = null;
    this.busy = false;
    this.ended = null;
    this.round = 1;
  }

  alive(side) { return (side === 'party' ? this.party : this.enemies).filter((unit) => unit.hp > 0); }

  update(dt) {
    if (this.busy || this.awaiting || this.ended) return null;
    for (const unit of this.combatants) {
      if (unit.hp <= 0) continue;
      unit.atb = Math.min(100, unit.atb + (13 + Math.sqrt(Math.max(1, unit.speed)) * 3.4) * dt);
    }
    const ready = this.combatants.filter((unit) => unit.hp > 0 && unit.atb >= 100).sort((a, b) => b.atb - a.atb)[0];
    if (!ready) return null;
    ready.defending = false;
    if (ready.side === 'party') {
      this.awaiting = ready;
      return { kind: 'command', actor: ready };
    }
    ready.atb = 0;
    return this.prepare(ready, { kind: 'attack' });
  }

  command(actor, choice) {
    if (this.awaiting !== actor || this.busy) return null;
    const action = this.prepare(actor, choice);
    if (!action) return null;
    actor.atb = 0;
    this.awaiting = null;
    return action;
  }

  prepare(actor, choice) {
    if (choice.kind === 'defend') return { kind: 'defend', actor, targets: [actor], amount: 0, label: 'Defend' };
    if (choice.kind === 'item') {
      if ((this.state.inventory[choice.id] ?? 0) <= 0) return null;
      const item = this.data.items[choice.id];
      const target = this.alive('party').sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      return { kind: 'item', actor, targets: [target], amount: item.effect?.heal ?? 100, label: item.name, item };
    }
    if (choice.kind === 'spell') {
      const spell = this.data.spells[choice.id];
      if (!spell || actor.mp < spell.mp) return null;
      const isHeal = spell.kind === 'heal';
      const pool = this.alive(isHeal ? 'party' : actor.side === 'party' ? 'enemy' : 'party');
      const targets = spell.target?.startsWith('all') ? pool : [isHeal
        ? pool.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
        : this.rng.pick(pool)];
      const amount = Math.max(1, Math.round((actor.magic * 1.55 + spell.power * 2.2) * (.9 + this.rng.next() * .2)));
      return { kind: 'spell', actor, targets: targets.filter(Boolean), amount, label: spell.name, spell, healing: isHeal };
    }
    const pool = this.alive(actor.side === 'party' ? 'enemy' : 'party');
    const target = this.rng.pick(pool);
    if (!target) return null;
    const power = actor.attack * 1.7 + actor.level * 2.4;
    let amount = Math.max(1, Math.round(power * (.86 + this.rng.next() * .28) * 85 / (70 + target.defense)));
    const critical = this.rng.chance(.06 + Math.min(.15, actor.speed / 700));
    if (critical) amount = Math.round(amount * 1.65);
    if (target.defending) amount = Math.ceil(amount * .48);
    return { kind: 'attack', actor, targets: [target], amount, label: 'Attack', critical };
  }

  apply(action) {
    const results = [];
    if (action.kind === 'defend') {
      action.actor.defending = true;
      results.push({ target: action.actor, amount: 0, defending: true });
    } else if (action.kind === 'item') {
      this.state.inventory[action.item.id] -= 1;
      for (const target of action.targets) {
        const amount = Math.min(action.amount, target.maxHp - target.hp);
        target.hp += amount;
        results.push({ target, amount, healing: true });
      }
    } else if (action.kind === 'spell') {
      action.actor.mp = Math.max(0, action.actor.mp - action.spell.mp);
      for (const target of action.targets) {
        if (action.healing) {
          const amount = Math.min(action.amount, target.maxHp - target.hp);
          target.hp += amount;
          results.push({ target, amount, healing: true });
        } else {
          const affinity = target.source.affinity?.[action.spell.element];
          const multiplier = affinity === 'weak' ? 1.5 : affinity === 'resist' ? .5 : affinity === 'null' ? 0 : 1;
          const amount = Math.max(0, Math.round(action.amount * multiplier * 90 / (70 + target.resistance)));
          target.hp = Math.max(0, target.hp - amount);
          results.push({ target, amount, weak: affinity === 'weak', resisted: affinity === 'resist' });
        }
      }
    } else {
      const target = action.targets[0];
      target.hp = Math.max(0, target.hp - action.amount);
      results.push({ target, amount: action.amount, critical: action.critical });
    }
    for (const unit of this.party) {
      unit.source.hp = clamp(unit.hp, 0, unit.maxHp);
      unit.source.mp = clamp(unit.mp, 0, unit.maxMp);
    }
    if (!this.alive('enemy').length) this.ended = 'victory';
    if (!this.alive('party').length) this.ended = 'defeat';
    return results;
  }

  rewards() {
    const exp = this.enemies.reduce((sum, enemy) => sum + enemy.exp, 0);
    const gold = this.enemies.reduce((sum, enemy) => sum + enemy.gold, 0);
    this.state.gold += gold;
    this.state.victories += 1;
    const items = [];
    for (const enemy of this.enemies) for (const drop of enemy.drops) {
      if (this.rng.chance(drop.chance ?? 0)) {
        this.state.inventory[drop.id] = (this.state.inventory[drop.id] ?? 0) + 1;
        items.push(this.data.items[drop.id]?.name ?? drop.id);
      }
    }
    return { exp, gold, items, levels: grantExp(this.state, exp) };
  }
}
