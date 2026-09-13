import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const port = 4197;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore','pipe','pipe'] });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForServer() {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) return; } catch {} await wait(100); }
  throw new Error('Smoke server did not start');
}
let browser;
try {
  await waitForServer(); await mkdir('.renders', { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${port}/?test`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /New Journey/ }).click();
  await page.waitForFunction(() => window.__AETHERBOUND__?.mode === 'field');
  console.log('Field loaded');
  await page.keyboard.press('Enter');
  await page.getByText('Party restored. Journey saved at the aether mark.').waitFor();
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.checkpoint.mapId), 'harrowmere');
  const pose = () => page.evaluate(() => {
    const actor = window.__AETHERBOUND__.world.player;
    const bones = []; actor.model.traverse(node => { if (node.isBone) bones.push(...node.quaternion.toArray()); });
    return { x: actor.root.position.x, z: actor.root.position.z, y: actor.root.position.y, bones, time: actor.mixer.time, clip: actor.current?.label };
  });
  const before = await pose();
  await page.keyboard.down('a');
  await page.waitForFunction(() => window.__AETHERBOUND__.world.player.current?.label === 'walk');
  await page.waitForFunction(t => window.__AETHERBOUND__.world.player.mixer.time > t + .4, before.time);
  const moving = await pose();
  await page.keyboard.up('a');
  assert.ok(moving.x < before.x, 'movement input moves the leader');
  assert.equal(moving.y, 0, 'actor root stays grounded');
  assert.ok(moving.bones.some((value, index) => Math.abs(value - before.bones[index]) > .001), 'walking changes the skeleton pose, not just an animation label');
  await page.screenshot({ path: '.renders/rewrite-field.png' });
  console.log('Interaction and skeletal movement verified');

  await page.keyboard.press('b');
  await page.waitForSelector('#command-panel:not(.hidden)');
  await page.getByRole('button', { name: /^Attack / }).click();
  await page.getByText('Attack · Choose a target', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.battle.model.busy), false, 'target selection does not spend a turn');
  await page.screenshot({ path: '.renders/rewrite-targeting.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Attack / }).waitFor();
  await page.getByRole('button', { name: /^Attack / }).click();
  const hpBefore = await page.evaluate(() => window.__AETHERBOUND__.battle.model.enemies.map(enemy => enemy.hp));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !!window.__AETHERBOUND__.battle.timeline);
  const leadIn = await page.evaluate(() => ({ elapsed: window.__AETHERBOUND__.battle.timeline.elapsed,
    hp: window.__AETHERBOUND__.battle.model.enemies.map(enemy => enemy.hp) }));
  assert.ok(leadIn.elapsed < .65); assert.deepEqual(leadIn.hp, hpBefore, 'HP preserved before visible impact');
  await page.waitForFunction(() => window.__AETHERBOUND__.battle.timeline?.impacted);
  const after = await page.evaluate(() => window.__AETHERBOUND__.battle.model.enemies.map(enemy => enemy.hp));
  assert.equal(after[0], hpBefore[0], 'unselected enemy is unharmed'); assert.ok(after[1] < hpBefore[1]);
  await page.screenshot({ path: '.renders/rewrite-impact.png' });
  console.log('Explicit target and animated impact verified');

  // Complete a battle through ordinary command and target buttons, including the result hold.
  for (let turn = 0; turn < 25; turn++) {
    await page.waitForFunction(() => window.__AETHERBOUND__.battle.result || (window.__AETHERBOUND__.battle.model.awaiting && !window.__AETHERBOUND__.battle.pending));
    if (await page.evaluate(() => !!window.__AETHERBOUND__.battle.result)) break;
    await page.getByRole('button', { name: /^Attack / }).click();
    await page.locator('#battle-commands button').first().click();
  }
  await page.getByRole('dialog', { name: 'Battle result' }).waitFor();
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.battle.result), 'victory');
  await page.waitForFunction(() => window.__AETHERBOUND__.battle.resultTime > 1);
  await page.screenshot({ path: '.renders/rewrite-victory.png' });
  const gold = await page.evaluate(() => window.__AETHERBOUND__.state.gold);
  await page.getByRole('button', { name: 'Continue journey' }).click();
  await page.waitForFunction(() => window.__AETHERBOUND__.mode === 'field');
  assert.equal(await page.evaluate(() => window.__AETHERBOUND__.state.gold), gold);
  console.log('Victory hold, rewards and field return verified');

  // Seed a wounded party before entering the next encounter, then exercise revival using the real UI.
  await page.evaluate(() => { window.__AETHERBOUND__.state.roster[1].hp = 0; });
  await page.keyboard.press('b');
  await page.waitForSelector('#command-panel:not(.hidden)');
  await page.locator('#battle-party [data-hero="corvin"]').getByText(/Fallen/).waitFor();
  await page.getByRole('button', { name: /^Items / }).click();
  await page.getByRole('button', { name: /^Phoenix Tear / }).click();
  await page.getByRole('button', { name: /^Corvin Fallen/ }).click();
  await page.waitForFunction(() => window.__AETHERBOUND__.battle.model.party.find(hero => hero.id === 'corvin').hp > 0);
  const revived = await page.evaluate(() => ({ hp: window.__AETHERBOUND__.state.roster[1].hp, count: window.__AETHERBOUND__.state.inventory.phoenixtear }));
  assert.ok(revived.hp > 0); assert.equal(revived.count, 1);
  console.log('Revival through the item and target menus verified');
  await page.close();
  const recovery = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  recovery.on('pageerror', error => errors.push(error.message));
  await recovery.goto(`http://127.0.0.1:${port}/?test`, { waitUntil: 'networkidle' });
  await recovery.getByRole('button', { name: /New Journey/ }).click();
  await recovery.waitForFunction(() => window.__AETHERBOUND__?.mode === 'field');
  await recovery.keyboard.press('Enter');
  await recovery.getByText('Party restored. Journey saved at the aether mark.').waitFor();
  await recovery.evaluate(async () => {
    const app = window.__AETHERBOUND__;
    app.state.roster.forEach(hero => { hero.hp = 1; });
    await app.startBattle(['bogfather']);
    app.battle.model.enemies[0].atb = 100;
    app.battle.model.enemies[0].turns = 2;
  });
  await recovery.waitForFunction(() => window.__AETHERBOUND__.battle.timeline?.impacted);
  const fall = await recovery.evaluate(() => ({
    hp: window.__AETHERBOUND__.state.roster.map(hero => hero.hp),
    poses: window.__AETHERBOUND__.battle.model.party.map(hero => window.__AETHERBOUND__.battle.actors.get(hero.uid).current.label),
  }));
  assert.deepEqual(fall.hp, [0, 0, 0]); assert.deepEqual(fall.poses, ['dead','dead','dead']);
  await recovery.getByRole('button', { name: 'Return to checkpoint' }).waitFor();
  await recovery.waitForFunction(() => window.__AETHERBOUND__.battle.resultTime > 1);
  await recovery.screenshot({ path: '.renders/rewrite-defeat.png' });
  await recovery.keyboard.press('Enter');
  await recovery.waitForFunction(() => window.__AETHERBOUND__.mode === 'field');
  const restored = await recovery.evaluate(() => ({ hp: window.__AETHERBOUND__.state.roster.map(hero => [hero.hp, hero.maxHp]),
    map: window.__AETHERBOUND__.state.mapId, position: window.__AETHERBOUND__.state.position, checkpoint: window.__AETHERBOUND__.state.checkpoint.position }));
  assert.equal(restored.map, 'harrowmere'); assert.deepEqual(restored.position, restored.checkpoint);
  assert.ok(restored.hp.every(([hp, max]) => hp === max));
  console.log('Lethal boss impact, held death poses and checkpoint recovery verified');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('Smoke passed: field interaction, skeletal walk, explicit target, delayed impact, victory, revival, defeat and checkpoint recovery');
} finally { await browser?.close(); server.kill('SIGTERM'); }
