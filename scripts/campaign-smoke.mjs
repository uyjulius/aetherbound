import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const port = 4207;
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${port}/`;
const server = process.env.BASE_URL ? null : spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
const capturePrefix = process.env.BASE_URL ? 'live-campaign' : 'campaign';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser, page;
const errors = [];
async function snapshot() {
  return page.evaluate(() => {
    const app = window.__AETHERBOUND__, b = app.battle;
    return { mode: app.mode, map: app.state.mapId, stage: app.state.quest.stage, locked: app.world.locked,
      dialogue: !document.getElementById('dialogue').classList.contains('hidden'), choice: !document.getElementById('field-choice').classList.contains('hidden'),
      result: b.result, resultTime: b.resultTime, command: b.model?.awaiting && !b.pending && b.menu === 'root' ? {
        actor: b.model.awaiting.id, mp: b.model.awaiting.mp, boss: b.model.enemies.some(e => e.source.boss),
        enemy: b.model.enemies.find(e => e.hp > 0)?.id, dead: b.model.party.find(h => h.hp <= 0)?.name,
        wounded: b.model.party.filter(h => h.hp > 0 && h.hp < h.maxHp * .78).length,
        tears: app.state.inventory.phoenixtear ?? 0, spells: b.model.awaiting.source.spells,
      } : null };
  });
}
async function fight() {
  let actions = 0;
  for (let cycle = 0; cycle < 16000; cycle++) {
    const state = await snapshot();
    if (state.mode !== 'battle') return;
    if (state.result) {
      assert.equal(state.result, 'victory', `Campaign battle ended in ${state.result}`);
      if (state.resultTime < .9) { await pause(100); continue; }
      await page.getByRole('button', { name: 'Continue journey' }).click();
      console.log(`Won battle in ${actions} player actions`); return;
    }
    if (!state.command) { await pause(90); continue; }
    const c = state.command;
    let kind = 'Attack', spell = null, target = null;
    if (c.dead && c.spells.includes('reprise') && c.mp >= 18) { kind = 'Magic'; spell = 'Reprise'; target = c.dead; }
    else if (c.dead && c.tears) { kind = 'Items'; spell = 'Phoenix Tear'; target = c.dead; }
    else if (c.actor === 'wick' && c.wounded) kind = 'Prayer';
    else if (c.actor === 'vesna' && c.boss && c.mp >= 6) { kind = 'Magic'; spell = c.enemy === 'bogfather' ? 'Ember' : 'Spark'; }
    else if (c.actor === 'kestrel' && c.boss && c.mp >= 4) kind = 'Skyfall';
    const commandLabel = kind === 'Magic' ? c.actor === 'vesna' ? 'Aether arts' : 'White magic' : kind;
    await page.locator('#battle-commands').getByRole('button', { name: new RegExp(`^${commandLabel}( |$)`) }).click();
    if (spell) await page.locator('#battle-commands').getByRole('button', { name: new RegExp(`^${spell}( |$)`) }).click();
    if (kind !== 'Prayer') {
      await page.waitForFunction(() => window.__AETHERBOUND__.battle.menu === 'targets');
      if (target) await page.locator('#battle-commands').getByRole('button', { name: new RegExp(`^${target}( |$)`) }).click();
      else await page.locator('#battle-commands button').first().click();
    }
    actions++;
    assert.ok(actions < 250, 'Battle must finish in a reasonable number of actions');
    await pause(100);
  }
  throw new Error('Battle did not finish');
}
async function settle() {
  for (let i = 0; i < 500; i++) {
    const s = await snapshot();
    if (s.mode === 'battle') { await fight(); continue; }
    if (s.dialogue) { await page.keyboard.press('Enter'); await pause(80); continue; }
    if (s.choice) return;
    if (s.mode === 'field' && !s.locked) { await pause(80); const next = await snapshot(); if (!next.dialogue && !next.locked && next.mode === 'field') return; }
    await pause(80);
  }
  throw new Error('Field did not settle');
}
const held = new Set();
async function keys(next) {
  for (const key of held) if (!next.includes(key)) { await page.keyboard.up(key); held.delete(key); }
  for (const key of next) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
}
async function route(target) {
  await keys([]); await settle();
  const originMap = (await snapshot()).map;
  console.log(`Walking ${originMap} → ${target.id}`);
  for (let retry = 0; retry < 80; retry++) {
    // Read the same collision surface the player sees. All movement and activation
    // below use ordinary keyboard input; this runner never edits game state.
    const path = await page.evaluate(target => {
      const w = window.__AETHERBOUND__.world;
      const width = w.width * 2, height = w.height * 2;
      let targetPoint, definition;
      if (target.kind === 'exit') definition = w.map.exits.find(e => e.to === target.id);
      else {
        const entry = target.kind === 'npc' ? w.npcs.find(n => n.definition.id === target.id) : w.props.find(p => p.definition.id === target.id);
        if (!entry) throw new Error(`No interaction ${target.id} in ${w.mapId}`);
        definition = entry.definition; targetPoint = target.kind === 'npc' ? entry.actor.root.position : w.interactionPoint(entry);
      }
      const goal = (x, z) => target.kind === 'exit' ? x >= definition.at[0] + .25 && x < definition.at[0] + definition.size[0] - .25 && z >= definition.at[1] + .25 && z < definition.at[1] + definition.size[1] - .25
        : w.toWorld([x, z]).distanceTo(targetPoint) < 2.3;
      const tile = w.toTile(w.player.root.position), start = [Math.round(tile.x * 2), Math.round(tile.z * 2)];
      const queue = [start], previous = new Map([[start.join(','), null]]);
      let end;
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const [x, z] = queue[cursor];
        if (goal(x / 2, z / 2)) { end = [x, z]; break; }
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const a = x + dx, b = z + dz, key = `${a},${b}`;
          if (a < 0 || a >= width || b < 0 || b >= height || previous.has(key) || !w.canStand(w.toWorld([a / 2, b / 2]))) continue;
          // Do not wander through an unrelated map exit during a route.
          const exit = w.findExit(w.toWorld([a / 2, b / 2]));
          if (exit && !(target.kind === 'exit' && exit.to === target.id)) continue;
          previous.set(key, [x, z]); queue.push([a, b]);
        }
      }
      if (!end) throw new Error(`No path in ${w.mapId} to ${target.id}`);
      const path = [];
      for (let p = end; p; p = previous.get(p.join(','))) path.unshift([p[0] / 2, p[1] / 2]);
      return path.filter((point, index) => index === 0 || index === path.length - 1
        || Math.sign(point[0] - path[index - 1][0]) !== Math.sign(path[index + 1][0] - point[0])
        || Math.sign(point[1] - path[index - 1][1]) !== Math.sign(path[index + 1][1] - point[1]));
    }, target);
    let interrupted = false;
    for (const point of path) {
      for (let step = 0; step < 1200; step++) {
        const current = await page.evaluate(() => {
          const a = window.__AETHERBOUND__, t = a.world.toTile(a.world.player.root.position);
          return { x: t.x, z: t.z, map: a.state.mapId, mode: a.mode, locked: a.world.locked };
        });
        if (current.map !== originMap) { await keys([]); await settle(); return; }
        if (current.mode !== 'field' || current.locked) { interrupted = true; break; }
        const dx = point[0] - current.x, dz = point[1] - current.z;
        if (Math.hypot(dx, dz) < .14) break;
        const next = Math.hypot(dx, dz) > .8 ? ['Shift'] : [];
        if (Math.abs(dx) > .09) next.push(dx > 0 ? 'd' : 'a');
        if (Math.abs(dz) > .09) next.push(dz > 0 ? 's' : 'w');
        await keys(next); await pause(35);
        if (step === 1199) { await keys([]); throw new Error(`Movement stuck in ${originMap} near ${point} (${current.x},${current.z})`); }
      }
      if (interrupted) break;
    }
    await keys([]); await settle();
    if ((await snapshot()).map !== originMap) return;
    if (interrupted) continue;
    if (target.kind === 'exit') { await pause(100); if ((await snapshot()).map !== originMap) return; throw new Error(`Exit ${target.id} did not change map`); }
    const nearby = await page.evaluate(() => window.__AETHERBOUND__.world.nearby?.definition.id);
    assert.equal(nearby, target.id, `Expected ${target.id}, found ${nearby} after walking in ${originMap}`);
    await page.keyboard.press('Enter'); await pause(100); await settle(); return;
  }
  throw new Error(`Too many route interruptions: ${target.id}`);
}
const interact = id => route({ kind: 'prop', id });
const talk = id => route({ kind: 'npc', id });
const go = id => route({ kind: 'exit', id });
async function capture(name) { await page.screenshot({ path: `.renders/${capturePrefix}-${name}.png` }); }

try {
  if (server) for (let i = 0; i < 50; i++) { try { if ((await fetch(baseURL)).ok) break; } catch {} await pause(100); }
  await mkdir('.renders', { recursive: true });
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /New Journey/ }).click();
  await page.waitForFunction(() => window.__AETHERBOUND__?.mode === 'field'); await settle();
  await interact('aether-mark'); await talk('elder'); assert.equal((await snapshot()).stage, 1);
  await talk('halloran');
  const goldBefore = await page.evaluate(() => window.__AETHERBOUND__.state.gold);
  await page.getByRole('button', { name: /^Buy Road Cap/ }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.gold), goldBefore - 100);
  await page.keyboard.press('c');
  await page.locator('select[data-member="vesna"][data-slot="head"]').selectOption('roadcap');
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.roster[0].equipment.head), 'roadcap');
  await capture('equipment'); await page.keyboard.press('Escape');
  await interact('inn'); await talk('innkeeper'); await capture('inn');
  const innGold = await page.evaluate(() => window.__AETHERBOUND__.state.gold);
  await page.getByRole('button', { name: /^Rest ·/ }).click();
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.gold), innGold - 60);
  await go('harrowmere'); await go('silt_road'); await capture('road'); await go('fen_hall');
  await interact('survey-notes'); await interact('aether-mark'); await go('fen_cistern');
  await interact('sluice-reed'); await interact('fen-weapon'); await interact('sluice-stone'); await capture('cistern');
  await go('fen_heart'); await interact('aether-mark'); await interact('root-bell');
  assert.equal((await snapshot()).stage, 2); console.log('Chapter I boss and Kestrel recruitment complete');
  await go('fen_cistern'); await go('fen_hall'); await interact('aether-mark'); await go('silt_road'); await go('harrowmere'); await talk('elder');
  await go('silt_road'); await go('solmere'); await talk('aurelian'); await capture('solmere');
  assert.equal((await snapshot()).stage, 4);
  await go('foundry_entry'); await interact('aether-mark'); await interact('foundry-orders'); await interact('coolant');
  await go('foundry_furnace'); await interact('exhaust'); await interact('governor'); await capture('foundry');
  await go('foundry_heart'); await interact('aether-mark'); await interact('furnace-crown');
  assert.equal((await snapshot()).stage, 5); console.log('Chapter II boss and Aurelian recruitment complete');
  await go('foundry_furnace'); await go('foundry_entry'); await interact('aether-mark'); await go('solmere'); await interact('dock'); await capture('airship');
  await interact('aether-mark'); await interact('helm'); await go('observatory'); await interact('aether-mark');
  await interact('star-chart'); await interact('resonator'); await go('engine_bridge'); await interact('bridge-guardian');
  assert.equal((await snapshot()).stage, 7);
  await go('engine_heart'); await interact('aether-mark'); await capture('engine'); await interact('first-engine');
  await page.getByRole('heading', { name: 'The Warm Earth · Complete' }).waitFor(); await capture('ending');
  assert.equal((await snapshot()).stage, 8);
  await page.getByRole('button', { name: /Return to Harrowmere/ }).click(); await settle();
  assert.equal((await snapshot()).map, 'harrowmere');
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.roster.length), 5);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Continue/ }).click(); await settle();
  assert.equal((await snapshot()).stage, 8); assert.equal((await snapshot()).map, 'harrowmere');
  assert.deepEqual(errors, [], 'No browser errors throughout the journey');
  console.log('CAMPAIGN PASSED: New Journey → all three chapters → ending → reload/continue, using keyboard movement and UI commands only');
} catch (error) { if (page) { await keys([]); await capture('failure'); console.error('Failure state:', await snapshot()); } throw error; }
finally { await browser?.close(); server?.kill('SIGTERM'); }
