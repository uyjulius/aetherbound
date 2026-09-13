import * as THREE from 'three';
import { BattleModel, supportsSpell } from './model.js';
import { ABILITIES, roleFor } from '../core/classes.js';
import { createCharacter, createEnemy } from '../render/actors.js';

const SPELL_COLORS = { fire: '#ff9960', ice: '#b6eeff', bolt: '#d0b4ff', aether: '#84e5ed', water: '#5fb7e5' };
const mix = (a, b, t) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));

export class BattleController {
  constructor({ data, state, renderer, input, audio, effects, ui, onFinish }) {
    Object.assign(this, { data, state, renderer, input, audio, effects, ui, onFinish });
    this.actors = new Map(); this.homes = new Map(); this.resources = [];
    this.active = false; this.pending = false; this.model = null;
    this.selected = 0; this.commands = []; this.menu = 'root'; this.log = [];
    this.timeline = null; this.result = null; this.statusClock = 0;
  }

  async start(enemyIds, options = {}) {
    this.active = true; this.pending = true;
    this.timeline = null; this.result = null; this.log = []; this.options = options;
    this.model = new BattleModel(this.data, this.state, enemyIds, options);
    this.renderer.battleRoot.clear(); this.renderer.showBattle(true);
    this.renderer.setEnvironment(options.environment ?? {});
    this.renderer.cameraOffset.set(.5, 6.7, 17);
    this.renderer.track(new THREE.Vector3(0, 0, -.6), true);
    this.ui.showBattle(true); this.ui.battleResult(); this.ui.commands();
    this.ui.banner(this.model.canFlee ? 'ENCOUNTER' : 'A FOE STIRS');
    this.addArena(options.environment ?? {});
    try {
      await Promise.all(this.model.combatants.map(async unit => {
        const actor = unit.side === 'party'
          ? await createCharacter(this.data.characters[unit.id], this.data.char_models)
          : await createEnemy(unit.source, this.data.monster_models, unit.index);
        // Bosses must remain legible and inside the frame, regardless of authored scale.
        if (actor.height > 3.3) actor.root.scale.setScalar(3.3 / actor.height);
        this.actors.set(unit.uid, actor);
        const home = this.homeFor(unit);
        actor.root.position.copy(home); this.homes.set(unit.uid, home);
        actor.root.rotation.y = unit.side === 'party' ? Math.PI / 2 : -Math.PI / 2;
        actor.play(unit.hp > 0 ? 'idle' : 'dead', 0);
        this.renderer.battleRoot.add(actor.root);
      }));
    } catch (error) {
      this.cleanup();
      this.ui.toast(`The encounter could not load: ${error.message}`);
      this.onFinish?.('error'); return;
    }
    this.write(this.model.enemies[0].source.intro ?? `${this.model.enemies.map(enemy => enemy.name).join(', ')} block the road.`);
    this.refresh(); this.introTime = .8;
    console.info(`BATTLE_READY enemies=${this.model.enemies.length}`);
  }

  homeFor(unit) {
    const count = unit.side === 'party' ? this.model.party.length : this.model.enemies.length;
    return new THREE.Vector3(unit.side === 'party' ? (unit.row === 'back' ? -5.2 : -3.8) : 3.7,
      0, (unit.index - (count - 1) / 2) * (count > 3 ? 1.65 : 2.2));
  }

  addArena(environment) {
    const cave = environment.kind === 'dungeon';
    const base = environment.base ?? 'grass';
    const textureFile = cave ? 'cave_rock' : base === 'snow' ? 'snow' : base === 'sand' ? 'sand' : 'grass';
    const texture = new THREE.TextureLoader().load(`./content/assets/textures/${textureFile}.png`);
    texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12); this.resources.push(texture);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ map: texture, color: cave ? '#888087' : '#afbea4', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.025; ground.receiveShadow = true;
    this.renderer.battleRoot.add(ground);
    const stone = new THREE.MeshStandardMaterial({ color: cave ? '#3a3646' : '#526158', roughness: 1 });
    for (let i = 0; i < 22; i += 1) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + i % 4, 0), stone);
      rock.position.set((i - 11) * 2.5, .1 + i % 3, -8 - (i % 3) * 2);
      rock.rotation.set(i * .6, i, 0); rock.scale.y = cave ? 1.8 : 1;
      rock.castShadow = true; this.renderer.battleRoot.add(rock);
    }
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(.58, .67, 40), new THREE.MeshBasicMaterial({ color: '#ffe6a3', transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
    this.cursor.rotation.x = -Math.PI / 2; this.cursor.visible = false;
    this.renderer.battleRoot.add(this.cursor);
  }

  write(message) { this.log.unshift(message); this.log.length = Math.min(this.log.length, 3); this.ui.battleLog(this.log); }

  buildCommands() {
    const actor = this.model.awaiting;
    if (!actor) return [];
    if (this.menu === 'targets') {
      return this.model.targetOptions(actor, this.chosen).map(unit => ({ kind: 'target', target: unit.uid, label: unit.name,
        detail: `${unit.hp <= 0 ? 'Fallen' : `${unit.hp} / ${unit.maxHp} HP`} · ${unit.side === 'party' ? `${unit.mp} MP` : 'Enemy'}` }));
    }
    if (this.menu === 'magic') return actor.source.spells.map(id => this.data.spells[id]).filter(supportsSpell).map(spell => ({
      kind: 'spell', id: spell.id, label: spell.name, detail: `${spell.mp} MP · ${spell.element ?? spell.effect ?? spell.kind}`,
      disabled: actor.mp < spell.mp || !!actor.statuses.silence }));
    if (this.menu === 'items') return Object.entries(this.state.inventory).filter(([id, count]) => count > 0 && this.data.items[id]?.kind === 'consumable').map(([id, count]) => ({
      kind: 'item', id, label: this.data.items[id].name, detail: `× ${count} · ${this.data.items[id].desc}`, disabled: !this.model.targetOptions(actor, { kind: 'item', id }).length }));
    const role = roleFor(actor.id); const ability = ABILITIES[role.skill];
    return [
      { kind: 'attack', label: 'Attack', detail: 'Choose a foe to strike' },
      ...(ability ? [{ kind: 'ability', id: ability.id, label: ability.name, detail: `${ability.mp ? `${ability.mp} MP · ` : ''}${ability.desc}`,
        disabled: actor.mp < ability.mp || !this.model.targetOptions(actor, { kind: 'ability', id: ability.id }).length }] : []),
      ...(actor.source.spells.some(id => supportsSpell(this.data.spells[id])) ? [{ kind: 'menu', page: 'magic', label: role.magic ?? 'Magic', detail: `${actor.mp} / ${actor.maxMp} MP`, disabled: !!actor.statuses.silence }] : []),
      { kind: 'menu', page: 'items', label: 'Items', detail: 'Recovery and battle supplies' },
      { kind: 'defend', label: 'Defend', detail: 'Halve damage until your next turn' },
      { kind: 'row', label: 'Change row', detail: `Currently ${actor.row} · back reduces physical damage dealt and taken` },
      { kind: 'flee', label: 'Retreat', detail: this.model.canFlee ? 'Try to escape this encounter' : 'This foe blocks your escape', disabled: !this.model.canFlee },
    ];
  }

  renderCommands(reset = false) {
    const actor = this.model.awaiting;
    if (!actor || this.pending || this.result) { this.ui.commands(); if (this.cursor) this.cursor.visible = false; return; }
    this.commands = this.buildCommands();
    if (!this.commands.length && this.menu !== 'root') { this.menu = 'root'; this.commands = this.buildCommands(); }
    this.selected = reset ? 0 : Math.min(this.selected, this.commands.length - 1);
    const title = this.menu === 'targets' ? `${this.chosen.label} · Choose a target` : `${actor.name} · ${this.menu === 'root' ? roleFor(actor.id).name : this.menu}`;
    this.ui.commands(title, this.commands, this.selected, index => this.choose(index), () => this.back(), this.menu !== 'root');
    const target = this.commands[this.selected]?.target;
    this.cursor.visible = !!target;
    if (target) this.cursor.position.copy(this.actors.get(target).root.position).setY(.045);
  }

  openCommands() { this.menu = 'root'; this.chosen = null; this.renderCommands(true); this.audio.sfx('cursor'); }
  back() {
    if (this.menu === 'targets') this.menu = this.previousMenu;
    else this.menu = 'root';
    this.renderCommands(true); this.audio.sfx('cancel');
  }
  choose(index = this.selected) {
    if (!this.model?.awaiting || this.pending || this.result) return;
    const choice = this.commands[index];
    if (!choice || choice.disabled) { this.audio.sfx('error'); return; }
    this.selected = index;
    if (choice.kind === 'menu') { this.menu = choice.page; this.renderCommands(true); return; }
    const selected = choice.kind === 'target' ? { ...this.chosen, target: choice.target } : choice;
    const definition = this.model.definition(this.model.awaiting, selected);
    if (choice.kind !== 'target' && definition.target !== 'self' && !definition.target.startsWith('all')) {
      this.chosen = choice; this.previousMenu = this.menu; this.menu = 'targets'; this.renderCommands(true); return;
    }
    const action = this.model.command(this.model.awaiting, selected);
    if (!action) { this.audio.sfx('error'); this.ui.toast(this.model.lastError); this.renderCommands(); return; }
    this.present(action);
  }

  present(action) {
    this.pending = true; this.model.busy = true; this.ui.commands(); this.cursor.visible = false;
    const performer = this.actors.get(action.actor.uid);
    const home = performer.root.position.clone();
    const targetPosition = this.actors.get(action.targets[0].uid).root.position.clone();
    const isStrike = action.definition.category === 'physical';
    const travel = isStrike ? mix(home, targetPosition, .78) : home.clone();
    performer.face(targetPosition);
    performer.play(isStrike ? 'run' : ['defend','cover','row','flee'].includes(action.definition.category) ? 'idle' : 'cast');
    this.timeline = { action, elapsed: 0, impacted: false, home, travel, performer, isStrike, attackStarted: false };
    this.write(`${action.actor.name} → ${action.label}${action.targets.length === 1 && action.targets[0] !== action.actor ? ` → ${action.targets[0].name}` : ''}`);
    if (!isStrike) this.audio.sfx(action.healing ? 'heal' : 'magic');
  }

  impact(timeline) {
    const { action } = timeline;
    timeline.impacted = true;
    const results = this.model.apply(action);
    for (const result of results) {
      const actor = this.actors.get(result.target.uid);
      if (result.amount || result.mp) {
        this.ui.damage(actor.root.position.clone().add(new THREE.Vector3(0, actor.height * .8, 0)), result.mp && !result.amount ? `${result.mp} MP` : result.amount, result.healing, result.critical || result.weak);
        if (result.healing) this.effects.ring(actor.root.position, '#91efb5');
        else {
          this.effects.slash(actor.root.position, SPELL_COLORS[action.definition.element] ?? '#ffe6af');
          this.effects.burst(actor.root.position, SPELL_COLORS[action.definition.element] ?? '#ffb58a', 18);
        }
      }
      if (result.note) { this.write(`${result.target.name}: ${result.note}`); }
      if (result.fallen) { actor.play('dead', .07); this.write(`${result.target.name} falls.`); }
      else if (!result.healing && result.amount > 0) actor.play('hurt', .06);
      else if (result.revived) actor.play('idle', .12);
    }
    this.audio.sfx(action.healing ? 'heal' : 'hit');
    this.refresh();
    console.info(`BATTLE_IMPACT sequence=${action.sequence} kind=${action.kind}`);
  }

  advanceTimeline(dt) {
    const t = this.timeline; t.elapsed += dt;
    if (t.isStrike && t.action.actor.hp > 0) {
      if (t.elapsed < .3) {
        t.performer.root.position.copy(mix(t.home, t.travel, t.elapsed / .3));
        if (t.action.id === 'jump') t.performer.root.position.y = Math.sin(t.elapsed / .3 * Math.PI) * 2.1;
      } else if (!t.attackStarted) { t.performer.root.position.copy(t.travel); t.performer.play('attack', .05); t.attackStarted = true; }
      if (t.elapsed > 1.05) t.performer.root.position.copy(mix(t.travel, t.home, (t.elapsed - 1.05) / .45));
    }
    if (!t.impacted && t.elapsed >= .65) this.impact(t);
    if (t.elapsed < 1.65) return;
    for (const unit of this.model.combatants) {
      const actor = this.actors.get(unit.uid);
      actor.root.position.copy(this.homeFor(unit));
      actor.root.rotation.y = unit.side === 'party' ? Math.PI / 2 : -Math.PI / 2;
      if (unit.hp > 0) actor.play('idle');
    }
    this.timeline = null; this.pending = false; this.model.busy = false;
    if (this.model.ended) this.finish(this.model.ended);
    else if (this.model.awaiting) this.renderCommands();
    console.info(`BATTLE_ACTION actor=${t.action.actor.id} kind=${t.action.kind} applied=true`);
  }

  finish(result) {
    if (this.result) return;
    this.pending = true; this.result = result; this.resultTime = 0;
    this.ui.commands(); this.cursor.visible = false;
    const rewards = result === 'victory' ? this.model.rewards() : null;
    if (result === 'victory') {
      for (const unit of this.model.alive('party')) this.actors.get(unit.uid).play('victory');
      this.audio.play('victory'); this.ui.banner('VICTORY');
    } else if (result === 'defeat') this.audio.play('gameover');
    this.ui.battleResult(result, rewards, () => this.leave());
    console.info(`BATTLE_END ${result}`);
  }

  leave() {
    if (!this.result || this.resultTime < .8) return;
    const result = this.result;
    this.cleanup();
    this.onFinish?.(result);
  }

  cleanup() {
    this.active = false; this.pending = false; this.timeline = null;
    for (const actor of this.actors.values()) actor.dispose();
    this.actors.clear(); this.homes.clear();
    this.renderer.battleRoot.traverse(node => {
      node.geometry?.dispose();
      if (Array.isArray(node.material)) node.material.forEach(material => material.dispose()); else node.material?.dispose();
    });
    for (const resource of this.resources) resource.dispose();
    this.resources = []; this.renderer.battleRoot.clear();
    this.renderer.showBattle(false); this.ui.battleResult(); this.ui.showBattle(false);
    this.input.flush();
  }

  refresh() { this.ui.battleStatus(this.model); }
  update(dt) {
    if (!this.active) return;
    for (const actor of this.actors.values()) actor.update(dt);
    this.statusClock += dt;
    if (this.statusClock >= .15) { this.statusClock = 0; this.refresh(); }
    if (this.result) { this.resultTime += dt; if (this.input.take('confirm')) this.leave(); return; }
    if (this.introTime > 0) { this.introTime -= dt; if (this.introTime <= 0) this.pending = false; return; }
    if (this.timeline) { this.advanceTimeline(dt); return; }
    if (this.pending) return;
    if (this.model.ended) { this.finish(this.model.ended); return; }
    if (this.model.awaiting) {
      if (this.input.take('up') || this.input.take('left')) { this.selected = (this.selected - 1 + this.commands.length) % this.commands.length; this.renderCommands(); }
      if (this.input.take('down') || this.input.take('right')) { this.selected = (this.selected + 1) % this.commands.length; this.renderCommands(); }
      if (this.input.take('cancel')) this.back();
      if (this.input.take('confirm')) this.choose();
    }
    const event = this.model.update(dt);
    if (event?.kind === 'command') this.openCommands();
    else if (event) this.present(event);
  }
}
