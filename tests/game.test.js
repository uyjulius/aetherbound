import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newGame } from '../src/core/state.js';
import { BattleModel } from '../src/battle/model.js';

async function table(name) {
  return JSON.parse(await readFile(new URL(`../content/data/${name}.json`, import.meta.url), 'utf8'));
}

test('every map is traversable data and every exit has a destination', async () => {
  const [maps, legend] = await Promise.all([table('maps'), table('legend')]);
  assert.equal(Object.keys(maps).length, 95);
  for (const [id, map] of Object.entries(maps)) {
    assert.ok(map.terrain.length > 0, `${id} has terrain`);
    assert.ok(map.terrain.some((row) => [...row].some((glyph) => legend.glyphs[glyph]?.walk)), `${id} has a walkable tile`);
    for (const exit of map.exits ?? []) assert.ok(maps[exit.to], `${id} exit points to ${exit.to}`);
  }
});

test('a battle action stays planned until the impact is applied', async () => {
  const [characters, enemies, items, spells] = await Promise.all([
    table('characters'), table('enemies'), table('items'), table('spells'),
  ]);
  const data = { characters, enemies, items, spells };
  const state = newGame(data);
  const battle = new BattleModel(data, state, ['fenrat']);
  const hero = battle.party[0];
  battle.awaiting = hero;
  const before = battle.enemies[0].hp;
  const action = battle.command(hero, { kind: 'attack' });
  assert.equal(battle.enemies[0].hp, before, 'planning and animation lead-in do not mutate HP');
  const results = battle.apply(action);
  assert.ok(results[0].amount > 0);
  assert.ok(battle.enemies[0].hp < before, 'impact mutates HP');
});

test('victory grants encounter rewards and keeps party state in sync', async () => {
  const [characters, enemies, items, spells] = await Promise.all([
    table('characters'), table('enemies'), table('items'), table('spells'),
  ]);
  const data = { characters, enemies, items, spells };
  const state = newGame(data);
  const battle = new BattleModel(data, state, ['fenrat']);
  const enemy = battle.enemies[0];
  enemy.hp = 1;
  battle.awaiting = battle.party[0];
  const action = battle.command(battle.party[0], { kind: 'attack' });
  battle.apply(action);
  assert.equal(battle.ended, 'victory');
  const gold = state.gold;
  const reward = battle.rewards();
  assert.equal(reward.exp, enemies.fenrat.exp);
  assert.equal(state.gold, gold + enemies.fenrat.gold);
});
