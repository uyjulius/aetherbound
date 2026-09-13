import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newGame, normalizeState, grantExp, makeMember } from '../src/core/state.js';
import { BattleModel } from '../src/battle/model.js';

const data = Object.fromEntries(await Promise.all(['maps', 'legend', 'characters', 'enemies', 'items', 'spells'].map(async name =>
  [name, JSON.parse(await readFile(new URL(`../content/data/${name}.json`, import.meta.url), 'utf8'))])));
function setup(ids = ['fenrat', 'mireslug'], options = {}) {
  const state = newGame(data);
  return { state, battle: new BattleModel(data, state, ids, { seed: 73, ...options }) };
}
function command(battle, actor, choice) {
  battle.busy = false; battle.awaiting = actor;
  return battle.command(actor, choice);
}

test('every map has walkable data and exits to an existing destination', () => {
  for (const [id, map] of Object.entries(data.maps)) {
    assert.ok(map.terrain.some(row => [...row].some(glyph => data.legend.glyphs[glyph]?.walk)), id);
    for (const exit of map.exits ?? []) assert.ok(data.maps[exit.to], `${id} → ${exit.to}`);
  }
});

test('player targeting is explicit and one presentation impact applies once', () => {
  const { battle } = setup(); const actor = battle.party[0];
  const before = battle.enemies.map(unit => unit.hp);
  assert.equal(command(battle, actor, { kind: 'attack' }), null, 'no automatic/random player target');
  const action = command(battle, actor, { kind: 'attack', target: battle.enemies[1].uid });
  assert.deepEqual(battle.enemies.map(unit => unit.hp), before, 'lead-in preserves HP');
  battle.apply(action);
  assert.equal(battle.enemies[0].hp, before[0]);
  assert.ok(battle.enemies[1].hp < before[1]);
  const after = battle.enemies[1].hp;
  assert.deepEqual(battle.apply(action), []);
  assert.equal(battle.enemies[1].hp, after, 'duplicate impact is harmless');
});

test('unavailable skills, hostile healing targets and insufficient MP do not consume turns or supplies', () => {
  const { state, battle } = setup(); const actor = battle.party[0]; actor.atb = 100;
  assert.equal(command(battle, actor, { kind: 'item', id: 'potion', target: battle.enemies[0].uid }), null);
  assert.equal(state.inventory.potion, 5);
  assert.equal(command(battle, actor, { kind: 'ability', id: 'prayer' }), null);
  actor.mp = 0;
  assert.equal(command(battle, actor, { kind: 'spell', id: 'ember', target: battle.enemies[0].uid }), null);
  assert.equal(actor.atb, 100); assert.equal(battle.awaiting, actor);
});

test('fallen members remain in battle and can be revived, but cannot be healed by a potion', () => {
  const state = newGame(data); state.roster[1].hp = 0;
  const battle = new BattleModel(data, state, ['fenrat'], { seed: 10 });
  assert.equal(battle.party.length, 3);
  const healer = battle.party[2], fallen = battle.party[1];
  assert.equal(command(battle, healer, { kind: 'item', id: 'potion', target: fallen.uid }), null);
  const action = command(battle, healer, { kind: 'spell', id: 'reprise', target: fallen.uid });
  const mp = healer.mp; assert.equal(fallen.hp, 0);
  battle.apply(action);
  assert.ok(fallen.hp > 0); assert.equal(fallen.atb, 0);
  assert.equal(state.roster[1].hp, fallen.hp); assert.equal(healer.mp, mp - data.spells.reprise.mp);
});

test('tonics restore MP, Phoenix Tears revive and the last item cannot be reused', () => {
  const { state, battle } = setup(); const actor = battle.party[0]; const target = battle.party[1];
  target.mp = 0; state.inventory.tonic = 1;
  const tonic = command(battle, actor, { kind: 'item', id: 'tonic', target: target.uid });
  battle.apply(tonic);
  assert.equal(target.mp, Math.min(target.maxMp, 60)); assert.equal(state.inventory.tonic, 0);
  assert.equal(command(battle, actor, { kind: 'item', id: 'tonic', target: target.uid }), null);
  target.hp = 0;
  const tear = command(battle, actor, { kind: 'item', id: 'phoenixtear', target: target.uid });
  battle.apply(tear);
  assert.equal(target.hp, Math.round(target.maxHp / 2)); assert.equal(state.inventory.phoenixtear, 1);
});

test('cover redirects physical damage and the back row reduces physical exposure', () => {
  const { battle } = setup(); const guard = battle.party[1], protectedHero = battle.party[2], enemy = battle.enemies[0];
  battle.apply(command(battle, guard, { kind: 'ability', id: 'cover', target: protectedHero.uid }));
  const before = protectedHero.hp, guardBefore = guard.hp;
  battle.apply(battle.prepare(enemy, { kind: 'attack', target: protectedHero.uid }));
  assert.equal(protectedHero.hp, before); assert.ok(guard.hp < guardBefore);
  const frontBattle = setup().battle, backBattle = setup().battle;
  const victim = frontBattle.party[0], rear = backBattle.party[0]; rear.row = 'back';
  const def = frontBattle.definition(frontBattle.enemies[0], { kind: 'attack' });
  assert.ok(backBattle.damage(backBattle.enemies[0], rear, def).amount < frontBattle.damage(frontBattle.enemies[0], victim, def).amount);
});

test('wait and active modes provide predictable clock behavior during selection', () => {
  const wait = setup().battle;
  wait.awaiting = wait.party[0]; const gauge = wait.enemies[0].atb;
  wait.update(1); assert.equal(wait.enemies[0].atb, gauge);
  const active = setup(undefined, { battleMode: 'active' }).battle;
  active.awaiting = active.party[0]; active.enemies[0].atb = 99;
  const action = active.update(.1);
  assert.equal(action.actor.side, 'enemy'); assert.equal(active.awaiting, active.party[0]);
});

test('a boss telegraphs its wave and disallows escape', () => {
  const { battle } = setup(['bogfather']); const boss = battle.enemies[0]; boss.turns = 2;
  assert.match(battle.enemyIntent(boss), /wave/);
  const wave = battle.enemyAction(boss);
  assert.equal(wave.targets.length, 3); assert.equal(wave.definition.category, 'magic');
  assert.equal(command(battle, battle.party[0], { kind: 'flee' }), null);
});

test('element absorption heals and poison is a visible action result', () => {
  const { battle } = setup(['bogfather']); const actor = battle.party[0], boss = battle.enemies[0];
  boss.hp -= 100;
  const before = boss.hp;
  const water = battle.prepare(actor, { kind: 'spell', target: boss.uid }, { name: 'Water', category: 'magic', power: 20, element: 'water', target: 'oneEnemy', mp: 0 });
  battle.apply(water); assert.ok(boss.hp > before);
  actor.statuses.poison = 3;
  const result = battle.apply(command(battle, actor, { kind: 'defend' }));
  assert.ok(result.some(hit => hit.note === 'Poison' && hit.amount > 0));
});

test('victory rewards are granted once and defeat grants none', () => {
  const { battle, state } = setup(['fenrat']);
  battle.enemies[0].hp = 1;
  battle.apply(command(battle, battle.party[0], { kind: 'attack', target: battle.enemies[0].uid }));
  assert.equal(battle.ended, 'victory');
  const reward = battle.rewards(), gold = state.gold;
  assert.equal(battle.rewards(), reward); assert.equal(state.gold, gold); assert.equal(state.victories, 1);
  const loss = setup().battle; loss.party.forEach(unit => { unit.hp = 0; }); loss.checkEnd();
  assert.equal(loss.ended, 'defeat'); assert.equal(loss.rewards(), null);
});

test('multi-level growth and spent supplies survive save normalization without resurrection', () => {
  const state = newGame(data); state.roster[1].hp = 0; state.inventory = { potion: 0 };
  grantExp(state, 1600, data);
  assert.ok(state.roster[0].level > 7); assert.equal(state.roster[1].hp, 0);
  const restored = normalizeState(data, JSON.parse(JSON.stringify(state)));
  for (const member of restored.roster) {
    assert.equal(member.maxHp, makeMember(data.characters[member.id], member.level).maxHp);
    assert.equal(member.maxHp, state.roster.find(other => other.id === member.id).maxHp);
  }
  assert.deepEqual(restored.inventory, { potion: 0 }); assert.equal(restored.roster[1].hp, 0);
});

test('malformed saved parties and numeric fields recover to playable state', () => {
  const state = normalizeState(data, { version: 2, active: ['missing'], roster: [null], gold: -12, mapId: 'missing', position: [null, 5] });
  assert.equal(state.mapId, 'harrowmere'); assert.ok(state.active.length); assert.ok(state.roster.length);
  assert.equal(state.gold, 0); assert.equal(state.position, null);
});
