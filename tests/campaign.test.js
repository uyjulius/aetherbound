import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareCampaign } from '../src/campaign/content.js';
import { eventPlan, applyEvent, updateJournal } from '../src/campaign/story.js';
import { newGame, normalizeState, grantExp } from '../src/core/state.js';
import { equipmentStats, equipItem } from '../src/core/equipment.js';
import { trade, useFieldItem, restAtInn } from '../src/core/commerce.js';
import { BattleModel } from '../src/battle/model.js';
const raw = Object.fromEntries(await Promise.all(['maps', 'legend', 'characters', 'enemies', 'items', 'spells'].map(async name => [name, JSON.parse(await readFile(new URL(`../content/data/${name}.json`, import.meta.url), 'utf8'))])));
const data = prepareCampaign(raw);

test('a prototype stage counter cannot strand a continued journey behind a new campaign gate', () => {
  const state = normalizeState(data, { ...newGame(data), quest: { stage: 1, text: 'Old objective' }, flags: [] });
  updateJournal(state); assert.equal(state.quest.stage, 0);
  assert.equal(eventPlan(state, 'elder').flag, 'elder-briefing');
  state.flags.push('first-engine'); updateJournal(state); assert.equal(state.quest.stage, 8);
});

function stand(map, x, z) {
  if (!data.legend.glyphs[map.terrain[Math.floor(z)]?.[Math.floor(x)]]?.walk) return false;
  return !(map.props ?? []).some(prop => {
    if (prop.solid === false || prop.radius === 0) return false;
    const dx = (x - prop.at[0]) * 2, dz = (z - prop.at[1]) * 2;
    if (prop.kit === 'building') return Math.abs(dx) < (prop.w ?? 5) / 2 + .35 && Math.abs(dz) < (prop.d ?? 4) / 2 + .35;
    const radius = prop.radius ?? (prop.kit === 'tree' ? .65 : ['well', 'stall', 'cart'].includes(prop.kit) ? .8 : .45);
    return dx * dx + dz * dz < (radius + .35) ** 2;
  });
}
test('every authored spawn, exit, chest and story mechanism has a connected walkable route', () => {
  for (const map of Object.values(data.maps)) {
    const spawn = map.spawns.default.at, width = map.terrain[0].length, height = map.terrain.length;
    assert.ok(stand(map, ...spawn), `${map.id}: default spawn is blocked`);
    const key = (x, z) => `${x},${z}`, visited = new Set();
    const queue = [[Math.floor(spawn[0]) + .5, Math.floor(spawn[1]) + .5]];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const [x, z] = queue[cursor];
      if (visited.has(key(x, z)) || !stand(map, x, z)) continue;
      visited.add(key(x, z));
      for (const [dx, dz] of [[.5, 0], [-.5, 0], [0, .5], [0, -.5]]) if (x + dx >= 0 && z + dz >= 0 && x + dx < width && z + dz < height) queue.push([x + dx, z + dz]);
    }
    const reachable = [...visited].map(value => value.split(',').map(Number));
    for (const [id, entry] of Object.entries(map.spawns)) assert.ok(reachable.some(([x, z]) => Math.hypot(x - entry.at[0], z - entry.at[1]) < 1), `${map.id}: spawn ${id} is disconnected`);
    for (const exit of map.exits) {
      assert.ok(data.maps[exit.to]?.spawns[exit.spawn], `${map.id}: destination/spawn ${exit.to}/${exit.spawn} missing`);
      assert.ok(reachable.some(([x, z]) => x >= exit.at[0] && x < exit.at[0] + exit.size[0] && z >= exit.at[1] && z < exit.at[1] + exit.size[1]), `${map.id}: exit ${exit.to} blocked`);
    }
    for (const prop of map.props.filter(p => p.event || p.contains || p.interact?.save)) assert.ok(reachable.some(([x, z]) => Math.hypot(x - prop.at[0], z - prop.at[1]) < 1.5), `${map.id}: ${prop.id} unreachable`);
  }
});

test('campaign advances only after prerequisites, recruits once, and resolves all three chapters', () => {
  const state = newGame(data); updateJournal(state);
  assert.equal(eventPlan(state, 'first-engine').battle, undefined);
  assert.equal(eventPlan(state, 'root-bell').battle, undefined);
  const events = ['elder', 'sluice-reed', 'sluice-stone', 'root-bell', 'elder', 'aurelian', 'coolant', 'exhaust', 'governor', 'furnace-crown', 'dock', 'star-chart', 'resonator', 'bridge-guardian', 'first-engine'];
  for (const event of events) {
    const plan = eventPlan(state, event); assert.ok(plan, event);
    applyEvent(data, state, plan);
    if (plan.flag) { const after = JSON.stringify(state); assert.equal(applyEvent(data, state, plan), false); assert.equal(JSON.stringify(state), after); }
  }
  assert.equal(state.quest.stage, 8); assert.equal(state.roster.length, 5); assert.equal(state.active.length, 5);
  assert.deepEqual(eventPlan(state, 'homeward').travel, ['harrowmere', 'default']);
  assert.equal(eventPlan(state, 'first-engine').battle, undefined, 'finished bosses cannot grant rewards again');
  assert.equal(eventPlan(newGame(data), 'governor').flag, undefined, 'unsafe shutdown cannot skip puzzle');
});

test('shops conserve gil and pack counts; selling cannot strip equipped gear', () => {
  const state = newGame(data); const count = state.inventory.potion, gold = state.gold;
  assert.equal(trade(data, state, 'harrow_items', 'potion', 'buy').ok, true);
  assert.equal(state.gold, gold - data.items.potion.price); assert.equal(state.inventory.potion, count + 1);
  assert.equal(trade(data, state, 'harrow_items', 'potion', 'sell').ok, true);
  assert.equal(state.inventory.potion, count);
  const before = JSON.stringify(state);
  assert.equal(trade(data, state, 'harrow_items', 'roadblade', 'sell').ok, false);
  assert.equal(trade(data, state, 'harrow_items', 'crownblade', 'buy').ok, false);
  assert.equal(JSON.stringify(state), before);
  state.gold = 0;
  assert.equal(trade(data, state, 'harrow_items', 'potion', 'buy').ok, false);
  assert.equal(restAtInn(state, 60).ok, false);
});

test('equipment exchanges ownership, changes battle stats and survives leveling/saving without free healing', () => {
  const state = newGame(data), hero = state.roster[0]; state.inventory.reedblade = 1;
  hero.hp = 20; const before = hero.vig;
  assert.equal(equipItem(data, state, 'vesna', 'weapon', 'reedblade').ok, true);
  assert.equal(hero.hp, 20); assert.ok(hero.vig > before); assert.equal(state.inventory.roadblade, 1); assert.equal(state.inventory.reedblade, 0);
  assert.equal(equipItem(data, state, 'wick', 'weapon', 'roadblade').ok, false);
  assert.equal(equipItem(data, state, 'corvin', 'weapon', 'reedblade').ok, false);
  const battle = new BattleModel(data, state, ['fenrat']);
  assert.equal(battle.party[0].attack, hero.vig); assert.equal(battle.definition(battle.party[0], { kind: 'attack' }).element, 'fire');
  grantExp(state, 1400, data);
  const restored = normalizeState(data, JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.roster[0].equipment, hero.equipment);
  assert.equal(restored.roster[0].vig, equipmentStats(data, hero).vig); assert.equal(restored.roster[0].hp, hero.hp);
  restored.roster[0].hp = 0; restored.inventory.travelcoat = 1;
  equipItem(data, restored, 'vesna', 'body', 'travelcoat'); assert.equal(restored.roster[0].hp, 0);
});

test('field items heal, revive and clear ailments only when useful; inn acceptance spends exactly once', () => {
  const state = newGame(data), hero = state.roster[1]; const potion = state.inventory.potion;
  assert.equal(useFieldItem(data, state, 'potion', hero.id).ok, false); assert.equal(state.inventory.potion, potion);
  hero.hp = 0;
  assert.equal(useFieldItem(data, state, 'potion', hero.id).ok, false);
  assert.equal(useFieldItem(data, state, 'phoenixtear', hero.id).ok, true);
  assert.equal(hero.hp, Math.round(hero.maxHp / 2)); assert.equal(state.inventory.phoenixtear, 1);
  hero.statuses.poison = 3; assert.equal(useFieldItem(data, state, 'antidote', hero.id).ok, true); assert.deepEqual(hero.statuses, {});
  hero.mp = 0; assert.equal(useFieldItem(data, state, 'tonic', hero.id).ok, true); assert.ok(hero.mp > 0);
  const gold = state.gold; assert.equal(restAtInn(state, 60).ok, true); assert.equal(state.gold, gold - 60); assert.equal(hero.hp, hero.maxHp);
});

test('chapter bosses can be defeated with earned levels, starting gear and finite resources', () => {
  const state = newGame(data);
  for (const id of ['bogfather', 'ferranwarden', 'enginewarden', 'thefirstengine']) {
    for (const hero of state.roster) { hero.hp = hero.maxHp; hero.mp = hero.maxMp; hero.statuses = {}; }
    const battle = new BattleModel(data, state, [id], { seed: 49 });
    for (let tick = 0; tick < 50000 && !battle.ended; tick++) {
      const next = battle.update(.1);
      if (next?.kind !== 'command' && next) { battle.apply(next); battle.busy = false; }
      if (battle.awaiting) {
        const actor = battle.awaiting, dead = battle.party.find(h => h.hp <= 0), wounded = battle.party.filter(h => h.hp > 0 && h.hp < h.maxHp * .75);
        let choice;
        if (dead && actor.source.spells.includes('reprise') && actor.mp >= data.spells.reprise.mp) choice = { kind: 'spell', id: 'reprise', target: dead.uid };
        else if (dead && state.inventory.phoenixtear > 0) choice = { kind: 'item', id: 'phoenixtear', target: dead.uid };
        else if (actor.id === 'wick' && wounded.length) choice = { kind: 'ability', id: 'prayer' };
        else if (actor.id === 'vesna' && actor.mp >= 6) choice = { kind: 'spell', id: id === 'bogfather' ? 'ember' : 'spark', target: battle.enemies[0].uid };
        else if (actor.id === 'kestrel' && actor.mp >= 4) choice = { kind: 'ability', id: 'jump', target: battle.enemies[0].uid };
        else choice = { kind: 'attack', target: battle.enemies[0].uid };
        const action = battle.command(actor, choice); assert.ok(action, battle.lastError); battle.apply(action); battle.busy = false;
      }
    }
    assert.equal(battle.ended, 'victory', `${id} must be beatable without grinding or test stat boosts`);
    const reward = battle.rewards(); assert.ok(reward);
    if (id === 'bogfather') applyEvent(data, state, { recruit: 'kestrel' });
    if (id === 'ferranwarden') applyEvent(data, state, { recruit: 'aurelian' });
  }
});
