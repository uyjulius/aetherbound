import * as THREE from 'three';
import { BattleModel } from './model.js';
import { createCharacter, createEnemy } from '../render/actors.js';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class BattleController {
  constructor({ data, state, renderer, input, audio, effects, ui, onFinish }) {
    Object.assign(this, { data, state, renderer, input, audio, effects, ui, onFinish });
    this.model = null;
    this.actors = new Map();
    this.selected = 0;
    this.commands = [];
    this.active = false;
    this.pending = false;
    this.log = [];
  }

  async start(enemyIds) {
    this.active = true;
    this.pending = true;
    this.model = new BattleModel(this.data, this.state, enemyIds);
    this.renderer.battleRoot.clear();
    this.renderer.showBattle(true);
    this.renderer.followTarget.set(0, 0, 0);
    this.renderer.cameraAim.set(0, 0, 0);
    this.renderer.camera.position.set(10, 7.5, 14);
    this.renderer.cameraOffset.set(10, 7.5, 14);
    this.renderer.setEnvironment({ light: 'dusk', grade: 'ruin', cameraDistance: 16 });
    this.ui.showBattle(true);
    this.ui.banner('ENCOUNTER');
    this.addArena();

    const loads = [];
    for (const unit of this.model.party) {
      loads.push(createCharacter(this.data.characters[unit.id], this.data.char_models).then((actor) => {
        actor.root.position.set(-4.4 + unit.index * 1.15, 0, 2.5 + unit.index * 1.2);
        actor.root.rotation.y = Math.PI * .68;
        this.renderer.battleRoot.add(actor.root);
        this.actors.set(unit.uid, actor);
      }));
    }
    for (const unit of this.model.enemies) {
      loads.push(createEnemy(unit.source, this.data.monster_models, unit.index).then((actor) => {
        const spread = (unit.index - (this.model.enemies.length - 1) / 2) * 2.65;
        actor.root.position.set(3.2 + Math.abs(spread) * .14, 0, spread);
        actor.root.rotation.y = -Math.PI / 2;
        this.renderer.battleRoot.add(actor.root);
        this.actors.set(unit.uid, actor);
      }));
    }
    await Promise.all(loads);
    for (const actor of this.actors.values()) actor.play('idle');
    this.write(`${this.model.enemies.map((enemy) => enemy.name).join(', ')} block the road.`);
    this.refresh();
    await delay(650);
    this.pending = false;
    console.info(`BATTLE_READY enemies=${this.model.enemies.length}`);
  }

  addArena() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(11, 48),
      new THREE.MeshStandardMaterial({ color: '#51483d', roughness: .98, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.04;
    ground.receiveShadow = true;
    this.renderer.battleRoot.add(ground);
    for (let i = 0; i < 18; i += 1) {
      const angle = i / 18 * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.35 + (i % 3) * .16, 0), new THREE.MeshStandardMaterial({ color: '#3d3b38', roughness: 1 }));
      rock.position.set(Math.cos(angle) * (8.8 + (i % 2)), .18, Math.sin(angle) * (8.8 + (i % 2)));
      rock.rotation.set(i, angle, i * .7);
      rock.castShadow = true;
      this.renderer.battleRoot.add(rock);
    }
  }

  write(message) {
    this.log.unshift(message);
    this.log.length = Math.min(this.log.length, 3);
    this.ui.battleLog(this.log);
  }

  commandList(actor) {
    const list = [{ kind: 'attack', label: 'Attack', detail: 'Strike one enemy' }];
    for (const id of actor.source.spells ?? []) {
      const spell = this.data.spells[id];
      if (spell && spell.kind !== 'special') list.push({ kind: 'spell', id, label: spell.name, detail: `${spell.mp} MP · ${spell.kind}` , disabled: actor.mp < spell.mp });
    }
    if ((this.state.inventory.potion ?? 0) > 0) list.push({ kind: 'item', id: 'potion', label: 'Potion', detail: `${this.state.inventory.potion} held` });
    list.push({ kind: 'defend', label: 'Defend', detail: 'Halve the next blow' });
    return list;
  }

  openCommands(actor) {
    this.commands = this.commandList(actor);
    this.selected = 0;
    this.ui.commands(actor.name, this.commands, this.selected, (index) => this.choose(index));
  }

  choose(index = this.selected) {
    if (!this.model?.awaiting || this.pending) return;
    const choice = this.commands[index];
    if (!choice || choice.disabled) { this.audio.sfx('error'); return; }
    const action = this.model.command(this.model.awaiting, choice);
    if (!action) { this.audio.sfx('error'); return; }
    this.ui.commands();
    this.present(action);
  }

  async present(action) {
    this.pending = true;
    this.model.busy = true;
    const performer = this.actors.get(action.actor.uid);
    const targetActors = action.targets.map((target) => this.actors.get(target.uid)).filter(Boolean);
    const targetPoint = targetActors[0]?.root.position ?? performer.root.position;
    performer.face(targetPoint);
    const animation = action.kind === 'spell' || action.kind === 'item' ? 'cast' : action.kind === 'defend' ? 'idle' : 'attack';
    performer.play(animation);
    this.write(`${action.actor.name} uses ${action.label}.`);
    this.audio.sfx(action.kind === 'spell' ? 'magic' : action.kind === 'item' ? 'heal' : 'confirm');
    await delay(action.kind === 'attack' ? 430 : 560);

    for (const target of targetActors) {
      if (action.kind === 'attack') this.effects.slash(target.root.position);
      else {
        this.effects.ring(target.root.position, action.healing || action.kind === 'item' ? '#79d69a' : '#79dce2');
        this.effects.burst(target.root.position, action.healing || action.kind === 'item' ? '#8cf0b2' : '#83e8ef', 22);
      }
    }
    if (action.kind === 'attack') this.audio.sfx(action.critical ? 'crit' : 'hit');
    await delay(150);

    const results = this.model.apply(action);
    for (const result of results) {
      const targetActor = this.actors.get(result.target.uid);
      if (result.defending) {
        this.write(`${result.target.name} braces for impact.`);
        continue;
      }
      this.ui.damage(targetActor.root.position.clone().add(new THREE.Vector3(0, 1.5, 0)), result.amount, result.healing, result.critical || result.weak);
      if (result.target.hp <= 0) {
        targetActor.play('dead', .08);
        this.write(`${result.target.name} falls.`);
      } else if (!result.healing) targetActor.play('hurt', .06);
      else targetActor.play('idle');
    }
    this.refresh();
    await delay(620);
    performer.play('idle');
    for (const result of results) if (result.target.hp > 0) this.actors.get(result.target.uid)?.play('idle');
    this.model.busy = false;
    this.pending = false;
    console.info(`BATTLE_ACTION actor=${action.actor.id} kind=${action.kind} applied=true`);
    if (this.model.ended) await this.finish(this.model.ended);
  }

  async finish(result) {
    this.pending = true;
    this.ui.commands();
    if (result === 'victory') {
      for (const unit of this.model.alive('party')) this.actors.get(unit.uid)?.play('victory');
      const rewards = this.model.rewards();
      this.audio.play('victory');
      this.ui.banner('VICTORY');
      this.write(`${rewards.exp} EXP · ${rewards.gold} gil${rewards.items.length ? ` · ${rewards.items.join(', ')}` : ''}`);
      if (rewards.levels.length) this.write(`${rewards.levels.join(', ')} grew stronger.`);
      console.info(`BATTLE_END victory exp=${rewards.exp} gold=${rewards.gold}`);
      await delay(2100);
    } else {
      this.ui.banner('THE THREAD BREAKS');
      this.write('The party is carried back to the last aether mark.');
      console.info('BATTLE_END defeat');
      await delay(2300);
      for (const member of this.state.roster) { member.hp = member.maxHp; member.mp = member.maxMp; }
    }
    this.active = false;
    this.renderer.showBattle(false);
    this.renderer.battleRoot.clear();
    for (const actor of this.actors.values()) actor.dispose();
    this.actors.clear();
    this.ui.showBattle(false);
    this.onFinish?.(result);
  }

  refresh() { this.ui.battleStatus(this.model); }

  update(dt) {
    if (!this.active) return;
    for (const actor of this.actors.values()) actor.update(dt);
    this.statusClock = (this.statusClock ?? 0) + dt;
    if (this.statusClock >= .12) { this.statusClock = 0; this.refresh(); }
    if (this.pending) return;
    if (this.model.awaiting) {
      if (this.input.take('up')) { this.selected = (this.selected - 1 + this.commands.length) % this.commands.length; this.ui.commands(this.model.awaiting.name, this.commands, this.selected, (index) => this.choose(index)); }
      if (this.input.take('down')) { this.selected = (this.selected + 1) % this.commands.length; this.ui.commands(this.model.awaiting.name, this.commands, this.selected, (index) => this.choose(index)); }
      if (this.input.take('confirm')) this.choose();
      return;
    }
    const event = this.model.update(dt);
    if (event?.kind === 'command') this.openCommands(event.actor);
    else if (event) this.present(event);
  }
}
